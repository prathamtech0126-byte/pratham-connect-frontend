import { format } from "date-fns";

export type LeadActivityLike = {
  id: number;
  activityType: string;
  message?: string | null;
  followupAt?: string | null;
  status?: string;
  createdAt: string;
  userId?: number | null;
  userName?: string | null;
  meta?: Record<string, unknown>;
};

export type LeadFieldChange = {
  field: string;
  old: string;
  new: string;
};

export type FormattedLeadActivity = {
  title: string;
  details: string[];
};

const GENERIC_NAMES = new Set(["user", "system", ""]);

function isGenericPerformerName(name: string | null | undefined): boolean {
  const n = name?.trim().toLowerCase() ?? "";
  return !n || GENERIC_NAMES.has(n);
}

const performerLabel = (
  item: LeadActivityLike,
  context?: { telecallers?: { id: number; fullName: string }[]; counsellors?: { id: number; fullName: string }[] }
): string => {
  const stored = item.userName?.trim() ?? "";
  if (stored && !isGenericPerformerName(stored)) return stored;

  const metaName =
    typeof item.meta?.performedByName === "string" ? item.meta.performedByName.trim() : "";
  if (metaName && !isGenericPerformerName(metaName)) return metaName;

  if (item.userId) {
    const tc = context?.telecallers?.find((t) => t.id === item.userId);
    if (tc?.fullName?.trim()) return tc.fullName.trim();
    const co = context?.counsellors?.find((c) => c.id === item.userId);
    if (co?.fullName?.trim()) return co.fullName.trim();
    return `User #${item.userId}`;
  }
  return "System";
};

function humanizeChangeValue(value: string): string {
  const v = value?.trim() ?? "";
  if (!v || v.toLowerCase() === "not set") return "Not set";
  return v.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatSetChangeLine(who: string, change: LeadFieldChange): string {
  const field = normalizeFieldName(change.field);
  const newVal = humanizeChangeValue(change.new);
  if (field === "Eligibility") return `${who} set lead eligibility to ${newVal}`;
  if (field === "Lead Quality") return `${who} set lead quality to ${newVal}`;
  if (field === "Progress") return `${who} set progress to ${newVal}`;
  return `${who} set ${field} to ${newVal}`;
}

function normalizeFieldName(raw: string): string {
  const lower = raw.toLowerCase().replace(/[_\s-]+/g, "");
  if (lower === "eligibilitystatus" || lower === "eligibility") return "Eligibility";
  if (lower === "leadquality" || lower === "quality") return "Lead Quality";
  return raw;
}

export function formatLeadActivityDisplay(
  item: LeadActivityLike,
  context?: {
    telecallers?: { id: number; fullName: string }[];
    counsellors?: { id: number; fullName: string }[];
  }
): FormattedLeadActivity {
  const who = performerLabel(item, context);
  const meta = item.meta ?? {};

  if (item.activityType === "lead_created") {
    return {
      title: `${who} created the lead`,
      details: item.message?.trim() ? [item.message.trim()] : [],
    };
  }

  if (item.activityType === "lead_update" || meta.eventType === "lead_updated") {
    const changes = Array.isArray(meta.changes) ? (meta.changes as LeadFieldChange[]) : [];
    if (changes.length === 1) {
      return { title: formatSetChangeLine(who, changes[0]), details: [] };
    }
    if (changes.length > 1) {
      return {
        title: `${who} updated the lead`,
        details: changes.map((c) => formatSetChangeLine(who, c)),
      };
    }
    return {
      title: `${who} updated the lead`,
      details: item.message?.trim() ? [item.message.trim()] : [],
    };
  }

  if (item.activityType === "counselor_assign") {
    const counsellorId = meta.counsellorId != null ? Number(meta.counsellorId) : null;
    const name =
      (typeof meta.counsellorName === "string" && meta.counsellorName) ||
      context?.counsellors?.find((c) => c.id === counsellorId)?.fullName ||
      (counsellorId ? `Counsellor #${counsellorId}` : "counsellor");
    return {
      title: item.message || `${who} transferred this lead to ${name}`,
      details: [],
    };
  }

  if (item.activityType === "assignment_change") {
    const telecallerId = meta.telecallerId != null ? Number(meta.telecallerId) : null;
    const name =
      (typeof meta.telecallerName === "string" && meta.telecallerName) ||
      context?.telecallers?.find((t) => t.id === telecallerId)?.fullName ||
      (telecallerId ? `Telecaller #${telecallerId}` : "telecaller");
    return {
      title: item.message || `${who} assigned this lead to ${name}`,
      details: [],
    };
  }

  if (item.activityType === "followup") {
    const when = item.followupAt
      ? format(new Date(item.followupAt), "dd MMM yyyy, hh:mm a")
      : null;
    if (item.status === "completed") {
      const raw = item.message?.trim() ?? "";
      const display =
        raw && !/^follow up completed/i.test(raw) ? `Follow up completed — ${raw}` : raw;
      return {
        title: `${who} completed a follow-up`,
        details: [...(when ? [`When: ${when}`] : []), ...(display ? [display] : [])],
      };
    }
    const statusLabel = item.status === "cancelled" ? "cancelled" : "scheduled";
    return {
      title: `${who} ${statusLabel} a follow-up`,
      details: [
        ...(when ? [`When: ${when}`] : []),
        ...(item.message?.trim() ? [item.message.trim()] : []),
      ],
    };
  }

  if (item.activityType === "call_log") {
    return {
      title: `${who} logged a call`,
      details: item.message?.trim() ? [item.message.trim()] : [],
    };
  }

  if (item.activityType === "note") {
    if (/convert|converted|client/i.test(item.message ?? "")) {
      return {
        title: `${who} converted this lead to a client`,
        details: item.message?.trim() ? [item.message.trim()] : [],
      };
    }
    if (/dropped|drop/i.test(item.message ?? "")) {
      return {
        title: `${who} dropped this lead`,
        details: item.message?.trim() ? [item.message.trim()] : [],
      };
    }
    if (/junk/i.test(item.message ?? "")) {
      return {
        title: `${who} marked this lead as junk`,
        details: item.message?.trim() ? [item.message.trim()] : [],
      };
    }
    return {
      title: `${who} added a note`,
      details: item.message?.trim() ? [item.message.trim()] : [],
    };
  }

  return {
    title: item.message || `${who} recorded an activity`,
    details: [],
  };
}
