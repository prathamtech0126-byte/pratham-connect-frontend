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
