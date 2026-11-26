# Entrega parcial do FieldOps

**INCOMPLETE** em 25 de novembro de 2026.

A API passou a exigir justificativa válida de cancelamento (RN-029) e o OpenAPI documenta o limite de 500 caracteres. O commit `2b01a60` inclui a validação unitária e os cenários HTTP aprovados no teste de agendamento. O commit `6275849` remove a dependência da latência simulada da suíte de detalhe mobile.

A [rastreabilidade inicial](REQUIREMENTS-TRACEABILITY.md) inventaria 90 regras locais. A [auditoria](PROJECT-AUDIT.md) registra as divergências encontradas na linha de base e o [relatório de testes](TEST-REPORT.md) traz a evidência por componente.

O Docker Desktop foi iniciado no Windows e as duas branches passaram no `mvnw.cmd -B verify` completo. A linha de base aprovou 53 testes unitários e o perfil de produção aprovou 54. Cada branch aprovou 304 testes de integração com PostgreSQL 17.4 no Testcontainers. A diferença de contagem decorre dos testes específicos de cada branch. O relatório distingue essas execuções da falha histórica de inicialização do Docker.

A branch `fix/fieldops-production-profile` foi publicada com o commit `466372c`. O perfil `prod` exige configuração própria do banco e da chave JWT, desabilita a publicação do Swagger e utiliza a cadeia padrão de credenciais do SDK da AWS para o S3. O JAR inclui o perfil. A [proposta AWS](AWS-DEPLOYMENT.md) ainda depende de revisão do PR, infraestrutura como código e validação das configurações de produção com PostgreSQL 16, S3 e IAM.

A branch `task/fieldops-baseline-20261124` também foi publicada no GitHub. O conector devolveu HTTP 403 ao tentar abrir os dois PRs para `develop` e o GitHub CLI não tem sessão ativa. PRs, verificações remotas e merges estão pendentes.

## Revisão das branches publicadas

As referências remotas conferidas foram `develop` em `a1037da`, `task/fieldops-baseline-20261124` em `8b5b211` e `fix/fieldops-production-profile` em `466372c`. Os diffs completos abrangeram 15 e 6 arquivos, respectivamente, e passaram em `git diff --check`. A linha de base traz RN-029, OpenAPI, testes de regressão, ajuste da latência simulada na suíte mobile e relatórios. O perfil de produção altera a configuração Spring, a construção do cliente e assinador S3, a validação da chave JWT, seus testes e a documentação de arquitetura.

- **JWT** — A validação rejeita chaves ausentes, em branco ou abaixo de 32 bytes UTF-8. Ela roda em todos os perfis e pode impedir a inicialização de instalações antigas com chaves curtas. Em produção, injete uma chave aleatória via Secrets Manager. A validação de comprimento, sozinha, não mede entropia.
- **Configuração Spring** — Use `SPRING_PROFILES_ACTIVE=prod` e configure `DB_URL`, `DB_USER`, `DB_PASSWORD`, `JWT_SECRET`, `CORS_ALLOWED_ORIGINS`, `EVIDENCE_STORAGE_REGION` e `EVIDENCE_STORAGE_BUCKET`. O perfil usa Hibernate em modo `validate` e desabilita o Swagger e a geração automática do OpenAPI. A inicialização com o conjunto real de variáveis, as origens autorizadas e o retorno de saúde para o ALB precisam de validação específica. O código atual exige autenticação por padrão, inclusive para rotas sem exceção explícita como a saúde do Actuator.
- **S3** — Em produção, o SDK resolve o endpoint e as credenciais para cliente e assinador. Variáveis AWS, propriedades Java e credenciais de perfil podem ter precedência sobre o papel ECS. Para usar o papel, deixe essas fontes concorrentes fora da tarefa e configure a região do bucket. O modo local mantém credenciais e endpoint explícitos, com path-style no cliente de operações. Teste leitura, gravação, exclusão e expiração de URL assinada em ambiente isolado. [Cadeia de credenciais do SDK](https://docs.aws.amazon.com/sdk-for-java/latest/developer-guide/credentials-chain.html) e [expiração de URLs assinadas](https://docs.aws.amazon.com/AmazonS3/latest/userguide/using-presigned-url.html).

## Fontes de requisitos

- **Notion** — O URL público respondeu HTTP 200, mas a resposta consultada traz apenas a estrutura genérica do Notion. O conector retornou 404 para o ID da página, a pesquisa pelo ID não encontrou uma cópia e a automação do navegador não pôde iniciar. O conteúdo original continua sem acesso confirmado. As 90 regras inventariadas vêm dos documentos locais. [Página acadêmica](https://glaucotodesco.notion.site/Aplica-es-Mobile-23f5d52a81f5808c843cebe7e4642b13)
- **Lovable** — O HTML público retornou HTTP 200 e confirmou o formulário Inspect Pro Console, com e-mail, senha e perfis de demonstração Administrador e Supervisor. O workspace conectado lista dois outros projetos. A verificação do formulário foi feita por HTML. Os fluxos autenticados, as interações JavaScript e a comparação visual continuam pendentes. [Login público do protótipo](https://inspect-pro-admin-suite.lovable.app/login)

## Abertura manual dos PRs

Em 25 de novembro, a API pública não listou PRs para nenhuma das duas branches com destino a `develop`. A tentativa anterior pelo conector retornou HTTP 403 e o GitHub CLI continua sem sessão. Com uma conta autorizada, abra cada link, confirme **base `develop`** e a branch de comparação indicada, cole o título e a descrição e clique em **Create pull request**. Acompanhe as verificações automáticas na aba **Checks** e deixe os PRs abertos para revisão.

1. [Abrir comparação da linha de base](https://github.com/AndreLucas0/fieldops-project/compare/develop...task%2Ffieldops-baseline-20261124?expand=1)
   - **Branch** `task/fieldops-baseline-20261124`
   - **Título** `fix: exigir justificativa para cancelar inspeções`
   - **Descrição** «Aplica RN-029 no endpoint de cancelamento, documenta a justificativa no OpenAPI e inclui testes para entradas inválidas. Estabiliza a suíte mobile de detalhe e registra no relatório as verificações executadas e as pendências.»
2. [Abrir comparação do perfil de produção](https://github.com/AndreLucas0/fieldops-project/compare/develop...fix%2Ffieldops-production-profile?expand=1)
   - **Branch** `fix/fieldops-production-profile`
   - **Título** `feat: configurar perfil de produção da API`
   - **Descrição** «Adiciona o perfil Spring prod, valida o tamanho da chave JWT, desabilita o Swagger em produção e usa a cadeia padrão de credenciais da AWS no cliente e no assinador S3. Os resultados locais estão no relatório de testes. A validação do perfil em ambiente AWS isolado segue pendente.»
