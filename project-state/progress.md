# FieldOps — Current Progress

Last updated: 2026-10-21 (SYNC-EVIDENCE-LINK — achados 2, 3 e 5 do offline-first resolvidos)

## Current State

Backend audit (2026-09-22): superseded — ver re-auditoria 2026-10-13 em `project-state/backend-audit.md`.
Frontend ↔ Backend contract + screen audit completed (2026-10-02, see `docs/auditoria-frontend-backend.md`).
Auditoria completa do código 2026-10-13 concluída; inventários de telas criados em `project-state/pending-web.md` e `project-state/pending-mobile.md`.
Integração incremental Frontend ↔ Backend com TDD em andamento.

### SYNC-EVIDENCE-LINK-2026-10-21 — vínculo da evidência, recusas definitivas e ordem da conclusão

Data: 2026-10-21. Branch: `task/sync-evidence-response-link` (a partir de `task/sync-outbox-nc`). Tipo: bugfix (TDD).
Pedido: "continue a implementação da feature de offline first". Decisões do dono: vínculo resolvido no mobile;
recusa definitiva vira REJECTED com descarte manual (ver `decisions.md` 2026-10-21).

**Implementado (só mobile, API inalterada):**
- Achado 2: `queueEvidence` guarda `inspectionItemId` e ignora `responseId` `local-…`; `syncEvidenceEntries` resolve
  o id da resposta via `GET /mobile/inspections/{id}` depois do push e espera resposta/NC ainda no outbox.
  `preview.tsx` passa `inspectionItemId`.
- Achado 3: `useEvidences` expõe as fotos do outbox (`pending`); o resumo usa `withPendingEvidences`
  (`pending-overlay.ts`) na avaliação de conclusão.
- Achado 5: status `REJECTED` (`local-db.ts`); push REJECTED e upload 4xx definitivo param de ser reenviados; aba
  Sincronização lista cada recusa com motivo e "Descartar" (`discardOutboxEntry`, apaga a foto).
- Encontrado na tarefa: o backend exige a evidência para concluir; `syncPending` agora envia conclusões (SUBMITTED)
  depois do upload das fotos, e segura a conclusão se ainda houver foto da inspeção no aparelho.
- `settleQueuedOperation` lê a entrada por id (`getOutboxEntry`) para enxergar REJECTED.

**Testes:** `__tests__/sync-evidence-link.test.ts` novo (21 casos) + 1 em `summary-nc-screens` + 1 em `sync-screen`,
todos vistos falhando antes da implementação. 4 testes existentes ajustados porque descreviam o comportamento
antigo que o dono mandou mudar (REJECTED → FAILED/continuava na fila). `npx jest`: **434/434, 36 suítes**.
`npm run typecheck` e `npm run lint`: só os erros pré-existentes (MOBILE-PREEXISTING-CHECKS); o erro de lint de
`sync.tsx` mudou de linha (40 → 52) por causa dos imports novos, mesma causa.

**Não executado:** teste ponta a ponta no aparelho com backend real (offline → reconectar → foto vinculada →
conclusão aceita). Backend não alterado, então `./mvnw verify` não foi rodado.

**Não implementado (fora do escopo):** UI de resolução de CONFLICT; achado 1 (textos desatualizados em
`CLAUDE.md`/`ESTADO-DO-PROJETO.md`), achados 4 e 6.

### CORS-ANY-ORIGIN-LOCAL-2026-10-20 — perfil local aceita qualquer origem

Data: 2026-10-20. Branch: `task/technician-read-place-data`. Pedido: "libere o CORS para qualquer ip".

**Implementado:** `application-local.yml` com `allowed-origins: ${CORS_ALLOWED_ORIGINS:*}`;
`SecurityConfig` passa a `setAllowedOriginPatterns`. Lista restrita de `application.yml` segue fora do perfil local.

**Testes:** `CorsConfigurationIT` reescrito (4; novo caso de IP da rede — RED 403 → GREEN) e
`RestrictedCorsConfigurationIT` novo (2, lista explícita). `./mvnw verify`: **50 unit + 304 IT, BUILD SUCCESS**.
Não executado: teste pelo navegador (requer reiniciar o backend do usuário).

### OFFLINE-FIRST-REST-2026-10-20 — iniciar/concluir, NC e leitura offline (interrompido para documentação)

Data: 2026-10-20. Tipo: feature (TDD). Interrompido a pedido do dono: "documente as inconsistências encontradas apenas, não implemente mais nada".

**Commitado:**
- `e9fa3b7` (`task/sync-outbox-inspection`) — SYNC-OUTBOX-INSPECTION: iniciar/concluir via outbox + `settleQueuedOperation`; jest 386/386.
- `711f32d` (`task/sync-outbox-nc`) — SYNC-OUTBOX-NC: criar/editar NC via outbox com id do aparelho; jest 388/388.

**Implementado e NÃO commitado** (working tree de `task/sync-outbox-nc`): cache de leitura (`read_cache`, `cachedGet`),
sobreposição das pendências em lista/detalhe, aviso de pendência no detalhe, SYNC-PULL na sincronização geral.
`npx jest` 412/412 (35 suítes) no momento da interrupção.

**Inconsistências encontradas (só documentadas):** `pending-features.md` → OFFLINE-FIRST-FINDINGS-2026-10-20
(pendências "requer backend" desatualizadas; vínculo evidência↔resposta não sincronizada; evidência pendente fora do
resumo; 409 em idempotencyKey repetida; recusas retentadas para sempre; mock de sync parcial; código não commitado).

**Não executado:** teste em aparelho; regressão do backend (sem mudança no backend).

### SYNC-OUTBOX-EVIDENCE-2026-10-20 — evidência offline-first (outbox SQLite)

Data: 2026-10-20. Branch: `task/sync-outbox-evidence` (a partir de `task/fix-evidence-uri-expo-go`). Tipo: feature (TDD). Escopo escolhido pelo dono: só evidências.

**Implementado:** `evidence-outbox.ts` (`queueEvidence`, `syncEvidenceEntries`); `sync-service.ts` envia JSON e depois
evidências; `preview.tsx` grava local e tenta sincronizar; `evidence-upload.ts` importa `@/services/api-client` direto
(evita ciclo com o índice); mock de `expo-file-system` em `jest.setup.js`. Sem mudança no backend.

**Mudança de comportamento:** rejeição do servidor (ex.: inspeção aprovada) não aparece mais na prévia; a evidência
fica com status FAILED e aparece na aba Sincronização/detalhes. Teste "mostra a falha do servidor sem sair da tela"
substituído por "sem conexão, guarda no outbox e volta" e "falha ao guardar a foto mostra erro".

**Não implementado:** miniatura de evidência pendente no checklist (só aparece após sincronizar); descarte de
rejeições permanentes (4xx ≠ 409) — são retentadas a cada sync; INSPECTION/NC no outbox (fora do escopo).

**Testes:** `evidence-outbox.test.ts` (6, RED → GREEN, incl. 409 já processada); 3 testes de prévia novos/ajustados.
`npx jest`: **382/382, 32 suítes**. Lint dos tocados limpo; typecheck só com erros pré-existentes. Não executado: aparelho.

### EVIDENCE-URI-EXPO-GO-2026-10-20 — envio de evidência falhava em todo aparelho com Expo Go

Data: 2026-10-20. Branch: `task/fix-evidence-uri-expo-go` (a partir de `task/technician-read-place-data`). Tipo: correção (TDD).

**Sintoma:** no celular, confirmar a evidência (câmera ou galeria) dava "Sem conexão com o servidor" e
nenhuma requisição aparecia no tráfego; o resto do app funcionava contra a API.

**Causa:** a captura passava a URI do arquivo para a prévia como parâmetro de rota. O `useLocalSearchParams`
do expo-router 57 aplica `decodeURIComponent` a todo valor (`node_modules/expo-router/build/hooks/useLocalSearchParams.js:36`)
e no Expo Go o cache fica em `.../ExperienceData/%2540anonymous%252F...`; decodificada, a URI aponta para um
arquivo inexistente e o `fetch` multipart falha antes de enviar. No navegador a URI é `blob:` e não é afetada.

**Implementado:** `src/features/evidence/pending-capture.ts` (URI em memória; rota leva só `captureId`);
`capture.tsx` e `preview.tsx` passam a usá-lo. O mock de `expo-router` dos testes agora decodifica os parâmetros
como o real — sem isso o defeito era invisível nos testes.

**Testes:** 2 novos em `scanner-evidence-screens.test.tsx` (falham sem a correção, verificado com stash) + 5 ajustados.
`npx jest`: **375/375, 31 suítes**. Lint dos arquivos tocados: limpo. Typecheck/lint globais têm erros
pré-existentes em arquivos não tocados (MOBILE-PREEXISTING-CHECKS). Não executado: teste no aparelho.

### TECH-PLACE-READ-2026-10-20 — técnico lê cliente/local/equipamento da própria inspeção

Data: 2026-10-20. Branch: `task/technician-read-place-data` (a partir de `task/cors-config`). Tipo: permissão (TDD).

**Motivo:** mobile contra a API real recebia 403 ao buscar nomes de cliente, local e
equipamento no detalhe/lista de inspeções com perfil técnico.

**Implementado:** `GET /clients/{id}`, `/sites/{id}`, `/equipment/{id}` aceitam TECHNICIAN
com checagem de escopo (inspeção atribuída a ele, qualquer estado) nos services; 3 consultas
`exists` novas em `InspectionRepository`; `openapi.yaml` (descrição + 403) e
`contrato-backend-frontend.md` §3.4 atualizados. Decisão em `decisions.md`.

**Não implementado:** resumo embutido em `/mobile/inspections` (alternativa registrada);
nenhuma mudança no mobile.

**Testes:**
- `TechnicianPlaceReadScopeIT` — 6 testes; RED confirmado (2 falhas: 403 em vez de 200 no próprio escopo) → GREEN.
- `./mvnw verify` — **50 unit + 302 IT, 0 falhas, BUILD SUCCESS**.
- HTTP real (instância temporária na 8091, banco com seed): `tecnico` e `tecnico2` → 200 em
  cliente/local/equipamento das próprias inspeções; `tecnico2` lendo cliente só do `tecnico` → 403.
- Não executado: fluxo no app (requer reiniciar o backend do usuário nesta branch).

### CORS-CONFIG-2026-10-20 — CORS restrito a origens autorizadas

Data: 2026-10-20. Branch: `task/cors-config`. Tipo: configuração de segurança (TDD).

**Motivo:** o preview web do mobile (`localhost:8081`) recebia erro de CORS contra a API real.

**Implementado:** `CorsProperties` + `.cors()` em `SecurityConfig`, origens de
`CORS_ALLOWED_ORIGINS` (padrão dev `http://localhost:4200,http://localhost:8081`),
sem credenciais, cabeçalhos `Authorization`/`Content-Type`/`Accept`. `.env.example` atualizado.

**Não implementado:** valor de produção de `CORS_ALLOWED_ORIGINS` (depende do deploy);
nenhuma mudança no mobile ou no web.

**Testes:**
- `CorsConfigurationIT` — 4 testes, RED confirmado (4 falhas pelo motivo esperado) → GREEN.
- `./mvnw verify` — **50 unit + 296 IT (292 + 4 novos), 0 falhas, BUILD SUCCESS**.
- Não executado: verificação HTTP real pelo navegador com o preview web do mobile
  (requer reiniciar o backend em execução do usuário).

### SEED-STALE-FIX-2026-10-20 — seed.sql alinhado ao schema V14 + integração validada ponta a ponta

Data: 2026-10-20. Branch: `main`. Tipo: correção de dados de carga + validação de integração.

**Problema:** `db/seed.sql` falhava no schema atual. Como roda em transação única,
o rollback era total e **nenhum usuário era criado** — impedia qualquer teste manual
do zero. O item estava registrado como SEED-STALE (PENDING) citando uma única coluna;
a execução real revelou **cinco** descompassos:

| Seed usava | Schema real | Migração |
|---|---|---|
| `inspection_responses.inspection_item_id` | `snapshot_id` | V9 |
| `inspection_responses.answered_by` | `responded_by` | V9 |
| `inspection_responses.value_json` (jsonb) | `value_choice` (varchar 200) | V12 |
| `non_conformities.created_by` | `reported_by` | V9 |
| `evidence` sem `idempotency_key` | coluna NOT NULL | V10 |

Os literais de `SINGLE_CHOICE` também mudaram de forma: `'{"selected": "PQS"}'::jsonb`
passou a `'PQS'` em `value_choice`, coerente com o mapeamento que o mobile já fazia
(`sync-service.ts`, SINGLE_CHOICE → `valueChoice`).

**Cuidado registrado:** a troca de `NULL::jsonb` por `NULL::varchar` foi inicialmente
global e quebrou `template_items.options_json`, que é legitimamente jsonb. Revertida
nas 3 linhas de `options_json`. Um `grep` global por tipo é perigoso neste arquivo.

**Validação — integração real, sem mock:**

1. `docker compose up -d db evidence-storage` → ambos healthy (Postgres 16.14, s3mock).
2. Backend `./mvnw spring-boot:run` com perfil `local` → Flyway aplicou **V1–V14**,
   Tomcat na 8090, startup em 7,4 s.
3. `db/seed.sql` → **COMMIT**, 15 tabelas populadas (5 usuários, 7 inspeções,
   48 snapshots, 20 respostas, 3 evidências, 1 NC, 2 revisões, 26 eventos de auditoria).
4. `POST /auth/login` (admin@fieldops.local) → **200**, JWT de 261 chars, `expiresIn` 900.
5. `GET /clients` → **200**, envelope `{page,size,totalElements,totalPages,content}`.
6. `POST /clients` → **201**; `GET /clients/{id}` → **200**; linha confirmada no
   Postgres por `psql`. Registro de teste removido depois (`delete from clients`).
7. Web `npm run start:api` → proxy `/api/v1` → backend. Login pelo navegador,
   dashboard carregou com **4 requisições HTTP 200**. Números batem com o seed:
   7 inspeções (1 por estado), 1 NC de severidade Alta. Console sem erros,
   sem CORS, sem 401. Sessão sobreviveu ao reload (refresh token em `sessionStorage`).

**Confirmação empírica de WEB-NESTED-PAGE:** `GET /clients/{id}/sites` devolveu
`{page,size,totalElements,totalPages,content}` com `Array.isArray === false` —
comprova contra a API real a correção feita antes apenas contra o código do controller.

8. `./mvnw verify` completo com Docker disponível → **BUILD SUCCESS, 292 testes
   de integração, 0 falhas** (antes inexecutável nesta máquina).

**Não implementado:** CORS (CORS-CONFIG segue PENDING — o proxy do `ng serve` cobre
desenvolvimento, mas não produção). `db/schema.sql` continua na raiz, embora o próprio
arquivo diga que deveria sair quando o Flyway existisse.

**Receita de execução do backend validada** e já documentada no `README.MD` nesta
mesma sessão: o Spring não lê `.env`; o perfil `local` exige `DB_URL`, `DB_USER` e
`DB_PASSWORD` no ambiente do processo.

---

### WEB-NESTED-PAGE-2026-10-20 — Endpoints aninhados devolviam Page, web esperava array

Data: 2026-10-20. Branch: `main`. Tipo: correção de contrato Frontend ↔ Backend.

**Problema (raiz #5 de `pending-web.md`):** três métodos de `core/services/resources.ts`
declaravam `Observable<X[]>` e iteravam a resposta direto, mas o backend devolve
`PageResponse`. Com `mockApi: false` a iteração quebra.

| Método | Backend | Evidência |
|---|---|---|
| `SitesService.listByClient` | `PageResponse<SiteResponse>` | `ClientController.java:94` |
| `EquipmentService.listBySite` | `PageResponse<EquipmentResponse>` | `SiteController.java:95` |
| `TemplatesService.listVersions` | `PageResponse<...>` | `TemplateController.java:157` |

**Agravante:** `mock-services.ts` devolvia array e `mock-services.spec.ts` afirmava
`toHaveLength()` sobre ele — o mock validava o contrato errado e escondia a divergência.
Esse era o caso de "mock mascarando integração real".

**Correção:** assinaturas passaram a `Observable<Page<X>>` com `query?: PageQuery`
opcional, usando `api.getPage`. Optou-se por expor o envelope em vez de desembrulhar
com `.content`: desembrulhar descartaria silenciosamente itens além da primeira página
(size padrão 20). O mock passou a usar o helper `page()`, espelhando o envelope real.

**Arquivos:**
- `web/src/app/core/services/resources.ts` — 3 assinaturas abstratas + 3 implementações HTTP
- `web/src/app/core/mocks/mock-services.ts` — 3 implementações fictícias via `page()`
- `web/src/app/core/services/resources.spec.ts` — +3 testes de contrato (HttpTestingController)
- `web/src/app/core/mocks/mock-services.spec.ts` — asserções ajustadas ao envelope

**Validação:** RED confirmado antes da correção (TS2339 `Property 'content' does not
exist on type 'InspectionSite[]'`). GREEN: `ng test` 208/208 em 18 suítes;
`ng build --configuration development` limpo. Backend `./mvnw test` 50/50 BUILD SUCCESS.

**Não implementado:** nenhum componente consome esses métodos ainda (serviços órfãos —
FE-W07 e FE-W10 ausentes). A correção previne o bug na primeira tela que os usar.

---

### OFFLINE-FIRST-REPLAN-2026-10-13 — Replanejamento da arquitetura de sync

Data: 2026-10-13. Tipo: análise e planejamento — nenhum código alterado.

**Problema identificado:** a implementação da feature de sincronização offline-first cobre apenas `INSPECTION_RESPONSE`. O ciclo automático de reconexão, outros entity types (INSPECTION, NON_CONFORMITY, EVIDENCE) e a fase de pull estão ausentes. A tela FE-M04 foi criada (ciclo anterior) mas expõe apenas uma parte do estado real.

**Fonte:** comparação entre código atual e `contrato-backend-frontend.md` §11, `telas-frontend.md` §FE-M04/§7.6, `aplicativo-mobile.md` §13.8.

**Gaps documentados em `pending-features.md` (seção OFFLINE-FIRST-REPLAN):**
1. `SYNC-RECONNECT` — `useSyncOnForeground` não detecta reconexão de rede; usa só AppState
2. `SYNC-METADATA` — tabela `SyncMetadata` ausente do SQLite (`last_successful_sync`, cursor)
3. `SYNC-OUTBOX-SCHEMA` — outbox sem `status`, `last_error`, `dependency_ids`
4. `SYNC-FE-M04-FULL` — FE-M04 incompleto: sem última sync, indicador online/offline, erros/item, pull
5. `SYNC-OUTBOX-INSPECTION` — START/SUBMIT chamam API diretamente (falham offline)
6. `SYNC-OUTBOX-NC` — NCs chamam API diretamente (falham offline)
7. `SYNC-OUTBOX-EVIDENCE` — uploads chamam API diretamente (falham offline)
8. `SYNC-PULL` — `GET /mobile/sync/pull` não implementado

**Ordem recomendada:** SYNC-RECONNECT → SYNC-METADATA → SYNC-OUTBOX-SCHEMA → SYNC-FE-M04-FULL → (backend) SYNC-OUTBOX-INSPECTION → SYNC-OUTBOX-NC → SYNC-OUTBOX-EVIDENCE → SYNC-PULL.

**Não implementado:** nenhuma alteração de código nesta etapa.

---

### TDD-SYNC-RECONNECT-2026-10-13 — Auto-sync na reconexão de rede

Data: 2026-10-13. Ciclo TDD: RED → GREEN. 336/338 testes passando (+7 em relação ao ciclo anterior; 2 timeouts intermitentes pré-existentes não relacionados).

**Implementado:**
- `mobile/src/features/sync/use-sync.ts`: adicionado `addNetworkStateListener` (expo-network) para detectar transição `isInternetReachable: false → true` e disparar `syncPendingIfOnline`. Aceita `_addNetworkListener` como parâmetro opcional (dependency injection, default = real listener).
- `mobile/__tests__/use-sync.test.ts` criado: 7 testes TDD — mount dispara sync, listener registrado, offline→online dispara sync, null→true não dispara, offline não dispara, online→online não dispara, unmount remove listener.
- `mobile/jest.setup.js`: mock de `expo-network` atualizado com `addNetworkStateListener: jest.fn()` e reset `mockReturnValue({ remove: jest.fn() })` no `beforeEach`.

**Insight técnico crítico:** jest-expo com caller Metro cria namespaces desacoplados — mocking via `jest.mock` não afeta o namespace do arquivo sob teste. Solução: dependency injection. Também: `renderHook` do TRTL v14 é async — usar `await renderHook(...)`.

---

### TDD-WEB-MOCK-AUTH-2026-10-14 — Sessão automática em modo fictício

Data: 2026-10-14. Ciclo TDD: RED → GREEN. 205/205 testes passando (+2 novos; nenhuma regressão).

**Problema:** `provideCore()` não incluía `provideMockSession()` → em `npm start` (mock mode) o login fazia HTTP para `/auth/login` que não existe no mock DI Angular.

**Implementado (3 arquivos):**
- `core.providers.ts`: `provideCore(useMock = environment.mockApi)` — parâmetro adicionado, passa para `provideResources(useMock)`, inclui `provideMockSession()` quando mock ativo.
- `mock-session.ts`: removida guarda `if (!environment.mockApi) return` e import de `environment`; controle delegado ao `provideCore()`. Comentário atualizado.
- `mock-session.spec.ts`: novo arquivo — 2 testes verificando sessão SUPERVISOR injetada com `provideCore(true)` e ausente com `provideCore(false)`.

---

### TDD-WEB-DISPLAYORDER-2026-10-14 — `displayOrder` nos payloads do construtor de modelos

Data: 2026-10-14. Ciclo TDD: RED → GREEN. 203/203 testes passando (+2 novos; nenhuma regressão).

**Problema:** `TemplateBuilderComponent.addSection()` e `addItem()` passavam o objeto `result` do diálogo diretamente ao `TemplatesService`, sem incluir `displayOrder`. O backend exige o campo como obrigatório → qualquer criação de seção/item retornava 400 contra a API real. O mock ocultava o bug com fallback `displayOrder: input.displayOrder ?? list.length + 1`.

**Implementado (2 arquivos):**
- `web/src/app/features/templates/template-builder.component.ts`:
  - `addSection()`: `result` → `{ ...result, displayOrder: this.sections().length + 1 }`.
  - `addItem()`: `result` → `{ ...result, displayOrder: (section.items ?? []).length + 1 }`.
- `web/src/app/features/templates/template-builder.component.spec.ts`: 2 novos testes:
  - `criar seção inclui displayOrder no payload enviado ao serviço`
  - `criar item inclui displayOrder no payload enviado ao serviço`

---

### TDD-FE-M04-DETAILS-2026-10-14 — Navegação FE-M04 → FE-M14

Data: 2026-10-14. Ciclo TDD: RED → GREEN. 373/373 testes passando (+1 novo; nenhuma regressão).

**Implementado:**
- `mobile/__tests__/sync-screen.test.tsx`: importa `routerMock`; novo teste "abre detalhes de sincronização ao pressionar o link de diagnóstico" — asserta `routerMock.push('/sync/details')`.
- `mobile/app/(protected)/(tabs)/sync.tsx`: importa `router` de `expo-router`; botão `testID="sync-details"` / `label="Ver detalhes"` / `variant="secondary"` que chama `router.push('/sync/details')`.
- `mobile/.expo/types/router.d.ts`: rota `/sync/details` adicionada manualmente às três uniões de tipos (`hrefInputParams`, `hrefOutputParams`, `href`) — arquivo auto-gerado estava desatualizado desde a criação de `details.tsx` na sessão anterior.

**Typecheck:** 3 erros pré-existentes remanescentes (`use-sync.ts:12` — `undefined` vs `null`; `mock-server.test.ts:13,82` — `accessToken` ausente). Nenhum erro novo.

---

### TDD-F10-2026-10-14 — snapshotId em NonConformityCreateRequest

Data: 2026-10-14. Ciclo TDD: RED → GREEN. 372/372 testes passando (nenhuma regressão).

**Problema:** mobile enviava `inspectionItemId` (UUID do item de template) em `NonConformityCreateRequest`; backend Java lê `snapshotId` (UUID do snapshot/response). Jackson ignorava o campo desconhecido → NC criada sem vínculo.

**Implementado (4 arquivos):**
- `shared/src/domain/requests.ts`: `NonConformityCreateRequest.inspectionItemId` → `snapshotId`.
- `mobile/src/features/non-conformities/use-non-conformities.ts`: request body envia `snapshotId: context.responseId` (não mais `inspectionItemId` nem `responseId`).
- `mobile/src/services/mock/mock-server.ts`: handler NC lê `request.snapshotId` para preencher `inspectionItemId` do mock.
- `mobile/__tests__/summary-nc-screens.test.tsx`: teste existente "registra a NC vinculada" corrigido para assertar `responseId` (não `item.id`); novo teste `F10` que verifica explicitamente que `inspectionItemId` ≠ `item.id` e = `responseId`.

**Insight:** `context.responseId` já continha o UUID correto — só o nome do campo no body estava errado.

---

### TDD-SYNC-FE-M04-FULL-2026-10-14 — Indicador online/offline + operações com erro na tela de sync

Data: 2026-10-14. Ciclo TDD: RED → GREEN. 364/364 testes passando (+8 novos; nenhuma regressão).

**Implementado:**
- `mobile/src/services/local-db.ts`: nova função `getFailedEntries()` — retorna `OutboxRow[]` com `status IN ('FAILED', 'CONFLICT')`.
- `mobile/app/(protected)/(tabs)/sync.tsx`: importa `getFailedEntries` e `isOnline`; estados `online: boolean | null` e `failedEntries: OutboxRow[]`; `loadPending` usa `Promise.all` com 4 operações paralelas; JSX adicionou `testID="sync-connectivity"` (texto "Online"/"Offline") e seção `testID="sync-errors"` / `testID="sync-failed-count"` condicionada a `failedEntries.length > 0`.
- `mobile/jest.setup.js`: `getAllAsync` atualizado com despacho para SQL `WHERE status IN`.
- `mobile/__tests__/local-db.test.ts`: +4 testes `SYNC-FE-M04-FULL — getFailedEntries()`.
- `mobile/__tests__/sync-screen.test.tsx`: +4 testes (Online/Offline indicador; contagem de erros; ausência quando sem erros).

**Fix de teste:** `@testing-library/react-native@14` usa correspondência exata em `toHaveTextContent(string)` — corrigido para `'1 operação com erro'` (não `'1'`). Regex `/.../` continua disponível para correspondência parcial.

**SYNC-FE-M04-FULL permanece PARTIAL:** "Baixar alterações", "Tentar novamente" e "Status por evidência" bloqueados por SYNC-PULL (backend).

---

### TDD-SYNC-OUTBOX-SCHEMA-2026-10-14 — Campos status e last_error no outbox

Data: 2026-10-14. Ciclo TDD: RED → GREEN. 356/356 testes passando (+9 novos; nenhuma regressão).

**Implementado:**
- `mobile/src/services/local-db.ts`: novo tipo exportado `OutboxStatus = 'PENDING' | 'FAILED' | 'CONFLICT' | 'COMPLETED'`; `OutboxRow` recebe `status: OutboxStatus` e `last_error: string | null`; DDL atualizado com os dois campos (`status DEFAULT 'PENDING'`, `last_error TEXT`); `upsertOutboxEntry` inicializa `status='PENDING', last_error=NULL`; `markEntriesSynced` define `status='COMPLETED'`; `incrementErrorCount` substituído por `markEntryFailed(id, status: 'FAILED' | 'CONFLICT', lastError?)`.
- `mobile/src/services/sync-service.ts`: import atualizado; CONFLICT → `markEntryFailed(id, 'CONFLICT')`, demais falhas → `markEntryFailed(id, 'FAILED')`.
- `mobile/jest.setup.js`: INSERT outbox inicializa `status: 'PENDING', last_error: null`; UPDATE synced=1 define `status: 'COMPLETED'`; UPDATE error_count agora lê params como `[status, last_error, id]` e grava ambos.
- `mobile/__tests__/local-db.test.ts`: 5 novos testes SYNC-OUTBOX-SCHEMA — upsert inicia PENDING, markEntryFailed FAILED/CONFLICT, last_error armazenado, markEntriesSynced → COMPLETED.
- `mobile/__tests__/sync-service.test.ts`: 4 novos testes SYNC-OUTBOX-SCHEMA — APPLIED→COMPLETED, REJECTED→FAILED, CONFLICT→CONFLICT, falha de rede→FAILED.

**YAGNI:** `dependency_ids` excluído do escopo (sem consumidor atual).

**Compatibilidade:** todos os testes existentes com `toMatchObject({ synced: 0, error_count: 1 })` continuam verdes — a adição de `status` não quebra asserções com subconjunto.

---

### TDD-SYNC-METADATA-2026-10-14 — Tabela sync_metadata e last_successful_sync

Data: 2026-10-14. Ciclo TDD: RED → GREEN. 347/347 testes passando (+11 novos; nenhuma regressão).

**Implementado:**
- `mobile/src/services/local-db.ts`: tabela `sync_metadata (key TEXT PK, value TEXT)` criada em `getDb()`; exporta `saveSyncMetadata(key, value)` e `getSyncMetadata(key)`.
- `mobile/src/services/sync-service.ts`: chama `saveSyncMetadata('last_successful_sync', new Date().toISOString())` ao final de `syncPending` quando `synced > 0`.
- `mobile/app/(protected)/(tabs)/sync.tsx`: `loadPending` usa `Promise.all([countPendingEntries(), getSyncMetadata(...)])` e exibe data/hora da última sync com `testID="sync-last-time"`.
- `mobile/jest.setup.js`: mock `expo-sqlite` atualizado com `__metaStore: new Map()`; `runAsync` e `getFirstAsync` despacham por padrão SQL (COUNT/sync_metadata/outbox).
- `mobile/__tests__/local-db.test.ts` (novo): 4 testes — null quando ausente, salva/recupera, sobrescreve (idempotente), chaves independentes.
- `mobile/__tests__/sync-service.test.ts`: 3 testes adicionais de SYNC-METADATA.
- `mobile/__tests__/sync-screen.test.tsx`: 2 testes adicionais; fix: `await renderWithSession(...)` (RTL v14 async — render is a Promise, must be awaited to flush initial useEffect before waitFor).

**Insight técnico:** `@testing-library/react-native@14` expõe `render` como `async function` — sem `await`, `screen` não está configurado quando `waitFor` começa, gerando "`render function has not been called`" no primeiro teste do arquivo (DB não inicializado = mais ticks async no primeiro uso). Corrigido em `renderSync()`.

---

### TDD-FE-M04-2026-10-13 — Tela de sincronização implementada

Data: 2026-10-13. Ciclo TDD: RED → GREEN. 331/331 testes passando (+4 em relação ao ciclo anterior).

**Implementado:**
- `mobile/__tests__/sync-screen.test.tsx` criado: 4 testes — "Tudo sincronizado" quando fila vazia, contagem de itens pendentes, botão aciona sync, exibe resultado com synced/failed.
- `mobile/app/(protected)/(tabs)/sync.tsx` criado: tela FE-M04 com `useEffect` para carga inicial (crítico: `useFocusEffect` é no-op nos testes), `useFocusEffect` para recarga ao focar, botão de sync manual, exibição de resultado.
- `mobile/app/(protected)/(tabs)/_layout.tsx` modificado: aba "Sync" adicionada antes de "Perfil".
- `mobile/src/design-system/components/Icon.tsx` modificado: ícone `sync` adicionado ao `ICON_PATHS`.

**Causa raiz:** `app/(protected)/(tabs)/sync.tsx` simplesmente não existia; `countPendingEntries()` em `local-db.ts` estava sem consumidor de UI.

**Insight técnico:** `useFocusEffect` no mock `expo-router` (`src/test-utils/expo-router-mock.tsx`) é `export function useFocusEffect() {}` — completamente vazio. Carga inicial deve usar `useEffect` para os testes funcionarem.

**Não implementado:** nenhuma alteração fora do escopo da pendência.

---

### TDD-F11-2026-10-13 — MOBILE-MOCK-SYNC: `POST /mobile/sync/push` adicionado ao mock

Data: 2026-10-13. Ciclo TDD: RED → GREEN. 327/327 testes passando.

**Implementado:**
- `mobile/src/services/mock/mock-server.ts`: nova rota `POST /mobile/sync/push` adicionada ao array `routes`; lê `body.operations`, retorna `{ results: [{ operationId, status: 'APPLIED' }] }` para cada operação.
- `mobile/src/services/mock/mock-server.test.ts` criado: 3 testes — aplica operações e devolve APPLIED, lista vazia sem operações, exige autenticação (401 sem token).

**Causa raiz:** `routes` não possuía handler para `POST /mobile/sync/push` → `handleMockRequest` retornava 404 → `sync-service.ts` capturava o erro e incrementava `errorCount` em todas as operações → outbox nunca drenava em modo mock.

**Não implementado:** sem alterações fora do escopo da pendência.

---

### TDD-F6-2026-10-13 — MOBILE-AUTH-CODE: `UNAUTHORIZED` mapeado em `toAuthFailureCode()`

Data: 2026-10-13. Ciclo TDD: RED → GREEN → REFACTOR. 324/324 testes passando.

**Implementado:**
- `mobile/src/features/auth/session-context.tsx`: `case 'UNAUTHORIZED': return 'INVALID_CREDENTIALS'` adicionado ao switch de `toAuthFailureCode()`.
- `mobile/src/features/auth/session-context.test.tsx`: novo caso de teste `'trata UNAUTHORIZED como credencial inválida (sessão expirada sem refresh)'`.

**Causa raiz:** switch não possuía `case 'UNAUTHORIZED'` → caía em `default: return 'UNEXPECTED'` → UI exibia mensagem genérica.

**Não implementado:** nenhuma alteração fora do escopo da pendência.

---

### AUDITORIA-2026-10-13 — Auditoria completa do código e documentação de inventário de telas

Data: 2026-10-13. Tipo: somente leitura — nenhum código alterado.

Objetivo: garantir que toda a documentação reflita fielmente o estado atual do projeto.

**Implementado:**
- Instrução passo a passo para rodar o mobile contra a API real via variáveis de ambiente:
  - `docker compose up -d` (porta 5433 para PostgreSQL conforme `.env`).
  - Backend: `DB_URL=jdbc:postgresql://localhost:5433/fieldops DB_USER=fieldops DB_PASSWORD=fieldops ./mvnw spring-boot:run -Dspring-boot.run.profiles=local`.
  - Mobile: `mobile/.env` com `EXPO_PUBLIC_API_MOCK=false` e `EXPO_PUBLIC_API_BASE_URL=http://<IP>:8090/api/v1` (IP da máquina para dispositivo físico; `10.0.2.2` para emulador Android).
- `project-state/backend-audit.md` atualizado: status SUPERSEDED; seção de re-auditoria 2026-10-13 adicionada com contagem de 16 controllers, V1–V14, ~340 testes, gaps abertos.
- `project-state/pending-features.md` atualizado: 10 novos itens adicionados (SEED-STALE, CORS-CONFIG, WEB-MOCK-AUTH, D22, D7, D9, SUPERVISOR-SCOPE, WEB-SHELL, WEB-DISPLAYORDER, MOBILE-AUTH-CODE, MOBILE-MOCK-SYNC).
- `project-state/pending-web.md` criado: inventário de 23 telas web (1 COMPLETA, 3 PARCIAIS, 19 AUSENTES); mapa de 8 serviços HTTP; divergências de contrato F1/F2/F13/F14/F15.
- `project-state/pending-mobile.md` criado: inventário de 14 telas mobile (1 COMPLETA, 11 PARCIAIS, 2 AUSENTES — FE-M04 e FE-M14); divergências F6/F7/F8/F9/F10/F11; estado dos itens de infra/outbox.
- `project-state/progress.md` e `project-state/decisions.md` atualizados.

**Não implementado (intencional):**
- Nenhum código, teste ou migration alterado.
- Nenhuma decisão de produto tomada (D7, D9, D22, CORS, SUPERVISOR-SCOPE registrados como PENDING).

**Achados de maior impacto:**
- Mobile: ~~`UNAUTHORIZED` não mapeado em `toAuthFailureCode()` → senha errada mostra mensagem genérica~~ **RESOLVIDO 2026-10-13 (TDD F6)**.
- Mobile: ~~`POST /mobile/sync/push` ausente do mock → outbox nunca drena em modo mock~~ **RESOLVIDO 2026-10-13 (TDD F11)**.
- Web: `displayOrder` ausente nos payloads do construtor → construtor inutilizável contra API real.
- Web: shell completamente ausente → 20/23 telas inacessíveis ao usuário.
- Backend: CORS ausente → web não funciona em produção sem proxy reverso.

**Limitações de ambiente:**
- Auditoria por leitura de código; nenhuma execução HTTP real feita nesta sessão.
- Bug DB_PORT=5433 descoberto e documentado (`.env` define `DB_PORT=5433`; docker-compose expõe PostgreSQL na porta 5433 do host, não 5432).

**Próximos passos recomendados:**
1. `MOBILE-AUTH-CODE` — mapear `UNAUTHORIZED` em `toAuthFailureCode()`: 1 linha, alto impacto.
2. `MOBILE-MOCK-SYNC` — mock de `POST /mobile/sync/push`: baixo esforço.
3. `WEB-SHELL` — desbloqueia navegação entre todas as telas web.
4. `WEB-DISPLAYORDER` — desbloqueia o construtor de modelos contra API real.
5. `SEED-STALE` — corrigir seed para setup limpo de ambiente.

### INT-011 — Login web contra a API real (Etapa 1) — 2026-10-05, branch `task/int-011-web-login-real-backend`

O plano incremental foi aprovado pelo usuário ("Pode seguir sua recomendações").

- **Implementado:**
  - `npm run start:api`: configuração `api` com `mockApi: false` e `proxy.conf.json` para `localhost:8090` (resolve a F16 sem CORS).
  - Login com mensagem única para 401/400, mensagem de rede e mensagem genérica para os demais erros.
  - TECHNICIAN recebe uma mensagem e tem a sessão local descartada, sem botão preso.
  - `guestGuard` sem laço para TECHNICIAN.
  - Botão liberado quando a navegação é recusada.
  - **F17 (novo):** após F5, a identidade vem de `GET /auth/me`, porque o refresh real não traz `user` e antes todo F5 deslogava.
- **Não implementado (intencional):**
  - Orientação específica para conta inativa (D22).
  - Mock de `/auth` / `provideMockSession` órfão.
  - Correção do `db/seed.sql`.
  - Shell, toasts e logout (Etapa 2).
- **TDD:** 9 testes novos, todos vistos em RED antes. O teste de 401 existente foi ajustado ao corpo real do backend.
- **Testes:**
  - Web `ng test` 201/201 (antes 192).
  - `ng build` production e `-c api` OK.
  - `tsc` app e spec OK.
  - Não existe script de lint no `web/package.json`.
- **HTTP real** (Postgres descartável `:5499` + backend `:8090` + `ng serve -c api` `:4200`, só os usuários do seed):
  - login, dashboard, 401 sem token, refresh sem `user` e `/auth/me` validados pelo proxy;
  - 401 `UNAUTHORIZED` para senha errada, conta inativa e e-mail inexistente.
- **Limitações de ambiente:**
  - O MCP `chrome-devtools` não conectou, então a UI não foi exercitada no navegador nesta sessão (fica no roteiro manual).
  - O primeiro `./mvnw package` falhou sem erro reproduzível e o segundo passou (intermitente, não investigado).
- **Achados laterais:**
  - `db/seed.sql` incompatível com o schema V14 (ver `pending-features.md` SEED-STALE).
  - O banco de dev do docker-compose (`:5432`) está na V11, sem usuários.
  - O refresh token antigo continua aceito após renovado (já registrado na auditoria §7).
- **Próximo passo:** Etapa 2, shell web (exibição de toasts + logout).

### FE-BE-AUDIT — Auditoria de contrato Frontend ↔ Backend + mapa de telas — 2026-10-02, branch `task/audit-frontend-backend-contract`

Auditoria somente leitura sobre `main` @ `7a11db9`. Relatório persistido em
`docs/auditoria-frontend-backend.md` (status ATIVO), a pedido do usuário.

- Implementado: só documentação — o relatório e estas entradas em `project-state/`.
  Nenhum código, teste, migration ou `docs/` normativo foi alterado.
- Método: backend lido diretamente (16 controllers, DTOs, enums, `GlobalExceptionHandler`,
  segurança, serviços). Web auditado pelo `ecc:typescript-reviewer` e mobile pelo
  `ecc:react-reviewer`, ambos em modo read-only. Os achados cruzados críticos foram
  conferidos manualmente.
- Principais resultados:
  - Backend com 73 operações; o `openapi.yaml` tem 72 (`responses:batch` não existe;
    `active-version` e `GET /inspections/{id}/non-conformities` não estão documentados).
  - Web: 1 tela completa, 3 parciais e 19 faltantes de 23.
  - Mobile: 1 tela completa, 11 parciais e 2 faltantes de 14 (FE-M04, FE-M14).
  - 16 divergências Front↔Back (F1–F16) e 26 divergências doc↔código (D1–D26).
- Achados de maior impacto (todos por leitura de código, nenhum executado contra o backend real):
  - F1/F2: o construtor de modelos web envia payloads que o backend recusa com 400.
  - F6: o código de erro do login quebra a mensagem no mobile.
  - F7: o técnico recebe 403 em `/clients|sites|equipment/{id}`.
  - F8/F9: `valueChoice` e as flags RN-038/039 não chegam ao detalhe mobile.
  - F10: o vínculo da NC com o item se perde.
  - D2–D5: autorização mais permissiva que a matriz documentada.
  - D7: `PUT /inspections/{id}` sem trava de estado.
  - D9: `POST /inspections` não valida local/cliente/equipamento.
- Não executado: testes, build, typecheck e HTTP real (auditoria só de leitura).
  As contagens de testes web (~189) e mobile (~300) vêm de grep.
- Limitações de ambiente: nenhuma nova. Sem proxy/CORS, a web não alcança o backend real em
  `ng serve` (F16, NÃO CONFIRMADO em execução).
- Próximo passo recomendado: as decisões listadas no §23.1 do relatório (matriz de roles,
  contrato de sync, nomes para o técnico, NC CRITICAL, `itemsToCorrect`, prefixo
  `/templates`), depois as correções baratas F1/F2, F6, F13, F14 e F15.

---

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

### SYNC-ROBUST — uma operação ruim não derruba mais o sync push (RN-070) — 2026-09-30, branch `fix/mobile-inspection-it`, não commitado

Escolhido pelo usuário. Exceções de domínio dentro do processamento de uma operação marcavam a
transação como rollback-only e o push inteiro virava 500, sem registrar a rejeição. Reestruturado
em `SynchronizationService`: aplicação + registro atômicos numa transação própria; falha → rollback
total + registro do REJECTED/CONFLICT em outra transação; `push()` sem transação (1 conexão por vez).
RED 2 (500) → GREEN; SyncPush 16/16, SyncPull 7/7, unit 50/50. Review Java pegou um HIGH no primeiro
desenho (aplicação e registro não atômicos) — corrigido. Decisão em `decisions.md`. Regressão final: 50/50 + 292/292, BUILD SUCCESS. HTTP real: lote [início válido + NC com snapshot inexistente] → 200 APPLIED | REJECTED SNAPSHOT_NOT_FOUND (inspeção IN_PROGRESS); NC → CRITICAL sem evidência → REJECTED, reenvio idêntico; 3 registros em sync_operations; 0 ERROR no log. Regressão
completa e HTTP real: ver relatório.

---

### NC-APPROVED-LOCK — não conformidade somente leitura em inspeção aprovada (RN-082) — 2026-09-30 — commitado em `1a6c450`

Lista A–F esgotada (E bloqueado); análise apresentada e o usuário escolheu este item. Criar,
alterar e mudar status de NC em inspeção APPROVED → 409 `NON_CONFORMITY_READ_ONLY_APPROVED_INSPECTION`
(HTTP) / `REJECTED` (sync); leitura mantida; mesmo recorte da evidência (RN-049). `noRollbackFor`
nos métodos chamados pelo sync (padrão BF-002). RED 4 → GREEN; `NonConformityControllerIT` 18/18,
`SyncPushControllerIT` 14/14, `AuthorizationBoundaryIT` 11/11. Regressão completa revelou 62 erros
de ordem (sync_operations deixadas pelo `SyncPushControllerIT`) → `@AfterEach` adicionado.
Regressão final `./mvnw verify`: 50/50 + 290/290, BUILD SUCCESS. HTTP real (inspeção aprovada via SQL no banco descartável): POST/PUT de técnico e PATCH de supervisor → 409; sync → REJECTED; leitura 200; NC intacta; 0 ERROR no log. Follow-up importante (pré-existente): outras
exceções no sync de NC ainda viram 500 para o push inteiro — ver `pending-features.md`.

---

### MOBILE-TEST-2 — testes unitários do outbox/sync (BF-007) — 2026-09-30 — commitado em `1a92e14`

Candidato F (parte 2). Nova suíte `mobile/__tests__/sync-service.test.ts` (14 testes) cobrindo
`sync-service.ts` + `local-db.ts` sobre os mocks do `jest.setup.js`. Sem alteração de código de
produção: os testes são de caracterização (passaram de primeira); sensibilidade validada por 4
mutações temporárias no `sync-service.ts` (lote 51, sem ALREADY_APPLIED, sem `incrementErrorCount`,
`isConnected` no lugar de `isInternetReachable`) — todas detectadas; arquivo restaurado (git diff
vazio). Mobile: 25/25 suítes, **316/316**; typecheck e lint OK. ECC typescript-reviewer: sem CRITICAL/HIGH; ajustes de teste aplicados. Achado registrado (não
implementado): provável CONFLICT na 3ª edição do mesmo item por `baseVersion` desatualizado em
`use-checklist.ts` — ver `pending-features.md` BF-007.

---

### MOBILE-TEST-1 — suíte `inspections-screen.test.tsx` volta a rodar — 2026-09-30 — commitado em `2805ca7`

Candidato F (parte 1). A suíte não carregava desde `cdb7c5b` (lucide-react-native ESM no Jest).
Correção só de teste/config: `moduleNameMapper` do Jest aponta para a build CJS do lucide; os 6
testes de filtro (que falharam ao voltar a carregar, pois `cdb7c5b` moveu os chips para um painel
lateral) passam a abrir o painel antes de tocar nos chips. Resultado: suíte 11/11; `npm test`
24/24 suítes, **302/302** (volta a bater com a contagem histórica do ESTADO-DO-PROJETO);
typecheck e lint OK. Candidato E continua bloqueado por decisão de contrato; F-2 (testes
unitários de `local-db`/`sync-service`) é o próximo executável.

---

### BASEVERSION-STALENESS — base_version obsoleto na 2ª edição do mesmo item (RN-075) — 2026-10-01 — não commitado

Achado registrado em MOBILE-TEST-2: `versionsRef` em `use-checklist.ts` armazenava respostas
completas mas nunca era atualizado após `upsertOutboxEntry` bem-sucedido. A 2ª edição do mesmo
item na mesma sessão reenviava o `baseVersion` original → servidor retornava CONFLICT → dado perdido.

**Fix aplicado** em `mobile/src/features/checklist/use-checklist.ts`:
1. Tipo de `versionsRef` simplificado: armazena apenas `Map<Uuid, number>` (números de versão),
   não mais objetos `InspectionResponse` completos.
2. Cache rebuild monta `new Map(responses.map(r => [r.inspectionItemId, r.version]))`.
3. Após `upsertOutboxEntry` bem-sucedido: re-leitura atômica do ref — `(ref.get(id) ?? 0) + 1` —
   em vez de `knownVersion + 1` (closure stale). Corrige também a corrida de edições concorrentes.

**Testes**: 4 novos em `mobile/__tests__/use-checklist.test.ts`:
- 2 testes RED→GREEN (serial: sem resposta pré-existente e com version=2)
- 1 teste de edição concorrente (v1 bloqueado, v2 completa, v1 escrita reflete ref atualizado)
- 1 teste de falha no `upsertOutboxEntry` (versão não incrementada em caso de erro)

Typecheck, lint e regressão completa: **323/323** GREEN.
ECC typescript-reviewer: sem CRITICAL/HIGH; 1 MEDIUM de closure stale → corrigido (re-leitura atômica); 2 MEDIUMs de testes faltantes → cobertos; 2 LOWs (mock excessivo + eslint-disable) → limpos.

---

### AUTHZ-BOUNDARY — posse do técnico em evidências e não conformidades (RN-004) — 2026-09-30 — commitado em `2805ca7`

Candidato D (cobertura ⚪ do audit + `AuthorizationBoundaryIT` do test-plan §5.8). O teste
revelou **vulnerabilidade real**: técnico B lia/alterava evidências e não conformidades da
inspeção do técnico A pela URL (8 endpoints, RED 200/201) e criava/alterava NC via
`/mobile/sync/push` (RED `APPLIED`, achado HIGH do ECC security-reviewer). Corrigido com
checagem de posse nos serviços (403 `FORBIDDEN`; sync `REJECTED`/`SYNC_INSPECTION_NOT_OWNED`),
padrão já usado em `EvidenceService.delete`. ADMIN/SUPERVISOR sem restrição.
Testes: `AuthorizationBoundaryIT` 11/11 (novo), `SyncPushControllerIT` 12/12 (+2),
`ConflictDetectionTest` fixture alinhado. `./mvnw verify` completo: 50/50 + 284/284, BUILD SUCCESS.
HTTP real (Postgres descartável + app :8099, login real de admin/técnico A/técnico B): as 7 rotas
testáveis → 403 `FORBIDDEN` para B, sync push de B → `REJECTED`/`SYNC_INSPECTION_NOT_OWNED`,
controles A/admin 200, NC intacta. Limitação de ambiente: upload do dono A deu 500
(`NoSuchBucketException` — bucket S3 ausente no ambiente descartável, não relacionado); por isso
`GET /evidence/{id}` de B não foi exercitado via HTTP real — coberto pelo `AuthorizationBoundaryIT`
(storage fake).
Follow-ups em `pending-features.md` "AUTHZ-BOUNDARY"; decisão 403 vs 404 em `decisions.md`.

---

### ERR-HANDLER-2 — 400/415 para parâmetro ausente e Content-Type não suportado — 2026-09-30 — commitado em `2805ca7`

Candidato A (follow-up do ERR-HANDLER; nenhuma BF formal pendente). `GlobalExceptionHandler`:
parâmetro/parte obrigatória ausente → 400 `MISSING_PARAMETER` + `fieldErrors[nome]`;
Content-Type não suportado → 415 `UNSUPPORTED_CONTENT_TYPE` (api-rest.md §12.3). TDD: 4 RED
(500) → GREEN; `GlobalExceptionHandlerIT` 10/10; `./mvnw verify` completo 50/50 + 268/268.
HTTP real (Postgres descartável + app :8099, login real): 400/400/415/415, 401 sem token,
controles 404/201, sem ERROR no log. ECC java-reviewer sem CRITICAL/HIGH; MEDIUMs corrigidos.
Follow-ups (header/cookie ausente, 406, ordem 403 vs 400/415) em `pending-features.md`
"ERR-HANDLER-2".

Extensão 405 (mesmo dia, decisão do usuário): documentado em `api-rest.md` §12.3 e
`contrato-backend-frontend.md` §5.2; `HttpRequestMethodNotSupportedException` → 405
`METHOD_NOT_ALLOWED` + cabeçalho `Allow` em todas as rotas. RED 2 (500) → GREEN;
`GlobalExceptionHandlerIT` 13/13; `./mvnw verify` 50/50 + 271/271; HTTP real 405 com `Allow`
correto, 401 sem token, sem ERROR no log. ECC security-reviewer: só LOWs aceitos.

---

### ITORDER-001 + MobileInspectionControllerIT — suíte completa verde — 2026-09-30 — commitado em `2bdb53c` (`fix/mobile-inspection-it`)

Não havia BF pendente (BF-001..007 DONE); o usuário escolheu seguir a ordem recomendada
dos candidatos: B (`MobileInspectionControllerIT`) e C (ITORDER-001). Só arquivos de teste
alterados — nenhum código de produção.
- B: as 2 falhas eram asserções erradas (`extractingPath(...).isNull()` falha quando o path
  não existe); a API já omite `snapshotId` conforme contrato §4.2. Corrigido para
  `hasPath(inspectionItemId)` + `doesNotHavePath(snapshotId)`. 15/15.
- C: `SiteControllerIT` com `TRUNCATE TABLE users CASCADE` no `setUp()` e `@AfterEach`
  removendo equipment/sites/clients/users. RED reproduzido (`InspectionSchedulingControllerIT`
  → `SiteControllerIT` em ordem alfabética: 0/17, FK `inspection_templates_created_by_fkey`);
  GREEN 17/17. A 1ª regressão completa expôs 17 erros novos em `SyncPull/PushControllerIT`
  (`equipment_site_id_fkey` — equipment deixado pelo `SiteControllerIT`, antes mascarado);
  corrigido com o `@AfterEach`.
- Regressão: `./mvnw verify` completo **BUILD SUCCESS — unit 50/50, IT 263/263**, primeira
  execução completa sem falhas registrada. ECC java-reviewer: aprovado, 0 CRITICAL/HIGH;
  MEDIUM (TRUNCATE em `@BeforeEach` arriscado com execução paralela) registrado em
  `decisions.md` ITORDER-001 — failsafe roda em série.
- Ambiente: Docker Desktop precisou ser iniciado nesta sessão (daemon não estava rodando).

---

### PATHVAR-SIZE — `@Size` no `@PathVariable qrCode` — 2026-09-29 — commitado em `4138064` (`fix/error-handler-400-404`) (antes registrado como "não commitado" — corrigido 2026-09-30)

Candidato 3 (decisão deferida PEND-04 H-03). O escopo real era 1 endpoint:
`qrCode` é o único `@PathVariable String` (os demais são `UUID`, já 400 desde o
ERR-HANDLER). `GET /equipment/by-qr/{qrCode}` com `@Size(max = 100)` (=
`equipment.qr_code VARCHAR(100)`); >100 → 400 `VALIDATION_ERROR` com
`fieldErrors[qrCode]` via novo handler de `HandlerMethodValidationException`
(Spring 7 — não `ConstraintViolationException`, como previa a decisão original).
Testes: `EquipmentControllerIT` 17/17 (+2: 101 → 400, 100 → 404), `GlobalExceptionHandlerIT`
5/5; regressão completa 263 ITs, só as pré-existentes (Mobile 2, Site 17). HTTP real:
101 → 400, 100 existente → 200, sem token → 401. `openapi.yaml`: `maxLength: 100` + 400.

---

### ERR-HANDLER — 400/404 em vez de 500 — 2026-09-29 — commitado em `c0cfd2a` (`fix/error-handler-400-404`)

Candidato 2 da lista de próximos ciclos. `GlobalExceptionHandler`: JSON malformado/corpo
ausente → 400 `MALFORMED_REQUEST`; parâmetro com tipo inválido (ex. UUID) → 400
`INVALID_PARAMETER`; rota inexistente → 404 `ROUTE_NOT_FOUND` (anônimo continua 401).
Conforme `api-rest.md` §12.3. `GlobalExceptionHandlerIT` 5/5; regressão completa sem
falhas novas (261 ITs, só as pré-existentes Mobile 2 + Site 17); HTTP real validado;
ECC security-reviewer sem CRITICAL/HIGH. Follow-ups (405/415/param ausente, Swagger
público) em `pending-features.md` "ERR-HANDLER".

Nota de ambiente: uma execução do IT levou 1616 s (contexto Spring lento, provável
contenção de CPU com o language server Java do VS Code); as execuções seguintes, 35 s.

Nota de histórico: a BF-005 foi commitada junto com a BF-007 em `c1d4733`
(branch `fix/BF-007`), não em commit próprio.

---

### BF-007 — validação e correção de dependências — 2026-09-29 — commitado em `c1d4733` (`fix/BF-007`)

Candidato 1 da lista de próximos ciclos. A validação revelou que a BF-007 não
instalava em máquina limpa: `expo-sqlite ~15.0.0`/`expo-network ~7.0.0` (versões de
SDK antigo) sem entrada no `package-lock.json` → `npm ci` falhava. Corrigido para
`~57.0.1` (o que o SDK 57 exige) e lock regenerado — só `mobile/package.json` e
`mobile/package-lock.json` alterados; nenhum código-fonte.

Resultados: `npm ci --dry-run` OK; typecheck OK; lint OK; `npm test` 291/291
(suítes da BF-007 26/26). Uma suíte pré-existente não carrega
(`inspections-screen.test.tsx`, lucide ESM, quebrada desde `cdb7c5b` 2026-09-15) —
follow-up, junto com a falta de testes unitários diretos de `local-db`/`sync-service`.
Contagem histórica "302 testes" (ESTADO-DO-PROJETO 2026-08-18) não é comparável: a
suíte que não carrega não entra no total.

---

### BF-005 (builder) — Section/Item Builder via DRAFT version — 2026-09-29 — commitado em `c1d4733` (`fix/BF-007`)

Completa a BF-005 (antes PARTIAL). Decisão de produto do usuário: opção (b),
rascunho como `TemplateVersion` em status `DRAFT` (`decisions.md` 2026-09-29).
Branch `main`, working tree com as alterações desta BF (sem commit/push — manual).

- V14 (`status` DRAFT/PUBLISHED; 1 draft por template; draft nunca ativo).
- Rotas `GET/POST .../sections`, `PUT .../sections/{id}`, `POST .../sections/{id}/items`,
  `PUT .../items/{id}`; publish sem corpo promove o draft; publish legado com corpo
  mantido (409 se houver draft aberto).
- Draft de template ACTIVE nasce como cópia da versão ativa (RN-020); estrutura publicada
  → 409 (RN-019); template INACTIVE → 409; draft invisível como versão e não agendável (422).
- `openapi.yaml` + `docs/api-rest.md` §12.9: adicionado `GET .../sections` (já consumido pelo web).

Testes: `TemplateBuilderControllerIT` 23/23 (novo), `InspectionSchedulingControllerIT` 20/20
(+1), `FlywayMigrationIT` 2/2 (v14), template ITs 17/17 + 7/7, unit 50/50. `./mvnw verify`
completo: falhas só em `MobileInspectionControllerIT` (2 — idênticas no `main` intocado,
confirmado via worktree do HEAD `7beb028`) e `SiteControllerIT` (ITORDER-001; 17/17 isolado).
HTTP real: backend em Postgres descartável (:5499/:8099), fluxo de 16 passos OK.
ECC java-reviewer + database-reviewer executados; HIGHs corrigidos com testes RED→GREEN.

Não implementado (follow-ups em `pending-features.md` BF-005): lock pessimista, handler
404/400 para rota inexistente/JSON malformado, delete de seção/item, update de metadados
de template ACTIVE. Web não alterado (já chamava as rotas).

---

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

### RN-038/039 — Submit Validation (Observation + Evidence on Non-Conforming) — não commitado ainda

Validação de submit ampliada para cobrir RN-038/039:
- **RN-038**: se `ItemSnapshot.observationRequiredOnFailure = true` e a resposta tem
  `conformity = NON_CONFORMING`, o campo `observation` é obrigatório; ausência → 422.
- **RN-039**: se `ItemSnapshot.evidenceRequiredOnFailure = true` e a resposta tem
  `conformity = NON_CONFORMING`, pelo menos uma evidência vinculada ao response é
  obrigatória; ausência → 422.

Prerequisito corrigido: `createSnapshots()` não copiava `observationRequiredOnFailure`
nem `evidenceRequiredOnFailure` do `TemplateItem` para o `ItemSnapshot`. Path A escolhido:
migração V13 adicionou as colunas à `inspection_item_snapshots`.

Implementation:
- `V13__add_snapshot_failure_rules.sql` — `ALTER TABLE inspection_item_snapshots ADD COLUMN
  observation_required_on_failure BOOLEAN NOT NULL DEFAULT FALSE, ADD COLUMN
  evidence_required_on_failure BOOLEAN NOT NULL DEFAULT FALSE`
- `ItemSnapshot.java` — dois novos campos booleanos + `@PrePersist` defaults
- `InspectionService.createSnapshots()` — copia os dois campos de `TemplateItem`
- `InspectionResponseRepository` — `findByInspectionIdAndConformityFetchSnapshot`
  (JPQL com `JOIN FETCH r.snapshot` para evitar N+1)
- `EvidenceRepository` — `existsByInspectionIdAndResponseId`
- `InspectionExecutionService` — `EvidenceRepository` injetado; bloco de validação
  RN-038/039 após o bloco RN-037 existente
- `InspectionExecutionControllerIT` — `@AfterEach tearDown()` adicionado (fix cross-class
  FK — mesmo padrão de PEND-04 `EquipmentControllerIT`); 6 novos testes (5 RN-038/039 + 1
  CONFORMING coexistence)

ECC java-reviewer: 0 CRITICAL, 3 HIGH — todos resolvidos:
- H-1 (N+1): corrigido com JOIN FETCH query
- H-2 (readOnly): `@Transactional(readOnly = true)` adicionado ao método
- H-3 (InspectionSchedulingControllerIT teardown): aceito — testes passam GREEN,
  `@AfterEach` em `InspectionExecutionControllerIT` cobre o cleanup; registrado em decisions.md
MEDIUM/LOW findings: cross-module coupling aceito (mesmo padrão), conforming coexistence
test adicionado, error code renomeado de `CRITICAL_NON_CONFORMING` para `NON_CONFORMING`.

Test results:
- InspectionExecutionControllerIT: 18/18 GREEN (6 novos testes)
- Regression: 115/115 GREEN (InspectionExecution + InspectionResponse + InspectionScheduling
  + SyncPush + FlywayMigrationIT + todos *Test unitários)

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
- ~~BF-005 (PARTIAL/BLOCKED)~~ — **CONCLUÍDA** em 2026-09-29 (builder via versão DRAFT, ver acima)
- ~~BF-007 validação~~ — **VALIDADA** em 2026-09-29 (ver "BF-007 — validação" abaixo)
- ~~BF-007 (mobile sync)~~ — **CONCLUÍDA** em 2026-09-28 (ver BF-007 abaixo)
- ~~PEND-04 (QR scope)~~ — **RESOLVIDA** em 2026-09-28 (ver PEND-04 acima)
- ~~PEND-05 (evidence ownership)~~ — **RESOLVIDA** em 2026-09-28 (ver PEND-05 acima)
- ~~PEND-15 (admin filters)~~ — **RESOLVIDA** em 2026-09-28 (commitado em `22b7d31`)
- ~~RN-038/039 (submit validation)~~ — **RESOLVIDA** em 2026-09-28 (ver acima)
- **Hardening** — `@Size` em `@PathVariable String` + handler `ConstraintViolationException` (codebase-wide, deferred)

---

### SYNC-RESILIENCE — Mobile sync resilience (RN-070) — não commitado

BF-007 follow-up items (a) e (b); implementado em `mobile/src/services/sync-service.ts`.

**Bugs corrigidos:**
1. `JSON.parse(row.payload)` estava fora do bloco `try` (linha 70 vs. try linha 74).
   Substituído `batch.map()` por `for` loop com try-catch individual. Payload corrompido:
   `incrementErrorCount`, `failed += 1`, `continue` — não bloqueia entradas válidas do lote.
2. Guard `if (!Array.isArray(response.results))` antes do loop de resultados.
   Resposta 200 sem `results` agora trata o lote todo como falha de rede.
3. `respondedIds = new Set(results.map(r => r.operationId))` após o loop de resultados.
   Operações enviadas mas omitidas na resposta do servidor agora recebem `error_count + 1`.

**Testes adicionados** (`mobile/__tests__/sync-service.test.ts`, 3 novos):
- `entrada com payload corrompido incrementa error_count e não bloqueia entradas válidas`
- `resposta do servidor sem campo results trata o lote todo como falha`
- `operação omitida pelo servidor incrementa error_count e conta como falha`

**Validação:**
- RED confirmado para cada test antes da implementação.
- GREEN: sync-service 17/17; full suite 319/319, 25 suites; `tsc --noEmit` clean.
- ECC typescript-reviewer: sem CRITICAL; HIGH de `response.results` unsafe cast resolvido inline.
  HIGH de `incrementErrorCount` sequencial registrado em `pending-features.md` (deferred).

---

### BF-007 — Mobile Sync Integration — não commitado ainda

Offline-first sync implementada no mobile (Expo SDK 57 / React Native):

- `mobile/src/services/local-db.ts` — outbox SQLite com INSERT OR REPLACE
  por UUID; `synced = 0` na gravação, `synced = 1` após confirmação do servidor.
- `mobile/src/services/sync-service.ts` — `isOnline()` via `expo-network`,
  `getOrCreateDeviceId()` via `expo-secure-store`; `syncPending()` envia batches
  de 50 para `POST /mobile/sync/push`; SINGLE_CHOICE mapeado para `valueChoice`.
- `mobile/src/features/sync/use-sync.ts` — `useSyncOnForeground()`: dispara na
  montagem e ao voltar do background via `AppState`.
- `use-checklist.ts` `send()` reescrito: escreve no outbox SQLite primeiro,
  chama `syncPendingIfOnline()` em background (void), nunca chama a API diretamente.
- `summary.tsx`: sync-on-mount antes de avaliar conclusão; `submit()` verifica
  `isOnline()` e drena o outbox antes de POST /inspections/{id}/submit.
- `_layout.tsx`: `useSyncOnForeground()` chamado incondicionalmente.
- `jest.setup.js`: mocks de `expo-network` (padrão online=true) e `expo-sqlite`
  (Map em memória com reset no `beforeEach`).
- `checklist-screen.test.tsx`: teste "grava resposta" removeu asserção do mock DB;
  teste de erro reescrito para simular falha SQLite via `mockRejectedValueOnce`.

Validação: `npm test` não executado (node_modules ausente). Lógica revisada
manualmente. Mock design verificado contra strings SQL de `local-db.ts`.

---

## Recommended Next Task

> Atualização 2026-10-01: SYNC-RESILIENCE concluído. BF-007 follow-ups (a) e (b)
> resolvidos. Mobile suite: 319/319. Próximos candidatos:

Todos os backend BFs do audit estão concluídos ou formalmente bloqueados. Opções:

1. **Abrir PR de `feat/PEND-004` → `main`** — integrar tudo: BF-002..005, NESTED-NAV,
   PEND-04/05/15, RN-038/039. **Fortemente recomendado** — a branch está 10+ commits à
   frente de `main`, acumulando risco de divergência.

2. **Decisão de produto sobre BF-005** — seções draft (tabela separada vs. `TemplateVersion`
   em `DRAFT`). Decisão de produto/arquitetura, não de código (ver `decisions.md` 2026-09-27).

3. **BF-007** — integração mobile sync (tarefa do lado mobile).

4. **Input hardening** — `@Size` em `@PathVariable String` + `ConstraintViolationException`
   handler (codebase-wide, deferred).

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

~~`ESTADO-DO-PROJETO.md` (2026-08-18) afirma "A API (Java/Spring) não existe neste
repositório" — informação stale.~~ **SUPERSEDED 2026-10-20:** o arquivo foi reescrito
e hoje reflete o estado atual (backend presente e validado, integração ponta a ponta,
próximos passos). Continua valendo que `project-state/backend-audit.md` é a fonte de
verdade do estado **detalhado** do backend; `ESTADO-DO-PROJETO.md` é a visão geral de
uma página. As seções §8 (Expo Go) e §9 (armadilhas) foram preservadas na reescrita —
são as referenciadas por `CLAUDE.md` §10.
