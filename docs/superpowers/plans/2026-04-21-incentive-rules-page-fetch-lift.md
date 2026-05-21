# Incentive Rules Page Fetch Lift — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move `useQuery(['incentive-rules'])` from each tab component into `IncentiveRulesPage`, passing `rules` as a prop to each tab.

**Architecture:** `IncentiveRulesPage` owns the single `useQuery` call and handles loading/error states. Each tab receives `rules: IncentiveRulesPayload` as a required prop and removes its own `useQuery`. Tab mutations and draft state are unchanged.

**Tech Stack:** React, @tanstack/react-query, TypeScript, shadcn/ui

---

## File Map

| File | Change |
|------|--------|
| `client/src/pages/IncentiveRulesPage.tsx` | Add `useQuery`, loading/error UI, pass `rules` prop |
| `client/src/components/incentives/SpouseRulesTab.tsx` | Remove `useQuery`, accept `rules` prop |
| `client/src/components/incentives/VisitorRulesTab.tsx` | Remove `useQuery`, accept `rules` prop |
| `client/src/components/incentives/StudentRulesTab.tsx` | Remove `useQuery`, accept `rules` prop |
| `client/src/components/incentives/UkStudentRulesTab.tsx` | Remove `useQuery`, accept `rules` prop |
| `client/src/components/incentives/AllFinanceRulesTab.tsx` | Remove `useQuery`, accept `rules` prop |

---

### Task 1: Update SpouseRulesTab to accept rules as prop

**Files:**
- Modify: `client/src/components/incentives/SpouseRulesTab.tsx`

- [ ] **Step 1: Replace the component signature and remove useQuery**

Replace the imports and component body. Remove the `useQuery` import and call. Add a `rules` prop typed as `IncentiveRulesPayload`.

The full updated file:

```tsx
import { useState, useEffect } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { SalaryRangeSection, validateRanges, type SalaryRangeDraft } from './SalaryRangeSection'
import {
  saveIncentiveRules,
  type SalaryRangeRule,
  type IncentiveRulesPayload,
} from '@/api/incentives.api'

// ─── Mappers ─────────────────────────────────────────────────────────────────

function toDisplay(rule: SalaryRangeRule): SalaryRangeDraft {
  return {
    id: rule.id,
    minCount: String(rule.minCount),
    maxCount: rule.maxCount === -1 ? '' : String(rule.maxCount),
    openEnded: rule.maxCount === -1,
    incentiveAmount: String(rule.incentiveAmount),
  }
}

function toDomain(draft: SalaryRangeDraft): SalaryRangeRule {
  return {
    id: draft.id,
    minCount: Number(draft.minCount) || 0,
    maxCount: draft.openEnded ? -1 : Number(draft.maxCount) || 0,
    incentiveAmount: Number(draft.incentiveAmount) || 0,
  }
}

// ─── Component ────────────────────────────────────────────────────────────────

interface Props {
  rules: IncentiveRulesPayload
}

export function SpouseRulesTab({ rules }: Props) {
  const queryClient = useQueryClient()

  const [draft, setDraft] = useState<SalaryRangeDraft[]>([])
  const [dirty, setDirty] = useState(false)

  useEffect(() => {
    setDraft((rules.coreSpouseRules ?? []).map(toDisplay))
    setDirty(false)
  }, [rules])

  const error = validateRanges(draft)

  const saveMutation = useMutation({
    mutationFn: () =>
      saveIncentiveRules({
        coreSpouseRules: draft.map(toDomain),
        financeSpouseRules: rules.financeSpouseRules ?? [],
        coreVisitorRules: rules.coreVisitorRules ?? [],
        visitorProductRules: rules.visitorProductRules ?? [],
        canadaStudentRules: rules.canadaStudentRules ?? [],
        studentRules: rules.studentRules ?? [],
      }),
    onSuccess: () => {
      toast.success('Spouse rules saved')
      queryClient.invalidateQueries({ queryKey: ['incentive-rules'] })
      setDirty(false)
    },
    onError: () => toast.error('Failed to save rules'),
  })

  const discard = () => {
    setDraft((rules.coreSpouseRules ?? []).map(toDisplay))
    setDirty(false)
  }

  return (
    <div className="p-4 space-y-4">
      <SalaryRangeSection
        title="Core Spouse"
        draft={draft}
        onChange={updated => {
          setDraft(updated)
          setDirty(true)
        }}
      />

      {dirty && (
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={discard} disabled={saveMutation.isPending}>
            Discard Changes
          </Button>
          <Button
            onClick={() => saveMutation.mutate()}
            disabled={!!error || saveMutation.isPending}
          >
            {saveMutation.isPending ? 'Saving...' : 'Save Spouse Rules'}
          </Button>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add client/src/components/incentives/SpouseRulesTab.tsx
git commit -m "refactor: SpouseRulesTab accepts rules prop, removes useQuery"
```

---

### Task 2: Update VisitorRulesTab to accept rules as prop

**Files:**
- Modify: `client/src/components/incentives/VisitorRulesTab.tsx`

- [ ] **Step 1: Replace the component**

```tsx
import { useState, useEffect } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { CategorySection, validateCategories, type CategoryDraft } from './CategorySection'
import {
  saveIncentiveRules,
  type CategoryRule,
  type IncentiveRulesPayload,
} from '@/api/incentives.api'

// ─── Mappers ─────────────────────────────────────────────────────────────────

function toDisplay(rule: CategoryRule): CategoryDraft {
  return {
    id: rule.id,
    label: rule.label,
    incentiveAmount: String(rule.incentiveAmount),
  }
}

function toDomain(draft: CategoryDraft): CategoryRule {
  return {
    id: draft.id,
    label: draft.label,
    incentiveAmount: Number(draft.incentiveAmount) || 0,
  }
}

// ─── Component ────────────────────────────────────────────────────────────────

interface Props {
  rules: IncentiveRulesPayload
}

export function VisitorRulesTab({ rules }: Props) {
  const queryClient = useQueryClient()

  const [coreDraft, setCoreDraft] = useState<CategoryDraft[]>([])
  const [productDraft, setProductDraft] = useState<CategoryDraft[]>([])
  const [dirty, setDirty] = useState(false)

  useEffect(() => {
    setCoreDraft((rules.coreVisitorRules ?? []).map(toDisplay))
    setProductDraft((rules.visitorProductRules ?? []).map(toDisplay))
    setDirty(false)
  }, [rules])

  const coreError = validateCategories(coreDraft)
  const productError = validateCategories(productDraft)
  const hasError = !!coreError || !!productError

  const saveMutation = useMutation({
    mutationFn: () =>
      saveIncentiveRules({
        coreSpouseRules: rules.coreSpouseRules ?? [],
        financeSpouseRules: rules.financeSpouseRules ?? [],
        coreVisitorRules: coreDraft.map(toDomain),
        visitorProductRules: productDraft.map(toDomain),
        canadaStudentRules: rules.canadaStudentRules ?? [],
        studentRules: rules.studentRules ?? [],
      }),
    onSuccess: () => {
      toast.success('Visitor rules saved')
      queryClient.invalidateQueries({ queryKey: ['incentive-rules'] })
      setDirty(false)
    },
    onError: () => toast.error('Failed to save rules'),
  })

  const handleCoreChange = (updated: CategoryDraft[]) => {
    setCoreDraft(updated)
    setDirty(true)
  }

  const handleProductChange = (updated: CategoryDraft[]) => {
    setProductDraft(updated)
    setDirty(true)
  }

  const discard = () => {
    setCoreDraft((rules.coreVisitorRules ?? []).map(toDisplay))
    setProductDraft((rules.visitorProductRules ?? []).map(toDisplay))
    setDirty(false)
  }

  return (
    <div className="p-4 space-y-4">
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <CategorySection
          title="Core Visitor"
          draft={coreDraft}
          onChange={handleCoreChange}
        />
        <CategorySection
          title="Visitor Product Core"
          draft={productDraft}
          onChange={handleProductChange}
        />
      </div>

      {dirty && (
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={discard} disabled={saveMutation.isPending}>
            Discard Changes
          </Button>
          <Button
            onClick={() => saveMutation.mutate()}
            disabled={hasError || saveMutation.isPending}
          >
            {saveMutation.isPending ? 'Saving...' : 'Save Visitor Rules'}
          </Button>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add client/src/components/incentives/VisitorRulesTab.tsx
git commit -m "refactor: VisitorRulesTab accepts rules prop, removes useQuery"
```

---

### Task 3: Update StudentRulesTab to accept rules as prop

**Files:**
- Modify: `client/src/components/incentives/StudentRulesTab.tsx`

- [ ] **Step 1: Replace the component**

```tsx
import { useState, useEffect } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { SalaryRangeSection, validateRanges, type SalaryRangeDraft } from './SalaryRangeSection'
import {
  saveIncentiveRules,
  type SalaryRangeRule,
  type IncentiveRulesPayload,
} from '@/api/incentives.api'

// ─── Mappers ─────────────────────────────────────────────────────────────────

function toDisplay(rule: SalaryRangeRule): SalaryRangeDraft {
  return {
    id: rule.id,
    minCount: String(rule.minCount),
    maxCount: rule.maxCount === -1 ? '' : String(rule.maxCount),
    openEnded: rule.maxCount === -1,
    incentiveAmount: String(rule.incentiveAmount),
  }
}

function toDomain(draft: SalaryRangeDraft): SalaryRangeRule {
  return {
    id: draft.id,
    minCount: Number(draft.minCount) || 0,
    maxCount: draft.openEnded ? -1 : Number(draft.maxCount) || 0,
    incentiveAmount: Number(draft.incentiveAmount) || 0,
  }
}

// ─── Component ────────────────────────────────────────────────────────────────

interface Props {
  rules: IncentiveRulesPayload
}

export function StudentRulesTab({ rules }: Props) {
  const queryClient = useQueryClient()

  const [draft, setDraft] = useState<SalaryRangeDraft[]>([])
  const [dirty, setDirty] = useState(false)

  useEffect(() => {
    setDraft((rules.canadaStudentRules ?? []).map(toDisplay))
    setDirty(false)
  }, [rules])

  const error = validateRanges(draft)

  const saveMutation = useMutation({
    mutationFn: () =>
      saveIncentiveRules({
        coreSpouseRules: rules.coreSpouseRules ?? [],
        financeSpouseRules: rules.financeSpouseRules ?? [],
        coreVisitorRules: rules.coreVisitorRules ?? [],
        visitorProductRules: rules.visitorProductRules ?? [],
        canadaStudentRules: draft.map(toDomain),
        studentRules: rules.studentRules ?? [],
      }),
    onSuccess: () => {
      toast.success('Canada Student rules saved')
      queryClient.invalidateQueries({ queryKey: ['incentive-rules'] })
      setDirty(false)
    },
    onError: () => toast.error('Failed to save rules'),
  })

  const discard = () => {
    setDraft((rules.canadaStudentRules ?? []).map(toDisplay))
    setDirty(false)
  }

  return (
    <div className="p-4 space-y-4">
      <SalaryRangeSection
        title="All Students on TD Counsellor"
        draft={draft}
        onChange={updated => {
          setDraft(updated)
          setDirty(true)
        }}
      />

      {dirty && (
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={discard} disabled={saveMutation.isPending}>
            Discard Changes
          </Button>
          <Button
            onClick={() => saveMutation.mutate()}
            disabled={!!error || saveMutation.isPending}
          >
            {saveMutation.isPending ? 'Saving...' : 'Save Canada Student Rules'}
          </Button>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add client/src/components/incentives/StudentRulesTab.tsx
git commit -m "refactor: StudentRulesTab accepts rules prop, removes useQuery"
```

---

### Task 4: Update UkStudentRulesTab to accept rules as prop

**Files:**
- Modify: `client/src/components/incentives/UkStudentRulesTab.tsx`

- [ ] **Step 1: Replace the component**

```tsx
import { useState, useEffect } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { SalaryRangeSection, validateRanges, type SalaryRangeDraft } from './SalaryRangeSection'
import {
  saveIncentiveRules,
  type SalaryRangeRule,
  type IncentiveRulesPayload,
} from '@/api/incentives.api'

// ─── Mappers ─────────────────────────────────────────────────────────────────

function toDisplay(rule: SalaryRangeRule): SalaryRangeDraft {
  return {
    id: rule.id,
    minCount: String(rule.minCount),
    maxCount: rule.maxCount === -1 ? '' : String(rule.maxCount),
    openEnded: rule.maxCount === -1,
    incentiveAmount: String(rule.incentiveAmount),
  }
}

function toDomain(draft: SalaryRangeDraft): SalaryRangeRule {
  return {
    id: draft.id,
    minCount: Number(draft.minCount) || 0,
    maxCount: draft.openEnded ? -1 : Number(draft.maxCount) || 0,
    incentiveAmount: Number(draft.incentiveAmount) || 0,
  }
}

// ─── Component ────────────────────────────────────────────────────────────────

interface Props {
  rules: IncentiveRulesPayload
}

export function UkStudentRulesTab({ rules }: Props) {
  const queryClient = useQueryClient()

  const [draft, setDraft] = useState<SalaryRangeDraft[]>([])
  const [dirty, setDirty] = useState(false)

  useEffect(() => {
    setDraft((rules.studentRules ?? []).map(toDisplay))
    setDirty(false)
  }, [rules])

  const error = validateRanges(draft)

  const saveMutation = useMutation({
    mutationFn: () =>
      saveIncentiveRules({
        coreSpouseRules: rules.coreSpouseRules ?? [],
        financeSpouseRules: rules.financeSpouseRules ?? [],
        coreVisitorRules: rules.coreVisitorRules ?? [],
        visitorProductRules: rules.visitorProductRules ?? [],
        canadaStudentRules: rules.canadaStudentRules ?? [],
        studentRules: draft.map(toDomain),
      }),
    onSuccess: () => {
      toast.success('Student rules saved')
      queryClient.invalidateQueries({ queryKey: ['incentive-rules'] })
      setDirty(false)
    },
    onError: () => toast.error('Failed to save rules'),
  })

  const discard = () => {
    setDraft((rules.studentRules ?? []).map(toDisplay))
    setDirty(false)
  }

  return (
    <div className="p-4 space-y-4">
      <SalaryRangeSection
        title="Team Achieves 1 to 19 Visa"
        draft={draft}
        onChange={updated => {
          setDraft(updated)
          setDirty(true)
        }}
      />

      {dirty && (
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={discard} disabled={saveMutation.isPending}>
            Discard Changes
          </Button>
          <Button
            onClick={() => saveMutation.mutate()}
            disabled={!!error || saveMutation.isPending}
          >
            {saveMutation.isPending ? 'Saving...' : 'Save Student Rules'}
          </Button>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add client/src/components/incentives/UkStudentRulesTab.tsx
git commit -m "refactor: UkStudentRulesTab accepts rules prop, removes useQuery"
```

---

### Task 5: Update AllFinanceRulesTab to accept rules as prop

**Files:**
- Modify: `client/src/components/incentives/AllFinanceRulesTab.tsx`

- [ ] **Step 1: Replace the component**

```tsx
import { useState, useEffect } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { SalaryRangeSection, validateRanges, type SalaryRangeDraft } from './SalaryRangeSection'
import {
  saveIncentiveRules,
  type SalaryRangeRule,
  type IncentiveRulesPayload,
} from '@/api/incentives.api'

// ─── Mappers ─────────────────────────────────────────────────────────────────

function toDisplay(rule: SalaryRangeRule): SalaryRangeDraft {
  return {
    id: rule.id,
    minCount: String(rule.minCount),
    maxCount: rule.maxCount === -1 ? '' : String(rule.maxCount),
    openEnded: rule.maxCount === -1,
    incentiveAmount: String(rule.incentiveAmount),
  }
}

function toDomain(draft: SalaryRangeDraft): SalaryRangeRule {
  return {
    id: draft.id,
    minCount: Number(draft.minCount) || 0,
    maxCount: draft.openEnded ? -1 : Number(draft.maxCount) || 0,
    incentiveAmount: Number(draft.incentiveAmount) || 0,
  }
}

// ─── Component ────────────────────────────────────────────────────────────────

interface Props {
  rules: IncentiveRulesPayload
}

export function AllFinanceRulesTab({ rules }: Props) {
  const queryClient = useQueryClient()

  const [draft, setDraft] = useState<SalaryRangeDraft[]>([])
  const [dirty, setDirty] = useState(false)

  useEffect(() => {
    setDraft((rules.financeSpouseRules ?? []).map(toDisplay))
    setDirty(false)
  }, [rules])

  const error = validateRanges(draft)

  const saveMutation = useMutation({
    mutationFn: () =>
      saveIncentiveRules({
        coreSpouseRules: rules.coreSpouseRules ?? [],
        financeSpouseRules: draft.map(toDomain),
        coreVisitorRules: rules.coreVisitorRules ?? [],
        visitorProductRules: rules.visitorProductRules ?? [],
        canadaStudentRules: rules.canadaStudentRules ?? [],
        studentRules: rules.studentRules ?? [],
      }),
    onSuccess: () => {
      toast.success('All Finance rules saved')
      queryClient.invalidateQueries({ queryKey: ['incentive-rules'] })
      setDirty(false)
    },
    onError: () => toast.error('Failed to save rules'),
  })

  const discard = () => {
    setDraft((rules.financeSpouseRules ?? []).map(toDisplay))
    setDirty(false)
  }

  return (
    <div className="p-4 space-y-4">
      <SalaryRangeSection
        title="All Finance for Student & SPOUSE"
        draft={draft}
        onChange={updated => {
          setDraft(updated)
          setDirty(true)
        }}
      />

      {dirty && (
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={discard} disabled={saveMutation.isPending}>
            Discard Changes
          </Button>
          <Button
            onClick={() => saveMutation.mutate()}
            disabled={!!error || saveMutation.isPending}
          >
            {saveMutation.isPending ? 'Saving...' : 'Save All Finance Rules'}
          </Button>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add client/src/components/incentives/AllFinanceRulesTab.tsx
git commit -m "refactor: AllFinanceRulesTab accepts rules prop, removes useQuery"
```

---

### Task 6: Update IncentiveRulesPage to own the fetch

**Files:**
- Modify: `client/src/pages/IncentiveRulesPage.tsx`

- [ ] **Step 1: Replace the page**

```tsx
import { useQuery } from '@tanstack/react-query'
import { PageWrapper } from '@/layout/PageWrapper'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { SpouseRulesTab } from '@/components/incentives/SpouseRulesTab'
import { VisitorRulesTab } from '@/components/incentives/VisitorRulesTab'
import { StudentRulesTab } from '@/components/incentives/StudentRulesTab'
import { UkStudentRulesTab } from '@/components/incentives/UkStudentRulesTab'
import { AllFinanceRulesTab } from '@/components/incentives/AllFinanceRulesTab'
import { fetchIncentiveRules } from '@/api/incentives.api'

export default function IncentiveRulesPage() {
  const { data: rules, isLoading, isError } = useQuery({
    queryKey: ['incentive-rules'],
    queryFn: fetchIncentiveRules,
  })

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
        {isLoading && (
          <div className="flex items-center justify-center py-16 text-muted-foreground text-sm">
            Loading rules...
          </div>
        )}

        {isError && (
          <div className="flex items-center justify-center py-16 text-destructive text-sm">
            Failed to load incentive rules. Please refresh the page.
          </div>
        )}

        {rules && (
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
      </div>
    </PageWrapper>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add client/src/pages/IncentiveRulesPage.tsx
git commit -m "feat: IncentiveRulesPage owns rules fetch, passes rules to tabs"
```
