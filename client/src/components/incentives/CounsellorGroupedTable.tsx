import { useState, useMemo, useEffect, useRef } from 'react'
import { format, parseISO, isValid } from 'date-fns'
import { Search, X, ChevronDown, ChevronRight, SlidersHorizontal, Users, ArrowLeftRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { EligibilityPill } from './EligibilityPill'
import { ColorFilterSelect } from './ColorFilterSelect'
import { formatIncentiveSaleTypeDisplay, type IncentiveRow } from '@/api/incentives.api'

interface Props {
  rows: IncentiveRow[]
  isLoading: boolean
  onApprove: (row: IncentiveRow) => void
  onReject: (row: IncentiveRow) => void
  onDisplayRowsChange?: (rows: IncentiveRow[]) => void
}

const saleBadgeClass: Record<string, string> = {
  spouse: 'bg-blue-100 text-blue-700',
  visitor: 'bg-green-100 text-green-700',
  student: 'bg-purple-100 text-purple-700',
}

const statusBadgeClass: Record<string, string> = {
  Pending: 'bg-amber-100 text-amber-700',
  Approved: 'bg-green-100 text-green-700',
  Rejected: 'bg-red-100 text-red-600',
  Ineligible: 'bg-muted text-muted-foreground',
}

interface ColFilters {
  clientName: string
  enrollmentDate: string
  saleType: string
  eligible: 'all' | 'yes' | 'no'
  incentiveAmount: string
  status: string
}

const INIT_FILTERS: ColFilters = {
  clientName: '',
  enrollmentDate: '',
  saleType: '',
  eligible: 'all',
  incentiveAmount: '',
  status: '',
}

function fmtDate(d: string) {
  const p = parseISO(d)
  return isValid(p) ? format(p, 'd MMM yyyy') : '—'
}

function fmt(n: number) {
  return `₹${n.toLocaleString('en-IN')}`
}

function FInput({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  const active = value.length > 0
  return (
    <div className="relative group">
      <Search className={cn('absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 pointer-events-none', active ? 'text-primary' : 'text-muted-foreground/40')} />
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder ?? 'Search…'}
        className={cn(
          'w-full pl-6 pr-5 py-1 text-[11px] rounded-md border transition-all',
          'bg-white dark:bg-background text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-1 focus:ring-primary/30',
          active ? 'border-primary/50 bg-primary/5' : 'border-border/50 hover:border-border',
        )}
      />
      {active && (
        <button type="button" onClick={() => onChange('')} className="absolute right-1.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
          <X className="w-2.5 h-2.5" />
        </button>
      )}
    </div>
  )
}

function FSelect({ value, onChange, options }: { value: string; onChange: (v: string) => void; options: { label: string; value: string }[] }) {
  const active = value !== '' && value !== 'all'
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={cn(
          'w-full pl-2 pr-5 py-1 text-[11px] rounded-md border appearance-none transition-all',
          'bg-white dark:bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary/30',
          active ? 'border-primary/50 bg-primary/5' : 'border-border/50 hover:border-border',
        )}
      >
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
      <ChevronDown className="absolute right-1 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground pointer-events-none" />
    </div>
  )
}

interface CounsellorGroup {
  counsellorName: string
  clients: IncentiveRow[]
  totalIncentive: number
  eligibleCount: number
  pendingCount: number
  approvedCount: number
  rejectedCount: number
}

function buildGroups(rows: IncentiveRow[]): CounsellorGroup[] {
  const map = new Map<string, IncentiveRow[]>()
  for (const r of rows) {
    const key = r.counsellorName || 'Unknown'
    if (!map.has(key)) map.set(key, [])
    map.get(key)!.push(r)
  }
  return [...map.entries()].map(([counsellorName, clients]) => ({
    counsellorName,
    clients: [...clients].sort((a, b) => Number(b.eligible) - Number(a.eligible)),
    totalIncentive: clients.reduce((s, c) => s + c.incentiveAmount, 0),
    eligibleCount: clients.filter((c) => c.eligible).length,
    pendingCount: clients.filter((c) => c.status === 'Pending').length,
    approvedCount: clients.filter((c) => c.status === 'Approved').length,
    rejectedCount: clients.filter((c) => c.status === 'Rejected').length,
  }))
}

// ── Counsellor group row ──────────────────────────────────────────────────────

function CounsellorRow({
  group, isExpanded, onToggle, onApprove, onReject,
}: {
  group: CounsellorGroup
  isExpanded: boolean
  onToggle: () => void
  onApprove: (r: IncentiveRow) => void
  onReject: (r: IncentiveRow) => void
}) {
  return (
    <>
      {/* ── counsellor strip (full-width single cell) ── */}
      <tr
        onClick={onToggle}
        className="cursor-pointer select-none border-b border-border bg-muted/40 hover:bg-muted/60 transition-colors"
      >
        <td colSpan={9} className="px-3 py-2">
          <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
            {/* left: toggle + name + counts */}
            <div className="flex min-w-0 items-center gap-2">
              <span className="shrink-0 text-muted-foreground">
                {isExpanded
                  ? <ChevronDown className="h-3.5 w-3.5 text-primary" />
                  : <ChevronRight className="h-3.5 w-3.5" />}
              </span>
              <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10">
                <Users className="h-3 w-3 text-primary" />
              </div>
              <span className="truncate text-sm font-semibold text-foreground">{group.counsellorName}</span>
              <span className="shrink-0 text-xs text-muted-foreground">
                · {group.clients.length} client{group.clients.length !== 1 ? 's' : ''}
                &nbsp;·&nbsp;{group.eligibleCount} eligible
              </span>
            </div>

            {/* right: total + status pills */}
            <div className="flex shrink-0 flex-wrap items-center gap-1.5">
              <span className="text-sm font-bold text-primary">{fmt(group.totalIncentive)}</span>
              {group.pendingCount > 0 && (
                <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-700">
                  {group.pendingCount} pending
                </span>
              )}
              {group.approvedCount > 0 && (
                <span className="rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-semibold text-green-700">
                  {group.approvedCount} approved
                </span>
              )}
              {group.rejectedCount > 0 && (
                <span className="rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-semibold text-red-600">
                  {group.rejectedCount} rejected
                </span>
              )}
            </div>
          </div>
        </td>
      </tr>

      {/* ── client rows (aligned to column headers) ── */}
      {isExpanded && group.clients.map((row) => (
        <tr
          key={row.id}
          className={cn(
            'border-b border-border/40 transition-colors hover:bg-blue-50/30 dark:hover:bg-muted/20',
            !row.eligible && 'opacity-55'
          )}
        >
          {/* CLIENT ID — indented */}
          <td className="pl-10 pr-3 py-2.5 text-[13px] font-normal text-primary whitespace-nowrap">
            #{row.clientId}
          </td>
          {/* CLIENT NAME */}
          <td className="px-3 py-2.5 text-[13px] font-normal text-foreground">
            <div className="flex items-center gap-1.5">
              <span>{row.clientName}</span>
              {row.isSharedClient && (
                <span
                  title="Shared / transferred client"
                  className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300 shrink-0"
                >
                  <ArrowLeftRight className="w-2.5 h-2.5" />
                  Shared
                </span>
              )}
            </div>
          </td>
          {/* ENROLLMENT DATE */}
          <td className="px-3 py-2.5 text-[13px] text-muted-foreground whitespace-nowrap">{fmtDate(row.enrollmentDate)}</td>
          {/* SALE TYPE */}
          <td className="px-3 py-2.5">
            <span
              title={formatIncentiveSaleTypeDisplay(row)}
              className={cn(
                'inline-block max-w-[min(180px,36vw)] truncate px-2 py-0.5 rounded-full text-[11px] font-semibold tracking-wide align-middle',
                row.saleTypeName?.trim() ? 'normal-case' : 'uppercase',
                saleBadgeClass[row.saleType] ?? 'bg-muted text-muted-foreground',
              )}
            >
              {formatIncentiveSaleTypeDisplay(row)}
            </span>
          </td>
          {/* ELIGIBILITY */}
          <td className="px-3 py-2.5 text-center">
            <EligibilityPill eligible={row.eligible} />
          </td>
          {/* INCENTIVE AMT */}
          <td className="px-3 py-2.5 text-right text-[13px] font-normal text-primary">{fmt(row.incentiveAmount)}</td>
          {/* RECEIVED AMT */}
          <td className="px-3 py-2.5 text-right text-[13px] text-muted-foreground">{fmt(row.amount)}</td>
          {/* STATUS */}
          <td className="px-3 py-2.5 text-center">
            <span className={cn('px-2.5 py-0.5 rounded-full text-[11px] font-semibold uppercase tracking-wide', statusBadgeClass[row.status])}>
              {row.status}
            </span>
          </td>
          {/* ACTIONS */}
          <td className="px-3 py-2.5 text-center">
            {row.status === 'Pending' ? (
              <div className="flex gap-1.5 justify-center">
                <Button size="sm" variant="ghost"
                  className="h-6 px-2.5 text-xs font-semibold bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200"
                  onClick={(e) => { e.stopPropagation(); onApprove(row) }}
                >Approve</Button>
                <Button size="sm" variant="ghost"
                  className="h-6 px-2.5 text-xs font-semibold bg-red-50 text-red-600 hover:bg-red-100 border border-red-200"
                  onClick={(e) => { e.stopPropagation(); onReject(row) }}
                >Reject</Button>
              </div>
            ) : (
              <span className="text-muted-foreground text-xs">—</span>
            )}
          </td>
        </tr>
      ))}
    </>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export function CounsellorGroupedTable({ rows, isLoading, onApprove, onReject, onDisplayRowsChange }: Props) {
  const [colFilters, setColFilters] = useState<ColFilters>(INIT_FILTERS)
  const [expanded, setExpanded] = useState<Set<string>>(new Set())

  const setFilter = <K extends keyof ColFilters>(key: K, val: ColFilters[K]) =>
    setColFilters((prev) => ({ ...prev, [key]: val }))

  const activeCount = Object.entries(colFilters).filter(([k, v]) =>
    k === 'eligible' ? v !== 'all' : v !== ''
  ).length

  const displayRows = useMemo(() => rows.filter((r) => {
    if (colFilters.clientName && !r.clientName.toLowerCase().includes(colFilters.clientName.toLowerCase())) return false
    if (colFilters.enrollmentDate && !fmtDate(r.enrollmentDate).toLowerCase().includes(colFilters.enrollmentDate.toLowerCase())) return false
    if (colFilters.saleType) {
      const q = colFilters.saleType.toLowerCase()
      if (
        !r.saleType.toLowerCase().includes(q)
        && !(r.saleTypeName ?? '').toLowerCase().includes(q)
      ) {
        return false
      }
    }
    if (colFilters.eligible === 'yes' && !r.eligible) return false
    if (colFilters.eligible === 'no' && r.eligible) return false
    if (colFilters.status && !r.status.toLowerCase().includes(colFilters.status.toLowerCase())) return false
    if (colFilters.incentiveAmount && !r.incentiveAmount.toLocaleString('en-IN').includes(colFilters.incentiveAmount)) return false
    return true
  }), [rows, colFilters])

  const groups = useMemo(() => buildGroups(displayRows), [displayRows])

  const prevIdsRef = useRef('')
  useEffect(() => {
    const ids = displayRows.map((r) => r.id).join(',')
    if (ids === prevIdsRef.current) return
    prevIdsRef.current = ids
    onDisplayRowsChange?.(displayRows)
  }, [displayRows]) // eslint-disable-line react-hooks/exhaustive-deps

  const toggle = (name: string) =>
    setExpanded((prev) => { const s = new Set(prev); s.has(name) ? s.delete(name) : s.add(name); return s })

  if (isLoading) return (
    <div className="flex items-center justify-center py-16 text-muted-foreground text-sm">Loading incentives…</div>
  )

  if (rows.length === 0) return (
    <div className="flex items-center justify-center py-16 text-muted-foreground text-sm">No incentive records found.</div>
  )

  return (
    <div>
      {/* ── toolbar ── */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/40 bg-muted/20 px-4 py-2">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <SlidersHorizontal className="w-3.5 h-3.5 text-primary/60" />
          <span className="font-medium">Column Filters</span>
          {activeCount > 0 && (
            <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-primary text-primary-foreground text-[10px] font-bold">
              {activeCount}
            </span>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-3 text-[11px]">
          <button onClick={() => setExpanded(new Set(groups.map((g) => g.counsellorName)))} className="font-medium text-primary hover:text-primary/80">Expand all</button>
          <button onClick={() => setExpanded(new Set())} className="font-medium text-muted-foreground hover:text-foreground">Collapse all</button>
          {activeCount > 0 && (
            <button onClick={() => setColFilters(INIT_FILTERS)} className="flex items-center gap-1 font-medium text-primary hover:text-primary/80">
              <X className="w-3 h-3" /> Clear filters
            </button>
          )}
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm border-collapse">
          <thead>
            {/* column labels */}
            <tr className="border-b border-border bg-muted/40">
              <th className="px-4 py-2.5 text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wider whitespace-nowrap">Client ID</th>
              <th className="px-3 py-2.5 text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Client Name</th>
              <th className="px-3 py-2.5 text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wider whitespace-nowrap">Enrollment Date</th>
              <th className="px-3 py-2.5 text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Sale Type</th>
              <th className="px-3 py-2.5 text-center text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Eligibility</th>
              <th className="px-3 py-2.5 text-right text-[11px] font-semibold text-muted-foreground uppercase tracking-wider whitespace-nowrap">Incentive Amt</th>
              <th className="px-3 py-2.5 text-right text-[11px] font-semibold text-muted-foreground uppercase tracking-wider whitespace-nowrap">Received Amt</th>
              <th className="px-3 py-2.5 text-center text-[11px] font-semibold text-muted-foreground uppercase tracking-wider min-w-[120px]">Status</th>
              <th className="px-3 py-2.5 text-center text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Actions</th>
            </tr>

            {/* column filters — aligned to same 9 columns */}
            <tr className="border-b border-border/60 bg-muted/10">
              <td className="px-2 py-1.5 w-32" />
              <td className="px-2 py-1.5">
                <FInput value={colFilters.clientName} onChange={(v) => setFilter('clientName', v)} placeholder="Name…" />
              </td>
              <td className="px-2 py-1.5">
                <FInput value={colFilters.enrollmentDate} onChange={(v) => setFilter('enrollmentDate', v)} placeholder="Apr 2026…" />
              </td>
              <td className="px-2 py-1.5">
                <FInput value={colFilters.saleType} onChange={(v) => setFilter('saleType', v)} placeholder="spouse…" />
              </td>
              <td className="px-2 py-1.5">
                <ColorFilterSelect
                  value={colFilters.eligible}
                  onChange={(v) => setFilter('eligible', v as ColFilters['eligible'])}
                  options={[
                    { label: 'All', value: 'all' },
                    { label: 'Eligible', value: 'yes', dot: 'bg-green-500' },
                    { label: 'Not Eligible', value: 'no', dot: 'bg-red-500' },
                  ]}
                />
              </td>
              <td className="px-2 py-1.5">
                <FInput value={colFilters.incentiveAmount} onChange={(v) => setFilter('incentiveAmount', v)} placeholder="1,200…" />
              </td>
              <td className="px-2 py-1.5" />
              <td className="px-2 py-1.5 min-w-[120px]">
                <ColorFilterSelect
                  value={colFilters.status}
                  onChange={(v) => setFilter('status', v)}
                  options={[
                    { label: 'All Status', value: '' },
                    { label: 'Pending', value: 'Pending', dot: 'bg-amber-500' },
                    { label: 'Approved', value: 'Approved', dot: 'bg-green-500' },
                    { label: 'Rejected', value: 'Rejected', dot: 'bg-red-500' },
                  ]}
                />
              </td>
              <td className="px-2 py-1.5" />
            </tr>
          </thead>

          <tbody>
            {groups.length === 0 ? (
              <tr>
                <td colSpan={9} className="px-4 py-14 text-center">
                  <div className="flex flex-col items-center gap-2 text-muted-foreground">
                    <Search className="w-7 h-7 opacity-20" />
                    <p className="text-sm font-medium">No records match the current filters</p>
                    <button onClick={() => setColFilters(INIT_FILTERS)} className="text-xs text-primary hover:underline">Clear filters</button>
                  </div>
                </td>
              </tr>
            ) : groups.map((group) => (
              <CounsellorRow
                key={group.counsellorName}
                group={group}
                isExpanded={expanded.has(group.counsellorName)}
                onToggle={() => toggle(group.counsellorName)}
                onApprove={onApprove}
                onReject={onReject}
              />
            ))}
          </tbody>
        </table>
      </div>

      {/* footer */}
      {groups.length > 0 && (
        <div className="flex items-center justify-between px-4 py-2 border-t border-border/40 bg-muted/10 text-xs text-muted-foreground">
          <span>
            <span className="font-semibold text-foreground">{groups.length}</span> counsellor{groups.length !== 1 ? 's' : ''}
            {' · '}
            <span className="font-semibold text-foreground">{displayRows.length}</span> client{displayRows.length !== 1 ? 's' : ''}
            {rows.length !== displayRows.length && <> of <span className="font-semibold text-foreground">{rows.length}</span></>}
          </span>
          {activeCount > 0 && <span className="text-primary font-medium">{activeCount} filter{activeCount > 1 ? 's' : ''} active</span>}
        </div>
      )}
    </div>
  )
}
