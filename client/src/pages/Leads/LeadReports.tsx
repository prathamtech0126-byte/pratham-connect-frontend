import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation, Redirect } from "wouter";
import {
  format,
  startOfDay, endOfDay,
  startOfWeek, endOfWeek,
  startOfMonth, endOfMonth
} from "date-fns";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";

import { PageWrapper } from "@/layout/PageWrapper";
import { useAuth } from "@/context/auth-context";
import { canAccessCustomReports } from "@/lib/lead-permissions";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import {
  Users, ArrowRightLeft, CheckCircle2, CalendarClock,
  Trash2, Phone, Calendar, ChevronRight, PhoneOff, UserRound
} from "lucide-react";

import { fetchAllLeads, type LeadEntity } from "@/api/leads.api";
import DateRangePicker from "@/components/payments/DateRangePicker";
import api from "@/lib/api";
import { cn } from "@/lib/utils";
import {
  buildLeadListUrlFromReport,
  isLeadAssignedToTelecaller,
  isLeadAssignedToCounsellor,
  type LeadReportMetricKey,
} from "@/lib/lead-report-metrics";
import {
  countConvertedInPeriod,
  countDroppedInPeriod,
  countTransferredInPeriod,
  getReportPeriodBounds,
} from "@/lib/lead-report-period";
import { isLeadDropped } from "@/lib/lead-status-tags";

type DateFilterType = "all" | "today" | "weekly" | "monthly" | "custom";

const DATE_LABELS: Record<DateFilterType, string> = {
  all: "All", today: "Today", weekly: "Weekly", monthly: "Monthly", custom: "Custom",
};

const PROGRESS_OPTIONS = [
  { value: "not_contacted", label: "Not Contacted" },
  { value: "contacted", label: "Contacted" },
  { value: "follow_up", label: "Follow Up" },
  { value: "interested", label: "Interested" },
  { value: "converted", label: "Converted" },
  { value: "junk", label: "Junk" },
];

const ASSIGNMENT_OPTIONS = [
  { value: "not_assigned", label: "Not Assigned" },
  { value: "assigned", label: "Assigned" },
  { value: "transferred", label: "Transferred" },
  { value: "converted", label: "Converted" },
  { value: "dropped", label: "Dropped" },
];

const countAssignmentStatus = (items: LeadEntity[], status: LeadEntity["assignmentStatus"]) =>
  items.filter((l) => l.assignmentStatus === status).length;

type UserLite = { id: number; fullName: string };

function getDateBounds(f: DateFilterType, from?: string, to?: string) {
  const now = new Date();
  if (f === "all") return null;
  if (f === "today") return { from: startOfDay(now), to: endOfDay(now) };
  if (f === "weekly") return { from: startOfWeek(now, { weekStartsOn: 1 }), to: endOfWeek(now, { weekStartsOn: 1 }) };
  if (f === "monthly") return { from: startOfMonth(now), to: endOfMonth(now) };
  if (f === "custom" && from && to) return { from: startOfDay(new Date(from)), to: endOfDay(new Date(to)) };
  return null;
}

export default function LeadReports() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();

  if (!user || !canAccessCustomReports(user.role)) return <Redirect to="/" />;

  // ── Filter state ──────────────────────────────────────
  const [dateFilter, setDateFilter] = useState<DateFilterType>("monthly");
  const [customDateFrom, setCustomDateFrom] = useState<string | undefined>();
  const [customDateTo, setCustomDateTo] = useState<string | undefined>();
  const [showDatePicker, setShowDatePicker] = useState(false);

  // ── Data state ────────────────────────────────────────
  const [allLeads, setAllLeads] = useState<LeadEntity[]>([]);
  const [telecallers, setTelecallers] = useState<UserLite[]>([]);
  const [counsellors, setCounsellors] = useState<UserLite[]>([]);
  const [leadTypes, setLeadTypes] = useState<any[]>([]);
  const [saleTypes, setSaleTypes] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [leadsResult, teleResult, counsResult, leadTypesResult, saleTypesResult] =
        await Promise.allSettled([
          fetchAllLeads({}),
          api.get("/api/users/telecallers"),
          api.get("/api/users/counsellors"),
          api.get("/api/lead-types"),
          api.get("/api/sale-types"),
        ]);

      if (leadsResult.status === "fulfilled") {
        setAllLeads(leadsResult.value);
      } else {
        console.error("[LeadReports] failed to load leads", leadsResult.reason);
      }
      if (teleResult.status === "fulfilled") {
        setTelecallers(teleResult.value?.data?.data || teleResult.value?.data || []);
      } else {
        console.error("[LeadReports] failed to load telecallers", teleResult.reason);
      }
      if (counsResult.status === "fulfilled") {
        setCounsellors(counsResult.value?.data?.data || counsResult.value?.data || []);
      } else {
        console.error("[LeadReports] failed to load counsellors", counsResult.reason);
      }
      if (leadTypesResult.status === "fulfilled") {
        setLeadTypes(leadTypesResult.value?.data?.data || leadTypesResult.value?.data || []);
      }
      if (saleTypesResult.status === "fulfilled") {
        setSaleTypes(saleTypesResult.value?.data?.data || saleTypesResult.value?.data || []);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void loadData(); }, [loadData]);

  const reportBounds = useMemo(
    () => getReportPeriodBounds(dateFilter, customDateFrom, customDateTo),
    [dateFilter, customDateFrom, customDateTo]
  );

  // Leads created in the selected period (assigned, contacted, junk, etc.)
  const periodLeads = useMemo(() => {
    const bounds = getDateBounds(dateFilter, customDateFrom, customDateTo);
    let items = allLeads;
    if (bounds) {
      items = items.filter((l) => {
        const d = new Date(l.createdAt);
        return d >= bounds.from && d <= bounds.to;
      });
    }
    return items;
  }, [allLeads, dateFilter, customDateFrom, customDateTo]);

  // Active (non-junk) leads used by most report buckets
  const filteredLeads = useMemo(
    () => periodLeads.filter((l) => !l.isJunk && l.progressStatus !== "junk"),
    [periodLeads]
  );

  // ── Summary ───────────────────────────────────────────
  const summary = useMemo(() => ({
    // Leads actually assigned to someone (telecaller or counsellor).
    assigned: periodLeads.filter((l) => l.assignmentStatus !== "not_assigned").length,
    // Leads not yet assigned to anyone.
    unassigned: periodLeads.filter((l) => l.assignmentStatus === "not_assigned").length,
    // Contacted bucket includes contacted + transferred/converted/dropped (non-junk).
    contacted: filteredLeads.filter(
      (l) =>
        l.progressStatus === "contacted" ||
        l.progressStatus === "follow_up" ||
        l.assignmentStatus === "transferred" ||
        l.assignmentStatus === "converted" ||
        l.assignmentStatus === "dropped" ||
        isLeadDropped(l)
    ).length,
    notContacted: filteredLeads.filter(l => l.progressStatus === "not_contacted").length,
    transferred: countTransferredInPeriod(allLeads, reportBounds),
    converted: countConvertedInPeriod(allLeads, reportBounds),
    dropped: countDroppedInPeriod(allLeads, reportBounds),
    pendingFollowUp: filteredLeads.filter(l => l.progressStatus === "follow_up").length,
    junk: periodLeads.filter(l => l.isJunk || l.progressStatus === "junk").length,
  }), [filteredLeads, periodLeads, allLeads, reportBounds]);

  const typeBreakdown = useMemo(() => {
    const types = Array.from(new Set(filteredLeads.map(l => l.leadType || "Unknown")));
    return types.map(t => {
      const items = filteredLeads.filter(l => (l.leadType || "Unknown") === t);
      const pool = allLeads.filter(
        (l) => !l.isJunk && l.progressStatus !== "junk" && (l.leadType || "Unknown") === t
      );
      return {
        type: t,
        assigned: items.length,
        transferred: countTransferredInPeriod(pool, reportBounds),
        converted: countConvertedInPeriod(pool, reportBounds),
        dropped: countDroppedInPeriod(pool, reportBounds),
        junk: items.filter(l => l.isJunk || l.progressStatus === "junk").length,
      };
    }).sort((a, b) => b.assigned - a.assigned);
  }, [filteredLeads, allLeads, reportBounds]);

  const sourceBreakdown = useMemo(() => {
    const sources = Array.from(new Set(filteredLeads.map(l => l.leadSource || "Unknown")));
    return sources.map(s => {
      const items = filteredLeads.filter(l => (l.leadSource || "Unknown") === s);
      const pool = allLeads.filter(
        (l) => !l.isJunk && l.progressStatus !== "junk" && (l.leadSource || "Unknown") === s
      );
      const alias = leadTypes.find((lt: any) => lt.leadType === s)?.displayAlias?.trim() || s.replace(/_/g, " ");
      const assigned = items.length;
      const transferred = countTransferredInPeriod(pool, reportBounds);
      const converted = countConvertedInPeriod(pool, reportBounds);
      const dropped = countDroppedInPeriod(pool, reportBounds);
      return { source: alias, assigned, transferred, converted, dropped, barValue: assigned > 0 ? (transferred / assigned) * 100 : 0 };
    }).sort((a, b) => b.assigned - a.assigned);
  }, [filteredLeads, allLeads, leadTypes, reportBounds]);

  // Counsellor-wise stats (who received leads and what happened)
  const counsellorBreakdown = useMemo(() => {
    return counsellors
      .map(c => {
        const cLeads = filteredLeads.filter(l => isLeadAssignedToCounsellor(l, c.id));
        if (cLeads.length === 0) return null;
        return {
          id: c.id,
          name: c.fullName,
          received: cLeads.length,
          converted: countConvertedInPeriod(cLeads, reportBounds),
          dropped: countDroppedInPeriod(cLeads, reportBounds),
          pending: cLeads.filter(l => !["converted", "dropped"].includes(l.assignmentStatus)).length,
        };
      })
      .filter(Boolean)
      .sort((a, b) => b!.received - a!.received) as {
        id: number; name: string; received: number;
        converted: number; dropped: number; pending: number;
      }[];
  }, [filteredLeads, counsellors, reportBounds]);

  // ── Per-telecaller stats ──────────────────────────────
  const telecallerStats = useMemo(() => {
    return telecallers
      .map(t => {
        const tLeads = filteredLeads.filter(l => isLeadAssignedToTelecaller(l, t.id));
        const tJunkLeads = periodLeads.filter(
          (l) =>
            l.currentTelecallerId === t.id &&
            (l.isJunk || l.progressStatus === "junk")
        );
        return {
          id: t.id,
          name: t.fullName,
          assigned: tLeads.length,
          transferred: countTransferredInPeriod(
            allLeads.filter((l) => isLeadAssignedToTelecaller(l, t.id)),
            reportBounds
          ),
          converted: countConvertedInPeriod(
            allLeads.filter((l) => isLeadAssignedToTelecaller(l, t.id)),
            reportBounds
          ),
          dropped: countDroppedInPeriod(
            allLeads.filter((l) => isLeadAssignedToTelecaller(l, t.id)),
            reportBounds
          ),
          totalFollowUp: tLeads.filter(l => !!l.nextFollowupAt).length,
          pendingFollowUp: tLeads.filter(l => l.progressStatus === "follow_up").length,
          junk: tJunkLeads.length,
        };
      })
      .filter(t => t.assigned > 0)
      .sort((a, b) => b.transferred - a.transferred || b.assigned - a.assigned);
  }, [filteredLeads, periodLeads, telecallers, allLeads, reportBounds]);

  const customLabel = dateFilter === "custom" && customDateFrom && customDateTo
    ? `${format(new Date(customDateFrom), "d MMM")} – ${format(new Date(customDateTo), "d MMM yyyy")}`
    : null;

  const openLeadList = useCallback(
    (metric: LeadReportMetricKey, telecallerId?: number) => {
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
    [setLocation, dateFilter, customDateFrom, customDateTo]
  );

  const chartData = telecallerStats.slice(0, 15);

  return (
    <PageWrapper
      title="Lead Report"
      breadcrumbs={[{ label: "Leads", href: "/leads" }, { label: "Lead Report" }]}
    >
      <div className="space-y-6">

        {/* ── Filter Panel ──────────────────────────────── */}
        <div className="rounded-xl border border-border bg-card shadow-sm p-4 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-medium text-muted-foreground">Created:</span>
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
            {!loading && (
              <p className="text-xs text-muted-foreground">
                Showing <span className="font-semibold text-foreground">{summary.assigned}</span> leads
              </p>
            )}
          </div>
        </div>

        {/* ── Summary Cards ─────────────────────────────── */}
        <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-5 2xl:grid-cols-5">
          {([
            { label: "Assigned", value: summary.assigned, icon: Users, color: "text-blue-600", metric: "assigned" as LeadReportMetricKey },
            { label: "Unassigned", value: summary.unassigned, icon: UserRound, color: "text-slate-500", metric: "unassigned" as LeadReportMetricKey },
            { label: "Not Contacted", value: summary.notContacted, icon: PhoneOff, color: "text-slate-400", metric: "not_contacted" as LeadReportMetricKey },
            { label: "Junk", value: summary.junk, icon: Trash2, color: "text-rose-600", metric: "junk" as LeadReportMetricKey },
            { label: "Contacted", value: summary.contacted, icon: Phone, color: "text-sky-600", metric: "contacted" as LeadReportMetricKey },
            { label: "Transferred", value: summary.transferred, icon: ArrowRightLeft, color: "text-amber-600", metric: "transferred" as LeadReportMetricKey },
            { label: "Converted", value: summary.converted, icon: CheckCircle2, color: "text-emerald-600", metric: "converted" as LeadReportMetricKey },
            { label: "Drop", value: summary.dropped, icon: Trash2, color: "text-red-500", metric: "dropped" as LeadReportMetricKey },
            { label: "Pending F/U", value: summary.pendingFollowUp, icon: CalendarClock, color: "text-violet-600", metric: "pending_follow_up" as LeadReportMetricKey },
          ]).map(stat => (
            <Card
              key={stat.label}
              className="shadow-sm border-none bg-card/50 cursor-pointer hover:bg-muted/30 transition-colors"
              onClick={() => openLeadList(stat.metric)}
            >
              <CardContent className="p-5 flex flex-col items-center justify-center relative">
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2 text-center">{stat.label}</p>
                <p className={cn("text-3xl font-extrabold tabular-nums text-center hover:underline underline-offset-4", stat.color)}>{stat.value}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* ── Chart + Ranked List ───────────────────────── */}
        <div className="grid gap-6 lg:grid-cols-5">
          

          {/* Bar Chart */}
          <Card className="lg:col-span-3 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold">Transfers per Telecaller</CardTitle>
              <CardDescription className="text-xs">
                Transferred = outcomes in period (by transferred / converted / dropped time)
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="h-64 flex items-center justify-center text-sm text-muted-foreground">Loading…</div>
              ) : chartData.length === 0 ? (
                <div className="h-64 flex items-center justify-center text-sm text-muted-foreground">No data for selected period</div>
              ) : (
                <ResponsiveContainer width="100%" height={Math.max(chartData.length * 38, 180)}>
                  <BarChart data={chartData} layout="vertical" margin={{ left: 0, right: 28, top: 4, bottom: 4 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f0f0f0" />
                    <XAxis type="number" tick={{ fontSize: 11 }} allowDecimals={false} axisLine={false} tickLine={false} />
                    <YAxis
                      type="category"
                      dataKey="name"
                      width={112}
                      tick={{ fontSize: 11 }}
                      tickFormatter={(v: string) => v.length > 14 ? v.slice(0, 13) + "…" : v}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip
                      cursor={{ fill: "rgba(0,0,0,0.04)" }}
                      content={({ active, payload }) => {
                        if (!active || !payload?.length) return null;
                        const d = payload[0].payload;
                        return (
                          <div className="rounded-lg border bg-background shadow-md p-3 text-xs space-y-1 min-w-[140px]">
                            <p className="font-semibold text-foreground">{d.name}</p>
                            <p className="flex justify-between gap-4">Assigned <span className="font-bold">{d.assigned}</span></p>
                            <p className="flex justify-between gap-4">Transferred <span className="font-bold text-blue-600">{d.transferred}</span></p>
                            <p className="flex justify-between gap-4">Converted <span className="font-bold text-emerald-600">{d.converted}</span></p>
                            <p className="flex justify-between gap-4">Drop <span className="font-bold text-red-500">{d.dropped}</span></p>
                            <p className="flex justify-between gap-4">Junk <span className="font-bold text-red-500">{d.junk}</span></p>
                          </div>
                        );
                      }}
                    />
                    <Bar dataKey="transferred" fill="#2563EB" radius={[0, 4, 4, 0]} maxBarSize={20} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          {/* Ranked List */}
          <Card className="lg:col-span-2 shadow-sm flex flex-col">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold">All Telecallers (by transfer)</CardTitle>
              <div className="flex justify-between text-[10px] text-muted-foreground font-medium uppercase tracking-wide mt-1 px-0.5">
                <span>Telecaller</span>
                <div className="flex gap-5">
                  <span>Assigned</span>
                  <span>Transferred</span>
                  <span>Converted</span>
                  <span>Junk</span>
                </div>
              </div>
            </CardHeader>
            <CardContent className="flex-1 p-0">
              <div className="divide-y max-h-[420px] overflow-y-auto">
                {loading ? (
                  <p className="text-sm text-muted-foreground text-center py-8">Loading…</p>
                ) : telecallerStats.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">No data</p>
                ) : (
                  telecallerStats.map((t, i) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setLocation(`/leads/telecaller/${t.id}`)}
                      className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-muted/40 transition-colors text-left"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="text-xs font-bold text-muted-foreground w-5 text-center shrink-0">{i + 1}</span>
                        <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary shrink-0">
                          {t.name.charAt(0).toUpperCase()}
                        </div>
                        <p className="text-sm font-medium truncate">{t.name}</p>
                      </div>
                      <div className="flex items-center gap-5 text-xs tabular-nums shrink-0 ml-2">
                        <span
                          role="button"
                          tabIndex={0}
                          className="text-foreground font-medium w-12 text-center cursor-pointer hover:underline"
                          onClick={(e) => { e.stopPropagation(); openLeadList("assigned", t.id); }}
                          onKeyDown={(e) => { if (e.key === "Enter") openLeadList("assigned", t.id); }}
                        >
                          {t.assigned}
                        </span>
                        <span className="font-bold text-blue-600 w-14 text-center">{t.transferred}</span>
                        <span className="font-bold text-emerald-600 w-14 text-center">{t.converted}</span>
                        <span className="font-bold text-red-500 w-12 text-center">{t.junk}</span>
                      </div>
                    </button>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* ── Source + Type Breakdown Tables ───────────── */}
        <div className="grid gap-6 lg:grid-cols-2">

          {/* Lead Source breakdown */}
          <Card className="shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold">Lead Source Breakdown</CardTitle>
              <CardDescription className="text-xs">Assigned · Transferred · Converted · Drop per source</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div className="max-h-[340px] overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50 hover:bg-muted/50 sticky top-0 z-10">
                      <TableHead className="text-xs uppercase pl-4">Source</TableHead>
                      <TableHead className="text-xs uppercase text-center">Assigned</TableHead>
                      <TableHead className="text-xs uppercase text-center">Transferred</TableHead>
                      <TableHead className="text-xs uppercase text-center">Converted</TableHead>
                      <TableHead className="text-xs uppercase text-center pr-4">Drop</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      <TableRow><TableCell colSpan={5} className="h-20 text-center text-sm text-muted-foreground">Loading…</TableCell></TableRow>
                    ) : sourceBreakdown.length === 0 ? (
                      <TableRow><TableCell colSpan={5} className="h-20 text-center text-sm text-muted-foreground">No data.</TableCell></TableRow>
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
                          <TableCell className="text-center pr-4">
                            <span className={cn("tabular-nums", row.dropped > 0 ? "text-red-500 font-medium" : "text-muted-foreground")}>
                              {row.dropped}
                            </span>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          {/* Lead Type breakdown */}
          <Card className="shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold">Lead Type Breakdown</CardTitle>
              <CardDescription className="text-xs">Assigned · Transferred · Converted · Drop per type</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div className="max-h-[340px] overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50 hover:bg-muted/50 sticky top-0 z-10">
                      <TableHead className="text-xs uppercase pl-4">Lead Type</TableHead>
                      <TableHead className="text-xs uppercase text-center">Assigned</TableHead>
                      <TableHead className="text-xs uppercase text-center">Transferred</TableHead>
                      <TableHead className="text-xs uppercase text-center">Converted</TableHead>
                      <TableHead className="text-xs uppercase text-center pr-4">Drop</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      <TableRow><TableCell colSpan={5} className="h-20 text-center text-sm text-muted-foreground">Loading…</TableCell></TableRow>
                    ) : typeBreakdown.length === 0 ? (
                      <TableRow><TableCell colSpan={5} className="h-20 text-center text-sm text-muted-foreground">No data.</TableCell></TableRow>
                    ) : typeBreakdown.map(row => {
                      const pct = row.assigned > 0 ? ((row.transferred / row.assigned) * 100).toFixed(0) : "0";
                      return (
                        <TableRow key={row.type} className="hover:bg-muted/20">
                          <TableCell className="pl-4 font-medium text-sm capitalize">{row.type}</TableCell>
                          <TableCell className="text-center tabular-nums">{row.assigned}</TableCell>
                          <TableCell className="text-center">
                            <span className="font-bold text-blue-600 tabular-nums">{row.transferred}</span>
                            <span className="text-[10px] text-muted-foreground ml-1">({pct}%)</span>
                          </TableCell>
                          <TableCell className="text-center">
                            <span className="font-bold text-emerald-600 tabular-nums">{row.converted}</span>
                          </TableCell>
                          <TableCell className="text-center pr-4">
                            <span className={cn("tabular-nums", row.dropped > 0 ? "text-red-500 font-medium" : "text-muted-foreground")}>
                              {row.dropped}
                            </span>
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

        {/* ── Counsellor Received/Converted/Dropped Table ── */}
        <Card className="shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold">Counsellor-wise Lead Outcome</CardTitle>
            <CardDescription className="text-xs">Click a counsellor to open their full lead report</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50 hover:bg-muted/50">
                  <TableHead className="text-xs uppercase pl-4 w-12">Rank</TableHead>
                  <TableHead className="text-xs uppercase">Counsellor</TableHead>
                  <TableHead className="text-xs uppercase text-center">Received</TableHead>
                  <TableHead className="text-xs uppercase text-center">Converted</TableHead>
                  <TableHead className="text-xs uppercase text-center">Dropped</TableHead>
                  <TableHead className="text-xs uppercase text-center">Pending</TableHead>
                  <TableHead className="text-xs uppercase text-center pr-4">Conv. Rate</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow><TableCell colSpan={7} className="h-24 text-center text-sm text-muted-foreground">Loading…</TableCell></TableRow>
                ) : counsellorBreakdown.length === 0 ? (
                  <TableRow><TableCell colSpan={7} className="h-24 text-center text-sm text-muted-foreground">No counsellor data for selected period.</TableCell></TableRow>
                ) : counsellorBreakdown.map((c, i) => {
                  const convRate = c.received > 0 ? ((c.converted / c.received) * 100).toFixed(0) : "0";
                  return (
                    <TableRow
                      key={c.id}
                      className="hover:bg-muted/30 transition-colors cursor-pointer"
                      onClick={() => setLocation(`/leads/counsellor-report/${c.id}`)}
                    >
                      <TableCell className="pl-4">
                        <span className={cn("text-sm font-bold",
                          i === 0 ? "text-yellow-500" : i === 1 ? "text-slate-400" : i === 2 ? "text-amber-600" : "text-muted-foreground"
                        )}>{i + 1}</span>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2.5">
                          <div className="h-8 w-8 rounded-full bg-emerald-100 flex items-center justify-center text-xs font-bold text-emerald-700 shrink-0">
                            {c.name.charAt(0).toUpperCase()}
                          </div>
                          <p className="text-sm font-semibold">{c.name}</p>
                        </div>
                      </TableCell>
                      <TableCell className="text-center tabular-nums font-medium">{c.received}</TableCell>
                      <TableCell className="text-center">
                        <span className="font-bold text-emerald-600 tabular-nums">{c.converted}</span>
                      </TableCell>
                      <TableCell className="text-center">
                        <span className={cn("tabular-nums", c.dropped > 0 ? "text-red-500 font-medium" : "text-muted-foreground")}>
                          {c.dropped}
                        </span>
                      </TableCell>
                      <TableCell className="text-center">
                        <span className="text-amber-600 tabular-nums font-medium">{c.pending}</span>
                      </TableCell>
                      <TableCell className="text-center pr-4">
                        <span className={cn("text-xs font-semibold tabular-nums px-1.5 py-0.5 rounded-full",
                          Number(convRate) >= 50 ? "bg-emerald-100 text-emerald-700" :
                          Number(convRate) >= 25 ? "bg-amber-100 text-amber-700" :
                          "bg-slate-100 text-slate-600"
                        )}>
                          {convRate}%
                        </span>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* ── Performance Table ─────────────────────────── */}
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="text-sm font-semibold">Telecaller Performance</CardTitle>
            <CardDescription className="text-xs">Click any row to view individual telecaller analysis</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50 hover:bg-muted/50">
                    <TableHead className="text-xs uppercase w-12 pl-4">Rank</TableHead>
                    <TableHead className="text-xs uppercase">Telecaller</TableHead>
                    <TableHead className="text-xs uppercase text-center">Assigned</TableHead>
                    <TableHead className="text-xs uppercase text-center">Transferred</TableHead>
                    <TableHead className="text-xs uppercase text-center">Converted</TableHead>
                    <TableHead className="text-xs uppercase text-center">Drop</TableHead>
                    <TableHead className="text-xs uppercase text-center">Follow-ups</TableHead>
                    <TableHead className="text-xs uppercase text-center">Pending F/U</TableHead>
                    <TableHead className="text-xs uppercase text-center">Junk</TableHead>
                    <TableHead className="w-8" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={10} className="h-24 text-center text-sm text-muted-foreground">Loading…</TableCell>
                    </TableRow>
                  ) : telecallerStats.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={10} className="h-24 text-center text-sm text-muted-foreground">No telecaller data for selected period.</TableCell>
                    </TableRow>
                  ) : (
                    telecallerStats.map((t, i) => (
                      <TableRow
                        key={t.id}
                        className="cursor-pointer hover:bg-muted/30 transition-colors"
                        onClick={() => setLocation(`/leads/telecaller/${t.id}`)}
                      >
                        <TableCell className="pl-4">
                          <span className={cn(
                            "text-sm font-bold",
                            i === 0 ? "text-yellow-500" : i === 1 ? "text-slate-400" : i === 2 ? "text-amber-600" : "text-muted-foreground"
                          )}>{i + 1}</span>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2.5">
                            <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary shrink-0">
                              {t.name.charAt(0).toUpperCase()}
                            </div>
                            <p className="text-sm font-semibold">{t.name}</p>
                          </div>
                        </TableCell>
                        <TableCell className="text-center tabular-nums font-medium">
                          <button
                            type="button"
                            className="hover:underline"
                            onClick={(e) => { e.stopPropagation(); openLeadList("assigned", t.id); }}
                          >
                            {t.assigned}
                          </button>
                        </TableCell>
                        <TableCell className="text-center">
                          <span className="font-bold text-blue-600 tabular-nums">{t.transferred}</span>
                        </TableCell>
                        <TableCell className="text-center">
                          <span className="font-bold text-emerald-600 tabular-nums">{t.converted}</span>
                        </TableCell>
                        <TableCell className="text-center">
                          <span className={cn("tabular-nums font-bold", t.dropped > 0 ? "text-red-500" : "text-muted-foreground")}>
                            {t.dropped}
                          </span>
                        </TableCell>
                        <TableCell className="text-center tabular-nums text-muted-foreground">{t.totalFollowUp}</TableCell>
                        <TableCell className="text-center">
                          <span className={cn("tabular-nums font-medium", t.pendingFollowUp > 0 ? "text-amber-600" : "text-muted-foreground")}>
                            {t.pendingFollowUp}
                          </span>
                        </TableCell>
                        <TableCell className="text-center">
                          <span className={cn("tabular-nums", t.junk > 0 ? "text-red-500 font-medium" : "text-muted-foreground")}>
                            {t.junk}
                          </span>
                        </TableCell>
                        <TableCell>
                          <ChevronRight className="w-4 h-4 text-muted-foreground" />
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
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
