# Web — Inventário de Telas e Status de Integração

**Data da auditoria original:** 2026-10-14 (inventário histórico; os estados das telas abaixo foram atualizados conforme os incrementos de 2026-11-01)
**Branch atualizada:** `feat/web-admin-lists`
**Validação atual:** consulte as entradas datadas em `progress.md`; não use o resumo executivo histórico abaixo como estado atual.
**Fonte primária:** `docs/telas-frontend.md` §2, `docs/auditoria-frontend-backend.md`, `web/src/app/`

---

## Legenda de Status

- `COMPLETA` — tela implementada e integrada (sem blockers conhecidos)
- `PARCIAL` — componente existe mas divergências de contrato, campos faltantes ou shell ausente
- `AUSENTE` — nenhum componente ou rota correspondente encontrado

---

## Resumo executivo (2026-10-14)

| Status | Contagem | % |
|---|---:|---:|
| COMPLETA | 1 | 4% |
| PARCIAL | 3 | 13% |
| AUSENTE | 19 | 83% |

Raízes dos blockers transversais:

1. **Shell ausente** — não há menu lateral, botão de logout, toasts de sucesso/erro, nem cabeçalho de navegação. Toda tela que não seja Login ou Dashboard fica inacessível sem shell.
2. **6 de 8 serviços HTTP órfãos** — `UsersService`, `ClientsService`, `SitesService`, `EquipmentService`, `InspectionsService` e `NonConformitiesService` existem em `resources.ts` mas nenhuma tela os consome.
3. ~~**`displayOrder` ausente nos payloads do construtor**~~ — **RESOLVIDO 2026-10-14** (WEB-DISPLAYORDER): `addSection()` e `addItem()` agora incluem `displayOrder`. Ver `pending-features.md` WEB-DISPLAYORDER.
4. **URL inconsistente em `resources.ts`** — `list()`/`get()` usam `/templates/{id}`, enquanto `update()`, `createSection()`, `createItem()` usam `/inspection-templates/{id}`. O backend aceita ambos (dual mapping), mas `listVersions()` espera array e recebe `Page`.
5. ~~**Nested endpoints retornam `Page`, não array**~~ — **RESOLVIDO 2026-10-20** (WEB-NESTED-PAGE): `listByClient`, `listBySite` e `listVersions` passaram a devolver `Page<T>` via `api.getPage`; mock alinhado ao envelope. Ver `progress.md`.

---

## Inventário por tela

### FE-W01 — Login (web)

| Campo | Valor |
|---|---|
| Status | **PARCIAL** |
| Rota | `/login` |
| Componente | `web/src/app/features/login/login.component.ts` |
| Backend | `POST /auth/login`, `POST /auth/refresh`, `GET /auth/me` |

Implementado (após INT-011, 2026-10-05):
- Autenticação real via proxy dev (`npm run start:api`).
- Mensagem única para 401/400 ("E-mail ou senha inválidos.").
- Mensagem de rede para status 0; mensagem genérica para os demais erros.
- TECHNICIAN recebe mensagem explicativa e tem sessão local descartada sem laço.
- Identidade após F5 vem de `GET /auth/me` (refresh não traz `user`).

Blockers abertos:
- ~~**WEB-MOCK-AUTH**: com `npm start` (mock), login não funciona — sem mock de `/auth` e `provideMockSession()` não registrado.~~ — **RESOLVIDO 2026-10-14**: `provideCore(useMock)` agora inclui `provideMockSession()` quando `useMock=true`. Ver `pending-features.md` WEB-MOCK-AUTH.
- **D22**: orientação específica para conta inativa pendente de decisão de produto.
- **Shell ausente**: logout não existe.

---

### FE-W02 — Dashboard

| Campo | Valor |
|---|---|
| Status | **COMPLETA** (com ressalva de shell) |
| Rota | `/dashboard` |
| Componente | `web/src/app/features/dashboard/` |
| Backend | `GET /dashboard/summary`, `GET /dashboard/inspections-by-status`, `GET /dashboard/non-conformities-by-severity` |

Os três endpoints de dashboard estão implementados (BF-004) e a tela os consome corretamente. Indicadores: total de inspeções, overdue, por status, NCs por severidade.

Ressalva: sem shell, navegação para outras telas é impossível sem digitar URL direto.

---

### FE-W03 — Usuários — lista

| Campo | Valor |
|---|---|
| Status | **COMPLETA (2026-11-01)** |
| Rota documentada | `/users` |
| Serviço existente | `UsersService` em `resources.ts` (list, get, create, update, setStatus, resetPassword) |

`CatalogListComponent` implementa listagem, filtros, paginação e ações ADMIN para editar, mudar situação com confirmação e solicitar redefinição de senha.

---

### FE-W04 — Usuário — cadastro/edição

| Campo | Valor |
|---|---|
| Status | **COMPLETA (2026-11-01)** |
| Rota documentada | Modal sobre `/users` (PEND-F01 resolvida) |

`UserFormDialogComponent` valida campos do contrato, exige senha com 8–255 caracteres só na criação e não envia senha ao atualizar. A mensagem da redefinição é apresentada como recebida; o mecanismo real permanece pendente em PEND-01.

---

### FE-W05 — Clientes — lista

| Campo | Valor |
|---|---|
| Status | **COMPLETA (2026-11-01)** |
| Rota documentada | `/clients` |
| Serviço existente | `ClientsService` em `resources.ts` |

`ClientsListComponent` lista, filtra e pagina clientes, com edição/status restritos a ADMIN. ADMIN e SUPERVISOR podem abrir os locais do cliente; o contexto é passado para `/sites?clientId=...`.

---

### FE-W06 — Cliente — cadastro/edição

| Campo | Valor |
|---|---|
| Status | **COMPLETA (2026-11-01)** |
| Rota documentada | Modal sobre `/clients` (decisão em `docs/telas-frontend.md`) |

`ClientFormDialogComponent` cria e edita clientes com validação e erros de campo da API.

---

### FE-W07 — Locais de um cliente

| Campo | Valor |
|---|---|
| Status | **AUSENTE** |
| Rota documentada | `/clients/:clientId/sites` |
| Contrato | `GET /clients/{clientId}/sites` → `Page<SiteResponse>` |

Nenhum componente. `ClientsService` não tem método para essa rota nested.

Divergência a resolver ao implementar: `resources.ts` itera response como array — backend retorna `Page`.

---

### FE-W08 — Locais — lista

| Campo | Valor |
|---|---|
| Status | **COMPLETA (2026-11-01)** |
| Rota documentada | `/sites` |
| Serviço existente | `SitesService` em `resources.ts` |

`CatalogListComponent` lista, filtra, pagina, ordena e resolve o nome do cliente. A criação/edição e ativação/inativação ficam disponíveis conforme perfil; a ação contextual abre equipamentos filtrados pelo local.

---

### FE-W09 — Local — cadastro/edição

| Campo | Valor |
|---|---|
| Status | **COMPLETA (2026-11-01)** |
| Rota documentada | Modal sobre `/sites` (decisão em `docs/telas-frontend.md`) |

`SiteFormDialogComponent` valida os campos e mantém o cliente imutável na edição.

---

### FE-W10 — Equipamentos de um local

| Campo | Valor |
|---|---|
| Status | **AUSENTE** |
| Rota documentada | `/sites/:siteId/equipment` |
| Contrato | `GET /sites/{siteId}/equipment` → `Page<EquipmentResponse>` |

Divergência a resolver: idem FE-W07 — iteração direta vs. `Page`.

---

### FE-W11 — Equipamentos — lista

| Campo | Valor |
|---|---|
| Status | **COMPLETA (2026-11-01)** |
| Rota documentada | `/equipment` |
| Serviço existente | `EquipmentService` em `resources.ts` |

`CatalogListComponent` lista, filtra, pagina, ordena, exibe o código QR em fonte monoespaçada e permite buscar por QR; edição e alteração de status exigem o perfil autorizado e confirmação.

---

### FE-W12 — Equipamento — cadastro/edição

| Campo | Valor |
|---|---|
| Status | **COMPLETA (2026-11-01)** |
| Rota documentada | Modal sobre `/equipment` (decisão em `docs/telas-frontend.md`) |

`EquipmentFormDialogComponent` exige local ativo e QR na criação; local e QR permanecem imutáveis na edição.

---

### FE-W13 — Modelos de inspeção — lista

| Campo | Valor |
|---|---|
| Status | **PARCIAL** |
| Rota | `/inspection-templates` |
| Componente | `web/src/app/features/inspection-templates/` |
| Backend | `GET /inspection-templates` (alias `/templates`) |

Implementado: listagem de modelos existe e renderiza.

Blockers:
- Shell ausente: sem menu lateral, não se chega à tela sem digitar URL.
- Botão "Novo modelo" aponta para FE-W14, que não existe.
- `listVersions()` em `TemplatesService` espera array; backend retorna `Page`.

---

### FE-W14 — Novo modelo

| Campo | Valor |
|---|---|
| Status | **AUSENTE** |
| Rota documentada | `/inspection-templates/new` |
| Backend | `POST /inspection-templates` |

Nenhum componente de criação de modelo.

---

### FE-W15 — Editar modelo (construtor)

| Campo | Valor |
|---|---|
| Status | **PARCIAL** |
| Rota | `/inspection-templates/:templateId/edit` |
| Componente | `web/src/app/features/inspection-templates/` (editor/builder) |
| Backend | `GET/PUT /inspection-templates/{id}`, `GET/POST .../sections`, `PUT .../sections/{id}`, `POST .../sections/{id}/items`, `PUT .../items/{id}` |

Implementado: editor visual de seções e itens existe e está roteado.

Blockers:
- ~~**`displayOrder` ausente (F1/F2)**~~ — **RESOLVIDO 2026-10-14** (WEB-DISPLAYORDER): `addSection()` envia `{ ...result, displayOrder: this.sections().length + 1 }` e `addItem()` envia `{ ...result, displayOrder: (section.items ?? []).length + 1 }`. 2 testes RED→GREEN; regressão 203/203 GREEN.
- **Reordenação ainda retorna 400**: `PUT .../sections/{id}` e `PUT .../items/{id}` não incluem todos os campos obrigatórios. Aguarda ciclo de implementação dedicado.
- **Shell ausente**: construtor inacessível sem URL direta.
- Publicar modelo funciona (`POST .../publish` sem corpo).

---

### FE-W16 — Prévia do modelo

| Campo | Valor |
|---|---|
| Status | **AUSENTE** |
| Rota documentada | `/inspection-templates/:templateId/preview` |

Nenhum componente.

---

### FE-W17 — Versões do modelo

| Campo | Valor |
|---|---|
| Status | **AUSENTE** |
| Rota documentada | `/inspection-templates/:templateId/versions` |
| Serviço existente | `TemplatesService.listVersions()` em `resources.ts` |

Serviço existe mas nenhuma tela o consome. Divergência: espera array, recebe `Page`.

---

### FE-W18 — Inspeções — acompanhamento

| Campo | Valor |
|---|---|
| Status | **AUSENTE** |
| Rota documentada | `/inspections` |
| Serviço existente | `InspectionsService` em `resources.ts` (list, get, create, assign, cancel, beginReview, approve, reject) |

Serviço com 10+ métodos existe mas é completamente órfão. Rota ausente de `app.routes.ts`.

Divergência a resolver: `GET /inspections/{id}` retorna `InspectionResponse` (plano); web espera `InspectionDetail` (com respostas e evidências).

---

### FE-W19 — Nova inspeção

| Campo | Valor |
|---|---|
| Status | **AUSENTE** |
| Rota documentada | `/inspections/new` |
| Backend | `POST /inspections` |

Depende de FE-W18 e do shell.

---

### FE-W20 — Detalhe da inspeção

| Campo | Valor |
|---|---|
| Status | **AUSENTE** |
| Rota documentada | `/inspections/:inspectionId` |

Depende de FE-W18.

---

### FE-W21 — Revisão da inspeção

| Campo | Valor |
|---|---|
| Status | **AUSENTE** |
| Rota documentada | `/inspections/:inspectionId/review` |
| Perfil | SUPERVISOR |
| Backend | `POST .../begin-review`, `POST .../approve`, `POST .../reject` |

Nenhum componente de revisão.

---

### FE-W22 — Não conformidades — lista

| Campo | Valor |
|---|---|
| Status | **COMPLETA (2026-11-01)** |
| Rota documentada | `/non-conformities` |
| Serviço existente | `NonConformitiesService` em `resources.ts` |

`CatalogListComponent` apresenta título, descrição, inspeção relacionada resolvida, criticidade, situação e data do dispositivo, com filtro de severidade e paginação. A ação de consulta abre um modal de leitura com NC, item do checklist e evidências. A rota FE-W20 permanece ausente; edição e tratamento completo de NC não pertencem ao MVP desta tela.

---

### FE-W23 — Auditoria

| Campo | Valor |
|---|---|
| Status | **AUSENTE** |
| Rota documentada | `/audit` |

Sem endpoint de backend definido (PEND-08 — escopo futuro). Mantida no inventário pois a rota está mapeada em `interface-admnistrativa-web.md` §14.3.

---

## Mapa de serviços HTTP (`resources.ts`)

| Serviço | Telas consumidoras | Status |
|---|---|---|
| `TemplatesService` | FE-W13 (list), FE-W15 (builder) | PARCIALMENTE CONSUMIDO |
| `DashboardService` | FE-W02 | CONSUMIDO |
| `UsersService` | FE-W03/04 | CONSUMIDO |
| `ClientsService` | FE-W05/06 | CONSUMIDO |
| `SitesService` | FE-W08/09 | CONSUMIDO |
| `EquipmentService` | FE-W11/12 | CONSUMIDO |
| `InspectionsService` | FE-W22 (detalhes relacionados) | CONSUMIDO |
| `NonConformitiesService` | FE-W22 | CONSUMIDO |

---

## Divergências de contrato abertas

| ID | Descrição | Impacto |
|---|---|---|
| ~~F1~~ | ~~`createSection()` não envia `displayOrder` → 400~~ | **RESOLVIDA 2026-10-14** (WEB-DISPLAYORDER) |
| ~~F2~~ | ~~`createItem()` não envia `displayOrder` → 400~~ | **RESOLVIDA 2026-10-14** (WEB-DISPLAYORDER) |
| F13 | `listVersions()` itera array; backend retorna `Page` | FE-W17 quebraria |
| F14 | `GET /clients/{clientId}/sites` retorna `Page`, não array | FE-W07 quebraria |
| F15 | `GET /sites/{siteId}/equipment` retorna `Page`, não array | FE-W10 quebraria |
| F16 | ~~Sem proxy/CORS em dev~~ | **RESOLVIDA** INT-011 (`npm run start:api`) |
| F17 | ~~F5 deslogava (refresh sem `user`)~~ | **RESOLVIDA** INT-011 (`GET /auth/me`) |

---

## Próximos passos recomendados (inventário original de 2026-10-14; supersedido para telas já concluídas)

Em ordem de desbloqueio:

1. **WEB-SHELL** — menu lateral, logout, toasts. Desbloqueia navegação para todas as telas.
2. ~~**WEB-DISPLAYORDER** — incluir `displayOrder` nos payloads do construtor.~~ — **RESOLVIDO 2026-10-14**.
3. ~~**WEB-MOCK-AUTH** — mock de `/auth` para `npm start`.~~ — **RESOLVIDO 2026-10-14**.
4. ~~**FE-W03 + FE-W04** (Usuários)~~ — concluídas em 2026-11-01; ver `progress.md`.
5. **FE-W05–W12** (Clientes, Locais, Equipamentos) — dependem do shell; podem ser feitas em paralelo.
6. **FE-W18–W21** (Inspeções e Revisão) — maior complexidade; dependem de cadastros e shell.
