<div align="center">

# Caso 2 - Template incompatível com o equipamento

*Exemplo preenchido | Versão enxuta*

</div>

| **Grupo** | Grupo 1 | **Data** | ____/____/______ |
|---|---|---|---|
| **Integrantes** | André, Caique, Cauã e Matias | **Caso** | Template incompatível com o equipamento |

**Cenário:** Um inspetor escaneia o QR Code de um elevador, mas a inspeção carrega um template criado para extintores, com itens que não correspondem ao equipamento identificado.

## 1. Decisão inicial

☐ Permitir&nbsp;&nbsp;&nbsp;☒ Bloquear&nbsp;&nbsp;&nbsp;☐ Solicitar confirmação&nbsp;&nbsp;&nbsp;☐ Permitir com condições&nbsp;&nbsp;&nbsp;☐ Regra ainda não definida

**Decisão em uma frase:** O início da inspeção deve ser bloqueado sempre que a categoria do modelo vinculado divergir da categoria do equipamento identificado em campo.

## 2. Regra de negócio

**Regra identificada ou proposta:** Todo modelo possui categoria obrigatória (RN-015), e ela precisa corresponder à categoria do equipamento vinculado à inspeção, validada tanto no agendamento quanto no início.

**Justificativa principal:** Um template de extintor não cobre itens de segurança de um elevador; permitir o uso gera um registro de conformidade tecnicamente inválido e enganoso.

## 3. Comportamento do sistema

| Questão | Resposta do grupo |
|---|---|
| O que o aplicativo deve fazer? | Ao ler o QR Code, comparar a categoria do equipamento com a do modelo já vinculado e, se divergirem, bloquear o botão de iniciar, orientando contato com o supervisor. |
| O backend também deve validar? | ☒ Sim, impedindo no agendamento (UC-06) que um modelo seja associado a um equipamento de categoria diferente, de forma análoga à regra local × equipamento (RN-014). |
| O que acontece offline ou na sincronização? | Como as categorias já estão no dispositivo, o bloqueio funciona sem conexão; ao sincronizar, o servidor reforça a rejeição e sinaliza a divergência ao supervisor. |
| Precisa registrar auditoria? | ☒ Sim, registrando equipamento, modelo, categorias envolvidas, técnico e horário da tentativa bloqueada, para correção posterior do agendamento. |

## 4. Risco ou exceção

**Principal situação que pode exigir uma exceção ou alterar a decisão:** O cadastro de equipamento ainda não possui campo de categoria; a regra depende de incluir esse campo e migrar os equipamentos existentes antes de ativar o bloqueio.

## 5. Contestação

**Argumento apresentado pelo outro grupo:** Nem todo template precisa ser exclusivo de uma categoria; um modelo de inspeção visual geral poderia se aplicar a qualquer tipo de equipamento, e bloquear sempre impediria esse uso legítimo.

## 6. Decisão final

☐ Mantemos a decisão&nbsp;&nbsp;&nbsp;☒ Alteramos parcialmente&nbsp;&nbsp;&nbsp;☐ Alteramos completamente&nbsp;&nbsp;&nbsp;☐ Nova regra necessária

**Regra final proposta:** O bloqueio por categoria permanece o padrão, mas o administrador pode marcar explicitamente um template como genérico, dispensando a checagem apenas nesses casos declarados.