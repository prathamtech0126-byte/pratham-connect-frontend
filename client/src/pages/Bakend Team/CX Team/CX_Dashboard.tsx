import { useState, useRef, useEffect } from "react";
import { PageWrapper } from "@/layout/PageWrapper";
import { StatCard } from "@/components/cards/StatCard";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import DateRangePicker from "@/components/payments/DateRangePicker";
import type { PaymentsFilter } from "@/api/payments.api";
import { format } from "date-fns";
import {
  Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid,
} from "recharts";
import {
  Users, FileText, Clock, CheckCircle2, AlertTriangle, AlertCircle, CalendarDays,
} from "lucide-react";
import { usePageHint } from "@/hooks/usePageHint";
import { ProductTour } from "@/components/ProductTour";

// ── Mock summary data (replace with API calls) ─────────────────────────

const STATS = {
  totalClients: 24,
  processing: 18,
  completed: 6,
  pendingDocs: 31,
  slaBreaches: 2,
  slaWarnings: 4,
  slaGreen: 18,
};

const CHART_DATA = [
  { month: "Jan", enrolled: 8, processing: 5, completed: 3 },
  { month: "Feb", enrolled: 12, processing: 8, completed: 4 },
  { month: "Mar", enrolled: 18, processing: 11, completed: 7 },
  { month: "Apr", enrolled: 15, processing: 10, completed: 5 },
  { month: "May", enrolled: 22, processing: 14, completed: 8 },
  { month: "Jun", enrolled: 30, processing: 18, completed: 12 },
];

type DateFilter = "today" | "weekly" | "monthly" | "custom";

// ── Main Component ─────────────────────────────────────────────────────

const FILTER_LABEL: Record<string, string> = {
  today: "Today", monthly: "This Month", maximum: "All Time",
};

export default function CxDashboard() {
  const { showHint, dismissHint } = usePageHint("cx_dashboard");
  const [dateFilter, setDateFilter] = useState<DateFilter>("monthly");
  const [showPicker, setShowPicker] = useState(false);
  const [customLabel, setCustomLabel] = useState<string | null>(null);
  const pickerRef = useRef<HTMLDivElement>(null);
  const total = STATS.slaBreaches + STATS.slaWarnings + STATS.slaGreen;

  // Close picker when clicking outside
  useEffect(() => {
    if (!showPicker) return;
    function handleClick(e: MouseEvent) {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        setShowPicker(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [showPicker]);

  function handlePickerApply(filter: PaymentsFilter, startDate?: string, endDate?: string) {
    setDateFilter("custom");
    if (filter !== "custom") {
      setCustomLabel(FILTER_LABEL[filter] ?? filter);
    } else if (startDate && endDate) {
      const fmt = (s: string) => format(new Date(s), "d MMM yyyy");
      setCustomLabel(`${fmt(startDate)} – ${fmt(endDate)}`);
    }
    setShowPicker(false);
  }

  return (
    <PageWrapper
      title="Dashboard"
      breadcrumbs={[{ label: "CX Team" }]}
      actions={
        <div className="flex gap-1.5" data-tour="dash-date-filter">
          {(["today", "weekly", "monthly"] as const).map(f => (
            <Button
              key={f}
              size="sm"
              variant={dateFilter === f ? "default" : "outline"}
              onClick={() => { setDateFilter(f); setCustomLabel(null); setShowPicker(false); }}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </Button>
          ))}
          {/* Custom date picker */}
          <div className="relative" ref={pickerRef}>
            <Button
              size="sm"
              variant={dateFilter === "custom" ? "default" : "outline"}
              onClick={() => setShowPicker(v => !v)}
            >
              <CalendarDays className="h-3.5 w-3.5 mr-1" />
              {dateFilter === "custom" && customLabel ? customLabel : "Custom"}
            </Button>
            {showPicker && (
              <div className="absolute right-0 top-full mt-2 z-50">
                <DateRangePicker
                  onApply={handlePickerApply}
                  onCancel={() => setShowPicker(false)}
                />
              </div>
            )}
          </div>
        </div>
      }
    >
      <div className="space-y-6">

        {/* ── 1. Stat Cards ─────────────────────────────────────────── */}
        <div data-tour="dash-stats" className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
          <StatCard title="Assigned Clients" value={STATS.totalClients} icon={Users} description="total in queue" />
          <StatCard title="In Processing" value={STATS.processing} icon={Clock} description="active + on hold" />
          <StatCard title="Completed" value={STATS.completed} icon={CheckCircle2} description="visa granted" trend={{ value: 12, isPositive: true }} />
          <StatCard title="Pending Docs" value={STATS.pendingDocs} icon={FileText} description="docs awaiting upload" />
          <StatCard
            title="Overdue clients"
            value={STATS.slaBreaches}
            icon={AlertTriangle}
            description="TAT breaches"
            className={STATS.slaBreaches > 0 ? "border border-red-200 dark:border-red-900" : ""}
          />
          <StatCard
            title="At-risk clients"
            value={STATS.slaWarnings}
            icon={AlertCircle}
            description="TAT warnings"
            className={STATS.slaWarnings > 0 ? "border border-orange-200 dark:border-orange-900" : ""}
          />
        </div>

        {/* ── 2. Charts Row ──────────────────────────────────────────── */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">

          {/* Enrollment Trend */}
          <Card className="xl:col-span-2 bg-card border-border shadow-sm">
            <CardHeader>
              <CardTitle className="text-base">Client Enrollment Trends</CardTitle>
              <CardDescription>
                Enrolled vs Processing vs Completed —{" "}
                {dateFilter === "monthly" ? "last 6 months" : dateFilter}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={CHART_DATA} barSize={9} barCategoryGap="30%">
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="month" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                  <Tooltip
                    contentStyle={{
                      background: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: 8,
                    }}
                  />
                  <Bar dataKey="enrolled" name="Enrolled" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="processing" name="Processing" fill="#60a5fa" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="completed" name="Completed" fill="#34d399" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
              <div className="flex items-center gap-5 mt-2 text-xs text-muted-foreground">
                <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-primary inline-block" />Enrolled</span>
                <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-blue-400 inline-block" />Processing</span>
                <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-green-400 inline-block" />Completed</span>
              </div>
            </CardContent>
          </Card>

          {/* TAT Risk Summary */}
          <Card className="bg-card border-border shadow-sm">
            <CardHeader>
              <CardTitle className="text-base">TAT Risk Summary</CardTitle>
              <CardDescription>Distribution across {total} assigned clients</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              {[
                { label: "🟢 On Track", count: STATS.slaGreen, bar: "bg-green-500", text: "text-green-700" },
                { label: "🟠 Warning", count: STATS.slaWarnings, bar: "bg-orange-400", text: "text-orange-600" },
                { label: "🔴 Breach", count: STATS.slaBreaches, bar: "bg-red-500", text: "text-red-600" },
              ].map(({ label, count, bar, text }) => (
                <div key={label} className="space-y-1.5">
                  <div className="flex justify-between text-sm">
                    <span className={`font-medium ${text}`}>{label}</span>
                    <span className="text-muted-foreground">{count} / {total}</span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2">
                    <div
                      className={`h-2 rounded-full ${bar}`}
                      style={{ width: `${total > 0 ? Math.round((count / total) * 100) : 0}%` }}
                    />
                  </div>
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
          { target: '[data-tour="dash-stats"]', title: "Client Stats", content: "Six stat cards show your real-time metrics — total clients, processing, pending docs, and TAT health.", side: "bottom" },
          { target: '[data-tour="dash-date-filter"]', title: "Date Filters", content: "Filter all charts and stats by Today, Weekly, Monthly, or pick a custom date range.", side: "bottom" },
        ]}
      />
    </PageWrapper>
  );
}
