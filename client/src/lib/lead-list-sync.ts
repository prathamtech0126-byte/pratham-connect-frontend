import type { LeadEntity } from "@/api/leads.api";
import { mergeLeadRow } from "@/lib/lead-status-tags";

const PATCHES_KEY = "lead-list-optimistic-patches";

type PatchMap = Record<string, Partial<LeadEntity>>;

function readPatches(): PatchMap {
  try {
    const raw = sessionStorage.getItem(PATCHES_KEY);
    return raw ? (JSON.parse(raw) as PatchMap) : {};
  } catch {
    return {};
  }
}

function writePatches(map: PatchMap) {
  try {
    if (Object.keys(map).length === 0) {
      sessionStorage.removeItem(PATCHES_KEY);
      return;
    }
    sessionStorage.setItem(PATCHES_KEY, JSON.stringify(map));
  } catch {
    // ignore quota / private mode
  }
}

/** Queue a lead row patch so the list reflects detail-page edits immediately. */
export function pushLeadListPatch(leadId: number, patch: Partial<LeadEntity>) {
  const map = readPatches();
  const key = String(leadId);
  map[key] = { ...map[key], ...patch, id: leadId };
  writePatches(map);
}

export function consumeLeadListPatches(): PatchMap {
  const map = readPatches();
  writePatches({});
  return map;
}

export function applyLeadListPatches(items: LeadEntity[], patches: PatchMap): LeadEntity[] {
  if (!Object.keys(patches).length) return items;
  return items.map((lead) => {
    const patch = patches[String(lead.id)];
    if (!patch) return lead;
    return mergeLeadRow(lead, patch);
  });
}

export function extractLeadFromSocketPayload(payload: unknown): LeadEntity | null {
  if (!payload || typeof payload !== "object") return null;
  const obj = payload as Record<string, unknown>;
  if (typeof obj.id === "number") return obj as unknown as LeadEntity;
  const nested = obj.lead;
  if (nested && typeof nested === "object" && typeof (nested as { id?: unknown }).id === "number") {
    return nested as unknown as LeadEntity;
  }
  return null;
}
