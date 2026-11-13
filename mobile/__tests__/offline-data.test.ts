import { ApiError, CLIENT_ERROR_CODES } from '@/models';
import type { ApiClient, RequestOptions } from '@/services/api-client';
import { getSyncMetadata, saveSyncMetadata } from '@/services/local-db';
import { cachedGet } from '@/services/offline-cache';
import { OFFLINE_LIST_QUERY, refreshOfflineData } from '@/services/offline-data';

/**
 * SYNC-PULL — "sincronizar suas inspeções" (aplicativo-mobile.md §13.12): com
 * rede, o app baixa as inspeções do técnico para abrir offline. Na primeira vez
 * baixa tudo; depois, `GET /mobile/sync/pull?cursor=` diz o que mudou no
 * servidor (ex.: supervisor rejeitou) e só isso é baixado de novo.
 */

const offline = ApiError.client(CLIENT_ERROR_CODES.NETWORK_UNAVAILABLE, 'Sem conexão.');

function inspection(id: string) {
  return { id, clientId: `c-${id}`, siteId: `s-${id}`, equipmentId: `e-${id}`, status: 'ASSIGNED' };
}

function fakeServer(pull: { changes: unknown[]; nextCursor: string }) {
  const get = jest.fn(async (path: string, _options?: RequestOptions) => {
    if (path === '/mobile/sync/pull') return { ...pull, serverTime: '2026-10-20T12:00:00Z' };
    if (path === '/mobile/inspections') {
      return { content: [inspection('insp-1'), inspection('insp-2')], page: {} };
    }
    const detail = /^\/mobile\/inspections\/(.+)$/.exec(path);
    if (detail) return { ...inspection(detail[1] ?? ''), items: [], responses: [] };
    return { id: path.split('/').pop(), name: `Nome ${path}` };
  });
  return { client: { get } as unknown as ApiClient, get };
}

const semRede = { get: jest.fn(async () => Promise.reject(offline)) } as unknown as ApiClient;

describe('refreshOfflineData', () => {
  it('primeira vez: baixa lista, detalhes e nomes para uso offline e guarda o cursor', async () => {
    const { client } = fakeServer({ changes: [], nextCursor: 'cursor-1' });

    await refreshOfflineData(client);

    expect(await getSyncMetadata('last_pull_cursor')).toBe('cursor-1');
    expect(
      await cachedGet(semRede, '/mobile/inspections', { query: OFFLINE_LIST_QUERY }),
    ).toMatchObject({ content: [{ id: 'insp-1' }, { id: 'insp-2' }] });
    expect(await cachedGet(semRede, '/mobile/inspections/insp-2')).toMatchObject({ id: 'insp-2' });
    expect(await cachedGet(semRede, '/clients/c-insp-1')).toMatchObject({ id: 'c-insp-1' });
    expect(await cachedGet(semRede, '/sites/s-insp-2')).toMatchObject({ id: 's-insp-2' });
    expect(await cachedGet(semRede, '/equipment/e-insp-1')).toMatchObject({ id: 'e-insp-1' });
  });

  it('com cursor: pede o pull e baixa de novo só as inspeções que mudaram', async () => {
    await saveSyncMetadata('last_pull_cursor', 'cursor-1');
    const { client, get } = fakeServer({
      changes: [
        { entityType: 'INSPECTION', entityId: 'insp-2', operationType: 'UPSERT', payload: {} },
        {
          entityType: 'NON_CONFORMITY',
          entityId: 'nc-9',
          operationType: 'UPSERT',
          payload: { inspectionId: 'insp-2' },
        },
      ],
      nextCursor: 'cursor-2',
    });

    await refreshOfflineData(client);

    expect(get).toHaveBeenCalledWith('/mobile/sync/pull', { query: { cursor: 'cursor-1' } });
    const caminhos = get.mock.calls.map(([path]) => path);
    expect(caminhos).toContain('/mobile/inspections/insp-2');
    expect(caminhos).not.toContain('/mobile/inspections/insp-1');
    expect(caminhos.filter((path) => path === '/mobile/inspections/insp-2')).toHaveLength(1);
    expect(await getSyncMetadata('last_pull_cursor')).toBe('cursor-2');
  });

  it('com cursor e nada mudou: não baixa detalhes e avança o cursor', async () => {
    await saveSyncMetadata('last_pull_cursor', 'cursor-1');
    const { client, get } = fakeServer({ changes: [], nextCursor: 'cursor-2' });

    await refreshOfflineData(client);

    const caminhos = get.mock.calls.map(([path]) => path);
    expect(caminhos.some((path) => path.startsWith('/mobile/inspections/'))).toBe(false);
    expect(await getSyncMetadata('last_pull_cursor')).toBe('cursor-2');
  });

  it('sem rede: não lança e mantém o cursor', async () => {
    await saveSyncMetadata('last_pull_cursor', 'cursor-1');

    await expect(refreshOfflineData(semRede)).resolves.toBeUndefined();
    expect(await getSyncMetadata('last_pull_cursor')).toBe('cursor-1');
  });
});
