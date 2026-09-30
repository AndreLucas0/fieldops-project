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

### [2026-09-27] — Substituição de MinIO por adobe/s3mock no docker-compose

Context:
`docker compose up -d` falhava com `401 UNAUTHORIZED` ao tentar baixar
`quay.io/minio/minio:latest`. A imagem oficial do MinIO no Docker Hub
(`minio/minio:latest`) também retorna `pull access denied — repository
does not exist`. Ambos os registries requerem autenticação que não está
configurada no ambiente de desenvolvimento.

Decision:
Substituir o serviço `evidence-storage` por `adobe/s3mock:latest`, que é
acessível publicamente e compatível com S3 (aceita `forcePathStyle=true`).

Configuração relevante:
- Porta interna: 9090 (HTTP), mapeada para a porta externa `9000` via `EVIDENCE_STORAGE_PORT`.
- Nenhuma mudança necessária na `application.yml` do backend — `EVIDENCE_STORAGE_ENDPOINT`
  continua apontando para `http://localhost:9000`.
- Env var para criação automática do bucket:
  `COM_ADOBE_TESTING_S3MOCK_STORE_INITIAL_BUCKETS` (prefixo `com.adobe.testing.s3mock.store.*`
  confirmado inspecionando `application.properties` dentro da imagem).
- Healthcheck: `wget -q --spider http://localhost:9090/` (GET / = ListBuckets, 200 OK).
- s3mock NÃO autentica credenciais — aceita qualquer `accessKey`/`secretKey`.
  Variáveis `EVIDENCE_STORAGE_ACCESS_KEY` e `EVIDENCE_STORAGE_SECRET_KEY` continuam no
  `.env.example` para uso futuro com um serviço real em produção.

Reason:
Imagens MinIO requerem autenticação em registry. adobe/s3mock é leve,
S3-compatível e de acesso público.

Alternatives considered:
- `localstack/localstack:latest` — também acessível publicamente, mas requer configuração
  mais complexa e não tem bucket auto-criação simples.
- `bitnami/minio:latest` — não encontrado no Docker Hub.

Impact:
**Dados de evidência são efêmeros** — o `evidence-storage` usa diretório temp
interno; dados são perdidos ao reiniciar o container. Aceitável em dev. Para
persistir dados entre restarts em dev, fazer `docker commit` ou adicionar um
volume com permissão de escrita para o usuário `cnb` (UID 1000).
Removed: `fieldops_evidence_data` named volume (era o volume do MinIO).

Status:
ACTIVE

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

### [2026-09-27] — ITORDER-001: Pre-existing full-suite IT ordering failures

Context:
Running `./mvnw verify` (all IT classes in sequence) produces FK violations in
three test classes when a previous class leaves records referencing shared tables.
Observed failures:
- `EquipmentControllerIT.setUp()`: `inspection_templates_created_by_fkey` FK
  violation when `userRepository.deleteAll()` runs after `InspectionTemplateControllerIT`
  left templates with `created_by` pointing to users.
- `SiteControllerIT.setUp()`: same `inspection_templates_created_by_fkey` FK
  violation caused by `InspectionSchedulingControllerIT` leaving templates in DB.
- `MobileInspectionControllerIT`: 2 assertion failures even in isolation (pre-existing
  test logic issue unrelated to ordering).

Decision:
Accept as known limitations. All affected classes pass in isolation and in
sub-group runs. Do not use `./mvnw verify` alone as the pass/fail gate —
use targeted isolation runs for classes under development.

Reason:
Fixing requires adding `JdbcTemplate` TRUNCATE CASCADE to each affected setUp().
This is orthogonal to current BF work; tracked here for a dedicated cleanup task.

Alternatives considered:
Shared `@BeforeAll` with full-schema TRUNCATE CASCADE — rejected as too broad.

Impact:
Full `./mvnw verify` shows false negatives for `EquipmentControllerIT` and
`SiteControllerIT`. CI should use targeted per-package IT runs.

Status:
ACTIVE (pending cleanup task)

---

### [2026-09-27] — BF-005: Section/item builder blocked by data model gap

Context:
`TemplateSection` belongs to `TemplateVersion` (FK `template_version_id`), not
to `InspectionTemplate`. A section/item builder needs somewhere to store draft
sections before publish. There is no "draft sections" table — any section
written must be attached to a version, but a version is only created at publish
time. The current publish flow (`POST /templates/{id}/publish`) receives all
sections in one batch inside the publish request body.

Decision:
Defer section/item builder endpoints (`POST/PUT .../sections`, etc.) until a
product decision is made on the mechanism. Two options:
(a) Add a `draft_sections` table or shadow `template_sections` rows flagged
    `draft = true` attached to the `InspectionTemplate` directly.
(b) Introduce a `POST /inspection-templates/{id}/versions/draft` endpoint that
    creates a `TemplateVersion` in `DRAFT` status, allowing sections to be
    attached incrementally before a final `PUBLISH` action promotes it to
    `ACTIVE`.

Reason:
Implementing the builder before the data model is resolved risks creating a
DB migration that has to be reversed. This is a product architecture decision,
not a coding decision.

Alternatives considered:
Reuse the publish payload approach (already in `PublishTemplateRequest`). This
doesn't require new endpoints but changes the UX pattern from incremental-build
to batch-submit.

Impact:
BF-005 status remains PARTIAL. The web's `listDraftSections`, `createSection`,
`updateSection`, `createItem`, `updateItem` calls (`resources.ts`) will return
404 until this is resolved.

Status:
SUPERSEDED (2026-09-29) — product decision taken: option (b). See
"BF-005: builder over a DRAFT TemplateVersion" below.

---

### [2026-09-29] — BF-005: builder over a DRAFT TemplateVersion

Context:
The block recorded above (2026-09-27) needed a product decision on where draft
sections live. The user chose option (b) on 2026-09-29.

Decision:
- `inspection_template_versions.status` (`DRAFT`/`PUBLISHED`, V14). The builder
  routes (`POST/PUT .../sections`, `POST .../sections/{id}/items`,
  `PUT .../items/{id}`) write into the template's single DRAFT version, created
  lazily on the first builder write (partial unique index: one draft per template).
- RN-020: when the template already has an active version, the new draft starts
  as a copy of the active structure (sections + items).
- `POST .../publish` **without body** (openapi contract) promotes the draft:
  number = max+1, becomes active, previous active is deactivated (BF-001 rule).
  Requires ≥1 section and ≥1 item (RN-015/016 → 422).
- Draft `version_number` is the fixed placeholder `0` (never used by a
  published version), so draft and legacy publish never collide or leave gaps.
- The legacy `POST .../publish` **with** `{"sections":[...]}` body is kept
  (existing tests/clients), but returns 409 `TEMPLATE_DRAFT_IN_PROGRESS` while a
  draft is open — otherwise the open draft would silently overwrite the legacy
  structure on the next publish (ECC java-reviewer H2).
- Drafts are not exposed as versions: excluded from `GET .../versions`,
  404 on `GET /inspection-template-versions/{id}`, and `POST /inspections`
  with a draft `templateVersionId` → 422 `TEMPLATE_VERSION_NOT_PUBLISHED`.
- INACTIVE templates: every builder write and draft publish → 409
  `TEMPLATE_NOT_EDITABLE` (ECC java-reviewer H1).
- `GET /inspection-templates/{id}/sections` (already consumed by web
  `listDraftSections`) returns the draft structure, empty list without draft;
  added to `openapi.yaml` and `docs/api-rest.md` §12.9.

Reason:
Reuses the existing `TemplateSection → TemplateVersion` FK (no parallel
draft tables) and matches the openapi wording "seção na versão em rascunho".

Alternatives considered:
(a) separate draft tables attached to `InspectionTemplate` — rejected by the
user (duplicated structure, copy step on publish).
Delete the open draft on legacy publish — rejected: silent data loss.

Impact:
Web builder calls stop returning 404. Concurrency: races on draft creation,
display_order and publish map to 409 (`DataIntegrityViolationException` /
optimistic lock), not 500; no pessimistic lock was added (follow-up in
`pending-features.md`).

Status:
ACTIVE

---

### [2026-09-27] — N+1 lazy-init pattern in TemplateService (pre-existing, deferred)

Context:
`TemplateService.listVersions()` and `getActiveVersion()` initialize lazy
section/item collections within the transaction by calling `.size()` in a loop:
```java
versions.forEach(v -> v.getSections().forEach(s -> s.getItems().size()));
```
For `listVersions` this is 1 + (page_size * N_sections) + (page_size * N_sections * N_items)
queries per request — a two-level N+1. For `getActiveVersion` and `getVersion`
(single version), the N+1 is bounded and low-risk in practice.
The `findByIdWithSectionsAndItems` pre-existing query causes `MultipleBagFetchException`
(JOIN FETCH two `@OneToMany` simultaneously), so `findById()` + lazy init was used.

Decision:
Accept the N+1 pattern for this sprint. Fixing requires `@EntityGraph` (sections
only) + a second IN-batch query for items. Belongs in a dedicated performance sprint.

Reason:
Template versions are low-volume (typically 1–10 per template). Impact is minimal.

Status:
ACTIVE (pending performance sprint)

---

### [2026-09-28] — PEND-04: QR scope non-terminal statuses (RN-063)

Context:
`EquipmentService.getByQrCode()` (PEND-04) blocks TECHNICIAN access to equipment
unless they have a non-terminal inspection for the equipment's site.
`TERMINAL_STATUSES = {APPROVED, REJECTED, CANCELED}`. The ECC reviewer (H-02)
raised whether `SUBMITTED` and `UNDER_REVIEW` should also be terminal.

Decision:
Treat `SUBMITTED` and `UNDER_REVIEW` as **non-terminal** for the QR scope check.
Technicians retain access during the review phase.

Reason:
The technician may need to return to the site during supervisor review (e.g.,
to provide clarifying evidence). Revoking mobile access at submit would block
legitimate re-visits. `contrato-backend-frontend.md` PEND-04 marks the scope
boundary as `[A DEFINIR]`; this decision fills the gap.

Impact:
Scope revoked only when inspection reaches `APPROVED`, `REJECTED`, or `CANCELED`.

Status:
ACTIVE

---

### [2026-09-28] — PEND-04: AccessDeniedException from service layer (H-01 ECC)

Context:
`EquipmentService.getByQrCode()` throws `AccessDeniedException` from inside a
`@Transactional(readOnly = true)` service method. ECC reviewer raised that this
creates implicit coupling between `GlobalExceptionHandler.handleAccessDenied`
(MVC dispatch path) and `JsonAccessDeniedHandler` (filter-chain path).

Decision:
Accept the pattern. Identical to `EvidenceService.delete()` (PEND-05).
Both handlers produce the same JSON shape (403/FORBIDDEN).

Reason:
Changing requires a new exception class + `GlobalExceptionHandler` handler —
out of scope for PEND-04. Integration test confirms the correct 403 response.

Impact:
Consistent with existing codebase patterns. Low risk while both handlers remain
aligned.

Status:
ACTIVE

---

### [2026-09-28] — PEND-04: Missing @Size on @PathVariable qrCode (H-03 ECC)

Context:
`GET /equipment/by-qr/{qrCode}` accepts an unconstrained String path variable.
DB column is `VARCHAR(100)`. No SQL injection risk (parameterized). Adding
`@Size(max=100)` with `@Validated` requires a `ConstraintViolationException`
handler in `GlobalExceptionHandler` (absent). Codebase-wide gap — all
`@PathVariable String` parameters lack constraints.

Decision:
Defer to a dedicated input-hardening sprint. Add `ConstraintViolationException`
handler + `@Size` annotations across all String @PathVariable endpoints together.

Status:
SUPERSEDED (2026-09-29) — implemented in branch `fix/pathvariable-size-validation`.
Two premises above were wrong when checked against the code:
- Scope: `qrCode` is the **only** `@PathVariable String` in the backend (all other
  path variables are `UUID`, already 400 via `MethodArgumentTypeMismatchException`
  since ERR-HANDLER). Not codebase-wide.
- Exception: on Spring Framework 7 a constraint on a controller parameter (no
  `@Validated`) is enforced by built-in MVC method validation, which raises
  `HandlerMethodValidationException` — not `ConstraintViolationException` (observed
  in the RED run). The handler added is for `HandlerMethodValidationException`
  (400 `VALIDATION_ERROR` + `fieldErrors`); no `ConstraintViolationException`
  handler was added (nothing in the codebase raises it — no `@Validated`).
`@Size(max = 100)` on `qrCode` matches `equipment.qr_code VARCHAR(100)` and
`EquipmentCreateRequest.qrCode`.

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

---

### [2026-09-27] — BF-001: INACTIVE template re-publish behavior is undocumented

Context:
BF-001 removed the `status != DRAFT` guard from `TemplateService.publish()`. The
`TemplateStatus` enum has three values: `DRAFT`, `ACTIVE`, `INACTIVE`. The previous
guard blocked ACTIVE and INACTIVE equally. After BF-001, INACTIVE templates can also
be re-published (they will become ACTIVE with a new version).

Decision:
Accept this behavior implicitly for now. No guard for INACTIVE has been added.
`criterios-de-aceitacao.md` §17.5, RN-018–RN-022, and UC-04 are all silent on whether
re-publishing an INACTIVE template is permitted. The behavior is by omission, not by
explicit design.

Reason:
The acceptance criterion ("alterar modelo já utilizado → nova versão criada") is silent
on INACTIVE. Adding a guard without a documented requirement would be speculative.

Alternatives considered:
Add `if (template.getStatus() == INACTIVE) { throw ... }` — rejected because no
requirement mandates it; deferred until product explicitly prohibits it.

Impact:
If in the future it is decided that INACTIVE templates must not be re-published, add
the guard in `TemplateService.publish()` and a test for the 422 response.

Status:
ACTIVE (pending product clarification if INACTIVE re-publish should be blocked)

---

### [2026-09-27] — BF-001: TemplateVersionControllerIT has same FK ordering risk as InspectionTemplateControllerIT

Context:
`InspectionTemplateControllerIT.setUp()` was updated (BF-001) to use
`jdbcTemplate.execute("TRUNCATE TABLE inspection_template_versions CASCADE")` to avoid
FK violations when inspection-creating IT classes leave data behind. The same risk exists
in `TemplateVersionControllerIT.setUp()` (which uses `versionRepository.deleteAll()` first
without the cascade truncation). The fix was not applied to `TemplateVersionControllerIT`
because it is outside BF-001 scope and the class has been passing in isolation.

Decision:
Defer the fix to `TemplateVersionControllerIT` to a dedicated test-hygiene task.

Reason:
BF-001 scope discipline — only the file modified by this BF should be corrected here.
`TemplateVersionControllerIT` has been passing in practice (7/7 GREEN); the FK violation
would only manifest in full `./mvnw verify` if an inspection-creating IT class runs just
before it.

Impact:
If `./mvnw verify` non-deterministically fails with FK violations in
`TemplateVersionControllerIT.setUp()`, apply the same TRUNCATE CASCADE pattern used in
`InspectionTemplateControllerIT`.

Status:
ACTIVE (known risk, deferred)

---

### [2026-09-26] — Integração ECC × FieldOps: papel, perfil e governança

Context:
O plugin Everything Claude Code (ECC) foi instalado em 2026-09-26. Antes de
qualquer configuração, foram realizadas duas etapas analíticas (Auditoria de
Reconciliação e Desenho da Configuração) para garantir compatibilidade com o
workflow existente do FieldOps.

Decision:
Manter o ECC no perfil `standard` com a configuração padrão instalada.
Nenhum hook adicional foi ativado. Nenhum hook existente foi desativado.
O perfil `standard` é a configuração-alvo definitiva para o FieldOps.

Modelo de responsabilidades e precedência entre as camadas do projeto
(cada camada tem função distinta; não formam uma hierarquia linear única):

- `docs/` — fonte normativa de requisitos, regras de negócio, fluxos e
  comportamento esperado. Define o que o sistema DEVE fazer. Alterações
  exigem evidência e justificativa formal.
- `CLAUDE.md` — fonte operacional de metodologia, workflow, TDD, Git e
  protocolos de sessão. Define como o agente deve trabalhar.
- `project-state/` — fonte de contexto persistente. Registra estado atual,
  decisões técnicas, progresso e pendências.
- Código / Testes / `openapi.yaml` — evidência técnica da implementação
  atual e dos contratos vigentes. Representam o que foi implementado, não
  o que deve ser. Divergências entre código e requisitos documentados devem
  ser registradas (ver CLAUDE.md §3), não resolvidas automaticamente em
  favor do código.
- ECC (hooks, agents, skills) — camada auxiliar de guardrails, validações e
  automações. Reforça as regras do FieldOps; nunca as redefine.
- ECC Learning / Instincts — camada auxiliar de aprendizado. Padrões
  aprendidos não são normativos: não substituem requisito, regra de negócio,
  regra operacional, decisão arquitetural nem regra de workflow sem aprovação
  humana explícita.

Reason:
O perfil `standard` ativa guardrails alinhados com as regras do FieldOps
(`block-no-verify`, `doc-file-warning`, `config-protection`, `gateguard-fact-
force`) sem introduzir comportamentos incompatíveis com o workflow manual de
Git ou com o protocolo TDD exigido pelo CLAUDE.md. Perfil `strict` rejeitado:
adiciona hooks desnecessários no Windows e redundantes no workflow manual.
Perfil `minimal` rejeitado: não ativa proteção de `docs/` nem `gateguard`.

Alternatives considered:
Perfil `strict`, perfil `minimal`, configuração customizada hook-by-hook.

Impact:
Quando houver conflito entre ECC Learning / Instincts e as regras oficiais
do FieldOps (docs/, CLAUDE.md, project-state/, contratos técnicos), o
aprendizado deve ser tratado como não normativo e não deve ser aplicado
automaticamente. CL v1: `auto_approve=false` (aprovação manual
obrigatória antes de qualquer padrão se tornar ativo). CL v2: observer
desativado (`enabled: false`). Nenhum instinct existe para FieldOps (project
ID homunculus: 957db2ab6df0). ECC_HOOK_PROFILE não precisa ser definida
explicitamente: `hook-flags.js` resolve para `standard` por código quando a
variável não está no ambiente.

Status:
ACTIVE

---

### [2026-09-27] — MultipleBagFetchException em TemplateVersionRepository

Context:
`InspectionService.create()` chamava `findByIdWithSectionsAndItems` com JPQL
`LEFT JOIN FETCH tv.sections s LEFT JOIN FETCH s.items`. Hibernate 7.4.1
rejeita o fetch simultâneo de dois `List` (bags) → `MultipleBagFetchException`
→ 500 em todos os testes que criam inspeções. Bug pré-existente; não havia sido
detectado pois os IT tests também falhavam antes dessa sessão por outras razões.

Decision:
Remover `LEFT JOIN FETCH s.items` da query. Carregar `sections` via JOIN FETCH
(única bag). Adicionar `@BatchSize(size=50)` em `TemplateSection.items` para
que Hibernate carregue os itens em batch query separado quando acessados
(evita N+1 sem cartesian product).

Reason:
Mudança mínima que não altera tipos de coleção (`List` permanece), não requer
migração de dados, e resolve a exceção completamente. Para templates típicos
(≤ 20 sections × ≤ 30 items), o batch loading é inexpressivo em termos de
latência.

Alternatives considered:
- Mudar `List<TemplateSection>` para `Set<TemplateSection>` no `TemplateVersion`
  (fix canônico Hibernate): rejeitado por ser mais invasivo — requer atualização
  de todos os callers de `setSections()` em tests.
- `@Fetch(FetchMode.SUBSELECT)`: equivalente ao BatchSize mas menos explícito
  sobre o tamanho do lote.

Impact:
`TemplateSection.items` agora usa batch loading em vez de JOIN FETCH. Para
templates com muitas seções, Hibernate emite `CEIL(sections / 50)` queries
adicionais. Aceitável para o volume esperado no projeto.

Status:
ACTIVE

---

### [2026-09-26] — Comportamento do stop-format-typecheck no FieldOps (Windows)

Context:
O hook `stop-format-typecheck` (ativo no perfil `standard`) é o único mecanismo
ECC identificado que pode escrever em arquivos do projeto. Comportamento
auditado em detalhe no código-fonte do hook.

Decision:
Manter o hook ativo. Registrar as condições exatas de operação para que
sessões futuras não interpretem o comportamento atual como garantia permanente.

Condições verificadas no código:
- Extensões processadas: `.ts`, `.tsx`, `.js`, `.jsx` apenas.
- Extensões nunca afetadas: `.java`, `.yaml`, `.sql`, `.xml`, `.md`, `.json`,
  `.properties` e todos os arquivos do backend Java.
- `web/`: Prettier configurado (`.prettierrc` — printWidth: 100, singleQuote:
  true). Formatter ATIVO se condições de caminho permitirem.
- `mobile/`: nenhum formatter detectado → hook não executa em mobile.
- `backend/`: extensão `.java` excluída pelo filtro → hook nunca alcança Java.
- Condição de skip no Windows (comportamento do hook, não política de
  segurança permanente): `UNSAFE_PATH_CHARS = /[&|<>^%!\s()]/` (linha 33 de
  stop-format-typecheck.js). Se o caminho absoluto do arquivo contém espaços
  E o formatter usa binário `.cmd`, o batch inteiro é ignorado. No ambiente
  atual (`C:\Users\aluca\OneDrive\Área de Trabalho\fieldops-project`), os
  espaços em "Área de Trabalho" ativam este skip. Este é um efeito do caminho
  atual do projeto, não uma configuração de segurança projetada para o FieldOps.

Reason:
Documentar para continuidade de sessão e para que o comportamento não seja
interpretado erroneamente como política de segurança definitiva.

Alternatives considered:
Desativar via `ECC_DISABLED_HOOKS=stop:format-typecheck`: rejeitado — o hook
é inócuo no ambiente atual e a configuração Prettier de `web/` é consistente.

Impact:
LIMITAÇÃO: se o projeto for movido para um caminho sem espaços (ex.:
`C:\projects\fieldops`), o hook passará a formatar arquivos `.ts`/`.js` de
`web/` editados na sessão. A configuração Prettier está correta, mas o
comportamento deve ser compreendido. Se formatação automática não for desejada
nesse cenário futuro, usar `ECC_DISABLED_HOOKS=stop:format-typecheck` como
variável de ambiente local (sem versionar).

Status:
ACTIVE

---

### [2026-09-28] — RN-038/039: Path A — colunas booleanas em inspection_item_snapshots

Context:
`ItemSnapshot.rulesJson` existia como campo JSONB mas nunca era populado.
`TemplateItem` tem `observationRequiredOnFailure` e `evidenceRequiredOnFailure`
como colunas booleanas dedicadas. `createSnapshots()` não copiava esses campos.
Duas abordagens para implementar RN-038/039: Path A (migration V13 + colunas
booleanas) vs Path B (popular `rulesJson` com JSON e parsear em runtime).

Decision:
Path A — migração V13 + colunas booleanas explícitas em `inspection_item_snapshots`.

Reason:
Espelha o design de `template_items`. Evita parsing de JSON em `submit()`.
Indexável, tipado, simples de testar.

Impact:
V13 migration aplicada. `createSnapshots()` copia os valores de `TemplateItem`.
`submit()` valida respostas NON_CONFORMING via
`findByInspectionIdAndConformityFetchSnapshot` (JOIN FETCH para evitar N+1).

Status:
ACTIVE

---

### [2026-09-28] — RN-038/039: cross-module coupling inspection → evidence

Context:
ECC java-reviewer identificou que `InspectionExecutionService` importa
`EvidenceRepository` diretamente do módulo `evidence`.

Decision:
Aceitar o acoplamento direto — mesmo padrão de `NonConformityEvidenceValidator`.

Reason:
Projeto acadêmico. Anti-corruption layer adicionaria boilerplate sem benefício
prático. Coerência com padrão existente é preferível.

Status:
ACTIVE

---

### [2026-09-28] — rulesJson em ItemSnapshot intencionalmente não populado

Context:
`ItemSnapshot.rulesJson` existe na entidade e na tabela mas nunca é populado.
`TemplateItem` não tem campo `rulesJson` equivalente. As regras binárias foram
implementadas via colunas dedicadas (Path A, V13).

Decision:
`rulesJson` permanece null/unused — campo reservado para regras futuras mais complexas.

Reason:
Não há fonte correspondente em `TemplateItem` para copiar. Se necessário no
futuro, o campo está disponível sem nova migration.

Status:
ACTIVE
