import {
  istCalendarYmd,
  istMonthPresetYmds,
  istWeekYmds,
} from "@/lib/ist-date-range";

export type LeadDateFilterType = "all" | "today" | "weekly" | "monthly" | "custom";

/**
 * Returns query params for the lead date filter.
 * - today/weekly/monthly → `{ dateFilter: "today"|"weekly"|"monthly" }` — backend computes IST bounds.
 * - custom → `{ afterDate, beforeDate }` as yyyy-MM-dd — backend converts to naive IST strings.
 */
export function leadDateRangeParams(
  filter: LeadDateFilterType,
  customFrom?: string,
  customTo?: string
): { dateFilter?: string; afterDate?: string; beforeDate?: string } {
  if (filter === "all") return {};

  if (filter === "today" || filter === "weekly" || filter === "monthly") {
    return { dateFilter: filter };
  }

  if (filter === "custom" && customFrom && customTo) {
    // If caller passes a full ISO string (e.g. from a redirect URL), extract the IST calendar date.
    const afterDate = customFrom.includes("T")
      ? istCalendarYmd(new Date(customFrom))
      : customFrom;
    const beforeDate = customTo.includes("T")
      ? istCalendarYmd(new Date(customTo))
      : customTo;
    return { afterDate, beforeDate };
  }

  return {};
}

function boundsFromYmd(fromYmd: string, toYmd: string): { from: Date; to: Date } {
  return {
    from: new Date(`${fromYmd}T00:00:00+05:30`),
    to: new Date(`${toYmd}T23:59:59.999+05:30`),
  };
}

/** Return `{ from, to }` as Date objects for in-memory period checks (report drilldowns). */
export function getLeadDateBounds(
  filter: LeadDateFilterType,
  customFrom?: string,
  customTo?: string
): { from: Date; to: Date } | null {
  const { afterDate, beforeDate } = leadDateRangeParams(filter, customFrom, customTo);
  if (afterDate && beforeDate) {
    return boundsFromYmd(afterDate, beforeDate);
  }

  if (filter === "today") {
    const ymd = istCalendarYmd();
    return boundsFromYmd(ymd, ymd);
  }
  if (filter === "weekly") {
    const { from, to } = istWeekYmds();
    return boundsFromYmd(from, to);
  }
  if (filter === "monthly") {
    const { from, to } = istMonthPresetYmds();
    return boundsFromYmd(from, to);
  }

  return null;
}
