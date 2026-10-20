# Web — Inventário de Telas e Status de Integração

**Data:** 2026-10-14 (atualizado — auditoria documental)
**Branch analisada:** `main` (HEAD após WEB-MOCK-AUTH + WEB-DISPLAYORDER, não commitados)
**Tipo:** inventário atualizado em 2026-10-14 com base em evidências de código e testes (205/205 web GREEN)
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
| Status | **AUSENTE** |
| Rota documentada | `/users` |
| Serviço existente | `UsersService` em `resources.ts` (list, get, create, update, changeStatus) |

`UsersService` existe e aponta para `/users`. Nenhuma tela ou componente consome esse serviço. Rota ausente de `app.routes.ts`.

---

### FE-W04 — Usuário — cadastro/edição

| Campo | Valor |
|---|---|
| Status | **AUSENTE** |
| Rota documentada | **[A DEFINIR]** (modal sobre `/users` ou rota própria) |

Não existe componente. Depende de FE-W03.

---

### FE-W05 — Clientes — lista

| Campo | Valor |
|---|---|
| Status | **AUSENTE** |
| Rota documentada | `/clients` |
| Serviço existente | `ClientsService` em `resources.ts` |

Nenhum componente. Rota ausente de `app.routes.ts`.

---

### FE-W06 — Cliente — cadastro/edição

| Campo | Valor |
|---|---|
| Status | **AUSENTE** |
| Rota documentada | **[A DEFINIR]** |

Depende de FE-W05.

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
| Status | **AUSENTE** |
| Rota documentada | `/sites` |
| Serviço existente | `SitesService` em `resources.ts` |

Nenhum componente. Rota ausente de `app.routes.ts`.

---

### FE-W09 — Local — cadastro/edição

| Campo | Valor |
|---|---|
| Status | **AUSENTE** |
| Rota documentada | **[A DEFINIR]** |

Depende de FE-W08.

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
| Status | **AUSENTE** |
| Rota documentada | `/equipment` |
| Serviço existente | `EquipmentService` em `resources.ts` |

Nenhum componente. Rota ausente.

---

### FE-W12 — Equipamento — cadastro/edição

| Campo | Valor |
|---|---|
| Status | **AUSENTE** |
| Rota documentada | **[A DEFINIR]** |

Depende de FE-W11.

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
| Status | **AUSENTE** |
| Rota documentada | `/non-conformities` |
| Serviço existente | `NonConformitiesService` em `resources.ts` |

Serviço existe mas nenhum componente o consome. Rota ausente de `app.routes.ts`.

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
| `UsersService` | nenhuma | ÓRFÃO |
| `ClientsService` | nenhuma | ÓRFÃO |
| `SitesService` | nenhuma | ÓRFÃO |
| `EquipmentService` | nenhuma | ÓRFÃO |
| `InspectionsService` | nenhuma | ÓRFÃO |
| `NonConformitiesService` | nenhuma | ÓRFÃO |

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

## Próximos passos recomendados

Em ordem de desbloqueio:

1. **WEB-SHELL** — menu lateral, logout, toasts. Desbloqueia navegação para todas as telas.
2. ~~**WEB-DISPLAYORDER** — incluir `displayOrder` nos payloads do construtor.~~ — **RESOLVIDO 2026-10-14**.
3. ~~**WEB-MOCK-AUTH** — mock de `/auth` para `npm start`.~~ — **RESOLVIDO 2026-10-14**.
4. **FE-W03 + FE-W04** (Usuários) — menor dependência; bom ponto de entrada para cadastros.
5. **FE-W05–W12** (Clientes, Locais, Equipamentos) — dependem do shell; podem ser feitas em paralelo.
6. **FE-W18–W21** (Inspeções e Revisão) — maior complexidade; dependem de cadastros e shell.
