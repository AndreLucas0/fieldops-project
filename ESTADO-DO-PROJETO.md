# Estado do projeto — 18/08/2026

Documento de retomada: o que existe, como rodar e o que decidir a seguir.
Escrito para quem senta em outra máquina e precisa continuar sem reconstruir
contexto.

---

## 1. Antes de trocar de máquina

**Há trabalho não commitado** — 50 entradas: 36 alterados, 7 apagados (os
antigos `mobile/src/models/*`, que viraram reexportação) e 7 novos, entre eles a
pasta `shared/` inteira e a tela de painel da web.

```bash
git status --short
git add -A
git commit -m "feat: contrato e dados ficticios compartilhados + painel da web"
git push
```

| Item | Estado |
|---|---|
| Branch | `web` |
| Remoto | `github.com/AndreLucas0/fieldops-project` |
| Último commit | `80b43d9 feat: tela QR Code` |
| Commits locais à frente | 0 |

## 2. Instalação na outra máquina

`node_modules/` não vai no git. São **dois** projetos npm; `shared/` não tem
dependências e não se instala.

```bash
git clone https://github.com/AndreLucas0/fieldops-project.git
cd fieldops-project

cd mobile && npm ci        # Expo SDK 57
cd ../web  && npm ci       # Angular 21.2 + Material 21
```

Não é preciso criar `.env`: os dois sobem com o backend fictício ligado.

**Node ≥ 20.19 ou ≥ 22.12.** O Angular 22 exigiria 22.22.3+, por isso o web está
no 21.

## 3. O que é cada pasta

| Pasta | O que é | Estado |
|---|---|---|
| `shared/` | Contrato de dados + conjunto fictício, em TypeScript puro | fonte única dos dois clientes |
| `mobile/` | App do técnico — Expo + React Native | telas do técnico completas; sem sincronização |
| `web/` | Interface administrativa — Angular 21 + Material | core, componentes e o painel (FE-W02) |
| `docs/` | Documentação normativa do produto | pronta, é a fonte de verdade |
| `openapi.yaml` | Contrato REST | pronto, fonte de verdade dos DTOs |
| `db/` | `schema.sql` e `seed.sql` | pronto |
| `atividades/`, `github-kanban/` | material do curso e backlog | intocado |

A API (Java/Spring) **não existe neste repositório** — está sendo feita em
paralelo. Por isso os dois clientes rodam contra um backend fictício.

---

## 4. `shared/` — o que mudou de mais importante

Antes, `UserRole` era declarado no mobile **e** no web, e nada garantia que
continuassem iguais. Agora o contrato e os dados de demonstração vivem num lugar
só:

```
shared/src/
├── domain/     tipos e enums derivados de openapi.yaml
└── mocks/      dados fictícios, banco em memória, paginação e indicadores
```

Nada aqui importa React, Angular ou API de plataforma — só tipo e função pura.

**Como cada projeto enxerga** (detalhe em `shared/README.md`):

- **mobile:** `metro.config.js` declara `watchFolders` e o apelido
  `@fieldops/shared`; o Jest repete o apelido **e** mapeia `@babel/runtime` para
  o `node_modules` do app. `@/models` virou uma linha reexportando o shared —
  nenhuma tela mudou.
- **web:** `paths` no `tsconfig.json` e `../shared/src/**/*.ts` nos `include`.
  O core reexporta em `core/models/domain.ts`.

### O conjunto fictício

| Entidade | Quantidade |
|---|---|
| Usuários | 3 ativos (ADMIN, SUPERVISOR, TECHNICIAN) + 1 inativo |
| Clientes | 2 — Indústria Alfa (2 locais), Empresa Beta (1 local) |
| Locais | 3 — Planta São Paulo, Filial Campinas, Sede Rio |
| Equipamentos | 4 — `GD001`, `CP002`, `BM003` ativos; `EL004` descomissionado |
| Modelos | 2 — "Inspeção de Segurança" publicada (3 seções, 6 itens) e "Checklist Elétrico" em rascunho |
| Inspeções | 6 — uma em cada estado do ciclo |
| Não conformidades | 3 — LOW, HIGH e CRITICAL |

Datas relativas a `now`: a inspeção agendada é sempre "amanhã". Identificadores
são UUID v4 fixos com prefixo por entidade (`1000…` usuários, `6000…`
inspeções).

O que o conjunto promete cumprir (RN-009, 010, 011, 014, 024, 055, 080) é
**verificado**: `mobile/src/services/mock/shared-dataset.test.ts` tem 33 testes
de integridade. Rodam no Jest do mobile porque `shared/` não tem executor
próprio; a web consome os mesmos dados.

> **Ao mexer nos dados, rode os dois projetos.** Quebrar teste dos dois lados é
> o sinal de que alguém dependia daquele valor.

---

## 5. Aplicativo mobile

### Camadas

```
mobile/src/
├── models/        reexporta o contrato de shared/domain
├── services/      ApiClient, AuthService, config e adaptador do mock
├── design-system/ tokens e componentes base (paleta escura, 48px de toque)
├── components/    componentes de domínio (cartão, badge, checklist, progresso…)
└── features/      lógica por assunto (auth, inspections, checklist, NCs, evidência, scanner)
```

Regra que vale para tudo: **lógica em função pura sempre que possível**, tela só
desenha.

### Rotas

```
/                                        landing pública
/login                                   entrada
/inicio          (aba)                   FE-M02 — do dia, atrasadas, em andamento
/inspections     (aba)                   FE-M03 — lista com filtros por chip
/perfil          (aba)                   FE-M05 — dados e sair
/inspections/[id]                        FE-M06 — detalhe, ação conforme o estado
/inspections/[id]/start                  FE-M07 — confirmar início + GPS
/inspections/[id]/checklist              FE-M08 — execução (tela principal)
/inspections/[id]/summary                FE-M09 — resumo e conclusão
/inspections/[id]/non-conformities       FE-M10 — NCs da inspeção
/scanner                                 FE-M11 — leitura de QR (código de exemplo: `GD001`)
/evidence/capture                        FE-M12 — câmera ou galeria
/evidence/preview                        FE-M13 — conferência e envio
```

### O que ainda não existe no mobile

- **FE-M04 — Sincronização.** Não há motor de sync, fila nem banco local. O
  botão "Sincronizar" do início recarrega a lista e simula 2 s. Ver §10.
- Telas de supervisor e qualquer coisa fora do fluxo do técnico.

---

## 6. Modo mock

Ligado por padrão nos dois. Mesmos dados, mesma origem.

| Projeto | Chave | Padrão |
|---|---|---|
| mobile | `EXPO_PUBLIC_API_MOCK` | `true` |
| mobile | `EXPO_PUBLIC_API_BASE_URL` | `http://localhost:8080/api/v1` |
| mobile | `EXPO_PUBLIC_API_MOCK_LATENCY_MS` | `450` |
| web | `environment.mockApi` | `true` em desenvolvimento, `false` em produção |

No mobile o backend fictício responde no formato do contrato, inclusive os
erros: o `ApiClient` tem um caminho de código só. Na web a troca acontece em
`provideResources()` — as telas injetam `InspectionsService` e não sabem a
origem dos dados.

### Credenciais

Senha `FieldOps@2026` **ou** `fieldops123` para qualquer conta:

| E-mail | Perfil |
|---|---|
| `tecnico@fieldops.local` | TECHNICIAN — Carlos Técnico, com as 6 inspeções |
| `supervisor@fieldops.local` | SUPERVISOR — Marina Supervisora |
| `admin@fieldops.local` | ADMIN — Ana Administradora |
| `inativo@fieldops.local` | recusa proposital (RN-001) |

**Atenção ao escrever testes:** a inspeção em andamento já vem com os três
primeiros itens respondidos, e o item `VIS-01` vem não conforme *com* observação
e evidência. Zere com `resetMockStore()` quando precisar do estado em branco.

---

## 7. Interface administrativa (web)

Angular 21.2 com Angular Material 21 (PrimeNG 22 exigiria Angular 22; o registro
do porquê está em `web/src/app/shared/components/README.md`).

```
web/src/app/
├── core/
│   ├── auth/          guards, store de sessão, storage de token
│   ├── http/          ApiService, interceptadores de auth e erro
│   ├── models/        domain.ts (reexporta shared), page, api-error, session
│   ├── mocks/         serviços fictícios + sessão de desenvolvimento
│   └── services/      contratos de domínio + implementações HTTP
├── shared/components/ DataTable, StatusBadge, ConfirmDialog, PageHeader…
└── features/
    └── dashboard/     FE-W02 — painel
```

Detalhe do core em `web/src/app/core/README.md`.

### Serviços de domínio

Oito recursos (usuários, clientes, locais, equipamentos, modelos, inspeções,
NCs, painel). Cada um é uma **classe abstrata** que serve de contrato e de token
de injeção, com duas implementações: HTTP e fictícia. Os mocks recusam o que a
API recusaria — QR duplicado dá 409, equipamento descomissionado em nova
inspeção dá 422, cancelar inspeção aprovada dá 409, reprovar sem motivo dá 422.

### FE-W02 — Painel (`/dashboard`)

Sete cartões numéricos e dois gráficos de barras horizontais, com as três
chamadas em `forkJoin`. Estados de carga e erro com nova tentativa.

Duas decisões de visualização que não são óbvias:

- **Barras, não rosca.** As categorias têm nome longo e a leitura é comparar
  quantidades; barra compara comprimento numa linha de base comum.
- **Todas as barras da mesma cor.** O comprimento já codifica a grandeza e a
  etiqueta já codifica a identidade. A cor reservada de cada estado continua na
  etiqueta ao lado, a mesma das tabelas.

O azul do preenchimento (`#2a78d6`) dá 4,42:1 sobre branco. Os tons `warning` e
`serious` dos cartões ficam abaixo de 3:1 por definição da paleta de estado —
por isso vêm sempre com ícone **e** rótulo coloridos, nunca só a cor.

---

## 8. Como rodar e verificar

```bash
# mobile
cd mobile
npm start                 # Expo; use -c para limpar cache do Metro
npm test                  # 302 testes, 24 suítes
npm run typecheck
npm run lint

# web
cd web
npm start                 # http://localhost:4200 (redireciona para /dashboard)
npm test                  # 167 testes, 13 arquivos
npx ng build              # produção
```

Tudo verde em 18/08/2026.

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

---

## 10. Pendências

### Bloqueante para a entrega

**A §9.9 das regras de negócio (RN-065 a RN-078) não tem implementação.** Não há
SQLite, outbox nem tela FE-M04. Isso arrasta a RN-041 ("salvar localmente cada
alteração confirmada"): o checklist manda cada resposta direto à API e, sem
rede, a resposta se perde.

Cortar sincronização **não é uma opção de escopo**: `criterios-de-aceitacao.md`
§17.19 (AC-RELEASE) exige demonstrar perda de conectividade → conclusão offline
→ retorno → sincronização sem duplicidade. `visao-geral.md` §1.6 põe o trabalho
sem internet no MVP.

Ordem sugerida: persistência local das respostas → outbox com idempotência (a
chave já é gerada em `evidence-upload.ts`) → FE-M04 com contadores reais.

**Correção rápida e independente:** o botão "Sincronizar" do início exibe
"Sincronizado às HH:MM" após uma espera simulada — afirma ao técnico que os
dados foram enviados quando nada foi (RN-072 pede data *e resultado*). Trocar o
rótulo para "Lista atualizada" custa um minuto.

### Andaime a remover

`web/src/app/core/mocks/mock-session.ts` abre sessão de supervisor direto no
store quando `mockApi` está ligado. Existe só porque o `authGuard` manda ao
`/login` e **FE-W01 ainda não foi implementada** — sem isso nenhuma tela
protegida renderiza. Não é caminho de autenticação. Apagar quando FE-W01 entrar.
Note que o mock da web cobre os recursos de domínio, não os endpoints de `/auth`.

### Do contrato — precisam de decisão

| Marca | Assunto |
|---|---|
| **PEND-03** | formato de `optionsJson` do `SINGLE_CHOICE`. Provisório em uso: `{ options: [{ value, label }] }` |
| **PEND-06** | edição de não conformidade não está fechada no MVP; implementada mesmo assim |
| **PEND-F03** | não há regra dizendo se GPS é obrigatório nem se equipamento divergente bloqueia. Hoje: avisa e deixa seguir |
| — | `itemsToCorrect` é aceito em `RejectInspectionRequest` mas **não volta** em `InspectionReview`. O conjunto fictício já envia; leitura tolerante em `inspection-actions.ts` |
| — | `GET /mobile/inspections` devolve só `clientId`/`siteId`; os nomes são buscados um a um (`use-place-names.ts`) |
| — | evidências não vêm em `InspectionDetail`; buscadas à parte |

### Próximos passos naturais

1. **Web: FE-W01 (login)** — destrava todas as telas protegidas e remove o
   andaime.
2. **Web: FE-W18 (lista de inspeções)** — os dois botões do painel já apontam
   para `/inspections/new` e `/inspections?status=SUBMITTED`.
3. **Mobile: persistência local** (ver bloqueante).
4. **Ligar na API real** quando subir: `EXPO_PUBLIC_API_MOCK=false` e
   `environment.mockApi = false`. Os dois clientes já tratam 401 com renovação.
5. **Testar em Android.** Câmera, GPS e seletor de data nativo seguem sem
   verificação em aparelho.

---

## 11. Decisões registradas

| Decisão | Motivo |
|---|---|
| Contrato e mocks em `shared/` | `UserRole` era declarado nos dois lados sem nada garantir que continuassem iguais |
| Mobile reexporta o contrato em `@/models` | preserva o ponto de importação; nenhuma tela mudou |
| Web mantém `Page`/`PageQuery` próprios | o modelo da web tem filtros tipados usados pelo `ApiService`; o envelope é compatível |
| Conta inativa fora da especificação do conjunto | é o que demonstra a recusa de login por usuário inativo (RN-001) |
| Evidência na NC crítica | RN-055 exige descrição *e* evidência; semear sem foto violaria a regra que o app valida |
| Serviços de domínio como classe abstrata | serve de contrato e de token de injeção; a troca mock↔HTTP não toca em componente |
| Ordem `[errorInterceptor, authInterceptor]` | a resposta volta na ordem inversa; o auth precisa ver o 401 antes de virar mensagem |
| Access token só em memória, refresh em `sessionStorage` | `arquitetura.md` §11.10; o F5 é recuperado pelo refresh |
| Guard não redireciona no 403 | mandar para outra rota protegida pode dar laço; avisa e bloqueia |
| Design system próprio no mobile | o app já tinha paleta, fontes e componentes em uso |
| Angular Material no web | PrimeNG 22 exige Angular 22 |
| Filtros da lista no cliente (mobile) | trocar chip não pode custar rede |
| Descrição de NC obrigatória sempre | o contrato exige em qualquer severidade |
| Debounce de 500 ms no checklist | sem ele, cada tecla vira um PUT |

---

## 12. Resumo do que foi feito hoje

1. **`shared/`** — contrato de dados e conjunto fictício como fonte única, com
   banco em memória, paginação, filtros e indicadores derivados.
2. **Mobile ligado ao shared** — `metro.config.js`, mapeamentos de Jest, models
   reexportados, adaptador do backend fictício e 33 testes de integridade do
   conjunto. Os 269 testes que já existiam continuam passando.
3. **Web: tipos de domínio** — `core/models/domain.ts` reexporta o shared;
   `user.model.ts`, que duplicava `UserRole`/`User`, foi apagado.
4. **Web: serviços de domínio** — oito recursos com implementação HTTP e
   fictícia, `provideResources()` escolhendo pelo environment, 36 testes.
5. **Web: FE-W02 (painel)** — cartões, gráficos, `forkJoin`, esqueleto e erro com
   nova tentativa; rota protegida, casca da aplicação e `app.routes.ts`.

Correções de bugs reais no caminho: `@angular/material` declarado mas nunca
instalado (o web não compilava), 401 na requisição já repetida que não encerrava
a sessão, 401 sem refresh token que não fazia logout, e a sobreposição das
fileiras de cartões do painel — essa só apareceu ao abrir a tela no navegador.
