import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "wouter";
import { useLeadSocketRefresh } from "@/hooks/use-lead-socket";
import { format } from "date-fns";

import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/context/auth-context";
import { Breadcrumbs } from "@/layout/Breadcrumbs";

import { Button } from "@/components/ui/button";
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
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import DateRangePicker from "@/components/payments/DateRangePicker";
import { AddLead } from "@/components/add-lead";

import {
  Phone,
  Tag,
  X,
  Calendar,
  UserCircle2,
  Plus,
  Send,
  ChevronLeft,
  ChevronRight,
  Star,
} from "lucide-react";

import api from "@/lib/api";
import { cn } from "@/lib/utils";
import { getLeadDisplayTags, mergeLeadRow } from "@/lib/lead-status-tags";
import {
  applyLeadListPatches,
  consumeLeadListPatches,
  extractLeadFromSocketPayload,
} from "@/lib/lead-list-sync";
import { getLeadSourceLabel } from "@/lib/lead-source-display";
import {
  getLeadReferenceDisplayLabel,
  leadHasReferenceSource,
} from "@/lib/lead-reference-display";
import { Badge } from "@/components/ui/badge";

import { getLeads, type LeadEntity } from "@/api/leads.api";
import { getLeadDateBounds, type LeadDateFilterType } from "@/lib/lead-date-range";

type LeadType = { id: number; leadType: string; displayAlias?: string | null };
type SaleType = { id: number; saleType: string };
type Telecaller = { id: number; fullName: string };
const PROGRESS_STATUS_OPTIONS = [
  { value: "not_contacted", label: "Not Contacted" },
  { value: "in_progress", label: "In Progress" },
  { value: "follow_up", label: "Follow Up" },
  { value: "converted", label: "Converted" },
  { value: "dropped", label: "Drop" },
] as const;

type CounsellorListFilter = (typeof PROGRESS_STATUS_OPTIONS)[number]["value"];

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];

const LEAD_QUALITY_LABELS: Record<string, string> = {
  excellent: "Excellent",
  good: "Good",
  average: "Average",
  bad: "Bad",
};

const DATE_FILTER_LABELS: Record<LeadDateFilterType, string> = {
  all: "All", today: "Today", weekly: "Weekly", monthly: "Monthly", custom: "Custom",
};

const COUNSELLOR_FILTER_KEY = "counsellor_leads_filters";

function readCounsellorFilters(): Record<string, unknown> {
  try {
    const raw = sessionStorage.getItem(COUNSELLOR_FILTER_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch { return {}; }
}

export default function CounsellorLeadsPage() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const [leads, setLeads] = useState<LeadEntity[]>([]);
  const [loading, setLoading] = useState(false);

  // Filters — restored from sessionStorage on mount
  const [search, setSearch] = useState(() => String(readCounsellorFilters().search ?? ""));
  const [filterLeadSource, setFilterLeadSource] = useState(() => String(readCounsellorFilters().filterLeadSource ?? ""));
  const [filterLeadType, setFilterLeadType] = useState(() => String(readCounsellorFilters().filterLeadType ?? ""));
  const [filterProgressStatus, setFilterProgressStatus] = useState(() => String(readCounsellorFilters().filterProgressStatus ?? ""));
  const [filterAssignedBy, setFilterAssignedBy] = useState(() => String(readCounsellorFilters().filterAssignedBy ?? "")); // telecaller ID

  // Date filter
  const [dateFilter, setDateFilter] = useState<LeadDateFilterType>(() => {
    const stored = readCounsellorFilters().dateFilter as LeadDateFilterType;
    // "all" is not a restorable choice — page always defaults to "weekly"
    return (["today", "weekly", "monthly", "custom"] as const).includes(stored) ? stored : "weekly";
  });
  const [page, setPage] = useState(() => {
    const n = Number(readCounsellorFilters().page);
    return Number.isFinite(n) && n > 0 ? n : 1;
  });
  const [pageSize, setPageSize] = useState(() => {
    const n = Number(readCounsellorFilters().pageSize);
    return Number.isFinite(n) && n > 0 ? n : 25;
  });
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 25,
    total: 0,
    totalPages: 1,
  });
  const [customDateFrom, setCustomDateFrom] = useState<string | undefined>(() =>
    readCounsellorFilters().customDateFrom as string | undefined
  );
  const [customDateTo, setCustomDateTo] = useState<string | undefined>(() =>
    readCounsellorFilters().customDateTo as string | undefined
  );
  const [showDatePicker, setShowDatePicker] = useState(false);

  // Reference data
  const [telecallers, setTelecallers] = useState<Telecaller[]>([]);
  const [leadTypes, setLeadTypes] = useState<LeadType[]>([]);
  const [saleTypes, setSaleTypes] = useState<SaleType[]>([]);

  const [isAddLeadOpen, setIsAddLeadOpen] = useState(false);

  const loadLeadsRef = useRef<() => Promise<void>>(async () => {});

  const rangeParams = useMemo(() => {
    const bounds = getLeadDateBounds(dateFilter, customDateFrom, customDateTo);
    if (!bounds) return {};
    if (filterProgressStatus === "follow_up") {
      return {
        nextFollowupFrom: bounds.from.toISOString(),
        nextFollowupTo: bounds.to.toISOString(),
      };
    }
    return {
      createdFrom: bounds.from.toISOString(),
      createdTo: bounds.to.toISOString(),
    };
  }, [dateFilter, customDateFrom, customDateTo, filterProgressStatus]);

  useEffect(() => {
    setPage(1);
  }, [
    search,
    filterLeadSource,
    filterLeadType,
    filterProgressStatus,
    filterAssignedBy,
    dateFilter,
    customDateFrom,
    customDateTo,
  ]);

  const activeFilterCount = [
    filterLeadSource,
    filterLeadType,
    filterProgressStatus,
    filterAssignedBy,
    dateFilter !== "weekly" && dateFilter !== "all" ? "date" : "",
  ].filter(Boolean).length;

  // ── Data loading ───────────────────────────────────────────────
  const loadLeads = useCallback(async () => {
    if (!user?.id) return;
    try {
      setLoading(true);
      const res = await getLeads({
        currentCounsellorId: Number(user.id),
        search: search.trim().length >= 3 ? search.trim() : undefined,
        counsellorListFilter: filterProgressStatus
          ? (filterProgressStatus as CounsellorListFilter)
          : undefined,
        leadSource: filterLeadSource || undefined,
        leadType: filterLeadType || undefined,
        isJunk: false,
        ...rangeParams,
        page,
        limit: pageSize,
        sortBy: "updated_at",
        sortOrder: "desc",
      });
      let items = applyLeadListPatches(res.items || [], consumeLeadListPatches());
      if (filterAssignedBy) {
        if (filterAssignedBy === "__direct__") {
          items = items.filter((l) => !l.currentTelecallerId);
        } else {
          items = items.filter((l) => String(l.currentTelecallerId) === filterAssignedBy);
        }
      }
      setLeads(items);
      setPagination(
        res.pagination ?? {
          page,
          limit: pageSize,
          total: items.length,
          totalPages: 1,
        }
      );
    } catch {
      toast({ title: "Error", description: "Failed to load leads", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [
    user?.id,
    search,
    filterProgressStatus,
    filterLeadSource,
    filterLeadType,
    filterAssignedBy,
    rangeParams,
    page,
    pageSize,
    toast,
  ]);

  const loadRefData = useCallback(async () => {
    try {
      const [tRes, ltRes, stRes] = await Promise.all([
        api.get("/api/users/telecallers"),
        api.get("/api/lead-types"),
        api.get("/api/sale-types"),
      ]);
      setTelecallers(tRes?.data?.data || tRes?.data || []);
      setLeadTypes(ltRes?.data?.data || ltRes?.data || []);
      setSaleTypes(stRes?.data?.data || stRes?.data || []);
    } catch { /* non-critical */ }
  }, []);

  useEffect(() => {
    loadLeadsRef.current = loadLeads;
  }, [loadLeads]);

  const counsellorId = user?.id;
  useLeadSocketRefresh({
    enabled: counsellorId != null,
    queryKeys: [],
    onLeadEvent: (event, payload) => {
      const myId = Number(user?.id);
      if (!myId) return;

      if (event === "lead:transferred:notify") {
        const n = payload as { counsellorId?: number; lead?: LeadEntity };
        if (n.counsellorId !== myId || !n.lead) return;
        toast({
          title: "New lead transferred to you",
          description: `${n.lead.fullName} · ${n.lead.phone}`,
        });
        setLeads((prev) => {
          if (prev.some((l) => l.id === n.lead!.id)) {
            return prev.map((l) => (l.id === n.lead!.id ? mergeLeadRow(l, n.lead!) : l));
          }
          void loadLeadsRef.current();
          return prev;
        });
        return;
      }

      const lead = extractLeadFromSocketPayload(payload);
      if (lead && Number(lead.currentCounsellorId) === myId) {
        setLeads((prev) => {
          const idx = prev.findIndex((l) => l.id === lead.id);
          if (idx < 0) {
            void loadLeadsRef.current();
            return prev;
          }
          const patch: Partial<LeadEntity> = { ...lead };
          if (event === "lead:followup") {
            patch.progressStatus = "follow_up";
            patch.pendingFollowUp = true;
          }
          const next = [...prev];
          next[idx] = mergeLeadRow(prev[idx], patch);
          return next;
        });
        return;
      }

      if (
        [
          "lead:followup",
          "lead:updated",
          "lead:assigned",
          "lead:bulk_assigned",
          "lead:converted",
          "lead:dropped",
          "lead:activity_updated",
        ].includes(event)
      ) {
        void loadLeadsRef.current();
      }
    },
  });

  useEffect(() => { void loadLeads(); }, [loadLeads]);
  useEffect(() => { void loadRefData(); }, [loadRefData]);

  // Persist filter state to sessionStorage whenever any filter changes
  useEffect(() => {
    try {
      sessionStorage.setItem(COUNSELLOR_FILTER_KEY, JSON.stringify({
        search,
        filterLeadSource,
        filterLeadType,
        filterProgressStatus,
        filterAssignedBy,
        dateFilter,
        customDateFrom,
        customDateTo,
        page,
        pageSize,
      }));
    } catch {}
  }, [
    search, filterLeadSource, filterLeadType, filterProgressStatus,
    filterAssignedBy, dateFilter, customDateFrom, customDateTo, page, pageSize,
  ]);

  /** "Added directly" only when this counsellor created the lead (assignedBy = self). */
  const getFromLabel = (lead: LeadEntity): string | null => {
    if (lead.assignedBy === user?.id) return "Added directly";
    if (lead.currentTelecallerId) {
      const tc = telecallers.find((t) => t.id === lead.currentTelecallerId);
      return tc ? `From: ${tc.fullName}` : `From: TC #${lead.currentTelecallerId}`;
    }
    return null;
  };

  // ── Filter helpers ─────────────────────────────────────────────
  const clearFilters = () => {
    setFilterLeadSource("");
    setFilterLeadType("");
    setFilterProgressStatus("");
    setFilterAssignedBy("");
    setSearch("");
    setDateFilter("all");
    setCustomDateFrom(undefined);
    setCustomDateTo(undefined);
  };

  const customLabel =
    dateFilter === "custom" && customDateFrom && customDateTo
      ? `${format(new Date(customDateFrom), "d MMM")} – ${format(new Date(customDateTo), "d MMM yyyy")}`
      : null;

  return (
    <div className="space-y-5">
      <Breadcrumbs items={[{ label: "Leads" }, { label: "My Leads" }]} />

      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <h1 className="text-2xl font-bold">My Leads</h1>
        <Button onClick={() => setIsAddLeadOpen(true)} className="gap-1.5">
          <Plus className="w-4 h-4" />
          Add Lead
        </Button>
      </div>

      {/* ── Filter Panel ───────────────────────────────────── */}
      <div className="rounded-xl border border-border bg-card shadow-sm p-4 space-y-4">

        {/* Row 1: Search + Date Filter */}
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap gap-2 items-center">
            <Input
              placeholder="Search by name, phone…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              onKeyDown={e => e.key === "Enter" && void loadLeads()}
              className="w-full sm:w-72 h-9"
            />
            <Button variant="outline" size="sm" onClick={() => void loadLeads()} className="h-9">
              Search
            </Button>
            {activeFilterCount > 0 && (
              <Button variant="ghost" size="sm" onClick={clearFilters} className="h-9 gap-1.5 text-muted-foreground">
                <X className="w-3.5 h-3.5" />
                Clear
                <Badge variant="secondary" className="ml-0.5 text-xs px-1.5">{activeFilterCount}</Badge>
              </Button>
            )}
          </div>

          {/* Date filter */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-medium text-muted-foreground">Created:</span>
            <div className="flex rounded-lg border border-border bg-muted/30 p-0.5 gap-0.5">
              {(["all", "today", "weekly", "monthly"] as const).map(f => (
                <button
                  key={f}
                  onClick={() => { setDateFilter(f); setCustomDateFrom(undefined); setCustomDateTo(undefined); }}
                  className={cn(
                    "px-3 py-1 text-xs font-medium rounded-md transition-colors",
                    dateFilter === f ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground hover:bg-background"
                  )}
                >{DATE_FILTER_LABELS[f]}</button>
              ))}
              <button
                onClick={() => setShowDatePicker(true)}
                className={cn(
                  "px-3 py-1 text-xs font-medium rounded-md flex items-center gap-1",
                  dateFilter === "custom" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground hover:bg-background"
                )}
              >
                {customLabel ?? "Custom"}<Calendar className="w-3 h-3" />
              </button>
            </div>
          </div>
        </div>

        {/* Row 2: Dropdown filters */}
        <div className="flex flex-wrap gap-2">
          <Select value={filterLeadSource} onValueChange={setFilterLeadSource}>
            <SelectTrigger className="h-9 w-40 text-xs"><SelectValue placeholder="Lead Source" /></SelectTrigger>
            <SelectContent className="max-h-64 overflow-y-auto">
              {leadTypes.map((lt) => (
                <SelectItem key={lt.id} value={lt.leadType}>
                  {getLeadSourceLabel(lt.leadType, leadTypes)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={filterLeadType} onValueChange={setFilterLeadType}>
            <SelectTrigger className="h-9 w-40 text-xs"><SelectValue placeholder="Lead Type" /></SelectTrigger>
            <SelectContent className="max-h-64 overflow-y-auto">
              {saleTypes.map(st => <SelectItem key={st.id} value={st.saleType}>{st.saleType}</SelectItem>)}
            </SelectContent>
          </Select>

          <Select value={filterProgressStatus} onValueChange={setFilterProgressStatus}>
            <SelectTrigger className="h-9 w-40 text-xs"><SelectValue placeholder="Progress" /></SelectTrigger>
            <SelectContent>
              {PROGRESS_STATUS_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
            </SelectContent>
          </Select>

          {/* Assigned By — which telecaller transferred the lead */}
          <Select value={filterAssignedBy} onValueChange={setFilterAssignedBy}>
            <SelectTrigger className="h-9 w-44 text-xs"><SelectValue placeholder="Assigned By" /></SelectTrigger>
            <SelectContent className="max-h-64 overflow-y-auto">
              <SelectItem value="__direct__">Added Directly</SelectItem>
              {telecallers.map(t => <SelectItem key={t.id} value={String(t.id)}>{t.fullName}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        {!loading && (
          <p className="text-xs text-muted-foreground">
            {pagination.total > 0 ? (
              <>
                Showing{" "}
                <span className="font-semibold text-foreground">
                  {(pagination.page - 1) * pagination.limit + 1}–
                  {Math.min(pagination.page * pagination.limit, pagination.total)}
                </span>{" "}
                of <span className="font-semibold text-foreground">{pagination.total}</span> lead
                {pagination.total !== 1 ? "s" : ""}
              </>
            ) : (
              "No leads"
            )}
            {activeFilterCount > 0 ? " (filtered)" : ""}
          </p>
        )}
      </div>

      {/* ── Lead Table ─────────────────────────────────────────── */}
      <div>
        {loading ? (
          <Card>
            <CardContent className="p-6 text-sm text-muted-foreground">Loading leads…</CardContent>
          </Card>
        ) : leads.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center text-sm text-muted-foreground">
              No leads found
              {activeFilterCount > 0 && (
                <button onClick={clearFilters} className="block mx-auto mt-2 text-primary hover:underline text-xs">
                  Clear filters
                </button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
            <div className="overflow-hidden">
              <Table className="table-fixed w-full border-separate border-spacing-y-2 [&_td]:overflow-hidden [&_td]:py-3 [&_th]:h-8">
                <TableHeader>
                  <TableRow className="bg-muted/40 hover:bg-muted/40">
                    <TableHead className="w-[22%]">Name</TableHead>
                    <TableHead className="w-[17%]">Mobile Number</TableHead>
                    <TableHead className="w-[15%]">Lead Type</TableHead>
                    <TableHead className="w-[15%]">Lead Source</TableHead>
                    <TableHead className="w-[12%]">Quality</TableHead>
                    <TableHead className="w-[18%]">Transferred From</TableHead>
                    <TableHead className="w-[14%] text-right">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {leads.map((lead) => {
                    const statusTags = getLeadDisplayTags(lead, "counsellor", {
                      pendingFollowUp: lead.pendingFollowUp,
                    });
                    return (
                      <TableRow
                        key={lead.id}
                        className="cursor-pointer border-0 transition-colors hover:[&>td]:bg-muted/40 [&>td]:border-y [&>td]:bg-card [&>td:first-child]:rounded-l-xl [&>td:first-child]:border-l [&>td:last-child]:rounded-r-xl [&>td:last-child]:border-r"
                        onClick={() => setLocation(`/leads/${lead.id}`)}
                      >
                        <TableCell className="py-2">
                          <div className="flex min-w-0 items-center gap-3">
                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                              {lead.fullName?.charAt(0)?.toUpperCase() || "L"}
                            </div>
                            <span
                              className="block min-w-0 truncate font-semibold text-foreground"
                              title={lead.fullName || undefined}
                            >
                              {lead.fullName || "—"}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="py-2">
                          <span className="flex min-w-0 items-center gap-1 text-sm" title={lead.phone || undefined}>
                            <Phone className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                            <span className="block min-w-0 truncate">{lead.phone || "—"}</span>
                          </span>
                        </TableCell>
                        <TableCell className="py-2">
                          <span className="flex min-w-0 items-center gap-1 text-sm" title={lead.leadType || undefined}>
                            <Tag className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                            <span className="block min-w-0 truncate">{lead.leadType || "—"}</span>
                          </span>
                        </TableCell>
                        <TableCell className="py-2">
                          <div className="min-w-0">
                            <span
                              className="flex min-w-0 items-center gap-1 text-sm"
                              title={lead.leadSource ? getLeadSourceLabel(lead.leadSource, leadTypes) : undefined}
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
                        <TableCell className="py-2">
                          <span
                            className="flex min-w-0 items-center gap-1 text-sm"
                            title={lead.leadQuality ? LEAD_QUALITY_LABELS[lead.leadQuality] ?? lead.leadQuality : undefined}
                          >
                            <Star className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                            <span className="block min-w-0 truncate">
                              {lead.leadQuality ? LEAD_QUALITY_LABELS[lead.leadQuality] ?? lead.leadQuality : "—"}
                            </span>
                          </span>
                        </TableCell>
                        <TableCell className="py-2">
                          <span
                            className="flex min-w-0 items-center gap-1 text-sm"
                            title={getFromLabel(lead)?.replace(/^From:\s*/, "") || undefined}
                          >
                            <UserCircle2 className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                            <span className="block min-w-0 truncate">
                              {getFromLabel(lead)?.replace(/^From:\s*/, "") || "—"}
                            </span>
                          </span>
                        </TableCell>
                        <TableCell className="py-2 text-right">
                          <div className="flex min-w-0 items-center justify-end gap-1.5 overflow-hidden">
                            {statusTags.map((tag) => (
                              <Badge
                                key={tag.key}
                                className={cn("h-5 max-w-full truncate border-0 text-[10px] font-normal", tag.className)}
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
            {!loading && pagination.totalPages > 1 && (
              <div className="flex flex-wrap items-center justify-between gap-3 border-t px-4 py-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">Per page</span>
                  <Select
                    value={String(pageSize)}
                    onValueChange={(v) => {
                      setPageSize(Number(v));
                      setPage(1);
                    }}
                  >
                    <SelectTrigger className="h-8 w-[72px] text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PAGE_SIZE_OPTIONS.map((n) => (
                        <SelectItem key={n} value={String(n)}>
                          {n}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page <= 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Previous
                  </Button>
                  <span className="text-xs text-muted-foreground">
                    Page {pagination.page} of {pagination.totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page >= pagination.totalPages}
                    onClick={() => setPage((p) => p + 1)}
                  >
                    Next
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <AddLead open={isAddLeadOpen} onOpenChange={setIsAddLeadOpen} onLeadAdded={loadLeads} />

      {/* ── Date Range Picker ────────────────────────────────────── */}
      <Dialog open={showDatePicker} onOpenChange={setShowDatePicker}>
        <DialogContent className="p-0 max-w-[800px] overflow-hidden rounded-xl border-0">
          <DialogTitle className="sr-only">Select Date Range</DialogTitle>
          <DateRangePicker
            onApply={(_, s, e) => {
              if (s && e) { setCustomDateFrom(s); setCustomDateTo(e); setDateFilter("custom"); }
              setShowDatePicker(false);
            }}
            onCancel={() => setShowDatePicker(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
