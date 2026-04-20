# Incentive Management System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build two new pages — `/incentives` (main approval table) and `/incentives/rules` (rule config) — accessible only to `superadmin`, `manager`, and `developer` roles.

**Architecture:** Feature-sliced with local state. Each page owns its own `useState` + `useQuery`/`useMutation`. No shared context. All API calls go through a new `client/src/api/incentives.api.ts` module. Components live in `client/src/components/incentives/`.

**Tech Stack:** React 19, TypeScript, TanStack React Query 5, shadcn/ui (Card, Badge, Button, Dialog, Select, Input, Tabs), Tailwind CSS, wouter, Lucide React icons.

---

## File Map

| Action | Path | Responsibility |
|---|---|---|
| Create | `client/src/api/incentives.api.ts` | All typed API functions + interfaces |
| Modify | `client/src/constants/roles.ts` | Add `INCENTIVE_ROLES` export |
| Modify | `client/src/App.tsx` | Add 2 lazy routes |
| Modify | `client/src/layout/Sidebar.tsx` | Add Incentives nav item |
| Create | `client/src/components/incentives/EligibilityPill.tsx` | Yes/No pill toggle |
| Create | `client/src/components/incentives/IncentiveTotalBanner.tsx` | Purple gradient amount banner |
| Create | `client/src/components/incentives/ConfirmActionModal.tsx` | Approve/Reject confirmation dialog |
| Create | `client/src/components/incentives/IncentiveFilters.tsx` | Search + visa tabs + counsellor + month |
| Create | `client/src/components/incentives/IncentiveTable.tsx` | Main data table |
| Create | `client/src/pages/IncentivesPage.tsx` | `/incentives` page assembly |
| Create | `client/src/components/incentives/RuleRow.tsx` | Editable rule row (shared by all tabs) |
| Create | `client/src/components/incentives/SpouseRulesTab.tsx` | Range rule builder |
| Create | `client/src/components/incentives/VisitorRulesTab.tsx` | Slab rule builder |
| Create | `client/src/components/incentives/StudentRulesTab.tsx` | Country-based rule builder |
| Create | `client/src/pages/IncentiveRulesPage.tsx` | `/incentives/rules` page assembly |

---

## Task 1: API Module — Types + Functions

**Files:**
- Create: `client/src/api/incentives.api.ts`

- [ ] **Step 1: Create the API module with all types and function stubs**

```typescript
// client/src/api/incentives.api.ts
import { api } from '@/lib/api'

// ─── Shared Types ────────────────────────────────────────────────────────────

export type VisaType = 'spouse' | 'visitor' | 'student'
export type IncentiveStatus = 'pending' | 'approved' | 'rejected' | 'ineligible'

export interface IncentiveRow {
  id: string
  clientId: string
  clientName: string
  counsellorId: string
  counsellorName: string
  enrollmentDate: string        // ISO date string, e.g. "2026-04-12"
  visaType: VisaType
  eligible: boolean
  incentiveAmount: number
  status: IncentiveStatus
}

export interface IncentivesParams {
  visaType: 'all' | VisaType
  counsellorId: string | null
  month: string                 // "YYYY-MM" format
}

export interface IncentivesResponse {
  items: IncentiveRow[]
  totalApprovedAmount: number
}

// ─── Rule Types ───────────────────────────────────────────────────────────────

export interface SpouseRule {
  id: string
  minCount: number
  maxCount: number
  incentiveAmount: number
}

export interface VisitorRule {
  id: string
  minAmount: number
  maxAmount: number
  incentiveAmount: number
}

export interface StudentRule {
  id: string
  country: string               // e.g. "canada", "uk"
  ruleType: string              // e.g. "tuition_deposit", "after_visa_payment"
  incentiveAmount: number
}

export interface IncentiveRulesPayload {
  spouseRules: SpouseRule[]
  visitorRules: VisitorRule[]
  studentRules: StudentRule[]
}

// ─── API Functions ────────────────────────────────────────────────────────────

export async function fetchIncentives(params: IncentivesParams): Promise<IncentivesResponse> {
  const res = await api.get('/api/incentives', { params })
  return res.data
}

export async function approveIncentive(id: string): Promise<void> {
  await api.post(`/api/incentives/${id}/approve`)
}

export async function rejectIncentive(id: string): Promise<void> {
  await api.post(`/api/incentives/${id}/reject`)
}

export async function updateEligibility(id: string, eligible: boolean): Promise<void> {
  await api.patch(`/api/incentives/${id}/eligibility`, { eligible })
}

export async function fetchIncentiveRules(): Promise<IncentiveRulesPayload> {
  const res = await api.get('/api/incentives/rules')
  return res.data
}

export async function saveIncentiveRules(payload: IncentiveRulesPayload): Promise<void> {
  await api.put('/api/incentives/rules', payload)
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npm run build
```
Expected: build succeeds or only shows unrelated pre-existing errors. No errors from `incentives.api.ts`.

- [ ] **Step 3: Commit**

```bash
git add client/src/api/incentives.api.ts
git commit -m "feat: add incentives API module with types and function stubs"
```

---

## Task 2: INCENTIVE_ROLES Constant + Routes + Sidebar

**Files:**
- Modify: `client/src/constants/roles.ts`
- Modify: `client/src/App.tsx`
- Modify: `client/src/layout/Sidebar.tsx`

- [ ] **Step 1: Add INCENTIVE_ROLES to constants/roles.ts**

Open `client/src/constants/roles.ts` and append at the end:

```typescript
import type { UserRole } from "@/context/auth-context";

// add this export after the existing exports:
export const INCENTIVE_ROLES: UserRole[] = ['superadmin', 'manager', 'developer']
```

The existing import of `UserRole` is already at line 1 — do not duplicate it.

- [ ] **Step 2: Add lazy imports in App.tsx**

In `client/src/App.tsx`, after the existing lazy imports (around line 49), add:

```typescript
const IncentivesPage = lazy(() => import("@/pages/IncentivesPage"))
const IncentiveRulesPage = lazy(() => import("@/pages/IncentiveRulesPage"))
```

Also add the import for `INCENTIVE_ROLES` where other role constants are imported (look for the `import { ... } from "@/constants/roles"` line):

```typescript
// add INCENTIVE_ROLES to the existing roles import destructure
import { CX_ALLOWED_ROLES, BINDING_ALLOWED_ROLES, APPLICATION_ALLOWED_ROLES, BACKEND_ALLOWED_ROLES, BACKEND_CHECKLIST_ADMIN_ROLES, INCENTIVE_ROLES } from "@/constants/roles"
```

- [ ] **Step 3: Add routes in App.tsx**

Inside the `<Switch>` block in `App.tsx`, add after the existing `/reports/payments` route:

```tsx
<Route path="/incentives">
  {() => <ProtectedRoute component={IncentivesPage} allowedRoles={INCENTIVE_ROLES} />}
</Route>
<Route path="/incentives/rules">
  {() => <ProtectedRoute component={IncentiveRulesPage} allowedRoles={INCENTIVE_ROLES} />}
</Route>
```

- [ ] **Step 4: Add sidebar nav item in Sidebar.tsx**

In `client/src/layout/Sidebar.tsx`, add `BadgeDollarSign` to the lucide-react import at the top:

```typescript
import {
  // ...existing imports...
  BadgeDollarSign,
} from "lucide-react"
```

Then in the `sidebarItems` array (around line 69), add the Incentives entry **after the Reports item**:

```typescript
{
  icon: BadgeDollarSign,
  label: "Incentives",
  href: "/incentives",
  roles: ["superadmin", "developer", "manager"],
},
```

- [ ] **Step 5: Verify build**

```bash
npm run build
```
Expected: no errors from the three modified files.

- [ ] **Step 6: Commit**

```bash
git add client/src/constants/roles.ts client/src/App.tsx client/src/layout/Sidebar.tsx
git commit -m "feat: add incentive routes and sidebar nav entry"
```

---

## Task 3: EligibilityPill Component

**Files:**
- Create: `client/src/components/incentives/EligibilityPill.tsx`

- [ ] **Step 1: Create the component**

```tsx
// client/src/components/incentives/EligibilityPill.tsx
import { cn } from '@/lib/utils'

interface EligibilityPillProps {
  eligible: boolean
  onChange: (eligible: boolean) => void
  disabled?: boolean
}

export function EligibilityPill({ eligible, onChange, disabled = false }: EligibilityPillProps) {
  return (
    <button
      type="button"
      onClick={() => !disabled && onChange(!eligible)}
      disabled={disabled}
      className={cn(
        'inline-block px-5 py-1 rounded-full text-xs font-semibold transition-colors cursor-pointer',
        eligible
          ? 'bg-green-100 text-green-600 hover:bg-green-200 dark:bg-green-900/30 dark:text-green-400'
          : 'bg-red-100 text-red-500 hover:bg-red-200 dark:bg-red-900/30 dark:text-red-400',
        disabled && 'cursor-not-allowed opacity-50'
      )}
    >
      {eligible ? 'Yes' : 'No'}
    </button>
  )
}
```

- [ ] **Step 2: Verify build**

```bash
npm run build
```
Expected: no TypeScript errors.

- [ ] **Step 3: Commit**

```bash
git add client/src/components/incentives/EligibilityPill.tsx
git commit -m "feat: add EligibilityPill component"
```

---

## Task 4: IncentiveTotalBanner Component

**Files:**
- Create: `client/src/components/incentives/IncentiveTotalBanner.tsx`

- [ ] **Step 1: Create the component**

```tsx
// client/src/components/incentives/IncentiveTotalBanner.tsx

interface IncentiveTotalBannerProps {
  totalApprovedAmount: number
  month: string       // "YYYY-MM"
  visaType: 'all' | 'spouse' | 'visitor' | 'student'
}

const visaLabels: Record<string, string> = {
  all: 'All Visa Types',
  spouse: 'Spouse Visa',
  visitor: 'Visitor Visa',
  student: 'Student Visa',
}

export function IncentiveTotalBanner({ totalApprovedAmount, month, visaType }: IncentiveTotalBannerProps) {
  const [year, monthNum] = month.split('-')
  const monthLabel = new Date(Number(year), Number(monthNum) - 1).toLocaleString('en-IN', {
    month: 'long',
    year: 'numeric',
  })
  const formattedAmount = `₹${totalApprovedAmount.toLocaleString('en-IN')}`

  return (
    <div className="px-4 pt-4 pb-2">
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-xl px-6 py-4 flex items-center justify-between text-white">
        <div>
          <p className="text-xs uppercase font-semibold tracking-widest opacity-80">
            Total Incentive Amount
          </p>
          <p className="text-3xl font-bold mt-1">{formattedAmount}</p>
          <p className="text-xs opacity-70 mt-1">
            {monthLabel} · {visaLabels[visaType]}
          </p>
        </div>
        <span className="text-6xl font-bold opacity-10 select-none">₹</span>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Verify build**

```bash
npm run build
```

- [ ] **Step 3: Commit**

```bash
git add client/src/components/incentives/IncentiveTotalBanner.tsx
git commit -m "feat: add IncentiveTotalBanner component"
```

---

## Task 5: ConfirmActionModal Component

**Files:**
- Create: `client/src/components/incentives/ConfirmActionModal.tsx`

- [ ] **Step 1: Check Dialog component exists**

```bash
ls client/src/components/ui/dialog.tsx
```
If the file is missing, run: `npx shadcn@latest add dialog` from the project root.

- [ ] **Step 2: Create the component**

```tsx
// client/src/components/incentives/ConfirmActionModal.tsx
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import type { IncentiveRow } from '@/api/incentives.api'

interface ConfirmActionModalProps {
  open: boolean
  onClose: () => void
  onConfirm: () => void
  action: 'approve' | 'reject'
  row: Pick<IncentiveRow, 'clientName' | 'counsellorName' | 'incentiveAmount'> | null
  isLoading: boolean
}

export function ConfirmActionModal({
  open,
  onClose,
  onConfirm,
  action,
  row,
  isLoading,
}: ConfirmActionModalProps) {
  const isApprove = action === 'approve'

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>
            {isApprove ? 'Approve Incentive?' : 'Reject Incentive?'}
          </DialogTitle>
        </DialogHeader>

        {row && (
          <div className="space-y-2 text-sm text-muted-foreground py-1">
            <p>
              <span className="font-medium text-foreground">Client: </span>
              {row.clientName}
            </p>
            <p>
              <span className="font-medium text-foreground">Counsellor: </span>
              {row.counsellorName}
            </p>
            <p>
              <span className="font-medium text-foreground">Amount: </span>
              ₹{row.incentiveAmount.toLocaleString('en-IN')}
            </p>
          </div>
        )}

        <DialogFooter className="gap-2 pt-2">
          <Button variant="ghost" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button
            variant={isApprove ? 'default' : 'destructive'}
            onClick={onConfirm}
            disabled={isLoading}
          >
            {isLoading ? 'Processing...' : isApprove ? 'Approve' : 'Reject'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
```

- [ ] **Step 3: Verify build**

```bash
npm run build
```

- [ ] **Step 4: Commit**

```bash
git add client/src/components/incentives/ConfirmActionModal.tsx
git commit -m "feat: add ConfirmActionModal component"
```

---

## Task 6: IncentiveFilters Component

**Files:**
- Create: `client/src/components/incentives/IncentiveFilters.tsx`

- [ ] **Step 1: Create the component**

```tsx
// client/src/components/incentives/IncentiveFilters.tsx
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Search } from 'lucide-react'
import { cn } from '@/lib/utils'

type VisaFilter = 'all' | 'spouse' | 'visitor' | 'student'

interface Counsellor {
  id: string
  name: string
}

interface IncentiveFiltersProps {
  search: string
  onSearchChange: (v: string) => void
  visaType: VisaFilter
  onVisaTypeChange: (v: VisaFilter) => void
  counsellorId: string | null
  onCounsellorChange: (id: string | null) => void
  month: string                           // "YYYY-MM"
  onMonthChange: (m: string) => void
  counsellors: Counsellor[]
}

const VISA_TABS: { label: string; value: VisaFilter }[] = [
  { label: 'ALL', value: 'all' },
  { label: 'Spouse', value: 'spouse' },
  { label: 'Visitor', value: 'visitor' },
  { label: 'Student', value: 'student' },
]

function getMonthOptions(): { label: string; value: string }[] {
  const options = []
  const now = new Date()
  for (let i = 0; i < 12; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    const label = d.toLocaleString('en-IN', { month: 'long', year: 'numeric' })
    options.push({ value, label })
  }
  return options
}

export function IncentiveFilters({
  search,
  onSearchChange,
  visaType,
  onVisaTypeChange,
  counsellorId,
  onCounsellorChange,
  month,
  onMonthChange,
  counsellors,
}: IncentiveFiltersProps) {
  const monthOptions = getMonthOptions()

  return (
    <div className="px-4 py-3 flex flex-wrap gap-3 items-center border-b border-border/60">
      {/* Search */}
      <div className="relative flex-1 min-w-[180px]">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search client name or ID..."
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Visa type tabs */}
      <div className="flex rounded-md border border-border overflow-hidden">
        {VISA_TABS.map((tab) => (
          <button
            key={tab.value}
            type="button"
            onClick={() => onVisaTypeChange(tab.value)}
            className={cn(
              'px-3 py-1.5 text-xs font-semibold transition-colors',
              visaType === tab.value
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:bg-muted',
              tab.value !== 'all' && 'border-l border-border'
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Counsellor dropdown */}
      <Select
        value={counsellorId ?? 'all'}
        onValueChange={(v) => onCounsellorChange(v === 'all' ? null : v)}
      >
        <SelectTrigger className="w-[160px]">
          <SelectValue placeholder="All Counsellors" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Counsellors</SelectItem>
          {counsellors.map((c) => (
            <SelectItem key={c.id} value={c.id}>
              {c.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Month picker */}
      <Select value={month} onValueChange={onMonthChange}>
        <SelectTrigger className="w-[160px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {monthOptions.map((opt) => (
            <SelectItem key={opt.value} value={opt.value}>
              {opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
```

- [ ] **Step 2: Verify build**

```bash
npm run build
```

- [ ] **Step 3: Commit**

```bash
git add client/src/components/incentives/IncentiveFilters.tsx
git commit -m "feat: add IncentiveFilters component"
```

---

## Task 7: IncentiveTable Component

**Files:**
- Create: `client/src/components/incentives/IncentiveTable.tsx`

- [ ] **Step 1: Create the component**

```tsx
// client/src/components/incentives/IncentiveTable.tsx
import { format } from 'date-fns'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { EligibilityPill } from './EligibilityPill'
import type { IncentiveRow } from '@/api/incentives.api'

interface IncentiveTableProps {
  rows: IncentiveRow[]
  isLoading: boolean
  onApprove: (row: IncentiveRow) => void
  onReject: (row: IncentiveRow) => void
  onEligibilityChange: (id: string, eligible: boolean) => void
}

const visaBadgeClass: Record<string, string> = {
  spouse: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  visitor: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
  student: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
}

const statusBadgeClass: Record<string, string> = {
  pending: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
  approved: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
  rejected: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
  ineligible: 'bg-muted text-muted-foreground',
}

export function IncentiveTable({
  rows,
  isLoading,
  onApprove,
  onReject,
  onEligibilityChange,
}: IncentiveTableProps) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16 text-muted-foreground text-sm">
        Loading incentives...
      </div>
    )
  }

  if (rows.length === 0) {
    return (
      <div className="flex items-center justify-center py-16 text-muted-foreground text-sm">
        No incentive records found.
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="bg-muted/50 border-b border-border">
            <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide whitespace-nowrap">
              Client ID
            </th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Client Name
            </th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Counsellor
            </th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide whitespace-nowrap">
              Enrollment Date
            </th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Visa Type
            </th>
            <th className="px-4 py-3 text-center text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Eligibility
            </th>
            <th className="px-4 py-3 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wide whitespace-nowrap">
              Incentive Amount
            </th>
            <th className="px-4 py-3 text-center text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Status
            </th>
            <th className="px-4 py-3 text-center text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Actions
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              key={row.id}
              className={cn(
                'border-b border-border/60 transition-colors hover:bg-muted/30',
                !row.eligible && 'opacity-60'
              )}
            >
              <td className="px-4 py-3 text-primary font-semibold whitespace-nowrap">
                #{row.clientId}
              </td>
              <td className="px-4 py-3 font-medium text-foreground">{row.clientName}</td>
              <td className="px-4 py-3 text-muted-foreground">{row.counsellorName || '—'}</td>
              <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                {format(new Date(row.enrollmentDate), 'd MMM yyyy')}
              </td>
              <td className="px-4 py-3">
                <span
                  className={cn(
                    'px-2.5 py-0.5 rounded-full text-[11px] font-semibold uppercase',
                    visaBadgeClass[row.visaType]
                  )}
                >
                  {row.visaType}
                </span>
              </td>
              <td className="px-4 py-3 text-center">
                <EligibilityPill
                  eligible={row.eligible}
                  onChange={(val) => onEligibilityChange(row.id, val)}
                />
              </td>
              <td className="px-4 py-3 text-right font-bold text-primary">
                ₹{row.incentiveAmount.toLocaleString('en-IN')}
              </td>
              <td className="px-4 py-3 text-center">
                <span
                  className={cn(
                    'px-2.5 py-0.5 rounded-full text-[11px] font-semibold uppercase',
                    statusBadgeClass[row.status]
                  )}
                >
                  {row.status}
                </span>
              </td>
              <td className="px-4 py-3 text-center">
                {row.status === 'pending' ? (
                  <div className="flex gap-2 justify-center">
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 px-3 text-xs bg-green-50 text-green-700 hover:bg-green-100 dark:bg-green-900/20 dark:text-green-400"
                      onClick={() => onApprove(row)}
                    >
                      Approve
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 px-3 text-xs bg-red-50 text-red-600 hover:bg-red-100 dark:bg-red-900/20 dark:text-red-400"
                      onClick={() => onReject(row)}
                    >
                      Reject
                    </Button>
                  </div>
                ) : (
                  <span className="text-muted-foreground text-xs">—</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
```

- [ ] **Step 2: Verify build**

```bash
npm run build
```

- [ ] **Step 3: Commit**

```bash
git add client/src/components/incentives/IncentiveTable.tsx
git commit -m "feat: add IncentiveTable component"
```

---

## Task 8: IncentivesPage — Main Page

**Files:**
- Create: `client/src/pages/IncentivesPage.tsx`

- [ ] **Step 1: Create the page**

```tsx
// client/src/pages/IncentivesPage.tsx
import { useState, useMemo, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { PageWrapper } from '@/layout/PageWrapper'
import { clientService } from '@/services/clientService'
import {
  fetchIncentives,
  approveIncentive,
  rejectIncentive,
  updateEligibility,
  type IncentiveRow,
} from '@/api/incentives.api'
import { IncentiveTotalBanner } from '@/components/incentives/IncentiveTotalBanner'
import { IncentiveFilters } from '@/components/incentives/IncentiveFilters'
import { IncentiveTable } from '@/components/incentives/IncentiveTable'
import { ConfirmActionModal } from '@/components/incentives/ConfirmActionModal'

type VisaFilter = 'all' | 'spouse' | 'visitor' | 'student'

function getCurrentMonth(): string {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

export default function IncentivesPage() {
  const queryClient = useQueryClient()

  // ─── Filters ────────────────────────────────────────────────────────────────
  const [search, setSearch] = useState('')
  const [visaType, setVisaType] = useState<VisaFilter>('all')
  const [counsellorId, setCounsellorId] = useState<string | null>(null)
  const [month, setMonth] = useState(getCurrentMonth)

  // ─── Modal State ─────────────────────────────────────────────────────────────
  const [modalOpen, setModalOpen] = useState(false)
  const [modalAction, setModalAction] = useState<'approve' | 'reject'>('approve')
  const [selectedRow, setSelectedRow] = useState<IncentiveRow | null>(null)

  // ─── Queries ─────────────────────────────────────────────────────────────────
  const { data, isLoading } = useQuery({
    queryKey: ['incentives', { visaType, counsellorId, month }],
    queryFn: () => fetchIncentives({ visaType, counsellorId, month }),
  })

  const { data: counsellors = [] } = useQuery({
    queryKey: ['counsellors'],
    queryFn: () => clientService.getCounsellors(),
  })

  // ─── Mutations ───────────────────────────────────────────────────────────────
  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ['incentives'] })

  const approveMutation = useMutation({
    mutationFn: (id: string) => approveIncentive(id),
    onSuccess: () => { toast.success('Incentive approved'); invalidate() },
    onError: () => toast.error('Failed to approve'),
  })

  const rejectMutation = useMutation({
    mutationFn: (id: string) => rejectIncentive(id),
    onSuccess: () => { toast.success('Incentive rejected'); invalidate() },
    onError: () => toast.error('Failed to reject'),
  })

  const eligibilityMutation = useMutation({
    mutationFn: ({ id, eligible }: { id: string; eligible: boolean }) =>
      updateEligibility(id, eligible),
    onSuccess: () => { toast.success('Eligibility updated'); invalidate() },
    onError: () => toast.error('Failed to update eligibility'),
  })

  // ─── Derived ─────────────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    if (!data?.items) return []
    const q = search.toLowerCase()
    if (!q) return data.items
    return data.items.filter(
      (r) =>
        r.clientName.toLowerCase().includes(q) ||
        r.clientId.toLowerCase().includes(q)
    )
  }, [data, search])

  // ─── Handlers ────────────────────────────────────────────────────────────────
  const handleApprove = useCallback((row: IncentiveRow) => {
    setSelectedRow(row)
    setModalAction('approve')
    setModalOpen(true)
  }, [])

  const handleReject = useCallback((row: IncentiveRow) => {
    setSelectedRow(row)
    setModalAction('reject')
    setModalOpen(true)
  }, [])

  const handleConfirm = () => {
    if (!selectedRow) return
    if (modalAction === 'approve') {
      approveMutation.mutate(selectedRow.id, { onSettled: () => setModalOpen(false) })
    } else {
      rejectMutation.mutate(selectedRow.id, { onSettled: () => setModalOpen(false) })
    }
  }

  const handleEligibilityChange = useCallback((id: string, eligible: boolean) => {
    eligibilityMutation.mutate({ id, eligible })
  }, [eligibilityMutation])

  const isConfirming = approveMutation.isPending || rejectMutation.isPending

  return (
    <PageWrapper
      title="Incentive Management"
      breadcrumbs={[{ label: 'Dashboard', href: '/' }, { label: 'Incentives' }]}
    >
      <IncentiveTotalBanner
        totalApprovedAmount={data?.totalApprovedAmount ?? 0}
        month={month}
        visaType={visaType}
      />

      <IncentiveFilters
        search={search}
        onSearchChange={setSearch}
        visaType={visaType}
        onVisaTypeChange={setVisaType}
        counsellorId={counsellorId}
        onCounsellorChange={setCounsellorId}
        month={month}
        onMonthChange={setMonth}
        counsellors={counsellors.map((c: any) => ({ id: String(c.id), name: c.name || c.fullname }))}
      />

      <IncentiveTable
        rows={filtered}
        isLoading={isLoading}
        onApprove={handleApprove}
        onReject={handleReject}
        onEligibilityChange={handleEligibilityChange}
      />

      <ConfirmActionModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onConfirm={handleConfirm}
        action={modalAction}
        row={selectedRow}
        isLoading={isConfirming}
      />
    </PageWrapper>
  )
}
```

- [ ] **Step 2: Verify build**

```bash
npm run build
```

- [ ] **Step 3: Start dev server and verify the page loads**

```bash
npm run dev
```
Navigate to `http://localhost:5173/incentives` while logged in as manager/admin/developer. Expected: page renders with banner, filters, and empty table (API not yet wired).

- [ ] **Step 4: Commit**

```bash
git add client/src/pages/IncentivesPage.tsx
git commit -m "feat: add IncentivesPage with filters, table, and approve/reject flow"
```

---

## Task 9: RuleRow — Shared Editable Row

**Files:**
- Create: `client/src/components/incentives/RuleRow.tsx`

- [ ] **Step 1: Create the component**

```tsx
// client/src/components/incentives/RuleRow.tsx
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Trash2 } from 'lucide-react'

export interface RuleField {
  key: string
  label: string
  placeholder?: string
}

interface RuleRowProps {
  index: number
  fields: RuleField[]
  values: Record<string, string>
  onChange: (key: string, value: string) => void
  onDelete: () => void
}

export function RuleRow({ index, fields, values, onChange, onDelete }: RuleRowProps) {
  return (
    <tr className="border-b border-border/60">
      <td className="px-4 py-2 text-xs text-muted-foreground">{index + 1}</td>
      {fields.map((field) => (
        <td key={field.key} className="px-4 py-2">
          <Input
            type="number"
            min={0}
            value={values[field.key] ?? ''}
            onChange={(e) => onChange(field.key, e.target.value)}
            placeholder={field.placeholder ?? field.label}
            className="w-28"
          />
        </td>
      ))}
      <td className="px-4 py-2 text-center">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onDelete}
          className="h-7 w-7 p-0 text-destructive hover:bg-destructive/10"
        >
          <Trash2 className="w-4 h-4" />
        </Button>
      </td>
    </tr>
  )
}
```

- [ ] **Step 2: Verify build**

```bash
npm run build
```

- [ ] **Step 3: Commit**

```bash
git add client/src/components/incentives/RuleRow.tsx
git commit -m "feat: add RuleRow shared editable component"
```

---

## Task 10: SpouseRulesTab

**Files:**
- Create: `client/src/components/incentives/SpouseRulesTab.tsx`

- [ ] **Step 1: Create the component**

```tsx
// client/src/components/incentives/SpouseRulesTab.tsx
import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'
import { RuleRow } from './RuleRow'
import {
  fetchIncentiveRules,
  saveIncentiveRules,
  type SpouseRule,
} from '@/api/incentives.api'

type DraftRule = { id: string; minCount: string; maxCount: string; incentiveAmount: string }

function toDisplay(rule: SpouseRule): DraftRule {
  return {
    id: rule.id,
    minCount: String(rule.minCount),
    maxCount: String(rule.maxCount),
    incentiveAmount: String(rule.incentiveAmount),
  }
}

function toDomain(draft: DraftRule): SpouseRule {
  return {
    id: draft.id,
    minCount: Number(draft.minCount),
    maxCount: Number(draft.maxCount),
    incentiveAmount: Number(draft.incentiveAmount),
  }
}

function validateOverlap(rules: DraftRule[]): string | null {
  const parsed = rules.map(toDomain)
  for (let i = 0; i < parsed.length; i++) {
    for (let j = i + 1; j < parsed.length; j++) {
      const a = parsed[i], b = parsed[j]
      if (a.minCount < b.maxCount && a.maxCount > b.minCount) {
        return `Rule ${i + 1} (${a.minCount}–${a.maxCount}) overlaps with Rule ${j + 1} (${b.minCount}–${b.maxCount}).`
      }
    }
  }
  return null
}

const FIELDS = [
  { key: 'minCount', label: 'Min Count', placeholder: 'e.g. 50' },
  { key: 'maxCount', label: 'Max Count', placeholder: 'e.g. 60' },
  { key: 'incentiveAmount', label: 'Incentive Amount (₹)', placeholder: 'e.g. 1000' },
]

export function SpouseRulesTab() {
  const queryClient = useQueryClient()
  const { data: rules } = useQuery({
    queryKey: ['incentive-rules'],
    queryFn: fetchIncentiveRules,
  })

  const [draft, setDraft] = useState<DraftRule[]>([])
  const [dirty, setDirty] = useState(false)

  useEffect(() => {
    if (rules?.spouseRules) {
      setDraft(rules.spouseRules.map(toDisplay))
      setDirty(false)
    }
  }, [rules])

  const overlap = validateOverlap(draft)

  const saveMutation = useMutation({
    mutationFn: () =>
      saveIncentiveRules({
        spouseRules: draft.map(toDomain),
        visitorRules: rules?.visitorRules ?? [],
        studentRules: rules?.studentRules ?? [],
      }),
    onSuccess: () => {
      toast.success('Spouse rules saved')
      queryClient.invalidateQueries({ queryKey: ['incentive-rules'] })
      setDirty(false)
    },
    onError: () => toast.error('Failed to save rules'),
  })

  const addRow = () => {
    setDraft((d) => [
      ...d,
      { id: crypto.randomUUID(), minCount: '', maxCount: '', incentiveAmount: '' },
    ])
    setDirty(true)
  }

  const updateField = (index: number, key: string, value: string) => {
    setDraft((d) => d.map((r, i) => (i === index ? { ...r, [key]: value } : r)))
    setDirty(true)
  }

  const deleteRow = (index: number) => {
    setDraft((d) => d.filter((_, i) => i !== index))
    setDirty(true)
  }

  const discard = () => {
    if (rules?.spouseRules) setDraft(rules.spouseRules.map(toDisplay))
    setDirty(false)
  }

  return (
    <div className="p-4 space-y-4">
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg px-4 py-3 text-sm text-blue-700 dark:text-blue-300">
        Spouse Visa incentive is based on <strong>total team count per month</strong>. Define count ranges and the incentive amount paid when the team hits that range.
      </div>

      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">{draft.length} rule{draft.length !== 1 ? 's' : ''} defined</span>
        <Button type="button" size="sm" onClick={addRow}>
          <Plus className="w-4 h-4 mr-1" /> Add Rule
        </Button>
      </div>

      <div className="border border-border rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              <th className="px-4 py-2 text-left text-xs font-semibold text-muted-foreground">#</th>
              {FIELDS.map((f) => (
                <th key={f.key} className="px-4 py-2 text-left text-xs font-semibold text-muted-foreground">
                  {f.label}
                </th>
              ))}
              <th className="px-4 py-2 text-center text-xs font-semibold text-muted-foreground">Delete</th>
            </tr>
          </thead>
          <tbody>
            {draft.map((row, i) => (
              <RuleRow
                key={row.id}
                index={i}
                fields={FIELDS}
                values={row}
                onChange={(key, val) => updateField(i, key, val)}
                onDelete={() => deleteRow(i)}
              />
            ))}
            {draft.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-muted-foreground text-sm">
                  No rules yet. Click "Add Rule" to start.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {overlap && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg px-4 py-2 text-sm text-red-600 dark:text-red-400">
          ⚠ {overlap} Please fix before saving.
        </div>
      )}

      {dirty && (
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={discard} disabled={saveMutation.isPending}>
            Discard Changes
          </Button>
          <Button
            onClick={() => saveMutation.mutate()}
            disabled={!!overlap || saveMutation.isPending}
          >
            {saveMutation.isPending ? 'Saving...' : 'Save Spouse Rules'}
          </Button>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Verify build**

```bash
npm run build
```

- [ ] **Step 3: Commit**

```bash
git add client/src/components/incentives/SpouseRulesTab.tsx
git commit -m "feat: add SpouseRulesTab with range rule builder and overlap validation"
```

---

## Task 11: VisitorRulesTab

**Files:**
- Create: `client/src/components/incentives/VisitorRulesTab.tsx`

- [ ] **Step 1: Create the component**

```tsx
// client/src/components/incentives/VisitorRulesTab.tsx
import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'
import { RuleRow } from './RuleRow'
import {
  fetchIncentiveRules,
  saveIncentiveRules,
  type VisitorRule,
} from '@/api/incentives.api'

type DraftRule = { id: string; minAmount: string; maxAmount: string; incentiveAmount: string }

function toDisplay(rule: VisitorRule): DraftRule {
  return {
    id: rule.id,
    minAmount: String(rule.minAmount),
    maxAmount: String(rule.maxAmount),
    incentiveAmount: String(rule.incentiveAmount),
  }
}

function toDomain(draft: DraftRule): VisitorRule {
  return {
    id: draft.id,
    minAmount: Number(draft.minAmount),
    maxAmount: Number(draft.maxAmount),
    incentiveAmount: Number(draft.incentiveAmount),
  }
}

function validateOverlap(rules: DraftRule[]): string | null {
  const parsed = rules.map(toDomain)
  for (let i = 0; i < parsed.length; i++) {
    for (let j = i + 1; j < parsed.length; j++) {
      const a = parsed[i], b = parsed[j]
      if (a.minAmount < b.maxAmount && a.maxAmount > b.minAmount) {
        return `Rule ${i + 1} (₹${a.minAmount}–₹${a.maxAmount}) overlaps with Rule ${j + 1} (₹${b.minAmount}–₹${b.maxAmount}).`
      }
    }
  }
  return null
}

const FIELDS = [
  { key: 'minAmount', label: 'Min Amount (₹)', placeholder: 'e.g. 8000' },
  { key: 'maxAmount', label: 'Max Amount (₹)', placeholder: 'e.g. 9000' },
  { key: 'incentiveAmount', label: 'Incentive Amount (₹)', placeholder: 'e.g. 100' },
]

export function VisitorRulesTab() {
  const queryClient = useQueryClient()
  const { data: rules } = useQuery({
    queryKey: ['incentive-rules'],
    queryFn: fetchIncentiveRules,
  })

  const [draft, setDraft] = useState<DraftRule[]>([])
  const [dirty, setDirty] = useState(false)

  useEffect(() => {
    if (rules?.visitorRules) {
      setDraft(rules.visitorRules.map(toDisplay))
      setDirty(false)
    }
  }, [rules])

  const overlap = validateOverlap(draft)

  const saveMutation = useMutation({
    mutationFn: () =>
      saveIncentiveRules({
        spouseRules: rules?.spouseRules ?? [],
        visitorRules: draft.map(toDomain),
        studentRules: rules?.studentRules ?? [],
      }),
    onSuccess: () => {
      toast.success('Visitor rules saved')
      queryClient.invalidateQueries({ queryKey: ['incentive-rules'] })
      setDirty(false)
    },
    onError: () => toast.error('Failed to save rules'),
  })

  const addRow = () => {
    setDraft((d) => [
      ...d,
      { id: crypto.randomUUID(), minAmount: '', maxAmount: '', incentiveAmount: '' },
    ])
    setDirty(true)
  }

  const updateField = (index: number, key: string, value: string) => {
    setDraft((d) => d.map((r, i) => (i === index ? { ...r, [key]: value } : r)))
    setDirty(true)
  }

  const deleteRow = (index: number) => {
    setDraft((d) => d.filter((_, i) => i !== index))
    setDirty(true)
  }

  const discard = () => {
    if (rules?.visitorRules) setDraft(rules.visitorRules.map(toDisplay))
    setDirty(false)
  }

  return (
    <div className="p-4 space-y-4">
      <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg px-4 py-3 text-sm text-green-700 dark:text-green-300">
        Visitor Visa incentive is based on <strong>initial payment amount</strong>. Define payment slabs and the incentive amount paid for each slab.
      </div>

      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">{draft.length} rule{draft.length !== 1 ? 's' : ''} defined</span>
        <Button type="button" size="sm" onClick={addRow}>
          <Plus className="w-4 h-4 mr-1" /> Add Rule
        </Button>
      </div>

      <div className="border border-border rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              <th className="px-4 py-2 text-left text-xs font-semibold text-muted-foreground">#</th>
              {FIELDS.map((f) => (
                <th key={f.key} className="px-4 py-2 text-left text-xs font-semibold text-muted-foreground">
                  {f.label}
                </th>
              ))}
              <th className="px-4 py-2 text-center text-xs font-semibold text-muted-foreground">Delete</th>
            </tr>
          </thead>
          <tbody>
            {draft.map((row, i) => (
              <RuleRow
                key={row.id}
                index={i}
                fields={FIELDS}
                values={row}
                onChange={(key, val) => updateField(i, key, val)}
                onDelete={() => deleteRow(i)}
              />
            ))}
            {draft.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-muted-foreground text-sm">
                  No rules yet. Click "Add Rule" to start.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {overlap && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg px-4 py-2 text-sm text-red-600 dark:text-red-400">
          ⚠ {overlap} Please fix before saving.
        </div>
      )}

      {dirty && (
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={discard} disabled={saveMutation.isPending}>
            Discard Changes
          </Button>
          <Button
            onClick={() => saveMutation.mutate()}
            disabled={!!overlap || saveMutation.isPending}
          >
            {saveMutation.isPending ? 'Saving...' : 'Save Visitor Rules'}
          </Button>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Verify build**

```bash
npm run build
```

- [ ] **Step 3: Commit**

```bash
git add client/src/components/incentives/VisitorRulesTab.tsx
git commit -m "feat: add VisitorRulesTab with slab rule builder"
```

---

## Task 12: StudentRulesTab

**Files:**
- Create: `client/src/components/incentives/StudentRulesTab.tsx`

- [ ] **Step 1: Create the component**

```tsx
// client/src/components/incentives/StudentRulesTab.tsx
import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Plus, Trash2 } from 'lucide-react'
import {
  fetchIncentiveRules,
  saveIncentiveRules,
  type StudentRule,
} from '@/api/incentives.api'

const DEFAULT_COUNTRIES = [
  { value: 'canada', label: 'Canada', defaultRuleType: 'Tuition Deposit' },
  { value: 'uk', label: 'UK', defaultRuleType: 'After Visa Payment' },
]

export function StudentRulesTab() {
  const queryClient = useQueryClient()
  const { data: rules } = useQuery({
    queryKey: ['incentive-rules'],
    queryFn: fetchIncentiveRules,
  })

  const [draft, setDraft] = useState<StudentRule[]>([])
  const [selectedCountry, setSelectedCountry] = useState('canada')
  const [dirty, setDirty] = useState(false)

  useEffect(() => {
    if (rules?.studentRules) {
      setDraft(rules.studentRules)
      setDirty(false)
    }
  }, [rules])

  const countries = [
    ...DEFAULT_COUNTRIES,
    ...Array.from(
      new Set(
        draft
          .map((r) => r.country)
          .filter((c) => !DEFAULT_COUNTRIES.find((d) => d.value === c))
      )
    ).map((c) => ({ value: c, label: c.charAt(0).toUpperCase() + c.slice(1), defaultRuleType: '' })),
  ]

  const countryRules = draft.filter((r) => r.country === selectedCountry)

  const saveMutation = useMutation({
    mutationFn: () =>
      saveIncentiveRules({
        spouseRules: rules?.spouseRules ?? [],
        visitorRules: rules?.visitorRules ?? [],
        studentRules: draft,
      }),
    onSuccess: () => {
      toast.success('Student rules saved')
      queryClient.invalidateQueries({ queryKey: ['incentive-rules'] })
      setDirty(false)
    },
    onError: () => toast.error('Failed to save rules'),
  })

  const addRule = () => {
    const defaultType = DEFAULT_COUNTRIES.find((c) => c.value === selectedCountry)?.defaultRuleType ?? 'Rule'
    setDraft((d) => [
      ...d,
      {
        id: crypto.randomUUID(),
        country: selectedCountry,
        ruleType: defaultType,
        incentiveAmount: 0,
      },
    ])
    setDirty(true)
  }

  const updateRule = (id: string, key: keyof StudentRule, value: string | number) => {
    setDraft((d) => d.map((r) => (r.id === id ? { ...r, [key]: value } : r)))
    setDirty(true)
  }

  const deleteRule = (id: string) => {
    setDraft((d) => d.filter((r) => r.id !== id))
    setDirty(true)
  }

  const discard = () => {
    if (rules?.studentRules) setDraft(rules.studentRules)
    setDirty(false)
  }

  return (
    <div className="p-4 space-y-4">
      <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg px-4 py-3 text-sm text-purple-700 dark:text-purple-300">
        Student Visa incentives are <strong>country-specific</strong>. Select a country to manage its rules.
      </div>

      {/* Country selector */}
      <div className="flex items-center gap-3">
        <span className="text-sm font-medium text-muted-foreground">Country:</span>
        <Select value={selectedCountry} onValueChange={setSelectedCountry}>
          <SelectTrigger className="w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {countries.map((c) => (
              <SelectItem key={c.value} value={c.value}>
                {c.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => {
            const name = prompt('Enter country name (e.g. Australia):')
            if (name?.trim()) {
              const val = name.trim().toLowerCase()
              setDraft((d) => [
                ...d,
                { id: crypto.randomUUID(), country: val, ruleType: 'Rule', incentiveAmount: 0 },
              ])
              setSelectedCountry(val)
              setDirty(true)
            }
          }}
        >
          <Plus className="w-4 h-4 mr-1" /> Add Country
        </Button>
      </div>

      {/* Rules for selected country */}
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground capitalize">
          {selectedCountry} — {countryRules.length} rule{countryRules.length !== 1 ? 's' : ''}
        </span>
        <Button type="button" size="sm" onClick={addRule}>
          <Plus className="w-4 h-4 mr-1" /> Add Rule
        </Button>
      </div>

      <div className="border border-border rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              <th className="px-4 py-2 text-left text-xs font-semibold text-muted-foreground">#</th>
              <th className="px-4 py-2 text-left text-xs font-semibold text-muted-foreground">Rule Label</th>
              <th className="px-4 py-2 text-left text-xs font-semibold text-muted-foreground">Incentive Amount (₹)</th>
              <th className="px-4 py-2 text-center text-xs font-semibold text-muted-foreground">Delete</th>
            </tr>
          </thead>
          <tbody>
            {countryRules.map((rule, i) => (
              <tr key={rule.id} className="border-b border-border/60">
                <td className="px-4 py-2 text-xs text-muted-foreground">{i + 1}</td>
                <td className="px-4 py-2">
                  <Input
                    value={rule.ruleType}
                    onChange={(e) => updateRule(rule.id, 'ruleType', e.target.value)}
                    placeholder="e.g. Tuition Deposit"
                    className="w-44"
                  />
                </td>
                <td className="px-4 py-2">
                  <Input
                    type="number"
                    min={0}
                    value={rule.incentiveAmount}
                    onChange={(e) => updateRule(rule.id, 'incentiveAmount', Number(e.target.value))}
                    placeholder="e.g. 500"
                    className="w-28"
                  />
                </td>
                <td className="px-4 py-2 text-center">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => deleteRule(rule.id)}
                    className="h-7 w-7 p-0 text-destructive hover:bg-destructive/10"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </td>
              </tr>
            ))}
            {countryRules.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-center text-muted-foreground text-sm">
                  No rules for {selectedCountry} yet. Click "Add Rule" to start.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {dirty && (
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={discard} disabled={saveMutation.isPending}>
            Discard Changes
          </Button>
          <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
            {saveMutation.isPending ? 'Saving...' : 'Save Student Rules'}
          </Button>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Verify build**

```bash
npm run build
```

- [ ] **Step 3: Commit**

```bash
git add client/src/components/incentives/StudentRulesTab.tsx
git commit -m "feat: add StudentRulesTab with country-based rule builder"
```

---

## Task 13: IncentiveRulesPage — Rule Config Page

**Files:**
- Create: `client/src/pages/IncentiveRulesPage.tsx`

- [ ] **Step 1: Create the page**

```tsx
// client/src/pages/IncentiveRulesPage.tsx
import { PageWrapper } from '@/layout/PageWrapper'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { SpouseRulesTab } from '@/components/incentives/SpouseRulesTab'
import { VisitorRulesTab } from '@/components/incentives/VisitorRulesTab'
import { StudentRulesTab } from '@/components/incentives/StudentRulesTab'

export default function IncentiveRulesPage() {
  return (
    <PageWrapper
      title="Incentive Rules"
      breadcrumbs={[
        { label: 'Dashboard', href: '/' },
        { label: 'Incentives', href: '/incentives' },
        { label: 'Rules' },
      ]}
    >
      <div className="p-4">
        <Tabs defaultValue="spouse">
          <TabsList className="mb-4">
            <TabsTrigger value="spouse">Spouse Rules</TabsTrigger>
            <TabsTrigger value="visitor">Visitor Rules</TabsTrigger>
            <TabsTrigger value="student">Student Rules</TabsTrigger>
          </TabsList>

          <TabsContent value="spouse">
            <SpouseRulesTab />
          </TabsContent>

          <TabsContent value="visitor">
            <VisitorRulesTab />
          </TabsContent>

          <TabsContent value="student">
            <StudentRulesTab />
          </TabsContent>
        </Tabs>
      </div>
    </PageWrapper>
  )
}
```

- [ ] **Step 2: Verify full build**

```bash
npm run build
```
Expected: clean build with no TypeScript errors across all new files.

- [ ] **Step 3: Start dev server and smoke-test both pages**

```bash
npm run dev
```

Check these manually:
- `/incentives` — banner, filters, table render; eligibility pill toggles Yes/No; Approve/Reject opens modal with correct client info
- `/incentives/rules` — three tabs render; adding a Spouse rule row shows input fields; Delete button removes a row; Save button is disabled while overlap error exists
- Sidebar — "Incentives" nav item is visible for manager/admin; absent for counsellor

- [ ] **Step 4: Commit**

```bash
git add client/src/pages/IncentiveRulesPage.tsx
git commit -m "feat: add IncentiveRulesPage with tabbed rule config for all visa types"
```
