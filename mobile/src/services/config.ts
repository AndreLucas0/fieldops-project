/**
 * Configuração do acesso à API.
 *
 * Os valores padrão vêm de variáveis `EXPO_PUBLIC_*`, que o Expo substitui no
 * bundle em tempo de build. Elas precisam ser lidas como propriedade literal de
 * `process.env` — desestruturar ou indexar por colchete não é substituído
 * (docs.expo.dev/guides/environment-variables).
 */

const DEFAULT_BASE_URL = 'http://localhost:8080/api/v1';

/** Tempo limite por requisição; em campo, esperar mais que isso é travar. */
const DEFAULT_TIMEOUT_MS = 20_000;

/** Latência fingida do modo mock, para os estados de carregamento aparecerem. */
const DEFAULT_MOCK_LATENCY_MS = 450;

export interface ApiConfig {
  /** Raiz da API, já incluindo o prefixo de versão (`/api/v1`). */
  baseUrl: string;
  /**
   * Quando ligado, nenhuma requisição sai do dispositivo: o `ApiClient`
   * responde a partir do backend fictício em memória.
   */
  mockEnabled: boolean;
  mockLatencyMs: number;
  timeoutMs: number;
}

function readFlag(value: string | undefined, fallback: boolean): boolean {
  if (value === undefined || value === '') return fallback;
  return value === 'true' || value === '1';
}

function readNumber(value: string | undefined, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
}

/**
 * O mock fica ligado por padrão: enquanto a API não sobe, o app precisa abrir
 * e navegar por completo. Para falar com o backend de verdade, defina
 * `EXPO_PUBLIC_API_MOCK=false` no `.env`.
 */
const defaults: ApiConfig = {
  baseUrl: process.env.EXPO_PUBLIC_API_BASE_URL ?? DEFAULT_BASE_URL,
  mockEnabled: readFlag(process.env.EXPO_PUBLIC_API_MOCK, true),
  mockLatencyMs: readNumber(process.env.EXPO_PUBLIC_API_MOCK_LATENCY_MS, DEFAULT_MOCK_LATENCY_MS),
  timeoutMs: readNumber(process.env.EXPO_PUBLIC_API_TIMEOUT_MS, DEFAULT_TIMEOUT_MS),
};

let current: ApiConfig = { ...defaults };

export function getApiConfig(): Readonly<ApiConfig> {
  return current;
}

/** Sobrescreve a configuração em tempo de execução (testes, tela de ajustes). */
export function configureApi(overrides: Partial<ApiConfig>): Readonly<ApiConfig> {
  current = { ...current, ...overrides };
  return current;
}

/** Volta ao que veio do ambiente — usado entre casos de teste. */
export function resetApiConfig(): Readonly<ApiConfig> {
  current = { ...defaults };
  return current;
}

/** Junta base e caminho sem duplicar nem perder a barra do meio. */
export function resolveUrl(baseUrl: string, path: string): string {
  const base = baseUrl.replace(/\/+$/, '');
  const suffix = path.startsWith('/') ? path : `/${path}`;
  return `${base}${suffix}`;
}
