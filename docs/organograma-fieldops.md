# Organograma do Projeto FieldOps

## 1. Professores Orientadores
* **Prof. Me. Deivison Shindi Takatu**
* **Prof. Dr. Glauco Todesco**

## 2. Estrutura da Equipa (Mermaid)

A estrutura hierárquica abaixo define as posições e as relações da equipa de desenvolvimento do projeto FieldOps, sob a supervisão dos professores orientadores.

```mermaid
graph TD
    %% Orientadores (Nível Superior)
    O1[Professor / Orientador<br>Prof. Me. Deivison Shindi Takatu]
    O2[Professor / Orientador<br>Prof. Dr. Glauco Todesco]
    
    O1 --> GP
    O2 --> GP

    %% Gestão e Liderança
    GP[Gerente de Projetos<br>André Lucas Ferreira] --> LT[Líder Técnico / Arquiteto<br>Caique Leandro Tessaroto]

    %% Divisão de Equipas
    LT --> BE[Equipa Backend<br>API Java & Base de Dados]
    LT --> FE[Equipa Frontend<br>App Mobile & Web Admin]
    LT --> QA[Qualidade e Testes<br>QA & Validação]

    %% Membros Backend
    BE --> D1[Desenvolvedor Backend<br>Lucas Ianovski]
    BE --> D2[Desenvolvedor Backend<br>Cauã Rodrigues Mesquita]

    %% Membros Frontend
    FE --> D3[Desenvolvedor Mobile<br>João Pedro Américo Matias]
    FE --> D4[Desenvolvedor Mobile<br>João Victor Machado]
    FE --> D5[Desenvolvedor Web<br>Leonardo Rodrigues Vieira]

    %% Membros QA
    QA --> D6[Analista de QA<br>Nickolas Machado]