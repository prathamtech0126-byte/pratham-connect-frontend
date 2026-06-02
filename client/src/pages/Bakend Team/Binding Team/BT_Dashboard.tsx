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
  Users, FileText, CheckCircle2, AlertTriangle, AlertCircle,
  PackageCheck, CalendarDays,
} from "lucide-react";
import { usePageHint } from "@/hooks/usePageHint";
import { ProductTour } from "@/components/ProductTour";

const STATS = {
  activeClients: 18,
  readyToHandoff: 5,
  pendingDocuments: 8,
  slaBreaches: 2,
  slaWarnings: 4,
  slaGreen: 12,
};

const CHART_DATA = [
  { month: "Jan", inBinding: 6, handedOff: 4, blocked: 1 },
  { month: "Feb", inBinding: 9, handedOff: 6, blocked: 2 },
  { month: "Mar", inBinding: 14, handedOff: 9, blocked: 3 },
  { month: "Apr", inBinding: 11, handedOff: 8, blocked: 2 },
  { month: "May", inBinding: 16, handedOff: 12, blocked: 2 },
  { month: "Jun", inBinding: 18, handedOff: 14, blocked: 1 },
];

type DateFilter = "today" | "weekly" | "monthly" | "custom";

const FILTER_LABEL: Record<string, string> = {
  today: "Today", weekly: "This Week", monthly: "This Month",
};

export default function BtDashboard() {
  const { showHint, dismissHint } = usePageHint("bt_dashboard");
  const [dateFilter, setDateFilter] = useState<DateFilter>("monthly");
  const [showPicker, setShowPicker] = useState(false);
  const [customLabel, setCustomLabel] = useState<string | null>(null);
  const pickerRef = useRef<HTMLDivElement>(null);
  const total = STATS.slaBreaches + STATS.slaWarnings + STATS.slaGreen;

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
      breadcrumbs={[{ label: "Binding Team" }]}
      actions={
        <div data-tour="bt-dash-date-filter" className="flex gap-1.5">
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
        <div data-tour="bt-dash-stats" className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
          <StatCard title="Active Clients" value={STATS.activeClients} icon={Users} description="in binding stage" />
          <StatCard title="Ready to Handoff" value={STATS.readyToHandoff} icon={PackageCheck} description="all docs approved" trend={{ value: 2, isPositive: true }} />
          <StatCard title="Pending Docs" value={STATS.pendingDocuments} icon={FileText} description="missing / awaiting" />
          <StatCard title="On Track" value={STATS.slaGreen} icon={CheckCircle2} description="TAT healthy" />
          <StatCard
            title="At-risk clients"
            value={STATS.slaWarnings}
            icon={AlertCircle}
            description="TAT warnings"
            className={STATS.slaWarnings > 0 ? "border border-orange-200 dark:border-orange-900" : ""}
          />
          <StatCard
            title="Overdue clients"
            value={STATS.slaBreaches}
            icon={AlertTriangle}
            description="TAT breaches"
            className={STATS.slaBreaches > 0 ? "border border-red-200 dark:border-red-900" : ""}
          />
        </div>

        {/* ── 2. Charts ──────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">

          {/* Binding Progress Trend */}
          <Card className="xl:col-span-2 bg-card border-border shadow-sm">
            <CardHeader>
              <CardTitle className="text-base">Binding Progress Trend</CardTitle>
              <CardDescription>
                In Binding vs Handed Off vs Blocked —{" "}
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
                  <Bar dataKey="inBinding" name="In Binding" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="handedOff" name="Handed Off" fill="#34d399" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="blocked" name="Blocked" fill="#f87171" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
              <div className="flex items-center gap-5 mt-2 text-xs text-muted-foreground">
                <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-primary inline-block" />In Binding</span>
                <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-green-400 inline-block" />Handed Off</span>
                <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-red-400 inline-block" />Blocked</span>
              </div>
            </CardContent>
          </Card>

          {/* TAT Risk Summary */}
          <Card className="bg-card border-border shadow-sm">
            <CardHeader>
              <CardTitle className="text-base">TAT Risk Summary</CardTitle>
              <CardDescription>Across {total} assigned clients</CardDescription>
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
          { target: '[data-tour="bt-dash-stats"]', title: "Client Overview", content: "Six stat cards give you a live snapshot of active clients, handoff-ready files, pending documents, and TAT health at a glance.", side: "bottom" },
          { target: '[data-tour="bt-dash-date-filter"]', title: "Date Filters", content: "Switch between Today, Weekly, and Monthly views, or pick a custom date range to analyse binding trends for any period.", side: "bottom" },
        ]}
      />
    </PageWrapper>
  );
}
