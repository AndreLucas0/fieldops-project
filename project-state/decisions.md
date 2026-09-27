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
