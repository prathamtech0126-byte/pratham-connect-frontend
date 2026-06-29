import { useState } from "react";
import { PageWrapper } from "@/layout/PageWrapper";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid,
  PieChart, Pie, Cell,
} from "recharts";
import {
  Clock, CheckCircle2, AlertTriangle,
  TrendingUp, TrendingDown, Loader2, ArrowDownToLine,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { usePageHint } from "@/hooks/usePageHint";
import { ProductTour } from "@/components/ProductTour";
import { useBindingReport } from "@/hooks/useBindingReport";
import type { BindingReportFilters } from "@/api/bindingReport.api";

type Period = "today" | "weekly" | "monthly";

const VISA_COLOR_MAP: Record<string, string> = {
  grey:   "#94a3b8",
  blue:   "#60a5fa",
  yellow: "#fbbf24",
  purple: "#a78bfa",
  green:  "#34d399",
  red:    "#f87171",
};

function Delta({ direction, label }: { direction: "up" | "down" | "flat"; label: string }) {
  if (direction === "flat") return <span className="text-xs text-muted-foreground">{label}</span>;
  const pos = direction === "up";
  return (
    <span className={cn("flex items-center gap-0.5 text-xs font-medium", pos ? "text-green-600" : "text-red-500")}>
      {pos ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
      {label}
    </span>
  );
}

export default function BtMyReport() {
  const { showHint, dismissHint } = usePageHint("bt_my_report");
  const [period, setPeriod] = useState<Period>("monthly");

  const filters: BindingReportFilters = { filter: period };
  const { data, isLoading, isError } = useBindingReport(filters);

  const today = new Date().toLocaleDateString("en-IN", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  });

  const ps = data?.performanceSummary;
  const boundVsBlocked = data?.filesBoundVsBlocked ?? [];
  const visaStatus = data?.visaApplicationStatus ?? [];
  const tatTrend = data?.tatHealthTrend ?? [];

  const visaPieData = visaStatus
    .filter(s => s.count > 0)
    .map(s => ({
      name: s.label,
      value: s.count,
      color: VISA_COLOR_MAP[s.color] ?? "#94a3b8",
    }));

  const docCompletenessValue = ps?.docCompletenessAtHandoff?.value ?? 0;
  const tatBreachDisplay = ps?.tatBreachRate?.display;
  const tatBreachValue = ps?.tatBreachRate?.value ?? 0;

  return (
    <PageWrapper
      title="My Report"
      breadcrumbs={[{ label: "Binding Team", href: "/binding/dashboard" }, { label: "My Report" }]}
      actions={
        <div data-tour="bt-report-period" className="flex gap-1.5">
          {(["today", "weekly", "monthly"] as const).map(p => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={cn(
                "px-3 py-1.5 text-sm rounded-md border transition-colors",
                period === p
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-card text-foreground border-border hover:bg-accent"
              )}
            >
              {p === "today" ? "Today" : p === "weekly" ? "This Week" : "This Month"}
            </button>
          ))}
        </div>
      }
    >
      <div className="space-y-6">

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
            {/* ── 1. KPI Cards ──────────────────────────────────────────── */}
            <div data-tour="bt-report-kpi" className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {/* Files Received from CX */}
              <Card className="bg-card border-border shadow-sm">
                <CardContent className="pt-5 pb-4 px-4">
                  <div className="flex items-start justify-between">
                    <div className="min-w-0 flex-1">
                      <p className="text-xs text-muted-foreground">Received from CX</p>
                      <p className="text-3xl font-bold text-foreground mt-1">{ps?.filesReceivedFromCx?.value ?? 0}</p>
                    </div>
                    <ArrowDownToLine className="h-7 w-7 text-violet-400 opacity-70 flex-shrink-0 ml-2" />
                  </div>
                </CardContent>
              </Card>

              {/* Avg Days in Binding */}
              <Card className="bg-card border-border shadow-sm">
                <CardContent className="pt-5 pb-4 px-4">
                  <div className="flex items-start justify-between">
                    <div className="min-w-0 flex-1">
                      <p className="text-xs text-muted-foreground">Avg. Days in Binding</p>
                      <p className="text-3xl font-bold text-foreground mt-1">
                        {ps?.avgDaysInBinding?.value != null ? ps.avgDaysInBinding.value : "—"}
                      </p>
                    </div>
                    <Clock className="h-7 w-7 text-blue-400 opacity-70 flex-shrink-0 ml-2" />
                  </div>
                </CardContent>
              </Card>

              {/* Doc Completeness */}
              <Card className="bg-card border-border shadow-sm">
                <CardContent className="pt-5 pb-4 px-4">
                  <div className="flex items-start justify-between">
                    <div className="min-w-0 flex-1">
                      <p className="text-xs text-muted-foreground">Doc Completeness at Handoff</p>
                      <p className="text-3xl font-bold text-foreground mt-1">
                        {ps?.docCompletenessAtHandoff?.display ?? "—"}
                      </p>
                      <div className="mt-2">
                        <Progress value={docCompletenessValue} className="h-1.5" />
                      </div>
                    </div>
                    <CheckCircle2 className="h-7 w-7 text-green-400 opacity-70 flex-shrink-0 ml-2" />
                  </div>
                </CardContent>
              </Card>

              {/* TAT Breach Rate — hidden for now (combined binding+application role; revisit when TAT logic is confirmed)
              <Card className={cn("border shadow-sm", tatBreachValue > 15 ? "border-red-200 dark:border-red-900 bg-red-50/40 dark:bg-red-950/10" : "bg-card border-border")}>
                <CardContent className="pt-5 pb-4 px-4">
                  <div className="flex items-start justify-between">
                    <div className="min-w-0 flex-1">
                      <p className="text-xs text-muted-foreground">TAT Breach Rate</p>
                      <p className={cn("text-3xl font-bold mt-1", tatBreachValue > 15 ? "text-red-600" : "text-orange-500")}>
                        {tatBreachDisplay ?? "—"}
                      </p>
                      <p className="text-[11px] text-muted-foreground mt-1">{ps?.tatBreachRate.subtitle ?? "of assigned clients"}</p>
                    </div>
                    <AlertTriangle className="h-7 w-7 text-orange-400 opacity-70 flex-shrink-0 ml-2" />
                  </div>
                </CardContent>
              </Card>
              */}
            </div>

            {/* ── 2. Bound vs Blocked + Visa Status ────────────────────── */}
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">

              <Card className="xl:col-span-2 bg-card border-border shadow-sm">
                <CardHeader>
                  <CardTitle className="text-base">Files Processed vs Blocked</CardTitle>
                  <CardDescription>
                    Breakdown by {period === "monthly" ? "week" : "day"}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={boundVsBlocked} barSize={12} barCategoryGap="30%">
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="dayLabel" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                      <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} />
                      <Bar dataKey="bound" name="Processed" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="blocked" name="Blocked" fill="#f87171" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                  <div className="flex items-center gap-5 mt-2 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-primary inline-block" />Processed</span>
                    <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-red-400 inline-block" />Blocked</span>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-card border-border shadow-sm">
                <CardHeader>
                  <CardTitle className="text-base">Visa Application Status</CardTitle>
                  <CardDescription>Across all assigned applications</CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col items-center">
                  <ResponsiveContainer width="100%" height={180}>
                    <PieChart>
                      <Pie
                        data={visaPieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={45}
                        outerRadius={70}
                        dataKey="value"
                        paddingAngle={2}
                      >
                        {visaPieData.map(entry => (
                          <Cell key={entry.name} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="grid grid-cols-2 gap-x-6 gap-y-1.5 mt-1 text-xs">
                    {visaPieData.map(s => (
                      <span key={s.name} className="flex items-center gap-1.5">
                        <span className="h-2 w-2 rounded-full inline-block flex-shrink-0" style={{ background: s.color }} />
                        {s.name} ({s.value})
                      </span>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* ── 3. TAT Health Trend — hidden for now (combined binding+application role; revisit when TAT logic is confirmed)
            <Card className="bg-card border-border shadow-sm">
              <CardHeader>
                <CardTitle className="text-base">TAT Health Trend</CardTitle>
                <CardDescription>On Track / Warning / Breach distribution over time</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={180}>
                  <BarChart data={tatTrend} barSize={12} barCategoryGap="25%">
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="dayLabel" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} />
                    <Bar dataKey="onTrack" name="On Track" stackId="sla" fill="#34d399" />
                    <Bar dataKey="warning" name="Warning" stackId="sla" fill="#fb923c" />
                    <Bar dataKey="breach" name="Breach" stackId="sla" fill="#f87171" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
                <div className="flex items-center gap-5 mt-2 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-green-400 inline-block" />On Track</span>
                  <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-orange-400 inline-block" />Warning</span>
                  <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-red-400 inline-block" />Breach</span>
                </div>
              </CardContent>
            </Card>
            */}
          </>
        )}

      </div>

      <ProductTour
        open={showHint}
        onClose={dismissHint}
        steps={[
          { target: '[data-tour="bt-report-period"]', title: "Period Selector", content: "Switch between Today, This Week, and This Month to see how your binding performance changes over different time frames.", side: "bottom" },
          { target: '[data-tour="bt-report-kpi"]', title: "KPI Cards", content: "Four cards show Files Processed, Average Days in Binding, Document Completeness at Handoff, and TAT Breach Rate — your core performance metrics.", side: "bottom" },
          { target: '[data-tour="bt-report-kpi"]', title: "Charts", content: "Scroll down to see binding trend charts, visa application status breakdown, and TAT health trend.", side: "top" },
        ]}
      />
    </PageWrapper>
  );
}
