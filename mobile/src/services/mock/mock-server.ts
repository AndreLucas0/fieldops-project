/**
 * Backend fictício do modo mock.
 *
 * Recebe a mesma requisição que iria para a rede e devolve `{ status, body }`
 * no formato do contrato — inclusive os erros. Assim o `ApiClient` tem um só
 * caminho de código: ligar ou desligar o mock não muda nada nas telas.
 */

import {
  MOCK_TOKEN_TTL_SECONDS,
  MOCK_PASSWORDS,
  getMockDatabase,
  nextMockId,
  type MockAccount,
  type MockDatabase,
} from './mock-data';
import { getApiConfig } from '../config';
import type { HttpMethod, HttpResponse, MockRequest, QueryParams } from '../api-client';
import type {
  ApiErrorBody,
  DashboardSummary,
  Evidence,
  Inspection,
  InspectionDetail,
  InspectionResponse,
  InspectionResponseBatchItemResult,
  InspectionResponseBatchRequest,
  InspectionResponseUpsertRequest,
  LoginRequest,
  LoginResponse,
  NonConformity,
  NonConformityCreateRequest,
  NonConformityUpdateRequest,
  Page,
  RefreshTokenRequest,
  StartInspectionRequest,
  SubmitInspectionRequest,
} from '@/models';

type Params = Record<string, string>;

interface MockContext {
  params: Params;
  query: QueryParams;
  body: unknown;
  formData: FormData | null;
  db: MockDatabase;
  /** Preenchido quando a rota exige autenticação. */
  account: MockAccount | null;
  path: string;
}

type Handler = (ctx: MockContext) => HttpResponse;

interface Route {
  method: HttpMethod;
  pattern: string;
  /** `false` dispensa token (login, refresh). */
  auth?: boolean;
  handle: Handler;
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function ok<T>(body: T): HttpResponse {
  return { status: 200, body };
}

function created<T>(body: T): HttpResponse {
  return { status: 201, body };
}

function noContent(): HttpResponse {
  return { status: 204, body: null };
}

function fail(
  status: number,
  code: string,
  message: string,
  path: string,
  fieldErrors?: ApiErrorBody['fieldErrors'],
): HttpResponse {
  const body: ApiErrorBody = {
    timestamp: new Date().toISOString(),
    status,
    code,
    message,
    path,
    ...(fieldErrors ? { fieldErrors } : {}),
  };
  return { status, body };
}

/** Compara padrão (`/inspections/:id/start`) com o caminho recebido. */
function matchPattern(pattern: string, path: string): Params | null {
  const expected = pattern.split('/').filter(Boolean);
  const actual = path.split('/').filter(Boolean);
  if (expected.length !== actual.length) return null;

  const params: Params = {};
  for (let index = 0; index < expected.length; index += 1) {
    const segment = expected[index] ?? '';
    const value = actual[index] ?? '';

    if (segment.startsWith(':')) {
      params[segment.slice(1)] = decodeURIComponent(value);
      continue;
    }
    if (segment !== value) return null;
  }
  return params;
}

function asRecord(value: unknown): Record<string, unknown> {
  return typeof value === 'object' && value !== null ? (value as Record<string, unknown>) : {};
}

function readNumberParam(query: QueryParams, key: string, fallback: number): number {
  const raw = query[key];
  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
}

function paginate<T>(all: T[], query: QueryParams): Page<T> {
  const size = Math.max(1, readNumberParam(query, 'size', 20));
  const page = readNumberParam(query, 'page', 0);
  const start = page * size;

  return {
    page,
    size,
    totalElements: all.length,
    totalPages: Math.max(1, Math.ceil(all.length / size)),
    content: all.slice(start, start + size),
  };
}

/** O `account` já foi validado pela rota; isto só estreita o tipo. */
function requireAccount(ctx: MockContext): MockAccount {
  if (!ctx.account) throw new Error('Rota autenticada sem conta resolvida.');
  return ctx.account;
}

function issueTokens(db: MockDatabase, accountId: string): { access: string; refresh: string } {
  // Só um par de tokens por usuário: emitir novo invalida o anterior, que é o
  // que faz o 401 → refresh → repetição ser observável no modo mock.
  for (const [token, owner] of db.accessTokens) {
    if (owner === accountId) db.accessTokens.delete(token);
  }
  for (const [token, owner] of db.refreshTokens) {
    if (owner === accountId) db.refreshTokens.delete(token);
  }

  const access = `mock-access.${nextMockId()}`;
  const refresh = `mock-refresh.${nextMockId()}`;
  db.accessTokens.set(access, accountId);
  db.refreshTokens.set(refresh, accountId);
  return { access, refresh };
}

function findInspection(ctx: MockContext): Inspection | undefined {
  return ctx.db.inspections.find((inspection) => inspection.id === ctx.params.inspectionId);
}

/** Somente o técnico dono da inspeção a enxerga no app (AC-SECURITY). */
function ownsInspection(account: MockAccount, inspection: Inspection): boolean {
  return account.role === 'TECHNICIAN' ? inspection.technicianId === account.id : true;
}

function nowIso(): string {
  return new Date().toISOString();
}

// ---------- Rotas ----------

const routes: Route[] = [
  {
    method: 'POST',
    pattern: '/auth/login',
    auth: false,
    handle: (ctx) => {
      const { email, password } = asRecord(ctx.body) as Partial<LoginRequest>;
      const normalized = (email ?? '').trim().toLowerCase();
      const account = ctx.db.users.find((candidate) => candidate.email === normalized);

      // Conta inexistente e senha errada dão a mesma resposta: AC-AUTH exige
      // que a mensagem não revele se o e-mail está cadastrado.
      if (!account || !MOCK_PASSWORDS.includes(password ?? '')) {
        return fail(
          401,
          'INVALID_CREDENTIALS',
          'E-mail ou senha incorretos. Verifique os dados e tente novamente.',
          ctx.path,
        );
      }

      // RN-001: somente usuários ativos iniciam sessão.
      if (account.status !== 'ACTIVE') {
        return fail(
          401,
          'USER_INACTIVE',
          'Seu acesso está inativo. Procure o administrador da operação.',
          ctx.path,
        );
      }

      const tokens = issueTokens(ctx.db, account.id);
      const response: LoginResponse = {
        accessToken: tokens.access,
        refreshToken: tokens.refresh,
        expiresIn: MOCK_TOKEN_TTL_SECONDS,
        user: {
          id: account.id,
          name: account.name,
          email: account.email,
          role: account.role,
        },
      };
      return ok(response);
    },
  },

  {
    method: 'POST',
    pattern: '/auth/refresh',
    auth: false,
    handle: (ctx) => {
      const { refreshToken } = asRecord(ctx.body) as Partial<RefreshTokenRequest>;
      const accountId = refreshToken ? ctx.db.refreshTokens.get(refreshToken) : undefined;

      if (!accountId) {
        return fail(401, 'INVALID_REFRESH_TOKEN', 'Sessão expirada. Entre novamente.', ctx.path);
      }

      const tokens = issueTokens(ctx.db, accountId);
      return ok({
        accessToken: tokens.access,
        refreshToken: tokens.refresh,
        expiresIn: MOCK_TOKEN_TTL_SECONDS,
      });
    },
  },

  {
    method: 'POST',
    pattern: '/auth/logout',
    handle: (ctx) => {
      const account = requireAccount(ctx);
      for (const [token, owner] of ctx.db.accessTokens) {
        if (owner === account.id) ctx.db.accessTokens.delete(token);
      }
      for (const [token, owner] of ctx.db.refreshTokens) {
        if (owner === account.id) ctx.db.refreshTokens.delete(token);
      }
      return noContent();
    },
  },

  {
    method: 'GET',
    pattern: '/auth/me',
    handle: (ctx) => {
      const account = requireAccount(ctx);
      return ok({
        id: account.id,
        name: account.name,
        email: account.email,
        role: account.role,
        status: account.status,
        phone: account.phone,
      });
    },
  },

  {
    method: 'GET',
    pattern: '/mobile/inspections',
    handle: (ctx) => {
      const account = requireAccount(ctx);
      const status = ctx.query.status;
      const priority = ctx.query.priority;
      const from = ctx.query.scheduledFrom;
      const to = ctx.query.scheduledTo;

      const visible = ctx.db.inspections
        .filter((inspection) => ownsInspection(account, inspection))
        .filter((inspection) => (status ? inspection.status === status : true))
        .filter((inspection) => (priority ? inspection.priority === priority : true))
        .filter((inspection) => (from ? inspection.scheduledFor >= String(from) : true))
        .filter((inspection) => (to ? inspection.scheduledFor <= String(to) : true))
        // A tela de campo lista o que vence primeiro no topo.
        .sort((a, b) => a.scheduledFor.localeCompare(b.scheduledFor));

      return ok(paginate(visible, ctx.query));
    },
  },

  {
    method: 'GET',
    pattern: '/mobile/inspections/:inspectionId',
    handle: (ctx) => {
      const account = requireAccount(ctx);
      const inspection = findInspection(ctx);
      if (!inspection) return fail(404, 'NOT_FOUND', 'Inspeção não encontrada.', ctx.path);
      if (!ownsInspection(account, inspection)) {
        return fail(403, 'FORBIDDEN', 'Esta inspeção não está atribuída a você.', ctx.path);
      }

      const detail: InspectionDetail = {
        ...inspection,
        items: ctx.db.items[inspection.id] ?? [],
        responses: ctx.db.responses[inspection.id] ?? [],
        nonConformities: ctx.db.nonConformities.filter(
          (item) => item.inspectionId === inspection.id,
        ),
        reviews: ctx.db.reviews.filter((review) => review.inspectionId === inspection.id),
      };
      return ok(detail);
    },
  },

  {
    method: 'POST',
    pattern: '/inspections/:inspectionId/start',
    handle: (ctx) => {
      const account = requireAccount(ctx);
      const inspection = findInspection(ctx);
      if (!inspection) return fail(404, 'NOT_FOUND', 'Inspeção não encontrada.', ctx.path);
      if (!ownsInspection(account, inspection)) {
        return fail(403, 'FORBIDDEN', 'Esta inspeção não está atribuída a você.', ctx.path);
      }
      if (inspection.status !== 'ASSIGNED') {
        return fail(
          409,
          'INSPECTION_INVALID_STATE',
          'Só é possível iniciar uma inspeção atribuída.',
          ctx.path,
        );
      }

      const body = asRecord(ctx.body) as StartInspectionRequest;
      const startedAt = body.startedAtDevice ?? nowIso();

      inspection.status = 'IN_PROGRESS';
      inspection.startedAtDevice = startedAt;
      inspection.startedAtServer = nowIso();
      inspection.updatedAt = nowIso();
      inspection.version += 1;

      return ok(inspection);
    },
  },

  {
    method: 'POST',
    pattern: '/inspections/:inspectionId/submit',
    handle: (ctx) => {
      const account = requireAccount(ctx);
      const inspection = findInspection(ctx);
      if (!inspection) return fail(404, 'NOT_FOUND', 'Inspeção não encontrada.', ctx.path);
      if (!ownsInspection(account, inspection)) {
        return fail(403, 'FORBIDDEN', 'Esta inspeção não está atribuída a você.', ctx.path);
      }
      if (inspection.status !== 'IN_PROGRESS') {
        return fail(
          409,
          'INSPECTION_INVALID_STATE',
          'Só é possível enviar uma inspeção em andamento.',
          ctx.path,
        );
      }

      const body = asRecord(ctx.body) as Partial<SubmitInspectionRequest>;
      if (!body.completedAtDevice) {
        return fail(400, 'BAD_REQUEST', 'Informe o horário de conclusão.', ctx.path, [
          { field: 'completedAtDevice', message: 'Campo obrigatório.' },
        ]);
      }

      // RN: todo item obrigatório precisa de resposta antes do envio.
      const snapshot = ctx.db.items[inspection.id] ?? [];
      const answers = ctx.db.responses[inspection.id] ?? [];
      const missing = snapshot.filter(
        (item) =>
          item.required &&
          !answers.some((answer) => answer.inspectionItemId === item.id),
      );

      if (missing.length > 0) {
        return fail(
          422,
          'INSPECTION_REQUIRED_ITEMS_MISSING',
          `Há ${missing.length} item(ns) obrigatório(s) sem resposta.`,
          ctx.path,
          missing.map((item) => ({
            field: item.id,
            message: `${item.itemCode ?? 'Item'} — resposta obrigatória.`,
          })),
        );
      }

      inspection.status = 'SUBMITTED';
      inspection.completedAtDevice = body.completedAtDevice;
      inspection.submittedAtServer = nowIso();
      inspection.updatedAt = nowIso();
      inspection.version += 1;

      return ok(inspection);
    },
  },

  {
    method: 'GET',
    pattern: '/inspections/:inspectionId/responses',
    handle: (ctx) => {
      requireAccount(ctx);
      const inspectionId = ctx.params.inspectionId ?? '';
      return ok(ctx.db.responses[inspectionId] ?? []);
    },
  },

  {
    method: 'PUT',
    pattern: '/inspections/:inspectionId/responses/:responseId',
    handle: (ctx) => {
      const account = requireAccount(ctx);
      const inspection = findInspection(ctx);
      if (!inspection) return fail(404, 'NOT_FOUND', 'Inspeção não encontrada.', ctx.path);

      const request = asRecord(ctx.body) as Partial<InspectionResponseUpsertRequest>;
      if (!request.inspectionItemId) {
        return fail(400, 'BAD_REQUEST', 'Informe o item respondido.', ctx.path, [
          { field: 'inspectionItemId', message: 'Campo obrigatório.' },
        ]);
      }

      const result = upsertResponse(
        ctx.db,
        inspection.id,
        account.id,
        request as InspectionResponseUpsertRequest,
        ctx.params.responseId,
      );

      if (result.conflict) {
        return fail(
          409,
          'RESPONSE_VERSION_CONFLICT',
          'Esta resposta foi alterada em outro dispositivo. Recarregue a inspeção.',
          ctx.path,
        );
      }

      return result.isNew ? created(result.response) : ok(result.response);
    },
  },

  {
    method: 'POST',
    pattern: '/inspections/:inspectionId/responses:batch',
    handle: (ctx) => {
      const account = requireAccount(ctx);
      const inspection = findInspection(ctx);
      if (!inspection) return fail(404, 'NOT_FOUND', 'Inspeção não encontrada.', ctx.path);

      const request = asRecord(ctx.body) as Partial<InspectionResponseBatchRequest>;
      const entries = Array.isArray(request.responses) ? request.responses : [];

      const results: InspectionResponseBatchItemResult[] = entries.map((entry) => {
        const result = upsertResponse(ctx.db, inspection.id, account.id, entry);

        if (result.conflict) {
          return {
            inspectionItemId: entry.inspectionItemId,
            status: 'CONFLICT',
            responseId: result.response.id,
            version: result.response.version,
          };
        }

        return {
          inspectionItemId: entry.inspectionItemId,
          status: 'APPLIED',
          responseId: result.response.id,
          version: result.response.version,
        };
      });

      return ok({ results });
    },
  },

  {
    method: 'GET',
    pattern: '/inspections/:inspectionId/evidence',
    handle: (ctx) => {
      requireAccount(ctx);
      const inspectionId = ctx.params.inspectionId ?? '';
      return ok(ctx.db.evidence[inspectionId] ?? []);
    },
  },

  {
    method: 'POST',
    pattern: '/inspections/:inspectionId/evidence',
    handle: (ctx) => {
      const account = requireAccount(ctx);
      const inspection = findInspection(ctx);
      if (!inspection) return fail(404, 'NOT_FOUND', 'Inspeção não encontrada.', ctx.path);

      const meta = readFormFields(ctx.formData);
      const idempotencyKey = typeof meta.idempotencyKey === 'string' ? meta.idempotencyKey : null;
      const existing = (ctx.db.evidence[inspection.id] ?? []).find(
        (item) => idempotencyKey !== null && item.checksum === idempotencyKey,
      );

      // §11.8: reenviar a mesma chave não pode duplicar a evidência.
      if (existing) return ok(existing);

      const evidence: Evidence = {
        id: nextMockId(),
        inspectionId: inspection.id,
        responseId: typeof meta.responseId === 'string' ? meta.responseId : null,
        nonConformityId: typeof meta.nonConformityId === 'string' ? meta.nonConformityId : null,
        type: 'PHOTO',
        storageKey: `mock/${inspection.id}/${nextMockId()}.jpg`,
        // Sem servidor de arquivos: a própria URI local serve para pré-visualizar.
        accessUrl: typeof meta.uri === 'string' ? meta.uri : 'https://placehold.co/600x400',
        mimeType: typeof meta.mimeType === 'string' ? meta.mimeType : 'image/jpeg',
        sizeBytes: 1_048_576,
        checksum: idempotencyKey,
        description: typeof meta.description === 'string' ? meta.description : null,
        latitude: typeof meta.latitude === 'string' ? Number(meta.latitude) : null,
        longitude: typeof meta.longitude === 'string' ? Number(meta.longitude) : null,
        capturedAtDevice:
          typeof meta.capturedAtDevice === 'string' ? meta.capturedAtDevice : nowIso(),
        serverReceivedAt: nowIso(),
        uploadedAt: nowIso(),
        createdBy: account.id,
        createdAt: nowIso(),
      };

      ctx.db.evidence[inspection.id] = [...(ctx.db.evidence[inspection.id] ?? []), evidence];
      return created(evidence);
    },
  },

  {
    method: 'DELETE',
    pattern: '/evidence/:id',
    handle: (ctx) => {
      requireAccount(ctx);
      const id = ctx.params.id ?? '';

      for (const [inspectionId, list] of Object.entries(ctx.db.evidence)) {
        if (list.some((item) => item.id === id)) {
          ctx.db.evidence[inspectionId] = list.filter((item) => item.id !== id);
          return noContent();
        }
      }
      return fail(404, 'NOT_FOUND', 'Evidência não encontrada.', ctx.path);
    },
  },

  {
    method: 'POST',
    pattern: '/inspections/:inspectionId/non-conformities',
    handle: (ctx) => {
      const account = requireAccount(ctx);
      const inspection = findInspection(ctx);
      if (!inspection) return fail(404, 'NOT_FOUND', 'Inspeção não encontrada.', ctx.path);

      const request = asRecord(ctx.body) as Partial<NonConformityCreateRequest>;
      const fieldErrors = [
        !request.title ? { field: 'title', message: 'Informe o título.' } : null,
        !request.description ? { field: 'description', message: 'Descreva a não conformidade.' } : null,
        !request.severity ? { field: 'severity', message: 'Informe a severidade.' } : null,
      ].filter((item): item is { field: string; message: string } => item !== null);

      if (fieldErrors.length > 0) {
        return fail(400, 'BAD_REQUEST', 'Dados incompletos.', ctx.path, fieldErrors);
      }

      const nonConformity: NonConformity = {
        id: nextMockId(),
        inspectionId: inspection.id,
        inspectionItemId: request.inspectionItemId ?? null,
        responseId: request.responseId ?? null,
        title: request.title ?? '',
        description: request.description ?? '',
        severity: request.severity ?? 'LOW',
        status: 'OPEN',
        createdBy: account.id,
        createdAtDevice: request.createdAtDevice ?? nowIso(),
        serverReceivedAt: nowIso(),
        createdAt: nowIso(),
        updatedAt: nowIso(),
        version: 1,
      };

      ctx.db.nonConformities.push(nonConformity);
      return created(nonConformity);
    },
  },

  {
    method: 'PUT',
    pattern: '/non-conformities/:id',
    handle: (ctx) => {
      requireAccount(ctx);
      const found = ctx.db.nonConformities.find((item) => item.id === ctx.params.id);
      if (!found) return fail(404, 'NOT_FOUND', 'Não conformidade não encontrada.', ctx.path);

      const request = asRecord(ctx.body) as Partial<NonConformityUpdateRequest>;
      const fieldErrors = [
        !request.title ? { field: 'title', message: 'Informe o título.' } : null,
        !request.description ? { field: 'description', message: 'Descreva a não conformidade.' } : null,
        !request.severity ? { field: 'severity', message: 'Informe a severidade.' } : null,
      ].filter((item): item is { field: string; message: string } => item !== null);

      if (fieldErrors.length > 0) {
        return fail(400, 'BAD_REQUEST', 'Dados incompletos.', ctx.path, fieldErrors);
      }

      found.title = request.title ?? found.title;
      found.description = request.description ?? found.description;
      found.severity = request.severity ?? found.severity;
      found.updatedAt = nowIso();
      found.version += 1;

      return ok(found);
    },
  },

  {
    method: 'GET',
    pattern: '/non-conformities',
    handle: (ctx) => {
      requireAccount(ctx);
      const inspectionId = ctx.query.inspectionId;
      const severity = ctx.query.severity;

      const filtered = ctx.db.nonConformities
        .filter((item) => (inspectionId ? item.inspectionId === inspectionId : true))
        .filter((item) => (severity ? item.severity === severity : true));

      return ok(paginate(filtered, ctx.query));
    },
  },

  {
    method: 'GET',
    pattern: '/inspections/:inspectionId/reviews',
    handle: (ctx) => {
      requireAccount(ctx);
      const inspectionId = ctx.params.inspectionId ?? '';
      return ok(ctx.db.reviews.filter((review) => review.inspectionId === inspectionId));
    },
  },

  {
    method: 'GET',
    pattern: '/equipment/by-qr/:qrCode',
    handle: (ctx) => {
      requireAccount(ctx);
      const found = ctx.db.equipment.find((item) => item.qrCode === ctx.params.qrCode);
      return found
        ? ok(found)
        : fail(404, 'EQUIPMENT_NOT_FOUND', 'Nenhum equipamento com este QR Code.', ctx.path);
    },
  },

  {
    method: 'GET',
    pattern: '/equipment/:id',
    handle: (ctx) => {
      requireAccount(ctx);
      const found = ctx.db.equipment.find((item) => item.id === ctx.params.id);
      return found ? ok(found) : fail(404, 'NOT_FOUND', 'Equipamento não encontrado.', ctx.path);
    },
  },

  {
    method: 'GET',
    pattern: '/sites/:id',
    handle: (ctx) => {
      requireAccount(ctx);
      const found = ctx.db.sites.find((item) => item.id === ctx.params.id);
      return found ? ok(found) : fail(404, 'NOT_FOUND', 'Local não encontrado.', ctx.path);
    },
  },

  {
    method: 'GET',
    pattern: '/clients/:id',
    handle: (ctx) => {
      requireAccount(ctx);
      const found = ctx.db.clients.find((item) => item.id === ctx.params.id);
      return found ? ok(found) : fail(404, 'NOT_FOUND', 'Cliente não encontrado.', ctx.path);
    },
  },

  {
    method: 'GET',
    pattern: '/inspection-template-versions/:versionId',
    handle: (ctx) => {
      requireAccount(ctx);
      const found = ctx.db.templateVersions.find((item) => item.id === ctx.params.versionId);
      return found ? ok(found) : fail(404, 'NOT_FOUND', 'Versão não encontrada.', ctx.path);
    },
  },

  {
    method: 'GET',
    pattern: '/dashboard/summary',
    handle: (ctx) => {
      const account = requireAccount(ctx);
      const mine = ctx.db.inspections.filter((inspection) => ownsInspection(account, inspection));
      const count = (status: Inspection['status']) =>
        mine.filter((inspection) => inspection.status === status).length;

      const summary: DashboardSummary = {
        totalInspections: mine.length,
        inspectionsInProgress: count('IN_PROGRESS'),
        inspectionsPendingReview: count('SUBMITTED') + count('UNDER_REVIEW'),
        inspectionsOverdue: mine.filter(
          (inspection) =>
            inspection.scheduledFor < nowIso() &&
            (inspection.status === 'ASSIGNED' || inspection.status === 'IN_PROGRESS'),
        ).length,
        inspectionsApproved: count('APPROVED'),
        inspectionsRejected: count('REJECTED'),
        nonConformitiesOpen: ctx.db.nonConformities.filter((item) => item.status === 'OPEN').length,
      };
      return ok(summary);
    },
  },
];

interface UpsertResult {
  response: InspectionResponse;
  isNew: boolean;
  conflict: boolean;
}

/**
 * Grava a resposta de um item. `baseVersion` diferente da versão guardada
 * significa que outro dispositivo alterou o mesmo item (RN-075).
 */
function upsertResponse(
  db: MockDatabase,
  inspectionId: string,
  authorId: string,
  request: InspectionResponseUpsertRequest,
  responseId?: string,
): UpsertResult {
  const list = db.responses[inspectionId] ?? [];
  const existing = list.find((item) => item.inspectionItemId === request.inspectionItemId);

  if (existing) {
    if (request.baseVersion !== undefined && request.baseVersion !== existing.version) {
      return { response: existing, isNew: false, conflict: true };
    }

    const updated: InspectionResponse = {
      ...existing,
      valueText: request.valueText ?? null,
      valueNumber: request.valueNumber ?? null,
      valueBoolean: request.valueBoolean ?? null,
      valueDate: request.valueDate ?? null,
      valueJson: request.valueJson ?? null,
      observation: request.observation ?? null,
      conformity: request.conformity ?? existing.conformity,
      answeredAtDevice: request.answeredAtDevice,
      serverReceivedAt: nowIso(),
      updatedAt: nowIso(),
      version: existing.version + 1,
    };

    db.responses[inspectionId] = list.map((item) => (item.id === existing.id ? updated : item));
    return { response: updated, isNew: false, conflict: false };
  }

  const response: InspectionResponse = {
    id: responseId ?? nextMockId(),
    inspectionId,
    inspectionItemId: request.inspectionItemId,
    valueText: request.valueText ?? null,
    valueNumber: request.valueNumber ?? null,
    valueBoolean: request.valueBoolean ?? null,
    valueDate: request.valueDate ?? null,
    valueJson: request.valueJson ?? null,
    observation: request.observation ?? null,
    conformity: request.conformity ?? 'NOT_APPLICABLE',
    answeredBy: authorId,
    answeredAtDevice: request.answeredAtDevice,
    serverReceivedAt: nowIso(),
    createdAt: nowIso(),
    updatedAt: nowIso(),
    version: 1,
  };

  db.responses[inspectionId] = [...list, response];
  return { response, isNew: true, conflict: false };
}

/**
 * Lê os campos de texto do multipart. O `FormData` do React Native não expõe
 * `get`/`entries` como o da web, então a leitura é feita por reflexão e cai
 * para um objeto vazio quando o formato não é reconhecido.
 */
function readFormFields(formData: FormData | null): Record<string, unknown> {
  if (!formData) return {};

  const fields: Record<string, unknown> = {};

  const parts = (formData as unknown as { _parts?: [string, unknown][] })._parts;
  if (Array.isArray(parts)) {
    for (const [key, value] of parts) {
      if (key === 'file' && typeof value === 'object' && value !== null) {
        const file = value as { uri?: string; type?: string };
        if (file.uri) fields.uri = file.uri;
        if (file.type) fields.mimeType = file.type;
        continue;
      }
      fields[key] = value;
    }
    return fields;
  }

  if (typeof formData.forEach === 'function') {
    formData.forEach((value, key) => {
      fields[key] = value;
    });
  }
  return fields;
}

/** Ponto de entrada usado pelo `ApiClient` quando o modo mock está ligado. */
export async function handleMockRequest(request: MockRequest): Promise<HttpResponse> {
  const config = getApiConfig();
  // A latência fingida existe para os estados de carregamento aparecerem.
  await delay(config.mockLatencyMs);

  const db = getMockDatabase();
  const path = request.path.split('?')[0] ?? request.path;

  for (const route of routes) {
    if (route.method !== request.method) continue;

    const params = matchPattern(route.pattern, path);
    if (!params) continue;

    let account: MockAccount | null = null;
    if (route.auth !== false) {
      const accountId = request.accessToken ? db.accessTokens.get(request.accessToken) : undefined;
      account = db.users.find((candidate) => candidate.id === accountId) ?? null;

      // Sem token válido o mock responde 401, que é o gatilho do refresh no
      // `ApiClient` — o fluxo de renovação é exercitado igual ao da API real.
      if (!account) {
        return fail(401, 'UNAUTHORIZED', 'Sessão não autenticada.', path);
      }
    }

    return route.handle({
      params,
      query: request.query,
      body: request.body,
      formData: request.formData,
      db,
      account,
      path,
    });
  }

  return fail(
    404,
    'MOCK_ROUTE_NOT_FOUND',
    `Rota ${request.method} ${path} não existe no modo mock.`,
    path,
  );
}
