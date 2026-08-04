export interface Clock {
  /** Returns the current time in UTC epoch milliseconds. */
  now(): number;

  /**
   * Returns the timezone offset in minutes for the current device timezone.
   * e.g., UTC+02:00 returns -120 (JavaScript's getTimezoneOffset convention).
   */
  getTimezoneOffset(): number;
}

/**
 * Derives the local YYYYMMDD date integer for a given timestamp.
 *
 * TODO: implement actual day cutoff logic (e.g. 3 AM)
 */
export function getLocalDate(clock: Clock, timestampMs?: number): number {
  const ts = timestampMs ?? clock.now();
  const d = new Date(ts);

  // NOTE: This uses the system timezone to format the local date.
  // We format it explicitly as YYYYMMDD.
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return Number(`${y}${m}${day}`);
}
