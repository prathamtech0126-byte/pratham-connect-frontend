import {
  startOfDay,
  endOfDay,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
} from "date-fns";

export type LeadDateFilterType = "all" | "today" | "weekly" | "monthly" | "custom";

export function getLeadDateBounds(
  filter: LeadDateFilterType,
  customFrom?: string,
  customTo?: string
): { from: Date; to: Date } | null {
  const now = new Date();
  if (filter === "all") return null;
  if (filter === "today") return { from: startOfDay(now), to: endOfDay(now) };
  if (filter === "weekly") {
    return {
      from: startOfWeek(now, { weekStartsOn: 1 }),
      to: endOfWeek(now, { weekStartsOn: 1 }),
    };
  }
  if (filter === "monthly") {
    return { from: startOfMonth(now), to: endOfMonth(now) };
  }
  if (filter === "custom" && customFrom && customTo) {
    return {
      from: startOfDay(new Date(customFrom)),
      to: endOfDay(new Date(customTo)),
    };
  }
  return null;
}

export function leadDateRangeParams(
  filter: LeadDateFilterType,
  customFrom?: string,
  customTo?: string
): { createdFrom?: string; createdTo?: string } {
  const bounds = getLeadDateBounds(filter, customFrom, customTo);
  if (!bounds) return {};
  return {
    createdFrom: bounds.from.toISOString(),
    createdTo: bounds.to.toISOString(),
  };
}
