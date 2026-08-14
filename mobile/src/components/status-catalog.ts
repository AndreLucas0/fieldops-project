/**
 * Rótulo em português e cor de cada valor de enum exibido como etiqueta.
 *
 * Mesmo mapeamento da interface administrativa (`web/src/app/shared/components/
 * status-badge/status-catalog.ts`): o mesmo estado precisa ter o mesmo nome e a
 * mesma cor nas duas pontas do produto.
 *
 * Cada contexto é tipado pelo enum correspondente, então esquecer um valor novo
 * quebra a compilação em vez de aparecer sem tradução na tela.
 */

import type {
  Conformity,
  EquipmentStatus,
  InspectionPriority,
  InspectionStatus,
  Severity,
  TemplateStatus,
  UserStatus,
} from '@/models';

export type BadgeContext =
  | 'inspection'
  | 'template'
  | 'user'
  | 'equipment'
  | 'priority'
  | 'severity'
  | 'conformity';

/**
 * Cor lógica da etiqueta. Nomes de cor, e não de significado, porque o mesmo
 * tom serve a contextos diferentes (`CRITICAL` e `REJECTED` são vermelhos).
 */
export type BadgeTone =
  | 'gray'
  | 'grayDark'
  | 'blue'
  | 'yellow'
  | 'orange'
  | 'indigo'
  | 'purple'
  | 'green'
  | 'red'
  | 'redDark';

export interface BadgeDescriptor {
  label: string;
  tone: BadgeTone;
}

/** Rótulos de `docs/telas-frontend.md` §17.1. */
const INSPECTION: Record<InspectionStatus, BadgeDescriptor> = {
  DRAFT: { label: 'Rascunho', tone: 'gray' },
  ASSIGNED: { label: 'Atribuída', tone: 'blue' },
  IN_PROGRESS: { label: 'Em andamento', tone: 'yellow' },
  SUBMITTED: { label: 'Enviada', tone: 'indigo' },
  UNDER_REVIEW: { label: 'Em revisão', tone: 'purple' },
  APPROVED: { label: 'Aprovada', tone: 'green' },
  // O documento sugere "Reprovada — requer correção"; a etiqueta usa a forma
  // curta, e a tela de detalhe mostra o motivo da recusa.
  REJECTED: { label: 'Reprovada', tone: 'red' },
  CANCELED: { label: 'Cancelada', tone: 'grayDark' },
};

const TEMPLATE: Record<TemplateStatus, BadgeDescriptor> = {
  DRAFT: { label: 'Rascunho', tone: 'gray' },
  ACTIVE: { label: 'Ativo', tone: 'green' },
  INACTIVE: { label: 'Inativo', tone: 'grayDark' },
};

const USER: Record<UserStatus, BadgeDescriptor> = {
  ACTIVE: { label: 'Ativo', tone: 'green' },
  INACTIVE: { label: 'Inativo', tone: 'gray' },
  BLOCKED: { label: 'Bloqueado', tone: 'red' },
};

/** "Baixado" evita confusão com "Inativo". */
const EQUIPMENT: Record<EquipmentStatus, BadgeDescriptor> = {
  ACTIVE: { label: 'Ativo', tone: 'green' },
  INACTIVE: { label: 'Inativo', tone: 'gray' },
  DECOMMISSIONED: { label: 'Baixado', tone: 'redDark' },
};

const PRIORITY: Record<InspectionPriority, BadgeDescriptor> = {
  LOW: { label: 'Baixa', tone: 'gray' },
  MEDIUM: { label: 'Média', tone: 'yellow' },
  HIGH: { label: 'Alta', tone: 'orange' },
  CRITICAL: { label: 'Crítica', tone: 'red' },
};

const SEVERITY: Record<Severity, BadgeDescriptor> = {
  LOW: { label: 'Baixa', tone: 'gray' },
  MEDIUM: { label: 'Média', tone: 'yellow' },
  HIGH: { label: 'Alta', tone: 'orange' },
  CRITICAL: { label: 'Crítica', tone: 'red' },
};

const CONFORMITY: Record<Conformity, BadgeDescriptor> = {
  CONFORMING: { label: 'Conforme', tone: 'green' },
  NON_CONFORMING: { label: 'Não conforme', tone: 'red' },
  NOT_APPLICABLE: { label: 'Não aplicável', tone: 'gray' },
};

export const STATUS_CATALOG: Record<BadgeContext, Record<string, BadgeDescriptor>> = {
  inspection: INSPECTION,
  template: TEMPLATE,
  user: USER,
  equipment: EQUIPMENT,
  priority: PRIORITY,
  severity: SEVERITY,
  conformity: CONFORMITY,
};

/**
 * Descreve um valor de enum. Valor desconhecido não quebra a tela: aparece
 * como veio, em cinza — um estado novo no servidor mantém a lista legível.
 */
export function describeStatus(
  context: BadgeContext,
  value: string | null | undefined,
): BadgeDescriptor {
  if (value == null || value === '') return { label: '—', tone: 'gray' };
  return STATUS_CATALOG[context][value] ?? { label: value, tone: 'gray' };
}

/** Só o rótulo, para resumos e filtros. */
export function statusLabel(context: BadgeContext, value: string | null | undefined): string {
  return describeStatus(context, value).label;
}
