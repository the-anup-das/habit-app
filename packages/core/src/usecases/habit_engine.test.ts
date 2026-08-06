import { describe, expect, it } from "vitest";
import { HabitEngine } from "./habit_engine";

describe("HabitEngine", () => {
  it("calculates strength score correctly with EMA decay over historical dates", () => {
    const engine = new HabitEngine({});

    // No completions = 0 score
    expect(engine.calculateStrengthScore([], 20260806)).toBe(0);

    // Completion today should give an initial positive score
    const scoreToday = engine.calculateStrengthScore(
      [{ localDate: 20260806, amount: 1 }],
      20260806,
      7,
    );
    expect(scoreToday).toBeGreaterThan(0);

    // Completions across multiple historical days should yield a higher score than a single completion
    const scoreMulti = engine.calculateStrengthScore(
      [
        { localDate: 20260806, amount: 1 },
        { localDate: 20260805, amount: 1 },
        { localDate: 20260804, amount: 1 },
        { localDate: 20260803, amount: 1 },
      ],
      20260806,
      7,
    );
    expect(scoreMulti).toBeGreaterThan(scoreToday);
  });

  it("getDailyProgress retrieves 30-day historical check-ins and computes strength scores", async () => {
    const mockDb = {
      query: {
        goals: {
          findMany: async () => [
            {
              id: "goal-1",
              name: "Drink Water",
              targetCount: 1,
              targetType: "daily",
              startedOn: 20260701,
              archivedAt: null,
              endedOn: null,
              activityId: null,
            },
            {
              id: "goal-2",
              name: "Exercise",
              targetCount: 1,
              targetType: "daily",
              startedOn: 20260701,
              archivedAt: null,
              endedOn: null,
              activityId: "act-run",
            },
          ],
        },
        goalCheckins: {
          findMany: async () => [
            { goalId: "goal-1", localDate: 20260806, amount: 1 },
            { goalId: "goal-1", localDate: 20260805, amount: 1 },
            { goalId: "goal-1", localDate: 20260801, amount: 1 },
          ],
        },
        entries: {
          findMany: async () => [
            {
              id: "e1",
              localDate: 20260806,
              deletedAt: null,
              activities: [{ activityId: "act-run" }],
            },
            {
              id: "e2",
              localDate: 20260804,
              deletedAt: null,
              activities: [{ activityId: "act-run" }],
            },
          ],
        },
      },
    };

    const engine = new HabitEngine(mockDb as any);
    const progress = await engine.getDailyProgress(20260806, 365);

    expect(progress).toHaveLength(2);

    // Goal 1: Explicit checkins
    const p0 = progress[0]!;
    expect(p0.goal.id).toBe("goal-1");
    expect(p0.amount).toBe(1);
    expect(p0.completed).toBe(true);
    expect(p0.strengthScore).toBeGreaterThan(10);
    expect(p0.scores.d7).toBeGreaterThan(0);
    expect(p0.scores.d30).toBeGreaterThan(0);
    expect(p0.scores.d365).toBeGreaterThan(0);
    expect(p0.streaks.current).toBe(2); // 20260806 and 20260805 are consecutive
    expect(p0.streaks.longest).toBeGreaterThanOrEqual(2);
    expect(p0.history.d7).toHaveLength(7);
    expect(p0.history.d30).toHaveLength(30);
    expect(p0.history.d365).toHaveLength(365);
    expect(p0.history.monthly.length).toBeGreaterThan(0);

    // Goal 2: Activity backed goal
    const p1 = progress[1]!;
    expect(p1.goal.id).toBe("goal-2");
    expect(p1.amount).toBe(1);
    expect(p1.completed).toBe(true);
    expect(p1.strengthScore).toBeGreaterThan(0);
    expect(p1.streaks.current).toBe(1); // Only 20260806 and 20260804 (gap on 05)
    expect(p1.history.d7).toHaveLength(7);
  });
});
