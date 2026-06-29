import { useState } from "react";
import { PageWrapper } from "@/layout/PageWrapper";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  BarChart, Bar, ResponsiveContainer, XAxis, YAxis, CartesianGrid, Tooltip,
  PieChart, Pie, Cell,
} from "recharts";
import { TrendingUp, TrendingDown, CheckCircle2, FileText, AlertTriangle, Clock, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { usePageHint } from "@/hooks/usePageHint";
import { ProductTour } from "@/components/ProductTour";
import { useCxReport } from "@/hooks/useCxReport";
import type { CxReportFilters } from "@/api/cxReport.api";

type Period = "today" | "weekly" | "monthly";

// ── Color maps ─────────────────────────────────────────────────────────────────

const OUTCOME_COLOR_CLASSES: Record<string, string> = {
  green:  "bg-green-100 text-green-700 border-green-200",
  red:    "bg-red-100 text-red-700 border-red-200",
  yellow: "bg-yellow-100 text-yellow-700 border-yellow-200",
  orange: "bg-orange-100 text-orange-700 border-orange-200",
  blue:   "bg-blue-100 text-blue-700 border-blue-200",
};

const RISK_BAR_CLASSES: Record<string, string> = {
  green:  "bg-green-500",
  orange: "bg-orange-400",
  red:    "bg-red-500",
};

const RISK_TEXT_CLASSES: Record<string, string> = {
  green:  "text-green-600",
  orange: "text-orange-600",
  red:    "text-red-600",
};

const STAGE_COLORS = [
  "#3b82f6", "#f97316", "#a855f7", "#10b981", "#f59e0b", "#ef4444", "#06b6d4",
];

const RISK_LABEL_PREFIX: Record<string, string> = {
  green:  "Green —",
  orange: "Orange —",
  red:    "Red —",
};

// ── Delta chip ─────────────────────────────────────────────────────────────────

function Delta({ direction, label }: { direction: "up" | "down"; label: string }) {
  const pos = direction === "up";
  return (
    <span className={cn("flex items-center gap-0.5 text-xs font-medium", pos ? "text-green-600" : "text-red-500")}>
      {pos ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
      {label}
    </span>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────────

export default function CxMyReport() {
  const { showHint, dismissHint } = usePageHint("cx_my_report");
  const [period, setPeriod] = useState<Period>("weekly");

  const filters: CxReportFilters = { filter: period };
  const { data, isLoading, isError } = useCxReport(filters);

  const today = new Date().toLocaleDateString("en-IN", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  });

  const periodLabel = period === "today" ? "Today" : period === "weekly" ? "This week" : "This month";

  const ps = data?.performanceSummary;
  const trend = data?.completionTrend ?? [];
  const tatHealth = data?.tatHealth;
  const stages = data?.stageProgress ?? [];
  const docStats = data?.documentStats;

  const maxStage = stages.length > 0 ? Math.max(...stages.map(s => s.count)) : 1;
  const maxRej = docStats && docStats.rejectionReasons.length > 0
    ? Math.max(...docStats.rejectionReasons.map(r => r.count))
    : 1;

  return (
    <PageWrapper
      title="My Report"
      breadcrumbs={[{ label: "CX Team", href: "/" }, { label: "My Report" }]}
      actions={
        <Select value={period} onValueChange={v => setPeriod(v as Period)}>
          <SelectTrigger className="w-[150px]" data-tour="report-period">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="today">Today</SelectItem>
            <SelectItem value="weekly">This week</SelectItem>
            <SelectItem value="monthly">This month</SelectItem>
          </SelectContent>
        </Select>
      }
    >
      <div className="space-y-6">

        {/* Date subtitle */}
        <p className="text-sm text-muted-foreground -mt-3">{today}</p>

        {isLoading && (
          <div className="flex items-center justify-center py-16 text-muted-foreground gap-2">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span className="text-sm">Loading report…</span>
          </div>
        )}

        {isError && (
          <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
            Failed to load report data. Please try again.
          </div>
        )}

        {data && (
          <>
            {/* ── 1. Performance Summary ─────────────────────────────────────── */}
            <section data-tour="report-kpi">
              <h2 className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-3">
                Performance Summary
              </h2>
              <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
                {/* Tasks completed */}
                <Card className="bg-card border-border shadow-sm">
                  <CardContent className="pt-5 pb-4">
                    <div className="flex items-start justify-between mb-1">
                      <CheckCircle2 className="h-4 w-4 text-primary mt-0.5" />
                    </div>
                    <p className="text-3xl font-bold text-foreground">{ps?.tasksCompleted.value ?? "—"}</p>
                    <p className="text-sm text-muted-foreground mt-0.5">Tasks completed</p>
                    {ps?.tasksCompleted.trend && (
                      <div className="mt-2">
                        <Delta direction={ps.tasksCompleted.trend.direction} label={ps.tasksCompleted.trend.label} />
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Docs reviewed */}
                <Card className="bg-card border-border shadow-sm">
                  <CardContent className="pt-5 pb-4">
                    <div className="flex items-start justify-between mb-1">
                      <FileText className="h-4 w-4 text-teal-500 mt-0.5" />
                    </div>
                    <p className="text-3xl font-bold text-foreground">{ps?.docsReviewed.value ?? "—"}</p>
                    <p className="text-sm text-muted-foreground mt-0.5">Docs reviewed</p>
                    {ps?.docsReviewed.subtitle && (
                      <p className="text-xs text-muted-foreground mt-2">{ps.docsReviewed.subtitle}</p>
                    )}
                  </CardContent>
                </Card>

                {/* TAT warnings */}
                <Card className={cn("border shadow-sm", ps?.tatWarnings.alert ? "border-red-200 dark:border-red-900 bg-red-50/40 dark:bg-red-950/10" : "bg-card border-border")}>
                  <CardContent className="pt-5 pb-4">
                    <div className="flex items-start justify-between mb-1">
                      <AlertTriangle className="h-4 w-4 text-orange-500 mt-0.5" />
                    </div>
                    <p className="text-3xl font-bold text-foreground">{ps?.tatWarnings.value ?? "—"}</p>
                    <p className="text-sm text-muted-foreground mt-0.5">TAT warnings</p>
                    {ps?.tatWarnings.breaches > 0 && (
                      <p className="text-xs text-red-600 font-medium mt-2">{ps.tatWarnings.subtitle}</p>
                    )}
                  </CardContent>
                </Card>

                {/* Completion rate */}
                <Card className="bg-card border-border shadow-sm">
                  <CardContent className="pt-5 pb-4">
                    <div className="flex items-start justify-between mb-1">
                      <Clock className="h-4 w-4 text-indigo-500 mt-0.5" />
                    </div>
                    <p className="text-3xl font-bold text-foreground">{ps?.completionRate.display ?? "—"}</p>
                    <p className="text-sm text-muted-foreground mt-0.5">Completion rate</p>
                    {ps?.completionRate.trend && (
                      <div className="mt-2">
                        <Delta direction={ps.completionRate.trend.direction} label={ps.completionRate.trend.label} />
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </section>

            {/* ── 2. Task Completion Chart ────────────────────────────────────── */}
            <Card className="bg-card border-border shadow-sm">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div>
                    <CardTitle className="text-base">Daily / Weekly Task Completion</CardTitle>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Tasks completed per {period === "monthly" ? "week" : "day"} — {periodLabel}
                    </p>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-primary inline-block" />Completed</span>
                    <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-red-400 inline-block" />Overdue</span>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={trend} barSize={12} barCategoryGap="35%">
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="dayLabel" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                    <Tooltip
                      contentStyle={{
                        background: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: 8, fontSize: 12,
                      }}
                    />
                    <Bar dataKey="completed" name="Completed" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="overdue"   name="Overdue"   fill="#f87171"             radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* ── 3. TAT Health + Client Stage Progress ──────────────────────── */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">

              {/* TAT Health */}
              <Card className="bg-card border-border shadow-sm">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">TAT Health</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between text-sm text-muted-foreground mb-1">
                    <span className="font-medium text-foreground">Clients by risk level</span>
                    <span>{tatHealth?.totalClients ?? 0} clients</span>
                  </div>

                  {(tatHealth?.byRiskLevel ?? []).map(row => (
                    <div key={row.level} className="flex items-center gap-3">
                      <span className="text-sm text-muted-foreground w-36 flex-shrink-0">
                        {RISK_LABEL_PREFIX[row.color] ?? ""} {row.label}
                      </span>
                      <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                        <div
                          className={cn("h-2 rounded-full", RISK_BAR_CLASSES[row.color] ?? "bg-primary")}
                          style={{ width: `${tatHealth?.totalClients ? (row.count / tatHealth.totalClients) * 100 : 0}%` }}
                        />
                      </div>
                      <span className={cn("text-sm font-semibold w-5 text-right", RISK_TEXT_CLASSES[row.color] ?? "text-foreground")}>
                        {row.count}
                      </span>
                    </div>
                  ))}

                  <div className="grid grid-cols-2 gap-3 pt-3 border-t border-border">
                    <div className="bg-muted/40 rounded-lg px-4 py-3">
                      <p className="text-2xl font-bold text-red-600">{tatHealth?.summary.escalated ?? 0}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">Escalated</p>
                    </div>
                    <div className="bg-muted/40 rounded-lg px-4 py-3">
                      <p className="text-2xl font-bold text-green-600">{tatHealth?.summary.onTrack ?? 0}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">On track</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Client Stage Progress */}
              <Card className="bg-card border-border shadow-sm">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <CheckCircle2 className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <CardTitle className="text-base">Client Stage Progress</CardTitle>
                        <p className="text-xs text-muted-foreground mt-0.5">Clients per lifecycle stage</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-primary">Total Clients</p>
                      <p className="text-2xl font-bold text-primary leading-tight">
                        {stages.reduce((s, r) => s + r.count, 0)}
                      </p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  {(() => {
                    const total = stages.reduce((s, r) => s + r.count, 0);
                    const pieData = stages.map(s => ({ ...s, value: s.count }));
                    return (
                      <>
                        <div className="flex justify-center">
                          <div className="relative">
                            <ResponsiveContainer width={200} height={200}>
                              <PieChart>
                                <Pie
                                  data={total > 0 ? pieData : [{ label: "Empty", value: 1 }]}
                                  cx="50%"
                                  cy="50%"
                                  innerRadius={60}
                                  outerRadius={90}
                                  dataKey="value"
                                  startAngle={90}
                                  endAngle={-270}
                                  strokeWidth={2}
                                  stroke="hsl(var(--card))"
                                  label={total > 0 ? ({ cx, cy, midAngle, innerRadius, outerRadius, percent }) => {
                                    if (percent < 0.04) return null;
                                    const RADIAN = Math.PI / 180;
                                    const r = innerRadius + (outerRadius - innerRadius) * 0.5;
                                    const x = cx + r * Math.cos(-midAngle * RADIAN);
                                    const y = cy + r * Math.sin(-midAngle * RADIAN);
                                    return (
                                      <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" fontSize={11} fontWeight="600">
                                        {`${(percent * 100).toFixed(0)}%`}
                                      </text>
                                    );
                                  } : undefined}
                                  labelLine={false}
                                >
                                  {total > 0
                                    ? pieData.map((_, i) => (
                                        <Cell key={i} fill={STAGE_COLORS[i % STAGE_COLORS.length]} />
                                      ))
                                    : <Cell fill="hsl(var(--muted))" />
                                  }
                                </Pie>
                                <Tooltip
                                  contentStyle={{
                                    background: "hsl(var(--card))",
                                    border: "1px solid hsl(var(--border))",
                                    borderRadius: 8, fontSize: 12,
                                  }}
                                  formatter={(value: number, _: string, entry: { payload?: { label?: string } }) => [value, entry.payload?.label ?? ""]}
                                />
                              </PieChart>
                            </ResponsiveContainer>
                            {/* Center label */}
                            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                              <p className="text-2xl font-bold text-foreground leading-none">{total}</p>
                              <p className="text-[10px] text-muted-foreground mt-0.5">Total Clients</p>
                            </div>
                          </div>
                        </div>

                        {/* Legend */}
                        <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 mt-3">
                          {stages.map(({ label, count }, i) => {
                            const pct = total > 0 ? ((count / total) * 100).toFixed(0) : "0";
                            return (
                              <div key={label} className="flex items-center gap-1.5 min-w-0">
                                <span
                                  className="h-2.5 w-2.5 rounded-full flex-shrink-0"
                                  style={{ backgroundColor: STAGE_COLORS[i % STAGE_COLORS.length] }}
                                />
                                <span className="text-xs text-muted-foreground truncate flex-1 min-w-0">{label}</span>
                                <span className="text-xs font-medium text-foreground whitespace-nowrap ml-1">
                                  {count} ({pct}%)
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </>
                    );
                  })()}
                </CardContent>
              </Card>
            </div>

            {/* ── 4. Document Processing Stats ───────────────────────────────── */}
            <section data-tour="report-outcomes">
              <h2 className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-3">
                Document Processing Stats
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">

                {/* Outcome breakdown */}
                <Card className="bg-card border-border shadow-sm">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Outcome breakdown</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2.5">
                    {(docStats?.outcomeBreakdown ?? []).map(row => (
                      <div key={row.key} className="flex items-center justify-between">
                        <span className={cn("text-xs font-medium px-2 py-0.5 rounded-full border", OUTCOME_COLOR_CLASSES[row.color] ?? "bg-muted text-muted-foreground border-border")}>
                          {row.label}
                        </span>
                        <span className="text-sm font-semibold text-foreground">{row.count}</span>
                      </div>
                    ))}
                  </CardContent>
                </Card>

                {/* Review rate */}
                <Card className="bg-card border-border shadow-sm">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Review rate</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <p className="text-4xl font-bold text-green-600">
                        {docStats?.reviewRate.approvalRateDisplay ?? "—"}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {docStats?.reviewRate.subtitle ?? "Approval rate this period"}
                      </p>
                    </div>
                    <div className="pt-3 border-t border-border">
                      <p className="text-xs text-muted-foreground">Avg turnaround</p>
                      <p className="text-2xl font-bold text-foreground mt-0.5">
                        {docStats?.reviewRate.avgTurnaround ?? "—"}
                      </p>
                    </div>
                  </CardContent>
                </Card>

                {/* Common rejection reasons */}
                <Card className="bg-card border-border shadow-sm">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Common rejection reasons</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {(docStats?.rejectionReasons ?? []).map(({ label, count }) => (
                      <div key={label} className="flex items-center gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-0.5">
                            <span className="text-xs text-muted-foreground truncate">{label}</span>
                            <span className="text-xs font-semibold text-red-500 ml-2">{count}</span>
                          </div>
                          <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                            <div
                              className="h-1.5 rounded-full bg-red-400"
                              style={{ width: `${(count / maxRej) * 100}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </div>
            </section>
          </>
        )}

      </div>

      <ProductTour
        open={showHint}
        onClose={dismissHint}
        steps={[
          { target: '[data-tour="report-period"]', title: "Period Selector", content: "Switch between Today, This Week, and This Month. All charts and KPIs update instantly.", side: "bottom" },
          { target: '[data-tour="report-kpi"]', title: "KPI Cards", content: "Four cards show your performance. Delta badges show change vs the previous period — green = improved, red = declined.", side: "bottom" },
          { target: '[data-tour="report-outcomes"]', title: "Outcome Breakdown", content: "See your document review outcomes — approved, rejected, pending — plus common rejection reasons.", side: "top" },
        ]}
      />
    </PageWrapper>
  );
}
