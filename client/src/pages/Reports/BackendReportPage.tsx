import { useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
} from "recharts";
import { PageWrapper } from "@/layout/PageWrapper";
import {
  computeBackendDashboardData,
  DUMMY_BACKEND_CLIENTS,
} from "@/data/dummyBackendData";
import {
  ACCENT,
  Panel,
  BreakdownList,
  RowList,
  resolvePeriodBounds,
  inr,
  pct,
  type Accent,
} from "@/pages/Dashboard/backendDashboardShared";
import { DashboardDateFilter } from "@/components/dashboard/DashboardDateFilter";

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

/**
 * Backend / Visa Case Report — analytical companion to the Backend Dashboard.
 *
 * Built for admins & backend managers: a headline KPI strip up top, then the
 * deep-dive sections — financial summary, enrollment trend, quick highlights,
 * market-mix breakdowns, decision cross-tab, accompanying members, and
 * processing-time SLAs. Has its own period selector; the enrollment trend has a
 * separate range selector independent of that filter.
 */
export default function BackendReportPage() {
  const [timeFilter, setTimeFilter] = useState("monthly");
  const [customDateRange, setCustomDateRange] = useState<[Date | null, Date | null]>([null, null]);

  const periodClients = useMemo(() => {
    const { from, to } = resolvePeriodBounds(timeFilter, customDateRange);
    if (!from || !to) return DUMMY_BACKEND_CLIENTS;
    return DUMMY_BACKEND_CLIENTS.filter((c) => c.enrollmentDate >= from && c.enrollmentDate <= to);
  }, [timeFilter, customDateRange]);

  const data = useMemo(() => computeBackendDashboardData(periodClients), [periodClients]);
  // Enrollment Trend has its own range selector, independent of the page period filter.
  const fullTrend = useMemo(() => computeBackendDashboardData(DUMMY_BACKEND_CLIENTS).enrollmentTrend, []);
  const [trendRange, setTrendRange] = useState<"12m" | "6m" | "4m" | "year">("12m");
  // `fullTrend` is the last 12 months (oldest → newest), each labelled "MMM yyyy".
  const trend = useMemo(() => {
    if (trendRange === "6m") return fullTrend.slice(-6);
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

  return (
    <PageWrapper
      title="Backend Report"
      breadcrumbs={[{ label: "Reports" }, { label: "Backend Report" }]}
      actions={
        <DashboardDateFilter
          date={customDateRange}
          onDateChange={setCustomDateRange}
          activeTab={
            timeFilter === "today"
              ? "Today"
              : timeFilter === "weekly"
                ? "Weekly"
                : timeFilter === "monthly"
                  ? "Monthly"
                  : timeFilter === "custom" || timeFilter === "maximum"
                    ? "Custom"
                    : "Monthly"
          }
          onTabChange={(tab) => setTimeFilter(tab === "Today" ? "today" : tab === "Custom" ? "custom" : tab.toLowerCase())}
          showYearly={false}
          align="end"
        />
      }
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
          <Panel title="By Destination Country" icon={Globe} accent="blue">
            <BreakdownList rows={data.byDestination} accent="blue" />
          </Panel>
          <Panel title="By Reason of Travel" icon={Plane} accent="teal">
            <BreakdownList rows={data.byTravelReason} accent="teal" />
          </Panel>
          <Panel title="By Sponsor Relationship" icon={HeartHandshake} accent="purple">
            <BreakdownList rows={data.bySponsor} accent="purple" />
          </Panel>
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
                      <td className="px-3 py-2.5 text-center tabular-nums">{data.decisionByDestination.reduce((s, d) => s + d.approved, 0)}</td>
                      <td className="px-3 py-2.5 text-center tabular-nums">{data.decisionByDestination.reduce((s, d) => s + d.refused, 0)}</td>
                      <td className="px-3 py-2.5 text-center tabular-nums">{data.decisionByDestination.reduce((s, d) => s + d.withdrawn, 0)}</td>
                      <td className="px-3 py-2.5 text-center tabular-nums">{data.decisionByDestination.reduce((s, d) => s + d.pending, 0)}</td>
                      <td className="py-2.5 pl-3 pr-3 text-center tabular-nums">
                        {data.decisionByDestination.reduce((s, d) => s + d.total, 0)}
                      </td>
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
