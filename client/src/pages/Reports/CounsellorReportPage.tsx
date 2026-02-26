import { useState, useMemo } from "react";
import { useParams, useLocation } from "wouter";
import { PageWrapper } from "@/layout/PageWrapper";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { clientService, type CounsellorPerformanceRow } from "@/services/clientService";
import { useQuery } from "@tanstack/react-query";
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, startOfYear, endOfYear } from "date-fns";
import { DateInput } from "@/components/ui/date-input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CalendarIcon, Loader2, Users, IndianRupee, Package, ShoppingBag, ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

const PERIOD_TABS = ["Today", "Weekly", "Monthly", "Yearly", "Custom"] as const;
type PeriodTab = (typeof PERIOD_TABS)[number];

const PERIOD_TO_FILTER: Record<PeriodTab, "today" | "weekly" | "monthly" | "yearly" | "custom"> = {
  Today: "today",
  Weekly: "weekly",
  Monthly: "monthly",
  Yearly: "yearly",
  Custom: "custom",
};

function toYMD(d: Date): string {
  return format(d, "yyyy-MM-dd");
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
    minimumFractionDigits: 0,
  }).format(value);
}

function getDefaultDateRange(): [Date, Date] {
  const now = new Date();
  return [startOfMonth(now), endOfMonth(now)];
}

export default function CounsellorReportPage() {
  const params = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const counsellorId = params?.id ? Number(params.id) : null;

  const [periodTab, setPeriodTab] = useState<PeriodTab>("Monthly");
  const [dateRange, setDateRange] = useState<[Date | null, Date | null]>(() => {
    const [s, e] = getDefaultDateRange();
    return [s, e];
  });
  const [customOpen, setCustomOpen] = useState(false);

  const filterStart = useMemo(() => {
    const n = new Date();
    if (periodTab === "Today") return new Date(n.getFullYear(), n.getMonth(), n.getDate());
    if (periodTab === "Weekly") return startOfWeek(n, { weekStartsOn: 1 });
    if (periodTab === "Monthly") return startOfMonth(n);
    if (periodTab === "Yearly") return startOfYear(n);
    return dateRange[0] ?? startOfMonth(n);
  }, [periodTab, dateRange]);
  const filterEnd = useMemo(() => {
    const n = new Date();
    if (periodTab === "Today") return new Date(n.getFullYear(), n.getMonth(), n.getDate());
    if (periodTab === "Weekly") return endOfWeek(n, { weekStartsOn: 1 });
    if (periodTab === "Monthly") return endOfMonth(n);
    if (periodTab === "Yearly") return endOfYear(n);
    return dateRange[1] ?? endOfMonth(n);
  }, [periodTab, dateRange]);

  const startYMD = toYMD(filterStart);
  const endYMD = toYMD(filterEnd);
  const apiFilter = PERIOD_TO_FILTER[periodTab];
  const isCustom = periodTab === "Custom";
  const canFetchReport = !isCustom || (!!startYMD && !!endYMD);

  const { data: report, isLoading: reportLoading } = useQuery({
    queryKey: ["reports", apiFilter, isCustom ? startYMD : null, isCustom ? endYMD : null],
    queryFn: () =>
      clientService.getReports({
        filter: apiFilter,
        ...(isCustom && startYMD && endYMD ? { afterDate: startYMD, beforeDate: endYMD } : {}),
      }),
    staleTime: 1000 * 60 * 2,
    enabled: canFetchReport,
  });

  const counsellorStats = useMemo((): CounsellorPerformanceRow | null => {
    if (!report || counsellorId == null) return null;
    return report.counsellor_performance?.find((c) => c.counsellor_id === counsellorId) ?? null;
  }, [report, counsellorId]);

  const { data: clientsRaw, isLoading: clientsLoading } = useQuery({
    queryKey: ["counsellor-clients", counsellorId],
    queryFn: () => (counsellorId != null ? clientService.getClientsByCounsellor(counsellorId) : Promise.resolve([])),
    enabled: counsellorId != null,
  });

  const clientsArray = useMemo(() => {
    if (!clientsRaw) return [];
    if (Array.isArray(clientsRaw)) return clientsRaw;
    if (clientsRaw?.clients && Array.isArray(clientsRaw.clients)) return clientsRaw.clients;
    if (typeof clientsRaw === "object" && clientsRaw !== null) {
      const arr: any[] = [];
      Object.values(clientsRaw).forEach((v: any) => {
        if (Array.isArray(v)) arr.push(...v);
        else if (v?.clients && Array.isArray(v.clients)) arr.push(...v.clients);
        else if (v && typeof v === "object" && !Array.isArray(v)) arr.push(v);
      });
      return arr;
    }
    return [];
  }, [clientsRaw]);

  const clientsInRange = useMemo(() => {
    return clientsArray.filter((c: any) => {
      const dateStr = c.enrollmentDate ?? c.enrollment_date ?? c.createdAt ?? c.created_at ?? "";
      if (!dateStr) return false;
      const d = dateStr.slice(0, 10);
      return d >= startYMD && d <= endYMD;
    });
  }, [clientsArray, startYMD, endYMD]);

  const handlePeriodChange = (tab: string) => {
    setPeriodTab(tab as PeriodTab);
    if (tab === "Custom") {
      setCustomOpen(true);
      return;
    }
    const n = new Date();
    if (tab === "Today") setDateRange([new Date(n.getFullYear(), n.getMonth(), n.getDate()), new Date(n.getFullYear(), n.getMonth(), n.getDate())]);
    else if (tab === "Weekly") setDateRange([startOfWeek(n, { weekStartsOn: 1 }), endOfWeek(n, { weekStartsOn: 1 })]);
    else if (tab === "Monthly") setDateRange([startOfMonth(n), endOfMonth(n)]);
    else if (tab === "Yearly") setDateRange([startOfYear(n), endOfYear(n)]);
  };

  if (counsellorId == null || isNaN(counsellorId)) {
    return (
      <PageWrapper title="Counsellor Report" breadcrumbs={[{ label: "Reports", href: "/reports" }, { label: "Invalid" }]}>
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            Invalid counsellor. <Button variant="link" className="p-0" onClick={() => setLocation("/reports")}>Back to Reports</Button>
          </CardContent>
        </Card>
      </PageWrapper>
    );
  }

  const counsellorName = counsellorStats?.full_name ?? `Counsellor #${counsellorId}`;

  return (
    <PageWrapper
      title={counsellorName}
      breadcrumbs={[
        { label: "Reports", href: "/reports" },
        { label: counsellorName },
      ]}
      actions={
        <Button variant="outline" size="sm" onClick={() => setLocation("/reports")} className="gap-2">
          <ArrowLeft className="h-4 w-4" />
          <span className="hidden sm:inline">Back to Reports</span>
        </Button>
      }
    >
      <div className="space-y-6">
        {/* Period filter */}
        <Card className="border-border/60 rounded-xl">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold">Period</CardTitle>
            <CardDescription>
              {format(filterStart, "dd MMM yyyy")} → {format(filterEnd, "dd MMM yyyy")}
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            <Tabs value={periodTab} onValueChange={handlePeriodChange} className="w-full">
              <TabsList className="flex flex-wrap h-auto gap-1 p-1 bg-muted/50 rounded-lg">
                {PERIOD_TABS.map((tab) => (
                  <TabsTrigger key={tab} value={tab} className="rounded-md data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                    {tab}
                  </TabsTrigger>
                ))}
              </TabsList>
              {periodTab === "Custom" && (
                <Popover open={customOpen} onOpenChange={setCustomOpen}>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="mt-3 gap-2">
                      <CalendarIcon className="h-4 w-4" />
                      {dateRange[0] && dateRange[1]
                        ? `${format(dateRange[0], "dd MMM")} – ${format(dateRange[1], "dd MMM yyyy")}`
                        : "Select dates"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-4" align="start">
                    <div className="space-y-4">
                      <div>
                        <label className="text-sm font-medium">From</label>
                        <DateInput
                          value={dateRange[0] ?? undefined}
                          onChange={(d) => setDateRange((prev) => [d ?? null, prev[1]])}
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium">To</label>
                        <DateInput
                          value={dateRange[1] ?? undefined}
                          onChange={(d) => setDateRange((prev) => [prev[0], d ?? null])}
                          maxDate={new Date()}
                          className="mt-1"
                        />
                      </div>
                      <Button size="sm" onClick={() => setCustomOpen(false)}>Apply</Button>
                    </div>
                  </PopoverContent>
                </Popover>
              )}
            </Tabs>
          </CardContent>
        </Card>

        {/* Stats */}
        {reportLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card className="border-border/50 rounded-xl overflow-hidden">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <IndianRupee className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Core Sale Rev</p>
                  <p className="text-lg font-bold tabular-nums">{formatCurrency(counsellorStats?.core_sale_revenue ?? 0)}</p>
                </div>
              </CardContent>
            </Card>
            <Card className="border-border/50 rounded-xl overflow-hidden">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Package className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Core Product Rev</p>
                  <p className="text-lg font-bold tabular-nums">{formatCurrency(counsellorStats?.core_product_revenue ?? 0)}</p>
                </div>
              </CardContent>
            </Card>
            <Card className="border-border/50 rounded-xl overflow-hidden">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <ShoppingBag className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Other Rev</p>
                  <p className="text-lg font-bold tabular-nums">{formatCurrency(counsellorStats?.other_product_revenue ?? 0)}</p>
                </div>
              </CardContent>
            </Card>
            <Card className="border-border/50 rounded-xl overflow-hidden">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <IndianRupee className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Total Revenue</p>
                  <p className="text-lg font-bold tabular-nums">{formatCurrency(counsellorStats?.total_revenue ?? 0)}</p>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Client list */}
        <Card className="overflow-hidden rounded-2xl border border-border/60">
          <CardHeader className="border-b border-border/40 bg-muted/20 pb-4">
            <CardTitle className="flex items-center gap-2 text-lg font-semibold">
              <Users className="h-5 w-5 text-primary" />
              Clients ({clientsInRange.length})
            </CardTitle>
            <CardDescription>
              Enrollments in selected period: {format(filterStart, "dd MMM yyyy")} → {format(filterEnd, "dd MMM yyyy")}
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {clientsLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent border-b border-border/60">
                      <TableHead className="font-semibold">Name</TableHead>
                      <TableHead className="font-semibold">Enrollment</TableHead>
                      <TableHead className="text-right font-semibold">Total Payment</TableHead>
                      <TableHead className="text-right font-semibold">Received</TableHead>
                      <TableHead className="text-right font-semibold">Pending</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {clientsInRange.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-12 text-muted-foreground">
                          No clients in this period.
                        </TableCell>
                      </TableRow>
                    ) : (
                      clientsInRange.map((client: any) => {
                        const name = client.name ?? client.fullName ?? client.client_name ?? "—";
                        const enrollmentDate = client.enrollmentDate ?? client.enrollment_date ?? client.createdAt ?? "—";
                        const total = client.totalPayment ?? client.total_payment ?? 0;
                        const received = client.amountReceived ?? client.amount_received ?? 0;
                        const pending = client.amountPending ?? client.amount_pending ?? 0;
                        return (
                          <TableRow key={client.id ?? client.client_id ?? Math.random()} className="border-b border-border/40">
                            <TableCell className="font-medium">{name}</TableCell>
                            <TableCell className="text-muted-foreground">
                              {typeof enrollmentDate === "string" ? enrollmentDate.slice(0, 10) : enrollmentDate}
                            </TableCell>
                            <TableCell className="text-right tabular-nums">{formatCurrency(Number(total))}</TableCell>
                            <TableCell className="text-right tabular-nums">{formatCurrency(Number(received))}</TableCell>
                            <TableCell className="text-right tabular-nums">{formatCurrency(Number(pending))}</TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </PageWrapper>
  );
}
