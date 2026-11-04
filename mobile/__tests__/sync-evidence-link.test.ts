import * as FileSystem from 'expo-file-system';
import * as SQLite from 'expo-sqlite';

import { queueEvidence } from '@/features/evidence/evidence-outbox';
import { settleQueuedOperation } from '@/features/inspections/inspection-outbox';
import { withPendingEvidences } from '@/features/inspections/pending-overlay';
import { ApiError, type Evidence, type InspectionResponse } from '@/models';
import type { ApiClient } from '@/services/api-client';
import {
  countPendingEntries,
  getFailedEntries,
  getPendingEntries,
  upsertOutboxEntry,
  type OutboxRow,
} from '@/services/local-db';
import { discardOutboxEntry, syncPending } from '@/services/sync-service';

/**
 * OFFLINE-FIRST-FINDINGS-2026-10-20, itens 2, 3 e 5.
 *
 * - Item 2: a evidência de um item cuja resposta ainda não foi sincronizada
 *   guarda o snapshotId do item; o id da resposta no servidor é resolvido na
 *   sincronização, depois do push das respostas (decisão do dono, 2026-10-21).
 * - Item 3: evidência pendente conta para a regra de evidência obrigatória.
 * - Item 5: recusa definitiva vira REJECTED — sai da fila, aparece na aba
 *   Sincronização com o motivo e só some quando o técnico descarta.
 * - Conclusão (SUBMITTED) sobe depois das evidências: o backend exige a foto
 *   no servidor para concluir (MISSING_EVIDENCE_ON_NON_CONFORMING).
 */

const fs = FileSystem as unknown as { __files: Set<string> };
const sqlite = SQLite as unknown as { __store: Map<string, OutboxRow> };

const INSPECTION = 'insp-1';
const ITEM = 'snap-1';
const CAMERA_URI = 'file:///cache/Camera/foto.jpg';

interface FakeOptions {
  /** Respostas que o detalhe do servidor devolve. */
  responses?: { id: string; inspectionItemId: string }[];
  pushStatus?: (op: { operationId: string; entityType: string }) => string;
  pushFails?: boolean;
  uploadError?: Error;
}

function fakeClient(options: FakeOptions = {}) {
  const calls: string[] = [];
  const post = jest.fn(async (_path: string, body?: unknown) => {
    const { operations } = body as {
      operations: { operationId: string; entityType: string; payload: { status?: string } }[];
    };
    calls.push(`push:${operations.map((op) => op.payload.status ?? op.entityType).join(',')}`);
    if (options.pushFails) throw new Error('Network request failed');
    return {
      results: operations.map((op) => ({
        operationId: op.operationId,
        status: options.pushStatus?.(op) ?? 'APPLIED',
        error: { message: 'Recusado pelo servidor.' },
      })),
    };
  });
  const get = jest.fn(async (path: string) => {
    calls.push(`get:${path}`);
    return { id: INSPECTION, responses: options.responses ?? [] };
  });
  const upload = jest.fn(async () => {
    calls.push('upload');
    if (options.uploadError) throw options.uploadError;
    return { id: 'srv-evidence-1' };
  });
  return { client: { post, get, upload } as unknown as ApiClient, post, get, upload, calls };
}

function httpError(status: number, code: string): ApiError {
  return new ApiError({ timestamp: '2026-10-21T12:00:00Z', status, code, message: `Erro ${status}` });
}

function row(id: string): OutboxRow {
  return sqlite.__store.get(id) as OutboxRow;
}

function payloadOf(id: string): Record<string, unknown> {
  return JSON.parse(row(id).payload) as Record<string, unknown>;
}

async function queueResponse(id = 'resp-op-1', itemId = ITEM) {
  await upsertOutboxEntry({
    id,
    inspectionId: INSPECTION,
    entityType: 'INSPECTION_RESPONSE',
    entityId: itemId,
    operationType: 'UPSERT',
    baseVersion: 0,
    payload: JSON.stringify({ inspectionId: INSPECTION, conformity: 'NON_CONFORMING' }),
  });
}

async function queueNonConformity(id: string) {
  await upsertOutboxEntry({
    id: `nc-op-${id}`,
    inspectionId: INSPECTION,
    entityType: 'NON_CONFORMITY',
    entityId: id,
    operationType: 'CREATE',
    baseVersion: 0,
    payload: JSON.stringify({ inspectionId: INSPECTION, title: 'Vazamento' }),
  });
}

async function queueSubmit(id = 'submit-op') {
  await upsertOutboxEntry({
    id,
    inspectionId: INSPECTION,
    entityType: 'INSPECTION',
    entityId: INSPECTION,
    operationType: 'UPSERT',
    baseVersion: 0,
    payload: JSON.stringify({ status: 'SUBMITTED', completedAtDevice: '2026-10-21T12:00:00Z' }),
  });
}

function uploadedMetadata(upload: jest.Mock): Record<string, unknown> {
  return upload.mock.calls[0]?.[2] as Record<string, unknown>;
}

describe('Item 2 — vínculo da evidência com resposta ainda não sincronizada', () => {
  it('guarda o snapshotId do item e descarta o id sintético local-…', async () => {
    const id = await queueEvidence({
      inspectionId: INSPECTION,
      fileUri: CAMERA_URI,
      inspectionItemId: ITEM,
      responseId: `local-${ITEM}`,
    });

    expect(payloadOf(id).inspectionItemId).toBe(ITEM);
    expect(payloadOf(id)).not.toHaveProperty('responseId');
  });

  it('depois do push da resposta, resolve o id no servidor pelo snapshotId e sobe vinculada', async () => {
    await queueResponse();
    await queueEvidence({ inspectionId: INSPECTION, fileUri: CAMERA_URI, inspectionItemId: ITEM });
    const { client, upload, calls } = fakeClient({
      responses: [{ id: 'srv-resp-1', inspectionItemId: ITEM }],
    });

    const result = await syncPending(client);

    expect(result).toEqual({ synced: 2, failed: 0 });
    expect(calls).toEqual(['push:INSPECTION_RESPONSE', `get:/mobile/inspections/${INSPECTION}`, 'upload']);
    expect(uploadedMetadata(upload).responseId).toBe('srv-resp-1');
  });

  it('com responseId do servidor já conhecido, não consulta o detalhe', async () => {
    await queueEvidence({
      inspectionId: INSPECTION,
      fileUri: CAMERA_URI,
      inspectionItemId: ITEM,
      responseId: 'srv-resp-9',
    });
    const { client, get, upload } = fakeClient();

    await syncPending(client);

    expect(get).not.toHaveBeenCalled();
    expect(uploadedMetadata(upload).responseId).toBe('srv-resp-9');
  });

  it('resposta do item ainda pendente (push falhou): não sobe a foto sem vínculo e a mantém no aparelho', async () => {
    await queueResponse();
    const id = await queueEvidence({
      inspectionId: INSPECTION,
      fileUri: CAMERA_URI,
      inspectionItemId: ITEM,
    });
    const localUri = payloadOf(id).localUri as string;
    const { client, upload } = fakeClient({ pushFails: true });

    await syncPending(client);

    expect(upload).not.toHaveBeenCalled();
    expect(row(id)).toMatchObject({ status: 'FAILED', synced: 0 });
    expect(fs.__files.has(localUri)).toBe(true);
  });

  it('item sem resposta no servidor nem no aparelho: sobe vinculada só à inspeção, como antes', async () => {
    await queueEvidence({ inspectionId: INSPECTION, fileUri: CAMERA_URI, inspectionItemId: ITEM });
    const { client, upload } = fakeClient({ responses: [] });

    const result = await syncPending(client);

    expect(result).toEqual({ synced: 1, failed: 0 });
    expect(uploadedMetadata(upload)).not.toHaveProperty('responseId');
  });

  it('NC da evidência ainda pendente: espera a NC chegar ao servidor', async () => {
    await queueNonConformity('nc-1');
    const id = await queueEvidence({
      inspectionId: INSPECTION,
      fileUri: CAMERA_URI,
      nonConformityId: 'nc-1',
    });
    const { client, upload } = fakeClient({ pushFails: true });

    await syncPending(client);

    expect(upload).not.toHaveBeenCalled();
    expect(row(id).status).toBe('FAILED');
  });
});

describe('Item 3 — evidência pendente conta para a conclusão', () => {
  const responses = [
    { id: 'srv-resp-1', inspectionItemId: ITEM },
    { id: `local-snap-2`, inspectionItemId: 'snap-2' },
  ] as InspectionResponse[];

  it('liga cada foto do outbox à resposta do item, inclusive a resposta ainda local', async () => {
    await queueEvidence({ inspectionId: INSPECTION, fileUri: CAMERA_URI, inspectionItemId: ITEM });
    await queueEvidence({
      inspectionId: INSPECTION,
      fileUri: 'file:///cache/Camera/outra.jpg',
      inspectionItemId: 'snap-2',
    });
    const server = [{ id: 'ev-1', responseId: 'srv-resp-0' }] as Evidence[];

    const merged = withPendingEvidences(server, await getPendingEntries(INSPECTION), responses);

    expect(merged.map((evidence) => evidence.responseId)).toEqual([
      'srv-resp-0',
      'srv-resp-1',
      'local-snap-2',
    ]);
  });

  it('ignora entradas que não são evidência', async () => {
    await queueResponse();
    await queueEvidence({ inspectionId: INSPECTION, fileUri: CAMERA_URI, inspectionItemId: ITEM });

    const merged = withPendingEvidences([], await getPendingEntries(), responses);

    expect(merged).toHaveLength(1);
    expect(merged[0]?.inspectionId).toBe(INSPECTION);
  });
});

describe('Item 5 — recusa definitiva vira REJECTED', () => {
  it('push REJECTED sai da fila pendente e aparece na lista de erros com o motivo', async () => {
    await queueResponse();
    const { client } = fakeClient({ pushStatus: () => 'REJECTED' });

    const result = await syncPending(client);

    expect(result).toEqual({ synced: 0, failed: 1 });
    expect(row('resp-op-1')).toMatchObject({ status: 'REJECTED', last_error: 'Recusado pelo servidor.' });
    expect(await getPendingEntries()).toHaveLength(0);
    expect(await countPendingEntries()).toBe(0);
    expect((await getFailedEntries()).map((entry) => entry.id)).toEqual(['resp-op-1']);
  });

  it('DEPENDENCY_FAILED continua transitório (FAILED, volta a ser enviado)', async () => {
    await queueResponse();
    const { client } = fakeClient({ pushStatus: () => 'DEPENDENCY_FAILED' });

    await syncPending(client);

    expect(row('resp-op-1').status).toBe('FAILED');
    expect(await getPendingEntries()).toHaveLength(1);
  });

  it.each([
    [413, 'FILE_TOO_LARGE'],
    [415, 'UNSUPPORTED_MEDIA_TYPE'],
    [404, 'RESPONSE_NOT_FOUND'],
    [409, 'EVIDENCE_READ_ONLY'],
  ])('upload recusado com %i é definitivo: REJECTED, não reenvia, mantém a foto', async (status, code) => {
    const id = await queueEvidence({ inspectionId: INSPECTION, fileUri: CAMERA_URI });
    const localUri = payloadOf(id).localUri as string;
    const { client, upload } = fakeClient({ uploadError: httpError(status, code) });

    await syncPending(client);
    await syncPending(client);

    expect(upload).toHaveBeenCalledTimes(1);
    expect(row(id).status).toBe('REJECTED');
    expect(fs.__files.has(localUri)).toBe(true);
  });

  it.each([
    [0, 'NETWORK_ERROR'],
    [401, 'UNAUTHORIZED'],
    [503, 'SERVER_ERROR'],
  ])('upload com %i é transitório: FAILED, tenta de novo', async (status, code) => {
    const id = await queueEvidence({ inspectionId: INSPECTION, fileUri: CAMERA_URI });
    const { client, upload } = fakeClient({ uploadError: httpError(status, code) });

    await syncPending(client);
    await syncPending(client);

    expect(upload).toHaveBeenCalledTimes(2);
    expect(row(id).status).toBe('FAILED');
  });

  it('descartar uma evidência recusada remove a entrada e apaga a foto do aparelho', async () => {
    const id = await queueEvidence({ inspectionId: INSPECTION, fileUri: CAMERA_URI });
    const localUri = payloadOf(id).localUri as string;
    const { client } = fakeClient({ uploadError: httpError(413, 'FILE_TOO_LARGE') });
    await syncPending(client);

    await discardOutboxEntry(row(id));

    expect(sqlite.__store.has(id)).toBe(false);
    expect(fs.__files.has(localUri)).toBe(false);
  });

  it('settleQueuedOperation continua informando a recusa de uma transição', async () => {
    await queueSubmit();
    const { client } = fakeClient({ pushStatus: () => 'REJECTED' });

    const outcome = await settleQueuedOperation(client, INSPECTION, 'submit-op');

    expect(outcome).toEqual({ state: 'rejected', message: 'Recusado pelo servidor.' });
    expect(sqlite.__store.has('submit-op')).toBe(false);
  });
});

describe('Conclusão depois das evidências', () => {
  it('ordem do sync: respostas → evidências → conclusão', async () => {
    await queueResponse();
    await queueEvidence({ inspectionId: INSPECTION, fileUri: CAMERA_URI, inspectionItemId: ITEM });
    await queueSubmit();
    const { client, calls } = fakeClient({
      responses: [{ id: 'srv-resp-1', inspectionItemId: ITEM }],
    });

    const result = await syncPending(client);

    expect(result).toEqual({ synced: 3, failed: 0 });
    expect(calls).toEqual([
      'push:INSPECTION_RESPONSE',
      `get:/mobile/inspections/${INSPECTION}`,
      'upload',
      'push:SUBMITTED',
    ]);
  });

  it('evidência da inspeção ainda não enviada segura a conclusão no aparelho', async () => {
    await queueEvidence({ inspectionId: INSPECTION, fileUri: CAMERA_URI });
    await queueSubmit();
    const { client, calls } = fakeClient({ uploadError: httpError(0, 'NETWORK_ERROR') });

    await syncPending(client);

    expect(calls).toEqual(['upload']);
    expect(row('submit-op')).toMatchObject({ status: 'PENDING', synced: 0 });
  });
});
