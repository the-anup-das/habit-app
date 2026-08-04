import { drizzle, type ExpoSQLiteDatabase } from "drizzle-orm/expo-sqlite";
import { openDatabaseSync } from "expo-sqlite";
import * as schema from "../schema";

/**
 * Native driver: SQLite for Android/iOS via expo-sqlite.
 */
export type NativeDatabase = ExpoSQLiteDatabase<typeof schema>;

export interface NativeDriverOptions {
  readonly filename?: string;
}

export interface OpenResult {
  readonly db: NativeDatabase;
  readonly persistent: boolean;
  readonly vfs: string;
  exec(sql: string): Promise<void>;
  query(sql: string): Promise<unknown[][]>;
  close(): Promise<void>;
}

let shared: Promise<OpenResult> | null = null;

export function openNativeDatabase(options: NativeDriverOptions = {}): Promise<OpenResult> {
  shared ??= openOnce(options);
  return shared;
}

async function openOnce(options: NativeDriverOptions): Promise<OpenResult> {
  const filename = options.filename ?? "chapter.sqlite3";

  // openDatabaseSync blocks, but it's safe and fast enough for app initialization
  const expoDb = openDatabaseSync(filename);
  const db = drizzle(expoDb, { schema });

  return {
    db,
    persistent: true,
    vfs: "expo-sqlite",
    exec: async (sql: string) => {
      await expoDb.execAsync(sql);
    },
    query: async (sql: string) => {
      // Drizzle migration runner needs raw rows as array of arrays.
      // expoDb.getAllAsync returns array of objects.
      // E.g., [{ idx: 1 }] -> [[1]]
      const result = await expoDb.getAllAsync<Record<string, unknown>>(sql);
      return result.map((row) => Object.values(row));
    },
    close: async () => {
      expoDb.closeSync();
      shared = null;
    },
  };
}
