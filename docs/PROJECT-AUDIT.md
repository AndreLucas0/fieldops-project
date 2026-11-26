# Auditoria inicial do FieldOps

Base `a1037da8f8ee506e84148e25cd5b23a5e0ca21c6`, confirmada localmente e em `origin/develop` em 24 de novembro de 2026.

| Severidade | Evidência e impacto | Resolução |
|---|---|---|
| HIGH | O DTO e o controller de inspeções aceitavam cancelamento sem justificativa. Isso permitia gravar um cancelamento que viola RN-029. | Validação de corpo e justificativa implementada. Conferir evidências no relatório de testes. |
| HIGH | `application.yml` possui valores de desenvolvimento para segredos e `S3EvidenceStorageClient` cria um provedor estático de credenciais. Uma configuração de produção precisa falhar quando os parâmetros obrigatórios faltarem e usar o papel da tarefa. | Preparar perfil de produção, validar IAM e testar a integração em ambiente isolado. |
| MEDIUM | A interface de cancelamento exige dez caracteres e o OpenAPI aceita um caractere não branco. | Confirmar se o limite da interface é uma decisão de produto. O endpoint preserva o mínimo já documentado. |
| MEDIUM | A suíte mobile de referência falhou em dois casos de detalhe no estado de carregamento. | Reproduzir isoladamente e verificar inicialização e sincronização dos fixtures antes de alterar o fluxo de produção. |
| HIGH | Testcontainers ficou sem Docker e encerrou 304 casos com erro de inicialização do contexto. | Reexecutar em um ambiente com Docker Linux disponível e validar Flyway, API e persistência. |

Os inventários anteriores cobrem [web](../project-state/pending-web.md), [mobile](../project-state/pending-mobile.md), [backend](../project-state/backend-audit.md) e [integração](auditoria-frontend-backend.md). Eles são pontos de partida para revalidação no commit atual. O mapeamento do Notion e a inspeção autenticada do Lovable ficaram pendentes.
