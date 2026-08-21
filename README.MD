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
| **Mobile** | React Native, Expo, TypeScript, Expo Router, SQLite |
| **Web** | React / Angular, TypeScript |
| **Backend** | Java, Spring Boot |
| **Banco de Dados** | PostgreSQL |
| **API** | REST, OpenAPI |
| **Autenticação** | JWT |

---

## 📂 Estrutura

```text
FieldOps/
├── mobile/      # Aplicativo para técnicos
├── admin/       # Interface administrativa
├── backend/     # API REST
└── README.md
```

---

## ⚙️ Execução

### Pré-requisitos

* Java 17+
* Node.js 18+
* PostgreSQL
* Expo

### Backend

```bash
cd backend
./mvnw spring-boot:run
```

### Mobile

```bash
cd mobile
npm install
npx expo start
```

### Interface Administrativa

```bash
cd admin
npm install
npm start
```

*Consulte os arquivos de configuração de cada aplicação para definir as variáveis de ambiente e conexão com o banco de dados.*

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
Este repositório contém o **aplicativo mobile**, a **interface administrativa
web** e o **contrato de dados compartilhado**. A API (Java/Spring) é
desenvolvida em paralelo, em repositório próprio — por isso os dois clientes
sobem com um **backend fictício ligado por padrão** e funcionam sem ela.

```
fieldops-project/
├── shared/   contrato de dados + dados fictícios (TypeScript puro, sem instalação)
├── mobile/   app do técnico — Expo / React Native
├── web/      interface administrativa — Angular
├── docs/     documentação normativa do produto
└── db/       schema.sql e seed.sql
```

### Pré-requisitos

* [Node.js](https://nodejs.org/) **≥ 20.19 ou ≥ 22.12**
* [Docker](https://www.docker.com/) — opcional, para PostgreSQL e MinIO (`docker compose up -d`)
* Um aparelho **Android** com Expo Go, para o mobile (ver `ESTADO-DO-PROJETO.md` §8)

### 1. Interface administrativa (Angular)

```bash
cd web
npm install
npm start          # http://localhost:4200
```

### 2. Aplicativo mobile (Expo)

```bash
cd mobile
npm install
npm start          # escaneie o QR com o Expo Go
```

### Credenciais do modo fictício

Senha `FieldOps@2026` ou `fieldops123` para qualquer conta:
`admin@fieldops.local`, `supervisor@fieldops.local`, `tecnico@fieldops.local`.

### Testes

```bash
cd mobile && npm test    # 302 testes
cd web    && npm test    # 167 testes
```

---

**Antes de continuar o desenvolvimento, leia `ESTADO-DO-PROJETO.md`** — traz o
que já existe, as decisões tomadas, as armadilhas conhecidas e as pendências
(incluindo a sincronização offline, que ainda não foi implementada e é exigida
pelos critérios de aceitação).
