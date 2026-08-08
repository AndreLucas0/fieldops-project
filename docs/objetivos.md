# 02 - Objetivos

# 2. Objetivos

## 2.1 Objetivo geral do produto

Desenvolver uma plataforma integrada que permita configurar, planejar, executar, sincronizar, revisar e auditar inspeções técnicas em campo de forma padronizada, segura e rastreável.

---

## 2.2 Objetivos específicos de negócio

- Reduzir o uso de formulários em papel e planilhas isoladas.
- Padronizar a execução das inspeções por meio de modelos e checklists.
- Diminuir a perda e o preenchimento incompleto de informações.
- Permitir que supervisores acompanhem o andamento das atividades.
- Associar respostas a evidências, data, usuário, equipamento e localização.
- Preservar a rastreabilidade das alterações.
- Permitir a execução de inspeções em locais sem conectividade.
- Reduzir o intervalo entre a execução em campo e a disponibilidade do resultado.
- Facilitar a identificação e o acompanhamento de não conformidades.

---

## 2.3 Objetivos específicos do aplicativo mobile

- Disponibilizar ao técnico apenas as inspeções relacionadas ao seu trabalho.
- Apresentar uma interface adequada ao uso em campo.
- Carregar checklists dinamicamente a partir da API.
- Capturar fotos, QR Code e localização mediante autorização.
- Armazenar localmente inspeções e respostas.
- Exibir claramente o estado de sincronização.
- Evitar a perda de dados em caso de falha de rede ou fechamento do aplicativo.
- Permitir retomada de uma inspeção em andamento.

---

## 2.4 Objetivos específicos da interface administrativa

- Permitir que operações administrativas sejam realizadas sem acesso direto ao banco ou ao Swagger.
- Centralizar o cadastro de clientes, locais, equipamentos e usuários.
- Permitir a criação e manutenção de modelos de inspeção.
- Agendar e atribuir inspeções aos técnicos.
- Acompanhar o status das inspeções.
- Apresentar respostas, evidências e não conformidades de maneira organizada.
- Permitir aprovação, reprovação e solicitação de correção.
- Fornecer indicadores básicos para supervisão.

---

## 2.5 Objetivos específicos da API

- Disponibilizar um contrato REST versionado e documentado.
- Implementar autenticação e autorização por perfil.
- Centralizar e validar as regras de negócio.
- Manter consistência entre mobile, web e banco de dados.
- Disponibilizar operações idempotentes para sincronização.
- Evitar duplicidade de registros em reenvios.
- Registrar auditoria das operações relevantes.
- Tratar erros de forma padronizada.

---

## 2.6 Objetivos acadêmicos

O projeto deverá permitir que os estudantes apliquem, de maneira integrada, os seguintes conhecimentos.

### Desenvolvimento mobile

- Expo e React Native;
- TypeScript;
- Expo Router;
- gerenciamento de estado;
- consumo de API;
- formulários dinâmicos;
- câmera e seleção de imagens;
- QR Code;
- geolocalização;
- SQLite;
- conectividade e sincronização;
- testes, acessibilidade e distribuição.

### Desenvolvimento backend

- Java e Spring Boot;
- modelagem de domínio;
- JPA e PostgreSQL;
- validação;
- autenticação JWT;
- controle de acesso;
- APIs REST;
- upload de arquivos;
- paginação e filtros;
- sincronização;
- testes;
- documentação OpenAPI.

### Desenvolvimento web administrativo

- Angular/React e TypeScript;
- rotas protegidas;
- formulários;
- consumo de API;
- componentes reutilizáveis;
- tabelas, filtros e paginação;
- tratamento de estados de carregamento, vazio e erro;
- revisão de inspeções e visualização de evidências.

### Engenharia de software

- levantamento e refinamento de requisitos;
- backlog e critérios de aceitação;
- Git e Pull Requests;
- separação de responsabilidades;
- integração entre equipes;
- revisão de código;
- testes;
- documentação técnica;
- demonstrações incrementais.

---

## 2.7 Indicadores de sucesso do MVP

O MVP será considerado funcional quando:

- um supervisor conseguir cadastrar ou selecionar os dados necessários sem utilizar diretamente o banco de dados;
- um modelo de inspeção puder ser configurado pela interface administrativa;
- uma inspeção puder ser criada e atribuída a um técnico;
- o técnico conseguir receber e abrir a inspeção no aplicativo;
- o checklist for apresentado dinamicamente;
- os itens obrigatórios forem validados;
- fotografias puderem ser associadas a itens do checklist;
- o equipamento puder ser identificado por QR Code;
- a localização puder ser registrada quando autorizada;
- uma inspeção puder ser executada sem conexão após ser baixada;
- o reenvio da mesma operação não criar dados duplicados;
- o supervisor conseguir revisar, aprovar ou reprovar o resultado;
- uma inspeção aprovada ficar protegida contra alterações comuns;
- a API estiver documentada e puder ser executada a partir das instruções do projeto.

---

## 2.8 Não objetivos

O projeto não tem como objetivo, no MVP:

- substituir sistemas corporativos completos de manutenção;
- garantir conformidade com todas as normas de todos os setores industriais;
- realizar diagnóstico automático;
- controlar equipes em tempo real;
- suportar volume corporativo de milhões de inspeções;
- oferecer todas as funcionalidades de um produto comercial pronto para venda.