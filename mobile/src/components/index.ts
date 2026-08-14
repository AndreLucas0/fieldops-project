/**
 * Componentes de domínio do aplicativo de campo.
 *
 * Construídos sobre `@/design-system` (tokens, Text, Button, Icon): a paleta
 * escura e o alvo de toque de 48 px vêm de lá, e nenhuma biblioteca de UI
 * externa é usada — ver `README.md` desta pasta.
 */

export { InspectionCard, inspectionTitle, type InspectionCardProps } from './InspectionCard';

export { StatusBadge, type StatusBadgeProps } from './StatusBadge';
export {
  STATUS_CATALOG,
  describeStatus,
  statusLabel,
  type BadgeContext,
  type BadgeDescriptor,
  type BadgeTone,
} from './status-catalog';

export { ProgressBar, progressState, type ProgressBarProps } from './ProgressBar';

export { FilterChips, type FilterChipOption, type FilterChipsProps } from './FilterChips';

export {
  ChecklistItemRenderer,
  parseDecimal,
  type ChecklistItemRendererProps,
} from './ChecklistItemRenderer';
export {
  countAnswered,
  isAnswered,
  isComplete,
  readChecklistRules,
  readChoiceOptions,
  requiresEvidence,
  requiresObservation,
  toChecklistValue,
  type ChecklistRules,
  type ChecklistValue,
  type ChoiceOption,
} from './checklist-value';

export { DateField, toIsoDate, type DateFieldProps } from './DateField';

export {
  EvidenceThumbnailGrid,
  type EvidenceThumbnailGridProps,
} from './EvidenceThumbnailGrid';

export { SectionAccordion, type SectionAccordionProps } from './SectionAccordion';

export {
  EmptyState,
  ErrorState,
  LoadingSpinner,
  type EmptyStateProps,
  type ErrorStateProps,
  type LoadingSpinnerProps,
} from './StateViews';

export {
  calendarDaysBetween,
  formatDate,
  formatDateTime,
  formatScheduledFor,
  formatTime,
  isOverdue,
  parseIsoDate,
} from './relative-date';
