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

Status: DONE (2026-09-29 — builder completed; was PARTIAL since 2026-09-27)

Builder implementation (2026-09-29, product decision: DRAFT TemplateVersion —
see `decisions.md` 2026-09-29 "BF-005: builder over a DRAFT TemplateVersion"):
- V14: `inspection_template_versions.status` (`DRAFT`/`PUBLISHED`), nullable
  `published_by/published_at` for drafts only, one draft per template (partial
  unique index), draft never active (CHECK).
- `GET/POST /inspection-templates/{id}/sections`, `PUT .../sections/{sectionId}`,
  `POST .../sections/{sectionId}/items`, `PUT .../items/{itemId}` (ADMIN/SUPERVISOR).
- `POST .../publish` without body promotes the draft (RN-015/016 → 422 without
  section/item); legacy body publish kept, 409 while a draft is open.
- ACTIVE template: first builder write clones the active structure (RN-020);
  published sections/items → 409 (RN-019); INACTIVE template → 409.
- Drafts hidden from `GET .../versions` and `GET /inspection-template-versions/{id}`;
  `POST /inspections` with a draft version → 422.
- Responses now carry `templateVersionId` (section) and `sectionId` (item), as in openapi.

Validation (2026-09-29):
- RED: 21/21 new tests failing (routes absent) before implementation; +2 RED for review findings H1/H2.
- GREEN: `TemplateBuilderControllerIT` 23/23; `InspectionSchedulingControllerIT` 20/20
  (1 new); `FlywayMigrationIT` 2/2 (version 14); `InspectionTemplateControllerIT` 17/17;
  `TemplateVersionControllerIT` 7/7; unit 50/50.
- Full `./mvnw verify`: 256 ITs, only failures = `MobileInspectionControllerIT` (2,
  identical on untouched `main` 7beb028 — pre-existing) and `SiteControllerIT` (17,
  FK ordering ITORDER-001; 17/17 GREEN in isolation).
- Real HTTP (throwaway Postgres + app on :8099, 16-step flow): all statuses and
  persistence as expected.
- ECC java-reviewer + database-reviewer: H1 (INACTIVE bypass), H2 (stale draft vs
  legacy publish), concurrency 500s and version-number gaps fixed; rest recorded below.

Follow-ups (not implemented — out of BF-005 scope):
- Pessimistic lock on template row for publish/draft creation (races now → 409, not serialized).
- ~~`GlobalExceptionHandler` catch-all returns 500 for unknown routes
  (`NoResourceFoundException`) and malformed JSON (`HttpMessageNotReadableException`) —
  should be 404/400. Pre-existing, codebase-wide.~~ — **RESOLVIDO** em 2026-09-29
  (branch `fix/error-handler-404-400`, ver "ERR-HANDLER" abaixo).
- Delete section/item endpoints are not documented nor implemented.
- `TemplateService.update()` still DRAFT-only (metadata of ACTIVE templates) — see BF-001 note.

Description:
Read endpoints implemented on 2026-09-27 (partial):
- `GET /inspection-templates/{id}/versions` → `PageResponse<TemplateVersionResponse>` — paginated, ordered by version_number DESC
- `GET /inspection-template-versions/{versionId}` → `TemplateVersionResponse` (with sections/items)
- `TemplateController` now responds at BOTH `/templates/*` AND `/inspection-templates/*` (dual mapping) to match the web client's API calls (`resources.ts`)
- Pre-req fixes: `FlywayMigrationIT` version assertion "9" → "12"; `TemplateItemRequest` 3 `boolean` fields → `Boolean` (boxed)

Still pending (SUPERSEDED 2026-09-29 — builder implemented, see top of this BF):
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

## RN-038/039 — Submit Validation: Observation and Evidence on Non-Conforming Answers

Status: DONE

Description:
`InspectionExecutionService.submit()` now enforces RN-038 and RN-039 in addition
to the existing RN-037 (required responses) check:
- **RN-038**: if `ItemSnapshot.observationRequiredOnFailure = true` and the response
  has `conformity = NON_CONFORMING`, the `observation` field must be non-blank → 422
  (`MISSING_OBSERVATION_ON_NON_CONFORMING`).
- **RN-039**: if `ItemSnapshot.evidenceRequiredOnFailure = true` and the response
  has `conformity = NON_CONFORMING`, at least one evidence record linked to that
  response must exist → 422 (`MISSING_EVIDENCE_ON_NON_CONFORMING`).

Prerequisite gap fixed: `createSnapshots()` in `InspectionService` was not copying
`observationRequiredOnFailure`/`evidenceRequiredOnFailure` from `TemplateItem` to
`ItemSnapshot`. Fixed via Path A (Flyway V13 migration + boolean columns on snapshot
table). Path B (populate `rulesJson`) was considered and rejected (see `decisions.md`
2026-09-28).

Source:
Backend audit 2026-09-22 (`project-state/backend-audit.md`, 🟡 #5).
Requirements: RN-038, RN-039; `regras-de-negocio.md` §9.5.

Validation (2026-09-28):
- `submitWithNonConformingAnswerMissingObservationReturns422` — GREEN
- `submitWithNonConformingAnswerWithObservationSucceeds` — GREEN
- `submitWithNonConformingAnswerObservationRuleNotSetSucceeds` — GREEN
- `submitWithCriticalNonConformingAnswerMissingEvidenceReturns422` — GREEN
- `submitWithCriticalNonConformingAnswerWithEvidenceSucceeds` — GREEN
- `submitWithOnlyConformingAnswersWhenObservationRuleSetSucceeds` — GREEN
- InspectionExecutionControllerIT: 18/18 GREEN; regression 115/115 GREEN

ECC java-reviewer: 0 CRITICAL, 3 HIGH (all resolved — N+1 fixed via JOIN FETCH,
`@Transactional(readOnly = true)` added, cross-class FK fixed via `@AfterEach`).

Files modified:
- `V13__add_snapshot_failure_rules.sql` (new migration)
- `ItemSnapshot.java` (2 new boolean fields + `@PrePersist` defaults)
- `InspectionService.createSnapshots()` (copies the 2 fields from `TemplateItem`)
- `InspectionResponseRepository` (new `findByInspectionIdAndConformityFetchSnapshot` with JOIN FETCH)
- `EvidenceRepository` (new `existsByInspectionIdAndResponseId`)
- `InspectionExecutionService` (`EvidenceRepository` injected; RN-038/039 validation block)
- `InspectionExecutionControllerIT` (`@AfterEach` teardown; 6 new tests)

---

## BF-007 — Mobile Sync Integration

Status: DONE

Description:
Offline-first sync integrated into the mobile app (Expo SDK 57 / React Native).

User instruction fulfilled: "toda vez que ocorrer um salvamento, esta mudança
irá para este banco com um UUID próprio e com o status de sync = false para
evitar duplicatas e o expo deve verificar se o dispositivo possui internet.
Caso o dispositivo possua internet, o expo deve sincronizar com o banco
postgres, caso não, deve ficar armazenado localmente no dispositivo até a
internet voltar. Essa sincronização deve ser realizada de forma automática."

New files (2026-09-28):
- `mobile/src/services/local-db.ts` — SQLite outbox with `upsertOutboxEntry`,
  `getPendingEntries`, `countPendingEntries`, `markEntriesSynced`,
  `incrementErrorCount`. Uses `expo-sqlite` v15 (openDatabaseAsync, runAsync,
  getAllAsync, getFirstAsync).
- `mobile/src/services/sync-service.ts` — `isOnline()` (expo-network v7),
  `getOrCreateDeviceId()` (expo-secure-store), `syncPending()`,
  `syncPendingIfOnline()`. Batches outbox entries 50 at a time to
  `POST /mobile/sync/push`. Handles APPLIED, ALREADY_APPLIED (mark synced),
  REJECTED/CONFLICT/DEPENDENCY_FAILED (incrementErrorCount). SINGLE_CHOICE
  responseType mapped to `valueChoice` in sync payload.
- `mobile/src/features/sync/use-sync.ts` — `useSyncOnForeground()` hook;
  fires on mount and every time app comes to foreground via AppState listener.

Modified files (2026-09-28):
- `mobile/src/services/index.ts` — re-exports isOnline, syncPending,
  syncPendingIfOnline, getOrCreateDeviceId, SyncResult from sync-service.
- `mobile/src/features/checklist/use-checklist.ts` — `send()` now writes to
  SQLite outbox (upsertOutboxEntry) then fires syncPendingIfOnline() in the
  background (void). Server API is no longer called directly on save.
- `mobile/app/(protected)/inspections/[inspectionId]/summary.tsx` —
  sync-on-mount useEffect to flush pending before evaluateCompletion sees the
  server state; submit() guards with isOnline() + syncPending() before
  calling POST /inspections/{id}/submit.
- `mobile/app/(protected)/_layout.tsx` — calls useSyncOnForeground()
  unconditionally before early returns (correct per Rules of Hooks).
- `mobile/jest.setup.js` — added expo-network mock (online=true default) and
  expo-sqlite mock (in-memory Map outbox store, full runAsync/getAllAsync/
  getFirstAsync implementation, reset via beforeEach mockReset + mockImpl).
- `mobile/__tests__/checklist-screen.test.tsx` — removed getMockDatabase()
  .responses assertion from "grava a resposta" (responses go to SQLite now);
  rewrote "mostra erro do servidor" → "mostra erro local" (simulates
  SQLite disk full via mockRejectedValueOnce, checks value preserved and
  "gravar localmente" error label).

Source:
Backend audit — 2026-09-22 (`project-state/backend-audit.md`, 🟣 #1);
`ESTADO-DO-PROJETO.md` §5, §9-10.

Validation (2026-09-28) — SUPERSEDED by the 2026-09-29 validation below:
- Cannot run `npm test` — `node_modules` absent, no `npm install` run.
  Environment limitation recorded. All logic changes are manually reviewed.
  Jest mock design verified against local-db.ts SQL strings and sync-service.ts
  outbox behavior.
- TypeScript check not run — same environment limitation (no node_modules).

Validation (2026-09-29) — reopened and fixed, now actually validated:
- Finding: BF-007 declared `expo-sqlite ~15.0.0` / `expo-network ~7.0.0` (old-SDK
  versions) and never updated `package-lock.json` → `npm ci` failed on a clean
  machine (`EUSAGE — Missing: expo-network@7.0.5, expo-sqlite@15.0.6 from lock file`).
  Expo SDK 57 (`expo@57.0.13` `bundledNativeModules.json`) expects `~57.0.1` for both.
- Fix: `mobile/package.json` → `expo-sqlite ~57.0.1`, `expo-network ~57.0.1`;
  `npm install` regenerated the lock (diff limited to expo-sqlite 57.0.3,
  expo-network 57.0.2 and its dep await-lock). No source change needed (same API).
- `npm ci --dry-run` → OK; `npx expo install --check` → both no longer flagged;
  `npm run typecheck` → OK; `npm run lint` → OK.
- `npm test`: 291/291 tests pass; BF-007 suites (`checklist-screen`,
  `summary-nc-screens`) 26/26. 1 suite fails to load (`inspections-screen.test.tsx`,
  lucide ESM) — pre-existing since `cdb7c5b` (2026-09-15), unrelated to BF-007.

Follow-ups (not implemented — outside BF-007 validation scope):
- `inspections-screen.test.tsx` cannot load: Jest does not transform
  `lucide-react-native` ESM (needs `transformIgnorePatterns` or a mock). Broken since `cdb7c5b`.
- `local-db.ts`, `sync-service.ts`, `use-sync.ts` have no direct unit tests — only
  exercised through screen tests with mocks (batching, REJECTED/CONFLICT handling untested).
- `npx expo install --check` still flags patch updates unrelated to BF-007:
  `expo-splash-screen ~57.0.9`, `react-native 0.86.3`, `eslint-config-expo ~57.0.2`, `jest-expo ~57.0.5`.

---

## ERR-HANDLER — 400/404 instead of 500 for malformed requests and unknown routes

Status: DONE (2026-09-29, branch `fix/error-handler-404-400`)

Origin: follow-up found during BF-005 (catch-all `Exception` → 500).
Requirement: `api-rest.md` §12.2 (error body) and §12.3 (400 = requisição malformada,
404 = recurso não encontrado, 500 only for unforeseen failures); RN-090.

Implementation — `GlobalExceptionHandler` gains three handlers (DEBUG log, no stack trace/body):
- `HttpMessageNotReadableException` (malformed JSON / missing body) → 400 `MALFORMED_REQUEST`
  (generic message; parser details not exposed).
- `MethodArgumentTypeMismatchException` (e.g. non-UUID path variable) → 400
  `INVALID_PARAMETER`, `fieldErrors[{field: <param>, message: "Invalid value"}]`.
- `NoResourceFoundException` (no route) → 404 `ROUTE_NOT_FOUND`. Anonymous callers still
  get 401 first (security filter chain) — no route enumeration.

Validation:
- RED: `GlobalExceptionHandlerIT` 4/5 failing with 500 (first attempt failed for the wrong
  reason — 401, token subject must be a real user — test fixed before implementing).
- GREEN: 5/5. Full `./mvnw verify`: unit 50/50; 261 ITs with only the known
  pre-existing failures (`MobileInspectionControllerIT` 2, `SiteControllerIT` 17 / ITORDER-001).
- Real HTTP (throwaway Postgres + app :8099): 404/401/400/400/400 with §12.2 body; valid
  controls 200/201; no ERROR log lines; `X-Content-Type-Options: nosniff` present.
- ECC security-reviewer: 0 CRITICAL/HIGH; MEDIUM (no logging after leaving catch-all) fixed.

Follow-ups (not implemented — out of scope):
- `HttpRequestMethodNotSupportedException` (405), `HttpMediaTypeNotSupportedException` (415)
  and `MissingServletRequestParameterException` still fall into the catch-all 500.
  405 is not in the `api-rest.md` §12.3 table — needs doc decision first.
- `AuthenticationException` handler echoes `ex.getMessage()` (pre-existing).
- Swagger/api-docs are `permitAll` — confirm they are disabled in a production profile.
- Type-mismatch 400 is raised before method security, so an authenticated non-admin gets
  400 (not 403) on admin routes with a bad UUID — LOW, accepted.

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
- ~~`QR lookup não restringe ao escopo do técnico`~~ — **RESOLVIDA** em PEND-04 (2026-09-28): `GET /equipment/by-qr/{qrCode}` agora bloqueia TECHNICIAN sem inspeção não-terminal no mesmo site (RN-063). Scope boundary SUBMITTED/UNDER_REVIEW documentado em `decisions.md`.
- `Missing @Size validation on @PathVariable String` — todas as rotas com `@PathVariable String` carecem de constraint de tamanho. Requer `ConstraintViolationException` handler no `GlobalExceptionHandler`. Deferred — ver `decisions.md` 2026-09-28 (PEND-04 H-03).

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
