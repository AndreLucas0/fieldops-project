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
| Backend · `mvnw.cmd -B verify -DskipITs` | JAR gerado e 53 testes unitários aprovados, incluindo a validação de RN-029. |

Os fluxos com API e PostgreSQL reais, testes em aparelho, verificações do PR e implantação AWS ainda carecem de evidência.
