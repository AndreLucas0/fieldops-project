import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { catchError, finalize, forkJoin, of } from 'rxjs';

import { AuthStore } from '../../core/auth/auth.store';
import { canAccessRoute } from '../../core/auth/permissions';
import {
  ClientsService,
  DashboardService,
  InspectionsService,
  UsersService,
} from '../../core/services/resources';
import { isApiError } from '../../core/models/api-error.model';
import type {
  Client,
  DashboardSummary,
  Inspection,
  InspectionPriority,
  SeverityCount,
  StatusCount,
  User,
} from '../../core/models/domain';
import {
  EmptyStateComponent,
  LoadingStateComponent,
  PageHeaderComponent,
  StatusBadgeComponent,
} from '../../shared/components';
import { CategoryBarChartComponent, type CategoryDatum } from './category-bar-chart.component';
import { StatTileComponent, type StatTone } from './stat-tile.component';

/** Quantas inspeções cada lista do painel mostra. */
const LIST_SIZE = 5;

/**
 * O painel agrupa os oito estados do contrato em seis linhas: o que ainda não
 * começou (`DRAFT`, `ASSIGNED`) é "Planejada" e o que espera o revisor
 * (`SUBMITTED`, `UNDER_REVIEW`) é "Aguardando revisão".
 */
const STATUS_GROUPS: readonly { key: string; label: string; statuses: readonly string[] }[] = [
  { key: 'PLANNED', label: 'Planejada', statuses: ['DRAFT', 'ASSIGNED'] },
  { key: 'IN_PROGRESS', label: 'Em andamento', statuses: ['IN_PROGRESS'] },
  { key: 'REVIEW', label: 'Aguardando revisão', statuses: ['SUBMITTED', 'UNDER_REVIEW'] },
  { key: 'APPROVED', label: 'Aprovada', statuses: ['APPROVED'] },
  { key: 'REJECTED', label: 'Reprovada', statuses: ['REJECTED'] },
  { key: 'CANCELED', label: 'Cancelada', statuses: ['CANCELED'] },
];

const STATUS_ORDER = STATUS_GROUPS.map((group) => group.key);
const STATUS_LABELS: Readonly<Record<string, string>> = Object.fromEntries(
  STATUS_GROUPS.map((group) => [group.key, group.label]),
);

/** Criticidade da menos para a mais grave. */
const SEVERITY_ORDER = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] as const;

const PRIORITY_LABELS: Readonly<Record<InspectionPriority, string>> = {
  LOW: 'Baixa',
  MEDIUM: 'Média',
  HIGH: 'Alta',
  CRITICAL: 'Urgente',
};

interface DashboardData {
  summary: DashboardSummary;
  byStatus: StatusCount[];
  bySeverity: SeverityCount[];
  pendingReview: Inspection[];
  overdue: Inspection[];
}

interface StatTile {
  key: string;
  label: string;
  value: number | null | undefined;
  icon: string;
  tone: StatTone;
}

/**
 * FE-W02 — Painel operacional.
 *
 * Reúne indicadores, distribuição por estado, não conformidades e as duas
 * filas de atenção (aguardando revisão e atrasadas) numa carga só: as
 * consultas saem em paralelo e a tela espera o conjunto. Uma falha isolada
 * derruba a carga inteira de propósito — um painel com parte dos números
 * levaria a conclusão errada com a mesma cara de completo.
 *
 * Os nomes de cliente e técnico das listas chegam à parte e não bloqueiam a
 * tela: sem eles a linha mostra só o que já tem.
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
    StatusBadgeComponent,
    CategoryBarChartComponent,
  ],
  template: `
    <div class="page">
      <app-page-header
        title="Painel operacional"
        subtitle="Visão geral das inspeções e pendências."
      >
        <div actions class="actions">
          <button matButton="outlined" type="button" (click)="reviewPending()">
            Revisar pendências
          </button>

          <a matButton="filled" routerLink="/inspections/new">
            <mat-icon>add</mat-icon>
            Nova inspeção
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
          @for (tile of tiles(); track tile.key) {
            <app-stat-tile
              [label]="tile.label"
              [value]="tile.value"
              [icon]="tile.icon"
              [tone]="tile.tone"
            />
          }
        </section>

        <section class="panels">
          <app-category-bar-chart
            title="Inspeções por estado"
            context="inspection"
            [data]="statusData()"
            [order]="statusOrder"
            [labels]="statusLabels"
            emptyMessage="Nenhuma inspeção cadastrada."
          />

          <section class="card" aria-labelledby="severity-title">
            <header class="card__head">
              <h2 class="card__title" id="severity-title">Não conformidades</h2>
              <a class="card__link" routerLink="/non-conformities">Ver todas</a>
            </header>

            <ul class="severities">
              @for (row of severityRows(); track row.key) {
                <li class="severities__row">
                  <app-status-badge [value]="row.key" context="severity" />
                  <span class="severities__count">{{ row.count }}</span>
                </li>
              }
            </ul>
          </section>
        </section>

        <section class="lists">
          <section class="card" aria-labelledby="review-title">
            <header class="card__head">
              <h2 class="card__title" id="review-title">Aguardando revisão</h2>
            </header>

            @if (loaded.pendingReview.length === 0) {
              <p class="card__empty">Nenhuma inspeção aguardando revisão.</p>
            } @else {
              <ul class="items">
                @for (inspection of loaded.pendingReview; track inspection.id) {
                  <li class="item">
                    <div class="item__main">
                      <strong class="item__title">{{ titleOf(inspection) }}</strong>
                      <span class="item__sub">{{ subtitleOf(inspection) }}</span>
                    </div>
                    <a class="item__action" [routerLink]="['/inspections', inspection.id, 'review']">
                      Revisar →
                    </a>
                  </li>
                }
              </ul>
            }
          </section>

          <section class="card" aria-labelledby="overdue-title">
            <header class="card__head">
              <h2 class="card__title" id="overdue-title">Atrasadas</h2>
            </header>

            @if (loaded.overdue.length === 0) {
              <p class="card__empty">Nenhuma inspeção atrasada.</p>
            } @else {
              <ul class="items">
                @for (inspection of loaded.overdue; track inspection.id) {
                  <li class="item">
                    <div class="item__main">
                      <strong class="item__title">{{ titleOf(inspection) }}</strong>
                      <span class="item__sub item__sub--late">
                        Prevista para {{ dayOf(inspection) }}
                      </span>
                    </div>
                    <div class="item__chips">
                      <span [class]="'chip chip--' + inspection.priority">
                        {{ priorityLabel(inspection.priority) }}
                      </span>
                      <app-status-badge [value]="inspection.status" context="inspection" />
                    </div>
                  </li>
                }
              </ul>
            }
          </section>
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
      min-width: 0;
    }

    .actions {
      display: flex;
      flex-wrap: wrap;
      gap: 0.75rem;
    }

    .stats {
      display: grid;
      min-width: 0;
      grid-template-columns: repeat(4, minmax(0, 1fr));
      gap: 1rem;
    }

    .panels {
      display: grid;
      min-width: 0;
      grid-template-columns: minmax(0, 1.9fr) minmax(0, 1fr);
      gap: 1.5rem;
      align-items: stretch;
    }

    .lists {
      display: grid;
      min-width: 0;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 1.5rem;
      align-items: stretch;
    }

    .card {
      display: flex;
      flex-direction: column;
      min-width: 0;
      overflow: hidden;
      border: 1px solid #303842;
      border-radius: 1rem;
      background: #1a2027;
    }

    .card__head {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 0.75rem;
      padding: 1rem 1.25rem;
      border-bottom: 1px solid #303842;
    }

    .card__title {
      margin: 0;
      font-size: 0.875rem;
      font-weight: 700;
      letter-spacing: 0.04em;
      text-transform: uppercase;
    }

    .card__link {
      color: var(--mat-sys-primary);
      font-size: 0.75rem;
      font-weight: 600;
      text-decoration: none;
    }

    .card__link:hover {
      text-decoration: underline;
    }

    .card__empty {
      margin: 0;
      padding: 1.25rem;
      color: var(--mat-sys-on-surface-variant);
      font-size: 0.875rem;
    }

    .severities,
    .items {
      margin: 0;
      padding: 0;
      list-style: none;
    }

    .severities {
      display: flex;
      flex-direction: column;
      gap: 0.875rem;
      padding: 1.25rem;
    }

    .severities__row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 0.75rem;
    }

    .severities__count {
      font-size: 1.25rem;
      font-weight: 700;
      font-variant-numeric: tabular-nums;
    }

    .item {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 1rem;
      padding: 1rem 1.25rem;
    }

    .item + .item {
      border-top: 1px solid #303842;
    }

    .item__main {
      display: flex;
      min-width: 0;
      flex-direction: column;
      gap: 0.25rem;
    }

    .item__title {
      overflow: hidden;
      font-size: 0.9375rem;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .item__sub {
      overflow: hidden;
      color: var(--mat-sys-on-surface-variant);
      font-size: 0.75rem;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .item__sub--late {
      color: #f0545a;
    }

    .item__action {
      flex: none;
      color: var(--mat-sys-primary);
      font-size: 0.75rem;
      font-weight: 700;
      text-decoration: none;
    }

    .item__action:hover {
      text-decoration: underline;
    }

    .item__chips {
      display: flex;
      flex: none;
      flex-wrap: wrap;
      justify-content: flex-end;
      gap: 0.5rem;
    }

    .chip {
      display: inline-flex;
      align-items: center;
      padding: 0.125rem 0.5rem;
      border: 1px solid currentColor;
      border-radius: 999px;
      font-size: 0.6875rem;
      font-weight: 700;
      letter-spacing: 0.04em;
      text-transform: uppercase;
    }

    .chip--LOW {
      color: var(--mat-sys-on-surface-variant);
    }
    .chip--MEDIUM {
      color: #f3ad16;
    }
    .chip--HIGH {
      color: #e07a3f;
    }
    .chip--CRITICAL {
      color: #f0545a;
    }

    @media (max-width: 1100px) {
      .stats {
        grid-template-columns: repeat(2, minmax(0, 1fr));
      }

      .panels,
      .lists {
        grid-template-columns: 1fr;
      }
    }

    @media (max-width: 600px) {
      .stats {
        grid-template-columns: 1fr;
      }

      .item {
        flex-direction: column;
        align-items: flex-start;
      }

      .item__chips {
        justify-content: flex-start;
      }
    }
  `,
})
export class DashboardComponent {
  private readonly dashboard = inject(DashboardService);
  private readonly inspections = inject(InspectionsService);
  private readonly clients = inject(ClientsService);
  private readonly users = inject(UsersService);
  private readonly auth = inject(AuthStore);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly statusOrder = STATUS_ORDER;
  protected readonly statusLabels = STATUS_LABELS;

  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly data = signal<DashboardData | null>(null);

  private readonly clientNames = signal<ReadonlyMap<string, string>>(new Map());
  private readonly technicianNames = signal<ReadonlyMap<string, string>>(new Map());

  protected readonly tiles = computed<StatTile[]>(() => {
    const loaded = this.data();
    if (!loaded) return [];

    const critical = loaded.bySeverity.find((entry) => entry.severity === 'CRITICAL')?.count ?? 0;

    return [
      {
        key: 'total',
        label: 'Total de inspeções',
        value: loaded.summary.totalInspections,
        icon: 'assignment',
        tone: 'neutral',
      },
      {
        key: 'overdue',
        label: 'Atrasadas',
        value: loaded.summary.inspectionsOverdue,
        icon: 'schedule',
        tone: 'critical',
      },
      {
        key: 'review',
        label: 'Aguardando revisão',
        value: loaded.summary.inspectionsPendingReview,
        icon: 'arrow_forward',
        tone: 'warning',
      },
      {
        key: 'critical',
        label: 'NCs críticas',
        value: critical,
        icon: 'warning',
        tone: 'critical',
      },
    ];
  });

  /* O gráfico fala em `key`; o contrato devolve `status`. A adaptação (e o
     agrupamento dos oito estados em seis linhas) é feita aqui, e não na
     resposta, para o estado guardado continuar sendo o que a API entregou. */
  protected readonly statusData = computed<CategoryDatum[]>(() => {
    const byStatus = this.data()?.byStatus ?? [];
    const total = byStatus.reduce((sum, entry) => sum + entry.count, 0);
    if (total === 0) return [];

    return STATUS_GROUPS.map((group) => ({
      key: group.key,
      count: byStatus
        .filter((entry) => group.statuses.includes(entry.status))
        .reduce((sum, entry) => sum + entry.count, 0),
    }));
  });

  /** As quatro criticidades sempre aparecem; as que não têm registro mostram zero. */
  protected readonly severityRows = computed(() => {
    const bySeverity = this.data()?.bySeverity ?? [];
    return SEVERITY_ORDER.map((key) => ({
      key,
      count: bySeverity.find((entry) => entry.severity === key)?.count ?? 0,
    }));
  });

  constructor() {
    this.loadNames();
    this.load();
  }

  protected load(): void {
    this.loading.set(true);
    this.error.set(null);

    const oldestFirst = { field: 'scheduledFor', direction: 'asc' } as const;

    forkJoin({
      summary: this.dashboard.summary(),
      byStatus: this.dashboard.inspectionsByStatus(),
      bySeverity: this.dashboard.nonConformitiesBySeverity(),
      submitted: this.inspections.list({
        page: 0,
        size: LIST_SIZE,
        status: 'SUBMITTED',
        sort: oldestFirst,
      }),
      underReview: this.inspections.list({
        page: 0,
        size: LIST_SIZE,
        status: 'UNDER_REVIEW',
        sort: oldestFirst,
      }),
      overdue: this.inspections.list({
        page: 0,
        size: LIST_SIZE,
        overdue: true,
        sort: oldestFirst,
      }),
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
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((result) => {
        if (!result) return;

        const pendingReview = [...result.submitted.content, ...result.underReview.content]
          .sort((left, right) => left.scheduledFor.localeCompare(right.scheduledFor))
          .slice(0, LIST_SIZE);

        this.data.set({
          summary: result.summary,
          byStatus: result.byStatus,
          bySeverity: result.bySeverity,
          pendingReview,
          overdue: result.overdue.content,
        });
      });
  }

  /**
   * Nomes para as linhas das listas. Não bloqueiam a tela: se a busca falhar, a
   * linha mostra só o que já tem. A lista de usuários é restrita ao ADMIN, então
   * os demais perfis veem apenas o cliente.
   */
  private loadNames(): void {
    this.clients
      .list({ page: 0, size: 100 })
      .pipe(
        catchError(() => of(null)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((page) => {
        if (page) this.clientNames.set(namesById<Client>(page.content));
      });

    if (!canAccessRoute('/users', this.auth.role())) return;

    this.users
      .list({ page: 0, size: 100 })
      .pipe(
        catchError(() => of(null)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((page) => {
        if (page) this.technicianNames.set(namesById<User>(page.content));
      });
  }

  protected titleOf(inspection: Inspection): string {
    return inspection.title?.trim() || `Inspeção ${inspection.id.slice(0, 8)}`;
  }

  protected subtitleOf(inspection: Inspection): string {
    const parts = [
      this.clientNames().get(inspection.clientId),
      this.technicianNames().get(inspection.technicianId),
    ].filter((part): part is string => !!part);

    return parts.length > 0 ? parts.join(' · ') : '—';
  }

  protected priorityLabel(priority: InspectionPriority): string {
    return PRIORITY_LABELS[priority] ?? priority;
  }

  /** `dd/MM/yyyy` da data prevista; texto cru se a data vier inválida. */
  protected dayOf(inspection: Inspection): string {
    const date = new Date(inspection.scheduledFor);
    return Number.isNaN(date.getTime())
      ? inspection.scheduledFor
      : date.toLocaleDateString('pt-BR');
  }

  /** Atalho para a lista já filtrada pelo que espera revisão (FE-W18). */
  protected reviewPending(): void {
    void this.router.navigate(['/inspections'], { queryParams: { status: 'SUBMITTED' } });
  }
}

function namesById<T extends { id: string; name: string }>(
  entries: readonly T[],
): ReadonlyMap<string, string> {
  return new Map(entries.map((entry) => [entry.id, entry.name]));
}
