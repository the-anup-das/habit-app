// Represents a loaded entry with its relationships
export interface PopulatedEntry {
  id: string;
  localDate: number; // YYYYMMDD
  happenedAt: number;
  note?: string;
  mood: {
    id: string;
    name: string;
    groupId: string;
    score: number;
  };
  activities: {
    activityId: string;
    activity: {
      name: string;
      groupId: string | null;
    };
  }[];
}

/**
 * Calculates the current and longest streaks of consecutive days with at least one entry.
 * Note: Streak logic here assumes entries are sorted descending by localDate.
 */
export function calculateEntryStreak(entries: PopulatedEntry[], todayLocalDate: number) {
  if (entries.length === 0) return { current: 0, longest: 0 };

  // Get unique days sorted descending
  const uniqueDays = Array.from(new Set(entries.map((e) => e.localDate))).sort((a, b) => b - a);

  let current = 0;
  let longest = 0;
  let currentRun = 0;
  let lastDay: number | null = null;

  for (const day of uniqueDays) {
    if (lastDay === null) {
      currentRun = 1;
    } else {
      // Check if this day is exactly one day before lastDay
      const isConsecutive = isPreviousDay(lastDay, day);
      if (isConsecutive) {
        currentRun++;
      } else {
        if (currentRun > longest) longest = currentRun;
        currentRun = 1;
      }
    }

    // Track current streak starting from today or yesterday
    if (lastDay === null && (day === todayLocalDate || isPreviousDay(todayLocalDate, day))) {
      current = currentRun;
    } else if (lastDay !== null && current > 0 && isPreviousDay(lastDay, day)) {
      current++;
    }

    lastDay = day;
  }

  if (currentRun > longest) longest = currentRun;

  return { current, longest };
}

function isPreviousDay(currentYYYYMMDD: number, checkYYYYMMDD: number): boolean {
  const cYear = Math.floor(currentYYYYMMDD / 10000);
  const cMonth = Math.floor((currentYYYYMMDD % 10000) / 100) - 1;
  const cDate = currentYYYYMMDD % 100;

  const d = new Date(cYear, cMonth, cDate);
  d.setDate(d.getDate() - 1);

  const pYear = d.getFullYear();
  const pMonth = d.getMonth() + 1;
  const pDate = d.getDate();
  const expected = pYear * 10000 + pMonth * 100 + pDate;

  return checkYYYYMMDD === expected;
}

export function calculateMoodCount(entries: PopulatedEntry[]) {
  const counts: Record<string, { name: string; count: number; score: number }> = {};

  for (const e of entries) {
    if (!counts[e.mood.id]) {
      counts[e.mood.id] = { name: e.mood.name, count: 0, score: e.mood.score };
    }
    counts[e.mood.id].count++;
  }

  return Object.values(counts).sort((a, b) => b.count - a.count);
}

export function calculateActivityCount(entries: PopulatedEntry[]) {
  const counts: Record<string, { name: string; count: number }> = {};

  for (const e of entries) {
    for (const a of e.activities) {
      if (!counts[a.activityId]) {
        counts[a.activityId] = { name: a.activity.name, count: 0 };
      }
      counts[a.activityId].count++;
    }
  }

  return Object.values(counts).sort((a, b) => b.count - a.count);
}
