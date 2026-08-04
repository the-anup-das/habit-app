/// <reference lib="webworker" />
/**
 * SQLite host worker.
 *
 * Two hard constraints discovered in the Phase 0 spike, both worth writing down
 * because neither is obvious and both fail silently:
 *
 *  1. `FileSystemFileHandle.createSyncAccessHandle` is WORKER-ONLY. On the main
 *     thread it is simply not a function, and the SAHPool VFS reports the
 *     unhelpful "Missing required OPFS APIs". OPFS-backed SQLite therefore has
 *     to live in a worker — there is no main-thread path.
 *
 *  2. The library's own bundled worker (sqlite3Worker1Promiser) is resolved by
 *     the bundler as `.vite/deps/sqlite3-worker1.mjs`, and under COEP
 *     `require-corp` that load is blocked with ERR_BLOCKED_BY_RESPONSE and no
 *     console error. Owning the worker ourselves sidesteps it: `new URL(...,
 *     import.meta.url)` is something every bundler resolves correctly, and the
 *     SAHPool VFS needs no cross-origin isolation at all.
 */
import sqlite3InitModule from "@sqlite.org/sqlite-wasm";

type Db = {
  exec(opts: {
    sql: string;
    bind?: readonly unknown[];
    rowMode?: string;
    resultRows?: unknown[];
  }): unknown;
  close(): void;
};

export type WorkerRequest =
  | {
      readonly id: number;
      readonly type: "open";
      readonly poolName: string;
      readonly filename: string;
    }
  | { readonly id: number; readonly type: "exec"; readonly sql: string }
  | {
      readonly id: number;
      readonly type: "query";
      readonly sql: string;
      readonly params: readonly unknown[];
    }
  | { readonly id: number; readonly type: "close" };

export type WorkerResponse =
  | { readonly id: number; readonly ok: true; readonly rows?: unknown[]; readonly vfs?: string }
  | { readonly id: number; readonly ok: false; readonly error: string };

let db: Db | null = null;

function reply(res: WorkerResponse): void {
  (self as unknown as DedicatedWorkerGlobalScope).postMessage(res);
}

self.onmessage = async (event: MessageEvent<WorkerRequest>) => {
  const msg = event.data;
  try {
    switch (msg.type) {
      case "open": {
        const sqlite3 = (await sqlite3InitModule()) as unknown as {
          installOpfsSAHPoolVfs(o: { name: string }): Promise<{
            OpfsSAHPoolDb: new (path: string) => Db;
          }>;
        };
        const pool = await sqlite3.installOpfsSAHPoolVfs({ name: msg.poolName });
        db = new pool.OpfsSAHPoolDb(`/${msg.filename}`);
        db.exec({ sql: "PRAGMA foreign_keys = ON;" });
        reply({ id: msg.id, ok: true, vfs: "opfs-sahpool" });
        return;
      }
      case "exec": {
        if (!db) throw new Error("database not open");
        db.exec({ sql: msg.sql });
        reply({ id: msg.id, ok: true });
        return;
      }
      case "query": {
        if (!db) throw new Error("database not open");
        const rows: unknown[] = [];
        db.exec({ sql: msg.sql, bind: msg.params, rowMode: "array", resultRows: rows });
        reply({ id: msg.id, ok: true, rows });
        return;
      }
      case "close": {
        db?.close();
        db = null;
        reply({ id: msg.id, ok: true });
        return;
      }
    }
  } catch (err) {
    reply({
      id: msg.id,
      ok: false,
      error: err instanceof Error ? `${err.name}: ${err.message}` : String(err),
    });
  }
};
