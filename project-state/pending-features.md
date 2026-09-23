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

Status: PENDING

Description:
Prevent changes to checklist responses once an inspection reaches
`SUBMITTED`, `UNDER_REVIEW`, or `APPROVED`. Today `InspectionExecutionService.
upsertResponse` never reads `inspection.getStatus()`.

Source:
Backend audit — 2026-09-22 (`project-state/backend-audit.md`, 🔴 #5).
Requirements: RN-043, RN-082.

Scope:
- direct response endpoint (`PUT /inspections/{id}/responses/{snapshotId}`, `InspectionResponseController`)
- mobile sync flow (`SynchronizationService.applyInspectionResponse`, which reuses the same service method)

Important: a fix in `InspectionExecutionService.upsertResponse` covers both
paths at once, but tests for **both** call sites need to be written —
`InspectionResponseControllerIT` and `SyncPushControllerIT` currently have no
"respond after approved/submitted" case.

Impact: high — core data-integrity rule (an approved inspection's record
should not be rewritable).

---

## BF-003 — Persist `conformity`

Status: PENDING

Description:
The `conformity` field (used by the `CONFORMITY` response type, required in
the MVP per `funcionalidades.md` §8.5) is never set by any client-facing
write route (`InspectionResponseCreateRequest`, `InspectionResponseSyncPayload`
don't include it). This also blocks validating RN-036 and RN-038, since there
is no conformity value to validate against.

Source:
Backend audit — 2026-09-22 (`project-state/backend-audit.md`, 🟡 #4).
Requirements: RN-035, RN-036, RN-038; `modelo-de-dados.md` §10.8.4;
`funcionalidades.md` §8.5.

Dependencies: none technically blocking.

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

Status: PENDING

Description:
Prevent new evidence uploads once an inspection reaches `APPROVED`
(currently only deletion is blocked; `EvidenceService.upload()` doesn't check
`inspection.getStatus()`).

Source:
Backend audit — 2026-09-22 (`project-state/backend-audit.md`, 🔴 #6).
Requirement: RN-049.

Relates to: BF-002 (same "approved = immutable" rule category).

Dependencies: none.

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
