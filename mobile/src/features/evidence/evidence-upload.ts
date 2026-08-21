/**
 * Envio de evidência (FE-M13).
 *
 * O upload é `multipart/form-data` (`docs/contrato-backend-frontend.md` §10) e
 * carrega uma chave de idempotência gerada no dispositivo: reenviar a mesma
 * foto depois de uma falha de rede não pode duplicar o registro (§11.8).
 */

import { randomUUID } from 'expo-crypto';

import type { Evidence, GeoLocation, UploadFile, Uuid } from '@/models';
import { apiClient, type ApiClient } from '@/services';

/** De onde a captura partiu — decide para onde voltar depois de confirmar. */
export type EvidenceOrigin = 'checklist' | 'non-conformities';

export interface EvidenceUploadInput {
  inspectionId: string;
  fileUri: string;
  description?: string | null;
  responseId?: Uuid | null;
  nonConformityId?: Uuid | null;
  location?: GeoLocation | null;
  capturedAtDevice?: string;
  idempotencyKey?: string;
}

/** Nome e tipo do arquivo a partir da URI local. */
export function describeFile(uri: string): UploadFile {
  const clean = uri.split('?')[0] ?? uri;
  const extension = /\.(\w+)$/.exec(clean)?.[1]?.toLowerCase() ?? 'jpg';

  const type = extension === 'png' ? 'image/png' : 'image/jpeg';
  const name = `evidencia-${Date.now()}.${extension === 'png' ? 'png' : 'jpg'}`;

  return { uri, name, type };
}

export async function uploadEvidence(
  input: EvidenceUploadInput,
  client: ApiClient = apiClient,
): Promise<Evidence> {
  const file = describeFile(input.fileUri);

  const metadata: Record<string, unknown> = {
    idempotencyKey: input.idempotencyKey ?? randomUUID(),
    type: 'PHOTO',
    capturedAtDevice: input.capturedAtDevice ?? new Date().toISOString(),
  };

  // Campos ausentes ficam de fora do multipart em vez de irem vazios: o
  // `ApiClient.upload` descarta `null` e `undefined`.
  if (input.description?.trim()) metadata.description = input.description.trim();
  if (input.responseId) metadata.responseId = input.responseId;
  if (input.nonConformityId) metadata.nonConformityId = input.nonConformityId;
  if (input.location) {
    metadata.latitude = input.location.latitude;
    metadata.longitude = input.location.longitude;
  }

  return client.upload<Evidence>(
    `/inspections/${input.inspectionId}/evidence`,
    file,
    metadata,
  );
}
