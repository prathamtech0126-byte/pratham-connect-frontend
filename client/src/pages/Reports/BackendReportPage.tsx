import { useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import {
  Globe,
  HeartHandshake,
  Plane,
  Wallet,
  TrendingUp,
  UsersRound,
  Sparkles,
  Clock,
  Users,
  CheckCircle2,
  IndianRupee,
  Banknote,
} from "lucide-react";
import {
  Bar,
  BarChart,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  Label,
  LabelList,
} from "recharts";
import { PageWrapper } from "@/layout/PageWrapper";
import type { BackendDashboardData } from "@/data/dummyBackendData";
import {
  ACCENT,
  Panel,
  RowList,
  resolvePeriodBounds,
  inr,
  pct,
  type Accent,
} from "@/pages/Dashboard/backendDashboardShared";
import { DashboardDateFilter } from "@/components/dashboard/DashboardDateFilter";
import { useBackendReport, useEnrollmentTrend } from "@/hooks/useVisaCases";
import type { EnrollmentTrendRange } from "@/api/visaCases.api";

/* ---------- KPI tile ---------- */

// Theme tokens only — label + icon on a top row, big black value below. Fixed
// alignment: the label stays on a single line so every value sits at the same height.
function StatTile({
  label,
  value,
  sub,
  icon: Icon,
}: {
  label: string;
  value: string;
  sub?: string;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <Card className="border border-border/60 shadow-sm transition-shadow hover:shadow-md">
      <CardContent className="p-5">
        <div className="flex items-center justify-between gap-2">
          <p className="truncate text-xs font-medium text-muted-foreground">{label}</p>
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Icon className="h-4 w-4" />
          </div>
        </div>
        <p className="mt-3 text-2xl font-bold tabular-nums tracking-tight text-foreground">{value}</p>
        {sub ? <p className="mt-1 truncate text-[11px] text-muted-foreground">{sub}</p> : null}
      </CardContent>
    </Card>
  );
}

const EMPTY_DATA: BackendDashboardData = {
  totalClients: 0,
  approvalRate: null,
  outstandingBalance: 0,
  caseOutcomes: {
    totalEnrolled: 0,
    approved: 0,
    refused: 0,
    withdrawn: 0,
    pending: 0,
    filesSubmitted: 0,
    approvalRate: null,
    refusalRate: null,
  },
  byDestination: [],
  bySponsor: [],
  byTravelReason: [],
  casesByStage: [],
  bySaleType: [],
  financial: {
    totalCharges: 0,
    initialReceived: 0,
    beforeVisaCharges: 0,
    financeCharges: 0,
    totalBalanceDue: 0,
    collectionPct: null,
    avgChargePerClient: 0,
    clientsFullyPaid: 0,
    clientsWithBalance: 0,
  },
  processingTimes: {
    enrollmentToSubmission: null,
    submissionToDecision: null,
    enrollmentToDecision: null,
  },
  accompanying: { totalMembers: 0, avgPerCase: null, casesWithAccompanying: 0 },
  highlights: { topDestination: "—", topTravelReason: "—", topSponsorType: "—" },
  decisionByDestination: [],
  enrollmentTrend: [],
};

const EMPTY_TOTALS = { approved: 0, refused: 0, withdrawn: 0, pending: 0, total: 0 };

const PIE_COLORS = [
  "#22c55e", "#f59e0b", "#f97316", "#a855f7",
  "#06b6d4", "#ef4444", "#9ca3af", "#3b82f6",
];

const SPONSOR_COLORS = [
  "#6366f1", "#ec4899", "#14b8a6", "#f97316",
  "#84cc16", "#8b5cf6", "#0ea5e9", "#f43f5e",
];

function SponsorGridPanel({
  title,
  subtitle,
  icon: Icon,
  rows,
}: {
  title: string;
  subtitle: string;
  icon: React.ComponentType<{ className?: string }>;
  rows: { name: string; count: number }[];
}) {
  const total = rows.reduce((sum, r) => sum + r.count, 0);
  const sorted = [...rows].sort((a, b) => b.count - a.count);

  return (
    <Card className="border border-border/60 shadow-sm">
      <CardContent className="p-5">
        <div className="mb-1 flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Icon className="h-4 w-4" />
            </div>
            <h3 className="text-sm font-semibold text-foreground">{title}</h3>
          </div>
          <div className="shrink-0 text-right">
            <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Total Cases</p>
            <p className="text-xl font-bold tabular-nums leading-none text-primary">{total}</p>
          </div>
        </div>
        <p className="mb-4 ml-10 text-xs text-muted-foreground">{subtitle}</p>
        {sorted.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">No data for this period.</p>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            {sorted.map((r, i) => {
              const color = SPONSOR_COLORS[i % SPONSOR_COLORS.length];
              const pct = total > 0 ? Math.round((r.count / total) * 100) : 0;
              return (
                <div
                  key={r.name}
                  className="flex items-center gap-2.5 rounded-xl border border-border/50 bg-muted/20 px-3 py-2.5 transition-colors hover:bg-accent/40"
                >
                  <span
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white"
                    style={{ background: color }}
                  >
                    {r.name.charAt(0)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-medium text-foreground">{r.name}</p>
                    <p className="text-[11px] text-muted-foreground">{pct}% of total</p>
                  </div>
                  <span className="text-lg font-bold tabular-nums" style={{ color }}>{r.count}</span>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function HorizontalBarPanel({
  title,
  subtitle,
  icon: Icon,
  rows,
  barColor,
}: {
  title: string;
  subtitle: string;
  icon: React.ComponentType<{ className?: string }>;
  rows: { name: string; count: number }[];
  barColor: string;
}) {
  const total = rows.reduce((sum, r) => sum + r.count, 0);
  const sorted = [...rows].sort((a, b) => b.count - a.count);
  const chartH = Math.max(sorted.length * 44, 160);
  return (
    <Card className="border border-border/60 shadow-sm">
      <CardContent className="p-5">
        <div className="mb-1 flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Icon className="h-4 w-4" />
            </div>
            <h3 className="text-sm font-semibold text-foreground">{title}</h3>
          </div>
          <div className="shrink-0 text-right">
            <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Total Cases</p>
            <p className="text-xl font-bold tabular-nums leading-none" style={{ color: barColor }}>{total}</p>
          </div>
        </div>
        <p className="mb-3 ml-10 text-xs text-muted-foreground">{subtitle}</p>
        {sorted.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">No data for this period.</p>
        ) : (
          <div style={{ height: chartH }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={sorted}
                layout="vertical"
                margin={{ left: 4, right: 36, top: 4, bottom: 28 }}
              >
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="hsl(var(--border))" opacity={0.5} />
                <XAxis
                  type="number"
                  tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                  allowDecimals={false}
                  axisLine={false}
                  tickLine={false}
                  label={{
                    value: "Number of Cases",
                    position: "insideBottom",
                    offset: -14,
                    fontSize: 11,
                    fill: "hsl(var(--muted-foreground))",
                  }}
                />
                <YAxis
                  type="category"
                  dataKey="name"
                  tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                  width={80}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  cursor={{ fill: "hsl(var(--muted))", opacity: 0.3 }}
                  contentStyle={{
                    borderRadius: 8,
                    border: "1px solid hsl(var(--border))",
                    background: "hsl(var(--card))",
                    fontSize: 12,
                  }}
                />
                <Bar dataKey="count" radius={[0, 4, 4, 0]} fill={barColor} maxBarSize={20}>
                  <LabelList
                    dataKey="count"
                    position="right"
                    style={{ fontSize: 12, fontWeight: 600, fill: "hsl(var(--foreground))" }}
                  />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function PieBreakdownPanel({
  title,
  subtitle,
  icon: Icon,
  rows,
}: {
  title: string;
  subtitle: string;
  icon: React.ComponentType<{ className?: string }>;
  rows: { name: string; count: number }[];
}) {
  const total = rows.reduce((sum, r) => sum + r.count, 0);
  const chartData = rows.map((r, i) => ({
    name: r.name,
    value: r.count,
    color: PIE_COLORS[i % PIE_COLORS.length],
    pct: total > 0 ? Math.round((r.count / total) * 100) : 0,
  }));

  const renderPctLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, pct }: any) => {
    if (pct < 5) return null;
    const RADIAN = Math.PI / 180;
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);
    return (
      <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" fontSize={11} fontWeight={600}>
        {`${pct}%`}
      </text>
    );
  };

  return (
    <Card className="border border-border/60 shadow-sm">
      <CardContent className="p-5">
        <div className="mb-1 flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Icon className="h-4 w-4" />
            </div>
            <h3 className="text-sm font-semibold text-foreground">{title}</h3>
          </div>
          <div className="shrink-0 text-right">
            <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Total Cases</p>
            <p className="text-xl font-bold tabular-nums leading-none text-primary">{total}</p>
          </div>
        </div>
        <p className="mb-2 ml-10 text-xs text-muted-foreground">{subtitle}</p>
        {rows.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">No data for this period.</p>
        ) : (
          <>
            <div className="h-44">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={chartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={52}
                    outerRadius={80}
                    paddingAngle={1}
                    dataKey="value"
                    labelLine={false}
                    label={renderPctLabel}
                  >
                    {chartData.map((d, i) => (
                      <Cell key={i} fill={d.color} />
                    ))}
                    <Label
                      content={({ viewBox }: any) => {
                        const { cx, cy } = viewBox;
                        return (
                          <g>
                            <text x={cx} y={cy - 8} textAnchor="middle" dominantBaseline="middle" style={{ fontSize: 22, fontWeight: 700, fill: "hsl(var(--foreground))" }}>
                              {total}
                            </text>
                            <text x={cx} y={cy + 12} textAnchor="middle" dominantBaseline="middle" style={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}>
                              Total Cases
                            </text>
                          </g>
                        );
                      }}
                    />
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      borderRadius: 8,
                      border: "1px solid hsl(var(--border))",
                      background: "hsl(var(--card))",
                      fontSize: 12,
                    }}
                    formatter={(value: number, name: string) => [
                      `${value} (${total > 0 ? Math.round((value / total) * 100) : 0}%)`,
                      name,
                    ]}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1.5">
              {chartData.map((d) => (
                <div key={d.name} className="flex items-center gap-1.5 text-[11px]">
                  <span className="h-2.5 w-2.5 shrink-0 rounded-sm" style={{ background: d.color }} />
                  <span className="truncate text-muted-foreground">{d.name}</span>
                  <span className="ml-auto shrink-0 font-semibold tabular-nums text-foreground">
                    {d.value} ({d.pct}%)
                  </span>
                </div>
              ))}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

/**
 * Backend / Visa Case Report — analytical companion to the Backend Dashboard.
 *
 * Built for admins & backend managers: a headline KPI strip up top, then the
 * deep-dive sections — financial summary, enrollment trend, quick highlights,
 * market-mix breakdowns, decision cross-tab, accompanying members, and
 * processing-time SLAs. Has its own period selector; the enrollment trend has a
 * separate range selector independent of that filter.
 */
type SaleTypeFilter = "all" | "visitor" | "spouse" | "student";


export default function BackendReportPage() {
  const [timeFilter, setTimeFilter] = useState("monthly");
  const [customDateRange, setCustomDateRange] = useState<[Date | null, Date | null]>([null, null]);
  const [trendRange, setTrendRange] = useState<"12m" | "6m" | "4m" | "year">("12m");
  const [saleType, setSaleType] = useState<SaleTypeFilter>("all");

  const normalizedFilter = (timeFilter || "monthly").toLowerCase() as
    | "today"
    | "weekly"
    | "monthly"
    | "custom";

  const { from, to } = useMemo(
    () => resolvePeriodBounds(timeFilter, customDateRange),
    [timeFilter, customDateRange]
  );

  const { data: apiResult, isLoading } = useBackendReport(
    {
      filter: normalizedFilter,
      fromDate: normalizedFilter === "custom" ? (from ?? undefined) : undefined,
      toDate: normalizedFilter === "custom" ? (to ?? undefined) : undefined,
      category: saleType === "all" ? undefined : saleType,
    },
    normalizedFilter !== "custom" || (!!from && !!to)
  );

  const data = apiResult?.data ?? EMPTY_DATA;
  const decisionTotals = apiResult?.decisionTotals ?? EMPTY_TOTALS;

  // Map UI range selector → API range param. "4m" and "year" use a larger API
  // bucket then slice/filter client-side since the API has no 4-month range.
  const apiTrendRange: EnrollmentTrendRange =
    trendRange === "6m" || trendRange === "4m" ? "6_month" : "12_month";

  const { data: trendResult } = useEnrollmentTrend(apiTrendRange);
  const fullTrend = trendResult?.enrollmentTrend ?? [];

  const trend = useMemo(() => {
    if (trendRange === "4m") return fullTrend.slice(-4);
    if (trendRange === "year") {
      const yr = String(new Date().getFullYear());
      return fullTrend.filter((t) => t.month.endsWith(yr));
    }
    return fullTrend;
  }, [fullTrend, trendRange]);

  const f = data.financial;
  const co = data.caseOutcomes;
  const decided = co.approved + co.refused;

  const kpis: { label: string; value: string; sub?: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { label: "Total Cases", value: String(data.totalClients), sub: "Enrolled visa cases", icon: Users },
    { label: "Approval Rate", value: pct(data.approvalRate), sub: `${co.approved} of ${decided} decided`, icon: CheckCircle2 },
    { label: "Total Charges", value: inr(f.totalCharges), sub: "Billed across cases", icon: Wallet },
    { label: "Outstanding", value: inr(data.outstandingBalance), sub: `${f.clientsWithBalance} clients with balance`, icon: IndianRupee },
    { label: "Collection Rate", value: pct(f.collectionPct), sub: "Of total charges", icon: Banknote },
    {
      label: "Avg Decision Days",
      value: data.processingTimes.enrollmentToDecision == null ? "—" : String(data.processingTimes.enrollmentToDecision),
      sub: "Enrollment → decision",
      icon: Clock,
    },
  ];

  const activeTab =
    timeFilter === "today" ? "Today"
    : timeFilter === "weekly" ? "Weekly"
    : timeFilter === "monthly" ? "Monthly"
    : timeFilter === "custom" || timeFilter === "maximum" ? "Custom"
    : "Monthly";

  const actionsBar = (
    <div className="flex flex-wrap items-center gap-3">
      {/* Sale type filter */}
      <Select value={saleType} onValueChange={(v) => setSaleType(v as SaleTypeFilter)}>
        <SelectTrigger className="h-9 w-[130px] text-sm font-medium bg-muted/50 border-border/50 rounded-lg">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Types</SelectItem>
          <SelectItem value="visitor">Visitor</SelectItem>
          <SelectItem value="spouse">Spouse</SelectItem>
          <SelectItem value="student">Student</SelectItem>
        </SelectContent>
      </Select>
      <DashboardDateFilter
        date={customDateRange}
        onDateChange={setCustomDateRange}
        activeTab={activeTab}
        onTabChange={(tab) => setTimeFilter(tab === "Today" ? "today" : tab === "Custom" ? "custom" : tab.toLowerCase())}
        showYearly={false}
        align="end"
      />
    </div>
  );

  if (isLoading) {
    return (
      <PageWrapper
        title="Backend Report"
        breadcrumbs={[{ label: "Reports" }, { label: "Backend Report" }]}
        actions={actionsBar}
      >
        <div className="flex flex-col gap-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-28 rounded-xl" />
            ))}
          </div>
          <div className="grid gap-4 lg:grid-cols-3">
            <Skeleton className="h-72 rounded-xl" />
            <Skeleton className="h-72 rounded-xl lg:col-span-2" />
          </div>
          <Skeleton className="h-36 rounded-xl" />
          <div className="grid gap-4 lg:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-64 rounded-xl" />
            ))}
          </div>
        </div>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper
      title="Backend Report"
      breadcrumbs={[{ label: "Reports" }, { label: "Backend Report" }]}
      actions={actionsBar}
    >
      <div className="flex flex-col gap-6">
        {/* Headline KPIs */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          {kpis.map((k) => (
            <StatTile key={k.label} {...k} />
          ))}
        </div>

        {/* Money & Growth — Financial Summary + Enrollment Trend */}
        <div className="grid gap-4 lg:grid-cols-3">
          <Panel title="Financial Summary (INR)" icon={Wallet} accent="emerald">
            <RowList
              rows={[
                { name: "Total Charges", value: inr(f.totalCharges) },
                { name: "Initial Charges Received", value: inr(f.initialReceived) },
                { name: "Finance Charges", value: inr(f.financeCharges) },
                { name: "Total Balance Due", value: inr(f.totalBalanceDue), strong: true },
                { name: "Collection %", value: pct(f.collectionPct) },
                { name: "Avg Charge per Client", value: inr(f.avgChargePerClient) },
                { name: "Clients Fully Paid", value: String(f.clientsFullyPaid) },
                { name: "Clients with Balance Due", value: String(f.clientsWithBalance) },
              ]}
            />
          </Panel>

          <Card className="card-hover border-none shadow-card lg:col-span-2">
            <CardContent className="p-5">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className={cn("flex h-8 w-8 items-center justify-center rounded-lg", ACCENT.teal.chip)}>
                    <TrendingUp className="h-4 w-4" />
                  </div>
                  <h3 className="text-sm font-bold text-foreground">Enrollment Trend</h3>
                </div>
                <Select value={trendRange} onValueChange={(v) => setTrendRange(v as typeof trendRange)}>
                  <SelectTrigger className="h-8 w-[160px] text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="12m">Last 12 Months</SelectItem>
                    <SelectItem value="6m">Last 6 Months</SelectItem>
                    <SelectItem value="4m">Last Quarter (4M)</SelectItem>
                    <SelectItem value="year">This Year</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={trend} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" vertical={false} />
                    <XAxis
                      dataKey="month"
                      tick={{ fontSize: 10 }}
                      interval={0}
                      angle={-45}
                      textAnchor="end"
                      height={50}
                      tickFormatter={(v: string) => v.split(" ")[0]}
                    />
                    <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                    <Tooltip
                      cursor={{ fill: "hsl(var(--muted))", opacity: 0.4 }}
                      contentStyle={{ borderRadius: 12, border: "1px solid hsl(var(--border))", background: "hsl(var(--card))" }}
                    />
                    <Bar dataKey="enrollments" radius={[6, 6, 0, 0]}>
                      {trend.map((_, i) => (
                        <Cell key={i} fill="hsl(var(--primary))" />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Highlights — top destination / travel reason / sponsor */}
        <Card className="card-hover border-none shadow-card bg-card">
          <CardContent className="p-5">
            <div className="mb-4 flex items-center gap-2.5">
              <div className={cn("flex h-8 w-8 items-center justify-center rounded-lg", ACCENT.amber.chip)}>
                <Sparkles className="h-4 w-4" />
              </div>
              <h3 className="text-sm font-bold text-foreground">Quick Highlights</h3>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              {[
                { label: "Top Destination", value: data.highlights.topDestination, icon: Globe, accent: "blue" as Accent },
                { label: "Top Travel Reason", value: data.highlights.topTravelReason, icon: Plane, accent: "teal" as Accent },
                { label: "Top Sponsor Type", value: data.highlights.topSponsorType, icon: HeartHandshake, accent: "purple" as Accent },
              ].map((h) => {
                const a = ACCENT[h.accent];
                const Icon = h.icon;
                return (
                  <div key={h.label} className="flex items-center gap-3 rounded-xl border border-border/50 bg-card p-3">
                    <div className={cn("flex h-9 w-9 items-center justify-center rounded-lg", a.chip)}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs text-muted-foreground">{h.label}</p>
                      <p className="truncate text-base font-bold text-foreground">{h.value}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Market mix — where the business comes from */}
        <div className="grid gap-4 lg:grid-cols-3">
          <HorizontalBarPanel
            title="By Destination Country"
            subtitle="Total cases by destination country"
            icon={Globe}
            rows={data.byDestination}
            barColor="#3b82f6"
          />
          <PieBreakdownPanel
            title="By Reason of Travel"
            subtitle="Total cases by reason of travel"
            icon={Plane}
            rows={data.byTravelReason}
          />
          <SponsorGridPanel
            title="By Sponsor Relationship"
            subtitle="Total cases by sponsor relationship"
            icon={HeartHandshake}
            rows={data.bySponsor}
          />
        </div>

        {/* Operational details — Decision table + Accompanying */}
        <div className="grid gap-4 lg:grid-cols-3">
          <Card className="card-hover border-none shadow-card lg:col-span-2">
            <CardContent className="p-5">
              <div className="mb-4 flex items-center gap-2.5">
                <div className={cn("flex h-8 w-8 items-center justify-center rounded-lg", ACCENT.blue.chip)}>
                  <Globe className="h-4 w-4" />
                </div>
                <h3 className="text-sm font-bold text-foreground">Decision by Destination</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/40 text-left text-xs uppercase text-muted-foreground">
                      <th className="rounded-l-lg py-2.5 pl-3 pr-4 font-semibold">Destination</th>
                      <th className="px-3 py-2.5 text-center font-semibold">Approved</th>
                      <th className="px-3 py-2.5 text-center font-semibold">Refused</th>
                      <th className="px-3 py-2.5 text-center font-semibold">Withdrawn</th>
                      <th className="px-3 py-2.5 text-center font-semibold">Pending</th>
                      <th className="rounded-r-lg py-2.5 pl-3 pr-3 text-center font-semibold">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.decisionByDestination.map((d) => (
                      <tr key={d.name} className="border-b border-border/50 transition-colors hover:bg-accent/40">
                        <td className="py-2.5 pl-3 pr-4 font-medium text-foreground">{d.name}</td>
                        <td className="px-3 py-2.5 text-center tabular-nums text-muted-foreground">{d.approved}</td>
                        <td className="px-3 py-2.5 text-center tabular-nums text-muted-foreground">{d.refused}</td>
                        <td className="px-3 py-2.5 text-center tabular-nums text-muted-foreground">{d.withdrawn}</td>
                        <td className="px-3 py-2.5 text-center tabular-nums text-muted-foreground">{d.pending}</td>
                        <td className="py-2.5 pl-3 pr-3 text-center">
                          <Badge variant="secondary" className="tabular-nums">{d.total}</Badge>
                        </td>
                      </tr>
                    ))}
                    <tr className="font-bold">
                      <td className="py-2.5 pl-3 pr-4 text-foreground">Total</td>
                      <td className="px-3 py-2.5 text-center tabular-nums">{decisionTotals.approved}</td>
                      <td className="px-3 py-2.5 text-center tabular-nums">{decisionTotals.refused}</td>
                      <td className="px-3 py-2.5 text-center tabular-nums">{decisionTotals.withdrawn}</td>
                      <td className="px-3 py-2.5 text-center tabular-nums">{decisionTotals.pending}</td>
                      <td className="py-2.5 pl-3 pr-3 text-center tabular-nums">{decisionTotals.total}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          <Panel title="Accompanying Members" icon={UsersRound} accent="rose">
            <RowList
              rows={[
                { name: "Total Accompanying Members", value: String(data.accompanying.totalMembers) },
                { name: "Avg Members per Case", value: data.accompanying.avgPerCase == null ? "—" : data.accompanying.avgPerCase.toFixed(1) },
                { name: "Cases with Accompanying", value: String(data.accompanying.casesWithAccompanying) },
              ]}
            />
          </Panel>
        </div>

        {/* Processing Times — SLA health */}
        <Panel title="Processing Times (Avg Days)" icon={Clock} accent="amber">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {[
              { name: "Enrollment to Submission", value: data.processingTimes.enrollmentToSubmission },
              { name: "Submission to Decision", value: data.processingTimes.submissionToDecision },
              { name: "Enrollment to Decision", value: data.processingTimes.enrollmentToDecision },
            ].map((m) => (
              <div key={m.name} className="rounded-xl border border-border/50 bg-muted/30 p-4 text-center">
                <p className="text-3xl font-bold tabular-nums text-foreground">{m.value == null ? "—" : m.value}</p>
                <p className="mt-1 text-xs font-medium text-muted-foreground">{m.name}</p>
              </div>
            ))}
          </div>
        </Panel>
      </div>
    </PageWrapper>
  );
}
