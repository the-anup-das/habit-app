import { drizzle, type SqliteRemoteDatabase } from "drizzle-orm/sqlite-proxy";
import * as schema from "../schema";
import type { WorkerRequest, WorkerResponse } from "./web-worker";

/**
 * Web driver: SQLite compiled to WASM, persisted in OPFS, hosted in a worker
 * we own. See web-worker.ts for why both of those are forced rather than
 * chosen.
 *
 * Consequences worth knowing:
 *   · NO COOP/COEP needed — the SAHPool VFS does not require cross-origin
 *     isolation, so the NAS reverse proxy has one less thing to get right.
 *   · SQLite never touches the main thread, so a slow query cannot jank the UI.
 *   · One writer. OPFS sync access handles are exclusive, so a second tab will
 *     fail to open the pool — handled by falling back to memory and SAYING SO.
 */

export type WebDatabase = SqliteRemoteDatabase<typeof schema>;

export interface WebDriverOptions {
  readonly poolName?: string;
  readonly filename?: string;
}

export interface OpenResult {
  readonly db: WebDatabase;
  /** False when OPFS was unavailable and this session is transient. */
  readonly persistent: boolean;
  readonly vfs: string;
  /** Why persistence was unavailable. Surface it — never fail silently. */
  readonly fallbackReason?: string;
  exec(sql: string): Promise<void>;
  query(sql: string): Promise<unknown[][]>;
  close(): Promise<void>;
}

/**
 * One database per page, always.
 *
 * OPFS sync access handles are EXCLUSIVE. React StrictMode double-invokes
 * effects in development, and the second open loses the race with
 * NoModificationAllowedError — which looks exactly like "OPFS is broken".
 * Sharing one promise makes concurrent callers cooperate instead of collide.
 */
let shared: Promise<OpenResult> | null = null;

/**
 * `Omit` over a discriminated union collapses it to the keys every member
 * shares — which here is nothing useful. Distributing over the union first
 * preserves each variant.
 */
type DistributiveOmit<T, K extends PropertyKey> = T extends unknown ? Omit<T, K> : never;
type WorkerRequestInit = DistributiveOmit<WorkerRequest, "id">;

class WorkerClient {
  private seq = 0;
  private readonly pending = new Map<
    number,
    { resolve: (r: WorkerResponse) => void; reject: (e: Error) => void }
  >();

  constructor(private readonly worker: Worker) {
    worker.onmessage = (e: MessageEvent<WorkerResponse>) => {
      const entry = this.pending.get(e.data.id);
      if (!entry) return;
      this.pending.delete(e.data.id);
      entry.resolve(e.data);
    };
    worker.onerror = (e) => {
      for (const [, p] of this.pending) p.reject(new Error(e.message || "worker error"));
      this.pending.clear();
    };
  }

  send(msg: WorkerRequestInit): Promise<WorkerResponse> {
    const id = ++this.seq;
    return new Promise<WorkerResponse>((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.worker.postMessage({ ...msg, id } as WorkerRequest);
    });
  }

  terminate(): void {
    this.worker.terminate();
  }
}

export function openWebDatabase(options: WebDriverOptions = {}): Promise<OpenResult> {
  shared ??= openOnce(options);
  return shared;
}

async function openOnce(options: WebDriverOptions): Promise<OpenResult> {
  const poolName = options.poolName ?? "chapter";
  const filename = options.filename ?? "chapter.sqlite3";

  // `new URL(..., import.meta.url)` is the one worker form every bundler
  // resolves correctly. Do not replace it with a bare path.
  const client = new WorkerClient(
    new Worker(new URL("./web-worker.ts", import.meta.url), { type: "module" }),
  );

  const opened = await client.send({ type: "open", poolName, filename });

  let persistent = true;
  let vfs = "opfs-sahpool";
  let fallbackReason: string | undefined;
  if (!opened.ok) {
    persistent = false;
    vfs = "memory";
    fallbackReason = opened.error;
  }

  const exec = async (sql: string): Promise<void> => {
    const res = await client.send({ type: "exec", sql });
    if (!res.ok) throw new Error(res.error);
  };

  const query = async (sql: string): Promise<unknown[][]> => {
    const res = await client.send({ type: "query", sql, params: [] });
    if (!res.ok) throw new Error(res.error);
    return (res.rows ?? []) as unknown[][];
  };

  const db = drizzle(
    async (sql, params, method) => {
      const res = await client.send({ type: "query", sql, params });
      if (!res.ok) throw new Error(res.error);
      const rows = (res.rows ?? []) as unknown[][];
      // drizzle-proxy contract: `get` wants the single row.
      if (method === "get") return { rows: (rows[0] ?? []) as unknown[] };
      return { rows };
    },
    { schema },
  );

  return {
    db,
    persistent,
    vfs,
    ...(fallbackReason === undefined ? {} : { fallbackReason }),
    exec,
    query,
    close: async () => {
      await client.send({ type: "close" });
      client.terminate();
      shared = null;
    },
  };
}
