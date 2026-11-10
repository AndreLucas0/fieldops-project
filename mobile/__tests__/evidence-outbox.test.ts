import * as FileSystem from 'expo-file-system';
import * as SQLite from 'expo-sqlite';

import { queueEvidence } from '@/features/evidence/evidence-outbox';
import { ApiError } from '@/models';
import type { ApiClient } from '@/services/api-client';
import { getPendingEntries, upsertOutboxEntry } from '@/services/local-db';
import { syncPending } from '@/services/sync-service';

/**
 * SYNC-OUTBOX-EVIDENCE — capturar evidência é operação offline
 * (contrato-backend-frontend.md §10.8, §11.3): a foto é copiada para
 * armazenamento permanente e entra no outbox; o sincronizador faz o upload
 * multipart com a mesma idempotencyKey e só então descarta o arquivo local
 * (RN-047: arquivo mantido no dispositivo até o upload ser confirmado).
 */

const fs = FileSystem as unknown as { __files: Set<string>; __missing: Set<string> };
const sqlite = SQLite as unknown as { __store: Map<string, { status: string; synced: number }> };

const INSPECTION = 'insp-1';
const CAMERA_URI =
  'file:///data/user/0/host.exp.exponent/cache/ExperienceData/%2540anonymous%252Fmobile/Camera/foto.jpg';

function fakeClient(options: { uploadFails?: boolean; uploadError?: Error } = {}) {
  const calls: string[] = [];
  const post = jest.fn(async (_path: string, body?: unknown) => {
    calls.push('push');
    const { operations } = body as { operations: { operationId: string }[] };
    return { results: operations.map((op) => ({ operationId: op.operationId, status: 'APPLIED' })) };
  });
  const upload = jest.fn(async () => {
    calls.push('upload');
    if (options.uploadError) throw options.uploadError;
    if (options.uploadFails) throw new Error('Network request failed');
    return { id: 'srv-evidence-1' };
  });
  return { client: { post, upload } as unknown as ApiClient, post, upload, calls };
}

function payloadOf(id: string): Record<string, unknown> {
  const row = [...sqlite.__store.values()].find((r) => (r as { id?: string }).id === id) as
    | { payload: string }
    | undefined;
  return JSON.parse(row?.payload ?? '{}') as Record<string, unknown>;
}

describe('queueEvidence', () => {
  it('copia a foto para armazenamento permanente e enfileira EVIDENCE no outbox', async () => {
    const id = await queueEvidence({
      inspectionId: INSPECTION,
      fileUri: CAMERA_URI,
      description: 'Painel obstruído',
      responseId: 'resp-1',
      location: { latitude: -23.5, longitude: -46.6, capturedAt: '2026-10-20T12:00:00Z' },
    });

    const [entry] = await getPendingEntries(INSPECTION);
    expect(entry).toMatchObject({ id, entity_type: 'EVIDENCE', inspection_id: INSPECTION });

    const payload = payloadOf(id);
    expect(payload.localUri).toMatch(/^file:\/\/\/document\/evidence-pending\/.+\.jpg$/);
    expect(fs.__files.has(payload.localUri as string)).toBe(true);
    expect(payload).toMatchObject({
      idempotencyKey: id,
      description: 'Painel obstruído',
      responseId: 'resp-1',
      location: { latitude: -23.5, longitude: -46.6, capturedAt: '2026-10-20T12:00:00Z' },
    });
    expect(typeof payload.capturedAtDevice).toBe('string');
  });

  it('não enfileira nada se a foto de origem não puder ser copiada', async () => {
    fs.__missing.add(CAMERA_URI);

    await expect(queueEvidence({ inspectionId: INSPECTION, fileUri: CAMERA_URI })).rejects.toThrow();
    expect(await getPendingEntries()).toHaveLength(0);
  });
});

describe('syncPending com evidências', () => {
  it('envia a evidência pela cópia local com a mesma idempotencyKey e descarta o arquivo', async () => {
    const id = await queueEvidence({ inspectionId: INSPECTION, fileUri: CAMERA_URI });
    const localUri = payloadOf(id).localUri as string;
    const { client, upload, post } = fakeClient();

    const result = await syncPending(client);

    expect(result).toEqual({ synced: 1, failed: 0 });
    expect(post).not.toHaveBeenCalled();
    expect(upload).toHaveBeenCalledWith(
      `/inspections/${INSPECTION}/evidence`,
      expect.objectContaining({ uri: localUri }),
      expect.objectContaining({ idempotencyKey: id, type: 'PHOTO' }),
    );
    expect(await getPendingEntries()).toHaveLength(0);
    expect(fs.__files.has(localUri)).toBe(false);
  });

  it('falha de envio mantém a evidência pendente e o arquivo no aparelho (RN-047)', async () => {
    const id = await queueEvidence({ inspectionId: INSPECTION, fileUri: CAMERA_URI });
    const localUri = payloadOf(id).localUri as string;
    const { client } = fakeClient({ uploadFails: true });

    const result = await syncPending(client);

    expect(result).toEqual({ synced: 0, failed: 1 });
    const [entry] = await getPendingEntries();
    expect(entry).toMatchObject({ id, status: 'FAILED' });
    expect(fs.__files.has(localUri)).toBe(true);
  });

  it('409 EVIDENCE_ALREADY_PROCESSED conta como enviada (upload anterior chegou, resposta se perdeu)', async () => {
    const id = await queueEvidence({ inspectionId: INSPECTION, fileUri: CAMERA_URI });
    const localUri = payloadOf(id).localUri as string;
    const alreadyProcessed = new ApiError({
      timestamp: '2026-10-20T12:00:00Z',
      status: 409,
      code: 'EVIDENCE_ALREADY_PROCESSED',
      message: 'This idempotencyKey has already been processed',
    });
    const { client } = fakeClient({ uploadError: alreadyProcessed });

    const result = await syncPending(client);

    expect(result).toEqual({ synced: 1, failed: 0 });
    expect(await getPendingEntries()).toHaveLength(0);
    expect(fs.__files.has(localUri)).toBe(false);
  });

  it('envia as respostas do checklist antes das evidências', async () => {
    await queueEvidence({ inspectionId: INSPECTION, fileUri: CAMERA_URI });
    await upsertOutboxEntry({
      id: 'resp-op-1',
      inspectionId: INSPECTION,
      entityType: 'INSPECTION_RESPONSE',
      entityId: 'resp-1',
      operationType: 'UPSERT',
      baseVersion: 0,
      payload: JSON.stringify({ inspectionId: INSPECTION, valueBoolean: true }),
    });
    const { client, calls } = fakeClient();

    const result = await syncPending(client);

    expect(result).toEqual({ synced: 2, failed: 0 });
    expect(calls).toEqual(['push', 'upload']);
  });
});
