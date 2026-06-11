import {
  Users,
  CheckCircle2,
  IndianRupee,
  FileCheck2,
  GitBranch,
  XCircle,
  Undo2,
  Hourglass,
  Send,
  Trophy,
} from "lucide-react";
import { useMemo } from "react";
import { useLocation } from "wouter";
import {
  computeBackendDashboardData,
  DUMMY_BACKEND_CLIENTS,
} from "@/data/dummyBackendData";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import {
  ACCENT,
  KpiCard,
  Panel,
  resolvePeriodBounds,
  inr,
  pct,
  type Accent,
} from "@/pages/Dashboard/backendDashboardShared";

/** Base path of the case list page (cards deep-link here with filters). */
const CLIENTS_PATH = "/backend/clients";

/**
 * Backend / Visa Case Dashboard — operational view.
 *
 * Shows only at-a-glance, action-oriented widgets a backend manager checks
 * daily: headline KPIs, current case outcomes, pipeline stages, top highlights,
 * and processing-time SLAs. The analytical breakdowns (financials, 12-month
 * trend, destination/travel/sponsor mixes, decision cross-tab, accompanying
 * members) live on the companion Backend Report page (`/reports/backend`).
 *
 * The visa-case fields do not yet exist in the Client model, so several
 * sections render with zero/placeholder values until wired to real endpoints.
 */

// Derives everything from the shared dummy data (DUMMY_BACKEND_CLIENTS), filtered
// by the dashboard's period selector (Today / Weekly / Monthly / Custom).
export function BackendDashboard({
  timeFilter = "monthly",
  customDateRange = [null, null],
}: {
  timeFilter?: string;
  customDateRange?: [Date | null, Date | null];
} = {}) {
  const [, navigate] = useLocation();
  // Deep-link into the case list carrying both the card's own filter (e.g.
  // decision=Approved) AND the dashboard's active period, so the list opens
  // pre-filtered to the same date range the user was viewing.
  const go = (query?: string) => {
    const params = new URLSearchParams(query ?? "");
    params.set("period", (timeFilter || "monthly").toLowerCase());
    const { from, to } = resolvePeriodBounds(timeFilter, customDateRange);
    if (from && to) {
      params.set("from", from);
      params.set("to", to);
    }
    const qs = params.toString();
    navigate(qs ? `${CLIENTS_PATH}?${qs}` : CLIENTS_PATH);
  };

  // Cases enrolled within the selected period drive every widget.
  const periodClients = useMemo(() => {
    const { from, to } = resolvePeriodBounds(timeFilter, customDateRange);
    if (!from || !to) return DUMMY_BACKEND_CLIENTS;
    return DUMMY_BACKEND_CLIENTS.filter((c) => c.enrollmentDate >= from && c.enrollmentDate <= to);
  }, [timeFilter, customDateRange]);

  const data = useMemo(() => computeBackendDashboardData(periodClients), [periodClients]);
  const co = data.caseOutcomes;

  // Team leaderboard — ranks backend processors (the case "Handled By") within the
  // selected period by cases handled, with their approval rate as a quality signal.
  const leaderboard = useMemo(() => {
    const map = new Map<string, { name: string; handled: number; approved: number }>();
    for (const c of periodClients) {
      const key = c.handledBy || "Unassigned";
      const e = map.get(key) ?? { name: key, handled: 0, approved: 0 };
      e.handled += 1;
      if (c.decision === "Approved") e.approved += 1;
      map.set(key, e);
    }
    return [...map.values()]
      .map((e) => ({ ...e, approvalRate: e.handled ? (e.approved / e.handled) * 100 : 0 }))
      .sort((a, b) => b.handled - a.handled || b.approved - a.approved);
  }, [periodClients]);
  const maxHandled = Math.max(1, ...leaderboard.map((m) => m.handled));

  const outcomeChips: { label: string; value: number; icon: React.ComponentType<{ className?: string }>; accent: Accent; query?: string }[] = [
    { label: "Approved", value: co.approved, icon: CheckCircle2, accent: "emerald", query: "decision=Approved" },
    { label: "Refused", value: co.refused, icon: XCircle, accent: "rose", query: "decision=Refused" },
    { label: "Withdrawn", value: co.withdrawn, icon: Undo2, accent: "amber", query: "decision=Withdrawn" },
    { label: "Pending", value: co.pending, icon: Hourglass, accent: "blue", query: "decision=Pending" },
    { label: "Files Submitted", value: co.filesSubmitted, icon: Send, accent: "purple", query: "status=Submission" },
  ];

  return (
    <div className="space-y-6">
      {/* KPI heroes */}
      <div className="grid gap-4 md:grid-cols-3">
        <KpiCard label="Total Clients" value={String(data.totalClients)} sub="Enrolled visa cases" icon={Users} accent="blue" onClick={() => go()} />
        <KpiCard label="Approval Rate" value={pct(data.approvalRate)} sub="Approved of decided" icon={CheckCircle2} accent="emerald" onClick={() => go("decision=Approved")} />
        <KpiCard label="Outstanding Balance" value={inr(data.outstandingBalance)} sub="Across all cases" icon={IndianRupee} accent="amber" onClick={() => go("balance=due")} />
      </div>

      {/* Left column = outcomes + pipeline + highlights + processing · Right column = leaderboard.
          The leaderboard lives in its own column so it can grow tall as the team grows without
          pushing the other cards around or leaving gaps. */}
      <div className="grid items-start gap-4 lg:grid-cols-3">
        {/* Left column */}
        <div className="space-y-4 lg:col-span-2">
          {/* Case Outcomes */}
          <Panel title="Case Outcomes" icon={FileCheck2} accent="blue">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
              {outcomeChips.map((c) => {
                const a = ACCENT[c.accent];
                const Icon = c.icon;
                return (
                  <button
                    type="button"
                    key={c.label}
                    onClick={() => go(c.query)}
                    className="card-hover rounded-xl border border-border/50 bg-card p-3 text-left transition-shadow"
                  >
                    <div className="flex items-center gap-2">
                      <div className={cn("flex h-7 w-7 items-center justify-center rounded-lg", a.chip)}>
                        <Icon className="h-3.5 w-3.5" />
                      </div>
                      <span className="text-2xl font-bold tabular-nums text-foreground">{c.value}</span>
                    </div>
                    <p className="mt-1.5 text-xs font-medium text-muted-foreground">{c.label}</p>
                  </button>
                );
              })}
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3">
              <button type="button" onClick={() => go("decision=Approved")} className="card-hover rounded-xl border border-border/50 bg-card p-3 text-left">
                <p className="text-xs font-medium text-muted-foreground">Approval Rate</p>
                <p className="mt-1 text-xl font-bold text-primary">{pct(co.approvalRate)}</p>
              </button>
              <button type="button" onClick={() => go("decision=Refused")} className="card-hover rounded-xl border border-border/50 bg-card p-3 text-left">
                <p className="text-xs font-medium text-muted-foreground">Refusal Rate</p>
                <p className="mt-1 text-xl font-bold text-foreground">{pct(co.refusalRate)}</p>
              </button>
            </div>
          </Panel>

          {/* Cases by Stage — pipeline */}
          <Card className="card-hover border-none shadow-card">
            <CardContent className="p-5">
              <div className="mb-4 flex items-center gap-2.5">
                <div className={cn("flex h-8 w-8 items-center justify-center rounded-lg", ACCENT.purple.chip)}>
                  <GitBranch className="h-4 w-4" />
                </div>
                <h3 className="text-sm font-bold text-foreground">Cases by Stage</h3>
              </div>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-stretch">
                {data.casesByStage.map((s, i) => (
                  <div key={s.name} className="flex flex-1 items-center gap-2">
                    <button
                      type="button"
                      onClick={() => go(`stage=${encodeURIComponent(s.name)}`)}
                      className="card-hover flex flex-1 flex-col items-center rounded-xl border border-border/50 bg-muted/30 p-3 text-center transition-shadow"
                    >
                      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                        {i + 1}
                      </div>
                      <span className="mt-2 text-2xl font-bold tabular-nums text-foreground">{s.count}</span>
                      <span className="mt-1 text-[11px] font-medium leading-tight text-muted-foreground">{s.name}</span>
                    </button>
                    {i < data.casesByStage.length - 1 ? (
                      <div className="hidden h-0.5 w-3 flex-shrink-0 bg-border sm:block" />
                    ) : null}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

        </div>

        {/* Right column — Team Leaderboard (grows as the team grows) */}
        <Panel title="Team Leaderboard" icon={Trophy} accent="amber">
          {leaderboard.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">No cases in this period.</p>
          ) : (
            <div className="space-y-2">
              {leaderboard.map((m, i) => {
                const rank = i + 1;
                const medal =
                  rank === 1 ? "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400"
                    : rank === 2 ? "bg-slate-100 text-slate-600 dark:bg-slate-500/15 dark:text-slate-300"
                      : rank === 3 ? "bg-orange-100 text-orange-700 dark:bg-orange-500/15 dark:text-orange-400"
                        : "bg-muted text-muted-foreground";
                return (
                  <button
                    type="button"
                    key={m.name}
                    onClick={() => go(`handledBy=${encodeURIComponent(m.name)}`)}
                    className="card-hover flex w-full items-center gap-2.5 rounded-lg border border-border/50 bg-card p-2.5 text-left transition-shadow"
                  >
                    <span className={cn("flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full text-[11px] font-bold", medal)}>
                      {rank}
                    </span>
                    <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                      {m.name.charAt(0).toUpperCase()}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="truncate text-sm font-semibold text-foreground">{m.name}</span>
                        <span className="flex-shrink-0 text-sm font-bold tabular-nums text-foreground">
                          {m.handled}
                          <span className="ml-1 text-[11px] font-normal text-muted-foreground">cases</span>
                        </span>
                      </div>
                      <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-muted">
                        <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${(m.handled / maxHandled) * 100}%` }} />
                      </div>
                      <p className="mt-0.5 text-[11px] text-muted-foreground">
                        {m.approved} approved · {pct(m.approvalRate)} approval
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </Panel>
      </div>
    </div>
  );
}
