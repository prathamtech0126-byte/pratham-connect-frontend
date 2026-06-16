import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useLeadSocketRefresh } from "@/hooks/use-lead-socket";
import { useLocation, useSearch } from "wouter";
import { format } from "date-fns";

import {
  istCalendarYmd,
  istMonthPresetYmds,
  istWeekYmds,
  istYmdInclusiveRangeIso,
} from "@/lib/ist-date-range";

import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/context/auth-context";

import { Breadcrumbs } from "@/layout/Breadcrumbs";
import { AddLead } from "@/components/add-lead";
import { SearchableAssigneePicker } from "@/components/leads/SearchableAssigneePicker";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { DateTimePicker } from "@/components/ui/date-time-picker";
import {
  clampFollowupDateTime,
  getMinFollowupDateTime,
  getTomorrowMorning1030,
  isFollowupDateTimeAllowed,
} from "@/lib/followup-datetime";
import DateRangePicker from "@/components/payments/DateRangePicker";

import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Phone,
  Tag,
  CalendarClock,
  X,
  Calendar,
  Send,
  Star,
  UserCheck,
  RotateCcw,
} from "lucide-react";

import api from "@/lib/api";
import { cn } from "@/lib/utils";

import {
  fetchAllLeads,
  assignLeadApi,
  addLeadActivityApi,
  updateLeadFieldsApi,
  type LeadEntity,
  type LeadEligibilityStatus,
  type LeadQuality,
} from "@/api/leads.api";
import { LeadBulkAssignDialog } from "@/components/leads/LeadBulkAssignDialog";
import {
  getLeadDisplayTags,
  leadStatusBadgeClassName,
  LEAD_STATUS_TABLE_HEAD_CLASS,
  LEAD_STATUS_TABLE_CELL_CLASS,
  isLeadTransferBlocked,
  isLeadReadOnly,
  isLeadJunk,
  sortLeadsForDisplay,
  mergeLeadRow,
  canTransferToCounsellor,
} from "@/lib/lead-status-tags";
import {
  consumeLeadListPatches,
  extractLeadFromSocketPayload,
  saveLeadListCache,
  readLeadListCache,
  markLeadListNavAway,
  consumeLeadListNavReturn,
  saveLeadListScrollY,
  consumeLeadListScrollY,
  getScrollContainerScrollY,
  restoreLeadListScrollY,
} from "@/lib/lead-list-sync";
import { listPatchFromLeadUpdate } from "@/lib/lead-progress-rules";
import { getLeadSourceLabel } from "@/lib/lead-source-display";
import {
  getLeadReferenceDisplayLabel,
  leadHasReferenceSource,
} from "@/lib/lead-reference-display";
import { toCrmApiTimestamp } from "@/lib/format-crm-timestamp";

type Counsellor = { id: number; fullName: string };
type LeadType = { id: number; leadType: string; displayAlias?: string | null };

type SaleType = { id: number; saleType: string };
type DateFilterType = "all" | "today" | "weekly" | "monthly" | "custom";

const COUNSELLOR_LIST_BUCKETS = [
  "not_contacted",
  "in_progress",
  "follow_up",
  "converted",
  "dropped",
] as const;

type CounsellorListBucket = (typeof COUNSELLOR_LIST_BUCKETS)[number];

function isCounsellorListBucket(value: string): value is CounsellorListBucket {
  return (COUNSELLOR_LIST_BUCKETS as readonly string[]).includes(value);
}

const PROGRESS_STATUS_OPTIONS = [
  { value: "not_contacted", label: "Not Contacted" },
  { value: "contacted", label: "Contacted" },
  { value: "follow_up", label: "Follow Up" },
  { value: "junk", label: "Junk" },
];

const ASSIGNMENT_STATUS_OPTIONS_FULL = [
  { value: "not_assigned", label: "Not Assigned" },
  { value: "assigned", label: "Assigned" },
  { value: "transferred", label: "Transferred" },
  { value: "converted", label: "Converted" },
  { value: "dropped", label: "Drop" },
];

const ASSIGNMENT_STATUS_OPTIONS_TELECALLER = [
  { value: "transferred", label: "Transferred" },
  { value: "converted", label: "Converted" },
];

const ASSIGNMENT_STATUS_OPTIONS_COUNSELLOR = [
  { value: "assigned", label: "Assigned" },
  { value: "transferred", label: "Transferred" },
  { value: "converted", label: "Converted" },
  { value: "follow_up", label: "Follow Up" },
  { value: "dropped", label: "Drop" },
];

const ELIGIBILITY_OPTIONS: { value: LeadEligibilityStatus; label: string }[] = [
  { value: "eligible", label: "Eligible" },
  { value: "not_eligible", label: "Not Eligible" },
  { value: "future_prospect", label: "Future Prospect" },
];

const QUALITY_OPTIONS: { value: LeadQuality; label: string }[] = [
  { value: "excellent", label: "Excellent" },
  { value: "good", label: "Good" },
  { value: "average", label: "Average" },
  { value: "bad", label: "Bad" },
];

const leadQualityLabel = (quality?: LeadQuality | null) =>
  QUALITY_OPTIONS.find((option) => option.value === quality)?.label ?? "—";

const SEARCH_MIN_LENGTH = 3;
const SEARCH_DEBOUNCE_MS = 400;

const DATE_FILTER_LABELS: Record<DateFilterType, string> = {
  all: "All",
  today: "Today",
  weekly: "Weekly",
  monthly: "Monthly",
  custom: "Custom",
};

const statusColors: Record<string, string> = {
  not_contacted: "bg-slate-100 text-slate-600",
  contacted: "bg-blue-100 text-blue-700",
  follow_up: "bg-amber-100 text-amber-700",
  interested: "bg-green-100 text-green-700",
  not_interested: "bg-red-100 text-red-600",
  converted: "bg-emerald-100 text-emerald-700",
  junk: "bg-red-200 text-red-700",
};

const LEADLIST_FILTER_KEY = "leadlist_filters";

function shouldIgnoreStoredLeadFilters(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const qs = new URLSearchParams(window.location.search);
    return qs.get("clearFilters") === "1";
  } catch {
    return false;
  }
}

/** Read report-drill URL params synchronously on mount so the first API call is correct. */
function readReportUrlParams() {
  if (typeof window === "undefined") return null;
  try {
    const qs = new URLSearchParams(window.location.search);
    if (qs.get("clearFilters") !== "1") return null;
    return {
      reportBucket: (qs.get("reportBucket") as "" | "contacted" | "transferred") || "",
      forReport: qs.get("forReport") === "1",
      transferredFrom: qs.get("transferredFrom") ?? undefined,
      transferredTo: qs.get("transferredTo") ?? undefined,
      convertedFrom: qs.get("convertedFrom") ?? undefined,
      convertedTo: qs.get("convertedTo") ?? undefined,
      droppedFrom: qs.get("droppedFrom") ?? undefined,
      droppedTo: qs.get("droppedTo") ?? undefined,
      dateFilter: (qs.get("dateFilter") as DateFilterType) || "weekly",
      afterDate: qs.get("afterDate") ?? undefined,
      beforeDate: qs.get("beforeDate") ?? undefined,
    };
  } catch {
    return null;
  }
}

function readLeadListFilters(): Record<string, unknown> {
  if (shouldIgnoreStoredLeadFilters()) return {};
  try {
    const raw = sessionStorage.getItem(LEADLIST_FILTER_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch { return {}; }
}

export default function LeadList() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const searchStr = useSearch();
  const { toast } = useToast();

  // Detect back-navigation from lead detail (consumed once on mount).
  const isReturnFromDetail = useRef(consumeLeadListNavReturn());
  const cachedLeadsRef = useRef<LeadEntity[] | null>(
    isReturnFromDetail.current ? readLeadListCache() : null
  );
  // Skip the first run of the page-reset useLayoutEffect when restoring from cache,
  // otherwise it fires on mount and resets page → 1 before the cache can be applied.
  const skipFirstPageReset = useRef(isReturnFromDetail.current && cachedLeadsRef.current !== null);
  // Pending scroll Y to restore after the list renders from cache.
  const [pendingScrollY, setPendingScrollY] = useState<number | null>(null);

  const [leads, setLeads] = useState<LeadEntity[]>([]);
  const [loading, setLoading] = useState(false);
  const MAX_LEADS_PER_PAGE = 500;

  const [page, setPage] = useState(() => {
    const n = Number(readLeadListFilters().page);
    return Number.isFinite(n) && n > 0 ? n : 1;
  });
  const [perPagePreset, setPerPagePreset] = useState<"20" | "50" | "100" | "custom">(() => {
    const stored = readLeadListFilters().perPagePreset as string;
    return (["20", "50", "100", "custom"] as const).includes(stored as "20" | "50" | "100" | "custom")
      ? (stored as "20" | "50" | "100" | "custom")
      : "50";
  });
  /** Applied limit when preset is Custom (avoids refetch on every keystroke). */
  const [customPerPageCommitted, setCustomPerPageCommitted] = useState(() => {
    const n = Number(readLeadListFilters().customPerPageCommitted);
    return Number.isFinite(n) && n > 0 ? n : 50;
  });
  const [customPerPageDraft, setCustomPerPageDraft] = useState(() => {
    const n = Number(readLeadListFilters().customPerPageCommitted);
    return String(Number.isFinite(n) && n > 0 ? n : 50);
  });
  const pageSize = useMemo(() => {
    if (perPagePreset !== "custom") return Number(perPagePreset);
    return Math.min(MAX_LEADS_PER_PAGE, Math.max(1, customPerPageCommitted));
  }, [perPagePreset, customPerPageCommitted]);

  const applyCustomPerPage = useCallback(() => {
    const n = parseInt(String(customPerPageDraft).trim(), 10);
    if (!Number.isFinite(n) || n < 1) {
      setCustomPerPageDraft(String(customPerPageCommitted));
      return;
    }
    const clamped = Math.min(MAX_LEADS_PER_PAGE, n);
    setCustomPerPageCommitted(clamped);
    setCustomPerPageDraft(String(clamped));
    setPage(1);
  }, [customPerPageDraft, customPerPageCommitted]);

  const [pagination, setPagination] = useState({
    page: 1,
    limit: 100,
    total: 0,
    totalPages: 1,
  });

  // Filters — restored from sessionStorage on mount
  const [search, setSearch] = useState(() => String(readLeadListFilters().search ?? ""));
  /** Debounced term sent to API (only when length >= SEARCH_MIN_LENGTH). */
  const [debouncedSearch, setDebouncedSearch] = useState(() => {
    const s = String(readLeadListFilters().search ?? "");
    return s.trim().length >= SEARCH_MIN_LENGTH ? s.trim() : "";
  });
  const [filterLeadSource, setFilterLeadSource] = useState(() => String(readLeadListFilters().filterLeadSource ?? ""));
  const [filterLeadType, setFilterLeadType] = useState(() => String(readLeadListFilters().filterLeadType ?? ""));
  const [filterProgressStatus, setFilterProgressStatus] = useState(() => String(readLeadListFilters().filterProgressStatus ?? ""));
  const [filterAssignmentStatus, setFilterAssignmentStatus] = useState(() => String(readLeadListFilters().filterAssignmentStatus ?? ""));
  const [filterEligibility, setFilterEligibility] = useState(() => String(readLeadListFilters().filterEligibility ?? ""));
  const [filterQuality, setFilterQuality] = useState(() => String(readLeadListFilters().filterQuality ?? ""));

  // Date filter — prefer URL params on report drill-down so the first API call is correct
  const [dateFilter, setDateFilter] = useState<DateFilterType>(() => {
    const rp = readReportUrlParams();
    if (rp) return rp.dateFilter;
    const stored = readLeadListFilters().dateFilter as DateFilterType;
    return (["all", "today", "weekly", "monthly", "custom"] as const).includes(stored) ? stored : "weekly";
  });
  const [customDateFrom, setCustomDateFrom] = useState<string | undefined>(() => {
    const rp = readReportUrlParams();
    if (rp) return rp.afterDate;
    return readLeadListFilters().customDateFrom as string | undefined;
  });
  const [customDateTo, setCustomDateTo] = useState<string | undefined>(() => {
    const rp = readReportUrlParams();
    if (rp) return rp.beforeDate;
    return readLeadListFilters().customDateTo as string | undefined;
  });
  const [showDatePicker, setShowDatePicker] = useState(false);

  const [isAddLeadOpen, setIsAddLeadOpen] = useState(false);

  const [transferLead, setTransferLead] = useState<LeadEntity | null>(null);
  const [followupLead, setFollowupLead] = useState<LeadEntity | null>(null);

  const [eligibilityLead, setEligibilityLead] = useState<LeadEntity | null>(null);
  const [eligibilityValue, setEligibilityValue] = useState<LeadEligibilityStatus | "">("");

  const [qualityLead, setQualityLead] = useState<LeadEntity | null>(null);
  const [qualityValue, setQualityValue] = useState<LeadQuality | "">("");

  const [counsellors, setCounsellors] = useState<Counsellor[]>([]);
  const [leadTypes, setLeadTypes] = useState<LeadType[]>([]);
  const [saleTypes, setSaleTypes] = useState<SaleType[]>([]);
  const [selectedCounsellorId, setSelectedCounsellorId] = useState("");

  const [followupDateTime, setFollowupDateTime] = useState<Date | null>(null);
  const [dateTimePickerOpen, setDateTimePickerOpen] = useState(false);
  const [followupNote, setFollowupNote] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const [filterTelecaller, setFilterTelecaller] = useState(() => String(readLeadListFilters().filterTelecaller ?? ""));
  const [telecallers, setTelecallers] = useState<Counsellor[]>([]);
  const [filterCounsellor, setFilterCounsellor] = useState(() => String(readLeadListFilters().filterCounsellor ?? ""));
  const [excludeUnassigned, setExcludeUnassigned] = useState(() => {
    const stored = readLeadListFilters().excludeUnassigned;
    return stored === true || stored === "true" || stored === "1";
  });
  const [assignedScopeMode, setAssignedScopeMode] = useState(false);
  const [forReportMode, setForReportMode] = useState(() => readReportUrlParams()?.forReport ?? false);
  const [filterWithTelecaller, setFilterWithTelecaller] = useState(false);
  const [counsellorReportDrillMode, setCounsellorReportDrillMode] = useState(false);
  const [reportWithoutTelecaller, setReportWithoutTelecaller] = useState(false);
  const [reportWithTelecaller, setReportWithTelecaller] = useState(false);
  const [reportBucketFilter, setReportBucketFilter] = useState<"" | "contacted" | "transferred">(() => readReportUrlParams()?.reportBucket ?? "");
  const [hasPendingFollowUpOnly, setHasPendingFollowUpOnly] = useState(false);
  // Blocks loadLeads until the URL-params useEffect has run and applied all filters.
  const [filtersReady, setFiltersReady] = useState(false);

  /**
   * Authoritative current-user id, fetched directly from `/api/users/me`.
   * `user?.id` from auth-context can fall back to a hardcoded mock value
   * for some users, which causes "self" to leak into the telecaller-transfer
   * dropdown. We compare against this id first.
   */
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    api
      .get("/api/users/me")
      .then((res) => {
        if (cancelled) return;
        const id = res?.data?.userId;
        if (id != null) setCurrentUserId(String(id));
      })
      .catch(() => { /* ignore — fall back to user?.id */ });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(searchStr.startsWith("?") ? searchStr.slice(1) : searchStr);
    const telecallerId = params.get("telecallerId");
    const counsellorId = params.get("counsellorId");
    const date = params.get("date");
    const followupToday = params.get("followupToday");
    const progress = params.get("progress");
    const assignment = params.get("assignment");
    const dateFilterParam = params.get("dateFilter");
    const afterDate = params.get("afterDate");
    const beforeDate = params.get("beforeDate");
    const createdFrom = params.get("createdFrom");
    const createdTo = params.get("createdTo");
    const transferredFrom = params.get("transferredFrom");
    const transferredTo = params.get("transferredTo");
    const convertedFrom = params.get("convertedFrom");
    const convertedTo = params.get("convertedTo");
    const droppedFrom = params.get("droppedFrom");
    const droppedTo = params.get("droppedTo");
    const assignedScope = params.get("assignedScope");
    const reportBucket = params.get("reportBucket");
    const hasPendingFollowUp = params.get("hasPendingFollowUp") ?? params.get("pendingFollowUp");
    const clearFilters = params.get("clearFilters");
    const counsellorListFilter = params.get("counsellorListFilter");
    const forReport = params.get("forReport");
    const counsellorReportDrill = params.get("counsellorReportDrill");
    const reportSegment = params.get("reportSegment");
    const excludeUnassignedParam = params.get("excludeUnassigned");

    if (clearFilters === "1") {
      try {
        sessionStorage.removeItem(LEADLIST_FILTER_KEY);
      } catch {}
      setSearch("");
      setFilterLeadSource("");
      setFilterLeadType("");
      setFilterProgressStatus("");
      setFilterAssignmentStatus("");
      setFilterEligibility("");
      setFilterQuality("");
      setFilterTelecaller("");
      setFilterCounsellor("");
      setCustomDateFrom(undefined);
      setCustomDateTo(undefined);
      setDateFilter("weekly");
      setAssignedScopeMode(false);
      setForReportMode(false);
      setExcludeUnassigned(false);
      setFilterWithTelecaller(false);
      setCounsellorReportDrillMode(false);
      setReportWithoutTelecaller(false);
      setReportWithTelecaller(false);
      setReportBucketFilter("");
      setHasPendingFollowUpOnly(false);
      setPage(1);
      setPerPagePreset("50");
      setCustomPerPageCommitted(50);
      setCustomPerPageDraft("50");
    }

    if (telecallerId) setFilterTelecaller(telecallerId);
    if (counsellorId) setFilterCounsellor(counsellorId);
    if (date === "all") setDateFilter("all");
    if (followupToday === "1") {
      setDateFilter("today");
      setFilterProgressStatus("follow_up");
    }
    setForReportMode(forReport === "1" || forReport === "true");
    const isDrill = counsellorReportDrill === "1";
    setCounsellorReportDrillMode(isDrill);
    if (isDrill) {
      if (reportSegment === "direct" || params.get("withoutTelecaller") === "1") {
        setReportWithoutTelecaller(true);
        setReportWithTelecaller(false);
      } else if (reportSegment === "via" || params.get("withTelecaller") === "1") {
        setReportWithTelecaller(true);
        setReportWithoutTelecaller(false);
      } else {
        setReportWithoutTelecaller(false);
        setReportWithTelecaller(false);
      }
    }
    if (counsellorListFilter && isCounsellorListBucket(counsellorListFilter)) {
      setFilterProgressStatus(counsellorListFilter);
    } else if (progress) setFilterProgressStatus(progress);
    else if (assignedScope === "1") setFilterProgressStatus("");
    if (assignment) setFilterAssignmentStatus(assignment);
    else if (assignedScope === "1") setFilterAssignmentStatus("");
    setExcludeUnassigned(excludeUnassignedParam === "1" || excludeUnassignedParam === "true");
    if (
      dateFilterParam &&
      (["all", "today", "weekly", "monthly", "custom"] as const).includes(dateFilterParam as DateFilterType)
    ) {
      setDateFilter(dateFilterParam as DateFilterType);
    }
    // afterDate/beforeDate are yyyy-MM-dd (new style)
    if (afterDate) setCustomDateFrom(afterDate);
    if (beforeDate) setCustomDateTo(beforeDate);
    // Legacy: extract IST yyyy-MM-dd from ISO strings for transferred/converted/dropped/createdFrom
    const rawDateFrom = transferredFrom ?? convertedFrom ?? droppedFrom ?? createdFrom;
    const rawDateTo   = transferredTo   ?? convertedTo   ?? droppedTo   ?? createdTo;
    if (!afterDate && rawDateFrom) {
      setCustomDateFrom(
        rawDateFrom.includes("T") ? istCalendarYmd(new Date(rawDateFrom)) : rawDateFrom
      );
    }
    if (!beforeDate && rawDateTo) {
      setCustomDateTo(
        rawDateTo.includes("T") ? istCalendarYmd(new Date(rawDateTo)) : rawDateTo
      );
    }
    setAssignedScopeMode(assignedScope === "1");
    if (reportBucket === "contacted" || reportBucket === "transferred") {
      setReportBucketFilter(reportBucket);
    } else {
      setReportBucketFilter("");
    }
    setHasPendingFollowUpOnly(
      hasPendingFollowUp === "1" || hasPendingFollowUp === "true"
    );
    setFilterWithTelecaller(params.get("hasTelecaller") === "1");
    setFiltersReady(true);
  }, [searchStr]);

  // Persist filter state to sessionStorage whenever any filter changes
  useEffect(() => {
    try {
      sessionStorage.setItem(LEADLIST_FILTER_KEY, JSON.stringify({
        search,
        filterLeadSource,
        filterLeadType,
        filterProgressStatus,
        filterAssignmentStatus,
        filterEligibility,
        filterQuality,
        filterTelecaller,
        filterCounsellor,
        excludeUnassigned,
        dateFilter,
        customDateFrom,
        customDateTo,
        page,
        perPagePreset,
        customPerPageCommitted,
      }));
    } catch {}
  }, [
    search, filterLeadSource, filterLeadType, filterProgressStatus,
    filterAssignmentStatus, filterEligibility, filterQuality,
    filterTelecaller, filterCounsellor, excludeUnassigned, dateFilter,
    customDateFrom, customDateTo, page, perPagePreset, customPerPageCommitted,
  ]);

  // ── Telecaller-to-telecaller transfer ──────────────────────────
  const [isSelectMode, setIsSelectMode] = useState(false);
  const [selectedLeadIds, setSelectedLeadIds] = useState<Set<number>>(new Set());
  const [ttModalOpen, setTtModalOpen] = useState(false);
  const [ttLeadIds, setTtLeadIds] = useState<number[]>([]);
  const [ttTargetId, setTtTargetId] = useState("");
  const [ttConfirm, setTtConfirm] = useState(false);
  const [ttSubmitting, setTtSubmitting] = useState(false);

  const [adminTransferOpen, setAdminTransferOpen] = useState(false);

  const canBulkSelect =
    user?.role === "telecaller" ||
    ["admin", "superadmin", "developer", "manager"].includes(user?.role ?? "");
  const isAdminBulk = ["admin", "superadmin", "developer", "manager"].includes(user?.role ?? "");
  const isCounsellor = user?.role === "counsellor";
  const isTelecaller = user?.role === "telecaller";
  const isAdminJunkRestoreMode = isAdminBulk && filterProgressStatus === "junk";
  const progressStatusOptions = isCounsellor
    ? PROGRESS_STATUS_OPTIONS.filter((o) => o.value !== "junk")
    : PROGRESS_STATUS_OPTIONS;

  /**
   * Date filter params for API calls.
   *
   * - today/weekly/monthly → sends `dateFilter=today/weekly/monthly` only; backend computes IST bounds.
   * - custom → sends `afterDate`/`beforeDate` as yyyy-MM-dd; backend converts to naive IST strings.
   * - Sub-filters (transferred/converted/dropped/followup) → ISO UTC strings (backend uses pgNaiveIst).
   */
  const dateRangeParams = useMemo((): {
    dateFilter?: string;
    afterDate?: string;
    beforeDate?: string;
    transferredFrom?: string;
    transferredTo?: string;
    convertedFrom?: string;
    convertedTo?: string;
    droppedFrom?: string;
    droppedTo?: string;
    nextFollowupFrom?: string;
    nextFollowupTo?: string;
  } => {
    if (dateFilter === "all") return {};

    // For sub-filters we still need the ISO range (backend uses pgNaiveIst for outcome columns)
    const isSubFilter =
      filterProgressStatus === "follow_up" ||
      reportBucketFilter === "transferred" ||
      (filterAssignmentStatus === "converted" && forReportMode) ||
      (filterAssignmentStatus === "dropped" && forReportMode);

    if (isSubFilter) {
      // Compute ymd bounds then convert to ISO for the sub-filter columns
      let afterDate: string | undefined;
      let beforeDate: string | undefined;
      const now = new Date();
      if (dateFilter === "today") {
        const ymd = istCalendarYmd(now); afterDate = ymd; beforeDate = ymd;
      } else if (dateFilter === "weekly") {
        const { from, to } = istWeekYmds(now); afterDate = from; beforeDate = to;
      } else if (dateFilter === "monthly") {
        const { from, to } = istMonthPresetYmds(now); afterDate = from; beforeDate = to;
      } else if (dateFilter === "custom" && customDateFrom && customDateTo) {
        afterDate = customDateFrom.includes("T") ? istCalendarYmd(new Date(customDateFrom)) : customDateFrom;
        beforeDate = customDateTo.includes("T") ? istCalendarYmd(new Date(customDateTo)) : customDateTo;
      }
      if (!afterDate || !beforeDate) return {};
      const isoFrom = istYmdInclusiveRangeIso(afterDate, beforeDate).createdFrom;
      const isoTo   = istYmdInclusiveRangeIso(afterDate, beforeDate).createdTo;
      if (filterProgressStatus === "follow_up") return { nextFollowupFrom: isoFrom, nextFollowupTo: isoTo };
      if (reportBucketFilter === "transferred") return { transferredFrom: isoFrom, transferredTo: isoTo };
      if (filterAssignmentStatus === "converted" && forReportMode) return { convertedFrom: isoFrom, convertedTo: isoTo };
      if (filterAssignmentStatus === "dropped" && forReportMode) return { droppedFrom: isoFrom, droppedTo: isoTo };
    }

    // Default created_at filter: send preset name or custom dates
    if (dateFilter === "today" || dateFilter === "weekly" || dateFilter === "monthly") {
      return { dateFilter };
    }
    if (dateFilter === "custom" && customDateFrom && customDateTo) {
      const afterDate = customDateFrom.includes("T") ? istCalendarYmd(new Date(customDateFrom)) : customDateFrom;
      const beforeDate = customDateTo.includes("T") ? istCalendarYmd(new Date(customDateTo)) : customDateTo;
      return { afterDate, beforeDate };
    }
    return {};
  }, [
    dateFilter,
    customDateFrom,
    customDateTo,
    filterProgressStatus,
    reportBucketFilter,
    filterAssignmentStatus,
    forReportMode,
  ]);

  useEffect(() => {
    const trimmed = search.trim();
    const timer = window.setTimeout(() => {
      setDebouncedSearch(trimmed.length >= SEARCH_MIN_LENGTH ? trimmed : "");
    }, SEARCH_DEBOUNCE_MS);
    return () => window.clearTimeout(timer);
  }, [search]);

  const searchQuery =
    debouncedSearch.length >= SEARCH_MIN_LENGTH ? debouncedSearch : undefined;
  const searchTooShort =
    search.trim().length > 0 && search.trim().length < SEARCH_MIN_LENGTH;
  const searchTyping =
    search.trim().length >= SEARCH_MIN_LENGTH && search.trim() !== debouncedSearch;

  useLayoutEffect(() => {
    // On mount after back-navigation, filters haven't actually changed — the values
    // just initialized from sessionStorage. Skip the reset so page stays at the
    // saved value (e.g. page 2) instead of jumping back to 1.
    if (skipFirstPageReset.current) {
      skipFirstPageReset.current = false;
      return;
    }
    setPage(1);
  }, [
    debouncedSearch,
    filterProgressStatus,
    filterAssignmentStatus,
    filterEligibility,
    filterQuality,
    filterLeadSource,
    filterLeadType,
    filterTelecaller,
    filterCounsellor,
    excludeUnassigned,
    dateFilter,
    customDateFrom,
    customDateTo,
    pageSize,
  ]);

  // Restore scroll position after the lead list renders from cache.
  useLayoutEffect(() => {
    if (pendingScrollY !== null && leads.length > 0) {
      restoreLeadListScrollY(pendingScrollY);
      setPendingScrollY(null);
    }
  }, [pendingScrollY, leads.length]);

  const activeFilterCount = [
    debouncedSearch ? "search" : "",
    filterLeadSource,
    filterLeadType,
    filterProgressStatus,
    filterAssignmentStatus,
    filterEligibility,
    filterQuality,
    filterTelecaller,
    filterCounsellor,
    // "weekly" is the default => not counted as an active filter
    dateFilter !== "weekly" && dateFilter !== "all" ? "date" : "",
    forReportMode ? "report" : "",
    reportBucketFilter ? "bucket" : "",
    assignedScopeMode ? "assignedScope" : "",
    excludeUnassigned ? "excludeUnassigned" : "",
    hasPendingFollowUpOnly ? "pendingFollowUp" : "",
    counsellorReportDrillMode ? "counsellorDrill" : "",
    filterWithTelecaller ? "withTelecaller" : "",
  ].filter(Boolean).length;

  // ── Data loading ───────────────────────────────────────────────
  const loadLeads = useCallback(async () => {
    try {
      setLoading(true);

      // Counsellor report card drill-down: exact API query only (no default list filter logic).
      if (counsellorReportDrillMode) {
        const bucket =
          filterProgressStatus && isCounsellorListBucket(filterProgressStatus)
            ? filterProgressStatus
            : undefined;
        const items = await fetchAllLeads({
          currentCounsellorId: filterCounsellor ? Number(filterCounsellor) : undefined,
          counsellorListFilter: bucket,
          forReport: true,
          isJunk: false,
          withoutTelecaller: reportWithoutTelecaller ? true : undefined,
          withTelecaller: reportWithTelecaller ? true : undefined,
          ...dateRangeParams,
        });
        const patches = consumeLeadListPatches();
        const merged = items.map((row) => {
          const patch = patches[String(row.id)];
          return patch ? mergeLeadRow(row, patch) : row;
        });
        const sorted = sortLeadsForDisplay(merged);
        setLeads(sorted);
        saveLeadListCache(sorted);
        const total = sorted.length;
        const totalPages = Math.max(1, Math.ceil(total / pageSize));
        setPagination({
          page: Math.min(page, totalPages),
          limit: pageSize,
          total,
          totalPages,
        });
        return;
      }

      let assignmentStatusParam = filterAssignmentStatus || undefined;
      let progressStatusParam = filterProgressStatus || undefined;
      let counsellorListFilterParam: CounsellorListBucket | undefined;
      let isJunkParam: boolean | undefined = false;
      if (isCounsellor) {
        progressStatusParam = undefined;
        if (filterAssignmentStatus === "follow_up") {
          progressStatusParam = "follow_up";
          assignmentStatusParam = undefined;
        } else if (filterProgressStatus && isCounsellorListBucket(filterProgressStatus)) {
          counsellorListFilterParam = filterProgressStatus;
        }
      } else if (
        filterCounsellor &&
        filterProgressStatus &&
        isCounsellorListBucket(filterProgressStatus)
      ) {
        // Admin drill-down from counsellor report (scoped by counsellor + bucket).
        counsellorListFilterParam = filterProgressStatus;
        progressStatusParam = undefined;
        assignmentStatusParam = undefined;
      }
      if (filterProgressStatus === "junk") {
        progressStatusParam = undefined;
        counsellorListFilterParam = undefined;
        isJunkParam = true;
      }

      const personFilterActive = Boolean(filterTelecaller || filterCounsellor);
      const hasExplicitProgressFilter = Boolean(filterProgressStatus);
      const assignmentBucket = filterAssignmentStatus;
      const effectiveReportBucket =
        !hasExplicitProgressFilter && !assignmentBucket ? reportBucketFilter : "";
      const isExplicitAssignmentBucket =
        assignmentBucket === "converted" ||
        assignmentBucket === "dropped" ||
        assignmentBucket === "transferred" ||
        assignmentBucket === "not_assigned";
      const effectiveAssignedScopeMode =
        assignedScopeMode && !hasExplicitProgressFilter && !assignmentBucket;
      if (effectiveAssignedScopeMode) {
        // Report "Assigned" drilldown should include junk + non-junk.
        isJunkParam = undefined;
      }

      // "Assigned to person" = every lead where their name is on the row (any status).
      // Assignment dropdown "Assigned" means assignment_status=assigned only — skip that when scoping by person.
      if (!isCounsellor && personFilterActive) {
        if (effectiveAssignedScopeMode || !isExplicitAssignmentBucket) {
          assignmentStatusParam = undefined;
          if (effectiveAssignedScopeMode) {
            progressStatusParam = undefined;
            counsellorListFilterParam = undefined;
          }
        }
      }

      const includeAllForPerson =
        !isCounsellor &&
        personFilterActive &&
        !hasExplicitProgressFilter &&
        (effectiveAssignedScopeMode || !isExplicitAssignmentBucket || Boolean(effectiveReportBucket));

      const items = await fetchAllLeads({
        search: searchQuery,
        progressStatus: progressStatusParam,
        counsellorListFilter: counsellorListFilterParam,
        assignmentStatus: assignmentStatusParam,
        eligibilityStatus: filterEligibility || undefined,
        leadQuality: filterQuality || undefined,
        currentTelecallerId: filterTelecaller ? Number(filterTelecaller) : undefined,
        currentCounsellorId: filterCounsellor ? Number(filterCounsellor) : undefined,
        isJunk: isJunkParam,
        leadSource: filterLeadSource || undefined,
        leadType: filterLeadType || undefined,
        forReport: forReportMode || includeAllForPerson ? true : undefined,
        assignedScope:
          effectiveAssignedScopeMode ? true : includeAllForPerson ? true : undefined,
        reportBucket: effectiveReportBucket || undefined,
        hasPendingFollowUp: hasPendingFollowUpOnly || undefined,
        withoutTelecaller: reportWithoutTelecaller ? true : undefined,
        withTelecaller: filterWithTelecaller ? true : undefined,
        excludeUnassigned: excludeUnassigned || undefined,
        ...dateRangeParams,
      });
      const patches = consumeLeadListPatches();
      const merged = items.map((row) => {
        const patch = patches[String(row.id)];
        return patch ? mergeLeadRow(row, patch) : row;
      });
      const sorted = sortLeadsForDisplay(merged);
      setLeads(sorted);
      saveLeadListCache(sorted);
      const total = sorted.length;
      const totalPages = Math.max(1, Math.ceil(total / pageSize));
      setPagination({
        page: Math.min(page, totalPages),
        limit: pageSize,
        total,
        totalPages,
      });
    } catch {
      toast({ title: "Error", description: "Failed to load leads", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [
    searchQuery,
    filterProgressStatus,
    filterAssignmentStatus,
    filterEligibility,
    filterQuality,
    filterLeadSource,
    filterLeadType,
    filterTelecaller,
    filterCounsellor,
    dateRangeParams,
    page,
    pageSize,
    toast,
    isCounsellor,
    assignedScopeMode,
    forReportMode,
    filterWithTelecaller,
    counsellorReportDrillMode,
    reportWithoutTelecaller,
    reportWithTelecaller,
    reportBucketFilter,
    hasPendingFollowUpOnly,
  ]);


const loadCounsellors = useCallback(async () => {
  try {
    const isTelecallerTransferPicker =
      user?.role === "telecaller" || user?.role === "manager";
    const [cRes, tRes] = await Promise.all([
      isTelecallerTransferPicker
        ? api.get("/api/leads/transfer-assignees")
        : api.get("/api/users/counsellors"),
      api.get("/api/users/telecallers"),
    ]);
    const raw = cRes?.data?.data ?? cRes?.data ?? [];
    setCounsellors(
  Array.isArray(raw)
    ? raw
        .map((c) => ({
          id: Number(c.id),
          fullName: String(c.fullName ?? ""),
          role: c.role ?? null,
          status: c.status,
        }))
        .sort((a, b) => Number(b.status) - Number(a.status))
    : []
);
    setTelecallers(
  [...(tRes?.data?.data || tRes?.data || [])]
    .sort((a, b) => Number(b.status) - Number(a.status))
);
  } catch (err) {
    console.error("Fetch error:", err);
    setCounsellors([]);
    setTelecallers([]);
  }
}, [user?.role]);

const loadLeadTypes = useCallback(async () => {
  try {
    const [ltRes, stRes] = await Promise.all([
      api.get("/api/lead-types"),
      api.get("/api/sale-types"),
    ]);
    setLeadTypes(ltRes?.data?.data || ltRes?.data || []);
    setSaleTypes(stRes?.data?.data || stRes?.data || []);
  } catch (err) {
    console.error("Fetch error:", err);
    setLeadTypes([]);
    setSaleTypes([]);
  }
}, []);

  useEffect(() => {
    // Block until the URL-params useEffect has committed all filters to state.
    if (!filtersReady) return;

    // On first mount after returning from a lead detail page, restore from cache
    // instead of refetching. Patches from the detail page are applied here.
    if (isReturnFromDetail.current && cachedLeadsRef.current) {
      isReturnFromDetail.current = false;
      const cached = cachedLeadsRef.current;
      cachedLeadsRef.current = null;
      const patches = consumeLeadListPatches();
      const merged = cached.map((row) => {
        const patch = patches[String(row.id)];
        return patch ? mergeLeadRow(row, patch) : row;
      });
      const sorted = sortLeadsForDisplay(merged);
      setLeads(sorted);
      const total = sorted.length;
      const totalPages = Math.max(1, Math.ceil(total / pageSize));
      setPagination({ page: Math.min(page, totalPages), limit: pageSize, total, totalPages });
      const scrollY = consumeLeadListScrollY();
      if (scrollY !== null) setPendingScrollY(scrollY);
      return;
    }
    void loadLeads();
  }, [filtersReady, loadLeads]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { void loadCounsellors(); void loadLeadTypes(); }, [loadCounsellors, loadLeadTypes]);

  useLeadSocketRefresh({
    enabled: !!user?.id,
    queryKeys: [
      ["leads"],
      ["telecaller-dashboard-leads-all"],
      ["telecaller-dashboard-leads-period"],
      ["current-telecaller-target"],
    ],
    onLeadEvent: (_event, payload) => {
      const row = extractLeadFromSocketPayload(payload);
      if (row?.id) {
        setLeads((prev) => {
          if (!prev.some((l) => l.id === row.id)) return prev;
          return sortLeadsForDisplay(
            prev.map((l) => (l.id === row.id ? mergeLeadRow(l, row) : l))
          );
        });
      }
      void loadLeads();
    },
  });

  const displayLeads = useMemo(() => {
    const start = (page - 1) * pageSize;
    return leads.slice(start, start + pageSize);
  }, [leads, page, pageSize]);

  const selectableLeadsOnPage = useMemo(
    () =>
      displayLeads.filter((lead) => {
        if (isAdminJunkRestoreMode) return isLeadJunk(lead);
        if (isAdminBulk) return !isLeadTransferBlocked(lead);
        return true;
      }),
    [displayLeads, isAdminJunkRestoreMode, isAdminBulk]
  );

  const allPageSelected =
    selectableLeadsOnPage.length > 0 &&
    selectableLeadsOnPage.every((lead) => selectedLeadIds.has(lead.id));

  const somePageSelected =
    selectableLeadsOnPage.some((lead) => selectedLeadIds.has(lead.id)) && !allPageSelected;

  const toggleSelectAllOnPage = () => {
    setSelectedLeadIds((prev) => {
      const next = new Set(prev);
      if (allPageSelected) {
        selectableLeadsOnPage.forEach((lead) => next.delete(lead.id));
      } else {
        selectableLeadsOnPage.forEach((lead) => next.add(lead.id));
      }
      return next;
    });
  };

  const bulkSelectActive = canBulkSelect && isSelectMode;
  const leadTableCols = useMemo(() => {
    if (isAdminBulk && bulkSelectActive) {
      return {
        check: "w-8 max-w-8 px-1",
        name: "w-[18%]",
        mobile: "w-[13%]",
        leadType: "w-[11%]",
        leadSource: "w-[11%]",
        telecaller: "w-[13%]",
        counsellor: "w-[13%]",
        assignedCounsellor: "w-[16%]",
        quality: "w-[10%]",
        transferredFrom: "w-[15%]",
        status: LEAD_STATUS_TABLE_HEAD_CLASS,
      };
    }
    if (isAdminBulk) {
      return {
        check: "w-8 max-w-8 px-1",
        name: "w-[20%]",
        mobile: "w-[15%]",
        leadType: "w-[13%]",
        leadSource: "w-[13%]",
        telecaller: "w-[14%]",
        counsellor: "w-[14%]",
        assignedCounsellor: "w-[18%]",
        quality: "w-[12%]",
        transferredFrom: "w-[18%]",
        status: LEAD_STATUS_TABLE_HEAD_CLASS,
      };
    }
    if (bulkSelectActive) {
      return {
        check: "w-8 max-w-8 px-1",
        name: "w-[22%]",
        mobile: "w-[17%]",
        leadType: "w-[14%]",
        leadSource: "w-[14%]",
        telecaller: "w-[16%]",
        counsellor: "w-[16%]",
        assignedCounsellor: "w-[16%]",
        quality: "w-[11%]",
        transferredFrom: "w-[16%]",
        status: LEAD_STATUS_TABLE_HEAD_CLASS,
      };
    }
    return {
      check: "w-8 max-w-8 px-1",
      name: "w-[22%]",
      mobile: "w-[17%]",
      leadType: "w-[15%]",
      leadSource: "w-[15%]",
      telecaller: "w-[16%]",
      counsellor: "w-[16%]",
      assignedCounsellor: "w-[18%]",
      quality: "w-[12%]",
      transferredFrom: "w-[18%]",
      status: LEAD_STATUS_TABLE_HEAD_CLASS,
    };
  }, [isAdminBulk, bulkSelectActive]);

  // ── Filter helpers ─────────────────────────────────────────────
  const clearFilters = () => {
    setSearch("");
    setDebouncedSearch("");
    setFilterLeadSource("");
    setFilterLeadType("");
    setFilterProgressStatus("");
    setFilterAssignmentStatus("");
    setFilterEligibility("");
    setFilterQuality("");
    setFilterTelecaller("");
    setFilterCounsellor("");
    setDateFilter("weekly");
    setCustomDateFrom(undefined);
    setCustomDateTo(undefined);
    setAssignedScopeMode(false);
    setForReportMode(false);
    setExcludeUnassigned(false);
    setFilterWithTelecaller(false);
    setCounsellorReportDrillMode(false);
    setReportWithoutTelecaller(false);
    setReportWithTelecaller(false);
    setReportBucketFilter("");
    setHasPendingFollowUpOnly(false);
    setPage(1);
    setPerPagePreset("50");
    setCustomPerPageCommitted(50);
    setCustomPerPageDraft("50");
    try {
      sessionStorage.removeItem(LEADLIST_FILTER_KEY);
    } catch {}
    setLocation("/leads");
  };

  const closeTransferModal = () => { setTransferLead(null); setSelectedCounsellorId(""); };
  const closeFollowupModal = () => {
    setFollowupLead(null);
    setFollowupDateTime(null);
    setFollowupNote("");
    setDateTimePickerOpen(false);
  };

  // ── Eligibility / Quality modal helpers ────────────────────────
  const openEligibilityModal = (e: React.MouseEvent, lead: LeadEntity) => {
    e.stopPropagation();
    setEligibilityLead(lead);
    setEligibilityValue((lead.eligibilityStatus as LeadEligibilityStatus | null | undefined) ?? "");
  };
  const closeEligibilityModal = () => {
    setEligibilityLead(null);
    setEligibilityValue("");
  };

  const openQualityModal = (e: React.MouseEvent, lead: LeadEntity) => {
    e.stopPropagation();
    setQualityLead(lead);
    setQualityValue((lead.leadQuality as LeadQuality | null | undefined) ?? "");
  };
  const closeQualityModal = () => {
    setQualityLead(null);
    setQualityValue("");
  };

  const handleEligibilitySubmit = async () => {
    if (!eligibilityLead || !eligibilityValue) {
      toast({ title: "Select eligibility", description: "Please choose an eligibility status", variant: "destructive" });
      return;
    }
    const targetId = eligibilityLead.id;
    const newValue = eligibilityValue as LeadEligibilityStatus;
    try {
      setSubmitting(true);
      const updated = await updateLeadFieldsApi(targetId, { eligibilityStatus: newValue });
      const rowPatch = listPatchFromLeadUpdate(
        updated,
        { eligibilityStatus: newValue },
        eligibilityLead.progressStatus
      );
      setLeads((prev) =>
        sortLeadsForDisplay(
          prev.map((l) => (l.id === targetId ? mergeLeadRow(l, rowPatch) : l))
        )
      );
      toast({ title: "Eligibility updated" });
      closeEligibilityModal();
    } catch {
      toast({ title: "Error", description: "Failed to update eligibility", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  const handleQualitySubmit = async () => {
    if (!qualityLead || !qualityValue) {
      toast({ title: "Select quality", description: "Please choose a lead quality", variant: "destructive" });
      return;
    }
    const targetId = qualityLead.id;
    const newValue = qualityValue as LeadQuality;
    try {
      setSubmitting(true);
      const updated = await updateLeadFieldsApi(targetId, { leadQuality: newValue });
      const rowPatch = listPatchFromLeadUpdate(
        updated,
        { leadQuality: newValue },
        qualityLead.progressStatus
      );
      setLeads((prev) =>
        sortLeadsForDisplay(
          prev.map((l) => (l.id === targetId ? mergeLeadRow(l, rowPatch) : l))
        )
      );
      toast({ title: "Lead quality updated" });
      closeQualityModal();
    } catch {
      toast({ title: "Error", description: "Failed to update quality", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  // ── Action handlers ────────────────────────────────────────────
  const handleTransferSubmit = async () => {
    if (!transferLead || !selectedCounsellorId) {
      toast({ title: "Select counsellor", description: "Please choose a counsellor", variant: "destructive" });
      return;
    }
    if (!canTransferToCounsellor(transferLead)) {
      toast({
        title: "Cannot transfer",
        description: "Set eligibility and lead quality before transferring to counsellor.",
        variant: "destructive",
      });
      return;
    }
    const targetId = transferLead.id;
    const counsellorIdNum = Number(selectedCounsellorId);
    const counsellorName =
      counsellors.find((c) => c.id === counsellorIdNum)?.fullName ?? null;
    try {
      setSubmitting(true);
      const updated = await assignLeadApi(targetId, { counsellorId: counsellorIdNum });
      setLeads((prev) =>
        sortLeadsForDisplay(
          prev.map((l) =>
            l.id === targetId
              ? mergeLeadRow(l, {
                  ...updated,
                  currentCounsellorId: counsellorIdNum,
                  assignmentStatus: "transferred",
                  counsellorName: updated.counsellorName ?? counsellorName,
                })
              : l
          )
        )
      );
      toast({ title: "Lead transferred successfully" });
      closeTransferModal();
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        "Failed to transfer lead";
      toast({ title: "Error", description: message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  const handleFollowupSubmit = async () => {
    if (!followupLead) return;
    if (!followupDateTime) {
      toast({ title: "Date required", description: "Please select follow-up date & time", variant: "destructive" });
      return;
    }
    const targetId = followupLead.id;
    const scheduled = clampFollowupDateTime(followupDateTime);
    if (!isFollowupDateTimeAllowed(scheduled)) {
      toast({
        title: "Invalid date & time",
        description: "Follow-up must be today or later, and not in the past.",
        variant: "destructive",
      });
      return;
    }
    const followupIso = toCrmApiTimestamp(scheduled);
    try {
      setSubmitting(true);
      const result = await addLeadActivityApi(targetId, {
        activityType: "followup",
        message: followupNote.trim() || undefined,
        followupAt: followupIso,
        status: "pending",
      });
      const nextFollowupAt = result.lead?.nextFollowupAt ?? null;
      setLeads((prev) =>
        sortLeadsForDisplay(
          prev.map((l) =>
            l.id === targetId
              ? mergeLeadRow(l, {
                  nextFollowupAt,
                  progressStatus: "follow_up",
                  pendingFollowUp: true,
                })
              : l
          )
        )
      );
      toast({ title: "Follow-up scheduled" });
      closeFollowupModal();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error?.response?.data?.message || "Failed to schedule follow-up",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  // ── DateRangePicker apply callback ─────────────────────────────
  const handleDateRangeApply = (filter: any, startDate?: string, endDate?: string) => {
    if (filter === "today") {
      const d = istCalendarYmd(new Date());
      setCustomDateFrom(d);
      setCustomDateTo(d);
    } else if (filter === "monthly") {
      const { from, to } = istMonthPresetYmds(new Date());
      setCustomDateFrom(from);
      setCustomDateTo(to);
    } else if (startDate && endDate) {
      setCustomDateFrom(startDate);
      setCustomDateTo(endDate);
    }
    setDateFilter("custom");
    setShowDatePicker(false);
  };

  // ── Derived label for custom date ──────────────────────────────
  // customDateFrom/To may be "yyyy-MM-dd" (from picker) or a full ISO string (from report drilldown URL)
  const parseCustomDate = (s: string) => s.includes("T") ? new Date(s) : new Date(`${s}T12:00:00+05:30`);
  const customLabel =
    dateFilter === "custom" && customDateFrom && customDateTo
      ? `${format(parseCustomDate(customDateFrom), "d MMM")} – ${format(parseCustomDate(customDateTo), "d MMM yyyy")}`
      : null;

  // ── Telecaller-to-telecaller transfer handlers ─────────────────
  const toggleLeadSelection = (id: number) => {
    const lead = leads.find((item) => item.id === id);
    if (isAdminJunkRestoreMode && lead && !isLeadJunk(lead)) {
      toast({
        title: "Only junk leads can be restored",
        variant: "destructive",
      });
      return;
    }
    if (isAdminBulk && !isAdminJunkRestoreMode && lead && isLeadTransferBlocked(lead)) {
      toast({
        title: "Lead cannot be transferred",
        description: "Transferred or converted leads cannot be reassigned.",
        variant: "destructive",
      });
      return;
    }
    setSelectedLeadIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const openTtModalBulk = () => {
    setTtLeadIds(Array.from(selectedLeadIds));
    setTtTargetId("");
    setTtConfirm(false);
    setTtModalOpen(true);
  };

  const getAdminTransferableLeads = useCallback(
    () =>
      leads.filter(
        (l) => selectedLeadIds.has(l.id) && !isAdminJunkRestoreMode && !isLeadTransferBlocked(l)
      ),
    [leads, selectedLeadIds, isAdminJunkRestoreMode]
  );

  const openAdminTransferModal = () => {
    setAdminTransferOpen(true);
  };

  const closeAdminTransferModal = () => {
    setAdminTransferOpen(false);
  };

  const handleAdminBulkAssignSuccess = (updated: LeadEntity[]) => {
    const updatedMap = new Map(updated.map((lead) => [lead.id, lead]));
    setLeads((prev) => {
      if (isAdminJunkRestoreMode) {
        return prev.filter((lead) => !updatedMap.has(lead.id));
      }
      return prev.map((lead) =>
        updatedMap.has(lead.id) ? { ...lead, ...updatedMap.get(lead.id)! } : lead
      );
    });
    if (isAdminJunkRestoreMode) {
      setPagination((prev) => ({
        ...prev,
        total: Math.max(0, prev.total - updated.length),
      }));
    }
    setIsSelectMode(false);
    setSelectedLeadIds(new Set());
  };

  const closeTtModal = () => {
    setTtModalOpen(false);
    setTtLeadIds([]);
    setTtTargetId("");
    setTtConfirm(false);
  };

  const handleTtTransferSubmit = async () => {
    if (!ttTargetId) return;
    if (!ttConfirm) { setTtConfirm(true); return; }
    const transferredIds = [...ttLeadIds];
    try {
      setTtSubmitting(true);
      await Promise.all(
        transferredIds.map((id) =>
          assignLeadApi(id, {
            telecallerId: Number(ttTargetId),
            isTelecallerTransfer: true,
          })
        )
      );
      // Optimistic local update — these leads no longer belong to the current telecaller,
      // so drop them from the list and the pagination total instantly.
      const removedSet = new Set(transferredIds);
      setLeads((prev) => prev.filter((l) => !removedSet.has(l.id)));
      setPagination((prev) => ({
        ...prev,
        total: Math.max(0, prev.total - transferredIds.length),
      }));
      toast({ title: `${transferredIds.length} lead${transferredIds.length > 1 ? "s" : ""} transferred` });
      closeTtModal();
      setIsSelectMode(false);
      setSelectedLeadIds(new Set());
    } catch {
      toast({ title: "Transfer failed", variant: "destructive" });
    } finally {
      setTtSubmitting(false);
    }
  };

  const ttTargetName = telecallers.find((t) => String(t.id) === ttTargetId)?.fullName ?? "";

  const adminTransferableCount = getAdminTransferableLeads().length;
  const adminSkippedTransferCount = isAdminJunkRestoreMode
    ? 0
    : Math.max(0, selectedLeadIds.size - adminTransferableCount);

  const eligibilityLabel = (v?: string | null) =>
    ELIGIBILITY_OPTIONS.find((o) => o.value === v)?.label;
  const qualityLabel = (v?: string | null) =>
    QUALITY_OPTIONS.find((o) => o.value === v)?.label;

  return (
    <div className="space-y-5">
      <Breadcrumbs items={[{ label: "Leads", href: "/leads" }, { label: "Management" }]} />

      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="icon"
            className="h-9 w-9 shrink-0"
            onClick={() => {
              if (window.history.length > 1) window.history.back();
              else setLocation("/leads");
            }}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-2xl font-bold">Leads Management</h1>
        </div>
        <div className="flex items-center gap-2">
          {/* Telecaller-only: select + bulk transfer */}
          {canBulkSelect && (
            <>
              {isSelectMode && selectedLeadIds.size > 0 && (
                <Button
                  size="sm"
                  onClick={isAdminBulk ? openAdminTransferModal : openTtModalBulk}
                  className="gap-1.5"
                >
                  {isAdminJunkRestoreMode ? (
                    <RotateCcw className="w-3.5 h-3.5" />
                  ) : (
                    <Send className="w-3.5 h-3.5" />
                  )}
                  {isAdminJunkRestoreMode ? "Restore & Assign" : isAdminBulk ? "Assign" : "Transfer"} (
                    {isAdminBulk ? adminTransferableCount : selectedLeadIds.size})
                </Button>
              )}
              <Button
                variant={isSelectMode ? "secondary" : "outline"}
                size="sm"
                onClick={() => { setIsSelectMode((v) => !v); setSelectedLeadIds(new Set()); }}
              >
                {isSelectMode ? "Cancel" : "Select Leads"}
              </Button>
            </>
          )}
          <Button onClick={() => setIsAddLeadOpen(true)}>Add New Lead</Button>
        </div>
      </div>

     {/* ── Filter Panel ─────────────────────────────────────── */}
<div className="rounded-xl border border-border bg-card shadow-sm p-4 space-y-4">

  {/* Row 1: Search + Date Filter */}
  <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">

    {/* Left: Search */}
    <div className="flex flex-wrap gap-2 items-start">
      <div className="w-full sm:w-72 space-y-1">
        <div className="relative">
        <Input
          placeholder={`Search by name, phone, email… (min ${SEARCH_MIN_LENGTH} chars)`}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="h-9 pr-7"
          aria-describedby="lead-search-hint"
        />
        {search && (
          <button
            type="button"
            onClick={() => {
                setSearch("");
                setDebouncedSearch("");
              }}
            aria-label="Clear search"
            className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
        </div>
        {(searchTooShort || searchTyping) && (
        <p id="lead-search-hint" className="text-[11px] text-muted-foreground w-full sm:w-72">
          {searchTooShort
            ? `Type at least ${SEARCH_MIN_LENGTH} characters to search within the selected date range`
            : "Searching…"}
        </p>
      )}
      </div>

      {activeFilterCount > 0 && (
        <Button
          variant="ghost"
          size="sm"
          onClick={clearFilters}
          className="h-9 gap-1.5 text-muted-foreground"
        >
          <X className="w-3.5 h-3.5" />
          Clear
          <Badge variant="secondary" className="ml-0.5 text-xs px-1.5">
            {activeFilterCount}
          </Badge>
        </Button>
      )}
    </div>

    {/* Right: Date Filter */}
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-xs font-medium text-muted-foreground">
        {filterProgressStatus === "follow_up" ? "Follow-up:" : "Created:"}
      </span>

      <div className="flex rounded-lg border border-border bg-muted/30 p-0.5 gap-0.5">
        {(["all", "today", "weekly", "monthly"] as const).map((f) => (
          <button
            key={f}
            onClick={() => {
              setDateFilter(f);
              setCustomDateFrom(undefined);
              setCustomDateTo(undefined);
            }}
            className={cn(
              "px-3 py-1 text-xs font-medium rounded-md transition-colors",
              dateFilter === f
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground hover:bg-background"
            )}
          >
            {DATE_FILTER_LABELS[f]}
          </button>
        ))}

        <button
          onClick={() => setShowDatePicker(true)}
          className={cn(
            "px-3 py-1 text-xs font-medium rounded-md flex items-center gap-1",
            dateFilter === "custom"
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:text-foreground hover:bg-background"
          )}
        >
          {customLabel ?? "Custom"}
          <Calendar className="w-3 h-3" />
        </button>
      </div>
    </div>
  </div>

  {/* Row 2: Filters */}
  <div className="flex flex-wrap gap-2">

    {/* Counsellor + Telecaller — hidden for telecaller role */}
    {user?.role !== "telecaller" && (
      <>
        <Select value={filterCounsellor} onValueChange={setFilterCounsellor}>
          <SelectTrigger className="h-9 w-44 text-xs">
            <SelectValue placeholder="Counsellor" />
          </SelectTrigger>
          <SelectContent className="max-h-64 overflow-y-auto">
            {counsellors.map((c) => (
              <SelectItem key={c.id} value={String(c.id)}>{c.fullName}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={filterTelecaller} onValueChange={setFilterTelecaller}>
          <SelectTrigger className="h-9 w-44 text-xs">
            <SelectValue placeholder="Telecaller" />
          </SelectTrigger>
          <SelectContent className="max-h-64 overflow-y-auto">
            {telecallers.map((t) => (
              <SelectItem key={t.id} value={String(t.id)}>{t.fullName}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </>
    )}

    {/* Lead Source (from /api/lead-types) */}
    <Select value={filterLeadSource} onValueChange={setFilterLeadSource}>
      <SelectTrigger className="h-9 w-40 text-xs">
        <SelectValue placeholder="Lead Source" />
      </SelectTrigger>
      <SelectContent className="max-h-64 overflow-y-auto">
        {leadTypes.map((lt) => (
          <SelectItem key={lt.id} value={lt.leadType}>
            {getLeadSourceLabel(lt.leadType, leadTypes)}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>

    {/* Lead Type (from /api/sale-types) */}
    <Select value={filterLeadType} onValueChange={setFilterLeadType}>
      <SelectTrigger className="h-9 w-40 text-xs">
        <SelectValue placeholder="Lead Type" />
      </SelectTrigger>
      <SelectContent className="max-h-64 overflow-y-auto">
        {saleTypes.map((st) => (
          <SelectItem key={st.id} value={st.saleType}>{st.saleType}</SelectItem>
        ))}
      </SelectContent>
    </Select>

    {/* Assignment — role-specific options (counsellor includes follow-up + drop) */}
    <Select value={filterAssignmentStatus} onValueChange={setFilterAssignmentStatus}>
      <SelectTrigger className="h-9 w-40 text-xs">
        <SelectValue placeholder="Assignment" />
      </SelectTrigger>
      <SelectContent>
        {(isCounsellor
          ? ASSIGNMENT_STATUS_OPTIONS_COUNSELLOR
          : user?.role === "telecaller"
            ? ASSIGNMENT_STATUS_OPTIONS_TELECALLER
            : ASSIGNMENT_STATUS_OPTIONS_FULL
        ).map((o) => (
          <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
        ))}
      </SelectContent>
    </Select>

    {/* Progress — hidden for counsellor (use Assignment filter instead) */}
    {!isCounsellor ? (
    <Select value={filterProgressStatus} onValueChange={setFilterProgressStatus}>
      <SelectTrigger className="h-9 w-40 text-xs">
        <SelectValue placeholder="Progress" />
      </SelectTrigger>
      <SelectContent>
        {progressStatusOptions.map((o) => (
          <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
        ))}
      </SelectContent>
    </Select>
    ) : null}

    {/* Eligibility */}
    <Select value={filterEligibility} onValueChange={setFilterEligibility}>
      <SelectTrigger className="h-9 w-40 text-xs">
        <SelectValue placeholder="Eligibility" />
      </SelectTrigger>
      <SelectContent>
        {ELIGIBILITY_OPTIONS.map((o) => (
          <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
        ))}
      </SelectContent>
    </Select>

    {/* Quality */}
    <Select value={filterQuality} onValueChange={setFilterQuality}>
      <SelectTrigger className="h-9 w-40 text-xs">
        <SelectValue placeholder="Quality" />
      </SelectTrigger>
      <SelectContent>
        {QUALITY_OPTIONS.map((o) => (
          <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  </div>

  {/* Result count + leads per page */}
  {!loading && (
    <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between rounded-lg border border-border/60 bg-muted/20 px-3 py-2.5">
      <p className="text-xs text-muted-foreground">
        Showing{" "}
        {pagination.total === 0 ? (
          "0 leads"
        ) : (
          <>
            <span className="font-semibold text-foreground">
              {(pagination.page - 1) * pagination.limit + 1}–
              {Math.min(pagination.page * pagination.limit, pagination.total)}
            </span>{" "}
            of <span className="font-semibold text-foreground">{pagination.total}</span> lead
            {pagination.total !== 1 ? "s" : ""}
          </>
        )}
        {activeFilterCount > 0 ? " (filtered)" : ""}
        {debouncedSearch && (
          <>
            {" "}
            · matching “<span className="font-medium text-foreground">{debouncedSearch}</span>”
          </>
        )}
      </p>
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <span className="text-muted-foreground whitespace-nowrap">Leads per page</span>
        <Select
          value={perPagePreset}
          onValueChange={(v) => {
            const next = v as typeof perPagePreset;
            setPerPagePreset(next);
            setPage(1);
            if (next !== "custom") return;
            setCustomPerPageDraft(String(customPerPageCommitted));
          }}
        >
          <SelectTrigger className="h-8 w-[120px] text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="20">20</SelectItem>
            <SelectItem value="50">50</SelectItem>
            <SelectItem value="100">100</SelectItem>
            <SelectItem value="custom">Custom…</SelectItem>
          </SelectContent>
        </Select>
        {perPagePreset === "custom" && (
          <div className="flex items-center gap-1.5 flex-wrap">
            <Input
              type="number"
              min={1}
              max={MAX_LEADS_PER_PAGE}
              inputMode="numeric"
              className="h-8 w-20 text-xs"
              value={customPerPageDraft}
              onChange={(e) => setCustomPerPageDraft(e.target.value)}
              onBlur={() => applyCustomPerPage()}
              onKeyDown={(e) => {
                if (e.key === "Enter") applyCustomPerPage();
              }}
              placeholder="N"
              aria-label="Custom leads per page"
            />
            <Button type="button" variant="secondary" size="sm" className="h-8 text-xs px-2" onClick={applyCustomPerPage}>
              Apply
            </Button>
            <span className="text-[10px] text-muted-foreground">max {MAX_LEADS_PER_PAGE}</span>
          </div>
        )}
      </div>
    </div>
  )}
</div>
      {/* ── Lead Table ─────────────────────────────────────────── */}
      <div>
        {loading ? (
          <Card>
            <CardContent className="p-6 text-sm text-muted-foreground">
              Loading leads…
            </CardContent>
          </Card>
        ) : displayLeads.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center text-sm text-muted-foreground">
              {searchQuery ? (
                <>
                  No leads match &quot;<span className="font-medium text-foreground">{searchQuery}</span>&quot;
                  {activeFilterCount > 1 ? " with the current filters" : ""}
                  <button
                    onClick={() => setSearch("")}
                    className="block mx-auto mt-2 text-primary hover:underline text-xs"
                  >
                    Clear search
                  </button>
                </>
              ) : (
                <>
                  No leads found
                  {activeFilterCount > 0 && (
                    <button
                      onClick={clearFilters}
                      className="block mx-auto mt-2 text-primary hover:underline text-xs"
                    >
                      Clear filters
                    </button>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
            <div className="overflow-x-auto">
              <Table className="table-fixed w-full min-w-[56rem] border-separate border-spacing-y-2 [&_td]:overflow-hidden [&_td.lead-status-cell]:overflow-visible [&_td]:py-3 [&_th]:h-8">
                <TableHeader>
                  <TableRow className="bg-muted/40 hover:bg-muted/40">
                    {bulkSelectActive && (
                      <TableHead className={leadTableCols.check}>
                        <input
                          type="checkbox"
                          checked={allPageSelected}
                          ref={(el) => {
                            if (el) el.indeterminate = somePageSelected;
                          }}
                          onChange={toggleSelectAllOnPage}
                          onClick={(e) => e.stopPropagation()}
                          aria-label="Select all leads on this page"
                          className="h-4 w-4 accent-primary cursor-pointer"
                        />
                      </TableHead>
                    )}
                    <TableHead className={leadTableCols.name}>Name</TableHead>
                    <TableHead className={leadTableCols.mobile}>Mobile Number</TableHead>
                    <TableHead className={leadTableCols.leadType}>Lead Type</TableHead>
                    <TableHead className={leadTableCols.leadSource}>Lead Source</TableHead>
                    {isAdminBulk && (
                      <>
                        <TableHead className={leadTableCols.telecaller}>Current Telecaller</TableHead>
                        <TableHead className={leadTableCols.counsellor}>Current Counsellor</TableHead>
                      </>
                    )}
                    {isTelecaller && (
                      <TableHead className={leadTableCols.assignedCounsellor}>Assigned Counsellor</TableHead>
                    )}
                    {isCounsellor && (
                      <>
                        <TableHead className={leadTableCols.quality}>Quality</TableHead>
                        <TableHead className={leadTableCols.transferredFrom}>Transferred From</TableHead>
                      </>
                    )}
                    <TableHead className={leadTableCols.status}>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {displayLeads.map((lead) => {
                    const inSelectMode = canBulkSelect && isSelectMode;
                    const isSelected = selectedLeadIds.has(lead.id);
                    const transferBlocked = isAdminBulk && !isAdminJunkRestoreMode && isLeadTransferBlocked(lead);
                    const readOnly = isLeadReadOnly(lead, user?.role);
                    const junk = isLeadJunk(lead);
                    const statusTags = getLeadDisplayTags(lead, user?.role, {
                      pendingFollowUp: lead.pendingFollowUp,
                    });

                    return (
                      <TableRow
                        key={lead.id}
                        className={cn(
                          "cursor-pointer border-0 transition-colors [&>td]:border-y [&>td]:bg-card [&>td:first-child]:rounded-l-xl [&>td:first-child]:border-l [&>td:last-child]:rounded-r-xl [&>td:last-child]:border-r",
                          junk
                            ? "[&>td]:bg-red-50/60 hover:[&>td]:bg-red-50"
                            : readOnly
                              ? "[&>td]:bg-emerald-50/60 hover:[&>td]:bg-emerald-50"
                              : lead.assignmentStatus === "transferred"
                                ? "[&>td]:bg-slate-50/80 hover:[&>td]:bg-slate-100/80"
                                : "hover:[&>td]:bg-muted/40",
                          inSelectMode && isSelected && "[&>td]:bg-primary/5 ring-1 ring-inset ring-primary/40",
                          inSelectMode && transferBlocked && "opacity-60"
                        )}
                        onClick={() => {
                          if (inSelectMode) {
                            toggleLeadSelection(lead.id);
                            return;
                          }
                          saveLeadListScrollY(getScrollContainerScrollY());
                          markLeadListNavAway();
                          restoreLeadListScrollY(0);
                          setLocation(`/leads/${lead.id}`);
                        }}
                      >
                        {inSelectMode && (
                          <TableCell className={leadTableCols.check}>
                            <input
                              type="checkbox"
                              checked={isSelected}
                              readOnly
                              className="h-4 w-4 accent-primary pointer-events-none"
                            />
                          </TableCell>
                        )}
                        <TableCell>
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                              {lead.fullName?.charAt(0)?.toUpperCase() || "L"}
                            </div>
                            <span
                              className="font-semibold text-foreground truncate block min-w-0"
                              title={lead.fullName || undefined}
                            >
                              {lead.fullName || "—"}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="flex min-w-0 items-center gap-1 text-sm" title={lead.phone || undefined}>
                            <Phone className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                            <span className="block min-w-0 truncate">{lead.phone || "—"}</span>
                          </span>
                        </TableCell>
                        <TableCell>
                          <span className="flex min-w-0 items-center gap-1 text-sm" title={lead.leadType || undefined}>
                            <Tag className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                            <span className="block min-w-0 truncate">{lead.leadType || "—"}</span>
                          </span>
                        </TableCell>
                        <TableCell>
                          <div className="min-w-0">
                            <span
                              className="flex min-w-0 items-center gap-1 text-sm"
                              title={getLeadSourceLabel(lead.leadSource, leadTypes)}
                            >
                              <Send className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                              <span className="block min-w-0 truncate">
                                {getLeadSourceLabel(lead.leadSource, leadTypes)}
                              </span>
                            </span>
                            {leadHasReferenceSource(lead) && getLeadReferenceDisplayLabel(lead) && (
                              <span
                                className="block min-w-0 truncate text-[11px] text-muted-foreground mt-0.5 pl-5"
                                title={getLeadReferenceDisplayLabel(lead) ?? undefined}
                              >
                                {getLeadReferenceDisplayLabel(lead)}
                              </span>
                            )}
                          </div>
                        </TableCell>
                        {isAdminBulk && (
                          <>
                            <TableCell>
                              <span
                                className="block truncate"
                                title={lead.telecallerName || (lead.currentTelecallerId ? `Telecaller #${lead.currentTelecallerId}` : undefined)}
                              >
                                {lead.telecallerName || (lead.currentTelecallerId ? `Telecaller #${lead.currentTelecallerId}` : "—")}
                              </span>
                            </TableCell>
                            <TableCell>
                              <span
                                className="block truncate"
                                title={lead.counsellorName || (lead.currentCounsellorId ? `Counsellor #${lead.currentCounsellorId}` : undefined)}
                              >
                                {lead.counsellorName || (lead.currentCounsellorId ? `Counsellor #${lead.currentCounsellorId}` : "—")}
                              </span>
                            </TableCell>
                          </>
                        )}
                        {isTelecaller && (
                          <TableCell>
                            <span
                              className="flex min-w-0 items-center gap-1 text-sm text-foreground"
                              title={lead.counsellorName || (lead.currentCounsellorId ? `Counsellor #${lead.currentCounsellorId}` : undefined)}
                            >
                              <UserCheck className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                              <span className="block min-w-0 truncate">
                                {lead.counsellorName || (lead.currentCounsellorId ? `Counsellor #${lead.currentCounsellorId}` : "—")}
                              </span>
                            </span>
                          </TableCell>
                        )}
                        {isCounsellor && (
                          <>
                            <TableCell>
                              <span className="flex min-w-0 items-center gap-1 text-sm" title={leadQualityLabel(lead.leadQuality)}>
                                <Star className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                                <span className="block min-w-0 truncate">{leadQualityLabel(lead.leadQuality)}</span>
                              </span>
                            </TableCell>
                            <TableCell>
                              <span
                                className="block truncate"
                                title={lead.telecallerName || (lead.currentTelecallerId ? `Telecaller #${lead.currentTelecallerId}` : undefined)}
                              >
                                {lead.telecallerName || (lead.currentTelecallerId ? `Telecaller #${lead.currentTelecallerId}` : "—")}
                              </span>
                            </TableCell>
                          </>
                        )}
                        <TableCell className={LEAD_STATUS_TABLE_CELL_CLASS}>
                          <div className="flex flex-wrap items-center justify-end gap-1.5">
                            {statusTags.map((tag) => (
                              <Badge
                                key={tag.key}
                                variant="secondary"
                                className={leadStatusBadgeClassName(tag)}
                                title={tag.label}
                              >
                                {tag.label}
                              </Badge>
                            ))}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </div>
        )}
      </div>

      {/* Pagination */}
      {!loading && pagination.total > 0 && (
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-center gap-3 px-1">
          <div className="flex items-center justify-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="h-8 gap-1"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </Button>
            <span className="text-xs text-muted-foreground tabular-nums px-2">
              Page {pagination.page} of {pagination.totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              className="h-8 gap-1"
              disabled={page >= pagination.totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* ── Transfer Modal ────────────────────────────────────── */}
      <Dialog open={!!transferLead} onOpenChange={(open) => { if (!open) closeTransferModal(); }}>
  <DialogContent className="sm:max-w-md">
    <DialogHeader>
      <DialogTitle>Transfer Lead to Counsellor</DialogTitle>
    </DialogHeader>
    <div className="space-y-2 py-4">
      <Label>Select counsellor or manager</Label>
      <SearchableAssigneePicker
        options={counsellors}
        value={selectedCounsellorId}
        onValueChange={setSelectedCounsellorId}
        placeholder="Choose counsellor or manager…"
        searchPlaceholder="Type name to filter…"
      />
    </div>
    <DialogFooter>
      <Button variant="outline" onClick={closeTransferModal}>Cancel</Button>
      <Button disabled={submitting || !selectedCounsellorId} onClick={handleTransferSubmit}>
        {submitting ? "Processing..." : "Confirm Transfer"}
      </Button>
    </DialogFooter>
  </DialogContent>
</Dialog>

      {/* ── Follow-up Modal ───────────────────────────────────── */}
      <Dialog open={!!followupLead} onOpenChange={(open) => { if (!open) closeFollowupModal(); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Schedule Follow-up</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid gap-2">
              <Label>Date & Time</Label>
              <button
                type="button"
                onClick={() => setDateTimePickerOpen(true)}
                className="flex h-9 w-full items-center rounded-md border border-input bg-background px-3 py-1 text-sm text-left shadow-sm transition-colors hover:bg-accent hover:text-accent-foreground"
              >
                {followupDateTime
                  ? followupDateTime.toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })
                  : <span className="text-muted-foreground">Pick a date & time…</span>
                }
              </button>
            </div>
            <div className="grid gap-2">
              <Label>Follow-up Note</Label>
              <Input
                placeholder="What was discussed?"
                value={followupNote}
                onChange={(e) => setFollowupNote(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeFollowupModal}>Cancel</Button>
            <Button disabled={submitting} onClick={handleFollowupSubmit}>
              Save Follow-up
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Date-time picker (outside follow-up dialog to avoid nesting) */}
      <DateTimePicker
        open={dateTimePickerOpen}
        onOpenChange={setDateTimePickerOpen}
        value={followupDateTime}
        minDateTime={getMinFollowupDateTime()}
        onPickTomorrowMorning={() => {
          setFollowupDateTime(getTomorrowMorning1030());
          setDateTimePickerOpen(false);
        }}
        onChange={(date) => setFollowupDateTime(clampFollowupDateTime(date))}
      />

      {/* ── Date Range Picker Dialog ──────────────────────────── */}
      <Dialog open={showDatePicker} onOpenChange={setShowDatePicker}>
        <DialogContent className="p-0 max-w-[800px] overflow-hidden rounded-xl border-0">
          <DialogTitle className="sr-only">Select Date Range</DialogTitle>
          <DateRangePicker
            onApply={handleDateRangeApply}
            onCancel={() => setShowDatePicker(false)}
          />
        </DialogContent>
      </Dialog>

      {/* ── Telecaller → Telecaller Transfer Modal ───────────────── */}
      <Dialog open={ttModalOpen} onOpenChange={(open) => { if (!open) closeTtModal(); }}>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Transfer to Telecaller</DialogTitle>
    </DialogHeader>

    {!ttConfirm ? (
      <div className="space-y-4 py-4">
        <p className="text-sm text-muted-foreground">
          Transferring <span className="font-semibold text-foreground">{ttLeadIds.length}</span> lead{ttLeadIds.length > 1 ? "s" : ""} to another telecaller.
        </p>
        <div className="grid gap-2">
          <Label>Select Telecaller</Label>
          <Select value={ttTargetId} onValueChange={setTtTargetId}>
            <SelectTrigger>
              <SelectValue placeholder={telecallers.length > 0 ? "Choose telecaller…" : "Loading telecallers..."} />
            </SelectTrigger>
            
            {/* SCROLLABLE FIX: max-h-[300px] allows ~7.5 items visible */}
            <SelectContent className="max-h-[300px] overflow-y-auto">
  {(() => {
    // Robust "is self" check — prefer the authoritative id from /api/users/me,
    // fall back to auth-context's user.id, and finally fall back to a case-insensitive
    // fullName match against the auth-context user.name (last-resort safety net).
    const selfId = currentUserId ?? (user?.id != null ? String(user.id) : null);
    const selfName = user?.name?.trim().toLowerCase() ?? "";
    const others = telecallers.filter((t) => {
      const tid = String(t.id);
      if (selfId && tid === selfId) return false;
      if (selfName && t.fullName?.trim().toLowerCase() === selfName) return false;
      return true;
    });
    if (others.length === 0) {
      return <SelectItem value="none" disabled>No other telecallers found</SelectItem>;
    }
    return others.map((t) => (
      <SelectItem key={t.id} value={String(t.id)}>{t.fullName}</SelectItem>
    ));
  })()}
</SelectContent>
          </Select>
        </div>
      </div>
    ) : (
      <div className="py-6 text-center space-y-2">
        <p className="text-sm text-muted-foreground">Confirm transfer of</p>
        <p className="text-lg font-bold">{ttLeadIds.length} lead{ttLeadIds.length > 1 ? "s" : ""}</p>
        <p className="text-sm text-muted-foreground">to</p>
        <p className="text-base font-semibold text-primary">{ttTargetName}</p>
      </div>
    )}

    <DialogFooter>
      <Button variant="outline" onClick={ttConfirm ? () => setTtConfirm(false) : closeTtModal}>
        {ttConfirm ? "Back" : "Cancel"}
      </Button>
      <Button
        disabled={!ttTargetId || ttSubmitting}
        onClick={handleTtTransferSubmit}
      >
        {ttSubmitting ? "Transferring…" : ttConfirm ? "Confirm Transfer" : "Next →"}
      </Button>
    </DialogFooter>
  </DialogContent>
</Dialog>

      <LeadBulkAssignDialog
        open={adminTransferOpen}
        onOpenChange={(open) => {
          if (!open) closeAdminTransferModal();
          else setAdminTransferOpen(true);
        }}
        transferableLeads={getAdminTransferableLeads()}
        blockedCount={adminSkippedTransferCount}
        isJunkRestoreMode={isAdminJunkRestoreMode}
        telecallers={telecallers}
        counsellors={counsellors}
        onSuccess={handleAdminBulkAssignSuccess}
      />

      {/* ── Eligibility Modal ─────────────────────────────────── */}
      <Dialog open={!!eligibilityLead} onOpenChange={(open) => { if (!open) closeEligibilityModal(); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {eligibilityLead?.eligibilityStatus ? "Update Eligibility" : "Set Eligibility"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-4">
            {eligibilityLead && (
              <p className="text-xs text-muted-foreground">
                Lead: <span className="font-medium text-foreground">{eligibilityLead.fullName}</span>
              </p>
            )}
            <div className="grid gap-2">
              <Label>Eligibility Status</Label>
              <Select
                value={eligibilityValue}
                onValueChange={(v) => setEligibilityValue(v as LeadEligibilityStatus)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Choose eligibility" />
                </SelectTrigger>
                <SelectContent>
                  {ELIGIBILITY_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeEligibilityModal}>Cancel</Button>
            <Button
              disabled={submitting || !eligibilityValue || eligibilityValue === eligibilityLead?.eligibilityStatus}
              onClick={handleEligibilitySubmit}
            >
              {submitting ? "Saving…" : "Save Eligibility"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Quality Modal ─────────────────────────────────────── */}
      <Dialog open={!!qualityLead} onOpenChange={(open) => { if (!open) closeQualityModal(); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {qualityLead?.leadQuality ? "Update Lead Quality" : "Set Lead Quality"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-4">
            {qualityLead && (
              <p className="text-xs text-muted-foreground">
                Lead: <span className="font-medium text-foreground">{qualityLead.fullName}</span>
              </p>
            )}
            <div className="grid gap-2">
              <Label>Quality</Label>
              <Select
                value={qualityValue}
                onValueChange={(v) => setQualityValue(v as LeadQuality)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Choose quality" />
                </SelectTrigger>
                <SelectContent>
                  {QUALITY_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeQualityModal}>Cancel</Button>
            <Button
              disabled={submitting || !qualityValue || qualityValue === qualityLead?.leadQuality}
              onClick={handleQualitySubmit}
            >
              {submitting ? "Saving…" : "Save Quality"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AddLead open={isAddLeadOpen} onOpenChange={setIsAddLeadOpen} onLeadAdded={loadLeads} />
    </div>
  );
}
