import type { Inspection, InspectionStatus } from '../../core/models/domain';

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Estados em que o prazo ainda corre: a inspeção foi planejada, mas o técnico
 * ainda não a enviou. Depois de `SUBMITTED` o atraso deixa de ser do técnico.
 *
 * ATENÇÃO: definição assumida. Conferir com o filtro `overdue` do backend e
 * com a TS-14-03 (mobile) para a web e o app falarem a mesma língua.
 */
const OVERDUE_STATUSES: ReadonlySet<InspectionStatus> = new Set<InspectionStatus>([
  'DRAFT',
  'ASSIGNED',
  'IN_PROGRESS',
]);

/**
 * Dias de atraso da inspeção, ou `null` quando ela não está atrasada.
 * `0` significa atrasada há menos de um dia.
 */
export function overdueDays(
  inspection: Pick<Inspection, 'status' | 'scheduledFor'>,
  now: Date = new Date(),
): number | null {
  if (!OVERDUE_STATUSES.has(inspection.status)) return null;

  const scheduled = new Date(inspection.scheduledFor).getTime();
  if (Number.isNaN(scheduled) || scheduled >= now.getTime()) return null;

  return Math.floor((now.getTime() - scheduled) / DAY_MS);
}

/** Texto da coluna "Prazo": vazio (`—`) quando a inspeção não está atrasada. */
export function overdueLabel(
  inspection: Pick<Inspection, 'status' | 'scheduledFor'>,
  now: Date = new Date(),
): string {
  const days = overdueDays(inspection, now);
  if (days === null) return '—';
  if (days === 0) return '⚠ Atrasada';
  return `⚠ Atrasada há ${days} ${days === 1 ? 'dia' : 'dias'}`;
}
