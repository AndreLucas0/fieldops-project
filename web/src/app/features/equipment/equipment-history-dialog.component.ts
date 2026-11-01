import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { catchError, finalize, of } from 'rxjs';

import { isApiError, type ApiError, type Equipment, type Inspection } from '../../core';
import { emptyPage, type Page, type PageParams } from '../../core/models/page.model';
import { InspectionsService, type InspectionFilters } from '../../core/services/resources';
import { DataTableComponent, type TableColumn } from '../../shared/components';

export interface EquipmentHistoryDialogData {
  equipment: Equipment;
}

@Component({
  selector: 'app-equipment-history-dialog',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatButtonModule, MatDialogModule, DataTableComponent],
  template: `
    <h2 mat-dialog-title>Histórico de inspeções</h2>
    <mat-dialog-content>
      <p class="equipment-name">{{ data.equipment.name }}</p>
      <app-data-table
        [columns]="columns"
        [data]="page()"
        [loading]="loading()"
        [error]="error()"
        ariaLabel="Histórico de inspeções do equipamento"
        emptyIcon="history"
        emptyTitle="Nenhuma inspeção"
        emptyMessage="Este equipamento ainda não possui inspeções registradas."
        (pageChange)="onPage($event)"
        (retry)="load()"
      />
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button matButton mat-dialog-close type="button">Fechar</button>
    </mat-dialog-actions>
  `,
  styles: `
    :host {
      display: block;
    }
    mat-dialog-content {
      max-height: min(70vh, 42rem);
    }
    .equipment-name {
      margin: 0 0 1rem;
      color: var(--mat-sys-on-surface-variant);
    }
  `,
})
export class EquipmentHistoryDialogComponent {
  readonly data = inject<EquipmentHistoryDialogData>(MAT_DIALOG_DATA);
  private readonly inspections = inject(InspectionsService);
  private readonly destroyRef = inject(DestroyRef);
  protected readonly page = signal<Page<Inspection>>(emptyPage());
  protected readonly loading = signal(false);
  protected readonly error = signal<ApiError | null>(null);
  private readonly params = signal<PageParams>({ page: 0, size: 20 });
  protected readonly columns: readonly TableColumn<Inspection>[] = [
    {
      field: 'title',
      label: 'Inspeção',
      format: (value, row) => String(value || row.id),
    },
    { field: 'scheduledFor', label: 'Data', type: 'date', sortable: true },
    { field: 'priority', label: 'Prioridade', type: 'badge', badgeContext: 'priority' },
    { field: 'status', label: 'Situação', type: 'badge', badgeContext: 'inspection' },
  ];

  constructor() {
    this.load();
  }

  protected load(): void {
    this.loading.set(true);
    this.error.set(null);
    this.inspections
      .list({
        ...this.params(),
        equipmentId: this.data.equipment.id,
      } satisfies PageParams & InspectionFilters)
      .pipe(
        catchError((thrown: unknown) => {
          this.error.set(isApiError(thrown) ? thrown : null);
          return of(emptyPage<Inspection>(this.params().size));
        }),
        finalize(() => this.loading.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((page) => this.page.set(page));
  }

  protected onPage(page: PageParams): void {
    this.params.update((params) => ({ ...params, ...page }));
    this.load();
  }
}
