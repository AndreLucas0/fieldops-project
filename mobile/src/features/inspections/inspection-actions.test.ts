import type { InspectionReview, InspectionStatus } from '@/models';

import {
  isReadOnly,
  latestRejection,
  primaryAction,
  readItemsToCorrect,
} from './inspection-actions';

function buildReview(overrides: Partial<InspectionReview> = {}): InspectionReview {
  return {
    id: 'rev-1',
    inspectionId: 'insp-1',
    reviewerId: 'sup-1',
    decision: 'REJECTED',
    reviewedAt: '2026-08-10T10:00:00Z',
    reviewCycle: 1,
    createdAt: '2026-08-10T10:00:00Z',
    ...overrides,
  };
}

describe('primaryAction', () => {
  it('oferece a ação certa nos estados de trabalho', () => {
    expect(primaryAction('ASSIGNED')?.action).toBe('start');
    expect(primaryAction('IN_PROGRESS')?.action).toBe('continue');
    expect(primaryAction('REJECTED')?.action).toBe('fix');
  });

  it('não oferece ação nos estados finais (§17.1)', () => {
    const finais: InspectionStatus[] = [
      'SUBMITTED',
      'UNDER_REVIEW',
      'APPROVED',
      'CANCELED',
      'DRAFT',
    ];

    for (const status of finais) {
      expect(primaryAction(status)).toBeNull();
      expect(isReadOnly(status)).toBe(true);
    }
  });

  it('rotula as ações em português', () => {
    expect(primaryAction('ASSIGNED')?.label).toBe('Iniciar');
    expect(primaryAction('IN_PROGRESS')?.label).toBe('Continuar');
    expect(primaryAction('REJECTED')?.label).toBe('Corrigir');
  });
});

describe('latestRejection', () => {
  it('devolve nulo sem revisões', () => {
    expect(latestRejection(undefined)).toBeNull();
    expect(latestRejection([])).toBeNull();
  });

  it('ignora aprovações', () => {
    expect(latestRejection([buildReview({ decision: 'APPROVED' })])).toBeNull();
  });

  it('escolhe o ciclo mais recente', () => {
    const result = latestRejection([
      buildReview({ id: 'r1', reviewCycle: 1, reason: 'primeira' }),
      buildReview({ id: 'r2', reviewCycle: 3, reason: 'última' }),
      buildReview({ id: 'r3', reviewCycle: 2, reason: 'meio' }),
    ]);

    expect(result?.reason).toBe('última');
  });
});

describe('readItemsToCorrect', () => {
  it('devolve lista vazia quando o servidor não envia o campo', () => {
    expect(readItemsToCorrect(buildReview())).toEqual([]);
    expect(readItemsToCorrect(null)).toEqual([]);
  });

  it('lê o campo quando presente, descartando o que não for texto', () => {
    const review = {
      ...buildReview(),
      itemsToCorrect: ['item-1', 42, null, 'item-2'],
    } as unknown as InspectionReview;

    expect(readItemsToCorrect(review)).toEqual(['item-1', 'item-2']);
  });
});
