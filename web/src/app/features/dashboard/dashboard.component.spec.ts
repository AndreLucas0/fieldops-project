import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { provideZonelessChangeDetection } from '@angular/core';
import { of, throwError } from 'rxjs';

import { resetMockStore } from '@fieldops/shared';

import { ApiError } from '../../core/models/api-error.model';
import { provideResources } from '../../core/core.providers';
import type { Inspection } from '../../core/models/domain';
import type { Page } from '../../core/models/page.model';
import { DashboardService, InspectionsService } from '../../core/services/resources';
import { MOCK_LATENCY_MS } from '../../core/mocks/mock-services';
import { DashboardComponent } from './dashboard.component';

/**
 * FE-W02 — Painel operacional.
 *
 * A maior parte dos testes usa dados fixos injetados nos serviços: o painel
 * agrupa estados e escolhe quais números destacar, e conferir isso exige saber
 * exatamente o que entrou.
 */
const SUMMARY = { totalInspections: 8, inspectionsOverdue: 1, inspectionsPendingReview: 2 };

const BY_STATUS = [
  { status: 'DRAFT', count: 1 },
  { status: 'ASSIGNED', count: 1 },
  { status: 'IN_PROGRESS', count: 1 },
  { status: 'SUBMITTED', count: 1 },
  { status: 'UNDER_REVIEW', count: 1 },
  { status: 'APPROVED', count: 1 },
  { status: 'REJECTED', count: 1 },
  { status: 'CANCELED', count: 1 },
];

const BY_SEVERITY = [
  { severity: 'LOW', count: 1 },
  { severity: 'MEDIUM', count: 1 },
  { severity: 'HIGH', count: 1 },
  { severity: 'CRITICAL', count: 2 },
];

const SUBMITTED = {
  id: 'aaaaaaaa-0001',
  title: 'INS-2026-0412',
  clientId: 'client-x',
  technicianId: 'technician-x',
  status: 'SUBMITTED',
  priority: 'HIGH',
  scheduledFor: '2026-10-20T12:00:00Z',
} as Inspection;

const OVERDUE = {
  id: 'bbbbbbbb-0002',
  title: 'INS-2026-0413',
  clientId: 'client-x',
  technicianId: 'technician-x',
  status: 'IN_PROGRESS',
  priority: 'CRITICAL',
  scheduledFor: '2026-10-18T12:00:00Z',
} as Inspection;

function page(content: Inspection[]): Page<Inspection> {
  return { content, totalElements: content.length, totalPages: 1, page: 0, size: 5 };
}

function dashboardStub(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    provide: DashboardService,
    useValue: {
      summary: () => of(SUMMARY),
      inspectionsByStatus: () => of(BY_STATUS),
      nonConformitiesBySeverity: () => of(BY_SEVERITY),
      ...overrides,
    },
  };
}

function inspectionsStub(withItems = true) {
  return {
    provide: InspectionsService,
    useValue: {
      list: (query: { status?: string; overdue?: boolean }) =>
        of(
          page(
            !withItems
              ? []
              : query.overdue
                ? [OVERDUE]
                : query.status === 'SUBMITTED'
                  ? [SUBMITTED]
                  : [],
          ),
        ),
    },
  };
}

describe('DashboardComponent', () => {
  function setup(extraProviders: unknown[] = []) {
    resetMockStore();

    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        provideRouter([]),
        ...provideResources(true),
        { provide: MOCK_LATENCY_MS, useValue: 0 },
        ...(extraProviders as never[]),
      ],
    });

    const fixture = TestBed.createComponent(DashboardComponent);
    fixture.detectChanges();
    return fixture;
  }

  function withData(withItems = true) {
    return setup([dashboardStub(), inspectionsStub(withItems)]);
  }

  function root(fixture: ReturnType<typeof setup>): HTMLElement {
    return fixture.nativeElement as HTMLElement;
  }

  function texts(fixture: ReturnType<typeof setup>, selector: string): (string | undefined)[] {
    return Array.from(root(fixture).querySelectorAll(selector)).map((el) =>
      el.textContent?.trim(),
    );
  }

  it('exibe os quatro indicadores do protótipo', () => {
    const fixture = withData();

    expect(root(fixture).querySelectorAll('app-stat-tile')).toHaveLength(4);
    const content = root(fixture).textContent ?? '';
    for (const label of [
      'Total de inspeções',
      'Atrasadas',
      'Aguardando revisão',
      'NCs críticas',
    ]) {
      expect(content).toContain(label);
    }
  });

  it('mostra total, atrasadas, aguardando revisão e as NCs de criticidade crítica', () => {
    const fixture = withData();

    expect(texts(fixture, '.tile__number')).toEqual(['8', '1', '2', '2']);
  });

  it('agrupa os oito estados em seis barras, na ordem do ciclo de vida', () => {
    const fixture = withData();

    expect(texts(fixture, '.row__text')).toEqual([
      'Planejada',
      'Em andamento',
      'Aguardando revisão',
      'Aprovada',
      'Reprovada',
      'Cancelada',
    ]);
    expect(texts(fixture, '.row__value')).toEqual(['2', '1', '2', '1', '1', '1']);
  });

  it('a barra mais longa ocupa a faixa inteira e as demais são proporcionais', () => {
    const fixture = withData();
    const widths = Array.from(root(fixture).querySelectorAll('.row__fill')).map(
      (el) => (el as HTMLElement).style.width,
    );

    expect(widths).toEqual(['100%', '50%', '100%', '50%', '50%', '50%']);
  });

  it('cada valor é rotulado na ponta da barra, sem depender da dica de mouse', () => {
    const fixture = withData();

    const values = texts(fixture, '.row__value');
    expect(values.length).toBeGreaterThan(0);
    expect(values.every((value) => (value ?? '').length > 0)).toBe(true);
  });

  it('mostra as quatro criticidades com a contagem, inclusive as zeradas', () => {
    const fixture = setup([
      dashboardStub({ nonConformitiesBySeverity: () => of([{ severity: 'HIGH', count: 3 }]) }),
      inspectionsStub(),
    ]);

    expect(texts(fixture, '.severities .fo-badge')).toEqual(['Baixa', 'Média', 'Alta', 'Crítica']);
    expect(texts(fixture, '.severities__count')).toEqual(['0', '0', '3', '0']);
  });

  it('"Ver todas" leva às não conformidades', () => {
    const fixture = withData();
    const link = root(fixture).querySelector('.card__link') as HTMLAnchorElement;

    expect(link.textContent).toContain('Ver todas');
    expect(link.getAttribute('href')).toBe('/non-conformities');
  });

  it('lista as inspeções aguardando revisão com o atalho de revisão', () => {
    const fixture = withData();
    const link = Array.from(root(fixture).querySelectorAll('a')).find((el) =>
      el.textContent?.includes('Revisar →'),
    )!;

    expect(root(fixture).textContent).toContain('INS-2026-0412');
    expect(link.getAttribute('href')).toBe('/inspections/aaaaaaaa-0001/review');
  });

  it('lista as atrasadas com a data prevista, a prioridade e o estado', () => {
    const fixture = withData();
    const content = root(fixture).textContent ?? '';

    expect(content).toContain('INS-2026-0413');
    expect(content).toContain('Prevista para 18/10/2026');
    expect(content).toContain('Urgente');
    expect(content).toContain('Em andamento');
  });

  it('avisa quando não há inspeções nas listas', () => {
    const fixture = withData(false);
    const content = root(fixture).textContent ?? '';

    expect(content).toContain('Nenhuma inspeção aguardando revisão.');
    expect(content).toContain('Nenhuma inspeção atrasada.');
  });

  it('sem inspeções, o gráfico por estado mostra o estado vazio', () => {
    const fixture = setup([
      dashboardStub({ inspectionsByStatus: () => of([]) }),
      inspectionsStub(false),
    ]);

    expect(root(fixture).textContent).toContain('Nenhuma inspeção cadastrada.');
    expect(root(fixture).querySelectorAll('.row__fill')).toHaveLength(0);
  });

  describe('estados de carga', () => {
    it('mostra o esqueleto enquanto as chamadas não voltam', () => {
      resetMockStore();
      TestBed.configureTestingModule({
        providers: [
          provideZonelessChangeDetection(),
          provideRouter([]),
          ...provideResources(true),
          // Latência alta: a carga não conclui dentro do teste.
          { provide: MOCK_LATENCY_MS, useValue: 10_000 },
        ],
      });

      const fixture = TestBed.createComponent(DashboardComponent);
      fixture.detectChanges();

      expect(root(fixture).querySelector('app-loading-state')).not.toBeNull();
      expect(root(fixture).querySelector('app-stat-tile')).toBeNull();
    });

    it('uma falha em qualquer das chamadas mostra o erro com nova tentativa', () => {
      const fixture = setup([
        dashboardStub({
          summary: () =>
            throwError(
              () =>
                new ApiError({
                  kind: 'SERVER_ERROR',
                  status: 500,
                  code: 'SERVER_ERROR',
                  userMessage: 'Erro interno. Tente novamente em instantes.',
                }),
            ),
        }),
      ]);

      const content = root(fixture).textContent ?? '';
      expect(root(fixture).querySelector('app-empty-state')).not.toBeNull();
      expect(content).toContain('Erro interno');
      expect(content).toContain('Tentar novamente');
      // Nenhum número é exibido: meio painel levaria à conclusão errada.
      expect(root(fixture).querySelector('app-stat-tile')).toBeNull();
    });

    it('mensagem genérica quando a falha não é do contrato', () => {
      const fixture = setup([
        dashboardStub({ summary: () => throwError(() => new Error('rede caiu')) }),
      ]);

      expect(root(fixture).textContent).toContain('Não foi possível falar com o servidor');
    });

    it('tentar novamente refaz a carga e mostra os números', () => {
      let fail = true;
      const fixture = setup([
        dashboardStub({
          summary: () => (fail ? throwError(() => new Error('indisponível')) : of(SUMMARY)),
        }),
        inspectionsStub(),
      ]);
      expect(root(fixture).querySelector('app-empty-state')).not.toBeNull();

      fail = false;
      const button = root(fixture).querySelector('app-empty-state button') as HTMLButtonElement;
      button.click();
      fixture.detectChanges();

      expect(root(fixture).querySelectorAll('app-stat-tile')).toHaveLength(4);
      expect(root(fixture).querySelector('app-empty-state')).toBeNull();
    });
  });

  describe('atalhos', () => {
    it('"Revisar pendências" leva à lista filtrada por enviadas', () => {
      const fixture = withData();
      const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);

      const button = Array.from(root(fixture).querySelectorAll('button')).find((el) =>
        el.textContent?.includes('Revisar pendências'),
      )!;
      button.click();

      expect(navigate).toHaveBeenCalledWith(['/inspections'], {
        queryParams: { status: 'SUBMITTED' },
      });
    });

    it('"Nova inspeção" aponta para a rota de agendamento', () => {
      const fixture = withData();
      const link = Array.from(root(fixture).querySelectorAll('a')).find((el) =>
        el.textContent?.includes('Nova inspeção'),
      )!;

      expect(link.getAttribute('href')).toBe('/inspections/new');
    });
  });
});
