import { useState, useMemo, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { PageWrapper } from '@/layout/PageWrapper'
import { clientService } from '@/services/clientService'
import {
  fetchIncentives,
  approveIncentive,
  rejectIncentive,
  updateEligibility,
  type IncentiveRow,
} from '@/api/incentives.api'
import { IncentiveTotalBanner } from '@/components/incentives/IncentiveTotalBanner'
import { IncentiveFilters } from '@/components/incentives/IncentiveFilters'
import { IncentiveTable } from '@/components/incentives/IncentiveTable'
import { ConfirmActionModal } from '@/components/incentives/ConfirmActionModal'

type VisaFilter = 'all' | 'spouse' | 'visitor' | 'student'

function getCurrentMonth(): string {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

export default function IncentivesPage() {
  const queryClient = useQueryClient()

  const [search, setSearch] = useState('')
  const [visaType, setVisaType] = useState<VisaFilter>('all')
  const [counsellorId, setCounsellorId] = useState<string | null>(null)
  const [month, setMonth] = useState(getCurrentMonth)

  const [modalOpen, setModalOpen] = useState(false)
  const [modalAction, setModalAction] = useState<'approve' | 'reject'>('approve')
  const [selectedRow, setSelectedRow] = useState<IncentiveRow | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['incentives', { visaType, counsellorId, month }],
    queryFn: () => fetchIncentives({ visaType, counsellorId, month }),
  })

  const { data: counsellors = [] } = useQuery({
    queryKey: ['counsellors'],
    queryFn: () => clientService.getCounsellors(),
  })

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ['incentives'] })

  const approveMutation = useMutation({
    mutationFn: (id: string) => approveIncentive(id),
    onSuccess: () => { toast.success('Incentive approved'); invalidate() },
    onError: () => toast.error('Failed to approve'),
  })

  const rejectMutation = useMutation({
    mutationFn: (id: string) => rejectIncentive(id),
    onSuccess: () => { toast.success('Incentive rejected'); invalidate() },
    onError: () => toast.error('Failed to reject'),
  })

  const eligibilityMutation = useMutation({
    mutationFn: ({ id, eligible }: { id: string; eligible: boolean }) =>
      updateEligibility(id, eligible),
    onSuccess: () => { toast.success('Eligibility updated'); invalidate() },
    onError: () => toast.error('Failed to update eligibility'),
  })

  const filtered = useMemo(() => {
    if (!data?.items) return []
    const q = search.toLowerCase()
    if (!q) return data.items
    return data.items.filter(
      (r) =>
        r.clientName.toLowerCase().includes(q) ||
        r.clientId.toLowerCase().includes(q)
    )
  }, [data, search])

  const handleApprove = useCallback((row: IncentiveRow) => {
    setSelectedRow(row)
    setModalAction('approve')
    setModalOpen(true)
  }, [])

  const handleReject = useCallback((row: IncentiveRow) => {
    setSelectedRow(row)
    setModalAction('reject')
    setModalOpen(true)
  }, [])

  const handleConfirm = () => {
    if (!selectedRow) return
    if (modalAction === 'approve') {
      approveMutation.mutate(selectedRow.id, { onSettled: () => setModalOpen(false) })
    } else {
      rejectMutation.mutate(selectedRow.id, { onSettled: () => setModalOpen(false) })
    }
  }

  const handleEligibilityChange = useCallback((id: string, eligible: boolean) => {
    eligibilityMutation.mutate({ id, eligible })
  }, [eligibilityMutation])

  const isConfirming = approveMutation.isPending || rejectMutation.isPending

  return (
    <PageWrapper
      title="Incentive Management"
      breadcrumbs={[{ label: 'Dashboard', href: '/' }, { label: 'Incentives' }]}
    >
      <IncentiveTotalBanner
        totalApprovedAmount={data?.totalApprovedAmount ?? 0}
        month={month}
        visaType={visaType}
      />

      <IncentiveFilters
        search={search}
        onSearchChange={setSearch}
        visaType={visaType}
        onVisaTypeChange={setVisaType}
        counsellorId={counsellorId}
        onCounsellorChange={setCounsellorId}
        month={month}
        onMonthChange={setMonth}
        counsellors={counsellors.map((c: any) => ({ id: String(c.id), name: c.name || c.fullname }))}
      />

      <IncentiveTable
        rows={filtered}
        isLoading={isLoading}
        onApprove={handleApprove}
        onReject={handleReject}
        onEligibilityChange={handleEligibilityChange}
      />

      <ConfirmActionModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onConfirm={handleConfirm}
        action={modalAction}
        row={selectedRow}
        isLoading={isConfirming}
      />
    </PageWrapper>
  )
}
