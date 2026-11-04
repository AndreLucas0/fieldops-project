
import {
    ChangeDetectionStrategy,
    Component,
    DestroyRef,
    computed,
    inject,
    signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { catchError, finalize, of } from 'rxjs';

import { AuthStore } from '../../core/auth/auth.store';
import type {
    Evidence,
    InspectionDetail,
} from '../../core/models/domain';

import { InspectionsService } from '../../core/services/resources';

@Component({
    selector: 'app-inspection-review',
    standalone: true,
    imports: [CommonModule, RouterLink],
    templateUrl: './inspection-review.component.html',
    styleUrl: './inspection-review.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InspectionReviewComponent {
    private readonly route = inject(ActivatedRoute);
    private readonly destroyRef = inject(DestroyRef);
    private readonly inspectionsService = inject(InspectionsService);
    private readonly authStore = inject(AuthStore);

    protected readonly isSupervisor = computed(
        () => this.authStore.role() === 'SUPERVISOR',
    );

    protected readonly approvalComments = signal('');
    protected readonly rejectionReason = signal('');

    protected readonly actionLoading = signal(false);
    protected readonly actionError = signal<string | null>(null);

    protected readonly inspection = signal<InspectionDetail | null>(null);
    protected readonly evidence = signal<Evidence[]>([]);

    protected readonly loading = signal(true);
    protected readonly error = signal<string | null>(null);

    protected readonly decisionComment = signal('');

    constructor() {
        const inspectionId =
            this.route.snapshot.paramMap.get('inspectionId');

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
                    this.error.set(
                        'Não foi possível carregar os dados da inspeção.',
                    );
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
        this.inspectionsService
            .listEvidence(id)
            .pipe(
                catchError(() => of([])),
                takeUntilDestroyed(this.destroyRef),
            )
            .subscribe((result) => this.evidence.set(result));
    }

    private getInspectionId(): string | null {
        return this.route.snapshot.paramMap.get('inspectionId');
    }

    protected beginReview(): void {
        const id = this.getInspectionId();

        if (!id || !this.isSupervisor() || this.actionLoading() || this.inspection()?.status !== 'SUBMITTED') return;

        this.actionLoading.set(true);
        this.actionError.set(null);

        this.inspectionsService
            .beginReview(id)
            .pipe(
                finalize(() => this.actionLoading.set(false)),
                takeUntilDestroyed(this.destroyRef),
            )
            .subscribe({
                next: () => {
                    this.loadInspection(id);
                },
                error: () => {
                    this.actionError.set(
                        'Não foi possível iniciar a revisão. Verifique o status da inspeção.',
                    );
                },
            });
    }

    protected approve(): void {
        const id = this.getInspectionId();

        if (!id || !this.isSupervisor() || this.actionLoading() || this.inspection()?.status !== 'UNDER_REVIEW') return;

        const confirmed = window.confirm(
            'Tem certeza de que deseja aprovar esta inspeção? Esta decisão será registrada.',
        );

        if (!confirmed) return;

        this.actionLoading.set(true);
        this.actionError.set(null);

        this.inspectionsService
            .approve(id, this.decisionComment().trim() || undefined)
            .pipe(
                finalize(() => this.actionLoading.set(false)),
                takeUntilDestroyed(this.destroyRef),
            )
            .subscribe({
                next: () => {
                    this.loadInspection(id);
                },
                error: () => {
                    this.actionError.set(
                        'Não foi possível aprovar a inspeção. Verifique se ela ainda está em revisão.',
                    );
                },
            });
    }

    protected reject(): void {
        const id = this.getInspectionId();
        const reason = this.decisionComment().trim();
        
        if (!id || !this.isSupervisor() || this.actionLoading() || this.inspection()?.status !== 'UNDER_REVIEW') return;

        if (!reason) {
            this.actionError.set(
                'Informe uma justificativa para rejeitar a inspeção.',
            );
            return;
        }

        const confirmed = window.confirm(
            'Tem certeza de que deseja rejeitar esta inspeção? A justificativa será registrada.',
        );

        if (!confirmed) return;

        this.actionLoading.set(true);
        this.actionError.set(null);

        this.inspectionsService
            .reject(id, reason)
            .pipe(
                finalize(() => this.actionLoading.set(false)),
                takeUntilDestroyed(this.destroyRef),
            )
            .subscribe({
                next: () => {
                    this.loadInspection(id);
                },
                error: () => {
                    this.actionError.set(
                        'Não foi possível rejeitar a inspeção. Verifique se ela ainda está em revisão.',
                    );
                },
            });
    }
}
