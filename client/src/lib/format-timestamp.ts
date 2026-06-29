/**
 * Parse and format API timestamps (UTC ISO) in the user's local timezone.
 */

export function parseTimestamp(
  value: string | Date | null | undefined
): Date | null {
  if (value == null || value === "") return null;

  if (value instanceof Date) {
    return isNaN(value.getTime()) ? null : value;
  }

  const d = new Date(String(value).trim());
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

export function formatTimestamp(
  value: string | Date | null | undefined,
  style: FormatStyle = "datetime"
): string {
  const parsed = parseTimestamp(value);
  if (!parsed) return "—";
  return parsed.toLocaleString(undefined, STYLE_OPTIONS[style]);
}

/** Follow-up badge: day, month, time (no year). */
export function formatFollowupShort(
  value: string | Date | null | undefined
): string | null {
  const parsed = parseTimestamp(value);
  if (!parsed) return null;

  return parsed.toLocaleString(undefined, {
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}
