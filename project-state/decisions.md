# Technical Decisions

This file records important project decisions that future Claude Code
sessions should understand.

## Decision Format

### [DATE] — [TITLE]

Context:
...

Decision:
...

Reason:
...

Alternatives considered:
...

Impact:
...

Status:
ACTIVE / SUPERSEDED

---

### [2026-09-22] — Persistent cross-session project memory (`CLAUDE.md` + `project-state/`)

Context:
Project context (working rules, audit findings, backlog, rationale for past
choices) previously lived only in individual Claude Code chat sessions. A
full backend audit had just been produced (2026-09-22) but its only copy was
a session-scratchpad file, which is ephemeral and not part of the repository.

Decision:
Adopt `CLAUDE.md` at the repo root as the permanent working manual (source-
of-truth hierarchy, methodology, TDD/scope/git rules, session
startup/completion protocols), and `project-state/` as the durable store for
audit results, backlog, progress, and decisions.

Reason:
Explicit request to stop depending exclusively on conversation history for
continuity across sessions/machines.

Alternatives considered:
Keeping the audit only in `./docs/**` was rejected — `docs/**` documents
*required* behavior (source of truth for requirements), not *findings about
current implementation state*, which is a different kind of information and
would conflate the two if merged.

Impact:
Future sessions must read `project-state/*` before starting non-trivial work
(see `CLAUDE.md` §4/§12), and must update it at task completion (`CLAUDE.md`
§11).

Status:
ACTIVE

---

The entries below are decisions already recorded in `ESTADO-DO-PROJETO.md`
§11 (dated 2026-08-18, web/mobile side) prior to this persistence mechanism
being set up. They are reproduced here, not invented, so they survive even
if that document is later archived or found stale (it is already known to
be stale regarding backend existence — see `progress.md`, Historical Note).
Where the source document didn't specify alternatives considered, that field
says so explicitly rather than guessing.

### [2026-08-18] — Shared data contract and mock dataset in `shared/`

Context:
`UserRole` and related domain types were declared independently in both
`mobile/` and `web/`, with nothing guaranteeing they stayed in sync.

Decision:
Move the contract and the fictitious/mock dataset into a single
TypeScript-only `shared/` package consumed by both clients.

Reason:
Single source of truth for domain types and demo data across two otherwise
independent npm projects.

Alternatives considered:
Não especificado no relatório disponível.

Impact:
Mobile re-exports the contract via `@/models` (no screen changed); web
re-exports it in `core/models/domain.ts`. Both `metro.config.js` (mobile)
and `tsconfig.json` `paths` (web) had to be configured to see `shared/`.

Status:
ACTIVE

---

### [2026-08-18] — Web access token kept in memory only, refresh token in `sessionStorage`

Context:
Token storage strategy for the Angular web client.

Decision:
Keep the access token only in memory; persist the refresh token in
`sessionStorage`.

Reason:
Documented as following `arquitetura.md` §11.10; an F5 reload is recovered
via the refresh token.

Alternatives considered:
Não especificado no relatório disponível.

Impact:
A hard reload always requires a silent refresh; the access token is never
persisted to disk-backed storage.

Status:
ACTIVE

---

### [2026-08-18] — Domain services as abstract classes (mock/HTTP swap) on web

Context:
Web needs to run against both a fictitious backend and the real API without
touching component code.

Decision:
Each of the eight domain resources (users, clients, sites, equipment,
templates, inspections, non-conformities, dashboard) is modeled as an
abstract class serving as both contract and DI token, with two
implementations: HTTP and mock.

Reason:
Swapping mock↔HTTP should not require touching any component.

Alternatives considered:
Não especificado no relatório disponível.

Impact:
`provideResources()` picks the implementation based on `environment.mockApi`.

Status:
ACTIVE

---

### [2026-08-18] — Auth guard does not redirect on HTTP 403

Context:
Behavior of the web route guard when a request is forbidden vs. unauthorized.

Decision:
On 403, warn and block in place; do not redirect to another protected route.

Reason:
Redirecting to another protected route on a 403 risks a redirect loop.

Alternatives considered:
Não especificado no relatório disponível.

Impact:
403 handling is visually different from 401 handling (which does redirect to
login).

Status:
ACTIVE

---

### [2026-08-18] — Angular Material chosen over PrimeNG for web UI

Context:
Component library choice for the Angular admin interface.

Decision:
Use Angular Material 21.

Reason:
PrimeNG 22 requires Angular 22; the project is pinned to Angular 21 (Node
version constraints — see `web/src/app/shared/components/README.md` per
`ESTADO-DO-PROJETO.md`).

Alternatives considered:
PrimeNG 22 (rejected due to the Angular-version requirement).

Impact:
Web UI components are built on Angular Material's API/theming.

Status:
ACTIVE

---

### [2026-08-18] — Custom design system on mobile (not a component library)

Context:
Mobile app already had an established visual language.

Decision:
Keep a bespoke design system (`mobile/src/design-system/`: dark palette,
48px touch targets, tokens/components) rather than adopting a third-party
RN component library.

Reason:
The app already had palette, fonts, and components in active use.

Alternatives considered:
Não especificado no relatório disponível.

Impact:
Mobile UI work should extend `design-system/`, not introduce a parallel
component library.

Status:
ACTIVE

---

### [2026-08-18] — Non-conformity description required regardless of severity

Context:
Whether NC description is optional for low-severity non-conformities.

Decision:
Require a description on every non-conformity, regardless of severity.

Reason:
The contract requires it for any severity.

Alternatives considered:
Não especificado no relatório disponível.

Impact:
No severity-based exception exists in either the mock or the intended
backend contract.

Status:
ACTIVE

---

### [2026-08-18] — 500ms debounce on checklist response input

Context:
Frequency of write calls while a technician types a checklist observation.

Decision:
Debounce checklist input by 500ms before persisting.

Reason:
Without it, every keystroke would trigger a `PUT` request.

Alternatives considered:
Não especificado no relatório disponível.

Impact:
Relevant to BF-002 (lock responses after submit/approval): the debounce
timer must be considered when reasoning about the last write racing a status
change.

Status:
ACTIVE
