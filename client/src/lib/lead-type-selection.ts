export const CUSTOM_LEAD_TYPE_VALUE = "__custom__";
export const MAX_CUSTOM_LEAD_TYPE_LENGTH = 50;
export const CUSTOM_LEAD_TYPE_GROUP_PREFIX = "lt:";

export function parseCustomLeadTypeFromGroup(
  group: string | null | undefined
): string | null {
  if (!group || !group.startsWith(CUSTOM_LEAD_TYPE_GROUP_PREFIX)) return null;
  const name = group.slice(CUSTOM_LEAD_TYPE_GROUP_PREFIX.length).trim();
  return name || null;
}

export function initLeadTypeState(strategy?: {
  leadTypeId?: number | null;
  masterDistributionGroup?: string | null;
}): { selectedLeadType: string; customLeadTypeName: string } {
  const custom = parseCustomLeadTypeFromGroup(strategy?.masterDistributionGroup);
  if (custom) {
    return { selectedLeadType: CUSTOM_LEAD_TYPE_VALUE, customLeadTypeName: custom };
  }
  if (strategy?.leadTypeId != null) {
    return { selectedLeadType: String(strategy.leadTypeId), customLeadTypeName: "" };
  }
  return { selectedLeadType: "", customLeadTypeName: "" };
}

export function isLeadTypeSelectionValid(
  selectedLeadType: string,
  customLeadTypeName: string
): boolean {
  if (!selectedLeadType) return false;
  if (selectedLeadType === CUSTOM_LEAD_TYPE_VALUE) {
    return customLeadTypeName.trim().length > 0;
  }
  return Number.isFinite(Number(selectedLeadType)) && Number(selectedLeadType) > 0;
}

export function buildLeadTypeApiFields(
  selectedLeadType: string,
  customLeadTypeName: string
): { leadTypeId?: number; customLeadTypeName?: string } {
  if (selectedLeadType === CUSTOM_LEAD_TYPE_VALUE) {
    const name = customLeadTypeName.trim().slice(0, MAX_CUSTOM_LEAD_TYPE_LENGTH);
    if (!name) throw new Error("LEAD_TYPE_REQUIRED");
    return { customLeadTypeName: name };
  }
  const id = Number(selectedLeadType);
  if (!Number.isFinite(id) || id <= 0) throw new Error("LEAD_TYPE_REQUIRED");
  return { leadTypeId: id };
}
