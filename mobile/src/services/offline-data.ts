/**
 * Download das inspeções para uso offline (SYNC-PULL).
 *
 * "Sincronizar suas inspeções" e "abrir uma inspeção offline" são o mínimo do
 * MVP (`aplicativo-mobile.md` §13.12). Na primeira sincronização tudo é baixado;
 * depois, `GET /mobile/sync/pull?cursor=` informa o que mudou no servidor (ex.:
 * supervisor aprovou ou rejeitou) e só essas inspeções são baixadas de novo.
 * Tudo vai para `read_cache` pelo `cachedGet`, as mesmas chaves que as telas leem.
 */

import type { Inspection, Page } from '@/models';

import type { ApiClient } from './api-client';
import { getSyncMetadata, saveSyncMetadata } from './local-db';
import { cachedGet } from './offline-cache';

/** A consulta da lista de campo (`useInspections`): precisa ser a mesma da tela. */
export const OFFLINE_LIST_QUERY = { page: 0, size: 100 } as const;

const PULL_CURSOR_KEY = 'last_pull_cursor';

interface SyncChange {
  entityType: string;
  entityId: string;
  payload?: Record<string, unknown> | null;
}

interface SyncPullResponse {
  changes?: SyncChange[];
  nextCursor?: string | null;
}

/**
 * Melhor esforço: sem rede ou com falha no meio, nada é lançado e o cursor não
 * avança — a próxima sincronização pede as mesmas mudanças de novo.
 */
export async function refreshOfflineData(client: ApiClient): Promise<void> {
  try {
    const cursor = await getSyncMetadata(PULL_CURSOR_KEY);
    const pull = await client.get<SyncPullResponse>(
      '/mobile/sync/pull',
      cursor ? { query: { cursor } } : {},
    );

    let inspectionIds: string[];
    if (!cursor) {
      const page = await cachedGet<Page<Inspection>>(client, '/mobile/inspections', {
        query: OFFLINE_LIST_QUERY,
      });
      inspectionIds = (page.content ?? []).map((inspection) => inspection.id);
    } else {
      inspectionIds = changedInspectionIds(pull.changes ?? []);
      if (inspectionIds.length > 0) {
        await cachedGet(client, '/mobile/inspections', { query: OFFLINE_LIST_QUERY });
      }
    }

    for (const id of inspectionIds) {
      await cacheInspection(client, id);
    }

    if (pull.nextCursor) await saveSyncMetadata(PULL_CURSOR_KEY, pull.nextCursor);
  } catch {
    // Sem rede ou servidor indisponível: as cópias anteriores continuam valendo.
  }
}

function changedInspectionIds(changes: SyncChange[]): string[] {
  const ids = new Set<string>();
  for (const change of changes) {
    if (change.entityType === 'INSPECTION') {
      ids.add(change.entityId);
      continue;
    }
    const inspectionId = change.payload?.inspectionId;
    if (typeof inspectionId === 'string') ids.add(inspectionId);
  }
  return [...ids];
}

interface PlaceRefs {
  clientId: string;
  siteId: string;
  equipmentId?: string | null;
}

/** Detalhe obrigatório; nomes são acessórios e falham sem interromper. */
async function cacheInspection(client: ApiClient, id: string): Promise<void> {
  const detail = await cachedGet<PlaceRefs>(client, `/mobile/inspections/${id}`);

  const places = [`/clients/${detail.clientId}`, `/sites/${detail.siteId}`];
  if (detail.equipmentId) places.push(`/equipment/${detail.equipmentId}`);

  await Promise.all(places.map((path) => cachedGet(client, path).catch(() => undefined)));
}
