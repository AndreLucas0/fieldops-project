/**
 * Rótulo em português e cor de cada valor de enum exibido como etiqueta.
 *
 * Fonte normativa dos rótulos de inspeção: `docs/telas-frontend.md` §17.1.
 * Os enums são os de `openapi.yaml` §components.schemas.
 *
 * Este catálogo é a única lista da aplicação: telas não devem traduzir enum
 * por conta própria, senão o mesmo estado aparece com dois nomes diferentes.
 */

/** Conjunto de valores ao qual a etiqueta pertence. */
export type BadgeContext =
  'inspection' | 'template' | 'user' | 'equipment' | 'priority' | 'severity' | 'conformity';

/**
 * Cor lógica da etiqueta. Nomes de cor, e não de significado, porque o mesmo
 * tom serve a contextos diferentes (`CRITICAL` e `REJECTED` são ambos vermelhos).
 */
export type BadgeTone =
  | 'gray'
  | 'gray-dark'
  | 'blue'
  | 'yellow'
  | 'orange'
  | 'indigo'
  | 'purple'
  | 'green'
  | 'red'
  | 'red-dark';

export interface BadgeDescriptor {
  label: string;
  tone: BadgeTone;
}

type ContextCatalog = Readonly<Record<string, BadgeDescriptor>>;

/** `InspectionStatus` — rótulos de `docs/telas-frontend.md` §17.1. */
const INSPECTION: ContextCatalog = {
  DRAFT: { label: 'Rascunho', tone: 'gray' },
  ASSIGNED: { label: 'Atribuída', tone: 'blue' },
  IN_PROGRESS: { label: 'Em andamento', tone: 'yellow' },
  SUBMITTED: { label: 'Enviada', tone: 'indigo' },
  UNDER_REVIEW: { label: 'Em revisão', tone: 'purple' },
  APPROVED: { label: 'Aprovada', tone: 'green' },
  // O documento sugere "Reprovada — requer correção"; a etiqueta usa a forma
  // curta para caber na célula da tabela, e a tela de detalhe exibe o motivo.
  REJECTED: { label: 'Reprovada', tone: 'red' },
  CANCELED: { label: 'Cancelada', tone: 'gray-dark' },
};

/** `TemplateStatus` — ciclo de publicação do modelo (RN-018 a RN-022). */
const TEMPLATE: ContextCatalog = {
  DRAFT: { label: 'Rascunho', tone: 'gray' },
  ACTIVE: { label: 'Ativo', tone: 'green' },
  INACTIVE: { label: 'Inativo', tone: 'gray-dark' },
};

/** `UserStatus` — `docs/perfis-de-usuario.md` §5.4. */
const USER: ContextCatalog = {
  ACTIVE: { label: 'Ativo', tone: 'green' },
  INACTIVE: { label: 'Inativo', tone: 'gray' },
  BLOCKED: { label: 'Bloqueado', tone: 'red' },
};

/** `EquipmentStatus`. "Baixado" evita confusão com "Inativo". */
const EQUIPMENT: ContextCatalog = {
  ACTIVE: { label: 'Ativo', tone: 'green' },
  INACTIVE: { label: 'Inativo', tone: 'gray' },
  DECOMMISSIONED: { label: 'Baixado', tone: 'red-dark' },
};

/** `InspectionPriority`. */
const PRIORITY: ContextCatalog = {
  LOW: { label: 'Baixa', tone: 'gray' },
  MEDIUM: { label: 'Média', tone: 'yellow' },
  HIGH: { label: 'Alta', tone: 'orange' },
  CRITICAL: { label: 'Crítica', tone: 'red' },
};

/** `Severity` — mesmos valores de prioridade, aplicados à não conformidade. */
const SEVERITY: ContextCatalog = {
  LOW: { label: 'Baixa', tone: 'gray' },
  MEDIUM: { label: 'Média', tone: 'yellow' },
  HIGH: { label: 'Alta', tone: 'orange' },
  CRITICAL: { label: 'Crítica', tone: 'red' },
};

/** `Conformity` — resultado do item do checklist. */
const CONFORMITY: ContextCatalog = {
  CONFORMING: { label: 'Conforme', tone: 'green' },
  NON_CONFORMING: { label: 'Não conforme', tone: 'red' },
  NOT_APPLICABLE: { label: 'Não aplicável', tone: 'gray' },
};

export const STATUS_CATALOG: Readonly<Record<BadgeContext, ContextCatalog>> = {
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
 * como veio, em cinza — se o backend passar a devolver um estado novo, a
 * listagem continua legível até o catálogo ser atualizado.
 */
export function describeStatus(
  context: BadgeContext,
  value: string | null | undefined,
): BadgeDescriptor {
  if (value == null || value === '') {
    return { label: '—', tone: 'gray' };
  }

  return STATUS_CATALOG[context][value] ?? { label: value, tone: 'gray' };
}

/** Rótulo em português de um valor, sem a etiqueta — para filtros e resumos. */
export function statusLabel(context: BadgeContext, value: string | null | undefined): string {
  return describeStatus(context, value).label;
}

/** Todos os valores de um contexto, na ordem do catálogo — alimenta selects. */
export function statusOptions(
  context: BadgeContext,
): readonly { value: string; label: string; tone: BadgeTone }[] {
  return Object.entries(STATUS_CATALOG[context]).map(([value, descriptor]) => ({
    value,
    label: descriptor.label,
    tone: descriptor.tone,
  }));
}
