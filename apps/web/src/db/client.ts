import type { DbRequest, DbResponse } from './db.worker';

let worker: Worker | null = null;
let nextId = 1;
const pending = new Map<number, { resolve: (r: DbResponse) => void }>();

function getWorker(): Worker {
  if (!worker) {
    worker = new Worker(new URL('./db.worker.ts', import.meta.url), { type: 'module' });
    worker.onmessage = (ev: MessageEvent<DbResponse>) => {
      const p = pending.get(ev.data.id);
      if (p) {
        pending.delete(ev.data.id);
        p.resolve(ev.data);
      }
    };
  }
  return worker;
}

type DistributiveOmit<T, K extends keyof T> = T extends unknown ? Omit<T, K> : never;

function send(req: DistributiveOmit<DbRequest, 'id'>): Promise<DbResponse> {
  const id = nextId++;
  return new Promise((resolve, reject) => {
    pending.set(id, {
      resolve: (r) => {
        if (r.ok) resolve(r);
        else reject(new Error(r.error));
      },
    });
    getWorker().postMessage({ ...req, id });
  });
}

let initPromise: Promise<'opfs' | 'memory'> | null = null;

/** Initialize the database; resolves with the storage backend in use. */
export function initDb(): Promise<'opfs' | 'memory'> {
  initPromise ??= send({ op: 'init' }).then(
    (r) => (r.ok && r.storage) || 'memory',
  );
  return initPromise;
}

export async function run(sql: string, params: unknown[] = []): Promise<void> {
  await initDb();
  await send({ op: 'run', sql, params });
}

export async function all<T = Record<string, unknown>>(
  sql: string,
  params: unknown[] = [],
): Promise<T[]> {
  await initDb();
  const r = await send({ op: 'all', sql, params });
  return (r.ok ? (r.rows ?? []) : []) as T[];
}
