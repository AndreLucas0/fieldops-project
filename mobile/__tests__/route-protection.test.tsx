import { screen, waitFor } from '@testing-library/react-native';
import * as SecureStore from 'expo-secure-store';

jest.mock('expo-router', () => require('@/test-utils/expo-router-mock'));

import ProtectedLayout from '../app/(protected)/_layout';
import { buildSession, renderWithSession, seedStoredSession, SESSION_KEY } from '@/test-utils/render';

describe('Proteção da área protegida', () => {
  it('manda para o login quem não tem sessão', async () => {
    await renderWithSession(<ProtectedLayout />);

    await waitFor(() => expect(screen.getByTestId('redirect-to')).toHaveTextContent('/login'));
    expect(screen.queryByTestId('stack')).toBeNull();
  });

  it('libera a navegação quando existe sessão válida', async () => {
    await seedStoredSession();

    await renderWithSession(<ProtectedLayout />);

    await waitFor(() => expect(screen.getByTestId('stack')).toBeOnTheScreen());
    expect(screen.queryByTestId('redirect')).toBeNull();
  });

  it('manda para o login quando a sessão gravada já expirou', async () => {
    await seedStoredSession(buildSession({ expiresAt: Date.now() - 1_000 }));

    await renderWithSession(<ProtectedLayout />);

    await waitFor(() => expect(screen.getByTestId('redirect-to')).toHaveTextContent('/login'));
    expect(await SecureStore.getItemAsync(SESSION_KEY)).toBeNull();
  });

  it('bloqueia perfil sem acesso ao aplicativo de campo (docs §5.2)', async () => {
    const viewer = buildSession();
    await seedStoredSession({
      ...viewer,
      user: { ...viewer.user, role: 'CLIENT_VIEWER', name: 'Cliente Observador' },
    });

    await renderWithSession(<ProtectedLayout />);

    await waitFor(() => expect(screen.getByTestId('redirect-to')).toHaveTextContent('/login'));
    expect(screen.queryByTestId('stack')).toBeNull();
  });

  it('não decide nada enquanto a sessão gravada está sendo lida', async () => {
    // Leitura que nunca conclui: simula o instante inicial da abertura do app.
    (SecureStore.getItemAsync as unknown as jest.Mock).mockImplementationOnce(
      () => new Promise(() => {}),
    );

    await renderWithSession(<ProtectedLayout />);

    expect(screen.getByTestId('protected-loading')).toBeOnTheScreen();
    expect(screen.queryByTestId('redirect')).toBeNull();
    expect(screen.queryByTestId('stack')).toBeNull();
  });
});
