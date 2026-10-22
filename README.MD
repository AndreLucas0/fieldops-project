# 🛠️ FieldOps — Plataforma de Inspeção em Campo

> **Projeto Acadêmico** | CST em Análise e Desenvolvimento de Sistemas — CEUNSP

O **FieldOps** é uma plataforma *offline-first* para planejamento, execução, acompanhamento e revisão de inspeções técnicas em campo.

A solução integra **aplicativo mobile**, **interface administrativa web** e **API REST**, permitindo que técnicos realizem inspeções mesmo sem conexão com a internet, com posterior sincronização dos dados e evidências coletadas.

---

## 🚀 Funcionalidades

- 🔐 Autenticação e controle de acesso
- 📋 Checklists dinâmicos e versionados
- 📱 Execução de inspeções pelo aplicativo mobile
- 📴 Funcionamento offline
- 📷 Captura de fotografias como evidências
- 📍 Registro de localização
- 🔲 Identificação de equipamentos por QR Code
- 🔄 Sincronização com controle de duplicidade
- ⚠️ Registro de não conformidades
- 👨‍💼 Planejamento e acompanhamento de inspeções
- ✅ Revisão, aprovação e reprovação

---

## 🏗️ Tecnologias

| Componente | Tecnologias |
|---|---|
| **Mobile** | Expo SDK 57, React Native 0.86, React 19, Expo Router, TypeScript, SQLite (outbox offline) |
| **Web** | Angular 21.2, Angular Material 21, RxJS, TypeScript, Vitest |
| **Backend** | Java 21, Spring Boot 4.1, Spring Data JPA, Spring Security + OAuth2 Resource Server, Flyway, MapStruct |
| **Banco de Dados** | PostgreSQL 16 (migrações Flyway V1–V14) |
| **Evidências** | Armazenamento compatível com S3 (`adobe/s3mock` em desenvolvimento) |
| **Contrato** | `shared/` — tipos TypeScript consumidos por mobile e web |
| **API** | REST, documentada em `openapi.yaml` |
| **Autenticação** | JWT |

---

## 📂 Estrutura

```text
fieldops-project/
├── backend/        API REST (Java / Spring Boot)
├── web/            Interface administrativa (Angular)
├── mobile/         Aplicativo do técnico (Expo / React Native)
├── shared/         Contrato de dados + dados fictícios (TypeScript)
├── docs/           Documentação normativa — fonte de verdade dos requisitos
├── db/             schema.sql e seed.sql (fixtures de validação local)
├── project-state/  Contexto persistente entre sessões de desenvolvimento
├── openapi.yaml    Contrato REST
└── docker-compose.yml
```

---

## ⚙️ Execução

### Pré-requisitos

* **Java 21** (o `pom.xml` fixa `<java.version>21</java.version>`)
* **Node.js 20.19+**, 22.12+ ou 24+ (exigência do Angular 21)
* **Docker** para subir PostgreSQL e o armazenamento de evidências
  — ou um **PostgreSQL 16** instalado nativamente
* **Expo Go** no aparelho Android para testar o mobile

### 1. Infraestrutura

```bash
cp .env.example .env
docker compose up -d db evidence-storage

# Inspecionar o banco pelo navegador (opcional):
docker compose --profile tools up -d adminer   # http://localhost:8081
```

### 2. Backend

O Spring **não lê o `.env`** (ele serve ao Docker Compose). O perfil `local`
espera as variáveis de conexão no ambiente do processo:

```bash
cd backend

# bash / Git Bash — carrega o .env da raiz (tr remove CRLF do Windows)
set -a; source <(tr -d '\r' < ../.env); set +a

# PowerShell — ver o bloco equivalente em ESTADO-DO-PROJETO.md §8

./mvnw spring-boot:run

$env:SPRING_PROFILES_ACTIVE='local'
$env:DB_URL='jdbc:postgresql://localhost:5433/fieldops'
$env:DB_USER='fieldops'
$env:DB_PASSWORD='fieldops'
```

A porta do banco em `DB_URL` precisa ser a do seu `.env` (`DB_PORT`: `5432` no
exemplo, `5433` em vários `.env` locais). Passo a passo, variáveis obrigatórias e
opcionais e erros comuns: `ESTADO-DO-PROJETO.md` §8, "Backend em dev — variáveis
de ambiente".

Sobe em `http://localhost:8090/api/v1`. O Flyway aplica as migrações no
startup. Swagger em `http://localhost:8090/api/v1/swagger-ui.html`.

### 3. Interface administrativa

```bash
cd web
npm ci
npm start        # backend fictício, nenhuma API necessária
npm run start:api  # API real, via proxy para localhost:8090
```

### 4. Mobile

```bash
cd mobile
npm ci
npm start        # backend fictício ligado por padrão
```

Para falar com a API real, defina `EXPO_PUBLIC_API_MOCK=false` e
`EXPO_PUBLIC_API_BASE_URL` apontando para o host acessível pelo aparelho.

### Testes

```bash
cd backend && ./mvnw test      # unitários
cd backend && ./mvnw verify    # + integração (Testcontainers, exige Docker)
cd web     && npm test
cd mobile  && npm test
```

---

## 👥 Integrantes

* André Lucas Ferreira
* Caique Leandro Tessaroto
* Cauã Rodrigues Mesquita
* João Pedro Américo Matias
* João Victor Machado
* Leonardo Rodrigues Vieira
* Lucas Ianovski
* Nickolas Machado
---

## 🔑 Credenciais do modo fictício

Senha `FieldOps@2026` ou `fieldops123` para qualquer uma das contas:
`admin@fieldops.local`, `supervisor@fieldops.local`, `tecnico@fieldops.local`.
A conta `inativo@fieldops.local` é recusada de propósito (RN-001).

---

## 📌 Antes de continuar o desenvolvimento

Leia `project-state/` — é o contexto persistente do projeto:

| Arquivo | Para quê |
|---|---|
| `progress.md` | o que já landou, com commit e validação |
| `pending-features.md` | backlog confirmado do backend |
| `pending-web.md` / `pending-mobile.md` | inventário de telas e status de integração |
| `decisions.md` | decisões técnicas e o porquê |
| `backend-audit.md` | auditoria backend × documentação |

> Para uma visão geral em uma página — como subir o sistema completo, o que
> está integrado e o que vem a seguir — leia `ESTADO-DO-PROJETO.md` na raiz,
> atualizado em 2026-10-20. O `project-state/` é o detalhe entrada por entrada.
