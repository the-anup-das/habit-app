/**
 * Query operators, re-exported.
 *
 * Apps talk to repositories (task #7), not to Drizzle — but where they must
 * build a query, they get the operators from here. Only @chapter/db depends on
 * the ORM, so swapping it later is one package's problem rather than two apps'.
 */
export { and, asc, count, desc, eq, gte, inArray, isNull, lte, or, sql } from "drizzle-orm";
export { type MigrationResult, type MigrationRunner, runMigrations } from "./migrate";
export { MIGRATIONS } from "./migrations";
export * from "./repositories/base";
export * from "./repositories/entries";
export { GoalsRepository } from "./repositories/goals";
export * from "./repositories/import";
export * from "./repositories/taxonomy";
export * as schema from "./schema";
export * from "./schema";
