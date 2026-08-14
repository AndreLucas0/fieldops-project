/**
 * Cliente HTTP único do aplicativo.
 *
 * Responsabilidades:
 *  - resolver a URL a partir da base configurável;
 *  - anexar o Bearer token guardado no Secure Store a cada requisição;
 *  - renovar a sessão uma vez ao receber 401 e repetir a chamada; quando a
 *    renovação falha, limpar a sessão e avisar quem precisa pedir novo login;
 *  - devolver toda falha como `ApiError`, no formato do contrato;
 *  - responder a partir do backend fictício quando o modo mock está ligado.
 *
 * Não há fila, banco local nem repetição automática: cada chamada vai à API
 * (ou ao mock) e o resultado volta direto para a tela.
 */

import {
  ApiError,
  CLIENT_ERROR_CODES,
  isApiErrorBody,
  toAuthSession,
  type AuthSession,
  type RefreshTokenResponse,
  type UploadFile,
} from '@/models';

import { getApiConfig, resolveUrl, type ApiConfig } from './config';
import { handleMockRequest } from './mock/mock-server';
import { sessionStorage, type SessionStorage } from './session-storage';

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

export type QueryValue = string | number | boolean | null | undefined;
export type QueryParams = Record<string, QueryValue>;

export interface RequestOptions {
  query?: QueryParams;
  body?: unknown;
  headers?: Record<string, string>;
  /** Permite à tela cancelar a chamada ao sair. */
  signal?: AbortSignal;
  /** `false` envia sem `Authorization` (padrão: `true`). */
  authenticated?: boolean;
  timeoutMs?: number;
  /** Corpo multipart; quando presente, `body` é ignorado. */
  formData?: FormData;
}

/** Resposta já normalizada — vinda da rede ou do mock. */
export interface HttpResponse {
  status: number;
  body: unknown;
}

export interface MockRequest {
  method: HttpMethod;
  path: string;
  query: QueryParams;
  body: unknown;
  accessToken: string | null;
  formData: FormData | null;
}

export type MockHandler = (request: MockRequest) => Promise<HttpResponse>;

export interface ApiClientOptions {
  getConfig?: () => Readonly<ApiConfig>;
  storage?: SessionStorage;
  mockHandler?: MockHandler;
  fetchImpl?: typeof fetch;
}

/**
 * Rotas que nunca levam token nem disparam renovação: `login` e `refresh` são
 * a própria origem da credencial, e `logout` com 401 já está resolvido.
 */
const AUTH_FREE_PATHS = ['/auth/login', '/auth/refresh'];
const REFRESH_EXEMPT_PATHS = [...AUTH_FREE_PATHS, '/auth/logout'];

const REFRESH_PATH = '/auth/refresh';

function matchesPath(path: string, candidates: readonly string[]): boolean {
  const clean = path.split('?')[0] ?? path;
  return candidates.includes(clean);
}

export function buildQueryString(query: QueryParams | undefined): string {
  if (!query) return '';

  const parts: string[] = [];
  for (const [key, value] of Object.entries(query)) {
    // `undefined` e `null` significam "filtro não informado", não "vazio".
    if (value === undefined || value === null) continue;
    parts.push(`${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`);
  }

  return parts.length > 0 ? `?${parts.join('&')}` : '';
}

function codeForStatus(status: number): string {
  switch (status) {
    case 400:
      return 'BAD_REQUEST';
    case 401:
      return 'UNAUTHORIZED';
    case 403:
      return 'FORBIDDEN';
    case 404:
      return 'NOT_FOUND';
    case 409:
      return 'CONFLICT';
    case 413:
      return 'PAYLOAD_TOO_LARGE';
    case 415:
      return 'UNSUPPORTED_MEDIA_TYPE';
    case 422:
      return 'UNPROCESSABLE_ENTITY';
    default:
      return status >= 500 ? 'SERVER_ERROR' : 'HTTP_ERROR';
  }
}

/** Mensagens em linguagem de negócio para respostas sem corpo de erro. */
function messageForStatus(status: number): string {
  switch (status) {
    case 400:
    case 422:
      return 'Os dados enviados não foram aceitos. Revise as informações e tente novamente.';
    case 401:
      return 'Sua sessão não é mais válida. Entre novamente.';
    case 403:
      return 'Você não tem permissão para esta ação.';
    case 404:
      return 'Registro não encontrado.';
    case 409:
      return 'Este registro foi alterado por outra pessoa. Recarregue antes de continuar.';
    case 413:
      return 'Arquivo maior que o limite permitido.';
    default:
      return status >= 500
        ? 'O servidor não conseguiu concluir a operação. Tente novamente em instantes.'
        : 'Não foi possível concluir a operação.';
  }
}

export class ApiClient {
  private readonly readConfig: () => Readonly<ApiConfig>;
  private readonly storage: SessionStorage;
  private readonly mockHandler: MockHandler;
  private readonly fetchImpl: typeof fetch;

  /** Renovação em andamento — evita várias chamadas simultâneas a `/auth/refresh`. */
  private refreshInFlight: Promise<AuthSession | null> | null = null;

  /** Avisado quando a sessão morre de vez; o AuthService liga o logout aqui. */
  private sessionExpiredListener: (() => void) | null = null;

  /** Avisado quando a renovação dá certo, para o estado reativo acompanhar. */
  private sessionRenewedListener: ((session: AuthSession) => void) | null = null;

  constructor(options: ApiClientOptions = {}) {
    this.readConfig = options.getConfig ?? getApiConfig;
    this.storage = options.storage ?? sessionStorage;
    this.mockHandler = options.mockHandler ?? handleMockRequest;
    this.fetchImpl = options.fetchImpl ?? ((input, init) => fetch(input, init));
  }

  onSessionExpired(listener: (() => void) | null): void {
    this.sessionExpiredListener = listener;
  }

  onSessionRenewed(listener: ((session: AuthSession) => void) | null): void {
    this.sessionRenewedListener = listener;
  }

  get<T>(path: string, options: RequestOptions = {}): Promise<T> {
    return this.request<T>('GET', path, options);
  }

  post<T>(path: string, body?: unknown, options: RequestOptions = {}): Promise<T> {
    return this.request<T>('POST', path, { ...options, body });
  }

  put<T>(path: string, body?: unknown, options: RequestOptions = {}): Promise<T> {
    return this.request<T>('PUT', path, { ...options, body });
  }

  patch<T>(path: string, body?: unknown, options: RequestOptions = {}): Promise<T> {
    return this.request<T>('PATCH', path, { ...options, body });
  }

  delete<T>(path: string, options: RequestOptions = {}): Promise<T> {
    return this.request<T>('DELETE', path, options);
  }

  /**
   * Envio multipart de evidência. O objeto `{ uri, name, type }` é a forma que
   * o `FormData` do React Native aceita para arquivo local.
   */
  upload<T>(
    path: string,
    file: UploadFile,
    metadata: Record<string, unknown> = {},
    options: RequestOptions = {},
  ): Promise<T> {
    const formData = new FormData();
    formData.append('file', file as unknown as Blob);

    for (const [key, value] of Object.entries(metadata)) {
      if (value === undefined || value === null) continue;
      formData.append(key, typeof value === 'string' ? value : JSON.stringify(value));
    }

    return this.request<T>('POST', path, { ...options, formData });
  }

  async request<T>(method: HttpMethod, path: string, options: RequestOptions = {}): Promise<T> {
    const authenticated = options.authenticated !== false && !matchesPath(path, AUTH_FREE_PATHS);
    const token = authenticated ? await this.currentAccessToken() : null;

    let response = await this.send(method, path, options, token);

    if (response.status === 401 && authenticated && !matchesPath(path, REFRESH_EXEMPT_PATHS)) {
      response = await this.retryAfterRefresh(method, path, options);
    }

    return this.unwrap<T>(response, path);
  }

  /** Sessão atual, sem validar expiração: quem decide é a resposta 401 da API. */
  private async currentAccessToken(): Promise<string | null> {
    const session = await this.storage.load();
    return session?.accessToken ?? null;
  }

  private async retryAfterRefresh(
    method: HttpMethod,
    path: string,
    options: RequestOptions,
  ): Promise<HttpResponse> {
    const renewed = await this.refreshSession();

    if (!renewed) {
      // Nem o refresh token vale mais: sai do dispositivo e pede novo login.
      await this.storage.clear();
      this.sessionExpiredListener?.();
      throw ApiError.client(
        CLIENT_ERROR_CODES.SESSION_EXPIRED,
        'Sua sessão expirou. Entre novamente para continuar.',
        { path, status: 401 },
      );
    }

    // Uma única repetição: se este 401 vier de novo, ele sobe como erro.
    return this.send(method, path, options, renewed.accessToken);
  }

  private refreshSession(): Promise<AuthSession | null> {
    if (!this.refreshInFlight) {
      this.refreshInFlight = this.performRefresh().finally(() => {
        this.refreshInFlight = null;
      });
    }
    return this.refreshInFlight;
  }

  private async performRefresh(): Promise<AuthSession | null> {
    const session = await this.storage.load();
    if (!session?.refreshToken) return null;

    let response: HttpResponse;
    try {
      response = await this.send(
        'POST',
        REFRESH_PATH,
        { body: { refreshToken: session.refreshToken }, authenticated: false },
        null,
      );
    } catch {
      // Falha de rede na renovação não invalida a sessão: o erro original da
      // chamada é que deve chegar à tela.
      return null;
    }

    if (response.status < 200 || response.status >= 300) return null;

    const body = response.body as Partial<RefreshTokenResponse> | null;
    if (!body || typeof body.accessToken !== 'string' || typeof body.refreshToken !== 'string') {
      return null;
    }

    const renewed = toAuthSession({
      accessToken: body.accessToken,
      refreshToken: body.refreshToken,
      expiresIn: typeof body.expiresIn === 'number' ? body.expiresIn : 0,
      user: session.user,
    });

    await this.storage.save(renewed);
    this.sessionRenewedListener?.(renewed);
    return renewed;
  }

  private async send(
    method: HttpMethod,
    path: string,
    options: RequestOptions,
    token: string | null,
  ): Promise<HttpResponse> {
    const config = this.readConfig();

    if (config.mockEnabled) {
      return this.mockHandler({
        method,
        path,
        query: options.query ?? {},
        body: options.body ?? null,
        accessToken: token,
        formData: options.formData ?? null,
      });
    }

    return this.sendOverNetwork(method, path, options, token, config);
  }

  private async sendOverNetwork(
    method: HttpMethod,
    path: string,
    options: RequestOptions,
    token: string | null,
    config: Readonly<ApiConfig>,
  ): Promise<HttpResponse> {
    const url = `${resolveUrl(config.baseUrl, path)}${buildQueryString(options.query)}`;

    const headers: Record<string, string> = { Accept: 'application/json', ...options.headers };
    if (token) headers.Authorization = `Bearer ${token}`;

    let payload: BodyInit | undefined;
    if (options.formData) {
      // O `Content-Type` do multipart traz o boundary — deixar o runtime definir.
      payload = options.formData;
    } else if (options.body !== undefined && options.body !== null) {
      headers['Content-Type'] = 'application/json';
      payload = JSON.stringify(options.body);
    }

    const controller = new AbortController();
    const timeoutMs = options.timeoutMs ?? config.timeoutMs;
    let timedOut = false;

    const timer = setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, timeoutMs);

    const abortFromCaller = () => controller.abort();
    const external = options.signal;
    if (external) {
      if (external.aborted) controller.abort();
      else external.addEventListener('abort', abortFromCaller);
    }

    try {
      const response = await this.fetchImpl(url, {
        method,
        headers,
        signal: controller.signal,
        ...(payload !== undefined ? { body: payload } : {}),
      });

      return { status: response.status, body: await readBody(response) };
    } catch (error) {
      throw this.transportError(error, path, timedOut, external?.aborted === true);
    } finally {
      clearTimeout(timer);
      external?.removeEventListener('abort', abortFromCaller);
    }
  }

  private transportError(
    error: unknown,
    path: string,
    timedOut: boolean,
    abortedByCaller: boolean,
  ): ApiError {
    if (timedOut) {
      return ApiError.client(
        CLIENT_ERROR_CODES.TIMEOUT,
        'O servidor demorou demais para responder. Tente novamente.',
        { path, cause: error },
      );
    }

    if (abortedByCaller) {
      return ApiError.client(CLIENT_ERROR_CODES.REQUEST_ABORTED, 'Requisição cancelada.', {
        path,
        cause: error,
      });
    }

    return ApiError.client(
      CLIENT_ERROR_CODES.NETWORK_UNAVAILABLE,
      'Sem conexão com o servidor. Verifique a internet e tente novamente.',
      { path, cause: error },
    );
  }

  private unwrap<T>(response: HttpResponse, path: string): T {
    if (response.status >= 200 && response.status < 300) {
      return response.body as T;
    }

    // Corpo no formato do contrato é repassado como veio; o resto vira uma
    // mensagem apresentável derivada do status.
    if (isApiErrorBody(response.body)) {
      const body = response.body;
      throw new ApiError({ ...body, path: body.path ?? path });
    }

    throw new ApiError({
      timestamp: new Date().toISOString(),
      status: response.status,
      code: codeForStatus(response.status),
      message: messageForStatus(response.status),
      path,
    });
  }
}

/** Lê o corpo uma única vez, tolerando resposta vazia (204) e não-JSON. */
async function readBody(response: Response): Promise<unknown> {
  const text = await response.text();
  if (text.length === 0) return null;

  try {
    return JSON.parse(text) as unknown;
  } catch {
    return text;
  }
}

/** Instância compartilhada — é ela que as telas e o AuthService usam. */
export const apiClient = new ApiClient();
