/**
 * Paginação, ordenação e filtro do backend fictício.
 *
 * Reproduz o comportamento do contrato (§9): `page` base 0, `size` entre 1 e
 * 100, `sort` no formato `campo,direção`. Sem isto o mock devolveria listas
 * inteiras e a tela nunca exercitaria o paginador.
 */

import type { Page, PageQuery } from '../domain';

export const PAGE_DEFAULTS = {
  page: 0,
  size: 20,
  minSize: 1,
  maxSize: 100,
} as const;

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/** Comparação estável para os tipos que aparecem nas listagens. */
function compareValues(left: unknown, right: unknown): number {
  if (left === right) return 0;
  // Ausente vai para o fim, independentemente da direção pedida.
  if (left == null) return 1;
  if (right == null) return -1;

  if (typeof left === 'number' && typeof right === 'number') return left - right;
  if (typeof left === 'boolean' && typeof right === 'boolean') {
    return Number(left) - Number(right);
  }

  return String(left).localeCompare(String(right), 'pt-BR');
}

/**
 * Ordena por `campo,direção`. Campo desconhecido é ignorado em vez de lançar:
 * o servidor real responderia 400, mas travar a tela de demonstração por causa
 * de um parâmetro de ordenação seria pior que devolver a ordem natural.
 */
export function applySort<T>(items: readonly T[], sort: string | undefined): T[] {
  const result = [...items];
  if (!sort) return result;

  const [field, direction = 'asc'] = sort.split(',');
  if (!field) return result;

  const factor = direction.trim().toLowerCase() === 'desc' ? -1 : 1;

  return result.sort(
    (left, right) =>
      factor *
      compareValues(
        (left as Record<string, unknown>)[field],
        (right as Record<string, unknown>)[field],
      ),
  );
}

export function paginate<T>(items: readonly T[], query: PageQuery = {}): Page<T> {
  const size = clamp(
    Math.trunc(query.size ?? PAGE_DEFAULTS.size),
    PAGE_DEFAULTS.minSize,
    PAGE_DEFAULTS.maxSize,
  );
  const sorted = applySort(items, query.sort);
  const totalElements = sorted.length;
  const totalPages = totalElements === 0 ? 0 : Math.ceil(totalElements / size);

  // Página além do fim devolve conteúdo vazio, como faria o servidor.
  const page = Math.max(0, Math.trunc(query.page ?? PAGE_DEFAULTS.page));
  const start = page * size;

  return {
    page,
    size,
    totalElements,
    totalPages,
    content: sorted.slice(start, start + size),
  };
}

/** Filtro que ignora critérios vazios — um campo em branco não filtra nada. */
export function matchesFilters<T extends Record<string, unknown>>(
  item: T,
  filters: Record<string, unknown>,
): boolean {
  return Object.entries(filters).every(([key, expected]) => {
    if (expected == null || expected === '') return true;

    const actual = item[key];

    if (Array.isArray(expected)) {
      return expected.length === 0 || expected.includes(actual as never);
    }

    // Texto casa por conteúdo, sem diferenciar caixa: é o que a pessoa espera
    // ao digitar num campo de busca.
    if (typeof expected === 'string' && typeof actual === 'string') {
      return actual.toLocaleLowerCase('pt-BR').includes(expected.toLocaleLowerCase('pt-BR'));
    }

    return actual === expected;
  });
}

/** Intervalo fechado de datas ISO; extremos ausentes não restringem. */
export function withinRange(
  value: string | null | undefined,
  from: string | undefined,
  to: string | undefined,
): boolean {
  if (!value) return !from && !to;
  if (from && value < from) return false;
  if (to && value > to) return false;
  return true;
}
