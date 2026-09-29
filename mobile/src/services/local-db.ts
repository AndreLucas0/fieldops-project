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
        created_at    TEXT NOT NULL DEFAULT (datetime('now'))
      )
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
       (id, inspection_id, entity_type, entity_id, operation_type, base_version, payload, synced, error_count, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, 0, 0, datetime('now'))`,
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

/** Retorna todas as entradas não sincronizadas, ordenadas por criação. */
export async function getPendingEntries(inspectionId?: string): Promise<OutboxRow[]> {
  const database = await getDb();
  if (inspectionId) {
    return database.getAllAsync<OutboxRow>(
      'SELECT * FROM outbox WHERE synced = 0 AND inspection_id = ? ORDER BY created_at ASC',
      [inspectionId],
    );
  }
  return database.getAllAsync<OutboxRow>(
    'SELECT * FROM outbox WHERE synced = 0 ORDER BY created_at ASC',
  );
}

/** Conta entradas não sincronizadas (para indicadores na UI). */
export async function countPendingEntries(): Promise<number> {
  const database = await getDb();
  const row = await database.getFirstAsync<{ count: number }>(
    'SELECT COUNT(*) AS count FROM outbox WHERE synced = 0',
  );
  return row?.count ?? 0;
}

/** Marca as entradas indicadas como sincronizadas. */
export async function markEntriesSynced(ids: string[]): Promise<void> {
  if (ids.length === 0) return;
  const database = await getDb();
  const placeholders = ids.map(() => '?').join(',');
  await database.runAsync(
    `UPDATE outbox SET synced = 1 WHERE id IN (${placeholders})`,
    ids,
  );
}

/** Incrementa o contador de erros (para observabilidade). */
export async function incrementErrorCount(id: string): Promise<void> {
  const database = await getDb();
  await database.runAsync(
    'UPDATE outbox SET error_count = error_count + 1 WHERE id = ?',
    [id],
  );
}
