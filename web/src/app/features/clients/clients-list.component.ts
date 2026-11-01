import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { catchError, finalize, of } from 'rxjs';

import { isApiError, type ApiError } from '../../core';
import type { Client } from '../../core/models/domain';
import { emptyPage, type Page, type PageParams, type Sort } from '../../core/models/page.model';
import { ClientsService, type ClientFilters } from '../../core/services/resources';
import {
  DataTableComponent,
  PageHeaderComponent,
  type ActiveFilter,
  type TableColumn,
} from '../../shared/components';

@Component({
  selector: 'app-clients-list',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormsModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatSelectModule,
    DataTableComponent,
    PageHeaderComponent,
  ],
  template: `
    <section class="page">
      <app-page-header title="Clientes" subtitle="Empresas atendidas pela FieldOps." />
      <div class="filters" aria-label="Filtros de clientes">
        <mat-form-field appearance="outline" subscriptSizing="dynamic">
          <mat-label>Buscar cliente</mat-label>
          <input
            matInput
            [ngModel]="name()"
            (ngModelChange)="setName($event)"
            placeholder="Nome da empresa"
          />
          <mat-icon matSuffix aria-hidden="true">search</mat-icon>
        </mat-form-field>
        <mat-form-field appearance="outline" subscriptSizing="dynamic">
          <mat-label>Situação</mat-label>
          <mat-select [ngModel]="status()" (ngModelChange)="setStatus($event)">
            <mat-option [value]="null">Todas</mat-option>
            <mat-option value="ACTIVE">Ativos</mat-option>
            <mat-option value="INACTIVE">Inativos</mat-option>
          </mat-select>
        </mat-form-field>
      </div>
      <app-data-table
        [columns]="columns"
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
        (retry)="load()"
      />
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
      flex: 1 1 14rem;
      max-width: 22rem;
    }
  `,
})
export class ClientsListComponent {
  private readonly clients = inject(ClientsService);
  protected readonly columns: readonly TableColumn<Client>[] = [
    { field: 'name', label: 'Cliente', sortable: true },
    { field: 'legalName', label: 'Razão social', emptyText: '—' },
    { field: 'document', label: 'Documento', emptyText: '—' },
    { field: 'email', label: 'E-mail', emptyText: '—' },
    { field: 'status', label: 'Situação', type: 'badge', badgeContext: 'user', align: 'center' },
  ];
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
      .subscribe((page) => this.data.set(page));
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
}
