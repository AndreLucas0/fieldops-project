/**
 * BASEVERSION-STALENESS — RN-075: versão base obsoleta na 2ª edição do mesmo item.
 *
 * BUG: versionsRef nunca é atualizado após upsertOutboxEntry bem-sucedido.
 * A segunda edição do mesmo item na mesma sessão reutiliza a versão antiga,
 * enviando baseVersion obsoleto → servidor retorna CONFLICT → dado perdido.
 *
 * FIX aplicado: após cada upsertOutboxEntry bem-sucedido, incrementar
 * versionsRef via re-leitura atômica do ref (não closure stale).
 */

import { act, renderHook, waitFor } from '@testing-library/react-native';

import type { InspectionDetail, InspectionItemSnapshot, InspectionResponse } from '@/models';
import { useChecklist } from '@/features/checklist/use-checklist';

jest.mock('@/services/sync-service', () => ({
  syncPendingIfOnline: jest.fn().mockResolvedValue({ synced: 0, failed: 0 }),
}));

const INSPECTION_ID = 'insp-bvs-1';
const ITEM_ID = 'item-bvs-1';

const BASE_ITEM: InspectionItemSnapshot = {
  id: ITEM_ID,
  inspectionId: INSPECTION_ID,
  sectionTitle: 'Seção A',
  sectionOrder: 1,
  itemTitle: 'Campo de texto',
  responseType: 'TEXT_SHORT',
  required: false,
  itemOrder: 1,
  createdAt: '2026-01-01T00:00:00.000Z',
};

function makeInspection(responses: InspectionResponse[] = []): InspectionDetail {
  return { id: INSPECTION_ID, version: 1, items: [BASE_ITEM], responses } as unknown as InspectionDetail;
}

function outboxRow(id: string): { base_version: number; synced: number } | undefined {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return (require('expo-sqlite').__store as Map<string, { base_version: number; synced: number }>).get(id);
}

let counter = 0;
beforeEach(() => { counter = 0; });

describe('BASEVERSION-STALENESS — RN-075: base_version na 2ª edição do mesmo item', () => {
  const generateId = () => `op-bvs-${(counter += 1)}`;

  it('2ª edição (sem resposta pré-existente) envia base_version 1, não 0', async () => {
    const { result } = await renderHook(() =>
      useChecklist(makeInspection([]), { debounceMs: 0, generateId }),
    );

    await act(async () => { result.current.change(BASE_ITEM, { valueText: 'resposta inicial' }); });
    await waitFor(() => expect(outboxRow('op-bvs-1')).toBeDefined());
    expect(outboxRow('op-bvs-1')!.base_version).toBe(0);

    // 2ª edição do mesmo item na mesma sessão: base_version deve ser 1 (fix).
    // SEM O FIX: versionsRef não é atualizado → base_version = 0 → FALHA aqui (RED).
    await act(async () => { result.current.change(BASE_ITEM, { valueText: 'correção' }); });
    await waitFor(() => expect(outboxRow('op-bvs-2')).toBeDefined());
    expect(outboxRow('op-bvs-2')!.base_version).toBe(1);
  });

  it('2ª edição (item com resposta server version=2) envia base_version 3, não 2', async () => {
    const serverResponse: InspectionResponse = {
      id: 'resp-bvs-server',
      inspectionItemId: ITEM_ID,
      answeredAtDevice: '2026-01-01T00:00:00.000Z',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
      version: 2,
    };
    const { result } = await renderHook(() =>
      useChecklist(makeInspection([serverResponse]), { debounceMs: 0, generateId }),
    );

    await act(async () => { result.current.change(BASE_ITEM, { valueText: 'primeira edição' }); });
    await waitFor(() => expect(outboxRow('op-bvs-1')).toBeDefined());
    expect(outboxRow('op-bvs-1')!.base_version).toBe(2);

    // 2ª edição: base_version deve ser 3 (fix).
    // SEM O FIX: versionsRef não é atualizado → base_version = 2 → FALHA aqui (RED).
    await act(async () => { result.current.change(BASE_ITEM, { valueText: 'segunda edição' }); });
    await waitFor(() => expect(outboxRow('op-bvs-2')).toBeDefined());
    expect(outboxRow('op-bvs-2')!.base_version).toBe(3);
  });

  it('edição concorrente: write-back usa ref atualizado, não closure stale da operação anterior', async () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const sqlite = require('expo-sqlite') as {
      __store: Map<string, Record<string, unknown>>;
      __db: { runAsync: jest.Mock };
    };

    let releaseFirstInsert!: () => void;
    const firstInsertBlocked = new Promise<void>((resolve) => { releaseFirstInsert = resolve; });

    // Block only the 1st INSERT so v2 can complete while v1 is still in-flight.
    let insertCount = 0;
    sqlite.__db.runAsync.mockImplementation(async (sql: string, params: unknown[]) => {
      if (/INSERT OR REPLACE INTO outbox/i.test(sql)) {
        insertCount += 1;
        if (insertCount === 1) await firstInsertBlocked;
        const [id, inspection_id, entity_type, entity_id, operation_type, base_version, payload] = params;
        sqlite.__store.set(id as string, {
          id, inspection_id, entity_type, entity_id, operation_type,
          base_version: Number(base_version), payload, synced: 0, error_count: 0,
          created_at: new Date().toISOString(),
        });
      }
    });

    const { result } = await renderHook(() =>
      useChecklist(makeInspection([]), { debounceMs: 0, generateId }),
    );

    // v1's change schedules a 0ms macrotask timer. We must let it fire BEFORE calling
    // change(v2), otherwise change(v2) would see a pending timer and cancel it.
    await act(async () => { result.current.change(BASE_ITEM, { valueText: 'v1' }); });
    // Yield past v1's macrotask: schedule a 0ms timer AFTER v1's and await it.
    // The event loop drains v1's timer first (insertCount→1, send starts, blocks),
    // then our resolve timer, so by the time we continue, v1 is in-flight.
    await new Promise<void>((resolve) => setTimeout(resolve, 0));

    // v2: fires while v1 is blocked — also captures knownVersion=0, completes immediately.
    // v2 write-back: re-reads ref(0)+1=1 → ref becomes 1.
    await act(async () => { result.current.change(BASE_ITEM, { valueText: 'v2' }); });
    await waitFor(() => expect(outboxRow('op-bvs-2')).toBeDefined());

    // Release v1. Its write-back must re-read the live ref (now 1, not the stale closure 0).
    // OLD code: closure knownVersion+1 = 0+1 = 1 → clobbers v2's increment → ref stays 1.
    // NEW code: re-reads ref(1)+1 = 2 → ref becomes 2.
    releaseFirstInsert();
    await waitFor(() => expect(outboxRow('op-bvs-1')).toBeDefined());

    // A 3rd serial change reveals the live ref value after both writes have settled.
    await act(async () => { result.current.change(BASE_ITEM, { valueText: 'v3' }); });
    await waitFor(() => expect(outboxRow('op-bvs-3')).toBeDefined());

    expect(outboxRow('op-bvs-1')!.base_version).toBe(0); // v1 started when ref=0
    expect(outboxRow('op-bvs-2')!.base_version).toBe(0); // v2 started concurrently (ref=0)
    expect(outboxRow('op-bvs-3')!.base_version).toBe(2); // ref=2 after both write-backs settled
  });

  it('falha no upsertOutboxEntry não incrementa o contador de versão', async () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const db = (require('expo-sqlite') as { __db: { runAsync: jest.Mock } }).__db;

    // First INSERT rejects (simulates SQLite I/O error).
    db.runAsync.mockRejectedValueOnce(new Error('SQLite: disk I/O error'));

    const { result } = await renderHook(() =>
      useChecklist(makeInspection([]), { debounceMs: 0, generateId }),
    );

    // First change fails — upsertOutboxEntry throws, catch runs, version NOT incremented.
    await act(async () => { result.current.change(BASE_ITEM, { valueText: 'falha' }); });
    await waitFor(() =>
      expect(result.current.saveStates.get(ITEM_ID)?.status).toBe('error'),
    );
    expect(outboxRow('op-bvs-1')).toBeUndefined();

    // Second change must still use base_version 0 — the failed write must not have counted.
    await act(async () => { result.current.change(BASE_ITEM, { valueText: 'retentativa' }); });
    await waitFor(() => expect(outboxRow('op-bvs-2')).toBeDefined());
    expect(outboxRow('op-bvs-2')!.base_version).toBe(0);
  });
});
