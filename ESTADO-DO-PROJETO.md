# Estado do projeto — 20/10/2026

Documento de retomada: o que existe, como subir o sistema inteiro e o que
decidir a seguir. Escrito para quem senta e precisa continuar sem reconstruir
contexto.

> Substitui a versão de 18/08/2026, que afirmava que a API não existia neste
> repositório — informação que deixou de ser verdade. O histórico está no git.
>
> Este arquivo é a visão **humana** do estado. O contexto operacional detalhado,
> entrada por entrada, vive em `project-state/` (ver §12).

---

## 1. Estado do git

Trabalho desta sessão **não commitado** — 10 arquivos alterados, nenhum novo,
nenhum apagado:

```text
CLAUDE.md                                     divergências corrigidas
README.MD                                     receita de execução real
db/seed.sql                                   alinhado ao schema V14
project-state/progress.md                     2 entradas novas
project-state/pending-features.md             SEED-STALE resolvido
project-state/pending-web.md                  raiz #5 resolvida
web/src/app/core/services/resources.ts        3 contratos corrigidos
web/src/app/core/services/resources.spec.ts   +3 testes
web/src/app/core/mocks/mock-services.ts       mock alinhado ao envelope
web/src/app/core/mocks/mock-services.spec.ts  asserções ajustadas
```

Branch `main`, sincronizada com `origin/main` antes destas alterações.

---

## 2. Instalação

`node_modules/` não vai no git. São três projetos independentes — **não há
workspace**.

```bash
git clone https://github.com/AndreLucas0/fieldops-project.git
cd fieldops-project

cd mobile && npm ci        # Expo SDK 57
cd ../web  && npm ci       # Angular 21.2
# backend: o Maven wrapper baixa as dependências no primeiro build
```

Requisitos: **Java 21** (o `pom.xml` fixa), **Node 20.19+/22.12+/24+** (exigência
do Angular 21), **Docker** com virtualização habilitada.

> Armadilha verificada: `java -version` pode mostrar JRE 8 e ainda assim o
> `./mvnw` funcionar, porque o wrapper honra o `JAVA_HOME`. Não conclua "não
> tenho JDK 21" pelo `java -version`.

---

## 3. O que é cada pasta

| Pasta | O que é | Estado |
|---|---|---|
| `backend/` | API REST — Java 21, Spring Boot 4.1 | 16 controllers, 229 arquivos, suíte verde |
| `web/` | Interface administrativa — Angular 21 + Material | **3 telas de 23** |
| `mobile/` | App do técnico — Expo SDK 57 | fluxo do técnico completo contra o mock |
| `shared/` | Contrato TypeScript consumido pelos dois clientes | em uso |
| `docs/` | Documentação normativa — fonte de verdade dos requisitos | pronta |
| `db/` | `seed.sql` (dados de demonstração) e `schema.sql` (legado) | seed corrigido hoje |
| `project-state/` | Contexto persistente entre sessões | atualizado |

> `db/schema.sql` **não é migração**. O próprio arquivo diz que deveria sair
> quando o Flyway existisse — e o Flyway existe (V1–V14). Continua na raiz.

---

## 4. Backend

Java 21 · Spring Boot 4.1.0 · Spring Data JPA · Security + OAuth2 Resource
Server (JWT) · Flyway · MapStruct · AWS SDK S3.

- Sobe em `http://localhost:8090/api/v1` (context-path configurado).
- Swagger em `/swagger-ui.html`.
- Perfil `local` exige `DB_URL`, `DB_USER` e `DB_PASSWORD` **no ambiente do
  processo** — o Spring **não lê o `.env`**, que serve ao Docker Compose.
  Como configurar: §8 "Backend em dev — variáveis de ambiente".
- Flyway aplica V1–V14 no startup.
- 16 controllers; `TemplateController` tem mapeamento duplo
  (`/templates/*` e `/inspection-templates/*`).

**Validado em 20/10:** `./mvnw test` 50/50 e `./mvnw verify` **292 testes de
integração, BUILD SUCCESS** (Testcontainers, exige Docker).

---

## 5. Aplicativo mobile

```text
mobile/src/
├── models/        reexporta o contrato de shared/src/domain
├── services/      ApiClient, AuthService, backend fictício, outbox SQLite, sync
├── design-system/ tokens e componentes base (paleta escura, toque de 48 px)
├── components/    componentes de domínio (cartão, badge, checklist…)
└── features/      lógica por assunto (auth, inspections, checklist, NCs, sync…)
```

Regra que vale para tudo: **lógica em função pura sempre que possível**, tela só
desenha. Por isso `inspection-filters.ts`, `completion.ts`, `checklist-value.ts`
e `status-catalog.ts` existem separados — são os arquivos com teste denso.

Rotas: landing, login, abas (Início, Inspeções, Sync, Perfil), detalhe da
inspeção, iniciar, checklist, resumo, não conformidades, scanner QR e captura e
prévia de evidência.

**Offline-first:** o outbox SQLite está implementado (`local-db.ts`,
`sync-service.ts`, `features/sync/`). Cobre **apenas `INSPECTION_RESPONSE`** —
transições de inspeção, não conformidades e evidências ainda chamam a API
direto e falham offline. `GET /mobile/sync/pull` não existe.

**373 testes, 31 suítes, verdes.** Todos contra o backend fictício.

---

## 6. Modo mock e credenciais

O backend fictício responde no mesmo formato do contrato, inclusive os erros.
Ligar ou desligar não muda nada nas telas — o `ApiClient` tem um só caminho.

| Variável | Padrão | Efeito |
|---|---|---|
| `EXPO_PUBLIC_API_MOCK` | `true` | backend fictício em memória |
| `EXPO_PUBLIC_API_BASE_URL` | `http://localhost:8090/api/v1` | quando o mock está desligado |
| `environment.mockApi` (web) | `true` em `npm start`, `false` em `npm run start:api` | idem |

Credenciais — senha `FieldOps@2026` para todas as contas, tanto no mock quanto
no seed do Postgres:

| E-mail | Perfil |
|---|---|
| `admin@fieldops.local` | ADMIN |
| `supervisor@fieldops.local` | SUPERVISOR |
| `tecnico@fieldops.local` | TECHNICIAN |
| `tecnico2@fieldops.local` | TECHNICIAN |
| `inativo@fieldops.local` | recusado de propósito (RN-001) |

> No mock do mobile a senha antiga `fieldops123` também é aceita; contra o
> Postgres, só `FieldOps@2026`.

**Atenção ao escrever testes:** a inspeção em andamento do mock já vem com os
três primeiros itens respondidos, e `GER-01` vem não conforme *com* observação.
Zere com `getMockDatabase().responses[id] = []` quando precisar do estado limpo.

---

## 7. Interface administrativa (web)

Angular 21.2 com Angular Material 21 — escolhido porque o PrimeNG 22 exige
Angular 22. O registro está em `web/src/app/shared/components/README.md`.

**Existe:** `core/` (ApiService, interceptadores de auth e erro, guards,
sessão), `shared/components/` (DataTable paginada, StatusBadge, ConfirmDialog,
PageHeader, FormFieldError, LoadingState, EmptyState) e **três telas**:
`login`, `dashboard` e `templates`.

**Não existe:** as outras 19 telas, o shell (menu lateral, logout, toasts,
cabeçalho de navegação) e consumo de 6 dos 8 serviços HTTP, que estão órfãos em
`core/services/resources.ts`.

**208 testes, 18 suítes, verdes.**

---

## 8. Como rodar e verificar

### Sistema completo — receita validada em 20/10

```bash
# 1. infraestrutura
cp .env.example .env
docker compose up -d db evidence-storage     # Postgres 16 + s3mock

# 2. backend — variáveis de ambiente: ver "Backend em dev" logo abaixo
cd backend
set -a; source <(tr -d '\r' < ../.env); set +a
./mvnw spring-boot:run                       # http://localhost:8090/api/v1

# 3. dados de demonstração
docker compose exec -T db psql -U fieldops -d fieldops < db/seed.sql

# 4. web contra a API real
cd web && npm run start:api                  # http://localhost:4200
```

### Backend em dev — variáveis de ambiente (validado em 21/10)

O Spring **não lê o `.env`**: ele alimenta só o Docker Compose. As variáveis
precisam estar no ambiente do processo que roda o `mvnw`. A forma mais simples é
carregar o próprio `.env` da raiz no terminal antes de subir o backend — assim
porta, usuário e senha do banco são sempre os mesmos que o Compose usou.

**Obrigatórias** (perfil `local`, `application-local.yml` — sem elas o startup falha):

| Variável | Valor em dev | Observação |
|---|---|---|
| `SPRING_PROFILES_ACTIVE` | `local` | ativa `application-local.yml` |
| `DB_URL` | `jdbc:postgresql://localhost:<DB_PORT>/fieldops` | `<DB_PORT>` = o `DB_PORT` do seu `.env` (o `.env.example` usa `5432`; vários `.env` locais usam `5433`). Confira com `docker compose ps` |
| `DB_USER` / `DB_PASSWORD` | os do `.env` (`fieldops` / `fieldops` no exemplo) | |

**Opcionais** (têm padrão em `application.yml`): `SERVER_PORT` (8090), `JWT_SECRET`,
`JWT_ACCESS_TOKEN_EXPIRATION_SECONDS`, `JWT_REFRESH_TOKEN_EXPIRATION_SECONDS`,
`CORS_ALLOWED_ORIGINS`, `EVIDENCE_STORAGE_ENDPOINT` (`http://localhost:9000`),
`EVIDENCE_STORAGE_REGION`, `EVIDENCE_STORAGE_BUCKET`, `EVIDENCE_STORAGE_ACCESS_KEY`,
`EVIDENCE_STORAGE_SECRET_KEY`, `EVIDENCE_MAX_UPLOAD_SIZE_BYTES`.

**PowerShell** (a partir de `backend/`; vale para a janela atual do terminal):

```powershell
Get-Content ..\.env | Where-Object { $_ -match '^\s*[A-Za-z_][A-Za-z0-9_]*=' } | ForEach-Object {
  $name, $value = $_ -split '=', 2
  Set-Item -Path "env:$($name.Trim())" -Value $value.Trim()
}
# O PowerShell não expande ${DB_HOST} etc. que o .env usa em DB_URL:
$env:DB_URL = "jdbc:postgresql://$($env:DB_HOST):$($env:DB_PORT)/$($env:DB_NAME)"
# Opcional: o .env restringe o CORS a localhost:4200; sem a variável, o perfil local aceita qualquer origem.
Remove-Item env:CORS_ALLOWED_ORIGINS -ErrorAction SilentlyContinue
.\mvnw.cmd spring-boot:run
```

**Bash / Git Bash** (a partir de `backend/`; `tr` remove o CRLF de um `.env` salvo no Windows):

```bash
set -a; source <(tr -d '\r' < ../.env); set +a   # expande ${DB_HOST}… em DB_URL
unset CORS_ALLOWED_ORIGINS                         # opcional, mesmo motivo acima
./mvnw spring-boot:run
```

**Sem `.env`** (valores literais; troque `5432` pela porta do seu container):

```powershell
$env:SPRING_PROFILES_ACTIVE='local'
$env:DB_URL='jdbc:postgresql://localhost:5432/fieldops'
$env:DB_USER='fieldops'; $env:DB_PASSWORD='fieldops'
.\mvnw.cmd spring-boot:run
```

**Conferir que subiu:** o log mostra `Successfully validated 14 migrations`,
`Tomcat started on port 8090 (http) with context path '/api/v1'` e
`Started FieldopsApplication`. Depois:
`curl http://localhost:8090/api/v1/v3/api-docs` → 200, e login com
`tecnico@fieldops.local` / `FieldOps@2026` (após aplicar o `db/seed.sql`).

**Erros comuns:**
- `Could not resolve placeholder 'DB_URL'` (ou `DB_USER`/`DB_PASSWORD`): as
  variáveis não estão no terminal atual — cada janela nova precisa carregá-las de novo.
- `password authentication failed` / `Connection refused`: porta errada em
  `DB_URL` (5432 × 5433) ou container `db` parado — `docker compose ps`.
- `Port 8090 was already in use`: outro backend rodando — encerre-o ou defina `SERVER_PORT`.
- `java -version` mostrando 1.8 não impede: o `mvnw` usa o `JAVA_HOME` (JDK 21).

### Testes

```bash
cd backend && ./mvnw test      # 50 unitários
cd backend && ./mvnw verify    # + 292 de integração (Testcontainers)
cd web     && npm test         # 208
cd mobile  && npm test         # 373
```

Tudo verde em 20/10/2026.

### Expo Go no celular

**iPhone não funciona.** A App Store está com o Expo Go **54.0.2** (set/2025) e o
projeto é SDK 57, que pede o cliente **57.0.8**. A Expo só publica o cliente iOS
de SDK 57 como build de simulador (exige macOS). Não há caminho a partir do
Windows sem conta paga da Apple.

**Android funciona:** instale o APK
`https://github.com/expo/expo-go-releases/releases/download/Expo-Go-57.0.3/Expo-Go-57.0.3.apk`
e escaneie o QR. Desinstale antes a versão da Play Store (conflito de
assinatura). Rede que bloqueia dispositivos entre si → `npx expo start --tunnel`.

O erro "Failed to resolve the Android SDK path" aparece ao apertar **`a`** no
terminal, que abre em emulador/USB e exige o Android SDK. Para o Expo Go, use o
QR.

---

## 9. Armadilhas conhecidas

**Navegador ≠ aparelho.** A web do mobile serve só para desenvolvimento; o alvo
obrigatório é Android (`docs/visao-geral.md` §1.8). No navegador: seletor de
data cai para campo de texto, câmera/QR não é confiável, Secure Store cai para
memória (**recarregar desloga**) e o GPS depende do navegador.

**Rotas tipadas do Expo.** `.expo/types/router.d.ts` é gerado e às vezes fica
velho. Já custou um bug: o `tsc` sugeriu `/inspections/[id]/index`, que compila e
quebra em runtime. Apague o arquivo e rode `npx expo start` para regerar.

**React Compiler.** `react-hooks/set-state-in-effect` e `react-hooks/refs` são
erro, não aviso. Buscar dados exige o padrão de `use-inspections.ts`.

**Testes com router mockado provam intenção, não navegação.** Conferem que
`router.push` foi chamado com o objeto esperado — se o objeto estiver errado, o
teste concorda com o erro.

**Crase dentro de `styles:` no Angular.** Os estilos ficam num template literal;
uma crase num comentário CSS encerra a string e o erro que aparece é
`NG1001: Decorator argument must be literal`, que não aponta para a causa.

**Código compartilhado fora da raiz.** O Metro precisa de `watchFolders` **e**
`extraNodeModules`; o Jest precisa mapear `@babel/runtime`, senão o Babel
procura os helpers a partir de `shared/`, que não tem `node_modules`.

**Chrome headless não desce abaixo de ~500px de layout.** Capturas com
`--window-size=430` são layouts de 500px recortados — parecem estouro horizontal
e não são. Custou uma caça longa a um bug inexistente; para conferir telas
estreitas de verdade, use um aparelho ou o modo dispositivo do navegador.

**O mock pode validar o contrato errado.** Três endpoints declaravam
`Observable<X[]>` enquanto o backend devolvia `PageResponse`, e o mock devolvia
array — então o teste do mock *confirmava* o engano. Ao criar um método no
`resources.ts`, confira o tipo de retorno no controller Java, não no mock.

**`grep` global por tipo no `seed.sql` é perigoso.** Trocar `NULL::jsonb` por
`NULL::varchar` no arquivo inteiro quebra `template_items.options_json`, que é
legitimamente jsonb. Verifique a coluna de cada ocorrência.

**`node_modules` desatualizado falha de forma enganosa.** Após um `git pull` que
traga dependências novas, a suíte do mobile aborta com
`Cannot find module 'expo-network'` em 31 suítes e **zero testes executados** —
parece quebra de código, é `npm ci` faltando.

---

## 10. Estado da integração

O canal está provado de ponta a ponta; o produto integrado, não.

| Eixo | Situação |
|---|---|
| Backend ↔ Postgres | ✅ Flyway V1–V14, seed completo, escrita persistida e relida |
| Web ↔ Backend — login | ✅ `POST /auth/login` 200 pelo navegador, via proxy |
| Web ↔ Backend — dashboard | ✅ 3 endpoints, números batendo com o banco |
| Web — demais telas | ❌ 19 de 23 não existem |
| **Mobile ↔ Backend real** | ❌ **nunca testado** — o app roda com o mock por padrão |
| Upload de evidência | ❌ o s3mock sobe, mas nenhuma foto passou por ele |
| Sync pull | ❌ `GET /mobile/sync/pull` não implementado |

Validação executada em 20/10, pelo navegador: login com `admin@fieldops.local`,
dashboard com 4 requisições HTTP 200, console sem erros e sem CORS, sessão
sobrevivendo ao reload. Os números exibidos (7 inspeções, 1 por estado; 1 não
conformidade Alta) batem exatamente com o que o seed inseriu.

---

## 11. Pendências e próximos passos

### Ordem recomendada

1. **Mobile contra a API real** (`EXPO_PUBLIC_API_MOCK=false`). Barato e de alto
   retorno: vai revelar descompassos de contrato que o mock esconde — foi
   exatamente assim que os três endpoints paginados apareceram.
2. **Shell do web.** Sem menu, logout e toasts, nenhuma tela nova fica
   alcançável. É o bloqueador de 19 telas.
3. **Telas do web**, começando pelas que já têm serviço pronto e órfão
   (Clientes, Locais, Equipamentos).
4. **CORS** (`CORS-CONFIG`, PENDING). Invisível em desenvolvimento por causa do
   proxy do `ng serve`; em produção, com origens diferentes, bloqueia tudo.
   Agora dá para validar com teste de integração, já que o Docker funciona.
5. **Completar o outbox** — INSPECTION, NON_CONFORMITY e EVIDENCE — e
   implementar `SYNC-PULL`.

### Do contrato — precisam de decisão, não de código

| Marca | Assunto |
|---|---|
| PEND-03 | formato de `optionsJson` do `SINGLE_CHOICE`; provisório em uso: `{ options: [{ value, label }] }` |
| PEND-06 | edição de não conformidade não fechada no MVP; implementada mesmo assim |
| PEND-F03 | GPS obrigatório? equipamento divergente bloqueia? hoje: avisa e deixa seguir |
| — | `itemsToCorrect` é aceito em `/reject` e **não volta** em `InspectionReview` |
| — | `GET /mobile/inspections` devolve só ids; os nomes são buscados um a um (técnico já tem permissão desde 2026-10-20 — TECH-PLACE-READ; resta o N+1) |
| — | evidências não vêm em `InspectionDetail`; buscadas à parte |
| — | escopo de supervisor (RN-005) não implementado |
| — | `PUT /inspections/{id}` sem trava de estado; `POST /inspections` sem validação de coerência |

### Andaime a remover

- `db/schema.sql` — substituído pelas migrações Flyway.

---

## 12. Onde está o resto do contexto

`project-state/` é o contexto persistente, mantido entrada por entrada:

| Arquivo | Para quê |
|---|---|
| `progress.md` | o que já landou, com evidência e validação |
| `pending-features.md` | backlog confirmado do backend |
| `pending-web.md` / `pending-mobile.md` | inventário de telas e status de integração |
| `decisions.md` | decisões técnicas e o porquê |
| `backend-audit.md` | auditoria backend × documentação |

As duas entradas mais recentes, ambas de 20/10, são `SEED-STALE-FIX` (seed
alinhado ao V14 e integração validada) e `WEB-NESTED-PAGE` (contratos aninhados
corrigidos).

### Decisões que explicam o código

| Decisão | Motivo |
|---|---|
| Design system próprio no mobile, não Paper/Gluestack | o app já tinha paleta escura, fontes e componentes em uso |
| Angular Material no web | PrimeNG 22 exige Angular 22 |
| Um só caminho de autenticação no mobile | havia dois; o logout com `POST /auth/logout` forçou a unificação |
| Filtros da lista no cliente | trocar chip não pode custar rede; em campo a conexão é o recurso escasso |
| Descrição de NC obrigatória sempre | o contrato exige em qualquer severidade |
| Debounce de 500 ms no checklist | sem ele, cada tecla vira um PUT |
| Endpoints aninhados expõem `Page<T>` | desembrulhar com `.content` descartaria itens além da primeira página |
