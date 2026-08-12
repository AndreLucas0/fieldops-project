# FieldOps — Aplicativo Mobile (Expo)

Aplicativo do técnico de campo. Porte para Expo / React Native do protótipo web
criado no Lovable (`task-inspector-hub`), seguindo a arquitetura definida em
[`docs/aplicativo-mobile.md`](../docs/aplicativo-mobile.md) e
[`docs/arquitetura.md`](../docs/arquitetura.md).

## Executar

```bash
cd mobile
npm install
cp .env.example .env
npm start          # abre o Metro; leia o QR Code com o app Expo Go
```

Outros comandos:

```bash
npm run android    # abre direto no emulador/dispositivo Android
npm run typecheck  # tsc --noEmit
npm run lint       # eslint
npm test           # jest
```

Android é a plataforma de validação obrigatória do MVP (docs/visao-geral.md §1.8).

> Se alterar `babel.config.js`, reinicie o Metro limpando o cache:
> `npx expo start -c`. Sem isso o bundler reaproveita a transformação antiga.

## Como navegar no app

O fluxo começa deslogado:

```
/ (landing)  →  "Começar agora"  →  /login  →  "Entrar"  →  /inicio
```

Qualquer e-mail e uma senha de 6+ caracteres entram — a autenticação ainda é
simulada. A partir de `/inicio` a navegação é pela barra de abas inferior
(**Início · Modelos · Histórico**) e pelos botões das telas:

| Para chegar em | Caminho |
|---|---|
| Executar um checklist | Início → cartão em "Em andamento" |
| Criar inspeção | Início → "Nova inspeção" → escolher modelo → "Iniciar" |
| Ver itens de um modelo | Aba Modelos → tocar no modelo |
| Criar modelo | Aba Modelos → "Novo" |
| Inspeções finalizadas | Aba Histórico |
| Sair | Ícone no canto superior direito |

## Testes

```bash
npm test
```

- `src/domain/inspection.test.ts` — regras de conclusão do checklist
  (RN-037 a RN-040): progresso, índice de conformidade e os bloqueios que
  impedem concluir.
- `__tests__/screens.test.tsx` — renderização das nove telas com os providers
  reais. É o teste que pega tela em branco: um erro em tempo de render vira
  falha de suíte em vez de um app mudo no dispositivo.

Os arquivos de teste ficam **fora** de `app/`, porque no Expo Router todo
arquivo dentro de `app/` é registrado como rota.

## Stack

| Camada | Escolha |
|---|---|
| Navegação | Expo Router (rotas por arquivo, grupos `(public)` / `(protected)`) |
| Dados remotos | TanStack Query |
| Sessão | Context + `expo-secure-store` |
| Estilo | Design system próprio com `StyleSheet` e tokens |
| Ícones | `lucide-react-native` |
| Tipografia | Barlow (texto) + Archivo (títulos), via `@expo-google-fonts` |
| Câmera | `expo-image-picker` |

Não usamos NativeWind: o design system em `StyleSheet` evita uma etapa de build
extra e é o que a documentação já previa (`src/design-system/`).

## Estrutura

```
app/                              # rotas — Expo Router
├── _layout.tsx                   # fontes, providers, QueryClient
├── index.tsx                     # landing
├── (public)/login.tsx
└── (protected)/
    ├── _layout.tsx               # guarda de rota
    ├── (tabs)/                   # início, modelos, histórico
    ├── modelos/{novo,[templateId]}.tsx
    └── inspecoes/{nova,[inspectionId]}.tsx

src/
├── design-system/                # tokens + componentes visuais
├── domain/                       # tipos e regras puras (inspection.ts)
├── features/
│   ├── auth/                     # sessão
│   └── checklist/                # renderizador dinâmico de item
├── components/                   # componentes compartilhados
├── hooks/                        # acesso a dados via TanStack Query
└── infrastructure/
    ├── repositories/             # repositório + dados de demonstração
    ├── storage/                  # sessão em armazenamento seguro
    └── ids.ts                    # UUID gerado no dispositivo
```

## Telas portadas do protótipo

| Protótipo (TanStack Router) | Aqui (Expo Router) |
|---|---|
| `routes/index.tsx` | `app/index.tsx` |
| `routes/auth.tsx` | `app/(public)/login.tsx` |
| `_authenticated/inicio.tsx` | `app/(protected)/(tabs)/inicio.tsx` |
| `_authenticated/modelos.index.tsx` | `app/(protected)/(tabs)/modelos.tsx` |
| `_authenticated/modelos.novo.tsx` | `app/(protected)/modelos/novo.tsx` |
| `_authenticated/modelos.$id.tsx` | `app/(protected)/modelos/[templateId].tsx` |
| `_authenticated/inspecoes.nova.tsx` | `app/(protected)/inspecoes/nova.tsx` |
| `_authenticated/inspecoes.$id.tsx` | `app/(protected)/inspecoes/[inspectionId].tsx` |
| `_authenticated/historico.tsx` | `app/(protected)/(tabs)/historico.tsx` |
| `components/MobileShell.tsx` | `src/design-system/components/Screen.tsx` + Tabs |

## O que mudou em relação ao protótipo

**Supabase saiu por completo.** Não há `@supabase/supabase-js` nem chamadas ao
Lovable Cloud. Os dados vêm de `inspectionRepository`, uma implementação em
memória por trás de uma interface. Quando a API Spring Boot entrar, basta uma
nova implementação da mesma interface — nenhuma tela muda.

**A paleta foi convertida.** O protótipo define as cores em `oklch()`, que o
React Native não interpreta; cada token foi convertido para o hex sRGB
equivalente em `src/design-system/tokens.ts`. O visual "industrial steel +
safety amber" é o mesmo, incluindo o painel com degradê e a faixa listrada
âmbar (`hazard-line`).

**O domínio passou a ser o do FieldOps.** O protótipo tinha um único tipo de
item e três respostas (`ok` / `nok` / `na`). Aqui valem os nomes de
`docs/modelo-de-dados.md` e os sete tipos de resposta de §13.5 — `TEXT_SHORT`,
`TEXT_LONG`, `NUMBER`, `BOOLEAN`, `CONFORMITY`, `SINGLE_CHOICE` e `DATE` — com
o renderizador dinâmico em `src/features/checklist/`. Tipo desconhecido não
quebra a tela: o item aparece com aviso de incompatibilidade.

**As regras de conclusão foram implementadas.** `summarize()` calcula o
progresso sobre os itens aplicáveis (RN-040) e devolve os impedimentos de
conclusão: obrigatório sem resposta (RN-037), não conformidade sem observação
(RN-038) e sem evidência (RN-039). A tela lista qual item impede, em vez de só
contar pendências.

**Cadastro e login social saíram.** No FieldOps o usuário é criado pelo
administrador na interface web (docs §8.2); o app só faz login.

## Por que existe um `babel.config.js`

O `expo-router` depende de `react-native-reanimated`, e a versão 4 do
reanimated compila suas animações através de `react-native-worklets` — que
exige um plugin Babel. O `babel-preset-expo` **não** registra esse plugin
sozinho, e sem ele os worklets não são transformados: o bundle é gerado sem
erro, mas o app abre em tela branca.

O arquivo existe só para isso. Como ele referencia `babel-preset-expo` pelo
nome, o preset precisou virar `devDependency` explícita.

## Limitações conhecidas

Estas são deliberadas — pertencem a sprints posteriores do roadmap:

- **Sem persistência local real.** O repositório é em memória: fechar o app
  descarta as alterações. O SQLite e a outbox são a Sprint 6 (semanas 11–12).
- **Sem sincronização.** O `syncStatus` já é modelado e exibido na interface,
  mas nada é enviado — não há fila, cursor nem idempotência ainda.
- **Login simulado.** `signIn` não chama a API; devolve uma sessão local no
  formato de `docs/api-rest.md` §12.4 e a grava no armazenamento seguro.
- **Sem QR Code e sem GPS.** Previstos para a Sprint 5 (semanas 9–10).
- **Foto só pela câmera, sem upload.** A URI local é guardada e a evidência
  aparece como "aguardando envio", como descrito em §10.14.3.
- **`DATE` é campo de texto** no formato `AAAA-MM-DD`, para não adicionar
  ainda a dependência nativa de seletor de data.
