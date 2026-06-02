import { CRM_LEAD_DATE_TZ } from "@/lib/ist-date-range";

/**
 * Parse API/DB timestamps for CRM display.
<<<<<<< HEAD
 * Handles: explicit +05:30, UTC `...Z` instants, and naive strings without offset.
=======
 * All timestamps from the backend are UTC — convert to IST for display.
>>>>>>> main
 */
export function parseCrmTimestamp(
  value: string | Date | null | undefined
): Date | null {
  if (value == null || value === "") return null;

  if (value instanceof Date) {
    return isNaN(value.getTime()) ? null : value;
  }

  const s = String(value).trim();
  if (!s) return null;

  // Has explicit timezone offset (e.g. +05:30, +00:00) — truncate microseconds for browser compat
  if (/[+-]\d{2}:\d{2}$/.test(s)) {
    const safe = s.replace(/(\.\d{3})\d+(?=[+-])/, "$1");
    const d = new Date(safe);
    return isNaN(d.getTime()) ? null : d;
  }

<<<<<<< HEAD
  // True UTC instant (e.g. optimistic toISOString before patch). Display in IST via format*.
  if (s.endsWith("Z")) {
    const d = new Date(s);
=======
  // Ends with Z (UTC) — truncate microseconds for browser compat
  if (s.endsWith("Z")) {
    const safe = s.replace(/(\.\d{3})\d+Z$/, "$1Z");
    const d = new Date(safe);
>>>>>>> main
    return isNaN(d.getTime()) ? null : d;
  }

  // Naive datetime string (no timezone) — backend stores UTC, so treat as UTC
  const normalized = s.replace(" ", "T").replace(/\.\d+$/, "");
  const d = new Date(`${normalized}Z`);
  return isNaN(d.getTime()) ? null : d;
}

type FormatStyle = "date" | "time" | "datetime";

const STYLE_OPTIONS: Record<FormatStyle, Intl.DateTimeFormatOptions> = {
  date: { day: "numeric", month: "short", year: "numeric" },
  time: { hour: "numeric", minute: "2-digit", hour12: true },
  datetime: {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  },
};

/** Format a CRM timestamp in Asia/Kolkata (matches DB wall clock). */
export function formatCrmTimestamp(
  value: string | Date | null | undefined,
  style: FormatStyle = "datetime"
): string {
  const parsed = parseCrmTimestamp(value);
  if (!parsed) return "—";

  return parsed.toLocaleString("en-IN", {
    ...STYLE_OPTIONS[style],
    timeZone: CRM_LEAD_DATE_TZ,
  });
}

/**
 * Serialize a Date for CRM lead/follow-up fields (+05:30 wall clock).
 * Matches backend serializePgNaiveTimestampAsIst.
 */
export function toCrmApiTimestamp(value: Date): string {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: CRM_LEAD_DATE_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).formatToParts(value);

  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((p) => p.type === type)?.value ?? "00";

  const pad = (n: string) => n.padStart(2, "0");
  const ms = value.getMilliseconds();
  const base = `${get("year")}-${pad(get("month"))}-${pad(get("day"))}T${pad(get("hour"))}:${pad(get("minute"))}:${pad(get("second"))}`;
  if (ms > 0) {
    return `${base}.${String(ms).padStart(3, "0")}${IST_OFFSET}`;
  }
  return `${base}${IST_OFFSET}`;
}

/** Follow-up badge: day, month, time (no year). */
export function formatCrmFollowupShort(
  value: string | Date | null | undefined
): string | null {
  const parsed = parseCrmTimestamp(value);
  if (!parsed) return null;

  return parsed.toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: CRM_LEAD_DATE_TZ,
  });
}
