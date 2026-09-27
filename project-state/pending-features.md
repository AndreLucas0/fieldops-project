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

Status: PENDING

Description:
Allow publishing a new version of a template that already has an `ACTIVE`
version. Currently `TemplateService.update()`/`publish()` require
`status == DRAFT` and there is no path back to `DRAFT` or forward to a new
version from `ACTIVE`.

Source:
Backend audit — 2026-09-22 (`project-state/backend-audit.md`, 🔴 #1).
Requirements: RN-018, RN-019, RN-020, RN-022; `casos-de-uso.md` UC-04/UC-05;
`criterios-de-aceitacao.md` §17.5.

Dependencies:
Product decision on the mechanism (reopen the same `InspectionTemplate` for a
new draft cycle? new endpoint `POST /inspection-templates/{id}/versions/draft`?).
To be determined from documentation and code analysis before implementation.

Relates to: BF-005 (same "reopen template for edit" redesign should likely be
decided together).

Validation:
To be defined during implementation — needs a test that publishes a second
version of an already-`ACTIVE` template (no such test exists today).

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
- Full `./mvnw verify`: 4 pre-existing failures unrelated to BF-002 (see "Pre-existing IT failures"
  below). All other IT classes pass in isolation. Commit pending.

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
- Commit pending (user must trigger).

---

## BF-004 — Dashboard and Inspection History Endpoints

Status: PENDING

Description:
Implement the documented/consumed endpoints:
- `GET /dashboard/summary`, `/dashboard/inspections-by-status`, `/dashboard/non-conformities-by-severity`
- `GET /inspections/{id}/history`

Source:
Backend audit — 2026-09-22 (`project-state/backend-audit.md`, 🔴 #4 and #7).
Requirements: RN-086, UC-18, `api-rest.md` §12.10 (history); `api-rest.md`
§12.16, `plano-implementacao-backend.md` Sprint 8, UC-19 (dashboard).

Dependencies:
- History: none — `AuditEventRepository` already exists and is already populated by `AuditEventPublisher`; only the read side (controller/service) is missing.
- Dashboard: none technically blocking — aggregate queries over existing tables (`inspections`, `non_conformities`). Consider implementing alongside the advanced `/inspections` filters (see `backend-audit.md` 🟡 #3) to avoid duplicating "overdue" logic.

Impact: high for the admin UX — the web `/dashboard` screen (FE-W02) is
already built and calls these three endpoints; they currently 404.

---

## BF-005 — Template Versions and Sections Endpoints

Status: PENDING

Description:
Implement the endpoints for:
- listing/reading published template versions: `GET /inspection-templates/{id}/versions`, `GET /inspection-template-versions/{versionId}`
- incremental section/item builder: `POST/PUT .../sections`, `POST/PUT .../sections/{id}/items`

Source:
Backend audit — 2026-09-22 (`project-state/backend-audit.md`, 🔴 #2 and #3).
Requirements: RN-020, RN-022, `api-rest.md` §12.9.

Dependencies:
- Version listing depends on BF-001 to have more than one version to actually list (the read endpoint itself can technically be built today against `TemplateVersionRepository`, which already supports multiple versions in the data model).
- Section/item endpoints have no technical dependency — additive to the current `TemplateController`.

Impact: the web already assumes this contract (`resources.ts:239-250`) — the
model builder/versions screens don't work against the real backend without it.

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

- `TemplateController` base path is `/templates`, not `/inspection-templates` as documented — affects every template-related contract-divergence item above.
- `PUT /inspections/{id}/responses/{snapshotId}` uses the snapshot id, not a device-generated response id as `api-rest.md` §12.11 describes.
- `POST /inspections/{id}/responses:batch` doesn't exist (mitigated by sync).
- QR lookup (`GET /equipment/by-qr/{qrCode}`) doesn't scope results to the technician's assigned inspection (RN-063, PEND-04) — a security-hardening item, tracked here rather than as its own BF because it's a scope/authorization refinement, not a missing feature.
- Evidence deletion has no ownership check (any `TECHNICIAN`, not just the inspection's owner, can delete) — PEND-05, same nature as the QR item above.
- `InspectionSpecifications` is missing several documented admin filters (`supervisorId, equipmentId, scheduledFrom/To, overdue`, text search `q`) — PEND-15.
- `InspectionResponseController.upsertResponse()` double-loads the inspection: once in `getInspectionForTechnician()` (controller) and again in `upsertResponse()` (service). Pre-existing; identified during BF-002 review. Low priority — optimization refactor only.

## Pre-existing IT failures (identified 2026-09-27, unrelated to BF-002)

Two IT classes fail consistently and pre-date BF-002 work:

1. **`FlywayMigrationIT.migrationsApplyCleanlyOnAnEmptyDatabase`** — asserts
   `flyway.info().current().getVersion() == "9"` but the schema is now at v12
   (migrations 10–12 were added after the test was written). Fix: update the
   assertion to `"12"`. Trivial one-line change.

2. **`InspectionTemplateControllerIT`** — 3 tests fail with HTTP 500 when calling
   `POST /templates/{id}/publish`. Root cause: `JSON parse error: Cannot map null
   into type boolean` — the publish request DTO has a primitive `boolean` field
   that receives `null` from the test payload. Fix: change the DTO field to
   `Boolean` (boxed) or ensure the test sends all required fields. Related to
   BF-001/BF-005 (template publish flow).

Both failures cause the full `./mvnw verify` suite to cascade-fail with ~108 errors
because the failing contexts are shared by other IT classes. Each IT class passes
in isolation. These should be fixed in a dedicated task before the next full IT run.
