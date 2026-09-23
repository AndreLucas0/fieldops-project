# Backend Feature Audit

**Date:** 2026-09-22
**Branch analyzed:** `main` (HEAD `c929ea3`, working tree clean at audit time)
**Type:** read-only audit — no project file was modified during the audit itself
**Scope:** Backend Java/Spring Boot (`backend/src/main/java/com/codemind/fieldops`) compared against `./docs/**`, `openapi.yaml`, `test-plan.md`, `ESTADO-DO-PROJETO.md`, `PROMPT-MESTRE-DOCUMENTACAO.md`. `web/` and `mobile/` were only grepped to classify integration status (never treated as proof of backend implementation).
**Full original report (not committed to the repo):** was written to a session scratchpad file during the audit; that file is ephemeral and may no longer exist. This document is the persistent record — treat it, not the scratchpad copy, as the source of truth going forward.

Status: **ACTIVE** (not superseded)

## Summary

**44 features analyzed:**

| Category | Count | % |
|---|---:|---:|
| 🟢 IMPLEMENTADA | 28 | 63.6% |
| 🟡 PARCIALMENTE IMPLEMENTADA | 6 | 13.6% |
| 🔴 NÃO IMPLEMENTADA | 7 | 15.9% |
| ⚪ IMPLEMENTADA, SEM EVIDÊNCIA DE TESTE | 2 | 4.5% |
| 🔵 MOCK / PLACEHOLDER | 0 | 0% |
| 🟣 IMPLEMENTADA, MAS NÃO INTEGRADA | 1 | 2.3% |

**Conclusion:** the backend is **not functionally complete** relative to `./docs/**`. The core end-to-end flow (auth, master data CRUD, first-time template publish, scheduling, execution basics, evidence, non-conformities, review cycle, offline sync push/pull) is implemented with matching integration tests. The gaps are concentrated in: template re-versioning, a few read-only/reporting endpoints, and — most importantly — two data-integrity rules that are not enforced server-side.

## Methodology (condensed)

- Full read of all `docs/**` Markdown files (24 files; the `.docx` charter under `docs/gestao-de-projetos/` was out of scope, not a functional spec) plus `openapi.yaml`, `test-plan.md`, `ESTADO-DO-PROJETO.md`, `PROMPT-MESTRE-DOCUMENTACAO.md`.
- Full map of the backend via Glob/Grep: 184 Java files across 12 domain modules (`auth, client, equipment, evidence, inspection, nonconformity, review, shared, site, synchronization, template, user`), every `@GetMapping/@PostMapping/@PutMapping/@PatchMapping/@DeleteMapping`, every `@PreAuthorize`, 12 Flyway migrations (`V1`–`V12`), 27 test files (`*Test.java`/`*IT.java`).
- Deterministic extraction of all method+path combinations from `openapi.yaml`: **71** combinations (note: `docs/contrato-backend-frontend.md` §3.1 says "Total: 49 endpoints" — that counts unique paths, not method+path operations; a documentation counting inconsistency, not a backend defect).
- For each documented endpoint: located the real controller, read the corresponding service, checked `@PreAuthorize` + ownership checks, checked for a matching integration test.
- Read critical domain code line-by-line (not just signatures): `Inspection` state machine, critical-evidence validation, JWT session policy, synchronization service.
- Grepped for `TODO`, `FIXME`, `NotImplemented`, `UnsupportedOperationException`, `return null`, `mock`, `stub` — no relevant hits outside explanatory javadoc.
- Checked `web/src/app/core/services/resources.ts` and `mobile/src/services/*.ts` only to decide 🟣 vs. contract-divergence classification.

## 🟢 Implemented (28) — feature / evidence / test

| # | Feature | Controller/Service | Test evidence |
|---|---|---|---|
| 1 | Login (RN-001,007) | `AuthController`, `AuthenticationService` | `AuthControllerIT`, `AuthenticationServiceTest` |
| 2 | Token refresh (RN-008) | `AuthController.refresh`, `JwtConfig` | `AuthenticationServiceTest`, `SessionPolicyTest` |
| 3 | Logout / session invalidation (RN-008) | `AuthenticationService.logout` → `User.invalidateSessions()` | `AuthControllerIT`, `SessionPolicyTest` |
| 4 | `GET /auth/me` | `AuthController.me` | `AuthControllerIT` |
| 5 | Role-based authorization matrix (RN-003/005/006) | `@PreAuthorize` on all 13 controllers; explicit ownership check in `InspectionExecutionService` | `*ControllerIT` per domain |
| 6 | User CRUD + status + password reset (RN-001,002,004-008) | `UserController`, `UserService`, `User.changeStatus/changePassword` | `UserControllerIT`, `UserStatusTransitionTest` |
| 7 | Client CRUD (RN-009,013) | `ClientController`, `ClientService` | `ClientControllerIT` |
| 8 | Site CRUD (RN-009,013) | `SiteController`, `SiteService` | `SiteControllerIT` |
| 9 | Equipment CRUD + unique QR (RN-010,011,013) | `EquipmentController`, `EquipmentService` | `EquipmentControllerIT` |
| 10 | Create/edit draft template (RN-015-018) | `TemplateController.create/update`, `TemplateService` (blocks edit outside `DRAFT`) | `InspectionTemplateControllerIT` |
| 11 | Publish 1st version of a template (RN-015,016,020) | `TemplateService.publish` | `InspectionTemplateControllerIT` |
| 12 | Schedule inspection + snapshot creation (RN-021,024-026) | `InspectionService.create` + `createSnapshots` | `InspectionSchedulingControllerIT` |
| 13 | Assign technician (RN-027,031) | `InspectionService.assign` | `InspectionSchedulingControllerIT` |
| 14 | Cancel with justification (RN-029,030) | `InspectionService.cancel` (blocks `APPROVED`/`SUBMITTED`) | `InspectionSchedulingControllerIT` |
| 15 | Start inspection (RN-032-034) | `InspectionExecutionService.start` | `InspectionExecutionControllerIT` |
| 16 | Non-conformity registration (RN-052-054) | `NonConformityService.create` | `NonConformityControllerIT` |
| 17 | Critical NC requires evidence (RN-055) | `NonConformityEvidenceValidator` | `CriticalNonConformityEvidenceTest` |
| 18 | Geolocation capture at start/finish (RN-060-062) | `GeoLocationRequest`, recorded in `InspectionExecutionService` | `GeoLocationCaptureTest` |
| 19 | Evidence upload with idempotency (RN-045,046,050,051,068) | `EvidenceService.upload`, `EvidenceUploadValidator` | `EvidenceControllerIT`, `UploadValidationTest` |
| 20 | Full review cycle (begin-review/approve/reject) (RN-079-085) | `ReviewService`, `InspectionReview.reviewCycle` | `ReviewControllerIT`, `ReviewCycleTest` |
| 21 | Sync push w/ idempotency + per-op transaction (RN-067-070) | `SynchronizationService.push/processOne` | `SyncPushControllerIT`, `IdempotencyTest` |
| 22 | Conflict detection via `baseVersion` (RN-075) | `SynchronizationService.apply*` | `ConflictDetectionTest` |
| 23 | Incremental pull by cursor (RN-073,077) | `SynchronizationService.pull` | `SyncPullControllerIT` |
| 24 | Persistence/migrations (schema, optimistic locking, idempotency) | `V1`–`V12` | `FlywayMigrationIT` |
| 25 | Standardized error handling (RN-090 partial) | `GlobalExceptionHandler` | implicit in all `*ControllerIT` |
| 26 | Standard pagination/sorting (RNF-003) | `PageResponse`, `SortFieldValidator` | implicit in listing `*ControllerIT` |
| 27 | Cross-cutting security (JWT HS256, BCrypt, `SessionPolicy`) | `JwtConfig`, `SecurityConfig`, `SessionTokenValidator`, `TokenUseValidator` | `SessionPolicyTest`, `AuthenticationServiceTest` |
| 28 | Evidence upload kept out of structural sync channel (RN-078) | `SynchronizationService.apply` rejects `EVIDENCE` with `SYNC_EVIDENCE_NOT_SUPPORTED_CODE` | `SyncPushControllerIT` (implicit) |

## 🟡 Partially implemented (6)

| # | Feature | Implemented | Missing | Doc source | Files |
|---|---|---|---|---|---|
| 1 | Nested navigation client→site, site→equipment | `GET /sites?clientId=`, `GET /equipment?siteId=` give the same result | Documented `GET /clients/{clientId}/sites` and `GET /sites/{siteId}/equipment` don't exist; web (`resources.ts:189,210`) already calls those exact paths → 404 | `api-rest.md` §12.7/12.8 | `SiteController.java`, `EquipmentController.java` |
| 2 | Equipment lookup by QR (RN-063) | `GET /equipment/by-qr/{qrCode}` works for ADMIN/SUPERVISOR/TECHNICIAN | No check that the technician has an assigned inspection related to that equipment before returning full data (PEND-04) | `regras-de-negocio.md` RN-063; `contrato-backend-frontend.md` PEND-04 | `EquipmentController.java:83-87` |
| 3 | Admin filters on `GET /inspections` | `clientId, siteId, technicianId, status, priority` via `Specification` | Missing: `supervisorId, equipmentId, scheduledFrom/To, overdue`, free-text `q` (PEND-15) | `api-rest.md` §12.10 | `InspectionSpecifications.java` |
| 4 | Checklist response recording (RN-035,036,038) | Persists `valueText/valueNumber/valueBoolean/valueDate/valueChoice/observation` per snapshot item, `UNIQUE(inspection_id, snapshot_id)` | Does not validate value against `responseType`; **`conformity` field is never set by any write route** (`InspectionResponseCreateRequest`/`InspectionResponseSyncPayload` don't include it); does not require `observation` on non-conforming answers | `regras-de-negocio.md` RN-035,036,038; `modelo-de-dados.md` §10.8.4 | `InspectionExecutionService.upsertResponse`, `InspectionResponse.java` |
| 5 | Inspection submit (RN-037,042-044) | Validates all required snapshot items have an answer before `SUBMITTED` | Does not validate at submit time that non-conforming answers have an observation (RN-038) or that critical non-conforming items have evidence (RN-039) — only `NonConformity` (a separate record) enforces evidence | `regras-de-negocio.md` RN-037-039 | `InspectionExecutionService.submit` |
| 6 | Evidence deletion (RN-048,049) | Blocks deletion when inspection is `APPROVED`; publishes `AuditEvent EVIDENCE_REMOVED` | No ownership check — any `TECHNICIAN` (not just the inspection owner) can `DELETE /evidence/{id}` (PEND-05) | `regras-de-negocio.md` RN-048; PEND-05 | `EvidenceController.delete`, `EvidenceService.delete` |

## 🔴 Not implemented (7) — the important category

See `pending-features.md` for the actionable backlog (BF-001..BF-007); this section keeps the raw evidence.

1. **Template multi-versioning.** `TemplateService.update()`/`publish()` require `status == DRAFT`; `publish()` never returns status to `DRAFT`; no method creates a new version from an `ACTIVE` template. No test exercises "publish a second version." Docs: RN-018,019,020,022; UC-04/05.
2. **List/consult published template versions.** No `GET /templates/{id}/versions` or `GET /template-versions/{id}` anywhere in `TemplateController` or elsewhere; only `GET /templates/{id}/active-version` (current version only). Web (`resources.ts:239-247`) already calls the two missing paths. Docs: `api-rest.md` §12.9.
3. **Incremental section/item builder endpoints.** No `POST/PUT` for `sections`/`items` in `TemplateController` — sections/items are only accepted as a nested list inside `TemplateCreateRequest`/`PublishTemplateRequest`, a different usage model than documented. Web (`resources.ts:250`) calls `GET /inspection-templates/{id}/sections`, which doesn't exist. Docs: `api-rest.md` §12.9.
4. **Inspection audit-history read endpoint.** `shared/audit` only has `AuditEvent` (entity), `AuditEventPublisher` (write), `AuditEventRepository` — no controller/service exposes `GET /inspections/{id}/history`. Docs: RN-086; UC-18; `api-rest.md` §12.10.
5. **Lock responses after SUBMITTED/UNDER_REVIEW/APPROVED.** `InspectionExecutionService.upsertResponse` (used by both `PUT /inspections/{id}/responses/{snapshotId}` and the sync push path) never reads `inspection.getStatus()`. No test covers "answer after approved/submitted." Docs: RN-043, RN-082.
6. **Evidence read-only for new uploads after approval.** Only `delete()` checks `APPROVED`; `EvidenceService.upload()` does not. Docs: RN-049.
7. **Admin dashboard endpoints (`/dashboard/*`).** No `dashboard` package exists in the backend at all. Web already implements the `/dashboard` screen (FE-W02) and calls all three endpoints (`resources.ts:304-310`) — they will 404 against the real backend. Docs: `api-rest.md` §12.16; `plano-implementacao-backend.md` Sprint 8.

## ⚪ Implemented without sufficient test evidence (2)

| Feature | Note |
|---|---|
| Audit event recording (RN-086,087) | `AuditEventPublisher` is called on every reviewed transition, but there's no dedicated unit/integration test for it (`AuditControllerIT`/`AuditEventPublisher` test not found). Not proof of absence — just untested. |
| Cross-cutting ownership authorization | Confirmed tested for inspection/response/mobile controllers; **not** confirmed tested for `NonConformityController`/`EvidenceController` ("technician can't touch another technician's inspection" case). `AuthorizationBoundaryIT` (planned per `test-plan.md` M8) doesn't exist. |

## 🔵 Mock/placeholder (0)

None found. `TODO`/`FIXME`/`NotImplemented`/stub greps returned no relevant hits tied to a documented requirement.

## 🟣 Implemented but not integrated (1)

**Offline sync (outbox push + incremental pull).** Backend: 🟢 complete and tested (`SynchronizationService`, `sync_operations` table, idempotency, version-based conflict detection — see 🟢 items 21-23). Endpoints: `POST /mobile/sync/push`, `GET /mobile/sync/pull`. Mobile: no reference to `sync/push`, `sync/pull`, local queue, or outbox found anywhere in `mobile/src`. `ESTADO-DO-PROJETO.md` §5/§10 confirms (from the mobile team's own account) there is no sync engine, queue, or local DB — the "Sincronizar" button just reloads the list and fakes a 2s wait. This is a mobile-integration gap, **not** a backend defect (BF-007).

Note: mobile does call `/auth/login`, `/auth/refresh`, `/auth/logout`, `/auth/me` directly (`mobile/src/services/auth-service.ts`), consistent with the recent commit `358b1ec fix: allow technicians to start assigned inspections` and `4f31cda feat: implement web authentication flow`. A full mobile/web integration sweep against every endpoint was **not** performed (out of scope for a backend audit) — any other integration-completeness claim is **inconclusive / needs a dedicated frontend audit**.

## Contract divergences (documentation ↔ code)

| # | Doc | Requirement | Code | Type |
|---|---|---|---|---|
| 1 | `api-rest.md` §12.9 | Base path `/inspection-templates` | `TemplateController` uses `/templates` | Contract divergence |
| 2 | `api-rest.md` §12.11 | `PUT /inspections/{id}/responses/{responseId}` (device-generated id) | `PUT /inspections/{inspectionId}/responses/{snapshotId}` (id is the snapshot's, not the response's) | Contract divergence — blocks offline-first response id generation described in `modelo-de-dados.md` §10.2 |
| 3 | `api-rest.md` §12.11 | `POST /inspections/{id}/responses:batch` | Doesn't exist | Feature absent (low impact — sync covers the main use case) |
| 4 | `web/.../resources.ts:239-250` | Version/section endpoints | Don't exist in `TemplateController` | Contract divergence (web builder screen breaks against real backend) |
| 5 | `web/.../resources.ts:304-310` | Dashboard endpoints | Don't exist | Contract divergence (whole admin dashboard depends on missing endpoints) |
| 6 | `contrato-backend-frontend.md` §3.1 | "Total: 49 endpoints" | `openapi.yaml` has 71 method+path combinations | Documentation-only miscount, no functional impact |
| 7 | `regras-de-negocio.md` RN-030 | Cancel blocked only when `APPROVED` | `InspectionService.cancel` also blocks `SUBMITTED` | Code is stricter than the written rule — plausible product intent, but undocumented |
| 8 | `regras-de-negocio.md` RN-057 | `PATCH /non-conformities/{id}/status` (single `OPEN` enum value, no-op) | Implemented exactly as a documented no-op | Expected — not a new finding (`plano-implementacao-backend.md` §17: "implement, but no screen") |
| 9 | `ESTADO-DO-PROJETO.md` (2026-08-18) | "A API (Java/Spring) não existe neste repositório" | 184 Java files, 12 migrations, 27 test files exist in `backend/` | Stale document — written from the `web` branch before backend was merged to `main`. Do not treat that file's backend claims as current. |

## Endpoint coverage (from `openapi.yaml`, 71 method+path combinations)

- **58 present** in some form (52 strictly matching path+semantics; 6 present but with path/id-semantics divergence — items 1-2 above).
- **13 absent entirely** (see 🔴 list above: versions, incremental sections/items, history, dashboard×3, nested navigation×2, responses:batch, plus divergent id semantics not counted twice).

## Workflows/state machines

### `Inspection` (`InspectionStatus`: `DRAFT, ASSIGNED, IN_PROGRESS, SUBMITTED, UNDER_REVIEW, APPROVED, REJECTED, CANCELED` — matches doc exactly, no naming divergence)

- `DRAFT → ASSIGNED` (assign): implemented, `InspectionService.assign`.
- `ASSIGNED/DRAFT/REJECTED → IN_PROGRESS` (start): implemented, more permissive than the doc table (which only lists `ASSIGNED→IN_PROGRESS`) — accepting `DRAFT`/`REJECTED` is consistent with RN-033/the correction flow, just not spelled out as such in the doc.
- `IN_PROGRESS → SUBMITTED` (submit): implemented, but missing RN-038/039 validations (see 🟡 #5 / 🔴 #5).
- `SUBMITTED → UNDER_REVIEW` (begin-review), `UNDER_REVIEW → APPROVED/REJECTED`: implemented, `ReviewService`.
- `REJECTED → IN_PROGRESS` (reopen): implemented implicitly via `start` accepting `REJECTED`.
- `→ CANCELED`: `InspectionService.cancel` blocks only from `APPROVED`/`SUBMITTED` (stricter than documented — see divergence #7).
- No consolidated `StateTransitionGuardTest` covering all invalid combinations at once (planned in `test-plan.md` §5.8, not found).
- **Cannot reassign an `IN_PROGRESS` inspection to another technician** — no endpoint covers it; consistent with open decision PEND-14, but the code's "not allowed" choice isn't documented as such.

### `InspectionTemplate`/`TemplateVersion`

Documented: `DRAFT → ACTIVE → INACTIVE`, publish should be able to produce new versions. **Code only implements `DRAFT → ACTIVE` (first publish)** — no transition to `INACTIVE`, no path to a second version from `ACTIVE`. Same finding as 🔴 #1, restated as a state-machine gap.

### `NonConformity`

Matches documentation exactly: single active value `OPEN` in the MVP (RN-057); `PATCH .../status` exists but is a documented no-op.

### `SyncOperationStatus` (`APPLIED, ALREADY_APPLIED, REJECTED, CONFLICT, DEPENDENCY_FAILED`)

Matches documentation exactly, including automatic `APPLIED → ALREADY_APPLIED` conversion on resend.
