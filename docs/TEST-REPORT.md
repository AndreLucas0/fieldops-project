# Relatório de testes

Execução de 24 de novembro de 2026 em Windows, com Node 22.19.0, npm 10.9.3 e Java 21.0.11.

| Comando | Resultado |
|---|---|
| Web · `npm test -- --watch=false` | 324 testes aprovados em 38 arquivos. |
| Web · `npm run build` | Build aprovado. Dois avisos de orçamento de CSS em detalhe e revisão. |
| Mobile · `npm test -- --runInBand` | Linha de base com 442 aprovados e dois casos presos no carregamento do detalhe. Na repetição isolada, a falha ocorreu em outro caso da mesma suíte. |
| Mobile · `npm test -- --runInBand --silent` | 444 testes aprovados após desabilitar a latência simulada no cliente compartilhado da suíte de detalhe. |
| Mobile · `npm run typecheck` e `npm run lint` | Tipagem aprovada. Lint sem erros e com quatro avisos de diretivas desnecessárias. |
| Mobile · `expo export --platform android` e `expo export --platform web` | Bundles exportados. A exportação web inclui o WASM do SQLite. |
| Backend · `mvnw.cmd -B verify` | A linha de base falhou com 304 erros de inicialização. Testcontainers não encontrou um Docker válido. |
| Backend · `mvnw.cmd -B verify -DskipITs` | Linha de base com RN-029, 53 testes unitários aprovados e JAR gerado. |
| Backend · `mvnw.cmd -B verify -DskipITs -Dcheckstyle.skip` | Perfil de produção em `466372c`, 54 testes unitários aprovados e JAR gerado. |

Os totais históricos são de dois commits. As 12 classes comuns somam 52 testes. A linha de base acrescenta um caso em `CancelInspectionRequestTest` e a branch de produção acrescenta dois em `JwtConfigTest`. O XML de cancelamento foi gravado às 20:01 e os XMLs da execução de produção às 20:58. Como o Surefire preservou o XML antigo no mesmo diretório, a soma indiscriminada dos arquivos resultaria em 55, valor que não corresponde a nenhuma dessas execuções.

## Revalidação completa em 25 de novembro de 2026

| Commit | Comando | Unitários (Surefire) | Integração (Failsafe) | Build |
|---|---|---:|---:|---|
| `8b5b211` · linha de base | `mvnw.cmd -B verify` | 53 aprovados | 304 aprovados | Sucesso |
| `466372c` · perfil de produção | `mvnw.cmd -B verify` | 54 aprovados | 304 aprovados | Sucesso |

As duas execuções terminaram sem falhas, erros ou exclusões. A suíte de agendamento da linha de base aprovou 20 casos, incluindo o cancelamento válido e as respostas HTTP 400 para entradas inválidas.

Antes do teste, o Docker Desktop estava parado, a distribuição WSL 2 `docker-desktop` estava em estado `Stopped` e o pipe do contexto `desktop-linux` não existia. `docker desktop start --timeout 45` iniciou o daemon Linux 27.4.0. O Testcontainers usou contêineres próprios com a imagem `postgres:latest`, identificada nos logs do Flyway como PostgreSQL 17.4. A composição do projeto usa a versão 16, cuja compatibilidade continua pendente.

A suíte de integração verifica a aplicação em contexto de teste, com o perfil `local` nos testes de controladores e um substituto de armazenamento no teste de evidências. Ativação do perfil `prod` com a configuração final, S3 com credenciais reais, integração ponta a ponta com web e mobile, teste em aparelho e verificações dos PRs continuam pendentes.
