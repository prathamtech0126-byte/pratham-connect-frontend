# Incentive Rules Page Redesign

**Date:** 2026-04-27  
**Branch:** feat/incentive-management  
**Files affected:** `client/src/pages/IncentiveRulesPage.tsx`, `client/src/components/incentives/PeriodSelector.tsx`, `client/src/components/incentives/SaleTypeSelector.tsx`, `client/src/components/incentives/RuleTypeSelector.tsx`, `client/src/api/incentives.api.ts`

---

## Goal

Redesign the existing 4-step IncentiveRulesPage wizard to be visually polished and user-friendly, without changing the underlying business logic or slab rule tables.

---

## Current State

- Step indicator is plain text: "Step X of 4"
- Period selection uses a popover-based `DateRangePicker` (calendar hidden behind a button)
- Sale types displayed as plain HTML checkboxes in a 2-column list
- Rule type selection is two unstyled outline buttons
- Summary on Step 4 shows raw IDs for sale types and raw date strings
- No display of previously saved period-wise rules

---

## Redesigned Flow

### Stepper (persistent, top of page)

A horizontal stepper with 4 numbered circles connected by a line, always visible above the step content.

**States:**
- **Completed step**: filled primary circle with checkmark icon, connecting line becomes solid/colored
- **Active step**: filled primary circle with step number, bold label underneath
- **Future step**: outlined grey circle with step number, muted label underneath

**Labels:** Period · Sale Types · Rule Type · Configure

**Behaviour:** Clicking a completed step navigates back to it. Clicking a future step is disabled. Navigating backwards via the stepper does NOT trigger a save — the user must use "Add Another Period" to save.

---

### Step 1 — Period Selection

**Calendar:** `DayPicker` rendered inline (not inside a popover) — 2 months side by side inside a card/bordered container. Selected range uses the existing primary blue highlight.

**Next button:** Disabled until both `from` and `to` dates are selected.

**Saved Periods section** (below the calendar):
- Heading: "Saved Periods" with a count badge e.g. `Saved Periods (3)`
- Each saved period rendered as a horizontal card containing:
  - Formatted date range: `Jan 1 – Jan 31, 2026`
  - Sale type names as small colored badge pills (fetched names, not raw IDs)
  - Rule type pill: `Slab` (orange) or `Budget` (green)
- Data fetched from a GET API endpoint (see API section below)
- Loading skeleton while fetching; empty state message if none exist

---

### Step 2 — Sale Types

**Layout:** Responsive grid of cards — 4 per row on desktop, 2 on mobile.

**Each card:**
- Sale type name centered
- Checkbox in the top-right corner
- Clicking anywhere on the card toggles selection

**Visual states:**
- Unselected: white background, light grey border
- Selected: light primary tint background, solid primary border, checkbox checked

**Controls above grid:**
- Heading: `Select Sale Types (N selected)` — count updates live
- "Select All" and "Clear All" text links

**Navigation:** Back + Next buttons at bottom. Next disabled until ≥ 1 type selected.

---

### Step 3 — Rule Type

**Layout:** Two large feature cards side by side (50/50 split).

**Slab Wise card:**
- Icon: `Layers` (lucide-react)
- Title: "Slab Wise"
- Description: "Define incentive rules by count ranges — different amounts for different slabs"

**Budget Wise card:**
- Icon: `Wallet` (lucide-react)
- Title: "Budget Wise"
- Description: "Allocate a fixed budget amount as incentive for the selected period"

**Visual states:**
- Unselected: white background, light grey border
- Selected: light primary tint background, solid primary border, checkmark badge in top-right corner

**Behaviour:** Only one card selectable at a time.

**Navigation:** Back + Next buttons at bottom. Next disabled until one is selected.

---

### Step 4 — Configure Rules

**Summary bar** (replaces current raw text block):
- Formatted date range in bold: `Apr 1 – Apr 30, 2026`
- Sale type **names** as small colored badge pills (resolved from selected IDs using the fetched sale types list)
- Rule type pill: `Slab` (orange) or `Budget` (green)

**Rule content (unchanged):**
- If slab: existing tabs (Spouse, Visitor, Canada Student, Student, All Finance) with orange-header slab tables — no changes to `SpouseRulesTab`, `VisitorRulesTab`, `StudentRulesTab`, `UkStudentRulesTab`, `AllFinanceRulesTab`
- If budget: placeholder panel (to be implemented later)

**Footer buttons:**
- Back (outline) — goes to Step 3
- `+ Add Another Period` (primary) — on click:
  1. Calls the save API with `{ period, saleTypes, ruleType, ...slabConfig }`
  2. Shows loading state on the button during the API call
  3. On success: resets state (period, saleTypes, ruleType) and returns to Step 1
  4. On Step 1, saved periods section re-fetches and shows the newly saved period

---

## API Changes

### GET saved periods
```
GET /api/incentives/rules/periods
Response: { data: SavedPeriod[] }

SavedPeriod {
  id: string
  startDate: string       // ISO date
  endDate: string         // ISO date
  saleTypeIds: (string | number)[]
  saleTypeNames: string[] // resolved names from the server
  ruleType: 'slab' | 'budget'
}
```

### POST/PUT save period config
Called when user clicks "Add Another Period". The exact endpoint and payload shape will be confirmed with the backend team — this spec assumes it accepts period + saleTypes + ruleType + slab rules and returns success.

---

## Component Changes

| Component | Change |
|---|---|
| `IncentiveRulesPage.tsx` | Add horizontal stepper, wire new save-and-reset flow |
| `PeriodSelector.tsx` | Replace `DateRangePicker` popover with inline `DayPicker`; add Saved Periods section |
| `SaleTypeSelector.tsx` | Replace checkbox list with card grid; add Select All / Clear All; show selected count |
| `RuleTypeSelector.tsx` | Replace plain buttons with large feature cards |
| `incentives.api.ts` | Add `fetchSavedPeriods()` and `savePeriodConfig()` functions |
| Existing rule tab components | No changes |

---

## Out of Scope

- Budget Wise rule configuration UI (placeholder only)
- Changes to existing slab rule tables (SpouseRulesTab etc.)
- Mobile-specific layout testing
