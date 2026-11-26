# Plano de implementação

| Ordem | Trabalho | Dependência | Aceite |
|---|---|---|---|
| 1 | Validar a linha de base, registrar divergências e corrigir RN-029 | Regras locais e OpenAPI | Corpo ausente ou justificativa inválida retornam 400. Justificativa válida é gravada com autor e data. |
| 2 | Reconciliar regras acadêmicas e o design de referência | Acesso ao Notion e Lovable | Fonte original, regras, telas, endpoints, entidades e evidências por requisito. |
| 3 | Revalidar segurança, dados e fluxos de inspeção | Docker com PostgreSQL e acesso ao ambiente de teste | Integração passa com as migrações da base limpa e os estados autorizados. |
| 4 | Fechar lacunas web e mobile e validar sincronização | Contratos e política de conflitos existentes | Fluxo web → API → banco → mobile e retorno via sync verificado com reconexão. |
| 5 | Preparar ambiente de produção isolado | Perfil de produção, IAM, imagem e ambiente de validação | Migração, saúde, logs, rollback e restauração exercitados. |
| 6 | Integrar em `develop` | Permissão de escrita, PR e verificações exigidas | Revisão concluída e verificações aprovadas. |
