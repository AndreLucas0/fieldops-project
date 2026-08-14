/**
 * Enums do contrato REST — espelham `openapi.yaml` §components.schemas.
 *
 * Cada enum é declarado como tupla `as const` mais o tipo derivado: o array
 * serve para validar carga vinda da rede em tempo de execução, o tipo serve
 * para o compilador. `enum` do TypeScript não é usado porque gera objeto em
 * runtime e não sobrevive bem a `JSON.parse`.
 */

/** Perfis de acesso (docs/perfis-de-usuario.md §5.1). */
export const USER_ROLES = ['ADMIN', 'SUPERVISOR', 'TECHNICIAN', 'CLIENT_VIEWER'] as const;
export type UserRole = (typeof USER_ROLES)[number];

export const USER_STATUSES = ['ACTIVE', 'INACTIVE', 'BLOCKED'] as const;
export type UserStatus = (typeof USER_STATUSES)[number];

/** Situação genérica de cliente e local. */
export const ACTIVE_STATUSES = ['ACTIVE', 'INACTIVE'] as const;
export type ActiveStatus = (typeof ACTIVE_STATUSES)[number];

export const EQUIPMENT_STATUSES = ['ACTIVE', 'INACTIVE', 'DECOMMISSIONED'] as const;
export type EquipmentStatus = (typeof EQUIPMENT_STATUSES)[number];

export const TEMPLATE_STATUSES = ['DRAFT', 'ACTIVE', 'INACTIVE'] as const;
export type TemplateStatus = (typeof TEMPLATE_STATUSES)[number];

/**
 * Tipos de resposta obrigatórios do MVP (funcionalidades.md §8.5). Tipos P1
 * (seleção múltipla, assinatura, localização como resposta) ficam fora até
 * entrarem em escopo — RN-023 proíbe publicar modelo com tipo que o app não
 * sabe renderizar.
 */
export const RESPONSE_TYPES = [
  'TEXT_SHORT',
  'TEXT_LONG',
  'NUMBER',
  'BOOLEAN',
  'CONFORMITY',
  'SINGLE_CHOICE',
  'DATE',
] as const;
export type ResponseType = (typeof RESPONSE_TYPES)[number];

export const INSPECTION_PRIORITIES = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] as const;
export type InspectionPriority = (typeof INSPECTION_PRIORITIES)[number];

/** Alias pedido pelas telas; `InspectionPriority` é o nome do contrato. */
export type Priority = InspectionPriority;

/**
 * Estado de negócio da inspeção (fluxo-geral.md §7.4). Não confundir com
 * estado de envio: este app fala direto com a API, não há fila local.
 */
export const INSPECTION_STATUSES = [
  'DRAFT',
  'ASSIGNED',
  'IN_PROGRESS',
  'SUBMITTED',
  'UNDER_REVIEW',
  'APPROVED',
  'REJECTED',
  'CANCELED',
] as const;
export type InspectionStatus = (typeof INSPECTION_STATUSES)[number];

export const CONFORMITIES = ['NOT_APPLICABLE', 'CONFORMING', 'NON_CONFORMING'] as const;
export type Conformity = (typeof CONFORMITIES)[number];

export const SEVERITIES = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] as const;
export type Severity = (typeof SEVERITIES)[number];

/** No MVP somente `OPEN` é utilizado (RN-057). */
export const NON_CONFORMITY_STATUSES = ['OPEN'] as const;
export type NonConformityStatus = (typeof NON_CONFORMITY_STATUSES)[number];

export const REVIEW_DECISIONS = ['APPROVED', 'REJECTED'] as const;
export type ReviewDecision = (typeof REVIEW_DECISIONS)[number];

export const EVIDENCE_TYPES = ['PHOTO'] as const;
export type EvidenceType = (typeof EVIDENCE_TYPES)[number];

export const SYNC_ENTITY_TYPES = [
  'INSPECTION',
  'INSPECTION_RESPONSE',
  'EVIDENCE',
  'NON_CONFORMITY',
] as const;
export type SyncEntityType = (typeof SYNC_ENTITY_TYPES)[number];

export const SYNC_OPERATION_TYPES = ['UPSERT', 'DELETE'] as const;
export type SyncOperationType = (typeof SYNC_OPERATION_TYPES)[number];

/**
 * Resultado por operação. Continua no contrato porque
 * `POST /inspections/{id}/responses:batch` devolve estes valores — o envio em
 * lote é uma chamada normal, não um motor de sincronização.
 */
export const SYNC_OPERATION_STATUSES = [
  'APPLIED',
  'ALREADY_APPLIED',
  'REJECTED',
  'CONFLICT',
  'DEPENDENCY_FAILED',
] as const;
export type SyncOperationStatus = (typeof SYNC_OPERATION_STATUSES)[number];

/** Guarda de tipo para validar valor recebido da rede contra um enum. */
export function isEnumValue<T extends string>(
  allowed: readonly T[],
  value: unknown,
): value is T {
  return typeof value === 'string' && (allowed as readonly string[]).includes(value);
}

/** Perfis autorizados a operar o aplicativo de campo (docs §5.2). */
export const FIELD_APP_ROLES: readonly UserRole[] = ['TECHNICIAN', 'SUPERVISOR', 'ADMIN'];

export function canUseFieldApp(role: UserRole): boolean {
  return FIELD_APP_ROLES.includes(role);
}
