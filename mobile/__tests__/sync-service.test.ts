import * as Network from 'expo-network';

import type { ApiClient } from '@/services/api-client';
import {
  countPendingEntries,
  getPendingEntries,
  upsertOutboxEntry,
  type OutboxRow,
} from '@/services/local-db';
import {
  getOrCreateDeviceId,
  isOnline,
  syncPending,
  syncPendingIfOnline,
} from '@/services/sync-service';

/**
 * BF-007 — outbox offline-first: toda gravação entra no outbox com synced = 0;
 * com internet, o app envia para POST /mobile/sync/push em lotes de 50; só
 * APPLIED/ALREADY_APPLIED marcam a entrada como sincronizada, o resto fica
 * pendente para a próxima tentativa.
 */

type PushBody = {
  deviceId: string;
  operations: {
    operationId: string;
    entityType: string;
    entityId: string;
    operationType: string;
    baseVersion: number | null;
    payload: unknown;
  }[];
};

const INSPECTION_A = 'insp-a';
const INSPECTION_B = 'insp-b';

function fakeClient(respond: (body: PushBody) => unknown) {
  const post = jest.fn(async (_path: string, body?: unknown) => respond(body as PushBody));
  return { client: { post } as unknown as ApiClient, post };
}

/** Responde cada operação com o mesmo status. */
const allWith = (status: string) => (body: PushBody) => ({
  results: body.operations.map((op) => ({ operationId: op.operationId, status })),
});

async function addEntry(id: string, inspectionId = INSPECTION_A, baseVersion = 0) {
  await upsertOutboxEntry({
    id,
    inspectionId,
    entityType: 'INSPECTION_RESPONSE',
    entityId: `item-${id}`,
    operationType: 'UPSERT',
    baseVersion,
    payload: JSON.stringify({ inspectionId, valueBoolean: true }),
  });
}

function outboxRow(id: string): OutboxRow {
  const SQLite = require('expo-sqlite');
  return SQLite.__store.get(id);
}

describe('BF-007 — sync-service + outbox', () => {
  it('offline: não chama a API e mantém as entradas pendentes', async () => {
    jest.mocked(Network.getNetworkStateAsync).mockResolvedValueOnce({
      isConnected: false,
      isInternetReachable: false,
    } as Network.NetworkState);
    await addEntry('op-1');
    const { client, post } = fakeClient(allWith('APPLIED'));

    const result = await syncPendingIfOnline(client);

    expect(result).toEqual({ synced: 0, failed: 0 });
    expect(post).not.toHaveBeenCalled();
    expect(await countPendingEntries()).toBe(1);
  });

  it('online: envia as operações e marca APPLIED e ALREADY_APPLIED como sincronizadas', async () => {
    await addEntry('op-1', INSPECTION_A, 3);
    await addEntry('op-2');
    const statuses: Record<string, string> = { 'op-1': 'APPLIED', 'op-2': 'ALREADY_APPLIED' };
    const { client, post } = fakeClient((body) => ({
      results: body.operations.map((op) => ({ operationId: op.operationId, status: statuses[op.operationId] })),
    }));

    const result = await syncPendingIfOnline(client);

    expect(result).toEqual({ synced: 2, failed: 0 });
    expect(post).toHaveBeenCalledTimes(1);
    const [path, body] = post.mock.calls[0] as [string, PushBody];
    expect(path).toBe('/mobile/sync/push');
    expect(body.operations[0]).toEqual({
      operationId: 'op-1',
      entityType: 'INSPECTION_RESPONSE',
      entityId: 'item-op-1',
      operationType: 'UPSERT',
      baseVersion: 3,
      payload: { inspectionId: INSPECTION_A, valueBoolean: true },
    });
    expect(await countPendingEntries()).toBe(0);
    expect(outboxRow('op-1').synced).toBe(1);
  });

  it.each(['REJECTED', 'CONFLICT', 'DEPENDENCY_FAILED'])(
    '%s: a entrada continua pendente e o contador de erro sobe',
    async (status) => {
      await addEntry('op-1');
      const { client } = fakeClient(allWith(status));

      const result = await syncPending(client);

      expect(result).toEqual({ synced: 0, failed: 1 });
      expect(outboxRow('op-1')).toMatchObject({ synced: 0, error_count: 1 });
      expect(await countPendingEntries()).toBe(1);
    },
  );

  it('falha de rede no push: nada é perdido e todas as entradas do lote contam erro', async () => {
    await addEntry('op-1');
    await addEntry('op-2');
    const { client } = fakeClient(() => {
      throw new Error('network down');
    });

    const result = await syncPending(client);

    expect(result).toEqual({ synced: 0, failed: 2 });
    expect(outboxRow('op-1')).toMatchObject({ synced: 0, error_count: 1 });
    expect(outboxRow('op-2')).toMatchObject({ synced: 0, error_count: 1 });
  });

  it('envia em lotes de 50 operações', async () => {
    for (let i = 0; i < 120; i += 1) {
      await addEntry(`op-${i}`);
    }
    const { client, post } = fakeClient(allWith('APPLIED'));

    const result = await syncPending(client);

    expect(post.mock.calls.map(([, body]) => (body as PushBody).operations.length)).toEqual([50, 50, 20]);
    expect(result).toEqual({ synced: 120, failed: 0 });
    expect(await countPendingEntries()).toBe(0);
  });

  it('um lote que falha não impede os seguintes', async () => {
    for (let i = 0; i < 60; i += 1) {
      await addEntry(`op-${i}`);
    }
    let calls = 0;
    const { client } = fakeClient((body) => {
      calls += 1;
      if (calls === 1) throw new Error('timeout');
      return allWith('APPLIED')(body);
    });

    const result = await syncPending(client);

    expect(result).toEqual({ synced: 10, failed: 50 });
    expect(await countPendingEntries()).toBe(50);
    expect(outboxRow('op-0')).toMatchObject({ synced: 0, error_count: 1 });
    expect(outboxRow('op-59')).toMatchObject({ synced: 1, error_count: 0 });
  });

  it('lote com status mistos: só as aceitas saem do outbox', async () => {
    await addEntry('op-ok');
    await addEntry('op-conflict');
    const { client } = fakeClient(() => ({
      results: [
        { operationId: 'op-ok', status: 'APPLIED' },
        { operationId: 'op-conflict', status: 'CONFLICT' },
      ],
    }));

    const result = await syncPending(client);

    expect(result).toEqual({ synced: 1, failed: 1 });
    expect(outboxRow('op-ok')).toMatchObject({ synced: 1, error_count: 0 });
    expect(outboxRow('op-conflict')).toMatchObject({ synced: 0, error_count: 1 });
  });

  it('usa o mesmo deviceId em todas as sincronizações', async () => {
    await addEntry('op-1');
    const { client, post } = fakeClient(allWith('REJECTED'));

    await syncPending(client);
    await syncPending(client);

    const ids = post.mock.calls.map(([, body]) => (body as PushBody).deviceId);
    expect(ids[0]).toBeTruthy();
    expect(ids[1]).toBe(ids[0]);
    expect(await getOrCreateDeviceId()).toBe(ids[0]);
  });

  it('com inspectionId, sincroniza só as entradas daquela inspeção', async () => {
    await addEntry('op-a', INSPECTION_A);
    await addEntry('op-b', INSPECTION_B);
    const { client, post } = fakeClient(allWith('APPLIED'));

    await syncPending(client, INSPECTION_A);

    const sent = (post.mock.calls[0]?.[1] as PushBody).operations.map((op) => op.operationId);
    expect(sent).toEqual(['op-a']);
    expect((await getPendingEntries()).map((row) => row.id)).toEqual(['op-b']);
  });

  it('sem nada pendente, não chama a API', async () => {
    const { client, post } = fakeClient(allWith('APPLIED'));

    expect(await syncPending(client)).toEqual({ synced: 0, failed: 0 });
    expect(post).not.toHaveBeenCalled();
  });

  describe('SYNC-RESILIENCE — RN-070: isolamento de falhas por entrada', () => {
    it('entrada com payload corrompido incrementa error_count e não bloqueia entradas válidas', async () => {
      await upsertOutboxEntry({
        id: 'op-corrupt',
        inspectionId: INSPECTION_A,
        entityType: 'INSPECTION_RESPONSE',
        entityId: 'item-op-corrupt',
        operationType: 'UPSERT',
        baseVersion: 0,
        payload: '{not valid json',
      });
      await addEntry('op-valid-1');
      await addEntry('op-valid-2');
      const { client } = fakeClient(allWith('APPLIED'));

      const result = await syncPending(client);

      expect(outboxRow('op-corrupt')).toMatchObject({ synced: 0, error_count: 1 });
      expect(outboxRow('op-valid-1')).toMatchObject({ synced: 1, error_count: 0 });
      expect(outboxRow('op-valid-2')).toMatchObject({ synced: 1, error_count: 0 });
      expect(result).toEqual({ synced: 2, failed: 1 });
    });

    it('resposta do servidor sem campo results trata o lote todo como falha', async () => {
      await addEntry('op-a');
      await addEntry('op-b');
      const { client } = fakeClient(() => ({}));

      const result = await syncPending(client);

      expect(outboxRow('op-a')).toMatchObject({ synced: 0, error_count: 1 });
      expect(outboxRow('op-b')).toMatchObject({ synced: 0, error_count: 1 });
      expect(result).toEqual({ synced: 0, failed: 2 });
    });

    it('operação omitida pelo servidor incrementa error_count e conta como falha', async () => {
      await addEntry('op-present');
      await addEntry('op-missing');
      const { client } = fakeClient(() => ({
        results: [{ operationId: 'op-present', status: 'APPLIED' }],
      }));

      const result = await syncPending(client);

      expect(outboxRow('op-present')).toMatchObject({ synced: 1, error_count: 0 });
      expect(outboxRow('op-missing')).toMatchObject({ synced: 0, error_count: 1 });
      expect(result).toEqual({ synced: 1, failed: 1 });
    });
  });

  describe('isOnline', () => {
    it('só considera online quando a internet está alcançável', async () => {
      jest.mocked(Network.getNetworkStateAsync).mockResolvedValueOnce({
        isConnected: true,
        isInternetReachable: null,
      } as unknown as Network.NetworkState);
      expect(await isOnline()).toBe(false);

      jest.mocked(Network.getNetworkStateAsync).mockResolvedValueOnce({
        isConnected: true,
        isInternetReachable: true,
      } as Network.NetworkState);
      expect(await isOnline()).toBe(true);
    });

    it('trata erro ao consultar a rede como offline', async () => {
      jest.mocked(Network.getNetworkStateAsync).mockRejectedValueOnce(new Error('native module missing'));
      expect(await isOnline()).toBe(false);
    });
  });
});
