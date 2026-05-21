import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation } from "wouter";
import { format } from "date-fns";

import { PageWrapper } from "@/layout/PageWrapper";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Users, CheckCircle2, CalendarClock, Calendar, Phone,
  ArrowRightLeft, Trash2,
} from "lucide-react";

import { useAuth } from "@/context/auth-context";
import {
  getLeads,
  getCounsellorIndividualReport,
  type LeadEntity,
  type CounsellorIndividualReport,
} from "@/api/leads.api";
import DateRangePicker from "@/components/payments/DateRangePicker";
import api from "@/lib/api";
import { cn } from "@/lib/utils";
import {
  type LeadDateFilterType,
  leadDateRangeParams,
} from "@/lib/lead-date-range";

const DATE_LABELS: Record<LeadDateFilterType, string> = {
  all: "All", today: "Today", weekly: "Weekly", monthly: "Monthly", custom: "Custom",
};

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];

type LeadTypeLite = { id: number; leadType: string; displayAlias?: string | null };

const progressStatusColors: Record<string, string> = {
  not_contacted: "bg-slate-100 text-slate-600",
  contacted: "bg-blue-100 text-blue-700",
  follow_up: "bg-amber-100 text-amber-700",
  interested: "bg-green-100 text-green-700",
  converted: "bg-emerald-100 text-emerald-700",
  junk: "bg-red-200 text-red-700",
};

export default function CounsellorLeadReport() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();

  const [leads, setLeads] = useState<LeadEntity[]>([]);
  const [report, setReport] = useState<CounsellorIndividualReport | null>(null);
  const [counsellorName, setCounsellorName] = useState("");
  const [leadTypes, setLeadTypes] = useState<LeadTypeLite[]>([]);
  const [loading, setLoading] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [dateFilter, setDateFilter] = useState<LeadDateFilterType>("monthly");
  const [customDateFrom, setCustomDateFrom] = useState<string | undefined>();
  const [customDateTo, setCustomDateTo] = useState<string | undefined>();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 25,
    total: 0,
    totalPages: 1,
  });

  const counsellorId = user?.id;

  const rangeParams = useMemo(
    () => leadDateRangeParams(dateFilter, customDateFrom, customDateTo),
    [dateFilter, customDateFrom, customDateTo]
  );

  useEffect(() => {
    setPage(1);
  }, [dateFilter, customDateFrom, customDateTo, counsellorId]);

  const loadData = useCallback(async () => {
    if (!counsellorId) return;
    try {
      setLoading(true);
      const [reportRes, leadRes, cRes, ltRes] = await Promise.all([
        getCounsellorIndividualReport(rangeParams),
        getLeads({
          currentCounsellorId: counsellorId,
          ...rangeParams,
          page,
          limit: pageSize,
          sortBy: "created_at",
          sortOrder: "desc",
          isJunk: false,
        }),
        api.get("/api/users/counsellors"),
        api.get("/api/lead-types"),
      ]);
      setReport(reportRes);
      setLeads(leadRes.items || []);
      setPagination(
        leadRes.pagination ?? {
          page,
          limit: pageSize,
          total: leadRes.items?.length ?? 0,
          totalPages: 1,
        }
      );
      const cList: { id: number; fullName: string }[] = cRes?.data?.data || cRes?.data || [];
      const me = cList.find((c) => c.id === counsellorId);
      setCounsellorName(me?.fullName || user?.fullName || `Counsellor #${counsellorId}`);
      setLeadTypes(ltRes?.data?.data || ltRes?.data || []);
    } finally {
      setLoading(false);
    }
  }, [counsellorId, rangeParams, page, pageSize, user?.fullName]);

  useEffect(() => { void loadData(); }, [loadData]);

  const stats = report?.stats ?? {
    total: 0,
    inProgress: 0,
    followUp: 0,
    converted: 0,
    dropped: 0,
    notContacted: 0,
    contacted: 0,
  };

  const typeBreakdown = report?.typeBreakdown ?? [];

  const sourceBreakdown = useMemo(() => {
    return (report?.sourceBreakdown ?? []).map((row) => ({
      ...row,
      source:
        leadTypes.find((lt) => lt.leadType === row.source)?.displayAlias?.trim() ||
        row.source.replace(/_/g, " "),
    }));
  }, [report?.sourceBreakdown, leadTypes]);

  const customLabel =
    dateFilter === "custom" && customDateFrom && customDateTo
      ? `${format(new Date(customDateFrom), "d MMM")} – ${format(new Date(customDateTo), "d MMM yyyy")}`
      : null;

  const resolveAlias = (slug: string | null | undefined) => {
    if (!slug) return "—";
    return leadTypes.find((lt) => lt.leadType === slug)?.displayAlias?.trim() || slug.replace(/_/g, " ");
  };

  return (
    <PageWrapper
      title={<span className="text-2xl font-bold">{counsellorName || "My Lead Report"}</span>}
      breadcrumbs={[
        { label: "Leads", href: "/leads/counsellor" },
        { label: "Lead Report" },
      ]}
    >
      <div className="space-y-6">
        <div className="rounded-xl border bg-card shadow-sm p-4 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <p className="text-sm text-muted-foreground">Assigned leads · ID #{counsellorId}</p>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-medium text-muted-foreground">Period:</span>
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
                    {DATE_LABELS[f]}
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
          <div className="flex justify-end">
            <span className="text-xs text-muted-foreground">
              {stats.total} lead{stats.total !== 1 ? "s" : ""} in selected period
            </span>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6">
          {[
            { label: "Total Assigned", value: stats.total, icon: Users, color: "text-blue-600", bg: "bg-blue-50" },
            { label: "In Progress", value: stats.inProgress, icon: ArrowRightLeft, color: "text-indigo-600", bg: "bg-indigo-50" },
            { label: "Follow Up", value: stats.followUp, icon: CalendarClock, color: "text-violet-600", bg: "bg-violet-50" },
            { label: "Converted", value: stats.converted, icon: CheckCircle2, color: "text-emerald-600", bg: "bg-emerald-50" },
            { label: "Dropped", value: stats.dropped, icon: Trash2, color: "text-red-500", bg: "bg-red-50" },
            { label: "Contacted", value: stats.contacted, icon: Phone, color: "text-sky-600", bg: "bg-sky-50" },
          ].map((stat) => (
            <Card key={stat.label} className="shadow-sm">
              <CardContent className="p-4 flex flex-col items-center text-center">
                <div className={cn("p-1.5 rounded-lg mb-2", stat.bg)}>
                  <stat.icon className={cn("w-3.5 h-3.5", stat.color)} />
                </div>
                <p className="text-2xl font-bold tabular-nums">{stat.value}</p>
                <p className="text-xs font-medium text-muted-foreground mt-1">{stat.label}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <Card className="shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold">Lead Type Breakdown</CardTitle>
              <CardDescription className="text-xs">Assigned · Converted · Dropped per type</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div className="max-h-[330px] overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50 hover:bg-muted/50 sticky top-0 z-10">
                      <TableHead className="text-xs uppercase pl-4">Lead Type</TableHead>
                      <TableHead className="text-xs uppercase text-center">Assigned</TableHead>
                      <TableHead className="text-xs uppercase text-center">Converted</TableHead>
                      <TableHead className="text-xs uppercase text-center pr-4">Dropped</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      <TableRow>
                        <TableCell colSpan={4} className="h-20 text-center text-sm text-muted-foreground">
                          Loading…
                        </TableCell>
                      </TableRow>
                    ) : typeBreakdown.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} className="h-20 text-center text-sm text-muted-foreground">
                          No data in this period.
                        </TableCell>
                      </TableRow>
                    ) : (
                      typeBreakdown.map((row) => (
                        <TableRow key={row.type} className="hover:bg-muted/20">
                          <TableCell className="pl-4 text-sm font-medium">{row.type}</TableCell>
                          <TableCell className="text-center tabular-nums">{row.assigned}</TableCell>
                          <TableCell className="text-center tabular-nums text-emerald-600 font-medium">
                            {row.converted}
                          </TableCell>
                          <TableCell className="text-center tabular-nums pr-4 text-red-500">
                            {row.dropped}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold">Lead Source Breakdown</CardTitle>
              <CardDescription className="text-xs">Assigned · Converted · Dropped per source</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div className="max-h-[330px] overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50 hover:bg-muted/50 sticky top-0 z-10">
                      <TableHead className="text-xs uppercase pl-4">Source</TableHead>
                      <TableHead className="text-xs uppercase text-center">Assigned</TableHead>
                      <TableHead className="text-xs uppercase text-center">Converted</TableHead>
                      <TableHead className="text-xs uppercase text-center pr-4">Dropped</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      <TableRow>
                        <TableCell colSpan={4} className="h-20 text-center text-sm text-muted-foreground">
                          Loading…
                        </TableCell>
                      </TableRow>
                    ) : sourceBreakdown.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} className="h-20 text-center text-sm text-muted-foreground">
                          No data in this period.
                        </TableCell>
                      </TableRow>
                    ) : (
                      sourceBreakdown.map((row) => (
                        <TableRow key={row.source} className="hover:bg-muted/20">
                          <TableCell className="pl-4 text-sm font-medium">{row.source}</TableCell>
                          <TableCell className="text-center tabular-nums">{row.assigned}</TableCell>
                          <TableCell className="text-center tabular-nums text-emerald-600 font-medium">
                            {row.converted}
                          </TableCell>
                          <TableCell className="text-center tabular-nums pr-4 text-red-500">
                            {row.dropped}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="shadow-sm">
          <CardHeader>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CardTitle className="text-sm font-semibold">All Assigned Leads</CardTitle>
                <CardDescription className="text-xs">
                  {!loading && pagination.total > 0 ? (
                    <>
                      Showing {(pagination.page - 1) * pagination.limit + 1}–
                      {Math.min(pagination.page * pagination.limit, pagination.total)} of{" "}
                      <span className="font-medium text-foreground">{pagination.total}</span> in period
                    </>
                  ) : (
                    "Click a row to view lead details"
                  )}
                </CardDescription>
              </div>
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
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50 hover:bg-muted/50">
                    <TableHead className="text-xs uppercase pl-4">Name</TableHead>
                    <TableHead className="text-xs uppercase">Phone</TableHead>
                    <TableHead className="text-xs uppercase">Lead Type</TableHead>
                    <TableHead className="text-xs uppercase">Source</TableHead>
                    <TableHead className="text-xs uppercase">Progress</TableHead>
                    <TableHead className="text-xs uppercase">Assignment</TableHead>
                    <TableHead className="text-xs uppercase">Created</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={7} className="h-24 text-center text-sm text-muted-foreground">
                        Loading…
                      </TableCell>
                    </TableRow>
                  ) : leads.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="h-24 text-center text-sm text-muted-foreground">
                        No leads in this period.
                      </TableCell>
                    </TableRow>
                  ) : (
                    leads.map((lead) => (
                      <TableRow
                        key={lead.id}
                        className="cursor-pointer hover:bg-muted/30 transition-colors"
                        onClick={() => setLocation(`/leads/${lead.id}`)}
                      >
                        <TableCell className="pl-4">
                          <span className="text-sm font-semibold">{lead.fullName}</span>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">{lead.phone}</TableCell>
                        <TableCell className="text-sm">{lead.leadType || "—"}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {resolveAlias(lead.leadSource)}
                        </TableCell>
                        <TableCell>
                          <span
                            className={cn(
                              "text-[10px] font-medium px-2 py-0.5 rounded-full capitalize",
                              progressStatusColors[lead.progressStatus] || "bg-gray-100 text-gray-600"
                            )}
                          >
                            {lead.progressStatus.replace(/_/g, " ")}
                          </span>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary" className="capitalize text-[10px]">
                            {lead.assignmentStatus.replace(/_/g, " ")}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {format(new Date(lead.createdAt), "dd MMM yyyy")}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
              {!loading && pagination.totalPages > 1 && (
                <div className="flex items-center justify-between gap-3 border-t px-4 py-3">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page <= 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                  >
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
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <Dialog open={showDatePicker} onOpenChange={setShowDatePicker}>
        <DialogContent className="p-0 max-w-[800px] overflow-hidden rounded-xl border-0">
          <DialogTitle className="sr-only">Select Date Range</DialogTitle>
          <DateRangePicker
            onApply={(_, s, e) => {
              if (s && e) {
                setCustomDateFrom(s);
                setCustomDateTo(e);
                setDateFilter("custom");
              }
              setShowDatePicker(false);
            }}
            onCancel={() => setShowDatePicker(false)}
          />
        </DialogContent>
      </Dialog>
    </PageWrapper>
  );
}
