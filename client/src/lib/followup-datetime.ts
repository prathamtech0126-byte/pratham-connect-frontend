import { startOfDay } from "date-fns";

/** Default lead time when scheduling a follow-up (minutes from now). */
export const FOLLOWUP_DEFAULT_MINUTES_AHEAD = 15;

/** Earliest allowed follow-up moment (now). */
export function getMinFollowupDateTime(): Date {
  return new Date();
}

/** Tomorrow at 10:30 AM local time. */
export function getTomorrowMorning1030(): Date {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  d.setHours(10, 30, 0, 0);
  return d;
}

export function isFollowupDateTimeAllowed(date: Date, min: Date = getMinFollowupDateTime()): boolean {
  return date.getTime() >= min.getTime();
}

/** Clamp to min if user picked today with a past time. */
export function clampFollowupDateTime(date: Date, min: Date = getMinFollowupDateTime()): Date {
  if (date.getTime() >= min.getTime()) return date;
  return new Date(min);
}

/** Default pick: 15 minutes from now (never before min). */
export function getDefaultFollowupDateTime(): Date {
  const min = getMinFollowupDateTime();
  const d = new Date(min.getTime() + FOLLOWUP_DEFAULT_MINUTES_AHEAD * 60 * 1000);
  return clampFollowupDateTime(d, min);
}

export function isPastCalendarDay(date: Date): boolean {
  return date.getTime() < startOfDay(new Date()).getTime();
}
