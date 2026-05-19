import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Redirect } from "wouter";
import { useAuth } from "@/context/auth-context";
import { canAccessLeads, canAssignLead, canUseCsvImportExport } from "@/lib/lead-permissions";
import { useToast } from "@/hooks/use-toast";
import { Breadcrumbs } from "@/layout/Breadcrumbs";
import { DUMMY_ASSIGNEE_OPTIONS, DUMMY_LEADS, LEAD_STAGES, type DummyLead, type LeadStage, type LeadStatus } from "@/data/dummyLeads";
import { AddLead } from "@/components/add-lead";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Download, GripVertical, Loader2, MoreHorizontal, Plus, Target, X } from "lucide-react";

const UNASSIGNED_ID = "__unassigned__";

function getInitials(name: string) {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function statusBadgeVariant(status: LeadStatus): "default" | "secondary" | "outline" | "destructive" {
  switch (status) {
    case "new":
      return "secondary";
    case "contacted":
      return "default";
    case "qualified":
      return "outline";
    case "converted":
      return "default";
    case "lost":
      return "destructive";
    default:
      return "secondary";
  }
}

function stageAccentClasses(stage: LeadStage) {
  // Use primary accent with different opacity so the UI stays cohesive.
  switch (stage) {
    case "New":
      return "bg-primary/10 text-primary border-primary/20";
    case "Contacted":
      return "bg-primary/10 text-primary border-primary/20";
    case "Qualified":
      return "bg-primary/15 text-primary border-primary/25";
    case "Converted":
      return "bg-primary/15 text-primary border-primary/25";
  }
}

type SavedViewId = "all" | "new_contacted" | "my_leads" | "unassigned";

const SAVED_VIEWS: { id: SavedViewId; label: string }[] = [
  { id: "all", label: "All leads" },
  { id: "new_contacted", label: "New + Contacted" },
  { id: "my_leads", label: "My leads" },
  { id: "unassigned", label: "Unassigned" },
];

function LeadStatusBadge({ status }: { status: LeadStatus }) {
  // Premium CRM-style status pill (light tinted background + readable text)
  const map: Record<LeadStatus, { bg: string; text: string; border: string }> = {
    new: { bg: "bg-blue-50", text: "text-blue-700", border: "border-blue-200" },
    contacted: { bg: "bg-violet-50", text: "text-violet-700", border: "border-violet-200" },
    qualified: { bg: "bg-orange-50", text: "text-orange-700", border: "border-orange-200" },
    converted: { bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200" },
    lost: { bg: "bg-red-50", text: "text-red-700", border: "border-red-200" },
  };

  const theme = map[status];

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold capitalize whitespace-nowrap",
        theme.bg,
        theme.text,
        theme.border
      )}
    >
      {status}
    </span>
  );
}

function StatusBadge({ status }: { status: LeadStatus }) {
  return <LeadStatusBadge status={status} />;
}

type ChipMultiSelectOption = { value: string; label: string };

function ChipMultiSelect({
  label,
  options,
  selectedValues,
  onChangeSelected,
}: {
  label: string;
  options: ChipMultiSelectOption[];
  selectedValues: string[];
  onChangeSelected: (nextSelected: string[]) => void;
}) {
  const selectedLabels = options
    .filter((o) => selectedValues.includes(o.value))
    .map((o) => o.label);

  const chipText = selectedValues.length === 0 ? `All ${label}` : selectedLabels.join(", ");

  const toggleValue = (value: string, checked: boolean) => {
    if (checked) {
      if (selectedValues.includes(value)) return;
      onChangeSelected([...selectedValues, value]);
      return;
    }
    onChangeSelected(selectedValues.filter((v) => v !== value));
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          className="h-9 rounded-full px-3 justify-start gap-2"
        >
          <span className="text-muted-foreground text-sm">{label}</span>
          <span className="text-sm font-medium truncate max-w-[220px]">{chipText}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-[320px]">
        <DropdownMenuLabel>{label}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {options.map((opt) => (
          <DropdownMenuCheckboxItem
            key={opt.value}
            checked={selectedValues.includes(opt.value)}
            onCheckedChange={(checked) => toggleValue(opt.value, Boolean(checked))}
          >
            {opt.label}
          </DropdownMenuCheckboxItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function LeadStagePill({ stage }: { stage: LeadStage }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium",
        stageAccentClasses(stage)
      )}
    >
      {stage}
    </span>
  );
}

function LeadCard({
  lead,
  canDrag,
  isUpdating,
  onOpen,
  onDragStart,
  onDragEnd,
  onMoveToNext,
}: {
  lead: DummyLead;
  canDrag: boolean;
  isUpdating: boolean;
  onOpen: () => void;
  onDragStart?: (e: React.DragEvent) => void;
  onDragEnd?: (e: React.DragEvent) => void;
  onMoveToNext?: () => void;
}) {
  const dragSuppressedRef = useRef(false);

  return (
    <div
      role="button"
      tabIndex={0}
      draggable={canDrag}
      onDragStart={(e) => {
        dragSuppressedRef.current = true;
        onDragStart?.(e);
      }}
      onDragEnd={(e) => {
        onDragEnd?.(e);
        // reset after browser has had chance to dispatch click
        window.setTimeout(() => {
          dragSuppressedRef.current = false;
        }, 0);
      }}
      onClick={() => {
        if (dragSuppressedRef.current) return;
        onOpen();
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") onOpen();
      }}
      className={cn(
        "group rounded-xl border border-border/60 bg-background p-3 shadow-sm",
        canDrag && "cursor-grab active:cursor-grabbing",
        "transition-all hover:-translate-y-0.5 hover:shadow-md hover:border-primary/30",
        "focus:outline-none focus:ring-2 focus:ring-primary/20"
      )}
    >
      <div className="flex items-start gap-3">
        <div className="shrink-0 mt-0.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity">
          <GripVertical className="h-4 w-4" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="font-semibold text-sm truncate">{lead.name}</p>
              <p className="text-xs text-muted-foreground truncate">{lead.email}</p>
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={(e) => e.stopPropagation()}
                >
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                <DropdownMenuItem onSelect={onOpen}>View details</DropdownMenuItem>
                {onMoveToNext && (
                  <DropdownMenuItem onSelect={onMoveToNext}>Move to next stage</DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <div className="flex items-center gap-2 mt-2">
            <StatusBadge status={lead.status} />
            <LeadStagePill stage={lead.stage} />
          </div>

          <div className="flex items-center gap-2 mt-3">
            {lead.assignedToName ? (
              <>
                <Avatar className="h-7 w-7">
                  <AvatarFallback className="text-[10px] bg-primary/10 text-primary">
                    {getInitials(lead.assignedToName)}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground truncate">Assigned to</p>
                  <p className="text-xs font-medium truncate">{lead.assignedToName}</p>
                </div>
              </>
            ) : (
              <div className="text-xs text-muted-foreground italic">Unassigned</div>
            )}
          </div>
        </div>

        {isUpdating && (
          <div className="shrink-0">
            <Loader2 className="h-4 w-4 animate-spin text-primary" />
          </div>
        )}
      </div>
    </div>
  );
}

function LeadDetailSheet({
  open,
  lead,
  canAssign,
  onOpenChange,
  onUpdateLead,
  onMoveToNextStage,
}: {
  open: boolean;
  lead: DummyLead | null;
  canAssign: boolean;
  onOpenChange: (nextOpen: boolean) => void;
  onUpdateLead: (next: Partial<DummyLead>) => void;
  onMoveToNextStage: () => void;
}) {
  const [status, setStatus] = useState<LeadStatus>("new");
  const [stage, setStage] = useState<LeadStage>("New");
  const [assigneeId, setAssigneeId] = useState<string>(UNASSIGNED_ID);

  useEffect(() => {
    if (!lead) return;
    setStatus(lead.status);
    setStage(lead.stage);
    setAssigneeId(lead.assignedToId ?? UNASSIGNED_ID);
  }, [lead]);

  const handleSave = () => {
    if (!lead) return;
    const nextAssignee =
      assigneeId === UNASSIGNED_ID
        ? { assignedToId: null as string | null, assignedToName: null as string | null }
        : (() => {
            const opt = DUMMY_ASSIGNEE_OPTIONS.find((u) => u.id === assigneeId);
            return {
              assignedToId: assigneeId,
              assignedToName: opt?.name ?? null,
            };
          })();

    onUpdateLead({
      status,
      stage,
      ...nextAssignee,
    });
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="p-0 [&>button]:top-3 [&>button]:right-3">
        <div className="p-4 sm:p-6 pt-10 sm:pt-12 overflow-y-auto">
          {!lead ? (
            <div className="text-sm text-muted-foreground">No lead selected.</div>
          ) : (
            <>
              <SheetHeader className="space-y-2">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="space-y-2">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10">
                        <AvatarFallback className="text-[12px] bg-primary/10 text-primary">
                          {getInitials(lead.name)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <SheetTitle className="text-xl leading-tight">{lead.name}</SheetTitle>
                        <SheetDescription className="text-sm">
                          {lead.phone}
                        </SheetDescription>
                        <p className="text-sm text-muted-foreground">{lead.source}</p>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-start">
                    <Button variant="outline" size="sm" onClick={onMoveToNextStage}>
                      Next stage
                    </Button>
                  </div>
                </div>
              </SheetHeader>

              <Separator className="my-5" />

              <div className="space-y-4">
                <div className="flex flex-wrap items-center gap-2">
                  <StatusBadge status={status} />
                  <LeadStagePill stage={stage} />
                </div>

                <div className="grid gap-4">
                  <Card className="shadow-none border-border/60">
                    <CardContent className="p-4 space-y-3">
                      <div className="space-y-1">
                        <p className="text-xs text-muted-foreground">Email</p>
                        <p className="text-sm font-medium break-words">{lead.email}</p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-xs text-muted-foreground">Last follow-up</p>
                        <p className="text-sm font-medium">
                          {lead.lastFollowupAt ? format(new Date(lead.lastFollowupAt), "dd MMM yyyy") : "—"}
                        </p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-xs text-muted-foreground">Created</p>
                        <p className="text-sm font-medium">
                          {format(new Date(lead.createdAt), "dd MMM yyyy")}
                        </p>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="shadow-none border-border/60">
                    <CardContent className="p-4 space-y-3">
                      <div className="space-y-1">
                        <p className="text-xs text-muted-foreground">Assigned to</p>
                        <p className="text-sm font-medium break-words">
                          {lead.assignedToName ?? "Unassigned"}
                        </p>
                      </div>

                      <div className="space-y-2">
                        <p className="text-xs font-medium text-muted-foreground">Update</p>

                        <div className="grid gap-3">
                          <div className="space-y-1">
                            <p className="text-xs text-muted-foreground">Status</p>
                            <Select value={status} onValueChange={(v) => setStatus(v as LeadStatus)} disabled={!canAssign}>
                              <SelectTrigger className="h-10">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="new">New</SelectItem>
                                <SelectItem value="contacted">Contacted</SelectItem>
                                <SelectItem value="qualified">Qualified</SelectItem>
                                <SelectItem value="converted">Converted</SelectItem>
                                <SelectItem value="lost">Lost</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          <div className="space-y-1">
                            <p className="text-xs text-muted-foreground">Stage</p>
                            <Select value={stage} onValueChange={(v) => setStage(v as LeadStage)} disabled={!canAssign}>
                              <SelectTrigger className="h-10">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {LEAD_STAGES.map((s) => (
                                  <SelectItem key={s} value={s}>
                                    {s}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>

                          <div className="space-y-1">
                            <p className="text-xs text-muted-foreground">Assignee</p>
                            <Select value={assigneeId} onValueChange={setAssigneeId} disabled={!canAssign}>
                              <SelectTrigger className="h-10">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value={UNASSIGNED_ID}>Unassigned</SelectItem>
                                {DUMMY_ASSIGNEE_OPTIONS.map((u) => (
                                  <SelectItem key={u.id} value={u.id}>
                                    {u.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>

                          {canAssign ? (
                            <Button onClick={handleSave}>
                              Save changes
                            </Button>
                          ) : (
                            <div className="text-xs text-muted-foreground">You don’t have permission to edit this lead.</div>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                <div className="sticky bottom-0 bg-background border-t border-border/60 pt-3 mt-4 flex flex-wrap items-center gap-2 justify-between">
                  <Button variant="outline" onClick={() => window.open(`/leads/${lead.id}`, "_self")}>
                    Open full page
                  </Button>

                  <Button variant="ghost" className="text-muted-foreground" onClick={() => onOpenChange(false)}>
                    Close
                  </Button>
                </div>
              </div>
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

function LeadCardSkeleton() {
  return (
    <div className="rounded-xl border border-border/60 bg-background p-3 shadow-sm">
      <div className="flex items-start gap-3">
        <div className="h-4 w-4 rounded bg-muted animate-pulse" />
        <div className="flex-1 min-w-0 space-y-3">
          <div className="h-4 w-36 rounded bg-muted animate-pulse" />
          <div className="h-3 w-52 rounded bg-muted animate-pulse" />
          <div className="flex items-center gap-2">
            <div className="h-5 w-16 rounded-full bg-muted animate-pulse" />
            <div className="h-5 w-20 rounded-full bg-muted animate-pulse" />
          </div>
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-full bg-muted animate-pulse" />
            <div className="h-3 w-32 rounded bg-muted animate-pulse" />
          </div>
        </div>
      </div>
    </div>
  );
}

function LeadRow({
  lead,
  canEdit,
  onOpen,
  onMoveStage,
  onDelete,
}: {
  lead: DummyLead;
  canEdit: boolean;
  onOpen: () => void;
  onMoveStage: () => void;
  onDelete: () => void;
}) {
  const assigned = lead.assignedToName ?? "Unassigned";
  const lastActivity = lead.lastFollowupAt ? format(new Date(lead.lastFollowupAt), "dd MMM yyyy") : "—";

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") onOpen();
      }}
      className={cn(
        "rounded-xl border border-border/60 bg-background shadow-sm p-4",
        "transition-all hover:shadow-md hover:bg-muted/20 cursor-pointer"
      )}
    >
      {/* Mobile: stacked */}
      <div className="sm:hidden flex flex-col gap-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="font-semibold text-sm truncate">{lead.name}</div>
            <div className="text-xs text-muted-foreground truncate">{lead.email}</div>
          </div>

          <div onClick={(e) => e.stopPropagation()}>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="h-8 w-8 p-0 rounded-lg">
                  <span className="text-xl leading-none">⋯</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  onSelect={(e) => {
                    e.preventDefault();
                    onOpen();
                  }}
                >
                  View
                </DropdownMenuItem>
                <DropdownMenuItem
                  disabled={!canEdit || lead.stage === "Converted"}
                  onSelect={(e) => {
                    e.preventDefault();
                    onMoveStage();
                  }}
                >
                  Move stage
                </DropdownMenuItem>
                <DropdownMenuItem
                  disabled={!canEdit}
                  onSelect={(e) => {
                    e.preventDefault();
                    onDelete();
                  }}
                >
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <StatusBadge status={lead.status} />
          <span className="text-xs text-muted-foreground font-medium">{lead.stage}</span>
        </div>

        <div className="grid grid-cols-1 gap-2">
          <div className="flex items-center justify-between gap-3">
            <div className="text-xs text-muted-foreground">Assigned to</div>
            <div className="text-xs font-medium text-foreground truncate">{assigned}</div>
          </div>
          <div className="flex items-center justify-between gap-3">
            <div className="text-xs text-muted-foreground">Last Activity</div>
            <div className="text-xs font-medium text-foreground truncate">{lastActivity}</div>
          </div>
        </div>
      </div>

      {/* Desktop: grid */}
      <div className="hidden sm:grid sm:grid-cols-12 sm:items-center sm:gap-4">
        <div className="col-span-4 min-w-0">
          <div className="font-semibold text-sm truncate">{lead.name}</div>
          <div className="text-xs text-muted-foreground truncate">{lead.email}</div>
        </div>

        <div className="col-span-2">
          <StatusBadge status={lead.status} />
        </div>

        <div className="col-span-2">
          <span className="text-sm text-muted-foreground font-medium truncate block">{lead.stage}</span>
        </div>

        <div className="col-span-2 min-w-0">
          <span className="text-sm text-muted-foreground truncate block">{assigned}</span>
        </div>

        <div className="col-span-1">
          <span className="text-sm text-muted-foreground truncate block">{lastActivity}</span>
        </div>

        <div className="col-span-1 flex justify-end" onClick={(e) => e.stopPropagation()}>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0 rounded-lg">
                <span className="text-xl leading-none">⋯</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onSelect={(e) => {
                  e.preventDefault();
                  onOpen();
                }}
              >
                View
              </DropdownMenuItem>
              <DropdownMenuItem
                disabled={!canEdit || lead.stage === "Converted"}
                onSelect={(e) => {
                  e.preventDefault();
                  onMoveStage();
                }}
              >
                Move stage
              </DropdownMenuItem>
              <DropdownMenuItem
                disabled={!canEdit}
                onSelect={(e) => {
                  e.preventDefault();
                  onDelete();
                }}
              >
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>
  );
}

function LeadsList({
  leads,
  canEdit,
  onOpenLead,
  onMoveStage,
  onDeleteLead,
}: {
  leads: DummyLead[];
  canEdit: boolean;
  onOpenLead: (leadId: string) => void;
  onMoveStage: (leadId: string) => void;
  onDeleteLead: (leadId: string) => void;
}) {
  return (
    <div className="rounded-xl border border-border/60 bg-card shadow-sm overflow-hidden">
      {/* Sticky header (desktop) */}
      <div className="hidden md:block sticky top-0 z-10 bg-background/95 backdrop-blur border-b">
        <div className="px-4 py-3">
          <div className="grid grid-cols-12 gap-4 text-xs uppercase font-semibold tracking-wider text-muted-foreground">
            <div className="col-span-4">Name</div>
            <div className="col-span-2">Status</div>
            <div className="col-span-2">Stage</div>
            <div className="col-span-2">Assigned To</div>
            <div className="col-span-1">Last Activity</div>
            <div className="col-span-1 text-right">Actions</div>
          </div>
        </div>
      </div>

      <div className="p-3 space-y-3">
        {leads.map((lead) => (
          <LeadRow
            key={lead.id}
            lead={lead}
            canEdit={canEdit}
            onOpen={() => onOpenLead(lead.id)}
            onMoveStage={() => onMoveStage(lead.id)}
            onDelete={() => onDeleteLead(lead.id)}
          />
        ))}
      </div>
    </div>
  );
}

function stageColumnTheme(stage: LeadStage) {
  // Distinct per-stage palette so columns are instantly recognizable.
  // These use Tailwind default color scales.
  switch (stage) {
    case "New":
      return {
        icon: "🆕",
        text: "text-blue-700",
        border: "border-blue-500/60",
        headerBg: "bg-blue-500/10",
        bodyBg: "bg-blue-500/5",
        dot: "bg-blue-500",
      };
    case "Contacted":
      return {
        icon: "📞",
        text: "text-violet-700",
        border: "border-violet-500/60",
        headerBg: "bg-violet-500/10",
        bodyBg: "bg-violet-500/5",
        dot: "bg-violet-500",
      };
    case "Qualified":
      return {
        icon: "✅",
        text: "text-orange-700",
        border: "border-orange-500/60",
        headerBg: "bg-orange-500/10",
        bodyBg: "bg-orange-500/5",
        dot: "bg-orange-500",
      };
    case "Converted":
      return {
        icon: "🎉",
        text: "text-emerald-700",
        border: "border-emerald-500/60",
        headerBg: "bg-emerald-500/10",
        bodyBg: "bg-emerald-500/5",
        dot: "bg-emerald-500",
      };
  }
}

function StageColumn({
  title,
  stage,
  count,
  leads,
  isLoading,
  isDropTarget,
  onDragOver,
  onDragLeave,
  onDrop,
  onDragStart,
  onDragEnd,
  isUpdatingLeadId,
  onOpenLead,
  onMoveToNext,
}: {
  title: string;
  stage: LeadStage;
  count: number;
  leads: DummyLead[];
  isLoading?: boolean;
  isDropTarget: boolean;
  onDragOver?: (e: React.DragEvent) => void;
  onDragLeave?: (e: React.DragEvent) => void;
  onDrop?: (e: React.DragEvent) => void;
  onDragStart?: (e: React.DragEvent, lead: DummyLead) => void;
  onDragEnd?: (e: React.DragEvent) => void;
  isUpdatingLeadId: string | null;
  onOpenLead: (leadId: string) => void;
  onMoveToNext?: (leadId: string) => void;
}) {
  const theme = stageColumnTheme(stage);

  return (
    <div
      className={cn(
        "w-[360px] shrink-0 rounded-2xl border shadow-sm transition-all",
        theme.bodyBg,
        isDropTarget ? "ring-1 ring-primary/30 border-primary/50 -translate-y-[1px]" : "border-border/60"
      )}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
    >
      {/* Stage Header */}
      <div
        className={cn(
          "p-4 flex items-center justify-between gap-3 rounded-t-2xl border-l-4 pl-5",
          theme.headerBg,
          theme.border
        )}
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className={cn("h-9 w-9 rounded-xl flex items-center justify-center", theme.dot + " text-white")}>
            <span aria-hidden="true" className="text-sm">
              {theme.icon}
            </span>
          </div>
          <div className="min-w-0">
            <p className={cn("font-semibold text-base truncate", theme.text)}>{title}</p>
            <p className="text-xs text-muted-foreground mt-0.5">Pipeline stage</p>
          </div>
        </div>

        <span
          className={cn(
            "text-xs font-medium rounded-full px-2.5 py-1 border bg-background/50 whitespace-nowrap",
            theme.border,
            theme.text
          )}
        >
          {count}
        </span>
      </div>

      {/* Cards */}
      <div className="p-4 min-h-[420px] flex flex-col gap-3">
        {isLoading ? (
          <>
            <LeadCardSkeleton />
            <LeadCardSkeleton />
          </>
        ) : leads.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border/60 bg-muted/10 p-4 text-center">
            <p className="text-xs text-muted-foreground">No leads in this stage</p>
            <p className="text-xs text-muted-foreground mt-1">Drag a lead here or create a new one.</p>
          </div>
        ) : (
          leads.map((lead) => (
            <LeadCard
              key={lead.id}
              lead={lead}
              canDrag
              isUpdating={isUpdatingLeadId === lead.id}
              onOpen={() => onOpenLead(lead.id)}
              onDragStart={(e) => onDragStart?.(e, lead)}
              onDragEnd={onDragEnd}
              onMoveToNext={onMoveToNext ? () => onMoveToNext(lead.id) : undefined}
            />
          ))
        )}
      </div>
    </div>
  );
}

export default function LeadList() {
  const { user } = useAuth();
  const { toast } = useToast();

  const [isAddLeadOpen, setIsAddLeadOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [leads, setLeads] = useState<DummyLead[]>(DUMMY_LEADS);
  const [activeLeadId, setActiveLeadId] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [selectedStatuses, setSelectedStatuses] = useState<LeadStatus[]>([]);
  const [selectedStages, setSelectedStages] = useState<LeadStage[]>([]);
  const [selectedAssignees, setSelectedAssignees] = useState<string[]>([]);
  const [sortKey, setSortKey] = useState<"created_desc" | "created_asc" | "name_asc" | "followup_desc">("created_desc");
  const [savedView, setSavedView] = useState<SavedViewId>("all");

  const [dragOverStage, setDragOverStage] = useState<LeadStage | null>(null);
  const [isUpdatingLeadId, setIsUpdatingLeadId] = useState<string | null>(null);

  const canEdit = Boolean(user && canAssignLead(user.role));
  const canExport = Boolean(user && canUseCsvImportExport(user.role));

  useEffect(() => {
    const t = window.setTimeout(() => {
      setIsLoading(false);
    }, 450);
    return () => window.clearTimeout(t);
  }, []);

  useEffect(() => {
    if (!user) return;

    // Apply saved views as a UX shortcut.
    if (savedView === "all") {
      setSelectedStatuses([]);
      setSelectedStages([]);
      setSelectedAssignees([]);
      return;
    }

    if (savedView === "new_contacted") {
      setSelectedStatuses([]);
      setSelectedStages(["New", "Contacted"]);
      setSelectedAssignees([]);
      return;
    }

    if (savedView === "my_leads") {
      setSelectedStatuses([]);
      setSelectedStages([]);
      setSelectedAssignees(user.id ? [user.id] : []);
      return;
    }

    if (savedView === "unassigned") {
      setSelectedStatuses([]);
      setSelectedStages([]);
      setSelectedAssignees([UNASSIGNED_ID]);
      return;
    }
  }, [savedView, user]);

  if (!user || !canAccessLeads(user.role)) {
    return <Redirect to="/" />;
  }

  const activeLead = useMemo(() => {
    if (!activeLeadId) return null;
    return leads.find((l) => l.id === activeLeadId) ?? null;
  }, [activeLeadId, leads]);

  const handleLeadAdded = (lead: DummyLead) => {
    setLeads((prev) => [lead, ...prev]);
    toast({ title: "Lead added", description: `${lead.name} was added successfully.` });
  };

  const handleExportCsv = () => {
    toast({
      title: "Export CSV",
      description: "Export will be available when backend is connected. (Dummy action.)",
    });
  };

  const handleClearFilters = () => {
    setSearch("");
    setSelectedStatuses([]);
    setSelectedStages([]);
    setSelectedAssignees([]);
    setSortKey("created_desc");
    setSavedView("all");
  };

  const filteredLeads = useMemo(() => {
    const q = search.trim().toLowerCase();

    const matchesAssignee = (lead: DummyLead) => {
      if (selectedAssignees.length === 0) return true; // all
      const wantsUnassigned = selectedAssignees.includes(UNASSIGNED_ID);
      const hasAssignee = Boolean(lead.assignedToId);

      if (wantsUnassigned && !hasAssignee) return true;
      if (lead.assignedToId && selectedAssignees.includes(lead.assignedToId)) return true;
      return false;
    };

    const matches = (lead: DummyLead) => {
      if (q) {
        const matchesText =
          lead.name.toLowerCase().includes(q) ||
          lead.email.toLowerCase().includes(q) ||
          lead.phone.toLowerCase().includes(q);
        if (!matchesText) return false;
      }
      if (selectedStatuses.length > 0 && !selectedStatuses.includes(lead.status)) return false;
      if (selectedStages.length > 0 && !selectedStages.includes(lead.stage)) return false;
      if (!matchesAssignee(lead)) return false;
      return true;
    };

    return leads.filter(matches);
  }, [leads, search, selectedAssignees, selectedStages, selectedStatuses]);

  const sortedLeads = useMemo(() => {
    const list = [...filteredLeads];
    const dir = sortKey;

    list.sort((a, b) => {
      if (dir === "name_asc") return a.name.localeCompare(b.name);
      if (dir === "created_asc") return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      if (dir === "followup_desc") {
        const av = a.lastFollowupAt ? new Date(a.lastFollowupAt).getTime() : 0;
        const bv = b.lastFollowupAt ? new Date(b.lastFollowupAt).getTime() : 0;
        return bv - av;
      }
      // created_desc
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

    return list;
  }, [filteredLeads, sortKey]);

  const displayedStages = selectedStages.length === 0 ? LEAD_STAGES : selectedStages;

  const leadsByStage = useMemo(() => {
    const byStage: Record<LeadStage, DummyLead[]> = {
      New: [],
      Contacted: [],
      Qualified: [],
      Converted: [],
    };
    for (const lead of sortedLeads) {
      if (byStage[lead.stage]) byStage[lead.stage].push(lead);
    }
    return byStage;
  }, [sortedLeads]);

  const handleDragStart = (e: React.DragEvent, lead: DummyLead) => {
    e.dataTransfer.setData("leadId", lead.id);
    e.dataTransfer.setData("fromStage", lead.stage);
    e.dataTransfer.effectAllowed = "move";
    setDragOverStage(lead.stage);
  };

  const handleDragEnd = () => {
    setDragOverStage(null);
    setIsUpdatingLeadId(null);
  };

  const handleDrop = useCallback(
    (e: React.DragEvent, newStage: LeadStage) => {
      e.preventDefault();
      const leadId = e.dataTransfer.getData("leadId");
      const fromStage = e.dataTransfer.getData("fromStage") as LeadStage;
      setDragOverStage(null);
      if (!leadId || fromStage === newStage) return;

      const lead = leads.find((l) => l.id === leadId);
      if (!lead) return;

      setIsUpdatingLeadId(leadId);
      setLeads((prev) =>
        prev.map((l) =>
          l.id === leadId ? { ...l, stage: newStage, status: stageToStatusMap[newStage] } : l
        )
      );
      setIsUpdatingLeadId(null);

      toast({
        title: "Stage updated",
        description: `${lead.name} moved to ${newStage}.`,
      });
    },
    [leads, toast]
  );

  const getNextStage = (stage: LeadStage): LeadStage => {
    const idx = LEAD_STAGES.indexOf(stage);
    const next = LEAD_STAGES[idx + 1];
    return next ?? stage;
  };

  const moveLeadToNextStage = (leadId: string) => {
    const lead = leads.find((l) => l.id === leadId);
    if (!lead) return;
    const nextStage = getNextStage(lead.stage);
    if (nextStage === lead.stage) return;

    setIsUpdatingLeadId(leadId);
    setLeads((prev) =>
      prev.map((l) =>
        l.id === leadId ? { ...l, stage: nextStage, status: stageToStatusMap[nextStage] } : l
      )
    );
    setIsUpdatingLeadId(null);
    toast({ title: "Moved", description: `${lead.name} moved to ${nextStage}.` });
  };

  const updateLead = (leadId: string, next: Partial<DummyLead>) => {
    setLeads((prev) => prev.map((l) => (l.id === leadId ? { ...l, ...next } : l)));
    toast({ title: "Saved", description: "Lead updated successfully." });
  };

  const deleteLead = (leadId: string) => {
    const lead = leads.find((l) => l.id === leadId);
    if (!lead) return;

    setLeads((prev) => prev.filter((l) => l.id !== leadId));
    if (activeLeadId === leadId) setActiveLeadId(null);

    toast({ title: "Deleted", description: `${lead.name} removed from leads.` });
  };

  const statusOptions: ChipMultiSelectOption[] = [
    { value: "new", label: "New" },
    { value: "contacted", label: "Contacted" },
    { value: "qualified", label: "Qualified" },
    { value: "converted", label: "Converted" },
    { value: "lost", label: "Lost" },
  ];

  const stageOptions: ChipMultiSelectOption[] = LEAD_STAGES.map((s) => ({ value: s, label: s }));

  const stageToStatusMap: Record<LeadStage, LeadStatus> = {
    New: "new",
    Contacted: "contacted",
    Qualified: "qualified",
    Converted: "converted",
  };

  const assigneeOptions: ChipMultiSelectOption[] = [
    { value: UNASSIGNED_ID, label: "Unassigned" },
    ...DUMMY_ASSIGNEE_OPTIONS.map((u) => ({ value: u.id, label: u.name })),
  ];

  const totalCounts = useMemo(() => {
    const counts: Record<LeadStage, number> = { New: 0, Contacted: 0, Qualified: 0, Converted: 0 };
    for (const l of leads) counts[l.stage] += 1;
    return counts;
  }, [leads]);

  if (errorMessage) {
    return (
      <div className="space-y-4">
        <Card className="border-destructive/30 bg-destructive/5">
          <CardContent className="p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-destructive">Error loading leads</p>
                <p className="text-sm text-muted-foreground mt-1">{errorMessage}</p>
              </div>
              <Button variant="outline" onClick={() => setErrorMessage(null)}>
                Retry
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const headerSubtitle = "Track pipeline, assign owners, and move leads through stages—without losing context.";

  return (
    <div className="space-y-6">
      <Breadcrumbs
        items={[
          { label: "Leads", href: "/leads" },
          { label: "Management" },
        ]}
      />

      {/* Header */}
      <Card className="border-border/60 shadow-sm">
        <CardContent className="p-4 sm:p-5 space-y-4">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="flex items-start gap-3">
              <div className="rounded-2xl border border-border/60 bg-muted/20 p-3 shadow-sm">
                <Target className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h1 className="text-2xl font-semibold tracking-tight">Leads</h1>
                <p className="text-sm text-muted-foreground mt-1">{headerSubtitle}</p>
              </div>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <Button variant="default" className="shadow-md shadow-primary/20" onClick={() => setIsAddLeadOpen(true)}>
                Add Lead
              </Button>
              {canExport && (
                <Button variant="outline" onClick={handleExportCsv}>
                  Export CSV
                </Button>
              )}
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {LEAD_STAGES.map((s) => (
              <div
                key={s}
                className={cn(
                  "rounded-xl border px-3 py-3 shadow-sm bg-background",
                  s === "New" && "border-blue-200/80",
                  s === "Contacted" && "border-violet-200/80",
                  s === "Qualified" && "border-orange-200/80",
                  s === "Converted" && "border-emerald-200/80"
                )}
              >
                <p
                  className={cn(
                    "text-base font-bold leading-tight",
                    s === "New" && "text-blue-700",
                    s === "Contacted" && "text-violet-700",
                    s === "Qualified" && "text-orange-700",
                    s === "Converted" && "text-emerald-700"
                  )}
                >
                  In {s}
                </p>
                <p
                  className={cn(
                    "text-2xl font-bold leading-tight mt-1",
                    s === "New" && "text-blue-700",
                    s === "Contacted" && "text-violet-700",
                    s === "Qualified" && "text-orange-700",
                    s === "Converted" && "text-emerald-700"
                  )}
                >
                  {totalCounts[s]}
                </p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Toolbar */}
      <Card className="border-border/60 shadow-sm">
        <CardContent className="p-4 sm:p-5 space-y-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="relative flex-1 min-w-[240px]">
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search leads by name, email, or phone…"
                className="pr-3"
              />
              {search.trim().length > 0 && (
                <button
                  type="button"
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md px-2 py-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                  onClick={() => setSearch("")}
                  aria-label="Clear search"
                >
                  Clear
                </button>
              )}
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <Select value={savedView} onValueChange={(v) => setSavedView(v as SavedViewId)}>
                <SelectTrigger className="w-[190px] rounded-full">
                  <SelectValue placeholder="Saved views" />
                </SelectTrigger>
                <SelectContent>
                  {SAVED_VIEWS.map((v) => (
                    <SelectItem key={v.id} value={v.id}>
                      {v.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={sortKey} onValueChange={(v) => setSortKey(v as any)}>
                <SelectTrigger className="w-[190px] rounded-full">
                  <SelectValue placeholder="Sort" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="created_desc">Created (newest)</SelectItem>
                  <SelectItem value="created_asc">Created (oldest)</SelectItem>
                  <SelectItem value="followup_desc">Last follow-up</SelectItem>
                  <SelectItem value="name_asc">Name (A-Z)</SelectItem>
                </SelectContent>
              </Select>

              {(search.trim() !== "" || selectedStatuses.length > 0 || selectedStages.length > 0 || selectedAssignees.length > 0 || savedView !== "all") && (
                <Button variant="ghost" className="rounded-full px-3 text-muted-foreground" onClick={handleClearFilters}>
                  Clear
                </Button>
              )}
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <ChipMultiSelect
              label="Status"
              options={statusOptions}
              selectedValues={selectedStatuses}
              onChangeSelected={(next) => setSelectedStatuses(next as LeadStatus[])}
            />

            <ChipMultiSelect
              label="Stage"
              options={stageOptions}
              selectedValues={selectedStages}
              onChangeSelected={(next) => setSelectedStages(next as LeadStage[])}
            />

            <ChipMultiSelect
              label="Assignee"
              options={assigneeOptions}
              selectedValues={selectedAssignees}
              onChangeSelected={setSelectedAssignees}
            />
          </div>
        </CardContent>
      </Card>

      {/* Content */}
      {isLoading ? (
        <div className="p-3 space-y-3">
          {Array.from({ length: 7 }).map((_, i) => (
            <div
              key={i}
              className="rounded-xl border border-border/60 bg-background p-4 animate-pulse"
            >
              <div className="h-4 w-2/5 rounded bg-muted" />
              <div className="mt-2 h-3 w-3/5 rounded bg-muted" />
              <div className="mt-4 grid grid-cols-12 gap-4">
                <div className="col-span-2 h-6 rounded bg-muted" />
                <div className="col-span-2 h-6 rounded bg-muted" />
                <div className="col-span-2 h-6 rounded bg-muted" />
                <div className="col-span-2 h-6 rounded bg-muted" />
                <div className="col-span-2 h-6 rounded bg-muted" />
                <div className="col-span-2 h-6 rounded bg-muted" />
              </div>
            </div>
          ))}
        </div>
      ) : sortedLeads.length === 0 ? (
        <div className="mt-6">
          <Card className="border-border/60 shadow-sm">
            <CardContent className="p-8">
              <div className="flex flex-col items-center text-center space-y-3">
                <div className="h-12 w-12 rounded-full bg-muted animate-pulse" />
                <p className="text-base font-semibold">No leads match your filters</p>
                <p className="text-sm text-muted-foreground max-w-md">
                  Try clearing filters or add a new lead to start your pipeline.
                </p>
                <div className="flex gap-2 flex-wrap justify-center">
                  <Button variant="default" onClick={() => setIsAddLeadOpen(true)}>
                    Add Lead
                  </Button>
                  <Button variant="outline" onClick={handleClearFilters}>
                    Clear filters
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      ) : (
        <LeadsList
          leads={sortedLeads}
          canEdit={canEdit}
          onOpenLead={(leadId) => setActiveLeadId(leadId)}
          onMoveStage={(leadId) => moveLeadToNextStage(leadId)}
          onDeleteLead={(leadId) => deleteLead(leadId)}
        />
      )}

      <AddLead open={isAddLeadOpen} onOpenChange={setIsAddLeadOpen} onLeadAdded={handleLeadAdded} />

      <LeadDetailSheet
        open={Boolean(activeLeadId)}
        lead={activeLead}
        canAssign={canEdit}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) setActiveLeadId(null);
        }}
        onMoveToNextStage={() => {
          if (!activeLead) return;
          moveLeadToNextStage(activeLead.id);
        }}
        onUpdateLead={(next) => {
          if (!activeLead) return;
          updateLead(activeLead.id, next);
        }}
      />
    </div>
  );
}

function MobileBoard({
  leadsByStage,
  displayedStages,
  isUpdatingLeadId,
  onOpenLead,
  onMoveToNext,
}: {
  leadsByStage: Record<LeadStage, DummyLead[]>;
  displayedStages: LeadStage[];
  isUpdatingLeadId: string | null;
  onOpenLead: (leadId: string) => void;
  onMoveToNext: (leadId: string) => void;
}) {
  const [activeStage, setActiveStage] = useState<LeadStage>(displayedStages[0] ?? "New");

  useEffect(() => {
    if (displayedStages.length === 0) return;
    if (!displayedStages.includes(activeStage)) setActiveStage(displayedStages[0]);
  }, [displayedStages, activeStage]);

  return (
    <div className="space-y-3">
      <Tabs value={activeStage} onValueChange={(v) => setActiveStage(v as LeadStage)}>
        <TabsList className="w-full justify-start overflow-x-auto">
          {displayedStages.map((stage) => (
            <TabsTrigger key={stage} value={stage}>
              {stage}
            </TabsTrigger>
          ))}
        </TabsList>

        {displayedStages.map((stage) => (
          <TabsContent key={stage} value={stage} className="pt-3">
            <div className="space-y-3">
              {(leadsByStage[stage] ?? []).length === 0 ? (
                <div className="rounded-xl border border-dashed border-border/60 bg-muted/10 p-5 text-center">
                  <p className="text-sm font-medium">No leads</p>
                  <p className="text-xs text-muted-foreground mt-1">Adjust filters to see more.</p>
                </div>
              ) : (
                (leadsByStage[stage] ?? []).map((lead) => (
                  <LeadCard
                    key={lead.id}
                    lead={lead}
                    canDrag={false}
                    isUpdating={isUpdatingLeadId === lead.id}
                    onOpen={() => onOpenLead(lead.id)}
                    onMoveToNext={lead.stage !== "Converted" ? () => onMoveToNext(lead.id) : undefined}
                  />
                ))
              )}
            </div>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
