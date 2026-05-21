export type LeadSourceOption = {
  leadType: string;
  displayAlias?: string | null;
};

export function formatLeadSourceSlug(slug: string | null | undefined): string {
  if (!slug) return "—";
  return slug
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export function getLeadSourceLabel(
  slug: string | null | undefined,
  options?: LeadSourceOption[]
): string {
  if (!slug) return "—";
  const normalized = slug.trim().toLowerCase();
  const match = options?.find((o) => o.leadType.trim().toLowerCase() === normalized);
  if (match?.displayAlias?.trim()) return match.displayAlias.trim();
  return formatLeadSourceSlug(slug);
}

export function normalizeLeadSourceSlug(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/[\s\-]+/g, "_")
    .replace(/[^a-z0-9_]/g, "")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "");
}

export function isClientReferenceSourceSlug(slug: string): boolean {
  const n = normalizeLeadSourceSlug(slug);
  return (
    n === "client_reference" ||
    n === "referral" ||
    n === "reference" ||
    n.includes("client") && n.includes("reference")
  );
}

const INBOUND_CHANNEL_SLUGS = new Set(["udaan", "udan", "walk_in", "web_site"]);

/** 3rd-party registrations (Udaan, walk-in desk, website) — often not_assigned until distributed. */
export function isInboundChannelLead(lead: {
  leadSource?: string | null;
  leadType?: string | null;
}): boolean {
  for (const raw of [lead.leadSource, lead.leadType]) {
    const slug = normalizeLeadSourceSlug(raw ?? "");
    if (slug && INBOUND_CHANNEL_SLUGS.has(slug)) return true;
  }
  return false;
}

export function isInternalReferenceSourceSlug(slug: string): boolean {
  const n = normalizeLeadSourceSlug(slug);
  return (
    n === "internal_reference" ||
    n === "internal_reffal" ||
    n === "internal_referral" ||
    n.includes("internal") && (n.includes("reference") || n.includes("referral") || n.includes("reffal"))
  );
}
