# 14 - Interface Administrativa Web

# 14. Interface Administrativa Web

## 14.1 Objetivo

Fornecer aos administradores e supervisores uma interface adequada para configurar o sistema, planejar inspeções, acompanhar a operação e revisar resultados, sem necessidade de acesso direto ao banco de dados ou à documentação interativa da API.

## 14.2 Usuários principais

- Administrador;
- Supervisor.

O perfil de cliente somente leitura será uma evolução posterior.

## 14.3 Mapa de navegação sugerido

```
/login
/app
├── /dashboard
├── /users
├── /clients
│   └── /:clientId/sites
├── /sites
│   └── /:siteId/equipment
├── /equipment
├── /inspection-templates
│   ├── /new
│   ├── /:templateId/edit
│   ├── /:templateId/preview
│   └── /:templateId/versions
├── /inspections
│   ├── /new
│   ├── /:inspectionId
│   └── /:inspectionId/review
├── /non-conformities
└── /audit
```

## 14.4 Layout principal

- menu lateral ou navegação equivalente;
- cabeçalho com usuário e ambiente;
- breadcrumbs quando necessários;
- área central responsiva;
- mensagens globais controladas;
- confirmação de ações críticas;
- tratamento consistente de carregamento, vazio e erro.

## 14.5 Dashboard

### MVP

- total de inspeções por estado;
- inspeções atrasadas;
- inspeções aguardando revisão;
- não conformidades por criticidade;
- atalhos para criar inspeção e revisar pendências.

### Evoluções

- tendências por período;
- desempenho por técnico;
- tempo médio;
- distribuição geográfica;
- comparação entre clientes e equipamentos.

## 14.6 Usuários

Funcionalidades:

- listar;
- pesquisar;
- filtrar por perfil e estado;
- cadastrar;
- editar dados permitidos;
- ativar, inativar ou bloquear;
- redefinir acesso por fluxo controlado;
- visualizar inspeções relacionadas, quando autorizado.

## 14.7 Clientes, locais e equipamentos

### Clientes

- listagem;
- cadastro;
- edição;
- inativação;
- acesso aos locais relacionados.

### Locais

- vínculo com cliente;
- endereço;
- coordenadas opcionais;
- contato local;
- equipamentos relacionados.

### Equipamentos

- identificação;
- patrimônio;
- número de série;
- fabricante e modelo;
- QR Code;
- situação;
- histórico de inspeções, como P1.

## 14.8 Construtor de modelos de inspeção

Esta é uma das principais telas administrativas.

Deverá permitir:

- criar modelo em rascunho;
- editar título, descrição e categoria;
- criar seções;
- ordenar seções;
- criar itens;
- selecionar tipo de resposta;
- configurar obrigatoriedade;
- configurar observação e evidência em caso de não conformidade;
- configurar opções de seleção;
- reordenar itens;
- visualizar prévia;
- validar pendências;
- publicar versão;
- consultar versões anteriores.

### Decisão de escopo

Arrastar e soltar é desejável, mas não obrigatório. A ordenação poderá ser implementada inicialmente por botões de mover ou campo de ordem.

## 14.9 Planejamento de inspeções

A tela deverá permitir:

- selecionar modelo e versão publicada;
- selecionar cliente;
- selecionar local filtrado pelo cliente;
- selecionar equipamento filtrado pelo local;
- selecionar técnico ativo;
- definir supervisor;
- definir data prevista;
- definir prioridade;
- incluir instruções;
- validar dados;
- criar e atribuir;
- cancelar com justificativa;
- consultar histórico de estado.

## 14.10 Acompanhamento

A listagem de inspeções deverá conter:

- identificador ou título;
- cliente;
- local;
- equipamento;
- técnico;
- prioridade;
- data prevista;
- estado;
- progresso, quando disponível;
- última atualização;
- indicação de atraso.

Filtros:

- texto;
- estado;
- técnico;
- cliente;
- prioridade;
- período;
- atrasadas;
- aguardando revisão.

## 14.11 Tela de revisão

A revisão deverá apresentar:

- cabeçalho da inspeção;
- técnico e horários;
- localização registrada;
- progresso e resultado;
- seções do checklist;
- resposta por item;
- observação;
- fotografias relacionadas;
- não conformidades;
- histórico de revisões;
- ação aprovar;
- ação reprovar;
- campo de motivo;
- confirmação da decisão.

A interface não deverá permitir que o supervisor edite silenciosamente a resposta original do técnico.

## 14.12 Não conformidades

No MVP:

- listar por inspeção;
- exibir criticidade;
- exibir descrição e evidências;
- filtrar por criticidade;
- consultar item relacionado.

O acompanhamento completo de plano de ação será P2.

## 14.13 Controle de acesso na interface

- Rotas deverão possuir guards.
- Menus deverão respeitar o perfil.
- Botões não autorizados não deverão ser apresentados.
- A API continuará sendo responsável pela decisão final.
- Um erro 403 deverá ser tratado de forma clara.

## 14.14 Integração com a API

- Serviços tipados.
- Interceptador de autenticação.
- Renovação de sessão conforme contrato.
- Tratamento central de erros comuns.
- Cancelamento ou controle de requisições quando necessário.
- Paginação no servidor.
- Filtros refletidos em parâmetros de consulta.
- Modelos de entrada e saída compatíveis com OpenAPI.

## 14.15 Estados obrigatórios de interface

Toda tela de dados deverá considerar:

- carregando;
- sucesso com dados;
- sucesso sem dados;
- erro de validação;
- erro de autorização;
- erro de rede;
- erro interno;
- ação em processamento;
- confirmação de sucesso.

## 14.16 Testes prioritários

- guard de rota;
- permissões por perfil;
- validação de formulário;
- filtro encadeado cliente → local → equipamento;
- criação de modelo;
- bloqueio de publicação inválida;
- criação de inspeção;
- apresentação dos estados;
- aprovação;
- motivo obrigatório na reprovação;
- tratamento de erro da API.

## 14.17 Escopo mínimo da interface administrativa

A interface será considerada completa no MVP quando:

1. o administrador gerenciar usuários;
2. o supervisor cadastrar ou selecionar cliente, local e equipamento;
3. o supervisor criar e publicar um modelo;
4. o supervisor agendar e atribuir uma inspeção;
5. a inspeção aparecer no acompanhamento;
6. o supervisor visualizar o resultado sincronizado;
7. as fotografias estiverem vinculadas aos itens;
8. as não conformidades forem apresentadas;
9. o supervisor aprovar ou reprovar;
10. a decisão for refletida no aplicativo após sincronização.