# Incentive Management System — Design Spec
**Date:** 2026-04-20  
**Status:** Approved  
**Scope:** Frontend UI + state structure only. No backend design.

---

## 1. Overview

A dynamic Incentive Management System for CRM managers and admins to view, approve/reject, and configure incentives for counsellors across three visa categories: Spouse, Visitor, and Student.

Counsellors have **no access** to this system. Access is restricted to `admin`, `manager`, and `developer` roles, enforced at `ProtectedRoute` level.

---

## 2. Navigation & Routing

Two new routes added to `App.tsx` (lazy-loaded, role-gated):

| Route | Page Component | Purpose |
|---|---|---|
| `/incentives` | `IncentivesPage` | Main incentive table — view, filter, approve/reject |
| `/incentives/rules` | `IncentiveRulesPage` | Rule configuration — manage slab/range rules per visa type |

Both routes use `allowedRoles` from `constants/roles.ts`:  
```ts
export const INCENTIVE_ROLES: UserRole[] = ['superadmin', 'manager', 'developer']
```

Both pages get entries in the sidebar navigation.

---

## 3. Architecture: Feature-sliced, Local State

Each page manages its own state independently. No shared context between the two pages.

- `/incentives` — `useState` for filters + `useQuery` for table data + `useMutation` for approve/reject/eligibility
- `/incentives/rules` — `useState` for editable rules draft + `useQuery` for fetching rules + `useMutation` for bulk save

React Query keys:
```ts
['incentives', { visaType, counsellorId, month }]   // main table
['incentive-rules']                                   // rule config
```

All API functions live in `client/src/api/incentives.api.ts` (new file, follows existing pattern from `payments.api.ts`).

---

## 4. Page 1 — `/incentives` (Main Incentive Table)

### 4.1 Layout

```
PageWrapper (title: "Incentive Management", breadcrumbs: Dashboard > Incentives)
├── Total Incentive Amount Banner
├── Filter Bar
└── IncentiveTable
    └── ConfirmActionModal (approve/reject)
```

### 4.2 Total Incentive Amount Banner

- Full-width purple gradient card
- Shows total incentive amount (₹ formatted, `toLocaleString("en-IN")`)
- Subtitle shows active filter context: "April 2026 · All Visa Types"
- Amount is derived from the API response — sum of approved incentive amounts matching current filters

### 4.3 Filter Bar

| Control | Type | Behaviour |
|---|---|---|
| Search | Text input | Client-side filter on client name + client ID via `useMemo` |
| Visa Type | Tab group (ALL / Spouse / Visitor / Student) | API param — triggers re-fetch |
| Counsellor | shadcn `Select` dropdown | API param — triggers re-fetch |
| Month | Month picker (shadcn `Select` or popover) | API param — triggers re-fetch |

Search is client-side only (filters already-fetched data). Visa type, counsellor, and month are server-side filters passed to the API.

### 4.4 Incentive Table Columns

| Column | Notes |
|---|---|
| Client ID | Link to client detail page |
| Client Name | |
| Counsellor Name | |
| Enrollment Date | Formatted `d MMM yyyy` |
| Visa Type | Badge — Blue=Spouse, Green=Visitor, Purple=Student |
| Eligibility | Single rounded pill — green "Yes" / red "No". Click calls `updateEligibility` mutation |
| Incentive Amount | Right-aligned, indigo, `₹` formatted |
| Status | Badge — Amber=Pending, Green=Approved, Red=Rejected, Grey=Ineligible |
| Actions | Approve + Reject buttons shown only when `status === 'pending'`. Hidden (—) otherwise |

Ineligible rows (`eligibility === false`) render at 60% opacity.

### 4.5 Eligibility Pill

```tsx
// Green pill when eligible, red pill when not
// Single pill, click toggles — calls API mutation
<EligibilityPill eligible={row.eligible} onChange={(val) => mutate({ id: row.id, eligible: val })} />
```

No visual distinction between manually vs auto-disabled (as decided).

### 4.6 Approve / Reject Flow

Clicking either button opens `ConfirmActionModal`:
- Title: "Approve Incentive?" / "Reject Incentive?"
- Body: Client name, counsellor name, amount
- Two buttons: Confirm (primary) / Cancel (ghost)
- On confirm: calls `approveIncentive` / `rejectIncentive` mutation → invalidates `['incentives']` query

### 4.7 State Shape

```ts
// Local state in IncentivesPage
const [search, setSearch] = useState('')
const [visaType, setVisaType] = useState<'all' | 'spouse' | 'visitor' | 'student'>('all')
const [counsellorId, setCounsellorId] = useState<string | null>(null)
const [month, setMonth] = useState<string>('2026-04') // YYYY-MM

// Server state
const { data } = useQuery({
  queryKey: ['incentives', { visaType, counsellorId, month }],
  queryFn: () => fetchIncentives({ visaType, counsellorId, month })
})

// Client-side search derived value
const filtered = useMemo(() =>
  data?.items.filter(row =>
    row.clientName.toLowerCase().includes(search.toLowerCase()) ||
    row.clientId.includes(search)
  ), [data, search])
```

---

## 5. Page 2 — `/incentives/rules` (Rule Configuration)

### 5.1 Layout

```
PageWrapper (title: "Incentive Rules", breadcrumbs: Dashboard > Incentives > Rules)
└── SectionTabs (Spouse Rules | Visitor Rules | Student Rules)
    ├── SpouseRulesTab
    ├── VisitorRulesTab
    └── StudentRulesTab
```

Uses existing `SectionTabs` component (Radix Tabs on desktop, Select on mobile).

### 5.2 Spouse Rules Tab

**Logic:** Incentive based on total team count per month. Range-based.

**Columns:** Min Count · Max Count · Incentive Amount (₹)

**State:**
```ts
const [spouseDraft, setSpouseDraft] = useState<SpouseRule[]>([])
const [spouseDirty, setSpouseDirty] = useState(false)
```

**Validation (frontend, before save):**
- All fields required
- No overlapping ranges: for each pair of rules, `rule[i].max <= rule[j].min` or `rule[i].min >= rule[j].max`
- Validation error shown as red banner below table — blocks Save button

**Actions per row:** Delete button (removes from draft array)  
**Tab actions:** "+ Add Rule" button (appends blank row) · "Save Spouse Rules" (bulk save mutation) · "Discard Changes" (resets draft to fetched data)

### 5.3 Visitor Rules Tab

**Logic:** Incentive based on initial payment amount. Slab-based.

**Columns:** Min Amount (₹) · Max Amount (₹) · Incentive Amount (₹)

Same pattern as Spouse — draft state, overlap validation, bulk save.

### 5.4 Student Rules Tab

**Logic:** Country-specific rules. Canada → Tuition Deposit; UK → After Visa Payment. More countries can be added.

**UI:**
- Country selector at top: dropdown showing configured countries + "+ Add Country" option
- Selected country shows its own rule rows below

**Columns per country:** Rule Label (text, e.g. "Tuition Deposit") · Incentive Amount (₹)

**Pre-configured countries:** Canada (`ruleType: 'tuition_deposit'`), UK (`ruleType: 'after_visa_payment'`). Adding a new country via "+ Add Country" prompts for country name + first rule label.

**State:**
```ts
const [studentDraft, setStudentDraft] = useState<Record<string, StudentRule[]>>({})
// e.g. { canada: [...], uk: [...] }
```

### 5.5 Rules JSON Structure (Frontend)

```ts
// Spouse
interface SpouseRule {
  id: string
  minCount: number
  maxCount: number
  incentiveAmount: number
}

// Visitor
interface VisitorRule {
  id: string
  minAmount: number
  maxAmount: number
  incentiveAmount: number
}

// Student
interface StudentRule {
  id: string
  country: string          // 'canada' | 'uk' | ...
  ruleType: string         // 'tuition_deposit' | 'after_visa_payment' | ...
  incentiveAmount: number
}

// Full rules payload sent on save
interface IncentiveRulesPayload {
  spouseRules: SpouseRule[]
  visitorRules: VisitorRule[]
  studentRules: StudentRule[]
}
```

### 5.6 State Shape for Future Backend Integration

Rules are fetched via `useQuery(['incentive-rules'])` and saved via `useMutation`. The draft state is always a local copy — the source of truth is the server. On successful save, `invalidateQueries(['incentive-rules'])` re-fetches and replaces the draft.

This means zero migration cost when plugging in a real API: only `incentives.api.ts` functions need updating.

---

## 6. API Module — `client/src/api/incentives.api.ts`

```ts
// Fetch incentives list
fetchIncentives(params: IncentivesParams): Promise<IncentivesResponse>

// Approve / reject
approveIncentive(id: string): Promise<void>
rejectIncentive(id: string): Promise<void>

// Toggle eligibility
updateEligibility(id: string, eligible: boolean): Promise<void>

// Rules
fetchIncentiveRules(): Promise<IncentiveRulesPayload>
saveIncentiveRules(payload: IncentiveRulesPayload): Promise<void>
```

All functions use the existing `api` axios instance from `@/lib/api` (includes auth + CSRF interceptors automatically).

---

## 7. Component Breakdown

```
client/src/pages/
  IncentivesPage.tsx           ← /incentives route
  IncentiveRulesPage.tsx       ← /incentives/rules route

client/src/components/incentives/
  IncentiveTotalBanner.tsx     ← purple gradient amount banner
  IncentiveFilters.tsx         ← search + tabs + dropdowns
  IncentiveTable.tsx           ← main data table
  EligibilityPill.tsx          ← Yes/No pill, calls mutation on click
  ConfirmActionModal.tsx       ← approve/reject confirmation dialog
  SpouseRulesTab.tsx           ← range rule builder
  VisitorRulesTab.tsx          ← slab rule builder
  StudentRulesTab.tsx          ← country-based rule builder
  RuleRow.tsx                  ← shared editable row (used by all 3 tabs)

client/src/api/
  incentives.api.ts            ← all typed API functions
```

---

## 8. Re-render Performance Notes

- `IncentiveTable` receives `filtered` (memoized array) as prop — only re-renders when filtered data changes
- `EligibilityPill` and action buttons use `useCallback` for handlers to avoid unnecessary child re-renders
- Rule tab state is tab-local — switching tabs doesn't trigger unrelated state updates
- `staleTime: Infinity` on queries (project default) — no background polling

---

## 9. UX Decisions

| Decision | Rationale |
|---|---|
| Ineligible rows at 60% opacity | Visual de-emphasis without hiding; manager can still act |
| Actions hidden (—) for non-pending rows | Reduces visual noise; approved/rejected rows need no action |
| Overlap validation blocks save | Prevents bad rule config reaching backend |
| Discard Changes resets to last fetched state | Safe escape hatch; no accidental rule deletion |
| Month picker defaults to current month | Most common use case; easy to change |
| Banner amount reflects active filters | Managers often filter by counsellor or visa type first |
