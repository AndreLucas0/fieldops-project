# FieldOps — interface administrativa

Aplicação Angular 21 usada por administradores e supervisores para cadastrar,
agendar, acompanhar e revisar inspeções.

Documentação normativa do produto em `../docs/`; o contrato de dados vive em
`../shared/`.

## Rodar

```bash
npm install     # só na primeira vez, ou após mudar dependências
npm start       # http://localhost:4200 (a raiz redireciona para /dashboard)
```

**Não precisa de backend.** O `ng serve` usa a configuração `development`, que
liga o backend fictício (`environment.mockApi = true`) com os dados de
`../shared/src/mocks` — os mesmos do aplicativo mobile.

Requer Node ≥ 20.19 ou ≥ 22.12. (O Angular 22 exigiria 22.22.3+; por isso o
projeto está no 21.)

## Comandos

```bash
npm test                                   # 167 testes (Vitest)
npm run build                              # produção — mockApi: false
npx ng build --configuration development   # build com o mock ligado
```

## Estrutura

```
src/app/
├── core/               HTTP, sessão, autorização, serviços de domínio e mocks
├── shared/components/  DataTable, StatusBadge, ConfirmDialog, PageHeader…
└── features/
    └── dashboard/      FE-W02 — painel
```

Cada camada tem seu próprio README com as decisões: `core/README.md` e
`shared/components/README.md`.

## Estado das telas

Implementada: **FE-W02 — Painel** (`/dashboard`).

**FE-W01 (login) ainda não existe.** Como o `authGuard` manda ao `/login` quem
não tem sessão, o modo fictício abre uma sessão de supervisor automaticamente
(`core/mocks/mock-session.ts`) para as telas protegidas serem alcançáveis. Esse
andaime sai quando o login entrar.

As demais telas do inventário estão em `../docs/telas-frontend.md` §2.

## Ligar na API real

1. `environment.development.ts`: `mockApi: false`.
2. Aponte `apiBaseUrl` para o backend, ou configure um proxy encaminhando
   `/api/v1` (sem proxy, o CORS da API precisa liberar a origem do `ng serve`).
3. Implemente FE-W01 e remova `provideMockSession()` de `core.providers.ts`.

O `ApiService`, os interceptadores e os guards já estão prontos para isso: a
renovação de token em `401` e a repetição única da requisição original já
funcionam.
