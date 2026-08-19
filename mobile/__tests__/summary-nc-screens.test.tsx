import { USER_IDS } from '@fieldops/shared';
import { fireEvent, screen, waitFor } from '@testing-library/react-native';

jest.mock('expo-router', () => require('@/test-utils/expo-router-mock'));

import SummaryScreen from '../app/(protected)/inspections/[inspectionId]/summary';
import NonConformitiesScreen from '../app/(protected)/inspections/[inspectionId]/non-conformities';
import { resetRouterMock, routerMock, setSearchParams } from '@/test-utils/expo-router-mock';
import { buildTestAuthService, renderWithSession, seedStoredSession } from '@/test-utils/render';
import { configureApi, getMockDatabase, resetApiConfig, resetMockDatabase } from '@/services';
import type { InspectionItemSnapshot, InspectionStatus } from '@/models';

const TECHNICIAN_ID = USER_IDS.technician;

beforeEach(() => {
  resetRouterMock();
  resetMockDatabase();
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

function itemsOf(id: string): InspectionItemSnapshot[] {
  return getMockDatabase().items[id] ?? [];
}

/** Responde tudo que é obrigatório, sem deixar nenhuma regra pendente. */
function answerEverything(inspectionId: string): void {
  const database = getMockDatabase();
  const now = '2026-08-14T12:00:00Z';

  database.responses[inspectionId] = itemsOf(inspectionId).map((item, index) => ({
    id: `resp-${index}`,
    inspectionId,
    inspectionItemId: item.id,
    valueText: item.responseType === 'TEXT_SHORT' || item.responseType === 'TEXT_LONG' ? 'ok' : null,
    valueNumber: item.responseType === 'NUMBER' ? 10 : null,
    valueBoolean: item.responseType === 'BOOLEAN' ? true : null,
    valueDate: item.responseType === 'DATE' ? '2026-08-01' : null,
    valueJson: null,
    observation: null,
    // Conforme não dispara as regras de observação e evidência.
    conformity: item.responseType === 'CONFORMITY' ? 'CONFORMING' : 'NOT_APPLICABLE',
    answeredBy: TECHNICIAN_ID,
    answeredAtDevice: now,
    serverReceivedAt: now,
    createdAt: now,
    updatedAt: now,
    version: 1,
  }));

  // Escolha única guarda o valor em `valueText`.
  for (const item of itemsOf(inspectionId)) {
    if (item.responseType !== 'SINGLE_CHOICE') continue;
    const response = database.responses[inspectionId]?.find(
      (entry) => entry.inspectionItemId === item.id,
    );
    if (response) response.valueText = 'BOM';
  }
}

async function renderSummary(inspectionId: string) {
  await signedIn();
  setSearchParams({ inspectionId });
  const result = await renderWithSession(<SummaryScreen />, { service: buildTestAuthService() });
  await waitFor(() => expect(screen.queryByTestId('resumo-loading')).toBeNull());
  return result;
}

async function renderNonConformities(inspectionId: string, params: Record<string, string> = {}) {
  await signedIn();
  setSearchParams({ inspectionId, ...params });
  const result = await renderWithSession(<NonConformitiesScreen />, {
    service: buildTestAuthService(),
  });
  await waitFor(() => expect(screen.getByTestId('nc-screen')).toBeOnTheScreen());
  return result;
}

describe('FE-M09 — Resumo e conclusão', () => {
  it('mostra os números da inspeção', async () => {
    const id = inspectionWith('IN_PROGRESS');
    await renderSummary(id);

    expect(screen.getByTestId('resumo-ncs')).toHaveTextContent('1');
    expect(screen.getByTestId('resumo-obrigatorios')).toBeOnTheScreen();
    expect(screen.getByTestId('resumo-progress-label')).toHaveTextContent(/respondidos/);
  });

  it('bloqueia a conclusão e lista as pendências', async () => {
    const id = inspectionWith('IN_PROGRESS');
    await renderSummary(id);

    expect(screen.getByTestId('resumo-concluir')).toBeDisabled();
    expect(screen.getByTestId('resumo-pendencias')).toHaveTextContent(/impedem a conclusão/);
    expect(screen.queryByTestId('resumo-pronto')).toBeNull();
  });

  it('cada pendência abre o item no checklist', async () => {
    const id = inspectionWith('IN_PROGRESS');
    // O conjunto fictício responde só os primeiros itens: a pendência é o
    // primeiro item obrigatório que ficou sem resposta. Derivar em vez de fixar
    // o tipo mantém o teste válido se o conjunto mudar de novo.
    const respondidos = new Set(
      (getMockDatabase().responses[id] ?? []).map((resposta) => resposta.inspectionItemId),
    );
    const pendente = itemsOf(id).find((item) => item.required && !respondidos.has(item.id));
    await renderSummary(id);

    await fireEvent.press(screen.getByTestId(`resumo-pendencia-${pendente?.itemCode}`));

    expect(routerMock.push).toHaveBeenCalledWith({
      pathname: '/inspections/[inspectionId]/checklist',
      params: { inspectionId: id, focus: pendente?.id },
    });
  });

  it('libera a conclusão quando nada mais trava', async () => {
    const id = inspectionWith('IN_PROGRESS');
    answerEverything(id);
    await renderSummary(id);

    expect(screen.getByTestId('resumo-pronto')).toBeOnTheScreen();
    expect(screen.getByTestId('resumo-concluir')).not.toBeDisabled();
  });

  it('conclui, envia a inspeção e volta ao detalhe', async () => {
    const id = inspectionWith('IN_PROGRESS');
    answerEverything(id);
    await renderSummary(id);

    await fireEvent.press(screen.getByTestId('resumo-concluir'));

    await waitFor(() =>
      expect(routerMock.replace).toHaveBeenCalledWith({
        pathname: '/inspections/[inspectionId]',
        params: { inspectionId: id },
      }),
    );

    const inspecao = getMockDatabase().inspections.find((entry) => entry.id === id);
    expect(inspecao?.status).toBe('SUBMITTED');
    expect(inspecao?.completedAtDevice).toEqual(expect.any(String));
  });

  it('recusa concluir fora do estado de execução', async () => {
    await renderSummary(inspectionWith('APPROVED'));

    expect(screen.getByTestId('resumo-estado-invalido')).toBeOnTheScreen();
    expect(screen.queryByTestId('resumo-concluir')).toBeNull();
  });
});

describe('FE-M10 — Não conformidades', () => {
  it('lista as não conformidades da inspeção', async () => {
    const id = inspectionWith('IN_PROGRESS');
    await renderNonConformities(id);

    const nc = getMockDatabase().nonConformities[0];
    expect(screen.getByTestId(`nc-item-${nc?.id}`)).toHaveTextContent(/Trinca na proteção lateral/);
    expect(screen.getByTestId(`nc-item-${nc?.id}`)).toHaveTextContent(/Aberta/);
  });

  it('exige título e descrição antes de enviar', async () => {
    const id = inspectionWith('IN_PROGRESS');
    await renderNonConformities(id);

    await fireEvent.press(screen.getByTestId('nc-nova'));
    await fireEvent.press(screen.getByTestId('nc-salvar'));

    expect(screen.getByTestId('nc-titulo-error')).toHaveTextContent(/Informe um título/);
    expect(screen.getByTestId('nc-descricao-error')).toHaveTextContent(/Descreva o que foi/);
  });

  it('cobra a descrição com mais ênfase em severidade crítica', async () => {
    const id = inspectionWith('IN_PROGRESS');
    await renderNonConformities(id);

    await fireEvent.press(screen.getByTestId('nc-nova'));
    await fireEvent.changeText(screen.getByTestId('nc-titulo'), 'Vazamento');
    await fireEvent.press(screen.getByTestId('nc-severidade-CRITICAL'));
    await fireEvent.press(screen.getByTestId('nc-salvar'));

    expect(screen.getByTestId('nc-descricao-error')).toHaveTextContent(/risco/);
  });

  it('registra a não conformidade vinculada ao item do checklist', async () => {
    const id = inspectionWith('IN_PROGRESS');
    const item = itemsOf(id)[0];
    await renderNonConformities(id, { inspectionItemId: item?.id ?? '' });

    await fireEvent.press(screen.getByTestId('nc-nova'));
    await fireEvent.changeText(screen.getByTestId('nc-titulo'), 'Vazamento no flange');
    await fireEvent.changeText(screen.getByTestId('nc-descricao'), 'Óleo escorrendo pela base.');
    await fireEvent.press(screen.getByTestId('nc-salvar'));

    await waitFor(() => expect(screen.queryByTestId('nc-formulario')).toBeNull());

    const criada = getMockDatabase().nonConformities.find(
      (nc) => nc.title === 'Vazamento no flange',
    );
    expect(criada?.inspectionItemId).toBe(item?.id);
    expect(screen.getByTestId(`nc-item-${criada?.id}`)).toBeOnTheScreen();
  });

  it('edita uma não conformidade existente (PEND-06)', async () => {
    const id = inspectionWith('IN_PROGRESS');
    const nc = getMockDatabase().nonConformities[0];
    await renderNonConformities(id);

    await fireEvent.press(screen.getByTestId(`nc-editar-${nc?.id}`));
    await fireEvent.changeText(screen.getByTestId('nc-titulo'), 'Obstrução corrigida parcialmente');
    await fireEvent.press(screen.getByTestId('nc-salvar'));

    await waitFor(() => expect(screen.queryByTestId('nc-formulario')).toBeNull());

    expect(getMockDatabase().nonConformities[0]?.title).toBe('Obstrução corrigida parcialmente');
  });

  it('leva à captura de evidência com a NC vinculada', async () => {
    const id = inspectionWith('IN_PROGRESS');
    const nc = getMockDatabase().nonConformities[0];
    await renderNonConformities(id);

    await fireEvent.press(screen.getByTestId(`nc-evidencia-${nc?.id}`));

    expect(routerMock.push).toHaveBeenCalledWith({
      pathname: '/evidence/capture',
      params: { inspectionId: id, origin: 'non-conformities', nonConformityId: nc?.id },
    });
  });

  it('fora da execução não oferece registro nem edição', async () => {
    const id = inspectionWith('APPROVED');
    await renderNonConformities(id);

    expect(screen.getByTestId('nc-somente-leitura')).toBeOnTheScreen();
    expect(screen.queryByTestId('nc-nova')).toBeNull();
  });
});
