import { useState, useMemo } from "react";
import { format } from "date-fns";
import {
  ChevronDown, ChevronUp, CalendarDays,
  ArrowRight, Check,
  ChevronsUpDown, Info, Users, User, Layers, Clock,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { TimelineEvent, TimelineEventPhase } from "@/api/clientTimeline.api";

// Converts a UTC date string/Date to IST (UTC+5:30) for display
function toIST(utc: string | Date): Date {
  const d = typeof utc === "string" ? new Date(utc) : utc;
  return new Date(d.getTime() + 5.5 * 60 * 60 * 1000);
}

// ─── Types ────────────────────────────────────────────────────────────────────

type FilterKey = "all" | "status" | "payments" | "assignments" | "documents" | "notes";

// ─── Journey stages ───────────────────────────────────────────────────────────

const JOURNEY_STEPS: { key: string; label: string; phase: TimelineEventPhase | null }[] = [
  { key: "enrollment",  label: "Enrollment",   phase: "ENROLLMENT"  },
  { key: "assignment",  label: "Assignment",   phase: "ASSIGNMENT"  },
  { key: "processing",  label: "Processing",   phase: "PROCESSING"  },
  { key: "decision",    label: "Decision",     phase: "DECISION"    },
  { key: "completed",   label: "Completed",    phase: null          },
];

const FILTER_TABS: { key: FilterKey; label: string }[] = [
  { key: "all",         label: "All"            },
  { key: "status",      label: "Status Updates" },
  { key: "payments",    label: "Payments"       },
  { key: "assignments", label: "Assignments"    },
  { key: "documents",   label: "Documents"      },
  { key: "notes",       label: "Notes"          },
];

function getFilter(event: TimelineEvent): FilterKey {
  const t = event.type?.toUpperCase() ?? "";
  if (t.includes("STATUS") || t.includes("STAGE") || t.includes("SUBSTATUS")) return "status";
  if (t.includes("PAYMENT"))                                                    return "payments";
  if (t.includes("ASSIGN") || t.includes("ROUTING") || t.includes("ROUTE"))   return "assignments";
  if (t.includes("DOCUMENT"))                                                   return "documents";
  if (t.includes("NOTE"))                                                       return "notes";
  if (event.phase === "ASSIGNMENT")                                             return "assignments";
  return "all";
}

// ─── Badge label per event type ───────────────────────────────────────────────

function getBadgeLabel(event: TimelineEvent): string {
  const t = event.type?.toUpperCase() ?? "";
  if (t.includes("PAYMENT"))                                                  return "PAYMENT";
  if (t.includes("STATUS") || t.includes("STAGE") || t.includes("SUBSTATUS")) return "STATUS CHANGE";
  if (t.includes("ENROLLMENT") || t.includes("ENROLL"))                      return "ENROLLMENT";
  if (t.includes("VISA") || t.includes("CASE"))                              return "ENROLLMENT";
  if (t.includes("ASSIGN") || t.includes("ROUTING") || t.includes("ROUTE")) return "ASSIGNMENT";
  if (t.includes("NOTE"))                                                     return "NOTE";
  if (t.includes("DOCUMENT"))                                                 return "DOCUMENT";
  return event.phase ?? "EVENT";
}

// ─── Always-visible rich body per event type ──────────────────────────────────

function EventBody({ event }: { event: TimelineEvent }) {
  const t = event.type?.toUpperCase() ?? "";
  const m = event.metadata ?? {};

  // Payment — amount
  if (t.includes("PAYMENT")) {
    const amount   = m.amount as number | string | undefined;
    const currency = (m.currency ?? "INR") as string;
    const stage    = (m.paymentStage ?? m.stage) as string | undefined;
    const pid      = (m.paymentId ?? m.id) as number | string | undefined;
    return (
      <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
        {amount !== undefined && (
          <span className="text-sm font-semibold text-foreground">
            ₹{Number(amount).toLocaleString("en-IN")}
          </span>
        )}
        <span className="text-xs text-muted-foreground">{currency}</span>
        {stage && <span className="text-[10px] text-muted-foreground">· {stage}</span>}
        {pid && <span className="text-[10px] text-muted-foreground">· #{pid}</span>}
      </div>
    );
  }

  // Status / Stage change — transition
  if (t.includes("STATUS") || t.includes("STAGE") || t.includes("SUBSTATUS")) {
    const from  = (m.fromSubStatus ?? m.fromStatus ?? m.from ?? m.previousStatus) as string | undefined;
    const to    = (m.toSubStatus   ?? m.toStatus   ?? m.to  ?? m.newStatus)       as string | undefined;
    const stage = m.stage as string | undefined;
    if (!from && !to && !stage) {
      return event.description ? <p className="mt-1 text-xs text-muted-foreground">{event.description}</p> : null;
    }
    return (
      <div className="mt-1 flex flex-wrap items-center gap-1">
        {from && <span className="text-[10px] text-muted-foreground">{from}</span>}
        {from && to && <ArrowRight className="h-3 w-3 text-muted-foreground/40 shrink-0" />}
        {to && <span className="text-[10px] font-medium text-foreground">{to}</span>}
        {stage && <span className="text-[10px] text-muted-foreground/60">· {stage}</span>}
      </div>
    );
  }

  // Assignment / Routing
  if (t.includes("ASSIGN") || t.includes("ROUTING") || t.includes("ROUTE")) {
    const by     = (m.assignedBy  ?? m.byUser   ?? m.fromUser        ?? m.fromUserName)  as string | undefined;
    const to     = (m.assignedTo  ?? m.toUser   ?? m.assignedUserName ?? m.assignee)     as string | undefined;
    const toRole = (m.assignedToRole ?? m.toRole) as string | undefined;
    const team   = (m.team ?? m.assignedTeam ?? m.targetTeam) as string | undefined;
    return (
      <div className="mt-1 flex flex-wrap items-center gap-1">
        {by && <span className="text-[10px] text-muted-foreground">{by}</span>}
        {by && (to || team) && <ArrowRight className="h-3 w-3 text-muted-foreground/40 shrink-0" />}
        {to && (
          <span className="text-[10px] font-medium text-foreground">
            {to}{toRole && <span className="font-normal text-muted-foreground"> · {toRole.replace(/_/g, " ")}</span>}
          </span>
        )}
        {team && !to && <span className="text-[10px] font-medium text-foreground">Team: {team}</span>}
      </div>
    );
  }

  // Fallback
  if (event.description) {
    return <p className="mt-1 text-xs text-muted-foreground">{event.description}</p>;
  }

  return null;
}

// ─── Extra collapsed metadata (source, extra fields) ─────────────────────────

function ExtraMeta({ event }: { event: TimelineEvent }) {
  const m = event.metadata ?? {};
  const t = event.type?.toUpperCase() ?? "";

  const subStatus = (m.subStatus ?? m.substate) as string | undefined;
  const stage     = (m.stage) as string | undefined;
  const type      = (m.assignmentType) as string | undefined;
  const pid       = (m.paymentId ?? m.id) as number | string | undefined;

  const rows: { label: string; value: string }[] = [];

  if (t.includes("STATUS") || t.includes("STAGE")) {
    if (subStatus) rows.push({ label: "Sub Status", value: subStatus });
    if (stage)     rows.push({ label: "Stage",      value: stage });
  }
  if (t.includes("ASSIGN") || t.includes("ROUTE") || t.includes("ROUTING")) {
    if (type) rows.push({ label: "Type",  value: type });
  }
  if (t.includes("PAYMENT") && pid) {
    rows.push({ label: "Payment ID", value: `#${pid}` });
  }
  if (event.source) {
    rows.push({ label: "Source", value: event.source });
  }

  if (rows.length === 0) return null;

  return (
    <div className="mt-2 pt-2 border-t border-border/60 flex flex-wrap gap-x-5 gap-y-1">
      {rows.map((r) => (
        <div key={r.label}>
          <span className="text-[10px] text-muted-foreground/70 uppercase tracking-wide">{r.label}: </span>
          <span className="text-[10px] text-muted-foreground font-medium">{r.value}</span>
        </div>
      ))}
    </div>
  );
}

// ─── Journey Progress ─────────────────────────────────────────────────────────

export function JourneyProgress({ events }: { events: TimelineEvent[] }) {
  const phases = useMemo(() => new Set(events.map((e) => e.phase)), [events]);
  const isCompleted = useMemo(
    () => events.some((e) => {
      const t = e.type?.toUpperCase() ?? "";
      return e.phase === "DECISION" && (t.includes("APPROVED") || t.includes("GRANTED") || t.includes("COMPLETE"));
    }),
    [events]
  );

  const completedFlags = JOURNEY_STEPS.map((s) => {
    if (s.key === "completed") return isCompleted;
    return s.phase ? phases.has(s.phase) : false;
  });
  const currentIdx = completedFlags.lastIndexOf(true);

  if (events.length === 0) return null;

  return (
    <div className="flex items-center overflow-x-auto">
      {JOURNEY_STEPS.map((step, idx) => {
        const done    = completedFlags[idx];
        const current = !done && idx === currentIdx + 1;
        const active  = done || current;
        return (
          <div key={step.key} className="flex items-center shrink-0">
            <div className="flex flex-col items-center gap-0.5">
              <div className={cn(
                "h-5 w-5 rounded-full border-2 flex items-center justify-center transition-colors",
                done    ? "border-primary bg-primary text-primary-foreground"
                : current ? "border-primary bg-background"
                :           "border-border bg-background"
              )}>
                {done    ? <Check className="h-2.5 w-2.5" />
                : current ? <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                : null}
              </div>
              <span className={cn("text-[9px] font-semibold whitespace-nowrap", active ? "text-primary" : "text-muted-foreground")}>
                {step.label}
              </span>
            </div>
            {idx < JOURNEY_STEPS.length - 1 && (
              <div className={cn("w-8 h-px mb-3 mx-0.5", completedFlags[idx] ? "bg-primary" : "bg-border")} />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Case Summary strip ───────────────────────────────────────────────────────

interface CaseSummaryData {
  currentStage:    string | null;
  currentStatus:   string | null;
  counsellor:      string | null;
  backendAssignee: string | null;
  backendRole:     string | null;
  lastUpdated:     string | null;
}

const BACKEND_TEAMS = ["cx", "binding", "customer experience", "customer_experience", "binding_team", "application"];

function isBackendTeamMember(team?: string, role?: string): boolean {
  const hay = `${team ?? ""} ${role ?? ""}`.toLowerCase();
  return BACKEND_TEAMS.some((k) => hay.includes(k));
}

const COUNSELLOR_ROLES = ["counsellor", "counselor", "manager", "sales"];

function isCounsellorRole(role?: string): boolean {
  if (!role) return false;
  const r = role.toLowerCase();
  return COUNSELLOR_ROLES.some((k) => r.includes(k));
}

function deriveSummary(events: TimelineEvent[]): CaseSummaryData {
  let currentStage: string | null = null, currentStatus: string | null = null;
  let counsellor: string | null = null, backendAssignee: string | null = null, backendRole: string | null = null;
  const lastUpdated = events[0]?.occurredAt ?? null;

  for (const ev of events) {
    const t = ev.type?.toUpperCase() ?? "";
    const m = ev.metadata ?? {};
    if (!currentStage && !currentStatus && (t.includes("STATUS") || t.includes("STAGE") || t.includes("SUBSTATUS"))) {
      currentStage  = (m.stage ?? m.toStage ?? m.currentStage) as string | null;
      currentStatus = (m.toSubStatus ?? m.toStatus ?? m.newStatus ?? m.subStatus) as string | null;
    }
    if (!backendAssignee && (t.includes("ASSIGN") || t.includes("ROUTING") || t.includes("ROUTE"))) {
      const team = (m.team ?? m.assignedTeam ?? m.targetTeam) as string | undefined;
      const role = (m.assignedToRole ?? m.toRole) as string | undefined;
      if (isBackendTeamMember(team, role)) {
        backendAssignee = (m.assignedTo ?? m.toUser ?? m.assignedUserName ?? m.assignee) as string | null;
        backendRole     = role ?? team ?? null;
      }
    }
    if (!counsellor) {
      const mc = (m.counsellorName ?? m.counsellor ?? m.enrolledBy) as string | null | undefined;
      if (mc) {
        counsellor = mc;
      } else if (ev.phase === "ENROLLMENT" && ev.actor?.name && isCounsellorRole(ev.actor.role)) {
        counsellor = ev.actor.name;
      }
    }
  }

  if (!currentStage && events[0]) {
    const phaseLabel: Record<TimelineEventPhase, string> = {
      ENROLLMENT: "Enrollment", ASSIGNMENT: "Assignment",
      PROCESSING: "Processing", DECISION: "Decision",
    };
    currentStage = phaseLabel[events[0].phase] ?? null;
  }

  return { currentStage, currentStatus, counsellor, backendAssignee, backendRole, lastUpdated };
}

function CaseSummary({ events, counsellorName }: { events: TimelineEvent[]; counsellorName?: string }) {
  const s = useMemo(() => deriveSummary(events), [events]);
  const resolvedCounsellor = counsellorName && counsellorName !== "N/A" ? counsellorName : s.counsellor;
  if (events.length === 0 && !resolvedCounsellor) return null;

  const items: { icon: React.ElementType; label: string; value: string; iconBg: string; iconText: string }[] = [
    { icon: Layers, label: "Current Stage",        value: s.currentStage ?? "—",      iconBg: "bg-blue-100",   iconText: "text-blue-600"   },
    { icon: Info,   label: "Status",               value: s.currentStatus ?? "—",     iconBg: "bg-blue-100",   iconText: "text-blue-600"   },
    { icon: User,   label: "Counsellor",           value: resolvedCounsellor ?? "—",  iconBg: "bg-slate-100",  iconText: "text-slate-600"  },
    { icon: Users,  label: "Back Office Executive",value: s.backendAssignee ?? "—",   iconBg: "bg-violet-100", iconText: "text-violet-600" },
    { icon: Clock,  label: "Last Updated",         value: s.lastUpdated ? format(toIST(s.lastUpdated), "dd MMM, hh:mm a") : "—", iconBg: "bg-slate-100", iconText: "text-slate-500" },
  ];

  return (
    <div className="mb-5 flex items-stretch rounded-xl border border-border bg-card shadow-sm overflow-x-auto divide-x divide-border">
      {items.map(({ icon: Icon, label, value, iconBg, iconText }) => (
        <div key={label} className="flex items-center gap-3 px-4 py-3 min-w-0 flex-1 shrink-0">
          <div className={cn("h-8 w-8 rounded-lg flex items-center justify-center shrink-0", iconBg)}>
            <Icon className={cn("h-4 w-4", iconText)} />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] text-muted-foreground font-medium leading-none">{label}</p>
            <p className="text-xs font-bold text-foreground mt-0.5 truncate" title={value}>{value}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Date divider — centered on the timeline line ─────────────────────────────

function DateDivider({ label, isToday, count }: { label: string; isToday: boolean; count: number }) {
  return (
    <div className="relative flex items-center justify-center my-8">
      <div className="absolute inset-x-0 h-px bg-border" />
      <div className="relative z-10 flex items-center gap-2 bg-card px-4">
        <span className={cn(
          "text-xs font-bold px-4 py-1.5 rounded-full border shadow-sm",
          isToday
            ? "bg-primary text-primary-foreground border-primary"
            : "bg-background text-foreground border-border",
        )}>
          {isToday ? "Today · " : ""}{label}
        </span>
        <span className="text-[10px] font-semibold text-muted-foreground bg-muted border border-border rounded-full px-2.5 py-1">
          {count} event{count !== 1 ? "s" : ""}
        </span>
      </div>
    </div>
  );
}

// ─── Zigzag event row ─────────────────────────────────────────────────────────

function EventRow({
  event,
  globalIdx,
  isLast,
  forceExpand,
}: {
  event: TimelineEvent;
  globalIdx: number;
  isLast: boolean;
  forceExpand: boolean;
}) {
  const [localOpen, setLocalOpen] = useState(false);
  const isOpen = forceExpand || localOpen;

  const badgeLabel = getBadgeLabel(event);
  const timeStr    = format(toIST(event.occurredAt), "hh:mm a");
  const hasExtra   = !!(
    (event.metadata && Object.keys(event.metadata).length > 0) || event.source
  );

  // Even index → card on RIGHT; odd → card on LEFT
  const cardOnRight = globalIdx % 2 === 0;

  // Subtle left-border + bg tint per event type
  const cardAccent = (() => {
    const t = event.type?.toUpperCase() ?? "";
    if (t.includes("PAYMENT"))                                                    return "border-l-2 border-l-emerald-300 bg-emerald-50/40 dark:bg-emerald-950/20";
    if (t.includes("STATUS") || t.includes("STAGE") || t.includes("SUBSTATUS")) return "border-l-2 border-l-blue-300 bg-blue-50/40 dark:bg-blue-950/20";
    if (t.includes("ASSIGN") || t.includes("ROUTING") || t.includes("ROUTE"))   return "border-l-2 border-l-sky-300 bg-sky-50/40 dark:bg-sky-950/20";
    if (t.includes("NOTE"))                                                       return "border-l-2 border-l-amber-300 bg-amber-50/40 dark:bg-amber-950/20";
    if (t.includes("DOCUMENT"))                                                   return "border-l-2 border-l-purple-300 bg-purple-50/40 dark:bg-purple-950/20";
    if (t.includes("ENROLLMENT") || t.includes("ENROLL") || event.phase === "ENROLLMENT") return "border-l-2 border-l-violet-300 bg-violet-50/40 dark:bg-violet-950/20";
    return "border-l-2 border-l-border";
  })();

  // ── Card ──────────────────────────────────────────────────────────────────
  const card = (
    <div className={cn("rounded-lg border border-border overflow-hidden", cardAccent)}>
      <div className="px-3 py-2.5">
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0 flex items-center gap-2 flex-wrap">
            <span className="text-xs font-semibold text-foreground leading-tight">
              {event.title}
            </span>
            <span className="text-[9px] font-medium uppercase tracking-wide text-muted-foreground">
              {badgeLabel}
            </span>
          </div>
          {hasExtra && (
            <button
              onClick={() => setLocalOpen((v) => !v)}
              className="h-5 w-5 rounded flex items-center justify-center hover:bg-muted transition-colors text-muted-foreground shrink-0"
            >
              {isOpen ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
            </button>
          )}
        </div>
        <EventBody event={event} />
      </div>
      {isOpen && <ExtraMeta event={event} />}
    </div>
  );

  // ── Side info (time + actor, opposite the card) ────────────────────────────
  const sideInfo = (
    <div className={cn(
      "flex flex-col gap-1.5 pt-0.5",
      cardOnRight ? "items-end text-right" : "items-start text-left",
    )}>
      <span className="text-sm font-semibold text-foreground/60 tabular-nums leading-none">
        {timeStr}
      </span>
      {event.actor && (
        <div className={cardOnRight ? "text-right" : "text-left"}>
          <p className="text-[11px] font-medium text-foreground leading-tight">{event.actor.name}</p>
          <p className="text-[10px] text-muted-foreground capitalize leading-tight">
            {event.actor.role?.replace(/_/g, " ")}
          </p>
        </div>
      )}
    </div>
  );

  return (
    <>
      {/* ── Desktop: zigzag ─────────────────────────────────────────────────── */}
      <div className="hidden md:flex items-center mb-4">
        <div className="flex-1 min-w-0 pr-6 flex justify-end">
          {cardOnRight ? sideInfo : card}
        </div>

        {/* Center dot + line */}
        <div className="flex flex-col items-center shrink-0" style={{ width: 40 }}>
          <div className="h-3 w-3 rounded-full border-2 border-foreground/30 bg-card shrink-0 z-10" />
          {!isLast && <div className="w-px flex-1 bg-border mt-1 min-h-[48px]" />}
        </div>

        <div className="flex-1 min-w-0 pl-6">
          {cardOnRight ? card : sideInfo}
        </div>
      </div>

      {/* ── Mobile: left-aligned ────────────────────────────────────────────── */}
      <div className="flex md:hidden gap-2.5 mb-2.5">
        <div className="flex flex-col items-center" style={{ width: 32 }}>
          <span className="text-[10px] text-muted-foreground tabular-nums mt-2.5 text-center leading-none">
            {timeStr}
          </span>
        </div>
        <div className="flex flex-col items-center shrink-0">
          <div className="h-3 w-3 rounded-full border-2 border-foreground/30 bg-card shrink-0 mt-2" />
          {!isLast && <div className="w-px flex-1 bg-border/50 mt-1" />}
        </div>
        <div className="flex-1 min-w-0 pb-2">
          {card}
        </div>
      </div>
    </>
  );
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function TimelineSkeleton() {
  return (
    <div className="animate-pulse">
      {/* Summary strip skeleton */}
      <div className="mb-5 flex rounded-xl border border-border overflow-hidden divide-x divide-border">
        {[1,2,3,4,5].map((i) => (
          <div key={i} className="flex items-center gap-3 px-4 py-3 flex-1">
            <div className="h-8 w-8 rounded-lg bg-muted shrink-0" />
            <div className="space-y-1.5 flex-1">
              <div className="h-2.5 bg-muted rounded w-16" />
              <div className="h-3 bg-muted/80 rounded w-24" />
            </div>
          </div>
        ))}
      </div>
      {/* Filter pills skeleton */}
      <div className="flex gap-1.5 mb-6">
        {[72, 108, 80, 104, 84, 60].map((w, i) => (
          <div key={i} className="h-8 rounded-full bg-muted" style={{ width: w }} />
        ))}
      </div>
      {/* Date divider skeleton */}
      <div className="relative flex items-center justify-center my-8">
        <div className="absolute inset-x-0 h-px bg-border" />
        <div className="relative z-10 flex items-center gap-2 bg-card px-4">
          <div className="h-7 w-32 rounded-full bg-muted" />
          <div className="h-6 w-16 rounded-full bg-muted" />
        </div>
      </div>
      {/* Zigzag event skeletons */}
      {[0,1,2,3,4].map((i) => {
        const cardRight = i % 2 === 0;
        return (
          <div key={i} className="hidden md:flex items-start mb-6">
            <div className="flex-1 pr-8 flex justify-end">
              {cardRight ? (
                <div className="flex flex-col gap-2 items-end">
                  <div className="h-5 w-20 bg-muted rounded" />
                  <div className="flex items-center gap-2 flex-row-reverse">
                    <div className="h-8 w-8 rounded-full bg-muted" />
                    <div className="space-y-1 text-right">
                      <div className="h-3 w-20 bg-muted rounded ml-auto" />
                      <div className="h-2.5 w-14 bg-muted/60 rounded ml-auto" />
                    </div>
                  </div>
                </div>
              ) : (
                <div className="w-full rounded-2xl border border-border bg-muted/10 px-4 py-3 space-y-2">
                  <div className="h-4 bg-muted rounded w-40" />
                  <div className="h-5 bg-muted/60 rounded-full w-24" />
                  <div className="flex gap-2 mt-1">
                    <div className="h-6 bg-muted/50 rounded-full w-28" />
                    <div className="h-6 bg-muted/50 rounded-full w-28" />
                  </div>
                </div>
              )}
            </div>
            <div className="flex flex-col items-center shrink-0" style={{ width: 48 }}>
              <div className="h-3 w-3 rounded-full bg-muted mt-4" />
              {i < 4 && <div className="w-0.5 bg-muted/40 mt-1" style={{ height: 80 }} />}
            </div>
            <div className="flex-1 pl-8">
              {cardRight ? (
                <div className="w-full rounded-2xl border border-border bg-muted/10 px-4 py-3 space-y-2">
                  <div className="h-4 bg-muted rounded w-44" />
                  <div className="h-5 bg-muted/60 rounded-full w-20" />
                  {i % 2 === 0 && (
                    <div className="flex gap-2 mt-1">
                      <div className="h-6 bg-muted/50 rounded-full w-32" />
                      <div className="h-6 bg-muted/50 rounded-full w-32" />
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex flex-col gap-2 items-start">
                  <div className="h-5 w-20 bg-muted rounded" />
                  <div className="flex items-center gap-2">
                    <div className="h-8 w-8 rounded-full bg-muted" />
                    <div className="space-y-1">
                      <div className="h-3 w-20 bg-muted rounded" />
                      <div className="h-2.5 w-14 bg-muted/60 rounded" />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

interface ClientTimelineProps {
  events: TimelineEvent[];
  isLoading: boolean;
  counsellorName?: string;
}

export function ClientTimeline({ events, isLoading, counsellorName }: ClientTimelineProps) {
  const [activeFilter, setActiveFilter] = useState<FilterKey>("all");
  const [expandAll,    setExpandAll]    = useState(false);

  const todayStr = format(toIST(new Date()), "dd MMM yyyy");

  const filteredEvents = useMemo(() => {
    if (activeFilter === "all") return events;
    return events.filter((e) => getFilter(e) === activeFilter);
  }, [events, activeFilter]);

  // Group by date and assign a global index (for zigzag alternation)
  const groupedWithIdx = useMemo(() => {
    const map = new Map<string, TimelineEvent[]>();
    for (const ev of filteredEvents) {
      const label = format(toIST(ev.occurredAt), "dd MMM yyyy");
      if (!map.has(label)) map.set(label, []);
      map.get(label)!.push(ev);
    }
    let globalIdx = 0;
    return Array.from(map.entries()).map(([date, dayEvents]) => ({
      date,
      events: dayEvents.map((ev) => ({ ev, idx: globalIdx++ })),
    }));
  }, [filteredEvents]);

  if (isLoading) return <TimelineSkeleton />;

  return (
    <div>
      <CaseSummary events={events} counsellorName={counsellorName} />

      {/* Controls */}
      <div className="flex items-center justify-between gap-2 mb-6 flex-wrap">
        <div className="flex flex-wrap gap-1.5">
          {FILTER_TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveFilter(tab.key)}
              className={cn(
                "px-3 py-1.5 rounded-full text-[11px] font-semibold border transition-all",
                activeFilter === tab.key
                  ? "bg-primary text-primary-foreground border-primary shadow-sm"
                  : "bg-background text-muted-foreground border-border hover:text-foreground hover:border-primary/40 hover:bg-accent/30",
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <button
          onClick={() => setExpandAll((v) => !v)}
          className="flex items-center gap-1 text-[11px] font-semibold text-muted-foreground hover:text-foreground transition-colors"
        >
          <ChevronsUpDown className="h-3.5 w-3.5" />
          {expandAll ? "Collapse All" : "Expand All"}
        </button>
      </div>

      {/* Timeline */}
      {groupedWithIdx.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center gap-2">
          <CalendarDays className="h-8 w-8 text-muted-foreground/40" />
          <p className="text-sm font-medium text-muted-foreground">No events match this filter</p>
        </div>
      ) : (
        <div>
          {groupedWithIdx.map(({ date: dateLabel, events: dayEvents }) => (
            <div key={dateLabel}>
              <DateDivider label={dateLabel} isToday={dateLabel === todayStr} count={dayEvents.length} />
              {dayEvents.map(({ ev, idx }, i) => (
                <EventRow
                  key={ev.id}
                  event={ev}
                  globalIdx={idx}
                  isLast={i === dayEvents.length - 1}
                  forceExpand={expandAll}
                />
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
