import { useCallback, useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import * as XLSX from "xlsx";
import { Copy, Check, Download, RefreshCw, FileSpreadsheet } from "lucide-react";

import { PageWrapper } from "@/layout/PageWrapper";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import DateRangePicker from "@/components/payments/DateRangePicker";
import { fetchAllLeads, type LeadEntity, type LeadListParams } from "@/api/leads.api";
import { isTransferredInPeriod } from "@/lib/lead-report-period";
import { getLeadDateBounds, leadDateRangeParams } from "@/lib/lead-date-range";
import api from "@/lib/api";
import { cn } from "@/lib/utils";

type DateFilterType = "today" | "weekly" | "monthly" | "custom";
type UserLite = { id: number; fullName: string };
type LeadTypeLite = { id: number; leadType: string; displayAlias?: string | null };

const DIVIDER = "━━━━━━━━━━━━━━━━━━━";

export default function DailyLeadReport() {
  const [allLeads, setAllLeads] = useState<LeadEntity[]>([]);
  const [telecallers, setTelecallers] = useState<UserLite[]>([]);
  const [leadTypes, setLeadTypes] = useState<LeadTypeLite[]>([]);
  const [loading, setLoading] = useState(false);
  const [dateFilter, setDateFilter] = useState<DateFilterType>("today");
  const [customFrom, setCustomFrom] = useState<string | undefined>();
  const [customTo, setCustomTo] = useState<string | undefined>();
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [generated, setGenerated] = useState(false);
  const [copied, setCopied] = useState(false);

  const bounds = useMemo(
    () => getLeadDateBounds(dateFilter, customFrom, customTo) ?? getLeadDateBounds("today")!,
    [dateFilter, customFrom, customTo]
  );

  const loadData = useCallback(async () => {
    setLoading(true);
    setGenerated(false);
    try {
      const period = leadDateRangeParams(dateFilter, customFrom, customTo);
      // Derive ISO strings from afterDate/beforeDate (or fall back to bounds computed from "today")
      const afterDate  = period.afterDate  ?? new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(bounds.from);
      const beforeDate = period.beforeDate ?? new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(bounds.to);
      const isoFrom = new Date(`${afterDate}T00:00:00+05:30`).toISOString();
      const isoTo   = new Date(`${beforeDate}T23:59:59.999+05:30`).toISOString();
      const [tcRes, ltRes, createdLeads, transferredLeads] = await Promise.all([
        api.get("/api/users/telecallers"),
        api.get("/api/lead-types"),
        fetchAllLeads({ isJunk: false, ...period, dateFilter: period.dateFilter as LeadListParams["dateFilter"] }),
        fetchAllLeads({
          isJunk: false,
          transferredFrom: isoFrom,
          transferredTo: isoTo,
        }),
      ]);
      setTelecallers(tcRes?.data?.data || tcRes?.data || []);
      setLeadTypes(ltRes?.data?.data || ltRes?.data || []);
      const merged = new Map<number, LeadEntity>();
      for (const lead of [...createdLeads, ...transferredLeads]) merged.set(lead.id, lead);
      setAllLeads(Array.from(merged.values()));
    } finally {
      setLoading(false);
      setGenerated(true);
    }
  }, [bounds, dateFilter, customFrom, customTo]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const resolveAlias = useCallback(
    (slug: string) => {
      const lt = leadTypes.find((x) => x.leadType === slug);
      return lt?.displayAlias?.trim() || slug.replace(/_/g, " ");
    },
    [leadTypes]
  );

  const tcMap = useMemo(
    () => new Map(telecallers.map((t) => [t.id, t.fullName])),
    [telecallers]
  );

  // Lead coverage: per lead type, total assigned + how many were contacted (progressStatus !== "not_contacted")
  const leadsCreatedInPeriod = useMemo(
    () =>
      allLeads.filter((l) => {
        const d = new Date(l.createdAt);
        return d >= bounds.from && d <= bounds.to;
      }),
    [allLeads, bounds]
  );

  const leadCoverage = useMemo(() => {
    const map = new Map<string, { total: number; contacted: number }>();
    for (const lead of leadsCreatedInPeriod) {
      const lt = lead.leadType || "unknown";
      const existing = map.get(lt) ?? { total: 0, contacted: 0 };
      existing.total++;
      if (lead.progressStatus && lead.progressStatus !== "not_contacted") existing.contacted++;
      map.set(lt, existing);
    }
    return Array.from(map.entries())
      .map(([slug, v]) => ({ slug, alias: resolveAlias(slug), ...v }))
      .sort((a, b) => b.total - a.total);
  }, [leadsCreatedInPeriod, resolveAlias]);

  // Caller-wise TRF: transfers in period by transferred_at
  const callerTrf = useMemo(() => {
    const map = new Map<number, Map<string, number>>();
    const periodBounds = { from: bounds.from, to: bounds.to };
    for (const lead of allLeads) {
      if (!isTransferredInPeriod(lead, periodBounds)) continue;
      const tcId = lead.currentTelecallerId;
      if (!tcId) continue;
      if (!map.has(tcId)) map.set(tcId, new Map());
      const ltMap = map.get(tcId)!;
      const lt = lead.leadType || "unknown";
      ltMap.set(lt, (ltMap.get(lt) ?? 0) + 1);
    }
    return Array.from(map.entries())
      .map(([tcId, ltMap]) => ({
        tcId,
        name: tcMap.get(tcId) || `Telecaller #${tcId}`,
        byType: Array.from(ltMap.entries())
          .map(([slug, count]) => ({ slug, alias: resolveAlias(slug), count }))
          .sort((a, b) => b.count - a.count),
        total: Array.from(ltMap.values()).reduce((s, n) => s + n, 0),
      }))
      .filter((t) => t.total > 0)
      .sort((a, b) => b.total - a.total);
  }, [allLeads, tcMap, resolveAlias]);

  // Overall TRF summary: total transferred per lead type
  const overallTrf = useMemo(() => {
    const map = new Map<string, number>();
    for (const t of callerTrf) {
      for (const { slug, count } of t.byType) {
        map.set(slug, (map.get(slug) ?? 0) + count);
      }
    }
    return Array.from(map.entries())
      .map(([slug, count]) => ({ slug, alias: resolveAlias(slug), count }))
      .sort((a, b) => b.count - a.count);
  }, [callerTrf, resolveAlias]);

  const totalTrf = useMemo(
    () => callerTrf.reduce((s, t) => s + t.total, 0),
    [callerTrf]
  );

  const totalLeads = leadsCreatedInPeriod.length;
  const totalContacted = useMemo(
    () =>
      leadsCreatedInPeriod.filter(
        (l) => l.progressStatus && l.progressStatus !== "not_contacted"
      ).length,
    [leadsCreatedInPeriod]
  );

  const dateLabel = useMemo(() => {
    if (dateFilter === "custom" && customFrom && customTo)
      return `${format(new Date(customFrom), "dd/MM/yyyy")} - ${format(new Date(customTo), "dd/MM/yyyy")}`;
    return format(bounds.from, "dd/MM/yyyy");
  }, [dateFilter, customFrom, customTo, bounds]);

  const whatsappMessage = useMemo(() => {
    if (!generated) return "";
    const lines: string[] = [];
    lines.push("📊 DAILY LEAD PERFORMANCE REPORT 📊");
    lines.push(`Date: ${dateLabel}`);
    lines.push(DIVIDER);
    lines.push("🔹 Lead Coverage");
    lines.push("");
    for (const { alias, contacted, total } of leadCoverage) {
      lines.push(`▪️${alias} - ${contacted}/${total}`);
    }
    lines.push("");
    lines.push(`Total Leads Assigned: ${totalLeads}`);
    lines.push(`Leads Attempted: ${totalContacted}/${totalLeads}`);
    lines.push(DIVIDER);
    lines.push("📞 Caller-Wise TRF");
    lines.push("");
    for (const caller of callerTrf) {
      lines.push(`🔸 ${caller.name}`);
      for (const { alias, count } of caller.byType) {
        lines.push(`▪️${alias}: ${count}`);
      }
      lines.push("");
    }
    lines.push(DIVIDER);
    lines.push("📈 Overall TRF Summary");
    lines.push("");
    for (const { alias, count } of overallTrf) {
      lines.push(`${alias}: ${count}`);
    }
    lines.push("");
    lines.push(`*➡️ Total TRF Calls: ${totalTrf}*`);
    return lines.join("\n");
  }, [generated, dateLabel, leadCoverage, totalLeads, totalContacted, callerTrf, overallTrf, totalTrf]);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(whatsappMessage);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleExport = () => {
    const wb = XLSX.utils.book_new();

    // Sheet 1: Lead Coverage
    const coverageData = [
      ["Lead Type", "Total Assigned", "Contacted/Attempted", "Not Contacted"],
      ...leadCoverage.map(({ alias, total, contacted }) => [
        alias, total, contacted, total - contacted,
      ]),
      ["TOTAL", totalLeads, totalContacted, totalLeads - totalContacted],
    ];
    const ws1 = XLSX.utils.aoa_to_sheet(coverageData);
    XLSX.utils.book_append_sheet(wb, ws1, "Lead Coverage");

    // Sheet 2: Caller-wise TRF
    const allLeadTypeAliases = Array.from(new Set(callerTrf.flatMap((t) => t.byType.map((b) => b.alias))));
    const trfHeaders = ["Telecaller", ...allLeadTypeAliases, "Total TRF"];
    const trfRows = callerTrf.map((t) => {
      const row: (string | number)[] = [t.name];
      for (const alias of allLeadTypeAliases) {
        const match = t.byType.find((b) => b.alias === alias);
        row.push(match?.count ?? 0);
      }
      row.push(t.total);
      return row;
    });
    // Totals row
    const totalsRow: (string | number)[] = ["TOTAL"];
    for (const alias of allLeadTypeAliases) {
      totalsRow.push(overallTrf.find((o) => o.alias === alias)?.count ?? 0);
    }
    totalsRow.push(totalTrf);
    const ws2 = XLSX.utils.aoa_to_sheet([trfHeaders, ...trfRows, totalsRow]);
    XLSX.utils.book_append_sheet(wb, ws2, "Caller-wise TRF");

    // Sheet 3: All Leads Detail
    const detailHeaders = [
      "Lead Name", "Phone", "Lead Type", "Lead Source",
      "Progress Status", "Assignment Status", "Telecaller", "Created At",
    ];
    const detailRows = allLeads.map((l) => [
      l.fullName,
      l.phone,
      resolveAlias(l.leadType || ""),
      l.leadSource || "",
      l.progressStatus || "",
      l.assignmentStatus || "",
      tcMap.get(l.currentTelecallerId ?? 0) || "",
      l.createdAt ? format(new Date(l.createdAt), "dd/MM/yyyy HH:mm") : "",
    ]);
    const ws3 = XLSX.utils.aoa_to_sheet([detailHeaders, ...detailRows]);
    XLSX.utils.book_append_sheet(wb, ws3, "Lead Detail");

    const filename = `Daily_Lead_Report_${format(bounds.from, "dd-MM-yyyy")}.xlsx`;
    XLSX.writeFile(wb, filename);
  };

  const customLabel =
    dateFilter === "custom" && customFrom && customTo
      ? `${format(new Date(customFrom), "d MMM")} – ${format(new Date(customTo), "d MMM yyyy")}`
      : null;

  return (
    <PageWrapper title="Daily Lead Report">
      <div className="space-y-5">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold">Daily Lead Report</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Generate WhatsApp performance message and export to Excel
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {(["today", "weekly", "monthly"] as DateFilterType[]).map((f) => (
              <Button
                key={f}
                variant={dateFilter === f ? "default" : "outline"}
                size="sm"
                className="capitalize"
                onClick={() => { setDateFilter(f); setCustomFrom(undefined); setCustomTo(undefined); }}
              >
                {f === "today" ? "Today" : f === "weekly" ? "This Week" : "This Month"}
              </Button>
            ))}
            <Button
              variant={dateFilter === "custom" ? "default" : "outline"}
              size="sm"
              onClick={() => setShowDatePicker(true)}
            >
              {customLabel ?? "Custom"}
            </Button>
            <Button variant="outline" size="sm" onClick={loadData} disabled={loading}>
              <RefreshCw className={cn("w-4 h-4 mr-1.5", loading && "animate-spin")} />
              Refresh
            </Button>
          </div>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Card className="border-none bg-blue-50/60 dark:bg-blue-950/20">
            <CardContent className="p-4">
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Total Leads</p>
              <p className="text-3xl font-extrabold text-blue-700 dark:text-blue-400 tabular-nums">{totalLeads}</p>
            </CardContent>
          </Card>
          <Card className="border-none bg-green-50/60 dark:bg-green-950/20">
            <CardContent className="p-4">
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Contacted</p>
              <p className="text-3xl font-extrabold text-green-700 dark:text-green-400 tabular-nums">{totalContacted}</p>
            </CardContent>
          </Card>
          <Card className="border-none bg-amber-50/60 dark:bg-amber-950/20">
            <CardContent className="p-4">
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Total TRF</p>
              <p className="text-3xl font-extrabold text-amber-700 dark:text-amber-400 tabular-nums">{totalTrf}</p>
            </CardContent>
          </Card>
          <Card className="border-none bg-purple-50/60 dark:bg-purple-950/20">
            <CardContent className="p-4">
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Telecallers Active</p>
              <p className="text-3xl font-extrabold text-purple-700 dark:text-purple-400 tabular-nums">{callerTrf.length}</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* Left: Message Preview */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-3 gap-2">
              <CardTitle className="text-base">WhatsApp Message</CardTitle>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleCopy}
                  disabled={!whatsappMessage || loading}
                >
                  {copied ? (
                    <><Check className="w-4 h-4 mr-1.5 text-green-600" />Copied!</>
                  ) : (
                    <><Copy className="w-4 h-4 mr-1.5" />Copy</>
                  )}
                </Button>
                <Button
                  size="sm"
                  variant="default"
                  onClick={handleExport}
                  disabled={!generated || loading}
                >
                  <FileSpreadsheet className="w-4 h-4 mr-1.5" />
                  Export Excel
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center py-16 text-muted-foreground text-sm gap-2">
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Generating report…
                </div>
              ) : (
                <pre className="whitespace-pre-wrap font-mono text-[13px] leading-relaxed bg-muted/40 rounded-lg p-4 max-h-[520px] overflow-y-auto border select-text">
                  {whatsappMessage || "No data available for this period."}
                </pre>
              )}
            </CardContent>
          </Card>

          {/* Right: Tables */}
          <div className="space-y-4">
            {/* Lead Coverage Table */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Lead Coverage by Type</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-muted/30">
                        <th className="text-left px-4 py-2 font-semibold">Lead Type</th>
                        <th className="text-right px-4 py-2 font-semibold">Total</th>
                        <th className="text-right px-4 py-2 font-semibold">Contacted</th>
                        <th className="text-right px-4 py-2 font-semibold">Not Contacted</th>
                      </tr>
                    </thead>
                    <tbody>
                      {leadCoverage.length === 0 ? (
                        <tr><td colSpan={4} className="text-center py-6 text-muted-foreground text-xs">No data</td></tr>
                      ) : (
                        leadCoverage.map(({ slug, alias, total, contacted }) => (
                          <tr key={slug} className="border-b last:border-0 hover:bg-muted/20">
                            <td className="px-4 py-2 font-medium">{alias}</td>
                            <td className="px-4 py-2 text-right tabular-nums">{total}</td>
                            <td className="px-4 py-2 text-right tabular-nums text-green-600">{contacted}</td>
                            <td className="px-4 py-2 text-right tabular-nums text-rose-500">{total - contacted}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                    {leadCoverage.length > 0 && (
                      <tfoot>
                        <tr className="bg-muted/40 font-bold border-t-2">
                          <td className="px-4 py-2">Total</td>
                          <td className="px-4 py-2 text-right tabular-nums">{totalLeads}</td>
                          <td className="px-4 py-2 text-right tabular-nums text-green-600">{totalContacted}</td>
                          <td className="px-4 py-2 text-right tabular-nums text-rose-500">{totalLeads - totalContacted}</td>
                        </tr>
                      </tfoot>
                    )}
                  </table>
                </div>
              </CardContent>
            </Card>

            {/* Caller-wise TRF Table */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Caller-wise TRF Summary</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-muted/30">
                        <th className="text-left px-4 py-2 font-semibold">Telecaller</th>
                        <th className="text-left px-4 py-2 font-semibold">Lead Types (TRF)</th>
                        <th className="text-right px-4 py-2 font-semibold">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {callerTrf.length === 0 ? (
                        <tr><td colSpan={3} className="text-center py-6 text-muted-foreground text-xs">No TRF data</td></tr>
                      ) : (
                        callerTrf.map((t) => (
                          <tr key={t.tcId} className="border-b last:border-0 hover:bg-muted/20">
                            <td className="px-4 py-2 font-medium whitespace-nowrap">{t.name}</td>
                            <td className="px-4 py-2">
                              <div className="flex flex-wrap gap-1.5">
                                {t.byType.map(({ alias, count }) => (
                                  <span key={alias} className="inline-flex items-center gap-1 bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300 text-[11px] px-2 py-0.5 rounded-full font-medium">
                                    {alias}: {count}
                                  </span>
                                ))}
                              </div>
                            </td>
                            <td className="px-4 py-2 text-right tabular-nums font-bold">{t.total}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                    {callerTrf.length > 0 && (
                      <tfoot>
                        <tr className="bg-muted/40 font-bold border-t-2">
                          <td className="px-4 py-2">Total</td>
                          <td className="px-4 py-2">
                            <div className="flex flex-wrap gap-1.5">
                              {overallTrf.map(({ alias, count }) => (
                                <span key={alias} className="text-[11px] text-muted-foreground">
                                  {alias}: {count}
                                </span>
                              ))}
                            </div>
                          </td>
                          <td className="px-4 py-2 text-right tabular-nums">{totalTrf}</td>
                        </tr>
                      </tfoot>
                    )}
                  </table>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      <Dialog open={showDatePicker} onOpenChange={setShowDatePicker}>
        <DialogContent className="p-0 max-w-[800px] overflow-hidden rounded-xl border-0">
          <DialogTitle className="sr-only">Select Date Range</DialogTitle>
          <DateRangePicker
            onApply={(_, s, e) => {
              if (s && e) { setCustomFrom(s); setCustomTo(e); setDateFilter("custom"); }
              setShowDatePicker(false);
            }}
            onCancel={() => setShowDatePicker(false)}
          />
        </DialogContent>
      </Dialog>
    </PageWrapper>
  );
}
