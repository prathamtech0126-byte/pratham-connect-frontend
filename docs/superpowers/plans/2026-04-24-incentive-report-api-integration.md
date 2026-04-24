# Incentive Report API Integration — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Wire `IncentivesPage` to the real `GET /api/incentives/report` endpoint via an adapter layer, replacing dummy data and the old `/api/incentives` fetch.

**Architecture:** Add `ReportRow` (raw API type) and `fetchIncentivesReport()` (adapter) to `incentives.api.ts`. The adapter normalises field names, types, and casing so all five existing UI components continue speaking `IncentiveRow`. Three components get surgical prop changes: `EligibilityPill` becomes a static badge, `IncentiveTable` drops selection + eligibility props, `IncentiveTotalBanner` renames one prop. `IncentivesPage` switches to the new query and derives counsellors from loaded rows.

**Tech Stack:** React, TypeScript, `@tanstack/react-query` v5, axios (`@/lib/api`), Vite (type-check via `npm run build`)

---

## File Map

| File | Change |
|---|---|
| `client/src/api/incentives.api.ts` | Add `ReportRow`, `getMonthRange`, `fetchIncentivesReport`; remove `updateEligibility` |
| `client/src/components/incentives/EligibilityPill.tsx` | Remove `onChange`/`disabled` props; render static `<span>` |
| `client/src/components/incentives/IncentiveTable.tsx` | Remove selection + eligibility props/columns; update `EligibilityPill` call |
| `client/src/components/incentives/IncentiveTotalBanner.tsx` | Rename prop `totalApprovedAmount` → `totalIncentiveAmount`; update sub-caption |
| `client/src/pages/IncentivesPage.tsx` | New query, derived counsellors, updated banner + table props, remove bulk/eligibility |

---

## Task 1 — API module: add `ReportRow`, `getMonthRange`, `fetchIncentivesReport`; remove `updateEligibility`

**Files:**
- Modify: `client/src/api/incentives.api.ts`

> This task is purely additive except for removing `updateEligibility`. The rest of the codebase still compiles after this task.

- [ ] **Step 1: Add `ReportRow` interface and `ReportResponse` wrapper after the existing `IncentivesResponse` interface**

In `client/src/api/incentives.api.ts`, after line 32 (`}`  closing `IncentivesResponse`), add:

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

interface ReportResponse {
  success: boolean
  data: ReportRow[]
  pagination: {
    page: number
    pageSize: number
    totalRecords: number
    totalPages: number
  }
}
```

- [ ] **Step 2: Add `getMonthRange` utility and `mapReportRow` adapter after the `ReportResponse` interface**

```ts
function getMonthRange(monthStr: string): { startDate: string; endDate: string } {
  const [year, month] = monthStr.split('-').map(Number)
  const start = new Date(year, month - 1, 1)
  const end = new Date(year, month, 0)
  return {
    startDate: start.toISOString().slice(0, 10),
    endDate: end.toISOString().slice(0, 10),
  }
}

function mapReportRow(row: ReportRow): IncentiveRow {
  return {
    id: String(row.clientId),
    clientId: String(row.clientId),
    clientName: row.clientName,
    counsellorId: '',
    counsellorName: row.counsellor,
    enrollmentDate: row.enrollmentDate,
    saleType: row.saleType.toLowerCase() as SaleType,
    eligible: row.eligibility === 'Eligible',
    amount: row.receivedAmount,
    incentiveAmount: row.incentiveAmount,
    status: row.status.toLowerCase() as IncentiveStatus,
  }
}
```

- [ ] **Step 3: Add `fetchIncentivesReport` after `fetchIncentives`**

```ts
export async function fetchIncentivesReport(params: { month: string }): Promise<IncentiveRow[]> {
  const { startDate, endDate } = getMonthRange(params.month)
  const res = await api.get<ReportResponse>('/api/incentives/report', {
    params: { startDate, endDate, page: 1, pageSize: 100 },
  })
  return res.data.data.map(mapReportRow)
}
```

- [ ] **Step 4: Remove `updateEligibility` function**

Delete the entire function from `client/src/api/incentives.api.ts`:

```ts
// DELETE this entire function:
export async function updateEligibility(id: string, eligible: boolean): Promise<void> {
  await api.patch(`/api/incentives/${id}/eligibility`, { eligible })
}
```

- [ ] **Step 5: Verify build passes**

```bash
npm run build
```

Expected: exits 0, no TypeScript errors. (`IncentivesPage` still imports `updateEligibility` — that will be fixed in Task 3. If the build errors on the missing import, comment out just the `updateEligibility` import line in `IncentivesPage.tsx` temporarily to unblock this check.)

- [ ] **Step 6: Commit**

```bash
git add client/src/api/incentives.api.ts
git commit -m "feat: add ReportRow type, fetchIncentivesReport adapter, remove updateEligibility"
```

---

## Task 2 — Components: `EligibilityPill` read-only + `IncentiveTable` removes selection/eligibility

**Files:**
- Modify: `client/src/components/incentives/EligibilityPill.tsx`
- Modify: `client/src/components/incentives/IncentiveTable.tsx`

> Both files change in this task. `EligibilityPill` drops `onChange`; `IncentiveTable` drops the call to `onChange` and the selection props simultaneously. Build runs once at the end of the task.

- [ ] **Step 1: Replace `EligibilityPill` with a static badge**

Replace the entire contents of `client/src/components/incentives/EligibilityPill.tsx`:

```tsx
import { cn } from '@/lib/utils'

interface EligibilityPillProps {
  eligible: boolean
}

export function EligibilityPill({ eligible }: EligibilityPillProps) {
  return (
    <span
      className={cn(
        'inline-block px-5 py-1 rounded-full text-xs font-semibold',
        eligible
          ? 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400'
          : 'bg-red-100 text-red-500 dark:bg-red-900/30 dark:text-red-400'
      )}
    >
      {eligible ? 'Yes' : 'No'}
    </span>
  )
}
```

- [ ] **Step 2: Update `IncentiveTable` props interface — remove selection and eligibility props**

In `client/src/components/incentives/IncentiveTable.tsx`, replace the `IncentiveTableProps` interface (lines 139–149):

```ts
// REPLACE this:
interface IncentiveTableProps {
  rows: IncentiveRow[]
  isLoading: boolean
  onApprove: (row: IncentiveRow) => void
  onReject: (row: IncentiveRow) => void
  onEligibilityChange: (id: string, eligible: boolean) => void
  selectedIds: string[]
  onSelectRow: (id: string, checked: boolean) => void
  onSelectAll: (checked: boolean) => void
  isAllSelected: boolean
}

// WITH this:
interface IncentiveTableProps {
  rows: IncentiveRow[]
  isLoading: boolean
  onApprove: (row: IncentiveRow) => void
  onReject: (row: IncentiveRow) => void
}
```

- [ ] **Step 3: Update `IncentiveTable` destructuring and remove `uniqueCounsellors` dependency on selection**

Replace the function signature (line 276):

```ts
// REPLACE this:
export function IncentiveTable({
  rows,
  isLoading,
  onApprove,
  onReject,
  onEligibilityChange,
  selectedIds,
  onSelectRow,
  onSelectAll,
  isAllSelected,
}: IncentiveTableProps) {

// WITH this:
export function IncentiveTable({
  rows,
  isLoading,
  onApprove,
  onReject,
}: IncentiveTableProps) {
```

- [ ] **Step 4: Remove the checkbox column header from `IncentiveTable`**

In the `<thead>` first `<tr>` (column labels row), delete the checkbox `<th>`:

```tsx
// DELETE this entire <th>:
<th className="px-4 py-3 text-center w-10">
  <input
    type="checkbox"
    checked={isAllSelected}
    onChange={(e) => onSelectAll(e.target.checked)}
    className="rounded border-border"
  />
</th>
```

- [ ] **Step 5: Remove the checkbox column filter cell from the filter row**

In the filter `<tr>`, delete:

```tsx
// DELETE this:
{/* Checkbox */}
<td className="px-3 py-2 w-10" />
```

- [ ] **Step 6: Remove the checkbox `<td>` and update `EligibilityPill` in each body row**

In `displayRows.map((row) => ...)`, make two changes:

1. Delete the checkbox cell:
```tsx
// DELETE this entire <td>:
<td className="px-4 py-3 text-center">
  <input
    type="checkbox"
    checked={isChecked}
    disabled={!isSelectable}
    onChange={(e) => onSelectRow(row.id, e.target.checked)}
    className="rounded border-border"
  />
</td>
```

2. Update `EligibilityPill` (remove `onChange` and `disabled`):
```tsx
// REPLACE this:
<EligibilityPill
  eligible={row.eligible}
  onChange={(val) => onEligibilityChange(row.id, val)}
  disabled={row.status !== 'pending'}
/>

// WITH this:
<EligibilityPill eligible={row.eligible} />
```

- [ ] **Step 7: Remove variables that referenced removed props**

In the `displayRows.map` callback, delete these two lines (they reference the removed props):

```ts
// DELETE these two lines inside the map callback:
const isChecked = selectedIds.includes(row.id)
const isSelectable = row.status === 'pending'
```

Also update the `<tr>` className to remove the `isChecked` reference:

```tsx
// REPLACE this:
className={cn(
  'border-b border-border/60 transition-colors hover:bg-muted/30',
  isChecked && 'bg-primary/5',
  !row.eligible && 'opacity-60'
)}

// WITH this:
className={cn(
  'border-b border-border/60 transition-colors hover:bg-muted/30',
  !row.eligible && 'opacity-60'
)}
```

- [ ] **Step 8: Update `colSpan` on the empty-state row from 11 to 10**

```tsx
// REPLACE:
<td colSpan={11} className="px-4 py-14 text-center">
// WITH:
<td colSpan={10} className="px-4 py-14 text-center">
```

- [ ] **Step 9: Verify build passes**

```bash
npm run build
```

Expected: exits 0. `IncentivesPage` will error on the removed props (`selectedIds`, `onEligibilityChange`, etc.) — those are fixed in Task 3.

If build errors only on `IncentivesPage.tsx`, that's expected — continue to Task 3 immediately.

- [ ] **Step 10: Commit (after Task 3 build passes)**

> Hold this commit until Task 3's build check passes. Commit both tasks together:

```bash
git add client/src/components/incentives/EligibilityPill.tsx
git add client/src/components/incentives/IncentiveTable.tsx
```

---

## Task 3 — `IncentiveTotalBanner` prop rename + `IncentivesPage` full rewire

**Files:**
- Modify: `client/src/components/incentives/IncentiveTotalBanner.tsx`
- Modify: `client/src/pages/IncentivesPage.tsx`

> Banner prop rename and page rewire are done together. Build runs once at the end; then commit both Task 2 and Task 3 staged files together.

- [ ] **Step 1: Rename `totalApprovedAmount` → `totalIncentiveAmount` in `IncentiveTotalBanner`**

Replace the entire contents of `client/src/components/incentives/IncentiveTotalBanner.tsx`:

```tsx
interface IncentiveTotalBannerProps {
  totalIncentiveAmount: number
  totalReceivedAmount: number
  month: string
  saleType: 'all' | 'spouse' | 'visitor' | 'student'
}

const saleLabels: Record<'all' | 'spouse' | 'visitor' | 'student', string> = {
  all: 'All Sale Types',
  spouse: 'Spouse',
  visitor: 'Visitor',
  student: 'Student',
}

export function IncentiveTotalBanner({ totalIncentiveAmount, totalReceivedAmount, month, saleType }: IncentiveTotalBannerProps) {
  const monthLabel = (() => {
    const [year, monthNum] = month.split('-')
    const d = new Date(Number(year), Number(monthNum) - 1)
    return isNaN(d.getTime()) ? month : d.toLocaleString('en-IN', { month: 'long', year: 'numeric' })
  })()

  return (
    <div className="px-4 pt-4 pb-2">
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-xl px-6 py-4 flex items-center justify-between text-white">
        <div className="flex gap-10">
          <div>
            <p className="text-xs uppercase font-semibold tracking-widest opacity-80">
              Total Incentive Amount
            </p>
            <p className="text-3xl font-bold mt-1">₹{totalIncentiveAmount.toLocaleString('en-IN')}</p>
            <p className="text-xs opacity-70 mt-1">
              {monthLabel} · {saleLabels[saleType]}
            </p>
          </div>
          <div className="border-l border-white/20 pl-10">
            <p className="text-xs uppercase font-semibold tracking-widest opacity-80">
              Total Received Amount
            </p>
            <p className="text-3xl font-bold mt-1">₹{totalReceivedAmount.toLocaleString('en-IN')}</p>
            <p className="text-xs opacity-70 mt-1">All enrollments</p>
          </div>
        </div>
        <span className="text-6xl font-bold opacity-10 select-none">₹</span>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Replace `IncentivesPage.tsx` with the rewired version**

Replace the entire (non-commented) implementation in `client/src/pages/IncentivesPage.tsx`. Keep the large commented-out block at the top (lines 1–226) untouched — only replace lines 228 to end:

```tsx
import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { useLocation } from 'wouter'
import { PageWrapper } from '@/layout/PageWrapper'
import { Button } from '@/components/ui/button'
import {
  fetchIncentivesReport,
  approveIncentive,
  rejectIncentive,
  type IncentiveRow,
} from '@/api/incentives.api'
import { IncentiveTotalBanner } from '@/components/incentives/IncentiveTotalBanner'
import { IncentiveFilters } from '@/components/incentives/IncentiveFilters'
import { IncentiveTable } from '@/components/incentives/IncentiveTable'
import { ConfirmActionModal } from '@/components/incentives/ConfirmActionModal'

type SaleTypeFilter = 'all' | 'spouse' | 'visitor' | 'student'

function getCurrentMonth(): string {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

export default function IncentivesPage() {
  const queryClient = useQueryClient()
  const [, setLocation] = useLocation()

  const [search, setSearch] = useState('')
  const [saleType, setSaleType] = useState<SaleTypeFilter>('all')
  const [counsellorId, setCounsellorId] = useState<string | null>(null)
  const [month, setMonth] = useState(getCurrentMonth)

  const [modalOpen, setModalOpen] = useState(false)
  const [modalAction, setModalAction] = useState<'approve' | 'reject'>('approve')
  const [selectedRow, setSelectedRow] = useState<IncentiveRow | null>(null)
  const [remarks, setRemarks] = useState('')

  const { data = [], isLoading } = useQuery({
    queryKey: ['incentives-report', month],
    queryFn: () => fetchIncentivesReport({ month }),
  })

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ['incentives-report'] })

  const approveMutation = useMutation({
    mutationFn: (id: string) => approveIncentive(id),
    onSuccess: () => {
      toast.success('Approved')
      invalidate()
    },
  })

  const rejectMutation = useMutation({
    mutationFn: ({ id, remarks }: { id: string; remarks: string }) =>
      rejectIncentive(id, remarks),
    onSuccess: () => {
      toast.success('Rejected')
      invalidate()
    },
  })

  const counsellors = useMemo(
    () =>
      [...new Set(data.map((r) => r.counsellorName).filter(Boolean))].map(
        (name) => ({ id: name, name })
      ),
    [data]
  )

  const totalIncentiveAmount = useMemo(
    () => data.reduce((s, r) => s + r.incentiveAmount, 0),
    [data]
  )

  const totalReceivedAmount = useMemo(
    () => data.reduce((s, r) => s + r.amount, 0),
    [data]
  )

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return data.filter((r) => {
      if (saleType !== 'all' && r.saleType !== saleType) return false
      if (counsellorId && r.counsellorName !== counsellorId) return false
      if (q && !r.clientName.toLowerCase().includes(q) && !r.clientId.includes(q)) return false
      return true
    })
  }, [data, search, saleType, counsellorId])

  const handleApprove = (row: IncentiveRow) => {
    setSelectedRow(row)
    setModalAction('approve')
    setModalOpen(true)
  }

  const handleReject = (row: IncentiveRow) => {
    setSelectedRow(row)
    setModalAction('reject')
    setModalOpen(true)
  }

  const handleConfirm = () => {
    if (!selectedRow) return
    if (modalAction === 'approve') {
      approveMutation.mutate(selectedRow.id)
      setModalOpen(false)
    } else {
      if (!remarks.trim()) {
        toast.error('Remarks required')
        return
      }
      rejectMutation.mutate({ id: selectedRow.id, remarks })
      setModalOpen(false)
    }
  }

  return (
    <PageWrapper
      title="Incentive Management"
      breadcrumbs={[
        { label: 'Dashboard', href: '/' },
        { label: 'Incentives' },
      ]}
      actions={
        <Button onClick={() => setLocation('/incentives/rules')}>
          Manage Rules
        </Button>
      }
    >
      <IncentiveTotalBanner
        totalIncentiveAmount={totalIncentiveAmount}
        totalReceivedAmount={totalReceivedAmount}
        month={month}
        saleType={saleType}
      />

      <IncentiveFilters
        search={search}
        onSearchChange={setSearch}
        saleType={saleType}
        onSaleTypeChange={setSaleType}
        counsellorId={counsellorId}
        onCounsellorChange={setCounsellorId}
        month={month}
        onMonthChange={setMonth}
        counsellors={counsellors}
      />

      <IncentiveTable
        rows={filtered}
        isLoading={isLoading}
        onApprove={handleApprove}
        onReject={handleReject}
      />

      <ConfirmActionModal
        open={modalOpen}
        onClose={() => {
          setModalOpen(false)
          setRemarks('')
        }}
        onConfirm={handleConfirm}
        action={modalAction}
        row={selectedRow}
        isLoading={approveMutation.isPending || rejectMutation.isPending}
        remarks={remarks}
        onRemarksChange={setRemarks}
      />
    </PageWrapper>
  )
}
```

- [ ] **Step 3: Verify build passes cleanly**

```bash
npm run build
```

Expected: exits 0, no TypeScript errors across all five changed files.

- [ ] **Step 4: Commit Tasks 2 and 3 together**

```bash
git add client/src/components/incentives/EligibilityPill.tsx
git add client/src/components/incentives/IncentiveTable.tsx
git add client/src/components/incentives/IncentiveTotalBanner.tsx
git add client/src/pages/IncentivesPage.tsx
git commit -m "feat: wire IncentivesPage to report API, EligibilityPill read-only, remove selection"
```

---

## Self-Review Checklist

After writing, the plan was checked against the spec:

| Spec requirement | Covered in |
|---|---|
| Add `ReportRow` type | Task 1 Step 1 |
| Add `getMonthRange` utility | Task 1 Step 2 |
| Add `fetchIncentivesReport` with mapping | Task 1 Steps 2–3 |
| Remove `updateEligibility` | Task 1 Step 4 |
| `EligibilityPill` → static badge | Task 2 Step 1 |
| `IncentiveTable` removes selection props | Task 2 Steps 2–7 |
| `IncentiveTable` colSpan fix | Task 2 Step 8 |
| `IncentiveTotalBanner` prop rename | Task 3 Step 1 |
| Banner sub-caption "All enrollments" | Task 3 Step 1 |
| `IncentivesPage` new query (`['incentives-report', month]`) | Task 3 Step 2 |
| Remove `getCounsellors()` fetch | Task 3 Step 2 |
| Derive counsellors from loaded rows | Task 3 Step 2 |
| Banner totals from all rows (unfiltered) | Task 3 Step 2 |
| Client-side filter: saleType, counsellor, search | Task 3 Step 2 |
| Remove `eligibilityMutation` | Task 3 Step 2 |
| Remove bulk selection + `bulkApproveMutation` | Task 3 Step 2 |
| `IncentiveFilters` unchanged | (no task — correct, no change needed) |
| `ConfirmActionModal` unchanged | (no task — correct) |
