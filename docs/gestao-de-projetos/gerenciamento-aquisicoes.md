# Gerenciamento das Aquisições — Projeto FieldOps

## 1. Objetivo

O gerenciamento das aquisições do FieldOps tem como objetivo identificar, planejar e controlar os recursos, ferramentas e serviços necessários para o desenvolvimento, os testes e a disponibilização da plataforma de inspeção em campo.

O projeto contempla aplicativo mobile, interface administrativa web, API REST, banco de dados PostgreSQL e armazenamento de evidências compatível com S3.

Por se tratar de um projeto acadêmico, será priorizado o uso de ferramentas gratuitas e infraestrutura local, com possibilidade de contratação de serviços de nuvem quando necessário.

## 2. Tabela de gerenciamento das aquisições

Os custos apresentados são estimativas para planejamento, não cotações comerciais verificadas. Para serviços recorrentes, o custo total considera 12 meses de utilização.

| ID | Item | Urgência | Motivo | Fornecedor potencial | Quantidade | Custo unitário estimado | Custo total estimado |
|---|---|---|---|---|---:|---:|---:|
| AQ-01 | Computadores para desenvolvimento | Alta | Desenvolver, executar e testar as aplicações. Considera-se que os integrantes já possuem equipamentos. | Recursos próprios da equipe | 8 existentes | R$ 0,00 adicional | R$ 0,00 |
| AQ-02 | Java JDK 21 | Alta | Compilar e executar o backend Spring Boot. | Eclipse Adoptium | 1 instalação por ambiente | R$ 0,00 | R$ 0,00 |
| AQ-03 | Node.js e npm | Alta | Executar Angular, Expo e ferramentas de testes. | Node.js | 1 instalação por ambiente | R$ 0,00 | R$ 0,00 |
| AQ-04 | Docker e Docker Compose | Alta | Executar PostgreSQL, S3Mock e ambientes de testes. | Docker | 1 instalação por ambiente | R$ 0,00 | R$ 0,00 |
| AQ-05 | PostgreSQL 16 | Alta | Armazenar dados persistentes do sistema. | PostgreSQL Global Development Group | 1 instância local | R$ 0,00 | R$ 0,00 |
| AQ-06 | Armazenamento compatível com S3 para desenvolvimento | Alta | Testar o armazenamento e a recuperação de fotografias e evidências. | Adobe S3Mock | 1 instância local | R$ 0,00 | R$ 0,00 |
| AQ-07 | Git e GitHub | Alta | Controlar versões e facilitar a colaboração entre os oito integrantes. | Git e GitHub | 1 repositório | R$ 0,00 no cenário gratuito | R$ 0,00 |
| AQ-08 | Expo e React Native | Alta | Desenvolver o aplicativo mobile e validar a execução offline. | Expo | 1 aplicação | R$ 0,00 no cenário básico | R$ 0,00 |
| AQ-09 | Angular e Angular Material | Alta | Desenvolver a interface administrativa web. | Angular | 1 aplicação | R$ 0,00 | R$ 0,00 |
| AQ-10 | Ferramentas de testes automatizados | Alta | Validar backend, mobile, web e integrações. | Projetos oficiais das ferramentas utilizadas | 1 conjunto | R$ 0,00 | R$ 0,00 |
| AQ-11 | Hospedagem do backend | Média | Disponibilizar a API para testes e demonstrações remotas. | AWS ou outro provedor de nuvem | 1 ambiente | R$ 150,00/mês | R$ 1.800,00/ano |
| AQ-12 | Banco de dados gerenciado | Média | Permitir acesso remoto ao PostgreSQL sem depender de um computador local. | AWS RDS ou outro provedor | 1 instância | R$ 200,00/mês | R$ 2.400,00/ano |
| AQ-13 | Armazenamento de evidências em nuvem | Média | Armazenar fotografias e arquivos das inspeções em ambiente remoto. | Amazon S3 ou serviço compatível | 1 serviço | R$ 30,00/mês | R$ 360,00/ano |
| AQ-14 | Monitoramento e registros de execução | Baixa | Auxiliar na identificação de erros e falhas de sincronização. | Provedor de nuvem | 1 conjunto | R$ 30,00/mês | R$ 360,00/ano |
| AQ-15 | Dispositivo Android para testes | Média | Testar câmera, permissões, armazenamento local e operação offline. Considera-se aparelho já disponível. | Recursos próprios da equipe | 1 aparelho existente | R$ 0,00 adicional | R$ 0,00 |

## 3. Resumo financeiro

| Categoria | Custo estimado |
|---|---:|
| Ferramentas gratuitas e recursos existentes | R$ 0,00 |
| Hospedagem do backend por 12 meses | R$ 1.800,00 |
| Banco de dados gerenciado por 12 meses | R$ 2.400,00 |
| Armazenamento de evidências por 12 meses | R$ 360,00 |
| Monitoramento por 12 meses | R$ 360,00 |
| **Total anual do cenário hospedado** | **R$ 4.920,00** |
| **Média mensal do cenário hospedado** | **R$ 410,00** |
| **Custo adicional do cenário exclusivamente local** | **R$ 0,00** |

Os valores de nuvem são hipóteses orçamentárias e devem ser confirmados por meio de cotações. O custo real dependerá do dimensionamento, da região, do tráfego, do armazenamento e das condições comerciais dos fornecedores.

O cenário local não considera custos indiretos, como energia elétrica, internet, depreciação dos equipamentos e horas de trabalho da equipe.

## 4. Critérios de seleção dos fornecedores

A seleção dos fornecedores deverá considerar:

- **Custo:** priorizar soluções gratuitas ou compatíveis com o orçamento acadêmico.
- **Compatibilidade:** atender às tecnologias utilizadas no FieldOps.
- **Confiabilidade:** oferecer estabilidade e mecanismos de recuperação.
- **Segurança:** proteger os dados, os acessos e as evidências.
- **Escalabilidade:** permitir o aumento de recursos conforme a necessidade.
- **Documentação:** disponibilizar instruções técnicas e suporte adequado.
- **Portabilidade:** reduzir dependências desnecessárias de um único fornecedor.

## 5. Processo de gerenciamento das aquisições

### 5.1 Planejar as aquisições

Identificar as necessidades técnicas, verificar os recursos já disponíveis e definir os requisitos dos serviços que eventualmente precisarão ser contratados.

### 5.2 Conduzir as aquisições

Comparar fornecedores, preços, condições de pagamento, limites de utilização, garantias e suporte. Qualquer contratação deverá ser aprovada pelos responsáveis pelo orçamento do projeto.

### 5.3 Controlar as aquisições

Monitorar custos, disponibilidade, desempenho, segurança e compatibilidade dos serviços contratados com os requisitos do FieldOps.

### 5.4 Encerrar as aquisições

Verificar pendências, encerrar contratos quando necessário, preservar os dados relevantes e revogar credenciais e acessos que não devam continuar ativos.

## 6. Critérios de aceitação

| Recurso | Critério de aceitação |
|---|---|
| Backend hospedado | API acessível e endpoints funcionando conforme o contrato REST. |
| PostgreSQL | Conexão estabelecida e migrações Flyway executadas sem erros. |
| Armazenamento de evidências | Envio e recuperação de arquivos funcionando com acesso autorizado. |
| Ferramentas de desenvolvimento | Ambiente capaz de executar e testar as aplicações. |
| GitHub | Código acessível aos integrantes autorizados e histórico de versões preservado. |
| Aplicativo mobile | Aplicação executando e permitindo validar o funcionamento offline. |
| Interface web | Interface executando com dados simulados ou integração com a API real. |

## 7. Responsabilidades

| Responsável | Atribuições |
|---|---|
| Equipe FieldOps | Identificar necessidades, comparar alternativas e validar os recursos. |
| Responsável pelo backend | Validar API, banco de dados, segurança e armazenamento. |
| Responsável pelo mobile | Validar aplicativo, armazenamento local e sincronização. |
| Responsável pela interface web | Validar a aplicação Angular e sua integração com a API. |
| Professores orientadores | Avaliar a adequação acadêmica e técnica do planejamento. |
| Fornecedores contratados | Entregar os serviços conforme as condições acordadas. |

## 8. Conclusão

O FieldOps pode ser desenvolvido e validado inicialmente com ferramentas gratuitas e infraestrutura local. A contratação de serviços de nuvem deverá ocorrer somente quando houver necessidade de acesso remoto, testes integrados ou demonstrações que não possam ser atendidas pelo ambiente local.

O planejamento das aquisições contribui para controlar os custos, reduzir riscos e garantir que os recursos necessários estejam disponíveis nas etapas adequadas do projeto.


