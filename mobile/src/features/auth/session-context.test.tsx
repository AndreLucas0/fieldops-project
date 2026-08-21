import { useState } from 'react';
import { Pressable, Text } from 'react-native';
import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import * as SecureStore from 'expo-secure-store';

import { ApiError } from '@/models';
import { resetMockDatabase } from '@/services';
import {
  buildSession,
  renderWithSession,
  seedStoredSession,
  SESSION_KEY,
} from '@/test-utils/render';

import { toAuthFailureCode, useSession } from './session-context';

const CREDENTIALS = { email: 'tecnico@fieldops.local', password: 'FieldOps@2026' };

/** Consumidor de teste: expõe o contexto como texto e age por toque. */
function Probe() {
  const { status, session, signIn, signOut } = useSession();
  const [failure, setFailure] = useState<string>('nenhuma');

  return (
    <>
      <Text testID="status">{status}</Text>
      <Text testID="user">{session?.user.email ?? 'nenhum'}</Text>
      <Text testID="failure">{failure}</Text>

      <Pressable
        testID="entrar"
        onPress={() => signIn(CREDENTIALS).catch((error) => setFailure(toAuthFailureCode(error)))}>
        <Text>entrar</Text>
      </Pressable>

      <Pressable
        testID="entrar-errado"
        onPress={() =>
          signIn({ ...CREDENTIALS, password: 'errada' }).catch((error) =>
            setFailure(toAuthFailureCode(error)),
          )
        }>
        <Text>entrar errado</Text>
      </Pressable>

      <Pressable testID="sair" onPress={() => signOut()}>
        <Text>sair</Text>
      </Pressable>
    </>
  );
}

async function waitForSignedOut() {
  await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('signedOut'));
}

beforeEach(() => {
  resetMockDatabase();
});

describe('SessionProvider', () => {
  it('permanece carregando enquanto a leitura do dispositivo não conclui', async () => {
    // Leitura que nunca conclui: reproduz o instante da abertura do app.
    (SecureStore.getItemAsync as unknown as jest.Mock).mockImplementationOnce(
      () => new Promise(() => {}),
    );

    await renderWithSession(<Probe />);

    expect(screen.getByTestId('status')).toHaveTextContent('loading');
  });

  it('conclui como deslogado quando não há sessão gravada', async () => {
    await renderWithSession(<Probe />);

    await waitForSignedOut();
    expect(screen.getByTestId('user')).toHaveTextContent('nenhum');
  });

  it('restaura a sessão gravada no dispositivo', async () => {
    await seedStoredSession();

    await renderWithSession(<Probe />);

    await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('signedIn'));
    expect(screen.getByTestId('user')).toHaveTextContent('tecnico@fieldops.local');
  });

  it('descarta sessão expirada que o servidor não revalida', async () => {
    await seedStoredSession(buildSession({ expiresAt: Date.now() - 1_000 }));

    await renderWithSession(<Probe />);

    await waitForSignedOut();
    expect(await SecureStore.getItemAsync(SESSION_KEY)).toBeNull();
  });

  it('descarta conteúdo corrompido em vez de quebrar a abertura do app', async () => {
    await SecureStore.setItemAsync(SESSION_KEY, '{"accessToken":');

    await renderWithSession(<Probe />);

    await waitForSignedOut();
    expect(await SecureStore.getItemAsync(SESSION_KEY)).toBeNull();
  });

  it('entra pela API e grava a sessão no armazenamento seguro', async () => {
    await renderWithSession(<Probe />);
    await waitForSignedOut();

    await fireEvent.press(screen.getByTestId('entrar'));

    await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('signedIn'));
    expect(screen.getByTestId('user')).toHaveTextContent('tecnico@fieldops.local');
    expect(await SecureStore.getItemAsync(SESSION_KEY)).not.toBeNull();
  });

  it('propaga a falha do serviço e mantém o usuário fora', async () => {
    await renderWithSession(<Probe />);
    await waitForSignedOut();

    // Senha errada: o mock responde 401 INVALID_CREDENTIALS.
    await fireEvent.press(screen.getByTestId('entrar-errado'));

    await waitFor(() =>
      expect(screen.getByTestId('failure')).toHaveTextContent('INVALID_CREDENTIALS'),
    );
    expect(screen.getByTestId('status')).toHaveTextContent('signedOut');
    expect(await SecureStore.getItemAsync(SESSION_KEY)).toBeNull();
  });

  it('remove os dados sensíveis ao sair (AC-AUTH logout)', async () => {
    await renderWithSession(<Probe />);
    await waitForSignedOut();

    await fireEvent.press(screen.getByTestId('entrar'));
    await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('signedIn'));

    await fireEvent.press(screen.getByTestId('sair'));

    await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('signedOut'));
    expect(screen.getByTestId('user')).toHaveTextContent('nenhum');
    expect(await SecureStore.getItemAsync(SESSION_KEY)).toBeNull();
  });
});

describe('toAuthFailureCode', () => {
  function serverError(code: string): ApiError {
    return new ApiError({ timestamp: '2026-08-14T12:00:00Z', status: 401, code, message: 'x' });
  }

  it('repassa os códigos de negócio do contrato', () => {
    expect(toAuthFailureCode(serverError('INVALID_CREDENTIALS'))).toBe('INVALID_CREDENTIALS');
    expect(toAuthFailureCode(serverError('USER_INACTIVE'))).toBe('USER_INACTIVE');
  });

  it('trata falha de transporte como indisponibilidade de rede', () => {
    expect(
      toAuthFailureCode(ApiError.client('NETWORK_UNAVAILABLE', 'sem rede')),
    ).toBe('NETWORK_UNAVAILABLE');
    expect(toAuthFailureCode(ApiError.client('TIMEOUT', 'demorou'))).toBe('NETWORK_UNAVAILABLE');
  });

  it('qualquer outra falha vira inesperada', () => {
    expect(toAuthFailureCode(serverError('QUALQUER'))).toBe('UNEXPECTED');
    expect(toAuthFailureCode(new Error('boom'))).toBe('UNEXPECTED');
  });
});
