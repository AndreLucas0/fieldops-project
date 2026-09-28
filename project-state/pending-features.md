# Backend — Pending Features

## Status Legend

- `PENDING` — not implemented yet
- `PARTIAL` — incomplete implementation
- `BLOCKED` — depends on another task
- `IN_PROGRESS` — currently being developed
- `DONE` — completed and validated
- `INCONCLUSIVE` — insufficient evidence

Each item below originates from `project-state/backend-audit.md` (audit dated
2026-09-22, HEAD `c929ea3`). Before implementing any of these, re-read the
cited documentation section and the current code — this backlog is a
snapshot, not a spec. Do not implement any of these automatically; each is a
tracked task waiting to be picked up deliberately.

---

## BF-001 — Template Versioning

Status: DONE

Description:
`POST /inspection-templates/{id}/publish` now works for templates in any status
(not only `DRAFT`). Calling it on an `ACTIVE` template creates a new version
with an auto-incremented `versionNumber`, deactivates all previous active
versions (`activeForNewInspections = false`), and keeps the template `ACTIVE`.
Concurrent publish attempts are guarded by the existing `@Version` column on
`InspectionTemplate` — a concurrent call receives 409 instead of 500.

Source:
Backend audit — 2026-09-22 (`project-state/backend-audit.md`, 🔴 #1).
Requirements: RN-019, RN-020; `casos-de-uso.md` UC-04; `criterios-de-aceitacao.md` §17.5.

Implementation (2026-09-27):
- `TemplateService.publish()`: removed `status != DRAFT` guard; added deactivation
  of previous active versions; added `ObjectOptimisticLockingFailureException` catch → 409.
- `InspectionTemplateControllerIT`: added `JdbcTemplate` TRUNCATE CASCADE setUp (HIGH #2 fix),
  added `TemplateVersionRepository` injection, 3 new IT tests.

Open: `TemplateService.update()` still requires `DRAFT` status — metadata changes on
ACTIVE templates are not yet unlocked (out of scope for BF-001; tracked here if needed).
INACTIVE template re-publish behavior is undocumented — recorded in decisions.md.

Validation (2026-09-27):
- `InspectionTemplateControllerIT.publishNewVersionOnActiveTemplateCreatesVersionTwo` — GREEN
- `InspectionTemplateControllerIT.getActiveVersionAfterRepublishReturnsVersionTwo` — GREEN
- `InspectionTemplateControllerIT.previousVersionIsDeactivatedAfterRepublish` — GREEN
- All 17/17 `InspectionTemplateControllerIT` tests GREEN (0 regressions)
- All 46/46 unit tests GREEN
- All 7/7 `TemplateVersionControllerIT` tests GREEN

Commitado: `7553bc7 feat: template versioning feature` (branch `feat/BF-001`, não mergeado em `main`).

---

## BF-002 — Lock Inspection Responses After Submission/Approval

Status: DONE

Description:
Prevent changes to checklist responses once an inspection reaches
`SUBMITTED`, `UNDER_REVIEW`, or `APPROVED`. Guard clause added to
`InspectionExecutionService.upsertResponse()`. `SynchronizationService.apply()`
updated to catch `ResourceConflictException` and return `Outcome.rejected()`.

Source:
Backend audit — 2026-09-22 (`project-state/backend-audit.md`, 🔴 #5).
Requirements: RN-043, RN-082.

Validation:
- `InspectionResponseControllerIT.upsertResponseOnSubmittedInspectionReturns409` — new test, GREEN.
- `InspectionResponseControllerIT.upsertResponseOnUnderReviewInspectionReturns409` — new test, GREEN.
- `InspectionResponseControllerIT.upsertResponseOnApprovedInspectionReturns409` — new test, GREEN.
- `SyncPushControllerIT.syncResponseOnApprovedInspectionIsRejected` — new test, GREEN.
- All 46 unit tests pass.
- IT tests run on 2026-09-27 (Docker available): 4/4 targeted BF-002 tests GREEN.
- Pre-existing failures em `FlywayMigrationIT` e `InspectionTemplateControllerIT` foram corrigidas no BF-005.

Commitado: `42d86fd feat: lock inspection responses after submission/approval` (branch `feat/BF-001`).

Relates to: BF-006 (same "approved = immutable" rule category).

---

## BF-003 — Persist `conformity`

Status: DONE

Description:
The `conformity` field (used by the `CONFORMITY` response type, required in
the MVP per `funcionalidades.md` §8.5) was never set by any client-facing
write route. Fixed 2026-09-27: added `String conformity` to
`InspectionResponseCreateRequest`, `InspectionResponseSyncPayload`, and
`InspectionResponseDto`; wired `Conformity.valueOf()` in
`InspectionExecutionService.upsertResponse()`; updated
`SynchronizationService.applyInspectionResponse()` and `toChange()` (pull
path). Input validation added: `@Pattern` on `InspectionResponseCreateRequest.conformity`
+ `@Valid` on controller `@RequestBody` so invalid enum strings return 400
instead of 500. Explicit `@Mapping` added to `InspectionResponseMapper.toDto()`
for consistency with `toMobileResponseDto()`.

Source:
Backend audit — 2026-09-22 (`project-state/backend-audit.md`, 🟡 #4).
Requirements: RN-035, RN-036, RN-038; `modelo-de-dados.md` §10.8.4;
`funcionalidades.md` §8.5.

Dependencies: none technically blocking.

Validation:
- `InspectionResponseControllerIT.upsertResponseWithConformityPersistsField` — new test, GREEN.
- `InspectionResponseControllerIT.upsertResponseWithNullConformityStoresNull` — new test, GREEN.
- `InspectionResponseControllerIT.upsertResponseWithInvalidConformityReturns400` — new test, GREEN (HIGH finding fix).
- `SyncPushControllerIT.syncResponseWithConformityIsAppliedAndFieldPersisted` — new test, GREEN.
- All 46 unit tests pass. `InspectionResponseControllerIT` 16/16 in isolation. `SyncPushControllerIT` 10/10 in isolation.

Commitado: `2c4893f feat: persist conformity field` (branch `feat/BF-001`).

---

## BF-004 — Dashboard and Inspection History Endpoints

Status: DONE

Description:
Implemented the documented/consumed endpoints:
- `GET /dashboard/summary` → `DashboardSummaryDto` (7 aggregate fields)
- `GET /dashboard/inspections-by-status` → `List<StatusCountDto>` (GROUP BY)
- `GET /dashboard/non-conformities-by-severity` → `List<SeverityCountDto>` (GROUP BY)
- `GET /inspections/{id}/history` → `PageResponse<AuditEventDto>` (paginated, ordered by occurredAt ASC)

Source:
Backend audit — 2026-09-22 (`project-state/backend-audit.md`, 🔴 #4 and #7).
Requirements: RN-086, UC-18, `api-rest.md` §12.10 (history); `api-rest.md`
§12.16, `plano-implementacao-backend.md` Sprint 8, UC-19 (dashboard).

Validation (2026-09-27):
- 13/13 targeted IT tests GREEN (`DashboardControllerIT` 8/8, `InspectionHistoryControllerIT` 5/5)
- 46/46 unit tests GREEN (no regressions)
- ECC java-reviewer: 0 CRITICAL, 2 HIGH (both fixed before merge):
  - Overdue exclusion set expanded to include `SUBMITTED` + `UNDER_REVIEW` (matches `shared/mocks/store.ts` `CLOSED_STATUSES`)
  - History existence guard moved into `InspectionService.getHistory()` — single `@Transactional(readOnly = true)` boundary

New files:
- `shared/audit/AuditEventDto.java`, `shared/audit/AuditService.java`
- `dashboard/dto/DashboardSummaryDto.java`, `StatusCountDto.java`, `SeverityCountDto.java`
- `dashboard/DashboardService.java`
- `dashboard/controller/DashboardController.java`

Modified files:
- `inspection/application/InspectionService.java` — added `getHistory()`, injected `AuditService`
- `inspection/controller/InspectionController.java` — added `GET /{id}/history`, delegates to `inspectionService.getHistory()`
- `inspection/repository/InspectionRepository.java` — added `countByStatus`, `countOverdue`, `countGroupByStatus` + `StatusCountView` projection
- `nonconformity/repository/NonConformityRepository.java` — added `countByStatus`, `countGroupBySeverity` + `SeverityCountView` projection

Commitado: `1545467 feat: implement dashboard and inspection history endpoints (BF-004)` (branch `feat/BF-001`).

---

## BF-005 — Template Versions and Sections Endpoints

Status: PARTIAL

Description:
Read endpoints implemented on 2026-09-27 (partial):
- `GET /inspection-templates/{id}/versions` → `PageResponse<TemplateVersionResponse>` — paginated, ordered by version_number DESC
- `GET /inspection-template-versions/{versionId}` → `TemplateVersionResponse` (with sections/items)
- `TemplateController` now responds at BOTH `/templates/*` AND `/inspection-templates/*` (dual mapping) to match the web client's API calls (`resources.ts`)
- Pre-req fixes: `FlywayMigrationIT` version assertion "9" → "12"; `TemplateItemRequest` 3 `boolean` fields → `Boolean` (boxed)

Still pending:
- Section/item builder endpoints (`POST/PUT .../sections`, `POST/PUT .../sections/{id}/items`) — blocked by data model decision: draft sections have no storage location (`TemplateSection` belongs to `TemplateVersion`, not `InspectionTemplate`; see `decisions.md` 2026-09-27)

Source:
Backend audit — 2026-09-22 (`project-state/backend-audit.md`, 🔴 #2 and #3).
Requirements: RN-019, RN-020, RN-022, `api-rest.md` §12.9.

Validation (2026-09-27):
- 7/7 IT tests GREEN (`TemplateVersionControllerIT`): adminCanListVersions(200), supervisorCanListVersions(200), technicianCannotListVersions(403), listVersionsForNonExistentTemplate(404), adminCanGetVersionDetail(200), technicianCannotGetVersionDetail(403), versionDetailNotFound(404)
- 46/46 unit tests GREEN (no regressions)
- ECC java-reviewer: 0 CRITICAL, 3 HIGH — 2 were not real issues (annotation present, open-in-view is pre-existing codebase pattern); 1 N+1 recorded in `decisions.md` for future sprint; 2 MEDIUM findings fixed (sort validation + technician-403 test for detail endpoint)

New files:
- `template/controller/InspectionTemplateVersionController.java` — `GET /inspection-template-versions/{versionId}`
- `template/controller/TemplateVersionControllerIT.java` (test)

Modified files:
- `template/controller/TemplateController.java` — dual mapping `{"/templates", "/inspection-templates"}`, added `GET /{id}/versions` with sort validation
- `template/application/TemplateService.java` — added `listVersions()`, `getVersion()`
- `template/repository/TemplateVersionRepository.java` — added `findByTemplateIdOrderByVersionNumberDesc(UUID, Pageable)`
- `shared/FlywayMigrationIT.java` — version assertion "9" → "12"
- `template/dto/TemplateItemRequest.java` — `boolean` → `Boolean` (3 fields)

Commitado: `228825c feat: template versions and sections endpoints` (branch `feat/BF-001`).

---

## BF-006 — Evidence Read-Only After Approval

Status: DONE

Description:
Prevent new evidence uploads once an inspection reaches `APPROVED`.
Implemented 2026-09-26 via guard clause in `EvidenceService.upload()` (mirrors
existing `delete()` pattern). Both upload and delete now enforce RN-049.

Source:
Backend audit — 2026-09-22 (`project-state/backend-audit.md`, 🔴 #6).
Requirement: RN-049.

Relates to: BF-002 (same "approved = immutable" rule category).

Dependencies: none.

Validation:
- `EvidenceControllerIT.uploadToApprovedInspectionReturns409` — new test, passes.
- All 11 `EvidenceControllerIT` tests pass; 46 unit tests pass.
- Committed 2026-09-27: `132b2c4 feat: evidence read only`.

---

## BF-007 — Mobile Sync Integration

Status: PENDING

Description:
Integrate the mobile app with the sync mechanism already implemented and
tested on the backend (`POST /mobile/sync/push`, `GET /mobile/sync/pull`).
`mobile/src` currently has no local queue, outbox, or reference to these
endpoints at all — the "Sincronizar" button on the home screen just reloads
the list and fakes a 2s wait.

Source:
Backend audit — 2026-09-22 (`project-state/backend-audit.md`, 🟣 #1);
`ESTADO-DO-PROJETO.md` §5, §9-10 (mobile team's own account, 2026-08-18).

Important:
**This is a mobile-integration task, not a backend implementation task** —
the backend side (BF category) is already 🟢 done and tested. Do not confuse
this with a backend pendency when planning work.

`ESTADO-DO-PROJETO.md` marks the underlying mobile-side work (local
persistence, outbox, FE-M04 screen) as the release blocker (§10,
"Bloqueante para a entrega") since `criterios-de-aceitacao.md` §17.19
(AC-RELEASE) requires demonstrating offline completion → reconnect → sync
without duplication.

---

## Other divergences worth tracking (not backend-pending, do not treat as BF items)

These came out of the same audit but are **not** "feature not built" — see
`backend-audit.md` "Contract divergences" section for full detail. Listed
here only so they aren't lost:

- ~~`TemplateController` base path is `/templates`~~ — **RESOLVIDA** em BF-005 (`228825c`): `TemplateController` agora responde em ambos `/templates/*` e `/inspection-templates/*` (dual mapping).
- ~~`GET /clients/{clientId}/sites` e `GET /sites/{siteId}/equipment` retornavam 404~~ — **RESOLVIDA** em 2026-09-27: endpoints adicionados a `ClientController` e `SiteController` (ver `progress.md` NESTED-NAV).
- `PUT /inspections/{id}/responses/{snapshotId}` uses the snapshot id, not a device-generated response id as `api-rest.md` §12.11 describes.
- `POST /inspections/{id}/responses:batch` doesn't exist (mitigated by sync).
- QR lookup (`GET /equipment/by-qr/{qrCode}`) doesn't scope results to the technician's assigned inspection (RN-063, PEND-04) — a security-hardening item, tracked here rather than as its own BF because it's a scope/authorization refinement, not a missing feature.
- ~~Evidence deletion has no ownership check~~ — **RESOLVIDA** em PEND-05 (2026-09-28): `EvidenceService.delete()` agora verifica ownership para TECHNICIAN; guard reordenado (ownership 403 antes do APPROVED 409). 12/12 `EvidenceControllerIT` GREEN.
- ~~`InspectionSpecifications` is missing several documented admin filters~~ — **RESOLVIDA** em PEND-15 (2026-09-27): `supervisorId`, `equipmentId`, `scheduledFrom`, `scheduledTo`, `overdue` implementados. Texto livre `q` ainda não implementado (não coberto pelo openapi.yaml, baixa prioridade).
- `InspectionResponseController.upsertResponse()` double-loads the inspection: once in `getInspectionForTechnician()` (controller) and again in `upsertResponse()` (service). Pre-existing; identified during BF-002 review. Low priority — optimization refactor only.

## Pre-existing IT failures — RESOLVIDAS (BF-005, 2026-09-27)

As duas falhas pré-existentes identificadas durante BF-002 foram corrigidas como
pre-requisito do BF-005:

1. **`FlywayMigrationIT`** — asserção `"9"` → `"12"` (schema atual). **RESOLVIDA** em
   `228825c`.

2. **`InspectionTemplateControllerIT`** — `TemplateItemRequest` com campos `boolean`
   primitivos → `Boolean` (boxed), eliminando o erro 500 em `POST .../publish`.
   **RESOLVIDA** em `228825c`. A classe agora tem 17/17 tests GREEN (incluindo 3 novos
   testes de BF-001 adicionados em `7553bc7`).

Além disso, o setUp de `InspectionTemplateControllerIT` foi atualizado (em `7553bc7`)
para usar `TRUNCATE TABLE inspection_template_versions CASCADE` via `JdbcTemplate`,
eliminando o risco de violação de FK quando ITs que criam inspeções executam antes
desta classe em `./mvnw verify`.
