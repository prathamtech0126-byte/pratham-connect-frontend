import { Layers, Wallet, Check, Gauge } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { RuleConfigRuleType } from '@/api/incentives.api'

const RULE_TYPES: {
  value: RuleConfigRuleType
  Icon: typeof Layers
  title: string
  description: string
}[] = [
  {
    value: 'slab',
    Icon: Layers,
    title: 'Slab Wise',
    description:
      'Define incentive rules by count ranges — different amounts for different slabs',
  },
  {
    value: 'budget',
    Icon: Wallet,
    title: 'Budget Wise',
    description:
      'Allocate a fixed budget amount as incentive for the selected period',
  },
  {
    value: 'budget_threshold_slab',
    Icon: Gauge,
    title: 'Budget threshold + Slab',
    description:
      'Set a minimum budget gate, then tier incentives by count slabs (e.g. All Finance)',
  },
]

interface Props {
  value: RuleConfigRuleType | null
  onChange: (v: RuleConfigRuleType) => void
  onNext: () => void
  onBack: () => void
}

export function RuleTypeSelector({ value, onChange, onNext, onBack }: Props) {
  return (
    <div className="space-y-4">
      <h2 className="text-base font-semibold">Select Rule Type</h2>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {RULE_TYPES.map(({ value: v, Icon, title, description }) => {
          const isSelected = value === v
          return (
            <button
              key={v}
              type="button"
              onClick={() => onChange(v)}
              aria-pressed={isSelected}
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
          Continue
        </Button>
      </div>
    </div>
  )
}
