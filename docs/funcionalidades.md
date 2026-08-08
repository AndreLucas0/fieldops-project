# 08 - Funcionalidades

# 8. Funcionalidades

## 8.1 Classificação de prioridade

| Prioridade | Significado |
|------------|-------------|
| **P0** | Obrigatória para o MVP e para a demonstração final. |
| **P1** | Importante, implementada após a estabilidade do fluxo principal. |
| **P2** | Evolução futura ou desafio adicional. |

---

## 8.2 Funcionalidades do MVP — P0

### Autenticação e acesso

- login por e-mail e senha;
- emissão e renovação de token;
- encerramento de sessão;
- armazenamento seguro da sessão no mobile;
- proteção de rotas no mobile e na web;
- autorização por perfil na API;
- inativação de usuário.

### Cadastros administrativos

- usuários;
- clientes;
- locais de inspeção;
- equipamentos;
- código QR único por equipamento;
- pesquisa, paginação e filtros básicos;
- inativação lógica de registros.

### Modelos de inspeção

- criação de modelo em rascunho;
- criação e ordenação de seções;
- criação e ordenação de itens;
- definição do tipo de resposta;
- definição de item obrigatório;
- definição de exigência de observação ou evidência;
- prévia do checklist;
- publicação de versão;
- preservação de versões já utilizadas.

### Planejamento de inspeções

- seleção de modelo publicado;
- seleção de cliente, local e equipamento;
- definição de técnico responsável;
- definição de prioridade e data prevista;
- instruções adicionais;
- cancelamento com justificativa;
- acompanhamento por estado.

### Aplicativo do técnico

- login;
- tela inicial com resumo;
- lista de inspeções atribuídas;
- filtros por estado, data e prioridade;
- detalhes da inspeção;
- leitura de QR Code;
- início da inspeção;
- checklist dinâmico;
- salvamento automático local;
- indicador de progresso;
- observações;
- fotografias;
- registro de localização no início e na conclusão, quando autorizado;
- criação de não conformidade;
- validação dos itens obrigatórios;
- conclusão da inspeção;
- tela de sincronização;
- retomada de inspeção em andamento;
- visualização de erro de sincronização.

### Operação offline e sincronização

- download das inspeções atribuídas;
- armazenamento em SQLite;
- persistência de respostas;
- persistência da referência local das evidências;
- outbox de operações;
- envio em lote;
- identificação idempotente;
- repetição controlada em caso de falha;
- atualização do estado local;
- download de alterações do servidor;
- apresentação da última sincronização.

### Revisão administrativa

- lista de inspeções enviadas;
- filtros por técnico, cliente, estado e período;
- visualização do resumo;
- visualização por seção e item;
- visualização das fotografias;
- consulta da localização registrada;
- consulta de não conformidades;
- abertura da revisão;
- aprovação;
- reprovação com motivo obrigatório;
- histórico mínimo de mudanças de estado.

### API e plataforma

- API versionada;
- documentação OpenAPI;
- validação de entrada;
- tratamento global de erros;
- paginação e ordenação;
- upload de imagens;
- controle de acesso;
- auditoria de ações críticas;
- scripts de banco ou migrações;
- dados de demonstração;
- instruções de execução.

---

## 8.3 Funcionalidades importantes — P1

- dashboard administrativo com indicadores;
- contagem de inspeções atrasadas;
- pesquisa textual avançada;
- comentários de revisão por item;
- histórico detalhado das respostas;
- notificações locais;
- notificações push;
- exportação simples de dados;
- geração de relatório em PDF;
- assinatura desenhada no dispositivo;
- reatribuição de técnico;
- múltiplas evidências por item com descrição;
- comparação entre inspeções do mesmo equipamento;
- resolução assistida de conflitos;
- modo escuro;
- biometria para reabrir sessão local;
- painel de sincronizações com detalhes técnicos para suporte.

---

## 8.4 Funcionalidades futuras — P2

- portal completo do cliente;
- múltiplas organizações e multi-tenancy;
- fluxo de tratamento de não conformidades;
- planos de ação;
- ordens de serviço;
- manutenção preventiva;
- assinatura eletrônica avançada;
- geofencing;
- rotas e otimização de deslocamentos;
- registro de áudio;
- vídeo;
- reconhecimento óptico de caracteres;
- análise de imagens por inteligência artificial;
- sugestão automática de criticidade;
- integração com sensores IoT;
- integração com ERP;
- webhooks;
- integrações com armazenamento corporativo;
- relatórios regulatórios específicos;
- painéis analíticos avançados.

---

## 8.5 Tipos de resposta previstos

### Obrigatórios no MVP

- texto curto;
- texto longo;
- número;
- verdadeiro ou falso;
- conforme ou não conforme;
- seleção única;
- data;
- fotografia ou evidência associada.

### Opcionais no MVP ou P1

- seleção múltipla;
- escala numérica;
- horário;
- assinatura;
- localização como resposta;
- QR Code como resposta;
- arquivo;
- medição com unidade.

---

## 8.6 Recorte de escopo recomendado para 16 semanas

Para preservar a qualidade, o projeto deverá priorizar:

- um único técnico responsável por inspeção;
- um único fluxo de revisão;
- tipos de resposta essenciais;
- fotografia como principal evidência;
- Android como validação mobile;
- sincronização baseada em fila e idempotência, sem edição colaborativa simultânea;
- dashboard administrativo simples;
- portal do cliente fora do MVP.