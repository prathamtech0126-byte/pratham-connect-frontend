import { useCallback, useEffect, useMemo, useState } from "react";
import { useRoute, useLocation, useSearch } from "wouter";
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
  ArrowLeft, Users, ArrowRightLeft, CheckCircle2, CalendarClock,
  Trash2, Phone, Calendar, PhoneOff, ShieldOff,
} from "lucide-react";

import { useAuth } from "@/context/auth-context";
import {
  fetchAllLeads,
  getTelecallerIndividualReport,
  type LeadEntity,
  type TelecallerIndividualReport,
} from "@/api/leads.api";
import DateRangePicker from "@/components/payments/DateRangePicker";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import api from "@/lib/api";
import { cn } from "@/lib/utils";
import {
  buildLeadListUrlFromReport,
  type LeadReportMetricKey,
} from "@/lib/lead-report-metrics";
import {
  getTelecallerReportAssignmentTag,
  sortLeadsForTelecallerReport,
} from "@/lib/lead-status-tags";
import {
  type LeadDateFilterType,
  leadDateRangeParams,
} from "@/lib/lead-date-range";

const DATE_LABELS: Record<LeadDateFilterType, string> = {
  all: "All", today: "Today", weekly: "Weekly", monthly: "Monthly", custom: "Custom",
};

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];

const progressStatusColors: Record<string, string> = {
  not_contacted: "bg-slate-100 text-slate-600",
  contacted: "bg-blue-100 text-blue-700",
  follow_up: "bg-amber-100 text-amber-700",
  interested: "bg-green-100 text-green-700",
  not_interested: "bg-red-100 text-red-600",
  converted: "bg-emerald-100 text-emerald-700",
  junk: "bg-red-200 text-red-700",
};

type UserLite = { id: number; fullName: string };
type LeadTypeLite = { id: number; leadType: string; displayAlias?: string | null };

export default function IndividualTelecallerAnalysis() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const searchStr = useSearch();
  const [, params] = useRoute("/leads/telecaller/:id");
  const telecallerId = params?.id ? Number(params.id) : null;
  const navContext = useMemo(() => {
    const qs = new URLSearchParams(searchStr.startsWith("?") ? searchStr.slice(1) : searchStr);
    const rawDateFilter = qs.get("dateFilter");
    const dateFilter =
      rawDateFilter &&
      (["all", "today", "weekly", "monthly", "custom"] as const).includes(rawDateFilter as LeadDateFilterType)
        ? (rawDateFilter as LeadDateFilterType)
        : undefined;
    const from = qs.get("from");
    return {
      from,
      dateFilter,
      customDateFrom: qs.get("createdFrom") ?? undefined,
      customDateTo: qs.get("createdTo") ?? undefined,
    };
  }, [searchStr]);

  const [allLeads, setAllLeads] = useState<LeadEntity[]>([]);
  const [report, setReport] = useState<TelecallerIndividualReport | null>(null);
  const [telecallerName, setTelecallerName] = useState("");
  const [counsellors, setCounsellors] = useState<UserLite[]>([]);
  const [leadTypes, setLeadTypes] = useState<LeadTypeLite[]>([]);
  const [loading, setLoading] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [dateFilter, setDateFilter] = useState<LeadDateFilterType>(navContext.dateFilter ?? "monthly");
  const [customDateFrom, setCustomDateFrom] = useState<string | undefined>(navContext.customDateFrom);
  const [customDateTo, setCustomDateTo] = useState<string | undefined>(navContext.customDateTo);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  const sortedLeads = useMemo(
    () => sortLeadsForTelecallerReport(allLeads),
    [allLeads]
  );

  const pagination = useMemo(() => {
    const total = sortedLeads.length;
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    return {
      page: Math.min(page, totalPages),
      limit: pageSize,
      total,
      totalPages,
    };
  }, [sortedLeads.length, page, pageSize]);

  const displayLeads = useMemo(() => {
    const start = (pagination.page - 1) * pageSize;
    return sortedLeads.slice(start, start + pageSize);
  }, [sortedLeads, pagination.page, pageSize]);

  const isRestricted =
    user?.role === "telecaller" &&
    telecallerId !== null &&
    String(telecallerId) !== String(user.id);

  const isAdminView = user?.role !== "telecaller";
  const cameFromTelecallerWise = navContext.from === "telecaller-wise";
  const adminBackPath = useMemo(() => {
    if (!cameFromTelecallerWise) return "/leads/reports";
    const qs = new URLSearchParams();
    if (navContext.dateFilter) qs.set("dateFilter", navContext.dateFilter);
    if (navContext.customDateFrom) qs.set("createdFrom", navContext.customDateFrom);
    if (navContext.customDateTo) qs.set("createdTo", navContext.customDateTo);
    const query = qs.toString();
    return query ? `/leads/telecaller-wise?${query}` : "/leads/telecaller-wise";
  }, [cameFromTelecallerWise, navContext]);
  const adminBackLabel = cameFromTelecallerWise ? "Back to telecaller wise leads" : "Back to reports";
  const adminBreadcrumbLabel = cameFromTelecallerWise ? "Telecaller Wise Leads" : "Reports";

  useEffect(() => {
    if (navContext.dateFilter) setDateFilter(navContext.dateFilter);
    if (navContext.customDateFrom) setCustomDateFrom(navContext.customDateFrom);
    if (navContext.customDateTo) setCustomDateTo(navContext.customDateTo);
  }, [navContext]);

  const rangeParams = useMemo(
    () => leadDateRangeParams(dateFilter, customDateFrom, customDateTo),
    [dateFilter, customDateFrom, customDateTo]
  );

  useEffect(() => {
    setPage(1);
  }, [dateFilter, customDateFrom, customDateTo, telecallerId]);

  const loadData = useCallback(async () => {
    if (!telecallerId || isRestricted) return;
    try {
      setLoading(true);
      const [reportRes, leadItems, tRes, cRes, ltRes] = await Promise.all([
        getTelecallerIndividualReport(telecallerId, rangeParams),
        fetchAllLeads({
          currentTelecallerId: telecallerId,
          ...rangeParams,
          isJunk: false,
          forReport: true,
          assignedScope: true,
        }),
        api.get("/api/users/telecallers"),
        api.get("/api/users/counsellors"),
        api.get("/api/lead-types"),
      ]);
      setReport(reportRes);
      setAllLeads(leadItems);
      const tList: any[] = tRes?.data?.data || tRes?.data || [];
      const me = tList.find((t: any) => t.id === telecallerId);
      setTelecallerName(me?.fullName || `Telecaller #${telecallerId}`);
      setCounsellors(cRes?.data?.data || cRes?.data || []);
      setLeadTypes(ltRes?.data?.data || ltRes?.data || []);
    } finally {
      setLoading(false);
    }
  }, [telecallerId, isRestricted, rangeParams]);

  useEffect(() => { void loadData(); }, [loadData]);

  const stats = report?.stats ?? {
    assigned: 0,
    contacted: 0,
    notContacted: 0,
    transferred: 0,
    converted: 0,
    pendingFollowUp: 0,
    junk: 0,
  };

  const categoryBreakdown = report?.categoryBreakdown ?? [];

  const sourceBreakdown = useMemo(() => {
    return (report?.sourceBreakdown ?? []).map((row) => ({
      ...row,
      source:
        leadTypes.find((lt) => lt.leadType === row.source)?.displayAlias?.trim() ||
        row.source.replace(/_/g, " "),
    }));
  }, [report?.sourceBreakdown, leadTypes]);

  const counsellorBreakdown = useMemo(() => {
    return (report?.counsellorBreakdown ?? []).map((row) => {
      const c = counsellors.find((x) => x.id === row.counsellorId);
      return {
        ...row,
        name: c?.fullName || `Counsellor #${row.counsellorId}`,
      };
    });
  }, [report?.counsellorBreakdown, counsellors]);

  const openLeadList = useCallback(
    (metric: LeadReportMetricKey) => {
      if (!telecallerId) return;
      setLocation(
        buildLeadListUrlFromReport({
          metric,
          dateFilter,
          customDateFrom,
          customDateTo,
          telecallerId,
        })
      );
    },
    [setLocation, telecallerId, dateFilter, customDateFrom, customDateTo]
  );

  const periodTotal = stats.assigned;

  const customLabel = dateFilter === "custom" && customDateFrom && customDateTo
    ? `${format(new Date(customDateFrom), "d MMM")} – ${format(new Date(customDateTo), "d MMM yyyy")}`
    : null;

  const resolveAlias = (slug: string | null | undefined) => {
    if (!slug) return "—";
    return leadTypes.find(lt => lt.leadType === slug)?.displayAlias?.trim() || slug.replace(/_/g, " ");
  };

  // ── Access denied ──────────────────────────────────
  if (isRestricted) {
    return (
      <PageWrapper title="Access Restricted" breadcrumbs={[{ label: "Leads", href: "/leads" }, { label: "Analysis" }]}>
        <div className="flex flex-col items-center justify-center min-h-[450px] gap-6">
          <div className="flex flex-col items-center gap-4 text-center max-w-sm">
            <div className="h-16 w-16 rounded-full bg-red-50 flex items-center justify-center">
              <ShieldOff className="h-8 w-8 text-red-400" />
            </div>
            <div className="space-y-1">
              <h2 className="text-lg font-semibold">This page is not accessible</h2>
              <p className="text-sm text-muted-foreground">You can only view your own performance analysis.</p>
            </div>
            <Button onClick={() => setLocation(`/leads/telecaller/${user!.id}`)} className="mt-2">
              Go to My Analysis
            </Button>
          </div>
        </div>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper
      title={
        <span className="text-2xl font-bold">
          {isAdminView
            ? `${telecallerName || "Telecaller"} — Lead Report`
            : telecallerName || "My Lead Report"}
        </span>
      }
      breadcrumbs={
        isAdminView
          ? [
              { label: "Leads", href: "/leads" },
              { label: adminBreadcrumbLabel, href: adminBackPath },
              { label: telecallerName || "Analysis" },
            ]
          : [
              { label: "Leads", href: "/leads" },
              { label: telecallerName || "My Report" },
            ]
      }
    >
      <div className="space-y-6">
        {isAdminView && (
          <Button
            variant="ghost"
            size="sm"
            className="-ml-2 h-8 px-2 text-muted-foreground hover:text-foreground"
            onClick={() => setLocation(adminBackPath)}
          >
            <ArrowLeft className="h-4 w-4 mr-1.5" />
            {adminBackLabel}
          </Button>
        )}

        <div className="rounded-xl border bg-card shadow-sm p-4 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex flex-col gap-1">
              <p className="text-sm font-semibold text-foreground">
                {telecallerName || "Telecaller"}
              </p>
              <Badge variant="secondary" className="w-fit text-[10px] font-medium capitalize">
                Telecaller
              </Badge>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-medium text-muted-foreground">Period:</span>
              <div className="flex rounded-lg border border-border bg-muted/30 p-0.5 gap-0.5">
                {(["all", "today", "weekly", "monthly"] as const).map(f => (
                  <button
                    key={f}
                    onClick={() => { setDateFilter(f); setCustomDateFrom(undefined); setCustomDateTo(undefined); }}
                    className={cn(
                      "px-3 py-1 text-xs font-medium rounded-md transition-colors",
                      dateFilter === f ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground hover:bg-background"
                    )}
                  >{DATE_LABELS[f]}</button>
                ))}
                <button
                  onClick={() => setShowDatePicker(true)}
                  className={cn(
                    "px-3 py-1 text-xs font-medium rounded-md flex items-center gap-1",
                    dateFilter === "custom" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground hover:bg-background"
                  )}
                >
                  {customLabel ?? "Custom"}<Calendar className="w-3 h-3" />
                </button>
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <span className="text-xs text-muted-foreground">
              {periodTotal} lead{periodTotal !== 1 ? "s" : ""} in selected period
            </span>
          </div>
        </div>

        {/* ── Stats Cards ───────────────────────────────── */}
        <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-4 xl:grid-cols-7">
          {[
            { label: "Assigned", value: stats.assigned, icon: Users, color: "text-blue-600", bg: "bg-blue-50", metric: "assigned" as LeadReportMetricKey },
            { label: "Not Contacted", value: stats.notContacted, icon: PhoneOff, color: "text-slate-500", bg: "bg-slate-100", metric: "not_contacted" as LeadReportMetricKey },
            { label: "Junk", value: stats.junk, icon: Trash2, color: "text-red-500", bg: "bg-red-50", metric: "junk" as LeadReportMetricKey },
            { label: "Contacted", value: stats.contacted, icon: Phone, color: "text-sky-600", bg: "bg-sky-50", metric: "contacted" as LeadReportMetricKey },
            { label: "Transferred", value: stats.transferred, icon: ArrowRightLeft, color: "text-amber-600", bg: "bg-amber-50", metric: "transferred" as LeadReportMetricKey },
            { label: "Converted", value: stats.converted, icon: CheckCircle2, color: "text-emerald-600", bg: "bg-emerald-50", metric: "converted" as LeadReportMetricKey },
            { label: "Pending F/U", value: stats.pendingFollowUp, icon: CalendarClock, color: "text-violet-600", bg: "bg-violet-50", metric: "pending_follow_up" as LeadReportMetricKey },
            
          ].map(stat => (
            <Card
              key={stat.label}
              className="shadow-sm cursor-pointer hover:bg-muted/30 transition-colors"
              onClick={() => openLeadList(stat.metric)}
            >
              <CardContent className="p-4 flex flex-col items-center text-center">
                <div className={cn("p-1.5 rounded-lg mb-2", stat.bg)}>
                  <stat.icon className={cn("w-3.5 h-3.5", stat.color)} />
                </div>
                <p className={cn("text-2xl font-bold tabular-nums hover:underline underline-offset-4", stat.color)}>{stat.value}</p>
                <p className="text-xs font-medium text-muted-foreground mt-1">{stat.label}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* ── Lead Type + Source Breakdown ───────────── */}
        <div className="grid gap-6 lg:grid-cols-2">

          {/* Lead Type Breakdown */}
          <Card className="shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold">Lead Type Breakdown</CardTitle>
              <CardDescription className="text-xs">Assigned · Transferred · Converted per type</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div className="max-h-[330px] overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50 hover:bg-muted/50 sticky top-0 z-10">
                      <TableHead className="text-xs uppercase pl-4">Lead Type</TableHead>
                      <TableHead className="text-xs uppercase text-center">Assigned</TableHead>
                      <TableHead className="text-xs uppercase text-center">Transferred</TableHead>
                      <TableHead className="text-xs uppercase text-center">Converted</TableHead>
                      <TableHead className="text-xs uppercase text-center pr-4">Junk</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      <TableRow><TableCell colSpan={5} className="h-20 text-center text-sm text-muted-foreground">Loading…</TableCell></TableRow>
                    ) : categoryBreakdown.length === 0 ? (
                      <TableRow><TableCell colSpan={5} className="h-20 text-center text-sm text-muted-foreground">No leads in this period.</TableCell></TableRow>
                    ) : categoryBreakdown.map(row => (
                      <TableRow key={row.type} className="hover:bg-muted/20">
                        <TableCell className="pl-4 font-medium text-sm capitalize">{row.type}</TableCell>
                        <TableCell className="text-center tabular-nums font-medium">{row.assigned}</TableCell>
                        <TableCell className="text-center">
                          <span className="font-bold text-blue-600 tabular-nums">{row.transferred}</span>
                          <span className="text-[10px] text-muted-foreground ml-1">
                            {row.assigned > 0 ? `(${((row.transferred / row.assigned) * 100).toFixed(0)}%)` : ""}
                          </span>
                        </TableCell>
                        <TableCell className="text-center">
                          <span className="font-bold text-emerald-600 tabular-nums">{row.converted}</span>
                        </TableCell>
                        <TableCell className="text-center pr-4">
                          <span className={cn("tabular-nums", row.junk > 0 ? "text-red-500 font-medium" : "text-muted-foreground")}>
                            {row.junk}
                          </span>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          {/* Lead Source Breakdown */}
          <Card className="shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold">Lead Source Breakdown</CardTitle>
              <CardDescription className="text-xs">Assigned · Transferred · Converted per source</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div className="max-h-[330px] overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50 hover:bg-muted/50 sticky top-0 z-10">
                      <TableHead className="text-xs uppercase pl-4">Source</TableHead>
                      <TableHead className="text-xs uppercase text-center">Assigned</TableHead>
                      <TableHead className="text-xs uppercase text-center">Transferred</TableHead>
                      <TableHead className="text-xs uppercase text-center pr-4">Converted</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      <TableRow><TableCell colSpan={4} className="h-20 text-center text-sm text-muted-foreground">Loading…</TableCell></TableRow>
                    ) : sourceBreakdown.length === 0 ? (
                      <TableRow><TableCell colSpan={4} className="h-20 text-center text-sm text-muted-foreground">No data.</TableCell></TableRow>
                    ) : sourceBreakdown.map(row => {
                      const pct = row.assigned > 0 ? ((row.transferred / row.assigned) * 100).toFixed(0) : "0";
                      return (
                        <TableRow key={row.source} className="hover:bg-muted/20">
                          <TableCell className="pl-4 font-medium text-sm">{row.source}</TableCell>
                          <TableCell className="text-center tabular-nums">{row.assigned}</TableCell>
                          <TableCell className="text-center">
                            <span className="font-bold text-blue-600 tabular-nums">{row.transferred}</span>
                            <span className="text-[10px] text-muted-foreground ml-1">({pct}%)</span>
                          </TableCell>
                          <TableCell className="text-center pr-4">
                            <span className="font-bold text-emerald-600 tabular-nums">{row.converted}</span>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* ── Counsellor-wise Transfer Table ────────────── */}
        <Card className="shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold">Counsellor-wise Lead Distribution</CardTitle>
            <CardDescription className="text-xs">Leads sent to each counsellor — received · converted · dropped</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50 hover:bg-muted/50">
                  <TableHead className="text-xs uppercase pl-4">Counsellor</TableHead>
                  <TableHead className="text-xs uppercase text-center">Received</TableHead>
                  <TableHead className="text-xs uppercase text-center">Converted</TableHead>
                  <TableHead className="text-xs uppercase text-center">Dropped</TableHead>
                  <TableHead className="text-xs uppercase text-center pr-4">Conversion %</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow><TableCell colSpan={5} className="h-20 text-center text-sm text-muted-foreground">Loading…</TableCell></TableRow>
                ) : counsellorBreakdown.length === 0 ? (
                  <TableRow><TableCell colSpan={5} className="h-20 text-center text-sm text-muted-foreground">No transferred leads in this period.</TableCell></TableRow>
                ) : counsellorBreakdown.map(row => {
                  const convPct = row.received > 0 ? ((row.converted / row.received) * 100).toFixed(0) : "0";
                  return (
                    <TableRow key={row.counsellorId} className="hover:bg-muted/20">
                      <TableCell className="pl-4">
                        <div className="flex items-center gap-2">
                          <div className="h-7 w-7 rounded-full bg-emerald-100 flex items-center justify-center text-xs font-bold text-emerald-700 shrink-0">
                            {row.name.charAt(0).toUpperCase()}
                          </div>
                          <span className="text-sm font-medium">{row.name}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-center tabular-nums font-medium">{row.received}</TableCell>
                      <TableCell className="text-center">
                        <span className="font-bold text-emerald-600 tabular-nums">{row.converted}</span>
                      </TableCell>
                      <TableCell className="text-center">
                        <span className={cn("tabular-nums", row.dropped > 0 ? "text-red-500 font-medium" : "text-muted-foreground")}>
                          {row.dropped}
                        </span>
                      </TableCell>
                      <TableCell className="text-center pr-4">
                        <span className={cn("text-xs font-semibold tabular-nums px-1.5 py-0.5 rounded-full",
                          Number(convPct) >= 50 ? "bg-emerald-100 text-emerald-700" :
                          Number(convPct) >= 25 ? "bg-amber-100 text-amber-700" :
                          "bg-slate-100 text-slate-600"
                        )}>
                          {convPct}%
                        </span>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* ── Leads Table ───────────────────────────────── */}
        <Card className="shadow-sm">
          <CardHeader>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CardTitle className="text-sm font-semibold">All Leads</CardTitle>
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
              <div className="flex items-center gap-2">
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
                    <TableHead className="text-xs uppercase">Progress</TableHead>
                    <TableHead className="text-xs uppercase">Assignment</TableHead>
                    <TableHead className="text-xs uppercase">Created</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow><TableCell colSpan={7} className="h-24 text-center text-sm text-muted-foreground">Loading…</TableCell></TableRow>
                  ) : displayLeads.length === 0 ? (
                    <TableRow><TableCell colSpan={7} className="h-24 text-center text-sm text-muted-foreground">No leads in this period.</TableCell></TableRow>
                  ) : (
                    displayLeads.map(lead => {
                      const assignmentTag = getTelecallerReportAssignmentTag(lead);
                      return (
                      <TableRow
                        key={lead.id}
                        className="cursor-pointer hover:bg-muted/30 transition-colors"
                        onClick={() => setLocation(`/leads/${lead.id}`)}
                      >
                        <TableCell className="pl-4">
                          <div className="flex items-center gap-2">
                            <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary shrink-0">
                              {lead.fullName?.charAt(0)?.toUpperCase() || "L"}
                            </div>
                            <span className="text-sm font-semibold">{lead.fullName}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">{lead.phone}</TableCell>
                        <TableCell className="text-sm">{lead.leadType || "—"}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{resolveAlias(lead.leadSource)}</TableCell>
                        <TableCell>
                          <span className={cn(
                            "text-[10px] font-medium px-2 py-0.5 rounded-full capitalize",
                            progressStatusColors[lead.progressStatus] || "bg-gray-100 text-gray-600"
                          )}>
                            {lead.progressStatus.replace(/_/g, " ")}
                          </span>
                        </TableCell>
                        <TableCell>
                          {assignmentTag ? (
                            <span
                              className={cn(
                                "inline-flex text-[10px] font-medium px-2 py-0.5 rounded-full capitalize",
                                assignmentTag.className
                              )}
                            >
                              {assignmentTag.label}
                            </span>
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {format(new Date(lead.createdAt), "dd MMM yyyy")}
                        </TableCell>
                      </TableRow>
                    );
                    })
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
              if (s && e) { setCustomDateFrom(s); setCustomDateTo(e); setDateFilter("custom"); }
              setShowDatePicker(false);
            }}
            onCancel={() => setShowDatePicker(false)}
          />
        </DialogContent>
      </Dialog>
    </PageWrapper>
  );
}
