import { formatTimestamp } from "@/lib/format-timestamp";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowUpDown,
  CalendarClock,
  Check,
  CheckCircle2,
  Circle,
  Clock,
  Loader2,
  Pencil,
  Phone,
  Plus,
  Send,
  StickyNote,
  Trash2,
  UserCheck,
  UserRound,
  UserX,
  X,
} from "lucide-react";
import { Breadcrumbs } from "@/layout/Breadcrumbs";
import {
  getLeadSourceLabel,
  resolveLeadSourceSelectValue,
  resolveLeadTypeSelectValue,
  type LeadSourceOption,
} from "@/lib/lead-source-display";
import {
  getLeadReferenceDetailCaption,
  getLeadReferenceDisplayLabel,
  getLeadReferenceFieldLabel,
  leadHasReferenceSource,
} from "@/lib/lead-reference-display";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { getUnmatchedCustomAnswerKeys } from "@/lib/lead-custom-answers";
import { getCounsellorProgressLabel, getLeadDisplayTags } from "@/lib/lead-status-tags";
import { formatLeadActivityDisplay, sortTimelineActivities } from "@/lib/lead-activity-display";
import type { LeadEntity } from "@/api/leads.api";
import type { LeadDetailMeta } from "@/api/leads.api";

const UNSET_SELECT = "__not_assigned__";
const LEAD_QUALITY_OPTIONS = ["excellent", "good", "average", "bad"] as const;
const ELIGIBILITY_OPTIONS = ["eligible", "not_eligible", "future_prospect"] as const;
const PROGRESS_OPTIONS = ["not_contacted", "contacted", "follow_up", "converted", "junk"] as const;

function humanizeEnum(value: string) {
  return value.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatDateTime(value?: string | null) {
  if (!value) return "—";
  return formatTimestamp(value, "datetime");
}

function formatCustomAnswer(val: unknown): string {
  if (val == null || val === "") return "—";
  if (Array.isArray(val)) {
    const parts = val.map((v) => String(v).trim()).filter(Boolean);
    return parts.length ? parts.join(", ") : "—";
  }
  if (typeof val === "object") return JSON.stringify(val);
  return String(val);
}

function getInitials(name?: string | null) {
  if (!name?.trim()) return "L";
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}

function truncate(text: string | null | undefined, max = 80) {
  if (!text) return "—";
  return text.length > max ? text.slice(0, max) + "…" : text;
}

function progressBadgeClass(status: string) {
  if (status === "not_contacted") return "bg-amber-100 text-amber-800 border-amber-200";
  if (status === "follow_up") return "bg-amber-100 text-amber-800 border-amber-200";
  if (status === "contacted") return "bg-sky-100 text-sky-800 border-sky-200";
  if (status === "converted") return "bg-emerald-100 text-emerald-800 border-emerald-200";
  if (status === "junk") return "bg-red-100 text-red-800 border-red-200";
  return "bg-muted text-muted-foreground";
}

export type LeadDetailLayoutProps = {
  lead: LeadEntity;
  leadMeta: LeadDetailMeta | null;
  readOnly: boolean;
  telecallerTransferredViewOnly?: boolean;
  isCounsellor: boolean;
  isJunk: boolean;
  isConverted: boolean;
  submitting: boolean;
  transferDisabledReason?: string;
  canTransfer: boolean;
  canConvert?: boolean;
  convertDisabledReason?: string;
  canReassign: boolean;
  transferButtonLabel: string;
  eligibilityValue: LeadEntity["eligibilityStatus"] | "";
  qualityValue: LeadEntity["leadQuality"] | "";
  isEditing: boolean;
  editForm: Partial<LeadEntity> & { leadSource?: string; leadType?: string };
  isLoadingDropdowns: boolean;
  sourceOptions: LeadSourceOption[];
  typeOptions: { id: number; saleType: string }[];
  counsellors: { id: number; fullName: string }[];
  telecallers: { id: number; fullName: string }[];
  noteActivities: {
    id: number;
    message?: string;
    createdAt: string;
    userName?: string | null;
    canEdit?: boolean;
  }[];
  followupActivities: {
    id: number;
    followupAt?: string;
    message?: string;
    status: string;
    userName?: string | null;
    canComplete?: boolean;
  }[];
  timelineItems: any[];
  showAddNote: boolean;
  noteText: string;
  savingNote: boolean;
  onBack: () => void;
  canRevertJunk?: boolean;
  onRevertJunk?: () => void;
  onJunk: () => void;
  onFollowUp: () => void;
  onTransfer: () => void;
  onConvert: () => void;
  onDrop: () => void;
  onEligibilityChange: (v: LeadEntity["eligibilityStatus"]) => void;
  onQualityChange: (v: LeadEntity["leadQuality"]) => void;
  onEditStart: () => void;
  onEditCancel: () => void;
  onEditSave: () => void;
  setEditForm: React.Dispatch<
    React.SetStateAction<Partial<LeadEntity> & { leadSource?: string; leadType?: string }>
  >;
  onCopy: (text: string, label: string) => void;
  onToggleAddNote: () => void;
  setNoteText: (v: string) => void;
  onAddNote: () => void;
  onCompleteFollowUp: (activityId: number) => void;
  editingNoteId: number | null;
  editingNoteText: string;
  savingNoteEdit: boolean;
  onStartEditNote: (activityId: number, message: string) => void;
  onCancelEditNote: () => void;
  onSaveEditNote: () => void;
  setEditingNoteText: (value: string) => void;
  personalSection?: React.ReactNode;
  canEditLeadSource?: boolean;
};

export function LeadDetailLayout(props: LeadDetailLayoutProps) {
  const [timelineNewestFirst, setTimelineNewestFirst] = useState(true);
  const mainColumnRef = useRef<HTMLDivElement>(null);
  const assignmentRef = useRef<HTMLDivElement>(null);
  const [sidebarHeightPx, setSidebarHeightPx] = useState<number | null>(null);

  const {
    lead,
    leadMeta,
    readOnly,
    telecallerTransferredViewOnly,
    isCounsellor,
    isJunk,
    isConverted,
    submitting,
    transferDisabledReason,
    canTransfer,
    canConvert,
    convertDisabledReason,
    canReassign,
    transferButtonLabel,
    eligibilityValue,
    qualityValue,
    isEditing,
    editForm,
    isLoadingDropdowns,
    sourceOptions,
    typeOptions,
    counsellors,
    telecallers,
    noteActivities,
    followupActivities,
    timelineItems,
    showAddNote,
    noteText,
    savingNote,
    onBack,
    canRevertJunk,
    onRevertJunk,
    onJunk,
    onFollowUp,
    onTransfer,
    onConvert,
    onDrop,
    onEligibilityChange,
    onQualityChange,
    onEditStart,
    onEditCancel,
    onEditSave,
    setEditForm,
    onCopy,
    onToggleAddNote,
    setNoteText,
    onAddNote,
    onCompleteFollowUp,
    editingNoteId,
    editingNoteText,
    savingNoteEdit,
    onStartEditNote,
    onCancelEditNote,
    onSaveEditNote,
    setEditingNoteText,
    personalSection,
    canEditLeadSource = false,
  } = props;

  const sortedTimelineItems = sortTimelineActivities(timelineItems, timelineNewestFirst);

  const customAnswers =
    lead.customAnswers && typeof lead.customAnswers === "object" && !Array.isArray(lead.customAnswers)
      ? (lead.customAnswers as Record<string, unknown>)
      : {};
  const formKeys = getUnmatchedCustomAnswerKeys(customAnswers, lead);

  const editLeadSourceValue = useMemo(
    () => resolveLeadSourceSelectValue(editForm.leadSource, sourceOptions),
    [editForm.leadSource, sourceOptions]
  );
  const editLeadTypeValue = useMemo(
    () => resolveLeadTypeSelectValue(editForm.leadType, typeOptions),
    [editForm.leadType, typeOptions]
  );
  const leadSourceInOptions = Boolean(
    editLeadSourceValue &&
      sourceOptions.some((o) => o.leadType === editLeadSourceValue)
  );
  const leadTypeInOptions = Boolean(
    editLeadTypeValue && typeOptions.some((o) => o.saleType === editLeadTypeValue)
  );

  useEffect(() => {
    const main = mainColumnRef.current;
    if (!main) return;

    const syncHeights = () => {
      const isWide = window.matchMedia("(min-width: 1024px)").matches;
      if (!isWide) {
        setSidebarHeightPx(null);
        return;
      }
      setSidebarHeightPx(main.getBoundingClientRect().height);
    };

    const ro = new ResizeObserver(syncHeights);
    ro.observe(main);
    const assignment = assignmentRef.current;
    if (assignment) ro.observe(assignment);

    syncHeights();
    window.addEventListener("resize", syncHeights);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", syncHeights);
    };
  }, [
    timelineItems.length,
    noteActivities.length,
    followupActivities.length,
    isEditing,
    formKeys.length,
  ]);

  const readOnlyLabel = isJunk
    ? "Read only — junk"
    : telecallerTransferredViewOnly
      ? "View only"
      : isConverted
        ? "Read only — converted"
        : "Read only";

  const showTransferHint =
    !readOnly && !isCounsellor && (!lead.eligibilityStatus || !lead.leadQuality);

  return (
    <div className="space-y-5 pb-8 animate-in fade-in-50 duration-500">
      <Breadcrumbs items={[{ label: "Leads", href: "/leads" }, { label: lead.fullName }]} />

      {telecallerTransferredViewOnly && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          This lead is with a counsellor. You can not modify lead details
        </div>
      )}

      {/* Hero header */}
      <div className="rounded-xl border bg-card shadow-sm p-5 md:p-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex gap-4 min-w-0">
            <Button variant="outline" size="icon" onClick={onBack} className="h-9 w-9 shrink-0 mt-0.5">
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
              {getInitials(lead.fullName)}
            </div>
            <div className="min-w-0 flex flex-wrap items-center gap-2 self-center">
                <h1 className="text-xl md:text-2xl font-bold tracking-tight">{lead.fullName}</h1>
                {getLeadDisplayTags(lead, isCounsellor ? "counsellor" : undefined, {
                    pendingFollowUp: leadMeta?.pendingFollowUp ?? lead.pendingFollowUp,
                  }).map((tag) => (
                    <Badge key={tag.key} className={cn("border-0", tag.className)}>
                      {tag.label}
                    </Badge>
                  ))}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 lg:justify-end shrink-0">
            {canRevertJunk && onRevertJunk && (
              <Button
                size="sm"
                variant="outline"
                className="gap-1.5 border-amber-300 text-amber-800 hover:bg-amber-50"
                disabled={submitting}
                onClick={onRevertJunk}
              >
                Restore lead
              </Button>
            )}
            {readOnly && !(canRevertJunk && isJunk) && (
              <Badge className={cn("shrink-0", isJunk ? "bg-red-600 hover:bg-red-600" : "bg-emerald-600 hover:bg-emerald-600")}>
                {readOnlyLabel}
              </Badge>
            )}
            {!readOnly && (
              <>
                {!isCounsellor && !isJunk && (
                  <Button variant="ghost" size="sm" className="text-red-600 gap-1.5" onClick={onJunk}>
                    <Trash2 className="h-4 w-4" />
                    Junk
                  </Button>
                )}
                {!isCounsellor && canTransfer && !canReassign && (
                  <Button
                    size="sm"
                    className="gap-1.5"
                    disabled={submitting || !canTransfer}
                    title={transferDisabledReason}
                    onClick={onTransfer}
                  >
                    <Send className="h-4 w-4" />
                    {transferButtonLabel}
                  </Button>
                )}
                {isCounsellor && (
                  <>
                    <Button
                      size="sm"
                      className="gap-1.5"
                      disabled={submitting || canConvert === false}
                      title={convertDisabledReason}
                      onClick={onConvert}
                    >
                      <UserCheck className="h-4 w-4" />
                      Convert
                    </Button>
                    <Button size="sm" variant="outline" className="gap-1.5 text-red-600" disabled={submitting} onClick={onDrop}>
                      <UserX className="h-4 w-4" />
                      Drop
                    </Button>
                  </>
                )}
              </>
            )}
          </div>
        </div>
        {!readOnly && isCounsellor && (
          <p className="mt-3 text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-md px-3 py-2">
            To convert a lead into a client, mark eligibility, set lead quality, and complete pending
            follow-ups.
          </p>
        )}
      </div>

      {/* Eligibility, quality, follow-up — counsellors can update until read-only */}
      {!readOnly && (
        <>
          <div className="grid gap-3 md:grid-cols-3">
            <Card className="shadow-sm min-h-[112px]">
              <CardContent className="p-4 space-y-2">
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Eligibility</p>
                <ToggleGroup
                  type="single"
                  value={eligibilityValue || ""}
                  onValueChange={(v) => {
                    if (v) onEligibilityChange(v as LeadEntity["eligibilityStatus"]);
                  }}
                  disabled={submitting}
                  className="flex w-full rounded-lg border bg-muted/30 p-1"
                >
                  {ELIGIBILITY_OPTIONS.map((opt) => (
                    <ToggleGroupItem
                      key={opt}
                      value={opt}
                      className="flex-1 text-[11px] sm:text-xs rounded-md px-1 data-[state=on]:bg-foreground data-[state=on]:text-background"
                    >
                      {humanizeEnum(opt)}
                    </ToggleGroupItem>
                  ))}
                </ToggleGroup>
              </CardContent>
            </Card>
            <Card className="shadow-sm min-h-[112px]">
              <CardContent className="p-4 space-y-2">
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Quality</p>
                <ToggleGroup
                  type="single"
                  value={qualityValue || ""}
                  onValueChange={(v) => {
                    if (v) onQualityChange(v as LeadEntity["leadQuality"]);
                  }}
                  disabled={submitting}
                  className="flex w-full rounded-lg border bg-muted/30 p-1"
                >
                  {LEAD_QUALITY_OPTIONS.map((opt) => (
                    <ToggleGroupItem
                      key={opt}
                      value={opt}
                      className="flex-1 text-[11px] sm:text-xs rounded-md px-0.5 data-[state=on]:bg-foreground data-[state=on]:text-background"
                    >
                      {humanizeEnum(opt)}
                    </ToggleGroupItem>
                  ))}
                </ToggleGroup>
              </CardContent>
            </Card>
            <Card className="shadow-sm min-h-[112px]">
              <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Next follow-up</p>
                  <p className="text-sm font-medium mt-1">
                    {lead.nextFollowupAt ? formatDateTime(lead.nextFollowupAt) : "No follow-up scheduled"}
                  </p>
                </div>
                <Button variant="outline" size="sm" className="gap-1 shrink-0" onClick={onFollowUp}>
                  <Plus className="h-3.5 w-3.5" />
                  Schedule
                </Button>
              </CardContent>
            </Card>
          </div>
          {showTransferHint && (
            <div className="flex items-center gap-2 text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
              <span className="h-2 w-2 rounded-full bg-amber-500 shrink-0" />
              Eligibility and quality are required before transferring to a counsellor.
              {leadMeta?.pendingFollowUp && " Complete the pending follow-up first."}
            </div>
          )}
        </>
      )}

      <div className="grid gap-6 lg:grid-cols-3 lg:items-start">
        <div
          ref={mainColumnRef}
          className={cn(
            "lg:col-span-2 min-w-0",
            isEditing ? "overflow-visible" : "overflow-hidden"
          )}
        >
          <Tabs defaultValue="overview" className={cn("w-full min-w-0", isEditing && "overflow-visible")}>
            <TabsList className="w-full justify-start h-auto p-1 bg-muted/40 rounded-lg">
              <TabsTrigger value="overview" className="px-6 py-2">
                Overview
              </TabsTrigger>
              <TabsTrigger value="personal" className="px-6 py-2">
                Personal Details
              </TabsTrigger>
              <TabsTrigger value="notes" className="px-6 py-2">
                Notes ({noteActivities.length})
              </TabsTrigger>
              <TabsTrigger value="followups" className="px-6 py-2">
                Follow-ups ({followupActivities.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent
              value="overview"
              className={cn("mt-4 space-y-4", isEditing && "relative z-20 overflow-visible")}
            >
              <Card
                className={cn(
                  "shadow-sm border-border/60 min-w-0",
                  isEditing ? "overflow-visible" : "overflow-hidden"
                )}
              >
                <CardHeader className="flex flex-row items-center justify-between py-4">
                  <CardTitle className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
                    Lead information
                  </CardTitle>
                  {!readOnly &&
                    (!isEditing ? (
                      <Button variant="ghost" size="sm" className="h-8 gap-1.5" onClick={onEditStart}>
                        <Pencil className="h-3.5 w-3.5" /> Edit
                      </Button>
                    ) : (
                      <div className="flex gap-2">
                        <Button variant="ghost" size="sm" onClick={onEditCancel}>
                          Cancel
                        </Button>
                        <Button size="sm" className="gap-1.5" onClick={onEditSave}>
                          <Check className="h-3.5 w-3.5" /> Save
                        </Button>
                      </div>
                    ))}
                </CardHeader>
                <Separator />
                <CardContent
                  className={cn(
                    "p-6 space-y-6 min-w-0",
                    isEditing ? "overflow-visible" : "overflow-hidden"
                  )}
                >
                  <div className="grid gap-6 sm:grid-cols-2 min-w-0">
                    <div className="space-y-4">
                      {(
                        [
                          { label: "Full name", key: "fullName" as const },
                          { label: "Phone", key: "phone" as const },
                          { label: "WhatsApp", key: "whatsapp" as const },
                          { label: "Email", key: "email" as const },
                          { label: "City", key: "city" as const },
                        ] as const
                      ).map((field) => (
                        <div key={field.key}>
                          <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">
                            {field.label}
                          </p>
                          {isEditing ? (
                            <Input
                              value={String(editForm[field.key] ?? "")}
                              onChange={(e) =>
                                setEditForm((prev) => ({ ...prev, [field.key]: e.target.value }))
                              }
                              className="h-9"
                            />
                          ) : (
                            <p className="text-sm font-medium">{lead[field.key]?.toString().trim() || "—"}</p>
                          )}
                        </div>
                      ))}
                    </div>
                    <div className="space-y-4">
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">
                          Lead source
                        </p>
                        {isEditing && canEditLeadSource ? (
                          <Select
                            value={editLeadSourceValue}
                            onValueChange={(val) =>
                              setEditForm((prev) => ({ ...prev, leadSource: val }))
                            }
                            disabled={isLoadingDropdowns && sourceOptions.length === 0}
                          >
                            <SelectTrigger className="h-9 w-full">
                              <SelectValue placeholder="Select source" />
                            </SelectTrigger>
                            <SelectContent position="popper" className="max-h-[280px] z-[100]">
                              {!leadSourceInOptions && editForm.leadSource?.trim() && (
                                <SelectItem value={editForm.leadSource.trim()}>
                                  {getLeadSourceLabel(editForm.leadSource, sourceOptions)}
                                </SelectItem>
                              )}
                              {sourceOptions.map((opt) => (
                                <SelectItem key={opt.leadType} value={opt.leadType}>
                                  {getLeadSourceLabel(opt.leadType, sourceOptions)}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        ) : lead.leadSource ? (
                          <Badge variant="secondary" className="bg-sky-100 text-sky-800 border-sky-200">
                            {getLeadSourceLabel(lead.leadSource, sourceOptions)}
                          </Badge>
                        ) : (
                          <p className="text-sm font-medium">—</p>
                        )}
                      </div>
                      {leadHasReferenceSource(lead) && getLeadReferenceDisplayLabel(lead) && (
                        <div>
                          <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">
                            {getLeadReferenceFieldLabel(lead)}
                          </p>
                          <p className="text-sm font-medium">
                            {getLeadReferenceDetailCaption(lead)}
                          </p>
                        </div>
                      )}
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">
                          Lead type
                        </p>
                        {isEditing ? (
                          <Select
                            value={editLeadTypeValue}
                            onValueChange={(val) =>
                              setEditForm((prev) => ({ ...prev, leadType: val }))
                            }
                            disabled={isLoadingDropdowns && typeOptions.length === 0}
                          >
                            <SelectTrigger className="h-9 w-full">
                              <SelectValue placeholder="Select type" />
                            </SelectTrigger>
                            <SelectContent position="popper" className="max-h-[280px] z-[100]">
                              {!leadTypeInOptions && editForm.leadType?.trim() && (
                                <SelectItem value={editForm.leadType.trim()}>
                                  {editForm.leadType.trim()}
                                </SelectItem>
                              )}
                              {typeOptions.map((opt) => (
                                <SelectItem key={opt.id} value={opt.saleType}>
                                  {opt.saleType}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        ) : (
                          <p className="text-sm font-medium">{lead.leadType || "—"}</p>
                        )}
                      </div>
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">
                          Progress
                        </p>
                        <Badge variant="outline" className={cn("capitalize border", progressBadgeClass(lead.progressStatus))}>
                          {isCounsellor
                            ? getCounsellorProgressLabel(lead.progressStatus)
                            : humanizeEnum(lead.progressStatus)}
                        </Badge>
                      </div>
                    </div>
                  </div>

                  <div className="min-w-0 max-w-full relative z-10">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2">
                      Lead note
                    </p>
                    <div className="rounded-lg border border-dashed bg-muted/20 px-4 py-3 text-sm whitespace-pre-wrap break-words break-all min-w-0 max-w-full overflow-hidden [overflow-wrap:anywhere]">
                      {lead.latestNote?.trim() || "Not added"}
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                        Form responses
                      </p>
                      <span className="text-xs text-muted-foreground">{formKeys.length} fields</span>
                    </div>
                    {formKeys.length === 0 ? (
                      <p className="text-sm text-muted-foreground rounded-lg border px-4 py-3">No form responses stored.</p>
                    ) : (
                      <div className="overflow-hidden rounded-lg border">
                        <div className="grid grid-cols-2 gap-3 bg-muted/50 px-4 py-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground border-b">
                          <span>Question</span>
                          <span>Answer</span>
                        </div>
                        {formKeys.map((key, i) => (
                          <div
                            key={key}
                            className={cn(
                              "grid grid-cols-2 gap-3 px-4 py-3 text-sm border-b last:border-0",
                              i % 2 === 0 ? "bg-background" : "bg-muted/20"
                            )}
                          >
                            <span className="text-muted-foreground font-medium break-words">
                              {key.replace(/_/g, " ").replace(/\?/g, "")}
                            </span>
                            <span className="font-semibold break-words">{formatCustomAnswer(customAnswers[key])}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="personal" className="mt-4 space-y-4">
              {personalSection}
            </TabsContent>

            <TabsContent value="notes" className="mt-4 space-y-3 min-h-[560px]">
              <div className="flex justify-between items-center">
                <p className="text-sm text-muted-foreground">{noteActivities.length} notes</p>
                {!readOnly && (
                  <Button size="sm" variant="outline" className="gap-2" onClick={onToggleAddNote}>
                    {showAddNote ? <X className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
                    {showAddNote ? "Cancel" : "Add note"}
                  </Button>
                )}
              </div>
              {showAddNote && !readOnly && (
                <Card className="border-primary/30">
                  <CardContent className="p-4 space-y-3">
                    <Textarea
                      placeholder="Write a note..."
                      value={noteText}
                      onChange={(e) => setNoteText(e.target.value)}
                      rows={3}
                    />
                    <div className="flex justify-end">
                      <Button size="sm" onClick={onAddNote} disabled={savingNote || !noteText.trim()}>
                        {savingNote ? "Saving…" : "Save note"}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}
              {noteActivities.length === 0 && !showAddNote && (
                <div className="min-h-[500px] flex items-center justify-center rounded-lg border border-dashed bg-muted/20">
                  <p className="text-sm text-muted-foreground text-center">Not added</p>
                </div>
              )}
              {noteActivities.map((n) => {
                const isEditingThis = editingNoteId === n.id;
                return (
                  <Card key={n.id} className="border-border/50">
                    <CardContent className="p-4 space-y-3">
                      {isEditingThis ? (
                        <>
                          <Textarea
                            value={editingNoteText}
                            onChange={(e) => setEditingNoteText(e.target.value)}
                            rows={3}
                            className="resize-y"
                          />
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              disabled={savingNoteEdit}
                              onClick={onCancelEditNote}
                            >
                              Cancel
                            </Button>
                            <Button
                              size="sm"
                              disabled={savingNoteEdit || !editingNoteText.trim()}
                              onClick={onSaveEditNote}
                            >
                              {savingNoteEdit ? "Saving…" : "Save"}
                            </Button>
                          </div>
                        </>
                      ) : (
                        <div className="flex justify-between gap-4">
                          <div className="min-w-0 flex-1 space-y-1">
                            {n.userName && (
                              <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                                {n.userName}
                              </p>
                            )}
                            <p className="text-sm break-words break-all min-w-0 [overflow-wrap:anywhere]">
                              {n.message}
                            </p>
                          </div>
                          <div className="flex flex-col items-end gap-2 shrink-0">
                            {!readOnly && n.canEdit !== false && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 px-2 gap-1 text-muted-foreground"
                                onClick={() => onStartEditNote(n.id, n.message ?? "")}
                              >
                                <Pencil className="h-3.5 w-3.5" />
                                Edit
                              </Button>
                            )}
                            <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                              {n.userName ? `${n.userName} · ` : ""}
                              {formatDateTime(n.createdAt)}
                            </span>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </TabsContent>

            <TabsContent value="followups" className="mt-4 space-y-3 min-h-[560px]">
              {followupActivities.length === 0 && (
                <div className="min-h-[500px] flex items-center justify-center rounded-lg border border-dashed bg-muted/20">
                  <p className="text-sm text-muted-foreground text-center">No follow-ups scheduled.</p>
                </div>
              )}
              {followupActivities.map((f) => {
                const isPending = f.status === "pending";
                return (
                  <Card key={f.id} className="overflow-hidden">
                    <CardContent className="p-4 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                      <div className="flex gap-3 min-w-0 flex-1">
                        <div
                          className={cn(
                            "p-1.5 rounded-full h-fit shrink-0",
                            isPending ? "bg-amber-50" : "bg-emerald-50"
                          )}
                        >
                          {isPending ? (
                            <Circle className="h-3.5 w-3.5 text-amber-500" />
                          ) : (
                            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold">{formatDateTime(f.followupAt)}</p>
                          {f.userName && (
                            <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground mt-0.5">
                              Scheduled by {f.userName}
                            </p>
                          )}
                          {f.message && (
                            <p className="text-sm text-muted-foreground mt-0.5 break-words break-all whitespace-pre-wrap">
                              {f.message}
                            </p>
                          )}
                        </div>
                      </div>
                      {isPending && f.canComplete && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-emerald-600 shrink-0 self-end sm:self-auto"
                          onClick={() => onCompleteFollowUp(f.id)}
                        >
                          Done
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </TabsContent>
          </Tabs>
        </div>

        {/* Sidebar height locked to main column on lg; timeline scrolls inside only */}
        <div
          className={cn(
            "flex flex-col gap-4 min-h-0",
            sidebarHeightPx != null && "lg:overflow-hidden"
          )}
          style={sidebarHeightPx != null ? { height: sidebarHeightPx } : undefined}
        >
          <Card ref={assignmentRef} className="shadow-sm shrink-0 min-h-[168px]">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Assignment
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                    {getInitials(lead.telecallerName || "T")}
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] font-bold uppercase text-muted-foreground">Telecaller</p>
                    <p className={cn("text-sm font-semibold truncate", !lead.telecallerName && !lead.currentTelecallerId && "text-muted-foreground font-medium")}>
                      {lead.telecallerName ||
                        (lead.currentTelecallerId ? `User #${lead.currentTelecallerId}` : "Not assigned")}
                    </p>
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-xs font-bold text-indigo-700">
                    {getInitials(lead.counsellorName || "C")}
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] font-bold uppercase text-muted-foreground">Counsellor</p>
                    <p className={cn("text-sm font-semibold truncate", !lead.counsellorName && !lead.currentCounsellorId && "text-muted-foreground font-medium")}>
                      {lead.counsellorName ||
                        (lead.currentCounsellorId ? `User #${lead.currentCounsellorId}` : "Not assigned")}
                    </p>
                  </div>
                </div>
                {(canReassign && !isCounsellor) && (
                  <Button variant="link" size="sm" className="h-auto px-0 text-primary shrink-0" onClick={onTransfer}>
                    Change
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-sm flex flex-col flex-1 min-h-0 overflow-hidden max-lg:max-h-80">
            <CardHeader className="pb-2 shrink-0 flex flex-row items-center justify-between gap-2 space-y-0">
              <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Timeline
              </CardTitle>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-[10px] gap-1 text-muted-foreground"
                title={timelineNewestFirst ? "Newest first — swap to oldest first" : "Oldest first — swap to newest first"}
                onClick={() => setTimelineNewestFirst((v) => !v)}
              >
                <ArrowUpDown className="h-3.5 w-3.5" />
                Swap
              </Button>
            </CardHeader>
            <CardContent className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-0">
              <div className="px-4 pb-4 pt-1 space-y-4">
                {sortedTimelineItems.length === 0 ? (
                  <p className="text-xs text-muted-foreground py-2">No activity yet.</p>
                ) : (
                  sortedTimelineItems.map((item) => {
                    const isNote = item.activityType === "note";
                    const isFollowup = item.activityType === "followup";
                    const followupCompleted = isFollowup && item.status === "completed";
                    const isLeadUpdate =
                      item.activityType === "lead_update" || item.activityType === "lead_created";
                    const formatted = formatLeadActivityDisplay(item, { counsellors, telecallers });
                    return (
                      <div key={item.id} className="flex gap-3">
                        <div
                          className={cn(
                            "mt-0.5 h-8 w-8 shrink-0 rounded-full flex items-center justify-center",
                            isNote && "bg-blue-50 text-blue-600",
                            isFollowup && !followupCompleted && "bg-amber-50 text-amber-600",
                            followupCompleted && "bg-emerald-50 text-emerald-600",
                            isLeadUpdate && "bg-slate-100 text-slate-700",
                            !isNote && !isFollowup && !isLeadUpdate && "bg-emerald-50 text-emerald-600"
                          )}
                        >
                          {isNote ? (
                            <StickyNote className="h-3.5 w-3.5" />
                          ) : isFollowup ? (
                            <Clock
                              className={cn(
                                "h-3.5 w-3.5",
                                followupCompleted ? "text-emerald-600" : "text-amber-600"
                              )}
                            />
                          ) : (
                            <CheckCircle2 className="h-3.5 w-3.5" />
                          )}
                        </div>
                        <div className="min-w-0 flex-1 border-l-2 border-muted pl-3 pb-1 overflow-hidden [overflow-wrap:anywhere]">
                          <p className="text-xs font-semibold leading-snug break-words break-all">
                            {formatted.title}
                          </p>
                          {formatted.details.map((line, idx) => (
                            <p
                              key={idx}
                              className="text-[11px] text-muted-foreground mt-0.5 leading-snug break-words break-all"
                            >
                              {line}
                            </p>
                          ))}
                          <p className="text-[10px] text-muted-foreground/80 mt-1">
                            {formatTimestamp(item.createdAt, "datetime")}
                          </p>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
