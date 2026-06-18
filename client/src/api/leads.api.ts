// import api from "@/lib/api";

// export type LeadProgressStatus =
//   | "not_contacted"
//   | "contacted"
//   | "follow_up"
//   | "interested"
//   | "not_interested"
//   | "converted"
//   | "junk";

// export type LeadAssignmentStatus =
//   | "not_assigned"
//   | "assigned"
//   | "transferred"
//   | "converted";

// export interface LeadEntity {
//   id: number;
//   fullName: string;
//   phone: string;
//   whatsapp?: string | null;
//   email?: string | null;
//   city?: string | null;
//   leadType?: string | null;
//   latestNote?: string | null;
//   currentTelecallerId?: number | null;
//   currentCounsellorId?: number | null;
//   assignmentStatus: LeadAssignmentStatus;
//   progressStatus: LeadProgressStatus;
//   nextFollowupAt?: string | null;
//   createdAt: string;
//   updatedAt: string;
//   isJunk: boolean;
// }

// export interface LeadActivityEntity {
//   id: number;
//   leadId: number;
//   userId?: number | null;
//   activityType:
//     | "note"
//     | "followup"
//     | "call_log"
//     | "assignment_change"
//     | "counselor_assign";
//   message?: string | null;
//   followupAt?: string | null;
//   status: "pending" | "completed" | "cancelled";
//   createdAt: string;
// }

// export interface LeadListResponse {
//   items: LeadEntity[];
//   pagination: {
//     page: number;
//     limit: number;
//     total: number;
//     totalPages: number;
//   };
// }

// export interface LeadListParams {
//   search?: string;
//   progressStatus?: string;
//   assignmentStatus?: string;
//   currentTelecallerId?: number;
//   currentCounsellorId?: number;
//   isJunk?: boolean;
//   nextFollowupFrom?: string;
//   nextFollowupTo?: string;
//   page?: number;
//   limit?: number;
// }

// export const getLeads = async (params: LeadListParams = {}): Promise<LeadListResponse> => {
//   const res = await api.get("/api/leads", { params });
//   return {
//     items: res.data.items || [],
//     pagination: res.data.pagination,
//   };
// };

// export const getLeadDetail = async (
//   leadId: number
// ): Promise<{ lead: LeadEntity; activities: LeadActivityEntity[] }> => {
//   const res = await api.get(`/api/leads/${leadId}`);
//   return res.data.data;
// };

// export const createLeadApi = async (payload: {
//   fullName: string;
//   phone: string;
//   email?: string;
//   city?: string;
//   whatsapp?: string;
//   leadType?: string;
//   latestNote?: string;
//   currentTelecallerId?: number | null;
// }) => {
//   const res = await api.post("/api/leads", payload);
//   return res.data.data as LeadEntity;
// };

// export const updateLeadApi = async (leadId: number, payload: Record<string, unknown>) => {
//   const res = await api.put(`/api/leads/${leadId}`, payload);
//   return res.data.data as LeadEntity;
// };

// export const assignLeadApi = async (leadId: number, payload: { telecallerId?: number; counsellorId?: number }) => {
//   const res = await api.post(`/api/leads/${leadId}/assign`, payload);
//   return res.data.data as LeadEntity;
// };

// export const markLeadJunkApi = async (leadId: number, reason?: string) => {
//   const res = await api.post(`/api/leads/${leadId}/junk`, { reason });
//   return res.data.data as LeadEntity;
// };

// // export const markLeadFollowupApi = async (leadId: number, followupAt: string) => {
// //   const res = await api.post(`/api/leads/${leadId}/followup`, { followupAt });
// //   return res.data.data as LeadEntity;
// // };

// export const addLeadActivityApi = async (
//   leadId: number,
//   payload: {
//     activityType: "note" | "followup" | "call_log" | "assignment_change" | "counselor_assign";
//     message?: string;
//     followupAt?: string;
//     status?: "pending" | "completed" | "cancelled";
//     meta?: Record<string, unknown>;
//   }
// ) => {
//   const res = await api.post(`/api/leads/${leadId}/activities`, payload);
//   return res.data.data as LeadActivityEntity;
// };

// export const getLeadReportApi = async (params: {
//   from?: string;
//   to?: string;
//   assigneeId?: number;
//   status?: string;
// }) => {
//   const res = await api.get("/api/leads/reports", { params });
//   return res.data.data;
// };


import api from "@/lib/api";

export type LeadProgressStatus =
  | "not_contacted"
  | "contacted"
  | "follow_up"
  | "interested"
  | "not_interested"
  | "converted"
  | "junk";

export type LeadAssignmentStatus =
  | "not_assigned"
  | "assigned"
  | "transferred"
  | "converted"
  | "dropped";

export type LeadEligibilityStatus =
  | "eligible"
  | "not_eligible"
  | "future_prospect";

export type LeadQuality = "excellent" | "good" | "average" | "bad";

export interface LeadEntity {
  id: number;
  externalLeadId?: string | null;
  fullName: string;
  phone: string;
  whatsapp?: string | null;
  email?: string | null;
  city?: string | null;
  leadType?: string | null;
  leadSource?: string | null;
  latestNote?: string | null;
  dropReason?: string | null;
  currentTelecallerId?: number | null;
  currentCounsellorId?: number | null;
  assignedBy?: number | null;
  telecallerName?: string | null;
  counsellorName?: string | null;
  assignmentStatus: LeadAssignmentStatus;
  progressStatus: LeadProgressStatus;
  eligibilityStatus?: LeadEligibilityStatus | null;
  leadQuality?: LeadQuality | null;
  customAnswers?: Record<string, unknown>;
  nextFollowupAt?: string | null;
  pendingFollowUp?: boolean;
  transferredAt?: string | null;
  convertedAt?: string | null;
  droppedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  isJunk: boolean;
  referenceId?: number | null;
  referenceDisplayName?: string | null;
  reference?: LeadReferencePayload | null;
  referenceMeta?: LeadReferencePayload | null;
  sentToMeta?: boolean;
}

export interface LeadActivityEntity {
  id: number;
  leadId: number;
  userId?: number | null;
  userName?: string | null;
  activityType:
    | "note"
    | "followup"
    | "call_log"
    | "assignment_change"
    | "counselor_assign"
    | "lead_update"
    | "lead_created";
  meta?: Record<string, unknown>;
  message?: string | null;
  followupAt?: string | null;
  status: "pending" | "completed" | "cancelled";
  createdAt: string;
}

export interface LeadListResponse {
  items: LeadEntity[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface LeadListParams {
  search?: string;
  progressStatus?: string;
  assignmentStatus?: string;
  eligibilityStatus?: string;
  leadQuality?: string;
  currentTelecallerId?: number;
  currentCounsellorId?: number;
  isJunk?: boolean;
  nextFollowupFrom?: string;
  nextFollowupTo?: string;
  leadSource?: string;
  leadType?: string;
  /** Preset filter name — backend computes IST bounds (today/weekly/monthly). */
  dateFilter?: string;
  /** New-style date range: yyyy-MM-dd calendar dates (used for custom filter). */
  afterDate?: string;
  beforeDate?: string;
  /** Legacy ISO string dates (still accepted for sub-filters like transferred/converted/dropped). */
  createdFrom?: string;
  createdTo?: string;
  transferredFrom?: string;
  transferredTo?: string;
  convertedFrom?: string;
  convertedTo?: string;
  droppedFrom?: string;
  droppedTo?: string;
  page?: number;
  limit?: number;
  sortBy?: "created_at" | "updated_at" | "next_followup_at";
  sortOrder?: "asc" | "desc";
  counsellorListFilter?:
    | "not_contacted"
    | "in_progress"
    | "follow_up"
    | "converted"
    | "dropped";
  /** Include converted/dropped on counsellor-scoped lists (e.g. lead report). */
  forReport?: boolean;
  /** All leads for selected telecaller/counsellor (any assignment status). */
  assignedScope?: boolean;
  /** Report drilldown bucket computed on backend. */
  reportBucket?: "contacted" | "transferred";
  /** Leads with a pending follow-up activity (distinct by lead). */
  hasPendingFollowUp?: boolean;
  withoutTelecaller?: boolean;
  withTelecaller?: boolean;
  sentToMeta?: boolean;
  /** Restrict to leads that have a facebook_lead record (covers both FB and Instagram). */
  metaLeadsOnly?: boolean;
  /** true = only leads with quality set; false = only leads without quality */
  hasQuality?: boolean;
  /** Only show leads with assignmentStatus in (transferred, dropped, converted) or progressStatus = junk */
  excludeUnassigned?: boolean;
}

export const getLeads = async (
  params: LeadListParams = {}
): Promise<LeadListResponse> => {
  const res = await api.get("/api/leads", { params });

  return {
    items: res.data.items || [],
    pagination: res.data.pagination ?? {
      page: params.page ?? 1,
      limit: params.limit ?? 50,
      total: (res.data.items || []).length,
      totalPages: 1,
    },
  };
};

const FETCH_ALL_PAGE_SIZE = 500;

/** Load every page of leads (API max 500 per page). */
export async function fetchAllLeads(
  params: Omit<LeadListParams, "page" | "limit"> = {}
): Promise<LeadEntity[]> {
  const all: LeadEntity[] = [];
  let page = 1;
  let totalPages = 1;
  do {
    const res = await getLeads({ ...params, page, limit: FETCH_ALL_PAGE_SIZE });
    all.push(...(res.items || []));
    totalPages = res.pagination?.totalPages ?? 1;
    page += 1;
  } while (page <= totalPages);
  return all;
}

/** Note timelines keyed by lead id (for list Excel export). */
export const getBulkLeadNotesApi = async (
  leadIds: number[]
): Promise<Record<number, string>> => {
  const res = await api.post("/api/leads/bulk-notes", { leadIds });
  const data = res.data?.data ?? {};
  const out: Record<number, string> = {};
  for (const [key, value] of Object.entries(data)) {
    const id = Number(key);
    if (Number.isFinite(id) && typeof value === "string") out[id] = value;
  }
  return out;
};

export interface TelecallerLeadSummaryRow {
  telecallerId: number;
  total: number;
  contacted: number;
  notContacted: number;
  transferred: number;
  converted: number;
  dropped: number;
  followUp: number;
  junk: number;
}

export const getTelecallerLeadSummary = async (params: {
  dateFilter?: string;
  createdFrom?: string;
  createdTo?: string;
}): Promise<TelecallerLeadSummaryRow[]> => {
  const res = await api.get("/api/leads/telecaller-summary", { params });
  return (res.data.data || []) as TelecallerLeadSummaryRow[];
};

export interface TelecallerIndividualReport {
  stats: {
    assigned: number;
    contacted: number;
    notContacted: number;
    transferred: number;
    converted: number;
    pendingFollowUp: number;
    junk: number;
  };
  categoryBreakdown: Array<{
    type: string;
    assigned: number;
    transferred: number;
    converted: number;
    junk: number;
  }>;
  sourceBreakdown: Array<{
    source: string;
    assigned: number;
    transferred: number;
    converted: number;
  }>;
  counsellorBreakdown: Array<{
    counsellorId: number;
    received: number;
    converted: number;
    dropped: number;
  }>;
}

export const getTelecallerIndividualReport = async (
  telecallerId: number,
  params: { dateFilter?: string; afterDate?: string; beforeDate?: string } = {}
): Promise<TelecallerIndividualReport> => {
  const res = await api.get(`/api/leads/telecaller/${telecallerId}/report`, { params });
  return res.data.data as TelecallerIndividualReport;
};

export type CounsellorReportStats = {
  total: number;
  inProgress: number;
  followUp: number;
  converted: number;
  dropped: number;
  notContacted: number;
  contacted: number;
};

export type CounsellorReportSegment = {
  stats: CounsellorReportStats;
  typeBreakdown: Array<{
    type: string;
    assigned: number;
    converted: number;
    dropped: number;
  }>;
  sourceBreakdown: Array<{
    source: string;
    assigned: number;
    converted: number;
    dropped: number;
  }>;
};

export type CounsellorTelecallerBreakdownRow = {
  telecallerId: number;
  assigned: number;
  inProgress: number;
  followUp: number;
  converted: number;
  dropped: number;
  notContacted: number;
  contacted: number;
};

export interface CounsellorIndividualReport {
  stats: CounsellorReportStats;
  typeBreakdown: CounsellorReportSegment["typeBreakdown"];
  sourceBreakdown: CounsellorReportSegment["sourceBreakdown"];
  direct: CounsellorReportSegment;
  viaTelecaller: CounsellorReportSegment;
  telecallerBreakdown: CounsellorTelecallerBreakdownRow[];
}

export const getCounsellorIndividualReport = async (
  params: { dateFilter?: string; afterDate?: string; beforeDate?: string; counsellorId?: number } = {}
): Promise<CounsellorIndividualReport> => {
  const res = await api.get("/api/leads/counsellor-report", { params });
  return res.data.data as CounsellorIndividualReport;
};

export type TelecallerSourceBreakdownRow = {
  leadSource: string;
  assigned: number;
  transferred: number;
  converted: number;
};

export type TelecallerDashboardStats = {
  assigned: number;
  uncontacted: number;
  contacted: number;
  transferred: number;
  converted: number;
  followUpsToday: number;
  followUpsInPeriod: number;
  categoryBreakdown: { leadType: string; count: number }[];
  sourceBreakdown?: TelecallerSourceBreakdownRow[];
  cached?: boolean;
};

export const getTelecallerDashboardStats = async (params: {
  createdFrom?: string;
  createdTo?: string;
  followupFrom?: string;
  followupTo?: string;
}): Promise<TelecallerDashboardStats> => {
  const res = await api.get("/api/leads/telecaller-dashboard-stats", { params });
  return res.data.data as TelecallerDashboardStats;
};

export type AdminLeadReportStats = {
  summary: {
    assigned: number; unassigned: number; contacted: number; notContacted: number;
    transferred: number; converted: number; dropped: number; pendingFollowUp: number; junk: number;
  };
  telecallerStats: { id: number; name: string; assigned: number; transferred: number; converted: number; dropped: number; totalFollowUp: number; pendingFollowUp: number; junk: number }[];
  counsellorBreakdown: { id: number; name: string; received: number; converted: number; dropped: number; pending: number }[];
  sourceBreakdown: { source: string; assigned: number; transferred: number; converted: number; dropped: number }[];
  typeBreakdown: { type: string; assigned: number; transferred: number; converted: number; dropped: number }[];
};

export const getAdminLeadReportStats = async (params: {
  dateFilter?: string;
  afterDate?: string;
  beforeDate?: string;
  createdFrom?: string;
  createdTo?: string;
}): Promise<AdminLeadReportStats> => {
  const res = await api.get("/api/leads/admin-report-stats", { params });
  return res.data.data as AdminLeadReportStats;
};

export type LeadDetailMeta = {
  pendingFollowUp: boolean;
  counsellorHasActivity: boolean;
  canTransfer: boolean;
  canReassignCounsellor: boolean;
  canRevertJunk?: boolean;
  canModify?: boolean;
  isAdminLike: boolean;
  isConverted: boolean;
};

export type LeadStudentProfile = {
  id?: number;
  leadId?: number;
  gender?: string | null;
  dateOfBirth?: string | null;
  alternatePhone?: string | null;
  hasPassport?: boolean | null;
  passportNumber?: string | null;
  passportExpiryDate?: string | null;
  languageExamGiven?: boolean | null;
  visaRefusalDetails?: string | null;
  preferredCountry?: string | null;
  fieldOfInterest?: string | null;
};

export type LeadEducationRow = {
  id?: number;
  educationLevel?: string | null;
  schoolName?: string | null;
  specialization?: string | null;
  yearOfCompletion?: number | null;
  percentageOrCgpa?: string | null;
  numberOfBacklogs?: number | null;
};

export type LeadLanguageScoreRow = {
  id?: number;
  examType?: string | null;
  listening?: string | null;
  reading?: string | null;
  writing?: string | null;
  speaking?: string | null;
  overallBand?: string | null;
};

export type LeadFamilyMemberRow = {
  id?: number;
  memberName?: string | null;
  phoneNumber?: string | null;
};

export type LeadDetailResponse = {
  lead: LeadEntity;
  activities: LeadActivityEntity[];
  meta?: LeadDetailMeta;
  profile?: LeadStudentProfile | null;
  education?: LeadEducationRow[];
  languageScores?: LeadLanguageScoreRow[];
  familyMembers?: LeadFamilyMemberRow[];
};

export const getLeadDetail = async (leadId: number): Promise<LeadDetailResponse> => {
  const res = await api.get(`/api/leads/${leadId}`);
  return res.data.data;
};

export const createLeadApi = async (payload: {
  fullName: string;
  phone: string;
  email?: string;
  city?: string;
  whatsapp?: string;
  leadType?: string;
  leadSource?: string;
  latestNote?: string;
  currentTelecallerId?: number | null;
  referenceMeta?: LeadReferencePayload | null;
}) => {
  const res = await api.post("/api/leads", payload);
  return res.data.data as LeadEntity;
};

export type LeadReferencePayload = {
  kind: "client" | "internal" | "self";
  id: number;
  name: string;
  memberRole?: string | null;
  isManual?: boolean;
  counsellorId?: number | null;
  counsellorName?: string | null;
};

export const searchLeadReferenceClientsApi = async (search: string) => {
  const term = search.trim();
  if (term.length < 3) return [];
  const res = await api.get("/api/leads/reference/clients", {
    params: { search: term },
  });
  return (res.data?.data ?? []) as {
    id: number;
    fullName: string;
    counsellorId?: number | null;
    counsellorName?: string | null;
  }[];
};

export const searchLeadReferenceTeamApi = async (search: string) => {
  const term = search.trim();
  if (term.length < 3) return [];
  const res = await api.get("/api/leads/reference/team", {
    params: { search: term },
  });
  return (res.data?.data ?? []) as {
    id: number;
    fullName: string;
    memberRole: string;
  }[];
};

export const listLeadReferenceTeamDirectoryApi = async () => {
  const res = await api.get("/api/leads/reference/team-directory");
  return (res.data?.data ?? []) as {
    id: number;
    fullName: string;
    memberRole: string;
  }[];
};

export const listLeadReferenceCounsellorsApi = async () => {
  const res = await api.get("/api/leads/reference/counsellors");
  return (res.data?.data ?? []) as {
    id: number;
    fullName: string;
    role?: string;
  }[];
};

/** Counsellors + managers for telecaller transfer picker. */
export const listLeadTransferAssigneesApi = async () => {
  const res = await api.get("/api/leads/transfer-assignees");
  return (res.data?.data ?? []) as {
    id: number;
    fullName: string;
    role: string;
  }[];
};

export const updateLeadApi = async (
  leadId: number,
  payload: Record<string, unknown>
) => {
  const res = await api.put(`/api/leads/${leadId}`, payload);
  return res.data.data as LeadEntity;
};

/** Quality/eligibility only — never sends progressStatus (server applies rules). */
export const updateLeadFieldsApi = async (
  leadId: number,
  payload: {
    leadQuality?: LeadEntity["leadQuality"];
    eligibilityStatus?: LeadEntity["eligibilityStatus"];
    reason?: string;
  }
) => {
  const { reason, ...fields } = payload;
  const body: Record<string, unknown> = { ...fields };
  if (reason?.trim()) body.reason = reason.trim();
  return updateLeadApi(leadId, body);
};

export const assignLeadApi = async (
  leadId: number,
  payload: {
    telecallerId?: number;
    counsellorId?: number;
    isTelecallerTransfer?: boolean;
  }
) => {
  const res = await api.post(`/api/leads/${leadId}/assign`, payload);
  return res.data.data as LeadEntity;
};

export const bulkAssignLeadsApi = async (payload: {
  leadIds: number[];
  telecallerId?: number;
  counsellorId?: number;
  /** When assigning to telecaller: clear counsellor assignment if true */
  removeFromCounsellor?: boolean;
  /** When assigning to counsellor: clear telecaller assignment if true */
  removeFromTelecaller?: boolean;
}) => {
  const res = await api.post("/api/leads/bulk-assign", payload);
  return res.data.data as {
    updated: LeadEntity[];
    blocked: number[];
    missing: number[];
  };
};

export type BulkStrategyAssignPreview = {
  assignments: {
    leadId: number;
    leadName: string;
    userId: number;
    userName: string;
    role: "telecaller" | "counsellor";
  }[];
  summary: {
    userId: number;
    userName: string;
    role: "telecaller" | "counsellor";
    count: number;
  }[];
  blocked: number[];
  missing: number[];
  conflictCounts: {
    withTelecaller: number;
    withCounsellor: number;
  };
};

export const previewBulkStrategyAssignApi = async (payload: {
  leadIds: number[];
  strategy: string;
  assignedTelecallers: number[];
  assignedCounsellors: number[];
  priorityWeights?: Record<string, number>;
}) => {
  const res = await api.post("/api/leads/bulk-assign-strategy", {
    ...payload,
    preview: true,
  });
  return res.data.data as BulkStrategyAssignPreview;
};

export const bulkStrategyAssignLeadsApi = async (payload: {
  leadIds: number[];
  strategy: string;
  assignedTelecallers: number[];
  assignedCounsellors: number[];
  priorityWeights?: Record<string, number>;
  removeFromPreviousAssignee?: boolean;
}) => {
  const res = await api.post("/api/leads/bulk-assign-strategy", payload);
  return res.data.data as BulkStrategyAssignPreview & { updated: LeadEntity[] };
};

export const markLeadJunkApi = async (
  leadId: number,
  reason?: string
) => {
  const res = await api.post(`/api/leads/${leadId}/junk`, { reason });
  return res.data.data as LeadEntity;
};

/** Admin: restore junk lead and optionally assign it during restore. */
export const revertLeadJunkApi = async (
  leadId: number,
  payload?: { telecallerId?: number; counsellorId?: number }
) => {
  const res = await api.post(`/api/leads/${leadId}/revert-junk`, payload ?? {});
  return res.data.data as LeadEntity;
};

/** Counsellor: convert lead → client_information row */
export const convertLeadToClientApi = async (leadId: number) => {
  const res = await api.post(`/api/leads/${leadId}/convert-to-client`);
  return res.data.data as { lead: LeadEntity; client: { clientId: number } };
};

/** Counsellor: drop lead with mandatory reason */
export const dropLeadByCounsellorApi = async (leadId: number, reason: string) => {
  const res = await api.post(`/api/leads/${leadId}/drop`, { reason });
  return res.data.data as LeadEntity;
};

/* NEW FOLLOWUP API */

export const markLeadFollowupApi = async (
  leadId: number,
  payload: {
    followupAt: string;
    message?: string | null;
  }
) => {
  const res = await api.post(`/api/leads/${leadId}/followup`, payload);
  return {
    lead: res.data.data as LeadEntity,
    activity: res.data.activity as LeadActivityEntity | undefined,
  };
};

export const addLeadActivityApi = async (
  leadId: number,
  payload: {
    activityType:
      | "note"
      | "followup"
      | "call_log"
      | "assignment_change"
      | "counselor_assign";
    message?: string;
    followupAt?: string;
    status?: "pending" | "completed" | "cancelled";
    meta?: Record<string, unknown>;
  }
) => {
  const res = await api.post(`/api/leads/${leadId}/activities`, payload);
  return {
    activity: res.data.data as LeadActivityEntity,
    lead: (res.data.lead ?? null) as LeadEntity | null,
  };
};

export type CsvImportResult = {
  created: number;
  failed: number;
  errors: { row: number; message: string }[];
};

export const importLeadsCsvApi = async (file: File): Promise<CsvImportResult> => {
  const form = new FormData();
  form.append("file", file);
  const res = await api.post("/api/leads/import", form, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return res.data.data as CsvImportResult;
};

export const downloadLeadImportTemplate = async (): Promise<Blob> => {
  const res = await api.get("/api/leads/import/template", { responseType: "blob" });
  return res.data as Blob;
};

export const getLeadReportApi = async (params: {
  from?: string;
  to?: string;
  assigneeId?: number;
  status?: string;
}) => {
  const res = await api.get("/api/leads/reports", { params });
  return res.data.data;
};

export const addNoteApi = async (leadId: number, message: string) => {
  const res = await api.post(`/api/leads/${leadId}/activities`, {
    activityType: "note",
    message,
    status: "completed",
  });
  return res.data as { data?: LeadActivityEntity; lead?: LeadEntity };
};

export const updateActivityStatusApi = async (
  leadId: number,
  activityId: number,
  status: "pending" | "completed" | "cancelled",
  options?: { message?: string }
) => {
  const res = await api.put(`/api/leads/${leadId}/activities/${activityId}/status`, {
    status,
    ...(options?.message?.trim() ? { message: options.message.trim() } : {}),
  });
  return res.data.data;
};

export const updateLeadActivityMessageApi = async (
  leadId: number,
  activityId: number,
  message: string
) => {
  const res = await api.patch(`/api/leads/${leadId}/activities/${activityId}`, {
    message: message.trim(),
  });
  return res.data.data as LeadActivityEntity;
};