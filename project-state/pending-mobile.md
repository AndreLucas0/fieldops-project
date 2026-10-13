# Mobile — Inventário de Telas e Status de Integração

**Data:** 2026-10-13
**Branch analisada:** `main` (HEAD após BASEVERSION-STALENESS/SYNC-RESILIENCE, não commitados)
**Tipo:** inventário somente leitura — nenhum código alterado durante a análise
**Fonte primária:** `docs/telas-frontend.md` §2, `docs/auditoria-frontend-backend.md`, `mobile/src/`

---

## Legenda de Status

- `COMPLETA` — tela implementada e integrada (sem blockers conhecidos)
- `PARCIAL` — tela existe mas há divergências de contrato, campos ausentes ou fluxo incompleto
- `AUSENTE` — nenhum componente encontrado para essa tela

---

## Resumo executivo (2026-10-13)

| Status | Contagem | % |
|---|---:|---:|
| COMPLETA | 1 | 7% |
| PARCIAL | 11 | 79% |
| AUSENTE | 2 | 14% |

Raízes dos problemas transversais:

1. **`UNAUTHORIZED` não mapeado em `toAuthFailureCode()`** — senha errada retorna `UNEXPECTED`, mostrando "Não foi possível entrar agora." em vez de "E-mail ou senha incorretos." (mobile não recebeu a correção do INT-011, que foi só web).
2. **Nomes de entidade indisponíveis ao técnico** — `GET /clients/{id}`, `GET /sites/{id}` e `GET /equipment/{id}` retornam 403 para TECHNICIAN (AUTHZ-BOUNDARY). `MobileInspectionDetailResponse` não inclui `clientName`/`siteName`/`equipmentName`.
3. **`POST /mobile/sync/push` ausente do mock** — em modo mock (`EXPO_PUBLIC_API_MOCK=true`, padrão), o outbox SQLite nunca é drenado: entradas ficam com `synced=0` permanentemente.
4. **Outbox cobre apenas `INSPECTION_RESPONSE`** — `local-db.ts` só suporta esse `entity_type`. Transições de inspeção e não conformidades vão direto para a API sem fallback offline.
5. **`countPendingEntries()` sem UI** — função existe em `local-db.ts` mas nenhum componente a consome; usuário não vê o tamanho da fila.

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
- **`UNAUTHORIZED` não mapeado (F6)**: `toAuthFailureCode()` em `session-context.tsx` não trata `UNAUTHORIZED` → cai no `default: return 'UNEXPECTED'`. Senha errada mostra mensagem genérica. Confirmado por leitura de código (`mobile/src/features/auth/session-context.tsx`).

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
| Status | **AUSENTE** |
| Rota documentada | `/(protected)/(tabs)/sync` |

Nenhum arquivo ou componente correspondente encontrado. A aba de sincronização não existe.

Impacto: o técnico não tem feedback do tamanho da fila offline nem pode acionar sync manualmente. A sync automática via `useSyncOnForeground()` acontece, mas de forma invisível.

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
- **`POST /mobile/sync/push` ausente do mock (F11)**: em modo mock, entradas do outbox nunca são drenadas.
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
- **Vínculo com item se perde (F10)**: mobile envia `inspectionItemId`; backend espera `snapshotId` em `NonConformityCreateRequest`. Campo ignorado pelo Jackson → NC sem vínculo.
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
| Status | **AUSENTE** |
| Rota documentada | `/(protected)/sync/details` |

Nenhum arquivo ou componente correspondente encontrado.

Impacto: técnico sem acesso a diagnóstico de fila (entradas pendentes, `error_count`, histórico de operações). `countPendingEntries()` em `local-db.ts` existe mas sem consumidor.

---

## Mapa de serviços e integrações

| Arquivo | Backend consumido | Status |
|---|---|---|
| `services/auth-service.ts` | `/auth/login`, `/auth/refresh`, `/auth/logout`, `/auth/me` | INTEGRADO |
| `services/sync-service.ts` | `POST /mobile/sync/push` | INTEGRADO (mock incompleto) |
| `services/local-db.ts` | — (SQLite local) | LOCAL — só `INSPECTION_RESPONSE` |
| `services/mock/mock-server.ts` | Todos os endpoints exceto `/mobile/sync/*` e DELETE | MOCK INCOMPLETO |
| `features/checklist/use-checklist.ts` | Outbox → sync | INTEGRADO (via outbox) |
| `features/sync/use-sync.ts` | `syncPendingIfOnline()` | INTEGRADO (sem UI de status) |

---

## Divergências de contrato abertas (mobile × backend)

| ID | Descrição | Impacto |
|---|---|---|
| F6 | `toAuthFailureCode()` não mapeia `UNAUTHORIZED` | Senha errada mostra mensagem genérica |
| F7 | `clientName`/`siteName`/`equipmentName` ausentes do DTO mobile | Nomes não exibíveis no detalhe |
| F8 | `valueChoice` ausente de `MobileInspectionDetailResponse` | Respostas SINGLE_CHOICE não renderizadas |
| F9 | Flags RN-038/039 ausentes dos snapshots mobile | UI não valida observação/evidência obrigatória |
| F10 | Mobile envia `inspectionItemId`; backend espera `snapshotId` em NC | Vínculo NC-item perdido |
| F11 | `POST /mobile/sync/push` não está no mock | Outbox não drena em modo mock |

---

## Itens de infra / outbox

| Item | Status |
|---|---|
| Outbox SQLite (`INSPECTION_RESPONSE`) | IMPLEMENTADO (BF-007, 2026-09-28) |
| Sync resilience por entrada | IMPLEMENTADO (SYNC-RESILIENCE, 2026-10-01, não commitado) |
| BASEVERSION-STALENESS fix | IMPLEMENTADO (2026-10-01, não commitado) |
| Outbox para transições de inspeção (`INSPECTION`) | NÃO IMPLEMENTADO |
| Outbox para não conformidades (`NON_CONFORMITY`) | NÃO IMPLEMENTADO |
| Pull incremental (`GET /mobile/sync/pull`) | NÃO IMPLEMENTADO no mobile |
| FE-M04 (tela de sync) | AUSENTE |
| FE-M14 (detalhes de sync) | AUSENTE |
| `countPendingEntries()` exibida na UI | NÃO IMPLEMENTADO (função existe, sem consumidor) |
| `bulkIncrementErrorCount()` | NÃO IMPLEMENTADO (sequential N updates, deferred) |

---

## Próximos passos recomendados

1. **F6 — mapear `UNAUTHORIZED`** em `toAuthFailureCode()`: uma linha, alto impacto no login com senha errada.
2. **F11 — adicionar mock de `POST /mobile/sync/push`** em `mock-server.ts`: baixo esforço, desbloqueia testes em modo mock.
3. **FE-M04 — tela de sincronização**: exibir fila pendente (consumir `countPendingEntries()`), botão de sync manual.
4. **F7 — nomes no DTO mobile**: adicionar `clientName`/`siteName`/`equipmentName` ao `MobileInspectionDetailResponse` no backend.
5. **F8/F9 — campos no DTO mobile**: adicionar `valueChoice` e flags RN-038/039.
6. **F10 — NC com vínculo de item**: corrigir campo `snapshotId` vs. `inspectionItemId`.
7. **FE-M14 — detalhes de sincronização**: tela de diagnóstico com log de operações.
