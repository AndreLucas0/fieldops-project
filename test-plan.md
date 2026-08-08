# Plano de Testes — FieldOps

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

### 3.1 API (Java / Spring Boot)

| Camada | Ferramenta | Convenção de nome | Quando roda |
|---|---|---|---|
| Unit (domínio, sem contexto Spring) | JUnit 5 + Mockito + AssertJ | `*Test.java` | a cada build (Surefire) |
| Integração (controller + banco real) | Spring Boot Test + Testcontainers (PostgreSQL) + MockMvc | `*IT.java` | build de integração (Failsafe) |
| Conformidade de contrato | `swagger-request-validator` (ou equivalente) validando respostas contra `openapi.yaml` | incluído dentro dos `*IT.java` de cada controller | build de integração |

Estrutura de pacotes de teste espelha `com.fieldops.<feature>` definida em
`docs/arquitetura.md` §11.6 (`auth`, `user`, `client`, `site`, `equipment`,
`template`, `inspection`, `evidence`, `synchronization`, `review`, `audit`,
`shared`), com subpastas `domain/`, `application/`, `controller/`.

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
