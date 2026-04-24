// import { useState, useMemo, useCallback } from 'react'
// import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
// import { toast } from 'sonner'
// import { useLocation } from 'wouter'
// import { PageWrapper } from '@/layout/PageWrapper'
// import { clientService } from '@/services/clientService'
// import { Button } from '@/components/ui/button'
// import {
//   fetchIncentives,
//   approveIncentive,
//   rejectIncentive,
//   updateEligibility,
//   type IncentiveRow,
// } from '@/api/incentives.api'
// import { IncentiveTotalBanner } from '@/components/incentives/IncentiveTotalBanner'
// import { IncentiveFilters } from '@/components/incentives/IncentiveFilters'
// import { IncentiveTable } from '@/components/incentives/IncentiveTable'
// import { ConfirmActionModal } from '@/components/incentives/ConfirmActionModal'

// /* ================= TYPES ================= */

// type SaleTypeFilter = 'all' | 'spouse' | 'visitor' | 'student'

// /* ================= DEMO DATA ================= */

// const DUMMY_INCENTIVES: IncentiveRow[] = [
//   {
//     id: 'demo-1',
//     clientId: 'C1001',
//     clientName: 'Riya Shah',
//     counsellorId: '12',
//     counsellorName: 'Avani Patel',
//     enrollmentDate: '2026-04-02',
//     saleType: 'spouse',
//     eligible: true,
//     amount: 50000,
//     incentiveAmount: 1200,
//     status: 'pending',
//   },
//   {
//     id: 'demo-2',
//     clientId: 'C1002',
//     clientName: 'Mitesh Patel',
//     counsellorId: '14',
//     counsellorName: 'Khushbu Jagtap',
//     enrollmentDate: '2026-04-05',
//     saleType: 'visitor',
//     eligible: true,
//     amount: 30000,
//     incentiveAmount: 950,
//     status: 'approved',
//   },
// ]

// /* ================= UTIL ================= */

// function getCurrentMonth(): string {
//   const now = new Date()
//   return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
// }

// /* ================= COMPONENT ================= */

// export default function IncentivesPage() {
//   const queryClient = useQueryClient()
//   const [, setLocation] = useLocation()

//   const [search, setSearch] = useState('')
//   const [saleType, setSaleType] = useState<SaleTypeFilter>('all')
//   const [counsellorId, setCounsellorId] = useState<string | null>(null)
//   const [month, setMonth] = useState(getCurrentMonth)

//   const [modalOpen, setModalOpen] = useState(false)
//   const [modalAction, setModalAction] = useState<'approve' | 'reject'>('approve')
//   const [selectedRow, setSelectedRow] = useState<IncentiveRow | null>(null)
//   const [remarks, setRemarks] = useState('')

//   /* ================= FETCH ================= */

//   const { data, isLoading } = useQuery({
//     queryKey: ['incentives', { saleType, counsellorId, month }],
//     queryFn: () => fetchIncentives({ saleType, counsellorId, month }),
//   })

//   const { data: counsellors = [] } = useQuery({
//     queryKey: ['counsellors'],
//     queryFn: () => clientService.getCounsellors(),
//   })

//   const invalidate = () =>
//     queryClient.invalidateQueries({ queryKey: ['incentives'] })

//   /* ================= MUTATIONS ================= */

//   const approveMutation = useMutation({
//     mutationFn: (id: string) => approveIncentive(id),
//     onSuccess: () => {
//       toast.success('Approved')
//       invalidate()
//     },
//   })

//   const rejectMutation = useMutation({
//     mutationFn: ({ id, remarks }: { id: string; remarks: string }) => rejectIncentive(id, remarks),
//     onSuccess: () => {
//       toast.success('Rejected')
//       invalidate()
//     },
//   })

//   const eligibilityMutation = useMutation({
//     mutationFn: ({ id, eligible }: { id: string; eligible: boolean }) =>
//       updateEligibility(id, eligible),
//     onSuccess: () => {
//       toast.success('Eligibility updated')
//       invalidate()
//     },
//   })

//   /* ================= DATA ================= */

//   const hasServerData = (data?.items?.length ?? 0) > 0
//   const sourceRows = hasServerData ? data?.items ?? [] : DUMMY_INCENTIVES

//   const approvedRows = sourceRows.filter((r) => r.status === 'approved')
//   const bannerTotal = approvedRows.reduce((sum, row) => sum + row.incentiveAmount, 0)
//   const bannerReceived = approvedRows.reduce((sum, row) => sum + row.amount, 0)

//   const filtered = useMemo(() => {
//     const q = search.toLowerCase()
//     if (!q) return sourceRows
//     return sourceRows.filter(
//       (r) =>
//         r.clientName.toLowerCase().includes(q) ||
//         r.clientId.toLowerCase().includes(q)
//     )
//   }, [sourceRows, search])

//   /* ================= ACTIONS ================= */

//   const handleApprove = (row: IncentiveRow) => {
//     setSelectedRow(row)
//     setModalAction('approve')
//     setModalOpen(true)
//   }

//   const handleReject = (row: IncentiveRow) => {
//     setSelectedRow(row)
//     setModalAction('reject')
//     setModalOpen(true)
//   }

//   const handleConfirm = () => {
//     if (!selectedRow) return

//     if (modalAction === 'approve') {
//       approveMutation.mutate(selectedRow.id)
//       setModalOpen(false)
//     } else {
//       if (!remarks.trim()) {
//         toast.error('Remarks required')
//         return
//       }

//       rejectMutation.mutate({ id: selectedRow.id, remarks })
//       setModalOpen(false)
//     }
//   }

//   /* ================= UI ================= */

//   return (
//     <PageWrapper
//       title="Incentive Management"
//       breadcrumbs={[{ label: 'Dashboard', href: '/' }, { label: 'Incentives' }]}
//       actions={
//         <Button onClick={() => setLocation('/incentives/rules')}>
//           Manage Rules
//         </Button>
//       }
//     >
//       <IncentiveTotalBanner
//         totalApprovedAmount={bannerTotal}
//         totalReceivedAmount={bannerReceived}
//         month={month}
//         saleType={saleType}
//       />

//       <IncentiveFilters
//         search={search}
//         onSearchChange={setSearch}
//         saleType={saleType}
//         onSaleTypeChange={setSaleType}
//         counsellorId={counsellorId}
//         onCounsellorChange={setCounsellorId}
//         month={month}
//         onMonthChange={setMonth}
//         counsellors={counsellors.map((c: any) => ({
//           id: String(c.id),
//           name: c.name || c.fullname,
//         }))}
//       />

//       <IncentiveTable
//         rows={filtered}
//         isLoading={isLoading}
//         onApprove={handleApprove}
//         onReject={handleReject}
//         onEligibilityChange={(id, eligible) =>
//           eligibilityMutation.mutate({ id, eligible })
//         }
//       />

//       <ConfirmActionModal
//         open={modalOpen}
//         onClose={() => { setModalOpen(false); setRemarks('') }}
//         onConfirm={handleConfirm}
//         action={modalAction}
//         row={selectedRow}
//         isLoading={approveMutation.isPending || rejectMutation.isPending}
//         remarks={remarks}
//         onRemarksChange={setRemarks}
//       />
//     </PageWrapper>
//   )
// }

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
  const [counsellorId, setCounsellorId] = useState<string | null>(null)
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
      if (counsellorId && r.counsellorName !== counsellorId) return false
      if (q && !r.clientName.toLowerCase().includes(q) && !r.clientId.includes(q)) return false
      return true
    })
  }, [data, search, saleType, counsellorId])

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
        counsellorId={counsellorId}
        onCounsellorChange={setCounsellorId}
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