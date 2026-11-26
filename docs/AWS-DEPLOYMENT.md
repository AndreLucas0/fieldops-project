# Preparação para implantação em AWS

Proposta a validar para o FieldOps. O painel Angular pode ser distribuído pelo CloudFront com origem S3 privada. A API em contêiner pode rodar no ECS/Fargate atrás de um ALB com HTTPS. O PostgreSQL 16 no RDS fica em sub-redes privadas com acesso restrito ao grupo de segurança da API. Um bucket S3 privado guarda evidências. O ambiente local continua usando a composição de desenvolvimento.

Configure `SPRING_PROFILES_ACTIVE=prod`, `DB_URL`, `DB_USER`, `DB_PASSWORD`, `JWT_SECRET`, `CORS_ALLOWED_ORIGINS`, `EVIDENCE_STORAGE_REGION`, `EVIDENCE_STORAGE_BUCKET` e os limites de upload. Injete a senha do banco e a chave JWT pelo Secrets Manager. O cliente e o assinador S3 usam a cadeia padrão do SDK no perfil `prod`. Configure o papel da tarefa, verifique a expiração das URLs assinadas e confirme a criptografia e o bloqueio de acesso público do bucket. [Cadeia de credenciais do SDK](https://docs.aws.amazon.com/sdk-for-java/latest/developer-guide/credentials-chain.html)

## Artefatos e health check

Gere o JAR aprovado e monte a imagem a partir da raiz do repositório.

```powershell
Push-Location backend
.\mvnw.cmd -B verify
Pop-Location
docker build -t fieldops-api:release backend
```

O Dockerfile usa a imagem Temurin 21 fixada por digest e executa a aplicação
como `10001:10001`. A etapa de publicação deve usar o digest da imagem enviada
ao registro. [Imagem oficial Eclipse Temurin](https://hub.docker.com/_/eclipse-temurin)

Configure o target group do ALB para `GET /api/v1/actuator/health` na porta
8090, com código de sucesso 200. A API expõe o estado agregado sem exigir JWT.
O perfil `prod` oculta detalhes e componentes e mantém o Swagger desabilitado.
O build Angular usa `/api/v1`. Encaminhe esse prefixo para a origem da API no
CloudFront e sirva as rotas do painel pela origem do build estático.

1. Criar e validar imagem imutável da API e build do painel com URL HTTPS da API.
2. Configurar rede, papéis, segredos, banco, bucket e logs no ambiente autorizado.
3. Restaurar dados sanitizados em ambiente de validação e aplicar Flyway V1–V14 conforme a versão do artefato.
4. Validar o health check pelo ALB e testar autenticação, upload, leitura, exclusão e expiração de evidência no ambiente AWS de teste.
5. Monitorar erros HTTP, latência, tarefas, conexões do banco e erros de armazenamento no CloudWatch, omitindo tokens e URLs assinadas dos logs.
6. Para rollback, reimplantar a definição de tarefa e o artefato web anteriores após confirmar compatibilidade com o schema. Em caso de recuperação de dados, restaurar o RDS em instância separada e validar a integridade antes de redirecionar a API.

Habilite backups automatizados e recuperação pontual no RDS. Revise o versionamento e o ciclo de vida do S3. Dimensione o custo com região, volume de evidências, tráfego, banco e número de tarefas.

O perfil `prod`, o health check, o restore PostgreSQL 16 e o upload com leitura
assinada no MinIO foram exercitados localmente. O provisionamento por código,
o papel ECS, os serviços gerenciados, a publicação e os exercícios de rollback
em AWS seguem pendentes. [Relatório de testes](TEST-REPORT.md)
