import { useMemo, useState } from "react";
import { useLocation } from "wouter";
import { PageWrapper } from "@/layout/PageWrapper";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { TableActions } from "@/components/table/TableActions";
import { DashboardDateFilter } from "@/components/dashboard/DashboardDateFilter";
import { format, startOfMonth, endOfMonth, startOfYear, endOfYear, startOfWeek, endOfWeek } from "date-fns";
import { Download, Search, ChevronDown, ChevronUp, ChevronsUpDown, X } from "lucide-react";
import {
  type VisaClient,
  DUMMY_BACKEND_CLIENTS,
  BACKEND_DESTINATIONS,
  BACKEND_TRAVEL_REASONS,
  BACKEND_PROCESSING_STATUS_GROUPS,
  BACKEND_DECISIONS,
  BACKEND_STAGES,
  stageOfStatus,
} from "@/data/dummyBackendData";

/* Option lists + seed rows come from the shared dummy data file so this list
 * and the Backend Dashboard always stay in sync. Edit cases there. */
const DESTINATIONS = BACKEND_DESTINATIONS;
const TRAVEL_REASONS = BACKEND_TRAVEL_REASONS;
const DECISIONS = BACKEND_DECISIONS;
const INITIAL_CLIENTS = DUMMY_BACKEND_CLIENTS;
// Distinct case processors, for the "Handled By" filter (dashboard leaderboard links here).
const HANDLERS = [...new Set(INITIAL_CLIENTS.map((c) => c.handledBy).filter(Boolean))].sort();

const inr = (n: number) => `₹${Math.round(Number(n) || 0).toLocaleString("en-IN")}`;
const fmtDate = (iso: string) => {
  const [y, m, d] = iso.split("-");
  return `${d}-${m}-${y}`;
};

type SortKey = "name" | "destination" | "travelReason" | "status" | "decision" | "enrollmentDate" | "balanceDue" | "handledBy";
type SortDir = "asc" | "desc";

/* ------------------------------------------------------------------ */

/**
 * Shared Visa-Case list table. Used by the Backend Team (full status control)
 * and the CX Team (`statusScope="documentation"` — CX may only move a case
 * through the Documentation sub-statuses, not Filing/Submission etc.).
 */
export default function BackendClients({
  title = "Backend Clients",
  breadcrumbLabel = "Backend",
  statusScope = "all",
}: {
  title?: string;
  breadcrumbLabel?: string;
  statusScope?: "all" | "documentation";
} = {}) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  // Initial filters can be pre-set via URL query params (e.g. dashboard cards
  // link to /backend/clients?decision=Approved or ?balance=due).
  const initialParams = useMemo(
    () => new URLSearchParams(typeof window !== "undefined" ? window.location.search : ""),
    []
  );

  const [clients, setClients] = useState<VisaClient[]>(INITIAL_CLIENTS);
  const [search, setSearch] = useState(initialParams.get("q") ?? "");
  // High-level stage filter (dashboard "Cases by Stage" tiles deep-link here via ?stage=).
  const [stageFilter, setStageFilter] = useState(initialParams.get("stage") ?? "all");
  const [statusFilter, setStatusFilter] = useState(initialParams.get("status") ?? "all");
  const [destinationFilter, setDestinationFilter] = useState(initialParams.get("destination") ?? "all");
  const [decisionFilter, setDecisionFilter] = useState(initialParams.get("decision") ?? "all");
  const [reasonFilter, setReasonFilter] = useState(initialParams.get("reason") ?? "all");
  const [balanceFilter, setBalanceFilter] = useState(initialParams.get("balance") ?? "all"); // all | due | paid
  const [handledByFilter, setHandledByFilter] = useState(initialParams.get("handledBy") ?? "all");

  // Enrollment-date filter via period tabs (Today / Weekly / Monthly / Custom).
  // The dashboard deep-links with ?period=<tab> (+ ?from&to for custom), so the
  // list opens on the same period the user had selected there.
  const initFrom = initialParams.get("from");
  const initTo = initialParams.get("to");
  const initPeriod = initialParams.get("period");
  const initialTab = initPeriod
    ? initPeriod.charAt(0).toUpperCase() + initPeriod.slice(1).toLowerCase()
    : initFrom && initTo
      ? "Custom"
      : "Monthly";
  const [timeTab, setTimeTab] = useState<string>(initialTab);
  const [customRange, setCustomRange] = useState<[Date | null, Date | null]>(
    initFrom && initTo ? [new Date(`${initFrom}T12:00:00`), new Date(`${initTo}T12:00:00`)] : [null, null]
  );

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

  const [sortKey, setSortKey] = useState<SortKey>("enrollmentDate");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  // Dialog state
  const [dialogClient, setDialogClient] = useState<VisaClient | null>(null);
  const [dialogMode, setDialogMode] = useState<"view" | "edit">("view");
  const [draft, setDraft] = useState<VisaClient | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<VisaClient | null>(null);

  const activeFilterCount =
    (stageFilter !== "all" ? 1 : 0) +
    (statusFilter !== "all" ? 1 : 0) +
    (destinationFilter !== "all" ? 1 : 0) +
    (decisionFilter !== "all" ? 1 : 0) +
    (reasonFilter !== "all" ? 1 : 0) +
    (balanceFilter !== "all" ? 1 : 0) +
    (handledByFilter !== "all" ? 1 : 0);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    let rows = clients.filter((c) => {
      if (q) {
        const hay = `${c.name} ${c.passport} ${c.destination}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      if (stageFilter !== "all" && stageOfStatus(c.status) !== stageFilter) return false;
      if (statusFilter !== "all" && c.status !== statusFilter) return false;
      if (destinationFilter !== "all" && c.destination !== destinationFilter) return false;
      if (decisionFilter !== "all" && c.decision !== decisionFilter) return false;
      if (reasonFilter !== "all" && c.travelReason !== reasonFilter) return false;
      if (balanceFilter === "due" && !(c.balanceDue > 0)) return false;
      if (balanceFilter === "paid" && c.balanceDue > 0) return false;
      if (handledByFilter !== "all" && c.handledBy !== handledByFilter) return false;
      if (dateFrom && c.enrollmentDate < dateFrom) return false;
      if (dateTo && c.enrollmentDate > dateTo) return false;
      return true;
    });

    rows = [...rows].sort((a, b) => {
      let av: string | number = a[sortKey];
      let bv: string | number = b[sortKey];
      if (sortKey === "balanceDue") {
        av = a.balanceDue;
        bv = b.balanceDue;
      }
      if (typeof av === "string" && typeof bv === "string") {
        return sortDir === "asc" ? av.localeCompare(bv) : bv.localeCompare(av);
      }
      return sortDir === "asc" ? (av as number) - (bv as number) : (bv as number) - (av as number);
    });
    return rows;
  }, [clients, search, stageFilter, statusFilter, destinationFilter, decisionFilter, reasonFilter, balanceFilter, handledByFilter, dateFrom, dateTo, sortKey, sortDir]);

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
    setDecisionFilter("all");
    setReasonFilter("all");
    setBalanceFilter("all");
    setHandledByFilter("all");
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
  const goToClient = (c: VisaClient) => setLocation(`/clients/${c.id}/view`);

  const openEdit = (c: VisaClient) => {
    setDialogClient(c);
    setDialogMode("edit");
    setDraft({ ...c });
  };

  // Change-status dialog (hidden from counsellors — see canChangeStatus below).
  const [statusTarget, setStatusTarget] = useState<VisaClient | null>(null);
  const [statusDraft, setStatusDraft] = useState<string>("");

  const openStatusChange = (c: VisaClient) => {
    setStatusTarget(c);
    setStatusDraft(c.status);
  };
  const saveStatus = () => {
    if (!statusTarget) return;
    setClients((prev) => prev.map((c) => (c.id === statusTarget.id ? { ...c, status: statusDraft } : c)));
    toast({ title: "Status updated", description: `${statusTarget.name}'s status changed to "${statusDraft}".` });
    setStatusTarget(null);
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
    const headers = ["ID", "Name", "Passport", "Destination", "Travel Reason", "Sponsor", "Status", "Decision", "Enrollment Date", "Balance Due", "Counsellor", ...(showHandledBy ? ["Handled By"] : [])];
    const rows = filtered.map((c) => [
      c.id, c.name, c.passport, c.destination, c.travelReason, c.sponsor, c.status, c.decision, fmtDate(c.enrollmentDate), c.balanceDue, c.counsellor, ...(showHandledBy ? [c.handledBy] : []),
    ]);
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
  // Counsellors may view cases but cannot change processing status.
  const canChangeStatus = !!user && (user as any)?.role !== "counsellor";
  // CX and Binding teams only ever see their own cases, so "Handled By" is
  // redundant for them — only admins/backend (who see everyone's) need it.
  const showHandledBy = !["customer_experience", "binding_team"].includes((user as any)?.role);

  return (
    <PageWrapper
      title={title}
      breadcrumbs={[{ label: breadcrumbLabel }, { label: "Clients" }]}
      actions={
        <Button
          variant="outline"
          className="bg-card border-border/50 shadow-sm hover:bg-muted/50"
          onClick={handleExport}
          disabled={filtered.length === 0}
        >
          <Download className="w-4 h-4 mr-2" />
          Export CSV
        </Button>
      }
    >
      <div className="space-y-5">
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
            />
          </div>

          <div className="flex flex-wrap items-end gap-3">
            <FilterChip label="Stage" value={stageFilter} onChange={setStageFilter} options={BACKEND_STAGES} />
            {/* Processing Status filter hidden for now — Stage covers the high-level grouping.
            <div className="space-y-1.5">
              <Label className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Processing Status</Label>
              <StatusSelect value={statusFilter} onChange={setStatusFilter} includeAll className="w-[230px]" />
            </div>
            */}
            <FilterChip label="Destination" value={destinationFilter} onChange={setDestinationFilter} options={DESTINATIONS} />
            <FilterChip label="Decision" value={decisionFilter} onChange={setDecisionFilter} options={DECISIONS} />
            <FilterChip label="Travel Reason" value={reasonFilter} onChange={setReasonFilter} options={TRAVEL_REASONS} />
            <div className="space-y-1.5">
              <Label className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Payment</Label>
              <Select value={balanceFilter} onValueChange={setBalanceFilter}>
                <SelectTrigger className={cn("h-9 w-[170px]", balanceFilter !== "all" && "border-primary/40 bg-primary/5 text-primary")}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="due">With Balance Due</SelectItem>
                  <SelectItem value="paid">Fully Paid</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {showHandledBy ? (
              <FilterChip label="Handled By" value={handledByFilter} onChange={setHandledByFilter} options={HANDLERS} />
            ) : null}
            {activeFilterCount > 0 ? (
              <Button variant="ghost" size="sm" className="h-9 text-muted-foreground" onClick={clearFilters}>
                <X className="w-3.5 h-3.5 mr-1" />
                Clear ({activeFilterCount})
              </Button>
            ) : null}
          </div>
        </div>

        {/* Results count */}
        <p className="text-sm text-muted-foreground">
          Showing <span className="font-semibold text-foreground">{filtered.length}</span> of {clients.length} cases
        </p>

        {/* Table */}
        <div className="overflow-hidden rounded-xl border border-border/60 bg-card shadow-sm">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50 hover:bg-muted/50 border-b border-border/60">
                  <TableHead className="w-[60px] py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Sr</TableHead>
                  <SortHeader label="Name" k="name" />
                  <TableHead className="py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Passport</TableHead>
                  <SortHeader label="Destination" k="destination" />
                  <SortHeader label="Travel Reason" k="travelReason" />
                  <SortHeader label="Status" k="status" />
                  <SortHeader label="Decision" k="decision" />
                  <SortHeader label="Enrollment" k="enrollmentDate" />
                  <SortHeader label="Balance Due" k="balanceDue" className="text-right" />
                  {showHandledBy ? <SortHeader label="Handled By" k="handledBy" /> : null}
                  <TableHead className="py-3 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={showHandledBy ? 11 : 10} className="h-32 text-center text-muted-foreground">
                      No cases found. Try a different search or clear the filters.
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((c, i) => (
                    <TableRow
                      key={c.id}
                      className="cursor-pointer border-b border-border/40 transition-colors last:border-0 hover:bg-muted/30"
                      onClick={() => goToClient(c)}
                    >
                      <TableCell className="py-3 font-mono text-xs text-muted-foreground">{String(i + 1).padStart(2, "0")}</TableCell>
                      <TableCell className="py-3 text-sm font-semibold text-foreground">{c.name}</TableCell>
                      <TableCell className="py-3 font-mono text-xs text-muted-foreground">{c.passport}</TableCell>
                      <TableCell className="py-3 text-sm text-foreground">{c.destination}</TableCell>
                      <TableCell className="py-3 text-sm text-muted-foreground">{c.travelReason}</TableCell>
                      <TableCell className="py-3">
                        <StatusCell status={c.status} />
                      </TableCell>
                      <TableCell className="py-3">
                        <DecisionBadge decision={c.decision} />
                      </TableCell>
                      <TableCell className="py-3 whitespace-nowrap text-sm text-muted-foreground">{fmtDate(c.enrollmentDate)}</TableCell>
                      <TableCell className="py-3 text-right tabular-nums">
                        <span className={c.balanceDue > 0 ? "font-semibold text-foreground" : "text-muted-foreground"}>
                          {c.balanceDue > 0 ? inr(c.balanceDue) : "—"}
                        </span>
                      </TableCell>
                      {showHandledBy ? (
                        <TableCell className="py-3">
                          <div className="flex items-center gap-2">
                            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-[11px] font-semibold text-primary">
                              {c.handledBy.charAt(0).toUpperCase()}
                            </span>
                            <span className="whitespace-nowrap text-sm text-foreground">{c.handledBy}</span>
                          </div>
                        </TableCell>
                      ) : null}
                      <TableCell className="py-3" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-2">
                          {canChangeStatus ? (
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-8 whitespace-nowrap"
                              onClick={() => openStatusChange(c)}
                            >
                              Change Status
                            </Button>
                          ) : null}
                          <TableActions
                            onView={() => goToClient(c)}
                            onEdit={canEdit ? () => openEdit(c) : undefined}
                            onDelete={canEdit ? () => setDeleteTarget(c) : undefined}
                            deleteLabel="Remove"
                          />
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>
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

      {/* Change-status dialog */}
      <Dialog open={!!statusTarget} onOpenChange={(o) => { if (!o) setStatusTarget(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Change Status — {statusTarget?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <Label className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Processing Status</Label>
            <StatusSelect value={statusDraft} onChange={setStatusDraft} className="w-full" scope={statusScope} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setStatusTarget(null)}>Cancel</Button>
            <Button onClick={saveStatus} disabled={!statusDraft || statusDraft === statusTarget?.status}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => { if (!o) setDeleteTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove this case?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget ? `${deleteTarget.name} (${deleteTarget.passport}) will be removed from the list.` : ""}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete}>Remove</AlertDialogAction>
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

/** Status as a stage "title" pill + the detailed sub-status as the subtitle. */
function StatusCell({ status }: { status: string }) {
  const stage = stageOfStatus(status);
  const detail = status.includes(":") ? status.slice(status.indexOf(":") + 1).trim() : "";
  return (
    <div className="flex max-w-[230px] flex-col gap-1">
      <span className="inline-flex w-fit items-center gap-1.5 rounded-md bg-primary/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary">
        <span className="h-1.5 w-1.5 rounded-full bg-primary" />
        {stage}
      </span>
      {detail ? <span className="text-sm font-medium leading-snug text-foreground">{detail}</span> : null}
    </div>
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
