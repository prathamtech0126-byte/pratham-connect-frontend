export type LeadDateFilterType = "all" | "today" | "weekly" | "monthly" | "custom";

export type LeadDateApiParams = {
  dateFilter?: string;
  afterDate?: string;
  beforeDate?: string;
};

function normalizeYmd(value: string): string {
  if (value.includes("T")) {
    return new Date(value).toLocaleDateString("en-CA");
  }
  return value;
}

/** API query params — backend resolves UTC bounds from `dateFilter`. */
export function leadDateRangeParams(
  filter: LeadDateFilterType,
  customFrom?: string,
  customTo?: string
): LeadDateApiParams {
  if (filter === "all") return {};

  if (filter === "custom" && customFrom && customTo) {
    return {
      dateFilter: "custom",
      afterDate: normalizeYmd(customFrom),
      beforeDate: normalizeYmd(customTo),
    };
  }

  return { dateFilter: filter };
}
