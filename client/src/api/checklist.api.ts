import api from "@/lib/api";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface Category {
  id: string;
  name: string;
  slug: string;
  description?: string;
  displayOrder: number;
  checklistCount: number;
}

export interface Country {
  id: string;
  name: string;
  code: string;
}

export interface ChecklistSummary {
  id: string;
  title: string;
  slug: string;
  subType: string | null;
  countryId: string | null;
  displayOrder: number;
  isActive: boolean;
  sectionCount: number;
  itemCount: number;
}

export interface Item {
  id: string;
  name: string;
  notes: string | null;
  isMandatory: boolean;
  isConditional: boolean;
  conditionText: string | null;
  quantityNote: string | null;
  displayOrder: number;
}

export interface Section {
  id: string;
  title: string;
  description: string | null;
  displayOrder: number;
  isConditional: boolean;
  conditionText: string | null;
  items: Item[];
}

export interface ChecklistDetail {
  id: string;
  title: string;
  slug: string;
  subType: string | null;
  countryId: string | null;
  sections: Section[];
}

export interface SearchResult {
  itemId: string;
  itemName: string;
  notes: string | null;
  isMandatory: boolean;
  quantityNote: string | null;
  sectionId: string;
  sectionTitle: string;
  checklistId: string;
  checklistTitle: string;
  checklistSlug: string;
}

// ─── API Functions ─────────────────────────────────────────────────────────────

export async function fetchCategories(): Promise<Category[]> {
  const res = await api.get("/api/v1/categories");
  return res.data.data;
}

export async function fetchCountries(): Promise<Country[]> {
  const res = await api.get("/api/v1/countries");
  return res.data.data;
}

export async function fetchChecklists(
  category: string,
  country: string
): Promise<ChecklistSummary[]> {
  const params: Record<string, string> = { category };
  if (country) params.country = country;
  const res = await api.get("/api/v1/checklists", { params });
  return res.data.data;
}

export async function fetchChecklistDetail(slug: string): Promise<ChecklistDetail> {
  const res = await api.get(`/api/v1/checklists/${slug}`);
  return res.data.data;
}

export async function searchItems(query: string): Promise<SearchResult[]> {
  const res = await api.get("/api/v1/search", { params: { q: query } });
  return res.data.data;
}
