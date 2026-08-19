# 🛠️ FieldOps — Plataforma de Inspeção em Campo

> **Projeto Acadêmico** | CST em Análise e Desenvolvimento de Sistemas

O **FieldOps** é uma plataforma digital *offline-first* para planejamento, execução, acompanhamento e revisão de inspeções técnicas realizadas em campo. A solução substitui processos baseados em formulários impressos e planilhas por um fluxo digital integrado, garantindo rastreabilidade, padronização e preservação de evidências, mesmo em locais sem conectividade com a internet.

---

## 📖 Visão Geral do Produto

Para organizações operadoras que precisam executar inspeções técnicas, o FieldOps conecta o trabalho do técnico de campo à gestão administrativa. 

O fluxo abrange desde a criação de modelos dinâmicos de inspeção e agendamento via **Painel Web**, até a execução em campo através do **Aplicativo Mobile**, culminando na sincronização segura dos dados com a **API REST** para revisão e aprovação final.

---

## 🏗️ Arquitetura e Componentes da Solução

O ecossistema do FieldOps é composto por quatro pilares principais, com separação clara de responsabilidades:

### 1. API REST (Backend)
Coração do sistema, responsável pelas regras de negócio, segurança e persistência central.
*   **Tecnologias:** Java, Spring Boot
*   **Banco de Dados:** PostgreSQL
*   **Responsabilidades:** Autenticação (JWT), autorização, validação de dados, endpoints idempotentes para sincronização, upload de evidências e auditoria.

### 2. Aplicativo Mobile (Técnicos de Campo)
Focado na usabilidade e resiliência, permitindo o trabalho ininterrupto mesmo sem internet.
*   **Tecnologias:** React Native, Expo, TypeScript, Expo Router
*   **Banco de Dados Local:** SQLite
*   **Responsabilidades:** Leitura de QR Code para identificação de equipamentos, checklists dinâmicos, captura de fotos, geolocalização e controle de fila de sincronização (padrão *Outbox*).

### 3. Interface Administrativa (Web)
Dashboard para gestão e supervisão das operações.
*   **Tecnologias:** React / Angular, TypeScript
*   **Responsabilidades:** CRUD de clientes, locais, equipamentos e usuários; construtor de modelos de inspeção; agendamento; e painel de revisão para aprovação/reprovação de checklists.

---

## 🚀 Funcionalidades do MVP

- **Gestão de Cadastros:** Administração centralizada de clientes, plantas (locais) e ativos (equipamentos).
- **Checklists Dinâmicos:** Criação e versionamento de modelos de inspeção na web, renderizados nativamente no mobile.
- **Funcionamento Offline-First:** O aplicativo baixa os agendamentos previamente e armazena todas as respostas e fotos no SQLite local.
- **Identificação por QR Code:** Vinculação rápida e à prova de erros do equipamento físico com a inspeção no app.
- **Sincronização Resiliente:** Envio em lote dos dados em cache para o servidor assim que a conexão é restabelecida, evitando duplicidade de registros.
- **Fluxo de Revisão:** Supervisores analisam as evidências e não conformidades coletadas para emitir o laudo final (Aprovado/Reprovado).

---

## ⚙️ Como Executar o Projeto (Ambiente de Desenvolvimento)

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
