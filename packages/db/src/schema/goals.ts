import { index, integer, real, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";
import { syncColumns } from "./columns";
import { activities } from "./taxonomy";

/**
 * Activity-backed goals derive progress from `entry_activities` — logging the
 * activity advances the goal, with no duplicate bookkeeping. That is what makes
 * goals feel effortless rather than like a second app.
 *
 * Only goals with `activityId IS NULL` write `goalCheckins`.
 */
export const goals = sqliteTable("goals", {
  ...syncColumns,
  name: text("name").notNull(),
  activityId: text("activity_id").references(() => activities.id),
  iconId: text("icon_id").notNull(),
  targetType: text("target_type", {
    enum: ["daily", "weekly", "monthly", "interval"],
  }).notNull(),
  targetCount: integer("target_count").notNull().default(1),
  intervalDays: integer("interval_days"),
  startedOn: integer("started_on").notNull(), // YYYYMMDD
  endedOn: integer("ended_on"),
  archivedAt: integer("archived_at"),

  /** The Approach — see docs/12-goal-library.md. */
  templateKey: text("template_key"),
  /** Implementation intention: "After [routine], I will [behaviour]". */
  anchor: text("anchor"),
  /** Position on the goal's ladder. Advances on consistency, never on a date. */
  ladderLevel: integer("ladder_level").notNull().default(1),
  /** strong | moderate | practical — shown in the UI, never implied. */
  evidence: text("evidence", { enum: ["strong", "moderate", "practical"] }),
});

export const goalCheckins = sqliteTable(
  "goal_checkins",
  {
    ...syncColumns,
    goalId: text("goal_id")
      .notNull()
      .references(() => goals.id),
    localDate: integer("local_date").notNull(),
    amount: real("amount").notNull().default(1),
  },
  (t) => [uniqueIndex("idx_checkin_unique").on(t.goalId, t.localDate)],
);

/**
 * Vacation mode. Paused periods are excluded from numerator AND denominator;
 * the streak bridges them rather than resetting. Illness and holidays must not
 * destroy a 200-day streak.
 */
export const goalPauses = sqliteTable("goal_pauses", {
  ...syncColumns,
  goalId: text("goal_id")
    .notNull()
    .references(() => goals.id),
  fromDate: integer("from_date").notNull(),
  toDate: integer("to_date").notNull(),
  reason: text("reason"),
});

/**
 * Quit trackers. `quitAttempts` as real rows — not a list of ints — is what
 * lets us plot attempt-length over time and correlate abstinence against mood.
 */
export const quitTrackers = sqliteTable("quit_trackers", {
  ...syncColumns,
  presetKey: text("preset_key"),
  /** Which cited milestone set drives this tracker (vaping → "smoking"). */
  milestoneSet: text("milestone_set"),
  name: text("name").notNull(),
  iconId: text("icon_id").notNull(),
  color: text("color"),
  unitCost: real("unit_cost"),
  unitsPerDay: real("units_per_day"),
  hoursPerDay: real("hours_per_day"),
});

/** Every attempt, kept forever. A relapse restarts the counter, never the record. */
export const quitAttempts = sqliteTable(
  "quit_attempts",
  {
    ...syncColumns,
    trackerId: text("tracker_id")
      .notNull()
      .references(() => quitTrackers.id),
    startedAt: integer("started_at").notNull(),
    endedAt: integer("ended_at"), // NULL = current run
    note: text("note"),
  },
  (t) => [index("idx_attempts_tracker").on(t.trackerId, t.startedAt)],
);

export const achievements = sqliteTable("achievements", {
  code: text("code").primaryKey(),
  level: integer("level").notNull().default(0),
  progress: real("progress").notNull().default(0),
  unlockedAt: integer("unlocked_at"),
  /** So we celebrate exactly once. */
  seenAt: integer("seen_at"),
  updatedAt: integer("updated_at").notNull(),
  rev: integer("rev").notNull().default(1),
});

export const importantDays = sqliteTable("important_days", {
  ...syncColumns,
  name: text("name").notNull(),
  iconId: text("icon_id").notNull(),
  color: text("color"),
  date: integer("date").notNull(), // YYYYMMDD
  kind: text("kind", { enum: ["countdown", "countup", "anniversary"] }).notNull(),
  repeatYearly: integer("repeat_yearly", { mode: "boolean" }).notNull().default(false),
  pinned: integer("pinned", { mode: "boolean" }).notNull().default(false),
});
