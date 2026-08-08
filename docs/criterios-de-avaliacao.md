# 19. Critérios de Avaliação

## 19.1 Princípios da Avaliação

A avaliação do projeto deverá considerar tanto a qualidade do produto entregue quanto a aprendizagem individual de cada estudante. A existência de uma funcionalidade implementada não será suficiente caso o estudante não consiga explicar as decisões adotadas, o fluxo de dados e sua contribuição para o projeto.

### Princípios

- avaliação contínua e incremental, sem concentração apenas na entrega final;
- equilíbrio entre funcionamento, qualidade técnica e compreensão dos conceitos;
- utilização de evidências como commits, Pull Requests, testes e demonstrações;
- integração efetiva entre as aplicações;
- distinção entre desempenho da equipe e desempenho individual;
- valorização da confiabilidade da solução, e não apenas da quantidade de funcionalidades implementadas.

---

# 19.2 Rubrica Integrada do Produto

| Dimensão | Pontos | Evidências Esperadas |
|----------|--------:|----------------------|
| Visão do produto, requisitos e aderência ao escopo | 5 | Backlog consistente, histórias implementadas e regras atendidas. |
| Arquitetura e organização | 10 | Separação de responsabilidades, organização do projeto e decisões documentadas. |
| Aplicativo mobile | 20 | Navegação, checklist, persistência, estados e experiência de uso em campo. |
| Recursos nativos | 10 | Utilização de câmera, QR Code, localização e gerenciamento de permissões. |
| Offline e sincronização | 15 | SQLite, outbox, idempotência, recuperação de falhas e estado de sincronização. |
| Interface administrativa | 10 | Cadastros, modelos, planejamento, acompanhamento e revisão de inspeções. |
| API, regras de negócio e modelo de dados | 15 | Segurança, validações, persistência, endpoints e documentação. |
| Testes, segurança e qualidade | 7 | Testes críticos, lint, tratamento de erros e ausência de credenciais expostas. |
| Documentação e processo | 4 | README, OpenAPI, backlog, Pull Requests e evidências do projeto. |
| Demonstração e defesa técnica | 4 | Demonstração ponta a ponta e explicação individual das contribuições. |
| **Total** | **100** | |

---

# 19.3 Rubrica da Disciplina de Expo

Considerando uma carga semanal composta por duas aulas de conteúdo e três aulas destinadas ao desenvolvimento do projeto.

| Dimensão | Pontos | Critérios |
|----------|--------:|-----------|
| Avaliações individuais de conteúdo | 25 | TypeScript, navegação, consumo de dados, formulários, recursos nativos, SQLite e sincronização. |
| Fundação e arquitetura mobile | 10 | Estrutura do projeto, rotas, componentes, tipagem e organização. |
| Integração, autenticação e dados remotos | 10 | API, autenticação, tratamento de erros, cache e listas. |
| Checklist dinâmico | 15 | Renderização dinâmica, validação, progresso e persistência. |
| Recursos nativos | 15 | Câmera, QR Code, localização e permissões. |
| Offline e sincronização | 15 | SQLite, outbox, idempotência e recuperação de falhas. |
| Testes, acessibilidade e performance | 5 | Casos críticos, qualidade da interface e otimizações. |
| Build, documentação e defesa | 5 | Build Android, README e apresentação individual. |
| **Total** | **100** | |

---

# 19.4 Rubrica da Disciplina de Java / Spring Boot

| Dimensão | Pontos |
|----------|--------:|
| Modelagem do domínio e banco de dados | 15 |
| API REST e DTOs | 15 |
| Autenticação e autorização | 15 |
| Regras de negócio e transições de estado | 15 |
| Modelos versionados e snapshots | 10 |
| Sincronização e idempotência | 10 |
| Upload de evidências e auditoria | 5 |
| Testes automatizados | 8 |
| OpenAPI, documentação e execução | 5 |
| Defesa individual | 2 |
| **Total** | **100** |

---

# 19.5 Rubrica da Interface Administrativa

| Dimensão | Pontos |
|----------|--------:|
| Arquitetura Angular e organização | 10 |
| Autenticação, guards e autorização visual | 10 |
| Cadastros e formulários | 15 |
| Construtor de modelos de inspeção | 20 |
| Planejamento e acompanhamento | 15 |
| Revisão, aprovação e reprovação | 15 |
| Estados da interface, acessibilidade e responsividade | 5 |
| Testes e qualidade | 5 |
| Build, documentação e defesa | 5 |
| **Total** | **100** |

---

# 19.6 Avaliação por Marcos

| Marco | Peso Sugerido | Critério Principal |
|-------|--------------:|--------------------|
| M1 — Fundação | 5% | Projetos executáveis e organizados. |
| M2 — Autenticação | 10% | Sessão integrada e autorização. |
| M3 — Planejamento | 10% | Modelo de inspeção e inspeção criados pela interface administrativa. |
| M4 — Execução Online | 15% | Checklist dinâmico e registro das respostas. |
| M5 — Recursos Nativos | 15% | Fotografia, QR Code e localização funcionando. |
| M6 — Offline | 20% | Persistência local e sincronização confiável. |
| M7 — Revisão | 10% | Aprovação, reprovação e correção da inspeção. |
| M8 — Release | 15% | Integração final, builds, documentação e defesa. |
| **Total** | **100%** | |

---

# 19.7 Avaliação Individual

A nota individual poderá considerar:

- avaliações práticas ou teóricas;
- explicação oral de partes do código desenvolvido;
- histórico de commits;
- Pull Requests criados e revisados;
- capacidade de reproduzir e corrigir defeitos;
- compreensão da integração entre as aplicações;
- participação nas demonstrações;
- cumprimento das responsabilidades assumidas pela equipe.

> A quantidade de commits não deverá ser utilizada como único critério de avaliação. Serão considerados principalmente a relevância, qualidade, autoria efetiva e capacidade de explicar a contribuição realizada.

---

# 19.8 Evidências Obrigatórias da Equipe

Cada equipe deverá disponibilizar, no mínimo:

- URL dos repositórios;
- backlog atualizado;
- principais Pull Requests;
- README de cada aplicação;
- instruções de execução;
- documentação OpenAPI;
- diagrama ou esquema do banco de dados;
- build Android;
- build ou URL da interface administrativa;
- ambiente ou contêiner da API;
- usuários de demonstração;
- roteiro da demonstração;
- registro dos principais testes realizados;
- lista das limitações conhecidas.

---

# 19.9 Penalidades Técnicas

Poderão reduzir a avaliação do projeto:

- credenciais ou segredos armazenados no repositório;
- perda de dados durante operações offline;
- ausência de autorização implementada na API;
- duplicidade de registros causada por reenvio previsível;
- utilização do Swagger ou acesso direto ao banco como substituição da interface administrativa durante a demonstração;
- apresentação de telas estáticas como se estivessem integradas;
- alterações manuais no banco de dados durante a apresentação;
- funcionalidades copiadas sem compreensão da implementação;
- ausência de histórico ou evidências de participação;
- impossibilidade de executar o projeto utilizando apenas a documentação disponibilizada.

---

# 19.10 Diferenciais e Bônus

Após a conclusão estável do MVP, poderão ser considerados diferenciais positivos:

- notificações push;
- geração de relatórios em PDF;
- assinatura digital;
- autenticação biométrica;
- dashboard administrativo avançado;
- melhorias de acessibilidade;
- testes ponta a ponta;
- monitoramento da aplicação;
- deploy automatizado;
- resolução assistida de conflitos;
- portal do cliente;
- soluções inovadoras validadas com usuários.

> Funcionalidades adicionais **não compensam falhas graves** relacionadas ao fluxo principal, à segurança da aplicação ou à preservação dos dados durante a operação offline.