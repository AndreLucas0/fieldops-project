# FieldOps — Current Progress

Last updated: 2026-09-28 (PEND-04)

## Current State

Backend audit completed (2026-09-22, see `project-state/backend-audit.md`).

Todos os itens críticos do audit (BF-001 a BF-006) estão implementados e commitados.
A branch `feat/BF-001` está 6 commits à frente de `main` (BF-002 a BF-005 + BF-001 —
BF-006 já está em `main` desde `132b2c4`). Nenhum commit pendente na working tree.

### BF-001 — Template Versioning — commitado `7553bc7`

`POST /inspection-templates/{id}/publish` agora funciona para templates em qualquer
status (não apenas `DRAFT`). Chamar em template `ACTIVE` cria nova versão com
`versionNumber` auto-incrementado, desativa versões ativas anteriores
(`activeForNewInspections = false`) e mantém o template `ACTIVE`. Publishes
concorrentes protegidos por `@Version` em `InspectionTemplate` → 409.
3/3 novos IT tests + 17/17 `InspectionTemplateControllerIT` + 46/46 unit tests GREEN.
`InspectionTemplateControllerIT.setUp()` atualizado com TRUNCATE CASCADE via
`JdbcTemplate` para evitar violações de FK entre IT classes.

### BF-002 — Lock Inspection Responses — commitado `42d86fd`

Guard clause em `InspectionExecutionService.upsertResponse()` bloqueia alterações de
respostas quando a inspeção está em `SUBMITTED`, `UNDER_REVIEW` ou `APPROVED` (RN-043,
RN-082). `SynchronizationService.apply()` captura `ResourceConflictException` e retorna
`Outcome.rejected()`. 4 novos IT tests GREEN (3 HTTP + 1 sync path).

### BF-003 — Persist `conformity` — commitado `2c4893f`

Campo `conformity` adicionado a `InspectionResponseCreateRequest`,
`InspectionResponseSyncPayload` e `InspectionResponseDto`. Validação `@Pattern` → 400
para strings de enum inválidas. 4 novos IT tests GREEN.

### BF-004 — Dashboard + Inspection History — commitado `1545467`

`GET /dashboard/summary`, `GET /dashboard/inspections-by-status`,
`GET /dashboard/non-conformities-by-severity` e `GET /inspections/{id}/history`
implementados. 13/13 IT tests GREEN. 2 HIGHs do ECC corrigidos antes do commit.

### BF-005 — Template Version Read Endpoints — commitado `228825c` (PARTIAL)

`GET /inspection-templates/{id}/versions` e `GET /inspection-template-versions/{versionId}`
implementados. `TemplateController` com dual mapping `/templates/*` + `/inspection-templates/*`.
Pre-req fixes: `FlywayMigrationIT` version assertion + `TemplateItemRequest` boolean → Boolean.
7/7 IT tests GREEN. Section/item builder ainda **BLOQUEADO** — decisão de produto pendente
sobre armazenamento de seções draft (ver `decisions.md` 2026-09-27).

### NESTED-NAV — Nested Navigation Endpoints — não commitado ainda

`GET /clients/{clientId}/sites` e `GET /sites/{siteId}/equipment` implementados
(openapi.yaml §12.7, §12.8; web client `resources.ts` linhas 214/235 chamavam
esses endpoints e recebiam 404).

Abordagem: endpoints adicionados diretamente em `ClientController` e
`SiteController` respectivamente. Cada endpoint valida existência do pai
(`clientService.getById` / `siteService.getById`) retornando 404 se não
encontrado, depois delega ao `SiteService.list` / `EquipmentService.list`
já existentes. Sem nova migration ou novo service.

16/16 `ClientControllerIT` GREEN (incluindo 4 novos testes da rota nested).
17/17 `SiteControllerIT` GREEN (incluindo 4 novos testes da rota nested).
13/13 `EquipmentControllerIT` GREEN. 46/46 unit tests GREEN.

Pre-existing full-suite ordering failures (não relacionadas a esta BF):
`EquipmentControllerIT` + `SiteControllerIT` falham no `./mvnw verify` completo
por FK ordering entre IT classes (ver `decisions.md` 2026-09-27 — ITORDER-001).
Todos passam em isolamento e em grupos de classes relacionadas.

### PEND-15 — Admin Filters on `GET /inspections` — não commitado ainda

5 filtros documentados no `openapi.yaml` adicionados a `GET /inspections`:
`supervisorId` (UUID), `equipmentId` (UUID), `scheduledFrom` (Instant),
`scheduledTo` (Instant), `overdue` (Boolean). Sem migration necessária — todos
os campos já existiam na entidade `Inspection`.

Side-fix: `MultipleBagFetchException` pré-existente em `POST /inspections`
corrigida como bloqueador de teste: removido `LEFT JOIN FETCH s.items` da query
`TemplateVersionRepository.findByIdWithSectionsAndItems`; adicionado
`@BatchSize(size=50)` em `TemplateSection.items`.

19/19 `InspectionSchedulingControllerIT` GREEN (incluindo 6 novos testes dos filtros
+ 2 novos testes de overdue). 52/52 nos 4 inspection IT classes. 24/24 nos template IT
classes. 0 regressões.

### PEND-04 — QR Lookup Scope (RN-063) — não commitado ainda

`GET /equipment/by-qr/{qrCode}` now enforces RN-063: a TECHNICIAN can only read
equipment data if they have a non-terminal inspection assigned to that equipment's
site. ADMIN and SUPERVISOR are unrestricted.

Scope definition: non-terminal = any status except APPROVED, REJECTED, CANCELED
(see `decisions.md` 2026-09-28 for the SUBMITTED/UNDER_REVIEW rationale).

Implementation:
- `InspectionRepository` — `existsByTechnicianIdAndSiteIdAndStatusNotIn()`
- `EquipmentService.getByQrCode()` — new params `(UUID userId, boolean isTechnician)`,
  scope check via repository query, `AccessDeniedException` → 403 if out of scope
- `EquipmentController.getByQrCode()` — extracts JWT claims, passes to service
- `EquipmentControllerIT` — added `@AfterEach` tearDown (cross-class FK fix),
  renamed `technicianCanGetEquipmentByQrCode` → `technicianCannotGetEquipmentByQrCodeOutOfScope`
  (now expects 403), added `technicianCanGetEquipmentByQrCodeWithActiveInspection` (200),
  added `technicianCannotGetEquipmentByQrCodeFromDifferentSite` (403)
- `EquipmentServiceTest` — new unit test class (4 tests for scope logic)

ECC java-reviewer results: 0 CRITICAL, 3 HIGH — all resolved:
  - H-01 (AccessDeniedException from service): accepted, matches PEND-05 pattern (decisions.md)
  - H-02 (SUBMITTED/UNDER_REVIEW scope): explicit decision recorded (decisions.md)
  - H-03 (@Size on @PathVariable): deferred, codebase-wide gap (decisions.md)
4 MEDIUM findings: M-02 fixed (EquipmentServiceTest), M-03 fixed (different-site test),
M-01 and M-04 documented/deferred.

Test results:
- EquipmentControllerIT: 15/15 GREEN (3 new PEND-04 tests)
- EquipmentControllerIT + SiteControllerIT: 31/31 GREEN (@AfterEach fixed cross-class FK)
- Unit tests: 50/50 GREEN (4 new in EquipmentServiceTest)
- InspectionSchedulingControllerIT + SiteControllerIT: pre-existing ITORDER-001 failure,
  not caused by PEND-04

---

### PEND-05 — Evidence Deletion Ownership — não commitado ainda

Guard de ownership adicionado a `EvidenceService.delete()`: TECHNICIAN só pode deletar
evidências de inspeções onde é o técnico atribuído. ADMIN e SUPERVISOR mantêm acesso
irrestrito. Guard reordenado: ownership (403) antes do APPROVED check (409) para evitar
vazamento de estado a usuários não autorizados.

EvidenceController.delete(): extraído `isTechnician` de `jwt.getClaimAsString(JwtClaims.ROLE)`,
repassado ao service junto com `userId`.

12/12 `EvidenceControllerIT` GREEN (incluindo 1 novo teste `technicianCannotDeleteEvidenceFromOtherTechniciansInspection`).
46/46 unit tests GREEN. Outros ITs em isolamento: 19/19 InspectionSchedulingControllerIT,
12/12 InspectionExecutionControllerIT, 10/10 SyncPushControllerIT.

Side-fix: 3 MEDIUMs do ECC java-reviewer corrigidos antes de finalizar:
- Guard ordering invertido (ownership antes de APPROVED)
- Asserção pós-rejeição adicionada ao novo teste (evidência ainda existe no DB)
- Upload setup no teste agora tem asserção de sucesso

---

### BF-006 — Evidence Read-Only After Approval — commitado `132b2c4` (em `main`)

Guard clause em `EvidenceService.upload()` bloqueia uploads em inspeções `APPROVED`
(RN-049). 11/11 `EvidenceControllerIT` + 46/46 unit tests GREEN.

---

## Completed Work — Git History Atualizado

Verificado contra `git log --oneline` em `feat/BF-001` em 2026-09-27:

| Commit | Branch/contexto | Resumo |
|---|---|---|
| `7553bc7` | `feat/BF-001` | feat: template versioning feature (BF-001) |
| `228825c` | `feat/BF-001` | feat: template versions and sections endpoints (BF-005) |
| `1545467` | `feat/BF-001` | feat: implement dashboard and inspection history endpoints (BF-004) |
| `89b8d50` | `feat/BF-001` | doc: pending-features update |
| `2c4893f` | `feat/BF-001` | feat: persist conformity field (BF-003) |
| `42d86fd` | `feat/BF-001` | feat: lock inspection responses after submission/approval (BF-002) |
| `b885ae0` | `feat/BF-001` (base) | docs: correlação de stale data |
| `132b2c4` | `main` (HEAD) | feat: evidence read only (BF-006) |
| `c929ea3` | `main` | Merge pull request #263 (INT-006) |
| `9a33c5c` | `main` | Merge pull request #267 (INT-005) |

Re-verificar com `git log` em sessões futuras — esta tabela envelhecerá com novos merges.

---

## Status Atualizado do Audit

Audit base: 2026-09-22, HEAD `c929ea3`, 44 features (ver `backend-audit.md`).

Desde o audit, os seguintes itens 🔴 foram resolvidos:

| BF | Item audit | Status anterior | Status atual |
|---|---|---|---|
| BF-006 | 🔴 #6 evidence upload bloqueado em APPROVED | 🔴 | 🟢 |
| BF-002 | 🔴 #5 lock responses após submit/approval | 🔴 | 🟢 |
| BF-003 | 🟡 #4 persist `conformity` | 🟡 | 🟢 |
| BF-004 | 🔴 #4/#7 dashboard + history | 🔴 | 🟢 |
| BF-005 | 🔴 #2/#3 template version read endpoints | 🔴 | 🟡 (partial — builder bloqueado) |
| BF-001 | 🔴 #1 template re-versioning | 🔴 | 🟢 |

---

## Current Pending Work

Ver `project-state/pending-features.md` para detalhe de cada item.

Itens ainda pendentes:
- **BF-005** (PARTIAL/BLOCKED) — section/item builder endpoints aguardam decisão de produto
- **BF-007** (PENDING) — integração mobile sync; tarefa do lado mobile, não backend
- ~~PEND-04 (QR scope)~~ — **RESOLVIDA** em 2026-09-28 (ver PEND-04 acima)
- ~~PEND-05 (evidence ownership)~~ — **RESOLVIDA** em 2026-09-28 (ver PEND-05 acima)
- ~~PEND-15 (admin filters)~~ — **RESOLVIDA** em 2026-09-28 (commitado em `22b7d31`)
- **Hardening** — `@Size` em `@PathVariable String` + handler `ConstraintViolationException` (codebase-wide, deferred)

---

## Recommended Next Task

Com os BFs críticos concluídos, as opções são:

1. **Abrir PR de `feat/BF-001` → `main`** para integrar todos os commits acumulados
   na branch. Recomendado antes de iniciar novo trabalho para evitar divergência de base.

2. **Decisão de produto sobre BF-005** — Definir mecanismo de armazenamento de seções
   draft (tabela `draft_sections` vs. `TemplateVersion` em status `DRAFT`) para
   desbloquear o section/item builder. Esta é uma decisão de produto/arquitetura, não
   de código (ver `decisions.md` 2026-09-27).

3. **BF-007** — Integração mobile sync: grande escopo, envolve persistência local,
   outbox e tela FE-M04 no mobile. Bloqueante para a entrega per AC-RELEASE
   (`criterios-de-aceitacao.md` §17.19).

4. **Input hardening** — `@Size` constraints em `@PathVariable String` + handler
   `ConstraintViolationException` em `GlobalExceptionHandler` (codebase-wide).
   Ver `decisions.md` 2026-09-28 PEND-04 H-03.

---

## Environment Limitations Observed

- Docker esteve **disponível** em 2026-09-27 — IT tests via Testcontainers executados
  com sucesso (todos os ITs verificados passaram em isolamento nesta sessão).
- iOS: Expo Go no App Store travado em SDK 54 enquanto o projeto usa SDK 57; requer
  macOS para o simulador (`ESTADO-DO-PROJETO.md` §8).
- Android via Expo Go funciona no Windows com o APK linkado (`ESTADO-DO-PROJETO.md` §8).
- Mobile web preview (`npx expo start --web`) não exercita camera/QR/GPS/SecureStore
  de forma confiável (`ESTADO-DO-PROJETO.md` §9).
- Windows (win32) / PowerShell como shell primário; Bash disponível via Git Bash.

---

## Historical Note

`ESTADO-DO-PROJETO.md` (2026-08-18) afirma "A API (Java/Spring) não existe neste
repositório" — informação stale. O `backend/` tem 184+ Java files, 12 Flyway
migrations e vários test files. Usar `project-state/backend-audit.md` como fonte de
verdade do estado do backend, não `ESTADO-DO-PROJETO.md`.
