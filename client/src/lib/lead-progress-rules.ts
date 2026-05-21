import type { LeadEntity, LeadProgressStatus } from "@/api/leads.api";

/**
 * Build list patch from API response only — never guess progress on the client.
 */
export function listPatchFromLeadUpdate(
  updated: Pick<LeadEntity, "progressStatus" | "eligibilityStatus" | "leadQuality">,
  fieldPatch: Partial<Pick<LeadEntity, "eligibilityStatus" | "leadQuality">>,
  previousProgress?: LeadProgressStatus | string | null
): Partial<LeadEntity> {
  const patch: Partial<LeadEntity> = { ...fieldPatch };
  if (
    updated.progressStatus != null &&
    updated.progressStatus !== previousProgress
  ) {
    patch.progressStatus = updated.progressStatus as LeadProgressStatus;
  }
  return patch;
}
