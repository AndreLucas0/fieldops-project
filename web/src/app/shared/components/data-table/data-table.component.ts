import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatChipsModule } from '@angular/material/chips';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatPaginatorIntl, MatPaginatorModule, type PageEvent } from '@angular/material/paginator';
import { MatSortModule, type Sort as MatSortEvent } from '@angular/material/sort';
import { MatTableModule } from '@angular/material/table';

import type { ApiError, Page, PageParams, Sort, SortDirection } from '../../../core';
import { EmptyStateComponent } from '../empty-state/empty-state.component';
import { LoadingStateComponent } from '../loading-state/loading-state.component';
import { StatusBadgeComponent } from '../status-badge/status-badge.component';
import type { BadgeContext } from '../status-badge/status-catalog';
import {
  EMPTY_CELL,
  TABLE_DATE_FORMAT,
  resolveFieldValue,
  type ActiveFilter,
  type RowAction,
  type RowActionEvent,
  type TableColumn,
} from './data-table.model';

/** Rótulos do paginador em português. */
export function ptBrPaginatorIntl(): MatPaginatorIntl {
  const intl = new MatPaginatorIntl();
  intl.itemsPerPageLabel = 'Itens por página';
  intl.nextPageLabel = 'Próxima página';
  intl.previousPageLabel = 'Página anterior';
  intl.firstPageLabel = 'Primeira página';
  intl.lastPageLabel = 'Última página';
  intl.getRangeLabel = (page: number, pageSize: number, length: number): string => {
    if (length === 0 || pageSize === 0) return `0 de ${length}`;

    const start = page * pageSize;
    // A última página costuma ter menos itens que `pageSize`.
    const end = Math.min(start + pageSize, length);
    return `${start + 1} – ${end} de ${length}`;
  };
  return intl;
}

/**
 * Tabela paginada genérica das listagens administrativas.
 *
 * Paginação e ordenação são do servidor (`contrato-backend-frontend.md` §9):
 * o componente apenas emite a intenção e volta a renderizar quando a tela
 * entrega a nova `Page<T>`.
 *
 * ```html
 * <app-data-table
 *   [columns]="colunas"
 *   [data]="pagina()"
 *   [loading]="carregando()"
 *   [error]="erro()"
 *   [activeFilters]="filtros()"
 *   (pageChange)="carregar($event)"
 *   (sortChange)="ordenar($event)"
 *   (rowAction)="executar($event)"
 *   (retry)="carregar()" />
 * ```
 */
@Component({
  selector: 'app-data-table',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    DatePipe,
    RouterLink,
    MatButtonModule,
    MatChipsModule,
    MatIconModule,
    MatMenuModule,
    MatPaginatorModule,
    MatSortModule,
    MatTableModule,
    EmptyStateComponent,
    LoadingStateComponent,
    StatusBadgeComponent,
  ],
  providers: [{ provide: MatPaginatorIntl, useFactory: ptBrPaginatorIntl }],
  templateUrl: './data-table.component.html',
  styleUrl: './data-table.component.scss',
})
export class DataTableComponent<T> {
  readonly columns = input.required<readonly TableColumn<T>[]>();

  /** Página devolvida pela API. `null` enquanto a primeira busca não volta. */
  readonly data = input<Page<T> | null>(null);

  readonly loading = input(false);

  /** Falha da última busca; substitui o conteúdo pelo bloco de erro. */
  readonly error = input<ApiError | null>(null);

  /** Filtros em vigor, exibidos como etiquetas removíveis. */
  readonly activeFilters = input<readonly ActiveFilter[]>([]);

  /** Ordenação atual, para o cabeçalho mostrar a seta certa. */
  readonly sort = input<Sort | null>(null);

  readonly pageSizeOptions = input<readonly number[]>([10, 20, 50, 100]);

  /** Linhas do esqueleto durante o carregamento. */
  readonly skeletonRows = input(5);

  readonly emptyIcon = input('inbox');
  readonly emptyTitle = input('Nenhum registro');
  readonly emptyMessage = input('');
  /** Sem rótulo, o estado vazio não exibe botão. */
  readonly emptyActionLabel = input<string | null>(null);

  /** Descrição da tabela para leitores de tela. */
  readonly ariaLabel = input('Listagem');

  readonly pageChange = output<PageParams>();
  readonly sortChange = output<Sort | null>();
  /** Emite os filtros que sobraram após a remoção. */
  readonly filterChange = output<readonly ActiveFilter[]>();
  readonly rowAction = output<RowActionEvent<T>>();
  readonly emptyAction = output<void>();
  readonly retry = output<void>();

  protected readonly dateFormat = TABLE_DATE_FORMAT;

  /** `MatTable` exige um array mutável. */
  protected readonly rows = computed<T[]>(() => [...(this.data()?.content ?? [])]);

  protected readonly displayedColumns = computed(() =>
    this.columns().map((column) => column.field),
  );

  protected readonly total = computed(() => this.data()?.totalElements ?? 0);
  protected readonly pageIndex = computed(() => this.data()?.page ?? 0);
  protected readonly pageSize = computed(() => this.data()?.size ?? 20);
  protected readonly pageSizes = computed(() => [...this.pageSizeOptions()]);

  protected readonly sortField = computed(() => this.sort()?.field ?? '');
  protected readonly sortDirection = computed<SortDirection | ''>(
    () => this.sort()?.direction ?? '',
  );

  /**
   * Erro tem precedência sobre carregamento: uma nova tentativa que falha não
   * deve deixar o esqueleto na tela.
   */
  protected readonly showError = computed(() => this.error() !== null);
  protected readonly showLoading = computed(() => !this.showError() && this.loading());
  protected readonly showEmpty = computed(
    () => !this.showError() && !this.showLoading() && this.rows().length === 0,
  );
  protected readonly showTable = computed(
    () => !this.showError() && !this.showLoading() && this.rows().length > 0,
  );

  /** Sem resultado não há o que paginar. */
  protected readonly showPaginator = computed(() => this.showTable() && this.total() > 0);

  protected readonly errorMessage = computed(
    () => this.error()?.userMessage ?? 'Não foi possível carregar os dados.',
  );
  protected readonly errorRequestId = computed(() => this.error()?.requestId ?? null);

  // ---------- Células ----------

  protected columnType(column: TableColumn<T>): string {
    return column.type ?? 'text';
  }

  protected cellText(column: TableColumn<T>, row: T): string {
    const raw = resolveFieldValue(row, column.field);
    if (column.format) return column.format(raw, row);
    if (raw == null || raw === '') return column.emptyText ?? EMPTY_CELL;
    return String(raw);
  }

  protected badgeValue(column: TableColumn<T>, row: T): string | null {
    const raw = resolveFieldValue(row, column.field);
    return raw == null ? null : String(raw);
  }

  /** Coluna `badge` sem contexto declarado cai em `inspection`. */
  protected badgeContext(column: TableColumn<T>): BadgeContext {
    return column.badgeContext ?? 'inspection';
  }

  protected dateValue(column: TableColumn<T>, row: T): Date | string | number | null {
    const raw = resolveFieldValue(row, column.field);
    if (raw instanceof Date) return raw;
    if (typeof raw === 'string' && raw !== '') return raw;
    if (typeof raw === 'number') return raw;
    return null;
  }

  protected linkFor(column: TableColumn<T>, row: T): string | unknown[] {
    return column.link?.(row) ?? [];
  }

  protected emptyText(column: TableColumn<T>): string {
    return column.emptyText ?? EMPTY_CELL;
  }

  protected visibleActions(column: TableColumn<T>, row: T): readonly RowAction<T>[] {
    return (column.actions ?? []).filter((action) => action.visible?.(row) ?? true);
  }

  protected isActionDisabled(action: RowAction<T>, row: T): boolean {
    return action.disabled?.(row) ?? false;
  }

  // ---------- Eventos ----------

  protected onPage(event: PageEvent): void {
    this.pageChange.emit({ page: event.pageIndex, size: event.pageSize });
  }

  protected onSort(event: MatSortEvent): void {
    // Direção vazia é o terceiro clique do Material: volta à ordem natural.
    this.sortChange.emit(
      event.direction ? { field: event.active, direction: event.direction } : null,
    );
  }

  protected removeFilter(filter: ActiveFilter): void {
    this.filterChange.emit(this.activeFilters().filter((entry) => entry.key !== filter.key));
  }

  protected clearFilters(): void {
    this.filterChange.emit([]);
  }
}
