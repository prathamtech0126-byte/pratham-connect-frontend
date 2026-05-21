/** India business calendar for lead list filters (full IST days, inclusive). */
export const CRM_LEAD_DATE_TZ = "Asia/Kolkata";

/** IST is fixed UTC+5:30 (no DST). */
const IST_OFFSET = "+05:30";

const IST_WEEKDAY_LONG = new Intl.DateTimeFormat("en-US", {
  timeZone: CRM_LEAD_DATE_TZ,
  weekday: "long",
});

/** Calendar `yyyy-MM-dd` in Asia/Kolkata for an instant. */
export function istCalendarYmd(ref: Date = new Date()): string {
  return ref.toLocaleDateString("en-CA", { timeZone: CRM_LEAD_DATE_TZ });
}

/** Add whole calendar days in IST (anchor at noon IST avoids boundary drift). */
function istAddCalendarDays(ymd: string, deltaDays: number): string {
  const ms = new Date(`${ymd}T12:00:00.000${IST_OFFSET}`).getTime() + deltaDays * 86400000;
  return new Date(ms).toLocaleDateString("en-CA", { timeZone: CRM_LEAD_DATE_TZ });
}

/** Inclusive IST midnight → end-of-day for each calendar date (picker `yyyy-MM-dd`). */
export function istYmdInclusiveRangeIso(
  fromYmd: string,
  toYmd: string
): { createdFrom: string; createdTo: string } {
  const createdFrom = new Date(`${fromYmd}T00:00:00.000${IST_OFFSET}`).toISOString();
  const createdTo = new Date(`${toYmd}T23:59:59.999${IST_OFFSET}`).toISOString();
  return { createdFrom, createdTo };
}

export function istTodayRangeIso(now: Date = new Date()): { createdFrom: string; createdTo: string } {
  const ymd = istCalendarYmd(now);
  return istYmdInclusiveRangeIso(ymd, ymd);
}

/** Monday–Sunday week in IST containing `now` (matches prior `weekStartsOn: 1`). */
export function istWeekRangeIso(now: Date = new Date()): { createdFrom: string; createdTo: string } {
  const ymd = istCalendarYmd(now);
  const anchor = new Date(`${ymd}T12:00:00.000${IST_OFFSET}`);
  const long = IST_WEEKDAY_LONG.format(anchor) as
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
  const mondayYmd = istAddCalendarDays(ymd, -(daysSinceMonday[long] ?? 0));
  const sundayYmd = istAddCalendarDays(mondayYmd, 6);
  return istYmdInclusiveRangeIso(mondayYmd, sundayYmd);
}

/** First / last calendar day in IST for the month containing `now`. */
export function istMonthRangeIso(now: Date = new Date()): { createdFrom: string; createdTo: string } {
  const ymd = istCalendarYmd(now);
  const [yStr, mStr] = ymd.split("-");
  const y = Number(yStr);
  const m = Number(mStr);
  const first = `${yStr}-${mStr}-01`;
  const lastDay = new Date(y, m, 0).getDate();
  const last = `${yStr}-${mStr.padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
  return istYmdInclusiveRangeIso(first, last);
}

/** First / last `yyyy-MM-dd` in IST for month presets (DateRangePicker). */
export function istMonthPresetYmds(now: Date = new Date()): { from: string; to: string } {
  const ymd = istCalendarYmd(now);
  const [yStr, mStr] = ymd.split("-");
  const y = Number(yStr);
  const m = Number(mStr);
  const from = `${yStr}-${mStr}-01`;
  const lastDay = new Date(y, m, 0).getDate();
  const to = `${yStr}-${mStr.padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
  return { from, to };
}
