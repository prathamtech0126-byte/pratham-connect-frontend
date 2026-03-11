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
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Search, GripVertical, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

const STATUS_OPTIONS = [
  { value: "all", label: "All statuses" },
  { value: "new", label: "New" },
  { value: "contacted", label: "Contacted" },
  { value: "qualified", label: "Qualified" },
  { value: "converted", label: "Converted" },
  { value: "lost", label: "Lost" },
];

function getInitials(name: string) {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

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

  // Initialize and sync leads from dummy data when filters change
  const filteredSource = useMemo(() => {
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
    if (assigneeFilter !== "all") list = list.filter((l) => l.assignedToId === assigneeFilter);
    return list;
  }, [search, statusFilter, assigneeFilter]);

  // Sync local leads when filters change (so board shows filtered set)
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
    if (assigneeFilter !== "all") list = list.filter((l) => l.assignedToId === assigneeFilter);
    setLeads(list);
  }, [search, statusFilter, assigneeFilter]);

  // Group current leads by stage for columns
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
    e.currentTarget.classList.add("opacity-50");
  };

  const handleDragEnd = (e: React.DragEvent) => {
    e.currentTarget.classList.remove("opacity-50");
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
      // When API exists: leadService.updateLead(leadId, { stage: newStage }).then(() => invalidate)
    },
    [leads, toast]
  );

  if (!user || !canAccessLeads(user.role)) {
    return <Redirect to="/" />;
  }

  const displayLeadsByStage = leadsByStage;

  return (
    <PageWrapper
      title="Kanban"
      breadcrumbs={[
        { label: "Leads", href: "/leads" },
        { label: "Kanban" },
      ]}
    >
      <div className="space-y-4">
        {/* Filters */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:flex-wrap">
          <div className="relative flex-1 min-w-[180px] max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search name, email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              {STATUS_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={assigneeFilter} onValueChange={setAssigneeFilter}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Assigned to" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All assignees</SelectItem>
              {DUMMY_ASSIGNEE_OPTIONS.map((u) => (
                <SelectItem key={u.id} value={u.id}>
                  {u.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Board */}
        <div className="overflow-x-auto pb-4 -mx-2 px-2">
          <div className="flex gap-4 min-w-max">
            {LEAD_STAGES.map((stage) => (
              <Column
                key={stage}
                stage={stage}
                leads={displayLeadsByStage[stage]}
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
  stage,
  leads,
  isDropTarget,
  onDragOver,
  onDragLeave,
  onDrop,
  onDragStart,
  onDragEnd,
  isUpdating,
  onCardClick,
}: ColumnProps) {
  return (
    <div
      className={cn(
        "w-72 shrink-0 rounded-xl border-2 border-dashed transition-colors",
        isDropTarget
          ? "border-primary bg-primary/5"
          : "border-border/60 bg-muted/20"
      )}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
    >
      <CardHeader className="py-3 px-4 border-b border-border/60">
        <div className="flex items-center justify-between">
          <span className="font-semibold text-sm">{stage}</span>
          <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
            {leads.length}
          </span>
        </div>
      </CardHeader>
      <CardContent className="p-2 min-h-[200px] flex flex-col gap-2">
        {leads.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-8 px-2">
            No leads
          </p>
        ) : (
          leads.map((lead) => (
            <KanbanCard
              key={lead.id}
              lead={lead}
              isUpdating={isUpdating === lead.id}
              onDragStart={(e) => onDragStart(e, lead)}
              onDragEnd={onDragEnd}
              onClick={() => onCardClick(lead)}
            />
          ))
        )}
      </CardContent>
    </div>
  );
}

interface KanbanCardProps {
  lead: DummyLead;
  isUpdating: boolean;
  onDragStart: (e: React.DragEvent) => void;
  onDragEnd: (e: React.DragEvent) => void;
  onClick: () => void;
}

function KanbanCard({ lead, isUpdating, onDragStart, onDragEnd, onClick }: KanbanCardProps) {
  return (
    <div
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onClick={onClick}
      className={cn(
        "group rounded-lg border border-border/60 bg-card p-3 shadow-sm cursor-grab active:cursor-grabbing",
        "hover:border-primary/40 hover:shadow-md transition-all",
        "focus:outline-none focus:ring-2 focus:ring-primary/20"
      )}
    >
      <div className="flex items-start gap-2">
        <div className="shrink-0 mt-0.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity">
          <GripVertical className="h-4 w-4" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm truncate">{lead.name}</p>
          <p className="text-xs text-muted-foreground truncate">{lead.email}</p>
          <div className="flex items-center gap-2 mt-2">
            {lead.assignedToName ? (
              <>
                <Avatar className="h-6 w-6">
                  <AvatarFallback className="text-[10px] bg-primary/10 text-primary">
                    {getInitials(lead.assignedToName)}
                  </AvatarFallback>
                </Avatar>
                <span className="text-xs text-muted-foreground truncate">
                  {lead.assignedToName}
                </span>
              </>
            ) : (
              <span className="text-xs text-muted-foreground italic">Unassigned</span>
            )}
          </div>
        </div>
        {isUpdating && (
          <Loader2 className="h-4 w-4 animate-spin text-primary shrink-0" />
        )}
      </div>
    </div>
  );
}
