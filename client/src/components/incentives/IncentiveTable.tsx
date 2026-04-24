// import { format, parseISO, isValid } from 'date-fns'
// import { Button } from '@/components/ui/button'
// import { cn } from '@/lib/utils'
// import { EligibilityPill } from './EligibilityPill'
// import type { IncentiveRow } from '@/api/incentives.api'

// interface IncentiveTableProps {
//   rows: IncentiveRow[]
//   isLoading: boolean
//   onApprove: (row: IncentiveRow) => void
//   onReject: (row: IncentiveRow) => void
//   onEligibilityChange: (id: string, eligible: boolean) => void
// }

// const saleBadgeClass: Record<string, string> = {
//   spouse: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
//   visitor: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
//   student: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
// }

// const statusBadgeClass: Record<string, string> = {
//   pending: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
//   approved: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
//   rejected: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
//   ineligible: 'bg-muted text-muted-foreground',
// }

// export function IncentiveTable({
//   rows,
//   isLoading,
//   onApprove,
//   onReject,
//   onEligibilityChange,
// }: IncentiveTableProps) {
//   if (isLoading) {
//     return (
//       <div className="flex items-center justify-center py-16 text-muted-foreground text-sm">
//         Loading incentives...
//       </div>
//     )
//   }

//   if (rows.length === 0) {
//     return (
//       <div className="flex items-center justify-center py-16 text-muted-foreground text-sm">
//         No incentive records found.
//       </div>
//     )
//   }

//   return (
//     <div className="overflow-x-auto">
//       <table className="w-full text-sm border-collapse">
//         <thead>
//           <tr className="bg-muted/50 border-b border-border">
//             <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide whitespace-nowrap">Client ID</th>
//             <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Client Name</th>
//             <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Counsellor</th>
//             <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide whitespace-nowrap">Enrollment Date</th>
//             <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Sale Type</th>
//             <th className="px-4 py-3 text-center text-xs font-semibold text-muted-foreground uppercase tracking-wide">Eligibility</th>
//             <th className="px-4 py-3 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wide whitespace-nowrap">Received Amount</th>
//             <th className="px-4 py-3 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wide whitespace-nowrap">Incentive Amount</th>
//             <th className="px-4 py-3 text-center text-xs font-semibold text-muted-foreground uppercase tracking-wide">Status</th>
//             <th className="px-4 py-3 text-center text-xs font-semibold text-muted-foreground uppercase tracking-wide">Actions</th>
//           </tr>
//         </thead>
//         <tbody>
//           {rows.map((row) => (
//             <tr
//               key={row.id}
//               className={cn(
//                 'border-b border-border/60 transition-colors hover:bg-muted/30',
//                 !row.eligible && 'opacity-60'
//               )}
//             >
//               <td className="px-4 py-3 text-primary font-semibold whitespace-nowrap">#{row.clientId}</td>
//               <td className="px-4 py-3 font-medium text-foreground">{row.clientName}</td>
//               <td className="px-4 py-3 text-muted-foreground">{row.counsellorName || '—'}</td>
//               <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
//                 {(() => { const d = parseISO(row.enrollmentDate); return isValid(d) ? format(d, 'd MMM yyyy') : '—' })()}
//               </td>
//               <td className="px-4 py-3">
//                 <span className={cn('px-2.5 py-0.5 rounded-full text-[11px] font-semibold uppercase',
//                   saleBadgeClass[row.saleType] ?? 'bg-muted text-muted-foreground'
//                 )}>
//                   {row.saleType}
//                 </span>
//               </td>
//               <td className="px-4 py-3 text-center">
//                 <EligibilityPill
//                   eligible={row.eligible}
//                   onChange={(val) => onEligibilityChange(row.id, val)}
//                   disabled={row.status !== 'pending'}
//                 />
//               </td>
//               <td className="px-4 py-3 text-right font-medium text-foreground">
//                 ₹{row.amount.toLocaleString('en-IN')}
//               </td>
//               <td className="px-4 py-3 text-right font-bold text-primary">
//                 ₹{row.incentiveAmount.toLocaleString('en-IN')}
//               </td>
//               <td className="px-4 py-3 text-center">
//                 <span className={cn('px-2.5 py-0.5 rounded-full text-[11px] font-semibold uppercase', statusBadgeClass[row.status])}>
//                   {row.status}
//                 </span>
//               </td>
//               <td className="px-4 py-3 text-center">
//                 {row.status === 'pending' ? (
//                   <div className="flex gap-2 justify-center">
//                     <Button size="sm" variant="ghost" className="h-7 px-3 text-xs bg-green-50 text-green-700 hover:bg-green-100 dark:bg-green-900/20 dark:text-green-400" onClick={() => onApprove(row)}>
//                       Approve
//                     </Button>
//                     <Button size="sm" variant="ghost" className="h-7 px-3 text-xs bg-red-50 text-red-600 hover:bg-red-100 dark:bg-red-900/20 dark:text-red-400" onClick={() => onReject(row)}>
//                       Reject
//                     </Button>
//                   </div>
//                 ) : (
//                   <span className="text-muted-foreground text-xs">—</span>
//                 )}
//               </td>
//             </tr>
//           ))}
//         </tbody>
//       </table>
//     </div>
//   )
// }


import { useState, useMemo } from 'react'
import { format, parseISO, isValid } from 'date-fns'
import { Search, X, ChevronDown, SlidersHorizontal } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { EligibilityPill } from './EligibilityPill'
import type { IncentiveRow } from '@/api/incentives.api'

interface IncentiveTableProps {
  rows: IncentiveRow[]
  isLoading: boolean
  onApprove: (row: IncentiveRow) => void
  onReject: (row: IncentiveRow) => void
}

const saleBadgeClass: Record<string, string> = {
  spouse: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  visitor: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
  student: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
}

const statusBadgeClass: Record<string, string> = {
  pending: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
  approved: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
  rejected: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
  ineligible: 'bg-muted text-muted-foreground',
}

interface ColFilters {
  clientName: string
  counsellorName: string
  enrollmentDate: string
  saleType: string
  eligible: 'all' | 'yes' | 'no'
  amount: string
  incentiveAmount: string
  status: string
}

const INIT_FILTERS: ColFilters = {
  clientName: '',
  counsellorName: '',
  enrollmentDate: '',
  saleType: '',
  eligible: 'all',
  amount: '',
  incentiveAmount: '',
  status: '',
}

function fmtDate(dateStr: string) {
  const d = parseISO(dateStr)
  return isValid(d) ? format(d, 'd MMM yyyy') : '—'
}

/* ── Filter sub-components ── */

function FInput({
  value,
  onChange,
  placeholder,
  align = 'left',
}: {
  value: string
  onChange: (v: string) => void
  placeholder?: string
  align?: 'left' | 'right'
}) {
  const active = value.length > 0
  return (
    <div className="relative group min-w-[90px]">
      {align === 'left' && (
        <Search className={cn(
          'absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 pointer-events-none transition-colors',
          active ? 'text-primary' : 'text-muted-foreground/40 group-focus-within:text-primary/70'
        )} />
      )}
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder ?? 'Search…'}
        className={cn(
          'w-full py-1.5 text-[11px] rounded-lg border transition-all duration-150',
          'bg-white dark:bg-background',
          'text-foreground placeholder:text-muted-foreground/40',
          'focus:outline-none focus:ring-2 focus:ring-primary/25',
          active
            ? 'border-primary/50 bg-primary/5 dark:bg-primary/10 ring-1 ring-primary/20'
            : 'border-border/50 hover:border-border',
          align === 'left' ? 'pl-6 pr-6' : 'pl-2 pr-6 text-right',
        )}
      />
      {active && (
        <button
          type="button"
          onClick={() => onChange('')}
          className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded-full p-0.5 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
        >
          <X className="w-2.5 h-2.5" />
        </button>
      )}
    </div>
  )
}

function FSelect({
  value,
  onChange,
  options,
}: {
  value: string
  onChange: (v: string) => void
  options: { label: string; value: string }[]
}) {
  const active = value !== '' && value !== 'all'
  return (
    <div className="relative min-w-[90px]">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={cn(
          'w-full pl-2 pr-6 py-1.5 text-[11px] rounded-lg border appearance-none transition-all duration-150',
          'bg-white dark:bg-background text-foreground',
          'focus:outline-none focus:ring-2 focus:ring-primary/25',
          active
            ? 'border-primary/50 bg-primary/5 dark:bg-primary/10 ring-1 ring-primary/20'
            : 'border-border/50 hover:border-border',
        )}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
      <ChevronDown className="absolute right-1.5 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground pointer-events-none" />
    </div>
  )
}

/* ── Main component ── */

export function IncentiveTable({
  rows,
  isLoading,
  onApprove,
  onReject,
}: IncentiveTableProps) {
  const [colFilters, setColFilters] = useState<ColFilters>(INIT_FILTERS)

  const setFilter = <K extends keyof ColFilters>(key: K, value: ColFilters[K]) =>
    setColFilters((prev) => ({ ...prev, [key]: value }))

  const uniqueCounsellors = useMemo(() => {
    const seen = new Set<string>()
    return rows.map((r) => r.counsellorName).filter((n) => n && !seen.has(n) && seen.add(n))
  }, [rows])

  const displayRows = useMemo(() => {
    return rows.filter((r) => {
      const dateStr = fmtDate(r.enrollmentDate).toLowerCase()
      if (colFilters.clientName && !r.clientName.toLowerCase().includes(colFilters.clientName.toLowerCase())) return false
      if (colFilters.counsellorName && r.counsellorName !== colFilters.counsellorName) return false
      if (colFilters.enrollmentDate && !dateStr.includes(colFilters.enrollmentDate.toLowerCase())) return false
      if (colFilters.saleType && !r.saleType.toLowerCase().includes(colFilters.saleType.toLowerCase())) return false
      if (colFilters.eligible === 'yes' && !r.eligible) return false
      if (colFilters.eligible === 'no' && r.eligible) return false
      if (colFilters.amount && !r.amount.toLocaleString('en-IN').includes(colFilters.amount)) return false
      if (colFilters.incentiveAmount && !r.incentiveAmount.toLocaleString('en-IN').includes(colFilters.incentiveAmount)) return false
      if (colFilters.status && !r.status.toLowerCase().includes(colFilters.status.toLowerCase())) return false
      return true
    })
  }, [rows, colFilters])

  const activeCount = Object.entries(colFilters).filter(([k, v]) =>
    k === 'eligible' ? v !== 'all' : v !== ''
  ).length

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16 text-muted-foreground text-sm">
        Loading incentives…
      </div>
    )
  }

  if (rows.length === 0) {
    return (
      <div className="flex items-center justify-center py-16 text-muted-foreground text-sm">
        No incentive records found.
      </div>
    )
  }

  return (
    <div className="space-y-0">
      {/* ── Filter bar header ── */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-border/40 bg-gradient-to-r from-slate-50 to-indigo-50/40 dark:from-muted/30 dark:to-indigo-950/10">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <SlidersHorizontal className="w-3.5 h-3.5 text-primary/70" />
          <span className="font-medium text-foreground/70">Column Filters</span>
          {activeCount > 0 && (
            <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-primary text-primary-foreground text-[10px] font-bold">
              {activeCount}
            </span>
          )}
        </div>
        {activeCount > 0 && (
          <button
            onClick={() => setColFilters(INIT_FILTERS)}
            className="flex items-center gap-1 text-[11px] font-medium text-primary hover:text-primary/80 transition-colors"
          >
            <X className="w-3 h-3" />
            Clear all
          </button>
        )}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm border-collapse">
          <thead>
            {/* ── Column labels ── */}
            <tr className="bg-muted/50 border-b border-border">
              <th className="px-4 py-3 text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wider whitespace-nowrap">Client ID</th>
              <th className="px-4 py-3 text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Client Name</th>
              <th className="px-4 py-3 text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Counsellor</th>
              <th className="px-4 py-3 text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wider whitespace-nowrap">Enrollment Date</th>
              <th className="px-4 py-3 text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Sale Type</th>
              <th className="px-4 py-3 text-center text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Eligibility</th>
              <th className="px-4 py-3 text-right text-[11px] font-semibold text-muted-foreground uppercase tracking-wider whitespace-nowrap">Received Amt</th>
              <th className="px-4 py-3 text-right text-[11px] font-semibold text-muted-foreground uppercase tracking-wider whitespace-nowrap">Incentive Amt</th>
              <th className="px-4 py-3 text-center text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Status</th>
              <th className="px-4 py-3 text-center text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Actions</th>
            </tr>

            {/* ── Column filters ── */}
            <tr className="border-b-2 border-primary/10 bg-gradient-to-r from-slate-50 to-indigo-50/40 dark:from-muted/30 dark:to-indigo-950/10">
              {/* Client ID — no filter */}
              <td className="px-2 py-2" />
              {/* Client Name */}
              <td className="px-2 py-2">
                <FInput
                  value={colFilters.clientName}
                  onChange={(v) => setFilter('clientName', v)}
                  placeholder="Name…"
                />
              </td>
              {/* Counsellor dropdown */}
              <td className="px-2 py-2">
                <FSelect
                  value={colFilters.counsellorName}
                  onChange={(v) => setFilter('counsellorName', v)}
                  options={[
                    { label: 'All Counsellors', value: '' },
                    ...uniqueCounsellors.map((n) => ({ label: n, value: n })),
                  ]}
                />
              </td>
              {/* Enrollment Date */}
              <td className="px-2 py-2">
                <FInput
                  value={colFilters.enrollmentDate}
                  onChange={(v) => setFilter('enrollmentDate', v)}
                  placeholder="Apr 2026…"
                />
              </td>
              {/* Sale Type */}
              <td className="px-2 py-2">
                <FInput
                  value={colFilters.saleType}
                  onChange={(v) => setFilter('saleType', v)}
                  placeholder="spouse…"
                />
              </td>
              {/* Eligibility */}
              <td className="px-2 py-2">
                <FSelect
                  value={colFilters.eligible}
                  onChange={(v) => setFilter('eligible', v as ColFilters['eligible'])}
                  options={[
                    { label: 'All', value: 'all' },
                    { label: 'Yes', value: 'yes' },
                    { label: 'No', value: 'no' },
                  ]}
                />
              </td>
              {/* Received Amount */}
              <td className="px-2 py-2">
                <FInput
                  value={colFilters.amount}
                  onChange={(v) => setFilter('amount', v)}
                  placeholder="50,000…"
                  align="right"
                />
              </td>
              {/* Incentive Amount */}
              <td className="px-2 py-2">
                <FInput
                  value={colFilters.incentiveAmount}
                  onChange={(v) => setFilter('incentiveAmount', v)}
                  placeholder="1,200…"
                  align="right"
                />
              </td>
              {/* Status */}
              <td className="px-2 py-2">
                <FSelect
                  value={colFilters.status}
                  onChange={(v) => setFilter('status', v)}
                  options={[
                    { label: 'All Status', value: '' },
                    { label: 'Pending', value: 'pending' },
                    { label: 'Approved', value: 'approved' },
                    { label: 'Rejected', value: 'rejected' },
                    { label: 'Ineligible', value: 'ineligible' },
                  ]}
                />
              </td>
              {/* Actions — no filter */}
              <td className="px-2 py-2" />
            </tr>
          </thead>

          <tbody>
            {displayRows.length === 0 ? (
              <tr>
                <td colSpan={10} className="px-4 py-14 text-center">
                  <div className="flex flex-col items-center gap-2 text-muted-foreground">
                    <Search className="w-8 h-8 opacity-20" />
                    <p className="text-sm font-medium">No records match the current filters</p>
                    <button
                      onClick={() => setColFilters(INIT_FILTERS)}
                      className="text-xs text-primary hover:underline"
                    >
                      Clear all filters
                    </button>
                  </div>
                </td>
              </tr>
            ) : (
              displayRows.map((row) => {
                return (
                  <tr
                    key={row.id}
                    className={cn(
                      'border-b border-border/60 transition-colors hover:bg-muted/30',
                      !row.eligible && 'opacity-60'
                    )}
                  >
                    <td className="px-4 py-3 text-primary font-semibold whitespace-nowrap text-sm">#{row.clientId}</td>
                    <td className="px-4 py-3 font-medium text-foreground">{row.clientName}</td>
                    <td className="px-4 py-3 text-muted-foreground text-sm">{row.counsellorName || '—'}</td>
                    <td className="px-4 py-3 text-muted-foreground whitespace-nowrap text-sm">{fmtDate(row.enrollmentDate)}</td>
                    <td className="px-4 py-3">
                      <span className={cn('px-2.5 py-0.5 rounded-full text-[11px] font-semibold uppercase tracking-wide',
                        saleBadgeClass[row.saleType] ?? 'bg-muted text-muted-foreground'
                      )}>
                        {row.saleType}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <EligibilityPill eligible={row.eligible} />
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-foreground">
                      ₹{row.amount.toLocaleString('en-IN')}
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-primary">
                      ₹{row.incentiveAmount.toLocaleString('en-IN')}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={cn('px-2.5 py-0.5 rounded-full text-[11px] font-semibold uppercase tracking-wide',
                        statusBadgeClass[row.status]
                      )}>
                        {row.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      {row.status === 'pending' ? (
                        <div className="flex gap-1.5 justify-center">
                          <Button size="sm" variant="ghost"
                            className="h-7 px-3 text-xs font-semibold bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800"
                            onClick={() => onApprove(row)}
                          >
                            Approve
                          </Button>
                          <Button size="sm" variant="ghost"
                            className="h-7 px-3 text-xs font-semibold bg-red-50 text-red-600 hover:bg-red-100 border border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800"
                            onClick={() => onReject(row)}
                          >
                            Reject
                          </Button>
                        </div>
                      ) : (
                        <span className="text-muted-foreground text-xs">—</span>
                      )}
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>

      {/* ── Footer summary ── */}
      {displayRows.length > 0 && (
        <div className="flex items-center justify-between px-4 py-2.5 border-t border-border/40 bg-muted/20 text-xs text-muted-foreground">
          <span>
            Showing <span className="font-semibold text-foreground">{displayRows.length}</span> of{' '}
            <span className="font-semibold text-foreground">{rows.length}</span> records
          </span>
          {activeCount > 0 && (
            <span className="text-primary font-medium">{activeCount} filter{activeCount > 1 ? 's' : ''} active</span>
          )}
        </div>
      )}
    </div>
  )
}