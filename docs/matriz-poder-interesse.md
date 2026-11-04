# Matriz de Poder e Interesse das Partes Interessadas — FieldOps

**Projeto:** FieldOps — Plataforma de Inspeção em Campo  
**Instituição:** SENAI  
**Curso:** Análise e Desenvolvimento de Sistemas (ADS)

## 1. Objetivo

Identificar as partes interessadas do FieldOps, avaliar qualitativamente seu poder de influência e seu interesse nos resultados do projeto e definir estratégias de comunicação e engajamento adequadas a cada grupo.

A classificação é uma hipótese de planejamento baseada nos papéis descritos no escopo e nos artefatos do repositório. Deve ser confirmada com a equipe e ajustada caso a governança real do projeto atribua outras responsabilidades.

## 2. Critérios de classificação

- **Poder alto:** capacidade de aprovar ou bloquear decisões, prioridades, requisitos, recursos ou aceite de entregas.
- **Poder baixo:** não possui autoridade formal para aprovar ou bloquear decisões do projeto, embora possa fornecer feedback relevante.
- **Interesse alto:** utiliza, entrega, valida ou depende diretamente dos resultados do FieldOps.
- **Interesse baixo:** é afetado apenas indiretamente ou participa de forma pontual.

Quando um papel tiver autoridade intermediária, sua classificação deverá considerar a decisão específica que pode influenciar. A matriz usa os quadrantes alto/baixo para evitar colocar participantes em um quadrante sem uma regra explícita.

## 3. Registro das partes interessadas

| Código | Parte interessada | Papel no projeto | Poder | Interesse | Quadrante |
|---|---|---|---|---|---|
| PI-01 | Equipe FieldOps | Desenvolver, testar, documentar e entregar a plataforma | Alto | Alto | Gerenciar com atenção |
| PI-02 | Professores orientadores/avaliadores do SENAI | Orientar, avaliar e validar as entregas acadêmicas | Alto | Alto | Gerenciar com atenção |
| PI-03 | Representante da organização demandante / contexto de negócio | Validar necessidades de negócio e fornecer feedback sobre os fluxos de inspeção; confirmar o representante formal com a coordenação | Alto, se tiver autoridade de aceite | Alto | Gerenciar com atenção, se confirmado |
| PI-04 | Técnicos de inspeção | Utilizar o aplicativo móvel para executar inspeções, inclusive em cenários offline | Baixo | Alto | Manter informado |
| PI-05 | Gestores e supervisores operacionais | Acompanhar inspeções, pendências e não conformidades | Alto, se definirem prioridades ou aceitarem resultados | Alto | Gerenciar com atenção, se confirmado |
| PI-06 | Administradores do sistema | Operar usuários, perfis e configurações administrativas | Baixo | Alto | Manter informado |
| PI-07 | Responsáveis por infraestrutura e serviços externos | Apoiar ambiente, disponibilidade, banco de dados e armazenamento de evidências | Baixo | Alto quando responsáveis pela implantação | Manter informado |
| PI-08 | Usuários indiretos e interessados ocasionais | Acompanhar resultados sem participação operacional regular | Baixo | Baixo | Monitorar |
| PI-09 | Patrocinador ou responsável institucional com participação pontual | Aprovar recursos ou decisões de alto impacto, sem acompanhar a rotina diária | Alto, se esse papel existir | Baixo, se a participação for pontual | Manter satisfeito — confirmar se existe |

**Nota:** os papéis PI-03, PI-05 e PI-09 dependem da confirmação das responsabilidades efetivamente atribuídas no projeto. Não se deve presumir que uma organização, gestor ou patrocinador tenha sido formalmente designado sem validação com a equipe.

## 4. Matriz de Poder/Interesse

| Poder | Interesse baixo | Interesse alto |
|---|---|---|
| **Alto** | **Manter satisfeito:** patrocinador ou responsável institucional com autoridade de decisão e participação cotidiana reduzida, se confirmado (PI-09). | **Gerenciar com atenção:** equipe do projeto e avaliadores; representante de negócio e gestores operacionais quando tiverem autoridade real sobre requisitos, prioridades ou aceite (PI-01, PI-02, PI-03 e PI-05). |
| **Baixo** | **Monitorar:** usuários indiretos e interessados ocasionais (PI-08). | **Manter informado:** técnicos de inspeção, administradores e responsáveis operacionais/técnicos sem autoridade formal de decisão (PI-04, PI-06 e PI-07). |

## 5. Estratégias de engajamento por quadrante

### 5.1. Gerenciar com atenção — alto poder e alto interesse

**Partes interessadas:** equipe FieldOps e professores orientadores/avaliadores; representantes de negócio e gestores operacionais somente quando sua autoridade de decisão ou aceite estiver confirmada.

**Estratégia:** comunicação frequente, participação nas decisões relevantes e acompanhamento próximo de entregas, riscos e critérios de aceite.

**Ações:**
- Acompanhar tarefas, impedimentos, riscos e entregas nas ferramentas do projeto.
- Validar requisitos e critérios de aceitação nos marcos definidos.
- Comunicar rapidamente bloqueios, atrasos e mudanças de escopo.
- Registrar decisões, responsáveis e pendências.

### 5.2. Manter satisfeito — alto poder e baixo interesse

**Parte interessada:** patrocinador ou responsável institucional com participação pontual, caso esse papel exista e seja confirmado.

**Estratégia:** apresentar informações concisas sobre progresso, resultados, riscos relevantes e decisões que necessitem de aprovação, evitando detalhes técnicos desnecessários.

**Ações:**
- Compartilhar resumos nos principais marcos.
- Comunicar mudanças de prazo, escopo ou orçamento que exijam decisão.
- Solicitar aprovações com antecedência e registrar as decisões.

Se não houver patrocinador ou responsável com esse perfil, registrar o quadrante como “sem parte interessada confirmada” até que a equipe valide a existência de alguém que se enquadre nele.

### 5.3. Manter informado — baixo poder e alto interesse

**Partes interessadas:** técnicos de inspeção, administradores do sistema e responsáveis técnicos/operacionais que não tenham autoridade formal de aprovação.

**Estratégia:** informar mudanças que afetem o uso ou a operação da plataforma e oferecer canais para dúvidas e feedback.

**Ações:**
- Compartilhar atualizações de funcionalidades e instruções de uso.
- Demonstrar execução de inspeções, captura de evidências e sincronização offline.
- Registrar dificuldades encontradas em testes e demonstrações.
- Comunicar alterações que afetem acesso, operação ou suporte.

### 5.4. Monitorar — baixo poder e baixo interesse

**Partes interessadas:** usuários indiretos e interessados ocasionais.

**Estratégia:** acompanhar o nível de interesse e disponibilizar informações gerais quando necessário, sem comunicação frequente enquanto não houver impacto direto.

**Ações:**
- Disponibilizar informações gerais sobre o projeto.
- Reavaliar a classificação se o grupo passar a utilizar ou depender diretamente da plataforma.
- Atualizar a matriz se houver mudança no poder de influência ou no interesse.

## 6. Plano de comunicação

| Parte interessada | Informação a compartilhar | Canal/método | Frequência sugerida | Responsável |
|---|---|---|---|---|
| Equipe FieldOps | Tarefas, impedimentos, riscos, código e entregas | GitHub, reuniões e comunicação da equipe | Semanal e quando houver bloqueio | Equipe FieldOps |
| Professores orientadores/avaliadores | Progresso acadêmico, entregas e evidências de validação | Reuniões e relatórios | A cada marco ou entrega acadêmica | Equipe FieldOps |
| Representante de negócio, se confirmado | Requisitos, demonstrações e resultados relevantes | Reuniões e demonstrações | Conforme os marcos acordados | Responsável pelo projeto |
| Técnicos de inspeção | Fluxos de uso, alterações e resultados de testes | Demonstrações, testes e documentação | A cada versão relevante | Equipe FieldOps |
| Gestores e supervisores, se confirmados | Pendências, resultados e regras de acompanhamento | Demonstrações e relatórios | A cada entrega relevante | Equipe FieldOps |
| Administradores do sistema | Acessos, perfis, configurações e procedimentos | Documentação e reuniões técnicas | Quando houver mudança | Equipe FieldOps |
| Responsáveis por infraestrutura | Disponibilidade, integração e problemas técnicos | Issues e documentação técnica | Conforme necessidade | Responsáveis técnicos |
| Interessados indiretos | Informações gerais e resultados | Apresentação ou relatório | Nos principais marcos | Equipe FieldOps |
| Patrocinador, se confirmado | Resumo executivo, riscos e decisões pendentes | Relato de status | Por marco ou quando houver decisão | Responsável pelo projeto |

As frequências são propostas iniciais e não representam um calendário formal aprovado.

## 7. Monitoramento e revisão

Revisar a matriz ao final de cada sprint ou marco e sempre que houver mudanças relevantes de escopo, responsabilidades, prioridades, riscos ou critérios de aceite.

Na revisão, verificar:
- mudanças no poder de decisão ou na influência;
- alterações no interesse e no nível de participação;
- dúvidas, conflitos ou resistência identificados;
- adequação dos canais e da frequência de comunicação;
- feedback obtido em testes, demonstrações e validações.

Atualizar o quadrante e a estratégia de comunicação quando o perfil de uma parte interessada mudar.

## 8. Conclusão

A matriz organiza o engajamento das partes interessadas do FieldOps conforme seu poder e interesse. A equipe e os avaliadores devem permanecer envolvidos nas decisões e nas entregas. Usuários com alto interesse e pouca autoridade devem receber informações adequadas, enquanto interessados indiretos podem ser monitorados. Papéis como representante formal de negócio, gestor com poder de aceite e patrocinador devem ser confirmados com a coordenação antes de serem tratados como partes interessadas formalmente designadas.
