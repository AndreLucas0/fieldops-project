# 22 - Plano de Implementação Técnica do Backend

> **Status:** documento normativo de execução. **Fontes primárias:** `./docs` (01–19), `docs/contrato-backend-frontend.md` (doc 20), `docs/telas-frontend.md` (doc 21), `openapi.yaml`, `db/schema.sql`, `db/seed.sql`, `test-plan.md`, `docker-compose.yml`, `.env.example`.
> **Objetivo:** dizer exatamente o que implementar, em que ordem, com que ferramentas e com que teste como critério de "pronto" — para a equipe de backend (Java/Spring Boot) começar a codificar sem decisões de arquitetura pendentes além das já sinalizadas.

## Como este plano se relaciona com os documentos existentes

Este projeto **já chegou com uma quantidade incomum de artefatos prontos** para um plano de implementação de MVP: `openapi.yaml` (contrato completo, 49 endpoints), `db/schema.sql` (schema de referência, 15 tabelas), `db/seed.sql` (dados determinísticos), `test-plan.md` (backlog de testes por marco M1–M8, já rastreado a RN/AC/UC), `docker-compose.yml` + `.env.example` (ambiente local completo, incluindo PostgreSQL e armazenamento de evidências compatível com S3 via MinIO). Isso muda o que este plano precisa fazer: **não é necessário desenhar a arquitetura do zero** — é necessário **sequenciar a implementação** sobre o que já está decidido, resolver as poucas lacunas técnicas que a leitura cruzada desses artefatos revelou (seção 12 e 19), e amarrar cada etapa a um critério de pronto verificável.

| Já decidido (não reabrir) | Onde |
|---|---|
| Stack: Java + Spring Boot + PostgreSQL + JWT | `visao-geral.md` §1.4, `objetivos.md` §2.6, `arquitetura.md` §11.6 |
| Contrato de API completo (endpoints, DTOs, enums, erros) | `openapi.yaml` |
| Schema relacional de referência (15 tabelas, índices, `CHECK` constraints) | `db/schema.sql` |
| Dataset de demonstração determinístico | `db/seed.sql` |
| Backlog de testes por marco, já ligado a RN/AC/UC | `test-plan.md` |
| Ambiente local (Postgres 16 + MinIO S3-compatível) | `docker-compose.yml` |
| Variáveis de ambiente, **incluindo dois valores que estavam pendentes na análise anterior** | `.env.example` — ver nota abaixo |
| Estrutura de pacotes por feature | `arquitetura.md` §11.6, refinada por `test-plan.md` §3.1 |

> **Achado desta análise:** `docs/contrato-backend-frontend.md` (documento 20) registrou como **PEND-01** (TTL de token indefinido) e **PEND-16** (limite de upload indefinido) duas pendências que, na verdade, **já estão resolvidas em `.env.example`**, arquivo que não fazia parte do escopo lido quando aquele documento foi produzido: `JWT_ACCESS_TOKEN_EXPIRATION_SECONDS=900`, `JWT_REFRESH_TOKEN_EXPIRATION_SECONDS=604800` (7 dias) e `EVIDENCE_MAX_UPLOAD_SIZE_BYTES=10485760` (10 MB). Este plano usa esses valores como normativos e recomenda **atualizar o documento 20** para remover PEND-01 (parcialmente — a política de rotação do refresh token continua indefinida) e PEND-16 (integralmente resolvida). Não os removi de aquele arquivo agora porque isso seria uma edição de outro documento fora do escopo direto desta tarefa; sinalizo aqui para a equipe decidir.

---

## 1. Stack tecnológica e ferramental

> **Correção de versão (posterior a este documento):** a tarefa "Dependências Spring Initializr e atualização da documentação de testes" fixou obrigatoriamente **Spring Boot 4.1.0** e **Java 21**, substituindo o par Spring Boot 3.3.x/Java 17 assumido abaixo como placeholder ("versão exata não fixada em nenhum documento"). A tabela foi atualizada para refletir esse mandato explícito. Detalhamento completo de dependências, compatibilidade validada empiricamente contra o Spring Initializr e mudanças de teste decorrentes: `docs/dependencias-spring-initializr.md` (documento 23).

| Camada | Escolha | Fonte / status |
|---|---|---|
| Linguagem/runtime | **Java 21 (LTS)** | Mandato explícito da tarefa que produziu `docs/dependencias-spring-initializr.md` — substitui o "Java 17+" de `README.MD`, que deve ser atualizado pela equipe |
| Framework | **Spring Boot 4.1.0** | Idem — substitui a suposição original de Spring Boot 3.3.x |
| Build | Maven (`pom.xml`) | Confirmado — nenhum documento de `./docs` fixa Maven vs. Gradle, mas `README.MD` já pressupõe Maven (`./mvnw spring-boot:run`); ver `docs/dependencias-spring-initializr.md` §1 |
| Persistência | Spring Data JPA + Hibernate sobre PostgreSQL 16 | `arquitetura.md` §11.7, imagem `postgres:16-alpine` em `docker-compose.yml` |
| Migrações | **Flyway** | `db/schema.sql` já está escrito num formato diretamente portável para scripts `V{n}__descricao.sql` (comentário no próprio arquivo instrui exatamente isso); Flyway é o padrão de fato em Spring Boot e citado por nome em `test-plan.md` §5.1 (`FlywayMigrationIT.java`) |
| Segurança | Spring Security + `jjwt` (io.jsonwebtoken) para emissão/validação de JWT | `arquitetura.md` §11.10, `api-rest.md` §12.4 |
| Hash de senha | `BCryptPasswordEncoder` (Spring Security) | `modelo-de-dados.md` §10.6.1 ("nunca exposto pela API"), padrão de mercado — seed já usa hash bcrypt (`db/seed.sql`, prefixo `$2b$10$`) |
| Documentação OpenAPI | `openapi.yaml` **mantido como fonte manual de verdade** (não gerado por `springdoc`) | Ver seção 13 — decisão justificada |
| Upload/armazenamento de evidências | AWS SDK v2 (`software.amazon.awssdk:s3`) apontando para MinIO em dev e para um provedor de objetos gerenciado em produção | `arquitetura.md` §11.8, `docker-compose.yml` (serviço `evidence-storage`, imagem `minio/minio`), `.env.example` (`EVIDENCE_STORAGE_*`) |
| Validação de bean | Jakarta Bean Validation (`spring-boot-starter-validation`) | Padrão Spring Boot |
| Mapeamento DTO ↔ entidade | MapStruct | `arquitetura.md` §11.6 exige "Mapper: conversão explícita entre camadas" — MapStruct gera esse mapeamento em tempo de compilação, evitando reflexão manual |
| Testes unitários | JUnit Jupiter 6 + Mockito + AssertJ | `test-plan.md` §3.1 (atualizado — ver `docs/dependencias-spring-initializr.md`) |
| Testes de integração | Spring Boot Test + **Testcontainers** (`org.testcontainers:testcontainers-postgresql`, módulo renomeado no Testcontainers 2.0) + `MockMvcTester` | `test-plan.md` §3.1 (atualizado) |
| Conformidade de contrato | `swagger-request-validator` validando respostas contra `openapi.yaml` | `test-plan.md` §3.1 |
| Lint/análise estática | Checkstyle ou Spotless (não especificado; **decisão deste plano** — qualquer um satisfaz RNF-009) | `arquitetura.md` §11.14 (RNF-009) |
| Contêiner | Dockerfile multi-stage (build Maven → imagem `eclipse-temurin:21-jre-alpine`) | `arquitetura.md` §11.13 ("criação de imagem de contêiner") |

---

## 2. Estrutura do projeto

```text
api/
├── pom.xml
├── src/
│   ├── main/
│   │   ├── java/com/fieldops/
│   │   │   ├── FieldOpsApplication.java
│   │   │   ├── shared/
│   │   │   │   ├── error/              GlobalExceptionHandler, ErrorResponse, exceções de domínio
│   │   │   │   ├── pagination/         PageResponse<T>, utilitários de Pageable/Specification
│   │   │   │   ├── security/           SecurityConfig, JwtAuthenticationFilter, JwtTokenProvider
│   │   │   │   ├── audit/              AuditEvent (entidade), AuditEventPublisher, listeners
│   │   │   │   ├── storage/            EvidenceStorageClient (abstração sobre S3/MinIO)
│   │   │   │   └── web/                CorrelationIdFilter, convenções de controller
│   │   │   ├── auth/                   login, refresh, logout, me
│   │   │   ├── user/                   User, perfis, situação
│   │   │   ├── client/                 Client
│   │   │   ├── site/                   InspectionSite
│   │   │   ├── equipment/              Equipment, busca por QR
│   │   │   ├── template/               InspectionTemplate, Version, Section, Item, publicação
│   │   │   ├── inspection/             Inspection, snapshot, ciclo de vida, respostas
│   │   │   ├── evidence/               Evidence, upload, exclusão
│   │   │   ├── nonconformity/          NonConformity
│   │   │   ├── review/                 InspectionReview, begin-review/approve/reject
│   │   │   ├── synchronization/        push/pull, outbox do servidor, idempotência
│   │   │   ├── audit/                  consulta de AuditEvent (history)
│   │   │   └── dashboard/              indicadores agregados (P1, resumo no MVP)
│   │   └── resources/
│   │       ├── application.yml
│   │       ├── application-local.yml
│   │       ├── application-integration.yml
│   │       └── db/migration/           V1__..., V2__..., ver seção 4
│   └── test/java/com/fieldops/<mesmos pacotes>/...   (Test.java = unit, IT.java = integração)
├── Dockerfile
└── README.md
```

**Reconciliação de nomenclatura de pacotes (decisão explícita deste plano):** `arquitetura.md` §11.6 lista 11 pacotes de domínio (`auth, user, client, site, equipment, template, inspection, evidence, synchronization, review, audit, shared`) e **não menciona** `nonconformity` nem `dashboard`. `test-plan.md` §5.4/§5.8, escrito depois e já referenciando arquivos de teste concretos, usa `nonconformity/controller/NonConformityControllerIT.java` e `dashboard/controller/DashboardControllerIT.java`. Este plano adota o conjunto de `test-plan.md` (13 pacotes de domínio + `shared`) por ser a fonte mais recente e mais operacional — **[INCONSISTÊNCIA]** entre `arquitetura.md` e `test-plan.md`, resolvida aqui por precedência do artefato mais específico, e deve ser corrigida em `arquitetura.md` §11.6 numa próxima revisão editorial.

**Camadas dentro de cada pacote de domínio** (`arquitetura.md` §11.6): `controller/ → application/ → domain/ → repository/ → dto/ → mapper/ → validation/`. Nem todo pacote precisa de todas as subpastas — `client`, `site` e `equipment`, por exemplo, são simples o suficiente para não precisar de uma camada `domain/` separada da `application/` (nenhuma máquina de estados própria).

---

## 3. Ambiente e configuração

**Já pronto — nenhuma ação de design necessária:** `docker-compose.yml` sobe PostgreSQL 16 (com `db/schema.sql`/`db/seed.sql` aplicados automaticamente no primeiro start) e MinIO (S3-compatível) para evidências; `.env.example` documenta todas as variáveis. O trabalho de implementação é:

1. Copiar `.env.example` para `.env` e `docker compose up -d` (banco + storage).
2. Criar `application.yml` (comum) + `application-local.yml`/`application-integration.yml` (por ambiente, `arquitetura.md` §11.12) lendo as mesmas variáveis de `.env` via `${DB_URL}`, `${JWT_SECRET}`, `${EVIDENCE_STORAGE_ENDPOINT}` etc. — **os nomes de variável devem ser idênticos aos de `.env.example`**, que já foi escrito para ser a referência única entre os três componentes (mobile, web, API).
3. `JWT_SECRET` do `.env.example` é um valor de exemplo explicitamente marcado "troque antes de subir qualquer ambiente compartilhado" — gerar um segredo real por ambiente (`openssl rand -base64 48`) antes de qualquer deploy de integração/demonstração (RNF-010, RN-007).
4. Ambientes previstos (`arquitetura.md` §11.12): Local, Integração, Teste/Demonstração, Produção acadêmica (opcional). Cada um precisa de URL de API, config de banco, config de storage e credenciais próprias — o `application-{profile}.yml` + `SPRING_PROFILES_ACTIVE` cobre isso.

---

## 4. Persistência e migrações

### 4.1 Divisão de `db/schema.sql` em migrações Flyway

O próprio `db/schema.sql` já instrui, em comentário, que deve ser dividido em `V1__..., V2__...` dentro de `api/src/main/resources/db/migration/`. A ordem abaixo respeita as dependências de chave estrangeira já expressas no arquivo (uma tabela nunca migra antes de outra que ela referencia):

| Script | Conteúdo | Depende de |
|---|---|---|
| `V1__create_extensions_and_users.sql` | `CREATE EXTENSION pgcrypto`, tabela `users` | — |
| `V2__create_clients_sites_equipment.sql` | `clients`, `inspection_sites` (FK `clients`), `equipment` (FK `inspection_sites`) | V1 (equipment/site referenciam usuários indiretamente não — mas seed usa `created_by`? Não, essas 3 tabelas não têm `created_by`; ordem só depende uma da outra) |
| `V3__create_inspection_templates.sql` | `inspection_templates` (FK `users.created_by`), `inspection_template_versions` (FK `inspection_templates`, `users.published_by`), `template_sections` (FK versions), `template_items` (FK sections) | V1, V2 (ordem lógica, sem FK direta a client/site/equipment) |
| `V4__create_inspections.sql` | `inspections` (FK `inspection_template_versions`, `clients`, `inspection_sites`, `equipment`, `users` ×4) | V1, V2, V3 |
| `V5__create_inspection_execution.sql` | `inspection_item_snapshots` (FK `inspections`, `template_items`), `inspection_responses` (FK `inspections`, `inspection_item_snapshots`, `users`) | V4 |
| `V6__create_evidence_and_nonconformities.sql` | `evidence` (sem FK de `non_conformity_id` ainda), `non_conformities` (FK `inspections`, snapshots, responses, users), depois `ALTER TABLE evidence ADD CONSTRAINT fk_evidence_non_conformity ...` | V5 |
| `V7__create_reviews_and_audit.sql` | `inspection_reviews`, `audit_events` | V4, V5 |
| `V8__create_synchronization_ledger.sql` | **Nova tabela, não presente em `db/schema.sql`** — ver seção 4.2 | V1–V7 |
| `V9__add_evidence_idempotency_key.sql` | **Alteração à tabela `evidence`, não presente em `db/schema.sql`** — ver seção 4.2 | V6 |

Cada script deve incluir os índices já listados em `db/schema.sql` junto com sua tabela (não um script separado de índices) para manter o padrão Flyway de "uma versão = uma unidade coerente".

### 4.2 Lacunas técnicas encontradas em `db/schema.sql` (a resolver antes da sincronização, seção 12)

A leitura cruzada de `db/schema.sql` contra `openapi.yaml` e as regras RN-067/RN-068 ("cada operação enviada deve possuir identificador idempotente único"; "o reenvio da mesma operação não pode criar duplicidade") revelou duas lacunas que **o schema de referência não cobre** e que **precisam existir** para a sincronização funcionar como especificado:

**Lacuna 1 — nenhuma tabela registra os `operationId` já processados pelo `POST /mobile/sync/push`.** Sem isso, reenviar a mesma operação reaplicaria a lógica de negócio (na melhor hipótese, um upsert idempotente por natureza; na pior, um `409` de conflito de versão porque o `baseVersion` enviado já não bate com a versão atual após a primeira aplicação — exatamente o cenário que RN-068 proíbe). **Proposta (decisão de arquitetura, não de negócio — a regra de negócio já existia, só faltava a estrutura que a implementa):**

```sql
CREATE TABLE sync_operations (
    operation_id    UUID PRIMARY KEY,
    device_id       UUID NOT NULL,
    user_id         UUID NOT NULL REFERENCES users (id),
    entity_type     VARCHAR(30) NOT NULL,
    entity_id       UUID NOT NULL,
    operation_type  VARCHAR(20) NOT NULL,
    status          VARCHAR(20) NOT NULL CHECK (status IN ('APPLIED','REJECTED','CONFLICT','DEPENDENCY_FAILED')),
    result_entity_version INTEGER,
    error_code      VARCHAR(100),
    error_message   VARCHAR(1000),
    processed_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_sync_operations_device ON sync_operations (device_id);
CREATE INDEX idx_sync_operations_user ON sync_operations (user_id);
```

Fluxo de uso: ao receber uma `SyncOperationRequest`, o serviço de sincronização primeiro consulta `sync_operations` por `operation_id`; se existir, responde imediatamente com o `status`/`result_entity_version` gravados (`ALREADY_APPLIED`, mapeado a partir do `APPLIED` já registrado — ver nota abaixo) **sem tocar na entidade de novo**; se não existir, processa a operação dentro de uma transação e só então grava a linha em `sync_operations`.

**Lacuna 2 — a tabela `evidence` não tem coluna para `idempotencyKey`.** `EvidenceUploadRequest.idempotencyKey` (obrigatório em `openapi.yaml`) não tem onde ser persistido para detectar reenvio (`409` "já processada", RN-068 aplicada a upload). **Proposta:**

```sql
ALTER TABLE evidence
    ADD COLUMN idempotency_key UUID;
ALTER TABLE evidence
    ADD CONSTRAINT uq_evidence_idempotency_key UNIQUE (idempotency_key);
```

Essas duas alterações devem ser tratadas como **correções ao schema de referência**, não como reinterpretação de regra de negócio — RN-067/068 já exigiam esse comportamento; `db/schema.sql` simplesmente não tinha, ainda, a estrutura para sustentá-lo (o próprio arquivo se declara "schema de validação", não a migração oficial).

### 4.3 Controle de concorrência otimista

Toda entidade com coluna `version` (`users`, `clients`, `inspection_sites`, `equipment`, `inspection_templates`, `inspections`, `inspection_responses`, `non_conformities`) usa `@Version` do JPA — o Hibernate gera o `WHERE version = ?` automaticamente e lança `OptimisticLockException`, que o `GlobalExceptionHandler` (seção 7) converte em `409`.

### 4.4 Exclusão lógica

Nenhuma tabela tem coluna `deleted_at`/`is_deleted` — a inativação usa o próprio campo `status` (`ACTIVE/INACTIVE`, `ACTIVE/INACTIVE/DECOMMISSIONED` etc.), consistente com RN-013 ("inativação, não exclusão física"). Não há necessidade de um mecanismo adicional de soft-delete — os repositórios simplesmente nunca expõem `DELETE` físico para essas entidades (só `PATCH .../status`, já refletido em `contrato-backend-frontend.md` §3).

---

## 5. Segurança

### 5.1 Cadeia de filtros

```text
Requisição
   → CorrelationIdFilter (gera/propaga requestId, shared/web)
   → JwtAuthenticationFilter (shared/security) — extrai Bearer, valida assinatura/expiração, popula SecurityContext
   → Spring Security (autorização por @PreAuthorize no controller)
   → Controller
```

### 5.2 Emissão e validação de token

`JwtTokenProvider` (shared/security) usa `JWT_SECRET`, `JWT_ACCESS_TOKEN_EXPIRATION_SECONDS` (900s) e `JWT_REFRESH_TOKEN_EXPIRATION_SECONDS` (604800s) de `.env.example`. Claims mínimas: `sub` (user id), `role`, `email`. `POST /auth/refresh` valida o refresh token e emite um novo par — **[DECISÃO NECESSÁRIA] herdada do documento 20 (PEND-01, parcial):** o `.env.example` fixa a duração, mas não define se o refresh token é de uso único (rotação) ou reutilizável até expirar. Recomenda-se rotação (cada uso de refresh invalida o anterior e emite um novo) por ser a prática padrão mais segura — mas isso é uma escolha de implementação a confirmar com a equipe antes do `AuthenticationServiceTest.java` (M2, `test-plan.md` §5.2) ser escrito, porque muda o comportamento esperado do teste.

### 5.3 Autorização por perfil — de RN/matriz para `@PreAuthorize`

A matriz completa já existe em `contrato-backend-frontend.md` §6.6. Tradução direta para anotação Spring Security (exemplos representativos, um por padrão de regra):

| Padrão de regra | Anotação |
|---|---|
| Exclusivo de um perfil | `@PreAuthorize("hasRole('ADMIN')")` (ex.: todo endpoint de `user/controller`) |
| Dois perfis | `@PreAuthorize("hasAnyRole('ADMIN','SUPERVISOR')")` (ex.: `client`, `site`, `template`, `inspection` de planejamento) |
| Escopo "própria" (técnico só vê a própria inspeção) | `@PreAuthorize("hasRole('TECHNICIAN')")` no método **mais** uma verificação de posse dentro do `application/` (comparar `inspection.getTechnicianId()` com o `id` do usuário autenticado) — a posse não é expressável só por anotação, precisa de checagem explícita no serviço, retornando `403` via exceção de domínio (`InspectionNotOwnedException`) |
| Exclusivo do supervisor (revisão) | `@PreAuthorize("hasRole('SUPERVISOR')")` (`review/controller`) |

Toda checagem de perfil ocorre **na API**, nunca só na interface (AC-SECURITY) — isso já é a premissa de design, não uma decisão nova.

### 5.4 Hash e armazenamento de senha

`BCryptPasswordEncoder` (custo padrão 10, igual ao hash já usado em `db/seed.sql`). `User.passwordHash` nunca aparece em nenhum DTO de saída (confirmado em `openapi.yaml` — `User` não tem esse campo).

### 5.5 CORS

`CORS_ALLOWED_ORIGINS` de `.env.example` (`http://localhost:4200` em dev) alimenta a configuração de `SecurityConfig` — nenhuma origem além das explicitamente listadas é aceita (`arquitetura.md` §11.10).

---

## 6. Tratamento de erros

`GlobalExceptionHandler` (`@RestControllerAdvice`, `shared/error`) mapeia cada exceção para o schema `Error` único (`contrato-backend-frontend.md` §5.1). Convenção de exceções de domínio (uma hierarquia simples, não uma exceção por regra):

```text
shared/error/
├── BusinessRuleViolationException   → 422, carrega `code` + `message`
├── ResourceNotFoundException        → 404
├── ResourceConflictException        → 409 (transição de estado inválida, versão otimista, unicidade)
├── AccessDeniedException (Spring)   → 403
├── AuthenticationException (Spring) → 401
├── PayloadTooLargeException         → 413
└── UnsupportedMediaTypeException    → 415
```

Todo lançamento de `BusinessRuleViolationException`/`ResourceConflictException` recebe um `code` (`ex.: INSPECTION_REQUIRED_ITEMS_MISSING`). **Isso é exatamente a lacuna PEND-02 do documento 20** (catálogo fechado de `code` inexistente) — a resolução prática é: cada regra de negócio implementada nesta fase **define seu próprio `code`** neste momento, e a lista consolidada deve ser documentada de volta em `openapi.yaml`/documento 20 conforme cada endpoint é implementado (não é possível fechar essa lista antes de escrever o código, porque ela nasce da implementação). Sugestão de convenção: `<ENTIDADE>_<PROBLEMA>` em maiúsculas, ex.: `TEMPLATE_VERSION_NOT_PUBLISHED`, `EQUIPMENT_SITE_MISMATCH`, `TECHNICIAN_INACTIVE`, `INSPECTION_ALREADY_APPROVED`.

Nunca expor stack trace ao cliente (AC-SECURITY) — `500` sempre retorna mensagem genérica; detalhe completo só no log do servidor, correlacionado por `requestId`.

---

## 7. Paginação, filtros, ordenação

- `PageResponse<T>` (shared/pagination) envolve `Page<T>` do Spring Data e serializa no formato `{page, size, totalElements, totalPages, content[]}` já fixado em `openapi.yaml`/`contrato-backend-frontend.md` §9.2 — **não** usar o formato padrão do Spring HATEOAS/`PagedModel`, que tem nomes de campo diferentes.
- Filtros simples (`status`, `role`, `severity` etc.) via `@RequestParam` + `Specification<T>` (Spring Data JPA Specifications) combinados dinamicamente — evita explosão de métodos de repositório por combinação de filtro.
- `sort=campo,direção` mapeado para `Sort.by(Direction.fromString(direção), campo)`; validar que o campo pertence a uma lista permitida por entidade (nunca aceitar um nome de coluna arbitrário vindo do cliente, para não expor a estrutura interna nem permitir injeção via nome de propriedade).
- Filtros combinados de `GET /inspections` (`contrato-backend-frontend.md` §9.3) são o caso mais complexo — implementar como um único `InspectionSpecification` builder que compõe cada filtro presente.

---

## 8. DTOs, mapeamento e validação

- Um DTO por sentido/operação, exatamente como já modelado em `openapi.yaml` (`XCreateRequest`, `XUpdateRequest`, `X` para leitura, `XPage` para listagem) — **não reutilizar a mesma classe para request e response**, mesmo quando os campos coincidem, porque os dois evoluem por razões diferentes (`arquitetura.md` §11.6: "DTO: contrato externo, separado das entidades JPA").
- MapStruct (`@Mapper(componentModel = "spring")`) gera `XMapper` por entidade — conversão `Entity → DTO` e `CreateRequest → Entity` explícitas, sem reflexão em runtime.
- Validação em duas camadas:
  1. **Bean Validation** (`@NotNull`, `@Size`, `@Email` etc.) nos DTOs de request — cobre formato e obrigatoriedade simples (idêntico ao que `openapi.yaml` já declara por campo, ex. `maxLength`).
  2. **Validadores de negócio** (`application/` de cada módulo) — cobrem regras que dependem de estado ou de outra entidade (ex.: RN-014 "local pertence ao cliente", RN-026 "equipamento obrigatório conforme tipo do modelo", RN-037 "itens obrigatórios respondidos") e lançam `BusinessRuleViolationException` (`422`).

---

## 9. Auditoria

`AuditEventPublisher` (shared/audit) expõe um único método `record(action, entityType, entityId, inspectionId, previousValue, newValue, metadata)`, chamado explicitamente ao final de cada caso de uso que altera estado (não via AOP/interceptor genérico, para manter o controle explícito sobre o que entra em `previousValueJson`/`newValueJson` — RN-086 exige que sejam "não sensíveis", o que uma interceptação genérica não consegue garantir sozinha). Cada `application/*Service` que executa uma transição de estado (assign, cancel, start, submit, begin-review, approve, reject, upload de evidência, exclusão de evidência, alteração de status de usuário) chama o publisher dentro da mesma transação da alteração de negócio, garantindo atomicidade (ou os dois persistem, ou nenhum).

Catálogo de `action` mínimo a implementar (idêntico a `contrato-backend-frontend.md` §12.1): `INSPECTION_CREATED, INSPECTION_ASSIGNED, INSPECTION_STARTED, RESPONSE_CREATED, RESPONSE_UPDATED, EVIDENCE_ADDED, EVIDENCE_REMOVED, NON_CONFORMITY_CREATED, INSPECTION_COMPLETED, INSPECTION_SUBMITTED, REVIEW_STARTED, INSPECTION_APPROVED, INSPECTION_REJECTED, INSPECTION_CANCELED`.

---

## 10. Armazenamento de evidências

`EvidenceStorageClient` (shared/storage) abstrai o SDK S3 atrás de uma interface própria (`upload(bytes, key, contentType) → storageKey`, `generateTemporaryUrl(storageKey) → URL`) — isso permite trocar o provedor entre MinIO (dev, `.env.example`) e um serviço gerenciado (produção) sem tocar no código de domínio, só na configuração (`arquitetura.md` §11.8).

Fluxo de `POST /inspections/{id}/evidence`:

```text
Controller recebe multipart
   → valida Content-Type contra lista permitida (image/jpeg, image/png)   [415 se falhar]
   → valida tamanho contra EVIDENCE_MAX_UPLOAD_SIZE_BYTES (10 MB)          [413 se falhar]
   → consulta evidence por idempotency_key (seção 4.2)                    [se existir: retorna 409 com o registro já processado]
   → dentro de uma transação:
        - faz upload do arquivo via EvidenceStorageClient
        - persiste a linha em `evidence` (storage_key, idempotency_key, ...)
        - publica AuditEvent EVIDENCE_ADDED
   → retorna 201 com Evidence (accessUrl gerada sob demanda, não persistida)
```

`accessUrl` é sempre gerada dinamicamente (URL temporária assinada) no momento da resposta — nunca persistida como permanente, para não vazar acesso público (`arquitetura.md` §11.8).

---

## 11. Documentação OpenAPI

**Decisão:** manter `openapi.yaml` como arquivo **mantido manualmente** na raiz do repositório, em vez de gerar o contrato automaticamente a partir de anotações `springdoc-openapi` no código. Justificativa: o arquivo já existe, já foi validado contra todos os documentos de origem (registrando inclusive decisões de normalização explícitas em `info.description`), e é consumido por mobile/web como mock **antes** do backend estar pronto (`api-rest.md` §12.17) — gerar o contrato a partir do código inverteria essa dependência e quebraria o desenvolvimento paralelo que os documentos 20/21 foram desenhados para viabilizar. Em vez disso:

- `swagger-request-validator` roda dentro de cada `*ControllerIT.java` (`test-plan.md` §3.1) validando que a resposta real da API é compatível com o schema declarado em `openapi.yaml` — o contrato dirige a implementação, não o contrário.
- CI roda `npx @redocly/cli lint openapi.yaml` a cada alteração do arquivo (`test-plan.md` §5.8, verificação de processo ligada a RN-090).
- O Swagger UI pode ainda ser servido a partir do `openapi.yaml` estático (springdoc suporta servir um arquivo YAML existente sem gerar a partir de anotações) para inspeção manual em desenvolvimento — sem duplicar a fonte de verdade.

---

## 12. Sincronização e idempotência — desenho detalhado

Esta é a funcionalidade de maior risco técnico do projeto (`roadmap.md` M6, `criterios-de-avaliacao.md` §19.2 atribui 15 pontos a "Offline e sincronização"). Desenho de implementação:

### 12.1 `POST /mobile/sync/push`

```text
Para cada SyncOperationRequest do lote, na ordem enviada pelo cliente (RN-069 — dependências já resolvidas pelo cliente antes do envio):
   1. Abrir transação por operação (não uma transação única para o lote inteiro — RN-070 exige que a falha de uma não reverta as demais)
   2. SELECT em sync_operations WHERE operation_id = ?
        → se existir: adicionar ao resultado { operationId, status: ALREADY_APPLIED, entityVersion: result_entity_version } e continuar para a próxima operação, SEM reprocessar
   3. Se não existir:
        a. Resolver o serviço de aplicação correspondente a entityType (INSPECTION → InspectionService, INSPECTION_RESPONSE → ResponseService, EVIDENCE → não se aplica a este endpoint — evidência sempre entra por upload multipart direto, RN-078; NON_CONFORMITY → NonConformityService)
        b. Validar autorização (o usuário do token é dono da entidade — mesma checagem de "própria" da seção 5.3)
        c. Comparar baseVersion recebido com a versão atual da entidade
             → divergente: status CONFLICT, gravar em sync_operations, não aplicar
        d. Aplicar a operação (mesma lógica de negócio do endpoint direto equivalente, ex. PUT /responses/{id})
             → violação de regra de negócio: status REJECTED, error preenchido, gravar em sync_operations
        e. Sucesso: status APPLIED, gravar entityVersion resultante em sync_operations
   4. Se a operação dependia de outra do mesmo lote que falhou: status DEPENDENCY_FAILED (verificado antes do passo 3, usando as dependências já expressas na ordem/relacionamento entre entityId do lote)
Retornar SyncPushResponse{ results[], nextCursor, serverTime }
```

`nextCursor`: **[A DEFINIR]** — nenhum documento especifica o formato exato do cursor (timestamp? sequência monotônica?). Recomenda-se um cursor opaco baseado em `(occurred_at, id)` da última alteração relevante já enviada no `pull` mais recente, para evitar problemas de timestamps colidentes no mesmo milissegundo — decisão de implementação, não de negócio, mas deve ser registrada de volta no documento 20 quando definida.

### 12.2 `GET /mobile/sync/pull?cursor=`

Consulta as tabelas relevantes (`inspections`, `inspection_responses`, `evidence`, `non_conformities`) por `updated_at`/`occurred_at` maior que o cursor, escopado ao técnico autenticado (mesmo filtro de `GET /mobile/inspections`), monta `SyncChange[]` e retorna `nextCursor` = cursor da última alteração incluída. **Não grava nada no servidor** — o avanço do cursor é responsabilidade do cliente, só depois de persistir localmente (RN-073), então o servidor deve poder responder à mesma consulta novamente sem efeito colateral (idempotente por natureza, ao contrário do `push`).

### 12.3 Testes que fecham esta seção

Já especificados em `test-plan.md` §5.6 (`SyncPushControllerIT.java`, `SyncPullControllerIT.java`, `IdempotencyTest.java`, `ConflictDetectionTest.java`) — este plano não repete os casos de teste, apenas fornece o desenho de implementação que os torna possíveis de escrever (em particular, a tabela `sync_operations` da seção 4.2, sem a qual `IdempotencyTest.java` não tem onde persistir o que está testando).

---

## 13. Ordem de implementação por sprint (backend)

Alinhado a `roadmap.md` §16.4 (8 sprints de 2 semanas) e a `test-plan.md` §5 (marcos M1–M8) — aqui detalhado do ponto de vista exclusivamente backend: entidades, migrações e endpoints por sprint, com o arquivo de teste correspondente como critério de "pronto".

### Sprint 1 (semanas 1–2) — M1 Fundação

- Projeto Maven + Spring Boot inicializado; `application.yml` lendo `.env`.
- `V1`–`V7` das migrações Flyway (seção 4.1) — schema completo aplicado, **sem** endpoints ainda.
- `openapi.yaml` já existe — configurar Swagger UI apontando para ele.
- **Pronto quando:** `shared/ApplicationBootIT.java` e `shared/FlywayMigrationIT.java` passam (`test-plan.md` §5.1); `docker compose up -d` + aplicação sobe sem erro.

### Sprint 2 (semanas 3–4) — M2 Autenticação (contexto Identidade e acesso)

- `auth/`: `POST /auth/login`, `/refresh`, `/logout`, `GET /auth/me`.
- `user/`: CRUD completo de `User` + `PATCH .../status` + `POST .../reset-password`.
- `shared/security/`: `SecurityConfig`, `JwtAuthenticationFilter`, `JwtTokenProvider`.
- **Pronto quando:** todos os arquivos de `test-plan.md` §5.2 (API) passam — `SessionPolicyTest`, `AuthenticationServiceTest`, `AuthControllerIT`, `UserStatusTransitionTest`, `UserControllerIT`.
- **Decisão a fechar antes de começar:** política de rotação do refresh token (seção 5.2).

### Sprint 3 (semanas 5–6) — M3 Planejamento (Cadastros, Modelos, Agendamento)

- `client/`, `site/`, `equipment/`: CRUD + `PATCH .../status` + combos encadeados (`GET /clients/{id}/sites`, `GET /sites/{id}/equipment`) + `GET /equipment/by-qr/{qrCode}`.
- `template/`: `InspectionTemplate` (CRUD), `TemplateSection`/`TemplateItem` (CRUD sobre versão rascunho implícita — RN-018/019), `POST .../publish`, `GET .../versions`.
- `inspection/` (parte 1 — planejamento apenas): `POST /inspections` (com criação do snapshot, `modelo-de-dados.md` §10.8.2), `GET /inspections`, `PUT /inspections/{id}`, `POST .../assign`, `POST .../cancel`.
- **Pronto quando:** `test-plan.md` §5.3 (API) — `ClientControllerIT`, `SiteControllerIT`, `EquipmentControllerIT`, `QrCodeUniquenessTest`, `InspectionTemplateControllerIT`, `PublishTemplateServiceTest`, `InspectionSchedulingControllerIT`, `InspectionAdminMonitorControllerIT`.
- **Decisão a fechar antes de começar:** PEND-F05/F07 do documento 21 (como a UI sabe se o modelo exige equipamento; mecanismo de nova versão) têm implicação direta no desenho de `InspectionTemplate`/`InspectionCreateRequest` desta sprint — se a equipe decidir adicionar um campo `requiresEquipment`, ele precisa entrar na migração `V3` antes que essa tabela seja usada em produção de dados reais.

### Sprint 4 (semanas 7–8) — M4 Execução online

- `inspection/` (parte 2 — execução): `POST .../start`, `POST .../submit`, `GET/PUT /inspections/{id}/responses*`, `GET /mobile/inspections*`.
- `nonconformity/`: `POST /inspections/{id}/non-conformities`, `GET/PUT/PATCH` relacionados.
- **Pronto quando:** `test-plan.md` §5.4 (API) — `ChecklistValidationTest`, `InspectionExecutionControllerIT`, `InspectionResponseControllerIT`, `InspectionSubmitControllerIT`, `NonConformityControllerIT`.

### Sprint 5 (semanas 9–10) — M5 Recursos nativos

- `evidence/`: `POST/GET /inspections/{id}/evidence`, `GET/DELETE /evidence/{id}` + `EvidenceStorageClient` real (MinIO em dev).
- Migração `V9` (idempotency_key em `evidence`, seção 4.2) entra nesta sprint, junto com o primeiro uso real do campo.
- **Pronto quando:** `test-plan.md` §5.5 (API) — `EvidenceControllerIT`, `UploadValidationTest`, `CriticalNonConformityEvidenceTest`, `EquipmentByQrControllerIT`, `GeoLocationCaptureTest`.

### Sprint 6 (semanas 11–12) — M6 Offline e sincronização

- `synchronization/`: `POST /mobile/sync/push`, `GET /mobile/sync/pull` conforme desenho da seção 12.
- Migração `V8` (`sync_operations`, seção 4.2) entra nesta sprint.
- **Pronto quando:** `test-plan.md` §5.6 (API) — `SyncPushControllerIT`, `SyncPullControllerIT`, `IdempotencyTest`, `ConflictDetectionTest`.

### Sprint 7 (semanas 13–14) — M7 Revisão

- `review/`: `POST .../begin-review`, `/approve`, `/reject`, `GET .../reviews`.
- **Pronto quando:** `test-plan.md` §5.7 (API) — `ReviewControllerIT`, `ReviewCycleTest`.

### Sprint 8 (semanas 15–16) — M8 Release

- `audit/`: `GET /inspections/{id}/history` (se a lacuna da auditoria global — PEND-08/PEND-F04 dos documentos 20/21 — for resolvida nesta fase, o novo endpoint entra aqui).
- `dashboard/`: `GET /dashboard/*` (P1, mas o resumo básico é aceito no MVP administrativo).
- Contêiner Docker da API, ambiente de demonstração, validação final de `openapi.yaml`.
- **Pronto quando:** `test-plan.md` §5.8 (API) — `AuditControllerIT`, `StateTransitionGuardTest`, `StandardErrorHandlingIT`, `AuthorizationBoundaryIT`, `DashboardControllerIT`, lint do `openapi.yaml` limpo, roteiro `AC-RELEASE` executável ponta a ponta.

---

## 14. Estratégia de testes

Já integralmente especificada em `test-plan.md` (convenção de nome, rastreabilidade RN/AC/UC no `@DisplayName`, backlog por marco) — este plano não a duplica. Único complemento: a seção 13 acima amarra cada sprint de implementação **exatamente** aos arquivos de teste que `test-plan.md` já lista, então "pronto" nunca é uma decisão subjetiva.

---

## 15. CI/CD

`arquitetura.md` §11.13 (API): compilação → testes → análise estática → imagem de contêiner → publicação no ambiente de integração. Pipeline sugerido (GitHub Actions ou equivalente):

```text
on: push/pull_request
jobs:
  build-and-test:
    - actions/setup-java (17)
    - mvn -B compile
    - mvn -B checkstyle:check (ou spotless:check)
    - mvn -B test                      # unit (Surefire)
    - docker compose up -d db          # Testcontainers pode subir o próprio Postgres, mas se preferir reaproveitar o compose local
    - mvn -B verify                    # integração (Failsafe) + swagger-request-validator
  lint-openapi:
    - npx @redocly/cli lint openapi.yaml
  build-image (somente em push para main/integração):
    - docker build -t fieldops-api:${sha} .
    - push para o registro do ambiente de integração
```

---

## 16. Observabilidade

`CorrelationIdFilter` (shared/web) gera/propaga um `requestId` por requisição (presente em `Error.requestId` e em `AuditEvent.requestId`); logs estruturados incluem esse id. Logs de autenticação nunca incluem senha/token (RN-007) — usar um `Logback` `MaskingConverter` ou simplesmente nunca logar o corpo de `/auth/*`. Falhas de sincronização geram log em nível `WARN` com `operationId`+`entityType` (sem payload sensível). Toda transição de estado gera, além do `AuditEvent` persistido, uma linha de log em nível `INFO` correlacionável pelo `requestId` (`arquitetura.md` §11.11).

---

## 17. Riscos técnicos e mitigação

| Risco | Mitigação |
|---|---|
| Sincronização (seção 12) é a peça de maior complexidade e maior peso de avaliação (15 pontos, `criterios-de-avaliacao.md` §19.2) — atraso aqui compromete o marco M6 | Implementar `sync_operations` (seção 4.2) **antes** de qualquer endpoint de sincronização, não como refatoração posterior; escrever `IdempotencyTest.java`/`ConflictDetectionTest.java` (M6) como testes unitários de domínio antes dos `*ControllerIT.java`, para validar a lógica isolada do transporte HTTP |
| `PATCH /non-conformities/{id}/status` existe no contrato sem uso funcional (INC-04 do documento 20) | Implementar o endpoint (é barato — mesmo padrão de `PATCH .../status` já usado em `Client`/`Site`/`Equipment`), mas não construir nenhuma tela sobre ele (já registrado em `telas-frontend.md`) — não vale a pena gastar tempo de sprint tentando "resolver" uma decisão de produto que não é urgente |
| Catálogo de `code` de erro (PEND-02) só se fecha durante a implementação | Manter uma tabela viva (`docs/codigos-de-erro.md`, sugestão fora do escopo desta tarefa) atualizada a cada PR que introduz um novo `code` — evita que o frontend descubra códigos por tentativa e erro |
| Rotação do roadmap acadêmico (`roadmap.md` §16.7) pode exigir corte de escopo | A ordem de sprints desta seção 13 já segue a mesma prioridade P0/P1/P2 de `funcionalidades.md` — cortar do fim (Sprint 8 primeiro) preserva o fluxo ponta a ponta obrigatório (AC-RELEASE) |
| Ambiente de produção acadêmica é opcional (`arquitetura.md` §11.12) | Não investir em infraestrutura de produção além do necessário para demonstração — o `docker-compose.yml` + imagem de contêiner (Sprint 8) já bastam para `criterios-de-avaliacao.md` §19.8 (evidências obrigatórias) |

---

## 18. Definition of Done — aplicada ao backend

Reaproveita `definition-of-done.md` §18.5 sem alteração: documentação OpenAPI atualizada por endpoint (mantendo `openapi.yaml` — seção 11), DTOs independentes das entidades JPA (seção 8), validação de entrada implementada (seção 8), autenticação/autorização aplicadas (seção 5), regras de negócio testadas (seção 14, via `test-plan.md`), tratamento padronizado de erros (seção 6), migrações versionadas (seção 4), restrições críticas também no banco (`UNIQUE`/`CHECK` já em `db/schema.sql`, mais as duas adições da seção 4.2), testes de idempotência para sincronização (seção 12.3), logs sem informação sensível (seção 16).

---

## 19. Lacunas técnicas identificadas nesta análise

Complementam — sem repetir — as pendências de negócio/produto já registradas em `contrato-backend-frontend.md` §17 e `telas-frontend.md` §21. Estas são especificamente de implementação backend.

| ID | Item | Impacto | Decisão necessária |
|---|---|---|---|
| PEND-B01 | Tabela `sync_operations` (idempotência do push) não existe em `db/schema.sql` | Bloqueia RN-067/068 sem essa estrutura (ou equivalente) | **[DECISÃO NECESSÁRIA]** — proposta de schema na seção 4.2, pronta para aprovação |
| PEND-B02 | Coluna `idempotency_key` ausente em `evidence` | Bloqueia detecção de reenvio de upload (RN-068 aplicada a evidência) | **[DECISÃO NECESSÁRIA]** — proposta na seção 4.2 |
| PEND-B03 | Formato do cursor de sincronização (`nextCursor`) não especificado em nenhum documento | Define a implementação de `GET /mobile/sync/pull` | **[A DEFINIR]** — recomendação na seção 12.1 |
| PEND-B04 | Política de rotação do refresh token (uso único vs. reutilizável) | Define o comportamento de `POST /auth/refresh` e o teste `AuthenticationServiceTest.java` (M2) | **[DECISÃO NECESSÁRIA]** — recomendação de rotação na seção 5.2 |
| PEND-B05 | Catálogo fechado de `code` de erro de negócio (PEND-02 do documento 20) só pode ser concluído durante a implementação, não antes dela | Nenhum bloqueio de início — mitigação na seção 17 | **[PENDÊNCIA]**, resolução contínua |
| PEND-B06 | Inconsistência de nomenclatura de pacotes entre `arquitetura.md` §11.6 e `test-plan.md` §5 (`nonconformity`, `dashboard` ausentes do primeiro) | Nenhum bloqueio — este plano já reconcilia (seção 2) | **[INCONSISTÊNCIA]**, resolvida por precedência nesta seção; recomenda-se atualizar `arquitetura.md` |
| PEND-B07 | `.env.example` já resolve PEND-01 (parcial) e PEND-16 do documento 20, mas esses documentos ainda os listam como pendentes | Nenhum impacto técnico — apenas desatualização documental | **[PENDÊNCIA]** de manutenção documental, não de implementação — recomenda-se atualizar o documento 20 na próxima revisão |

---

## 20. Checklist de início imediato (primeiro PR)

1. `git clone` do repositório da API (novo, `backend/` conforme `README.MD`); `mvn archetype` ou Spring Initializr com as dependências da seção 1.
2. `cp .env.example .env`; `docker compose up -d db evidence-storage`.
3. Configurar `application-local.yml` lendo as variáveis de `.env` (seção 3).
4. Criar `V1__create_extensions_and_users.sql` a `V7__create_reviews_and_audit.sql` (seção 4.1) — validar rodando a aplicação vazia contra o banco subido no passo 2.
5. Escrever `shared/ApplicationBootIT.java` e `shared/FlywayMigrationIT.java` (M1, `test-plan.md` §5.1) — este é o primeiro PR a ser aberto.
6. Só então iniciar Sprint 2 (seção 13).