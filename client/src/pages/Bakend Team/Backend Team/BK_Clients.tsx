import { useEffect, useMemo, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { PageWrapper } from "@/layout/PageWrapper";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useAuth } from "@/context/auth-context";
import { useToast } from "@/hooks/use-toast";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
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
import { DashboardDateFilter } from "@/components/dashboard/DashboardDateFilter";
import { format, startOfMonth, endOfMonth, startOfYear, endOfYear, startOfWeek, endOfWeek } from "date-fns";
import { Download, Search, ChevronDown, ChevronUp, ChevronsUpDown, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, X, UserPlus, Loader2, MoreVertical, ListChecks, Gavel, ArrowRightLeft } from "lucide-react";
import {
  type VisaClient,
  BACKEND_DESTINATIONS,
  BACKEND_TRAVEL_REASONS,
  BACKEND_PROCESSING_STATUS_GROUPS,
  BACKEND_DECISIONS,
  BACKEND_STAGES,
  stageOfStatus,
} from "@/data/dummyBackendData";
import { useVisaCases, useVisaCountries, useAllBackendUsers, useAllSystemUsers, useAssignableUsers, useProcessingStages } from "@/hooks/useVisaCases";
import { assignBulkVisaCases, changeVisaCaseStatus, changeVisaCaseDecision } from "@/api/visaCases.api";
import type { ProcessingSubStatus } from "@/api/visaCases.api";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { VisaCaseFilters } from "@/api/visaCases.api";

/* Option lists come from the shared backend data file so this list and the
 * Backend Dashboard stay in sync. The case rows are fetched live from the API. */
const TRAVEL_REASONS = BACKEND_TRAVEL_REASONS;
const DECISIONS = BACKEND_DECISIONS;

// Stage label → API enum for ?stage= deep-links (Cases-by-Stage tiles).
const STAGE_LABEL_TO_ENUM: Record<string, string> = {
  "Documentation": "DOCUMENTATION",
  "Financial Assessment": "FINANCIAL_ASSESSMENT",
  "Case Preparation": "CASE_PREPARATION",
  "Filing Preparation": "FILING_PREPARATION",
  "Submission": "SUBMISSION",
  "Decision": "DECISION",
};
// Reverse map: enum → label (for SelectItem text lookup).
const STAGE_ENUM_TO_LABEL: Record<string, string> = Object.fromEntries(
  Object.entries(STAGE_LABEL_TO_ENUM).map(([k, v]) => [v, k])
);
const STAGE_ENUMS = new Set(Object.values(STAGE_LABEL_TO_ENUM));

// Decision-outcome values — passed as `decision=<value>` (filter by visa_cases.decision),
// not as currentSubStatus.
const DECISION_VALUES = new Set(["PENDING", "APPROVED", "REFUSED", "WITHDRAWN"]);

// Upper bound for the "Custom…" rows-per-page input.
const MAX_PER_PAGE = 500;

// Sale-type / visa-category options (drives the API `visaCategory` param).
const SALE_TYPE_OPTIONS: { value: "all" | "visitor" | "spouse" | "student"; label: string }[] = [
  { value: "all", label: "All" },
  { value: "visitor", label: "Visitor" },
  { value: "spouse", label: "Spouse" },
  { value: "student", label: "Student" },
];

// Admin, Developer, and CX may assign a Backend (CX/Binding) member to a case.
// (The backend maps role "admin" → "superadmin" in auth-context.)
const ASSIGN_ALLOWED_ROLES = ["superadmin", "developer", "customer_experience"];

const TEAM_LABEL: Record<string, string> = { cx: "CX", binding: "Binding", application: "Application" };

/** CX still owns the case when assignedTeam is cx (or unset); any other team means handoff. */
function isCxHandedOff(client: VisaClient): boolean {
  const team = (client.assignedTeam ?? "").toLowerCase();
  return team !== "" && team !== "cx";
}

const inr = (n: number) => `₹${Math.round(Number(n) || 0).toLocaleString("en-IN")}`;
const fmtDate = (iso: string) => {
  const [y, m, d] = iso.split("-");
  return `${d}-${m}-${y}`;
};

type SortKey = "name" | "destination" | "travelReason" | "status" | "decision" | "enrollmentDate" | "totalCharges" | "initialReceived" | "beforeVisaCharges" | "financeCharges" | "balanceDue" | "handledBy";
type SortDir = "asc" | "desc";

/* ------------------------------------------------------------------ */

/**
 * Shared Visa-Case list table. Used by the Backend Team (full status control)
 * and the CX Team (`statusScope="documentation"` — CX may only move a case
 * through the Documentation sub-statuses, not Filing/Submission etc.).
 */
export default function BackendClients({
  title = "Visa Processing",
  breadcrumbLabel = "Backend",
  statusScope = "all",
  defaultPageSize,
  ownTeam,
}: {
  title?: string;
  breadcrumbLabel?: string;
  statusScope?: "all" | "documentation";
  defaultPageSize?: number;
  ownTeam?: string;
} = {}) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const topRef = useRef<HTMLDivElement>(null);

  // Initial filters can be pre-set via URL query params (e.g. dashboard cards
  // link to /backend/clients?decision=Approved or ?balance=due).
  const initialParams = useMemo(
    () => new URLSearchParams(typeof window !== "undefined" ? window.location.search : ""),
    []
  );

  // sessionStorage key scoped to the page variant so BK and CX have separate state.
  const FILTER_KEY = `bk_clients_filters_${title}`;

  // Read persisted filter state — URL params take priority over storage (dashboard deep-links).
  const hasUrlParams = useMemo(
    () => ["q", "status", "stage", "destination", "decision", "reason", "balance", "handledBy", "category", "period", "from", "to"].some((k) => initialParams.has(k)),
    [initialParams]
  );
  const stored = useMemo<Record<string, string>>(() => {
    if (hasUrlParams) return {};
    try {
      return JSON.parse(sessionStorage.getItem(FILTER_KEY) ?? "{}");
    } catch {
      return {};
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const [search, setSearch] = useState(initialParams.get("q") ?? stored.search ?? "");
  // Status filter stores enum values (e.g. "DECISION_PENDING", "CHECKLIST_SHARED", "DOCUMENTATION").
  // Deep-linked via ?status=<enum> from dashboard outcome chips,
  // or ?stage=<stageLabel> ("Documentation") from Cases-by-Stage tiles (converted here).
  const [stageFilter, setStageFilter] = useState(() => {
    const statusParam = initialParams.get("status");
    if (statusParam) return statusParam;
    const stageParam = initialParams.get("stage");
    if (stageParam) return STAGE_LABEL_TO_ENUM[stageParam] ?? stageParam;
    return stored.stageFilter ?? "all";
  });
  const [statusFilter, setStatusFilter] = useState(stored.statusFilter ?? "all");
  const [destinationFilter, setDestinationFilter] = useState(initialParams.get("destination") ?? stored.destinationFilter ?? "all");
  const [decisionFilter, setDecisionFilter] = useState(initialParams.get("decision") ?? stored.decisionFilter ?? "all");
  const [reasonFilter, setReasonFilter] = useState(initialParams.get("reason") ?? stored.reasonFilter ?? "all");
  const [balanceFilter, setBalanceFilter] = useState(initialParams.get("balance") ?? stored.balanceFilter ?? "all");
  const [handledByFilter, setHandledByFilter] = useState(initialParams.get("handledBy") ?? stored.handledByFilter ?? "all");
  // Sale type / visa category — sent to the API as `visaCategory` (server-side filter).
  const [saleType, setSaleType] = useState<"all" | "visitor" | "spouse" | "student">(
    (["visitor", "spouse", "student"].includes(initialParams.get("category") ?? "")
      ? (initialParams.get("category") as "visitor" | "spouse" | "student")
      : (["visitor", "spouse", "student"].includes(stored.saleType ?? "")
        ? (stored.saleType as "visitor" | "spouse" | "student")
        : "all"))
  );
  // Current API page (1-based) + rows-per-page. Server-side pagination.
  // Always start at page 1 when navigating from a deep-link (URL has filter params)
  // so we don't restore a stale page from sessionStorage and fire multiple API calls.
  const hasUrlFilterParam = !!(initialParams.get("stage") || initialParams.get("status") || initialParams.get("decision") || initialParams.get("balance"));
  const [page, setPage] = useState(hasUrlFilterParam ? 1 : (stored.page ? Number(stored.page) : 1));
  const [pageSize, setPageSize] = useState(defaultPageSize ?? (stored.pageSize ? Number(stored.pageSize) : 20));
  const handleMaxResultsChange = (n: number) => {
    setPageSize(n);
    setPage(1);
  };

  // Enrollment-date filter via period tabs (Today / Weekly / Monthly / Custom).
  // The dashboard deep-links with ?period=<tab> (+ ?from&to for custom), so the
  // list opens on the same period the user had selected there.
  const initFrom = initialParams.get("from") ?? stored.customFrom ?? null;
  const initTo = initialParams.get("to") ?? stored.customTo ?? null;
  const initPeriod = initialParams.get("period");
  const initialTab = initPeriod
    ? initPeriod.charAt(0).toUpperCase() + initPeriod.slice(1).toLowerCase()
    : initFrom && initTo
      ? "Custom"
      : stored.timeTab ?? "Monthly";
  const [timeTab, setTimeTab] = useState<string>(initialTab);
  const [customRange, setCustomRange] = useState<[Date | null, Date | null]>(
    initFrom && initTo ? [new Date(`${initFrom}T12:00:00`), new Date(`${initTo}T12:00:00`)] : [null, null]
  );

  // Persist all filter state to sessionStorage on every change so back-navigation restores it.
  useEffect(() => {
    try {
      sessionStorage.setItem(FILTER_KEY, JSON.stringify({
        search, stageFilter, statusFilter, destinationFilter, decisionFilter,
        reasonFilter, balanceFilter, handledByFilter, saleType,
        page: String(page), pageSize: String(pageSize), timeTab,
        customFrom: customRange[0] ? customRange[0].toISOString().slice(0, 10) : "",
        customTo: customRange[1] ? customRange[1].toISOString().slice(0, 10) : "",
      }));
    } catch { /* storage full or unavailable */ }
  }, [search, stageFilter, statusFilter, destinationFilter, decisionFilter, reasonFilter, balanceFilter, handledByFilter, saleType, page, pageSize, timeTab, customRange]); // eslint-disable-line react-hooks/exhaustive-deps

  // Effective YMD bounds derived from the active tab. null = no bound (show all).
  const { dateFrom, dateTo } = useMemo<{ dateFrom: string | null; dateTo: string | null }>(() => {
    const now = new Date();
    const ymd = (d: Date) => format(d, "yyyy-MM-dd");
    switch (timeTab) {
      case "Today":
        return { dateFrom: ymd(now), dateTo: ymd(now) };
      case "Weekly":
        return { dateFrom: ymd(startOfWeek(now, { weekStartsOn: 1 })), dateTo: ymd(endOfWeek(now, { weekStartsOn: 1 })) };
      case "Monthly":
        return { dateFrom: ymd(startOfMonth(now)), dateTo: ymd(endOfMonth(now)) };
      case "Yearly":
        return { dateFrom: ymd(startOfYear(now)), dateTo: ymd(endOfYear(now)) };
      case "Custom":
        return customRange[0] && customRange[1]
          ? { dateFrom: ymd(customRange[0]), dateTo: ymd(customRange[1]) }
          : { dateFrom: null, dateTo: null };
      default:
        return { dateFrom: null, dateTo: null };
    }
  }, [timeTab, customRange]);

  const { data: stagesMeta } = useProcessingStages();

  // Once stagesMeta loads, if stageFilter is still a raw label from the URL
  // (e.g. "On Hold" from ?stage=On+Hold), resolve it to the proper enum so the
  // Select shows the correct option.
  useEffect(() => {
    if (!stagesMeta || stageFilter === "all") return;
    const isKnownEnum =
      STAGE_ENUMS.has(stageFilter) ||
      DECISION_VALUES.has(stageFilter) ||
      stagesMeta.stages.some((s) => s.stage === stageFilter) ||
      stagesMeta.stages.some((s) => s.subStatuses.some((sub) => sub.value === stageFilter));
    if (isKnownEnum) return;

    // Try to match as a stage label (e.g. "On Hold" → "ON_HOLD").
    const byStageLabel = stagesMeta.stages.find((s) => s.label === stageFilter);
    if (byStageLabel) { setStageFilter(byStageLabel.stage); return; }

    // Try to match as a sub-status label (e.g. "Checklist Shared").
    for (const stage of stagesMeta.stages) {
      const sub = stage.subStatuses.find((s) => s.label === stageFilter);
      if (sub) { setStageFilter(sub.value); return; }
    }
  }, [stagesMeta]); // eslint-disable-line react-hooks/exhaustive-deps

  // Map the stageFilter enum value → API params.
  // For sub-statuses the backend expects the human label ("Pending"), not the enum ("DECISION_PENDING").
  const stageApiParam = useMemo<{ currentStage?: string; currentSubStatus?: string; decision?: string }>(() => {
    if (stageFilter === "all") return {};
    if (STAGE_ENUMS.has(stageFilter)) return { currentStage: stageFilter };
    // Also cover stages not in the hardcoded set (e.g. On Hold, Refiling, Client Drop) — matched by enum.
    if (stagesMeta?.stages.some((s) => s.stage === stageFilter)) return { currentStage: stageFilter };
    // Deep-links pass the stage label (e.g. ?stage=On+Hold) — resolve label → enum.
    const stageByLabel = stagesMeta?.stages.find((s) => s.label === stageFilter);
    if (stageByLabel) return { currentStage: stageByLabel.stage };
    if (DECISION_VALUES.has(stageFilter)) return { decision: stageFilter };
    // Look up the label for this enum value from stagesMeta; fall back to the enum if not loaded yet.
    let label: string | undefined;
    if (stagesMeta) {
      for (const stage of stagesMeta.stages) {
        const sub = stage.subStatuses.find((s) => s.value === stageFilter);
        if (sub) { label = sub.label; break; }
      }
    }
    return { currentSubStatus: label ?? stageFilter };
  }, [stageFilter, stagesMeta]);

  const visaFilters = useMemo<VisaCaseFilters>(
    () => ({
      page,
      pageSize,
      visaCategory: saleType === "all" ? undefined : saleType,
      countryId: destinationFilter === "all" ? undefined : destinationFilter,
      fromDate: dateFrom ?? undefined,
      toDate: dateTo ?? undefined,
      ...stageApiParam,
    }),
    [page, pageSize, saleType, destinationFilter, dateFrom, dateTo, stageApiParam]
  );
  // Wait for stagesMeta before firing the query when the filter is a raw stage label from the URL
  // (e.g. ?stage=On+Hold). Without this, the first render sends currentSubStatus=On+Hold → 400.
  const stageNeedsMetaResolution =
    stageFilter !== "all" &&
    !STAGE_ENUMS.has(stageFilter) &&
    !DECISION_VALUES.has(stageFilter);
  const visaQueryEnabled = !stageNeedsMetaResolution || !!stagesMeta;

  const { data, isLoading, isError, isFetching, error } = useVisaCases(visaFilters, visaQueryEnabled);
  const pagination = data?.pagination;

  // We seed a local copy so the existing in-list edit / delete / status-change
  // interactions keep working optimistically until those write endpoints exist.
  const [clients, setClients] = useState<VisaClient[]>([]);
  useEffect(() => {
    if (data?.rows) setClients(data.rows);
  }, [data?.rows]);

  // Reset to page 1 whenever a server-side filter changes, so we don't land on
  // a now-out-of-range page.
  useEffect(() => {
    setPage(1);
  }, [saleType, destinationFilter, dateFrom, dateTo, stageFilter]);

  // Scroll to top of the list whenever the user navigates to a different page.
  useEffect(() => {
    topRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [page]);

  // Destination options come from GET /api/modules/countries. The filter uses the
  // country UUID (server-side `countryId` param); the edit dialog uses plain names.
  const { data: countries } = useVisaCountries();
  const DESTINATION_OPTIONS = useMemo(() => {
    if (!countries?.length) return [];
    // Dedupe by name (the API can return e.g. two "India" rows), keeping the first id.
    // India is excluded from the destination filter (domestic; not a visa destination).
    const byName = new Map<string, string>();
    for (const c of countries) if (!byName.has(c.name) && c.name !== "India") byName.set(c.name, c.id);
    return Array.from(byName, ([name, id]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name));
  }, [countries]);
  // Names only, for the edit dialog's destination select.
  const DESTINATIONS = useMemo(
    () => (DESTINATION_OPTIONS.length ? DESTINATION_OPTIONS.map((c) => c.name) : BACKEND_DESTINATIONS),
    [DESTINATION_OPTIONS]
  );
  // The Destination filter value is a country UUID. If it was deep-linked as a
  // country name (e.g. ?destination=Canada), resolve it to the id once loaded.
  useEffect(() => {
    if (destinationFilter === "all" || !DESTINATION_OPTIONS.length) return;
    const match = DESTINATION_OPTIONS.find((c) => c.name.toLowerCase() === destinationFilter.toLowerCase());
    if (match && match.id !== destinationFilter) setDestinationFilter(match.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [DESTINATION_OPTIONS]);

  const [sortKey, setSortKey] = useState<SortKey>("enrollmentDate");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  // Dialog state
  const [dialogClient, setDialogClient] = useState<VisaClient | null>(null);
  const [financialExpanded, setFinancialExpanded] = useState(false);
  const [dialogMode, setDialogMode] = useState<"view" | "edit">("view");
  const [draft, setDraft] = useState<VisaClient | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<VisaClient | null>(null);

  const activeFilterCount =
    (stageFilter !== "all" ? 1 : 0) +
    (statusFilter !== "all" ? 1 : 0) +
    (destinationFilter !== "all" ? 1 : 0) +
    (reasonFilter !== "all" ? 1 : 0) +
    (balanceFilter !== "all" ? 1 : 0) +
    (handledByFilter !== "all" ? 1 : 0) +
    (saleType !== "all" ? 1 : 0);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    let rows = clients.filter((c) => {
      if (q) {
        const hay = `${c.name} ${c.passport} ${c.destination}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      // Status filter (stage + sub-status) is fully server-side via currentStage / currentSubStatus params.
      if (statusFilter !== "all" && c.status !== statusFilter) return false;
      // Destination is filtered server-side via `countryId` (see visaFilters).
      if (decisionFilter !== "all" && c.decision !== decisionFilter) return false;
      if (reasonFilter !== "all" && c.travelReason !== reasonFilter) return false;
      if (balanceFilter === "due"               && !(c.balanceDue > 0))        return false;
      if (balanceFilter === "paid"              && c.balanceDue > 0)           return false;
      if (balanceFilter === "initial_received"  && !(c.initialReceived > 0))   return false;
      if (balanceFilter === "initial_pending"   && c.initialReceived > 0)      return false;
      if (balanceFilter === "bv_received"       && !(c.beforeVisaCharges > 0)) return false;
      if (balanceFilter === "bv_pending"        && c.beforeVisaCharges > 0)    return false;
      if (handledByFilter !== "all") {
        if (handledByFilter === "unassigned") {
          if (c.assignedUserId != null) return false;
        } else if (handledByFilter.startsWith("team:")) {
          if ((c.assignedTeam ?? "") !== handledByFilter.slice(5)) return false;
        } else if (String(c.assignedUserId ?? "") !== handledByFilter) {
          return false;
        }
      }
      return true;
    });

    rows = [...rows].sort((a, b) => {
      let av: string | number = a[sortKey];
      let bv: string | number = b[sortKey];
      if (sortKey === "balanceDue")    { av = a.balanceDue;      bv = b.balanceDue; }
      if (sortKey === "totalCharges")  { av = a.totalCharges;    bv = b.totalCharges; }
      if (sortKey === "initialReceived")   { av = a.initialReceived;   bv = b.initialReceived; }
      if (sortKey === "beforeVisaCharges") { av = a.beforeVisaCharges; bv = b.beforeVisaCharges; }
      if (sortKey === "financeCharges") { av = a.financeCharges;  bv = b.financeCharges; }
      if (typeof av === "string" && typeof bv === "string") {
        return sortDir === "asc" ? av.localeCompare(bv) : bv.localeCompare(av);
      }
      return sortDir === "asc" ? (av as number) - (bv as number) : (bv as number) - (av as number);
    });
    return rows;
  }, [clients, search, stageFilter, statusFilter, decisionFilter, reasonFilter, balanceFilter, handledByFilter, sortKey, sortDir]);

  // Visa-case ids of the currently-shown rows that can be selected for assignment.
  const pageSelectableIds = useMemo(
    () => filtered.map((c) => c.visaCaseId).filter((v): v is string => !!v),
    [filtered]
  );

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  const clearFilters = () => {
    setStageFilter("all");
    setStatusFilter("all");
    setDestinationFilter("all");
    setReasonFilter("all");
    setBalanceFilter("all");
    setHandledByFilter("all");
    setSaleType("all");
    setSearch("");
  };

  // DashboardDateFilter emits either a tab label ("Today"/"Weekly"/…) or a preset
  // filter value ("today"/"monthly"/"maximum"). Normalise to a capitalised tab.
  const handleTabChange = (tab: string) => {
    const t = tab.toLowerCase();
    if (t === "maximum") {
      setCustomRange([null, null]);
      setTimeTab("Custom");
      return;
    }
    setTimeTab(t.charAt(0).toUpperCase() + t.slice(1));
  };

  // Clicking a client (row or name) navigates to the full client detail page
  // instead of opening the in-list dialog.
  const goToClient = (c: VisaClient) => {
    sessionStorage.setItem("client_list_return_path", "/backend/clients");
    setLocation(`/clients/${c.id}/view`);
  };

  const openEdit = (c: VisaClient) => {
    setDialogClient(c);
    setDialogMode("edit");
    setDraft({ ...c });
  };

  // Assignment (Admin/Developer only — see canAssign below). Cases are selected
  // via row checkboxes, then assigned to one CX/Binding member in bulk through
  // POST /visa-cases/{id}/assign (one call per case).
  const queryClient = useQueryClient();
  const canAssign = ASSIGN_ALLOWED_ROLES.includes((user as any)?.role);
  const canChangeStatus = !!user && (user as any)?.role !== "counsellor";
  // Either assignment or status-change permission lets the user enter select mode.
  const canSelect = canAssign || canChangeStatus;
  // The list endpoint only returns assignedUserId, so resolve names client-side
  // from the CX/Binding user list (also feeds the assign dropdown and the
  // "Handled By" filter). Loaded whenever the Handled By column is visible.
  const showHandledByCol = !["customer_experience", "binding_team"].includes((user as any)?.role);
  // useAllBackendUsers (/api/users/users) is admin-only — used only for the "Handled By" name lookup column.
  const { data: allBackendUsers } = useAllBackendUsers(showHandledByCol);
  // useAssignableUsers (/api/modules/visa-cases/assignable-users) works for CX too — used for the assign dialog.
  const { data: assignableUsers, isLoading: loadingAssignable } = useAssignableUsers(canAssign);
  const userNameById = useMemo(() => {
    const m = new Map<number, string>();
    for (const u of allBackendUsers ?? []) m.set(u.id, u.fullName);
    return m;
  }, [allBackendUsers]);

  // Broader lookup (all roles incl. counsellors) — used in CSV export to resolve counsellor names.
  const { data: allSystemUsers } = useAllSystemUsers();
  const allUserNameById = useMemo(() => {
    const m = new Map<number, string>();
    for (const u of allSystemUsers ?? []) m.set(u.id, u.fullName);
    return m;
  }, [allSystemUsers]);

  const [selectMode, setSelectMode] = useState(false);
  const [selectedCaseIds, setSelectedCaseIds] = useState<Set<string>>(new Set());
  const [assignOpen, setAssignOpen] = useState(false);
  const [assignUserId, setAssignUserId] = useState<string>("");
  const [assignNotes, setAssignNotes] = useState<string>("");
  const [assignBusy, setAssignBusy] = useState(false);

  // Bulk change-status state (admin/non-counsellor users when ≥2 cases selected).
  const [bulkStatusOpen, setBulkStatusOpen] = useState(false);
  const [bulkStatusStageDraft, setBulkStatusStageDraft] = useState<string>("");
  const [bulkStatusDraft, setBulkStatusDraft] = useState<string>("");
  const [bulkStatusNotes, setBulkStatusNotes] = useState<string>("");
  const [bulkStatusBusy, setBulkStatusBusy] = useState(false);

  const toggleSelectCase = (visaCaseId: string) => {
    setSelectedCaseIds((prev) => {
      const next = new Set(prev);
      if (next.has(visaCaseId)) next.delete(visaCaseId);
      else next.add(visaCaseId);
      return next;
    });
  };

  const exitSelectMode = () => {
    setSelectMode(false);
    setSelectedCaseIds(new Set());
  };

  const openAssignDialog = () => {
    setAssignUserId("");
    setAssignNotes("");
    setAssignOpen(true);
  };

  // Assign a single case from its row menu — reuses the bulk dialog scoped to one.
  const openAssignForCase = (c: VisaClient) => {
    if (!c.visaCaseId) return;
    setSelectedCaseIds(new Set([c.visaCaseId]));
    setAssignUserId(c.assignedUserId != null ? String(c.assignedUserId) : "");
    setAssignNotes("");
    setAssignOpen(true);
  };

  const runBulkAssign = async () => {
    const picked = assignableUsers?.find((u) => String(u.id) === assignUserId);
    if (!picked || selectedCaseIds.size === 0) return;
    setAssignBusy(true);
    try {
      const result = await assignBulkVisaCases({
        visaCaseIds: Array.from(selectedCaseIds),
        assignedUserId: picked.id,
        notes: assignNotes.trim() || undefined,
      });
      const { succeeded, failed } = result.summary;
      queryClient.invalidateQueries({ queryKey: ["visa-cases"] });
      toast({
        title: failed === 0 ? "Cases assigned" : "Assignment partially completed",
        description: `${succeeded} case${succeeded === 1 ? "" : "s"} assigned to ${picked.fullName}${failed ? ` · ${failed} failed` : ""}.`,
        variant: failed === 0 ? undefined : "destructive",
      });
      setAssignOpen(false);
      exitSelectMode();
    } catch (err: any) {
      toast({
        title: "Assignment failed",
        description: err?.response?.data?.message || err?.message || "Could not assign cases.",
        variant: "destructive",
      });
    } finally {
      setAssignBusy(false);
    }
  };

  const openBulkStatusChange = () => {
    setBulkStatusStageDraft("");
    setBulkStatusDraft("");
    setBulkStatusNotes("");
    setBulkStatusOpen(true);
  };

  const saveBulkStatus = async () => {
    if (!bulkStatusDraft || selectedCaseIds.size === 0) return;
    setBulkStatusBusy(true);
    let succeeded = 0;
    let failed = 0;
    const newLabel = subStatusByValue.get(bulkStatusDraft)?.displayLabel ?? bulkStatusDraft;
    try {
      await Promise.all(
        Array.from(selectedCaseIds).map(async (id) => {
          try {
            await changeVisaCaseStatus(id, {
              subStatus: bulkStatusDraft,
              notes: bulkStatusNotes.trim() || undefined,
              adminOverride: true,
            });
            succeeded++;
          } catch {
            failed++;
          }
        })
      );
      setClients((prev) =>
        prev.map((c) =>
          c.visaCaseId && selectedCaseIds.has(c.visaCaseId)
            ? { ...c, status: newLabel, subStatus: bulkStatusDraft }
            : c
        )
      );
      queryClient.invalidateQueries({ queryKey: ["visa-cases"] });
      toast({
        title: failed === 0 ? "Status updated" : "Partially updated",
        description: `${succeeded} case${succeeded !== 1 ? "s" : ""} updated to "${newLabel}"${failed ? ` · ${failed} failed` : ""}.`,
        variant: failed === 0 ? undefined : "destructive",
      });
      setBulkStatusOpen(false);
      exitSelectMode();
    } catch (err: any) {
      toast({
        title: "Status update failed",
        description: err?.response?.data?.message ?? err?.message ?? "Please try again.",
        variant: "destructive",
      });
    } finally {
      setBulkStatusBusy(false);
    }
  };

  // Change-status dialog (hidden from counsellors — see canChangeStatus below).
  // Options + the exact `subStatus` enum come from the processing-stages API;
  // `viewer.updatableSubStatuses` is already RBAC-filtered for the caller's role.
  // `statusDraft` holds the enum value (e.g. "CHECKLIST_SHARED").
  const [statusTarget, setStatusTarget] = useState<VisaClient | null>(null);
  const [statusStageDraft, setStatusStageDraft] = useState<string>("");  // selected stage label
  const [statusDraft, setStatusDraft] = useState<string>("");            // selected sub-status enum
  const [statusNotes, setStatusNotes] = useState<string>("");
  const [statusSubmissionDate, setStatusSubmissionDate] = useState<string>("");
  const [statusDecisionDate, setStatusDecisionDate] = useState<string>("");
  const [statusBusy, setStatusBusy] = useState(false);

  // Every team can move a case to any status, so the picker always offers the
  // full catalogue (all stages, in API order) regardless of role/scope.
  const statusGroups = useMemo(() => {
    const subs = stagesMeta?.stages.flatMap((s) => s.subStatuses) ?? [];
    const groups: { stageLabel: string; items: ProcessingSubStatus[] }[] = [];
    for (const s of subs) {
      let g = groups.find((x) => x.stageLabel === s.stageLabel);
      if (!g) { g = { stageLabel: s.stageLabel, items: [] }; groups.push(g); }
      g.items.push(s);
    }
    return groups;
  }, [stagesMeta]);
  // Quick lookups: enum value → display label, and current case's enum.
  const subStatusByValue = useMemo(() => {
    const m = new Map<string, ProcessingSubStatus>();
    for (const g of statusGroups) for (const s of g.items) m.set(s.value, s);
    return m;
  }, [statusGroups]);

  const openStatusChange = (c: VisaClient) => {
    setStatusTarget(c);
    // Pre-select the current stage label so both dropdowns open in context.
    const currentStageLabel = stagesMeta?.stages.find(
      (s) => s.subStatuses.some((sub) => sub.value === c.subStatus)
    )?.label ?? "";
    setStatusStageDraft(currentStageLabel);
    setStatusDraft(c.subStatus ?? "");
    setStatusNotes("");
    setStatusSubmissionDate("");
    setStatusDecisionDate("");
  };
  const saveStatus = async () => {
    if (!statusTarget) return;
    if (!statusTarget.visaCaseId || !statusDraft) {
      toast({ title: "Cannot update status", description: "This case has no linked visa-case id.", variant: "destructive" });
      return;
    }
    setStatusBusy(true);
    try {
      await changeVisaCaseStatus(statusTarget.visaCaseId, {
        subStatus: statusDraft,
        notes: statusNotes.trim() || undefined,
        // Any team may move to any stage now — override the stage-order RBAC.
        adminOverride: true,
        ...(statusSubmissionDate ? { submissionDate: statusSubmissionDate } : {}),
        ...(statusDecisionDate ? { decisionDate: statusDecisionDate } : {}),
      });
      const newLabel = subStatusByValue.get(statusDraft)?.displayLabel ?? statusTarget.status;
      setClients((prev) =>
        prev.map((c) => (c.id === statusTarget.id ? { ...c, status: newLabel, subStatus: statusDraft } : c))
      );
      queryClient.invalidateQueries({ queryKey: ["visa-cases"] });
      toast({ title: "Status updated", description: `${statusTarget.name}'s status changed to "${newLabel}".` });
      setStatusSubmissionDate("");
      setStatusDecisionDate("");
      setStatusTarget(null);
    } catch (err: any) {
      toast({
        title: "Status update failed",
        description: err?.response?.data?.message ?? err?.message ?? "Please try again.",
        variant: "destructive",
      });
    } finally {
      setStatusBusy(false);
    }
  };

  // Change-decision dialog. Outcome enum mirrors VisaCaseDecision.outcome.
  const [decisionTarget, setDecisionTarget] = useState<VisaClient | null>(null);
  const [decisionDraft, setDecisionDraft] = useState<string>("Pending"); // UI label
  const [decisionDecidedOn, setDecisionDecidedOn] = useState<string>("");
  const [decisionRemarks, setDecisionRemarks] = useState<string>("");
  const [decisionBusy, setDecisionBusy] = useState(false);

  const openDecisionChange = (c: VisaClient) => {
    setDecisionTarget(c);
    setDecisionDraft(c.decision || "Pending");
    setDecisionDecidedOn(c.decidedOn ?? "");
    setDecisionRemarks("");
  };
  const saveDecision = async () => {
    if (!decisionTarget) return;
    if (!decisionTarget.visaCaseId) {
      toast({ title: "Cannot update decision", description: "This case has no linked visa-case id.", variant: "destructive" });
      return;
    }
    setDecisionBusy(true);
    try {
      await changeVisaCaseDecision(decisionTarget.visaCaseId, {
        decision: decisionDraft.toUpperCase(),
        decisionDate: decisionDecidedOn || undefined,
        remarks: decisionRemarks.trim() || undefined,
      });
      setClients((prev) =>
        prev.map((c) =>
          c.id === decisionTarget.id
            ? { ...c, decision: decisionDraft, decidedOn: decisionDecidedOn || c.decidedOn }
            : c
        )
      );
      queryClient.invalidateQueries({ queryKey: ["visa-cases"] });
      toast({ title: "Decision updated", description: `${decisionTarget.name}'s decision set to "${decisionDraft}".` });
      setDecisionTarget(null);
    } catch (err: any) {
      toast({
        title: "Decision update failed",
        description: err?.response?.data?.message ?? err?.message ?? "Please try again.",
        variant: "destructive",
      });
    } finally {
      setDecisionBusy(false);
    }
  };

  const saveEdit = () => {
    if (!draft) return;
    setClients((prev) => prev.map((c) => (c.id === draft.id ? draft : c)));
    toast({ title: "Client updated", description: `${draft.name}'s case has been updated.` });
    setDialogClient(null);
    setDraft(null);
  };

  const confirmDelete = () => {
    if (!deleteTarget) return;
    setClients((prev) => prev.filter((c) => c.id !== deleteTarget.id));
    toast({ title: "Client removed", description: `${deleteTarget.name} has been removed from the list.` });
    setDeleteTarget(null);
  };

  const handleExport = () => {
    if (filtered.length === 0) return;
    const dash = (v: string) => (v === "—" ? "" : v);
    const headers = [
      "ID", "Name", "Passport", "Destination", "Travel Reason", "Sponsor",
      "Status", "Decision", "Enrollment Date",
      "Total Charges", "Initial Received", "Before Visa", "Balance Due",
      ...(showHandledBy ? ["Handled By"] : []),
    ];
    const rows = filtered.map((c) => {
      const handledByName = c.assignedUserId == null
        ? "Unassigned"
        : (c.assignedUserName ?? userNameById.get(c.assignedUserId) ?? "Unassigned");
      return [
        c.id, c.name, c.passport, c.destination, dash(c.travelReason), dash(c.sponsor),
        c.status, c.decision, fmtDate(c.enrollmentDate),
        c.totalCharges, c.initialReceived, c.beforeVisaCharges, c.balanceDue,
        ...(showHandledBy ? [handledByName] : []),
      ];
    });
    const csv = [headers, ...rows]
      .map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `visa-cases-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: "Exported", description: `${filtered.length} cases exported to CSV.` });
  };

  const SortHeader = ({ label, k, className }: { label: string; k: SortKey; className?: string }) => (
    <TableHead className={cn("whitespace-nowrap font-semibold text-xs uppercase tracking-wider text-muted-foreground py-3", className)}>
      <button type="button" onClick={() => toggleSort(k)} className="flex items-center gap-1 hover:text-foreground transition-colors">
        {label}
        {sortKey === k ? (
          sortDir === "asc" ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />
        ) : (
          <ChevronsUpDown className="w-3 h-3 opacity-50" />
        )}
      </button>
    </TableHead>
  );

  const userName = (user as any)?.fullname || (user as any)?.name || "Backend";
  const canEdit = !!user; // logged-in users can edit/delete
  // CX and Binding teams only ever see their own cases, so "Handled By" is
  // redundant for them — only admins/backend (who see everyone's) need it.
  const showHandledBy = !["customer_experience", "binding_team"].includes((user as any)?.role);

  return (
    <PageWrapper
      title={title}
      breadcrumbs={[{ label: breadcrumbLabel }, { label: "Clients" }]}
      actions={
        <div className="flex items-center gap-2">
          {canSelect ? (
            <>
              {selectMode && selectedCaseIds.size > 0 ? (
                <>
                  {canChangeStatus ? (
                    <Button variant="outline" className="gap-1.5 shadow-sm" onClick={openBulkStatusChange}>
                      <ListChecks className="w-4 h-4" />
                      Change Status ({selectedCaseIds.size})
                    </Button>
                  ) : null}
                  {canAssign ? (
                    <Button className="gap-1.5" onClick={openAssignDialog}>
                      <UserPlus className="w-4 h-4" />
                      Assign ({selectedCaseIds.size})
                    </Button>
                  ) : null}
                </>
              ) : null}
              <Button
                variant={selectMode ? "secondary" : "outline"}
                className="shadow-sm"
                onClick={() => (selectMode ? exitSelectMode() : setSelectMode(true))}
              >
                {selectMode ? "Cancel" : "Select Clients"}
              </Button>
            </>
          ) : null}
          <Button
            variant="outline"
            className="bg-card border-border/50 shadow-sm hover:bg-muted/50"
            onClick={handleExport}
            disabled={filtered.length === 0}
          >
            <Download className="w-4 h-4 mr-2" />
            Export CSV
          </Button>
        </div>
      }
    >
      <div ref={topRef} className="space-y-5">
        {/* Search + filter chips */}
        <div className="space-y-4 rounded-xl border border-border/50 bg-card p-4 shadow-sm">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div className="w-full space-y-2 sm:max-w-md">
              <Label className="text-xs font-medium text-muted-foreground">Search</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search by name, passport or destination…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="h-9 pl-9"
                />
              </div>
            </div>
            <DashboardDateFilter
              date={customRange}
              onDateChange={setCustomRange}
              activeTab={timeTab}
              onTabChange={handleTabChange}
              showYearly={false}
              align="end"
              maxResults={pageSize}
              onMaxResultsChange={handleMaxResultsChange}
              maxResultsLimit={MAX_PER_PAGE}
            />
          </div>

          <div className="flex flex-wrap items-end gap-3">
            <div className="space-y-1.5">
              <Label className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Status</Label>
              <Select value={stageFilter} onValueChange={setStageFilter}>
                <SelectTrigger className={cn("h-9 w-[220px]", stageFilter !== "all" && "border-primary/40 bg-primary/5 text-primary")}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  {(stagesMeta?.stages ?? []).map((stage) => (
                    <SelectGroup key={stage.stage}>
                      <SelectItem value={stage.stage} className="font-semibold">
                        All {stage.label}
                      </SelectItem>
                      {stage.subStatuses.map((sub) => (
                        <SelectItem key={sub.value} value={sub.value}>
                          {sub.label}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  ))}
                  <SelectGroup>
                    <SelectLabel>Decision Outcome</SelectLabel>
                    <SelectItem value="PENDING">Pending</SelectItem>
                    <SelectItem value="APPROVED">Approved</SelectItem>
                    <SelectItem value="REFUSED">Refused</SelectItem>
                    <SelectItem value="WITHDRAWN">Withdrawn</SelectItem>
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>
            {/* Processing Status filter hidden for now — Stage covers the high-level grouping.
            <div className="space-y-1.5">
              <Label className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Processing Status</Label>
              <StatusSelect value={statusFilter} onChange={setStatusFilter} includeAll className="w-[230px]" />
            </div>
            */}
            <div className="space-y-1.5">
              <Label className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Destination</Label>
              <Select value={destinationFilter} onValueChange={setDestinationFilter}>
                <SelectTrigger className={cn("h-9 w-[170px]", destinationFilter !== "all" && "border-primary/40 bg-primary/5 text-primary")}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  {DESTINATION_OPTIONS.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Sale Type</Label>
              <Select value={saleType} onValueChange={(v) => setSaleType(v as typeof saleType)}>
                <SelectTrigger className={cn("h-9 w-[170px]", saleType !== "all" && "border-primary/40 bg-primary/5 text-primary")}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SALE_TYPE_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <FilterChip label="Travel Reason" value={reasonFilter} onChange={setReasonFilter} options={TRAVEL_REASONS} />
            <div className="space-y-1.5">
              <Label className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Payment</Label>
              <Select value={balanceFilter} onValueChange={setBalanceFilter}>
                <SelectTrigger className={cn("h-9 w-[190px]", balanceFilter !== "all" && "border-primary/40 bg-primary/5 text-primary")}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectGroup>
                    <SelectLabel>Balance Due</SelectLabel>
                    <SelectItem value="due">With Balance Due</SelectItem>
                    <SelectItem value="paid">Fully Paid</SelectItem>
                  </SelectGroup>
                  <SelectGroup>
                    <SelectLabel>Initial</SelectLabel>
                    <SelectItem value="initial_received">Initial Received</SelectItem>
                    <SelectItem value="initial_pending">Initial Pending</SelectItem>
                  </SelectGroup>
                  <SelectGroup>
                    <SelectLabel>Before Visa</SelectLabel>
                    <SelectItem value="bv_received">Before Visa Received</SelectItem>
                    <SelectItem value="bv_pending">Before Visa Pending</SelectItem>
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>
            {showHandledBy ? (
              <div className="space-y-1.5">
                <Label className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Handled By</Label>
                <Select value={handledByFilter} onValueChange={setHandledByFilter}>
                  <SelectTrigger className={cn("h-9 w-[170px]", handledByFilter !== "all" && "border-primary/40 bg-primary/5 text-primary")}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="unassigned">Unassigned</SelectItem>
                    {["cx", "binding"].map((team) => {
                      const members = (allBackendUsers ?? []).filter((u) => u.role === team);
                      if (!members.length) return null;
                      return (
                        <SelectGroup key={team}>
                          {/* Selecting the team header filters to the whole team. */}
                          <SelectItem value={`team:${team}`} className="font-semibold">
                            All {TEAM_LABEL[team] ?? team}
                          </SelectItem>
                          {members.map((u) => (
                            <SelectItem key={u.id} value={String(u.id)}>{u.fullName}</SelectItem>
                          ))}
                        </SelectGroup>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>
            ) : null}
            {activeFilterCount > 0 ? (
              <Button variant="ghost" size="sm" className="h-9 text-muted-foreground" onClick={clearFilters}>
                <X className="w-3.5 h-3.5 mr-1" />
                Clear ({activeFilterCount})
              </Button>
            ) : null}

            {/* Rows per page — lives in the filter bar so it's always visible */}
            <div className="ml-auto flex items-center gap-2">
              <Label className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground whitespace-nowrap">
                Rows per page
              </Label>
              <Select
                value={String(pageSize)}
                onValueChange={(v) => handleMaxResultsChange(Number(v))}
              >
                <SelectTrigger className="h-9 w-[80px] text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent align="end">
                  {[10, 20, 50, 100].map((n) => (
                    <SelectItem key={n} value={String(n)}>{n}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {statusScope === "documentation" ? (
          <div className="flex flex-wrap items-center gap-4 rounded-lg border border-border/60 bg-card px-3 py-2.5 text-xs text-muted-foreground">
            <span className="font-medium text-foreground">Case ownership</span>
            <span className="inline-flex items-center gap-2">
              <span className="h-3 w-3 rounded-sm border border-border bg-card" aria-hidden />
              With CX — documentation in progress
            </span>
            <span className="inline-flex items-center gap-2">
              <span className="h-3 w-3 rounded-sm border border-primary/40 bg-accent" aria-hidden />
              Handed off — assigned to Binding (or another team)
            </span>
          </div>
        ) : null}

        {/* Result count */}
        <div className="flex items-center justify-between rounded-lg border border-border/60 bg-muted/20 px-3 py-2.5">
          <p className="text-xs text-muted-foreground">
            {isLoading ? (
              "Loading cases…"
            ) : isError ? (
              <span className="text-destructive">
                Failed to load cases{(error as any)?.message ? `: ${(error as any).message}` : "."}
              </span>
            ) : pagination && pagination.total > 0 ? (
              <>
                Showing{" "}
                <span className="font-semibold text-foreground">
                  {(pagination.page - 1) * pagination.pageSize + 1}–
                  {Math.min(pagination.page * pagination.pageSize, pagination.total)}
                </span>{" "}
                of <span className="font-semibold text-foreground">{pagination.total}</span> case
                {pagination.total !== 1 ? "s" : ""}
                {activeFilterCount > 0 || search ? " (filtered on page)" : ""}
                {isFetching ? " · updating…" : ""}
              </>
            ) : (
              "0 cases"
            )}
          </p>
          <button
            type="button"
            onClick={() => {
              setSortKey("enrollmentDate");
              setSortDir((d) => (sortKey === "enrollmentDate" ? (d === "asc" ? "desc" : "asc") : "desc"));
            }}
            className="flex items-center gap-1.5 rounded-md border border-border/60 bg-card px-2.5 py-1 text-xs font-medium text-muted-foreground shadow-sm transition-colors hover:bg-muted hover:text-foreground"
            title="Toggle sort order by enrollment date"
          >
            <ArrowRightLeft className="h-3 w-3" />
            {sortKey === "enrollmentDate" && sortDir === "asc" ? "Oldest First" : "Newest First"}
          </button>
        </div>

        {/* Table */}
        <div className="overflow-hidden rounded-xl border border-border/60 bg-card shadow-sm">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50 hover:bg-muted/50 border-b border-border/60">
                  {selectMode && canSelect ? (
                    <TableHead className="w-[44px] py-3">
                      <Checkbox
                        aria-label="Select all cases on this page"
                        checked={pageSelectableIds.length > 0 && pageSelectableIds.every((id) => selectedCaseIds.has(id))}
                        onCheckedChange={(v) => {
                          setSelectedCaseIds((prev) => {
                            const next = new Set(prev);
                            if (v === true) pageSelectableIds.forEach((id) => next.add(id));
                            else pageSelectableIds.forEach((id) => next.delete(id));
                            return next;
                          });
                        }}
                      />
                    </TableHead>
                  ) : null}
                  <TableHead className="w-[60px] py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Sr</TableHead>
                  <SortHeader label="Name" k="name" />
                  <TableHead className="py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Passport</TableHead>
                  <SortHeader label="Destination" k="destination" />
                  <SortHeader label="Travel Reason" k="travelReason" />
                  <SortHeader label="Status" k="status" />
                  <SortHeader label="Enrollment" k="enrollmentDate" />
                  <TableHead className="whitespace-nowrap py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    <div className="flex items-center justify-end gap-1">
                      <button type="button" onClick={() => toggleSort("balanceDue")} className="flex items-center gap-1 hover:text-foreground transition-colors">
                        Balance Due
                        {sortKey === "balanceDue" ? (sortDir === "asc" ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />) : <ChevronsUpDown className="w-3 h-3 opacity-50" />}
                      </button>
                      <button
                        type="button"
                        onClick={() => setFinancialExpanded((v) => !v)}
                        className={cn("h-5 w-5 rounded flex items-center justify-center transition-colors shrink-0", financialExpanded ? "text-primary bg-primary/10 hover:bg-primary/20" : "text-muted-foreground hover:bg-muted hover:text-foreground")}
                        title={financialExpanded ? "Collapse financial columns" : "Expand financial columns"}
                      >
                        {financialExpanded ? <ChevronsLeft className="h-3.5 w-3.5" /> : <ChevronsRight className="h-3.5 w-3.5" />}
                      </button>
                    </div>
                  </TableHead>
                  {financialExpanded && (
                    <>
                      <SortHeader label="Total" k="totalCharges" className="text-right" />
                      <SortHeader label="Initial" k="initialReceived" className="text-right" />
                      <SortHeader label="Before Visa" k="beforeVisaCharges" className="text-right" />
                    </>
                  )}
                  {showHandledBy ? <SortHeader label="Handled By" k="handledBy" /> : null}
                  <TableHead className="py-3 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={(showHandledBy ? (financialExpanded ? 13 : 10) : (financialExpanded ? 12 : 9)) + (selectMode && canSelect ? 1 : 0)} className="h-32 text-center text-muted-foreground py-12">
                      {isLoading
                        ? "Loading cases…"
                        : isError
                          ? "Could not load cases. Please try again."
                          : "No cases found. Try a different search or clear the filters."}
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((c, i) => {
                    const handedOff =
                      (statusScope === "documentation" && isCxHandedOff(c)) ||
                      (!!ownTeam && !!c.assignedTeam && c.assignedTeam.toLowerCase() !== ownTeam.toLowerCase());
                    const stageKey = stageOfStatus(c.status);
                    const stageColor = STAGE_COLORS[stageKey];
                    return (
                    <TableRow
                      key={c.id}
                      className={cn(
                        "cursor-pointer border-b border-border/40 transition-colors last:border-0",
                        stageColor ? stageColor.bg : "",
                        handedOff && "bg-accent/30 hover:bg-accent/40"
                      )}
                      onClick={() => {
                        if (selectMode && canSelect) {
                          if (c.visaCaseId) toggleSelectCase(c.visaCaseId);
                        } else {
                          goToClient(c);
                        }
                      }}
                    >
                      {selectMode && canSelect ? (
                        <TableCell className="py-3" onClick={(e) => e.stopPropagation()}>
                          <Checkbox
                            aria-label={`Select ${c.name}`}
                            disabled={!c.visaCaseId}
                            checked={!!c.visaCaseId && selectedCaseIds.has(c.visaCaseId)}
                            onCheckedChange={() => c.visaCaseId && toggleSelectCase(c.visaCaseId)}
                          />
                        </TableCell>
                      ) : null}
                      <TableCell className="py-3 font-mono text-xs text-muted-foreground">{String(i + 1).padStart(2, "0")}</TableCell>
                      <TableCell className="py-3">
                        <div className="flex flex-col gap-1">
                          <span className="text-sm font-semibold text-foreground">{c.name}</span>
                          {handedOff ? <HandoffBadge team={c.assignedTeam!} /> : null}
                        </div>
                      </TableCell>
                      <TableCell className="py-3 font-mono text-xs text-muted-foreground">{c.passport}</TableCell>
                      <TableCell className="py-3 text-sm text-foreground">{c.destination}</TableCell>
                      <TableCell className="py-3 text-sm text-muted-foreground">{c.travelReason}</TableCell>
                      <TableCell className="py-3">
                        <StatusCell status={c.status} handedOff={handedOff} assignedTeam={c.assignedTeam} />
                      </TableCell>
                      <TableCell className="py-3 whitespace-nowrap text-sm text-muted-foreground">{fmtDate(c.enrollmentDate)}</TableCell>
                      <TableCell className="py-3 text-right tabular-nums">
                        <span className={cn("text-sm font-semibold", c.balanceDue > 0 ? "text-orange-600 dark:text-orange-400" : "text-muted-foreground")}>
                          {c.balanceDue > 0 ? inr(c.balanceDue) : "₹0"}
                        </span>
                      </TableCell>
                      {financialExpanded && (
                        <>
                          <TableCell className="py-3 text-right tabular-nums text-sm text-foreground">
                            {c.totalCharges > 0 ? inr(c.totalCharges) : "—"}
                          </TableCell>
                          <TableCell className="py-3 text-right tabular-nums text-sm text-emerald-600 dark:text-emerald-400">
                            {c.initialReceived > 0 ? inr(c.initialReceived) : "₹0"}
                          </TableCell>
                          <TableCell className="py-3 text-right tabular-nums text-sm text-violet-600 dark:text-violet-400">
                            {c.beforeVisaCharges > 0 ? inr(c.beforeVisaCharges) : "—"}
                          </TableCell>
                        </>
                      )}
                      {showHandledBy ? (
                        <TableCell className="py-3">
                          {(() => {
                            const name =
                              c.assignedUserName ??
                              (c.assignedUserId != null ? userNameById.get(c.assignedUserId) : undefined);
                            if (c.assignedUserId == null) {
                              return <span className="text-sm text-muted-foreground">Unassigned</span>;
                            }
                            const display = name ?? `User #${c.assignedUserId}`;
                            return (
                              <div className="flex flex-col leading-tight">
                                <span className="whitespace-nowrap text-sm text-foreground">{display}</span>
                                {c.assignedTeam ? (
                                  <span className="text-[11px] text-muted-foreground">{TEAM_LABEL[c.assignedTeam] ?? c.assignedTeam}</span>
                                ) : null}
                              </div>
                            );
                          })()}
                        </TableCell>
                      ) : null}
                      <TableCell className="py-3" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-2">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="outline"
                                size="icon"
                                aria-label="Update case"
                                className="h-8 w-8 rounded-lg border-border bg-card text-muted-foreground shadow-sm transition-colors hover:bg-muted hover:text-foreground data-[state=open]:bg-muted data-[state=open]:text-foreground"
                              >
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-60 rounded-xl p-1.5 shadow-lg">
                              <DropdownMenuLabel className="px-2 py-1.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                                Update case
                              </DropdownMenuLabel>
                              {canAssign ? (
                                <>
                                  <DropdownMenuItem
                                    onClick={() => openAssignForCase(c)}
                                    disabled={!c.visaCaseId}
                                    className="flex cursor-pointer items-center gap-3 rounded-lg px-2 py-2.5 focus:bg-primary/10"
                                  >
                                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-chart-3/15 text-chart-3">
                                      <UserPlus className="h-4 w-4" />
                                    </span>
                                    <span className="flex flex-col">
                                      <span className="text-sm font-medium text-foreground">
                                        {c.assignedUserId != null ? "Reassign" : "Assign"}
                                      </span>
                                      <span className="text-[11px] text-muted-foreground">Set the handling member</span>
                                    </span>
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator className="my-1" />
                                </>
                              ) : null}
                              {canChangeStatus ? (
                                <>
                                  <DropdownMenuItem
                                    onClick={() => openStatusChange(c)}
                                    className="flex cursor-pointer items-center gap-3 rounded-lg px-2 py-2.5 focus:bg-primary/10"
                                  >
                                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-chart-1/15 text-chart-1">
                                      <ListChecks className="h-4 w-4" />
                                    </span>
                                    <span className="flex flex-col">
                                      <span className="text-sm font-medium text-foreground">Change Status</span>
                                      <span className="text-[11px] text-muted-foreground">Move the processing stage</span>
                                    </span>
                                  </DropdownMenuItem>
                                  {/* Change Decision — temporarily hidden from all users
                                  <DropdownMenuSeparator className="my-1" />
                                  <DropdownMenuItem
                                    onClick={() => openDecisionChange(c)}
                                    className="flex cursor-pointer items-center gap-3 rounded-lg px-2 py-2.5 focus:bg-primary/10"
                                  >
                                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-chart-4/15 text-chart-4">
                                      <Gavel className="h-4 w-4" />
                                    </span>
                                    <span className="flex flex-col">
                                      <span className="text-sm font-medium text-foreground">Change Decision</span>
                                      <span className="text-[11px] text-muted-foreground">Record the embassy outcome</span>
                                    </span>
                                  </DropdownMenuItem>
                                  */}
                                </>
                              ) : null}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </TableCell>
                    </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </div>

        {/* Pagination bar — always visible when there is at least 1 page */}
        {pagination && pagination.total > 0 ? (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border/60 bg-card px-4 py-2.5">

            {/* Left: spacer to balance the right-side page info */}
            <div className="w-24" />

            {/* Center: numbered page buttons (only when >1 page) */}
            {pagination.totalPages > 1 ? (
              <div className="flex items-center gap-1 flex-wrap justify-center">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 w-8 p-0"
                  disabled={pagination.page <= 1 || isFetching}
                  onClick={() => setPage(1)}
                >
                  <ChevronsLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 gap-1 px-2"
                  disabled={pagination.page <= 1 || isFetching}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  <ChevronLeft className="h-4 w-4" />
                  <span className="hidden sm:inline text-xs">Previous</span>
                </Button>

                {(() => {
                  const total = pagination.totalPages;
                  const cur = pagination.page;
                  const pages: (number | "…")[] = [];
                  if (total <= 7) {
                    for (let i = 1; i <= total; i++) pages.push(i);
                  } else {
                    pages.push(1);
                    if (cur > 3) pages.push("…");
                    for (let i = Math.max(2, cur - 1); i <= Math.min(total - 1, cur + 1); i++) pages.push(i);
                    if (cur < total - 2) pages.push("…");
                    pages.push(total);
                  }
                  return pages.map((p, idx) =>
                    p === "…" ? (
                      <span key={`ellipsis-${idx}`} className="px-1 text-xs text-muted-foreground select-none">…</span>
                    ) : (
                      <Button
                        key={p}
                        variant={p === cur ? "default" : "outline"}
                        size="sm"
                        className="h-8 w-8 p-0 text-xs"
                        disabled={isFetching}
                        onClick={() => setPage(p as number)}
                      >
                        {p}
                      </Button>
                    )
                  );
                })()}

                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 gap-1 px-2"
                  disabled={pagination.page >= pagination.totalPages || isFetching}
                  onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
                >
                  <span className="hidden sm:inline text-xs">Next</span>
                  <ChevronRight className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 w-8 p-0"
                  disabled={pagination.page >= pagination.totalPages || isFetching}
                  onClick={() => setPage(pagination.totalPages)}
                >
                  <ChevronsRight className="h-4 w-4" />
                </Button>
              </div>
            ) : null}

            {/* Right: page info */}
            <span className="text-xs tabular-nums text-muted-foreground whitespace-nowrap">
              Page {pagination.page} of {pagination.totalPages}
            </span>
          </div>
        ) : null}
      </div>

      {/* View / Edit dialog */}
      <Dialog open={!!dialogClient} onOpenChange={(o) => { if (!o) { setDialogClient(null); setDraft(null); } }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {dialogMode === "view" ? "Case Details" : "Edit Case"} — {dialogClient?.name}
            </DialogTitle>
          </DialogHeader>

          {draft ? (
            <div className="grid grid-cols-2 gap-4 py-2">
              <Field label="Full Name">
                {dialogMode === "edit" ? (
                  <Input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} className="h-9" />
                ) : (
                  <ReadValue>{draft.name}</ReadValue>
                )}
              </Field>
              <Field label="Passport No.">
                {dialogMode === "edit" ? (
                  <Input value={draft.passport} onChange={(e) => setDraft({ ...draft, passport: e.target.value })} className="h-9" />
                ) : (
                  <ReadValue>{draft.passport}</ReadValue>
                )}
              </Field>
              <Field label="Destination">
                {dialogMode === "edit" ? (
                  <EditSelect value={draft.destination} options={DESTINATIONS} onChange={(v) => setDraft({ ...draft, destination: v })} />
                ) : (
                  <ReadValue>{draft.destination}</ReadValue>
                )}
              </Field>
              <Field label="Travel Reason">
                {dialogMode === "edit" ? (
                  <EditSelect value={draft.travelReason} options={TRAVEL_REASONS} onChange={(v) => setDraft({ ...draft, travelReason: v })} />
                ) : (
                  <ReadValue>{draft.travelReason}</ReadValue>
                )}
              </Field>
              <Field label="Processing Status">
                {dialogMode === "edit" ? (
                  <StatusSelect value={draft.status} onChange={(v) => setDraft({ ...draft, status: v })} scope={statusScope} />
                ) : (
                  <ReadValue>{draft.status}</ReadValue>
                )}
              </Field>
              <Field label="Decision">
                {dialogMode === "edit" ? (
                  <EditSelect value={draft.decision} options={DECISIONS} onChange={(v) => setDraft({ ...draft, decision: v })} />
                ) : (
                  <ReadValue>{draft.decision}</ReadValue>
                )}
              </Field>
              <Field label="Sponsor">
                <ReadValue>{draft.sponsor}</ReadValue>
              </Field>
              <Field label="Balance Due">
                {dialogMode === "edit" ? (
                  <Input
                    type="number"
                    value={draft.balanceDue}
                    onChange={(e) => setDraft({ ...draft, balanceDue: Number(e.target.value) || 0 })}
                    className="h-9"
                  />
                ) : (
                  <ReadValue>{inr(draft.balanceDue)}</ReadValue>
                )}
              </Field>
              <Field label="Counsellor">
                <ReadValue>{draft.counsellor}</ReadValue>
              </Field>
              <Field label="Enrollment Date">
                <ReadValue>{fmtDate(draft.enrollmentDate)}</ReadValue>
              </Field>
              <Field label="Handled By">
                {dialogMode === "edit" ? (
                  <EditSelect value={draft.handledBy} options={["Harsh", "Saurav", "Janak", "Sahid"]} onChange={(v) => setDraft({ ...draft, handledBy: v })} />
                ) : (
                  <ReadValue>{draft.handledBy}</ReadValue>
                )}
              </Field>
            </div>
          ) : null}

          <DialogFooter>
            {dialogMode === "view" ? (
              <>
                <Button variant="outline" onClick={() => { setDialogClient(null); setDraft(null); }}>Close</Button>
                {canEdit ? <Button onClick={() => setDialogMode("edit")}>Edit</Button> : null}
              </>
            ) : (
              <>
                <Button variant="outline" onClick={() => setDialogMode("view")}>Cancel</Button>
                <Button onClick={saveEdit}>Save Changes</Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk-assign dialog (Admin / Developer only) */}
      <Dialog open={assignOpen} onOpenChange={(o) => { if (!o && !assignBusy) setAssignOpen(false); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Assign Selected Cases</DialogTitle>
          </DialogHeader>
          <div className="rounded-md border bg-muted/30 px-3 py-2 text-sm">
            <span className="font-semibold">{selectedCaseIds.size}</span> case
            {selectedCaseIds.size !== 1 ? "s" : ""} selected
          </div>
          <div className="space-y-4 py-2">
            <p className="text-sm text-muted-foreground">
              Choose one CX or Binding member for all selected cases.
            </p>
            <div className="space-y-1.5">
              <Label className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                Backend Team Member
              </Label>
              <Select value={assignUserId || undefined} onValueChange={setAssignUserId} disabled={loadingAssignable}>
                <SelectTrigger className="h-9 w-full">
                  <SelectValue placeholder={loadingAssignable ? "Loading members…" : "Select a CX or Binding member"} />
                </SelectTrigger>
                <SelectContent>
                  {["cx", "binding"].map((team) => {
                    const members = (assignableUsers ?? []).filter((u) => u.role === team);
                    if (!members.length) return null;
                    return (
                      <SelectGroup key={team}>
                        <SelectLabel>{TEAM_LABEL[team] ?? team}</SelectLabel>
                        {members.map((u) => (
                          <SelectItem key={u.id} value={String(u.id)}>
                            {u.fullName}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    );
                  })}
                  {!loadingAssignable && !(assignableUsers ?? []).length ? (
                    <div className="px-2 py-1.5 text-sm text-muted-foreground">No CX or Binding members found.</div>
                  ) : null}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                Notes <span className="normal-case text-muted-foreground/70">(optional)</span>
              </Label>
              <Textarea
                value={assignNotes}
                onChange={(e) => setAssignNotes(e.target.value)}
                placeholder="e.g. Send checklist and collect documents from client"
                className="min-h-[72px]"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAssignOpen(false)} disabled={assignBusy}>
              Cancel
            </Button>
            <Button onClick={runBulkAssign} disabled={!assignUserId || assignBusy}>
              {assignBusy ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Assigning…
                </>
              ) : (
                `Assign (${selectedCaseIds.size})`
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk change-status dialog */}
      <Dialog open={bulkStatusOpen} onOpenChange={(o) => { if (!o && !bulkStatusBusy) { setBulkStatusOpen(false); setBulkStatusStageDraft(""); setBulkStatusDraft(""); setBulkStatusNotes(""); } }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Change Status — {selectedCaseIds.size} Case{selectedCaseIds.size !== 1 ? "s" : ""}</DialogTitle>
          </DialogHeader>
          <div className="rounded-md border bg-muted/30 px-3 py-2 text-sm">
            <span className="font-semibold">{selectedCaseIds.size}</span> case
            {selectedCaseIds.size !== 1 ? "s" : ""} selected — all will be moved to the same status.
          </div>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Stage</Label>
              <Select
                value={bulkStatusStageDraft}
                onValueChange={(v) => { setBulkStatusStageDraft(v); setBulkStatusDraft(""); }}
              >
                <SelectTrigger className="h-9 w-full">
                  <SelectValue placeholder={stagesMeta ? "Select a stage" : "Loading…"} />
                </SelectTrigger>
                <SelectContent>
                  {(stagesMeta?.stages ?? []).map((s) => (
                    <SelectItem key={s.stage} value={s.label}>{s.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {bulkStatusStageDraft && (
              <div className="space-y-2">
                <Label className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Status</Label>
                <Select value={bulkStatusDraft} onValueChange={setBulkStatusDraft}>
                  <SelectTrigger className="h-9 w-full">
                    <SelectValue placeholder="Select a status" />
                  </SelectTrigger>
                  <SelectContent>
                    {(stagesMeta?.stages.find((s) => s.label === bulkStatusStageDraft)?.subStatuses ?? []).map((s) => (
                      <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="space-y-1.5">
              <Label className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                Notes <span className="normal-case text-muted-foreground/70">(optional)</span>
              </Label>
              <Textarea
                value={bulkStatusNotes}
                onChange={(e) => setBulkStatusNotes(e.target.value)}
                placeholder="e.g. Passport copy received"
                className="min-h-[64px]"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBulkStatusOpen(false)} disabled={bulkStatusBusy}>Cancel</Button>
            <Button onClick={saveBulkStatus} disabled={!bulkStatusDraft || bulkStatusBusy}>
              {bulkStatusBusy ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving…
                </>
              ) : (
                `Save (${selectedCaseIds.size})`
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Change-status dialog */}
      <Dialog open={!!statusTarget} onOpenChange={(o) => { if (!o) { setStatusTarget(null); setStatusStageDraft(""); setStatusDraft(""); setStatusNotes(""); setStatusSubmissionDate(""); setStatusDecisionDate(""); } }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Change Status — {statusTarget?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {/* Step 1 — Stage */}
            <div className="space-y-2">
              <Label className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Stage</Label>
              <Select
                value={statusStageDraft}
                onValueChange={(v) => { setStatusStageDraft(v); setStatusDraft(""); setStatusSubmissionDate(""); setStatusDecisionDate(""); }}
              >
                <SelectTrigger className="h-9 w-full">
                  <SelectValue placeholder={stagesMeta ? "Select a stage" : "Loading…"} />
                </SelectTrigger>
                <SelectContent>
                  {(stagesMeta?.stages ?? []).map((s) => (
                    <SelectItem key={s.stage} value={s.label}>{s.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {/* Step 2 — Sub-status (shown only after a stage is selected) */}
            {statusStageDraft && (
              <div className="space-y-2">
                <Label className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Status</Label>
                <Select value={statusDraft} onValueChange={(v) => { setStatusDraft(v); if (v !== "FILE_SUBMITTED") setStatusSubmissionDate(""); }}>
                  <SelectTrigger className="h-9 w-full">
                    <SelectValue placeholder="Select a status" />
                  </SelectTrigger>
                  <SelectContent>
                    {(stagesMeta?.stages.find((s) => s.label === statusStageDraft)?.subStatuses ?? []).map((s) => (
                      <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            {/* Submission date — shown when File Submitted is selected */}
            {statusDraft === "FILE_SUBMITTED" && (
              <div className="space-y-2">
                <Label className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Submission Date</Label>
                <Input
                  type="date"
                  value={statusSubmissionDate}
                  onChange={(e) => setStatusSubmissionDate(e.target.value)}
                  min="2020-01-01"
                  className="h-9"
                />
              </div>
            )}
            {/* Decision date — shown for all Decision stage statuses */}
            {statusStageDraft === "Decision" && statusDraft && (
              <div className="space-y-2">
                <Label className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Decision Date</Label>
                <Input
                  type="date"
                  value={statusDecisionDate}
                  onChange={(e) => setStatusDecisionDate(e.target.value)}
                  min="2020-01-01"
                  className="h-9"
                />
              </div>
            )}
            <div className="space-y-1.5">
              <Label className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                Notes <span className="normal-case text-muted-foreground/70">(optional)</span>
              </Label>
              <Textarea
                value={statusNotes}
                onChange={(e) => setStatusNotes(e.target.value)}
                placeholder="e.g. Passport copy received"
                className="min-h-[64px]"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setStatusTarget(null)} disabled={statusBusy}>Cancel</Button>
            <Button onClick={saveStatus} disabled={!statusDraft || statusDraft === statusTarget?.subStatus || statusBusy}>
              {statusBusy ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving…
                </>
              ) : (
                "Save"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Change-decision dialog */}
      <Dialog open={!!decisionTarget} onOpenChange={(o) => { if (!o) setDecisionTarget(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Change Decision — {decisionTarget?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Decision</Label>
              <Select value={decisionDraft} onValueChange={setDecisionDraft}>
                <SelectTrigger className="h-9 w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DECISIONS.map((d) => (
                    <SelectItem key={d} value={d}>{d}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                Decision Date{" "}
                {decisionDraft !== "Pending" ? (
                  <span className="text-destructive">*</span>
                ) : (
                  <span className="normal-case text-muted-foreground/70">(optional)</span>
                )}
              </Label>
              <Input type="date" value={decisionDecidedOn} onChange={(e) => setDecisionDecidedOn(e.target.value)} className="h-9" />
              {decisionDraft !== "Pending" && !decisionDecidedOn ? (
                <p className="text-[11px] text-destructive">Decision date is required for a final decision.</p>
              ) : null}
            </div>
            <div className="space-y-1.5">
              <Label className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                Remarks <span className="normal-case text-muted-foreground/70">(optional)</span>
              </Label>
              <Textarea
                value={decisionRemarks}
                onChange={(e) => setDecisionRemarks(e.target.value)}
                placeholder="e.g. Visa approved for 5 years"
                className="min-h-[64px]"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDecisionTarget(null)} disabled={decisionBusy}>Cancel</Button>
            <Button onClick={saveDecision} disabled={!decisionDraft || decisionBusy || (decisionDraft !== "Pending" && !decisionDecidedOn)}>
              {decisionBusy ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving…
                </>
              ) : (
                "Save"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => { if (!o) setDeleteTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Archive this case?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget ? `${deleteTarget.name} (${deleteTarget.passport}) will be archived from the list.` : ""}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete}>Archive</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </PageWrapper>
  );
}

/* ---------- small helpers ---------- */

function FilterChip({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: string[] }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{label}</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className={cn("h-9 w-[170px]", value !== "all" && "border-primary/40 bg-primary/5 text-primary")}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All</SelectItem>
          {options.map((o) => (
            <SelectItem key={o} value={o}>{o}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

/** Processing-status select, grouped by high-level stage (Documentation, Financial Assessment, …). */
function StatusSelect({
  value,
  onChange,
  includeAll,
  className,
  scope = "all",
}: {
  value: string;
  onChange: (v: string) => void;
  includeAll?: boolean;
  className?: string;
  scope?: "all" | "documentation";
}) {
  // CX Team can only set Documentation sub-statuses; Backend can set any.
  const groups =
    scope === "documentation"
      ? BACKEND_PROCESSING_STATUS_GROUPS.filter((g) => g.stage === "Documentation")
      : BACKEND_PROCESSING_STATUS_GROUPS;
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className={cn("h-9", className, includeAll && value !== "all" && "border-primary/40 bg-primary/5 text-primary")}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {includeAll ? <SelectItem value="all">All</SelectItem> : null}
        {groups.map((g) => (
          <SelectGroup key={g.stage}>
            <SelectLabel>{g.stage}</SelectLabel>
            {g.statuses.map((s) => (
              <SelectItem key={s} value={s}>{s}</SelectItem>
            ))}
          </SelectGroup>
        ))}
      </SelectContent>
    </Select>
  );
}

const STAGE_COLORS: Record<string, { dot: string; text: string; bg: string; border: string }> = {
  "Documentation":        { dot: "bg-blue-500",    text: "text-blue-600 dark:text-blue-400",     bg: "bg-blue-50 dark:bg-blue-500/10",     border: "border-l-blue-500" },
  "Financial Assessment": { dot: "bg-violet-500",  text: "text-violet-600 dark:text-violet-400", bg: "bg-violet-50 dark:bg-violet-500/10", border: "border-l-violet-500" },
  "Case Preparation":     { dot: "bg-amber-500",   text: "text-amber-600 dark:text-amber-400",   bg: "bg-amber-50 dark:bg-amber-500/10",   border: "border-l-amber-500" },
  "Filing Preparation":   { dot: "bg-emerald-500", text: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-50 dark:bg-emerald-500/10", border: "border-l-emerald-500" },
  "Submission":           { dot: "bg-sky-500",     text: "text-sky-600 dark:text-sky-400",       bg: "bg-sky-50 dark:bg-sky-500/10",       border: "border-l-sky-500" },
  "Decision":             { dot: "bg-rose-500",    text: "text-rose-600 dark:text-rose-400",     bg: "bg-rose-50 dark:bg-rose-500/10",     border: "border-l-rose-500" },
  "Refiling":             { dot: "bg-orange-500",  text: "text-orange-600 dark:text-orange-400", bg: "bg-orange-50 dark:bg-orange-500/10", border: "border-l-orange-500" },
  "On Hold":              { dot: "bg-teal-500",    text: "text-teal-600 dark:text-teal-400",     bg: "bg-teal-50 dark:bg-teal-500/10",     border: "border-l-teal-500" },
  "Client Drop":          { dot: "bg-pink-500",    text: "text-pink-600 dark:text-pink-400",     bg: "bg-pink-50 dark:bg-pink-500/10",     border: "border-l-pink-500" },
};

/** Compact status: sub-status as the primary line, stage as a small muted caption. */
function StatusCell({
  status,
  handedOff = false,
  assignedTeam,
}: {
  status: string;
  handedOff?: boolean;
  assignedTeam?: string | null;
}) {
  const stage = stageOfStatus(status);
  const detail = status.includes(":") ? status.slice(status.indexOf(":") + 1).trim() : "";
  const teamLabel = assignedTeam ? (TEAM_LABEL[assignedTeam] ?? assignedTeam) : "Binding";
  return (
    <div className="flex max-w-[230px] items-start gap-2">
      <div className="flex flex-col gap-1 leading-tight">
        <span className="text-sm font-medium text-foreground">{detail || stage}</span>
        {detail ? <span className="text-[11px] text-muted-foreground">{stage}</span> : null}
        {handedOff ? (
          <span className="text-[11px] font-medium text-primary">Now with {teamLabel}</span>
        ) : null}
      </div>
    </div>
  );
}

function HandoffBadge({ team }: { team: string }) {
  const label = TEAM_LABEL[team] ?? team;
  return (
    <Badge
      variant="outline"
      className="w-fit gap-1 border-primary/30 bg-primary/10 text-[10px] font-medium text-primary"
    >
      <ArrowRightLeft className="h-3 w-3" />
      Handed to {label}
    </Badge>
  );
}

function DecisionBadge({ decision }: { decision: string }) {
  // Theme-only styling: Approved emphasized in primary, others neutral.
  const isApproved = decision === "Approved";
  return (
    <Badge
      variant="outline"
      className={cn(
        "whitespace-nowrap font-medium",
        isApproved ? "border-primary/30 bg-primary/10 text-primary" : "border-border bg-muted/40 text-muted-foreground"
      )}
    >
      {decision}
    </Badge>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <Label className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}

function ReadValue({ children }: { children: React.ReactNode }) {
  return <p className="text-sm font-medium text-foreground">{children}</p>;
}

function EditSelect({ value, options, onChange }: { value: string; options: string[]; onChange: (v: string) => void }) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="h-9">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {options.map((o) => (
          <SelectItem key={o} value={o}>{o}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
