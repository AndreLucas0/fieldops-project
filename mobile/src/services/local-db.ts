/**
 * Outbox local (SQLite) para o modo offline-first.
 *
 * Cada alteração do checklist é gravada aqui antes de ir para o servidor.
 * O `SyncService` lê as entradas com `synced = 0` e as envia via
 * `POST /mobile/sync/push` quando o dispositivo tiver conexão.
 *
 * O banco é aberto uma vez e reutilizado durante toda a sessão do app. A
 * inicialização do schema ocorre na primeira abertura.
 */

import * as SQLite from 'expo-sqlite';

/**
 * `REJECTED`: o servidor recusou de vez (reenviar não mudaria a resposta). A
 * entrada sai da fila, mas fica guardada — com o arquivo, se for evidência — até
 * o técnico descartá-la na aba Sincronização.
 */
export type OutboxStatus = 'PENDING' | 'FAILED' | 'CONFLICT' | 'REJECTED' | 'COMPLETED';

/** Linha crua da tabela `outbox` (nomes em snake_case = colunas do SQLite). */
export interface OutboxRow {
  id: string;
  inspection_id: string;
  entity_type: string;
  entity_id: string;
  operation_type: string;
  base_version: number;
  payload: string;
  synced: number;
  error_count: number;
  status: OutboxStatus;
  last_error: string | null;
  created_at: string;
}

const DB_NAME = 'fieldops.db';

let db: SQLite.SQLiteDatabase | null = null;

async function getDb(): Promise<SQLite.SQLiteDatabase> {
  if (!db) {
    db = await SQLite.openDatabaseAsync(DB_NAME);
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS outbox (
        id            TEXT PRIMARY KEY,
        inspection_id TEXT NOT NULL,
        entity_type   TEXT NOT NULL,
        entity_id     TEXT NOT NULL,
        operation_type TEXT NOT NULL DEFAULT 'UPSERT',
        base_version  INTEGER NOT NULL DEFAULT 0,
        payload       TEXT NOT NULL,
        synced        INTEGER NOT NULL DEFAULT 0,
        error_count   INTEGER NOT NULL DEFAULT 0,
        status        TEXT NOT NULL DEFAULT 'PENDING',
        last_error    TEXT,
        created_at    TEXT NOT NULL DEFAULT (datetime('now'))
      );
      CREATE TABLE IF NOT EXISTS sync_metadata (
        key   TEXT PRIMARY KEY,
        value TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS read_cache (
        key      TEXT PRIMARY KEY,
        value    TEXT NOT NULL,
        saved_at TEXT NOT NULL
      );
    `);
  }
  return db;
}

export interface NewOutboxEntry {
  id: string;
  inspectionId: string;
  entityType: string;
  entityId: string;
  operationType: string;
  baseVersion: number;
  payload: string;
}

/** Insere ou substitui uma entrada no outbox (idempotente por `id`). */
export async function upsertOutboxEntry(entry: NewOutboxEntry): Promise<void> {
  const database = await getDb();
  await database.runAsync(
    `INSERT OR REPLACE INTO outbox
       (id, inspection_id, entity_type, entity_id, operation_type, base_version, payload, synced, error_count, status, last_error, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, 0, 0, 'PENDING', NULL, datetime('now'))`,
    [
      entry.id,
      entry.inspectionId,
      entry.entityType,
      entry.entityId,
      entry.operationType,
      entry.baseVersion,
      entry.payload,
    ],
  );
}

/** Retorna as entradas ainda a enviar (não sincronizadas nem recusadas), por criação. */
export async function getPendingEntries(inspectionId?: string): Promise<OutboxRow[]> {
  const database = await getDb();
  if (inspectionId) {
    return database.getAllAsync<OutboxRow>(
      "SELECT * FROM outbox WHERE synced = 0 AND status != 'REJECTED' AND inspection_id = ? ORDER BY created_at ASC",
      [inspectionId],
    );
  }
  return database.getAllAsync<OutboxRow>(
    "SELECT * FROM outbox WHERE synced = 0 AND status != 'REJECTED' ORDER BY created_at ASC",
  );
}

/** Conta entradas não sincronizadas (para indicadores na UI). */
export async function countPendingEntries(): Promise<number> {
  const database = await getDb();
  const row = await database.getFirstAsync<{ count: number }>(
    "SELECT COUNT(*) AS count FROM outbox WHERE synced = 0 AND status != 'REJECTED'",
  );
  return row?.count ?? 0;
}

/** Marca as entradas indicadas como sincronizadas. */
export async function markEntriesSynced(ids: string[]): Promise<void> {
  if (ids.length === 0) return;
  const database = await getDb();
  const placeholders = ids.map(() => '?').join(',');
  await database.runAsync(
    `UPDATE outbox SET synced = 1, status = 'COMPLETED' WHERE id IN (${placeholders})`,
    ids,
  );
}

/** Uma entrada pelo id, em qualquer status, ou `null` se não existe mais. */
export async function getOutboxEntry(id: string): Promise<OutboxRow | null> {
  const database = await getDb();
  return database.getFirstAsync<OutboxRow>('SELECT * FROM outbox WHERE id = ?', [id]);
}

/** Remove uma entrada — usado quando o servidor a recusa de forma definitiva. */
export async function deleteOutboxEntry(id: string): Promise<void> {
  const database = await getDb();
  await database.runAsync('DELETE FROM outbox WHERE id = ?', [id]);
}

/** Retorna entradas com status FAILED, CONFLICT ou REJECTED (visíveis na tela de sync). */
export async function getFailedEntries(): Promise<OutboxRow[]> {
  const database = await getDb();
  return database.getAllAsync<OutboxRow>(
    "SELECT * FROM outbox WHERE status IN ('FAILED', 'CONFLICT', 'REJECTED') ORDER BY created_at ASC",
  );
}

/** Marca a entrada como falha, incrementando o contador e registrando o status e a mensagem. */
export async function markEntryFailed(
  id: string,
  status: 'FAILED' | 'CONFLICT' | 'REJECTED',
  lastError?: string,
): Promise<void> {
  const database = await getDb();
  await database.runAsync(
    'UPDATE outbox SET error_count = error_count + 1, status = ?, last_error = ? WHERE id = ?',
    [status, lastError ?? null, id],
  );
}

/** Guarda a última resposta lida do servidor para uma consulta (leitura offline). */
export async function saveCachedResponse(key: string, value: unknown): Promise<void> {
  const database = await getDb();
  await database.runAsync(
    'INSERT OR REPLACE INTO read_cache (key, value, saved_at) VALUES (?, ?, ?)',
    [key, JSON.stringify(value), new Date().toISOString()],
  );
}

/** Última resposta guardada para a consulta, ou `null` se nunca foi lida. */
export async function readCachedResponse<T>(key: string): Promise<T | null> {
  const database = await getDb();
  const row = await database.getFirstAsync<{ value: string }>(
    'SELECT value FROM read_cache WHERE key = ?',
    [key],
  );
  return row ? (JSON.parse(row.value) as T) : null;
}

/** Grava ou sobrescreve um par chave/valor na tabela de metadados de sync. */
export async function saveSyncMetadata(key: string, value: string): Promise<void> {
  const database = await getDb();
  await database.runAsync(
    'INSERT OR REPLACE INTO sync_metadata (key, value) VALUES (?, ?)',
    [key, value],
  );
}

/** Retorna o valor associado à chave, ou `null` se não existir. */
export async function getSyncMetadata(key: string): Promise<string | null> {
  const database = await getDb();
  const row = await database.getFirstAsync<{ value: string }>(
    'SELECT value FROM sync_metadata WHERE key = ?',
    [key],
  );
  return row?.value ?? null;
}
