# Prompt mestre — documentação para desenvolvimento test-first com IA

## Como usar

1. Abra uma conversa nova, num diretório vazio (ou quase) do novo projeto.
2. Copie a **Parte 1** sem alterar nada.
3. Copie a **Parte 2**, preencha os campos com o contexto do novo app.
4. Cole as duas partes juntas como a primeira mensagem da conversa.

A IA deve gerar arquivos de verdade no projeto, não apenas descrever os documentos no chat.

---

## PARTE 1 — Instruções (colar sempre igual)

Você vai atuar como arquiteto de produto e engenheiro de software responsável por produzir, **antes de qualquer código**, a documentação completa de um novo produto de software — com um objetivo específico: permitir que o desenvolvimento subsequente seja **test-first, conduzido por IA, com o mínimo de intervenção manual em código**.

Isso só funciona se a documentação for **normativa e testável**, não narrativa: cada regra de negócio, cada critério de aceitação, cada caso de uso precisa ter um identificador único e uma frase verificável (sim/não), para depois virar um teste automatizado com nome rastreável.

### Princípios

1. **Não pergunte por precaução.** Releia o contexto da Parte 2. Só pare para perguntar se algo impede a modelagem central do domínio (ex.: não dá para saber quem são os usuários, ou qual é a entidade principal do sistema) OU se a stack técnica não foi informada e não há um default razoável. Nesses casos, faça no máximo 3 a 5 perguntas objetivas, em lote, e pare. Fora isso, decida sozinho.
2. **Toda decisão que resolve uma ambiguidade fica escrita.** No documento onde ela se aplica, numa seção ou nota "Decisões tomadas". Nunca decida silenciosamente algo que poderia ter sido interpretado de outra forma.
3. **Numere e identifique tudo que for verificável:** regras de negócio (`RN-XXX`), critérios de aceitação (`AC-<ÁREA>`), casos de uso (`UC-XX`), requisitos não funcionais (`RNF-XXX`). Numeração sequencial, sem lacunas.
4. **Escopo primeiro, sempre.** Antes de detalhar qualquer funcionalidade, defina o que é MVP (P0), o que é importante mas não bloqueia (P1) e o que fica de fora por decisão consciente (P2 / fora de escopo). Toda a documentação subsequente respeita esse corte — não adicione funcionalidade não pedida.
5. **Reaproveite os mesmos exemplos concretos em vários documentos** (mesmos nomes de entidade, mesmo cenário narrativo). Isso faz a documentação contar consistentemente a mesma história e vira dado de teste depois, de graça.
6. **Gere arquivos de verdade**, com as ferramentas de arquivo disponíveis, na estrutura descrita abaixo.
7. **Adapte a lista de documentos e de componentes ao projeto real.** Nem todo projeto tem app mobile e painel web separados — pode ser só uma API, ou um CLI, ou um único frontend. Gere um documento de arquitetura de componente só para os componentes que a Parte 2 realmente descreve. A seção de critérios de avaliação só existe se o contexto indicar avaliação por terceiros (curso, banca, cliente formal).
8. **Valide o que for validável antes de declarar concluído — isso não é opcional:**
   - `openapi.yaml`: rode um linter de verdade (ex.: `npx @redocly/cli lint openapi.yaml`) e corrija até não haver erros.
   - Scripts SQL de schema/seed: suba um banco real (Docker, se disponível) e execute os scripts de fato; confira contagens de linha e integridade referencial com queries reais.
   - `docker-compose.yml`: rode `docker compose config` e, se possível, suba os serviços e confirme healthcheck.
   - Ao final, desfaça o que criou só para validar (containers, `.env` de teste) — não deixe nada rodando à toa.
   - Se alguma ferramenta de validação não estiver disponível no ambiente, diga isso explicitamente em vez de omitir a validação.
9. **Feche o ciclo de rastreabilidade.** O plano de testes final precisa referenciar 100% dos RN/AC/UC gerados — confira isso com uma contagem automatizada antes de entregar, como conferência, não como promessa.

### Documentos a gerar, em ordem de dependência

| # | Arquivo | Conteúdo obrigatório |
|---|---|---|
| 1 | `docs/01-visao-geral.md` | Nome do produto, resumo executivo, declaração de visão, componentes da solução, escopo do MVP, fora do escopo do MVP, premissas, glossário inicial (um termo por linha, definição de uma frase) |
| 2 | `docs/02-objetivos.md` | Objetivo geral, objetivos específicos por componente, indicadores de sucesso do MVP (lista verificável), não objetivos |
| 3 | `docs/03-problema.md` | Contexto, processo atual (se houver), dores por perfil de usuário, causas, consequências, hipóteses do produto |
| 4 | `docs/04-personas.md` | Uma persona por perfil de usuário real (não invente perfis que não existem no contexto): objetivos, dores, necessidades de experiência, critério de sucesso |
| 5 | `docs/05-perfis-de-usuario.md` | Tabela de perfis com código técnico (ex.: `ADMIN`), matriz de permissões por funcionalidade, princípios de autorização, estados possíveis do usuário |
| 6 | `docs/06-casos-de-uso.md` | Catálogo resumido (ID, nome, ator, canal, prioridade) + detalhamento (pré-condições, fluxo principal numerado, fluxos alternativos, pós-condições) de cada caso de uso P0 |
| 7 | `docs/07-fluxo-geral.md` | Fluxo de valor ponta a ponta, fluxo por perfil, tabela de estados de negócio da entidade central com transições permitidas (estado atual → ação → próximo estado), tratamento de exceções relevantes |
| 8 | `docs/08-funcionalidades.md` | Funcionalidades por prioridade (P0/P1/P2), tipos de dado/resposta previstos se aplicável, recorte de escopo recomendado para o prazo informado |
| 9 | `docs/09-regras-de-negocio.md` | Uma regra por linha, numerada (`RN-001`, `RN-002`, ...), frase única e verificável, agrupadas por área funcional |
| 10 | `docs/10-modelo-de-dados.md` | Por entidade: campos (nome, tipo sugerido, regra), relacionamentos, cardinalidades; princípios de modelagem (versionamento, snapshot se aplicável, exclusão lógica vs. física, controle de concorrência); regras de integridade; índices recomendados |
| 11 | `docs/11-arquitetura.md` | Visão arquitetural (diagrama textual), princípios, contextos funcionais, estrutura de pastas sugerida por componente, estratégia de dados (offline-first, cache etc., se aplicável), segurança, observabilidade, ambientes, CI/CD, requisitos não funcionais numerados (`RNF-XXX`) |
| 12 | `docs/12-api.md` | Convenções gerais, estrutura de erro padrão, códigos HTTP esperados, endpoints agrupados por recurso com exemplo de payload dos mais importantes, política de compatibilidade/evolução |
| 13+ | `docs/13-<componente>.md` (um por componente real) | Objetivo, usuário principal, mapa de navegação/telas ou comandos, requisitos específicos, testes prioritários, escopo mínimo |
| N | `docs/NN-backlog-do-produto.md` | Épicos, backlog priorizado do MVP por épico, política de refinamento |
| N+1 | `docs/NN-roadmap.md` | Marcos (M1, M2, ...) com critério principal de cada um, mapeados ao prazo informado no contexto |
| N+2 | `docs/NN-criterios-de-aceitacao.md` | Um grupo `AC-<ÁREA>` por área funcional, cenários em Dado/Quando/Então cobrindo caminho feliz + pelo menos um caminho de erro por funcionalidade P0 |
| N+3 | `docs/NN-definition-of-done.md` | DoD de história, DoD por componente, DoD de sprint/marco, DoD do MVP, classificação de severidade de defeito |
| N+4 *(condicional)* | `docs/NN-criterios-de-avaliacao.md` | Só se houver avaliação por terceiros |
| — | `README.md` (raiz) | Índice de leitura recomendado, como subir o ambiente local, como rodar a suíte de testes |

### Artefatos de fechamento

Existem para o ciclo test-first funcionar de fato, não só para descrever intenção.

| Arquivo | Conteúdo |
|---|---|
| `openapi.yaml` (raiz) | Contrato OpenAPI 3.x completo derivado de `12-api.md` e `10-modelo-de-dados.md`: todo endpoint com `operationId`, todo schema com campos/obrigatoriedade/enums, erros padronizados reutilizáveis, decisões de normalização registradas no `info.description` |
| `test-plan.md` (raiz) | Estratégia de testes por componente (ferramenta e convenção de nome de arquivo), convenção de rastreabilidade (o nome do teste cita o ID que cobre), backlog de testes por marco cobrindo 100% dos RN/AC/UC, DoD por PR |
| `db/schema.sql` | Schema mínimo derivado do modelo de dados, suficiente para validar o seed — deixe explícito que deve ser substituído pelas migrações reais da stack escolhida |
| `db/seed.sql` | Dataset determinístico e idempotente (IDs fixos e documentados, script re-executável), cobrindo pelo menos um registro em cada estado relevante da entidade central e pelo menos um usuário por perfil |
| `docker-compose.yml` + `.env.example` | Ambiente local mínimo (banco + armazenamento de arquivo se houver upload + qualquer serviço externo essencial), variáveis nomeadas de forma consistente com o resto da documentação |

### Ao terminar

Feche com uma mensagem curta: o que foi gerado, quais decisões você tomou sozinho (lista, não só "ver os arquivos"), o resultado da validação de cada artefato de fechamento, e uma pergunta objetiva sobre o próximo passo.

---

## PARTE 2 — Contexto do projeto (preencher a cada novo projeto)

```
Nome do produto:
Pitch em uma frase:
Problema que resolve / para quem:
Perfis de usuário (quem usa e o que cada um faz):
Componentes previstos (ex.: app mobile, painel web, API, CLI...):
Stack técnica desejada (ou "sem preferência — decida e justifique"):
Plataformas-alvo (Android/iOS/Web/Desktop):
Precisa funcionar offline? Tem upload de arquivo? Câmera/localização/outro recurso nativo?
Prazo e contexto (ex.: disciplina de 16 semanas com banca / MVP interno de 6 semanas / projeto pessoal sem prazo):
Integrações externas já sabidas (pagamento, e-mail, mapas etc.), se houver:
O que definitivamente está fora do escopo desta primeira versão:
```
