import { useState } from 'react';
import { Pressable, Text } from 'react-native';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import * as SecureStore from 'expo-secure-store';

import { AuthError, type Credentials, type Session } from '@/domain/auth';
import type { AuthService } from './auth-service';
import { SessionProvider, toAuthFailureCode, useSession } from './session-context';

const SESSION_KEY = 'fieldops.session';
const CREDENTIALS: Credentials = { email: 'tecnico@fieldops.local', password: 'fieldops123' };

/** O módulo inteiro é mockado em jest.setup.js; isto só devolve o tipo certo. */
function asMock<T>(fn: T): jest.Mock {
  return fn as unknown as jest.Mock;
}

function buildSession(overrides: Partial<Session> = {}): Session {
  return {
    accessToken: 'access.token',
    refreshToken: 'refresh.token',
    expiresAt: Date.now() + 60_000,
    user: {
      id: '8a50e30d-2a58-4a24-944e-10a9948abf01',
      name: 'Carlos Souza',
      email: 'tecnico@fieldops.local',
      role: 'TECHNICIAN',
    },
    ...overrides,
  };
}

/**
 * Consumidor de teste: expõe o contexto como texto e dispara as ações por
 * toque, como uma tela real faria.
 */
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

      <Pressable testID="sair" onPress={() => signOut()}>
        <Text>sair</Text>
      </Pressable>
    </>
  );
}

function renderProvider(authService?: AuthService) {
  return render(
    <SessionProvider authService={authService}>
      <Probe />
    </SessionProvider>,
  );
}

function serviceThatReturns(session: Session): AuthService {
  return {
    signIn: jest.fn(async () => session),
    signOut: jest.fn(async () => {}),
  };
}

async function waitForSignedOut() {
  await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('signedOut'));
}

describe('SessionProvider', () => {
  it('permanece carregando enquanto a leitura do dispositivo não conclui', async () => {
    // Leitura que nunca conclui: reproduz o instante da abertura do app.
    asMock(SecureStore.getItemAsync).mockImplementationOnce(() => new Promise(() => {}));

    await renderProvider();

    expect(screen.getByTestId('status')).toHaveTextContent('loading');
  });

  it('conclui como deslogado quando não há sessão gravada', async () => {
    await renderProvider();

    await waitForSignedOut();
    expect(screen.getByTestId('user')).toHaveTextContent('nenhum');
  });

  it('restaura a sessão gravada no dispositivo', async () => {
    await SecureStore.setItemAsync(SESSION_KEY, JSON.stringify(buildSession()));

    await renderProvider();

    await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('signedIn'));
    expect(screen.getByTestId('user')).toHaveTextContent('tecnico@fieldops.local');
  });

  it('descarta e apaga sessão expirada', async () => {
    await SecureStore.setItemAsync(
      SESSION_KEY,
      JSON.stringify(buildSession({ expiresAt: Date.now() - 1_000 })),
    );

    await renderProvider();

    await waitForSignedOut();
    expect(await SecureStore.getItemAsync(SESSION_KEY)).toBeNull();
  });

  it('descarta conteúdo corrompido em vez de quebrar a abertura do app', async () => {
    await SecureStore.setItemAsync(SESSION_KEY, '{"accessToken":');

    await renderProvider();

    await waitForSignedOut();
    expect(await SecureStore.getItemAsync(SESSION_KEY)).toBeNull();
  });

  it('grava a sessão no armazenamento seguro ao entrar', async () => {
    const created = buildSession();
    await renderProvider(serviceThatReturns(created));
    await waitForSignedOut();

    await fireEvent.press(screen.getByTestId('entrar'));

    expect(screen.getByTestId('status')).toHaveTextContent('signedIn');
    expect(JSON.parse((await SecureStore.getItemAsync(SESSION_KEY)) ?? '{}')).toEqual(created);
  });

  it('propaga a falha do serviço e mantém o usuário fora', async () => {
    const failing: AuthService = {
      signIn: jest.fn(async () => {
        throw new AuthError('INVALID_CREDENTIALS');
      }),
      signOut: jest.fn(async () => {}),
    };
    await renderProvider(failing);
    await waitForSignedOut();

    await fireEvent.press(screen.getByTestId('entrar'));

    expect(screen.getByTestId('failure')).toHaveTextContent('INVALID_CREDENTIALS');
    expect(screen.getByTestId('status')).toHaveTextContent('signedOut');
    expect(await SecureStore.getItemAsync(SESSION_KEY)).toBeNull();
  });

  it('remove os dados sensíveis ao sair (AC-AUTH logout)', async () => {
    const service = serviceThatReturns(buildSession());
    await renderProvider(service);
    await waitForSignedOut();

    await fireEvent.press(screen.getByTestId('entrar'));
    expect(screen.getByTestId('status')).toHaveTextContent('signedIn');

    await fireEvent.press(screen.getByTestId('sair'));

    expect(screen.getByTestId('status')).toHaveTextContent('signedOut');
    expect(screen.getByTestId('user')).toHaveTextContent('nenhum');
    expect(await SecureStore.getItemAsync(SESSION_KEY)).toBeNull();
    expect(service.signOut).toHaveBeenCalled();
  });

  it('sai localmente mesmo quando o logout no servidor falha', async () => {
    const service: AuthService = {
      signIn: jest.fn(async () => buildSession()),
      signOut: jest.fn(async () => {
        throw new Error('sem rede');
      }),
    };
    await renderProvider(service);
    await waitForSignedOut();

    await fireEvent.press(screen.getByTestId('entrar'));
    await fireEvent.press(screen.getByTestId('sair'));

    expect(screen.getByTestId('status')).toHaveTextContent('signedOut');
    expect(await SecureStore.getItemAsync(SESSION_KEY)).toBeNull();
  });
});
