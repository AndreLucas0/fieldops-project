# FieldOps — Current Progress

Last updated: 2026-09-27

## Current State

Backend audit completed (2026-09-22, see `project-state/backend-audit.md`).

The backend is not yet functionally complete relative to `./docs/**`.

BF-006 (evidence upload block on APPROVED inspections) implemented on
2026-09-26 and committed on 2026-09-27 (commit `132b2c4 feat: evidence read
only`) — see pending-features.md for updated status. Backend now enforces
RN-049 for both upload and delete paths.

BF-002 (lock checklist responses after SUBMITTED/UNDER_REVIEW/APPROVED)
implemented on 2026-09-27 — see pending-features.md. Guard clause added to
`InspectionExecutionService.upsertResponse()` enforcing RN-043 + RN-082 on
both HTTP and sync paths. `SynchronizationService.apply()` updated to handle
`ResourceConflictException` gracefully. 3 IT tests added (SUBMITTED, UNDER_REVIEW,
APPROVED for HTTP; APPROVED for sync). Unit tests: 46/46. IT tests: 4/4 targeted
BF-002 tests GREEN (Docker available 2026-09-27). Full `./mvnw verify` has 4
pre-existing failures in FlywayMigrationIT (stale version assertion) and
InspectionTemplateControllerIT (null→boolean in publish DTO) — both unrelated to
BF-002 and causing ~108 cascade errors in full suite. All other IT classes pass in
isolation. Commit pending.

BF-004 (dashboard + inspection history endpoints) implemented on 2026-09-27 —
see pending-features.md. `DashboardController` (`/summary`, `/inspections-by-status`,
`/non-conformities-by-severity`) and `GET /inspections/{id}/history` all GREEN.
`DashboardService.NON_OVERDUE_STATUSES` aligned with `shared/mocks/store.ts`
`CLOSED_STATUSES` (includes `SUBMITTED` + `UNDER_REVIEW`). Existence guard for
history moved into `InspectionService.getHistory()` (single transaction boundary).
ECC review: 0 CRITICAL, 2 HIGH found and fixed. 13/13 IT + 46/46 unit GREEN.
Commit pending.

BF-003 (persist `conformity` field on inspection responses) implemented on
2026-09-27 — see pending-features.md. Added `String conformity` to
`InspectionResponseCreateRequest`, `InspectionResponseSyncPayload`, and
`InspectionResponseDto`. Wired `Conformity.valueOf()` in
`InspectionExecutionService.upsertResponse()`. Updated
`SynchronizationService.applyInspectionResponse()` and `toChange()` (pull path).
Input validation: `@Pattern` on DTO + `@Valid` on controller `@RequestBody` → 400
for invalid enum strings (ECC HIGH finding resolved). Explicit `@Mapping` added to
`InspectionResponseMapper.toDto()` for consistency (ECC MEDIUM finding resolved).
4 new IT tests: 3 in `InspectionResponseControllerIT` (conformity persists, null
conformity, invalid conformity→400), 1 in `SyncPushControllerIT` (conformity
applied via sync). Results: 46/46 unit tests, 16/16 `InspectionResponseControllerIT`
in isolation, 10/10 `SyncPushControllerIT` in isolation. Commit pending.

Persistent project memory (`CLAUDE.md` + `project-state/`) was set up on
2026-09-22 in a dedicated, non-implementation task — see `decisions.md` for
the rationale.

## Completed Work Referenced by Recent Git History

Verified against `git log --oneline --decorate` on `main` (HEAD `c929ea3`) on
2026-09-22:

| Ref (task id inferred from branch name) | Commit | Summary |
|---|---|---|
| INT-001 | `a25f337` (branch `task/int-001-align-templates-api`) | fix: align templates API integration |
| INT-005 | `358b1ec` (branch `task/int-005-technician-start-inspection`) | fix: allow technicians to start assigned inspections |
| INT-010 | `4f31cda` (branch `task/int-010-web-login`) | feat: implement web authentication flow |
| INT-006 | `b311fd5` (branch `task/int-006-align-inspection-detail-contract`) | fix: align mobile inspection detail contract |
| — | `c929ea3` | Merge pull request #263 (merges INT-006 branch into `main`) |

These entries are read directly from `git log`/`git branch -a` and are
current as of this update. Re-verify with `git log` in future sessions rather
than trusting this table indefinitely — it will go stale as work continues.

## Latest Backend Audit

44 features analyzed (see `project-state/backend-audit.md` for full detail
and evidence):

- 28 implemented (🟢)
- 6 partial (🟡)
- 7 not implemented (🔴)
- 2 without test evidence (⚪)
- 0 mock/placeholder (🔵)
- 1 not integrated (🟣)

## Current Pending Work

See `project-state/pending-features.md` (BF-001 through BF-007).

## Recommended Next Task

BF-001 — Template Versioning

This is a planning/state recommendation carried over from the audit report,
not an instruction to implement it automatically. The actual next task
should be chosen with the project owner, considering product priorities not
captured by this audit (the audit deliberately avoided ranking pendencies by
complexity/priority — see `backend-audit.md` methodology).

## Environment Limitations Observed

- The 2026-09-22 backend audit was read-only and evidence-based on static
  analysis: it read test files as evidence of coverage but did **not**
  execute the test suites (`./mvnw test`/`verify`, `npm test` in web/mobile).
  Treat "🟢 implemented + tested" findings as "a corresponding test file
  exists and appears to cover the case," not as "the suite was run and
  passed in this session."
- Backend integration tests (`*IT.java`) use Testcontainers and require a
  running Docker daemon — availability not verified in this session.
- This session ran on Windows (win32); path/shell specifics in `CLAUDE.md`
  §10 apply.

## Historical Note

`ESTADO-DO-PROJETO.md` (dated 2026-08-18) states "A API (Java/Spring) não
existe neste repositório." This is now stale — `backend/` contains 184 Java
files, 12 Flyway migrations, and 27 test files as of 2026-09-22. The document
was written from the `web` branch before the backend was merged into `main`.
Do not use `ESTADO-DO-PROJETO.md` as the source of truth for backend state;
use `project-state/backend-audit.md` instead. (Recorded as a documentation
divergence in `project-state/backend-audit.md` rather than corrected in
place, per the read-only audit rules that produced it.)
