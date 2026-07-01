import { useState, useCallback, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation, useRoute } from "wouter";
import { format } from "date-fns";
import {
  Search, CheckCircle2, UserCheck, Download, RefreshCw,
  Eye, CalendarDays, X, ChevronLeft, ChevronRight,
  Users, ClipboardCheck, Clock, Printer, MoreVertical,
} from "lucide-react";
import { PageWrapper } from "@/layout/PageWrapper";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import { frontDeskApi, FrontDeskLead, Counsellor } from "@/api/frontdesk.api";
import { refreshFrontDeskDashboardCaches } from "@/lib/frontdeskQueryCache";
import DateRangePicker from "@/components/payments/DateRangePicker";
import type { PaymentsFilter } from "@/api/payments.api";
import FrontDeskLeadDetail from "./FrontDeskLeadDetail";
import { usePrintClientLead } from "./usePrintClientLead";
import { useFrontDeskDetailRoom } from "@/hooks/useFrontDeskDetailRoom";

const PAGE_SIZE = 25;
const todayStr = () => format(new Date(), "yyyy-MM-dd");

function StatCard({ icon: Icon, label, value, color }: { icon: any; label: string; value: number; color: string }) {
  return (
    <Card className="border-0 shadow-sm">
      <CardContent className="flex items-center gap-4 py-5 px-5">
        <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${color}`}>
          <Icon className="h-5 w-5 text-white" />
        </div>
        <div>
          <p className="text-2xl font-bold text-slate-800 leading-tight">{value}</p>
          <p className="text-xs text-slate-500 mt-0.5">{label}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function statusBadge(status: string) {
  switch (status) {
    case "assigned":   return <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100 text-xs">Assigned</Badge>;
    case "converted":  return <Badge className="bg-green-100 text-green-800 hover:bg-green-100 text-xs">Converted</Badge>;
    case "dropped":    return <Badge className="bg-red-100 text-red-800 hover:bg-red-100 text-xs">Dropped</Badge>;
    default:           return <Badge variant="outline" className="text-xs">Unassigned</Badge>;
  }
}

export default function FrontDeskPortal() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [, setLocation] = useLocation();
  const [leadRouteMatch, leadRouteParams] = useRoute("/front-desk/leads/:id");

  const parsedLeadId = leadRouteMatch && leadRouteParams?.id ? Number(leadRouteParams.id) : null;
  const selectedLeadId =
    parsedLeadId != null && Number.isFinite(parsedLeadId) && parsedLeadId > 0 ? parsedLeadId : null;

  useEffect(() => {
    if (leadRouteMatch && leadRouteParams?.id && selectedLeadId == null) {
      setLocation("/front-desk");
    }
  }, [leadRouteMatch, leadRouteParams?.id, selectedLeadId, setLocation]);

  const openLead = (id: number) => setLocation(`/front-desk/leads/${id}`);
  const closeLead = () => setLocation("/front-desk");

  // Per-lead socket room while detail is open (listeners live in MainLayout).
  useFrontDeskDetailRoom(selectedLeadId);

  // Filters — default to today
  const [draftSearch, setDraftSearch] = useState("");
  const [search, setSearch] = useState("");
  const [startDate, setStartDate] = useState<string>(todayStr());
  const [endDate, setEndDate] = useState<string>(todayStr());
  const [dateLabel, setDateLabel] = useState<string>("Today");
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [verifiedFilter, setVerifiedFilter] = useState<"all" | "verified" | "unverified">("all");
  const [leadTypeFilter, setLeadTypeFilter] = useState("all");
  const [page, setPage] = useState(1);

  const [assignLeadId, setAssignLeadId] = useState<number | null>(null);
  const [selectedCounsellorId, setSelectedCounsellorId] = useState("");
  const { printClient, printingId, printPortal } = usePrintClientLead();

  const isVerified = verifiedFilter === "verified" ? true : verifiedFilter === "unverified" ? false : undefined;
  const activeLeadType = leadTypeFilter === "all" ? undefined : leadTypeFilter;

  // Stats (always today)
  const { data: statsData } = useQuery({
    queryKey: ["frontdesk-stats", startDate, endDate],
    queryFn: () => frontDeskApi.getStats({ startDate, endDate }),
    staleTime: 0,
  });
  const stats = statsData?.data;

  // Leads list
  const { data, isFetching, refetch } = useQuery({
    queryKey: ["frontdesk-leads", search, startDate, endDate, isVerified, activeLeadType, page],
    queryFn: () => frontDeskApi.getLeads({ search: search || undefined, startDate, endDate, isVerified, leadType: activeLeadType, page, limit: PAGE_SIZE }),
    staleTime: 0,
  });

  const { data: counsellorsData } = useQuery({
    queryKey: ["frontdesk-counsellors"],
    queryFn: frontDeskApi.getCounsellors,
    staleTime: 5 * 60 * 1000,
  });

  const { data: saleTypesData } = useQuery({
    queryKey: ["frontdesk-sale-types"],
    queryFn: frontDeskApi.getSaleTypes,
    staleTime: 10 * 60 * 1000,
  });

  const verifyMutation = useMutation({
    mutationFn: ({ id, saleType, source, counsellorId }: { id: number; saleType: string; source: string; counsellorId?: number }) =>
      frontDeskApi.verifyLead(id, saleType, source, counsellorId),
    onSuccess: async (_data, variables) => {
      toast({ title: "Lead verified" });
      await refreshFrontDeskDashboardCaches(qc, { leadId: variables.id });
    },
    onError: (err: any) => toast({ title: "Failed to verify", description: err?.response?.data?.message, variant: "destructive" }),
  });

  const assignMutation = useMutation({
    mutationFn: ({ leadId, counsellorId, leadType }: { leadId: number; counsellorId: number; leadType?: string }) =>
      frontDeskApi.assignLead(leadId, counsellorId, leadType),
    onSuccess: async (_data, variables) => {
      toast({ title: "Lead assigned" });
      setAssignLeadId(null);
      setSelectedCounsellorId("");
      await refreshFrontDeskDashboardCaches(qc, { leadId: variables.leadId });
    },
    onError: (err: any) => toast({ title: "Assignment failed", description: err?.response?.data?.message, variant: "destructive" }),
  });

  const handleSearch = () => { setSearch(draftSearch); setPage(1); };

  const handleDateApply = useCallback((filter: PaymentsFilter, start?: string, end?: string) => {
    setDatePickerOpen(false);
    const today = todayStr();
    if (filter === "today") {
      setStartDate(today); setEndDate(today); setDateLabel("Today");
    } else if (filter === "monthly") {
      const now = new Date();
      setStartDate(format(new Date(now.getFullYear(), now.getMonth(), 1), "yyyy-MM-dd"));
      setEndDate(today); setDateLabel("This month");
    } else if (filter === "maximum") {
      setStartDate(""); setEndDate(""); setDateLabel("All time");
    } else if (start && end) {
      setStartDate(start); setEndDate(end);
      setDateLabel(`${start} – ${end}`);
    }
    setPage(1);
  }, []);

  const handleExport = async () => {
    try {
      const blob = await frontDeskApi.exportLeads({ search, startDate: startDate || undefined, endDate: endDate || undefined, isVerified, leadType: activeLeadType });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = `walk-in-leads-${Date.now()}.xlsx`; a.click();
      URL.revokeObjectURL(url);
    } catch { toast({ title: "Export failed", variant: "destructive" }); }
  };

  const rows = data?.rows ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.ceil(total / PAGE_SIZE);
  const counsellors: Counsellor[] = counsellorsData?.data ?? [];
  const saleTypeNames: string[] = saleTypesData?.data ?? [];

  if (selectedLeadId !== null) {
    return (
      <>
        <FrontDeskLeadDetail
          leadId={selectedLeadId}
          onBack={closeLead}
          counsellors={counsellors}
          saleTypeNames={saleTypeNames}
          onVerify={(id, saleType, source, counsellorId) => verifyMutation.mutate({ id, saleType, source, counsellorId })}
          onAssign={(leadId, counsellorId) => assignMutation.mutate({ leadId, counsellorId })}
        />
        {printPortal}
      </>
    );
  }

  return (
    <>
    <PageWrapper title="Dashboard" breadcrumbs={[{ label: "Front Desk" }, { label: "Dashboard" }]}>

      {/* ── Stats Cards ── */}
      <div className="grid grid-cols-2 gap-3 mb-6 lg:grid-cols-4">
        <StatCard icon={Users}          label="Today Walk-ins"  value={stats?.total      ?? 0} color="bg-indigo-500" />
        <StatCard icon={ClipboardCheck} label="Verified"        value={stats?.verified   ?? 0} color="bg-green-500" />
        <StatCard icon={UserCheck}      label="Assigned"        value={stats?.assigned   ?? 0} color="bg-blue-500" />
        <StatCard icon={Clock}          label="Not Assigned"    value={stats?.notAssigned ?? 0} color="bg-amber-500" />
      </div>

      {/* ── Filter Bar ── */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          {/* Search */}
          <div className="flex items-center gap-1">
            <Input
              placeholder="Name or mobile…"
              className="h-9 w-56 text-sm"
              value={draftSearch}
              onChange={(e) => setDraftSearch(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            />
            <Button size="sm" variant="outline" onClick={handleSearch} className="h-9 px-3">
              <Search className="h-4 w-4" />
            </Button>
          </div>

          {/* Date range */}
          <Popover open={datePickerOpen} onOpenChange={setDatePickerOpen}>
            <PopoverTrigger asChild>
              <Button size="sm" variant="outline" className="h-9 gap-1.5 text-xs">
                <CalendarDays className="h-4 w-4" />
                {dateLabel}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <DateRangePicker onApply={handleDateApply} onCancel={() => setDatePickerOpen(false)} />
            </PopoverContent>
          </Popover>

          {dateLabel !== "Today" && (
            <Button size="sm" variant="ghost" className="h-9 px-2 text-xs" onClick={() => { setStartDate(todayStr()); setEndDate(todayStr()); setDateLabel("Today"); setPage(1); }}>
              <X className="h-3 w-3 mr-1" /> Today
            </Button>
          )}

          {/* Verified */}
          <Select value={verifiedFilter} onValueChange={(v) => { setVerifiedFilter(v as any); setPage(1); }}>
            <SelectTrigger className="h-9 w-36 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="unverified">Not Verified</SelectItem>
              <SelectItem value="verified">Verified</SelectItem>
            </SelectContent>
          </Select>

          {/* Lead Type */}
          {saleTypeNames.length > 0 && (
            <Select value={leadTypeFilter} onValueChange={(v) => { setLeadTypeFilter(v); setPage(1); }}>
              <SelectTrigger className="h-9 w-40 text-xs"><SelectValue placeholder="Lead Type" /></SelectTrigger>
              <SelectContent className="max-h-56 overflow-y-auto">
                <SelectItem value="all">All Types</SelectItem>
                {saleTypeNames.map((n) => <SelectItem key={n} value={n}>{n}</SelectItem>)}
              </SelectContent>
            </Select>
          )}
        </div>

        <div className="flex gap-2">
          <Button size="sm" variant="outline" className="h-9 gap-1 text-xs" onClick={() => { refetch(); qc.invalidateQueries({ queryKey: ["frontdesk-stats"] }); }}>
            <RefreshCw className="h-4 w-4" /> Refresh
          </Button>
          <Button size="sm" variant="outline" className="h-9 gap-1 text-xs" onClick={handleExport}>
            <Download className="h-4 w-4" /> Export to XL
          </Button>
        </div>
      </div>

      {/* Count */}
      <p className="mb-3 text-sm text-muted-foreground">
        {total} lead{total !== 1 ? "s" : ""} found
        {isFetching && <span className="ml-2 text-xs text-slate-400">refreshing…</span>}
      </p>

      {/* ── Table ── */}
      <div className="rounded-xl border bg-white overflow-hidden shadow-sm">
        <Table>
          <TableHeader>
            <TableRow className="bg-slate-50 hover:bg-slate-50">
              {["Name", "Phone", "Email", "City", "Lead Type", "Verified", "Status", "Counsellor", "Registered", ""].map((h) => (
                <TableHead key={h || "actions"} className={`text-[11px] font-semibold uppercase tracking-wide text-slate-400 py-3 ${h ? "" : "w-10"}`}>
                  {h}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={10} className="py-16 text-center text-sm text-slate-400">
                  {isFetching ? "Loading…" : "No walk-in leads found"}
                </TableCell>
              </TableRow>
            ) : rows.map((lead: FrontDeskLead) => (
              <TableRow
                key={lead.id}
                className="cursor-pointer hover:bg-slate-50/80 transition-colors"
                onClick={() => openLead(lead.id)}
              >
                <TableCell className="font-medium text-sm py-3">{lead.fullName}</TableCell>
                <TableCell className="text-sm text-slate-600">{lead.phone}</TableCell>
                <TableCell className="text-sm text-slate-500 max-w-[140px] truncate">{lead.email ?? "—"}</TableCell>
                <TableCell className="text-sm text-slate-600">{lead.city ?? "—"}</TableCell>
                <TableCell className="text-xs">
                  {lead.leadType
                    ? <Badge variant="outline" className="capitalize text-xs">{lead.leadType}</Badge>
                    : <span className="text-slate-400">—</span>}
                </TableCell>
                <TableCell onClick={(e) => e.stopPropagation()}>
                  {lead.isVerified ? (
                    <span className="flex items-center gap-1 text-green-600 text-xs font-medium">
                      <CheckCircle2 className="h-3.5 w-3.5" /> Verified
                    </span>
                  ) : (
                    <Badge variant="outline" className="border-amber-300 text-amber-700 text-xs">Not Verified</Badge>
                  )}
                </TableCell>
                <TableCell>{statusBadge(lead.assignmentStatus)}</TableCell>
                <TableCell className="text-sm text-slate-600">{lead.counsellorName ?? "—"}</TableCell>
                <TableCell className="text-xs text-slate-400 whitespace-nowrap">
                  {lead.createdAt ? format(new Date(lead.createdAt), "d MMM, HH:mm") : "—"}
                </TableCell>
                <TableCell className="w-10 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 w-7 p-0 text-slate-500 hover:text-slate-800 data-[state=open]:bg-slate-100"
                        aria-label="Lead actions"
                      >
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-40">
                      <DropdownMenuItem className="gap-2 cursor-pointer" onClick={() => openLead(lead.id)}>
                        <Eye className="h-4 w-4" /> View details
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="gap-2 cursor-pointer"
                        disabled={printingId === lead.id}
                        onClick={() => printClient(lead.id)}
                      >
                        <Printer className={`h-4 w-4 ${printingId === lead.id ? "animate-pulse" : ""}`} />
                        Print
                      </DropdownMenuItem>
                      {lead.isVerified && lead.assignmentStatus !== "converted" && lead.assignmentStatus !== "dropped" && (
                        <DropdownMenuItem
                          className="gap-2 cursor-pointer"
                          onClick={() => {
                            setAssignLeadId(lead.id);
                            setSelectedCounsellorId(lead.currentCounsellorId?.toString() ?? "");
                          }}
                        >
                          <UserCheck className="h-4 w-4" />
                          {lead.currentCounsellorId ? "Re-assign" : "Assign"}
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between text-sm text-slate-500">
          <span>Page {page} of {totalPages}</span>
          <div className="flex gap-1">
            <Button size="sm" variant="outline" className="h-8 px-2" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button size="sm" variant="outline" className="h-8 px-2" disabled={page === totalPages} onClick={() => setPage((p) => p + 1)}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Assign Dialog */}
      <Dialog open={assignLeadId !== null} onOpenChange={(open) => { if (!open) { setAssignLeadId(null); setSelectedCounsellorId(""); } }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Assign to Counsellor</DialogTitle>
            <DialogDescription>Select the counsellor for this walk-in lead.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1">
              <p className="text-xs font-medium text-slate-500">Counsellor <span className="text-red-500">*</span></p>
              <Select value={selectedCounsellorId} onValueChange={setSelectedCounsellorId}>
                <SelectTrigger><SelectValue placeholder="Select counsellor" /></SelectTrigger>
                <SelectContent className="max-h-56 overflow-y-auto">
                  {counsellors.map((c) => <SelectItem key={c.id} value={c.id.toString()}>{c.fullName}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setAssignLeadId(null); setSelectedCounsellorId(""); }}>Cancel</Button>
            <Button
              disabled={!selectedCounsellorId || assignMutation.isPending}
              onClick={() => {
                if (assignLeadId && selectedCounsellorId)
                  assignMutation.mutate({ leadId: assignLeadId, counsellorId: Number(selectedCounsellorId) });
              }}
            >
              Assign
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageWrapper>
    {printPortal}
    </>
  );
}
