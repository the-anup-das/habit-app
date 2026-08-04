import type { Clock } from "@chapter/core";

export const systemClock: Clock = {
  now: () => Date.now(),
  getTimezoneOffset: () => new Date().getTimezoneOffset(),
};
