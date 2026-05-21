import { useState, useMemo, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useToast } from '@/hooks/use-toast'
import { useLocation } from 'wouter'
import * as XLSX from 'xlsx'
import { format, startOfMonth, endOfMonth } from 'date-fns'
import { PageWrapper } from '@/layout/PageWrapper'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  fetchIncentiveReportPeriods,
  fetchIncentivesReportAll,
  formatIncentiveSaleTypeDisplay,
  editIncentiveStatus,
  type IncentiveReportPeriod,
  type IncentiveRow,
} from '@/api/incentives.api'
import { IncentiveFilters } from '@/components/incentives/IncentiveFilters'
import { IncentiveBreakdownAccordion } from '@/components/incentives/IncentiveBreakdownAccordion'
import { ConfirmActionModal } from '@/components/incentives/ConfirmActionModal'

type SaleTypeFilter = 'all' | 'spouse' | 'visitor' | 'student' | 'other_products'
type YesNoFilter = 'all' | 'yes' | 'no'
type StatusLineFilter = 'all' | 'Pending' | 'Approved' | 'Rejected'
type QuarterNumber = 1 | 2 | 3

const SALE_TYPE_SELECT: { label: string; value: SaleTypeFilter }[] = [
  { label: 'All', value: 'all' },
  { label: 'Spouse', value: 'spouse' },
  { label: 'Visitor', value: 'visitor' },
  { label: 'Student', value: 'student' },
  { label: 'Other Products', value: 'other_products' },
]

const QUARTER_MONTH_RANGES: Record<QuarterNumber, [number, number]> = { 1: [0, 3], 2: [4, 7], 3: [8, 11] }
const FILTER_KEY = 'incentives_approved_filters'

function toYMD(d: Date) { return format(d, 'yyyy-MM-dd') }
function currentQuarter(): QuarterNumber { const m = new Date().getMonth(); return m <= 3 ? 1 : m <= 7 ? 2 : 3 }
function quarterRange(quarter: QuarterNumber, year: number) {
  const [startMonth, endMonth] = QUARTER_MONTH_RANGES[quarter]
  return { startDate: toYMD(startOfMonth(new Date(year, startMonth, 1))), endDate: toYMD(endOfMonth(new Date(year, endMonth, 1))) }
}
function defaultPeriodId(periods: IncentiveReportPeriod[]) {
  if (periods.length === 0) return ''
  const today = new Date(); today.setHours(0, 0, 0, 0)
  for (const p of periods) { const s = new Date(p.startDate); const e = new Date(p.endDate); if (today >= s && today <= e) return String(p.id) }
  return String([...periods].sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime())[0].id)
}

function loadFilters() {
  try { const raw = sessionStorage.getItem(FILTER_KEY); return raw ? JSON.parse(raw) : null } catch { return null }
}

function exportToXlsx(rows: IncentiveRow[], periodLabel: string, saleType: SaleTypeFilter) {
  const sheetData = rows.map((r) => ({
    'Client ID': r.clientId,
    'Client Name': r.clientName,
    'Counsellor': r.counsellorName,
    'Enrollment Date': r.enrollmentDate,
    'Sale Type': formatIncentiveSaleTypeDisplay(r),
    'Eligible': r.eligible ? 'Yes' : 'No',
    'Received Amount': r.amount,
    'Incentive Amount': r.incentiveAmount,
    'Status': r.status,
  }))
  const ws = XLSX.utils.json_to_sheet(sheetData)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'ApprovedRejected')
  const saleLabel = saleType === 'all' ? 'All' : saleType === 'other_products' ? 'OtherProducts' : saleType
  const safe = periodLabel.replace(/[^\w\-]+/g, '_').replace(/_+/g, '_').slice(0, 72) || 'period'
  XLSX.writeFile(wb, `Incentives_Approved_${safe}_${saleLabel}.xlsx`)
}

export default function IncentivesApprovedPage() {
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const [, setLocation] = useLocation()
  const saved = useMemo(() => loadFilters(), [])
  const initialStatus: StatusLineFilter =
    saved?.rowStatus === 'Approved' || saved?.rowStatus === 'Rejected' || saved?.rowStatus === 'Pending'
      ? saved.rowStatus
      : 'Approved'
  const [search, setSearch] = useState(saved?.search ?? '')
  const [saleType, setSaleType] = useState<SaleTypeFilter>(saved?.saleType ?? 'all')
  const [selectedPeriodId, setSelectedPeriodId] = useState<string>(saved?.selectedPeriodId ?? '')
  const [rowEligible, setRowEligible] = useState<YesNoFilter>(saved?.rowEligible ?? 'all')
  const [rowStatus, setRowStatus] = useState<StatusLineFilter>(initialStatus)
  const [counsellorName, setCounsellorName] = useState<string>(saved?.counsellorName ?? '')
  const [modalOpen, setModalOpen] = useState(false)
  const [modalAction, setModalAction] = useState<'approve' | 'reject' | 'pending'>('approve')
  const [selectedRow, setSelectedRow] = useState<IncentiveRow | null>(null)
  const [remarks, setRemarks] = useState('')

  useEffect(() => {
    sessionStorage.setItem(FILTER_KEY, JSON.stringify({ search, saleType, selectedPeriodId, rowEligible, rowStatus, counsellorName }))
  }, [search, saleType, selectedPeriodId, rowEligible, rowStatus, counsellorName])

  const { data: periods = [], isFetched: periodsFetched, isLoading: periodsLoading } = useQuery({
    queryKey: ['incentive-report-periods'],
    queryFn: fetchIncentiveReportPeriods,
    staleTime: 0,
  })

  const resolvedPeriodId = useMemo(() => {
    if (!periodsFetched) return selectedPeriodId || ''
    if (periods.length === 0) return ''
    const ids = new Set(periods.map((p) => String(p.id)))
    if (selectedPeriodId && ids.has(selectedPeriodId)) return selectedPeriodId
    return defaultPeriodId(periods)
  }, [periodsFetched, periods, selectedPeriodId])

  useEffect(() => { if (resolvedPeriodId !== selectedPeriodId) setSelectedPeriodId(resolvedPeriodId) }, [resolvedPeriodId, selectedPeriodId])

  const { startDate, endDate } = useMemo(() => {
    if (!periodsFetched || periods.length === 0) return quarterRange(currentQuarter(), new Date().getFullYear())
    const p = periods.find((x) => String(x.id) === resolvedPeriodId)
    if (p?.startDate && p?.endDate) return { startDate: p.startDate, endDate: p.endDate }
    return quarterRange(currentQuarter(), new Date().getFullYear())
  }, [periodsFetched, periods, resolvedPeriodId])

  const selectedPeriodLabel = useMemo(() => periods.find((x) => String(x.id) === resolvedPeriodId)?.name ?? 'Period', [periods, resolvedPeriodId])
  const hasReportPeriods = periodsFetched && periods.length > 0
  const activePeriod = useMemo(
    () => periods.find((x) => String(x.id) === resolvedPeriodId),
    [periods, resolvedPeriodId],
  )

  const { data: reportData, isLoading } = useQuery({
    queryKey: ['incentives-report-all', startDate, endDate],
    queryFn: () => fetchIncentivesReportAll({ startDate, endDate }),
    enabled: hasReportPeriods,
  })

  const rows = reportData?.data ?? []
  const counsellorOptions = useMemo(() => Array.from(new Set(rows.map((r) => (r.counsellorName ?? '').trim() || 'Unknown'))).sort((a, b) => a.localeCompare(b)), [rows])
  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ['incentives-report-all'] })

  const approveMutation = useMutation({
    mutationFn: ({
      row,
      remark,
      overrides,
    }: {
      row: IncentiveRow
      remark?: string
      overrides?: { coreSale?: number; allFinance?: number; otherProducts?: number }
    }) =>
      editIncentiveStatus({
        clientId: Number(row.id),
        periodId: activePeriod?.ruleConfigId,
        nextStatus: 'Approved',
        remark,
        overrides,
      }),
    onSuccess: () => {
      toast({ title: 'Approved', description: 'Incentive has been approved successfully.' })
      invalidate()
    },
    onError: (err: any) =>
      toast({ title: 'Failed to Approve', description: err?.response?.data?.message ?? 'Something went wrong.', variant: 'destructive' }),
  })

  const rejectMutation = useMutation({
    mutationFn: ({
      row,
      remark,
      overrides,
    }: {
      row: IncentiveRow
      remark: string
      overrides?: { coreSale?: number; allFinance?: number; otherProducts?: number }
    }) =>
      editIncentiveStatus({
        clientId: Number(row.id),
        periodId: activePeriod?.ruleConfigId,
        nextStatus: 'Rejected',
        remark,
        overrides,
      }),
    onSuccess: () => {
      toast({ title: 'Rejected', description: 'Incentive has been rejected.' })
      invalidate()
    },
    onError: (err: any) =>
      toast({ title: 'Failed to Reject', description: err?.response?.data?.message ?? 'Something went wrong.', variant: 'destructive' }),
  })

  const pendingMutation = useMutation({
    mutationFn: ({
      row,
      remark,
      overrides,
    }: {
      row: IncentiveRow
      remark?: string
      overrides?: { coreSale?: number; allFinance?: number; otherProducts?: number }
    }) =>
      editIncentiveStatus({
        clientId: Number(row.id),
        periodId: activePeriod?.ruleConfigId,
        nextStatus: 'Pending',
        remark,
        overrides,
      }),
    onSuccess: () => {
      toast({ title: 'Moved to Pending', description: 'Incentive status has been moved back to pending.' })
      invalidate()
    },
    onError: (err: any) =>
      toast({ title: 'Failed', description: err?.response?.data?.message ?? 'Something went wrong.', variant: 'destructive' }),
  })

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return rows.filter((r) => {
      if (saleType === 'other_products') {
        if (!(r.saleTypeIsNull && (r.otherProducts?.items?.length ?? 0) > 0)) return false
      } else if (saleType !== 'all' && r.saleType !== saleType) {
        return false
      }
      if (q && !r.clientName.toLowerCase().includes(q) && !r.clientId.includes(q) && !(r.saleTypeName ?? '').toLowerCase().includes(q)) return false
      if (counsellorName && ((r.counsellorName ?? '').trim() || 'Unknown') !== counsellorName) return false
      if (rowEligible === 'yes' && !r.eligible) return false
      if (rowEligible === 'no' && r.eligible) return false
      if (rowStatus !== 'all' && r.status !== rowStatus) return false
      return true
    })
  }, [rows, search, saleType, counsellorName, rowEligible, rowStatus])

  const handleExport = () => {
    if (!hasReportPeriods) return toast({ title: 'Cannot Export', description: 'Create a period in Manage Rules before exporting.', variant: 'destructive' })
    if (filtered.length === 0) return toast({ title: 'No Records', description: 'There are no records to export.', variant: 'destructive' })
    try { exportToXlsx(filtered, selectedPeriodLabel, saleType); toast({ title: 'Exported', description: `${filtered.length} records exported successfully.` }) } catch { toast({ title: 'Export Failed', description: 'An error occurred while exporting.', variant: 'destructive' }) }
  }

  const handleApprove = (row: IncentiveRow) => {
    setSelectedRow(row)
    setModalAction('approve')
    setRemarks('')
    setModalOpen(true)
  }

  const handleReject = (row: IncentiveRow) => {
    setSelectedRow(row)
    setModalAction('reject')
    setRemarks('')
    setModalOpen(true)
  }

  const handlePending = (row: IncentiveRow) => {
    setSelectedRow(row)
    setModalAction('pending')
    setRemarks('')
    setModalOpen(true)
  }

  const handleConfirm = () => {
    if (!selectedRow) return
    if (!remarks.trim()) {
      toast({ title: 'Remarks Required', description: 'Please enter a remark before confirming.', variant: 'destructive' })
      return
    }
    const remark = remarks.trim()
    if (modalAction === 'approve') {
      approveMutation.mutate({ row: selectedRow, remark })
      setModalOpen(false)
    } else if (modalAction === 'reject') {
      rejectMutation.mutate({ row: selectedRow, remark })
      setModalOpen(false)
    } else {
      pendingMutation.mutate({ row: selectedRow, remark })
      setModalOpen(false)
    }
  }

  return (
    <PageWrapper
      title="Approved Incentives"
      breadcrumbs={[{ label: 'Dashboard', href: '/' }, { label: 'Incentives', href: '/incentives' }, { label: 'Approved' }]}
      actions={
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => setLocation('/incentives')}>Back to Incentives</Button>
        </div>
      }
    >
      <div className="space-y-4">
        <IncentiveFilters search={search} onSearchChange={setSearch} onExport={handleExport} isExporting={false} />
        <div className="rounded-lg border border-border/70 bg-muted/15 px-3 py-2.5 sm:px-4">
          <div className="flex flex-wrap items-end gap-2">
            <div className="flex flex-col gap-0.5">
              <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">Sale type</span>
              <Select value={saleType} onValueChange={(v) => setSaleType(v as SaleTypeFilter)}>
                <SelectTrigger className="h-8 w-[130px] bg-background text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>{SALE_TYPE_SELECT.map((opt) => <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-0.5">
              <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">Counsellor</span>
              <Select value={counsellorName || '__all__'} onValueChange={(v) => setCounsellorName(v === '__all__' ? '' : v)}>
                <SelectTrigger className="h-8 min-w-[160px] bg-background text-xs"><SelectValue placeholder="All counsellors" /></SelectTrigger>
                <SelectContent><SelectItem value="__all__">All counsellors</SelectItem>{counsellorOptions.map((n) => <SelectItem key={n} value={n}>{n}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-0.5">
              <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">Eligible</span>
              <Select value={rowEligible} onValueChange={(v) => setRowEligible(v as YesNoFilter)}>
                <SelectTrigger className="h-8 w-[130px] bg-background text-xs"><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="all">All</SelectItem><SelectItem value="yes">Eligible</SelectItem><SelectItem value="no">Not eligible</SelectItem></SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-0.5">
              <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">Status</span>
              <Select value={rowStatus} onValueChange={(v) => setRowStatus(v as StatusLineFilter)}>
                <SelectTrigger className="h-8 w-[130px] bg-background text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="Pending">Pending</SelectItem>
                  <SelectItem value="Approved">Approved</SelectItem>
                  <SelectItem value="Rejected">Rejected</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex min-w-0 flex-col gap-0.5">
              <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">Period</span>
              {!periodsFetched ? (
                <div className="flex h-8 min-w-[200px] items-center rounded-md border border-input bg-background px-2.5 text-xs text-muted-foreground shadow-sm">
                  {periodsLoading ? 'Loading periods…' : '…'}
                </div>
              ) : (
                <Select value={resolvedPeriodId} onValueChange={setSelectedPeriodId}>
                  <SelectTrigger className="h-8 min-w-[200px] bg-background text-xs"><SelectValue placeholder="Period" /></SelectTrigger>
                  <SelectContent>{periods.map((p) => <SelectItem key={String(p.id)} value={String(p.id)}>{p.name}</SelectItem>)}</SelectContent>
                </Select>
              )}
            </div>
          </div>
          <div className="mt-2 border-t border-border/50 pt-2 text-sm text-muted-foreground">
            <span className="font-semibold text-foreground">{filtered.length}</span> shown
            {reportData?.summary?.totalRecords ? <span className="text-xs text-muted-foreground/90"> ({reportData.summary.totalRecords} in period)</span> : null}
          </div>
        </div>
        <div className="rounded-xl border border-border bg-card shadow-subtle overflow-hidden">
          <IncentiveBreakdownAccordion
            rows={filtered}
            isLoading={isLoading || !periodsFetched}
            onApprove={handleApprove}
            onReject={handleReject}
            onPending={handlePending}
            canEditNonPendingStatus
          />
        </div>
      </div>
      <ConfirmActionModal
        open={modalOpen}
        onClose={() => {
          setModalOpen(false)
          setRemarks('')
        }}
        onConfirm={handleConfirm}
        action={modalAction}
        row={selectedRow}
        isLoading={approveMutation.isPending || rejectMutation.isPending || pendingMutation.isPending}
        remarks={remarks}
        onRemarksChange={setRemarks}
        showOverrideAmounts={false}
        requireRemarks
      />
    </PageWrapper>
  )
}
