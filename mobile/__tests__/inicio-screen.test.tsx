import { USER_IDS } from '@fieldops/shared';
import { fireEvent, screen, waitFor } from '@testing-library/react-native';

jest.mock('expo-router', () => require('@/test-utils/expo-router-mock'));

import InicioScreen from '../app/(protected)/(tabs)/inicio';
import { resetRouterMock, routerMock } from '@/test-utils/expo-router-mock';
import { buildTestAuthService, renderWithSession, seedStoredSession } from '@/test-utils/render';
import { getMockDatabase, resetMockDatabase } from '@/services';

/** O técnico das inspeções fictícias — o mesmo id da sessão semeada. */
const TECHNICIAN_ID = USER_IDS.technician;

beforeEach(() => {
  resetRouterMock();
  resetMockDatabase();
});

/**
 * A sessão gravada precisa de um token que o backend fictício aceite, senão a
 * busca das inspeções responde 401.
 */
async function signedInSession() {
  const database = getMockDatabase();
  const accessToken = 'mock-access.teste';
  database.accessTokens.set(accessToken, TECHNICIAN_ID);

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

async function renderInicio() {
  await signedInSession();
  const result = await renderWithSession(<InicioScreen />, { service: buildTestAuthService() });
  await waitFor(() => expect(screen.queryByTestId('inicio-loading')).toBeNull());
  return result;
}

describe('FE-M02 — Início', () => {
  it('saúda o técnico autenticado', async () => {
    await renderInicio();

    expect(screen.getByText('Olá, Carlos.')).toBeOnTheScreen();
    expect(screen.getByText('tecnico@fieldops.local')).toBeOnTheScreen();
  });

  it('não renderiza nada sem sessão, deixando a decisão para o layout protegido', async () => {
    await renderWithSession(<InicioScreen />);

    await waitFor(() => expect(screen.queryByTestId('inicio-screen')).toBeNull());
  });

  it('separa atrasadas, em andamento e de hoje', async () => {
    await renderInicio();

    // O backend fictício semeia uma inspeção em andamento agendada para 90
    // minutos atrás: ela é, ao mesmo tempo, atrasada, em andamento e de hoje.
    expect(screen.getByTestId('inicio-overdue')).toBeOnTheScreen();
    expect(screen.getByTestId('inicio-in-progress')).toBeOnTheScreen();
    expect(screen.getByTestId('inicio-today')).toBeOnTheScreen();
  });

  it('lista apenas inspeções em andamento no grupo correspondente', async () => {
    await renderInicio();

    const emAndamento = getMockDatabase().inspections.filter(
      (inspection) => inspection.status === 'IN_PROGRESS',
    );

    for (const inspection of emAndamento) {
      expect(screen.getByTestId(`inicio-in-progress-card-${inspection.id}`)).toBeOnTheScreen();
    }
  });

  it('abre o detalhe ao tocar no cartão', async () => {
    await renderInicio();

    const emAndamento = getMockDatabase().inspections.find(
      (inspection) => inspection.status === 'IN_PROGRESS',
    );

    await fireEvent.press(screen.getByTestId(`inicio-in-progress-card-${emAndamento?.id}`));

    expect(routerMock.push).toHaveBeenCalledWith({
      pathname: '/inspections/[inspectionId]',
      params: { inspectionId: emAndamento?.id },
    });
  });

  it('navega para o leitor de QR Code', async () => {
    await renderInicio();

    await fireEvent.press(screen.getByTestId('inicio-scanner'));

    expect(routerMock.push).toHaveBeenCalledWith('/scanner');
  });

  it('mostra o estado vazio quando nada está atribuído', async () => {
    const database = getMockDatabase();
    database.inspections.length = 0;

    await renderInicio();

    expect(screen.getByTestId('inicio-empty')).toBeOnTheScreen();
    expect(screen.queryByTestId('inicio-today')).toBeNull();
  });

  it('mostra o erro e permite tentar de novo quando a busca falha', async () => {
    // Sem token válido no backend fictício, a listagem responde 401.
    await seedStoredSession({
      accessToken: 'token-que-o-mock-nao-conhece',
      refreshToken: 'refresh-invalido',
      expiresAt: Date.now() + 15 * 60 * 1000,
      user: {
        id: TECHNICIAN_ID,
        name: 'Carlos Souza',
        email: 'tecnico@fieldops.local',
        role: 'TECHNICIAN',
      },
    });

    await renderWithSession(<InicioScreen />, { service: buildTestAuthService() });

    await waitFor(() => expect(screen.getByTestId('inicio-error')).toBeOnTheScreen());
    expect(screen.getByTestId('inicio-error-retry')).toBeOnTheScreen();
  });
});
