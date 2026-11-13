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
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { catchError, finalize, filter, forkJoin, of, switchMap } from 'rxjs';

import { AuthStore, canWrite, isApiError, type ApiError } from '../../core';
import { NotificationService } from '../../core/notifications/notification.service';
import type { Client } from '../../core/models/domain';
import { emptyPage, type Page, type PageParams, type Sort } from '../../core/models/page.model';
import { ClientsService, SitesService, type ClientFilters } from '../../core/services/resources';
import {
  DataTableComponent,
  ConfirmDialogService,
  PageHeaderComponent,
  type ActiveFilter,
  type RowActionEvent,
  type TableColumn,
} from '../../shared/components';
import { ClientFormDialogComponent } from './client-form-dialog.component';

@Component({
  selector: 'app-clients-list',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormsModule,
    MatButtonModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatSelectModule,
    DataTableComponent,
    PageHeaderComponent,
  ],
  template: `
    
  <section class="page">
    <app-page-header
      title="Clientes"
      subtitle="Empresas atendidas e seus locais."
    >
      @if (canManage()) {
        <button
          actions
          matButton="filled"
          type="button"
          (click)="openForm()"
        >
          <mat-icon>add</mat-icon>
          Novo cliente
        </button>
      }
    </app-page-header>

    <section class="content-panel">

      <!-- Área dos filtros -->
      <div class="filter-section">

        <div class="filter-heading">
          <div>
            <h2>Filtros</h2>
            <p>Encontre clientes usando os critérios abaixo.</p>
          </div>

          <button
            mat-button
            type="button"
            class="clear-filters"
            (click)="clearFilters()"
          >
            <mat-icon>filter_alt_off</mat-icon>
            Limpar filtros
          </button>
        </div>

        <!-- Campos de pesquisa -->
        <div class="filters" aria-label="Filtros de clientes">

          <mat-form-field
            appearance="outline"
            subscriptSizing="dynamic"
          >
            <mat-label>Buscar cliente</mat-label>

            <input
              matInput
              [ngModel]="name()"
              (ngModelChange)="setName($event)"
              placeholder="Nome da empresa"
            />

            <mat-icon matSuffix aria-hidden="true">
              search
            </mat-icon>
          </mat-form-field>

          <mat-form-field
            appearance="outline"
            subscriptSizing="dynamic"
          >
            <mat-label>Situação</mat-label>

            <mat-select
              [ngModel]="status()"
              (ngModelChange)="setStatus($event)"
            >
              <mat-option [value]="null">Todas</mat-option>
              <mat-option value="ACTIVE">Ativos</mat-option>
              <mat-option value="INACTIVE">Inativos</mat-option>
            </mat-select>
          </mat-form-field>

        </div>
      </div>

      <!-- Listagem -->
      <div class="table-section">
        <app-data-table
          [columns]="columns()"
          [data]="data()"
          [loading]="loading()"
          [error]="error()"
          [activeFilters]="activeFilters()"
          [sort]="sort()"
          ariaLabel="Clientes"
          emptyIcon="business"
          emptyTitle="Nenhum cliente encontrado"
          [emptyMessage]="emptyMessage()"
          (pageChange)="onPage($event)"
          (sortChange)="onSort($event)"
          (filterChange)="onFilter($event)"
          (rowAction)="onRowAction($event)"
          (retry)="load()"
        />
      </div>

    </section>
  </section>
  `,
 
styles: `
  :host {
    display: block;
    min-width: 0;
  }

  /* Estrutura da página */
  .page {
    display: flex;
    flex-direction: column;
    gap: 1.25rem;
    min-width: 0;
  }

  /* Container principal */
  .content-panel {
    min-width: 0;
    padding: 1.5rem;
    border: 1px solid var(--mat-sys-outline-variant);
    border-radius: 1rem;
    background: linear-gradient(135deg, #1b232b, #161c22);
  }

  /* Área dos filtros */
  .filter-section {
    padding-bottom: 0;
    border-bottom: none;
  }

  /* Cabeçalho dos filtros */
  .filter-heading {
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex-wrap: wrap;
    gap: 1rem;
    margin-bottom: 1.25rem;
  }

  .filter-heading h2 {
    margin: 0;
    font-size: 1rem;
    font-weight: 600;
    color: var(--mat-sys-on-surface);
  }

  .filter-heading p {
    margin: 0.3rem 0 0;
    color: var(--mat-sys-on-surface-variant);
    font-size: 0.85rem;
  }

  .filter-heading button {
    flex-shrink: 0;
    color: #ffad0a;
    font-weight: 600;
  }

  /* Campos de filtro */
  .filters {
    display: grid;
    grid-template-columns: repeat(5, minmax(0, 1fr));
    gap: 0.75rem;
    align-items: center;
  }

  .filters mat-form-field {
    width: 100%;
    min-width: 0;
    margin: 0;
  }

  /* Tabela */
  .table-section {
    min-width: 0;
    padding-top: 0.75rem;
  }

  .table-section app-data-table {
    display: block;
    min-width: 0;
  }

  /* Telas intermediárias */
  @media (max-width: 1100px) {
    .filters {
      grid-template-columns: repeat(3, minmax(0, 1fr));
    }
  }

  /* Tablets */
  @media (max-width: 700px) {
    .content-panel {
      padding: 1rem;
    }

    .filters {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
  }

  /* Celulares */
  @media (max-width: 480px) {
    .filters {
      grid-template-columns: 1fr;
    }

    .filter-heading {
      align-items: flex-start;
    }
  }
`,

})
export class ClientsListComponent {
  private readonly clients = inject(ClientsService);
  private readonly sites = inject(SitesService);
  private readonly auth = inject(AuthStore);
  private readonly dialog = inject(MatDialog);
  private readonly confirmation = inject(ConfirmDialogService);
  private readonly notifications = inject(NotificationService);
  private readonly destroyRef = inject(DestroyRef);
  protected readonly canManage = computed(() => canWrite('clients', this.auth.role()));
  private readonly siteCounts = signal<Record<string, number | null>>({});
  private siteCountsRequestId = 0;
  protected readonly columns = computed<readonly TableColumn<Client>[]>(() => [
    { field: 'name', label: 'Cliente', sortable: true },
    { field: 'document', label: 'CNPJ', emptyText: '—' },
    {
      field: 'email',
      label: 'Contato',
      format: (value, row) => String(value || row.phone || '—'),
    },
    {
      field: 'id',
      label: 'Locais',
      type: 'link',
      align: 'center',
      link: (row) => ['/clients', row.id, 'sites'],
      format: (_value, row) => {
        const count = this.siteCounts()[row.id];
        if (count === undefined) return '…';
        if (count === null) return '—';
        return `${count} ${count === 1 ? 'local' : 'locais'}`;
      },
    },
    { field: 'status', label: 'Situação', type: 'badge', badgeContext: 'user', align: 'center' },
    {
      field: 'actions',
      label: 'Ações',
      type: 'actions' as const,
      actionsInline: true,
      actions: [
        ...(this.canManage()
          ? [
            { id: 'edit', label: 'Editar', icon: 'edit' },
            {
              id: 'deactivate',
              label: 'Inativar',
              icon: 'block',
              visible: (row: Client) => row.status === 'ACTIVE',
            },
            {
              id: 'activate',
              label: 'Ativar',
              icon: 'check_circle',
              visible: (row: Client) => row.status === 'INACTIVE',
            },
          ]
          : []),
      ],
    },
  ]);
  protected readonly data = signal<Page<Client>>(emptyPage());
  protected readonly loading = signal(false);
  protected readonly error = signal<ApiError | null>(null);
  protected readonly name = signal('');
  protected readonly status = signal<'ACTIVE' | 'INACTIVE' | null>(null);
  private readonly params = signal<PageParams>({ page: 0, size: 20 });
  protected readonly sort = computed(() => {
    const sort = this.params().sort;
    return sort && typeof sort === 'object' && !Array.isArray(sort) ? (sort as Sort) : null;
  });
  protected readonly activeFilters = computed<ActiveFilter[]>(() => {
    const filters: ActiveFilter[] = [];
    if (this.name().trim()) filters.push({ key: 'name', label: 'Nome', value: this.name().trim() });
    if (this.status())
      filters.push({
        key: 'status',
        label: 'Situação',
        value: this.status() === 'ACTIVE' ? 'Ativo' : 'Inativo',
      });
    return filters;
  });
  protected readonly emptyMessage = computed(() =>
    this.activeFilters().length
      ? 'Nenhum cliente corresponde aos filtros aplicados.'
      : 'Ainda não há clientes cadastrados.',
  );

  constructor() {
    this.load();
  }

  protected load(): void {
    this.loading.set(true);
    this.error.set(null);
    this.clients
      .list({
        ...this.params(),
        name: this.name().trim() || undefined,
        status: this.status() ?? undefined,
      } satisfies PageParams & ClientFilters)
      .pipe(
        catchError((error: unknown) => {
          this.error.set(isApiError(error) ? error : null);
          return of(emptyPage<Client>(this.params().size));
        }),
        finalize(() => this.loading.set(false)),
      )
      .subscribe((page) => {
        this.data.set(page);
        this.resolveSiteCounts(page.content);
      });
  }

  private resolveSiteCounts(clients: Client[]): void {
    const requestId = ++this.siteCountsRequestId;
    const ids = [...new Set(clients.map((client) => client.id))];
    if (!ids.length) return;
    this.siteCounts.set({});
    forkJoin(
      ids.map((id) =>
        this.sites.listByClient(id, { page: 0, size: 1 }).pipe(catchError(() => of(null))),
      ),
    )
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((pages) => {
        if (requestId !== this.siteCountsRequestId) return;
        this.siteCounts.set(
          Object.fromEntries(ids.map((id, index) => [id, pages[index]?.totalElements ?? null])),
        );
        this.data.update((page) => ({ ...page }));
      });
  }

  protected clearFilters(): void {
    this.name.set('');
    this.status.set(null);

    this.params.update((p) => ({
      ...p,
      page: 0,
    }));

    this.load();
  }

  protected setName(value: string): void {
    this.name.set(value);
    this.params.update((p) => ({ ...p, page: 0 }));
    this.load();
  }
  protected setStatus(value: 'ACTIVE' | 'INACTIVE' | null): void {
    this.status.set(value);
    this.params.update((p) => ({ ...p, page: 0 }));
    this.load();
  }
  protected onPage(page: PageParams): void {
    this.params.update((p) => ({ ...p, ...page }));
    this.load();
  }
  protected onSort(sort: Sort | null): void {
    this.params.update((p) => ({ ...p, sort: sort ?? undefined }));
    this.load();
  }
  protected onFilter(filters: readonly ActiveFilter[]): void {
    if (!filters.some((filter) => filter.key === 'name')) this.name.set('');
    if (!filters.some((filter) => filter.key === 'status')) this.status.set(null);
    this.params.update((p) => ({ ...p, page: 0 }));
    this.load();
  }

  protected openForm(client?: Client): void {
    if (!this.canManage()) return;
    this.dialog
      .open(ClientFormDialogComponent, {
        data: { client: client ?? null },
        width: '42rem',
        maxWidth: '95vw',
        autoFocus: 'first-tabbable',
        restoreFocus: true,
      })
      .afterClosed()
      .subscribe((saved: boolean | undefined) => {
        if (saved) this.load();
      });
  }

  protected onRowAction(event: RowActionEvent<Client>): void {
    if (!this.canManage()) return;
    if (event.action === 'edit') {
      this.openForm(event.row);
      return;
    }

    const status = event.action === 'deactivate' ? 'INACTIVE' : 'ACTIVE';
    const verb = status === 'INACTIVE' ? 'inativar' : 'reativar';
    const title = status === 'INACTIVE' ? 'Inativar cliente?' : 'Reativar cliente?';
    const message =
      status === 'INACTIVE'
        ? `${event.row.name} não poderá ser selecionado em novas inspeções. Os registros históricos serão preservados.`
        : `${event.row.name} poderá voltar a ser selecionado em novas inspeções.`;

    this.confirmation
      .open({
        title,
        message,
        confirmLabel: `Sim, ${verb}`,
        variant: status === 'INACTIVE' ? 'warning' : 'primary',
      })
      .pipe(
        filter((result) => result.confirmed),
        switchMap(() => this.clients.setStatus(event.row.id, status)),
        catchError((error: unknown) => {
          this.notifications.error(
            isApiError(error) ? error.userMessage : 'Não foi possível atualizar o cliente.',
          );
          return of(null);
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((client) => {
        if (!client) return;
        this.notifications.success(
          status === 'INACTIVE' ? 'Cliente inativado.' : 'Cliente reativado.',
        );
        this.load();
      });
  }
}
