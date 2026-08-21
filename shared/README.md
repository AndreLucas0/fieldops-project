# `shared/` — contrato e dados fictícios

Fonte única do **contrato de dados** e do **conjunto fictício** consumidos pelo
aplicativo (`mobile/`, Expo) e pela interface administrativa (`web/`, Angular).

Não é um pacote publicado nem tem `node_modules` próprio: é código TypeScript
lido diretamente pelos dois projetos.

```
shared/src/
├── domain/     tipos e enums derivados de openapi.yaml
└── mocks/      dados fictícios, banco em memória, paginação e indicadores
```

Regra que vale para tudo aqui: **nada de React, Angular ou API de plataforma.**
Só tipo e função pura — é o que permite os dois lados consumirem o mesmo código.

## Por que existe

Antes, `UserRole` era declarado nos dois projetos e nada garantia que
continuassem iguais. Agora o mesmo gerador, o mesmo checklist e os mesmos
identificadores aparecem no aplicativo e na web — dá para conferir um fluxo de
ponta a ponta nos dois lados.

## Como cada projeto enxerga

Ambos importam por `@fieldops/shared`.

**mobile** (Metro + Jest), em `metro.config.js`:

- `watchFolders` inclui `../shared` — o Metro só observa a própria raiz por
  padrão;
- `resolver.extraNodeModules` aponta `@fieldops/shared` para `../shared/src`;
- no `package.json`, o `moduleNameMapper` do Jest repete o apelido **e** mapeia
  `@babel/runtime` para o `node_modules` do aplicativo: o código compartilhado
  fica fora da raiz e não tem dependências próprias para resolver os helpers.

O aplicativo continua importando o contrato por `@/models`, que reexporta
`@fieldops/shared/domain`. Nenhuma tela precisou mudar.

**web** (Angular + Vitest), em `tsconfig.json`:

- `paths` mapeia `@fieldops/shared` e `@fieldops/shared/*`;
- `tsconfig.app.json` e `tsconfig.spec.json` incluem `../shared/src/**/*.ts`.

O core reexporta o contrato em `core/models/domain.ts`. Ficam de fora de
propósito: `Page`/`PageQuery` (a web tem um modelo próprio com filtros tipados,
usado pelo `ApiService`) e os modelos de erro e sessão, específicos dos
interceptadores.

## O conjunto fictício

`createMockStore(now?)` monta o banco; `getMockStore()` devolve o singleton e
`resetMockStore()` volta ao estado semeado — é o que os testes usam entre casos.

| Entidade | Quantidade |
|---|---|
| Usuários | 3 ativos (ADMIN, SUPERVISOR, TECHNICIAN) + 1 inativo |
| Clientes | 2 — Indústria Alfa (2 locais), Empresa Beta (1 local) |
| Locais | 3 — Planta São Paulo, Filial Campinas, Sede Rio |
| Equipamentos | 4 — GD001, CP002, BM003 ativos; EL004 descomissionado |
| Modelos | 2 — "Inspeção de Segurança" publicada (3 seções, 6 itens) e "Checklist Elétrico" em rascunho |
| Inspeções | 6 — uma em cada estado do ciclo |
| Não conformidades | 3 — LOW, HIGH e CRITICAL |

As datas são relativas a `now`: a inspeção agendada é sempre "amanhã", em
qualquer dia de execução. Os identificadores são UUID v4 fixos, com prefixo por
entidade (`1000…` usuários, `2000…` clientes, `6000…` inspeções), para facilitar
a leitura em log e teste.

O usuário inativo (`inativo@fieldops.local`) está fora da especificação original
do conjunto e é mantido de propósito: é a conta que demonstra a recusa de login
por usuário inativo (RN-001). Senhas aceitas: `FieldOps@2026` ou `fieldops123`.

### O que o conjunto promete cumprir

Todo local pertence a um cliente (RN-009), todo equipamento a um local (RN-010),
o QR é único (RN-011), o local da inspeção é compatível com o equipamento
(RN-014), toda inspeção aponta para uma versão publicada (RN-024), a NC crítica
tem descrição e evidência (RN-055) e a reprovação tem motivo (RN-080).

Isso é **verificado**, não confiado: `mobile/src/services/mock/shared-dataset.test.ts`
tem 33 testes de integridade sobre relacionamentos, formato de UUID, datas ISO e
coerência dos indicadores. Rodam no Jest do mobile porque este pacote não tem
executor próprio; a web consome exatamente os mesmos dados.

## Ligar e desligar

| Projeto | Onde | Padrão |
|---|---|---|
| mobile | `EXPO_PUBLIC_API_MOCK` | `true` |
| web | `environment.mockApi` | `true` em desenvolvimento, `false` em produção |

Na web a troca acontece em `provideResources()`: as telas injetam
`InspectionsService` e não sabem se falam com a API ou com o conjunto fictício.
No mobile o `ApiClient` tem um caminho de código só — ligar o mock não muda nada
nas telas.

## Ao mexer nos dados

Alterar o conjunto quebra testes dos dois lados de propósito — é o sinal de que
alguém dependia daquele valor. Rode os dois antes de commitar:

```bash
cd mobile && npm test      # 302 testes
cd ../web && npm test      # 167 testes
```
