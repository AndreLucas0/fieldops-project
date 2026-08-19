import { USER_IDS } from '@fieldops/shared';
import { fireEvent, screen, waitFor } from '@testing-library/react-native';

jest.mock('expo-router', () => require('@/test-utils/expo-router-mock'));

import InspectionsScreen from '../app/(protected)/(tabs)/inspections';
import { resetRouterMock, routerMock } from '@/test-utils/expo-router-mock';
import { buildTestAuthService, renderWithSession, seedStoredSession } from '@/test-utils/render';
import { getMockDatabase, resetMockDatabase } from '@/services';

const TECHNICIAN_ID = USER_IDS.technician;

beforeEach(() => {
  resetRouterMock();
  resetMockDatabase();
});

/** Sessão com um token que o backend fictício reconhece. */
async function signedInSession(accessToken = 'mock-access.teste') {
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

async function renderList() {
  await signedInSession();
  const result = await renderWithSession(<InspectionsScreen />, {
    service: buildTestAuthService(),
  });
  await waitFor(() => expect(screen.getByTestId('inspections-screen')).toBeOnTheScreen());
  return result;
}

function visibleCount(): string {
  return screen.getByTestId('inspections-count').props.children.join('');
}

describe('FE-M03 — Lista de inspeções', () => {
  it('lista as inspeções do técnico', async () => {
    await renderList();

    const total = getMockDatabase().inspections.length;
    expect(visibleCount()).toBe(`${total} de ${total}`);
  });

  it('mostra cliente e local resolvidos pelos identificadores', async () => {
    await renderList();

    const primeira = getMockDatabase().inspections[0];
    await waitFor(() =>
      expect(screen.getByTestId(`inspections-card-${primeira?.id}`)).toHaveTextContent(
        /Indústria Alfa/,
      ),
    );
  });

  it('filtra por estado sem nova busca', async () => {
    await renderList();

    await fireEvent.press(screen.getByTestId('filtro-estado-IN_PROGRESS'));

    const emAndamento = getMockDatabase().inspections.filter(
      (inspection) => inspection.status === 'IN_PROGRESS',
    );
    const total = getMockDatabase().inspections.length;

    expect(visibleCount()).toBe(`${emAndamento.length} de ${total}`);
  });

  it('combina estados como alternativas', async () => {
    await renderList();

    await fireEvent.press(screen.getByTestId('filtro-estado-IN_PROGRESS'));
    await fireEvent.press(screen.getByTestId('filtro-estado-APPROVED'));

    const esperado = getMockDatabase().inspections.filter((inspection) =>
      ['IN_PROGRESS', 'APPROVED'].includes(inspection.status),
    );

    expect(visibleCount()).toBe(
      `${esperado.length} de ${getMockDatabase().inspections.length}`,
    );
  });

  it('desmarca o chip ao tocar de novo', async () => {
    await renderList();
    const total = getMockDatabase().inspections.length;

    await fireEvent.press(screen.getByTestId('filtro-estado-IN_PROGRESS'));
    await fireEvent.press(screen.getByTestId('filtro-estado-IN_PROGRESS'));

    expect(visibleCount()).toBe(`${total} de ${total}`);
  });

  it('período é exclusivo: escolher outro substitui o anterior', async () => {
    await renderList();

    await fireEvent.press(screen.getByTestId('filtro-periodo-today'));
    await fireEvent.press(screen.getByTestId('filtro-periodo-overdue'));

    // Só um período fica ativo, então o botão conta um único filtro.
    expect(screen.getByTestId('inspections-clear-filters')).toHaveTextContent(
      /Limpar filtros \(1\)/,
    );
  });

  it('limpa todos os filtros', async () => {
    await renderList();
    const total = getMockDatabase().inspections.length;

    await fireEvent.press(screen.getByTestId('filtro-estado-APPROVED'));
    await fireEvent.press(screen.getByTestId('filtro-prioridade-LOW'));
    expect(screen.getByTestId('inspections-clear-filters')).toHaveTextContent(
      /Limpar filtros \(2\)/,
    );

    await fireEvent.press(screen.getByTestId('inspections-clear-filters'));

    expect(visibleCount()).toBe(`${total} de ${total}`);
    expect(screen.queryByTestId('inspections-clear-filters')).toBeNull();
  });

  it('estado vazio por filtro oferece limpar, não recarregar', async () => {
    await renderList();

    // Combinação sem resultado: cancelada e crítica não coexistem no mock.
    await fireEvent.press(screen.getByTestId('filtro-estado-CANCELED'));

    expect(screen.getByTestId('inspections-empty-filtered')).toBeOnTheScreen();
    expect(screen.queryByTestId('inspections-empty')).toBeNull();
  });

  it('estado vazio sem filtro explica a ausência de atribuição', async () => {
    getMockDatabase().inspections.length = 0;

    await renderList();

    expect(screen.getByTestId('inspections-empty')).toBeOnTheScreen();
    expect(screen.getByTestId('inspections-empty')).toHaveTextContent(
      /Nenhuma inspeção encontrada/,
    );
  });

  it('abre o detalhe ao tocar no cartão', async () => {
    await renderList();

    const alvo = getMockDatabase().inspections.find(
      (inspection) => inspection.status === 'IN_PROGRESS',
    );

    await fireEvent.press(screen.getByTestId(`inspections-card-${alvo?.id}`));

    expect(routerMock.push).toHaveBeenCalledWith({
      pathname: '/inspections/[inspectionId]',
      params: { inspectionId: alvo?.id },
    });
  });

  it('mostra erro com nova tentativa quando a busca falha', async () => {
    await seedStoredSession({
      accessToken: 'token-desconhecido',
      refreshToken: 'refresh-invalido',
      expiresAt: Date.now() + 15 * 60 * 1000,
      user: {
        id: TECHNICIAN_ID,
        name: 'Carlos Souza',
        email: 'tecnico@fieldops.local',
        role: 'TECHNICIAN',
      },
    });

    await renderWithSession(<InspectionsScreen />, { service: buildTestAuthService() });

    await waitFor(() => expect(screen.getByTestId('inspections-error')).toBeOnTheScreen());
    expect(screen.getByTestId('inspections-error-retry')).toBeOnTheScreen();
  });
});
