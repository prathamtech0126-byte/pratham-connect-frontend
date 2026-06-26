import type { LeadEntity } from "@/api/leads.api";
import {
  getLeadDateBounds,
  leadDateRangeParams,
  type LeadDateFilterType,
} from "@/lib/lead-date-range";

/** Telecaller transfer KPI outcomes (matches backend). */
export const TRANSFER_OUTCOME_STATUSES = new Set([
  "transferred",
  "converted",
  "dropped",
]);

export type ReportPeriodBounds = { from: Date; to: Date } | null;

export function getReportPeriodBounds(
  filter: LeadDateFilterType,
  customFrom?: string,
  customTo?: string
): ReportPeriodBounds {
  return getLeadDateBounds(filter, customFrom, customTo);
}

export function isTimestampInReportPeriod(
  value: string | null | undefined,
  bounds: ReportPeriodBounds
): boolean {
  if (!bounds) return value != null && value !== "";
  if (!value) return false;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return false;
  return d >= bounds.from && d <= bounds.to;
}

function outcomeTimestampForLead(lead: LeadEntity): string | null | undefined {
  const status = lead.assignmentStatus ?? "";
  if (status === "transferred") return lead.transferredAt;
  if (status === "converted") return lead.convertedAt;
  if (status === "dropped") return lead.droppedAt;
  return null;
}

export function isTransferOutcomeLead(lead: LeadEntity): boolean {
  return (
    lead.currentTelecallerId != null &&
    TRANSFER_OUTCOME_STATUSES.has(lead.assignmentStatus ?? "") &&
    outcomeTimestampForLead(lead) != null
  );
}

export function isConvertedInPeriod(lead: LeadEntity, bounds: ReportPeriodBounds): boolean {
  if (lead.isJunk || lead.progressStatus === "junk") return false;
  if (lead.pendingConverted) return false;
  if (lead.assignmentStatus !== "converted") return false;
  return isTimestampInReportPeriod(lead.convertedAt ?? null, bounds);
}

export function isDroppedInPeriod(lead: LeadEntity, bounds: ReportPeriodBounds): boolean {
  if (lead.isJunk || lead.progressStatus === "junk") return false;
  if (lead.assignmentStatus !== "dropped") return false;
  return isTimestampInReportPeriod(lead.droppedAt ?? null, bounds);
}

/** Transfer outcome in period (transferred / converted / dropped timestamp). For telecaller targets. */
export function isTransferOutcomeInPeriod(lead: LeadEntity, bounds: ReportPeriodBounds): boolean {
  if (lead.isJunk || lead.progressStatus === "junk") return false;
  if (!TRANSFER_OUTCOME_STATUSES.has(lead.assignmentStatus ?? "")) return false;
  return isTimestampInReportPeriod(outcomeTimestampForLead(lead), bounds);
}

/** Report "Transferred" KPI: transferred_at in the selected period. */
export function isTransferredInPeriod(lead: LeadEntity, bounds: ReportPeriodBounds): boolean {
  if (lead.isJunk || lead.progressStatus === "junk") return false;
  if (!lead.transferredAt) return false;
  return isTimestampInReportPeriod(lead.transferredAt, bounds);
}

export function countTransferredInPeriod(
  leads: LeadEntity[],
  bounds: ReportPeriodBounds
): number {
  return leads.filter((l) => isTransferredInPeriod(l, bounds)).length;
}

export function countConvertedInPeriod(
  leads: LeadEntity[],
  bounds: ReportPeriodBounds
): number {
  return leads.filter((l) => isConvertedInPeriod(l, bounds)).length;
}

export function countDroppedInPeriod(
  leads: LeadEntity[],
  bounds: ReportPeriodBounds
): number {
  return leads.filter((l) => isDroppedInPeriod(l, bounds)).length;
}

export function reportPeriodQueryParams(
  filter: LeadDateFilterType,
  customFrom?: string,
  customTo?: string
): {
  createdFrom?: string;
  createdTo?: string;
  transferredFrom?: string;
  transferredTo?: string;
  convertedFrom?: string;
  convertedTo?: string;
  droppedFrom?: string;
  droppedTo?: string;
} {
  const { createdFrom, createdTo } = leadDateRangeParams(filter, customFrom, customTo);
  if (!createdFrom || !createdTo) return {};
  return {
    createdFrom,
    createdTo,
    transferredFrom: createdFrom,
    transferredTo: createdTo,
    convertedFrom: createdFrom,
    convertedTo: createdTo,
    droppedFrom: createdFrom,
    droppedTo: createdTo,
  };
}
