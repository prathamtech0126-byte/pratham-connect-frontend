# Checklist Page — Design Spec
**Date:** 2026-04-10
**Project:** Pratham International CRM (pratham-connect-frontend)

---

## Overview

A Checklists section for the immigration consultancy CRM, accessible to `superadmin` and `manager` roles. Allows staff to browse, filter, and view immigration document checklists organised by category (SPOUSE, STUDENT, VISITOR), with a searchable interface and a detailed slide-over drawer for each checklist.

---

## Architecture & Technical Decisions

### Codebase Corrections from Spec
| Spec says | Actual project |
|---|---|
| `src/pages/` | `client/src/pages/` |
| React Router | `wouter` |
| `user.role === 'admin'` | `roles: ["superadmin", "manager"]` |
| `http://localhost:3000` base URL | Use `@/lib/api` axios instance (Vite proxy handles routing) |

### Key Tech
- **Router:** `wouter` — `Link` and `useLocation` for navigation, lazy route in `App.tsx`
- **HTTP:** existing `api` axios instance from `@/lib/api` (relative URLs, proxied via Vite)
- **Data fetching:** `@tanstack/react-query`
- **UI primitives:** shadcn/ui (`Sheet`, `Button`, `Input`, `Select`, `Collapsible`)
- **Icons:** `lucide-react` (`ClipboardList` for sidebar)
- **Styling:** Tailwind CSS only — no inline styles

---

## File Structure

```
client/src/
  pages/
    ChecklistPage.tsx            — main page, owns all state
  components/
    checklist/
      CategoryTabs.tsx           — horizontal tab switcher
      ChecklistCard.tsx          — individual checklist card
      ChecklistDrawer.tsx        — right-side slide-over drawer
      SectionAccordion.tsx       — collapsible section with document items
      SearchResults.tsx          — search result list
  hooks/
    useChecklists.ts             — all react-query data fetching hooks
  api/
    checklist.api.ts             — all API call functions
```

### Existing files modified
- `client/src/layout/Sidebar.tsx` — add Checklists entry to `sidebarItems`
- `client/src/App.tsx` — add lazy import + `/checklists` route

---

## State Management

All state lives in `ChecklistPage`. No URL params — local React state only.

```ts
activeCategory: Category | null       // selected tab; auto-set to first on load
selectedCountry: string               // country code ("" = All Countries)
searchQuery: string                   // raw input value (controlled)
debouncedQuery: string                // debounced 300ms, min 2 chars — triggers search API
drawerSlug: string | null             // slug of open checklist drawer; null = closed
```

---

## Data Fetching

All hooks live in `client/src/hooks/useChecklists.ts`, calling functions from `client/src/api/checklist.api.ts`.

| Hook | Endpoint | Enabled when |
|---|---|---|
| `useCategories()` | `GET /api/v1/categories` | Always |
| `useCountries()` | `GET /api/v1/countries` | Always |
| `useChecklists(category, country)` | `GET /api/v1/checklists?category=&country=` | activeCategory set AND debouncedQuery empty |
| `useSearch(query)` | `GET /api/v1/search?q=` | debouncedQuery.length >= 2 |
| `useChecklistDetail(slug)` | `GET /api/v1/checklists/:slug` | drawerSlug is non-null |

### API Response Types
```ts
// Categories
interface Category { id: string; name: string; slug: string; description?: string; displayOrder: number; checklistCount: number; }

// Countries
interface Country { id: string; name: string; code: string; }

// Checklist list item
interface ChecklistSummary { id: string; title: string; slug: string; subType?: string; countryId: string | null; displayOrder: number; isActive: boolean; sectionCount: number; itemCount: number; }

// Checklist detail
interface ChecklistDetail { id: string; title: string; slug: string; subType?: string; countryId: string | null; sections: Section[]; }
interface Section { id: string; title: string; description: string | null; displayOrder: number; isConditional: boolean; conditionText: string | null; items: Item[]; }
interface Item { id: string; name: string; notes: string | null; isMandatory: boolean; isConditional: boolean; conditionText: string | null; quantityNote: string | null; displayOrder: number; }

// Search result
interface SearchResult { itemId: string; itemName: string; notes: string | null; isMandatory: boolean; quantityNote: string | null; sectionId: string; sectionTitle: string; checklistId: string; checklistTitle: string; checklistSlug: string; }
```

---

## Component Specifications

### Sidebar Entry
- Icon: `ClipboardList` from lucide-react
- Label: "Checklists"
- Route: `/checklists`
- Roles: `["superadmin", "manager"]`
- Inserted after "University List" in `sidebarItems`

### `CategoryTabs`
- Horizontal pill tabs, scrollable on mobile
- Active: solid indigo background, white text
- Inactive: muted text, indigo/10 hover
- Badge: small rounded count next to label (e.g. "SPOUSE (6)")
- Fires `onSelect(category)` callback

### `ChecklistCard`
- White card, `rounded-xl`, subtle shadow (`shadow-sm`), left border on hover (indigo)
- Title: semibold, truncated if long
- SubType: indigo pill badge, rendered only if present
- Country: globe icon + country name or "All Countries" if `countryId === null`
- Stats row: file icon + "N sections · N items"
- "View Checklist" button: indigo, full-width, calls `onView(slug)`
- If `sectionCount === 0`: stats show "—" to indicate unpopulated

### `ChecklistDrawer`
- shadcn `Sheet` with `side="right"`
- Width: `w-full md:w-[600px]`
- Header: title (h2) + subType badge + `X` close button (sticky)
- Body: scrollable, padding, sections rendered as `SectionAccordion` list
- Shows loading skeleton while `useChecklistDetail` is fetching
- Shows error state if fetch fails

### `SectionAccordion`
- Uses shadcn `Collapsible`, **open by default**
- Header: section title + amber "Conditional" badge if `isConditional: true` + condition text tooltip/inline
- If `description` present: blue info box (indigo-50 bg, indigo-500 left border) below header
- Items: numbered list (`1.`, `2.`, …)
  - Item name: bold
  - Notes: italic, gray, below name (if present)
  - Right side badges (inline-flex, gap-1):
    - Quantity note: slate pill (if present)
    - Mandatory: green "Required" badge / gray "Optional" badge
    - Conditional: amber dot/badge (if `isConditional: true`)
- Empty items array: "No documents listed yet" in muted text

### `SearchResults`
- Rendered instead of card grid when `debouncedQuery.length >= 2`
- Each row: item name (bold) + "in [sectionTitle] · [checklistTitle]" (gray, smaller)
- Right: "View" button → sets `drawerSlug` to `checklistSlug`
- Empty results: same empty state component as card grid
- Loading skeleton: pulse rows

### Loading Skeletons
- Cards: 6 pulse skeleton cards matching card dimensions
- Drawer body: 3 pulse skeleton accordion rows
- Search: 4 pulse skeleton result rows

### Empty State
- Centered, `lucide-react` `FileSearch` icon (gray, large)
- Heading: "No checklists found"
- Subtext: "Try adjusting your filters or search query"

---

## Rendering Logic

```
if debouncedQuery.length >= 2:
  show SearchResults (hide CategoryTabs filter row + cards)
else:
  show CategoryTabs
  show Filters row (country dropdown + search input + clear button)
  show ChecklistCards grid
```

### Country Dropdown Visibility
- After checklists load, check if any have `countryId !== null`
- If all are null (e.g. SPOUSE category) → hide country dropdown entirely
- First option always "All Countries" (value = "")

### Card Grid Layout
```
grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6
```

---

## Styling Tokens
- Primary: indigo-600 / indigo-700
- Accent bg: indigo-50
- Conditional badge: amber-100 text-amber-800
- Required badge: emerald-100 text-emerald-800
- Optional badge: slate-100 text-slate-600
- Quantity badge: slate-100 text-slate-700
- Info box: indigo-50 bg, border-l-4 border-indigo-400
- Card shadow: shadow-sm, hover:shadow-md transition
- Drawer overlay: standard Sheet backdrop

---

## Error Handling
- API errors surfaced via react-query `isError` — show inline error message with retry button
- Search errors: show "Search failed, please try again"
- Drawer detail error: show error in drawer body

---

## Accessibility
- Drawer: focus trapped inside when open (shadcn Sheet handles this)
- Tabs: keyboard navigable (click handlers, could use role="tablist" pattern)
- Accordions: toggle via click on header
