import { format, parse } from "date-fns";

/** DB/API `YYYY-MM-DD` → `DD/MM/YYYY` for the lead DOB picker. */
export function ymdToDmySlash(ymd: string | null | undefined): string {
  if (!ymd) return "";
  const s = String(ymd).trim().slice(0, 10);
  const slash = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (slash) return s;
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return s;
  return `${m[3]}/${m[2]}/${m[1]}`;
}

/** Human-readable label for read-only DOB display. */
export function formatDobDisplay(ymd: string | null | undefined): string {
  if (!ymd) return "";
  const normalized = String(ymd).trim().slice(0, 10);
  const iso = normalized.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (iso) {
    const d = parse(normalized, "yyyy-MM-dd", new Date());
    if (!isNaN(d.getTime())) return format(d, "d MMMM yyyy");
  }
  const slash = normalized.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (slash) {
    const [, dd, mm, yyyy] = slash;
    const d = parse(`${yyyy}-${mm}-${dd}`, "yyyy-MM-dd", new Date());
    if (!isNaN(d.getTime())) return format(d, "d MMMM yyyy");
  }
  return normalized;
}
