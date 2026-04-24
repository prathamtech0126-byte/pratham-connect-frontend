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
