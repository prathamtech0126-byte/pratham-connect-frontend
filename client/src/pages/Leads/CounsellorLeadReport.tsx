import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation, useRoute } from "wouter";
import { format } from "date-fns";

import { PageWrapper } from "@/layout/PageWrapper";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Users, CheckCircle2, CalendarClock, Calendar,
  ArrowRightLeft, Trash2, UserCheck, Headphones, ArrowLeft, PhoneOff,
} from "lucide-react";

import { useAuth } from "@/context/auth-context";
import {
  getLeads,
  getCounsellorIndividualReport,
  type LeadEntity,
  type CounsellorIndividualReport,
  type CounsellorReportSegment,
  type CounsellorReportStats,
  type CounsellorTelecallerBreakdownRow,
  type LeadListParams,
} from "@/api/leads.api";
import DateRangePicker from "@/components/payments/DateRangePicker";
import api from "@/lib/api";
import { cn } from "@/lib/utils";
import {
  type LeadDateFilterType,
  leadDateRangeParams,
} from "@/lib/lead-date-range";

const DATE_LABELS: Record<LeadDateFilterType, string> = {
  all: "All", today: "Today", weekly: "Weekly", monthly: "Monthly", custom: "Custom",
};

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];

const EMPTY_STATS: CounsellorReportStats = {
  total: 0,
  inProgress: 0,
  followUp: 0,
  converted: 0,
  dropped: 0,
  notContacted: 0,
  contacted: 0,
};

type LeadTypeLite = { id: number; leadType: string; displayAlias?: string | null };
type UserLite = { id: number; fullName: string };
type LeadListSegment = "all" | "direct" | "via" | "telecaller";
type CounsellorCardMetric =
  | "total_assigned"
  | "in_progress"
  | "not_contacted"
  | "converted"
  | "dropped"
  | "follow_up";

/** Report segment for drill-down: matches backend direct / via telecaller split. */
type CounsellorReportDrillSegment = "all" | "direct" | "via";

const progressStatusColors: Record<string, string> = {
  not_contacted: "bg-slate-100 text-slate-600",
  contacted: "bg-blue-100 text-blue-700",
  follow_up: "bg-amber-100 text-amber-700",
  interested: "bg-green-100 text-green-700",
  converted: "bg-emerald-100 text-emerald-700",
  junk: "bg-red-200 text-red-700",
};

function StatsCards({
  stats,
  segment = "all",
  onCardClick,
}: {
  stats: CounsellorReportStats;
  segment?: CounsellorReportDrillSegment;
  onCardClick?: (metric: CounsellorCardMetric, segment: CounsellorReportDrillSegment) => void;
}) {
  const items = [
    { metric: "total_assigned" as const, label: "Total Assigned", value: stats.total, icon: Users, color: "text-blue-600", bg: "bg-blue-50" },
    { metric: "in_progress" as const, label: "In Process", value: stats.inProgress, icon: ArrowRightLeft, color: "text-indigo-600", bg: "bg-indigo-50" },
    { metric: "not_contacted" as const, label: "Not Contacted", value: stats.notContacted, icon: PhoneOff, color: "text-slate-600", bg: "bg-slate-100" },
    { metric: "converted" as const, label: "Converted", value: stats.converted, icon: CheckCircle2, color: "text-emerald-600", bg: "bg-emerald-50" },
    { metric: "dropped" as const, label: "Drop", value: stats.dropped, icon: Trash2, color: "text-red-500", bg: "bg-red-50" },
    { metric: "follow_up" as const, label: "Follow Up", value: stats.followUp, icon: CalendarClock, color: "text-violet-600", bg: "bg-violet-50" },
  ];
  return (
    <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6">
      {items.map((stat) => (
        <Card
          key={stat.label}
          className={cn("shadow-sm", onCardClick && "cursor-pointer hover:shadow-md transition-shadow")}
          onClick={() => onCardClick?.(stat.metric, segment)}
        >
          <CardContent className="p-4 flex flex-col items-center text-center">
            <div className={cn("p-1.5 rounded-lg mb-2", stat.bg)}>
              <stat.icon className={cn("w-3.5 h-3.5", stat.color)} />
            </div>
            <p className="text-2xl font-bold tabular-nums">{stat.value}</p>
            <p className="text-xs font-medium text-muted-foreground mt-1">{stat.label}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function BreakdownTables({
  segment,
  loading,
  resolveSourceLabel,
}: {
  segment: CounsellorReportSegment;
  loading: boolean;
  resolveSourceLabel: (slug: string) => string;
}) {
  const sourceRows = segment.sourceBreakdown.map((row) => ({
    ...row,
    source: resolveSourceLabel(row.source),
  }));

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card className="shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold">Lead Type Breakdown</CardTitle>
          <CardDescription className="text-xs">Assigned · Converted · Dropped per type</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="max-h-[280px] overflow-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50 hover:bg-muted/50 sticky top-0 z-10">
                  <TableHead className="text-xs uppercase pl-4">Lead Type</TableHead>
                  <TableHead className="text-xs uppercase text-center">Assigned</TableHead>
                  <TableHead className="text-xs uppercase text-center">Converted</TableHead>
                  <TableHead className="text-xs uppercase text-center pr-4">Dropped</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={4} className="h-16 text-center text-sm text-muted-foreground">Loading…</TableCell>
                  </TableRow>
                ) : segment.typeBreakdown.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="h-16 text-center text-sm text-muted-foreground">No data in this period.</TableCell>
                  </TableRow>
                ) : (
                  segment.typeBreakdown.map((row) => (
                    <TableRow key={row.type} className="hover:bg-muted/20">
                      <TableCell className="pl-4 text-sm font-medium">{row.type}</TableCell>
                      <TableCell className="text-center tabular-nums">{row.assigned}</TableCell>
                      <TableCell className="text-center tabular-nums text-emerald-600 font-medium">{row.converted}</TableCell>
                      <TableCell className="text-center tabular-nums pr-4 text-red-500">{row.dropped}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold">Lead Source Breakdown</CardTitle>
          <CardDescription className="text-xs">Assigned · Converted · Dropped per source</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="max-h-[280px] overflow-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50 hover:bg-muted/50 sticky top-0 z-10">
                  <TableHead className="text-xs uppercase pl-4">Source</TableHead>
                  <TableHead className="text-xs uppercase text-center">Assigned</TableHead>
                  <TableHead className="text-xs uppercase text-center">Converted</TableHead>
                  <TableHead className="text-xs uppercase text-center pr-4">Dropped</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={4} className="h-16 text-center text-sm text-muted-foreground">Loading…</TableCell>
                  </TableRow>
                ) : sourceRows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="h-16 text-center text-sm text-muted-foreground">No data in this period.</TableCell>
                  </TableRow>
                ) : (
                  sourceRows.map((row) => (
                    <TableRow key={row.source} className="hover:bg-muted/20">
                      <TableCell className="pl-4 text-sm font-medium">{row.source}</TableCell>
                      <TableCell className="text-center tabular-nums">{row.assigned}</TableCell>
                      <TableCell className="text-center tabular-nums text-emerald-600 font-medium">{row.converted}</TableCell>
                      <TableCell className="text-center tabular-nums pr-4 text-red-500">{row.dropped}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function CounsellorLeadReport() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [routeMatch, routeParams] = useRoute("/leads/counsellor-report/:counsellorId");

  const routeCounsellorId = routeMatch && routeParams?.counsellorId
    ? Number(routeParams.counsellorId)
    : undefined;
  const effectiveCounsellorId =
    routeCounsellorId ?? (user?.id != null ? Number(user.id) : undefined);
  const isAdminView = user?.role !== "counsellor" && routeCounsellorId != null;
  const isOwnCounsellorView = user?.role === "counsellor" && !isAdminView;

  const [leads, setLeads] = useState<LeadEntity[]>([]);
  const [report, setReport] = useState<CounsellorIndividualReport | null>(null);
  const [counsellorName, setCounsellorName] = useState("");
  const [telecallers, setTelecallers] = useState<UserLite[]>([]);
  const [leadTypes, setLeadTypes] = useState<LeadTypeLite[]>([]);
  const [loading, setLoading] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [dateFilter, setDateFilter] = useState<LeadDateFilterType>("monthly");
  const [customDateFrom, setCustomDateFrom] = useState<string | undefined>();
  const [customDateTo, setCustomDateTo] = useState<string | undefined>();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [leadListSegment, setLeadListSegment] = useState<LeadListSegment>("all");
  const [filterTelecallerId, setFilterTelecallerId] = useState<number | undefined>();
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 25,
    total: 0,
    totalPages: 1,
  });

  const rangeParams = useMemo(
    () => leadDateRangeParams(dateFilter, customDateFrom, customDateTo),
    [dateFilter, customDateFrom, customDateTo]
  );

  const reportParams = useMemo(() => {
    const p: { dateFilter?: string; afterDate?: string; beforeDate?: string; counsellorId?: number } = { ...rangeParams };
    if (isAdminView && effectiveCounsellorId) {
      p.counsellorId = effectiveCounsellorId;
    }
    return p;
  }, [rangeParams, isAdminView, effectiveCounsellorId]);

  useEffect(() => {
    setPage(1);
  }, [dateFilter, customDateFrom, customDateTo, effectiveCounsellorId, leadListSegment, filterTelecallerId]);

  const telecallerNameMap = useMemo(() => {
    const m = new Map<number, string>();
    telecallers.forEach((t) => m.set(t.id, t.fullName));
    return m;
  }, [telecallers]);

  const loadData = useCallback(async () => {
    if (!effectiveCounsellorId) return;
    try {
      setLoading(true);

      const leadParams: LeadListParams = {
        ...rangeParams,
        dateFilter: rangeParams.dateFilter as LeadListParams["dateFilter"],
        page,
        limit: pageSize,
        sortBy: "created_at",
        sortOrder: "desc",
        isJunk: false,
        forReport: true,
      };

      if (isAdminView) {
        leadParams.currentCounsellorId = effectiveCounsellorId;
      }
      if (leadListSegment === "direct") {
        leadParams.withoutTelecaller = true;
      } else if (leadListSegment === "via") {
        leadParams.withTelecaller = true;
      }
      if (filterTelecallerId) {
        leadParams.currentTelecallerId = filterTelecallerId;
      }

      const [reportRes, leadRes, cRes, tRes, ltRes, meRes] = await Promise.all([
        getCounsellorIndividualReport(reportParams),
        getLeads(leadParams),
        api.get("/api/users/counsellors"),
        api.get("/api/users/telecallers"),
        api.get("/api/lead-types"),
        isOwnCounsellorView ? api.get("/api/users/me") : Promise.resolve(null),
      ]);
      setReport(reportRes);
      setLeads(leadRes.items || []);
      setPagination(
        leadRes.pagination ?? {
          page,
          limit: pageSize,
          total: leadRes.items?.length ?? 0,
          totalPages: 1,
        }
      );
      const cList: UserLite[] = cRes?.data?.data || cRes?.data || [];
      const me = cList.find((c) => Number(c.id) === Number(effectiveCounsellorId));
      const meData = meRes?.data?.data ?? meRes?.data ?? {};
      const profileName = String(
        meData.fullname ?? meData.fullName ?? meData.name ?? ""
      ).trim();
      const resolvedName = me?.fullName || profileName || user?.name || "";
      setCounsellorName(
        resolvedName || (isAdminView ? `Counsellor #${effectiveCounsellorId}` : "")
      );
      setTelecallers(tRes?.data?.data || tRes?.data || []);
      setLeadTypes(ltRes?.data?.data || ltRes?.data || []);
    } finally {
      setLoading(false);
    }
  }, [
    effectiveCounsellorId,
    rangeParams,
    reportParams,
    page,
    pageSize,
    user?.name,
    isAdminView,
    isOwnCounsellorView,
    leadListSegment,
    filterTelecallerId,
  ]);

  useEffect(() => {
    if (isOwnCounsellorView && user?.name) {
      setCounsellorName(user.name);
    }
  }, [isOwnCounsellorView, user?.name]);

  useEffect(() => { void loadData(); }, [loadData]);

  const stats = report?.stats ?? EMPTY_STATS;
  const direct = report?.direct ?? { stats: EMPTY_STATS, typeBreakdown: [], sourceBreakdown: [] };
  const viaTelecaller = report?.viaTelecaller ?? { stats: EMPTY_STATS, typeBreakdown: [], sourceBreakdown: [] };
  const telecallerBreakdown = report?.telecallerBreakdown ?? [];

  const resolveSourceLabel = useCallback(
    (slug: string) =>
      leadTypes.find((lt) => lt.leadType === slug)?.displayAlias?.trim() ||
      slug.replace(/_/g, " "),
    [leadTypes]
  );

  const resolveAlias = (slug: string | null | undefined) => {
    if (!slug) return "—";
    return leadTypes.find((lt) => lt.leadType === slug)?.displayAlias?.trim() || slug.replace(/_/g, " ");
  };

  const customLabel =
    dateFilter === "custom" && customDateFrom && customDateTo
      ? `${format(new Date(customDateFrom), "d MMM ''yy")} – ${format(new Date(customDateTo), "d MMM ''yy")}`
      : null;

  const openLeadListForMetric = useCallback(
    (metric: CounsellorCardMetric, segment: CounsellorReportDrillSegment = "all") => {
      const qs = new URLSearchParams();
      qs.set("clearFilters", "1");
      qs.set("counsellorReportDrill", "1");
      qs.set("forReport", "1");
      qs.set("dateFilter", dateFilter);
      if (rangeParams.afterDate) qs.set("afterDate", rangeParams.afterDate);
      if (rangeParams.beforeDate) qs.set("beforeDate", rangeParams.beforeDate);
      if (effectiveCounsellorId != null) qs.set("counsellorId", String(effectiveCounsellorId));

      if (segment === "direct") {
        qs.set("reportSegment", "direct");
        qs.set("withoutTelecaller", "1");
      } else if (segment === "via") {
        qs.set("reportSegment", "via");
        qs.set("withTelecaller", "1");
      }

      const bucketByMetric: Partial<Record<CounsellorCardMetric, string>> = {
        in_progress: "in_progress",
        not_contacted: "not_contacted",
        converted: "converted",
        dropped: "dropped",
        follow_up: "follow_up",
      };
      const bucket = bucketByMetric[metric];
      if (bucket) qs.set("counsellorListFilter", bucket);

      setLocation(`/leads?${qs.toString()}`);
    },
    [dateFilter, rangeParams.afterDate, rangeParams.beforeDate, effectiveCounsellorId, setLocation]
  );

  const applyTelecallerFilter = (row: CounsellorTelecallerBreakdownRow) => {
    setLeadListSegment("telecaller");
    setFilterTelecallerId(row.telecallerId);
  };

  const clearTelecallerFilter = () => {
    setFilterTelecallerId(undefined);
    setLeadListSegment("all");
  };

  const breadcrumbs = isAdminView
    ? [{ label: "Leads", href: "/leads" }, { label: "Reports", href: "/leads/reports" }, { label: counsellorName || "Counsellor Report" }]
    : [{ label: "Leads", href: "/leads/counsellor" }, { label: "Your Lead Report" }];

  const headerPersonName =
    counsellorName || (isOwnCounsellorView ? user?.name : "") || "Counsellor";

  return (
    <PageWrapper
      title={
        <span className="text-2xl font-bold">
          {isAdminView ? `${counsellorName || "Counsellor"} — Lead Report` : "Your Lead Report"}
        </span>
      }
      breadcrumbs={breadcrumbs}
    >
      <div className="space-y-6">
        {isAdminView && (
          <Button
            variant="ghost"
            size="sm"
            className="-ml-2 h-8 px-2 text-muted-foreground hover:text-foreground"
            onClick={() => setLocation("/leads/reports")}
          >
            <ArrowLeft className="h-4 w-4 mr-1.5" />
            Back to reports
          </Button>
        )}

        <div className="rounded-xl border bg-card shadow-sm p-4 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex flex-col gap-1">
              <p className="text-sm font-semibold text-foreground">{headerPersonName}</p>
              <Badge variant="secondary" className="w-fit text-[10px] font-medium capitalize">
                Counsellor
              </Badge>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-medium text-muted-foreground">Period:</span>
              <div className="flex rounded-lg border border-border bg-muted/30 p-0.5 gap-0.5">
                {(["all", "today", "weekly", "monthly"] as const).map((f) => (
                  <button
                    key={f}
                    onClick={() => {
                      setDateFilter(f);
                      setCustomDateFrom(undefined);
                      setCustomDateTo(undefined);
                    }}
                    className={cn(
                      "px-3 py-1 text-xs font-medium rounded-md transition-colors",
                      dateFilter === f
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:text-foreground hover:bg-background"
                    )}
                  >
                    {DATE_LABELS[f]}
                  </button>
                ))}
                <button
                  onClick={() => setShowDatePicker(true)}
                  className={cn(
                    "px-3 py-1 text-xs font-medium rounded-md flex items-center gap-1",
                    dateFilter === "custom"
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground hover:bg-background"
                  )}
                >
                  {customLabel ?? "Custom"}
                  <Calendar className="w-3 h-3" />
                </button>
              </div>
            </div>
          </div>
          <div className="flex justify-end">
            <span className="text-xs text-muted-foreground">
              {stats.total} lead{stats.total !== 1 ? "s" : ""} in selected period
            </span>
          </div>
        </div>

        <div>
          <h3 className="text-sm font-semibold mb-3">Overall summary</h3>
          <StatsCards stats={stats} onCardClick={openLeadListForMetric} />
        </div>

        <BreakdownTables
          segment={{
            stats,
            typeBreakdown: report?.typeBreakdown ?? [],
            sourceBreakdown: report?.sourceBreakdown ?? [],
          }}
          loading={loading}
          resolveSourceLabel={resolveSourceLabel}
        />

        {/* Direct assignment segment */}
        <div className="rounded-xl border border-emerald-200/60 bg-emerald-50/30 p-4 space-y-4">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-emerald-100">
              <UserCheck className="w-4 h-4 text-emerald-700" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-emerald-900">Directly assigned lead outcome</h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Leads assigned to this counsellor with no current telecaller (admin / front-desk direct assign).
              </p>
            </div>
          </div>
          <StatsCards stats={direct.stats} segment="direct" onCardClick={openLeadListForMetric} />
          <BreakdownTables segment={direct} loading={loading} resolveSourceLabel={resolveSourceLabel} />
        </div>

        {/* Via telecaller segment */}
        <div className="rounded-xl border border-indigo-200/60 bg-indigo-50/30 p-4 space-y-4">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-indigo-100">
              <Headphones className="w-4 h-4 text-indigo-700" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-indigo-900">Telecaller-wise lead outcome</h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Leads transferred from telecallers to this counsellor — broken down by telecaller.
              </p>
            </div>
          </div>
          <StatsCards stats={viaTelecaller.stats} segment="via" onCardClick={openLeadListForMetric} />
          <BreakdownTables segment={viaTelecaller} loading={loading} resolveSourceLabel={resolveSourceLabel} />

          <Card className="shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold">Assignment by telecaller</CardTitle>
              <CardDescription className="text-xs">
                Click a row to filter the lead list below · Open telecaller report from name link
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-auto max-h-[360px]">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50 hover:bg-muted/50 sticky top-0 z-10">
                      <TableHead className="text-xs uppercase pl-4">Telecaller</TableHead>
                      <TableHead className="text-xs uppercase text-center">Assigned</TableHead>
                      <TableHead className="text-xs uppercase text-center">In Progress</TableHead>
                      <TableHead className="text-xs uppercase text-center">Not Connected</TableHead>
                      <TableHead className="text-xs uppercase text-center">Follow Up</TableHead>
                      <TableHead className="text-xs uppercase text-center">Converted</TableHead>
                      <TableHead className="text-xs uppercase text-center pr-4">Dropped</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      <TableRow>
                        <TableCell colSpan={7} className="h-20 text-center text-sm text-muted-foreground">Loading…</TableCell>
                      </TableRow>
                    ) : telecallerBreakdown.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="h-20 text-center text-sm text-muted-foreground">
                          No telecaller-transferred leads in this period.
                        </TableCell>
                      </TableRow>
                    ) : (
                      telecallerBreakdown.map((row) => {
                        const name = telecallerNameMap.get(row.telecallerId) ?? `Telecaller #${row.telecallerId}`;
                        const isActive = filterTelecallerId === row.telecallerId;
                        return (
                          <TableRow
                            key={row.telecallerId}
                            className={cn(
                              "cursor-pointer hover:bg-muted/30 transition-colors",
                              isActive && "bg-primary/5"
                            )}
                            onClick={() => applyTelecallerFilter(row)}
                          >
                            <TableCell className="pl-4">
                              <button
                                type="button"
                                className="text-sm font-semibold text-primary hover:underline text-left"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setLocation(`/leads/telecaller/${row.telecallerId}`);
                                }}
                              >
                                {name}
                              </button>
                            </TableCell>
                            <TableCell className="text-center tabular-nums font-medium">{row.assigned}</TableCell>
                            <TableCell className="text-center tabular-nums text-indigo-600">{row.inProgress}</TableCell>
                            <TableCell className="text-center tabular-nums text-slate-600">{row.notContacted}</TableCell>
                            <TableCell className="text-center tabular-nums text-violet-600">{row.followUp}</TableCell>
                            <TableCell className="text-center tabular-nums text-emerald-600 font-medium">{row.converted}</TableCell>
                            <TableCell className="text-center tabular-nums pr-4 text-red-500">{row.dropped}</TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="shadow-sm">
          <CardHeader>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CardTitle className="text-sm font-semibold">All Assigned Leads</CardTitle>
                <CardDescription className="text-xs">
                  {!loading && pagination.total > 0 ? (
                    <>
                      Showing {(pagination.page - 1) * pagination.limit + 1}–
                      {Math.min(pagination.page * pagination.limit, pagination.total)} of{" "}
                      <span className="font-medium text-foreground">{pagination.total}</span> in period
                    </>
                  ) : (
                    "Click a row to view lead details"
                  )}
                </CardDescription>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <div className="flex rounded-lg border border-border bg-muted/30 p-0.5 gap-0.5">
                  {([
                    { id: "all" as const, label: "All" },
                    { id: "direct" as const, label: "Direct only" },
                    { id: "via" as const, label: "Via telecaller" },
                  ]).map((tab) => (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => {
                        setLeadListSegment(tab.id);
                        setFilterTelecallerId(undefined);
                      }}
                      className={cn(
                        "px-2.5 py-1 text-xs font-medium rounded-md transition-colors",
                        leadListSegment === tab.id && !filterTelecallerId
                          ? "bg-primary text-primary-foreground"
                          : "text-muted-foreground hover:text-foreground hover:bg-background"
                      )}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
                {filterTelecallerId != null && (
                  <Button variant="outline" size="sm" className="h-7 text-xs" onClick={clearTelecallerFilter}>
                    Clear telecaller filter ({telecallerNameMap.get(filterTelecallerId) ?? filterTelecallerId})
                  </Button>
                )}
                <span className="text-xs text-muted-foreground">Per page</span>
                <Select
                  value={String(pageSize)}
                  onValueChange={(v) => {
                    setPageSize(Number(v));
                    setPage(1);
                  }}
                >
                  <SelectTrigger className="h-8 w-[72px] text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PAGE_SIZE_OPTIONS.map((n) => (
                      <SelectItem key={n} value={String(n)}>
                        {n}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50 hover:bg-muted/50">
                    <TableHead className="text-xs uppercase pl-4">Name</TableHead>
                    <TableHead className="text-xs uppercase">Phone</TableHead>
                    <TableHead className="text-xs uppercase">Lead Type</TableHead>
                    <TableHead className="text-xs uppercase">Source</TableHead>
                    <TableHead className="text-xs uppercase">Telecaller</TableHead>
                    <TableHead className="text-xs uppercase">Progress</TableHead>
                    <TableHead className="text-xs uppercase">Assignment</TableHead>
                    <TableHead className="text-xs uppercase">Created</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={8} className="h-24 text-center text-sm text-muted-foreground">
                        Loading…
                      </TableCell>
                    </TableRow>
                  ) : leads.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="h-24 text-center text-sm text-muted-foreground">
                        No leads in this period.
                      </TableCell>
                    </TableRow>
                  ) : (
                    leads.map((lead) => (
                      <TableRow
                        key={lead.id}
                        className="cursor-pointer hover:bg-muted/30 transition-colors"
                        onClick={() => setLocation(`/leads/${lead.id}`)}
                      >
                        <TableCell className="pl-4">
                          <span className="text-sm font-semibold">{lead.fullName}</span>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">{lead.phone}</TableCell>
                        <TableCell className="text-sm">{lead.leadType || "—"}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {resolveAlias(lead.leadSource)}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {lead.currentTelecallerId
                            ? telecallerNameMap.get(lead.currentTelecallerId) ?? `#${lead.currentTelecallerId}`
                            : "—"}
                        </TableCell>
                        <TableCell>
                          <span
                            className={cn(
                              "text-[10px] font-medium px-2 py-0.5 rounded-full capitalize",
                              progressStatusColors[lead.progressStatus] || "bg-gray-100 text-gray-600"
                            )}
                          >
                            {lead.progressStatus.replace(/_/g, " ")}
                          </span>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary" className="capitalize text-[10px]">
                            {lead.assignmentStatus.replace(/_/g, " ")}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {format(new Date(lead.createdAt), "dd MMM yyyy")}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
              {!loading && pagination.totalPages > 1 && (
                <div className="flex items-center justify-between gap-3 border-t px-4 py-3">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page <= 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                  >
                    Previous
                  </Button>
                  <span className="text-xs text-muted-foreground">
                    Page {pagination.page} of {pagination.totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page >= pagination.totalPages}
                    onClick={() => setPage((p) => p + 1)}
                  >
                    Next
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <Dialog open={showDatePicker} onOpenChange={setShowDatePicker}>
        <DialogContent className="p-0 max-w-[800px] overflow-hidden rounded-xl border-0">
          <DialogTitle className="sr-only">Select Date Range</DialogTitle>
          <DateRangePicker
            onApply={(_, s, e) => {
              if (s && e) {
                setCustomDateFrom(s);
                setCustomDateTo(e);
                setDateFilter("custom");
              }
              setShowDatePicker(false);
            }}
            onCancel={() => setShowDatePicker(false)}
          />
        </DialogContent>
      </Dialog>
    </PageWrapper>
  );
}
