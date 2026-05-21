import { useState, useMemo, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useToast } from '@/hooks/use-toast'
import { useLocation } from 'wouter'
import { useAuth } from '@/context/auth-context'
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { ChevronLeft, ChevronRight, CheckCheck } from 'lucide-react'
import {
  fetchIncentivesReport,
  fetchIncentiveReportPeriods,
  fetchIncentiveBreakdown,
  approveOrRejectIncentive,
  editIncentiveStatus,
  bulkApproveIncentiveRecords,
  updateBreakdownAction,
  formatIncentiveSaleTypeDisplay,
  type IncentiveRow,
  type IncentiveReportPeriod,
  type BreakdownItem,
} from '@/api/incentives.api'
import { IncentiveFilters } from '@/components/incentives/IncentiveFilters'
import { IncentiveBreakdownAccordion } from '@/components/incentives/IncentiveBreakdownAccordion'
import { ConfirmActionModal } from '@/components/incentives/ConfirmActionModal'
import { IncentiveInfoModal } from '@/components/incentives/IncentiveInfoModal'

type IncentiveSelectionPreview = {
  incentiveAmount: number
  hasCustomSelection: boolean
  items: Array<{
    section: 'Core Sale' | 'All Finance' | 'Other Products'
    label: string
    selected: boolean
  }>
}

type SaleTypeFilter = 'all' | 'spouse' | 'visitor' | 'student' | 'other_products'

type YesNoFilter = 'all' | 'yes' | 'no'

/** Review workflow only (matches incentive list actions). */
type StatusLineFilter = 'all' | 'Pending' | 'Approved' | 'Rejected'

/** Legacy session keys for quarter-based filters before period ids. */
type QuarterNumber = 1 | 2 | 3

const PAGE_SIZE_OPTIONS = [
  { label: '25', value: 25 },
  { label: '50', value: 50 },
  { label: '100', value: 100 },
  { label: 'ALL', value: 99999 },
]

const SALE_TYPE_SELECT: { label: string; value: SaleTypeFilter }[] = [
  { label: 'All', value: 'all' },
  { label: 'Spouse', value: 'spouse' },
  { label: 'Visitor', value: 'visitor' },
  { label: 'Student', value: 'student' },
  { label: 'Other Products', value: 'other_products' },
]

// Q1: Jan–Apr (months 0–3), Q2: May–Aug (4–7), Q3: Sep–Dec (8–11)
const QUARTER_MONTH_RANGES: Record<QuarterNumber, [number, number]> = {
  1: [0, 3],
  2: [4, 7],
  3: [8, 11],
}

function defaultPeriodId(periods: IncentiveReportPeriod[]): string {
  if (periods.length === 0) return ''
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  for (const p of periods) {
    const s = new Date(p.startDate)
    const e = new Date(p.endDate)
    if (today >= s && today <= e) return String(p.id)
  }
  const sorted = [...periods].sort(
    (a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime(),
  )
  return String(sorted[0].id)
}

function currentQuarter(): QuarterNumber {
  const m = new Date().getMonth()
  if (m <= 3) return 1
  if (m <= 7) return 2
  return 3
}

function toYMD(d: Date): string {
  return format(d, 'yyyy-MM-dd')
}

function quarterRange(quarter: QuarterNumber, year: number): { startDate: string; endDate: string } {
  const [startMonth, endMonth] = QUARTER_MONTH_RANGES[quarter]
  return {
    startDate: toYMD(startOfMonth(new Date(year, startMonth, 1))),
    endDate: toYMD(endOfMonth(new Date(year, endMonth, 1))),
  }
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
  XLSX.utils.book_append_sheet(wb, ws, 'Incentives')

  const saleLabel = saleType === 'all' ? 'All' : saleType === 'other_products' ? 'OtherProducts' : saleType
  const safe = periodLabel.replace(/[^\w\-]+/g, '_').replace(/_+/g, '_').slice(0, 72) || 'period'
  XLSX.writeFile(wb, `Incentives_${safe}_${saleLabel}.xlsx`)
}

const FILTER_KEY = 'incentives_filters'

function loadFilters() {
  try {
    const raw = sessionStorage.getItem(FILTER_KEY)
    if (!raw) return null
    return JSON.parse(raw) as {
      search: string
      saleType: SaleTypeFilter
      selectedPeriodId?: string
      /** @deprecated migrated to selectedPeriodId `__cal:q:year` */
      selectedQuarter?: QuarterNumber
      selectedYear?: number
      page: number
      pageSize: number
      rowEligible?: YesNoFilter
      rowStatus?: StatusLineFilter
      counsellorName?: string
    }
  } catch {
    return null
  }
}

function initialSelectedPeriodId(saved: ReturnType<typeof loadFilters>): string {
  if (saved?.selectedPeriodId) return saved.selectedPeriodId
  if (saved?.selectedQuarter != null && saved?.selectedYear != null) {
    return `__cal:${saved.selectedQuarter}:${saved.selectedYear}`
  }
  return ''
}

export default function IncentivesPage() {
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const [, setLocation] = useLocation()
  const { user } = useAuth()

  const saved = useMemo(() => loadFilters(), [])

  const [search, setSearch] = useState(saved?.search ?? '')
  const [saleType, setSaleType] = useState<SaleTypeFilter>(saved?.saleType ?? 'all')
  const [selectedPeriodId, setSelectedPeriodId] = useState<string>(() => initialSelectedPeriodId(saved))
  const [page, setPage] = useState(saved?.page ?? 1)
  const [pageSize, setPageSize] = useState(saved?.pageSize ?? 99999)

  const [rowEligible, setRowEligible] = useState<YesNoFilter>(saved?.rowEligible ?? 'all')
  const savedStatus = String(saved?.rowStatus ?? '')
  const initialStatus: StatusLineFilter =
    savedStatus === 'Pending' || savedStatus === 'Approved' || savedStatus === 'Rejected'
      ? savedStatus
      : savedStatus === 'pending'
        ? 'Pending'
        : savedStatus === 'approved'
          ? 'Approved'
          : savedStatus === 'rejected'
            ? 'Rejected'
      : 'all'
  const [rowStatus, setRowStatus] = useState<StatusLineFilter>(initialStatus)
  const [counsellorName, setCounsellorName] = useState<string>(saved?.counsellorName ?? '')

  useEffect(() => {
    sessionStorage.setItem(
      FILTER_KEY,
      JSON.stringify({
        search,
        saleType,
        selectedPeriodId,
        page,
        pageSize,
        rowEligible,
        rowStatus,
        counsellorName,
      }),
    )
  }, [
    search,
    saleType,
    selectedPeriodId,
    page,
    pageSize,
    rowEligible,
    rowStatus,
    counsellorName,
  ])

  const [infoOpen, setInfoOpen] = useState(false)
  const [bulkConfirmOpen, setBulkConfirmOpen] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [modalAction, setModalAction] = useState<'approve' | 'reject' | 'pending'>('approve')
  const [selectedRow, setSelectedRow] = useState<IncentiveRow | null>(null)
  const [selectedRowPreview, setSelectedRowPreview] = useState<IncentiveSelectionPreview | null>(null)
  const [remarks, setRemarks] = useState('')
  const [selectedRecordIds, setSelectedRecordIds] = useState<number[]>([])
  const [breakdownByRecord, setBreakdownByRecord] = useState<
    Record<number, { loading: boolean; data: BreakdownItem[] }>
  >({})
  const [breakdownSelection, setBreakdownSelection] = useState<
    Record<number, Record<number, { selected: boolean; status: 'APPROVED' | 'REJECTED' | 'PENDING' }>>
  >({})
  const [breakdownActionLoadingByRecord, setBreakdownActionLoadingByRecord] = useState<Record<number, boolean>>({})

  const {
    data: apiPeriods = [],
    isFetched: periodsFetched,
    isLoading: periodsLoading,
  } = useQuery({
    queryKey: ['incentive-report-periods'],
    queryFn: fetchIncentiveReportPeriods,
    /** Period labels can change in localStorage (Manage Rules rename); refetch often. */
    staleTime: 0,
  })

  const periodsForUi = useMemo(() => {
    if (!periodsFetched) return []
    return apiPeriods
  }, [apiPeriods, periodsFetched])

  const hasReportPeriods = periodsFetched && periodsForUi.length > 0

  const resolvedPeriodId = useMemo(() => {
    if (!periodsFetched) {
      return selectedPeriodId || ''
    }
    if (periodsForUi.length === 0) {
      return ''
    }
    const ids = new Set(periodsForUi.map((p) => String(p.id)))
    if (selectedPeriodId && ids.has(selectedPeriodId)) return selectedPeriodId
    return defaultPeriodId(periodsForUi)
  }, [periodsFetched, periodsForUi, selectedPeriodId])

  useEffect(() => {
    if (resolvedPeriodId !== selectedPeriodId) {
      setSelectedPeriodId(resolvedPeriodId)
    }
  }, [resolvedPeriodId, selectedPeriodId])

  const { startDate, endDate } = useMemo(() => {
    if (!periodsFetched || periodsForUi.length === 0) {
      return quarterRange(currentQuarter(), new Date().getFullYear())
    }
    const p = periodsForUi.find((x) => String(x.id) === resolvedPeriodId)
    if (p?.startDate && p?.endDate) return { startDate: p.startDate, endDate: p.endDate }
    return quarterRange(currentQuarter(), new Date().getFullYear())
  }, [periodsFetched, periodsForUi, resolvedPeriodId])

  const selectedPeriodLabel = useMemo(() => {
    const p = periodsForUi.find((x) => String(x.id) === resolvedPeriodId)
    return p?.name ?? 'Period'
  }, [periodsForUi, resolvedPeriodId])

  const { data: reportData, isLoading } = useQuery({
    queryKey: ['incentives-report', startDate, endDate, page, pageSize],
    queryFn: () => fetchIncentivesReport({ startDate, endDate, page, pageSize }),
    enabled: hasReportPeriods,
  })

  const rows = reportData?.data ?? []
  const pagination = reportData?.pagination

  const resolveIncentiveRecordId = (idOrClientId: number): number => {
    const byClient = rows.find((r) => Number(r.clientId) === idOrClientId)
    if (byClient) return Number(byClient.incentiveRecordId)
    const byRecord = rows.find((r) => Number(r.incentiveRecordId) === idOrClientId)
    if (byRecord) return Number(byRecord.incentiveRecordId)
    return idOrClientId
  }

  const selectedClientIds = useMemo(() => {
    const set = new Set<string>()
    for (const id of selectedRecordIds) {
      const row = rows.find((r) => Number(r.incentiveRecordId) === id)
      if (row) set.add(row.clientId)
    }
    return set
  }, [selectedRecordIds, rows])

  const handleToggleClientSelect = (clientId: string, checked: boolean) => {
    const recordId = resolveIncentiveRecordId(Number(clientId))
    setSelectedRecordIds((prev) =>
      checked
        ? prev.includes(recordId) ? prev : [...prev, recordId]
        : prev.filter((id) => id !== recordId),
    )
  }

  useEffect(() => {
    setSelectedRecordIds([])
  }, [startDate, endDate, page, pageSize])

  const counsellorOptions = useMemo(() => {
    const seen = new Set<string>()
    const list: string[] = []
    for (const r of rows) {
      const n = (r.counsellorName ?? '').trim() || 'Unknown'
      if (!seen.has(n)) {
        seen.add(n)
        list.push(n)
      }
    }
    return list.sort((a, b) => a.localeCompare(b))
  }, [rows])

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['incentives-report'] })
    queryClient.invalidateQueries({ queryKey: ['incentives-report-all'] })
  }

  const approveMutation = useMutation({
    mutationFn: ({
      row,
      remark,
      overrideAmount,
      overrideCoreSale,
      overrideAllFinance,
      overrideOtherProducts,
    }: {
      row: IncentiveRow
      remark?: string
      overrideAmount?: number
      overrideCoreSale?: number | null
      overrideAllFinance?: number | null
      overrideOtherProducts?: number | null
    }) =>
      approveOrRejectIncentive({
        clientId: Number(row.clientId),
        incentive_record_id: row.incentiveRecordId,
        action: 'APPROVE',
        remark,
        overrideAmount,
        overrideCoreSale,
        overrideAllFinance,
        overrideOtherProducts,
      }),
    onSuccess: () => {
      toast({ title: 'Approved', description: 'Incentive has been approved.' })
      invalidate()
    },
    onError: (err: any) =>
      toast({ title: 'Failed to Approve', description: err?.response?.data?.message ?? 'Something went wrong.', variant: 'destructive' }),
  })

  const rejectMutation = useMutation({
    mutationFn: ({
      row,
      remark,
    }: {
      row: IncentiveRow
      remark: string
    }) =>
      approveOrRejectIncentive({
        clientId: Number(row.clientId),
        incentive_record_id: row.incentiveRecordId,
        action: 'REJECT',
        remark,
      }),
    onSuccess: () => {
      toast({ title: 'Rejected', description: 'Incentive has been rejected.' })
      invalidate()
    },
    onError: (err: any) =>
      toast({ title: 'Failed to Reject', description: err?.response?.data?.message ?? 'Something went wrong.', variant: 'destructive' }),
  })

  const pendingMutation = useMutation({
    mutationFn: ({ row, remark }: { row: IncentiveRow; remark?: string }) =>
      editIncentiveStatus({ clientId: Number(row.clientId), nextStatus: 'Pending', remark }),
    onSuccess: () => {
      toast({ title: 'Reverted to Pending', description: 'Incentive status has been set back to pending.' })
      invalidate()
    },
    onError: (err: any) =>
      toast({ title: 'Failed', description: err?.response?.data?.message ?? 'Something went wrong.', variant: 'destructive' }),
  })

  const editAmountMutation = useMutation({
    mutationFn: ({ row, section, amount, remark }: {
      row: IncentiveRow
      section: 'coreSale' | 'allFinance' | 'otherProducts'
      amount: number
      remark: string
    }) => {
      // Preserve existing overrides for sections not being edited.
      const overrides: { coreSale?: number; allFinance?: number; otherProducts?: number } = {
        coreSale: section === 'coreSale' ? amount
          : typeof row.overrideCoreSale === 'number' ? row.overrideCoreSale : undefined,
        allFinance: section === 'allFinance' ? amount
          : typeof row.overrideAllFinance === 'number' ? row.overrideAllFinance : undefined,
        otherProducts: section === 'otherProducts' ? amount
          : typeof row.overrideOtherProducts === 'number' ? row.overrideOtherProducts : undefined,
      }
      // Calculate total override: use the new amount for the edited section,
      // fall back to the existing override or rule-computed value for others.
      const effectiveCoreSale = section === 'coreSale' ? amount
        : typeof row.overrideCoreSale === 'number' ? row.overrideCoreSale
        : row.coreSale.incentive
      const effectiveAllFinance = section === 'allFinance' ? amount
        : typeof row.overrideAllFinance === 'number' ? row.overrideAllFinance
        : row.allFinance.incentive
      const effectiveOtherProducts = section === 'otherProducts' ? amount
        : typeof row.overrideOtherProducts === 'number' ? row.overrideOtherProducts
        : row.otherProducts.incentive
      const overrideAmount = effectiveCoreSale + effectiveAllFinance + effectiveOtherProducts
      return editIncentiveStatus({ clientId: Number(row.clientId), nextStatus: 'Pending', overrides, overrideAmount, remark })
    },
    onSuccess: () => {
      toast({ title: 'Amount Updated', description: 'Incentive amount updated and reverted to pending.' })
      invalidate()
    },
    onError: (err: any) =>
      toast({ title: 'Failed to Update Amount', description: err?.response?.data?.message ?? 'Something went wrong.', variant: 'destructive' }),
  })

  const bulkApproveMutation = useMutation({
    mutationFn: (ids: number[]) =>
      bulkApproveIncentiveRecords({
        mode: 'SELECTED',
        recordIds: ids,
        status: 'APPROVED',
        approvedBy: Number(user?.id),
      }),
    onSuccess: (data) => {
      setBulkConfirmOpen(false)
      setSelectedRecordIds([])
      toast({
        title: 'Bulk Approved',
        description: `${data.approvedCount ?? 0} records approved` + (data.skippedCount ? `, ${data.skippedCount} skipped` : '') + '.',
      })
      invalidate()
    },
    onError: (err: any) => {
      setBulkConfirmOpen(false)
      toast({ title: 'Bulk Approval Failed', description: err?.response?.data?.message ?? 'Something went wrong.', variant: 'destructive' })
    },
  })

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return rows.filter((r) => {
      if (saleType === 'other_products') {
        if (!(r.saleTypeIsNull && (r.otherProducts?.items?.length ?? 0) > 0)) return false
      } else if (saleType !== 'all' && r.saleType !== saleType) {
        return false
      }
      if (
        q
        && !r.clientName.toLowerCase().includes(q)
        && !r.clientId.includes(q)
        && !(r.saleTypeName ?? '').toLowerCase().includes(q)
      ) {
        return false
      }
      if (counsellorName) {
        const rowCounsellor = (r.counsellorName ?? '').trim() || 'Unknown'
        if (rowCounsellor !== counsellorName) return false
      }
      if (rowEligible === 'yes' && !r.eligible) return false
      if (rowEligible === 'no' && r.eligible) return false
      if (rowStatus !== 'all' && r.status !== rowStatus) return false
      return true
    })
  }, [rows, search, saleType, counsellorName, rowEligible, rowStatus])

  const rowFiltersActive =
    Boolean(counsellorName) || rowEligible !== 'all' || rowStatus !== 'all' || saleType !== 'all'

  const clearRowFilters = () => {
    setCounsellorName('')
    setRowEligible('all')
    setRowStatus('all')
    setSaleType('all')
  }

  const handlePeriodIdChange = (id: string) => {
    setSelectedPeriodId(id)
    setPage(1)
  }

  const handlePageSizeChange = (size: number) => {
    setPageSize(size)
    setPage(1)
  }

  const handleViewBreakdown = async (recordId: number) => {
    const targetRecordId = resolveIncentiveRecordId(recordId)
    setBreakdownByRecord((prev) => ({
      ...prev,
      [recordId]: { loading: true, data: prev[recordId]?.data ?? [] },
    }))
    try {
      const res = await fetchIncentiveBreakdown(targetRecordId)
      setBreakdownByRecord((prev) => ({
        ...prev,
        [recordId]: { loading: false, data: res.data ?? [] },
      }))
      setBreakdownSelection((prev) => {
        const existing = prev[recordId] ?? {}
        const next: Record<number, { selected: boolean; status: 'APPROVED' | 'REJECTED' | 'PENDING' }> = {}
        for (const item of res.data ?? []) {
          const status = String(item.status ?? 'PENDING').toUpperCase()
          const normalizedStatus =
            status === 'APPROVED' || status === 'REJECTED' || status === 'PENDING' ? status : 'PENDING'
          next[item.breakdown_id] = existing[item.breakdown_id] ?? { selected: false, status: normalizedStatus }
        }
        return { ...prev, [recordId]: next }
      })
    } catch (err: any) {
      setBreakdownByRecord((prev) => ({
        ...prev,
        [recordId]: { loading: false, data: prev[recordId]?.data ?? [] },
      }))
      toast({ title: 'Failed to Load Breakdown', description: err?.response?.data?.message ?? 'Something went wrong.', variant: 'destructive' })
    }
  }

  const toggleBreakdownSelection = (recordId: number, breakdownId: number, checked: boolean) => {
    const targetRecordId = resolveIncentiveRecordId(recordId)
    setBreakdownSelection((prev) => {
      const recordSelection = {
        ...(prev[recordId] ?? {}),
        [breakdownId]: {
          selected: checked,
          status: prev[recordId]?.[breakdownId]?.status ?? 'PENDING',
        },
      }
      const hasAnySelected = Object.values(recordSelection).some((item) => item.selected)
      setSelectedRecordIds((ids) =>
        hasAnySelected
          ? (ids.includes(targetRecordId) ? ids : [...ids, targetRecordId])
          : ids.filter((id) => id !== targetRecordId),
      )
      return {
        ...prev,
        [recordId]: recordSelection,
      }
    })
  }

  const changeBreakdownStatus = (
    recordId: number,
    breakdownId: number,
    status: 'APPROVED' | 'REJECTED' | 'PENDING',
  ) => {
    setBreakdownSelection((prev) => ({
      ...prev,
      [recordId]: {
        ...(prev[recordId] ?? {}),
        [breakdownId]: {
          selected: prev[recordId]?.[breakdownId]?.selected ?? false,
          status,
        },
      },
    }))
  }

  const handleApproveSelectedBreakdowns = async (recordId: number) => {
    const targetRecordId = resolveIncentiveRecordId(recordId)
    const selected = Object.entries(breakdownSelection[recordId] ?? {})
      .filter(([, v]) => v.selected && v.status !== 'PENDING')
      .map(([id, v]) => ({ breakdown_id: Number(id), status: v.status as 'APPROVED' | 'REJECTED' }))

    if (selected.length === 0) {
      toast({ title: 'No Items Selected', description: 'Select breakdown items with APPROVED/REJECTED status.', variant: 'destructive' })
      return
    }

    setBreakdownActionLoadingByRecord((prev) => ({ ...prev, [recordId]: true }))
    try {
      await updateBreakdownAction({
        incentive_record_id: targetRecordId,
        actions: selected,
      })
      toast({ title: 'Breakdown Updated', description: 'Breakdown actions have been saved.' })
      await handleViewBreakdown(recordId)
      invalidate()
    } catch (err: any) {
      toast({ title: 'Failed to Update Breakdown', description: err?.response?.data?.message ?? 'Something went wrong.', variant: 'destructive' })
    } finally {
      setBreakdownActionLoadingByRecord((prev) => ({ ...prev, [recordId]: false }))
    }
  }

  const handleExport = () => {
    if (periodsForUi.length === 0) {
      toast({ title: 'No Period Created', description: 'Create a period in Manage Rules before exporting.', variant: 'destructive' })
      return
    }
    if (filtered.length === 0) {
      toast({ title: 'No Records', description: 'No records to export.', variant: 'destructive' })
      return
    }
    try {
      exportToXlsx(filtered, selectedPeriodLabel, saleType)
      toast({ title: 'Exported', description: `${filtered.length} records exported successfully.` })
    } catch {
      toast({ title: 'Export Failed', description: 'Could not export records.', variant: 'destructive' })
    }
  }

  const handleApprove = (row: IncentiveRow, preview?: IncentiveSelectionPreview) => {
    setSelectedRow(row)
    setSelectedRowPreview(preview ?? null)
    setModalAction('approve')
    setRemarks('')
    setModalOpen(true)
  }

  const handleReject = (row: IncentiveRow, preview?: IncentiveSelectionPreview) => {
    setSelectedRow(row)
    setSelectedRowPreview(preview ?? null)
    setModalAction('reject')
    setRemarks('')
    setModalOpen(true)
  }

  const handlePending = (row: IncentiveRow) => {
    setSelectedRow(row)
    setSelectedRowPreview(null)
    setModalAction('pending')
    setRemarks('')
    setModalOpen(true)
  }

  const handleEditAmount = (row: IncentiveRow, section: 'coreSale' | 'allFinance' | 'otherProducts', amount: number, remark: string) => {
    editAmountMutation.mutate({ row, section, amount, remark })
  }

  const handleConfirm = () => {
    if (!selectedRow) return
    if (!remarks.trim()) {
      toast({ title: 'Remarks Required', description: 'Please provide a reason before proceeding.', variant: 'destructive' })
      return
    }
    const remark = remarks.trim()
    if (modalAction === 'approve') {
      const overrideAmount = selectedRowPreview?.hasCustomSelection
        ? selectedRowPreview.incentiveAmount
        : undefined
      approveMutation.mutate({
        row: selectedRow,
        remark,
        overrideAmount,
        overrideCoreSale: selectedRow.overrideCoreSale ?? null,
        overrideAllFinance: selectedRow.overrideAllFinance ?? null,
        overrideOtherProducts: selectedRow.overrideOtherProducts ?? null,
      })
      setSelectedRowPreview(null)
      setModalOpen(false)
    } else if (modalAction === 'reject') {
      rejectMutation.mutate({ row: selectedRow, remark })
      setSelectedRowPreview(null)
      setModalOpen(false)
    } else {
      pendingMutation.mutate({ row: selectedRow, remark })
      setSelectedRowPreview(null)
      setModalOpen(false)
    }
  }

  const totalRecords = pagination?.totalRecords ?? 0
  const totalPages = Math.max(1, Math.ceil(totalRecords / Math.max(1, pageSize)))

  return (
    <PageWrapper
      title="Incentive Management"
      breadcrumbs={[
        { label: 'Dashboard', href: '/' },
        { label: 'Incentives' },
      ]}
      actions={
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => setBulkConfirmOpen(true)}
            disabled={!hasReportPeriods || selectedRecordIds.length === 0 || bulkApproveMutation.isPending}
            className="gap-1.5"
          >
            <CheckCheck className="h-4 w-4" />
            Bulk Approve{selectedRecordIds.length > 0 ? ` (${selectedRecordIds.length})` : ''}
          </Button>
          <Button onClick={() => setLocation('/incentives/approved')}>
            View Approved
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        <IncentiveFilters
          search={search}
          onSearchChange={setSearch}
          onExport={handleExport}
          isExporting={false}
        />

        {/* Row filters: dropdowns, then summary line below in the same card */}
        <div className="rounded-lg border border-border/70 bg-muted/15 px-3 py-2.5 sm:px-4">
          <div className="flex flex-wrap items-end justify-between gap-x-3 gap-y-2">
            <div className="flex min-w-0 flex-1 flex-wrap items-end gap-x-2 gap-y-2">
              <div className="flex flex-col gap-0.5">
                <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">Sale type</span>
                <Select value={saleType} onValueChange={(v) => setSaleType(v as SaleTypeFilter)}>
                  <SelectTrigger className="h-8 w-[130px] bg-background text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SALE_TYPE_SELECT.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex min-w-0 flex-col gap-0.5">
                <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">Counsellor</span>
                <Select
                  value={counsellorName || '__all__'}
                  onValueChange={(v) => setCounsellorName(v === '__all__' ? '' : v)}
                >
                  <SelectTrigger className="h-8 min-w-[160px] max-w-[min(280px,85vw)] bg-background text-xs">
                    <SelectValue placeholder="All counsellors" />
                  </SelectTrigger>
                  <SelectContent className="max-h-[280px]">
                    <SelectItem value="__all__">All counsellors</SelectItem>
                    {counsellorOptions.map((name) => (
                      <SelectItem key={name} value={name}>
                        {name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-0.5">
                <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">Eligible</span>
                <Select value={rowEligible} onValueChange={(v) => setRowEligible(v as YesNoFilter)}>
                  <SelectTrigger className="h-8 w-[130px] bg-background text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="yes">Eligible</SelectItem>
                    <SelectItem value="no">Not eligible</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-0.5">
                <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">Status</span>
                <Select value={rowStatus} onValueChange={(v) => setRowStatus(v as StatusLineFilter)}>
                  <SelectTrigger className="h-8 w-[130px] bg-background text-xs">
                    <SelectValue />
                  </SelectTrigger>
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
                  <div className="flex h-8 min-w-[200px] max-w-[min(320px,90vw)] items-center rounded-md border border-input bg-background px-2.5 text-xs text-muted-foreground shadow-sm">
                    {periodsLoading ? 'Loading periods…' : '…'}
                  </div>
                ) : periodsForUi.length === 0 ? (
                  <div
                    className="flex h-8 min-w-[200px] max-w-[min(320px,90vw)] items-center justify-between gap-2 rounded-md border border-input bg-background px-2.5 text-xs shadow-sm ring-offset-background"
                    title="Create a period in Incentive Rules to filter this report by date range."
                  >
                    <span className="min-w-0 truncate text-muted-foreground">No period created</span>
                    <button
                      type="button"
                      className="shrink-0 font-medium text-primary hover:underline"
                      onClick={() => setLocation('/incentives/rules')}
                    >
                      Manage Rules
                    </button>
                  </div>
                ) : (
                  <Select value={resolvedPeriodId} onValueChange={handlePeriodIdChange}>
                    <SelectTrigger className="h-8 min-w-[200px] max-w-[min(320px,90vw)] bg-background text-xs">
                      <SelectValue placeholder="Period" />
                    </SelectTrigger>
                    <SelectContent className="max-h-[320px]">
                      {periodsForUi.map((p) => (
                        <SelectItem key={String(p.id)} value={String(p.id)}>
                          <span className="truncate">{p.name}</span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2 text-sm text-muted-foreground sm:ml-auto sm:flex-shrink-0">
              <span className="hidden sm:inline whitespace-nowrap">Rows per page</span>
              <Select
                value={String(pageSize)}
                onValueChange={(v) => handlePageSizeChange(Number(v))}
              >
                <SelectTrigger className="h-8 w-[75px] bg-background text-foreground">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PAGE_SIZE_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={String(opt.value)}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="mt-2 flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-1 border-t border-border/50 pt-2 text-sm text-muted-foreground">
            <span>
              <span className="font-semibold text-foreground">{filtered.length}</span>
              {' '}shown
              {rows.length > 0 && filtered.length !== rows.length ? (
                <span className="text-muted-foreground/80"> · {rows.length} loaded</span>
              ) : null}
            </span>
            {totalRecords > 0 ? (
              <span className="text-xs text-muted-foreground/90">({totalRecords} in period)</span>
            ) : null}
            {rowFiltersActive && (
              <button
                type="button"
                onClick={clearRowFilters}
                className="text-xs font-medium text-primary hover:underline"
              >
                Clear row filters
              </button>
            )}
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card shadow-subtle overflow-hidden">
          <IncentiveBreakdownAccordion
            rows={filtered}
            isLoading={isLoading || !periodsFetched}
            onApprove={handleApprove}
            onReject={handleReject}
            onPending={handlePending}
            onEditAmount={handleEditAmount}
            canEditNonPendingStatus
            onViewBreakdown={handleViewBreakdown}
            breakdownByRecord={breakdownByRecord}
            breakdownSelection={breakdownSelection}
            breakdownActionLoadingByRecord={breakdownActionLoadingByRecord}
            onToggleBreakdownSelection={toggleBreakdownSelection}
            onChangeBreakdownStatus={changeBreakdownStatus}
            onApproveSelectedBreakdowns={handleApproveSelectedBreakdowns}
            selectedClientIds={selectedClientIds}
            onToggleClientSelect={handleToggleClientSelect}
          />

          {/* Pagination bar */}
          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border px-4 py-3 text-sm text-muted-foreground sm:justify-end sm:gap-3">
            <span className="text-xs sm:text-sm">
              Page {page} of {totalPages}
              {totalRecords > 0 && (
                <span className="ml-1 text-muted-foreground/60">({totalRecords} total)</span>
              )}
            </span>
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                disabled={page <= 1 || isLoading || !hasReportPeriods}
                onClick={() => setPage((p) => p - 1)}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                disabled={page >= totalPages || isLoading || !hasReportPeriods}
                onClick={() => setPage((p) => p + 1)}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Bulk approve confirmation */}
      <Dialog open={bulkConfirmOpen} onOpenChange={(o) => { if (!bulkApproveMutation.isPending) setBulkConfirmOpen(o) }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/30">
                <CheckCheck className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
              </div>
              <DialogTitle className="font-heading text-base">Bulk Approve Incentives?</DialogTitle>
            </div>
          </DialogHeader>
          <div className="rounded-lg border border-border bg-muted/30 px-4 py-3 space-y-1.5 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Period</span>
              <span className="font-medium text-foreground">{selectedPeriodLabel}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Selected records</span>
              <span className="font-bold text-primary">
                {selectedRecordIds.length}
              </span>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            Selected incentives will be approved. This action cannot be undone.
          </p>
          <DialogFooter className="gap-2 pt-2">
            <Button
              variant="outline"
              onClick={() => setBulkConfirmOpen(false)}
              disabled={bulkApproveMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              onClick={() => bulkApproveMutation.mutate(selectedRecordIds)}
              disabled={bulkApproveMutation.isPending || selectedRecordIds.length === 0}
            >
              {bulkApproveMutation.isPending ? 'Approving…' : 'Approve Selected'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <IncentiveInfoModal
        open={infoOpen}
        onClose={() => setInfoOpen(false)}
        info={reportData?.info}
      />

      <ConfirmActionModal
        open={modalOpen}
        onClose={() => {
          setModalOpen(false)
          setRemarks('')
          setSelectedRowPreview(null)
        }}
        onConfirm={handleConfirm}
        action={modalAction}
        row={
          selectedRow
            ? {
              ...selectedRow,
              incentiveAmount: selectedRowPreview?.incentiveAmount ?? selectedRow.incentiveAmount,
            }
            : null
        }
        selectionPreview={
          selectedRowPreview?.hasCustomSelection ? selectedRowPreview.items : undefined
        }
        isLoading={
          approveMutation.isPending
          || rejectMutation.isPending
          || pendingMutation.isPending
        }
        remarks={remarks}
        onRemarksChange={setRemarks}
        showOverrideAmounts={false}
        requireRemarks
      />
    </PageWrapper>
  )
}
