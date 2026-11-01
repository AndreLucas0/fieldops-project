import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { catchError, finalize, forkJoin, of } from 'rxjs';

import { isApiError, type Evidence, type InspectionDetail, type NonConformity } from '../../core';
import { InspectionsService, NonConformitiesService } from '../../core/services/resources';
import { statusLabel } from '../../shared/components';

export interface NonConformityDetailDialogData {
  nonConformity: NonConformity;
}

@Component({
  selector: 'app-non-conformity-detail-dialog',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DatePipe, MatButtonModule, MatDialogModule],
  template: `
    <h2 mat-dialog-title>Não conformidade</h2>
    <mat-dialog-content>
      @if (loading()) {
        <p class="state" role="status">Carregando detalhes da inspeção…</p>
      } @else if (errorMessage()) {
        <p class="error" role="alert">{{ errorMessage() }}</p>
      } @else if (nonConformity(); as item) {
        <section class="nc" aria-labelledby="nc-title">
          <div class="eyebrow">{{ severityLabel(item.severity) }}</div>
          <h3 id="nc-title">{{ item.title }}</h3>
          <p>{{ item.description }}</p>
          <dl class="facts">
            <div>
              <dt>Situação</dt>
              <dd>{{ statusLabel('nonConformity', item.status) }}</dd>
            </div>
            <div>
              <dt>Registrada em</dt>
              <dd>{{ item.createdAtDevice | date: 'dd/MM/yyyy HH:mm' }}</dd>
            </div>
            <div>
              <dt>Item relacionado</dt>
              <dd>{{ relatedItemTitle() || 'Não vinculado a um item específico' }}</dd>
            </div>
            <div>
              <dt>Evidências</dt>
              <dd>
                @if (evidenceCount() === null) {
                  Não foi possível consultar
                } @else {
                  {{ evidenceCount() }} {{ evidenceCount() === 1 ? 'evidência' : 'evidências' }}
                }
              </dd>
            </div>
          </dl>
        </section>

        @if (inspection(); as relatedInspection) {
          <section class="inspection" aria-labelledby="inspection-title">
            <h3 id="inspection-title">Inspeção relacionada</h3>
            <strong>{{ relatedInspection.title || 'Inspeção' }}</strong>
            <dl class="facts">
              <div>
                <dt>Estado</dt>
                <dd>{{ statusLabel('inspection', relatedInspection.status) }}</dd>
              </div>
              <div>
                <dt>Agendada para</dt>
                <dd>{{ relatedInspection.scheduledFor | date: 'dd/MM/yyyy HH:mm' }}</dd>
              </div>
              <div>
                <dt>Identificador</dt>
                <dd class="id">{{ relatedInspection.id }}</dd>
              </div>
            </dl>
          </section>
        }
      }
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button matButton="filled" type="button" (click)="close()">Fechar</button>
    </mat-dialog-actions>
  `,
  styles: `
    :host {
      display: block;
    }
    mat-dialog-content {
      display: grid;
      gap: 1rem;
      padding-top: 0.75rem;
    }
    .nc,
    .inspection {
      min-width: 0;
    }
    .eyebrow {
      color: var(--mat-sys-primary);
      font-size: 0.75rem;
      font-weight: 700;
      letter-spacing: 0.08em;
      text-transform: uppercase;
    }
    h3 {
      margin: 0.25rem 0 0.5rem;
      font-size: 1rem;
    }
    p {
      margin: 0;
      color: var(--mat-sys-on-surface-variant);
      line-height: 1.5;
    }
    .inspection {
      padding-top: 1rem;
      border-top: 1px solid var(--mat-sys-outline-variant);
    }
    .inspection h3 {
      margin-top: 0;
    }
    .facts {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 0.875rem;
      margin: 1rem 0 0;
    }
    .facts div {
      min-width: 0;
    }
    dt {
      color: var(--mat-sys-on-surface-variant);
      font-size: 0.75rem;
    }
    dd {
      margin: 0.25rem 0 0;
      overflow-wrap: anywhere;
    }
    .id {
      font-size: 0.75rem;
    }
    .error {
      color: var(--mat-sys-error);
    }
    @media (max-width: 560px) {
      .facts {
        grid-template-columns: minmax(0, 1fr);
      }
    }
  `,
})
export class NonConformityDetailDialogComponent {
  readonly data = inject<NonConformityDetailDialogData>(MAT_DIALOG_DATA);
  private readonly dialogRef =
    inject<MatDialogRef<NonConformityDetailDialogComponent>>(MatDialogRef);
  private readonly nonConformities = inject(NonConformitiesService);
  private readonly inspections = inject(InspectionsService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly loading = signal(true);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly nonConformity = signal<NonConformity | null>(null);
  protected readonly inspection = signal<InspectionDetail | null>(null);
  protected readonly evidenceCount = signal<number | null>(null);
  protected readonly relatedItemTitle = signal('');

  constructor() {
    forkJoin({
      nonConformity: this.nonConformities.get(this.data.nonConformity.id),
      inspection: this.inspections.get(this.data.nonConformity.inspectionId),
      evidence: this.inspections
        .listEvidence(this.data.nonConformity.inspectionId)
        .pipe(catchError(() => of(null))),
    })
      .pipe(
        catchError((thrown: unknown) => {
          this.errorMessage.set(
            isApiError(thrown)
              ? thrown.userMessage
              : 'Não foi possível carregar os detalhes da inspeção. Tente novamente.',
          );
          return of(null);
        }),
        finalize(() => this.loading.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((result) => {
        if (!result) return;
        this.nonConformity.set(result.nonConformity);
        this.inspection.set(result.inspection);
        this.evidenceCount.set(
          result.evidence?.filter(
            (evidence: Evidence) => evidence.nonConformityId === result.nonConformity.id,
          ).length ?? null,
        );
        this.relatedItemTitle.set(
          result.inspection.items?.find((item) => item.id === result.nonConformity.inspectionItemId)
            ?.itemTitle ?? '',
        );
      });
  }

  protected statusLabel = statusLabel;

  protected severityLabel(severity: NonConformity['severity']): string {
    return statusLabel('severity', severity);
  }

  protected close(): void {
    this.dialogRef.close();
  }
}
