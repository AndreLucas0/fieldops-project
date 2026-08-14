/**
 * Descrição das colunas e dos eventos da tabela genérica.
 *
 * A tabela é burra de propósito: não busca dado, não guarda filtro e não
 * decide permissão. Ela recebe uma `Page<T>` pronta e devolve a intenção do
 * usuário; quem chama o `ApiService` é a tela.
 */

import type { BadgeContext } from '../status-badge/status-catalog';

/**
 * - `text`: valor cru, ou `format()` quando definido
 * - `badge`: etiqueta traduzida por `StatusBadgeComponent`
 * - `date`: data e hora em `dd/MM/yyyy HH:mm`
 * - `link`: navega para a rota devolvida por `link()`
 * - `actions`: menu de ações da linha
 */
export type ColumnType = 'text' | 'badge' | 'date' | 'link' | 'actions';

export type ColumnAlign = 'start' | 'center' | 'end';

/** Ação exibida no menu da linha. */
export interface RowAction<T> {
  /** Identificador devolvido em `rowAction`. */
  id: string;
  label: string;
  /** Nome do ícone Material (opcional). */
  icon?: string;
  /** Destaca em vermelho — exclusões e cancelamentos. */
  danger?: boolean;
  /**
   * Ação visível mas indisponível para esta linha (ex.: aprovar uma inspeção
   * que não está em revisão). Preferir a `visible` quando o usuário deve
   * entender que a ação existe.
   */
  disabled?: (row: T) => boolean;
  /** Oculta a ação para esta linha — use para regra de perfil. */
  visible?: (row: T) => boolean;
}

export interface TableColumn<T> {
  /**
   * Caminho do campo na linha. Aceita navegação por ponto (`site.name`).
   * Também identifica a coluna na ordenação enviada à API.
   */
  field: string;
  label: string;
  /** Padrão: `text`. */
  type?: ColumnType;
  /** Habilita o cabeçalho clicável; a ordenação em si é feita pelo servidor. */
  sortable?: boolean;
  /** Obrigatório quando `type` é `badge`. */
  badgeContext?: BadgeContext;
  /** Obrigatório quando `type` é `link`. Devolve `routerLink`. */
  link?: (row: T) => string | unknown[];
  /** Obrigatório quando `type` é `actions`. */
  actions?: readonly RowAction<T>[];
  /** Formatação livre do valor; recebe o valor cru e a linha inteira. */
  format?: (value: unknown, row: T) => string;
  align?: ColumnAlign;
  /** Largura CSS fixa (ex.: `'8rem'`). Sem valor, a coluna se ajusta. */
  width?: string;
  /** Texto para valor nulo ou vazio. Padrão: travessão. */
  emptyText?: string;
}

/**
 * Filtro em vigor, exibido como etiqueta removível acima da tabela.
 * `label` e `value` já vêm prontos para leitura ("Situação: Ativo").
 */
export interface ActiveFilter {
  key: string;
  label: string;
  value: string;
}

export interface RowActionEvent<T> {
  /** `RowAction.id` escolhido. */
  action: string;
  row: T;
}

/** Formato de data e hora das listagens administrativas. */
export const TABLE_DATE_FORMAT = 'dd/MM/yyyy HH:mm';

/** Texto padrão de célula sem valor. */
export const EMPTY_CELL = '—';

/**
 * Lê `field` da linha, aceitando caminho com ponto. Caminho inexistente
 * devolve `undefined` em vez de lançar — uma coluna mal configurada não pode
 * derrubar a listagem inteira.
 */
export function resolveFieldValue(row: unknown, field: string): unknown {
  if (row == null) return undefined;

  return field.split('.').reduce<unknown>((value, segment) => {
    if (value == null || typeof value !== 'object') return undefined;
    return (value as Record<string, unknown>)[segment];
  }, row);
}
