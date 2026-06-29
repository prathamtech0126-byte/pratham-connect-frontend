import api from "@/lib/api";

export interface FrontDeskLead {
  id: number;
  fullName: string;
  phone: string;
  email: string | null;
  city: string | null;
  leadSource: string | null;
  leadType: string | null;
  externalLeadId: string | null;
  assignmentStatus: string;
  progressStatus: string;
  isVerified: boolean;
  verifiedAt: string | null;
  createdAt: string;
  currentCounsellorId: number | null;
  counsellorName: string | null;
}

export interface FrontDeskLeadDetail extends FrontDeskLead {
  verifiedByFrontDeskId: number | null;
  profile: {
    id: number;
    gender: string | null;
    dateOfBirth: string | null;
    alternatePhone: string | null;
    hasPassport: boolean;
    passportNumber: string | null;
    passportExpiryDate: string | null;
    languageExamGiven: boolean;
    visaRefusalDetails: string | null;
    preferredCountry: string | null;
    fieldOfInterest: string | null;
    sourceReferenceId: string | null;
  } | null;
  education: Array<{
    id: number;
    educationLevel: string | null;
    schoolName: string | null;
    specialization: string | null;
    yearOfCompletion: number | null;
    percentageOrCgpa: string | null;
    numberOfBacklogs: number;
  }>;
  languageScores: Array<{
    id: number;
    examType: string | null;
    listening: string | null;
    reading: string | null;
    writing: string | null;
    speaking: string | null;
    overallBand: string | null;
  }>;
  familyMembers: Array<{
    id: number;
    memberName: string | null;
    phoneNumber: string | null;
  }>;
}

export interface LeadsListResponse {
  success: boolean;
  rows: FrontDeskLead[];
  total: number;
  page: number;
  limit: number;
}

export interface Counsellor {
  id: number;
  fullName: string;
  email: string;
}

export interface DashboardStats {
  total: number;
  verified: number;
  assigned: number;
  notAssigned: number;
}

export interface EditLinkRecord {
  id: number;
  expiresAt: string;
  revoked: boolean;
  createdAt: string;
  createdByUserId: number;
}

export interface CreateEditLinkResponse {
  success: boolean;
  tokenId: number;
  token: string;
  editUrl: string | null;
  expiresAt: string;
  leadId: number;
}

export interface ActivityLogEntry {
  id: number;
  userId?: number;
  userName?: string | null;
  action: string;
  description: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
  leadId: number | null;
  leadName: string | null;
  leadPhone: string | null;
}

export const frontDeskApi = {
  getStats: (params?: { startDate?: string; endDate?: string }): Promise<{ success: boolean; data: DashboardStats }> => {
    const q = new URLSearchParams();
    if (params?.startDate) q.set("startDate", params.startDate);
    if (params?.endDate) q.set("endDate", params.endDate);
    return api.get(`/api/front-desk/stats?${q}`).then((r) => r.data);
  },

  getActivityLogs: (params?: { page?: number; limit?: number }): Promise<{ success: boolean; rows: ActivityLogEntry[]; total: number; page: number; limit: number }> => {
    const q = new URLSearchParams();
    if (params?.page) q.set("page", String(params.page));
    if (params?.limit) q.set("limit", String(params.limit));
    return api.get(`/api/front-desk/activity?${q}`).then((r) => r.data);
  },

  updateLeadDetails: (id: number, body: Record<string, unknown>): Promise<{ success: boolean; message: string }> =>
    api.put(`/api/front-desk/leads/${id}`, body).then((r) => r.data),
  getLeads: (params: {
    search?: string;
    startDate?: string;
    endDate?: string;
    isVerified?: boolean;
    leadType?: string;
    page?: number;
    limit?: number;
  }): Promise<LeadsListResponse> => {
    const q = new URLSearchParams();
    if (params.search) q.set("search", params.search);
    if (params.startDate) q.set("startDate", params.startDate);
    if (params.endDate) q.set("endDate", params.endDate);
    if (params.isVerified !== undefined) q.set("isVerified", String(params.isVerified));
    if (params.leadType) q.set("leadType", params.leadType);
    if (params.page) q.set("page", String(params.page));
    if (params.limit) q.set("limit", String(params.limit));
    return api.get(`/api/front-desk/leads?${q}`).then((r) => r.data);
  },

  getSaleTypes: (): Promise<{ success: boolean; data: string[] }> =>
    api.get("/api/front-desk/sale-types").then((r) => r.data),

  getLeadDetail: (id: number): Promise<{ success: boolean; data: FrontDeskLeadDetail }> =>
    api.get(`/api/front-desk/leads/${id}`).then((r) => r.data),

  verifyLead: (id: number, saleType: string, source: string, counsellorId?: number): Promise<{ success: boolean; message: string }> =>
    api.post(`/api/front-desk/leads/${id}/verify`, { saleType, source, counsellorId }).then((r) => r.data),

  assignLead: (id: number, counsellorId: number, leadType?: string): Promise<{ success: boolean; message: string }> =>
    api.post(`/api/front-desk/leads/${id}/assign`, { counsellorId, leadType }).then((r) => r.data),

  getCounsellors: (): Promise<{ success: boolean; data: Counsellor[] }> =>
    api.get("/api/front-desk/counsellors").then((r) => r.data),

  createEditLink: (id: number): Promise<CreateEditLinkResponse> =>
    api.post(`/api/front-desk/leads/${id}/edit-link`).then((r) => r.data),

  getEditLinks: (id: number): Promise<{ success: boolean; data: EditLinkRecord[] }> =>
    api.get(`/api/front-desk/leads/${id}/edit-links`).then((r) => r.data),

  revokeEditLink: (leadId: number, tokenId: number): Promise<{ success: boolean; message: string }> =>
    api.delete(`/api/front-desk/leads/${leadId}/edit-link/${tokenId}`).then((r) => r.data),

  exportLeads: (params: {
    search?: string;
    startDate?: string;
    endDate?: string;
    isVerified?: boolean;
    leadType?: string;
  }): Promise<Blob> => {
    const q = new URLSearchParams();
    if (params.search) q.set("search", params.search);
    if (params.startDate) q.set("startDate", params.startDate);
    if (params.endDate) q.set("endDate", params.endDate);
    if (params.isVerified !== undefined) q.set("isVerified", String(params.isVerified));
    if (params.leadType) q.set("leadType", params.leadType);
    return api
      .get(`/api/front-desk/leads/export?${q}`, { responseType: "blob" })
      .then((r) => r.data);
  },
};
