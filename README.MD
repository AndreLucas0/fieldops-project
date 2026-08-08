# 🛠️ FieldOps — Plataforma de Inspeção em Campo

> **Projeto Acadêmico** | CST em Análise e Desenvolvimento de Sistemas (CEUNSP)

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

### Pré-requisitos
*   [Java 17+](https://www.oracle.com/java/technologies/javase/jdk17-archive-downloads.html)
*   [Node.js](https://nodejs.org/) (v18+)
*   [PostgreSQL](https://www.postgresql.org/)
*   [Expo CLI](https://docs.expo.dev/)

### 1. Executando a API (Spring Boot)
```bash
# Clone o repositório
git clone [https://github.com/seu-usuario/fieldops.git](https://github.com/seu-usuario/fieldops.git)

# Entre na pasta do backend
cd fieldops/backend

# Configure as credenciais do PostgreSQL no arquivo application.properties
# Execute o projeto com Maven ou sua IDE preferida
./mvnw spring-boot:run