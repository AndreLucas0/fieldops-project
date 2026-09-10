import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { catchError, finalize, of } from 'rxjs';

import { AuthStore, canWrite, isApiError, type ApiError } from '../../core';
import type { InspectionTemplate } from '../../core/models/domain';
import type { PageParams, Sort } from '../../core/models/page.model';
import { emptyPage, type Page } from '../../core/models/page.model';
import { TemplatesService, type TemplateFilters } from '../../core/services/resources';
import {
  DataTableComponent,
  PageHeaderComponent,
  statusOptions,
  type ActiveFilter,
  type TableColumn,
} from '../../shared/components';

/**
 * FE-W13 — Modelos de inspeção (lista).
 *
 * Listagem paginada/filtrável de `InspectionTemplate`, servida por
 * `GET /inspection-templates` (`docs/telas-frontend.md` §3.9). A tela em si
 * não cria nem edita seções/itens — isso é FE-W15, o construtor, que ainda
 * não existe; por ora o botão "Novo modelo" fica desabilitado.
 */
@Component({
  selector: 'app-templates-list',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormsModule,
    RouterLink,
    MatButtonModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatSelectModule,
    DataTableComponent,
    PageHeaderComponent,
  ],
  template: `
    <div class="page">
      <app-page-header
        title="Modelos de inspeção"
        subtitle="Checklists configuráveis e versionados."
      >
        <div actions class="actions">
          @if (canCreate()) {
            <a matButton="filled" routerLink="/inspection-templates/new">
              <mat-icon>add</mat-icon>
              Novo modelo
            </a>
          }
        </div>
      </app-page-header>

      <div class="filters">
        <mat-form-field appearance="outline" subscriptSizing="dynamic">
          <mat-label>Categoria</mat-label>
          <input
            matInput
            [ngModel]="categoryInput()"
            (ngModelChange)="onCategoryChange($event)"
            placeholder="Ex.: Extintores"
          />
        </mat-form-field>

        <mat-form-field appearance="outline" subscriptSizing="dynamic">
          <mat-label>Situação</mat-label>
          <mat-select [ngModel]="statusInput()" (ngModelChange)="onStatusChange($event)">
            <mat-option [value]="null">Todas</mat-option>
            @for (option of statusChoices; track option.value) {
              <mat-option [value]="option.value">{{ option.label }}</mat-option>
            }
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
        ariaLabel="Modelos de inspeção"
        emptyIcon="fact_check"
        emptyTitle="Nenhum modelo encontrado"
        [emptyMessage]="emptyMessage()"
        [emptyActionLabel]="canCreate() ? 'Novo modelo' : null"
        (pageChange)="onPageChange($event)"
        (sortChange)="onSortChange($event)"
        (filterChange)="onFilterChange($event)"
        (emptyAction)="createNew()"
        (retry)="load()"
      />
    </div>
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

    .actions {
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem;
    }

    .filters {
      display: flex;
      flex-wrap: wrap;
      gap: 0.75rem;
      max-width: 32rem;
    }

    .filters mat-form-field {
      flex: 1 1 12rem;
    }
  `,
})
export class TemplatesListComponent {
  private readonly templates = inject(TemplatesService);
  private readonly auth = inject(AuthStore);
  private readonly router = inject(Router);

  protected readonly statusChoices = statusOptions('template');

  protected readonly columns: readonly TableColumn<InspectionTemplate>[] = [
    {
      field: 'title',
      label: 'Título',
      sortable: true,
      type: 'link',
      link: (row) => ['/inspection-templates', row.id],
    },
    { field: 'category', label: 'Categoria', sortable: true },
    {
      field: 'status',
      label: 'Situação',
      type: 'badge',
      badgeContext: 'template',
      align: 'center',
    },
    {
      field: 'currentVersion',
      label: 'Versão atual',
      align: 'center',
      emptyText: 'Nenhuma publicada',
    },
    { field: 'updatedAt', label: 'Atualizado em', type: 'date', sortable: true },
  ];

  protected readonly loading = signal(false);
  protected readonly error = signal<ApiError | null>(null);
  protected readonly data = signal<Page<InspectionTemplate>>(emptyPage());

  protected readonly categoryInput = signal('');
  protected readonly statusInput = signal<string | null>(null);
  private readonly pageParams = signal<PageParams>({ page: 0, size: 20 });

  protected readonly canCreate = computed(() => canWrite('inspection-templates', this.auth.role()));

  protected readonly sort = computed<Sort | null>(() => {
    const value = this.pageParams().sort;
    return value && typeof value === 'object' && !Array.isArray(value) ? (value as Sort) : null;
  });

  protected readonly activeFilters = computed<ActiveFilter[]>(() => {
    const filters: ActiveFilter[] = [];
    const category = this.categoryInput().trim();
    const status = this.statusInput();

    if (category) filters.push({ key: 'category', label: 'Categoria', value: category });
    if (status) {
      const label = this.statusChoices.find((option) => option.value === status)?.label ?? status;
      filters.push({ key: 'status', label: 'Situação', value: label });
    }

    return filters;
  });

  protected readonly emptyMessage = computed(() =>
    this.activeFilters().length > 0
      ? 'Nenhum modelo corresponde aos filtros aplicados.'
      : 'Ainda não há modelos de inspeção cadastrados.',
  );

  constructor() {
    this.load();
  }

  protected load(): void {
    this.loading.set(true);
    this.error.set(null);

    const query = {
      ...this.pageParams(),
      category: this.categoryInput().trim() || undefined,
      status: this.statusInput() ?? undefined,
    } satisfies TemplateFilters & PageParams;

    this.templates
      .list(query)
      .pipe(
        catchError((thrown: unknown) => {
          this.error.set(isApiError(thrown) ? thrown : null);
          return of(emptyPage<InspectionTemplate>(this.pageParams().size));
        }),
        finalize(() => this.loading.set(false)),
      )
      .subscribe((page) => this.data.set(page));
  }

  protected onCategoryChange(value: string): void {
    this.categoryInput.set(value);
    this.pageParams.update((params) => ({ ...params, page: 0 }));
    this.load();
  }

  protected onStatusChange(value: string | null): void {
    this.statusInput.set(value);
    this.pageParams.update((params) => ({ ...params, page: 0 }));
    this.load();
  }

  protected onFilterChange(filters: readonly ActiveFilter[]): void {
    // As etiquetas removidas na tabela precisam voltar a refletir nos campos.
    if (!filters.some((filter) => filter.key === 'category')) this.categoryInput.set('');
    if (!filters.some((filter) => filter.key === 'status')) this.statusInput.set(null);
    this.pageParams.update((params) => ({ ...params, page: 0 }));
    this.load();
  }

  protected onPageChange(params: PageParams): void {
    this.pageParams.update((current) => ({ ...current, ...params }));
    this.load();
  }

  protected onSortChange(sort: Sort | null): void {
    this.pageParams.update((current) => ({ ...current, sort: sort ?? undefined }));
    this.load();
  }

  protected createNew(): void {
    if (!this.canCreate()) return;
    void this.router.navigate(['/inspection-templates/new']);
  }
}