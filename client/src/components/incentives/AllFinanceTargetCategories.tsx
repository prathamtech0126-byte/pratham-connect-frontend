import { cn } from '@/lib/utils'
import type { AllFinanceSaleTypeCategory } from '@/lib/incentive-sale-type-category'
import { formatAllFinanceCategoryLabel } from '@/lib/incentive-sale-type-category'

const OPTIONS: { value: AllFinanceSaleTypeCategory; description: string }[] = [
  { value: 'visitor', description: 'Visitor and visa corridors' },
  { value: 'spouse', description: 'Spouse / PR corridors' },
  { value: 'student', description: 'Student corridors' },
]

interface Props {
  value: AllFinanceSaleTypeCategory[]
  onChange: (next: AllFinanceSaleTypeCategory[]) => void
}

export function AllFinanceTargetCategories({ value, onChange }: Props) {
  const toggle = (v: AllFinanceSaleTypeCategory) => {
    if (value.includes(v)) {
      onChange(value.filter((x) => x !== v))
    } else {
      onChange([...value, v])
    }
  }

  return (
    <div className="rounded-xl border border-violet-200 dark:border-violet-900 bg-violet-50/40 dark:bg-violet-950/20 overflow-hidden">
      <div className="px-4 py-3 border-b border-violet-200/80 dark:border-violet-800">
        <h3 className="text-sm font-semibold text-foreground">Which sale-type category applies?</h3>
        <p className="text-xs text-muted-foreground mt-1">
          All Finance incentives can differ by corridor. Choose one or more of Visitor, Spouse, or Student for this rule.
        </p>
      </div>
      <div className="p-4 grid gap-2 sm:grid-cols-3">
        {OPTIONS.map(({ value: v, description }) => {
          const on = value.includes(v)
          return (
            <button
              key={v}
              type="button"
              onClick={() => toggle(v)}
              className={cn(
                'rounded-lg border px-3 py-3 text-left transition-colors',
                on
                  ? 'border-primary bg-primary text-primary-foreground shadow-sm'
                  : 'border-border bg-card hover:border-primary/40 hover:bg-accent',
              )}
            >
              <p className={cn('text-sm font-semibold', on ? 'text-primary-foreground' : 'text-foreground')}>
                {formatAllFinanceCategoryLabel(v)}
              </p>
              <p className={cn('text-xs mt-1', on ? 'text-primary-foreground/85' : 'text-muted-foreground')}>
                {description}
              </p>
            </button>
          )
        })}
      </div>
      {value.length === 0 && (
        <p className="px-4 pb-3 text-xs text-destructive">Select at least one category to continue.</p>
      )}
    </div>
  )
}
