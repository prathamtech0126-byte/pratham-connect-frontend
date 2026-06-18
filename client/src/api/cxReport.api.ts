import api from "@/lib/api";

export interface CxReportFilters {
  filter?: "today" | "weekly" | "monthly" | "custom";
  fromDate?: string;
  toDate?: string;
}

interface Trend {
  direction: "up" | "down";
  delta: number;
  label: string;
}

export interface CxReportCompletionTrendItem {
  date: string;
  dayLabel: string;
  completed: number;
  overdue: number;
}

export interface CxReportRiskLevel {
  level: "safe" | "warning" | "breach";
  label: string;
  count: number;
  color: string;
}

export interface CxReportOutcomeItem {
  key: string;
  label: string;
  count: number;
  color: string;
}

export interface CxReportData {
  meta: {
    title: string;
    team: string;
    teamLabel: string;
    scope: string;
    period: { filter: string; fromDate: string; toDate: string };
  };
  performanceSummary: {
    tasksCompleted: { value: number; trend: Trend };
    docsReviewed: { value: number; pending: number; subtitle: string };
    tatWarnings: { value: number; breaches: number; subtitle: string; alert: boolean };
    completionRate: { value: number; display: string; trend: Trend };
  };
  completionTrend: CxReportCompletionTrendItem[];
  tatHealth: {
    totalClients: number;
    byRiskLevel: CxReportRiskLevel[];
    summary: { escalated: number; onTrack: number };
  };
  stageProgress: { key: string; label: string; count: number }[];
  documentStats: {
    outcomeBreakdown: CxReportOutcomeItem[];
    reviewRate: {
      approvalRate: number;
      approvalRateDisplay: string;
      subtitle: string;
      avgTurnaround: string;
    };
    rejectionReasons: { key: string; label: string; count: number }[];
  };
}

export async function fetchCxReport(filters: CxReportFilters = {}): Promise<CxReportData> {
  const q = new URLSearchParams();
  q.set("filter", filters.filter ?? "weekly");
  if (filters.fromDate) q.set("fromDate", filters.fromDate);
  if (filters.toDate) q.set("toDate", filters.toDate);

  const { data } = await api.get<{ success: boolean; data: CxReportData }>(
    `/api/modules/reports/cx-report?${q}`
  );
  return data.data;
}
