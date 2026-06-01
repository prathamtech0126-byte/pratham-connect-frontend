import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation } from "wouter";
import { format, startOfMonth, endOfMonth, startOfDay, endOfDay, startOfWeek, endOfWeek } from "date-fns";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";

import { PageWrapper } from "@/layout/PageWrapper";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import {
  Users, ArrowRightLeft, CheckCircle2, CalendarClock, PhoneOff,
  Phone, Calendar, ChevronRight, TrendingUp, Target,
} from "lucide-react";

import { useAuth } from "@/context/auth-context";
import { fetchAllLeads, type LeadEntity } from "@/api/leads.api";
import DateRangePicker from "@/components/payments/DateRangePicker";
import api from "@/lib/api";
import { cn } from "@/lib/utils";
import { formatCrmTimestamp, parseCrmTimestamp } from "@/lib/format-crm-timestamp";

type DateFilterType = "today" | "weekly" | "monthly" | "custom";
type UserLite = { id: number; fullName: string };
type LeadTypeLite = { id: number; leadType: string; displayAlias?: string | null };

const DATE_LABELS: Record<DateFilterType, string> = {
  today: "Today", weekly: "This Week", monthly: "This Month", custom: "Custom",
};

function getDateBounds(f: DateFilterType, from?: string, to?: string) {
  const now = new Date();
  if (f === "today") return { from: startOfDay(now), to: endOfDay(now) };
  if (f === "weekly") return { from: startOfWeek(now, { weekStartsOn: 1 }), to: endOfWeek(now, { weekStartsOn: 1 }) };
  if (f === "monthly") return { from: startOfMonth(now), to: endOfMonth(now) };
  if (f === "custom" && from && to) return { from: startOfDay(new Date(from)), to: endOfDay(new Date(to)) };
  return { from: startOfMonth(now), to: endOfMonth(now) };
}

function StatCard({ label, value, icon: Icon, color, bg, sub }: {
  label: string; value: number; icon: any; color: string; bg: string; sub?: string;
}) {
  return (
    <Card className="shadow-sm border-none bg-card/60">
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1">{label}</p>
            <p className={cn("text-3xl font-extrabold tabular-nums", color)}>{value}</p>
            {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
          </div>
          <div className={cn("p-2 rounded-xl", bg)}>
            <Icon className={cn("h-5 w-5", color)} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function MarketingHeadDashboard() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();

  const [allLeads, setAllLeads] = useState<LeadEntity[]>([]);
  const [telecallers, setTelecallers] = useState<UserLite[]>([]);
  const [counsellors, setCounsellors] = useState<UserLite[]>([]);
  const [leadTypes, setLeadTypes] = useState<LeadTypeLite[]>([]);
  const [loading, setLoading] = useState(false);
  const [dateFilter, setDateFilter] = useState<DateFilterType>("monthly");
  const [customFrom, setCustomFrom] = useState<string | undefined>();
  const [customTo, setCustomTo] = useState<string | undefined>();
  const [showDatePicker, setShowDatePicker] = useState(false);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [leadRes, tRes, cRes, ltRes] = await Promise.all([
        fetchAllLeads({}),
        api.get("/api/users/telecallers"),
        api.get("/api/users/counsellors"),
        api.get("/api/lead-types"),
      ]);
      setAllLeads(leadRes);
      setTelecallers(tRes?.data?.data || tRes?.data || []);
      setCounsellors(cRes?.data?.data || cRes?.data || []);
      setLeadTypes(ltRes?.data?.data || ltRes?.data || []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void loadData(); }, [loadData]);

  const bounds = useMemo(() => getDateBounds(dateFilter, customFrom, customTo), [dateFilter, customFrom, customTo]);

  const filteredLeads = useMemo(() => {
    if (!bounds) return allLeads;
    return allLeads.filter(l => {
      const d = new Date(l.createdAt);
      return d >= bounds.from && d <= bounds.to;
    });
  }, [allLeads, bounds]);

  const todayLeads = useMemo(() => {
    const b = getDateBounds("today");
    return allLeads.filter(l => new Date(l.createdAt) >= b.from && new Date(l.createdAt) <= b.to);
  }, [allLeads]);

  const stats = useMemo(() => ({
    assigned: filteredLeads.length,
    contacted: filteredLeads.filter(l => ["contacted", "interested", "follow_up", "converted"].includes(l.progressStatus)).length,
    notContacted: filteredLeads.filter(l => l.progressStatus === "not_contacted").length,
    transferred: filteredLeads.filter(l => ["transferred", "dropped"].includes(l.assignmentStatus)).length,
    converted: filteredLeads.filter(l => l.assignmentStatus === "converted").length,
    followUpToday: allLeads.filter(l => {
      if (!l.nextFollowupAt) return false;
      const d = parseCrmTimestamp(l.nextFollowupAt);
      if (!d) return false;
      const t = getDateBounds("today");
      return d >= t.from && d <= t.to;
    }).length,
    junk: filteredLeads.filter(l => l.isJunk || l.progressStatus === "junk").length,
    todayNew: todayLeads.length,
  }), [filteredLeads, allLeads, todayLeads]);

  const resolveAlias = (slug: string | null | undefined) => {
    if (!slug) return "Unknown";
    return leadTypes.find(lt => lt.leadType === slug)?.displayAlias?.trim() || slug.replace(/_/g, " ");
  };

  // Lead source distribution
  const sourceBreakdown = useMemo(() => {
    const map: Record<string, { assigned: number; transferred: number; converted: number }> = {};
    filteredLeads.forEach(l => {
      const alias = resolveAlias(l.leadSource);
      if (!map[alias]) map[alias] = { assigned: 0, transferred: 0, converted: 0 };
      map[alias].assigned++;
      if (["transferred", "dropped"].includes(l.assignmentStatus)) map[alias].transferred++;
      if (l.assignmentStatus === "converted") map[alias].converted++;
    });
    return Object.entries(map)
      .map(([source, v]) => ({ source, ...v }))
      .sort((a, b) => b.assigned - a.assigned);
  }, [filteredLeads, leadTypes]);

  // Telecaller leaderboard
  const telecallerStats = useMemo(() => {
    return telecallers
      .map(t => {
        const tLeads = filteredLeads.filter(l => l.currentTelecallerId === t.id);
        return {
          id: t.id,
          name: t.fullName,
          assigned: tLeads.length,
          transferred: tLeads.filter(l => ["transferred", "dropped"].includes(l.assignmentStatus)).length,
          converted: tLeads.filter(l => l.assignmentStatus === "converted").length,
          followUp: tLeads.filter(l => l.progressStatus === "follow_up").length,
          junk: tLeads.filter(l => l.isJunk).length,
        };
      })
      .filter(t => t.assigned > 0)
      .sort((a, b) => b.transferred - a.transferred || b.assigned - a.assigned);
  }, [filteredLeads, telecallers]);

  // Counsellor outcome
  const counsellorStats = useMemo(() => {
    return counsellors
      .map(c => {
        const cLeads = filteredLeads.filter(l => l.currentCounsellorId === c.id);
        if (cLeads.length === 0) return null;
        return {
          id: c.id,
          name: c.fullName,
          received: cLeads.length,
          converted: cLeads.filter(l => l.assignmentStatus === "converted").length,
          dropped: cLeads.filter(l => l.assignmentStatus === "dropped").length,
        };
      })
      .filter(Boolean)
      .sort((a, b) => b!.received - a!.received) as { id: number; name: string; received: number; converted: number; dropped: number }[];
  }, [filteredLeads, counsellors]);

  // Today's follow-ups
  const todayFollowUps = useMemo(() => {
    const t = getDateBounds("today");
    return allLeads
      .filter(l => {
        if (!l.nextFollowupAt) return false;
        const d = parseCrmTimestamp(l.nextFollowupAt);
        return d != null && d >= t.from && d <= t.to;
      })
      .slice(0, 20);
  }, [allLeads]);

  const chartData = telecallerStats.slice(0, 12);

  const customLabel = dateFilter === "custom" && customFrom && customTo
    ? `${format(new Date(customFrom), "d MMM")} – ${format(new Date(customTo), "d MMM yyyy")}`
    : null;

  return (
    <PageWrapper
      title="Marketing Dashboard"
      breadcrumbs={[{ label: "Dashboard" }, { label: "Marketing Head" }]}
    >
      <div className="space-y-6">

        {/* ── Period Filter ─────────────────────────────── */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">Lead Analytics Overview</h2>
            <p className="text-sm text-muted-foreground">All lead sources · {filteredLeads.length} leads in period</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex rounded-lg border border-border bg-muted/30 p-0.5 gap-0.5">
              {(["today", "weekly", "monthly"] as const).map(f => (
                <button
                  key={f}
                  onClick={() => { setDateFilter(f); setCustomFrom(undefined); setCustomTo(undefined); }}
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

        {/* ── Summary Cards ─────────────────────────────── */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-8">
          <StatCard label="New Today" value={stats.todayNew} icon={TrendingUp} color="text-indigo-600" bg="bg-indigo-50" />
          <StatCard label="Total Assigned" value={stats.assigned} icon={Users} color="text-blue-600" bg="bg-blue-50" />
          <StatCard label="Contacted" value={stats.contacted} icon={Phone} color="text-sky-600" bg="bg-sky-50" />
          <StatCard label="Not Contacted" value={stats.notContacted} icon={PhoneOff} color="text-slate-500" bg="bg-slate-100" />
          <StatCard label="Transferred" value={stats.transferred} icon={ArrowRightLeft} color="text-amber-600" bg="bg-amber-50"
            sub={stats.assigned > 0 ? `${((stats.transferred / stats.assigned) * 100).toFixed(0)}% rate` : undefined}
          />
          <StatCard label="Converted" value={stats.converted} icon={CheckCircle2} color="text-emerald-600" bg="bg-emerald-50"
            sub={stats.transferred > 0 ? `${((stats.converted / stats.transferred) * 100).toFixed(0)}% of transferred` : undefined}
          />
          <StatCard label="Follow-ups Today" value={stats.followUpToday} icon={CalendarClock} color="text-violet-600" bg="bg-violet-50" />
          <StatCard label="Junk" value={stats.junk} icon={Target} color="text-red-500" bg="bg-red-50" />
        </div>

        {/* ── Lead Source Distribution + Telecaller Chart ── */}
        <div className="grid gap-6 lg:grid-cols-5">

          {/* Source Distribution Table */}
          <Card className="lg:col-span-2 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold">Lead Source Distribution</CardTitle>
              <CardDescription className="text-xs">Where leads are coming from</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div className="max-h-[340px] overflow-auto divide-y">
                {sourceBreakdown.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">No data.</p>
                ) : sourceBreakdown.map(row => {
                  const pct = row.assigned > 0 ? (row.assigned / stats.assigned) * 100 : 0;
                  const convPct = row.assigned > 0 ? ((row.transferred / row.assigned) * 100).toFixed(0) : "0";
                  return (
                    <div key={row.source} className="px-4 py-3">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-sm font-medium truncate max-w-[140px]">{row.source}</span>
                        <div className="flex items-center gap-3 text-xs tabular-nums">
                          <span className="text-muted-foreground">{row.assigned}</span>
                          <span className="text-blue-600 font-medium">{row.transferred}↗</span>
                          <span className="text-emerald-600 font-medium">{row.converted}✓</span>
                        </div>
                      </div>
                      <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                        <div className="h-full rounded-full bg-primary/70 transition-all" style={{ width: `${pct}%` }} />
                      </div>
                      <p className="text-[10px] text-muted-foreground mt-0.5">{pct.toFixed(0)}% of total · {convPct}% transfer rate</p>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Telecaller Performance Bar Chart */}
          <Card className="lg:col-span-3 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold">Telecaller Transfers</CardTitle>
              <CardDescription className="text-xs">Top performers by transfer count</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="h-64 flex items-center justify-center text-sm text-muted-foreground">Loading…</div>
              ) : chartData.length === 0 ? (
                <div className="h-64 flex items-center justify-center text-sm text-muted-foreground">No data for selected period</div>
              ) : (
                <ResponsiveContainer width="100%" height={Math.max(chartData.length * 36, 180)}>
                  <BarChart data={chartData} layout="vertical" margin={{ left: 0, right: 24, top: 4, bottom: 4 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f0f0f0" />
                    <XAxis type="number" tick={{ fontSize: 11 }} allowDecimals={false} axisLine={false} tickLine={false} />
                    <YAxis
                      type="category" dataKey="name" width={110}
                      tick={{ fontSize: 11 }}
                      tickFormatter={(v: string) => v.length > 13 ? v.slice(0, 12) + "…" : v}
                      axisLine={false} tickLine={false}
                    />
                    <Tooltip
                      cursor={{ fill: "rgba(0,0,0,0.04)" }}
                      content={({ active, payload }) => {
                        if (!active || !payload?.length) return null;
                        const d = payload[0].payload;
                        return (
                          <div className="rounded-lg border bg-background shadow-md p-3 text-xs space-y-1 min-w-[140px]">
                            <p className="font-semibold">{d.name}</p>
                            <p className="flex justify-between gap-4">Assigned <span className="font-bold">{d.assigned}</span></p>
                            <p className="flex justify-between gap-4">Transferred <span className="font-bold text-blue-600">{d.transferred}</span></p>
                            <p className="flex justify-between gap-4">Converted <span className="font-bold text-emerald-600">{d.converted}</span></p>
                          </div>
                        );
                      }}
                    />
                    <Bar dataKey="transferred" fill="#2563EB" radius={[0, 4, 4, 0]} maxBarSize={18} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </div>

        {/* ── Telecaller Leaderboard ─────────────────────── */}
        <Card className="shadow-sm">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-sm font-semibold">Telecaller Leaderboard</CardTitle>
                <CardDescription className="text-xs">Ranked by transfers — click to view individual analysis</CardDescription>
              </div>
              <Button variant="outline" size="sm" className="text-xs h-8" onClick={() => setLocation("/leads/reports")}>
                Full Report <ChevronRight className="h-3.5 w-3.5 ml-1" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50 hover:bg-muted/50">
                  <TableHead className="text-xs uppercase w-12 pl-4">Rank</TableHead>
                  <TableHead className="text-xs uppercase">Telecaller</TableHead>
                  <TableHead className="text-xs uppercase text-center">Assigned</TableHead>
                  <TableHead className="text-xs uppercase text-center">Transferred</TableHead>
                  <TableHead className="text-xs uppercase text-center">Converted</TableHead>
                  <TableHead className="text-xs uppercase text-center">Follow Up</TableHead>
                  <TableHead className="text-xs uppercase text-center">Junk</TableHead>
                  <TableHead className="text-xs uppercase text-center pr-4">Trans. Rate</TableHead>
                  <TableHead className="w-8" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow><TableCell colSpan={9} className="h-24 text-center text-sm text-muted-foreground">Loading…</TableCell></TableRow>
                ) : telecallerStats.length === 0 ? (
                  <TableRow><TableCell colSpan={9} className="h-24 text-center text-sm text-muted-foreground">No telecaller data for selected period.</TableCell></TableRow>
                ) : telecallerStats.map((t, i) => {
                  const rate = t.assigned > 0 ? ((t.transferred / t.assigned) * 100).toFixed(0) : "0";
                  return (
                    <TableRow
                      key={t.id}
                      className="cursor-pointer hover:bg-muted/30 transition-colors"
                      onClick={() => setLocation(`/leads/telecaller/${t.id}`)}
                    >
                      <TableCell className="pl-4">
                        <span className={cn("text-sm font-bold",
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
                      <TableCell className="text-center tabular-nums font-medium">{t.assigned}</TableCell>
                      <TableCell className="text-center">
                        <span className="font-bold text-blue-600 tabular-nums">{t.transferred}</span>
                      </TableCell>
                      <TableCell className="text-center">
                        <span className="font-bold text-emerald-600 tabular-nums">{t.converted}</span>
                      </TableCell>
                      <TableCell className="text-center">
                        <span className={cn("tabular-nums font-medium", t.followUp > 0 ? "text-amber-600" : "text-muted-foreground")}>
                          {t.followUp}
                        </span>
                      </TableCell>
                      <TableCell className="text-center">
                        <span className={cn("tabular-nums", t.junk > 0 ? "text-red-500 font-medium" : "text-muted-foreground")}>
                          {t.junk}
                        </span>
                      </TableCell>
                      <TableCell className="text-center pr-4">
                        <span className={cn("text-xs font-semibold tabular-nums px-1.5 py-0.5 rounded-full",
                          Number(rate) >= 50 ? "bg-emerald-100 text-emerald-700" :
                          Number(rate) >= 30 ? "bg-amber-100 text-amber-700" :
                          "bg-slate-100 text-slate-600"
                        )}>
                          {rate}%
                        </span>
                      </TableCell>
                      <TableCell><ChevronRight className="w-4 h-4 text-muted-foreground" /></TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* ── Counsellor Outcomes + Today's Follow-ups ──── */}
        <div className="grid gap-6 lg:grid-cols-2">

          {/* Counsellor outcomes */}
          <Card className="shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold">Counsellor Outcomes</CardTitle>
              <CardDescription className="text-xs">Received · converted · dropped per counsellor</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div className="max-h-[340px] overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50 hover:bg-muted/50 sticky top-0 z-10">
                      <TableHead className="text-xs uppercase pl-4">Counsellor</TableHead>
                      <TableHead className="text-xs uppercase text-center">Received</TableHead>
                      <TableHead className="text-xs uppercase text-center">Converted</TableHead>
                      <TableHead className="text-xs uppercase text-center">Dropped</TableHead>
                      <TableHead className="text-xs uppercase text-center pr-4">Rate</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {counsellorStats.length === 0 ? (
                      <TableRow><TableCell colSpan={5} className="h-20 text-center text-sm text-muted-foreground">No data.</TableCell></TableRow>
                    ) : counsellorStats.map((c, i) => {
                      const rate = c.received > 0 ? ((c.converted / c.received) * 100).toFixed(0) : "0";
                      return (
                        <TableRow key={c.id} className="hover:bg-muted/20">
                          <TableCell className="pl-4">
                            <div className="flex items-center gap-2">
                              <div className="h-7 w-7 rounded-full bg-emerald-100 flex items-center justify-center text-xs font-bold text-emerald-700 shrink-0">
                                {c.name.charAt(0).toUpperCase()}
                              </div>
                              <span className="text-sm font-medium">{c.name}</span>
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
                          <TableCell className="text-center pr-4">
                            <span className={cn("text-xs font-semibold tabular-nums px-1.5 py-0.5 rounded-full",
                              Number(rate) >= 50 ? "bg-emerald-100 text-emerald-700" :
                              Number(rate) >= 25 ? "bg-amber-100 text-amber-700" :
                              "bg-slate-100 text-slate-600"
                            )}>
                              {rate}%
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

          {/* Today's Follow-ups */}
          <Card className="shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold">Today's Follow-ups</CardTitle>
              <CardDescription className="text-xs">{todayFollowUps.length} lead{todayFollowUps.length !== 1 ? "s" : ""} scheduled for follow-up today</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div className="max-h-[340px] overflow-auto divide-y">
                {todayFollowUps.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">No follow-ups scheduled for today.</p>
                ) : todayFollowUps.map(lead => (
                  <button
                    key={lead.id}
                    type="button"
                    className="w-full flex items-start gap-3 px-4 py-3 hover:bg-muted/40 transition-colors text-left"
                    onClick={() => setLocation(`/leads/${lead.id}`)}
                  >
                    <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary shrink-0 mt-0.5">
                      {lead.fullName?.charAt(0)?.toUpperCase() || "L"}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold truncate">{lead.fullName}</p>
                      <p className="text-xs text-muted-foreground">{lead.phone}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <Badge variant="outline" className="text-[10px] px-1.5 capitalize">
                          {lead.progressStatus.replace(/_/g, " ")}
                        </Badge>
                        {lead.nextFollowupAt && (
                          <span className="text-[10px] text-amber-600 font-medium">
                            {formatCrmTimestamp(lead.nextFollowupAt, "time")}
                          </span>
                        )}
                      </div>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0 mt-2" />
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

      </div>

      <Dialog open={showDatePicker} onOpenChange={setShowDatePicker}>
        <DialogContent className="p-0 max-w-[800px] overflow-hidden rounded-xl border-0">
          <DialogTitle className="sr-only">Select Date Range</DialogTitle>
          <DateRangePicker
            onApply={(_, s, e) => {
              if (s && e) { setCustomFrom(s); setCustomTo(e); setDateFilter("custom"); }
              setShowDatePicker(false);
            }}
            onCancel={() => setShowDatePicker(false)}
          />
        </DialogContent>
      </Dialog>
    </PageWrapper>
  );
}
