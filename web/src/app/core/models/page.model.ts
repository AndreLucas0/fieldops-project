/**
 * Paginação, filtros e ordenação — contrato-backend-frontend.md §9.
 *
 * Envelope da API (§9.2):
 * `{ page, size, totalElements, totalPages, content }`
 */

export type SortDirection = 'asc' | 'desc';

export interface Sort {
  field: string;
  direction: SortDirection;
}

/**
 * Valores aceitos em query string. `Date` vira ISO 8601 e `Sort` vira
 * `campo,direção`.
 *
 * `Sort` faz parte da união porque `PageQuery` intersecta `PageParams` com os
 * filtros do recurso: sem isso, o `sort` tipado colidiria com a assinatura de
 * índice dos filtros.
 */
export type QueryValue =
  | string
  | number
  | boolean
  | Date
  | Sort
  | null
  | undefined
  | readonly (string | number | boolean)[]
  | readonly Sort[];

export type QueryParams = Readonly<Record<string, QueryValue>>;

/** Limites de `size`/`page` definidos em §9.1. */
export const PAGE_DEFAULTS = {
  page: 0,
  size: 20,
  minPage: 0,
  minSize: 1,
  maxSize: 100,
} as const;

export interface PageParams {
  /** Base 0. */
  page?: number;
  /** 1..100. */
  size?: number;
  /** `'createdAt,desc'`, `{ field, direction }` ou uma lista de ordenações. */
  sort?: string | Sort | readonly Sort[];
}

/**
 * Consulta paginada com filtros tipados por recurso.
 *
 * ```ts
 * type UserFilters = { name?: string; role?: UserRole; status?: UserStatus };
 * api.getPage<User>('/users', { page: 0, size: 20, role: 'ADMIN' } satisfies PageQuery<UserFilters>);
 * ```
 */
export type PageQuery<TFilters extends QueryParams = QueryParams> = PageParams & TFilters;

export interface Page<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  /** Página atual, base 0. */
  page: number;
  size: number;
  /**
   * A API não devolve a ordenação no envelope (§9.2) — o campo existe para o
   * cliente ecoar o `sort` que pediu, sem quebrar a leitura da resposta.
   */
  sort?: string;
}

/** Página vazia — evita `null` em estados iniciais de tabela. */
export function emptyPage<T>(size: number = PAGE_DEFAULTS.size): Page<T> {
  return { content: [], totalElements: 0, totalPages: 0, page: PAGE_DEFAULTS.page, size };
}

/** Normaliza `sort` para o formato aceito pela API: `campo,direção`. */
export function serializeSort(sort: PageParams['sort']): string | undefined {
  if (sort == null) return undefined;
  if (typeof sort === 'string') return sort || undefined;
  if (Array.isArray(sort)) {
    const parts = (sort as readonly Sort[]).map((entry) => `${entry.field},${entry.direction}`);
    return parts.length > 0 ? parts.join(';') : undefined;
  }
  const single = sort as Sort;
  return `${single.field},${single.direction}`;
}

/**
 * Mantém `page`/`size` dentro dos limites do contrato. Enviar fora da faixa
 * renderia `400` — corrigir aqui evita uma ida inútil ao servidor.
 */
export function clampPageParams(params: PageParams): PageParams {
  const clamped: PageParams = { ...params };

  if (clamped.page != null) {
    clamped.page = Math.max(PAGE_DEFAULTS.minPage, Math.trunc(clamped.page));
  }
  if (clamped.size != null) {
    const size = Math.trunc(clamped.size);
    clamped.size = Math.min(PAGE_DEFAULTS.maxSize, Math.max(PAGE_DEFAULTS.minSize, size));
  }

  return clamped;
}
