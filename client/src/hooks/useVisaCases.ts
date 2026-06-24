import { useQuery, useMutation, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import {
  fetchVisaCases,
  fetchCountries,
  fetchVisaCaseByLegacyClientId,
  updateVisaCaseSponsorship,
  updateVisaCaseTravel,
  assignVisaCase,
  assignBulkVisaCases,
  changeVisaCaseStatus,
  fetchAssignableUsers,
  fetchAllBackendUsers,
  fetchAllSystemUsers,
  fetchProcessingStages,
  fetchVisaCaseDashboard,
  fetchBackendReportsDashboard,
  fetchBackendReport,
  fetchEnrollmentTrend,
  fetchVisaCategoryCount,
  fetchOpsDashboard,
  type VisaCaseFilters,
  type UpdateSponsorshipBody,
  type UpdateTravelBody,
  type AssignVisaCaseBody,
  type AssignBulkBody,
  type ChangeStatusBody,
  type VisaCaseDashboardFilters,
  type BackendReportsDashboardFilters,
  type BackendReportFilters,
  type EnrollmentTrendRange,
  type OpsDashboardFilters,
  type FetchDocumentRequestsParams,
  fetchDocumentRequests,
  resolveDocumentRequest,
} from "@/api/visaCases.api";

/**
 * Fetches a page of the Visa Cases list (GET /api/modules/visa-cases) and
 * returns `{ rows, pagination }` — rows already mapped to the UI `VisaClient`
 * shape used by the Backend / CX list tables. Previous page data is kept while
 * the next page loads so the table doesn't flash empty during pagination.
 */
export function useVisaCases(filters: VisaCaseFilters = {}, enabled = true) {
  return useQuery({
    queryKey: ["visa-cases", filters],
    queryFn: () => fetchVisaCases(filters),
    placeholderData: keepPreviousData,
    staleTime: 1000 * 60 * 2,
    enabled,
  });
}

/** Active countries (GET /api/modules/countries) for the destination dropdown. */
export function useVisaCountries() {
  return useQuery({
    queryKey: ["visa-countries"],
    queryFn: () => fetchCountries(),
    staleTime: 1000 * 60 * 10,
  });
}

/**
 * Resolve the raw visa case for a client (by legacy numeric id) so a page that
 * only has the legacy id can read/edit visa-case fields (sponsorship, etc.).
 * Passing the client's counsellorId narrows the server-side scan.
 */
export function useVisaCaseByClient(legacyClientId: number | null, counsellorId?: number | null) {
  return useQuery({
    queryKey: ["visa-case-by-client", legacyClientId],
    queryFn: () => fetchVisaCaseByLegacyClientId(legacyClientId!, { counsellorId }),
    enabled: !!legacyClientId,
    staleTime: 1000 * 60 * 5,
  });
}

/** Processing stages + the caller's RBAC-filtered updatable sub-statuses. */
export function useProcessingStages(enabled = true) {
  return useQuery({
    queryKey: ["processing-stages"],
    queryFn: fetchProcessingStages,
    enabled,
    staleTime: 1000 * 60 * 30,
  });
}

/**
 * Fetch users available to be assigned a visa case.
 * Pass `targetRole` to scope to a specific team (required for non-admin callers).
 * e.g. useAssignableUsers(true, "binding") for a CX user handing off to Binding.
 */
export function useAssignableUsers(enabled = true, targetRole?: string) {
  return useQuery({
    queryKey: ["assignable-users", targetRole ?? "all"],
    queryFn: () => fetchAssignableUsers(targetRole),
    enabled,
    staleTime: 1000 * 60 * 10,
  });
}

/**
 * Fetch all CX / Binding / Application users from /api/users/users.
 * Used by BK_Clients for the Handled By name lookup and bulk-assign dropdown.
 */
export function useAllBackendUsers(enabled = true) {
  return useQuery({
    queryKey: ["all-backend-users"],
    queryFn: fetchAllBackendUsers,
    enabled,
    staleTime: 1000 * 60 * 10,
  });
}

/**
 * Fetch ALL system users (every role) from /api/users/users.
 * Used in CSV export to resolve counsellor names (stored as userId on visa cases).
 */
export function useAllSystemUsers(enabled = true) {
  return useQuery({
    queryKey: ["all-system-users"],
    queryFn: fetchAllSystemUsers,
    enabled,
    staleTime: 1000 * 60 * 10,
  });
}

/** Assign / hand off a visa case, refreshing the cases list and the by-client lookup on success. */
export function useAssignVisaCase(legacyClientId?: number | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ visaCaseId, body }: { visaCaseId: string; body: AssignVisaCaseBody }) =>
      assignVisaCase(visaCaseId, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["visa-cases"] });
      if (legacyClientId != null) {
        queryClient.invalidateQueries({ queryKey: ["visa-case-by-client", legacyClientId] });
        queryClient.invalidateQueries({ queryKey: ["client-journey-timeline", legacyClientId] });
      }
    },
  });
}

/** Update a visa case's sponsorship details, refreshing the by-client lookup on success. */
export function useUpdateSponsorship(legacyClientId: number | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ visaCaseId, body }: { visaCaseId: string; body: UpdateSponsorshipBody }) =>
      updateVisaCaseSponsorship(visaCaseId, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["visa-case-by-client", legacyClientId] });
      queryClient.invalidateQueries({ queryKey: ["visa-cases"] });
    },
  });
}

/**
 * Fetches the visa-case dashboard aggregate (GET /api/modules/visa-cases/dashboard).
 * Returns a `BackendDashboardData` object — same shape used by BackendDashboard.tsx.
 * Pass `enabled: false` to skip the fetch until filters are ready.
 */
export function useVisaCaseDashboard(filters: VisaCaseDashboardFilters = {}, enabled = true) {
  return useQuery({
    queryKey: ["visa-case-dashboard", filters],
    queryFn: () => fetchVisaCaseDashboard(filters),
    enabled,
    staleTime: 1000 * 60 * 2,
  });
}

/**
 * Fetches the backend reports dashboard (GET /api/modules/reports/backend-dashboard).
 * Returns `{ data, leaderboard }` — `data` maps to `BackendDashboardData`, `leaderboard` is
 * the team leaderboard array from the new endpoint.
 */
export function useBackendReportsDashboard(filters: BackendReportsDashboardFilters = {}, enabled = true) {
  return useQuery({
    queryKey: ["backend-reports-dashboard", filters],
    queryFn: () => fetchBackendReportsDashboard(filters),
    enabled,
    staleTime: 1000 * 60 * 2,
  });
}

/**
 * Fetches the full backend analytics report (GET /api/modules/reports/backend-report).
 * Returns KPI cards, financial summary, enrollment trend, breakdowns, and processing times.
 */
export function useBackendReport(filters: BackendReportFilters = {}, enabled = true) {
  return useQuery({
    queryKey: ["backend-report", filters],
    queryFn: () => fetchBackendReport(filters),
    enabled,
    staleTime: 1000 * 60 * 2,
  });
}

/**
 * Fetches the enrollment trend chart data from the dedicated endpoint
 * (GET /api/modules/reports/enrollment-trend).
 * range: "6_month" | "12_month" | "maximum"
 */
export function useEnrollmentTrend(range: EnrollmentTrendRange = "12_month", enabled = true) {
  return useQuery({
    queryKey: ["enrollment-trend", range],
    queryFn: () => fetchEnrollmentTrend(range),
    enabled,
    staleTime: 1000 * 60 * 5,
  });
}

/**
 * Fetches the personal ops team dashboard (GET /api/modules/reports/ops-dashboard).
 * Scoped to the logged-in user's role (cx, binding, or application).
 * Supports filter: today | weekly | monthly | custom.
 */
export function useOpsDashboard(filters: OpsDashboardFilters = {}, enabled = true) {
  return useQuery({
    queryKey: ["ops-dashboard", filters],
    queryFn: () => fetchOpsDashboard(filters),
    enabled,
    staleTime: 1000 * 60 * 2,
  });
}

/**
 * Fetches total case counts for Visitor / Spouse / Student in parallel.
 * Used by the Backend Dashboard KPI cards to show the category breakdown chips.
 */
export function useVisaCategoryCounts(
  filters: { fromDate?: string; toDate?: string } = {},
  enabled = true
) {
  return useQuery({
    queryKey: ["visa-category-counts", filters],
    queryFn: async () => {
      const [visitor, spouse, student] = await Promise.all([
        fetchVisaCategoryCount("visitor", filters),
        fetchVisaCategoryCount("spouse", filters),
        fetchVisaCategoryCount("student", filters),
      ]);
      return { visitor, spouse, student };
    },
    enabled,
    staleTime: 1000 * 60 * 2,
  });
}

/**
 * Assign one or many visa cases to a user in a single API call
 * (POST /api/modules/visa-cases/assign-bulk).
 * Invalidates the case list and, if `legacyClientId` is provided, the
 * per-client lookup and journey timeline so the UI refreshes immediately.
 */
export function useAssignBulkVisaCases(legacyClientId?: number | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: AssignBulkBody) => assignBulkVisaCases(body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["visa-cases"] });
      if (legacyClientId != null) {
        queryClient.invalidateQueries({ queryKey: ["visa-case-by-client", legacyClientId] });
        queryClient.invalidateQueries({ queryKey: ["client-journey-timeline", legacyClientId] });
      }
    },
  });
}

/** Change the processing sub-status of a visa case via the real API. */
export function useChangeVisaCaseStatus(legacyClientId?: number | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ visaCaseId, body }: { visaCaseId: string; body: ChangeStatusBody }) =>
      changeVisaCaseStatus(visaCaseId, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["visa-cases"] });
      if (legacyClientId != null) {
        queryClient.invalidateQueries({ queryKey: ["visa-case-by-client", legacyClientId] });
        queryClient.invalidateQueries({ queryKey: ["client-journey-timeline", legacyClientId] });
      }
    },
  });
}

/** Update a visa case's travel details, refreshing the by-client lookup on success. */
export function useUpdateTravel(legacyClientId: number | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ visaCaseId, body }: { visaCaseId: string; body: UpdateTravelBody }) =>
      updateVisaCaseTravel(visaCaseId, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["visa-case-by-client", legacyClientId] });
      queryClient.invalidateQueries({ queryKey: ["visa-cases"] });
    },
  });
}

/** Fetch paginated document requests from GET /api/modules/visa-cases/document-requests. */
export function useDocumentRequests(params: FetchDocumentRequestsParams = {}, enabled = true) {
  return useQuery({
    queryKey: ["document-requests", params],
    queryFn: () => fetchDocumentRequests(params),
    enabled,
    staleTime: 30_000,
  });
}

/** Mark a document request as FULFILLED via PATCH. */
export function useResolveDocumentRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, notes }: { id: string; notes?: string }) => resolveDocumentRequest(id, notes),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["document-requests"] });
    },
  });
}
