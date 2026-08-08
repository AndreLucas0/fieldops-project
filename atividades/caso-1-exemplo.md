# Caso 1 - Exemplo: Alteração do template

Uma inspeção foi criada utilizando a versão 2 de um template.

Enquanto a inspeção estava em andamento, um administrador publicou a versão 3 do mesmo template.

Ao abrir novamente a inspeção, o inspetor percebe que existe uma versão mais recente disponível.

---

## Possível resposta do Grupo 1

### Decisão

A inspeção deve continuar utilizando a versão 2.

### Regra de negócio

Uma inspeção deve permanecer vinculada à versão do template utilizada no momento de sua criação.

### Justificativa

Alterar a versão durante a execução poderia:

- adicionar novas perguntas;
- remover perguntas já respondidas;
- modificar critérios de avaliação;
- alterar o significado das respostas;
- prejudicar o histórico e a auditoria.

### Comportamento do sistema

| Questão | Resposta |
| --- | --- |
| Aplicativo | Deve abrir a inspeção utilizando os itens da versão 2. |
| Backend | Deve impedir a alteração direta da versão vinculada à inspeção. |
| Offline e sincronização | A inspeção armazenada localmente deve continuar com a versão original. |
| Auditoria | A publicação da versão 3 deve ser registrada. |

### Risco ou exceção

A nova versão pode ter sido criada para corrigir uma falha grave de segurança.

---

## Possível contestação do Grupo 2

O Grupo 2 apresenta a seguinte situação:

> A versão 3 adicionou um item obrigatório de segurança que não existia na versão 2. A inspeção ainda não possui respostas.
> 

O grupo questiona:

- É correto permitir que a inspeção continue com uma versão que possui uma falha conhecida?
- O administrador poderia bloquear inspeções antigas?
- Seria possível cancelar a inspeção e criar uma nova?

---

## Possível réplica do Grupo 1

O Grupo 1 mantém que a versão da inspeção não deve ser alterada diretamente.

Porém, reconhece que uma atualização crítica pode exigir uma exceção.

O grupo propõe:

- bloquear a continuação da inspeção antiga;
- cancelar formalmente a inspeção;
- registrar o motivo do cancelamento;
- criar uma nova inspeção com a versão 3;
- preservar a inspeção anterior no histórico.

---

## Decisão final

### Regra principal

Uma inspeção permanece vinculada à versão do template utilizada em sua criação.

### Exceção

Quando uma nova versão for classificada como crítica, a inspeção antiga poderá ser bloqueada ou cancelada.

### Restrição

A versão da inspeção antiga não deve ser substituída diretamente.

### Histórico

O cancelamento e a criação da inspeção substituta devem ser registrados.