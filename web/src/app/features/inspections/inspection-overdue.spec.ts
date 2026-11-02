import type { InspectionStatus } from '../../core/models/domain';
import { overdueDays, overdueLabel } from './inspection-overdue';

const NOW = new Date('2026-11-10T12:00:00Z');

function inspection(status: InspectionStatus, scheduledFor: string) {
  return { status, scheduledFor };
}

describe('inspection-overdue', () => {
  it('considera atrasada a inspeção em aberto com data no passado', () => {
    expect(overdueDays(inspection('ASSIGNED', '2026-11-07T12:00:00Z'), NOW)).toBe(3);
    expect(overdueDays(inspection('IN_PROGRESS', '2026-11-09T12:00:00Z'), NOW)).toBe(1);
    expect(overdueDays(inspection('DRAFT', '2026-11-01T12:00:00Z'), NOW)).toBe(9);
  });

  it('não considera atrasada a inspeção com data futura ou no mesmo instante', () => {
    expect(overdueDays(inspection('ASSIGNED', '2026-11-11T12:00:00Z'), NOW)).toBeNull();
    expect(overdueDays(inspection('ASSIGNED', '2026-11-10T12:00:00Z'), NOW)).toBeNull();
  });

  it('não considera atrasada a inspeção já enviada, revisada ou cancelada', () => {
    for (const status of [
      'SUBMITTED',
      'UNDER_REVIEW',
      'APPROVED',
      'REJECTED',
      'CANCELED',
    ] as const) {
      expect(overdueDays(inspection(status, '2026-10-01T12:00:00Z'), NOW)).toBeNull();
    }
  });

  it('devolve zero dia quando o atraso é menor que 24 horas', () => {
    expect(overdueDays(inspection('ASSIGNED', '2026-11-10T08:00:00Z'), NOW)).toBe(0);
  });

  it('ignora data inválida', () => {
    expect(overdueDays(inspection('ASSIGNED', 'não-é-data'), NOW)).toBeNull();
  });

  it('escreve o rótulo no singular, no plural e sem dias', () => {
    expect(overdueLabel(inspection('ASSIGNED', '2026-11-09T12:00:00Z'), NOW)).toBe(
      '⚠ Atrasada há 1 dia',
    );
    expect(overdueLabel(inspection('ASSIGNED', '2026-11-07T12:00:00Z'), NOW)).toBe(
      '⚠ Atrasada há 3 dias',
    );
    expect(overdueLabel(inspection('ASSIGNED', '2026-11-10T08:00:00Z'), NOW)).toBe('⚠ Atrasada');
  });

  it('mostra travessão quando não está atrasada', () => {
    expect(overdueLabel(inspection('APPROVED', '2026-10-01T12:00:00Z'), NOW)).toBe('—');
    expect(overdueLabel(inspection('ASSIGNED', '2026-12-01T12:00:00Z'), NOW)).toBe('—');
  });
});
