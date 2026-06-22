import api from "@/lib/api";

export interface BindingReportFilters {
  filter?: "today" | "weekly" | "monthly" | "custom";
  fromDate?: string;
  toDate?: string;
}

interface FileBoundTrend {
  direction: "up" | "down" | "flat";
  deltaPercent: number | null;
  label: string;
}

export interface BindingReportData {
  meta: {
    title: string;
    team: string;
    teamLabel: string;
    scope: string;
    viewerRole: string;
    generatedAt: string;
    period: { filter: string; fromDate: string; toDate: string; description: string };
    previousPeriod: { fromDate: string; toDate: string };
    tatThresholds: { safeDays: number; warningDays: number; breachDays: number };
  };
  performanceSummary: {
    filesBound: { value: number; trend: FileBoundTrend; subtitle?: string };
    filesReceivedFromCx: { value: number; subtitle: string };
    avgDaysInBinding: { value: number | null; subtitle: string };
    docCompletenessAtHandoff: { value: number; display: string };
    tatBreachRate: { value: number | null; display: string | null; subtitle: string };
  };
  filesBoundVsBlocked: { date: string; dayLabel: string; bound: number; blocked: number }[];
  visaApplicationStatus: { key: string; label: string; count: number; color: string }[];
  tatHealthTrend: { date: string; dayLabel: string; onTrack: number; warning: number; breach: number }[];
}

export async function fetchBindingReport(filters: BindingReportFilters = {}): Promise<BindingReportData> {
  const q = new URLSearchParams();
  q.set("filter", filters.filter ?? "weekly");
  if (filters.fromDate) q.set("fromDate", filters.fromDate);
  if (filters.toDate) q.set("toDate", filters.toDate);

  const { data } = await api.get<{ success: boolean; data: BindingReportData }>(
    `/api/modules/reports/binding-report?${q}`
  );
  return data.data;
}
