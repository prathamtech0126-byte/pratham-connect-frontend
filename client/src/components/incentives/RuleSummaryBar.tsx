import { format } from 'date-fns'
import { DateRange } from 'react-day-picker'
import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { cn } from '@/lib/utils'
import { type SaleTypeItem, type OtherProductItem, type RuleConfigRuleType } from '@/api/incentives.api'
import type { AllFinanceSaleTypeCategory } from '@/lib/incentive-sale-type-category'
import { formatAllFinanceCategoryLabel } from '@/lib/incentive-sale-type-category'
import api from '@/lib/api'

interface Props {
  period: DateRange
  saleTypes: (string | number)[]
  saleTypesData: SaleTypeItem[]
  ruleType: RuleConfigRuleType
  name?: string
  /** Shown when an All Finance–scoped rule targets specific corridors */
  allFinanceSaleTypeCategories?: AllFinanceSaleTypeCategory[]
}

const INITIAL_VISIBLE = 8

export function RuleSummaryBar({
  period,
  saleTypes,
  saleTypesData,
  ruleType,
  name,
  allFinanceSaleTypeCategories,
}: Props) {
  const [expanded, setExpanded] = useState(false)
  const { data: otherProducts = [] } = useQuery<OtherProductItem[]>({
    queryKey: ['other-products-all'],
    queryFn: async () => {
      const res = await api.get('/api/other-products')
      return res.data.data ?? []
    },
    staleTime: Infinity,
  })

  const saleTypeNames = saleTypes
    .filter((id) => !String(id).startsWith('op_'))
    .map((id) => saleTypesData.find((d) => String(d.id) === String(id))?.name)
    .filter((n): n is string => Boolean(n))

  const otherProductNames = saleTypes
    .filter((id) => String(id).startsWith('op_'))
    .map((id) => {
      const numericId = Number(String(id).replace('op_', ''))
      return otherProducts.find((p) => p.id === numericId)?.name
    })
    .filter((n): n is string => Boolean(n))

  const allNames = [...saleTypeNames, ...otherProductNames]

  const dateRange =
    period.from && period.to
      ? `${format(period.from, 'MMM d, yyyy')} – ${format(period.to, 'MMM d, yyyy')}`
      : ''

  return (
    <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
      <div className="flex items-stretch divide-x divide-border">

        {/* Name */}
        {name && (
          <div className="flex flex-col justify-start px-5 py-3.5 shrink-0 bg-muted/40 min-w-[120px]">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-0.5">
              Name
            </p>
            <p className="text-sm font-bold text-foreground">{name}</p>
          </div>
        )}

        {/* Period */}
        <div className="flex flex-col justify-start px-5 py-3.5 shrink-0">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-0.5">
            Period
          </p>
          <p className="text-sm font-semibold text-foreground">{dateRange}</p>
        </div>

        {/* Applies To */}
        {allNames.length > 0 && (
          <div className="flex flex-col justify-start px-5 py-3.5 flex-1 min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-1.5">
              Applies To
            </p>
            <div className="flex flex-wrap gap-1.5">
              {(expanded ? allNames : allNames.slice(0, INITIAL_VISIBLE)).map((n) => (
                <span
                  key={n}
                  className="text-xs bg-primary/10 text-primary border border-primary/20 px-2.5 py-0.5 rounded-md font-medium"
                >
                  {n}
                </span>
              ))}
              {!expanded && allNames.length > INITIAL_VISIBLE && (
                <button
                  type="button"
                  onClick={() => setExpanded(true)}
                  className="text-xs font-semibold text-primary hover:underline px-2.5 py-0.5 rounded-md border border-primary/20 bg-primary/5"
                >
                  +{allNames.length - INITIAL_VISIBLE} more
                </button>
              )}
              {expanded && allNames.length > INITIAL_VISIBLE && (
                <button
                  type="button"
                  onClick={() => setExpanded(false)}
                  className="text-xs font-semibold text-muted-foreground hover:text-foreground hover:underline px-2.5 py-0.5"
                >
                  Show less
                </button>
              )}
            </div>
          </div>
        )}

        {allFinanceSaleTypeCategories && allFinanceSaleTypeCategories.length > 0 && (
          <div className="flex flex-col justify-start px-5 py-3.5 shrink-0 bg-violet-50/80 dark:bg-violet-950/30 border-l border-border">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-1.5">
              All Finance applies to
            </p>
            <div className="flex flex-wrap gap-1.5">
              {allFinanceSaleTypeCategories.map((c) => (
                <span
                  key={c}
                  className="text-xs font-semibold bg-violet-100 text-violet-800 border border-violet-200 dark:bg-violet-900/50 dark:text-violet-200 dark:border-violet-800 px-2.5 py-0.5 rounded-md"
                >
                  {formatAllFinanceCategoryLabel(c)}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Rule Type */}
        <div className="flex flex-col justify-start items-center px-6 py-3.5 shrink-0 bg-muted/40">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-1">
            Rule Type
          </p>
          <span
            className={cn(
              'text-xs font-bold px-3 py-1 rounded-md border',
              ruleType === 'slab' &&
                'bg-orange-50 text-orange-600 border-orange-200 dark:bg-orange-950/40 dark:text-orange-300 dark:border-orange-800',
              ruleType === 'budget' &&
                'bg-green-50 text-green-600 border-green-200 dark:bg-green-950/40 dark:text-green-300 dark:border-green-800',
              ruleType === 'budget_threshold_slab' &&
                'bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-950/40 dark:text-violet-300 dark:border-violet-800',
            )}
          >
            {ruleType === 'slab' ? 'Slab' : ruleType === 'budget' ? 'Budget' : 'Budget + Slab'}
          </span>
        </div>

      </div>
    </div>
  )
}
