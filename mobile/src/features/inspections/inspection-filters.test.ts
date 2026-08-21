import type { Inspection } from '@/models';

import {
  EMPTY_FILTERS,
  countActiveFilters,
  filterInspections,
  hasActiveFilters,
  sortInspections,
  toggleValue,
} from './inspection-filters';

const NOW = new Date('2026-08-14T12:00:00');

function buildInspection(overrides: Partial<Inspection> = {}): Inspection {
  return {
    id: 'i-1',
    templateVersionId: 'tv-1',
    clientId: 'c-1',
    siteId: 's-1',
    technicianId: 't-1',
    priority: 'MEDIUM',
    status: 'ASSIGNED',
    scheduledFor: '2026-08-14T15:00:00',
    createdAt: '2026-08-01T10:00:00Z',
    updatedAt: '2026-08-01T10:00:00Z',
    version: 1,
    ...overrides,
  };
}

const HOJE = buildInspection({ id: 'hoje', scheduledFor: '2026-08-14T15:00:00' });
const ATRASADA = buildInspection({
  id: 'atrasada',
  scheduledFor: '2026-08-13T08:00:00',
  status: 'IN_PROGRESS',
});
const APROVADA_ANTIGA = buildInspection({
  id: 'aprovada',
  scheduledFor: '2026-08-02T08:00:00',
  status: 'APPROVED',
});
const PROXIMA_SEMANA = buildInspection({
  id: 'semana',
  scheduledFor: '2026-08-19T08:00:00',
  priority: 'CRITICAL',
});
const MES_QUE_VEM = buildInspection({
  id: 'setembro',
  scheduledFor: '2026-09-03T08:00:00',
  priority: 'LOW',
});

const TODAS = [HOJE, ATRASADA, APROVADA_ANTIGA, PROXIMA_SEMANA, MES_QUE_VEM];

function ids(inspections: readonly Inspection[]): string[] {
  return inspections.map((inspection) => inspection.id);
}

describe('filterInspections', () => {
  it('sem filtro devolve tudo', () => {
    expect(filterInspections(TODAS, EMPTY_FILTERS, NOW)).toHaveLength(TODAS.length);
  });

  it('filtra por estado, tratando os valores como alternativas', () => {
    const result = filterInspections(
      TODAS,
      { ...EMPTY_FILTERS, statuses: ['IN_PROGRESS', 'APPROVED'] },
      NOW,
    );

    expect(ids(result)).toEqual(['atrasada', 'aprovada']);
  });

  it('filtra por prioridade', () => {
    const result = filterInspections(TODAS, { ...EMPTY_FILTERS, priorities: ['CRITICAL'] }, NOW);

    expect(ids(result)).toEqual(['semana']);
  });

  it('soma condições de filtros diferentes', () => {
    const result = filterInspections(
      TODAS,
      { ...EMPTY_FILTERS, statuses: ['ASSIGNED'], priorities: ['LOW'] },
      NOW,
    );

    expect(ids(result)).toEqual(['setembro']);
  });

  it('período "hoje" usa dia de calendário', () => {
    const result = filterInspections(TODAS, { ...EMPTY_FILTERS, period: 'today' }, NOW);

    expect(ids(result)).toEqual(['hoje']);
  });

  it('período "atrasadas" ignora o que já foi concluído', () => {
    const result = filterInspections(TODAS, { ...EMPTY_FILTERS, period: 'overdue' }, NOW);

    // A aprovada também está no passado, mas não é pendência.
    expect(ids(result)).toEqual(['atrasada']);
  });

  it('período "próximos 7 dias" inclui hoje e exclui o mês seguinte', () => {
    const result = filterInspections(TODAS, { ...EMPTY_FILTERS, period: 'week' }, NOW);

    expect(ids(result)).toEqual(['hoje', 'semana']);
  });

  it('período "este mês" usa o mês do calendário', () => {
    const result = filterInspections(TODAS, { ...EMPTY_FILTERS, period: 'month' }, NOW);

    expect(ids(result)).toEqual(['hoje', 'atrasada', 'aprovada', 'semana']);
  });

  it('data inválida não entra em nenhum período', () => {
    const quebrada = buildInspection({ id: 'quebrada', scheduledFor: 'não é data' });

    expect(filterInspections([quebrada], { ...EMPTY_FILTERS, period: 'today' }, NOW)).toEqual([]);
  });
});

describe('sortInspections', () => {
  it('ordena por urgência e depois por data', () => {
    const result = sortInspections(TODAS);

    expect(ids(result)[0]).toBe('semana');
    // Entre as de prioridade média, a mais antiga primeiro.
    expect(ids(result).slice(1, 4)).toEqual(['aprovada', 'atrasada', 'hoje']);
  });

  it('não altera o array recebido', () => {
    const original = [...TODAS];
    sortInspections(TODAS);

    expect(TODAS).toEqual(original);
  });
});

describe('toggleValue', () => {
  it('adiciona e remove', () => {
    expect(toggleValue([], 'A')).toEqual(['A']);
    expect(toggleValue(['A', 'B'], 'A')).toEqual(['B']);
  });
});

describe('hasActiveFilters / countActiveFilters', () => {
  it('reconhece a ausência de filtro', () => {
    expect(hasActiveFilters(EMPTY_FILTERS)).toBe(false);
    expect(countActiveFilters(EMPTY_FILTERS)).toBe(0);
  });

  it('conta cada valor selecionado', () => {
    const filters = {
      statuses: ['ASSIGNED' as const, 'APPROVED' as const],
      priorities: ['HIGH' as const],
      period: 'today' as const,
    };

    expect(hasActiveFilters(filters)).toBe(true);
    expect(countActiveFilters(filters)).toBe(4);
  });
});
