import { CRM_LEAD_DATE_TZ } from "@/lib/ist-date-range";

/**
 * Parse API/DB timestamps for CRM display.
 * All timestamps from the backend are UTC — convert to IST for display.
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

  // Ends with Z (UTC) — truncate microseconds for browser compat
  if (s.endsWith("Z")) {
    const safe = s.replace(/(\.\d{3})\d+Z$/, "$1Z");
    const d = new Date(safe);
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
