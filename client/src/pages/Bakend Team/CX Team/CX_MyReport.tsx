import { useState } from "react";
import { PageWrapper } from "@/layout/PageWrapper";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  BarChart, Bar, ResponsiveContainer, XAxis, YAxis, CartesianGrid, Tooltip,
} from "recharts";
import { TrendingUp, TrendingDown, CheckCircle2, FileText, AlertTriangle, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { usePageHint } from "@/hooks/usePageHint";
import { ProductTour } from "@/components/ProductTour";

// ── Types & mock data ──────────────────────────────────────────────────────────

type Period = "today" | "this_week" | "this_month";

interface KPI { tasks: number; tasksDelta: number; docs: number; docsPending: number; slaWarnings: number; slaBreaches: number; rate: number; rateDelta: number; }

const KPI: Record<Period, KPI> = {
  today:      { tasks: 12,  tasksDelta: 2,  docs: 8,   docsPending: 3,  slaWarnings: 1, slaBreaches: 0, rate: 80, rateDelta:  5 },
  this_week:  { tasks: 52,  tasksDelta: 8,  docs: 34,  docsPending: 6,  slaWarnings: 3, slaBreaches: 1, rate: 87, rateDelta:  3 },
  this_month: { tasks: 178, tasksDelta: 22, docs: 140, docsPending: 12, slaWarnings: 8, slaBreaches: 3, rate: 91, rateDelta:  7 },
};

const CHART: Record<Period, { label: string; completed: number; overdue: number }[]> = {
  today: [
    { label: "9 AM",  completed: 2, overdue: 0 },
    { label: "10 AM", completed: 3, overdue: 1 },
    { label: "11 AM", completed: 4, overdue: 0 },
    { label: "12 PM", completed: 5, overdue: 0 },
    { label: "2 PM",  completed: 3, overdue: 1 },
    { label: "3 PM",  completed: 2, overdue: 0 },
  ],
  this_week: [
    { label: "Mon", completed: 8,  overdue: 1 },
    { label: "Tue", completed: 10, overdue: 2 },
    { label: "Wed", completed: 7,  overdue: 3 },
    { label: "Thu", completed: 13, overdue: 1 },
    { label: "Fri", completed: 9,  overdue: 2 },
    { label: "Sat", completed: 4,  overdue: 0 },
    { label: "Sun", completed: 1,  overdue: 0 },
  ],
  this_month: [
    { label: "Week 1", completed: 42, overdue: 5 },
    { label: "Week 2", completed: 38, overdue: 3 },
    { label: "Week 3", completed: 45, overdue: 6 },
    { label: "Week 4", completed: 52, overdue: 4 },
  ],
};

const STAGES = [
  { stage: "Documentation", count: 6 },
  { stage: "Backend Ops",   count: 4 },
  { stage: "Binding",       count: 3 },
  { stage: "Application",   count: 2 },
  { stage: "Visa Filing",   count: 3 },
  { stage: "Visa Result",   count: 1 },
  { stage: "Post Visa",     count: 1 },
];

const REJECTION_REASONS = [
  { reason: "Blurry scan",       count: 4 },
  { reason: "Expired document",  count: 2 },
  { reason: "Wrong format",      count: 2 },
  { reason: "Missing page",      count: 1 },
];

// ── Delta chip ─────────────────────────────────────────────────────────────────

function Delta({ value, suffix = "" }: { value: number; suffix?: string }) {
  const pos = value >= 0;
  return (
    <span className={cn("flex items-center gap-0.5 text-xs font-medium", pos ? "text-green-600" : "text-red-500")}>
      {pos ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
      {pos ? "+" : ""}{value}{suffix} vs last period
    </span>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────────

export default function CxMyReport() {
  const { showHint, dismissHint } = usePageHint("cx_my_report");
  const [period, setPeriod] = useState<Period>("this_week");

  const kpi      = KPI[period];
  const chart    = CHART[period];
  const maxStage = Math.max(...STAGES.map(s => s.count));
  const maxRej   = Math.max(...REJECTION_REASONS.map(r => r.count));

  const today = new Date().toLocaleDateString("en-IN", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  });

  const periodLabel = period === "today" ? "Today" : period === "this_week" ? "This week" : "This month";

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
            <SelectItem value="this_week">This week</SelectItem>
            <SelectItem value="this_month">This month</SelectItem>
          </SelectContent>
        </Select>
      }
    >
      <div className="space-y-6">

        {/* Date subtitle */}
        <p className="text-sm text-muted-foreground -mt-3">{today}</p>

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
                <p className="text-3xl font-bold text-foreground">{kpi.tasks}</p>
                <p className="text-sm text-muted-foreground mt-0.5">Tasks completed</p>
                <div className="mt-2"><Delta value={kpi.tasksDelta} /></div>
              </CardContent>
            </Card>

            {/* Docs reviewed */}
            <Card className="bg-card border-border shadow-sm">
              <CardContent className="pt-5 pb-4">
                <div className="flex items-start justify-between mb-1">
                  <FileText className="h-4 w-4 text-teal-500 mt-0.5" />
                </div>
                <p className="text-3xl font-bold text-foreground">{kpi.docs}</p>
                <p className="text-sm text-muted-foreground mt-0.5">Docs reviewed</p>
                <p className="text-xs text-muted-foreground mt-2">{kpi.docsPending} pending</p>
              </CardContent>
            </Card>

            {/* TAT warnings */}
            <Card className={cn("border shadow-sm", kpi.slaBreaches > 0 ? "border-red-200 dark:border-red-900 bg-red-50/40 dark:bg-red-950/10" : "bg-card border-border")}>
              <CardContent className="pt-5 pb-4">
                <div className="flex items-start justify-between mb-1">
                  <AlertTriangle className="h-4 w-4 text-orange-500 mt-0.5" />
                </div>
                <p className="text-3xl font-bold text-foreground">{kpi.slaWarnings}</p>
                <p className="text-sm text-muted-foreground mt-0.5">TAT warnings</p>
                {kpi.slaBreaches > 0 && (
                  <p className="text-xs text-red-600 font-medium mt-2">{kpi.slaBreaches} breach</p>
                )}
              </CardContent>
            </Card>

            {/* Completion rate */}
            <Card className="bg-card border-border shadow-sm">
              <CardContent className="pt-5 pb-4">
                <div className="flex items-start justify-between mb-1">
                  <Clock className="h-4 w-4 text-indigo-500 mt-0.5" />
                </div>
                <p className="text-3xl font-bold text-foreground">{kpi.rate}%</p>
                <p className="text-sm text-muted-foreground mt-0.5">Completion rate</p>
                <div className="mt-2"><Delta value={kpi.rateDelta} suffix="%" /></div>
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
                <p className="text-xs text-muted-foreground mt-0.5">Tasks completed per {period === "this_month" ? "week" : "day"} — {periodLabel}</p>
              </div>
              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-primary inline-block" />Completed</span>
                <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-red-400 inline-block" />Overdue</span>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={chart} barSize={12} barCategoryGap="35%">
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
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
                <span>20 clients</span>
              </div>

              {[
                { label: "Green — safe",      count: 14, bar: "bg-green-500",  text: "text-green-600" },
                { label: "Orange — warning",  count: 4,  bar: "bg-orange-400", text: "text-orange-600" },
                { label: "Red — breach",      count: 2,  bar: "bg-red-500",    text: "text-red-600" },
              ].map(row => (
                <div key={row.label} className="flex items-center gap-3">
                  <span className="text-sm text-muted-foreground w-36 flex-shrink-0">{row.label}</span>
                  <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className={cn("h-2 rounded-full", row.bar)}
                      style={{ width: `${(row.count / 20) * 100}%` }}
                    />
                  </div>
                  <span className={cn("text-sm font-semibold w-5 text-right", row.text)}>{row.count}</span>
                </div>
              ))}

              <div className="grid grid-cols-2 gap-3 pt-3 border-t border-border">
                <div className="bg-muted/40 rounded-lg px-4 py-3">
                  <p className="text-2xl font-bold text-red-600">2</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Escalated</p>
                </div>
                <div className="bg-muted/40 rounded-lg px-4 py-3">
                  <p className="text-2xl font-bold text-green-600">14</p>
                  <p className="text-xs text-muted-foreground mt-0.5">On track</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Client Stage Progress */}
          <Card className="bg-card border-border shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Client Stage Progress</CardTitle>
              <p className="text-xs text-muted-foreground">Clients per lifecycle stage</p>
            </CardHeader>
            <CardContent className="space-y-3">
              {STAGES.map(({ stage, count }) => (
                <div key={stage} className="flex items-center gap-3">
                  <span className="text-xs text-muted-foreground w-28 flex-shrink-0">{stage}</span>
                  <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-2 rounded-full bg-primary"
                      style={{ width: `${(count / maxStage) * 100}%` }}
                    />
                  </div>
                  <span className="text-xs font-semibold text-foreground w-4 text-right">{count}</span>
                </div>
              ))}
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
                {[
                  { label: "Approved",           count: 28, cls: "bg-green-100 text-green-700 border-green-200" },
                  { label: "Rejected",           count: 6,  cls: "bg-red-100 text-red-700 border-red-200" },
                  { label: "Pending review",     count: 9,  cls: "bg-yellow-100 text-yellow-700 border-yellow-200" },
                  { label: "Reupload requested", count: 4,  cls: "bg-orange-100 text-orange-700 border-orange-200" },
                ].map(row => (
                  <div key={row.label} className="flex items-center justify-between">
                    <span className={cn("text-xs font-medium px-2 py-0.5 rounded-full border", row.cls)}>
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
                  <p className="text-4xl font-bold text-green-600">60%</p>
                  <p className="text-xs text-muted-foreground mt-1">Approval rate this period</p>
                </div>
                <div className="pt-3 border-t border-border">
                  <p className="text-xs text-muted-foreground">Avg turnaround</p>
                  <p className="text-2xl font-bold text-foreground mt-0.5">2.4 hrs</p>
                </div>
              </CardContent>
            </Card>

            {/* Common rejection reasons */}
            <Card className="bg-card border-border shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Common rejection reasons</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {REJECTION_REASONS.map(({ reason, count }) => (
                  <div key={reason} className="flex items-center gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-0.5">
                        <span className="text-xs text-muted-foreground truncate">{reason}</span>
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
