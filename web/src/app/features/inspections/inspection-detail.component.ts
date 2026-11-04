import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  inject,
  computed,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { catchError, of } from 'rxjs';
import { AuthStore } from '../../core/auth/auth.store';
import { canWrite } from '../../core/auth/permissions';
import { MatDialog } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { InspectionPlanningDialogComponent } from './inspection-planning-dialog.component';
import { InspectionCancelDialogComponent } from './inspection-cancel-dialog.component';

import type {
  AuditEvent,
  Client,
  Equipment,
  Evidence,
  Inspection,
  InspectionSite,
  InspectionTemplateVersionDetail,
  User,
} from '../../core/models/domain';

import {
  ClientsService,
  EquipmentService,
  InspectionsService,
  SitesService,
  TemplatesService,
  UsersService,
} from '../../core/services/resources';

@Component({
  selector: 'app-inspection-detail',
  standalone: true,
  imports: [CommonModule, RouterLink, MatButtonModule],
  templateUrl: './inspection-detail.component.html',
  styleUrl: './inspection-detail.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InspectionDetailComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);

  private readonly inspectionsService = inject(InspectionsService);
  private readonly clientsService = inject(ClientsService);
  private readonly sitesService = inject(SitesService);
  private readonly equipmentService = inject(EquipmentService);
  private readonly usersService = inject(UsersService);
  private readonly templatesService = inject(TemplatesService);

  private readonly authStore = inject(AuthStore);
  private readonly dialog = inject(MatDialog);
  protected readonly canEditPlanning = computed(
    () =>
      canWrite('inspections', this.authStore.role()) &&
      ['DRAFT', 'ASSIGNED'].includes(this.inspection()?.status ?? ''),
  );
  protected readonly canCancel = computed(
    () =>
      canWrite('inspections', this.authStore.role()) &&
      !!this.inspection() &&
      !['APPROVED', 'SUBMITTED', 'CANCELED'].includes(this.inspection()!.status),
  );

  protected editPlanning(): void {
    const inspection = this.inspection();
    if (!inspection || !this.canEditPlanning()) return;
    this.dialog
      .open(InspectionPlanningDialogComponent, {
        data: { inspection },
        width: '38rem',
        maxWidth: '95vw',
        restoreFocus: true,
      })
      .afterClosed()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((updated) => {
        if (updated) {
          this.loadInspection(inspection.id);
          this.loadHistory(inspection.id);
        }
      });
  }

  protected cancelInspection(): void {
    const inspection = this.inspection();
    if (!inspection || !this.canCancel()) return;
    this.dialog
      .open(InspectionCancelDialogComponent, {
        data: { inspection },
        width: '32rem',
        maxWidth: '95vw',
        restoreFocus: true,
      })
      .afterClosed()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((cancelled) => {
        if (cancelled) {
          this.loadInspection(inspection.id);
          this.loadHistory(inspection.id);
        }
      });
  }

  protected readonly isSupervisor = computed(() => this.authStore.role() === 'SUPERVISOR');

  protected readonly inspection = signal<Inspection | null>(null);

  protected readonly client = signal<Client | null>(null);
  protected readonly site = signal<InspectionSite | null>(null);
  protected readonly equipment = signal<Equipment | null>(null);
  protected readonly technician = signal<User | null>(null);
  protected readonly supervisor = signal<User | null>(null);
  protected readonly templateVersion = signal<InspectionTemplateVersionDetail | null>(null);

  protected readonly history = signal<AuditEvent[]>([]);
  protected readonly evidence = signal<Evidence[]>([]);

  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);

  constructor() {
    const inspectionId = this.route.snapshot.paramMap.get('inspectionId');

    if (!inspectionId) {
      this.error.set('Identificador da inspeção não encontrado.');
      this.loading.set(false);
      return;
    }

    this.loadInspection(inspectionId);
    this.loadHistory(inspectionId);
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
        this.loading.set(false);

        if (!result) return;

        this.inspection.set(result);

        this.loadClient(result.clientId);
        this.loadSite(result.siteId);
        this.loadTechnician(result.technicianId);

        if (result.equipmentId) {
          this.loadEquipment(result.equipmentId);
        }

        if (result.supervisorId) {
          this.loadSupervisor(result.supervisorId);
        }

        this.loadTemplateVersion(result.templateVersionId);
      });
  }

  private loadClient(id: string): void {
    this.clientsService
      .get(id)
      .pipe(
        catchError(() => of(null)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((result) => this.client.set(result));
  }

  private loadSite(id: string): void {
    this.sitesService
      .get(id)
      .pipe(
        catchError(() => of(null)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((result) => this.site.set(result));
  }

  private loadEquipment(id: string): void {
    this.equipmentService
      .get(id)
      .pipe(
        catchError(() => of(null)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((result) => this.equipment.set(result));
  }

  private loadTechnician(id: string): void {
    this.usersService
      .get(id)
      .pipe(
        catchError(() => of(null)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((result) => this.technician.set(result));
  }

  private loadSupervisor(id: string): void {
    this.usersService
      .get(id)
      .pipe(
        catchError(() => of(null)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((result) => this.supervisor.set(result));
  }

  private loadTemplateVersion(id: string): void {
    this.templatesService
      .getVersion(id)
      .pipe(
        catchError(() => of(null)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((result) => this.templateVersion.set(result));
  }

  private loadHistory(id: string): void {
    this.inspectionsService
      .history(id, {
        page: 0,
        size: 50,
        sort: 'occurredAt,desc',
      })
      .pipe(
        catchError(() => of(null)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((result) => this.history.set(result?.content ?? []));
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

  protected statusLabel(status: string): string {
    const labels: Record<string, string> = {
      DRAFT: 'Rascunho',
      ASSIGNED: 'Atribuída',
      IN_PROGRESS: 'Em andamento',
      SUBMITTED: 'Aguardando revisão',
      UNDER_REVIEW: 'Em revisão',
      APPROVED: 'Aprovada',
      REJECTED: 'Rejeitada',
      CANCELED: 'Cancelada',
    };

    return labels[status] ?? status;
  }

  protected priorityLabel(priority: string): string {
    const labels: Record<string, string> = {
      LOW: 'Baixa',
      MEDIUM: 'Média',
      HIGH: 'Alta',
      CRITICAL: 'Crítica',
    };

    return labels[priority] ?? priority;
  }

  protected eventLabel(action: string): string {
    const labels: Record<string, string> = {
      CREATED: 'Inspeção criada',
      UPDATED: 'Dados atualizados',
      ASSIGNED: 'Inspeção atribuída',
      CANCELED: 'Inspeção cancelada',
      STARTED: 'Inspeção iniciada',
      SUBMITTED: 'Inspeção enviada para revisão',
      APPROVED: 'Inspeção aprovada',
      REJECTED: 'Inspeção rejeitada',
    };

    return labels[action] ?? action.replaceAll('_', ' ');
  }

  protected getStatusClass(status: string): string {
    return status.toLowerCase().replaceAll('_', '-');
  }

  protected get hasHistory(): boolean {
    return this.history().length > 0;
  }
}
