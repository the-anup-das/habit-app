import { MIGRATIONS } from "./migrations";

const LEDGER = "__chapter_migrations";
const migratedRunners = new WeakSet<object>();

export interface MigrationRunner {
  exec(sql: string): Promise<void>;
  query(sql: string): Promise<unknown[][]>;
}

export interface MigrationResult {
  readonly applied: number;
  readonly total: number;
}

/**
 * Applies only the statements this database has not seen.
 * Caches completion per runner instance in memory for rapid subsequent calls.
 */
export async function runMigrations(runner: MigrationRunner): Promise<MigrationResult> {
  if (typeof runner === "object" && runner !== null && migratedRunners.has(runner as object)) {
    return { applied: 0, total: MIGRATIONS.length };
  }

  await runner.exec(
    `CREATE TABLE IF NOT EXISTS ${LEDGER} (idx INTEGER PRIMARY KEY, applied_at INTEGER NOT NULL)`,
  );

  const rows = await runner.query(`SELECT idx FROM ${LEDGER}`);
  const applied = new Set<number>(rows.map((r) => Number(r[0])));

  let count = 0;
  for (let i = 0; i < MIGRATIONS.length; i++) {
    if (applied.has(i)) continue;
    const sql = MIGRATIONS[i];
    if (sql === undefined) continue;
    await runner.exec(sql);
    await runner.exec(`INSERT INTO ${LEDGER} (idx, applied_at) VALUES (${i}, ${Date.now()})`);
    count++;
  }

  if (typeof runner === "object" && runner !== null) {
    migratedRunners.add(runner as object);
  }

  return { applied: count, total: MIGRATIONS.length };
}
