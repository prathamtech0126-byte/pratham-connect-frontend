// client/src/api/incentives.api.ts
import api from '@/lib/api'

// ─── Shared Types ────────────────────────────────────────────────────────────

export type VisaType = 'spouse' | 'visitor' | 'student'
export type IncentiveStatus = 'pending' | 'approved' | 'rejected' | 'ineligible'

export interface IncentiveRow {
  id: string
  clientId: string
  clientName: string
  counsellorId: string
  counsellorName: string
  enrollmentDate: string
  visaType: VisaType
  eligible: boolean
  incentiveAmount: number
  status: IncentiveStatus
}

export interface IncentivesParams {
  visaType: 'all' | VisaType
  counsellorId: string | null
  month: string
}

export interface IncentivesResponse {
  items: IncentiveRow[]
  totalApprovedAmount: number
}

export interface SpouseRule {
  id: string
  minCount: number
  maxCount: number
  incentiveAmount: number
}

export interface VisitorRule {
  id: string
  minAmount: number
  maxAmount: number
  incentiveAmount: number
}

export interface StudentRule {
  id: string
  country: string
  ruleType: string
  incentiveAmount: number
}

export interface IncentiveRulesPayload {
  spouseRules: SpouseRule[]
  visitorRules: VisitorRule[]
  studentRules: StudentRule[]
}

export async function fetchIncentives(params: IncentivesParams): Promise<IncentivesResponse> {
  const res = await api.get('/api/incentives', { params })
  return res.data
}

export async function approveIncentive(id: string): Promise<void> {
  await api.post(`/api/incentives/${id}/approve`)
}

export async function rejectIncentive(id: string): Promise<void> {
  await api.post(`/api/incentives/${id}/reject`)
}

export async function updateEligibility(id: string, eligible: boolean): Promise<void> {
  await api.patch(`/api/incentives/${id}/eligibility`, { eligible })
}

export async function fetchIncentiveRules(): Promise<IncentiveRulesPayload> {
  const res = await api.get('/api/incentives/rules')
  return res.data
}

export async function saveIncentiveRules(payload: IncentiveRulesPayload): Promise<void> {
  await api.put('/api/incentives/rules', payload)
}
