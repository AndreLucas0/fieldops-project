# FieldOps — Claude Code Project Instructions

## 1. Project Context

FieldOps is an academic project (CST em Análise e Desenvolvimento de Sistemas —
CEUNSP) for an offline-first field inspection platform. It integrates a mobile
app (technicians), a web admin interface, and a REST API, allowing technicians
to run inspections without connectivity and sync data/evidence afterwards.

Repository layout (confirmed by inspection on 2026-09-22):

```text
fieldops-project/
├── backend/          Java / Spring Boot REST API
├── web/              Angular admin interface
├── mobile/           Expo / React Native technician app
├── shared/           TypeScript-only data contract + mock dataset, consumed by mobile and web
├── docs/             normative product documentation (source of truth for requirements)
├── db/               schema.sql and seed.sql
├── github-kanban/    backlog sync tooling (backlog.yaml + sync_backlog.py)
├── atividades/       course material
├── openapi.yaml      REST contract (root of repo)
├── project-state/    persistent cross-session context (this mechanism)
└── ESTADO-DO-PROJETO.md, test-plan.md, PROMPT-MESTRE-DOCUMENTACAO.md  (root-level working docs)
```

`web/README.MD` notes the backend is developed "em paralelo" and that both
clients run against a built-in mock backend by default
(`EXPO_PUBLIC_API_MOCK=true` / `environment.mockApi=true`). Do not assume the
backend in `backend/` is what mobile/web are actually talking to unless you
verify the relevant env/config for the task at hand.

## 2. Technology Stack

Confirmed by reading `backend/pom.xml`, `web/package.json`,
`mobile/package.json`, and `docker-compose.yml` — do not add/assume
technologies beyond what is listed here without re-verifying.

**Backend** (`backend/`, Maven, `com.codemind.fieldops`):
- Java 21, Spring Boot 4.1.0 (`spring-boot-starter-parent`)
- Spring Data JPA, Spring Security + OAuth2 Resource Server (JWT)
- Flyway (`flyway-database-postgresql`) for migrations
- MapStruct 1.6.3 + Lombok (with `lombok-mapstruct-binding`)
- AWS SDK S3 client 2.29.52 (evidence storage, points at the MinIO service below)
- Test: JUnit via `spring-boot-starter-*-test`, Testcontainers (`postgresql` module), `maven-failsafe-plugin` (integration tests are `*IT.java`, separate from unit `*Test.java`)

**Database / infra** (`docker-compose.yml`):
- PostgreSQL 16 (`postgres:16-alpine`), service `db`
- MinIO (`quay.io/minio/minio:latest`), service `evidence-storage` — S3-compatible object storage for evidence files
- Adminer for DB inspection

**Web** (`web/`, Angular CLI):
- Angular 21.2 + Angular Material 21, RxJS
- TypeScript ~5.9, Vitest as test runner (`npm test` → `ng test`)
- Consumes `shared/` for domain types

**Mobile** (`mobile/`, Expo):
- Expo SDK 57, React Native 0.86.2, React 19.2.3, Expo Router
- TypeScript, Jest for tests (`npm test`)
- Note: the root `README.MD` stack table lists SQLite for mobile, but as of
  the 2026-09-22 backend audit this is **not implemented** — there is no
  local DB, outbox, or sync engine in `mobile/src` (see
  `project-state/backend-audit.md`, BF-007). Treat "SQLite" as a planned/
  documented target, not a current fact, until re-verified.

**API contract:** REST, documented in `openapi.yaml` (root) and `docs/api-rest.md`.

## 3. Documentation as Source of Truth

The `./docs/**` directory is the primary functional source of truth for
requirements, business rules, workflows, contracts and expected behavior.

Before implementing or modifying a feature:

1. Read the relevant documentation.
2. Identify the documented requirement.
3. Locate the current implementation.
4. Compare documented behavior against actual behavior.
5. Define tests based on the documented behavior.
6. Only then implement changes.

Do not assume the current code is correct just because it already exists.

Do not assume the documentation is correct just because it is documented.
When code and documentation diverge, record the divergence before deciding
how to resolve it — see `project-state/decisions.md` and the "Divergências"
pattern used in `project-state/backend-audit.md`.

## 4. Persistent Project State

Persistent project context is stored under `./project-state/`.

Before starting a non-trivial task, inspect:

- `project-state/README.md`
- `project-state/progress.md`
- `project-state/pending-features.md`
- `project-state/decisions.md`

When the task concerns backend functionality, also inspect:

- `project-state/backend-audit.md`

These files are persistent project context and must not be treated as
disposable notes. Update them per the Task Completion Protocol (§11) at the
end of every non-trivial task — do not let this context go stale.

## 5. Development Methodology

Prefer the following workflow:

```text
Requirement
→ Scenario
→ Failing Test
→ Minimal Implementation
→ Passing Test
→ Refactor
→ Integration Validation
→ Documentation Update
→ Git Commit
```

## 6. TDD Rules

Whenever a change involves functional behavior:

1. Identify the rule (cite the RN-xxx / requirement from `docs/regras-de-negocio.md` or the relevant doc).
2. Create/adjust the test.
3. Confirm the test fails for the expected reason.
4. Implement the smallest change necessary.
5. Run the test.
6. Run the relevant regression suite.
7. Refactor only if necessary.

Do not write the implementation first just to make a test pass afterward.

## 7. Scope Discipline

Only modify what is necessary to satisfy the current task.

Do not:
- fix unrelated bugs;
- refactor unrelated code;
- rename unrelated files;
- change APIs without a requirement;
- modify unrelated tests;
- update unrelated documentation;
- change architecture without explicit justification.

Problems discovered during a task should be:
- recorded (in `project-state/pending-features.md` or `decisions.md` as appropriate);
- classified;
- left for a dedicated task —

unless they are direct blockers of the current task.

## 8. Git Workflow

For implementation tasks:

1. Inspect current branch and working tree (`git status`, `git branch --show-current`).
2. Preserve pre-existing local changes — never discard uncommitted work.
3. Create a dedicated task branch when appropriate.
4. Implement the task.
5. Run relevant tests.
6. Run broader regression tests when practical.
7. Review the diff.
8. Commit with a descriptive message.
9. Push the branch when explicitly requested or when the project workflow requires it.

Never use destructive Git commands (`reset --hard`, `checkout --`, `clean -f`,
force push, etc.) to discard user work.

Observed branch naming convention (from `git branch -a` / `git log`, 2026-09-22):
`task/<id>-<slug>` for contract-alignment/integration tasks (e.g.
`task/int-006-align-inspection-detail-contract`), `feat/sprint-N-backend[-topic]`
for backend sprint work, `feat/<topic>` and `branch-<name>` for other feature
work. Merges into `main` go through PRs (see `git log --oneline --decorate`
for `Merge pull request #NNN` entries).

## 9. Validation Requirements

A task is not considered complete only because the code compiles.

Validation should include, when applicable:
- unit tests;
- integration tests;
- API tests;
- frontend typecheck;
- frontend tests;
- mobile tests;
- real HTTP verification;
- database/migration validation;
- build validation.

Known validation commands (confirmed from `package.json`/`pom.xml`/README):
- Backend: `./mvnw test` (unit), `./mvnw verify` (adds `*IT.java` via failsafe; integration tests use Testcontainers and require Docker).
- Web: `npm test` (Vitest, 167 tests as of `ESTADO-DO-PROJETO.md` 2026-08-18), `npm run typecheck` if present, `npx ng build` for production build.
- Mobile: `npm test` (Jest, 302 tests as of `ESTADO-DO-PROJETO.md` 2026-08-18), `npm run typecheck`, `npm run lint`.

When some validation cannot be executed:
- record the command;
- record the reason;
- classify it as an environment limitation;
- do not claim the test passed.

## 10. Environment Limitations

Record only limitations actually observed in the project/session. Confirmed so far:

- Backend integration tests (`*IT.java`) use Testcontainers and require a
  running Docker daemon; this may not be available in every dev environment.
- iOS: Expo Go on the App Store is stuck at client 54.0.2 while the mobile
  project targets Expo SDK 57 (needs Expo Go 57.0.8); Expo only publishes the
  iOS SDK-57 simulator build, which requires macOS. No verified path from
  Windows without a paid Apple account (`ESTADO-DO-PROJETO.md` §8).
- Android via Expo Go works from Windows using the linked APK build
  (`ESTADO-DO-PROJETO.md` §8); the Play Store version conflicts in signature
  with that APK.
- Mobile web preview (`npx expo start --web`) is dev-only and does not
  reliably exercise camera/QR/date-picker/GPS/SecureStore behavior
  (`ESTADO-DO-PROJETO.md` §9).
- This session's environment is Windows (win32) with PowerShell as the
  primary shell; Bash (Git Bash) is also available. Prefer POSIX-style
  commands via the Bash tool for cross-platform scripts already used in this
  repo (Maven wrapper, npm scripts).

## 11. Task Completion Protocol

At the end of every non-trivial task:

1. Record what was implemented.
2. Record what was intentionally not implemented.
3. Record tests executed and results.
4. Record environment limitations.
5. Update `project-state/progress.md`.
6. Update `project-state/pending-features.md` when task status changes.
7. Record important technical decisions in `project-state/decisions.md`.
8. Keep historical information whenever it is useful for future sessions —
   mark superseded information as superseded instead of deleting it.

## 12. Session Startup Protocol

At the beginning of a new Claude Code session:

1. Read `CLAUDE.md`.
2. Run `git status`.
3. Read `project-state/progress.md`.
4. Read `project-state/pending-features.md`.
5. Read `project-state/decisions.md`.
6. Read `project-state/backend-audit.md` when the task concerns backend.
7. Inspect relevant documentation under `./docs/**`.
8. Inspect the current branch and recent Git history.
9. Only then begin analysis or implementation.
