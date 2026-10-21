import { randomUUID } from 'expo-crypto';
import * as Network from 'expo-network';
import * as SecureStore from 'expo-secure-store';

import { EVIDENCE_ENTITY_TYPE, syncEvidenceEntries } from '@/features/evidence/evidence-outbox';

import type { ApiClient } from './api-client';
import { getPendingEntries, markEntryFailed, markEntriesSynced, saveSyncMetadata } from './local-db';
import { refreshOfflineData } from './offline-data';

const DEVICE_ID_KEY = 'fieldops_device_id';
const SYNC_BATCH_SIZE = 50;

export interface SyncResult {
  synced: number;
  failed: number;
}

export async function isOnline(): Promise<boolean> {
  try {
    const state = await Network.getNetworkStateAsync();
    return state.isInternetReachable === true;
  } catch {
    return false;
  }
}

export async function getOrCreateDeviceId(): Promise<string> {
  const existing = await SecureStore.getItemAsync(DEVICE_ID_KEY);
  if (existing) return existing;
  const id = randomUUID();
  await SecureStore.setItemAsync(DEVICE_ID_KEY, id);
  return id;
}

interface SyncOperationRequest {
  operationId: string;
  entityType: string;
  entityId: string;
  operationType: string;
  baseVersion: number | null;
  payload: Record<string, unknown>;
}

interface SyncOperationResult {
  operationId: string;
  status: 'APPLIED' | 'ALREADY_APPLIED' | 'REJECTED' | 'CONFLICT' | 'DEPENDENCY_FAILED';
  error?: { code?: string; message?: string } | null;
}

/**
 * Tipos enviados sem controle de versão. Transições de inspeção (iniciar/
 * concluir): o servidor já as valida pela máquina de estados, e iniciar e
 * concluir offline em sequência mudaria a versão entre uma operação e outra.
 * Não conformidade: criada com id do aparelho, sem versão conhecida até o
 * servidor aplicar; a edição (PEND-06, fora do MVP) fica com a última gravação.
 */
const VERSIONLESS_ENTITY_TYPES = new Set(['INSPECTION', 'NON_CONFORMITY']);

interface SyncPushResponse {
  results: SyncOperationResult[];
}

const ACCEPTED_STATUSES = new Set(['APPLIED', 'ALREADY_APPLIED']);

export async function syncPending(client: ApiClient, inspectionId?: string): Promise<SyncResult> {
  const entries = await getPendingEntries(inspectionId);
  if (entries.length === 0) return { synced: 0, failed: 0 };

  // Evidências sobem por upload multipart, não pelo push JSON — e depois dele,
  // para que a resposta ou NC a que a foto se vincula já exista no servidor.
  const pending = entries.filter((row) => row.entity_type !== EVIDENCE_ENTITY_TYPE);
  const evidence = entries.filter((row) => row.entity_type === EVIDENCE_ENTITY_TYPE);

  let synced = 0;
  let failed = 0;

  const deviceId = pending.length > 0 ? await getOrCreateDeviceId() : '';

  for (let offset = 0; offset < pending.length; offset += SYNC_BATCH_SIZE) {
    const batch = pending.slice(offset, offset + SYNC_BATCH_SIZE);

    const operations: SyncOperationRequest[] = [];
    for (const row of batch) {
      let parsed: Record<string, unknown>;
      try {
        parsed = JSON.parse(row.payload) as Record<string, unknown>;
      } catch {
        await markEntryFailed(row.id, 'FAILED');
        failed += 1;
        continue;
      }
      operations.push({
        operationId: row.id,
        entityType: row.entity_type,
        entityId: row.entity_id,
        operationType: row.operation_type,
        baseVersion: VERSIONLESS_ENTITY_TYPES.has(row.entity_type)
          ? null
          : (row.base_version ?? null),
        payload: parsed,
      });
    }

    if (operations.length === 0) continue;

    let response: SyncPushResponse;
    try {
      response = await client.post<SyncPushResponse>('/mobile/sync/push', {
        deviceId,
        lastPullCursor: null,
        operations,
      });
    } catch {
      for (const op of operations) {
        await markEntryFailed(op.operationId, 'FAILED');
      }
      failed += operations.length;
      continue;
    }

    if (!Array.isArray(response.results)) {
      for (const op of operations) {
        await markEntryFailed(op.operationId, 'FAILED');
      }
      failed += operations.length;
      continue;
    }

    const syncedIds: string[] = [];
    for (const result of response.results) {
      if (ACCEPTED_STATUSES.has(result.status)) {
        syncedIds.push(result.operationId);
      } else {
        const failStatus = result.status === 'CONFLICT' ? 'CONFLICT' : 'FAILED';
        await markEntryFailed(result.operationId, failStatus, result.error?.message ?? undefined);
        failed += 1;
      }
    }

    const respondedIds = new Set(response.results.map((r) => r.operationId));
    for (const op of operations) {
      if (!respondedIds.has(op.operationId)) {
        await markEntryFailed(op.operationId, 'FAILED');
        failed += 1;
      }
    }

    if (syncedIds.length > 0) {
      await markEntriesSynced(syncedIds);
      synced += syncedIds.length;
    }
  }

  const uploaded = await syncEvidenceEntries(client, evidence);
  synced += uploaded.synced;
  failed += uploaded.failed;

  if (synced > 0) {
    await saveSyncMetadata('last_successful_sync', new Date().toISOString());
  }

  return { synced, failed };
}

export async function syncPendingIfOnline(
  client: ApiClient,
  inspectionId?: string,
): Promise<SyncResult> {
  const online = await isOnline();
  if (!online) return { synced: 0, failed: 0 };
  const result = await syncPending(client, inspectionId);

  // Sincronização geral (primeiro plano, reconexão, aba Sincronização): depois
  // de enviar, baixa o que mudou para abrir offline. Com `inspectionId` (cada
  // resposta do checklist), só envia — o download não precisa rodar a cada toque.
  if (!inspectionId) await refreshOfflineData(client);

  return result;
}
