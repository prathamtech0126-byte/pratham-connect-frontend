/** Browser-local calendar helpers for lead list filters and display. */

/** Calendar `yyyy-MM-dd` in the user's local timezone. */
export function localCalendarYmd(ref: Date = new Date()): string {
  return ref.toLocaleDateString("en-CA");
}

/** Add whole calendar days in local time (anchor at local noon avoids DST edge cases). */
function localAddCalendarDays(ymd: string, deltaDays: number): string {
  const [y, m, d] = ymd.split("-").map(Number);
  const anchor = new Date(y, m - 1, d, 12, 0, 0, 0);
  anchor.setDate(anchor.getDate() + deltaDays);
  return localCalendarYmd(anchor);
}

/** Inclusive local midnight → end-of-day for each calendar date (picker `yyyy-MM-dd`). */
export function localYmdInclusiveRangeIso(
  fromYmd: string,
  toYmd: string
): { createdFrom: string; createdTo: string } {
  const [fy, fm, fd] = fromYmd.split("-").map(Number);
  const [ty, tm, td] = toYmd.split("-").map(Number);
  const createdFrom = new Date(fy, fm - 1, fd, 0, 0, 0, 0).toISOString();
  const createdTo = new Date(ty, tm - 1, td, 23, 59, 59, 999).toISOString();
  return { createdFrom, createdTo };
}

export function localTodayRangeIso(now: Date = new Date()): { createdFrom: string; createdTo: string } {
  const ymd = localCalendarYmd(now);
  return localYmdInclusiveRangeIso(ymd, ymd);
}

const LOCAL_WEEKDAY_LONG = new Intl.DateTimeFormat("en-US", {
  weekday: "long",
});

/** Monday–Sunday week in local time containing `now`. */
export function localWeekRangeIso(now: Date = new Date()): { createdFrom: string; createdTo: string } {
  const ymd = localCalendarYmd(now);
  const [y, m, d] = ymd.split("-").map(Number);
  const anchor = new Date(y, m - 1, d, 12, 0, 0, 0);
  const long = LOCAL_WEEKDAY_LONG.format(anchor) as
    | "Monday"
    | "Tuesday"
    | "Wednesday"
    | "Thursday"
    | "Friday"
    | "Saturday"
    | "Sunday";
  const daysSinceMonday: Record<string, number> = {
    Monday: 0,
    Tuesday: 1,
    Wednesday: 2,
    Thursday: 3,
    Friday: 4,
    Saturday: 5,
    Sunday: 6,
  };
  const mondayYmd = localAddCalendarDays(ymd, -(daysSinceMonday[long] ?? 0));
  const sundayYmd = localAddCalendarDays(mondayYmd, 6);
  return localYmdInclusiveRangeIso(mondayYmd, sundayYmd);
}

/** First / last calendar day in local time for the month containing `now`. */
export function localMonthRangeIso(now: Date = new Date()): { createdFrom: string; createdTo: string } {
  const ymd = localCalendarYmd(now);
  const [yStr, mStr] = ymd.split("-");
  const y = Number(yStr);
  const m = Number(mStr);
  const first = `${yStr}-${mStr}-01`;
  const lastDay = new Date(y, m, 0).getDate();
  const last = `${yStr}-${mStr.padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
  return localYmdInclusiveRangeIso(first, last);
}

export function localWeekYmds(now: Date = new Date()): { from: string; to: string } {
  const ymd = localCalendarYmd(now);
  const [y, m, d] = ymd.split("-").map(Number);
  const anchor = new Date(y, m - 1, d, 12, 0, 0, 0);
  const long = LOCAL_WEEKDAY_LONG.format(anchor) as string;
  const daysSinceMonday: Record<string, number> = {
    Monday: 0, Tuesday: 1, Wednesday: 2, Thursday: 3, Friday: 4, Saturday: 5, Sunday: 6,
  };
  const mondayYmd = localAddCalendarDays(ymd, -(daysSinceMonday[long] ?? 0));
  const sundayYmd = localAddCalendarDays(mondayYmd, 6);
  return { from: mondayYmd, to: sundayYmd };
}

export function localMonthPresetYmds(now: Date = new Date()): { from: string; to: string } {
  const ymd = localCalendarYmd(now);
  const [yStr, mStr] = ymd.split("-");
  const y = Number(yStr);
  const m = Number(mStr);
  const from = `${yStr}-${mStr}-01`;
  const lastDay = new Date(y, m, 0).getDate();
  const to = `${yStr}-${mStr.padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
  return { from, to };
}
