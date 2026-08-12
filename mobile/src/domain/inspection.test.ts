import {
  isAnswered,
  isSupportedResponseType,
  summarize,
  type Answer,
  type TemplateItem,
} from './inspection';

/**
 * Regras de conclusão do checklist — RN-037, RN-038, RN-039 e RN-040.
 * São as validações que bloqueiam o envio de uma inspeção incompleta.
 */

function item(overrides: Partial<TemplateItem> = {}): TemplateItem {
  return {
    id: 'item-1',
    title: 'Item de teste',
    responseType: 'CONFORMITY',
    required: true,
    displayOrder: 1,
    ...overrides,
  };
}

describe('isAnswered', () => {
  it('não considera respondido um texto só com espaços', () => {
    const target = item({ responseType: 'TEXT_SHORT' });
    expect(isAnswered(target, { itemId: target.id, valueText: '   ' })).toBe(false);
    expect(isAnswered(target, { itemId: target.id, valueText: 'PAT-01' })).toBe(true);
  });

  it('considera respondido o número zero', () => {
    // Zero é um valor legítimo de medição e não pode cair como "vazio".
    const target = item({ responseType: 'NUMBER' });
    expect(isAnswered(target, { itemId: target.id, valueNumber: 0 })).toBe(true);
  });

  it('considera respondido o booleano falso', () => {
    const target = item({ responseType: 'BOOLEAN' });
    expect(isAnswered(target, { itemId: target.id, valueBoolean: false })).toBe(true);
  });

  it('trata item sem resposta como não respondido', () => {
    expect(isAnswered(item(), undefined)).toBe(false);
  });
});

describe('summarize', () => {
  it('calcula progresso e conformidade ignorando N/A no índice', () => {
    const items = [
      item({ id: 'a', displayOrder: 1 }),
      item({ id: 'b', displayOrder: 2 }),
      item({ id: 'c', displayOrder: 3 }),
    ];
    const answers: Answer[] = [
      { itemId: 'a', conformity: 'CONFORMING' },
      { itemId: 'b', conformity: 'NON_CONFORMING', observation: 'trinca' },
      { itemId: 'c', conformity: 'NOT_APPLICABLE' },
    ];

    const summary = summarize(items, answers);

    expect(summary.total).toBe(3);
    expect(summary.answered).toBe(3);
    expect(summary.progress).toBe(100);
    // 1 conforme de 2 avaliados — o N/A fica fora do cálculo.
    expect(summary.score).toBe(50);
    expect(summary.notApplicable).toBe(1);
  });

  it('bloqueia a conclusão com item obrigatório sem resposta (RN-037)', () => {
    const items = [item({ id: 'a', required: true, title: 'Lacre intacto?' })];

    const summary = summarize(items, []);

    expect(summary.blockers).toHaveLength(1);
    expect(summary.blockers[0]).toMatchObject({
      itemId: 'a',
      reason: 'Item obrigatório sem resposta',
    });
  });

  it('não bloqueia item opcional sem resposta', () => {
    const items = [item({ id: 'a', required: false })];
    expect(summarize(items, []).blockers).toHaveLength(0);
  });

  it('exige observação quando a resposta é não conforme (RN-038)', () => {
    const items = [item({ id: 'a', observationRequiredOnFailure: true })];

    const semObservacao = summarize(items, [{ itemId: 'a', conformity: 'NON_CONFORMING' }]);
    expect(semObservacao.blockers).toHaveLength(1);
    expect(semObservacao.blockers[0].reason).toBe('Não conformidade exige observação');

    const comObservacao = summarize(items, [
      { itemId: 'a', conformity: 'NON_CONFORMING', observation: 'Manômetro fora da faixa' },
    ]);
    expect(comObservacao.blockers).toHaveLength(0);
  });

  it('exige evidência quando a resposta é não conforme (RN-039)', () => {
    const items = [item({ id: 'a', evidenceRequiredOnFailure: true })];

    const semFoto = summarize(items, [{ itemId: 'a', conformity: 'NON_CONFORMING' }]);
    expect(semFoto.blockers[0].reason).toBe('Não conformidade exige evidência');

    const comFoto = summarize(items, [
      { itemId: 'a', conformity: 'NON_CONFORMING', evidenceUri: 'file:///foto.jpg' },
    ]);
    expect(comFoto.blockers).toHaveLength(0);
  });

  it('não exige observação nem evidência quando a resposta é conforme', () => {
    // As exigências valem só na falha; um item conforme não pode ser bloqueado.
    const items = [
      item({ id: 'a', observationRequiredOnFailure: true, evidenceRequiredOnFailure: true }),
    ];
    expect(summarize(items, [{ itemId: 'a', conformity: 'CONFORMING' }]).blockers).toHaveLength(0);
  });

  it('acumula os dois bloqueios no mesmo item', () => {
    const items = [
      item({ id: 'a', observationRequiredOnFailure: true, evidenceRequiredOnFailure: true }),
    ];
    expect(summarize(items, [{ itemId: 'a', conformity: 'NON_CONFORMING' }]).blockers).toHaveLength(
      2,
    );
  });

  it('devolve zeros para um checklist vazio, sem dividir por zero', () => {
    const summary = summarize([], []);
    expect(summary).toMatchObject({ total: 0, answered: 0, score: 0, progress: 0 });
    expect(summary.blockers).toHaveLength(0);
  });
});

describe('isSupportedResponseType', () => {
  it('reconhece os sete tipos do MVP', () => {
    expect(isSupportedResponseType('CONFORMITY')).toBe(true);
    expect(isSupportedResponseType('SINGLE_CHOICE')).toBe(true);
  });

  it('rejeita tipo desconhecido, para a tela poder avisar em vez de quebrar', () => {
    expect(isSupportedResponseType('SIGNATURE')).toBe(false);
  });
});
