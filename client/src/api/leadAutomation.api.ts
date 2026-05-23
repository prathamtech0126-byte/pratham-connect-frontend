import api from "@/lib/api";

export type FacebookPage = { id: string; name: string; pictureUrl?: string | null };
export type FacebookForm = { id: string; name: string; isArchived?: boolean };

export type ActiveFormMap = Record<
  string,
  {
    formId: string;
    formName: string;
    pageId: string;
    pageName: string;
    distributionStrategy?: string;
    active: boolean;
    activatedAt: string;
    deactivatedAt: string | null;
  }
>;

export type FacebookStatus = {
  connected: boolean;
  isExpired: boolean;
  expiresAt: string | null;
  account?: { id: string; name: string; pictureUrl?: string | null } | null;
  connectedAt: string | null;
  activeFormsCount: number;
  pagesCount: number;
};

export type FormStrategy = {
  id: number;
  formId: string;
  formName: string | null;
  pageId: string | null;
  pageName: string | null;
  strategy: string | null;
  assignedTelecallers: number[];
  assignedCounsellors: number[];
  priorityWeights: Record<string, number>;
  isActive: boolean;
  isArchived: boolean;
  isMasterManaged: boolean;
  leadTypeId?: number | null;
  masterDistributionGroup?: string | null;
  roundRobinIndex: number;
  createdBy: number | null;
  createdAt: string;
  updatedAt: string;
};

export type FormStats = {
  totalLeads: number;
  distributedLeads: number;
  unassignedLeads: number;
  formName?: string;
  isActive?: boolean;
  strategy?: string;
};

export type PaginatedLead = {
  id: number;
  externalLeadId: string | null;
  fullName: string;
  phone: string;
  email: string | null;
  city: string | null;
  assignmentStatus: string;
  progressStatus: string;
  createdAt: string;
  updatedAt: string;
  campaignName: string | null;
  adName: string | null;
  formName: string | null;
  latestNote: string | null;
  currentTelecallerId: number | null;
  currentCounsellorId: number | null;
  telecallerName: string | null;
  counsellorName: string | null;
  customAnswers: Record<string, unknown>;
};

export type PaginatedLeads = {
  data: PaginatedLead[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
};

export type LeadTypePayload = {
  leadTypeId?: number;
  customLeadTypeName?: string;
};

export type DistributePayload = {
  leadIds: number[];
  strategy: string;
  assignedTelecallers: number[];
  assignedCounsellors: number[];
  priorityWeights?: Record<string, number>;
} & LeadTypePayload;

export type MasterDistributionGroup = {
  masterDistributionGroup: string;
  leadTypeId: number | null;
  saleTypeName: string | null;
  isActive: boolean;
  formIds: string[];
  strategy: string | null;
  assignedTelecallers: number[];
  assignedCounsellors: number[];
  priorityWeights: Record<string, number>;
};

// ── Auth ─────────────────────────────────────────────────────────────────────

export const getFacebookAuthUrl = async () => {
  const res = await api.get("/api/automation/facebook/auth-url", {
    params: { origin: window.location.origin },
  });
  return res.data.url as string;
};

export const getFacebookStatus = async () => {
  const res = await api.get("/api/automation/facebook/status");
  return res.data.data as FacebookStatus;
};

export const disconnectFacebook = async () => {
  await api.post("/api/automation/facebook/disconnect");
};

// ── Pages ─────────────────────────────────────────────────────────────────────

export const getFacebookPages = async (refresh = false) => {
  const res = await api.get("/api/automation/facebook/pages", {
    params: refresh ? { refresh: "1" } : undefined,
  });
  return (res.data.data || []) as FacebookPage[];
};

// ── Forms ─────────────────────────────────────────────────────────────────────

export const getFacebookForms = async (
  pageId: string,
  refresh = false,
  logContext?: "post_connect" | "manual"
) => {
  const res = await api.get(`/api/automation/facebook/forms/${pageId}`, {
    params: refresh ? { refresh: "1", ...(logContext ? { logContext } : {}) } : undefined,
  });
  return {
    live: (res.data.data || []) as FacebookForm[],
    archived: (res.data.archived || []) as FacebookForm[],
  };
};

export const getFacebookActiveForms = async () => {
  const res = await api.get("/api/automation/facebook/active-forms");
  return (res.data.data || {}) as ActiveFormMap;
};

export const toggleFacebookForm = async (payload: {
  pageId: string;
  formId: string;
  pageName: string;
  formName: string;
  distributionStrategy: string;
}) => {
  const res = await api.post(
    `/api/automation/facebook/forms/${payload.pageId}/${payload.formId}/toggle`,
    {
      pageName: payload.pageName,
      formName: payload.formName,
      distributionStrategy: payload.distributionStrategy,
    }
  );
  return {
    active: Boolean(res.data?.data?.active),
    distributionStrategy: String(
      res.data?.data?.distributionStrategy || payload.distributionStrategy
    ),
  };
};

// ── Strategy ──────────────────────────────────────────────────────────────────

export const getFormStrategy = async (formId: string): Promise<FormStrategy | null> => {
  const res = await api.get(`/api/automation/facebook/forms/${formId}/strategy`);
  return res.data?.data ?? null;
};

export const setFacebookFormStrategy = async (payload: {
  formId: string;
  distributionStrategy: string;
  assignedTelecallers: number[];
  assignedCounsellors: number[];
  priorityWeights: Record<string, number>;
  formName?: string;
  pageId?: string;
  pageName?: string;
} & LeadTypePayload) => {
  const res = await api.put(`/api/automation/facebook/forms/${payload.formId}/strategy`, {
    distributionStrategy: payload.distributionStrategy,
    leadTypeId: payload.leadTypeId,
    customLeadTypeName: payload.customLeadTypeName,
    assignedTelecallers: payload.assignedTelecallers,
    assignedCounsellors: payload.assignedCounsellors,
    priorityWeights: payload.priorityWeights,
    formName: payload.formName,
    pageId: payload.pageId,
    pageName: payload.pageName,
  });

  return res.data?.data as FormStrategy;
};

// ── Master distribution ───────────────────────────────────────────────────────

export const getMasterDistribution = async (
  pageId: string
): Promise<{ strategies: FormStrategy[]; groups: MasterDistributionGroup[] }> => {
  const res = await api.get("/api/automation/facebook/master-distribution", { params: { pageId } });
  const body = res.data?.data;
  if (Array.isArray(body)) {
    return { strategies: body as FormStrategy[], groups: [] };
  }
  return {
    strategies: (body?.strategies || []) as FormStrategy[],
    groups: (body?.groups || []) as MasterDistributionGroup[],
  };
};

export const saveMasterDistribution = async (payload: {
  pageId: string;
  pageName?: string;
  formIds: string[];
  deactivatedFormIds?: string[];
  strategy: string;
  assignedTelecallers: number[];
  assignedCounsellors: number[];
  priorityWeights: Record<string, number>;
  masterDistributionGroup?: string;
} & LeadTypePayload) => {
  const res = await api.post("/api/automation/facebook/master-distribution", payload);
  return res.data?.data as {
    activated: string[];
    deactivated: string[];
    masterDistributionGroup?: string;
    leadTypeId?: number;
    groupRemoved?: string;
  };
};

export const deactivateMasterForm = async (formId: string) => {
  await api.delete(`/api/automation/facebook/master-distribution/${formId}`);
};

// ── Per-form data ─────────────────────────────────────────────────────────────

export const getFormStats = async (formId: string): Promise<FormStats> => {
  const res = await api.get(`/api/automation/facebook/forms/${formId}/stats`);
  return res.data.data as FormStats;
};

export const getFormStatsBulk = async (
  formIds: string[]
): Promise<Record<string, FormStats>> => {
  if (formIds.length === 0) return {};
  const res = await api.post("/api/automation/facebook/forms/stats-bulk", { formIds });
  return (res.data?.data || {}) as Record<string, FormStats>;
};

export const getFormLeadsPaginated = async (
  formId: string,
  page = 1,
  limit = 20,
  filter: "all" | "unassigned" = "all"
): Promise<PaginatedLeads> => {
  const res = await api.get(`/api/automation/facebook/forms/${formId}/paginated-leads`, {
    params: { page, limit, filter },
  });
  return res.data.data as PaginatedLeads;
};

export const exportFormLeadsCsv = async (formId: string, formName?: string) => {
  const res = await api.get(`/api/automation/facebook/forms/${formId}/export`, {
    responseType: "blob",
  });
  const url = URL.createObjectURL(new Blob([res.data], { type: "text/csv" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = `leads-${formName || formId}.csv`;
  a.click();
  URL.revokeObjectURL(url);
};

export const distributeLeads = async (formId: string, payload: DistributePayload) => {
  const res = await api.post(
    `/api/automation/facebook/forms/${formId}/distribute-manual`,
    payload
  );
  return res.data.data as { distributed: number; assignments: { leadId: number; userId: number; role: string }[] };
};

export type FacebookManualAssignmentFilterApi = "assigned" | "unassigned" | "all";

export type ManualDistributionPagedLead = {
  id: number;
  formId: string | null;
  formName: string | null;
  externalLeadId: string | null;
  fullName: string;
  phone: string;
  email: string | null;
  city: string | null;
  assignmentStatus: string;
  progressStatus: string;
  createdAt: string;
  facebookCreatedAt: string;
  currentTelecallerId: number | null;
  currentCounsellorId: number | null;
  telecallerName: string | null;
  counsellorName: string | null;
};

export type ManualDistributionLeadsResponse = {
  data: ManualDistributionPagedLead[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
};

export type ManualDistributionAssigneeStat = {
  assigneeId: number;
  assigneeName: string;
  role: string;
  totalAssigned: number;
  transferredLeads: number;
};

export type FormWithLeads = { formId: string; formName: string | null };

export const importFacebookFormLeads = async (formId: string, opts?: { importOnly?: boolean }) => {
  const res = await api.post(
    `/api/automation/facebook/forms/${formId}/import`,
    {},
    { params: opts?.importOnly ? { importOnly: "1" } : {} }
  );
  return res.data.data as { formId: string; imported: number; importOnly?: boolean };
};

export const getFacebookManualDistributionLeads = async (params: {
  page?: number;
  limit?: number;
  assignment?: FacebookManualAssignmentFilterApi;
  formId?: string;
  createdFrom?: string;
  createdTo?: string;
}): Promise<ManualDistributionLeadsResponse> => {
  const res = await api.get("/api/automation/facebook/manual-distribution/leads", { params });
  const body = res.data.data as ManualDistributionLeadsResponse;
  return {
    ...body,
    data: (body.data || []).map((r) => ({
      ...r,
      createdAt: typeof r.createdAt === "string" ? r.createdAt : String(r.createdAt),
      facebookCreatedAt:
        typeof (r as { facebookCreatedAt?: string }).facebookCreatedAt === "string"
          ? (r as { facebookCreatedAt: string }).facebookCreatedAt
          : String((r as { facebookCreatedAt?: unknown }).facebookCreatedAt ?? ""),
    })),
  };
};

export const getFacebookManualDistributionByAssignee = async (params: {
  formId?: string;
  createdFrom?: string;
  createdTo?: string;
}): Promise<ManualDistributionAssigneeStat[]> => {
  const query: Record<string, string> = {};
  if (params.formId) query.formId = params.formId;
  if (params.createdFrom && params.createdTo) {
    query.createdFrom = params.createdFrom;
    query.createdTo = params.createdTo;
  }
  const res = await api.get("/api/automation/facebook/manual-distribution/by-assignee", { params: query });
  return res.data.data || [];
};

export const distributeFacebookManualBulk = async (payload: DistributePayload) => {
  const res = await api.post("/api/automation/facebook/manual-distribution/distribute-bulk", payload);
  return res.data.data as {
    distributed: number;
    assignments: { leadId: number; userId: number; role: string; formId?: string }[];
    byForm: { formId: string; distributed: number; assignments: { leadId: number; userId: number; role: string }[] }[];
  };
};

export const getFormsWithUnassignedLeads = async (): Promise<FormWithLeads[]> => {
  const res = await api.get("/api/automation/facebook/manual-distribution/forms-with-unassigned-leads");
  return res.data.data || [];
};

export type MetaConversionsStatus = {
  pixelId: string;
  facebookConnected: boolean;
  facebookExpired: boolean;
  hasDedicatedAccessToken: boolean;
  usingFacebookUserTokenFallback?: boolean;
  account?: { id: string; name: string; pictureUrl?: string | null } | null;
};

export type MetaGraphBatchResponse = {
  batchIndex: number;
  httpStatus: number;
  success: boolean;
  body: unknown;
  payload: { data: unknown[] };
  errorMessage?: string;
};

export type MetaConversionsSendResult = {
  sent: number;
  failed: number;
  results: {
    leadId: number;
    externalLeadId: string;
    success: boolean;
    eventName: string;
    eventId: string;
    error?: string;
  }[];
  metaResponses: MetaGraphBatchResponse[];
};

export const getMetaConversionsStatus = async () => {
  const res = await api.get("/api/automation/meta-conversions/status");
  return res.data.data as MetaConversionsStatus;
};

export const sendMetaConversionsEvents = async (
  leadIds: number[],
  sendMode: "progress" | "quality" = "progress"
) => {
  const res = await api.post("/api/automation/meta-conversions/send", { leadIds, sendMode });
  return res.data.data as MetaConversionsSendResult;
};

export const getFacebookLeads = async (formId?: string) => {
  const res = await api.get("/api/automation/facebook/leads", {
    params: { formId, limit: 50 },
  });
  return res.data.data || [];
};

export type SaleType = {
  id: number;
  saleType: string;
  categoryName?: string;
};

export async function getSaleTypes(): Promise<SaleType[]> {
  const res = await api.get("/api/sale-types");
  return res.data.data || [];
}
