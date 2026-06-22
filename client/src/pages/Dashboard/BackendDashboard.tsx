import {
  Users,
  CheckCircle2,
  IndianRupee,
  FileCheck2,
  GitBranch,
} from "lucide-react";
import { useMemo } from "react";
import { useLocation } from "wouter";
import { type BackendDashboardData } from "@/data/dummyBackendData";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
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
import { useBackendReportsDashboard, useVisaCategoryCounts } from "@/hooks/useVisaCases";

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

  const { from, to } = useMemo(
    () => resolvePeriodBounds(timeFilter, customDateRange),
    [timeFilter, customDateRange]
  );

  const normalizedFilter = (timeFilter || "monthly").toLowerCase() as
    | "today"
    | "weekly"
    | "monthly"
    | "custom";

  const { data: apiResult, isLoading } = useBackendReportsDashboard(
    {
      filter: normalizedFilter,
      fromDate: normalizedFilter === "custom" ? (from ?? undefined) : undefined,
      toDate: normalizedFilter === "custom" ? (to ?? undefined) : undefined,
    },
    normalizedFilter !== "custom" || (!!from && !!to)
  );

  // Placeholder data while loading so the layout renders with zeros
  const EMPTY_DATA: BackendDashboardData = {
    totalClients: 0, approvalRate: null, outstandingBalance: 0,
    caseOutcomes: { totalEnrolled: 0, approved: 0, refused: 0, withdrawn: 0, pending: 0, filesSubmitted: 0, approvalRate: null, refusalRate: null },
    byDestination: [], bySponsor: [], byTravelReason: [], casesByStage: [], bySaleType: [],
    financial: { totalCharges: 0, initialReceived: 0, financeCharges: 0, totalBalanceDue: 0, collectionPct: null, avgChargePerClient: 0, clientsFullyPaid: 0, clientsWithBalance: 0 },
    processingTimes: { enrollmentToSubmission: null, submissionToDecision: null, enrollmentToDecision: null },
    accompanying: { totalMembers: 0, avgPerCase: null, casesWithAccompanying: 0 },
    highlights: { topDestination: "—", topTravelReason: "—", topSponsorType: "—" },
    decisionByDestination: [], enrollmentTrend: [],
  };

  // Category counts — 3 parallel calls; only fetch when dashboard filters are ready
  const { data: categoryCounts } = useVisaCategoryCounts(
    { fromDate: from ?? undefined, toDate: to ?? undefined },
    normalizedFilter !== "custom" || (!!from && !!to)
  );

  const data = apiResult?.data ?? EMPTY_DATA;
  const co = data.caseOutcomes;

  // Visitor / Spouse / Student breakdown chips for the Total Clients KPI card.
  // Each chip deep-links to the clients list pre-filtered to that category.
  const categoryChips = categoryCounts
    ? (
        [
          { label: "Visitor", value: categoryCounts.visitor, category: "visitor" },
          { label: "Spouse", value: categoryCounts.spouse, category: "spouse" },
          { label: "Student", value: categoryCounts.student, category: "student" },
        ] as const
      ).map((c) => ({
        label: c.label,
        value: String(c.value),
        onClick: () => go(`category=${c.category}`),
      }))
    : [];

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-3">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-32 rounded-xl" />)}
        </div>
        <div className="grid gap-4 lg:grid-cols-3">
          <Skeleton className="h-64 rounded-xl lg:col-span-2" />
          <Skeleton className="h-64 rounded-xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* KPI heroes */}
      <div className="grid gap-4 md:grid-cols-3">
        <KpiCard label="Total Clients" value={String(data.totalClients)} sub="Enrolled visa cases" icon={Users} accent="blue" onClick={() => go()} breakdown={categoryChips} />
        <KpiCard label="Approval Rate" value={pct(data.approvalRate)} sub="Approved of decided" icon={CheckCircle2} accent="emerald" onClick={() => go("status=APPROVED")} />
        <KpiCard label="Outstanding Balance" value={inr(data.outstandingBalance)} sub="Across all cases" icon={IndianRupee} accent="amber" onClick={() => go("balance=due")} />
      </div>

      <div className="space-y-4">
          {/* Case Outcomes */}
          <Card className="border-none shadow-card">
            <CardContent className="p-5">
              <div className="mb-5 flex items-center gap-2.5">
                <div className={cn("flex h-8 w-8 items-center justify-center rounded-lg", ACCENT.blue.chip)}>
                  <FileCheck2 className="h-4 w-4" />
                </div>
                <h3 className="text-sm font-bold text-foreground">Case Outcomes</h3>
              </div>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
                {[
                  { label: "Approved",        value: co.approved,       dot: "bg-emerald-500", text: "text-foreground", query: "status=APPROVED" },
                  { label: "Refused",         value: co.refused,        dot: "bg-rose-500",    text: "text-foreground", query: "status=REFUSED" },
                  { label: "Withdrawn",       value: co.withdrawn,      dot: "bg-amber-500",   text: "text-foreground", query: "status=WITHDRAWN" },
                  { label: "Pending",         value: co.pending,        dot: "bg-blue-500",    text: "text-foreground", query: "status=PENDING" },
                  { label: "Files Submitted", value: co.filesSubmitted, dot: "bg-violet-500",  text: "text-foreground", query: "status=FILE_SUBMITTED" },
                ].map((c) => (
                  <button
                    type="button"
                    key={c.label}
                    onClick={() => go(c.query)}
                    className="card-hover flex flex-col gap-2 rounded-xl border border-border/50 bg-card p-4 text-left transition-all hover:border-primary/30 hover:bg-accent/40"
                  >
                    <div className="flex items-center gap-1.5">
                      <span className={cn("h-2 w-2 rounded-full flex-shrink-0", c.dot)} />
                      <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground leading-tight">{c.label}</span>
                    </div>
                    <span className="text-3xl font-bold tabular-nums leading-none text-foreground">{c.value}</span>
                    <span className="text-[11px] text-muted-foreground">{c.value === 1 ? "case" : "cases"}</span>
                  </button>
                ))}
              </div>
              <div className="mt-3 grid grid-cols-2 gap-3">
                <button type="button" onClick={() => go("status=APPROVED")} className="card-hover flex flex-col gap-1 rounded-xl border border-border/50 bg-card p-4 text-left transition-all hover:border-primary/30 hover:bg-accent/40">
                  <div className="flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-emerald-500 flex-shrink-0" />
                    <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Approval Rate</span>
                  </div>
                  <span className="text-3xl font-bold tabular-nums leading-none text-foreground">{pct(co.approvalRate)}</span>
                </button>
                <button type="button" onClick={() => go("status=REFUSED")} className="card-hover flex flex-col gap-1 rounded-xl border border-border/50 bg-card p-4 text-left transition-all hover:border-primary/30 hover:bg-accent/40">
                  <div className="flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-rose-500 flex-shrink-0" />
                    <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Refusal Rate</span>
                  </div>
                  <span className="text-3xl font-bold tabular-nums leading-none text-foreground">{pct(co.refusalRate)}</span>
                </button>
              </div>
            </CardContent>
          </Card>

          {/* Cases by Stage — pipeline */}
          <Card className="border-none shadow-card">
            <CardContent className="p-5">
              <div className="mb-5 flex items-center gap-2.5">
                <div className={cn("flex h-8 w-8 items-center justify-center rounded-lg", ACCENT.purple.chip)}>
                  <GitBranch className="h-4 w-4" />
                </div>
                <h3 className="text-sm font-bold text-foreground">Cases by Stage</h3>
              </div>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                {data.casesByStage.map((s, idx) => {
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
                    <button
                      key={s.name}
                      type="button"
                      onClick={() => go(`stage=${encodeURIComponent(s.name)}`)}
                      className={cn(
                        "card-hover group flex flex-col gap-2 rounded-xl border border-transparent p-4 text-left transition-all hover:border-border/60 hover:shadow-sm",
                        bgColors[color]
                      )}
                    >
                      <div className="flex items-center gap-1.5">
                        <span className={cn("h-2 w-2 rounded-full flex-shrink-0", dotColors[color])} />
                        <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground leading-tight">{s.name}</span>
                      </div>
                      <span className={cn("text-3xl font-bold tabular-nums leading-none", textColors[color])}>{s.count}</span>
                      <span className="text-[11px] text-muted-foreground">{s.count === 1 ? "case" : "cases"}</span>
                    </button>
                  );
                })}
              </div>
            </CardContent>
          </Card>

      </div>
    </div>
  );
}
