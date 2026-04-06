// import { useState, useMemo, useEffect } from "react";
// import { useParams, useLocation } from "wouter";
// import { useAuth } from "@/context/auth-context";
// import { PageWrapper } from "@/layout/PageWrapper";
// import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
// import { clientService } from "@/services/clientService";
// import { useQuery } from "@tanstack/react-query";
// import {
//   format,
//   getDaysInMonth,
//   startOfMonth,
//   endOfMonth,
//   startOfWeek,
//   endOfWeek,
//   startOfYear,
//   endOfYear,
// } from "date-fns";
// import {
//   Table,
//   TableBody,
//   TableCell,
//   TableHead,
//   TableHeader,
//   TableRow,
// } from "@/components/ui/table";
// import { Badge } from "@/components/ui/badge";
// import { DateInput } from "@/components/ui/date-input";
// import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
// import {
//   Loader2,
//   IndianRupee,
//   Package,
//   ShoppingBag,
//   ArrowLeft,
//   TrendingUp,
//   TrendingDown,
//   Users,
//   Trophy,
//   Target,
//   BarChart3,
//   Minus,
//   ChevronDown,
//   CalendarIcon,
//   Clock,
//   Layers,
// } from "lucide-react";
// import { Button } from "@/components/ui/button";
// import {
//   DropdownMenu,
//   DropdownMenuContent,
//   DropdownMenuItem,
//   DropdownMenuTrigger,
// } from "@/components/ui/dropdown-menu";
// import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

// // ── Constants ──────────────────────────────────────────────────────────────────
// const MONTHS = [
//   { value: 1,  label: "January"   },
//   { value: 2,  label: "February"  },
//   { value: 3,  label: "March"     },
//   { value: 4,  label: "April"     },
//   { value: 5,  label: "May"       },
//   { value: 6,  label: "June"      },
//   { value: 7,  label: "July"      },
//   { value: 8,  label: "August"    },
//   { value: 9,  label: "September" },
//   { value: 10, label: "October"   },
//   { value: 11, label: "November"  },
//   { value: 12, label: "December"  },
// ];

// function buildYears(): number[] {
//   const current = new Date().getFullYear();
//   const years: number[] = [];
//   for (let y = current; y >= 2020; y--) years.push(y);
//   return years;
// }
// const YEARS = buildYears();

// const ADMIN_TABS = ["Today", "Weekly", "Monthly", "Yearly", "Custom"] as const;
// type AdminTab = (typeof ADMIN_TABS)[number];
// const TAB_TO_FILTER: Record<AdminTab, "today" | "weekly" | "monthly" | "yearly" | "custom"> = {
//   Today:   "today",
//   Weekly:  "weekly",
//   Monthly: "monthly",
//   Yearly:  "yearly",
//   Custom:  "custom",
// };

// // ── Helpers ────────────────────────────────────────────────────────────────────
// function toYMD(year: number, month: number, day: number): string {
//   return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
// }

// function dateToYMD(d: Date): string {
//   return format(d, "yyyy-MM-dd");
// }

// function formatCurrency(value: number): string {
//   return new Intl.NumberFormat("en-IN", {
//     style: "currency",
//     currency: "INR",
//     maximumFractionDigits: 0,
//     minimumFractionDigits: 0,
//   }).format(value);
// }

// function formatCategoryLabel(name: string): string {
//   if (!name) return "";
//   return name.charAt(0).toUpperCase() + name.slice(1).toLowerCase();
// }

// function parseAmount(raw: string | number): number {
//   if (typeof raw === "number") return raw;
//   const n = Number.parseFloat(String(raw).replace(/,/g, ""));
//   return Number.isFinite(n) ? n : 0;
// }

// function GrowthBadge({ pct }: { pct: number }) {
//   if (pct > 0)
//     return (
//       <Badge className="gap-1 bg-emerald-100 text-emerald-700 border-emerald-200 hover:bg-emerald-100">
//         <TrendingUp className="h-3 w-3" />+{pct.toFixed(2)}%
//       </Badge>
//     );
//   if (pct < 0)
//     return (
//       <Badge className="gap-1 bg-red-100 text-red-700 border-red-200 hover:bg-red-100">
//         <TrendingDown className="h-3 w-3" />{pct.toFixed(2)}%
//       </Badge>
//     );
//   return (
//     <Badge variant="secondary" className="gap-1">
//       <Minus className="h-3 w-3" />0%
//     </Badge>
//   );
// }

// // ── Main component ─────────────────────────────────────────────────────────────
// export default function CounsellorReportPage() {
//   const params = useParams<{ id: string }>();
//   const [, setLocation] = useLocation();
//   const { user } = useAuth();

//   const rawId = params?.id ?? "me";
//   const counsellorId: number | "me" = rawId === "me" ? "me" : Number(rawId);

//   const isCounsellor = user?.role === "counsellor";

//   const now = new Date();

//   // ── Counsellor filter state (Month + Year dropdowns) ──────────────────────
//   const [selectedMonth, setSelectedMonth] = useState<number>(now.getMonth() + 1);
//   const [selectedYear,  setSelectedYear]  = useState<number>(now.getFullYear());

//   const counsellorStartDate = toYMD(selectedYear, selectedMonth, 1);
//   const counsellorEndDate   = toYMD(
//     selectedYear,
//     selectedMonth,
//     getDaysInMonth(new Date(selectedYear, selectedMonth - 1))
//   );
//   const monthLabel = MONTHS.find((m) => m.value === selectedMonth)?.label ?? "";

//   // ── Admin / Manager filter state (pill buttons) ───────────────────────────
//   const [adminTab,          setAdminTab]          = useState<AdminTab>("Monthly");
//   const [dateRange,         setDateRange]         = useState<[Date | null, Date | null]>([null, null]);
//   const [pendingRange,      setPendingRange]      = useState<[Date | null, Date | null]>([null, null]);
//   const [customPopoverOpen, setCustomPopoverOpen] = useState(false);

//   // ── Sale type filter (counsellor + admin/manager) ──────────────────────────
//   const [saleTypeId, setSaleTypeId] = useState<number | null>(null);
//   const [saleTypes, setSaleTypes] = useState<Array<{ id: number; sale_type: string }>>([]);
//   useEffect(() => {
//     let cancelled = false;
//     clientService.getSaleTypes().then((list) => {
//       if (!cancelled) setSaleTypes(list);
//     }).catch((err) => console.error("Failed to load sale types", err));
//     return () => { cancelled = true; };
//   }, []);

//   const adminFilterStart = useMemo(() => {
//     if (adminTab === "Today")   return new Date(now.getFullYear(), now.getMonth(), now.getDate());
//     if (adminTab === "Weekly")  return startOfWeek(now, { weekStartsOn: 1 });
//     if (adminTab === "Monthly") return startOfMonth(now);
//     if (adminTab === "Yearly")  return startOfYear(now);
//     return dateRange[0] ?? startOfMonth(now);
//   // eslint-disable-next-line react-hooks/exhaustive-deps
//   }, [adminTab, dateRange]);

//   const adminFilterEnd = useMemo(() => {
//     if (adminTab === "Today")   return new Date(now.getFullYear(), now.getMonth(), now.getDate());
//     if (adminTab === "Weekly")  return endOfWeek(now, { weekStartsOn: 1 });
//     if (adminTab === "Monthly") return endOfMonth(now);
//     if (adminTab === "Yearly")  return endOfYear(now);
//     return dateRange[1] ?? endOfMonth(now);
//   // eslint-disable-next-line react-hooks/exhaustive-deps
//   }, [adminTab, dateRange]);

//   const adminStartDate = dateToYMD(adminFilterStart);
//   const adminEndDate   = dateToYMD(adminFilterEnd);
//   const adminApiFilter = TAB_TO_FILTER[adminTab];
//   const isCustomAdmin  = adminTab === "Custom";
//   const canFetchAdmin  = !isCustomAdmin || (!!adminStartDate && !!adminEndDate);

//   const handlePresetClick = (tab: Exclude<AdminTab, "Custom">) => {
//     setAdminTab(tab);
//     const n = new Date();
//     if (tab === "Today")   setDateRange([new Date(n.getFullYear(), n.getMonth(), n.getDate()), new Date(n.getFullYear(), n.getMonth(), n.getDate())]);
//     else if (tab === "Weekly")  setDateRange([startOfWeek(n, { weekStartsOn: 1 }), endOfWeek(n, { weekStartsOn: 1 })]);
//     else if (tab === "Monthly") setDateRange([startOfMonth(n), endOfMonth(n)]);
//     else if (tab === "Yearly")  setDateRange([startOfYear(n), endOfYear(n)]);
//   };

//   const handleCustomApply = () => {
//     if (!pendingRange[0] || !pendingRange[1]) return;
//     setDateRange(pendingRange);
//     setAdminTab("Custom");
//     setCustomPopoverOpen(false);
//   };

//   // ── Unified query params ───────────────────────────────────────────────────
//   const queryStartDate = isCounsellor ? counsellorStartDate : adminStartDate;
//   const queryEndDate   = isCounsellor ? counsellorEndDate   : adminEndDate;
//   const queryFilter    = isCounsellor ? "custom" as const   : adminApiFilter;
//   const canFetch       = isCounsellor ? true : canFetchAdmin;

//   const { data: report, isLoading } = useQuery({
//     queryKey: [
//       "counsellor-report",
//       counsellorId,
//       isCounsellor ? selectedMonth : adminTab,
//       isCounsellor ? selectedYear  : (isCustomAdmin ? adminStartDate : null),
//       isCustomAdmin ? adminEndDate : null,
//       saleTypeId,
//     ],
//     queryFn: () =>
//       clientService.getCounsellorReport({
//         id: counsellorId,
//         filter: queryFilter,
//         startDate: queryStartDate,
//         endDate: queryEndDate,
//         saleTypeId: saleTypeId ?? undefined,
//       }),
//     staleTime: 1000 * 60 * 2,
//     enabled: canFetch && (counsellorId === "me" || !isNaN(counsellorId as number)),
//   });

//   // ── Validate ID ────────────────────────────────────────────────────────────
//   if (counsellorId !== "me" && isNaN(counsellorId as number)) {
//     return (
//       <PageWrapper
//         title="Counsellor Report"
//         breadcrumbs={[{ label: "Reports", href: "/reports" }, { label: "Invalid" }]}
//       >
//         <Card>
//           <CardContent className="py-8 text-center text-muted-foreground">
//             Invalid counsellor.{" "}
//             <Button variant="link" className="p-0" onClick={() => setLocation("/reports")}>
//               Back to Reports
//             </Button>
//           </CardContent>
//         </Card>
//       </PageWrapper>
//     );
//   }

//   const counsellorName =
//     report?.counsellor?.full_name ??
//     (counsellorId === "me" ? "My Report" : `Counsellor #${counsellorId}`);
//   const perf = report?.performance;
//   const mc   = report?.monthly_comparison;
//   const pa   = report?.product_analytics;
//   const saleTypeCategoryCounts = report?.sale_type_category_counts ?? [];

//   return (
//     <PageWrapper
//       title={counsellorName}
//       breadcrumbs={[{ label: "Reports", href: "/reports" }, { label: counsellorName }]}
//       actions={
//         <Button variant="outline" size="sm" onClick={() => setLocation("/reports")} className="gap-2">
//           <ArrowLeft className="h-4 w-4" />
//           <span className="hidden sm:inline">Back to Reports</span>
//         </Button>
//       }
//     >
//       <div className="space-y-6">
//         {/* Counsellor info */}
//         {report?.counsellor && (
//           <Card className="border-border/60 rounded-xl">
//             <CardContent className="pt-5 pb-4">
//               <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm">
//                 <span className="font-medium text-foreground">{report.counsellor.designation}</span>
//                 {report.counsellor.manager_name && (
//                   <span className="text-muted-foreground">
//                     Manager:{" "}
//                     <span className="font-medium text-foreground">{report.counsellor.manager_name}</span>
//                   </span>
//                 )}
//                 <span className="text-muted-foreground">{report.counsellor.email}</span>
//               </div>
//             </CardContent>
//           </Card>
//         )}

//         {/* ── COUNSELLOR: Month + Year dropdowns ─────────────────────────────── */}
//         {isCounsellor && (
//           <div className="flex flex-wrap items-center gap-3">
//             <DropdownMenu>
//               <DropdownMenuTrigger asChild>
//                 <Button variant="outline" className="gap-2 min-w-[140px] justify-between">
//                   {monthLabel}
//                   <ChevronDown className="h-4 w-4 opacity-60" />
//                 </Button>
//               </DropdownMenuTrigger>
//               <DropdownMenuContent align="start" className="w-40 max-h-72 overflow-y-auto">
//                 {MONTHS.map((m) => (
//                   <DropdownMenuItem
//                     key={m.value}
//                     onSelect={() => setSelectedMonth(m.value)}
//                     className={selectedMonth === m.value ? "bg-primary/10 font-semibold" : ""}
//                   >
//                     {m.label}
//                   </DropdownMenuItem>
//                 ))}
//               </DropdownMenuContent>
//             </DropdownMenu>

//             <DropdownMenu>
//               <DropdownMenuTrigger asChild>
//                 <Button variant="outline" className="gap-2 min-w-[100px] justify-between">
//                   {selectedYear}
//                   <ChevronDown className="h-4 w-4 opacity-60" />
//                 </Button>
//               </DropdownMenuTrigger>
//               <DropdownMenuContent align="start" className="w-28">
//                 {YEARS.map((y) => (
//                   <DropdownMenuItem
//                     key={y}
//                     onSelect={() => setSelectedYear(y)}
//                     className={selectedYear === y ? "bg-primary/10 font-semibold" : ""}
//                   >
//                     {y}
//                   </DropdownMenuItem>
//                 ))}
//               </DropdownMenuContent>
//             </DropdownMenu>

//             <span className="text-sm text-muted-foreground">
//               {counsellorStartDate} → {counsellorEndDate}
//             </span>

//             <div className="flex items-center gap-2">
//               <span className="text-sm font-medium text-muted-foreground whitespace-nowrap">Sale type</span>
//               <Select
//                 value={saleTypeId != null ? String(saleTypeId) : "all"}
//                 onValueChange={(v) => setSaleTypeId(v === "all" ? null : Number(v))}
//               >
//                 <SelectTrigger className="w-[180px]">
//                   <SelectValue placeholder="All sale types" />
//                 </SelectTrigger>
//                 <SelectContent>
//                   <SelectItem value="all">All sale types</SelectItem>
//                   {saleTypes.map((st) => (
//                     <SelectItem key={st.id} value={String(st.id)}>{st.sale_type}</SelectItem>
//                   ))}
//                 </SelectContent>
//               </Select>
//             </div>
//           </div>
//         )}

//         {/* ── ADMIN / MANAGER: Today / Weekly / Monthly / Yearly / Custom ─────── */}
//         {!isCounsellor && (
//           <Card className="border-border/60 rounded-xl">
//             <CardHeader className="flex flex-col gap-3 pb-3 sm:flex-row sm:items-start sm:justify-between">
//               <div>
//                 <CardTitle className="text-base font-semibold">Period</CardTitle>
//                 <CardDescription>
//                   {format(adminFilterStart, "dd MMM yyyy")} → {format(adminFilterEnd, "dd MMM yyyy")}
//                 </CardDescription>
//               </div>
//               <div className="flex items-center gap-2">
//                 <span className="text-sm font-medium text-muted-foreground whitespace-nowrap">Sale type</span>
//                 <Select
//                   value={saleTypeId != null ? String(saleTypeId) : "all"}
//                   onValueChange={(v) => setSaleTypeId(v === "all" ? null : Number(v))}
//                 >
//                   <SelectTrigger className="w-[180px]">
//                     <SelectValue placeholder="All sale types" />
//                   </SelectTrigger>
//                   <SelectContent>
//                     <SelectItem value="all">All sale types</SelectItem>
//                     {saleTypes.map((st) => (
//                       <SelectItem key={st.id} value={String(st.id)}>{st.sale_type}</SelectItem>
//                     ))}
//                   </SelectContent>
//                 </Select>
//               </div>
//             </CardHeader>
//             <CardContent className="pt-0">
//               <div className="flex flex-wrap items-center gap-1 p-1 bg-muted/50 rounded-lg w-fit">
//                 {(["Today", "Weekly", "Monthly", "Yearly"] as const).map((tab) => (
//                   <button
//                     key={tab}
//                     onClick={() => handlePresetClick(tab)}
//                     className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
//                       adminTab === tab
//                         ? "bg-primary text-primary-foreground shadow-sm"
//                         : "text-muted-foreground hover:text-foreground hover:bg-background/60"
//                     }`}
//                   >
//                     {tab}
//                   </button>
//                 ))}

//                 {/* Custom — only activates after Apply */}
//                 <Popover open={customPopoverOpen} onOpenChange={setCustomPopoverOpen}>
//                   <PopoverTrigger asChild>
//                     <button
//                       className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors flex items-center gap-1.5 ${
//                         adminTab === "Custom"
//                           ? "bg-primary text-primary-foreground shadow-sm"
//                           : "text-muted-foreground hover:text-foreground hover:bg-background/60"
//                       }`}
//                     >
//                       <CalendarIcon className="h-3.5 w-3.5" />
//                       {adminTab === "Custom" && dateRange[0] && dateRange[1]
//                         ? `${format(dateRange[0], "dd MMM")} – ${format(dateRange[1], "dd MMM yyyy")}`
//                         : "Custom"}
//                     </button>
//                   </PopoverTrigger>
//                   <PopoverContent className="w-auto p-4" align="start">
//                     <div className="space-y-4">
//                       <div className="space-y-1">
//                         <label className="text-sm font-medium">From</label>
//                         <DateInput
//                           value={pendingRange[0] ?? undefined}
//                           onChange={(d) => setPendingRange((prev) => [d ?? null, prev[1]])}
//                           className="mt-1"
//                         />
//                       </div>
//                       <div className="space-y-1">
//                         <label className="text-sm font-medium">To</label>
//                         <DateInput
//                           value={pendingRange[1] ?? undefined}
//                           onChange={(d) => setPendingRange((prev) => [prev[0], d ?? null])}
//                           className="mt-1"
//                         />
//                       </div>
//                       <Button
//                         size="sm"
//                         onClick={handleCustomApply}
//                         disabled={!pendingRange[0] || !pendingRange[1]}
//                         className="w-full"
//                       >
//                         Apply
//                       </Button>
//                     </div>
//                   </PopoverContent>
//                 </Popover>
//               </div>
//             </CardContent>
//           </Card>
//         )}

//         {/* ── Data ──────────────────────────────────────────────────────────── */}
//         {isLoading ? (
//           <div className="flex items-center justify-center py-16">
//             <Loader2 className="h-8 w-8 animate-spin text-primary" />
//           </div>
//         ) : !report ? (
//           <Card>
//             <CardContent className="py-10 text-center text-muted-foreground">
//               No data available for this period.
//             </CardContent>
//           </Card>
//         ) : (
//           <>
//             {/* Performance KPIs */}
//             <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
//               <StatCard icon={<IndianRupee />} label="Total Revenue"      value={formatCurrency(perf?.total_revenue ?? 0)}         color="primary" />
//               <StatCard icon={<Users />}       label="Total Enrollments"  value={String(perf?.total_enrollments ?? 0)}              color="blue"    />
//               <StatCard icon={<Package />}     label="Core Sale Rev"      value={formatCurrency(perf?.core_sale_revenue ?? 0)}      color="violet"  />
//               <StatCard icon={<ShoppingBag />} label="Core Product Rev"   value={formatCurrency(perf?.core_product_revenue ?? 0)}   color="amber"   />
//             </div>
//             <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
//               <StatCard icon={<ShoppingBag />} label="Other Product Rev"  value={formatCurrency(perf?.other_product_revenue ?? 0)}  color="teal"    />
//               <StatCard icon={<IndianRupee />} label="Avg Rev / Client"   value={formatCurrency(perf?.average_revenue_per_client ?? 0)} color="rose" />
//               <StatCard icon={<Users />}       label="Archived Clients"   value={String(perf?.archived_count ?? 0)}                 color="slate"   />
//               <StatCard icon={<Clock />} label="Pending Amount"   value={formatCurrency(Number(perf?.pending_amount) || 0)}   color="red"   />
//             </div>

//             {/* Sale type categories (count + amount per category) */}
//             {saleTypeCategoryCounts.length > 0 && (
//               <Card className="border-border/60 rounded-xl overflow-hidden">
//                 <CardHeader className="border-b border-border/40 pb-4">
//                   <CardTitle className="flex items-center gap-2 text-base font-semibold">
//                     <Layers className="h-5 w-5 text-primary" />
//                     Sale type categories
//                   </CardTitle>
//                   <CardDescription>
//                     Enrollments and revenue by category for this period
//                     {saleTypeId != null ? " (filtered sale type)" : ""}.
//                   </CardDescription>
//                 </CardHeader>
//                 <CardContent className="pt-5">
//                   <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
//                     {saleTypeCategoryCounts.map((row) => (
//                       <Card key={row.category_id} className="border-border/60 rounded-lg">
//                         <CardContent className="p-4 space-y-3">
//                           <div className="flex items-center justify-between gap-2">
//                             <p className="text-sm font-semibold text-foreground">
//                               {formatCategoryLabel(row.category_name)}
//                             </p>
//                             <Badge variant="secondary" className="text-xs">
//                               ID: {row.category_id}
//                             </Badge>
//                           </div>
//                           <div className="grid grid-cols-2 gap-3">
//                             <div className="rounded-md bg-muted/40 p-3">
//                               <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Count</p>
//                               <p className="mt-1 text-xl font-bold tabular-nums">{row.count}</p>
//                             </div>
//                             <div className="rounded-md bg-muted/40 p-3">
//                               <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Amount</p>
//                               <p className="mt-1 text-base font-bold tabular-nums">
//                                 {formatCurrency(parseAmount(row.amount))}
//                               </p>
//                             </div>
//                           </div>
//                         </CardContent>
//                       </Card>
//                     ))}
//                   </div>
//                 </CardContent>
//               </Card>
//             )}

//             {/* Monthly Comparison */}
//             {mc && (
//               <Card className="border-border/60 rounded-xl">
//                 <CardHeader className="border-b border-border/40 pb-4">
//                   <CardTitle className="flex items-center gap-2 text-base font-semibold">
//                     <BarChart3 className="h-5 w-5 text-primary" />
//                     {adminTab === "Yearly" || isCounsellor ? "Period Comparison" : adminTab === "Today" ? "Daily Comparison" : adminTab === "Weekly" ? "Weekly Comparison" : "Monthly Comparison"}
//                   </CardTitle>
//                 </CardHeader>
//                 <CardContent className="pt-5">
//                   <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
//                     <div className="rounded-lg border border-border/60 p-4 space-y-1">
//                       <p className="text-xs uppercase font-medium text-muted-foreground tracking-wider">
//                         {adminTab === "Yearly" ? "Current Year" : adminTab === "Today" ? "Today" : adminTab === "Weekly" ? "This Week" : "Current Month"}
//                       </p>
//                       <p className="text-lg font-bold tabular-nums">{formatCurrency(mc.current_month.revenue)}</p>
//                       <p className="text-xs text-muted-foreground">{mc.current_month.start_date} → {mc.current_month.end_date}</p>
//                     </div>
//                     <div className="rounded-lg border border-border/60 p-4 space-y-1">
//                       <p className="text-xs uppercase font-medium text-muted-foreground tracking-wider">
//                         {adminTab === "Yearly" ? "Last Year" : adminTab === "Today" ? "Yesterday" : adminTab === "Weekly" ? "Last Week" : "Last Month"}
//                       </p>
//                       <p className="text-lg font-bold tabular-nums">{formatCurrency(mc.last_month.revenue)}</p>
//                       <p className="text-xs text-muted-foreground">{mc.last_month.start_date} → {mc.last_month.end_date}</p>
//                     </div>
//                     <div className="rounded-lg border border-border/60 p-4 space-y-2">
//                       <p className="text-xs uppercase font-medium text-muted-foreground tracking-wider">Growth</p>
//                       <GrowthBadge pct={mc.growth_percentage} />
//                     </div>
//                     <div className="rounded-lg border border-border/60 p-4 space-y-1">
//                       <p className="text-xs uppercase font-medium text-muted-foreground tracking-wider">Rank</p>
//                       <div className="flex items-center gap-2">
//                         <Trophy className="h-5 w-5 text-amber-500" />
//                         <span className="text-lg font-bold">
//                           {mc.rank}
//                           {/* <span className="text-sm font-normal text-muted-foreground"> / {mc.total_counsellors}</span> */}
//                         </span>
//                       </div>
//                     </div>
//                   </div>

//                   {/* Target achievement */}
//                   <div className="mt-4 rounded-lg border border-border/60 p-4">
//                     <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
//                       <div className="flex items-center gap-2">
//                         <Target className="h-4 w-4 text-primary" />
//                         <span className="text-sm font-semibold">Target Achievement</span>
//                       </div>
//                       <Badge
//                         className={
//                           mc.target_achieved_percentage >= 100
//                             ? "bg-emerald-100 text-emerald-700 border-emerald-200 hover:bg-emerald-100"
//                             : "bg-amber-100 text-amber-700 border-amber-200 hover:bg-amber-100"
//                         }
//                       >
//                         {mc.target_achieved_percentage.toFixed(1)}%
//                       </Badge>
//                     </div>
//                     <div className="flex items-center gap-3 text-sm text-muted-foreground">
//                       <span>Achieved: <span className="font-semibold text-foreground">{mc.achieved}</span></span>
//                       <span className="text-border">/</span>
//                       <span>Target: <span className="font-semibold text-foreground">{mc.target}</span></span>
//                     </div>
//                     <div className="mt-3 h-2 rounded-full bg-muted overflow-hidden">
//                       <div
//                         className={`h-full rounded-full transition-all ${mc.target_achieved_percentage >= 100 ? "bg-emerald-500" : "bg-primary"}`}
//                         style={{ width: `${Math.min(mc.target_achieved_percentage, 100)}%` }}
//                       />
//                     </div>
//                   </div>
//                 </CardContent>
//               </Card>
//             )}

//             {/* Product Analytics */}
//             {pa && (
//               <div className="space-y-4">
//                 {/* Core Sale */}
//                 <Card className="border-border/60 rounded-xl">
//                   <CardHeader className="border-b border-border/40 pb-4">
//                     <CardTitle className="flex items-center gap-2 text-base font-semibold">
//                       <IndianRupee className="h-5 w-5 text-primary" />
//                       Core Sale Analytics
//                     </CardTitle>
//                   </CardHeader>
//                   <CardContent className="pt-5">
//                     <div className="grid gap-4 sm:grid-cols-3">
//                       <div className="rounded-lg border border-border/60 p-4 space-y-1">
//                         <p className="text-xs uppercase font-medium text-muted-foreground tracking-wider">Total Sales</p>
//                         <p className="text-2xl font-bold">{pa.core_sale.total_sales}</p>
//                       </div>
//                       <div className="rounded-lg border border-border/60 p-4 space-y-1">
//                         <p className="text-xs uppercase font-medium text-muted-foreground tracking-wider">Revenue</p>
//                         <p className="text-2xl font-bold tabular-nums">{formatCurrency(pa.core_sale.revenue)}</p>
//                       </div>
//                       <div className="rounded-lg border border-border/60 p-4 space-y-1">
//                         <p className="text-xs uppercase font-medium text-muted-foreground tracking-wider">Avg Ticket Size</p>
//                         <p className="text-2xl font-bold tabular-nums">{formatCurrency(pa.core_sale.average_ticket_size)}</p>
//                       </div>
//                     </div>
//                   </CardContent>
//                 </Card>

//                 {/* Core Product */}
//                 <Card className="border-border/60 rounded-xl">
//                   <CardHeader className="border-b border-border/40 pb-4">
//                     <CardTitle className="flex items-center gap-2 text-base font-semibold">
//                       <Package className="h-5 w-5 text-violet-500" />
//                       Core Product — {pa.core_product.display_name}
//                     </CardTitle>
//                   </CardHeader>
//                   <CardContent className="pt-5">
//                     <div className="grid gap-4 sm:grid-cols-3">
//                       <div className="rounded-lg border border-border/60 p-4 space-y-1">
//                         <p className="text-xs uppercase font-medium text-muted-foreground tracking-wider">Total Sold</p>
//                         <p className="text-2xl font-bold">{pa.core_product.total_sold}</p>
//                       </div>
//                       <div className="rounded-lg border border-border/60 p-4 space-y-1">
//                         <p className="text-xs uppercase font-medium text-muted-foreground tracking-wider">Revenue</p>
//                         <p className="text-2xl font-bold tabular-nums">{formatCurrency(pa.core_product.revenue)}</p>
//                       </div>
//                       <div className="rounded-lg border border-border/60 p-4 space-y-1">
//                         <p className="text-xs uppercase font-medium text-muted-foreground tracking-wider">Attachment Rate</p>
//                         <p className="text-2xl font-bold">{pa.core_product.attachment_rate.toFixed(2)}%</p>
//                       </div>
//                     </div>
//                   </CardContent>
//                 </Card>

//                 {/* Other Products — Company Revenue */}
//                 {pa.other_products.company_revenue.products.length > 0 && (
//                   <Card className="border-border/60 rounded-xl overflow-hidden">
//                     <CardHeader className="border-b border-border/40 pb-4">
//                       <CardTitle className="flex items-center gap-2 text-base font-semibold">
//                         <ShoppingBag className="h-5 w-5 text-teal-500" />
//                         Other Products (Company Revenue)
//                       </CardTitle>
//                       <CardDescription>
//                         {pa.other_products.company_revenue.total_sold} sold &nbsp;·&nbsp;{" "}
//                         {formatCurrency(pa.other_products.company_revenue.total_revenue)} total
//                       </CardDescription>
//                     </CardHeader>
//                     <CardContent className="p-0">
//                       <div className="overflow-x-auto">
//                         <Table>
//                           <TableHeader>
//                             <TableRow className="hover:bg-transparent border-b border-border/60">
//                               <TableHead className="font-semibold">Product</TableHead>
//                               <TableHead className="text-right font-semibold">Sold</TableHead>
//                               <TableHead className="text-right font-semibold">Revenue</TableHead>
//                             </TableRow>
//                           </TableHeader>
//                           <TableBody>
//                             {pa.other_products.company_revenue.products.map((p) => (
//                               <TableRow key={p.product_name} className="border-b border-border/40">
//                                 <TableCell className="font-medium">{p.display_name}</TableCell>
//                                 <TableCell className="text-right tabular-nums">{p.total_sold}</TableCell>
//                                 <TableCell className="text-right tabular-nums">{formatCurrency(p.revenue ?? 0)}</TableCell>
//                               </TableRow>
//                             ))}
//                           </TableBody>
//                         </Table>
//                       </div>
//                     </CardContent>
//                   </Card>
//                 )}

//                 {/* Third Party */}
//                 {pa.other_products.third_party.products.length > 0 && (
//                   <Card className="border-border/60 rounded-xl overflow-hidden">
//                     <CardHeader className="border-b border-border/40 pb-4">
//                       <CardTitle className="flex items-center gap-2 text-base font-semibold">
//                         <ShoppingBag className="h-5 w-5 text-rose-500" />
//                         Third Party Products
//                       </CardTitle>
//                       <CardDescription>
//                         {pa.other_products.third_party.total_sold} sold &nbsp;·&nbsp;{" "}
//                         {formatCurrency(pa.other_products.third_party.total_collected)} collected
//                       </CardDescription>
//                     </CardHeader>
//                     <CardContent className="p-0">
//                       <div className="overflow-x-auto">
//                         <Table>
//                           <TableHeader>
//                             <TableRow className="hover:bg-transparent border-b border-border/60">
//                               <TableHead className="font-semibold">Product</TableHead>
//                               <TableHead className="text-right font-semibold">Sold</TableHead>
//                               <TableHead className="text-right font-semibold">Collected</TableHead>
//                             </TableRow>
//                           </TableHeader>
//                           <TableBody>
//                             {pa.other_products.third_party.products.map((p) => (
//                               <TableRow key={p.product_name} className="border-b border-border/40">
//                                 <TableCell className="font-medium">{p.display_name}</TableCell>
//                                 <TableCell className="text-right tabular-nums">{p.total_sold}</TableCell>
//                                 <TableCell className="text-right tabular-nums">{formatCurrency(p.total_collected ?? 0)}</TableCell>
//                               </TableRow>
//                             ))}
//                           </TableBody>
//                         </Table>
//                       </div>
//                     </CardContent>
//                   </Card>
//                 )}
//               </div>
//             )}
//           </>
//         )}
//       </div>
//     </PageWrapper>
//   );
// }

// // ── Reusable stat card ─────────────────────────────────────────────────────────
// function StatCard({
//   icon,
//   label,
//   value,
//   color,
// }: {
//   icon: React.ReactNode;
//   label: string;
//   value: string;
//   color: "primary" | "blue" | "violet" | "amber" | "teal" | "rose" | "slate" | "red";
// }) {
//   const colorMap: Record<string, string> = {
//     primary: "bg-primary/10 text-primary",
//     blue:    "bg-blue-100 text-blue-600",
//     violet:  "bg-violet-100 text-violet-600",
//     amber:   "bg-amber-100 text-amber-600",
//     teal:    "bg-teal-100 text-teal-600",
//     rose:    "bg-rose-100 text-rose-600",
//     slate:   "bg-slate-100 text-slate-600",
//     red:     "bg-red-100 text-red-600",
//   };
//   return (
//     <Card className="border-border/50 rounded-xl overflow-hidden">
//       <CardContent className="p-4 flex items-center gap-3">
//         <div className={`p-2 rounded-lg ${colorMap[color]}`}>{icon}</div>
//         <div className="min-w-0">
//           <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider truncate">{label}</p>
//           <p className="text-lg font-bold tabular-nums truncate">{value}</p>
//         </div>
//       </CardContent>
//     </Card>
//   );
// }



import { useState, useMemo, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { useAuth } from "@/context/auth-context";
import { PageWrapper } from "@/layout/PageWrapper";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { clientService } from "@/services/clientService";
import { useQuery } from "@tanstack/react-query";
import {
  format,
  getDaysInMonth,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  startOfYear,
  endOfYear,
} from "date-fns";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { DateInput } from "@/components/ui/date-input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Loader2,
  IndianRupee,
  Package,
  ShoppingBag,
  ArrowLeft,
  TrendingUp,
  TrendingDown,
  Users,
  Trophy,
  Target,
  BarChart3,
  Minus,
  ChevronDown,
  CalendarIcon,
  Clock,
  Layers,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

// ── Constants ──────────────────────────────────────────────────────────────────
const MONTHS = [
  { value: 1,  label: "January"   },
  { value: 2,  label: "February"  },
  { value: 3,  label: "March"     },
  { value: 4,  label: "April"     },
  { value: 5,  label: "May"       },
  { value: 6,  label: "June"      },
  { value: 7,  label: "July"      },
  { value: 8,  label: "August"    },
  { value: 9,  label: "September" },
  { value: 10, label: "October"   },
  { value: 11, label: "November"  },
  { value: 12, label: "December"  },
];

function buildYears(): number[] {
  const current = new Date().getFullYear();
  const years: number[] = [];
  for (let y = current; y >= 2020; y--) years.push(y);
  return years;
}
const YEARS = buildYears();

const ADMIN_TABS = ["Today", "Weekly", "Monthly", "Yearly", "Custom"] as const;
type AdminTab = (typeof ADMIN_TABS)[number];
const TAB_TO_FILTER: Record<AdminTab, "today" | "weekly" | "monthly" | "yearly" | "custom"> = {
  Today:   "today",
  Weekly:  "weekly",
  Monthly: "monthly",
  Yearly:  "yearly",
  Custom:  "custom",
};

// ── Helpers ────────────────────────────────────────────────────────────────────
function toYMD(year: number, month: number, day: number): string {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function dateToYMD(d: Date): string {
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

function formatCategoryLabel(name: string): string {
  if (!name) return "";
  return name.charAt(0).toUpperCase() + name.slice(1).toLowerCase();
}

function parseAmount(raw: string | number): number {
  if (typeof raw === "number") return raw;
  const n = Number.parseFloat(String(raw).replace(/,/g, ""));
  return Number.isFinite(n) ? n : 0;
}

function GrowthBadge({ pct }: { pct: number }) {
  if (pct > 0)
    return (
      <Badge className="gap-1 bg-emerald-100 text-emerald-700 border-emerald-200 hover:bg-emerald-100">
        <TrendingUp className="h-3 w-3" />+{pct.toFixed(2)}%
      </Badge>
    );
  if (pct < 0)
    return (
      <Badge className="gap-1 bg-red-100 text-red-700 border-red-200 hover:bg-red-100">
        <TrendingDown className="h-3 w-3" />{pct.toFixed(2)}%
      </Badge>
    );
  return (
    <Badge variant="secondary" className="gap-1">
      <Minus className="h-3 w-3" />0%
    </Badge>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────
export default function CounsellorReportPage() {
  const params = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const { user } = useAuth();

  const rawId = params?.id ?? "me";
  const counsellorId: number | "me" = rawId === "me" ? "me" : Number(rawId);

  const isCounsellor = user?.role === "counsellor";

  const now = new Date();

  // ── Counsellor filter state (Month + Year dropdowns) ──────────────────────
  const [selectedMonth, setSelectedMonth] = useState<number>(now.getMonth() + 1);
  const [selectedYear,  setSelectedYear]  = useState<number>(now.getFullYear());

  const counsellorStartDate = toYMD(selectedYear, selectedMonth, 1);
  const counsellorEndDate   = toYMD(
    selectedYear,
    selectedMonth,
    getDaysInMonth(new Date(selectedYear, selectedMonth - 1))
  );
  const monthLabel = MONTHS.find((m) => m.value === selectedMonth)?.label ?? "";

  // ── Admin / Manager filter state (pill buttons) ───────────────────────────
  const [adminTab,          setAdminTab]          = useState<AdminTab>("Monthly");
  const [dateRange,         setDateRange]         = useState<[Date | null, Date | null]>([null, null]);
  const [pendingRange,      setPendingRange]      = useState<[Date | null, Date | null]>([null, null]);
  const [customPopoverOpen, setCustomPopoverOpen] = useState(false);

  // ── Sale type filter (counsellor + admin/manager) ──────────────────────────
  const [saleTypeId, setSaleTypeId] = useState<number | null>(null);
  const [saleTypes, setSaleTypes] = useState<Array<{ id: number; sale_type: string }>>([]);
  useEffect(() => {
    let cancelled = false;
    clientService.getSaleTypes().then((list) => {
      if (!cancelled) setSaleTypes(list);
    }).catch((err) => console.error("Failed to load sale types", err));
    return () => { cancelled = true; };
  }, []);

  const adminFilterStart = useMemo(() => {
    if (adminTab === "Today")   return new Date(now.getFullYear(), now.getMonth(), now.getDate());
    if (adminTab === "Weekly")  return startOfWeek(now, { weekStartsOn: 1 });
    if (adminTab === "Monthly") return startOfMonth(now);
    if (adminTab === "Yearly")  return startOfYear(now);
    return dateRange[0] ?? startOfMonth(now);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [adminTab, dateRange]);

  const adminFilterEnd = useMemo(() => {
    if (adminTab === "Today")   return new Date(now.getFullYear(), now.getMonth(), now.getDate());
    if (adminTab === "Weekly")  return endOfWeek(now, { weekStartsOn: 1 });
    if (adminTab === "Monthly") return endOfMonth(now);
    if (adminTab === "Yearly")  return endOfYear(now);
    return dateRange[1] ?? endOfMonth(now);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [adminTab, dateRange]);

  const adminStartDate = dateToYMD(adminFilterStart);
  const adminEndDate   = dateToYMD(adminFilterEnd);
  const adminApiFilter = TAB_TO_FILTER[adminTab];
  const isCustomAdmin  = adminTab === "Custom";
  const canFetchAdmin  = !isCustomAdmin || (!!adminStartDate && !!adminEndDate);

  const handlePresetClick = (tab: Exclude<AdminTab, "Custom">) => {
    setAdminTab(tab);
    const n = new Date();
    if (tab === "Today")   setDateRange([new Date(n.getFullYear(), n.getMonth(), n.getDate()), new Date(n.getFullYear(), n.getMonth(), n.getDate())]);
    else if (tab === "Weekly")  setDateRange([startOfWeek(n, { weekStartsOn: 1 }), endOfWeek(n, { weekStartsOn: 1 })]);
    else if (tab === "Monthly") setDateRange([startOfMonth(n), endOfMonth(n)]);
    else if (tab === "Yearly")  setDateRange([startOfYear(n), endOfYear(n)]);
  };

  const handleCustomApply = () => {
    if (!pendingRange[0] || !pendingRange[1]) return;
    setDateRange(pendingRange);
    setAdminTab("Custom");
    setCustomPopoverOpen(false);
  };

  // ── Unified query params ───────────────────────────────────────────────────
  const queryStartDate = isCounsellor ? counsellorStartDate : adminStartDate;
  const queryEndDate   = isCounsellor ? counsellorEndDate   : adminEndDate;
  const queryFilter    = isCounsellor ? "custom" as const   : adminApiFilter;
  const canFetch       = isCounsellor ? true : canFetchAdmin;

  const { data: report, isLoading } = useQuery({
    queryKey: [
      "counsellor-report",
      counsellorId,
      isCounsellor ? selectedMonth : adminTab,
      isCounsellor ? selectedYear  : (isCustomAdmin ? adminStartDate : null),
      isCustomAdmin ? adminEndDate : null,
      saleTypeId,
    ],
    queryFn: () =>
      clientService.getCounsellorReport({
        id: counsellorId,
        filter: queryFilter,
        startDate: queryStartDate,
        endDate: queryEndDate,
        saleTypeId: saleTypeId ?? undefined,
      }),
    staleTime: 1000 * 60 * 2,
    enabled: canFetch && (counsellorId === "me" || !isNaN(counsellorId as number)),
  });

  // ── Validate ID ────────────────────────────────────────────────────────────
  if (counsellorId !== "me" && isNaN(counsellorId as number)) {
    return (
      <PageWrapper
        title="Counsellor Report"
        breadcrumbs={[{ label: "Reports", href: "/reports" }, { label: "Invalid" }]}
      >
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            Invalid counsellor.{" "}
            <Button variant="link" className="p-0" onClick={() => setLocation("/reports")}>
              Back to Reports
            </Button>
          </CardContent>
        </Card>
      </PageWrapper>
    );
  }

  const counsellorName =
    report?.counsellor?.full_name ??
    (counsellorId === "me" ? "My Report" : `Counsellor #${counsellorId}`);
  const perf = report?.performance;
  const mc   = report?.monthly_comparison;
  const pa   = report?.product_analytics;
  const saleTypeCategoryCounts = report?.sale_type_category_counts ?? [];

  return (
    <PageWrapper
      title={counsellorName}
      breadcrumbs={[{ label: "Reports", href: "/reports" }, { label: counsellorName }]}
      actions={
        <Button variant="outline" size="sm" onClick={() => setLocation("/reports")} className="gap-2">
          <ArrowLeft className="h-4 w-4" />
          <span className="hidden sm:inline">Back to Reports</span>
        </Button>
      }
    >
      <div className="space-y-6">
        {/* Counsellor info */}
        {report?.counsellor && (
          <Card className="border-border/60 rounded-xl">
            <CardContent className="pt-5 pb-4">
              <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm">
                <span className="font-medium text-foreground">{report.counsellor.designation}</span>
                {report.counsellor.manager_name && (
                  <span className="text-muted-foreground">
                    Manager:{" "}
                    <span className="font-medium text-foreground">{report.counsellor.manager_name}</span>
                  </span>
                )}
                <span className="text-muted-foreground">{report.counsellor.email}</span>
              </div>
            </CardContent>
          </Card>
        )}

      
{/* ── COUNSELLOR: Month + Year dropdowns ─────────────────────────────── */}
{isCounsellor && (
  <div className="flex flex-wrap items-center gap-3">
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="gap-2 min-w-[140px] justify-between">
          {monthLabel}
          <ChevronDown className="h-4 w-4 opacity-60" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-40 max-h-72 overflow-y-auto">
        {MONTHS.map((m) => (
          <DropdownMenuItem
            key={m.value}
            onSelect={() => setSelectedMonth(m.value)}
            className={selectedMonth === m.value ? "bg-primary/10 font-semibold" : ""}
          >
            {m.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>

    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="gap-2 min-w-[100px] justify-between">
          {selectedYear}
          <ChevronDown className="h-4 w-4 opacity-60" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-28 max-h-72 overflow-y-auto">
        {YEARS.map((y) => (
          <DropdownMenuItem
            key={y}
            onSelect={() => setSelectedYear(y)}
            className={selectedYear === y ? "bg-primary/10 font-semibold" : ""}
          >
            {y}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>

    <span className="text-sm text-muted-foreground">
      {counsellorStartDate} → {counsellorEndDate}
    </span>

    {/* SALE TYPE DROPDOWN - EXACT SAME STYLE AS MONTH DROPDOWN */}
    <div className="flex items-center gap-2">
      <span className="text-sm font-medium text-muted-foreground whitespace-nowrap">Sale type</span>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" className="gap-2 min-w-[180px] justify-between">
            {saleTypeId != null 
              ? saleTypes.find(st => st.id === saleTypeId)?.sale_type ?? "All sale types"
              : "All sale types"}
            <ChevronDown className="h-4 w-4 opacity-60" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-56 max-h-72 overflow-y-auto">
          <DropdownMenuItem
            onSelect={() => setSaleTypeId(null)}
            className={saleTypeId === null ? "bg-primary/10 font-semibold" : ""}
          >
            All sale types
          </DropdownMenuItem>
          {saleTypes.map((st) => (
            <DropdownMenuItem
              key={st.id}
              onSelect={() => setSaleTypeId(st.id)}
              className={saleTypeId === st.id ? "bg-primary/10 font-semibold" : ""}
            >
              {st.sale_type}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  </div>
)}

        {/* ── ADMIN / MANAGER: Today / Weekly / Monthly / Yearly / Custom ─────── */}
        {!isCounsellor && (
          <Card className="border-border/60 rounded-xl">
            <CardHeader className="flex flex-col gap-3 pb-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <CardTitle className="text-base font-semibold">Period</CardTitle>
                <CardDescription>
                  {format(adminFilterStart, "dd MMM yyyy")} → {format(adminFilterEnd, "dd MMM yyyy")}
                </CardDescription>
              </div>
              
              {/* SALE TYPE DROPDOWN WITH SCROLLBAR - FIXED */}
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-muted-foreground whitespace-nowrap">Sale type</span>
                <Select
                  value={saleTypeId != null ? String(saleTypeId) : "all"}
                  onValueChange={(v) => setSaleTypeId(v === "all" ? null : Number(v))}
                >
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="All sale types" />
                  </SelectTrigger>
                  <SelectContent className="max-h-[300px] overflow-y-auto">
                    <SelectItem value="all">All sale types</SelectItem>
                    {saleTypes.map((st) => (
                      <SelectItem key={st.id} value={String(st.id)}>{st.sale_type}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="flex flex-wrap items-center gap-1 p-1 bg-muted/50 rounded-lg w-fit">
                {(["Today", "Weekly", "Monthly", "Yearly"] as const).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => handlePresetClick(tab)}
                    className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                      adminTab === tab
                        ? "bg-primary text-primary-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground hover:bg-background/60"
                    }`}
                  >
                    {tab}
                  </button>
                ))}

                {/* Custom — only activates after Apply */}
                <Popover open={customPopoverOpen} onOpenChange={setCustomPopoverOpen}>
                  <PopoverTrigger asChild>
                    <button
                      className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors flex items-center gap-1.5 ${
                        adminTab === "Custom"
                          ? "bg-primary text-primary-foreground shadow-sm"
                          : "text-muted-foreground hover:text-foreground hover:bg-background/60"
                      }`}
                    >
                      <CalendarIcon className="h-3.5 w-3.5" />
                      {adminTab === "Custom" && dateRange[0] && dateRange[1]
                        ? `${format(dateRange[0], "dd MMM")} – ${format(dateRange[1], "dd MMM yyyy")}`
                        : "Custom"}
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
        )}

        {/* ── Data ──────────────────────────────────────────────────────────── */}
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : !report ? (
          <Card>
            <CardContent className="py-10 text-center text-muted-foreground">
              No data available for this period.
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Performance KPIs */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <StatCard icon={<IndianRupee />} label="Total Revenue"      value={formatCurrency(perf?.total_revenue ?? 0)}         color="primary" />
              <StatCard icon={<Users />}       label="Total Enrollments"  value={String(perf?.total_enrollments ?? 0)}              color="blue"    />
              <StatCard icon={<Package />}     label="Core Sale Rev"      value={formatCurrency(perf?.core_sale_revenue ?? 0)}      color="violet"  />
              <StatCard icon={<ShoppingBag />} label="Core Product Rev"   value={formatCurrency(perf?.core_product_revenue ?? 0)}   color="amber"   />
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <StatCard icon={<ShoppingBag />} label="Other Product Rev"  value={formatCurrency(perf?.other_product_revenue ?? 0)}  color="teal"    />
              <StatCard icon={<IndianRupee />} label="Avg Rev / Client"   value={formatCurrency(perf?.average_revenue_per_client ?? 0)} color="rose" />
              <StatCard icon={<Users />}       label="Archived Clients"   value={String(perf?.archived_count ?? 0)}                 color="slate"   />
              <StatCard icon={<Clock />} label="Pending Amount"   value={formatCurrency(Number(perf?.pending_amount) || 0)}   color="red"   />
            </div>

            {/* Sale type categories (count + amount per category) */}
            {saleTypeCategoryCounts.length > 0 && (
              <Card className="border-border/60 rounded-xl overflow-hidden">
                <CardHeader className="border-b border-border/40 pb-4">
                  <CardTitle className="flex items-center gap-2 text-base font-semibold">
                    <Layers className="h-5 w-5 text-primary" />
                    Sale type categories
                  </CardTitle>
                  <CardDescription>
                    Enrollments and revenue by category for this period
                    {saleTypeId != null ? " (filtered sale type)" : ""}.
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-5">
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {saleTypeCategoryCounts.map((row) => (
                      <Card key={row.category_id} className="border-border/60 rounded-lg">
                        <CardContent className="p-4 space-y-3">
                          <div className="flex items-center justify-between gap-2">
                            <p className="text-sm font-semibold text-foreground">
                              {formatCategoryLabel(row.category_name)}
                            </p>
                            <Badge variant="secondary" className="text-xs">
                              ID: {row.category_id}
                            </Badge>
                          </div>
                          <div className="grid grid-cols-2 gap-3">
                            <div className="rounded-md bg-muted/40 p-3">
                              <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Count</p>
                              <p className="mt-1 text-xl font-bold tabular-nums">{row.count}</p>
                            </div>
                            <div className="rounded-md bg-muted/40 p-3">
                              <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Amount</p>
                              <p className="mt-1 text-base font-bold tabular-nums">
                                {formatCurrency(parseAmount(row.amount))}
                              </p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Monthly Comparison */}
            {mc && (
              <Card className="border-border/60 rounded-xl">
                <CardHeader className="border-b border-border/40 pb-4">
                  <CardTitle className="flex items-center gap-2 text-base font-semibold">
                    <BarChart3 className="h-5 w-5 text-primary" />
                    {adminTab === "Yearly" || isCounsellor ? "Period Comparison" : adminTab === "Today" ? "Daily Comparison" : adminTab === "Weekly" ? "Weekly Comparison" : "Monthly Comparison"}
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-5">
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    <div className="rounded-lg border border-border/60 p-4 space-y-1">
                      <p className="text-xs uppercase font-medium text-muted-foreground tracking-wider">
                        {adminTab === "Yearly" ? "Current Year" : adminTab === "Today" ? "Today" : adminTab === "Weekly" ? "This Week" : "Current Month"}
                      </p>
                      <p className="text-lg font-bold tabular-nums">{formatCurrency(mc.current_month.revenue)}</p>
                      <p className="text-xs text-muted-foreground">{mc.current_month.start_date} → {mc.current_month.end_date}</p>
                    </div>
                    <div className="rounded-lg border border-border/60 p-4 space-y-1">
                      <p className="text-xs uppercase font-medium text-muted-foreground tracking-wider">
                        {adminTab === "Yearly" ? "Last Year" : adminTab === "Today" ? "Yesterday" : adminTab === "Weekly" ? "Last Week" : "Last Month"}
                      </p>
                      <p className="text-lg font-bold tabular-nums">{formatCurrency(mc.last_month.revenue)}</p>
                      <p className="text-xs text-muted-foreground">{mc.last_month.start_date} → {mc.last_month.end_date}</p>
                    </div>
                    <div className="rounded-lg border border-border/60 p-4 space-y-2">
                      <p className="text-xs uppercase font-medium text-muted-foreground tracking-wider">Growth</p>
                      <GrowthBadge pct={mc.growth_percentage} />
                    </div>
                    <div className="rounded-lg border border-border/60 p-4 space-y-1">
                      <p className="text-xs uppercase font-medium text-muted-foreground tracking-wider">Rank</p>
                      <div className="flex items-center gap-2">
                        <Trophy className="h-5 w-5 text-amber-500" />
                        <span className="text-lg font-bold">
                          {mc.rank}
                          {/* <span className="text-sm font-normal text-muted-foreground"> / {mc.total_counsellors}</span> */}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Target achievement */}
                  <div className="mt-4 rounded-lg border border-border/60 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                      <div className="flex items-center gap-2">
                        <Target className="h-4 w-4 text-primary" />
                        <span className="text-sm font-semibold">Target Achievement</span>
                      </div>
                      <Badge
                        className={
                          mc.target_achieved_percentage >= 100
                            ? "bg-emerald-100 text-emerald-700 border-emerald-200 hover:bg-emerald-100"
                            : "bg-amber-100 text-amber-700 border-amber-200 hover:bg-amber-100"
                        }
                      >
                        {mc.target_achieved_percentage.toFixed(1)}%
                      </Badge>
                    </div>
                    <div className="flex items-center gap-3 text-sm text-muted-foreground">
                      <span>Achieved: <span className="font-semibold text-foreground">{mc.achieved}</span></span>
                      <span className="text-border">/</span>
                      <span>Target: <span className="font-semibold text-foreground">{mc.target}</span></span>
                    </div>
                    <div className="mt-3 h-2 rounded-full bg-muted overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${mc.target_achieved_percentage >= 100 ? "bg-emerald-500" : "bg-primary"}`}
                        style={{ width: `${Math.min(mc.target_achieved_percentage, 100)}%` }}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Product Analytics */}
            {pa && (
              <div className="space-y-4">
                {/* Core Sale */}
                <Card className="border-border/60 rounded-xl">
                  <CardHeader className="border-b border-border/40 pb-4">
                    <CardTitle className="flex items-center gap-2 text-base font-semibold">
                      <IndianRupee className="h-5 w-5 text-primary" />
                      Core Sale Analytics
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-5">
                    <div className="grid gap-4 sm:grid-cols-3">
                      <div className="rounded-lg border border-border/60 p-4 space-y-1">
                        <p className="text-xs uppercase font-medium text-muted-foreground tracking-wider">Total Sales</p>
                        <p className="text-2xl font-bold">{pa.core_sale.total_sales}</p>
                      </div>
                      <div className="rounded-lg border border-border/60 p-4 space-y-1">
                        <p className="text-xs uppercase font-medium text-muted-foreground tracking-wider">Revenue</p>
                        <p className="text-2xl font-bold tabular-nums">{formatCurrency(pa.core_sale.revenue)}</p>
                      </div>
                      <div className="rounded-lg border border-border/60 p-4 space-y-1">
                        <p className="text-xs uppercase font-medium text-muted-foreground tracking-wider">Avg Ticket Size</p>
                        <p className="text-2xl font-bold tabular-nums">{formatCurrency(pa.core_sale.average_ticket_size)}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Core Product */}
                <Card className="border-border/60 rounded-xl">
                  <CardHeader className="border-b border-border/40 pb-4">
                    <CardTitle className="flex items-center gap-2 text-base font-semibold">
                      <Package className="h-5 w-5 text-violet-500" />
                      Core Product — {pa.core_product.display_name}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-5">
                    <div className="grid gap-4 sm:grid-cols-3">
                      <div className="rounded-lg border border-border/60 p-4 space-y-1">
                        <p className="text-xs uppercase font-medium text-muted-foreground tracking-wider">Total Sold</p>
                        <p className="text-2xl font-bold">{pa.core_product.total_sold}</p>
                      </div>
                      <div className="rounded-lg border border-border/60 p-4 space-y-1">
                        <p className="text-xs uppercase font-medium text-muted-foreground tracking-wider">Revenue</p>
                        <p className="text-2xl font-bold tabular-nums">{formatCurrency(pa.core_product.revenue)}</p>
                      </div>
                      <div className="rounded-lg border border-border/60 p-4 space-y-1">
                        <p className="text-xs uppercase font-medium text-muted-foreground tracking-wider">Attachment Rate</p>
                        <p className="text-2xl font-bold">{pa.core_product.attachment_rate.toFixed(2)}%</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Other Products — Company Revenue */}
                {pa.other_products.company_revenue.products.length > 0 && (
                  <Card className="border-border/60 rounded-xl overflow-hidden">
                    <CardHeader className="border-b border-border/40 pb-4">
                      <CardTitle className="flex items-center gap-2 text-base font-semibold">
                        <ShoppingBag className="h-5 w-5 text-teal-500" />
                        Other Products (Company Revenue)
                      </CardTitle>
                      <CardDescription>
                        {pa.other_products.company_revenue.total_sold} sold &nbsp;·&nbsp;{" "}
                        {formatCurrency(pa.other_products.company_revenue.total_revenue)} total
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="p-0">
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow className="hover:bg-transparent border-b border-border/60">
                              <TableHead className="font-semibold">Product</TableHead>
                              <TableHead className="text-right font-semibold">Sold</TableHead>
                              <TableHead className="text-right font-semibold">Revenue</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {pa.other_products.company_revenue.products.map((p) => (
                              <TableRow key={p.product_name} className="border-b border-border/40">
                                <TableCell className="font-medium">{p.display_name}</TableCell>
                                <TableCell className="text-right tabular-nums">{p.total_sold}</TableCell>
                                <TableCell className="text-right tabular-nums">{formatCurrency(p.revenue ?? 0)}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Third Party */}
                {pa.other_products.third_party.products.length > 0 && (
                  <Card className="border-border/60 rounded-xl overflow-hidden">
                    <CardHeader className="border-b border-border/40 pb-4">
                      <CardTitle className="flex items-center gap-2 text-base font-semibold">
                        <ShoppingBag className="h-5 w-5 text-rose-500" />
                        Third Party Products
                      </CardTitle>
                      <CardDescription>
                        {pa.other_products.third_party.total_sold} sold &nbsp;·&nbsp;{" "}
                        {formatCurrency(pa.other_products.third_party.total_collected)} collected
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="p-0">
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow className="hover:bg-transparent border-b border-border/60">
                              <TableHead className="font-semibold">Product</TableHead>
                              <TableHead className="text-right font-semibold">Sold</TableHead>
                              <TableHead className="text-right font-semibold">Collected</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {pa.other_products.third_party.products.map((p) => (
                              <TableRow key={p.product_name} className="border-b border-border/40">
                                <TableCell className="font-medium">{p.display_name}</TableCell>
                                <TableCell className="text-right tabular-nums">{p.total_sold}</TableCell>
                                <TableCell className="text-right tabular-nums">{formatCurrency(p.total_collected ?? 0)}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </PageWrapper>
  );
}

// ── Reusable stat card ─────────────────────────────────────────────────────────
function StatCard({
  icon,
  label,
  value,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  color: "primary" | "blue" | "violet" | "amber" | "teal" | "rose" | "slate" | "red";
}) {
  const colorMap: Record<string, string> = {
    primary: "bg-primary/10 text-primary",
    blue:    "bg-blue-100 text-blue-600",
    violet:  "bg-violet-100 text-violet-600",
    amber:   "bg-amber-100 text-amber-600",
    teal:    "bg-teal-100 text-teal-600",
    rose:    "bg-rose-100 text-rose-600",
    slate:   "bg-slate-100 text-slate-600",
    red:     "bg-red-100 text-red-600",
  };
  return (
    <Card className="border-border/50 rounded-xl overflow-hidden">
      <CardContent className="p-4 flex items-center gap-3">
        <div className={`p-2 rounded-lg ${colorMap[color]}`}>{icon}</div>
        <div className="min-w-0">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider truncate">{label}</p>
          <p className="text-lg font-bold tabular-nums truncate">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}