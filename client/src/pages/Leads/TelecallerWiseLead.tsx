import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  format,
  startOfDay,
  endOfDay,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
} from "date-fns";
import {
  Users,
  Phone,
  UserCheck,
  CalendarClock,
  ArrowRightLeft,
  CheckCircle2,
  PhoneOff,
} from "lucide-react";
import { useLocation, useSearch } from "wouter";
import { Toaster } from "sonner";

import { Breadcrumbs } from "@/layout/Breadcrumbs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import DateRangePicker from "@/components/payments/DateRangePicker";
import api from "@/lib/api";
import {
  getTelecallerLeadSummary,
  type TelecallerLeadSummaryRow,
} from "@/api/leads.api";
import {
  buildLeadListUrlFromReport,
  type LeadReportMetricKey,
} from "@/lib/lead-report-metrics";

type DateFilterType = "all" | "today" | "weekly" | "monthly" | "custom";
type UserLite = { id: number; fullName: string };

type StatRow = UserLite &
  Pick<
    TelecallerLeadSummaryRow,
    | "total"
    | "contacted"
    | "notContacted"
    | "transferred"
    | "converted"
    | "followUp"
    | "junk"
  >;

const emptyAgg = {
  total: 0,
  contacted: 0,
  notContacted: 0,
  transferred: 0,
  converted: 0,
  followUp: 0,
  junk: 0,
};

function getDateBounds(
  dateFilter: DateFilterType,
  customDateFrom?: string,
  customDateTo?: string
) {
  const now = new Date();
  if (dateFilter === "all") return null;
  if (dateFilter === "today") return { from: startOfDay(now), to: endOfDay(now) };
  if (dateFilter === "weekly") {
    return { from: startOfWeek(now, { weekStartsOn: 1 }), to: endOfWeek(now, { weekStartsOn: 1 }) };
  }
  if (dateFilter === "monthly") return { from: startOfMonth(now), to: endOfMonth(now) };
  if (dateFilter === "custom" && customDateFrom && customDateTo) {
    return { from: startOfDay(new Date(customDateFrom)), to: endOfDay(new Date(customDateTo)) };
  }
  return null;
}

export default function TelecallerWiseLead() {
  const [, setLocation] = useLocation();
  const searchStr = useSearch();
  const [loading, setLoading] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);

  const navParams = useMemo(() => {
    const params = new URLSearchParams(searchStr.startsWith("?") ? searchStr.slice(1) : searchStr);
    const rawDateFilter = params.get("dateFilter");
    const dateFilter =
      rawDateFilter &&
      (["all", "today", "weekly", "monthly", "custom"] as const).includes(rawDateFilter as DateFilterType)
        ? (rawDateFilter as DateFilterType)
        : undefined;
    return {
      dateFilter,
      customDateFrom: params.get("createdFrom") ?? undefined,
      customDateTo: params.get("createdTo") ?? undefined,
    };
  }, [searchStr]);

  const [dateFilter, setDateFilter] = useState<DateFilterType>(navParams.dateFilter ?? "today");
  const [customDateFrom, setCustomDateFrom] = useState<string | undefined>(navParams.customDateFrom);
  const [customDateTo, setCustomDateTo] = useState<string | undefined>(navParams.customDateTo);

  useEffect(() => {
    if (navParams.dateFilter) setDateFilter(navParams.dateFilter);
    if (navParams.customDateFrom) setCustomDateFrom(navParams.customDateFrom);
    if (navParams.customDateTo) setCustomDateTo(navParams.customDateTo);
  }, [navParams]);

  const [telecallers, setTelecallers] = useState<UserLite[]>([]);
  const [summaryRows, setSummaryRows] = useState<TelecallerLeadSummaryRow[]>([]);

  const rangeParams = useMemo(() => {
    const bounds = getDateBounds(dateFilter, customDateFrom, customDateTo);
    if (!bounds) return {};
    return {
      createdFrom: bounds.from.toISOString(),
      createdTo: bounds.to.toISOString(),
    };
  }, [dateFilter, customDateFrom, customDateTo]);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const tRes = await api.get("/api/users/telecallers");
      setTelecallers(tRes?.data?.data || tRes?.data || []);

      const summary = await getTelecallerLeadSummary(rangeParams);
      setSummaryRows(summary);
    } finally {
      setLoading(false);
    }
  }, [rangeParams]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const summaryMap = useMemo(
    () => new Map(summaryRows.map((r) => [r.telecallerId, r])),
    [summaryRows]
  );

  const telecallerStats: StatRow[] = useMemo(() => {
    return telecallers.map((t) => {
      const s = summaryMap.get(t.id);
      return {
        ...t,
        total: s?.total ?? 0,
        contacted: s?.contacted ?? 0,
        notContacted: s?.notContacted ?? 0,
        transferred: s?.transferred ?? 0,
        converted: s?.converted ?? 0,
        followUp: s?.followUp ?? 0,
        junk: s?.junk ?? 0,
      };
    });
  }, [telecallers, summaryMap]);

  const displayTotals = useMemo(() => {
    return telecallerStats.reduce(
      (acc, t) => ({
        total: acc.total + t.total,
        contacted: acc.contacted + t.contacted,
        notContacted: acc.notContacted + t.notContacted,
        transferred: acc.transferred + t.transferred,
        converted: acc.converted + t.converted,
        followUp: acc.followUp + t.followUp,
        junkCount: acc.junkCount + t.junk,
      }),
      {
        total: 0, contacted: 0, notContacted: 0, transferred: 0,
        converted: 0, followUp: 0, junkCount: 0,
      }
    );
  }, [telecallerStats]);

  const customLabel =
    dateFilter === "custom" && customDateFrom && customDateTo
      ? `${format(new Date(customDateFrom), "d MMM")} - ${format(new Date(customDateTo), "d MMM yyyy")}`
      : null;

  const openLeadList = useCallback(
    (metric: LeadReportMetricKey) => {
      const baseUrl = buildLeadListUrlFromReport({ metric, dateFilter, customDateFrom, customDateTo });
      const [path, qs] = baseUrl.split("?");
      const params = new URLSearchParams(qs ?? "");
      params.set("hasTelecaller", "1");
      params.set("clearFilters", "1");
      setLocation(`${path}?${params.toString()}`);
    },
    [setLocation, dateFilter, customDateFrom, customDateTo]
  );

  return (
    <div className="space-y-5">
      <Toaster richColors position="top-center" closeButton />
      <Breadcrumbs items={[{ label: "Leads", href: "/leads" }, { label: "Telecaller Wise Leads" }]} />

      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h1 className="text-2xl font-bold">Telecaller Wise Leads</h1>

        <div className="flex items-center gap-2">
          {(["all", "today", "weekly", "monthly"] as const).map((filter) => (
            <Button
              key={filter}
              variant={dateFilter === filter ? "default" : "outline"}
              size="sm"
              onClick={() => {
                setDateFilter(filter);
                setCustomDateFrom(undefined);
                setCustomDateTo(undefined);
              }}
              className="capitalize"
            >
              {filter}
            </Button>
          ))}
          <Button
            variant={dateFilter === "custom" ? "default" : "outline"}
            size="sm"
            onClick={() => setShowDatePicker(true)}
          >
            {customLabel ?? "Custom"}
          </Button>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-7">
        {([
          { label: "Assigned Leads", value: displayTotals.total,       icon: Users,         color: "text-primary",     metric: "assigned"        },
          { label: "Not Contacted",  value: displayTotals.notContacted, icon: PhoneOff,      color: "text-slate-600",   metric: "not_contacted"   },
          { label: "Junk Marked",    value: displayTotals.junkCount,    icon: UserCheck,     color: "text-rose-600",    metric: "junk"            },
          { label: "Contacted",      value: displayTotals.contacted,    icon: Phone,         color: "text-blue-600",    metric: "contacted"       },
          { label: "Transferred",    value: displayTotals.transferred,  icon: ArrowRightLeft,color: "text-amber-600",   metric: "transferred"     },
          { label: "Converted",      value: displayTotals.converted,    icon: CheckCircle2,  color: "text-emerald-600", metric: "converted"       },
          { label: "Follow Up",      value: displayTotals.followUp,     icon: CalendarClock, color: "text-primary",     metric: "pending_follow_up"},
        ] as { label: string; value: number; icon: React.ElementType; color: string; metric: LeadReportMetricKey }[]).map((stat) => (
          <Card
            key={stat.metric}
            className="cursor-pointer hover:bg-muted/30 transition-colors"
            onClick={() => openLeadList(stat.metric)}
          >
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <p className="text-xs text-muted-foreground">{stat.label}</p>
                <stat.icon className={`w-4 h-4 ${stat.color}`} />
              </div>
              <p className="text-2xl font-bold mt-2">{stat.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Telecallers</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="max-h-[560px] overflow-y-auto space-y-2">
            {loading ? (
              <p className="text-sm text-muted-foreground">Loading...</p>
            ) : telecallerStats.length === 0 ? (
              <div className="py-12 text-center border-2 border-dashed rounded-lg bg-slate-50/50">
                <p className="text-sm font-medium text-muted-foreground">No telecallers found.</p>
              </div>
            ) : (
              telecallerStats.map((telecaller) => (
                <button
                  key={telecaller.id}
                  type="button"
                  onClick={() => {
                    const qs = new URLSearchParams();
                    qs.set("from", "telecaller-wise");
                    qs.set("dateFilter", dateFilter);
                    if (customDateFrom) qs.set("createdFrom", customDateFrom);
                    if (customDateTo) qs.set("createdTo", customDateTo);
                    setLocation(`/leads/telecaller/${telecaller.id}?${qs.toString()}`);
                  }}
                  className="w-full text-left rounded-lg border px-3 py-2.5 transition-all hover:bg-primary/5"
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-semibold text-sm truncate">{telecaller.fullName}</p>
                    <Badge variant="secondary" className="text-[10px]">
                      Junk {telecaller.junk}
                    </Badge>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Assigned:{" "}
                    <span className="font-medium text-foreground">{telecaller.total}</span> | Contacted:{" "}
                    <span className="font-medium text-foreground">{telecaller.contacted}</span> |
                    Transferred:{" "}
                    <span className="font-medium text-foreground">{telecaller.transferred}</span> |
                    Follow Up:{" "}
                    <span className="font-medium text-foreground">{telecaller.followUp}</span>
                  </p>
                </button>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      <Dialog open={showDatePicker} onOpenChange={setShowDatePicker}>
        <DialogContent className="p-0 max-w-[800px] overflow-hidden rounded-xl border-0">
          <DialogTitle className="sr-only">Select Date Range</DialogTitle>
          <DateRangePicker
            onApply={(f, s, e) => {
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
    </div>
  );
}
