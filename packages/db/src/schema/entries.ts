import { relations } from "drizzle-orm";
import { index, integer, primaryKey, real, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { syncColumns } from "./columns";
import { activities, moods, scales } from "./taxonomy";

/**
 * An entry has exactly one mood and zero or more activities.
 *
 * THE DATE PROBLEM, SOLVED ONCE — see docs/02-data-model.md.
 *
 * `happenedAt` is UTC epoch millis, for ordering and "how long ago".
 * `localDate` is the calendar day AS THE USER EXPERIENCED IT, stored YYYYMMDD.
 *
 * They are not redundant. `localDate` is computed once, at write time, from
 * the device's then-current timezone and the user's day-cutoff, and is NEVER
 * recomputed. Derive the day from `happenedAt` at read time instead and a user
 * who flies to another timezone watches their calendar and streaks silently
 * rewrite themselves.
 *
 * Every day-bucketed query — calendar, Year in Pixels, streaks, daily averages
 * — groups by `localDate`.
 */
export const entries = sqliteTable(
  "entries",
  {
    ...syncColumns,
    moodId: text("mood_id")
      .notNull()
      .references(() => moods.id),
    happenedAt: integer("happened_at").notNull(),
    localDate: integer("local_date").notNull(),
    tzOffsetMinutes: integer("tz_offset_minutes").notNull(),
    title: text("title"),
    note: text("note"),
  },
  (t) => [index("idx_entries_date").on(t.localDate), index("idx_entries_mood").on(t.moodId)],
);

/**
 * Owned by its entry and synced as part of the entry aggregate, so it carries
 * no soft-delete of its own. Merging these independently would produce entries
 * with activities from one device and a note from another — coherent-looking
 * and wrong. See docs/07-sync.md#conflict-resolution.
 */
export const entryActivities = sqliteTable(
  "entry_activities",
  {
    entryId: text("entry_id")
      .notNull()
      .references(() => entries.id),
    activityId: text("activity_id")
      .notNull()
      .references(() => activities.id),
  },
  (t) => [
    primaryKey({ columns: [t.entryId, t.activityId] }),
    index("idx_ea_activity").on(t.activityId),
  ],
);

export const entryScales = sqliteTable(
  "entry_scales",
  {
    entryId: text("entry_id")
      .notNull()
      .references(() => entries.id),
    scaleId: text("scale_id")
      .notNull()
      .references(() => scales.id),
    value: real("value").notNull(),
  },
  (t) => [primaryKey({ columns: [t.entryId, t.scaleId] })],
);

/**
 * Binaries live on the filesystem (Android) or OPFS (web) — never as BLOBs.
 * Rows are pointers. Otherwise every backup, query plan and sync payload
 * carries megabytes it does not need.
 *
 * Readers must tolerate a missing file and render a placeholder: rows may be
 * tombstoned before the reaper collects their bytes.
 */
export const media = sqliteTable(
  "media",
  {
    ...syncColumns,
    entryId: text("entry_id")
      .notNull()
      .references(() => entries.id),
    kind: text("kind", { enum: ["photo", "audio"] }).notNull(),
    relPath: text("rel_path").notNull(),
    mime: text("mime").notNull(),
    byteSize: integer("byte_size").notNull(),
    width: integer("width"),
    height: integer("height"),
    durationMs: integer("duration_ms"),
    /** On-device only, opt-in. Feeds full-text search when present. */
    transcript: text("transcript"),
    position: integer("position").notNull().default(0),
  },
  (t) => [index("idx_media_entry").on(t.entryId, t.position)],
);

/**
 * Materialised per-day rollup. Makes the calendar, Year in Pixels and streak
 * queries O(days) instead of O(entries).
 *
 * A CACHE, never truth. Recomputed inside the same transaction as any entry
 * write, and fully rebuildable. If it ever disagrees with `entries`,
 * `entries` wins.
 */
export const dayStats = sqliteTable("day_stats", {
  localDate: integer("local_date").primaryKey(),
  entryCount: integer("entry_count").notNull(),
  avgMood: real("avg_mood").notNull(),
  dominantMoodId: text("dominant_mood_id"),
});

export const entriesRelations = relations(entries, ({ one, many }) => ({
  mood: one(moods, { fields: [entries.moodId], references: [moods.id] }),
  activities: many(entryActivities),
  scales: many(entryScales),
  media: many(media),
}));

export const entryActivitiesRelations = relations(entryActivities, ({ one }) => ({
  entry: one(entries, { fields: [entryActivities.entryId], references: [entries.id] }),
  activity: one(activities, { fields: [entryActivities.activityId], references: [activities.id] }),
}));

export const entryScalesRelations = relations(entryScales, ({ one }) => ({
  entry: one(entries, { fields: [entryScales.entryId], references: [entries.id] }),
  scale: one(scales, { fields: [entryScales.scaleId], references: [scales.id] }),
}));

export const mediaRelations = relations(media, ({ one }) => ({
  entry: one(entries, { fields: [media.entryId], references: [entries.id] }),
}));
