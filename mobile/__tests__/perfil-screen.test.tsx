import { Alert } from 'react-native';
import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import * as SecureStore from 'expo-secure-store';

jest.mock('expo-router', () => require('@/test-utils/expo-router-mock'));

import PerfilScreen from '../app/(protected)/(tabs)/perfil';
import { resetRouterMock } from '@/test-utils/expo-router-mock';
import {
  buildTestAuthService,
  renderWithSession,
  seedStoredSession,
  SESSION_KEY,
} from '@/test-utils/render';
import { resetMockDatabase } from '@/services';

type AlertButton = { text?: string; onPress?: () => void };

/** Dispara o botão do `Alert.alert` como o usuário faria no diálogo nativo. */
function pressAlertButton(label: string): void {
  const spy = Alert.alert as unknown as jest.Mock;
  const buttons = (spy.mock.calls[0]?.[2] ?? []) as AlertButton[];
  buttons.find((button) => button.text === label)?.onPress?.();
}

beforeEach(() => {
  resetRouterMock();
  resetMockDatabase();
  jest.spyOn(Alert, 'alert').mockImplementation(() => {});
});

afterEach(() => {
  jest.restoreAllMocks();
});

async function renderPerfil() {
  await seedStoredSession();
  const result = await renderWithSession(<PerfilScreen />, { service: buildTestAuthService() });
  await waitFor(() => expect(screen.getByTestId('perfil-screen')).toBeOnTheScreen());
  return result;
}

describe('FE-M05 — Perfil', () => {
  it('exibe nome, e-mail e perfil de acesso', async () => {
    await renderPerfil();

    expect(screen.getByTestId('perfil-nome')).toHaveTextContent('Carlos Souza');
    expect(screen.getByTestId('perfil-email')).toHaveTextContent('tecnico@fieldops.local');
    expect(screen.getByTestId('perfil-role')).toHaveTextContent('Técnico de campo');
  });

  it('não renderiza nada sem sessão', async () => {
    await renderWithSession(<PerfilScreen />);

    await waitFor(() => expect(screen.queryByTestId('perfil-screen')).toBeNull());
  });

  it('pede confirmação antes de sair', async () => {
    await renderPerfil();

    await fireEvent.press(screen.getByTestId('perfil-signout'));

    expect(Alert.alert).toHaveBeenCalled();
    // Só a confirmação encerra a sessão.
    expect(await SecureStore.getItemAsync(SESSION_KEY)).not.toBeNull();
  });

  it('cancelar mantém a sessão', async () => {
    await renderPerfil();

    await fireEvent.press(screen.getByTestId('perfil-signout'));
    pressAlertButton('Cancelar');

    expect(await SecureStore.getItemAsync(SESSION_KEY)).not.toBeNull();
    expect(screen.getByTestId('perfil-screen')).toBeOnTheScreen();
  });

  it('confirmar apaga a sessão do dispositivo (AC-AUTH logout)', async () => {
    await renderPerfil();

    await fireEvent.press(screen.getByTestId('perfil-signout'));
    pressAlertButton('Sair');

    await waitFor(async () => expect(await SecureStore.getItemAsync(SESSION_KEY)).toBeNull());
  });
});
