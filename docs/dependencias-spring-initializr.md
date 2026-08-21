# 23 - Dependências Spring Initializr e Estratégia de Testes (Spring Boot 4.1.0 / Java 21)

> **Status:** documento normativo, produzido a partir de (1) leitura completa de `./docs` (01–19) e dos documentos 20–22 já produzidos neste projeto (`contrato-backend-frontend.md`, `telas-frontend.md`, `plano-implementacao-backend.md`), e (2) pesquisa ativa na documentação oficial do Spring e no próprio Spring Initializr, com **validação empírica** — não apenas leitura de blog — contra `start.spring.io` para `bootVersion=4.1.0` / `javaVersion=21`.
> **Escopo:** (A) quais dependências selecionar no Spring Initializr para gerar o backend; (B) atualização da estratégia de testes já existente em `test-plan.md` — **não** uma documentação de testes paralela (ver seção 8).

## Metodologia de validação (por que este documento pode ser citado com confiança)

A lista de dependências do Spring Initializr publicada em `start.spring.io/metadata/client` é **um catálogo único que cobre todas as versões de Spring Boot simultaneamente** — a presença de um item nessa lista **não garante** compatibilidade com uma versão específica. Isso foi confirmado na prática durante esta pesquisa: `springdoc-openapi` aparece no catálogo geral, mas o próprio gerador do Initializr rejeita essa combinação para `bootVersion=4.1.0` (ver seção 7.2). Por isso, cada dependência listada como "disponível" na seção 4 abaixo foi validada de duas formas:

1. Presença no catálogo (`GET https://start.spring.io/metadata/client`).
2. **Geração real do `pom.xml`** (`GET https://start.spring.io/pom.xml?bootVersion=4.1.0&javaVersion=21&dependencies=...`) — se o servidor retornasse HTTP 400, a dependência foi descartada da lista do Initializr e movida para "implementação posterior" (seção 7.2), independentemente de constar no catálogo geral.

O `pom.xml` final usado como base para as seções 4 e 9 foi gerado com exatamente as 8 dependências da seção 4.1, contra `bootVersion=4.1.0` e `javaVersion=21`, e retornou HTTP 200 — o conteúdo desse `pom.xml` (groupId/artifactId/scope reais) está reproduzido na seção 9.2.

---

# 1. Contexto tecnológico obrigatório

```text
Spring Boot: 4.1.0
Java: 21
Build tool: Maven
```

**Build tool — não é uma escolha arbitrária desta tarefa:** nenhum arquivo de `./docs` fixa Maven ou Gradle explicitamente, mas `README.MD` (raiz do repositório) já documenta a execução do backend como `cd backend && ./mvnw spring-boot:run` — `./mvnw` é o Maven Wrapper, o que só existe em projetos Maven. `docs/plano-implementacao-backend.md` §1 já havia registrado essa mesma conclusão antes desta tarefa. Não há evidência de Gradle em nenhum lugar do repositório (`gradlew`, `build.gradle` etc. não existem). Portanto **Maven** é reportado aqui como fato observado no repositório, não como preferência.

## Correção de versão em relação ao plano de implementação anterior

`docs/plano-implementacao-backend.md` §1 (documento 22, produzido antes desta tarefa) havia assumido "Spring Boot 3.3.x / Java 17" como **placeholder explicitamente marcado** ("versão exata não fixada em nenhum documento — decisão deste plano"), porque nenhum documento de `./docs` fixava uma versão exata naquele momento. Esta tarefa fixa obrigatoriamente Spring Boot 4.1.0 e Java 21 — isso **substitui** aquele placeholder, não o contradiz enquanto decisão de produto (nenhuma regra de negócio dependia da versão exata do framework). O documento 22 já foi atualizado (seção 1, tabela de stack) para refletir esta correção.

---

# 2. Levantamento de necessidades (o que o backend precisa, segundo `./docs`)

Extraído de `arquitetura.md` (§11.6–§11.10), `api-rest.md`, `modelo-de-dados.md`, `regras-de-negocio.md`, `definition-of-done.md` §18.5, e dos documentos 20–22 já produzidos:

- API REST versionada, JSON, upload multipart (`api-rest.md` §12.1).
- Persistência relacional em PostgreSQL, com migrações versionadas (`arquitetura.md` §11.7).
- Autenticação/autorização por perfil, token Bearer (`arquitetura.md` §11.10, `api-rest.md` §12.4).
- Validação de entrada em toda escrita (`definition-of-done.md` §18.5).
- Testes unitários, de integração com banco real, e de conformidade de contrato (`test-plan.md` §3.1, já existente).
- Ambiente local orquestrado (banco + armazenamento de evidências) — já implementado em `docker-compose.yml`.
- Documentação OpenAPI com interface Swagger (`api-rest.md` §12.1 — "Documentação: OpenAPI e interface Swagger").
- Armazenamento de evidências compatível com S3 (`arquitetura.md` §11.8).
- Mapeamento explícito DTO ↔ entidade (`arquitetura.md` §11.6).
- Auditoria e observabilidade (`arquitetura.md` §11.11) — implementação própria, não uma biblioteca de terceiros.

## Matriz de necessidades → dependências

| Necessidade | Tecnologia | Dependência Initializr | Disponível p/ 4.1.0? | Observação |
|---|---|---|:---:|---|
| API REST (controllers, JSON, multipart) | Spring MVC | **Spring Web** | ✅ | Artifact real gerado: `spring-boot-starter-webmvc` (renomeado — seção 6) |
| Persistência relacional | Spring Data JPA | **Spring Data JPA** | ✅ | — |
| Banco PostgreSQL | Driver JDBC | **PostgreSQL Driver** | ✅ | `org.postgresql:postgresql`, `runtime` |
| Validação de entrada | Jakarta Bean Validation | **Validation** | ✅ | — |
| Autenticação/autorização (base) | Spring Security | **Spring Security** | ✅ | Cobre filtro de segurança, `PasswordEncoder`, `@PreAuthorize`; **não** inclui emissão/validação de JWT — ver 7.2 |
| Migrações versionadas | Flyway | **Flyway Migration** | ✅ | Gera `org.flywaydb:flyway-database-postgresql` automaticamente por já haver PostgreSQL selecionado |
| Testes de integração com banco real | Testcontainers | **Testcontainers** | ✅ | Traz `spring-boot-testcontainers` + `org.testcontainers:testcontainers-junit-jupiter`; módulo específico do Postgres **não** vem junto — ver 7.2 |
| Ambiente local (já existe `docker-compose.yml`) | Spring Boot Docker Compose Support | **Docker Compose Support** | ✅ | Auto-detecta serviços do `docker-compose.yml` já presente na raiz do repositório ao rodar localmente |
| Testes unitários/de service/de controller (JUnit, Mockito, AssertJ) | módulos de teste modulares | *(chega automaticamente com cada starter acima — seção 6.1)* | ✅ | Não é selecionável isoladamente em Spring Boot 4.1 — ver seção 6.1 |
| Documentação OpenAPI + Swagger UI | springdoc-openapi | — | ❌ | **Testado empiricamente:** rejeitado pelo Initializr para `bootVersion=4.1.0` (HTTP 400, mensagem `"Dependency 'springdoc-openapi' is not compatible with Spring Boot 4.1.0"`) apesar de a biblioteca em si já suportar Spring Boot 4 (versão 3.0.1+) — ver 7.2 |
| Emissão/validação de token JWT | jjwt / Nimbus JOSE+JWT | — | ❌ | Nenhuma biblioteca de JWT aparece como opção autônoma no catálogo do Initializr — ver 7.2 |
| Hash de senha | `BCryptPasswordEncoder` | *(parte de Spring Security, não uma dependência separada)* | ✅ | Já incluído ao selecionar Spring Security |
| Mapeamento DTO ↔ entidade | MapStruct | — | ❌ | Não consta no catálogo do Initializr em nenhuma categoria — ver 7.2 |
| Armazenamento de evidências compatível com S3 | AWS SDK v2 / cliente MinIO | — | ❌ | Não consta no catálogo do Initializr — ver 7.2 |
| Auditoria/correlação de requisição | filtro próprio (`shared/audit`, `shared/web`) | — | N/A | Implementação própria do domínio, não uma biblioteca |
| Monitoramento/métricas (Actuator) | Spring Boot Actuator | **Actuator** *(disponível, mas não selecionada)* | ✅ | Disponível e compatível, porém **`criterios-de-avaliacao.md` §19.10 lista "monitoramento da aplicação" explicitamente como diferencial pós-MVP**, não requisito — não incluída na lista de seleção (seção 4) por não ter necessidade documentada no MVP; equipe pode adicioná-la sem risco quando decidir perseguir esse diferencial |
| Redução de boilerplate (getters/setters/builders) | Lombok | **Lombok** *(disponível, mas não selecionada)* | ✅ | Nenhum documento de `./docs` menciona Lombok — incluí-la seria "porque é popular", exatamente o que a tarefa pede para evitar. Não incluída na seleção |
| Lint/análise estática (RNF-009) | Checkstyle / Spotless | — | N/A | É um **plugin de build**, não uma dependência de biblioteca — não aparece no Initializr (que só lista dependências) |

---

# 3. Resultado da pesquisa sobre testes (Spring Boot 4.1 / Spring Framework 7 / Java 21)

Resumo das descobertas que fundamentam a atualização de `test-plan.md` (a atualização em si já foi aplicada diretamente naquele arquivo — ver `test-plan.md` §3.1–3.1.4 e §8 "Atualizações realizadas"; esta seção documenta a pesquisa que a embasou, para quem quiser auditar a fonte).

| Descoberta | Fonte | Impacto |
|---|---|---|
| Spring Boot 4 **modularizou** `spring-boot-autoconfigure` em módulos por tecnologia; cada starter principal agora tem um "starter de teste" companheiro (`<starter>-test`, escopo `test`), adicionado **automaticamente** ao selecionar o starter principal no Initializr | [Modularizing Spring Boot](https://spring.io/blog/2025/10/28/modularizing-spring-boot/), confirmado empiricamente no `pom.xml` gerado (seção 9.2) | `spring-boot-starter-test` monolítico não existe mais como conceito central; `test-plan.md` §3.1.1 documenta o mapeamento |
| `@MockBean`/`@SpyBean` foram **removidos** em Spring Boot 4.0 (estavam depreciados desde 3.4) | [Spring Boot 4.0 Migration Guide](https://github.com/spring-projects/spring-boot/wiki/Spring-Boot-4.0-Migration-Guide) | Usar `@MockitoBean`/`@MockitoSpyBean` (Spring Framework 6.2+/7.x) — `test-plan.md` §3.1.2/3.1.4 |
| `@WebMvcTest` auto-configura tanto `MockMvc` quanto `MockMvcTester` (este último baseado em AssertJ); `MockMvcTester` é a forma recomendada quando AssertJ está no classpath | [Testing Spring Boot Applications — documentação oficial](https://docs.spring.io/spring-boot/reference/testing/spring-boot-applications.html) | `test-plan.md` §3.1.2 adota `MockMvcTester` como padrão do projeto |
| `RestTestClient` (novo em Spring Framework 7) unifica capacidades de `MockMvc` e `WebTestClient`; pode apontar tanto para um `MockMvc` em memória quanto para um servidor real; **não é auto-configurado** — exige `@AutoConfigureRestTestClient` | [RestTestClient — Guia Baeldung](https://www.baeldung.com/spring-resttestclient-guide), [The state of HTTP clients in Spring](https://spring.io/blog/2025/09/30/the-state-of-http-clients-in-spring/) | Reservado para o roteiro E2E `AC-RELEASE` (M8) — `test-plan.md` §3.1.2 |
| JUnit 6.0 é a versão padrão em Spring Boot 4.0/4.1 (JUnit 5 → 6, "drop-in replacement na maioria dos casos"); JUnit 4/Vintage é depreciado | [What's New in JUnit 6](https://medium.com/javarevisited/whats-new-in-junit-6-key-changes-and-improvements-551a84d7ed1f), Release Notes do Spring Boot 4.0 | `test-plan.md` §3.1 atualizado de "JUnit 5" para "JUnit Jupiter 6" |
| Testcontainers 2.0 renomeou módulos de banco (`postgresql` → `testcontainers-postgresql`); JUnit 4 removido do Testcontainers | [What's New for Testing in Spring Boot 4](https://rieckpil.de/whats-new-for-testing-in-spring-boot-4-0-and-spring-framework-7/), confirmado empiricamente no `pom.xml` gerado | `test-plan.md` §3.1 e §3.1.1 corrigidos |
| `@DataJpaTest` continua existindo e configurando um banco em memória por padrão; para usar Testcontainers com Postgres real é preciso `@AutoConfigureTestDatabase(replace = Replace.NONE)` + `@ServiceConnection` | [Document how to use @ServiceConnection for @DataJpaTest #35121](https://github.com/spring-projects/spring-boot/issues/35121), padrão confirmado em múltiplas fontes | Novo em `test-plan.md` §3.1.3 — camada de teste de Repository que não existia no plano anterior |
| `spring-security-test` continua fornecendo `@WithMockUser` e `SecurityMockMvcRequestPostProcessors`, compatível com Spring Security 7 (a versão referenciada nos exemplos oficiais já é a 7.0.x) | [WithMockUser — Spring Security 7.0.5 API](https://docs.spring.io/spring-security/reference/api/java/org/springframework/security/test/context/support/WithMockUser.html) | Novo em `test-plan.md` §3.1.4 — convenção mínima de teste de segurança por controller |
| `@MockitoBean`/`@MockitoSpyBean` em Spring Framework 7 não têm mais a restrição de aplicar-se somente a beans singleton | [rieckpil.de — What's New for Testing](https://rieckpil.de/whats-new-for-testing-in-spring-boot-4-0-and-spring-framework-7/) | Sem impacto direto no backlog atual (o projeto não usa beans com escopo não-singleton), registrado para referência futura |
| Mockito 5.20, AssertJ 3.27.6, Hamcrest 3.0 são as versões que acompanham o BOM do Spring Boot 4.1 | [rieckpil.de — What's New for Testing](https://rieckpil.de/whats-new-for-testing-in-spring-boot-4-0-and-spring-framework-7/) | Confirma que nenhuma versão precisa ser fixada manualmente no `pom.xml` — o `spring-boot-starter-parent` já resolve isso |

---

# 4. Dependências para gerar o projeto

Estas 8 dependências foram validadas com uma geração real de `pom.xml` contra `bootVersion=4.1.0`/`javaVersion=21` (HTTP 200 — conteúdo completo na seção 9.2).

## 4.1 Spring Web

```text
Nome no Initializr: Spring Web
groupId: org.springframework.boot
artifactId: spring-boot-starter-webmvc
```

**Finalidade:** infraestrutura de controllers REST (Spring MVC), serialização JSON, upload `multipart/form-data`. **Motivo:** todo o contrato de `openapi.yaml` é uma API REST síncrona (`api-rest.md` §12.1). **Módulos de `./docs` que dependem dela:** todos os 14 domínios de endpoint do documento 20 (`auth, user, client, site, equipment, template, inspection, evidence, nonconformity, review, synchronization, audit, dashboard`).

> **Nota de nomenclatura:** em versões anteriores do Spring Boot este artefato chamava-se `spring-boot-starter-web`. Em Spring Boot 4.1, a modularização (seção 3) renomeou-o para `spring-boot-starter-webmvc` — confirmado tanto pela URL da documentação oficial (`.../boot/webmvc/test/autoconfigure/WebMvcTest.html`) quanto pelo `pom.xml` gerado.

## 4.2 Spring Data JPA

```text
Nome no Initializr: Spring Data JPA
groupId: org.springframework.boot
artifactId: spring-boot-starter-data-jpa
```

**Finalidade:** persistência ORM sobre as 15 tabelas de `db/schema.sql`. **Motivo:** `arquitetura.md` §11.7 fixa PostgreSQL relacional com controle de versão otimista (`@Version`) e transações — o modelo de domínio inteiro (`modelo-de-dados.md`) é relacional. **Módulos dependentes:** todos os que persistem entidade (praticamente todos os domínios, exceto `synchronization` de leitura pura em alguns casos).

## 4.3 PostgreSQL Driver

```text
Nome no Initializr: PostgreSQL Driver
groupId: org.postgresql
artifactId: postgresql
```

**Finalidade:** driver JDBC para PostgreSQL 16 (`docker-compose.yml`, imagem `postgres:16-alpine`). **Motivo:** `arquitetura.md` §11.7. **Módulos dependentes:** toda a camada de persistência.

## 4.4 Validation

```text
Nome no Initializr: Validation
groupId: org.springframework.boot
artifactId: spring-boot-starter-validation
```

**Finalidade:** Jakarta Bean Validation (`@NotNull`, `@Size`, `@Email` etc.) nos DTOs de request. **Motivo:** `definition-of-done.md` §18.5 exige "validação de entrada implementada" em cada endpoint; todo DTO de escrita em `openapi.yaml` declara restrições de formato (`maxLength`, `required` etc.) que precisam de aplicação real no servidor. **Módulos dependentes:** todo endpoint de escrita (`POST`/`PUT`/`PATCH`).

## 4.5 Spring Security

```text
Nome no Initializr: Spring Security
groupId: org.springframework.boot
artifactId: spring-boot-starter-security
```

**Finalidade:** filtro de autenticação/autorização, `PasswordEncoder`, integração com `@PreAuthorize`. **Motivo:** RN-001 a RN-008, matriz de permissão completa em `contrato-backend-frontend.md` §6.6, exigência de Bearer Token em `api-rest.md` §12.1/§12.4. **Módulos dependentes:** `auth`, `user`, e a autorização por perfil de todos os demais domínios. **Importante:** esta dependência cobre a *infraestrutura* de segurança — a emissão/validação específica de **JWT** não vem incluída (ver seção 7.2).

## 4.6 Flyway Migration

```text
Nome no Initializr: Flyway Migration
groupId (auto-adicionado pelo Initializr por já haver PostgreSQL selecionado): org.flywaydb
artifactId: flyway-database-postgresql
```

**Finalidade:** migrações de schema versionadas. **Motivo:** `arquitetura.md` §11.7 ("Migrações versionadas"); o próprio `db/schema.sql` instrui em comentário que deve ser dividido em scripts `V1__..., V2__...` — exatamente a convenção Flyway. **Módulos dependentes:** todo o schema (`docs/plano-implementacao-backend.md` §4 já planeja a sequência `V1`–`V9`).

## 4.7 Testcontainers

```text
Nome no Initializr: Testcontainers
groupId: org.springframework.boot / org.testcontainers
artifactId: spring-boot-testcontainers (escopo test) + org.testcontainers:testcontainers-junit-jupiter (escopo test)
```

**Finalidade:** subir um PostgreSQL real em contêiner durante os testes de integração. **Motivo:** `test-plan.md` §3.1 já nomeia Testcontainers como ferramenta de integração desde antes desta tarefa. **Módulos dependentes:** todo `*IT.java` da seção 5 de `test-plan.md`. **Atenção:** o módulo específico do PostgreSQL (`org.testcontainers:testcontainers-postgresql`) **não vem incluído** — precisa ser adicionado manualmente (seção 7.2).

## 4.8 Docker Compose Support

```text
Nome no Initializr: Docker Compose Support
groupId: org.springframework.boot
artifactId: spring-boot-docker-compose
```

**Finalidade:** detectar automaticamente o `docker-compose.yml` já existente na raiz do repositório ao rodar a aplicação localmente (`bootRun`/`spring-boot:run`), configurando `DataSource` etc. sem exigir que o desenvolvedor suba os contêineres manualmente antes. **Motivo:** o arquivo `docker-compose.yml` já existe no projeto e já é a forma documentada de subir o ambiente local (`arquitetura.md` §11.12, comentário do próprio `docker-compose.yml`: "cada aplicação... roda fora deste arquivo... apontando para os serviços aqui expostos"). Esta dependência é a integração oficial do Spring Boot com esse arquivo já existente, reduzindo passos manuais de setup. **Módulos dependentes:** ambiente de desenvolvimento local (não afeta produção, onde a variável `SPRING_PROFILES_ACTIVE` aponta para configuração própria).

---

# 5. (referenciada pela seção 2 acima — matriz de necessidades)

---

# 6. Consequência da modularização do Spring Boot 4.1 sobre a lista de dependências

## 6.1 Test starters automáticos

Diferente de versões anteriores do Spring Boot, **não existe uma dependência "de teste" a selecionar isoladamente**. Ao selecionar as 8 dependências da seção 4, o Initializr adiciona automaticamente, com escopo `test`, os seguintes companheiros (confirmado no `pom.xml` gerado, seção 9.2):

| Dependência principal | Companheiro de teste automático |
|---|---|
| Spring Web | `spring-boot-starter-webmvc-test` |
| Spring Data JPA | `spring-boot-starter-data-jpa-test` |
| Spring Security | `spring-boot-starter-security-test` |
| Validation | `spring-boot-starter-validation-test` |
| Flyway Migration | `spring-boot-starter-flyway-test` |
| Testcontainers | `spring-boot-testcontainers` + `org.testcontainers:testcontainers-junit-jupiter` |

Cada um desses habilita, respectivamente: `@WebMvcTest`/`MockMvc`/`MockMvcTester`; `@DataJpaTest`; `@WithMockUser`/`SecurityMockMvcRequestPostProcessors`; validação de bean em teste; `FlywayMigrationIT` (M1 de `test-plan.md`); `@Testcontainers`/`@ServiceConnection`. JUnit Jupiter 6, Mockito 5 e AssertJ chegam transitivamente junto com esses companheiros — não há artefato separado a adicionar para eles.

## 6.2 Nomes de artefato que mudaram em relação a versões anteriores do Spring Boot

| Onde | Nome antigo (Spring Boot 3.x) | Nome atual (Spring Boot 4.1) |
|---|---|---|
| Starter web | `spring-boot-starter-web` | `spring-boot-starter-webmvc` |
| Dependência "de teste" genérica | `spring-boot-starter-test` (uma só, para tudo) | Uma `-test` por starter principal (seção 6.1) |
| Módulo Testcontainers do JUnit 5 | `org.testcontainers:junit-jupiter` | `org.testcontainers:testcontainers-junit-jupiter` |
| Módulo Testcontainers do PostgreSQL | `org.testcontainers:postgresql` | `org.testcontainers:testcontainers-postgresql` |
| `@MockBean`/`@SpyBean` | Suportado (depreciado desde 3.4) | **Removido** — usar `@MockitoBean`/`@MockitoSpyBean` |

Isso é relevante para quem copiar exemplos de tutoriais/Stack Overflow escritos para Spring Boot 3.x — vários desses nomes não compilam mais sem ajuste.

---

# 7. Separação entre Initializr e implementação posterior

## 7.1 Dependências disponíveis no Initializr (selecionar na geração)

Spring Web · Spring Data JPA · PostgreSQL Driver · Validation · Spring Security · Flyway Migration · Testcontainers · Docker Compose Support — detalhadas na seção 4.

## 7.2 Dependências e configurações posteriores

| Funcionalidade | Biblioteca/módulo sugerido | Motivo | Por que não está no Initializr | Momento recomendado |
|---|---|---|---|---|
| Módulo Testcontainers específico do PostgreSQL | `org.testcontainers:testcontainers-postgresql` (`test`) | Necessário para `@ServiceConnection` com `PostgreSQLContainer` nos `*IT.java` | A dependência "Testcontainers" do Initializr só traz o núcleo genérico (JUnit 5 + Spring Boot glue); módulos de banco específicos nunca fizeram parte dela, em nenhuma versão do Spring Boot | Sprint 1 (`docs/plano-implementacao-backend.md` §13, junto com `FlywayMigrationIT.java`) |
| Emissão e validação de token JWT | `io.jsonwebtoken:jjwt-api`/`jjwt-impl`/`jjwt-jackson` **ou**, alternativamente, o starter **OAuth2 Resource Server** (também disponível no Initializr, mas não selecionado por padrão — ver nota abaixo) configurado com um `JwtDecoder` manual sobre chave simétrica | `api-rest.md` §12.4 exige Bearer JWT; Spring Security (seção 4.5) fornece a infraestrutura de autenticação, não o formato de token em si | Nenhuma biblioteca de JWT autônoma (`jjwt`, `nimbus-jose-jwt`) aparece como opção selecionável no catálogo do Initializr | Sprint 2 (M2, `docs/plano-implementacao-backend.md` §13) — **decisão entre as duas abordagens ainda em aberto**, registrada como PEND-B04 em `docs/plano-implementacao-backend.md` §19 |
| Mapeamento DTO ↔ entidade | MapStruct (`org.mapstruct:mapstruct` + `mapstruct-processor`) | `arquitetura.md` §11.6 exige "Mapper: conversão explícita entre camadas" | Não consta no catálogo do Initializr em nenhuma categoria | Desde o Sprint 1 (configuração do `pom.xml`), uso efetivo a partir do Sprint 2 |
| Documentação Swagger UI sobre `openapi.yaml` estático | `org.springdoc:springdoc-openapi-starter-webmvc-ui` | `api-rest.md` §12.1 exige "interface Swagger"; `docs/plano-implementacao-backend.md` §11 já decidiu manter `openapi.yaml` como fonte manual, usando springdoc apenas para servir a UI sobre o arquivo estático | **Confirmado incompatível especificamente com a seleção via Initializr** para `bootVersion=4.1.0` (erro 400 documentado na seção 2), embora a biblioteca em si (a partir da versão 3.0.1) já declare suporte a Spring Boot 4 — é um caso de o catálogo do Initializr ainda não ter sido atualizado para essa combinação, não de incompatibilidade real | Sprint 8, ou quando a equipe verificar que uma versão do springdoc já foi liberada para seleção no Initializr para 4.1.0 (reverificar periodicamente) |
| Armazenamento de evidências compatível com S3 | `software.amazon.awssdk:s3` (AWS SDK v2) | `arquitetura.md` §11.8; `docker-compose.yml` já sobe MinIO (S3-compatível) como serviço `evidence-storage` | Não consta no catálogo do Initializr | Sprint 5 (M5, upload de evidências) |
| Lint/análise estática (RNF-009) | Plugin Maven `maven-checkstyle-plugin` ou `spotless-maven-plugin` | `arquitetura.md` §11.14 (RNF-009) | É um **plugin de build**, categoria que o Spring Initializr não gerencia (só gerencia `dependencies`) | Sprint 1 |
| Validação de contrato OpenAPI em teste | `com.atlassian.oai:swagger-request-validator-mockmvc` (escopo `test`) | `test-plan.md` §3.1 já nomeia essa ferramenta | Biblioteca de terceiros não afiliada ao Spring, não consta no catálogo do Initializr | Sprint 2, junto com os primeiros `*IT.java` |

**Nota sobre OAuth2 Resource Server:** este é o único item acima cuja alternativa **está**, de fato, disponível diretamente no Initializr (`oauth2-resource-server`, testado e compatível com `bootVersion=4.1.0`) — mas não foi incluída na lista da seção 4 porque **selecioná-la sozinha não resolve a necessidade**: ela cobre a *validação* de um JWT já emitido por alguém, tipicamente configurada para confiar em um provedor de identidade externo (`issuer-uri`). O projeto precisa de um serviço que **também emita** o token (o próprio `POST /auth/login`), o que exige código próprio de qualquer forma — com ou sem essa dependência. A decisão entre usá-la (configurando um `JwtDecoder` manual sobre uma chave simétrica) ou implementar um filtro próprio com `jjwt` é uma escolha de arquitetura de autenticação que este documento não decide por conta própria (ver PEND-B04 em `docs/plano-implementacao-backend.md` §19) — apenas registra que ambos os caminhos são tecnicamente viáveis e nenhum dos dois está pronto para uso sem código adicional.

---

# 8. Relação com a documentação de testes existente

A atualização completa da estratégia de testes **foi aplicada diretamente em `test-plan.md`** (não duplicada aqui), conforme exigido pela tarefa. As alterações concretas:

- `test-plan.md` §3.1: tabela da API expandida com a coluna "Contexto Spring?", `JUnit 5` → `JUnit Jupiter 6`, `MockMvc` → `MockMvcTester`, referência ao módulo Testcontainers corrigida, e uma nova linha para testes de `Repository`.
- `test-plan.md` §3.1.1 (nova): dependências de teste modulares do Spring Boot 4.1.
- `test-plan.md` §3.1.2 (nova): comparação `MockMvc` vs. `MockMvcTester` vs. `RestTestClient` e decisão de qual usar em cada situação do projeto.
- `test-plan.md` §3.1.3 (nova): quando e como usar `@DataJpaTest`.
- `test-plan.md` §3.1.4 (nova): convenção mínima de teste de segurança (`spring-security-test`) por controller.
- `test-plan.md` §5.0 (nova): matriz consolidada por funcionalidade, cruzando (sem duplicar) as tabelas de marco M1–M8 já existentes.
- `test-plan.md` §8 (nova, final): "Atualizações realizadas", resumindo o que foi preservado, atualizado, adicionado e corrigido — e o que continua pendente.
- **Nada foi removido** do backlog de testes por marco (seção 5 original) — nenhum arquivo `*Test.java`/`*IT.java`/`*.test.ts`/`*.spec.ts` já listado mudou de nome ou desapareceu.

---

# 9. Geração esperada do projeto

## 9.1 Configuração do Spring Initializr

```text
Project: Maven
Language: Java
Spring Boot: 4.1.0
Packaging: Jar
Java: 21
Group: com.fieldops
Artifact: [A DEFINIR]
```

**Packaging = Jar** não é arbitrário: `docs/plano-implementacao-backend.md` §1/§15 já planeja um `Dockerfile` multi-stage produzindo uma imagem `eclipse-temurin:21-jre-alpine` executando um artefato via `java -jar`, e nenhum documento menciona implantação em servlet container externo (Tomcat/JBoss standalone) — WAR não se aplica a esse desenho. **Group = com.fieldops** vem diretamente da estrutura de pacotes já fixada em `arquitetura.md` §11.6 (`com.fieldops.<feature>`) e usada em todo o `test-plan.md`. **Artifact** não tem um nome literal fixado em nenhum documento (o `README.MD` usa a pasta `backend/` como nome de diretório do repositório, o que não é necessariamente o `artifactId` do Maven) — marcado como `[A DEFINIR]`, decisão de time.

Dependências a selecionar: **Spring Web, Spring Data JPA, PostgreSQL Driver, Validation, Spring Security, Flyway Migration, Testcontainers, Docker Compose Support** (seção 4).

## 9.2 `pom.xml` resultante (gerado e validado em `start.spring.io`, HTTP 200)

```xml
<?xml version="1.0" encoding="UTF-8"?>
<project xmlns="http://maven.apache.org/POM/4.0.0" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
	xsi:schemaLocation="http://maven.apache.org/POM/4.0.0 https://maven.apache.org/xsd/maven-4.0.0.xsd">
	<modelVersion>4.0.0</modelVersion>
	<parent>
		<groupId>org.springframework.boot</groupId>
		<artifactId>spring-boot-starter-parent</artifactId>
		<version>4.1.0</version>
		<relativePath/>
	</parent>
	<groupId>com.fieldops</groupId>
	<artifactId>api</artifactId>
	<version>0.0.1-SNAPSHOT</version>
	<name>api</name>
	<properties>
		<java.version>21</java.version>
	</properties>
	<dependencies>
		<dependency>
			<groupId>org.springframework.boot</groupId>
			<artifactId>spring-boot-starter-data-jpa</artifactId>
		</dependency>
		<dependency>
			<groupId>org.springframework.boot</groupId>
			<artifactId>spring-boot-starter-flyway</artifactId>
		</dependency>
		<dependency>
			<groupId>org.springframework.boot</groupId>
			<artifactId>spring-boot-starter-security</artifactId>
		</dependency>
		<dependency>
			<groupId>org.springframework.boot</groupId>
			<artifactId>spring-boot-starter-validation</artifactId>
		</dependency>
		<dependency>
			<groupId>org.springframework.boot</groupId>
			<artifactId>spring-boot-starter-webmvc</artifactId>
		</dependency>
		<dependency>
			<groupId>org.flywaydb</groupId>
			<artifactId>flyway-database-postgresql</artifactId>
		</dependency>
		<dependency>
			<groupId>org.springframework.boot</groupId>
			<artifactId>spring-boot-docker-compose</artifactId>
			<scope>runtime</scope>
			<optional>true</optional>
		</dependency>
		<dependency>
			<groupId>org.postgresql</groupId>
			<artifactId>postgresql</artifactId>
			<scope>runtime</scope>
		</dependency>
		<dependency>
			<groupId>org.springframework.boot</groupId>
			<artifactId>spring-boot-starter-data-jpa-test</artifactId>
			<scope>test</scope>
		</dependency>
		<dependency>
			<groupId>org.springframework.boot</groupId>
			<artifactId>spring-boot-starter-flyway-test</artifactId>
			<scope>test</scope>
		</dependency>
		<dependency>
			<groupId>org.springframework.boot</groupId>
			<artifactId>spring-boot-starter-security-test</artifactId>
			<scope>test</scope>
		</dependency>
		<dependency>
			<groupId>org.springframework.boot</groupId>
			<artifactId>spring-boot-starter-validation-test</artifactId>
			<scope>test</scope>
		</dependency>
		<dependency>
			<groupId>org.springframework.boot</groupId>
			<artifactId>spring-boot-starter-webmvc-test</artifactId>
			<scope>test</scope>
		</dependency>
		<dependency>
			<groupId>org.springframework.boot</groupId>
			<artifactId>spring-boot-testcontainers</artifactId>
			<scope>test</scope>
		</dependency>
		<dependency>
			<groupId>org.testcontainers</groupId>
			<artifactId>testcontainers-junit-jupiter</artifactId>
			<scope>test</scope>
		</dependency>
		<dependency>
			<groupId>org.testcontainers</groupId>
			<artifactId>testcontainers-postgresql</artifactId>
			<scope>test</scope>
		</dependency>
	</dependencies>
	<build>
		<plugins>
			<plugin>
				<groupId>org.springframework.boot</groupId>
				<artifactId>spring-boot-maven-plugin</artifactId>
			</plugin>
		</plugins>
	</build>
</project>
```

**Nota:** o `pom.xml` acima já inclui `org.testcontainers:testcontainers-postgresql`, apesar de a seção 7.2 registrá-lo como "implementação posterior" — isso não é uma contradição: o gerador do Initializr o adiciona **automaticamente** assim que detecta a combinação "Testcontainers + PostgreSQL Driver" selecionados juntos, mesmo esse módulo não sendo, por si só, uma opção selecionável isoladamente na lista de dependências (não existe um item de catálogo "Testcontainers PostgreSQL"). A seção 7.2 permanece correta quanto à intenção da tarefa (não é possível selecionar esse módulo isoladamente, independente do restante); a geração real mostra que, neste caso específico, ele chega de qualquer forma como efeito colateral positivo da combinação escolhida.

---

# 10. Validação final

## 10.1 Validação das dependências (seção 4)

| Dependência | Validação |
|---|---|
| Spring Web | ✅ Presente no `pom.xml` gerado (HTTP 200) como `spring-boot-starter-webmvc` |
| Spring Data JPA | ✅ Presente como `spring-boot-starter-data-jpa` |
| PostgreSQL Driver | ✅ Presente como `org.postgresql:postgresql` |
| Validation | ✅ Presente como `spring-boot-starter-validation` |
| Spring Security | ✅ Presente como `spring-boot-starter-security` |
| Flyway Migration | ✅ Presente como `flyway-database-postgresql` |
| Testcontainers | ✅ Presente como `spring-boot-testcontainers` + `testcontainers-junit-jupiter` |
| Docker Compose Support | ✅ Presente como `spring-boot-docker-compose` |
| ~~springdoc-openapi~~ | ❌ Removida da lista após HTTP 400 confirmado — movida para seção 7.2 |

Nenhuma dependência da seção 4 permaneceu na lista sem confirmação de que "pode realmente ser selecionada no Spring Initializr para Spring Boot 4.1.0" — todas as 8 foram confirmadas pela geração real do `pom.xml` (seção 9.2), não apenas pela presença no catálogo geral.

## 10.2 Validação dos testes (seções 3 e `test-plan.md` §3.1–3.1.4)

| Item | Compatível com Boot 4.1 + Java 21 + Spring Framework 7? | Fonte |
|---|:---:|---|
| JUnit Jupiter 6 | ✅ | Release notes oficiais do Spring Boot 4.0 |
| Mockito 5.20 | ✅ | Documentado como versão do BOM |
| AssertJ 3.27.6 | ✅ | Idem |
| `@WebMvcTest` + `MockMvcTester` | ✅ | Documentação oficial de testes do Spring Boot 4.1.0 |
| `@MockitoBean`/`@MockitoSpyBean` | ✅ (substituem `@MockBean`/`@SpyBean`, removidos) | Wiki de migração do Spring Boot 4.0 |
| `RestTestClient` | ✅ (novo, exige `@AutoConfigureRestTestClient`) | Javadoc oficial Spring Framework 7.0.x, Baeldung |
| `@DataJpaTest` + `@ServiceConnection` | ✅ | Issue oficial do repositório spring-boot no GitHub |
| `spring-security-test` / `@WithMockUser` | ✅ (docs já na versão 7.0.5) | Documentação oficial do Spring Security |
| `org.testcontainers:testcontainers-postgresql` | ✅ (nome pós-renomeação do Testcontainers 2.0) | Confirmado empiricamente no `pom.xml` gerado |

Nenhum exemplo ou convenção de Spring Boot 3.x foi mantido em `test-plan.md` sem correção — os pontos de divergência (nomes de artefato, `@MockBean`, versão do JUnit) foram todos identificados e corrigidos, listados em `test-plan.md` §8.

---

# 11. Referências

- [Spring Boot 4.1 Release Highlights](https://spring.io/projects/release-highlights/)
- [Spring Boot 4.1.0 available now (blog oficial)](https://spring.io/blog/2026/06/10/spring-boot-4/)
- [Spring Boot 4.1 Release Notes (wiki oficial)](https://github.com/spring-projects/spring-boot/wiki/Spring-Boot-4.1-Release-Notes)
- [Spring Boot 4.0 Migration Guide](https://github.com/spring-projects/spring-boot/wiki/Spring-Boot-4.0-Migration-Guide)
- [Testing Spring Boot Applications — documentação oficial](https://docs.spring.io/spring-boot/reference/testing/spring-boot-applications.html)
- [WebMvcTest (Spring Boot 4.1.0 API)](https://docs.spring.io/spring-boot/api/java/org/springframework/boot/webmvc/test/autoconfigure/WebMvcTest.html)
- [Modularizing Spring Boot (blog oficial)](https://spring.io/blog/2025/10/28/modularizing-spring-boot/)
- [The state of HTTP clients in Spring (blog oficial)](https://spring.io/blog/2025/09/30/the-state-of-http-clients-in-spring/)
- [RestTestClient (Spring Framework 7.0.8 API)](https://docs.spring.io/spring-framework/docs/7.0.x/javadoc-api/org/springframework/test/web/servlet/client/RestTestClient.html)
- [A Guide to RestTestClient — Baeldung](https://www.baeldung.com/spring-resttestclient-guide)
- [What's New for Testing in Spring Boot 4 and Spring Framework 7 — rieckpil.de](https://rieckpil.de/whats-new-for-testing-in-spring-boot-4-0-and-spring-framework-7/)
- [WithMockUser (Spring Security 7.0.5 API)](https://docs.spring.io/spring-security/reference/api/java/org/springframework/security/test/context/support/WithMockUser.html)
- [Running a Test as a User in Spring MVC Test — Spring Security Reference](https://docs.spring.io/spring-security/reference/servlet/test/mockmvc/authentication.html)
- [Document how to use @ServiceConnection for @DataJpaTest — GitHub Issue #35121](https://github.com/spring-projects/spring-boot/issues/35121)
- [springdoc-openapi v4 — página oficial](https://springdoc.org/v4/)
- Spring Initializr — `https://start.spring.io/metadata/client` e `https://start.spring.io/pom.xml` (consultados diretamente, respostas brutas usadas como fonte primária nas seções 2, 6 e 9.2)

---

# 12. Pendências desta análise

| ID | Item | Decisão necessária |
|---|---|---|
| PEND-D01 | Biblioteca de emissão/validação de JWT (`jjwt` vs. `oauth2-resource-server` + `JwtDecoder` manual) | **[DECISÃO NECESSÁRIA]** — ambas tecnicamente viáveis, nenhuma documentada como escolhida (seção 7.2) |
| PEND-D02 | `Artifact` (nome do módulo Maven) não fixado em nenhum documento | **[A DEFINIR]** — seção 9.1 |
| PEND-D03 | Quando o `springdoc-openapi` passar a ser selecionável no Initializr para uma versão 4.1.x, reavaliar se deve migrar de "posterior" para a lista de seleção direta | **[PENDÊNCIA]** de acompanhamento, não bloqueia início do projeto |

Estes itens **não bloqueiam** a geração do projeto pela seção 9 — todos afetam apenas decisões que podem ser tomadas depois, sem custo de retrabalho de estrutura (mesma observação já usada em `docs/telas-frontend.md` §21/§22 para pendências de baixo risco).
