import { format } from "date-fns";
import { formatCrmTimestamp } from "@/lib/format-crm-timestamp";
import type { LeadActivityEntity } from "@/api/leads.api";

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

const TIMELINE_NOTE_BLOCK = /^follow up completed/i;
const TIMELINE_WORD_LIMIT = 48;

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

function normalizeFieldName(raw: string): string {
  const lower = raw.toLowerCase().replace(/[_\s-]+/g, "");
  if (lower === "eligibilitystatus" || lower === "eligibility") return "Eligibility";
  if (lower === "leadquality" || lower === "quality") return "Lead Quality";
  if (lower === "progressstatus" || lower === "progress") return "Progress";
  if (lower === "assignmentstatus" || lower === "assignment") return "Assignment";
  if (lower === "convertedat") return "Converted at";
  return raw;
}

function isContactedProgressChange(change: LeadFieldChange): boolean {
  const field = normalizeFieldName(change.field);
  if (field !== "Progress") return false;
  return humanizeChangeValue(change.new).toLowerCase() === "contacted";
}

function isConversionFieldChange(change: LeadFieldChange): boolean {
  const field = normalizeFieldName(change.field);
  const newVal = humanizeChangeValue(change.new).toLowerCase();
  if (field === "Converted at") return true;
  if (field === "Progress" && newVal === "converted") return true;
  if (field === "Assignment" && newVal === "converted") return true;
  return false;
}

function filterTimelineLeadUpdateChanges(changes: LeadFieldChange[]): LeadFieldChange[] {
  const hasConversion = changes.some(isConversionFieldChange);
  if (hasConversion) return [];
  return changes.filter((c) => !isContactedProgressChange(c));
}

function parseConvertedAtFromChanges(changes: LeadFieldChange[]): Date | null {
  const row = changes.find((c) => normalizeFieldName(c.field) === "Converted at");
  if (!row?.new?.trim()) return null;
  const d = new Date(row.new);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function truncateTimelineText(
  text: string | null | undefined,
  maxWords = TIMELINE_WORD_LIMIT,
  maxChars = 100
): string {
  const raw = text?.trim() ?? "";
  if (!raw) return "";
  if (raw.length > maxChars) return `${raw.slice(0, maxChars)}…`;
  const words = raw.split(/\s+/);
  if (words.length <= maxWords) return raw;
  return `${words.slice(0, maxWords).join(" ")}…`;
}

function formatSetChangeLine(who: string, change: LeadFieldChange): string {
  const field = normalizeFieldName(change.field);
  const newVal = humanizeChangeValue(change.new);
  if (field === "Eligibility") return `${who} set lead eligibility to ${newVal}`;
  if (field === "Lead Quality") return `${who} set lead quality to ${newVal}`;
  if (field === "Progress") return `${who} set progress to ${newVal}`;
  return `${who} set ${field} to ${newVal}`;
}

function getLeadUpdateChanges(item: LeadActivityLike): LeadFieldChange[] {
  const meta = item.meta ?? {};
  return Array.isArray(meta.changes) ? (meta.changes as LeadFieldChange[]) : [];
}

function metaEventType(item: LeadActivityLike): string | undefined {
  const et = item.meta?.eventType;
  return typeof et === "string" ? et : undefined;
}

export function shouldIncludeLeadTimelineActivity(activity: LeadActivityEntity): boolean {
  const type = activity.activityType;
  if (
    type === "followup" ||
    type === "assignment_change" ||
    type === "counselor_assign" ||
    type === "call_log" ||
    type === "lead_created"
  ) {
    return true;
  }

  if (type === "note") {
    if (activity.meta?.isReasonNote === true) return false;
    if (TIMELINE_NOTE_BLOCK.test(activity.message ?? "")) return false;
    return true;
  }

  if (type === "lead_update" || metaEventType(activity) === "lead_updated") {
    const changes = getLeadUpdateChanges(activity);
    if (changes.some(isConversionFieldChange)) return true;
    const visible = filterTimelineLeadUpdateChanges(changes);
    if (visible.length > 0) return true;
    if (activity.message?.trim()) return true;
    return false;
  }

  return false;
}

export function sortTimelineActivities<T extends { createdAt: string; id: number }>(
  items: T[],
  newestFirst: boolean
): T[] {
  return [...items].sort((a, b) => {
    const byTime = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    const ordered = newestFirst ? -byTime : byTime;
    if (ordered !== 0) return ordered;
    return newestFirst ? Number(b.id) - Number(a.id) : Number(a.id) - Number(b.id);
  });
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
      details: item.message?.trim() ? [truncateTimelineText(item.message.trim())] : [],
    };
  }

  if (item.activityType === "lead_update" || meta.eventType === "lead_updated") {
    const rawChanges = getLeadUpdateChanges(item);
    if (rawChanges.some(isConversionFieldChange)) {
      const convertedAt =
        parseConvertedAtFromChanges(rawChanges) ?? new Date(item.createdAt);
      return {
        title: `${who} converted to client`,
        details: [`Converted at ${format(convertedAt, "dd MMM yyyy, hh:mm a")}`],
      };
    }

    const changes = filterTimelineLeadUpdateChanges(rawChanges);
    if (changes.length === 1) {
      return { title: formatSetChangeLine(who, changes[0]), details: [] };
    }
    if (changes.length > 1) {
      return {
        title: `${who} updated the lead`,
        details: changes.map((c) => truncateTimelineText(formatSetChangeLine(who, c))),
      };
    }
    return {
      title: `${who} updated the lead`,
      details: item.message?.trim() ? [truncateTimelineText(item.message.trim())] : [],
    };
  }

  if (item.activityType === "counselor_assign") {
    const counsellorId = meta.counsellorId != null ? Number(meta.counsellorId) : null;
    const assigneeName =
      (typeof meta.counsellorName === "string" && meta.counsellorName.trim()) ||
      context?.counsellors?.find((c) => c.id === counsellorId)?.fullName ||
      null;
    if (assigneeName) {
      return {
        title: truncateTimelineText(`${who} transferred this lead to counsellor ${assigneeName}`),
        details: [],
      };
    }
    return {
      title: truncateTimelineText(item.message || `${who} transferred this lead to a counsellor`),
      details: [],
    };
  }

  if (item.activityType === "assignment_change") {
    const telecallerId = meta.telecallerId != null ? Number(meta.telecallerId) : null;
    const assigneeName =
      (typeof meta.telecallerName === "string" && meta.telecallerName.trim()) ||
      context?.telecallers?.find((t) => t.id === telecallerId)?.fullName ||
      null;
    if (assigneeName) {
      return {
        title: truncateTimelineText(`${who} assigned this lead to telecaller ${assigneeName}`),
        details: [],
      };
    }
    return {
      title: truncateTimelineText(item.message || `${who} assigned this lead to a telecaller`),
      details: [],
    };
  }

  if (item.activityType === "followup") {
    const when = item.followupAt
      ? formatCrmTimestamp(item.followupAt, "datetime")
      : null;
    if (item.status === "completed") {
      const raw = item.message?.trim() ?? "";
      const note =
        raw && !/^follow up completed/i.test(raw)
          ? raw
          : raw.replace(/^follow up completed\s*[—-]?\s*/i, "").trim();
      return {
        title: `${who} completed a follow-up`,
        details: [
          ...(when ? [`When: ${when}`] : []),
          ...(note ? [truncateTimelineText(note)] : []),
        ],
      };
    }
    const statusLabel = item.status === "cancelled" ? "cancelled" : "scheduled";
    return {
      title: `${who} ${statusLabel} a follow-up`,
      details: [
        ...(when ? [`When: ${when}`] : []),
        ...(item.message?.trim() ? [truncateTimelineText(item.message.trim())] : []),
      ],
    };
  }

  if (item.activityType === "call_log") {
    return {
      title: `${who} logged a call`,
      details: item.message?.trim() ? [truncateTimelineText(item.message.trim())] : [],
    };
  }

  if (item.activityType === "note") {
    if (/convert|converted|client/i.test(item.message ?? "")) {
      return {
        title: `${who} converted to client`,
        details: [
          `Converted at ${format(new Date(item.createdAt), "dd MMM yyyy, hh:mm a")}`,
        ],
      };
    }
    const dropMatch = (item.message ?? "").match(/^client dropped:\s*(.*)$/i);
    if (dropMatch || /dropped|drop/i.test(item.message ?? "")) {
      const reason = dropMatch?.[1]?.trim() || "";
      return {
        title: `${who} dropped the client`,
        details: [
          `Dropped at ${format(new Date(item.createdAt), "dd MMM yyyy, hh:mm a")}`,
          ...(reason ? [truncateTimelineText(reason)] : []),
        ],
      };
    }
    if (/junk/i.test(item.message ?? "")) {
      return {
        title: `${who} marked this lead as junk`,
        details: item.message?.trim() ? [truncateTimelineText(item.message.trim())] : [],
      };
    }
    return {
      title: `${who} added a note`,
      details: item.message?.trim() ? [truncateTimelineText(item.message.trim())] : [],
    };
  }

  return {
    title: truncateTimelineText(item.message || `${who} recorded an activity`),
    details: [],
  };
}
