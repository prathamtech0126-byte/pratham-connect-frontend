import api from "@/lib/api";
import type { VisaClient, BackendDashboardData } from "@/data/dummyBackendData";

/* ------------------------------------------------------------------ */
/* Raw API shapes — GET /api/modules/visa-cases                        */
/* ------------------------------------------------------------------ */

export interface VisaCaseFinancial {
  totalCharges: string;
  initialCharges: string;
  financeCharges: string;
  balanceDue: string;
}

export interface VisaCaseTravel {
  reason: string | null;
  reasonLabel: string | null;
  // The backend may return this as a plain name string or as a {id,name,isoCode} object.
  destinationCountry: string | { id: string; name: string; isoCode: string } | null;
}

export interface VisaCaseSponsorship {
  relationship: string | null;
  relationshipLabel: string | null;
  accompanyingMembersCount: number;
}

export interface VisaCaseAssignedUser {
  id: number;
  fullName: string;
  role: string;
  empId: string | null;
}

export interface VisaCaseProcessing {
  stage: string;
  subStatus: string;
  label: string; // e.g. "Documentation: Checklist Shared"
  assignedTeam: "cx" | "binding" | "application" | string;
  assignedUserId?: number | null;
  assignedUser?: VisaCaseAssignedUser | null;
  decision: "PENDING" | "APPROVED" | "REFUSED" | "WITHDRAWN" | string | null;
}

export interface VisaCase {
  rowNumber: number;
  visaCaseId: string;
  clientId: string;
  legacyClientId: number;
  clientName: string;
  enrollmentDate: string; // YYYY-MM-DD
  passportNumber: string;
  saleTypeId?: string;
  saleType: string;
  legacySaleTypeId: number;
  category: string;
  categoryLabel: string;
  financial: VisaCaseFinancial;
  country: { id: string; name: string; isoCode: string } | null;
  travel: VisaCaseTravel;
  sponsorship: VisaCaseSponsorship;
  studentApplication: unknown | null;
  processing: VisaCaseProcessing;
  userId: number;
  createdAt: string;
  updatedAt: string;
}

export interface VisaCasesResponse {
  success: boolean;
  data: VisaCase[];
  // The backend may name these fields differently across versions; we normalise
  // them in fetchVisaCases (see normalisePagination).
  pagination?: Record<string, number>;
}

export interface VisaCasesPagination {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface VisaCasesResult {
  rows: VisaClient[];
  pagination: VisaCasesPagination;
}

export interface VisaCaseFilters {
  page?: number;
  pageSize?: number;
  fromDate?: string;
  toDate?: string;
  counsellorId?: number;
  destinationCountryId?: string;
  currentStage?: string;
  currentSubStatus?: string;
  decision?: string;
  assignedTeam?: "cx" | "binding" | "application";
  // Country UUID (from GET /api/modules/countries) — filters by displayed
  // Destination (travel destination, else the sale-type country). `countriesId`
  // is the backend's accepted alias for the same value.
  countryId?: string;
  countriesId?: string;
  saleTypeId?: string;
  legacySaleTypeId?: number;
  visaCategory?: "visitor" | "spouse" | "student";
}

/* ------------------------------------------------------------------ */
/* Mapper — API VisaCase → UI VisaClient (the existing table type)     */
/* ------------------------------------------------------------------ */

const num = (v: string | null | undefined) => Number(v ?? 0) || 0;

/** Normalise the API category/saleType to the UI sale-type buckets. */
function uiSaleType(c: VisaCase): string {
  const hay = `${c.category ?? ""} ${c.saleType ?? ""}`.toLowerCase();
  if (hay.includes("visitor")) return "Visitor";
  if (hay.includes("spouse")) return "Spouse";
  if (hay.includes("student")) return "Student";
  return c.categoryLabel || c.saleType || "Visitor";
}

const DECISION_LABELS: Record<string, string> = {
  PENDING: "Pending",
  APPROVED: "Approved",
  REFUSED: "Refused",
  WITHDRAWN: "Withdrawn",
};

/** Safely extract a country name from either a string or a `{id,name,isoCode}` object. */
function countryName(value: unknown): string | null {
  if (!value) return null;
  if (typeof value === "string") return value;
  if (typeof value === "object" && "name" in (value as object)) return (value as { name: string }).name;
  return null;
}

export function mapVisaCaseToClient(c: VisaCase): VisaClient {
  const decisionKey = c.processing.decision ?? "PENDING";
  return {
    saleType: uiSaleType(c),
    id: String(c.legacyClientId),
    name: c.clientName,
    passport: c.passportNumber ?? "",
    destination: countryName(c.travel.destinationCountry) ?? countryName(c.country) ?? c.country?.name ?? c.saleType ?? "—",
    travelReason: c.travel.reasonLabel ?? "—",
    sponsor: c.sponsorship.relationshipLabel ?? "—",
    status: c.processing.label,
    decision: DECISION_LABELS[decisionKey] ?? decisionKey,
    enrollmentDate: c.enrollmentDate,
    counsellor: c.userId ? String(c.userId) : "—",
    handledBy: c.processing.assignedTeam ?? "—",

    visaCaseId: c.visaCaseId,
    assignedUserId: c.processing.assignedUser?.id ?? c.processing.assignedUserId ?? null,
    assignedUserName: c.processing.assignedUser?.fullName ?? null,
    assignedTeam: c.processing.assignedTeam ?? null,
    subStatus: c.processing.subStatus,

    totalCharges: num(c.financial.totalCharges),
    initialReceived: num(c.financial.initialCharges),
    financeCharges: num(c.financial.financeCharges),
    balanceDue: num(c.financial.balanceDue),

    accompanyingMembers: c.sponsorship.accompanyingMembersCount ?? 0,

    submittedOn: null,
    decidedOn: null,
  };
}

/* ------------------------------------------------------------------ */
/* Fetcher                                                             */
/* ------------------------------------------------------------------ */

/** Pull page/pageSize/total/totalPages out of whatever shape the API returns. */
function normalisePagination(
  p: Record<string, number> | undefined,
  rowCount: number,
  reqPage: number,
  reqPageSize: number
): VisaCasesPagination {
  const page = p?.page ?? p?.currentPage ?? reqPage;
  const pageSize = p?.pageSize ?? p?.limit ?? p?.perPage ?? reqPageSize;
  const total = p?.total ?? p?.totalCount ?? p?.totalItems ?? p?.count ?? rowCount;
  const totalPages =
    p?.totalPages ?? p?.pageCount ?? p?.totalPage ?? Math.max(1, Math.ceil(total / (pageSize || 1)));
  return { page, pageSize, total, totalPages };
}

/* ------------------------------------------------------------------ */
/* Countries — GET /api/modules/countries                              */
/* ------------------------------------------------------------------ */

export interface ModuleCountry {
  id: string;
  name: string;
  isoCode: string;
  isActive: boolean;
}

export async function fetchCountries(isActive = true): Promise<ModuleCountry[]> {
  const { data } = await api.get<{ success: boolean; data: ModuleCountry[] }>(
    `/api/modules/countries?isActive=${isActive}`
  );
  return data.data ?? [];
}

// The backend caps `pageSize` at 100, so larger logical page sizes are served
// by fetching and stitching several API pages together.
const API_MAX_PAGE_SIZE = 100;

/** Fetch a single backend page (pageSize ≤ API_MAX_PAGE_SIZE). */
async function fetchVisaCasePage(
  filters: VisaCaseFilters,
  apiPage: number,
  apiPageSize: number
): Promise<{ rows: VisaClient[]; raw?: Record<string, number> }> {
  const q = new URLSearchParams();
  q.set("page", String(apiPage));
  q.set("pageSize", String(apiPageSize));
  if (filters.fromDate) q.set("fromDate", filters.fromDate);
  if (filters.toDate) q.set("toDate", filters.toDate);
  if (filters.counsellorId != null) q.set("counsellorId", String(filters.counsellorId));
  if (filters.destinationCountryId) q.set("destinationCountryId", filters.destinationCountryId);
  if (filters.currentStage) q.set("currentStage", filters.currentStage);
  if (filters.currentSubStatus) q.set("currentSubStatus", filters.currentSubStatus);
  if (filters.decision) q.set("decision", filters.decision);
  if (filters.assignedTeam) q.set("assignedTeam", filters.assignedTeam);
  if (filters.countryId) q.set("countryId", filters.countryId);
  if (filters.countriesId) q.set("countriesId", filters.countriesId);
  if (filters.saleTypeId) q.set("saleTypeId", filters.saleTypeId);
  if (filters.legacySaleTypeId != null) q.set("legacySaleTypeId", String(filters.legacySaleTypeId));
  if (filters.visaCategory) q.set("visaCategory", filters.visaCategory);

  const { data } = await api.get<VisaCasesResponse>(`/api/modules/visa-cases?${q}`);
  return { rows: (data.data ?? []).map(mapVisaCaseToClient), raw: data.pagination };
}

/* ------------------------------------------------------------------ */
/* Sponsorship — PATCH /api/modules/visa-cases/{id}/sponsorship        */
/* ------------------------------------------------------------------ */

/**
 * Allowed sponsor relationship values sent to the API. The API expects the
 * uppercase enum `value`; the `label` is what we show in the dropdown.
 *
 * NOTE: replace this list with the exact enum from the backend schema if it
 * differs — it's the single source of truth for the relationship dropdown.
 */
export const SPONSOR_RELATIONSHIP_OPTIONS: { value: string; label: string }[] = [
  { value: "SON", label: "Son" },
  { value: "DAUGHTER", label: "Daughter" },
  { value: "BROTHER", label: "Brother" },
  { value: "SISTER", label: "Sister" },
  { value: "FRIEND", label: "Friend" },
  { value: "SELF_SPONSORED", label: "Self-Sponsored" },
];

export interface UpdateSponsorshipBody {
  sponsorRelationship?: string | null;
  accompanyingMembersCount?: number;
}

/** PATCH the sponsorship details (relationship + accompanying members) of a visa case. */
export async function updateVisaCaseSponsorship(
  visaCaseId: string,
  body: UpdateSponsorshipBody
): Promise<VisaCase> {
  const { data } = await api.patch<{ success: boolean; data: VisaCase }>(
    `/api/modules/visa-cases/${visaCaseId}/sponsorship`,
    body
  );
  return data.data;
}

/** True when a visa case is a Visitor case (accompanying-members editing is visitor-only). */
export function isVisitorVisaCase(c: Pick<VisaCase, "category" | "saleType"> | null | undefined): boolean {
  if (!c) return false;
  return [c.category, c.saleType].some((v) => String(v ?? "").toLowerCase().includes("visitor"));
}

/**
 * Find the raw visa case for a legacy (numeric) client id by paging the list.
 *
 * There is no get-by-client endpoint yet, so we scan `/api/modules/visa-cases`
 * pages (≤100 each) until we hit a row whose `legacyClientId` matches. Passing
 * the client's `counsellorId` narrows the search server-side. Replace this with
 * a dedicated endpoint when one exists.
 */
export async function fetchVisaCaseByLegacyClientId(
  legacyClientId: number,
  opts: { counsellorId?: number | null; maxPages?: number } = {}
): Promise<VisaCase | null> {
  const pageSize = API_MAX_PAGE_SIZE;
  const maxPages = opts.maxPages ?? 50;
  const target = Number(legacyClientId);

  const scan = async (counsellorId?: number | null): Promise<VisaCase | null> => {
    for (let page = 1; page <= maxPages; page++) {
      const q = new URLSearchParams();
      q.set("page", String(page));
      q.set("pageSize", String(pageSize));
      if (counsellorId != null) q.set("counsellorId", String(counsellorId));
      const { data } = await api.get<VisaCasesResponse>(`/api/modules/visa-cases?${q}`);
      const rows = data.data ?? [];
      const match = rows.find((c) => Number(c.legacyClientId) === target);
      if (match) return match;
      if (rows.length < pageSize) break; // reached the last page
    }
    return null;
  };

  // Try the narrowed (by-counsellor) scan first; fall back to an unfiltered scan
  // so a reassigned case is still found.
  if (opts.counsellorId != null) {
    const narrowed = await scan(opts.counsellorId);
    if (narrowed) return narrowed;
  }
  return scan(null);
}

/* ------------------------------------------------------------------ */
/* Travel — PATCH /api/modules/visa-cases/{id}/travel                  */
/* ------------------------------------------------------------------ */

/**
 * Allowed reason-of-travel values sent to the API. The API expects the
 * uppercase enum `value`; the `label` is what we show in the dropdown.
 *
 * NOTE: replace this list with the exact enum from the backend schema if it
 * differs — it's the single source of truth for the reason-of-travel dropdown.
 */
export const REASON_OF_TRAVEL_OPTIONS: { value: string; label: string }[] = [
  { value: "TOURISM", label: "Tourism" },
  { value: "FAMILY_VISIT", label: "Family Visit" },
  { value: "BUSINESS_VISIT", label: "Business Visit" },
  { value: "CONVOCATION", label: "Convocation" },
  { value: "WEDDING", label: "Wedding" },
  { value: "MEDICAL", label: "Medical" },
  { value: "OTHER", label: "Other" },
];

/** Map legacy/wrong enum values to the backend's canonical keys before PATCH. */
export function normalizeReasonOfTravel(value: string | null | undefined): string {
  if (!value) return "";
  if (value === "BUSINESS") return "BUSINESS_VISIT";
  return value;
}

export interface UpdateTravelBody {
  reasonOfTravel?: string | null;
  destinationCountryId?: string | null;
}

/** PATCH the travel details (reason of travel + destination country) of a visa case. */
export async function updateVisaCaseTravel(
  visaCaseId: string,
  body: UpdateTravelBody
): Promise<VisaCase> {
  const { data } = await api.patch<{ success: boolean; data: VisaCase }>(
    `/api/modules/visa-cases/${visaCaseId}/travel`,
    body
  );
  return data.data;
}

/* ------------------------------------------------------------------ */
/* Assignment — POST /api/modules/visa-cases/{id}/assign               */
/* ------------------------------------------------------------------ */

export interface AssignVisaCaseBody {
  assignedUserId: number;
  empId?: string | null;
  notes?: string;
}

/** Assign / hand off a visa case to a CX or Binding team member. */
export async function assignVisaCase(
  visaCaseId: string,
  body: AssignVisaCaseBody
): Promise<VisaCase> {
  const { data } = await api.post<{ success: boolean; data: { visaCase: VisaCase } }>(
    `/api/modules/visa-cases/${visaCaseId}/assign`,
    body
  );
  return data.data.visaCase;
}

/* ------------------------------------------------------------------ */
/* Processing status — PATCH /api/modules/visa-cases/{id}/status       */
/* ------------------------------------------------------------------ */

export interface ChangeStatusBody {
  subStatus: string; // enum, e.g. "CHECKLIST_SHARED", "PARTIALLY_RECEIVED"
  notes?: string;
  adminOverride?: boolean;
}

/** Advance / update the processing sub-status of a visa case. */
export async function changeVisaCaseStatus(
  visaCaseId: string,
  body: ChangeStatusBody
): Promise<void> {
  await api.patch(`/api/modules/visa-cases/${visaCaseId}/status`, body);
}

export interface ChangeDecisionBody {
  decision: string; // "PENDING" | "APPROVED" | "REFUSED" | "WITHDRAWN"
  decisionDate?: string | null; // YYYY-MM-DD
  remarks?: string;
}

/** Update the embassy decision of a visa case (PATCH .../decision). */
export async function changeVisaCaseDecision(
  visaCaseId: string,
  body: ChangeDecisionBody
): Promise<void> {
  await api.patch(`/api/modules/visa-cases/${visaCaseId}/decision`, body);
}

/* ------------------------------------------------------------------ */
/* Processing-stage metadata — GET .../visa-cases/processing-stages    */
/* ------------------------------------------------------------------ */

export interface ProcessingSubStatus {
  value: string; // enum sent as `subStatus`
  label: string;
  displayLabel: string; // e.g. "Documentation: Checklist Shared"
  stage: string;
  stageLabel: string;
}

export interface ProcessingStage {
  stage: string;
  label: string;
  team: string;
  subStatuses: ProcessingSubStatus[];
}

export interface ProcessingStagesData {
  stages: ProcessingStage[];
  teamViews: Record<
    string,
    { team: string; label: string; stages: string[]; subStatuses: ProcessingSubStatus[] }
  >;
  viewer: {
    team: string | null;
    teamView: string | null;
    // Sub-statuses the caller's role is allowed to set (RBAC-filtered).
    updatableSubStatuses: ProcessingSubStatus[];
  };
}

/** All processing stages + the caller's updatable sub-statuses. */
export async function fetchProcessingStages(): Promise<ProcessingStagesData> {
  const { data } = await api.get<{ success: boolean; data: ProcessingStagesData }>(
    `/api/modules/visa-cases/processing-stages`
  );
  return data.data;
}

/* ------------------------------------------------------------------ */
/* Assignable users — GET /api/users/users (CX + Binding only)         */
/* ------------------------------------------------------------------ */

export interface AssignableUser {
  id: number;
  fullName: string;
  role: string;
  empId: string | null;
}

// Backend role values → short team key used by the assign UI.
const ROLE_TO_TEAM: Record<string, string> = {
  customer_experience: "cx",
  cx: "cx",
  binding_team: "binding",
  binding: "binding",
  application_team: "application",
};

/**
 * Fetch users assignable to a visa case (GET /api/modules/visa-cases/assignable-users).
 * Used by ClientView's assign dialog — scoped by the backend per the caller's role.
 */
export async function fetchAssignableUsers(targetRole?: string): Promise<AssignableUser[]> {
  const params: Record<string, string> = {};
  if (targetRole) params.targetRole = targetRole;
  const { data } = await api.get<{ success: boolean; data: { users: any[] } }>(
    "/api/modules/visa-cases/assignable-users",
    { params }
  );
  const rows: any[] = data?.data?.users ?? [];
  return rows.map((u) => ({
    id: u.id,
    fullName: u.fullName ?? u.name ?? `User ${u.id}`,
    role: ROLE_TO_TEAM[String(u.role ?? "").toLowerCase()] ?? String(u.role ?? "").toLowerCase(),
    empId: u.empId ?? u.emp_id ?? u.empID ?? null,
  }));
}

/**
 * Fetch all CX / Binding / Application users from GET /api/users/users.
 * Used by the BK_Clients list table for the Handled By column name lookup
 * and the bulk-assign dropdown.
 */
export async function fetchAllBackendUsers(): Promise<AssignableUser[]> {
  const { data } = await api.get<{ success: boolean; data: any[] | { users: any[] } }>(
    "/api/users/users"
  );
  const raw: any[] = Array.isArray(data?.data) ? data.data : (data?.data as any)?.users ?? [];
  return raw
    .map((u) => ({
      id: u.id,
      fullName: u.fullName ?? u.name ?? `User ${u.id}`,
      role: ROLE_TO_TEAM[String(u.role ?? "").toLowerCase()] ?? "",
      empId: u.empId ?? u.emp_id ?? u.empID ?? null,
    }))
    .filter((u) => u.role === "cx" || u.role === "binding" || u.role === "application");
}

export interface DocumentRequestPayload {
  clientId: string;
  legacyClientId?: number;
  documentType: string;
  notes?: string;
}

export async function postDocumentRequest(
  visaCaseId: string,
  payload: DocumentRequestPayload,
): Promise<void> {
  await api.post(`/api/modules/visa-cases/${visaCaseId}/document-requests`, payload);
}

export type DocRequestStatus = "OPEN" | "FULFILLED" | "CANCELLED";

export interface DocumentRequest {
  id: string;
  requestStatus: DocRequestStatus;
  documentType: string;
  personLabel: string | null;
  notes: string | null;
  clientId: string;
  legacyClientId: number | null;
  clientName: string;
  visaCaseId: string;
  raisedBy: number | null;
  raisedByRole: string | null;
  raisedByUser: { id: number; fullName: string; role: string; empId: string | null } | null;
  sourceTeam: string | null;
  targetTeam: string | null;
  sourceStage: string | null;
  sourceSubStatus: string | null;
  fulfilledBy: number | null;
  fulfilledByUser: { id: number; fullName: string } | null;
  fulfilledAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface FetchDocumentRequestsParams {
  status?: DocRequestStatus;
  sourceTeam?: string;
  targetTeam?: string;
  page?: number;
  limit?: number;
}

export async function fetchDocumentRequests(
  params: FetchDocumentRequestsParams = {},
): Promise<{ data: DocumentRequest[]; total: number }> {
  const { data } = await api.get<{ success: boolean; data: DocumentRequest[]; pagination?: { total: number } }>(
    "/api/modules/visa-cases/document-requests",
    { params },
  );
  return {
    data: data.data ?? [],
    total: data.pagination?.total ?? (data.data ?? []).length,
  };
}

export async function resolveDocumentRequest(id: string, notes?: string): Promise<void> {
  await api.patch(`/api/modules/visa-cases/document-requests/${id}/fulfill`, notes ? { notes } : {});
}

export async function fetchVisaCases(filters: VisaCaseFilters = {}): Promise<VisaCasesResult> {
  const logicalPage = filters.page ?? 1;
  const logicalPageSize = filters.pageSize ?? 20;

  // Fast path: a logical page that fits in a single backend request.
  if (logicalPageSize <= API_MAX_PAGE_SIZE) {
    const { rows, raw } = await fetchVisaCasePage(filters, logicalPage, logicalPageSize);
    return {
      rows,
      pagination: normalisePagination(raw, rows.length, logicalPage, logicalPageSize),
    };
  }

  // Large page: stitch the backend pages (each ≤100) that cover this slice.
  const globalStart = (logicalPage - 1) * logicalPageSize;
  const globalEnd = globalStart + logicalPageSize;
  const firstApiPage = Math.floor(globalStart / API_MAX_PAGE_SIZE) + 1;
  const lastApiPage = Math.ceil(globalEnd / API_MAX_PAGE_SIZE);

  const apiPages: number[] = [];
  for (let p = firstApiPage; p <= lastApiPage; p++) apiPages.push(p);

  const results = await Promise.all(apiPages.map((p) => fetchVisaCasePage(filters, p, API_MAX_PAGE_SIZE)));

  const stitched = results.flatMap((r) => r.rows);
  const offsetInFirst = globalStart - (firstApiPage - 1) * API_MAX_PAGE_SIZE;
  const rows = stitched.slice(offsetInFirst, offsetInFirst + logicalPageSize);

  // `total` is independent of pageSize; take it from any page's pagination.
  const base = normalisePagination(results[0]?.raw, stitched.length, firstApiPage, API_MAX_PAGE_SIZE);
  const total = base.total;
  return {
    rows,
    pagination: {
      page: logicalPage,
      pageSize: logicalPageSize,
      total,
      totalPages: Math.max(1, Math.ceil(total / logicalPageSize)),
    },
  };
}

/* ------------------------------------------------------------------ */
/* Dashboard — GET /api/modules/visa-cases/dashboard                   */
/* ------------------------------------------------------------------ */

export interface VisaCaseDashboardFilters {
  fromDate?: string;   // YYYY-MM-DD
  toDate?: string;     // YYYY-MM-DD
  userId?: number;     // scope to a specific user (admin) or current user
  branchCode?: string;
}

/** Raw shape returned by GET /api/modules/visa-cases/dashboard */
export interface VisaCaseDashboardRaw {
  meta: {
    title: string;
    generatedAt: string;
    filters: { fromDate?: string; toDate?: string };
  };
  summary: {
    totalClients: number;
    approvalRate: string | null;
    outstandingBalance: string;
  };
  caseOutcomes: {
    totalEnrolledClients: number;
    approved: number;
    refused: number;
    withdrawn: number;
    pendingDecision: number;
    filesSubmitted: number;
    approvalRate: string | null;
    refusalRate: string | null;
  };
  byDestinationCountry: { country: string; count: number }[];
  bySponsorRelationship: { sponsor: string; count: number }[];
  byReasonOfTravel: { reason: string; count: number }[];
  casesByStage: { stage: string; count: number }[];
  financialSummary: {
    currency: string;
    totalCharges: string;
    initialChargesReceived: string;
    financeCharges: string;
    totalBalanceDue: string;
    collectionPercent: string | null;
    avgChargePerClient: string;
    clientsFullyPaid: number;
    clientsWithBalanceDue: number;
  };
  accompanyingMembers: {
    total: number;
    avgPerCase: string;
    casesWithAccompanying: number;
  };
  processingTimes: {
    enrollmentToSubmissionDays: string;
    submissionToDecisionDays: string;
    enrollmentToDecisionDays: string;
  };
  decisionByDestination: {
    destination: string;
    approved: number;
    refused: number;
    withdrawn: number;
    pending: number;
    total: number;
  }[];
  enrollmentTrend: { month: string; enrollments: number }[];
  quickHighlights: {
    topDestination: string;
    topTravelReason: string;
    topSponsorType: string;
  };
  rawDecisions: { decision: string; count: number }[];
}

/** Maps the raw API dashboard response to the `BackendDashboardData` shape used by the UI components. */
export function mapDashboardRawToData(raw: VisaCaseDashboardRaw): BackendDashboardData {
  const n = (s: string | null | undefined) => Number(s ?? 0) || 0;

  const co = raw.caseOutcomes;
  const decided = co.approved + co.refused;
  const approvalRate = decided > 0 ? (co.approved / decided) * 100 : null;
  const refusalRate = decided > 0 ? (co.refused / decided) * 100 : null;

  const fin = raw.financialSummary;
  const totalCharges = n(fin.totalCharges);
  const totalBalanceDue = n(fin.totalBalanceDue);
  const collected = totalCharges - totalBalanceDue;

  // The API does not break down by sale type — wire as empty so the UI shows "--" chips
  const bySaleType: BackendDashboardData["bySaleType"] = [];

  return {
    totalClients: raw.summary.totalClients,
    approvalRate,
    outstandingBalance: totalBalanceDue,

    caseOutcomes: {
      totalEnrolled: co.totalEnrolledClients,
      approved: co.approved,
      refused: co.refused,
      withdrawn: co.withdrawn,
      pending: co.pendingDecision,
      filesSubmitted: co.filesSubmitted,
      approvalRate,
      refusalRate,
    },

    byDestination: raw.byDestinationCountry.map((r) => ({ name: r.country, count: r.count })),
    bySponsor: raw.bySponsorRelationship.map((r) => ({ name: r.sponsor, count: r.count })),
    byTravelReason: raw.byReasonOfTravel.map((r) => ({ name: r.reason, count: r.count })),

    casesByStage: raw.casesByStage.map((r) => ({ name: r.stage, count: r.count })),

    bySaleType,

    financial: {
      totalCharges,
      initialReceived: n(fin.initialChargesReceived),
      financeCharges: n(fin.financeCharges),
      totalBalanceDue,
      collectionPct: totalCharges > 0 ? (collected / totalCharges) * 100 : null,
      avgChargePerClient: n(fin.avgChargePerClient),
      clientsFullyPaid: fin.clientsFullyPaid,
      clientsWithBalance: fin.clientsWithBalanceDue,
    },

    processingTimes: {
      enrollmentToSubmission: n(raw.processingTimes.enrollmentToSubmissionDays) || null,
      submissionToDecision: n(raw.processingTimes.submissionToDecisionDays) || null,
      enrollmentToDecision: n(raw.processingTimes.enrollmentToDecisionDays) || null,
    },

    accompanying: {
      totalMembers: raw.accompanyingMembers.total,
      avgPerCase: n(raw.accompanyingMembers.avgPerCase) || null,
      casesWithAccompanying: raw.accompanyingMembers.casesWithAccompanying,
    },

    highlights: {
      topDestination: raw.quickHighlights.topDestination,
      topTravelReason: raw.quickHighlights.topTravelReason,
      topSponsorType: raw.quickHighlights.topSponsorType,
    },

    decisionByDestination: raw.decisionByDestination.map((r) => ({
      name: r.destination,
      approved: r.approved,
      refused: r.refused,
      withdrawn: r.withdrawn,
      pending: r.pending,
      total: r.total,
    })),

    enrollmentTrend: raw.enrollmentTrend,
  };
}

export async function fetchVisaCaseDashboard(
  filters: VisaCaseDashboardFilters = {}
): Promise<BackendDashboardData> {
  const q = new URLSearchParams();
  if (filters.fromDate) q.set("fromDate", filters.fromDate);
  if (filters.toDate) q.set("toDate", filters.toDate);
  if (filters.userId != null) q.set("userId", String(filters.userId));
  if (filters.branchCode) q.set("branchCode", filters.branchCode);

  const qs = q.toString();
  const { data } = await api.get<{ success: boolean; data: VisaCaseDashboardRaw }>(
    `/api/modules/visa-cases/dashboard${qs ? `?${qs}` : ""}`
  );
  return mapDashboardRawToData(data.data);
}

/* ------------------------------------------------------------------ */
/* Backend Reports Dashboard — GET /api/modules/reports/backend-dashboard */
/* ------------------------------------------------------------------ */

export interface BackendReportsDashboardFilters {
  filter?: "today" | "weekly" | "monthly" | "custom";
  fromDate?: string;  // YYYY-MM-DD (required when filter=custom)
  toDate?: string;    // YYYY-MM-DD (required when filter=custom)
  branchCode?: string;
}

export interface BackendReportsLeaderboardEntry {
  userId: number;
  fullName: string;
  empId: string | null;
  role: string;
  team: string;
  teamLabel: string;
  activeCases: number;
  approved: number;
  refused: number;
  withdrawn: number;
  pending: number;
  filesSubmitted: number;
  approvalRate: number | null;
}

export interface BackendReportsDashboardResult {
  data: BackendDashboardData;
  leaderboard: BackendReportsLeaderboardEntry[];
}

interface BackendReportsDashboardRaw {
  meta: {
    title: string;
    viewerRole: string;
    generatedAt: string;
    period: { filter: string; fromDate: string; toDate: string };
    branchCode: string | null;
  };
  summary: {
    totalClients: number;
    approvalRate: number | null;
    outstandingBalance: string;
    currency: string;
  };
  caseOutcomes: {
    approved: number;
    refused: number;
    withdrawn: number;
    pending: number;
    filesSubmitted: number;
    approvalRate: number | null;
    refusalRate: number | null;
  };
  casesByStage: { stage: string; label: string; count: number }[];
  teamLeaderboard: BackendReportsLeaderboardEntry[];
}

function mapReportsDashboardRaw(raw: BackendReportsDashboardRaw): BackendReportsDashboardResult {
  const co = raw.caseOutcomes;
  const decided = co.approved + co.refused;
  const approvalRate = raw.summary.approvalRate ?? (decided > 0 ? (co.approved / decided) * 100 : null);
  const refusalRate = co.refusalRate ?? (decided > 0 ? (co.refused / decided) * 100 : null);

  const data: BackendDashboardData = {
    totalClients: raw.summary.totalClients,
    approvalRate,
    outstandingBalance: Number(raw.summary.outstandingBalance) || 0,

    caseOutcomes: {
      totalEnrolled: raw.summary.totalClients,
      approved: co.approved,
      refused: co.refused,
      withdrawn: co.withdrawn,
      pending: co.pending,
      filesSubmitted: co.filesSubmitted,
      approvalRate,
      refusalRate,
    },

    casesByStage: raw.casesByStage.map((s) => ({ name: s.label, count: s.count })),

    // Fields not provided by this endpoint — kept empty
    byDestination: [],
    bySponsor: [],
    byTravelReason: [],
    bySaleType: [],
    financial: { totalCharges: 0, initialReceived: 0, financeCharges: 0, totalBalanceDue: 0, collectionPct: null, avgChargePerClient: 0, clientsFullyPaid: 0, clientsWithBalance: 0 },
    processingTimes: { enrollmentToSubmission: null, submissionToDecision: null, enrollmentToDecision: null },
    accompanying: { totalMembers: 0, avgPerCase: null, casesWithAccompanying: 0 },
    highlights: { topDestination: "—", topTravelReason: "—", topSponsorType: "—" },
    decisionByDestination: [],
    enrollmentTrend: [],
  };

  return { data, leaderboard: raw.teamLeaderboard ?? [] };
}

/* ------------------------------------------------------------------ */
/* Bulk assign — POST /api/modules/visa-cases/assign-bulk              */
/* ------------------------------------------------------------------ */

export interface AssignBulkBody {
  visaCaseIds: string[];
  assignedUserId: number;
  notes?: string;
}

export interface AssignBulkResult {
  assignee: { id: number; fullName: string; role: string; empId: string | null };
  summary: { total: number; succeeded: number; failed: number };
  results: { visaCaseId: string; success: boolean; assignedUserId: number; assignmentType: string }[];
}

export async function assignBulkVisaCases(body: AssignBulkBody): Promise<AssignBulkResult> {
  const { data } = await api.post<{ success: boolean; data: AssignBulkResult }>(
    "/api/modules/visa-cases/assign-bulk",
    body
  );
  return data.data;
}

/* ------------------------------------------------------------------ */
/* Ops Dashboard — GET /api/modules/reports/ops-dashboard              */
/* ------------------------------------------------------------------ */

export interface OpsDashboardFilters {
  filter?: "today" | "weekly" | "monthly" | "custom";
  fromDate?: string;
  toDate?: string;
}

export interface OpsDashboardData {
  meta: {
    title: string;
    team?: string;
    viewerRole?: string;
    scope: string;
    period: { filter: string; mode: string; description?: string };
  };
  summary: {
    activeCases: number;
    clientsByCategory: { category: string; label: string; count: number }[];
    // CX-specific
    readyForHandoff?: number;
    handoffsCompleted?: number;
    // Binding-specific
    readyForApplicationWork?: number;
    receivedFromCx?: number;
    // Both
    stuckCases: number;
  };
  bySubStatus: {
    subStatus: string;
    label: string;
    stage: string;
    stageLabel?: string;
    count: number;
  }[];
  casesByStage: { stage: string; label: string; count: number }[];
  caseOutcomes?: {
    approved: number;
    refused: number;
    withdrawn: number;
    pending: number;
    filesSubmitted: number;
    approvalRate: number | null;
    refusalRate: number | null;
  };
}

export async function fetchOpsDashboard(
  filters: OpsDashboardFilters = {}
): Promise<OpsDashboardData> {
  const q = new URLSearchParams();
  q.set("filter", filters.filter ?? "monthly");
  if (filters.fromDate) q.set("fromDate", filters.fromDate);
  if (filters.toDate) q.set("toDate", filters.toDate);
  const { data } = await api.get<{ success: boolean; data: OpsDashboardData }>(
    `/api/modules/reports/ops-dashboard?${q}`
  );
  return data.data;
}

/* ------------------------------------------------------------------ */
/* Category counts — 3 parallel calls to visa-cases list               */
/* ------------------------------------------------------------------ */

/** Fetch just the total count for a single visa category (1-row page for pagination). */
export async function fetchVisaCategoryCount(
  category: "visitor" | "spouse" | "student",
  filters: { fromDate?: string; toDate?: string } = {}
): Promise<number> {
  const q = new URLSearchParams({ page: "1", pageSize: "1", visaCategory: category });
  if (filters.fromDate) q.set("fromDate", filters.fromDate);
  if (filters.toDate) q.set("toDate", filters.toDate);
  const { data } = await api.get<VisaCasesResponse>(`/api/modules/visa-cases?${q}`);
  const p = data.pagination;
  return Number(p?.total ?? (p as any)?.totalCount ?? (p as any)?.totalItems ?? (p as any)?.count ?? 0);
}

export async function fetchBackendReportsDashboard(
  filters: BackendReportsDashboardFilters = {}
): Promise<BackendReportsDashboardResult> {
  const q = new URLSearchParams();
  q.set("filter", filters.filter ?? "monthly");
  if (filters.fromDate) q.set("fromDate", filters.fromDate);
  if (filters.toDate) q.set("toDate", filters.toDate);
  if (filters.branchCode) q.set("branchCode", filters.branchCode);

  const { data } = await api.get<{ success: boolean; data: BackendReportsDashboardRaw }>(
    `/api/modules/reports/backend-dashboard?${q}`
  );
  return mapReportsDashboardRaw(data.data);
}

/* ------------------------------------------------------------------ */
/* Backend Report — GET /api/modules/reports/backend-report            */
/* ------------------------------------------------------------------ */

export type BackendReportFilters = BackendReportsDashboardFilters;

export interface BackendReportDecisionTotals {
  approved: number;
  refused: number;
  withdrawn: number;
  pending: number;
  total: number;
}

export interface BackendReportResult {
  data: BackendDashboardData;
  decisionTotals: BackendReportDecisionTotals;
}

interface BackendReportRaw {
  meta: {
    title: string;
    viewerRole: string;
    generatedAt: string;
    period: { filter: string; fromDate: string; toDate: string };
    branchCode: string | null;
    availableFilters: string[];
    enrollmentTrendGranularity?: string;
  };
  kpiCards: {
    totalCases: { value: number; subtitle: string };
    approvalRate: { value: string | null; subtitle: string; decided?: number; approved?: number };
    totalCharges: { value: string; currency: string; subtitle: string };
    outstanding: { value: string; currency: string; subtitle: string; clientsWithBalance?: number };
    collectionRate: { value: string | null; subtitle: string };
    avgDecisionDays: { value: string | null; subtitle: string };
  };
  financialSummary: {
    currency: string;
    totalCharges: string;
    initialChargesReceived: string;
    financeCharges: string;
    totalBalanceDue: string;
    collectionPercent: string | null;
    avgChargePerClient: string;
    clientsFullyPaid: number;
    clientsWithBalanceDue: number;
  };
  enrollmentTrend: { month: string; enrollments: number }[];
  quickHighlights: {
    topDestination: string;
    topTravelReason: string;
    topSponsorType: string;
  };
  byDestinationCountry: { label: string; count: number }[];
  byReasonOfTravel: { label: string; count: number }[];
  bySponsorRelationship: { label: string; count: number }[];
  decisionByDestination: {
    rows: {
      destination: string;
      approved: number;
      refused: number;
      withdrawn: number;
      pending: number;
      total: number;
    }[];
    totals: {
      destination: string;
      approved: number;
      refused: number;
      withdrawn: number;
      pending: number;
      total: number;
    };
  };
  accompanyingMembers: {
    totalAccompanyingMembers: number;
    avgMembersPerCase: string;
    casesWithAccompanying: number;
  };
  processingTimes: {
    enrollmentToSubmissionDays: string;
    submissionToDecisionDays: string;
    enrollmentToDecisionDays: string;
  };
  caseOutcomes: {
    approved: number;
    refused: number;
    withdrawn: number;
    pending: number;
    filesSubmitted: number;
    approvalRate: string | null;
    refusalRate: string | null;
  };
}

function parsePercentValue(value: string | number | null | undefined): number | null {
  if (value == null || value === "") return null;
  if (typeof value === "number") return value;
  const parsed = parseFloat(String(value).replace("%", "").trim());
  return Number.isFinite(parsed) ? parsed : null;
}

function parseAmount(value: string | number | null | undefined): number {
  const parsed = typeof value === "number" ? value : Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function parseOptionalDays(value: string | number | null | undefined): number | null {
  if (value == null || value === "") return null;
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function mapBackendReportRaw(raw: BackendReportRaw): BackendReportResult {
  const n = (s: string | null | undefined) => Number(s ?? 0) || 0;
  const fin = raw.financialSummary;
  const co = raw.caseOutcomes;
  const decided = co.approved + co.refused;
  const approvalRate =
    parsePercentValue(raw.kpiCards.approvalRate.value) ??
    parsePercentValue(co.approvalRate) ??
    (decided > 0 ? (co.approved / decided) * 100 : null);
  const refusalRate =
    parsePercentValue(co.refusalRate) ?? (decided > 0 ? (co.refused / decided) * 100 : null);
  const totalCharges = parseAmount(fin.totalCharges);
  const totalBalanceDue = parseAmount(fin.totalBalanceDue);
  const collected = totalCharges - totalBalanceDue;

  const data: BackendDashboardData = {
    totalClients: raw.kpiCards.totalCases.value,
    approvalRate,
    outstandingBalance: parseAmount(raw.kpiCards.outstanding.value),

    caseOutcomes: {
      totalEnrolled: raw.kpiCards.totalCases.value,
      approved: co.approved,
      refused: co.refused,
      withdrawn: co.withdrawn,
      pending: co.pending,
      filesSubmitted: co.filesSubmitted,
      approvalRate,
      refusalRate,
    },

    byDestination: raw.byDestinationCountry.map((r) => ({ name: r.label, count: r.count })),
    bySponsor: raw.bySponsorRelationship.map((r) => ({ name: r.label, count: r.count })),
    byTravelReason: raw.byReasonOfTravel.map((r) => ({ name: r.label, count: r.count })),
    casesByStage: [],
    bySaleType: [],

    financial: {
      totalCharges,
      initialReceived: n(fin.initialChargesReceived),
      financeCharges: n(fin.financeCharges),
      totalBalanceDue,
      collectionPct:
        parsePercentValue(fin.collectionPercent) ??
        (totalCharges > 0 ? (collected / totalCharges) * 100 : null),
      avgChargePerClient: n(fin.avgChargePerClient),
      clientsFullyPaid: fin.clientsFullyPaid,
      clientsWithBalance: fin.clientsWithBalanceDue,
    },

    processingTimes: {
      enrollmentToSubmission: parseOptionalDays(raw.processingTimes.enrollmentToSubmissionDays),
      submissionToDecision: parseOptionalDays(raw.processingTimes.submissionToDecisionDays),
      enrollmentToDecision: parseOptionalDays(raw.processingTimes.enrollmentToDecisionDays),
    },

    accompanying: {
      totalMembers: raw.accompanyingMembers.totalAccompanyingMembers,
      avgPerCase: parseOptionalDays(raw.accompanyingMembers.avgMembersPerCase),
      casesWithAccompanying: raw.accompanyingMembers.casesWithAccompanying,
    },

    highlights: {
      topDestination: raw.quickHighlights.topDestination,
      topTravelReason: raw.quickHighlights.topTravelReason,
      topSponsorType: raw.quickHighlights.topSponsorType,
    },

    decisionByDestination: raw.decisionByDestination.rows.map((r) => ({
      name: r.destination,
      approved: r.approved,
      refused: r.refused,
      withdrawn: r.withdrawn,
      pending: r.pending,
      total: r.total,
    })),

    enrollmentTrend: raw.enrollmentTrend ?? [],
  };

  const totals = raw.decisionByDestination.totals;
  return {
    data,
    decisionTotals: {
      approved: totals.approved,
      refused: totals.refused,
      withdrawn: totals.withdrawn,
      pending: totals.pending,
      total: totals.total,
    },
  };
}

export async function fetchBackendReport(
  filters: BackendReportFilters = {}
): Promise<BackendReportResult> {
  const q = new URLSearchParams();
  q.set("filter", filters.filter ?? "monthly");
  if (filters.fromDate) q.set("fromDate", filters.fromDate);
  if (filters.toDate) q.set("toDate", filters.toDate);
  if (filters.branchCode) q.set("branchCode", filters.branchCode);

  const { data } = await api.get<{ success: boolean; data: BackendReportRaw }>(
    `/api/modules/reports/backend-report?${q}`
  );
  return mapBackendReportRaw(data.data);
}

/* ------------------------------------------------------------------ */
/* GET /api/modules/reports/enrollment-trend                           */
/* ------------------------------------------------------------------ */

export type EnrollmentTrendRange = "6_month" | "12_month" | "maximum";

export interface EnrollmentTrendResult {
  enrollmentTrend: { month: string; enrollments: number }[];
  meta: {
    range: string;
    rangeLabel: string;
    totalEnrollments: number;
  };
}

export async function fetchEnrollmentTrend(
  range: EnrollmentTrendRange = "12_month",
  branchCode?: string
): Promise<EnrollmentTrendResult> {
  const q = new URLSearchParams();
  q.set("range", range);
  if (branchCode) q.set("branchCode", branchCode);
  const { data } = await api.get<{
    success: boolean;
    data: { meta: EnrollmentTrendResult["meta"] & Record<string, unknown>; enrollmentTrend: { month: string; enrollments: number }[] };
  }>(`/api/modules/reports/enrollment-trend?${q}`);
  return { enrollmentTrend: data.data.enrollmentTrend ?? [], meta: data.data.meta };
}
