import { ApiError, type AuthSession } from '@/models';

import { ApiClient, buildQueryString } from './api-client';
import type { ApiConfig } from './config';
import type { SessionStorage } from './session-storage';

const CONFIG: ApiConfig = {
  baseUrl: 'https://api.fieldops.test/api/v1',
  mockEnabled: false,
  mockLatencyMs: 0,
  timeoutMs: 5_000,
};

function buildSession(overrides: Partial<AuthSession> = {}): AuthSession {
  return {
    accessToken: 'token-atual',
    refreshToken: 'refresh-atual',
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

/** Armazenamento em memória com o mesmo contrato do Secure Store. */
function memoryStorage(initial: AuthSession | null): SessionStorage & {
  current(): AuthSession | null;
} {
  let session = initial;
  return {
    load: jest.fn(async () => session),
    save: jest.fn(async (next: AuthSession) => {
      session = next;
    }),
    clear: jest.fn(async () => {
      session = null;
    }),
    current: () => session,
  };
}

interface RecordedCall {
  url: string;
  headers: Record<string, string>;
  method: string;
  body: unknown;
}

function jsonResponse(status: number, body?: unknown): Response {
  return {
    status,
    text: async () => (body === undefined ? '' : JSON.stringify(body)),
  } as unknown as Response;
}

/** Fetch de teste: guarda as chamadas e responde na ordem programada. */
function recordingFetch(responses: (Response | Error)[]) {
  const calls: RecordedCall[] = [];

  const impl = jest.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const headers = (init?.headers ?? {}) as Record<string, string>;
    calls.push({
      url: String(input),
      headers,
      method: init?.method ?? 'GET',
      body: typeof init?.body === 'string' ? JSON.parse(init.body) : init?.body,
    });

    const next = responses[calls.length - 1];
    if (next instanceof Error) throw next;
    return next ?? jsonResponse(200, {});
  });

  return { impl: impl as unknown as typeof fetch, calls };
}

function buildClient(
  responses: (Response | Error)[],
  storage: SessionStorage,
  config: Partial<ApiConfig> = {},
) {
  const fetchStub = recordingFetch(responses);
  const client = new ApiClient({
    getConfig: () => ({ ...CONFIG, ...config }),
    storage,
    fetchImpl: fetchStub.impl,
  });
  return { client, calls: fetchStub.calls };
}

describe('buildQueryString', () => {
  it('omite filtros não informados e escapa os valores', () => {
    expect(
      buildQueryString({ status: 'IN_PROGRESS', page: 0, vazio: undefined, nulo: null }),
    ).toBe('?status=IN_PROGRESS&page=0');
  });

  it('devolve string vazia quando não há parâmetro utilizável', () => {
    expect(buildQueryString({ a: undefined })).toBe('');
    expect(buildQueryString(undefined)).toBe('');
  });
});

describe('ApiClient', () => {
  it('anexa o Bearer token do armazenamento seguro', async () => {
    const storage = memoryStorage(buildSession());
    const { client, calls } = buildClient([jsonResponse(200, { ok: true })], storage);

    await client.get('/mobile/inspections');

    expect(calls[0]?.url).toBe('https://api.fieldops.test/api/v1/mobile/inspections');
    expect(calls[0]?.headers.Authorization).toBe('Bearer token-atual');
  });

  it('não envia token nas rotas de login e refresh', async () => {
    const storage = memoryStorage(buildSession());
    const { client, calls } = buildClient([jsonResponse(200, {})], storage);

    await client.post('/auth/login', { email: 'a@b.c', password: 'x' });

    expect(calls[0]?.headers.Authorization).toBeUndefined();
  });

  it('renova a sessão ao receber 401 e repete a chamada com o novo token', async () => {
    const storage = memoryStorage(buildSession());
    const { client, calls } = buildClient(
      [
        jsonResponse(401, { status: 401, code: 'UNAUTHORIZED', message: 'expirado' }),
        jsonResponse(200, { accessToken: 'token-novo', refreshToken: 'refresh-novo', expiresIn: 900 }),
        jsonResponse(200, { content: [] }),
      ],
      storage,
    );

    const result = await client.get<{ content: unknown[] }>('/mobile/inspections');

    expect(result).toEqual({ content: [] });
    expect(calls).toHaveLength(3);
    expect(calls[1]?.url).toContain('/auth/refresh');
    expect(calls[1]?.body).toEqual({ refreshToken: 'refresh-atual' });
    expect(calls[2]?.headers.Authorization).toBe('Bearer token-novo');
    expect(storage.current()?.accessToken).toBe('token-novo');
  });

  it('usa uma única renovação para chamadas simultâneas', async () => {
    const storage = memoryStorage(buildSession());
    const unauthorized = () => jsonResponse(401, { status: 401, code: 'UNAUTHORIZED', message: '' });
    const { client, calls } = buildClient(
      [
        unauthorized(),
        unauthorized(),
        jsonResponse(200, { accessToken: 'token-novo', refreshToken: 'refresh-novo', expiresIn: 900 }),
        jsonResponse(200, { a: 1 }),
        jsonResponse(200, { b: 2 }),
      ],
      storage,
    );

    await Promise.all([client.get('/mobile/inspections'), client.get('/auth/me')]);

    const refreshCalls = calls.filter((call) => call.url.includes('/auth/refresh'));
    expect(refreshCalls).toHaveLength(1);
  });

  it('pede novo login quando a renovação falha', async () => {
    const storage = memoryStorage(buildSession());
    const { client } = buildClient(
      [
        jsonResponse(401, { status: 401, code: 'UNAUTHORIZED', message: '' }),
        jsonResponse(401, { status: 401, code: 'INVALID_REFRESH_TOKEN', message: '' }),
      ],
      storage,
    );

    const expired = jest.fn();
    client.onSessionExpired(expired);

    const error = await client.get('/mobile/inspections').catch((thrown: unknown) => thrown);

    expect(error).toBeInstanceOf(ApiError);
    expect((error as ApiError).code).toBe('SESSION_EXPIRED');
    expect(expired).toHaveBeenCalled();
    // AC-AUTH: a sessão inválida não pode continuar gravada no aparelho.
    expect(storage.current()).toBeNull();
  });

  it('não tenta renovar quando não há sessão guardada', async () => {
    const storage = memoryStorage(null);
    const { client, calls } = buildClient(
      [jsonResponse(401, { status: 401, code: 'UNAUTHORIZED', message: '' })],
      storage,
    );

    await client.get('/mobile/inspections').catch(() => undefined);

    expect(calls.some((call) => call.url.includes('/auth/refresh'))).toBe(false);
  });

  it('repassa o erro do contrato com código e erros de campo', async () => {
    const storage = memoryStorage(buildSession());
    const { client } = buildClient(
      [
        jsonResponse(422, {
          timestamp: '2026-08-14T12:00:00Z',
          status: 422,
          code: 'INSPECTION_REQUIRED_ITEMS_MISSING',
          message: 'Há 2 itens obrigatórios sem resposta.',
          path: '/inspections/1/submit',
          fieldErrors: [{ field: 'item-1', message: 'resposta obrigatória' }],
        }),
      ],
      storage,
    );

    const error = (await client
      .post('/inspections/1/submit', {})
      .catch((thrown: unknown) => thrown)) as ApiError;

    expect(error.code).toBe('INSPECTION_REQUIRED_ITEMS_MISSING');
    expect(error.status).toBe(422);
    expect(error.fieldErrors).toHaveLength(1);
  });

  it('gera erro apresentável quando a resposta não traz corpo de erro', async () => {
    const storage = memoryStorage(buildSession());
    const { client } = buildClient([jsonResponse(500)], storage);

    const error = (await client.get('/mobile/inspections').catch((t: unknown) => t)) as ApiError;

    expect(error.status).toBe(500);
    expect(error.code).toBe('SERVER_ERROR');
    expect(error.path).toBe('/mobile/inspections');
  });

  it('traduz falha de transporte em erro de rede', async () => {
    const storage = memoryStorage(buildSession());
    const { client } = buildClient([new TypeError('Network request failed')], storage);

    const error = (await client.get('/mobile/inspections').catch((t: unknown) => t)) as ApiError;

    expect(error.code).toBe('NETWORK_UNAVAILABLE');
    expect(error.status).toBe(0);
  });

  it('devolve nulo em resposta sem conteúdo (204)', async () => {
    const storage = memoryStorage(buildSession());
    const { client } = buildClient([jsonResponse(204)], storage);

    await expect(client.post('/auth/logout')).resolves.toBeNull();
  });

  it('monta a URL sem barra duplicada', async () => {
    const storage = memoryStorage(buildSession());
    const { client, calls } = buildClient([jsonResponse(200, {})], storage, {
      baseUrl: 'https://api.fieldops.test/api/v1/',
    });

    await client.get('/auth/me');

    expect(calls[0]?.url).toBe('https://api.fieldops.test/api/v1/auth/me');
  });
});
