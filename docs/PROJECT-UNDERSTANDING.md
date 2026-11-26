# Entendimento do FieldOps

O FieldOps coordena inspeções em campo. ADMIN mantém cadastros e usuários, SUPERVISOR planeja e revisa, e TÉCNICO executa as inspeções atribuídas no Expo. O painel Angular consome a API REST Spring Boot por meio dos serviços de domínio. O aplicativo registra respostas e evidências com persistência local e envia operações pendentes quando conectado. O PostgreSQL mantém o estado oficial e o armazenamento compatível com S3 guarda binários de evidência.

Cliente, local e equipamento definem o contexto da inspeção. Uma versão publicada de checklist fornece os itens copiados para o histórico da inspeção. Respostas, anexos, não conformidades e eventos são vinculados à inspeção. O fluxo passa por planejamento, atribuição, execução, envio e revisão, com correção após reprovação e bloqueio de edição comum após aprovação.

As mudanças de Leonardo presentes no histórico incluem detalhe e revisão administrativa, filtros, atualizações de listagens e correções de build. Os commits `26bee7e`, `ca62b30`, `6dcbcaa` e `e1381da` servem de referência para revalidar esses fluxos. A comparação visual depende do acesso ao Lovable.

Fontes locais: [arquitetura](arquitetura.md), [perfis](perfis-de-usuario.md), [fluxo](fluxo-geral.md), [modelagem](modelo-de-dados.md), [API](api-rest.md), [OpenAPI](../openapi.yaml) e [decisões](../project-state/decisions.md).
