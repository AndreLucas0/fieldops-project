# 21 - Documentação de Telas e Integração do Frontend

> **Status:** documento normativo. **Fontes primárias:** `./docs` (01–19), `./openapi.yaml`, `docs/contrato-backend-frontend.md` (documento 20, produzido nesta mesma base). **Objetivo:** permitir que o frontend (mobile Expo/React Native e admin Angular) seja implementado de forma independente, sabendo exatamente que tela criar, que rota usar, que endpoint chamar, quando chamar, o que enviar e o que esperar de volta.

## Como este documento se relaciona com o documento 20 (`contrato-backend-frontend.md`)

Para não duplicar ~1500 linhas já produzidas, este documento **não repete**: o catálogo completo de endpoints com todos os status HTTP (já em `contrato-backend-frontend.md` §3), a definição byte-a-byte de cada DTO (já em `openapi.yaml` e `contrato-backend-frontend.md` §4), a estrutura de erro e o significado de cada código HTTP (já em `contrato-backend-frontend.md` §5), o contrato completo de sincronização (já em `contrato-backend-frontend.md` §11) e a matriz de rastreabilidade RN→endpoint (já em `contrato-backend-frontend.md` §16). Onde este documento precisa desses fatos, ele **referencia** a seção correspondente em vez de reescrevê-la.

O que este documento **adiciona** e que não existia antes: o inventário e a documentação individual de cada **tela** (rota, dados exibidos, ações, pré-condições), o fluxo passo a passo de cada tela, o mapeamento de formulários e tabelas componente a componente, os modais/drawers que também falam com a API, a matriz de permissão **por tela e ação** (mais granular que a matriz por endpoint do documento 20), e a máquina de estados **da interface** (quais botões aparecem em qual estado).

**Regra de precedência:** em conflito sobre formato de campo/endpoint, `openapi.yaml` prevalece. Em conflito sobre regra de negócio/permissão, `contrato-backend-frontend.md` prevalece. Este documento prevalece apenas sobre **composição de tela** (o que fica em que tela, que componente usar).

---

# 1. Análise inicial

Reaproveita integralmente a análise já feita em `contrato-backend-frontend.md` §1 (entidades, perfis, contextos funcionais, inconsistências entre documentos-fonte). O mapeamento adicional específico deste documento é:

```text
Requisito (UC-XX)
   ↓
Funcionalidade (funcionalidades.md §8.2)
   ↓
Tela (aplicativo-mobile.md §13.3/13.4, interface-admnistrativa-web.md §14.3)
   ↓
Ação do usuário
   ↓
Endpoint (openapi.yaml)
   ↓
Request (DTO de escrita)
   ↓
Response (DTO de leitura)
   ↓
Atualização da interface (estado, navegação, invalidação de cache)
```

Duas observações que valem para todo o restante do documento:

1. **Os mapas de navegação de origem não são idênticos ao nível de detalhe pedido aqui.** `aplicativo-mobile.md` §13.3 e `interface-admnistrativa-web.md` §14.3 definem a árvore de rotas; o **catálogo de telas** (§13.4 e §14.6–14.12) descreve o conteúdo de cada uma. Este documento funde as duas fontes por tela.
2. **Nem toda tela do catálogo tem uma rota explícita no mapa de navegação.** Em particular, `interface-admnistrativa-web.md` §14.3 lista rotas de nível de lista (`/users`, `/clients`, `/sites`, `/equipment`) e, para `inspection-templates` e `inspections`, também rotas de criação/edição (`/new`, `/:id/edit`). Para usuários, clientes, locais e equipamentos, **nenhuma rota de criação/edição é definida** — os documentos de origem descrevem apenas a funcionalidade ("cadastrar", "editar"), não se isso ocorre em rota própria ou em modal/drawer sobre a lista. Isso é sinalizado como **[A DEFINIR]** em cada tela afetada (ver também PEND-F01 na seção 21).

---

# 2. Inventário completo de telas

| ID | Tela | Plataforma | Perfil | Rota | Objetivo |
|---|---|---|---|---|---|
| FE-M01 | Login (mobile) | Mobile | Todos | `/(public)/login` | Autenticação do técnico |
| FE-M02 | Início | Mobile | TECHNICIAN | `/(protected)/(tabs)/index` | Resumo do dia, atalhos |
| FE-M03 | Lista de inspeções | Mobile | TECHNICIAN | `/(protected)/(tabs)/inspections` | Consultar inspeções atribuídas |
| FE-M04 | Sincronização | Mobile | TECHNICIAN | `/(protected)/(tabs)/sync` | Status e ação de sincronizar |
| FE-M05 | Perfil | Mobile | TECHNICIAN | `/(protected)/(tabs)/profile` | Dados da sessão, logout |
| FE-M06 | Detalhes da inspeção | Mobile | TECHNICIAN | `/(protected)/inspections/[inspectionId]/index` | Visão geral antes/depois da execução |
| FE-M07 | Iniciar inspeção | Mobile | TECHNICIAN | `/(protected)/inspections/[inspectionId]/start` | Confirmar início, capturar localização |
| FE-M08 | Checklist | Mobile | TECHNICIAN | `/(protected)/inspections/[inspectionId]/checklist` | Responder itens dinâmicos |
| FE-M09 | Resumo e conclusão | Mobile | TECHNICIAN | `/(protected)/inspections/[inspectionId]/summary` | Revisar e concluir |
| FE-M10 | Não conformidades (inspeção) | Mobile | TECHNICIAN | `/(protected)/inspections/[inspectionId]/non-conformities` | Registrar/listar NCs da inspeção |
| FE-M11 | Scanner QR | Mobile | TECHNICIAN | `/(protected)/scanner` | Identificar equipamento |
| FE-M12 | Captura de evidência | Mobile | TECHNICIAN | `/(protected)/evidence/capture` | Fotografar |
| FE-M13 | Prévia de evidência | Mobile | TECHNICIAN | `/(protected)/evidence/preview` | Confirmar/refazer foto |
| FE-M14 | Detalhes de sincronização | Mobile | TECHNICIAN | `/(protected)/sync/details` | Diagnóstico técnico da fila |
| FE-W01 | Login (web) | Web | Todos | `/login` | Autenticação administrativa |
| FE-W02 | Dashboard | Web | ADMIN, SUPERVISOR | `/dashboard` | Indicadores gerais |
| FE-W03 | Usuários — lista | Web | ADMIN | `/users` | Gerenciar usuários |
| FE-W04 | Usuário — cadastro/edição | Web | ADMIN | **[A DEFINIR]** (modal sobre `/users` ou rota própria) | Criar/editar usuário |
| FE-W05 | Clientes — lista | Web | ADMIN (escrita), SUPERVISOR (leitura) | `/clients` | Gerenciar clientes |
| FE-W06 | Cliente — cadastro/edição | Web | ADMIN | **[A DEFINIR]** | Criar/editar cliente |
| FE-W07 | Locais de um cliente | Web | ADMIN, SUPERVISOR | `/clients/:clientId/sites` | Locais do cliente selecionado |
| FE-W08 | Locais — lista | Web | ADMIN, SUPERVISOR | `/sites` | Gerenciar locais |
| FE-W09 | Local — cadastro/edição | Web | ADMIN | **[A DEFINIR]** | Criar/editar local |
| FE-W10 | Equipamentos de um local | Web | ADMIN, SUPERVISOR | `/sites/:siteId/equipment` | Equipamentos do local selecionado |
| FE-W11 | Equipamentos — lista | Web | ADMIN, SUPERVISOR | `/equipment` | Gerenciar equipamentos |
| FE-W12 | Equipamento — cadastro/edição | Web | ADMIN, SUPERVISOR | **[A DEFINIR]** | Criar/editar equipamento |
| FE-W13 | Modelos de inspeção — lista | Web | ADMIN, SUPERVISOR | `/inspection-templates` | Gerenciar modelos |
| FE-W14 | Novo modelo | Web | ADMIN, SUPERVISOR | `/inspection-templates/new` | Criar modelo em rascunho |
| FE-W15 | Editar modelo (construtor) | Web | ADMIN, SUPERVISOR | `/inspection-templates/:templateId/edit` | Seções, itens, ordenação |
| FE-W16 | Prévia do modelo | Web | ADMIN, SUPERVISOR | `/inspection-templates/:templateId/preview` | Validar antes de publicar |
| FE-W17 | Versões do modelo | Web | ADMIN, SUPERVISOR | `/inspection-templates/:templateId/versions` | Consultar histórico de versões |
| FE-W18 | Inspeções — acompanhamento | Web | ADMIN, SUPERVISOR | `/inspections` | Listar/filtrar inspeções |
| FE-W19 | Nova inspeção | Web | ADMIN, SUPERVISOR | `/inspections/new` | Agendar e atribuir |
| FE-W20 | Detalhe da inspeção | Web | ADMIN, SUPERVISOR | `/inspections/:inspectionId` | Consultar/editar planejamento |
| FE-W21 | Revisão da inspeção | Web | SUPERVISOR | `/inspections/:inspectionId/review` | Aprovar/reprovar |
| FE-W22 | Não conformidades — lista | Web | ADMIN, SUPERVISOR | `/non-conformities` | Consultar NCs de todas as inspeções |
| FE-W23 | Auditoria | Web | ADMIN, SUPERVISOR | `/audit` | **[PENDÊNCIA]** sem endpoint (INC-05/PEND-08 do documento 20) |

**Total: 37 telas** (14 mobile + 23 web). Nenhuma tela foi inventada além do que consta nos catálogos de origem — FE-W23 é mantida no inventário porque a rota está mapeada em `interface-admnistrativa-web.md` §14.3, mesmo sem contrato de API ainda; ver seção 21.

---

# 3. Documentação individual de cada tela

**Nota de estruturação (decisão editorial, não de negócio):** para evitar duplicar o mesmo conteúdo em duas seções separadas, a documentação de integração pedida na seção 4 do enunciado (quando chamar, payload, response, comportamento da UI, erros) é apresentada **dentro** da tabela "Ações disponíveis" de cada tela abaixo, em vez de repetida numa seção 4 à parte. A seção 4 deste documento (mais adiante) consolida essa mesma informação **agrupada por endpoint** (visão inversa, útil para checar cobertura), em vez de repetir por tela.

Convenções válidas em toda tabela de "Dados exibidos": **Origem** indica o endpoint (documento 20 tem o schema completo do campo); **Tipo** segue `openapi.yaml`. Convenções em toda tabela de "Ações disponíveis": **Endpoint** já indica método+URL; erros específicos da ação são citados por status HTTP, com o comportamento padrão de UI descrito em `contrato-backend-frontend.md` §5.2 sempre que não houver uma exceção citada aqui.

## 3.1 Telas do aplicativo mobile

### FE-M01 — Login (mobile)

**Objetivo:** autenticar o técnico e iniciar a sessão local. **Usuários autorizados:** qualquer usuário `ACTIVE` (na prática, o mobile é usado majoritariamente por `TECHNICIAN`, mas nenhum endpoint de login restringe por perfil — `perfis-de-usuario.md` §5.2 marca acesso ao app de campo como "Opcional" para ADMIN/SUPERVISOR). **Rota:** `/(public)/login`. **Pré-condições:** nenhuma (rota pública); se já existir sessão local válida, redirecionar direto para FE-M02.

**Dados exibidos:** campo e-mail, campo senha, indicação de indisponibilidade de rede, informação sobre acesso offline quando uma sessão anterior existir (`aplicativo-mobile.md` §13.4).

**Ações disponíveis:**

| Ação | Perfil | Endpoint | Payload | Response usado | Comportamento da UI |
|---|---|---|---|---|---|
| Entrar | Todos | `POST /auth/login` | `{ email, password }` | `accessToken`, `refreshToken`, `expiresIn`, `user.{id,name,email,role}` | Loading no botão; sucesso → grava tokens no Secure Store e navega para FE-M02; `401` → mensagem única "credenciais inválidas ou usuário inativo" sem distinguir qual (AC-AUTH — não revelar se o e-mail existe, ver PEND-09 do documento 20) |
| Continuar offline | TECHNICIAN | — (sem chamada) | — | dados de sessão já em Secure Store | Disponível somente se existir sessão local válida; critério exato de validade **[A DEFINIR]** (PEND-10 do documento 20) |

---

### FE-M02 — Início

**Objetivo:** ponto de entrada pós-login; visão geral do dia. **Usuários autorizados:** TECHNICIAN. **Rota:** `/(protected)/(tabs)/index`. **Pré-condições:** sessão válida.

**Dados exibidos:**

| Campo | Tipo | Origem | Obrigatório | Observações |
|---|---|---|---|---|
| Saudação/usuário | string | `GET /auth/me` (ou sessão em cache) | Sim | `UserSummary.name` |
| Inspeções do dia | array | dados locais (populados por `GET /mobile/inspections`) | Sim | filtro client-side por `scheduledFor` = hoje |
| Inspeções atrasadas | array | idem | Sim | `scheduledFor` < agora e `status` fora de `SUBMITTED/APPROVED/REJECTED/CANCELED` |
| Inspeções em andamento | array | idem | Sim | `status = IN_PROGRESS` |
| Pendências de sincronização | integer | `SyncMetadata.pending_operations` (local) | Sim | contagem de `SyncOperation` com `status != COMPLETED` |

**Ações disponíveis:**

| Ação | Perfil | Endpoint | Resultado |
|---|---|---|---|
| Sincronizar agora | TECHNICIAN | `POST /mobile/sync/push` + `GET /mobile/sync/pull?cursor=...` | Atualiza contadores e listas locais (ver seção 16) |
| Ler QR Code | TECHNICIAN | — (navegação) | Abre FE-M11 |
| Abrir uma inspeção | TECHNICIAN | — (navegação) | Abre FE-M06 |

---

### FE-M03 — Lista de inspeções

**Objetivo:** consultar todas as inspeções atribuídas ao técnico (UC-07, AC-MOBILE-LIST). **Usuários autorizados:** TECHNICIAN. **Rota:** `/(protected)/(tabs)/inspections`. **Pré-condições:** ao menos uma sincronização anterior bem-sucedida (senão lista vazia local).

**Dados exibidos:**

| Campo | Tipo | Origem | Obrigatório | Observações |
|---|---|---|---|---|
| `id` | UUID | `GET /mobile/inspections` (dados locais) | Sim | chave de navegação |
| `title` | string, nullable | idem | Não | fallback: nome do modelo/local |
| `status` | enum `InspectionStatus` | idem | Sim | badge (ver seção 17 para cor/rótulo por estado) |
| `priority` | enum | idem | Sim | badge |
| `scheduledFor` | date-time | idem | Sim | data formatada |
| Cliente/Local/Equipamento | string | idem (`clientId`/`siteId`/`equipmentId` resolvidos localmente) | Sim/Opcional | equipamento pode ser nulo |
| Indicador offline/pendente | derivado | `local_sync_status` (local) | Sim | não vem da API |

**Ações disponíveis:**

| Ação | Perfil | Endpoint | Resultado |
|---|---|---|---|
| Listar/atualizar | TECHNICIAN | `GET /mobile/inspections?status=&priority=&scheduledFrom=&scheduledTo=` | Popula/atualiza dados locais; API sempre escopa pelo usuário do token (não aceita `technicianId` externo) |
| Filtrar por estado/data/prioridade | TECHNICIAN | — (client-side sobre dados locais) | Não gera nova chamada de rede |
| Pesquisar localmente | TECHNICIAN | — (client-side) | **[A DEFINIR]** ver PEND-15 do documento 20 — não há parâmetro de busca textual no contrato |
| Abrir detalhe | TECHNICIAN | — (navegação) | Abre FE-M06 |

**Erros:** falha de rede na atualização não deve remover os dados já armazenados localmente (AC-MOBILE-LIST); ausência de inspeções é estado **vazio**, não erro.

---

### FE-M04 — Sincronização

**Objetivo:** dar visibilidade e controle sobre o estado de sincronização (RN-071, RN-072). **Usuários autorizados:** TECHNICIAN. **Rota:** `/(protected)/(tabs)/sync`. **Pré-condições:** sessão válida.

**Dados exibidos:**

| Campo | Tipo | Origem | Obrigatório |
|---|---|---|---|
| Última sincronização (data/resultado) | datetime + enum | `SyncMetadata.last_successful_sync`/`last_sync_result` (local) | Sim |
| Quantidade pendente | integer | contagem de `SyncOperation` locais | Sim |
| Operações com erro | array | `SyncOperation` com `status = FAILED` | Sim |
| Status por evidência | derivado | `Evidence` locais sem `uploadedAt` | Sim |

**Ações disponíveis:**

| Ação | Perfil | Endpoint | Payload | Response usado | Comportamento da UI |
|---|---|---|---|---|---|
| Sincronizar agora | TECHNICIAN | `POST /mobile/sync/push` | `SyncPushRequest{deviceId, lastPullCursor, operations[]}` (seção 5) | `SyncPushResponse.results[]` (por `operationId`) | Loading global; ao concluir, remove operações `APPLIED`/`ALREADY_APPLIED` da fila local; mantém `REJECTED`/`CONFLICT`/`DEPENDENCY_FAILED` visíveis com o erro |
| Baixar alterações | TECHNICIAN | `GET /mobile/sync/pull?cursor=...` | — | `SyncPullResponse.changes[]`, `nextCursor` | Cursor local só avança após gravação local bem-sucedida (RN-073) |
| Tentar novamente (item específico) | TECHNICIAN | mesmo endpoint de push, reenviando a operação com o mesmo `operationId` | — | — | Idempotente — nunca duplica (RN-068) |

---

### FE-M05 — Perfil

**Objetivo:** exibir dados da sessão e permitir logout. **Usuários autorizados:** TECHNICIAN. **Rota:** `/(protected)/(tabs)/profile`. **Pré-condições:** sessão válida.

**Dados exibidos:** nome, e-mail, perfil (`GET /auth/me` ou cache de `LoginResponse.user`), versão do aplicativo (local, não vem da API), identificador do dispositivo quando necessário (local).

**Ações disponíveis:**

| Ação | Perfil | Endpoint | Resultado |
|---|---|---|---|
| Sincronizar | TECHNICIAN | mesmo de FE-M04 | — |
| Sair | TECHNICIAN | `POST /auth/logout` | Remove tokens do Secure Store; navega para FE-M01. **[A DEFINIR]** comportamento quando existem operações pendentes na outbox no momento do logout — nenhum documento define se o logout é bloqueado, avisado ou silencioso nesse caso (ver PEND-F02) |

---

### FE-M06 — Detalhes da inspeção

**Objetivo:** apresentar a inspeção antes de iniciar, durante a execução ou após conclusão (UC-07, UC-09). **Usuários autorizados:** TECHNICIAN, somente a própria inspeção (RN-004, RN-033). **Rota:** `/(protected)/inspections/[inspectionId]/index`. **Pré-condições:** inspeção já baixada localmente (`GET /mobile/inspections/{inspectionId}` executado ao menos uma vez).

**Dados exibidos:**

| Campo | Tipo | Origem | Obrigatório |
|---|---|---|---|
| `title`, `instructions` | string | `InspectionDetail` (local) | Não/Não |
| Cliente, local, equipamento | string (resolvidos) | `clientId`/`siteId`/`equipmentId` | Sim/Sim/Opcional |
| `priority`, `status` | enum | `InspectionDetail` | Sim |
| `scheduledFor` | date-time | idem | Sim |
| Progresso (respondidos/total) | derivado | `items[]` × `responses[]` (cálculo client-side, RN-040) | Sim |
| Coordenadas de início/conclusão | decimal | `GeoLocation` embutido no payload de `start`/`submit` já confirmado | Não |

**Ações disponíveis:**

| Ação | Perfil | Endpoint | Payload | Comportamento da UI |
|---|---|---|---|---|
| Iniciar | TECHNICIAN, própria, `status=ASSIGNED` | `POST /inspections/{inspectionId}/start` (ou enfileirado na outbox se offline) | `StartInspectionRequest{startedAtDevice, location?}` | Sucesso online → `status: IN_PROGRESS`, navega para FE-M08; offline → grava local, marca "aguardando sincronização", navega igual |
| Continuar | TECHNICIAN, `status=IN_PROGRESS` | — (navegação) | — | Abre FE-M08 na última posição (retomada, RN — "permitir retomada de inspeção em andamento") |
| Corrigir | TECHNICIAN, `status=REJECTED`→volta a `IN_PROGRESS` na prática de execução | — (navegação) | — | Abre FE-M08 destacando `itemsToCorrect` (do último `RejectInspectionRequest`, obtido via `GET /inspections/{id}/reviews` ou embutido no `pull`) |
| Consultar (somente leitura) | TECHNICIAN, `status ∈ {SUBMITTED, UNDER_REVIEW, APPROVED, CANCELED}` | `GET /mobile/inspections/{inspectionId}` | — | Sem ações de edição disponíveis (ver seção 17) |

**Erros:** `403` se a inspeção não pertence ao técnico autenticado (AC-SECURITY); `404` se não encontrada; `409` se `start`/`submit` chamado em estado incompatível.

---

### FE-M07 — Iniciar inspeção

**Objetivo:** tela dedicada (ou modal, conforme decisão de implementação — a rota existe em `aplicativo-mobile.md` §13.3) de confirmação de início com captura de localização. **Usuários autorizados:** TECHNICIAN, própria inspeção. **Rota:** `/(protected)/inspections/[inspectionId]/start`. **Pré-condições:** `status = ASSIGNED`.

**Dados exibidos:** resumo da inspeção (mesmos campos de FE-M06), solicitação de permissão de localização.

**Ações disponíveis:**

| Ação | Perfil | Endpoint | Payload | Comportamento da UI |
|---|---|---|---|---|
| Confirmar início | TECHNICIAN | `POST /inspections/{inspectionId}/start` (ou outbox) | `{ startedAtDevice: now(), location: {latitude, longitude, accuracyMeters, capturedAt} }` (RN-061, RN-062) | Grava `startedAtDevice` local antes de qualquer chamada de rede; navega para FE-M08 |
| Continuar sem localização | TECHNICIAN | mesmo endpoint, `location` omitido | — | Permitido apenas se a política da inspeção permitir (RN — "localização negada: continuar somente se a política da inspeção permitir"); essa política em si não está parametrizada em nenhum DTO — **[A DEFINIR]**, ver PEND-F03 |

---

### FE-M08 — Checklist

**Objetivo:** núcleo do aplicativo — renderizar e responder o checklist dinâmico (UC-10, AC-CHECKLIST). **Usuários autorizados:** TECHNICIAN, própria inspeção, `status = IN_PROGRESS`. **Rota:** `/(protected)/inspections/[inspectionId]/checklist`. **Pré-condições:** inspeção iniciada.

**Dados exibidos:** seções e itens do `InspectionItemSnapshot[]` (agrupados por `sectionTitle`/`sectionOrder`, itens ordenados por `itemOrder`), resposta existente por item (`InspectionResponse`, 0..1 por item), indicador de obrigatoriedade (`required`), barra de progresso (derivada). Mapeamento completo tipo→componente: `contrato-backend-frontend.md` §4.2.

**Ações disponíveis:**

| Ação | Perfil | Endpoint | Payload | Comportamento da UI |
|---|---|---|---|---|
| Responder um item | TECHNICIAN | `PUT /inspections/{inspectionId}/responses/{responseId}` (`responseId` gerado no device; ou enfileirado na outbox se offline) | `InspectionResponseUpsertRequest{inspectionItemId, value*, observation?, conformity?, answeredAtDevice, baseVersion}` | Grava no SQLite **antes** de qualquer chamada de rede (RN-041); UI mostra "salvo no dispositivo" imediatamente, sem esperar a API; progresso recalculado |
| Adicionar observação (item não conforme com regra) | TECHNICIAN | mesmo endpoint acima | `observation` preenchido | Bloqueia avanço se a regra exigir e o campo estiver vazio (RN-038, validação client-side espelhando `422` do servidor) |
| Adicionar evidência ao item | TECHNICIAN | — (navegação) | — | Abre FE-M12 vinculado a este `responseId` |
| Registrar não conformidade | TECHNICIAN | — (navegação) | — | Abre FE-M10 vinculado a este item |
| Navegar para pendências | TECHNICIAN | — (client-side) | — | Rola até o primeiro item obrigatório sem resposta |

**Erros:** `400` valor inválido para o tipo (bloqueia localmente antes de chamar a API, mas a API também valida); `409` conflito de `baseVersion` (RN-075) ou inspeção bloqueada (RN-043/082) — não deve ocorrer em uso normal online, mas é possível após um `pull` trazer uma aprovação/reprovação concorrente; `422` observação exigida ausente.

---

### FE-M09 — Resumo e conclusão

**Objetivo:** revisar o checklist e confirmar a conclusão (UC-13, AC-COMPLETE). **Usuários autorizados:** TECHNICIAN, própria, `status = IN_PROGRESS`. **Rota:** `/(protected)/inspections/[inspectionId]/summary`. **Pré-condições:** inspeção iniciada.

**Dados exibidos:** total de itens, itens respondidos, itens obrigatórios pendentes (destacados), não conformidades registradas, evidências capturadas, localização (se já obtida no início).

**Ações disponíveis:**

| Ação | Perfil | Endpoint | Payload | Comportamento da UI |
|---|---|---|---|---|
| Concluir | TECHNICIAN | `POST /inspections/{inspectionId}/submit` (ou outbox) | `SubmitInspectionRequest{completedAtDevice, location?}` | Bloqueado no client-side (espelhando `422`) se houver item obrigatório pendente, observação exigida ausente ou evidência crítica ausente (RN-037/038/039); sucesso → `status: SUBMITTED`, respostas bloqueadas para edição comum, navega para FE-M06 mostrando "Aguardando sincronização" se offline |

---

### FE-M10 — Não conformidades (da inspeção)

**Objetivo:** listar e registrar não conformidades da inspeção corrente (UC-12). **Usuários autorizados:** TECHNICIAN, própria, `status = IN_PROGRESS`. **Rota:** `/(protected)/inspections/[inspectionId]/non-conformities`. **Pré-condições:** inspeção iniciada.

**Dados exibidos:** lista de NCs já registradas localmente/sincronizadas (`title`, `severity`, `status`, evidências vinculadas).

**Ações disponíveis:**

| Ação | Perfil | Endpoint | Payload | Comportamento da UI |
|---|---|---|---|---|
| Registrar NC | TECHNICIAN | `POST /inspections/{inspectionId}/non-conformities` (ou outbox) | `NonConformityCreateRequest{inspectionItemId?, responseId?, title, description, severity, createdAtDevice}` | `severity = CRITICAL` exige `description` preenchida e ao menos uma evidência antes de salvar (RN-055, validado client-side) |
| Adicionar evidência à NC | TECHNICIAN | — (navegação) | — | Abre FE-M12 vinculado a este `nonConformityId` |
| Editar NC | TECHNICIAN | `PUT /non-conformities/{id}` | `NonConformityUpdateRequest{title, description, severity}` | **[A DEFINIR]** — quem pode editar e em que estado não é normativamente definido (PEND-06 do documento 20); mantido aqui como ação plausível, não confirmada |

---

### FE-M11 — Scanner QR

**Objetivo:** identificar o equipamento por QR Code (UC-08). **Usuários autorizados:** TECHNICIAN. **Rota:** `/(protected)/scanner`. **Pré-condições:** permissão de câmera concedida.

**Dados exibidos:** viewfinder da câmera, indicador de processamento, dados do equipamento após leitura bem-sucedida.

**Ações disponíveis:**

| Ação | Perfil | Endpoint | Response usado | Comportamento da UI |
|---|---|---|---|---|
| Ler código | TECHNICIAN | `GET /equipment/by-qr/{qrCode}` (ou busca no snapshot local do equipamento já baixado, quando offline) | `Equipment{id, name, assetNumber, serialNumber, manufacturer, model, qrCode, status}` | Um único processamento por ciclo de confirmação (AC-QR); equipamento não localizado → mensagem clara, sem travar a tela |
| Confirmar vínculo | TECHNICIAN | — (client-side) | — | Compara `Equipment.id` lido com `Inspection.equipmentId` esperado; divergência exige confirmação explícita ou bloqueia, conforme regra da inspeção (RN-064) — a regra que decide "exigir confirmação" vs. "bloquear" não está parametrizada em nenhum DTO, **[A DEFINIR]** (PEND-F03, mesma lacuna de FE-M07) |
| Identificação manual | TECHNICIAN | — (formulário local, sem endpoint dedicado) | — | Somente quando a regra da inspeção permitir (RN-059); mecanismo de fallback não detalhado — **[A DEFINIR]** |

---

### FE-M12 — Captura de evidência

**Objetivo:** capturar/selecionar uma fotografia e vinculá-la a um item, resposta ou não conformidade (UC-11). **Usuários autorizados:** TECHNICIAN. **Rota:** `/(protected)/evidence/capture`. **Pré-condições:** permissão de câmera (ou galeria, se permitida) concedida; inspeção em estado editável.

**Dados exibidos:** viewfinder/seletor de galeria, campo de descrição opcional.

**Ações disponíveis:**

| Ação | Perfil | Endpoint | Payload | Comportamento da UI |
|---|---|---|---|---|
| Capturar/selecionar | TECHNICIAN | — (local, sem chamada ainda) | — | Navega para FE-M13 com a imagem em memória/URI local |
| Enviar (após confirmação em FE-M13) | TECHNICIAN | `POST /inspections/{inspectionId}/evidence` (multipart, ou enfileirado na outbox se offline) | ver seção 5 (campos completos) | Arquivo mantido localmente até `uploadedAt` confirmado (RN-047); UI mostra "pendente de envio" enquanto offline/na fila |

Detalhamento completo de upload (limites, formatos, retry): seção 15.

---

### FE-M13 — Prévia de evidência

**Objetivo:** confirmar ou refazer a captura antes de vincular. **Usuários autorizados:** TECHNICIAN. **Rota:** `/(protected)/evidence/preview`. **Pré-condições:** imagem capturada em FE-M12.

**Dados exibidos:** imagem em tela cheia, vínculo visível com o item/NC de origem.

**Ações disponíveis:**

| Ação | Perfil | Endpoint | Comportamento da UI |
|---|---|---|---|
| Confirmar | TECHNICIAN | dispara o `POST /inspections/{inspectionId}/evidence` descrito em FE-M12 | Volta para a tela de origem (FE-M08 ou FE-M10) com a evidência já listada como pendente/enviada |
| Refazer | TECHNICIAN | — (descarta e volta para FE-M12) | Nenhuma chamada de API |

---

### FE-M14 — Detalhes de sincronização

**Objetivo:** diagnóstico técnico da fila local, voltado a suporte (`aplicativo-mobile.md` §13.4). **Usuários autorizados:** TECHNICIAN. **Rota:** `/(protected)/sync/details`. **Pré-condições:** nenhuma além de sessão válida.

**Dados exibidos:** lista de `SyncOperation` locais com `operationId`, `entityType`, `status`, `attemptCount`, `lastError` (sanitizado — nunca token/senha, RN-007).

**Ações disponíveis:** nenhuma ação de escrita própria — tela somente leitura sobre dados locais; reenvio é disparado a partir de FE-M04.

## 3.2 Telas da interface administrativa (web)

### FE-W01 — Login (web)

**Objetivo:** autenticar ADMIN/SUPERVISOR. **Usuários autorizados:** Todos (a UI não restringe por perfil no login — a autorização por tela ocorre depois, seção 14). **Rota:** `/login`. **Pré-condições:** nenhuma.

**Dados exibidos:** e-mail, senha. **Ações disponíveis:**

| Ação | Perfil | Endpoint | Payload | Comportamento da UI |
|---|---|---|---|---|
| Entrar | Todos | `POST /auth/login` | `{ email, password }` | Sucesso → grava token (storage não deve ser desnecessariamente exposto, `arquitetura.md` §11.10), redireciona por perfil: ADMIN/SUPERVISOR → FE-W02; `401` → mensagem única, sem revelar qual campo está incorreto (AC-AUTH) |

---

### FE-W02 — Dashboard

**Objetivo:** visão geral para priorização (`interface-admnistrativa-web.md` §14.5). **Usuários autorizados:** ADMIN, SUPERVISOR. **Rota:** `/dashboard`. **Pré-condições:** sessão válida.

**Dados exibidos:**

| Campo | Tipo | Origem | Obrigatório |
|---|---|---|---|
| Totais por estado | `StatusCount[]` | `GET /dashboard/inspections-by-status` | Sim |
| Resumo (total, em andamento, aguardando revisão, atrasadas, aprovadas, reprovadas, NCs abertas) | `DashboardSummary` | `GET /dashboard/summary` | Sim |
| NCs por criticidade | `SeverityCount[]` | `GET /dashboard/non-conformities-by-severity` | Sim |

**Ações disponíveis:**

| Ação | Perfil | Endpoint | Resultado |
|---|---|---|---|
| Atalho "criar inspeção" | ADMIN, SUPERVISOR | — (navegação) | Abre FE-W19 |
| Atalho "revisar pendentes" | ADMIN, SUPERVISOR | — (navegação) | Abre FE-W18 pré-filtrada `status=SUBMITTED` |

---

### FE-W03 — Usuários (lista)

**Objetivo:** gerenciar usuários (UC-02). **Usuários autorizados:** ADMIN. **Rota:** `/users`. **Pré-condições:** sessão ADMIN.

**Dados exibidos (tabela):** ver seção 10.1. **Ações disponíveis:**

| Ação | Perfil | Endpoint | Payload | Comportamento da UI |
|---|---|---|---|---|
| Listar/filtrar/paginar | ADMIN | `GET /users?page=&size=&sort=&name=&email=&role=&status=` | — | Ver seção 9 (paginação padrão) |
| Abrir cadastro | ADMIN | — (navegação/modal) | — | Abre FE-W04 — **[A DEFINIR]** se modal ou rota |
| Ativar/inativar/bloquear | ADMIN | `PATCH /users/{id}/status` | `UserStatusUpdateRequest{status}` | Confirmação antes de executar (ação crítica, `interface-admnistrativa-web.md` §14.15); sucesso invalida sessões ativas do usuário (RN-008) — UI não recebe confirmação disso além do `200`, apenas deve informar que ocorreu |
| Redefinir senha | ADMIN | `POST /users/{id}/reset-password` | — | Exibe `ResetPasswordResponse.message`; **[PENDÊNCIA]** o mecanismo real (e-mail? senha temporária exibida uma vez?) não está definido — PEND-01 do documento 20 |

---

### FE-W04 — Usuário (cadastro/edição)

**Objetivo:** criar ou editar um usuário. **Usuários autorizados:** ADMIN. **Rota:** **[A DEFINIR]** — ver PEND-F01. **Pré-condições:** ao editar, usuário existente carregado via `GET /users/{id}`.

**Dados exibidos (edição):** `name`, `email`, `role`, `status` (somente leitura aqui — alterado por ação separada em FE-W03), `phone`.

**Ações disponíveis:**

| Ação | Perfil | Endpoint | Payload | Comportamento da UI |
|---|---|---|---|---|
| Salvar (criar) | ADMIN | `POST /users` | `UserCreateRequest{name, email, password, role, phone?}` | `409` se e-mail duplicado (AC-USERS); `422` erro de validação de negócio |
| Salvar (editar) | ADMIN | `PUT /users/{id}` | `UserUpdateRequest{name, email, role, phone?}` | `404` se removido por outra sessão |

Detalhamento do formulário: seção 9.1.

---

### FE-W05 — Clientes (lista)

**Objetivo:** gerenciar clientes (UC-03). **Usuários autorizados:** ADMIN (escrita), ADMIN+SUPERVISOR (leitura). **Rota:** `/clients`. **Pré-condições:** sessão válida.

**Ações disponíveis:**

| Ação | Perfil | Endpoint | Payload | Comportamento da UI |
|---|---|---|---|---|
| Listar/pesquisar | ADMIN, SUPERVISOR | `GET /clients?page=&size=&sort=` | — | AC-MASTER — pode ser pesquisado e filtrado |
| Abrir cadastro | ADMIN | — (navegação/modal) | — | Abre FE-W06 — **[A DEFINIR]** |
| Inativar/reativar | ADMIN | `PATCH /clients/{id}/status` | `StatusUpdateRequest{status}` | Cliente inativo não pode ser usado em nova inspeção (RN-013, AC-MASTER) |
| Acessar locais do cliente | ADMIN, SUPERVISOR | — (navegação) | — | Abre FE-W07 |

---

### FE-W06 — Cliente (cadastro/edição)

**Objetivo:** criar/editar cliente. **Usuários autorizados:** ADMIN. **Rota:** **[A DEFINIR]**. **Pré-condições:** ao editar, `GET /clients/{id}`.

**Ações disponíveis:**

| Ação | Perfil | Endpoint | Payload |
|---|---|---|---|
| Salvar (criar) | ADMIN | `POST /clients` | `ClientCreateRequest{name, legalName?, document?, email?, phone?}` |
| Salvar (editar) | ADMIN | `PUT /clients/{id}` | `ClientUpdateRequest` (mesmos campos) |

Formulário detalhado: seção 9.2.

---

### FE-W07 — Locais de um cliente

**Objetivo:** listar/criar locais no contexto de um cliente específico. **Usuários autorizados:** ADMIN, SUPERVISOR (leitura); ADMIN (escrita). **Rota:** `/clients/:clientId/sites`. **Pré-condições:** `clientId` válido.

**Ações disponíveis:**

| Ação | Perfil | Endpoint | Payload |
|---|---|---|---|
| Listar | ADMIN, SUPERVISOR | `GET /clients/{clientId}/sites` | — |
| Cadastrar local | ADMIN | `POST /sites` | `SiteCreateRequest{clientId (fixo=clientId da rota), name, description?, addressLine?, city?, state?, postalCode?, latitude?, longitude?, contactName?, contactPhone?}` |

---

### FE-W08 — Locais (lista)

**Objetivo:** gerenciar todos os locais (visão não encadeada). **Usuários autorizados:** ADMIN, SUPERVISOR (leitura); ADMIN (escrita). **Rota:** `/sites`. **Pré-condições:** sessão válida.

**Ações disponíveis:**

| Ação | Perfil | Endpoint | Payload |
|---|---|---|---|
| Listar | ADMIN, SUPERVISOR | `GET /sites?page=&size=&sort=` | — |
| Abrir cadastro | ADMIN | — (navegação/modal) | Abre FE-W09 — **[A DEFINIR]** |
| Inativar/reativar | ADMIN | `PATCH /sites/{id}/status` | `StatusUpdateRequest` |
| Ver equipamentos do local | ADMIN, SUPERVISOR | — (navegação) | Abre FE-W10 |

---

### FE-W09 — Local (cadastro/edição)

**Objetivo:** criar/editar local. **Usuários autorizados:** ADMIN. **Rota:** **[A DEFINIR]**.

**Ações disponíveis:**

| Ação | Perfil | Endpoint | Payload |
|---|---|---|---|
| Salvar (criar) | ADMIN | `POST /sites` | `SiteCreateRequest` (seção 9.3) |
| Salvar (editar) | ADMIN | `PUT /sites/{id}` | `SiteUpdateRequest` — **nota:** `clientId` não é editável (imutável após criação, decisão de normalização #6 do `openapi.yaml`) |

---

### FE-W10 — Equipamentos de um local

**Objetivo:** listar/criar equipamentos no contexto de um local específico. **Usuários autorizados:** ADMIN, SUPERVISOR. **Rota:** `/sites/:siteId/equipment`. **Pré-condições:** `siteId` válido.

**Ações disponíveis:**

| Ação | Perfil | Endpoint | Payload |
|---|---|---|---|
| Listar | ADMIN, SUPERVISOR | `GET /sites/{siteId}/equipment` | — |
| Cadastrar equipamento | ADMIN, SUPERVISOR | `POST /equipment` | `EquipmentCreateRequest{siteId (fixo=siteId da rota), name, qrCode, assetNumber?, serialNumber?, manufacturer?, model?, description?, installedAt?}` |

---

### FE-W11 — Equipamentos (lista)

**Objetivo:** gerenciar todos os equipamentos (visão não encadeada). **Usuários autorizados:** ADMIN, SUPERVISOR. **Rota:** `/equipment`. **Pré-condições:** sessão válida.

**Ações disponíveis:**

| Ação | Perfil | Endpoint | Payload |
|---|---|---|---|
| Listar | ADMIN, SUPERVISOR | `GET /equipment?page=&size=&sort=` | — |
| Buscar por QR | ADMIN, SUPERVISOR | `GET /equipment/by-qr/{qrCode}` | — |
| Abrir cadastro | ADMIN, SUPERVISOR | — (navegação/modal) | Abre FE-W12 — **[A DEFINIR]** |
| Inativar/reativar/descomissionar | ADMIN, SUPERVISOR | `PATCH /equipment/{id}/status` | `EquipmentStatusUpdateRequest{status}` (`ACTIVE\|INACTIVE\|DECOMMISSIONED`) |
| Ver histórico de inspeções | ADMIN, SUPERVISOR | *(P1 — `interface-admnistrativa-web.md` §14.7)* | — não integrado no MVP |

---

### FE-W12 — Equipamento (cadastro/edição)

**Objetivo:** criar/editar equipamento. **Usuários autorizados:** ADMIN, SUPERVISOR. **Rota:** **[A DEFINIR]**.

**Ações disponíveis:**

| Ação | Perfil | Endpoint | Payload |
|---|---|---|---|
| Salvar (criar) | ADMIN, SUPERVISOR | `POST /equipment` | `EquipmentCreateRequest` (seção 9.4) |
| Salvar (editar) | ADMIN, SUPERVISOR | `PUT /equipment/{id}` | `EquipmentUpdateRequest` — **nota:** `siteId` e `qrCode` não são editáveis após criação |

---

### FE-W13 — Modelos de inspeção (lista)

**Objetivo:** gerenciar modelos (UC-04). **Usuários autorizados:** ADMIN, SUPERVISOR. **Rota:** `/inspection-templates`. **Pré-condições:** sessão válida.

**Ações disponíveis:**

| Ação | Perfil | Endpoint | Payload |
|---|---|---|---|
| Listar/filtrar | ADMIN, SUPERVISOR | `GET /inspection-templates?category=&status=&page=&size=&sort=` | — |
| Criar novo | ADMIN, SUPERVISOR | `POST /inspection-templates` | `InspectionTemplateCreateRequest{title, description?, category}` |

---

### FE-W14 — Novo modelo

**Objetivo:** ponto de criação do modelo (`status = DRAFT`). **Usuários autorizados:** ADMIN, SUPERVISOR. **Rota:** `/inspection-templates/new`. **Pré-condições:** nenhuma.

**Ações disponíveis:**

| Ação | Perfil | Endpoint | Payload | Comportamento da UI |
|---|---|---|---|---|
| Criar | ADMIN, SUPERVISOR | `POST /inspection-templates` | `{title, description?, category}` | Sucesso `201` → redireciona para FE-W15 (`/inspection-templates/{id}/edit`) para montar seções/itens |

---

### FE-W15 — Editar modelo (construtor)

**Objetivo:** o construtor de checklist — a tela administrativa de maior complexidade (`interface-admnistrativa-web.md` §14.8). **Usuários autorizados:** ADMIN, SUPERVISOR. **Rota:** `/inspection-templates/:templateId/edit`. **Pré-condições:** modelo com `status = DRAFT` (RN-018 — versão rascunho editável); os endpoints de seção/item operam implicitamente sobre essa versão rascunho (decisão de normalização #3 do `openapi.yaml`).

**Dados exibidos:** `title`, `description`, `category` do modelo; lista de seções (`TemplateSection`, ordenadas por `displayOrder`) cada uma com sua lista de itens (`TemplateItem`, ordenados por `displayOrder`).

**Ações disponíveis:**

| Ação | Perfil | Endpoint | Payload | Comportamento da UI |
|---|---|---|---|---|
| Editar dados gerais | ADMIN, SUPERVISOR | `PUT /inspection-templates/{id}` | `InspectionTemplateUpdateRequest{title, description?, category}` | — |
| Criar seção | ADMIN, SUPERVISOR | `POST /inspection-templates/{id}/sections` | `TemplateSectionCreateRequest{title, description?, displayOrder}` | `409` se o modelo não tiver versão rascunho editável (RN-019) |
| Editar seção | ADMIN, SUPERVISOR | `PUT .../sections/{sectionId}` | `TemplateSectionUpdateRequest` (mesmos campos) | — |
| Reordenar seção | ADMIN, SUPERVISOR | `PUT .../sections/{sectionId}` (mudando `displayOrder`) | — | Arrastar-e-soltar é desejável mas não obrigatório — ordenação por botões "mover" ou campo numérico é aceitável (`interface-admnistrativa-web.md` §14.8, decisão de escopo) |
| Criar item | ADMIN, SUPERVISOR | `POST .../sections/{sectionId}/items` | `TemplateItemCreateRequest{code?, title, description?, responseType, required?, observationRequiredOnFailure?, evidenceRequiredOnFailure?, optionsJson?, displayOrder}` | `responseType` restrito aos 7 valores do MVP (RN-023) |
| Editar/reordenar item | ADMIN, SUPERVISOR | `PUT .../items/{itemId}` | `TemplateItemUpdateRequest` (mesmos campos) | — |
| Ver prévia | ADMIN, SUPERVISOR | — (navegação) | — | Abre FE-W16 |

Formulário de item detalhado: seção 9.5.

---

### FE-W16 — Prévia do modelo

**Objetivo:** validar o checklist antes de publicar (UC-04, passo 8). **Usuários autorizados:** ADMIN, SUPERVISOR. **Rota:** `/inspection-templates/:templateId/preview`. **Pré-condições:** modelo com ao menos uma seção.

**Dados exibidos:** renderização somente leitura de todas as seções/itens já criados, usando os mesmos componentes de tipo do mobile (`contrato-backend-frontend.md` §4.2) para simular a experiência do técnico. **Não há endpoint dedicado de "prévia"** — a tela monta a visualização a partir dos mesmos dados já obtidos em FE-W15 (`GET /inspection-templates/{id}` + seções/itens embutidos ou consultados à parte).

**Ações disponíveis:**

| Ação | Perfil | Endpoint | Payload | Comportamento da UI |
|---|---|---|---|---|
| Publicar versão | ADMIN, SUPERVISOR | `POST /inspection-templates/{id}/publish` | — (sem corpo) | `422` bloqueia com lista de pendências (sem título/categoria, sem seção, item sem `responseType` — RN-015/016); sucesso `201`/`200` → cria `InspectionTemplateVersion` imutável, redireciona para FE-W17 |

---

### FE-W17 — Versões do modelo

**Objetivo:** consultar histórico de publicações (RN-020, RN-022). **Usuários autorizados:** ADMIN, SUPERVISOR. **Rota:** `/inspection-templates/:templateId/versions`. **Pré-condições:** ao menos uma versão publicada para exibir conteúdo (senão estado vazio).

**Dados exibidos:** lista de `InspectionTemplateVersion` (`versionNumber`, `titleSnapshot`, `publishedBy`, `publishedAt`, `activeForNewInspections`).

**Ações disponíveis:**

| Ação | Perfil | Endpoint | Response usado |
|---|---|---|---|
| Listar versões | ADMIN, SUPERVISOR | `GET /inspection-templates/{id}/versions` | `InspectionTemplateVersionPage` |
| Ver detalhe de uma versão | ADMIN, SUPERVISOR | `GET /inspection-template-versions/{versionId}` | `InspectionTemplateVersionDetail{sections[].items[]}` |

Não há ação de edição nesta tela — versões publicadas são imutáveis (RN-019).

---

### FE-W18 — Inspeções (acompanhamento)

**Objetivo:** listagem administrativa central (UC-15, AC-ADMIN-MONITOR). **Usuários autorizados:** ADMIN, SUPERVISOR. **Rota:** `/inspections`. **Pré-condições:** sessão válida.

**Dados exibidos:** ver seção 10.6 (tabela completa). **Ações disponíveis:**

| Ação | Perfil | Endpoint | Comportamento da UI |
|---|---|---|---|
| Listar/filtrar | ADMIN, SUPERVISOR | `GET /inspections?page=&size=&sort=&status=&technicianId=&supervisorId=&clientId=&siteId=&equipmentId=&priority=&scheduledFrom=&scheduledTo=&overdue=` | Ver seção 9 |
| Criar nova | ADMIN, SUPERVISOR | — (navegação) | Abre FE-W19 |
| Abrir detalhe | ADMIN, SUPERVISOR | — (navegação) | Abre FE-W20 |
| Cancelar | ADMIN, SUPERVISOR | `POST /inspections/{id}/cancel` | Modal de confirmação com campo de justificativa obrigatório (ver seção 11) |

---

### FE-W19 — Nova inspeção

**Objetivo:** agendar e atribuir (UC-06, AC-SCHEDULING). **Usuários autorizados:** ADMIN, SUPERVISOR. **Rota:** `/inspections/new`. **Pré-condições:** existir ao menos um modelo publicado, um cliente ativo e um técnico ativo.

**Dados exibidos (para popular o formulário):** modelos publicados (`GET /inspection-templates?status=ACTIVE` + `GET .../versions`), clientes (`GET /clients`), locais filtrados por cliente (`GET /clients/{clientId}/sites`), equipamentos filtrados por local (`GET /sites/{siteId}/equipment`), técnicos ativos (`GET /users?role=TECHNICIAN&status=ACTIVE`).

**Ações disponíveis:**

| Ação | Perfil | Endpoint | Payload | Comportamento da UI |
|---|---|---|---|---|
| Agendar e atribuir | ADMIN, SUPERVISOR | `POST /inspections` | `InspectionCreateRequest` (seção 9.6) | `422` se versão não publicada, local fora do cliente, equipamento fora do local ou técnico inativo (AC-SCHEDULING); sucesso `201` → redireciona para FE-W20 |

Formulário detalhado (combos encadeados): seção 9.6.

---

### FE-W20 — Detalhe da inspeção

**Objetivo:** consultar/editar dados de planejamento de uma inspeção específica. **Usuários autorizados:** ADMIN, SUPERVISOR. **Rota:** `/inspections/:inspectionId`. **Pré-condições:** inspeção existente.

**Dados exibidos:** `InspectionDetail` completo (cabeçalho + `items[]` + `responses[]` + `nonConformities[]` + `reviews[]`).

**Ações disponíveis:**

| Ação | Perfil | Endpoint | Payload | Comportamento da UI |
|---|---|---|---|---|
| Atualizar planejamento | ADMIN, SUPERVISOR | `PUT /inspections/{id}` | `InspectionUpdateRequest{equipmentId?, title?, instructions?, priority, scheduledFor}` | Somente em `status ∈ {DRAFT, ASSIGNED}` — `409` fora disso (RN-089) |
| Reatribuir técnico | ADMIN, SUPERVISOR | `POST /inspections/{id}/assign` | `AssignInspectionRequest{technicianId}` | `422` se técnico inativo |
| Cancelar | ADMIN, SUPERVISOR | `POST /inspections/{id}/cancel` | `CancelInspectionRequest{reason}` | `409` se `status = APPROVED` (RN-030) |
| Ver histórico | ADMIN, SUPERVISOR | `GET /inspections/{id}/history` | — | Linha do tempo de `AuditEvent` |
| Ir para revisão | SUPERVISOR | — (navegação) | — | Abre FE-W21, disponível quando `status ∈ {SUBMITTED, UNDER_REVIEW}` |

---

### FE-W21 — Revisão da inspeção

**Objetivo:** revisar, aprovar ou reprovar (UC-16, UC-17, AC-REVIEW). **Usuários autorizados:** SUPERVISOR (RN-079). **Rota:** `/inspections/:inspectionId/review`. **Pré-condições:** `status ∈ {SUBMITTED, UNDER_REVIEW}`.

**Dados exibidos:** cabeçalho da inspeção, técnico e horários (`startedAtServer`/`submittedAtServer`), localização registrada (`GeoLocation` do `start`/`submit`), progresso, seções do checklist com resposta por item, observações, fotografias (`Evidence.accessUrl`), não conformidades, histórico de revisões anteriores (`GET .../reviews`).

**Ações disponíveis:**

| Ação | Perfil | Endpoint | Payload | Comportamento da UI |
|---|---|---|---|---|
| Iniciar revisão | SUPERVISOR | `POST /inspections/{id}/begin-review` | — | `status → UNDER_REVIEW`, ação auditada (RN-079); habilita aprovar/reprovar |
| Aprovar | SUPERVISOR | `POST /inspections/{id}/approve` | `ApproveInspectionRequest{comments?}` | Confirmação antes de executar (ação irreversível — `personas.md` "Marina" exige confirmação antes de decisões irreversíveis); sucesso → `status: APPROVED`, respostas/evidências somente leitura |
| Reprovar | SUPERVISOR | `POST /inspections/{id}/reject` | `RejectInspectionRequest{reason, itemsToCorrect?}` | `reason` obrigatório — botão desabilitado até preenchido (`400` do servidor se enviado vazio, AC-REVIEW); sucesso → `status: REJECTED` |

A interface **não permite** editar silenciosamente a resposta original do técnico (`interface-admnistrativa-web.md` §14.11) — não há endpoint de escrita de `InspectionResponse` disponível para SUPERVISOR (ver matriz de permissão, seção 14).

---

### FE-W22 — Não conformidades (lista)

**Objetivo:** consultar NCs de todas as inspeções (não apenas de uma). **Usuários autorizados:** ADMIN, SUPERVISOR. **Rota:** `/non-conformities`. **Pré-condições:** sessão válida.

**Ações disponíveis:**

| Ação | Perfil | Endpoint | Comportamento da UI |
|---|---|---|---|
| Listar/filtrar por criticidade | ADMIN, SUPERVISOR | `GET /non-conformities?severity=&page=&size=&sort=` | — |
| Consultar item relacionado | ADMIN, SUPERVISOR | — (navegação para FE-W20 da inspeção correspondente) | — |

O acompanhamento completo de plano de ação é P2 (`interface-admnistrativa-web.md` §14.12) — fora do escopo desta tela no MVP.

---

### FE-W23 — Auditoria

**Objetivo (pretendido):** consulta de eventos de auditoria em nível administrativo, fora do escopo de uma única inspeção. **Usuários autorizados:** ADMIN, SUPERVISOR (por analogia com `perfis-de-usuario.md` §5.2, "Consultar auditoria"). **Rota:** `/audit` (mapeada em `interface-admnistrativa-web.md` §14.3). **Pré-condições:** N/A.

**Status:** **[PENDÊNCIA]** — esta tela está prevista no mapa de navegação de origem, mas **não existe endpoint de auditoria global** em `openapi.yaml`/`api-rest.md` (apenas `GET /inspections/{inspectionId}/history`, escopado a uma inspeção — ver INC-05/PEND-08 do documento 20). Não é possível documentar dados exibidos, ações ou integração sem que essa lacuna seja resolvida primeiro. Recomenda-se que a equipe decida entre: (a) criar `GET /audit-events` com filtros administrativos, ou (b) remover esta rota do escopo do MVP e mantê-la como P1/P2. Repetida como PEND-F04 na seção 21.

---

# 4. Integração com a API — padrões transversais e visão por endpoint

A integração endpoint a endpoint de cada tela já está documentada dentro das tabelas "Ações disponíveis" da seção 3 (decisão editorial explicada no início dela). A tabela formal invertida (endpoint → telas consumidoras) está na seção 19. Esta seção 4 documenta apenas os **padrões que atravessam várias telas** e que, se documentados por tela, seriam repetidos dezenas de vezes.

## 4.1 Quando cada tipo de tela chama a API

| Tipo de tela | Momento da chamada |
|---|---|
| Listagens (web) | Ao montar a tela e a cada mudança de filtro/página/ordenação (`GET`, imediato — sem debounce definido em nenhum documento, **[A DEFINIR]** para busca textual quando existir, PEND-15 do documento 20) |
| Listagens (mobile) | Ao montar a tela, dados vêm do SQLite local; chamada de rede (`GET /mobile/inspections`) só ocorre em pull-to-refresh explícito ou como parte da sincronização (seção 16) |
| Detalhe (web) | Ao montar a tela (`GET` único) |
| Detalhe (mobile) | Uma vez, no momento do download (seção 16); depois, sempre lido do SQLite |
| Formulários de criação/edição | Ao submeter (não antes) — validação client-side ocorre antes de chamar a API, mas não substitui a validação do servidor (AC-SECURITY — "a interface não é utilizada como única barreira") |
| Ações de transição de estado (`start`, `submit`, `assign`, `cancel`, `begin-review`, `approve`, `reject`) | No clique do botão, após confirmação quando a ação for crítica (seção 11) |
| Combos encadeados (cliente→local→equipamento) | Ao selecionar o nível anterior — dispara nova consulta filtrada (`GET /clients/{clientId}/sites`, `GET /sites/{siteId}/equipment`) |

## 4.2 Interceptador de autenticação (toda chamada autenticada)

Todo endpoint protegido recebe `Authorization: Bearer <accessToken>` via interceptador único (`arquitetura.md` §11.5/11.6, `interface-admnistrativa-web.md` §14.14). Em `401`, o interceptador tenta uma renovação via `POST /auth/refresh` e repete a chamada original **uma única vez**; se a renovação falhar, redireciona ao login (web) ou preserva dados locais e solicita nova autenticação (mobile) — detalhado na seção 13.

## 4.3 Padrão de concorrência otimista (toda escrita com campo `version`)

Toda tela que edita uma entidade com campo `version` (`InspectionResponse`, `Inspection`, `User`, `Client`, `Site`, `Equipment`, `NonConformity`) deve enviar o `version`/`baseVersion` mais recente conhecido pelo cliente. Um `409` de conflito nunca deve ser resolvido automaticamente sobrescrevendo — a tela recarrega o dado atual e apresenta o conflito ao usuário (ver seção 8).

## 4.4 Padrão de paginação (toda listagem)

Documentado uma única vez na seção 9 do documento 20 (`contrato-backend-frontend.md`) e reaplicado sem alteração em toda listagem deste documento (`page`, `size`, `sort`, envelope `{page, size, totalElements, totalPages, content[]}`).

## 4.5 Padrão de erro (toda chamada)

Documentado uma única vez na seção 5 do documento 20 e reaplicado sem alteração — nenhuma tela tem tratamento de erro divergente do padrão, exceto onde citado explicitamente na seção 3 (ex.: mensagem única de "credenciais inválidas" no login).

---

# 5. Payloads enviados pelo frontend

Referência de campo completa para todo payload de escrita citado na seção 3. Formato do valor exato (tipo, `maxLength`, `nullable`) é normativo em `openapi.yaml` — reproduzido aqui campo a campo para consulta rápida sem abrir o YAML.

## 5.1 `POST /auth/login` — `LoginRequest`

| Campo | Tipo | Obrigatório | Origem | Regra |
|---|---|---|---|---|
| `email` | string (email) | Sim | Formulário | Formato de e-mail válido |
| `password` | string | Sim | Formulário | Não vazio |

## 5.2 Usuários — `UserCreateRequest` / `UserUpdateRequest` / `UserStatusUpdateRequest`

| Campo | Tipo | Obrigatório (create) | Obrigatório (update) | Origem | Regra |
|---|---|---|---|---|---|
| `name` | string (maxLength 150) | Sim | Sim | Formulário | — |
| `email` | string (email) | Sim | Sim | Formulário | Único (RN, AC-USERS) |
| `password` | string (minLength 8) | Sim | *(não editável aqui)* | Formulário | Só existe no create — troca de senha é via `reset-password`, não via `PUT` |
| `role` | enum `UserRole` | Sim | Sim | Select | `ADMIN\|SUPERVISOR\|TECHNICIAN\|CLIENT_VIEWER` |
| `phone` | string, nullable | Não | Não | Formulário | — |
| `status` (endpoint `PATCH .../status`) | enum `UserStatus` | — | Sim (endpoint próprio) | Select/ação | `ACTIVE\|INACTIVE\|BLOCKED`; troca para `INACTIVE`/`BLOCKED` invalida sessões (RN-008) |

## 5.3 Clientes — `ClientCreateRequest` / `ClientUpdateRequest`

| Campo | Tipo | Obrigatório | Origem | Regra |
|---|---|---|---|---|
| `name` | string (maxLength 150) | Sim | Formulário | RN-009 (todo local depende de um cliente válido) |
| `legalName` | string, nullable | Não | Formulário | — |
| `document` | string, nullable | Não | Formulário | Formato de documento não especificado — **[A DEFINIR]** |
| `email` | string (email), nullable | Não | Formulário | — |
| `phone` | string, nullable | Não | Formulário | — |

`ClientUpdateRequest` reutiliza exatamente os mesmos campos de `ClientCreateRequest` (`openapi.yaml`: `$ref`).

## 5.4 Locais — `SiteCreateRequest` / `SiteUpdateRequest`

| Campo | Tipo | Obrigatório (create) | Editável (update) | Origem | Regra |
|---|---|---|---|---|---|
| `clientId` | UUID | Sim | **Não** | Fixo pelo contexto de navegação (rota `/clients/:clientId/sites`) ou Select | Imutável após criação (decisão de normalização #6) |
| `name` | string (maxLength 150) | Sim | Sim | Formulário | — |
| `description` | string, nullable | Não | Sim | Formulário | — |
| `addressLine`, `city`, `state`, `postalCode` | string, nullable | Não | Sim | Formulário | — |
| `latitude`, `longitude` | decimal, nullable | Não | Sim | Mapa/manual | Coordenadas opcionais |
| `contactName`, `contactPhone` | string, nullable | Não | Sim | Formulário | — |

## 5.5 Equipamentos — `EquipmentCreateRequest` / `EquipmentUpdateRequest` / `EquipmentStatusUpdateRequest`

| Campo | Tipo | Obrigatório (create) | Editável (update) | Origem | Regra |
|---|---|---|---|---|---|
| `siteId` | UUID | Sim | **Não** | Fixo pelo contexto de navegação ou Select | Imutável após criação |
| `name` | string (maxLength 150) | Sim | Sim | Formulário | — |
| `qrCode` | string | Sim | **Não** | Formulário (ou leitura de câmera, se a web suportar — não documentado) | Único (RN-011); imutável após criação |
| `assetNumber`, `serialNumber`, `manufacturer`, `model`, `description` | string, nullable | Não | Sim | Formulário | — |
| `installedAt` | date, nullable | Não | Sim | DatePicker | — |
| `status` (endpoint próprio) | enum `EquipmentStatus` | — | Sim (endpoint próprio) | Select/ação | `ACTIVE\|INACTIVE\|DECOMMISSIONED` |

## 5.6 Modelo de inspeção — `InspectionTemplateCreateRequest` / `UpdateRequest`

| Campo | Tipo | Obrigatório | Origem | Regra |
|---|---|---|---|---|
| `title` | string (maxLength 200) | Sim | Formulário | RN-015 |
| `description` | string, nullable | Não | Formulário | — |
| `category` | string | Sim | Formulário (texto livre — nenhum documento define uma lista fechada de categorias, **[A DEFINIR]**) | RN-015 |

## 5.7 Seção do modelo — `TemplateSectionCreateRequest` / `UpdateRequest`

| Campo | Tipo | Obrigatório | Origem | Regra |
|---|---|---|---|---|
| `title` | string (maxLength 150) | Sim | Formulário | — |
| `description` | string, nullable | Não | Formulário | — |
| `displayOrder` | integer | Sim | Calculado (posição na lista) ou campo numérico manual | RN-017 — ordem explícita |

## 5.8 Item do modelo — `TemplateItemCreateRequest` / `UpdateRequest`

| Campo | Tipo | Obrigatório | Origem | Regra |
|---|---|---|---|---|
| `code` | string, nullable | Não | Formulário | Código legível opcional |
| `title` | string (maxLength 300) | Sim | Formulário | A pergunta/instrução |
| `description` | string, nullable | Não | Formulário | Texto de ajuda |
| `responseType` | enum `ResponseType` | Sim | Select | `TEXT_SHORT\|TEXT_LONG\|NUMBER\|BOOLEAN\|CONFORMITY\|SINGLE_CHOICE\|DATE` (RN-023) |
| `required` | boolean (default `false`) | Não | Checkbox | — |
| `observationRequiredOnFailure` | boolean (default `false`) | Não | Checkbox | RN-038 |
| `evidenceRequiredOnFailure` | boolean (default `false`) | Não | Checkbox | RN-039 |
| `optionsJson` | objeto livre, nullable | Não | Depende de `responseType` (ex.: editor de opções para `SINGLE_CHOICE`) | Formato interno **[A DEFINIR]** — PEND-03 do documento 20 |
| `displayOrder` | integer | Sim | Calculado/manual | RN-017 |

## 5.9 Agendamento de inspeção — `InspectionCreateRequest`

| Campo | Tipo | Obrigatório | Origem | Regra |
|---|---|---|---|---|
| `templateVersionId` | UUID | Sim | Select (modelo publicado + versão) | Deve ser versão `publicada` |
| `clientId` | UUID | Sim | Select | RN-025 |
| `siteId` | UUID | Sim | Select, filtrado por `clientId` selecionado | Deve pertencer ao `clientId` (RN-014) |
| `equipmentId` | UUID, nullable | Condicional | Select, filtrado por `siteId` selecionado | Obrigatório salvo quando o modelo é de local/ambiente (RN-026) — a UI precisa saber se o modelo exige equipamento; essa informação não está num campo explícito de `InspectionTemplate`/`Version`, **[A DEFINIR]** como o frontend decide se mostra o campo como obrigatório (PEND-F05) |
| `technicianId` | UUID | Sim | Select, filtrado por `role=TECHNICIAN&status=ACTIVE` | RN-027 |
| `supervisorId` | UUID, nullable | Não | Select | — |
| `title` | string, nullable | Não | Formulário | — |
| `instructions` | string, nullable | Não | Formulário | — |
| `priority` | enum `InspectionPriority` | Sim | Select | `LOW\|MEDIUM\|HIGH\|CRITICAL` |
| `scheduledFor` | date-time | Sim | DatePicker | — |

`InspectionUpdateRequest` reutiliza `equipmentId`, `title`, `instructions`, `priority`, `scheduledFor` (sem os campos imutáveis pós-criação).

## 5.10 Ações de transição de estado — payloads curtos

| Endpoint | DTO | Campo | Tipo | Obrigatório | Origem |
|---|---|---|---|---|---|
| `POST .../assign` | `AssignInspectionRequest` | `technicianId` | UUID | Sim | Select |
| `POST .../cancel` | `CancelInspectionRequest` | `reason` | string (minLength 1) | Sim | Formulário/modal |
| `POST .../start` | `StartInspectionRequest` | `startedAtDevice` | date-time | Não (opcional no schema, mas preenchido automaticamente pelo app com `now()`) | Gerado pelo app |
| | | `location` | `GeoLocation` | Não | GPS do dispositivo |
| `POST .../submit` | `SubmitInspectionRequest` | `completedAtDevice` | date-time | **Sim** | Gerado pelo app |
| | | `location` | `GeoLocation`, opcional | Não | GPS do dispositivo |
| `POST .../begin-review` | *(sem corpo)* | — | — | — | — |
| `POST .../approve` | `ApproveInspectionRequest` | `comments` | string, nullable | Não | Formulário |
| `POST .../reject` | `RejectInspectionRequest` | `reason` | string (minLength 1) | **Sim** | Formulário — `400` se ausente |
| | | `itemsToCorrect` | array de UUID | Não | Seleção de itens na tela de revisão |

`GeoLocation`: `{ latitude: number, longitude: number, accuracyMeters?: number, capturedAt: date-time }` — `latitude`, `longitude`, `capturedAt` obrigatórios quando o objeto é enviado (RN-062).

## 5.11 Resposta do checklist — `InspectionResponseUpsertRequest`

| Campo | Tipo | Obrigatório | Origem | Regra |
|---|---|---|---|---|
| `inspectionItemId` | UUID | Sim | Fixo (item sendo respondido) | Deve pertencer ao snapshot da própria inspeção |
| `valueText` | string, nullable | Condicional | Input | Preenchido quando `responseType ∈ {TEXT_SHORT, TEXT_LONG}` |
| `valueNumber` | number, nullable | Condicional | Input numérico | `responseType = NUMBER` |
| `valueBoolean` | boolean, nullable | Condicional | Seletor Sim/Não | `responseType = BOOLEAN` (e opcionalmente junto de `CONFORMITY`) |
| `valueDate` | date, nullable | Condicional | DatePicker | `responseType = DATE` |
| `valueJson` | objeto livre, nullable | Condicional | Seleção única | `responseType = SINGLE_CHOICE` — formato **[A DEFINIR]** (PEND-03) |
| `observation` | string, nullable | Condicional | Textarea | Obrigatório quando `conformity = NON_CONFORMING` e o item exige observação (RN-038) |
| `conformity` | enum `Conformity`, nullable | Condicional | Seletor | `NOT_APPLICABLE\|CONFORMING\|NON_CONFORMING`, usado quando `responseType = CONFORMITY` |
| `answeredAtDevice` | date-time | Sim | Gerado pelo app | Hora do dispositivo no momento da resposta |
| `baseVersion` | integer | Sim | Última versão conhecida pelo cliente (`0` na primeira resposta) | RN-075 — controle de concorrência |

## 5.12 Upload de evidência — `EvidenceUploadRequest` (multipart)

| Campo | Tipo | Obrigatório | Origem | Regra |
|---|---|---|---|---|
| `idempotencyKey` | UUID | Sim | Gerado pelo app | RN-067/068 |
| `type` | enum `EvidenceType` | Sim | Fixo `PHOTO` no MVP | — |
| `capturedAtDevice` | date-time | Sim | Gerado pelo app no momento da captura | — |
| `file` | binary | Sim | Câmera/galeria | Ver limites na seção 15 |
| `responseId` | UUID, nullable | Não | Fixo (contexto de origem — item do checklist) | Mutuamente relacionado com `nonConformityId` |
| `nonConformityId` | UUID, nullable | Não | Fixo (contexto de origem — NC) | idem |
| `description` | string, nullable | Não | Formulário | — |
| `latitude`, `longitude` | decimal, nullable | Não | GPS do dispositivo | — |

## 5.13 Não conformidade — `NonConformityCreateRequest` / `UpdateRequest`

| Campo | Tipo | Obrigatório | Origem | Regra |
|---|---|---|---|---|
| `inspectionItemId` | UUID, nullable | Não | Fixo (se originada de um item) | RN-053 |
| `responseId` | UUID, nullable | Não | Fixo (se originada de uma resposta) | — |
| `title` | string (maxLength 200) | Sim | Formulário | — |
| `description` | string | Sim | Formulário | Obrigatória quando `severity = CRITICAL` (RN-055) |
| `severity` | enum `Severity` | Sim | Select | `LOW\|MEDIUM\|HIGH\|CRITICAL` |
| `createdAtDevice` | date-time | Sim (create) | Gerado pelo app | — |

`NonConformityUpdateRequest` reutiliza `title`, `description`, `severity`.

## 5.14 Sincronização — `SyncPushRequest`

| Campo | Tipo | Obrigatório | Origem |
|---|---|---|---|
| `deviceId` | UUID | Sim | Gerado/persistido no dispositivo na instalação |
| `lastPullCursor` | string, nullable | Não | `SyncMetadata` local |
| `operations` | array de `SyncOperationRequest` | Sim | Outbox local |

Campos de cada `SyncOperationRequest` (`operationId`, `entityType`, `entityId`, `operationType`, `baseVersion`, `payload`): detalhados em `contrato-backend-frontend.md` §11.4 — não repetidos aqui porque não são preenchidos por um formulário, e sim montados automaticamente pela camada de outbox a partir das próprias ações desta seção 5 (cada `PUT .../responses/{id}`, `POST .../evidence` etc. executado offline vira um `SyncOperationRequest` com o mesmo payload que teria ido direto ao endpoint correspondente).

---

# 6. Responses utilizados pelas telas

Mapeamento campo → uso na UI, para as respostas mais consumidas. Campos `readOnly` do schema (não citados aqui) que não aparecem em nenhuma tela foram omitidos para não inflar a tabela sem propósito prático.

## 6.1 `User` — FE-W03, FE-W04, seletor de técnico em FE-W19

| Campo da API | Utilização na UI |
|---|---|
| `id` | Chave de linha/seleção |
| `name` | Coluna "Nome"; label do seletor de técnico |
| `email` | Coluna "E-mail" |
| `role` | Coluna "Perfil" (badge); filtro de seletor de técnico (`role=TECHNICIAN`) |
| `status` | Coluna "Situação" (badge); habilita/desabilita ações; filtro de seletor de técnico (`status=ACTIVE`) |
| `phone` | Campo de detalhe/edição |
| `createdAt`/`updatedAt` | Ordenação padrão (`sort=createdAt,desc`) |

## 6.2 `Client` — FE-W05, FE-W06, seletor de cliente em FE-W19

| Campo da API | Utilização na UI |
|---|---|
| `id` | Chave/seleção; filtro encadeado para `GET /clients/{id}/sites` |
| `name` | Coluna "Nome"; label do seletor |
| `legalName`, `document`, `email`, `phone` | Campos de detalhe/edição |
| `status` | Badge; cliente `INACTIVE` fica oculto/desabilitado no seletor de agendamento (RN-013) |

## 6.3 `InspectionSite` — FE-W07, FE-W08, FE-W09, seletor de local em FE-W19

| Campo da API | Utilização na UI |
|---|---|
| `id` | Chave/seleção; filtro encadeado para `GET /sites/{id}/equipment` |
| `clientId` | Confirma a que cliente pertence (não editável na tela de edição) |
| `name` | Coluna "Nome"; label do seletor |
| `addressLine`, `city`, `state`, `postalCode` | Coluna "Endereço" / detalhe |
| `latitude`, `longitude` | Exibição em mapa, quando presente |
| `contactName`, `contactPhone` | Detalhe |
| `status` | Badge; local `INACTIVE` oculto/desabilitado no seletor de agendamento |

## 6.4 `Equipment` — FE-W10, FE-W11, FE-W12, seletor de equipamento em FE-W19, FE-M11 (scanner)

| Campo da API | Utilização na UI |
|---|---|
| `id` | Chave/seleção |
| `siteId` | Confirma a que local pertence |
| `name` | Coluna "Nome"; label do seletor |
| `assetNumber`, `serialNumber`, `manufacturer`, `model` | Colunas de detalhe |
| `qrCode` | Exibido no cadastro; usado para o `GET /equipment/by-qr/{qrCode}` do scanner mobile |
| `status` | Badge; `INACTIVE`/`DECOMMISSIONED` oculto/desabilitado no seletor de agendamento (RN-012) |
| `installedAt` | Detalhe |

## 6.5 `InspectionTemplate` / `InspectionTemplateVersion` — FE-W13 a FE-W17, seletor de modelo em FE-W19

| Campo da API | Utilização na UI |
|---|---|
| `id` (template) | Chave; navegação para construtor |
| `title`, `description`, `category` | Coluna/cabeçalho; filtro `category` |
| `status` (`TemplateStatus`) | Badge; filtro |
| `currentVersion` | Indicador "versão atual" na listagem |
| `versionNumber`, `titleSnapshot`, `publishedAt`, `publishedBy` | Linha da tabela de versões (FE-W17) |
| `activeForNewInspections` | Determina se a versão aparece no seletor de FE-W19 |
| `sections[].items[]` (via `InspectionTemplateVersionDetail`) | Renderização da prévia (FE-W16) e do construtor (FE-W15) |

## 6.6 `Inspection` / `InspectionDetail` — FE-W18, FE-W19→FE-W20, FE-W20, FE-W21, FE-M02, FE-M03, FE-M06 a FE-M10

| Campo da API | Utilização na UI |
|---|---|
| `id` | Chave/navegação |
| `title` | Título de cabeçalho/cartão |
| `clientId`/`siteId`/`equipmentId` | Resolvidos para nome em coluna/detalhe |
| `technicianId`/`supervisorId` | Coluna "Técnico"/"Supervisor" |
| `priority` | Badge de prioridade |
| `status` | Badge de estado (ver seção 17 para rótulo/ações por estado) |
| `scheduledFor` | Coluna "Data prevista"; base do cálculo de "atrasada" |
| `startedAtDevice`/`startedAtServer` | Detalhe/revisão — horários de início |
| `completedAtDevice`/`submittedAtServer` | Detalhe/revisão — horários de conclusão |
| `approvedAt`, `canceledAt`, `canceledBy`, `canceledReason` | Detalhe, quando aplicável |
| `instructions` | Exibido no detalhe mobile antes do início |
| `items[]` (snapshot) | Renderização do checklist (FE-M08) e da revisão (FE-W21) |
| `responses[]` | Idem — resposta por item |
| `nonConformities[]` | Lista de NCs no detalhe/revisão |
| `reviews[]` | Histórico de ciclos de revisão (FE-W21, FE-M06) |
| `version` | Usado como `baseVersion` em próxima atualização |

## 6.7 `Evidence` — FE-W21 (galeria de fotos), FE-M08/FE-M10 (indicador de pendência), FE-M12/FE-M13

| Campo da API | Utilização na UI |
|---|---|
| `id` | Chave |
| `responseId`/`nonConformityId` | Determina onde a miniatura aparece agrupada |
| `accessUrl` | `src` da imagem/miniatura (URL temporária) |
| `mimeType`, `sizeBytes` | Validação/exibição de metadados técnicos (FE-M14) |
| `capturedAtDevice` | Legenda da foto |
| `uploadedAt` | Presente = "sincronizada"; ausente = "pendente" (ícone de status) |
| `description` | Legenda editável |

## 6.8 `NonConformity` — FE-W22, FE-M10, seção de NCs em FE-W20/FE-W21

| Campo da API | Utilização na UI |
|---|---|
| `id` | Chave |
| `title`, `description` | Texto principal do cartão/linha |
| `severity` | Badge de criticidade; filtro em FE-W22 |
| `status` | Badge (único valor `OPEN` no MVP) |
| `inspectionItemId`/`responseId` | Link para o item de origem no checklist |
| `createdAtDevice` | Data exibida |

## 6.9 `InspectionReview` — FE-W21, FE-M06 (pós-reprovação)

| Campo da API | Utilização na UI |
|---|---|
| `decision` | Badge `APROVADA`/`REPROVADA` |
| `reason` | Exibido com destaque quando `decision = REJECTED` |
| `comments` | Texto complementar |
| `reviewerId` | Resolvido para nome do supervisor |
| `reviewedAt` | Data do ciclo |
| `reviewCycle` | Numeração da linha do tempo de revisões |

## 6.10 `AuditEvent` — FE-W20 (histórico), FE-M06 (indiretamente, via mudança de estado)

| Campo da API | Utilização na UI |
|---|---|
| `action` | Texto/ícone do evento na linha do tempo |
| `actorId` | Resolvido para nome do ator, quando presente |
| `occurredAt` | Data/hora do evento |
| `previousValueJson`/`newValueJson` | Exibidos apenas em modo de detalhe expandido (não obrigatório na visão padrão) |

## 6.11 `DashboardSummary` / `StatusCount` / `SeverityCount` — FE-W02

| Campo da API | Utilização na UI |
|---|---|
| `totalInspections`, `inspectionsInProgress`, `inspectionsPendingReview`, `inspectionsOverdue`, `inspectionsApproved`, `inspectionsRejected`, `nonConformitiesOpen` | Cada um vira um cartão numérico |
| `StatusCount[].{status,count}` | Gráfico/lista de distribuição por estado |
| `SeverityCount[].{severity,count}` | Gráfico/lista de distribuição por criticidade |

---

# 7. Fluxo de cada tela

## 7.1 Fluxo genérico de listagem (aplica-se, sem alteração, a FE-W03, FE-W05, FE-W07, FE-W08, FE-W10, FE-W11, FE-W13, FE-W17, FE-W18, FE-W22, FE-M03)

```text
Usuário acessa a tela
       ↓
Frontend verifica autenticação (interceptador, seção 4.2)
       ↓
Frontend verifica permissão da rota (guard, seção 14)
       ↓
Frontend chama GET .../recurso?page=&size=&sort=&<filtros>
       ↓
Backend retorna página (200) ou erro (401/403/500)
       ↓
Frontend renderiza tabela/lista OU estado vazio (totalElements = 0) OU estado de erro
       ↓
Usuário muda filtro/página/ordenação
       ↓
Frontend repete a chamada GET com os novos parâmetros
```

## 7.2 Fluxo genérico de formulário de cadastro (aplica-se a FE-W04, FE-W06, FE-W09, FE-W12, sem alteração)

```text
Usuário abre "novo"/"editar"
       ↓
(edição) Frontend chama GET .../{id} para carregar valores atuais
       ↓
Frontend renderiza formulário com validação client-side (seção 9)
       ↓
Usuário preenche e confirma
       ↓
Frontend valida localmente (campos obrigatórios, formato)
       ↓
Frontend envia POST (criar) ou PUT (editar)
       ↓
Backend retorna 200/201 (sucesso) ou 400/409/422 (erro)
       ↓
Sucesso → frontend atualiza a lista/tela de origem e navega de volta
Erro → frontend exibe mensagem junto ao campo (fieldErrors) ou mensagem geral
```

## 7.3 FE-W01/FE-M01 — Login

```text
Usuário informa e-mail/senha
       ↓
Frontend valida formato dos campos
       ↓
Frontend chama POST /auth/login
       ↓
   ┌── 200: grava tokens (Secure Store no mobile) → redireciona por perfil
   └── 401: exibe mensagem única de erro, mantém campos preenchidos (exceto senha)
```

## 7.4 FE-M08 — Checklist (resposta a um item)

```text
Técnico abre um item do checklist
       ↓
Frontend renderiza o componente conforme responseType (contrato-backend-frontend.md §4.2)
       ↓
Técnico informa o valor
       ↓
Frontend valida o valor localmente (tipo, obrigatoriedade, observação exigida)
       ↓
Frontend grava a resposta no SQLite imediatamente (RN-041)
       ↓
Frontend atualiza a barra de progresso
       ↓
   ┌── Online:  PUT /inspections/{id}/responses/{responseId} disparado em paralelo/logo em seguida
   │      ┌── 200: marca "sincronizado"
   │      └── 400/409/422: mantém "salvo no dispositivo", mostra indicador de pendência/conflito
   └── Offline: cria/atualiza operação na outbox (SyncOperation), marca "aguardando envio"
```

## 7.5 FE-M09 → FE-M06 — Conclusão da inspeção

```text
Técnico abre o resumo (FE-M09)
       ↓
Frontend calcula localmente: itens obrigatórios pendentes, observações/evidências exigidas ausentes
       ↓
   ┌── Pendências existem: botão "Concluir" desabilitado, lista de pendências destacada
   └── Sem pendências: botão "Concluir" habilitado
       ↓
Técnico confirma a conclusão
       ↓
Frontend registra completedAtDevice
       ↓
   ┌── Online:  POST /inspections/{id}/submit
   │      ┌── 200: status → SUBMITTED, navega para FE-M06 mostrando "Enviada"
   │      └── 409/422: mantém em IN_PROGRESS, exibe erro específico
   └── Offline: enfileira operação de submit, marca "Aguardando sincronização" (fluxo-geral.md §7.6, nota)
```

## 7.6 FE-M04 — Sincronização (ciclo completo)

```text
Conectividade disponível (detectada) ou usuário toca "Sincronizar agora"
       ↓
Frontend seleciona operações pendentes da outbox
       ↓
Frontend ordena por dependência (ex.: resposta antes da foto vinculada a ela)
       ↓
Frontend chama POST /mobile/sync/push com o lote
       ↓
Backend retorna resultado individual por operação
       ↓
Frontend remove da outbox as operações APPLIED/ALREADY_APPLIED
Frontend mantém pendentes as REJECTED/CONFLICT/DEPENDENCY_FAILED, com erro visível
       ↓
Frontend chama GET /mobile/sync/pull?cursor=<último cursor>
       ↓
Backend retorna changes[] + nextCursor
       ↓
Frontend grava as mudanças no SQLite em transação
       ↓
Frontend só avança o cursor local após a gravação ser bem-sucedida (RN-073)
       ↓
Frontend atualiza SyncMetadata (last_successful_sync, last_sync_result)
```

## 7.7 FE-W15/FE-W16 — Construtor de modelo até a publicação

```text
Supervisor cria seções (POST .../sections) e itens (POST .../sections/{id}/items)
       ↓
Frontend mantém a árvore seção→item sincronizada com cada resposta 201/200
       ↓
Supervisor abre a prévia (FE-W16) — renderização client-side, sem chamada nova
       ↓
Supervisor confirma publicação
       ↓
Frontend chama POST /inspection-templates/{id}/publish
       ↓
   ┌── 201/200: nova InspectionTemplateVersion criada → navega para FE-W17
   └── 422: exibe lista de pendências (sem seção, item sem responseType etc.) sem sair da tela
```

## 7.8 FE-W19 — Nova inspeção (agendamento com combos encadeados)

```text
Frontend carrega modelos publicados, clientes e técnicos ativos (chamadas paralelas)
       ↓
Supervisor seleciona cliente
       ↓
Frontend chama GET /clients/{clientId}/sites e popula o seletor de local
       ↓
Supervisor seleciona local
       ↓
Frontend chama GET /sites/{siteId}/equipment e popula o seletor de equipamento (quando aplicável)
       ↓
Supervisor completa técnico, prioridade, data, instruções
       ↓
Supervisor confirma
       ↓
Frontend chama POST /inspections
       ↓
   ┌── 201: snapshot já vem no InspectionDetail retornado → navega para FE-W20
   └── 422: exibe a regra violada (versão não publicada / local fora do cliente / equipamento fora do local / técnico inativo)
```

## 7.9 FE-W21 — Revisão até decisão

```text
Supervisor abre a inspeção em SUBMITTED
       ↓
Frontend chama GET /inspections/{id} + GET /inspections/{id}/reviews
       ↓
Supervisor clica "Iniciar revisão"
       ↓
Frontend chama POST /inspections/{id}/begin-review → status: UNDER_REVIEW
       ↓
Supervisor navega pelas seções, analisa respostas/evidências/NCs
       ↓
   ┌── Aprovar: modal de confirmação → POST .../approve → status: APPROVED, tela vira somente leitura
   └── Reprovar: modal exige "reason" → POST .../reject → status: REJECTED
```

---

# 8. Estados da interface

Toda tela de dados (web ou mobile) deve tratar os estados abaixo (`interface-admnistrativa-web.md` §14.15, `aplicativo-mobile.md` §13.8, RNF-004). O que muda de tela para tela é **o que fica disponível** em cada estado, não a lista de estados em si.

| Estado | Gatilho | O que aparece | Ações disponíveis |
|---|---|---|---|
| **Loading** | Requisição em andamento (1ª carga) | Skeleton/spinner | Nenhuma ação de escrita |
| **Success (com dados)** | `200` com `content`/corpo não vazio | Dados renderizados | Todas as ações do perfil |
| **Success (vazio)** | `200` com `totalElements = 0` ou array vazio | Estado vazio ilustrado, **nunca tratado como erro** (AC-MOBILE-LIST) | Ação de criar, quando o perfil permite |
| **Unauthorized (401)** | Sessão ausente/expirada | Web: redireciona ao login. Mobile: tenta refresh silencioso; se falhar, preserva dados locais e pede nova autenticação (seção 13) | — |
| **Forbidden (403)** | Autenticado sem permissão, ou recurso de outro técnico | Mensagem de acesso negado, sem detalhar o recurso | Voltar |
| **Not Found (404)** | Recurso inexistente ou não visível | Mensagem "não encontrado" | Voltar |
| **Validation Error (400/422 com `fieldErrors`)** | Payload rejeitado | Mensagem por campo (`fieldErrors[].field/.message`) + mensagem geral (`message`) | Corrigir e reenviar; nada é perdido do formulário |
| **Conflict (409)** | Versão otimista divergente, transição de estado inválida, ou unicidade violada | Mensagem específica; **nunca sobrescreve silenciosamente** — recarrega o dado atual antes de permitir nova tentativa | Recarregar/tentar novamente |
| **Offline** *(mobile)* | Sem conectividade detectada | Banner persistente "sem conexão"; dados locais continuam navegáveis | Todas as ações que gravam local primeiro (checklist, evidência, NC, início, conclusão) permanecem disponíveis; ações que dependem de rede direta (`GET /equipment/by-qr` sem cache, `GET /dashboard/*`) ficam indisponíveis |
| **Synchronizing** *(mobile)* | `POST /mobile/sync/push`/`GET .../pull` em andamento | Indicador de progresso na tela de sync (FE-M04) e badge global | Ações do checklist continuam liberadas (grava local); usuário pode navegar para outras telas |
| **Synchronization Error** *(mobile)* | Uma ou mais operações retornaram `REJECTED`/`CONFLICT`/`DEPENDENCY_FAILED`, ou falha de rede total | Lista de erros em FE-M04/FE-M14 com `lastError` sanitizado | "Tentar novamente"; dados locais nunca são descartados (RN-070, RN-077) |
| **Processando (ação em andamento)** | Botão de ação crítica clicado (`start`, `submit`, `approve`, `reject`, `cancel`, `assign`) | Botão desabilitado/spinner — previne duplo envio | Nenhuma repetição da mesma ação até resposta |
| **Confirmação de sucesso** | `200`/`201`/`204` de uma ação de escrita | Toast/mensagem de confirmação | Navegação para o próximo passo (seção 3, coluna "próximas telas") |

**Exceções por tela** (além do padrão acima):
- FE-M03/FE-M06: falha de atualização (`GET /mobile/inspections*`) **não** deve remover dados já armazenados localmente — é tratada como "erro" apenas quanto ao indicador de rede, não como estado vazio (AC-MOBILE-LIST).
- FE-W21: `409` em `approve`/`reject`/`begin-review` (transição de estado inválida — ex.: outro supervisor já decidiu) deve recarregar a inspeção antes de permitir nova ação, já que o estado pode ter mudado.
- FE-M08: `422` (observação exigida ausente) é tratado como **Validation Error local** — a UI deve bloquear antes mesmo de chamar a API, então esse `422` só ocorre se a validação client-side estiver desatualizada em relação ao servidor.

---

# 9. Formulários

Mapeamento campo → componente de UI. O contrato de dados (tipo/obrigatoriedade/regra) de cada campo já está na seção 5 — aqui documenta-se apenas a camada de widget/interação.

## 9.1 FE-W04 — Formulário de usuário

| Campo | Componente | Tipo | Obrigatório | Valor inicial | Origem das opções | Endpoint |
|---|---|---|---|---|---|---|
| Nome | Input texto | string | Sim | vazio / valor atual | — | `POST /users` / `PUT /users/{id}` |
| E-mail | Input texto (email) | string | Sim | vazio / valor atual | — | idem |
| Senha | Input senha | string | Sim (só na criação) | vazio | — | `POST /users` |
| Perfil | Select | enum | Sim | vazio / valor atual | Lista fixa `UserRole` | idem |
| Telefone | Input texto (máscara de telefone — não especificada, **[A DEFINIR]**) | string | Não | vazio / valor atual | — | idem |

## 9.2 FE-W06 — Formulário de cliente

| Campo | Componente | Tipo | Obrigatório | Origem das opções | Endpoint |
|---|---|---|---|---|---|
| Nome | Input texto | string | Sim | — | `POST /clients` / `PUT /clients/{id}` |
| Razão social | Input texto | string | Não | — | idem |
| Documento | Input texto (máscara de CNPJ/CPF — não especificada, **[A DEFINIR]**) | string | Não | — | idem |
| E-mail | Input texto (email) | string | Não | — | idem |
| Telefone | Input texto | string | Não | — | idem |

## 9.3 FE-W09 — Formulário de local

| Campo | Componente | Tipo | Obrigatório | Dependência | Endpoint |
|---|---|---|---|---|---|
| Cliente | Select (somente na criação; fixo/somente leitura na edição) | UUID | Sim (criação) | `GET /clients` | `POST /sites` |
| Nome | Input texto | string | Sim | — | `POST /sites` / `PUT /sites/{id}` |
| Descrição | Textarea | string | Não | — | idem |
| Endereço/Cidade/Estado/CEP | Input texto | string | Não | — | idem |
| Latitude/Longitude | Input numérico ou seletor de mapa (não especificado qual, **[A DEFINIR]**) | decimal | Não | — | idem |
| Contato (nome/telefone) | Input texto | string | Não | — | idem |

## 9.4 FE-W12 — Formulário de equipamento

| Campo | Componente | Tipo | Obrigatório | Dependência | Endpoint |
|---|---|---|---|---|---|
| Local | Select (somente na criação; fixo na edição) | UUID | Sim (criação) | `GET /sites` ou contexto de navegação | `POST /equipment` |
| Nome | Input texto | string | Sim | — | `POST /equipment` / `PUT /equipment/{id}` |
| Código QR | Input texto (somente na criação; leitura na edição) | string | Sim (criação) | — | `POST /equipment` |
| Patrimônio/Nº de série/Fabricante/Modelo | Input texto | string | Não | — | idem |
| Descrição | Textarea | string | Não | — | idem |
| Data de instalação | DatePicker | date | Não | — | idem |

## 9.5 FE-W15 — Formulário de item do checklist (construtor de modelo)

| Campo | Componente | Tipo | Obrigatório | Dependência | Endpoint |
|---|---|---|---|---|---|
| Código | Input texto | string | Não | — | `POST/PUT .../items` |
| Título/pergunta | Input texto | string | Sim | — | idem |
| Descrição/ajuda | Textarea | string | Não | — | idem |
| Tipo de resposta | Select | enum `ResponseType` | Sim | Lista fixa dos 7 valores do MVP (RN-023) | idem |
| Obrigatório | Checkbox/Switch | boolean | Não (default `false`) | — | idem |
| Exige observação na falha | Checkbox/Switch | boolean | Não (default `false`) | Só faz sentido para `CONFORMITY`/`BOOLEAN` — a UI decide se mostra o campo; regra de exibição não normativa, **[A DEFINIR]** | idem |
| Exige evidência na falha | Checkbox/Switch | boolean | Não (default `false`) | idem | idem |
| Opções (para `SINGLE_CHOICE`) | Editor de lista dinâmico, exibido só quando `responseType = SINGLE_CHOICE` | objeto livre (`optionsJson`) | Condicional | Formato interno **[A DEFINIR]** (PEND-03 do documento 20) | idem |
| Ordem | Campo numérico ou posição por arrastar/mover (`interface-admnistrativa-web.md` §14.8) | integer | Sim | — | idem |

## 9.6 FE-W19 — Formulário de agendamento (combos encadeados)

| Campo | Componente | Tipo | Obrigatório | Dependência | Endpoint da opção |
|---|---|---|---|---|---|
| Modelo + versão | Select (modelo) + Select (versão publicada) | UUID (`templateVersionId`) | Sim | `GET /inspection-templates?status=ACTIVE` → `GET .../versions` (filtrar `activeForNewInspections=true`) | — |
| Cliente | Select | UUID | Sim | `GET /clients?status=ACTIVE` | — |
| Local | Select, habilitado após escolher cliente | UUID | Sim | `GET /clients/{clientId}/sites` (recarrega ao trocar cliente; campo de local é limpo) | — |
| Equipamento | Select, habilitado após escolher local | UUID, nullable | Condicional (RN-026) | `GET /sites/{siteId}/equipment` (recarrega ao trocar local) | — |
| Técnico | Select | UUID | Sim | `GET /users?role=TECHNICIAN&status=ACTIVE` | — |
| Supervisor | Select | UUID, nullable | Não | `GET /users?role=SUPERVISOR&status=ACTIVE` | — |
| Título | Input texto | string, nullable | Não | — | — |
| Instruções | Textarea | string, nullable | Não | — | — |
| Prioridade | Select | enum `InspectionPriority` | Sim | Lista fixa | — |
| Data prevista | DatePicker + TimePicker | date-time | Sim | — | — |

Envio final: `POST /inspections` com os campos acima (seção 5.9).

## 9.7 FE-M08 — Componentes de resposta do checklist (por `responseType`)

| `responseType` | Componente mobile | Campo do payload | Validação client-side |
|---|---|---|---|
| `TEXT_SHORT` | Input de texto (uma linha) | `valueText` | Obrigatoriedade conforme `required` |
| `TEXT_LONG` | Área de texto (múltiplas linhas) | `valueText` | idem |
| `NUMBER` | Input numérico (teclado numérico) | `valueNumber` | Formato numérico + obrigatoriedade |
| `BOOLEAN` | Seletor Sim/Não (dois botões ou switch) | `valueBoolean` | Obrigatoriedade |
| `CONFORMITY` | Seletor de três opções (Conforme/Não conforme/Não aplicável) | `conformity` | Se `NON_CONFORMING` e `observationRequiredOnFailure=true`, campo de observação passa a obrigatório (RN-038); se `evidenceRequiredOnFailure=true`, exige ao menos uma evidência antes de permitir concluir a inspeção (RN-039, validado em FE-M09) |
| `SINGLE_CHOICE` | Seleção única (radio/lista) | `valueJson` | Opções vêm de `optionsJson` do snapshot — formato **[A DEFINIR]** (PEND-03) |
| `DATE` | Seletor de data | `valueDate` | Obrigatoriedade |
| *(tipo desconhecido)* | Estado controlado de "tipo não suportado" | — | Não quebra a tela; impede conclusão se o item for obrigatório (`aplicativo-mobile.md` §13.5) |

Todo componente também renderiza, quando `required=true`, um indicador visual de obrigatoriedade, e um campo de observação (sempre visível, obrigatório apenas conforme a regra acima).

## 9.8 FE-M10 — Formulário de não conformidade

| Campo | Componente | Tipo | Obrigatório | Dependência |
|---|---|---|---|---|
| Título | Input texto | string | Sim | — |
| Descrição | Textarea | string | Sim (sempre; adicionalmente obrigatória em conteúdo quando `CRITICAL`) | — |
| Criticidade | Select | enum `Severity` | Sim | Lista fixa |
| Evidências | Lista de miniaturas + botão "adicionar" (abre FE-M12) | — | Obrigatória ao menos 1 quando `severity = CRITICAL` (RN-055) | — |

## 9.9 FE-W21 — Formulários de decisão (aprovar/reprovar)

| Campo | Componente | Tipo | Obrigatório | Endpoint |
|---|---|---|---|---|
| Comentário (aprovação) | Textarea | string, nullable | Não | `POST .../approve` |
| Motivo (reprovação) | Textarea | string | **Sim** — botão "Reprovar" desabilitado até preenchido | `POST .../reject` |
| Itens a corrigir | Multi-select sobre os itens do checklist | array de UUID | Não | idem |

## 9.10 FE-W18/FE-W20 — Formulário de cancelamento (modal)

| Campo | Componente | Tipo | Obrigatório | Endpoint |
|---|---|---|---|---|
| Justificativa | Textarea | string | **Sim** | `POST /inspections/{id}/cancel` |

---

# 10. Tabelas e listagens

## 10.1 FE-W03 — Usuários

| Coluna | Campo da API | Formatação |
|---|---|---|
| Nome | `name` | Texto |
| E-mail | `email` | Texto |
| Perfil | `role` | Badge |
| Situação | `status` | Badge (`ACTIVE`=verde, `INACTIVE`=cinza, `BLOCKED`=vermelho — cores não normativas, sugestão) |
| Telefone | `phone` | Texto |
| Criado em | `createdAt` | `dd/MM/yyyy HH:mm` |

**Filtros:** `name`, `email`, `role`, `status`. **Busca:** não há parâmetro dedicado (ver PEND-15 do documento 20; aqui aplicado também a usuários por analogia — **[A DEFINIR]**). **Ordenação:** `sort=createdAt,desc` (padrão sugerido). **Paginação:** padrão da seção 9 do documento 20. **Ações por linha:** editar, ativar/inativar/bloquear, redefinir senha. **Ações em lote:** não previstas em nenhum documento. **Sem resultados:** estado vazio com CTA "cadastrar usuário".

## 10.2 FE-W05 — Clientes

| Coluna | Campo da API | Formatação |
|---|---|---|
| Nome | `name` | Texto |
| Razão social | `legalName` | Texto |
| Documento | `document` | Texto |
| Situação | `status` | Badge |

**Ações por linha:** editar, inativar/reativar, ver locais.

## 10.3 FE-W08 — Locais

| Coluna | Campo da API | Formatação |
|---|---|---|
| Nome | `name` | Texto |
| Cliente | `clientId` (resolvido) | Texto |
| Cidade/Estado | `city`/`state` | Texto |
| Situação | `status` | Badge |

**Ações por linha:** editar, inativar/reativar, ver equipamentos.

## 10.4 FE-W11 — Equipamentos

| Coluna | Campo da API | Formatação |
|---|---|---|
| Nome | `name` | Texto |
| Local | `siteId` (resolvido) | Texto |
| Código QR | `qrCode` | Texto monoespaçado |
| Patrimônio/Nº de série | `assetNumber`/`serialNumber` | Texto |
| Situação | `status` | Badge (`DECOMMISSIONED` também deve se distinguir visualmente de `INACTIVE`) |

**Ações por linha:** editar, inativar/reativar/descomissionar, buscar por QR.

## 10.5 FE-W13 — Modelos de inspeção

| Coluna | Campo da API | Formatação |
|---|---|---|
| Título | `title` | Texto |
| Categoria | `category` | Badge/texto |
| Situação | `status` (`TemplateStatus`) | Badge |
| Versão atual | `currentVersion` | Número |

**Filtros:** `category`, `status`. **Ações por linha:** editar (construtor), ver versões, ver prévia.

## 10.6 FE-W18 — Inspeções (acompanhamento)

| Coluna | Campo da API | Formatação |
|---|---|---|
| Título/identificador | `title` (ou `id` truncado) | Texto |
| Cliente | `clientId` (resolvido) | Texto |
| Local | `siteId` (resolvido) | Texto |
| Equipamento | `equipmentId` (resolvido), nullable | Texto ou "—" |
| Técnico | `technicianId` (resolvido) | Texto |
| Prioridade | `priority` | Badge |
| Data prevista | `scheduledFor` | `dd/MM/yyyy HH:mm` |
| Estado | `status` | Badge (ver seção 17 para rótulo por estado) |
| Progresso | derivado de `items`/`responses` — **não vem pronto da API**; requer `GET /inspections/{id}` por linha, ou é omitido na visão de lista | Barra de progresso — **[A DEFINIR]** se a listagem exibe progresso ou só o detalhe (nenhum campo de progresso existe em `Inspection`/`InspectionPage`, só em `InspectionDetail`) |
| Atualizado em | `updatedAt` | `dd/MM/yyyy HH:mm` |
| Atraso | derivado (`scheduledFor < now()` e `status` não terminal) | Badge "Atrasada" |

**Filtros:** `status`, `technicianId`, `supervisorId`, `clientId`, `siteId`, `equipmentId`, `priority`, `scheduledFrom`, `scheduledTo`, `overdue`. **Busca textual:** **[A DEFINIR]**, PEND-15 do documento 20. **Ações por linha:** ver detalhe, cancelar (quando aplicável), ir para revisão (quando `SUBMITTED`/`UNDER_REVIEW`). **Ações em lote:** não previstas.

## 10.7 FE-W22 — Não conformidades

| Coluna | Campo da API | Formatação |
|---|---|---|
| Título | `title` | Texto |
| Inspeção | `inspectionId` (resolvido) | Link |
| Criticidade | `severity` | Badge |
| Situação | `status` | Badge (único valor `OPEN` no MVP) |
| Criada em | `createdAtDevice` | `dd/MM/yyyy HH:mm` |

**Filtros:** `severity`. **Ações por linha:** ver inspeção relacionada.

## 10.8 FE-M03 — Lista de inspeções (mobile, dados locais)

| Elemento do cartão | Campo | Formatação |
|---|---|---|
| Título | `title` | Texto |
| Cliente/Local | `clientId`/`siteId` (resolvidos) | Texto |
| Prazo | `scheduledFor` | Relativo ("hoje", "amanhã") ou absoluto |
| Estado | `status` | Badge |
| Indicador offline/pendente | `local_sync_status` (local) | Ícone |

**Filtros (client-side):** estado, data, prioridade. **Busca:** local, sobre os dados já baixados — **[A DEFINIR]** se existe campo de busca (não mencionado além de "pesquisa local" genérica em `funcionalidades.md` §8.2).

---

# 11. Modais, drawers e componentes dependentes de API

| Componente | Tela onde aparece | Condição de abertura | Endpoint | Payload/Response | Comportamento após sucesso/erro |
|---|---|---|---|---|---|
| Confirmação de cancelamento | FE-W18, FE-W20 | Clique em "Cancelar" | `POST /inspections/{id}/cancel` | `CancelInspectionRequest{reason}` → `InspectionDetail` | Sucesso: fecha modal, atualiza badge de estado; `409`: mensagem "inspeção aprovada não pode ser cancelada" (RN-030) |
| Confirmação de ativar/inativar/bloquear usuário | FE-W03 | Clique na ação de status | `PATCH /users/{id}/status` | `UserStatusUpdateRequest{status}` → `User` | Sucesso: atualiza badge; aviso de que sessões ativas do usuário serão invalidadas quando `status` for `INACTIVE`/`BLOCKED` (RN-008) |
| Confirmação de inativar/reativar cliente/local/equipamento | FE-W05, FE-W08, FE-W11 | Clique na ação de status | `PATCH .../status` correspondente | `StatusUpdateRequest`/`EquipmentStatusUpdateRequest` → entidade atualizada | Sucesso: atualiza badge na linha |
| Seletor de cliente/local/equipamento (combo) | FE-W19 (agendamento), FE-W07/FE-W10 (contexto fixo) | Ao focar o campo ou ao trocar o nível anterior | `GET /clients`, `GET /clients/{id}/sites`, `GET /sites/{id}/equipment` | — → lista para popular o select | Lista vazia → mensagem "nenhum local cadastrado para este cliente" (ou equivalente) em vez de erro |
| Seletor de técnico/supervisor | FE-W19 | Ao focar o campo | `GET /users?role=TECHNICIAN&status=ACTIVE` / `role=SUPERVISOR` | — → `UserPage` | — |
| Visualização de evidências (galeria) | FE-W21, FE-M08/FE-M10 (miniaturas) | Clique numa miniatura | `GET /evidence/{id}` (ou `accessUrl` já embutido no `InspectionDetail`) | `Evidence{accessUrl,...}` | Abre a imagem em tamanho completo; permite navegar entre evidências do mesmo item |
| Revisão de item (painel expandido) | FE-W21 | Clique num item do checklist durante a revisão | — (dados já carregados via `GET /inspections/{id}`) | — | Expande resposta + observação + evidências + NC relacionada do item |
| Registro de não conformidade (a partir do checklist) | FE-M08 | Ação "Registrar NC" sobre um item | `POST /inspections/{inspectionId}/non-conformities` | `NonConformityCreateRequest` (seção 5.13) | Sucesso: fecha modal, NC aparece em FE-M10 e no indicador do item |
| Scanner QR embutido | FE-M06 (atalho), FE-M11 (tela dedicada) | Ação "Ler QR Code" | `GET /equipment/by-qr/{qrCode}` | `Equipment` | Ver seção 3, FE-M11 |
| Aviso de divergência de equipamento | FE-M11 | `Equipment.id` lido ≠ `Inspection.equipmentId` esperado | — (comparação client-side) | — | Exige confirmação explícita ou bloqueia — **[A DEFINIR]** conforme regra da inspeção (RN-064, PEND-F03) |
| Confirmação de logout com pendências | FE-M05 | Logout com outbox não vazia | — | — | Comportamento não definido — **[A DEFINIR]** (PEND-F02) |

---

# 12. Navegação e rotas

## 12.1 Mapa de navegação — mobile

```text
(public)/login
(protected)
  ├── (tabs)/index                         [Início]
  ├── (tabs)/inspections                   [Lista]
  ├── (tabs)/sync                          [Sincronização]
  ├── (tabs)/profile                       [Perfil]
  ├── inspections/[inspectionId]/index     [Detalhes]
  │    ├── start
  │    ├── checklist
  │    ├── summary
  │    └── non-conformities
  ├── scanner
  ├── evidence/
  │    ├── capture
  │    └── preview
  └── sync/details
```

## 12.2 Mapa de navegação — web

```text
/login
/app
  ├── /dashboard
  ├── /users                                    (+ cadastro/edição — [A DEFINIR])
  ├── /clients                                   (+ cadastro/edição — [A DEFINIR])
  │    └── /:clientId/sites
  ├── /sites                                     (+ cadastro/edição — [A DEFINIR])
  │    └── /:siteId/equipment
  ├── /equipment                                 (+ cadastro/edição — [A DEFINIR])
  ├── /inspection-templates
  │    ├── /new
  │    ├── /:templateId/edit
  │    ├── /:templateId/preview
  │    └── /:templateId/versions
  ├── /inspections
  │    ├── /new
  │    ├── /:inspectionId
  │    └── /:inspectionId/review
  ├── /non-conformities
  └── /audit                                     [PENDÊNCIA — sem endpoint]
```

## 12.3 Detalhe por rota

| Rota | Perfil permitido | Parâmetros de path | Query params | Pré-condições | Acesso direto (URL colada) | Sem permissão |
|---|---|---|---|---|---|---|
| `/login` | Todos | — | — | nenhuma | Redireciona para área autorizada se já autenticado | N/A |
| `/dashboard` | ADMIN, SUPERVISOR | — | — | sessão válida | Permitido | Redireciona/mensagem 403 |
| `/users` | ADMIN | — | `name,email,role,status,page,size,sort` | sessão ADMIN | Guard bloqueia não-ADMIN | Redireciona/mensagem 403 |
| `/clients` | ADMIN, SUPERVISOR | — | `page,size,sort` | sessão válida | Permitido para ambos os perfis | 403 para TECHNICIAN |
| `/clients/:clientId/sites` | ADMIN, SUPERVISOR | `clientId` | — | `clientId` deve existir (senão 404) | Permitido | 403 |
| `/sites` | ADMIN, SUPERVISOR | — | `page,size,sort` | sessão válida | Permitido | 403 |
| `/sites/:siteId/equipment` | ADMIN, SUPERVISOR | `siteId` | — | `siteId` deve existir | Permitido | 403 |
| `/equipment` | ADMIN, SUPERVISOR | — | `page,size,sort` | sessão válida | Permitido | 403 |
| `/inspection-templates` | ADMIN, SUPERVISOR | — | `category,status,page,size,sort` | sessão válida | Permitido | 403 |
| `/inspection-templates/new` | ADMIN, SUPERVISOR | — | — | sessão válida | Permitido | 403 |
| `/inspection-templates/:templateId/edit` | ADMIN, SUPERVISOR | `templateId` | — | modelo em `DRAFT` para edição de seções/itens (RN-018/019) | Se a versão já não é rascunho editável, ações de escrita retornam `409` — tela deve tratar como somente leitura nesse caso | 403 |
| `/inspection-templates/:templateId/preview` | ADMIN, SUPERVISOR | `templateId` | — | ao menos uma seção para conteúdo útil | Permitido (mesmo vazio) | 403 |
| `/inspection-templates/:templateId/versions` | ADMIN, SUPERVISOR | `templateId` | — | — | Permitido | 403 |
| `/inspections` | ADMIN, SUPERVISOR | — | `status,technicianId,supervisorId,clientId,siteId,equipmentId,priority,scheduledFrom,scheduledTo,overdue,page,size,sort` | sessão válida | Permitido | 403 |
| `/inspections/new` | ADMIN, SUPERVISOR | — | — | existir modelo publicado, cliente e técnico ativos (senão formulário exibe estado vazio nos seletores) | Permitido | 403 |
| `/inspections/:inspectionId` | ADMIN, SUPERVISOR | `inspectionId` | — | inspeção existente (senão 404) | Permitido | 403 |
| `/inspections/:inspectionId/review` | **SUPERVISOR** | `inspectionId` | — | `status ∈ {SUBMITTED, UNDER_REVIEW}` (fora disso, tela pode ser acessada mas ações ficam desabilitadas) | Permitido para SUPERVISOR | 403 para ADMIN/TECHNICIAN — nota: ADMIN não aparece na matriz de revisão (RN-079, RN-006) |
| `/non-conformities` | ADMIN, SUPERVISOR | — | `severity,page,size,sort` | sessão válida | Permitido | 403 |
| `/audit` | ADMIN, SUPERVISOR | — | — | **[PENDÊNCIA]** sem endpoint | Tela não pode ser implementada até PEND-08 do documento 20 ser resolvida | 403 |

**Guard genérico (toda rota `/app/*`):** verifica sessão válida (senão redireciona a `/login`) e perfil compatível com a tabela acima (senão bloqueia com mensagem 403) — a interface **não** é a barreira de segurança final; a API valida de novo em cada chamada (AC-SECURITY, `interface-admnistrativa-web.md` §14.13).

---

# 13. Autenticação e sessão

Esta seção consolida, do ponto de vista de implementação de tela, o que já está descrito em `contrato-backend-frontend.md` §6.

| Aspecto | Web (Angular) | Mobile (Expo/React Native) |
|---|---|---|
| Login | `POST /auth/login` em FE-W01 | `POST /auth/login` em FE-M01 |
| Armazenamento do token | Evitar local desnecessariamente exposto (`arquitetura.md` §11.10) — mecanismo concreto (memória + refresh silencioso? `localStorage`? cookie?) **[A DEFINIR]**, não normatizado em nenhum documento | Secure Store (`aplicativo-mobile.md` §13.6) |
| Envio do Bearer Token | Interceptador HTTP único (`interface-admnistrativa-web.md` §14.14) | Interceptador único na camada de API (`arquitetura.md` §11.4) |
| Expiração | `expiresIn` (segundos) retornado no login — valor exato **[DECISÃO NECESSÁRIA]**, PEND-01 do documento 20 | idem |
| Renovação | `POST /auth/refresh` disparado pelo interceptador em `401`; operação original repetida uma única vez (AC-AUTH) | idem |
| Logout | `POST /auth/logout`, limpa estado em memória/storage, redireciona a `/login` | `POST /auth/logout`, limpa Secure Store, navega para `(public)/login`; **[A DEFINIR]** comportamento com outbox pendente (PEND-F02) |
| Tratamento de `401` | Interceptador tenta refresh; falha → redireciona ao login, descarta estado de sessão | Interceptador tenta refresh; falha → **preserva dados locais** (inspeções, respostas, outbox) e solicita nova autenticação, sem apagar nada (UC-01, fluxo alternativo) |
| Tratamento de `403` | Mensagem de acesso negado; não expõe dado do recurso (seção 8) | idem |
| Recuperação de sessão (reabrir app) | Verifica token salvo; se válido, pula login | Verifica sessão no Secure Store; se válida, pula login; se expirada mas dentro de critério de tolerância offline, permite acesso limitado — critério **[A DEFINIR]** (PEND-10 do documento 20) |
| Sessão offline | Não aplicável (web presume conectividade) | Permitida apenas quando existir sessão previamente válida e dados locais autorizados (UC-01) |

---

# 14. Controle de acesso no frontend

Matriz tela × ação × perfil. Onde a ação não existe para o perfil (nem como visualização), a célula é ❌. Onde existe como leitura mas não como escrita, 👁️. **CLIENT_VIEWER** não tem nenhuma tela implementada no MVP (portal do cliente é P2/futuro, `personas.md` "Roberto") — coluna incluída apenas para registrar essa ausência.

| Tela | Ação | ADMIN | SUPERVISOR | TECHNICIAN | CLIENT_VIEWER |
|---|---|:---:|:---:|:---:|:---:|
| FE-W02 Dashboard | Visualizar | ✅ | ✅ | ❌ | ❌ |
| FE-W03 Usuários | Visualizar/Criar/Editar/Status | ✅ | ❌ | ❌ | ❌ |
| FE-W05 Clientes | Visualizar | ✅ | ✅ | ❌ | ❌ |
| FE-W05 Clientes | Criar/Editar/Status | ✅ | ❌ | ❌ | ❌ |
| FE-W08 Locais | Visualizar | ✅ | ✅ | ❌ | ❌ |
| FE-W08 Locais | Criar/Editar/Status | ✅ | ❌ | ❌ | ❌ |
| FE-W11 Equipamentos | Visualizar | ✅ | ✅ | ❌ | ❌ |
| FE-W11 Equipamentos | Criar/Editar/Status | ✅ | ✅ | ❌ | ❌ |
| FE-W13/15/16/17 Modelos | Visualizar/Criar/Editar/Publicar | ✅ | ✅ | ❌ | ❌ |
| FE-W18 Inspeções (acompanhamento) | Visualizar | ✅ | ✅ | ❌ | ❌ |
| FE-W19 Nova inspeção | Criar/Atribuir | ✅ | ✅ | ❌ | ❌ |
| FE-W20 Detalhe da inspeção | Editar planejamento/Reatribuir/Cancelar | ✅ | ✅ | ❌ | ❌ |
| FE-W21 Revisão | Iniciar revisão/Aprovar/Reprovar | ❌ | ✅ | ❌ | ❌ |
| FE-W22 Não conformidades | Visualizar | ✅ | ✅ | ❌ | ❌ |
| FE-W23 Auditoria | Visualizar | **A DEFINIR** | **A DEFINIR** | ❌ | ❌ |
| FE-M02/03 Início/Lista (mobile) | Visualizar | ❌ (fora do escopo padrão — acesso mobile é "Opcional" para ADMIN, `perfis-de-usuario.md` §5.2) | ❌ (idem, "Opcional") | ✅ (própria) | ❌ |
| FE-M06 Detalhe da inspeção (mobile) | Visualizar | ❌ | ❌ | ✅ (própria, RN-004) | ❌ |
| FE-M07 Iniciar | Executar | ❌ | ❌ | ✅ (própria, exclusivo, RN-033) | ❌ |
| FE-M08 Checklist | Responder | ❌ | ❌ | ✅ (própria) | ❌ |
| FE-M09 Concluir | Executar | ❌ | ❌ | ✅ (própria) | ❌ |
| FE-M10 Não conformidades (mobile) | Registrar | ❌ | ❌ | ✅ (própria) | ❌ |
| FE-M11 Scanner | Usar | ❌ | ❌ | ✅ | ❌ |
| FE-M12/13 Evidência | Capturar/Enviar | ❌ | ❌ | ✅ (própria) | ❌ |
| FE-M04/14 Sincronização | Executar/Consultar | ❌ | ❌ | ✅ | ❌ |

Nota sobre a coluna ADMIN/SUPERVISOR = ❌ nas telas mobile: reflete a matriz de `perfis-de-usuario.md` §5.2 ("Acessar aplicativo de campo" = Opcional para ambos) combinada com RN-033 (execução é exclusiva do técnico responsável no MVP) — nenhum documento descreve uma tela mobile funcional para ADMIN/SUPERVISOR além de, hipoteticamente, a mesma tela de login; por isso a matriz trata o acesso mobile de ADMIN/SUPERVISOR como não implementado no MVP, não apenas "opcional" em aberto.

---

# 15. Upload de arquivos e evidências

## 15.1 Componente e momento do upload

**Componente:** captura de câmera (FE-M12) ou seleção de galeria, quando permitida (`aplicativo-mobile.md` §13.7). **Momento:** o upload em si (`POST /inspections/{inspectionId}/evidence`) só é disparado após a confirmação em FE-M13 — a captura (FE-M12) apenas obtém o arquivo e mantém em memória/URI local.

## 15.2 Contrato do endpoint

`POST /inspections/{inspectionId}/evidence`, `multipart/form-data`. Campos completos: seção 5.12. Detalhamento normativo (limites, formatos, comportamento de erro): `contrato-backend-frontend.md` §10.

## 15.3 Tamanho máximo e tipos permitidos

**[PENDÊNCIA]** — repetido de PEND-16 do documento 20: nenhum documento de origem define um valor numérico de tamanho máximo em MB. `openapi.yaml` só indica `image/jpeg, image/png` como dica de `contentType`. Isso bloqueia a implementação de validação client-side antes do upload (compressão, rejeição antecipada) — recomenda-se resolver antes de construir FE-M12/FE-M13.

## 15.4 Preview

FE-M13 exibe a imagem em tela cheia antes do envio — comportamento descrito em UC-11 ("apresentar uma prévia... permitir confirmar ou refazer").

## 15.5 Remoção

Antes da sincronização: remoção local, cancela a operação pendente na outbox (UC-11, fluxo alternativo "exclusão antes da sincronização"). Depois de sincronizada: `DELETE /evidence/{id}` — bloqueado se a inspeção estiver `APPROVED` (RN-049); quem pode executar **[A DEFINIR]** (PEND-05 do documento 20).

## 15.6 Retry

Falha de upload mantém o arquivo local e marca como pendente (AC-EVIDENCE); reenviado como parte do ciclo de sincronização (FE-M04) com o mesmo `idempotencyKey` — nunca duplica (RN-068).

## 15.7 Progresso

Nenhum documento de origem especifica barra de progresso percentual por arquivo — apenas os estados binários "pendente"/"enviada" (seção 6.7). **[A DEFINIR]** se a UI deve exibir progresso de upload byte a byte.

## 15.8 Tratamento de erro

`413` (arquivo grande) e `415` (formato não suportado) — mensagens específicas, permitem nova captura (UC-11, AC-EVIDENCE). `409` com `idempotencyKey` já processada é tratado como sucesso silencioso (não é um erro visível ao usuário).

## 15.9 Associação com a entidade

Toda evidência pertence a uma inspeção (`inspectionId`, obrigatório via path); o vínculo opcional com `responseId` ou `nonConformityId` é definido pelo **contexto de onde o botão "adicionar evidência" foi clicado** (item do checklist em FE-M08, ou não conformidade em FE-M10) — a UI fixa esse campo automaticamente, o usuário não o escolhe.

## 15.10 Específico do mobile

| Aspecto | Comportamento |
|---|---|
| Captura pela câmera | `expo-camera` (ou equivalente) — permissão solicitada antes do primeiro uso (RN-058) |
| Seleção da galeria | Permitida "quando permitida" (`aplicativo-mobile.md` §13.4) — condição exata **[A DEFINIR]** |
| Armazenamento offline | Arquivo mantido no dispositivo (URI local, campo existente apenas na entidade local — não no `Evidence` do servidor); metadados salvos no SQLite |
| Fila de upload | Operação `entityType: EVIDENCE` na outbox (`SyncOperation`) |
| Sincronização posterior | Arquivos sincronizados **separadamente** dos dados estruturados (RN-078) — uma resposta de texto pode ser confirmada mesmo com a foto vinculada ainda pendente |

---

# 16. Operação offline

## 16.1 Classificação por funcionalidade

| Funcionalidade | Offline | Dados locais | Sincronização |
|---|---|---|---|
| Login (com sessão prévia válida) | ✅ (limitado) | Secure Store | Não aplicável |
| Consultar lista/detalhe de inspeção já baixada | ✅ | SQLite | Não |
| Ler QR Code (equipamento já no snapshot local) | ✅ | SQLite | Não |
| Ler QR Code (equipamento fora do snapshot local) | ❌ | — | Requer rede |
| Iniciar inspeção | ✅ | SQLite + Outbox | Posterior |
| Responder checklist | ✅ | SQLite + Outbox | Posterior |
| Capturar evidência | ✅ | Arquivo local + SQLite + Outbox | Posterior |
| Registrar não conformidade | ✅ | SQLite + Outbox | Posterior |
| Concluir/enviar inspeção | ✅ | SQLite + Outbox | Posterior |
| Ver "Aguardando sincronização" | ✅ | SQLite (`local_sync_status`) | — |
| Revisar/aprovar/reprovar (web) | ❌ | — | Não aplicável — web presume conectividade |
| Cadastros administrativos (web) | ❌ | — | Não aplicável |
| Dashboard | ❌ | — | Não aplicável |

## 16.2 Dados pré-carregados no download inicial (mobile)

Perfil mínimo do usuário; inspeções atribuídas; cliente e local relacionados; equipamento relacionado; snapshot dos itens; respostas existentes; revisões e solicitações de correção pertinentes — detalhado em `contrato-backend-frontend.md` §11.1. As telas FE-M02, FE-M03, FE-M06 dependem inteiramente desse conjunto para funcionar offline.

## 16.3 Como o frontend registra operações pendentes

Cada escrita das telas FE-M07 a FE-M10 e FE-M12/13, quando offline, gera ou atualiza uma linha em `SyncOperation` (outbox local) em vez de chamar a API diretamente. Estrutura completa: `contrato-backend-frontend.md` §11.4.

## 16.4 Como identifica operações pendentes

`SyncMetadata.pending_operations` (contador exibido em FE-M02/FE-M04) e a query de `SyncOperation` com `status != COMPLETED` (lista exibida em FE-M04/FE-M14).

## 16.5 Quando sincroniza

Gatilhos possíveis (nenhum documento fixa uma política única de disparo automático — comportamento descrito é reativo ao usuário e à conectividade, não diz se há sincronização periódica em background): conectividade retorna (detecção automática, `aplicativo-mobile.md` §13.7 "Conectividade" — "acionar sincronização de forma controlada"); usuário toca "Sincronizar agora" (FE-M02, FE-M04, FE-M05); abertura do aplicativo (UC-14, gatilho "abertura do aplicativo"). **[A DEFINIR]** se existe sincronização periódica em background além desses três gatilhos — PEND-F06.

## 16.6 Endpoints utilizados

`POST /mobile/sync/push` (envio) + `GET /mobile/sync/pull?cursor=` (download). Contrato completo: `contrato-backend-frontend.md` §11.6.

## 16.7 Tratamento de conflitos

Detectado por `baseVersion` divergente; política do MVP é que dados `APPROVED` no servidor sempre prevalecem; a UI **nunca** descarta o valor local silenciosamente — apresenta o estado de conflito em FE-M04/FE-M14 (`contrato-backend-frontend.md` §11.9).

## 16.8 Tratamento de falhas

Falha de rede total preserva a outbox intacta; falha parcial de lote mantém confirmadas as operações que tiveram sucesso e as demais pendentes com erro visível (`contrato-backend-frontend.md` §11.8/11.13).

## 16.9 Como informa o usuário sobre o status

FE-M04 é a tela dedicada a isso (última sincronização, quantidade pendente, erros, ação de retry); FE-M02 mostra um resumo (contador); FE-M03/FE-M06 mostram indicador por item quando aplicável; FE-M14 é o detalhe técnico para suporte.

---

# 17. Máquina de estados da interface

## 17.1 `Inspection` — o que cada tela mostra/permite por estado

| Estado (`InspectionStatus`) | Rótulo sugerido na UI | Telas onde aparece | Ações disponíveis (mobile) | Ações disponíveis (web) |
|---|---|---|---|---|
| `DRAFT` | "Rascunho" | FE-W18, FE-W20 | — (ainda não visível ao técnico, RN-028) | Editar planejamento, Atribuir técnico, Cancelar |
| `ASSIGNED` | "Atribuída" | FE-M02/03/06, FE-W18, FE-W20 | Iniciar (FE-M07) | Editar planejamento, Reatribuir, Cancelar |
| `IN_PROGRESS` | "Em andamento" | FE-M02/03/06/08/09/10, FE-W18, FE-W20 | Continuar checklist, Responder, Adicionar evidência/NC, Concluir | Ver progresso (somente leitura); Cancelar administrativamente |
| `SUBMITTED` | "Enviada" | FE-M06, FE-W18, FE-W20, FE-W21 | Consultar (somente leitura) | Iniciar revisão (FE-W21) |
| `UNDER_REVIEW` | "Em revisão" | FE-M06, FE-W18, FE-W20, FE-W21 | Consultar (somente leitura) | Aprovar, Reprovar |
| `APPROVED` | "Aprovada" | FE-M06, FE-W18, FE-W20 | Consultar (somente leitura) — respostas/evidências bloqueadas (RN-082, RN-049) | Consultar (somente leitura) |
| `REJECTED` | "Reprovada — requer correção" | FE-M06 (destaque), FE-W18, FE-W20, FE-W21 (histórico) | Corrigir (reabre FE-M08 nos itens de `itemsToCorrect`) | Consultar decisão anterior; aguardar novo envio |
| `CANCELED` | "Cancelada" | FE-M06, FE-W18, FE-W20 | Consultar (somente leitura) | Consultar (somente leitura); `canceledReason` exibido |

**Transições permitidas** (quem dispara, a partir de qual tela): ver `contrato-backend-frontend.md` §7.4 para a tabela normativa completa — reproduzida aqui apenas como "o que o botão faz":

```text
FE-W20 "Atribuir"        : DRAFT → ASSIGNED
FE-M07 "Confirmar início" : ASSIGNED → IN_PROGRESS
FE-M09 "Concluir"         : IN_PROGRESS → SUBMITTED
FE-W21 "Iniciar revisão"  : SUBMITTED → UNDER_REVIEW
FE-W21 "Aprovar"          : UNDER_REVIEW → APPROVED
FE-W21 "Reprovar"         : UNDER_REVIEW → REJECTED
(sincronização)           : REJECTED → IN_PROGRESS (reabertura implícita ao corrigir)
FE-W18/FE-W20 "Cancelar"  : {DRAFT, ASSIGNED, IN_PROGRESS, REJECTED} → CANCELED
```

## 17.2 `InspectionTemplate`/`Version` — ações por estado

| Estado | Ações disponíveis |
|---|---|
| `DRAFT` (sem versão publicada, ou alterações após publicação anterior) | Editar dados gerais, criar/editar seções e itens (FE-W15), publicar (FE-W16) |
| `ACTIVE` (ao menos uma versão publicada) | Ver versões (FE-W17); nova alteração de seção/item não é possível diretamente — precisa criar um novo ciclo de edição que gere nova versão ao publicar novamente (RN-020) — mecanismo exato de "reabrir para nova versão" **[A DEFINIR]**, ver PEND-F07 |
| `INACTIVE` | Somente leitura; não aparece no seletor de FE-W19 |

## 17.3 `NonConformity` — ações por estado

| Estado | Ações disponíveis |
|---|---|
| `OPEN` (único valor do MVP) | Visualizar (FE-W22, FE-M10); editar **[A DEFINIR]** (PEND-06 do documento 20) |

---

# 18. Contrato Tela ↔ Endpoint

| Tela | Ação | Método | Endpoint | Request | Response |
|---|---|---|---|---|---|
| FE-W01/FE-M01 | Entrar | POST | `/auth/login` | `LoginRequest` | `LoginResponse` |
| *(interceptador, todas)* | Renovar sessão | POST | `/auth/refresh` | `RefreshTokenRequest` | `RefreshTokenResponse` |
| FE-M05, *(logout web)* | Sair | POST | `/auth/logout` | — | `204`/`200` |
| FE-M05, *(perfil web se houver)* | Consultar sessão | GET | `/auth/me` | — | `CurrentUserResponse` |
| FE-W03 | Listar usuários | GET | `/users` | query params | `UserPage` |
| FE-W04 | Criar usuário | POST | `/users` | `UserCreateRequest` | `User` |
| FE-W04 | Consultar usuário | GET | `/users/{id}` | — | `User` |
| FE-W04 | Editar usuário | PUT | `/users/{id}` | `UserUpdateRequest` | `User` |
| FE-W03 | Alterar situação do usuário | PATCH | `/users/{id}/status` | `UserStatusUpdateRequest` | `User` |
| FE-W03 | Redefinir senha | POST | `/users/{id}/reset-password` | — | `ResetPasswordResponse` |
| FE-W05 | Listar clientes | GET | `/clients` | query params | `ClientPage` |
| FE-W06 | Criar cliente | POST | `/clients` | `ClientCreateRequest` | `Client` |
| FE-W06 | Consultar cliente | GET | `/clients/{id}` | — | `Client` |
| FE-W06 | Editar cliente | PUT | `/clients/{id}` | `ClientUpdateRequest` | `Client` |
| FE-W05 | Alterar situação do cliente | PATCH | `/clients/{id}/status` | `StatusUpdateRequest` | `Client` |
| FE-W07 | Listar locais do cliente | GET | `/clients/{clientId}/sites` | — | `InspectionSite[]`/`SitePage` |
| FE-W08 | Listar locais | GET | `/sites` | query params | `SitePage` |
| FE-W09 | Criar local | POST | `/sites` | `SiteCreateRequest` | `InspectionSite` |
| FE-W09 | Consultar local | GET | `/sites/{id}` | — | `InspectionSite` |
| FE-W09 | Editar local | PUT | `/sites/{id}` | `SiteUpdateRequest` | `InspectionSite` |
| FE-W08 | Alterar situação do local | PATCH | `/sites/{id}/status` | `StatusUpdateRequest` | `InspectionSite` |
| FE-W10 | Listar equipamentos do local | GET | `/sites/{siteId}/equipment` | — | `Equipment[]`/`EquipmentPage` |
| FE-W11 | Listar equipamentos | GET | `/equipment` | query params | `EquipmentPage` |
| FE-W12 | Criar equipamento | POST | `/equipment` | `EquipmentCreateRequest` | `Equipment` |
| FE-W12 | Consultar equipamento | GET | `/equipment/{id}` | — | `Equipment` |
| FE-W12 | Editar equipamento | PUT | `/equipment/{id}` | `EquipmentUpdateRequest` | `Equipment` |
| FE-M11, FE-W11 | Buscar por QR | GET | `/equipment/by-qr/{qrCode}` | — | `Equipment` |
| FE-W11 | Alterar situação do equipamento | PATCH | `/equipment/{id}/status` | `EquipmentStatusUpdateRequest` | `Equipment` |
| FE-W13 | Listar modelos | GET | `/inspection-templates` | query params | `InspectionTemplatePage` |
| FE-W14 | Criar modelo | POST | `/inspection-templates` | `InspectionTemplateCreateRequest` | `InspectionTemplate` |
| FE-W15/16 | Consultar modelo | GET | `/inspection-templates/{id}` | — | `InspectionTemplate` |
| FE-W15 | Editar dados gerais do modelo | PUT | `/inspection-templates/{id}` | `InspectionTemplateUpdateRequest` | `InspectionTemplate` |
| FE-W15 | Criar seção | POST | `/inspection-templates/{id}/sections` | `TemplateSectionCreateRequest` | `TemplateSection` |
| FE-W15 | Editar seção | PUT | `/inspection-templates/{id}/sections/{sectionId}` | `TemplateSectionUpdateRequest` | `TemplateSection` |
| FE-W15 | Criar item | POST | `/inspection-templates/{id}/sections/{sectionId}/items` | `TemplateItemCreateRequest` | `TemplateItem` |
| FE-W15 | Editar item | PUT | `/inspection-templates/{id}/items/{itemId}` | `TemplateItemUpdateRequest` | `TemplateItem` |
| FE-W16 | Publicar versão | POST | `/inspection-templates/{id}/publish` | — | `InspectionTemplateVersion` |
| FE-W17 | Listar versões | GET | `/inspection-templates/{id}/versions` | query params | `InspectionTemplateVersionPage` |
| FE-W17, FE-W19 | Consultar versão | GET | `/inspection-template-versions/{versionId}` | — | `InspectionTemplateVersionDetail` |
| FE-W18 | Listar inspeções | GET | `/inspections` | query params | `InspectionPage` |
| FE-W19 | Agendar inspeção | POST | `/inspections` | `InspectionCreateRequest` | `InspectionDetail` |
| FE-W20, FE-W21 | Consultar inspeção | GET | `/inspections/{inspectionId}` | — | `InspectionDetail` |
| FE-W20 | Editar planejamento | PUT | `/inspections/{inspectionId}` | `InspectionUpdateRequest` | `InspectionDetail` |
| FE-W20 | Atribuir/reatribuir técnico | POST | `/inspections/{inspectionId}/assign` | `AssignInspectionRequest` | `InspectionDetail` |
| FE-W18, FE-W20 | Cancelar | POST | `/inspections/{inspectionId}/cancel` | `CancelInspectionRequest` | `InspectionDetail` |
| FE-M07 | Iniciar | POST | `/inspections/{inspectionId}/start` | `StartInspectionRequest` | `InspectionDetail` |
| FE-M09 | Concluir/enviar | POST | `/inspections/{inspectionId}/submit` | `SubmitInspectionRequest` | `InspectionDetail` |
| FE-W21 | Iniciar revisão | POST | `/inspections/{inspectionId}/begin-review` | — | `InspectionDetail` |
| FE-W21 | Aprovar | POST | `/inspections/{inspectionId}/approve` | `ApproveInspectionRequest` | `InspectionDetail` |
| FE-W21 | Reprovar | POST | `/inspections/{inspectionId}/reject` | `RejectInspectionRequest` | `InspectionDetail` |
| FE-W20 | Ver histórico | GET | `/inspections/{inspectionId}/history` | query params (paginação) | `AuditEventPage` |
| FE-W21, FE-M06 | Ver ciclos de revisão | GET | `/inspections/{inspectionId}/reviews` | — | `InspectionReview[]` |
| FE-M02/03 | Listar inspeções atribuídas | GET | `/mobile/inspections` | query params | `InspectionPage` |
| FE-M06 | Baixar detalhe completo | GET | `/mobile/inspections/{inspectionId}` | — | `InspectionDetail` |
| FE-W20, FE-W21 | Listar respostas | GET | `/inspections/{inspectionId}/responses` | — | `InspectionResponse[]` |
| FE-M08 | Responder item | PUT | `/inspections/{inspectionId}/responses/{responseId}` | `InspectionResponseUpsertRequest` | `InspectionResponse` |
| FE-M04 (via outbox) | Registrar respostas em lote | POST | `/inspections/{inspectionId}/responses:batch` | `InspectionResponseBatchRequest` | `InspectionResponseBatchResult` |
| FE-M12/13 | Enviar evidência | POST | `/inspections/{inspectionId}/evidence` | `EvidenceUploadRequest` (multipart) | `Evidence` |
| FE-W21, FE-M08/10 | Listar evidências | GET | `/inspections/{inspectionId}/evidence` | query params | `Evidence[]` |
| FE-W21, FE-M08/10/13 | Consultar evidência | GET | `/evidence/{id}` | — | `Evidence` |
| FE-M08/10 | Excluir evidência | DELETE | `/evidence/{id}` | — | `204` |
| FE-W22 | Listar não conformidades | GET | `/non-conformities` | query params | `NonConformityPage` |
| FE-W22, FE-M10 | Consultar não conformidade | GET | `/non-conformities/{id}` | — | `NonConformity` |
| FE-M10 | Registrar não conformidade | POST | `/inspections/{inspectionId}/non-conformities` | `NonConformityCreateRequest` | `NonConformity` |
| FE-M10 | Editar não conformidade | PUT | `/non-conformities/{id}` | `NonConformityUpdateRequest` | `NonConformity` |
| *(sem tela — INC-04)* | Alterar status da NC | PATCH | `/non-conformities/{id}/status` | `NonConformityStatusUpdateRequest` | `NonConformity` |
| FE-M04 | Enviar operações pendentes | POST | `/mobile/sync/push` | `SyncPushRequest` | `SyncPushResponse` |
| FE-M04 | Baixar alterações | GET | `/mobile/sync/pull` | `cursor` (query) | `SyncPullResponse` |
| FE-W02 | Resumo do dashboard | GET | `/dashboard/summary` | — | `DashboardSummary` |
| FE-W02 | Distribuição por estado | GET | `/dashboard/inspections-by-status` | — | `StatusCount[]` |
| FE-W02 | Distribuição por criticidade | GET | `/dashboard/non-conformities-by-severity` | — | `SeverityCount[]` |

---

# 19. Contrato Endpoint → Tela

Caminho inverso — permite identificar endpoints sem consumidor conhecido ou consumidores não cobertos. Endpoints agrupados na mesma ordem do catálogo do documento 20 (§3).

| Endpoint | Método | Telas consumidoras | Finalidade |
|---|---|---|---|
| `/auth/login` | POST | FE-W01, FE-M01 | Autenticação |
| `/auth/refresh` | POST | *(interceptador global, todas as telas autenticadas)* | Renovação de sessão |
| `/auth/logout` | POST | FE-M05, *(ação de logout web — sem tela própria, tipicamente no cabeçalho)* | Encerrar sessão |
| `/auth/me` | GET | FE-M05, *(cabeçalho web, opcional)* | Dados da sessão |
| `/users` | GET | FE-W03 | Listagem |
| `/users` | POST | FE-W04 | Criação |
| `/users/{id}` | GET, PUT | FE-W04 | Consulta/edição |
| `/users/{id}/status` | PATCH | FE-W03 | Ativar/inativar/bloquear |
| `/users/{id}/reset-password` | POST | FE-W03 | Redefinição de senha |
| `/clients` | GET | FE-W05, FE-W19 (seletor) | Listagem/seleção |
| `/clients` | POST | FE-W06 | Criação |
| `/clients/{id}` | GET, PUT | FE-W06 | Consulta/edição |
| `/clients/{id}/status` | PATCH | FE-W05 | Inativação |
| `/clients/{clientId}/sites` | GET | FE-W07, FE-W19 (combo encadeado) | Locais do cliente |
| `/sites` | GET | FE-W08 | Listagem |
| `/sites` | POST | FE-W07, FE-W09 | Criação |
| `/sites/{id}` | GET, PUT | FE-W09 | Consulta/edição |
| `/sites/{id}/status` | PATCH | FE-W08 | Inativação |
| `/sites/{siteId}/equipment` | GET | FE-W10, FE-W19 (combo encadeado) | Equipamentos do local |
| `/equipment` | GET | FE-W11 | Listagem |
| `/equipment` | POST | FE-W10, FE-W12 | Criação |
| `/equipment/{id}` | GET, PUT | FE-W12 | Consulta/edição |
| `/equipment/by-qr/{qrCode}` | GET | FE-M11, FE-W11 | Identificação por QR |
| `/equipment/{id}/status` | PATCH | FE-W11 | Inativação/descomissionamento |
| `/inspection-templates` | GET | FE-W13, FE-W19 (seletor) | Listagem/seleção |
| `/inspection-templates` | POST | FE-W14 | Criação |
| `/inspection-templates/{id}` | GET, PUT | FE-W15, FE-W16 | Consulta/edição |
| `/inspection-templates/{id}/sections` | POST | FE-W15 | Criar seção |
| `/inspection-templates/{id}/sections/{sectionId}` | PUT | FE-W15 | Editar seção |
| `/inspection-templates/{id}/sections/{sectionId}/items` | POST | FE-W15 | Criar item |
| `/inspection-templates/{id}/items/{itemId}` | PUT | FE-W15 | Editar item |
| `/inspection-templates/{id}/publish` | POST | FE-W16 | Publicação |
| `/inspection-templates/{id}/versions` | GET | FE-W17 | Histórico de versões |
| `/inspection-template-versions/{versionId}` | GET | FE-W17, FE-W19 | Detalhe de versão |
| `/inspections` | GET | FE-W18 | Listagem administrativa |
| `/inspections` | POST | FE-W19 | Agendamento |
| `/inspections/{inspectionId}` | GET | FE-W20, FE-W21 | Detalhe |
| `/inspections/{inspectionId}` | PUT | FE-W20 | Edição de planejamento |
| `/inspections/{inspectionId}/assign` | POST | FE-W20 (e implicitamente FE-W19 na criação — ver nota 20.1) | Atribuição |
| `/inspections/{inspectionId}/cancel` | POST | FE-W18, FE-W20 | Cancelamento |
| `/inspections/{inspectionId}/start` | POST | FE-M07 | Início |
| `/inspections/{inspectionId}/submit` | POST | FE-M09 | Conclusão/envio |
| `/inspections/{inspectionId}/begin-review` | POST | FE-W21 | Início de revisão |
| `/inspections/{inspectionId}/approve` | POST | FE-W21 | Aprovação |
| `/inspections/{inspectionId}/reject` | POST | FE-W21 | Reprovação |
| `/inspections/{inspectionId}/history` | GET | FE-W20 | Auditoria da inspeção |
| `/inspections/{inspectionId}/reviews` | GET | FE-W21, FE-M06 | Ciclos de revisão |
| `/mobile/inspections` | GET | FE-M02, FE-M03 | Lista atribuída ao técnico |
| `/mobile/inspections/{inspectionId}` | GET | FE-M06 | Download para offline |
| `/inspections/{inspectionId}/responses` | GET | FE-W20, FE-W21 | Consulta de respostas |
| `/inspections/{inspectionId}/responses/{responseId}` | PUT | FE-M08 | Responder item |
| `/inspections/{inspectionId}/responses:batch` | POST | FE-M04 (fila de sincronização) | Envio em lote |
| `/inspections/{inspectionId}/evidence` | POST | FE-M12/FE-M13 | Upload |
| `/inspections/{inspectionId}/evidence` | GET | FE-W21, FE-M08, FE-M10 | Listagem de evidências |
| `/evidence/{id}` | GET | FE-W21, FE-M08, FE-M10, FE-M13 | Metadados/URL de acesso |
| `/evidence/{id}` | DELETE | FE-M08, FE-M10 | Exclusão |
| `/non-conformities` | GET | FE-W22 | Listagem administrativa |
| `/non-conformities/{id}` | GET | FE-W22, FE-M10 | Detalhe |
| `/inspections/{inspectionId}/non-conformities` | POST | FE-M10 | Registro |
| `/non-conformities/{id}` | PUT | FE-M10 | Edição — **[A DEFINIR]**, PEND-06 |
| `/non-conformities/{id}/status` | PATCH | **nenhuma tela consumidora identificada** | Sem uso funcional no MVP (INC-04/PEND-11 do documento 20) |
| `/mobile/sync/push` | POST | FE-M04 | Envio da outbox |
| `/mobile/sync/pull` | GET | FE-M04 | Download incremental |
| `/dashboard/summary` | GET | FE-W02 | Indicadores |
| `/dashboard/inspections-by-status` | GET | FE-W02 | Indicadores |
| `/dashboard/non-conformities-by-severity` | GET | FE-W02 | Indicadores |

**20.1 Nota:** `POST /inspections/{inspectionId}/assign` é usado tanto implicitamente durante o fluxo de criação (RN-025 exige `technicianId` já no `POST /inspections`, então a atribuição inicial ocorre dentro do próprio `InspectionCreateRequest`, não como uma chamada separada a `assign`) quanto explicitamente em FE-W20 para reatribuição. Isso é consistente com a decisão de normalização #4 do `openapi.yaml` (`contrato-backend-frontend.md` §3.5): `assign` é reservado para reatribuição.

**Endpoint sem tela consumidora:** apenas `PATCH /non-conformities/{id}/status`, pela mesma razão já registrada como inconsistência no documento 20 (enum de destino com um único valor possível no MVP).

---

# 20. Matriz de rastreabilidade

Requisito (Caso de Uso) → Funcionalidade → Tela → Ação → Endpoint → Payload → Response. Um caso de uso pode envolver várias telas/ações — cada combinação é uma linha. A rastreabilidade a nível de regra de negócio (RN-001–RN-090) já existe em `contrato-backend-frontend.md` §16 e não é repetida aqui.

| UC | Funcionalidade | Tela | Ação | Endpoint | Payload | Response |
|---|---|---|---|---|---|---|
| UC-01 | Autenticação | FE-W01/FE-M01 | Entrar | `POST /auth/login` | `LoginRequest` | `LoginResponse` |
| UC-02 | Gerenciar usuários | FE-W03/FE-W04 | Criar/editar/status/reset | `POST\|PUT /users`, `PATCH .../status`, `POST .../reset-password` | `UserCreateRequest`/`UserUpdateRequest`/`UserStatusUpdateRequest` | `User`/`ResetPasswordResponse` |
| UC-03 | Gerenciar clientes | FE-W05/FE-W06 | Criar/editar/status | `POST\|PUT /clients`, `PATCH .../status` | `ClientCreateRequest`/`ClientUpdateRequest`/`StatusUpdateRequest` | `Client` |
| UC-03 | Gerenciar locais | FE-W07/FE-W08/FE-W09 | Criar/editar/status | `POST\|PUT /sites`, `PATCH .../status` | `SiteCreateRequest`/`SiteUpdateRequest`/`StatusUpdateRequest` | `InspectionSite` |
| UC-03 | Gerenciar equipamentos | FE-W10/FE-W11/FE-W12 | Criar/editar/status | `POST\|PUT /equipment`, `PATCH .../status` | `EquipmentCreateRequest`/`EquipmentUpdateRequest`/`EquipmentStatusUpdateRequest` | `Equipment` |
| UC-04 | Criar modelo de inspeção | FE-W13/FE-W14/FE-W15 | Criar modelo, seções, itens | `POST /inspection-templates`, `POST .../sections`, `POST .../sections/{id}/items` | `InspectionTemplateCreateRequest`, `TemplateSectionCreateRequest`, `TemplateItemCreateRequest` | `InspectionTemplate`, `TemplateSection`, `TemplateItem` |
| UC-05 | Publicar versão do modelo | FE-W16 | Publicar | `POST /inspection-templates/{id}/publish` | — | `InspectionTemplateVersion` |
| UC-06 | Agendar e atribuir inspeção | FE-W19 | Agendar | `POST /inspections` | `InspectionCreateRequest` | `InspectionDetail` |
| UC-07 | Baixar inspeções atribuídas | FE-M02/FE-M03/FE-M06 | Listar/baixar | `GET /mobile/inspections`, `GET /mobile/inspections/{id}` | query params | `InspectionPage`/`InspectionDetail` |
| UC-08 | Identificar equipamento por QR Code | FE-M11 | Ler QR | `GET /equipment/by-qr/{qrCode}` | — | `Equipment` |
| UC-09 | Iniciar inspeção | FE-M06/FE-M07 | Iniciar | `POST /inspections/{id}/start` | `StartInspectionRequest` | `InspectionDetail` |
| UC-10 | Responder checklist | FE-M08 | Responder item | `PUT /inspections/{id}/responses/{responseId}` | `InspectionResponseUpsertRequest` | `InspectionResponse` |
| UC-11 | Registrar evidência | FE-M12/FE-M13 | Enviar evidência | `POST /inspections/{id}/evidence` | `EvidenceUploadRequest` | `Evidence` |
| UC-12 | Registrar não conformidade | FE-M10 | Registrar NC | `POST /inspections/{id}/non-conformities` | `NonConformityCreateRequest` | `NonConformity` |
| UC-13 | Concluir inspeção offline | FE-M09 | Concluir | `POST /inspections/{id}/submit` (via outbox quando offline) | `SubmitInspectionRequest` | `InspectionDetail` |
| UC-14 | Sincronizar alterações | FE-M04 | Enviar/baixar | `POST /mobile/sync/push`, `GET /mobile/sync/pull` | `SyncPushRequest` | `SyncPushResponse`/`SyncPullResponse` |
| UC-15 | Acompanhar inspeções | FE-W18 | Listar/filtrar | `GET /inspections` | query params | `InspectionPage` |
| UC-16 | Revisar inspeção | FE-W21 | Iniciar revisão, navegar seções | `POST .../begin-review`, `GET /inspections/{id}` | — | `InspectionDetail` |
| UC-17 | Aprovar ou reprovar inspeção | FE-W21 | Aprovar/reprovar | `POST .../approve`, `POST .../reject` | `ApproveInspectionRequest`/`RejectInspectionRequest` | `InspectionDetail` |
| UC-18 | Consultar histórico | FE-W20 | Ver histórico | `GET /inspections/{id}/history` | query params (paginação) | `AuditEventPage` |
| UC-19 | Consultar indicadores | FE-W02 | Ver dashboard | `GET /dashboard/*` | — | `DashboardSummary`/`StatusCount[]`/`SeverityCount[]` |
| UC-20 | Consultar resultado como cliente | *(nenhuma — fora do MVP)* | — | — | — | — |

**UC-20** não tem tela nem endpoint no MVP — `casos-de-uso.md` a lista como P2, e `personas.md` confirma explicitamente: "Decisão de escopo: o perfil Cliente poderá existir no modelo de autorização, mas seu portal completo será tratado como funcionalidade futura." Nenhuma lacuna aqui — é escopo confirmado, não uma pendência.

---

# 21. Pendências e decisões necessárias

Itens específicos de **composição de tela** descobertos na elaboração deste documento, que não estavam listados no documento 20 (`contrato-backend-frontend.md` §17). Os 19 itens daquele documento (PEND-01 a PEND-19) continuam válidos e não são repetidos aqui — quando uma tela depende diretamente de um deles, a referência foi feita inline na seção 3.

| ID | Item | Documentação relacionada | Impacto na tela | Impacto na API | Decisão necessária |
|---|---|---|---|---|---|
| PEND-F01 | Rotas de criação/edição de Usuário, Cliente, Local e Equipamento não são definidas em `interface-admnistrativa-web.md` §14.3 (só a lista tem rota própria) — diferente de Modelos e Inspeções, que têm `/new` e `/:id/edit` explícitos | `interface-admnistrativa-web.md` §14.3 vs. §14.6–14.7 | Define se FE-W04/06/09/12 são modais sobre a lista ou rotas próprias — muda a estrutura de componentes (roteamento vs. estado de modal) | Nenhum (mesmos endpoints `POST`/`PUT`) | **[DECISÃO NECESSÁRIA]** |
| PEND-F02 | Comportamento do logout mobile (FE-M05) quando existem operações pendentes na outbox | `aplicativo-mobile.md` §13.4 (silente sobre esse cruzamento) | Define se o logout bloqueia, avisa ou é silencioso nesse caso | Nenhum — é decisão 100% client-side | **[A DEFINIR]** |
| PEND-F03 | Regra que decide, na divergência de equipamento no scanner (FE-M11) ou na tela de início (FE-M07), entre "exigir confirmação" e "bloquear" | `regras-de-negocio.md` RN-064 (menciona ambas as alternativas sem definir quando cada uma se aplica), `criterios-de-aceitacao.md` §17.11 | Define se a tela de scanner tem um modal de confirmação ou uma tela de bloqueio | Define se a regra é parametrizada por modelo/inspeção ou fixa no sistema | **[DECISÃO NECESSÁRIA]** |
| PEND-F04 | Tela FE-W23 (Auditoria) sem endpoint correspondente | Repetição de INC-05/PEND-08 do documento 20, aplicada especificamente à composição desta tela | Tela não pode ser especificada em detalhe (dados exibidos, filtros) até a lacuna de backend ser resolvida | Precisa de `GET /audit-events` (ou equivalente) com filtros administrativos | **[PENDÊNCIA]** |
| PEND-F05 | Como o frontend de FE-W19 sabe, antes de o usuário escolher, se o modelo selecionado exige equipamento (para tornar o campo obrigatório) — `InspectionTemplate`/`InspectionTemplateVersion` não tem um campo explícito tipo `requiresEquipment` | `modelo-de-dados.md` §10.7 (ausente), `regras-de-negocio.md` RN-026 (regra existe, mas não diz onde ela é declarada no modelo) | Define se o campo é sempre exibido como opcional na UI (e a validação de obrigatoriedade só aparece como erro do servidor após submissão) ou se existe um sinalizador a ser consumido antes | Precisa de um campo adicional em `InspectionTemplate`/`Version`, ou aceitar validação somente no submit | **[DECISÃO NECESSÁRIA]** |
| PEND-F06 | Existência (ou não) de sincronização periódica em background no mobile, além dos gatilhos manuais/de conectividade | `aplicativo-mobile.md` §13.7 (menciona "acionar sincronização de forma controlada", sem detalhar periodicidade) | Define se há um serviço em background/worker a implementar | Nenhum impacto direto na API (mesmos endpoints, apenas frequência de chamada) | **[A DEFINIR]** |
| PEND-F07 | Mecanismo de UI para "reabrir" um `InspectionTemplate` já `ACTIVE` (com versão publicada) para produzir uma nova versão — o contrato não tem um endpoint de "reabrir"; os endpoints de seção/item já operam implicitamente sobre uma versão rascunho (decisão de normalização #3), mas não está claro na documentação de origem como uma nova rodada de edição é iniciada após a primeira publicação | `regras-de-negocio.md` RN-020 (nova versão ao alterar, sem detalhar o gatilho de UI), `openapi.yaml` (endpoints de seção/item sempre "sobre a versão DRAFT", sem descrever criação de uma nova versão DRAFT a partir de uma já publicada) | FE-W15 precisa de um botão/fluxo "editar nova versão" cujo endpoint de suporte não está claramente definido | Pode exigir um novo endpoint (`POST /inspection-templates/{id}/versions/draft` ou similar) | **[DECISÃO NECESSÁRIA]** |
| PEND-F08 | Máscaras de campo (telefone, documento/CNPJ-CPF, CEP) não são especificadas em nenhum documento | `modelo-de-dados.md` §10.5 (campos declarados como `string`, sem formato) | Define os componentes de máscara em FE-W04/06/09 | Nenhum — validação de formato não é normativa na API além de `string` | **[A DEFINIR]** |
| PEND-F09 | Se a listagem de inspeções (FE-W18) exibe progresso (respondidos/total) na própria linha da tabela, o que exigiria uma chamada adicional por linha ou um campo agregado que não existe em `Inspection`/`InspectionPage` (só em `InspectionDetail.items`/`responses`) | `interface-admnistrativa-web.md` §14.10 (lista "progresso, quando disponível" como coluna, sem garantir a fonte) | Define se a coluna existe na lista ou só no detalhe | Pode exigir um campo agregado (`answeredCount`/`totalCount`) em `Inspection`/`InspectionPage` | **[DECISÃO NECESSÁRIA]** |

---

# 22. Validação final

Checklist de autorrevisão deste documento, seguindo os critérios do enunciado.

- [x] Todas as 37 telas possuem identificação (FE-Mxx/FE-Wxx) — seção 2.
- [x] Todas as telas possuem rota ou estão marcadas como `[A DEFINIR]` — seções 2 e 3 (7 telas web de cadastro/edição marcadas; FE-W23 marcada como pendente de endpoint, mas com rota já conhecida).
- [x] Todas as telas possuem perfil de acesso — seções 2, 3 e 14.
- [x] Todas as ações possuem endpoint correspondente, exceto onde marcado `[A DEFINIR]`/`[PENDÊNCIA]` — seções 3, 18, 19.
- [x] Todos os endpoints utilizados possuem método HTTP definido — seções 3, 18, 19 (idêntico a `openapi.yaml`).
- [x] Todos os endpoints possuem request documentado quando necessário — seção 5 (campo a campo) + referências pontuais na seção 3.
- [x] Todos os endpoints possuem response documentado — seção 6 (campo a campo, por entidade) + seção 18.
- [x] Todos os payloads possuem campos e tipos definidos — seção 5.
- [x] Erros relevantes documentados — seção 8 (padrão geral) + exceções pontuais citadas por tela na seção 3; catálogo completo de status HTTP no documento 20 §5, referenciado e não duplicado.
- [x] Estados relevantes documentados — seção 8 (interface) e seção 17 (entidade/workflow).
- [x] Permissões consistentes entre seções 3, 14 e a matriz de endpoints do documento 20 §6 — nenhuma divergência encontrada nesta revisão; a única nuance registrada é a diferença entre "não permitido" e "não implementado no MVP" para acesso mobile de ADMIN/SUPERVISOR (seção 14, nota final).
- [x] Nomes de campo consistentes com o backend — todos os nomes desta seção 5/6 foram copiados de `openapi.yaml`, não reescritos.
- [x] Enums consistentes com o backend — seção 5/6 usa os mesmos enums do documento 20 §7.2, sem introduzir valores novos.
- [x] Regras de negócio não foram alteradas — toda regra citada aponta para o `RN-XXX` de origem; nenhuma regra nova foi inventada, apenas sua consequência de UI foi descrita.
- [ ] **Não existem telas sem suporte no backend** — **ressalva:** FE-W23 (Auditoria) é a exceção conhecida e sinalizada (PEND-F04); todas as demais 36 telas têm suporte de endpoint documentado.
- [x] Endpoints sem consumidor identificado foram sinalizados — seção 19 (`PATCH /non-conformities/{id}/status`).
- [x] Fluxos mobile offline documentados — seção 16 (e seção 3 por tela, seção 7.4–7.6 para fluxos passo a passo).
- [x] Upload/evidências documentados — seção 15 (mobile) e referências no documento 20 §10 (limites ainda pendentes, PEND-16).
- [ ] **A documentação permite desenvolvimento paralelo total** — **ressalva:** 9 pendências específicas de tela (PEND-F01 a PEND-F09) e as 19 pendências herdadas do documento 20 continuam bloqueando decisões pontuais de componente (ver lista consolidada na seção 21 e no documento 20 §17). Nenhuma delas impede o **início** do desenvolvimento — todas são isoláveis por tela/componente e não têm efeito cascata sobre o restante do sistema, exceto PEND-F04/PEND-08 (auditoria) e PEND-03 (formato de `optionsJson`), já destacadas como prioritárias no documento 20 §18.2.

## Resumo das duas ressalvas acima

1. **FE-W23 (Auditoria)** é a única tela do inventário sem contrato de API. Recomenda-se removê-la do escopo do MVP ou resolver PEND-08/PEND-F04 antes de alocar trabalho de frontend a ela.
2. Nenhuma das 9 pendências específicas de tela (PEND-F01–F09) impede que as outras 35 telas comecem a ser construídas hoje contra `openapi.yaml` — elas afetam apenas decisões de componente isoladas (modal vs. rota, máscara de campo, coluna de progresso), não o contrato de dados em si.
