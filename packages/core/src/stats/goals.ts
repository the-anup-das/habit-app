export interface GoalData {
  id: string;
  name: string;
  targetType: "daily" | "weekly" | "monthly" | "interval";
  targetCount: number;
  intervalDays: number | null;
  startedOn: number;
  activityId: string | null;
  // All dates on which progress was made (either via entry with activity, or manual checkin)
  progressDates: number[]; 
  pauses: { fromDate: number; toDate: number }[];
}

export interface GoalProgress {
  currentStreak: number;
  longestStreak: number;
  completionRate: number; // 0 to 1
  isCompletedToday: boolean;
  isCompletedThisPeriod: boolean;
  progressThisPeriod: number;
}

function dateToTimestamp(d: number): number {
  const str = d.toString();
  const year = parseInt(str.substring(0, 4));
  const month = parseInt(str.substring(4, 6)) - 1;
  const day = parseInt(str.substring(6, 8));
  return new Date(year, month, day).getTime();
}

function getPeriodStart(date: number, type: GoalData["targetType"]): number {
  const str = date.toString();
  const year = parseInt(str.substring(0, 4));
  const month = parseInt(str.substring(4, 6)) - 1;
  const day = parseInt(str.substring(6, 8));
  const d = new Date(year, month, day);

  if (type === "weekly") {
    // start of week (monday)
    const diff = d.getDate() - d.getDay() + (d.getDay() === 0 ? -6 : 1);
    d.setDate(diff);
  } else if (type === "monthly") {
    d.setDate(1);
  }
  
  const m = (d.getMonth() + 1).toString().padStart(2, "0");
  const dd = d.getDate().toString().padStart(2, "0");
  return parseInt(`${d.getFullYear()}${m}${dd}`);
}

function nextPeriodStart(date: number, type: GoalData["targetType"]): number {
  const str = date.toString();
  const year = parseInt(str.substring(0, 4));
  const month = parseInt(str.substring(4, 6)) - 1;
  const day = parseInt(str.substring(6, 8));
  const d = new Date(year, month, day);

  if (type === "daily") {
    d.setDate(d.getDate() + 1);
  } else if (type === "weekly") {
    d.setDate(d.getDate() + 7);
  } else if (type === "monthly") {
    d.setMonth(d.getMonth() + 1);
  }
  const m = (d.getMonth() + 1).toString().padStart(2, "0");
  const dd = d.getDate().toString().padStart(2, "0");
  return parseInt(`${d.getFullYear()}${m}${dd}`);
}

export function calculateGoalProgress(goal: GoalData, currentDate: number): GoalProgress {
  const progressSet = new Set(goal.progressDates);
  const pauses = goal.pauses;

  let currentStreak = 0;
  let longestStreak = 0;
  let completedPeriods = 0;
  let totalPeriods = 0;

  // We iterate through periods from startedOn until currentDate
  let periodStart = getPeriodStart(goal.startedOn, goal.targetType);
  const currentPeriodStart = getPeriodStart(currentDate, goal.targetType);
  
  let isCompletedThisPeriod = false;
  let progressThisPeriod = 0;
  let isCompletedToday = progressSet.has(currentDate);

  while (periodStart <= currentPeriodStart) {
    const nextStart = nextPeriodStart(periodStart, goal.targetType);
    
    // Check if period is paused
    const isPaused = pauses.some(p => periodStart >= p.fromDate && periodStart <= p.toDate);
    
    if (!isPaused) {
      totalPeriods++;
      // Calculate progress in this period
      let count = 0;
      // Very naive counting - in a real app we'd iterate days in period
      for(let date of goal.progressDates) {
        if (date >= periodStart && date < nextStart) {
          count++;
        }
      }

      const completed = count >= goal.targetCount;
      if (completed) {
        completedPeriods++;
        currentStreak++;
        if (currentStreak > longestStreak) longestStreak = currentStreak;
      } else {
        // Only break streak if it's a PAST period
        if (periodStart < currentPeriodStart) {
          currentStreak = 0;
        }
      }

      if (periodStart === currentPeriodStart) {
        isCompletedThisPeriod = completed;
        progressThisPeriod = count;
      }
    }

    periodStart = nextStart;
  }

  return {
    currentStreak,
    longestStreak,
    completionRate: totalPeriods > 0 ? completedPeriods / totalPeriods : 0,
    isCompletedToday,
    isCompletedThisPeriod,
    progressThisPeriod
  };
}
