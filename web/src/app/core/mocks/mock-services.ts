/**
 * Backend fictício da interface administrativa.
 *
 * Implementa os mesmos contratos de `core/services/resources.ts` sobre o
 * conjunto compartilhado (`shared/src/mocks`) — o mesmo que o aplicativo Expo
 * usa. Uma inspeção criada aqui tem o formato e os vínculos que a API real
 * devolveria, e as mutações ficam em memória: a tela reflete na hora e o estado
 * volta ao inicial ao recarregar.
 */

import { InjectionToken, Injectable, inject } from '@angular/core';
import { Observable, defer, delay, of } from 'rxjs';

import {
  findById,
  getMockStore,
  insertEntity,
  matchesFilters,
  nextMockId,
  paginate,
  updateEntity,
  withinRange,
  dashboardSummary as summaryOf,
  inspectionsByStatus as byStatusOf,
  nonConformitiesBySeverity as bySeverityOf,
  type MockStore,
} from '@fieldops/shared';

import { ApiError } from '../models/api-error.model';
import type {
  Client,
  DashboardSummary,
  Equipment,
  EquipmentStatus,
  Evidence,
  Inspection,
  InspectionDetail,
  InspectionSite,
  NonConformity,
  SeverityCount,
  StatusCount,
  TemplateSectionDetail,
  InspectionTemplate,
  InspectionTemplateVersionDetail,
  User,
  UserStatus,
  Uuid,
} from '../models/domain';
import { serializeSort, type Page, type PageParams, type PageQuery } from '../models/page.model';
import {
  ClientsService,
  DashboardService,
  EquipmentService,
  InspectionsService,
  NonConformitiesService,
  SitesService,
  TemplatesService,
  UsersService,
  type ClientFilters,
  type EquipmentFilters,
  type InspectionFilters,
  type NonConformityFilters,
  type SiteFilters,
  type TemplateFilters,
  type UserFilters,
} from '../services/resources';

/** Latência simulada, para os estados de carregamento aparecerem na tela. */
export const MOCK_LATENCY_MS = new InjectionToken<number>('MOCK_LATENCY_MS', {
  providedIn: 'root',
  factory: () => 300,
});

/**
 * `defer` faz a leitura acontecer na assinatura, não na chamada: sem isso uma
 * mutação enfileirada seria aplicada cedo demais e a tela mostraria o estado
 * anterior.
 */
function respond<T>(factory: () => T, latency: number): Observable<T> {
  const source = defer(() => of(factory()));
  return latency > 0 ? source.pipe(delay(latency)) : source;
}

function notFound(resource: string, id: string): ApiError {
  return new ApiError({
    kind: 'NOT_FOUND',
    status: 404,
    code: 'NOT_FOUND',
    userMessage: 'Não encontrado.',
    path: `${resource}/${id}`,
  });
}

function nowIso(): string {
  return new Date().toISOString();
}

/** Campos que todo registro novo recebe do servidor. */
function auditFields() {
  const timestamp = nowIso();
  return { createdAt: timestamp, updatedAt: timestamp, version: 1 };
}

abstract class MockBase {
  protected readonly latency = inject(MOCK_LATENCY_MS);

  protected get db(): MockStore {
    return getMockStore();
  }

  protected respond<T>(factory: () => T): Observable<T> {
    return respond(factory, this.latency);
  }

  protected page<T>(items: readonly T[], query: PageParams): Observable<Page<T>> {
    const { page, size } = query;
    // `serializeSort` normaliza as três formas aceitas (`'campo,dir'`, objeto
    // e lista) para o formato que a paginação compartilhada entende.
    const sort = serializeSort(query.sort);
    return this.respond(() => paginate(items, { page, size, sort }));
  }

  protected require<T>(entity: T | undefined, resource: string, id: string): T {
    if (!entity) throw notFound(resource, id);
    return entity;
  }
}

@Injectable()
export class MockUsersService extends MockBase implements UsersService {
  list(query: PageQuery<UserFilters> = {}): Observable<Page<User>> {
    const { name, email, role, status } = query;
    const filtered = this.db.users.filter((user) =>
      matchesFilters(user as unknown as Record<string, unknown>, { name, email, role, status }),
    );
    return this.page(filtered, query);
  }

  get(id: Uuid): Observable<User> {
    return this.respond(() => this.require(findById(this.db.users, id), '/users', id));
  }

  create(input: Partial<User>): Observable<User> {
    return this.respond(() =>
      insertEntity(this.db.users, {
        id: nextMockId('1000'),
        name: input.name ?? 'Novo usuário',
        email: input.email ?? `usuario-${Date.now()}@fieldops.local`,
        role: input.role ?? 'TECHNICIAN',
        status: input.status ?? 'ACTIVE',
        phone: input.phone ?? null,
        ...auditFields(),
      }),
    );
  }

  update(id: Uuid, input: Partial<User>): Observable<User> {
    return this.respond(() =>
      this.require(updateEntity(this.db.users, id, input), '/users', id),
    );
  }

  setStatus(id: Uuid, status: UserStatus): Observable<User> {
    return this.update(id, { status });
  }
}

@Injectable()
export class MockClientsService extends MockBase implements ClientsService {
  list(query: PageQuery<ClientFilters> = {}): Observable<Page<Client>> {
    const { name, status } = query;
    const filtered = this.db.clients.filter((client) =>
      matchesFilters(client as unknown as Record<string, unknown>, { name, status }),
    );
    return this.page(filtered, query);
  }

  get(id: Uuid): Observable<Client> {
    return this.respond(() => this.require(findById(this.db.clients, id), '/clients', id));
  }

  create(input: Partial<Client>): Observable<Client> {
    return this.respond(() =>
      insertEntity(this.db.clients, {
        id: nextMockId('2000'),
        name: input.name ?? 'Novo cliente',
        legalName: input.legalName ?? null,
        document: input.document ?? null,
        email: input.email ?? null,
        phone: input.phone ?? null,
        status: input.status ?? 'ACTIVE',
        ...auditFields(),
      }),
    );
  }

  update(id: Uuid, input: Partial<Client>): Observable<Client> {
    return this.respond(() =>
      this.require(updateEntity(this.db.clients, id, input), '/clients', id),
    );
  }

  setStatus(id: Uuid, status: 'ACTIVE' | 'INACTIVE'): Observable<Client> {
    return this.update(id, { status });
  }
}

@Injectable()
export class MockSitesService extends MockBase implements SitesService {
  list(query: PageQuery<SiteFilters> = {}): Observable<Page<InspectionSite>> {
    const { name, clientId } = query;
    const filtered = this.db.sites.filter((site) =>
      matchesFilters(site as unknown as Record<string, unknown>, { name, clientId }),
    );
    return this.page(filtered, query);
  }

  listByClient(clientId: Uuid): Observable<InspectionSite[]> {
    return this.respond(() => this.db.sites.filter((site) => site.clientId === clientId));
  }

  get(id: Uuid): Observable<InspectionSite> {
    return this.respond(() => this.require(findById(this.db.sites, id), '/sites', id));
  }

  create(input: Partial<InspectionSite>): Observable<InspectionSite> {
    return this.respond(() => {
      // RN-009: um local sem cliente não existe.
      const clientId = input.clientId;
      if (!clientId || !findById(this.db.clients, clientId)) {
        throw new ApiError({
          kind: 'UNPROCESSABLE',
          status: 422,
          code: 'SITE_CLIENT_REQUIRED',
          userMessage: 'O local precisa pertencer a um cliente existente.',
          fieldErrors: [{ field: 'clientId', message: 'Selecione um cliente válido.' }],
        });
      }

      return insertEntity(this.db.sites, {
        id: nextMockId('3000'),
        clientId,
        name: input.name ?? 'Novo local',
        description: input.description ?? null,
        addressLine: input.addressLine ?? null,
        city: input.city ?? null,
        state: input.state ?? null,
        postalCode: input.postalCode ?? null,
        latitude: input.latitude ?? null,
        longitude: input.longitude ?? null,
        contactName: input.contactName ?? null,
        contactPhone: input.contactPhone ?? null,
        status: input.status ?? 'ACTIVE',
        ...auditFields(),
      });
    });
  }

  update(id: Uuid, input: Partial<InspectionSite>): Observable<InspectionSite> {
    // `clientId` é imutável após a criação (decisão de normalização do contrato).
    const { clientId: _ignored, ...rest } = input;
    return this.respond(() =>
      this.require(updateEntity(this.db.sites, id, rest), '/sites', id),
    );
  }
}

@Injectable()
export class MockEquipmentService extends MockBase implements EquipmentService {
  list(query: PageQuery<EquipmentFilters> = {}): Observable<Page<Equipment>> {
    const { name, siteId, status } = query;
    const filtered = this.db.equipment.filter((equipment) =>
      matchesFilters(equipment as unknown as Record<string, unknown>, { name, siteId, status }),
    );
    return this.page(filtered, query);
  }

  listBySite(siteId: Uuid): Observable<Equipment[]> {
    return this.respond(() =>
      this.db.equipment.filter((equipment) => equipment.siteId === siteId),
    );
  }

  get(id: Uuid): Observable<Equipment> {
    return this.respond(() => this.require(findById(this.db.equipment, id), '/equipment', id));
  }

  getByQrCode(qrCode: string): Observable<Equipment> {
    return this.respond(() =>
      this.require(
        this.db.equipment.find((equipment) => equipment.qrCode === qrCode),
        '/equipment/by-qr',
        qrCode,
      ),
    );
  }

  create(input: Partial<Equipment>): Observable<Equipment> {
    return this.respond(() => {
      const qrCode = input.qrCode?.trim();

      // RN-011: o código QR é único.
      if (qrCode && this.db.equipment.some((equipment) => equipment.qrCode === qrCode)) {
        throw new ApiError({
          kind: 'CONFLICT',
          status: 409,
          code: 'EQUIPMENT_QR_CODE_DUPLICATED',
          userMessage: 'Já existe um equipamento com este código QR.',
          fieldErrors: [{ field: 'qrCode', message: 'Código já utilizado.' }],
        });
      }

      return insertEntity(this.db.equipment, {
        id: nextMockId('4000'),
        siteId: input.siteId ?? this.db.sites[0].id,
        name: input.name ?? 'Novo equipamento',
        assetNumber: input.assetNumber ?? null,
        serialNumber: input.serialNumber ?? null,
        manufacturer: input.manufacturer ?? null,
        model: input.model ?? null,
        description: input.description ?? null,
        qrCode: qrCode ?? `QR-${Date.now()}`,
        status: input.status ?? 'ACTIVE',
        installedAt: input.installedAt ?? null,
        ...auditFields(),
      });
    });
  }

  update(id: Uuid, input: Partial<Equipment>): Observable<Equipment> {
    // `siteId` e `qrCode` não são editáveis após a criação.
    const { siteId: _site, qrCode: _qr, ...rest } = input;
    return this.respond(() =>
      this.require(updateEntity(this.db.equipment, id, rest), '/equipment', id),
    );
  }

  setStatus(id: Uuid, status: EquipmentStatus): Observable<Equipment> {
    return this.respond(() =>
      this.require(updateEntity(this.db.equipment, id, { status }), '/equipment', id),
    );
  }
}

@Injectable()
export class MockTemplatesService extends MockBase implements TemplatesService {
  list(query: PageQuery<TemplateFilters> = {}): Observable<Page<InspectionTemplate>> {
    const { category, status } = query;
    const filtered = this.db.templates.filter((template) =>
      matchesFilters(template as unknown as Record<string, unknown>, { category, status }),
    );
    return this.page(filtered, query);
  }

  get(id: Uuid): Observable<InspectionTemplate> {
    return this.respond(() =>
      this.require(findById(this.db.templates, id), '/inspection-templates', id),
    );
  }

  listVersions(templateId: Uuid): Observable<InspectionTemplateVersionDetail[]> {
    return this.respond(() =>
      this.db.templateVersions.filter((version) => version.templateId === templateId),
    );
  }

  getVersion(versionId: Uuid): Observable<InspectionTemplateVersionDetail> {
    return this.respond(() =>
      this.require(
        findById(this.db.templateVersions, versionId),
        '/inspection-template-versions',
        versionId,
      ),
    );
  }

  listDraftSections(templateId: Uuid): Observable<TemplateSectionDetail[]> {
    return this.respond(() => this.db.draftSections[templateId] ?? []);
  }
}

@Injectable()
export class MockInspectionsService extends MockBase implements InspectionsService {
  list(query: PageQuery<InspectionFilters> = {}): Observable<Page<Inspection>> {
    const { scheduledFrom, scheduledTo, overdue, page, size, sort, ...simple } = query;

    const filtered = this.db.inspections.filter((inspection) => {
      if (!matchesFilters(inspection as unknown as Record<string, unknown>, simple)) return false;
      if (!withinRange(inspection.scheduledFor, scheduledFrom, scheduledTo)) return false;

      if (overdue === true) {
        return (
          Date.parse(inspection.scheduledFor) < Date.now() &&
          ['DRAFT', 'ASSIGNED', 'IN_PROGRESS'].includes(inspection.status)
        );
      }
      return true;
    });

    return this.page(filtered, { page, size, sort });
  }

  get(id: Uuid): Observable<InspectionDetail> {
    return this.respond(() => {
      const inspection = this.require(findById(this.db.inspections, id), '/inspections', id);

      return {
        ...inspection,
        items: this.db.items[id] ?? [],
        responses: this.db.responses[id] ?? [],
        nonConformities: this.db.nonConformities.filter((nc) => nc.inspectionId === id),
        reviews: this.db.reviews.filter((review) => review.inspectionId === id),
      };
    });
  }

  create(input: Partial<Inspection>): Observable<Inspection> {
    return this.respond(() => {
      const equipmentId = input.equipmentId ?? null;

      // RN-012: equipamento inativo não entra em nova inspeção.
      if (equipmentId) {
        const equipment = findById(this.db.equipment, equipmentId);
        if (equipment && equipment.status !== 'ACTIVE') {
          throw new ApiError({
            kind: 'UNPROCESSABLE',
            status: 422,
            code: 'EQUIPMENT_NOT_ACTIVE',
            userMessage: 'O equipamento selecionado não está ativo.',
            fieldErrors: [{ field: 'equipmentId', message: 'Selecione um equipamento ativo.' }],
          });
        }
      }

      const id = nextMockId('6000');
      const inspection: Inspection = {
        id,
        templateVersionId: input.templateVersionId ?? this.db.templateVersions[0].id,
        clientId: input.clientId ?? this.db.clients[0].id,
        siteId: input.siteId ?? this.db.sites[0].id,
        equipmentId,
        technicianId: input.technicianId ?? '',
        supervisorId: input.supervisorId ?? null,
        title: input.title ?? null,
        instructions: input.instructions ?? null,
        priority: input.priority ?? 'MEDIUM',
        status: 'ASSIGNED',
        scheduledFor: input.scheduledFor ?? nowIso(),
        ...auditFields(),
      };

      // O snapshot do checklist nasce junto com a inspeção (RN-021).
      this.db.items[id] = (this.db.templateVersions[0].sections ?? []).flatMap(
        (section, sectionIndex) =>
          (section.items ?? []).map((item, itemIndex) => ({
            id: nextMockId('6100'),
            inspectionId: id,
            sourceTemplateItemId: item.id,
            sectionTitle: section.title,
            sectionDescription: section.description ?? null,
            sectionOrder: sectionIndex + 1,
            itemCode: item.code ?? null,
            itemTitle: item.title,
            itemDescription: item.description ?? null,
            responseType: item.responseType,
            required: item.required,
            rulesJson: {
              observationRequiredOnFailure: item.observationRequiredOnFailure ?? false,
              evidenceRequiredOnFailure: item.evidenceRequiredOnFailure ?? false,
            },
            optionsJson: item.optionsJson ?? null,
            itemOrder: itemIndex + 1,
            createdAt: nowIso(),
          })),
      );
      this.db.responses[id] = [];
      this.db.evidence[id] = [];

      return insertEntity(this.db.inspections, inspection);
    });
  }

  update(id: Uuid, input: Partial<Inspection>): Observable<Inspection> {
    return this.respond(() =>
      this.require(updateEntity(this.db.inspections, id, input), '/inspections', id),
    );
  }

  cancel(id: Uuid, reason: string): Observable<Inspection> {
    return this.respond(() => {
      const inspection = this.require(findById(this.db.inspections, id), '/inspections', id);

      // RN-030: inspeção aprovada não é cancelada pelo fluxo comum.
      if (inspection.status === 'APPROVED') {
        throw new ApiError({
          kind: 'CONFLICT',
          status: 409,
          code: 'INSPECTION_ALREADY_APPROVED',
          userMessage: 'Uma inspeção aprovada não pode ser cancelada.',
        });
      }

      return this.require(
        updateEntity(this.db.inspections, id, {
          status: 'CANCELED',
          canceledAt: nowIso(),
          canceledReason: reason,
        }),
        '/inspections',
        id,
      );
    });
  }

  beginReview(id: Uuid): Observable<Inspection> {
    return this.transition(id, 'SUBMITTED', 'UNDER_REVIEW');
  }

  approve(id: Uuid, comments?: string): Observable<Inspection> {
    return this.respond(() => {
      const updated = this.applyReview(id, 'APPROVED', null, comments);
      return this.require(
        updateEntity(this.db.inspections, id, { status: 'APPROVED', approvedAt: nowIso() }),
        '/inspections',
        updated.id,
      );
    });
  }

  reject(id: Uuid, reason: string, itemsToCorrect: Uuid[] = []): Observable<Inspection> {
    return this.respond(() => {
      // RN-080: a reprovação exige motivo.
      if (!reason.trim()) {
        throw new ApiError({
          kind: 'UNPROCESSABLE',
          status: 422,
          code: 'REVIEW_REASON_REQUIRED',
          userMessage: 'Informe o motivo da reprovação.',
          fieldErrors: [{ field: 'reason', message: 'Motivo obrigatório.' }],
        });
      }

      this.applyReview(id, 'REJECTED', reason, undefined, itemsToCorrect);
      return this.require(
        updateEntity(this.db.inspections, id, { status: 'REJECTED' }),
        '/inspections',
        id,
      );
    });
  }

  listEvidence(id: Uuid): Observable<Evidence[]> {
    return this.respond(() => this.db.evidence[id] ?? []);
  }

  /** Muda de estado só a partir do estado esperado (RN-089). */
  private transition(id: Uuid, from: string, to: Inspection['status']): Observable<Inspection> {
    return this.respond(() => {
      const inspection = this.require(findById(this.db.inspections, id), '/inspections', id);

      if (inspection.status !== from) {
        throw new ApiError({
          kind: 'CONFLICT',
          status: 409,
          code: 'INSPECTION_INVALID_TRANSITION',
          userMessage: 'A inspeção não está no estado necessário para esta ação.',
        });
      }

      return this.require(
        updateEntity(this.db.inspections, id, { status: to }),
        '/inspections',
        id,
      );
    });
  }

  private applyReview(
    inspectionId: Uuid,
    decision: 'APPROVED' | 'REJECTED',
    reason: string | null,
    comments?: string,
    itemsToCorrect?: Uuid[],
  ) {
    const inspection = this.require(
      findById(this.db.inspections, inspectionId),
      '/inspections',
      inspectionId,
    );

    const cycle =
      this.db.reviews.filter((review) => review.inspectionId === inspectionId).length + 1;

    this.db.reviews.push({
      id: nextMockId('8000'),
      inspectionId,
      reviewerId: this.db.users.find((user) => user.role === 'SUPERVISOR')?.id ?? '',
      decision,
      reason,
      comments: comments ?? null,
      reviewedAt: nowIso(),
      reviewCycle: cycle,
      createdAt: nowIso(),
      ...(itemsToCorrect?.length ? { itemsToCorrect } : {}),
    });

    return inspection;
  }
}

@Injectable()
export class MockNonConformitiesService extends MockBase implements NonConformitiesService {
  list(query: PageQuery<NonConformityFilters> = {}): Observable<Page<NonConformity>> {
    const { severity } = query;
    const filtered = this.db.nonConformities.filter((nc) =>
      matchesFilters(nc as unknown as Record<string, unknown>, { severity }),
    );
    return this.page(filtered, query);
  }

  get(id: Uuid): Observable<NonConformity> {
    return this.respond(() =>
      this.require(findById(this.db.nonConformities, id), '/non-conformities', id),
    );
  }
}

@Injectable()
export class MockDashboardService extends MockBase implements DashboardService {
  summary(): Observable<DashboardSummary> {
    return this.respond(() => summaryOf(this.db));
  }

  inspectionsByStatus(): Observable<StatusCount[]> {
    return this.respond(() => byStatusOf(this.db));
  }

  nonConformitiesBySeverity(): Observable<SeverityCount[]> {
    return this.respond(() => bySeverityOf(this.db));
  }
}

/** Implementações fictícias — usadas quando `MOCK_API` está ligado. */
export const MOCK_RESOURCE_PROVIDERS = [
  { provide: UsersService, useClass: MockUsersService },
  { provide: ClientsService, useClass: MockClientsService },
  { provide: SitesService, useClass: MockSitesService },
  { provide: EquipmentService, useClass: MockEquipmentService },
  { provide: TemplatesService, useClass: MockTemplatesService },
  { provide: InspectionsService, useClass: MockInspectionsService },
  { provide: NonConformitiesService, useClass: MockNonConformitiesService },
  { provide: DashboardService, useClass: MockDashboardService },
];
