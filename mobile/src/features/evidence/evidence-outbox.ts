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

import { isLocalResponseId } from '@/features/inspections/pending-overlay';
import { ApiError, type GeoLocation, type InspectionDetail } from '@/models';
import type { ApiClient } from '@/services/api-client';
import {
  getPendingEntries,
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

/** Status 4xx que podem passar sozinhos: sessão a renovar, timeout, excesso de chamadas. */
const TRANSIENT_CLIENT_STATUSES = new Set([401, 408, 429]);

/** O que o outbox guarda para refazer o upload depois. */
interface QueuedEvidence {
  localUri: string;
  idempotencyKey: string;
  capturedAtDevice: string;
  description?: string;
  /** Id da resposta no servidor, quando já conhecido na captura. */
  responseId?: string;
  /**
   * SnapshotId do item do checklist. A resposta pode ainda estar no outbox,
   * sem id no servidor; o vínculo é resolvido na sincronização.
   */
  inspectionItemId?: string;
  nonConformityId?: string;
  location?: GeoLocation;
}

export interface QueueEvidenceInput extends EvidenceUploadInput {
  inspectionItemId?: string | null;
}

/**
 * Copia a foto para armazenamento permanente e a enfileira. Devolve o id da
 * entrada, que também é a `idempotencyKey` do upload.
 */
export async function queueEvidence(input: QueueEvidenceInput): Promise<string> {
  const idempotencyKey = input.idempotencyKey ?? randomUUID();
  const localUri = keepFile(input.fileUri, idempotencyKey);

  const queued: QueuedEvidence = {
    localUri,
    idempotencyKey,
    capturedAtDevice: input.capturedAtDevice ?? new Date().toISOString(),
  };
  if (input.description?.trim()) queued.description = input.description.trim();
  // `local-…` é o id que a tela dá a uma resposta ainda no outbox: o servidor
  // não o conhece, então o vínculo fica pelo item.
  if (input.responseId && !isLocalResponseId(input.responseId)) {
    queued.responseId = input.responseId;
  }
  if (input.inspectionItemId) queued.inspectionItemId = input.inspectionItemId;
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
 * Envia as evidências enfileiradas, uma a uma — depois do push JSON, para que a
 * resposta ou NC a que a foto se vincula já exista no servidor.
 *
 * Sucesso marca a entrada como sincronizada e apaga a cópia local. Falha
 * transitória (rede, sessão, 5xx) ou vínculo ainda não sincronizado deixa a
 * entrada FAILED para a próxima tentativa; recusa definitiva (4xx) a marca
 * REJECTED. Nos dois casos o arquivo continua no aparelho (RN-047).
 */
export async function syncEvidenceEntries(
  client: ApiClient,
  rows: OutboxRow[],
): Promise<{ synced: number; failed: number }> {
  let synced = 0;
  let failed = 0;
  if (rows.length === 0) return { synced, failed };

  // O que o push deixou para trás: vínculos que ainda não existem no servidor.
  const unsent = (await getPendingEntries()).filter(
    (row) => row.entity_type !== EVIDENCE_ENTITY_TYPE,
  );
  const responseIds = new ResponseIdResolver(client);

  for (const row of rows) {
    let queued: QueuedEvidence;
    try {
      queued = JSON.parse(row.payload) as QueuedEvidence;
    } catch {
      await markEntryFailed(row.id, 'FAILED', 'Dados da evidência ilegíveis.');
      failed += 1;
      continue;
    }

    const waitingFor = pendingDependency(row, queued, unsent);
    if (waitingFor) {
      await markEntryFailed(row.id, 'FAILED', waitingFor);
      failed += 1;
      continue;
    }

    let responseId = queued.responseId ?? null;
    if (!responseId && queued.inspectionItemId && !queued.nonConformityId) {
      try {
        responseId = await responseIds.forItem(row.inspection_id, queued.inspectionItemId);
      } catch (error) {
        await markEntryFailed(row.id, 'FAILED', error instanceof Error ? error.message : undefined);
        failed += 1;
        continue;
      }
    }

    try {
      await uploadEvidence(
        {
          inspectionId: row.inspection_id,
          fileUri: queued.localUri,
          idempotencyKey: queued.idempotencyKey,
          capturedAtDevice: queued.capturedAtDevice,
          description: queued.description ?? null,
          responseId,
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
        await markEntryFailed(
          row.id,
          isDefinitiveRejection(error) ? 'REJECTED' : 'FAILED',
          error instanceof Error ? error.message : undefined,
        );
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

/** Apaga a foto guardada de uma entrada EVIDENCE descartada pelo técnico. */
export function discardEvidenceFile(row: OutboxRow): void {
  try {
    const queued = JSON.parse(row.payload) as QueuedEvidence;
    if (queued.localUri) discardFile(queued.localUri);
  } catch {
    // Payload ilegível: não há arquivo conhecido para apagar.
  }
}

/** Recusa que reenviar não muda: 4xx, exceto os que se resolvem sozinhos. */
function isDefinitiveRejection(error: unknown): boolean {
  return (
    error instanceof ApiError &&
    error.status >= 400 &&
    error.status < 500 &&
    !TRANSIENT_CLIENT_STATUSES.has(error.status)
  );
}

/**
 * Motivo para esperar, se a resposta ou a NC da foto ainda está no outbox.
 * Subir antes deixaria a foto sem vínculo (resposta) ou recusada (NC).
 */
function pendingDependency(
  row: OutboxRow,
  queued: QueuedEvidence,
  unsent: OutboxRow[],
): string | null {
  const sameInspection = unsent.filter((entry) => entry.inspection_id === row.inspection_id);

  if (
    queued.nonConformityId &&
    sameInspection.some(
      (entry) => entry.entity_type === 'NON_CONFORMITY' && entry.entity_id === queued.nonConformityId,
    )
  ) {
    return 'Aguardando a não conformidade ser sincronizada.';
  }

  if (
    !queued.responseId &&
    queued.inspectionItemId &&
    sameInspection.some(
      (entry) =>
        entry.entity_type === 'INSPECTION_RESPONSE' && entry.entity_id === queued.inspectionItemId,
    )
  ) {
    return 'Aguardando a resposta do item ser sincronizada.';
  }

  return null;
}

/**
 * Id no servidor da resposta de um item, lido do detalhe da inspeção — uma
 * consulta por inspeção em cada sincronização. Item sem resposta devolve
 * `null`: a foto sobe vinculada só à inspeção, como na captura sem resposta.
 */
class ResponseIdResolver {
  private readonly details = new Map<string, Promise<InspectionDetail>>();

  constructor(private readonly client: ApiClient) {}

  async forItem(inspectionId: string, inspectionItemId: string): Promise<string | null> {
    let detail = this.details.get(inspectionId);
    if (!detail) {
      detail = this.client.get<InspectionDetail>(`/mobile/inspections/${inspectionId}`);
      this.details.set(inspectionId, detail);
    }
    const responses = (await detail).responses ?? [];
    return responses.find((response) => response.inspectionItemId === inspectionItemId)?.id ?? null;
  }
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
