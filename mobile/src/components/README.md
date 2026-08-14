# Components — componentes de domínio do app de campo

Blocos das telas do técnico. Recebem dados por props e devolvem intenção por
callback: não chamam a API, não navegam sozinhos e não guardam estado de tela.

Fontes normativas: `docs/telas-frontend.md` (FE-M03 lista, FE-M08 checklist,
FE-M13 evidências, §17.1 rótulos por estado), `docs/aplicativo-mobile.md` §13.9
(usabilidade em campo) e `openapi.yaml` (formato dos dados).

## Design system

Estes componentes são construídos sobre **`@/design-system`**, o conjunto que já
existe no aplicativo — não sobre React Native Paper nem Gluestack.

O motivo é concreto: o app já tem paleta escura própria ("industrial steel +
safety amber", para leitura sob sol e em galpão), tipografia Archivo/Barlow
carregada no `_layout`, alvo de toque de 48 px para uso com luva (§13.9) e
componentes equivalentes já em uso nas telas de login e início (`Button`,
`Field`, `Panel`, `Text`, `Icon`, `Feedback`). Instalar uma segunda biblioteca
traria um tema Material claro por cima disso, duplicaria botão e campo de texto,
e deixaria o app com duas identidades visuais.

Se a decisão for adotar Paper mesmo assim, o que muda é a camada de
apresentação destes arquivos; a lógica (`checklist-value.ts`,
`status-catalog.ts`, `relative-date.ts`) é independente de biblioteca e
continua valendo.

Única dependência nova: `@react-native-community/datetimepicker` (9.1.0,
incluída no Expo Go do SDK 57), usada pelo `DateField`.

```
components/
├── InspectionCard.tsx          cartão da lista de inspeções
├── StatusBadge.tsx             etiqueta de enum → rótulo PT + cor
├── status-catalog.ts           dicionário único de rótulos e tons
├── ProgressBar.tsx             progresso do checklist
├── ChecklistItemRenderer.tsx   campo conforme o responseType
├── checklist-value.ts          leitura/validação da resposta do item
├── DateField.tsx               seletor de data nativo
├── EvidenceThumbnailGrid.tsx   miniaturas + visualização em tela cheia
├── SectionAccordion.tsx        seção colapsável do checklist
├── StateViews.tsx              LoadingSpinner, EmptyState, ErrorState
└── relative-date.ts            "Hoje, 14:30" e formatos de data
```

## StatusBadge

`status-catalog.ts` é o mesmo mapeamento da interface administrativa
(`web/src/app/shared/components/status-badge/status-catalog.ts`): o mesmo estado
tem o mesmo nome e a mesma cor nas duas pontas. Aqui os tons são recalibrados
para fundo escuro — as cores claras da web ficariam ilegíveis.

Cada contexto é tipado pelo enum correspondente (`Record<InspectionStatus, …>`),
então um valor novo no contrato quebra a compilação em vez de aparecer sem
tradução. Valor desconhecido em tempo de execução aparece cru, em cinza.

O rótulo é sempre texto: §13.9 proíbe comunicar estado só por cor.

## ChecklistItemRenderer

```tsx
<ChecklistItemRenderer
  item={item}
  response={respostaGravada}
  disabled={inspecao.status !== 'IN_PROGRESS'}
  onChange={(valor) => salvar(item, valor)}
/>
```

`onChange` entrega o valor inteiro do item (`ChecklistValue`), pronto para virar
`InspectionResponseUpsertRequest`. O estado é local para o campo responder ao
toque sem esperar a rede, e ressincroniza quando a `version` da resposta muda.

Indicadores: `*` obrigatório, `✓` respondido, `○` pendente.

Para o botão "Concluir", use `isComplete` — mais estrito que `isAnswered`: um
item não conforme cuja regra exige observação continua pendente enquanto o
campo estiver vazio (RN-038), espelhando o `422` do servidor.

## Pontos do contrato tratados aqui

- **Regras do item** — `InspectionItemSnapshot` não tem
  `observationRequiredOnFailure`/`evidenceRequiredOnFailure` como campos
  próprios: no contrato os sinalizadores do `TemplateItem` são copiados para
  `rulesJson` no agendamento. `readChecklistRules` lê de `rulesJson` e também
  aceita os campos na raiz, caso o backend passe a enviá-los assim.
- **PEND-03 — alternativas de `SINGLE_CHOICE`** — formato temporário adotado:
  `{ options: [{ value, label }] }`. Uma lista de textos também é aceita. O
  backend fictício (`services/mock/mock-data.ts`) já emite o formato temporário.
- **Nome de cliente e local** — `GET /mobile/inspections` devolve só `clientId`
  e `siteId`. O `InspectionCard` recebe `clientName`/`siteName` da tela e omite
  a linha quando não vierem, em vez de exibir UUID. Resolver esses nomes na
  lista ainda é uma decisão em aberto (uma chamada por inspeção seria cara).
