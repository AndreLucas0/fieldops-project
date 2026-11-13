# Análise de Riscos — Projeto FieldOps

## 1. Objetivo

A análise de riscos tem como objetivo identificar, analisar, avaliar e acompanhar eventos que possam afetar o desenvolvimento e a entrega do Projeto FieldOps.

O gerenciamento dos riscos será realizado durante todo o ciclo de vida do projeto, buscando reduzir ameaças aos objetivos e aumentar a capacidade da equipe de responder a possíveis problemas.

O processo considera a identificação dos riscos, análise qualitativa, definição das respostas, monitoramento e controle dos riscos.

---

# 2. Gerenciamento de Riscos

O gerenciamento dos riscos do Projeto FieldOps será dividido nas seguintes etapas:

1. Planejamento do gerenciamento dos riscos;
2. Identificação dos riscos;
3. Análise qualitativa dos riscos;
4. Definição das respostas aos riscos;
5. Monitoramento dos riscos;
6. Controle e atualização do registro de riscos.

A equipe FieldOps será responsável pela execução dessas atividades, enquanto a Toyota e os professores do SENAI participarão como partes consultadas e responsáveis pela aprovação das decisões quando necessário.

---

# 3. Critérios de Probabilidade

A probabilidade representa a possibilidade de um determinado risco ocorrer durante o projeto.

| Valor | Probabilidade | Descrição |
|---:|---|---|
| 1 | Muito baixa | Pouca possibilidade de ocorrência |
| 2 | Baixa | Possibilidade pequena de ocorrência |
| 3 | Média | Possibilidade moderada de ocorrência |
| 4 | Alta | Possibilidade significativa de ocorrência |
| 5 | Muito alta | Grande possibilidade de ocorrência |

---

# 4. Critérios de Impacto

O impacto representa o efeito que o risco pode causar nos objetivos do projeto, considerando principalmente prazo, custo, qualidade, escopo e funcionamento do sistema.

| Valor | Impacto | Descrição |
|---:|---|---|
| 1 | Muito baixo | Pequeno efeito no projeto |
| 2 | Baixo | Efeito limitado, sem comprometer entregas importantes |
| 3 | Médio | Pode exigir ajustes no planejamento |
| 4 | Alto | Pode comprometer uma entrega ou etapa importante |
| 5 | Muito alto | Pode comprometer significativamente os objetivos do projeto |

---

# 5. Classificação dos Riscos

O nível do risco será calculado pela multiplicação entre probabilidade e impacto:

**Nível do risco = Probabilidade × Impacto**

| Pontuação | Classificação |
|---:|---|
| 1 a 4 | Baixo |
| 5 a 9 | Médio |
| 10 a 16 | Alto |
| 17 a 25 | Muito alto |

---

# 6. Registro de Riscos

| ID | Categoria | Causa | Risco | Consequência | P | I | Nível |
|---|---|---|---|---|---:|---:|---|
| R01 | Requisitos | Requisitos incompletos ou alterados | O escopo pode sofrer mudanças durante o desenvolvimento | Retrabalho e atraso nas entregas | 4 | 4 | 16 - Alto |
| R02 | Prazo | Estimativas inadequadas | Algumas atividades podem ultrapassar o prazo planejado | Atraso no cronograma | 4 | 4 | 16 - Alto |
| R03 | Equipe | Disponibilidade limitada dos integrantes | Um ou mais integrantes podem não conseguir executar uma atividade planejada | Redução da velocidade de desenvolvimento | 3 | 4 | 12 - Alto |
| R04 | Tecnologia | Falhas ou incompatibilidade entre tecnologias | A integração entre aplicação, banco de dados e serviços pode apresentar problemas | Retrabalho e atraso | 3 | 4 | 12 - Alto |
| R05 | Infraestrutura | Indisponibilidade de serviços em nuvem | Serviços necessários ao sistema podem ficar indisponíveis | Interrupção dos testes ou funcionamento do sistema | 3 | 4 | 12 - Alto |
| R06 | Internet | Dependência de conexão para sincronização | A aplicação pode não conseguir sincronizar os dados | Dados ficam temporariamente sem atualização | 4 | 4 | 16 - Alto |
| R07 | Sincronização | Conflitos durante sincronização offline/online | Dados alterados offline podem entrar em conflito com dados do servidor | Inconsistência das informações | 3 | 5 | 15 - Alto |
| R08 | Segurança | Configuração inadequada de autenticação e autorização | Usuários podem obter acesso indevido a recursos | Exposição ou alteração indevida de dados | 3 | 5 | 15 - Alto |
| R09 | Banco de dados | Falhas de configuração ou integração | Dados podem não ser registrados corretamente | Perda ou inconsistência de informações | 2 | 5 | 10 - Alto |
| R10 | Comunicação | Informações não compartilhadas no momento adequado | A equipe pode trabalhar com informações desatualizadas | Retrabalho e decisões inadequadas | 3 | 3 | 9 - Médio |
| R11 | Validação | Critérios de aceitação não definidos claramente | Uma entrega pode não atender às expectativas dos stakeholders | Necessidade de alterações após a entrega | 3 | 4 | 12 - Alto |
| R12 | Testes | Cobertura insuficiente de testes | Falhas podem permanecer até etapas finais do projeto | Redução da qualidade do sistema | 3 | 4 | 12 - Alto |
| R13 | Escopo | Inclusão de novas funcionalidades | Novas demandas podem aumentar o escopo original | Aumento do prazo e esforço | 4 | 4 | 16 - Alto |
| R14 | Custos | Estimativas de recursos inferiores às necessidades | O orçamento pode não contemplar todos os recursos necessários | Necessidade de revisão do orçamento | 2 | 3 | 6 - Médio |
| R15 | Documentação | Documentação incompleta ou desatualizada | Informações importantes podem não ser registradas | Dificuldade de manutenção e continuidade | 3 | 3 | 9 - Médio |
| R16 | Homologação | Falta de validação das entregas | O sistema pode chegar à etapa final com problemas não identificados | Atraso na homologação | 2 | 5 | 10 - Alto |
| R17 | Implantação | Problemas durante a publicação do sistema | O sistema pode apresentar problemas após a implantação | Interrupção ou atraso na disponibilização | 2 | 5 | 10 - Alto |
| R18 | Dependências externas | Dependência de APIs, serviços ou ferramentas externas | Um serviço externo pode ficar indisponível ou sofrer alteração | Falha de funcionalidades dependentes | 3 | 4 | 12 - Alto |

---

# 7. Matriz de Probabilidade x Impacto

| Probabilidade \ Impacto | 1 | 2 | 3 | 4 | 5 |
|---|---:|---:|---:|---:|---:|
| **5 - Muito alta** | 5 M | 10 A | 15 A | 20 MA | 25 MA |
| **4 - Alta** | 4 B | 8 M | 12 A | 16 A | 20 MA |
| **3 - Média** | 3 B | 6 M | 9 M | 12 A | 15 A |
| **2 - Baixa** | 2 B | 4 B | 6 M | 8 M | 10 A |
| **1 - Muito baixa** | 1 B | 2 B | 3 B | 4 B | 5 M |

**Legenda:**

- B = Baixo
- M = Médio
- A = Alto
- MA = Muito Alto

---

# 8. Plano de Respostas aos Riscos

| ID | Estratégia | Ação preventiva | Plano de contingência | Responsável |
|---|---|---|---|---|
| R01 | Mitigar | Validar requisitos com Toyota e professores antes do desenvolvimento | Revisar backlog e cronograma | Equipe FieldOps |
| R02 | Mitigar | Acompanhar o cronograma e estimar as atividades das sprints | Replanejar atividades e prioridades | Equipe FieldOps |
| R03 | Mitigar | Distribuir atividades entre os integrantes da equipe | Redistribuir tarefas entre os integrantes disponíveis | Equipe FieldOps |
| R04 | Mitigar | Realizar testes de integração durante o desenvolvimento | Isolar o componente com problema e corrigir a integração | Equipe FieldOps |
| R05 | Mitigar | Monitorar os serviços utilizados na infraestrutura | Utilizar procedimentos de recuperação e restabelecimento | Equipe FieldOps |
| R06 | Mitigar | Implementar funcionamento offline e sincronização posterior | Armazenar os dados localmente até o restabelecimento da conexão | Equipe FieldOps |
| R07 | Mitigar | Definir regras de sincronização e tratamento de conflitos | Identificar e corrigir conflitos antes da atualização definitiva | Equipe FieldOps |
| R08 | Mitigar | Utilizar autenticação, autorização e controle de acesso | Revogar acessos e corrigir configurações de segurança | Equipe FieldOps |
| R09 | Mitigar | Realizar testes e backups dos dados | Recuperar dados e corrigir a estrutura do banco | Equipe FieldOps |
| R10 | Mitigar | Realizar reuniões e registrar decisões | Comunicar imediatamente as informações pendentes | Equipe FieldOps |
| R11 | Mitigar | Definir critérios de aceitação antes das entregas | Ajustar a entrega conforme os critérios definidos | Equipe FieldOps |
| R12 | Mitigar | Criar testes funcionais, integração e funcionamento offline | Corrigir os problemas encontrados e repetir os testes | Equipe FieldOps |
| R13 | Evitar/Mitigar | Controlar solicitações de mudança e avaliar impacto no escopo | Replanejar prazo e recursos caso a mudança seja aprovada | Equipe FieldOps |
| R14 | Mitigar | Acompanhar orçamento e consumo de recursos | Revisar o orçamento e priorizar recursos | Equipe FieldOps |
| R15 | Mitigar | Atualizar documentação durante o desenvolvimento | Realizar revisão da documentação antes da entrega | Equipe FieldOps |
| R16 | Mitigar | Realizar validações durante as etapas do projeto | Corrigir pendências antes da homologação final | Equipe FieldOps |
| R17 | Mitigar | Planejar a implantação e realizar testes prévios | Executar correções e retornar à versão anterior quando necessário | Equipe FieldOps |
| R18 | Mitigar | Mapear dependências externas e acompanhar alterações | Utilizar alternativa disponível ou adaptar a integração | Equipe FieldOps |

---

# 9. Monitoramento dos Riscos

Os riscos serão acompanhados durante todo o projeto. O registro de riscos deverá ser atualizado sempre que houver alteração na probabilidade, impacto, resposta ou situação de um risco.

O monitoramento será realizado principalmente durante:

- reuniões de acompanhamento;
- reuniões das sprints;
- análise do cronograma;
- acompanhamento das entregas;
- testes do sistema;
- validação com a Toyota;
- validação acadêmica com os professores do SENAI;
- análise de problemas e mudanças de escopo.

Novos riscos identificados durante o desenvolvimento deverão ser adicionados ao registro de riscos.

---

# 10. Comunicação e Informações do Projeto

| Informação / Comunicação | Destinatários | Responsável | Canal | Frequência | Formato | Momento |
|---|---|---|---|---|---|---|
| Status geral do projeto | Toyota e Professores SENAI | Equipe FieldOps | Reunião / documentação | Semanal | Relatório / apresentação | Durante o desenvolvimento |
| Andamento das sprints | Equipe, Toyota e Professores SENAI | Equipe FieldOps | Reunião | A cada sprint | Apresentação / reunião | Final da sprint |
| Alterações de escopo | Toyota e Professores SENAI | Equipe FieldOps | Reunião / documentação | Quando necessário | Solicitação de mudança | Antes da implementação |
| Riscos identificados | Toyota e Professores SENAI | Equipe FieldOps | Reunião / documento | Semanal ou quando identificado | Registro de riscos | Durante todo o projeto |
| Problemas e impedimentos | Equipe, Toyota e Professores SENAI | Equipe FieldOps | Reunião / canal de comunicação | Quando necessário | Registro / mensagem | Assim que identificado |
| Cronograma | Equipe, Toyota e Professores SENAI | Equipe FieldOps | GitHub / apresentação | Atualização semanal | Documento / tabela | Durante o planejamento e execução |
| Orçamento | Professores SENAI e Toyota | Equipe FieldOps | Documento / reunião | Conforme atualização | Planilha / relatório | Durante o planejamento e controle |
| Entregas do projeto | Toyota e Professores SENAI | Equipe FieldOps | GitHub / reunião | Conforme entrega | Protótipo / sistema / documentação | Ao final de cada etapa |
| Resultados dos testes | Toyota e Professores SENAI | Equipe FieldOps | GitHub / reunião | Conforme realização | Relatório de testes | Durante desenvolvimento e validação |
| Critérios de aceitação | Toyota e Professores SENAI | Equipe FieldOps | Reunião / documento | Conforme necessidade | Documento | Antes da validação |
| Homologação | Toyota e Professores SENAI | Equipe FieldOps | Reunião / sistema | Ao final do desenvolvimento | Demonstração / checklist | Antes da entrega final |
| Relatório final | Toyota e Professores SENAI | Equipe FieldOps | GitHub | Uma vez | Documento | Encerramento do projeto |

---

# 11. Responsabilidades

### Equipe FieldOps

Responsável pela execução das atividades de gerenciamento e desenvolvimento do projeto, incluindo:

- identificação e análise dos riscos;
- atualização do registro de riscos;
- desenvolvimento do sistema;
- realização dos testes;
- acompanhamento do cronograma;
- controle das atividades;
- elaboração dos documentos;
- comunicação do andamento;
- implementação das respostas aos riscos.

### Toyota

Participa principalmente como stakeholder do projeto, contribuindo com:

- consulta sobre requisitos e necessidades;
- validação das entregas;
- aprovação quando aplicável;
- acompanhamento do andamento;
- fornecimento de informações relacionadas ao contexto do projeto.

### Professores SENAI

Participam como responsáveis pelo acompanhamento acadêmico e orientação do projeto, contribuindo com:

- consulta durante o desenvolvimento;
- orientação metodológica;
- análise das entregas;
- validação acadêmica;
- aprovação das atividades conforme os critérios definidos.

---

# 12. Controle dos Riscos

O controle dos riscos será realizado durante todo o ciclo de vida do Projeto FieldOps.

A equipe deverá verificar:

1. se os riscos identificados continuam existentes;
2. se a probabilidade dos riscos foi alterada;
3. se o impacto dos riscos foi alterado;
4. se as ações preventivas estão sendo executadas;
5. se as respostas aos riscos foram eficazes;
6. se surgiram novos riscos;
7. se existem riscos residuais após a aplicação das respostas.

Quando necessário, o registro de riscos será atualizado e as informações serão comunicadas aos stakeholders.

---

# 13. Conclusão

A análise de riscos permite que o Projeto FieldOps tenha uma abordagem estruturada para identificar possíveis eventos que possam afetar seu prazo, custo, escopo, qualidade e funcionamento.

A utilização do registro de riscos, da matriz de probabilidade e impacto e do plano de respostas permite que a equipe acompanhe os principais riscos durante o desenvolvimento e tome ações preventivas ou corretivas quando necessário.

O gerenciamento dos riscos será contínuo, sendo acompanhado nas reuniões, sprints, testes, validações e demais atividades de controle do projeto.
