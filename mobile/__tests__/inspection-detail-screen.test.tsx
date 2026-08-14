import { fireEvent, screen, waitFor } from '@testing-library/react-native';

jest.mock('expo-router', () => require('@/test-utils/expo-router-mock'));

import InspectionDetailScreen from '../app/(protected)/inspections/[inspectionId]/index';
import {
  resetRouterMock,
  routerMock,
  setSearchParams,
} from '@/test-utils/expo-router-mock';
import { buildTestAuthService, renderWithSession, seedStoredSession } from '@/test-utils/render';
import { getMockDatabase, resetMockDatabase } from '@/services';
import type { InspectionStatus } from '@/models';

const TECHNICIAN_ID = '8a50e30d-2a58-4a24-944e-10a9948abf01';

beforeEach(() => {
  resetRouterMock();
  resetMockDatabase();
});

async function signedIn(accessToken = 'mock-access.teste') {
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
  const found = getMockDatabase().inspections.find(
    (inspection) => inspection.status === status,
  );
  if (!found) throw new Error(`Sem inspeção fictícia no estado ${status}`);
  return found.id;
}

async function renderDetail(inspectionId: string) {
  await signedIn();
  setSearchParams({ inspectionId });

  const result = await renderWithSession(<InspectionDetailScreen />, {
    service: buildTestAuthService(),
  });
  await waitFor(() => expect(screen.getByTestId('detalhe-screen')).toBeOnTheScreen());
  return result;
}

describe('FE-M06 — Detalhes da inspeção', () => {
  it('exibe estado, prioridade e cliente/local resolvidos', async () => {
    await renderDetail(inspectionWith('IN_PROGRESS'));

    expect(screen.getByTestId('detalhe-screen')).toHaveTextContent(/Em andamento/);
    await waitFor(() =>
      expect(screen.getByTestId('detalhe-local')).toHaveTextContent(/Metalúrgica Horizonte/),
    );
    expect(screen.getByTestId('detalhe-local')).toHaveTextContent(/Unidade Norte/);
  });

  it('calcula o progresso cruzando itens e respostas (RN-040)', async () => {
    const id = inspectionWith('IN_PROGRESS');
    const database = getMockDatabase();
    const total = database.items[id]?.length ?? 0;
    const respondidos = database.responses[id]?.length ?? 0;

    await renderDetail(id);

    expect(screen.getByTestId('detalhe-progress-label')).toHaveTextContent(
      `${respondidos} de ${total} respondidos`,
    );
  });

  it('ASSIGNED oferece iniciar e navega para a confirmação', async () => {
    const id = inspectionWith('ASSIGNED');
    await renderDetail(id);

    expect(screen.getByTestId('detalhe-acao')).toHaveTextContent(/Iniciar/);

    await fireEvent.press(screen.getByTestId('detalhe-acao'));

    expect(routerMock.push).toHaveBeenCalledWith({
      pathname: '/inspections/[inspectionId]/start',
      params: { inspectionId: id },
    });
  });

  it('IN_PROGRESS oferece continuar e abre o checklist', async () => {
    const id = inspectionWith('IN_PROGRESS');
    await renderDetail(id);

    expect(screen.getByTestId('detalhe-acao')).toHaveTextContent(/Continuar/);

    await fireEvent.press(screen.getByTestId('detalhe-acao'));

    expect(routerMock.push).toHaveBeenCalledWith({
      pathname: '/inspections/[inspectionId]/checklist',
      params: { inspectionId: id },
    });
  });

  it('REJECTED oferece corrigir e mostra o motivo da recusa', async () => {
    const id = inspectionWith('REJECTED');
    await renderDetail(id);

    expect(screen.getByTestId('detalhe-acao')).toHaveTextContent(/Corrigir/);
    expect(screen.getByTestId('detalhe-reprovacao')).toHaveTextContent(/Foto do item OPE-01/);
  });

  it('estados finais ficam em somente leitura', async () => {
    await renderDetail(inspectionWith('APPROVED'));

    expect(screen.queryByTestId('detalhe-acao')).toBeNull();
    expect(screen.getByTestId('detalhe-somente-leitura')).toHaveTextContent(/modo de consulta/);
  });

  it('lista as não conformidades da inspeção', async () => {
    const id = inspectionWith('IN_PROGRESS');
    await renderDetail(id);

    expect(screen.getByTestId('detalhe-nc')).toHaveTextContent(/Obstrução na área/);
  });

  it('mostra erro com nova tentativa quando a inspeção não existe', async () => {
    await signedIn();
    setSearchParams({ inspectionId: 'inexistente' });

    await renderWithSession(<InspectionDetailScreen />, { service: buildTestAuthService() });

    await waitFor(() => expect(screen.getByTestId('detalhe-error')).toBeOnTheScreen());
    expect(screen.getByTestId('detalhe-error-retry')).toBeOnTheScreen();
  });
});
