import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { format } from "date-fns";
import {
  Users,
  Phone,
  UserCheck,
  CalendarClock,
  ArrowRightLeft,

  PhoneOff,
} from "lucide-react";
import { useLocation, useSearch } from "wouter";
import { Toaster } from "sonner";

import { Breadcrumbs } from "@/layout/Breadcrumbs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

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
import { type LeadDateFilterType } from "@/lib/lead-date-range";
import { istYmdInclusiveRangeIso } from "@/lib/ist-date-range";

type DateFilterType = LeadDateFilterType;
type UserLite = { id: number; fullName: string };

type StatRow = UserLite &
  Pick<
    TelecallerLeadSummaryRow,
    | "total"
    | "contacted"
    | "notContacted"
    | "transferred"
    | "converted"
    | "dropped"
    | "followUp"
    | "junk"
  >;

const emptyAgg = {
  total: 0,
  contacted: 0,
  notContacted: 0,
  transferred: 0,
  converted: 0,
  dropped: 0,
  followUp: 0,
  junk: 0,
};

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
    if (dateFilter === "custom" && customDateFrom && customDateTo) {
      return istYmdInclusiveRangeIso(customDateFrom, customDateTo);
    }
    if (dateFilter === "all") return {};
    return { dateFilter };
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
        dropped: s?.dropped ?? 0,
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
        dropped: acc.dropped + t.dropped,
        followUp: acc.followUp + t.followUp,
        junkCount: acc.junkCount + t.junk,
      }),
      {
        total: 0, contacted: 0, notContacted: 0, transferred: 0,
        converted: 0, dropped: 0, followUp: 0, junkCount: 0,
      }
    );
  }, [telecallerStats]);

  const customLabel =
    dateFilter === "custom" && customDateFrom && customDateTo
      ? `${format(new Date(customDateFrom), "d MMM ''yy")} – ${format(new Date(customDateTo), "d MMM ''yy")}`
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
      <Breadcrumbs items={[{ label: "Leads", href: "/leads" }, { label: "Telecaller Assignment Report" }]} />

      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h1 className="text-2xl font-bold">Leads Assignment Wise Report — Telecaller</h1>

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

      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
        {([
          { label: "Assigned",      value: displayTotals.total,        icon: Users,         color: "text-primary",     bg: "bg-primary/5",   metric: "assigned"          },
          { label: "Not Contacted", value: displayTotals.notContacted,  icon: PhoneOff,      color: "text-slate-500",   bg: "bg-slate-50",    metric: "not_contacted"     },
          { label: "Contacted",     value: displayTotals.contacted,     icon: Phone,         color: "text-sky-600",     bg: "bg-sky-50",      metric: "contacted"         },
          { label: "Transferred",   value: displayTotals.transferred,   icon: ArrowRightLeft,color: "text-amber-600",   bg: "bg-amber-50",    metric: "transferred"       },
          { label: "Follow Up",     value: displayTotals.followUp,      icon: CalendarClock, color: "text-violet-600",  bg: "bg-violet-50",   metric: "pending_follow_up" },
          { label: "Junk",          value: displayTotals.junkCount,     icon: UserCheck,     color: "text-rose-600",    bg: "bg-rose-50",     metric: "junk"              },
        ] as { label: string; value: number; icon: React.ElementType; color: string; bg: string; metric: LeadReportMetricKey }[]).map((stat) => (
          <Card
            key={stat.metric}
            className={`cursor-pointer border shadow-sm hover:shadow-md transition-all ${stat.bg}`}
            onClick={() => openLeadList(stat.metric)}
          >
            <CardContent className="p-4 flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{stat.label}</p>
                <stat.icon className={`w-4 h-4 ${stat.color}`} />
              </div>
              <p className={`text-3xl font-extrabold tabular-nums ${stat.color}`}>{stat.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Telecallers</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {/* Column headers */}
          <div className="grid grid-cols-[1.8fr_repeat(6,_1fr)] px-5 py-2 border-b bg-muted/40 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            <span>Telecaller</span>
            <span className="text-center">Assigned</span>
            <span className="text-center">Not Contacted</span>
            <span className="text-center text-sky-600">Contacted</span>
            <span className="text-center text-amber-600">Transferred</span>
            <span className="text-center text-violet-600">Follow Up</span>
            <span className="text-center text-rose-500">Junk</span>
          </div>
          <div className="max-h-[560px] overflow-y-auto divide-y">
            {loading ? (
              <p className="text-sm text-muted-foreground px-5 py-6">Loading...</p>
            ) : telecallerStats.length === 0 ? (
              <div className="py-12 text-center">
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
                  className="w-full text-left grid grid-cols-[1.8fr_repeat(6,_1fr)] px-5 py-3.5 transition-colors hover:bg-muted/40 items-center"
                >
                  <p className="font-semibold text-sm truncate">{telecaller.fullName}</p>
                  <p className="text-center text-sm font-bold text-foreground tabular-nums">{telecaller.total}</p>
                  <p className="text-center text-sm font-bold text-slate-500 tabular-nums">{telecaller.notContacted}</p>
                  <p className="text-center text-sm font-bold text-sky-600 tabular-nums">{telecaller.contacted}</p>
                  <p className="text-center text-sm font-bold text-amber-600 tabular-nums">{telecaller.transferred}</p>
                  <p className="text-center text-sm font-bold text-violet-600 tabular-nums">{telecaller.followUp}</p>
                  <p className="text-center text-sm font-bold text-rose-500 tabular-nums">{telecaller.junk}</p>
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
