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
- ~~`inspections-screen.test.tsx` cannot load: Jest does not transform
  `lucide-react-native` ESM (needs `transformIgnorePatterns` or a mock). Broken since `cdb7c5b`.~~ —
  **RESOLVIDO** 2026-09-30 (MOBILE-TEST-1, commitado em `2805ca7`):
  jest-only `moduleNameMapper` `^lucide-react-native$` → build CJS do próprio pacote
  (`dist/cjs/lucide-react-native.js`; o `jest-expo` resolvia pela condição `react-native` para o
  `.mjs` ESM). Ao voltar a carregar, 6 testes de filtro falharam: `cdb7c5b` moveu os chips para um
  painel lateral (`Modal`) aberto por `inspections-filter-button` — mudança intencional de UI, não
  bug (`telas-frontend.md` §10.8 não fixa o posicionamento). Testes passam a abrir o painel
  (`openFilters()`), asserções de comportamento inalteradas. Suíte 11/11; mobile completo
  24/24 suítes, 302/302 testes; typecheck OK; lint OK. Metro/app não afetados.
- ~~`local-db.ts`, `sync-service.ts`, `use-sync.ts` have no direct unit tests — only
  exercised through screen tests with mocks (batching, REJECTED/CONFLICT handling untested).~~ —
  `local-db.ts` + `sync-service.ts` **RESOLVIDO** 2026-09-30 (MOBILE-TEST-2, não commitado):
  `mobile/__tests__/sync-service.test.ts` (14 testes: offline, APPLIED/ALREADY_APPLIED, lote misto,
  REJECTED/CONFLICT/DEPENDENCY_FAILED, falha de rede, lotes 50/50/20, lote falho não bloqueia os
  seguintes, deviceId estável, filtro por inspeção, isOnline). Testes de caracterização (passaram de
  primeira — sem mudança de comportamento); sensibilidade comprovada por mutação (4/4 mutantes
  detectados). Mobile 25/25 suítes, 316/316; typecheck/lint OK. Limite: o mock SQLite reproduz o SQL por regex, então a SQL real de `local-db.ts` (WHERE/ORDER BY) não é verificada. `use-sync.ts` (hook AppState) segue
  sem teste direto.
- ~~`sync-service.ts` (achados do ECC typescript-reviewer, MOBILE-TEST-2 — não implementados):
  (a) operação omitida pelo servidor em `results` fica pendente sem `error_count` nem contagem em
  `failed`; resultado com `operationId` desconhecido é aplicado mesmo assim; (b) `JSON.parse` de um
  payload corrompido ou `results` ausente rejeitam `syncPending` inteiro fora do `try` — uma entrada
  "envenenada" bloqueia todas as sincronizações seguintes.~~ **RESOLVIDO 2026-10-01 (SYNC-RESILIENCE,
  ver abaixo).**
- `incrementErrorCount` chamado individualmente por entrada (await sequencial) em vez de batch
  atômico — pré-existente, identificado pelo ECC typescript-reviewer durante SYNC-RESILIENCE.
  Requer `bulkIncrementErrorCount(ids: string[])` em `local-db.ts`. Gap de observabilidade (não
  de dados): entradas ficam `synced = 0` independentemente do partial-increment. Deferred.
- ~~**SUSPEITA — `use-checklist.ts` enviava `baseVersion` obsoleto na 2ª edição do mesmo item.**~~
  **RESOLVIDO** 2026-10-01 (BASEVERSION-STALENESS, não commitado): `versionsRef` agora armazena
  apenas `Map<Uuid, number>` (versões) e é incrementado via re-leitura atômica após cada
  `upsertOutboxEntry` bem-sucedido; corrida de escritas concorrentes também corrigida.
  4 novos testes em `mobile/__tests__/use-checklist.test.ts`; 323/323 GREEN.
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
- ~~`HttpRequestMethodNotSupportedException` (405), `HttpMediaTypeNotSupportedException` (415)
  and `MissingServletRequestParameterException` still fall into the catch-all 500.~~ —
  415 and missing parameter **RESOLVIDOS** em 2026-09-30 (ver "ERR-HANDLER-2" abaixo).
  405 **RESOLVIDO** em 2026-09-30 após decisão de documentação do usuário (ver "ERR-HANDLER-2").
- `AuthenticationException` handler echoes `ex.getMessage()` (pre-existing).
- Swagger/api-docs are `permitAll` — confirm they are disabled in a production profile.
- Type-mismatch 400 is raised before method security, so an authenticated non-admin gets
  400 (not 403) on admin routes with a bad UUID — LOW, accepted.

---

## ERR-HANDLER-2 — 400/415 for missing parameters and unsupported Content-Type

Status: DONE (2026-09-30, commitado em `2805ca7`)

Origin: ERR-HANDLER follow-up. Requirement: `api-rest.md` §12.3 (400 = requisição malformada,
415 = formato não suportado, 500 only for unforeseen failures), §12.2 body; RN-090.

Implementation — `GlobalExceptionHandler` (DEBUG log, generic messages, no media-type list):
- `MissingServletRequestParameterException` / `MissingServletRequestPartException` → 400
  `MISSING_PARAMETER`, `fieldErrors[{field: <param|part>, message: "Required"}]`. Today only
  `POST /inspections/{id}/evidence` has required `@RequestParam`/`@RequestPart`.
- `HttpMediaTypeNotSupportedException` → 415 `UNSUPPORTED_CONTENT_TYPE` (distinct from the
  evidence file-format code raised by `UnsupportedMediaTypeException`).

Validation:
- RED: `GlobalExceptionHandlerIT` 4 new tests failing with 500 (5 existing GREEN).
- GREEN: 10/10 (+1 test after review: no token + missing param → still 401).
- Full `./mvnw verify`: unit 50/50, IT 268/268, BUILD SUCCESS.
- Real HTTP (throwaway Postgres :5499 + app :8099, real `/auth/login`): 400/400/415/415 with
  §12.2 body; no token → 401; controls 404 (`INSPECTION_NOT_FOUND`) and 201; 0 ERROR log lines.
- ECC java-reviewer: 0 CRITICAL/HIGH. MEDIUMs fixed (split dual-exception handler with cast;
  stronger test assertions). OpenAPI already documents 400/415 on evidence upload — no doc change.

405 extension (2026-09-30, user decision: "implementar erro 405 para todas as ações que
deveriam resultar em not allowed invés de retornar 500"):
- Docs: `api-rest.md` §12.3 and `contrato-backend-frontend.md` §5.2 gained a 405 row
  ("Método HTTP não permitido na rota", response carries `Allow`).
- `HttpRequestMethodNotSupportedException` → 405 `METHOD_NOT_ALLOWED` + `Allow` header
  (RFC 9110 §15.5.6), global — applies to every mapped route. Anonymous callers still get 401
  first, except on `permitAll` routes (`/auth/login|refresh`, swagger), whose methods are public anyway.
- RED: 2 new tests failing with 500 (anonymous 401 test already GREEN); GREEN
  `GlobalExceptionHandlerIT` 13/13; full `./mvnw verify` 50/50 + 271/271.
- Real HTTP: PATCH collection → 405 `Allow: GET, POST`; DELETE item → 405 `Allow: GET, PUT`;
  anonymous GET `/auth/login` → 405 `Allow: POST`; PATCH without token → 401; control GET → 200;
  0 ERROR log lines (the catch-all used to log these at ERROR).
- ECC security-reviewer: 0 CRITICAL/HIGH/MEDIUM; 2 LOW accepted (Allow on public routes only
  reveals what swagger shows; DEBUG URI logging follows the existing pattern). OPTIONS/HEAD unchanged.
- OpenAPI unchanged: 405 applies to undeclared methods, which OpenAPI cannot list per path.

Follow-ups (not implemented — out of scope):
- `MissingRequestHeaderException`, `MissingRequestCookieException`, `HttpMediaTypeNotAcceptableException`
  (406) and other `ServletRequestBindingException` subclasses still fall into the catch-all 500
  (no endpoint currently requires a header/cookie param).
- If CORS is ever configured for the web app, preflight must be allowed in the security chain
  (anonymous OPTIONS is 401 today — pre-existing).
- Authenticated users without the role get 400/415 (argument resolution / `consumes` matching)
  before `@PreAuthorize` returns 403 — same pre-existing ordering as the other 400 handlers
  (accepted LOW in ERR-HANDLER); parameter names are already public in `openapi.yaml`.
- 415 response omits the `Accept` header Spring would normally add (deliberate — no hint of
  supported types); revisit if clients need it.

---

## AUTHZ-BOUNDARY — Technician ownership on evidence and non-conformities (RN-004, AC-SECURITY)

Status: DONE (2026-09-30, commitado em `2805ca7`)

Origin: candidate D ("⚪ cross-cutting ownership authorization not confirmed for
`NonConformityController`/`EvidenceController`", backend audit 2026-09-22) + `test-plan.md` §5.8
`security/AuthorizationBoundaryIT.java`. Writing the test revealed a **real vulnerability**, not
just missing coverage: a technician could read/modify another technician's data by URL.

RED (confirmed live, 200/201 instead of 403) on 8 HTTP endpoints + 2 sync paths:
- `POST/GET /inspections/{id}/evidence`, `GET /evidence/{id}`
- `POST/GET /inspections/{id}/non-conformities`, `GET /non-conformities/{id}`,
  `PATCH /non-conformities/{id}/status`, `PUT /non-conformities/{id}`
- `POST /mobile/sync/push` `NON_CONFORMITY` create/update on another technician's inspection
  → `APPLIED` (found by ECC security-reviewer; the other sync entity types already checked).

Fix (mirrors existing `EvidenceService.delete` / `getInspectionForTechnician`):
- `EvidenceService` (upload/list/getById; delete reuses the helper) and `NonConformityService`
  (create/listByInspection/getById/updateStatus/update overloads) take `(userId, isTechnician)` and
  throw `AccessDeniedException` → 403 `FORBIDDEN` when the technician is not the assignee.
  ADMIN/SUPERVISOR unrestricted. Ownership 403 before APPROVED 409 on upload (PEND-05 ordering).
- Controllers pass `isTechnician` from the JWT role claim.
- `SynchronizationService.applyNonConformity` rejects with `SYNC_INSPECTION_NOT_OWNED` (same as
  `applyInspectionResponse`). Sync keeps calling the unguarded `create(id, …)`/`update(id, req)`
  overloads (public because sync is another package), now behind its own check.

Validation:
- `AuthorizationBoundaryIT` (new, 11): 8 RED → GREEN; owner/admin controls GREEN; 403 body checked
  for code `FORBIDDEN` and no NC title / file name / storage URL.
- `SyncPushControllerIT` +2 (RED `APPLIED` → GREEN `REJECTED`, NC unchanged/not created).
- `ConflictDetectionTest` fixture aligned (inspection owner stubbed, like the sibling tests).
- Full `./mvnw verify` — see progress.md for the final numbers.
- ECC security-reviewer + java-reviewer: HIGH (sync bypass) fixed; MEDIUMs on tests fixed.

Follow-ups (not implemented — out of scope):
- `NonConformityService.create` accepts a `responseId` from another inspection (snapshotId is
  validated, responseId is not; evidence upload validates both). Pre-existing integrity gap.
- ~~NC create/update/status have no read-only guard for APPROVED/CANCELED inspections (evidence has
  RN-049); `updateStatus` has no transition rules (single `OPEN` value today, RN-057).~~ — APPROVED
  **RESOLVIDO** 2026-09-30 (NC-APPROVED-LOCK). Correção: o status de NC aceita mais valores que `OPEN`
  (os testes usam `IN_PROGRESS`); `updateStatus` segue sem regras de transição.
- Supervisor scope (RN-005) not implemented — supervisors see everything.
- `isTechnician` is a deny-list (fails open for a future 4th role); consider a positive
  ADMIN/SUPERVISOR check or a shared helper (duplicated in 2 services + several controllers).
- 403 (other technician's id) vs 404 (non-existent id) is an existence oracle for UUIDs —
  consistent with the existing pattern; recorded in `decisions.md`.
- `SynchronizationService.pull` does a full scan + in-memory filter (performance).

---

## SYNC-ROBUST — one failing sync operation no longer fails the whole push (RN-070)

Status: DONE (2026-09-30, branch `fix/mobile-inspection-it`, não commitado). Item escolhido pelo
usuário (follow-up pré-existente do NC-APPROVED-LOCK).

Requirement: RN-070 ("falha em uma operação não deverá apagar outras operações pendentes"),
RN-067/068 (idempotência por operação).

Root cause: `processOne` (REQUIRES_NEW) called domain services that join its transaction; any domain
exception crossing their `@Transactional` proxy marked it rollback-only, so after `apply()` mapped the
exception to REJECTED the commit threw `UnexpectedRollbackException` → HTTP 500 for the whole push and
the rejection was never recorded (client retried forever).

Fix (`SynchronizationService`):
- `processOne` is no longer transactional: idempotency lookup, then `self.applyAndRecord(...)`
  (REQUIRES_NEW — domain change **and** `sync_operations` record commit atomically).
- Domain exception → that transaction rolls back entirely (no partial writes) and
  `self.recordOutcome(...)` (REQUIRES_NEW) persists REJECTED/CONFLICT.
- `DataIntegrityViolationException` (e.g. same operation pushed concurrently) → returns the existing
  record when present, otherwise REJECTED `SYNC_DATA_INTEGRITY_VIOLATION`.
- `push()` no longer opens a read-only transaction → at most one pooled connection per push at a time
  (before: 2, and 3 with the first draft of this fix — pool-exhaustion risk flagged by review).
- `Outcome` record made public (it is in the public, proxied method signatures).
- Removed the now-redundant `noRollbackFor` added to `NonConformityService` in NC-APPROVED-LOCK.
- Unit tests `ConflictDetectionTest`/`IdempotencyTest`: `self` was `null`; now a mock delegating the
  per-operation methods to the real instance (stand-in for the Spring proxy).

Validation:
- RED: 2 new `SyncPushControllerIT` tests → 500 `UnexpectedRollbackException` (batch [valid start +
  NC with unknown snapshot]; NC update to CRITICAL without evidence (RN-055) + idempotent replay).
- GREEN: `SyncPushControllerIT` 16/16 (both REJECTED with code, valid op APPLIED, rejection recorded,
  replay returns the same REJECTED), `SyncPullControllerIT` 7/7, unit 50/50.
- ECC java-reviewer: first draft had a HIGH (apply and record no longer atomic) + MEDIUM (3 connections
  per push) — both fixed by the restructure above.

Follow-ups (not implemented):
- `InspectionExecutionService.upsertResponse` keeps `noRollbackFor = ResourceConflictException`
  (BF-002) and a comment saying sync joins its transaction — now redundant/misleading; harmless.
- No IT for concurrent pushes of the same operationId, nor for OptimisticLock → CONFLICT at commit.

---

## NC-APPROVED-LOCK — Non-conformities read-only on approved inspections (RN-082)

Status: DONE (2026-09-30, branch `fix/mobile-inspection-it`, não commitado). Item escolhido pelo
usuário entre os follow-ups do AUTHZ-BOUNDARY.

Requirement: RN-082 ("inspeção aprovada ficará bloqueada para edição comum"), RN-076. Scope mirrors
evidence (RN-049 / BF-006): only APPROVED, all roles, 409.

Implementation — `NonConformityService.checkWritable()` → 409
`NON_CONFORMITY_READ_ONLY_APPROVED_INSPECTION` in `create(id, …)`, `update(id, req)` and
`updateStatus` (HTTP + sync paths); reads unchanged; ownership 403 still first. ~~The two sync-called
methods use `@Transactional(noRollbackFor = ResourceConflictException.class)` (same as BF-002): the
first GREEN attempt without it made sync push return 500 (rollback-only on `processOne`).~~ SUPERSEDED by SYNC-ROBUST (noRollbackFor removed; sync owns its transactions).

Validation:
- RED: 3 HTTP writes + 1 sync create accepted on APPROVED (201/200/APPLIED).
- GREEN: `NonConformityControllerIT` 18/18 (+4), `SyncPushControllerIT` 14/14 (+2 incl. update path,
  REJECTED recorded in `sync_operations`), `AuthorizationBoundaryIT` 11/11.
- Full-suite side effect fixed: the new sync tests changed JUnit method order and the last
  `SyncPushControllerIT` test left `sync_operations` rows → 62 errors in template/user ITs
  (FK `sync_operations_user_id_fkey`). `SyncPushControllerIT` now cleans in `@AfterEach` too (ITORDER-001).
- ECC java-reviewer: approve, 0 CRITICAL/HIGH; comment guarding `checkWritable` order + sync update
  test added.

Follow-ups (not implemented):
- **RESOLVIDO 2026-09-30 (SYNC-ROBUST, ver acima)** — ~~Pre-existing (MEDIUM/HIGH, java-reviewer):~~ other exceptions inside the sync-called NC methods
  (`ResourceNotFoundException` for snapshot/response/user, `BusinessRuleViolationException` from
  RN-055 validator, possibly `OptimisticLockingFailureException`) still mark `processOne`
  rollback-only → one bad NC operation turns the whole `/mobile/sync/push` into 500. Needs RED tests
  (CRITICAL NC without evidence; unknown snapshotId) and a robust fix (`noRollbackFor` for all
  domain exceptions or programmatic transaction in `processOne`).
- SUBMITTED/UNDER_REVIEW/CANCELED keep NCs editable (consistent with evidence) — product decision
  if they should lock too (BF-002 locked responses in SUBMITTED/UNDER_REVIEW per RN-043).
- 403-before-409 ordering for a non-owner technician on an approved inspection is not asserted.

---

## SYNC-RESILIENCE — Mobile sync resilience (RN-070)

Status: DONE (2026-10-01, não commitado)

Requirement: RN-070 (failure isolation — one bad operation must not fail the whole push).
Source: BF-007 follow-up items (a) and (b) recorded in MOBILE-TEST-2 section above.

Implementation (`mobile/src/services/sync-service.ts`):
- **Bug (b) — poisoned entry:** `JSON.parse(row.payload)` was outside the `try` block
  (line 70 vs try at line 74). Replaced `batch.map()` with a `for` loop; each entry's
  parse is individually wrapped in try-catch. On SyntaxError: `incrementErrorCount`,
  `failed += 1`, `continue`. The entry is isolated; valid entries in the same batch proceed.
- **Guard — `response.results` shape:** Added `if (!Array.isArray(response.results))` guard
  before iterating the response. If the server returns 200 with a malformed body (no `results`),
  the whole batch is treated as a network failure (all ops get `error_count + 1`).
- **Bug (a) — missing operation in results:** After iterating `response.results`, build
  `respondedIds = new Set(results.map(r => r.operationId))`. For each sent `op` not in
  `respondedIds`: `incrementErrorCount`, `failed += 1`.
- Network failure handler: previously iterated `batch` (raw SQLite rows), now iterates
  `operations` (entries that passed parse). Entries with corrupted payload are already
  counted before reaching this path.

Tests (`mobile/__tests__/sync-service.test.ts`):
- 3 new tests in `describe('SYNC-RESILIENCE — RN-070: isolamento de falhas por entrada')`:
  1. `entrada com payload corrompido incrementa error_count e não bloqueia entradas válidas`
  2. `resposta do servidor sem campo results trata o lote todo como falha`
  3. `operação omitida pelo servidor incrementa error_count e conta como falha`
- All 3: RED confirmed before implementation, GREEN after.

Validation (2026-10-01):
- `npm test` (sync-service): 17/17 GREEN (14 pre-existing + 3 new)
- Full mobile suite: 319/319 GREEN, 25 suites (was 318; +1 new test)
- `tsc --noEmit`: clean
- ECC typescript-reviewer: no CRITICAL; 2 HIGH surfaced:
  (1) unsafe `as` cast → resolved inline (the `results` guard above);
  (2) sequential `incrementErrorCount` → tracked as follow-up (deferred, `local-db.ts` scope).

Follow-ups (not implemented):
- `bulkIncrementErrorCount(ids: string[])` in `local-db.ts`: atomicity + perf for
  multi-failure batches. Currently N sequential SQLite UPDATEs; partial-increment possible
  if process killed mid-loop (gap in `error_count` observability, not in `synced` correctness).
- ~~`use-checklist.ts` `baseVersion` staleness.~~ **RESOLVIDO** 2026-10-01 (BASEVERSION-STALENESS).
  `versionsRef` agora incrementa com re-leitura atômica após cada escrita bem-sucedida.

---

## INT-011 — Login web contra a API real (Etapa 1 da integração incremental)

Status: DONE (2026-10-05, branch `task/int-011-web-login-real-backend`)

Detalhes, testes e HTTP real em `progress.md` e em `docs/auditoria-frontend-backend.md` §27. Resolve a F16 (proxy dev) e a F17 (F5 deslogava, porque o refresh não traz `user`).

Follow-ups abertos por esta etapa (não implementados):
- ~~**SEED-STALE (PENDING):**~~ **RESOLVIDO 2026-10-20** (SEED-STALE-FIX): `db/seed.sql` alinhado ao schema V14 — eram cinco descompassos, não um (`snapshot_id`, `responded_by`, `value_choice`, `reported_by`, `idempotency_key`). Seed roda completo (COMMIT, 15 tabelas) e a integração foi validada ponta a ponta contra Postgres real. Ver `progress.md`.
- **WEB-MOCK-AUTH (PENDING):** com `npm start` (mock), o login web não funciona. Não há mock de `/auth`, e o `provideMockSession()` existe, mas não é registrado.
- **D22 (REQUER DECISÃO):** orientação específica para conta inativa no login (AC-AUTH, cenário "usuário inativo") × não revelar a existência do e-mail.

---

## SEED-STALE — db/seed.sql incompatível com o schema atual

Status: RESOLVIDO 2026-10-20 (ver progress.md, SEED-STALE-FIX)

Description:
`db/seed.sql` usa `inspection_responses.inspection_item_id` (coluna removida na migração V9).
Como o seed roda em transação única, qualquer falha causa rollback total — nenhum usuário é
criado. Impede o teste manual "do zero" com o seed completo.

Contorno documentado (INT-011): aplicar só o bloco de usuários (linhas 44–48 e 81–86 do seed).

Source:
Detectado durante INT-011 (2026-10-05). Registrado como follow-up.
Requirements: nenhum RN formal — consistência de dados de desenvolvimento.

Scope: corrigir `db/seed.sql` substituindo as 8 referências a `inspection_item_id`
pelo campo correto conforme schema V14 (`inspection_item_snapshot_id` ou equivalente).

---

## CORS-CONFIG — Backend não tem configuração CORS

Status: DONE (2026-10-20, branch `task/cors-config`)

Implementation (2026-10-20):
- `shared/security/CorsProperties.java` (novo) + `.cors()` e bean `corsConfigurationSource` em `SecurityConfig.java`.
- `application.yml`: `fieldops.security.cors.allowed-origins: ${CORS_ALLOWED_ORIGINS:http://localhost:4200,http://localhost:8081}`.
- `.env.example`: `CORS_ALLOWED_ORIGINS` passa a incluir `http://localhost:8081` (preview web do mobile).
- Teste: `security/CorsConfigurationIT.java` (4 testes, RED → GREEN): preflight aceito para 8081 e 4200,
  401 carregando `Access-Control-Allow-Origin`, preflight de origem desconhecida → 403 sem o cabeçalho.
- Decisão em `decisions.md` [2026-10-20] — CORS-CONFIG. Não implementado: valor de produção (depende do deploy).

Histórico (descrição original, mantida):

Description:
Nenhuma configuração CORS existe em `SecurityConfig.java`. Em produção ou em qualquer ambiente onde
web e backend estão em origens diferentes, todas as requisições cross-origin serão bloqueadas pelo
browser antes de chegarem ao backend.

Para desenvolvimento, o problema foi mitigado via proxy do `ng serve` (INT-011 — `npm run start:api`),
mas esse workaround não serve para produção.

Source:
`docs/auditoria-frontend-backend.md` §2 (2026-10-02). Confirmado na re-auditoria 2026-10-13.
Requirements: `arquitetura.md` descreve web e backend como serviços separados.

Note: se a solução de produção for proxy reverso (nginx/API gateway), CORS pode não ser necessário
no backend. Registrado aqui para que a decisão seja explícita antes do deploy.

---

## WEB-MOCK-AUTH — Login web não funciona em modo mock

Status: DONE (2026-10-14)

Description:
Com `npm start` (`mockApi: true`), `AuthService.login()` fazia HTTP para `/auth/login` mas não há
servidor mock de auth — o mock é DI Angular, não interceção HTTP. `provideMockSession()` existia
como andaime mas não estava registrado.

Source:
Detectado durante INT-011 (2026-10-05). Registrado como follow-up.

Implementation (2026-10-14):
- `core.providers.ts` `provideCore()`: adicionado parâmetro `useMock: boolean = environment.mockApi`;
  passa `useMock` para `provideResources(useMock)`; inclui `provideMockSession()` quando `useMock = true`.
- `mock-session.ts`: removida guarda `if (!environment.mockApi) return` — controle delegado a `provideCore()`.
  Atualizado comentário JSDoc. Removido import de `environment` (não mais necessário).
- `mock-session.spec.ts`: novo arquivo com 2 testes RED→GREEN:
  - `injeta sessão de SUPERVISOR automaticamente quando modo fictício está ativo`
  - `não injeta sessão automática quando modo fictício está desativado`

Validation (2026-10-14):
- Ambos os testes novos — GREEN
- Regressão: 205/205 GREEN (0 regressões)

---

## D22 — Orientação para conta inativa no login

Status: PENDING (requer decisão de produto)

Description:
O backend responde 401 com mensagens distintas para "conta inativa" vs. "credenciais inválidas".
A prática atual (web INT-011 e mobile) é mostrar mensagem única para não revelar se o e-mail existe.
Decisão de produto pendente: melhor UX (revelar estado) × melhor segurança (não revelar).
`criterios-de-aceitacao.md` (AC-AUTH, cenário "usuário inativo") não é conclusivo.

Source:
`docs/auditoria-frontend-backend.md` §19 (D22). Follow-up de INT-011.

---

## D7 — `PUT /inspections/{id}` sem trava de estado

Status: PENDING

Description:
`InspectionService.update()` não verifica o status atual da inspeção antes de aplicar alterações.
Uma inspeção em `IN_PROGRESS`, `SUBMITTED` ou `APPROVED` pode ter metadados (`title`, `instructions`,
`priority`, `scheduledFor`) alterados por ADMIN/SUPERVISOR.

Source:
`docs/auditoria-frontend-backend.md` §20 (D7). Confirmado na re-auditoria 2026-10-13.

Scope: decidir quais estados bloqueiam edição de metadados; adicionar guard clause em `InspectionService.update()`.

---

## D9 — `POST /inspections` não valida coerência local/cliente/equipamento

Status: PENDING

Description:
`InspectionService.create()` não verifica se `siteId` pertence ao `clientId` informado, nem se
`equipmentId` pertence ao `siteId`. Uma inspeção pode ser criada com combinações incoerentes.

Source:
`docs/auditoria-frontend-backend.md` §20 (D9). Confirmado na re-auditoria 2026-10-13.
Requirements: RN-014; `regras-de-negocio.md` §9.2.

---

## SUPERVISOR-SCOPE — Escopo de supervisor (RN-005) não implementado

Status: PENDING

Description:
RN-005 define que SUPERVISOR só enxerga recursos vinculados a si como supervisor. Atualmente,
SUPERVISOR tem acesso irrestrito (mesma visibilidade de ADMIN) em todos os endpoints de listagem.

Source:
Backend audit 2026-09-22. Confirmado na re-auditoria 2026-10-13.
Requirements: `perfis-de-usuario.md` §5.3, RN-005.

Note: impacta queries e caching em praticamente todos os endpoints de listagem. Requer decisão
de produto antes de implementar.

---

## WEB-SHELL — Shell web ausente (menu, logout, toasts)

Status: PENDING

Description:
O app web não tem layout compartilhado entre telas autenticadas: sem menu lateral, sem botão de
logout, sem sistema de toasts/notificações. Sem shell, o usuário não navega entre telas, erros
ficam invisíveis, e logout é impossível.

Source:
`docs/auditoria-frontend-backend.md` (observação transversal). Confirmado na re-auditoria 2026-10-13.

Scope: `ShellComponent` com `<mat-sidenav-container>`, `<mat-toolbar>` (logout + nome do usuário),
`<mat-sidenav>` (menu), toast service.

---

## WEB-DISPLAYORDER — `displayOrder` ausente nos payloads do construtor de modelos

Status: DONE (2026-10-14)

Description:
`TemplateBuilderComponent.addSection()` e `addItem()` não incluíam `displayOrder` nos payloads
enviados ao `TemplatesService`. `TemplateSectionCreateRequest` e `TemplateItemRequest` têm
`displayOrder*` obrigatório no backend → adição de seções/itens retornava 400 contra a API real.
O mock escondia o bug com fallback `displayOrder: input.displayOrder ?? list.length + 1`.

Source:
`docs/auditoria-frontend-backend.md` §19 (F1/F2). Confirmado na re-auditoria 2026-10-13.

Implementation (2026-10-14):
- `template-builder.component.ts` `addSection()`: payload alterado para
  `{ ...result, displayOrder: this.sections().length + 1 }`.
- `template-builder.component.ts` `addItem()`: payload alterado para
  `{ ...result, displayOrder: (section.items ?? []).length + 1 }`.
- `template-builder.component.spec.ts`: 2 novos testes RED→GREEN verificando
  que `displayOrder` está presente em ambas as chamadas de serviço.

Validation (2026-10-14):
- `TemplateBuilderComponent > criar seção inclui displayOrder no payload` — GREEN
- `TemplateBuilderComponent > criar item inclui displayOrder no payload` — GREEN
- Regressão: 203/203 GREEN (0 regressões)

---

## MOBILE-AUTH-CODE — `UNAUTHORIZED` não mapeado em `toAuthFailureCode()`

Status: DONE (2026-10-13)

Description:
`toAuthFailureCode()` em `mobile/src/features/auth/session-context.tsx` não mapeava o código
`UNAUTHORIZED` → caía no `default: return 'UNEXPECTED'` → UI exibia "Não foi possível entrar agora."

Fix:
Adicionado `case 'UNAUTHORIZED': return 'INVALID_CREDENTIALS'` em `session-context.tsx:89-90`.
Teste adicionado em `session-context.test.tsx` (describe `toAuthFailureCode`).
324/324 testes passando após a correção.

Source:
Re-auditoria 2026-10-13. Divergência F6 em `docs/auditoria-frontend-backend.md`.

---

## MOBILE-MOCK-SYNC — `POST /mobile/sync/push` ausente do mock mobile

Status: DONE (2026-10-13)

Description:
`mobile/src/services/mock/mock-server.ts` não cobria `POST /mobile/sync/push`. Em modo mock
(padrão), o outbox SQLite nunca drenava: entradas ficavam `synced=0` permanentemente.

Source:
Re-auditoria 2026-10-13 (leitura de `mock-server.ts`). Divergência F11.

Implementation (2026-10-13):
- `mobile/src/services/mock/mock-server.ts`: nova rota `POST /mobile/sync/push` adicionada ao array `routes`; lê `body.operations`, devolve `{ results: [{ operationId, status: 'APPLIED' }] }` para cada entrada.
- `mobile/src/services/mock/mock-server.test.ts` criado: 3 testes — aplica operações e devolve APPLIED, lista vazia, exige autenticação. 327/327 testes passando.

---

## MOBILE-TYPECHECK — 3 erros de TypeScript no mobile (pré-existentes)

Status: PENDING

Description:
`npx tsc --noEmit` no mobile reporta 3 erros pré-existentes que não bloqueiam os testes mas
impedem o typecheck limpo. Identificados na auditoria 2026-10-14.

Erros:
1. `src/features/sync/use-sync.ts:12` — `NetworkState.isInternetReachable` é `boolean | undefined`
   em `expo-network`, mas `AddNetworkListener` espera `boolean | null`. Incompatibilidade de tipo
   entre a definição local e os tipos do pacote.
2. `src/services/mock/mock-server.test.ts:13` — objeto `MockRequest` sem campo `accessToken`
   (obrigatório no tipo). O teste de login/auth não precisa de token, mas o tipo exige.
3. `src/services/mock/mock-server.test.ts:82` — idem, linha 82.

Source:
Detectado em 2026-10-14 (auditoria documental, `npx tsc --noEmit`). Anotado em `progress.md`
entrada TDD-FE-M04-DETAILS como "pré-existentes". Testes passam (373/373 GREEN) — só typecheck falha.

Scope:
- Erro 1: alinhar a definição de `AddNetworkListener` com o tipo real de `expo-network` (`boolean | undefined`).
- Erros 2/3: tornar `accessToken` opcional em `MockRequest`, ou criar helper de fixture.

---

## OFFLINE-FIRST-REPLAN — Replanejamento da arquitetura offline-first do mobile

Status: PENDING (replan registrado 2026-10-13)

**Contexto:** A especificação do produto (`aplicativo-mobile.md` §13.8, `contrato-backend-frontend.md` §11, `telas-frontend.md` §FE-M04/§7.6) exige que TODA alteração do técnico seja salva primeiro no SQLite e só depois sincronizada com o backend. A implementação atual cobre apenas `INSPECTION_RESPONSE`; os demais entity types e o mecanismo de reconexão automática estão incompletos.

**Auditoria realizada em 2026-10-13** comparando código atual com docs. Gaps identificados em ordem de prioridade:

---

### SYNC-RECONNECT — Auto-sync quando rede reconecta

Status: DONE

Implementado em 2026-10-13. `useSyncOnForeground` (`use-sync.ts`) agora registra `addNetworkStateListener` (de `expo-network`) para detectar a transição `isInternetReachable: false → true` e disparar `syncPendingIfOnline`. O listener é removido no cleanup do `useEffect`. A função aceita `_addNetworkListener` como parâmetro opcional (dependency injection) para testabilidade — a default continua sendo `addNetworkStateListener` do `expo-network`.

Abordagem técnica:
- `prevReachable.current` (ref, inicia `null`) rastreia o estado anterior da rede.
- Sync só dispara quando `prevReachable.current === false && isInternetReachable === true` (transição offline→online explícita).
- Evita duplo disparo no mount (null≠false) e em transições online→online.
- Dependency injection via parâmetro opcional — contorna limitação de mocking de namespace ES modules no jest-expo/Metro.

Arquivos alterados:
- `mobile/src/features/sync/use-sync.ts` — lógica do listener + DI
- `mobile/__tests__/use-sync.test.ts` — 7 novos testes TDD (RED→GREEN)
- `mobile/jest.setup.js` — mock de `addNetworkStateListener` no mock global de `expo-network`

Validação (2026-10-13):
- 7/7 testes `__tests__/use-sync.test.ts` GREEN
- 336/338 regressão total (2 timeouts intermitentes pré-existentes em `summary-nc-screens.test.tsx` e `checklist-screen.test.tsx` — não relacionados às alterações)

Scope: frontend-only, nenhuma alteração de backend necessária.
Arquivo: `mobile/src/features/sync/use-sync.ts`
Referência: `arquitetura.md` §11.9, `contrato-backend-frontend.md` §8.7 ponto 3.

---

### SYNC-METADATA — Tabela SyncMetadata ausente do SQLite

Status: DONE (2026-10-14)

Implementado:
- `mobile/src/services/local-db.ts`: tabela `sync_metadata (key TEXT PK, value TEXT)` criada em `getDb()`; exporta `saveSyncMetadata(key, value)` e `getSyncMetadata(key)`.
- `mobile/src/services/sync-service.ts`: importa `saveSyncMetadata`; chama `saveSyncMetadata('last_successful_sync', new Date().toISOString())` ao final de `syncPending` quando `synced > 0`.
- `mobile/app/(protected)/(tabs)/sync.tsx`: importa `getSyncMetadata`; `loadPending` usa `Promise.all` para carregar contagem + última sync; exibe data/hora com `testID="sync-last-time"`.
- `mobile/jest.setup.js`: mock `expo-sqlite` atualizado com `__metaStore: new Map()`, `runAsync` despacha `INSERT OR REPLACE INTO sync_metadata`, `getFirstAsync` despacha por padrão SQL.
- `mobile/__tests__/local-db.test.ts` (novo): 4 testes — null quando ausente, salva/recupera, sobrescreve (idempotente), chaves independentes.
- `mobile/__tests__/sync-service.test.ts`: 3 testes adicionais — salva `last_successful_sync` quando `synced > 0`; não salva quando tudo REJECTED; não salva quando outbox vazio.
- `mobile/__tests__/sync-screen.test.tsx`: 2 testes adicionais — exibe data da última sync; não exibe seção quando nunca sincronizou. Fix: `await renderWithSession(...)` (RTL v14 async).

Validação: 347/347 testes GREEN (30 novos: 4 local-db + 3 sync-service + 2 sync-screen adicionais + 21 pré-existentes nas 3 suítes).

Scope: frontend-only.
Arquivos: `local-db.ts`, `sync-service.ts`, `sync.tsx`, `jest.setup.js`, 3 arquivos de teste.

---

### SYNC-FE-M04-FULL — Tela FE-M04 incompleta

Status: PARTIAL (itens frontend-only implementados 2026-10-14; itens que requerem backend/outros cycles permanecem abertos)

| Campo/ação | Status |
|---|---|
| Quantidade pendente | ✅ implementado |
| Botão "Sincronizar agora" | ✅ implementado |
| Resultado da última sync (synced/failed) | ✅ implementado |
| Última sincronização (data/resultado) | ✅ implementado — SYNC-METADATA 2026-10-14 |
| Operações com erro (FAILED/CONFLICT visíveis) | ✅ implementado — 2026-10-14 (`getFailedEntries`, `testID="sync-failed-count"`) |
| Indicador online/offline | ✅ implementado — 2026-10-14 (`testID="sync-connectivity"`) |
| Status por evidência pendente | ❌ ausente — EVIDENCE não está no outbox |
| Ação "Baixar alterações" (pull) | ❌ ausente — depende de SYNC-PULL (backend) |
| "Tentar novamente" por operação específica | ❌ ausente — depende de SYNC-PULL (backend) |

Implementação 2026-10-14:
- `local-db.ts`: adicionado `getFailedEntries()` — retorna entradas `WHERE status IN ('FAILED', 'CONFLICT')`.
- `sync.tsx`: adicionados estados `online` e `failedEntries`; `loadPending` agora usa `Promise.all` com `getFailedEntries()` e `isOnline()`; UI exibe `testID="sync-connectivity"` (Online/Offline) e seção `testID="sync-failed-count"` quando há erros.
- `jest.setup.js`: mock `getAllAsync` atualizado com despacho `WHERE status IN`.
- Testes: 8 novos (4 em `local-db.test.ts` + 4 em `sync-screen.test.tsx`). Regressão: 364/364 GREEN.

Bloqueios remanescentes: SYNC-PULL (backend), SYNC-OUTBOX-EVIDENCE (backend).
Depends on: SYNC-METADATA ✅, SYNC-OUTBOX-SCHEMA ✅, SYNC-PULL ❌ (backend).

---

### SYNC-OUTBOX-SCHEMA — Schema do outbox incompleto

Status: **DONE** — implementado 2026-10-14

| Campo spec | Status |
|---|---|
| `operationId` (= `id`) | ✅ mapeado como `id` |
| `entityType` | ✅ |
| `entityId` | ✅ |
| `operationType` | ✅ |
| `baseVersion` | ✅ |
| `payloadJson` | ✅ mapeado como `payload` |
| `status` enum (PENDING/FAILED/CONFLICT/COMPLETED) | ✅ adicionado 2026-10-14 |
| `lastError` (mensagem sanitizada) | ✅ adicionado como `last_error` 2026-10-14 |
| `dependencyIds` JSON array | ⏩ YAGNI — excluído do escopo (sem consumidor) |
| `attemptCount` | ✅ coberto por `error_count` |

Implementação 2026-10-14:
- `local-db.ts`: novo tipo `OutboxStatus`; `OutboxRow` + DDL com `status` e `last_error`; `upsertOutboxEntry` inicializa `status='PENDING', last_error=NULL`; `markEntriesSynced` define `status='COMPLETED'`; `incrementErrorCount` substituído por `markEntryFailed(id, status, lastError?)`.
- `sync-service.ts`: usa `markEntryFailed` com `'CONFLICT'` para CONFLICT e `'FAILED'` para demais falhas.
- `jest.setup.js`: mock atualizado para rastrear `status` e `last_error` no `__store`.
- Testes: 9 novos (5 em `local-db.test.ts`, 4 em `sync-service.test.ts`). Regressão: 356/356 GREEN.
Scope: frontend-only.

---

### SYNC-OUTBOX-INSPECTION — INSPECTION não passa pelo outbox

Status: PENDING (requer backend)

Problema: `start.tsx` chama `apiClient.post('/inspections/{id}/start')` diretamente. `summary.tsx` chama `apiClient.post('/inspections/{id}/submit')` diretamente. Ambas falham silenciosamente quando offline — o técnico vê um erro de rede em vez de "salvo no dispositivo".

A spec é explícita (`contrato-backend-frontend.md` §11.3): "Iniciar inspeção... concluir/enviar inspeção. Todas gravam **primeiro** no SQLite." E (`telas-frontend.md` §FE-M07, ação Iniciar): "offline → grava local, marca 'aguardando sincronização', navega igual."

Requer backend:
- `SynchronizationService` precisa suportar `entityType: INSPECTION` com `operationType: START` e `SUBMIT`
- Novos handlers em `SynchronizationService.apply()` para transições de estado da inspeção

Requer frontend:
- `start.tsx`: escrever `{ entityType: 'INSPECTION', operationType: 'START', payload: StartInspectionRequest }` no outbox, navegar mesmo sem rede
- `summary.tsx`: idem para SUBMIT; UI mostra "Aguardando sincronização" em vez de "Concluída"

Scope: requer mudanças em backend + frontend.

---

### SYNC-OUTBOX-NC — NON_CONFORMITY não passa pelo outbox

Status: PENDING (requer backend)

Problema: `useNonConformities` (`features/non-conformities/use-non-conformities.ts`) faz chamadas diretas à API para criar e atualizar NCs. Offline → falha com erro de rede.

A spec (`contrato-backend-frontend.md` §11.3): "registrar não conformidade" é operação offline.

Requer backend: `SynchronizationService` para `entityType: NON_CONFORMITY`.
Requer frontend: reescrever `useNonConformities` para gravar no outbox SQLite primeiro.

Scope: requer mudanças em backend + frontend.

---

### SYNC-OUTBOX-EVIDENCE — EVIDENCE não passa pelo outbox

Status: DONE (2026-10-20, branch `task/sync-outbox-evidence`) — sem mudança no backend

Implementation (2026-10-20): `src/features/evidence/evidence-outbox.ts` — `queueEvidence` copia a foto para
`Paths.document/evidence-pending/<idempotencyKey>.jpg` e grava `EVIDENCE` no outbox (payload JSON com `localUri`,
`idempotencyKey`, `capturedAtDevice`, vínculos e `location`); `syncPending` separa as evidências e, depois do push
JSON, faz o upload multipart pelo endpoint existente; sucesso (ou 409 `EVIDENCE_ALREADY_PROCESSED`) marca
sincronizada e apaga a cópia; falha mantém PENDING/FAILED e o arquivo (RN-047). A prévia (FE-M13) grava
localmente e depois tenta sincronizar. "Requer backend" não se confirmou: o endpoint já é idempotente por chave.

Histórico (status original):
Status: PENDING (requer backend, caso especial)

Problema: evidências (fotos) são enviadas diretamente via multipart/form-data para `POST /inspections/{id}/evidence`. Offline → falha.

A spec (`contrato-backend-frontend.md` §10.8, §11.3): "capturar evidência" é operação offline. Arquivo mantido no dispositivo até `uploadedAt` confirmado (RN-047).

Caso especial: diferente dos outros entity types, evidência tem um arquivo binário. O outbox não pode serializar o arquivo em JSON — precisa armazenar o `local_uri` (caminho do arquivo no dispositivo) e o multipart precisa ser construído na hora da sincronização.

Requer backend: suporte a `entityType: EVIDENCE` no sync push (ou endpoint de upload separado respeitando o outbox).
Requer frontend: armazenar `local_uri` + metadados no SQLite; `sync-service.ts` precisa tratar `EVIDENCE` diferentemente (upload multipart, não JSON).

Scope: requer mudanças em backend + frontend. Maior complexidade do conjunto.

---

### SYNC-PULL — GET /mobile/sync/pull não implementado

Status: PENDING (requer backend)

Problema: a spec define um ciclo completo de sync (`telas-frontend.md` §7.6): PUSH → PULL. A fase PULL (`GET /mobile/sync/pull?cursor=...`) traz as mudanças do servidor (rejeições de supervisores, aprovações, etc.) para o SQLite local. Sem isso, o técnico não vê supervisor rejeitar/aprovar a inspeção.

Requer backend: implementar `GET /mobile/sync/pull` com cursor.
Requer frontend: fase pull em `sync-service.ts` após cada push bem-sucedido; atualizar `last_pull_cursor` em `SyncMetadata`.

Scope: requer mudanças em backend + frontend.

---

**Ordem de implementação recomendada (por impacto/esforço):**

1. `SYNC-RECONNECT` — puro frontend, 1 ciclo, fecha o gap mais crítico do auto-sync
2. `SYNC-METADATA` — puro frontend, 1 ciclo, habilita campos do FE-M04
3. `SYNC-OUTBOX-SCHEMA` — puro frontend, 1 ciclo (mas quebra mocks — requer atenção)
4. `SYNC-FE-M04-FULL` — puro frontend, após os 3 acima
5. `SYNC-OUTBOX-INSPECTION` — requer backend, alto impacto no fluxo principal
6. `SYNC-OUTBOX-NC` — requer backend
7. `SYNC-OUTBOX-EVIDENCE` — requer backend, maior complexidade
8. `SYNC-PULL` — requer backend, finaliza o ciclo completo

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
- ~~`Missing @Size validation on @PathVariable String` — todas as rotas com `@PathVariable String` carecem de constraint de tamanho. Requer `ConstraintViolationException` handler no `GlobalExceptionHandler`. Deferred — ver `decisions.md` 2026-09-28 (PEND-04 H-03).~~ — **RESOLVIDA** em 2026-09-29 (branch `fix/pathvariable-size-validation`): só existia um `@PathVariable String` (`qrCode`), agora `@Size(max = 100)`; handler é para `HandlerMethodValidationException` (Spring 7), não `ConstraintViolationException` — ver `decisions.md` PEND-04 H-03 (SUPERSEDED). 400 `VALIDATION_ERROR` + `fieldErrors[qrCode]`; `openapi.yaml` com `maxLength: 100` + resposta 400. `EquipmentControllerIT` 17/17 (+2); regressão 263 ITs sem falhas novas; HTTP real OK; ECC java-reviewer sem CRITICAL/HIGH/MEDIUM. Follow-ups: constante compartilhada para o limite 100 (hoje repetido em `EquipmentCreate/UpdateRequest` e no path variable); se algum dia houver `@Validated` ou constraints de entidade, `ConstraintViolationException` ainda cai no catch-all 500; `HandlerMethodValidationException` com bean `@Valid` + outro parâmetro rotularia erros pelo nome do parâmetro (não ocorre hoje).

## Pre-existing IT failures — RESOLVIDAS (BF-005, 2026-09-27)

As duas falhas pré-existentes identificadas durante BF-002 foram corrigidas como
pre-requisito do BF-005:

1. **`FlywayMigrationIT`** — asserção `"9"` → `"12"` (schema atual). **RESOLVIDA** em
   `228825c`.

2. **`InspectionTemplateControllerIT`** — `TemplateItemRequest` com campos `boolean`
   primitivos → `Boolean` (boxed), eliminando o erro 500 em `POST .../publish`.
   **RESOLVIDA** em `228825c`. A classe agora tem 17/17 tests GREEN (incluindo 3 novos
   testes de BF-001 adicionados em `7553bc7`).

**Atualização 2026-09-30:** as falhas pré-existentes restantes citadas em BF-005/ERR-HANDLER
(`MobileInspectionControllerIT` 2 — asserções erradas; `SiteControllerIT` 17 — ITORDER-001)
foram **RESOLVIDAS** (branch `fix/mobile-inspection-it`, só testes). `./mvnw verify` completo:
unit 50/50, IT 263/263. Detalhes em `decisions.md` ITORDER-001.

Além disso, o setUp de `InspectionTemplateControllerIT` foi atualizado (em `7553bc7`)
para usar `TRUNCATE TABLE inspection_template_versions CASCADE` via `JdbcTemplate`,
eliminando o risco de violação de FK quando ITs que criam inspeções executam antes
desta classe em `./mvnw verify`.

---

## EVIDENCE-ACCESS-URL-HOST — `accessUrl` da evidência aponta para `localhost`, inacessível no celular

Status: PENDING

Description:
Ao enviar uma evidência, a API devolve `accessUrl` assinada no formato
`http://fieldops-evidence.localhost:9000/evidence/...` (estilo virtual-host do SDK S3 +
`EVIDENCE_STORAGE_ENDPOINT=http://localhost:9000`). No aparelho, esse host não resolve para o PC,
então as miniaturas de `EvidenceThumbnailGrid` (que usa `accessUrl` direto) não carregam.

Source:
Verificado por HTTP real em 2026-10-20 (upload 201 numa instância de teste; registro e objeto
de teste removidos em seguida). Encontrado ao investigar "erro de conexão ao confirmar evidência
no celular" — não é a causa desse erro (o erro acontece no próprio upload), mas afeta o passo seguinte.

Possible directions (decidir antes de implementar):
- endpoint público separado do endpoint interno do storage (ex.: `EVIDENCE_STORAGE_PUBLIC_ENDPOINT`
  com o IP do PC) + path-style access no presigner;
- ou a API servir o arquivo (proxy) em vez de devolver URL direta do storage.

---

## MOBILE-PREEXISTING-CHECKS — typecheck/lint com erros e teste instável (pré-existentes)

Status: PENDING

Description (observado em 2026-10-20, durante EVIDENCE-URI-EXPO-GO; nenhum destes arquivos foi tocado):
- `npm run typecheck`: erros TS em `src/features/sync/use-sync.ts` (1) e
  `src/services/mock/mock-server.test.ts` (2 — `MockRequest` exige `accessToken`).
- `npm run lint`: 2 erros `react-hooks` ("setState synchronously within an effect") em
  `app/(protected)/(tabs)/sync.tsx:40` e `app/(protected)/sync/details.tsx:24`; 6 warnings.
- `__tests__/inspections-screen.test.tsx` › "mostra erro com nova tentativa quando a busca falha":
  falhou 1 vez na suíte completa e passou 11/11 isolada duas vezes — instável sob carga.

Classificação: dívida técnica; tarefa dedicada.
