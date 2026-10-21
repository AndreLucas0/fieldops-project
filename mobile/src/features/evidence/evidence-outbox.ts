/**
 * Evidência offline-first (SYNC-OUTBOX-EVIDENCE).
 *
 * Capturar evidência é operação offline (`contrato-backend-frontend.md` §10.8,
 * §11.3): a foto é copiada do cache — que o sistema pode limpar — para o
 * diretório de documentos do app e entra no outbox SQLite. O upload multipart
 * acontece na sincronização, com a mesma `idempotencyKey`, e o arquivo local só
 * é apagado depois que o servidor confirma (RN-047).
 */

import { randomUUID } from 'expo-crypto';
import { Directory, File, Paths } from 'expo-file-system';
import { Platform } from 'react-native';

import { ApiError, type GeoLocation } from '@/models';
import type { ApiClient } from '@/services/api-client';
import {
  markEntriesSynced,
  markEntryFailed,
  upsertOutboxEntry,
  type OutboxRow,
} from '@/services/local-db';

import { describeFile, uploadEvidence, type EvidenceUploadInput } from './evidence-upload';

export const EVIDENCE_ENTITY_TYPE = 'EVIDENCE';

const PENDING_DIRECTORY = 'evidence-pending';

/** Resposta do backend para `idempotencyKey` repetida (`EvidenceService`). */
const EVIDENCE_ALREADY_PROCESSED = 'EVIDENCE_ALREADY_PROCESSED';

/** O que o outbox guarda para refazer o upload depois. */
interface QueuedEvidence {
  localUri: string;
  idempotencyKey: string;
  capturedAtDevice: string;
  description?: string;
  responseId?: string;
  nonConformityId?: string;
  location?: GeoLocation;
}

/**
 * Copia a foto para armazenamento permanente e a enfileira. Devolve o id da
 * entrada, que também é a `idempotencyKey` do upload.
 */
export async function queueEvidence(input: EvidenceUploadInput): Promise<string> {
  const idempotencyKey = input.idempotencyKey ?? randomUUID();
  const localUri = keepFile(input.fileUri, idempotencyKey);

  const queued: QueuedEvidence = {
    localUri,
    idempotencyKey,
    capturedAtDevice: input.capturedAtDevice ?? new Date().toISOString(),
  };
  if (input.description?.trim()) queued.description = input.description.trim();
  if (input.responseId) queued.responseId = input.responseId;
  if (input.nonConformityId) queued.nonConformityId = input.nonConformityId;
  if (input.location) queued.location = input.location;

  await upsertOutboxEntry({
    id: idempotencyKey,
    inspectionId: input.inspectionId,
    entityType: EVIDENCE_ENTITY_TYPE,
    entityId: idempotencyKey,
    operationType: 'CREATE',
    baseVersion: 0,
    payload: JSON.stringify(queued),
  });

  return idempotencyKey;
}

/**
 * Envia as evidências enfileiradas, uma a uma. Sucesso marca a entrada como
 * sincronizada e apaga a cópia local; qualquer falha deixa a entrada pendente
 * (status FAILED) e o arquivo no aparelho, para a próxima tentativa.
 */
export async function syncEvidenceEntries(
  client: ApiClient,
  rows: OutboxRow[],
): Promise<{ synced: number; failed: number }> {
  let synced = 0;
  let failed = 0;

  for (const row of rows) {
    let queued: QueuedEvidence;
    try {
      queued = JSON.parse(row.payload) as QueuedEvidence;
    } catch {
      await markEntryFailed(row.id, 'FAILED', 'Dados da evidência ilegíveis.');
      failed += 1;
      continue;
    }

    try {
      await uploadEvidence(
        {
          inspectionId: row.inspection_id,
          fileUri: queued.localUri,
          idempotencyKey: queued.idempotencyKey,
          capturedAtDevice: queued.capturedAtDevice,
          description: queued.description ?? null,
          responseId: queued.responseId ?? null,
          nonConformityId: queued.nonConformityId ?? null,
          location: queued.location ?? null,
        },
        client,
      );
    } catch (error) {
      // O servidor já tem esta evidência: um envio anterior chegou, mas a
      // resposta se perdeu. Para o outbox, isso é sucesso (RN-068).
      const alreadyProcessed =
        error instanceof ApiError && error.code === EVIDENCE_ALREADY_PROCESSED;
      if (!alreadyProcessed) {
        await markEntryFailed(row.id, 'FAILED', error instanceof Error ? error.message : undefined);
        failed += 1;
        continue;
      }
    }

    await markEntriesSynced([row.id]);
    discardFile(queued.localUri);
    synced += 1;
  }

  return { synced, failed };
}

/**
 * No aparelho, copia para o diretório de documentos. Na prévia web (só
 * desenvolvimento) a URI é `blob:` e não há sistema de arquivos: usa a original.
 */
function keepFile(sourceUri: string, idempotencyKey: string): string {
  if (Platform.OS === 'web') return sourceUri;

  const directory = new Directory(Paths.document, PENDING_DIRECTORY);
  directory.create({ idempotent: true, intermediates: true });

  const extension = describeFile(sourceUri).name.endsWith('.png') ? 'png' : 'jpg';
  const destination = new File(directory, `${idempotencyKey}.${extension}`);
  new File(sourceUri).copy(destination);
  return destination.uri;
}

function discardFile(uri: string): void {
  if (Platform.OS === 'web') return;
  try {
    const file = new File(uri);
    if (file.exists) file.delete();
  } catch {
    // Arquivo já removido: nada a fazer — o registro no servidor é o que importa.
  }
}
