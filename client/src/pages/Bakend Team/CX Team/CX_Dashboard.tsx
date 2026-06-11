import { useState } from "react";
import { PageWrapper } from "@/layout/PageWrapper";
import { StatCard } from "@/components/cards/StatCard";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Phone, MessageSquare, Mail, Clock, Check, ChevronRight, Trophy,
  Users, FileText, CheckCircle2, AlertTriangle, ClipboardList,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/context/auth-context";
import { usePageHint } from "@/hooks/usePageHint";
import { ProductTour } from "@/components/ProductTour";

// ── Mock data (replace with API calls) — all scoped to the logged-in CX agent ──

const SNAPSHOT = {
  myClients: 24,
  pendingDocs: 31,
  tatAtRisk: 6,
  openQueries: 3,
  completed: 6,
};

/** The agent's to-do list for today — the heart of the screen. */
const INITIAL_TASKS = [
  { id: 1, name: "Aarav Patel", task: "Collect 3 pending documents", due: "TAT due tomorrow", urgent: true },
  { id: 2, name: "Rahul Mehta", task: "Make overdue follow-up call", due: "Overdue by 1 day", urgent: true },
  { id: 3, name: "Sneha Shah", task: "Chase passport & photo", due: "TAT due in 3 days", urgent: false },
  { id: 4, name: "Priya Nair", task: "Review visa file & confirm", due: "Today", urgent: false },
  { id: 5, name: "Karan Singh", task: "Complete financial docs", due: "TAT due in 2 days", urgent: false },
  { id: 6, name: "Meera Joshi", task: "Share document checklist", due: "TAT due in 4 days", urgent: false },
];

/** Today's scheduled client touchpoints. */
const TODAY_FOLLOWUPS = [
  { id: 1, name: "Aarav Patel", time: "10:30 AM", channel: "Call" as const, note: "Confirm document upload" },
  { id: 2, name: "Meera Joshi", time: "12:00 PM", channel: "WhatsApp" as const, note: "Share document checklist" },
  { id: 3, name: "Rahul Mehta", time: "03:00 PM", channel: "Call" as const, note: "Reschedule submission" },
  { id: 4, name: "Sneha Shah", time: "04:30 PM", channel: "Email" as const, note: "Send SOP template" },
  { id: 5, name: "Priya Nair", time: "05:15 PM", channel: "Call" as const, note: "Walk through visa file" },
];

const CHANNEL_ICON = { Call: Phone, WhatsApp: MessageSquare, Email: Mail };

// CX users can only scope by Today / Weekly / Monthly — no custom range.
type DateFilter = "today" | "weekly" | "monthly";

export default function CxDashboard() {
  const { user } = useAuth();
  const { showHint, dismissHint } = usePageHint("cx_dashboard");
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
      breadcrumbs={[{ label: "CX Team" }]}
      actions={
        <div className="flex gap-1.5" data-tour="dash-date-filter">
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
              <CardDescription>{greeting()}, {firstName} — here&apos;s your task queue</CardDescription>
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
          <div data-tour="dash-stats" className="grid gap-4 sm:grid-cols-2 lg:col-span-2">
            <StatCard title="My Clients" value={SNAPSHOT.myClients} icon={Users} description="active in my queue" />
            <StatCard title="Pending Docs" value={SNAPSHOT.pendingDocs} icon={FileText} description="to collect" />
            <StatCard title="Follow-ups Today" value={TODAY_FOLLOWUPS.length} icon={Phone} description="scheduled" />
            <StatCard title="TAT At Risk" value={SNAPSHOT.tatAtRisk} icon={AlertTriangle} description="due soon / overdue" />
            <StatCard title="Open Queries" value={SNAPSHOT.openQueries} icon={MessageSquare} description="awaiting my reply" />
            <StatCard title="Completed" value={SNAPSHOT.completed} icon={CheckCircle2} description="visa granted" />
          </div>
        </div>

        {/* ── My tasks (checklist) + today's follow-ups ───────────────── */}
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

          {/* Today's Follow-ups */}
          <Card className="border-border bg-card shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Clock className="h-4 w-4 text-primary" />
                Today&apos;s Follow-ups
              </CardTitle>
              <CardDescription>{TODAY_FOLLOWUPS.length} touchpoints scheduled</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {TODAY_FOLLOWUPS.map((fu) => {
                const Icon = CHANNEL_ICON[fu.channel];
                return (
                  <div key={fu.id} className="flex items-start gap-3">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                      <Icon className="h-4 w-4" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className="truncate text-sm font-semibold text-foreground">{fu.name}</p>
                        <span className="shrink-0 text-xs font-medium tabular-nums text-muted-foreground">{fu.time}</span>
                      </div>
                      <p className="truncate text-xs text-muted-foreground">{fu.channel} · {fu.note}</p>
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </div>

      </div>

      <ProductTour
        open={showHint}
        onClose={dismissHint}
        steps={[
          { target: '[data-tour="dash-stats"]', title: "Your Snapshot", content: "These cards summarise your own queue — clients, pending docs, follow-ups, TAT risk, queries, and completed cases.", side: "bottom" },
          { target: '[data-tour="dash-date-filter"]', title: "Date Filters", content: "Scope your numbers by Today, Weekly, or Monthly.", side: "bottom" },
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
