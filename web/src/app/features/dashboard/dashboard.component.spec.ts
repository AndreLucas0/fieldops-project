import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { provideZonelessChangeDetection } from '@angular/core';
import { of, throwError } from 'rxjs';

import { resetMockStore } from '@fieldops/shared';

import { ApiError } from '../../core/models/api-error.model';
import { provideResources } from '../../core/core.providers';
import { DashboardService } from '../../core/services/resources';
import { MOCK_LATENCY_MS } from '../../core/mocks/mock-services';
import { DashboardComponent } from './dashboard.component';

/**
 * FE-W02 — Painel.
 *
 * Os números vêm do conjunto fictício compartilhado, o mesmo do aplicativo:
 * conferir contra ele garante que a tela mostra o que a API mostraria.
 */
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

  function texto(fixture: ReturnType<typeof setup>): string {
    return (fixture.nativeElement as HTMLElement).textContent ?? '';
  }

  it('exibe os sete indicadores do resumo', () => {
    const fixture = setup();

    const tiles = (fixture.nativeElement as HTMLElement).querySelectorAll('app-stat-tile');
    expect(tiles).toHaveLength(7);

    const conteudo = texto(fixture);
    for (const rotulo of [
      'Total de inspeções',
      'Em andamento',
      'Aguardando revisão',
      'Atrasadas',
      'Aprovadas',
      'Reprovadas',
      'Não conformidades abertas',
    ]) {
      expect(conteudo).toContain(rotulo);
    }
  });

  it('os números batem com o conjunto fictício', () => {
    const fixture = setup();
    const valores = Array.from(
      (fixture.nativeElement as HTMLElement).querySelectorAll('.tile__number'),
    ).map((el) => el.textContent?.trim());

    // 6 inspeções: 1 em andamento, 1 aguardando revisão, 1 atrasada,
    // 1 aprovada, 1 reprovada; 3 não conformidades abertas.
    expect(valores).toEqual(['6', '1', '1', '1', '1', '1', '3']);
  });

  it('desenha uma barra por estado presente, na ordem do ciclo de vida', () => {
    const fixture = setup();
    const primeiroGrafico = (fixture.nativeElement as HTMLElement).querySelector(
      'app-category-bar-chart',
    )!;

    const etiquetas = Array.from(primeiroGrafico.querySelectorAll('.fo-badge')).map((el) =>
      el.textContent?.trim(),
    );

    expect(etiquetas).toEqual([
      'Atribuída',
      'Em andamento',
      'Enviada',
      'Em revisão',
      'Aprovada',
      'Reprovada',
    ]);
  });

  it('a barra mais longa ocupa a faixa inteira e as demais são proporcionais', () => {
    const fixture = setup();
    const larguras = Array.from(
      (fixture.nativeElement as HTMLElement).querySelectorAll('.row__fill'),
    ).map((el) => (el as HTMLElement).style.width);

    // Todas as contagens são 1 no conjunto semeado, então todas ficam cheias.
    expect(larguras.every((largura) => largura === '100%')).toBe(true);
  });

  it('mostra as criticidades das não conformidades', () => {
    const fixture = setup();
    const graficos = (fixture.nativeElement as HTMLElement).querySelectorAll(
      'app-category-bar-chart',
    );

    expect(graficos).toHaveLength(2);
    const severidades = Array.from(graficos[1].querySelectorAll('.fo-badge')).map((el) =>
      el.textContent?.trim(),
    );

    // Da menos para a mais grave, só as presentes.
    expect(severidades).toEqual(['Baixa', 'Alta', 'Crítica']);
  });

  it('cada valor é rotulado na ponta da barra, sem depender da dica de mouse', () => {
    const fixture = setup();
    const valores = Array.from(
      (fixture.nativeElement as HTMLElement).querySelectorAll('.row__value'),
    );

    expect(valores.length).toBeGreaterThan(0);
    expect(valores.every((el) => (el.textContent ?? '').trim().length > 0)).toBe(true);
  });

  describe('estados de carga', () => {
    it('mostra o esqueleto enquanto as três chamadas não voltam', () => {
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

      expect(
        (fixture.nativeElement as HTMLElement).querySelector('app-loading-state'),
      ).not.toBeNull();
      expect((fixture.nativeElement as HTMLElement).querySelector('app-stat-tile')).toBeNull();
    });

    it('uma falha em qualquer das três chamadas mostra o erro com nova tentativa', () => {
      const falha = {
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
        inspectionsByStatus: () => throwError(() => new Error('nao deveria importar')),
        nonConformitiesBySeverity: () => throwError(() => new Error('nao deveria importar')),
      };

      const fixture = setup([{ provide: DashboardService, useValue: falha }]);

      expect((fixture.nativeElement as HTMLElement).querySelector('app-empty-state')).not.toBeNull();
      expect(texto(fixture)).toContain('Erro interno');
      expect(texto(fixture)).toContain('Tentar novamente');
      // Nenhum número é exibido: meio painel levaria à conclusão errada.
      expect((fixture.nativeElement as HTMLElement).querySelector('app-stat-tile')).toBeNull();
    });

    it('mensagem genérica quando a falha não é do contrato', () => {
      const fixture = setup([
        {
          provide: DashboardService,
          useValue: {
            summary: () => throwError(() => new Error('rede caiu')),
            inspectionsByStatus: () => throwError(() => new Error('rede caiu')),
            nonConformitiesBySeverity: () => throwError(() => new Error('rede caiu')),
          },
        },
      ]);

      expect(texto(fixture)).toContain('Não foi possível falar com o servidor');
    });

    it('tentar novamente refaz a carga e mostra os números', () => {
      // Primeira carga falha, segunda responde: é o caminho do botão de
      // nova tentativa, que precisa refazer as três chamadas.
      let falhar = true;
      const serviceFalho = {
        summary: () =>
          falhar
            ? throwError(() => new Error('indisponível'))
            : of({ totalInspections: 6, inspectionsInProgress: 1 }),
        inspectionsByStatus: () => of([{ status: 'APPROVED', count: 1 }]),
        nonConformitiesBySeverity: () => of([{ severity: 'HIGH', count: 2 }]),
      };

      const fixture = setup([{ provide: DashboardService, useValue: serviceFalho }]);
      expect((fixture.nativeElement as HTMLElement).querySelector('app-empty-state')).not.toBeNull();

      falhar = false;
      const botao = (fixture.nativeElement as HTMLElement).querySelector(
        'app-empty-state button',
      ) as HTMLButtonElement;
      botao.click();
      fixture.detectChanges();

      expect((fixture.nativeElement as HTMLElement).querySelectorAll('app-stat-tile')).toHaveLength(
        7,
      );
      expect((fixture.nativeElement as HTMLElement).querySelector('app-empty-state')).toBeNull();
    });
  });

  describe('atalhos', () => {
    it('"Revisar pendentes" leva à lista filtrada por enviadas', () => {
      const fixture = setup();
      const router = TestBed.inject(Router);
      const navigate = vi.spyOn(router, 'navigate').mockResolvedValue(true);

      const botao = Array.from(
        (fixture.nativeElement as HTMLElement).querySelectorAll('button'),
      ).find((el) => el.textContent?.includes('Revisar pendentes'))!;
      botao.click();

      expect(navigate).toHaveBeenCalledWith(['/inspections'], {
        queryParams: { status: 'SUBMITTED' },
      });
    });

    it('"Criar inspeção" aponta para a rota de agendamento', () => {
      const fixture = setup();
      const link = Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('a')).find(
        (el) => el.textContent?.includes('Criar inspeção'),
      )!;

      expect(link.getAttribute('href')).toBe('/inspections/new');
    });
  });
});
