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
