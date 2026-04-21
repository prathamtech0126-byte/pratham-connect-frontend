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
