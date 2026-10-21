# Atividade 2 — Matriz de Poder e Interesse das Partes Interessadas

**Projeto:** FieldOps — Plataforma de Inspeção em Campo  
**Instituição:** SENAI  
**Curso:** Análise e Desenvolvimento de Sistemas (ADS)

## 1. Objetivo

A Matriz de Poder e Interesse tem como objetivo identificar e classificar as partes interessadas do projeto FieldOps de acordo com seu nível de poder de influência e interesse nos resultados do projeto. Essa classificação permite definir estratégias de comunicação e acompanhamento adequadas para cada grupo, contribuindo para o alinhamento das expectativas e para o sucesso do projeto.

A matriz utiliza quatro categorias: **Monitorar**, **Manter Informado**, **Manter Satisfeito** e **Gerenciar com Atenção**.

## 2. Identificação das partes interessadas

| Código | Parte interessada | Papel no projeto | Poder | Interesse |
|---|---|---|---|---|
| PI-01 | Equipe FieldOps | Desenvolver, testar, documentar e entregar a plataforma | Alto | Alto |
| PI-02 | Professores do SENAI | Orientar, avaliar e validar as entregas acadêmicas | Alto | Alto |
| PI-03 | Toyota do Brasil | Representar o contexto de negócio e fornecer requisitos e feedbacks relacionados ao pós-venda e às inspeções | Alto | Alto |
| PI-04 | Técnicos de inspeção | Utilizar o aplicativo móvel para executar inspeções em campo, inclusive offline | Médio | Alto |
| PI-05 | Gestores e supervisores | Acompanhar inspeções, indicadores, pendências e não conformidades | Alto | Alto |
| PI-06 | Administradores do sistema | Gerenciar acessos, usuários e configurações da plataforma | Médio | Alto |
| PI-07 | Equipe de infraestrutura e serviços em nuvem | Apoiar a disponibilidade da API, do banco de dados e do armazenamento de evidências | Médio | Médio |
| PI-08 | Demais usuários e interessados indiretos | Consultar informações ou acompanhar os resultados gerais do projeto | Baixo | Baixo |

*Observação: os níveis apresentados são estimativas para fins de planejamento acadêmico e devem ser revistos conforme os papéis e as responsabilidades efetivamente definidos no projeto.*

## 3. Matriz de poder e interesse

A classificação é organizada em quatro quadrantes, considerando o poder de influência de cada parte interessada e seu interesse no projeto.

| | **Interesse baixo** | **Interesse alto** |
|---|---|---|
| **Poder alto** | **Manter Satisfeito** — interessados com grande influência, mas menor envolvimento cotidiano. | **Gerenciar com Atenção** — interessados com grande influência e alto interesse. |
| **Poder baixo** | **Monitorar** — interessados com pouca influência e baixo interesse. | **Manter Informado** — interessados com interesse elevado, mas menor poder de decisão. |

### 3.1. Gerenciar com Atenção — alto poder e alto interesse

**Partes interessadas:** PI-01 — Equipe FieldOps; PI-02 — Professores do SENAI; PI-03 — Toyota do Brasil; PI-05 — Gestores e supervisores.

**Estratégia:** manter comunicação frequente, envolver essas partes nas decisões relevantes, acompanhar entregas e riscos e solicitar validação nos marcos importantes do projeto.

**Ações previstas:**
- Realizar reuniões periódicas de acompanhamento.
- Apresentar o andamento das sprints e das entregas.
- Validar requisitos, funcionalidades e critérios de aceitação.
- Comunicar riscos, atrasos e mudanças de escopo.
- Registrar decisões e responsabilidades.

### 3.2. Manter Satisfeito — alto poder e baixo interesse

**Partes interessadas:** não há um grupo específico confirmado nessa categoria na classificação inicial. Caso sejam identificados patrocinadores, responsáveis institucionais ou outros agentes com poder elevado e participação operacional reduzida, eles deverão ser incluídos neste quadrante.

**Estratégia:** fornecer informações objetivas sobre o progresso, os principais resultados, os riscos e as decisões que exigem atenção, sem sobrecarregar os interessados com detalhes técnicos desnecessários.

**Ações previstas:**
- Enviar resumos de andamento nos marcos do projeto.
- Comunicar mudanças relevantes de escopo ou prazo.
- Apresentar problemas que exijam decisão ou aprovação.
- Manter disponíveis os registros de entregas e resultados.

### 3.3. Manter Informado — baixo poder e alto interesse

**Partes interessadas:** PI-04 — Técnicos de inspeção; PI-06 — Administradores do sistema; PI-07 — Equipe de infraestrutura e serviços em nuvem.

**Estratégia:** manter esses grupos atualizados sobre o desenvolvimento e as mudanças que afetem suas atividades, oferecendo oportunidades para feedback e esclarecimento de dúvidas.

**Ações previstas:**
- Compartilhar atualizações das funcionalidades.
- Demonstrar os fluxos de execução e sincronização das inspeções.
- Registrar sugestões e dificuldades identificadas nos testes.
- Informar sobre alterações que impactem a utilização ou a operação do sistema.
- Disponibilizar orientações e documentação técnica pertinentes.

### 3.4. Monitorar — baixo poder e baixo interesse

**Partes interessadas:** PI-08 — Demais usuários e interessados indiretos.

**Estratégia:** acompanhar o interesse desse grupo e fornecer informações quando necessário, sem exigir comunicação frequente enquanto não houver impacto direto no projeto.

**Ações previstas:**
- Disponibilizar informações gerais sobre o projeto.
- Avaliar mudanças no interesse ou na influência desses participantes.
- Atualizar a classificação caso passem a utilizar ou depender diretamente da plataforma.

## 4. Plano de comunicação das partes interessadas

| Parte interessada | Informação a compartilhar | Canal ou método | Frequência sugerida | Responsável |
|---|---|---|---|---|
| Equipe FieldOps | Tarefas, impedimentos, riscos, código e entregas | Reuniões, GitHub e mensagens da equipe | Semanal e conforme necessidade | Equipe FieldOps |
| Professores do SENAI | Progresso acadêmico, entregas e validações | Reuniões e relatórios | A cada marco ou entrega acadêmica | Equipe FieldOps |
| Toyota do Brasil | Requisitos, demonstrações e resultados relevantes | Reuniões e relatórios de acompanhamento | Conforme disponibilidade e marcos definidos | Equipe FieldOps |
| Técnicos de inspeção | Fluxos de uso, alterações e resultados dos testes | Demonstrações, testes e documentação | A cada versão relevante | Equipe FieldOps |
| Gestores e supervisores | Indicadores, pendências e não conformidades | Demonstrações e relatórios | A cada entrega relevante | Equipe FieldOps |
| Administradores do sistema | Acessos, configurações e procedimentos operacionais | Documentação e reuniões técnicas | Conforme mudanças e necessidade | Equipe FieldOps |
| Equipe de infraestrutura | Disponibilidade, integrações e problemas técnicos | Issues, documentação e comunicação técnica | Conforme necessidade e implantação | Equipe FieldOps |
| Interessados indiretos | Informações gerais e resultados | Relatórios ou apresentação do projeto | Nos principais marcos | Equipe FieldOps |

## 5. Monitoramento e atualização da matriz

A matriz deverá ser revisada durante o desenvolvimento do FieldOps, principalmente ao final de cada sprint e quando houver mudanças significativas nos requisitos, nas responsabilidades ou nas expectativas das partes interessadas.

O monitoramento deverá considerar:

- Alterações no poder de decisão ou na influência de cada interessado.
- Mudanças no nível de interesse e participação.
- Dúvidas, conflitos ou resistências identificados durante o projeto.
- Necessidade de ajustar os canais e a frequência de comunicação.
- Feedback recebido durante demonstrações, testes e validações.

Quando uma parte interessada mudar de perfil, sua classificação deverá ser atualizada e a estratégia de comunicação correspondente deverá ser ajustada.

## 6. Conclusão

A Matriz de Poder e Interesse permite organizar a gestão das partes interessadas do FieldOps de maneira estruturada, direcionando os esforços de comunicação conforme a influência e o interesse de cada grupo. A equipe do projeto, os professores do SENAI, a Toyota do Brasil e os gestores e supervisores devem receber acompanhamento próximo, enquanto os demais grupos devem ser informados, satisfeitos ou monitorados conforme sua classificação.

A revisão periódica da matriz contribui para identificar mudanças nas expectativas, reduzir falhas de comunicação e manter as partes interessadas alinhadas aos objetivos, às entregas e aos resultados esperados do projeto.

