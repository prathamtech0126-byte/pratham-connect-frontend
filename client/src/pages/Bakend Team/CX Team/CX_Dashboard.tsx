import { useState } from "react";
import { useLocation } from "wouter";
import { PageWrapper } from "@/layout/PageWrapper";
import { StatCard } from "@/components/cards/StatCard";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { LucideIcon } from "lucide-react";
import {
  Users, PackageCheck, CheckCircle2, AlertTriangle,
  GitBranch, List, ClipboardList, FileCheck, FileText,
  FileInput, BadgeCheck, FolderOpen,
} from "lucide-react";
import { usePageHint } from "@/hooks/usePageHint";
import { ProductTour } from "@/components/ProductTour";
import { DashboardDateFilter } from "@/components/dashboard/DashboardDateFilter";
import { useOpsDashboard } from "@/hooks/useVisaCases";
import { format } from "date-fns";

type OpsFilter = "today" | "weekly" | "monthly" | "custom";

const TAB_TO_FILTER: Record<string, OpsFilter> = {
  Today: "today", Weekly: "weekly", Monthly: "monthly", Custom: "custom",
};
const FILTER_TO_TAB: Record<OpsFilter, string> = {
  today: "Today", weekly: "Weekly", monthly: "Monthly", custom: "Custom",
};

// Colors for donut segments — index-matched with legend dots
const DONUT_COLORS = ["#0056b3", "#94a3b8", "#10b981", "#f59e0b", "#8b5cf6", "#ef4444"];

// Icon + color combos for Status Breakdown cards
const STATUS_ICONS: { icon: LucideIcon; bg: string; color: string }[] = [
  { icon: ClipboardList, bg: "bg-blue-50 dark:bg-blue-950/40",   color: "text-blue-600 dark:text-blue-400" },
  { icon: FileCheck,     bg: "bg-emerald-50 dark:bg-emerald-950/40", color: "text-emerald-600 dark:text-emerald-400" },
  { icon: FileText,      bg: "bg-violet-50 dark:bg-violet-950/40",   color: "text-violet-600 dark:text-violet-400" },
  { icon: FileInput,     bg: "bg-amber-50 dark:bg-amber-950/40",     color: "text-amber-600 dark:text-amber-400" },
  { icon: BadgeCheck,    bg: "bg-rose-50 dark:bg-rose-950/40",        color: "text-rose-600 dark:text-rose-400" },
  { icon: FolderOpen,    bg: "bg-cyan-50 dark:bg-cyan-950/40",        color: "text-cyan-600 dark:text-cyan-400" },
];

// ── SVG Donut chart ──────────────────────────────────────────────
function DonutChart({ data, total }: { data: { label: string; count: number }[]; total: number }) {
  const r = 36;
  const cx = 50;
  const cy = 50;
  const sw = 13;
  const C = 2 * Math.PI * r;
  const GAP = 3; // px gap between segments
  const segments = data.filter((d) => d.count > 0);
  const single = segments.length === 1;

  if (total === 0) {
    return (
      <div className="flex h-[90px] w-[90px] flex-shrink-0 items-center justify-center rounded-full bg-muted/50">
        <span className="text-lg font-bold text-muted-foreground">0</span>
      </div>
    );
  }

  let accum = 0;
  return (
    <div className="relative flex h-[90px] w-[90px] flex-shrink-0 items-center justify-center">
      <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90">
        {/* background track */}
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="#e2e8f0" strokeWidth={sw} />
        {segments.map((seg, i) => {
          const dash = Math.max(0, (seg.count / total) * C - (single ? 0 : GAP));
          const dashOffset = -accum;
          accum += (seg.count / total) * C;
          return (
            <circle
              key={i}
              cx={cx} cy={cy} r={r}
              fill="none"
              stroke={DONUT_COLORS[i % DONUT_COLORS.length]}
              strokeWidth={sw}
              strokeDasharray={`${dash} ${C}`}
              strokeDashoffset={dashOffset}
              strokeLinecap={single ? "round" : "butt"}
            />
          );
        })}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-xl font-extrabold tabular-nums leading-none text-foreground">{total}</span>
        <span className="mt-0.5 text-[9px] font-medium uppercase tracking-wide text-muted-foreground">Total</span>
      </div>
    </div>
  );
}

// ── Main dashboard ───────────────────────────────────────────────
export default function CxDashboard() {
  const [, navigate] = useLocation();
  const { showHint, dismissHint } = usePageHint("cx_dashboard");
  const [filter, setFilter] = useState<OpsFilter>("monthly");
  const [customRange, setCustomRange] = useState<[Date | null, Date | null]>([null, null]);

  const fromDate = filter === "custom" && customRange[0] ? format(customRange[0], "yyyy-MM-dd") : undefined;
  const toDate   = filter === "custom" && customRange[1] ? format(customRange[1], "yyyy-MM-dd") : undefined;

  const { data, isLoading } = useOpsDashboard(
    { filter, fromDate, toDate },
    filter !== "custom" || (!!fromDate && !!toDate),
  );

  const s               = data?.summary;
  const casesByStage    = data?.casesByStage ?? [];
  const bySubStatus     = data?.bySubStatus ?? [];
  const nonZeroSub      = bySubStatus.filter((x) => x.count > 0);
  const stageTotal      = casesByStage.reduce((a, x) => a + x.count, 0);
  const subTotal        = nonZeroSub.reduce((a, x) => a + x.count, 0);

  if (isLoading) {
    return (
      <PageWrapper title="My Dashboard" breadcrumbs={[{ label: "CX Team" }]}>
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-28 rounded-xl" />)}
          </div>
          <Skeleton className="h-36 rounded-xl" />
          <Skeleton className="h-40 rounded-xl" />
        </div>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper
      title="My Dashboard"
      breadcrumbs={[{ label: "CX Team" }]}
      actions={
        <DashboardDateFilter
          data-tour="dash-date-filter"
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

        {/* ── KPI Row ── */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Active Cases"
            value={s?.activeCases ?? 0}
            description="assigned to me"
            icon={Users}
            onClick={() => navigate("/cx/clients")}
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
          <StatCard title="Ready for Handover"   value={s?.readyForHandoff ?? 0}    description="docs complete, ready to move" icon={PackageCheck}  />
          <StatCard title="Handovers Completed"  value={s?.handoffsCompleted ?? 0}  description="handed over this period"      icon={CheckCircle2}  />
          <StatCard title="Stuck Cases"         value={s?.stuckCases ?? 0}         description="need attention"              icon={AlertTriangle} />
        </div>

        {/* ── Cases by Stage + Status Breakdown side by side ── */}
        {(casesByStage.length > 0 || nonZeroSub.length > 0) && (
          <div className="grid gap-4 lg:grid-cols-2">

            {/* Cases by Stage */}
            {casesByStage.length > 0 && (
              <Card className="border-none shadow-card">
                <CardContent className="p-5">
                  <div className="mb-4 flex items-center gap-2.5">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <GitBranch className="h-4 w-4" />
                    </div>
                    <h3 className="text-sm font-bold text-foreground">Cases by Stage</h3>
                  </div>
                  <div className="flex items-center gap-8">
                    <DonutChart data={casesByStage} total={stageTotal} />
                    <div className="flex-1 space-y-2.5">
                      {casesByStage.map((st, i) => (
                        <div
                          key={st.stage}
                          onClick={() => navigate(`/cx/clients?stage=${encodeURIComponent(st.stage)}`)}
                          className="flex items-center justify-between text-sm cursor-pointer rounded-lg px-2 py-1 -mx-2 hover:bg-accent transition-colors"
                        >
                          <div className="flex items-center gap-2">
                            <div
                              className="h-2.5 w-2.5 flex-shrink-0 rounded-full"
                              style={{ backgroundColor: DONUT_COLORS[i % DONUT_COLORS.length] }}
                            />
                            <span className="text-foreground">{st.label}</span>
                          </div>
                          <span className="tabular-nums text-muted-foreground">
                            {st.count}&nbsp;
                            <span className="text-xs">
                              ({stageTotal > 0 ? Math.round((st.count / stageTotal) * 100) : 0}%)
                            </span>
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Status Breakdown */}
            {nonZeroSub.length > 0 && (
              <Card className="border-none shadow-card">
                <CardContent className="p-5">
                  <div className="mb-4 flex items-center gap-2.5">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <List className="h-4 w-4" />
                    </div>
                    <h3 className="text-sm font-bold text-foreground">Status Breakdown</h3>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {nonZeroSub.map((sub, idx) => {
                      const { icon: Icon, bg, color } = STATUS_ICONS[idx % STATUS_ICONS.length];
                      const pct = subTotal > 0 ? Math.round((sub.count / subTotal) * 100) : 0;
                      return (
                        <div
                          key={sub.subStatus}
                          className="flex items-center gap-3.5 rounded-xl border border-border/50 bg-card p-4 shadow-sm"
                        >
                          <div className={`flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl ${bg}`}>
                            <Icon className={`h-5 w-5 ${color}`} />
                          </div>
                          <div className="min-w-0">
                            <p className="truncate text-xs text-muted-foreground">{sub.label}</p>
                            <p className="text-2xl font-extrabold tabular-nums leading-tight text-foreground">{sub.count}</p>
                            <p className="text-[11px] text-muted-foreground">{pct}% of total cases</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            )}

          </div>
        )}

      </div>

      <ProductTour
        open={showHint}
        onClose={dismissHint}
        steps={[
          { target: '[data-tour="dash-date-filter"]', title: "Date Filters", content: "Scope by Workload (all active cases), Today, Weekly, Monthly, or a custom date range.", side: "bottom" },
        ]}
      />
    </PageWrapper>
  );
}
