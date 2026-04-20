import { PageWrapper } from "@/layout/PageWrapper";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/auth-context";
import { useLocation } from "wouter";
import { clientService, type ReportsResponse, type CounsellorPerformanceRow, type ManagerDataRow } from "@/services/clientService";
import { useQuery } from "@tanstack/react-query";
import { useState, useMemo, useEffect } from "react";
import { format, startOfMonth, endOfMonth, parseISO } from "date-fns";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import {
  Users,
  Package,
  Target,
  CalendarIcon,
  Loader2,
  FileBarChart,
} from "lucide-react";
import { ReportsSkeleton } from "@/components/ui/page-skeletons";
import { Popover, PopoverContent, PopoverAnchor } from "@/components/ui/popover";
import DateRangePicker from "@/components/payments/DateRangePicker";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

const PERIOD_TABS = ["Today", "Weekly", "Monthly", "Yearly", "Custom"] as const;
type PeriodTab = (typeof PERIOD_TABS)[number];

const PERIOD_TO_FILTER: Record<PeriodTab, "today" | "weekly" | "monthly" | "yearly" | "custom"> = {
  Today: "today",
  Weekly: "weekly",
  Monthly: "monthly",
  Yearly: "yearly",
  Custom: "custom",
};

function getDefaultDateRange(): [Date, Date] {
  const now = new Date();
  return [startOfMonth(now), endOfMonth(now)];
}

function toYMD(d: Date): string {
  return format(d, "yyyy-MM-dd");
}

export default function Reports() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [dateRange, setDateRange] = useState<[Date | null, Date | null]>(() => {
    const [s, e] = getDefaultDateRange();
    return [s, e];
  });
  const [periodTab, setPeriodTab] = useState<PeriodTab>("Monthly");
  const [customOpen, setCustomOpen] = useState(false);
  // Custom range is only applied when user clicks Apply (not when they just open the dropdown)
  const [appliedCustomRange, setAppliedCustomRange] = useState<[Date, Date] | null>(null);

  const isCustom = periodTab === "Custom";
  // For non-custom tabs use dateRange; for custom use appliedCustomRange (set on Apply)
  const filterStart = isCustom && appliedCustomRange
    ? appliedCustomRange[0]
    : dateRange[0] ?? startOfMonth(new Date());
  const filterEnd = isCustom && appliedCustomRange
    ? appliedCustomRange[1]
    : dateRange[1] ?? endOfMonth(new Date());
  const startYMD = toYMD(filterStart);
  const endYMD = toYMD(filterEnd);
  const apiFilter = PERIOD_TO_FILTER[periodTab];

  // When Custom is open but not yet applied, keep showing previous period's data (don't hide report)
  const [lastNonCustomFilter, setLastNonCustomFilter] = useState<"today" | "weekly" | "monthly" | "yearly">("monthly");
  const [lastNonCustomStart, setLastNonCustomStart] = useState<string>(() => toYMD(startOfMonth(new Date())));
  const [lastNonCustomEnd, setLastNonCustomEnd] = useState<string>(() => toYMD(endOfMonth(new Date())));
  const effectiveFilter = isCustom && appliedCustomRange ? "custom" : isCustom ? lastNonCustomFilter : apiFilter;
  const effectiveStart = isCustom && appliedCustomRange ? startYMD : isCustom ? lastNonCustomStart : startYMD;
  const effectiveEnd = isCustom && appliedCustomRange ? endYMD : isCustom ? lastNonCustomEnd : endYMD;
  const canFetch = true;

  // Keep "last non-custom" in sync when user is on a preset tab
  useEffect(() => {
    if (periodTab !== "Custom" && apiFilter !== "custom") {
      setLastNonCustomFilter(apiFilter);
      setLastNonCustomStart(startYMD);
      setLastNonCustomEnd(endYMD);
    }
  }, [periodTab, apiFilter, startYMD, endYMD]);

  // Sale type filter for Intelligence Dashboard (admin): when set, main report is filtered by sale type
  const [dashboardSaleTypeId, setDashboardSaleTypeId] = useState<number | null>(null);

  const { data: report, isLoading, error } = useQuery({
 //   queryKey: ["reports", effectiveFilter, effectiveFilter === "custom" ? effectiveStart : null, effectiveFilter === "custom" ? effectiveEnd : null, dashboardSaleTypeId],
 queryKey: [
  "reports",
  effectiveFilter,
  effectiveStart ?? "no-start",
  effectiveEnd ?? "no-end",
  dashboardSaleTypeId ?? "all",
],  
 queryFn: () =>
      clientService.getReports({
        filter: effectiveFilter as "today" | "weekly" | "monthly" | "yearly" | "custom",
        ...(effectiveFilter === "custom" && effectiveStart && effectiveEnd
          ? { afterDate: effectiveStart, beforeDate: effectiveEnd }
          : {}),
        ...(dashboardSaleTypeId != null && dashboardSaleTypeId > 0 ? { saleTypeId: dashboardSaleTypeId } : {}),
      }),
    staleTime: 1000 * 60 * 2,
    enabled: canFetch && (effectiveFilter !== "custom" || !!(effectiveStart && effectiveEnd)),
  });

  const isAdmin = user?.role === "superadmin" || user?.role === "director";
  const isManager = user?.role === "manager";
  const isCounsellor = user?.role === "counsellor";

  // Counsellors should always see their own dedicated report page
  useEffect(() => {
    if (isCounsellor) {
      setLocation("/reports/counsellor/me");
    }
  }, [isCounsellor, setLocation]);

  // Load sale types for admin and manager (Intelligence Dashboard sale type filter)
  const [dashboardSaleTypes, setDashboardSaleTypes] = useState<Array<{ id: number; sale_type: string }>>([]);
  useEffect(() => {
    if (!isAdmin && !isManager) return;
    let cancelled = false;
    clientService.getSaleTypes().then((types: Array<{ id: number; sale_type: string }>) => {
      if (!cancelled) setDashboardSaleTypes(types);
    }).catch((err: unknown) => console.error("Failed to load sale types", err));
    return () => { cancelled = true; };
  }, [isAdmin, isManager]);

  // Apply period presets when tab changes (except Custom)
  const handlePeriodChange = (tab: string) => {
    setPeriodTab(tab as PeriodTab);
    if (tab === "Custom") {
      setCustomOpen(true);
      return; // Don't fetch until user clicks Apply
    }
    setAppliedCustomRange(null);
    const now = new Date();
    let start: Date;
    let end: Date;
    if (tab === "Today") {
      start = end = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    } else if (tab === "Weekly") {
      const day = now.getDay();
      const diff = now.getDate() - day + (day === 0 ? -6 : 1);
      start = new Date(now.getFullYear(), now.getMonth(), diff);
      end = new Date(start);
      end.setDate(end.getDate() + 6);
    } else if (tab === "Monthly") {
      start = startOfMonth(now);
      end = endOfMonth(now);
    } else {
      start = new Date(now.getFullYear(), 0, 1);
      end = new Date(now.getFullYear(), 11, 31);
    }
    setDateRange([start, end]);
  };

  const handlePickerApply = (_filter: string, startDate?: string, endDate?: string) => {
    if (startDate && endDate) {
      const s = parseISO(startDate);
      const e = parseISO(endDate);
      setDateRange([s, e]);
      setAppliedCustomRange([s, e]);
      setPeriodTab("Custom");
    }
    setCustomOpen(false);
  };

  const handlePickerCancel = () => setCustomOpen(false);

  const counsellorList = report?.counsellor_performance ?? [];
  const managerList = report?.manager_data ?? [];
  const hasReport = !!report;

  // For counsellor: show only current user's row (match by name or id if available)
  const currentUserCounsellorList = useMemo(() => {
    if (!isCounsellor || !user?.name) return counsellorList;
    return counsellorList.filter((c) => c.full_name === user.name);
  }, [isCounsellor, user?.name, counsellorList]);

  // For manager: show only their manager_data (match by manager name)
  const currentManagerData = useMemo(() => {
    if (!isManager || !user?.name) return managerList;
    return managerList.filter((m) => m.manager_name === user.name);
  }, [isManager, user?.name, managerList]);

  if (isLoading) {
    return (
      <PageWrapper title="Reports" breadcrumbs={[{ label: "Reports" }]}>
        <ReportsSkeleton />
      </PageWrapper>
    );
  }

  if (error) {
    return (
      <PageWrapper title="Reports" breadcrumbs={[{ label: "Reports" }]}>
        <div className="flex min-h-[320px] items-center justify-center rounded-2xl border border-destructive/20 bg-destructive/5 py-12">
          <p className="text-sm font-medium text-destructive">Error loading reports. Please try again.</p>
        </div>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper
      title="Reports"
      breadcrumbs={[{ label: "Reports" }]}
      actions={
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
          {/* Period pills — wrap on small screens */}
          <div className="flex flex-wrap items-center gap-1 rounded-xl bg-muted/40 p-1.5 ring-1 ring-border/50">
            {PERIOD_TABS.map((tab) => (
              <Button
                key={tab}
                variant={periodTab === tab ? "default" : "ghost"}
                size="sm"
                onClick={() => handlePeriodChange(tab)}
                className={cn(
                  "min-w-0 rounded-lg text-xs font-medium transition-all sm:text-sm",
                  periodTab === tab
                    ? "shadow-sm"
                    : "text-muted-foreground hover:bg-background/80 hover:text-foreground"
                )}
              >
                {tab}
              </Button>
            ))}
          </div>
          <Popover open={customOpen} onOpenChange={setCustomOpen}>
            <PopoverAnchor asChild>
              <div
                role="presentation"
                className="inline-flex h-9 w-full cursor-default items-center justify-center gap-2 rounded-xl border border-border/60 bg-background px-3 py-2 text-sm font-semibold shadow-sm sm:w-auto"
              >
                <CalendarIcon className="h-4 w-4 shrink-0" aria-hidden />
                <span className="truncate">
                  {isCustom && appliedCustomRange
                    ? `${format(appliedCustomRange[0], "d MMM yyyy")} – ${format(appliedCustomRange[1], "d MMM yyyy")}`
                    : dateRange[0] && dateRange[1]
                      ? `${format(dateRange[0], "d MMM yyyy")} – ${format(dateRange[1], "d MMM yyyy")}`
                      : "Select dates"}
                </span>
              </div>
            </PopoverAnchor>
            <PopoverContent align="end" className="w-auto p-0">
              <DateRangePicker onApply={handlePickerApply} onCancel={handlePickerCancel} />
            </PopoverContent>
          </Popover>
        </div>
      }
    >
      <div className="space-y-6 md:space-y-8">
        {/* —— ADMIN / MANAGER: Intelligence Dashboard (with sale type filter) —— */}
        {(isAdmin || isManager) && hasReport && (
          <IntelligenceDashboard
            report={report}
            counsellorList={counsellorList}
            saleTypes={dashboardSaleTypes}
            saleTypeId={dashboardSaleTypeId}
            onSaleTypeChange={setDashboardSaleTypeId}
          />
        )}

        {/* —— MANAGER: Target vs Achieved —— */}
        {isManager && currentManagerData.length > 0 && (
          <ManagerTargetSection managerData={currentManagerData} />
        )}

        {/* —— Counsellor Performance (Admin: all; Manager: team; Counsellor: self) —— */}
        {hasReport && (
          <CounsellorPerformanceSection
            list={
              isCounsellor
                ? currentUserCounsellorList
                : isManager && currentManagerData.length > 0
                  ? getTeamCounsellorsFromManager(currentManagerData)
                  : counsellorList
            }
            report={report}
            isSingleCounsellor={isCounsellor && currentUserCounsellorList.length <= 1}
            onCounsellorClick={isAdmin || isManager ? (c) => setLocation(`/reports/counsellor/${c.counsellor_id}`) : undefined}
          />
        )}

        {/* —— ADMIN: Product Wise Analytics —— */}
        {isAdmin && hasReport && (
          <ProductWiseAnalytics report={report} counsellorList={counsellorList} />
        )}
      </div>
    </PageWrapper>
  );
}

function getTeamCounsellorsFromManager(managerData: ManagerDataRow[]): CounsellorPerformanceRow[] {
  const byId = new Map<number, CounsellorPerformanceRow>();
  for (const m of managerData) {
    for (const c of m.achieved_by_counsellor) {
      if (byId.has(c.counsellor_id)) continue;
      const totalRev =
        c.core_sale_achieved_revenue +
        c.core_product_achieved_revenue +
        c.other_product_achieved_revenue;
      const clients = c.core_sale_achieved_clients;
      byId.set(c.counsellor_id, {
        counsellor_id: c.counsellor_id,
        full_name: c.full_name,
        email: c.email,
        total_enrollments: clients,
        core_sale_revenue: c.core_sale_achieved_revenue,
        core_product_revenue: c.core_product_achieved_revenue,
        other_product_revenue: c.other_product_achieved_revenue,
        total_revenue: totalRev,
        average_revenue_per_client: clients > 0 ? totalRev / clients : 0,
        pending_amount: c.pending_amount ?? 0,
        archived_count: 0,
      });
    }
  }
  return Array.from(byId.values());
}

function formatCurrency(n: number): string {
  return `₹${n.toLocaleString("en-IN")}`;
}

function IntelligenceDashboard({
  report,
  counsellorList,
  saleTypes,
  saleTypeId,
  onSaleTypeChange,
}: {
  report: ReportsResponse;
  counsellorList: CounsellorPerformanceRow[];
  saleTypes: Array<{ id: number; sale_type: string }>;
  saleTypeId: number | null;
  onSaleTypeChange: (id: number | null) => void;
}) {
  const totalRevenue = counsellorList.reduce((s, c) => s + c.total_revenue, 0);
  const otherProductRevenue = counsellorList.reduce(
    (s, c) => s + c.other_product_revenue,
    0
  );
  const totalSaleTypeCount = counsellorList.reduce(
    (s, c) => s + (c.sale_type_count ?? 0),
    0
  );
  const selectedSaleTypeName =
    saleTypeId != null
      ? saleTypes.find((st) => st.id === saleTypeId)?.sale_type ?? "Selected"
      : "All sale types";
  // Single ranking: highest revenue first (same order as the bar chart)
  const allCounsellorsByRevenue = [...counsellorList].sort(
    (a, b) => b.total_revenue - a.total_revenue,
  );
  const counsellorCount = counsellorList.length;

  // One bar per counsellor; long names truncated with "..." so every label fits and shows (no blank space)
  const MAX_NAME_LEN = 14;
  const truncateName = (s: string) =>
    s.length > MAX_NAME_LEN ? `${s.slice(0, MAX_NAME_LEN).trim()}...` : s;
  const counsellorRevenueMap = new Map<number, { fullName: string; revenue: number }>();
  for (const c of counsellorList) {
    const existing = counsellorRevenueMap.get(c.counsellor_id);
    const revenue = (existing?.revenue ?? 0) + c.total_revenue;
    const fullName = c.full_name?.trim() || `Counsellor ${c.counsellor_id}`;
    counsellorRevenueMap.set(c.counsellor_id, { fullName: existing?.fullName ?? fullName, revenue });
  }
  const revenueChartData = Array.from(counsellorRevenueMap.entries())
    .map(([, v]) => ({
      name: truncateName(v.fullName),
      fullName: v.fullName,
      revenue: v.revenue,
    }))
    .sort((a, b) => b.revenue - a.revenue);

  return (
    <Card className="overflow-hidden rounded-2xl border border-border/60 bg-card shadow-sm">
      <CardHeader className="flex flex-col gap-3 border-b border-border/40 bg-muted/20 pb-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <CardTitle className="flex items-center gap-2 text-lg font-semibold tracking-tight sm:text-xl">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <FileBarChart className="h-5 w-5" />
            </span>
            Intelligence Dashboard (Admin)
          </CardTitle>
          <CardDescription className="text-muted-foreground">
            {report.filter_start_date} → {report.filter_end_date}
          </CardDescription>
        </div>
        {/* <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-muted-foreground whitespace-nowrap">Sale type</span>
          <Select
            value={saleTypeId != null ? String(saleTypeId) : "all"}
            onValueChange={(v) => onSaleTypeChange(v === "all" ? null : Number(v))}
          >
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="All sale types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All sale types</SelectItem>
              {saleTypes.map((st) => (
                <SelectItem key={st.id} value={String(st.id)}>
                  {st.sale_type}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div> */}
        <div className="flex items-center gap-2">
  <span className="text-sm font-medium text-muted-foreground whitespace-nowrap">Sale type</span>
  <Select
    value={saleTypeId != null ? String(saleTypeId) : "all"}
    onValueChange={(v) => onSaleTypeChange(v === "all" ? null : Number(v))}
  >
    <SelectTrigger className="w-[200px]">
      <SelectValue placeholder="All sale types" />
    </SelectTrigger>
    <SelectContent className="max-h-[300px] overflow-y-auto">
      <SelectItem value="all">All sale types</SelectItem>
      {saleTypes.map((st) => (
        <SelectItem key={st.id} value={String(st.id)}>
          {st.sale_type}
        </SelectItem>
      ))}
    </SelectContent>
  </Select>
</div>
      </CardHeader>
      <CardContent className="space-y-6 p-4 sm:p-6">
        <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-xl border border-border/50 bg-gradient-to-br from-card to-muted/20 p-4 shadow-sm">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Total Company Revenue</p>
            <p className="mt-1 text-xl font-bold tabular-nums text-foreground sm:text-2xl">
              {formatCurrency(totalRevenue)}
            </p>
          </div>
          <div className="rounded-xl border border-border/50 bg-gradient-to-br from-card to-muted/20 p-4 shadow-sm">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Third Party Collection</p>
            <p className="mt-1 text-xl font-bold tabular-nums text-foreground sm:text-2xl">
              {formatCurrency(otherProductRevenue)}
            </p>
          </div>
          <div className="rounded-xl border border-border/50 bg-gradient-to-br from-card to-muted/20 p-4 shadow-sm">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Total Sale Type Count</p>
            <p className="mt-1 text-xl font-bold tabular-nums text-foreground sm:text-2xl">{totalSaleTypeCount}</p>
            <p className="mt-0.5 text-xs text-muted-foreground">{selectedSaleTypeName}</p>
          </div>
          <div className="rounded-xl border border-border/50 bg-gradient-to-br from-card to-muted/20 p-4 shadow-sm">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Counsellors</p>
            <p className="mt-1 text-xl font-bold tabular-nums text-foreground sm:text-2xl">{counsellorCount}</p>
            <p className="mt-0.5 text-xs text-muted-foreground">Listed below by revenue</p>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-xl border border-border/50 bg-card p-4 shadow-sm">
            <h4 className="mb-3 text-sm font-semibold text-foreground">
              Revenue per Counsellor
            </h4>
            <div
              style={{
                height: Math.min(520, Math.max(220, (revenueChartData.length || 1) * 28 + 72)),
              }}
              className="w-full"
            >
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={revenueChartData} layout="vertical" margin={{ left: 8, right: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={true} vertical={false} />
                  <XAxis
                    type="number"
                    tickFormatter={(v) => `₹${v / 1000}k`}
                    fontSize={11}
                    tickLine={false}
                  />
                  <YAxis
                    type="category"
                    dataKey="name"
                    width={110}
                    fontSize={11}
                    tickLine={false}
                    interval={0}
                    tick={{ fill: "hsl(var(--foreground))" }}
                  />
                  <Tooltip
                    contentStyle={{ borderRadius: "12px", border: "1px solid hsl(var(--border))" }}
                    formatter={(v: number, _name, props: { payload?: { fullName?: string } }) => [
                      formatCurrency(v),
                      (props?.payload as { fullName?: string } | undefined)?.fullName ?? "Revenue",
                    ]}
                    labelFormatter={(label) => (revenueChartData.find((d) => d.name === label)?.fullName ?? label)}
                  />
                  <Bar dataKey="revenue" fill="hsl(var(--primary))" radius={[0, 6, 6, 0]} name="Revenue" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div className="rounded-xl border border-border/50 bg-card p-4 shadow-sm">
            <h4 className="mb-3 text-sm font-semibold text-foreground">
              All counsellors (by revenue)
            </h4>
            <ul className="max-h-[min(520px,60vh)] space-y-2 overflow-y-auto pr-1">
              {allCounsellorsByRevenue.map((c, i) => (
                <li
                  key={`${c.counsellor_id}-${i}`}
                  className="flex items-center justify-between rounded-lg bg-muted/30 px-3 py-2 text-sm"
                >
                  <span className="flex min-w-0 flex-1 items-center gap-2 truncate">
                    <Badge
                      variant="secondary"
                      className="h-6 min-w-6 shrink-0 justify-center rounded-full px-1.5 font-semibold"
                    >
                      {i + 1}
                    </Badge>
                    <span className="truncate">{c.full_name}</span>
                  </span>
                  <span className="ml-2 shrink-0 font-semibold tabular-nums">
                    {formatCurrency(c.total_revenue)}
                  </span>
                </li>
              ))}
              {allCounsellorsByRevenue.length === 0 && (
                <li className="py-4 text-center text-sm text-muted-foreground">No data</li>
              )}
            </ul>
          </div>
        </div>

        <p className="text-xs text-muted-foreground">
          Revenue Trend (monthly graph), Most Selling Product, and Highest Profit Product
          require additional API data; currently derived from report period totals.
        </p>
      </CardContent>
    </Card>
  );
}

function ManagerTargetSection({ managerData }: { managerData: ManagerDataRow[] }) {
  return (
    <Card className="overflow-hidden rounded-2xl border border-border/60 bg-card shadow-sm">
      <CardHeader className="border-b border-border/40 bg-muted/20 pb-4">
        <CardTitle className="flex items-center gap-2 text-lg font-semibold tracking-tight sm:text-xl">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Target className="h-5 w-5" />
          </span>
          Manager Target vs Achieved
        </CardTitle>
        <CardDescription className="text-muted-foreground">Your team performance against targets</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6 p-4 sm:p-6">
        {managerData.map((m) => (
          <div key={m.manager_id} className="space-y-4 rounded-xl border border-border/50 bg-muted/10 p-4">
            <h3 className="text-base font-semibold text-foreground sm:text-lg">{m.manager_name}</h3>
            <div className="grid gap-3 grid-cols-1 sm:grid-cols-3">
              <div className="rounded-xl border border-border/50 bg-card p-4 shadow-sm">
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Core Sale</p>
                <p className="mt-1 text-sm font-medium">Clients: {m.achieved.coreSale.clients} / {m.target_core_sale_clients}</p>
                <p className="text-sm font-semibold tabular-nums">{formatCurrency(m.achieved.coreSale.revenue)}</p>
              </div>
              <div className="rounded-xl border border-border/50 bg-card p-4 shadow-sm">
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Core Product</p>
                <p className="mt-1 text-sm font-medium">Clients: {m.achieved.coreProduct.clients} / {m.target_core_product_clients}</p>
                <p className="text-sm font-semibold tabular-nums">{formatCurrency(m.achieved.coreProduct.revenue)}</p>
              </div>
              <div className="rounded-xl border border-border/50 bg-card p-4 shadow-sm">
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Other Product</p>
                <p className="mt-1 text-sm font-medium">Clients: {m.achieved.otherProduct.clients} / {m.target_other_product_clients}</p>
                <p className="text-sm font-semibold tabular-nums">{formatCurrency(m.achieved.otherProduct.revenue)}</p>
              </div>
            </div>
            <div className="overflow-hidden rounded-xl border border-border/50">
              <h4 className="border-b border-border/40 bg-muted/20 px-4 py-2 text-sm font-semibold text-foreground">Achieved by Counsellor</h4>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="font-semibold">Counsellor</TableHead>
                      <TableHead className="text-right font-semibold">Core Sale</TableHead>
                      <TableHead className="text-right font-semibold">Core Product</TableHead>
                      <TableHead className="text-right font-semibold">Other</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {m.achieved_by_counsellor.map((c) => (
                      <TableRow key={c.counsellor_id} className="hover:bg-muted/30">
                        <TableCell className="font-medium">{c.full_name}</TableCell>
                        <TableCell className="text-right text-sm tabular-nums">
                          {c.core_sale_achieved_clients} / {formatCurrency(c.core_sale_achieved_revenue)}
                        </TableCell>
                        <TableCell className="text-right text-sm tabular-nums">
                          {c.core_product_achieved_clients} / {formatCurrency(c.core_product_achieved_revenue)}
                        </TableCell>
                        <TableCell className="text-right text-sm tabular-nums">
                          {c.other_product_achieved_clients} / {formatCurrency(c.other_product_achieved_revenue)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function CounsellorPerformanceSection({
  list,
  report,
  isSingleCounsellor,
  onCounsellorClick,
}: {
  list: CounsellorPerformanceRow[];
  report: ReportsResponse;
  isSingleCounsellor: boolean;
  onCounsellorClick?: (c: CounsellorPerformanceRow) => void;
}) {
  const ranked = useMemo(() => {
    const sorted = [...list].sort((a, b) => b.total_revenue - a.total_revenue);
    return sorted.map((c, i) => ({ ...c, rank: i + 1 }));
  }, [list]);

  return (
    <Card className="overflow-hidden rounded-2xl border border-border/60 bg-card shadow-sm">
      <CardHeader className="border-b border-border/40 bg-muted/20 pb-4">
        <CardTitle className="flex items-center gap-2 text-lg font-semibold tracking-tight sm:text-xl">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Users className="h-5 w-5" />
          </span>
          Counsellor Performance Report
        </CardTitle>
        <CardDescription className="text-muted-foreground">
          {report.filter_start_date} → {report.filter_end_date}
          {isSingleCounsellor ? " — Your performance" : ""}
        </CardDescription>
      </CardHeader>
      <CardContent className="p-0 sm:p-6 sm:pt-4">
        <div className="overflow-x-auto -mx-4 sm:mx-0 rounded-b-2xl">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent border-b border-border/60">
                {!isSingleCounsellor && <TableHead className="w-14 font-semibold">Rank</TableHead>}
                <TableHead className="min-w-[140px] font-semibold">Counsellor</TableHead>
                <TableHead className="text-right font-semibold whitespace-nowrap">Enrollments</TableHead>
                <TableHead className="text-right font-semibold whitespace-nowrap">Sale Type Count</TableHead>
                <TableHead className="text-right font-semibold whitespace-nowrap">Core Sale Rev</TableHead>
                <TableHead className="text-right font-semibold whitespace-nowrap">Core Product Rev</TableHead>
                <TableHead className="text-right font-semibold whitespace-nowrap">Other Rev</TableHead>
                <TableHead className="text-right font-semibold whitespace-nowrap">Total Revenue</TableHead>
                <TableHead className="text-right font-semibold whitespace-nowrap">Pending Amount</TableHead>
                <TableHead className="text-right font-semibold whitespace-nowrap">Avg/Client</TableHead>
                <TableHead className="text-right font-semibold whitespace-nowrap">Archived</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {ranked.map((c) => (
                <TableRow
                  key={c.counsellor_id}
                  className={cn(
                    "hover:bg-muted/30 border-b border-border/40",
                    onCounsellorClick && "cursor-pointer"
                  )}
                  onClick={onCounsellorClick ? () => onCounsellorClick(c) : undefined}
                >
                  {!isSingleCounsellor && (
                    <TableCell>
                      <Badge variant="secondary" className="rounded-full font-semibold">{c.rank}</Badge>
                    </TableCell>
                  )}
                  <TableCell className="min-w-[140px]">
                    <div>
                      <p className="font-medium text-foreground">{c.full_name}</p>
                      <p className="text-xs text-muted-foreground truncate max-w-[180px]">{c.email}</p>
                    </div>
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{c.total_enrollments}</TableCell>
                  <TableCell className="text-right tabular-nums">{c.sale_type_count}</TableCell>
                  <TableCell className="text-right text-sm tabular-nums">{formatCurrency(c.core_sale_revenue)}</TableCell>
                  <TableCell className="text-right text-sm tabular-nums">{formatCurrency(c.core_product_revenue)}</TableCell>
                  <TableCell className="text-right text-sm tabular-nums">{formatCurrency(c.other_product_revenue)}</TableCell>
                  <TableCell className="text-right font-semibold tabular-nums">{formatCurrency(c.total_revenue)}</TableCell>
                  <TableCell className="text-right text-sm tabular-nums">{formatCurrency(Number(c.pending_amount) || 0)}</TableCell>
                  <TableCell className="text-right text-sm tabular-nums">{formatCurrency(c.average_revenue_per_client)}</TableCell>
                  <TableCell className="text-right tabular-nums">{c.archived_count}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        {ranked.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <p className="text-sm font-medium text-muted-foreground">No counsellor performance data for this period.</p>
          </div>
        )}
        <div className="border-t border-border/40 px-4 py-3 sm:px-6">
          <p className="text-xs text-muted-foreground">
            Conversion Rate (Leads → Core Sale): N/A. Monthly comparison (This Month vs Last
            Month, Growth %, Target vs Achieved %) can be added when API provides previous
            period or target data.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

function ProductWiseAnalytics({
  report,
  counsellorList,
}: {
  report: ReportsResponse;
  counsellorList: CounsellorPerformanceRow[];
}) {
  const totalCoreSaleRevenue = counsellorList.reduce(
    (s, c) => s + c.core_sale_revenue,
    0
  );
  const totalCoreSaleClients = counsellorList.reduce(
    (s, c) => s + c.total_enrollments,
    0
  );
  const totalCoreProductRevenue = counsellorList.reduce(
    (s, c) => s + c.core_product_revenue,
    0
  );
  const totalOtherRevenue = counsellorList.reduce(
    (s, c) => s + c.other_product_revenue,
    0
  );

  const coreSaleSorted = [...counsellorList].sort(
    (a, b) => b.core_sale_revenue - a.core_sale_revenue
  );
  const topCoreSale = coreSaleSorted[0];
  const lowCoreSale = coreSaleSorted.filter((c) => c.core_sale_revenue > 0).pop();

  const avgTicketCoreSale =
    totalCoreSaleClients > 0 ? totalCoreSaleRevenue / totalCoreSaleClients : 0;

  return (
    <Card className="overflow-hidden rounded-2xl border border-border/60 bg-card shadow-sm">
      <CardHeader className="border-b border-border/40 bg-muted/20 pb-4">
        <CardTitle className="flex items-center gap-2 text-lg font-semibold tracking-tight sm:text-xl">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Package className="h-5 w-5" />
          </span>
          Product Wise Analytics
        </CardTitle>
        <CardDescription className="text-muted-foreground">
          {report.filter_start_date} → {report.filter_end_date}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6 p-4 sm:p-6">
        <Tabs defaultValue="core-sale" className="w-full">
          <TabsList className="grid w-full grid-cols-3 rounded-xl bg-muted/40 p-1 h-auto gap-1">
            <TabsTrigger value="core-sale" className="rounded-lg py-2 text-xs font-medium sm:text-sm">Core Sale</TabsTrigger>
            <TabsTrigger value="core-product" className="rounded-lg py-2 text-xs font-medium sm:text-sm">Core Product</TabsTrigger>
            <TabsTrigger value="other" className="rounded-lg py-2 text-xs font-medium sm:text-sm">Other Products</TabsTrigger>
          </TabsList>

          <TabsContent value="core-sale" className="space-y-4 mt-4">
            <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-xl border border-border/50 bg-gradient-to-br from-card to-muted/20 p-4 shadow-sm">
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Total Core Sales (clients)</p>
                <p className="mt-1 text-xl font-bold tabular-nums">{totalCoreSaleClients}</p>
              </div>
              <div className="rounded-xl border border-border/50 bg-gradient-to-br from-card to-muted/20 p-4 shadow-sm">
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Revenue from Core Sales</p>
                <p className="mt-1 text-xl font-bold tabular-nums">{formatCurrency(totalCoreSaleRevenue)}</p>
              </div>
              <div className="rounded-xl border border-border/50 bg-gradient-to-br from-card to-muted/20 p-4 shadow-sm">
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Top Counsellor (Core Sale)</p>
                <p className="mt-1 text-sm font-medium truncate">
                  {topCoreSale ? `${topCoreSale.full_name} (${formatCurrency(topCoreSale.core_sale_revenue)})` : "—"}
                </p>
              </div>
              <div className="rounded-xl border border-border/50 bg-gradient-to-br from-card to-muted/20 p-4 shadow-sm">
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Low Performing</p>
                <p className="mt-1 text-sm font-medium">{lowCoreSale ? lowCoreSale.full_name : "—"}</p>
              </div>
            </div>
            <div className="rounded-xl border border-border/50 bg-card p-4 shadow-sm">
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Average Ticket Size (Core Sale)</p>
              <p className="mt-1 text-xl font-bold tabular-nums">{formatCurrency(avgTicketCoreSale)}</p>
            </div>
          </TabsContent>

          <TabsContent value="core-product" className="space-y-4 mt-4">
            <div className="rounded-xl border border-border/50 bg-gradient-to-br from-card to-muted/20 p-4 shadow-sm">
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Total Core Product Revenue</p>
              <p className="mt-1 text-xl font-bold tabular-nums">{formatCurrency(totalCoreProductRevenue)}</p>
            </div>
            <p className="text-sm text-muted-foreground">
              Product Name, Total Sold, Attachment Rate require product-level API data.
              Aggregate revenue above.
            </p>
          </TabsContent>

          <TabsContent value="other" className="space-y-4 mt-4">
            <div className="rounded-xl border border-border/50 bg-gradient-to-br from-card to-muted/20 p-4 shadow-sm">
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Other Product Revenue (Company + Third Party aggregate)
              </p>
              <p className="mt-1 text-xl font-bold tabular-nums">{formatCurrency(totalOtherRevenue)}</p>
            </div>
            <p className="text-sm text-muted-foreground">
              Split into Company Revenue Products (SOWP, Work Permit Extension, etc.) and
              Third Party (SIM, Insurance, Beacon) with commission requires additional API
              fields.
            </p>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
