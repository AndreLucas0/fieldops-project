import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { Router } from '@angular/router';
import { finalize, type Subscription } from 'rxjs';
import { ApiError, isApiError, type AuditEvent } from '../../core';
import { ApiService } from '../../core/http/api.service';
import { emptyPage, type Page, type PageParams } from '../../core/models/page.model';
import { DataTableComponent, PageHeaderComponent, type TableColumn } from '../../shared/components';

type AuditEntry = Pick<AuditEvent, 'id' | 'inspectionId' | 'actorId' | 'action' | 'entityType' | 'occurredAt'>;

@Component({
  selector: 'app-audit-overview',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DataTableComponent, PageHeaderComponent, MatButtonModule, MatFormFieldModule,
    MatInputModule, ReactiveFormsModule],
  template: `
    <app-page-header title="Auditoria" subtitle="Consulte eventos do sistema e abra o histórico da inspeção relacionada." />
    <form class="filters" (ngSubmit)="filter()">
      <mat-form-field appearance="outline">
        <mat-label>Ação</mat-label>
        <input matInput [formControl]="action" maxlength="100" placeholder="INSPECTION_APPROVED" />
      </mat-form-field>
      <mat-form-field appearance="outline">
        <mat-label>ID da inspeção</mat-label>
        <input matInput [formControl]="inspectionId" maxlength="36" />
      </mat-form-field>
      <button matButton="outlined" type="submit">Filtrar</button>
    </form>
    <app-data-table [columns]="columns" [data]="data()" [loading]="loading()" [error]="error()"
      ariaLabel="Eventos de auditoria" emptyTitle="Nenhum evento encontrado"
      emptyMessage="Altere os filtros para consultar outros eventos."
      (pageChange)="load($event)" (retry)="load()" (rowAction)="openInspection($event.row)" />
  `,
  styles: `
    :host { display: grid; gap: 1rem; min-width: 0; }
    .filters { display: flex; flex-wrap: wrap; align-items: baseline; gap: 0.75rem; }
    mat-form-field { flex: 1 1 14rem; min-width: 0; }
  `,
})
export class AuditOverviewComponent {
  private readonly api = inject(ApiService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private request?: Subscription;
  private page: PageParams = { page: 0, size: 20 };
  private filters: { action?: string; inspectionId?: string } = {};

  protected readonly action = new FormControl('', { nonNullable: true });
  protected readonly inspectionId = new FormControl('', { nonNullable: true });
  protected readonly data = signal<Page<AuditEntry>>(emptyPage());
  protected readonly loading = signal(false);
  protected readonly error = signal<ApiError | null>(null);
  protected readonly columns: readonly TableColumn<AuditEntry>[] = [
    { field: 'occurredAt', label: 'Data e hora', type: 'date' },
    { field: 'action', label: 'Ação' },
    { field: 'entityType', label: 'Entidade' },
    { field: 'actorId', label: 'Autor', monospace: true },
    { field: 'inspectionId', label: 'Inspeção', monospace: true },
    { field: 'actions', label: 'Ações', type: 'actions', actionsInline: true,
      actions: [{ id: 'inspection', label: 'Abrir inspeção', visible: row => !!row.inspectionId }] },
  ];

  constructor() { this.load(); }

  protected openInspection(row: AuditEntry): void {
    if (row.inspectionId) void this.router.navigate(['/inspections', row.inspectionId]);
  }

  protected filter(): void {
    this.filters = { action: this.action.value.trim() || undefined,
      inspectionId: this.inspectionId.value.trim() || undefined };
    this.load({ page: 0 });
  }

  protected load(page?: PageParams): void {
    this.request?.unsubscribe();
    this.page = { ...this.page, ...page };
    this.loading.set(true);
    this.error.set(null);
    this.request = this.api.getPage<AuditEntry, typeof this.filters>('/audit-events', {
      ...this.page, ...this.filters,
    }).pipe(takeUntilDestroyed(this.destroyRef), finalize(() => this.loading.set(false))).subscribe({
      next: result => this.data.set(result),
      error: (error: unknown) => this.error.set(isApiError(error) ? error : new ApiError({
        kind: 'UNKNOWN', status: 0, code: 'AUDIT_LOAD_FAILED',
        userMessage: 'Não foi possível carregar os eventos de auditoria.',
      })),
    });
  }
}
