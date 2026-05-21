import {
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
import { useLocation } from "wouter";
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
    | "followUpDone"
    | "junk"
  >;

const emptyAgg = {
  total: 0,
  contacted: 0,
  notContacted: 0,
  transferred: 0,
  converted: 0,
  followUp: 0,
  followUpDone: 0,
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
  const [loading, setLoading] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);

  const [dateFilter, setDateFilter] = useState<DateFilterType>("today");
  const [customDateFrom, setCustomDateFrom] = useState<string | undefined>();
  const [customDateTo, setCustomDateTo] = useState<string | undefined>();

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
        followUpDone: s?.followUpDone ?? 0,
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
        followUpPending: acc.followUpPending + t.followUp,
        followUpDone: acc.followUpDone + t.followUpDone,
        junkCount: acc.junkCount + t.junk,
      }),
      {
        total: 0, contacted: 0, notContacted: 0, transferred: 0,
        converted: 0, followUp: 0, followUpPending: 0, followUpDone: 0, junkCount: 0,
      }
    );
  }, [telecallerStats]);

  const customLabel =
    dateFilter === "custom" && customDateFrom && customDateTo
      ? `${format(new Date(customDateFrom), "d MMM")} - ${format(new Date(customDateTo), "d MMM yyyy")}`
      : null;

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
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">Total Leads</p>
              <Users className="w-4 h-4 text-primary" />
            </div>
            <p className="text-2xl font-bold mt-2">{displayTotals.total}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">Contacted</p>
              <Phone className="w-4 h-4 text-blue-600" />
            </div>
            <p className="text-2xl font-bold mt-2">{displayTotals.contacted}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">Not Contacted</p>
              <PhoneOff className="w-4 h-4 text-slate-600" />
            </div>
            <p className="text-2xl font-bold mt-2">{displayTotals.notContacted}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">Transferred</p>
              <ArrowRightLeft className="w-4 h-4 text-amber-600" />
            </div>
            <p className="text-2xl font-bold mt-2">{displayTotals.transferred}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">Converted</p>
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            </div>
            <p className="text-2xl font-bold mt-2">{displayTotals.converted}</p>
          </CardContent>
        </Card>
        <Card className="border-primary/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">Follow Up</p>
              <CalendarClock className="w-4 h-4 text-primary" />
            </div>
            <p className="text-2xl font-bold mt-2">{displayTotals.followUp}</p>
            <p className="text-[10px] text-muted-foreground mt-1">
              Pending: {displayTotals.followUpPending} | Done: {displayTotals.followUpDone}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">Junk Marked</p>
              <UserCheck className="w-4 h-4 text-rose-600" />
            </div>
            <p className="text-2xl font-bold mt-2">{displayTotals.junkCount}</p>
          </CardContent>
        </Card>
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
                  onClick={() => setLocation(`/leads/telecaller/${telecaller.id}`)}
                  className="w-full text-left rounded-lg border px-3 py-2.5 transition-all hover:bg-primary/5"
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-semibold text-sm truncate">{telecaller.fullName}</p>
                    <Badge variant="secondary" className="text-[10px]">
                      Junk {telecaller.junk}
                    </Badge>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Total:{" "}
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
