# Incentive Report API Integration — Design Spec

**Date:** 2026-04-24  
**Branch:** feat/incentive-management  
**Endpoint:** `GET /api/incentives/report`

---

## Goal

Wire the existing Incentive Management UI to the real `/api/incentives/report` backend endpoint. Replace dummy data and the old `/api/incentives` fetch. Apply the adapter-layer pattern so the API shape and UI shape remain decoupled.

---

## Decisions

| Question | Decision | Rationale |
|---|---|---|
| EligibilityPill interactive or read-only? | Read-only | Eligibility is now computed (`incentiveAmount > 0`); toggling manually would be overwritten on next fetch. Status (Approve/Reject) is where user action lives. |
| Pagination UI or single large fetch? | Fetch `pageSize=100`, no pagination UI | Clean for current data volume; upgrade path is a dedicated `/summary` endpoint if >100 enrollments per month. |
| Counsellors dropdown source | Derived from loaded rows | Only shows counsellors with records in the selected month; removes a parallel network call. |
| Field mapping approach | Adapter layer in `incentives.api.ts` | API shape ≠ UI shape is permanent. One file to update on backend changes. `ReportRow` type makes the raw API shape explicit and auditable. |

---

## Architecture

### Approach: Adapter Layer

```
GET /api/incentives/report
        ↓
   ReportRow[]          ← raw API shape, typed explicitly
        ↓
  mapReportRow()        ← normalises field names, types, casing
        ↓
  IncentiveRow[]        ← existing UI type, components unchanged
```

All impedance mismatch between backend and frontend lives in `incentives.api.ts`. Components speak `IncentiveRow`; they never see `ReportRow`.

---

## Section 1 — API Layer (`incentives.api.ts`)

### Add `ReportRow` (raw API shape)

```ts
export interface ReportRow {
  clientId: number
  clientName: string
  counsellor: string
  enrollmentDate: string
  saleType: 'Spouse' | 'Visitor' | 'Student'
  eligibility: 'Eligible' | 'Not Eligible'
  receivedAmount: number
  incentiveAmount: number
  status: 'Pending' | 'Approved' | 'Rejected'
}
```

### Add `fetchIncentivesReport(params: { month: string })`

- Calls `GET /api/incentives/report?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD&page=1&pageSize=100`
- Returns `IncentiveRow[]` (mapped, not `ReportRow[]`)
- Uses `getMonthRange(year, month)` utility for date conversion

### Add `getMonthRange(year, month)` utility

```ts
function getMonthRange(year: number, month: number) {
  const start = new Date(year, month - 1, 1)
  const end   = new Date(year, month, 0)
  return {
    startDate: start.toISOString().slice(0, 10),
    endDate:   end.toISOString().slice(0, 10),
  }
}
```

Called by parsing the `"2026-04"` month string. Components never touch date math.

### Field mapping (`ReportRow → IncentiveRow`)

| API field | UI field | Transform |
|---|---|---|
| `clientId` (number) | `id` | `String(clientId)` — unique per response |
| `clientId` (number) | `clientId` | `String(clientId)` |
| `counsellor` | `counsellorName` | direct |
| `counsellorId` | _(removed)_ | no longer available; set `""` |
| `receivedAmount` | `amount` | direct |
| `eligibility` | `eligible` | `"Eligible" → true`, else `false` |
| `status` | `status` | `.toLowerCase()` → `"pending"`, `"approved"`, `"rejected"` |
| `saleType` | `saleType` | `.toLowerCase()` → `"spouse"`, `"visitor"`, `"student"` |

### Remove `updateEligibility()`

No longer called anywhere. Eligibility is computed server-side; there is no frontend toggle.

### Keep unchanged

`approveIncentive()`, `rejectIncentive()`, `fetchIncentiveRules()`, all rule save functions, `IncentiveRulesPayload`, `SalaryRangeRule`, `CategoryRule`.

---

## Section 2 — Page (`IncentivesPage.tsx`)

### Query changes

- Replace `useQuery(['incentives', { saleType, counsellorId, month }], fetchIncentives)` with `useQuery(['incentives-report', month], () => fetchIncentivesReport({ month }))`
- Query key contains only `month` — counsellor and saleType are client-side filters, not server params
- Month change → re-fetch. Counsellor/saleType change → re-filter in memory.
- Remove `getCounsellors()` query entirely.

### Derived counsellors

```ts
const counsellors = useMemo(() =>
  [...new Set((data ?? []).map(r => r.counsellorName).filter(Boolean))]
    .map(name => ({ id: name, name })),
  [data]
)
```

Passed to `IncentiveFilters` as before. Dropdown is empty while data loads — acceptable since the table is also empty at that point.

### Banner totals

Summed from **all loaded rows** (before client-side counsellor/saleType filter):

```ts
const totalIncentiveAmount = (data ?? []).reduce((s, r) => s + r.incentiveAmount, 0)
const totalReceivedAmount  = (data ?? []).reduce((s, r) => s + r.amount, 0)
```

Banner represents the month; table represents the current filter view. Summing filtered rows would cause the banner to change when the user picks a counsellor — confusing UX.

### State removed

- `selectedIds`, `handleSelectRow`, `handleSelectAll`, `isAllSelected` — bulk selection removed
- `bulkApproveMutation` — wired to status-update endpoint that doesn't exist yet; removed with bulk selection

### Mutations unchanged

`approveMutation` and `rejectMutation` stay. `eligibilityMutation` removed.

### Props removed from `IncentiveTable`

`selectedIds`, `onSelectRow`, `onSelectAll`, `isAllSelected`, `onEligibilityChange` — all removed.

---

## Section 3 — Component Changes

### `EligibilityPill`

- Remove `onChange` and `disabled` props entirely
- Becomes a static display badge: green "Yes" (`eligible=true`), red "No" (`eligible=false`)
- No click handler, no pointer cursor

### `IncentiveTable`

- Remove from props: `onEligibilityChange`, `selectedIds`, `onSelectRow`, `onSelectAll`, `isAllSelected`
- Remove checkbox column (header checkbox + per-row checkbox)
- Render `EligibilityPill` without `onChange`/`disabled`
- Everything else unchanged: column filters, status badges, Approve/Reject buttons, footer summary

### `IncentiveTotalBanner`

- Rename prop `totalApprovedAmount` → `totalIncentiveAmount`
- `totalReceivedAmount` unchanged
- Sub-caption under received amount: `"Approved enrollments"` → `"All enrollments"`

### `IncentiveFilters`

- No changes. `counsellors` prop still exists; `IncentivesPage` populates it from derived rows.

### Unaffected components

`ConfirmActionModal`, `SpouseRulesTab`, `StudentRulesTab`, `UkStudentRulesTab`, `VisitorRulesTab`, `AllFinanceRulesTab`, `CategorySection`, `SalaryRangeSection` — all untouched.

---

## Files Changed

| File | Change type |
|---|---|
| `client/src/api/incentives.api.ts` | Add `ReportRow`, `fetchIncentivesReport`, `getMonthRange`; remove `updateEligibility` |
| `client/src/pages/IncentivesPage.tsx` | New query, derived counsellors, no eligibility mutation, no bulk selection, updated banner props |
| `client/src/components/incentives/EligibilityPill.tsx` | Remove `onChange`/`disabled`, static badge only |
| `client/src/components/incentives/IncentiveTable.tsx` | Remove selection + eligibility props/columns |
| `client/src/components/incentives/IncentiveTotalBanner.tsx` | Rename `totalApprovedAmount` prop, update sub-caption |
| `client/src/components/incentives/IncentiveFilters.tsx` | No change |

---

## Out of Scope

- Approve/Reject status-update endpoint (not yet built by backend)
- Pagination UI (deferred; upgrade via dedicated `/summary` endpoint when >100 records)
- Bulk approve (deferred with status-update endpoint)
- Server-side counsellor/saleType/search filtering (not supported by this endpoint)
