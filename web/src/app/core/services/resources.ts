/**
 * Serviços de domínio da interface administrativa.
 *
 * Cada recurso é declarado como uma **classe abstrata**, que serve ao mesmo
 * tempo de contrato e de token de injeção: a tela injeta `ClientsService` sem
 * saber se está falando com a API ou com o backend fictício. A troca acontece
 * em `provideCore()` (ver `core.providers.ts`).
 *
 * As URLs seguem `docs/contrato-backend-frontend.md` §3.
 */

import { Injectable, inject } from '@angular/core';
import type { Observable } from 'rxjs';

import { ApiService } from '../http/api.service';
import type {
  Client,
  DashboardSummary,
  Equipment,
  EquipmentStatus,
  Evidence,
  Inspection,
  InspectionDetail,
  InspectionPriority,
  InspectionSite,
  InspectionStatus,
  InspectionTemplate,
  InspectionTemplateVersionDetail,
  NonConformity,
  SeverityCount,
  Severity,
  StatusCount,
  TemplateSectionDetail,
  User,
  UserRole,
  UserStatus,
  Uuid,
} from '../models/domain';
import type { Page, PageQuery } from '../models/page.model';

// ------------------------------------------------------------- filtros

export type UserFilters = {
  name?: string;
  email?: string;
  role?: UserRole;
  status?: UserStatus;
};

export type ClientFilters = { name?: string; status?: 'ACTIVE' | 'INACTIVE' };
export type SiteFilters = { name?: string; clientId?: Uuid };
export type EquipmentFilters = { name?: string; siteId?: Uuid; status?: EquipmentStatus };
export type TemplateFilters = { category?: string; status?: string };
export type NonConformityFilters = { severity?: Severity };

export type InspectionFilters = {
  status?: InspectionStatus;
  technicianId?: Uuid;
  supervisorId?: Uuid;
  clientId?: Uuid;
  siteId?: Uuid;
  equipmentId?: Uuid;
  priority?: InspectionPriority;
  scheduledFrom?: string;
  scheduledTo?: string;
  overdue?: boolean;
};

// ------------------------------------------------------------ contratos

export abstract class UsersService {
  abstract list(query?: PageQuery<UserFilters>): Observable<Page<User>>;
  abstract get(id: Uuid): Observable<User>;
  abstract create(input: Partial<User> & { password?: string }): Observable<User>;
  abstract update(id: Uuid, input: Partial<User>): Observable<User>;
  abstract setStatus(id: Uuid, status: UserStatus): Observable<User>;
}

export abstract class ClientsService {
  abstract list(query?: PageQuery<ClientFilters>): Observable<Page<Client>>;
  abstract get(id: Uuid): Observable<Client>;
  abstract create(input: Partial<Client>): Observable<Client>;
  abstract update(id: Uuid, input: Partial<Client>): Observable<Client>;
  abstract setStatus(id: Uuid, status: 'ACTIVE' | 'INACTIVE'): Observable<Client>;
}

export abstract class SitesService {
  abstract list(query?: PageQuery<SiteFilters>): Observable<Page<InspectionSite>>;
  abstract listByClient(clientId: Uuid): Observable<InspectionSite[]>;
  abstract get(id: Uuid): Observable<InspectionSite>;
  abstract create(input: Partial<InspectionSite>): Observable<InspectionSite>;
  abstract update(id: Uuid, input: Partial<InspectionSite>): Observable<InspectionSite>;
}

export abstract class EquipmentService {
  abstract list(query?: PageQuery<EquipmentFilters>): Observable<Page<Equipment>>;
  abstract listBySite(siteId: Uuid): Observable<Equipment[]>;
  abstract get(id: Uuid): Observable<Equipment>;
  abstract getByQrCode(qrCode: string): Observable<Equipment>;
  abstract create(input: Partial<Equipment>): Observable<Equipment>;
  abstract update(id: Uuid, input: Partial<Equipment>): Observable<Equipment>;
  abstract setStatus(id: Uuid, status: EquipmentStatus): Observable<Equipment>;
}

export abstract class TemplatesService {
  abstract list(query?: PageQuery<TemplateFilters>): Observable<Page<InspectionTemplate>>;
  abstract get(id: Uuid): Observable<InspectionTemplate>;
  abstract listVersions(templateId: Uuid): Observable<InspectionTemplateVersionDetail[]>;
  abstract getVersion(versionId: Uuid): Observable<InspectionTemplateVersionDetail>;
  /** Seções do rascunho, editadas pelo construtor (FE-W15). */
  abstract listDraftSections(templateId: Uuid): Observable<TemplateSectionDetail[]>;
}

export abstract class InspectionsService {
  abstract list(query?: PageQuery<InspectionFilters>): Observable<Page<Inspection>>;
  abstract get(id: Uuid): Observable<InspectionDetail>;
  abstract create(input: Partial<Inspection>): Observable<Inspection>;
  abstract update(id: Uuid, input: Partial<Inspection>): Observable<Inspection>;
  abstract cancel(id: Uuid, reason: string): Observable<Inspection>;
  abstract beginReview(id: Uuid): Observable<Inspection>;
  abstract approve(id: Uuid, comments?: string): Observable<Inspection>;
  abstract reject(id: Uuid, reason: string, itemsToCorrect?: Uuid[]): Observable<Inspection>;
  abstract listEvidence(id: Uuid): Observable<Evidence[]>;
}

export abstract class NonConformitiesService {
  abstract list(query?: PageQuery<NonConformityFilters>): Observable<Page<NonConformity>>;
  abstract get(id: Uuid): Observable<NonConformity>;
}

export abstract class DashboardService {
  abstract summary(): Observable<DashboardSummary>;
  abstract inspectionsByStatus(): Observable<StatusCount[]>;
  abstract nonConformitiesBySeverity(): Observable<SeverityCount[]>;
}

// -------------------------------------------------- implementações HTTP

@Injectable()
export class HttpUsersService extends UsersService {
  private readonly api = inject(ApiService);

  list(query: PageQuery<UserFilters> = {}) {
    return this.api.getPage<User, UserFilters>('/users', query);
  }
  get(id: Uuid) {
    return this.api.get<User>(`/users/${id}`);
  }
  create(input: Partial<User> & { password?: string }) {
    return this.api.post<User>('/users', input);
  }
  update(id: Uuid, input: Partial<User>) {
    return this.api.put<User>(`/users/${id}`, input);
  }
  setStatus(id: Uuid, status: UserStatus) {
    return this.api.patch<User>(`/users/${id}/status`, { status });
  }
}

@Injectable()
export class HttpClientsService extends ClientsService {
  private readonly api = inject(ApiService);

  list(query: PageQuery<ClientFilters> = {}) {
    return this.api.getPage<Client, ClientFilters>('/clients', query);
  }
  get(id: Uuid) {
    return this.api.get<Client>(`/clients/${id}`);
  }
  create(input: Partial<Client>) {
    return this.api.post<Client>('/clients', input);
  }
  update(id: Uuid, input: Partial<Client>) {
    return this.api.put<Client>(`/clients/${id}`, input);
  }
  setStatus(id: Uuid, status: 'ACTIVE' | 'INACTIVE') {
    return this.api.patch<Client>(`/clients/${id}/status`, { status });
  }
}

@Injectable()
export class HttpSitesService extends SitesService {
  private readonly api = inject(ApiService);

  list(query: PageQuery<SiteFilters> = {}) {
    return this.api.getPage<InspectionSite, SiteFilters>('/sites', query);
  }
  listByClient(clientId: Uuid) {
    return this.api.get<InspectionSite[]>(`/clients/${clientId}/sites`);
  }
  get(id: Uuid) {
    return this.api.get<InspectionSite>(`/sites/${id}`);
  }
  create(input: Partial<InspectionSite>) {
    return this.api.post<InspectionSite>('/sites', input);
  }
  update(id: Uuid, input: Partial<InspectionSite>) {
    return this.api.put<InspectionSite>(`/sites/${id}`, input);
  }
}

@Injectable()
export class HttpEquipmentService extends EquipmentService {
  private readonly api = inject(ApiService);

  list(query: PageQuery<EquipmentFilters> = {}) {
    return this.api.getPage<Equipment, EquipmentFilters>('/equipment', query);
  }
  listBySite(siteId: Uuid) {
    return this.api.get<Equipment[]>(`/sites/${siteId}/equipment`);
  }
  get(id: Uuid) {
    return this.api.get<Equipment>(`/equipment/${id}`);
  }
  getByQrCode(qrCode: string) {
    return this.api.get<Equipment>(`/equipment/by-qr/${encodeURIComponent(qrCode)}`);
  }
  create(input: Partial<Equipment>) {
    return this.api.post<Equipment>('/equipment', input);
  }
  update(id: Uuid, input: Partial<Equipment>) {
    return this.api.put<Equipment>(`/equipment/${id}`, input);
  }
  setStatus(id: Uuid, status: EquipmentStatus) {
    return this.api.patch<Equipment>(`/equipment/${id}/status`, { status });
  }
}

@Injectable()
export class HttpTemplatesService extends TemplatesService {
  private readonly api = inject(ApiService);

  list(query: PageQuery<TemplateFilters> = {}) {
    return this.api.getPage<InspectionTemplate, TemplateFilters>('/inspection-templates', query);
  }
  get(id: Uuid) {
    return this.api.get<InspectionTemplate>(`/inspection-templates/${id}`);
  }
  listVersions(templateId: Uuid) {
    return this.api.get<InspectionTemplateVersionDetail[]>(
      `/inspection-templates/${templateId}/versions`,
    );
  }
  getVersion(versionId: Uuid) {
    return this.api.get<InspectionTemplateVersionDetail>(
      `/inspection-template-versions/${versionId}`,
    );
  }
  listDraftSections(templateId: Uuid) {
    return this.api.get<TemplateSectionDetail[]>(`/inspection-templates/${templateId}/sections`);
  }
}

@Injectable()
export class HttpInspectionsService extends InspectionsService {
  private readonly api = inject(ApiService);

  list(query: PageQuery<InspectionFilters> = {}) {
    return this.api.getPage<Inspection, InspectionFilters>('/inspections', query);
  }
  get(id: Uuid) {
    return this.api.get<InspectionDetail>(`/inspections/${id}`);
  }
  create(input: Partial<Inspection>) {
    return this.api.post<Inspection>('/inspections', input);
  }
  update(id: Uuid, input: Partial<Inspection>) {
    return this.api.put<Inspection>(`/inspections/${id}`, input);
  }
  cancel(id: Uuid, reason: string) {
    return this.api.post<Inspection>(`/inspections/${id}/cancel`, { reason });
  }
  beginReview(id: Uuid) {
    return this.api.post<Inspection>(`/inspections/${id}/begin-review`);
  }
  approve(id: Uuid, comments?: string) {
    return this.api.post<Inspection>(`/inspections/${id}/approve`, { comments });
  }
  reject(id: Uuid, reason: string, itemsToCorrect: Uuid[] = []) {
    return this.api.post<Inspection>(`/inspections/${id}/reject`, { reason, itemsToCorrect });
  }
  listEvidence(id: Uuid) {
    return this.api.get<Evidence[]>(`/inspections/${id}/evidence`);
  }
}

@Injectable()
export class HttpNonConformitiesService extends NonConformitiesService {
  private readonly api = inject(ApiService);

  list(query: PageQuery<NonConformityFilters> = {}) {
    return this.api.getPage<NonConformity, NonConformityFilters>('/non-conformities', query);
  }
  get(id: Uuid) {
    return this.api.get<NonConformity>(`/non-conformities/${id}`);
  }
}

@Injectable()
export class HttpDashboardService extends DashboardService {
  private readonly api = inject(ApiService);

  summary() {
    return this.api.get<DashboardSummary>('/dashboard/summary');
  }
  inspectionsByStatus() {
    return this.api.get<StatusCount[]>('/dashboard/inspections-by-status');
  }
  nonConformitiesBySeverity() {
    return this.api.get<SeverityCount[]>('/dashboard/non-conformities-by-severity');
  }
}

/** Implementações reais — usadas quando `MOCK_API` está desligado. */
export const HTTP_RESOURCE_PROVIDERS = [
  { provide: UsersService, useClass: HttpUsersService },
  { provide: ClientsService, useClass: HttpClientsService },
  { provide: SitesService, useClass: HttpSitesService },
  { provide: EquipmentService, useClass: HttpEquipmentService },
  { provide: TemplatesService, useClass: HttpTemplatesService },
  { provide: InspectionsService, useClass: HttpInspectionsService },
  { provide: NonConformitiesService, useClass: HttpNonConformitiesService },
  { provide: DashboardService, useClass: HttpDashboardService },
];
