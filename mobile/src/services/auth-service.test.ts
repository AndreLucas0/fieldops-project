jest.mock('expo-router', () => require('@/test-utils/expo-router-mock'));

import * as SecureStore from 'expo-secure-store';

import { ApiError } from '@/models';

import { ApiClient } from './api-client';
import { AuthService, type AuthNavigation } from './auth-service';
import type { ApiConfig } from './config';
import { getMockDatabase, resetMockDatabase } from './mock/mock-data';
import { SESSION_KEY, sessionStorage } from './session-storage';

const MOCK_CONFIG: ApiConfig = {
  baseUrl: 'http://localhost:8080/api/v1',
  mockEnabled: true,
  mockLatencyMs: 0,
  timeoutMs: 1_000,
};

const VALID = { email: 'tecnico@fieldops.local', password: 'FieldOps@2026' };

function buildService(): { service: AuthService; navigation: AuthNavigation & { toLogin: jest.Mock } } {
  const client = new ApiClient({
    getConfig: () => MOCK_CONFIG,
    storage: sessionStorage,
  });
  const navigation = { toLogin: jest.fn() };
  const service = new AuthService({ client, storage: sessionStorage, navigation });
  return { service, navigation };
}

/** Captura a falha mantendo o tipo `ApiError`, sem união com o valor de sucesso. */
async function captureError(promise: Promise<unknown>): Promise<ApiError> {
  let caught: unknown;
  try {
    await promise;
  } catch (error) {
    caught = error;
  }
  expect(caught).toBeInstanceOf(ApiError);
  return caught as ApiError;
}

beforeEach(() => {
  // O Secure Store em memória é limpo pelo jest.setup; os dados fictícios
  // precisam voltar ao estado inicial para os casos não interferirem.
  resetMockDatabase();
});

describe('AuthService.login', () => {
  it('autentica e publica user, role e isAuthenticated', async () => {
    const { service } = buildService();

    await service.login(VALID);

    const state = service.getState();
    expect(state.status).toBe('signedIn');
    expect(state.isAuthenticated).toBe(true);
    expect(state.role).toBe('TECHNICIAN');
    expect(state.user?.email).toBe('tecnico@fieldops.local');
  });

  it('grava a sessão no armazenamento seguro', async () => {
    const { service } = buildService();

    const session = await service.login(VALID);

    const raw = await SecureStore.getItemAsync(SESSION_KEY);
    expect(JSON.parse(raw ?? '{}')).toEqual(session);
    expect(session.expiresAt).toBeGreaterThan(Date.now());
  });

  it('normaliza e-mail com espaços e caixa diferente', async () => {
    const { service } = buildService();

    await service.login({ email: '  Tecnico@FieldOps.Local ', password: VALID.password });

    expect(service.getState().user?.email).toBe('tecnico@fieldops.local');
  });

  it('recusa credencial inválida sem revelar se o e-mail existe (AC-AUTH)', async () => {
    const { service } = buildService();

    const senhaErrada = await captureError(
      service.login({ email: VALID.email, password: 'errada' }),
    );
    const emailInexistente = await captureError(
      service.login({ email: 'ninguem@fieldops.local', password: VALID.password }),
    );

    expect(senhaErrada.code).toBe('INVALID_CREDENTIALS');
    expect(emailInexistente.code).toBe('INVALID_CREDENTIALS');
    expect(senhaErrada.message).toBe(emailInexistente.message);
    expect(service.getState().isAuthenticated).toBe(false);
  });

  it('recusa usuário inativo (RN-001)', async () => {
    const { service } = buildService();

    const error = await captureError(
      service.login({ email: 'inativo@fieldops.local', password: VALID.password }),
    );

    expect(error.code).toBe('USER_INACTIVE');
    expect(service.getState().status).toBe('signedOut');
  });

  it('notifica quem está inscrito no estado', async () => {
    const { service } = buildService();
    const listener = jest.fn();
    const unsubscribe = service.subscribe(listener);

    await service.login(VALID);
    expect(listener).toHaveBeenCalled();

    unsubscribe();
    listener.mockClear();
    await service.logout();
    expect(listener).not.toHaveBeenCalled();
  });
});

describe('AuthService.logout', () => {
  it('encerra a sessão, limpa o dispositivo e volta para o login', async () => {
    const { service, navigation } = buildService();
    await service.login(VALID);

    await service.logout();

    expect(service.getState()).toMatchObject({
      status: 'signedOut',
      isAuthenticated: false,
      user: null,
      role: null,
    });
    expect(await SecureStore.getItemAsync(SESSION_KEY)).toBeNull();
    expect(navigation.toLogin).toHaveBeenCalled();
  });

  it('sai localmente mesmo quando a chamada ao servidor falha', async () => {
    const navigation = { toLogin: jest.fn() };
    const client = new ApiClient({
      getConfig: () => MOCK_CONFIG,
      storage: sessionStorage,
      mockHandler: async () => {
        throw new Error('sem rede');
      },
    });
    const service = new AuthService({ client, storage: sessionStorage, navigation });

    // Sessão posta à mão: o login também passaria pelo mock que está quebrado.
    await sessionStorage.save({
      accessToken: 'a',
      refreshToken: 'r',
      expiresAt: Date.now() + 60_000,
      user: { id: '1', name: 'Carlos', email: 'tecnico@fieldops.local', role: 'TECHNICIAN' },
    });
    await service.restore();

    await service.logout();

    expect(service.getState().status).toBe('signedOut');
    expect(await SecureStore.getItemAsync(SESSION_KEY)).toBeNull();
    expect(navigation.toLogin).toHaveBeenCalled();
  });
});

describe('AuthService.getCurrentUser', () => {
  it('consulta o usuário do token e atualiza o estado', async () => {
    const { service } = buildService();
    await service.login(VALID);

    const me = await service.getCurrentUser();

    expect(me).toMatchObject({
      email: 'tecnico@fieldops.local',
      role: 'TECHNICIAN',
      status: 'ACTIVE',
    });
    expect(service.getState().user?.name).toBe(me.name);
  });

  it('falha com sessão ausente', async () => {
    const { service } = buildService();

    await captureError(service.getCurrentUser());
  });
});

describe('AuthService.restore', () => {
  it('conclui como deslogado quando não há sessão gravada', async () => {
    const { service } = buildService();

    const state = await service.restore();

    expect(state.status).toBe('signedOut');
  });

  it('recupera a sessão válida gravada no dispositivo', async () => {
    const { service } = buildService();
    const session = await service.login(VALID);

    const { service: outro } = buildService();
    const state = await outro.restore();

    expect(state.status).toBe('signedIn');
    expect(state.session?.accessToken).toBe(session.accessToken);
    expect(state.role).toBe('TECHNICIAN');
  });

  it('descarta sessão vencida que o refresh não recupera', async () => {
    await sessionStorage.save({
      accessToken: 'antigo',
      refreshToken: 'invalido',
      expiresAt: Date.now() - 1_000,
      user: { id: '1', name: 'Carlos', email: 'tecnico@fieldops.local', role: 'TECHNICIAN' },
    });
    const { service } = buildService();

    const state = await service.restore();

    expect(state.status).toBe('signedOut');
    expect(await SecureStore.getItemAsync(SESSION_KEY)).toBeNull();
  });

  it('mantém logado quando o servidor ainda aceita o token vencido no relógio local', async () => {
    const { service } = buildService();
    const session = await service.login(VALID);
    await sessionStorage.save({ ...session, expiresAt: Date.now() - 1_000 });

    const { service: reaberto } = buildService();
    const state = await reaberto.restore();

    // Revalidado por `GET /auth/me`; sem 401, não há por que renovar.
    expect(state.status).toBe('signedIn');
    expect(state.session?.accessToken).toBe(session.accessToken);
  });

  it('renova a sessão quando o servidor recusa o access token', async () => {
    const { service } = buildService();
    const session = await service.login(VALID);
    await sessionStorage.save({ ...session, expiresAt: Date.now() - 1_000 });

    // O servidor deixa de aceitar o access token; o refresh token continua
    // válido — é o caminho 401 → /auth/refresh → repetição do ApiClient.
    getMockDatabase().accessTokens.clear();

    const { service: reaberto } = buildService();
    const state = await reaberto.restore();

    expect(state.status).toBe('signedIn');
    expect(state.session?.accessToken).not.toBe(session.accessToken);
  });
});
