# Plano de Testes — FieldOps

> **Atualizado para Spring Boot 4.1.0 / Java 21 / Spring Framework 7** (baseline
> obrigatório fixado junto com `docs/dependencias-spring-initializr.md`). As
> seções relativas à API (3.1, e as adições 3.1.1–3.1.4 abaixo) foram revisadas
> contra a documentação oficial dessas versões; o restante do documento
> (estrutura, convenção de rastreabilidade, backlog por marco, mobile e web)
> permanece válido e não foi reescrito — apenas as anotações/ferramentas Java
> citadas nas tabelas de arquivo de teste da API foram corrigidas onde
> desatualizadas. Ver seção "Atualizações realizadas" ao final do documento
> para o resumo do que mudou nesta revisão.

Este documento cruza `docs/regras-de-negocio.md` (RN-001–RN-090),
`docs/criterios-de-aceitacao.md` (AC-*) e `docs/casos-de-uso.md` (UC-01–UC-20)
com os arquivos de teste que cada aplicação deve conter, organizados na mesma
sequência de marcos (M1–M8) usada em `docs/roadmap.md` e
`docs/criterios-de-avaliacao.md` (§19.6).

Ele existe para fechar a lacuna descrita na análise da documentação: os
critérios de prioridade de teste estavam espalhados em três arquivos
diferentes (`aplicativo-mobile.md` 13.11, `interface-admnistrativa-web.md`
14.16, `criterios-de-aceitacao.md`), sem checklist fechada por sprint. Este
arquivo é essa checklist.

## Como usar este documento no fluxo test-first

1. Antes de implementar um item do backlog (`docs/backlog-do-produto.md`),
   localize seu marco na seção 5 abaixo.
2. Escreva os testes listados na tabela **antes** do código — eles devem
   falhar por ausência de implementação, não por erro de digitação.
3. Implemente apenas o necessário para os testes passarem.
4. Cada teste deve citar o(s) identificador(es) que cobre no nome do teste
   (ver convenção na seção 4). Isso permite localizar, por `grep`, qual teste
   garante qual regra.
5. Um item do backlog só fecha (DoD, `docs/definition-of-done.md` §18.2)
   quando todas as linhas da tabela correspondente existirem e passarem.

Os caminhos de arquivo abaixo são relativos à raiz de cada repositório de
aplicação (API, mobile, interface administrativa) — este plano não assume um
monorepo.

---

## 1. Objetivo

Garantir que cada regra de negócio, critério de aceitação e caso de uso do
MVP tenha um teste automatizado nomeado e localizável antes de existir
código de produção que o implemente, para viabilizar desenvolvimento
assistido por IA com o mínimo de intervenção manual em código.

## 2. Fora de escopo deste plano

Itens **P1/P2** (`docs/funcionalidades.md` §8.3–8.4) — dashboard avançado,
notificações, PDF, assinatura, portal do cliente (UC-20) — não têm testes
obrigatórios aqui. Quando entrarem em escopo, devem receber sua própria
seção seguindo a mesma convenção. UC-18 e UC-19 aparecem na seção 5.8 como
*stretch* do marco M8, não como bloqueio de release.

---

## 3. Estratégia de testes por aplicação

### 3.1 API (Java / Spring Boot 4.1.0, Spring Framework 7, Java 21)

| Camada | Ferramenta | Convenção de nome | Contexto Spring? | Quando roda |
|---|---|---|---|---|
| Unit (domínio, sem contexto Spring) | JUnit Jupiter 6 + Mockito 5 + AssertJ | `*Test.java` | Não | a cada build (Surefire) |
| Service (regras de negócio, mocks de repositório/colaboradores) | JUnit Jupiter 6 + Mockito 5 + AssertJ, sem `@SpringBootTest` | `*Test.java` (ou `*ServiceTest.java`) | Não | a cada build (Surefire) |
| Controller / web slice | `@WebMvcTest` + `MockMvcTester` + `@MockitoBean` | `*ControllerTest.java` (slice, opcional — ver 3.1.2) | Parcial (só camada web) | a cada build (Surefire) |
| Repository / persistência | `@DataJpaTest` (+ Testcontainers quando o teste depende de recursos específicos do PostgreSQL) | `*RepositoryTest.java` (novo — ver 3.1.3) | Sim (fatiado) | a cada build (Surefire) ou integração, conforme 3.1.3 |
| Integração (controller + banco real + segurança) | `@SpringBootTest` + Testcontainers (PostgreSQL) + `MockMvcTester` | `*IT.java` | Sim (completo) | build de integração (Failsafe) |
| Segurança | Spring Security Test (`@WithMockUser`, `SecurityMockMvcRequestPostProcessors`) dentro dos `*IT.java` | incluído nos `*IT.java` de cada controller protegido | Sim | build de integração |
| Conformidade de contrato | `swagger-request-validator` (ou equivalente) validando respostas contra `openapi.yaml` | incluído dentro dos `*IT.java` de cada controller | Sim | build de integração |

Estrutura de pacotes de teste espelha `com.fieldops.<feature>` definida em
`docs/arquitetura.md` §11.6, reconciliada com os pacotes efetivamente usados
neste plano (`nonconformity`, `dashboard` — ver
`docs/plano-implementacao-backend.md` §2): `auth`, `user`, `client`, `site`,
`equipment`, `template`, `inspection`, `evidence`, `nonconformity`,
`synchronization`, `review`, `audit`, `dashboard`, `shared`, com subpastas
`domain/`, `application/`, `controller/`, `repository/`.

#### 3.1.1 Dependências de teste (Spring Boot 4.1 — starters modulares)

Spring Boot 4 substituiu o antigo `spring-boot-starter-test` monolítico por
**um starter de teste companheiro para cada starter principal** (`<nome>-test`
com escopo `test`) — confirmado empiricamente ao gerar o `pom.xml` do projeto
em `start.spring.io` para Spring Boot 4.1.0 (ver
`docs/dependencias-spring-initializr.md` §4). Ao selecionar as dependências
principais do projeto, os companheiros de teste correspondentes já vêm
automaticamente, com escopo `test`, sem seleção manual adicional:

| Starter principal selecionado | Companheiro de teste adicionado automaticamente | Habilita |
|---|---|---|
| `spring-boot-starter-webmvc` (Spring Web) | `spring-boot-starter-webmvc-test` | `@WebMvcTest`, `MockMvc`, `MockMvcTester` |
| `spring-boot-starter-data-jpa` | `spring-boot-starter-data-jpa-test` | `@DataJpaTest` |
| `spring-boot-starter-security` | `spring-boot-starter-security-test` | `@WithMockUser`, `SecurityMockMvcRequestPostProcessors` |
| `spring-boot-starter-validation` | `spring-boot-starter-validation-test` | testes de validação de bean |
| `spring-boot-starter-flyway` | `spring-boot-starter-flyway-test` | `FlywayMigrationIT.java` (M1) |
| Testcontainers (dependência própria) | `spring-boot-testcontainers` + `org.testcontainers:testcontainers-junit-jupiter` | `@Testcontainers`, `@ServiceConnection` |

**Não existe mais uma única dependência "de teste" a adicionar manualmente** —
cada `pom.xml` gerado já contém o necessário para as camadas acima assim que
as dependências principais da seção 4 de `docs/dependencias-spring-initializr.md`
são selecionadas. A única exceção é o módulo `org.testcontainers:testcontainers-postgresql`
(nome renomeado no Testcontainers 2.0; a versão anterior chamava-se apenas
`postgresql`), que **precisa ser adicionado manualmente** por ser específico
do banco, não genérico o suficiente para vir com o starter — ver
`docs/dependencias-spring-initializr.md` §7.2.

#### 3.1.2 MockMvc vs. MockMvcTester vs. RestTestClient — qual usar neste projeto

As três opções coexistem no Spring Framework 7 / Spring Boot 4.1 com propósitos
diferentes (fonte: documentação oficial de testes do Spring Boot,
`docs/dependencias-spring-initializr.md` §22):

| Ferramenta | Estilo de assertiva | Quando usar no FieldOps |
|---|---|---|
| `MockMvc` (clássico, Hamcrest) | `mvc.perform(...).andExpect(...)` | Não usar como padrão neste projeto — mantido aqui só para leitura de exemplos legados/tutoriais; **não é a convenção adotada** |
| **`MockMvcTester` (AssertJ, recomendado)** | `assertThat(mvc.get().uri(...)).hasStatusOk()...` | **Padrão para todo `*IT.java` de controller** — já auto-configurado por `@WebMvcTest` e por `@SpringBootTest` + `@AutoConfigureMockMvc`, e usa a mesma biblioteca de assertiva (AssertJ) já fixada na linha "Unit" desta tabela desde a primeira versão deste plano. Não simula um servidor real — roda contra o `DispatcherServlet` em memória, o que é suficiente para os `*ControllerIT.java` já listados na seção 5 |
| `RestTestClient` (novo no Spring Framework 7) | Fluente, pode apontar tanto para `MockMvc` quanto para um servidor real (`RANDOM_PORT`) | **Reservado para o roteiro E2E `AC-RELEASE`** (M8, seção 5.8) caso a equipe decida automatizá-lo contra um servidor real subindo em porta aleatória — não é necessário para os `*ControllerIT.java` do dia a dia, que já são bem cobertos por `MockMvcTester`. Precisa de `@AutoConfigureRestTestClient` explícito — não é auto-configurado como `MockMvcTester` |
| `TestRestTemplate` | Antigo, cliente HTTP simples | Não recomendado para código novo — `RestTestClient`/`WebTestClient` são os sucessores oficiais |

**Decisão para este projeto:** todo `*ControllerIT.java` da seção 5 usa
`MockMvcTester` (injetado via `@Autowired`, com `@SpringBootTest` +
`@AutoConfigureMockMvc` para os testes de integração completos, ou
`@WebMvcTest` para eventuais slices futuras de controller). Isso **não muda
nenhuma linha do backlog da seção 5** — só precisa a ferramenta concreta por
trás do rótulo genérico "Integração" que já estava lá.

#### 3.1.3 Testes de Repository (`@DataJpaTest`) — adição a este plano

A versão anterior deste documento não tinha uma camada de teste dedicada a
`Repository` — a cobertura de persistência acontecia só implicitamente dentro
dos `*ControllerIT.java`. Isso continua sendo suficiente para a maioria dos
casos (RN de integridade referencial, unicidade etc. já são exercitadas
indiretamente). `@DataJpaTest` deve ser adicionado **especificamente** para:

- consultas com `Specification`/filtros compostos complexos (ex.: os filtros
  combinados de `GET /inspections`, `docs/contrato-backend-frontend.md` §9.3);
- verificação de mapeamento objeto-relacional (relacionamentos, `@Version`
  para concorrência otimista) isolada da camada web;
- casos em que reproduzir o cenário via HTTP seria desproporcionalmente mais
  lento que testar o repositório diretamente.

`@DataJpaTest` usa por padrão um banco em memória substituto — **para este
projeto, isso deve ser desabilitado** com
`@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)`
combinado com `@Testcontainers` + `@ServiceConnection` apontando para
PostgreSQL, porque o projeto usa tipos e comportamento específicos do
PostgreSQL (`JSONB`, `CHECK` constraints — `db/schema.sql`) que um banco
em memória genérico não reproduz fielmente. Cada método é transacional por
padrão e sofre rollback ao final (não precisa de limpeza manual). Nenhum item
novo de backlog foi adicionado à seção 5 por causa disso — é uma técnica
disponível a critério de quem implementa cada `*ControllerIT.java`, não uma
obrigação por marco.

#### 3.1.4 Testes de segurança (`spring-security-test`)

Todo `*ControllerIT.java` de um endpoint protegido (ou seja, praticamente
todos, exceto `AuthControllerIT.java` nos cenários de login) deve conter, no
mínimo, dois casos além do caminho feliz:

- **perfil correto e autenticado** — `@WithMockUser(roles = "SUPERVISOR")` (ou
  `.with(SecurityMockMvcRequestPostProcessors.user(...).roles(...))` quando o
  teste precisa de um `id` de usuário específico para checar posse, ex.
  RN-004/RN-033) → espera `200`/`201`, nunca `403`;
- **perfil sem permissão** → mesmo `MockMvcTester`, trocando o `role`, espera
  `403` sem revelar dado do recurso (AC-SECURITY).

`AuthorizationBoundaryIT.java` (M8, seção 5.8) continua sendo o teste que
consolida esses casos de forma transversal (múltiplos controllers, matriz de
perfil × endpoint), mas isso **não substitui** o par de casos acima em cada
`*ControllerIT.java` individual — a cobertura transversal do M8 é uma rede de
segurança adicional, não a única linha de defesa.

### 3.2 Aplicativo mobile (Expo / React Native)

| Camada | Ferramenta | Convenção de nome | Onde fica |
|---|---|---|---|
| Unit (domínio/aplicação) | Jest (`jest-expo`) | `*.test.ts` | coexistente com o arquivo testado |
| Componente | React Native Testing Library | `*.test.tsx` | coexistente com o componente |
| Repositório local / SQLite | Jest + banco SQLite em memória | `*.test.ts` | `infrastructure/database/**` |
| Ponta a ponta (opcional, P1) | Detox ou execução manual roteirizada | — | `e2e/` |

Testes ficam colocados junto ao código-fonte (convenção padrão do
ecossistema Expo/Jest), não em árvore espelhada — reduz o custo de manter
dois diretórios sincronizados.

### 3.3 Interface administrativa (Angular)

| Camada | Ferramenta | Convenção de nome | Onde fica |
|---|---|---|---|
| Unit (services, guards, pipes) | Jasmine + Karma (padrão Angular CLI) | `*.spec.ts` | coexistente com o arquivo testado |
| Componente | Angular Testing Library ou `TestBed` | `*.spec.ts` | coexistente com o componente |
| HTTP | `HttpTestingController` | dentro dos specs de service | — |
| Ponta a ponta (opcional, P1) | Cypress ou Playwright | — | `e2e/` |

---

## 4. Convenção de rastreabilidade

Todo teste que cobre uma regra ou critério documentado deve declarar o
identificador no próprio nome legível do teste:

- **Java:** `@DisplayName("RN-037 — bloqueia conclusão com item obrigatório pendente")`
- **Jest/Jasmine:** `it("RN-037: bloqueia conclusão com item obrigatório pendente", () => { ... })`
- Quando um teste cobre mais de um identificador, todos aparecem separados
  por vírgula no início do nome.
- Cenários de `docs/criterios-de-aceitacao.md` (Dado/Quando/Então) viram um
  `it`/`@Test` por cenário, prefixado pelo `AC-XXX` da seção de origem.

Isso permite `grep -r "RN-037"` em qualquer um dos três repositórios e
encontrar exatamente o teste que a protege.

---

## 5. Backlog de testes por marco

> A matriz de testes por camada (Domain/Service/Controller/Repository/API/
> Segurança/Banco real, com ferramenta e indicação de contexto Spring) já está
> consolidada na tabela da seção 3.1 — não repetida aqui para não haver duas
> versões da mesma informação.

### 5.0 Visão consolidada por funcionalidade (API)

Leitura cruzada das tabelas 5.1–5.8 abaixo, agrupada por funcionalidade em vez
de por marco — útil para checar rapidamente se uma funcionalidade tem lacuna
de camada antes de abrir um PR. `✅` = arquivo já listado nesta seção;
`—` = camada não aplicável ou não obrigatória (ex.: `Repository` só é
obrigatório quando a funcionalidade envolve consulta complexa, seção 3.1.3).

| Funcionalidade | Unitário (domínio) | Service | Controller | Repository | Integração |
|---|---:|---:|---:|---:|---:|
| Autenticação/sessão | ✅ | ✅ | ✅ | — | ✅ |
| Usuários | ✅ | — | ✅ | — | ✅ |
| Cadastros (cliente/local/equipamento) | ✅ (QR único) | — | ✅ | — (opcional p/ filtros) | ✅ |
| Modelos de inspeção (rascunho/publicação) | ✅ | ✅ | ✅ | — | ✅ |
| Planejamento/agendamento | — | — | ✅ | — (opcional p/ filtros de `GET /inspections`) | ✅ |
| Execução/checklist | ✅ | — | ✅ | — | ✅ |
| Não conformidade | — | — | ✅ | — | ✅ |
| Evidências/upload | ✅ | — | ✅ | — | ✅ |
| QR Code | — | — | ✅ | — | ✅ |
| Localização | ✅ | — | — (coberto via start/submit) | — | ✅ |
| Sincronização | ✅ | — | ✅ | — (opcional p/ unicidade de `sync_operations`, `docs/plano-implementacao-backend.md` §4.2) | ✅ |
| Revisão | ✅ | — | ✅ | — | ✅ |
| Auditoria *(P1, stretch)* | — | — | ✅ | — | — |
| Dashboard *(P1, stretch)* | — | — | ✅ | — | — |
| Segurança transversal | — | — | — | — | ✅ |

As tabelas abaixo agrupam por **arquivo de teste alvo** (não por regra
individual) porque um arquivo real cobre várias regras relacionadas com
métodos de teste separados — a coluna "Cobre" lista todos os identificadores
que aquele arquivo deve conter.

### 5.1 M1 — Fundação

Sem RN/AC/UC ainda; o objetivo é infraestrutura executável antes de
qualquer funcionalidade.

| App | Arquivo | Camada | Verifica |
|---|---|---|---|
| API | `shared/ApplicationBootIT.java` | Integração | Contexto Spring sobe com as configurações de ambiente local |
| API | `shared/FlywayMigrationIT.java` | Integração | Migrações aplicam em banco limpo sem erro |
| Mobile | `App.test.tsx` | Componente | App renderiza a rota inicial sem erro |
| Web | `app.component.spec.ts` | Unit | Shell da aplicação inicializa sem erro |

CI de todas as três aplicações deve rodar lint + verificação de tipos nesta
fase (RNF-009), mesmo sem testes de negócio ainda.

### 5.2 M2 — Autenticação (contexto Identidade e acesso)

**API**

| Arquivo | Camada | Cobre |
|---|---|---|
| `auth/domain/SessionPolicyTest.java` | Unit | RN-001, RN-008 |
| `auth/application/AuthenticationServiceTest.java` | Unit | RN-001, RN-007 |
| `auth/controller/AuthControllerIT.java` | Integração | AC-AUTH (login válido, credenciais inválidas, usuário inativo, token expirado, logout), UC-01 |
| `user/domain/UserStatusTransitionTest.java` | Unit | RN-002, RN-008 |
| `user/controller/UserControllerIT.java` | Integração | AC-USERS, RN-002, RN-003, RN-004, RN-005, RN-006, UC-02 |

**Mobile**

| Arquivo | Camada | Cobre |
|---|---|---|
| `features/auth/screens/LoginScreen.test.tsx` | Componente | UC-01, AC-AUTH (mensagem de erro não revela e-mail existente) |
| `infrastructure/storage/secureSession.test.ts` | Unit | Armazenamento seguro de sessão (objetivo 2.3 de `docs/objetivos.md`), AC-AUTH (logout limpa dados sensíveis) |
| `application/auth/refreshSession.test.ts` | Unit | AC-AUTH (token expirado / renovação controlada) |

**Web**

| Arquivo | Camada | Cobre |
|---|---|---|
| `core/auth/auth.guard.spec.ts` | Unit | Proteção de rotas (RNF-007, DoD web §18.4) |
| `core/auth/auth.interceptor.spec.ts` | Unit | Anexação e renovação de token nas requisições |
| `features/auth/login/login.component.spec.ts` | Componente | UC-01 |
| `features/users/user-list/user-list.component.spec.ts` + `user.service.spec.ts` | Componente / Unit | UC-02, AC-USERS |

### 5.3 M3 — Planejamento (Cadastros, Modelos de inspeção, Planejamento)

**API**

| Arquivo | Camada | Cobre |
|---|---|---|
| `client/controller/ClientControllerIT.java` | Integração | AC-MASTER (cliente), RN-009, RN-013, UC-03 |
| `site/controller/SiteControllerIT.java` | Integração | AC-MASTER (local), RN-009, RN-013 |
| `equipment/controller/EquipmentControllerIT.java` | Integração | AC-MASTER (equipamento), RN-010, RN-013 |
| `equipment/domain/QrCodeUniquenessTest.java` | Unit | RN-011 |
| `template/controller/InspectionTemplateControllerIT.java` | Integração | AC-TEMPLATE (criar rascunho, seções, itens), RN-015, RN-016, RN-017, RN-018, UC-04 |
| `template/application/PublishTemplateServiceTest.java` | Unit | AC-TEMPLATE (publicar válido / inválido / alterar modelo já utilizado), RN-015, RN-016, RN-019, RN-020, RN-022, RN-023, UC-05 |
| `inspection/controller/InspectionSchedulingControllerIT.java` | Integração | AC-SCHEDULING, RN-012, RN-014, RN-021, RN-024, RN-025, RN-026, RN-027, RN-029, RN-030, RN-031, UC-06 |
| `inspection/controller/InspectionAdminMonitorControllerIT.java` | Integração | AC-ADMIN-MONITOR, UC-15 |

**Web**

| Arquivo | Camada | Cobre |
|---|---|---|
| `features/clients/client-list/*.spec.ts` | Componente | AC-MASTER (cliente), UC-03 |
| `features/sites/site-list/*.spec.ts` | Componente | AC-MASTER (local), filtro cliente → local |
| `features/equipment/equipment-list/*.spec.ts` | Componente | AC-MASTER (equipamento), filtro local → equipamento |
| `features/templates/template-builder/*.spec.ts` | Componente | AC-TEMPLATE (construtor completo), UC-04, UC-05 |
| `features/inspections/scheduling/*.spec.ts` | Componente | AC-SCHEDULING, UC-06 |
| `features/inspections/monitoring/*.spec.ts` | Componente | AC-ADMIN-MONITOR, UC-15 |

*Mobile: nenhum teste novo neste marco — o app ainda não consome dados de
planejamento.*

### 5.4 M4 — Execução online (checklist e não conformidade, sem recursos nativos)

**API**

| Arquivo | Camada | Cobre |
|---|---|---|
| `inspection/domain/ChecklistValidationTest.java` | Unit | RN-035, RN-036, RN-037, RN-038 |
| `inspection/controller/InspectionExecutionControllerIT.java` | Integração | AC-START, RN-032, RN-033, RN-034, UC-09 |
| `inspection/controller/InspectionResponseControllerIT.java` | Integração | AC-CHECKLIST, RN-035, RN-036 |
| `inspection/controller/InspectionSubmitControllerIT.java` | Integração | AC-COMPLETE (cenários válido/incompleto, sem evidência crítica), RN-037, RN-042, RN-043, RN-044 |
| `nonconformity/controller/NonConformityControllerIT.java` | Integração | AC-NONCONFORMITY, RN-052, RN-053, RN-054, RN-056, RN-057, UC-12 |

**Mobile**

| Arquivo | Camada | Cobre |
|---|---|---|
| `features/checklist/components/*.test.tsx` | Componente | AC-CHECKLIST (um teste por tipo de item; bloqueio de valor inválido; item de tipo desconhecido não derruba o app), UC-10 |
| `features/checklist/hooks/useChecklistProgress.test.ts` | Unit | RN-040, AC-CHECKLIST (recálculo de progresso) |
| `application/inspection/startInspection.test.ts` | Unit | UC-09, RN-033, RN-034, AC-START |
| `application/inspection/saveResponse.test.ts` | Unit | RN-036, RN-038, RN-041, AC-CHECKLIST (persistência local, sobrevive a fechar/reabrir) |
| `application/inspection/completeInspection.test.ts` | Unit | RN-037, RN-042, RN-043, AC-COMPLETE |
| `features/nonconformity/*.test.tsx` | Componente | AC-NONCONFORMITY, UC-12, RN-052, RN-053, RN-054, RN-056 |

*Web: nenhum teste novo — o acompanhamento de estado já é coberto em M3
(`monitoring`), e será reexecutado (sem novo código) quando os primeiros
dados reais de execução chegarem via sincronização em M6.*

### 5.5 M5 — Recursos nativos (câmera, evidências, QR Code, localização)

**API**

| Arquivo | Camada | Cobre |
|---|---|---|
| `evidence/controller/EvidenceControllerIT.java` | Integração | AC-EVIDENCE, RN-045, RN-046, RN-048, RN-049, RN-050, RN-051, UC-11 |
| `evidence/domain/UploadValidationTest.java` | Unit | RN-046, RN-050 |
| `inspection/domain/CriticalNonConformityEvidenceTest.java` | Unit | RN-039, RN-055 |
| `equipment/controller/EquipmentByQrControllerIT.java` | Integração | AC-QR (equipamento não localizado / fora do escopo), RN-063, UC-08 |
| `inspection/domain/GeoLocationCaptureTest.java` | Unit | RN-062 |

**Mobile**

| Arquivo | Camada | Cobre |
|---|---|---|
| `features/evidence/camera/*.test.tsx` | Componente | AC-EVIDENCE (captura, prévia, confirmar/refazer, offline, falha de upload), UC-11 |
| `infrastructure/storage/evidenceQueue.test.ts` | Unit | RN-047, RN-051 |
| `features/scanner/*.test.tsx` | Componente | AC-QR (permissão, leitura única por ciclo, divergência com equipamento previsto, identificação manual alternativa), UC-08, RN-058, RN-059, RN-064 |
| `features/location/*.test.ts` | Unit | AC-LOCATION, RN-058, RN-059, RN-060, RN-061 |

### 5.6 M6 — Offline e sincronização

**API**

| Arquivo | Camada | Cobre |
|---|---|---|
| `synchronization/controller/SyncPushControllerIT.java` | Integração | AC-SYNC (envio bem-sucedido, reenvio idempotente, falha parcial, conflito), RN-067, RN-068, RN-069, RN-070, RN-073, RN-075, RN-076, RN-078, UC-14 |
| `synchronization/controller/SyncPullControllerIT.java` | Integração | AC-SYNC (cursor só avança após persistência), RN-028, UC-07 |
| `synchronization/domain/IdempotencyTest.java` | Unit | RN-067, RN-068 |
| `synchronization/domain/ConflictDetectionTest.java` | Unit | RN-075, RN-076 |

**Mobile**

| Arquivo | Camada | Cobre |
|---|---|---|
| `infrastructure/sync/outbox.test.ts` | Unit | RN-065, RN-066, RN-070, RN-071, RN-072, RN-077, RN-078, AC-SYNC |
| `infrastructure/sync/pullCursor.test.ts` | Unit | Cursor local só avança após persistência bem-sucedida (11.9) |
| `features/inspections/list/*.test.tsx` | Componente | AC-MOBILE-LIST, UC-07 |
| `features/synchronization/screens/SyncScreen.test.tsx` | Componente | RN-071, RN-072, AC-SYNC (estado de sincronização visível) |
| `application/inspection/completeOffline.test.ts` | Unit | UC-13, RN-043, RN-074, AC-COMPLETE (conclusão offline) |

### 5.7 M7 — Revisão

**API**

| Arquivo | Camada | Cobre |
|---|---|---|
| `review/controller/ReviewControllerIT.java` | Integração | AC-REVIEW (iniciar, aprovar, reprovar sem motivo/com motivo), RN-079, RN-080, RN-081, RN-082, RN-084, UC-16, UC-17 |
| `review/domain/ReviewCycleTest.java` | Unit | RN-083, RN-085 |

**Web**

| Arquivo | Camada | Cobre |
|---|---|---|
| `features/reviews/review-detail/*.spec.ts` | Componente | AC-REVIEW, UC-16, UC-17 |

**Mobile**

| Arquivo | Camada | Cobre |
|---|---|---|
| `application/inspection/handleRejection.test.ts` | Unit | Reflexo da reprovação no app — fluxo de correção (`docs/fluxo-geral.md` §7.8), RN-083 |

### 5.8 M8 — Release (auditoria, segurança transversal, ponta a ponta)

**API**

| Arquivo | Camada | Cobre |
|---|---|---|
| `audit/controller/AuditControllerIT.java` | Integração | RN-086, RN-087, RN-088, UC-18 *(P1, stretch)* |
| `inspection/domain/StateTransitionGuardTest.java` | Unit | RN-089 — cobertura de todas as transições inválidas da tabela 7.6 |
| `shared/StandardErrorHandlingIT.java` | Integração | AC-SECURITY (sem stack trace ao cliente, erro padronizado) |
| `security/AuthorizationBoundaryIT.java` | Integração | AC-SECURITY (técnico não acessa inspeção de outro por URL, perfil sem permissão bloqueado, segredos fora de log) |
| `dashboard/controller/DashboardControllerIT.java` | Integração | UC-19 *(P1, stretch)* |

**Processo (não é teste automatizado de código, é verificação de CI)**

| Verificação | Cobre |
|---|---|
| `npx @redocly/cli lint openapi.yaml` no pipeline de CI da API | RN-090 — documentação da API reflete estados/validações/erros implementados |

**E2E (todas as aplicações)**

| Roteiro | Cobre |
|---|---|
| `e2e/ac-release.spec` (Detox/Cypress) ou roteiro manual documentado | AC-RELEASE — os 19 passos de `docs/criterios-de-aceitacao.md` §17.19, executados sem edição manual do banco |

**Checagem final de requisitos não funcionais** (`docs/arquitetura.md` §11.14)

| RNF | Onde é verificado |
|---|---|
| RNF-001 | `infrastructure/sync/outbox.test.ts` (M6) |
| RNF-002 | `shared/StandardErrorHandlingIT.java` |
| RNF-003 | Testes de listagem paginada em cada `*ControllerIT.java` administrativo (M3) |
| RNF-004 | Specs de componente mobile/web cobrindo loading/vazio/erro/offline (M3–M6) |
| RNF-005 | `SyncPushControllerIT.java`, `IdempotencyTest.java` (M6) |
| RNF-006 | Execução manual em dispositivo/emulador Android (DoD mobile §18.3) |
| RNF-007 | `auth.guard.spec.ts` (M2) |
| RNF-008 | Lint do `openapi.yaml` (ver acima) |
| RNF-009 | Lint + typecheck no CI de cada app (M1) |
| RNF-010 | Revisão de PR + `.gitignore`/scanner de segredos (checklist manual, não automatizável neste plano) |
| RNF-011 | `AuditControllerIT.java`, eventos de auditoria cobertos em cada `*ControllerIT.java` que altera estado |
| RNF-012 | READMEs de execução de cada app (checklist manual) |

---

## 6. Definição de pronto para testes (por Pull Request)

Um PR que fecha um item do backlog só é aceito quando:

- todo `it`/`@Test` listado na linha correspondente da seção 5 existe e
  passa (DoD geral, `docs/definition-of-done.md` §18.2 — "critérios de
  aceitação validados", "pelo menos um cenário de exceção verificado");
- o nome do teste cita o identificador RN/AC/UC coberto (seção 4);
- nenhum teste pré-existente listado neste plano regrediu;
- se o PR alterou `openapi.yaml`, o lint (`@redocly/cli lint`) passa sem
  erros antes do merge.

Isso é a mesma régua de `docs/criterios-de-aceitacao.md` §17.1 ("critérios
gerais do produto"), só que expressa como checklist executável por PR em vez
de prosa.

---

## 7. Manutenção deste documento

Sempre que uma regra de negócio, critério de aceitação ou caso de uso for
adicionado, alterado ou removido nos documentos de origem, a linha
correspondente aqui deve ser atualizada no mesmo Pull Request — este plano
não deve divergir da fonte da verdade normativa (`docs/regras-de-negocio.md`,
`docs/criterios-de-aceitacao.md`, `docs/casos-de-uso.md`).

---

## 8. Atualizações realizadas (revisão Spring Boot 4.1.0 / Java 21)

Resumo da revisão feita a partir da pesquisa documentada em
`docs/dependencias-spring-initializr.md`. Não é um changelog linha a linha —
é o suficiente para identificar o que mudou nesta passagem.

**Preservado sem alteração:** a estrutura geral do documento (seções 1–7), a
convenção de rastreabilidade RN/AC/UC no nome do teste (seção 4), o backlog
de testes por marco M1–M8 na íntegra — nenhum arquivo de teste, nenhuma linha
"Cobre" foi removida ou renomeada —, a estratégia de mobile (3.2) e web (3.3),
que não usam JVM e portanto não são afetadas pela migração de versão, e a
definição de pronto por PR (seção 6).

**Atualizado:** a tabela da API em 3.1 passou de "JUnit 5" para "JUnit
Jupiter 6" (Spring Boot 4.1 usa essa versão por padrão), de "MockMvc" para
`MockMvcTester` como convenção padrão (3.1.2), e a referência ao módulo
Testcontainers de PostgreSQL foi corrigida de `postgresql` para
`testcontainers-postgresql` (renomeado no Testcontainers 2.0, que acompanha
Spring Boot 4.1). A tabela também ganhou uma coluna "Contexto Spring?".
`docs/plano-implementacao-backend.md` §1 foi corrigida na mesma revisão (Java
17/Spring Boot 3.3.x eram um placeholder explicitamente marcado como decisão
provisória; agora refletem o mandato de Java 21/Spring Boot 4.1.0).

**Adicionado:** 3.1.1 (dependências de teste modulares do Spring Boot 4.1 e
como isso elimina a necessidade de adicionar manualmente um "starter de
teste" genérico), 3.1.2 (comparação MockMvc vs. `MockMvcTester` vs.
`RestTestClient` e qual usar em cada situação deste projeto), 3.1.3 (testes de
`Repository` com `@DataJpaTest`, camada que não existia neste plano), 3.1.4
(convenção mínima de teste de segurança por controller, usando
`spring-security-test`), e a seção 5.0 (matriz consolidada por
funcionalidade, cruzando as tabelas de marco já existentes sem duplicar seu
conteúdo).

**Corrigido:** nenhuma recomendação da versão anterior deste documento estava
tecnicamente incorreta para Spring Boot 3.x — a correção necessária foi
inteiramente de **versão** (JUnit 5→6, nome do módulo Testcontainers,
`MockMvc`→`MockMvcTester` como padrão), não de conceito. `@MockBean`/`@SpyBean`
nunca chegaram a ser mencionados neste documento, então não havia nada a
corrigir quanto a `@MockitoBean` além de deixar a recomendação explícita
(3.1.2/3.1.4 já assumem `@MockitoBean` implicitamente ao citar
`spring-security-test` e os slices de `@WebMvcTest`).

**Decisões que continuam pendentes** (não resolvidas nesta revisão, listadas
com o identificador correspondente em `docs/dependencias-spring-initializr.md`
§7.2 e em `docs/plano-implementacao-backend.md` §19): biblioteca concreta de
emissão/validação de JWT (jjwt vs. `oauth2-resource-server` com `JwtDecoder`
manual), formato do cursor de sincronização, tabela `sync_operations` ainda
não é uma migração real (só uma proposta), catálogo fechado de `code` de erro
de negócio.
