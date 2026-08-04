import { relations } from "drizzle-orm";
import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { archivable, syncColumns } from "./columns";

/**
 * Fixed, seeded, not user-deletable. Drives colour AND numeric score.
 *
 * A mood's score comes from its group, never from the mood itself. That is
 * what lets a user invent "anxious" and "content" and still get a coherent
 * average. Users may rename these; they may never change the count or scores.
 */
export const moodGroups = sqliteTable("mood_groups", {
  id: integer("id").primaryKey(), // 1..5
  score: integer("score").notNull(), // awful=1 … rad=5
  nameKey: text("name_key").notNull(), // i18n key, not a literal
});

export const moods = sqliteTable(
  "moods",
  {
    ...syncColumns,
    ...archivable,
    groupId: integer("group_id")
      .notNull()
      .references(() => moodGroups.id),
    name: text("name").notNull(),
    iconId: text("icon_id").notNull(),
    position: integer("position").notNull(),
    isPredefined: integer("is_predefined", { mode: "boolean" }).notNull().default(false),
  },
  (t) => [index("idx_moods_group").on(t.groupId, t.position)],
);

export const activityGroups = sqliteTable("activity_groups", {
  ...syncColumns,
  ...archivable,
  name: text("name").notNull(),
  position: integer("position").notNull(),
});

export const activities = sqliteTable(
  "activities",
  {
    ...syncColumns,
    ...archivable,
    groupId: text("group_id").references(() => activityGroups.id),
    name: text("name").notNull(),
    iconId: text("icon_id").notNull(),
    position: integer("position").notNull(),
  },
  (t) => [index("idx_activities_group").on(t.groupId, t.position)],
);

/**
 * Sliders: sleep, stress, energy, pain, plus custom.
 *
 * `higherIsBetter` is load-bearing, not cosmetic — without it a pain chart
 * turns golden as the user gets worse, telling them the opposite of the truth.
 * The UI reads it directly (see .slider[data-polarity] in the design system).
 */
export const scales = sqliteTable("scales", {
  ...syncColumns,
  ...archivable,
  name: text("name").notNull(),
  iconId: text("icon_id").notNull(),
  minValue: integer("min_value").notNull().default(1),
  maxValue: integer("max_value").notNull().default(5),
  step: integer("step").notNull().default(1),
  minLabel: text("min_label"),
  maxLabel: text("max_label"),
  unit: text("unit"),
  higherIsBetter: integer("higher_is_better", { mode: "boolean" }).notNull().default(true),
  /** Off by default — seven sliders would destroy the two-tap loop. */
  enabled: integer("enabled", { mode: "boolean" }).notNull().default(false),
  position: integer("position").notNull(),
});

export const moodGroupsRelations = relations(moodGroups, ({ many }) => ({
  moods: many(moods),
}));

export const moodsRelations = relations(moods, ({ one }) => ({
  group: one(moodGroups, { fields: [moods.groupId], references: [moodGroups.id] }),
}));

export const activityGroupsRelations = relations(activityGroups, ({ many }) => ({
  activities: many(activities),
}));

export const activitiesRelations = relations(activities, ({ one }) => ({
  group: one(activityGroups, { fields: [activities.groupId], references: [activityGroups.id] }),
}));
