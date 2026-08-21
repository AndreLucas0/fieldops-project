/**
 * Entidades devolvidas pela API (`openapi.yaml` §components.schemas).
 *
 * Convenção de tradução do contrato: campo em `required` vira propriedade
 * obrigatória; campo `nullable: true` recebe `| null`; campo fora de
 * `required` vira opcional.
 */

import type { IsoDate, IsoDateTime, JsonObject, Uuid } from './common';
import type {
  ActiveStatus,
  Conformity,
  EquipmentStatus,
  EvidenceType,
  InspectionPriority,
  InspectionStatus,
  NonConformityStatus,
  ResponseType,
  ReviewDecision,
  Severity,
  TemplateStatus,
  UserRole,
  UserStatus,
} from './enums';

// ---------- Usuários ----------

export interface User {
  id: Uuid;
  name: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  phone?: string | null;
  createdAt: IsoDateTime;
  updatedAt: IsoDateTime;
  /** Controle otimista — enviado de volta como `baseVersion` na edição. */
  version: number;
}

// ---------- Clientes ----------

export interface Client {
  id: Uuid;
  name: string;
  legalName?: string | null;
  document?: string | null;
  email?: string | null;
  phone?: string | null;
  status: ActiveStatus;
  createdAt: IsoDateTime;
  updatedAt: IsoDateTime;
  version: number;
}

// ---------- Locais ----------

export interface InspectionSite {
  id: Uuid;
  clientId: Uuid;
  name: string;
  description?: string | null;
  addressLine?: string | null;
  city?: string | null;
  state?: string | null;
  postalCode?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  contactName?: string | null;
  contactPhone?: string | null;
  status: ActiveStatus;
  createdAt: IsoDateTime;
  updatedAt: IsoDateTime;
  version: number;
}

// ---------- Equipamentos ----------

export interface Equipment {
  id: Uuid;
  siteId: Uuid;
  name: string;
  assetNumber?: string | null;
  serialNumber?: string | null;
  manufacturer?: string | null;
  model?: string | null;
  description?: string | null;
  /** Conteúdo lido do QR Code em campo (UC-06). */
  qrCode: string;
  status: EquipmentStatus;
  installedAt?: IsoDate | null;
  createdAt: IsoDateTime;
  updatedAt: IsoDateTime;
  version: number;
}

// ---------- Modelos de inspeção ----------

export interface InspectionTemplate {
  id: Uuid;
  title: string;
  description?: string | null;
  category: string;
  status: TemplateStatus;
  currentVersion?: number | null;
  createdBy?: Uuid;
  createdAt: IsoDateTime;
  updatedAt: IsoDateTime;
  version: number;
}

export interface InspectionTemplateVersion {
  id: Uuid;
  templateId: Uuid;
  versionNumber: number;
  titleSnapshot: string;
  descriptionSnapshot?: string | null;
  publishedBy: Uuid;
  publishedAt: IsoDateTime;
  activeForNewInspections?: boolean;
  createdAt: IsoDateTime;
}

export interface TemplateItem {
  id: Uuid;
  sectionId: Uuid;
  code?: string | null;
  title: string;
  description?: string | null;
  responseType: ResponseType;
  required: boolean;
  observationRequiredOnFailure?: boolean;
  evidenceRequiredOnFailure?: boolean;
  /** Configuração específica do tipo (ex. opções de `SINGLE_CHOICE`). */
  optionsJson?: JsonObject | null;
  displayOrder: number;
  createdAt: IsoDateTime;
}

export interface TemplateSection {
  id: Uuid;
  templateVersionId: Uuid;
  title: string;
  description?: string | null;
  displayOrder: number;
  createdAt: IsoDateTime;
}

export interface TemplateSectionDetail extends TemplateSection {
  items?: TemplateItem[];
}

export interface InspectionTemplateVersionDetail extends InspectionTemplateVersion {
  sections?: TemplateSectionDetail[];
}

// ---------- Inspeções ----------

export interface Inspection {
  id: Uuid;
  templateVersionId: Uuid;
  clientId: Uuid;
  siteId: Uuid;
  equipmentId?: Uuid | null;
  technicianId: Uuid;
  supervisorId?: Uuid | null;
  createdBy?: Uuid;
  title?: string | null;
  instructions?: string | null;
  priority: InspectionPriority;
  status: InspectionStatus;
  scheduledFor: IsoDateTime;
  startedAtDevice?: IsoDateTime | null;
  startedAtServer?: IsoDateTime | null;
  completedAtDevice?: IsoDateTime | null;
  submittedAtServer?: IsoDateTime | null;
  approvedAt?: IsoDateTime | null;
  canceledAt?: IsoDateTime | null;
  canceledBy?: Uuid | null;
  canceledReason?: string | null;
  createdAt: IsoDateTime;
  updatedAt: IsoDateTime;
  version: number;
}

/**
 * Cópia imutável do item do modelo no momento do agendamento (§10.8.3): o
 * checklist exibido em campo não muda se o modelo for republicado depois.
 */
export interface InspectionItemSnapshot {
  id: Uuid;
  inspectionId: Uuid;
  sourceTemplateItemId?: Uuid | null;
  sectionTitle: string;
  sectionDescription?: string | null;
  sectionOrder: number;
  itemCode?: string | null;
  itemTitle: string;
  itemDescription?: string | null;
  responseType: ResponseType;
  required: boolean;
  rulesJson?: JsonObject | null;
  optionsJson?: JsonObject | null;
  itemOrder: number;
  createdAt: IsoDateTime;
}

export interface InspectionResponse {
  id: Uuid;
  inspectionId?: Uuid;
  inspectionItemId: Uuid;
  valueText?: string | null;
  valueNumber?: number | null;
  valueBoolean?: boolean | null;
  valueDate?: IsoDate | null;
  valueJson?: JsonObject | null;
  observation?: string | null;
  conformity?: Conformity;
  answeredBy?: Uuid;
  answeredAtDevice: IsoDateTime;
  serverReceivedAt?: IsoDateTime | null;
  createdAt: IsoDateTime;
  updatedAt: IsoDateTime;
  /** Base para detectar conflito na próxima edição (RN-075). */
  version: number;
}

export interface Evidence {
  id: Uuid;
  inspectionId: Uuid;
  responseId?: Uuid | null;
  nonConformityId?: Uuid | null;
  type: EvidenceType;
  storageKey?: string;
  /** URL temporária de acesso ao arquivo (§11.8). */
  accessUrl?: string;
  mimeType: string;
  sizeBytes: number;
  checksum?: string | null;
  description?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  capturedAtDevice: IsoDateTime;
  serverReceivedAt?: IsoDateTime | null;
  uploadedAt?: IsoDateTime | null;
  createdBy?: Uuid;
  createdAt: IsoDateTime;
}

export interface NonConformity {
  id: Uuid;
  inspectionId: Uuid;
  inspectionItemId?: Uuid | null;
  responseId?: Uuid | null;
  title: string;
  description: string;
  severity: Severity;
  status: NonConformityStatus;
  createdBy?: Uuid;
  createdAtDevice: IsoDateTime;
  serverReceivedAt?: IsoDateTime | null;
  createdAt: IsoDateTime;
  updatedAt: IsoDateTime;
  version: number;
}

export interface InspectionReview {
  id: Uuid;
  inspectionId: Uuid;
  reviewerId: Uuid;
  decision: ReviewDecision;
  /** Obrigatório quando `decision` é `REJECTED` (RN-080). */
  reason?: string | null;
  comments?: string | null;
  reviewedAt: IsoDateTime;
  reviewCycle: number;
  createdAt: IsoDateTime;
}

/** Detalhe completo baixado para execução em campo (UC-07). */
export interface InspectionDetail extends Inspection {
  items?: InspectionItemSnapshot[];
  responses?: InspectionResponse[];
  nonConformities?: NonConformity[];
  reviews?: InspectionReview[];
}

// ---------- Auditoria ----------

export interface AuditEvent {
  id: Uuid;
  inspectionId?: Uuid | null;
  actorId?: Uuid | null;
  action: string;
  entityType: string;
  entityId: Uuid;
  occurredAt: IsoDateTime;
  deviceOccurredAt?: IsoDateTime | null;
  previousValueJson?: JsonObject | null;
  newValueJson?: JsonObject | null;
  metadataJson?: JsonObject | null;
  requestId?: string | null;
  deviceId?: string | null;
}

// ---------- Indicadores ----------

export interface DashboardSummary {
  totalInspections?: number;
  inspectionsInProgress?: number;
  inspectionsPendingReview?: number;
  inspectionsOverdue?: number;
  inspectionsApproved?: number;
  inspectionsRejected?: number;
  nonConformitiesOpen?: number;
}

export interface StatusCount {
  status: InspectionStatus;
  count: number;
}

export interface SeverityCount {
  severity: Severity;
  count: number;
}
