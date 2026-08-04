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
    halfLifeDays: number = 7
  ): number {
    if (completions.length === 0) return 0;

    // Convert YYYYMMDD to a simple day index for math
    const toDateObj = (d: number) => {
      const s = d.toString();
      return new Date(parseInt(s.substring(0,4)), parseInt(s.substring(4,6))-1, parseInt(s.substring(6,8)));
    };

    const today = toDateObj(todayDate);
    const todayMs = today.getTime();
    const dayMs = 24 * 60 * 60 * 1000;

    const lambda = Math.LN2 / halfLifeDays;

    let score = 0;
    
    // Sort completions ascending by date
    const sorted = [...completions].sort((a, b) => a.localDate - b.localDate);
    
    // Since we're doing EMA, we iterate from oldest to newest.
    // Instead of iterating every single day, we can just apply decay over the gap.
    // However, the simplest way is to sum exp(-lambda * daysAgo).
    
    for (const c of sorted) {
      const cDate = toDateObj(c.localDate);
      const daysAgo = (todayMs - cDate.getTime()) / dayMs;
      if (daysAgo >= 0) {
        // We cap amount at 1 for simplicity of score scaling (0 to 1 max),
        // or we could let it go higher. Assuming amount=1.
        const value = Math.min(1, c.amount); 
        score += value * Math.exp(-lambda * daysAgo);
      }
    }

    // Theoretical maximum score if completed every day to infinity is sum(exp(-lambda * n)) from n=0 to inf
    // sum = 1 / (1 - exp(-lambda))
    const maxScore = 1 / (1 - Math.exp(-lambda));
    
    // Normalize to 0-100%
    return Math.round((score / maxScore) * 100);
  }

  /**
   * Evaluates completion across all goals for a specific date.
   * Merges implicit (activity-based) and explicit (checkin-based) progress.
   */
  async getDailyProgress(localDate: number) {
    // 1. Fetch all active goals
    const goalsRows = await this.db.query.goals.findMany({
      where: (t: any, { isNull, or, and, lte, gt }: any) => 
        and(
          isNull(t.archivedAt),
          lte(t.startedOn, localDate),
          or(isNull(t.endedOn), gt(t.endedOn, localDate))
        )
    });

    if (goalsRows.length === 0) return [];

    // 2. Fetch explicit check-ins for these goals on this date
    const checkinRows = await this.db.query.goalCheckins.findMany({
      where: (t: any, { eq }: any) => eq(t.localDate, localDate)
    });
    const checkinMap = new Map();
    for (const c of checkinRows) {
      checkinMap.set(c.goalId, c.amount);
    }

    // 3. Fetch activities logged on this date
    // We need to see if any entry on this date has an activity tied to an activityId-backed goal.
    const entries = await this.db.query.entries.findMany({
      where: (t: any, { eq, isNull, and }: any) => and(eq(t.localDate, localDate), isNull(t.deletedAt)),
      with: { activities: true }
    });
    
    const loggedActivityIds = new Set<string>();
    for (const e of entries) {
      for (const a of e.activities) {
        loggedActivityIds.add(a.activityId);
      }
    }

    // 4. Merge progress
    const progress = [];
    for (const g of goalsRows) {
      let amount = 0;
      if (g.activityId) {
        // Activity-backed goal
        amount = loggedActivityIds.has(g.activityId) ? 1 : 0;
      } else {
        // Explicit check-in
        amount = checkinMap.get(g.id) ?? 0;
      }
      
      progress.push({
        goal: g,
        amount,
        completed: amount >= g.targetCount
      });
    }

    return progress;
  }
}
