import { useQuery } from "@tanstack/react-query";
import { PageWrapper } from "@/layout/PageWrapper";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useMemo, useState, useEffect } from "react";
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  startOfYear,
  endOfYear,
} from "date-fns";
import {
  Users,
  CalendarIcon,
  IndianRupee,
  ChevronDown,
  Loader2,
} from "lucide-react";
import { DateInput } from "@/components/ui/date-input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { clientService } from "@/services/clientService";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid as RechartsCartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceDot,
} from "recharts";
import { StatCard } from "@/components/cards/StatCard";

type FilterTab = "Today" | "Weekly" | "Monthly" | "Yearly" | "Custom";
const TAB_TO_API_FILTER: Record<FilterTab, "today" | "weekly" | "monthly" | "yearly" | "custom"> = {
  Today: "today",
  Weekly: "weekly",
  Monthly: "monthly",
  Yearly: "yearly",
  Custom: "custom",
};

function toYMD(date: Date): string {
  return format(date, "yyyy-MM-dd");
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatAxisNumber(value: number): string {
  if (!Number.isFinite(value)) return "0";
  const abs = Math.abs(value);
  if (abs >= 10000000) return `${(value / 10000000).toFixed(1)}Cr`;
  if (abs >= 100000) return `${(value / 100000).toFixed(1)}L`;
  if (abs >= 1000) return `${Math.round(value / 1000)}k`;
  return String(Math.round(value));
}

function parseAmount(raw: string | number): number {
  if (typeof raw === "number") return raw;
  const n = Number.parseFloat(String(raw).replace(/,/g, ""));
  return Number.isFinite(n) ? n : 0;
}

function formatCategoryLabel(name: string): string {
  if (!name) return "";
  return name.charAt(0).toUpperCase() + name.slice(1).toLowerCase();
}

function getRevenueCardLabels(periodTab: FilterTab) {
  switch (periodTab) {
    case "Today":
      return {
        current: "Today Revenue",
        previous: "Yesterday Revenue",
        previousToPrevious: "Previous Day Revenue",
      };
    case "Weekly":
      return {
        current: "This Week Revenue",
        previous: "Last Week Revenue",
        previousToPrevious: "Previous to Last Week Revenue",
      };
    case "Monthly":
      return {
        current: "Current Month Revenue",
        previous: "Previous Month Revenue",
        previousToPrevious: "Previous to Previous Month Revenue",
      };
    case "Yearly":
      return {
        current: "Current Year Revenue",
        previous: "Previous Year Revenue",
        previousToPrevious: "Previous to Previous Year Revenue",
      };
    case "Custom":
      return {
        current: "Current Range Revenue",
        previous: "Previous Range Revenue",
        previousToPrevious: "Previous to Previous Range Revenue",
      };
    default:
      return {
        current: "Current Month Revenue",
        previous: "Previous Month Revenue",
        previousToPrevious: "Previous to Previous Month Revenue",
      };
  }
}

export default function OverallReport() {
  const [periodTab, setPeriodTab] = useState<FilterTab>("Monthly");
  const [dateRange, setDateRange] = useState<[Date | null, Date | null]>([
    startOfMonth(new Date()),
    endOfMonth(new Date()),
  ]);
  const [pendingRange, setPendingRange] = useState<[Date | null, Date | null]>([null, null]);
  const [customPopoverOpen, setCustomPopoverOpen] = useState(false);
  // Categories expand/collapse independently (multiple can stay open)
  const [expandedCategoryIds, setExpandedCategoryIds] = useState<Record<number, boolean>>({});
  // Other product breakdown can be toggled independently
  const [otherProductExpanded, setOtherProductExpanded] = useState(false);
  const [trendSeries, setTrendSeries] = useState<
    "client" | "core_sale" | "core_product" | "other_product" | "overall_revenue"
  >("core_sale");

  const filterStart = useMemo(() => {
    const now = new Date();
    if (periodTab === "Today") return new Date(now.getFullYear(), now.getMonth(), now.getDate());
    if (periodTab === "Weekly") return startOfWeek(now, { weekStartsOn: 1 });
    if (periodTab === "Monthly") return startOfMonth(now);
    if (periodTab === "Yearly") return startOfYear(now);
    return dateRange[0] ?? startOfMonth(now);
  }, [periodTab, dateRange]);

  const filterEnd = useMemo(() => {
    const now = new Date();
    if (periodTab === "Today") return new Date(now.getFullYear(), now.getMonth(), now.getDate());
    if (periodTab === "Weekly") return endOfWeek(now, { weekStartsOn: 1 });
    if (periodTab === "Monthly") return endOfMonth(now);
    if (periodTab === "Yearly") return endOfYear(now);
    return dateRange[1] ?? endOfMonth(now);
  }, [periodTab, dateRange]);

  const apiFilter = TAB_TO_API_FILTER[periodTab];
  const startDate = toYMD(filterStart);
  const endDate = toYMD(filterEnd);

  const { data, isLoading } = useQuery({
    queryKey: ["sale-dashboard", apiFilter, apiFilter === "custom" ? startDate : null, apiFilter === "custom" ? endDate : null],
    queryFn: () =>
      clientService.getSaleDashboard({
        filter: apiFilter,
        startDate: apiFilter === "custom" ? startDate : undefined,
        endDate: apiFilter === "custom" ? endDate : undefined,
      }),
  });

  const cards = data?.cards;
  const categoryCounts = data?.sale_type_category_counts ?? [];
  const otherProductBreakdown = data?.other_product_breakdown ?? [];
  const lineChartData = data?.charts?.line ?? [];

  const revenueLabels = getRevenueCardLabels(periodTab);

  const { data: graphData } = useQuery({
    queryKey: ["sale-graph-report", trendSeries],
    queryFn: async () => {
      const resp = await clientService.getSaleGraphReport({
        metric: trendSeries,
      });

      const useCount = trendSeries === "client";
      return resp.series
        .map((point) => ({
          name: point.label,
          current: useCount ? point.current.count : point.current.amount,
          previous: useCount ? point.previous.count : point.previous.amount,
          previous2: useCount ? point.previous2.count : point.previous2.amount,
        }))
        .sort((a, b) => Number(a.name) - Number(b.name));
    },
  });

  const trendChartData: Array<any> = graphData && graphData.length > 0 ? graphData : lineChartData;
  const yAxisFormatter = (v: any) => {
    const n = Number(v);
    if (trendSeries === "client") return Number.isFinite(n) ? String(Math.round(n)) : "0";
    return formatAxisNumber(n);
  };

  const isCurrentMonthlyView = useMemo(() => {
    if (apiFilter !== "monthly") return false;
    const now = new Date();
    return filterStart.getFullYear() === now.getFullYear() && filterStart.getMonth() === now.getMonth();
  }, [apiFilter, filterStart]);

  const chartDataForRender = useMemo(() => {
    // Trim future "current" values in current month so live point appears as running.
    if (!isCurrentMonthlyView) return trendChartData;
    const today = new Date().getDate();
    return trendChartData.map((row: any) => {
      const day = Number(row?.name ?? 0);
      if (!Number.isFinite(day) || day <= today) return row;
      return { ...row, current: null };
    });
  }, [trendChartData, isCurrentMonthlyView, trendSeries]);

  const liveCurrentPoint = useMemo(() => {
    if (!isCurrentMonthlyView) return null;
    const today = new Date().getDate();
    const point = trendChartData.find((row: any) => Number(row?.name ?? 0) === today);
    if (!point || point.current == null) return null;
    return { x: String(today), y: Number(point.current) };
  }, [trendChartData, isCurrentMonthlyView, trendSeries]);

  // Expand all sale-type categories by default when the *filter request* changes.
  // This avoids re-running when React Query returns new array references during renders.
  useEffect(() => {
    if (categoryCounts.length === 0) return;

    const next: Record<number, boolean> = {};
    for (const c of categoryCounts) {
      next[c.category_id] = true;
    }
    setExpandedCategoryIds(next);
    // Reset "other product" collapsed state too (optional, keeps UI predictable across filter changes)
    setOtherProductExpanded(false);
  }, [apiFilter, startDate, endDate, categoryCounts.length]);

  const handlePresetClick = (tab: Exclude<FilterTab, "Custom">) => {
    setPeriodTab(tab);
    const now = new Date();
    if (tab === "Today") {
      const day = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      setDateRange([day, day]);
      return;
    }
    if (tab === "Weekly") {
      setDateRange([startOfWeek(now, { weekStartsOn: 1 }), endOfWeek(now, { weekStartsOn: 1 })]);
      return;
    }
    if (tab === "Monthly") {
      setDateRange([startOfMonth(now), endOfMonth(now)]);
      return;
    }
    setDateRange([startOfYear(now), endOfYear(now)]);
  };

  const handleCustomApply = () => {
    if (!pendingRange[0] || !pendingRange[1]) return;
    setDateRange([pendingRange[0], pendingRange[1]]);
    setPeriodTab("Custom");
    setCustomPopoverOpen(false);
  };

  return (
    <PageWrapper title="Overall Reports">
      <div className="flex flex-col gap-6">
        <Card className="border-border/60 rounded-xl">
          <CardHeader className="flex flex-col gap-3 pb-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <CardTitle className="text-base font-semibold">Filter</CardTitle>
              <CardDescription>
                {format(filterStart, "dd MMM yyyy")} to {format(filterEnd, "dd MMM yyyy")}
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="flex flex-wrap items-center gap-1 p-1 bg-muted/50 rounded-lg w-fit">
              {(["Today", "Weekly", "Monthly", "Yearly"] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => handlePresetClick(tab)}
                  className={cn(
                    "px-3 py-1.5 text-sm font-medium rounded-md transition-colors",
                    periodTab === tab
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground hover:bg-background/60",
                  )}
                >
                  {tab}
                </button>
              ))}

              <Popover open={customPopoverOpen} onOpenChange={setCustomPopoverOpen}>
                <PopoverTrigger asChild>
                  <button
                    className={cn(
                      "px-3 py-1.5 text-sm font-medium rounded-md transition-colors flex items-center gap-1.5",
                      periodTab === "Custom"
                        ? "bg-primary text-primary-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground hover:bg-background/60",
                    )}
                  >
                    <CalendarIcon className="h-3.5 w-3.5" />
                    {periodTab === "Custom" && dateRange[0] && dateRange[1]
                      ? `${format(dateRange[0], "dd MMM")} - ${format(dateRange[1], "dd MMM yyyy")}`
                      : "Custom"}
                    <ChevronDown className="h-3.5 w-3.5 opacity-70" />
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-4" align="start">
                  <div className="space-y-4">
                    <div className="space-y-1">
                      <label className="text-sm font-medium">From</label>
                      <DateInput
                        value={pendingRange[0] ?? undefined}
                        onChange={(d) => setPendingRange((prev) => [d ?? null, prev[1]])}
                        className="mt-1"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-sm font-medium">To</label>
                      <DateInput
                        value={pendingRange[1] ?? undefined}
                        onChange={(d) => setPendingRange((prev) => [prev[0], d ?? null])}
                        className="mt-1"
                      />
                    </div>
                    <Button
                      size="sm"
                      onClick={handleCustomApply}
                      disabled={!pendingRange[0] || !pendingRange[1]}
                      className="w-full"
                    >
                      Apply
                    </Button>
                  </div>
                </PopoverContent>
              </Popover>
            </div>
          </CardContent>
        </Card>

        {isLoading ? (
          <div className="flex items-center justify-center py-14">
            <Loader2 className="h-7 w-7 animate-spin text-primary" />
          </div>
        ) : (
          <>
            <Card className="border-border/60 rounded-xl bg-muted/30 shadow-sm">
              <CardHeader className="pb-2 flex flex-row items-center gap-2 border-b border-border/50">
                <div className="h-8 w-1 rounded-full bg-primary shrink-0" aria-hidden />
                <div>
                  <CardTitle className="text-sm font-semibold">Summary</CardTitle>
                  <CardDescription className="text-xs">Core sale, product, and total revenue for this period</CardDescription>
                </div>
              </CardHeader>
              <CardContent className="pt-4">
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  <StatCard title="Core Sale" value={cards?.core_sale.count ?? 0} secondaryValue={formatCurrency(cards?.core_sale.amount ?? 0)} icon={Users} />
                  <StatCard title="Core Product" value={cards?.core_product.count ?? 0} secondaryValue={formatCurrency(cards?.core_product.amount ?? 0)} icon={Users} />
                  <StatCard title="Total Revenue" value={formatCurrency(cards?.overall_revenue ?? 0)} icon={IndianRupee} />
                </div>
              </CardContent>
            </Card>

            <Card className="border-border/60 rounded-xl bg-muted/30 shadow-sm">
              <CardHeader className="pb-2 flex flex-row items-center gap-2 border-b border-border/50">
                <div className="h-8 w-1 rounded-full bg-primary shrink-0" aria-hidden />
                <div>
                  <CardTitle className="text-sm font-semibold">Breakdown</CardTitle>
                  <CardDescription className="text-xs">Sale-type categories and other third-party products</CardDescription>
                </div>
              </CardHeader>
              <CardContent className="pt-4">
            <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(280px,360px)] lg:items-start">
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {categoryCounts.map((row) => {
                  const isOpen = expandedCategoryIds[row.category_id] ?? false;
                  const saleTypes = row.sale_types ?? [];
                  return (
                    <Card
                      key={row.category_id}
                      className={cn(
                        "border-border/60 rounded-xl overflow-hidden",
                        isOpen ? "ring-1 ring-primary/40" : "",
                      )}
                    >
                      <button
                        type="button"
                        onClick={() =>
                          setExpandedCategoryIds((prev) => ({
                            ...prev,
                            [row.category_id]: !(prev[row.category_id] ?? false),
                          }))
                        }
                        className="w-full text-left px-4 py-4 flex items-start justify-between gap-3"
                      >
                        <div className="min-w-0">
                          <p className="text-sm font-semibold truncate">{formatCategoryLabel(row.category_name)}</p>
                          <p className="mt-1 text-2xl font-bold tabular-nums">{row.count}</p>
                          <p className="text-sm text-muted-foreground tabular-nums">
                            {formatCurrency(parseAmount(row.amount))}
                          </p>
                        </div>
                        <ChevronDown
                          className={cn("h-4 w-4 shrink-0 mt-1 transition-transform", isOpen && "rotate-180")}
                        />
                      </button>

                      {isOpen && (
                        <CardContent className="pt-0 pb-4">
                          {saleTypes.length > 0 ? (
                            <div className="space-y-2">
                              {saleTypes.map((st) => (
                                <div
                                  key={st.sale_type_id}
                                  className="rounded-lg bg-muted/30 px-3 py-2 space-y-0.5"
                                >
                                  <div className="flex items-start justify-between gap-2">
                                    <p className="text-xs font-medium text-foreground truncate">
                                      {st.sale_type_name}
                                    </p>
                                    <p className="text-xs text-muted-foreground tabular-nums shrink-0">
                                      {st.count}
                                    </p>
                                  </div>
                                  <p className="text-xs text-muted-foreground tabular-nums">
                                    {formatCurrency(parseAmount(st.amount))}
                                  </p>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-sm text-muted-foreground px-1">No sale types found</p>
                          )}
                        </CardContent>
                      )}
                    </Card>
                  );
                })}
              </div>

              <Card
                className={cn(
                  "border-border/60 rounded-xl overflow-hidden lg:sticky lg:top-4",
                  otherProductExpanded ? "ring-1 ring-primary/40" : "",
                )}
              >
                <button
                  type="button"
                  onClick={() =>
                    setOtherProductExpanded((prev) => !prev)
                  }
                  className="w-full text-left px-4 py-4 flex items-start justify-between gap-3"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-semibold truncate">Other Third Party Product</p>
                    <p className="mt-1 text-2xl font-bold tabular-nums">{cards?.other_product.count ?? 0}</p>
                    <p className="text-sm text-muted-foreground tabular-nums">
                      {formatCurrency(parseAmount(cards?.other_product.amount ?? 0))}
                    </p>
                  </div>
                  <ChevronDown
                    className={cn(
                      "h-4 w-4 shrink-0 mt-1 transition-transform",
                      otherProductExpanded && "rotate-180",
                    )}
                  />
                </button>

                {otherProductExpanded && (
                  <CardContent className="pt-0 pb-4">
                    {otherProductBreakdown.length > 0 ? (
                      <div className="space-y-2">
                        {otherProductBreakdown.map((row) => (
                          <div key={row.key || row.name} className="rounded-lg bg-muted/30 px-3 py-2 space-y-0.5">
                            <div className="flex items-start justify-between gap-2">
                              <p className="text-xs font-medium text-foreground truncate">{row.name}</p>
                              <p className="text-xs text-muted-foreground tabular-nums shrink-0">{row.count}</p>
                            </div>
                            <p className="text-xs text-muted-foreground tabular-nums">
                              {formatCurrency(parseAmount(row.amount))}
                            </p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground px-1">No other product breakdown found</p>
                    )}
                  </CardContent>
                )}
              </Card>
            </div>
              </CardContent>
            </Card>

            <Card className="border-border/60 rounded-xl bg-muted/30 shadow-sm">
              <CardHeader className="pb-2 flex flex-row items-center gap-2 border-b border-border/50">
                <div className="h-8 w-1 rounded-full bg-primary shrink-0" aria-hidden />
                <div>
                  <CardTitle className="text-sm font-semibold">Revenue comparison</CardTitle>
                  <CardDescription className="text-xs">Current vs previous periods (based on filter above)</CardDescription>
                </div>
              </CardHeader>
              <CardContent className="pt-4">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <StatCard title={revenueLabels.current} value={formatCurrency(cards?.current_month_revenue ?? 0)} icon={IndianRupee} />
              <StatCard title={revenueLabels.previous} value={formatCurrency(cards?.previous_month_revenue ?? 0)} icon={IndianRupee} />
              <StatCard
                title={revenueLabels.previousToPrevious}
                value={formatCurrency(cards?.previous_to_previous_month_revenue ?? 0)}
                icon={IndianRupee}
              />
              </div>
              </CardContent>
            </Card>

            <Card className="border-border/60 rounded-xl bg-muted/30 shadow-sm w-full">
                <CardHeader className="pb-2 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between border-b border-border/50">
                  <div className="flex flex-row items-start gap-2 min-w-0">
                    <div className="h-8 w-1 rounded-full bg-primary shrink-0 mt-0.5" aria-hidden />
                    <div>
                    <CardTitle className="text-sm font-semibold">Trends</CardTitle>
                    <CardDescription className="text-xs">Three-month line chart — pick a metric below</CardDescription>
                    <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                      <span className="inline-flex items-center gap-1.5">
                        <span className="h-2.5 w-2.5 rounded-full bg-[#6366f1]" />
                        Current Month
                      </span>
                      <span className="inline-flex items-center gap-1.5">
                        <span className="h-2.5 w-2.5 rounded-full bg-[#10b981]" />
                        Previous Month
                      </span>
                      <span className="inline-flex items-center gap-1.5">
                        <span className="h-2.5 w-2.5 rounded-full bg-[#f59e0b]" />
                        Previous to Previous Month
                      </span>
                    </div>
                    </div>
                  </div>
                  <div className="w-full sm:w-[260px] shrink-0">
                    <Select value={trendSeries} onValueChange={(v) => setTrendSeries(v as typeof trendSeries)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select metric" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="client">Total Clients</SelectItem>
                        <SelectItem value="core_sale">Core Sale Revenue</SelectItem>
                        <SelectItem value="core_product">Core Product Revenue</SelectItem>
                        <SelectItem value="other_product">Other Product Revenue</SelectItem>
                        <SelectItem value="overall_revenue">Total Revenue</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </CardHeader>
                <CardContent className="pt-4 w-full min-h-[380px] h-[42vh] sm:min-h-[420px] sm:h-[48vh] lg:min-h-[480px] lg:h-[520px] xl:h-[580px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartDataForRender}>
                      <XAxis dataKey="name" />
                      <YAxis width={62} tickMargin={10} tickFormatter={yAxisFormatter} />
                      <RechartsCartesianGrid stroke="#ccc" strokeDasharray="5 5" />
                      <Tooltip />
                      <Line type="monotone" dataKey="current" stroke="#6366f1" strokeWidth={4} />
                      <Line type="monotone" dataKey="previous" stroke="#10b981" strokeDasharray="6 4" strokeWidth={4} />
                      <Line type="monotone" dataKey="previous2" stroke="#f59e0b" strokeDasharray="2 3" strokeWidth={4} />
                      {liveCurrentPoint && (
                        <ReferenceDot
                          x={liveCurrentPoint.x}
                          y={liveCurrentPoint.y}
                          r={10}
                          fill="#6366f1"
                          stroke="#ffffff"
                          strokeWidth={3}
                          className="animate-pulse"
                        />
                      )}
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
          </>
        )}
      </div>
    </PageWrapper>
  );
}