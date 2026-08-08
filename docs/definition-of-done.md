# 18. Definição de Pronto (Definition of Done)

## 18.1 Objetivo

A **Definition of Done (DoD)** estabelece os critérios mínimos que devem ser atendidos para considerar uma funcionalidade, sprint ou o MVP como concluídos.

Seu objetivo é garantir qualidade, integração entre as aplicações e previsibilidade das entregas.

---

# 18.2 Definition of Done para Histórias de Usuário

Uma história somente poderá ser marcada como **Concluída** quando atender aos critérios abaixo.

### Requisitos

* critérios de aceitação definidos;
* regras de negócio verificadas;
* dependências resolvidas ou explicitamente aceitas;
* cenários de erro documentados.

### Implementação

* código enviado ao repositório correto;
* desenvolvimento realizado em branch apropriada;
* Pull Request (ou processo equivalente) criado;
* revisão de código concluída;
* lint sem erros;
* verificação de tipos aprovada;
* ausência de segredos ou credenciais versionadas;
* ausência de logs contendo informações sensíveis;
* inexistência de erros ou avisos ignorados sem justificativa.

### Testes

* critérios de aceitação validados;
* principais fluxos testados;
* pelo menos um cenário de exceção verificado;
* testes automatizados adicionados quando aplicável;
* ausência de regressões conhecidas.

### Interface

* tratamento dos estados de carregamento;
* tratamento dos estados vazios;
* tratamento de erros;
* prevenção de envio duplicado durante processamento;
* mensagens compreensíveis ao usuário;
* respeito às permissões do perfil;
* verificação básica de acessibilidade.

### Integração

* contrato da API implementado ou atualizado;
* DTOs consistentes entre cliente e servidor;
* tratamento dos erros previstos;
* autorização validada na API;
* testes realizados no ambiente de integração quando aplicável.

### Documentação

* README atualizado quando necessário;
* documentação técnica revisada;
* especificação OpenAPI atualizada;
* evidências de funcionamento registradas;
* limitações conhecidas documentadas.

---

# 18.3 Definition of Done do Aplicativo Mobile

Além dos critérios gerais, funcionalidades do aplicativo deverão atender aos seguintes requisitos:

* execução validada em dispositivo físico ou emulador Android;
* comportamento validado com e sem conectividade;
* persistência dos dados locais após reinicialização do aplicativo;
* tratamento adequado para permissões negadas;
* armazenamento seguro de dados sensíveis;
* proteção das rotas autenticadas;
* preservação das operações pendentes;
* exibição correta do estado de sincronização quando aplicável.

---

# 18.4 Definition of Done da Interface Administrativa

Além dos critérios gerais, a interface administrativa deverá garantir:

* proteção das rotas conforme o perfil do usuário;
* paginação para listas extensas;
* filtros compatíveis com os parâmetros disponibilizados pela API;
* validação de formulários tanto no cliente quanto no servidor;
* confirmação antes da execução de operações críticas;
* tratamento adequado para erros HTTP 401, 403, 404, 409 e 422;
* funcionamento validado em resolução padrão para notebook e desktop.

---

# 18.5 Definition of Done da API

Além dos critérios gerais, cada endpoint deverá possuir:

* documentação OpenAPI atualizada;
* DTOs independentes das entidades de persistência;
* validação de entrada implementada;
* autenticação e autorização aplicadas;
* regras de negócio testadas;
* tratamento padronizado de erros;
* migrações de banco versionadas quando necessárias;
* restrições críticas protegidas também no banco de dados;
* testes de idempotência para operações de sincronização;
* logs sem exposição de informações sensíveis.

---

# 18.6 Definition of Done da Sprint

Uma sprint somente será considerada concluída quando:

* todo o incremento planejado estiver integrado;
* Mobile, API e Interface Administrativa utilizarem o mesmo contrato de integração;
* a demonstração puder ser executada utilizando dados de teste;
* não existirem defeitos bloqueadores no fluxo principal;
* histórias não concluídas retornarem ao backlog;
* backlog e status das histórias estiverem atualizados;
* Pull Requests relevantes tiverem sido revisados;
* riscos e débitos técnicos estiverem registrados;
* ocorrer revisão da sprint;
* ao menos uma ação de melhoria para a próxima sprint tiver sido registrada.

---

# 18.7 Definition of Done do MVP

O MVP será considerado concluído quando atender simultaneamente aos seguintes requisitos.

## Fluxo funcional

* execução completa do fluxo ponta a ponta definido em **AC-RELEASE**;
* autenticação e autorização operacionais;
* criação e utilização de modelos de inspeção;
* checklist dinâmico funcionando;
* captura de fotografias;
* leitura de QR Code;
* registro de localização;
* execução offline após download da inspeção;
* sincronização sem duplicidade de registros;
* revisão administrativa;
* aprovação e reprovação de inspeções.

## Infraestrutura

* build Android instalável;
* interface administrativa executável ou publicada;
* API executável conforme documentação;
* banco de dados criado por migrações;
* usuários e dados de demonstração disponíveis.

## Documentação

* documentação principal atualizada;
* OpenAPI publicada;
* instruções de execução completas.

## Qualidade

* ausência de defeitos críticos conhecidos sem plano de mitigação.

---

# 18.8 Classificação de Severidade de Defeitos

| Severidade  | Definição                                                                                                     | Critério de Liberação                                  |
| ----------- | ------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------ |
| **Crítica** | Perda de dados, falha de segurança, indisponibilidade do fluxo principal ou duplicidade grave de informações. | Bloqueia a entrega.                                    |
| **Alta**    | Funcionalidade P0 indisponível sem alternativa aceitável.                                                     | Deve ser corrigida antes da release.                   |
| **Média**   | Problema com solução alternativa conhecida e sem perda de dados.                                              | Pode ser aceito mediante registro e plano de correção. |
| **Baixa**   | Problemas visuais, melhorias de usabilidade ou ajustes não essenciais.                                        | Pode permanecer no backlog para versões futuras.       |

---

## 18.9 Considerações Finais

A **Definition of Done** deverá ser utilizada como referência única para validação das entregas do projeto **FieldOps**. Nenhuma funcionalidade deverá ser considerada concluída apenas pela implementação do código; todos os critérios de qualidade, testes, integração, documentação e segurança definidos neste capítulo deverão ser atendidos antes da aceitação da entrega.
