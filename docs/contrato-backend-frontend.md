# 20 - Contrato Backend ↔ Frontend — Especificação Técnica Completa

> **Status:** documento normativo. **Fontes primárias:** todos os arquivos em `./docs` (01–19), `./openapi.yaml`, `./db/schema.sql`, `./db/seed.sql`, `./test-plan.md`.
> **Objetivo:** permitir que o backend (Java/Spring Boot) e os dois frontends (mobile Expo/React Native e admin Angular) sejam implementados **em paralelo**, sem que nenhuma equipe precise adivinhar uma regra, um formato de campo ou uma permissão.
> **Convenção de rastreabilidade:** toda afirmação de regra cita seu identificador de origem (`RN-XXX`, `UC-XX`, `AC-<ÁREA>`, `RNF-XXX`) e o documento-fonte. Onde a documentação de origem não define algo, isso é sinalizado como **[PENDÊNCIA]**, **[DECISÃO NECESSÁRIA]**, **[INCONSISTÊNCIA]** ou **[A DEFINIR]** — nenhum comportamento foi inventado para preencher essas lacunas.

## Como este documento se relaciona com os demais artefatos do repositório

O projeto já possui dois artefatos formais derivados de `./docs`:

| Artefato | O que já cobre | O que este documento adiciona |
|---|---|---|
| `openapi.yaml` (raiz, 3230 linhas) | Contrato máquina-a-máquina completo: todo endpoint, todo DTO, todo enum, erros padronizados, exemplos por schema. **É a fonte canônica de tipos e formatos de campo.** | Explica **por que** cada endpoint existe, **quem** pode chamá-lo (matriz de permissão, ausente do YAML), o fluxo completo em que se encaixa, e cruza tudo de volta às regras de negócio. |
| `db/schema.sql` + `db/seed.sql` | Schema relacional mínimo e dados determinísticos de demonstração. | Referenciado na seção 7 (Modelos e Estados) para confirmar que as `CHECK` constraints do banco batem com os enums do contrato. |
| `test-plan.md` | Estratégia de testes e checklist de cobertura por marco (M1–M8). | Referenciado na seção 16 (rastreabilidade) — este documento não duplica a lista de arquivos de teste. |

**Regra de precedência:** em caso de divergência entre este documento e `openapi.yaml`, o `openapi.yaml` prevalece para formato de campo (tipo, obrigatoriedade, enum) — ele é o contrato executável. Este documento prevalece para **regra de negócio, fluxo e permissão**, que o formato OpenAPI não expressa bem. Nenhuma divergência foi encontrada entre os dois durante a elaboração deste documento (ver seção 18).

---

# 1. Análise inicial — cruzamento dos documentos-fonte

## 1.1 Entidades identificadas

`User`, `Client`, `InspectionSite`, `Equipment`, `InspectionTemplate`, `InspectionTemplateVersion`, `TemplateSection`, `TemplateItem`, `Inspection`, `InspectionItemSnapshot`, `InspectionResponse`, `Evidence`, `NonConformity`, `InspectionReview`, `AuditEvent` (persistência central/PostgreSQL) + `SyncOperation`, `SyncMetadata` (persistência local/SQLite, sem equivalente no PostgreSQL). Fonte: `modelo-de-dados.md` §10.18.

## 1.2 Perfis de usuário

`ADMIN`, `SUPERVISOR`, `TECHNICIAN`, `CLIENT_VIEWER` (futuro/opcional, sem endpoints no MVP). Fonte: `perfis-de-usuario.md` §5.1.

## 1.3 Contextos funcionais (módulos do backend)

Identidade e acesso · Cadastros · Modelos de inspeção · Planejamento · Execução de campo · Sincronização · Revisão · Auditoria e indicadores. Fonte: `arquitetura.md` §11.3.

## 1.4 Inconsistências e decisões já resolvidas entre documentos

A leitura cruzada dos 19 documentos originais revelou os pontos abaixo. Alguns já foram resolvidos em `openapi.yaml` (produzido em uma etapa anterior deste mesmo projeto); são listados aqui para que a equipe não os reabra sem necessidade. Outros continuam em aberto e são repetidos na seção 17.

| # | Divergência | Documentos envolvidos | Resolução |
|---|---|---|---|
| INC-01 | Nomes de estado da inspeção em português (`RASCUNHO`, `ATRIBUÍDA`, `EM_ANDAMENTO`, `ENVIADA`, `EM_REVISÃO`, `APROVADA`, `REPROVADA`, `CANCELADA`) vs. em inglês (`DRAFT`, `ASSIGNED`, `IN_PROGRESS`, `SUBMITTED`, `UNDER_REVIEW`, `APPROVED`, `REJECTED`, `CANCELED`) | `fluxo-geral.md` §7.4/7.6 (PT) vs. `modelo-de-dados.md` §10.8.1 e `api-rest.md` (EN) | **Resolvida.** `openapi.yaml` usa os valores em inglês (`InspectionStatus`); é o valor que trafega na API. Os nomes em português em `fluxo-geral.md` devem ser lidos como rótulos de exibição, não como valores de contrato. Este documento usa os valores em inglês em toda a seção 7. |
| INC-02 | Endpoint de sincronização: `api-rest.md` §12.15 deixava em aberto "endpoint combinado OU endpoints separados" | `api-rest.md` §12.15 | **Resolvida.** `openapi.yaml` adota dois endpoints: `POST /mobile/sync/push` + `GET /mobile/sync/pull`. Ver seção 11. |
| INC-03 | Nome do parâmetro de caminho de inspeção alternava entre `{id}` e `{inspectionId}` | `api-rest.md` §12.10 vs. §12.14 | **Resolvida.** Todo subrecurso de inspeção usa `{inspectionId}` (`openapi.yaml`, nota de normalização #2). |
| INC-04 | `PATCH /non-conformities/{id}/status` existe no contrato, mas `NonConformityStatus` só tem o valor `OPEN` no MVP (RN-057) | `api-rest.md` §12.13, `regras-de-negocio.md` RN-057, `openapi.yaml` | **Não resolvida — repetida como PEND-11 (seção 17).** O endpoint fica sem uso funcional até que o fluxo de tratamento de não conformidade (P2, `funcionalidades.md` §8.4) seja implementado. |
| INC-05 | `interface-admnistrativa-web.md` §14.3 mapeia a rota `/audit`, mas nenhum documento de API define um endpoint de auditoria **global** — apenas `GET /inspections/{inspectionId}/history`, escopado a uma inspeção | `interface-admnistrativa-web.md` §14.3 vs. `api-rest.md` §12 (ausente), `openapi.yaml` (ausente) | **Não resolvida — repetida como PEND-08 (seção 17).** |
| INC-06 | Permissão de "Iniciar inspeção"/"Responder checklist" aparece como **Opcional** para o Supervisor na matriz de `perfis-de-usuario.md` §5.2, mas RN-033 fixa a regra para o MVP como exclusiva do técnico responsável ("salvo permissão administrativa excepcional **não prevista no MVP**") | `perfis-de-usuario.md` §5.2 vs. `regras-de-negocio.md` RN-033 | **Resolvida por precedência normativa.** RN-033 é uma regra de negócio numerada e explícita sobre o MVP; a coluna "Opcional" da matriz de perfis descreve uma configurabilidade futura, não o comportamento do MVP. Este documento aplica RN-033: `POST /inspections/{id}/start` e as escritas de checklist são exclusivas de `TECHNICIAN` no MVP. |
| INC-07 | `perfis-de-usuario.md` §5.2 permite que o **Supervisor** cadastre equipamentos (✅), mas **não** permite que cadastre clientes ou locais (❌, exclusivo de `ADMIN`) | `perfis-de-usuario.md` §5.2 | **Não é uma inconsistência entre documentos** — é uma assimetria deliberada de um único documento, preservada como está (ver matriz da seção 6). Nenhum outro documento contradiz isso. |

## 1.5 Requisitos não funcionais identificados

RNF-001 a RNF-012, listados integralmente em `arquitetura.md` §11.14 e reproduzidos por referência ao longo deste documento (paginação → RNF-003, idempotência → RNF-005 etc.).

---

# 2. Documentação do Backend

## 2.1 Arquitetura

Arquitetura distribuída com três aplicações independentes que compartilham um contrato de API (`arquitetura.md` §11.1):

```text
┌─────────────────────────────┐
│ Aplicativo Mobile           │   Expo + React Native + SQLite + Secure Store
└──────────────┬──────────────┘
               │ HTTPS / JSON / multipart
               ▼
┌─────────────────────────────┐
│ API REST                    │   Java + Spring Boot — segurança + regras
└───────┬──────────────┬──────┘
        ▼              ▼
┌──────────────┐  ┌──────────────────┐
│ PostgreSQL   │  │ Armazenamento de │
│ (dados)      │  │ evidências       │
└──────────────┘  └──────────────────┘
        ▲
        │ HTTPS / JSON
┌───────┴─────────────────────┐
│ Interface Administrativa    │   Angular + TypeScript
└─────────────────────────────┘
```

**Princípios arquiteturais** (`arquitetura.md` §11.2): separação interface/aplicação/domínio/infraestrutura; API como ponto central de regras e autorização; contrato documentado antes da integração; persistência local como parte da arquitetura (não correção posterior); sincronização idempotente; modelos versionados; entidades históricas preservadas; erros padronizados; segredos fora do repositório; componentes implantáveis separadamente.

## 2.2 Módulos do backend (por domínio/feature)

```text
com.fieldops
├── auth/            Autenticação, tokens, sessão
├── user/            Usuários e perfis
├── client/          Clientes
├── site/            Locais de inspeção
├── equipment/       Equipamentos
├── template/         Modelos, versões, seções, itens
├── inspection/       Planejamento e ciclo de vida da inspeção
├── evidence/         Upload e metadados de evidências
├── synchronization/  Outbox, idempotência, cursor
├── review/           Revisão, aprovação, reprovação
├── audit/            Eventos de auditoria
└── shared/           Erros, paginação, validação transversal
```

Cada feature segue: `controller/ → application/ (casos de uso) → domain/ (regras e transições) → repository/ → dto/ → mapper/ → validation/`. Fonte: `arquitetura.md` §11.6.

## 2.3 Entidades e agregados

Ver seção 7 (Modelos e Estados) para o detalhamento completo campo a campo — já formalizado em `db/schema.sql` e `openapi.yaml`. Resumo de responsabilidade por entidade em `modelo-de-dados.md` §10.18.

## 2.4 Casos de uso mapeados a serviços de aplicação

| Caso de uso (`casos-de-uso.md`) | Serviço de aplicação sugerido |
|---|---|
| UC-01 Autenticar usuário | `AuthenticationService` |
| UC-02 Gerenciar usuários | `UserManagementService` |
| UC-03 Gerenciar clientes/locais/equipamentos | `ClientService`, `SiteService`, `EquipmentService` |
| UC-04/UC-05 Criar/publicar modelo | `InspectionTemplateService`, `TemplatePublicationService` |
| UC-06 Agendar e atribuir | `InspectionSchedulingService` |
| UC-07 Baixar inspeções | `MobileInspectionQueryService` |
| UC-08 Identificar por QR Code | `EquipmentLookupService` |
| UC-09–UC-13 Execução | `InspectionExecutionService`, `ResponseService`, `EvidenceService`, `NonConformityService` |
| UC-14 Sincronizar | `SynchronizationService` (push) + `SynchronizationPullService` |
| UC-15–UC-17 Revisão | `InspectionReviewService` |
| UC-18/UC-19 Histórico/indicadores | `AuditQueryService`, `DashboardService` |

## 2.5 Autenticação e autorização

Ver seção 6 (matriz completa).

## 2.6 Persistência

PostgreSQL relacional, migrações versionadas, UUID como identificador universal, controle otimista via campo `version`, exclusão lógica para entidades históricas, transações em casos de uso multi-entidade (`arquitetura.md` §11.7). Schema mínimo de referência: `db/schema.sql` (15 tabelas, listadas na seção 7).

## 2.7 Auditoria

Toda alteração crítica gera um `AuditEvent`. Catálogo de ações e contrato de exposição ao frontend: seção 12.

## 2.8 Armazenamento de evidências

Banco armazena metadados + chave do objeto; arquivo fica em armazenamento compatível com S3 (produção) ou armazenamento local controlado (desenvolvimento). Acesso somente por endpoint autorizado ou URL temporária — nunca exposição pública permanente (`arquitetura.md` §11.8). Contrato completo: seção 10.

## 2.9 Processamento offline/sincronização

Ver seção 11.

## 2.10 Integrações externas

Nenhuma integração externa (ERP, pagamento, IoT, sensores) está no escopo do MVP (`visao-geral.md` §1.7, `funcionalidades.md` §8.4). Não há integrações a documentar nesta versão.

## 2.11 Tratamento de erros

Ver seção 5.

## 2.12 Validação, paginação, filtros, ordenação

Ver seções 5 e 9.

## 2.13 Versionamento da API

Prefixo `/api/v1`. Mudanças incompatíveis exigem nova versão ou plano de migração explícito; campos novos devem ser opcionais; enums tratados de forma controlada; mobile pode informar sua versão para diagnóstico; API pode recusar versões incompatíveis com mensagem clara (`api-rest.md` §12.18).

## 2.14 Observabilidade

Identificador de correlação por requisição (`requestId`, presente no schema `Error`); logs de autenticação sem conteúdo sensível; logs de falha de sincronização; auditoria de transições de estado; registro de upload com id da evidência; tratamento global de exceções; mensagens amigáveis na interface + detalhes técnicos controlados no servidor (`arquitetura.md` §11.11).

## 2.15 Requisitos de segurança

HTTPS em ambientes publicados; hash seguro de senha; tokens de acesso de duração limitada; Secure Store no mobile; autorização validada em cada endpoint (não só na interface); uploads validados; logs sem senha/token/arquivo; segredos via variável de ambiente; CORS restrito a origens autorizadas; erros externos sem stack trace (`arquitetura.md` §11.10).

## 2.16 Decisões arquiteturais registradas

As 6 decisões de normalização documentadas no cabeçalho `info.description` de `openapi.yaml` (endpoint de sync, nomenclatura `{inspectionId}`, construtor de modelo operando sobre a versão DRAFT implícita, `technicianId` obrigatório na criação, enum `ResponseType` restrito aos 7 tipos do MVP, imutabilidade de `clientId`/`siteId`/`qrCode` após criação) são decisões arquiteturais efetivas deste projeto e têm a mesma força normativa das regras de negócio numeradas. Não devem ser revisitadas sem uma decisão de produto explícita.

## 2.17 Requisitos não funcionais (RNF)

| ID | Requisito |
|---|---|
| RNF-001 | O app mobile deve preservar dados pendentes após reinicialização. |
| RNF-002 | A API deve responder erros em formato padronizado (seção 5). |
| RNF-003 | Listagens administrativas devem usar paginação (seção 9). |
| RNF-004 | O app deve apresentar estados de carregamento, vazio, erro e offline. |
| RNF-005 | Operações de sincronização devem ser idempotentes (seção 11). |
| RNF-006 | A interface mobile deve ser utilizável em telas Android comuns. |
| RNF-007 | A interface administrativa deve ser responsiva para notebook/desktop. |
| RNF-008 | O contrato da API deve ser documentado (`openapi.yaml` + este documento). |
| RNF-009 | O código deve passar por análise de tipos e lint. |
| RNF-010 | Dados sensíveis não devem estar no repositório. |
| RNF-011 | Alterações críticas devem ser auditáveis (seção 12). |
| RNF-012 | Os componentes devem poder ser executados por instruções documentadas. |

Fonte: `arquitetura.md` §11.14.

---

# 3. Catálogo completo de endpoints

**Convenções válidas para todos os endpoints abaixo**, salvo exceção indicada:

- Prefixo comum: `/api/v1` (omitido nas tabelas por brevidade — ex.: "`/clients`" = `GET /api/v1/clients`).
- `Content-Type: application/json` para todos os endpoints, exceto upload de evidência (`multipart/form-data`).
- Header obrigatório em todo endpoint autenticado: `Authorization: Bearer <accessToken>`.
- Identificadores de path/body: UUID v4.
- Datas/horas: ISO 8601 (`date-time` com fuso, ou UTC).
- `401` é sempre possível (sessão ausente/inválida) e não é repetido em cada linha da tabela detalhada abaixo — está implícito em "Autenticação: obrigatória".
- Toda referência de schema (`→ XyzResponse`) está definida por completo em `openapi.yaml`, componente `#/components/schemas/Xyz`.

## 3.1 Índice de endpoints por domínio

| Domínio | Endpoints |
|---|---|
| Auth | `POST /auth/login` · `POST /auth/refresh` · `POST /auth/logout` · `GET /auth/me` |
| Users | `GET /users` · `POST /users` · `GET /users/{id}` · `PUT /users/{id}` · `PATCH /users/{id}/status` · `POST /users/{id}/reset-password` |
| Clients | `GET /clients` · `POST /clients` · `GET /clients/{id}` · `PUT /clients/{id}` · `PATCH /clients/{id}/status` · `GET /clients/{clientId}/sites` |
| Sites | `GET /sites` · `POST /sites` · `GET /sites/{id}` · `PUT /sites/{id}` · `PATCH /sites/{id}/status` · `GET /sites/{siteId}/equipment` |
| Equipment | `GET /equipment` · `POST /equipment` · `GET /equipment/{id}` · `PUT /equipment/{id}` · `GET /equipment/by-qr/{qrCode}` · `PATCH /equipment/{id}/status` |
| Inspection Templates | `GET /inspection-templates` · `POST /inspection-templates` · `GET /inspection-templates/{id}` · `PUT /inspection-templates/{id}` · `POST /inspection-templates/{id}/sections` · `PUT /inspection-templates/{id}/sections/{sectionId}` · `POST /inspection-templates/{id}/sections/{sectionId}/items` · `PUT /inspection-templates/{id}/items/{itemId}` · `POST /inspection-templates/{id}/publish` · `GET /inspection-templates/{id}/versions` · `GET /inspection-template-versions/{versionId}` |
| Inspections | `GET /inspections` · `POST /inspections` · `GET /inspections/{inspectionId}` · `PUT /inspections/{inspectionId}` · `POST /inspections/{inspectionId}/assign` · `POST /inspections/{inspectionId}/cancel` · `POST /inspections/{inspectionId}/start` · `POST /inspections/{inspectionId}/submit` · `POST /inspections/{inspectionId}/begin-review` · `POST /inspections/{inspectionId}/approve` · `POST /inspections/{inspectionId}/reject` · `GET /inspections/{inspectionId}/history` · `GET /inspections/{inspectionId}/reviews` |
| Mobile | `GET /mobile/inspections` · `GET /mobile/inspections/{inspectionId}` |
| Responses | `GET /inspections/{inspectionId}/responses` · `PUT /inspections/{inspectionId}/responses/{responseId}` · `POST /inspections/{inspectionId}/responses:batch` |
| Evidence | `POST /inspections/{inspectionId}/evidence` · `GET /inspections/{inspectionId}/evidence` · `GET /evidence/{id}` · `DELETE /evidence/{id}` |
| Non-Conformities | `GET /non-conformities` · `GET /non-conformities/{id}` · `POST /inspections/{inspectionId}/non-conformities` · `PUT /non-conformities/{id}` · `PATCH /non-conformities/{id}/status` |
| Synchronization | `POST /mobile/sync/push` · `GET /mobile/sync/pull` |
| Dashboard | `GET /dashboard/summary` · `GET /dashboard/inspections-by-status` · `GET /dashboard/non-conformities-by-severity` |

**Total: 49 endpoints.** Definição completa (parâmetros, schemas, todos os status HTTP) em `openapi.yaml`. As subseções a seguir detalham cada grupo; os fluxos de maior complexidade de negócio recebem exemplo de request/response.

## 3.2 Auth

| Método | URL | Objetivo | Auth | Perfis |
|---|---|---|---|---|
| POST | `/auth/login` | Autenticar com e-mail/senha e emitir tokens | Não | Todos |
| POST | `/auth/refresh` | Renovar `accessToken` a partir de `refreshToken` válido | Não (usa refresh token no corpo) | Todos |
| POST | `/auth/logout` | Encerrar sessão / invalidar token | Sim | Todos |
| GET | `/auth/me` | Consultar dados do usuário autenticado | Sim | Todos |

### `POST /auth/login` — request/response

```json
// Request
{ "email": "tecnico@fieldops.local", "password": "senha-informada-pelo-usuario" }

// 200 OK
{
  "accessToken": "token",
  "refreshToken": "token-de-renovacao",
  "expiresIn": 900,
  "user": {
    "id": "8a50e30d-2a58-4a24-944e-10a9948abf01",
    "name": "Carlos Técnico",
    "email": "tecnico@fieldops.local",
    "role": "TECHNICIAN"
  }
}
```

**Regras aplicadas:** RN-001 (somente usuário `ACTIVE` inicia sessão); RN-007 (credenciais/tokens nunca em log). **Erros:** `401` credenciais inválidas ou usuário inativo — a mensagem **não deve revelar** se o e-mail existe (AC-AUTH, cenário "credenciais inválidas"). **[PENDÊNCIA]** o valor exato de `expiresIn` (aqui 900s = 15min, um valor de exemplo do documento de origem) e a duração do `refreshToken` não são normativamente fixados em nenhum documento — precisam de decisão de produto antes da implementação (ver PEND-01).

## 3.3 Users (exclusivo `ADMIN`)

| Método | URL | Objetivo | Perfis |
|---|---|---|---|
| GET | `/users` | Listar/paginar/filtrar usuários (`name`, `email`, `role`, `status`) | ADMIN |
| POST | `/users` | Cadastrar usuário | ADMIN |
| GET | `/users/{id}` | Consultar usuário | ADMIN |
| PUT | `/users/{id}` | Atualizar dados do usuário | ADMIN |
| PATCH | `/users/{id}/status` | Ativar/inativar/bloquear (RN-001, RN-002, RN-008) | ADMIN |
| POST | `/users/{id}/reset-password` | Solicitar redefinição de senha | ADMIN |

**Regra de efeito colateral crítica:** `PATCH /users/{id}/status` para `INACTIVE` ou `BLOCKED` **deve invalidar as sessões ativas** do usuário (RN-008). **Erro `409`** em `POST /users`: e-mail já cadastrado (AC-USERS).

## 3.4 Clients, Sites, Equipment (Cadastros)

| Método | URL | Objetivo | Quem escreve | Quem lê |
|---|---|---|---|---|
| GET/POST/PUT | `/clients`, `/clients/{id}` | CRUD de cliente | ADMIN | ADMIN, SUPERVISOR |
| PATCH | `/clients/{id}/status` | Inativar/reativar cliente | ADMIN | — |
| GET | `/clients/{clientId}/sites` | Locais de um cliente (combo encadeado) | — | ADMIN, SUPERVISOR |
| GET/POST/PUT | `/sites`, `/sites/{id}` | CRUD de local | ADMIN | ADMIN, SUPERVISOR |
| PATCH | `/sites/{id}/status` | Inativar/reativar local | ADMIN | — |
| GET | `/sites/{siteId}/equipment` | Equipamentos de um local (combo encadeado) | — | ADMIN, SUPERVISOR |
| GET/POST/PUT | `/equipment`, `/equipment/{id}` | CRUD de equipamento | ADMIN **e** SUPERVISOR | ADMIN, SUPERVISOR |
| GET | `/equipment/by-qr/{qrCode}` | Buscar equipamento pelo código QR | — | ADMIN, SUPERVISOR, TECHNICIAN |
| PATCH | `/equipment/{id}/status` | Inativar/reativar/descomissionar | ADMIN **e** SUPERVISOR | — |

**Regras aplicadas:** RN-009 (todo local pertence a um cliente) · RN-010 (todo equipamento pertence a um local no MVP) · RN-011 (QR Code único) · RN-012 (equipamento inativo não pode ser usado em nova inspeção) · RN-013 (inativação lógica, não exclusão física) · RN-014 (local compatível com equipamento). **Imutabilidade pós-criação:** `clientId` de um `Site` e `siteId`/`qrCode` de um `Equipment` **não** aparecem nos DTOs de atualização (`openapi.yaml`, decisão de normalização #6) — realocar um local para outro cliente ou um equipamento para outro local não é uma operação suportada no MVP.

**`GET /equipment/by-qr/{qrCode}`:** usado pelo fluxo UC-08 (leitura de QR Code). RN-063 exige que a leitura do QR **não autorize, sozinha**, acesso a dados fora do escopo do usuário — logo, mesmo com o QR correto, a API deve validar que o técnico autenticado tem uma inspeção atribuída relacionada a esse equipamento antes de expor dados além do mínimo de identificação. **[A DEFINIR]** o corpo exato de "dados mínimos de identificação" que a API retorna quando o técnico consulta um equipamento fora de suas inspeções atribuídas (por exemplo, ao ler um QR Code por engano) não é especificado — ver PEND-04.

## 3.5 Inspection Templates (exclusivo `ADMIN`/`SUPERVISOR`)

| Método | URL | Objetivo |
|---|---|---|
| GET | `/inspection-templates` | Listar modelos (filtros: `category`, `status`) |
| POST | `/inspection-templates` | Criar modelo em `DRAFT` |
| GET | `/inspection-templates/{id}` | Consultar modelo |
| PUT | `/inspection-templates/{id}` | Atualizar título/descrição/categoria |
| POST | `/inspection-templates/{id}/sections` | Criar seção **na versão rascunho implícita** |
| PUT | `/inspection-templates/{id}/sections/{sectionId}` | Atualizar seção |
| POST | `/inspection-templates/{id}/sections/{sectionId}/items` | Criar item |
| PUT | `/inspection-templates/{id}/items/{itemId}` | Atualizar item |
| POST | `/inspection-templates/{id}/publish` | Publicar versão imutável |
| GET | `/inspection-templates/{id}/versions` | Listar versões publicadas |
| GET | `/inspection-template-versions/{versionId}` | Detalhe de uma versão (com seções/itens) |

**Decisão de contrato (openapi.yaml, normalização #3):** os endpoints de seção/item operam implicitamente sobre a versão em `DRAFT` do modelo, porque RN-018 permite alteração livre **somente** nesse estado. Não existe endpoint para editar seção/item de uma versão já publicada (RN-019) — `409` se o modelo não tiver uma versão rascunho editável.

### `POST /inspection-templates/{id}/publish` — regras e exemplo

**Bloqueia a publicação (`422`) quando:** o modelo não tem título/categoria, não tem ao menos uma seção com item válido (RN-015), ou existe item sem `responseType` (RN-016). **Efeito:** cria uma `InspectionTemplateVersion` imutável, numerada sequencialmente por modelo (RN-020); versões antigas continuam válidas para inspeções já criadas (RN-022).

```json
// Exemplo de item dentro do construtor (TemplateItemCreateRequest)
{
  "title": "A proteção do equipamento está íntegra?",
  "description": "Verifique trincas, ausência de parafusos e partes soltas.",
  "responseType": "CONFORMITY",
  "required": true,
  "observationRequiredOnFailure": true,
  "evidenceRequiredOnFailure": true,
  "displayOrder": 3
}
```

`ResponseType` restrito no MVP a: `TEXT_SHORT, TEXT_LONG, NUMBER, BOOLEAN, CONFORMITY, SINGLE_CHOICE, DATE` (RN-023, `funcionalidades.md` §8.5) — tipos P1 (seleção múltipla, assinatura etc.) não devem ser aceitos na publicação até entrarem em escopo.

## 3.6 Inspections (planejamento e ciclo de vida)

| Método | URL | Objetivo | Perfis de escrita |
|---|---|---|---|
| GET | `/inspections` | Listagem administrativa (filtros completos, seção 9) | ADMIN, SUPERVISOR (leitura) |
| POST | `/inspections` | Agendar inspeção (cria snapshot) | ADMIN, SUPERVISOR |
| GET | `/inspections/{inspectionId}` | Detalhe completo (itens, respostas, NCs, revisões) | ADMIN, SUPERVISOR (qualquer); TECHNICIAN (somente a própria, RN-004) |
| PUT | `/inspections/{inspectionId}` | Atualizar dados de planejamento (somente em `DRAFT`/`ASSIGNED`) | ADMIN, SUPERVISOR |
| POST | `/inspections/{inspectionId}/assign` | Atribuir/reatribuir técnico | ADMIN, SUPERVISOR |
| POST | `/inspections/{inspectionId}/cancel` | Cancelar com justificativa obrigatória | ADMIN, SUPERVISOR |
| POST | `/inspections/{inspectionId}/start` | Iniciar execução | **TECHNICIAN responsável, exclusivo (RN-033)** |
| POST | `/inspections/{inspectionId}/submit` | Concluir e enviar para revisão | **TECHNICIAN responsável, exclusivo (RN-033)** |
| POST | `/inspections/{inspectionId}/begin-review` | Iniciar revisão formal | SUPERVISOR (RN-079) |
| POST | `/inspections/{inspectionId}/approve` | Aprovar | SUPERVISOR (RN-079) |
| POST | `/inspections/{inspectionId}/reject` | Reprovar com motivo obrigatório | SUPERVISOR (RN-079) |
| GET | `/inspections/{inspectionId}/history` | Auditoria da inspeção | ADMIN, SUPERVISOR (qualquer); TECHNICIAN (própria) |
| GET | `/inspections/{inspectionId}/reviews` | Ciclos de revisão | ADMIN, SUPERVISOR (qualquer); TECHNICIAN (própria) |

### `POST /inspections` — request/response completo

```json
// InspectionCreateRequest
{
  "templateVersionId": "b1e2...version",
  "clientId": "c1...",
  "siteId": "s1...",
  "equipmentId": "e1...",           // opcional só quando o modelo é de local/ambiente (RN-026)
  "technicianId": "t1...",
  "supervisorId": "sup1...",
  "title": "Inspeção mensal — Gerador GD-001",
  "instructions": "Verificar nível de óleo antes de iniciar.",
  "priority": "HIGH",
  "scheduledFor": "2026-08-20T09:00:00-03:00"
}
```

**Validações antes de criar (RN-025, RN-014, RN-026, RN-027, AC-SCHEDULING):**
1. `templateVersionId` deve referenciar uma versão **publicada**.
2. `clientId`, `siteId`, `technicianId` são obrigatórios; `equipmentId` é obrigatório salvo quando o modelo é de local/ambiente.
3. `siteId` deve pertencer a `clientId`; `equipmentId` (quando informado) deve pertencer a `siteId`.
4. `technicianId` deve referenciar usuário `ACTIVE` com `role = TECHNICIAN`.

**Efeito colateral (RN-021, `modelo-de-dados.md` §10.8.2):** ao confirmar, a API copia seções e itens da versão publicada para `InspectionItemSnapshot` — a inspeção nunca mais é afetada por edições futuras do modelo lógico. Resposta `201` retorna `InspectionDetail` já com `items` preenchido.

**Erro `422` típico:** `{"code": "TEMPLATE_VERSION_NOT_PUBLISHED", ...}` ou `{"code": "EQUIPMENT_SITE_MISMATCH", ...}` — os códigos exatos de erro de negócio **não têm uma lista fechada em nenhum documento de origem**; ver PEND-02.

### `POST /inspections/{inspectionId}/submit` — exemplo de erro 422

```json
{
  "timestamp": "2026-08-01T14:30:00Z",
  "status": 422,
  "code": "INSPECTION_REQUIRED_ITEMS_MISSING",
  "message": "A inspeção possui itens obrigatórios sem resposta.",
  "path": "/api/v1/inspections/00000000-0000-0000-0000-000000000000/submit",
  "requestId": "req-123",
  "fieldErrors": [
    { "field": "responses", "message": "Existem 2 itens obrigatórios pendentes." }
  ]
}
```

Bloqueado (RN-037, RN-038, RN-039, AC-COMPLETE) quando: item obrigatório sem resposta; resposta não conforme sem observação exigida; item crítico não conforme sem evidência exigida.

## 3.7 Mobile (escopo automático pelo usuário autenticado)

| Método | URL | Objetivo |
|---|---|---|
| GET | `/mobile/inspections` | Inspeções atribuídas ao técnico autenticado (filtros: `status`, `priority`, `scheduledFrom/To`) |
| GET | `/mobile/inspections/{inspectionId}` | Detalhe completo para download offline |

**Regra crítica de segurança (`api-rest.md` §12.10, AC-SECURITY):** a API filtra pelo usuário do token — **nunca** por um `technicianId` informado pelo cliente. `GET /mobile/inspections/{inspectionId}` retorna `403` se a inspeção não pertencer ao técnico autenticado (AC-SECURITY: "um técnico não consulta inspeções de outro técnico por alteração manual de URL").

## 3.8 Responses

| Método | URL | Objetivo | Perfil |
|---|---|---|---|
| GET | `/inspections/{inspectionId}/responses` | Listar respostas registradas | ADMIN, SUPERVISOR, TECHNICIAN (própria) |
| PUT | `/inspections/{inspectionId}/responses/{responseId}` | Registrar/atualizar uma resposta | TECHNICIAN (própria inspeção, estado `IN_PROGRESS`) |
| POST | `/inspections/{inspectionId}/responses:batch` | Registrar respostas em lote (uso típico da sincronização) | TECHNICIAN |

`responseId` é gerado **no dispositivo** (permite criação offline sem remapeamento, `modelo-de-dados.md` §10.2). `baseVersion` habilita controle otimista — divergência retorna `409` (RN-075). Após `submit` ou `approve`, respostas ficam bloqueadas para edição comum (`409`, RN-043/RN-082).

## 3.9 Evidence

| Método | URL | Objetivo | Perfil |
|---|---|---|---|
| POST | `/inspections/{inspectionId}/evidence` | Upload multipart | TECHNICIAN |
| GET | `/inspections/{inspectionId}/evidence` | Listar evidências (filtros: `responseId`, `nonConformityId`) | ADMIN, SUPERVISOR, TECHNICIAN (própria) |
| GET | `/evidence/{id}` | Metadados + URL temporária de acesso | ADMIN, SUPERVISOR, TECHNICIAN (própria) |
| DELETE | `/evidence/{id}` | Excluir evidência sincronizada | TECHNICIAN — **[A DEFINIR]**, ver PEND-05 |

Detalhamento completo do contrato de upload: seção 10.

## 3.10 Non-Conformities

| Método | URL | Objetivo | Perfil |
|---|---|---|---|
| GET | `/non-conformities` | Listagem administrativa (filtro: `severity`) | ADMIN, SUPERVISOR |
| GET | `/non-conformities/{id}` | Detalhe | ADMIN, SUPERVISOR, TECHNICIAN (própria) |
| POST | `/inspections/{inspectionId}/non-conformities` | Registrar NC | TECHNICIAN |
| PUT | `/non-conformities/{id}` | Atualizar NC | TECHNICIAN — **[A DEFINIR]**, ver PEND-06 |
| PATCH | `/non-conformities/{id}/status` | Alterar status | Sem uso funcional no MVP — ver INC-04 |

`severity` deve ser `LOW|MEDIUM|HIGH|CRITICAL` (RN-054); `CRITICAL` exige descrição e evidência (RN-055).

## 3.11 Synchronization

Detalhamento completo: seção 11.

## 3.12 Dashboard (P1 — resumo básico compõe o MVP administrativo)

| Método | URL | Objetivo | Perfil |
|---|---|---|---|
| GET | `/dashboard/summary` | Totais por estado, atrasadas, NCs abertas | ADMIN, SUPERVISOR |
| GET | `/dashboard/inspections-by-status` | Distribuição por estado | ADMIN, SUPERVISOR |
| GET | `/dashboard/non-conformities-by-severity` | Distribuição por criticidade | ADMIN, SUPERVISOR |

`perfis-de-usuario.md` §5.2 menciona que o técnico deveria enxergar "indicadores próprios" — **não existe endpoint para isso** no contrato atual. Ver PEND-07.

---

# 4. Contratos de API (DTOs)

Todos os DTOs estão formalizados byte a byte em `openapi.yaml` → `#/components/schemas/*` (categorias: enums, request de escrita, response de leitura, página). Esta seção documenta as **convenções gerais** que valem para todos eles e destaca os DTOs de maior complexidade de negócio.

## 4.1 Convenções gerais de campo

| Categoria | Regra |
|---|---|
| Identificadores (`id`, `*Id`) | UUID v4. Gerados no **servidor** para entidades administrativas (`User`, `Client`, `Site`, `Equipment`, `InspectionTemplate*`); gerados no **dispositivo** para entidades criadas potencialmente offline (`Inspection` não — é sempre criada pelo backend; mas `InspectionResponse.id`, `Evidence.id`, `NonConformity.id` são gerados no cliente, ver `modelo-de-dados.md` §10.2). |
| Somente leitura (`readOnly: true`) | Nunca enviados pelo frontend em um `CreateRequest`/`UpdateRequest`; presentes apenas em objetos de resposta (`id`, `createdAt`, `updatedAt`, `version`, `status` em `Inspection`, todos os campos `*AtServer`/`server*`). |
| Controle de concorrência otimista | Campo `version` (inteiro) em toda entidade sujeita a edição concorrente. Requests de atualização devem enviar `baseVersion` (nome do campo na maioria dos DTOs de escrita, ex. `InspectionResponseUpsertRequest.baseVersion`) — divergência retorna `409`. |
| Timestamps de dispositivo vs. servidor | Pares como `startedAtDevice`/`startedAtServer`, `completedAtDevice`/`submittedAtServer`, `capturedAtDevice`/`serverReceivedAt`: o primeiro é enviado pelo cliente (hora do dispositivo), o segundo é **sempre** gerado pelo servidor no recebimento — nunca aceito do cliente (RN-034, RN-042, RN-074). |
| Enums | Sempre `UPPER_SNAKE_CASE`; lista fechada — ver seção 7.2 para o catálogo completo. |
| Paginação | Envelope `PageInfo` (`page`, `size`, `totalElements`, `totalPages`) + `content: []`. Ver seção 9. |
| Datas | ISO 8601 (`date-time` ou `date`). |
| JSON livre (`*Json`) | `options_json`/`rules_json` (item de checklist), `payload`/`payloadJson` (sincronização), `*_value_json` (auditoria) são objetos de schema aberto (`additionalProperties: true`) — o formato interno depende do `responseType`/`entityType` correspondente. **[A DEFINIR]** o schema interno de `optionsJson` para `SINGLE_CHOICE` (lista de opções — formato de string simples? `{value,label}`?) não está fixado em nenhum documento — ver PEND-03. |

## 4.2 DTOs centrais para o checklist dinâmico (o contrato mais crítico para o frontend)

O componente de checklist do mobile (`aplicativo-mobile.md` §13.5) precisa renderizar dinamicamente a partir de **dois** DTOs em conjunto:

**`InspectionItemSnapshot`** (o que perguntar — imutável, copiado da versão publicada no momento do agendamento):

```json
{
  "id": "item-snap-001",
  "inspectionId": "insp-045",
  "sourceTemplateItemId": "tpl-item-77",
  "sectionTitle": "Sistema elétrico",
  "sectionOrder": 3,
  "itemCode": "ELE-04",
  "itemTitle": "A bateria apresenta danos?",
  "itemDescription": "Verifique corrosão nos terminais e vazamentos.",
  "responseType": "CONFORMITY",
  "required": true,
  "rulesJson": { "observationRequiredOnFailure": true, "evidenceRequiredOnFailure": true },
  "optionsJson": null,
  "itemOrder": 4,
  "createdAt": "2026-08-01T08:00:00Z"
}
```

**`InspectionResponse`** (o que foi respondido — 0..1 por snapshot, `UNIQUE(inspectionItemId)`):

```json
{
  "id": "62327a9a-ec19-46a2-89ae-b49086b657f9",
  "inspectionId": "insp-045",
  "inspectionItemId": "item-snap-001",
  "valueBoolean": false,
  "conformity": "NON_CONFORMING",
  "observation": "Proteção lateral apresenta trinca.",
  "answeredBy": "8a50e30d-...",
  "answeredAtDevice": "2026-08-01T10:12:30-03:00",
  "serverReceivedAt": "2026-08-01T14:15:00Z",
  "version": 1
}
```

**Mapeamento tipo → campo de valor → componente visual** (`aplicativo-mobile.md` §13.5, `modelo-de-dados.md` §10.8.4):

| `responseType` | Campo(s) preenchido(s) em `InspectionResponse` | Componente mobile |
|---|---|---|
| `TEXT_SHORT` | `valueText` | Input de texto |
| `TEXT_LONG` | `valueText` | Área de texto |
| `NUMBER` | `valueNumber` | Input numérico |
| `BOOLEAN` | `valueBoolean` | Seletor Sim/Não |
| `CONFORMITY` | `conformity` (+ `valueBoolean` opcional) | Conforme/Não conforme/Não aplicável |
| `SINGLE_CHOICE` | `valueJson` (estrutura **[A DEFINIR]**, ver PEND-03) | Seleção única |
| `DATE` | `valueDate` | Seletor de data |

Tipos desconhecidos **não devem quebrar a tela** — o app deve indicar incompatibilidade e impedir conclusão quando o item obrigatório não puder ser respondido (`aplicativo-mobile.md` §13.5, AC-CHECKLIST).

## 4.3 Campos gerados pelo backend vs. enviados pelo frontend (por entidade principal)

| Entidade | Gerados pelo backend (nunca no request) | Enviados pelo frontend |
|---|---|---|
| `Inspection` | `id`, `status`, `createdBy`, `startedAtServer`, `submittedAtServer`, `approvedAt`, `canceledAt`, `canceledBy`, `createdAt`, `updatedAt`, `version` | `templateVersionId`, `clientId`, `siteId`, `equipmentId`, `technicianId`, `supervisorId`, `title`, `instructions`, `priority`, `scheduledFor` |
| `InspectionResponse` | `inspectionId` (via path), `answeredBy`, `serverReceivedAt`, `createdAt`, `updatedAt`, `version` | `id` (gerado no device), `inspectionItemId`, `value*`, `observation`, `conformity`, `answeredAtDevice`, `baseVersion` |
| `Evidence` | `storageKey`, `accessUrl`, `serverReceivedAt`, `uploadedAt`, `createdBy`, `createdAt` | `idempotencyKey`, `responseId`/`nonConformityId`, `type`, `description`, `capturedAtDevice`, `latitude`/`longitude`, `file` |
| `NonConformity` | `id` (gerado no device, ver `modelo-de-dados.md` §10.9.1/10.10.1 — nota: `Evidence.id` e `NonConformity.id` são "geráveis no dispositivo"), `status`, `createdBy`, `serverReceivedAt`, `createdAt`, `updatedAt`, `version` | `inspectionItemId`, `responseId`, `title`, `description`, `severity`, `createdAtDevice` |
| `User` | `id`, `passwordHash` (nunca exposto), `createdAt`, `updatedAt`, `version` | `name`, `email`, `role`, `phone` (senha inicial: ver PEND-01) |

---

# 5. Respostas de erro

## 5.1 Estrutura única de erro (todo endpoint, todo status ≥ 400)

```json
{
  "timestamp": "2026-08-01T14:30:00Z",
  "status": 422,
  "code": "INSPECTION_REQUIRED_ITEMS_MISSING",
  "message": "A inspeção possui itens obrigatórios sem resposta.",
  "path": "/api/v1/inspections/00000000-0000-0000-0000-000000000000/submit",
  "requestId": "req-123",
  "fieldErrors": [
    { "field": "responses", "message": "Existem 2 itens obrigatórios pendentes." }
  ]
}
```

`fieldErrors` é omitido quando o erro não é de validação de campo. Fonte: `api-rest.md` §12.2, formalizado em `openapi.yaml` → `#/components/schemas/Error`.

## 5.2 Códigos HTTP e comportamento esperado do frontend

| HTTP | Uso | Comportamento esperado no frontend |
|---|---|---|
| 200 | Consulta ou alteração concluída | Renderizar resultado |
| 201 | Recurso criado | Renderizar resultado, navegar para o recurso criado quando aplicável |
| 204 | Operação concluída sem corpo | Atualizar UI sem esperar payload |
| 400 | Requisição malformada | Exibir erro de formulário (usar `fieldErrors` quando presente) |
| 401 | Sessão ausente ou inválida | Tentar renovação via `/auth/refresh`; se falhar, redirecionar ao login preservando dados locais não sincronizados (mobile) |
| 403 | Autenticado sem permissão | Mensagem de acesso negado; **não** deve revelar dados do recurso |
| 404 | Recurso não encontrado ou não visível ao usuário | Estado "não encontrado", nunca detalhar se o recurso existe para outro usuário |
| 409 | Conflito de estado, versão otimista ou unicidade | Preservar dado local; oferecer nova tentativa; nunca sobrescrever silenciosamente |
| 413 | Arquivo acima do limite | Mensagem específica de tamanho; permitir nova captura (evidência) |
| 415 | Formato de arquivo não suportado | Mensagem específica de formato |
| 422 | Regra de negócio ou validação semântica violada | Exibir mensagem de negócio (`message`/`code`), destacar itens pendentes quando aplicável |
| 500 | Falha interna não prevista | Mensagem genérica; nunca expor `message` bruto de exceção ao usuário final |

Fonte: `api-rest.md` §12.3.

## 5.3 Exemplos por cenário

| Cenário | Status | `code` (exemplo) |
|---|---|---|
| Autenticação inválida | 401 | (mensagem genérica, sem `code` de negócio específico documentado — ver PEND-09) |
| Usuário sem permissão | 403 | — |
| Recurso inexistente | 404 | — |
| Payload inválido | 400 | `fieldErrors` preenchido |
| Conflito de estado (ex.: iniciar inspeção já cancelada) | 409 | — |
| Conflito de versão otimista | 409 | — |
| Regra de negócio violada (ex.: itens obrigatórios pendentes) | 422 | `INSPECTION_REQUIRED_ITEMS_MISSING` |
| Erro de sincronização (operação individual) | 200 com `status: REJECTED`/`CONFLICT`/`DEPENDENCY_FAILED` no item do lote | ver seção 11 |
| Erro de upload — arquivo grande | 413 | — |
| Erro de upload — formato não suportado | 415 | — |
| Erro interno | 500 | mensagem genérica |

**[PENDÊNCIA] (PEND-02/PEND-09):** além de `INSPECTION_REQUIRED_ITEMS_MISSING` (único `code` de exemplo concreto em toda a documentação de origem, `api-rest.md` §12.2), **nenhum outro `code` de erro de negócio está enumerado**. Isso significa que hoje não existe uma lista fechada de valores possíveis de `code` que o frontend possa usar para tratamento programático (ex.: exibir um ícone diferente por tipo de erro). Recomenda-se que, ao implementar cada regra `422`/`409` do catálogo de endpoints (seção 3), o backend defina e documente o `code` correspondente incrementalmente no `openapi.yaml`, e que o frontend trate por padrão qualquer `code` desconhecido exibindo `message`.

---

# 6. Autenticação e autorização

## 6.1 Fluxo de login

1. Usuário informa e-mail e senha → `POST /auth/login`.
2. API valida usuário `ACTIVE` (RN-001) e senha (hash seguro, nunca texto plano).
3. Resposta: `accessToken`, `refreshToken`, `expiresIn`, dados mínimos do usuário (`id`, `name`, `email`, `role`).
4. Mobile: token sensível em **Secure Store**. Admin web: interceptador de autenticação; evitar persistir token em local desnecessariamente exposto (`arquitetura.md` §11.10).

## 6.2 Renovação de token

`POST /auth/refresh` com o `refreshToken`. Conforme AC-AUTH ("token expirado"): a operação original que disparou o 401 deve poder ser repetida **uma única vez** após a renovação bem-sucedida — não deve entrar em loop de retentativa. **[PENDÊNCIA]** o corpo exato de `RefreshTokenRequest`/`RefreshTokenResponse` está formalizado em `openapi.yaml`, mas a **política de expiração** (tempo de vida do `refreshToken`, se é de uso único ou reutilizável, se há rotação) não é definida em nenhum documento de negócio — ver PEND-01.

## 6.3 Logout

`POST /auth/logout`: remove dados sensíveis da sessão no cliente; rotas protegidas deixam de ser acessíveis (AC-AUTH).

## 6.4 Formato do token

Bearer JWT (`bearerFormat: JWT` em `openapi.yaml`). Header: `Authorization: Bearer <accessToken>`.

## 6.5 Sessão offline do mobile

`casos-de-uso.md` UC-01 (fluxo alternativo): "permitir somente o acesso offline quando existir uma sessão previamente válida e dados locais autorizados." **[A DEFINIR]** o critério exato de "sessão previamente válida" para efeitos de acesso offline (ex.: access token expirado mas ainda dentro de uma janela de tolerância local?) não está especificado — ver PEND-10.

## 6.6 Matriz de permissão por endpoint

Legenda: ✅ permitido · ❌ não permitido · 🔎 leitura restrita ao próprio escopo (ver nota) · — não aplicável no MVP (perfil futuro, sem endpoint dedicado).

| Endpoint | ADMIN | SUPERVISOR | TECHNICIAN | CLIENT_VIEWER |
|---|:---:|:---:|:---:|:---:|
| `POST /auth/login`, `/auth/refresh`, `/auth/logout`, `GET /auth/me` | ✅ | ✅ | ✅ | — |
| `GET/POST/PUT /users`, `PATCH .../status`, `POST .../reset-password` | ✅ | ❌ | ❌ | — |
| `GET /clients*`, `/sites*` (leitura) | ✅ | ✅ | ❌ | — |
| `POST/PUT/PATCH /clients`, `/sites` (escrita) | ✅ | ❌ | ❌ | — |
| `GET /equipment*` (leitura, incl. `by-qr`) | ✅ | ✅ | ✅ (escopo QR — RN-063) | — |
| `POST/PUT/PATCH /equipment` (escrita) | ✅ | ✅ | ❌ | — |
| `GET/POST/PUT /inspection-templates*`, seções, itens, `publish` | ✅ | ✅ | ❌ | — |
| `GET /inspections` (listagem administrativa) | ✅ | ✅ | ❌ | — |
| `POST /inspections`, `PUT .../{id}`, `POST .../assign`, `POST .../cancel` | ✅ | ✅ | ❌ | — |
| `GET /inspections/{id}` (detalhe) | ✅ | ✅ | 🔎 própria (RN-004) | — |
| `POST /inspections/{id}/start` | ❌ | ❌ | ✅ própria, exclusivo (RN-033) | — |
| `POST /inspections/{id}/submit` | ❌ | ❌ | ✅ própria, exclusivo (RN-033) | — |
| `POST .../begin-review`, `/approve`, `/reject` | ❌ | ✅ (RN-079) | ❌ | — |
| `GET .../history`, `/reviews` | ✅ | ✅ | 🔎 própria | — |
| `GET/PUT /mobile/inspections*` | ❌ | ❌ | ✅ própria (escopo automático pelo token) | — |
| `GET /inspections/{id}/responses` | ✅ | ✅ | 🔎 própria | — |
| `PUT .../responses/{id}`, `POST .../responses:batch` | ❌ | ❌ | ✅ própria, estado `IN_PROGRESS` | — |
| `POST /inspections/{id}/evidence` (upload) | ❌ | ❌ | ✅ própria | — |
| `GET /inspections/{id}/evidence`, `GET /evidence/{id}` | ✅ | ✅ | 🔎 própria | — |
| `DELETE /evidence/{id}` | **[A DEFINIR]** — ver PEND-05 | **[A DEFINIR]** | ✅ própria (pré-envio, UC-11) | — |
| `GET /non-conformities*` | ✅ | ✅ | 🔎 própria | — |
| `POST /inspections/{id}/non-conformities` | ❌ | ❌ | ✅ própria | — |
| `PUT /non-conformities/{id}` | **[A DEFINIR]** — ver PEND-06 | **[A DEFINIR]** | ✅ própria (pré-envio, por simetria com respostas) | — |
| `PATCH /non-conformities/{id}/status` | — | — | — | — (sem uso funcional no MVP, INC-04) |
| `POST /mobile/sync/push`, `GET /mobile/sync/pull` | ❌ | ❌ | ✅ (escopo automático) | — |
| `GET /dashboard/*` | ✅ | ✅ | ❌ (ver PEND-07) | — |

**Nota sobre 🔎 "própria":** o técnico só pode consultar/alterar uma inspeção onde `technicianId` = seu próprio `id` (RN-004, RN-033). Tentativa de acesso a inspeção de outro técnico retorna `403` (AC-SECURITY) ou `404` conforme a política de não revelar existência do recurso (ver 5.2, linha 404) — **[DECISÃO NECESSÁRIA]**: os documentos de origem usam ora `403` ("Inspeção não pertence ao técnico autenticado", exemplo em `openapi.yaml` no endpoint `/mobile/inspections/{id}`) ora a diretriz geral "404 = recurso não encontrado **ou não visível ao usuário**" (`api-rest.md` §12.3). O MVP já decidiu usar `403` neste endpoint específico; os demais endpoints escopados por técnico devem seguir a mesma convenção por consistência, mas isso não está explicitado em regra própria — ver PEND-12.

## 6.7 Princípios de autorização (`perfis-de-usuario.md` §5.3)

- Menor privilégio por padrão.
- A interface **não** é mecanismo de segurança suficiente — toda permissão é validada pela API, mesmo que a UI já esconda o botão (AC-SECURITY, `interface-admnistrativa-web.md` §14.13).
- Técnico só altera inspeções atribuídas a ele e em estado compatível.
- Supervisor revisa inspeções do seu "escopo operacional" — **[DECISÃO NECESSÁRIA]**: nenhum documento define o que delimita esse escopo (todas as inspeções da organização? um subconjunto de clientes/locais associado ao supervisor?). O MVP, na ausência dessa definição, deve tratar **todo supervisor como tendo escopo total** (não há modelo de dados para "supervisor por cliente/região" em `modelo-de-dados.md`) — ver PEND-13.
- Administrador gerencia acesso e cadastros, mas **não** é automaticamente autorizado a alterar respostas de inspeção (RN-006) — coerente com a matriz acima, onde `ADMIN` não aparece nos endpoints de execução de campo.
- Registros aprovados são protegidos contra edição comum (RN-082).
- Operação não autorizada retorna erro padronizado, sem revelar dados sensíveis.

## 6.8 Estados do usuário

`ACTIVE`, `INACTIVE`, `BLOCKED` (`perfis-de-usuario.md` §5.4, `db/schema.sql`). Usuário `INACTIVE`/`BLOCKED` não inicia sessão (RN-001); inativação não apaga histórico (RN-002).

---

# 7. Modelos e estados

## 7.1 Entidades — campos e relacionamentos

O detalhamento campo a campo de todas as 17 entidades (15 tabelas PostgreSQL + `SyncOperation`/`SyncMetadata` locais) está em `modelo-de-dados.md` §10.5–§10.13 e formalizado em `db/schema.sql`. Resumo de cardinalidade:

```text
CLIENT 1──N INSPECTION_SITE 1──0..N EQUIPMENT
INSPECTION_TEMPLATE 1──N INSPECTION_TEMPLATE_VERSION 1──N TEMPLATE_SECTION 1──N TEMPLATE_ITEM
INSPECTION_TEMPLATE_VERSION 1──N INSPECTION
CLIENT 1──N INSPECTION ·  INSPECTION_SITE 1──N INSPECTION ·  EQUIPMENT 1──0..N INSPECTION ·  USER 1──N INSPECTION
INSPECTION 1──N INSPECTION_ITEM_SNAPSHOT 1──0..1 INSPECTION_RESPONSE 1──0..N EVIDENCE
INSPECTION 1──0..N NON_CONFORMITY ·  INSPECTION_RESPONSE 1──0..N NON_CONFORMITY ·  NON_CONFORMITY 1──0..N EVIDENCE
INSPECTION 1──0..N INSPECTION_REVIEW ·  INSPECTION 1──N AUDIT_EVENT
```

Tabela de referência rápida (nome da entidade → tabela → responsabilidade):

| Entidade | Tabela | Responsabilidade |
|---|---|---|
| `User` | `users` | Usuários, perfis, responsáveis pelas ações |
| `Client` | `clients` | Organização atendida |
| `InspectionSite` | `inspection_sites` | Local onde a inspeção ocorre |
| `Equipment` | `equipment` | Ativo físico inspecionado |
| `InspectionTemplate` | `inspection_templates` | Identidade lógica do checklist |
| `InspectionTemplateVersion` | `inspection_template_versions` | Publicação imutável do modelo |
| `TemplateSection` | `template_sections` | Agrupamento de itens da versão |
| `TemplateItem` | `template_items` | Pergunta/verificação/regra |
| `Inspection` | `inspections` | Execução agendada do checklist |
| `InspectionItemSnapshot` | `inspection_item_snapshots` | Itens preservados no momento da execução |
| `InspectionResponse` | `inspection_responses` | Resposta do técnico |
| `Evidence` | `evidence` | Metadados de fotografias/arquivos |
| `NonConformity` | `non_conformities` | Problemas encontrados |
| `InspectionReview` | `inspection_reviews` | Ciclos de revisão e decisões |
| `AuditEvent` | `audit_events` | Ações e mudanças relevantes |
| `SyncOperation` | *(somente SQLite local)* | Operação pendente da outbox |
| `SyncMetadata` | *(somente SQLite local)* | Estado geral da sincronização local |

## 7.2 Catálogo de enums (valor canônico = `openapi.yaml`)

| Enum | Valores |
|---|---|
| `UserRole` | `ADMIN, SUPERVISOR, TECHNICIAN, CLIENT_VIEWER` |
| `UserStatus` | `ACTIVE, INACTIVE, BLOCKED` |
| `ActiveStatus` (Client/Site) | `ACTIVE, INACTIVE` |
| `EquipmentStatus` | `ACTIVE, INACTIVE, DECOMMISSIONED` |
| `TemplateStatus` | `DRAFT, ACTIVE, INACTIVE` |
| `ResponseType` | `TEXT_SHORT, TEXT_LONG, NUMBER, BOOLEAN, CONFORMITY, SINGLE_CHOICE, DATE` |
| `InspectionPriority` | `LOW, MEDIUM, HIGH, CRITICAL` |
| `InspectionStatus` | `DRAFT, ASSIGNED, IN_PROGRESS, SUBMITTED, UNDER_REVIEW, APPROVED, REJECTED, CANCELED` |
| `Conformity` | `NOT_APPLICABLE, CONFORMING, NON_CONFORMING` |
| `Severity` (NonConformity) | `LOW, MEDIUM, HIGH, CRITICAL` |
| `NonConformityStatus` | `OPEN` (único valor ativo no MVP — RN-057) |
| `ReviewDecision` | `APPROVED, REJECTED` |
| `EvidenceType` | `PHOTO` (único tipo no MVP) |
| `SyncEntityType` | `INSPECTION, INSPECTION_RESPONSE, EVIDENCE, NON_CONFORMITY` |
| `SyncOperationType` | `UPSERT, DELETE` |
| `SyncOperationStatus` | `APPLIED, ALREADY_APPLIED, REJECTED, CONFLICT, DEPENDENCY_FAILED` |

## 7.3 Estado de negócio × estado de sincronização — dois eixos independentes

Esta é a distinção conceitual mais importante do modelo (`fluxo-geral.md` §7.4, `modelo-de-dados.md` §10.2): o estado de **negócio** da inspeção (coluna acima, autoritativo no servidor) é independente do estado **local de sincronização** do dispositivo. Uma inspeção pode estar `IN_PROGRESS` no servidor e, no mesmo instante, o dispositivo do técnico ter alterações locais ainda não enviadas.

| Estado local (mobile, não trafega para o servidor) | Significado |
|---|---|
| `SINCRONIZADO` | Sem alterações locais pendentes |
| `PENDENTE` | Existem operações aguardando envio |
| `SINCRONIZANDO` | Fila em processamento |
| `ERRO` | Uma ou mais operações falharam |
| `CONFLITO` | Divergência exige política específica ou intervenção |

## 7.4 Máquina de estados da `Inspection`

```text
DRAFT ──(assign)──► ASSIGNED ──(start, só TECHNICIAN)──► IN_PROGRESS ──(submit, só TECHNICIAN)──► SUBMITTED
                        │                                     │
                        │(cancel, ADMIN/SUPERVISOR)            │(cancel administrativo)
                        ▼                                     ▼
                    CANCELED ◄─────────────────────────── CANCELED

SUBMITTED ──(begin-review, só SUPERVISOR)──► UNDER_REVIEW ──(approve)──► APPROVED
                                                    │
                                                    └──(reject, motivo obrigatório)──► REJECTED ──(reabrir para correção)──► IN_PROGRESS
                                                                                            │
                                                                                            └──(cancel)──► CANCELED
```

| Estado atual | Ação | Próximo estado | Quem executa | Pré-condição |
|---|---|---|---|---|
| `DRAFT` | Atribuir técnico | `ASSIGNED` | ADMIN/SUPERVISOR | Técnico `ACTIVE` (RN-027) |
| `ASSIGNED` | Iniciar | `IN_PROGRESS` | TECHNICIAN responsável | RN-032, RN-033 |
| `ASSIGNED` | Cancelar | `CANCELED` | ADMIN/SUPERVISOR | Justificativa obrigatória (RN-029) |
| `IN_PROGRESS` | Concluir e enviar | `SUBMITTED` | TECHNICIAN responsável | Itens obrigatórios respondidos (RN-037/038/039) |
| `IN_PROGRESS` | Cancelar administrativamente | `CANCELED` | ADMIN/SUPERVISOR | Justificativa obrigatória |
| `SUBMITTED` | Iniciar revisão | `UNDER_REVIEW` | SUPERVISOR | RN-079 |
| `UNDER_REVIEW` | Aprovar | `APPROVED` | SUPERVISOR | — |
| `UNDER_REVIEW` | Reprovar | `REJECTED` | SUPERVISOR | Motivo obrigatório (RN-080) |
| `REJECTED` | Reabrir para correção | `IN_PROGRESS` | *(gatilho: sincronização do técnico, `fluxo-geral.md` §7.8)* | — |
| `REJECTED` | Cancelar | `CANCELED` | ADMIN/SUPERVISOR | — |
| `APPROVED` | *(nenhuma transição comum — RN-030, RN-082)* | — | — | Bloqueada contra edição/cancelamento comuns |

**Efeitos de cada transição:**
- `assign`: define `technicianId`; se `status = DRAFT`, avança para `ASSIGNED`. Também serve para **reatribuição** (troca de técnico) em uma inspeção já `ASSIGNED` (`openapi.yaml`, decisão de normalização #4) — **[A DEFINIR]** se reatribuição é permitida em estados além de `DRAFT`/`ASSIGNED` (ex.: pode-se reatribuir uma inspeção `IN_PROGRESS`? Não há regra que proíba nem que permita explicitamente) — ver PEND-14.
- `start`: grava `startedAtDevice` (do payload) e `startedAtServer` (do servidor); localização opcional conforme RN-061.
- `submit`: grava `completedAtDevice` e `submittedAtServer`; bloqueia respostas para edição comum (RN-043).
- `approve`: grava `approvedAt`, revisor e comentário opcional; bloqueia toda a inspeção contra edição comum (RN-082).
- `reject`: cria um novo registro em `InspectionReview` com `decision=REJECTED`, `reason` obrigatório, `reviewCycle` incrementado; preserva o histórico de ciclos anteriores (RN-083, `modelo-de-dados.md` §10.11.1).
- `cancel`: grava `canceledAt`, `canceledBy`, `canceledReason` (obrigatório, RN-029); bloqueada se `status = APPROVED` (RN-030, `409`).

## 7.5 Máquina de estados do `InspectionTemplate`/`InspectionTemplateVersion`

```text
InspectionTemplate.status:  DRAFT ──► ACTIVE ──► INACTIVE
                                        (após 1ª publicação de versão)

InspectionTemplateVersion:  criada imutável no ato de POST .../publish
                             nunca transiciona — nova alteração = nova versão (RN-020)
```

- `TemplateStatus` do `InspectionTemplate` (identidade lógica) é independente do `InspectionTemplateVersion.activeForNewInspections` (se a versão pode ser usada em novos agendamentos).
- RN-018: `DRAFT` (do modelo lógico) permite alteração livre de seções/itens.
- RN-019: uma vez publicada, a versão nunca é alterada de forma destrutiva.
- RN-022: desativar o `InspectionTemplate` **não** afeta inspeções que já usam uma versão publicada.

## 7.6 Máquina de estados da `NonConformity`

`status`: único valor `OPEN` no MVP (RN-057). O ciclo de tratamento completo (`IN_PROGRESS`, `RESOLVED` etc.) é P2 — fora do escopo deste contrato.

## 7.7 `Evidence` — sem máquina de estados própria

`Evidence` não tem campo `status` no schema central — seu "estado" observável pelo frontend é derivado: presente e com `uploadedAt` preenchido = sincronizada; ausente do servidor mas presente localmente = pendente de upload (estado que só existe no SQLite local, não no `Evidence` do PostgreSQL). Ver seção 11.

## 7.8 Confronto com `db/schema.sql`

As `CHECK` constraints em `db/schema.sql` (grep confirmado) usam exatamente os mesmos valores do `openapi.yaml` para `role`, `status` (User/Client/Site), `EquipmentStatus`, `TemplateStatus`, `InspectionStatus` (a constraint em `inspections.status` reproduz a lista de 8 valores em inglês), `Conformity`, `EvidenceType`, `Severity`, `NonConformityStatus` (restrito a `OPEN`) e `ReviewDecision`. **Nenhuma divergência encontrada** entre banco, contrato OpenAPI e este documento.

---

# 8. Fluxos completos do sistema

Cada fluxo é descrito como: ação do usuário → ação do frontend → endpoint → payload → resposta → mudança de estado → próxima ação possível.

## 8.1 Autenticação (mobile ou web)

| Passo | Ator | Ação | Endpoint | Resultado |
|---|---|---|---|---|
| 1 | Usuário | Informa e-mail/senha | — | — |
| 2 | Frontend | Valida formato dos campos | — | — |
| 3 | Frontend | Envia credenciais | `POST /auth/login` | — |
| 4 | Backend | Valida usuário `ACTIVE` e senha | — | `200` com tokens, ou `401` |
| 5 | Frontend | Armazena sessão (Secure Store no mobile / storage controlado na web) | — | — |
| 6 | Frontend | Redireciona à área autorizada conforme `role` | — | — |

Fonte: UC-01, AC-AUTH.

## 8.2 Configuração administrativa (cadastro em cadeia)

1. ADMIN cria cliente → `POST /clients`.
2. ADMIN cria local vinculado → `POST /sites` (`clientId` obrigatório, validado contra RN-009).
3. ADMIN **ou** SUPERVISOR cria equipamento vinculado → `POST /equipment` (`siteId` obrigatório, `qrCode` único — RN-010, RN-011).
4. Interface administrativa usa os combos encadeados `GET /clients/{clientId}/sites` e `GET /sites/{siteId}/equipment` para popular seletores dependentes (`interface-admnistrativa-web.md` §14.9, AC-MASTER).

## 8.3 Criação e publicação de modelo de inspeção (UC-04, UC-05)

1. SUPERVISOR/ADMIN cria modelo → `POST /inspection-templates` → `201`, `status: DRAFT`.
2. Cria seções → `POST /inspection-templates/{id}/sections` (repetido por seção).
3. Cria itens em cada seção → `POST /inspection-templates/{id}/sections/{sectionId}/items` (repetido por item, com `responseType`, `required`, `observationRequiredOnFailure`, `evidenceRequiredOnFailure`, `displayOrder`).
4. Frontend monta prévia do checklist localmente a partir das respostas já recebidas (não há endpoint de "prévia" dedicado — a prévia é responsabilidade do frontend, montada com os dados já obtidos).
5. Publica → `POST /inspection-templates/{id}/publish` → bloqueado (`422`) se faltar título/categoria/seção/item válido (RN-015/016); sucesso cria `InspectionTemplateVersion` numerada e imutável.
6. Próxima ação possível: usar a versão publicada em `POST /inspections` (seção 8.4).

## 8.4 Agendamento e atribuição (UC-06)

1. SUPERVISOR seleciona modelo publicado → `GET /inspection-templates?status=ACTIVE` + `GET /inspection-templates/{id}/versions`.
2. Seleciona cliente → local (filtrado) → equipamento (filtrado, quando aplicável) via os combos encadeados da seção 8.2.
3. Define técnico ativo, prioridade, data prevista, instruções.
4. Confirma → `POST /inspections` → `201`, `InspectionDetail` com `items` (snapshot) já preenchido, `status: DRAFT` (ou `ASSIGNED` se `technicianId` já valida a atribuição — RN-025 exige técnico já na criação, portanto a inspeção nasce com técnico definido; a transição formal `DRAFT→ASSIGNED` ocorre no mesmo ato de criação, uma vez que RN-031 exige exatamente um técnico responsável desde o início).
5. Inspeção fica disponível para o técnico assim que ele sincronizar (`GET /mobile/inspections`).

## 8.5 Distribuição — download inicial pelo técnico (UC-07)

1. App consulta alterações → `GET /mobile/inspections` (lista) e, ao abrir uma inspeção específica, `GET /mobile/inspections/{inspectionId}` (detalhe completo, incl. snapshot).
2. App grava em SQLite **em transação**.
3. App atualiza `last_successful_sync` em `SyncMetadata`.
4. Inspeção fica disponível offline. Falha parcial: app mantém dados anteriores e registra o erro (não apaga silenciosamente — UC-07, fluxo alternativo).

## 8.6 Execução online completa (UC-08 a UC-12)

1. Técnico abre a inspeção, opcionalmente lê o QR Code → `GET /equipment/by-qr/{qrCode}` (RN-063, RN-064: divergência com equipamento previsto deve ser informada antes de continuar).
2. Técnico confirma início → `POST /inspections/{inspectionId}/start` (payload opcional com `location`) → `200`, `status: IN_PROGRESS`.
3. Para cada item do checklist: técnico responde → `PUT /inspections/{inspectionId}/responses/{responseId}` (imediato, online) — `id` gerado no cliente, `baseVersion` inicial `0`.
4. Item não conforme com regra de observação: frontend exige preencher `observation` antes de permitir avançar (RN-038, validado também no servidor com `422`).
5. Item crítico não conforme: técnico registra evidência → `POST /inspections/{inspectionId}/evidence` (multipart) e/ou não conformidade → `POST /inspections/{inspectionId}/non-conformities`.
6. Técnico conclui → `POST /inspections/{inspectionId}/submit` (payload `completedAtDevice` + `location` opcional) → `200`, `status: SUBMITTED`, respostas bloqueadas para edição comum.

## 8.7 Operação offline completa e sincronização (UC-13, UC-14 — o fluxo mais crítico do produto)

Ver detalhamento completo na seção 11. Resumo do ponto de vista de tela-por-tela:

1. Sem conectividade, os passos 2–6 do fluxo 8.6 ocorrem normalmente, mas cada escrita grava **apenas no SQLite local** e enfileira uma operação em `SyncOperation` (outbox) em vez de chamar a API.
2. Conclusão offline: `POST /inspections/{inspectionId}/submit` correspondente é enfileirado como uma operação `UPSERT`/`entityType: INSPECTION` na outbox; UI mostra "Aguardando sincronização" (não "Concluída").
3. Conectividade retorna: app ordena operações pendentes por dependência (ex.: criar resposta antes de enviar foto vinculada a ela) e envia lote → `POST /mobile/sync/push`.
4. App aplica os resultados individuais retornados, remove operações confirmadas da outbox, mantém falhas como pendentes.
5. App baixa alterações do servidor → `GET /mobile/sync/pull?cursor=...` e persiste; cursor local só avança após gravação bem-sucedida.

## 8.8 Revisão → Aprovação (UC-16, UC-17)

1. SUPERVISOR abre lista de inspeções aguardando revisão → `GET /inspections?status=SUBMITTED`.
2. Abre uma inspeção → `GET /inspections/{inspectionId}` (detalhe com itens, respostas, evidências, NCs).
3. Inicia revisão formal → `POST /inspections/{inspectionId}/begin-review` → `200`, `status: UNDER_REVIEW`, ação auditada (RN-079).
4. Analisa seção a seção; consulta `GET /inspections/{inspectionId}/reviews` para ciclos anteriores, se houver.
5. Aprova → `POST /inspections/{inspectionId}/approve` (payload `comments` opcional) → `200`, `status: APPROVED`, respostas e evidências passam a somente leitura (RN-049, RN-082).

## 8.9 Revisão → Reprovação → Correção (UC-17, fluxo de correção `fluxo-geral.md` §7.8)

1. SUPERVISOR reprova → `POST /inspections/{inspectionId}/reject` (payload `reason` **obrigatório** + `itemsToCorrect[]` opcional) → `400` se `reason` ausente; sucesso: `200`, `status: REJECTED`, novo `InspectionReview` com `decision: REJECTED`.
2. Na próxima sincronização do técnico, `GET /mobile/sync/pull` traz a mudança de estado e o motivo.
3. App exibe a inspeção como "Requer correção", destacando `itemsToCorrect` quando presentes.
4. Técnico altera somente o que está liberado (o servidor volta implicitamente a aceitar escrita em `PUT .../responses/{id}` porque o estado retorna a `IN_PROGRESS` — ver 7.4) e reenvia → `POST /inspections/{inspectionId}/submit` novamente.
5. SUPERVISOR realiza nova revisão — o histórico do ciclo anterior é preservado (RN-083, `reviewCycle` incrementado).

## 8.10 Auditoria (consulta)

1. ADMIN/SUPERVISOR abre o histórico de uma inspeção → `GET /inspections/{inspectionId}/history` (paginado).
2. Frontend renderiza a linha do tempo de `AuditEvent` (ex.: `INSPECTION_CREATED → INSPECTION_ASSIGNED → INSPECTION_STARTED → RESPONSE_CREATED → ... → INSPECTION_APPROVED`, exemplo completo em `modelo-de-dados.md` §10.12.1).
3. **Não existe** endpoint de auditoria fora do escopo de uma inspeção — ver INC-05/PEND-08 para a lacuna da rota `/audit` do admin.

---

# 9. Paginação, filtros e ordenação

## 9.1 Parâmetros padrão (todo endpoint de listagem)

```text
?page=0            (inteiro, mínimo 0, padrão 0)
&size=20           (inteiro, mínimo 1, máximo 100, padrão 20)
&sort=createdAt,desc   (campo,direção — direção "asc" ou "desc")
```

Fonte: `openapi.yaml` → `components/parameters/{PageParam,SizeParam,SortParam}`, RNF-003.

## 9.2 Envelope de resposta paginada

```json
{
  "page": 0,
  "size": 20,
  "totalElements": 137,
  "totalPages": 7,
  "content": [ /* array de itens */ ]
}
```

Usado por: `UserPage`, `ClientPage`, `SitePage`, `EquipmentPage`, `InspectionTemplatePage`, `InspectionTemplateVersionPage`, `InspectionPage`, `NonConformityPage`, `AuditEventPage`. Note que `GET /inspections/{id}/responses`, `GET /inspections/{id}/evidence` e `GET /inspections/{id}/reviews` retornam **arrays simples**, não páginas — o volume por inspeção é limitado pelo tamanho do checklist, não justifica paginação.

## 9.3 Filtros por recurso

| Recurso | Filtros disponíveis |
|---|---|
| `/users` | `name`, `email`, `role`, `status` |
| `/inspection-templates` | `category`, `status` |
| `/inspections` (admin) | `status`, `technicianId`, `supervisorId`, `clientId`, `siteId`, `equipmentId`, `priority`, `scheduledFrom`, `scheduledTo`, `overdue` (booleano) |
| `/mobile/inspections` | `status`, `priority`, `scheduledFrom`, `scheduledTo` (sempre escopado ao técnico autenticado) |
| `/inspections/{id}/evidence` | `responseId`, `nonConformityId` |
| `/non-conformities` | `severity` |

**[A DEFINIR]** busca textual livre (mencionada como funcionalidade P0 do mobile em `funcionalidades.md` §8.2 — "pesquisa local" — e como filtro "texto" em `interface-admnistrativa-web.md` §14.10) não tem parâmetro de query dedicado em nenhum endpoint do `openapi.yaml` atual. Para a interface administrativa, o filtro textual da listagem de inspeções não está mapeado a um parâmetro (`q`? `search`?) — ver PEND-15. Para o mobile, a pesquisa local pode ser inteiramente client-side sobre os dados já baixados, o que não exigiria endpoint — mas isso não está afirmado explicitamente em nenhum documento.

---

# 10. Upload e arquivos

## 10.1 Endpoint de upload

`POST /inspections/{inspectionId}/evidence` — `multipart/form-data`.

## 10.2 Campos do formulário (`EvidenceUploadRequest`)

| Campo | Obrigatório | Tipo | Descrição |
|---|:---:|---|---|
| `idempotencyKey` | ✅ | UUID | Evita duplicidade em reenvio (RN-067/068) |
| `type` | ✅ | enum `EvidenceType` | `PHOTO` no MVP |
| `capturedAtDevice` | ✅ | date-time | Horário da captura no dispositivo |
| `file` | ✅ | binary | Arquivo de imagem |
| `responseId` | opcional | UUID | Vínculo com uma resposta específica |
| `nonConformityId` | opcional | UUID | Vínculo com uma não conformidade |
| `description` | opcional | string | Texto livre |
| `latitude` / `longitude` | opcional | decimal | Coordenadas de captura |

Uma evidência sempre pertence a uma inspeção (`inspectionId`, via path); o vínculo com resposta ou não conformidade é opcional (`modelo-de-dados.md` §10.9.1).

## 10.3 Tipos de arquivo aceitos e tamanho máximo

`openapi.yaml` indica `encoding.file.contentType: image/jpeg, image/png` — fotografia é o único tipo de evidência do MVP (RN-046: "somente formatos e tamanhos permitidos", sem valor numérico). **[PENDÊNCIA] (PEND-16):** **nenhum documento de origem define um valor concreto de tamanho máximo em MB nem uma lista fechada de MIME types além da inferência acima.** Isso é necessário antes da implementação, porque o status `413` (Payload Too Large) e a mensagem de erro correspondente do mobile dependem desse número.

## 10.4 Quantidade máxima de evidências por item/inspeção

Não especificada em nenhum documento — `funcionalidades.md` §8.3 lista "múltiplas evidências por item com descrição" como **P1**, o que sugere que no MVP o vínculo é predominantemente 1 evidência relevante por resposta, mas não proíbe múltiplas. **[A DEFINIR]** — ver PEND-17.

## 10.5 Associação com a entidade

`inspectionId` (obrigatório, via path) + `responseId` **ou** `nonConformityId` (opcionais, mutuamente não exclusivos no schema, mas semanticamente uma evidência normalmente se relaciona a no máximo um dos dois).

## 10.6 Resposta do upload

```json
// 201 Created
{
  "id": "ev-001",
  "inspectionId": "insp-045",
  "responseId": "62327a9a-...",
  "type": "PHOTO",
  "storageKey": "evidence/2026/08/insp-045/ev-001.jpg",
  "accessUrl": "https://.../evidence/ev-001?token=...",
  "mimeType": "image/jpeg",
  "sizeBytes": 842311,
  "capturedAtDevice": "2026-08-01T10:15:00-03:00",
  "serverReceivedAt": "2026-08-01T14:16:02Z",
  "uploadedAt": "2026-08-01T14:16:05Z",
  "createdBy": "8a50e30d-...",
  "createdAt": "2026-08-01T14:16:05Z"
}
```

## 10.7 Identificação, download e exclusão

- **Identificação:** `id` (UUID gerado no dispositivo, RN-050 — nome original do arquivo **nunca** é usado como identificador).
- **Download/visualização:** `accessUrl` — URL temporária de acesso, nunca exposição pública permanente (`arquitetura.md` §11.8). **[A DEFINIR]** tempo de expiração da URL temporária não especificado.
- **Exclusão:** `DELETE /evidence/{id}` — bloqueada para evidências de inspeção `APPROVED` (RN-049, somente leitura); exclusão é sempre auditada (RN-048). Ver PEND-05 quanto a qual perfil pode excluir.

## 10.8 Permissões

Upload: `TECHNICIAN` (própria inspeção). Leitura de metadados: `ADMIN`, `SUPERVISOR`, `TECHNICIAN` (própria). Exclusão: ver PEND-05.

## 10.9 Tratamento de falhas

- Arquivo acima do limite → `413`, app permite nova captura (UC-11, AC-EVIDENCE).
- Formato não suportado → `415`.
- Falha de rede durante upload → arquivo permanece no dispositivo, marcado como pendente, dados textuais da inspeção não são revertidos (AC-EVIDENCE, "falha de upload").
- Reenvio com o mesmo `idempotencyKey` → `409` "já processada", tratado pelo app como sucesso equivalente, sem duplicar (RN-068).

## 10.10 Comportamento durante operação offline

Arquivo capturado é mantido no dispositivo (URI local, campo `local_uri` — existe **somente** na entidade local, não no `Evidence` do servidor, `modelo-de-dados.md` §10.9.1); metadados salvos no SQLite; operação de upload entra na outbox (`entityType: EVIDENCE`); evidência aparece na UI como pendente. O arquivo só pode ser removido do dispositivo após confirmação segura do servidor (`uploadedAt` preenchido) ou exclusão explícita permitida pelo usuário antes do envio (RN-047: uma evidência não sincronizada não pode ser apagada silenciosamente por limpeza de cache).

---

# 11. Offline e sincronização

## 11.1 Dados que precisam estar disponíveis offline

Para o técnico autenticado (`arquitetura.md` §11.9, `modelo-de-dados.md` §10.13.1): perfil mínimo do usuário; inspeções atribuídas a ele; cliente e local relacionados; equipamento relacionado; snapshot dos itens do checklist; respostas já existentes; revisões e solicitações de correção pertinentes. **Não é uma cópia completa do PostgreSQL** — apenas o subconjunto autorizado e necessário.

## 11.2 Como o frontend deve armazenar

SQLite local. Cada entidade sincronizável pode ter metadados locais adicionais que **não existem** no PostgreSQL:

| Campo local | Finalidade |
|---|---|
| `local_sync_status` | sincronizado / pendente / erro / conflito |
| `is_dirty` | há alterações locais não enviadas |
| `last_synced_at` | data da última confirmação |
| `base_version` | versão do servidor usada como base (para detectar conflito) |
| `local_updated_at` | última alteração no dispositivo |
| `sync_error` | último erro sanitizado |
| `deleted_locally` | exclusão lógica ainda não confirmada |

## 11.3 Operações que podem ser realizadas offline

Iniciar inspeção, responder itens do checklist, registrar observação, capturar evidência, registrar não conformidade, concluir/enviar inspeção. Todas gravam **primeiro** no SQLite — a UI nunca espera resposta de rede para considerar o dado salvo localmente (`arquitetura.md` §11.9 "Escrita local").

## 11.4 Estrutura da fila local (`SyncOperation` — outbox)

| Campo | Tipo | Descrição |
|---|---|---|
| `operationId` | UUID | Chave idempotente (RN-067) |
| `entityType` | enum `SyncEntityType` | `INSPECTION \| INSPECTION_RESPONSE \| EVIDENCE \| NON_CONFORMITY` |
| `entityId` | UUID | Registro afetado |
| `operationType` | enum | `UPSERT \| DELETE` (localmente também modelado como `CREATE/UPDATE/DELETE_LOGICAL/TRANSITION/UPLOAD` em `modelo-de-dados.md` §10.13.3 — o contrato de rede simplifica para `UPSERT/DELETE`) |
| `baseVersion` | integer, nullable | Versão usada como base para detecção de conflito |
| `payloadJson` | JSON | Corpo específico da entidade (mesmo formato do DTO de escrita correspondente) |
| `dependencyIds` | JSON (array) | Operações que devem ser concluídas antes |
| `status` | enum local | `PENDING, PROCESSING, FAILED, CONFLICT, COMPLETED` |
| `attemptCount` | integer | Tentativas realizadas |
| `lastError` | string | Mensagem sanitizada |

## 11.5 Identificação das operações e idempotência

`operationId` é gerado no dispositivo (UUID) e é a chave de idempotência (RN-067). Reenvio do mesmo `operationId` **nunca** cria duplicidade (RN-068) — a API responde `ALREADY_APPLIED` em vez de reprocessar.

## 11.6 Estratégia de sincronização (dois endpoints — decisão de contrato)

- **Envio:** `POST /mobile/sync/push` — outbox completa ou em lotes, ordenada por dependência (RN-069). Falha em uma operação não descarta as demais (RN-070).
- **Leitura incremental:** `GET /mobile/sync/pull?cursor=...` — cursor omitido na primeira sincronização.

### `POST /mobile/sync/push` — exemplo completo

```json
// Request (SyncPushRequest)
{
  "deviceId": "b38f54fd-6d7c-4249-b80f-5d0362103f82",
  "lastPullCursor": "cursor-anterior",
  "operations": [
    {
      "operationId": "5f30d6de-a4e0-4da8-b1c1-2acbd6f2850e",
      "entityType": "INSPECTION_RESPONSE",
      "entityId": "62327a9a-ec19-46a2-89ae-b49086b657f9",
      "operationType": "UPSERT",
      "baseVersion": 0,
      "payload": {
        "inspectionItemId": "ab18a638-1c45-4a15-a444-b4235506e912",
        "conformity": "NON_CONFORMING",
        "observation": "Proteção lateral apresenta trinca.",
        "answeredAtDevice": "2026-08-01T10:12:30-03:00"
      }
    }
  ]
}

// 200 OK (SyncPushResponse)
{
  "results": [
    { "operationId": "5f30d6de-a4e0-4da8-b1c1-2acbd6f2850e", "status": "APPLIED", "entityVersion": 1 }
  ],
  "nextCursor": "novo-cursor",
  "serverTime": "2026-08-01T14:15:00Z"
}
```

### `GET /mobile/sync/pull` — exemplo

```json
// 200 OK (SyncPullResponse)
{
  "changes": [
    {
      "entityType": "INSPECTION",
      "entityId": "insp-045",
      "operationType": "UPSERT",
      "payload": { "status": "REJECTED" },
      "version": 4,
      "occurredAt": "2026-08-01T16:00:00Z"
    }
  ],
  "nextCursor": "cursor-2026-08-01T16:00:00Z",
  "serverTime": "2026-08-01T16:05:00Z"
}
```

## 11.7 Estados de resultado por operação

`APPLIED` (nova alteração aceita) · `ALREADY_APPLIED` (reenvio idempotente reconhecido) · `REJECTED` (regra de negócio impediu — corpo `error` preenchido) · `CONFLICT` (versão-base divergente) · `DEPENDENCY_FAILED` (uma operação da qual esta dependia falhou).

## 11.8 Sucesso parcial

Um lote com N operações pode ter resultados distintos por item — operações confirmadas **permanecem confirmadas** mesmo que outras do mesmo lote falhem (RN-070, AC-SYNC "falha parcial"). O app remove da outbox apenas as operações com `APPLIED`/`ALREADY_APPLIED`; mantém as demais pendentes com o erro registrado.

## 11.9 Conflitos (RN-075, RN-076, `arquitetura.md` §11.9)

- Detectados por `baseVersion` divergente da versão atual do servidor.
- Política do MVP: **dados aprovados no servidor prevalecem** e não aceitam atualização tardia comum — uma inspeção `APPROVED` rejeita qualquer `UPSERT` de resposta com `409`/`CONFLICT`.
- O app **nunca** descarta silenciosamente o valor local em conflito — apresenta estado de conflito ao usuário.
- Casos complexos (edição simultânea de um mesmo item por dois dispositivos, por exemplo) podem exigir nova inspeção ou ação administrativa — **não há resolução automática/assistida no MVP** (isso é P2, `funcionalidades.md` §8.4 "resolução assistida de conflitos").

## 11.10 Duplicidade

Impedida pelo par `operationId` (dados estruturados) / `idempotencyKey` (evidências) — reenvio idêntico nunca cria dois registros (RN-068).

## 11.11 Retry

Falhas permanecem na outbox com `attemptCount` incrementado e `lastError` sanitizado; a UI oferece "tentar novamente" (`aplicativo-mobile.md` §13.4, tela de Sincronização). **[A DEFINIR]** não há política de backoff/número máximo de tentativas automáticas definida em nenhum documento — presume-se retry manual disparado pelo usuário como comportamento mínimo do MVP.

## 11.12 Tratamento de evidências na sincronização

Arquivos são sincronizados **separadamente** dos dados estruturados (RN-078) — dados textuais de uma resposta podem ser confirmados mesmo que a foto vinculada ainda esteja pendente de upload (AC-SYNC "falha de arquivo"). O estado de cada evidência é rastreado individualmente, não em bloco com o restante do lote.

## 11.13 Comportamento quando a sincronização falha

- Falha total de rede: outbox permanece intacta; nenhuma alteração local é perdida; `SyncMetadata.last_sync_result = FAILED`.
- Token expirado durante sync: renovar via `/auth/refresh` e repetir de forma controlada (UC-14, fluxo alternativo) — não deve duplicar operações já aplicadas (idempotência cobre esse caso).
- Inspeção cancelada no servidor enquanto o técnico estava offline: na próxima sincronização, o sistema preserva as alterações locais pendentes e **informa o cancelamento antes de descartar qualquer dado** (RN-077) — **[A DEFINIR]** o comportamento exato da UI nesse cruzamento (cancelamento vs. dados locais pendentes de uma inspeção que não existe mais no estado ativo) não tem um roteiro de tela definido — ver PEND-18.

---

# 12. Auditoria e rastreabilidade

## 12.1 Eventos auditados (catálogo, `modelo-de-dados.md` §10.12.1)

```text
INSPECTION_CREATED · INSPECTION_ASSIGNED · INSPECTION_STARTED
RESPONSE_CREATED · RESPONSE_UPDATED
EVIDENCE_ADDED · EVIDENCE_REMOVED
NON_CONFORMITY_CREATED
INSPECTION_COMPLETED · INSPECTION_SUBMITTED
REVIEW_STARTED · INSPECTION_APPROVED · INSPECTION_REJECTED · INSPECTION_CANCELED
```

Esta lista **não é declarada fechada** em nenhum documento ("exemplos de eventos") — é a base mínima esperada; novas ações críticas podem gerar novos valores de `action` conforme a implementação avançar.

## 12.2 Estrutura de um evento (`AuditEvent`)

| Campo | Descrição |
|---|---|
| `id` | Identificador do evento |
| `inspectionId` | Inspeção relacionada, quando aplicável |
| `actorId` | Usuário responsável, quando conhecido (pode ser nulo em eventos de sistema) |
| `action` | String livre do catálogo acima |
| `entityType` / `entityId` | Entidade afetada |
| `occurredAt` | Data do servidor |
| `deviceOccurredAt` | Data do dispositivo, quando aplicável |
| `previousValueJson` / `newValueJson` | Estado anterior/novo, **não sensível** |
| `metadataJson` | Metadados adicionais |
| `requestId` | Correlação técnica |
| `deviceId` | Dispositivo, quando aplicável |

Registros de auditoria **não podem ser alterados ou excluídos** por usuários comuns (`modelo-de-dados.md` §10.12.1).

## 12.3 O que é exposto ao frontend

Apenas via `GET /inspections/{inspectionId}/history` (paginado) — escopado a uma inspeção. **Não existe** endpoint de auditoria irrestrita/global, apesar de `interface-admnistrativa-web.md` §14.3 prever a rota `/audit` no mapa de navegação do admin (ver INC-05/PEND-08).

## 12.4 Regras de auditoria aplicadas nos endpoints (referência cruzada)

RN-086 (alterações críticas registram usuário/data/ação/entidade): aplicada em `assign`, `cancel`, `begin-review`, `approve`, `reject`, `PATCH /users/{id}/status`, `DELETE /evidence/{id}`. RN-087 (datas de criação/atualização mantidas pelo servidor): todo campo `createdAt`/`updatedAt` em todo DTO. RN-088 (entidades históricas não excluídas fisicamente pelo fluxo comum): reforça a ausência de `DELETE` físico em `Client`, `Site`, `Equipment`, `User`, `InspectionTemplateVersion`, `Inspection` — todos usam `PATCH .../status` ou transições de estado, nunca `DELETE`. RN-089 (API rejeita transições de estado inválidas): todo `409` da seção 3.6.

---

# 13. OpenAPI / Swagger

## 13.1 Onde está o contrato executável

`openapi.yaml` (raiz do repositório, OpenAPI 3.0.3). Contém: 14 tags (uma por domínio, seção 3.1), 49 paths, ~140 schemas (enums + DTOs de request/response + páginas), `securitySchemes.bearerAuth` (`http`/`bearer`/`JWT`), responses reutilizáveis (`BadRequest, Unauthorized, Forbidden, NotFound, Conflict, UnprocessableEntity, PayloadTooLarge, UnsupportedMediaType`), parâmetros reutilizáveis (`IdParam, InspectionIdParam, PageParam, SizeParam, SortParam`).

## 13.2 Como este documento se conecta a ele

Toda seção de endpoint (3), DTO (4) e erro (5) deste documento tem correspondência 1:1 com um `operationId` ou `#/components/schemas/*` em `openapi.yaml`. Ao gerar client SDKs, mocks ou validação de contrato (`swagger-request-validator`, citado em `test-plan.md` §3.1), use `openapi.yaml` como entrada — este documento não deve ser parseado por ferramentas, é a camada de leitura humana.

## 13.3 Validação

Conforme `PROMPT-MESTRE-DOCUMENTACAO.md` (processo que originou `openapi.yaml`), o arquivo deveria ser validado com um linter real (`npx @redocly/cli lint openapi.yaml`) antes de ser considerado pronto. **[PENDÊNCIA] (PEND-19):** esta sessão de trabalho não executa comandos de build/lint contra o `openapi.yaml` — não foi solicitada nenhuma alteração a ele, apenas leitura para elaborar este documento complementar. Recomenda-se rodar essa validação antes do início da implementação do backend, caso ainda não tenha sido feita.

---

# 14 e 15. Contrato Backend ↔ Frontend — Mapeamento por tela/funcionalidade

Esta seção funciona como **o ponto de entrada único** para quem vai implementar uma tela: o que ela precisa carregar, quais ações o usuário pode disparar, qual endpoint cada ação chama, e quais estados de interface tratar. Estados obrigatórios de toda tela de dados (`interface-admnistrativa-web.md` §14.15, `aplicativo-mobile.md` §13.8): **carregando · sucesso com dados · sucesso sem dados (vazio) · erro de validação · erro de autorização · erro de rede · erro interno · ação em processamento · confirmação de sucesso.**

## 14.1 Interface administrativa (Angular)

| Tela/rota | Dados necessários no carregamento | Endpoint(s) | Método | Ações do usuário → endpoint | Perfil |
|---|---|---|---|---|---|
| `/login` | — | `/auth/login` | POST | Entrar → `POST /auth/login` | Todos |
| `/dashboard` | Totais por estado, atrasadas, NCs por criticidade | `/dashboard/summary`, `/dashboard/inspections-by-status`, `/dashboard/non-conformities-by-severity` | GET | Atalho "criar inspeção" → navega `/inspections/new`; atalho "revisar pendentes" → navega `/inspections?status=SUBMITTED` | ADMIN, SUPERVISOR |
| `/users` | Página de usuários | `/users` | GET | Cadastrar → `POST /users`; editar → `PUT /users/{id}`; ativar/inativar/bloquear → `PATCH /users/{id}/status`; redefinir senha → `POST /users/{id}/reset-password` | ADMIN |
| `/clients` | Página de clientes | `/clients` | GET | Cadastrar → `POST /clients`; editar → `PUT /clients/{id}`; inativar → `PATCH /clients/{id}/status` | ADMIN (escrita), ADMIN+SUPERVISOR (leitura) |
| `/clients/:clientId/sites` | Locais do cliente | `/clients/{clientId}/sites` | GET | Cadastrar local → `POST /sites` (com `clientId` fixo) | ADMIN |
| `/sites` | Página de locais | `/sites` | GET | Editar → `PUT /sites/{id}`; inativar → `PATCH /sites/{id}/status` | ADMIN |
| `/sites/:siteId/equipment` | Equipamentos do local | `/sites/{siteId}/equipment` | GET | Cadastrar equipamento → `POST /equipment` (com `siteId` fixo) | ADMIN, SUPERVISOR |
| `/equipment` | Página de equipamentos | `/equipment` | GET | Editar → `PUT /equipment/{id}`; inativar/descomissionar → `PATCH /equipment/{id}/status` | ADMIN, SUPERVISOR |
| `/inspection-templates` | Página de modelos | `/inspection-templates` | GET | Criar → `POST /inspection-templates` | ADMIN, SUPERVISOR |
| `/inspection-templates/new`, `/:templateId/edit` | Modelo + seções + itens | `GET /inspection-templates/{id}`, seções/itens embutidos ou consultados à parte | GET | Criar seção → `POST .../sections`; editar seção → `PUT .../sections/{id}`; criar item → `POST .../sections/{id}/items`; editar item → `PUT .../items/{id}` | ADMIN, SUPERVISOR |
| `/inspection-templates/:templateId/preview` | Modelo completo (seções + itens montados) | mesmo GET acima | GET | Publicar → `POST .../publish` | ADMIN, SUPERVISOR |
| `/inspection-templates/:templateId/versions` | Versões publicadas | `GET .../versions`, `GET /inspection-template-versions/{versionId}` | GET | — (somente leitura) | ADMIN, SUPERVISOR |
| `/inspections` | Página de inspeções + filtros | `/inspections` | GET | Ver detalhe → navega; cancelar → `POST .../cancel` | ADMIN, SUPERVISOR |
| `/inspections/new` | Modelos publicados, clientes, locais, equipamentos, técnicos ativos | `/inspection-templates`, `/clients`, `/sites`, `/equipment`, `/users?role=TECHNICIAN&status=ACTIVE` | GET | Agendar e atribuir → `POST /inspections` | ADMIN, SUPERVISOR |
| `/inspections/:inspectionId` | Detalhe completo | `GET /inspections/{id}` | GET | Atualizar planejamento → `PUT /inspections/{id}`; reatribuir → `POST .../assign` | ADMIN, SUPERVISOR |
| `/inspections/:inspectionId/review` | Detalhe + histórico de revisões | `GET /inspections/{id}`, `GET .../reviews` | GET | Iniciar revisão → `POST .../begin-review`; aprovar → `POST .../approve`; reprovar (motivo obrigatório) → `POST .../reject` | SUPERVISOR |
| `/non-conformities` | Lista de NCs | `/non-conformities` | GET | Filtrar por criticidade | ADMIN, SUPERVISOR |
| `/audit` | Histórico de eventos | **[PENDÊNCIA] sem endpoint definido — ver PEND-08** | — | — | ADMIN, SUPERVISOR |

Fonte do mapa de navegação: `interface-admnistrativa-web.md` §14.3.

## 14.2 Aplicativo mobile (Expo/React Native)

| Tela/rota | Dados necessários no carregamento | Endpoint(s) | Ações do usuário → endpoint | Estado offline |
|---|---|---|---|---|
| `(public)/login.tsx` | — | `POST /auth/login` | Entrar | Login exige rede na 1ª vez; sessão prévia válida permite acesso offline limitado (ver PEND-10) |
| `(tabs)/index.tsx` (Início) | Inspeções do dia, atrasadas, em andamento, pendências de sync | `GET /mobile/inspections` (dados já em SQLite) | Ação rápida sincronizar → `POST /mobile/sync/push` + `GET /mobile/sync/pull`; ação rápida QR Code → abre `/scanner` | Funciona 100% a partir do SQLite |
| `(tabs)/inspections.tsx` (Lista) | Inspeções atribuídas | dados locais (populados por `GET /mobile/inspections`) | Filtrar (client-side), abrir detalhe | Funciona offline |
| `(tabs)/sync.tsx` | Última sincronização, pendências, erros | `SyncMetadata` local | Tentar novamente → reenvia outbox | É a própria tela de estado offline |
| `(tabs)/profile.tsx` | Dados do usuário logado | `GET /auth/me` (ou cache local) | Sincronizar; sair → `POST /auth/logout` | — |
| `inspections/[inspectionId]/index.tsx` (Detalhe) | Inspeção completa | dados locais (de `GET /mobile/inspections/{id}`) | Iniciar → `POST .../start` (ou operação na outbox se offline) | Funciona offline para inspeções já baixadas |
| `inspections/[inspectionId]/start.tsx` | — | `POST .../start` | Confirmar início, capturar localização | Enfileira na outbox se offline |
| `inspections/[inspectionId]/checklist.tsx` | Snapshot dos itens + respostas existentes | dados locais | Responder item → `PUT .../responses/{id}` (ou outbox) | Sempre grava local primeiro (seção 11.3) |
| `inspections/[inspectionId]/summary.tsx` | Progresso, itens pendentes, NCs, evidências | dados locais | Confirmar conclusão → `POST .../submit` (ou outbox) | Bloqueia se itens obrigatórios pendentes (AC-COMPLETE) |
| `inspections/[inspectionId]/non-conformities.tsx` | NCs da inspeção | dados locais | Criar NC → `POST .../non-conformities` (ou outbox) | Enfileira na outbox se offline |
| `scanner.tsx` | — | `GET /equipment/by-qr/{qrCode}` | Ler QR, confirmar vínculo | Requer rede, ou fallback para busca no snapshot local do equipamento já baixado |
| `evidence/capture.tsx`, `evidence/preview.tsx` | — | `POST .../evidence` | Capturar, confirmar/refazer | Arquivo fica local; upload enfileirado |
| `sync/details.tsx` | Detalhe técnico da fila | `SyncOperation` locais | — | Tela de suporte/diagnóstico |

Fonte do mapa de navegação: `aplicativo-mobile.md` §13.3.

---

# 16. Matriz de rastreabilidade

Requisito (Regra de Negócio) → Endpoint → DTO → Entidade → Tela. Agrupada por área funcional para manter a tabela navegável; cobre as 90 regras de `regras-de-negocio.md`.

## 16.1 Usuários e acesso (RN-001 a RN-008)

| RN | Endpoint | DTO | Entidade | Tela |
|---|---|---|---|---|
| RN-001 | `POST /auth/login` | `LoginRequest`/`LoginResponse` | `User` | `/login` |
| RN-002 | `PATCH /users/{id}/status` | `UserStatusUpdateRequest` | `User` | `/users` |
| RN-003 | *(todos os endpoints protegidos)* | — | — | — |
| RN-004 | `GET /mobile/inspections/{id}` | `InspectionDetail` | `Inspection` | Detalhe da inspeção (mobile) |
| RN-005 | `GET /inspections`, `.../begin-review` | `InspectionPage` | `Inspection` | `/inspections/:id/review` |
| RN-006 | *(ausência de endpoint de escrita de resposta para ADMIN)* | — | `InspectionResponse` | — |
| RN-007 | *(requisito transversal de log)* | — | — | — |
| RN-008 | `PATCH /users/{id}/status` | `UserStatusUpdateRequest` | `User` | `/users` |

## 16.2 Clientes, locais e equipamentos (RN-009 a RN-014)

| RN | Endpoint | DTO | Entidade | Tela |
|---|---|---|---|---|
| RN-009 | `POST /sites` | `SiteCreateRequest` | `InspectionSite` | `/clients/:id/sites` |
| RN-010 | `POST /equipment` | `EquipmentCreateRequest` | `Equipment` | `/sites/:id/equipment` |
| RN-011 | `POST /equipment`, `GET /equipment/by-qr/{qrCode}` | `EquipmentCreateRequest`/`Equipment` | `Equipment` | `/equipment`, scanner mobile |
| RN-012 | `POST /inspections` (validação) | `InspectionCreateRequest` | `Equipment`, `Inspection` | `/inspections/new` |
| RN-013 | `PATCH /clients/{id}/status`, `.../sites/{id}/status`, `.../equipment/{id}/status` | `StatusUpdateRequest` | `Client`, `InspectionSite`, `Equipment` | telas de cadastro |
| RN-014 | `POST /inspections` (validação) | `InspectionCreateRequest` | `InspectionSite`, `Equipment` | `/inspections/new` |

## 16.3 Modelos de inspeção (RN-015 a RN-023)

| RN | Endpoint | DTO | Entidade | Tela |
|---|---|---|---|---|
| RN-015 | `POST .../publish` | — | `InspectionTemplateVersion` | `/inspection-templates/:id/preview` |
| RN-016 | `POST .../items` | `TemplateItemCreateRequest` | `TemplateItem` | `/inspection-templates/:id/edit` |
| RN-017 | `POST .../sections`, `.../items` | `displayOrder` | `TemplateSection`, `TemplateItem` | `/inspection-templates/:id/edit` |
| RN-018 | `POST/PUT .../sections`, `.../items` | — | `TemplateSection`, `TemplateItem` | idem |
| RN-019 | *(ausência de endpoint de edição pós-publicação)* | — | `InspectionTemplateVersion` | — |
| RN-020 | `POST .../publish` | `InspectionTemplateVersion` | `InspectionTemplateVersion` | `/inspection-templates/:id/versions` |
| RN-021 | `POST /inspections` (efeito colateral) | `InspectionItemSnapshot` | `InspectionItemSnapshot` | Detalhe da inspeção |
| RN-022 | `PUT /inspection-templates/{id}` (inativação futura) | `InspectionTemplateUpdateRequest` | `InspectionTemplate` | `/inspection-templates` |
| RN-023 | `POST .../items` (validação `responseType`) | `ResponseType` (enum) | `TemplateItem` | `/inspection-templates/:id/edit` |

## 16.4 Planejamento e atribuição (RN-024 a RN-031)

| RN | Endpoint | DTO | Entidade | Tela |
|---|---|---|---|---|
| RN-024 | `POST /inspections` | `InspectionCreateRequest.templateVersionId` | `Inspection` | `/inspections/new` |
| RN-025 | `POST /inspections` | `InspectionCreateRequest` | `Inspection` | `/inspections/new` |
| RN-026 | `POST /inspections` (validação `equipmentId`) | `InspectionCreateRequest.equipmentId` | `Inspection` | `/inspections/new` |
| RN-027 | `POST .../assign` | `AssignInspectionRequest` | `User` (técnico) | `/inspections/new`, `/inspections/:id` |
| RN-028 | `GET /mobile/inspections` | `InspectionPage` | `Inspection` | Lista de inspeções (mobile) |
| RN-029 | `POST .../cancel` | `CancelInspectionRequest` | `Inspection` | `/inspections/:id` |
| RN-030 | `POST .../cancel` (bloqueio `409`) | — | `Inspection` | `/inspections/:id` |
| RN-031 | `POST /inspections`, `.../assign` | `technicianId` (campo único) | `Inspection` | `/inspections/new` |

## 16.5 Execução (RN-032 a RN-044)

| RN | Endpoint | DTO | Entidade | Tela |
|---|---|---|---|---|
| RN-032 | `POST .../start` (validação de estado) | — | `Inspection` | Detalhe/início (mobile) |
| RN-033 | `POST .../start`, `.../submit`, `PUT .../responses/{id}` (autorização) | — | `Inspection` | idem |
| RN-034 | `POST .../start` | `StartInspectionRequest.startedAtDevice` | `Inspection` | idem |
| RN-035 | `PUT .../responses/{id}` | `InspectionResponseUpsertRequest.inspectionItemId` | `InspectionResponse` | Checklist |
| RN-036 | `PUT .../responses/{id}` (validação por `responseType`) | `InspectionResponseUpsertRequest` | `InspectionResponse` | Checklist |
| RN-037 | `POST .../submit` (bloqueio `422`) | — | `InspectionItemSnapshot`, `InspectionResponse` | Resumo/conclusão |
| RN-038 | `PUT .../responses/{id}` (validação `observation`) | `InspectionResponseUpsertRequest.observation` | `InspectionResponse` | Checklist |
| RN-039 | `POST .../submit`/`.../evidence` (validação cruzada) | `Evidence` | `Evidence`, `NonConformity` | Checklist, Resumo |
| RN-040 | *(cálculo client-side sobre snapshot + respostas)* | — | — | Detalhe, checklist (barra de progresso) |
| RN-041 | *(grava no SQLite antes de chamar API)* | — | `InspectionResponse` (local) | Checklist |
| RN-042 | `POST .../submit` | `completedAtDevice`/`submittedAtServer` | `Inspection` | Resumo/conclusão |
| RN-043 | `PUT .../responses/{id}` (bloqueio `409` pós-submit) | — | `InspectionResponse` | Checklist |
| RN-044 | `POST .../begin-review` | — | `Inspection` | `/inspections/:id/review` |

## 16.6 Evidências (RN-045 a RN-051)

| RN | Endpoint | DTO | Entidade | Tela |
|---|---|---|---|---|
| RN-045 | `POST .../evidence` | `EvidenceUploadRequest` | `Evidence` | Captura de evidência |
| RN-046 | `POST .../evidence` (`413`/`415`) | — | `Evidence` | idem |
| RN-047 | *(regra local do app — não apagar cache com pendência)* | — | `Evidence` (local) | idem |
| RN-048 | `DELETE /evidence/{id}` | — | `Evidence`, `AuditEvent` | Detalhe/revisão |
| RN-049 | `DELETE /evidence/{id}` (bloqueio se `APPROVED`) | — | `Evidence` | idem |
| RN-050 | `POST .../evidence` (`id` ≠ nome do arquivo) | `Evidence.id` | `Evidence` | — |
| RN-051 | `POST .../evidence` (processamento server-side) | — | `Evidence` | — |

## 16.7 Não conformidades (RN-052 a RN-057)

| RN | Endpoint | DTO | Entidade | Tela |
|---|---|---|---|---|
| RN-052 | `POST /inspections/{id}/non-conformities` | `NonConformityCreateRequest` | `NonConformity` | Registro de NC |
| RN-053 | `POST .../non-conformities` | `inspectionItemId` (opcional) | `NonConformity` | idem |
| RN-054 | `POST .../non-conformities` | `Severity` (enum) | `NonConformity` | idem |
| RN-055 | `POST .../non-conformities` (validação) | `severity`, `description` | `NonConformity`, `Evidence` | idem |
| RN-056 | `PATCH /non-conformities/{id}/status` | `NonConformityStatusUpdateRequest` | `NonConformity` | — (INC-04) |
| RN-057 | `NonConformityStatus` restrito a `OPEN` | — | `NonConformity` | `/non-conformities` |

## 16.8 Localização e QR Code (RN-058 a RN-064)

| RN | Endpoint | DTO | Entidade | Tela |
|---|---|---|---|---|
| RN-058/059 | *(permissão nativa, sem endpoint)* | — | — | Scanner, permissões |
| RN-060/061 | `POST .../start`, `.../submit` | `GeoLocation` | `Inspection` | Início/conclusão |
| RN-062 | `GeoLocation` (schema) | `latitude, longitude, accuracyMeters, capturedAt` | `Inspection` | idem |
| RN-063 | `GET /equipment/by-qr/{qrCode}` | `Equipment` | `Equipment` | Scanner |
| RN-064 | `GET /equipment/by-qr/{qrCode}` (comparação client-side) | — | `Equipment` | Scanner |

## 16.9 Offline e sincronização (RN-065 a RN-078)

| RN | Endpoint | DTO | Entidade | Tela |
|---|---|---|---|---|
| RN-065/066 | *(persistência local)* | — | `Inspection`, `InspectionResponse` (locais) | Lista/Detalhe offline |
| RN-067/068 | `POST /mobile/sync/push` | `SyncOperationRequest.operationId` | `SyncOperation` | Sincronização |
| RN-069/070 | `POST /mobile/sync/push` | `SyncPushResponse.results` | `SyncOperation` | idem |
| RN-071/072 | *(local)* | `SyncMetadata` | `SyncMetadata` | Tela de sincronização |
| RN-073 | `GET /mobile/sync/pull` | `SyncPullResponse` | — | idem |
| RN-074 | `*AtDevice`/`*AtServer` (todos os DTOs de execução) | — | `Inspection`, `InspectionResponse`, `Evidence` | — |
| RN-075 | `PUT .../responses/{id}` (`baseVersion`) | `InspectionResponseUpsertRequest.baseVersion` | `InspectionResponse` | Checklist |
| RN-076 | `POST /mobile/sync/push` (`CONFLICT` para `APPROVED`) | — | `Inspection` | Sincronização |
| RN-077 | `GET /mobile/sync/pull` | `SyncChange` | `Inspection` | idem |
| RN-078 | `POST .../evidence` (fluxo separado) | `Evidence` | `Evidence` | Captura/sync de evidência |

## 16.10 Revisão e aprovação (RN-079 a RN-085)

| RN | Endpoint | DTO | Entidade | Tela |
|---|---|---|---|---|
| RN-079 | `POST .../begin-review` | — | `Inspection` | `/inspections/:id/review` |
| RN-080 | `POST .../reject` (`400` sem motivo) | `RejectInspectionRequest.reason` | `InspectionReview` | idem |
| RN-081 | `POST .../approve` | `ApproveInspectionRequest` | `InspectionReview` | idem |
| RN-082 | `PUT .../responses/{id}` (bloqueio pós-`APPROVED`) | — | `Inspection` | Checklist |
| RN-083 | `GET .../reviews` | `InspectionReview[]` (por `reviewCycle`) | `InspectionReview` | `/inspections/:id/review` |
| RN-084 | *(ausência de endpoint de edição de resposta pelo supervisor)* | — | `InspectionResponse` | — |
| RN-085 | `AuditEvent` (diferenciação de origem) | `AuditEvent.metadataJson` | `AuditEvent` | `/inspections/:id/history` |

## 16.11 Auditoria e integridade (RN-086 a RN-090)

| RN | Endpoint | DTO | Entidade | Tela |
|---|---|---|---|---|
| RN-086 | `GET /inspections/{id}/history` | `AuditEvent` | `AuditEvent` | `/inspections/:id/history` |
| RN-087 | *(todo DTO com `createdAt`/`updatedAt`)* | — | todas | — |
| RN-088 | *(ausência de `DELETE` físico nos endpoints administrativos)* | — | todas | — |
| RN-089 | *(todo `409` de transição inválida, seção 3.6)* | — | `Inspection` | — |
| RN-090 | `openapi.yaml` + este documento | — | — | — |

---

# 17. Pendências e decisões necessárias

| ID | Item | Documentação relacionada | Impacto no backend | Impacto no frontend | Decisão necessária |
|---|---|---|---|---|---|
| PEND-01 | Duração exata de `accessToken`/`refreshToken`, política de rotação/uso único do refresh token, e como a senha inicial de um usuário criado por `POST /users` é definida (gerada? enviada por e-mail? definida pelo admin?) | `api-rest.md` §12.4 (só dá exemplo de `expiresIn: 900`, sem normatizar), `regras-de-negocio.md` RN-008 | Define TTL de token no backend e o fluxo de `POST /users`/`reset-password` | Define se o app precisa de tela de "primeiro acesso"/"definir senha" | **[DECISÃO NECESSÁRIA]** |
| PEND-02 | Lista fechada de `code` de erro de negócio (só `INSPECTION_REQUIRED_ITEMS_MISSING` está documentado como exemplo) | `api-rest.md` §12.2 | Cada regra `422`/`409` precisa de um `code` estável | Frontend não pode mapear ícone/mensagem por tipo de erro sem essa lista | **[PENDÊNCIA]** |
| PEND-03 | Formato interno de `optionsJson` para `SINGLE_CHOICE` (lista de opções) | `modelo-de-dados.md` §10.7.4, `openapi.yaml` (`additionalProperties: true`) | Define como o backend serializa as opções no snapshot | Define como o mobile renderiza o seletor | **[DECISÃO NECESSÁRIA]** |
| PEND-04 | Corpo de resposta de `GET /equipment/by-qr/{qrCode}` quando o equipamento existe mas está fora do escopo do técnico (RN-063) | `regras-de-negocio.md` RN-063, `criterios-de-aceitacao.md` §17.11 | Define a política de "dados mínimos" retornados | Define a UX de "equipamento fora do escopo" no scanner | **[A DEFINIR]** |
| PEND-05 | Quem pode chamar `DELETE /evidence/{id}` além do técnico dono (antes do envio) — ADMIN/SUPERVISOR podem excluir evidência já sincronizada? | `regras-de-negocio.md` RN-048/049, `perfis-de-usuario.md` §5.2 (silente sobre exclusão de evidência) | Define autorização do endpoint | Define se a tela de revisão do supervisor tem ação de excluir evidência | **[DECISÃO NECESSÁRIA]** |
| PEND-06 | Quem pode chamar `PUT /non-conformities/{id}` e em quais estados | `regras-de-negocio.md` RN-056 (silente sobre autor da edição) | Define autorização do endpoint | Define se a tela de NC do técnico/supervisor tem edição | **[A DEFINIR]** |
| PEND-07 | Endpoint de "indicadores próprios" do técnico, mencionado em `perfis-de-usuario.md` §5.2 e `objetivos.md` §2.4, mas ausente em `api-rest.md`/`openapi.yaml` | `perfis-de-usuario.md` §5.2, `objetivos.md` §2.4 | Precisa de um novo endpoint (ex.: `GET /mobile/dashboard`) ou decisão de que não existe no MVP | Tela inicial do mobile hoje não tem essa fonte de dados formal | **[PENDÊNCIA]** |
| PEND-08 | Rota `/audit` do admin (`interface-admnistrativa-web.md` §14.3) sem endpoint de auditoria global correspondente — só existe `GET /inspections/{id}/history`, escopado | `interface-admnistrativa-web.md` §14.3 vs. `api-rest.md`/`openapi.yaml` | Precisa de um novo endpoint (ex.: `GET /audit-events` com filtros) ou remover a rota do escopo do MVP | Tela `/audit` fica sem dados | **[INCONSISTÊNCIA]** |
| PEND-09 | Catálogo fechado de `code` para os cenários "credenciais inválidas" e "usuário inativo" em `POST /auth/login` (hoje distinguíveis apenas por `message`, já que ambos retornam `401`) | `criterios-de-aceitacao.md` §17.2 | Define se o backend precisa diferenciar semanticamente esses dois `401` | Define se o frontend pode/deve exibir mensagens diferentes (a própria AC diz que credenciais inválidas **não deve** revelar se o e-mail existe — logo a mensagem de "inativo" já é uma informação a mais que "credenciais inválidas" não deveria vazar; isso merece atenção redobrada na implementação) | **[DECISÃO NECESSÁRIA]** |
| PEND-10 | Critério exato de "sessão previamente válida" para acesso offline ao mobile (token expirado dentro de uma janela de tolerância local?) | `casos-de-uso.md` UC-01, fluxo alternativo | Nenhum (é regra 100% client-side) | Define a lógica de guarda de rota offline do mobile | **[A DEFINIR]** |
| PEND-11 | `PATCH /non-conformities/{id}/status` existe no contrato sem uso funcional no MVP (enum de destino tem um único valor) | `regras-de-negocio.md` RN-057, `openapi.yaml` | Endpoint pode ser implementado como no-op documentado ou omitido até P2 | Nenhum — frontend não deve chamá-lo no MVP | **[INCONSISTÊNCIA]** (repetida de INC-04) |
| PEND-12 | Padronização entre `403` e `404` para recursos escopados por técnico (a documentação de origem usa os dois critérios em lugares diferentes) | `api-rest.md` §12.3 vs. exemplo de `/mobile/inspections/{id}` em `openapi.yaml` | Define o comportamento de todos os endpoints "própria inspeção" | Define o tratamento de erro do frontend nesses casos | **[DECISÃO NECESSÁRIA]** |
| PEND-13 | Definição de "escopo operacional" do supervisor (RN-005, §5.3) — hoje não há modelo de dados para associar supervisor a um subconjunto de clientes/locais | `regras-de-negocio.md` RN-005, `perfis-de-usuario.md` §5.3, `modelo-de-dados.md` (sem tabela de associação) | Sem modelo de dados, todo supervisor deve ser tratado como tendo escopo total no MVP | Frontend não precisa filtrar por "meus clientes" no MVP | **[DECISÃO NECESSÁRIA]** (recomenda-se assumir escopo total até uma decisão de produto explícita) |
| PEND-14 | Reatribuição de técnico (`POST .../assign`) em estados além de `DRAFT`/`ASSIGNED` — permitida em `IN_PROGRESS`? | `openapi.yaml` (silente), `regras-de-negocio.md` RN-027/031 (silente) | Define a validação de estado no endpoint `assign` | Define se a tela de planejamento oferece "trocar técnico" numa inspeção já iniciada | **[A DEFINIR]** |
| PEND-15 | Parâmetro de busca textual livre para a listagem administrativa de inspeções (mencionado em `interface-admnistrativa-web.md` §14.10 como filtro "texto", sem parâmetro correspondente em `openapi.yaml`) | `interface-admnistrativa-web.md` §14.10, `funcionalidades.md` §8.2 | Precisa adicionar parâmetro (`q`?) a `GET /inspections` | Campo de busca da tela `/inspections` fica sem endpoint | **[PENDÊNCIA]** |
| PEND-16 | Tamanho máximo de arquivo (MB) e lista fechada de MIME types aceitos no upload de evidência | `regras-de-negocio.md` RN-046 (sem valor numérico), `openapi.yaml` (`image/jpeg, image/png` só como dica de encoding) | Define validação de `413`/`415` no backend | Define a mensagem de erro e eventual compressão client-side antes do upload | **[DECISÃO NECESSÁRIA]** |
| PEND-17 | Quantidade máxima de evidências por resposta/inspeção | `funcionalidades.md` §8.3 (múltiplas evidências com descrição é P1, mas não proíbe múltiplas no MVP) | Define se há limite a validar no backend | Define se a UI de captura permite múltiplas fotos por item no MVP | **[A DEFINIR]** |
| PEND-18 | Roteiro de tela para o cruzamento "inspeção cancelada no servidor" + "existem alterações locais pendentes dessa mesma inspeção" | `regras-de-negocio.md` RN-077, `fluxo-geral.md` §7.9 | Nenhum (é UX) | Define uma tela/modal específica ainda não desenhada em `aplicativo-mobile.md` | **[A DEFINIR]** |
| PEND-19 | `openapi.yaml` não foi (re)validado com linter nesta sessão | `PROMPT-MESTRE-DOCUMENTACAO.md` (processo original) | Recomenda-se `npx @redocly/cli lint openapi.yaml` antes de iniciar a implementação | — | **[PENDÊNCIA]** (ação de verificação, não de negócio) |

---

# 18. Revisão de consistência da própria documentação

Esta seção fecha o ciclo pedido: uma checagem explícita do que, mesmo depois deste documento, ainda impede um desenvolvedor de frontend trabalhar **sem** consultar outra pessoa ou o código-fonte do backend.

## 18.1 O que está resolvido e é seguro implementar em paralelo hoje

- Todo o CRUD de cadastros (usuários, clientes, locais, equipamentos), o construtor de modelos, o ciclo de vida completo da inspeção, o checklist dinâmico, upload de evidência (exceto limites numéricos), não conformidades (exceto o status), revisão/aprovação/reprovação e o par push/pull de sincronização têm: endpoint, DTO completo (`openapi.yaml`), matriz de permissão (seção 6), estado e transição (seção 7) e ao menos um exemplo de payload (seções 3 e 8). Um desenvolvedor de mobile ou admin pode implementar essas telas contra um mock gerado a partir de `openapi.yaml` sem esperar o backend.

## 18.2 O que continua bloqueando desenvolvimento 100% independente

Os 19 itens da seção 17 são exatamente essa lista. Os que têm **maior risco de retrabalho de UI** se decididos tarde (porque mudam a estrutura de tela, não só um valor de configuração) são:

1. **PEND-03** (formato de `optionsJson` para seleção única) — afeta diretamente o componente de checklist do mobile.
2. **PEND-08** (endpoint de auditoria global ausente para a rota `/audit` já mapeada no admin) — uma tela inteira do admin está prevista sem contrato.
3. **PEND-13** (escopo operacional do supervisor) — se resolvido como "escopo parcial" no futuro, exige filtro adicional em praticamente toda tela administrativa de listagem.
4. **PEND-16** (limite de upload) — afeta se o mobile precisa implementar compressão de imagem antes de enviar.

Recomenda-se que a equipe resolva esses quatro itens **antes** de começar a construção das telas de checklist (mobile) e de auditoria/planejamento (admin), respectivamente. Os demais 15 itens são preenchíveis incrementalmente sem re-trabalho estrutural.

## 18.3 Inconsistências entre documentos de origem — todas endereçadas

As 7 inconsistências detectadas na leitura cruzada (seção 1.4) foram todas resolvidas por precedência normativa explícita ou permanecem sinalizadas na seção 17 — nenhuma foi descartada arbitrariamente, e nenhuma decisão foi tomada silenciosamente sem registro de qual documento disse o quê.

## 18.4 Nenhum requisito inventado

Toda regra de negócio, todo endpoint, todo campo de DTO e toda transição de estado citados neste documento tem uma referência rastreável a `RN-XXX`, `UC-XX`, `AC-<ÁREA>`, `RNF-XXX`, a um arquivo em `./docs`, ou a uma linha específica de `openapi.yaml`/`db/schema.sql`. Onde essa referência não existia, o item foi marcado como pendência em vez de decidido por suposição.
