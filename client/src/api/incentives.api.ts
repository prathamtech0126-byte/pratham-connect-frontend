// client/src/api/incentives.api.ts
import api from '@/lib/api'

// ─── Shared Types ────────────────────────────────────────────────────────────

export type SaleType = 'spouse' | 'visitor' | 'student'
export type IncentiveStatus = 'pending' | 'approved' | 'rejected' | 'ineligible'

export interface IncentiveRow {
  id: string
  clientId: string
  clientName: string
  counsellorId: string
  counsellorName: string
  enrollmentDate: string
  saleType: SaleType
  eligible: boolean
  amount: number
  incentiveAmount: number
  status: IncentiveStatus
}

export interface IncentivesParams {
  saleType: 'all' | SaleType
  counsellorId: string | null
  month: string
}

export interface IncentivesResponse {
  items: IncentiveRow[]
  totalApprovedAmount: number
}

export interface ReportRow {
  clientId: number
  clientName: string
  counsellor: string
  enrollmentDate: string
  saleType: 'Spouse' | 'Visitor' | 'Student'
  eligibility: 'Eligible' | 'Not Eligible'
  receivedAmount: number
  incentiveAmount: number
  status: 'Pending' | 'Approved' | 'Rejected'
}

interface ReportResponse {
  success: boolean
  data: ReportRow[]
  pagination: {
    page: number
    pageSize: number
    totalRecords: number
    totalPages: number
  }
}

function getMonthRange(monthStr: string): { startDate: string; endDate: string } {
  const [year, month] = monthStr.split('-').map(Number)
  const start = new Date(year, month - 1, 1)
  const end = new Date(year, month, 0)
  return {
    startDate: start.toISOString().slice(0, 10),
    endDate: end.toISOString().slice(0, 10),
  }
}

const SALE_TYPE_MAP: Record<ReportRow['saleType'], SaleType> = {
  Spouse: 'spouse',
  Visitor: 'visitor',
  Student: 'student',
}

const STATUS_MAP: Record<ReportRow['status'], IncentiveStatus> = {
  Pending: 'pending',
  Approved: 'approved',
  Rejected: 'rejected',
}

function mapReportRow(row: ReportRow): IncentiveRow {
  return {
    // clientId is unique per report response (one row per client), so it serves as the row key
    id: String(row.clientId),
    clientId: String(row.clientId),
    clientName: row.clientName,
    counsellorId: '', // report API provides counsellor name only, not a counsellor ID
    counsellorName: row.counsellor,
    enrollmentDate: row.enrollmentDate,
    saleType: SALE_TYPE_MAP[row.saleType],
    eligible: row.eligibility === 'Eligible',
    amount: row.receivedAmount,
    incentiveAmount: row.incentiveAmount,
    status: STATUS_MAP[row.status],
  }
}

// ─── Rule Types ───────────────────────────────────────────────────────────────

// Used by: Core Spouse, Finance Spouse, Student, UK Student
export interface SalaryRangeRule {
  id: string
  minCount: number
  maxCount: number   // -1 = open-ended ("& above")
  incentiveAmount: number
}

// Used by: Core Visitor, Visitor Product Core
export interface CategoryRule {
  id: string
  label: string      // e.g. "8K", "REFUSAL", "SPONSOR"
  incentiveAmount: number
}

export interface IncentiveRulesPayload {
  coreSpouseRules: SalaryRangeRule[]
  financeSpouseRules: SalaryRangeRule[]
  coreVisitorRules: CategoryRule[]
  visitorProductRules: CategoryRule[]
  canadaStudentRules: SalaryRangeRule[]
  studentRules: SalaryRangeRule[]
  allFinanceRules: SalaryRangeRule[]
}

// ─── API Functions ────────────────────────────────────────────────────────────

export async function fetchIncentives(params: IncentivesParams): Promise<IncentivesResponse> {
  const res = await api.get('/api/incentives', { params })
  return res.data
}

export async function fetchIncentivesReport(params: { month: string }): Promise<IncentiveRow[]> {
  const { startDate, endDate } = getMonthRange(params.month)
  const res = await api.get<ReportResponse>('/api/incentives/report', {
    // pageSize=100 is the API maximum; months with >100 enrollments will be silently truncated.
    // Upgrade path: add a dedicated /summary endpoint for aggregated totals.
    params: { startDate, endDate, page: 1, pageSize: 100 },
  })
  if (res.data.pagination.totalRecords > 100) {
    console.warn(
      `fetchIncentivesReport: ${res.data.pagination.totalRecords} records exist but only 100 were fetched. Banner totals will be incomplete.`
    )
  }
  return res.data.data.map(mapReportRow)
}

export async function approveIncentive(id: string): Promise<void> {
  await api.post(`/api/incentives/${id}/approve`)
}

export async function rejectIncentive(id: string, remarks: string): Promise<void> {
  await api.post(`/api/incentives/${id}/reject`, { remarks })
}

export async function fetchIncentiveRules(): Promise<IncentiveRulesPayload> {
  const [spouse, visitor, canadaStudent, student, allFinance] = await Promise.all([
    api.get('/api/incentives/rules/spouse'),
    api.get('/api/incentives/rules/visitor'),
    api.get('/api/incentives/rules/canada-student'),
    api.get('/api/incentives/rules/student'),
    api.get('/api/incentives/rules/all-finance'),
  ])
  return {
    coreSpouseRules: spouse.data.data?.coreSpouseRules ?? [],
    financeSpouseRules: spouse.data.data?.financeSpouseRules ?? [],
    coreVisitorRules: visitor.data.data?.coreVisitorRules ?? [],
    visitorProductRules: visitor.data.data?.visitorProductRules ?? [],
    canadaStudentRules: canadaStudent.data.data ?? [],
    studentRules: student.data.data ?? [],
    allFinanceRules: allFinance.data.data ?? [],
  }
}

export async function saveSpouseRules(payload: {
  coreSpouseRules: SalaryRangeRule[]
  financeSpouseRules: SalaryRangeRule[]
}): Promise<void> {
  await api.put('/api/incentives/rules/spouse', payload)
}

export async function saveVisitorRules(payload: {
  coreVisitorRules: CategoryRule[]
  visitorProductRules: CategoryRule[]
}): Promise<void> {
  await api.put('/api/incentives/rules/visitor', payload)
}

export async function saveCanadaStudentRules(payload: {
  canadaStudentRules: SalaryRangeRule[]
}): Promise<void> {
  await api.put('/api/incentives/rules/canada-student', payload)
}

export async function saveStudentRules(payload: {
  studentRules: SalaryRangeRule[]
}): Promise<void> {
  await api.put('/api/incentives/rules/student', payload)
}

export async function saveAllFinanceRules(payload: {
  allFinanceRules: SalaryRangeRule[]
}): Promise<void> {
  await api.put('/api/incentives/rules/all-finance', payload)
}
