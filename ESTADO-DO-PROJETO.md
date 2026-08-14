# Estado do projeto — 14/08/2026

Documento de retomada: o que existe, como rodar e o que decidir a seguir.
Escrito para quem senta em outra máquina e precisa continuar sem reconstruir
contexto.

---

## 1. Antes de trocar de máquina

**Há trabalho não commitado.** O documento não adianta se o código não for
junto.

```bash
git status --short        # 15 entradas pendentes (telas de scanner e evidência)
git add -A
git commit -m "feat: scanner QR e captura de evidencia"
git push
```

Situação no momento em que este documento foi escrito:

| Item | Estado |
|---|---|
| Branch | `web` |
| Remoto | `github.com/AndreLucas0/fieldops-project` |
| Commits locais à frente do remoto | 0 (o que está commitado já foi enviado) |
| Arquivos pendentes | 15 — FE-M11, FE-M12, FE-M13 e ajustes |
| Último commit | `4644255 fix: input ultima data` |

## 2. Instalação na outra máquina

`node_modules/` não vai no git. São dois projetos npm independentes — **não há
workspace**, cada um instala o seu.

```bash
git clone https://github.com/AndreLucas0/fieldops-project.git
cd fieldops-project

cd mobile && npm ci        # Expo SDK 57
cd ../web  && npm ci       # Angular 21.2
```

Não é preciso criar `.env`. O aplicativo sobe com o backend fictício ligado por
padrão (ver §5).

## 3. O que é cada pasta

| Pasta | O que é | Estado |
|---|---|---|
| `mobile/` | App do técnico — Expo + React Native | telas do técnico completas |
| `web/` | Interface administrativa — Angular 21 + Material | só componentes compartilhados |
| `docs/` | Documentação normativa do produto | pronta, é a fonte de verdade |
| `openapi.yaml` | Contrato REST | pronto, fonte de verdade dos DTOs |
| `db/` | `schema.sql` e `seed.sql` | pronto |
| `atividades/`, `github-kanban/` | material do curso e backlog | intocado |

A API (Java/Spring) **não existe neste repositório** — está sendo feita em
paralelo. Por isso o app roda contra um backend fictício.

---

## 4. Aplicativo mobile

### Camadas

```
mobile/src/
├── models/        contrato em TypeScript, derivado de openapi.yaml
├── services/      ApiClient, AuthService, config e backend fictício
├── design-system/ tokens e componentes base (paleta escura, fontes, 48px de toque)
├── components/    componentes de domínio (cartão, badge, checklist, progresso…)
└── features/      lógica por assunto (auth, inspections, checklist, NCs, evidência, scanner)
```

A regra que vale para tudo: **lógica em função pura sempre que possível**, tela
só desenha. É por isso que `inspection-filters.ts`, `completion.ts`,
`checklist-value.ts` e `status-catalog.ts` existem separados — são os arquivos
com teste denso.

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
/scanner                                 FE-M11 — leitura de QR
/evidence/capture                        FE-M12 — câmera ou galeria
/evidence/preview                        FE-M13 — conferência e envio
```

O cabeçalho nativo (título + voltar) é configurado uma vez em
`app/(protected)/_layout.tsx`, para todas as telas empilhadas. O grupo de abas
é a exceção.

### O que ainda não existe no mobile

- **FE-M04 — Sincronização.** Não há motor de sync, fila nem banco local: toda
  chamada vai direto à API. O botão "Sincronizar" do início recarrega a lista e
  simula 2 s de espera, só para o fluxo da tela já existir.
- Telas de supervisor e qualquer coisa fora do fluxo do técnico.

---

## 5. Backend fictício (modo mock)

Fica em `mobile/src/services/mock/`. Responde no mesmo formato do contrato,
inclusive os erros, com latência simulada. Ligar ou desligar não muda nada nas
telas — o `ApiClient` tem um só caminho de código.

| Variável | Padrão | Efeito |
|---|---|---|
| `EXPO_PUBLIC_API_MOCK` | `true` | backend fictício em memória |
| `EXPO_PUBLIC_API_BASE_URL` | `http://localhost:8080/api/v1` | usado quando o mock está desligado |
| `EXPO_PUBLIC_API_MOCK_LATENCY_MS` | `450` | latência simulada |

### Credenciais

Senha `FieldOps@2026` **ou** `fieldops123` para qualquer conta:

| E-mail | Perfil |
|---|---|
| `tecnico@fieldops.local` | TECHNICIAN — tem 6 inspeções atribuídas |
| `supervisor@fieldops.local` | SUPERVISOR |
| `admin@fieldops.local` | ADMIN |
| `inativo@fieldops.local` | recusa proposital (RN-001) |

### Dados semeados

1 cliente, 2 locais, 3 equipamentos (QR `FIELDOPS-EQ-0001` a `0003`), 1 versão
de modelo com 2 seções e 7 itens cobrindo os 7 `responseType`, 6 inspeções em
ASSIGNED / IN_PROGRESS / SUBMITTED / UNDER_REVIEW / APPROVED / REJECTED,
respostas parciais, 1 não conformidade e 2 revisões.

**Atenção ao escrever testes:** a inspeção em andamento já vem com os três
primeiros itens respondidos, e o item `GER-01` vem não conforme *com*
observação. Isso derrubou testes meus três vezes. Zere com
`getMockDatabase().responses[id] = []` quando precisar do estado em branco.

---

## 6. Interface administrativa (web)

Angular 21.2 com **Angular Material 21** (escolhido porque PrimeNG 22 exige
Angular 22; o registro do porquê está em
`web/src/app/shared/components/README.md`).

O que existe:

- `core/` — ApiService, interceptadores de auth e erro, guards, sessão.
  **Já existia antes desta sessão.**
- `shared/components/` — DataTable paginada, StatusBadge, ConfirmDialog,
  PageHeader, FormFieldError, LoadingState, EmptyState. **Feito nesta sessão.**

O que **não** existe: nenhuma tela, nenhum mock, e os tipos de domínio
(`Inspection`, `Equipment`, `Client`, enums). O `core/models/` só tem `User`,
`Page<T>` e `ApiError`. A primeira tela de listagem vai esbarrar nisso.

---

## 7. Como rodar e verificar

```bash
# mobile
cd mobile
npm start                 # Expo; use -c para limpar cache do Metro
npm test                  # 269 testes, 23 suítes
npm run typecheck
npm run lint

# web
cd web
npm start                 # ng serve
npm test                  # 119 testes, 11 suítes
npx ng build --configuration development
```

Tudo verde no momento em que este documento foi escrito.

---

## 8. Armadilhas conhecidas

**Navegador ≠ aparelho.** A web serve só para desenvolvimento; o alvo
obrigatório é Android (`docs/visao-geral.md` §1.8). No navegador:

| Recurso | Comportamento na web |
|---|---|
| Seletor de data | o módulo nativo não suporta web — há um campo `dd/mm/aaaa` no lugar |
| Câmera e QR | não confiável — há busca por código digitado e escolha por galeria |
| Secure Store | cai para memória: **recarregar a página desloga** |
| GPS | depende do navegador; a falta dele nunca bloqueia o fluxo |

**Rotas tipadas.** `.expo/types/router.d.ts` é gerado e às vezes fica velho ou
corrompido. Já custou um bug: o `tsc` sugeriu `/inspections/[id]/index`, que
compila e quebra em runtime. Se a navegação apontar para uma rota estranha,
apague o arquivo e rode `npx expo start` para regerar.

**Regras de lint do React Compiler.** `react-hooks/set-state-in-effect` e
`react-hooks/refs` são erro, não aviso. Buscar dados exige o padrão que já está
em `use-inspections.ts`: função assíncrona *dentro* do efeito, com bandeira de
cancelamento, e recarga por token de estado.

**Testes com router mockado provam intenção, não navegação.** Eles conferem que
`router.push` foi chamado com o objeto esperado — se o objeto estiver errado, o
teste concorda com o erro. Só o app rodando pega isso.

---

## 9. Decisões tomadas nesta sessão

| Decisão | Motivo |
|---|---|
| Design system próprio no mobile, não Paper/Gluestack | o app já tinha paleta escura, fontes e componentes em uso; uma segunda biblioteca traria tema claro e botão duplicado |
| Angular Material no web | PrimeNG 22 exige Angular 22 |
| Um só caminho de autenticação | havia dois (contexto antigo + serviço novo); o "Sair" com `POST /auth/logout` forçou a unificação |
| Cabeçalho nativo fora das abas | dá voltar e título sem repetir botão em cada tela |
| Filtros da lista no cliente | trocar chip não pode custar rede; em campo a conexão é o recurso escasso |
| Descrição de NC obrigatória sempre | o contrato exige em qualquer severidade — a regra "só em CRITICAL" geraria 400 garantido |
| Debounce de 500 ms no checklist | sem ele, cada tecla vira um PUT |
| Rótulo curto "Reprovada" | o do documento ("Reprovada — requer correção") não cabe na célula |

---

## 10. Pendências

### Do contrato — precisam de decisão antes de virar código

| Marca | Assunto |
|---|---|
| **PEND-03** | formato de `optionsJson` do `SINGLE_CHOICE`. Formato provisório em uso: `{ options: [{ value, label }] }`, no app e no mock |
| **PEND-06** | edição de não conformidade não está fechada no MVP; implementada mesmo assim |
| **PEND-F03** | não há regra dizendo se GPS é obrigatório, nem se equipamento divergente bloqueia. Hoje: avisa e deixa seguir |
| — | `itemsToCorrect` é aceito em `RejectInspectionRequest` mas **não volta** em `InspectionReview`. Leitura tolerante em `inspection-actions.ts`; enquanto o servidor não enviar, "Corrigir" abre sem destaque |
| — | `GET /mobile/inspections` devolve só `clientId`/`siteId`. Hoje os nomes são buscados um a um (`use-place-names.ts`). O certo é o envelope trazer os nomes |
| — | evidências não vêm em `InspectionDetail`; buscadas à parte em `use-evidences.ts` |

### De produto — próximos passos naturais

1. **Web: tipos de domínio + primeira tela.** É o maior buraco. Portar enums e
   entidades de `mobile/src/models/` para o `core/` do Angular.
2. **Mobile: FE-M04** ou decidir que sincronização não entra no MVP.
3. **Ligar na API real** quando ela subir: `EXPO_PUBLIC_API_MOCK=false`. O
   `ApiClient` já trata 401 com renovação e repetição.
4. **Testar em Android.** Nada foi rodado em aparelho nesta sessão — câmera,
   GPS e seletor de data nativo estão sem verificação prática.

---

## 11. Resumo do que foi feito hoje

Em ordem:

1. **Mobile — camada de dados.** `models/` (contrato em TypeScript), `services/`
   (ApiClient com renovação de token, AuthService reativo, backend fictício).
2. **Web — componentes compartilhados.** Os sete pedidos, com Material 21.
3. **Mobile — componentes de domínio.** Cartão de inspeção, badge, barra de
   progresso, renderizador de item do checklist, grade de evidências, acordeão,
   estados padrão.
4. **Mobile — telas do técnico.** FE-M02, M03, M05, M06, M07, M08, M09, M10,
   M11, M12, M13, mais a unificação da autenticação e o cabeçalho de navegação.

Correções de bugs reais no caminho: rota com `/index` que quebrava em runtime,
"ir para pendências" que não abria a seção, campo de data inerte no navegador,
e ausência de botão de voltar.
