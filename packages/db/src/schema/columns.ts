import { integer, text } from "drizzle-orm/sqlite-core";

/**
 * Every user-owned table carries these five. Do not omit them "for now" —
 * retrofitting sync metadata later means rewriting every query.
 *
 * See docs/02-data-model.md#cross-cutting-conventions.
 */
export const syncColumns = {
  /** UUIDv7 — time-sortable, generated client-side, safe across devices. */
  id: text("id").primaryKey(),
  createdAt: integer("created_at").notNull(),
  /** Bumped on every write. Drives last-write-wins merge. */
  updatedAt: integer("updated_at").notNull(),
  /**
   * Tombstone. NOTHING is ever hard-deleted — without this, sync cannot
   * propagate a deletion and a restore resurrects what the user removed.
   * Every read filters `deletedAt IS NULL`.
   */
  deletedAt: integer("deleted_at"),
  /** Monotonic per-row revision, for conflict detection. */
  rev: integer("rev").notNull().default(1),
} as const;

/**
 * Hidden from pickers and from "current" statistics, but every historical
 * entry keeps it. Archiving is how taxonomy is removed; deleting an item that
 * is in use is refused outright.
 */
export const archivable = {
  archivedAt: integer("archived_at"),
} as const;
