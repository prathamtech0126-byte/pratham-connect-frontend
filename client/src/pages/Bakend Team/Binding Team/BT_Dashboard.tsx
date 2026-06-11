import { useState } from "react";
import { PageWrapper } from "@/layout/PageWrapper";
import { StatCard } from "@/components/cards/StatCard";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Users, FileText, CheckCircle2, AlertTriangle, PackageCheck, Ban,
  ClipboardList, Trophy, Check, ChevronRight, ArrowRightCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/context/auth-context";
import { usePageHint } from "@/hooks/usePageHint";
import { ProductTour } from "@/components/ProductTour";

// ── Mock data (replace with API calls) — scoped to the logged-in binding agent ──

const SNAPSHOT = {
  activeClients: 18,   // files currently in binding
  readyToHandoff: 5,   // all docs approved, ready to pass on
  pendingDocs: 8,      // documents still missing / awaiting
  tatAtRisk: 6,        // approaching / past TAT
  blocked: 3,          // files stuck on a blocker
  handedOff: 14,       // completed handoffs this period
};

/** The agent's binding to-do list for today — the heart of the screen. */
const INITIAL_TASKS = [
  { id: 1, name: "Aarav Patel", task: "Verify & bind final document set", due: "TAT due tomorrow", urgent: true },
  { id: 2, name: "Rahul Mehta", task: "Resolve blocked file — missing affidavit", due: "Overdue by 1 day", urgent: true },
  { id: 3, name: "Sneha Shah", task: "Assemble application package", due: "TAT due in 3 days", urgent: false },
  { id: 4, name: "Priya Nair", task: "Final QC before handoff", due: "Today", urgent: false },
  { id: 5, name: "Karan Singh", task: "Bind financial section", due: "TAT due in 2 days", urgent: false },
  { id: 6, name: "Meera Joshi", task: "Request missing documents", due: "TAT due in 4 days", urgent: false },
];

/** Files with all docs approved, waiting to be handed off to the application team. */
const HANDOFF_QUEUE = [
  { id: 1, name: "Vikram Rao", docs: "12 / 12 docs", route: "Canada · SDS" },
  { id: 2, name: "Anita Desai", docs: "9 / 9 docs", route: "UK · Student" },
  { id: 3, name: "Rohit Kapoor", docs: "15 / 15 docs", route: "Australia · 500" },
  { id: 4, name: "Neha Verma", docs: "8 / 8 docs", route: "USA · F-1" },
  { id: 5, name: "Sahil Khan", docs: "11 / 11 docs", route: "Schengen · Visit" },
];

// Binding users can only scope by Today / Weekly / Monthly — no custom range.
type DateFilter = "today" | "weekly" | "monthly";

export default function BtDashboard() {
  const { user } = useAuth();
  const { showHint, dismissHint } = usePageHint("bt_dashboard");
  const [dateFilter, setDateFilter] = useState<DateFilter>("monthly");

  // Done state for today's tasks — checking a task fills the progress hero.
  const [doneIds, setDoneIds] = useState<Set<number>>(new Set());
  const toggleTask = (id: number) =>
    setDoneIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const firstName = (user?.name || "there").split(" ")[0];
  const total = INITIAL_TASKS.length;
  const done = doneIds.size;
  const remaining = total - done;
  const urgentLeft = INITIAL_TASKS.filter((t) => t.urgent && !doneIds.has(t.id)).length;
  const progress = total > 0 ? Math.round((done / total) * 100) : 0;

  return (
    <PageWrapper
      title="My Dashboard"
      breadcrumbs={[{ label: "Binding Team" }]}
      actions={
        <div className="flex gap-1.5" data-tour="bt-dash-date-filter">
          {(["today", "weekly", "monthly"] as const).map((f) => (
            <Button
              key={f}
              size="sm"
              variant={dateFilter === f ? "default" : "outline"}
              onClick={() => setDateFilter(f)}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </Button>
          ))}
        </div>
      }
    >
      <div className="space-y-6">

        {/* ── Progress hero (left) + stat cards (right) ───────────────── */}
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Today's progress */}
          <Card className="relative h-full overflow-hidden rounded-xl border-none bg-gradient-to-br from-primary/5 to-primary/10 shadow-card">
            <div className="absolute right-4 top-4 opacity-10">
              <ClipboardList className="h-24 w-24 text-primary" />
            </div>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg font-bold text-foreground">
                <div className="rounded-lg bg-background/60 p-2 shadow-sm backdrop-blur-sm">
                  <ClipboardList className="h-5 w-5 text-primary" />
                </div>
                Today&apos;s Progress
              </CardTitle>
              <CardDescription>{greeting()}, {firstName} — here&apos;s your binding queue</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-end justify-between">
                <p className="text-5xl font-bold tabular-nums text-foreground">
                  {done}
                  <span className="text-xl font-semibold text-muted-foreground"> / {total} done</span>
                </p>
                <div className="text-right">
                  <p className="text-sm text-muted-foreground">Remaining</p>
                  <p className="text-3xl font-bold tabular-nums text-primary">{remaining}</p>
                </div>
              </div>
              <div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                  <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${progress}%` }} />
                </div>
                <p className="mt-1 text-right text-xs text-muted-foreground">{progress}% completed</p>
              </div>
              <div className="flex items-center gap-3 rounded-lg bg-background/60 p-3">
                <div className="rounded-lg bg-primary/10 p-2">
                  <Trophy className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">
                    {remaining === 0 ? "All done — great work! 🎉" : "Keep it up! 🚀"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {remaining === 0
                      ? "Every task for today is complete."
                      : <>{remaining} tasks left{urgentLeft > 0 ? ` · ${urgentLeft} urgent` : ""}.</>}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Snapshot stats */}
          <div data-tour="bt-dash-stats" className="grid gap-4 sm:grid-cols-2 lg:col-span-2">
            <StatCard title="Active Clients" value={SNAPSHOT.activeClients} icon={Users} description="in binding stage" />
            <StatCard title="Ready to Handoff" value={SNAPSHOT.readyToHandoff} icon={PackageCheck} description="all docs approved" />
            <StatCard title="Pending Docs" value={SNAPSHOT.pendingDocs} icon={FileText} description="missing / awaiting" />
            <StatCard title="TAT At Risk" value={SNAPSHOT.tatAtRisk} icon={AlertTriangle} description="due soon / overdue" />
            <StatCard title="Blocked" value={SNAPSHOT.blocked} icon={Ban} description="stuck on a blocker" />
            <StatCard title="Handed Off" value={SNAPSHOT.handedOff} icon={CheckCircle2} description="completed" />
          </div>
        </div>

        {/* ── My tasks (checklist) + handoff queue ────────────────────── */}
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
          {/* My Tasks Today */}
          <Card className="border-border bg-card shadow-sm xl:col-span-2">
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <div>
                <CardTitle className="text-base">My Tasks Today</CardTitle>
                <CardDescription>Tick items off as you work through your queue</CardDescription>
              </div>
              <Badge variant="secondary" className="shrink-0">{done}/{total} done</Badge>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-border">
                {INITIAL_TASKS.map((t) => {
                  const isDone = doneIds.has(t.id);
                  return (
                    <div key={t.id} className="flex items-center gap-3 px-5 py-3 transition-colors hover:bg-muted/40">
                      <button
                        type="button"
                        aria-label={isDone ? "Mark not done" : "Mark done"}
                        onClick={() => toggleTask(t.id)}
                        className={cn(
                          "flex h-5 w-5 shrink-0 items-center justify-center rounded-full border transition-colors",
                          isDone ? "border-primary bg-primary text-primary-foreground" : "border-muted-foreground/40 hover:border-primary"
                        )}
                      >
                        {isDone ? <Check className="h-3 w-3" /> : null}
                      </button>
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                        {t.name.charAt(0).toUpperCase()}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className={cn("truncate text-sm font-semibold", isDone ? "text-muted-foreground line-through" : "text-foreground")}>
                            {t.name}
                          </p>
                          {t.urgent && !isDone ? (
                            <span className="shrink-0 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary">
                              Urgent
                            </span>
                          ) : null}
                        </div>
                        <p className={cn("truncate text-xs", isDone ? "text-muted-foreground/70 line-through" : "text-muted-foreground")}>
                          {t.task}
                        </p>
                      </div>
                      <span className={cn("shrink-0 text-xs font-medium", isDone ? "text-muted-foreground/60" : "text-muted-foreground")}>
                        {t.due}
                      </span>
                      <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Ready to Hand Off */}
          <Card className="border-border bg-card shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <PackageCheck className="h-4 w-4 text-primary" />
                Ready to Hand Off
              </CardTitle>
              <CardDescription>{HANDOFF_QUEUE.length} files cleared for the application team</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {HANDOFF_QUEUE.map((h) => (
                <button
                  key={h.id}
                  type="button"
                  className="flex w-full items-center gap-3 rounded-lg p-2 text-left transition-colors hover:bg-muted/40"
                >
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                    {h.name.charAt(0).toUpperCase()}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-foreground">{h.name}</p>
                    <p className="truncate text-xs text-muted-foreground">{h.docs} · {h.route}</p>
                  </div>
                  <ArrowRightCircle className="h-4 w-4 shrink-0 text-primary" />
                </button>
              ))}
            </CardContent>
          </Card>
        </div>

      </div>

      <ProductTour
        open={showHint}
        onClose={dismissHint}
        steps={[
          { target: '[data-tour="bt-dash-stats"]', title: "Your Snapshot", content: "These cards summarise your binding queue — active files, handoff-ready, pending docs, TAT risk, blocked, and completed handoffs.", side: "bottom" },
          { target: '[data-tour="bt-dash-date-filter"]', title: "Date Filters", content: "Scope your numbers by Today, Weekly, or Monthly.", side: "bottom" },
        ]}
      />
    </PageWrapper>
  );
}

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}
