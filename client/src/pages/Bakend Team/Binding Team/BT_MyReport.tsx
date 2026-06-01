import { useState } from "react";
import { PageWrapper } from "@/layout/PageWrapper";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid,
  PieChart, Pie, Cell, Legend,
} from "recharts";
import {
  PackageCheck, Clock, CheckCircle2, TrendingUp, AlertTriangle,
  Calendar, Users,
} from "lucide-react";
import { usePageHint } from "@/hooks/usePageHint";
import { ProductTour } from "@/components/ProductTour";

type Period = "today" | "week" | "month";

// ── Mock data per period ───────────────────────────────────────────────

const STATS: Record<Period, {
  filesBound: number; filesBoundDelta: number;
  avgDaysInBinding: number;
  docCompletenessRate: number;
  slaBreachRate: number;
}> = {
  today: { filesBound: 2, filesBoundDelta: 0, avgDaysInBinding: 5.8, docCompletenessRate: 91, slaBreachRate: 11 },
  week: { filesBound: 14, filesBoundDelta: 17, avgDaysInBinding: 6.2, docCompletenessRate: 88, slaBreachRate: 14 },
  month: { filesBound: 47, filesBoundDelta: 12, avgDaysInBinding: 6.8, docCompletenessRate: 85, slaBreachRate: 17 },
};

const BINDING_TREND: Record<Period, { label: string; bound: number; blocked: number }[]> = {
  today: [
    { label: "9am", bound: 0, blocked: 1 },
    { label: "11am", bound: 1, blocked: 0 },
    { label: "1pm", bound: 0, blocked: 1 },
    { label: "3pm", bound: 1, blocked: 0 },
    { label: "5pm", bound: 0, blocked: 0 },
  ],
  week: [
    { label: "Mon", bound: 3, blocked: 1 },
    { label: "Tue", bound: 2, blocked: 2 },
    { label: "Wed", bound: 4, blocked: 0 },
    { label: "Thu", bound: 2, blocked: 1 },
    { label: "Fri", bound: 3, blocked: 1 },
  ],
  month: [
    { label: "W1", bound: 10, blocked: 3 },
    { label: "W2", bound: 12, blocked: 2 },
    { label: "W3", bound: 14, blocked: 1 },
    { label: "W4", bound: 11, blocked: 3 },
  ],
};

const TAT_TREND: Record<Period, { label: string; green: number; orange: number; red: number }[]> = {
  today: [
    { label: "9am", green: 14, orange: 2, red: 2 },
    { label: "11am", green: 15, orange: 2, red: 1 },
    { label: "3pm", green: 16, orange: 1, red: 1 },
  ],
  week: [
    { label: "Mon", green: 12, orange: 4, red: 2 },
    { label: "Tue", green: 13, orange: 3, red: 2 },
    { label: "Wed", green: 15, orange: 2, red: 1 },
    { label: "Thu", green: 14, orange: 3, red: 1 },
    { label: "Fri", green: 14, orange: 3, red: 1 },
  ],
  month: [
    { label: "W1", green: 10, orange: 5, red: 3 },
    { label: "W2", green: 13, orange: 4, red: 2 },
    { label: "W3", green: 15, orange: 2, red: 1 },
    { label: "W4", green: 14, orange: 3, red: 1 },
  ],
};

const VISA_STATUS_PIE = [
  { name: "Pending", value: 4, color: "#94a3b8" },
  { name: "Submitted", value: 6, color: "#60a5fa" },
  { name: "Biometrics", value: 3, color: "#fbbf24" },
  { name: "Interview", value: 2, color: "#a78bfa" },
  { name: "Approved", value: 8, color: "#34d399" },
  { name: "Rejected", value: 1, color: "#f87171" },
];

const UPCOMING_APPOINTMENTS = [
  { client: "Sidikaben Vahora", code: "PC-2024-0002", event: "Biometrics", date: "2024-06-20", daysAway: 6 },
  { client: "Meenalben Manishgar", code: "PC-2024-0004", event: "Interview", date: "2024-06-25", daysAway: 11 },
  { client: "Hemali Kanjaria", code: "PC-2024-0001", event: "Biometrics", date: "2024-07-10", daysAway: 26 },
  { client: "Trushaben Patel", code: "PC-2024-0003", event: "Biometrics", date: "2024-07-02", daysAway: 18 },
];

const ON_HOLD_CLIENTS = [
  { name: "Meenalben Manishgar", code: "PC-2024-0004", reason: "Waiting for academic transcripts", daysOnHold: 4 },
];

export default function BtMyReport() {
  const { showHint, dismissHint } = usePageHint("bt_my_report");
  const [period, setPeriod] = useState<Period>("week");
  const stats = STATS[period];

  return (
    <PageWrapper
      title="My Report"
      breadcrumbs={[{ label: "Binding Team", href: "/binding/dashboard" }, { label: "My Report" }]}
      actions={
        <div data-tour="bt-report-period" className="flex gap-1.5">
          {(["today", "week", "month"] as const).map(p => (
            <Button
              key={p}
              size="sm"
              variant={period === p ? "default" : "outline"}
              onClick={() => setPeriod(p)}
            >
              {p.charAt(0).toUpperCase() + p.slice(1)}
            </Button>
          ))}
        </div>
      }
    >
      <div className="space-y-6">

        {/* ── 1. KPI Cards ──────────────────────────────────────────── */}
        <div data-tour="bt-report-kpi" className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="bg-card border-border shadow-sm">
            <CardContent className="pt-5 pb-4 px-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">Files Bound</p>
                  <p className="text-3xl font-bold text-foreground mt-1">{stats.filesBound}</p>
                  <p className={`text-xs mt-1 font-medium ${stats.filesBoundDelta >= 0 ? "text-green-600" : "text-red-500"}`}>
                    {stats.filesBoundDelta >= 0 ? "+" : ""}{stats.filesBoundDelta}% vs prev
                  </p>
                </div>
                <PackageCheck className="h-8 w-8 text-primary opacity-70" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card border-border shadow-sm">
            <CardContent className="pt-5 pb-4 px-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">Avg. Days in Binding</p>
                  <p className="text-3xl font-bold text-foreground mt-1">{stats.avgDaysInBinding}</p>
                  <p className="text-xs text-muted-foreground mt-1">days per file</p>
                </div>
                <Clock className="h-8 w-8 text-blue-400 opacity-70" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card border-border shadow-sm">
            <CardContent className="pt-5 pb-4 px-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">Doc Completeness at Handoff</p>
                  <p className="text-3xl font-bold text-foreground mt-1">{stats.docCompletenessRate}%</p>
                  <div className="mt-2">
                    <Progress value={stats.docCompletenessRate} className="h-1.5" />
                  </div>
                </div>
                <CheckCircle2 className="h-8 w-8 text-green-400 opacity-70" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card border-border shadow-sm">
            <CardContent className="pt-5 pb-4 px-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">TAT Breach Rate</p>
                  <p className={`text-3xl font-bold mt-1 ${stats.slaBreachRate > 15 ? "text-red-600" : "text-orange-500"}`}>{stats.slaBreachRate}%</p>
                  <p className="text-xs text-muted-foreground mt-1">of assigned clients</p>
                </div>
                <AlertTriangle className="h-8 w-8 text-orange-400 opacity-70" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* ── 2. Binding Trend + Visa Status ───────────────────────── */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">

          <Card className="xl:col-span-2 bg-card border-border shadow-sm">
            <CardHeader>
              <CardTitle className="text-base">Files Bound vs Blocked</CardTitle>
              <CardDescription>Breakdown by {period === "today" ? "hour" : period === "week" ? "day" : "week"}</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={BINDING_TREND[period]} barSize={12} barCategoryGap="30%">
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="label" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} />
                  <Bar dataKey="bound" name="Bound" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="blocked" name="Blocked" fill="#f87171" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
              <div className="flex items-center gap-5 mt-2 text-xs text-muted-foreground">
                <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-primary inline-block" />Bound</span>
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
                  <Pie data={VISA_STATUS_PIE} cx="50%" cy="50%" innerRadius={45} outerRadius={70} dataKey="value" paddingAngle={2}>
                    {VISA_STATUS_PIE.map(entry => (
                      <Cell key={entry.name} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} />
                </PieChart>
              </ResponsiveContainer>
              <div className="grid grid-cols-2 gap-x-6 gap-y-1.5 mt-1 text-xs">
                {VISA_STATUS_PIE.map(s => (
                  <span key={s.name} className="flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full inline-block flex-shrink-0" style={{ background: s.color }} />
                    {s.name} ({s.value})
                  </span>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* ── 3. TAT Health Trend ───────────────────────────────────── */}
        <Card className="bg-card border-border shadow-sm">
          <CardHeader>
            <CardTitle className="text-base">TAT Health Trend</CardTitle>
            <CardDescription>Green / Orange / Red distribution over time</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={TAT_TREND[period]} barSize={12} barCategoryGap="25%">
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="label" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} />
                <Bar dataKey="green" name="On Track" stackId="sla" fill="#34d399" />
                <Bar dataKey="orange" name="Warning" stackId="sla" fill="#fb923c" />
                <Bar dataKey="red" name="Breach" stackId="sla" fill="#f87171" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
            <div className="flex items-center gap-5 mt-2 text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-green-400 inline-block" />On Track</span>
              <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-orange-400 inline-block" />Warning</span>
              <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-red-400 inline-block" />Breach</span>
            </div>
          </CardContent>
        </Card>

        {/* ── 4. Upcoming Appointments + On Hold ───────────────────── */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">

          <Card className="bg-card border-border shadow-sm">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Calendar className="h-4 w-4 text-primary" />
                Upcoming Appointments (next 14 days)
              </CardTitle>
            </CardHeader>
            <CardContent className="divide-y divide-border">
              {UPCOMING_APPOINTMENTS.filter(a => a.daysAway <= 14).length === 0 && (
                <p className="text-sm text-muted-foreground py-2">No appointments in the next 14 days.</p>
              )}
              {UPCOMING_APPOINTMENTS.filter(a => a.daysAway <= 14).map(a => (
                <div key={a.code} className="flex items-center justify-between py-3">
                  <div>
                    <p className="text-sm font-medium">{a.client}</p>
                    <p className="text-xs text-muted-foreground">{a.code} · {a.event}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium">{a.date}</p>
                    <p className="text-xs text-muted-foreground">{a.daysAway}d away</p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="bg-card border-border shadow-sm">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Users className="h-4 w-4 text-orange-500" />
                Clients On Hold
              </CardTitle>
            </CardHeader>
            <CardContent>
              {ON_HOLD_CLIENTS.length === 0 ? (
                <p className="text-sm text-muted-foreground py-2">No clients currently on hold.</p>
              ) : ON_HOLD_CLIENTS.map(c => (
                <div key={c.code} className="flex items-start justify-between py-3 border-b last:border-0 border-border">
                  <div>
                    <p className="text-sm font-medium">{c.name}</p>
                    <p className="text-xs text-muted-foreground">{c.code}</p>
                    <p className="text-xs text-orange-600 mt-0.5">{c.reason}</p>
                  </div>
                  <Badge variant="outline" className="bg-yellow-100 text-yellow-700 border-yellow-200 text-xs">
                    {c.daysOnHold}d on hold
                  </Badge>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

      </div>

      <ProductTour
        open={showHint}
        onClose={dismissHint}
        steps={[
          { target: '[data-tour="bt-report-period"]', title: "Period Selector", content: "Switch between Today, This Week, and This Month to see how your binding performance changes over different time frames.", side: "bottom" },
          { target: '[data-tour="bt-report-kpi"]', title: "KPI Cards", content: "Four cards show Files Bound, Average Days in Binding, Document Completeness at Handoff, and TAT Breach Rate — your core performance metrics.", side: "bottom" },
          { target: '[data-tour="bt-report-kpi"]', title: "Charts & Appointments", content: "Scroll down to see binding trend charts, visa application status breakdown, TAT health trend, and upcoming biometrics or interview appointments.", side: "top" },
        ]}
      />
    </PageWrapper>
  );
}
