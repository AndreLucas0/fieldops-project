# Preparação para implantação em AWS

Proposta a validar para o FieldOps. O painel Angular pode ser distribuído pelo CloudFront com origem S3 privada. A API em contêiner pode rodar no ECS/Fargate atrás de um ALB com HTTPS. O PostgreSQL 16 no RDS fica em sub-redes privadas com acesso restrito ao grupo de segurança da API. Um bucket S3 privado guarda evidências. O ambiente local continua usando a composição de desenvolvimento.

Configurar `SPRING_PROFILES_ACTIVE`, `DB_URL`, `DB_USER`, `DB_PASSWORD`, `JWT_SECRET`, `CORS_ALLOWED_ORIGINS`, `EVIDENCE_STORAGE_REGION`, `EVIDENCE_STORAGE_BUCKET` e os limites de upload. Injetar senha e chave JWT do Secrets Manager. Antes de implantar, adaptar o cliente S3 para credenciais temporárias do papel da tarefa, remover o endpoint do emulador da configuração AWS e validar a margem de expiração de URLs assinadas. Confirmar acesso privado ao bucket, criptografia e bloqueio de acesso público.

1. Criar e validar imagem imutável da API e build do painel com URL HTTPS da API.
2. Configurar rede, papéis, segredos, banco, bucket e logs no ambiente autorizado.
3. Restaurar dados sanitizados em ambiente de validação e aplicar Flyway V1–V14 conforme a versão do artefato.
4. Validar o caminho de saúde do Actuator e acesso do ALB no ambiente de teste. Testar autenticação e um ciclo de upload e leitura de evidência.
5. Monitorar erros HTTP, latência, tarefas, conexões do banco e erros de armazenamento no CloudWatch, omitindo tokens e URLs assinadas dos logs.
6. Para rollback, reimplantar a definição de tarefa e o artefato web anteriores após confirmar compatibilidade com o schema. Em caso de recuperação de dados, restaurar o RDS em instância separada e validar a integridade antes de redirecionar a API.

Habilitar backups automatizados e recuperação pontual no RDS e revisar versionamento e ciclo de vida do S3. Dimensionar custo com região, volume de evidências, tráfego, banco e número de tarefas. A estimativa depende desses parâmetros. O perfil de produção, a infraestrutura como código e os exercícios de implantação ainda precisam ser verificados.
