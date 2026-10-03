import { randomUUID } from 'expo-crypto';
import * as Network from 'expo-network';
import * as SecureStore from 'expo-secure-store';

import type { ApiClient } from './api-client';
import { getPendingEntries, incrementErrorCount, markEntriesSynced } from './local-db';

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
}

interface SyncPushResponse {
  results: SyncOperationResult[];
}

const ACCEPTED_STATUSES = new Set(['APPLIED', 'ALREADY_APPLIED']);

export async function syncPending(client: ApiClient, inspectionId?: string): Promise<SyncResult> {
  const pending = await getPendingEntries(inspectionId);
  if (pending.length === 0) return { synced: 0, failed: 0 };

  const deviceId = await getOrCreateDeviceId();
  let synced = 0;
  let failed = 0;

  for (let offset = 0; offset < pending.length; offset += SYNC_BATCH_SIZE) {
    const batch = pending.slice(offset, offset + SYNC_BATCH_SIZE);

    const operations: SyncOperationRequest[] = [];
    for (const row of batch) {
      let parsed: Record<string, unknown>;
      try {
        parsed = JSON.parse(row.payload) as Record<string, unknown>;
      } catch {
        await incrementErrorCount(row.id);
        failed += 1;
        continue;
      }
      operations.push({
        operationId: row.id,
        entityType: row.entity_type,
        entityId: row.entity_id,
        operationType: row.operation_type,
        baseVersion: row.base_version ?? null,
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
        await incrementErrorCount(op.operationId);
      }
      failed += operations.length;
      continue;
    }

    if (!Array.isArray(response.results)) {
      for (const op of operations) {
        await incrementErrorCount(op.operationId);
      }
      failed += operations.length;
      continue;
    }

    const syncedIds: string[] = [];
    for (const result of response.results) {
      if (ACCEPTED_STATUSES.has(result.status)) {
        syncedIds.push(result.operationId);
      } else {
        await incrementErrorCount(result.operationId);
        failed += 1;
      }
    }

    const respondedIds = new Set(response.results.map((r) => r.operationId));
    for (const op of operations) {
      if (!respondedIds.has(op.operationId)) {
        await incrementErrorCount(op.operationId);
        failed += 1;
      }
    }

    if (syncedIds.length > 0) {
      await markEntriesSynced(syncedIds);
      synced += syncedIds.length;
    }
  }

  return { synced, failed };
}

export async function syncPendingIfOnline(
  client: ApiClient,
  inspectionId?: string,
): Promise<SyncResult> {
  const online = await isOnline();
  if (!online) return { synced: 0, failed: 0 };
  return syncPending(client, inspectionId);
}
