import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import * as Location from 'expo-location';

jest.mock('expo-router', () => require('@/test-utils/expo-router-mock'));

import StartInspectionScreen from '../app/(protected)/inspections/[inspectionId]/start';
import { resetRouterMock, routerMock, setSearchParams } from '@/test-utils/expo-router-mock';
import { buildTestAuthService, renderWithSession, seedStoredSession } from '@/test-utils/render';
import { configureApi, getMockDatabase, resetApiConfig, resetMockDatabase } from '@/services';
import type { InspectionStatus } from '@/models';

const TECHNICIAN_ID = '8a50e30d-2a58-4a24-944e-10a9948abf01';

function asMock<T>(fn: T): jest.Mock {
  return fn as unknown as jest.Mock;
}

beforeEach(() => {
  resetRouterMock();
  resetMockDatabase();
  // A tela chama o `apiClient` compartilhado no `start`; sem isso ele usaria a
  // configuração de produção, com latência simulada.
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

async function renderStart(inspectionId: string) {
  await signedIn();
  setSearchParams({ inspectionId });

  const result = await renderWithSession(<StartInspectionScreen />, {
    service: buildTestAuthService(),
  });
  await waitFor(() => expect(screen.queryByTestId('iniciar-loading')).toBeNull());
  return result;
}

describe('FE-M07 — Iniciar inspeção', () => {
  it('mostra o resumo da inspeção atribuída', async () => {
    await renderStart(inspectionWith('ASSIGNED'));

    expect(screen.getByTestId('iniciar-resumo')).toHaveTextContent(/Atribuída/);
    await waitFor(() =>
      expect(screen.getByTestId('iniciar-resumo')).toHaveTextContent(/Metalúrgica Horizonte/),
    );
  });

  it('recusa iniciar o que não está atribuído (pré-condição)', async () => {
    await renderStart(inspectionWith('IN_PROGRESS'));

    expect(screen.getByTestId('iniciar-estado-invalido')).toBeOnTheScreen();
    expect(screen.queryByTestId('iniciar-confirmar')).toBeNull();
  });

  it('captura a localização, inicia e vai para o checklist', async () => {
    const id = inspectionWith('ASSIGNED');
    await renderStart(id);

    await fireEvent.press(screen.getByTestId('iniciar-confirmar'));

    await waitFor(() =>
      expect(routerMock.replace).toHaveBeenCalledWith({
        pathname: '/inspections/[inspectionId]/checklist',
        params: { inspectionId: id },
      }),
    );

    const inspection = getMockDatabase().inspections.find((entry) => entry.id === id);
    expect(inspection?.status).toBe('IN_PROGRESS');
    expect(inspection?.startedAtDevice).toEqual(expect.any(String));
  });

  it('envia a localização capturada no corpo do start (RN-062)', async () => {
    const id = inspectionWith('ASSIGNED');
    await renderStart(id);

    await fireEvent.press(screen.getByTestId('iniciar-confirmar'));

    await waitFor(() => expect(screen.getByTestId('iniciar-coordenadas')).toBeOnTheScreen());
    expect(screen.getByTestId('iniciar-coordenadas')).toHaveTextContent(/-23.35560, -46.87810/);
    expect(screen.getByTestId('iniciar-coordenadas')).toHaveTextContent(/12 m/);
  });

  it('permissão negada não impede o início, mas avisa (PEND-F03)', async () => {
    asMock(Location.requestForegroundPermissionsAsync).mockResolvedValue({
      granted: false,
      status: 'denied',
    });

    const id = inspectionWith('ASSIGNED');
    await renderStart(id);

    await fireEvent.press(screen.getByTestId('iniciar-confirmar'));

    await waitFor(() => expect(screen.getByTestId('iniciar-aviso-localizacao')).toBeOnTheScreen());
    expect(screen.getByTestId('iniciar-aviso-localizacao')).toHaveTextContent(/negada/);

    await waitFor(() => expect(routerMock.replace).toHaveBeenCalled());
    expect(getMockDatabase().inspections.find((entry) => entry.id === id)?.status).toBe(
      'IN_PROGRESS',
    );
  });

  it('GPS indisponível também deixa iniciar, com outro aviso', async () => {
    asMock(Location.getCurrentPositionAsync).mockRejectedValue(new Error('sem sinal'));

    await renderStart(inspectionWith('ASSIGNED'));

    await fireEvent.press(screen.getByTestId('iniciar-confirmar'));

    await waitFor(() => expect(screen.getByTestId('iniciar-aviso-localizacao')).toBeOnTheScreen());
    expect(screen.getByTestId('iniciar-aviso-localizacao')).toHaveTextContent(/sem coordenadas/);
  });

  it('"continuar sem localização" nem consulta o GPS', async () => {
    const id = inspectionWith('ASSIGNED');
    await renderStart(id);

    await fireEvent.press(screen.getByTestId('iniciar-sem-localizacao'));

    await waitFor(() => expect(routerMock.replace).toHaveBeenCalled());
    expect(Location.requestForegroundPermissionsAsync).not.toHaveBeenCalled();
    expect(getMockDatabase().inspections.find((entry) => entry.id === id)?.status).toBe(
      'IN_PROGRESS',
    );
  });

  it('mostra a falha do servidor sem sair da tela', async () => {
    const id = inspectionWith('ASSIGNED');
    await renderStart(id);

    // Outro dispositivo já iniciou: o servidor responde 409.
    const inspection = getMockDatabase().inspections.find((entry) => entry.id === id);
    if (inspection) inspection.status = 'IN_PROGRESS';

    await fireEvent.press(screen.getByTestId('iniciar-confirmar'));

    await waitFor(() => expect(screen.getByTestId('iniciar-falha')).toBeOnTheScreen());
    expect(routerMock.replace).not.toHaveBeenCalled();
  });
});
