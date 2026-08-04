import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { syncColumns } from "./columns";
import { goals } from "./goals";

export const noteTemplates = sqliteTable("note_templates", {
  ...syncColumns,
  name: text("name").notNull(),
  body: text("body").notNull(),
  position: integer("position").notNull(),
  archivedAt: integer("archived_at"),
  /** For people who journal to the same structure every day. */
  useByDefault: integer("use_by_default", { mode: "boolean" }).notNull().default(false),
});

/**
 * Local notifications only. No push, no server — a mood tracker that phones
 * home to remind you is a contradiction.
 */
export const reminders = sqliteTable("reminders", {
  ...syncColumns,
  kind: text("kind", { enum: ["entry", "goal"] }).notNull(),
  minutesOfDay: integer("minutes_of_day").notNull(), // 0..1439, local
  /** Bit 0 = Monday … bit 6 = Sunday. */
  daysMask: integer("days_mask").notNull().default(127),
  enabled: integer("enabled", { mode: "boolean" }).notNull().default(true),
  skipIfLogged: integer("skip_if_logged", { mode: "boolean" }).notNull().default(true),
  message: text("message"),
  goalId: text("goal_id").references(() => goals.id),
});

/**
 * Dates the user never wants resurfaced. Honoured in memories, home cards,
 * widgets and every notification.
 *
 * Not politeness — a surprise notification about the worst day of someone's
 * life is a harm. Nothing is deleted; it is simply never shown unprompted.
 */
export const hiddenDates = sqliteTable("hidden_dates", {
  ...syncColumns,
  /** MMDD for an annual hide, or YYYYMMDD for one specific day. */
  pattern: integer("pattern").notNull(),
  annual: integer("annual", { mode: "boolean" }).notNull().default(true),
});

/** Device-local unless the key appears in the sync allowlist. */
export const settings = sqliteTable("settings", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
  updatedAt: integer("updated_at").notNull(),
});

/**
 * Outbox. Every repository write enqueues here; the sync loop drains it.
 * Present from day one even though sync ships in Phase 4 — retrofitting an
 * op-log after the fact means replaying history you no longer have.
 */
export const syncOps = sqliteTable("sync_ops", {
  localSeq: integer("local_seq").primaryKey({ autoIncrement: true }),
  rowKey: text("row_key").notNull(), // "entries:0192f8a1-…"
  rev: integer("rev").notNull(),
  updatedAt: integer("updated_at").notNull(),
  payload: text("payload").notNull(), // encrypted row snapshot, incl. tombstones
  pushedAt: integer("pushed_at"),
});

export const syncState = sqliteTable("sync_state", {
  key: text("key").primaryKey(), // device_id, server_cursor, last_sync_at
  value: text("value").notNull(),
});
