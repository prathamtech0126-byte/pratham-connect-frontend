import { format, parseISO, isValid } from 'date-fns'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { EligibilityPill } from './EligibilityPill'
import type { IncentiveRow } from '@/api/incentives.api'

interface IncentiveTableProps {
  rows: IncentiveRow[]
  isLoading: boolean
  onApprove: (row: IncentiveRow) => void
  onReject: (row: IncentiveRow) => void
  onEligibilityChange: (id: string, eligible: boolean) => void
}

const visaBadgeClass: Record<string, string> = {
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

export function IncentiveTable({
  rows,
  isLoading,
  onApprove,
  onReject,
  onEligibilityChange,
}: IncentiveTableProps) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16 text-muted-foreground text-sm">
        Loading incentives...
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
    <div className="overflow-x-auto">
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="bg-muted/50 border-b border-border">
            <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide whitespace-nowrap">Client ID</th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Client Name</th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Counsellor</th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide whitespace-nowrap">Enrollment Date</th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Visa Type</th>
            <th className="px-4 py-3 text-center text-xs font-semibold text-muted-foreground uppercase tracking-wide">Eligibility</th>
            <th className="px-4 py-3 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wide whitespace-nowrap">Incentive Amount</th>
            <th className="px-4 py-3 text-center text-xs font-semibold text-muted-foreground uppercase tracking-wide">Status</th>
            <th className="px-4 py-3 text-center text-xs font-semibold text-muted-foreground uppercase tracking-wide">Actions</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              key={row.id}
              className={cn(
                'border-b border-border/60 transition-colors hover:bg-muted/30',
                !row.eligible && 'opacity-60'
              )}
            >
              <td className="px-4 py-3 text-primary font-semibold whitespace-nowrap">#{row.clientId}</td>
              <td className="px-4 py-3 font-medium text-foreground">{row.clientName}</td>
              <td className="px-4 py-3 text-muted-foreground">{row.counsellorName || '—'}</td>
              <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                {(() => { const d = parseISO(row.enrollmentDate); return isValid(d) ? format(d, 'd MMM yyyy') : '—' })()}
              </td>
              <td className="px-4 py-3">
                <span className={cn('px-2.5 py-0.5 rounded-full text-[11px] font-semibold uppercase',
                  visaBadgeClass[row.visaType] ?? 'bg-muted text-muted-foreground'
                )}>
                  {row.visaType}
                </span>
              </td>
              <td className="px-4 py-3 text-center">
                <EligibilityPill
                  eligible={row.eligible}
                  onChange={(val) => onEligibilityChange(row.id, val)}
                  disabled={row.status !== 'pending'}
                />
              </td>
              <td className="px-4 py-3 text-right font-bold text-primary">
                ₹{row.incentiveAmount.toLocaleString('en-IN')}
              </td>
              <td className="px-4 py-3 text-center">
                <span className={cn('px-2.5 py-0.5 rounded-full text-[11px] font-semibold uppercase', statusBadgeClass[row.status])}>
                  {row.status}
                </span>
              </td>
              <td className="px-4 py-3 text-center">
                {row.status === 'pending' ? (
                  <div className="flex gap-2 justify-center">
                    <Button size="sm" variant="ghost" className="h-7 px-3 text-xs bg-green-50 text-green-700 hover:bg-green-100 dark:bg-green-900/20 dark:text-green-400" onClick={() => onApprove(row)}>
                      Approve
                    </Button>
                    <Button size="sm" variant="ghost" className="h-7 px-3 text-xs bg-red-50 text-red-600 hover:bg-red-100 dark:bg-red-900/20 dark:text-red-400" onClick={() => onReject(row)}>
                      Reject
                    </Button>
                  </div>
                ) : (
                  <span className="text-muted-foreground text-xs">—</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
