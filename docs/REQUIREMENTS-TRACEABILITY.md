# Rastreabilidade inicial

A tabela inventaria as regras locais de [regras-de-negocio.md](regras-de-negocio.md). IN_PROGRESS indica que a validação individual ainda está em curso. A cobertura de histórias, critérios acadêmicos, telas e entidades precisa ser completada a partir de [critérios de aceitação](criterios-de-aceitacao.md), [critérios de avaliação](criterios-de-avaliacao.md) e do material original.

| ID | Regra e critério de aceitação | Estado | Evidência desta execução |
|---|---|---|---|
| ACAD-NOTION | Conferir regras e avaliação no material original do professor. | BLOCKED | Consulta pública indisponível, conector retornou 404 para o ID e navegador indisponível. |
| RN-001 | Somente usuários ativos poderão iniciar uma nova sessão. | IN_PROGRESS | Validação individual pendente. |
| RN-002 | A inativação de um usuário não excluirá seus registros históricos. | IN_PROGRESS | Validação individual pendente. |
| RN-003 | A API deverá validar o perfil em todas as operações protegidas. | IN_PROGRESS | Validação individual pendente. |
| RN-004 | O técnico somente poderá consultar integralmente as inspeções atribuídas a ele. | IN_PROGRESS | Validação individual pendente. |
| RN-005 | O supervisor poderá consultar e revisar inspeções pertencentes ao seu escopo. | IN_PROGRESS | Validação individual pendente. |
| RN-006 | O administrador poderá gerenciar usuários e cadastros, mas não deverá alterar respostas de inspeção por padrão. | IN_PROGRESS | Validação individual pendente. |
| RN-007 | Credenciais e tokens não poderão ser gravados em logs. | IN_PROGRESS | Validação individual pendente. |
| RN-008 | A troca de senha ou o bloqueio do usuário deverá invalidar sessões conforme a política definida pela API. | IN_PROGRESS | Validação individual pendente. |
| RN-009 | Todo local deverá pertencer a um cliente. | IN_PROGRESS | Validação individual pendente. |
| RN-010 | Todo equipamento deverá pertencer a um local no MVP. | IN_PROGRESS | Validação individual pendente. |
| RN-011 | O código QR de um equipamento deverá ser único. | IN_PROGRESS | Validação individual pendente. |
| RN-012 | Um equipamento inativo não poderá ser utilizado em uma nova inspeção. | IN_PROGRESS | Validação individual pendente. |
| RN-013 | Registros já utilizados em inspeções deverão ser inativados, não excluídos fisicamente. | IN_PROGRESS | Validação individual pendente. |
| RN-014 | O local selecionado para a inspeção deverá ser compatível com o equipamento selecionado. | IN_PROGRESS | Validação individual pendente. |
| RN-015 | Todo modelo deverá possuir título, categoria e ao menos uma seção com item válido antes da publicação. | IN_PROGRESS | Validação individual pendente. |
| RN-016 | Todo item deverá possuir um tipo de resposta. | IN_PROGRESS | Validação individual pendente. |
| RN-017 | A ordem de seções e itens deverá ser explícita. | IN_PROGRESS | Validação individual pendente. |
| RN-018 | Um modelo em rascunho poderá ser alterado livremente por usuário autorizado. | IN_PROGRESS | Validação individual pendente. |
| RN-019 | Uma versão publicada não poderá ser alterada de forma destrutiva. | IN_PROGRESS | Validação individual pendente. |
| RN-020 | Alterações em um modelo publicado deverão gerar nova versão. | IN_PROGRESS | Validação individual pendente. |
| RN-021 | Uma inspeção deverá preservar um snapshot dos itens da versão utilizada. | IN_PROGRESS | Validação individual pendente. |
| RN-022 | A desativação de um modelo não afetará inspeções existentes. | IN_PROGRESS | Validação individual pendente. |
| RN-023 | Tipos de resposta não suportados pelo aplicativo não poderão ser publicados para uso no MVP. | IN_PROGRESS | Validação individual pendente. |
| RN-024 | Uma inspeção deverá estar vinculada a uma versão publicada de modelo. | IN_PROGRESS | Validação individual pendente. |
| RN-025 | Uma inspeção deverá possuir cliente, local, técnico e data prevista. | IN_PROGRESS | Validação individual pendente. |
| RN-026 | O equipamento poderá ser opcional somente quando o tipo de inspeção for definido para local ou ambiente. | IN_PROGRESS | Validação individual pendente. |
| RN-027 | Somente técnico ativo poderá receber nova atribuição. | IN_PROGRESS | Validação individual pendente. |
| RN-028 | Uma inspeção atribuída deverá aparecer para o técnico após sincronização. | IN_PROGRESS | Validação individual pendente. |
| RN-029 | O cancelamento deverá registrar usuário, data e justificativa. | IMPLEMENTED | Validação unitária aprovada. HTTP e persistência dependem da integração com Docker. |
| RN-030 | Uma inspeção aprovada não poderá ser cancelada pelo fluxo comum. | IN_PROGRESS | Validação individual pendente. |
| RN-031 | O MVP permitirá somente um técnico responsável por inspeção. | IN_PROGRESS | Validação individual pendente. |
| RN-032 | Somente inspeções atribuídas poderão ser iniciadas. | IN_PROGRESS | Validação individual pendente. |
| RN-033 | Somente o técnico responsável poderá iniciar e responder a inspeção, salvo permissão administrativa excepcional não prevista no MVP. | IN_PROGRESS | Validação individual pendente. |
| RN-034 | O início deverá registrar data e hora do dispositivo e, após sincronização, data e hora de recebimento no servidor. | IN_PROGRESS | Validação individual pendente. |
| RN-035 | Cada resposta deverá estar vinculada a um item do snapshot da inspeção. | IN_PROGRESS | Validação individual pendente. |
| RN-036 | Respostas deverão ser validadas conforme seu tipo. | IN_PROGRESS | Validação individual pendente. |
| RN-037 | Itens obrigatórios deverão ser respondidos antes da conclusão. | IN_PROGRESS | Validação individual pendente. |
| RN-038 | Quando configurado, uma resposta não conforme deverá exigir observação. | IN_PROGRESS | Validação individual pendente. |
| RN-039 | Quando configurado como crítico, um item não conforme deverá exigir ao menos uma evidência. | IN_PROGRESS | Validação individual pendente. |
| RN-040 | O progresso deverá considerar itens respondidos em relação aos itens aplicáveis. | IN_PROGRESS | Validação individual pendente. |
| RN-041 | O aplicativo deverá salvar localmente cada alteração confirmada. | IN_PROGRESS | Validação individual pendente. |
| RN-042 | A conclusão deverá registrar o momento real informado pelo dispositivo e o momento de recebimento pelo servidor. | IN_PROGRESS | Validação individual pendente. |
| RN-043 | Após a conclusão local, as respostas ficarão bloqueadas até eventual reprovação ou falha que permita correção. | IN_PROGRESS | Validação individual pendente. |
| RN-044 | A inspeção enviada deverá ser revisada antes da aprovação. | IN_PROGRESS | Validação individual pendente. |
| RN-045 | Toda evidência deverá estar vinculada a uma inspeção e, quando aplicável, a uma resposta ou não conformidade. | IN_PROGRESS | Validação individual pendente. |
| RN-046 | O sistema aceitará somente formatos e tamanhos permitidos. | IN_PROGRESS | Validação individual pendente. |
| RN-047 | Uma evidência ainda não sincronizada não poderá ser apagada silenciosamente por limpeza de cache. | IN_PROGRESS | Validação individual pendente. |
| RN-048 | A exclusão de uma evidência já sincronizada deverá ser auditada e respeitar o estado da inspeção. | IN_PROGRESS | Validação individual pendente. |
| RN-049 | Evidências de inspeções aprovadas serão somente leitura. | IN_PROGRESS | Validação individual pendente. |
| RN-050 | O nome original do arquivo não será utilizado como único identificador. | IN_PROGRESS | Validação individual pendente. |
| RN-051 | Metadados sensíveis desnecessários poderão ser removidos ou ignorados conforme política do produto. | IN_PROGRESS | Validação individual pendente. |
| RN-052 | Toda não conformidade deverá pertencer a uma inspeção. | IN_PROGRESS | Validação individual pendente. |
| RN-053 | A não conformidade poderá ser associada a um item específico. | IN_PROGRESS | Validação individual pendente. |
| RN-054 | A criticidade deverá assumir um valor válido: baixa, média, alta ou crítica. | IN_PROGRESS | Validação individual pendente. |
| RN-055 | Não conformidades críticas deverão exigir descrição e evidência. | IN_PROGRESS | Validação individual pendente. |
| RN-056 | A exclusão de uma não conformidade após envio deverá ser substituída por alteração de estado ou operação auditável. | IN_PROGRESS | Validação individual pendente. |
| RN-057 | O tratamento completo da não conformidade após a aprovação pertence a uma versão futura, mas seu registro fará parte do MVP. | IN_PROGRESS | Validação individual pendente. |
| RN-058 | O aplicativo deverá solicitar consentimento antes de acessar câmera ou localização. | IN_PROGRESS | Validação individual pendente. |
| RN-059 | A recusa da permissão deverá produzir orientação e alternativa quando a regra permitir. | IN_PROGRESS | Validação individual pendente. |
| RN-060 | A localização não será coletada continuamente no MVP. | IN_PROGRESS | Validação individual pendente. |
| RN-061 | A localização poderá ser registrada no início e na conclusão. | IN_PROGRESS | Validação individual pendente. |
| RN-062 | O sistema deverá armazenar latitude, longitude, precisão e horário quando disponíveis. | IN_PROGRESS | Validação individual pendente. |
| RN-063 | A leitura de QR Code não deverá, sozinha, autorizar acesso a dados não permitidos ao usuário. | IN_PROGRESS | Validação individual pendente. |
| RN-064 | Divergência entre o equipamento previsto e o lido deverá ser informada antes da continuidade. | IN_PROGRESS | Validação individual pendente. |
| RN-065 | Inspeções previamente baixadas deverão permanecer acessíveis sem conexão. | IN_PROGRESS | Validação individual pendente. |
| RN-066 | Dados não sincronizados deverão sobreviver ao fechamento e à reabertura do aplicativo. | IN_PROGRESS | Validação individual pendente. |
| RN-067 | Cada operação enviada deverá possuir identificador idempotente único. | IN_PROGRESS | Validação individual pendente. |
| RN-068 | O reenvio da mesma operação não poderá criar duplicidade. | IN_PROGRESS | Validação individual pendente. |
| RN-069 | Operações deverão ser processadas respeitando dependências. | IN_PROGRESS | Validação individual pendente. |
| RN-070 | Falha em uma operação não deverá apagar outras operações pendentes. | IN_PROGRESS | Validação individual pendente. |
| RN-071 | O aplicativo deverá exibir a quantidade de operações pendentes. | IN_PROGRESS | Validação individual pendente. |
| RN-072 | O aplicativo deverá informar data e resultado da última sincronização. | IN_PROGRESS | Validação individual pendente. |
| RN-073 | O servidor será a fonte oficial após a confirmação da sincronização. | IN_PROGRESS | Validação individual pendente. |
| RN-074 | O aplicativo deverá preservar a data de execução capturada no dispositivo, além da data de recebimento no servidor. | IN_PROGRESS | Validação individual pendente. |
| RN-075 | Conflitos deverão ser detectados por versão, data ou outro mecanismo explícito. | IN_PROGRESS | Validação individual pendente. |
| RN-076 | No MVP, dados aprovados no servidor prevalecerão e não aceitarão atualização tardia comum. | IN_PROGRESS | Validação individual pendente. |
| RN-077 | Uma inspeção cancelada no servidor não deverá ter seus dados locais pendentes descartados sem aviso. | IN_PROGRESS | Validação individual pendente. |
| RN-078 | Arquivos poderão ser sincronizados separadamente dos dados estruturados, mantendo rastreamento do estado individual. | IN_PROGRESS | Validação individual pendente. |
| RN-079 | Somente supervisor autorizado poderá iniciar a revisão. | IN_PROGRESS | Validação individual pendente. |
| RN-080 | A reprovação deverá possuir motivo. | IN_PROGRESS | Validação individual pendente. |
| RN-081 | A aprovação deverá registrar supervisor, data e comentário opcional. | IN_PROGRESS | Validação individual pendente. |
| RN-082 | Uma inspeção aprovada ficará bloqueada para edição comum. | IN_PROGRESS | Validação individual pendente. |
| RN-083 | Correções após reprovação deverão preservar histórico das versões anteriores. | IN_PROGRESS | Validação individual pendente. |
| RN-084 | O supervisor não deverá alterar silenciosamente a resposta fornecida pelo técnico. | IN_PROGRESS | Validação individual pendente. |
| RN-085 | Ajustes administrativos deverão ser diferenciados de respostas de campo e auditados. | IN_PROGRESS | Validação individual pendente. |
| RN-086 | Alterações críticas deverão registrar usuário, data, ação e entidade. | IN_PROGRESS | Validação individual pendente. |
| RN-087 | Datas de criação e atualização deverão ser mantidas pelo servidor. | IN_PROGRESS | Validação individual pendente. |
| RN-088 | Entidades utilizadas em registros históricos não poderão ser excluídas fisicamente pelo fluxo comum. | IN_PROGRESS | Validação individual pendente. |
| RN-089 | A API deverá rejeitar transições de estado inválidas. | IN_PROGRESS | Validação individual pendente. |
| RN-090 | A documentação da API deverá refletir os estados, validações e erros implementados. | IN_PROGRESS | Validação individual pendente. |
