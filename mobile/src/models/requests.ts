/**
 * DTOs de escrita e filtros de leitura (`openapi.yaml` §components.schemas).
 * Os DTOs de autenticação ficam em `./auth`.
 */

import type { GeoLocation, IsoDate, IsoDateTime, JsonObject, PageQuery, Uuid } from './common';
import type {
  ActiveStatus,
  Conformity,
  EquipmentStatus,
  EvidenceType,
  InspectionPriority,
  InspectionStatus,
  NonConformityStatus,
  ResponseType,
  Severity,
  SyncOperationStatus,
  UserRole,
  UserStatus,
} from './enums';
import type { ApiErrorBody } from './errors';

// ---------- Usuários ----------

export interface UserCreateRequest {
  name: string;
  email: string;
  password: string;
  role: UserRole;
  phone?: string | null;
}

export interface UserUpdateRequest {
  name: string;
  email: string;
  role: UserRole;
  phone?: string | null;
}

export interface UserStatusUpdateRequest {
  status: UserStatus;
}

// ---------- Clientes ----------

export interface ClientCreateRequest {
  name: string;
  legalName?: string | null;
  document?: string | null;
  email?: string | null;
  phone?: string | null;
}

export type ClientUpdateRequest = ClientCreateRequest;

/** Ativação/inativação de cliente e de local. */
export interface StatusUpdateRequest {
  status: ActiveStatus;
}

// ---------- Locais ----------

export interface SiteCreateRequest {
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
}

/** `clientId` não é editável por decisão de contrato (normalização nº 6). */
export type SiteUpdateRequest = Omit<SiteCreateRequest, 'clientId'>;

// ---------- Equipamentos ----------

export interface EquipmentCreateRequest {
  siteId: Uuid;
  name: string;
  qrCode: string;
  assetNumber?: string | null;
  serialNumber?: string | null;
  manufacturer?: string | null;
  model?: string | null;
  description?: string | null;
  installedAt?: IsoDate | null;
}

/** `siteId` e `qrCode` não são editáveis (normalização nº 6). */
export type EquipmentUpdateRequest = Omit<EquipmentCreateRequest, 'siteId' | 'qrCode'>;

export interface EquipmentStatusUpdateRequest {
  status: EquipmentStatus;
}

// ---------- Modelos de inspeção ----------

export interface InspectionTemplateCreateRequest {
  title: string;
  description?: string | null;
  category: string;
}

export type InspectionTemplateUpdateRequest = InspectionTemplateCreateRequest;

export interface TemplateSectionCreateRequest {
  title: string;
  description?: string | null;
  displayOrder: number;
}

export type TemplateSectionUpdateRequest = TemplateSectionCreateRequest;

export interface TemplateItemCreateRequest {
  code?: string | null;
  title: string;
  description?: string | null;
  responseType: ResponseType;
  required?: boolean;
  observationRequiredOnFailure?: boolean;
  evidenceRequiredOnFailure?: boolean;
  optionsJson?: JsonObject | null;
  displayOrder: number;
}

export type TemplateItemUpdateRequest = TemplateItemCreateRequest;

// ---------- Inspeções ----------

export interface InspectionCreateRequest {
  templateVersionId: Uuid;
  clientId: Uuid;
  siteId: Uuid;
  /** Obrigatório salvo quando o modelo é destinado a local/ambiente (RN-026). */
  equipmentId?: Uuid | null;
  technicianId: Uuid;
  supervisorId?: Uuid | null;
  title?: string | null;
  instructions?: string | null;
  priority: InspectionPriority;
  scheduledFor: IsoDateTime;
}

export interface InspectionUpdateRequest {
  equipmentId?: Uuid | null;
  title?: string | null;
  instructions?: string | null;
  priority: InspectionPriority;
  scheduledFor: IsoDateTime;
}

export interface AssignInspectionRequest {
  technicianId: Uuid;
}

export interface CancelInspectionRequest {
  reason: string;
}

/** Corpo opcional — enviado quando há localização disponível (RN-061). */
export interface StartInspectionRequest {
  startedAtDevice?: IsoDateTime;
  location?: GeoLocation;
}

export interface SubmitInspectionRequest {
  completedAtDevice: IsoDateTime;
  location?: GeoLocation;
}

/** Filtros de `GET /mobile/inspections` (AC-MOBILE-LIST). */
export interface MobileInspectionQuery extends PageQuery {
  status?: InspectionStatus;
  priority?: InspectionPriority;
  scheduledFrom?: IsoDateTime;
  scheduledTo?: IsoDateTime;
}

// ---------- Respostas do checklist ----------

/**
 * Ao menos um campo `value*` deve ser preenchido conforme o `responseType` do
 * item (AC-CHECKLIST).
 */
export interface InspectionResponseUpsertRequest {
  inspectionItemId: Uuid;
  valueText?: string | null;
  valueNumber?: number | null;
  valueBoolean?: boolean | null;
  valueDate?: IsoDate | null;
  valueJson?: JsonObject | null;
  observation?: string | null;
  conformity?: Conformity;
  answeredAtDevice: IsoDateTime;
  /** Versão conhecida pelo cliente — detecta conflito (RN-075). */
  baseVersion: number;
}

export interface InspectionResponseBatchRequest {
  responses: InspectionResponseUpsertRequest[];
}

export interface InspectionResponseBatchItemResult {
  inspectionItemId: Uuid;
  status: SyncOperationStatus;
  responseId?: Uuid | null;
  version?: number | null;
  error?: ApiErrorBody;
}

export interface InspectionResponseBatchResult {
  results: InspectionResponseBatchItemResult[];
}

// ---------- Evidências ----------

/**
 * Metadados do upload. O arquivo em si vai como parte `file` do multipart —
 * ver `ApiClient.upload`.
 */
export interface EvidenceUploadRequest {
  /** Gerado no dispositivo; garante que reenvio não duplique (§11.8). */
  idempotencyKey: Uuid;
  responseId?: Uuid | null;
  nonConformityId?: Uuid | null;
  type: EvidenceType;
  description?: string | null;
  capturedAtDevice: IsoDateTime;
  latitude?: number | null;
  longitude?: number | null;
}

/** Arquivo local a enviar, no formato aceito pelo `FormData` do React Native. */
export interface UploadFile {
  uri: string;
  name: string;
  type: string;
}

// ---------- Não conformidades ----------

export interface NonConformityCreateRequest {
  inspectionItemId?: Uuid | null;
  responseId?: Uuid | null;
  title: string;
  description: string;
  severity: Severity;
  createdAtDevice: IsoDateTime;
}

export interface NonConformityUpdateRequest {
  title: string;
  description: string;
  severity: Severity;
}

export interface NonConformityStatusUpdateRequest {
  status: NonConformityStatus;
}

export interface NonConformityQuery extends PageQuery {
  inspectionId?: Uuid;
  severity?: Severity;
  status?: NonConformityStatus;
}

// ---------- Revisões ----------

export interface ApproveInspectionRequest {
  comments?: string | null;
}

export interface RejectInspectionRequest {
  reason: string;
  itemsToCorrect?: Uuid[];
}
