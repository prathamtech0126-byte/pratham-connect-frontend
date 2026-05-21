import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useSearch } from "wouter";
import { endOfDay, startOfDay, startOfMonth } from "date-fns";
import {
  ArrowLeft,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Pencil,
  TrendingUp,
  FileText,
  UserCheck,
  Users,
  X,
} from "lucide-react";

import { PageWrapper } from "@/layout/PageWrapper";
import { useToast } from "@/hooks/use-toast";
import api from "@/lib/api";
import { LeadTypeSelectWithCustom } from "@/components/leads/LeadTypeSelectWithCustom";
import {
  buildLeadTypeApiFields,
  isLeadTypeSelectionValid,
} from "@/lib/lead-type-selection";
import {
  distributeFacebookManualBulk,
  getFacebookManualDistributionLeads,
  getFormsWithUnassignedLeads,
  getSaleTypes,
  type FormWithLeads,
  type ManualDistributionPagedLead,
  type SaleType,
} from "@/api/leadAutomation.api";
import type { PaymentsFilter } from "@/api/payments.api";
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
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import DateRangePicker from "@/components/payments/DateRangePicker";

type TeamMember = { id: number; name: string };

async function fetchTelecallers(): Promise<TeamMember[]> {
  const res = await api.get("/api/users/telecallers");
  return (res.data.data || []).map((u: { id: number; fullName?: string; full_name?: string; name?: string; username?: string }) => ({
    id: Number(u.id),
    name: u.fullName || u.full_name || u.name || u.username || "Unknown",
  }));
}

async function fetchCounsellors(): Promise<TeamMember[]> {
  const res = await api.get("/api/users/counsellors");
  return (res.data.data || []).map((u: { id: number; fullName?: string; full_name?: string; name?: string; username?: string }) => ({
    id: Number(u.id),
    name: u.fullName || u.full_name || u.name || u.username || "Unknown",
  }));
}

function MemberRow({
  member,
  checked,
  onToggle,
  color,
  isPriority,
  savedPriority,
  onSetPriority,
}: {
  member: TeamMember;
  checked: boolean;
  onToggle: () => void;
  color: "blue" | "purple";
  isPriority: boolean;
  savedPriority?: number;
  onSetPriority: (val: number) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [inputVal, setInputVal] = useState(savedPriority ? String(savedPriority) : "");
  const { toast } = useToast();
  const bg = color === "blue" ? "bg-blue-50 border-blue-200" : "bg-purple-50 border-purple-200";
  const neutral = "bg-muted/10 border-transparent hover:border-border";

  const handleSet = () => {
    const n = parseInt(inputVal, 10);
    if (isNaN(n) || n < 1 || n > 99) {
      toast({ title: "Invalid priority", description: "Enter a number between 1 and 99.", variant: "destructive" });
      return;
    }
    onSetPriority(n);
    setEditing(false);
  };

  return (
    <div className={`flex items-center gap-2 p-2 rounded-lg border transition-all ${checked ? bg : neutral}`}>
      <Checkbox id={`md-${color}-${member.id}`} checked={checked} onCheckedChange={() => onToggle()} />
      <label htmlFor={`md-${color}-${member.id}`} className="text-sm font-medium flex-1 cursor-pointer min-w-0 truncate">
        {member.name}
      </label>
      {isPriority && checked && (
        <div className="flex items-center gap-1 shrink-0">
          {editing || !savedPriority ? (
            <>
              <Input type="number" min={1} max={99} className="h-7 w-14 text-xs px-2" placeholder="1–99" value={inputVal} onChange={(e) => setInputVal(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleSet()} />
              <Button size="sm" variant="outline" className="h-7 text-[10px] px-2" onClick={handleSet}>
                Set
              </Button>
              {savedPriority ? (
                <Button size="sm" variant="ghost" className="h-7 text-[10px] px-1" onClick={() => setEditing(false)}>
                  ✕
                </Button>
              ) : null}
            </>
          ) : (
            <>
              <span className="text-xs font-bold text-amber-600 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded">{savedPriority}</span>
              <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => { setInputVal(String(savedPriority)); setEditing(true); }}>
                <Pencil className="h-3 w-3 text-muted-foreground" />
              </Button>
            </>
          )}
        </div>
      )}
    </div>
  );
}

const STRATEGY_OPTIONS = [
  { value: "round_robin", label: "Round Robin", description: "Leads rotate equally in strict sequence." },
  { value: "least_loaded", label: "Least Loaded", description: "Assigns to person with fewest leads today." },
  { value: "priority_weighted", label: "Priority Weighted", description: "Weight controls leads per rotation." },
  { value: "performance_based", label: "Performance Based", description: "Round-robin with performance scoring." },
];

type DateTab = "all" | "today" | "monthly" | "custom";

function computeDates(
  tab: DateTab,
  startDate?: string,
  endDate?: string
): { from: string; to: string } {
  switch (tab) {
    case "today":
      return {
        from: startOfDay(new Date()).toISOString(),
        to: endOfDay(new Date()).toISOString(),
      };
    case "monthly":
      return {
        from: startOfMonth(new Date()).toISOString(),
        to: endOfDay(new Date()).toISOString(),
      };
    case "custom":
      if (!startDate || !endDate) return { from: "", to: "" };
      return {
        from: startOfDay(new Date(startDate)).toISOString(),
        to: endOfDay(new Date(endDate)).toISOString(),
      };
    default:
      return { from: "", to: "" };
  }
}

const PAGE_SIZE_OPTIONS = [20, 50, 100];

// ── Main component ─────────────────────────────────────────────────────────────

export default function FacebookManualDistribution() {
  const [, setLocation] = useLocation();
  const search = useSearch();
  const { toast } = useToast();

  const qs = useMemo(
    () => new URLSearchParams(search.startsWith("?") ? search.slice(1) : search),
    [search]
  );

  const [formFilter, setFormFilter] = useState(() => qs.get("formId") || "");

  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [customLimitInput, setCustomLimitInput] = useState("");
  const [isCustomLimit, setIsCustomLimit] = useState(false);

  // Optional date filter (default: all time — list is always unassigned only)
  const [dateTab, setDateTab] = useState<DateTab>("all");
  const [fromIso, setFromIso] = useState<string>("");
  const [toIso, setToIso] = useState<string>("");
  const [customLabel, setCustomLabel] = useState<string>("");
  const [datePickerOpen, setDatePickerOpen] = useState(false);

  const [formsWithLeads, setFormsWithLeads] = useState<FormWithLeads[]>([]);

  const [payload, setPayload] = useState<{
    data: ManualDistributionPagedLead[];
    total: number;
    totalPages: number;
  } | null>(null);
  const [loading, setLoading] = useState(true);

  // Selection persists across page changes
  const [selected, setSelected] = useState<Set<number>>(new Set());

  // Distribution step
  const [step, setStep] = useState<1 | 2>(1);
  const [strategy, setStrategy] = useState("round_robin");
  const [selectedLeadType, setSelectedLeadType] = useState("");
  const [customLeadTypeName, setCustomLeadTypeName] = useState("");
  const [saleTypes, setSaleTypes] = useState<SaleType[]>([]);
  const [tcs, setTcs] = useState<Set<number>>(new Set());
  const [cos, setCos] = useState<Set<number>>(new Set());
  const [weights, setWeights] = useState<Record<string, number>>({});
  const [distributing, setDistributing] = useState(false);

  const [telecallers, setTelecallers] = useState<TeamMember[]>([]);
  const [counsellors, setCounsellors] = useState<TeamMember[]>([]);

  const isPriority = strategy === "priority_weighted";

  const allTcsSelected = telecallers.length > 0 && tcs.size === telecallers.length;
  const allCosSelected = counsellors.length > 0 && cos.size === counsellors.length;

  // Track page leads for "select page" without clearing cross-page selections
  const currentPageIdsRef = useRef<number[]>([]);

  const loadLeads = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getFacebookManualDistributionLeads({
        page,
        limit,
        assignment: "unassigned",
        formId: formFilter || undefined,
        createdFrom: fromIso || undefined,
        createdTo: toIso || undefined,
      });
      setPayload({ data: res.data, total: res.total, totalPages: res.totalPages });
      currentPageIdsRef.current = res.data.map((l) => l.id);
    } catch {
      toast({ title: "Failed to load leads", variant: "destructive" });
      setPayload(null);
    } finally {
      setLoading(false);
    }
  }, [formFilter, fromIso, limit, page, toast, toIso]);

  useEffect(() => {
    void loadLeads();
  }, [loadLeads]);

  // Sync formId from URL (?formId=)
  useEffect(() => {
    const next = new URLSearchParams(search.startsWith("?") ? search.slice(1) : search);
    setFormFilter(next.get("formId") || "");
  }, [search]);

  useEffect(() => {
    let cancelled = false;
    getFormsWithUnassignedLeads().then((f) => { if (!cancelled) setFormsWithLeads(f); });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    let cancelled = false;
    getSaleTypes().then((types) => { if (!cancelled) setSaleTypes(types); });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    let cancelled = false;
    Promise.all([fetchTelecallers(), fetchCounsellors()]).then(([tc, co]) => {
      if (!cancelled) {
        setTelecallers(tc);
        setCounsellors(co);
      }
    });
    return () => { cancelled = true; };
  }, []);

  // Reset to page 1 when filters change
  useEffect(() => {
    setPage(1);
  }, [formFilter, fromIso, toIso, limit]);

  const applyDateTab = (tab: DateTab) => {
    setDateTab(tab);
    if (tab === "custom") {
      setDatePickerOpen(true);
      return;
    }
    const { from, to } = computeDates(tab);
    setFromIso(from);
    setToIso(to);
    setCustomLabel("");
  };

  const handleDatePickerApply = (filter: PaymentsFilter, startDate?: string, endDate?: string) => {
    setDatePickerOpen(false);
    if (filter === "maximum") {
      setDateTab("all");
      setFromIso("");
      setToIso("");
      setCustomLabel("");
      return;
    }
    if (filter === "today") {
      setDateTab("today");
      const { from, to } = computeDates("today");
      setFromIso(from);
      setToIso(to);
      setCustomLabel("");
      return;
    }
    if (filter === "monthly") {
      setDateTab("monthly");
      const { from, to } = computeDates("monthly");
      setFromIso(from);
      setToIso(to);
      setCustomLabel("");
      return;
    }
    // custom
    const { from, to } = computeDates("custom", startDate, endDate);
    setFromIso(from);
    setToIso(to);
    setDateTab("custom");
    setCustomLabel(startDate && endDate ? `${startDate} → ${endDate}` : "");
  };

  const applyCustomLimit = () => {
    const n = parseInt(customLimitInput, 10);
    if (n > 0 && n <= 500) {
      setLimit(n);
      setIsCustomLimit(true);
    }
  };

  const toggleLead = (id: number) =>
    setSelected((prev) => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });

  const selectPage = () => {
    setSelected((prev) => {
      const n = new Set(prev);
      currentPageIdsRef.current.forEach((id) => n.add(id));
      return n;
    });
  };

  const deselectPage = () => {
    setSelected((prev) => {
      const n = new Set(prev);
      currentPageIdsRef.current.forEach((id) => n.delete(id));
      return n;
    });
  };

  const clearSelection = () => setSelected(new Set());

  const allPageSelected =
    currentPageIdsRef.current.length > 0 &&
    currentPageIdsRef.current.every((id) => selected.has(id));

  const goDistribute = () => {
    if (selected.size === 0) {
      toast({ title: "Select at least one lead", variant: "destructive" });
      return;
    }
    setStep(2);
  };

  const toggleMember = (type: "tc" | "co", id: number) => {
    if (type === "tc") {
      setTcs((prev) => {
        const n = new Set(prev);
        n.has(id) ? n.delete(id) : n.add(id);
        return n;
      });
    } else {
      setCos((prev) => {
        const n = new Set(prev);
        n.has(id) ? n.delete(id) : n.add(id);
        return n;
      });
    }
  };

  const runDistribute = async () => {
    if (selected.size === 0) return;
    if (tcs.size + cos.size === 0) {
      toast({ title: "Select at least one team member", variant: "destructive" });
      return;
    }
    if (isPriority) {
      const ids = [...Array.from(tcs), ...Array.from(cos)];
      if (ids.some((id) => !weights[String(id)] || weights[String(id)] < 1)) {
        toast({ title: "Set priority (1–99) for each selected member", variant: "destructive" });
        return;
      }
    }
    if (!isLeadTypeSelectionValid(selectedLeadType, customLeadTypeName)) {
      toast({
        title: "Lead type required",
        description: "Select a lead type or enter a custom name (max 50 characters).",
        variant: "destructive",
      });
      return;
    }
    setDistributing(true);
    try {
      const res = await distributeFacebookManualBulk({
        leadIds: Array.from(selected),
        strategy,
        assignedTelecallers: Array.from(tcs),
        assignedCounsellors: Array.from(cos),
        priorityWeights: weights,
        ...buildLeadTypeApiFields(selectedLeadType, customLeadTypeName),
      });
      toast({
        title: "Distribution complete",
        description: `${res.distributed} lead(s) updated.`,
      });
      setStep(1);
      setSelected(new Set());
      await loadLeads();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast({ title: "Distribution failed", description: msg || "Try again.", variant: "destructive" });
    } finally {
      setDistributing(false);
    }
  };

  const assignedLabel = (lead: ManualDistributionPagedLead) =>
    lead.telecallerName || lead.counsellorName || "";

  // ── Render ──

  return (
    <PageWrapper
      title="Distribute Facebook Leads"
      breadcrumbs={[
        { label: "Home", href: "/" },
        { label: "Automation", href: "/leads/automation" },
        { label: "Facebook", href: "/leads/automation/facebook" },
        { label: "Manual distribution" },
      ]}
      actions={
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="gap-1.5 shrink-0"
          onClick={() => setLocation("/leads/automation/facebook")}
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Facebook
        </Button>
      }
    >
      <div className="w-full space-y-5">
        {step === 1 && (
          <>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-bold">Unassigned Facebook leads</CardTitle>
                <CardDescription className="text-xs">
                  This list only includes leads that are still unassigned. Manual assignment is allowed when the form is{" "}
                  <span className="font-semibold">deactivated</span> in Facebook automation (active forms keep automatic
                  assignment). Leads are ordered by Meta creation time (newest first). Optional date range narrows the
                  list; leave <span className="font-semibold">All</span> for every pending lead.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-wrap gap-3 items-end">
                  <div className="space-y-1.5 min-w-[200px] flex-1">
                    <Label className="text-xs font-semibold text-muted-foreground">Form</Label>
                    <Select
                      value={formFilter || "__all__"}
                      onValueChange={(v) => setFormFilter(v === "__all__" ? "" : v)}
                    >
                      <SelectTrigger className="h-9 text-xs">
                        <SelectValue placeholder="Forms with unassigned leads" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__all__">All such forms</SelectItem>
                        {formsWithLeads.map((f) => (
                          <SelectItem key={f.formId} value={f.formId}>
                            {f.formName || f.formId}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5 flex-shrink-0">
                    <Label className="text-xs font-semibold text-muted-foreground">Date range</Label>
                    <div className="flex items-center gap-1 bg-muted/40 rounded-lg p-1">
                      {(["all", "today", "monthly"] as DateTab[]).map((tab) => (
                        <button
                          key={tab}
                          type="button"
                          onClick={() => applyDateTab(tab)}
                          className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all capitalize ${
                            dateTab === tab && (tab !== "custom" || !datePickerOpen)
                              ? "bg-white shadow text-foreground"
                              : "text-muted-foreground hover:text-foreground"
                          }`}
                        >
                          {tab}
                        </button>
                      ))}
                      {/* Custom with DateRangePicker */}
                      <Popover open={datePickerOpen} onOpenChange={setDatePickerOpen}>
                        <PopoverTrigger asChild>
                          <button
                            type="button"
                            onClick={() => applyDateTab("custom")}
                            className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all flex items-center gap-1.5 ${
                              dateTab === "custom"
                                ? "bg-white shadow text-foreground"
                                : "text-muted-foreground hover:text-foreground"
                            }`}
                          >
                            <CalendarDays className="h-3 w-3" />
                            {dateTab === "custom" && customLabel ? customLabel : "Custom"}
                          </button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0 shadow-xl" align="start" side="bottom">
                          <DateRangePicker
                            onApply={handleDatePickerApply}
                            onCancel={() => setDatePickerOpen(false)}
                          />
                        </PopoverContent>
                      </Popover>
                    </div>
                  </div>
                </div>

                {/* Per-page + selection controls */}
                <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs text-muted-foreground font-medium shrink-0">Per page:</span>
                    {PAGE_SIZE_OPTIONS.map((n) => (
                      <Button
                        key={n}
                        type="button"
                        variant={limit === n && !isCustomLimit ? "default" : "outline"}
                        size="sm"
                        className="h-7 px-2.5 text-xs"
                        onClick={() => {
                          setLimit(n);
                          setIsCustomLimit(false);
                          setCustomLimitInput("");
                        }}
                      >
                        {n}
                      </Button>
                    ))}
                    <div className="flex items-center gap-1">
                      <Input
                        type="number"
                        className={`h-7 w-16 text-xs ${isCustomLimit ? "border-primary ring-1 ring-primary/30" : ""}`}
                        placeholder="Custom"
                        min={1}
                        max={500}
                        value={customLimitInput}
                        onChange={(e) => setCustomLimitInput(e.target.value)}
                        onBlur={applyCustomLimit}
                        onKeyDown={(e) => e.key === "Enter" && applyCustomLimit()}
                      />
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    {payload && (
                      <span className="text-xs text-muted-foreground">
                        {payload.total} lead{payload.total !== 1 ? "s" : ""}
                        {selected.size > 0 && (
                          <> · <span className="text-blue-600 font-semibold">{selected.size} selected</span></>
                        )}
                      </span>
                    )}
                    <Button
                      type="button"
                      variant={allPageSelected ? "secondary" : "outline"}
                      size="sm"
                      className="h-7 text-xs"
                      onClick={allPageSelected ? deselectPage : selectPage}
                      disabled={!payload?.data.length}
                    >
                      {allPageSelected ? "Deselect page" : "Select page"}
                    </Button>
                    {selected.size > 0 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs gap-1"
                        onClick={clearSelection}
                      >
                        <X className="h-3 w-3" /> Clear ({selected.size})
                      </Button>
                    )}
                    <Button
                      type="button"
                      size="sm"
                      className="h-7 text-xs"
                      onClick={goDistribute}
                      disabled={selected.size === 0}
                    >
                      Distribute {selected.size > 0 ? `${selected.size}` : ""} lead(s)
                    </Button>
                  </div>
                </div>

                {/* Leads list */}
                {loading ? (
                  <div className="flex justify-center py-14">
                    <Loader2 className="h-6 w-6 animate-spin text-blue-500" />
                  </div>
                ) : !payload?.data.length ? (
                  <div className="text-center py-12 text-muted-foreground border-2 border-dashed rounded-xl">
                    <p className="text-sm">No leads match these filters.</p>
                  </div>
                ) : (
                  <div className="rounded-xl border overflow-hidden">
                    <div className="divide-y">
                      {payload.data.map((lead) => {
                        const isSelected = selected.has(lead.id);
                        return (
                          <label
                            key={lead.id}
                            className={`flex items-start gap-3 p-3 cursor-pointer transition-colors ${
                              isSelected ? "bg-blue-50/60" : "hover:bg-muted/30"
                            }`}
                          >
                            <Checkbox
                              checked={isSelected}
                              onCheckedChange={() => toggleLead(lead.id)}
                              className="mt-0.5 shrink-0"
                            />
                            <div className="flex-1 min-w-0 text-xs">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="font-semibold text-sm">{lead.fullName}</span>
                                <Badge
                                  variant="outline"
                                  className="text-[9px] capitalize text-green-700 border-green-300 bg-green-50"
                                >
                                  {lead.assignmentStatus.replace(/_/g, " ")}
                                </Badge>
                                {lead.formName && (
                                  <span className="text-[10px] text-muted-foreground bg-muted/50 px-1.5 py-0.5 rounded">
                                    {lead.formName}
                                  </span>
                                )}
                              </div>
                              <div className="flex flex-wrap items-center gap-3 mt-1 text-muted-foreground">
                                <span>{lead.phone}</span>
                                {assignedLabel(lead) && (
                                  <span className="text-blue-600 font-medium">→ {assignedLabel(lead)}</span>
                                )}
                                <span className="text-[10px] text-muted-foreground">
                                  Meta:{" "}
                                  {lead.facebookCreatedAt
                                    ? new Date(lead.facebookCreatedAt).toLocaleString()
                                    : "—"}
                                </span>
                                <span className="text-[10px]">
                                  In CRM: {lead.createdAt ? new Date(lead.createdAt).toLocaleString() : ""}
                                </span>
                              </div>
                            </div>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Pagination */}
                {payload && payload.totalPages > 1 && (
                  <div className="flex items-center justify-center gap-2 pt-1">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="h-8 w-8 p-0"
                      disabled={page <= 1}
                      onClick={() => setPage((p) => p - 1)}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <span className="text-xs tabular-nums text-muted-foreground">
                      Page {page} / {payload.totalPages}
                    </span>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="h-8 w-8 p-0"
                      disabled={page >= payload.totalPages}
                      onClick={() => setPage((p) => p + 1)}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}

        {/* Step 2: Distribution config */}
        {step === 2 && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-muted/30 p-4 rounded-xl border">
              <div className="flex items-center gap-3 min-w-0">
                <Button type="button" variant="outline" size="icon" className="rounded-full shrink-0" onClick={() => setStep(1)}>
                  <ArrowLeft className="h-4 w-4" />
                </Button>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-foreground">Redistribute leads</p>
                  <p className="text-xs text-muted-foreground truncate">
                    <span className="font-semibold text-foreground">{selected.size}</span> lead(s) selected · choose strategy and team
                  </p>
                </div>
              </div>
            </div>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-xs font-bold uppercase tracking-wide text-muted-foreground flex items-center gap-2">
                  <FileText className="h-4 w-4 text-blue-500" /> Lead type <span className="text-red-500">*</span>
                </CardTitle>
                <CardDescription className="text-xs">Required for manual distribution.</CardDescription>
              </CardHeader>
              <CardContent>
                <LeadTypeSelectWithCustom
                  saleTypes={saleTypes}
                  selectedLeadType={selectedLeadType}
                  customLeadTypeName={customLeadTypeName}
                  onSelectedLeadTypeChange={setSelectedLeadType}
                  onCustomLeadTypeNameChange={setCustomLeadTypeName}
                />
              </CardContent>
            </Card>

            <div className="grid gap-4 lg:grid-cols-3">
              <Card className="lg:col-span-1">
                <CardHeader className="pb-3">
                  <CardTitle className="text-xs font-bold uppercase tracking-wide text-muted-foreground flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-blue-500" /> Strategy
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {STRATEGY_OPTIONS.map((opt) => {
                    const on = strategy === opt.value;
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setStrategy(opt.value)}
                        className={`w-full text-left p-3 rounded-xl border-2 transition-all duration-150 text-xs ${
                          on ? "border-blue-500 bg-blue-50 shadow-sm" : "border-border bg-muted/10 hover:border-blue-200 hover:bg-blue-50/30"
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <div
                            className={`h-4 w-4 rounded-full border-2 shrink-0 flex items-center justify-center transition-colors ${
                              on ? "border-blue-500 bg-blue-500" : "border-muted-foreground/30"
                            }`}
                          >
                            {on && <div className="h-1.5 w-1.5 rounded-full bg-white" />}
                          </div>
                          <span className={`text-sm font-semibold ${on ? "text-blue-700" : "text-foreground"}`}>{opt.label}</span>
                        </div>
                        {on && (
                          <p className="text-xs text-blue-600/80 mt-1.5 ml-6 leading-relaxed">{opt.description}</p>
                        )}
                      </button>
                    );
                  })}
                </CardContent>
              </Card>

              <Card className="lg:col-span-2">
                <CardHeader className="pb-2">
                  <CardTitle className="text-xs font-bold uppercase tracking-wide text-muted-foreground flex items-center gap-2">
                    <Users className="h-4 w-4 text-blue-500" /> Team assignment <span className="text-red-500">*</span>
                  </CardTitle>
                  <CardDescription className="text-xs">Select at least one telecaller or counsellor.</CardDescription>
                </CardHeader>
                <CardContent className="grid md:grid-cols-2 gap-6 pt-2">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between border-b pb-2">
                      <Label className="text-sm font-bold text-blue-600 flex items-center gap-1.5">
                        <UserCheck className="h-3.5 w-3.5" /> Telecallers
                      </Label>
                      <div className="flex items-center gap-1">
                        <Badge variant="outline" className="text-[10px]">{tcs.size}/{telecallers.length}</Badge>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-5 text-[10px] px-1.5"
                          onClick={() =>
                            allTcsSelected ? setTcs(new Set()) : setTcs(new Set(telecallers.map((t) => t.id)))
                          }
                        >
                          {allTcsSelected ? "None" : "All"}
                        </Button>
                      </div>
                    </div>
                    <ScrollArea className="h-56 pr-2">
                      <div className="space-y-1.5">
                        {telecallers.length === 0 ? (
                          <p className="text-xs text-muted-foreground text-center py-6">No telecallers found</p>
                        ) : (
                          telecallers.map((m) => (
                            <MemberRow
                              key={m.id}
                              member={m}
                              checked={tcs.has(m.id)}
                              onToggle={() => toggleMember("tc", m.id)}
                              color="blue"
                              isPriority={isPriority}
                              savedPriority={weights[String(m.id)]}
                              onSetPriority={(v) => setWeights((prev) => ({ ...prev, [String(m.id)]: v }))}
                            />
                          ))
                        )}
                      </div>
                    </ScrollArea>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between border-b pb-2">
                      <Label className="text-sm font-bold text-purple-600 flex items-center gap-1.5">
                        <Users className="h-3.5 w-3.5" /> Counsellors
                      </Label>
                      <div className="flex items-center gap-1">
                        <Badge variant="outline" className="text-[10px]">{cos.size}/{counsellors.length}</Badge>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-5 text-[10px] px-1.5"
                          onClick={() =>
                            allCosSelected ? setCos(new Set()) : setCos(new Set(counsellors.map((c) => c.id)))
                          }
                        >
                          {allCosSelected ? "None" : "All"}
                        </Button>
                      </div>
                    </div>
                    <ScrollArea className="h-56 pr-2">
                      <div className="space-y-1.5">
                        {counsellors.length === 0 ? (
                          <p className="text-xs text-muted-foreground text-center py-6">No counsellors found</p>
                        ) : (
                          counsellors.map((m) => (
                            <MemberRow
                              key={m.id}
                              member={m}
                              checked={cos.has(m.id)}
                              onToggle={() => toggleMember("co", m.id)}
                              color="purple"
                              isPriority={isPriority}
                              savedPriority={weights[String(m.id)]}
                              onSetPriority={(v) => setWeights((prev) => ({ ...prev, [String(m.id)]: v }))}
                            />
                          ))
                        )}
                      </div>
                    </ScrollArea>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Button
              type="button"
              className="w-full"
              size="lg"
              disabled={distributing || tcs.size + cos.size === 0}
              onClick={() => void runDistribute()}
            >
              {distributing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
              Distribute {selected.size} lead(s)
            </Button>
          </div>
        )}
      </div>
    </PageWrapper>
  );
}