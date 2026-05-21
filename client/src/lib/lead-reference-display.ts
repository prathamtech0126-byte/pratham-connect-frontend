import type { LeadEntity } from "@/api/leads.api";
import {
  isClientReferenceSourceSlug,
  isInternalReferenceSourceSlug,
} from "@/lib/lead-source-display";

export type LeadReferenceLike = {
  kind?: "client" | "internal" | "self" | null;
  name?: string | null;
  memberRole?: string | null;
  isManual?: boolean;
  counsellorName?: string | null;
};

export function leadHasReferenceSource(lead: { leadSource?: string | null }): boolean {
  if (!lead.leadSource) return false;
  return (
    isClientReferenceSourceSlug(lead.leadSource) ||
    isInternalReferenceSourceSlug(lead.leadSource)
  );
}

export function getLeadReferenceFromEntity(lead: LeadEntity): LeadReferenceLike | null {
  const ref = lead.referenceMeta ?? lead.reference ?? null;
  if (!ref?.name?.trim()) return null;
  return ref;
}

/** Label for list/detail: client name or team member name. */
export function getLeadReferenceDisplayLabel(lead: LeadEntity): string | null {
  if (!leadHasReferenceSource(lead)) return null;
  const ref = getLeadReferenceFromEntity(lead);
  if (ref?.name?.trim()) return ref.name.trim();
  if (lead.referenceDisplayName?.trim()) return lead.referenceDisplayName.trim();
  return null;
}

export function getLeadReferenceDetailCaption(lead: LeadEntity): string | null {
  const name = getLeadReferenceDisplayLabel(lead);
  if (!name) return null;
  const ref = getLeadReferenceFromEntity(lead);
  if (!ref) return name;

  if (ref.kind === "client") {
    if (ref.isManual) {
      const c = ref.counsellorName?.trim();
      return c ? `${name} (manual — counsellor: ${c})` : `${name} (manual entry)`;
    }
    return name;
  }
  if (ref.kind === "self") return `${name} (self)`;
  if (ref.memberRole) {
    return `${name} (${ref.memberRole})`;
  }
  return name;
}

export function getLeadReferenceFieldLabel(lead: LeadEntity): string {
  if (!lead.leadSource) return "Reference";
  if (isClientReferenceSourceSlug(lead.leadSource)) return "Client reference";
  if (isInternalReferenceSourceSlug(lead.leadSource)) return "Internal reference";
  return "Reference";
}
