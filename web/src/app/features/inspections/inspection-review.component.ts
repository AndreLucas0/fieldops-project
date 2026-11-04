import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  inject,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialog } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { catchError, finalize, of, switchMap } from 'rxjs';
import { EvidenceViewerComponent } from './evidence-viewer.component';
import { ConfirmDialogService, StatusBadgeComponent, statusLabel } from '../../shared/components';

import { AuthStore } from '../../core/auth/auth.store';
import type { Evidence, InspectionDetail } from '../../core/models/domain';

import { InspectionsService } from '../../core/services/resources';

@Component({
  selector: 'app-inspection-review',
  standalone: true,
  imports: [CommonModule, RouterLink, MatButtonModule, StatusBadgeComponent],
  templateUrl: './inspection-review.component.html',
  styleUrl: './inspection-review.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InspectionReviewComponent {
  protected readonly label = statusLabel;
  private readonly route = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);
  private readonly inspectionsService = inject(InspectionsService);
  private readonly authStore = inject(AuthStore);
  private readonly dialog = inject(MatDialog);
  private readonly confirmation = inject(ConfirmDialogService);
  private confirmationPending = false;

  protected readonly isSupervisor = computed(() => this.authStore.role() === 'SUPERVISOR');

  protected readonly approvalComments = signal('');
  protected readonly rejectionReason = signal('');

  protected readonly actionLoading = signal(false);
  protected readonly actionError = signal<string | null>(null);

  protected readonly inspection = signal<InspectionDetail | null>(null);
  protected readonly evidence = signal<Evidence[]>([]);
  protected readonly evidenceError = signal(false);

  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);

  protected readonly decisionComment = signal('');

  constructor() {
    const inspectionId = this.route.snapshot.paramMap.get('inspectionId');

    if (!inspectionId) {
      this.error.set('Identificador da inspeção não encontrado.');
      this.loading.set(false);
      return;
    }

    this.loadInspection(inspectionId);
    this.loadEvidence(inspectionId);
  }

  private loadInspection(id: string): void {
    this.inspectionsService
      .get(id)
      .pipe(
        catchError(() => {
          this.error.set('Não foi possível carregar os dados da inspeção.');
          return of(null);
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((result) => {
        this.inspection.set(result);
        this.loading.set(false);
      });
  }

  private loadEvidence(id: string): void {
    this.evidenceError.set(false);
    this.inspectionsService
      .listEvidence(id)
      .pipe(
        catchError(() => {
          this.evidenceError.set(true);
          return of([]);
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((result) => this.evidence.set(result));
  }

  private getInspectionId(): string | null {
    return this.route.snapshot.paramMap.get('inspectionId');
  }

  protected beginReview(): void {
    const id = this.getInspectionId();

    if (
      !id ||
      !this.isSupervisor() ||
      this.actionLoading() ||
      this.inspection()?.status !== 'SUBMITTED'
    )
      return;

    this.actionLoading.set(true);
    this.actionError.set(null);

    this.inspectionsService
      .beginReview(id)
      .pipe(
        switchMap(() => this.inspectionsService.get(id)),
        finalize(() => this.actionLoading.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (inspection) => {
          this.inspection.set(inspection);
        },
        error: () => {
          this.actionError.set(
            'Não foi possível iniciar a revisão. Verifique o status da inspeção.',
          );
        },
      });
  }

  protected approve(): void {
    this.decide(false);
  }

  protected reject(): void {
    this.decide(true);
  }

  private decide(rejection: boolean): void {
    const id = this.getInspectionId();
    const reason = this.decisionComment().trim();

    if (
      !id ||
      !this.isSupervisor() ||
      this.actionLoading() ||
      this.confirmationPending ||
      this.inspection()?.status !== 'UNDER_REVIEW'
    )
      return;

    if (rejection && !reason) {
      this.actionError.set('Informe uma justificativa para rejeitar a inspeção.');
      return;
    }

    this.confirmationPending = true;
    this.actionError.set(null);

    this.confirmation
      .open({
        title: rejection ? 'Reprovar inspeção' : 'Aprovar inspeção',
        message: rejection
          ? 'A inspeção retornará para correção e a justificativa será registrada.'
          : 'Esta decisão será registrada e a inspeção aprovada ficará bloqueada para edição comum.',
        confirmLabel: rejection ? 'Reprovar' : 'Aprovar',
        variant: rejection ? 'danger' : 'primary',
      })
      .pipe(
        switchMap((result) => {
          this.confirmationPending = false;
          if (!result.confirmed) return of(null);
          this.actionLoading.set(true);
          return (
            rejection
              ? this.inspectionsService.reject(id, reason)
              : this.inspectionsService.approve(id, reason || undefined)
          ).pipe(switchMap(() => this.inspectionsService.get(id)));
        }),
        finalize(() => {
          this.confirmationPending = false;
          this.actionLoading.set(false);
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (inspection) => {
          if (inspection) this.inspection.set(inspection);
        },
        error: () => {
          this.actionError.set(
            'Não foi possível registrar a decisão. Verifique se a inspeção ainda está em revisão.',
          );
        },
      });
  }

  protected evidenceForItem(itemId: string): Evidence[] {
    const detail = this.inspection();
    const responseIds = new Set(
      detail?.responses
        ?.filter((response) => response.inspectionItemId === itemId)
        .map((response) => response.id),
    );
    const ncIds = new Set(
      detail?.nonConformities?.filter((nc) => nc.inspectionItemId === itemId).map((nc) => nc.id),
    );
    return this.evidence().filter(
      (file) =>
        (file.responseId && responseIds.has(file.responseId)) ||
        (file.nonConformityId && ncIds.has(file.nonConformityId)),
    );
  }

  protected openEvidence(id: string): void {
    const images = this.evidence().filter(
      (file) => file.mimeType.startsWith('image/') && file.accessUrl,
    );
    const initialIndex = images.findIndex((file) => file.id === id);
    if (initialIndex < 0) return;
    this.dialog.open(EvidenceViewerComponent, {
      data: { images, initialIndex },
      width: '68rem',
      maxWidth: '95vw',
      maxHeight: '95vh',
      restoreFocus: true,
    });
  }

  protected retryEvidence(): void {
    const id = this.getInspectionId();
    if (id) this.loadEvidence(id);
  }
}
