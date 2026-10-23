# Gerenciamento das Aquisições — Projeto FieldOps

## 1. Objetivo

Identificar, planejar e controlar os recursos, ferramentas e serviços necessários ao desenvolvimento, aos testes e à disponibilização da plataforma FieldOps.

O projeto contempla aplicativo mobile, interface administrativa web, API REST, PostgreSQL e armazenamento de evidências compatível com S3. A prioridade é utilizar ferramentas gratuitas e infraestrutura local, considerando serviços de nuvem apenas quando houver necessidade.

## 2. Tabela de gerenciamento das aquisições

**Importante:** os valores de nuvem abaixo são hipóteses orçamentárias para planejamento, não cotações comerciais verificadas. Quantidades de equipamentos próprios e instalações devem ser confirmadas com a equipe. Custos recorrentes foram anualizados para 12 meses.

| ID | Item/recurso | Urgência | Motivo/necessidade | Fornecedor potencial | Quantidade/unidade | Custo unitário estimado | Custo total estimado | Situação/observação |
|---|---|---|---|---|---:|---:|---:|---|
| AQ-01 | Computadores para desenvolvimento | Alta | Desenvolver, executar e testar mobile, web e backend | Equipamentos próprios da equipe | Até 8 existentes, a confirmar | R$ 0,00 adicional | R$ 0,00 adicional | Não comprar se os equipamentos disponíveis atenderem aos requisitos |
| AQ-02 | Java JDK 21 | Alta | Compilar e executar o backend Spring Boot | Eclipse Adoptium | 1 instalação por ambiente de desenvolvimento | R$ 0,00 | R$ 0,00 | Software gratuito |
| AQ-03 | Node.js e npm | Alta | Executar Angular, Expo/React Native e ferramentas de teste | Node.js | 1 instalação por ambiente | R$ 0,00 | R$ 0,00 | Verificar compatibilidade com as versões do projeto |
| AQ-04 | Docker e Docker Compose | Alta | Executar serviços locais e ambientes de teste | Docker | 1 instalação por ambiente compatível | R$ 0,00 no cenário gratuito elegível | R$ 0,00 estimado | Confirmar os termos de uso aplicáveis |
| AQ-05 | PostgreSQL 16 | Alta | Persistência dos dados da aplicação | PostgreSQL Global Development Group | 1 instância local de desenvolvimento | R$ 0,00 | R$ 0,00 | Software gratuito |
| AQ-06 | Armazenamento compatível com S3 para desenvolvimento | Alta | Testar envio e recuperação de fotografias e evidências | Adobe S3Mock | 1 instância local | R$ 0,00 | R$ 0,00 | Uso de desenvolvimento/testes; não equivale a armazenamento de produção |
| AQ-07 | Git e GitHub | Alta | Versionamento, colaboração, revisão e rastreabilidade | Git e GitHub | 1 repositório do projeto | R$ 0,00 no plano gratuito aplicável | R$ 0,00 estimado | Confirmar limites e permissões do plano utilizado |
| AQ-08 | Expo e React Native | Alta | Desenvolver o aplicativo mobile e validar o fluxo offline | Expo | 1 aplicação | R$ 0,00 no uso básico | R$ 0,00 estimado | Serviços adicionais podem ter custos |
| AQ-09 | Angular e Angular Material | Alta | Desenvolver o painel administrativo web | Angular | 1 aplicação | R$ 0,00 | R$ 0,00 | Ferramentas de código aberto |
| AQ-10 | Ferramentas de testes automatizados | Alta | Validar backend, web, mobile e integrações | Projetos oficiais das ferramentas adotadas | 1 conjunto por componente | R$ 0,00 estimado | R$ 0,00 estimado | Confirmar licenças e requisitos de execução |
| AQ-11 | Hospedagem do backend | Média | Disponibilizar a API para testes integrados e demonstração remota | AWS ou outro provedor a cotar | 1 ambiente por mês | R$ 150,00/mês (hipótese) | R$ 1.800,00/ano | Contratar somente se o ambiente local não atender |
| AQ-12 | Banco de dados gerenciado | Média | Disponibilizar PostgreSQL remoto sem depender de um computador local | AWS RDS ou outro provedor a cotar | 1 instância por mês | R$ 200,00/mês (hipótese) | R$ 2.400,00/ano | Dimensionar e cotar antes de contratar |
| AQ-13 | Armazenamento de evidências em nuvem | Média | Armazenar fotografias e arquivos de inspeção em ambiente remoto | Amazon S3 ou serviço compatível a cotar | 1 serviço por mês | R$ 30,00/mês (hipótese) | R$ 360,00/ano | O valor depende de armazenamento, requisições e transferência |
| AQ-14 | Monitoramento e registros de execução | Baixa | Apoiar o diagnóstico de falhas e problemas de sincronização | Ferramenta do provedor escolhido | 1 conjunto por mês | R$ 30,00/mês (hipótese) | R$ 360,00/ano | Avaliar primeiro as opções incluídas no plano de hospedagem |
| AQ-15 | Dispositivo Android para testes | Média | Validar câmera, permissões, armazenamento local e operação offline | Equipamento próprio ou aquisição a cotar | 1 aparelho, se não houver disponível | R$ 0,00 se já disponível; caso contrário, cotar | A definir após inventário | Não há evidência de compra realizada |

## 3. Resumo financeiro

| Cenário | Custo estimado | Condições |
|---|---:|---|
| Desenvolvimento e testes locais | R$ 0,00 de licenças adicionais estimadas | Pressupõe equipamentos, internet e infraestrutura já disponíveis; não inclui energia, depreciação nem horas de trabalho |
| Hospedagem do backend por 12 meses | R$ 1.800,00 | Estimativa não cotada |
| Banco de dados gerenciado por 12 meses | R$ 2.400,00 | Estimativa não cotada |
| Armazenamento de evidências por 12 meses | R$ 360,00 | Estimativa não cotada |
| Monitoramento por 12 meses | R$ 360,00 | Estimativa não cotada |
| **Total anual hipotético do cenário hospedado** | **R$ 4.920,00** | Soma das quatro hipóteses de serviços em nuvem; não representa gasto aprovado ou realizado |
| **Média mensal hipotética do cenário hospedado** | **R$ 410,00** | Antes de impostos, variação cambial, excedentes ou custos adicionais |

Os valores devem ser substituídos por cotações atuais antes de qualquer contratação. O custo real depende do dimensionamento, região, tráfego, armazenamento, retenção de logs, impostos e condições comerciais. O cenário local também pode gerar custos indiretos.

## 4. Critérios para selecionar fornecedores

- **Custo total:** preço, limites gratuitos, cobranças por uso e custos de saída/migração.
- **Compatibilidade:** atendimento às tecnologias e versões usadas pelo FieldOps.
- **Confiabilidade:** disponibilidade, backup, recuperação e suporte.
- **Segurança:** controle de acesso, proteção de dados e gestão de segredos.
- **Escalabilidade:** possibilidade de ajustar recursos à demanda.
- **Documentação e suporte:** clareza das instruções e disponibilidade de suporte.
- **Portabilidade:** possibilidade de migrar dados e serviços sem dependência excessiva.
- **Condições contratuais:** cobrança, cancelamento, garantias, retenção e exclusão de dados.

## 5. Processo de gerenciamento

### 5.1 Planejar

Identificar necessidades, inventariar os recursos existentes, definir requisitos técnicos e comparar alternativas gratuitas, locais e hospedadas.

### 5.2 Conduzir

Solicitar cotações quando aplicável; comparar preço, pagamento, limites, segurança, suporte e condições de cancelamento. Nenhuma contratação deve ser considerada aprovada sem autorização do responsável pelo orçamento.

### 5.3 Controlar

Acompanhar custos, disponibilidade, desempenho, segurança, limites de uso e aderência aos requisitos. Registrar desvios e providências.

### 5.4 Encerrar

Confirmar pendências, exportar os dados necessários, cancelar serviços não utilizados e revogar credenciais e acessos que não devam permanecer ativos.

## 6. Critérios de aceitação

| Recurso | Critério de aceitação |
|---|---|
| Ambiente de desenvolvimento | Componentes necessários executam conforme as instruções do repositório |
| Backend/API | API inicia e responde conforme o contrato REST e os testes aplicáveis |
| PostgreSQL | Conexão estabelecida e migrações Flyway executadas sem erros |
| Armazenamento de evidências | Envio e recuperação de arquivos funcionam com autorização adequada no ambiente de teste |
| Aplicativo mobile | Executa e permite validar os fluxos offline e de sincronização previstos |
| Interface web | Executa com mocks ou integração real conforme a configuração documentada |
| Hospedagem, se contratada | API acessível no ambiente acordado, com configuração segura e critérios de disponibilidade definidos |
| GitHub | Código e histórico ficam acessíveis aos integrantes autorizados |

## 7. Responsabilidades

| Responsável/papel | Atribuições |
|---|---|
| Equipe FieldOps | Inventariar recursos, comparar alternativas e validar as ferramentas |
| Responsável pelo backend | Validar API, banco de dados, segurança e armazenamento |
| Responsável pelo mobile | Validar app, armazenamento local, câmera e sincronização |
| Responsável pela interface web | Validar a aplicação Angular e sua integração com a API |
| Coordenação/responsável pelo orçamento | Aprovar ou rejeitar despesas e serviços pagos |
| Fornecedor, quando contratado | Entregar serviços conforme condições e critérios acordados |

Os papéis acima descrevem responsabilidades sugeridas; devem ser associados a pessoas específicas pela equipe.

## 8. Revisão do plano

Revisar o plano quando houver mudança de arquitetura, necessidade de publicação remota, novo requisito de armazenamento, indisponibilidade de fornecedor, alteração de custos ou preparação de uma demonstração que exija infraestrutura externa.

## 9. Conclusão

O FieldOps pode priorizar ferramentas gratuitas e infraestrutura local durante o desenvolvimento. Serviços pagos de nuvem são alternativas condicionais, não aquisições confirmadas. O inventário dos recursos existentes e a cotação prévia devem orientar qualquer decisão de compra, mantendo os custos rastreáveis e compatíveis com o contexto acadêmico.
