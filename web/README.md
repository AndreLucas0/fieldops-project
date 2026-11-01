# FieldOps — interface administrativa

Aplicação Angular 21 para administradores e supervisores. As regras funcionais
estão em `../docs/`, os contratos REST em `../openapi.yaml` e os tipos de
domínio compartilhados em `../shared/`.

## Executar

```bash
npm start
```

O servidor local usa os mocks por padrão. Para integrar com a API pelo proxy,
use `npm run start:api`. Não é necessário atualizar dependências para começar
a desenvolver as telas.

## Estrutura

```text
src/app/
├── core/                    HTTP, sessão, permissões, serviços e mocks
├── shared/components/       tabela, badges, diálogos e estados reutilizáveis
└── features/
    ├── shell/               navegação autenticada e cabeçalho responsivo
    ├── catalog-list/        usuários, locais, equipamentos e não conformidades
    ├── clients/             lista de clientes
    ├── users/               cadastro/edição de usuários
    ├── feature-placeholder/ demais rotas ainda em preparação
    ├── dashboard/           FE-W02
    ├── login/               FE-W01
    └── templates/           FE-W13 e FE-W15
```

A área autenticada usa um shell compartilhado. Em telas estreitas, a navegação
lateral vira um menu recolhível e as tabelas mantêm a rolagem horizontal dentro
da própria área. As listas de clientes, locais, equipamentos, usuários e não
conformidades estão conectadas aos serviços e mocks existentes, com filtros,
paginação e estados de carregamento, vazio e erro. Clientes, locais,
equipamentos e usuários têm cadastro/edição em modal; equipamentos também
podem ser localizados pelo QR Code. A lista de usuários permite alteração
confirmada de situação e solicitação de redefinição de senha usando a mensagem
retornada pela API, sem assumir entrega ou geração de senha.
Na lista de não conformidades, a consulta abre um modal de leitura que recupera
a inspeção, o item relacionado e as evidências pela API.
As telas administrativas seguem o tema carvão e âmbar do protótipo, mantendo
as tabelas roláveis dentro do próprio contêiner em telas estreitas.

## Regras para implementar telas

- Consulte `../docs/regras-de-negocio.md`, `../docs/telas-frontend.md` e
  `../openapi.yaml` antes de definir filtros, campos e ações.
- Reutilize `core/services/resources.ts`, os modelos em `shared/` e os
  componentes de `shared/components/`; não atualize dependências para criar
  outra camada de UI.
- Respeite `core/auth/permissions.ts` para leitura e escrita. A API continua
  sendo responsável por validar a autorização.
- Use paginação e filtros disponibilizados pelo contrato. Não invente filtros
  nem ações ausentes da API.
- Para ações críticas, peça confirmação; nunca exclua fisicamente registros
  históricos quando a regra exige inativação.
- Preserve estados de carregamento, vazio e erro, valide formulários no cliente
  e apresente erros de campo devolvidos pela API.
- Adapte navegação, formulários e dados tabulares para celular, tablet e desktop.
  A rolagem horizontal, quando inevitável numa tabela, deve ficar restrita à
  própria tabela.

## Verificações disponíveis

```bash
npm test
npm run build
```

O build de produção desliga mocks. Para compilar com o ambiente local de
desenvolvimento, use `npx ng build --configuration development`.
