# Relatório de testes

## Branch de retomada em 26 de novembro de 2026

Base `64b8b0a` e Docker Desktop Linux 27.4.0, Node 22.19.0 e Java 21.0.11.

| Verificação | Resultado |
|---|---|
| API · `mvnw.cmd -B -ntp verify` | 55 testes unitários e 309 de integração aprovados com PostgreSQL 16.14 e Flyway V1–V14. O teste `ProductionProfileIT` reproduziu HTTP 401 no health check antes da correção. |
| Web · `npm test -- --watch=false` e `npm run build` | 324 testes em 38 arquivos e build aprovados. Dois avisos existentes de orçamento de CSS, em detalhe e revisão. |
| Mobile · `npm test -- --runInBand --silent`, `npm run typecheck` e `npm run lint` | 444 testes em 37 suítes e tipagem aprovados. Lint sem erros e com quatro avisos existentes. |
| Mobile · `npx expo export --platform android` e `npx expo export --platform web` | Ambos os bundles foram gerados. O export web inclui o WASM do SQLite. |
| API isolada · `node backend/scripts/smoke-release.mjs` | JAR com perfil `prod`, PostgreSQL 16 e MinIO. Após as migrações e a carga inicial de `db/seed.sql`, o fluxo executou por HTTP. Usou usuário, catálogo e modelo de demonstração. Verificou agendamento, atribuição, leitura pelo técnico, resolução de código QR, início, quatro respostas, evidência com coordenadas e leitura dos mesmos bytes pela URL assinada, encerramento, aprovação, pull e histórico. Reenvios de sync retornaram `ALREADY_APPLIED`. O reenvio da foto retornou 409 e a listagem manteve uma única evidência. |
| Web via proxy | `GET /login` pelo servidor Angular retornou 200. Através do mesmo servidor, a API retornou `UP`, aceitou o login e listou a inspeção aprovada do cenário HTTP. |
| Restauração PostgreSQL e imagem da API | `pg_dump -Fc` e `pg_restore --exit-on-error` foram executados em bancos separados de teste. Origem e cópia retornaram 14 migrações válidas, uma inspeção aprovada do cenário e uma evidência vinculada. `docker build` gerou a imagem `fieldops-api:mission-20261126`. Em execução como `10001:10001`, a imagem validou o schema restaurado, retornou `UP` e serviu a inspeção aprovada pelo endpoint autenticado. |
| Compatibilidade de rollback | O JAR anterior, compilado de `64b8b0a`, iniciou sobre o banco restaurado, validou V1–V14 e serviu a mesma inspeção aprovada. Sua sonda sem JWT respondeu 401. O [plano AWS](AWS-DEPLOYMENT.md) registra a implicação para o target group. |
| Interrupção da rede entre API e PostgreSQL | A sonda HTTP ficou sem resposta até o limite do cliente de 45 s, em vez de devolver 503 naquele intervalo. Após reconectar a rede isolada do teste, a mesma sonda voltou a responder `UP`. O timeout efetivo do ALB ainda precisa de validação em AWS. |

O teste HTTP forneceu a imagem e as coordenadas como entradas de teste. A
câmera, o leitor QR, o GPS, a desconexão real do dispositivo, a reinstalação e
a recuperação da fila em SQLite no Android precisam de uma execução em aparelho.
O host de automação de navegador retornou indisponível, o que limitou a
validação do painel ao build, à suíte e ao fluxo HTTP pelo proxy. A AWS precisa
de credenciais válidas para verificar IAM, serviços gerenciados e rollback.

A execução [45907907227](https://github.com/AndreLucas0/fieldops-project/actions/runs/45907907227)
passou nos quatro jobs da primeira revisão do PR #313. O APK daquela execução
usava os dados simulados da configuração anterior. O job atual produz
`fieldops-android-test` para ARM64 e x86-64, com assinatura de teste e API real
definida pela variável `FIELDOPS_API_BASE_URL`. [Build de APKs com Expo](https://docs.expo.dev/build-reference/apk/)

### Regressão das telas prioritárias após o PR #313

Os testes verificam a rota de criação de modelos, a versão histórica pedida
pela URL, a reabertura do rascunho, a criação de inspeção com atribuição
imediata, a reatribuição e o filtro de auditoria. Os 444 testes mobile incluem
persistência em outbox SQLite via doubles de teste, reconexão, rebase de
conflitos, tratamento de permissões, scanner, GPS e fotografia. Não foi
localizado emulador Android neste host.

O Angular aprovou 327 testes e o build. O novo cenário HTTP passou contra a
API real com PostgreSQL 16 e MinIO. Confirmou duas versões de um modelo,
imutabilidade do snapshot original, uso do seletor pelo supervisor sem acesso
à administração de usuários, troca de responsável, perda do acesso do técnico
anterior, GPS na revisão, evidência por URL assinada e auditoria com filtro.
Os resultados da revisão publicada ficam no [PR #315](https://github.com/AndreLucas0/fieldops-project/pull/315).

## Histórico de 24 e 25 de novembro de 2026

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
