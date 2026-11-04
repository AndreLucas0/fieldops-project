import { randomUUID } from 'expo-crypto';
import * as Network from 'expo-network';
import * as SecureStore from 'expo-secure-store';

import {
  discardEvidenceFile,
  EVIDENCE_ENTITY_TYPE,
  syncEvidenceEntries,
} from '@/features/evidence/evidence-outbox';
import { ApiError, type InspectionDetail } from '@/models';

import type { ApiClient } from './api-client';
import {
  deleteOutboxEntry,
  getPendingEntries,
  markEntryFailed,
  markEntriesSynced,
  rebaseOutboxEntry,
  saveSyncMetadata,
  type OutboxRow,
} from './local-db';
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

/** Conclusão da inspeção: o backend exige as evidências já no servidor para aceitá-la. */
function isSubmission(row: OutboxRow): boolean {
  if (row.entity_type !== 'INSPECTION') return false;
  try {
    return (JSON.parse(row.payload) as { status?: unknown }).status === 'SUBMITTED';
  } catch {
    return false;
  }
}

/**
 * Ordem do envio: (1) push JSON de tudo menos as conclusões; (2) upload das
 * evidências, que precisam da resposta ou NC já no servidor; (3) push das
 * conclusões — a de uma inspeção com foto ainda no aparelho espera a próxima
 * sincronização (o servidor a recusaria por falta de evidência).
 */
export async function syncPending(client: ApiClient, inspectionId?: string): Promise<SyncResult> {
  const entries = await getPendingEntries(inspectionId);
  if (entries.length === 0) return { synced: 0, failed: 0 };

  const evidence = entries.filter((row) => row.entity_type === EVIDENCE_ENTITY_TYPE);
  const json = entries.filter((row) => row.entity_type !== EVIDENCE_ENTITY_TYPE);
  const submissions = json.filter(isSubmission);
  const others = json.filter((row) => !isSubmission(row));

  let pushed = await pushEntries(client, others);
  // Resposta em CONFLICT trava o resto da inspeção (o servidor devolve
  // DEPENDENCY_FAILED). Refaz a base sobre a versão atual e reenvia uma vez.
  if (pushed.conflicts.length > 0 && (await rebaseConflicts(client, pushed.conflicts))) {
    const retry = (await getPendingEntries(inspectionId)).filter(
      (row) => row.entity_type !== EVIDENCE_ENTITY_TYPE && !isSubmission(row),
    );
    const again = await pushEntries(client, retry);
    // Tudo que ficou pendente foi reenviado; só as recusas do 1º envio continuam contando.
    pushed = { ...again, synced: pushed.synced + again.synced, failed: pushed.rejected + again.failed };
  }
  const uploaded = await syncEvidenceEntries(client, evidence);

  const evidenceLeft = new Set(
    (await getPendingEntries(inspectionId))
      .filter((row) => row.entity_type === EVIDENCE_ENTITY_TYPE)
      .map((row) => row.inspection_id),
  );
  const submitted = await pushEntries(
    client,
    submissions.filter((row) => !evidenceLeft.has(row.inspection_id)),
  );

  const synced = pushed.synced + uploaded.synced + submitted.synced;
  const failed = pushed.failed + uploaded.failed + submitted.failed;

  if (synced > 0) {
    await saveSyncMetadata('last_successful_sync', new Date().toISOString());
  }

  return { synced, failed };
}

/**
 * Remove do aparelho uma operação recusada — na aba Sincronização, por decisão
 * do técnico. Evidência leva junto a foto guardada.
 */
export async function discardOutboxEntry(row: OutboxRow): Promise<void> {
  if (row.entity_type === EVIDENCE_ENTITY_TYPE) discardEvidenceFile(row);
  await deleteOutboxEntry(row.id);
}

interface PushOutcome extends SyncResult {
  /** Recusas definitivas (REJECTED): não voltam a ser enviadas. */
  rejected: number;
  /** Respostas do checklist que voltaram CONFLICT. */
  conflicts: OutboxRow[];
}

async function pushEntries(client: ApiClient, pending: OutboxRow[]): Promise<PushOutcome> {
  let synced = 0;
  let failed = 0;
  let rejected = 0;
  const conflicts: OutboxRow[] = [];
  if (pending.length === 0) return { synced, failed, rejected, conflicts };
  const rowsById = new Map(pending.map((row) => [row.id, row]));

  const deviceId = await getOrCreateDeviceId();

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
    } catch (error) {
      // O lote inteiro falhou antes de qualquer operação ser processada: o
      // motivo vai para cada entrada, visível em "Detalhes de sincronização".
      const reason = describePushFailure(error);
      for (const op of operations) {
        await markEntryFailed(op.operationId, 'FAILED', reason);
      }
      failed += operations.length;
      continue;
    }

    if (!Array.isArray(response.results)) {
      for (const op of operations) {
        await markEntryFailed(op.operationId, 'FAILED', 'Resposta inesperada do servidor ao envio.');
      }
      failed += operations.length;
      continue;
    }

    const syncedIds: string[] = [];
    for (const result of response.results) {
      if (ACCEPTED_STATUSES.has(result.status)) {
        syncedIds.push(result.operationId);
      } else {
        const failStatus = failureStatus(result.status);
        await markEntryFailed(result.operationId, failStatus, result.error?.message ?? undefined);
        failed += 1;
        if (failStatus === 'REJECTED') rejected += 1;
        const row = rowsById.get(result.operationId);
        if (failStatus === 'CONFLICT' && row?.entity_type === 'INSPECTION_RESPONSE') {
          conflicts.push(row);
        }
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

  return { synced, failed, rejected, conflicts };
}

/**
 * Política de conflito das respostas (decisão do dono, 2026-10-21): a última
 * edição do técnico vale. Lê a versão atual de cada item em conflito e refaz,
 * em ordem, a base de todas as edições pendentes dele — criar deixa a resposta
 * na versão 0 e cada atualização soma 1. Inspeção aprovada continua recusando
 * a edição no servidor (RN-076). Devolve `true` se refez alguma.
 */
async function rebaseConflicts(client: ApiClient, conflicts: OutboxRow[]): Promise<boolean> {
  let rebased = false;
  const byInspection = new Map<string, Set<string>>();
  for (const row of conflicts) {
    const items = byInspection.get(row.inspection_id) ?? new Set<string>();
    items.add(row.entity_id);
    byInspection.set(row.inspection_id, items);
  }

  for (const [inspectionId, items] of byInspection) {
    let detail: InspectionDetail;
    try {
      detail = await client.get<InspectionDetail>(`/mobile/inspections/${inspectionId}`);
    } catch {
      continue; // Sem a versão atual não há como refazer: fica CONFLICT para a próxima.
    }
    const pending = await getPendingEntries(inspectionId);

    for (const itemId of items) {
      let version = detail.responses?.find((r) => r.inspectionItemId === itemId)?.version;
      const edits = pending.filter(
        (row) => row.entity_type === 'INSPECTION_RESPONSE' && row.entity_id === itemId,
      );
      for (const edit of edits) {
        await rebaseOutboxEntry(edit.id, randomUUID(), version ?? 0);
        version = version === undefined ? 0 : version + 1;
        rebased = true;
      }
    }
  }

  return rebased;
}

/** Status HTTP, código e mensagem (com os campos inválidos) — o que diagnostica o envio. */
function describePushFailure(error: unknown): string {
  if (error instanceof ApiError && error.status > 0) {
    const fields = (error.fieldErrors ?? []).map((field) => `${field.field}: ${field.message}`);
    const detail = fields.length > 0 ? ` — ${fields.join('; ')}` : '';
    return `Envio recusado (HTTP ${error.status} ${error.code}): ${error.message}${detail}`;
  }
  return `Falha no envio: ${error instanceof Error ? error.message : String(error)}`;
}

/**
 * REJECTED é definitivo: a entrada sai da fila e espera o técnico descartá-la.
 * DEPENDENCY_FAILED depende de outra operação e pode passar no próximo envio.
 */
function failureStatus(status: SyncOperationResult['status']): 'FAILED' | 'CONFLICT' | 'REJECTED' {
  if (status === 'REJECTED') return 'REJECTED';
  if (status === 'CONFLICT') return 'CONFLICT';
  return 'FAILED';
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
