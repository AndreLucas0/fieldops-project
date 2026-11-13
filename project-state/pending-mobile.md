# Mobile — Inventário de Telas e Status de Integração

**Data:** 2026-10-14 (atualizado — auditoria documental)
**Branch analisada:** `main` (HEAD após SYNC-FE-M04-FULL/SYNC-OUTBOX-SCHEMA/SYNC-METADATA/F10, não commitados)
**Tipo:** inventário atualizado em 2026-10-14 com base em evidências de código e testes (373/373 mobile GREEN)
**Fonte primária:** `docs/telas-frontend.md` §2, `docs/auditoria-frontend-backend.md`, `mobile/src/`

---

## Legenda de Status

- `COMPLETA` — tela implementada e integrada (sem blockers conhecidos)
- `PARCIAL` — tela existe mas há divergências de contrato, campos ausentes ou fluxo incompleto
- `AUSENTE` — nenhum componente encontrado para essa tela

---

## Resumo executivo (2026-10-14)

| Status | Contagem | % |
|---|---:|---:|
| COMPLETA | 1 | 7% |
| PARCIAL | 13 | 93% |
| AUSENTE | 0 | 0% |

> Nota: FE-M04 foi rebaixada de COMPLETA para PARCIAL porque 3 itens da spec (`telas-frontend.md` §FE-M04) permanecem bloqueados pelo backend (SYNC-PULL, SYNC-OUTBOX-EVIDENCE). FE-M14 permanece COMPLETA (todos os itens frontend-only implementados). Ver SYNC-FE-M04-FULL em `pending-features.md`.

Raízes dos problemas transversais:

1. ~~**`UNAUTHORIZED` não mapeado em `toAuthFailureCode()`**~~ — **RESOLVIDO 2026-10-13**: `case 'UNAUTHORIZED': return 'INVALID_CREDENTIALS'` adicionado em `session-context.tsx`.
2. **Nomes de entidade indisponíveis ao técnico** — `GET /clients/{id}`, `GET /sites/{id}` e `GET /equipment/{id}` retornam 403 para TECHNICIAN (AUTHZ-BOUNDARY). `MobileInspectionDetailResponse` não inclui `clientName`/`siteName`/`equipmentName`.
3. ~~**`POST /mobile/sync/push` ausente do mock**~~ — **RESOLVIDO 2026-10-13**: rota adicionada a `mock-server.ts`; outbox drena em modo mock. Ver `mock-server.test.ts`.
4. **Outbox cobre apenas `INSPECTION_RESPONSE`** — `local-db.ts` só suporta esse `entity_type`. Transições de inspeção e não conformidades vão direto para a API sem fallback offline.
5. ~~**`countPendingEntries()` sem UI**~~ — **RESOLVIDO 2026-10-13**: FE-M04 implementada; consome `countPendingEntries()` e expõe botão de sync manual. Ver `sync.tsx` e `sync-screen.test.tsx`.

---

## Inventário por tela

### FE-M01 — Login (mobile)

| Campo | Valor |
|---|---|
| Status | **PARCIAL** |
| Rota | `/(public)/login` |
| Backend | `POST /auth/login`, `POST /auth/refresh`, `GET /auth/me` |

Implementado: autenticação, renovação de token, persistência via `expo-secure-store`.

Blockers:
- ~~**`UNAUTHORIZED` não mapeado (F6)**~~ — **RESOLVIDO 2026-10-13**: `case 'UNAUTHORIZED': return 'INVALID_CREDENTIALS'` adicionado em `session-context.tsx:89-90`; teste em `session-context.test.tsx`.

---

### FE-M02 — Início

| Campo | Valor |
|---|---|
| Status | **PARCIAL** |
| Rota | `/(protected)/(tabs)/index` |
| Backend | `GET /mobile/inspections` |

Implementado: lista resumida de inspeções do técnico com atalhos.

Blockers:
- Nomes de cliente/local/equipamento ausentes de `MobileInspectionDetailResponse` → não exibíveis (F7).
- `GET /mobile/inspections` sem filtros: técnico vê todas as inspeções incluindo CANCELED/APPROVED.

---

### FE-M03 — Lista de inspeções

| Campo | Valor |
|---|---|
| Status | **PARCIAL** |
| Rota | `/(protected)/(tabs)/inspections` |
| Backend | `GET /mobile/inspections` |

Implementado: listagem com filtros de status por chip em painel lateral (Modal desde `cdb7c5b`).

Blockers: mesmos de FE-M02 (nomes ausentes, sem paginação de filtros no backend).

---

### FE-M04 — Sincronização

| Campo | Valor |
|---|---|
| Status | **PARCIAL** — itens frontend-only completos; 3 itens blocked por backend |
| Rota | `/(protected)/(tabs)/sync` |
| Backend | `POST /mobile/sync/push` (via `syncPendingIfOnline`) |

Implementado (2026-10-13/14): contagem da fila pendente, botão de sync manual, resultado da última sincronização (synced/failed), data/hora da última sync (`getSyncMetadata('last_successful_sync')`), indicador Online/Offline, contagem de entradas com erro (FAILED/CONFLICT), navegação para FE-M14 ("Ver detalhes"). Aba "Sync" no `_layout.tsx`, ícone `sync` no `Icon.tsx`.

Testes: 11/11 em `__tests__/sync-screen.test.tsx` (GREEN — regressão completa 373/373).

Blockers (backend-dependentes):
- **Status por evidência pendente** — EVIDENCE não está no outbox; depende de SYNC-OUTBOX-EVIDENCE.
- **Ação "Baixar alterações" (pull)** — depende de SYNC-PULL (backend).
- **"Tentar novamente" por operação específica** — depende de SYNC-PULL (backend).

---

### FE-M05 — Perfil

| Campo | Valor |
|---|---|
| Status | **PARCIAL** |
| Rota | `/(protected)/(tabs)/profile` |
| Backend | `POST /auth/logout`, `GET /auth/me` |

Implementado: dados da sessão e logout.

Blockers:
- `countPendingEntries()` não exibida — técnico pode fazer logout com entradas pendentes no outbox sem aviso.

---

### FE-M06 — Detalhes da inspeção

| Campo | Valor |
|---|---|
| Status | **PARCIAL** |
| Rota | `/(protected)/inspections/[inspectionId]/index` |
| Backend | `GET /mobile/inspections/{id}` |

Implementado: visão geral da inspeção.

Blockers:
- **Nomes ausentes (F7)**: `clientName`, `siteName`, `equipmentName` não fazem parte de `MobileInspectionDetailResponse`.
- `GET /clients/{id}`, `GET /sites/{id}`, `GET /equipment/{id}` retornam 403 para TECHNICIAN — não é possível buscar nomes por rota alternativa.

---

### FE-M07 — Iniciar inspeção

| Campo | Valor |
|---|---|
| Status | **PARCIAL** |
| Rota | `/(protected)/inspections/[inspectionId]/start` |
| Backend | `POST /inspections/{id}/start` |

Implementado: confirmação de início com captura de localização.

Blockers:
- Transição `IN_PROGRESS` vai direto para a API sem fallback no outbox — se offline, a ação falha sem enfileiramento.

---

### FE-M08 — Checklist

| Campo | Valor |
|---|---|
| Status | **PARCIAL** |
| Rota | `/(protected)/inspections/[inspectionId]/checklist` |
| Backend | `POST /mobile/sync/push` (via outbox), `GET /mobile/inspections/{id}` |

Implementado: respostas salvas no outbox SQLite (`INSPECTION_RESPONSE`), sincronizadas via `syncPendingIfOnline()` em background.

Blockers:
- ~~**`POST /mobile/sync/push` ausente do mock (F11)**~~ — **RESOLVIDO 2026-10-13**.
- **`valueChoice` não volta no detalhe (F8)**: `MobileInspectionDetailResponse` não inclui `valueChoice` — respostas de `SINGLE_CHOICE` não renderizadas no detalhe.
- **Flags RN-038/039 ausentes do DTO mobile (F9)**: `observationRequiredOnFailure` e `evidenceRequiredOnFailure` não chegam nos snapshots mobile — a UI não sabe quando exigir observação/evidência obrigatória em não conformidade.
- **BASEVERSION-STALENESS corrigido** (2026-10-01): `versionsRef` agora incrementa atômicamente após cada `upsertOutboxEntry` bem-sucedido. Corrigido mas não commitado.

---

### FE-M09 — Resumo e conclusão

| Campo | Valor |
|---|---|
| Status | **PARCIAL** |
| Rota | `/(protected)/inspections/[inspectionId]/summary` |
| Backend | `POST /inspections/{id}/submit`, `GET /mobile/inspections/{id}` |

Implementado: sync-on-mount antes de avaliar conclusão; submit com `isOnline()` + drena outbox antes de POST.

Blockers:
- Submit vai direto para a API (sem outbox) — se offline, a ação falha sem fallback.
- Avaliação de completude depende do estado do servidor após sync; se sync falhou, resumo pode estar incorreto.

---

### FE-M10 — Não conformidades (inspeção)

| Campo | Valor |
|---|---|
| Status | **PARCIAL** |
| Rota | `/(protected)/inspections/[inspectionId]/non-conformities` |
| Backend | `POST /inspections/{id}/non-conformities`, `GET /inspections/{id}/non-conformities`, `PUT /non-conformities/{id}` |

Implementado: listagem e criação de NCs.

Blockers:
- ~~**Vínculo com item se perde (F10)**~~ — **RESOLVIDO 2026-10-14**: mobile agora envia `snapshotId: context.responseId` em `NonConformityCreateRequest`. Fix em `shared/src/domain/requests.ts`, `use-non-conformities.ts` e `mock-server.ts`. Teste `F10` em `__tests__/summary-nc-screens.test.tsx`.
- NC cria/altera direto na API sem fallback offline.
- 409 em inspeção APPROVED (NC-APPROVED-LOCK) não tratado na UI.

---

### FE-M11 — Scanner QR

| Campo | Valor |
|---|---|
| Status | **PARCIAL** |
| Rota | `/(protected)/scanner` |
| Backend | `GET /equipment/by-qr/{qrCode}` |

Implementado: leitura de QR e lookup de equipamento.

Sem blockers funcionais críticos (PEND-04 implementado no backend). Em modo mock, `mock-server.ts` cobre esse endpoint.

---

### FE-M12 — Captura de evidência

| Campo | Valor |
|---|---|
| Status | **PARCIAL** |
| Rota | `/(protected)/evidence/capture` |
| Backend | `POST /inspections/{id}/evidence` (via prévia FE-M13) |

Implementado: captura de foto com câmera.

Blockers: upload vai direto para a API sem fallback offline. RN-078 proíbe evidência pelo sync — limitação por design, não bug.

---

### FE-M13 — Prévia de evidência

| Campo | Valor |
|---|---|
| Status | **PARCIAL** |
| Rota | `/(protected)/evidence/preview` |
| Backend | `POST /inspections/{id}/evidence` |

Implementado: confirmação/rejeição de foto, upload via multipart.

Blockers: idem FE-M12 (offline não suportado por design).

---

### FE-M14 — Detalhes de sincronização

| Campo | Valor |
|---|---|
| Status | **COMPLETA** — implementado 2026-10-14 |
| Rota | `/(protected)/sync/details` |
| Backend | — (somente leitura sobre dados locais SQLite) |

Implementado: tela somente leitura exibindo entradas do outbox com `status` não-COMPLETED (`operationId`, `entityType`, `status`, `lastError`). Acessível via botão "Ver detalhes" em FE-M04.

Testes: 7/7 em `__tests__/sync-details-screen.test.tsx` (GREEN); navegação FE-M04→FE-M14 coberta pelo teste em `__tests__/sync-screen.test.tsx`. Regressão completa 373/373.

---

## Mapa de serviços e integrações

| Arquivo | Backend consumido | Status |
|---|---|---|
| `services/auth-service.ts` | `/auth/login`, `/auth/refresh`, `/auth/logout`, `/auth/me` | INTEGRADO |
| `services/sync-service.ts` | `POST /mobile/sync/push` | INTEGRADO (mock incompleto) |
| `services/local-db.ts` | — (SQLite local) | LOCAL — só `INSPECTION_RESPONSE` |
| `services/mock/mock-server.ts` | Todos os endpoints exceto DELETE | MOCK COMPLETO (sync/push adicionado 2026-10-13) |
| `features/checklist/use-checklist.ts` | Outbox → sync | INTEGRADO (via outbox) |
| `features/sync/use-sync.ts` | `syncPendingIfOnline()`, `addNetworkStateListener` | INTEGRADO (FE-M04 exibe status; reconexão automática implementada) |

---

## Divergências de contrato abertas (mobile × backend)

| ID | Descrição | Impacto |
|---|---|---|
| ~~F6~~ | ~~`toAuthFailureCode()` não mapeia `UNAUTHORIZED`~~ | **RESOLVIDO 2026-10-13** (MOBILE-AUTH-CODE) |
| F7 | `clientName`/`siteName`/`equipmentName` ausentes do DTO mobile | Nomes não exibíveis no detalhe |
| F8 | `valueChoice` ausente de `MobileInspectionDetailResponse` | Respostas SINGLE_CHOICE não renderizadas |
| F9 | Flags RN-038/039 ausentes dos snapshots mobile | UI não valida observação/evidência obrigatória |
| ~~F10~~ | ~~Mobile envia `inspectionItemId`; backend espera `snapshotId` em NC~~ | **RESOLVIDO 2026-10-14** |
| ~~F11~~ | ~~`POST /mobile/sync/push` não está no mock~~ | **RESOLVIDO 2026-10-13** |

---

## Itens de infra / outbox

| Item | Status |
|---|---|
| Outbox SQLite (`INSPECTION_RESPONSE`) | IMPLEMENTADO (BF-007, 2026-09-28) |
| Sync resilience por entrada | IMPLEMENTADO (SYNC-RESILIENCE, 2026-10-01, não commitado) |
| BASEVERSION-STALENESS fix | IMPLEMENTADO (2026-10-01, não commitado) |
| `status` e `last_error` no outbox | IMPLEMENTADO — SYNC-OUTBOX-SCHEMA 2026-10-14 |
| `markEntryFailed` (substitui `incrementErrorCount`) | IMPLEMENTADO — 2026-10-14 |
| Outbox para transições de inspeção (`INSPECTION`) | NÃO IMPLEMENTADO |
| Outbox para não conformidades (`NON_CONFORMITY`) | NÃO IMPLEMENTADO |
| Pull incremental (`GET /mobile/sync/pull`) | NÃO IMPLEMENTADO no mobile |
| FE-M04 (tela de sync) | COMPLETO — 2026-10-13 |
| FE-M14 (detalhes de sync) | COMPLETO — 2026-10-14 |
| `countPendingEntries()` exibida na UI | IMPLEMENTADO — FE-M04 2026-10-13 |
| `bulkIncrementErrorCount()` | N/A — substituído por `markEntryFailed` (2026-10-14) |

---

---

## Análise de gaps da arquitetura offline-first (2026-10-13)

A spec (`contrato-backend-frontend.md` §11, `aplicativo-mobile.md` §13.8) exige que **toda** alteração do técnico seja salva no SQLite primeiro. A implementação atual cobre apenas `INSPECTION_RESPONSE`. Gaps identificados:

| ID | Problema | Scope | Status |
|---|---|---|---|
| ~~SYNC-RECONNECT~~ | ~~`useSyncOnForeground` não detecta reconexão de rede — só detecta app foreground~~ | Frontend | **DONE** 2026-10-13 |
| ~~SYNC-METADATA~~ | ~~Tabela `SyncMetadata` ausente — sem `last_successful_sync`, `last_pull_cursor`~~ | Frontend | **DONE** 2026-10-14 |
| ~~SYNC-OUTBOX-SCHEMA~~ | ~~Outbox sem `status`, `last_error` — FE-M04 não lista erros por operação~~ | Frontend | **DONE** 2026-10-14 |
| SYNC-FE-M04-FULL | FE-M04 com 6/9 itens da spec implementados; 3 itens blocked por backend | Frontend+Backend | **PARTIAL** (2026-10-14) |
| SYNC-OUTBOX-INSPECTION | `start.tsx` / `summary.tsx` chamam API diretamente — START/SUBMIT falham offline | Backend+Frontend | **PENDING** |
| SYNC-OUTBOX-NC | `useNonConformities` chama API diretamente — NCs falham offline | Backend+Frontend | **PENDING** |
| SYNC-OUTBOX-EVIDENCE | Uploads de evidência vão direto para multipart API — falham offline | Backend+Frontend | **PENDING** |
| SYNC-PULL | `GET /mobile/sync/pull` não implementado — técnico não recebe mudanças do servidor | Backend+Frontend | **PENDING** |

Ver detalhamento completo em `pending-features.md` seção `OFFLINE-FIRST-REPLAN`.

---

## Próximos passos recomendados

1. ~~**F6 — mapear `UNAUTHORIZED`** em `toAuthFailureCode()`~~ — **RESOLVIDO 2026-10-13**
2. ~~**F11 — adicionar mock de `POST /mobile/sync/push`**~~ — **RESOLVIDO 2026-10-13**
3. ~~**FE-M04 — tela de sincronização básica**~~ — **RESOLVIDO 2026-10-13**
4. ~~**SYNC-RECONNECT**~~ — **RESOLVIDO 2026-10-13**
5. ~~**SYNC-METADATA**~~ — **RESOLVIDO 2026-10-14**
6. ~~**SYNC-OUTBOX-SCHEMA**~~ — **RESOLVIDO 2026-10-14**: `status` e `last_error` adicionados; `markEntryFailed` substitui `incrementErrorCount`; mocks atualizados; 356/356 GREEN
7. **SYNC-FE-M04-FULL** — completar FE-M04 com todos os campos da spec
8. **SYNC-OUTBOX-INSPECTION** — START/SUBMIT via outbox (requer backend)
9. **F7 — nomes no DTO mobile**: adicionar `clientName`/`siteName`/`equipmentName` ao `MobileInspectionDetailResponse` no backend
10. **F8/F9 — campos no DTO mobile**: adicionar `valueChoice` e flags RN-038/039
11. ~~**F10 — NC com vínculo de item**~~ — **RESOLVIDO 2026-10-14**
12. ~~**FE-M14 — detalhes de sincronização**~~ — **RESOLVIDO 2026-10-14**
