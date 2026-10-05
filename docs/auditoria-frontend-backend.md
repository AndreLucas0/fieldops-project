# Auditoria Frontend ↔ Backend: FieldOps

| Campo | Valor |
|---|---|
| Data | 2026-10-02 |
| Branch / commit analisados | `main` @ `7a11db9` (working tree limpo) |
| Tipo | Auditoria somente leitura: nenhum código, teste ou migration foi alterado durante a análise |
| Escopo | Backend (`backend/`), Web (`web/`), Mobile (`mobile/`), `shared/`, `openapi.yaml`, `docs/**`, `project-state/**` |
| Status | **ATIVO**. Ao ficar desatualizado, marcar como *superseded* em vez de apagar |

Fontes:
- **Backend:** li diretamente os 16 controllers, os DTOs, os enums, o `GlobalExceptionHandler`, a configuração de segurança e os serviços principais.
- **Web:** auditado pelo agente `ecc:typescript-reviewer`.
- **Mobile:** auditado pelo agente `ecc:react-reviewer`.

Conferi pessoalmente os achados cruzados mais graves dos agentes.

Não usei `ecc:java-reviewer`, `ecc:security-reviewer` nem `ecc:code-reviewer`: a leitura direta do backend foi suficiente para o inventário, e o pedido era não rodar agentes sem necessidade.

> Nota: `docs-project/` não existe. A documentação normativa está em `docs/`. Já existe `docs/contrato-backend-frontend.md` (1457 linhas), que está parcialmente desatualizado em relação ao código (ver §20).

---

## 1. Resumo executivo

- **Backend:** 73 operações implementadas, contando uma vez cada rota de modelo que existe em dobro (`/templates/*` e `/inspection-templates/*`). O `openapi.yaml` documenta 72. Uma rota documentada não existe (`responses:batch`). Duas existem sem documentação: `GET .../active-version` e `GET /inspections/{id}/non-conformities`.
- **Erros:** o formato de erro global é único e consistente em todos os endpoints.
- **Web:** só 3 de 23 telas existem (Login, Dashboard, Modelos lista + construtor).
  - Das 23, 1 está COMPLETA (Dashboard) e 3 estão PARCIAIS (Login, lista e construtor de modelos).
  - **O construtor de modelos manda payloads que o backend real recusa com 400** (falta `displayOrder`/`title`; ver §19).
  - Não há shell (menu, logout, exibição de toasts), então erros e sucessos ficam invisíveis.
  - Não há proxy nem CORS: o web em `ng serve` não alcança o backend real. Isso é NÃO CONFIRMADO em execução.
- **Mobile:** 12 de 14 telas existem, todas PARCIAIS exceto o Login. Faltam FE-M04 (Sincronização) e FE-M14 (Detalhes de sync). Contra o backend real há quebras confirmadas por leitura de código:
  - Login com senha errada vira "erro inesperado".
  - Nomes de cliente, local e equipamento dão 403 para o técnico.
  - A resposta `SINGLE_CHOICE` não volta no detalhe.
  - O vínculo de NC com o item se perde.
  - O mock ligado por padrão não tem `/mobile/sync/push`.
- **Documentação × código:** há cerca de 26 divergências. As mais sérias:
  - Autorização mais permissiva que a matriz documentada: ADMIN/SUPERVISOR podem iniciar, concluir e responder (RN-033, RN-006).
  - `POST /inspections` não valida coerência entre local, cliente e equipamento (RN-014).
  - `PUT /inspections/{id}` não tem trava de estado.
  - O contrato de sync do `openapi.yaml` não bate com o implementado.

---

## 2. Arquitetura de integração atual

| Item | Backend | Web | Mobile |
|---|---|---|---|
| Base URL | `server.servlet.context-path: /api/v1` (`application.yml:21`) | `apiBaseUrl: '/api/v1'` (relativa), sem `proxy.conf` | `EXPO_PUBLIC_API_BASE_URL`, padrão `http://localhost:8090/api/v1` |
| Mock | — | `mockApi: true` em development, `false` em production. O mock cobre só os 8 serviços de domínio, **não `/auth/*`** | `EXPO_PUBLIC_API_MOCK` **padrão `true`**. O mock cobre auth, mobile, execução e cadastros, **mas não `/mobile/sync/*` nem DELETE** |
| Auth | JWT HS256 stateless, `role` → `ROLE_*`, `SessionTokenValidator` | Access token em memória, refresh em `sessionStorage` | `expo-secure-store` (`fieldops.session`) |
| CORS | **Não há configuração** (grep sem resultados) | — | Não se aplica a app nativo |
| Offline | Sync push/pull completos | — | SQLite com outbox **só para `INSPECTION_RESPONSE`**. Sem pull e sem cache de inspeções |

---

## 3. Inventário completo de endpoints

### Tabela executiva de APIs

Legenda:
- **Consumidor:** **W** = tela web; **W(svc)** = método de serviço web sem tela; **M** = mobile; **—** = nenhum.
- **Status:** **OK** = implementado e documentado; **IMPL/NÃO DOC** = implementado mas não documentado; **DOC/NÃO IMPL** = documentado mas não implementado; **MISMATCH** = divergência de contrato com algum consumidor.

| Método | Endpoint | Auth (roles) | Request | Response | Status | Consumidor |
|---|---|---|---|---|---|---|
| POST | `/auth/login` | público | `LoginRequest` | 200 `LoginResponse` | MISMATCH (código de erro, §19) | W Login, M Login |
| POST | `/auth/refresh` | público | `RefreshTokenRequest` | 200 `RefreshTokenResponse` | OK | W interceptor, M api-client |
| POST | `/auth/logout` | autenticado | — | 204 | OK | M Perfil; W(svc), sem UI |
| GET | `/auth/me` | autenticado | — | 200 `CurrentUserResponse` | OK | M restore; W(svc), sem uso |
| GET | `/users` | ADMIN | query | 200 `Page<UserResponse>` | OK | W(svc) |
| POST | `/users` | ADMIN | `UserCreateRequest` | 201 `UserResponse` | OK | W(svc) |
| GET | `/users/{id}` | ADMIN | — | 200 `UserResponse` | OK | W(svc) |
| PUT | `/users/{id}` | ADMIN | `UserUpdateRequest` | 200 `UserResponse` | OK | W(svc) |
| PATCH | `/users/{id}/status` | ADMIN | `{status}` | 200 `UserResponse` | OK | W(svc) |
| POST | `/users/{id}/reset-password` | ADMIN | — | 200 `{message}` | OK | — |
| GET | `/clients` | ADMIN, SUP | query | 200 `Page<ClientResponse>` | OK | W(svc) |
| POST | `/clients` | ADMIN, SUP ⚠ | `ClientCreateRequest` | 201 `ClientResponse` | Doc diz só ADMIN | W(svc) |
| GET | `/clients/{id}` | ADMIN, SUP | — | 200 `ClientResponse` | MISMATCH (técnico recebe 403) | M (nomes), W(svc) |
| PUT | `/clients/{id}` | ADMIN, SUP ⚠ | `ClientUpdateRequest` | 200 | Doc diz só ADMIN | W(svc) |
| PATCH | `/clients/{id}/status` | ADMIN, SUP ⚠ | `{status}` | 200 | Doc diz só ADMIN | W(svc) |
| GET | `/clients/{clientId}/sites` | ADMIN, SUP | `?status` + página | 200 `Page<SiteResponse>` | MISMATCH (web espera array) | W(svc) |
| GET | `/sites` | ADMIN, SUP | query | 200 `Page<SiteResponse>` | OK | W(svc) |
| POST | `/sites` | ADMIN, SUP ⚠ | `SiteCreateRequest` | 201 | Doc diz só ADMIN | W(svc) |
| GET | `/sites/{id}` | ADMIN, SUP | — | 200 | MISMATCH (técnico recebe 403) | M (nomes), W(svc) |
| PUT | `/sites/{id}` | ADMIN, SUP ⚠ | `SiteUpdateRequest` | 200 | Doc diz só ADMIN | W(svc) |
| PATCH | `/sites/{id}/status` | ADMIN, SUP ⚠ | `{status}` | 200 | OK | — |
| GET | `/sites/{siteId}/equipment` | ADMIN, SUP | `?status` + página | 200 `Page<EquipmentResponse>` | MISMATCH (web espera array) | W(svc) |
| GET | `/equipment` | ADMIN, SUP | query | 200 `Page<EquipmentResponse>` | OK | W(svc) |
| POST | `/equipment` | ADMIN, SUP | `EquipmentCreateRequest` | 201 | OK | W(svc) |
| GET | `/equipment/{id}` | ADMIN, SUP | — | 200 | MISMATCH (técnico recebe 403) | M (nome), W(svc) |
| PUT | `/equipment/{id}` | ADMIN, SUP | `EquipmentUpdateRequest` | 200 | Doc diverge (`qrCode` editável) | W(svc) |
| PATCH | `/equipment/{id}/status` | ADMIN, SUP | `{status}` | 200 | OK | W(svc) |
| GET | `/equipment/by-qr/{qrCode}` | ADMIN, SUP, TECH (escopo RN-063) | path ≤100 | 200 | OK | M Scanner, W(svc) |
| GET | `/inspection-templates` (+`/templates`) | ADMIN, SUP | query | 200 `Page<TemplateResponse>` | OK (web usa o alias `/templates`) | W Modelos |
| POST | `/inspection-templates` | ADMIN, SUP | `TemplateCreateRequest` | 201 `TemplateResponse` | OK | — (FE-W14 falta) |
| GET | `/inspection-templates/{id}` | ADMIN, SUP | — | 200 `TemplateResponse` | MISMATCH leve (`createdById` × `createdBy`) | W Construtor |
| PUT | `/inspection-templates/{id}` | ADMIN, SUP | `TemplateUpdateRequest` | 200 | OK | W Construtor |
| POST | `/inspection-templates/{id}/publish` | ADMIN, SUP | sem corpo, ou `PublishTemplateRequest` (legado) | 201 `TemplateVersionResponse` | OK | — |
| GET | `/inspection-templates/{id}/sections` | ADMIN, SUP | — | 200 `TemplateSectionResponse[]` | OK | W Construtor |
| POST | `/inspection-templates/{id}/sections` | ADMIN, SUP | `TemplateSectionCreateRequest` | 201 | **MISMATCH (web não envia `displayOrder` → 400)** | W Construtor |
| PUT | `.../sections/{sectionId}` | ADMIN, SUP | `TemplateSectionCreateRequest` | 200 | **MISMATCH (400 ao editar e ao reordenar)** | W Construtor |
| POST | `.../sections/{sectionId}/items` | ADMIN, SUP | `TemplateItemRequest` | 201 `TemplateItemResponse` | **MISMATCH (sem `displayOrder` → 400)** | W Construtor |
| PUT | `/inspection-templates/{id}/items/{itemId}` | ADMIN, SUP | `TemplateItemRequest` | 200 | **MISMATCH (400 ao editar e ao reordenar)** | W Construtor |
| GET | `/inspection-templates/{id}/active-version` | ADMIN, SUP | — | 200 `TemplateVersionResponse` | IMPL/NÃO DOC | — |
| GET | `/inspection-templates/{id}/versions` | ADMIN, SUP | página | 200 `Page<TemplateVersionResponse>` | MISMATCH (web espera array) | W(svc) |
| GET | `/inspection-template-versions/{versionId}` | ADMIN, SUP | — | 200 `TemplateVersionResponse` | MISMATCH (`templateId` ausente; `publishedById` × `publishedBy`) | W(svc) |
| GET | `/dashboard/summary` | ADMIN, SUP | — | 200 `DashboardSummaryDto` | OK | W Dashboard |
| GET | `/dashboard/inspections-by-status` | ADMIN, SUP | — | 200 `StatusCountDto[]` | OK | W Dashboard |
| GET | `/dashboard/non-conformities-by-severity` | ADMIN, SUP | — | 200 `SeverityCountDto[]` | OK | W Dashboard |
| GET | `/inspections` | ADMIN, SUP | 10 filtros + página | 200 `Page<InspectionResponse>` | OK (texto livre `q` não existe) | W(svc) |
| POST | `/inspections` | ADMIN, SUP | `InspectionCreateRequest` | 201 `InspectionResponse` | Doc diverge (§20) | W(svc) |
| GET | `/inspections/{id}` | ADMIN, SUP ⚠ | — | 200 `InspectionResponse` (plano) | **MISMATCH (web espera `InspectionDetail`)** | W(svc) |
| PUT | `/inspections/{id}` | ADMIN, SUP | `InspectionUpdateRequest` | 200 | Doc diverge (sem trava de estado) | W(svc) |
| POST | `/inspections/{id}/assign` | ADMIN, SUP | `{technicianId}` | 200 | Doc diverge (só a partir de DRAFT) | — |
| POST | `/inspections/{id}/cancel` | ADMIN, SUP | `{reason?}` (corpo opcional) | 200 | Doc diverge (motivo opcional) | W(svc) |
| GET | `/inspections/{id}/history` | ADMIN, SUP ⚠ | página | 200 `Page<AuditEventDto>` | OK (doc de telas diz que não existe) | — |
| POST | `/inspections/{id}/start` | ADMIN, SUP, TECH ⚠ | `StartInspectionRequest?` | 200 `InspectionResponse` | Doc diz só TECH | M Iniciar |
| POST | `/inspections/{id}/submit` | ADMIN, SUP, TECH ⚠ | `SubmitInspectionRequest?` | 200 | Doc diz só TECH | M Resumo |
| POST | `/inspections/{id}/begin-review` | SUP | — | 200 | OK | W(svc) |
| POST | `/inspections/{id}/approve` | SUP | `{comments?}` | 200 | OK | W(svc) |
| POST | `/inspections/{id}/reject` | SUP | `{reason*, itemsToCorrect?}` | 200 | `itemsToCorrect` é descartado (§21) | W(svc) |
| GET | `/inspections/{id}/reviews` | ADMIN, SUP ⚠ | — | 200 `InspectionReviewResponse[]` | OK | — |
| GET | `/inspections/{id}/responses` | ADMIN, SUP, TECH (própria) | — | 200 `InspectionResponseDto[]` | OK | — |
| PUT | `/inspections/{id}/responses/{snapshotId}` | ADMIN, SUP ⚠, TECH (própria) | `InspectionResponseCreateRequest` | 200 `InspectionResponseDto` | Doc diverge (`{responseId}`) | — (mobile usa o outbox) |
| POST | `/inspections/{id}/responses:batch` | — | — | — | **DOC/NÃO IMPL** | — (só no mock mobile) |
| GET | `/mobile/inspections` | TECH | página (sem filtros) | 200 `Page<InspectionResponse>` | Doc diverge (filtros ausentes) | M Início, Lista |
| GET | `/mobile/inspections/{id}` | TECH (própria) | — | 200 `MobileInspectionDetailResponse` | **MISMATCH (§19)** | M Detalhe, Iniciar, Checklist, NC, Resumo |
| POST | `/inspections/{id}/evidence` | ADMIN, SUP, TECH ⚠ | multipart | 201 `EvidenceResponse` | OK | M Prévia |
| GET | `/inspections/{id}/evidence` | ADMIN, SUP, TECH (própria) | `?responseId,nonConformityId` | 200 `EvidenceResponse[]` | OK | M Resumo, W(svc) |
| GET | `/evidence/{id}` | ADMIN, SUP, TECH (própria) | — | 200 | OK | — |
| DELETE | `/evidence/{id}` | ADMIN, SUP, TECH (própria) | — | 204 | OK | — |
| POST | `/inspections/{id}/non-conformities` | ADMIN, SUP, TECH ⚠ | `NonConformityCreateRequest` | 201 `NonConformityResponse` | **MISMATCH (`inspectionItemId` × `snapshotId`)** | M NC |
| GET | `/inspections/{id}/non-conformities` | ADMIN, SUP, TECH (própria) | — | 200 `NonConformityResponse[]` | IMPL/NÃO DOC | — |
| GET | `/non-conformities` | ADMIN, SUP | `?inspectionId,severity,status` + página | 200 `Page<…>` | Doc só cita `severity` | W(svc) |
| GET | `/non-conformities/{id}` | ADMIN, SUP, TECH (própria) | — | 200 | OK | W(svc) |
| PUT | `/non-conformities/{id}` | ADMIN, SUP, TECH (própria) | `NonConformityUpdateRequest` | 200 | OK (PEND-06) | M NC |
| PATCH | `/non-conformities/{id}/status` | ADMIN, SUP, TECH (própria) | `{status}` | 200 | OK (sem uso no MVP, RN-057) | — |
| POST | `/mobile/sync/push` | TECH | `SyncPushRequest` | 200 `SyncPushResponse` | **MISMATCH doc×código** (mobile segue o código) | M sync-service |
| GET | `/mobile/sync/pull` | TECH | `?cursor` (ISO-8601) | 200 `SyncPullResponse` | OK | — |

⚠ = autorização diferente da matriz em `contrato-backend-frontend.md` §6.6 (ver §20).

---

## 4. Contratos de Request

Convenções:
- `*` marca campo obrigatório.
- Tudo é JSON, exceto o upload de evidência.
- Campos desconhecidos são ignorados em silêncio. Isso vem do padrão do Jackson no Spring Boot e é NÃO CONFIRMADO, porque não há configuração explícita. É por isso que alguns erros de nome de campo não aparecem como 400 (§19).

| DTO | Campos (tipo, validação) | Origem |
|---|---|---|
| `LoginRequest` | `email*` string `@Email`; `password*` string `@NotBlank` | `auth/dto` |
| `RefreshTokenRequest` | `refreshToken*` string | idem |
| `UserCreateRequest` | `name*` ≤150; `email*` `@Email` ≤255 (único, senão 409); `password*` 8–255; `role*` `UserRole`; `phone` | `user/dto` |
| `UserUpdateRequest` | `name*` ≤150; `email*` ≤255; `role*`; `phone` (**sem senha**) | idem |
| `*StatusUpdateRequest` (User/Client/Site/Equipment/NC) | `status*` do enum correspondente | vários |
| `ClientCreate/UpdateRequest` | `name*` ≤150; `legalName` ≤200; `document` ≤30; `email` `@Email` ≤255; `phone` ≤30 | `client/dto` |
| `SiteCreateRequest` | `clientId*` UUID; `name*` ≤150; `description` ≤500; `addressLine` ≤255; `city` ≤100; `state` ≤100; `postalCode` ≤20; `latitude`/`longitude` decimal; `contactName` ≤150; `contactPhone` ≤30 | `site/dto` |
| `SiteUpdateRequest` | igual ao create **sem `clientId`** (imutável) | idem |
| `EquipmentCreateRequest` | `siteId*`; `name*` ≤150; `assetNumber` ≤50; `serialNumber` ≤100; `manufacturer` ≤150; `model` ≤150; `description` ≤500; `qrCode*` ≤100 (único, senão 409); `installedAt` date | `equipment/dto` |
| `EquipmentUpdateRequest` | igual **sem `siteId`**, mas **com `qrCode*`** (o doc diz que é imutável, ver §20) | idem |
| `TemplateCreateRequest` | `title*` ≤200; `description` ≤1000; `category*` ≤100; `sections` (lista opcional de `TemplateSectionRequest`) | `template/dto` |
| `TemplateUpdateRequest` | `title*`, `description`, `category*` | idem |
| `TemplateSectionCreateRequest` | `title*` ≤150; `description` ≤500; **`displayOrder*` inteiro positivo** | idem |
| `TemplateItemRequest` | `code` ≤50; `title*` ≤300; `description` ≤1000; `responseType*`; `required`, `observationRequiredOnFailure`, `evidenceRequiredOnFailure` (Boolean); `optionsJson` string; **`displayOrder*` positivo** | idem |
| `PublishTemplateRequest` (legado) | `sections*` não vazio | idem |
| `InspectionCreateRequest` | `templateVersionId*`, `clientId*`, `siteId*`, `technicianId*` UUID; `equipmentId`, `supervisorId`; `title` ≤200; `instructions` ≤1000; `priority*`; `scheduledFor*` Instant | `inspection/dto` |
| `InspectionUpdateRequest` | `title`, `instructions`, `priority*`, `scheduledFor*` | idem |
| `AssignInspectionRequest` | `technicianId*` | idem |
| `CancelInspectionRequest` | `reason` ≤500 (corpo inteiro opcional) | idem |
| `Start/SubmitInspectionRequest` | `startedAtDevice`/`completedAtDevice` Instant; `location` {`latitude`, `longitude`, `accuracyMeters`, `capturedAt`}; corpo opcional | idem |
| `InspectionResponseCreateRequest` | `valueText`, `valueNumber`, `valueBoolean`, `valueDate` (date), `valueChoice` (string), `observation`, `conformity` (`@Pattern` NOT_APPLICABLE \| CONFORMING \| NON_CONFORMING). **Não há validação do valor contra o `responseType`** | idem |
| `NonConformityCreateRequest` | `title*` ≤300; `description` (opcional); `severity*`; `snapshotId`; `responseId` | `nonconformity/dto` |
| `NonConformityUpdateRequest` | `title*` ≤300; **`description*`**; `severity*` | idem |
| `ApproveInspectionRequest` | `comments` (corpo opcional) | `review/dto` |
| `RejectInspectionRequest` | `reason*`; `itemsToCorrect` UUID[] (**aceito e ignorado**) | idem |
| Upload de evidência (multipart, `@RequestParam`) | `idempotencyKey*` UUID; `type*` (`PHOTO`); `capturedAtDevice*` string ISO-8601 (inválida → 422 `INVALID_DATE_TIME`); parte `file*` (jpeg/png, ≤10 MB pela aplicação, ≤12 MB pelo servlet); `responseId`, `nonConformityId`, `description`, `latitude`+`longitude` (ambos ou nenhum) | `EvidenceController:42-56` |
| `SyncPushRequest` | `deviceId*`; `lastPullCursor`; `operations*` (não vazio) de {`operationId*`, `entityType*`, `entityId*`, `operationType*`, `baseVersion`, `payload*`} | `synchronization/dto` |

**Payload de sync por `entityType`** (implementação real):

| entityType | `entityId` | `payload` | Observação |
|---|---|---|---|
| `INSPECTION` | id da inspeção | `{status*: IN_PROGRESS\|SUBMITTED, startedAtDevice, completedAtDevice, location}` | Outros status geram REJECTED `SYNC_UNSUPPORTED_INSPECTION_TRANSITION` |
| `INSPECTION_RESPONSE` | **id do snapshot** | `{inspectionId*, valueText, valueNumber, valueBoolean, valueDate, valueChoice, observation, conformity}` | O doc e o openapi dizem `entityId` = id da resposta e payload com `inspectionItemId`/`answeredAtDevice` |
| `NON_CONFORMITY` | id da NC, gerado no device | `{inspectionId*, title, description, severity, snapshotId, responseId}` | |
| `EVIDENCE` | — | — | Sempre REJECTED `SYNC_EVIDENCE_NOT_SUPPORTED` (RN-078) |
| qualquer `DELETE` | — | — | REJECTED `SYNC_DELETE_NOT_SUPPORTED` |

**Campos que o frontend não deve enviar:** `id`, `status`, `version`, `createdAt`, `updatedAt`, `*AtServer`, `serverReceivedAt`, `createdById`, `reportedById`, `respondedById`, `storageKey`, `accessUrl`. Nenhum DTO de escrita os aceita. Não existe `baseVersion` nos endpoints REST: o controle otimista via `baseVersion` só existe no sync, e no REST a versão é verificada pelo `@Version` da JPA (409 `OPTIMISTIC_LOCK_CONFLICT`).

**Paginação** (todas as listagens `Page`): `page` (padrão 0), `size` (padrão 20), `sort=campo,dir`. O backend **não configura máximo 100** (o doc diz 100; a web limita no cliente). Campos de ordenação permitidos (fora deles → 422 `INVALID_SORT_FIELD`):

| Recurso | Campos de `sort` |
|---|---|
| users | name, email, role, status, createdAt |
| clients | name, status, createdAt |
| sites | name, status, city, createdAt |
| equipment | name, status, assetNumber, createdAt |
| templates | title, category, status, createdAt |
| versions | versionNumber, publishedAt, createdAt |
| inspections | status, priority, scheduledFor, createdAt |
| non-conformities | createdAt, severity, status |

**Filtros (query):**

| Endpoint | Filtros |
|---|---|
| `/users` | `name`, `email`, `role`, `status` |
| `/clients` | `name`, `status` |
| `/sites` | `clientId`, `name`, `status` |
| `/equipment` | `siteId`, `name`, `status` |
| `/inspection-templates` | `title`, `category`, `status` |
| `/inspections` | `clientId`, `siteId`, `technicianId`, `supervisorId`, `equipmentId`, `status`, `priority`, `scheduledFrom`/`scheduledTo` (Instant), `overdue` (boolean) |
| `/non-conformities` | `inspectionId`, `severity`, `status` |
| `/mobile/inspections` | **nenhum** |
| `/mobile/sync/pull` | `cursor` |

**Path params:** todos são UUID (valor inválido → 400 `INVALID_PARAMETER`), exceto `qrCode`: string ≤100 (acima disso → 400 `VALIDATION_ERROR`).

**Headers:**
- `Authorization: Bearer <accessToken>` em tudo, exceto `/auth/login`, `/auth/refresh` e swagger.
- `Content-Type: application/json`, ou `multipart/form-data` no upload. Tipo errado → 415 `UNSUPPORTED_CONTENT_TYPE`.
- Não existe nenhum header customizado: nem `Idempotency-Key`, nem `X-Request-Id`, nem `X-Device-Id`. A idempotência vai em campos (`operationId`, `idempotencyKey`).

---

## 5. Contratos de Response

Paginação: `{page:int, size:int, totalElements:long, totalPages:int, content:T[]}` (`PageResponse`). Datas em ISO-8601: `Instant` em UTC, `LocalDate` em `yyyy-MM-dd`. Todos os campos podem vir `null` quando não preenchidos; nenhum DTO usa `@JsonInclude(NON_NULL)` (NÃO CONFIRMADO globalmente).

| DTO | Campos |
|---|---|
| `LoginResponse` | `accessToken`, `refreshToken`, `expiresIn` (long, s; padrão 900), `user{id, name, email, role}` |
| `RefreshTokenResponse` | `accessToken`, `refreshToken`, `expiresIn` (**sem `user`**) |
| `CurrentUserResponse` | `id`, `name`, `email`, `role`, `status`, `phone` |
| `UserResponse` | `id`, `name`, `email`, `role`, `status`, `phone`, `createdAt`, `updatedAt`, `version` |
| `ClientResponse` | `id`, `name`, `legalName`, `document`, `email`, `phone`, `status`, `createdAt`, `updatedAt`, `version` |
| `SiteResponse` | `id`, `clientId`, `name`, `description`, `addressLine`, `city`, `state`, `postalCode`, `latitude`, `longitude`, `contactName`, `contactPhone`, `status`, `createdAt`, `updatedAt`, `version` |
| `EquipmentResponse` | `id`, `siteId`, `name`, `assetNumber`, `serialNumber`, `manufacturer`, `model`, `description`, `qrCode`, `status`, `installedAt`, `createdAt`, `updatedAt`, `version` |
| `TemplateResponse` | `id`, `title`, `description`, `category`, `status`, `currentVersion` (Integer, nullable), `createdById`, `createdAt`, `updatedAt`, `version` |
| `TemplateVersionResponse` | `id`, `versionNumber`, `titleSnapshot`, `descriptionSnapshot`, `publishedById`, `publishedAt`, `activeForNewInspections`, `createdAt`, `sections[]` (**sem `templateId`**) |
| `TemplateSectionResponse` | `id`, `templateVersionId`, `title`, `description`, `displayOrder`, `createdAt`, `items[]` |
| `TemplateItemResponse` | `id`, `sectionId`, `code`, `title`, `description`, `responseType`, `required`, `observationRequiredOnFailure`, `evidenceRequiredOnFailure`, `optionsJson` (string), `displayOrder`, `createdAt` |
| `InspectionResponse` | `id`, `templateVersionId`, `clientId`, `siteId`, `equipmentId`, `technicianId`, `supervisorId`, `createdById`, `title`, `instructions`, `priority`, `status`, `scheduledFor`, `startedAtDevice`, `startedAtServer`, `completedAtDevice`, `submittedAtServer`, `approvedAt`, `canceledAt`, `canceledReason`, `createdAt`, `updatedAt`, `version` (**só IDs, sem nomes; sem itens**) |
| `MobileInspectionDetailResponse` | subconjunto de `InspectionResponse` (sem `supervisorId`, `createdById`, `startedAtDevice`, `completedAtDevice`, `approvedAt`, `canceled*`), mais `items: ItemSnapshotDto[]`, `responses: MobileInspectionResponseDto[]`, `nonConformities: MobileNonConformityDto[]`, `reviews: InspectionReviewResponse[]` |
| `ItemSnapshotDto` | `id`, `inspectionId`, `sourceTemplateItemId`, `sectionTitle`, `sectionDescription`, `sectionOrder`, `itemCode`, `itemTitle`, `itemDescription`, `responseType` (string), `required`, `optionsJson`, `rulesJson` (**sempre null** por decisão de 2026-09-28), `itemOrder`, `createdAt`. **Não expõe `observationRequiredOnFailure`/`evidenceRequiredOnFailure`** |
| `MobileInspectionResponseDto` | `id`, `inspectionId`, `inspectionItemId` (= snapshot), `valueText`, `valueNumber`, `valueBoolean`, `valueDate`, `observation`, `conformity`, `answeredBy`, `answeredAtDevice`, `serverReceivedAt`, `createdAt`, `updatedAt`, `version` (**sem `valueChoice`**) |
| `InspectionResponseDto` (REST) | `id`, `inspectionId`, `snapshotId`, `respondedById`, `value*` (**com `valueChoice`**), `observation`, `conformity`, `respondedAt`, `updatedAt`, `version` |
| `NonConformityResponse` (REST) | `id`, `inspectionId`, `snapshotId`, `responseId`, `reportedById`, `title`, `description`, `severity`, `status`, `createdAt`, `updatedAt`, `version` |
| `MobileNonConformityDto` | `id`, `inspectionId`, `inspectionItemId`, `responseId`, `title`, `description`, `severity`, `status`, `createdBy`, `createdAtDevice`, `serverReceivedAt`, `createdAt`, `updatedAt`, `version` |
| `InspectionReviewResponse` | `id`, `inspectionId`, `reviewerId`, `decision`, `reason`, `comments`, `reviewedAt`, `reviewCycle`, `createdAt` (**sem `itemsToCorrect`**) |
| `EvidenceResponse` | `id`, `inspectionId`, `responseId`, `nonConformityId`, `type`, `storageKey`, `accessUrl` (URL temporária do S3/MinIO), `mimeType`, `sizeBytes`, `checksum`, `description`, `latitude`, `longitude`, `capturedAtDevice`, `serverReceivedAt`, `uploadedAt`, `createdBy`, `createdAt` |
| `AuditEventDto` | `id`, `inspectionId`, `actorId`, `action`, `entityType`, `entityId`, `occurredAt`, `deviceOccurredAt`, `previousValueJson`/`newValueJson`/`metadataJson` (objetos), `requestId`, `deviceId` |
| `DashboardSummaryDto` | `totalInspections`, `inspectionsInProgress`, `inspectionsPendingReview`, `inspectionsOverdue`, `inspectionsApproved`, `inspectionsRejected`, `nonConformitiesOpen` (todos long) |
| `StatusCountDto` / `SeverityCountDto` | `{status, count}` / `{severity, count}` |
| `SyncPushResponse` | `results[{operationId, status, entityVersion, error{code, message}}]`, `nextCursor` (**ecoa o `lastPullCursor` recebido**), `serverTime` |
| `SyncPullResponse` | `changes[{entityType, entityId, operationType: UPSERT, payload(map), version, occurredAt}]` (no máximo 500), `nextCursor` (ISO-8601 do último `occurredAt`), `serverTime`. Payload de INSPECTION: `status`, `startedAt*`, `completedAtDevice`, `submittedAtServer`, `canceledAt`, `canceledReason`. RESPONSE: `inspectionId`, `snapshotId`, `value*`, `observation`, `conformity`. NC: `inspectionId`, `title`, `description`, `severity`, `status`. **Não inclui snapshots nem novas inspeções completas** |

O pull cobre inspeções atribuídas ao técnico, respostas e NCs. Uma inspeção recém-atribuída aparece só com o status: os itens exigem `GET /mobile/inspections/{id}`.

---

## 6. Contratos de erro

**Estrutura global única** (`shared/error/ErrorResponse.java`), usada por todos os erros de controller, pelo `JsonAuthenticationEntryPoint` (401) e pelo `JsonAccessDeniedHandler` (403):

```json
{ "timestamp": "Instant", "status": 422, "code": "STRING", "message": "string",
  "path": "/api/v1/...", "requestId": null, "fieldErrors": [{ "field": "x", "message": "y" }] }
```

`requestId` é **sempre `null`**: não existe filtro de correlação. `fieldErrors` vem `[]` quando não se aplica.

| HTTP | `code` | Situação | Origem |
|---|---|---|---|
| 400 | `VALIDATION_ERROR` | Bean Validation do corpo, ou `@Size` no path | `GlobalExceptionHandler` |
| 400 | `MALFORMED_REQUEST` | JSON inválido ou corpo ausente | idem |
| 400 | `INVALID_PARAMETER` | tipo inválido (UUID, enum, Instant) | idem |
| 400 | `MISSING_PARAMETER` | `@RequestParam` ou parte obrigatória ausente | idem |
| 401 | `UNAUTHORIZED` | token ausente, inválido ou expirado; login/refresh inválido; usuário INACTIVE/BLOCKED (mensagens "Invalid email or password", "User is inactive", "User is blocked") | entry point / handler |
| 403 | `FORBIDDEN` | role insuficiente; técnico acessando recurso de outro técnico; QR fora de escopo | `@PreAuthorize` e serviços |
| 404 | `*_NOT_FOUND`, `ROUTE_NOT_FOUND` | ver tabela por domínio abaixo | serviços |
| 405 | `METHOD_NOT_ALLOWED` | com header `Allow` | handler |
| 409 | ver abaixo | conflito de estado ou unicidade; `OPTIMISTIC_LOCK_CONFLICT` | serviços |
| 413 | `EVIDENCE_UPLOAD_TOO_LARGE` | arquivo acima do limite | validator / multipart |
| 415 | `EVIDENCE_UNSUPPORTED_MEDIA_TYPE`, `UNSUPPORTED_CONTENT_TYPE` | arquivo não jpeg/png; Content-Type errado | idem |
| 422 | ver abaixo | regra de negócio | `BusinessRuleViolationException` |
| 500 | `INTERNAL_ERROR` | não previsto | catch-all |

**Códigos de negócio por domínio** (lista fechada extraída do código; o doc dizia que não existia, PEND-02):

| Domínio | Código | HTTP |
|---|---|---|
| Users | `USER_NOT_FOUND` | 404 |
| Users | `USER_EMAIL_ALREADY_REGISTERED` | 409 |
| Clients / Sites | `CLIENT_NOT_FOUND`, `SITE_NOT_FOUND` | 404 |
| Equipment | `EQUIPMENT_NOT_FOUND` | 404 |
| Equipment | `QR_CODE_ALREADY_EXISTS` | 409 |
| Templates | `TEMPLATE_NOT_FOUND`, `TEMPLATE_VERSION_NOT_FOUND`, `TEMPLATE_SECTION_NOT_FOUND`, `TEMPLATE_ITEM_NOT_FOUND` | 404 |
| Templates | `TEMPLATE_DRAFT_IN_PROGRESS`, `TEMPLATE_NOT_EDITABLE`, `TEMPLATE_VERSION_NOT_EDITABLE`, `DISPLAY_ORDER_TAKEN`, `CONCURRENT_PUBLISH`, `CONCURRENT_DRAFT` | 409 |
| Templates | `TEMPLATE_NOT_DRAFT`, `TEMPLATE_HAS_NO_SECTIONS`, `TEMPLATE_HAS_NO_ITEMS` | 422 |
| Inspections | `INSPECTION_NOT_FOUND` | 404 |
| Inspections | `TEMPLATE_VERSION_NOT_PUBLISHED`, `USER_NOT_TECHNICIAN`, `TECHNICIAN_NOT_ACTIVE`, `INSPECTION_CANNOT_BE_ASSIGNED`, `INSPECTION_CANNOT_BE_CANCELED`, `INSPECTION_CANNOT_BE_STARTED`, `INSPECTION_CANNOT_BE_SUBMITTED`, `MISSING_REQUIRED_RESPONSES`, `MISSING_OBSERVATION_ON_NON_CONFORMING`, `MISSING_EVIDENCE_ON_NON_CONFORMING`, `INVALID_SORT_FIELD` | 422 |
| Responses | `SNAPSHOT_NOT_FOUND` | 404 |
| Responses | `INSPECTION_RESPONSE_LOCKED` (SUBMITTED, UNDER_REVIEW, APPROVED) | 409 |
| Review | `INSPECTION_CANNOT_BEGIN_REVIEW`, `INSPECTION_NOT_UNDER_REVIEW` | 422 |
| Evidence | `RESPONSE_NOT_FOUND`, `NON_CONFORMITY_NOT_FOUND`, `EVIDENCE_NOT_FOUND` | 404 |
| Evidence | `EVIDENCE_ALREADY_PROCESSED` (reenvio de `idempotencyKey`), `EVIDENCE_READ_ONLY_APPROVED_INSPECTION` | 409 |
| Evidence | `EVIDENCE_EMPTY_FILE`, `EVIDENCE_LOCATION_INCOMPLETE`, `EVIDENCE_UPLOAD_FAILED`, `INVALID_DATE_TIME` | 422 |
| NC | `NON_CONFORMITY_READ_ONLY_APPROVED_INSPECTION` | 409 |
| NC | `NON_CONFORMITY_CRITICAL_REQUIRES_EVIDENCE` (**só no PUT**) | 422 |
| Sync (HTTP) | `SYNC_INVALID_CURSOR` | 422 |
| Sync (por operação, dentro do 200) | `SYNC_INSPECTION_NOT_OWNED`, `SYNC_INVALID_PAYLOAD`, `SYNC_ENTITY_ID_MISMATCH`, `SYNC_UNSUPPORTED_INSPECTION_TRANSITION`, `SYNC_EVIDENCE_NOT_SUPPORTED`, `SYNC_DELETE_NOT_SUPPORTED`, `SYNC_DATA_INTEGRITY_VIOLATION`, mais qualquer código de domínio acima (REJECTED); `SYNC_VERSION_CONFLICT` (CONFLICT) | — |

O exemplo do doc, `INSPECTION_REQUIRED_ITEMS_MISSING`, **não existe**. O código real é `MISSING_REQUIRED_RESPONSES`.

---

## 7. Autenticação e autorização

- **Login:** `POST /auth/login`. Senha errada ou e-mail inexistente dão 401 genérico. Com senha correta, INACTIVE ou BLOCKED dão 401 com mensagem distinta, o que revela o estado da conta (PEND-09 / AC-AUTH; REQUER DECISÃO).
- **Tokens:** access de 900 s e refresh de 604800 s (configuráveis por env), ambos JWT com `token_use` access/refresh. O refresh devolve um par novo. Logout, mudança de status e de senha invalidam todas as sessões via `SessionTokenValidator`. Não há detecção de reuso de refresh token.
- **Role:** vem do claim `role`. `CLIENT_VIEWER` existe no enum, mas não tem permissão em nenhum endpoint.
- **Posse (técnico):** 403 se a inspeção não for dele em start, submit, responses, evidence e NC. O sync responde REJECTED `SYNC_INSPECTION_NOT_OWNED`. ADMIN/SUP não têm restrição. "Escopo do supervisor" não está implementado (PEND-13).
- **Web:** o `authInterceptor` faz um refresh e repete a chamada uma vez; o `authGuard` usa `permissions.ts`. Achados:
  - `logout()` e `/auth/me` não são chamados por nenhuma tela.
  - `returnUrl` não é sanitizado.
  - Há possível laço do `guestGuard` para TECHNICIAN (NÃO CONFIRMADO).
- **Mobile:** refresh em 401 com repetição única. Aceita TECHNICIAN, SUPERVISOR e ADMIN; o doc diz ❌ para ADMIN e SUPERVISOR no mobile. O logout não trata o outbox pendente.

---

## 8. Enums e estados

| Enum | Backend | `shared/` (web e mobile) | Observação |
|---|---|---|---|
| `UserRole` | ADMIN, SUPERVISOR, TECHNICIAN, CLIENT_VIEWER | igual | |
| `UserStatus` | ACTIVE, INACTIVE, BLOCKED | igual | |
| `ClientStatus` / `SiteStatus` | ACTIVE, INACTIVE | `ActiveStatus` | |
| `EquipmentStatus` | ACTIVE, INACTIVE, DECOMMISSIONED | igual | |
| `TemplateStatus` | DRAFT, ACTIVE, INACTIVE | igual | **Nenhum endpoint leva o modelo a INACTIVE** |
| `TemplateVersionStatus` | DRAFT, PUBLISHED | — | Interno; não exposto |
| `ResponseType` | TEXT_SHORT, TEXT_LONG, NUMBER, BOOLEAN, CONFORMITY, SINGLE_CHOICE, DATE | igual | |
| `InspectionPriority` | LOW, MEDIUM, HIGH, CRITICAL | igual | |
| `InspectionStatus` | DRAFT, ASSIGNED, IN_PROGRESS, SUBMITTED, UNDER_REVIEW, APPROVED, REJECTED, CANCELED | igual | |
| `Conformity` | NOT_APPLICABLE, CONFORMING, NON_CONFORMING | igual | Trafega como string |
| `NonConformitySeverity` | LOW, MEDIUM, HIGH, CRITICAL | igual | |
| `NonConformityStatus` | **OPEN, IN_PROGRESS, RESOLVED, DISMISSED** | **só OPEN** | O backend aceita os 4 valores via PATCH; o doc diz só OPEN no MVP (RN-057) → REQUER DECISÃO |
| `ReviewDecision` | APPROVED, REJECTED | igual | |
| `EvidenceType` | PHOTO | igual | |
| `SyncEntityType` | INSPECTION, INSPECTION_RESPONSE, EVIDENCE, NON_CONFORMITY | igual | |
| `SyncOperationType` | UPSERT, DELETE | igual | DELETE sempre REJECTED |
| `SyncOperationStatus` | APPLIED, ALREADY_APPLIED, REJECTED, CONFLICT, DEPENDENCY_FAILED | igual | |

**Máquina de estados de `Inspection`, como implementada:**

| De | Ação | Para | Quem (código) |
|---|---|---|---|
| — | `POST /inspections` | DRAFT (mesmo com `technicianId` obrigatório) | ADMIN, SUP |
| DRAFT | assign | ASSIGNED | ADMIN, SUP |
| DRAFT, ASSIGNED, REJECTED | start | IN_PROGRESS | TECH dono, ADMIN, SUP |
| IN_PROGRESS | submit | SUBMITTED | TECH dono, ADMIN, SUP |
| SUBMITTED | begin-review | UNDER_REVIEW | SUP |
| UNDER_REVIEW | approve / reject | APPROVED / REJECTED | SUP |
| qualquer, exceto APPROVED e SUBMITTED (inclui CANCELED e UNDER_REVIEW) | cancel | CANCELED | ADMIN, SUP |

Modelos: DRAFT → ACTIVE na 1ª publicação. Publicações seguintes criam uma versão nova a partir de uma versão DRAFT, e o modelo continua ACTIVE.

---

## 9. Regras de negócio relevantes para o Frontend

| Regra | Endpoint | Efeito na resposta | O front precisa |
|---|---|---|---|
| RN-001: só ACTIVE faz login | `/auth/login` | 401 | Mensagem única de credencial |
| RN-008: status ou senha invalida sessões | `PATCH /users/{id}/status` | Próximo request do usuário dá 401 | Tratar 401 → login |
| RN-011: QR único | POST/PUT `/equipment` | 409 `QR_CODE_ALREADY_EXISTS` | Erro no campo |
| E-mail único | POST `/users` | 409 | Erro no campo |
| RN-018/019: só o rascunho é editável; publicado é imutável | sections/items | 409 `TEMPLATE_VERSION_NOT_EDITABLE` / `TEMPLATE_NOT_EDITABLE` | Bloquear edição fora de DRAFT |
| `displayOrder` único por nível | sections/items | 409 `DISPLAY_ORDER_TAKEN` | **Enviar `displayOrder` sempre; reordenar sem colisão** |
| RN-015/016: publicar exige seção e item | publish | 422 `TEMPLATE_HAS_NO_*` | Validar antes |
| Rascunho aberto bloqueia publish legado | publish com corpo | 409 `TEMPLATE_DRAFT_IN_PROGRESS` | Usar publish sem corpo |
| RN-025: agendar só em versão publicada | POST `/inspections` | 422 `TEMPLATE_VERSION_NOT_PUBLISHED` | Listar só versões publicadas |
| RN-027: técnico ACTIVE com role TECHNICIAN | create, assign | 422 `USER_NOT_TECHNICIAN` / `TECHNICIAN_NOT_ACTIVE` | Filtrar o combo |
| Assign só em DRAFT | assign | 422 `INSPECTION_CANNOT_BE_ASSIGNED` | **Não há reatribuição** |
| RN-030: cancelar | cancel | 422 em APPROVED e SUBMITTED | Esconder a ação |
| RN-033: iniciar | start | 403 se não for o dono; 422 se o estado for inválido | |
| RN-037/038/039: submeter | submit | 422 `MISSING_REQUIRED_RESPONSES` / `MISSING_OBSERVATION_…` / `MISSING_EVIDENCE_…` | **O front não recebe as flags de obrigatoriedade no snapshot** (§21) |
| RN-043/082: respostas travadas após submit | PUT responses, sync | 409 `INSPECTION_RESPONSE_LOCKED` / REJECTED | Modo somente leitura |
| RN-049/082: evidência e NC somente leitura em APPROVED | evidence, NC | 409 `*_READ_ONLY_APPROVED_INSPECTION` | Modo somente leitura |
| RN-046: evidência jpeg/png ≤10 MB | upload | 415 / 413 | Validar antes de enviar |
| RN-068: idempotência de evidência | upload | 409 `EVIDENCE_ALREADY_PROCESSED` | **Reusar a chave no retry e tratar 409 como sucesso** |
| RN-055: NC CRITICAL exige evidência | **só PUT da NC** | 422 | O create aceita CRITICAL sem evidência (REQUER DECISÃO) |
| RN-063: QR no escopo do técnico | by-qr | 403 | Mensagem "fora do escopo" |
| RN-070/075: sync por operação | push | REJECTED/CONFLICT por item; DEPENDENCY_FAILED para as seguintes da mesma inspeção | Manter na fila e **atualizar `baseVersion` com `entityVersion`** |
| RN-079: só SUPERVISOR revisa | review | 403 para ADMIN | Esconder a ação para ADMIN |
| Reprovação | reject | `reason` obrigatório | `itemsToCorrect` não persiste |

---

## 10. Web: telas

| Tela | Rota | Status | Observação |
|---|---|---|---|
| FE-W01 Login | `/login` | PARCIAL → **COMPLETA contra a API real (INT-011, §27)** | ~~Sem redirecionamento por perfil~~; ~~Mensagem de 401 inadequada~~. Ainda: em modo mock o login não funciona (sem mock de `/auth`) |
| FE-W02 Dashboard | `/dashboard` | COMPLETA (dados) | Atalhos para `/inspections` e `/inspections/new` caem no wildcard |
| FE-W13 Modelos (lista) | `/inspection-templates` | PARCIAL | "Novo modelo" leva a rota inexistente. Sem publicar e sem versões. Filtro sem debounce |
| FE-W15 Construtor | `/inspection-templates/:id/edit` | PARCIAL | Payloads inválidos para o backend real; `subscribe` sem tratamento de erro; reordenação com 2 PUTs não atômicos; sem publicar; "Ver prévia" é link quebrado |
| Infra: shell, menu, logout, toasts | — | FALTANTE | `NotificationService` sem assinante, então nenhum erro é visível |

## 11. Mobile: telas

| Tela | Rota real | Status | Observação |
|---|---|---|---|
| FE-M01 Login | `(public)/login` | COMPLETA* | *Contra o backend real, senha errada vira "erro inesperado" (§19) |
| FE-M02 Início | `(tabs)/inicio` | PARCIAL | Sem pendências nem "Sincronizar agora". Sem cache offline |
| FE-M03 Lista | `(tabs)/inspections` | PARCIAL | Offline mostra erro. Nomes de cliente e local dão 403 no backend real |
| FE-M04 Sincronização | `(tabs)/sync` | **FALTANTE** | |
| FE-M05 Perfil | `(tabs)/perfil` | PARCIAL | Status "ACTIVE" fixo no código. Sem versão do app, `deviceId` e sync |
| FE-M06 Detalhe | `inspections/[id]` | PARCIAL | `itemsToCorrect` nunca chega. Sem mapa e sem atalho para o scanner |
| FE-M07 Iniciar | `.../start` | PARCIAL | Só online, sem outbox `INSPECTION` |
| FE-M08 Checklist | `.../checklist` | PARCIAL | Outbox OK. `baseVersion` fica desatualizado. `SINGLE_CHOICE` não volta. As flags RN-038/039 não chegam |
| FE-M09 Resumo | `.../summary` | PARCIAL | Concluir exige online e sync sem falha. Em mock, bloqueia (sem rota de push) |
| FE-M10 NCs | `.../non-conformities` | PARCIAL | `inspectionItemId` é descartado pelo backend. Sem evidência obrigatória em CRITICAL |
| FE-M11 Scanner | `/scanner` | PARCIAL | Desconectado da inspeção (`expectedEquipmentId` nunca é passado) |
| FE-M12 Captura | `/evidence/capture` | PARCIAL | Sem persistência local |
| FE-M13 Prévia | `/evidence/preview` | PARCIAL | Upload só online. `idempotencyKey` é regerada a cada tentativa |
| FE-M14 Detalhes de sync | `sync/details` | **FALTANTE** | |
| Landing, +not-found | `/`, `*` | NÃO REQUERIDA | |

---

## 12. Matriz Tela × Endpoint (telas existentes)

| Tela | Plat. | Estado | Endpoint | Método | Request | Response | Observação |
|---|---|---|---|---|---|---|---|
| Login | Web | PARCIAL | `/auth/login`, `/auth/refresh` | POST | LoginRequest | LoginResponse | Integrada (só real) |
| Dashboard | Web | COMPLETA | `/dashboard/*` (3) | GET | — | Summary / Count[] | Integrada |
| Modelos | Web | PARCIAL | `/templates` (alias) | GET | filtros | Page | Integrada |
| Construtor | Web | PARCIAL | `/templates/{id}`, `/inspection-templates/{id}`, `.../sections`, `.../items` | GET/PUT/POST | `{title, description}` sem `displayOrder` | Section/Item | **Escritas de seção e item recebem 400 no backend real** |
| Login | Mob | COMPLETA* | `/auth/login`, `/refresh`, `/me` | POST/GET | idem | idem | Código de erro diverge |
| Início, Lista | Mob | PARCIAL | `/mobile/inspections`, `/clients/{id}`, `/sites/{id}` | GET | `page=0&size=100` | Page | 403 nos nomes |
| Detalhe | Mob | PARCIAL | `/mobile/inspections/{id}`, `/clients`, `/sites`, `/equipment/{id}` | GET | — | MobileDetail | 403 nos nomes |
| Iniciar | Mob | PARCIAL | `/inspections/{id}/start` | POST | Start | Inspection | Online |
| Checklist | Mob | PARCIAL | `/mobile/sync/push` (via outbox) | POST | SyncPush (RESPONSE) | results | Ver §19 |
| Resumo | Mob | PARCIAL | `/inspections/{id}/evidence`, push, `/submit` | GET/POST | — | — | Online |
| NCs | Mob | PARCIAL | `/inspections/{id}/non-conformities`, `/non-conformities/{id}` | POST/PUT | `inspectionItemId` | NC | Vínculo perdido |
| Scanner | Mob | PARCIAL | `/equipment/by-qr/{qr}` | GET | — | Equipment | OK |
| Prévia | Mob | PARCIAL | `/inspections/{id}/evidence` | POST multipart | campos §4 | Evidence | OK online |
| Perfil | Mob | PARCIAL | `/auth/logout` | POST | — | 204 | OK |

## 13. Matriz Endpoint × Tela

Está consolidada na coluna "Consumidor" da tabela do §3.

## 14. Telas completas

FE-W02 Dashboard e FE-M01 Login (este com o asterisco de §19).

## 15. Telas parciais

Formato: o que já existe → o que falta → critério para considerar a tela completa.

- **FE-W01 Login.**
  - Existe: formulário, refresh e `restoreSession`.
  - Falta: redirecionar por perfil, mensagem única para credencial inválida, tratar `code: UNAUTHORIZED`, e funcionar em modo mock ou com proxy.
  - Completa quando: o login funcionar em dev, ADMIN e SUP caírem no dashboard e TECHNICIAN receber uma mensagem clara.
- **FE-W13 Modelos.**
  - Falta: FE-W14 (`POST /inspection-templates`), ação publicar (`POST .../publish`), acesso às versões, e trocar `/templates` por `/inspection-templates` (REQUER DECISÃO).
- **FE-W15 Construtor.**
  - Falta: enviar `displayOrder` no POST e o corpo completo no PUT (`TemplateSectionCreateRequest` e `TemplateItemRequest` exigem `title`, `displayOrder` e, no item, `responseType`); tratar erros 409 e 422; publicar; validar opções de `SINGLE_CHOICE`.
  - Completa quando: CRUD e reordenação passarem contra o backend real.
- **FE-M02 / M03 / M06.**
  - Falta: cache local, contador de pendências, e nomes de cliente, local e equipamento sem 403.
  - REQUER DECISÃO: incluir os nomes no `MobileInspectionDetailResponse`/listagem, ou liberar `GET /clients|sites|equipment/{id}` para o técnico com escopo.
- **FE-M07 / M09 / M10 / M13.**
  - Falta: outbox para `INSPECTION`, `NON_CONFORMITY` e upload de evidência (o backend já aceita os dois primeiros no push; evidência é sempre REST, RN-078); reusar `idempotencyKey`; tratar 409 de evidência como sucesso.
- **FE-M08 Checklist.**
  - Falta: atualizar `baseVersion` com o `entityVersion` do push; mostrar REJECTED e CONFLICT; receber `valueChoice` e as flags RN-038/039 (exige mudança no backend; REQUER DECISÃO).
- **FE-M11 Scanner.**
  - Falta: abrir a partir do detalhe com `expectedEquipmentId`.
- **FE-M05 Perfil.**
  - Falta: status real (`/auth/me`), versão do app, `deviceId`, sincronizar, e logout que respeite o outbox (PEND-F02).

## 16. Telas faltantes

| Tela | Plat. | Requisito | Role | Endpoints necessários (existentes?) | Prioridade sugerida | Dependência |
|---|---|---|---|---|---|---|
| Shell, menu, logout, toasts | Web | `interface-admnistrativa-web.md` §14.4, §14.13 | todos | `/auth/logout`, `/auth/me` ✅ | **P0** | — |
| FE-W03 / W04 Usuários | Web | UC / RN-001..008 | ADMIN | `/users*` ✅ | P0 | Shell |
| FE-W05 / W06 Clientes | Web | RN-009, RN-013 | ADMIN (escrita), SUP (leitura) | `/clients*` ✅ | P0 | Shell |
| FE-W07 Locais do cliente | Web | RN-009 | ADMIN, SUP | `/clients/{id}/sites` ✅ (retorna Page) | P1 | W05 |
| FE-W08 / W09 Locais | Web | RN-009 | ADMIN | `/sites*` ✅ | P0 | W05 |
| FE-W10 Equipamentos do local | Web | RN-010 | ADMIN, SUP | `/sites/{id}/equipment` ✅ (Page) | P1 | W08 |
| FE-W11 / W12 Equipamentos | Web | RN-010..012 | ADMIN, SUP | `/equipment*` ✅ | P0 | W08 |
| FE-W14 Novo modelo | Web | UC-04 | ADMIN, SUP | POST `/inspection-templates` ✅ | P0 | — |
| FE-W16 Prévia + Publicar | Web | UC-05, RN-015/020 | ADMIN, SUP | `.../sections` ✅, `.../publish` ✅ | P0 | W15 |
| FE-W17 Versões | Web | RN-020/022 | ADMIN, SUP | `.../versions` ✅, `/inspection-template-versions/{id}` ✅ | P1 | — |
| FE-W18 Inspeções | Web | UC-06, acompanhamento | ADMIN, SUP | GET `/inspections` ✅ (sem `q`) | P0 | — |
| FE-W19 Nova inspeção | Web | UC-06, RN-024..027 | ADMIN, SUP | POST `/inspections` ✅, combos ✅, `active-version` ✅ (não documentado) | P0 | W14/16 |
| FE-W20 Detalhe da inspeção | Web | UC-06 | ADMIN, SUP | GET `/inspections/{id}` ✅ (**sem itens; REQUER DECISÃO**), responses ✅, evidence ✅, NCs ✅, reviews ✅, PUT, assign, cancel ✅ | P0 | — |
| FE-W21 Revisão | Web | UC-16/17, RN-079..085 | SUP | begin-review, approve, reject ✅ | P0 | W20 |
| FE-W22 NCs | Web | RN-052..057 | ADMIN, SUP | GET `/non-conformities` ✅ | P1 | — |
| FE-W23 Auditoria | Web | RN-086, UC-18 | ADMIN, SUP | `/inspections/{id}/history` ✅ (o doc diz que não existe); não há auditoria global | P2 | REQUER DECISÃO (escopo) |
| FE-M04 Sincronização | Mob | `aplicativo-mobile.md` §13.3–13.4 | TECH | push ✅, pull ✅ | **P0** | Outbox completo |
| FE-M14 Detalhes de sync | Mob | idem | TECH | — (dados locais) | P1 | M04 |

Para auditoria, não existe tela no web nem no mobile que consuma `history`.

## 17. Endpoints sem consumidor (nenhuma tela)

- **Users** (6 rotas).
- **Clients:** list, create, update, status e nested.
- **Sites:** list, create, update, status e nested.
- **Equipment:** list, create, update, status e nested.
- **Templates:** create, publish, `active-version`, `versions`, detalhe de versão.
- **Inspections:** list, create, get, update, assign, cancel, history, reviews, begin-review, approve, reject.
- **Responses:** GET e PUT.
- **Evidence:** `GET /evidence/{id}`, `DELETE /evidence/{id}`.
- **NCs:** list, getById, listByInspection, PATCH status.
- **Outros:** `GET /mobile/sync/pull`, `GET /auth/me` e `POST /auth/logout` no web.

## 18. Telas sem backend correspondente

- **FE-M04 / M14:** dependem só de dados locais e do sync, ambos existentes.
- **FE-W23 Auditoria global:** só existe o histórico por inspeção.
- **Indicadores próprios do técnico** (PEND-07): não há endpoint.

## 19. Divergências Front ↔ Back (CONTRACT MISMATCH)

Todas foram confirmadas por leitura cruzada de código. Nenhuma foi executada contra o backend real.

| # | Lado | Divergência | Evidência |
|---|---|---|---|
| F1 | Web → Back | Criar seção ou item sem `displayOrder` → 400 | Diálogo retorna `{title, description}`; `TemplateSectionCreateRequest`/`TemplateItemRequest` têm `@NotNull displayOrder` |
| F2 | Web → Back | Editar seção ou item sem `displayOrder`; reordenar envia só `{displayOrder}` (sem `title`/`responseType`) → 400 | `template-builder.component.ts:526,543-547,573,590-594` |
| F3 | Back → Web | `/clients/{id}/sites`, `/sites/{id}/equipment` e `/…/versions` retornam `Page`; a web espera array | `resources.ts:214,235,268` |
| F4 | Back → Web | `GET /inspections/{id}` retorna `InspectionResponse` plano; a web espera `InspectionDetail` | `InspectionController:82-86` |
| F5 | Back → Web/shared | `createdById` × `createdBy` (Template, Inspection); `publishedById` × `publishedBy`; `templateId` ausente na versão | DTOs × `shared/src/domain/entities.ts` |
| F6 | Back → Mob | Erro de login vem com `code: "UNAUTHORIZED"`; o mobile só reconhece `INVALID_CREDENTIALS`/`USER_INACTIVE`, então senha errada aparece como "erro inesperado" | `session-context.tsx:81-98`, `GlobalExceptionHandler.handleAuthentication` |
| F7 | Back → Mob | `GET /clients/{id}`, `/sites/{id}` e `/equipment/{id}` são ADMIN/SUP; o técnico recebe 403, o erro é engolido e os nomes aparecem como "—" | `@PreAuthorize` × `use-place-names.ts`, `use-inspection-detail.ts` |
| F8 | Back → Mob | `MobileInspectionResponseDto` não tem `valueChoice`; a resposta `SINGLE_CHOICE` enviada via sync não volta no detalhe | DTO × `use-checklist.ts:137-146` |
| F9 | Back → Mob | `ItemSnapshotDto` sem as flags RN-038/039 e `rulesJson` sempre null; a validação local nunca dispara e só o 422 do submit pega | `decisions.md` 2026-09-28 |
| F10 | Mob → Back | NC create envia `inspectionItemId`/`createdAtDevice`; o backend espera `snapshotId` e ignora o resto em silêncio, então o vínculo com o item se perde | `use-non-conformities.ts:66` × `NonConformityCreateRequest` |
| F11 | Back → Mob | Dois DTOs de NC com nomes diferentes (`snapshotId`/`reportedById` × `inspectionItemId`/`createdBy`) | `NonConformityResponse` × `MobileNonConformityDto` |
| F12 | Back → Web/Mob | `itemsToCorrect` aceito no reject, mas não persistido nem retornado | grep sem uso fora do DTO |
| F13 | Mob | `baseVersion` não avança após push → CONFLICT a partir da 3ª edição do mesmo item (SUSPEITA já registrada em `pending-features` BF-007) | `use-checklist.ts:127-134` |
| F14 | Mob | `idempotencyKey` regerada a cada retry anula RN-068 | `evidence-upload.ts` |
| F15 | Mob mock | O mock (padrão ligado) não implementa `/mobile/sync/push`, então a conclusão fica bloqueada em mock | `mock-server.ts` |
| F16 | Web | Sem proxy e sem CORS: em `ng serve` com `mockApi` o login vai para `/api/v1` no próprio dev server. NÃO CONFIRMADO em execução. **→ RESOLVIDO (proxy) em INT-011, 2026-10-05 (§27)** | `angular.json`, ausência de `CorsConfiguration` |
| F17 | Back → Web | *(achado em INT-011)* `POST /auth/refresh` não devolve `user`; após F5 o store web está vazio e o refresh encerrava a sessão. **→ RESOLVIDO em INT-011** (web busca `GET /auth/me`) | `RefreshTokenResponse` × `auth.service.ts` |

## 20. Divergências Documentação ↔ Implementação

| # | Doc | Código | Classificação |
|---|---|---|---|
| D1 | Clientes e locais: escrita só ADMIN (§6.6, `telas-frontend` §14) | ADMIN e SUP | REQUER DECISÃO (a web segue o doc) |
| D2 | start/submit exclusivos do TECHNICIAN (RN-033) | ADMIN e SUP também | REQUER DECISÃO |
| D3 | PUT responses só do TECHNICIAN; RN-006 (admin não altera respostas) | ADMIN e SUP podem | REQUER DECISÃO |
| D4 | Upload de evidência e criação de NC só pelo TECHNICIAN | 3 roles | REQUER DECISÃO |
| D5 | GET `/inspections/{id}`, history e reviews: técnico (própria) permitido | Só ADMIN e SUP | REQUER DECISÃO |
| D6 | Cancelamento com justificativa obrigatória (RN-029); bloqueado só em APPROVED | Motivo opcional; bloqueia também SUBMITTED; permite CANCELED e UNDER_REVIEW | Divergência |
| D7 | PUT `/inspections/{id}` só em DRAFT/ASSIGNED | Sem trava de estado (edita APPROVED, contra RN-082) | DOCUMENTED / NOT IMPLEMENTED |
| D8 | assign também reatribui em ASSIGNED | Só a partir de DRAFT | Divergência (PEND-14) |
| D9 | POST `/inspections` valida local ∈ cliente, equipamento ∈ local, equipamento ativo (RN-012/014) e retorna detalhe com itens | **Nenhuma dessas validações** em `InspectionService.create`; retorna o DTO plano | DOCUMENTED / NOT IMPLEMENTED |
| D10 | NC CRITICAL exige descrição e evidência (RN-055) | Create aceita sem as duas; só o PUT valida | REQUER DECISÃO (evidência precisa do id da NC) |
| D11 | `EquipmentUpdateRequest` sem `qrCode` (imutável) | `qrCode*` editável | Divergência |
| D12 | `/mobile/inspections` com filtros `status`, `priority`, `scheduledFrom/To` | Sem filtros | DOCUMENTED / NOT IMPLEMENTED |
| D13 | Contrato de sync: `entityId` = id da resposta; payload com `inspectionItemId`, `answeredAtDevice`, `valueJson` | `entityId` = snapshot; `inspectionId`, `valueChoice` | REQUER DECISÃO (doc e openapi defasados; mobile segue o código) |
| D14 | `PUT …/responses/{responseId}` e `POST responses:batch` | `{snapshotId}`; batch inexistente | Já registrado no audit |
| D15 | `size` máximo 100 | Sem limite configurado | Divergência leve |
| D16 | `requestId` no corpo de erro | Sempre null | DOCUMENTED / NOT IMPLEMENTED |
| D17 | NC status só OPEN (RN-057) | Enum com 4 valores aceitos via PATCH | REQUER DECISÃO |
| D18 | Erro de exemplo `INSPECTION_REQUIRED_ITEMS_MISSING` | `MISSING_REQUIRED_RESPONSES` | Doc defasado |
| D19 | `telas-frontend` FE-W23: "sem endpoint" | `/inspections/{id}/history` existe | Doc defasado |
| D20 | `GET …/active-version`, `GET /inspections/{id}/non-conformities` | Existem | IMPLEMENTED / NOT DOCUMENTED |
| D21 | Filtros de NC: só `severity`; filtros de modelos: `category`, `status` | Também `inspectionId`/`status` e `title` | IMPLEMENTED / NOT DOCUMENTED |
| D22 | Login não revela o estado da conta | Mensagens distintas para inativo/bloqueado | REQUER DECISÃO |
| D23 | Rotas mobile `(tabs)/index`, `/profile`, `/sync` | `inicio`, `perfil`, sem `sync` | Doc defasado ou tela faltante |
| D24 | Mobile não liberado para ADMIN/SUP (matriz §14) | O app permite | REQUER DECISÃO |
| D25 | `CLAUDE.md` §2: "sem DB local nem outbox no mobile" | Existem SQLite e outbox | Doc interno defasado |
| D26 | `contrato` §3.1 "49 endpoints" | 72 no openapi, 73 no código | Já registrado |

## 21. Gaps de contrato

1. Não há fonte única de tipos: `shared/` usa nomes diferentes dos DTOs Java (F5, F11). Recomenda-se gerar tipos a partir do `openapi.yaml` ou alinhar o `shared`.
2. O `openapi.yaml` não descreve `valueChoice`, `inspectionId` no payload de sync, `active-version` nem `GET …/non-conformities` por inspeção.
3. Não há lista oficial de `code` de erro no doc. Este relatório traz a lista extraída do código (§6).
4. Faltam no contrato: nomes legíveis para o técnico (F7), flags de obrigatoriedade no snapshot (F9), `itemsToCorrect` (F12), formato de `optionsJson` para `SINGLE_CHOICE` (PEND-03).
5. O pull não entrega inspeções novas completas (só status), nem snapshots e evidências.

## 22. Gaps de testes

- **Backend:** 35 arquivos de teste (16 controllers com IT). Não existem testes de:
  - validação de coerência no `POST /inspections` (D9);
  - trava de estado no PUT de inspeção (D7);
  - criação de NC CRITICAL;
  - `itemsToCorrect`.
  O `AuthorizationBoundaryIT` não cobre start/submit por ADMIN.
- **Web:** cerca de 189 casos por grep, não executados. `resources.spec.ts` só testa Templates. Nenhum teste valida os payloads do construtor contra os DTOs, e foi isso que deixou o F1/F2 passar.
- **Mobile:** cerca de 300 casos por grep, não executados. Os testes usam o mock, e o mock diverge do backend em `/auth`, sync e campos (por exemplo, o mock aceita `inspectionItemId`). Falta:
  - teste de `use-checklist` e `use-sync`;
  - teste de contrato contra payloads reais.
- **Transversal:** não há teste de contrato (consumer-driven ou validação contra o openapi) nem e2e com o backend real.

## 23. Recomendações (em ordem)

1. **Decisões pendentes** (registrar em `decisions.md` antes de implementar):
   - D1–D5 e D24 (matriz de roles);
   - D13 (contrato de sync: atualizar o doc para o implementado?);
   - F7 (nomes para o técnico);
   - D10 (NC CRITICAL);
   - F12 (`itemsToCorrect`);
   - prefixo `/templates` × `/inspection-templates`.
2. **Correções de integração baratas:**
   - F1/F2 (web envia o DTO completo);
   - F6 (mapear o 401 de login no mobile, ou o backend devolver `INVALID_CREDENTIALS`);
   - F14 (reusar `idempotencyKey`);
   - F13 (atualizar `baseVersion`);
   - F15 (mock de `/mobile/sync/push`).
3. **Backend:** D9, D7 e D12 (regras não implementadas); F8 e F9 (`valueChoice` e flags no DTO mobile); D16 (`requestId`).
4. **Web:** shell e toasts, e a configuração proxy/CORS antes de qualquer tela nova. Depois, os cadastros (W03–W12), seguidos de inspeções (W18–W21) e da publicação de modelos (W14, W16, W17).
5. **Mobile:** outbox completo (start, submit, NC) e upload com fila, depois FE-M04/M14 e o pull com cache local.
6. **Documentação:** atualizar `contrato-backend-frontend.md` (§3.1, §5.3, §6.6, §11) e o `openapi.yaml`, ou criar o documento novo do §24, e corrigir o `CLAUDE.md` §2 sobre o mobile.

## 24. Proposta de estrutura para `frontend-backend-contract.md`

Já existe `docs/contrato-backend-frontend.md`, que é normativo mas defasado. REQUER DECISÃO: atualizar esse arquivo, ou criar `docs/frontend-backend-contract.md` como contrato "as-implemented" e referenciado por ele. Se for criado, sugiro:

```markdown
# Frontend ↔ Backend Contract (as-implemented, com divergências marcadas)
## 1. Visão geral (base /api/v1, mock vs real, CORS/proxy)
## 2. Authentication (login/refresh/logout/me, TTLs, invalidação de sessão, códigos 401)
## 3. Global Headers (Authorization, Content-Type; ausência de headers customizados)
## 4. Global Error Contract (ErrorResponse + catálogo fechado de `code` por domínio — §6 deste relatório)
## 5. Enums (tabela §8, incluindo divergências NonConformityStatus)
## 6. Endpoints (6.1 Auth · 6.2 Users · 6.3 Clients · 6.4 Sites · 6.5 Equipment · 6.6 Templates/Versions/Builder · 6.7 Inspections · 6.8 Review · 6.9 Responses · 6.10 Mobile · 6.11 Evidence · 6.12 Non-Conformities · 6.13 Sync · 6.14 Dashboard) — cada um: roles, params, request, response, erros, regras
## 7. Request Models (§4)
## 8. Response Models (§5)
## 9. Business Rules (§9, com RN e code)
## 10. HTTP Status Codes (§6)
## 11. Frontend ↔ Endpoint Matrix (§3 coluna Consumidor)
## 12. Screen ↔ Endpoint Matrix (§12)
## 13. Known Gaps (§19–21 com status CONTRACT MISMATCH / REQUIRES DECISION)
## 14. Pending Screens (§16)
```

---

## 25. Tabela executiva de telas

| Tela | Plataforma | Requisito | Status | Endpoints | Principais gaps |
|---|---|---|---|---|---|
| FE-W01 Login | Web | UC-01 | ~~PARCIAL~~ COMPLETA (API real, INT-011) | auth/login, refresh, me | Mock sem `/auth` (pendente) |
| FE-W02 Dashboard | Web | §3.12 | COMPLETA | dashboard ×3 | Atalhos para rotas inexistentes |
| FE-W03/04 Usuários | Web | RN-001..008 | FALTANTE | users ×6 | — |
| FE-W05/06 Clientes | Web | RN-009 | FALTANTE | clients ×5 | — |
| FE-W07 Locais do cliente | Web | RN-009 | FALTANTE | clients/{id}/sites | Page × array |
| FE-W08/09 Locais | Web | RN-009 | FALTANTE | sites ×5 | — |
| FE-W10 Equip. do local | Web | RN-010 | FALTANTE | sites/{id}/equipment | Page × array |
| FE-W11/12 Equipamentos | Web | RN-010..012 | FALTANTE | equipment ×6 | `qrCode` editável (D11) |
| FE-W13 Modelos | Web | UC-04 | PARCIAL | templates list | Sem novo, publicar e versões |
| FE-W14 Novo modelo | Web | UC-04 | FALTANTE | POST inspection-templates | — |
| FE-W15 Construtor | Web | UC-04, RN-018 | PARCIAL | sections, items | **400 nas escritas (F1/F2)** |
| FE-W16 Prévia/Publicar | Web | UC-05 | FALTANTE | sections, publish | — |
| FE-W17 Versões | Web | RN-020 | FALTANTE | versions, version | Page × array; campos (F5) |
| FE-W18 Inspeções | Web | UC-06 | FALTANTE | GET inspections | Sem `q` |
| FE-W19 Nova inspeção | Web | UC-06 | FALTANTE | POST inspections, active-version | D9 sem validação |
| FE-W20 Detalhe | Web | UC-06 | FALTANTE | inspections/{id} + sub-recursos | F4 (sem itens) |
| FE-W21 Revisão | Web | UC-16/17 | FALTANTE | begin-review, approve, reject | `itemsToCorrect` (F12) |
| FE-W22 NCs | Web | RN-052..057 | FALTANTE | GET non-conformities | — |
| FE-W23 Auditoria | Web | RN-086 | FALTANTE | inspections/{id}/history | Escopo REQUER DECISÃO |
| FE-M01 Login | Mobile | UC-01 | COMPLETA* | auth ×4 | F6 |
| FE-M02 Início | Mobile | §13.4 | PARCIAL | mobile/inspections | Sem pendências e sem offline |
| FE-M03 Lista | Mobile | §13.4 | PARCIAL | mobile/inspections, clients, sites | F7; sem offline |
| FE-M04 Sincronização | Mobile | §13.3 | FALTANTE | sync push/pull | — |
| FE-M05 Perfil | Mobile | §13.4 | PARCIAL | auth/logout | Status fixo; outbox no logout |
| FE-M06 Detalhe | Mobile | UC-07 | PARCIAL | mobile/inspections/{id} | F7, F12 |
| FE-M07 Iniciar | Mobile | RN-032..034 | PARCIAL | start | Só online |
| FE-M08 Checklist | Mobile | UC-09 | PARCIAL | sync push | F8, F9, F13 |
| FE-M09 Resumo | Mobile | RN-037..039 | PARCIAL | evidence, push, submit | Só online; F15 |
| FE-M10 NCs | Mobile | RN-052..055 | PARCIAL | NC POST/PUT | F10, D10 |
| FE-M11 Scanner | Mobile | UC-08, RN-063 | PARCIAL | by-qr | Desconectado da inspeção |
| FE-M12 Captura | Mobile | UC-11 | PARCIAL | — | Sem persistência |
| FE-M13 Prévia | Mobile | UC-11, RN-068 | PARCIAL | POST evidence | F14; sem fila |
| FE-M14 Detalhes de sync | Mobile | §13.3 | FALTANTE | — | — |
| Landing / not-found | Mobile | — | NÃO REQUERIDA | — | — |

---

## 26. Critério de qualidade

- Analisados: os 16 controllers, todos os DTOs, enums, handler de erro e segurança.
- Web e mobile analisados pelos agentes e cruzados pelo autor da auditoria nos pontos críticos.
- Nenhum teste, build ou chamada HTTP foi executado: o que depende de execução está marcado como NÃO CONFIRMADO.
- As contagens de testes web e mobile vêm de grep, não de execução.
- Nenhum campo foi inventado: os que não estão nos DTOs aparecem como divergência.

Auditoria de contrato Frontend ↔ Backend concluída.
Mapeamento de telas concluído.
Nenhuma alteração foi realizada no projeto durante a auditoria (`git status` limpo na branch `main`). Este arquivo foi criado depois, a pedido do usuário, para persistir o relatório.

---

## 27. Histórico de integração incremental (TDD)

As seções 1–26 são o retrato de 2026-10-02 e ficam como estão. Cada etapa de integração registra aqui o status anterior, o atual e as evidências. Nas tabelas acima, os itens resolvidos estão marcados com a referência para cá.

Diagnóstico de 2026-10-05, sobre `main` @ `3395823`: desde a auditoria só o mobile mudou em código. A F13 está **mitigada**: `use-checklist.ts` incrementa o `baseVersion` localmente após cada escrita, mas ainda não usa o `entityVersion` devolvido pelo push. O plano incremental aprovado é: 1 login web real → 2 shell (toasts + logout) → 3 construtor F1 → 4 construtor F2 → 5 novo modelo + publicar → 6 mobile F6 → 7 lista de inspeções W18 → …

### INT-011: Login web contra a API real (Etapa 1), 2026-10-05

Branch: `task/int-011-web-login-real-backend`.

| Item | Antes | Depois |
|---|---|---|
| F16 (proxy/CORS) | Nenhuma tela web alcançava a API em dev | `npm run start:api`: configuração `api` (`environment.api.ts`, `mockApi: false`) + `proxy.conf.json` (`/api/v1` → `localhost:8090`). Sem CORS no backend (decisão em `project-state/decisions.md`). A configuração padrão (`npm start`, mock) não muda |
| 401 no login | Exibia o `message` cru do backend, em inglês ("Invalid email or password", "User is inactive") | Mensagem única "E-mail ou senha inválidos." para 401/400 (telas-frontend §7.3); mensagem de rede para status 0; "Não foi possível entrar agora…" para os demais |
| TECHNICIAN no web | Login aceito, `authGuard` negava `/dashboard`, botão preso em "Entrando…", toast invisível | Mensagem "Seu perfil não tem acesso à área administrativa…", sessão local descartada, botão liberado |
| `guestGuard` + TECHNICIAN | Redirecionava `/login` → `/login` (laço) | Libera a tela de login |
| Navegação recusada após login | Botão preso | Botão liberado |
| F17 (novo): F5 | Refresh real sem `user` → `forceLogout` em todo F5 | Quando o refresh não traz `user` e o store está vazio, o web busca `GET /auth/me` (com `skipAuth()` e o token novo explícito) |

**TDD:** 9 testes novos (7 em `login.component.spec`, 1 em `auth.guard.spec`, 2 em `auth.service.spec`; o teste de rede passou de primeira, como caracterização). Todos falharam antes pelo motivo esperado. O teste de 401 existente foi ajustado para o corpo real do backend: antes usava `code: INVALID_CREDENTIALS`, que o backend não emite.

**Validação:**
- Web: `ng test` 201/201 (antes 192), `ng build` (production) e `ng build -c api` OK, `tsc` app e spec OK.
- HTTP real (backend no `:8090` sobre Postgres descartável no `:5499`, usuários do `db/seed.sql`), pelo proxy do `ng serve -c api` no `:4200`:
  - login 200 com `user.role`;
  - `/dashboard/summary` 200 com token e 401 sem token;
  - refresh 200 sem `user`;
  - `/auth/me` com o token renovado 200;
  - senha errada, conta inativa e e-mail inexistente: todos 401 `UNAUTHORIZED`.

**Não validado:**
- A UI no navegador: o MCP `chrome-devtools` não conectou nesta sessão. Fica no roteiro de teste manual do relatório da etapa.

**Achados laterais (registrados, não corrigidos):**
- `db/seed.sql` falha no schema atual (V14): usa `inspection_responses.inspection_item_id`, coluna que não existe mais. Como roda numa transação única, nada é inserido.
- O refresh token antigo continua aceito após ser renovado (sem detecção de reuso, já citado no §7).
- `provideMockSession()` existe, mas não é registrado, então o modo mock continua sem login.
