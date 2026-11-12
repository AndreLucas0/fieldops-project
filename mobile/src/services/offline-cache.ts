/**
 * Leitura com cópia local (offline-first).
 *
 * `aplicativo-mobile.md` define o SQLite como "fonte de dados operacional das
 * inspeções disponíveis offline" e o MVP exige "abrir uma inspeção offline"
 * (§13.12). Toda leitura bem-sucedida fica guardada em `read_cache`; quando a
 * rede falha (sem conexão ou tempo esgotado), a última cópia responde. Erros do
 * servidor (4xx/5xx) não são mascarados: eles dizem algo que a cópia não sabe.
 */

import { CLIENT_ERROR_CODES, toApiError } from '@/models';

import { buildQueryString, type ApiClient, type RequestOptions } from './api-client';
import { readCachedResponse, saveCachedResponse } from './local-db';

const OFFLINE_CODES = new Set<string>([
  CLIENT_ERROR_CODES.NETWORK_UNAVAILABLE,
  CLIENT_ERROR_CODES.TIMEOUT,
]);

function cacheKey(path: string, query: RequestOptions['query']): string {
  return `${path}${buildQueryString(query)}`;
}

export async function cachedGet<T>(
  client: ApiClient,
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  const key = cacheKey(path, options.query);

  let value: T;
  try {
    value = await client.get<T>(path, options);
  } catch (thrown) {
    if (OFFLINE_CODES.has(toApiError(thrown).code)) {
      const cached = await readCachedResponse<T>(key).catch(() => null);
      if (cached !== null) return cached;
    }
    throw thrown;
  }

  // Guardar é melhor esforço: falha local não pode derrubar uma leitura que deu certo.
  await saveCachedResponse(key, value).catch(() => undefined);
  return value;
}
