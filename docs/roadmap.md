# 16 - Roadmap

# 16. Roadmap

## 16.1 Premissa acadêmica

O planejamento considera **16 semanas efetivas de aula**, embora o calendário institucional possua 20 semanas. As demais semanas poderão ser comprometidas por avaliações, palestras, feriados, eventos e atividades institucionais e não deverão ser utilizadas como dependência para concluir o MVP.

Na disciplina de Expo, cada semana terá:

- 2 aulas de 50 minutos para conteúdo e demonstração;
- 3 aulas de 50 minutos para desenvolvimento orientado do projeto.

**Carga efetiva da disciplina:**

- 32 aulas de conteúdo;
- 48 aulas de projeto;
- 80 aulas de 50 minutos.

---

## 16.2 Rotina semanal da disciplina de Expo

| Aula | Finalidade |
|------|------------|
| Aula 1 | Conceitos, arquitetura, decisões e exemplos. |
| Aula 2 | Demonstração prática guiada e exercício controlado. |
| Aula 3 | Refinamento da história, critérios de aceitação e preparação da integração. |
| Aula 4 | Desenvolvimento da funcionalidade no FieldOps. |
| Aula 5 | Integração, testes, revisão de código e demonstração parcial. |

---

## 16.3 Organização em oito sprints

Cada sprint terá duas semanas:

- 4 aulas de conteúdo Expo;
- 6 aulas de projeto Expo;
- entregas correspondentes no backend e na interface administrativa;
- incremento demonstrável ao final.

---

## 16.4 Roadmap integrado

| Sprint | Semanas | Conteúdo principal de Expo | Entrega mobile | Entrega administrativa | Entrega backend | Incremento demonstrável |
|---------|----------|----------------------------|----------------|------------------------|-----------------|-------------------------|
| **1** | 1–2 | Arquitetura, TypeScript, Expo Router, componentes e qualidade | Projeto base, rotas protegidas simuladas, design system e dados mockados | Projeto Angular, layout, rotas e telas iniciais | API base, PostgreSQL, migrações e OpenAPI inicial | Três aplicações executáveis com contrato inicial |
| **2** | 3–4 | Consumo de API, autenticação, sessão segura e tratamento de erros | Login real, sessão, logout e tela inicial | Login, usuários e cadastros básicos | JWT, autorização, usuários, clientes, locais e equipamentos | Usuários autenticados e cadastros disponíveis |
| **3** | 5–6 | Dados remotos, cache, listas, filtros e estados de interface | Lista e detalhes de inspeções inicialmente mockados e depois integrados | Construtor de modelos e agendamento | Modelos versionados, snapshot, inspeções e atribuição | Supervisor cria e atribui uma inspeção |
| **4** | 7–8 | React Hook Form, validação e formulários dinâmicos | Início, checklist, respostas, observações e progresso | Acompanhamento das inspeções | Consulta mobile, respostas, transições e validações | Técnico executa uma inspeção online |
| **5** | 9–10 | Câmera, imagens, permissões, QR Code e localização | Evidências, leitura do equipamento, GPS e não conformidade | Visualização de evidências e ocorrências | Upload, QR Code, localização e não conformidades | Inspeção online com recursos nativos |
| **6** | 11–12 | SQLite, conectividade, repositórios locais, outbox e sincronização | Download, operação offline, fila, tela de sincronização | Visualização do estado recebido | Push/pull, idempotência, cursor e conflitos básicos | Inspeção concluída offline e sincronizada |
| **7** | 13–14 | Testes, performance, acessibilidade e tratamento de falhas | Correção, robustez, testes e estados de erro | Revisão, aprovação, reprovação e histórico | Revisão, auditoria e testes de integração | Ciclo completo com reprovação e correção |
| **8** | 15–16 | EAS, ambientes, versionamento e distribuição | Build Android, documentação e ajustes finais | Build e publicação web | Contêiner, ambiente de demonstração e OpenAPI final | Produto integrado apresentado ponta a ponta |

---

## 16.5 Detalhamento por semana

### Semana 1 — Fundação e diagnóstico

#### Conteúdo Expo

- revisão do ecossistema;
- diagnóstico do conhecimento anterior;
- arquitetura do produto;
- TypeScript aplicado ao domínio;
- convenções do repositório.

#### Projeto Expo

- criar o projeto;
- configurar TypeScript, lint e aliases;
- criar estrutura por features;
- registrar decisões no README;
- preparar o fluxo Git.

#### Dependências integradas

- repositórios criados;
- contrato inicial de autenticação e inspeção;
- definição dos identificadores e enums.

---

### Semana 2 — Navegação e base visual

#### Conteúdo Expo

- Expo Router;
- grupos de rotas;
- layouts;
- proteção de rotas;
- design system e componentes reutilizáveis.

#### Projeto Expo

- rotas públicas e protegidas;
- shell da aplicação;
- login visual;
- início e lista simulada;
- componentes de botão, campo, cartão e estado.

#### Marco

- demonstração navegável com mocks.

---

### Semana 3 — Comunicação com API

#### Conteúdo Expo

- cliente HTTP;
- variáveis por ambiente;
- DTOs;
- interceptação;
- estados de carregamento e erro.

#### Projeto Expo

- serviço de API;
- integração com endpoint de login simulado ou real;
- tratamento padronizado de falhas;
- configuração local e de integração.

---

### Semana 4 — Autenticação e sessão

#### Conteúdo Expo

- JWT no cliente;
- renovação;
- armazenamento seguro;
- logout;
- sessão offline limitada.

#### Projeto Expo

- login real;
- persistência segura;
- carregamento da sessão;
- proteção de rotas;
- logout e expiração.

#### Marco

- autenticação integrada com Spring Boot.

---

### Semana 5 — Dados remotos e cache

#### Conteúdo Expo

- TanStack Query;
- chaves de consulta;
- cache;
- invalidação;
- separação entre estado remoto e estado da interface.

#### Projeto Expo

- consulta de inspeções;
- estados de carregamento, vazio e erro;
- atualização manual;
- estrutura inicial do repositório de inspeções.

---

### Semana 6 — Listas, filtros e detalhes

#### Conteúdo Expo

- listas virtualizadas;
- paginação;
- filtros;
- navegação parametrizada;
- otimização inicial.

#### Projeto Expo

- lista completa;
- filtros locais ou remotos;
- tela de detalhes;
- apresentação de prioridade, prazo e estado.

#### Marco

- técnico visualiza inspeção atribuída.

---

### Semana 7 — Formulários e validação

#### Conteúdo Expo

- React Hook Form;
- schemas;
- validação;
- componentes controlados;
- mensagens de erro.

#### Projeto Expo

- componentes para tipos básicos;
- validação de item;
- observação;
- estrutura de resposta.

---

### Semana 8 — Checklist dinâmico

#### Conteúdo Expo

- renderização por configuração;
- seções;
- progresso;
- otimização de formulários longos;
- resumo e confirmação.

#### Projeto Expo

- checklist dinâmico;
- início da inspeção;
- respostas online;
- progresso;
- conclusão com validação.

#### Marco

- execução online completa sem evidências.

---

### Semana 9 — Câmera e arquivos

#### Conteúdo Expo

- permissões;
- captura;
- seleção de imagem;
- URI local;
- tamanho e qualidade;
- upload multipart.

#### Projeto Expo

- componente de evidência;
- captura e prévia;
- vínculo com item;
- upload online;
- tratamento de falha.

---

### Semana 10 — QR Code e localização

#### Conteúdo Expo

- scanner;
- ciclo de leitura;
- GPS;
- precisão;
- consentimento;
- uso pontual da localização.

#### Projeto Expo

- confirmar equipamento por QR Code;
- registrar início e conclusão;
- apresentar divergência;
- criar não conformidade.

#### Marco

- inspeção online com recursos nativos.

---

### Semana 11 — SQLite e repositórios locais

#### Conteúdo Expo

- modelagem local;
- migração;
- consultas;
- repositório;
- consistência local.

#### Projeto Expo

- banco local;
- download da inspeção;
- persistência das respostas;
- retomada após reiniciar o aplicativo.

---

### Semana 12 — Outbox e sincronização

#### Conteúdo Expo

- detecção de conectividade;
- outbox;
- idempotência;
- dependências;
- repetição;
- conflitos.

#### Projeto Expo

- fila persistente;
- envio em lote;
- download por cursor;
- tela de sincronização;
- conclusão offline.

#### Marco

- inspeção executada offline e recebida pelo servidor.

---

### Semana 13 — Testes e falhas

#### Conteúdo Expo

- testes de componentes;
- testes de regras;
- mocks de rede;
- erros recuperáveis;
- logging controlado.

#### Projeto Expo

- testes dos componentes dinâmicos;
- testes da outbox;
- cenários de permissão negada;
- cenários de falha de envio.

---

### Semana 14 — Performance e acessibilidade

#### Conteúdo Expo

- profiling;
- renderizações;
- listas;
- imagens;
- acessibilidade;
- feedback de estado.

#### Projeto Expo

- otimizações;
- correções de acessibilidade;
- fluxo de inspeção reprovada;
- revisão de experiência.

#### Marco

- fluxo de revisão e correção estável.

---

### Semana 15 — Build e ambientes

#### Conteúdo Expo

- configuração do aplicativo;
- ambientes;
- versionamento;
- EAS Build;
- distribuição interna.

#### Projeto Expo

- ícones e configurações;
- variáveis por ambiente;
- build Android;
- instalação em dispositivo;
- correção de problemas de build.

---

### Semana 16 — Integração e apresentação

#### Conteúdo Expo

- preparação de release;
- checklist de publicação;
- documentação;
- análise retrospectiva.

#### Projeto Expo

- teste ponta a ponta;
- dados de demonstração;
- vídeo ou apresentação;
- README final;
- entrega das evidências.

#### Marco final

- demonstração completa:
  - criar;
  - atribuir;
  - executar offline;
  - sincronizar;
  - revisar;
  - aprovar ou reprovar.

---

## 16.6 Marcos obrigatórios

| Marco | Final da semana | Evidência |
|--------|-----------------|-----------|
| **M1 — Fundação** | 2 | Aplicações base e navegação simulada. |
| **M2 — Autenticação** | 4 | Login integrado nos dois frontends. |
| **M3 — Planejamento** | 6 | Modelo e inspeção criados pela web. |
| **M4 — Execução online** | 8 | Checklist dinâmico enviado à API. |
| **M5 — Recursos nativos** | 10 | Foto, QR Code e localização. |
| **M6 — Offline** | 12 | Inspeção concluída sem rede e sincronizada. |
| **M7 — Revisão** | 14 | Aprovação ou reprovação com histórico. |
| **M8 — Release** | 16 | Build, painel e API demonstrados. |

---

## 16.7 Gestão de risco do cronograma

Caso exista atraso, a redução de escopo deverá seguir esta ordem:

1. remover dashboard avançado;
2. limitar tipos de resposta aos essenciais;
3. manter apenas fotografia capturada, sem galeria;
4. simplificar o construtor de modelos sem arrastar e soltar;
5. limitar o conflito à detecção e bloqueio;
6. adiar notificações, PDF e assinatura;
7. manter obrigatoriamente:
   - autenticação;
   - planejamento;
   - checklist;
   - foto;
   - offline;
   - sincronização;
   - revisão.