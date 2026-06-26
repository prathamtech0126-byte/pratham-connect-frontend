import {
  localCalendarYmd,
  localMonthPresetYmds,
  localWeekYmds,
  localMonthRangeIso,
  localTodayRangeIso,
  localWeekRangeIso,
  localYmdInclusiveRangeIso,
} from "@/lib/local-date-range";

export type LeadDateFilterType = "all" | "today" | "weekly" | "monthly" | "custom";

/**
 * Returns query params for the lead date filter.
 * All presets send `createdFrom` / `createdTo` as UTC ISO (local calendar day bounds).
 */
export function leadDateRangeParams(
  filter: LeadDateFilterType,
  customFrom?: string,
  customTo?: string
): { createdFrom?: string; createdTo?: string; dateFilter?: string } {
  if (filter === "all") return {};

  const now = new Date();

  if (filter === "today") {
    return localTodayRangeIso(now);
  }
  if (filter === "weekly") {
    return localWeekRangeIso(now);
  }
  if (filter === "monthly") {
    return localMonthRangeIso(now);
  }

  if (filter === "custom" && customFrom && customTo) {
    const afterDate = customFrom.includes("T")
      ? localCalendarYmd(new Date(customFrom))
      : customFrom;
    const beforeDate = customTo.includes("T")
      ? localCalendarYmd(new Date(customTo))
      : customTo;
    return localYmdInclusiveRangeIso(afterDate, beforeDate);
  }

  return {};
}

function boundsFromYmd(fromYmd: string, toYmd: string): { from: Date; to: Date } {
  const { createdFrom, createdTo } = localYmdInclusiveRangeIso(fromYmd, toYmd);
  return { from: new Date(createdFrom), to: new Date(createdTo) };
}

/** Return `{ from, to }` as Date objects for in-memory period checks (report drilldowns). */
export function getLeadDateBounds(
  filter: LeadDateFilterType,
  customFrom?: string,
  customTo?: string
): { from: Date; to: Date } | null {
  const params = leadDateRangeParams(filter, customFrom, customTo);
  if (params.createdFrom && params.createdTo) {
    return { from: new Date(params.createdFrom), to: new Date(params.createdTo) };
  }

  if (filter === "today") {
    const ymd = localCalendarYmd();
    return boundsFromYmd(ymd, ymd);
  }
  if (filter === "weekly") {
    const { from, to } = localWeekYmds();
    return boundsFromYmd(from, to);
  }
  if (filter === "monthly") {
    const { from, to } = localMonthPresetYmds();
    return boundsFromYmd(from, to);
  }

  return null;
}
