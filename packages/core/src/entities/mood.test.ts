import { describe, expect, it } from "vitest";
import { isMoodGroup, MOOD_GROUPS, type MoodGroup, meanMood, moodScore } from "./mood";

describe("mood groups", () => {
  it("has exactly five, scored 1..5", () => {
    expect(MOOD_GROUPS).toEqual([1, 2, 3, 4, 5]);
  });

  it("scores a group as itself", () => {
    for (const g of MOOD_GROUPS) expect(moodScore(g)).toBe(g);
  });

  it("rejects non-groups", () => {
    expect(isMoodGroup(0)).toBe(false);
    expect(isMoodGroup(6)).toBe(false);
    expect(isMoodGroup(3.5)).toBe(false);
    expect(isMoodGroup(Number.NaN)).toBe(false);
  });
});

describe("meanMood", () => {
  it("averages a day", () => {
    expect(meanMood([4, 3])).toBe(3.5);
    expect(meanMood([5, 5, 5])).toBe(5);
  });

  // A day with no entries is a GAP, not a zero. Returning 0 here would draw a
  // line through a week that never happened — see docs/04.
  it("returns null for an empty day rather than zero", () => {
    expect(meanMood([])).toBeNull();
  });

  it("stays within the ramp", () => {
    const groups: MoodGroup[] = [1, 2, 3, 4, 5];
    const avg = meanMood(groups);
    expect(avg).not.toBeNull();
    expect(avg as number).toBeGreaterThanOrEqual(1);
    expect(avg as number).toBeLessThanOrEqual(5);
  });
});
