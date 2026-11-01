import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  inject,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatDialog } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { catchError, finalize, of } from 'rxjs';

import { AuthStore, canWrite, isApiError, type ApiError } from '../../core';
import type { Client, Inspection, InspectionStatus, User } from '../../core/models/domain';
import { emptyPage, type Page, type PageParams, type Sort } from '../../core/models/page.model';
import {
  ClientsService,
  InspectionsService,
  UsersService,
  type InspectionFilters,
} from '../../core/services/resources';
import {
  DataTableComponent,
  PageHeaderComponent,
  type ActiveFilter,
  type RowActionEvent,
  type TableColumn,
} from '../../shared/components';
import { InspectionCancelDialogComponent } from './inspection-cancel-dialog.component';

/** Um item por valor de `INSPECTION_STATUSES` (shared/src/domain/enums.ts). */
const STATUS_OPTIONS: readonly { value: InspectionStatus; label: string }[] = [
  { value: 'DRAFT', label: 'Rascunho' },
  { value: 'ASSIGNED', label: 'Atribuída' },
  { value: 'IN_PROGRESS', label: 'Em andamento' },
  { value: 'SUBMITTED', label: 'Enviada' },
  { value: 'UNDER_REVIEW', label: 'Em revisão' },
  { value: 'APPROVED', label: 'Aprovada' },
  { value: 'REJECTED', label: 'Reprovada' },
  { value: 'CANCELED', label: 'Cancelada' },
];

/**
 * O backend recusa cancelar `APPROVED` e `SUBMITTED` (`InspectionService.cancel`).
 * `CANCELED` fica de fora só por coerência da tela: o backend hoje aceitaria
 * cancelar de novo e sobrescreveria data, autor e justificativa.
 */
const NOT_CANCELABLE: ReadonlySet<InspectionStatus> = new Set<InspectionStatus>([
  'APPROVED',
  'SUBMITTED',
  'CANCELED',
]);

/** `yyyy-MM-dd` do input de data → ISO 8601 no início/fim do dia local. */
function toIso(day: string, endOfDay: boolean): string | undefined {
  if (!day) return undefined;
  const date = new Date(`${day}T${endOfDay ? '23:59:59' : '00:00:00'}`);
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
}

function formatDay(day: string): string {
  const [year, month, date] = day.split('-');
  return `${date}/${month}/${year}`;
}

/**
 * Listagem de inspeções do supervisor (US-13 / TS-13-02).
 *
 * Filtros: estado, técnico, cliente e período. Paginação e ordenação são do
 * servidor, como nas demais listagens. A identificação visual de atrasadas
 * é a TS-13-03 e entra como estilo de linha/coluna sobre esta tela.
 */
@Component({
  selector: 'app-inspections-list',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    DataTableComponent,
    PageHeaderComponent,
  ],
  template: `
    <section class="page">
      <app-page-header
        title="Inspeções"
        subtitle="Acompanhe o planejamento e cancele quando necessário."
      />
      <div class="catalog-card">
        <div class="filters" aria-label="Filtros de inspeções">
          <mat-form-field appearance="outline" subscriptSizing="dynamic">
            <mat-label>Estado</mat-label>
            <mat-select [ngModel]="status()" (ngModelChange)="setStatus($event)">
              <mat-option [value]="null">Todos</mat-option>
              @for (option of statusOptions; track option.value) {
                <mat-option [value]="option.value">{{ option.label }}</mat-option>
              }
            </mat-select>
          </mat-form-field>
          <mat-form-field appearance="outline" subscriptSizing="dynamic">
            <mat-label>Técnico</mat-label>
            <mat-select [ngModel]="technicianId()" (ngModelChange)="setTechnician($event)">
              <mat-option [value]="null">Todos</mat-option>
              @for (technician of technicians(); track technician.id) {
                <mat-option [value]="technician.id">{{ technician.name }}</mat-option>
              }
            </mat-select>
          </mat-form-field>
          <mat-form-field appearance="outline" subscriptSizing="dynamic">
            <mat-label>Cliente</mat-label>
            <mat-select [ngModel]="clientId()" (ngModelChange)="setClient($event)">
              <mat-option [value]="null">Todos</mat-option>
              @for (client of clientOptions(); track client.id) {
                <mat-option [value]="client.id">{{ client.name }}</mat-option>
              }
            </mat-select>
          </mat-form-field>
          <mat-form-field appearance="outline" subscriptSizing="dynamic">
            <mat-label>Agendada a partir de</mat-label>
            <input
              matInput
              type="date"
              [ngModel]="from()"
              [max]="to() || null"
              (ngModelChange)="setFrom($event)"
            />
          </mat-form-field>
          <mat-form-field appearance="outline" subscriptSizing="dynamic">
            <mat-label>Agendada até</mat-label>
            <input
              matInput
              type="date"
              [ngModel]="to()"
              [min]="from() || null"
              (ngModelChange)="setTo($event)"
            />
          </mat-form-field>
        </div>
        <app-data-table
          [columns]="columns()"
          [data]="data()"
          [loading]="loading()"
          [error]="error()"
          [activeFilters]="activeFilters()"
          [sort]="sort()"
          ariaLabel="Inspeções"
          emptyIcon="assignment"
          emptyTitle="Nenhuma inspeção encontrada"
          [emptyMessage]="emptyMessage()"
          (pageChange)="onPage($event)"
          (sortChange)="onSort($event)"
          (filterChange)="onFilter($event)"
          (rowAction)="onRowAction($event)"
          (retry)="load()"
        />
      </div>
    </section>
  `,
  styles: `
    :host {
      display: block;
      min-width: 0;
    }
    .page {
      display: flex;
      flex-direction: column;
      gap: 1rem;
      min-width: 0;
    }
    .filters {
      display: flex;
      flex-wrap: wrap;
      gap: 0.75rem;
    }
    .filters mat-form-field {
      flex: 1 1 12rem;
      max-width: 16rem;
    }
  `,
})
export class InspectionsListComponent {
  private readonly inspections = inject(InspectionsService);
  private readonly users = inject(UsersService);
  private readonly clients = inject(ClientsService);
  private readonly auth = inject(AuthStore);
  private readonly dialog = inject(MatDialog);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly statusOptions = STATUS_OPTIONS;
  /** Escrita em inspeções: ADMIN e SUPERVISOR (`RESOURCE_WRITE_ROLES`). */
  protected readonly canManage = computed(() => canWrite('inspections', this.auth.role()));

  protected readonly technicians = signal<User[]>([]);
  protected readonly clientOptions = signal<Client[]>([]);

  protected readonly data = signal<Page<Inspection>>(emptyPage());
  protected readonly loading = signal(false);
  protected readonly error = signal<ApiError | null>(null);
  protected readonly status = signal<InspectionStatus | null>(null);
  protected readonly technicianId = signal<string | null>(null);
  protected readonly clientId = signal<string | null>(null);
  protected readonly from = signal('');
  protected readonly to = signal('');
  private readonly params = signal<PageParams>({ page: 0, size: 20 });

  protected readonly sort = computed(() => {
    const sort = this.params().sort;
    return sort && typeof sort === 'object' && !Array.isArray(sort) ? (sort as Sort) : null;
  });

  protected readonly columns = computed<readonly TableColumn<Inspection>[]>(() => {
    const technicianNames = new Map(this.technicians().map((user) => [user.id, user.name]));
    const clientNames = new Map(this.clientOptions().map((client) => [client.id, client.name]));
    return [
      { field: 'title', label: 'Inspeção', sortable: true, emptyText: 'Sem título' },
      {
        field: 'clientId',
        label: 'Cliente',
        format: (value) => clientNames.get(String(value)) ?? '—',
      },
      {
        field: 'technicianId',
        label: 'Técnico',
        format: (value) => technicianNames.get(String(value)) ?? '—',
      },
      { field: 'scheduledFor', label: 'Agendada para', type: 'date', sortable: true },
      { field: 'status', label: 'Estado', type: 'badge', badgeContext: 'inspection', align: 'center' },
      {
        field: 'actions',
        label: 'Ações',
        type: 'actions' as const,
        actionsInline: true,
        actions: this.canManage()
          ? [
              {
                id: 'cancel',
                label: 'Cancelar',
                icon: 'cancel',
                danger: true,
                visible: (row: Inspection) => !NOT_CANCELABLE.has(row.status),
              },
            ]
          : [],
      },
    ];
  });

  protected readonly activeFilters = computed<ActiveFilter[]>(() => {
    const filters: ActiveFilter[] = [];
    const status = this.status();
    if (status) {
      const label = STATUS_OPTIONS.find((option) => option.value === status)?.label ?? status;
      filters.push({ key: 'status', label: 'Estado', value: label });
    }
    const technician = this.technicianId();
    if (technician) {
      const name = this.technicians().find((user) => user.id === technician)?.name ?? '…';
      filters.push({ key: 'technicianId', label: 'Técnico', value: name });
    }
    const client = this.clientId();
    if (client) {
      const name = this.clientOptions().find((entry) => entry.id === client)?.name ?? '…';
      filters.push({ key: 'clientId', label: 'Cliente', value: name });
    }
    if (this.from()) filters.push({ key: 'from', label: 'De', value: formatDay(this.from()) });
    if (this.to()) filters.push({ key: 'to', label: 'Até', value: formatDay(this.to()) });
    return filters;
  });

  protected readonly emptyMessage = computed(() =>
    this.activeFilters().length
      ? 'Nenhuma inspeção corresponde aos filtros aplicados.'
      : 'Ainda não há inspeções planejadas.',
  );

  constructor() {
    this.loadFilterOptions();
    this.load();
  }

  protected load(): void {
    this.loading.set(true);
    this.error.set(null);
    this.inspections
      .list({
        ...this.params(),
        status: this.status() ?? undefined,
        technicianId: this.technicianId() ?? undefined,
        clientId: this.clientId() ?? undefined,
        scheduledFrom: toIso(this.from(), false),
        scheduledTo: toIso(this.to(), true),
      } satisfies PageParams & InspectionFilters)
      .pipe(
        catchError((error: unknown) => {
          this.error.set(isApiError(error) ? error : null);
          return of(emptyPage<Inspection>(this.params().size));
        }),
        finalize(() => this.loading.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((page) => this.data.set(page));
  }

  /** Opções dos selects. Falha aqui não derruba a tela: o filtro fica só com "Todos". */
  private loadFilterOptions(): void {
    this.users
      .list({ role: 'TECHNICIAN' as User['role'], page: 0, size: 100 })
      .pipe(
        catchError(() => of(emptyPage<User>())),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((page) => this.technicians.set(page.content));
    this.clients
      .list({ page: 0, size: 100 })
      .pipe(
        catchError(() => of(emptyPage<Client>())),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((page) => this.clientOptions.set(page.content));
  }

  private refilter(): void {
    this.params.update((p) => ({ ...p, page: 0 }));
    this.load();
  }

  protected setStatus(value: InspectionStatus | null): void {
    this.status.set(value);
    this.refilter();
  }
  protected setTechnician(value: string | null): void {
    this.technicianId.set(value);
    this.refilter();
  }
  protected setClient(value: string | null): void {
    this.clientId.set(value);
    this.refilter();
  }
  protected setFrom(value: string | null): void {
    this.from.set(value ?? '');
    this.refilter();
  }
  protected setTo(value: string | null): void {
    this.to.set(value ?? '');
    this.refilter();
  }

  protected onPage(page: PageParams): void {
    this.params.update((p) => ({ ...p, ...page }));
    this.load();
  }
  protected onSort(sort: Sort | null): void {
    this.params.update((p) => ({ ...p, sort: sort ?? undefined }));
    this.load();
  }
  /** Recebe os filtros que sobraram depois de remover uma etiqueta. */
  protected onFilter(filters: readonly ActiveFilter[]): void {
    const has = (key: string) => filters.some((filter) => filter.key === key);
    if (!has('status')) this.status.set(null);
    if (!has('technicianId')) this.technicianId.set(null);
    if (!has('clientId')) this.clientId.set(null);
    if (!has('from')) this.from.set('');
    if (!has('to')) this.to.set('');
    this.refilter();
  }

  protected onRowAction(event: RowActionEvent<Inspection>): void {
    if (!this.canManage() || event.action !== 'cancel') return;
    this.dialog
      .open(InspectionCancelDialogComponent, {
        data: { inspection: event.row },
        width: '32rem',
        maxWidth: '95vw',
        autoFocus: 'first-tabbable',
        restoreFocus: true,
      })
      .afterClosed()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((cancelled: boolean | undefined) => {
        if (cancelled) this.load();
      });
  }
}
