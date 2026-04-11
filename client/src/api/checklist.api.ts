// import api from "@/lib/api";

// // ─── Types ────────────────────────────────────────────────────────────────────

// export interface Category {
//   id: string;
//   name: string;
//   slug: string;
//   description?: string;
//   displayOrder: number;
//   checklistCount: number;
// }

// export interface Country {
//   id: string;
//   name: string;
//   code: string;
// }

// export interface ChecklistSummary {
//   id: string;
//   title: string;
//   slug: string;
//   subType: string | null;
//   countryId: string | null;
//   displayOrder: number;
//   isActive: boolean;
//   sectionCount: number;
//   itemCount: number;
// }

// export interface Item {
//   id: string;
//   name: string;
//   notes: string | null;
//   isMandatory: boolean;
//   isConditional: boolean;
//   conditionText: string | null;
//   quantityNote: string | null;
//   displayOrder: number;
// }

// export interface Section {
//   id: string;
//   title: string;
//   description: string | null;
//   displayOrder: number;
//   isConditional: boolean;
//   conditionText: string | null;
//   items: Item[];
// }

// export interface ChecklistDetail {
//   id: string;
//   title: string;
//   slug: string;
//   subType: string | null;
//   countryId: string | null;
//   sections: Section[];
// }

// export interface SearchResult {
//   itemId: string;
//   itemName: string;
//   notes: string | null;
//   isMandatory: boolean;
//   quantityNote: string | null;
//   sectionId: string;
//   sectionTitle: string;
//   checklistId: string;
//   checklistTitle: string;
//   checklistSlug: string;
// }

// // ─── API Functions ─────────────────────────────────────────────────────────────

// export async function fetchCategories(): Promise<Category[]> {
//   const res = await api.get<{ data: Category[] }>("/api/v1/categories");
//   return res.data.data;
// }

// export async function fetchCountries(): Promise<Country[]> {
//   const res = await api.get<{ data: Country[] }>("/api/v1/countries");
//   return res.data.data;
// }

// export async function fetchChecklists(
//   category: string,
//   country: string | null
// ): Promise<ChecklistSummary[]> {
//   const params: Record<string, string> = { category };
//   if (country) params.country = country;
//   const res = await api.get<{ data: ChecklistSummary[] }>("/api/v1/checklists", { params });
//   return res.data.data;
// }

// export async function fetchChecklistDetail(slug: string): Promise<ChecklistDetail> {
//   const res = await api.get<{ data: ChecklistDetail }>(`/api/v1/checklists/${slug}`);
//   return res.data.data;
// }

// export async function searchItems(query: string): Promise<SearchResult[]> {
//   const res = await api.get<{ data: SearchResult[] }>("/api/v1/search", { params: { q: query } });
//   return res.data.data;
// }


// client/src/api/checklist.api.ts
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

// ─── Admin Types for Create/Update ────────────────────────────────────────────

export interface CreateChecklistData {
  visaCategoryId: string;
  title: string;
  countryId?: string | null;
  slug?: string;
  subType?: string;
  description?: string;
  displayOrder?: number;
  isActive?: boolean;
}

export interface UpdateChecklistData {
  title?: string;
  subType?: string | null;
  countryId?: string | null;
  displayOrder?: number;
  isActive?: boolean;
  categoryId?: string;
}

export interface CreateSectionData {
  title: string;
  description?: string;
  displayOrder?: number;
  isConditional?: boolean;
  conditionText?: string;
}

export interface UpdateSectionData {
  title?: string;
  description?: string | null;
  displayOrder?: number;
  isConditional?: boolean;
  conditionText?: string | null;
}

export interface CreateItemData {
  name: string;
  notes?: string;
  isMandatory?: boolean;
  isConditional?: boolean;
  conditionText?: string;
  quantityNote?: string;
  displayOrder?: number;
}

export interface UpdateItemData {
  name?: string;
  notes?: string | null;
  isMandatory?: boolean;
  isConditional?: boolean;
  conditionText?: string | null;
  quantityNote?: string | null;
  displayOrder?: number;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data: T;
  message?: string;
}

// ─── GET API Functions (Existing) ─────────────────────────────────────────────

export async function fetchCategories(): Promise<Category[]> {
  const res = await api.get<{ data: Category[] }>("/api/v1/categories");
  return res.data.data;
}

export async function fetchCountries(): Promise<Country[]> {
  const res = await api.get<{ data: Country[] }>("/api/v1/countries");
  return res.data.data;
}

export async function fetchChecklists(
  category: string,
  country: string | null
): Promise<ChecklistSummary[]> {
  const params: Record<string, string> = { category };
  if (country) params.country = country;
  const res = await api.get<{ data: ChecklistSummary[] }>("/api/v1/checklists", { params });
  return res.data.data;
}

export async function fetchChecklistDetail(slug: string): Promise<ChecklistDetail> {
  const res = await api.get<{ data: ChecklistDetail }>(`/api/v1/checklists/${slug}`);
  return res.data.data;
}

export async function searchItems(query: string): Promise<SearchResult[]> {
  const res = await api.get<{ data: SearchResult[] }>("/api/v1/search", { params: { q: query } });
  return res.data.data;
}

// ─── POST API Functions (Admin) ───────────────────────────────────────────────

export async function createChecklist(data: CreateChecklistData): Promise<ApiResponse<ChecklistSummary>> {
  const res = await api.post<ApiResponse<ChecklistSummary>>("/api/v1/admin/checklists", data);
  return res.data;
}

export async function createSection(checklistId: string, data: CreateSectionData): Promise<ApiResponse<Section>> {
  const res = await api.post<ApiResponse<Section>>(`/api/v1/admin/checklists/${checklistId}/sections`, data);
  return res.data;
}

export async function createItem(sectionId: string, data: CreateItemData): Promise<ApiResponse<Item>> {
  const res = await api.post<ApiResponse<Item>>(`/api/v1/admin/sections/${sectionId}/items`, data);
  return res.data;
}

// ─── PUT API Functions (Admin) ────────────────────────────────────────────────

export async function updateChecklist(id: string, data: UpdateChecklistData): Promise<ApiResponse<ChecklistSummary>> {
  const res = await api.put<ApiResponse<ChecklistSummary>>(`/api/v1/admin/checklists/${id}`, data);
  return res.data;
}

export async function updateSection(id: string, data: UpdateSectionData): Promise<ApiResponse<Section>> {
  const res = await api.put<ApiResponse<Section>>(`/api/v1/admin/sections/${id}`, data);
  return res.data;
}

export async function updateItem(id: string, data: UpdateItemData): Promise<ApiResponse<Item>> {
  const res = await api.put<ApiResponse<Item>>(`/api/v1/admin/items/${id}`, data);
  return res.data;
}

// ─── DELETE API Functions (Admin) ─────────────────────────────────────────────

export async function deleteChecklist(id: string): Promise<ApiResponse<void>> {
  const res = await api.delete<ApiResponse<void>>(`/api/v1/admin/checklists/${id}`);
  return res.data;
}

export async function deleteSection(id: string): Promise<ApiResponse<void>> {
  const res = await api.delete<ApiResponse<void>>(`/api/v1/admin/sections/${id}`);
  return res.data;
}

export async function deleteItem(id: string): Promise<ApiResponse<void>> {
  const res = await api.delete<ApiResponse<void>>(`/api/v1/admin/items/${id}`);
  return res.data;
}

// ─── Bulk Operations (Admin) ──────────────────────────────────────────────────

export interface BulkImportData {
  sections: Array<{
    title: string;
    description?: string;
    displayOrder: number;
    isConditional?: boolean;
    conditionText?: string;
    items: Array<{
      name: string;
      notes?: string;
      isMandatory?: boolean;
      isConditional?: boolean;
      conditionText?: string;
      quantityNote?: string;
      displayOrder: number;
    }>;
  }>;
}

export async function bulkImportToChecklist(checklistId: string, data: BulkImportData): Promise<ApiResponse<ChecklistDetail>> {
  const res = await api.post<ApiResponse<ChecklistDetail>>(`/api/v1/admin/checklists/${checklistId}/bulk-import`, data);
  return res.data;
}

// ─── Helper function to get checklist ID from slug if needed ──────────────────
export async function getChecklistIdBySlug(slug: string): Promise<string> {
  const detail = await fetchChecklistDetail(slug);
  return detail.id;
}