# Add Checklist Page — API Integration & UI Redesign

**Date:** 2026-04-11  
**Status:** Approved

---

## Overview

Wire the three new admin POST endpoints into `AddChecklistPage.tsx` and redesign the "Create New Checklist" form to be visually attractive while exposing all fields the API supports.

---

## API Layer Changes (`checklist.api.ts`)

### `CreateChecklistData` interface

Rename `categoryId` → `visaCategoryId` (matches backend field name). Add three new optional fields:

```ts
export interface CreateChecklistData {
  visaCategoryId: string;    // required — renamed from categoryId
  title: string;             // required
  countryId?: string | null; // optional
  slug?: string;             // optional — backend auto-generates from title if omitted
  subType?: string;          // optional
  description?: string;      // optional — NEW
  displayOrder?: number;     // optional, default 0
  isActive?: boolean;        // optional, default true — NEW
}
```

`createChecklist()`, `createSection()`, `createItem()` functions already target the correct endpoints — no URL changes needed.

---

## Form State Changes (`AddChecklistPage.tsx`)

Initial state rename and new fields:

```ts
const [checklistData, setChecklistData] = useState<CreateChecklistData>({
  visaCategoryId: '',   // renamed from categoryId
  title: '',
  subType: '',
  countryId: null,
  slug: '',
  description: '',
  displayOrder: 0,
  isActive: true,       // new — defaults to active
});
```

---

## UI / Visual Design

### Form Layout — "Create New Checklist" tab

The form is split into visually distinct groups using `Separator` with labeled dividers. Each group has an icon + label header. Fields inside use `grid` for side-by-side layout where sensible.

**Group 1 — Basic Info** (BookOpen icon, blue accent)
- Title (full width, required, bold label with red asterisk)
- Description (full width, `<Textarea>` 3 rows, optional)

**Group 2 — Classification** (Tag icon)
- Visa Category (required) + Sub Type — side by side (2-col grid)
- Country — full width dropdown with flag emoji items

**Group 3 — Advanced / Optional** (collapsible or always visible, Settings2 icon)
- Slug (left col) + Display Order (right col) — side by side
- Is Active — rendered as a Radix `Switch` component with inline label and status badge:
  - When ON: green "Active" badge
  - When OFF: grey "Inactive" badge

### Visual polish details
- Section group headers: small uppercase label + icon in muted color, thin `<Separator>` below
- Required fields: label ends with `*` in red (`text-red-500`)
- Slug field: helper text beneath — _"Leave blank to auto-generate from title"_ in `text-xs text-slate-400`
- Is Active switch: placed in a card-like row with bg-slate-50 and rounded-lg, so it stands out from plain text fields
- All inputs keep `focus:ring-[#0063cc] focus:border-[#0063cc]` for brand consistency
- Submit button: full-width at bottom, `bg-[#0063cc]`, with `Loader2` spinner when loading

### Error / Success alerts
- Error: destructive `<Alert>` at top of form (already exists, keep as-is)
- 409 slug conflict: extract message from `error.response?.data?.message` and display inline below slug field with `text-red-500 text-xs`
- Success: green alert, auto-navigates to `/checklists` after 2 seconds (existing behavior, keep)

---

## Field Order in Final Form

1. **Title** (required)
2. **Description** (optional)
3. — separator: Classification —
4. **Visa Category** | **Sub Type** (2-col)
5. **Country** (full width)
6. — separator: Advanced —
7. **Slug** | **Display Order** (2-col)
8. **Is Active** (switch row)
9. Submit / Cancel buttons

---

## Out of Scope

- Sections & Items tab — no changes; it already works correctly against the new endpoints
- "Add to Existing Checklist" mode — no changes
- Edit/update flows — separate task
