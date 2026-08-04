import type { PopulatedEntry } from "./basic";

// A single activity influence result
export interface ActivityInfluence {
  activityId: string;
  activityName: string;
  withWithout: number;
  sameDay: number;
  prevDay: number;
  nextDay: number;
  confidence: "HIGH" | "MEDIUM" | "LOW";
  isPositive: boolean;
  occurrences: number;
}

// Math utils for Welch's t-test
function mean(arr: number[]) {
  if (arr.length === 0) return 0;
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

function variance(arr: number[], m: number) {
  if (arr.length <= 1) return 0;
  return arr.reduce((a, b) => a + (b - m) ** 2, 0) / (arr.length - 1);
}

// Simplistic approximation of two-tailed p-value for Student's t-distribution
// Since this is just for confidence gating, we only need a rough approximation
function pValueApprox(t: number, df: number): number {
  const tSq = t * t;
  const _x = df / (df + tSq);
  // Approximation of incomplete beta function is complex,
  // For large df (df > 30), t-distribution approaches normal distribution
  // We'll use a very simplified rough threshold map since we only care about p<0.05 and p<0.01
  const tAbs = Math.abs(t);

  if (df >= 30) {
    if (tAbs >= 2.576) return 0.005;
    if (tAbs >= 1.96) return 0.04;
    return 0.1;
  } else if (df >= 10) {
    if (tAbs >= 3.169) return 0.005; // df=10, p=0.01 threshold is ~3.169
    if (tAbs >= 2.228) return 0.04; // df=10, p=0.05 threshold is ~2.228
    return 0.1;
  }
  return 1.0;
}

export function calculateInfluenceOnMood(entries: PopulatedEntry[]): ActivityInfluence[] {
  // 1. Setup global sets and averages
  const daysMap = new Map<number, number[]>(); // localDate -> scores
  const allActivities = new Map<string, string>(); // id -> name

  for (const e of entries) {
    if (!daysMap.has(e.localDate)) daysMap.set(e.localDate, []);
    daysMap.get(e.localDate)?.push(e.mood.score);

    for (const act of e.activities) {
      allActivities.set(act.activityId, act.activity.name);
    }
  }

  const avgMoodByDay = new Map<number, number>();
  for (const [day, scores] of daysMap.entries()) {
    avgMoodByDay.set(day, mean(scores));
  }

  const allDays = Array.from(avgMoodByDay.keys()).sort();
  const getPrevDay = (d: number) => {
    const dStr = d.toString();
    const date = new Date(
      parseInt(dStr.slice(0, 4), 10),
      parseInt(dStr.slice(4, 6), 10) - 1,
      parseInt(dStr.slice(6, 8), 10),
    );
    date.setDate(date.getDate() - 1);
    return date.getFullYear() * 10000 + (date.getMonth() + 1) * 100 + date.getDate();
  };
  const getNextDay = (d: number) => {
    const dStr = d.toString();
    const date = new Date(
      parseInt(dStr.slice(0, 4), 10),
      parseInt(dStr.slice(4, 6), 10) - 1,
      parseInt(dStr.slice(6, 8), 10),
    );
    date.setDate(date.getDate() + 1);
    return date.getFullYear() * 10000 + (date.getMonth() + 1) * 100 + date.getDate();
  };

  const results: ActivityInfluence[] = [];

  // 2. Iterate each activity
  for (const [actId, actName] of allActivities.entries()) {
    // Entries with/without
    const ePlus = entries
      .filter((e) => e.activities.some((a) => a.activityId === actId))
      .map((e) => e.mood.score);
    const eMinus = entries
      .filter((e) => !e.activities.some((a) => a.activityId === actId))
      .map((e) => e.mood.score);
    const withWithout = mean(ePlus) - mean(eMinus);

    // Days with/without
    const daysWithAct = new Set(
      entries
        .filter((e) => e.activities.some((a) => a.activityId === actId))
        .map((e) => e.localDate),
    );
    const dPlus = Array.from(daysWithAct).map((d) => avgMoodByDay.get(d)!);
    const dMinus = allDays.filter((d) => !daysWithAct.has(d)).map((d) => avgMoodByDay.get(d)!);
    const sameDay = mean(dPlus) - mean(dMinus);

    // Prev day
    const prevDaysPlus = Array.from(daysWithAct)
      .map((d) => getPrevDay(d))
      .filter((d) => avgMoodByDay.has(d))
      .map((d) => avgMoodByDay.get(d)!);
    const prevDaysMinus = allDays
      .filter((d) => !daysWithAct.has(d))
      .map((d) => getPrevDay(d))
      .filter((d) => avgMoodByDay.has(d))
      .map((d) => avgMoodByDay.get(d)!);
    const prevDayDiff = mean(prevDaysPlus) - mean(prevDaysMinus);

    // Next day
    const nextDaysPlus = Array.from(daysWithAct)
      .map((d) => getNextDay(d))
      .filter((d) => avgMoodByDay.has(d))
      .map((d) => avgMoodByDay.get(d)!);
    const nextDaysMinus = allDays
      .filter((d) => !daysWithAct.has(d))
      .map((d) => getNextDay(d))
      .filter((d) => avgMoodByDay.has(d))
      .map((d) => avgMoodByDay.get(d)!);
    const nextDayDiff = mean(nextDaysPlus) - mean(nextDaysMinus);

    // 3. Confidence level (Welch's t-test)
    const nPlus = dPlus.length;
    const nMinus = dMinus.length;
    let confidence: "HIGH" | "MEDIUM" | "LOW" = "LOW";

    if (nPlus > 1 && nMinus > 1) {
      const meanPlus = mean(dPlus);
      const meanMinus = mean(dMinus);
      const varPlus = variance(dPlus, meanPlus);
      const varMinus = variance(dMinus, meanMinus);

      const tNum = meanPlus - meanMinus;
      const tDenom = Math.sqrt(varPlus / nPlus + varMinus / nMinus);
      const t = tDenom === 0 ? 0 : tNum / tDenom;

      const dfNum = (varPlus / nPlus + varMinus / nMinus) ** 2;
      const dfDenom =
        (varPlus / nPlus) ** 2 / (nPlus - 1) + (varMinus / nMinus) ** 2 / (nMinus - 1);
      const df = dfDenom === 0 ? 0 : dfNum / dfDenom;

      const p = pValueApprox(t, df);

      // Combinations check (confounding guard)
      const combos = new Set<string>();
      entries
        .filter((e) => e.activities.some((a) => a.activityId === actId))
        .forEach((e) => {
          const others = e.activities
            .map((a) => a.activityId)
            .filter((id) => id !== actId)
            .sort()
            .join(",");
          combos.add(others);
        });

      if (nPlus >= 30 && nMinus >= 30 && p < 0.01 && combos.size >= 8) {
        confidence = "HIGH";
      } else if (nPlus >= 10 && nMinus >= 10 && p < 0.05 && combos.size >= 4) {
        confidence = "MEDIUM";
      }
    }

    results.push({
      activityId: actId,
      activityName: actName,
      withWithout,
      sameDay,
      prevDay: prevDayDiff,
      nextDay: nextDayDiff,
      confidence,
      isPositive: sameDay >= 0,
      occurrences: nPlus,
    });
  }

  // 4. Benjamini-Hochberg FDR correction could go here for further refinement
  // For now, sorting by impact size
  return results.sort((a, b) => Math.abs(b.sameDay) - Math.abs(a.sameDay));
}
