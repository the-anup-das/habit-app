import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { blob, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const changes = sqliteTable("changes", {
  seq: integer("seq", { mode: "number" }).primaryKey({ autoIncrement: true }),
  userId: text("user_id").notNull(),
  rowKey: text("row_key").notNull(),
  rev: integer("rev").notNull(),
  updatedAt: integer("updated_at", { mode: "number" }).notNull(),
  deviceId: text("device_id").notNull(),
  nonce: text("nonce").notNull(), // Base64
  ciphertext: text("ciphertext").notNull(), // Base64
});

export const blobs = sqliteTable("blobs", {
  hash: text("hash").primaryKey(), // SHA-256 of plaintext
  userId: text("user_id").notNull(),
  ciphertext: blob("ciphertext").notNull(),
  size: integer("size").notNull(),
});

const sqlite = new Database("sync.db");
sqlite.pragma("journal_mode = WAL");
export const db = drizzle(sqlite, { schema: { changes, blobs } });
