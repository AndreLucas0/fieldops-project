import {
  getFailedEntries,
  getSyncMetadata,
  markEntryFailed,
  markEntriesSynced,
  saveSyncMetadata,
  upsertOutboxEntry,
} from '@/services/local-db';

function outboxRow(id: string) {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const SQLite = require('expo-sqlite') as { __store: Map<string, Record<string, unknown>> };
  return SQLite.__store.get(id) ?? ({} as Record<string, unknown>);
}

async function addEntry(id: string) {
  await upsertOutboxEntry({
    id,
    inspectionId: 'insp-schema',
    entityType: 'INSPECTION_RESPONSE',
    entityId: `item-${id}`,
    operationType: 'UPSERT',
    baseVersion: 0,
    payload: '{}',
  });
}

/**
 * SYNC-OUTBOX-SCHEMA — campos status e last_error no outbox.
 *
 * Cada entrada rastreia o estado da última tentativa de sync:
 * PENDING (criação) → COMPLETED (APPLIED) | FAILED (REJECTED) | CONFLICT (CONFLICT).
 */
describe('SYNC-OUTBOX-SCHEMA — status e last_error no outbox', () => {
  it('upsertOutboxEntry cria entrada com status PENDING e last_error null', async () => {
    await addEntry('schema-1');
    const row = outboxRow('schema-1');
    expect(row.status).toBe('PENDING');
    expect(row.last_error).toBeNull();
  });

  it('markEntryFailed com FAILED define status FAILED e incrementa error_count', async () => {
    await addEntry('schema-2');
    await markEntryFailed('schema-2', 'FAILED');
    const row = outboxRow('schema-2');
    expect(row.status).toBe('FAILED');
    expect(row.error_count).toBe(1);
  });

  it('markEntryFailed com CONFLICT define status CONFLICT e incrementa error_count', async () => {
    await addEntry('schema-3');
    await markEntryFailed('schema-3', 'CONFLICT');
    const row = outboxRow('schema-3');
    expect(row.status).toBe('CONFLICT');
    expect(row.error_count).toBe(1);
  });

  it('markEntryFailed armazena last_error quando fornecido', async () => {
    await addEntry('schema-4');
    await markEntryFailed('schema-4', 'FAILED', 'server rejected: version mismatch');
    expect(outboxRow('schema-4').last_error).toBe('server rejected: version mismatch');
  });

  it('markEntriesSynced define status COMPLETED', async () => {
    await addEntry('schema-5');
    await markEntriesSynced(['schema-5']);
    expect(outboxRow('schema-5').status).toBe('COMPLETED');
  });
});

describe('SYNC-FE-M04-FULL — getFailedEntries()', () => {
  it('retorna lista vazia quando não há entradas com erro', async () => {
    const result = await getFailedEntries();
    expect(result).toHaveLength(0);
  });

  it('retorna entradas com status FAILED', async () => {
    await addEntry('fe-1');
    await markEntryFailed('fe-1', 'FAILED');

    const result = await getFailedEntries();

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('fe-1');
    expect(result[0].status).toBe('FAILED');
  });

  it('retorna entradas com status CONFLICT', async () => {
    await addEntry('fe-2');
    await markEntryFailed('fe-2', 'CONFLICT');

    const result = await getFailedEntries();

    expect(result).toHaveLength(1);
    expect(result[0].status).toBe('CONFLICT');
  });

  it('não retorna entradas PENDING nem COMPLETED', async () => {
    await addEntry('fe-3');
    await addEntry('fe-4');
    await markEntriesSynced(['fe-4']);

    const result = await getFailedEntries();

    expect(result).toHaveLength(0);
  });
});

/**
 * SYNC-METADATA — tabela sync_metadata no SQLite local.
 *
 * A spec exige persistência de last_successful_sync e last_pull_cursor
 * (contrato-backend-frontend.md §11.4, telas-frontend.md §FE-M04).
 */
describe('SYNC-METADATA — saveSyncMetadata / getSyncMetadata', () => {
  it('retorna null quando a chave não existe', async () => {
    const result = await getSyncMetadata('nonexistent_key');
    expect(result).toBeNull();
  });

  it('salva e recupera um valor', async () => {
    await saveSyncMetadata('last_successful_sync', '2026-10-14T10:00:00.000Z');
    const result = await getSyncMetadata('last_successful_sync');
    expect(result).toBe('2026-10-14T10:00:00.000Z');
  });

  it('sobrescreve um valor existente (idempotente por chave)', async () => {
    await saveSyncMetadata('last_successful_sync', '2026-10-14T10:00:00.000Z');
    await saveSyncMetadata('last_successful_sync', '2026-10-14T11:00:00.000Z');
    const result = await getSyncMetadata('last_successful_sync');
    expect(result).toBe('2026-10-14T11:00:00.000Z');
  });

  it('chaves diferentes são armazenadas independentemente', async () => {
    await saveSyncMetadata('key_a', 'value_a');
    await saveSyncMetadata('key_b', 'value_b');
    expect(await getSyncMetadata('key_a')).toBe('value_a');
    expect(await getSyncMetadata('key_b')).toBe('value_b');
  });
});
