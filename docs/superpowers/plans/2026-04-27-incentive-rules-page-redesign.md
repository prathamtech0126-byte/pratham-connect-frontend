# Incentive Rules Page Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign the IncentiveRulesPage 4-step wizard with a visual horizontal stepper, inline 2-month calendar, sale type card grid, feature-card rule type selector, and a formatted summary bar — without touching existing slab rule tab components.

**Architecture:** Each step component is updated in isolation. Two new components are introduced (`StepperHeader`, `RuleSummaryBar`). Two new API functions are added (`fetchSavedPeriods`, `savePeriodConfig`). `IncentiveRulesPage` wires everything together and manages the save-and-reset flow.

**Tech Stack:** React, TypeScript, TanStack Query, react-day-picker, lucide-react, shadcn/ui, date-fns, sonner (toasts)

> **Note:** No test runner is configured in this project (per CLAUDE.md). Each task ends with a visual verification step using the dev server instead of automated tests.

---

## File Map

| Action | File | Responsibility |
|---|---|---|
| Modify | `client/src/api/incentives.api.ts` | Add `SavedPeriod` type, `fetchSavedPeriods()`, `savePeriodConfig()` |
| Create | `client/src/components/incentives/StepperHeader.tsx` | Horizontal stepper with 4 numbered steps |
| Create | `client/src/components/incentives/RuleSummaryBar.tsx` | Summary bar for Step 4 showing date range + sale type badges + rule type pill |
| Modify | `client/src/components/incentives/PeriodSelector.tsx` | Inline 2-month DayPicker + saved periods list below |
| Modify | `client/src/components/incentives/SaleTypeSelector.tsx` | Card grid with Select All / Clear All |
| Modify | `client/src/components/incentives/RuleTypeSelector.tsx` | Large feature cards with icons and descriptions |
| Modify | `client/src/pages/IncentiveRulesPage.tsx` | Wire stepper, new components, save-and-reset flow |

---

## Task 1: API — Add SavedPeriod type and two new functions

**Files:**
- Modify: `client/src/api/incentives.api.ts`

- [ ] **Step 1: Add `SavedPeriod` interface and `fetchSavedPeriods` after the `SaleTypeItem` block (around line 75)**

Open `client/src/api/incentives.api.ts`. After the `fetchSaleTypes` function, add:

```typescript
export interface SavedPeriod {
  id: string
  startDate: string        // ISO date e.g. "2026-01-01"
  endDate: string          // ISO date e.g. "2026-01-31"
  saleTypeIds: (string | number)[]
  saleTypeNames: string[]  // resolved by server
  ruleType: 'slab' | 'budget'
}

export async function fetchSavedPeriods(): Promise<SavedPeriod[]> {
  const res = await api.get('/api/incentives/rules/periods')
  return res.data.data ?? []
}
```

- [ ] **Step 2: Add `savePeriodConfig` after `fetchSavedPeriods`**

```typescript
export async function savePeriodConfig(payload: {
  startDate: string
  endDate: string
  saleTypeIds: (string | number)[]
  ruleType: 'slab' | 'budget'
}): Promise<void> {
  await api.post('/api/incentives/rules/period-config', payload)
}
```

> **Note:** The endpoint `/api/incentives/rules/period-config` is a placeholder — confirm the exact path and method (POST vs PUT) with the backend team before running Step 4 of Task 7.

- [ ] **Step 3: Commit**

```bash
git add client/src/api/incentives.api.ts
git commit -m "feat: add SavedPeriod type, fetchSavedPeriods, savePeriodConfig to incentives API"
```

---

## Task 2: Create StepperHeader component

**Files:**
- Create: `client/src/components/incentives/StepperHeader.tsx`

- [ ] **Step 1: Create the file with this content**

```tsx
import { Check } from 'lucide-react'
import { cn } from '@/lib/utils'

const STEPS = [
  { n: 1, label: 'Period' },
  { n: 2, label: 'Sale Types' },
  { n: 3, label: 'Rule Type' },
  { n: 4, label: 'Configure' },
]

interface Props {
  currentStep: number
  onStepClick: (step: number) => void
}

export function StepperHeader({ currentStep, onStepClick }: Props) {
  return (
    <div className="flex items-start w-full mb-8">
      {STEPS.map((step, idx) => {
        const isCompleted = step.n < currentStep
        const isActive = step.n === currentStep
        const isFuture = step.n > currentStep

        return (
          <div key={step.n} className="flex items-center flex-1 last:flex-none">
            <div className="flex flex-col items-center">
              <button
                onClick={() => isCompleted && onStepClick(step.n)}
                disabled={!isCompleted}
                className={cn(
                  'w-9 h-9 rounded-full flex items-center justify-center text-sm font-semibold border-2 transition-colors',
                  isCompleted && 'bg-primary border-primary text-primary-foreground cursor-pointer hover:opacity-80',
                  isActive && 'bg-primary border-primary text-primary-foreground cursor-default',
                  isFuture && 'bg-background border-muted-foreground/30 text-muted-foreground cursor-default',
                )}
              >
                {isCompleted ? <Check className="w-4 h-4" /> : step.n}
              </button>
              <span
                className={cn(
                  'mt-1.5 text-xs font-medium whitespace-nowrap',
                  isCompleted || isActive ? 'text-primary' : 'text-muted-foreground',
                )}
              >
                {step.label}
              </span>
            </div>

            {idx < STEPS.length - 1 && (
              <div
                className={cn(
                  'h-0.5 flex-1 mx-2 mb-5 transition-colors',
                  isCompleted ? 'bg-primary' : 'bg-muted-foreground/20',
                )}
              />
            )}
          </div>
        )
      })}
    </div>
  )
}
```

- [ ] **Step 2: Verify the component renders (run dev server)**

```bash
npm run dev
```

Open `localhost:5173/incentives/rules` in the browser. The stepper should not appear yet (Task 7 wires it in). Just verify there are no TypeScript compile errors in the Vite output.

- [ ] **Step 3: Commit**

```bash
git add client/src/components/incentives/StepperHeader.tsx
git commit -m "feat: add StepperHeader component with 4 connected steps"
```

---

## Task 3: Create RuleSummaryBar component

**Files:**
- Create: `client/src/components/incentives/RuleSummaryBar.tsx`

- [ ] **Step 1: Create the file with this content**

```tsx
import { format } from 'date-fns'
import { DateRange } from 'react-day-picker'
import { cn } from '@/lib/utils'
import { type SaleTypeItem } from '@/api/incentives.api'

interface Props {
  period: DateRange
  saleTypes: (string | number)[]
  saleTypesData: SaleTypeItem[]
  ruleType: 'slab' | 'budget'
}

export function RuleSummaryBar({ period, saleTypes, saleTypesData, ruleType }: Props) {
  const resolvedNames = saleTypes
    .map((id) => saleTypesData.find((d) => d.id === id)?.name)
    .filter((n): n is string => Boolean(n))

  const dateRange =
    period.from && period.to
      ? `${format(period.from, 'MMM d, yyyy')} – ${format(period.to, 'MMM d, yyyy')}`
      : ''

  return (
    <div className="border border-border rounded-lg p-4 bg-muted/30 flex flex-wrap items-center gap-3">
      <span className="font-semibold text-sm shrink-0">{dateRange}</span>

      <div className="flex flex-wrap gap-1.5">
        {resolvedNames.map((name) => (
          <span
            key={name}
            className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium"
          >
            {name}
          </span>
        ))}
      </div>

      <span
        className={cn(
          'text-xs px-2.5 py-0.5 rounded-full font-semibold ml-auto shrink-0',
          ruleType === 'slab'
            ? 'bg-orange-100 text-orange-700'
            : 'bg-green-100 text-green-700',
        )}
      >
        {ruleType === 'slab' ? 'Slab' : 'Budget'}
      </span>
    </div>
  )
}
```

- [ ] **Step 2: Check for TypeScript errors**

```bash
npm run build 2>&1 | head -30
```

Expected: no errors mentioning `RuleSummaryBar.tsx`.

- [ ] **Step 3: Commit**

```bash
git add client/src/components/incentives/RuleSummaryBar.tsx
git commit -m "feat: add RuleSummaryBar with formatted date range, name badges, and rule type pill"
```

---

## Task 4: Redesign PeriodSelector — inline calendar + saved periods

**Files:**
- Modify: `client/src/components/incentives/PeriodSelector.tsx`

- [ ] **Step 1: Replace the entire file content**

```tsx
import { DateRange, DayPicker } from 'react-day-picker'
import { useQuery } from '@tanstack/react-query'
import { format } from 'date-fns'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { fetchSavedPeriods, type SavedPeriod } from '@/api/incentives.api'
import 'react-day-picker/dist/style.css'

interface Props {
  value: DateRange | undefined
  onChange: (range: DateRange | undefined) => void
  onNext: () => void
}

export function PeriodSelector({ value, onChange, onNext }: Props) {
  const { data: savedPeriods = [], isLoading } = useQuery({
    queryKey: ['saved-periods'],
    queryFn: fetchSavedPeriods,
  })

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-base font-semibold mb-4">Select Period</h2>
        <div className="border border-border rounded-xl p-4 inline-block bg-background">
          <DayPicker
            mode="range"
            selected={value}
            onSelect={onChange}
            numberOfMonths={2}
          />
        </div>
      </div>

      <Button disabled={!value?.from || !value?.to} onClick={onNext}>
        Next
      </Button>

      <div className="space-y-3 pt-4 border-t border-border">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold">Saved Periods</h3>
          {!isLoading && (
            <span className="text-xs bg-muted px-2 py-0.5 rounded-full font-medium text-muted-foreground">
              {savedPeriods.length}
            </span>
          )}
        </div>

        {isLoading && (
          <div className="space-y-2">
            {[1, 2].map((i) => (
              <div key={i} className="h-14 rounded-lg bg-muted animate-pulse" />
            ))}
          </div>
        )}

        {!isLoading && savedPeriods.length === 0 && (
          <p className="text-sm text-muted-foreground">No saved periods yet.</p>
        )}

        {!isLoading &&
          savedPeriods.map((p) => <SavedPeriodCard key={p.id} period={p} />)}
      </div>
    </div>
  )
}

function SavedPeriodCard({ period }: { period: SavedPeriod }) {
  return (
    <div className="border border-border rounded-lg p-3 flex flex-wrap items-center gap-2 bg-background">
      <span className="text-sm font-medium shrink-0">
        {format(new Date(period.startDate), 'MMM d, yyyy')} –{' '}
        {format(new Date(period.endDate), 'MMM d, yyyy')}
      </span>

      <div className="flex flex-wrap gap-1">
        {period.saleTypeNames.map((name) => (
          <span
            key={name}
            className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full"
          >
            {name}
          </span>
        ))}
      </div>

      <span
        className={cn(
          'text-xs px-2 py-0.5 rounded-full font-medium ml-auto shrink-0',
          period.ruleType === 'slab'
            ? 'bg-orange-100 text-orange-700'
            : 'bg-green-100 text-green-700',
        )}
      >
        {period.ruleType === 'slab' ? 'Slab' : 'Budget'}
      </span>
    </div>
  )
}
```

- [ ] **Step 2: Verify visually**

Run `npm run dev`, open `localhost:5173/incentives/rules`. Step 1 should show an inline 2-month calendar (no popover button). Below it should show "Saved Periods" with a loading state then either cards or "No saved periods yet."

- [ ] **Step 3: Commit**

```bash
git add client/src/components/incentives/PeriodSelector.tsx
git commit -m "feat: redesign PeriodSelector with inline 2-month calendar and saved periods list"
```

---

## Task 5: Redesign SaleTypeSelector — card grid

**Files:**
- Modify: `client/src/components/incentives/SaleTypeSelector.tsx`

- [ ] **Step 1: Replace the entire file content**

```tsx
import { Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { type SaleTypeItem } from '@/api/incentives.api'

interface Props {
  data: SaleTypeItem[]
  selected: (string | number)[]
  onChange: (selected: (string | number)[]) => void
  onNext: () => void
  onBack: () => void
}

export function SaleTypeSelector({ data, selected, onChange, onNext, onBack }: Props) {
  const toggle = (id: string | number) => {
    if (selected.includes(id)) {
      onChange(selected.filter((x) => x !== id))
    } else {
      onChange([...selected, id])
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold flex items-center gap-2">
          Select Sale Types
          {selected.length > 0 && (
            <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full font-normal">
              {selected.length} selected
            </span>
          )}
        </h2>
        <div className="flex gap-3 text-xs text-primary">
          <button
            onClick={() => onChange(data.map((d) => d.id))}
            className="hover:underline"
          >
            Select All
          </button>
          <button onClick={() => onChange([])} className="hover:underline">
            Clear All
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {data.map((item) => {
          const isSelected = selected.includes(item.id)
          return (
            <button
              key={item.id}
              onClick={() => toggle(item.id)}
              className={cn(
                'relative border-2 rounded-lg p-3 text-left transition-all hover:shadow-sm',
                isSelected
                  ? 'border-primary bg-primary/5'
                  : 'border-border bg-background hover:border-muted-foreground/40',
              )}
            >
              <div
                className={cn(
                  'absolute top-2 right-2 w-4 h-4 rounded border-2 flex items-center justify-center transition-colors',
                  isSelected
                    ? 'border-primary bg-primary'
                    : 'border-muted-foreground/40 bg-background',
                )}
              >
                {isSelected && <Check className="w-2.5 h-2.5 text-white" />}
              </div>
              <span className="text-sm font-medium pr-6 leading-snug">{item.name}</span>
            </button>
          )
        })}
      </div>

      <div className="flex gap-3 pt-2">
        <Button variant="outline" onClick={onBack}>
          Back
        </Button>
        <Button disabled={selected.length === 0} onClick={onNext}>
          Next
        </Button>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Verify visually**

Click Next on Step 1. Step 2 should show a card grid of sale types with "Select All / Clear All" links and a selected count badge. Clicking a card should highlight it with a blue border and checked checkbox.

- [ ] **Step 3: Commit**

```bash
git add client/src/components/incentives/SaleTypeSelector.tsx
git commit -m "feat: redesign SaleTypeSelector with card grid and Select All / Clear All"
```

---

## Task 6: Redesign RuleTypeSelector — large feature cards

**Files:**
- Modify: `client/src/components/incentives/RuleTypeSelector.tsx`

- [ ] **Step 1: Replace the entire file content**

```tsx
import { Layers, Wallet, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

const RULE_TYPES = [
  {
    value: 'slab' as const,
    Icon: Layers,
    title: 'Slab Wise',
    description:
      'Define incentive rules by count ranges — different amounts for different slabs',
  },
  {
    value: 'budget' as const,
    Icon: Wallet,
    title: 'Budget Wise',
    description:
      'Allocate a fixed budget amount as incentive for the selected period',
  },
]

interface Props {
  value: 'slab' | 'budget' | null
  onChange: (v: 'slab' | 'budget') => void
  onNext: () => void
  onBack: () => void
}

export function RuleTypeSelector({ value, onChange, onNext, onBack }: Props) {
  return (
    <div className="space-y-4">
      <h2 className="text-base font-semibold">Select Rule Type</h2>

      <div className="grid grid-cols-2 gap-4">
        {RULE_TYPES.map(({ value: v, Icon, title, description }) => {
          const isSelected = value === v
          return (
            <button
              key={v}
              onClick={() => onChange(v)}
              className={cn(
                'relative border-2 rounded-xl p-6 text-left transition-all hover:shadow-md',
                isSelected
                  ? 'border-primary bg-primary/5'
                  : 'border-border bg-background hover:border-muted-foreground/40',
              )}
            >
              {isSelected && (
                <div className="absolute top-3 right-3 w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                  <Check className="w-3 h-3 text-white" />
                </div>
              )}
              <Icon
                className={cn(
                  'w-8 h-8 mb-3',
                  isSelected ? 'text-primary' : 'text-muted-foreground',
                )}
              />
              <p className="font-semibold text-sm mb-1">{title}</p>
              <p className="text-xs text-muted-foreground leading-relaxed">
                {description}
              </p>
            </button>
          )
        })}
      </div>

      <div className="flex gap-3 pt-2">
        <Button variant="outline" onClick={onBack}>
          Back
        </Button>
        <Button disabled={!value} onClick={onNext}>
          Next
        </Button>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Verify visually**

Click Next through Steps 1 and 2. Step 3 should show two large cards (Slab Wise with a Layers icon, Budget Wise with a Wallet icon). Clicking a card should highlight it with a blue border and a checkmark badge in the top-right corner.

- [ ] **Step 3: Commit**

```bash
git add client/src/components/incentives/RuleTypeSelector.tsx
git commit -m "feat: redesign RuleTypeSelector with large Slab Wise and Budget Wise feature cards"
```

---

## Task 7: Wire everything in IncentiveRulesPage

**Files:**
- Modify: `client/src/pages/IncentiveRulesPage.tsx`

- [ ] **Step 1: Replace the entire file content**

```tsx
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { DateRange } from 'react-day-picker'
import { PageWrapper } from '@/layout/PageWrapper'
import {
  fetchIncentiveRules,
  fetchSaleTypes,
  savePeriodConfig,
} from '@/api/incentives.api'

import { StepperHeader } from '@/components/incentives/StepperHeader'
import { PeriodSelector } from '@/components/incentives/PeriodSelector'
import { SaleTypeSelector } from '@/components/incentives/SaleTypeSelector'
import { RuleTypeSelector } from '@/components/incentives/RuleTypeSelector'
import { RuleSummaryBar } from '@/components/incentives/RuleSummaryBar'

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { SpouseRulesTab } from '@/components/incentives/SpouseRulesTab'
import { VisitorRulesTab } from '@/components/incentives/VisitorRulesTab'
import { StudentRulesTab } from '@/components/incentives/StudentRulesTab'
import { UkStudentRulesTab } from '@/components/incentives/UkStudentRulesTab'
import { AllFinanceRulesTab } from '@/components/incentives/AllFinanceRulesTab'
import { Button } from '@/components/ui/button'

export default function IncentiveRulesPage() {
  const queryClient = useQueryClient()

  const [step, setStep] = useState(1)
  const [period, setPeriod] = useState<DateRange | undefined>(undefined)
  const [saleTypes, setSaleTypes] = useState<(string | number)[]>([])
  const [ruleType, setRuleType] = useState<'slab' | 'budget' | null>(null)

  const { data: rules } = useQuery({
    queryKey: ['incentive-rules'],
    queryFn: fetchIncentiveRules,
  })

  const { data: saleTypesData = [] } = useQuery({
    queryKey: ['sale-types'],
    queryFn: fetchSaleTypes,
  })

  const saveMutation = useMutation({
    mutationFn: () =>
      savePeriodConfig({
        startDate: period!.from!.toISOString().slice(0, 10),
        endDate: period!.to!.toISOString().slice(0, 10),
        saleTypeIds: saleTypes,
        ruleType: ruleType!,
      }),
    onSuccess: () => {
      toast.success('Period saved')
      queryClient.invalidateQueries({ queryKey: ['saved-periods'] })
      setStep(1)
      setPeriod(undefined)
      setSaleTypes([])
      setRuleType(null)
    },
    onError: () => toast.error('Failed to save period'),
  })

  return (
    <PageWrapper title="Incentive Rules">
      <div className="p-6 max-w-5xl">
        <StepperHeader currentStep={step} onStepClick={setStep} />

        {step === 1 && (
          <PeriodSelector
            value={period}
            onChange={setPeriod}
            onNext={() => setStep(2)}
          />
        )}

        {step === 2 && (
          <SaleTypeSelector
            data={saleTypesData}
            selected={saleTypes}
            onChange={setSaleTypes}
            onNext={() => setStep(3)}
            onBack={() => setStep(1)}
          />
        )}

        {step === 3 && (
          <RuleTypeSelector
            value={ruleType}
            onChange={setRuleType}
            onNext={() => setStep(4)}
            onBack={() => setStep(2)}
          />
        )}

        {step === 4 && period && ruleType && rules && (
          <div className="space-y-6">
            <RuleSummaryBar
              period={period}
              saleTypes={saleTypes}
              saleTypesData={saleTypesData}
              ruleType={ruleType}
            />

            {ruleType === 'slab' && (
              <Tabs defaultValue="spouse">
                <TabsList className="mb-4">
                  <TabsTrigger value="spouse">Spouse</TabsTrigger>
                  <TabsTrigger value="visitor">Visitor</TabsTrigger>
                  <TabsTrigger value="canada-student">Canada Student</TabsTrigger>
                  <TabsTrigger value="uk-student">Student</TabsTrigger>
                  <TabsTrigger value="all-finance">All Finance</TabsTrigger>
                </TabsList>
                <TabsContent value="spouse">
                  <SpouseRulesTab rules={rules} />
                </TabsContent>
                <TabsContent value="visitor">
                  <VisitorRulesTab rules={rules} />
                </TabsContent>
                <TabsContent value="canada-student">
                  <StudentRulesTab rules={rules} />
                </TabsContent>
                <TabsContent value="uk-student">
                  <UkStudentRulesTab rules={rules} />
                </TabsContent>
                <TabsContent value="all-finance">
                  <AllFinanceRulesTab rules={rules} />
                </TabsContent>
              </Tabs>
            )}

            {ruleType === 'budget' && (
              <div className="border border-border rounded-lg p-8 text-center text-muted-foreground text-sm">
                Budget rule configuration coming soon.
              </div>
            )}

            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setStep(3)}>
                Back
              </Button>
              <Button
                onClick={() => saveMutation.mutate()}
                disabled={saveMutation.isPending}
              >
                {saveMutation.isPending ? 'Saving...' : '+ Add Another Period'}
              </Button>
            </div>
          </div>
        )}
      </div>
    </PageWrapper>
  )
}
```

- [ ] **Step 2: Run full visual check**

```bash
npm run dev
```

Walk through the full flow:

1. Open `localhost:5173/incentives/rules`
2. Step 1: horizontal stepper shows at top with "Period" highlighted; inline 2-month calendar visible; "Saved Periods" section below
3. Select a date range → Next button enables → click Next
4. Step 2: stepper shows Step 1 completed (checkmark), Step 2 active; card grid of sale types loads; Select All / Clear All work; selected count updates
5. Select ≥ 1 type → click Next
6. Step 3: two large feature cards; clicking one highlights it with checkmark badge
7. Select a rule type → click Next
8. Step 4: summary bar shows formatted date range + sale type name badges + Slab/Budget pill; slab tabs render correctly
9. Click "Back" → returns to Step 3; clicking completed Step 1 circle in stepper → returns to Step 1
10. Click "+ Add Another Period" → loading state on button → on success, resets to Step 1 and saved periods list updates

- [ ] **Step 3: Check TypeScript via build**

```bash
npm run build 2>&1 | head -40
```

Expected: build succeeds with no TypeScript errors.

- [ ] **Step 4: Commit**

```bash
git add client/src/pages/IncentiveRulesPage.tsx
git commit -m "feat: wire IncentiveRulesPage with stepper, RuleSummaryBar, and save-and-reset flow"
```

---

## Self-Review Checklist

- [x] **Horizontal stepper** with 4 numbered circles, completed checkmarks, active highlight, future muted — Task 2
- [x] **Completed steps clickable** in stepper, future steps disabled — Task 2 (StepperHeader `disabled={!isCompleted}`)
- [x] **Inline 2-month calendar** (no popover) — Task 4 (DayPicker directly rendered)
- [x] **Saved periods below calendar** with loading skeleton, empty state, date range + name badges + rule type pill — Task 4
- [x] **Sale type card grid** 4-per-row with checkbox, Select All / Clear All, selected count — Task 5
- [x] **Rule type feature cards** with Layers/Wallet icons and descriptions — Task 6
- [x] **Summary bar** with formatted date, sale type names (not IDs), rule type pill — Task 3 + Task 7
- [x] **Add Another Period** calls save API, shows loading, resets to Step 1, invalidates saved-periods cache — Task 1 + Task 7
- [x] **Existing slab tabs unchanged** — Task 7 imports them as-is
- [x] **Budget placeholder** — Task 7
- [x] **`savePeriodConfig` endpoint note** — Task 1 (confirm with backend team)
