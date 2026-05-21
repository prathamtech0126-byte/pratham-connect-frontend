import { useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Trash2, Plus, GripVertical } from 'lucide-react'

export interface CategoryDraft {
  id: string
  label: string
  incentiveAmount: string
  percentage: string
}

function toComparableBudgetAmount(raw: string): number | null {
  const value = raw.trim().toLowerCase().replace(/,/g, '')
  if (!value) return null

  const match = value.match(/^(\d+(?:\.\d+)?)(k)?$/)
  if (!match) return null

  const base = Number(match[1])
  if (!Number.isFinite(base)) return null

  return match[2] ? base * 1000 : base
}

export function validateCategories(rows: CategoryDraft[]): string | null {
  const seenLabels = new Set<string>()
  const seenBudgetAmounts = new Set<number>()

  for (let i = 0; i < rows.length; i++) {
    const lbl = rows[i].label.trim().toLowerCase()
    if (!lbl) continue

    if (seenLabels.has(lbl)) return `Duplicate label "${rows[i].label}" in row ${i + 1}`
    seenLabels.add(lbl)

    const amount = toComparableBudgetAmount(rows[i].label)
    if (amount !== null) {
      if (seenBudgetAmounts.has(amount)) {
        return `Duplicate budget amount "${rows[i].label}" in row ${i + 1}`
      }
      seenBudgetAmounts.add(amount)
    }
  }
  return null
}

interface Props {
  title: string
  draft: CategoryDraft[]
  onChange: (updated: CategoryDraft[]) => void
}

export function CategorySection({ title, draft, onChange }: Props) {
  const error = validateCategories(draft)
  const firstInputRef = useRef<HTMLInputElement>(null)
  const prevLengthRef = useRef(draft.length)
  const dragIndexRef = useRef<number | null>(null)
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null)

  useEffect(() => {
    if (draft.length > prevLengthRef.current) {
      firstInputRef.current?.focus()
    }
    prevLengthRef.current = draft.length
  }, [draft.length])

  const addRow = () => {
    onChange([...draft, { id: crypto.randomUUID(), label: '', incentiveAmount: '', percentage: '' }])
  }

  const addRowAfter = (index: number) => {
    const next = { id: crypto.randomUUID(), label: '', incentiveAmount: '', percentage: '' }
    onChange([...draft.slice(0, index + 1), next, ...draft.slice(index + 1)])
  }

  const update = (index: number, patch: Partial<CategoryDraft>) => {
    onChange(draft.map((r, i) => (i === index ? { ...r, ...patch } : r)))
  }

  const deleteRow = (index: number) => {
    onChange(draft.filter((_, i) => i !== index))
  }

  const reorderRows = (from: number, to: number) => {
    if (from === to || from < 0 || to < 0 || from >= draft.length || to >= draft.length) return
    const updated = [...draft]
    const [moved] = updated.splice(from, 1)
    updated.splice(to, 0, moved)
    onChange(updated)
  }

  const toNumber = (value: string): number | null => {
    if (!value.trim()) return null
    const n = Number(value)
    return Number.isFinite(n) ? n : null
  }

  const formatFixed = (value: number) => Number.isInteger(value) ? String(value) : value.toFixed(2)

  const calcPercentage = (budgetAmount: number, incentiveAmount: number) =>
    (incentiveAmount / budgetAmount) * 100

  const calcIncentive = (budgetAmount: number, percentage: number) =>
    (budgetAmount * percentage) / 100

  const updateLabel = (index: number, label: string) => {
    const row = draft[index]
    const budget = toComparableBudgetAmount(label)
    if (!budget || budget <= 0) {
      update(index, { label })
      return
    }

    const incentive = toNumber(row.incentiveAmount)
    if (incentive !== null && incentive >= 0) {
      update(index, { label, percentage: formatFixed(calcPercentage(budget, incentive)) })
      return
    }

    const percentage = toNumber(row.percentage)
    if (percentage !== null && percentage >= 0) {
      update(index, { label, incentiveAmount: formatFixed(calcIncentive(budget, percentage)) })
      return
    }

    update(index, { label })
  }

  const updateAmount = (index: number, incentiveAmount: string) => {
    const row = draft[index]
    const budget = toComparableBudgetAmount(row.label)
    const incentive = toNumber(incentiveAmount)

    if (!budget || budget <= 0 || incentive === null || incentive < 0) {
      update(index, { incentiveAmount })
      return
    }

    update(index, {
      incentiveAmount,
      percentage: formatFixed(calcPercentage(budget, incentive)),
    })
  }

  const updatePercentage = (index: number, percentage: string) => {
    const row = draft[index]
    const budget = toComparableBudgetAmount(row.label)
    const pct = toNumber(percentage)

    if (!budget || budget <= 0 || pct === null || pct < 0) {
      update(index, { percentage })
      return
    }

    update(index, {
      percentage,
      incentiveAmount: formatFixed(calcIncentive(budget, pct)),
    })
  }

  return (
    <div className="border border-border rounded-lg overflow-hidden flex flex-col">
      {/* Section header */}
      <div className="bg-primary px-4 py-2.5">
        <h3 className="text-sm font-bold text-primary-foreground uppercase tracking-wide">{title}</h3>
      </div>

      {/* Add row button */}
      <div className="flex justify-end px-3 py-2 bg-muted/20 border-b border-border">
        <Button type="button" size="sm" onClick={addRow} className="h-8 rounded-md">
          <Plus className="w-4 h-4 mr-1" /> Add Rule
        </Button>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-primary/8 border-b border-primary/20">
            <tr>
              <th className="w-10 px-2 py-2 text-center text-xs font-semibold text-primary">Move</th>
              <th className="px-3 py-2 text-left text-xs font-semibold text-primary">#</th>
              <th className="px-3 py-2 text-left text-xs font-semibold text-primary">SLAB / Label</th>
              <th className="px-3 py-2 text-left text-xs font-semibold text-primary">Incentive (₹)</th>
              <th className="px-3 py-2 text-left text-xs font-semibold text-primary">Percentage (%)</th>
              <th className="px-3 py-2 text-center text-xs font-semibold text-primary">Del</th>
            </tr>
          </thead>
          <tbody>
            {draft.map((row, i) => {
              const isLast = i === draft.length - 1
              return (
              <tr
                key={row.id}
                className={`border-b border-border/60 hover:bg-muted/10 ${
                  dragOverIndex === i ? 'bg-accent/50' : ''
                }`}
                onDragOver={(e) => {
                  e.preventDefault()
                  if (dragOverIndex !== i) setDragOverIndex(i)
                }}
                onDrop={(e) => {
                  e.preventDefault()
                  const from = dragIndexRef.current
                  if (from !== null) reorderRows(from, i)
                  dragIndexRef.current = null
                  setDragOverIndex(null)
                }}
              >
                <td className="px-2 py-2 text-center">
                  <button
                    type="button"
                    className="inline-flex h-7 w-7 cursor-grab items-center justify-center rounded-md text-muted-foreground hover:bg-muted active:cursor-grabbing"
                    draggable
                    onDragStart={(e) => {
                      dragIndexRef.current = i
                      e.dataTransfer.effectAllowed = 'move'
                    }}
                    onDragEnd={() => {
                      dragIndexRef.current = null
                      setDragOverIndex(null)
                    }}
                    aria-label={`Move rule ${i + 1}`}
                    title="Drag to move"
                  >
                    <GripVertical className="h-4 w-4" />
                  </button>
                </td>
                <td className="px-3 py-2 text-xs text-muted-foreground">{i + 1}</td>
                <td className="px-3 py-2">
                  <Input
                    ref={isLast ? firstInputRef : undefined}
                    value={row.label}
                    onChange={e => updateLabel(i, e.target.value)}
                    placeholder="e.g. 8K, REFUSAL"
                    className="w-32"
                  />
                </td>
                <td className="px-3 py-2">
                  <Input
                    type="number"
                    min={0}
                    value={row.incentiveAmount}
                    onChange={e => updateAmount(i, e.target.value)}
                    onKeyDown={e => {
                      if (e.key !== 'Enter') return
                      e.preventDefault()
                      if (!row.incentiveAmount.trim()) return
                      if (isLast) {
                        addRow()
                        return
                      }
                      addRowAfter(i)
                    }}
                    placeholder="e.g. 500"
                    className="w-24"
                  />
                </td>
                <td className="px-3 py-2">
                  <Input
                    type="number"
                    min={0}
                    value={row.percentage}
                    onChange={e => updatePercentage(i, e.target.value)}
                    onKeyDown={e => {
                      if (e.key !== 'Enter') return
                      e.preventDefault()
                      if (!row.percentage.trim()) return
                      if (isLast) {
                        addRow()
                        return
                      }
                      addRowAfter(i)
                    }}
                    placeholder="e.g. 6.25"
                    className="w-24"
                  />
                </td>
                <td className="px-3 py-2 text-center">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => deleteRow(i)}
                    className="h-7 w-7 p-0 text-destructive hover:bg-destructive/10"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </td>
              </tr>
            )})}

            {draft.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-muted-foreground text-sm">
                  No rules yet. Click "Add Rule" to start.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Validation error */}
      {error && (
        <div className="px-4 py-2 bg-destructive/10 border-t border-destructive/20 text-sm text-destructive">
          ⚠ {error}
        </div>
      )}
    </div>
  )
}
