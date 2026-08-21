import { USER_IDS } from '@fieldops/shared';
import { fireEvent, screen, waitFor } from '@testing-library/react-native';

jest.mock('expo-router', () => require('@/test-utils/expo-router-mock'));

import ChecklistScreen from '../app/(protected)/inspections/[inspectionId]/checklist';
import { resetRouterMock, routerMock, setSearchParams } from '@/test-utils/expo-router-mock';
import { buildTestAuthService, renderWithSession, seedStoredSession } from '@/test-utils/render';
import { configureApi, getMockDatabase, resetApiConfig, resetMockDatabase } from '@/services';
import type { InspectionItemSnapshot, InspectionStatus } from '@/models';

const TECHNICIAN_ID = USER_IDS.technician;

beforeEach(() => {
  resetRouterMock();
  resetMockDatabase();
  // O checklist grava pelo `apiClient` compartilhado; sem latência simulada.
  configureApi({ mockEnabled: true, mockLatencyMs: 0 });
});

afterEach(() => {
  resetApiConfig();
});

async function signedIn() {
  const accessToken = 'mock-access.teste';
  getMockDatabase().accessTokens.set(accessToken, TECHNICIAN_ID);

  await seedStoredSession({
    accessToken,
    refreshToken: 'mock-refresh.teste',
    expiresAt: Date.now() + 15 * 60 * 1000,
    user: {
      id: TECHNICIAN_ID,
      name: 'Carlos Souza',
      email: 'tecnico@fieldops.local',
      role: 'TECHNICIAN',
    },
  });
}

function inspectionWith(status: InspectionStatus): string {
  const found = getMockDatabase().inspections.find((inspection) => inspection.status === status);
  if (!found) throw new Error(`Sem inspeção fictícia no estado ${status}`);
  return found.id;
}

function itemsOf(inspectionId: string): InspectionItemSnapshot[] {
  return getMockDatabase().items[inspectionId] ?? [];
}

function itemOfType(
  inspectionId: string,
  responseType: InspectionItemSnapshot['responseType'],
): InspectionItemSnapshot {
  const found = itemsOf(inspectionId).find((item) => item.responseType === responseType);
  if (!found) throw new Error(`Sem item ${responseType} no checklist fictício`);
  return found;
}

/** Zera as respostas semeadas para o teste controlar o estado inicial. */
function clearResponses(inspectionId: string): void {
  getMockDatabase().responses[inspectionId] = [];
}

function testIdOf(item: InspectionItemSnapshot): string {
  return `item-${item.itemCode ?? item.itemOrder}`;
}

async function renderChecklist(inspectionId: string, params: Record<string, string> = {}) {
  await signedIn();
  setSearchParams({ inspectionId, ...params });

  const result = await renderWithSession(<ChecklistScreen />, { service: buildTestAuthService() });
  await waitFor(() => expect(screen.getByTestId('checklist-screen')).toBeOnTheScreen());
  return result;
}

describe('FE-M08 — Checklist', () => {
  it('agrupa os itens em seções na ordem do modelo', async () => {
    const id = inspectionWith('IN_PROGRESS');
    await renderChecklist(id);

    expect(screen.getByTestId('secao-1')).toHaveTextContent(/Verificação Visual/);
    expect(screen.getByTestId('secao-2')).toHaveTextContent(/Medições/);
  });

  it('mostra o progresso vindo das respostas já gravadas', async () => {
    const id = inspectionWith('IN_PROGRESS');
    const respondidos = getMockDatabase().responses[id]?.length ?? 0;
    const total = itemsOf(id).length;

    await renderChecklist(id);

    expect(screen.getByTestId('checklist-progress-label')).toHaveTextContent(
      `${respondidos} de ${total} respondidos`,
    );
  });

  it('grava a resposta e confirma na interface', async () => {
    const id = inspectionWith('IN_PROGRESS');
    const item = itemOfType(id, 'BOOLEAN');
    await renderChecklist(id);

    await fireEvent(screen.getByTestId(`${testIdOf(item)}-item-control`), 'valueChange', true);

    await waitFor(() =>
      expect(screen.getByTestId(`${testIdOf(item)}-save`)).toHaveTextContent(/Salvo/),
    );

    const gravada = getMockDatabase().responses[id]?.find(
      (response) => response.inspectionItemId === item.id,
    );
    expect(gravada?.valueBoolean).toBe(true);
  });

  it('recalcula o progresso após gravar', async () => {
    const id = inspectionWith('IN_PROGRESS');
    const total = itemsOf(id).length;
    const item = itemOfType(id, 'BOOLEAN');
    clearResponses(id);

    await renderChecklist(id);
    await fireEvent(screen.getByTestId(`${testIdOf(item)}-item-control`), 'valueChange', true);

    await waitFor(() =>
      expect(screen.getByTestId('checklist-progress-label')).toHaveTextContent(
        `1 de ${total} respondidos`,
      ),
    );
  });

  it('não envia item não conforme sem a observação exigida (RN-038)', async () => {
    const id = inspectionWith('IN_PROGRESS');
    const item = itemOfType(id, 'CONFORMITY');
    // O mock semeia este item já não conforme e com observação; zerar para
    // exercitar a regra a partir do branco.
    clearResponses(id);
    await renderChecklist(id);

    await fireEvent.press(
      screen.getByTestId(`${testIdOf(item)}-item-control-NON_CONFORMING`),
    );

    await waitFor(() =>
      expect(screen.getByTestId(`${testIdOf(item)}-save`)).toHaveTextContent(/Descreva a observação/),
    );
  });

  it('grava o item não conforme depois da observação', async () => {
    const id = inspectionWith('IN_PROGRESS');
    const item = itemOfType(id, 'CONFORMITY');
    clearResponses(id);
    await renderChecklist(id);

    await fireEvent.press(screen.getByTestId(`${testIdOf(item)}-item-control-NON_CONFORMING`));
    await fireEvent.changeText(
      screen.getByTestId(`${testIdOf(item)}-item-observation`),
      'Paletes na frente do painel.',
    );

    await waitFor(() =>
      expect(screen.getByTestId(`${testIdOf(item)}-save`)).toHaveTextContent(/Salvo/),
    );
  });

  it('oferece registrar NC apenas quando o item é não conforme', async () => {
    const id = inspectionWith('IN_PROGRESS');
    const item = itemOfType(id, 'CONFORMITY');
    clearResponses(id);
    await renderChecklist(id);

    expect(screen.queryByTestId(`${testIdOf(item)}-nc`)).toBeNull();

    await fireEvent.press(screen.getByTestId(`${testIdOf(item)}-item-control-NON_CONFORMING`));

    expect(screen.getByTestId(`${testIdOf(item)}-nc`)).toBeOnTheScreen();
  });

  it('navega para a captura de evidência com o item vinculado', async () => {
    const id = inspectionWith('IN_PROGRESS');
    const item = itemOfType(id, 'BOOLEAN');
    await renderChecklist(id);

    await fireEvent.press(screen.getByTestId(`${testIdOf(item)}-evidencia`));

    expect(routerMock.push).toHaveBeenCalledWith(
      expect.objectContaining({
        pathname: '/evidence/capture',
        params: expect.objectContaining({ inspectionItemId: item.id, origin: 'checklist' }),
      }),
    );
  });

  it('navega para o resumo', async () => {
    const id = inspectionWith('IN_PROGRESS');
    await renderChecklist(id);

    await fireEvent.press(screen.getByTestId('checklist-resumo'));

    await waitFor(() =>
      expect(routerMock.push).toHaveBeenCalledWith({
        pathname: '/inspections/[inspectionId]/summary',
        params: { inspectionId: id },
      }),
    );
  });

  it('destaca os itens apontados para correção', async () => {
    const id = inspectionWith('IN_PROGRESS');
    const item = itemsOf(id)[0];
    await renderChecklist(id, { highlight: item?.id ?? '' });

    expect(screen.getByTestId('checklist-aviso-correcao')).toHaveTextContent(/1 item/);
    expect(screen.getByTestId(`${testIdOf(item!)}-corrigir`)).toBeOnTheScreen();
  });

  it('bloqueia a edição fora dos estados de execução', async () => {
    const id = inspectionWith('APPROVED');
    await renderChecklist(id);

    expect(screen.getByTestId('checklist-somente-leitura')).toBeOnTheScreen();
    expect(screen.queryByTestId('checklist-resumo')).toBeNull();
    expect(screen.queryByTestId('checklist-ir-pendencias')).toBeNull();
  });

  it('conta as pendências obrigatórias', async () => {
    const id = inspectionWith('IN_PROGRESS');
    await renderChecklist(id);

    expect(screen.getByTestId('checklist-pendencias')).toHaveTextContent(/obrigatório/);
    expect(screen.getByTestId('checklist-ir-pendencias')).not.toBeDisabled();
  });

  it('mostra erro do servidor no item, sem perder o valor digitado', async () => {
    const id = inspectionWith('IN_PROGRESS');
    const item = itemOfType(id, 'TEXT_SHORT');
    await renderChecklist(id);

    // Some com a inspeção no backend fictício: o PUT passa a responder 404.
    getMockDatabase().inspections.length = 0;

    await fireEvent.changeText(
      screen.getByTestId(`${testIdOf(item)}-item-control`),
      'LC-99231',
    );

    await waitFor(() =>
      expect(screen.getByTestId(`${testIdOf(item)}-save`)).toHaveTextContent(/não encontrada/i),
    );
    expect(screen.getByTestId(`${testIdOf(item)}-item-control`).props.value).toBe('LC-99231');
  });
});
