function toDateObj(d: number): Date {
  const s = d.toString();
  return new Date(
    parseInt(s.substring(0, 4), 10),
    parseInt(s.substring(4, 6), 10) - 1,
    parseInt(s.substring(6, 8), 10),
  );
}

function fromDateObj(d: Date): number {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return Number(`${y}${m}${day}`);
}

const DAYS_OF_WEEK = ["S", "M", "T", "W", "T", "F", "S"];
const MONTHS_OF_YEAR = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

function getDayLabel(d: Date): string {
  return DAYS_OF_WEEK[d.getDay()] || "";
}

function getMonthLabel(monthIndex: number): string {
  return MONTHS_OF_YEAR[monthIndex] || "";
}

export interface GoalHistoryPoint {
  localDate: number;
  completed: boolean;
  amount: number;
  dayLabel: string;
}

export interface GoalProgressResult {
  goal: any;
  amount: number;
  completed: boolean;
  strengthScore: number;
  scores: {
    d7: number;
    d30: number;
    d365: number;
  };
  streaks: {
    current: number;
    longest: number;
  };
  history: {
    d7: GoalHistoryPoint[];
    d30: GoalHistoryPoint[];
    d365: GoalHistoryPoint[];
    monthly: { label: string; yearMonth: number; rate: number; count: number; total: number }[];
  };
}

export class HabitEngine {
  constructor(private readonly db: any) {}

  /**
   * Calculates the Strength Score for a habit.
   * Uses an exponentially weighted moving average.
   * If `halfLifeDays` is 7, missing 7 days drops the score by 50%.
   */
  calculateStrengthScore(
    completions: { localDate: number; amount: number }[],
    todayDate: number, // YYYYMMDD
    halfLifeDays: number = 7,
  ): number {
    if (completions.length === 0) return 0;

    const today = toDateObj(todayDate);
    const todayMs = today.getTime();
    const dayMs = 24 * 60 * 60 * 1000;

    const lambda = Math.LN2 / halfLifeDays;

    let score = 0;

    // Sort completions ascending by date
    const sorted = [...completions].sort((a, b) => a.localDate - b.localDate);

    // Since we're doing EMA, we iterate from oldest to newest.
    for (const c of sorted) {
      const cDate = toDateObj(c.localDate);
      const daysAgo = (todayMs - cDate.getTime()) / dayMs;
      if (daysAgo >= 0) {
        const value = Math.min(1, c.amount);
        score += value * Math.exp(-lambda * daysAgo);
      }
    }

    const maxScore = 1 / (1 - Math.exp(-lambda));

    // Normalize to 0-100%
    return Math.round((score / maxScore) * 100);
  }

  /**
   * Evaluates completion across all goals for a specific date and computes
   * historical strength scores, streaks, and graphs for 7d, 30d, and 365d timeframes.
   */
  async getDailyProgress(
    localDate: number,
    historyDays: number = 365,
  ): Promise<GoalProgressResult[]> {
    // 1. Fetch all active goals
    const goalsRows = await this.db.query.goals.findMany({
      where: (t: any, { isNull, or, and, lte, gt }: any) =>
        and(
          isNull(t.archivedAt),
          lte(t.startedOn, localDate),
          or(isNull(t.endedOn), gt(t.endedOn, localDate)),
        ),
    });

    if (goalsRows.length === 0) return [];

    // Build a date sequence of historyDays length ending at localDate
    const endObj = toDateObj(localDate);
    const dateSequence: { localDate: number; dayLabel: string; month: number; year: number }[] = [];
    for (let i = historyDays - 1; i >= 0; i--) {
      const d = new Date(endObj.getFullYear(), endObj.getMonth(), endObj.getDate() - i);
      const dateNum = fromDateObj(d);
      dateSequence.push({
        localDate: dateNum,
        dayLabel: getDayLabel(d),
        month: d.getMonth(),
        year: d.getFullYear(),
      });
    }
    const startDate = dateSequence[0]?.localDate ?? localDate;

    // 2. Fetch explicit check-ins for these goals over the historical timeframe [startDate, localDate]
    const checkinRows = await this.db.query.goalCheckins.findMany({
      where: (t: any, { and, gte, lte }: any) =>
        and(gte(t.localDate, startDate), lte(t.localDate, localDate)),
    });
    const checkinCompletionsMap = new Map<string, { localDate: number; amount: number }[]>();
    const todayCheckinMap = new Map<string, number>();
    for (const c of checkinRows) {
      if (!checkinCompletionsMap.has(c.goalId)) {
        checkinCompletionsMap.set(c.goalId, []);
      }
      checkinCompletionsMap.get(c.goalId)!.push({ localDate: c.localDate, amount: c.amount });

      if (c.localDate === localDate) {
        todayCheckinMap.set(c.goalId, c.amount);
      }
    }

    // 3. Fetch activities logged over the historical timeframe [startDate, localDate]
    const entries = await this.db.query.entries.findMany({
      where: (t: any, { isNull, and, gte, lte }: any) =>
        and(isNull(t.deletedAt), gte(t.localDate, startDate), lte(t.localDate, localDate)),
      with: { activities: true },
    });

    const activityCompletionsMap = new Map<string, Map<number, number>>(); // activityId -> Map<localDate, count>
    const loggedTodayActivityIds = new Set<string>();

    for (const e of entries) {
      for (const a of e.activities || []) {
        if (!activityCompletionsMap.has(a.activityId)) {
          activityCompletionsMap.set(a.activityId, new Map());
        }
        const dateMap = activityCompletionsMap.get(a.activityId)!;
        dateMap.set(e.localDate, (dateMap.get(e.localDate) || 0) + 1);

        if (e.localDate === localDate) {
          loggedTodayActivityIds.add(a.activityId);
        }
      }
    }

    // 4. Merge progress and compute multi-timeframe stats & graphs
    const progress: GoalProgressResult[] = [];
    for (const g of goalsRows) {
      let amount = 0;
      let completions: { localDate: number; amount: number }[] = [];

      if (g.activityId) {
        // Activity-backed goal
        amount = loggedTodayActivityIds.has(g.activityId) ? 1 : 0;
        const dateMap = activityCompletionsMap.get(g.activityId);
        if (dateMap) {
          completions = Array.from(dateMap.entries()).map(([date, cnt]) => ({
            localDate: date,
            amount: cnt > 0 ? 1 : 0,
          }));
        }
      } else {
        // Explicit check-in
        amount = todayCheckinMap.get(g.id) ?? 0;
        completions = checkinCompletionsMap.get(g.id) ?? [];
      }

      const compMap = new Map<number, number>();
      for (const c of completions) {
        compMap.set(c.localDate, c.amount);
      }

      // Build full daily history over the sequence
      const fullHistory: GoalHistoryPoint[] = dateSequence.map((ds) => {
        const amt = compMap.get(ds.localDate) || 0;
        return {
          localDate: ds.localDate,
          completed: amt >= (g.targetCount || 1) || amt > 0,
          amount: amt,
          dayLabel: ds.dayLabel,
        };
      });

      const d7 = fullHistory.slice(-7);
      const d30 = fullHistory.slice(-30);
      const d365 = fullHistory.slice(-365);

      // Compute monthly aggregation (last 12 months in sequence)
      const monthlyMap = new Map<
        number,
        { label: string; yearMonth: number; count: number; total: number }
      >();
      for (const ds of dateSequence) {
        const yearMonth = ds.year * 100 + (ds.month + 1);
        if (!monthlyMap.has(yearMonth)) {
          monthlyMap.set(yearMonth, {
            label: `${getMonthLabel(ds.month)} '${String(ds.year).slice(-2)}`,
            yearMonth,
            count: 0,
            total: 0,
          });
        }
        const m = monthlyMap.get(yearMonth)!;
        m.total += 1;
        const amt = compMap.get(ds.localDate) || 0;
        if (amt > 0 || amt >= (g.targetCount || 1)) {
          m.count += 1;
        }
      }
      const monthly = Array.from(monthlyMap.values())
        .map((m) => ({
          ...m,
          rate: m.total > 0 ? Math.round((m.count / m.total) * 100) : 0,
        }))
        .slice(-12);

      // Compute Streaks over fullHistory
      let currentStreak = 0;
      let longestStreak = 0;
      let tempStreak = 0;

      // Calculate longest streak forwards
      for (const pt of fullHistory) {
        if (pt.completed) {
          tempStreak += 1;
          if (tempStreak > longestStreak) longestStreak = tempStreak;
        } else {
          tempStreak = 0;
        }
      }

      // Calculate current streak backwards
      // If completed today, count backwards from today. If not completed today, start counting from yesterday.
      let idx = fullHistory.length - 1;
      if (idx >= 0 && !fullHistory[idx]?.completed) {
        idx -= 1;
      }
      while (idx >= 0 && fullHistory[idx]?.completed) {
        currentStreak += 1;
        idx -= 1;
      }
      if (currentStreak > longestStreak) longestStreak = currentStreak;

      // Calculate strength scores for 7, 30, and 365 days
      const d7Completions = completions.filter((c) => c.localDate >= (d7[0]?.localDate ?? 0));
      const d30Completions = completions.filter((c) => c.localDate >= (d30[0]?.localDate ?? 0));

      const score7 = this.calculateStrengthScore(d7Completions, localDate, 3);
      const score30 = this.calculateStrengthScore(d30Completions, localDate, 7);
      const score365 = this.calculateStrengthScore(completions, localDate, 30);

      progress.push({
        goal: g,
        amount,
        completed: amount >= (g.targetCount || 1) || amount > 0,
        strengthScore: score30,
        scores: { d7: score7, d30: score30, d365: score365 },
        streaks: { current: currentStreak, longest: longestStreak },
        history: { d7, d30, d365, monthly },
      });
    }

    return progress;
  }
}
