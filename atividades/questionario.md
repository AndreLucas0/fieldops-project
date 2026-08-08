# Questionário:

1. **Uma inspeção pode ser criada sem estar vinculada a um modelo de inspeção?** Explique por que essa vinculação é necessária e quais informações do modelo devem ser preservadas na inspeção.

**Resposta:** Não. Pela **RN-024**, toda inspeção deve estar vinculada a uma **versão publicada** de um modelo — não basta o modelo existir, ele precisa ter passado pelo processo de publicação (RN-015 a RN-020). Essa vinculação é necessária porque o modelo define a estrutura (seções, itens, tipos de resposta e ordem) que a inspeção vai seguir, garantindo consistência e permitindo a validação das respostas (RN-036).

Além disso, pela **RN-021**, a inspeção deve preservar um **snapshot** dos itens da versão utilizada no momento da criação. Isso é essencial porque modelos publicados podem gerar novas versões depois (RN-020) ou até ser desativados (RN-022), e isso não pode alterar retroativamente inspeções já criadas ou em andamento — cada inspeção permanece fiel à versão do modelo que ela usou.

---

2. **O que o sistema deve fazer quando um técnico tenta concluir uma inspeção que possui itens obrigatórios não respondidos?** Descreva o comportamento esperado no aplicativo.

**Resposta:** Pela **RN-037**, itens obrigatórios devem ser respondidos antes da conclusão. Logo, o aplicativo deve **impedir a conclusão** da inspeção, indicando ao técnico quais itens obrigatórios ainda estão pendentes. O comportamento esperado é bloquear a ação de "concluir" (não permitir o registro do momento de conclusão previsto na RN-042) até que todos os itens obrigatórios aplicáveis estejam preenchidos, considerando o cálculo de progresso descrito na RN-040 (itens respondidos em relação aos itens aplicáveis).

---

3. Durante uma inspeção, o técnico marcou um item como **"Não conforme"**, mas não informou nenhuma observação. **A resposta pode ser salva ou a inspeção pode ser concluída?** Justifique com base nas regras do projeto.

**Resposta:** A **resposta pode ser salva localmente** normalmente — a RN-041 determina que o app deve salvar localmente cada alteração confirmada, e nada nas regras impede o salvamento intermediário de uma resposta incompleta.

Porém, a **conclusão da inspeção deve ser bloqueada** se a observação for exigida. Pela **RN-038**, quando o item estiver configurado para exigir observação em caso de não conformidade, essa observação é obrigatória. Ou seja, o salvamento do item isolado é permitido (permitindo continuidade do trabalho offline), mas o fluxo de conclusão deve validar essa exigência antes de permitir o fechamento da inspeção — de forma análoga ao tratamento de itens obrigatórios (RN-037).

---

4. Um item de inspeção foi classificado como **não conforme e de criticidade crítica**. **Quais informações ou evidências adicionais devem ser obrigatórias antes da conclusão da inspeção?**

**Resposta:** Pela **RN-039**, um item não conforme configurado como **crítico** deve exigir **ao menos uma evidência** antes da conclusão. Isso se conecta também à **RN-055**, que trata da não conformidade em si: não conformidades de criticidade **crítica** devem exigir **descrição e evidência**.

Ou seja, antes de concluir a inspeção, o sistema deve garantir:
- Observação/descrição preenchida (RN-038 e RN-055);
- Pelo menos uma evidência anexada e vinculada à resposta/não conformidade (RN-039, RN-045).

A criticidade em si deve assumir um valor válido dentre os previstos (baixa, média, alta, crítica — RN-054).

---

5. Um técnico encontrou no aplicativo uma inspeção atribuída a outro profissional. **Ele poderá iniciar ou alterar essa inspeção?** Explique como o controle de responsabilidade deve funcionar.

**Resposta:** Não. Pela **RN-033**, somente o **técnico responsável** pode iniciar e responder a inspeção, salvo permissão administrativa excepcional — que a própria regra afirma **não estar prevista no MVP**. Isso é reforçado pela **RN-032** (somente inspeções atribuídas podem ser iniciadas) e pela **RN-031** (o MVP permite apenas um técnico responsável por inspeção).

Do ponto de vista de consulta, a **RN-004** já restringe o técnico a consultar integralmente apenas as inspeções atribuídas a ele — portanto, na prática, uma inspeção de outro técnico nem deveria estar plenamente visível/operável no dispositivo dele. O controle de responsabilidade é, portanto, exclusivo e não compartilhado no MVP.

---

6. Uma inspeção foi concluída em um local sem internet. **Qual status ela deve assumir no dispositivo e o que deve acontecer quando a conexão for restabelecida?**

**Resposta:** A **RN-065** e **RN-066** garantem que inspeções baixadas e dados não sincronizados permaneçam acessíveis e sobrevivam ao fechamento/reabertura do app — ou seja, a inspeção concluída localmente fica em um estado de **"concluída localmente, pendente de sincronização"**, com as respostas bloqueadas para edição (RN-043), aguardando envio.

Quando a conexão for restabelecida:
- A operação de conclusão é enviada com um **identificador idempotente único** (RN-067), evitando duplicidade em caso de reenvio (RN-068);
- O servidor registra o **momento de recebimento**, preservando também a **data de execução capturada no dispositivo** (RN-034, RN-042, RN-074);
- As operações são processadas respeitando dependências (RN-069), e a falha de uma não deve apagar outras pendentes (RN-070);
- Após confirmação, o **servidor passa a ser a fonte oficial** dos dados (RN-073), e a inspeção segue para a etapa de revisão (RN-044).

---

7. Após a sincronização, o servidor registrou a inspeção em um horário diferente daquele em que ela foi concluída no celular. **Qual data e hora devem representar a conclusão efetiva da inspeção?** Explique a diferença entre data de execução e data de sincronização.

**Resposta:** A **data/hora de execução efetiva é a capturada no dispositivo no momento da conclusão** — é ela que representa quando a inspeção foi realmente concluída pelo técnico (RN-042, RN-074).

A diferença entre os dois conceitos:
- **Data de execução**: momento real em que o técnico concluiu a inspeção, registrado pelo dispositivo (RN-034, RN-042). É essa a data que importa para efeitos de "quando a inspeção aconteceu".
- **Data de sincronização/recebimento**: momento em que o servidor recebeu a operação (RN-034, RN-042). Essa data serve para controle técnico/auditoria de quando os dados chegaram ao servidor, mas **não substitui** a data de execução.

Ambas devem ser preservadas simultaneamente (RN-074), justamente para que o sistema saiba diferenciar "quando aconteceu" de "quando chegou".

---

8. Uma inspeção já foi revisada e aprovada pelo supervisor. Posteriormente, o técnico percebeu que respondeu um item incorretamente. **Ele poderá editar diretamente a inspeção aprovada?** Qual deveria ser o procedimento adequado?

**Resposta:** Não. Pela **RN-082**, uma inspeção aprovada fica **bloqueada para edição comum**. Isso também é reforçado pela **RN-076** (dados aprovados no servidor prevalecem e não aceitam atualização tardia comum) e pela **RN-049** (evidências de inspeções aprovadas são somente leitura).

O procedimento adequado seria um **ajuste administrativo**, diferenciado de uma resposta de campo comum e sujeito à auditoria (**RN-085**). Não é uma edição livre feita pelo técnico — é uma exceção controlada, registrada e rastreável (em linha com a exigência de auditoria da RN-086), fora do fluxo normal de resposta.

---

9. O supervisor reprovou uma inspeção e solicitou correções. **O que deve acontecer com o status da inspeção e com o histórico das alterações realizadas pelo técnico?**

**Resposta:** O status da inspeção deve refletir a reprovação, permitindo que o técnico faça as correções necessárias (retornando ao estado de edição/correção). A **RN-080** exige que a reprovação tenha um motivo registrado.

Quanto ao histórico:
- A **RN-083** determina que correções após reprovação devem **preservar o histórico das versões anteriores** — ou seja, não se sobrescreve silenciosamente a resposta original; mantém-se rastro do que era antes e do que foi corrigido.
- Isso se conecta à **RN-084**: o supervisor não pode alterar silenciosamente a resposta do técnico — a correção é feita pelo técnico, dentro do fluxo de reprovação, e não pelo supervisor diretamente.
- Toda essa transição de estado deve ser validada pela API, rejeitando transições inválidas (RN-089), e alterações críticas devem registrar usuário, data, ação e entidade (RN-086).

---

10. Durante a sincronização, o aplicativo enviou duas vezes a mesma resposta devido a uma falha de conexão. **O sistema deve criar dois registros ou reconhecer que se trata da mesma operação?** Explique a importância da idempotência nesse cenário.

**Resposta:** Não deve criar dois registros. O sistema deve **reconhecer que se trata da mesma operação** e não gerar duplicidade. Isso é garantido pela combinação de duas regras:

- **RN-067**: cada operação enviada deve possuir um **identificador idempotente único**;
- **RN-068**: o reenvio da mesma operação **não pode criar duplicidade**.

A importância da idempotência nesse cenário é justamente permitir que o aplicativo **reenvie com segurança** operações quando não tem certeza se a operação anterior foi confirmada (por timeout, queda de conexão, etc.) — o servidor identifica pelo ID único que já processou aquela operação e simplesmente ignora/reconhece o reenvio, em vez de duplicar a resposta. Isso é essencial em um cenário offline-first, onde falhas de rede são esperadas e reenvios automáticos fazem parte do funcionamento normal (RN-069, RN-070).
