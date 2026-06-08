import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, Redirect } from "wouter";
import {
  ArrowLeft,
  CalendarRange,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Filter,
  Loader2,
  Send,
  Share2,
  XCircle,
} from "lucide-react";
import { format, startOfMonth } from "date-fns";

import { PageWrapper } from "@/layout/PageWrapper";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/context/auth-context";
import { canAccessLeadAutomation } from "@/lib/lead-permissions";
import { getLeads, type LeadEntity } from "@/api/leads.api";
import {
  getMetaConversionsStatus,
  sendMetaConversionsEvents,
  type MetaConversionsStatus,
  type MetaGraphBatchResponse,
} from "@/api/leadAutomation.api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import DateRangePicker from "@/components/payments/DateRangePicker";
import type { PaymentsFilter } from "@/api/payments.api";
import { cn } from "@/lib/utils";

// ─── Constants ─────────────────────────────────────────────────────────────────

const PAGE_SIZE_OPTIONS = [20, 50, 100];

const STATUS_COLORS: Record<string, string> = {
  not_contacted: "bg-slate-100 text-slate-700",
  contacted: "bg-blue-100 text-blue-700",
  follow_up: "bg-amber-100 text-amber-800",
  converted: "bg-green-100 text-green-700",
  junk: "bg-red-100 text-red-700",
};

const QUALITY_COLORS: Record<string, string> = {
  excellent: "bg-emerald-100 text-emerald-700",
  good: "bg-green-100 text-green-700",
  average: "bg-amber-100 text-amber-800",
  bad: "bg-red-100 text-red-700",
};

function fmt(value: string) {
  return value.replace(/_/g, " ");
}

// ─── Payload preview helpers ───────────────────────────────────────────────────

function buildMetaLeadId(externalLeadId: string): number | string {
  if (!/^\d+$/.test(externalLeadId)) return externalLeadId;
  const n = Number(externalLeadId);
  return Number.isSafeInteger(n) ? n : externalLeadId;
}

function buildExamplePayload(lead: LeadEntity, sendMode: SendMode) {
  const eventName =
    sendMode === "quality"
      ? String(lead.leadQuality || "unknown")
      : lead.progressStatus === "junk"
      ? "junk"
      : String(lead.assignmentStatus || lead.progressStatus || "not_contacted");

  const userData: Record<string, unknown> = {
    lead_id: lead.externalLeadId ? buildMetaLeadId(lead.externalLeadId) : "— missing —",
  };
  if (lead.email?.trim()) userData.em = [`sha256("${lead.email.trim().toLowerCase()}")`];
  if (lead.phone?.trim()) userData.ph = [`sha256("${lead.phone.trim().replace(/\D/g, "")}")`];

  return {
    data: [
      {
        event_name: eventName,
        event_time: Math.floor(Date.now() / 1000),
        action_source: "system_generated",
        user_data: userData,
        custom_data: {
          lead_event_source: "pratham crm",
          event_source: "crm",
        },
      },
    ],
  };
}

// ─── Types ─────────────────────────────────────────────────────────────────────

type SendMode = "progress" | "quality";
type SentFilter = "unsent" | "sent" | "all";
type ProgressFilter = "all" | "junk" | "dropped" | "converted" | "transferred";
type QualityFilter = "all" | "excellent" | "good" | "average" | "bad";

// ─── Date range helper ─────────────────────────────────────────────────────────

function resolveDateRange(
  filter: PaymentsFilter,
  start?: string,
  end?: string
): { from?: string; to?: string; label: string } {
  if (filter === "custom" && start && end) {
    return { from: start, to: end, label: `${start} → ${end}` };
  }
  const now = new Date();
  if (filter === "today") {
    const d = format(now, "yyyy-MM-dd");
    return { from: d, to: d, label: "Today" };
  }
  if (filter === "monthly") {
    const from = format(startOfMonth(now), "yyyy-MM-dd");
    const to = format(now, "yyyy-MM-dd");
    return { from, to, label: "This month" };
  }
  return { label: "All time" };
}

// ─── Page ──────────────────────────────────────────────────────────────────────

export default function MetaConversionsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const canAccess = Boolean(user && canAccessLeadAutomation(user.role));

  // Status
  const [status, setStatus] = useState<MetaConversionsStatus | null>(null);
  const [statusLoading, setStatusLoading] = useState(true);

  // Leads list
  const [leads, setLeads] = useState<LeadEntity[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);

  // Pagination
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);

  // Filters
  const [search, setSearch] = useState("");
  const [dateFrom, setDateFrom] = useState<string | undefined>(undefined);
  const [dateTo, setDateTo] = useState<string | undefined>(undefined);
  const [dateLabel, setDateLabel] = useState("All time");
  const [showDatePicker, setShowDatePicker] = useState(false);
  const datePickerRef = useRef<HTMLDivElement>(null);
  const [sentFilter, setSentFilter] = useState<SentFilter>("unsent");
  const [sendMode, setSendMode] = useState<SendMode>("progress");
  const [progressFilter, setProgressFilter] = useState<ProgressFilter>("all");
  const [qualityFilter, setQualityFilter] = useState<QualityFilter>("all");

  // Selection
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

  // Stats (excluded lead counts)
  const [statsNotAssigned, setStatsNotAssigned] = useState<number | null>(null);
  const [statsAssigned, setStatsAssigned] = useState<number | null>(null);
  const [statsNoQuality, setStatsNoQuality] = useState<number | null>(null);

  // Send
  const [sending, setSending] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [metaResponses, setMetaResponses] = useState<MetaGraphBatchResponse[]>([]);
  const [sendSummary, setSendSummary] = useState<{ sent: number; failed: number } | null>(null);
  const [sendError, setSendError] = useState<string | null>(null);

  // ── Load status ──────────────────────────────────────────────────────────────

  const loadStatus = useCallback(async () => {
    setStatusLoading(true);
    try {
      setStatus(await getMetaConversionsStatus());
    } catch {
      toast({
        title: "Could not load Meta configuration",
        description: "Check your Facebook connection and try again.",
        variant: "destructive",
      });
    } finally {
      setStatusLoading(false);
    }
  }, [toast]);

  // ── Load leads ───────────────────────────────────────────────────────────────

  const loadLeads = useCallback(async () => {
    setLoading(true);
    try {
      // junk is a progressStatus; transferred/dropped/converted are assignmentStatus values.
      const progressStatus =
        sendMode === "progress" && progressFilter === "junk" ? "junk" : undefined;

      const assignmentStatus =
        sendMode === "progress" &&
        (progressFilter === "transferred" ||
          progressFilter === "dropped" ||
          progressFilter === "converted")
          ? progressFilter
          : undefined;

      const leadQuality =
        sendMode === "quality" && qualityFilter !== "all" ? qualityFilter : undefined;

      const sentToMeta =
        sentFilter === "unsent" ? false : sentFilter === "sent" ? true : undefined;

      const response = await getLeads({
        page,
        limit,
        search: search.trim() || undefined,
        metaLeadsOnly: true,
        createdFrom: dateFrom,
        createdTo: dateTo,
        progressStatus,
        assignmentStatus,
        leadQuality,
        sentToMeta,
        excludeUnassigned: sendMode === "progress" ? true : undefined,
        hasQuality: sendMode === "quality" ? true : undefined,
      });

      setLeads(response.items);
      setTotal(response.pagination.total);
      setTotalPages(response.pagination.totalPages);
    } catch {
      toast({
        title: "Could not load leads",
        description: "Try refreshing the page.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [
    page,
    limit,
    search,
    dateFrom,
    dateTo,
    sentFilter,
    sendMode,
    progressFilter,
    qualityFilter,
    toast,
  ]);

  // ── Load stats (excluded lead counts) ────────────────────────────────────────

  const loadStats = useCallback(async () => {
    const sentToMeta =
      sentFilter === "unsent" ? false : sentFilter === "sent" ? true : undefined;
    const base = {
      metaLeadsOnly: true as const,
      createdFrom: dateFrom,
      createdTo: dateTo,
      sentToMeta,
      limit: 1,
      page: 1,
    };

    try {
      if (sendMode === "progress") {
        const [notAssignedRes, assignedRes] = await Promise.all([
          getLeads({ ...base, assignmentStatus: "not_assigned" }),
          getLeads({ ...base, assignmentStatus: "assigned" }),
        ]);
        setStatsNotAssigned(notAssignedRes.pagination.total);
        setStatsAssigned(assignedRes.pagination.total);
        setStatsNoQuality(null);
      } else {
        const noQualityRes = await getLeads({ ...base, hasQuality: false });
        setStatsNoQuality(noQualityRes.pagination.total);
        setStatsNotAssigned(null);
        setStatsAssigned(null);
      }
    } catch {
      // stats are informational; silently ignore errors
    }
  }, [sendMode, dateFrom, dateTo, sentFilter]);

  useEffect(() => {
    if (!canAccess) return;
    void loadStatus();
  }, [canAccess, loadStatus]);

  useEffect(() => {
    if (!canAccess) return;
    void loadLeads();
  }, [canAccess, loadLeads]);

  useEffect(() => {
    if (!canAccess) return;
    void loadStats();
  }, [canAccess, loadStats]);

  // Close date picker when clicking outside
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (datePickerRef.current && !datePickerRef.current.contains(e.target as Node)) {
        setShowDatePicker(false);
      }
    }
    if (showDatePicker) {
      document.addEventListener("mousedown", handleClick);
      return () => document.removeEventListener("mousedown", handleClick);
    }
  }, [showDatePicker]);

  // ── Selection helpers ────────────────────────────────────────────────────────

  const pageLeadIds = useMemo(() => leads.map((l) => l.id), [leads]);
  const allOnPageSelected =
    pageLeadIds.length > 0 && pageLeadIds.every((id) => selectedIds.has(id));
  const someOnPageSelected = pageLeadIds.some((id) => selectedIds.has(id));

  const toggleLead = (leadId: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(leadId)) next.delete(leadId);
      else next.add(leadId);
      return next;
    });
  };

  const toggleAllOnPage = () => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (allOnPageSelected) pageLeadIds.forEach((id) => next.delete(id));
      else pageLeadIds.forEach((id) => next.add(id));
      return next;
    });
  };

  // ── Date picker ──────────────────────────────────────────────────────────────

  function handleDateApply(filter: PaymentsFilter, start?: string, end?: string) {
    const { from, to, label } = resolveDateRange(filter, start, end);
    setDateFrom(from);
    setDateTo(to);
    setDateLabel(label);
    setPage(1);
    setShowDatePicker(false);
  }

  // ── Send ─────────────────────────────────────────────────────────────────────

  const handleSendConfirm = async () => {
    const leadIds = Array.from(selectedIds);
    setSending(true);
    setSendError(null);
    setMetaResponses([]);
    setSendSummary(null);
    try {
      const result = await sendMetaConversionsEvents(leadIds, sendMode);
      setMetaResponses(result.metaResponses || []);
      setSendSummary({ sent: result.sent, failed: result.failed });

      if (result.failed > 0) {
        const errMsg =
          result.metaResponses?.find((r) => !r.success)?.errorMessage ||
          "Some events were not accepted by Meta.";
        setSendError(typeof errMsg === "string" ? errMsg : "Meta rejected some events.");
        toast({
          title: "Some events were not accepted",
          description: `${result.sent} sent, ${result.failed} failed.`,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Events sent to Meta",
          description: `${result.sent} lead event${result.sent === 1 ? "" : "s"} submitted successfully.`,
        });
        setSelectedIds(new Set());
        // Refresh to reflect updated sentToMeta status
        void loadLeads();
        void loadStats();
      }
    } catch (error: any) {
      const msg = error?.response?.data?.message || "Meta rejected the request.";
      setSendError(msg);
      toast({
        title: "Failed to send events",
        description: msg,
        variant: "destructive",
      });
    } finally {
      setSending(false);
    }
  };

  // ── Reset filters when mode changes ─────────────────────────────────────────

  function handleModeChange(mode: SendMode) {
    setSendMode(mode);
    setProgressFilter("all");
    setQualityFilter("all");
    setPage(1);
  }

  // ── Guard ────────────────────────────────────────────────────────────────────

  if (!canAccess) return <Redirect to="/" />;

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <PageWrapper
      title="Meta Conversions API"
      breadcrumbs={[
        { label: "Leads", href: "/leads" },
        { label: "Automation", href: "/leads/automation" },
        { label: "Meta Conversions API" },
      ]}
      actions={
        <Link href="/leads/automation">
          <Button variant="outline" size="sm" className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
        </Link>
      }
    >
      <div className="space-y-6">

        {/* ── Status card ─────────────────────────────────────────────────────── */}
        <Card className="border-border/60 shadow-sm">
          <CardHeader className="pb-3">
            <div className="flex items-start gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-[#1877F2]/10">
                <Share2 className="h-5 w-5 text-[#1877F2]" />
              </div>
              <div className="min-w-0 flex-1">
                <CardTitle className="text-base">
                  Send lead quality signals to Meta
                </CardTitle>
                <CardDescription>
                  Select Facebook/Instagram leads and send their current CRM status back to Meta
                  through the Conversions API so campaigns can optimise for better lead quality.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-lg border border-border/60 p-3">
              <p className="text-xs text-muted-foreground">Pixel ID</p>
              <p className="mt-1 text-sm font-medium">{status?.pixelId || "—"}</p>
            </div>
            <div className="rounded-lg border border-border/60 p-3">
              <p className="text-xs text-muted-foreground">Facebook connection</p>
              <p className="mt-1 text-sm font-medium">
                {statusLoading
                  ? "Checking..."
                  : status?.facebookConnected
                  ? status.facebookExpired
                    ? "Expired"
                    : "Connected"
                  : "Not connected"}
              </p>
            </div>
            <div className="rounded-lg border border-border/60 p-3">
              <p className="text-xs text-muted-foreground">Access token source</p>
              <p className="mt-1 text-sm font-medium">
                {status?.hasDedicatedAccessToken
                  ? "Dedicated CAPI token"
                  : status?.usingFacebookUserTokenFallback
                  ? "Facebook user token (fallback)"
                  : "Facebook user token"}
              </p>
              {!statusLoading && !status?.hasDedicatedAccessToken ? (
                <p className="mt-2 text-xs text-amber-700">
                  Set META_CONVERSIONS_ACCESS_TOKEN for the Events Manager pixel token.
                </p>
              ) : null}
            </div>
            <div className="rounded-lg border border-border/60 p-3">
              <p className="text-xs text-muted-foreground">Selected leads</p>
              <p className="mt-1 text-sm font-medium">{selectedIds.size}</p>
            </div>
          </CardContent>
        </Card>

        {/* ── Leads card ──────────────────────────────────────────────────────── */}
        <Card className="border-border/60 shadow-sm">
          <CardHeader className="gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <CardTitle className="text-base">Facebook &amp; Instagram leads</CardTitle>
              <CardDescription>
                Filter leads, select rows, then send CRM status to Meta.
              </CardDescription>
            </div>
            <Button
              onClick={() => {
                if (!selectedIds.size) {
                  toast({
                    title: "Select leads first",
                    description: "Tick one or more leads before sending.",
                    variant: "destructive",
                  });
                  return;
                }
                setConfirmOpen(true);
              }}
              disabled={sending || selectedIds.size === 0}
              className="gap-2"
            >
              {sending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
              Send to Meta ({selectedIds.size})
            </Button>
          </CardHeader>

          <CardContent className="space-y-4">

            {/* Row 1: date picker + sent filter */}
            <div className="flex flex-wrap gap-3">

              {/* Date range picker */}
              <div className="relative" ref={datePickerRef}>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowDatePicker((v) => !v)}
                  className={cn(
                    "gap-2 text-sm",
                    (dateFrom || dateTo) && "border-primary text-primary"
                  )}
                >
                  <CalendarRange className="h-4 w-4" />
                  {dateLabel}
                </Button>
                {showDatePicker && (
                  <div className="absolute left-0 top-full z-50 mt-1">
                    <DateRangePicker
                      onApply={handleDateApply}
                      onCancel={() => setShowDatePicker(false)}
                    />
                  </div>
                )}
              </div>

              {/* Clear date */}
              {(dateFrom || dateTo) && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="gap-1 text-xs text-muted-foreground"
                  onClick={() => {
                    setDateFrom(undefined);
                    setDateTo(undefined);
                    setDateLabel("All time");
                    setPage(1);
                  }}
                >
                  Clear dates
                </Button>
              )}

              {/* Sent to Meta filter */}
              <Select
                value={sentFilter}
                onValueChange={(v) => {
                  setSentFilter(v as SentFilter);
                  setPage(1);
                }}
              >
                <SelectTrigger className="w-full max-w-[200px] text-sm">
                  <Filter className="mr-2 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="unsent">Unsent to Meta</SelectItem>
                  <SelectItem value="all">All leads</SelectItem>
                  <SelectItem value="sent">Sent to Meta</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Row 2: send mode toggle */}
            <div className="flex items-center gap-1 rounded-lg border border-border/60 p-1 w-fit">
              <button
                type="button"
                onClick={() => handleModeChange("progress")}
                className={cn(
                  "rounded-md px-4 py-1.5 text-sm font-medium transition-colors",
                  sendMode === "progress"
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:bg-muted"
                )}
              >
                By Progress
              </button>
              <button
                type="button"
                onClick={() => handleModeChange("quality")}
                className={cn(
                  "rounded-md px-4 py-1.5 text-sm font-medium transition-colors",
                  sendMode === "quality"
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:bg-muted"
                )}
              >
                By Quality
              </button>
            </div>

            {/* Stats bar: excluded lead counts */}
            {(sendMode === "progress"
              ? statsNotAssigned !== null || statsAssigned !== null
              : statsNoQuality !== null) && (
              <div className="flex flex-wrap gap-2">
                {sendMode === "progress" && (
                  <>
                    {statsNotAssigned !== null && statsNotAssigned > 0 && (
                      <div className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs text-slate-600">
                        <span className="font-semibold text-slate-800">{statsNotAssigned}</span>
                        lead{statsNotAssigned === 1 ? "" : "s"} not assigned in system
                      </div>
                    )}
                    {statsAssigned !== null && statsAssigned > 0 && (
                      <div className="inline-flex items-center gap-1.5 rounded-md border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs text-amber-700">
                        <span className="font-semibold text-amber-800">{statsAssigned}</span>
                        lead{statsAssigned === 1 ? "" : "s"} not yet contacted
                      </div>
                    )}
                    {statsNotAssigned === 0 && statsAssigned === 0 && (
                      <div className="inline-flex items-center gap-1.5 rounded-md border border-green-200 bg-green-50 px-3 py-1.5 text-xs text-green-700">
                        All leads have been assigned and contacted
                      </div>
                    )}
                  </>
                )}
                {sendMode === "quality" && statsNoQuality !== null && (
                  statsNoQuality > 0 ? (
                    <div className="inline-flex items-center gap-1.5 rounded-md border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs text-amber-700">
                      <span className="font-semibold text-amber-800">{statsNoQuality}</span>
                      lead{statsNoQuality === 1 ? "" : "s"} with no quality marked
                    </div>
                  ) : (
                    <div className="inline-flex items-center gap-1.5 rounded-md border border-green-200 bg-green-50 px-3 py-1.5 text-xs text-green-700">
                      All leads have quality marked
                    </div>
                  )
                )}
              </div>
            )}

            {/* Row 3: mode-specific filter + search + page size */}
            <div className="flex flex-wrap gap-3 items-center">
              {/* Progress filter */}
              {sendMode === "progress" && (
                <Select
                  value={progressFilter}
                  onValueChange={(v) => {
                    setProgressFilter(v as ProgressFilter);
                    setPage(1);
                  }}
                >
                  <SelectTrigger className="w-full max-w-[200px]">
                    <SelectValue placeholder="Progress status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All statuses</SelectItem>
                    <SelectItem value="junk">Junk</SelectItem>
                    <SelectItem value="dropped">Dropped</SelectItem>
                    <SelectItem value="converted">Converted</SelectItem>
                    <SelectItem value="transferred">Transferred</SelectItem>
                  </SelectContent>
                </Select>
              )}

              {/* Quality filter */}
              {sendMode === "quality" && (
                <Select
                  value={qualityFilter}
                  onValueChange={(v) => {
                    setQualityFilter(v as QualityFilter);
                    setPage(1);
                  }}
                >
                  <SelectTrigger className="w-full max-w-[200px]">
                    <SelectValue placeholder="Lead quality" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All qualities</SelectItem>
                    <SelectItem value="excellent">Excellent</SelectItem>
                    <SelectItem value="good">Good</SelectItem>
                    <SelectItem value="average">Average</SelectItem>
                    <SelectItem value="bad">Bad</SelectItem>
                  </SelectContent>
                </Select>
              )}

              <Input
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                placeholder="Search name, phone, email..."
                className="max-w-xs"
              />

              <Select
                value={String(limit)}
                onValueChange={(v) => {
                  setLimit(Number(v));
                  setPage(1);
                }}
              >
                <SelectTrigger className="w-[130px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PAGE_SIZE_OPTIONS.map((s) => (
                    <SelectItem key={s} value={String(s)}>
                      {s} / page
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Table */}
            <div className="rounded-lg border border-border/60 overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10">
                      <Checkbox
                        checked={
                          allOnPageSelected
                            ? true
                            : someOnPageSelected
                            ? "indeterminate"
                            : false
                        }
                        onCheckedChange={toggleAllOnPage}
                        aria-label="Select all on page"
                      />
                    </TableHead>
                    <TableHead>Lead</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Progress</TableHead>
                    <TableHead>Quality</TableHead>
                    <TableHead>FB Lead ID</TableHead>
                    <TableHead>Sent to Meta</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell
                        colSpan={7}
                        className="py-10 text-center text-muted-foreground"
                      >
                        <Loader2 className="mx-auto mb-2 h-5 w-5 animate-spin" />
                        Loading leads…
                      </TableCell>
                    </TableRow>
                  ) : leads.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={7}
                        className="py-10 text-center text-muted-foreground"
                      >
                        No leads match the current filters.
                      </TableCell>
                    </TableRow>
                  ) : (
                    leads.map((lead) => (
                      <TableRow
                        key={lead.id}
                        className={selectedIds.has(lead.id) ? "bg-muted/40" : undefined}
                      >
                        <TableCell>
                          <Checkbox
                            checked={selectedIds.has(lead.id)}
                            onCheckedChange={() => toggleLead(lead.id)}
                            aria-label={`Select ${lead.fullName}`}
                          />
                        </TableCell>
                        <TableCell>
                          <div className="font-medium">{lead.fullName}</div>
                          <div className="text-xs text-muted-foreground">
                            {lead.email || "No email"}
                          </div>
                        </TableCell>
                        <TableCell>{lead.phone}</TableCell>
                        <TableCell>
                          <Badge
                            variant="secondary"
                            className={cn(
                              "capitalize",
                              STATUS_COLORS[lead.progressStatus] || "bg-gray-100 text-gray-600"
                            )}
                          >
                            {fmt(lead.progressStatus)}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {lead.leadQuality ? (
                            <Badge
                              variant="secondary"
                              className={cn(
                                "capitalize",
                                QUALITY_COLORS[lead.leadQuality] || "bg-gray-100 text-gray-600"
                              )}
                            >
                              {lead.leadQuality}
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell className="font-mono text-xs">
                          {lead.externalLeadId || "—"}
                        </TableCell>
                        <TableCell>
                          {lead.sentToMeta ? (
                            <span className="inline-flex items-center gap-1 text-xs font-medium text-green-700">
                              <CheckCircle2 className="h-3.5 w-3.5" />
                              Sent
                            </span>
                          ) : (
                            <span className="text-xs text-muted-foreground">Unsent</span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>

            {/* Pagination */}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-muted-foreground">
                Showing {leads.length ? (page - 1) * limit + 1 : 0}–
                {Math.min(page * limit, total)} of {total}
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1 || loading}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-sm">
                  Page {page} of {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages || loading}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ── Payload preview card ─────────────────────────────────────────────── */}
        {selectedIds.size > 0 && (() => {
          const previewLead = leads.find((l) => selectedIds.has(l.id));
          if (!previewLead) return null;
          const payload = buildExamplePayload(previewLead, sendMode);
          return (
            <Card className="border-border/60 shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Payload preview</CardTitle>
                <CardDescription>
                  Example of what will be sent to Meta for{" "}
                  <span className="font-medium text-foreground">{previewLead.fullName}</span>
                  {selectedIds.size > 1 && (
                    <> (1 of {selectedIds.size} selected leads)</>
                  )}.{" "}
                  {sendMode === "quality"
                    ? "Event name = lead quality."
                    : "Event name = assignment status (or \"junk\" for junk-marked leads)."}
                  {" "}Emails and phones are SHA-256 hashed before sending.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    event_name
                  </span>
                  <Badge
                    variant="secondary"
                    className={cn(
                      "capitalize text-xs",
                      sendMode === "quality"
                        ? QUALITY_COLORS[previewLead.leadQuality || ""] || "bg-gray-100 text-gray-600"
                        : STATUS_COLORS[payload.data[0].event_name] ||
                          "bg-slate-100 text-slate-700"
                    )}
                  >
                    {payload.data[0].event_name.replace(/_/g, " ")}
                  </Badge>
                </div>
                <pre className="max-h-[320px] overflow-auto rounded-lg bg-muted/40 p-4 text-xs leading-relaxed">
                  {JSON.stringify(payload, null, 2)}
                </pre>
              </CardContent>
            </Card>
          );
        })()}

        {/* ── Meta response card ───────────────────────────────────────────────── */}
        {sending ? (
          <Card className="border-border/60 shadow-sm">
            <CardHeader>
              <CardTitle className="text-base">Submitting to Meta…</CardTitle>
              <CardDescription>
                Waiting for Meta Conversions API to respond. Please wait.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-[#1877F2]" />
            </CardContent>
          </Card>
        ) : sendSummary || sendError ? (
          <Card
            className={cn(
              "border shadow-sm",
              sendError ? "border-red-200 bg-red-50/30" : "border-green-200 bg-green-50/30"
            )}
          >
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                {sendError ? (
                  <XCircle className="h-5 w-5 text-red-600" />
                ) : (
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                )}
                <CardTitle className="text-base">
                  {sendError ? "Meta returned an error" : "Leads submitted for review"}
                </CardTitle>
              </div>
              {sendSummary && (
                <CardDescription>
                  {sendSummary.sent} event{sendSummary.sent !== 1 ? "s" : ""} accepted
                  {sendSummary.failed > 0 ? `, ${sendSummary.failed} failed` : ""}.
                  {!sendError && " Meta will process these leads for campaign optimisation."}
                </CardDescription>
              )}
              {sendError && (
                <p className="mt-1 text-sm text-red-700">{sendError}</p>
              )}
            </CardHeader>
            {metaResponses.length > 0 && (
              <CardContent>
                <p className="mb-2 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Raw Meta Graph API response
                </p>
                <pre className="max-h-[360px] overflow-auto rounded-lg bg-muted/40 p-4 text-xs leading-relaxed">
                  {JSON.stringify(metaResponses, null, 2)}
                </pre>
              </CardContent>
            )}
          </Card>
        ) : null}
      </div>

      {/* ── Confirmation dialog ───────────────────────────────────────────────── */}
      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Send {selectedIds.size} lead{selectedIds.size !== 1 ? "s" : ""} to Meta?</AlertDialogTitle>
            <AlertDialogDescription>
              {sendMode === "quality"
                ? "The lead quality value will be sent as the conversion event name."
                : "The assignment status of each lead will be sent as the event name (junk leads send \"junk\")."}{" "}
              Once sent, these leads will be marked as submitted. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setConfirmOpen(false);
                void handleSendConfirm();
              }}
            >
              Send to Meta
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </PageWrapper>
  );
}
