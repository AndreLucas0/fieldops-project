# Recuperação integrada — atualização de 2026-11-04

Esta entrada supera os estados provisórios de `recovery-20261103.md`.

## Preservação e integração

- PR #296, criado por LucasIanovski para develop, reúne main, develop,
  web_front_2 e o planejamento de oito sprints de branch_leo (`f1dc8b9`).
- `feat/web-admin-lists` e `task/int-010-web-login` não têm patches exclusivos
  após comparação `--cherry-pick`. Todas as branches foram mantidas.
- PRs #271/#278 e branch-Joao continuam preservados: não substituir contratos
  e migrações atuais pelo conjunto antigo. Regras de escrita relevantes exigem
  decisão específica; não fazer recuperação indiscriminada desse backend.
- Estado inicial original: develop `80d4820`; AGENTS.md e bundles preservados.
  A junction antiga foi movida, sem exclusão de seu destino, para
  `outputs/web-node_modules-preserved-link`, fora da worktree. Esta worktree
  agora tem sua própria instalação de dependências.
- PR #296 integrado em develop `4851892`; promoção #297 integrada em main
  `8e278c2`, após checks completos aprovados (CI 6 e execução 41858582825).
  Árvores idênticas verificadas. Original atualizado por fast-forward, sem
  checkout/reset; main local também avançou sem force. Dependências locais
  reinstaladas pelos lockfiles e build web no caminho original aprovado.

## Correções e funcionalidades

- FE-W14 cria DRAFT; FE-W16 apresenta os sete tipos do contrato e publica após
  confirmação; FE-W17 pagina versões e consulta snapshots imutáveis.
- Builder envia PUT completo e troca posições sequencialmente usando uma
  posição livre, compatível com a unicidade da API.
- Planejamento preserva a data/hora escolhida; ignora respostas antigas dos
  selects; bloqueia envios simultâneos e perfis indevidos. FE-W20 edita os
  campos aceitos por InspectionUpdateRequest em DRAFT/ASSIGNED e cancela com
  justificativa pelo diálogo existente. Revisão acessível também em UNDER_REVIEW.
- FE-W21 relaciona evidências a respostas/NCs do item, permite zoom/navegação,
  mostra falha de evidências e mantém bloqueio até a leitura pós-decisão terminar.
- Guard de perfil também entre rotas filhas autenticadas; teste reproduziu o
  acesso indevido de SUPERVISOR a /users após abrir /dashboard e confirmou a correção.
- GET /inspections/{id} retornava apenas planejamento, contrariando o
  InspectionDetail já previsto no OpenAPI. Projeção somente leitura agora
  devolve snapshots persistidos, respostas, NCs e revisões. Endpoint, campos
  anteriores e @PreAuthorize(ADMIN,SUPERVISOR) preservados. Sem migração,
  escrita ou alteração de regra de negócio.
- TemplateVersionResponse inclui templateId/publishedBy já exigidos pelo
  contrato e mantém publishedById legado. Web normaliza JSON textual de opções.
- Mobile: tipos de rede corrigidos; carga por foco sem duplicação; teste de
  Início tem relógio estável, pois "90 minutos atrás" deixa de ser "hoje" após
  meia-noite. Timers de rede não foram substituídos.
- CI com permissão somente leitura, sem deploy. Execução 2: web/mobile verdes;
  backend teve sete erros de fixture por FK deixada por outras classes.
  Corrigida somente a preparação da base efêmera de Testcontainers.

## Dependências e validação

Atualizações necessárias autorizadas na execução integral foram avaliadas em
cópias isoladas antes da aplicação. Sem npm audit fix, force ou legacy-peer-deps.

- Angular runtime/compiler 21.2.26; CLI/build 21.2.29; Angular/Material 21 e
  TypeScript 5.9 preservados. Transitivas resolvidas dentro dos intervalos.
  Web: 34 alertas (3 críticos/10 altos) → 16 moderados, zero altos/críticos.
- Mobile: somente shell-quote 1.10.0 → 1.12.0 no lockfile. Expo 57 e React
  Native 0.86.2 preservados. 64 alertas → 63, zero críticos; 12 altos restantes.
  Parte das sugestões exige mudança incompatível de SDK; não aplicar downgrade
  para Expo 51 nem migração automática para Expo 58.
- Avaliação complementar isolada encontrou patches transitivos compatíveis
  para xmldom, brace-expansion, compression, js-yaml, node-forge e source-map-js.
  Apenas patches dentro dos intervalos existentes, sem mudar package.json,
  Expo, Router, React Native ou peers. Resultado: 57 alertas, sendo 6 altos,
  45 moderados e 6 baixos; zero críticos. Substitui a contagem anterior de 63.
  Restantes acompanhados na issue #298: CLI/Router/query-string/decode-uri/
  zod e image-size. Metro 0.84.4 usa image-size ^1.0.2; major corrigida fora
  desse intervalo não será forçada. Decisão de baseline SDK permanece aberta.
- Última validação local: web 317 testes/38 arquivos e build aprovado; mobile
  444 testes/37 arquivos, typecheck e lint sem erros; backend 52 unitários.
- Avisos mantidos: quatro diretivas eslint históricas sem uso no mobile e
  CSS de detalhe/revisão acima de 4 kB, mas abaixo do limite de erro de 8 kB.
  Budgets não foram aumentados.
- Integração local bloqueada por Docker ausente; CI 3 e CI 5 aprovados com
  Docker: 52 unitários e 304 integrações backend, web e mobile verdes.
  Execução CI 5: https://github.com/AndreLucas0/fieldops-project/actions/runs/41857115164
- Retomada: commits 3325579/fa2f7b3/ee30605 preservam precisão integral do
  timestamp e usam ConfirmDialogService. Cancelar/Escape não decide e devolve
  foco a Aprovar; confirmação pendente impede duplicação sem desabilitar o
  acionador. Reproduzido por teste antes da correção e confirmado no navegador.
- Concorrência (seção 8 de telas-frontend): erro 409 em início/decisão recarrega
  a inspeção antes de permitir ações; falha na releitura remove o estado antigo
  e bloqueia nova decisão. Reprovar desabilitado até motivo preenchido. Três
  testes reproduziram as falhas antes da correção. Sem mudança de API/backend.
- Revisão 320/768/1440 px sem overflow horizontal na revisão; listas em 320 px
  também verificadas na execução anterior. Fotos mock não são URLs reais;
  erro é visível. Homologação com fotos reais permanece separada.
- Exportação Expo web encontrou ausência de suporte WASM no Metro existente.
  Adicionado suporte de asset e isolamento COOP/COEP no servidor de preview,
  conforme documentação Expo SQLite, preservando aliases/pastas compartilhadas.
  Exportações web e Android/Hermes aprovadas; não equivale a APK/IPA assinado.
  Hospedagem web deve emitir os mesmos headers; nenhum deploy foi realizado.
- PR #296 é o registro de integração e checks atuais. As evidências de CI acima
  correspondem aos commits indicados nas execuções, sem presumir validação de
  alterações futuras. Relatório consolidado externo registra os SHAs finais.

## Dependências de decisão ou recurso externo

Reexecução CI 10 expôs mais dependência de ordem: 31 erros de fixture em
UserControllerIT/ClientControllerIT ao apagar usuários referenciados por modelos
de outra classe. Aplicado o isolamento TRUNCATE users CASCADE já adotado em
SiteControllerIT, somente na preparação do PostgreSQL efêmero. Não altera regra,
FK, migração nem dado da aplicação. Novo verify completo deve aprovar antes do
merge; resultados verdes anteriores não substituem esta verificação.

Quadro conciliado: #97, #98, #103–106, #174–175, #213–214, #218 e #285–287
encerradas e em Done, atribuídas a LucasIanovski, com referências aos merges
e evidências. Comentários distinguem implementação inicial dos colegas das
correções/entrega integrada. #281/#282/#284/#289/#290 e #298 permanecem abertas;
não declarar histórias abrangentes concluídas por encerrar tarefas parciais.

- Figma sem link/chave localizado; Lovable acessível e consultado. Não afirmar
  validação Figma ou homologação em todos os aparelhos físicos.
- FE-W23 sem endpoint de auditoria global (F04); F05 sem sinalizador de
  equipamento obrigatório; F07 sem fluxo contratual de novo rascunho publicado.
- Reatribuição: documento prevê, serviço aceita assign somente em DRAFT e a
  criação normal já atribui. Não expor ação que falha em ASSIGNED nem alterar
  essa regra de escrita sem decisão específica.
- Planejamento: UI restringe a DRAFT/ASSIGNED; serviço atual não aplica o mesmo
  bloqueio. Política de escrita/imutabilidade permanece pendente no backend.
- GPS de início/conclusão não aparece na consulta atual. Coordenadas de uma
  foto não serão apresentadas como coordenadas da execução.
- Decisões de scanner/logout/background e vulnerabilidades mobile que exigem
  migração de SDK permanecem explícitas. Não marcar essas tarefas como Done.
