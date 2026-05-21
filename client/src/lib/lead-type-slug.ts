/**
 * Canonical slug for lead types (must stay in sync with
 * `normalizeLeadTypeSlug` in pratham-connect-backend/src/Leads/models/leadType.model.ts).
 */
export function normalizeLeadTypeSlug(raw: string | null | undefined): string {
  if (raw == null) return "";
  let s = String(raw).trim().toLowerCase();
  if (!s) return "";
  s = s.replace(/[\s\-]+/g, "_");
  s = s.replace(/[^a-z0-9_]/g, "");
  s = s.replace(/_+/g, "_").replace(/^_|_$/g, "");
  return s;
}
