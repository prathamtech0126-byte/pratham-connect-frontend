import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Redirect, useLocation } from "wouter";
import { playNotificationSound } from "@/notification/lib/notification-sound";
import confetti from "canvas-confetti";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useAuth } from "@/context/auth-context";
import { getTelecallerDashboardStats, type LeadEntity } from "@/api/leads.api";
import { useLeadSocketRefresh, type LeadAssignmentNotify } from "@/hooks/use-lead-socket";
import api from "@/lib/api";
import { format } from "date-fns";
import { PhoneCall, Target, Trophy, ChevronDown, ChevronUp, ArrowRightLeft, CheckCircle2, Bell, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  istTodayRangeIso,
  istWeekRangeIso,
  istMonthRangeIso,
} from "@/lib/ist-date-range";
import { getLeadSourceLabel, type LeadSourceOption } from "@/lib/lead-source-display";

type LeaderboardRow = {
  telecallerId: number;
  fullName: string;
  transferTargetAssigned: number;
  transferTargetAchieved: number;
  conversionTargetAssigned: number;
  conversionTargetAchieved: number;
};

type SaleTypeRow = {
  id: number;
  saleType: string;
  categoryName: string;
};

type SaleTypeCategoryRow = {
  id: number;
  name: string;
};

const RANK_COLORS = ["text-yellow-500", "text-slate-400", "text-amber-600"];
const RANK_BG = ["bg-yellow-50 border-yellow-200", "bg-slate-50 border-slate-200", "bg-amber-50 border-amber-200"];

export default function TelecalerDashbord() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [timeFilter, setTimeFilter] = useState("monthly");
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({});
  const [assignmentAlerts, setAssignmentAlerts] = useState<LeadEntity[]>([]);
  const [achievementMoment, setAchievementMoment] = useState<{
    kind: "transfer" | "conversion";
    title: string;
    subtitle: string;
  } | null>(null);
  const transferTargetCelebrated = useRef(false);
  const conversionTargetCelebrated = useRef(false);
  const achievementTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const currentMonthYear = format(new Date(), "yyyy-MM");
  const parsedUserId = Number(user?.id);
  const hasValidTelecallerId =
    Number.isInteger(parsedUserId) &&
    parsedUserId > 0 &&
    parsedUserId <= 2147483647;

  const { data: userProfile } = useQuery({
    queryKey: ["user-profile"],
    queryFn: async () => {
      const res = await api.get("/api/users/profile");
      return res.data?.data ?? res.data;
    },
    enabled: !!user,
    staleTime: 1000 * 60 * 5,
  });

  const { data: targetData } = useQuery({
    queryKey: ["current-telecaller-target", user?.id, currentMonthYear],
    queryFn: async () => {
      const res = await api.get(`/api/telecaller-targets/${parsedUserId}/${currentMonthYear}`);
      return res.data;
    },
    enabled: !!user && hasValidTelecallerId,
  });

  const periodRangeParams = useMemo((): { createdFrom?: string; createdTo?: string } => {
    const now = new Date();
    if (timeFilter === "today") return istTodayRangeIso(now);
    if (timeFilter === "weekly") return istWeekRangeIso(now);
    if (timeFilter === "monthly") return istMonthRangeIso(now);
    return {};
  }, [timeFilter]);

  const followupRangeParams = useMemo((): { createdFrom?: string; createdTo?: string } => {
    const now = new Date();
    if (timeFilter === "today") return istTodayRangeIso(now);
    if (timeFilter === "weekly") return istWeekRangeIso(now);
    if (timeFilter === "monthly") return istMonthRangeIso(now);
    return {};
  }, [timeFilter]);

  /** Counts only — no full lead list (fast, accurate). */
  const { data: dashStats, isLoading } = useQuery({
    queryKey: [
      "telecaller-dashboard-stats",
      user?.id,
      timeFilter,
      periodRangeParams,
      followupRangeParams,
    ],
    queryFn: () =>
      getTelecallerDashboardStats({
        createdFrom: periodRangeParams.createdFrom,
        createdTo: periodRangeParams.createdTo,
        followupFrom: followupRangeParams.createdFrom,
        followupTo: followupRangeParams.createdTo,
      }),
    enabled: !!user && user.role === "telecaller",
    staleTime: 0,
  });

  const { data: leaderboardData = [] } = useQuery<LeaderboardRow[]>({
    queryKey: ["telecaller-targets-leaderboard", currentMonthYear],
    queryFn: async () => {
      const res = await api.get(`/api/telecaller-targets/leaderboard/${currentMonthYear}`);
      return Array.isArray(res.data?.data) ? res.data.data : [];
    },
    enabled: !!user && user.role === "telecaller",
    staleTime: 1000 * 60,
  });

  const { data: leadSourceCatalog = [] } = useQuery<LeadSourceOption[]>({
    queryKey: ["lead-types-catalog"],
    queryFn: async () => {
      const res = await api.get("/api/lead-types");
      return (res.data.data || []) as LeadSourceOption[];
    },
    enabled: !!user && user.role === "telecaller",
    staleTime: 1000 * 60 * 5,
  });

  const { data: saleTypes = [] } = useQuery({
    queryKey: ["sale-types"],
    queryFn: async () => {
      const res = await api.get("/api/sale-types");
      const rows = res.data?.data ?? res.data ?? [];
      if (!Array.isArray(rows)) return [] as SaleTypeRow[];
      return rows
        .map((r: any) => ({
          id: Number(r.id ?? r.saleTypeId ?? 0),
          saleType: String(r.saleType ?? r.sale_type ?? "").trim(),
          categoryName: String(r.categoryName ?? "").trim(),
        }))
        .filter((r: SaleTypeRow) => r.id > 0 && !!r.saleType);
    },
    enabled: !!user && user.role === "telecaller",
    staleTime: 1000 * 60 * 5,
  });

  const { data: saleTypeCategories = [] } = useQuery({
    queryKey: ["sale-type-categories"],
    queryFn: async () => {
      const res = await api.get("/api/sale-type-categories");
      const rows = res.data?.data ?? res.data ?? [];
      if (!Array.isArray(rows)) return [] as SaleTypeCategoryRow[];
      return rows
        .map((r: any) => ({
          id: Number(r.id ?? r.categoryId ?? 0),
          name: String(r.name ?? "").trim(),
        }))
        .filter((r: SaleTypeCategoryRow) => r.id > 0 && !!r.name);
    },
    enabled: !!user && user.role === "telecaller",
    staleTime: 1000 * 60 * 5,
  });

  // Socket + Redis-backed API: refresh lead queries on any lead mutation event
  useLeadSocketRefresh({
    enabled: user?.role === "telecaller",
    queryKeys: user?.id
      ? [
          ["telecaller-dashboard-stats", String(user.id)],
          ["current-telecaller-target", String(user.id)],
          ["telecaller-targets-leaderboard"],
        ]
      : [],
    onLeadEvent: (event, payload) => {
      const uid = user?.id ? Number(user.id) : null;
      if (uid == null) return;
      let lead: LeadEntity | null = null;
      if (event === "lead:assigned:notify") {
        const n = payload as LeadAssignmentNotify;
        if (n.telecallerId === uid) lead = n.lead;
      } else if (payload && typeof payload === "object" && "id" in (payload as LeadEntity)) {
        const p = payload as LeadEntity;
        if (p.currentTelecallerId === uid) lead = p;
      }
      if (lead) {
        playNotificationSound();
        setAssignmentAlerts((prev) => {
          if (prev.some((l) => l.id === lead!.id)) return prev;
          return [lead!, ...prev].slice(0, 8);
        });
      }
    },
  });

  const transferAssigned = targetData?.transferTargetAssigned ?? 0;
  const transferAchieved = targetData?.transferTargetAchieved ?? 0;
  const transferRemaining = Math.max(0, transferAssigned - transferAchieved);
  const transferProgress = transferAssigned > 0 ? Math.min((transferAchieved / transferAssigned) * 100, 100) : 0;

  const conversionAssigned = targetData?.conversionTargetAssigned ?? 0;
  const conversionAchieved = targetData?.conversionTargetAchieved ?? 0;
  const conversionRemaining = Math.max(0, conversionAssigned - conversionAchieved);
  const conversionProgress = conversionAssigned > 0 ? Math.min((conversionAchieved / conversionAssigned) * 100, 100) : 0;

  const showAchievement = (kind: "transfer" | "conversion", title: string, subtitle: string) => {
    if (achievementTimerRef.current) clearTimeout(achievementTimerRef.current);
    setAchievementMoment({ kind, title, subtitle });
    confetti({
      particleCount: kind === "transfer" ? 120 : 100,
      spread: kind === "transfer" ? 70 : 60,
      origin: { y: kind === "transfer" ? 0.6 : 0.55 },
    });
    achievementTimerRef.current = setTimeout(() => {
      setAchievementMoment(null);
      achievementTimerRef.current = null;
    }, 10000);
  };

  useEffect(() => {
    return () => {
      if (achievementTimerRef.current) clearTimeout(achievementTimerRef.current);
    };
  }, []);

  useEffect(() => {
    if (!targetData || transferAssigned <= 0) return;
    if (transferAchieved >= transferAssigned && !transferTargetCelebrated.current) {
      transferTargetCelebrated.current = true;
      showAchievement(
        "transfer",
        "Transfer target achieved!",
        `You completed ${transferAchieved} of ${transferAssigned} transfers this month.`
      );
    }
  }, [transferAchieved, transferAssigned, targetData]);

  useEffect(() => {
    if (!targetData || conversionAssigned <= 0) return;
    if (conversionAchieved >= conversionAssigned && !conversionTargetCelebrated.current) {
      conversionTargetCelebrated.current = true;
      showAchievement(
        "conversion",
        "Conversion target achieved!",
        `You completed ${conversionAchieved} of ${conversionAssigned} conversions this month.`
      );
    }
  }, [conversionAchieved, conversionAssigned, targetData]);

  const normalizeLabel = (value: string) =>
    value.toLowerCase().replace(/visa/g, "").replace(/\s+/g, " ").trim();

  const categoryCounts = useMemo(() => {
    const breakdown = dashStats?.categoryBreakdown ?? [];
    const leadTypeCountMap = breakdown.reduce<Record<string, number>>((acc, row) => {
      const key = normalizeLabel(row.leadType);
      if (key) acc[key] = (acc[key] || 0) + row.count;
      return acc;
    }, {});
    const categoriesFromMaster =
      saleTypeCategories.length > 0
        ? saleTypeCategories.map((c) => c.name)
        : Array.from(new Set(saleTypes.map((s) => s.categoryName).filter(Boolean)));
    return categoriesFromMaster.map((categoryName) => {
      const typesForCategory = saleTypes.filter(
        (s) => normalizeLabel(s.categoryName) === normalizeLabel(categoryName)
      );
      const saleTypesWithCount = typesForCategory.map((s) => ({
        id: s.id,
        name: s.saleType,
        count: leadTypeCountMap[normalizeLabel(s.saleType)] || 0,
      }));
      const total = saleTypesWithCount.reduce((sum, st) => sum + st.count, 0);
      return {
        name: categoryName,
        total,
        saleTypes: saleTypesWithCount.sort((a, b) => b.count - a.count || a.name.localeCompare(b.name)),
      };
    });
  }, [dashStats, saleTypes, saleTypeCategories]);

  const sourceBreakdownRows = useMemo(() => {
    const bySource = new Map(
      (dashStats?.sourceBreakdown ?? []).map((row) => [row.leadSource, row])
    );
    const catalogRows = leadSourceCatalog.map((source) => {
      const row = bySource.get(source.leadType);
      return {
        leadSource: source.leadType,
        label: getLeadSourceLabel(source.leadType, leadSourceCatalog),
        assigned: row?.assigned ?? 0,
        transferred: row?.transferred ?? 0,
        converted: row?.converted ?? 0,
      };
    });
    const catalogKeys = new Set(leadSourceCatalog.map((source) => source.leadType));
    const extraRows = (dashStats?.sourceBreakdown ?? [])
      .filter((row) => !catalogKeys.has(row.leadSource))
      .map((row) => ({
        leadSource: row.leadSource,
        label: getLeadSourceLabel(row.leadSource, leadSourceCatalog),
        assigned: row.assigned,
        transferred: row.transferred,
        converted: row.converted,
      }));
    const priority = (source: string) => {
      const normalized = source.toLowerCase();
      if (normalized === "facebook") return 0;
      if (normalized === "instagram") return 1;
      return 2;
    };
    return [...catalogRows, ...extraRows].sort((a, b) => {
      const pa = priority(a.leadSource);
      const pb = priority(b.leadSource);
      if (pa !== pb) return pa - pb;
      return a.label.localeCompare(b.label);
    });
  }, [dashStats?.sourceBreakdown, leadSourceCatalog]);

  if (!user) return <Redirect to="/login" />;
  if (user.role !== "telecaller") return <Redirect to="/" />;

  const displayName = userProfile?.fullname || user?.name || "Telecaller";

  const goToLeadsFollowUpToday = () => {
    setLocation("/leads?followupToday=1");
  };

  const totalAssigned = dashStats?.assigned ?? 0;
  const uncontactedCount = dashStats?.uncontacted ?? 0;
  const contactedCount = dashStats?.contacted ?? 0;
  const transferredCount = dashStats?.transferred ?? 0;
  const convertedCount = dashStats?.converted ?? 0;
  const followUpsToday = dashStats?.followUpsToday ?? 0;
  const followUpsInPeriod = dashStats?.followUpsInPeriod ?? 0;

  const periodLabel =
    timeFilter === "today" ? "today" : timeFilter === "weekly" ? "this week" : "this month";

  const leaderboardRows = [...leaderboardData]
    .sort((a, b) => b.transferTargetAchieved - a.transferTargetAchieved || a.fullName.localeCompare(b.fullName));

  const totalTransferAssigned = leaderboardRows.reduce((s, r) => s + r.transferTargetAssigned, 0);
  const totalTransferAchieved = leaderboardRows.reduce((s, r) => s + r.transferTargetAchieved, 0);

  return (
    <div className="space-y-8 pb-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">
  Welcome back{" "}
  <span className="ml-2 font-semibold text-primary">{displayName}</span>
</h1>
          
        </div>
        <div className="flex bg-muted p-1 rounded-lg">
          {["Today", "Weekly", "Monthly"].map((tab) => (
            <button
              key={tab}
              onClick={() => setTimeFilter(tab.toLowerCase())}
              className={cn(
                "px-4 py-1.5 text-sm font-medium rounded-md transition-all",
                timeFilter === tab.toLowerCase()
                  ? "bg-background shadow-sm text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {achievementMoment && (
        <Card
          className={cn(
            "border-2 shadow-lg",
            achievementMoment.kind === "transfer"
              ? "border-primary bg-primary/10"
              : "border-emerald-500 bg-emerald-50 dark:bg-emerald-950/30"
          )}
        >
          <CardContent className="py-4 flex items-start gap-3">
            {achievementMoment.kind === "transfer" ? (
              <ArrowRightLeft className="h-8 w-8 text-primary shrink-0" />
            ) : (
              <CheckCircle2 className="h-8 w-8 text-emerald-600 shrink-0" />
            )}
            <div className="flex-1 min-w-0">
              <p className="font-bold text-lg text-foreground">{achievementMoment.title}</p>
              <p className="text-sm text-muted-foreground mt-0.5">{achievementMoment.subtitle}</p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 shrink-0"
              onClick={() => {
                if (achievementTimerRef.current) clearTimeout(achievementTimerRef.current);
                setAchievementMoment(null);
              }}
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          </CardContent>
        </Card>
      )}

      {assignmentAlerts.length > 0 && (
        <Card className="border-primary/40 bg-primary/5">
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Bell className="h-4 w-4 text-primary" />
              New lead assignments
            </CardTitle>
            <Button variant="ghost" size="sm" className="h-7" onClick={() => setAssignmentAlerts([])}>
              <X className="h-3.5 w-3.5" />
            </Button>
          </CardHeader>
          <CardContent className="space-y-2">
            {assignmentAlerts.map((lead) => (
              <button
                key={lead.id}
                type="button"
                className="w-full text-left rounded-lg border border-border/60 bg-background px-3 py-2 text-sm hover:border-primary/50"
                onClick={() => setLocation("/leads")}
              >
                <span className="font-medium">{lead.fullName}</span>
                <span className="text-muted-foreground"> · {lead.phone}</span>
                <span className="block text-xs text-primary mt-0.5">View in Leads →</span>
              </button>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Top Row: Target + Stats + Source Breakdown */}
      <div className="grid gap-6 xl:grid-cols-4">

        {/* Target Card */}
        <Card className="border border-border shadow-sm overflow-hidden">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <Target className="w-4 h-4 text-primary" />
              Monthly Targets
            </CardTitle>
            <CardDescription>{format(new Date(), "MMMM yyyy")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            {!targetData ? (
              <p className="text-sm text-muted-foreground py-6 text-center border border-dashed rounded-xl">
                No targets assigned yet.
              </p>
            ) : (
              <>
                {/* Transfer Target */}
                <div className="rounded-xl bg-primary/5 border border-primary/10 p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-xs font-semibold text-slate-600">
                      <ArrowRightLeft className="w-3.5 h-3.5 text-primary" />
                      Transfer Target
                    </span>
                    <span className="text-xs font-bold text-primary">
                      {transferProgress.toFixed(0)}%
                    </span>
                  </div>
                  <div>
                    <span className="text-3xl font-bold text-foreground">{transferAchieved}</span>
                    <span className="text-sm text-muted-foreground ml-1">/ {transferAssigned} achieved</span>
                  </div>
                  <Progress value={transferProgress} className="h-2" />
                  <p className="text-xs text-muted-foreground">
                    Remaining <span className="font-semibold text-foreground">{transferRemaining}</span>
                  </p>
                </div>

                {/* Conversion Target */}
                <div className="rounded-xl bg-emerald-50 border border-emerald-100 p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-xs font-semibold text-slate-600">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      Conversion Target
                    </span>
                    <span className="text-xs font-bold text-emerald-600">
                      {conversionProgress.toFixed(0)}%
                    </span>
                  </div>
                  <div>
                    <span className="text-3xl font-bold text-foreground">{conversionAchieved}</span>
                    <span className="text-sm text-muted-foreground ml-1">/ {conversionAssigned} achieved</span>
                  </div>
                  <Progress value={conversionProgress} className="h-2 [&>div]:bg-emerald-500" />
                  <p className="text-xs text-muted-foreground">
                    Remaining <span className="font-semibold text-foreground">{conversionRemaining}</span>
                  </p>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Stats — 2×2 grid beside target; refetches when Today / Weekly / Monthly changes */}
        <div className="grid grid-cols-2 gap-4 xl:col-span-2">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground">Assigned</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{isLoading ? "…" : totalAssigned}</p>
              <p className="text-[11px] text-muted-foreground mt-1 capitalize">{periodLabel}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground">Uncontacted</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{isLoading ? "…" : uncontactedCount}</p>
              <p className="text-[11px] text-muted-foreground mt-1 capitalize">{periodLabel}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground">Contacted</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{isLoading ? "…" : contactedCount}</p>
              <p className="text-[11px] text-muted-foreground mt-1 capitalize">{periodLabel}</p>
            </CardContent>
          </Card>
          <Card
            className="border-primary/30 bg-primary/5 cursor-pointer hover:border-primary/60 transition-colors"
            role="button"
            tabIndex={0}
            onClick={goToLeadsFollowUpToday}
            onKeyDown={(e) => e.key === "Enter" && goToLeadsFollowUpToday()}
          >
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
                <PhoneCall className="w-4 h-4" /> Follow Up Today
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-primary">{followUpsToday}</p>
              <p className="text-[11px] text-muted-foreground mt-1">
                Total in period: <span className="font-semibold text-foreground">{followUpsInPeriod}</span>
                {" · "}
                <span className="text-primary">View leads →</span>
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
                <ArrowRightLeft className="w-4 h-4" /> Transferred
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-blue-600">{isLoading ? "…" : transferredCount}</p>
              <p className="text-[11px] text-muted-foreground mt-1 capitalize">{periodLabel}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground">Converted</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{isLoading ? "…" : convertedCount}</p>
              <p className="text-[11px] text-muted-foreground mt-1 capitalize">{periodLabel}</p>
            </CardContent>
          </Card>
        </div>

        <Card className="h-full shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle>Lead source breakdown</CardTitle>
            <CardDescription>
              Assigned / transfer ({periodLabel})
            </CardDescription>
          </CardHeader>
          <CardContent className="h-[calc(100%-5rem)]">
            <div className="max-h-[360px] space-y-2 overflow-y-auto pr-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {sourceBreakdownRows.length === 0 ? (
                <p className="text-sm text-muted-foreground">No lead sources configured.</p>
              ) : (
                <div className="rounded-lg border border-border/60 overflow-hidden">
                  <div className="grid grid-cols-[1fr_64px_64px] gap-2 bg-muted/40 px-3 py-2 text-[11px] font-semibold text-muted-foreground">
                    <span>Source</span>
                    <span className="text-right">Assigned</span>
                    <span className="text-right">Transfer</span>
                  </div>
                  {sourceBreakdownRows.map((row) => (
                    <div
                      key={row.leadSource}
                      className="grid grid-cols-[1fr_64px_64px] gap-2 border-t border-border/50 px-3 py-2 text-sm"
                    >
                      <span className="truncate font-medium" title={row.label}>
                        {row.label}
                      </span>
                      <span className="text-right font-semibold text-foreground">{row.assigned}</span>
                      <span className="text-right font-semibold text-blue-600">{row.transferred}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Bottom Row: Lead Categories + Leaderboard */}
      <div className="grid gap-6 lg:grid-cols-7">

        {/* Lead Category Overview */}
        <Card className="lg:col-span-4 shadow-sm">
          <CardHeader>
            <CardTitle>Lead Category Overview</CardTitle>
            <CardDescription>Transfers per category this period</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 sm:grid-cols-2">
              {categoryCounts.map((item) => (
                <div key={item.name} className="rounded-lg border border-border/60 p-3">
                  <button
                    type="button"
                    className="w-full flex items-center justify-between gap-3"
                    onClick={() => setExpandedCategories((prev) => ({ ...prev, [item.name]: !prev[item.name] }))}
                  >
                    <p className="text-sm font-medium text-foreground truncate pr-3 capitalize">{item.name}</p>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary">{item.total}</Badge>
                      {expandedCategories[item.name] ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </div>
                  </button>
                  {expandedCategories[item.name] && (
                    <div className="mt-3 space-y-2 border-t border-border/50 pt-3">
                      {item.saleTypes.length === 0
                        ? <p className="text-xs text-muted-foreground">No sale types.</p>
                        : item.saleTypes.map((st) => (
                          <div key={st.id} className="flex items-center justify-between text-xs">
                            <p className="text-muted-foreground truncate pr-2">{st.name}</p>
                            <span className="font-semibold text-foreground tabular-nums">{st.count}</span>
                          </div>
                        ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Leaderboard */}
        <Card className="lg:col-span-3 shadow-sm flex flex-col">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Trophy className="w-5 h-5 text-yellow-500" />
              Leaderboard
            </CardTitle>
            <CardDescription>Transfer targets this month</CardDescription>
          </CardHeader>
          <CardContent className="flex-1 p-0">
            <div className="max-h-[380px] overflow-y-auto px-4 pb-4 space-y-2">
              {leaderboardRows.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">No targets assigned this month.</p>
              ) : (
                leaderboardRows.map((row, index) => {
                  const isUser = String(row.telecallerId) === String(user.id);
                  const progress = row.transferTargetAssigned > 0
                    ? Math.min((row.transferTargetAchieved / row.transferTargetAssigned) * 100, 100)
                    : 0;
                  const rankColor = RANK_COLORS[index] ?? "text-muted-foreground";

                  return (
                    <div
                      key={row.telecallerId}
                      className={cn(
                        "rounded-xl border p-3.5 transition-colors",
                        isUser
                          ? "border-primary bg-primary/5"
                          : index < 3
                            ? RANK_BG[index]
                            : "border-border/60 bg-card"
                      )}
                    >
                      <div className="flex items-center gap-3">
                        {/* Avatar */}
                        <div className={cn(
                          "h-9 w-9 rounded-full flex items-center justify-center font-bold text-sm shrink-0",
                          isUser ? "bg-primary text-primary-foreground" : "bg-muted text-foreground"
                        )}>
                          {row.fullName.charAt(0).toUpperCase()}
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2 mb-1.5">
                            <p className="text-sm font-semibold truncate">
                              {row.fullName}{isUser ? " (You)" : ""}
                            </p>
                            <div className="flex items-center gap-1 shrink-0">
                              <span className="text-xs text-muted-foreground">
                                Target: {row.transferTargetAchieved}/{row.transferTargetAssigned}
                              </span>
                              <span className={cn("text-xs font-bold ml-1", rankColor)}>
                                #{index + 1}
                              </span>
                            </div>
                          </div>
                          <Progress value={progress} className="h-1.5" />
                          <p className={cn("mt-1 text-xs font-medium", rankColor)}>
                            {progress.toFixed(1)}%
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Footer totals */}
            {leaderboardRows.length > 0 && (
              <div className="mx-4 mb-4 flex justify-between text-xs text-muted-foreground border-t pt-3">
                <span>Total target <span className="font-semibold text-foreground">{totalTransferAssigned}</span></span>
                <span>Total achieved <span className="font-semibold text-foreground">{totalTransferAchieved}</span></span>
              </div>
            )}
          </CardContent>
        </Card>

      </div>
    </div>
  );
}
