import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import * as SecureStore from 'expo-secure-store';

jest.mock('expo-router', () => require('@/test-utils/expo-router-mock'));

import InicioScreen from '../app/(protected)/inicio';
import { resetRouterMock } from '@/test-utils/expo-router-mock';
import { renderWithSession, seedStoredSession, SESSION_KEY } from '@/test-utils/render';

beforeEach(() => {
  resetRouterMock();
});

describe('Tela de início', () => {
  it('saúda o técnico autenticado e mostra o perfil', async () => {
    await seedStoredSession();

    await renderWithSession(<InicioScreen />);

    await waitFor(() => expect(screen.getByTestId('inicio-screen')).toBeOnTheScreen());
    expect(screen.getByText('Olá, Carlos.')).toBeOnTheScreen();
    expect(screen.getByText('Técnico de campo')).toBeOnTheScreen();
    expect(screen.getByText('tecnico@fieldops.local')).toBeOnTheScreen();
  });

  it('não renderiza nada sem sessão, deixando a decisão para o layout protegido', async () => {
    await renderWithSession(<InicioScreen />);

    await waitFor(() => expect(screen.queryByTestId('inicio-screen')).toBeNull());
  });

  it('apaga a sessão do dispositivo ao sair (AC-AUTH logout)', async () => {
    await seedStoredSession();

    await renderWithSession(<InicioScreen />);
    await waitFor(() => expect(screen.getByTestId('inicio-signout')).toBeOnTheScreen());

    await fireEvent.press(screen.getByTestId('inicio-signout'));

    await waitFor(async () => expect(await SecureStore.getItemAsync(SESSION_KEY)).toBeNull());
    expect(screen.queryByTestId('inicio-screen')).toBeNull();
  });
});
