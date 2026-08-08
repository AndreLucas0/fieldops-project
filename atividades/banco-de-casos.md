# Banco de Casos — Tribunal das Regras de Negócio

## Projeto FieldOps

Esta página reúne os casos que serão apresentados aos alunos durante a dinâmica.

Os casos devem ser apresentados separadamente, um por rodada. O professor pode apresentar inicialmente apenas o cenário principal e acrescentar uma nova condição durante a contestação.

> **Importante:** As respostas esperadas **não devem ser disponibilizadas previamente aos alunos**.

---

# Caso 1 — Alteração do Template

## Cenário

Uma inspeção foi criada utilizando a versão **2** de um template.

Enquanto a inspeção estava em andamento, um administrador publicou a **versão 3** do mesmo template.

Ao abrir novamente a inspeção, o inspetor percebe que existe uma versão mais recente disponível.

### Decisões esperadas dos grupos

Os grupos deverão discutir:

- qual versão deve ser utilizada;
- se os itens da inspeção podem mudar;
- se novas inspeções devem usar a versão 3;
- o que acontece com inspeções em andamento;
- como preservar o histórico.

---

# Caso 2 — Template incompatível com o equipamento

## Cenário

Um inspetor acessa um equipamento do tipo elevador.

Ao iniciar a inspeção, tenta utilizar um template criado para extintores.

### Decisões esperadas dos grupos

Os grupos deverão discutir:

- se a operação deve ser bloqueada;
- como identificar a compatibilidade;
- onde a validação deve acontecer;
- o que ocorre quando o aplicativo está offline.

---

# Caso 3 — Item obrigatório sem resposta

## Cenário

O inspetor respondeu a maior parte da inspeção, mas deixou dois itens obrigatórios sem resposta.

Mesmo assim, tenta finalizar e enviar a inspeção.

### Decisões esperadas dos grupos

Os grupos deverão discutir:

- se a finalização deve ser bloqueada;
- como informar quais itens estão pendentes;
- se o backend também deve validar;
- se existe alguma situação em que o item possa permanecer sem resposta.

---

# Caso 4 — Não conformidade sem evidência

## Cenário

Um item foi marcado como não conforme.

O inspetor não adicionou fotografia nem observação e tenta concluir a inspeção.

### Decisões esperadas dos grupos

Os grupos deverão discutir:

- se toda não conformidade exige evidência;
- quais tipos de evidência podem ser aceitos;
- se uma justificativa pode substituir uma fotografia;
- se a conclusão deve ser bloqueada.

---

# Caso 5 — Inspeção realizada offline

## Cenário

O inspetor está em um local sem internet.

Ele abre uma inspeção, responde aos itens, adiciona observações e registra fotografias.

Depois, fecha completamente o aplicativo.

### Decisões esperadas dos grupos

Os grupos deverão discutir:

- onde os dados devem ser armazenados;
- se o trabalho deve estar disponível ao abrir novamente o aplicativo;
- como identificar que a inspeção ainda não foi sincronizada;
- o que ocorre quando a conexão retorna.

---

# Caso 6 — Sincronização duplicada

## Cenário

Uma inspeção foi concluída offline.

Quando a internet retorna, o inspetor pressiona várias vezes o botão de sincronização. A mesma inspeção é enviada mais de uma vez.

### Decisões esperadas dos grupos

Os grupos deverão discutir:

- como evitar inspeções duplicadas;
- se o botão deve ser temporariamente bloqueado;
- como o backend identifica o mesmo envio;
- o que fazer quando o aplicativo não recebe confirmação.

---

# Caso 7 — Alteração após o envio para revisão

## Cenário

Uma inspeção foi finalizada e enviada para revisão.

Depois disso, o inspetor percebe que uma resposta está incorreta e tenta alterá-la.

### Decisões esperadas dos grupos

Os grupos deverão discutir:

- se o inspetor pode editar diretamente;
- se a inspeção precisa ser devolvida;
- como preservar as respostas anteriores;
- se a alteração deve gerar auditoria.

---

# Caso 8 — Evidência removida

## Cenário

Uma fotografia foi adicionada como evidência de uma não conformidade.

Antes de enviar a inspeção, o inspetor tenta excluir a fotografia.

### Decisões esperadas dos grupos

Os grupos deverão discutir:

- se a exclusão deve ser permitida;
- se uma nova evidência deve ser exigida;
- se o vínculo com a não conformidade pode ficar vazio;
- qual mensagem deve ser apresentada.

---

# Caso 9 — Inspeção rejeitada pelo revisor

## Cenário

O revisor identifica informações incompletas e rejeita a inspeção.

Ele informa o motivo da rejeição e devolve a inspeção ao inspetor.

### Decisões esperadas dos grupos

Os grupos deverão discutir:

- qual deve ser o novo status;
- se o motivo da rejeição é obrigatório;
- quais campos o inspetor pode alterar;
- se uma nova revisão será necessária;
- como preservar o histórico.

---

# Caso 10 — Resposta alterada para não conforme

## Cenário

Um item foi inicialmente marcado como conforme.

Depois de analisar novamente o equipamento, o inspetor altera a resposta para não conforme.

### Decisões esperadas dos grupos

Os grupos deverão discutir:

- se uma não conformidade deve ser criada;
- se evidências devem ser solicitadas;
- se a resposta anterior deve ser preservada;
- o que ocorre se o item voltar a ser marcado como conforme.

---

# Caso 11 — Dois inspetores alterando a mesma inspeção

## Cenário

Uma inspeção foi baixada em dois dispositivos diferentes.

Dois inspetores trabalham na mesma inspeção enquanto estão offline.

Quando a conexão retorna, os dois dispositivos enviam respostas diferentes para os mesmos itens.

### Decisões esperadas dos grupos

Os grupos deverão discutir:

- se dois inspetores podem trabalhar na mesma inspeção;
- como identificar conflitos;
- qual resposta deve prevalecer;
- se o sistema pode combinar alterações;
- quem deve resolver o conflito.

---

# Caso 12 — Transferência de responsável

## Cenário

Um inspetor iniciou uma inspeção e respondeu parte dos itens.

Por um motivo inesperado, ele não poderá continuar. Outro inspetor precisa assumir o trabalho.

### Decisões esperadas dos grupos

Os grupos deverão discutir:

- se a transferência deve ser permitida;
- quem pode autorizá-la;
- se o novo inspetor pode alterar respostas anteriores;
- como identificar quem respondeu cada item;
- quais eventos devem ser registrados.

---

# Caso 13 — Equipamento alterado durante a inspeção

## Cenário

Uma inspeção foi criada para determinado equipamento.

Antes da conclusão, o cadastro do equipamento é alterado para corrigir o número de patrimônio e a localização.

### Decisões esperadas dos grupos

Os grupos deverão discutir:

- quais dados devem ser atualizados;
- quais dados precisam permanecer como estavam no início;
- se a inspeção deve guardar um snapshot do equipamento;
- como diferenciar correções cadastrais de mudanças relevantes.

---

# Caso 14 — Exclusão de um equipamento

## Cenário

Um equipamento possui inspeções anteriores e uma inspeção em andamento.

Um administrador tenta excluir seu cadastro.

### Decisões esperadas dos grupos

Os grupos deverão discutir:

- se a exclusão deve ser permitida;
- se o equipamento deve ser apenas inativado;
- o que acontece com a inspeção em andamento;
- como preservar o histórico.

---

# Caso 15 — Inspeção enviada sem todas as fotografias sincronizadas

## Cenário

O inspetor respondeu aos itens e adicionou fotografias.

As respostas foram sincronizadas, mas algumas imagens ainda estão pendentes. Mesmo assim, o usuário tenta enviar a inspeção para revisão.

### Decisões esperadas dos grupos

Os grupos deverão discutir:

- se o envio deve ser permitido;
- como identificar arquivos pendentes;
- qual status deve ser apresentado;
- o que acontece se uma imagem falhar definitivamente.

---

# Caso 16 — Revisor aprovando a própria inspeção

## Cenário

Um usuário possui permissão de inspetor e revisor.

Ele realiza uma inspeção e, depois, tenta revisar e aprovar o próprio trabalho.

### Decisões esperadas dos grupos

Os grupos deverão discutir:

- se a operação deve ser permitida;
- se deve existir separação de responsabilidades;
- quais perfis podem revisar;
- quando uma exceção poderia existir.

---

# Caso 17 — Template desativado

## Cenário

Um administrador desativa um template que não deve mais ser utilizado.

Existem inspeções em andamento utilizando uma versão desse template.

### Decisões esperadas dos grupos

Os grupos deverão discutir:

- se as inspeções podem continuar;
- se novas inspeções podem ser criadas;
- a diferença entre desativar um template e publicar uma nova versão;
- se o sistema deve alertar os responsáveis.

---

# Caso 18 — Alteração de uma não conformidade após aprovação

## Cenário

Uma inspeção foi revisada e aprovada.

Dias depois, um usuário percebe que a descrição de uma não conformidade está incorreta e tenta editá-la.

### Decisões esperadas dos grupos

Os grupos deverão discutir:

- se dados aprovados podem ser alterados;
- se deve existir uma retificação;
- como preservar o valor anterior;
- se uma nova revisão é necessária.

---

# Orientações para condução

Para cada rodada:

1. apresente somente o cenário principal;
2. conceda cerca de **5 minutos** para análise;
3. escolha um grupo para apresentar;
4. escolha outro grupo para contestar;
5. acrescente a condição de contestação quando necessário;
6. permita que o primeiro grupo revise a solução;
7. registre no quadro a regra final proposta.

> **Observação:** Não é necessário utilizar todos os casos em uma única aula.

Os casos podem ser selecionados de acordo com o assunto que estiver sendo trabalhado.

## Casos sugeridos por tema

| Tema | Casos sugeridos |
|-------|-----------------|
| Templates e versões | 1 e 17 |
| Equipamentos | 2, 13 e 14 |
| Respostas e evidências | 3, 4, 8 e 10 |
| Offline e sincronização | 5, 6, 11 e 15 |
| Revisão e auditoria | 7, 9, 16 e 18 |
| Usuários e responsabilidade | 12 e 16 |