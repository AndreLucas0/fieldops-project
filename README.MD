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
