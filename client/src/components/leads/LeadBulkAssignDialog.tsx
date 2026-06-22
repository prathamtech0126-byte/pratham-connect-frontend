import { useCallback, useEffect, useMemo, useState } from "react";
import {
  bulkAssignLeadsApi,
  bulkStrategyAssignLeadsApi,
  previewBulkStrategyAssignApi,
  revertLeadJunkApi,
  type BulkStrategyAssignPreview,
  type LeadEntity,
} from "@/api/leads.api";
import { LEAD_DISTRIBUTION_STRATEGIES } from "@/lib/lead-distribution-strategies";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Pencil, TrendingUp, UserCheck, Users } from "lucide-react";

type TeamMember = { id: number; fullName: string };

type AssignMode = "direct" | "strategy";

type Step =
  | "mode"
  | "direct_assignee"
  | "direct_confirm"
  | "strategy_setup"
  | "strategy_preview"
  | "strategy_confirm";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  transferableLeads: LeadEntity[];
  blockedCount: number;
  isJunkRestoreMode: boolean;
  telecallers: TeamMember[];
  counsellors: TeamMember[];
  onSuccess: (updated: LeadEntity[]) => void;
};

function MemberSelectRow({
  member,
  checked,
  onToggle,
  color,
  showPriority,
  priority,
  onSetPriority,
}: {
  member: TeamMember;
  checked: boolean;
  onToggle: () => void;
  color: "blue" | "purple";
  showPriority: boolean;
  priority?: number;
  onSetPriority: (value: number) => void;
}) {
  const { toast } = useToast();
  const [editing, setEditing] = useState(false);
  const [inputVal, setInputVal] = useState(priority ? String(priority) : "");

  useEffect(() => {
    if (!editing) setInputVal(priority ? String(priority) : "");
  }, [priority, editing]);

  const bg = color === "blue" ? "bg-blue-50 border-blue-200" : "bg-purple-50 border-purple-200";
  const neutral = "bg-muted/10 border-transparent hover:border-border";

  const handleSet = () => {
    const n = parseInt(inputVal, 10);
    if (isNaN(n) || n < 1 || n > 99) {
      toast({
        title: "Invalid priority",
        description: "Enter a number between 1 and 99.",
        variant: "destructive",
      });
      return;
    }
    onSetPriority(n);
    setEditing(false);
  };

  const priorityControls =
    showPriority && checked ? (
      <div className="flex flex-wrap items-center gap-1.5 pl-7">
        {editing || priority == null ? (
          <>
            <Input
              type="number"
              min={1}
              max={99}
              className="h-8 w-16 px-2 text-xs"
              placeholder="1–99"
              value={inputVal}
              onChange={(e) => setInputVal(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSet()}
            />
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-8 shrink-0 px-3 text-xs"
              onClick={handleSet}
            >
              Set
            </Button>
            {priority != null ? (
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="h-8 shrink-0 px-2 text-xs"
                onClick={() => setEditing(false)}
              >
                Cancel
              </Button>
            ) : null}
          </>
        ) : (
          <>
            <span className="rounded border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-bold text-amber-600">
              Priority: {priority}
            </span>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="h-8 shrink-0 gap-1 px-2 text-xs"
              onClick={() => {
                setInputVal(String(priority));
                setEditing(true);
              }}
            >
              <Pencil className="h-3 w-3" />
              Edit
            </Button>
          </>
        )}
      </div>
    ) : null;

  return (
    <div
      className={`rounded-lg border p-2 transition-all ${checked ? bg : neutral} ${
        showPriority && checked ? "space-y-2" : ""
      }`}
    >
      <div className="flex min-w-0 items-center gap-2">
        <Checkbox
          id={`bulk-${color}-${member.id}`}
          checked={checked}
          onCheckedChange={() => onToggle()}
          className="shrink-0"
        />
        <label
          htmlFor={`bulk-${color}-${member.id}`}
          className="min-w-0 flex-1 cursor-pointer text-sm font-medium leading-snug"
        >
          {member.fullName}
        </label>
      </div>
      {priorityControls}
    </div>
  );
}

export function LeadBulkAssignDialog({
  open,
  onOpenChange,
  transferableLeads,
  blockedCount,
  isJunkRestoreMode,
  telecallers,
  counsellors,
  onSuccess,
}: Props) {
  const { toast } = useToast();
  const leadIds = useMemo(() => transferableLeads.map((l) => l.id), [transferableLeads]);
  const transferableCount = transferableLeads.length;

  const [step, setStep] = useState<Step>(isJunkRestoreMode ? "direct_assignee" : "mode");
  const [mode, setMode] = useState<AssignMode>("direct");
  const [submitting, setSubmitting] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);

  const [targetTelecallerId, setTargetTelecallerId] = useState("");
  const [targetCounsellorId, setTargetCounsellorId] = useState("");
  const [removeFromPrevious, setRemoveFromPrevious] = useState(false);

  const [strategy, setStrategy] = useState("round_robin");
  const [selectedTelecallers, setSelectedTelecallers] = useState<Set<number>>(new Set());
  const [selectedCounsellors, setSelectedCounsellors] = useState<Set<number>>(new Set());
  const [priorityWeights, setPriorityWeights] = useState<Record<string, number>>({});
  const [preview, setPreview] = useState<BulkStrategyAssignPreview | null>(null);

  const resetState = useCallback(() => {
    setStep(isJunkRestoreMode ? "direct_assignee" : "mode");
    setMode("direct");
    setTargetTelecallerId("");
    setTargetCounsellorId("");
    setRemoveFromPrevious(false);
    setStrategy("round_robin");
    setSelectedTelecallers(new Set());
    setSelectedCounsellors(new Set());
    setPriorityWeights({});
    setPreview(null);
  }, [isJunkRestoreMode]);

  useEffect(() => {
    if (!open) resetState();
  }, [open, resetState]);

  const directTargetName =
    counsellors.find((c) => String(c.id) === targetCounsellorId)?.fullName ??
    telecallers.find((t) => String(t.id) === targetTelecallerId)?.fullName ??
    "";

  const toTelecaller = Boolean(targetTelecallerId);
  const directConflictCount = useMemo(() => {
    if (toTelecaller) {
      return transferableLeads.filter((l) => l.currentCounsellorId != null).length;
    }
    return transferableLeads.filter((l) => l.currentTelecallerId != null).length;
  }, [transferableLeads, toTelecaller]);

  const strategyConflictCount = preview?.conflictCounts
    ? preview.conflictCounts.withTelecaller + preview.conflictCounts.withCounsellor
    : 0;

  const showRemoveOption =
    !isJunkRestoreMode &&
    ((step === "direct_confirm" && directConflictCount > 0) ||
      (step === "strategy_confirm" && strategyConflictCount > 0));

  const handleClose = () => onOpenChange(false);

  const handleBack = () => {
    if (step === "direct_assignee" || step === "mode") {
      handleClose();
      return;
    }
    if (step === "direct_confirm") {
      setStep("direct_assignee");
      return;
    }
    if (step === "strategy_setup") {
      setStep(isJunkRestoreMode ? "direct_assignee" : "mode");
      return;
    }
    if (step === "strategy_preview") {
      setStep("strategy_setup");
      return;
    }
    if (step === "strategy_confirm") {
      setStep("strategy_preview");
    }
  };

  const runDirectAssign = async () => {
    try {
      setSubmitting(true);
      const assigneePayload = targetCounsellorId
        ? {
            counsellorId: Number(targetCounsellorId),
            ...(removeFromPrevious ? { removeFromTelecaller: true } : {}),
          }
        : {
            telecallerId: Number(targetTelecallerId),
            ...(removeFromPrevious ? { removeFromCounsellor: true } : {}),
          };

      const result = isJunkRestoreMode
        ? {
            updated: await Promise.all(leadIds.map((id) => revertLeadJunkApi(id, assigneePayload))),
            blocked: [] as number[],
          }
        : await bulkAssignLeadsApi({ leadIds, ...assigneePayload });

      if (result.blocked.length > 0) {
        toast({
          title: `${result.updated.length} lead${result.updated.length === 1 ? "" : "s"} assigned`,
          description: `${result.blocked.length} lead${result.blocked.length === 1 ? "" : "s"} skipped (transferred or converted).`,
        });
      } else {
        toast({
          title: `${result.updated.length} lead${result.updated.length === 1 ? "" : "s"} ${isJunkRestoreMode ? "restored and assigned" : "transferred"}`,
        });
      }
      onSuccess(result.updated);
      handleClose();
    } catch {
      toast({ title: "Transfer failed", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  const loadStrategyPreview = async () => {
    if (selectedTelecallers.size === 0 && selectedCounsellors.size === 0) {
      toast({
        title: "Select team members",
        description: "Choose at least one telecaller or counsellor.",
        variant: "destructive",
      });
      return;
    }
    try {
      setPreviewLoading(true);
      const data = await previewBulkStrategyAssignApi({
        leadIds,
        strategy,
        assignedTelecallers: Array.from(selectedTelecallers),
        assignedCounsellors: Array.from(selectedCounsellors),
        priorityWeights: activePriorityWeights,
      });
      setPreview(data);
      setStep("strategy_preview");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Could not preview distribution";
      toast({ title: "Preview failed", description: message, variant: "destructive" });
    } finally {
      setPreviewLoading(false);
    }
  };

  const runStrategyAssign = async () => {
    if (!preview || preview.assignments.length === 0) {
      toast({ title: "Nothing to assign", variant: "destructive" });
      return;
    }
    try {
      setSubmitting(true);
      const result = await bulkStrategyAssignLeadsApi({
        leadIds,
        strategy,
        assignedTelecallers: Array.from(selectedTelecallers),
        assignedCounsellors: Array.from(selectedCounsellors),
        priorityWeights: activePriorityWeights,
        removeFromPreviousAssignee: removeFromPrevious,
      });
      if (result.blocked.length > 0) {
        toast({
          title: `${result.updated.length} lead${result.updated.length === 1 ? "" : "s"} distributed`,
          description: `${result.blocked.length} lead${result.blocked.length === 1 ? "" : "s"} skipped (transferred or converted).`,
        });
      } else {
        toast({
          title: `${result.updated.length} lead${result.updated.length === 1 ? "" : "s"} distributed`,
        });
      }
      onSuccess(result.updated);
      handleClose();
    } catch {
      toast({ title: "Distribution failed", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  const handlePrimary = async () => {
    if (step === "mode") {
      setStep(mode === "direct" ? "direct_assignee" : "strategy_setup");
      return;
    }
    if (step === "direct_assignee") {
      if (!targetTelecallerId && !targetCounsellorId) {
        toast({
          title: "Select assignee",
          description: "Choose a telecaller or counsellor.",
          variant: "destructive",
        });
        return;
      }
      if (transferableCount === 0) {
        toast({
          title: isJunkRestoreMode ? "No junk leads to restore" : "No leads to transfer",
          description: isJunkRestoreMode
            ? "Select junk leads from the list to restore and assign."
            : "Transferred or converted leads cannot be reassigned.",
          variant: "destructive",
        });
        return;
      }
      setRemoveFromPrevious(false);
      setStep("direct_confirm");
      return;
    }
    if (step === "direct_confirm") {
      await runDirectAssign();
      return;
    }
    if (step === "strategy_setup") {
      await loadStrategyPreview();
      return;
    }
    if (step === "strategy_preview") {
      setRemoveFromPrevious(false);
      setStep("strategy_confirm");
      return;
    }
    if (step === "strategy_confirm") {
      await runStrategyAssign();
    }
  };

  const isPriority = strategy === "priority_weighted";

  const activePriorityWeights = useMemo(() => {
    if (!isPriority) return {};
    const pool = [...selectedTelecallers, ...selectedCounsellors];
    const out: Record<string, number> = {};
    for (const id of pool) {
      const w = priorityWeights[String(id)];
      if (w != null && w >= 1) out[String(id)] = w;
    }
    return out;
  }, [isPriority, selectedTelecallers, selectedCounsellors, priorityWeights]);

  const dialogMaxWidth =
    step === "strategy_setup" ? "max-w-5xl" : step === "strategy_preview" ? "max-w-3xl" : "max-w-2xl";

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) handleClose(); else onOpenChange(v); }}>
      <DialogContent
        className={`${dialogMaxWidth} max-h-[92vh] flex flex-col overflow-hidden`}
      >
        <DialogHeader>
          <DialogTitle>
            {isJunkRestoreMode ? "Restore & Assign Junk Leads" : "Assign Selected Leads"}
          </DialogTitle>
        </DialogHeader>

        <div className="rounded-md border bg-muted/30 px-3 py-2 text-sm shrink-0">
          <span className="font-semibold">{transferableCount}</span>{" "}
          {isJunkRestoreMode ? "junk lead" : "transferable lead"}
          {transferableCount !== 1 ? "s" : ""}
          {blockedCount > 0 && (
            <span className="text-muted-foreground">
              {" "}
              · {blockedCount} skipped
              {isJunkRestoreMode ? " (not junk)" : " (transferred or converted)"}
            </span>
          )}
        </div>

        {step === "mode" && (
          <div className="grid gap-3 sm:grid-cols-2 py-2">
            <button
              type="button"
              onClick={() => setMode("direct")}
              className={`rounded-xl border-2 p-4 text-left transition-all ${
                mode === "direct"
                  ? "border-primary bg-primary/5"
                  : "border-border hover:border-primary/40"
              }`}
            >
              <p className="font-semibold">Direct assign</p>
              <p className="text-xs text-muted-foreground mt-1">
                Assign all selected leads to one telecaller or one counsellor — same as the current
                transfer flow.
              </p>
            </button>
            <button
              type="button"
              onClick={() => setMode("strategy")}
              className={`rounded-xl border-2 p-4 text-left transition-all ${
                mode === "strategy"
                  ? "border-primary bg-primary/5"
                  : "border-border hover:border-primary/40"
              }`}
            >
              <p className="font-semibold">Strategy distribution</p>
              <p className="text-xs text-muted-foreground mt-1">
                Split leads across a team using round robin, least loaded, priority, or
                performance-based rules — same strategies as Facebook automation.
              </p>
            </button>
          </div>
        )}

        {step === "direct_assignee" && (
          <div className="space-y-4 py-2">
            <p className="text-sm text-muted-foreground">
              Choose one telecaller or one counsellor for all {transferableCount} lead
              {transferableCount !== 1 ? "s" : ""}.
            </p>
            <div className="grid gap-2">
              <Label>Telecaller</Label>
              <Select
                value={targetTelecallerId}
                onValueChange={(value) => {
                  setTargetTelecallerId(value);
                  setTargetCounsellorId("");
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Choose telecaller…" />
                </SelectTrigger>
                <SelectContent className="max-h-[280px]">
                  {telecallers.map((t) => (
                    <SelectItem key={t.id} value={String(t.id)}>
                      {t.fullName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Counsellor</Label>
              <Select
                value={targetCounsellorId}
                onValueChange={(value) => {
                  setTargetCounsellorId(value);
                  setTargetTelecallerId("");
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Choose counsellor…" />
                </SelectTrigger>
                <SelectContent className="max-h-[280px]">
                  {counsellors.map((c) => (
                    <SelectItem key={c.id} value={String(c.id)}>
                      {c.fullName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        )}

        {step === "direct_confirm" && (
          <div className="py-4 space-y-3 text-center">
            <p className="text-sm text-muted-foreground">
              Confirm {isJunkRestoreMode ? "restore and assignment of" : "transfer of"}
            </p>
            <p className="text-lg font-bold">
              {transferableCount} lead{transferableCount !== 1 ? "s" : ""}
            </p>
            <p className="text-sm text-muted-foreground">to</p>
            <p className="text-base font-semibold text-primary">{directTargetName}</p>
            {directConflictCount > 0 && (
              <div className="text-left rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
                {directConflictCount} lead{directConflictCount !== 1 ? "s are" : " is"} already
                assigned to a {toTelecaller ? "counsellor" : "telecaller"}. You can remove them from
                the previous assignee&apos;s list so only the new assignee sees them.
              </div>
            )}
            {showRemoveOption && (
              <label className="flex items-start gap-3 rounded-lg border p-3 cursor-pointer text-left">
                <Checkbox
                  checked={removeFromPrevious}
                  onCheckedChange={(v) => setRemoveFromPrevious(v === true)}
                />
                <span className="text-sm leading-snug">
                  Remove from the previous assignee&apos;s list (recommended when switching between
                  telecaller and counsellor)
                </span>
              </label>
            )}
          </div>
        )}

        {step === "strategy_setup" && (
          <div className="min-h-0 flex-1 overflow-hidden py-2">
            <div className="grid h-full min-h-[min(520px,calc(92vh-11rem))] gap-4 lg:grid-cols-[minmax(240px,2fr)_minmax(0,3fr)]">
              <div className="flex flex-col gap-2 overflow-y-auto pr-1">
                <Label className="flex shrink-0 items-center gap-1.5 text-xs uppercase tracking-wide text-muted-foreground">
                  <TrendingUp className="h-3.5 w-3.5" /> Strategy
                </Label>
                {LEAD_DISTRIBUTION_STRATEGIES.map((opt) => {
                  const on = strategy === opt.value;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setStrategy(opt.value)}
                      className={`w-full shrink-0 text-left rounded-xl border-2 p-3 text-xs transition-all ${
                        on
                          ? "border-blue-500 bg-blue-50"
                          : "border-border hover:border-blue-200"
                      }`}
                    >
                      <span className={`text-sm font-semibold ${on ? "text-blue-700" : ""}`}>
                        {opt.label}
                      </span>
                      {on && (
                        <p className="mt-1 text-xs leading-relaxed text-blue-700/80">
                          {opt.description}
                        </p>
                      )}
                    </button>
                  );
                })}
              </div>
              <div className="flex min-h-0 min-w-0 flex-col gap-3">
                {isPriority && (
                  <p className="shrink-0 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
                    Priority is used only for this assignment (not saved). Select team members, then
                    set priority 1–99 — higher numbers receive more leads. Default is 1 if unset.
                  </p>
                )}
                <div
                  className={`grid min-h-0 min-w-0 flex-1 gap-4 ${
                    isPriority ? "grid-cols-1 xl:grid-cols-2" : "md:grid-cols-2"
                  }`}
                >
                  <div className="flex min-h-0 min-w-0 flex-col rounded-lg border bg-card">
                    <Label className="flex shrink-0 items-center gap-1 border-b px-3 py-2 text-sm font-semibold text-blue-600">
                      <UserCheck className="h-3.5 w-3.5" /> Telecallers
                    </Label>
                    <ScrollArea className="h-[min(360px,calc(92vh-18rem))]">
                      <div className="space-y-1.5 p-2 pr-3">
                        {telecallers.length === 0 ? (
                          <p className="py-6 text-center text-xs text-muted-foreground">
                            No telecallers found
                          </p>
                        ) : (
                          telecallers.map((m) => (
                            <MemberSelectRow
                              key={m.id}
                              member={m}
                              color="blue"
                              showPriority={isPriority}
                              priority={priorityWeights[String(m.id)]}
                              checked={selectedTelecallers.has(m.id)}
                              onSetPriority={(v) =>
                                setPriorityWeights((prev) => ({ ...prev, [String(m.id)]: v }))
                              }
                              onToggle={() =>
                                setSelectedTelecallers((prev) => {
                                  const next = new Set(prev);
                                  if (next.has(m.id)) next.delete(m.id);
                                  else next.add(m.id);
                                  return next;
                                })
                              }
                            />
                          ))
                        )}
                      </div>
                    </ScrollArea>
                  </div>
                  <div className="flex min-h-0 min-w-0 flex-col rounded-lg border bg-card">
                    <Label className="flex shrink-0 items-center gap-1 border-b px-3 py-2 text-sm font-semibold text-purple-600">
                      <Users className="h-3.5 w-3.5" /> Counsellors
                    </Label>
                    <ScrollArea className="h-[min(360px,calc(92vh-18rem))]">
                      <div className="space-y-1.5 p-2 pr-3 pb-3">
                        {counsellors.length === 0 ? (
                          <p className="py-6 text-center text-xs text-muted-foreground">
                            No counsellors found
                          </p>
                        ) : (
                          counsellors.map((m) => (
                            <MemberSelectRow
                              key={m.id}
                              member={m}
                              color="purple"
                              showPriority={isPriority}
                              priority={priorityWeights[String(m.id)]}
                              checked={selectedCounsellors.has(m.id)}
                              onSetPriority={(v) =>
                                setPriorityWeights((prev) => ({ ...prev, [String(m.id)]: v }))
                              }
                              onToggle={() =>
                                setSelectedCounsellors((prev) => {
                                  const next = new Set(prev);
                                  if (next.has(m.id)) next.delete(m.id);
                                  else next.add(m.id);
                                  return next;
                                })
                              }
                            />
                          ))
                        )}
                      </div>
                    </ScrollArea>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {step === "strategy_preview" && preview && (
          <div className="space-y-3 py-2">
            <div className="flex flex-wrap gap-2">
              {preview.summary.map((row) => (
                <Badge key={`${row.role}-${row.userId}`} variant="secondary">
                  {row.userName}: {row.count}
                </Badge>
              ))}
            </div>
            <ScrollArea className="h-52 rounded-lg border">
              <div className="p-2 space-y-1 text-sm">
                {preview.assignments.map((a) => (
                  <div
                    key={a.leadId}
                    className="flex justify-between gap-2 border-b border-border/50 py-1 last:border-0"
                  >
                    <span className="truncate">{a.leadName}</span>
                    <span className="text-muted-foreground shrink-0">
                      → {a.userName} ({a.role})
                    </span>
                  </div>
                ))}
              </div>
            </ScrollArea>
            {(preview.conflictCounts.withTelecaller > 0 ||
              preview.conflictCounts.withCounsellor > 0) && (
              <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-md px-3 py-2">
                Some leads already have a telecaller or counsellor. On the next step you can choose
                whether to remove them from the previous assignee&apos;s list.
              </p>
            )}
          </div>
        )}

        {step === "strategy_confirm" && preview && (
          <div className="py-2 space-y-3">
            <p className="text-sm text-center">
              Distribute <span className="font-semibold">{preview.assignments.length}</span> leads
              using{" "}
              <span className="font-semibold">
                {LEAD_DISTRIBUTION_STRATEGIES.find((s) => s.value === strategy)?.label}
              </span>
              ?
            </p>
            {strategyConflictCount > 0 && (
              <div className="text-sm rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-amber-900">
                {preview.conflictCounts.withCounsellor > 0 && (
                  <p>
                    {preview.conflictCounts.withCounsellor} lead
                    {preview.conflictCounts.withCounsellor !== 1 ? "s are" : " is"} currently on a
                    counsellor&apos;s list. If reassigned to a telecaller, remove them from the
                    counsellor list to avoid duplicate ownership.
                  </p>
                )}
                {preview.conflictCounts.withTelecaller > 0 && (
                  <p className={preview.conflictCounts.withCounsellor > 0 ? "mt-2" : ""}>
                    {preview.conflictCounts.withTelecaller} lead
                    {preview.conflictCounts.withTelecaller !== 1 ? "s are" : " is"} currently on a
                    telecaller&apos;s list. If reassigned to a counsellor, you may remove them from
                    the telecaller list so conversion credit stays clear.
                  </p>
                )}
              </div>
            )}
            {showRemoveOption && (
              <label className="flex items-start gap-3 rounded-lg border p-3 cursor-pointer">
                <Checkbox
                  checked={removeFromPrevious}
                  onCheckedChange={(v) => setRemoveFromPrevious(v === true)}
                />
                <span className="text-sm leading-snug">
                  Remove leads from the previous assignee&apos;s list when the new assignee
                  role differs
                </span>
              </label>
            )}
          </div>
        )}

        <DialogFooter className="shrink-0 border-t pt-4">
          <Button variant="outline" onClick={handleBack} disabled={submitting || previewLoading}>
            {step === "mode" || step === "direct_assignee" ? "Cancel" : "Back"}
          </Button>
          <Button
            onClick={handlePrimary}
            disabled={
              submitting ||
              previewLoading ||
              (step === "direct_assignee" && !targetTelecallerId && !targetCounsellorId) ||
              (step === "strategy_setup" &&
                selectedTelecallers.size === 0 &&
                selectedCounsellors.size === 0)
            }
          >
            {(submitting || previewLoading) && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {step === "direct_confirm" || step === "strategy_confirm"
              ? submitting
                ? "Assigning…"
                : isJunkRestoreMode
                  ? "Confirm Restore"
                  : "Confirm Assign"
              : step === "strategy_preview"
                ? "Continue"
                : step === "strategy_setup"
                  ? previewLoading
                    ? "Previewing…"
                    : "Preview distribution"
                  : step === "mode"
                    ? "Continue"
                    : "Next →"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
