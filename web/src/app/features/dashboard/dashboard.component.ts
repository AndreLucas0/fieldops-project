import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { catchError, finalize, forkJoin, of } from 'rxjs';

import { DashboardService } from '../../core/services/resources';
import { isApiError } from '../../core/models/api-error.model';
import type { DashboardSummary, SeverityCount, StatusCount } from '../../core/models/domain';
import {
  EmptyStateComponent,
  LoadingStateComponent,
  PageHeaderComponent,
} from '../../shared/components';
import { CategoryBarChartComponent } from './category-bar-chart.component';
import { StatTileComponent, type StatTone } from './stat-tile.component';

interface StatDescriptor {
  key: keyof DashboardSummary;
  label: string;
  icon: string;
  tone: StatTone;
}

/**
 * Ordem dos cartões: primeiro o total, depois o que exige ação (em andamento,
 * aguardando revisão, atrasadas), por fim o que já foi decidido.
 *
 * O tom só aparece onde o número tem significado de estado — atraso e
 * reprovação pedem atenção, "total" não pede nada. Cada tom vem acompanhado de
 * ícone e rótulo, que é o que impede a informação de depender só da cor.
 */
const STATS: readonly StatDescriptor[] = [
  { key: 'totalInspections', label: 'Total de inspeções', icon: 'assignment', tone: 'neutral' },
  { key: 'inspectionsInProgress', label: 'Em andamento', icon: 'pending_actions', tone: 'neutral' },
  { key: 'inspectionsPendingReview', label: 'Aguardando revisão', icon: 'rate_review', tone: 'warning' },
  { key: 'inspectionsOverdue', label: 'Atrasadas', icon: 'schedule', tone: 'critical' },
  { key: 'inspectionsApproved', label: 'Aprovadas', icon: 'check_circle', tone: 'good' },
  { key: 'inspectionsRejected', label: 'Reprovadas', icon: 'cancel', tone: 'serious' },
  { key: 'nonConformitiesOpen', label: 'Não conformidades abertas', icon: 'report_problem', tone: 'serious' },
];

/** Ordem do ciclo de vida — a posição da barra conta a sequência do processo. */
const STATUS_ORDER = [
  'DRAFT',
  'ASSIGNED',
  'IN_PROGRESS',
  'SUBMITTED',
  'UNDER_REVIEW',
  'APPROVED',
  'REJECTED',
  'CANCELED',
] as const;

/** Criticidade da menos para a mais grave. */
const SEVERITY_ORDER = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] as const;

interface DashboardData {
  summary: DashboardSummary;
  byStatus: StatusCount[];
  bySeverity: SeverityCount[];
}

/**
 * FE-W02 — Painel.
 *
 * Reúne os três indicadores de `docs/telas-frontend.md` §3.2 numa carga só: as
 * três consultas saem em paralelo e a tela espera o conjunto. Uma falha isolada
 * derruba a carga inteira de propósito — um painel com dois terços dos números
 * levaria a conclusão errada com a mesma cara de completo.
 */
@Component({
  selector: 'app-dashboard',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterLink,
    MatButtonModule,
    MatIconModule,
    PageHeaderComponent,
    LoadingStateComponent,
    EmptyStateComponent,
    StatTileComponent,
    CategoryBarChartComponent,
  ],
  template: `
    <div class="page">
      <app-page-header
        title="Painel"
        subtitle="Visão geral das inspeções e não conformidades."
      >
        <div actions class="actions">
          <button matButton="outlined" type="button" (click)="reviewPending()">
            <mat-icon>rate_review</mat-icon>
            Revisar pendentes
          </button>

          <a matButton="filled" routerLink="/inspections/new">
            <mat-icon>add</mat-icon>
            Criar inspeção
          </a>
        </div>
      </app-page-header>

      @if (loading()) {
        <app-loading-state variant="card" [rows]="4" label="Carregando indicadores…" />
      } @else if (error()) {
        <app-empty-state
          icon="cloud_off"
          title="Não foi possível carregar o painel"
          [message]="error()!"
          actionLabel="Tentar novamente"
          actionIcon="refresh"
          (action)="load()"
        />
      } @else if (data(); as loaded) {
        <section class="stats" aria-label="Indicadores gerais">
          @for (stat of stats; track stat.key) {
            <app-stat-tile
              [label]="stat.label"
              [value]="loaded.summary[stat.key]"
              [icon]="stat.icon"
              [tone]="stat.tone"
            />
          }
        </section>

        <section class="charts">
          <app-category-bar-chart
            title="Inspeções por estado"
            caption="Na ordem do ciclo de vida."
            context="inspection"
            [data]="statusData()"
            [order]="statusOrder"
            emptyMessage="Nenhuma inspeção cadastrada."
          />

          <app-category-bar-chart
            title="Não conformidades por criticidade"
            caption="Da menos para a mais grave."
            context="severity"
            [data]="severityData()"
            [order]="severityOrder"
            emptyMessage="Nenhuma não conformidade registrada."
          />
        </section>
      }
    </div>
  `,
  styles: `
    :host {
      display: block;
    }

    .page {
      display: flex;
      flex-direction: column;
      gap: 1.5rem;
      max-width: 76rem;
      margin: 0 auto;
      padding: 1.5rem;
    }

    .actions {
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem;
    }

    .stats {
      display: grid;
      /* Item de flex recebe min-width: auto e pode ficar maior que o container
         quando há uma coluna só, estourando a página na horizontal. */
      min-width: 0;
      /* Sete cartões. A largura mínima maior fecha em 4 colunas no monitor
         largo (4 + 3), que lê melhor que 5 + 2, e desce para 3, 2 e 1 conforme
         a janela encolhe. */
      grid-template-columns: repeat(auto-fill, minmax(min(15rem, 100%), 1fr));
      gap: 0.875rem;
    }

    .charts {
      display: grid;
      min-width: 0;
      grid-template-columns: repeat(auto-fit, minmax(min(21rem, 100%), 1fr));
      gap: 1rem;
      align-items: start;
    }
  `,
})
export class DashboardComponent {
  private readonly dashboard = inject(DashboardService);
  private readonly router = inject(Router);

  protected readonly stats = STATS;
  protected readonly statusOrder = STATUS_ORDER;
  protected readonly severityOrder = SEVERITY_ORDER;

  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly data = signal<DashboardData | null>(null);

  /* O gráfico fala em `key`; o contrato devolve `status` e `severity`. A
     adaptação é feita aqui, e não na resposta, para o estado guardado continuar
     sendo exatamente o que a API entregou. */
  protected readonly statusData = computed(
    () => this.data()?.byStatus.map((entry) => ({ key: entry.status, count: entry.count })) ?? [],
  );

  protected readonly severityData = computed(
    () =>
      this.data()?.bySeverity.map((entry) => ({ key: entry.severity, count: entry.count })) ?? [],
  );

  constructor() {
    this.load();
  }

  protected load(): void {
    this.loading.set(true);
    this.error.set(null);

    forkJoin({
      summary: this.dashboard.summary(),
      byStatus: this.dashboard.inspectionsByStatus(),
      bySeverity: this.dashboard.nonConformitiesBySeverity(),
    })
      .pipe(
        catchError((thrown: unknown) => {
          // O interceptador já avisou o usuário; aqui a mensagem fica na tela,
          // junto do botão que refaz a carga.
          this.error.set(
            isApiError(thrown)
              ? thrown.userMessage
              : 'Não foi possível falar com o servidor. Tente novamente.',
          );
          this.data.set(null);
          return of(null);
        }),
        finalize(() => this.loading.set(false)),
      )
      .subscribe((result) => {
        if (result) this.data.set(result);
      });
  }

  /** Atalho para a lista já filtrada pelo que espera revisão (FE-W18). */
  protected reviewPending(): void {
    void this.router.navigate(['/inspections'], { queryParams: { status: 'SUBMITTED' } });
  }
}
