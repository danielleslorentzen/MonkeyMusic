/// <reference lib="webworker" />
/**
 * SQLite lives in a dedicated worker: the OPFS SAH-pool VFS gives durable,
 * cross-origin-isolation-free persistence (TDD §5.1). Falls back to an
 * in-memory database when OPFS is unavailable (e.g. plain-http dev).
 */
import sqlite3InitModule, { type Database } from '@sqlite.org/sqlite-wasm';
import { DDL, MIGRATIONS, SCHEMA_VERSION } from '@lyd/schema';

export type DbRequest =
  | { id: number; op: 'init' }
  | { id: number; op: 'run'; sql: string; params?: unknown[] }
  | { id: number; op: 'all'; sql: string; params?: unknown[] };

export type DbResponse =
  | { id: number; ok: true; storage?: 'opfs' | 'memory'; rows?: Record<string, unknown>[] }
  | { id: number; ok: false; error: string };

let db: Database | null = null;
let storage: 'opfs' | 'memory' = 'memory';

async function init(): Promise<void> {
  const sqlite3 = await sqlite3InitModule();
  try {
    const poolUtil = await sqlite3.installOpfsSAHPoolVfs({ name: 'lyd' });
    db = new poolUtil.OpfsSAHPoolDb('/lyd.db');
    storage = 'opfs';
  } catch {
    db = new sqlite3.oo1.DB(':memory:');
    storage = 'memory';
  }
  db.exec('PRAGMA foreign_keys = ON;');
  db.exec(DDL);

  // Additive migrations (TDD §5.1: later phases are migrations only).
  let current = 1;
  db.exec({
    sql: "SELECT value FROM meta WHERE key = 'schema_version'",
    rowMode: 'object',
    callback: (row: Record<string, unknown>) => {
      current = Number(row.value) || 1;
    },
  });
  for (let v = current; v < SCHEMA_VERSION; v++) {
    db.exec(MIGRATIONS[v - 1]);
  }
  db.exec({
    sql: `INSERT INTO meta(key, value) VALUES ('schema_version', ?)
          ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
    bind: [String(SCHEMA_VERSION)],
  });
}

self.onmessage = async (ev: MessageEvent<DbRequest>) => {
  const msg = ev.data;
  try {
    if (msg.op === 'init') {
      if (!db) await init();
      postMessage({ id: msg.id, ok: true, storage } satisfies DbResponse);
      return;
    }
    if (!db) throw new Error('database not initialized');
    if (msg.op === 'run') {
      db.exec({ sql: msg.sql, bind: (msg.params ?? []) as never });
      postMessage({ id: msg.id, ok: true } satisfies DbResponse);
      return;
    }
    const rows: Record<string, unknown>[] = [];
    db.exec({
      sql: msg.sql,
      bind: (msg.params ?? []) as never,
      rowMode: 'object',
      callback: (row: Record<string, unknown>) => {
        rows.push(row);
      },
    });
    postMessage({ id: msg.id, ok: true, rows } satisfies DbResponse);
  } catch (err) {
    postMessage({
      id: msg.id,
      ok: false,
      error: err instanceof Error ? err.message : String(err),
    } satisfies DbResponse);
  }
};
