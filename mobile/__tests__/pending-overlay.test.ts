import {
  applyPendingToDetail,
  applyPendingToList,
} from '@/features/inspections/pending-overlay';
import type { Inspection, InspectionDetail } from '@/models';
import type { OutboxRow } from '@/services/local-db';

/**
 * O que está no outbox é a verdade local até sincronizar (aplicativo-mobile.md:
 * "O banco local não deve ser tratado apenas como cache descartável enquanto
 * existirem alterações pendentes"). Lido do cache ou da rede, o detalhe e a
 * lista mostram as alterações ainda não enviadas.
 */

let sequence = 0;
function row(
  entityType: string,
  entityId: string,
  payload: Record<string, unknown>,
  baseVersion = 0,
): OutboxRow {
  sequence += 1;
  return {
    id: `op-${sequence}`,
    inspection_id: 'insp-1',
    entity_type: entityType,
    entity_id: entityId,
    operation_type: 'UPSERT',
    base_version: baseVersion,
    payload: JSON.stringify(payload),
    synced: 0,
    error_count: 0,
    status: 'PENDING',
    last_error: null,
    created_at: `2026-10-20T12:00:${String(sequence).padStart(2, '0')}Z`,
  };
}

function detail(overrides: Partial<InspectionDetail> = {}): InspectionDetail {
  return {
    id: 'insp-1',
    status: 'ASSIGNED',
    items: [],
    responses: [
      {
        id: 'resp-a',
        inspectionItemId: 'item-a',
        valueText: 'antigo',
        answeredAtDevice: '2026-10-19T10:00:00Z',
        createdAt: '2026-10-19T10:00:00Z',
        updatedAt: '2026-10-19T10:00:00Z',
        version: 2,
      },
    ],
    nonConformities: [
      {
        id: 'nc-1',
        inspectionId: 'insp-1',
        title: 'Original',
        description: 'Descrição',
        severity: 'LOW',
        status: 'OPEN',
        createdAtDevice: '2026-10-19T10:00:00Z',
        createdAt: '2026-10-19T10:00:00Z',
        updatedAt: '2026-10-19T10:00:00Z',
        version: 1,
      },
    ],
    ...overrides,
  } as InspectionDetail;
}

describe('applyPendingToDetail', () => {
  it('sem pendências, devolve o detalhe como veio', () => {
    const original = detail();
    expect(applyPendingToDetail(original, [])).toBe(original);
  });

  it('transição pendente muda o estado (iniciada offline aparece em andamento)', () => {
    const result = applyPendingToDetail(detail(), [
      row('INSPECTION', 'insp-1', { status: 'IN_PROGRESS', startedAtDevice: '2026-10-20T12:00:00Z' }),
    ]);

    expect(result.status).toBe('IN_PROGRESS');
    expect(result.startedAtDevice).toBe('2026-10-20T12:00:00Z');
  });

  it('a última transição pendente vence (iniciada e concluída offline)', () => {
    const result = applyPendingToDetail(detail(), [
      row('INSPECTION', 'insp-1', { status: 'IN_PROGRESS', startedAtDevice: '2026-10-20T12:00:00Z' }),
      row('INSPECTION', 'insp-1', { status: 'SUBMITTED', completedAtDevice: '2026-10-20T13:00:00Z' }),
    ]);

    expect(result.status).toBe('SUBMITTED');
    expect(result.completedAtDevice).toBe('2026-10-20T13:00:00Z');
  });

  it('resposta pendente substitui a do servidor e a versão segue a do outbox', () => {
    const result = applyPendingToDetail(detail(), [
      row('INSPECTION_RESPONSE', 'item-a', { valueText: 'primeira', inspectionId: 'insp-1' }, 2),
      row('INSPECTION_RESPONSE', 'item-a', { valueText: 'novo', observation: 'obs' }, 3),
    ]);

    const resposta = result.responses?.find((r) => r.inspectionItemId === 'item-a');
    expect(resposta).toMatchObject({ valueText: 'novo', observation: 'obs', version: 4 });
  });

  it('resposta pendente de item sem resposta no servidor é acrescentada', () => {
    const result = applyPendingToDetail(detail(), [
      row('INSPECTION_RESPONSE', 'item-b', { valueBoolean: true, conformity: 'CONFORMING' }),
    ]);

    expect(result.responses?.find((r) => r.inspectionItemId === 'item-b')).toMatchObject({
      valueBoolean: true,
      conformity: 'CONFORMING',
      version: 1,
    });
  });

  it('escolha única chega em valueChoice no outbox e volta como valueText', () => {
    const result = applyPendingToDetail(detail(), [
      row('INSPECTION_RESPONSE', 'item-c', { valueText: null, valueChoice: 'OK' }),
    ]);

    expect(result.responses?.find((r) => r.inspectionItemId === 'item-c')?.valueText).toBe('OK');
  });

  it('NC pendente nova entra na lista; edição pendente altera a existente', () => {
    const result = applyPendingToDetail(detail(), [
      row('NON_CONFORMITY', 'nc-nova', {
        inspectionId: 'insp-1',
        title: 'Criada offline',
        description: 'x',
        severity: 'HIGH',
        snapshotId: 'item-a',
        createdAtDevice: '2026-10-20T12:00:00Z',
      }),
      row('NON_CONFORMITY', 'nc-1', {
        inspectionId: 'insp-1',
        title: 'Editada offline',
        description: 'Descrição',
        severity: 'LOW',
      }),
    ]);

    expect(result.nonConformities?.find((nc) => nc.id === 'nc-nova')).toMatchObject({
      title: 'Criada offline',
      severity: 'HIGH',
      status: 'OPEN',
      inspectionItemId: 'item-a',
    });
    expect(result.nonConformities?.find((nc) => nc.id === 'nc-1')?.title).toBe('Editada offline');
  });

  it('ignora evidências e payloads ilegíveis', () => {
    const quebrada = { ...row('INSPECTION', 'insp-1', {}), payload: '{' };
    const result = applyPendingToDetail(detail(), [
      row('EVIDENCE', 'ev-1', { localUri: 'file:///x.jpg' }),
      quebrada,
    ]);

    expect(result.status).toBe('ASSIGNED');
  });
});

describe('applyPendingToList', () => {
  it('aplica o estado pendente só às inspeções afetadas', () => {
    const lista = [
      { id: 'insp-1', status: 'ASSIGNED' },
      { id: 'insp-2', status: 'ASSIGNED' },
    ] as Inspection[];

    const result = applyPendingToList(lista, [
      row('INSPECTION', 'insp-1', { status: 'IN_PROGRESS', startedAtDevice: '2026-10-20T12:00:00Z' }),
    ]);

    expect(result.map((i) => i.status)).toEqual(['IN_PROGRESS', 'ASSIGNED']);
  });
});
