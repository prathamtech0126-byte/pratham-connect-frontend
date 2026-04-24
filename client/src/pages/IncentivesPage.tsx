import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { useLocation } from 'wouter'
import { PageWrapper } from '@/layout/PageWrapper'
import { Button } from '@/components/ui/button'
import {
  fetchIncentivesReport,
  approveIncentive,
  rejectIncentive,
  type IncentiveRow,
} from '@/api/incentives.api'
import { IncentiveTotalBanner } from '@/components/incentives/IncentiveTotalBanner'
import { IncentiveFilters } from '@/components/incentives/IncentiveFilters'
import { IncentiveTable } from '@/components/incentives/IncentiveTable'
import { ConfirmActionModal } from '@/components/incentives/ConfirmActionModal'

type SaleTypeFilter = 'all' | 'spouse' | 'visitor' | 'student'

function getCurrentMonth(): string {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

export default function IncentivesPage() {
  const queryClient = useQueryClient()
  const [, setLocation] = useLocation()

  const [search, setSearch] = useState('')
  const [saleType, setSaleType] = useState<SaleTypeFilter>('all')
  const [selectedCounsellor, setSelectedCounsellor] = useState<string | null>(null)
  const [month, setMonth] = useState(getCurrentMonth)

  const [modalOpen, setModalOpen] = useState(false)
  const [modalAction, setModalAction] = useState<'approve' | 'reject'>('approve')
  const [selectedRow, setSelectedRow] = useState<IncentiveRow | null>(null)
  const [remarks, setRemarks] = useState('')

  const { data = [], isLoading } = useQuery({
    queryKey: ['incentives-report', month],
    queryFn: () => fetchIncentivesReport({ month }),
  })

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ['incentives-report'] })

  const approveMutation = useMutation({
    mutationFn: (id: string) => approveIncentive(id),
    onSuccess: () => {
      toast.success('Approved')
      invalidate()
    },
  })

  const rejectMutation = useMutation({
    mutationFn: ({ id, remarks }: { id: string; remarks: string }) =>
      rejectIncentive(id, remarks),
    onSuccess: () => {
      toast.success('Rejected')
      invalidate()
    },
  })

  const counsellors = useMemo(
    () =>
      [...new Set(data.map((r) => r.counsellorName).filter(Boolean))].map(
        (name) => ({ id: name, name })
      ),
    [data]
  )

  // Sums all rows regardless of status — the API has no server-side aggregation endpoint.
  // Banner represents the full month; filtering to approved-only would require a separate /summary endpoint.
  const totalIncentiveAmount = useMemo(
    () => data.reduce((s, r) => s + r.incentiveAmount, 0),
    [data]
  )

  const totalReceivedAmount = useMemo(
    () => data.reduce((s, r) => s + r.amount, 0),
    [data]
  )

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return data.filter((r) => {
      if (saleType !== 'all' && r.saleType !== saleType) return false
      if (selectedCounsellor && r.counsellorName !== selectedCounsellor) return false
      if (q && !r.clientName.toLowerCase().includes(q) && !r.clientId.includes(q)) return false
      return true
    })
  }, [data, search, saleType, selectedCounsellor])

  const handleApprove = (row: IncentiveRow) => {
    setSelectedRow(row)
    setModalAction('approve')
    setModalOpen(true)
  }

  const handleReject = (row: IncentiveRow) => {
    setSelectedRow(row)
    setModalAction('reject')
    setModalOpen(true)
  }

  const handleConfirm = () => {
    if (!selectedRow) return
    if (modalAction === 'approve') {
      approveMutation.mutate(selectedRow.id)
      setModalOpen(false)
    } else {
      if (!remarks.trim()) {
        toast.error('Remarks required')
        return
      }
      rejectMutation.mutate({ id: selectedRow.id, remarks })
      setModalOpen(false)
    }
  }

  return (
    <PageWrapper
      title="Incentive Management"
      breadcrumbs={[
        { label: 'Dashboard', href: '/' },
        { label: 'Incentives' },
      ]}
      actions={
        <Button onClick={() => setLocation('/incentives/rules')}>
          Manage Rules
        </Button>
      }
    >
      <IncentiveTotalBanner
        totalIncentiveAmount={totalIncentiveAmount}
        totalReceivedAmount={totalReceivedAmount}
        month={month}
        saleType={saleType}
      />

      <IncentiveFilters
        search={search}
        onSearchChange={setSearch}
        saleType={saleType}
        onSaleTypeChange={setSaleType}
        counsellorId={selectedCounsellor}
        onCounsellorChange={setSelectedCounsellor}
        month={month}
        onMonthChange={setMonth}
        counsellors={counsellors}
      />

      <IncentiveTable
        rows={filtered}
        isLoading={isLoading}
        onApprove={handleApprove}
        onReject={handleReject}
      />

      <ConfirmActionModal
        open={modalOpen}
        onClose={() => {
          setModalOpen(false)
          setRemarks('')
        }}
        onConfirm={handleConfirm}
        action={modalAction}
        row={selectedRow}
        isLoading={approveMutation.isPending || rejectMutation.isPending}
        remarks={remarks}
        onRemarksChange={setRemarks}
      />
    </PageWrapper>
  )
}