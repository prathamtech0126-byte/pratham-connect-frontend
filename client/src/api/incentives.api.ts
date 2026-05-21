// client/src/api/incentives.api.ts
import { format } from 'date-fns'
import api from '@/lib/api'
import type { AllFinanceSaleTypeCategory } from '@/lib/incentive-sale-type-category'

// ─── Shared Types ────────────────────────────────────────────────────────────

export type SaleType = 'spouse' | 'visitor' | 'student'
export type IncentiveStatus = 'Pending' | 'Approved' | 'Rejected' | 'Ineligible'

// ─── Breakdown sub-types (returned by the report API) ────────────────────────

export interface ReportCoreSaleItem {
  label: string   // "Initial" | "Before Visa" | "After Visa"
  amount: number
  paymentDate?: string | null
}

export interface RuleDetail {
  ruleName: string
  ruleType: 'slab' | 'budget'
  // slab-specific
  teamCount?: number
  slabRange?: string
  // budget-specific
  counsellorTotal?: number
  thresholdMet?: number
  /** When set (e.g. by API), shown after "Incentive Eligible Amount" — e.g. ["Initial", "Before Visa"] */
  basisPayments?: string[]
  // common
  ratePerClient: number
  reason: string
}

export interface ReportCoreSale {
  items: ReportCoreSaleItem[]
  eligible: boolean
  incentive: number
  ruleDetail?: RuleDetail
}

export interface ReportAllFinance {
  amount: number
  eligible: boolean
  incentive: number
  ruleDetail?: RuleDetail
  /** Optional per-stage receipts (same shape as core sale) when the API sends a breakdown */
  items?: ReportCoreSaleItem[]
  paymentDate?: string | null
  payments?: Array<{
    paymentDate?: string | null
    entity?: {
      paymentDate?: string | null
    } | null
  }>
}

/** Raw line item from GET /api/incentives/report (legacy used productName + amount). */
export interface ApiReportOtherProductItem {
  name?: string
  productName?: string
  amountReceived?: number
  amount?: number
  paymentDate?: string | null
  eligible?: boolean
  incentive?: number
}

export interface ApiReportOtherProducts {
  items?: ApiReportOtherProductItem[] | null
  incentive?: number | null
  totalAmountReceived?: number | null
  payments?: unknown[] | null
}

/** Normalized other-product line after mapReportRow. */
export interface ReportOtherProductItem {
  name: string
  amountReceived: number
  paymentDate?: string | null
  eligible: boolean
  incentive?: number
}

export interface ReportOtherProducts {
  items: ReportOtherProductItem[]
  incentive: number
  totalAmountReceived?: number
}

function normalizeReportOtherProductItem(raw: ApiReportOtherProductItem): ReportOtherProductItem {
  const name = (raw.name ?? raw.productName ?? '').trim() || 'Product'
  const amountReceived = Number(raw.amountReceived ?? raw.amount ?? 0) || 0
  const paymentDate =
    typeof raw.paymentDate === 'string' && raw.paymentDate.trim().length > 0
      ? raw.paymentDate
      : undefined
  const eligible =
    typeof raw.eligible === 'boolean' ? raw.eligible : amountReceived > 0
  const inc = raw.incentive
  const incentive = inc != null && Number.isFinite(Number(inc)) ? Number(inc) : undefined
  if (incentive !== undefined) {
    return paymentDate !== undefined
      ? { name, amountReceived, paymentDate, eligible, incentive }
      : { name, amountReceived, eligible, incentive }
  }
  return paymentDate !== undefined
    ? { name, amountReceived, paymentDate, eligible }
    : { name, amountReceived, eligible }
}

function normalizeReportOtherProducts(raw: ApiReportOtherProducts | undefined | null): ReportOtherProducts {
  // Raw payment records from the backend — used as a fallback when item.amountReceived is 0
  // but payment.entity.amount has the real value (e.g. visa extension where payment.amount is null).
  const rawPayments = Array.isArray((raw as any)?.payments) ? (raw as any).payments as any[] : []

  const items = Array.isArray(raw?.items)
    ? raw.items.map((item, idx) => {
        const normalized = normalizeReportOtherProductItem(item)
        if (normalized.amountReceived === 0) {
          const payment = rawPayments[idx]
          const entityAmt = Number(payment?.entity?.amount ?? payment?.amount ?? 0) || 0
          if (entityAmt > 0) return { ...normalized, amountReceived: entityAmt }
        }
        return normalized
      })
    : []

  const incentive = Number(raw?.incentive) || 0
  const total =
    raw?.totalAmountReceived != null && Number.isFinite(Number(raw.totalAmountReceived))
      ? Number(raw.totalAmountReceived)
      : undefined
  return total !== undefined ? { items, incentive, totalAmountReceived: total } : { items, incentive }
}

// ─────────────────────────────────────────────────────────────────────────────

export interface IncentiveRow {
  id: string
  incentiveRecordId: number
  clientId: string
  clientName: string
  counsellorId: string
  counsellorName: string
  enrollmentDate: string
  saleType: SaleType
  /** Specific product / corridor label from API, e.g. "Japan Visitor" */
  saleTypeName?: string
  saleTypeCategoryId?: number
  /** True when the API returned saleType: null — used to show "Other Products" label instead */
  saleTypeIsNull?: boolean
  /** True when this client was transferred to the counsellor (transfer_status = true in DB) */
  isSharedClient?: boolean
  remark?: string | null
  eligible: boolean
  amount: number
  incentiveAmount: number
  overrideByUserId?: number | null
  /** Per-section override amounts from the backend — present when an admin has manually edited a section. */
  overrideCoreSale?: number | null
  overrideAllFinance?: number | null
  overrideOtherProducts?: number | null
  status: IncentiveStatus
  coreSale: ReportCoreSale
  allFinance: ReportAllFinance
  otherProducts: ReportOtherProducts
}

/** One row from GET /api/incentives/report (otherProducts shape varies until normalized in mapReportRow). */
export interface ReportRow {
  clientId: number
  clientName: string
  counsellor: string
  enrollmentDate: string
  saleType: 'Spouse' | 'Visitor' | 'Student' | string
  saleTypeName?: string
  saleTypeCategoryId?: number
  eligible: boolean
  receivedAmount: number
  incentiveAmount: number
  overrideByUserId?: number | null
  overrideCoreSale?: number | null
  overrideAllFinance?: number | null
  overrideOtherProducts?: number | null
  status: 'Pending' | 'Approved' | 'Rejected'
  remark?: string | null
  isSharedClient?: boolean
  isHandledByRow?: boolean
  originalCounsellorId?: number | null
  coreSale: ReportCoreSale
  allFinance: ReportAllFinance
  otherProducts: ApiReportOtherProducts
}

export interface IncentiveSlab {
  minCount: number
  maxCount?: number
  incentiveAmount: number
  label: string
}

export interface IncentiveTier {
  minAmount: number
  incentiveAmount: number
  label: string
}
// ─── Sale Types ─────────────────────────────────────────────

export interface SaleTypeItem {
  id: string | number
  name: string
  amount?: number
  isCoreProduct?: boolean
}

// ─── Other Products ──────────────────────────────────────────

export interface OtherProductItem {
  id: number
  productId: string
  name: string
  category: string
  productName: string
  formType: string
  description: string
  isActive: boolean
  displayOrder: number
}

export async function fetchOtherProducts(): Promise<OtherProductItem[]> {
  const res = await api.get('/api/other-products')
  return (res.data.data ?? []).filter((p: OtherProductItem) => p.isActive)
}

// AvailableProduct is the same shape — used by OtherProductsRulesTab
export type AvailableProduct = OtherProductItem

export async function fetchAvailableProducts(): Promise<AvailableProduct[]> {
  return fetchOtherProducts()
}

export async function fetchOtherProductSavedRules(): Promise<CategoryRule[]> {
  const res = await api.get('/api/incentives/rules/other-products')
  return res.data.data ?? []
}

export async function saveOtherProductRules(payload: {
  otherProductRules: CategoryRule[]
}): Promise<void> {
  await api.put('/api/incentives/rules/other-products', payload)
}

export async function fetchSaleTypes(): Promise<SaleTypeItem[]> {
  try {
    const res = await api.get('/api/sale-types')

    // normalize response (important)
    return (res.data.data || []).map((item: any) => ({
      id: item.id,
      name: item.saleType || item.name, // handle both keys
      amount: item.amount,
      isCoreProduct: item.isCoreProduct,
    }))
  } catch (err) {
    // fallback (your mock data)
    return [
      { id: 1, name: 'Canada Student', amount: 50000, isCoreProduct: false },
      { id: 2, name: 'UK Visa', amount: 35000, isCoreProduct: false },
      { id: 3, name: 'IELTS Course', amount: 15000, isCoreProduct: true },
    ]
  }
}

// ─── Saved Periods ──────────────────────────────────────────

export interface SavedPeriod {
  id: string
  startDate: string        // ISO date e.g. "2026-01-01"
  endDate: string          // ISO date e.g. "2026-01-31"
  saleTypeIds: (string | number)[]
  saleTypeNames: string[]  // resolved by server
  ruleType: 'slab' | 'budget'
}

export async function fetchSavedPeriods(): Promise<SavedPeriod[]> {
  const res = await api.get('/api/incentives/rules/periods')
  return res.data.data ?? []
}

export async function savePeriodConfig(payload: {
  startDate: string
  endDate: string
  saleTypeIds: (string | number)[]
  ruleType: 'slab' | 'budget'
}): Promise<void> {
  await api.post('/api/incentives/rules/period-config', payload)
}

/** One selectable row on the incentives dashboard (date range + display label). */
export interface IncentiveReportPeriod {
  id: string
  name: string
  startDate: string
  endDate: string
  isActive?: boolean
  /** Numeric ID of the first rule-config in this date range — used as periodId in action API calls. */
  ruleConfigId?: number
}

/**
 * Periods for the incentives dashboard come from **Manage Rules** data only:
 * `GET /api/rule-configurations`, grouped by active rules’ `startDate` + `endDate`,
 * with labels from the same localStorage keys as `IncentiveRulesPage`
 * (`incentive-rule-period-label:…`). No `/api/periods` call is made.
 *
 * If you later add `GET /api/periods`, call it here first and map rows into
 * `IncentiveReportPeriod` before falling back to this derivation.
 */
export async function fetchIncentiveReportPeriods(): Promise<IncentiveReportPeriod[]> {
  try {
    const configs = await fetchRuleConfigurations()
    return deriveIncentiveReportPeriodsFromRuleConfigs(configs)
  } catch {
    return []
  }
}

export interface IncentiveInfo {
  spouse?: {
    basis: string
    description: string
    slabs: IncentiveSlab[]
  }
  visitor?: {
    basis: string
    description: string
    tiers: IncentiveTier[]
  }
  student?: {
    basis: string
    description: string
    slabs: IncentiveSlab[]
    canadaBonus?: {
      basis: string
      description: string
      slabs: IncentiveSlab[]
    }
  }
  financeBonus?: {
    basis: string
    description: string
    slabs: IncentiveSlab[]
  }
}

interface ReportResponse {
  success: boolean
  data: ReportRow[]
  info?: IncentiveInfo
  pagination: {
    page: number
    pageSize: number
    totalRecords: number
    totalPages: number
    totalIncentiveAmount?: number
  }
}

interface ReportAllResponse {
  success: boolean
  warning?: string
  info?: IncentiveInfo
  data: ReportRow[]
  summary: {
    totalRecords: number
    approved: number
    rejected: number
    pending: number
    totalIncentiveAmount?: number
  }
}

function pad(n: number) { return String(n).padStart(2, '0') }

// Q1: Jan–Apr, Q2: May–Aug, Q3: Sep–Dec  (4 months each)
const QUARTER_MONTHS: Record<number, [number, number]> = {
  1: [1, 4],
  2: [5, 8],
  3: [9, 12],
}

// quarterStr format: "2026-Q1" | "2026-Q2" | "2026-Q3"
function getQuarterRange(quarterStr: string): { startDate: string; endDate: string } {
  const [yearStr, qStr] = quarterStr.split('-')
  const year = Number(yearStr)
  const q = Number(qStr.replace('Q', ''))
  const [startMonth, endMonth] = QUARTER_MONTHS[q]
  const lastDay = new Date(year, endMonth, 0).getDate()
  return {
    startDate: `${year}-${pad(startMonth)}-01`,
    endDate: `${year}-${pad(endMonth)}-${pad(lastDay)}`,
  }
}

/** Map report `saleType` (any casing) to filter/badge category. */
function reportSaleTypeToCategory(raw: string | undefined): SaleType {
  const k = String(raw ?? '')
    .trim()
    .toLowerCase()
  if (k === 'spouse') return 'spouse'
  if (k === 'student') return 'student'
  if (k === 'visitor') return 'visitor'
  return 'visitor'
}

/** Label for tables and badges: API name, else title-cased category (visitor → Visitor).
 *  When saleType was null in the API and otherProducts has items, returns "Other Products". */
export function formatIncentiveSaleTypeDisplay(row: {
  saleType: string
  saleTypeName?: string
  saleTypeIsNull?: boolean
  otherProducts?: { items: unknown[] }
}): string {
  if (row.saleTypeIsNull && (row.otherProducts?.items?.length ?? 0) > 0) {
    return 'Other Products'
  }
  const name = row.saleTypeName?.trim()
  if (name) return name
  const c = row.saleType
  return c.charAt(0).toUpperCase() + c.slice(1)
}

type ReportRowInput = ReportRow & {
  id?: number
  incentiveRecordId?: number
  incentive_record_id?: number
  sale_type_name?: string
  sale_type_category_id?: number
  isSharedClient?: boolean
  override_by_user_id?: number | null
  approvedBy?: number | null
  approved_by?: number | null
  override_core_sale?: number | null
  override_all_finance?: number | null
  override_other_products?: number | null
}

function mapReportRow(row: ReportRowInput): IncentiveRow {
  const saleTypeName =
    typeof row.saleTypeName === 'string' && row.saleTypeName.trim()
      ? row.saleTypeName.trim()
      : typeof row.sale_type_name === 'string' && row.sale_type_name.trim()
        ? row.sale_type_name.trim()
        : undefined

  const saleTypeCategoryId =
    typeof row.saleTypeCategoryId === 'number' && Number.isFinite(row.saleTypeCategoryId)
      ? row.saleTypeCategoryId
      : typeof row.sale_type_category_id === 'number' && Number.isFinite(row.sale_type_category_id)
        ? row.sale_type_category_id
        : undefined

  const rawSaleTypeStr = String(row.saleType ?? '').trim().toLowerCase()
  const saleTypeIsNull = !rawSaleTypeStr || rawSaleTypeStr === 'null'

  return {
    id: String(row.clientId),
    incentiveRecordId:
      typeof row.incentiveRecordId === 'number'
        ? row.incentiveRecordId
        : typeof row.incentive_record_id === 'number'
          ? row.incentive_record_id
          : typeof row.id === 'number'
            ? row.id
            : Number(row.clientId),
    clientId: String(row.clientId),
    clientName: row.clientName,
    counsellorId: '',
    counsellorName: row.counsellor,
    enrollmentDate: row.enrollmentDate,
    saleType: reportSaleTypeToCategory(String(row.saleType)),
    saleTypeName,
    saleTypeCategoryId,
    saleTypeIsNull: saleTypeIsNull || undefined,
    isSharedClient: row.isSharedClient === true || undefined,
    eligible: row.eligible,
    amount: row.receivedAmount,
    incentiveAmount: row.incentiveAmount,
    overrideByUserId:
      typeof row.overrideByUserId === 'number'
        ? row.overrideByUserId
        : typeof row.override_by_user_id === 'number'
          ? row.override_by_user_id
          : typeof row.approvedBy === 'number'
            ? row.approvedBy
            : typeof row.approved_by === 'number'
              ? row.approved_by
              : null,
    status: row.status,
    remark: typeof row.remark === 'string' && row.remark.trim() ? row.remark.trim() : null,
    overrideCoreSale:
      typeof row.overrideCoreSale === 'number' ? row.overrideCoreSale
      : typeof row.override_core_sale === 'number' ? row.override_core_sale
      : null,
    overrideAllFinance:
      typeof row.overrideAllFinance === 'number' ? row.overrideAllFinance
      : typeof row.override_all_finance === 'number' ? row.override_all_finance
      : null,
    overrideOtherProducts:
      typeof row.overrideOtherProducts === 'number' ? row.overrideOtherProducts
      : typeof row.override_other_products === 'number' ? row.override_other_products
      : null,
    coreSale: row.coreSale,
    allFinance: row.allFinance,
    otherProducts: normalizeReportOtherProducts(row.otherProducts),
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

export interface PaginationMeta {
  page: number
  pageSize: number
  totalRecords: number
  totalPages: number
  totalIncentiveAmount?: number
}

export interface IncentiveReportPagination {
  page: number
  pageSize: number
  total: number
}

export interface BreakdownItem {
  breakdown_id: number
  status: 'APPROVED' | 'REJECTED' | 'PENDING'
  [key: string]: unknown
}

// Backend caps pageSize at 100. Used for normal paginated fetches and as the batch size for "fetch all".
const API_MAX_PAGE_SIZE = 100

async function fetchAllPages(startDate: string, endDate: string): Promise<{
  rows: IncentiveRow[]
  totalRecords: number
  totalIncentiveAmount?: number
}> {
  const first = await api.get<ReportResponse>('/api/incentives/report', {
    params: { startDate, endDate, page: 1, pageSize: API_MAX_PAGE_SIZE },
  })
  const { totalPages, totalRecords, totalIncentiveAmount } = first.data.pagination
  const rows = first.data.data.map(mapReportRow)

  if (totalPages > 1) {
    const pageNums = Array.from({ length: totalPages - 1 }, (_, i) => i + 2)
    const rest = await Promise.all(
      pageNums.map((p) =>
        api.get<ReportResponse>('/api/incentives/report', {
          params: { startDate, endDate, page: p, pageSize: API_MAX_PAGE_SIZE },
        })
      )
    )
    rest.forEach((r) => rows.push(...r.data.data.map(mapReportRow)))
  }

  return { rows, totalRecords, totalIncentiveAmount }
}

export const ALL_PAGES_SENTINEL = 99999

export async function fetchIncentiveReport(params: {
  startDate: string
  endDate: string
  page: number
  pageSize: number
}): Promise<{ data: IncentiveRow[]; pagination: IncentiveReportPagination; info?: IncentiveInfo }> {
  const res = await api.get<ReportResponse>('/api/incentives/report', {
    params: { startDate: params.startDate, endDate: params.endDate, page: params.page, pageSize: params.pageSize },
  })
  const p = res.data.pagination
  return {
    data: (res.data.data ?? []).map(mapReportRow),
    pagination: {
      page: Number(p?.page ?? params.page) || 1,
      pageSize: Number(p?.pageSize ?? params.pageSize) || params.pageSize,
      total: Number(p?.totalRecords ?? 0) || 0,
    },
    info: res.data.info,
  }
}

export async function fetchIncentiveBreakdown(incentiveRecordId: number): Promise<{ data: BreakdownItem[] }> {
  const res = await api.get('/api/incentives/breakdown/' + incentiveRecordId)
  return { data: (res.data?.data ?? []) as BreakdownItem[] }
}

export async function fetchIncentivesReport(params: {
  startDate: string
  endDate: string
  page: number
  pageSize: number
}): Promise<{ data: IncentiveRow[]; pagination: PaginationMeta; info?: IncentiveInfo }> {
  const { startDate, endDate } = params

  if (params.pageSize >= ALL_PAGES_SENTINEL) {
    const { rows, totalRecords, totalIncentiveAmount } = await fetchAllPages(startDate, endDate)
    return {
      data: rows,
      pagination: {
        page: 1,
        pageSize: totalRecords,
        totalRecords,
        totalPages: 1,
        totalIncentiveAmount,
      },
    }
  }

  const res = await api.get<ReportResponse>('/api/incentives/report', {
    params: { startDate, endDate, page: params.page, pageSize: params.pageSize },
  })
  return {
    data: res.data.data.map(mapReportRow),
    pagination: res.data.pagination,
    info: res.data.info,
  }
}

export interface ApproveOrRejectIncentivePayload {
  incentive_record_id: number
  action: 'APPROVE' | 'REJECT'
  remark?: string
  overrideAmount?: number
  overrideCoreSale?: number | null
  overrideAllFinance?: number | null
  overrideOtherProducts?: number | null
}

export async function approveOrRejectIncentive(
  payload: ApproveOrRejectIncentivePayload,
): Promise<IncentiveActionResponse> {
  const requestBody = {
    ...payload,
    clientId: payload.incentive_record_id,
    allowApprovedEdit: true,
  }
  const res = await api.post<IncentiveActionResponse>('/api/incentives/action', requestBody)
  if (res.data.success === false) {
    const err = new Error(res.data.message || 'Failed to process incentive action') as any
    err.response = { data: res.data }
    throw err
  }
  return res.data
}

export async function fetchIncentivesReportAll(params: {
  startDate: string
  endDate: string
}): Promise<{
  data: IncentiveRow[]
  info?: IncentiveInfo
  warning?: string
  summary: {
    totalRecords: number
    approved: number
    rejected: number
    pending: number
    totalIncentiveAmount?: number
  }
}> {
  const res = await api.get<ReportAllResponse>('/api/incentives/report/all', {
    params: { startDate: params.startDate, endDate: params.endDate },
  })
  return {
    data: (res.data.data ?? []).map(mapReportRow),
    info: res.data.info,
    warning: res.data.warning,
    summary: res.data.summary ?? { totalRecords: 0, approved: 0, rejected: 0, pending: 0 },
  }
}

export async function fetchAllIncentivesForExport(params: {
  startDate: string
  endDate: string
  saleType?: string
}): Promise<IncentiveRow[]> {
  const { rows } = await fetchAllPages(params.startDate, params.endDate)
  if (params.saleType && params.saleType !== 'all') {
    return rows.filter((r) => r.saleType === params.saleType)
  }
  return rows
}

// ─── Single action ────────────────────────────────────────────────────────────

export interface IncentiveActionPayload {
  clientId: number
  periodId?: number
  action: 'APPROVE' | 'REJECT' | 'PENDING'
  overrides?: {
    coreSale?: number
    allFinance?: number
    otherProducts?: number
  }
  /** Total manual override amount sent to backend as `overrideAmount`. */
  overrideAmount?: number
  /** Required by backend when editing a record that is already Approved/Rejected. */
  allowApprovedEdit?: boolean
  remark?: string
}

export interface IncentiveActionResponse {
  success: boolean
  message: string
}

export async function processIncentiveAction(
  payload: IncentiveActionPayload,
): Promise<IncentiveActionResponse> {
  const res = await api.post<IncentiveActionResponse>('/api/incentives/action', payload)
  if (res.data.success === false) {
    const err = new Error(res.data.message || 'Failed to process incentive') as any
    err.response = { data: res.data }
    throw err
  }
  return res.data
}

export async function updateIncentiveAction(
  payload: IncentiveActionPayload,
): Promise<IncentiveActionResponse> {
  const { overrides, ...rest } = payload
  const body = {
    ...rest,
    allowApprovedEdit: true,
    // Flatten per-section overrides to the backend's expected field names
    ...(overrides?.coreSale != null     && { overrideCoreSale:     overrides.coreSale }),
    ...(overrides?.allFinance != null   && { overrideAllFinance:   overrides.allFinance }),
    ...(overrides?.otherProducts != null && { overrideOtherProducts: overrides.otherProducts }),
  }
  const res = await api.put<IncentiveActionResponse>('/api/incentives/action', body)
  if (res.data.success === false) {
    const err = new Error(res.data.message || 'Failed to update incentive') as any
    err.response = { data: res.data }
    throw err
  }
  return res.data
}

export interface EditIncentiveStatusPayload {
  clientId: number
  periodId?: number
  nextStatus: 'Approved' | 'Rejected' | 'Pending'
  overrides?: {
    coreSale?: number
    allFinance?: number
    otherProducts?: number
  }
  /** Pre-calculated total override amount — sum of all effective section amounts. */
  overrideAmount?: number
  remark?: string
}

/**
 * Explicit "edit status" helper for `/api/incentives/action` (PUT).
 * Use this when editing an already reviewed action.
 */
export async function editIncentiveStatus(
  payload: EditIncentiveStatusPayload,
): Promise<IncentiveActionResponse> {
  const action =
    payload.nextStatus === 'Approved'
      ? 'APPROVE'
      : payload.nextStatus === 'Rejected'
        ? 'REJECT'
        : 'PENDING'
  return updateIncentiveAction({
    clientId: payload.clientId,
    periodId: payload.periodId,
    action,
    overrides: payload.overrides,
    overrideAmount: payload.overrideAmount,
    remark: payload.remark,
  })
}

// ─── Bulk approve ─────────────────────────────────────────────────────────────

export type BulkApproveMode = 'SELECTED' | 'COUNSELLOR' | 'FILTER'

export interface BulkApproveIncentivesPayload {
  mode: BulkApproveMode
  recordIds?: number[]
  counsellorIds?: number[]
  startDate?: string
  endDate?: string
  status: 'APPROVED' | 'REJECTED' | 'PENDING'
  approvedBy: number
}

export interface BulkApprovePayload {
  mode: BulkApproveMode
  clientIds?: number[]
  counsellorIds?: number[]
  startDate: string
  endDate: string
  filters?: {
    saleTypeCategoryIds?: number[]
    counsellorIds?: number[]
  }
  approvedBy: number
}

export interface BulkApproveResponse {
  success: boolean
  approvedCount?: number
  skippedCount?: number
  batchId?: string
  message: string
}

export async function bulkApproveIncentives(
  payload: BulkApprovePayload,
): Promise<BulkApproveResponse> {
  const res = await api.post<BulkApproveResponse>('/api/incentives/bulk-approve', payload)
  if (res.data.success === false) {
    const err = new Error(res.data.message || 'Bulk approval failed') as any
    err.response = { data: res.data }
    throw err
  }
  return res.data
}

export async function bulkApproveIncentiveRecords(
  payload: BulkApproveIncentivesPayload,
): Promise<BulkApproveResponse> {
  const res = await api.post<BulkApproveResponse>('/api/incentives/bulk-approve', payload)
  if (res.data.success === false) {
    const err = new Error(res.data.message || 'Bulk approval failed') as any
    err.response = { data: res.data }
    throw err
  }
  return res.data
}

export interface BreakdownActionPayload {
  incentive_record_id: number
  actions: Array<{
    breakdown_id: number
    status: 'APPROVED' | 'REJECTED'
  }>
}

export async function updateBreakdownAction(payload: BreakdownActionPayload): Promise<{ success?: boolean; message?: string }> {
  const res = await api.post('/api/incentives/breakdown/action', payload)
  if (res.data?.success === false) {
    const err = new Error(res.data?.message || 'Failed to update breakdown action') as any
    err.response = { data: res.data }
    throw err
  }
  return res.data ?? {}
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

// ─── Rule Configurations (new transactional endpoints) ────────────────────────

export interface RuleConfigChild {
  id: number | string
  minCount?: number
  maxCount?: number | null  // null = open-ended
  label?: string
  incentiveAmount: number
}

/** Transactional rule-config API: backend may only persist slab | budget until extended. */
export type RuleConfigRuleType = 'slab' | 'budget' | 'budget_threshold_slab'

export interface RuleConfiguration {
  id: number | string
  name: string
  description?: string
  startDate: string
  endDate: string
  ruleType: RuleConfigRuleType
  /** When ruleType is budget_threshold_slab, optional threshold from API */
  minBudgetThreshold?: number
  /**
   * When the rule includes broad All Finance products, which core corridors
   * (spouse / visitor / student) it applies to — set by the rule wizard.
   */
  allFinanceSaleTypeCategories?: AllFinanceSaleTypeCategory[]
  saleTypeIds: (string | number)[]
  saleTypeNames: string[]
  otherProducts: OtherProductItem[]
  rules: RuleConfigChild[]
  isActive: boolean
  createdAt?: string
}

function normalizeRule(rule: any): RuleConfigChild {
  const normalizedLabel =
    rule.label ??
    (rule.budget_amount != null ? String(rule.budget_amount) : undefined)

  return {
    id: rule.id,
    minCount: rule.minCount ?? rule.min_count ?? rule.min_slab,
    maxCount: rule.maxCount ?? rule.max_count ?? rule.max_slab,
    label: normalizedLabel,
    incentiveAmount: rule.incentiveAmount ?? rule.incentive_amount,
  }
}

function normalizeAllFinanceCategories(raw: unknown): AllFinanceSaleTypeCategory[] | undefined {
  const arr = Array.isArray(raw) ? raw : undefined
  if (!arr) return undefined
  const allowed = new Set<AllFinanceSaleTypeCategory>(['spouse', 'visitor', 'student'])
  const out = arr
    .map((x) => String(x).toLowerCase())
    .filter((x): x is AllFinanceSaleTypeCategory => allowed.has(x as AllFinanceSaleTypeCategory))
  return out.length > 0 ? out : undefined
}

function normalizeRuleConfiguration(item: any): RuleConfiguration {
  const rawType = item.ruleType ?? item.rule_type
  const ruleType: RuleConfigRuleType =
    rawType === 'budget_threshold_slab' || rawType === 'budget_threshold+slab'
      ? 'budget_threshold_slab'
      : rawType === 'budget'
        ? 'budget'
        : 'slab'

  return {
    id: item.id,
    name: item.name,
    description: item.description ?? item.rule_description ?? undefined,
    startDate: item.startDate ?? item.start_date,
    endDate: item.endDate ?? item.end_date,
    ruleType,
    minBudgetThreshold:
      item.minBudgetThreshold ?? item.min_budget_threshold ?? undefined,
    allFinanceSaleTypeCategories: normalizeAllFinanceCategories(
      item.allFinanceSaleTypeCategories ??
        item.all_finance_sale_type_categories ??
        item.all_finance_target_categories,
    ),
    saleTypeIds: item.saleTypeIds ?? item.sale_type_ids ?? [],
    saleTypeNames: item.saleTypeNames ?? item.sale_type_names ?? [],
    otherProducts: Array.isArray(item.other_products) ? item.other_products : [],
    rules: Array.isArray(item.rules) ? item.rules.map(normalizeRule) : [],
    isActive: item.isActive ?? item.is_active ?? true,
    createdAt: item.createdAt ?? item.created_at,
  }
}

/** Same localStorage key scheme as `IncentiveRulesPage` “Incentive Periods” labels. */
const STORED_INCENTIVE_PERIOD_LABEL_PREFIX = 'incentive-rule-period-label:'

function readStoredIncentivePeriodLabel(startDate: string, endDate: string): string | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem(`${STORED_INCENTIVE_PERIOD_LABEL_PREFIX}${startDate}|${endDate}`)
    const t = raw?.trim()
    return t ? t : null
  } catch {
    return null
  }
}

function formatIncentivePeriodRangeFallback(startDate: string, endDate: string): string {
  try {
    const s = format(new Date(`${startDate}T12:00:00`), 'dd MMM yyyy')
    const e = format(new Date(`${endDate}T12:00:00`), 'dd MMM yyyy')
    return `${s} – ${e}`
  } catch {
    return `${startDate} – ${endDate}`
  }
}

/**
 * Builds the same period rows as the Manage Rules list: one entry per distinct
 * active rule date range. `id` is `startDate|endDate` so it stays stable in sessionStorage.
 */
export function deriveIncentiveReportPeriodsFromRuleConfigs(
  configs: RuleConfiguration[],
): IncentiveReportPeriod[] {
  const active = configs.filter((c) => c.isActive)
  const m = new Map<string, RuleConfiguration[]>()
  for (const c of active) {
    const k = `${c.startDate}|${c.endDate}`
    const list = m.get(k) ?? []
    list.push(c)
    m.set(k, list)
  }
  return Array.from(m.entries())
    .map(([key, ruleConfigs]) => {
      const [startDate, endDate] = key.split('|')
      const stored = readStoredIncentivePeriodLabel(startDate, endDate)
      const name = stored ?? formatIncentivePeriodRangeFallback(startDate, endDate)
      const rawId = ruleConfigs[0]?.id
      const ruleConfigId =
        rawId != null && Number.isFinite(Number(rawId)) ? Number(rawId) : undefined
      return { id: key, name, startDate, endDate, isActive: true as const, ruleConfigId }
    })
    .sort((a, b) => (a.startDate < b.startDate ? 1 : a.startDate > b.startDate ? -1 : 0))
}

export interface CreateRuleConfigPayload {
  name: string
  description?: string
  startDate: string
  endDate: string
  saleTypeIds: (string | number)[]
  ruleType: RuleConfigRuleType
  /** Used when ruleType is budget_threshold_slab */
  minBudgetThreshold?: number
  /** Required in UI when selection includes broad All Finance scope */
  allFinanceSaleTypeCategories?: AllFinanceSaleTypeCategory[]
  rules: Array<{
    minCount?: number
    maxCount?: number | null
    label?: string
    budgetAmount?: number
    incentiveAmount: number
  }>
}

function parseBudgetAmount(label?: string): number | null {
  if (!label) return null
  const cleaned = label.trim().toLowerCase().replace(/,/g, '')
  if (!cleaned) return null

  const match = cleaned.match(/^(\d+(?:\.\d+)?)(k)?$/)
  if (!match) return null

  const base = Number(match[1])
  if (!Number.isFinite(base)) return null
  return match[2] ? base * 1000 : base
}

function normalizeSlabBound(value: unknown): number | null {
  if (value === '' || value == null) return null
  if (typeof value === 'number') return Number.isFinite(value) ? value : null
  if (typeof value === 'string') {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : null
  }
  return null
}

export async function fetchRuleConfigurations(): Promise<RuleConfiguration[]> {
  const res = await api.get('/api/rule-configurations')
  const items = res.data.data ?? []
  return items.map(normalizeRuleConfiguration)
}

export async function fetchRuleConfigurationById(id: string | number): Promise<RuleConfiguration> {
  const res = await api.get(`/api/rule-configurations/${id}`)
  return normalizeRuleConfiguration(res.data.data)
}

export async function createRuleConfiguration(payload: CreateRuleConfigPayload): Promise<{ data: RuleConfiguration; message: string }> {
  const requestBody: Record<string, unknown> = {
    name: payload.name,
    start_date: payload.startDate,
    end_date: payload.endDate,
    sale_type_ids: payload.saleTypeIds,
    rule_type: payload.ruleType,
    rules: payload.rules.map((rule) => ({
      min_slab: normalizeSlabBound(rule.minCount),
      max_slab: normalizeSlabBound(rule.maxCount),
      label: rule.label,
      budget_amount:
        payload.ruleType === 'budget'
          ? (rule.budgetAmount ?? parseBudgetAmount(rule.label))
          : undefined,
      incentive_amount: rule.incentiveAmount,
    })),
  }
  if (payload.description?.trim()) {
    requestBody.description = payload.description.trim()
  }
  if (payload.minBudgetThreshold != null && Number.isFinite(payload.minBudgetThreshold)) {
    requestBody.min_budget_threshold = payload.minBudgetThreshold
  }
  if (payload.allFinanceSaleTypeCategories && payload.allFinanceSaleTypeCategories.length > 0) {
    requestBody.all_finance_sale_type_categories = payload.allFinanceSaleTypeCategories
  }

  const res = await api.post('/api/rule-configurations', requestBody as object)
  if (res.data.success === false) {
    const err = new Error(res.data.message || 'Failed to create rule configuration') as any
    err.response = { data: res.data }
    throw err
  }
  return { data: normalizeRuleConfiguration(res.data.data), message: res.data.message || 'Rule configuration created successfully' }
}

export async function updateRuleConfiguration(
  id: string | number,
  payload: CreateRuleConfigPayload,
): Promise<{ data: RuleConfiguration; message: string }> {
  const requestBody: Record<string, unknown> = {
    name: payload.name,
    start_date: payload.startDate,
    end_date: payload.endDate,
    sale_type_ids: payload.saleTypeIds,
    rule_type: payload.ruleType,
    rules: payload.rules.map((rule) => ({
      min_slab: normalizeSlabBound(rule.minCount),
      max_slab: normalizeSlabBound(rule.maxCount),
      label: rule.label,
      budget_amount:
        payload.ruleType === 'budget'
          ? (rule.budgetAmount ?? parseBudgetAmount(rule.label))
          : undefined,
      incentive_amount: rule.incentiveAmount,
    })),
  }
  if (payload.description?.trim()) {
    requestBody.description = payload.description.trim()
  }
  if (payload.minBudgetThreshold != null && Number.isFinite(payload.minBudgetThreshold)) {
    requestBody.min_budget_threshold = payload.minBudgetThreshold
  }
  if (payload.allFinanceSaleTypeCategories && payload.allFinanceSaleTypeCategories.length > 0) {
    requestBody.all_finance_sale_type_categories = payload.allFinanceSaleTypeCategories
  }

  const res = await api.put(`/api/rule-configurations/${id}`, requestBody as object)
  if (res.data.success === false) {
    const err = new Error(res.data.message || 'Failed to update rule configuration') as any
    err.response = { data: res.data }
    throw err
  }
  return { data: normalizeRuleConfiguration(res.data.data), message: res.data.message || 'Rule configuration updated successfully' }
}

export async function deleteRuleConfiguration(id: string | number): Promise<{ message: string }> {
  const res = await api.delete(`/api/rule-configurations/${id}`)
  if (res.data.success === false) {
    const err = new Error(res.data.message || 'Failed to delete rule configuration') as any
    err.response = { data: res.data }
    throw err
  }
  return { message: res.data.message || 'Rule configuration deleted successfully' }
}
