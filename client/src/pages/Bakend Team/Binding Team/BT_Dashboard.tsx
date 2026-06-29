import { useState } from "react";
import { useLocation } from "wouter";
import { PageWrapper } from "@/layout/PageWrapper";
import { StatCard } from "@/components/cards/StatCard";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import {
  Users, ArrowRightCircle, PackageCheck, AlertTriangle,
  GitBranch, CheckCircle2, XCircle, Undo2, Hourglass, Send, List,
} from "lucide-react";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Cell,
  PieChart, Pie,
} from "recharts";
import { usePageHint } from "@/hooks/usePageHint";
import { ProductTour } from "@/components/ProductTour";
import { DashboardDateFilter } from "@/components/dashboard/DashboardDateFilter";
import { useOpsDashboard } from "@/hooks/useVisaCases";
import { format } from "date-fns";

const STAGE_COLORS = [
  "hsl(var(--chart-1))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
  "hsl(var(--primary))",
];

const SUB_COLORS = [
  "hsl(var(--primary))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-1))",
];

type OpsFilter = "today" | "weekly" | "monthly" | "custom";

const TAB_TO_FILTER: Record<string, OpsFilter> = {
  Today: "today", Weekly: "weekly", Monthly: "monthly", Custom: "custom",
};
const FILTER_TO_TAB: Record<OpsFilter, string> = {
  today: "Today", weekly: "Weekly", monthly: "Monthly", custom: "Custom",
};

const pct = (n: number | null | string) => {
  if (n == null) return "—";
  if (typeof n === "string" && n.includes("%")) return n;
  return `${Number(n).toFixed(1)}%`;
};

export default function BtDashboard() {
  const [, navigate] = useLocation();
  const { showHint, dismissHint } = usePageHint("bt_dashboard");
  const [filter, setFilter] = useState<OpsFilter>("monthly");
  const [customRange, setCustomRange] = useState<[Date | null, Date | null]>([null, null]);

  const fromDate = filter === "custom" && customRange[0] ? format(customRange[0], "yyyy-MM-dd") : undefined;
  const toDate = filter === "custom" && customRange[1] ? format(customRange[1], "yyyy-MM-dd") : undefined;

  const { data, isLoading } = useOpsDashboard(
    { filter, fromDate, toDate },
    filter !== "custom" || (!!fromDate && !!toDate)
  );

  const s = data?.summary;
  const casesByStage = data?.casesByStage ?? [];
  const bySubStatus = data?.bySubStatus ?? [];
  const co = data?.caseOutcomes;

  // Group sub-statuses by stageLabel for a cleaner grouped view
  const subStatusByStage = bySubStatus.reduce<Record<string, typeof bySubStatus>>((acc, sub) => {
    const key = sub.stageLabel ?? sub.stage;
    if (!acc[key]) acc[key] = [];
    acc[key].push(sub);
    return acc;
  }, {});
  if (isLoading) {
    return (
      <PageWrapper title="My Dashboard" breadcrumbs={[{ label: "Binding Team" }]}>
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-28 rounded-xl" />)}
          </div>
          <div className="grid gap-4 lg:grid-cols-3">
            <Skeleton className="h-44 rounded-xl lg:col-span-2" />
            <Skeleton className="h-44 rounded-xl" />
          </div>
          <Skeleton className="h-52 rounded-xl" />
        </div>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper
      title="My Dashboard"
      breadcrumbs={[{ label: "Binding Team" }]}
      actions={
        <DashboardDateFilter
          data-tour="bt-dash-date-filter"
          date={customRange}
          onDateChange={setCustomRange}
          activeTab={FILTER_TO_TAB[filter]}
          onTabChange={(tab) => setFilter(TAB_TO_FILTER[tab] ?? "monthly")}
          showYearly={false}
          align="end"
        />
      }
    >
      <div className="space-y-5">

        {/* KPI Row */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Active Cases"
            value={s?.activeCases ?? 0}
            description="assigned to me"
            icon={Users}
            onClick={() => navigate("/binding/clients")}
            extra={
              s?.clientsByCategory?.length ? (
                <div className="flex flex-wrap gap-1.5">
                  {s.clientsByCategory.map((c) => (
                    <span key={c.category} className="rounded-md bg-muted/60 px-2 py-0.5 text-[11px] font-medium">
                      <span className="text-muted-foreground">{c.label}</span>{" "}
                      <span className="font-bold text-foreground">{c.count}</span>
                    </span>
                  ))}
                </div>
              ) : null
            }
          />
          <StatCard
            title="Received from CX"
            value={s?.receivedFromCx ?? 0}
            description="handed over to binding"
            icon={ArrowRightCircle}
          />
          <StatCard
            title="Ready for App Work"
            value={s?.readyForApplicationWork ?? 0}
            description="ready to proceed"
            icon={PackageCheck}
          />
          <StatCard
            title="Stuck Cases"
            value={s?.stuckCases ?? 0}
            description="need attention"
            icon={AlertTriangle}
          />
        </div>

        {/* Cases by Stage + Case Outcomes */}
        <div className="grid gap-4 lg:grid-cols-3">

          {/* Pipeline */}
          {casesByStage.length > 0 && (
            <Card className="border-none shadow-card lg:col-span-2">
              <CardContent className="p-5">
                <div className="mb-5 flex items-center gap-2.5">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <GitBranch className="h-4 w-4" />
                  </div>
                  <h3 className="text-sm font-bold text-foreground">Cases by Stage</h3>
                </div>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {casesByStage.map((st, idx) => {
                    const dotColors = [
                      "bg-blue-500", "bg-violet-500", "bg-amber-500", "bg-emerald-500",
                      "bg-sky-500", "bg-rose-500", "bg-orange-500", "bg-teal-500", "bg-pink-500",
                    ];
                    const bgColors = [
                      "bg-blue-50 dark:bg-blue-500/10", "bg-violet-50 dark:bg-violet-500/10",
                      "bg-amber-50 dark:bg-amber-500/10", "bg-emerald-50 dark:bg-emerald-500/10",
                      "bg-sky-50 dark:bg-sky-500/10", "bg-rose-50 dark:bg-rose-500/10",
                      "bg-orange-50 dark:bg-orange-500/10", "bg-teal-50 dark:bg-teal-500/10",
                      "bg-pink-50 dark:bg-pink-500/10",
                    ];
                    const textColors = [
                      "text-blue-600 dark:text-blue-400", "text-violet-600 dark:text-violet-400",
                      "text-amber-600 dark:text-amber-400", "text-emerald-600 dark:text-emerald-400",
                      "text-sky-600 dark:text-sky-400", "text-rose-600 dark:text-rose-400",
                      "text-orange-600 dark:text-orange-400", "text-teal-600 dark:text-teal-400",
                      "text-pink-600 dark:text-pink-400",
                    ];
                    const color = idx % dotColors.length;
                    return (
                      <div
                        key={st.stage}
                        onClick={() => navigate(`/binding/clients?stage=${encodeURIComponent(st.stage)}`)}
                        className={cn(
                          "flex flex-col gap-2 rounded-xl border border-transparent p-4 cursor-pointer transition-all hover:ring-2 hover:ring-primary/40 hover:shadow-md",
                          bgColors[color]
                        )}
                      >
                        <div className="flex items-center gap-1.5">
                          <span className={cn("h-2 w-2 rounded-full flex-shrink-0", dotColors[color])} />
                          <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground leading-tight">{st.label}</span>
                        </div>
                        <span className={cn("text-3xl font-bold tabular-nums leading-none", textColors[color])}>{st.count}</span>
                        <span className="text-[11px] text-muted-foreground">{st.count === 1 ? "case" : "cases"}</span>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Case Outcomes */}
          {co && (
            <Card className="border-none shadow-card">
              <CardContent className="p-5">
                <div className="mb-4 flex items-center gap-2.5">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <CheckCircle2 className="h-4 w-4" />
                  </div>
                  <h3 className="text-sm font-bold text-foreground">Case Outcomes</h3>
                </div>
                <div className="space-y-2.5">
                  {(
                    [
                      { label: "Pending", value: co.pending, icon: Hourglass },
                      { label: "Approved", value: co.approved, icon: CheckCircle2 },
                      { label: "Files Submitted", value: co.filesSubmitted, icon: Send },
                      { label: "Refused", value: co.refused, icon: XCircle },
                      { label: "Withdrawn", value: co.withdrawn, icon: Undo2 },
                    ] as const
                  ).map((o) => (
                    <div
                      key={o.label}
                      className="flex items-center justify-between border-b border-border/40 pb-2 text-sm last:border-0 last:pb-0"
                    >
                      <div className="flex items-center gap-2">
                        <o.icon className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className="text-muted-foreground">{o.label}</span>
                      </div>
                      <span className="font-semibold tabular-nums text-foreground">{o.value}</span>
                    </div>
                  ))}
                  <p className="pt-1 text-xs text-muted-foreground">
                    Approval rate:{" "}
                    <span className="font-semibold text-foreground">{pct(co.approvalRate)}</span>
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sub-status breakdown — grouped by stage */}
        {Object.keys(subStatusByStage).length > 0 && (
          <div className="space-y-5">

            {/* Section header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <List className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-foreground">Status Breakdown</h3>
                  <p className="text-xs text-muted-foreground">Pipeline distribution across all stages</p>
                </div>
              </div>
              <span className="rounded-full bg-muted px-3 py-1 text-xs font-semibold text-muted-foreground">
                {bySubStatus.reduce((s, i) => s + i.count, 0)} total cases
              </span>
            </div>

            {/* Stage overview — vertical bar chart */}
            <Card className="border-none shadow-card">
              <CardContent className="p-5">
                <p className="mb-1 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                  Cases per Stage
                </p>
                <p className="mb-4 text-[11px] text-muted-foreground/70">
                  Comparative view of all pipeline stages
                </p>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart
                    data={Object.entries(subStatusByStage).map(([label, items]) => ({
                      stage: label,
                      count: items.reduce((s, i) => s + i.count, 0),
                    }))}
                    barSize={36}
                    margin={{ left: 0, right: 0, top: 20, bottom: 8 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                    <XAxis
                      dataKey="stage"
                      tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                      axisLine={false}
                      tickLine={false}
                      interval={0}
                      height={40}
                      tickFormatter={(v: string) => v.length > 10 ? v.slice(0, 9) + "…" : v}
                    />
                    <YAxis
                      allowDecimals={false}
                      tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                      axisLine={false}
                      tickLine={false}
                      width={24}
                    />
                    <Tooltip
                      cursor={{ fill: "hsl(var(--accent))", radius: 6 }}
                      contentStyle={{
                        background: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: 8,
                        fontSize: 12,
                      }}
                      formatter={(value: number) => [value, "Cases"]}
                    />
                    <Bar dataKey="count" name="Cases" radius={[6, 6, 0, 0]} label={{ position: "top", fontSize: 11, fill: "hsl(var(--muted-foreground))", fontWeight: 700 }}>
                      {Object.entries(subStatusByStage).map(([label], i) => (
                        <Cell key={label} fill={STAGE_COLORS[i % STAGE_COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Per-stage donut cards */}
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {Object.entries(subStatusByStage).map(([stageLabel, items], stageIdx) => {
                const stageTotal = items.reduce((sum, i) => sum + i.count, 0);
                const stageColor = STAGE_COLORS[stageIdx % STAGE_COLORS.length];

                const pieData = items.map((sub, i) => ({
                  name: sub.label,
                  value: sub.count > 0 ? sub.count : 0,
                  color: sub.count > 0 ? SUB_COLORS[i % SUB_COLORS.length] : "hsl(var(--muted))",
                }));

                const hasData = stageTotal > 0;

                return (
                  <Card key={stageLabel} className="border-none shadow-card overflow-hidden">
                    {/* Thin top accent line per stage */}
                    <div className="h-[3px] w-full" style={{ background: stageColor }} />

                    <CardContent className="p-4">
                      {/* Card header */}
                      <div className="mb-3 flex items-center justify-between gap-2">
                        <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground truncate">
                          {stageLabel}
                        </p>
                        <span
                          className="flex-shrink-0 rounded-full px-2.5 py-0.5 text-xs font-bold"
                          style={{ background: `color-mix(in srgb, ${stageColor} 15%, transparent)`, color: stageColor }}
                        >
                          {stageTotal}
                        </span>
                      </div>

                      {/* Donut chart */}
                      {hasData ? (
                        <div className="relative flex items-center justify-center">
                          <ResponsiveContainer width="100%" height={140}>
                            <PieChart>
                              <Pie
                                data={pieData.filter(d => d.value > 0).length > 0 ? pieData.filter(d => d.value > 0) : [{ name: "empty", value: 1, color: "hsl(var(--muted))" }]}
                                cx="50%"
                                cy="50%"
                                innerRadius={42}
                                outerRadius={62}
                                dataKey="value"
                                paddingAngle={3}
                                strokeWidth={2}
                                stroke="hsl(var(--card))"
                                startAngle={90}
                                endAngle={-270}
                              >
                                {pieData.filter(d => d.value > 0).map((entry, i) => (
                                  <Cell key={i} fill={entry.color} />
                                ))}
                              </Pie>
                              <Tooltip
                                contentStyle={{
                                  background: "hsl(var(--card))",
                                  border: "1px solid hsl(var(--border))",
                                  borderRadius: 8,
                                  fontSize: 12,
                                }}
                              />
                            </PieChart>
                          </ResponsiveContainer>
                          {/* Center label */}
                          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                            <p className="text-2xl font-extrabold leading-none tabular-nums" style={{ color: stageColor }}>
                              {stageTotal}
                            </p>
                            <p className="mt-0.5 text-[10px] text-muted-foreground">cases</p>
                          </div>
                        </div>
                      ) : (
                        <div className="flex h-[140px] flex-col items-center justify-center gap-2">
                          <div className="h-16 w-16 rounded-full border-4 border-dashed border-border/50" />
                          <p className="text-xs text-muted-foreground/50">No active cases</p>
                        </div>
                      )}

                      {/* Sub-status legend */}
                      <div className="mt-3 space-y-1.5 border-t border-border/40 pt-3">
                        {items.map((sub, i) => {
                          const pct = stageTotal > 0 ? Math.round((sub.count / stageTotal) * 100) : 0;
                          const dotColor = sub.count > 0 ? SUB_COLORS[i % SUB_COLORS.length] : "hsl(var(--muted-foreground))";
                          return (
                            <div key={sub.subStatus} className="flex items-center gap-2 min-w-0">
                              <div
                                className="h-2 w-2 flex-shrink-0 rounded-full"
                                style={{ background: dotColor, opacity: sub.count > 0 ? 1 : 0.25 }}
                              />
                              <span className={cn(
                                "flex-1 truncate text-[11px]",
                                sub.count > 0 ? "text-muted-foreground" : "text-muted-foreground/40"
                              )}>
                                {sub.label}
                              </span>
                              <span className={cn(
                                "text-[11px] font-bold tabular-nums",
                                sub.count > 0 ? "text-foreground" : "text-muted-foreground/30"
                              )}>
                                {sub.count}
                              </span>
                              {sub.count > 0 && (
                                <span className="w-8 text-right text-[10px] text-muted-foreground/60">
                                  {pct}%
                                </span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        )}

      </div>

      <ProductTour
        open={showHint}
        onClose={dismissHint}
        steps={[
          { target: '[data-tour="bt-dash-date-filter"]', title: "Date Filters", content: "Scope by Workload (all active cases), Today, Weekly, Monthly, or a custom date range.", side: "bottom" },
        ]}
      />
    </PageWrapper>
  );
}
