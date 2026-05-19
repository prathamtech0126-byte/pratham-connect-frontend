# Checklist Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a full Checklists section — sidebar link, category tabs, filterable card grid, search, and a slide-over detail drawer — for the Pratham International immigration CRM.

**Architecture:** All state lives in `ChecklistPage` (local React state, no URL params). Data fetching is done via `@tanstack/react-query` hooks calling an axios API layer. The drawer is the existing shadcn `Sheet` component with `side="right"`. No test framework exists in the project — verification is done by running the dev server (`npm run dev` from root).

**Tech Stack:** React 18, TypeScript, Tailwind CSS v4, wouter (routing), @tanstack/react-query, shadcn/ui, lucide-react, axios (`@/lib/api`)

---

## File Map

| Status | File | Responsibility |
|---|---|---|
| Create | `client/src/api/checklist.api.ts` | TypeScript types + all API call functions |
| Create | `client/src/hooks/useChecklists.ts` | All react-query hooks |
| Create | `client/src/components/checklist/CategoryTabs.tsx` | Horizontal tab switcher |
| Create | `client/src/components/checklist/ChecklistCard.tsx` | Single checklist card |
| Create | `client/src/components/checklist/SectionAccordion.tsx` | Collapsible section with items list |
| Create | `client/src/components/checklist/SearchResults.tsx` | Search result rows |
| Create | `client/src/components/checklist/ChecklistDrawer.tsx` | Right-side slide-over drawer |
| Create | `client/src/pages/ChecklistPage.tsx` | Main page, owns all state |
| Modify | `client/src/layout/Sidebar.tsx` | Add Checklists sidebar entry |
| Modify | `client/src/App.tsx` | Add lazy import + `/checklists` route |

---

## Task 1: API Layer

**Files:**
- Create: `client/src/api/checklist.api.ts`

- [ ] **Step 1: Create the file with all TypeScript types and API functions**

```typescript
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
```

- [ ] **Step 2: Verify TypeScript compiles cleanly**

```bash
cd "d:/Harsh Project/Pratham Connect/pratham-connect-frontend"
npx tsc --noEmit --project tsconfig.json 2>&1 | head -30
```

Expected: no errors relating to `checklist.api.ts`.

- [ ] **Step 3: Commit**

```bash
git add client/src/api/checklist.api.ts
git commit -m "feat: add checklist API layer and TypeScript types"
```

---

## Task 2: Data Fetching Hooks

**Files:**
- Create: `client/src/hooks/useChecklists.ts`

- [ ] **Step 1: Create the hooks file**

```typescript
// client/src/hooks/useChecklists.ts
import { useQuery } from "@tanstack/react-query";
import {
  fetchCategories,
  fetchCountries,
  fetchChecklists,
  fetchChecklistDetail,
  searchItems,
} from "@/api/checklist.api";

export function useCategories() {
  return useQuery({
    queryKey: ["checklist-categories"],
    queryFn: fetchCategories,
    staleTime: 1000 * 60 * 10,
  });
}

export function useCountries() {
  return useQuery({
    queryKey: ["checklist-countries"],
    queryFn: fetchCountries,
    staleTime: 1000 * 60 * 10,
  });
}

export function useChecklists(
  category: string,
  country: string,
  enabled: boolean
) {
  return useQuery({
    queryKey: ["checklists", category, country],
    queryFn: () => fetchChecklists(category, country),
    enabled: enabled && !!category,
  });
}

export function useChecklistDetail(slug: string | null) {
  return useQuery({
    queryKey: ["checklist-detail", slug],
    queryFn: () => fetchChecklistDetail(slug!),
    enabled: !!slug,
  });
}

export function useSearch(query: string) {
  return useQuery({
    queryKey: ["checklist-search", query],
    queryFn: () => searchItems(query),
    enabled: query.length >= 2,
  });
}
```

- [ ] **Step 2: Verify TypeScript compiles cleanly**

```bash
npx tsc --noEmit --project tsconfig.json 2>&1 | head -30
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add client/src/hooks/useChecklists.ts
git commit -m "feat: add checklist react-query hooks"
```

---

## Task 3: CategoryTabs Component

**Files:**
- Create: `client/src/components/checklist/CategoryTabs.tsx`

- [ ] **Step 1: Create the component**

```tsx
// client/src/components/checklist/CategoryTabs.tsx
import { cn } from "@/lib/utils";
import type { Category } from "@/api/checklist.api";

interface Props {
  categories: Category[];
  activeSlug: string;
  onSelect: (slug: string) => void;
}

export function CategoryTabs({ categories, activeSlug, onSelect }: Props) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
      {categories.map((cat) => (
        <button
          key={cat.slug}
          onClick={() => onSelect(cat.slug)}
          className={cn(
            "flex-shrink-0 flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-semibold transition-all duration-200",
            activeSlug === cat.slug
              ? "bg-indigo-600 text-white shadow-md shadow-indigo-200"
              : "bg-white text-slate-600 border border-slate-200 hover:border-indigo-300 hover:text-indigo-600"
          )}
        >
          {cat.name}
          <span
            className={cn(
              "text-xs rounded-full px-2 py-0.5 font-bold",
              activeSlug === cat.slug
                ? "bg-white/20 text-white"
                : "bg-slate-100 text-slate-500"
            )}
          >
            {cat.checklistCount}
          </span>
        </button>
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add client/src/components/checklist/CategoryTabs.tsx
git commit -m "feat: add CategoryTabs component"
```

---

## Task 4: ChecklistCard Component

**Files:**
- Create: `client/src/components/checklist/ChecklistCard.tsx`

- [ ] **Step 1: Create the component**

```tsx
// client/src/components/checklist/ChecklistCard.tsx
import { Globe, FileText, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ChecklistSummary } from "@/api/checklist.api";

interface Props {
  checklist: ChecklistSummary;
  countryName: string | null;
  onView: (slug: string) => void;
}

export function ChecklistCard({ checklist, countryName, onView }: Props) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md hover:border-indigo-200 transition-all duration-200 flex flex-col p-5 gap-4">
      {/* Title + sub-type */}
      <div className="flex items-start justify-between gap-2">
        <h3 className="text-sm font-semibold text-slate-800 leading-snug flex-1">
          {checklist.title}
        </h3>
        {checklist.subType && (
          <span className="flex-shrink-0 text-xs bg-indigo-50 text-indigo-700 border border-indigo-100 px-2 py-0.5 rounded-full font-medium">
            {checklist.subType}
          </span>
        )}
      </div>

      {/* Meta */}
      <div className="flex flex-col gap-2 text-xs text-slate-500">
        <div className="flex items-center gap-1.5">
          <Globe className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          <span>{countryName ?? "All Countries"}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <FileText className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          <span>
            {checklist.sectionCount > 0
              ? `${checklist.sectionCount} sections · ${checklist.itemCount} items`
              : "—"}
          </span>
        </div>
      </div>

      {/* Action */}
      <Button
        onClick={() => onView(checklist.slug)}
        className="mt-auto w-full bg-indigo-600 hover:bg-indigo-700 text-white text-sm"
      >
        View Checklist
        <ChevronRight className="w-4 h-4 ml-1" />
      </Button>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add client/src/components/checklist/ChecklistCard.tsx
git commit -m "feat: add ChecklistCard component"
```

---

## Task 5: SectionAccordion Component

**Files:**
- Create: `client/src/components/checklist/SectionAccordion.tsx`

- [ ] **Step 1: Create the component**

```tsx
// client/src/components/checklist/SectionAccordion.tsx
import { useState } from "react";
import { ChevronDown, ChevronRight, Info } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Section } from "@/api/checklist.api";

interface Props {
  section: Section;
}

export function SectionAccordion({ section }: Props) {
  const [open, setOpen] = useState(true);

  const sortedItems = section.items
    .slice()
    .sort((a, b) => a.displayOrder - b.displayOrder);

  return (
    <div className="border border-slate-200 rounded-lg overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-4 py-3 bg-slate-50 hover:bg-slate-100 transition-colors text-left"
      >
        <div className="flex items-center gap-2 flex-1 flex-wrap">
          <span className="text-sm font-semibold text-slate-800">
            {section.title}
          </span>
          {section.isConditional && (
            <span className="text-xs bg-amber-100 text-amber-800 border border-amber-200 px-2 py-0.5 rounded-full font-medium">
              {section.conditionText ?? "Conditional"}
            </span>
          )}
        </div>
        {open ? (
          <ChevronDown className="w-4 h-4 text-slate-400 shrink-0 ml-2" />
        ) : (
          <ChevronRight className="w-4 h-4 text-slate-400 shrink-0 ml-2" />
        )}
      </button>

      {/* Body */}
      {open && (
        <div className="px-4 py-3 space-y-3">
          {/* Description info box */}
          {section.description && (
            <div className="flex gap-2 bg-indigo-50 border-l-4 border-indigo-400 rounded-r-lg px-3 py-2">
              <Info className="w-4 h-4 text-indigo-500 shrink-0 mt-0.5" />
              <p className="text-xs text-indigo-700">{section.description}</p>
            </div>
          )}

          {/* Items */}
          {sortedItems.length === 0 ? (
            <p className="text-xs text-slate-400 italic py-2">
              No documents listed yet.
            </p>
          ) : (
            <ol className="space-y-3">
              {sortedItems.map((item, index) => (
                <li key={item.id} className="flex items-start gap-3">
                  {/* Number */}
                  <span className="text-xs font-bold text-slate-400 mt-0.5 w-5 shrink-0 text-right">
                    {index + 1}.
                  </span>

                  {/* Name + notes */}
                  <div className="flex-1 min-w-0">
                    <span className="text-sm font-semibold text-slate-800">
                      {item.name}
                    </span>
                    {item.notes && (
                      <p className="text-xs italic text-slate-500 mt-0.5">
                        {item.notes}
                      </p>
                    )}
                  </div>

                  {/* Badges */}
                  <div className="flex items-center gap-1.5 flex-shrink-0 flex-wrap justify-end">
                    {item.quantityNote && (
                      <span className="text-xs bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full border border-slate-200">
                        {item.quantityNote}
                      </span>
                    )}
                    <span
                      className={cn(
                        "text-xs px-2 py-0.5 rounded-full border font-medium",
                        item.isMandatory
                          ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                          : "bg-slate-100 text-slate-500 border-slate-200"
                      )}
                    >
                      {item.isMandatory ? "Required" : "Optional"}
                    </span>
                    {item.isConditional && (
                      <span className="text-xs bg-amber-100 text-amber-700 border border-amber-200 px-2 py-0.5 rounded-full font-medium">
                        Conditional
                      </span>
                    )}
                  </div>
                </li>
              ))}
            </ol>
          )}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add client/src/components/checklist/SectionAccordion.tsx
git commit -m "feat: add SectionAccordion component"
```

---

## Task 6: SearchResults Component

**Files:**
- Create: `client/src/components/checklist/SearchResults.tsx`

- [ ] **Step 1: Create the component**

```tsx
// client/src/components/checklist/SearchResults.tsx
import { FileSearch, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { SearchResult } from "@/api/checklist.api";

interface Props {
  results: SearchResult[];
  isLoading: boolean;
  onView: (slug: string) => void;
}

function SearchSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 4 }).map((_, i) => (
        <div
          key={i}
          className="bg-white rounded-lg border border-slate-200 p-4 flex items-center justify-between animate-pulse"
        >
          <div className="space-y-2 flex-1">
            <div className="h-4 bg-slate-200 rounded w-1/2" />
            <div className="h-3 bg-slate-100 rounded w-3/4" />
          </div>
          <div className="h-8 w-16 bg-slate-100 rounded ml-4 shrink-0" />
        </div>
      ))}
    </div>
  );
}

export function SearchResults({ results, isLoading, onView }: Props) {
  if (isLoading) return <SearchSkeleton />;

  if (results.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <FileSearch className="w-14 h-14 text-slate-300 mb-4" />
        <h3 className="text-base font-semibold text-slate-700">No results found</h3>
        <p className="text-sm text-slate-400 mt-1">Try a different search term</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <p className="text-xs text-slate-500 mb-3">
        {results.length} result{results.length !== 1 ? "s" : ""} found
      </p>
      {results.map((result) => (
        <div
          key={result.itemId}
          className="bg-white rounded-lg border border-slate-200 px-4 py-3 flex items-center justify-between gap-4 hover:border-indigo-200 hover:shadow-sm transition-all"
        >
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-slate-800 truncate">
              {result.itemName}
            </p>
            <p className="text-xs text-slate-400 mt-0.5 truncate">
              in{" "}
              <span className="text-slate-500">{result.sectionTitle}</span>
              {" · "}
              <span className="text-indigo-600">{result.checklistTitle}</span>
            </p>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={() => onView(result.checklistSlug)}
            className="flex-shrink-0 border-indigo-200 text-indigo-600 hover:bg-indigo-50"
          >
            <ExternalLink className="w-3.5 h-3.5 mr-1" />
            View
          </Button>
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add client/src/components/checklist/SearchResults.tsx
git commit -m "feat: add SearchResults component"
```

---

## Task 7: ChecklistDrawer Component

**Files:**
- Create: `client/src/components/checklist/ChecklistDrawer.tsx`

Note: `SheetContent` already renders its own X close button (top-right corner). Do not add a second one. The `sm:max-w-sm` default from the Sheet variant is overridden with `className="sm:max-w-[600px]"`.

- [ ] **Step 1: Create the component**

```tsx
// client/src/components/checklist/ChecklistDrawer.tsx
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { SectionAccordion } from "@/components/checklist/SectionAccordion";
import { useChecklistDetail } from "@/hooks/useChecklists";

interface Props {
  slug: string | null;
  countryName: string | null;
  onClose: () => void;
}

function DrawerSkeleton() {
  return (
    <div className="space-y-4 animate-pulse px-6 pt-2 pb-6">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="border border-slate-200 rounded-lg overflow-hidden">
          <div className="h-11 bg-slate-100" />
          <div className="p-4 space-y-3">
            {Array.from({ length: 3 }).map((_, j) => (
              <div key={j} className="h-7 bg-slate-50 rounded" />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

export function ChecklistDrawer({ slug, countryName, onClose }: Props) {
  const { data, isLoading, isError } = useChecklistDetail(slug);

  const sortedSections = data
    ? data.sections.slice().sort((a, b) => a.displayOrder - b.displayOrder)
    : [];

  return (
    <Sheet
      open={!!slug}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <SheetContent
        side="right"
        className="sm:max-w-[600px] p-0 flex flex-col gap-0"
      >
        {/* Header */}
        <SheetHeader className="px-6 py-4 border-b border-slate-200 shrink-0 pr-14">
          <div className="flex items-center gap-2 flex-wrap">
            <SheetTitle className="text-base font-bold text-slate-900 leading-tight">
              {data?.title ?? (isLoading ? "Loading…" : "Checklist")}
            </SheetTitle>
            {data?.subType && (
              <span className="text-xs bg-indigo-50 text-indigo-700 border border-indigo-100 px-2 py-0.5 rounded-full font-medium">
                {data.subType}
              </span>
            )}
          </div>
          <SheetDescription className="text-xs text-slate-400 mt-1">
            {countryName ?? "All Countries"}
          </SheetDescription>
        </SheetHeader>

        {/* Body — scrollable */}
        <div className="flex-1 overflow-y-auto">
          {isLoading && <DrawerSkeleton />}

          {isError && (
            <div className="flex flex-col items-center justify-center py-16 text-center px-6">
              <p className="text-sm text-slate-500">
                Failed to load checklist. Please try again.
              </p>
            </div>
          )}

          {data && (
            <div className="px-6 pt-4 pb-8 space-y-3">
              {sortedSections.length === 0 ? (
                <p className="text-sm text-slate-400 italic text-center py-12">
                  No sections added to this checklist yet.
                </p>
              ) : (
                sortedSections.map((section) => (
                  <SectionAccordion key={section.id} section={section} />
                ))
              )}
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
```

- [ ] **Step 2: Verify TypeScript compiles cleanly**

```bash
npx tsc --noEmit --project tsconfig.json 2>&1 | head -30
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add client/src/components/checklist/ChecklistDrawer.tsx
git commit -m "feat: add ChecklistDrawer slide-over component"
```

---

## Task 8: ChecklistPage — Main Page

**Files:**
- Create: `client/src/pages/ChecklistPage.tsx`

This component owns all state. Key logic:
- `activeSlug`: set to first category slug on load
- `selectedCountry`: country code (`""` = All Countries)
- `searchQuery` / `debouncedQuery`: debounced 300ms, min 2 chars activates search
- `drawerSlug`: non-null opens the drawer
- `hasCountrySpecific`: tracks whether the current category has any country-specific checklists (set after initial load with no country filter); reset on category change
- Country dropdown hidden when `hasCountrySpecific === false` and `selectedCountry === ""`
- Search mode: when `debouncedQuery.length >= 2`, hide tabs/filters/cards and show `SearchResults`

- [ ] **Step 1: Create the page**

```tsx
// client/src/pages/ChecklistPage.tsx
import { useState, useEffect, useMemo } from "react";
import { Search, X, FileSearch } from "lucide-react";
import { PageWrapper } from "@/layout/PageWrapper";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CategoryTabs } from "@/components/checklist/CategoryTabs";
import { ChecklistCard } from "@/components/checklist/ChecklistCard";
import { ChecklistDrawer } from "@/components/checklist/ChecklistDrawer";
import { SearchResults } from "@/components/checklist/SearchResults";
import {
  useCategories,
  useCountries,
  useChecklists,
  useSearch,
} from "@/hooks/useChecklists";

// ─── Skeletons ─────────────────────────────────────────────────────────────────

function CardSkeleton() {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 flex flex-col gap-4 animate-pulse">
      <div className="space-y-2">
        <div className="h-4 bg-slate-200 rounded w-4/5" />
        <div className="h-4 bg-slate-100 rounded w-1/2" />
      </div>
      <div className="space-y-2">
        <div className="h-3 bg-slate-100 rounded w-1/3" />
        <div className="h-3 bg-slate-100 rounded w-2/5" />
      </div>
      <div className="h-9 bg-slate-100 rounded-lg mt-auto" />
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center col-span-full">
      <FileSearch className="w-14 h-14 text-slate-300 mb-4" />
      <h3 className="text-base font-semibold text-slate-700">No checklists found</h3>
      <p className="text-sm text-slate-400 mt-1">Try adjusting your filters or search query</p>
    </div>
  );
}

// ─── Page ──────────────────────────────────────────────────────────────────────

export default function ChecklistPage() {
  const [activeSlug, setActiveSlug] = useState("");
  const [selectedCountry, setSelectedCountry] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [drawerSlug, setDrawerSlug] = useState<string | null>(null);
  const [hasCountrySpecific, setHasCountrySpecific] = useState(false);

  // ── Data fetching ──────────────────────────────────────────────────────────
  const { data: categories = [], isLoading: catsLoading } = useCategories();
  const { data: countries = [] } = useCountries();
  const isSearchMode = debouncedQuery.length >= 2;

  const {
    data: checklists = [],
    isLoading: checklistsLoading,
  } = useChecklists(activeSlug, selectedCountry, !isSearchMode);

  const { data: searchResults = [], isLoading: searchLoading } = useSearch(debouncedQuery);

  // ── Auto-select first category ─────────────────────────────────────────────
  useEffect(() => {
    if (categories.length > 0 && !activeSlug) {
      setActiveSlug(categories[0].slug);
    }
  }, [categories, activeSlug]);

  // ── Debounce search query ──────────────────────────────────────────────────
  useEffect(() => {
    if (searchQuery.length === 0) {
      setDebouncedQuery("");
      return;
    }
    const timer = setTimeout(() => {
      if (searchQuery.length >= 2) setDebouncedQuery(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // ── Track whether current category has country-specific checklists ─────────
  useEffect(() => {
    if (!selectedCountry && checklists.length > 0) {
      setHasCountrySpecific(checklists.some((c) => c.countryId !== null));
    }
  }, [checklists, selectedCountry]);

  // ── Reset country + hasCountrySpecific when category changes ───────────────
  const handleCategorySelect = (slug: string) => {
    setActiveSlug(slug);
    setSelectedCountry("");
    setHasCountrySpecific(false);
  };

  // ── Lookup maps ────────────────────────────────────────────────────────────
  const countryById = useMemo(() => {
    const map: Record<string, string> = {};
    countries.forEach((c) => { map[c.id] = c.name; });
    return map;
  }, [countries]);

  // Countries relevant to this category (those seen in checklists results)
  const relevantCountryCodes = useMemo(() => {
    const ids = new Set(
      checklists.filter((c) => c.countryId !== null).map((c) => c.countryId!)
    );
    return countries.filter((c) => ids.has(c.id));
  }, [checklists, countries]);

  const showCountryDropdown = hasCountrySpecific || !!selectedCountry;

  // ── Clear filters ──────────────────────────────────────────────────────────
  const clearFilters = () => {
    setSelectedCountry("");
    setSearchQuery("");
    setDebouncedQuery("");
  };

  const hasFilters = !!selectedCountry || !!searchQuery;

  // ── Country name for drawer ────────────────────────────────────────────────
  const drawerCountryName = useMemo(() => {
    if (!drawerSlug) return null;
    const checklist = checklists.find((c) => c.slug === drawerSlug);
    if (!checklist || !checklist.countryId) return null;
    return countryById[checklist.countryId] ?? null;
  }, [drawerSlug, checklists, countryById]);

  return (
    <PageWrapper
      title="Checklists"
      breadcrumbs={[{ label: "Checklists" }]}
    >
      <div className="space-y-6">
        {/* Search bar — always visible */}
        <div className="flex items-center gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search documents across all checklists…"
              className="pl-9 pr-4"
            />
            {searchQuery && (
              <button
                onClick={() => { setSearchQuery(""); setDebouncedQuery(""); }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
          {hasFilters && (
            <Button variant="ghost" size="sm" onClick={clearFilters} className="text-slate-500">
              <X className="w-4 h-4 mr-1" />
              Clear
            </Button>
          )}
        </div>

        {isSearchMode ? (
          /* ── Search mode ──────────────────────────────────────────────────── */
          <SearchResults
            results={searchResults}
            isLoading={searchLoading}
            onView={(slug) => setDrawerSlug(slug)}
          />
        ) : (
          /* ── Browse mode ──────────────────────────────────────────────────── */
          <>
            {/* Category tabs */}
            {catsLoading ? (
              <div className="flex gap-2">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="h-10 w-32 rounded-full bg-slate-100 animate-pulse" />
                ))}
              </div>
            ) : (
              <CategoryTabs
                categories={categories}
                activeSlug={activeSlug}
                onSelect={handleCategorySelect}
              />
            )}

            {/* Filters row */}
            {showCountryDropdown && (
              <div className="flex items-center gap-3">
                <Select
                  value={selectedCountry}
                  onValueChange={setSelectedCountry}
                >
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="All Countries" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All Countries</SelectItem>
                    {relevantCountryCodes.map((c) => (
                      <SelectItem key={c.code} value={c.code}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Card grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {checklistsLoading ? (
                Array.from({ length: 6 }).map((_, i) => <CardSkeleton key={i} />)
              ) : checklists.length === 0 ? (
                <EmptyState />
              ) : (
                checklists.map((checklist) => (
                  <ChecklistCard
                    key={checklist.id}
                    checklist={checklist}
                    countryName={
                      checklist.countryId ? countryById[checklist.countryId] ?? null : null
                    }
                    onView={(slug) => setDrawerSlug(slug)}
                  />
                ))
              )}
            </div>
          </>
        )}
      </div>

      {/* Drawer — rendered outside main flow so it overlays everything */}
      <ChecklistDrawer
        slug={drawerSlug}
        countryName={drawerCountryName}
        onClose={() => setDrawerSlug(null)}
      />
    </PageWrapper>
  );
}
```

- [ ] **Step 2: Verify TypeScript compiles cleanly**

```bash
npx tsc --noEmit --project tsconfig.json 2>&1 | head -30
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add client/src/pages/ChecklistPage.tsx
git commit -m "feat: add ChecklistPage main page"
```

---

## Task 9: Sidebar Link + Route Registration

**Files:**
- Modify: `client/src/layout/Sidebar.tsx` (lines 25–31 and 63–105)
- Modify: `client/src/App.tsx` (lines 1–46 and 190–215)

- [ ] **Step 1: Add `ClipboardList` to the Sidebar icon imports**

In `client/src/layout/Sidebar.tsx`, find the lucide-react import block (line 6) and add `ClipboardList`:

```tsx
// Existing import — add ClipboardList to the list:
import {
  LayoutDashboard,
  Users,
  Settings,
  LogOut,
  Menu,
  PieChart,
  UserPlus,
  Shield,
  UserCog,
  Briefcase,
  Crown,
  Activity,
  FileText,
  FileSpreadsheet,
  ChevronDown,
  ChevronRight,
  Archive,
  Trophy,
  List,
  Megaphone,
  Target,
  LayoutGrid,
  Zap,
  BarChart3,
  FileBarChart,
  ClipboardList,       // ← add this
} from "lucide-react";
```

- [ ] **Step 2: Add the Checklists entry to `sidebarItems`**

In `client/src/layout/Sidebar.tsx`, find the `sidebarItems` array (around line 63). Add the Checklists entry after `"University List"`:

```tsx
// Add after the University List entry:
  {
    icon: FileSpreadsheet,
    label: "University List",
    href: "/university-db",
    roles: ["superadmin", "manager", "counsellor"],
  },
  {
    icon: ClipboardList,
    label: "Checklists",
    href: "/checklists",
    roles: ["superadmin", "manager"],
  },
```

- [ ] **Step 3: Add the lazy import in `App.tsx`**

In `client/src/App.tsx`, find the lazy import block (around line 38) and add:

```tsx
// Add after the CounsellorReportPage import (line 38):
const ChecklistPage = lazy(() => import("@/pages/ChecklistPage"));
```

- [ ] **Step 4: Add the `/checklists` route in `App.tsx`**

In `client/src/App.tsx`, find the `/university-db` route (around line 208) and add the checklists route after it:

```tsx
        <Route path="/university-db">
          {params => <ProtectedRoute component={UniversityDatabase} />}
        </Route>

        <Route path="/checklists">
          {params => <ProtectedRoute component={ChecklistPage} />}
        </Route>
```

- [ ] **Step 5: Start the dev server and verify end-to-end**

```bash
cd "d:/Harsh Project/Pratham Connect/pratham-connect-frontend"
npm run dev
```

Checklist:
- [ ] Log in as `superadmin` or `manager` — "Checklists" link appears in sidebar
- [ ] Log in as `counsellor` — "Checklists" link is NOT in sidebar
- [ ] Navigate to `/checklists` — page loads with category tabs (SPOUSE / STUDENT / VISITOR)
- [ ] Click a tab — checklist cards appear
- [ ] Cards show title, sub-type badge (if present), country or "All Countries", section/item counts
- [ ] Click "View Checklist" on a populated checklist (e.g. `spouse-on-work-permit`) — drawer slides in from right
- [ ] Drawer shows sections, each open by default, items numbered with badges
- [ ] Conditional sections show amber badge
- [ ] Required items show green "Required", optional show gray "Optional"
- [ ] Type "passport" in search — search results appear after ~300ms
- [ ] Each result shows item name, section, checklist title, with "View" button
- [ ] "View" in search results opens the drawer
- [ ] Mobile: cards collapse to 1 column, drawer takes full width

- [ ] **Step 6: Commit**

```bash
git add client/src/layout/Sidebar.tsx client/src/App.tsx
git commit -m "feat: wire up Checklists sidebar link and route"
```

---

## Self-Review

**Spec coverage:**
- [x] Sidebar link, admin-only (superadmin + manager) with ClipboardList icon at `/checklists`
- [x] Category tabs from `GET /api/v1/categories` with count badge, active highlight
- [x] Country dropdown from `GET /api/v1/countries`, hidden for SPOUSE (no countryId), "All Countries" first
- [x] Search input, debounced 300ms, min 2 chars, `GET /api/v1/search?q=`
- [x] Clear filters button
- [x] Checklist card grid: title, sub-type badge, country, section+item counts, "View Checklist"
- [x] Empty state with icon + message
- [x] Loading skeletons for tabs, cards, search rows, drawer body
- [x] Slide-over drawer (right), full-width mobile, 600px desktop
- [x] Sections open by default
- [x] Conditional badge on sections + items
- [x] Section description info box
- [x] Numbered items: name bold, notes italic, quantity badge, Required/Optional badge, Conditional badge
- [x] Search mode hides cards, shows SearchResults
- [x] "View" in search results opens drawer
- [x] Mobile responsive: 1-col cards, full-width drawer
- [x] No inline styles — Tailwind only
- [x] Blues/indigos as primary color

**Placeholder scan:** No TBDs, no vague steps, all code blocks present.

**Type consistency:**
- `Section`, `Item`, `ChecklistSummary`, `ChecklistDetail`, `SearchResult`, `Category`, `Country` — all defined in `checklist.api.ts` and imported by name in every component that needs them.
- Hook names: `useCategories`, `useCountries`, `useChecklists`, `useChecklistDetail`, `useSearch` — consistent across `useChecklists.ts` and `ChecklistPage.tsx`.
- Prop names: `onView(slug: string)` on `ChecklistCard` and `SearchResults`; `onClose()` on `ChecklistDrawer`; `onSelect(slug: string)` on `CategoryTabs` — consistent.
- `countryName: string | null` passed to both `ChecklistCard` and `ChecklistDrawer` — consistent.
