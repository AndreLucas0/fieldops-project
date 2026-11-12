import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { finalize, forkJoin } from 'rxjs';

import { isApiError } from '../../core';
import type { AuditEvent, InspectionDetail } from '../../core/models/domain';
import type { Page } from '../../core/models/page.model';
import { InspectionsService } from '../../core/services/resources';
import { ConfirmDialogService, EmptyStateComponent, LoadingStateComponent, PageHeaderComponent } from '../../shared/components';

const HISTORY_PAGE_SIZE = 20;

const EVENT_LABELS: Readonly<Record<string, string>> = {
  REVIEW_STARTED: 'Revisão iniciada',
  INSPECTION_APPROVED: 'Inspeção aprovada',
  INSPECTION_REJECTED: 'Inspeção reprovada',
};

const STATUS_LABELS: Readonly<Record<string, string>> = {
  SUBMITTED: 'Enviada',
  UNDER_REVIEW: 'Em revisão',
  APPROVED: 'Aprovada',
  REJECTED: 'Reprovada',
};

@Component({
  selector: 'app-inspection-review',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    DatePipe,
    RouterLink,
    MatButtonModule,
    MatIconModule,
    PageHeaderComponent,
    LoadingStateComponent,
    EmptyStateComponent,
  ],
  template: `
    <main class="page">
      <app-page-header
        title="Revisão da inspeção"
        [subtitle]="inspection()?.title || 'Confira a situação e o histórico de auditoria.'"
      >
        <a actions matButton="outlined" routerLink="/dashboard">
          <mat-icon>arrow_back</mat-icon>
          Voltar
        </a>
      </app-page-header>

      @if (loading()) {
        <app-loading-state variant="card" label="Carregando revisão e histórico…" />
      } @else if (loadError()) {
        <app-empty-state
          icon="cloud_off"
          title="Não foi possível carregar a revisão"
          [message]="loadError()!"
          actionLabel="Tentar novamente"
          actionIcon="refresh"
          (action)="load()"
        />
      } @else if (inspection(); as current) {
        <section class="summary" aria-label="Resumo da inspeção">
          <div>
            <span class="eyebrow">Identificador</span>
            <strong>{{ current.id }}</strong>
          </div>
          <div>
            <span class="eyebrow">Situação</span>
            <strong>{{ statusLabel(current.status) }}</strong>
          </div>
          <div>
            <span class="eyebrow">Agendada para</span>
            <strong>{{ current.scheduledFor | date: 'dd/MM/yyyy HH:mm' }}</strong>
          </div>
        </section>

        @if (actionError()) {
          <p class="error" role="alert">{{ actionError() }}</p>
        }

        <section class="actions" aria-label="Ações de revisão">
          @if (current.status === 'SUBMITTED') {
            <button
              matButton="filled"
              type="button"
              [disabled]="actionBusy()"
              (click)="beginReview()"
            >
              <mat-icon>rate_review</mat-icon>
              Iniciar revisão
            </button>
          } @else if (current.status === 'UNDER_REVIEW') {
            <button
              matButton="filled"
              type="button"
              [disabled]="actionBusy()"
              (click)="approve()"
            >
              <mat-icon>check_circle</mat-icon>
              Aprovar
            </button>
            <button
              matButton="outlined"
              type="button"
              [disabled]="actionBusy()"
              (click)="reject()"
            >
              <mat-icon>cancel</mat-icon>
              Reprovar
            </button>
          }
          @if (actionBusy()) {
            <span role="status">Salvando decisão…</span>
          }
        </section>

        <section class="history" aria-labelledby="history-title">
          <div class="section-heading">
            <div>
              <h2 id="history-title">Histórico da inspeção</h2>
              <p>Eventos registrados na trilha de auditoria, em ordem cronológica.</p>
            </div>
            <span class="count">{{ history()?.totalElements ?? 0 }} eventos</span>
          </div>

          @if (historyError()) {
            <p class="error" role="alert">{{ historyError() }}</p>
          }

          @if (historyLoading()) {
            <app-loading-state variant="list" [rows]="3" label="Carregando histórico…" />
          } @else if (history()?.content?.length) {
            <ol class="timeline">
              @for (event of history()!.content; track event.id) {
                <li class="timeline__event">
                  <span class="timeline__marker" aria-hidden="true">
                    <mat-icon>{{ eventIcon(event.action) }}</mat-icon>
                  </span>
                  <article>
                    <div class="event-heading">
                      <h3>{{ eventLabel(event.action) }}</h3>
                      <time [attr.datetime]="event.occurredAt">
                        {{ event.occurredAt | date: 'dd/MM/yyyy HH:mm:ss' }}
                      </time>
                    </div>
                    @if (event.actorId) {
                      <p class="event-meta">Responsável: {{ event.actorId }}</p>
                    }
                    @if (eventDescription(event); as description) {
                      <p class="event-description">{{ description }}</p>
                    }
                  </article>
                </li>
              }
            </ol>

            @if (history()!.totalPages > 1) {
              <nav class="pagination" aria-label="Paginação do histórico">
                <button
                  matButton="outlined"
                  type="button"
                  [disabled]="history()!.page === 0 || historyLoading()"
                  (click)="loadHistory(history()!.page - 1)"
                >
                  Anterior
                </button>
                <span>Página {{ history()!.page + 1 }} de {{ history()!.totalPages }}</span>
                <button
                  matButton="outlined"
                  type="button"
                  [disabled]="history()!.page + 1 >= history()!.totalPages || historyLoading()"
                  (click)="loadHistory(history()!.page + 1)"
                >
                  Próxima
                </button>
              </nav>
            }
          } @else {
            <app-empty-state
              icon="history"
              title="Nenhum evento registrado"
              message="As alterações futuras desta inspeção aparecerão aqui."
            />
          }
        </section>
      }
    </main>
  `,
  styles: `
    :host {
      display: block;
    }

    .page {
      display: flex;
      flex-direction: column;
      gap: 1rem;
      max-width: 76rem;
      margin: 0 auto;
      padding: 1.5rem;
    }

    .summary {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(12rem, 1fr));
      gap: 1rem;
      padding: 1rem;
      border: 1px solid var(--mat-sys-outline-variant);
      border-radius: 0.75rem;
      background: var(--mat-sys-surface-container-low);
    }

    .summary > div {
      display: flex;
      min-width: 0;
      flex-direction: column;
      gap: 0.35rem;
    }

    .summary strong {
      overflow-wrap: anywhere;
      font-weight: 500;
    }

    .eyebrow,
    .event-meta {
      color: var(--mat-sys-on-surface-variant);
      font-size: 0.8125rem;
    }

    .actions,
    .section-heading,
    .event-heading,
    .pagination {
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }

    .actions {
      flex-wrap: wrap;
    }

    .history {
      padding: 1.25rem;
      border: 1px solid var(--mat-sys-outline-variant);
      border-radius: 0.75rem;
    }

    .section-heading {
      justify-content: space-between;
      flex-wrap: wrap;
      margin-bottom: 1rem;
    }

    h2,
    h3,
    .section-heading p,
    .event-meta,
    .event-description {
      margin: 0;
    }

    h2 {
      font-size: 1.125rem;
      font-weight: 500;
    }

    .section-heading p,
    .count,
    time {
      color: var(--mat-sys-on-surface-variant);
      font-size: 0.875rem;
    }

    .count {
      white-space: nowrap;
    }

    .timeline {
      display: flex;
      flex-direction: column;
      gap: 0;
      margin: 0;
      padding: 0;
      list-style: none;
    }

    .timeline__event {
      position: relative;
      display: grid;
      grid-template-columns: 2rem minmax(0, 1fr);
      gap: 0.75rem;
      padding-bottom: 1.5rem;
    }

    .timeline__event:not(:last-child)::before {
      position: absolute;
      top: 2rem;
      bottom: 0;
      left: 0.95rem;
      width: 1px;
      background: var(--mat-sys-outline-variant);
      content: '';
    }

    .timeline__marker {
      z-index: 1;
      display: grid;
      width: 2rem;
      height: 2rem;
      place-items: center;
      border-radius: 50%;
      color: var(--mat-sys-primary);
      background: var(--mat-sys-surface-container-high);
    }

    .timeline__marker mat-icon {
      width: 1.25rem;
      height: 1.25rem;
      font-size: 1.25rem;
    }

    .timeline__event article {
      min-width: 0;
      padding-top: 0.15rem;
    }

    .event-heading {
      justify-content: space-between;
      flex-wrap: wrap;
    }

    h3 {
      font-size: 0.9375rem;
      font-weight: 500;
    }

    .event-meta,
    .event-description {
      margin-top: 0.4rem;
      overflow-wrap: anywhere;
      font-size: 0.875rem;
    }

    .event-meta {
      color: var(--mat-sys-on-surface-variant);
    }

    .pagination {
      justify-content: center;
      flex-wrap: wrap;
      margin-top: 0.5rem;
    }

    .pagination span {
      font-size: 0.875rem;
    }

    .error {
      margin: 0;
      color: var(--mat-sys-error);
    }

    @media (max-width: 36rem) {
      .page {
        padding: 1rem;
      }

      .history {
        padding: 1rem;
      }

      .event-heading {
        align-items: flex-start;
        flex-direction: column;
        gap: 0.25rem;
      }
    }
  `,
})
export class InspectionReviewComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly inspections = inject(InspectionsService);
  private readonly confirmDialog = inject(ConfirmDialogService);
  private readonly inspectionId = this.route.snapshot.paramMap.get('inspectionId');

  protected readonly inspection = signal<InspectionDetail | null>(null);
  protected readonly history = signal<Page<AuditEvent> | null>(null);
  protected readonly loading = signal(true);
  protected readonly historyLoading = signal(false);
  protected readonly actionBusy = signal(false);
  protected readonly loadError = signal<string | null>(null);
  protected readonly actionError = signal<string | null>(null);
  protected readonly historyError = signal<string | null>(null);
  private readonly historyPage = signal(0);

  constructor() {
    this.load();
  }

  protected load(): void {
    if (!this.inspectionId) {
      this.loading.set(false);
      this.loadError.set('Identificador da inspeção ausente na rota.');
      return;
    }

    this.loading.set(true);
    this.loadError.set(null);
    forkJoin({
      inspection: this.inspections.get(this.inspectionId),
      history: this.inspections.listHistory(this.inspectionId, {
        page: this.historyPage(),
        size: HISTORY_PAGE_SIZE,
      }),
    })
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: ({ inspection, history }) => {
          this.inspection.set(inspection);
          this.history.set(history);
        },
        error: (error: unknown) => this.loadError.set(errorMessage(error)),
      });
  }

  protected loadHistory(page: number): void {
    if (!this.inspectionId || page < 0) return;
    this.historyPage.set(page);
    this.historyLoading.set(true);
    this.historyError.set(null);
    this.inspections
      .listHistory(this.inspectionId, { page, size: HISTORY_PAGE_SIZE })
      .pipe(finalize(() => this.historyLoading.set(false)))
      .subscribe({
        next: (history) => this.history.set(history),
        error: (error: unknown) => this.historyError.set(errorMessage(error)),
      });
  }

  protected beginReview(): void {
    if (!this.inspectionId) return;
    this.runAction(this.inspections.beginReview(this.inspectionId));
  }

  protected approve(): void {
    if (!this.inspectionId) return;
    this.confirmDialog
      .open({
        title: 'Aprovar inspeção',
        message: 'A aprovação encerra a revisão e não pode ser desfeita.',
        confirmLabel: 'Aprovar',
        variant: 'primary',
      })
      .subscribe((result) => {
        if (result.confirmed) this.runAction(this.inspections.approve(this.inspectionId!));
      });
  }

  protected reject(): void {
    if (!this.inspectionId) return;
    this.confirmDialog
      .open({
        title: 'Reprovar inspeção',
        message: 'Informe o motivo para devolver a inspeção para correção.',
        confirmLabel: 'Reprovar',
        variant: 'danger',
        requiredTextField: {
          label: 'Motivo da reprovação',
          maxLength: 1000,
          minLength: 1,
        },
      })
      .subscribe((result) => {
        if (result.confirmed && result.textValue) {
          this.runAction(this.inspections.reject(this.inspectionId!, result.textValue));
        }
      });
  }

  protected eventLabel(action: string): string {
    return EVENT_LABELS[action] ?? action.replaceAll('_', ' ').toLowerCase();
  }

  protected eventIcon(action: string): string {
    if (action.includes('APPROVED')) return 'check_circle';
    if (action.includes('REJECTED')) return 'cancel';
    if (action.includes('REVIEW')) return 'rate_review';
    return 'history';
  }

  protected eventDescription(event: AuditEvent): string | null {
    const reason = jsonString(event.metadataJson, 'reason');
    const comments = jsonString(event.metadataJson, 'comments');
    if (reason && comments) return `Motivo: ${reason} · Comentários: ${comments}`;
    if (reason) return `Motivo: ${reason}`;
    if (comments) return `Comentários: ${comments}`;

    const status = jsonString(event.newValueJson, 'status');
    return status ? `Situação: ${this.statusLabel(status)}` : null;
  }

  protected statusLabel(status: string): string {
    return STATUS_LABELS[status] ?? status.replaceAll('_', ' ');
  }

  private runAction(action: ReturnType<InspectionsService['beginReview']>): void {
    this.actionBusy.set(true);
    this.actionError.set(null);
    action
      .pipe(finalize(() => this.actionBusy.set(false)))
      .subscribe({
        next: () => this.load(),
        error: (error: unknown) => this.actionError.set(errorMessage(error)),
      });
  }
}

function jsonString(value: AuditEvent['metadataJson'], key: string): string | null {
  const field = value?.[key];
  return typeof field === 'string' ? field : null;
}

function errorMessage(error: unknown): string {
  return isApiError(error) ? error.userMessage : 'Ocorreu um erro inesperado. Tente novamente.';
}
