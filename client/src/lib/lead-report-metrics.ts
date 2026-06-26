import { getReportPeriodBounds } from "@/lib/lead-report-period";

/** Lead is assigned to a telecaller if current_telecaller_id matches (any status). */
export const isLeadAssignedToTelecaller = (
  lead: { currentTelecallerId?: number | null; isJunk?: boolean; progressStatus?: string },
  telecallerId: number
) =>
  lead.currentTelecallerId === telecallerId &&
  !lead.isJunk &&
  lead.progressStatus !== "junk";

/**
 * Pool for telecaller transferred/converted/dropped KPIs.
 * Includes leads still on the telecaller, plus handoffs where telecaller was cleared but assignedBy matches.
 */
export const isLeadInTelecallerOutcomePool = (
  lead: {
    currentTelecallerId?: number | null;
    assignedBy?: number | null;
    isJunk?: boolean;
    progressStatus?: string;
  },
  telecallerId: number
) => {
  if (lead.isJunk || lead.progressStatus === "junk") return false;
  if (lead.currentTelecallerId === telecallerId) return true;
  if (lead.currentTelecallerId == null && lead.assignedBy === telecallerId) return true;
  return false;
};

/** Lead is assigned to a counsellor if current_counsellor_id matches (any status). */
export const isLeadAssignedToCounsellor = (
  lead: { currentCounsellorId?: number | null; isJunk?: boolean; progressStatus?: string },
  counsellorId: number
) =>
  lead.currentCounsellorId === counsellorId &&
  !lead.isJunk &&
  lead.progressStatus !== "junk";

export type LeadReportMetricKey =
  | "assigned"
  | "unassigned"
  | "not_contacted"
  | "contacted"
  | "transferred"
  | "converted"
  | "dropped"
  | "pending_follow_up"
  | "junk";

export type LeadReportDateFilter = "all" | "today" | "weekly" | "monthly" | "custom";

/** Build lead list URL for report drill-down.
 * Assigned = all leads that are not unassigned.
 */
export const buildLeadListUrlFromReport = (input: {
  metric: LeadReportMetricKey;
  dateFilter: LeadReportDateFilter;
  customDateFrom?: string;
  customDateTo?: string;
  telecallerId?: number;
  counsellorId?: number;
}) => {
  const qs = new URLSearchParams();
  if (input.telecallerId != null) qs.set("telecallerId", String(input.telecallerId));
  if (input.counsellorId != null) qs.set("counsellorId", String(input.counsellorId));
  qs.set("clearFilters", "1");
  qs.set("dateFilter", input.dateFilter);
  const bounds = getReportPeriodBounds(
    input.dateFilter,
    input.customDateFrom,
    input.customDateTo
  );
  if (bounds) {
    const from = bounds.from.toISOString();
    const to = bounds.to.toISOString();
    if (input.metric === "transferred") {
      qs.set("transferredFrom", from);
      qs.set("transferredTo", to);
    } else if (input.metric === "converted") {
      qs.set("convertedFrom", from);
      qs.set("convertedTo", to);
    } else if (input.metric === "dropped") {
      qs.set("droppedFrom", from);
      qs.set("droppedTo", to);
    } else {
      qs.set("createdFrom", from);
      qs.set("createdTo", to);
    }
  } else if (input.customDateFrom) {
    qs.set("afterDate", input.customDateFrom);
    if (input.customDateTo) qs.set("beforeDate", input.customDateTo);
  }

  switch (input.metric) {
    case "assigned":
      qs.set("excludeUnassigned", "1");
      qs.set("forReport", "1");
      qs.set("assignedScope", "1");
      break;
    case "unassigned":
      qs.set("assignment", "not_assigned");
      qs.set("forReport", "1");
      break;
    case "not_contacted":
      qs.set("progress", "not_contacted");
      qs.set("forReport", "1");
      break;
    case "contacted":
      qs.set("reportBucket", "contacted");
      qs.set("forReport", "1");
      break;
    case "converted":
      qs.set("assignment", "converted");
      qs.set("forReport", "1");
      break;
    case "dropped":
      qs.set("assignment", "dropped");
      qs.set("forReport", "1");
      break;
    case "pending_follow_up":
      qs.set("hasPendingFollowUp", "true");
      qs.set("forReport", "1");
      break;
    case "transferred":
      qs.set("reportBucket", "transferred");
      qs.set("forReport", "1");
      break;
    case "junk":
      qs.set("progress", "junk");
      break;
    default:
      break;
  }

  const query = qs.toString();
  return query ? `/leads?${query}` : "/leads";
};
