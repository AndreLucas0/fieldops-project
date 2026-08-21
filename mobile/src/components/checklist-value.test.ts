import type { InspectionItemSnapshot, InspectionResponse, ResponseType } from '@/models';

import {
  countAnswered,
  isAnswered,
  isComplete,
  readChecklistRules,
  readChoiceOptions,
  requiresEvidence,
  requiresObservation,
  toChecklistValue,
} from './checklist-value';

function buildItem(overrides: Partial<InspectionItemSnapshot> = {}): InspectionItemSnapshot {
  return {
    id: 'item-1',
    inspectionId: 'insp-1',
    sectionTitle: 'Condições gerais',
    sectionOrder: 1,
    itemTitle: 'Área livre de obstruções?',
    responseType: 'CONFORMITY',
    required: true,
    itemOrder: 1,
    createdAt: '2026-08-14T10:00:00Z',
    ...overrides,
  };
}

function buildResponse(overrides: Partial<InspectionResponse> = {}): InspectionResponse {
  return {
    id: 'resp-1',
    inspectionItemId: 'item-1',
    answeredAtDevice: '2026-08-14T11:00:00Z',
    createdAt: '2026-08-14T11:00:00Z',
    updatedAt: '2026-08-14T11:00:00Z',
    version: 1,
    ...overrides,
  };
}

describe('readChecklistRules', () => {
  it('lê os sinalizadores de rulesJson, onde o snapshot os guarda', () => {
    const item = buildItem({
      rulesJson: { observationRequiredOnFailure: true, evidenceRequiredOnFailure: false },
    });

    expect(readChecklistRules(item)).toEqual({
      observationRequiredOnFailure: true,
      evidenceRequiredOnFailure: false,
    });
  });

  it('aceita os sinalizadores na raiz, se o servidor passar a enviá-los assim', () => {
    const item = { ...buildItem(), evidenceRequiredOnFailure: true } as InspectionItemSnapshot;

    expect(readChecklistRules(item).evidenceRequiredOnFailure).toBe(true);
  });

  it('trata ausência de regra como não obrigatória', () => {
    expect(readChecklistRules(buildItem({ rulesJson: null }))).toEqual({
      observationRequiredOnFailure: false,
      evidenceRequiredOnFailure: false,
    });
  });
});

describe('readChoiceOptions', () => {
  it('lê o formato temporário do PEND-03', () => {
    const item = buildItem({
      responseType: 'SINGLE_CHOICE',
      optionsJson: {
        options: [
          { value: 'BOM', label: 'Bom' },
          { value: 'RUIM', label: 'Ruim' },
        ],
      },
    });

    expect(readChoiceOptions(item)).toEqual([
      { value: 'BOM', label: 'Bom' },
      { value: 'RUIM', label: 'Ruim' },
    ]);
  });

  it('aceita lista simples de textos enquanto o formato não é fechado', () => {
    const item = buildItem({
      responseType: 'SINGLE_CHOICE',
      optionsJson: { choices: ['Bom', 'Regular'] },
    });

    expect(readChoiceOptions(item)).toEqual([
      { value: 'Bom', label: 'Bom' },
      { value: 'Regular', label: 'Regular' },
    ]);
  });

  it('descarta entradas sem valor em vez de renderizar opção quebrada', () => {
    const item = buildItem({
      responseType: 'SINGLE_CHOICE',
      optionsJson: { options: [{ label: 'sem valor' }, { value: 'OK', label: 'Ok' }] },
    });

    expect(readChoiceOptions(item)).toEqual([{ value: 'OK', label: 'Ok' }]);
  });

  it('devolve lista vazia sem configuração', () => {
    expect(readChoiceOptions(buildItem({ optionsJson: null }))).toEqual([]);
  });
});

describe('isAnswered', () => {
  const cases: { type: ResponseType; answered: object; empty: object }[] = [
    { type: 'TEXT_SHORT', answered: { valueText: 'LC-1' }, empty: { valueText: '  ' } },
    { type: 'TEXT_LONG', answered: { valueText: 'algo' }, empty: { valueText: '' } },
    { type: 'NUMBER', answered: { valueNumber: 0 }, empty: { valueNumber: null } },
    { type: 'BOOLEAN', answered: { valueBoolean: false }, empty: { valueBoolean: null } },
    { type: 'DATE', answered: { valueDate: '2026-08-14' }, empty: { valueDate: null } },
    { type: 'CONFORMITY', answered: { conformity: 'CONFORMING' }, empty: {} },
    { type: 'SINGLE_CHOICE', answered: { valueText: 'BOM' }, empty: {} },
  ];

  for (const { type, answered, empty } of cases) {
    it(`reconhece resposta de ${type}`, () => {
      const item = buildItem({ responseType: type });

      expect(isAnswered(item, answered)).toBe(true);
      expect(isAnswered(item, empty)).toBe(false);
    });
  }

  it('zero e falso contam como resposta', () => {
    expect(isAnswered(buildItem({ responseType: 'NUMBER' }), { valueNumber: 0 })).toBe(true);
    expect(isAnswered(buildItem({ responseType: 'BOOLEAN' }), { valueBoolean: false })).toBe(true);
  });
});

describe('isComplete', () => {
  const item = buildItem({
    rulesJson: { observationRequiredOnFailure: true, evidenceRequiredOnFailure: true },
  });

  it('item não conforme sem observação continua pendente (RN-038)', () => {
    expect(isAnswered(item, { conformity: 'NON_CONFORMING' })).toBe(true);
    expect(isComplete(item, { conformity: 'NON_CONFORMING' })).toBe(false);
  });

  it('completa quando a observação é preenchida', () => {
    expect(isComplete(item, { conformity: 'NON_CONFORMING', observation: 'Paletes na frente.' })
    ).toBe(true);
  });

  it('só espaço em branco não satisfaz a observação', () => {
    expect(isComplete(item, { conformity: 'NON_CONFORMING', observation: '   ' })).toBe(false);
  });

  it('conforme não exige observação', () => {
    expect(isComplete(item, { conformity: 'CONFORMING' })).toBe(true);
  });

  it('sem a regra, não conforme sem observação já está completo', () => {
    const semRegra = buildItem({ rulesJson: null });
    expect(isComplete(semRegra, { conformity: 'NON_CONFORMING' })).toBe(true);
  });
});

describe('requiresObservation / requiresEvidence', () => {
  const item = buildItem({
    rulesJson: { observationRequiredOnFailure: true, evidenceRequiredOnFailure: true },
  });

  it('só valem para não conforme', () => {
    expect(requiresObservation(item, { conformity: 'NON_CONFORMING' })).toBe(true);
    expect(requiresEvidence(item, { conformity: 'NON_CONFORMING' })).toBe(true);

    expect(requiresObservation(item, { conformity: 'CONFORMING' })).toBe(false);
    expect(requiresEvidence(item, { conformity: 'NOT_APPLICABLE' })).toBe(false);
  });
});

describe('toChecklistValue', () => {
  it('devolve objeto vazio sem resposta gravada', () => {
    expect(toChecklistValue(undefined)).toEqual({});
  });

  it('extrai os campos editáveis da resposta', () => {
    const value = toChecklistValue(
      buildResponse({ valueNumber: 82.4, conformity: 'CONFORMING', observation: 'ok' }),
    );

    expect(value.valueNumber).toBe(82.4);
    expect(value.conformity).toBe('CONFORMING');
    expect(value.observation).toBe('ok');
  });
});

describe('countAnswered', () => {
  it('conta itens com resposta, ignorando respostas órfãs', () => {
    const items = [
      buildItem({ id: 'a', responseType: 'TEXT_SHORT' }),
      buildItem({ id: 'b', responseType: 'NUMBER' }),
      buildItem({ id: 'c', responseType: 'BOOLEAN' }),
    ];
    const responses = [
      buildResponse({ id: 'r1', inspectionItemId: 'a', valueText: 'x' }),
      buildResponse({ id: 'r2', inspectionItemId: 'b', valueNumber: null }),
      buildResponse({ id: 'r3', inspectionItemId: 'zzz', valueText: 'orfã' }),
    ];

    expect(countAnswered(items, responses)).toBe(1);
  });
});
