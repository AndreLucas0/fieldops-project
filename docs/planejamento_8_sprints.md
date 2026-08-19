# Planejamento Sprints do Projeto

## Visão geral

O desenvolvimento do projeto será organizado em 8 sprints, seguindo uma ordem incremental: primeiro a fundação e a segurança, depois os cadastros e a configuração das inspeções, em seguida o fluxo mobile/offline e, por fim, sincronização, revisão, segurança e validação da versão final.

Os incrementos devem atender aos critérios gerais de aceitação: regras de negócio, autorização por perfil, tratamento dos estados de carregamento/vazio/erro/sucesso, persistência adequada, atualização do contrato da API, integração entre aplicações, evidências de teste e ausência de erros críticos conhecidos.

---

## Sprint 1 — Fundação e Autenticação

### Objetivo
Construir a infraestrutura inicial e garantir que somente usuários autorizados tenham acesso ao sistema.

### Atividades
- Configuração do backend e frontend.
- Configuração do banco de dados.
- Criação da estrutura inicial de usuários e perfis.
- Implementação de login.
- Implementação de sessão/token.
- Controle de acesso por perfil.
- Implementação de logout.
- Tratamento de credenciais inválidas.
- Bloqueio de usuários inativos.
- Renovação controlada de sessão.
- Proteção inicial das rotas da API.

### Critérios de aceite
- Login válido cria uma sessão e direciona o usuário à área protegida.
- Credenciais inválidas são rejeitadas sem revelar se o e-mail existe.
- Usuários inativos não conseguem entrar.
- Rotas protegidas rejeitam requisições sem sessão válida.

---

## Sprint 2 — Usuários, Clientes, Locais e Equipamentos

### Objetivo
Disponibilizar os cadastros necessários para estruturar as inspeções.

### Atividades
- CRUD de usuários.
- Definição de perfis e situações.
- Validação de e-mail único.
- Cadastro de clientes.
- Cadastro de locais.
- Associação de locais aos clientes.
- Cadastro de equipamentos.
- Associação de equipamentos aos locais.
- Geração/registro de QR Code.
- Filtros e pesquisas.
- Controle de ativos/inativos.

### Critérios de aceite
- Administrador consegue cadastrar usuários.
- Cliente pode ser pesquisado e filtrado.
- Todo local possui um cliente.
- Equipamento possui local no MVP.
- QR Code é único.
- Equipamentos inativos não podem ser utilizados em novas inspeções.

---

## Sprint 3 — Modelos de Inspeção e Versionamento

### Objetivo
Permitir que o supervisor configure os checklists utilizados nas inspeções.

### Atividades
- Cadastro de modelos.
- Criação de seções.
- Criação de itens.
- Definição dos tipos de resposta.
- Definição de itens obrigatórios.
- Configuração de observações.
- Configuração de evidências.
- Criação de rascunhos.
- Publicação de modelos.
- Versionamento.
- Criação de snapshot da versão publicada.

### Critérios de aceite
- Modelo pode ser criado como rascunho.
- Modelo válido pode ser publicado.
- Modelo sem itens ou com itens inválidos não pode ser publicado.
- Alterações em modelos já utilizados geram nova versão.
- Inspeções antigas mantêm o snapshot utilizado originalmente.

---

## Sprint 4 — Agendamento e Atribuição

### Objetivo
Permitir que o supervisor transforme um modelo publicado em uma inspeção atribuída a um técnico.

### Atividades
- Tela de agendamento.
- Seleção do modelo e versão.
- Seleção de cliente.
- Seleção de local.
- Seleção de equipamento quando necessário.
- Seleção do técnico.
- Definição da data prevista.
- Validação das relações entre cliente, local e equipamento.
- Criação do snapshot da inspeção.
- Atribuição ao técnico.
- Cancelamento com justificativa.
- Registro de auditoria.

### Critérios de aceite
- Modelo selecionado deve estar publicado.
- Cliente, local, técnico e data são obrigatórios.
- Local pertence ao cliente.
- Equipamento pertence ao local.
- Técnico está ativo.
- Inspeção recebe snapshot dos itens.
- Inspeção fica disponível ao técnico após sincronização.

---

## Sprint 5 — Aplicativo Mobile e Checklist

### Objetivo
Desenvolver o principal fluxo utilizado pelo técnico em campo.

### Atividades
- Login no aplicativo.
- Lista de inspeções atribuídas.
- Filtros.
- Indicadores de estado.
- Tela de detalhes.
- Download das inspeções.
- Armazenamento local.
- Início da inspeção.
- Registro de data e hora.
- Checklist dinâmico.
- Componentes de resposta.
- Validação dos campos.
- Persistência das respostas em SQLite.
- Cálculo de progresso.
- Identificação de itens obrigatórios pendentes.

### Critérios de aceite
- Técnico visualiza somente inspeções autorizadas.
- Detalhes funcionam offline para inspeções baixadas.
- Respostas permanecem após fechar e abrir o aplicativo.
- Itens aparecem na ordem definida pelo snapshot.
- Respostas inválidas são bloqueadas.
- Progresso é recalculado corretamente.

---

## Sprint 6 — Evidências, QR Code, Localização e Não Conformidades

### Objetivo
Completar os recursos necessários para que uma inspeção possa ser realizada em campo.

### Atividades
- Captura de fotografias.
- Pré-visualização e confirmação da foto.
- Armazenamento local das evidências.
- Associação da evidência ao item.
- Leitura de QR Code.
- Validação do equipamento.
- Alternativa de identificação manual.
- Solicitação de localização.
- Registro de latitude, longitude, precisão e horário.
- Cadastro de não conformidades.
- Definição de criticidade.
- Exigência de evidência para não conformidades críticas.

### Critérios de aceite
- Foto pode ser capturada, visualizada e refeita.
- Evidências continuam disponíveis quando o dispositivo está offline.
- QR Code não permite acesso a equipamentos fora do escopo.
- Localização é coletada de forma pontual.
- Falhas de localização não encerram o aplicativo.
- Não conformidades críticas exigem evidência.

---

## Sprint 7 — Funcionamento Offline e Sincronização

### Objetivo
Garantir que o técnico consiga concluir inspeções mesmo sem conexão e que os dados sejam sincronizados posteriormente.

### Atividades
- Implementação da outbox.
- Criação de operações pendentes.
- Persistência das operações no dispositivo.
- Sincronização quando houver conexão.
- Controle de ordem das operações.
- Idempotência.
- Tratamento de falhas parciais.
- Reenvio de operações.
- Controle de conflitos.
- Sincronização de arquivos.
- Estados de upload.
- Conclusão offline.
- Atualização da quantidade de operações pendentes.
- Exibição da última sincronização.

### Critérios de aceite
- Operações são enviadas na ordem correta.
- Reenvio não cria duplicidades.
- Operações confirmadas permanecem confirmadas quando outra falha.
- Conflitos são identificados sem apagar a alteração local.
- Outbox permanece após sair e entrar no aplicativo.
- Inspeções podem ser concluídas offline.
- Evidências com falha permanecem pendentes para nova tentativa.

---

## Sprint 8 — Administração, Revisão, Segurança e Release

### Objetivo
Finalizar o sistema, integrar todos os fluxos e preparar a versão para entrega.

### Atividades
- Painel administrativo.
- Listagem das inspeções.
- Paginação.
- Filtros por estado, técnico, cliente, prioridade e período.
- Identificação de inspeções atrasadas.
- Tela de revisão.
- Aprovação de inspeções.
- Reprovação com justificativa.
- Registro de auditoria.
- Atualização do resultado no aplicativo do técnico.
- Revisão das permissões.
- Testes de segurança.
- Testes de integração.
- Testes offline.
- Testes de sincronização.
- Correção de bugs.
- Teste completo de aceitação.
- Preparação da versão final.

### Critérios de aceite
- Administrador consegue acompanhar as inspeções.
- Supervisor consegue iniciar uma revisão.
- Aprovação registra revisor e horário.
- Reprovação exige motivo.
- Técnico recebe o resultado na próxima sincronização.
- Endpoints e arquivos permanecem protegidos.
- Senhas, tokens e segredos não aparecem indevidamente.
- Não existem erros críticos conhecidos no fluxo entregue.

---

## Fluxo Final do Projeto

Ao término dos 8 sprints, o projeto deverá permitir demonstrar o seguinte fluxo:

**Login → Cadastro → Modelo de inspeção → Publicação → Agendamento → Atribuição → Download → Início → Checklist → Foto → QR Code → Localização → Trabalho offline → Conclusão → Sincronização → Acompanhamento administrativo → Revisão → Aprovação/Reprovação → Histórico.**

Esse fluxo representa o cenário completo de aceitação da versão final do sistema.
