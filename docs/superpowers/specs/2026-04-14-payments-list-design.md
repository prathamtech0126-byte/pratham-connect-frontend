# Payments List — Design Spec

**Date:** 2026-04-14  
**Status:** Approved  

---

## Overview

Add a Payments List section to the existing `/reports` page, visible only to `superadmin`. It displays payment records fetched from `GET /api/reports/payments-list` in an Excel-style table, with a filter bar (Today / Monthly / Yearly / Custom), a Shopify-style dual-calendar date range picker for the Custom option, and a client-side search bar for instant row filtering.

---

## Architecture

### New Files

| File | Purpose |
|---|---|
| `client/src/components/payments/PaymentsSection.tsx` | Top-level component — owns filter state, triggers query, composes table |
| `client/src/components/payments/PaymentsTable.tsx` | Pure display — receives `data`, `isLoading`, `error` as props |
| `client/src/components/payments/DateRangePicker.tsx` | Shopify-style dual calendar with preset list, Cancel / Update |
| `client/src/api/payments.api.ts` | `fetchPaymentsList(params)` — calls `GET /api/reports/payments-list` via the shared `api` axios instance |

### Files Changed (minimally)

| File | Change |
|---|---|
| `client/src/pages/Reports.tsx` | +3 lines: conditional render `{user?.role === 'superadmin' && <PaymentsSection />}` at the bottom of the page content |

### Data Flow

```
PaymentsSection  (owns: filter, startDate, endDate, searchQuery state)
  └─ useQuery → payments.api.ts → GET /api/reports/payments-list
       └─ filteredData = useMemo → client-side search filter applied to API data
       └─ PaymentsTable  (props: data=filteredData, isLoading, error)
       └─ DateRangePicker  (shown when Custom filter is active)
```

Auth (JWT Bearer + CSRF) is injected automatically by the existing request interceptors in `lib/api.ts`. No manual credential handling is needed.

---

## API

**Endpoint:** `GET /api/reports/payments-list`

**Query params:**

| Param | Type | When sent |
|---|---|---|
| `filter` | `'today' \| 'monthly' \| 'yearly' \| 'custom'` | Always |
| `startDate` | `YYYY-MM-DD` | Only when `filter === 'custom'` |
| `endDate` | `YYYY-MM-DD` | Only when `filter === 'custom'` |

**Response shape:**

```ts
{
  success: boolean
  filter: string
  startDate: string
  endDate: string
  total: number
  data: Array<{
    date: string           // "14 Apr 2026"
    clientName: string
    amount: string         // numeric string e.g. "35400"
    clientOwner: string
    addedBy: string
    sharedClient: string   // "Yes" | "No"
  }>
}
```

**React Query config:**

```ts
useQuery({
  queryKey: ['payments-list', filter, startDate ?? null, endDate ?? null],
  queryFn: () => fetchPaymentsList({ filter, startDate, endDate }),
  staleTime: 1000 * 60 * 2,   // 2 minutes — matches Reports page
  enabled: filter !== 'custom' || !!(startDate && endDate),
})
```

---

## API Function (`payments.api.ts`)

```ts
export interface PaymentsListParams {
  filter: 'today' | 'monthly' | 'yearly' | 'custom'
  startDate?: string
  endDate?: string
}

export interface PaymentRecord {
  date: string
  clientName: string
  amount: string
  clientOwner: string
  addedBy: string
  sharedClient: string
}

export interface PaymentsListResponse {
  success: boolean
  filter: string
  startDate: string
  endDate: string
  total: number
  data: PaymentRecord[]
}

export async function fetchPaymentsList(params: PaymentsListParams): Promise<PaymentsListResponse> {
  // build query string, call api.get(...)
}
```

---

## Search Bar

A text input placed in the section header row (right side, next to "Total Records"), allowing instant client-side filtering of the fetched rows.

**Behaviour:**
- `searchQuery` state lives in `PaymentsSection`
- On every keystroke, `filteredData` is recomputed via `useMemo`:
  ```ts
  const filteredData = useMemo(() => {
    if (!searchQuery.trim()) return data
    const q = searchQuery.toLowerCase()
    return data.filter(row =>
      row.clientName.toLowerCase().includes(q) ||
      row.clientOwner.toLowerCase().includes(q) ||
      row.addedBy.toLowerCase().includes(q) ||
      row.date.toLowerCase().includes(q)
    )
  }, [data, searchQuery])
  ```
- "Total Records" count reflects `filteredData.length` (not the raw API total)
- Changing the period filter (Today / Monthly / Yearly / Custom) clears `searchQuery` back to `""`
- If `filteredData.length === 0` and `searchQuery` is non-empty, empty state message reads: "No payments match your search."

**UI:**
- shadcn/ui `<Input>` with a `<Search>` icon prefix
- Placeholder: `"Search by client, owner or date…"`
- Width: `240px` on desktop, full-width on mobile
- Sits in the same header row as the "Total Records" label and filter pills

---

## Filter Bar

Four pill buttons: **Today | Monthly | Yearly | Custom** — same visual style as the existing period tabs in `Reports.tsx`:
- Container: `bg-muted/40 ring-1 ring-border/50 rounded-xl p-1.5`
- Active pill: `variant="default"` (filled, shadow)
- Inactive pill: `variant="ghost"` with muted text

Clicking Today / Monthly / Yearly immediately triggers a fetch.  
Clicking Custom opens the `DateRangePicker` popover — fetch is deferred until **Update** is clicked.

---

## DateRangePicker Component

A self-contained popover with three sections:

### Left panel — Preset list
Presets and their API mapping:

| Preset | `filter` sent | `startDate` / `endDate` |
|---|---|---|
| Today | `today` | — |
| Yesterday | `custom` | yesterday / yesterday |
| Today and yesterday | `custom` | yesterday / today |
| Last 7 days | `custom` | today-7 / today |
| Last 14 days | `custom` | today-14 / today |
| Last 28 days | `custom` | today-28 / today |
| Last 30 days | `custom` | today-30 / today |
| This week | `custom` | Monday of current week / today |
| Last week | `custom` | Monday of last week / Sunday of last week |
| This month | `monthly` | — |
| Last month | `custom` | 1st of last month / last day of last month |
| This year | `yearly` | — |
| Last year | `custom` | Jan 1 last year / Dec 31 last year |
| Manual calendar selection | `custom` | user-selected start / end |

Active preset is highlighted with blue left-border + `bg-indigo-50`.

### Right panel — Dual calendar
- Two months side by side (current + next)
- Month/year navigation arrows
- Click to set start date; click again to set end date
- Selected range: start/end dates shown as filled dark circles; days in range shown in light blue

### Footer
- Dropdown label showing the active preset name (or date range for manual)
- Selected range displayed as `13 April 2026 → 14 April 2026`
- **Cancel** button: dismisses popover, reverts to previous filter
- **Update** button: applies selection, triggers API fetch, closes popover

Built with plain React state — no external date-picker library.

---

## Table (`PaymentsTable.tsx`)

### Columns (in order)

| # | Column | Alignment | Notes |
|---|---|---|---|
| 1 | # | Center | Row number, starts at 1 |
| 2 | Date | Left | As returned by API |
| 3 | Client Name | Left | Font-weight medium |
| 4 | Amount | Right | Monospace font, formatted with `toLocaleString('en-IN')` e.g. `35,400` |
| 5 | Client Owner | Left | |
| 6 | Added By | Left | |
| 7 | Shared Client | Center | Badge: green for Yes, red for No |

### Styling

- `border-collapse: collapse` with `border-slate-200` grid lines on every cell (horizontal + vertical)
- Sticky `<thead>` with `bg-slate-100` background
- Alternating row backgrounds: white / `bg-slate-50`
- Compact row padding: `py-1.5 px-2`
- Full-width, horizontally scrollable on small screens (`overflow-x-auto` wrapper)
- Amount column: `font-mono text-right`

### Badges

```tsx
// Shared Client
sharedClient === 'Yes'
  ? <Badge className="bg-green-100 text-green-700 hover:bg-green-100">Yes</Badge>
  : <Badge className="bg-red-100 text-red-600 hover:bg-red-100">No</Badge>
```

---

## States

| State | Condition | UI |
|---|---|---|
| Loading | `isLoading === true` | Centered `<Loader2>` spinner in the table area; filter bar remains visible |
| Empty (no API data) | `data.length === 0` | "No payments found for this period." message; "Total Records: 0" shown |
| Empty (search) | `filteredData.length === 0 && searchQuery !== ''` | "No payments match your search." message |
| Error | `error !== null` | Red error card: "Failed to load payments. Please try again." — same style as parent Reports error card |
| Success | `data.length > 0` | Table rendered with "Total Records: N" above |

---

## Access Control

```tsx
// In Reports.tsx — the only change to this file
{user?.role === 'superadmin' && (
  <PaymentsSection />
)}
```

The component itself does not need an additional role check since the render is already gated. The section appears after all existing sales/counsellor performance sections.

---

## Summary of Constraints

- **Reports.tsx existing code**: untouched except the 3-line addition at the bottom
- **No new routes**: the feature lives entirely within the existing `/reports` page
- **No new sidebar entries**: access is via the Reports page for superadmin
- **No external libraries**: `DateRangePicker` is built with React state only
- **Color/UI**: matches existing Reports page — same pill style, same card wrappers, same badge patterns from shadcn/ui
- **Search**: client-side only, no extra API call — filters on clientName, clientOwner, addedBy, date
