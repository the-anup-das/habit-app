import { blob, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const syncOps = sqliteTable("sync_ops", {
  localSeq: integer("local_seq", { mode: "number" }).primaryKey({ autoIncrement: true }),
  rowKey: text("row_key").notNull(),
  rev: integer("rev").notNull(),
  updatedAt: integer("updated_at", { mode: "number" }).notNull(),
  payload: blob("payload").notNull(), // encrypted row snapshot (incl. tombstones)
  pushedAt: integer("pushed_at", { mode: "number" }),
});

export const syncState = sqliteTable("sync_state", {
  key: text("key").primaryKey(), // 'device_id', 'server_cursor', 'last_sync_at', 'master_key_wrapped'
  value: text("value"),
});
