/**
 * Transições da inspeção offline-first (SYNC-OUTBOX-INSPECTION).
 *
 * Iniciar e concluir gravam primeiro no outbox (`contrato-backend-frontend.md`
 * §11.3; `telas-frontend.md` FE-M07: "offline → grava local, marca 'aguardando
 * sincronização', navega igual"). O backend aplica `entityType: INSPECTION` no
 * `POST /mobile/sync/push` com `payload.status` IN_PROGRESS ou SUBMITTED.
 */

import { randomUUID } from 'expo-crypto';

import type { GeoLocation } from '@/models';
import type { ApiClient } from '@/services/api-client';
import { deleteOutboxEntry, getPendingEntries, upsertOutboxEntry } from '@/services/local-db';
import { syncPendingIfOnline } from '@/services/sync-service';

export const INSPECTION_ENTITY_TYPE = 'INSPECTION';

export type InspectionTransition =
  | { status: 'IN_PROGRESS'; startedAtDevice: string; location?: GeoLocation | null }
  | { status: 'SUBMITTED'; completedAtDevice: string; location?: GeoLocation | null };

/** Resultado da tentativa imediata de envio, depois de gravar no outbox. */
export type QueuedOutcome =
  | { state: 'synced' }
  /** Sem rede ou falha transitória: fica no outbox para a próxima sincronização. */
  | { state: 'pending' }
  /** O servidor recusou de vez; a operação já foi retirada do outbox. */
  | { state: 'rejected'; message: string };

/** Grava a transição no outbox e devolve o id da operação. */
export async function queueInspectionTransition(
  inspectionId: string,
  transition: InspectionTransition,
): Promise<string> {
  const id = randomUUID();
  const payload: Record<string, unknown> = { ...transition };
  if (!transition.location) delete payload.location;

  await upsertOutboxEntry({
    id,
    inspectionId,
    entityType: INSPECTION_ENTITY_TYPE,
    entityId: inspectionId,
    operationType: 'UPSERT',
    baseVersion: 0,
    payload: JSON.stringify(payload),
  });
  return id;
}

/**
 * Tenta sincronizar a inspeção agora e diz o que aconteceu com a operação.
 * Recusa do servidor (FAILED/CONFLICT com mensagem) é definitiva: reenviar a
 * mesma transição não mudaria a resposta, então a entrada sai do outbox e a
 * tela mostra o motivo. Falha sem mensagem é rede: a entrada fica pendente.
 */
export async function settleQueuedOperation(
  client: ApiClient,
  inspectionId: string,
  operationId: string,
): Promise<QueuedOutcome> {
  await syncPendingIfOnline(client, inspectionId).catch(() => undefined);

  const entry = (await getPendingEntries(inspectionId)).find((row) => row.id === operationId);
  if (!entry) return { state: 'synced' };

  const rejectedByServer =
    (entry.status === 'FAILED' || entry.status === 'CONFLICT') && entry.last_error !== null;
  if (rejectedByServer) {
    await deleteOutboxEntry(operationId);
    return { state: 'rejected', message: entry.last_error ?? 'O servidor recusou a operação.' };
  }

  return { state: 'pending' };
}
