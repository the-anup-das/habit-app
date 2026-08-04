import { MIGRATIONS } from "./migrations";

const LEDGER = "__chapter_migrations";

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
 *
 * Migrations are plain `CREATE TABLE`, so running them twice fails with
 * "table already exists" — which is exactly what a persistent database does on
 * its second boot. The ledger is what makes startup idempotent.
 *
 * Statements are identified by index, so they are append-only: never reorder or
 * edit a released migration, only add. Editing one leaves existing databases on
 * the old shape while fresh ones get the new shape — the worst outcome,
 * because both look fine locally.
 */
export async function runMigrations(runner: MigrationRunner): Promise<MigrationResult> {
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
  return { applied: count, total: MIGRATIONS.length };
}
