/** Ponto de entrada dos componentes compartilhados — as telas importam daqui. */

export { DataTableComponent, ptBrPaginatorIntl } from './data-table/data-table.component';
export {
  EMPTY_CELL,
  TABLE_DATE_FORMAT,
  resolveFieldValue,
  type ActiveFilter,
  type ColumnAlign,
  type ColumnType,
  type RowAction,
  type RowActionEvent,
  type TableColumn,
} from './data-table/data-table.model';

export { StatusBadgeComponent } from './status-badge/status-badge.component';
export {
  STATUS_CATALOG,
  describeStatus,
  statusLabel,
  statusOptions,
  type BadgeContext,
  type BadgeDescriptor,
  type BadgeTone,
} from './status-badge/status-catalog';

export {
  ConfirmDialogComponent,
  ConfirmDialogService,
  type ConfirmDialogData,
  type ConfirmDialogResult,
  type ConfirmDialogTextField,
} from './confirm-dialog/confirm-dialog.component';

export { PageHeaderComponent, type Breadcrumb } from './page-header/page-header.component';

export { FormFieldErrorComponent } from './form-field-error/form-field-error.component';

export {
  LoadingStateComponent,
  type LoadingVariant,
} from './loading-state/loading-state.component';

export { EmptyStateComponent } from './empty-state/empty-state.component';
