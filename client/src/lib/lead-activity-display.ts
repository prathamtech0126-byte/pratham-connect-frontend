import { formatTimestamp } from "@/lib/format-timestamp";
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
const ELIGIBILITY_QUALITY_REASON_PREFIX = /^(Eligibility marked as|Lead quality marked as)/i;
const MERGE_REASON_NOTE_WINDOW_MS = 120_000;

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

export function isEligibilityQualityReasonMessage(message: string | null | undefined): boolean {
  return ELIGIBILITY_QUALITY_REASON_PREFIX.test(message?.trim() ?? "");
}

function hasEligibilityOrQualityChange(item: LeadActivityLike): boolean {
  if (item.activityType !== "lead_update" && metaEventType(item) !== "lead_updated") return false;
  return getLeadUpdateChanges(item).some((c) => {
    const field = normalizeFieldName(c.field);
    return field === "Eligibility" || field === "Lead Quality";
  });
}

function getReasonNoteText(item: LeadActivityLike): string {
  const meta = item.meta ?? {};
  if (typeof meta.reasonNote === "string" && meta.reasonNote.trim()) return meta.reasonNote.trim();
  if (isEligibilityQualityReasonMessage(item.message)) return item.message!.trim();
  return "";
}

/** Merge legacy duplicate pairs (lead_update + separate reason note) for display. */
export function normalizeLeadActivitiesForDisplay<T extends LeadActivityLike>(activities: T[]): T[] {
  const result = [...activities];
  const toRemove = new Set<number>();

  const reasonNotes = result.filter(
    (a) =>
      a.activityType === "note" &&
      (a.meta?.isReasonNote === true || isEligibilityQualityReasonMessage(a.message))
  );

  for (const note of reasonNotes) {
    const noteTime = new Date(note.createdAt).getTime();
    const matchIdx = result.findIndex((a) => {
      if (a.activityType !== "lead_update" || a.id === note.id || toRemove.has(a.id)) return false;
      if (note.userId != null && a.userId != null && note.userId !== a.userId) return false;
      if (Math.abs(new Date(a.createdAt).getTime() - noteTime) > MERGE_REASON_NOTE_WINDOW_MS) {
        return false;
      }
      return hasEligibilityOrQualityChange(a);
    });

    if (matchIdx < 0) continue;

    const update = result[matchIdx];
    const reasonText = note.message?.trim() ?? "";
    result[matchIdx] = {
      ...update,
      message: reasonText || update.message,
      meta: {
        ...(update.meta ?? {}),
        reasonNote: reasonText,
        reasonType: note.meta?.reasonType ?? update.meta?.reasonType,
        showInNotes: true,
      },
    } as T;
    toRemove.add(note.id);
  }

  return result.filter((a) => !toRemove.has(a.id));
}

export function getLeadNoteDisplayMessage(item: LeadActivityLike): string {
  const reason = getReasonNoteText(item);
  if (reason) return reason;
  return item.message?.trim() ?? "";
}

export function isLeadNotesSectionActivity(item: LeadActivityLike): boolean {
  if (item.activityType === "lead_update") {
    const meta = item.meta ?? {};
    return Boolean(
      meta.showInNotes || meta.reasonNote || isEligibilityQualityReasonMessage(item.message)
    );
  }
  if (item.activityType === "note") {
    if (item.meta?.isReasonNote === true || isEligibilityQualityReasonMessage(item.message)) {
      return true;
    }
    return (
      !item.meta?.eventType && !(item.message ?? "").toLowerCase().includes("updated the lead")
    );
  }
  return false;
}

export function shouldIncludeLeadTimelineActivity(activity: LeadActivityEntity): boolean {
  const type = activity.activityType;
  if (
    type === "followup" ||
    type === "assignment_change" ||
    type === "counselor_assign" ||
    type === "lead_created"
  ) {
    return true;
  }

  if (type === "note") {
    if (activity.meta?.isReasonNote === true || isEligibilityQualityReasonMessage(activity.message)) {
      return true;
    }
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
    const reasonNote = getReasonNoteText(item);

    if (rawChanges.some(isConversionFieldChange)) {
      const convertedAt =
        parseConvertedAtFromChanges(rawChanges) ?? new Date(item.createdAt);
      return {
        title: `${who} converted to client`,
        details: [`Converted at ${formatTimestamp(convertedAt.toISOString(), "datetime")}`],
      };
    }

    const changes = filterTimelineLeadUpdateChanges(rawChanges);
    if (reasonNote) {
      const eligQualityChange = changes.find((c) => {
        const field = normalizeFieldName(c.field);
        return field === "Eligibility" || field === "Lead Quality";
      });
      if (eligQualityChange) {
        return {
          title: formatSetChangeLine(who, eligQualityChange),
          details: [truncateTimelineText(reasonNote)],
        };
      }
      return {
        title: `${who} updated the lead`,
        details: [truncateTimelineText(reasonNote)],
      };
    }
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
      ? formatTimestamp(item.followupAt, "datetime")
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

  if (item.activityType === "note") {
    if (item.meta?.isReasonNote === true || isEligibilityQualityReasonMessage(item.message)) {
      const msg = getLeadNoteDisplayMessage(item);
      return {
        title: truncateTimelineText(msg),
        details: [],
      };
    }
    if (/convert|converted|client/i.test(item.message ?? "")) {
      return {
        title: `${who} converted to client`,
        details: [
          `Converted at ${formatTimestamp(item.createdAt, "datetime")}`,
        ],
      };
    }
    const dropMatch = (item.message ?? "").match(/^client dropped:\s*(.*)$/i);
    const isDropNote = /^\[DROP\]/i.test((item.message ?? "").trim());
    if (dropMatch || isDropNote) {
      const reason = dropMatch?.[1]?.trim() || "";
      return {
        title: `${who} dropped the client`,
        details: [
          `Dropped at ${formatTimestamp(item.createdAt, "datetime")}`,
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
