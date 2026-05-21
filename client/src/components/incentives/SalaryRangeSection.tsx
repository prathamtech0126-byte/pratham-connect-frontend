import { useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { Trash2, Plus, GripVertical } from 'lucide-react'

export interface SalaryRangeDraft {
  id: string
  minCount: string
  maxCount: string    // empty string = open-ended (-1 when saved)
  openEnded: boolean  // "& above" checkbox
  incentiveAmount: string
}

export function makeEmptyRangeRow(prevMax?: string): SalaryRangeDraft {
  const nextMin = prevMax && prevMax !== '' ? String(Number(prevMax) + 1) : ''
  return {
    id: crypto.randomUUID(),
    minCount: nextMin,
    maxCount: '',
    openEnded: false,
    incentiveAmount: '',
  }
}

export function validateRanges(rows: SalaryRangeDraft[]): string | null {
  const filled = rows.filter(r => r.minCount !== '')
  const parsed = filled.map(r => ({
    min: Number(r.minCount),
    max: r.openEnded ? Infinity : Number(r.maxCount),
    openEnded: r.openEnded,
  }))

  for (let i = 0; i < parsed.length; i++) {
    const curr = parsed[i]

    if (!curr.openEnded && filled[i].maxCount === '') {
      return `Row ${i + 1}: Max SLAB is required (or check "& above")`
    }
    if (!curr.openEnded && curr.min > curr.max) {
      return `Row ${i + 1}: Min (${curr.min}) cannot be greater than Max (${curr.max})`
    }
    if (i > 0) {
      const prev = parsed[i - 1]
      if (prev.openEnded) {
        return `Row ${i}: an open-ended row must be the last row`
      }
      if (curr.min <= prev.max) {
        return `Row ${i + 1}: overlaps with previous range (${parsed[i - 1].min}–${prev.max})`
      }
      if (curr.min !== prev.max + 1) {
        return `Gap between ${prev.max} and ${curr.min} — should be ${prev.max + 1}`
      }
    }
  }

  return null
}

const preventDecimal = (e: React.KeyboardEvent<HTMLInputElement>) => {
  if (e.key === '.' || e.key === ',') e.preventDefault()
}

const toInt = (val: string) => (val.includes('.') ? String(Math.floor(Number(val))) : val)

interface Props {
  title: string
  draft: SalaryRangeDraft[]
  onChange: (updated: SalaryRangeDraft[]) => void
}

export function SalaryRangeSection({ title, draft, onChange }: Props) {
  const error = validateRanges(draft)
  const firstInputRef = useRef<HTMLInputElement>(null)
  const prevLengthRef = useRef(draft.length)
  const hasOpenEndedRow = draft.some(r => r.openEnded)
  const dragIndexRef = useRef<number | null>(null)
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null)

  useEffect(() => {
    if (draft.length > prevLengthRef.current) {
      firstInputRef.current?.focus()
    }
    prevLengthRef.current = draft.length
  }, [draft.length])

  const addRow = () => {
    if (hasOpenEndedRow) return
    const last = draft[draft.length - 1]
    onChange([...draft, makeEmptyRangeRow(last?.maxCount)])
  }

  const addRowAfter = (index: number) => {
    if (hasOpenEndedRow) return
    const base = draft[index]
    const nextRow = makeEmptyRangeRow(base?.maxCount)
    onChange([...draft.slice(0, index + 1), nextRow, ...draft.slice(index + 1)])
  }

  const update = (index: number, patch: Partial<SalaryRangeDraft>) => {
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

  return (
    <div className="border border-border rounded-lg overflow-hidden flex flex-col">
      {/* Section header */}
      <div className="bg-primary px-4 py-2.5">
        <h3 className="text-sm font-bold text-primary-foreground uppercase tracking-wide">{title}</h3>
      </div>

      {/* Add row button */}
      <div className="flex justify-end px-3 py-2 bg-muted/20 border-b border-border">
        <Button type="button" size="sm" onClick={addRow} disabled={hasOpenEndedRow} className="h-8 rounded-md">
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
              <th className="px-3 py-2 text-left text-xs font-semibold text-primary">Min SLAB</th>
              <th className="px-3 py-2 text-left text-xs font-semibold text-primary">Max SLAB</th>
              <th className="px-3 py-2 text-center text-xs font-semibold text-primary">& Above</th>
              <th className="px-3 py-2 text-left text-xs font-semibold text-primary">Incentive (₹)</th>
              <th className="px-3 py-2 text-center text-xs font-semibold text-primary">Delete Rule</th>
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
                    type="number"
                    min={0}
                    step={1}
                    value={row.minCount}
                    onChange={e => update(i, { minCount: toInt(e.target.value) })}
                    onKeyDown={preventDecimal}
                    placeholder="e.g. 60"
                    className="w-20"
                  />
                </td>
                <td className="px-3 py-2">
                  <Input
                    type="number"
                    min={0}
                    step={1}
                    value={row.maxCount}
                    onChange={e => update(i, { maxCount: toInt(e.target.value) })}
                    onKeyDown={preventDecimal}
                    placeholder="e.g. 89"
                    disabled={row.openEnded}
                    className="w-20"
                  />
                </td>
                <td className="px-3 py-2">
                  <div className="flex items-center justify-center">
                    <Checkbox
                      checked={row.openEnded}
                      onCheckedChange={checked =>
                        update(i, { openEnded: !!checked, maxCount: checked ? '' : row.maxCount })
                      }
                    />
                  </div>
                </td>
                <td className="px-3 py-2">
                  <Input
                    type="number"
                    min={0}
                    step={1}
                    value={row.incentiveAmount}
                    onChange={e => update(i, { incentiveAmount: toInt(e.target.value) })}
                    onKeyDown={e => {
                      if (e.key === '.' || e.key === ',') { e.preventDefault(); return }
                      if (e.key !== 'Enter') return
                      e.preventDefault()
                      if (!row.incentiveAmount.trim()) return
                      if (isLast) {
                        addRow()
                        return
                      }
                      addRowAfter(i)
                    }}
                    placeholder="e.g. 1200"
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
                <td colSpan={7} className="px-4 py-6 text-center text-muted-foreground text-sm">
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
