import { CRM_LEAD_DATE_TZ } from "@/lib/ist-date-range";

const IST_OFFSET = "+05:30";

/**
 * Parse API/DB timestamps for CRM display.
 * Handles: explicit +05:30, legacy `...Z` (naive stored as UTC), and naive strings without offset.
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

  if (/[+-]\d{2}:\d{2}$/.test(s)) {
    const d = new Date(s);
    return isNaN(d.getTime()) ? null : d;
  }

  if (s.endsWith("Z")) {
    const normalized = s.replace(/\.\d+Z$/, "").replace(/Z$/, "");
    const d = new Date(`${normalized}${IST_OFFSET}`);
    return isNaN(d.getTime()) ? null : d;
  }

  const normalized = s.replace(" ", "T").replace(/\.\d+$/, "");
  const d = new Date(`${normalized}${IST_OFFSET}`);
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
