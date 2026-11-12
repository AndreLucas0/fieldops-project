import * as SQLite from 'expo-sqlite';

import type { ApiClient } from '@/services/api-client';
import { getPendingEntries, upsertOutboxEntry, type OutboxRow } from '@/services/local-db';
import { syncPending } from '@/services/sync-service';

/**
 * CONFLICT-REBASE (2026-10-21) — RN-075 detecta o conflito; a política escolhida
 * pelo dono do projeto é a última edição do técnico valer: ao receber CONFLICT
 * numa resposta do checklist, o app lê a versão atual no servidor, refaz a base
 * das edições pendentes daquele item (nova operação, mesma ordem) e reenvia uma
 * vez na mesma sincronização.
 *
 * Origem: banco real — 2ª edição de um item recém-criado voltou CONFLICT
 * (base 1 × versão 0) e, como o servidor devolve DEPENDENCY_FAILED para o resto
 * da inspeção, todas as alterações e evidências seguintes ficaram presas.
 */

const sqlite = SQLite as unknown as { __store: Map<string, OutboxRow> };

const INSPECTION = 'insp-1';
const ITEM = 'snap-1';

interface PushOp {
  operationId: string;
  entityType: string;
  entityId: string;
  baseVersion: number | null;
  payload: { inspectionId?: string; valueText?: string };
}

/**
 * Servidor fictício com as regras do `SynchronizationService`: criar deixa a
 * resposta na versão 0, cada atualização soma 1, base diferente da atual é
 * CONFLICT, o resto da inspeção no mesmo lote é DEPENDENCY_FAILED e um
 * operationId já processado devolve o resultado gravado.
 */
function fakeServer(initial: Record<string, number> = {}, options: { detailFails?: boolean } = {}) {
  const versions = new Map<string, number>(Object.entries(initial));
  const values = new Map<string, string | undefined>();
  const processed = new Map<string, string>();
  const pushes: PushOp[][] = [];

  const post = jest.fn(async (_path: string, body?: unknown) => {
    const { operations } = body as { operations: PushOp[] };
    pushes.push(operations);
    const blocked = new Set<string>();
    const results = operations.map((op) => {
      const inspectionId = op.payload.inspectionId ?? INSPECTION;
      if (blocked.has(inspectionId)) {
        return { operationId: op.operationId, status: 'DEPENDENCY_FAILED' };
      }
      const replay = processed.get(op.operationId);
      if (replay) {
        if (replay === 'CONFLICT') blocked.add(inspectionId);
        return { operationId: op.operationId, status: replay };
      }
      const current = versions.get(op.entityId);
      let status = 'APPLIED';
      if (current !== undefined && op.baseVersion !== null && op.baseVersion !== current) {
        status = 'CONFLICT';
        blocked.add(inspectionId);
      } else {
        versions.set(op.entityId, current === undefined ? 0 : current + 1);
        values.set(op.entityId, op.payload.valueText);
      }
      processed.set(op.operationId, status);
      return {
        operationId: op.operationId,
        status,
        ...(status === 'CONFLICT'
          ? { error: { code: 'SYNC_VERSION_CONFLICT', message: 'baseVersion does not match' } }
          : {}),
      };
    });
    return { results };
  });

  const get = jest.fn(async () => {
    if (options.detailFails) throw new Error('Network request failed');
    return {
      id: INSPECTION,
      responses: [...versions.entries()].map(([inspectionItemId, version]) => ({
        id: `srv-${inspectionItemId}`,
        inspectionItemId,
        version,
      })),
    };
  });

  return { client: { post, get } as unknown as ApiClient, post, get, versions, values, pushes };
}

let sequence = 0;
async function queueEdit(id: string, valueText: string, baseVersion: number, itemId = ITEM) {
  await upsertOutboxEntry({
    id,
    inspectionId: INSPECTION,
    entityType: 'INSPECTION_RESPONSE',
    entityId: itemId,
    operationType: 'UPSERT',
    baseVersion,
    payload: JSON.stringify({ inspectionId: INSPECTION, valueText }),
  });
  // created_at determina a ordem de envio; o mock usa o relógio, então fixa uma sequência.
  sequence += 1;
  const row = sqlite.__store.get(id);
  if (row) row.created_at = `2026-10-21T12:00:${String(sequence).padStart(2, '0')}Z`;
}

describe('CONFLICT-REBASE — resposta em conflito é reenviada sobre a versão atual', () => {
  it('2ª edição de item recém-criado (base 1 × servidor 0): refaz a base e aplica na mesma sincronização', async () => {
    const server = fakeServer({ [ITEM]: 0 });
    await queueEdit('op-presa', 'correção', 1);

    const result = await syncPending(server.client);

    expect(result).toEqual({ synced: 1, failed: 0 });
    expect(server.values.get(ITEM)).toBe('correção');
    expect(server.versions.get(ITEM)).toBe(1);
    // Nova operação (o servidor já gravou CONFLICT para o id antigo) com a base atual.
    const retry = server.pushes[1]?.[0];
    expect(retry?.operationId).not.toBe('op-presa');
    expect(retry?.baseVersion).toBe(0);
    expect(await getPendingEntries()).toHaveLength(0);
  });

  it('cadeia de edições com base errada: refaz em sequência e mantém a ordem (a última vence)', async () => {
    const server = fakeServer({ [ITEM]: 0 });
    await queueEdit('op-1', 'segunda', 1);
    await queueEdit('op-2', 'terceira', 2);

    const result = await syncPending(server.client);

    expect(result).toEqual({ synced: 2, failed: 0 });
    expect(server.pushes[1]?.map((op) => [op.payload.valueText, op.baseVersion])).toEqual([
      ['segunda', 0],
      ['terceira', 1],
    ]);
    expect(server.values.get(ITEM)).toBe('terceira');
  });

  it('destrava o resto da inspeção que recebia DEPENDENCY_FAILED', async () => {
    const server = fakeServer({ [ITEM]: 0 });
    await queueEdit('op-presa', 'correção', 1);
    await queueEdit('op-outro-item', 'outro', 0, 'snap-2');

    const result = await syncPending(server.client);

    expect(result).toEqual({ synced: 2, failed: 0 });
    expect(server.values.get('snap-2')).toBe('outro');
  });

  it('sem conflito, nada muda: item novo com duas edições (base 0, 0) aplica num envio só', async () => {
    const server = fakeServer();
    await queueEdit('op-a', 'primeira', 0);
    await queueEdit('op-b', 'correção', 0);

    const result = await syncPending(server.client);

    expect(result).toEqual({ synced: 2, failed: 0 });
    expect(server.pushes).toHaveLength(1);
    expect(server.get).not.toHaveBeenCalled();
    expect(server.versions.get(ITEM)).toBe(1);
  });

  it('reenvia uma vez só: conflito de novo fica CONFLICT para a próxima sincronização', async () => {
    const server = fakeServer({ [ITEM]: 0 });
    // Outro aparelho altera o item entre a leitura da versão e o reenvio.
    server.get.mockImplementation(async () => {
      const response = { id: INSPECTION, responses: [{ id: 'srv', inspectionItemId: ITEM, version: 0 }] };
      server.versions.set(ITEM, 5);
      return response;
    });
    await queueEdit('op-presa', 'correção', 1);

    const result = await syncPending(server.client);

    expect(server.pushes).toHaveLength(2);
    expect(result).toEqual({ synced: 0, failed: 1 });
    const [entry] = await getPendingEntries();
    expect(entry?.status).toBe('CONFLICT');
  });

  it('sem conseguir ler a versão atual, deixa como CONFLICT e não reenvia', async () => {
    const server = fakeServer({ [ITEM]: 0 }, { detailFails: true });
    await queueEdit('op-presa', 'correção', 1);

    const result = await syncPending(server.client);

    expect(server.pushes).toHaveLength(1);
    expect(result).toEqual({ synced: 0, failed: 1 });
    expect(sqlite.__store.get('op-presa')?.status).toBe('CONFLICT');
  });
});
