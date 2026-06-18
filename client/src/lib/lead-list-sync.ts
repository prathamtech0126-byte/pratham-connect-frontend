import type { LeadEntity } from "@/api/leads.api";
import { mergeLeadRow } from "@/lib/lead-status-tags";

const PATCHES_KEY = "lead-list-optimistic-patches";
const LEADS_CACHE_KEY = "leadlist_data_cache";
const LEADS_NAV_TS_KEY = "leadlist_nav_ts";
const LEADLIST_SCROLL_KEY = "leadlist_scroll_y";
const LEADS_CACHE_TTL_MS = 5 * 60 * 1000;

interface LeadsDataCache {
  leads: LeadEntity[];
  ts: number;
}

export function saveLeadListCache(leads: LeadEntity[]) {
  try {
    sessionStorage.setItem(LEADS_CACHE_KEY, JSON.stringify({ leads, ts: Date.now() } satisfies LeadsDataCache));
  } catch {}
}

export function readLeadListCache(): LeadEntity[] | null {
  try {
    const raw = sessionStorage.getItem(LEADS_CACHE_KEY);
    if (!raw) return null;
    const { leads, ts } = JSON.parse(raw) as LeadsDataCache;
    if (Date.now() - ts > LEADS_CACHE_TTL_MS) return null;
    return leads;
  } catch { return null; }
}

/** Call before navigating away from the list (e.g. into a lead detail). */
export function markLeadListNavAway() {
  try {
    sessionStorage.setItem(LEADS_NAV_TS_KEY, String(Date.now()));
  } catch {}
}

/**
 * Returns true (and clears the flag) when the list is mounting after a
 * return from the detail page. Returns false on a fresh navigation.
 */
export function consumeLeadListNavReturn(): boolean {
  try {
    const ts = sessionStorage.getItem(LEADS_NAV_TS_KEY);
    if (!ts) return false;
    sessionStorage.removeItem(LEADS_NAV_TS_KEY);
    return Date.now() - Number(ts) < 10 * 60 * 1000;
  } catch { return false; }
}

function getScrollContainer(): Element | null {
  return document.getElementById("main-scroll-container");
}

export function saveLeadListScrollY(y: number) {
  try {
    sessionStorage.setItem(LEADLIST_SCROLL_KEY, String(y));
  } catch {}
}

export function getScrollContainerScrollY(): number {
  return getScrollContainer()?.scrollTop ?? 0;
}

export function consumeLeadListScrollY(): number | null {
  try {
    const v = sessionStorage.getItem(LEADLIST_SCROLL_KEY);
    if (v == null) return null;
    sessionStorage.removeItem(LEADLIST_SCROLL_KEY);
    return Number(v);
  } catch { return null; }
}

export function restoreLeadListScrollY(y: number) {
  const el = getScrollContainer();
  if (el) el.scrollTo({ top: y, behavior: "instant" });
}

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
