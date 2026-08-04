/**
 * The five mood groups.
 *
 * The group supplies the colour and the numeric score; a mood supplies only a
 * name and an icon. That separation is what lets someone invent "wired",
 * "hollow" or "content" and still get an average that means something.
 *
 * The count is fixed at five and the scores are immutable. They are the only
 * thing making one person's mood comparable across years — and comparable at
 * all between a user's own idiosyncratic vocabulary. See docs/02-data-model.md.
 */
export const MOOD_GROUPS = [1, 2, 3, 4, 5] as const;

export type MoodGroup = (typeof MOOD_GROUPS)[number];

/** Stable i18n keys. Users may rename the display label; these never change. */
export const MOOD_GROUP_KEYS: Readonly<Record<MoodGroup, string>> = {
  1: "mood.awful",
  2: "mood.bad",
  3: "mood.meh",
  4: "mood.good",
  5: "mood.rad",
};

/**
 * Directional glyph, so mood is never encoded by colour alone.
 * WCAG 1.4.1, and the whole point of a colour-blind-safe ramp.
 */
export const MOOD_GROUP_GLYPHS: Readonly<Record<MoodGroup, string>> = {
  1: "▽",
  2: "◁",
  3: "○",
  4: "▷",
  5: "△",
};

export function isMoodGroup(value: number): value is MoodGroup {
  return Number.isInteger(value) && value >= 1 && value <= 5;
}

/**
 * A mood's score IS its group. Kept as a function rather than a field so no
 * caller is ever tempted to store a score that has drifted from its group.
 */
export function moodScore(group: MoodGroup): MoodGroup {
  return group;
}

/**
 * Mean mood across entries, as a plain number.
 *
 * Callers must pass entries for ONE day. Period-level averages are the mean of
 * daily averages, never the mean of every entry — otherwise a chatty day with
 * nine entries outvotes six quiet ones. See docs/04-features-browse-stats.md.
 *
 * Returns null for an empty day: a day with no entries is a gap, and a gap is
 * not zero. Rendering it as zero would draw a line through a week that never
 * happened.
 */
export function meanMood(groups: readonly MoodGroup[]): number | null {
  if (groups.length === 0) return null;
  let total = 0;
  for (const g of groups) total += g;
  return total / groups.length;
}
