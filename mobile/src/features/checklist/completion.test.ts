import type {
  Evidence,
  InspectionItemSnapshot,
  InspectionResponse,
  NonConformity,
} from '@/models';

import { evaluateCompletion } from './completion';

function buildItem(overrides: Partial<InspectionItemSnapshot> = {}): InspectionItemSnapshot {
  return {
    id: 'item-1',
    inspectionId: 'insp-1',
    sectionTitle: 'Seção',
    sectionOrder: 1,
    itemTitle: 'Pergunta',
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

function buildEvidence(responseId: string): Evidence {
  return {
    id: `ev-${responseId}`,
    inspectionId: 'insp-1',
    responseId,
    type: 'PHOTO',
    mimeType: 'image/jpeg',
    sizeBytes: 1024,
    capturedAtDevice: '2026-08-14T11:05:00Z',
    createdAt: '2026-08-14T11:05:00Z',
  };
}

const REGRA_COMPLETA = {
  observationRequiredOnFailure: true,
  evidenceRequiredOnFailure: true,
};

describe('evaluateCompletion', () => {
  it('conta itens, respondidos, NCs e evidências', () => {
    const items = [
      buildItem({ id: 'a', responseType: 'BOOLEAN' }),
      buildItem({ id: 'b', responseType: 'TEXT_SHORT', required: false }),
    ];
    const responses = [buildResponse({ id: 'r1', inspectionItemId: 'a', valueBoolean: true })];
    const ncs = [{ id: 'nc-1' } as NonConformity];

    const summary = evaluateCompletion(items, responses, [buildEvidence('r1')], ncs);

    expect(summary.totalItems).toBe(2);
    expect(summary.answeredItems).toBe(1);
    expect(summary.requiredItems).toBe(1);
    expect(summary.nonConformities).toBe(1);
    expect(summary.evidences).toBe(1);
  });

  it('bloqueia item obrigatório sem resposta', () => {
    const summary = evaluateCompletion([buildItem({ responseType: 'BOOLEAN' })], [], [], []);

    expect(summary.canSubmit).toBe(false);
    expect(summary.blockers).toEqual([
      expect.objectContaining({ reason: 'missing-answer' }),
    ]);
  });

  it('item opcional sem resposta não bloqueia', () => {
    const summary = evaluateCompletion(
      [buildItem({ required: false, responseType: 'TEXT_SHORT' })],
      [],
      [],
      [],
    );

    expect(summary.canSubmit).toBe(true);
    expect(summary.blockers).toEqual([]);
  });

  it('bloqueia não conforme sem a observação exigida (RN-038)', () => {
    const item = buildItem({ rulesJson: { observationRequiredOnFailure: true } });
    const responses = [buildResponse({ conformity: 'NON_CONFORMING' })];

    const summary = evaluateCompletion([item], responses, [], []);

    expect(summary.blockers).toEqual([
      expect.objectContaining({ reason: 'missing-observation' }),
    ]);
  });

  it('bloqueia não conforme sem a evidência exigida', () => {
    const item = buildItem({ rulesJson: REGRA_COMPLETA });
    const responses = [
      buildResponse({ conformity: 'NON_CONFORMING', observation: 'Painel obstruído.' }),
    ];

    const summary = evaluateCompletion([item], responses, [], []);

    expect(summary.blockers).toEqual([expect.objectContaining({ reason: 'missing-evidence' })]);
  });

  it('libera quando a evidência está vinculada à resposta', () => {
    const item = buildItem({ rulesJson: REGRA_COMPLETA });
    const responses = [
      buildResponse({ conformity: 'NON_CONFORMING', observation: 'Painel obstruído.' }),
    ];

    const summary = evaluateCompletion([item], responses, [buildEvidence('resp-1')], []);

    expect(summary.canSubmit).toBe(true);
  });

  it('evidência de outra resposta não conta para este item', () => {
    const item = buildItem({ rulesJson: REGRA_COMPLETA });
    const responses = [
      buildResponse({ conformity: 'NON_CONFORMING', observation: 'Painel obstruído.' }),
    ];

    const summary = evaluateCompletion([item], responses, [buildEvidence('outra-resposta')], []);

    expect(summary.blockers).toEqual([expect.objectContaining({ reason: 'missing-evidence' })]);
  });

  it('item conforme não exige observação nem evidência', () => {
    const item = buildItem({ rulesJson: REGRA_COMPLETA });
    const responses = [buildResponse({ conformity: 'CONFORMING' })];

    const summary = evaluateCompletion([item], responses, [], []);

    expect(summary.canSubmit).toBe(true);
  });

  it('cada item aparece uma única vez, com o primeiro motivo', () => {
    const item = buildItem({ id: 'a', required: true, rulesJson: REGRA_COMPLETA });

    const summary = evaluateCompletion([item], [], [], []);

    expect(summary.blockers).toHaveLength(1);
    expect(summary.blockers[0]?.reason).toBe('missing-answer');
  });

  it('checklist sem itens não é considerado pronto para envio', () => {
    expect(evaluateCompletion([], [], [], []).canSubmit).toBe(false);
  });
});
