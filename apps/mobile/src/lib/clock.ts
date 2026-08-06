import { type Clock, getLocalDate } from "@chapter/core";

export const systemClock: Clock = {
  now: () => Date.now(),
  getTimezoneOffset: () => new Date().getTimezoneOffset(),
};

export function getToday(): number {
  return getLocalDate(systemClock);
}
