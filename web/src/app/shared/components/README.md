# Shared — componentes de interface

Blocos reutilizáveis das telas administrativas. Sem chamada de API, sem regra
de autorização e sem estado de tela: recebem dados por `input`, devolvem
intenção por `output`.

Fontes normativas: `docs/telas-frontend.md` (§17 rótulos por estado, §10
colunas das listagens) e `docs/contrato-backend-frontend.md` (§5 erros, §9
paginação).

## Biblioteca de componentes

**Angular Material 21** (`@angular/material` + `@angular/cdk`, linha 21.x).

Por quê, e não PrimeNG: o projeto está em Angular 21.2, e a versão atual do
PrimeNG (22.x) exige Angular 22 como peer — adotá-lo obrigaria a antecipar a
atualização do framework. O Material acompanha a mesma linha de versão do
Angular, traz o CDK (overlay, tabela, acessibilidade) e não precisa de
`@angular/animations`, que desde a v19 é dispensável.

A escolha é única e vale para toda a interface: não misturar bibliotecas de
componentes.

O tema (Material 3) fica em `src/styles.scss`; as fontes Roboto e Material
Icons são carregadas em `src/index.html`.

```
shared/components/
├── data-table/          tabela paginada genérica
├── status-badge/        etiqueta de enum → rótulo PT + cor
├── confirm-dialog/      confirmação, com campo obrigatório opcional
├── page-header/         título, trilha e área de ações
├── form-field-error/    fieldErrors do servidor abaixo do campo
├── loading-state/       esqueleto de carregamento
└── empty-state/         ícone + mensagem + ação
```

Importe pelo barril:

```ts
import { DataTableComponent, StatusBadgeComponent, type TableColumn } from '@app/shared/components';
```

## DataTableComponent

Paginação e ordenação são **do servidor** (§9). A tabela não ordena nem filtra
localmente: emite a intenção e volta a renderizar quando a tela entrega a nova
`Page<T>`.

```ts
readonly colunas: TableColumn<Inspection>[] = [
  { field: 'title', label: 'Inspeção', type: 'link', link: (row) => ['/inspections', row.id] },
  { field: 'site.name', label: 'Local' },
  { field: 'status', label: 'Situação', type: 'badge', badgeContext: 'inspection' },
  { field: 'priority', label: 'Prioridade', type: 'badge', badgeContext: 'priority' },
  { field: 'scheduledFor', label: 'Agendada para', type: 'date', sortable: true },
  {
    field: 'actions',
    label: '',
    type: 'actions',
    align: 'end',
    actions: [
      { id: 'open', label: 'Abrir', icon: 'open_in_new' },
      {
        id: 'cancel',
        label: 'Cancelar',
        icon: 'block',
        danger: true,
        visible: () => canWrite('inspections', role()),
        disabled: (row) => row.status === 'APPROVED',
      },
    ],
  },
];
```

```html
<app-data-table
  [columns]="colunas"
  [data]="pagina()"
  [loading]="carregando()"
  [error]="erro()"
  [sort]="ordenacao()"
  [activeFilters]="filtros()"
  emptyTitle="Nenhuma inspeção encontrada"
  emptyActionLabel="Agendar inspeção"
  (pageChange)="buscar($event)"
  (sortChange)="ordenar($event)"
  (filterChange)="aplicarFiltros($event)"
  (rowAction)="executar($event)"
  (emptyAction)="agendar()"
  (retry)="buscar()"
/>
```

Quatro estados, mutuamente exclusivos e nesta precedência:

| Estado     | Quando               | O que aparece                              |
| ---------- | -------------------- | ------------------------------------------ |
| Erro       | `error` preenchido   | mensagem, `requestId` e "Tentar novamente" |
| Carregando | `loading` e sem erro | esqueleto com o número de colunas real     |
| Vazio      | página sem conteúdo  | `EmptyStateComponent` com CTA opcional     |
| Tabela     | há conteúdo          | linhas + paginador                         |

O erro vem antes do carregamento de propósito: uma nova tentativa que falha
não pode deixar o esqueleto girando na tela.

Datas saem em `dd/MM/yyyy HH:mm` (`TABLE_DATE_FORMAT`). `field` aceita caminho
com ponto (`site.name`); caminho inexistente vira travessão em vez de erro.

`filterChange` emite **os filtros que sobraram** — a tabela não sabe montar a
query, só qual etiqueta o usuário removeu.

## StatusBadgeComponent

`status-catalog.ts` é a única tradução de enum da aplicação. Telas não devem
converter estado em texto por conta própria, senão o mesmo valor aparece com
dois nomes.

```html
<app-status-badge [value]="inspection.status" context="inspection" />
```

Contextos: `inspection`, `template`, `user`, `equipment`, `priority`,
`severity`, `conformity`. Valor fora do catálogo aparece cru, em cinza — um
estado novo no backend não quebra a listagem.

Para filtros e resumos há `statusLabel()` e `statusOptions()`.

## ConfirmDialogService

Abra sempre pelo serviço: fechar pelo Esc ou pelo fundo já volta como
`{ confirmed: false }`, então a tela não trata `undefined`.

```ts
this.confirmar
  .open({
    title: 'Reprovar inspeção',
    message: 'O técnico será notificado para corrigir os itens apontados.',
    confirmLabel: 'Reprovar',
    variant: 'danger',
    requiredTextField: { label: 'Motivo da reprovação', minLength: 10 },
  })
  .subscribe((resultado) => {
    if (!resultado.confirmed) return;
    this.api.post(`/inspections/${id}/reject`, { reason: resultado.textValue });
  });
```

O botão confirmar fica bloqueado enquanto o campo obrigatório estiver vazio —
só espaço em branco não conta. Isso espelha `RN-080`/`AC-REVIEW`, onde
`reason` vazio renderia `400` garantido.

## FormFieldErrorComponent

`400`/`422` com `fieldErrors` **não** geram aviso global (§5.2): o erro
pertence ao formulário.

```html
<mat-form-field>
  <mat-label>E-mail</mat-label>
  <input matInput formControlName="email" />
</mat-form-field>
<app-form-field-error field="email" [error]="erro()" />
```

## Pendências

- **Busca textual** — `PEND-15` do core: não há parâmetro de busca no
  contrato, então a tabela não tem campo de busca. Quando for definido, entra
  como mais um `ActiveFilter`.
- **Ordenação por coluna aninhada** — `field` com ponto é enviado como está no
  `sort`; se a API esperar outro nome, a coluna precisará de um `sortField`
  próprio.
