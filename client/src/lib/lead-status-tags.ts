import { formatCrmFollowupShort } from "@/lib/format-crm-timestamp";
import { cn } from "@/lib/utils";
import type { LeadEntity } from "@/api/leads.api";
import type { LeadDetailMeta } from "@/api/leads.api";

export type LeadDisplayTag = {
  key: string;
  label: string;
  className: string;
};

export type LeadDisplayTagOptions = {
  /** When false, do not show a follow-up progress tag even if progressStatus is follow_up. */
  pendingFollowUp?: boolean;
};

/** Table/list status pill — never truncate follow-up date/time. */
export const leadStatusBadgeClassName = (tag: LeadDisplayTag) =>
  cn(
    "h-auto min-h-5 shrink-0 whitespace-nowrap border-0 px-2 py-0.5 text-[10px] font-normal leading-snug",
    tag.className,
  );

/** Status column in lead tables — wide enough for "Follow Up · date, time". */
export const LEAD_STATUS_TABLE_HEAD_CLASS = "min-w-[12.5rem] w-[18%] text-right";
export const LEAD_STATUS_TABLE_CELL_CLASS = "lead-status-cell text-right align-middle !overflow-visible";

export const isLeadJunk = (lead: LeadEntity) =>
  Boolean(lead.isJunk) || lead.progressStatus === "junk";

export const isLeadDropped = (lead: LeadEntity) =>
  lead.assignmentStatus === "dropped" ||
  (lead.eligibilityStatus === "not_eligible" &&
    Boolean(lead.latestNote?.trim().toUpperCase().startsWith("[DROP]")));

export const isLeadConverted = (lead: LeadEntity) =>
  lead.progressStatus === "converted" || lead.assignmentStatus === "converted";

/** Telecaller conversion KPI — finalized only (TD taken for student category). */
export const isLeadTelecallerConverted = (lead: LeadEntity) =>
  lead.assignmentStatus === "converted" && !lead.pendingConverted;

export const isPendingConverted = (lead: LeadEntity) => Boolean(lead.pendingConverted);

export const hasPendingFollowUp = (
  lead: LeadEntity,
  options?: LeadDisplayTagOptions
): boolean => {
  if (options?.pendingFollowUp !== undefined) return options.pendingFollowUp;
  if (lead.pendingFollowUp !== undefined) return lead.pendingFollowUp;
  return lead.progressStatus === "follow_up";
};

function followUpProgressTag(lead: LeadEntity): LeadDisplayTag {
  const when = lead.nextFollowupAt ? formatCrmFollowupShort(lead.nextFollowupAt) : null;
  return {
    key: "follow_up",
    label: when ? `Follow Up · ${when}` : "Follow Up",
    className: "bg-amber-500 text-white border-0",
  };
}

function inProgressTag(): LeadDisplayTag {
  return {
    key: "in_progress",
    label: "In Progress",
    className: "bg-indigo-600 text-white border-0",
  };
}

function notContactedTag(): LeadDisplayTag {
  return {
    key: "not_contacted",
    label: "Not contacted",
    className: "bg-slate-500 text-white border-0",
  };
}

/** Counsellor-facing label for progress field on detail/overview. */
export function getCounsellorProgressLabel(progressStatus?: string | null): string {
  if (progressStatus === "follow_up") return "Follow Up";
  if (progressStatus === "contacted") return "In Progress";
  if (progressStatus === "converted") return "Converted";
  if (progressStatus === "junk") return "Junk";
  if (progressStatus === "not_contacted") return "Not contacted";
  return progressStatus
    ? progressStatus.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
    : "—";
}

function progressTag(lead: LeadEntity, options?: LeadDisplayTagOptions): LeadDisplayTag | null {
  if (hasPendingFollowUp(lead, options)) {
    return followUpProgressTag(lead);
  }

  if (lead.progressStatus === "contacted") {
    return {
      key: "contacted",
      label: "Contacted",
      className: "bg-sky-600 text-white border-0",
    };
  }

  if (lead.eligibilityStatus === "not_eligible" && !isLeadDropped(lead)) {
    return {
      key: "dropped",
      label: "Drop",
      className: "bg-red-600 text-white border-0",
    };
  }

  if (lead.progressStatus === "not_contacted") {
    return {
      key: "not_contacted",
      label: "Not contacted",
      className: "bg-slate-500 text-white border-0",
    };
  }

  return null;
}

function transferredToTag(_lead: LeadEntity): LeadDisplayTag {
  return {
    key: "transferred",
    label: "Transferred",
    className: "bg-indigo-600 text-white border-0",
  };
}

function pendingConvertedTag(): LeadDisplayTag {
  return {
    key: "pending_converted",
    label: "Pending Converted",
    className: "bg-amber-600 text-white border-0",
  };
}

function convertedTag(): LeadDisplayTag {
  return {
    key: "converted",
    label: "Converted to client",
    className: "bg-emerald-600 text-white border-0",
  };
}

function clientDroppedTag(): LeadDisplayTag {
  return {
    key: "client_dropped",
    label: "Drop",
    className: "bg-red-600 text-white border-0",
  };
}

function junkTag(): LeadDisplayTag {
  return {
    key: "junk",
    label: "Junk",
    className: "bg-orange-500 text-white border-0",
  };
}

/** Counsellor: assignment tags + follow-up progress tag only when a follow-up is still pending. */
function counsellorLeadTags(lead: LeadEntity, options?: LeadDisplayTagOptions): LeadDisplayTag[] {
  if (isLeadJunk(lead)) {
    return [junkTag()];
  }

  if (isLeadDropped(lead)) {
    return [clientDroppedTag()];
  }

  if (isLeadConverted(lead)) {
    return [convertedTag()];
  }

  if (hasPendingFollowUp(lead, options) || lead.progressStatus === "follow_up") {
    return [followUpProgressTag(lead)];
  }

  if (lead.progressStatus === "contacted") {
    return [inProgressTag()];
  }

  if (lead.progressStatus === "not_contacted") {
    return [notContactedTag()];
  }

  return [notContactedTag()];
}

/** Progress + assignment pills for list rows. */
export function getLeadDisplayTags(
  lead: LeadEntity,
  role?: string | null,
  options?: LeadDisplayTagOptions
): LeadDisplayTag[] {
  if (role === "counsellor") {
    return counsellorLeadTags(lead, options);
  }

  if (isLeadJunk(lead)) {
    return [junkTag()];
  }

  if (lead.assignmentStatus === "dropped" || isLeadDropped(lead)) {
    return [clientDroppedTag()];
  }

  if (isPendingConverted(lead)) {
    return [pendingConvertedTag()];
  }

  if (isLeadTelecallerConverted(lead)) {
    return [convertedTag()];
  }

  if (lead.progressStatus === "converted") {
    return [convertedTag()];
  }

  const tags: LeadDisplayTag[] = [];

  const progress = progressTag(lead, options);
  if (progress) tags.push(progress);
  if (lead.assignmentStatus === "transferred") {
    tags.push(transferredToTag(lead));
  }

  if (tags.length === 0) {
    tags.push({
      key: "not_contacted",
      label: "Not contacted",
      className: "bg-slate-500 text-white border-0",
    });
  }

  return tags;
}

export const isLeadConvertedForRole = (lead: LeadEntity, role?: string | null) =>
  role === "telecaller" ? isLeadTelecallerConverted(lead) : isLeadConverted(lead);

/** Junk is read-only for everyone; converted leads are view-only for everyone. */
export const isLeadReadOnly = (lead: LeadEntity, role?: string | null) =>
  isLeadJunk(lead) ||
  isLeadConverted(lead) ||
  (role === "counsellor" && isLeadDropped(lead));

export const isAdminLikeRole = (role?: string | null) =>
  role === "superadmin" || role === "admin" || role === "developer" || role === "manager";

/** Admin bulk transfer: skip transferred, converted, junk, and dropped. Assigned & follow-up may transfer. */
export const isLeadTransferBlocked = (lead: LeadEntity) =>
  isLeadConverted(lead) ||
  isLeadJunk(lead) ||
  isLeadDropped(lead) ||
  lead.assignmentStatus === "transferred";

export function canTransferToCounsellor(
  lead: LeadEntity,
  meta?: LeadDetailMeta | null
): boolean {
  if (meta?.canReassignCounsellor) return true;
  return (
    !isLeadConverted(lead) &&
    !isLeadJunk(lead) &&
    !isLeadDropped(lead) &&
    !hasPendingFollowUp(lead, meta ? { pendingFollowUp: meta.pendingFollowUp } : undefined) &&
    !!lead.eligibilityStatus &&
    !!lead.leadQuality &&
    lead.assignmentStatus !== "transferred"
  );
}

export function getTransferButtonLabel(
  lead: LeadEntity,
  meta?: LeadDetailMeta | null
): string {
  if (meta?.canReassignCounsellor || lead.assignmentStatus === "transferred") {
    return "Transfer to another counsellor";
  }
  return "Transfer to counsellor";
}

const PROGRESS_SORT_RANK: Record<string, number> = {
  not_contacted: 0,
  contacted: 1,
  follow_up: 2,
  interested: 3,
  not_interested: 4,
  converted: 5,
  junk: 6,
};

export const mergeLeadRow = (prev: LeadEntity, patch: Partial<LeadEntity>): LeadEntity => ({
  ...prev,
  ...patch,
  id: prev.id,
  telecallerName:
    patch.telecallerName !== undefined && patch.telecallerName !== null
      ? patch.telecallerName
      : prev.telecallerName,
  counsellorName:
    patch.counsellorName !== undefined && patch.counsellorName !== null
      ? patch.counsellorName
      : prev.counsellorName,
  pendingFollowUp:
    patch.pendingFollowUp !== undefined ? patch.pendingFollowUp : prev.pendingFollowUp,
  pendingConverted:
    patch.pendingConverted !== undefined ? patch.pendingConverted : prev.pendingConverted,
});

export const sortLeadsForDisplay = (items: LeadEntity[]): LeadEntity[] =>
  [...items].sort((a, b) => {
    const aJunk = isLeadJunk(a) ? 2 : 0;
    const bJunk = isLeadJunk(b) ? 2 : 0;
    if (aJunk !== bJunk) return aJunk - bJunk;

    const aDone =
      a.assignmentStatus === "transferred" ||
      isLeadTelecallerConverted(a) ||
      isLeadDropped(a)
        ? 1
        : 0;
    const bDone =
      b.assignmentStatus === "transferred" ||
      isLeadTelecallerConverted(b) ||
      isLeadDropped(b)
        ? 1
        : 0;
    if (aDone !== bDone) return aDone - bDone;
    const aRank = PROGRESS_SORT_RANK[a.progressStatus] ?? 99;
    const bRank = PROGRESS_SORT_RANK[b.progressStatus] ?? 99;
    if (aRank !== bRank) return aRank - bRank;
    return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
  });

/** Telecaller individual report: transferred → converted → dropped → rest. */
const TELECALLER_REPORT_ASSIGNMENT_SORT: Record<string, number> = {
  transferred: 0,
  converted: 1,
  dropped: 2,
  assigned: 3,
  not_assigned: 3,
};

export const sortLeadsForTelecallerReport = (items: LeadEntity[]): LeadEntity[] =>
  [...items].sort((a, b) => {
    const aRank = TELECALLER_REPORT_ASSIGNMENT_SORT[a.assignmentStatus ?? ""] ?? 3;
    const bRank = TELECALLER_REPORT_ASSIGNMENT_SORT[b.assignmentStatus ?? ""] ?? 3;
    if (aRank !== bRank) return aRank - bRank;
    return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
  });

/** Assignment pill on telecaller report — hide generic "assigned" / "not assigned". */
export const getTelecallerReportAssignmentTag = (lead: LeadEntity): LeadDisplayTag | null => {
  const status = lead.assignmentStatus;
  if (!status || status === "assigned" || status === "not_assigned") return null;
  if (status === "transferred" || isPendingConverted(lead)) {
    return {
      key: isPendingConverted(lead) ? "pending_converted" : "transferred",
      label: isPendingConverted(lead) ? "Pending Converted" : "Transferred",
      className: isPendingConverted(lead)
        ? "bg-amber-600 text-white border-0"
        : "bg-blue-600 text-white border-0",
    };
  }
  if (status === "converted" || isLeadTelecallerConverted(lead)) {
    return {
      key: "converted",
      label: "Converted",
      className: "bg-emerald-600 text-white border-0",
    };
  }
  if (status === "dropped" || isLeadDropped(lead)) {
    return {
      key: "dropped",
      label: "Dropped",
      className: "bg-red-600 text-white border-0",
    };
  }
  return null;
};
