# Análise da Qualidade — Projeto FieldOps

## 1. Objetivo

A análise da qualidade do Projeto FieldOps tem como objetivo avaliar os principais aspectos de qualidade da plataforma e identificar possíveis problemas durante o desenvolvimento.

O FieldOps é uma plataforma **offline-first** para planejamento, execução, acompanhamento e revisão de inspeções técnicas em campo.

A análise considera os seguintes aspectos:

* Funcionamento offline;
* Sincronização dos dados;
* Integridade das informações;
* Autenticação e controle de acesso;
* Execução dos checklists;
* Captura de fotografias;
* Registro de localização;
* Identificação por QR Code;
* Registro de não conformidades;
* Desempenho da API;
* Usabilidade;
* Integração entre Mobile, Web e Backend.

A análise utiliza as **Sete Ferramentas de Qualidade Básicas**:

1. Diagrama de Causa e Efeito;
2. Fluxograma;
3. Folha de Verificação;
4. Diagrama de Pareto;
5. Histograma;
6. Gráfico de Controle;
7. Diagrama de Dispersão.

> **Observação:** Como o projeto está em desenvolvimento, os dados quantitativos utilizados nesta análise são considerados dados simulados para fins acadêmicos. Eles não representam dados reais de operação em produção.

---

# 2. Planejamento da Qualidade

O gerenciamento da qualidade tem como objetivo identificar os requisitos e padrões de qualidade das entregas e definir como será verificada a conformidade do projeto.

No FieldOps, a qualidade será acompanhada durante todo o desenvolvimento, desde o levantamento dos requisitos até os testes, validação e entrega final.

Os principais critérios de qualidade definidos para o projeto são:

| Critério              | Objetivo                                           | Forma de verificação                                 |
| --------------------- | -------------------------------------------------- | ---------------------------------------------------- |
| Funcionamento offline | Permitir a execução de inspeções sem internet      | Teste de inspeção sem conexão                        |
| Sincronização         | Enviar corretamente os dados após a reconexão      | Teste offline → online                               |
| Integridade dos dados | Evitar perda ou duplicidade de informações         | Comparação dos dados antes e depois da sincronização |
| Autenticação          | Garantir acesso somente a usuários autorizados     | Testes de login e autorização                        |
| Checklist             | Permitir a execução correta dos itens de inspeção  | Testes funcionais                                    |
| Fotografias           | Registrar evidências vinculadas à inspeção         | Teste de captura e armazenamento                     |
| Localização           | Registrar a localização da inspeção                | Teste de obtenção das coordenadas                    |
| QR Code               | Identificar equipamentos corretamente              | Teste de leitura                                     |
| Não conformidades     | Registrar problemas encontrados durante a inspeção | Teste funcional                                      |
| API                   | Processar corretamente as requisições              | Testes de API                                        |
| Usabilidade           | Permitir utilização adequada pelos técnicos        | Testes de usabilidade                                |
| Desempenho            | Manter tempo de resposta adequado                  | Medição das requisições                              |
| Segurança             | Proteger dados e funcionalidades                   | Testes de autenticação e autorização                 |

---

# 3. Sete Ferramentas de Qualidade

## 3.1 Diagrama de Causa e Efeito

### Problema analisado

**Falhas ou inconsistências durante a sincronização das inspeções realizadas offline.**

A sincronização é um dos principais pontos críticos do FieldOps, pois o aplicativo deve permitir que o técnico realize uma inspeção sem conexão e posteriormente envie os dados para o servidor.

### Diagrama

```text
                         FALHA NA SINCRONIZAÇÃO
                                  │
          ┌───────────────────────┼────────────────────────┐
          │                       │                        │
       MÉTODO                   DADOS                   SISTEMA
          │                       │                        │
          ├─ Falha no             ├─ Dados duplicados      ├─ Erro na API
          │  processo             │                        │
          ├─ Falta de             ├─ Dados incompletos     ├─ Erro no backend
          │  validação            │                        │
          └─ Conflito de          └─ Dados inconsistentes  └─ Falha no banco
             registros
                                  │
          ┌───────────────────────┼────────────────────────┐
          │                       │                        │
       CONEXÃO                 USUÁRIO                 DISPOSITIVO
          │                       │                        │
          ├─ Internet             ├─ Operação             ├─ Armazenamento
          │  instável             │  incorreta             │  insuficiente
          │                       │                        │
          ├─ Perda de             └─ Encerramento         ├─ Falha no
          │  conexão                 durante envio         │  dispositivo
          │                                                │
          └─ Baixa qualidade                                └─ Falha no
             da rede                                           aplicativo
```

### Análise

As principais causas identificadas estão relacionadas ao processo de sincronização, aos dados armazenados localmente, à API, à conexão com a internet e ao dispositivo utilizado pelo técnico.

Como o FieldOps possui funcionamento **offline-first**, qualquer problema durante a sincronização pode resultar em perda, duplicidade ou inconsistência dos dados registrados durante a inspeção.

### Conclusão

Para reduzir a possibilidade de falhas e garantir a integridade das informações, a equipe deverá realizar testes específicos do processo de sincronização, contemplando diferentes situações de uso, como:

* Criação de uma inspeção enquanto o dispositivo está offline;
* Alteração dos dados de uma inspeção durante o período offline;
* Reconexão do dispositivo à internet;
* Sincronização dos dados armazenados localmente com a API;
* Tentativa de sincronização de um mesmo registro mais de uma vez;
* Interrupção da conexão durante o processo de envio;
* Verificação da correta persistência dos dados no servidor;
* Verificação da integridade das fotografias e demais evidências;
* Verificação do comportamento do aplicativo após uma falha de sincronização;
* Confirmação de que não ocorreram registros duplicados após a sincronização;
* Confirmação de que nenhuma informação preenchida durante o modo offline foi perdida.

---

## 3.2 Fluxograma

### Processo de execução de uma inspeção

O fluxograma representa o processo de execução de uma inspeção no FieldOps, desde o acesso do técnico ao sistema até a conclusão e sincronização dos dados. O fluxo considera tanto o funcionamento **online** quanto o funcionamento **offline-first** da aplicação.

### Fluxograma

```text
                         ┌───────────────┐
                         │     INÍCIO    │
                         └───────┬───────┘
                                 │
                                 ▼
                    ┌────────────────────────┐
                    │ Realizar login no      │
                    │ aplicativo             │
                    └───────────┬────────────┘
                                │
                                ▼
                    ┌────────────────────────┐
                    │ Selecionar a inspeção  │
                    │ que será realizada      │
                    └───────────┬────────────┘
                                │
                                ▼
                    ┌────────────────────────┐
                    │ O dispositivo possui    │
                    │ conexão com a internet? │
                    └───────────┬────────────┘
                                │
                     ┌──────────┴──────────┐
                     │                     │
                    SIM                   NÃO
                     │                     │
                     ▼                     ▼
          ┌──────────────────┐   ┌──────────────────┐
          │ Carregar dados   │   │ Carregar dados   │
          │ da API           │   │ armazenados      │
          └────────┬─────────┘   │ localmente       │
                   │             └────────┬─────────┘
                   │                      │
                   └──────────┬───────────┘
                              │
                              ▼
                    ┌────────────────────────┐
                    │ Executar o checklist   │
                    │ da inspeção             │
                    └───────────┬────────────┘
                                │
                                ▼
                    ┌────────────────────────┐
                    │ Registrar as respostas  │
                    │ dos itens               │
                    └───────────┬────────────┘
                                │
                                ▼
                    ┌────────────────────────┐
                    │ Registrar evidências:   │
                    │ fotos e localização     │
                    └───────────┬────────────┘
                                │
                                ▼
                    ┌────────────────────────┐
                    │ Finalizar a inspeção   │
                    └───────────┬────────────┘
                                │
                                ▼
                    ┌────────────────────────┐
                    │ O dispositivo possui    │
                    │ conexão com a internet? │
                    └───────────┬────────────┘
                                │
                     ┌──────────┴──────────┐
                     │                     │
                    SIM                   NÃO
                     │                     │
                     ▼                     ▼
          ┌──────────────────┐   ┌──────────────────┐
          │ Sincronizar os   │   │ Armazenar os     │
          │ dados com a API  │   │ dados localmente │
          └────────┬─────────┘   └────────┬─────────┘
                   │                      │
                   │                      ▼
                   │             ┌──────────────────┐
                   │             │ Aguardar conexão │
                   │             │ para sincronizar │
                   │             └────────┬─────────┘
                   │                      │
                   │                      ▼
                   │             ┌──────────────────┐
                   │             │ Sincronizar os   │
                   │             │ dados com a API  │
                   │             └────────┬─────────┘
                   │                      │
                   └──────────┬───────────┘
                              │
                              ▼
                    ┌────────────────────────┐
                    │ Verificar a integridade│
                    │ dos dados sincronizados│
                    └───────────┬────────────┘
                                │
                                ▼
                         ┌───────────────┐
                         │      FIM      │
                         └───────────────┘
```

### Análise

O fluxograma representa as principais etapas do processo de execução de uma inspeção no FieldOps. O fluxo inicia com a autenticação do técnico e a seleção da inspeção que será realizada.

Um dos principais pontos de decisão ocorre na verificação da conexão com a internet. Quando existe conexão, os dados podem ser carregados diretamente da API. Quando não existe conexão, o aplicativo utiliza os dados disponíveis localmente, permitindo que o técnico continue a execução da inspeção.

Durante a inspeção, o técnico registra as respostas do checklist e adiciona as evidências necessárias, como fotografias e localização. Após a finalização, os dados são sincronizados imediatamente quando existe conexão. Caso o dispositivo esteja offline, as informações permanecem armazenadas localmente até que uma conexão esteja disponível.

Após a sincronização, é realizada a verificação da integridade dos dados para garantir que as informações da inspeção tenham sido enviadas corretamente.

### Conclusão

O fluxograma demonstra que o funcionamento **offline-first** está integrado ao fluxo principal de execução das inspeções. Dessa forma, a ausência de conexão com a internet não impede a realização da atividade em campo.

Os principais pontos que devem ser considerados no controle da qualidade são:

* Autenticação do usuário;
* Carregamento correto da inspeção;
* Funcionamento do checklist;
* Armazenamento local dos dados;
* Registro das respostas;
* Captura das fotografias;
* Registro da localização;
* Finalização da inspeção;
* Sincronização dos dados;
* Verificação da integridade após a sincronização.

---

## 3.3 Folha de Verificação

A folha de verificação será utilizada para registrar as ocorrências encontradas durante os testes.

### Dados dos testes

| Problema                              | Ocorrências |
| ------------------------------------- | ----------: |
| Falha de sincronização                |           8 |
| Erro na validação de formulário       |           6 |
| Problema de autenticação              |           5 |
| Problema no carregamento de checklist |           4 |
| Erro no armazenamento offline         |           4 |
| Falha na leitura do QR Code           |           3 |
| Problema no envio de fotografia       |           3 |
| Problema de localização               |           2 |
| **Total**                             |      **35** |

### Representação da folha de verificação

```text
Problema                              Ocorrências

Falha de sincronização               ✓ ✓ ✓ ✓ ✓ ✓ ✓ ✓       8
Erro na validação                    ✓ ✓ ✓ ✓ ✓ ✓           6
Problema de autenticação             ✓ ✓ ✓ ✓ ✓             5
Carregamento de checklist            ✓ ✓ ✓ ✓               4
Armazenamento offline                ✓ ✓ ✓ ✓               4
Leitura do QR Code                   ✓ ✓ ✓                 3
Envio de fotografia                  ✓ ✓ ✓                 3
Localização                          ✓ ✓                   2
```

### Análise

A folha de verificação permite registrar e quantificar os problemas encontrados durante os testes.

A maior quantidade de ocorrências está relacionada à sincronização, seguida pelos problemas de validação de formulários e autenticação.

### Conclusão

Os dados registrados nessa ferramenta serão utilizados nas análises seguintes, principalmente no Diagrama de Pareto.

---

## 3.4 Diagrama de Pareto

O Diagrama de Pareto organiza os problemas em ordem decrescente de ocorrência, permitindo identificar quais problemas concentram a maior quantidade de ocorrências.

### Dados

| Problema                              | Ocorrências | Percentual | Percentual acumulado |
| ------------------------------------- | ----------: | ---------: | -------------------: |
| Falha de sincronização                |           8 |      22,9% |                22,9% |
| Erro na validação de formulário       |           6 |      17,1% |                40,0% |
| Problema de autenticação              |           5 |      14,3% |                54,3% |
| Problema no carregamento de checklist |           4 |      11,4% |                65,7% |
| Erro no armazenamento offline         |           4 |      11,4% |                77,1% |
| Falha na leitura do QR Code           |           3 |       8,6% |                85,7% |
| Problema no envio de fotografia       |           3 |       8,6% |                94,3% |
| Problema de localização               |           2 |       5,7% |                 100% |
| **Total**                             |      **35** |   **100%** |                      |

### Representação

```text
Ocorrências

8 │ ████████
7 │ ████████
6 │ ██████
5 │ █████
4 │ ████  ████
3 │ ███   ███   ███
2 │ ███   ███   ███   ██
1 │ ███   ███   ███   ██
  └──────────────────────────────────
     S     V     A     C     O     Q     F     L

S = Sincronização
V = Validação
A = Autenticação
C = Checklist
O = Offline
Q = QR Code
F = Fotografia
L = Localização
```

### Análise

Os cinco primeiros problemas representam aproximadamente **77,1% das ocorrências** registradas.

Isso demonstra que uma parcela significativa dos problemas está concentrada em poucas categorias.

Os principais pontos de atenção são:

1. Falhas de sincronização;
2. Erros na validação de formulários;
3. Problemas de autenticação;
4. Problemas no carregamento de checklists;
5. Erros no armazenamento offline.

### Conclusão

O Diagrama de Pareto permite identificar quais categorias apresentam maior frequência de ocorrência e direcionar os esforços de correção para os problemas que possuem maior quantidade de registros.

No contexto do FieldOps, a sincronização e o armazenamento offline merecem acompanhamento específico, pois estão diretamente relacionados ao funcionamento **offline-first** da plataforma.

---

## 3.5 Histograma

O Histograma será utilizado para analisar a distribuição dos tempos de resposta da API durante os testes.

### Dados

| Faixa de tempo | Quantidade de requisições |
| -------------- | ------------------------: |
| 0–200 ms       |                        18 |
| 201–400 ms     |                        12 |
| 401–600 ms     |                         7 |
| 601–800 ms     |                         2 |
| 801–1000 ms    |                         1 |
| **Total**      |                    **40** |

### Histograma

```text
Quantidade

18 │ ██████████████████
16 │ ██████████████████
14 │ ██████████████████
12 │ ████████████
10 │ ████████████
 8 │ ███████
 6 │ ███████
 4 │ ███████
 2 │ ██    █
 0 └────────────────────────────
      0-200   201-400   401-600
      601-800   801-1000

          Tempo de resposta
```

### Análise

Das 40 requisições analisadas, 30 apresentaram tempo de resposta de até 400 ms.

Isso representa **75% das requisições** analisadas.

A maior concentração dos resultados está nas duas primeiras faixas de tempo.

### Conclusão

Os dados simulados indicam que a maior parte das requisições apresenta tempos de resposta nas menores faixas analisadas.

Entretanto, novos testes deverão ser realizados considerando:

* Diferentes volumes de dados;
* Diferentes condições de rede;
* Maior quantidade de requisições;
* Diferentes dispositivos;
* Situações de conexão instável.

---

## 3.6 Gráfico de Controle

O Gráfico de Controle será utilizado para acompanhar o comportamento do tempo médio de resposta da API ao longo dos testes.

### Dados

| Teste | Tempo médio |
| ----: | ----------: |
|     1 |      210 ms |
|     2 |      225 ms |
|     3 |      218 ms |
|     4 |      240 ms |
|     5 |      235 ms |
|     6 |      250 ms |
|     7 |      245 ms |
|     8 |      260 ms |
|     9 |      255 ms |
|    10 |      270 ms |

### Representação

```text
Tempo (ms)

280 │
270 │                         ●
260 │                    ●
250 │               ●  ●
240 │          ●
230 │     ●       ●
220 │
210 │ ●
200 │
    └────────────────────────────
      1  2  3  4  5  6  7  8  9 10

              Testes
```

### Análise

O menor tempo médio registrado foi de **210 ms** e o maior foi de **270 ms**.

Os resultados apresentam variações ao longo dos testes, sendo possível observar uma tendência de aumento dos tempos médios nas últimas medições.

### Conclusão

O tempo de resposta deverá continuar sendo monitorado durante o desenvolvimento.

Caso sejam observados aumentos significativos, a equipe deverá investigar possíveis causas relacionadas ao:

* Backend;
* Banco de dados;
* API;
* Volume de dados;
* Infraestrutura;
* Comunicação entre os componentes.

---

## 3.7 Diagrama de Dispersão

O Diagrama de Dispersão será utilizado para verificar a relação entre a quantidade de dados processados e o tempo de resposta da API.

### Dados

| Dados processados | Tempo de resposta |
| ----------------: | ----------------: |
|                10 |            180 ms |
|                20 |            195 ms |
|                30 |            215 ms |
|                40 |            230 ms |
|                50 |            250 ms |
|                60 |            270 ms |
|                70 |            295 ms |
|                80 |            320 ms |
|                90 |            345 ms |
|               100 |            370 ms |

### Representação

```text
Tempo (ms)

400 │
380 │                              ●
360 │                         ●
340 │                    ●
320 │               ●
300 │          ●
280 │          ●
260 │     ●
240 │     ●
220 │     ●
200 │  ●
180 │●
    └────────────────────────────────
     10 20 30 40 50 60 70 80 90 100

             Dados processados
```

### Análise

Os dados apresentam uma tendência de aumento do tempo de resposta conforme aumenta a quantidade de dados processados.

Nos testes apresentados, o tempo de resposta aumentou de **180 ms**, com 10 unidades de dados, para **370 ms**, com 100 unidades.

### Conclusão

Os resultados indicam uma possível relação entre o volume de dados processados e o tempo de resposta da API.

A equipe deverá realizar novos testes com volumes maiores de dados para verificar se esse comportamento permanece.

Caso seja identificada uma degradação significativa do desempenho, poderão ser realizadas otimizações no:

* Backend;
* Banco de dados;
* Consultas;
* API;
* Processo de sincronização;
* Armazenamento de dados.

---

# 4. Análise Comparativa das Sete Ferramentas

| Ferramenta                 | Aplicação no FieldOps                         | Resultado obtido                                                                                 |
| -------------------------- | --------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| Diagrama de Causa e Efeito | Análise das causas de falhas na sincronização | Foram identificadas causas relacionadas a método, dados, sistema, conexão, usuário e dispositivo |
| Fluxograma                 | Representação do processo de inspeção         | Foram identificados pontos críticos no fluxo offline e na sincronização                          |
| Folha de Verificação       | Registro de problemas durante os testes       | Foram registradas 35 ocorrências                                                                 |
| Diagrama de Pareto         | Priorização dos problemas                     | Os cinco principais problemas representam 77,1% das ocorrências                                  |
| Histograma                 | Análise dos tempos de resposta                | 75% das requisições apresentaram até 400 ms                                                      |
| Gráfico de Controle        | Acompanhamento do desempenho                  | Os tempos variaram entre 210 ms e 270 ms                                                         |
| Diagrama de Dispersão      | Relação entre volume de dados e desempenho    | Foi observada tendência de aumento do tempo de resposta com o aumento do volume                  |

---

# 5. Indicadores de Qualidade

Os seguintes indicadores serão utilizados para acompanhar a qualidade do FieldOps durante o desenvolvimento:

| Indicador                               | Objetivo                                   | Forma de acompanhamento |
| --------------------------------------- | ------------------------------------------ | ----------------------- |
| Taxa de sucesso da sincronização        | Avaliar a confiabilidade da sincronização  | Testes de sincronização |
| Quantidade de erros encontrados         | Identificar problemas recorrentes          | Folha de verificação    |
| Quantidade de falhas por funcionalidade | Identificar áreas críticas                 | Registro de testes      |
| Tempo de resposta da API                | Avaliar desempenho                         | Testes de desempenho    |
| Taxa de inspeções concluídas            | Avaliar o funcionamento do fluxo principal | Testes funcionais       |
| Taxa de registros duplicados            | Avaliar integridade da sincronização       | Comparação dos dados    |
| Taxa de sucesso dos testes              | Avaliar estabilidade das funcionalidades   | Relatórios de testes    |
| Quantidade de não conformidades         | Acompanhar problemas encontrados           | Registro de inspeções   |
| Erros de autenticação                   | Avaliar problemas relacionados ao acesso   | Testes de autenticação  |
| Falhas no funcionamento offline         | Avaliar o principal diferencial do sistema | Testes sem conexão      |

---

# 6. Garantia da Qualidade

A garantia da qualidade será realizada por meio do acompanhamento dos processos utilizados no desenvolvimento e da verificação da aplicação dos padrões definidos.

As principais atividades serão:

* Revisão dos requisitos;
* Revisão da arquitetura;
* Revisão do código;
* Acompanhamento dos testes;
* Análise dos resultados;
* Revisão das entregas;
* Acompanhamento dos indicadores;
* Validação com os stakeholders;
* Registro das não conformidades;
* Acompanhamento das correções.

A garantia da qualidade busca prevenir problemas e verificar se os processos utilizados estão de acordo com os padrões definidos para o projeto.

---

# 7. Controle da Qualidade

O controle da qualidade será realizado por meio do monitoramento e registro dos resultados obtidos durante a execução das atividades de desenvolvimento e testes.

Serão realizados:

* Testes funcionais;
* Testes de integração;
* Testes da API;
* Testes de autenticação;
* Testes offline;
* Testes de sincronização;
* Testes de QR Code;
* Testes de captura de fotografias;
* Testes de localização;
* Testes de banco de dados;
* Testes de usabilidade;
* Testes de desempenho.

Os problemas encontrados serão registrados e classificados.

Após a correção, os testes deverão ser executados novamente para verificar se o problema foi solucionado.

---

# 8. Responsabilidades pela Qualidade

| Atividade                      | Equipe FieldOps | Toyota | Professores SENAI |
| ------------------------------ | --------------- | ------ | ----------------- |
| Definir critérios de qualidade | R               | C/A    | C/A               |
| Elaborar plano de qualidade    | R               | C      | A/C               |
| Executar testes                | R               | I      | C                 |
| Registrar não conformidades    | R               | I      | C                 |
| Analisar resultados            | R               | C      | C/A               |
| Corrigir problemas             | R               | I      | C                 |
| Validar entregas               | R               | A/C    | A/C               |
| Acompanhar indicadores         | R               | I/C    | C                 |
| Homologar sistema              | R               | A      | C                 |
| Documentar resultados          | R               | I      | A/C               |

### Legenda

* **R — Responsible:** responsável pela execução da atividade.
* **A — Accountable:** responsável pela aprovação ou validação.
* **C — Consulted:** consultado durante a atividade.
* **I — Informed:** informado sobre o andamento ou resultado.

---

# 9. Processo de Melhoria Contínua

A qualidade do FieldOps será acompanhada durante todo o ciclo de desenvolvimento.

O processo seguirá as seguintes etapas:

```text
                 ┌──────────────┐
                 │  IDENTIFICAR │
                 └──────┬───────┘
                        │
                        ▼
                 ┌──────────────┐
                 │    MEDIR     │
                 └──────┬───────┘
                        │
                        ▼
                 ┌──────────────┐
                 │   ANALISAR   │
                 └──────┬───────┘
                        │
                        ▼
                 ┌──────────────┐
                 │   CORRIGIR   │
                 └──────┬───────┘
                        │
                        ▼
                 ┌──────────────┐
                 │    TESTAR    │
                 └──────┬───────┘
                        │
                        ▼
                 ┌──────────────┐
                 │   VALIDAR    │
                 └──────┬───────┘
                        │
                        ▼
                 ┌──────────────┐
                 │   MELHORAR   │
                 └──────┬───────┘
                        │
                        └──────────────► NOVA ANÁLISE
```

A identificação de problemas deverá gerar registros que possam ser analisados pela equipe.

Após a identificação da causa, serão definidas ações corretivas. Depois da implementação das correções, os testes serão executados novamente para verificar a efetividade das ações.

---

# 10. Conclusão

A aplicação das **Sete Ferramentas de Qualidade** permitiu analisar diferentes aspectos do Projeto FieldOps e identificar pontos que devem ser acompanhados durante o desenvolvimento.

O **Diagrama de Causa e Efeito** possibilitou identificar possíveis causas relacionadas às falhas de sincronização.

O **Fluxograma** permitiu representar o processo de execução e sincronização de uma inspeção, destacando os principais pontos de controle.

A **Folha de Verificação** possibilitou registrar e quantificar os problemas encontrados durante os testes.

O **Diagrama de Pareto** permitiu identificar os problemas mais frequentes e direcionar os esforços de correção.

O **Histograma** permitiu analisar a distribuição dos tempos de resposta da API.

O **Gráfico de Controle** permitiu acompanhar a variação do desempenho da API durante os testes.

Por fim, o **Diagrama de Dispersão** permitiu analisar a relação entre o volume de dados processados e o tempo de resposta.

No contexto do FieldOps, os principais pontos de atenção identificados são:

* Funcionamento offline;
* Sincronização;
* Integridade dos dados;
* Autenticação;
* Execução dos checklists;
* Armazenamento das evidências;
* Desempenho da API;
* Integração entre Mobile, Web e Backend.

A utilização contínua dessas ferramentas durante o desenvolvimento permitirá identificar problemas, acompanhar os resultados dos testes e realizar melhorias nas entregas do projeto.

---


