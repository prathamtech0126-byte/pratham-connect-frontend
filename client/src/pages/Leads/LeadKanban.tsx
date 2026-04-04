import { useState, useMemo, useCallback, useEffect } from "react";
import { useLocation } from "wouter";
import { PageWrapper } from "@/layout/PageWrapper";
import { useAuth } from "@/context/auth-context";
import { canAccessLeads } from "@/lib/lead-permissions";
import { Redirect } from "wouter";
import {
  DUMMY_LEADS,
  DUMMY_ASSIGNEE_OPTIONS,
  LEAD_STAGES,
  type DummyLead,
  type LeadStage,
} from "@/data/dummyLeads";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Search,
  GripVertical,
  Loader2,
  User2,
  Mail,
  TrendingUp,
  Users,
  CheckCircle2,
  Activity,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

// ─────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────

const STATUS_OPTIONS = [
  { value: "all", label: "All statuses" },
  { value: "new", label: "New" },
  { value: "contacted", label: "Contacted" },
  { value: "qualified", label: "Qualified" },
  { value: "converted", label: "Converted" },
  { value: "lost", label: "Lost" },
];

const STAGE_CONFIG: Record<
  LeadStage,
  { accent: string; badge: string; dot: string }
> = {
  New: {
    accent: "text-sky-400",
    badge: "bg-sky-500/10 text-sky-400 ring-1 ring-sky-500/20",
    dot: "bg-sky-400",
  },
  Contacted: {
    accent: "text-violet-400",
    badge: "bg-violet-500/10 text-violet-400 ring-1 ring-violet-500/20",
    dot: "bg-violet-400",
  },
  Qualified: {
    accent: "text-amber-400",
    badge: "bg-amber-500/10 text-amber-400 ring-1 ring-amber-500/20",
    dot: "bg-amber-400",
  },
  Converted: {
    accent: "text-emerald-400",
    badge: "bg-emerald-500/10 text-emerald-400 ring-1 ring-emerald-500/20",
    dot: "bg-emerald-400",
  },
};

function getInitials(name: string) {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

// ─────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────

export default function LeadKanban() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [assigneeFilter, setAssigneeFilter] = useState("all");
  const [leads, setLeads] = useState<DummyLead[]>([]);
  const [isUpdating, setIsUpdating] = useState<string | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<LeadStage | null>(null);

  useEffect(() => {
    let list = [...DUMMY_LEADS];
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (l) =>
          l.name.toLowerCase().includes(q) ||
          l.email.toLowerCase().includes(q) ||
          l.phone.includes(q)
      );
    }
    if (statusFilter !== "all") list = list.filter((l) => l.status === statusFilter);
    if (assigneeFilter !== "all")
      list = list.filter((l) => l.assignedToId === assigneeFilter);
    setLeads(list);
  }, [search, statusFilter, assigneeFilter]);

  // ── Stats derived from ALL leads (unfiltered) ──
  const stats = useMemo(() => {
    const all = DUMMY_LEADS;
    const converted = all.filter((l) => l.stage === "Converted").length;
    const convRate = all.length ? Math.round((converted / all.length) * 100) : 0;
    const active = all.filter((l) => l.stage !== "Converted").length;
    return { total: all.length, converted, convRate, active };
  }, []);

  const leadsByStage = useMemo(() => {
    const byStage: Record<LeadStage, DummyLead[]> = {
      New: [],
      Contacted: [],
      Qualified: [],
      Converted: [],
    };
    leads.forEach((lead) => {
      if (byStage[lead.stage]) byStage[lead.stage].push(lead);
    });
    return byStage;
  }, [leads]);

  const handleDragStart = (e: React.DragEvent, lead: DummyLead) => {
    e.dataTransfer.setData("leadId", lead.id);
    e.dataTransfer.setData("fromStage", lead.stage);
    e.dataTransfer.effectAllowed = "move";
    e.currentTarget.classList.add("opacity-40", "scale-95");
  };

  const handleDragEnd = (e: React.DragEvent) => {
    e.currentTarget.classList.remove("opacity-40", "scale-95");
    setDragOverColumn(null);
  };

  const handleDragOver = (e: React.DragEvent, stage: LeadStage) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragOverColumn(stage);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    if (!e.currentTarget.contains(e.relatedTarget as Node)) setDragOverColumn(null);
  };

  const handleDrop = useCallback(
    (e: React.DragEvent, newStage: LeadStage) => {
      e.preventDefault();
      setDragOverColumn(null);
      const leadId = e.dataTransfer.getData("leadId");
      const fromStage = e.dataTransfer.getData("fromStage") as LeadStage;
      if (!leadId || fromStage === newStage) return;
      const lead = leads.find((l) => l.id === leadId);
      if (!lead) return;
      setIsUpdating(leadId);
      setLeads((prev) =>
        prev.map((l) => (l.id === leadId ? { ...l, stage: newStage } : l))
      );
      setIsUpdating(null);
      toast({
        title: "Stage updated",
        description: `${lead.name} moved to ${newStage}.`,
      });
    },
    [leads, toast]
  );

  if (!user || !canAccessLeads(user.role)) return <Redirect to="/" />;

  return (
    <PageWrapper
      title="Kanban"
      breadcrumbs={[{ label: "Leads", href: "/leads" }, { label: "Kanban" }]}
    >
      <div className="space-y-4">

        {/* ══════════════════════════════════════
            QUICK STATS BAR
        ══════════════════════════════════════ */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatCard
            icon={<Users className="h-4 w-4 text-sky-400" />}
            label="Total Leads"
            value={stats.total}
            bg="bg-sky-500/6 border-sky-500/15"
          />
          <StatCard
            icon={<Activity className="h-4 w-4 text-violet-400" />}
            label="Active"
            value={stats.active}
            bg="bg-violet-500/6 border-violet-500/15"
          />
          <StatCard
            icon={<CheckCircle2 className="h-4 w-4 text-emerald-400" />}
            label="Converted"
            value={stats.converted}
            bg="bg-emerald-500/6 border-emerald-500/15"
          />
          <StatCard
            icon={<TrendingUp className="h-4 w-4 text-amber-400" />}
            label="Conv. Rate"
            value={`${stats.convRate}%`}
            bg="bg-amber-500/6 border-amber-500/15"
          />
        </div>

        {/* ══════════════════════════════════════
            FILTERS
        ══════════════════════════════════════ */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:flex-wrap">
          <div className="relative flex-1 min-w-[200px] max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/60" />
            <Input
              placeholder="Search leads…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-9 rounded-lg bg-muted/40 border-border/40 text-sm placeholder:text-muted-foreground/50 focus-visible:ring-1 focus-visible:ring-primary/40"
            />
          </div>

          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[148px] h-9 rounded-lg bg-muted/40 border-border/40 text-sm">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              {STATUS_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={assigneeFilter} onValueChange={setAssigneeFilter}>
            <SelectTrigger className="w-[160px] h-9 rounded-lg bg-muted/40 border-border/40 text-sm">
              <SelectValue placeholder="Assigned to" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All assignees</SelectItem>
              {DUMMY_ASSIGNEE_OPTIONS.map((u) => (
                <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <span className="ml-auto text-xs text-muted-foreground/60 font-medium tracking-wide tabular-nums">
            {leads.length} lead{leads.length !== 1 ? "s" : ""}
          </span>
        </div>

        {/* ══════════════════════════════════════
            KANBAN BOARD
        ══════════════════════════════════════ */}
        <div className="overflow-x-auto pb-4 -mx-1 px-1">
          <div className="flex gap-3 min-w-max">
            {LEAD_STAGES.map((stage) => (
              <Column
                key={stage}
                stage={stage}
                leads={leadsByStage[stage]}
                isDropTarget={dragOverColumn === stage}
                onDragOver={(e) => handleDragOver(e, stage)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, stage)}
                onDragStart={handleDragStart}
                onDragEnd={handleDragEnd}
                isUpdating={isUpdating}
                onCardClick={(lead) => setLocation(`/leads/${lead.id}`)}
              />
            ))}
          </div>
        </div>
      </div>
    </PageWrapper>
  );
}

// ─────────────────────────────────────────────
// StatCard
// ─────────────────────────────────────────────

function StatCard({
  icon,
  label,
  value,
  bg,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  bg: string;
}) {
  return (
    <div className={cn("rounded-xl border px-4 py-3 flex items-center gap-3", bg)}>
      <div className="shrink-0">{icon}</div>
      <div className="min-w-0">
        <p className="text-[11px] text-muted-foreground/60 font-medium truncate">{label}</p>
        <p className="text-lg font-bold tabular-nums leading-tight">{value}</p>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// Column
// ─────────────────────────────────────────────

interface ColumnProps {
  stage: LeadStage;
  leads: DummyLead[];
  isDropTarget: boolean;
  onDragOver: (e: React.DragEvent) => void;
  onDragLeave: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent) => void;
  onDragStart: (e: React.DragEvent, lead: DummyLead) => void;
  onDragEnd: (e: React.DragEvent) => void;
  isUpdating: string | null;
  onCardClick: (lead: DummyLead) => void;
}

function Column({
  stage, leads, isDropTarget,
  onDragOver, onDragLeave, onDrop,
  onDragStart, onDragEnd, isUpdating, onCardClick,
}: ColumnProps) {
  const cfg = STAGE_CONFIG[stage];

  return (
    <div
      className={cn(
        "w-[268px] shrink-0 flex flex-col rounded-2xl border transition-all duration-200",
        isDropTarget
          ? "border-primary/40 bg-primary/5 shadow-lg shadow-primary/10 scale-[1.01]"
          : "border-border/30 bg-muted/10"
      )}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
    >
      <div className="flex items-center gap-2.5 px-4 py-3 border-b border-border/20">
        <span className={cn("h-2 w-2 rounded-full shrink-0", cfg.dot)} />
        <span className={cn("font-semibold text-[13px] tracking-wide flex-1", cfg.accent)}>
          {stage}
        </span>
        <span className={cn("text-[11px] font-semibold px-2 py-0.5 rounded-full tabular-nums", cfg.badge)}>
          {leads.length}
        </span>
      </div>

      <div className="p-2 flex flex-col gap-2 min-h-[180px]">
        {leads.length === 0 ? (
          <div className="flex flex-col items-center justify-center flex-1 py-10 gap-2 select-none">
            <div className="h-8 w-8 rounded-full border border-dashed border-border/40 flex items-center justify-center">
              <span className="text-muted-foreground/30 text-lg leading-none">+</span>
            </div>
            <p className="text-[11px] text-muted-foreground/40">Drop here</p>
          </div>
        ) : (
          leads.map((lead) => (
            <KanbanCard
              key={lead.id}
              lead={lead}
              stage={stage}
              isUpdating={isUpdating === lead.id}
              onDragStart={(e) => onDragStart(e, lead)}
              onDragEnd={onDragEnd}
              onClick={() => onCardClick(lead)}
            />
          ))
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// KanbanCard
// ─────────────────────────────────────────────

interface KanbanCardProps {
  lead: DummyLead;
  stage: LeadStage;
  isUpdating: boolean;
  onDragStart: (e: React.DragEvent) => void;
  onDragEnd: (e: React.DragEvent) => void;
  onClick: () => void;
}

function KanbanCard({ lead, stage, isUpdating, onDragStart, onDragEnd, onClick }: KanbanCardProps) {
  const cfg = STAGE_CONFIG[stage];

  return (
    <div
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onClick={onClick}
      tabIndex={0}
      onKeyDown={(e) => e.key === "Enter" && onClick()}
      className={cn(
        "group relative rounded-xl border border-border/30 bg-card/70 backdrop-blur-sm",
        "px-3.5 py-3 cursor-grab active:cursor-grabbing select-none",
        "shadow-sm transition-all duration-150",
        "hover:border-border/60 hover:shadow-md hover:-translate-y-0.5",
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
      )}
    >
      <div className="flex items-start justify-between gap-2 mb-1.5">
        <p className="font-semibold text-[13px] leading-snug text-foreground truncate flex-1">
          {lead.name}
        </p>
        <div className="flex items-center gap-1 shrink-0">
          {isUpdating && <Loader2 className="h-3.5 w-3.5 animate-spin text-primary/60" />}
          <GripVertical className="h-3.5 w-3.5 text-muted-foreground/30 opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
      </div>

      <div className="flex items-center gap-1.5 mb-3">
        <Mail className="h-3 w-3 text-muted-foreground/40 shrink-0" />
        <p className="text-[11px] text-muted-foreground/60 truncate">{lead.email}</p>
      </div>

      <div className="h-px bg-border/20 mb-2.5" />

      <div className="flex items-center gap-2">
        {lead.assignedToName ? (
          <>
            <Avatar className="h-5 w-5 shrink-0">
              <AvatarFallback className="text-[9px] font-bold bg-primary/10 text-primary">
                {getInitials(lead.assignedToName)}
              </AvatarFallback>
            </Avatar>
            <span className="text-[11px] text-muted-foreground/70 truncate">
              {lead.assignedToName}
            </span>
          </>
        ) : (
          <>
            <div className="h-5 w-5 rounded-full border border-dashed border-border/40 flex items-center justify-center shrink-0">
              <User2 className="h-2.5 w-2.5 text-muted-foreground/30" />
            </div>
            <span className="text-[11px] text-muted-foreground/40 italic">Unassigned</span>
          </>
        )}
      </div>

      <div
        className={cn(
          "absolute left-0 top-3 bottom-3 w-[3px] rounded-full opacity-0 group-hover:opacity-100 transition-opacity",
          cfg.dot
        )}
      />
    </div>
  );
}
