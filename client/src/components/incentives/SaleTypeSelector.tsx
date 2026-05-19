import { Check, Loader2, ChevronDown } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { type SaleTypeItem, type OtherProductItem } from '@/api/incentives.api'
import { getSaleTypeBucketFromName } from '@/lib/incentive-sale-type-category'
import { useState, useMemo } from 'react'

interface Props {
  data: SaleTypeItem[]
  selected: (string | number)[]
  onChange: (selected: (string | number)[]) => void
  onNext?: () => void
  onBack?: () => void
}

const CORE_SALE_BUCKETS: { key: 'Visitor' | 'Spouse' | 'Student'; label: string }[] = [
  { key: 'Visitor', label: 'Visitor' },
  { key: 'Spouse', label: 'Spouse / PR' },
  { key: 'Student', label: 'Student' },
]

function CategorySection({
  label,
  items,
  selected,
  onToggle,
  onToggleAll,
  defaultOpen = false,
}: {
  label: string
  items: { id: string | number; name: string }[]
  selected: (string | number)[]
  onToggle: (id: string | number) => void
  onToggleAll: (items: { id: string | number; name: string }[]) => void
  defaultOpen?: boolean
}) {
  const [open, setOpen] = useState(defaultOpen)

  const selectedInCat = items.filter((i) => selected.some((s) => String(s) === String(i.id))).length
  const allSelected = selectedInCat === items.length && items.length > 0

  if (items.length === 0) return null

  return (
    <div className="border border-border rounded-lg overflow-hidden">
      {/* Header row */}
      <div
        className="flex items-center justify-between px-4 py-2.5 bg-muted/30 cursor-pointer select-none"
        onClick={() => setOpen((o) => !o)}
      >
        <div className="flex items-center gap-2.5">
          <div className="h-3.5 w-0.5 rounded-full bg-primary shrink-0" />
          <span className="text-sm font-semibold text-primary">{label}</span>
          <span className="text-xs text-muted-foreground font-medium">({items.length})</span>
          {selectedInCat > 0 && (
            <span className="text-[11px] font-semibold bg-primary text-primary-foreground px-1.5 py-0.5 rounded-full leading-none">
              {selectedInCat} selected
            </span>
          )}
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onToggleAll(items) }}
            className="text-xs font-medium text-primary hover:underline"
          >
            {allSelected ? 'Clear All' : 'Select All'}
          </button>
          <ChevronDown
            className={cn('h-4 w-4 text-muted-foreground transition-transform duration-200', open && 'rotate-180')}
          />
        </div>
      </div>

      {/* Collapsible grid */}
      {open && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 p-3 bg-card">
          {items.map((item) => {
            const isSelected = selected.some((id) => String(id) === String(item.id))
            return (
              <button
                type="button"
                key={item.id}
                onClick={() => onToggle(item.id)}
                className={cn(
                  'group flex items-center gap-2 px-3 py-2 rounded-lg border transition-all duration-150 text-left',
                  isSelected
                    ? 'border-primary bg-primary text-primary-foreground shadow-sm'
                    : 'border-border bg-background hover:border-primary/40 hover:bg-accent'
                )}
              >
                <div
                  className={cn(
                    'w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 transition-all',
                    isSelected
                      ? 'border-primary-foreground/60 bg-primary-foreground/20'
                      : 'border-muted-foreground/40 group-hover:border-primary/50'
                  )}
                >
                  {isSelected && <Check className="w-3 h-3 text-primary-foreground" />}
                </div>
                <span className={cn(
                  'text-sm font-medium truncate',
                  isSelected ? 'text-primary-foreground' : 'text-foreground'
                )}>
                  {item.name}
                </span>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

export function SaleTypeSelector({ data, selected, onChange, onNext, onBack }: Props) {
  const {
    data: otherProducts = [],
    isLoading: opLoading,
    isError: opError,
  } = useQuery<OtherProductItem[]>({
    queryKey: ['other-products-all'],
    queryFn: async () => {
      const res = await (await import('@/lib/api')).default.get('/api/other-products')
      return res.data.data ?? []
    },
    staleTime: Infinity,
  })

  const [searchTerm, setSearchTerm] = useState('')

  const toggle = (id: string | number) => {
    const strId = String(id)
    if (selected.some((x) => String(x) === strId)) {
      onChange(selected.filter((x) => String(x) !== strId))
    } else {
      onChange([...selected, id])
    }
  }

  const toggleGroup = (items: { id: string | number; name: string }[]) => {
    const ids = items.map((i) => String(i.id))
    const allSelected = ids.every((id) => selected.some((s) => String(s) === id))
    if (allSelected) {
      onChange(selected.filter((s) => !ids.includes(String(s))))
    } else {
      const newIds = items.filter((i) => !selected.some((s) => String(s) === String(i.id))).map((i) => i.id)
      onChange([...selected, ...newIds])
    }
  }

  const searchLower = searchTerm.trim().toLowerCase()
  const matchesSearch = (name: string) =>
    searchLower === '' || name.toLowerCase().includes(searchLower)

  const coreSaleBuckets = useMemo(
    () =>
      CORE_SALE_BUCKETS.map((bucket) => ({
        ...bucket,
        items: data
          .filter((item) => getSaleTypeBucketFromName(item.name) === bucket.key && matchesSearch(item.name))
          .map((item) => ({ id: item.id, name: item.name })),
      })).filter((b) => b.items.length > 0),
    [data, searchLower],
  )

  const saleTypesAllFinanceNamed = useMemo(
    () =>
      data
        .filter((item) => getSaleTypeBucketFromName(item.name) === 'All Finance' && matchesSearch(item.name))
        .map((item) => ({ id: item.id, name: item.name })),
    [data, searchLower],
  )

  const saleTypesOtherOnly = useMemo(
    () =>
      data
        .filter((item) => getSaleTypeBucketFromName(item.name) === 'Other' && matchesSearch(item.name))
        .map((item) => ({ id: item.id, name: item.name })),
    [data, searchLower],
  )

  const otherProductItems = useMemo(
    () =>
      otherProducts
        .filter((p) => matchesSearch(p.name))
        .map((p) => ({ id: `op_${p.id}`, name: p.name })),
    [otherProducts, searchLower],
  )

  /** Sale types that are not Visitor / Spouse / Student (shown under Other Product block). */
  const saleTypesNonCore = useMemo(() => {
    const merged = [
      ...saleTypesAllFinanceNamed,
      ...saleTypesOtherOnly,
    ]
    const seen = new Set<string>()
    return merged.filter((row) => {
      const k = String(row.id)
      if (seen.has(k)) return false
      seen.add(k)
      return true
    })
  }, [saleTypesAllFinanceNamed, saleTypesOtherOnly])

  const hasAllFinanceBlock = coreSaleBuckets.length > 0

  const hasOtherProductBlock =
    saleTypesNonCore.length > 0 || otherProductItems.length > 0 || opLoading || opError

  const allSaleTypeIds = data.map((d) => d.id)
  const allOtherProductIds = otherProducts.map((p) => `op_${p.id}`)
  const allIds = [...allSaleTypeIds, ...allOtherProductIds]
  const totalSelected = selected.length

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border">
        <div>
          <h3 className="text-sm font-semibold text-foreground">Select sale types and products</h3>
          <p className="text-xs text-muted-foreground mt-0.5">Choose which types apply to this rule configuration</p>
        </div>

        <div className="flex items-center gap-4">
          <input
            type="text"
            placeholder="Search..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-3 pr-3 py-1.5 text-sm rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 w-40 sm:w-48"
          />

          {totalSelected > 0 && (
            <div className="px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold border border-primary/20">
              {totalSelected} selected
            </div>
          )}

          <div className="flex items-center gap-2 text-xs">
            <button onClick={() => onChange(allIds)} className="text-primary hover:underline font-medium">
              Select All
            </button>
            <span className="text-border">•</span>
            <button onClick={() => onChange([])} className="text-muted-foreground hover:text-foreground hover:underline">
              Clear All
            </button>
          </div>
        </div>
      </div>

      {/* ALL Finance: only core sale type buckets (Visitor, Spouse, Student) */}
      {hasAllFinanceBlock && (
        <div className="space-y-2">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-primary px-0.5">
            ALL Finance
          </p>
          <div className="rounded-xl border border-primary/20 bg-card shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b border-border bg-primary/5">
              <p className="text-sm font-semibold text-foreground">Sale type categories</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Visitor, Spouse, and Student corridors for this rule.
              </p>
            </div>
            <div className="p-3 space-y-2">
              {coreSaleBuckets.map((cat, i) => (
                <CategorySection
                  key={cat.key}
                  label={cat.label}
                  items={cat.items}
                  selected={selected}
                  onToggle={toggle}
                  onToggleAll={toggleGroup}
                  defaultOpen={i === 0}
                />
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Other Product: non-core sale types + full other-products catalog */}
      {hasOtherProductBlock && (
        <div className="space-y-2">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground px-0.5">
            Other Product
          </p>
          <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b border-border bg-muted/20">
              <p className="text-sm font-semibold text-foreground">Catalog and other sale types</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Everything outside Visitor / Spouse / Student appears here, including loans, forex, tuition, and other catalog rows.
              </p>
            </div>
            <div className="p-3 space-y-2">
              {opLoading && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground py-3">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading other products…
                </div>
              )}

              {opError && (
                <p className="text-sm text-destructive py-2">Failed to load other products. Please refresh.</p>
              )}

              {!opLoading && !opError && saleTypesNonCore.length > 0 && (
                <CategorySection
                  label="Other sale types"
                  items={saleTypesNonCore}
                  selected={selected}
                  onToggle={toggle}
                  onToggleAll={toggleGroup}
                  defaultOpen
                />
              )}

              {!opLoading && !opError && otherProductItems.length > 0 && (
                <CategorySection
                  label="Other Product"
                  items={otherProductItems}
                  selected={selected}
                  onToggle={toggle}
                  onToggleAll={toggleGroup}
                  defaultOpen
                />
              )}

              {!opLoading && !opError && !saleTypesNonCore.length && !otherProductItems.length && (
                <p className="text-sm text-muted-foreground py-2">
                  {searchTerm ? `No items match "${searchTerm}"` : 'No other products in this section.'}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Empty state */}
      {!hasAllFinanceBlock && !hasOtherProductBlock && !opLoading && (
        <div className="text-center py-8">
          <p className="text-muted-foreground text-sm">
            {searchTerm ? `No results found for "${searchTerm}"` : 'No items available'}
          </p>
          {searchTerm && (
            <button onClick={() => setSearchTerm('')} className="text-sm text-primary mt-2 hover:underline">
              Clear search
            </button>
          )}
        </div>
      )}

      {/* Navigation */}
      {(onBack || onNext) && (
        <div className="flex gap-3 pt-4 border-t border-border">
          {onBack && <Button variant="outline" onClick={onBack}>Back</Button>}
          {onNext && (
            <Button disabled={selected.length === 0} onClick={onNext}>
              Continue
              {selected.length > 0 && (
                <span className="ml-2 text-xs bg-white/20 px-1.5 py-0.5 rounded-full">{selected.length}</span>
              )}
            </Button>
          )}
        </div>
      )}
    </div>
  )
}
