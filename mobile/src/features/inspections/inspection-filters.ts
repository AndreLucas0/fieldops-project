/**
 * Filtros da lista de inspeções (FE-M03).
 *
 * A filtragem é feita sobre a lista já carregada: a busca traz as inspeções do
 * técnico de uma vez, e trocar um chip não pode custar uma ida à rede — em
 * campo, a conexão é o recurso escasso.
 */

import { calendarDaysBetween, parseIsoDate } from '@/components';
import type { Inspection, InspectionPriority, InspectionStatus } from '@/models';

import { OPEN_STATUSES } from './use-inspections';

export type PeriodKey = 'overdue' | 'today' | 'week' | 'month';

export interface InspectionFilters {
  /** Vazio significa "todos os estados", não "nenhum". */
  statuses: InspectionStatus[];
  priorities: InspectionPriority[];
  period: PeriodKey | null;
}

export const EMPTY_FILTERS: InspectionFilters = {
  statuses: [],
  priorities: [],
  period: null,
};

export const PERIOD_LABELS: Record<PeriodKey, string> = {
  overdue: 'Atrasadas',
  today: 'Hoje',
  week: 'Próximos 7 dias',
  month: 'Este mês',
};

/** Ordem dos chips de estado — a mesma do fluxo da inspeção. */
export const FILTERABLE_STATUSES: readonly InspectionStatus[] = [
  'ASSIGNED',
  'IN_PROGRESS',
  'SUBMITTED',
  'UNDER_REVIEW',
  'APPROVED',
  'REJECTED',
  'CANCELED',
];

export const FILTERABLE_PRIORITIES: readonly InspectionPriority[] = [
  'CRITICAL',
  'HIGH',
  'MEDIUM',
  'LOW',
];

export function hasActiveFilters(filters: InspectionFilters): boolean {
  return (
    filters.statuses.length > 0 || filters.priorities.length > 0 || filters.period !== null
  );
}

export function countActiveFilters(filters: InspectionFilters): number {
  return filters.statuses.length + filters.priorities.length + (filters.period ? 1 : 0);
}

/** Liga/desliga um valor de um filtro de múltipla escolha. */
export function toggleValue<T>(values: readonly T[], value: T): T[] {
  return values.includes(value)
    ? values.filter((entry) => entry !== value)
    : [...values, value];
}

function matchesPeriod(inspection: Inspection, period: PeriodKey, now: Date): boolean {
  const scheduled = parseIsoDate(inspection.scheduledFor);
  if (!scheduled) return false;

  const days = calendarDaysBetween(now, scheduled);

  switch (period) {
    case 'overdue':
      // Atrasada exige trabalho pendente: uma inspeção aprovada no mês passado
      // não é uma pendência.
      return scheduled.getTime() < now.getTime() && OPEN_STATUSES.includes(inspection.status);
    case 'today':
      return days === 0;
    case 'week':
      return days >= 0 && days <= 7;
    case 'month':
      return (
        scheduled.getFullYear() === now.getFullYear() && scheduled.getMonth() === now.getMonth()
      );
    default:
      return true;
  }
}

/**
 * Aplica os filtros. Dentro de um mesmo filtro os valores são alternativas
 * (estado A **ou** B); entre filtros diferentes, condições somadas (estado A
 * **e** prioridade alta).
 */
export function filterInspections(
  inspections: readonly Inspection[],
  filters: InspectionFilters,
  now: Date = new Date(),
): Inspection[] {
  return inspections.filter((inspection) => {
    if (filters.statuses.length > 0 && !filters.statuses.includes(inspection.status)) {
      return false;
    }
    if (filters.priorities.length > 0 && !filters.priorities.includes(inspection.priority)) {
      return false;
    }
    if (filters.period && !matchesPeriod(inspection, filters.period, now)) {
      return false;
    }
    return true;
  });
}

/** Mais urgente primeiro; empate, o que vence antes. */
const PRIORITY_WEIGHT: Record<InspectionPriority, number> = {
  CRITICAL: 0,
  HIGH: 1,
  MEDIUM: 2,
  LOW: 3,
};

export function sortInspections(inspections: readonly Inspection[]): Inspection[] {
  return [...inspections].sort((a, b) => {
    const byPriority = PRIORITY_WEIGHT[a.priority] - PRIORITY_WEIGHT[b.priority];
    if (byPriority !== 0) return byPriority;
    return a.scheduledFor.localeCompare(b.scheduledFor);
  });
}
