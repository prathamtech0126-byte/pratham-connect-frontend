import { PageWrapper } from "@/layout/PageWrapper";
import { StatCard } from "@/components/cards/StatCard";
import { Users, DollarSign, Clock, CreditCard, TrendingUp, UserPlus, ShieldAlert, Activity, ArrowUpRight, ArrowRight, Target, Trophy, Medal, Calendar, CheckCircle2, XCircle, Loader2, IndianRupee, PhoneCall, Tag, Send, ChevronDown, ChevronUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip, Area, AreaChart, CartesianGrid } from "recharts";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { clientService, Client } from "@/services/clientService";
import { DataTable } from "@/components/table/DataTable";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/context/auth-context";
import { useSocket } from "@/context/socket-context";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ActivityLog } from "@/components/activity-log/ActivityLog";
import { useState, useMemo, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useLocation, Link } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { LEAD_VISA_CATEGORIES, LEAD_SOURCES, type DummyLead } from "@/data/dummyLeads";
import { getTargetForUser, getAchievedForUser, DUMMY_TELECALLER_TARGETS } from "@/data/telecallerTargets";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import confetti from "canvas-confetti";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

const chartData = [
  { name: "Jan", total: 12000 },
  { name: "Feb", total: 18000 },
  { name: "Mar", total: 25000 },
  { name: "Apr", total: 21000 },
  { name: "May", total: 32000 },
  { name: "Jun", total: 45000 },
];

const counselorTargets = [
  { name: "John Smith", achieved: 12, target: 20, avatar: "J" },
  { name: "Emmad Son", achieved: 8, target: 15, avatar: "E" },
  { name: "User", achieved: 7, target: 12, isCurrentUser: true, avatar: "U" },
  { name: "Sarah Jones", achieved: 5, target: 10, avatar: "S" },
  { name: "Mike Brown", achieved: 3, target: 10, avatar: "M" },
];

import { format, parseISO } from "date-fns";
import { RevenueChart } from "@/components/charts/RevenueChart";
import { DashboardDateFilter } from "@/components/dashboard/DashboardDateFilter";
import { ITSupportKanbanDashboard } from "@/pages/tech-support/ITSupportKanbanDashboard";
import { assignLeadApi, getLeads, type LeadEntity } from "@/api/leads.api";
import api from "@/lib/api";

const counselorRevenue = [
  { name: "Priya Singh", revenue: 1250000, clients: 12, avatar: "P" },
  { name: "Amit Kumar", revenue: 980000, clients: 8, avatar: "A" },
  { name: "Sarah Jones", revenue: 750000, clients: 5, avatar: "S" },
  { name: "Mike Brown", revenue: 450000, clients: 3, avatar: "M" },
  { name: "Rahul Verma", revenue: 320000, clients: 2, avatar: "R" },
];

function hasAchievedTarget(data: { achieved?: number; target?: number; targetStatus?: string }): boolean {
  const status = String(data.targetStatus ?? "").toLowerCase();
  if (status === "achieved" || status === "completed" || status === "success") return true;
  const target = Number(data.target) || 0;
  if (target <= 0) return false;
  return Number(data.achieved) >= target;
}


export default function Dashboard() {
  const { user } = useAuth();
  const isCounsellor = user?.role === "counsellor";
  const isTechSupport = user?.role === "tech_support";
  /** Full-screen canvas so confetti renders above layout/sidebar (default confetti can sit behind). */
  const confettiCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const [, setLocation] = useLocation();
  const { socket, isConnected } = useSocket();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [selectedBranch, setSelectedBranch] = useState("all");
  const [timeFilter, setTimeFilter] = useState("monthly");
  const [customDateRange, setCustomDateRange] = useState<[Date | null, Date | null]>([null, null]);
  // Telecaller: transfer lead modal + admin set target
  const [transferLead, setTransferLead] = useState<DummyLead | null>(null);
  const [transferToId, setTransferToId] = useState("");
  const [isTransferring, setIsTransferring] = useState(false);
  const [selectedTelecallerId, setSelectedTelecallerId] = useState("");
  const [monthlyTarget, setMonthlyTarget] = useState("");
  // Telecaller dashboard filters
  const [tcStatusFilter, setTcStatusFilter] = useState<string>("");
  const [tcVisaFilter, setTcVisaFilter] = useState<string>("");
  const [tcSourceFilter, setTcSourceFilter] = useState<string>("");
  const [tcFollowUpFilter, setTcFollowUpFilter] = useState<string>("");

  const maxY = Math.max(
    ...(chartData ?? []).map((d: any) => Number(d.total || d.value || 0)),
    0
  );

  // Format date as YYYY-MM-DD for API (backend requires both afterDate and beforeDate for custom filter)
  const toYYYYMMDD = (d: Date) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  // Build query params for API call. Custom filter MUST send both afterDate and beforeDate (YYYY-MM-DD).
  const getQueryParams = () => {
    const params: { filter: string; afterDate?: string; beforeDate?: string } = { filter: timeFilter };
    if (timeFilter === 'monthly') {
      const now = new Date();
      const y = now.getFullYear();
      const m = String(now.getMonth() + 1).padStart(2, '0');
      const lastDay = new Date(y, now.getMonth() + 1, 0).getDate();
      params.afterDate = `${y}-${m}-01`; // first day of current month
      params.beforeDate = `${y}-${m}-${String(lastDay).padStart(2, '0')}`; // last day of current month
    } else if (timeFilter === 'custom' && customDateRange[0] && customDateRange[1]) {
      // Backend expects: beforeDate = start (earlier), afterDate = end (later)
      params.beforeDate = toYYYYMMDD(customDateRange[0]); // start of range (earlier)
      params.afterDate = toYYYYMMDD(customDateRange[1]);   // end of range (later)
    }
    return params;
  };

  const { data: stats, error, isLoading } = useQuery({
    queryKey: [
      'dashboard-stats',
      timeFilter,
      timeFilter === 'monthly' ? getQueryParams().afterDate + '_' + getQueryParams().beforeDate : null,
      timeFilter === 'custom' && customDateRange[0] && customDateRange[1]
        ? `${toYYYYMMDD(customDateRange[0])}_${toYYYYMMDD(customDateRange[1])}`
        : null,
    ],
    queryFn: () => {
      const params = getQueryParams();
      return clientService.getDashboardStats(params.filter, params.afterDate, params.beforeDate);
    },
    retry: 1,
    staleTime: 1000 * 60 * 2, // Cache for 2 minutes
    enabled: !!user && user.role !== 'telecaller' && user.role !== "tech_support" && (timeFilter !== 'custom' || (!!customDateRange[0] && !!customDateRange[1])),
  });

  // Label for monthly chart: "Jan - Feb (Today 2 Feb 2026)". For custom: "1 Jan 2026 - 5 Feb 2026"
  const revenueChartRangeLabel = useMemo(() => {
    if (timeFilter === 'monthly') {
      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      return `${format(monthStart, "d MMM")} - ${format(monthEnd, "d MMM yyyy")}`;
    }
    if (timeFilter === 'custom' && customDateRange[0] && customDateRange[1]) {
      return `${format(customDateRange[0], "d MMM yyyy")} - ${format(customDateRange[1], "d MMM yyyy")}`;
    }
    return undefined;
  }, [timeFilter, customDateRange]);

  // All roles (admin, manager, counsellor) use POST filtered API; no GET /api/clients/counsellor-clients
  const userId = user?.id ?? (user as any)?.userId ?? (user as any)?.user_id;
  const userNum = typeof userId === "number" ? userId : parseInt(String(userId), 10);
  const hasUserForFiltered = !!user?.role && !Number.isNaN(userNum) && userNum > 0 && user.role !== "telecaller" && user.role !== "tech_support";

  const { data: recentClientsRaw } = useQuery({
    queryKey: ["recent-clients", "filtered", userNum, user?.role, "monthly"],
    queryFn: () =>
      clientService.getCounsellorClientsFiltered(userNum, user!.role!, { filter: "monthly" }),
    staleTime: 1000 * 60 * 2,
    enabled: hasUserForFiltered,
  });

  // Filtered API returns Client[]; use as-is
  const recentClients = useMemo(
    () => (recentClientsRaw && Array.isArray(recentClientsRaw) ? recentClientsRaw : undefined),
    [recentClientsRaw]
  );

  const { data: activities } = useQuery({
    queryKey: ['dashboard-activities'],
    queryFn: clientService.getRecentActivities
  });


  // Fetch user profile to get the actual fullname (user.name might be generic "User")
  const { data: userProfile } = useQuery({
    queryKey: ['user-profile'],
    queryFn: clientService.getUserProfile,
    staleTime: 1000 * 60 * 5, // Cache for 5 minutes
    enabled: !!user,
  });

  const canViewFinancials = user?.role === 'superadmin' ||user?.role === 'developer' || user?.role === 'director' || user?.role === 'manager';
  const canApprovePayments = user?.role === 'superadmin' || user?.role === 'developer' ||user?.role === 'director' || user?.role === 'manager';
  const [processingApproval, setProcessingApproval] = useState<number | null>(null);

  const { data: telecallerLeadItems = [], isLoading: isTelecallerLeadsLoading } = useQuery({
    queryKey: ["telecaller-dashboard-leads", user?.id],
    queryFn: async () => {
      const res = await getLeads({ limit: 500, currentTelecallerId: user?.id ? Number(user.id) : undefined });
      return res.items || [];
    },
    enabled: !!user && user.role === "telecaller",
    staleTime: 1000 * 30,
  });

  // Telecaller leaderboard — all telecallers' performance
  const { data: telecallerLeaderboard = [] } = useQuery({
    queryKey: ["telecaller-leaderboard"],
    queryFn: async () => {
      const res = await api.get("/api/leads/leaderboard/telecallers");
      return Array.isArray(res.data?.data) ? res.data.data : [];
    },
    enabled: !!user && user.role === "telecaller",
    staleTime: 1000 * 60,
  });

  // Real-time: telecaller socket listener — refetch leads on any lead event
  useEffect(() => {
    if (!socket || !isConnected || user?.role !== "telecaller") return;
    const refresh = () => {
      queryClient.invalidateQueries({ queryKey: ["telecaller-dashboard-leads"] });
    };
    socket.on("lead:created", refresh);
    socket.on("lead:updated", refresh);
    socket.on("lead:assigned", refresh);
    socket.on("lead:junked", refresh);
    socket.on("lead:followup", refresh);
    return () => {
      socket.off("lead:created", refresh);
      socket.off("lead:updated", refresh);
      socket.off("lead:assigned", refresh);
      socket.off("lead:junked", refresh);
      socket.off("lead:followup", refresh);
    };
  }, [socket, isConnected, user?.role, queryClient]);

  const { data: telecallerCounsellors = [] } = useQuery({
    queryKey: ["telecaller-dashboard-counsellors"],
    queryFn: async () => {
      const res = await api.get("/api/users/counsellors");
      return Array.isArray(res?.data?.data) ? res.data.data : [];
    },
    enabled: !!user && user.role === "telecaller",
    staleTime: 1000 * 60,
  });

  const telecallerLeads: DummyLead[] = useMemo(() => {
    const toStage = (progress: string): DummyLead["stage"] => {
      if (progress === "converted") return "Converted";
      if (progress === "interested" || progress === "follow_up") return "Qualified";
      if (progress === "contacted") return "Contacted";
      return "New";
    };

    const toStatus = (progress: string): DummyLead["status"] => {
      if (progress === "converted") return "converted";
      if (progress === "interested" || progress === "follow_up") return "qualified";
      if (progress === "contacted") return "contacted";
      if (progress === "junk" || progress === "not_interested") return "lost";
      return "new";
    };

    return (telecallerLeadItems as LeadEntity[]).map((l) => ({
      id: String(l.id),
      name: l.fullName,
      email: l.email || "",
      phone: l.phone || "",
      source: l.leadType || "Other",
      status: toStatus(l.progressStatus),
      stage: toStage(l.progressStatus),
      assignedToId: l.currentTelecallerId ? String(l.currentTelecallerId) : null,
      assignedToName: l.currentTelecallerId ? `User #${l.currentTelecallerId}` : null,
      lastFollowupAt: l.nextFollowupAt || null,
      createdAt: l.createdAt,
      visaCategory: l.leadType || undefined,
      transferredAt: l.assignmentStatus === "transferred" ? l.updatedAt : null,
      transferredByTelecallerId: l.assignmentStatus === "transferred" && l.currentTelecallerId
        ? String(l.currentTelecallerId)
        : null,
    }));
  }, [telecallerLeadItems]);

  // Fetch pending approvals (for admin/manager)
  const { data: pendingApprovals = [], refetch: refetchPendingApprovals } = useQuery({
    queryKey: ["pending-all-finance-approvals"],
    queryFn: clientService.getPendingAllFinanceApprovals,
    enabled: canApprovePayments,
    refetchInterval: 30000, // Refetch every 30 seconds
    retry: 1,
  });

  // Handle approve payment
  const handleApprove = async (financeId: number) => {
    try {
      console.log("[Dashboard] Approving payment, financeId:", financeId);
      setProcessingApproval(financeId);

      const result = await clientService.approveAllFinancePayment(financeId);
      console.log("[Dashboard] Approval successful, result:", result);

      toast({
        title: "Payment Approved",
        description: "The payment has been approved successfully.",
      });

      // Refresh pending approvals
      await refetchPendingApprovals();
      // Also invalidate to update count in Topbar
      queryClient.invalidateQueries({ queryKey: ["pending-all-finance-approvals"] });
    } catch (error: any) {
      console.error("[Dashboard] Error approving payment:", error);
      console.error("[Dashboard] Error details:", {
        message: error?.message,
        response: error?.response,
        status: error?.response?.status,
        data: error?.response?.data,
      });

      toast({
        title: "Error",
        description: error?.response?.data?.message || error?.message || "Failed to approve payment",
        variant: "destructive",
      });
    } finally {
      setProcessingApproval(null);
    }
  };

  // Handle reject payment
  const handleReject = async (financeId: number) => {
    try {
      console.log("[Dashboard] Rejecting payment, financeId:", financeId);
      setProcessingApproval(financeId);

      const result = await clientService.rejectAllFinancePayment(financeId);
      console.log("[Dashboard] Rejection successful, result:", result);

      toast({
        title: "Payment Rejected",
        description: "The payment has been rejected.",
        variant: "destructive",
      });

      // Refresh pending approvals
      await refetchPendingApprovals();
      // Also invalidate to update count in Topbar
      queryClient.invalidateQueries({ queryKey: ["pending-all-finance-approvals"] });
    } catch (error: any) {
      console.error("[Dashboard] Error rejecting payment:", error);
      console.error("[Dashboard] Error details:", {
        message: error?.message,
        response: error?.response,
        status: error?.response?.status,
        data: error?.response?.data,
      });

      toast({
        title: "Error",
        description: error?.response?.data?.message || error?.message || "Failed to reject payment",
        variant: "destructive",
      });
    } finally {
      setProcessingApproval(null);
    }
  };

  // Get the actual user name from profile, fallback to user.name
  const actualUserName = userProfile?.fullname || user?.name || '';

  // Get the user's counsellorId from profile (for matching with leaderboard)
  // The profile API should return userId or counsellorId field
  const userCounsellorId = userProfile?.userId || userProfile?.counsellorId || userProfile?.id || null;

  // Leaderboard period: same as dashboard time filter (monthly = current month, yearly = current year, etc.)
  const leaderboardPeriod = useMemo(() => {
    const now = new Date();
    if (timeFilter === 'yearly') {
      return { month: now.getMonth() + 1, year: now.getFullYear() };
    }
    if (timeFilter === 'custom' && customDateRange[0] && customDateRange[1]) {
      const end = customDateRange[1];
      return { month: end.getMonth() + 1, year: end.getFullYear() };
    }
    return { month: now.getMonth() + 1, year: now.getFullYear() };
  }, [timeFilter, customDateRange]);

  // Use leaderboard from stats API if available, otherwise fetch by same period as dashboard filter
  const apiLeaderboard = (stats as any)?.leaderboard;
  const { data: leaderboardResponse, isLoading: isLoadingLeaderboard } = useQuery({
    queryKey: ['leaderboard', leaderboardPeriod.month, leaderboardPeriod.year],
    queryFn: () => clientService.getLeaderboard(leaderboardPeriod.month, leaderboardPeriod.year),
    staleTime: 1000 * 60 * 2, // Cache for 2 minutes
    // Skip leaderboard API call for tech support users (403 forbidden for them)
    enabled: !!user && !apiLeaderboard && user?.role !== 'tech_support',
  });

  const isManagerRoleUser = user?.role === "manager";
  // Supervisor managers can see all counsellors and all managers (same as admin view)
  const isSupervisorManager = isManagerRoleUser && !!user?.isSupervisor;
  const showManagerTargets = canViewFinancials;

  // Derive start/end dates for manager-targets query from the dashboard date filter
  const managerTargetsDateRange = useMemo(() => {
    const now = new Date();
    if (timeFilter === 'today') {
      const d = toYYYYMMDD(now);
      return { start: d, end: d };
    }
    if (timeFilter === 'weekly') {
      const day = now.getDay();
      const startOfWeek = new Date(now);
      startOfWeek.setDate(now.getDate() - (day === 0 ? 6 : day - 1));
      return { start: toYYYYMMDD(startOfWeek), end: toYYYYMMDD(now) };
    }
    if (timeFilter === 'monthly') {
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      return { start: toYYYYMMDD(start), end: toYYYYMMDD(end) };
    }
    if (timeFilter === 'yearly') {
      return { start: `${now.getFullYear()}-01-01`, end: `${now.getFullYear()}-12-31` };
    }
    if (timeFilter === 'custom' && customDateRange[0] && customDateRange[1]) {
      return { start: toYYYYMMDD(customDateRange[0]), end: toYYYYMMDD(customDateRange[1]) };
    }
    return { start: undefined, end: undefined };
  }, [timeFilter, customDateRange]);

  const { data: managerTargetsQueryData, isLoading: isLoadingManagerTargets } = useQuery({
    queryKey: [
      "manager-targets-dashboard",
      // Supervisor managers fetch all targets (no ID filter), regular managers filter by own ID
      isSupervisorManager ? "all" : (isManagerRoleUser ? userNum : "all"),
      managerTargetsDateRange.start ?? null,
      managerTargetsDateRange.end ?? null,
    ],
    queryFn: () => {
      const { start, end } = managerTargetsDateRange;
      // Regular (non-supervisor) manager: filter by their own manager ID
      if (isManagerRoleUser && !isSupervisorManager && !Number.isNaN(userNum) && userNum > 0) {
        return clientService.getManagerTargets(start, end, userNum);
      }
      // Admin, developer, director, or supervisor manager: fetch all targets
      return clientService.getManagerTargets(start, end);
    },
    staleTime: 1000 * 60 * 2,
    enabled: !!user && showManagerTargets && (timeFilter !== 'custom' || (!!customDateRange[0] && !!customDateRange[1])),
  });

  // Need manager names for: admin/director/developer roles AND supervisor managers
  const { data: managersListData } = useQuery({
    queryKey: ["managers"],
    queryFn: () => clientService.getManagers(),
    staleTime: 1000 * 60 * 5,
    enabled: !!user && showManagerTargets && (!isManagerRoleUser || isSupervisorManager),
  });

  const managerTargetsList: any[] = managerTargetsQueryData?.data ?? [];

  // API returns { data: array, summary }; stats may return array or single object
  const leaderboardArray = leaderboardResponse && typeof leaderboardResponse === 'object' && Array.isArray(leaderboardResponse.data)
    ? leaderboardResponse.data
    : Array.isArray(leaderboardResponse) ? leaderboardResponse : null;
  const finalLeaderboardData = apiLeaderboard || leaderboardArray;

  // Transform leaderboard API data to display format
  const transformedLeaderboardData = useMemo(() => {
    // Handle counsellor leaderboard (object format)
    if (isCounsellor && finalLeaderboardData && typeof finalLeaderboardData === 'object' && !Array.isArray(finalLeaderboardData)) {
      const leaderboardObj = finalLeaderboardData as any;
      return [{
        name: userProfile?.fullname || user?.name || 'You',
        achieved: leaderboardObj.enrollments || 0,
        target: leaderboardObj.target || 0,
        avatar: (userProfile?.fullname || user?.name || 'U').charAt(0).toUpperCase(),
        isCurrentUser: true,
        counsellorId: userCounsellorId,
        position: leaderboardObj.position,
        targetStatus: leaderboardObj.targetStatus
      }];
    }

    // Handle admin/manager leaderboard (array format)
    if (!finalLeaderboardData || !Array.isArray(finalLeaderboardData)) {
      return [];
    }

    // Debug: Log user ID and first counsellor ID for comparison
    // if (finalLeaderboardData.length > 0 && user?.id) {
    //   console.log('[Dashboard Leaderboard] User ID:', user.id, 'Type:', typeof user.id);
    //   console.log('[Dashboard Leaderboard] First counsellor ID:', finalLeaderboardData[0].counsellorId, 'Type:', typeof finalLeaderboardData[0].counsellorId);
    // }

    return finalLeaderboardData.map((item: any) => {
      const counsellorId = item.counsellorId;
      const fullName = item.fullName || 'Unknown';
      const enrollments = Number(item.enrollments ?? item.achievedTarget ?? 0) || 0;
      const target = Number(item.target ?? 0) || 0;
      const avatar = fullName.charAt(0).toUpperCase();

      // Check if this counsellor is the logged-in user by matching counsellorId
      // Use userCounsellorId from profile API (which should match the counsellorId in leaderboard)
      let isCurrentUser = false;

      if (userCounsellorId !== null && userCounsellorId !== undefined && counsellorId !== null && counsellorId !== undefined) {
        // Try string comparison first
        const userCounsellorIdStr = String(userCounsellorId).trim();
        const counsellorIdStr = String(counsellorId).trim();

        if (userCounsellorIdStr === counsellorIdStr) {
          isCurrentUser = true;
          // console.log('[Dashboard Leaderboard] ✅ Match found (counsellorId string):', fullName, 'User CounsellorId:', userCounsellorIdStr, 'Leaderboard CounsellorId:', counsellorIdStr);
        } else {
          // Try number comparison (handle cases where one is string and one is number)
          const userCounsellorIdNum = Number(userCounsellorId);
          const counsellorIdNum = Number(counsellorId);
          if (!isNaN(userCounsellorIdNum) && !isNaN(counsellorIdNum) && userCounsellorIdNum === counsellorIdNum) {
            isCurrentUser = true;
            // console.log('[Dashboard Leaderboard] ✅ Match found (counsellorId number):', fullName, 'User CounsellorId:', userCounsellorIdNum, 'Leaderboard CounsellorId:', counsellorIdNum);
          }
        }
      }

      // Debug: Log if no match found for debugging
      if (!isCurrentUser && userCounsellorId) {
        // console.log('[Dashboard Leaderboard] No match:', fullName, 'User CounsellorId:', userCounsellorId, 'Leaderboard CounsellorId:', counsellorId);
      }

      return {
        name: fullName,
        achieved: enrollments,
        target: target,
        avatar: avatar,
        isCurrentUser: isCurrentUser,
        counsellorId: counsellorId,
        targetStatus: item.targetStatus,
      };
    }).sort((a: any, b: any) => {
      // Sort by achieved (descending), then by name
      if (b.achieved !== a.achieved) {
        return b.achieved - a.achieved;
      }
      return a.name.localeCompare(b.name);
    });
  }, [finalLeaderboardData, userCounsellorId, user?.id, isCounsellor, userProfile?.fullname, user?.name]);

  // For counsellor: get their own data for target card
  const currentUserTarget = useMemo(() => {
    if (isCounsellor) {
      // For counsellor, use leaderboard object from API or transformed data
      const leaderboardObj = (stats as any)?.leaderboard;
      if (leaderboardObj && typeof leaderboardObj === 'object' && !Array.isArray(leaderboardObj)) {
        return {
          name: userProfile?.fullname || user?.name || 'You',
          achieved: leaderboardObj.enrollments || 0,
          target: leaderboardObj.target || 0,
          avatar: (userProfile?.fullname || user?.name || 'U').charAt(0).toUpperCase(),
          isCurrentUser: true,
          position: leaderboardObj.position,
          targetStatus: leaderboardObj.targetStatus
        };
      }
      // Fallback to transformed data
      if (transformedLeaderboardData.length > 0) {
        return transformedLeaderboardData.find((c: any) => c.isCurrentUser) || null;
      }
    }
    // Fallback to hardcoded data if API data not available
    return counselorTargets.find(c => c.isCurrentUser) || null;
  }, [transformedLeaderboardData, isCounsellor, stats, userProfile?.fullname, user?.name]);

  // For leaderboard widget: use API data, fallback to hardcoded
  // Show ALL counsellors (not limited to top 5)
  const leaderboardForDisplay = useMemo(() => {
    if (transformedLeaderboardData.length > 0) {
      // Return all counsellors (no limit)
      return transformedLeaderboardData;
    }
    // Fallback to hardcoded data
    return counselorTargets;
  }, [transformedLeaderboardData]);

  /** Achievement messages for marquee — from API leaderboard rows only. */
  const achieverMarqueeLine = useMemo(() => {
    if (transformedLeaderboardData.length === 0) return "";
    const messages = transformedLeaderboardData
      .filter((c: any) => hasAchievedTarget(c))
      .map((c: any) => `${String(c.name).trim()} has achieved their target`)
      .filter(Boolean);
    if (messages.length === 0) return "";
    const joined = messages.join("   ·   ");
    // Repeat so short lists still fill the bar and the loop looks smooth
    return [joined, joined, joined].join("   ·   ");
  }, [transformedLeaderboardData]);

  const remainingTarget = currentUserTarget ? Math.max(0, currentUserTarget.target - currentUserTarget.achieved) : 0;
  const progressPercentage = currentUserTarget && currentUserTarget.target > 0
    ? (currentUserTarget.achieved / currentUserTarget.target) * 100
    : 0;

  // Counsellor celebration: once per login/session when target is achieved; dedicated full-screen canvas so it layers above the app chrome.
  useEffect(() => {
    if (!isCounsellor || isLoadingLeaderboard || !currentUserTarget || !hasAchievedTarget(currentUserTarget)) return;

    const userId = String(user?.id ?? "");
    if (!userId) return;

    const key = `crm-login-confetti-shown-${userId}`;
    if (sessionStorage.getItem(key) === "1") return;

    let intervalId: ReturnType<typeof setInterval> | undefined;
    let retryTimeoutId: number | undefined;
    let cancelled = false;

    const start = () => {
      const canvas = confettiCanvasRef.current;
      if (!canvas || cancelled) return false;

      sessionStorage.setItem(key, "1");

      const myConfetti = confetti.create(canvas, {
        resize: true,
        useWorker: true,
      });

      const durationMs = 10000;
      const endAt = Date.now() + durationMs;

      intervalId = setInterval(() => {
        if (cancelled) return;
        const remaining = endAt - Date.now();
        if (remaining <= 0) {
          if (intervalId) clearInterval(intervalId);
          return;
        }

        const particleCount = Math.max(12, 55 * (remaining / durationMs));
        myConfetti({
          particleCount,
          spread: 85,
          startVelocity: 42,
          ticks: 220,
          gravity: 0.95,
          scalar: 1.15,
          origin: { x: 0.5, y: 0.18 },
        });
        myConfetti({
          particleCount: Math.floor(particleCount * 0.65),
          spread: 100,
          startVelocity: 38,
          angle: 60,
          ticks: 200,
          gravity: 0.95,
          scalar: 1.1,
          origin: { x: 0.15, y: 0.22 },
        });
        myConfetti({
          particleCount: Math.floor(particleCount * 0.65),
          spread: 100,
          startVelocity: 38,
          angle: 120,
          ticks: 200,
          gravity: 0.95,
          scalar: 1.1,
          origin: { x: 0.85, y: 0.22 },
        });
      }, 280);

      return true;
    };

    const kickoff = () => {
      if (cancelled) return;
      if (start()) return;
      retryTimeoutId = window.setTimeout(() => {
        if (!cancelled) start();
      }, 50);
    };

    requestAnimationFrame(() => {
      requestAnimationFrame(kickoff);
    });

    return () => {
      cancelled = true;
      if (retryTimeoutId) clearTimeout(retryTimeoutId);
      if (intervalId) clearInterval(intervalId);
    };
  }, [isCounsellor, isLoadingLeaderboard, currentUserTarget, user?.id]);

  // Other Product breakdown expand/collapse (admin/manager)
  const [showAllOtherProductBreakdown, setShowAllOtherProductBreakdown] = useState(false);
  const [expandedManagerIds, setExpandedManagerIds] = useState<Set<number>>(new Set());

  // Transform teamPerformance data for counsellor chart
  const teamPerformanceData = useMemo(() => {
    const performance = (stats as any)?.teamPerformance;
    if (!performance || !Array.isArray(performance)) {
      return [];
    }
    return performance.map((item: any) => ({
      period: item.period || '',
      current: item.current || 0,
      previous: item.previous || 0,
      change: item.change || 0,
      changeType: item.changeType || 'no-change'
    }));
  }, [stats]);

  // Transform individualPerformance data for counsellor chart
  const individualPerformanceData = useMemo(() => {
    const performance = (stats as any)?.individualPerformance;
    if (!performance || typeof performance !== 'object') {
      return null;
    }
    return {
      period: performance.periodLabel || 'Performance',
      current: performance.current || 0,
      previous: performance.previous || 0,
      change: performance.change || 0,
      changeType: performance.changeType || 'no-change'
    };
  }, [stats]);

  // WebSocket listener for real-time dashboard updates
  useEffect(() => {
    if (!socket || !isConnected) {
      // console.log('[Dashboard] Socket not available, skipping dashboard WebSocket listener');
      return;
    }

    // Only listen if user is admin (superadmin, developer,manager, director)
    const isAdmin = user?.role === 'superadmin' ||user?.role === 'developer' || user?.role === 'manager' || user?.role === 'director';
    if (!isAdmin) {
      // console.log('[Dashboard] User is not admin, skipping dashboard WebSocket listener');
      return;
    }

    // console.log('[Dashboard] Setting up dashboard:updated WebSocket listener');

    // Ensure admin joins both admin room (for client events) and admin:dashboard room (for dashboard events)
    // Note: join:admin is already handled in socket-context.tsx, but we ensure join:admin:dashboard here
    socket.emit('join:admin:dashboard');
    // console.log('[Dashboard] ✅ Joined admin:dashboard room');

    // Also ensure admin room is joined (should already be done in socket-context, but double-check)
    socket.emit('join:admin');
    // console.log('[Dashboard] ✅ Joined admin room (for client events)');

    // Listen for dashboard:updated event
    const handleDashboardUpdated = (eventData: {
      filter: string;
      data: {
        totalClients: { count: number; change: number; changeType: string };
        totalRevenue: {
          totalCorePayment: string;
          totalProductPayment: string;
          total: string;
          change: number;
          changeType: string;
        };
        pendingAmount: {
          amount: string;
          breakdown: {
            initial: string;
            beforeVisa: string;
            afterVisa: string;
            submittedVisa: string;
          };
          label: string;
        };
        newEnrollments: { count: number; label: string };
        revenueOverview: Array<{ month: string; revenue: string }>;
      };
    }) => {
      // console.log('📊 [Dashboard] ========== DASHBOARD:UPDATED EVENT RECEIVED ==========');
      // console.log('[Dashboard] Event filter:', eventData.filter, '| Current filter:', timeFilter);
      // console.log('[Dashboard] Event data:', eventData.data);

      // Only update if current filter matches the event filter (or if event filter is "today")
      // Backend currently only emits for "today" filter
      if (eventData.filter === timeFilter || eventData.filter === 'today') {
        // console.log('[Dashboard] ✅ Filter matches, updating dashboard data');

        // Update React Query cache with new data
        queryClient.setQueryData(
          ['dashboard-stats', timeFilter],
          eventData.data
        );

        // console.log('[Dashboard] ✅ Updated dashboard stats cache');

        // Show toast notification (optional, can be removed if too noisy)
        // toast({
        //   title: "Dashboard Updated",
        //   description: "Dashboard statistics have been updated in real-time.",
        // });
      } else {
        // console.log('[Dashboard] ⏭️ Filter mismatch, skipping update. Event filter:', eventData.filter, 'Current filter:', timeFilter);
      }
    };

    // Listen for client:created event to update dashboard instantly
    const handleClientCreated = (data: {
      action: "CREATED";
      client: any;
      clients?: any;
      allClients?: any;
    }) => {
      // console.log('📊 [Dashboard] Received client:created event, invalidating dashboard stats');

      // Force immediate refetch of dashboard stats
      queryClient.invalidateQueries({
        queryKey: ['dashboard-stats'],
        refetchType: 'active'
      });

      // Also trigger a manual refetch to ensure instant update
      queryClient.refetchQueries({
        queryKey: ['dashboard-stats'],
        type: 'active'
      });

      // console.log('[Dashboard] ✅ Invalidated and refetching dashboard stats');
    };

    // Listen for client:updated event to update dashboard instantly
    const handleClientUpdated = (data: {
      action: "UPDATED";
      client: any;
      clients?: any;
      allClients?: any;
    }) => {
      // console.log('📊 [Dashboard] Received client:updated event, invalidating dashboard stats');

      // Force immediate refetch of dashboard stats
      queryClient.invalidateQueries({
        queryKey: ['dashboard-stats'],
        refetchType: 'active'
      });

      queryClient.refetchQueries({
        queryKey: ['dashboard-stats'],
        type: 'active'
      });

      // console.log('[Dashboard] ✅ Invalidated and refetching dashboard stats');
    };

    // Listen for payment:created event (affects revenue and pending amount)
    const handlePaymentCreated = (data: {
      clientId: number;
      client: any;
      clients?: any;
    }) => {
      // console.log('📊 [Dashboard] Received payment:created event, invalidating dashboard stats');

      queryClient.invalidateQueries({
        queryKey: ['dashboard-stats'],
        refetchType: 'active'
      });

      queryClient.refetchQueries({
        queryKey: ['dashboard-stats'],
        type: 'active'
      });

      // console.log('[Dashboard] ✅ Invalidated and refetching dashboard stats (payment created)');
    };

    // Listen for payment:updated event (affects revenue and pending amount)
    const handlePaymentUpdated = (data: {
      clientId: number;
      client: any;
      clients?: any;
    }) => {
      // console.log('📊 [Dashboard] Received payment:updated event, invalidating dashboard stats');

      queryClient.invalidateQueries({
        queryKey: ['dashboard-stats'],
        refetchType: 'active'
      });

      queryClient.refetchQueries({
        queryKey: ['dashboard-stats'],
        type: 'active'
      });

      // console.log('[Dashboard] ✅ Invalidated and refetching dashboard stats (payment updated)');
    };

    // Listen for productPayment:created event (affects revenue)
    const handleProductPaymentCreated = (data: {
      clientId: number;
      client: any;
      clients?: any;
    }) => {
      // console.log('📊 [Dashboard] Received productPayment:created event, invalidating dashboard stats');

      queryClient.invalidateQueries({
        queryKey: ['dashboard-stats'],
        refetchType: 'active'
      });

      queryClient.refetchQueries({
        queryKey: ['dashboard-stats'],
        type: 'active'
      });

      // console.log('[Dashboard] ✅ Invalidated and refetching dashboard stats (product payment created)');
    };

    // Listen for productPayment:updated event (affects revenue)
    const handleProductPaymentUpdated = (data: {
      clientId: number;
      client: any;
      clients?: any;
    }) => {
      //  console.log('📊 [Dashboard] Received productPayment:updated event, invalidating dashboard stats');

      queryClient.invalidateQueries({
        queryKey: ['dashboard-stats'],
        refetchType: 'active'
      });

      queryClient.refetchQueries({
        queryKey: ['dashboard-stats'],
        type: 'active'
      });

      // console.log('[Dashboard] ✅ Invalidated and refetching dashboard stats (product payment updated)');
    };

    // Register all event listeners
    socket.on('dashboard:updated', handleDashboardUpdated);
    socket.on('client:created', handleClientCreated);
    socket.on('client:updated', handleClientUpdated);
    socket.on('payment:created', handlePaymentCreated);
    socket.on('payment:updated', handlePaymentUpdated);
    socket.on('productPayment:created', handleProductPaymentCreated);
    socket.on('productPayment:updated', handleProductPaymentUpdated);
    // console.log('[Dashboard] ✅ Registered WebSocket event listeners: dashboard:updated, client:created, client:updated, payment:created, payment:updated, productPayment:created, productPayment:updated');

    // Cleanup on unmount
    return () => {
      // console.log('[Dashboard] Cleaning up dashboard WebSocket listeners');
      socket.off('dashboard:updated', handleDashboardUpdated);
      socket.off('client:created', handleClientCreated);
      socket.off('client:updated', handleClientUpdated);
      socket.off('payment:created', handlePaymentCreated);
      socket.off('payment:updated', handlePaymentUpdated);
      socket.off('productPayment:created', handleProductPaymentCreated);
      socket.off('productPayment:updated', handleProductPaymentUpdated);
      socket.emit('leave:admin:dashboard');
    };
  }, [socket, isConnected, user?.role, timeFilter, queryClient, toast]);

  // Helper function to safely get numeric value from stats
  // Handles both old format (number) and new format (object with count property)
  const getAdjustedValue = (value: any): number => {
    if (value === undefined || value === null) {
      return 0;
    }
    // If it's an object with count property (new format)
    if (typeof value === 'object' && 'count' in value) {
      return Number(value.count) || 0;
    }
    // If it's already a number
    if (typeof value === 'number') {
      return isNaN(value) ? 0 : value;
    }
    // Try to convert to number
    const num = Number(value);
    return isNaN(num) ? 0 : num;
  };

  // Show error state if API call fails
  if (error) {
    console.error('[Dashboard] Error fetching stats:', error);
    return (
      <PageWrapper title="Dashboard" breadcrumbs={[{ label: "Dashboard" }]}>
        <Alert variant="destructive">
          <AlertTitle>Error Loading Dashboard</AlertTitle>
          <AlertDescription>
            Failed to load dashboard statistics. Please try refreshing the page.
            {error instanceof Error && ` Error: ${error.message}`}
          </AlertDescription>
        </Alert>
      </PageWrapper>
    );
  }

  // Show loading state (skip for telecaller - they don't use stats)
  if (user?.role !== 'telecaller' && user?.role !== "tech_support" && isLoading && !stats) {
    return (
      <PageWrapper title="Dashboard" breadcrumbs={[{ label: "Dashboard" }]}>
        <div className="space-y-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="w-full h-20 bg-muted/50 animate-pulse rounded-xl border border-border/50" />
          ))}
        </div>
      </PageWrapper>
    );
  }

  if (isTechSupport) {
    return <ITSupportKanbanDashboard />;
  }

  // Telecaller view: full dashboard per system requirements
  if (user?.role === 'telecaller') {
    const displayName = userProfile?.fullname || user?.name || 'Telecaller';
    const assignedLeads = telecallerLeads;
    const target = getTargetForUser(user.id);

    // Overview stats (for cards)
    const totalAssigned = assignedLeads.length;
    const uncontactedCount = assignedLeads.filter((l) => l.stage === "New" && !l.lastFollowupAt).length;
    const contactedCount = assignedLeads.filter((l) => l.stage === "Contacted").length;
    const followUpCount = assignedLeads.filter((l) => !!l.lastFollowupAt && l.stage !== "Converted").length;
    // Qualified = interested/qualified stage OR transferred to counsellor (same thing)
    const qualifiedCount = assignedLeads.filter((l) => l.stage === "Qualified" || !!l.transferredAt).length;
    const convertedCount = assignedLeads.filter((l) => l.stage === "Converted").length;

    // Today's follow-ups
    const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date(); todayEnd.setHours(23, 59, 59, 999);
    const todayFollowUps = assignedLeads.filter((l) => {
      if (!l.lastFollowupAt) return false;
      const d = new Date(l.lastFollowupAt);
      return d >= todayStart && d <= todayEnd;
    });

    // Lead category overview (by visa category)
    const categoryCounts = LEAD_VISA_CATEGORIES.map((cat) => ({
      name: cat,
      count: assignedLeads.filter((l) => (l.visaCategory || "Other Immigration Services") === cat).length,
    }));

    // Lead source overview (by actual source in assigned leads)
    const sourceCountsByExact = assignedLeads.reduce<Record<string, number>>((acc, l) => {
      const s = l.source || "Other";
      acc[s] = (acc[s] || 0) + 1;
      return acc;
    }, {});

    // Date range for date filter
    const getTelecallerDateRange = (): { start: Date; end: Date } | null => {
      const now = new Date();
      const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
      if (timeFilter === 'today') {
        const start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
        return { start, end: endOfToday };
      }
      if (timeFilter === 'weekly') {
        const day = now.getDay();
        const startOfWeek = new Date(now);
        startOfWeek.setDate(now.getDate() - (day === 0 ? 6 : day - 1));
        startOfWeek.setHours(0, 0, 0, 0);
        return { start: startOfWeek, end: endOfToday };
      }
      if (timeFilter === 'monthly') {
        const start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
        return { start, end: endOfToday };
      }
      if (timeFilter === 'yearly') {
        const start = new Date(now.getFullYear(), 0, 1, 0, 0, 0, 0);
        return { start, end: endOfToday };
      }
      if (timeFilter === 'custom' && customDateRange[0] && customDateRange[1]) {
        const start = new Date(customDateRange[0]);
        start.setHours(0, 0, 0, 0);
        const end = new Date(customDateRange[1]);
        end.setHours(23, 59, 59, 999);
        return { start, end };
      }
      return null;
    };
    const dateRange = getTelecallerDateRange();

    let filteredAssignedLeads = assignedLeads;
    if (dateRange) {
      filteredAssignedLeads = filteredAssignedLeads.filter((l) => {
        const d = l.lastFollowupAt ? new Date(l.lastFollowupAt) : new Date(l.createdAt);
        return d >= dateRange.start && d <= dateRange.end;
      });
    }
    if (tcStatusFilter) {
      if (tcStatusFilter === "new") filteredAssignedLeads = filteredAssignedLeads.filter((l) => l.stage === "New");
      else if (tcStatusFilter === "contacted") filteredAssignedLeads = filteredAssignedLeads.filter((l) => l.stage === "Contacted");
      else if (tcStatusFilter === "qualified") filteredAssignedLeads = filteredAssignedLeads.filter((l) => l.stage === "Qualified");
      else if (tcStatusFilter === "converted") filteredAssignedLeads = filteredAssignedLeads.filter((l) => l.stage === "Converted");
    }
    if (tcVisaFilter) filteredAssignedLeads = filteredAssignedLeads.filter((l) => (l.visaCategory || "") === tcVisaFilter);
    if (tcSourceFilter) filteredAssignedLeads = filteredAssignedLeads.filter((l) => (l.source || "") === tcSourceFilter);
    if (tcFollowUpFilter === "today") {
      filteredAssignedLeads = filteredAssignedLeads.filter((l) => {
        if (!l.lastFollowupAt) return false;
        const d = new Date(l.lastFollowupAt);
        return d >= todayStart && d <= todayEnd;
      });
    }
    const achieved = getAchievedForUser(user.id);
    const remaining = target && achieved ? Math.max(0, target.monthlyEnrollmentTarget - achieved.monthlyEnrollmentAchieved) : 0;
    const progressPercentage = target && target.monthlyEnrollmentTarget > 0 && achieved
      ? (achieved.monthlyEnrollmentAchieved / target.monthlyEnrollmentTarget) * 100
      : 0;
    const counsellorOptions = (telecallerCounsellors as any[]).map((u) => ({
      id: String(u.id),
      name: u.fullName || u.name || `Counsellor #${u.id}`,
      role: "counsellor",
    }));

    const handleTransferSubmit = async () => {
      if (!transferLead || !transferToId) return;
      setIsTransferring(true);
      try {
        await assignLeadApi(Number(transferLead.id), { counsellorId: Number(transferToId) });
        await queryClient.invalidateQueries({ queryKey: ["telecaller-dashboard-leads"] });
        const to = counsellorOptions.find((c) => c.id === transferToId);
        toast({ title: "Lead transferred", description: `${transferLead.name} transferred to ${to?.name ?? 'Counsellor'}.` });
        setTransferLead(null);
        setTransferToId('');
      } finally {
        setIsTransferring(false);
      }
    };

    return (
      <div className="space-y-8 pb-8">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">Dashboard</h1>
            <p className="text-muted-foreground mt-1">
              Welcome back, <span className="font-semibold text-primary">{displayName}</span>. Here&apos;s what&apos;s happening.
            </p>
          </div>
          <div className="flex items-center">
            <DashboardDateFilter
              date={customDateRange}
              onDateChange={setCustomDateRange}
              activeTab={timeFilter === 'today' ? 'Today' : timeFilter === 'weekly' ? 'Weekly' : timeFilter === 'monthly' ? 'Monthly' : timeFilter === 'yearly' ? 'Yearly' : timeFilter === 'custom' ? 'Custom' : 'Monthly'}
              onTabChange={(tab) => setTimeFilter(tab === 'Today' ? 'today' : tab === 'Custom' ? 'custom' : tab.toLowerCase())}
              showYearly={false}
              align="end"
            />
          </div>
        </div>

        {/* Your Target card */}
        <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-3">
          <div className="h-full">
            <Card className="h-full border-none shadow-card bg-gradient-to-br from-primary/5 to-primary/10 rounded-xl overflow-hidden relative flex flex-col justify-center">
              <div className="absolute top-4 right-4 opacity-10">
                <Target className="w-24 h-24 text-primary" />
              </div>
              <CardHeader>
                <CardTitle className="text-lg font-bold text-foreground flex items-center gap-2">
                  <div className="p-2 bg-background/50 backdrop-blur-sm rounded-lg shadow-sm">
                    <Target className="w-5 h-5 text-primary" />
                  </div>
                  Your Target
                </CardTitle>
                <CardDescription>Monthly enrollment goal</CardDescription>
              </CardHeader>
              <CardContent>
                {target && achieved ? (
                  <div className="space-y-6">
                    <div className="flex items-end justify-between relative z-10">
                      <div>
                        <div className="flex items-baseline gap-2">
                          <span className="text-5xl font-bold text-foreground tracking-tight">{achieved.monthlyEnrollmentAchieved}</span>
                          <span className="text-muted-foreground font-medium text-lg">/ {target.monthlyEnrollmentTarget} achieved</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-sm font-medium text-muted-foreground block mb-1">Remaining</span>
                        <div className="text-3xl font-bold text-primary tabular-nums">{remaining}</div>
                      </div>
                    </div>
                    <div className="space-y-2 relative z-10">
                      <Progress value={Math.min(progressPercentage, 100)} className="h-3 bg-background/50" />
                      <p className="text-xs text-muted-foreground text-right font-medium">{progressPercentage.toFixed(0)}% completed</p>
                    </div>
                    <div
                      className={`rounded-xl p-4 text-sm text-foreground backdrop-blur-md border shadow-sm relative z-10 ${
                        target.monthlyEnrollmentTarget > 0 &&
                        achieved.monthlyEnrollmentAchieved >= target.monthlyEnrollmentTarget
                          ? "bg-emerald-500/10 border-emerald-500/30"
                          : "bg-background/40 border-border/50"
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div
                          className={`p-1.5 rounded-full mt-0.5 ${
                            target.monthlyEnrollmentTarget > 0 &&
                            achieved.monthlyEnrollmentAchieved >= target.monthlyEnrollmentTarget
                              ? "bg-emerald-500/15"
                              : "bg-primary/10"
                          }`}
                        >
                          <Trophy
                            className={`w-4 h-4 ${
                              target.monthlyEnrollmentTarget > 0 &&
                              achieved.monthlyEnrollmentAchieved >= target.monthlyEnrollmentTarget
                                ? "text-emerald-600 dark:text-emerald-400"
                                : "text-primary"
                            }`}
                          />
                        </div>
                        <div>
                          {target.monthlyEnrollmentTarget > 0 &&
                          achieved.monthlyEnrollmentAchieved >= target.monthlyEnrollmentTarget ? (
                            <>
                              <p className="font-bold text-foreground">Congratulations! 🎉</p>
                              <p className="text-muted-foreground text-xs mt-1 leading-relaxed">
                                You&apos;ve achieved your monthly enrollment target. Outstanding work!
                              </p>
                            </>
                          ) : (
                            <>
                              <p className="font-bold text-foreground">Keep it up! 🚀</p>
                              <p className="text-muted-foreground text-xs mt-1 leading-relaxed">
                                You need <span className="font-bold text-primary">{remaining}</span> more enrollments to hit your monthly target.
                              </p>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    No target set yet. Ask your manager to set your monthly enrollment goal.
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Overview Section – quick statistics */}
        {isTelecallerLeadsLoading ? (
          <Card className="border-border/60 shadow-sm">
            <CardContent className="p-4 text-sm text-muted-foreground">Loading telecaller dashboard data...</CardContent>
          </Card>
        ) : null}
        <section>
          <h2 className="text-lg font-semibold text-foreground mb-3">Lead overview</h2>
          <p className="text-sm text-muted-foreground mb-4">Quick statistics of your leads</p>
          <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 md:grid-cols-5">
            <Card className="border-border/60 shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Total Assigned</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-foreground">{totalAssigned}</p>
              </CardContent>
            </Card>
            <Card className="border-border/60 shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Uncontacted</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-foreground">{uncontactedCount}</p>
              </CardContent>
            </Card>
            <Card className="border-border/60 shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Contacted</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-foreground">{contactedCount}</p>
              </CardContent>
            </Card>
            <Card className="border-border/60 shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Follow-up</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-foreground">{followUpCount}</p>
              </CardContent>
            </Card>
            <Card className="border-border/60 shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Qualified / Transferred</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{qualifiedCount}</p>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Lead Category Overview */}
        <section>
          <h2 className="text-lg font-semibold text-foreground mb-3">Lead category overview</h2>
          <p className="text-sm text-muted-foreground mb-4">Leads by visa category – prioritize calls based on business focus</p>
          <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
            {categoryCounts.map(({ name, count }) => (
              <Card key={name} className="border-border/60 shadow-sm">
                <CardContent className="pt-4">
                  <p className="text-sm font-medium text-muted-foreground truncate" title={name}>{name}</p>
                  <p className="text-2xl font-bold text-foreground mt-1">{count}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* Lead Source Overview */}
        <section>
          <h2 className="text-lg font-semibold text-foreground mb-3">Lead source overview</h2>
          <p className="text-sm text-muted-foreground mb-4">Where your leads came from</p>
          <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            {Object.entries(sourceCountsByExact).map(([name, count]) => (
              <Card key={name} className="border-border/60 shadow-sm">
                <CardContent className="pt-4">
                  <p className="text-sm font-medium text-muted-foreground truncate" title={name}>{name}</p>
                  <p className="text-2xl font-bold text-foreground mt-1">{count}</p>
                </CardContent>
              </Card>
            ))}
            {Object.keys(sourceCountsByExact).length === 0 && (
              <p className="text-sm text-muted-foreground col-span-full">No leads yet</p>
            )}
          </div>
        </section>

        {/* Telecaller Lead List + Filters */}
        <section>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-4">
            <div>
              <h2 className="text-lg font-semibold text-foreground">Lead list</h2>
              <p className="text-sm text-muted-foreground mt-0.5">Your assigned leads – follow up, categorize, and transfer interested leads to counsellors.</p>
            </div>
            <Link href="/leads">
              <Button variant="outline" size="sm" className="gap-1">
                View all leads
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>

          {/* Lead filters */}
          <Card className="border-border/60 shadow-sm p-4 mb-4">
            <p className="text-sm font-medium text-muted-foreground mb-3">Filters</p>
            <div className="flex flex-wrap items-center gap-3">
              <Select value={tcStatusFilter || "__all__"} onValueChange={(v) => setTcStatusFilter(v === "__all__" ? "" : v)}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Lead status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">All statuses</SelectItem>
                  <SelectItem value="new">Uncontacted</SelectItem>
                  <SelectItem value="contacted">Contacted</SelectItem>
                  <SelectItem value="qualified">Interested / Qualified</SelectItem>
                  <SelectItem value="converted">Converted</SelectItem>
                </SelectContent>
              </Select>
              <Select value={tcVisaFilter || "__all__"} onValueChange={(v) => setTcVisaFilter(v === "__all__" ? "" : v)}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Visa category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">All categories</SelectItem>
                  {LEAD_VISA_CATEGORIES.map((cat) => (
                    <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={tcSourceFilter || "__all__"} onValueChange={(v) => setTcSourceFilter(v === "__all__" ? "" : v)}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Lead source" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">All sources</SelectItem>
                  {LEAD_SOURCES.map((src) => (
                    <SelectItem key={src} value={src}>{src}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={tcFollowUpFilter || "__all__"} onValueChange={(v) => setTcFollowUpFilter(v === "__all__" ? "" : v)}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Follow-up date" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">Any</SelectItem>
                  <SelectItem value="today">Today&apos;s follow-ups</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="ghost" size="sm" onClick={() => { setTcStatusFilter(""); setTcVisaFilter(""); setTcSourceFilter(""); setTcFollowUpFilter(""); }}>
                Clear filters
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-2">Date range uses the filter above (Today / Weekly / Monthly / Yearly / Custom).</p>
          </Card>

          <Card className="border-border/60 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border/60 bg-muted/50">
                    <th className="text-left font-semibold p-3">Lead name</th>
                    <th className="text-left font-semibold p-3">Phone</th>
                    <th className="text-left font-semibold p-3">Lead source</th>
                    <th className="text-left font-semibold p-3">Visa category</th>
                    <th className="text-left font-semibold p-3">Lead status</th>
                    <th className="text-left font-semibold p-3">Date received</th>
                    <th className="text-left font-semibold p-3">Last activity</th>
                    <th className="text-right font-semibold p-3">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredAssignedLeads.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="p-6 text-center text-muted-foreground">
                        {assignedLeads.length === 0 ? "No leads assigned to you yet." : "No leads match the current filters."}
                      </td>
                    </tr>
                  ) : (
                    filteredAssignedLeads.map((lead) => (
                      <tr key={lead.id} className="border-b border-border/40 hover:bg-muted/20 transition-colors">
                        <td className="p-3 font-medium">
                          <Link href={`/leads/${lead.id}`} className="hover:underline">{lead.name}</Link>
                        </td>
                        <td className="p-3 text-muted-foreground">{lead.phone}</td>
                        <td className="p-3 text-muted-foreground">{lead.source || "—"}</td>
                        <td className="p-3 text-muted-foreground">{lead.visaCategory || "—"}</td>
                        <td className="p-3">
                          <Badge variant="secondary" className="capitalize text-xs">{lead.stage}</Badge>
                        </td>
                        <td className="p-3 text-muted-foreground">{format(new Date(lead.createdAt), "dd MMM yyyy")}</td>
                        <td className="p-3 text-muted-foreground">
                          {lead.lastFollowupAt ? format(new Date(lead.lastFollowupAt), "dd MMM yyyy") : "—"}
                        </td>
                        <td className="p-3 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button variant="ghost" size="sm" className="h-8" asChild>
                              <Link href={`/leads/${lead.id}`}>Follow up</Link>
                            </Button>
                            <Button variant="outline" size="sm" className="h-8" onClick={() => { setTransferLead(lead); setTransferToId(''); }}>
                              Transfer
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </section>

        <Dialog open={!!transferLead} onOpenChange={(open) => !open && setTransferLead(null)}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Transfer lead to counsellor</DialogTitle>
            </DialogHeader>
            {transferLead && (
              <p className="text-sm text-muted-foreground -mt-2">
                Transfer <strong>{transferLead.name}</strong> to a counsellor for follow-up.
              </p>
            )}
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label>Select counsellor</Label>
                <Select value={transferToId} onValueChange={setTransferToId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose counsellor" />
                  </SelectTrigger>
                  <SelectContent>
                    {counsellorOptions.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setTransferLead(null)}>Cancel</Button>
              <Button onClick={handleTransferSubmit} disabled={!transferToId || isTransferring}>
                {isTransferring ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Transfer
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  if (isTechSupport) {
    return <ITSupportKanbanDashboard />;
  }

  return (
    <div className="relative space-y-8 pb-8">
      {isCounsellor ? (
        <canvas
          ref={confettiCanvasRef}
          className="pointer-events-none fixed inset-0 z-[99999] h-[100dvh] w-full max-w-none"
          aria-hidden
        />
      ) : null}
      {/* Header Section */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Dashboard</h1>
          <p className="text-muted-foreground mt-1">
            Welcome back, <span className="font-semibold text-primary">{userProfile?.fullname || user?.name}</span>. Here's what's happening.
          </p>
        </div>

        <div className="flex items-center">
          <DashboardDateFilter
            date={customDateRange}
            onDateChange={setCustomDateRange}
            activeTab={timeFilter === 'today' ? 'Today' : timeFilter === 'weekly' ? 'Weekly' : timeFilter === 'monthly' ? 'Monthly' : timeFilter === 'yearly' ? 'Yearly' : timeFilter === 'custom' ? 'Custom' : 'Today'}
            onTabChange={(tab) => setTimeFilter(tab === 'Today' ? 'today' : tab === 'Custom' ? 'custom' : tab.toLowerCase())}
            showCustom={!isCounsellor}
            showYearly={false}
            align="end"
          />
        </div>
      </div>

      {(user?.role === "superadmin" ||
     user?.role === "developer" ||
        user?.role === "director" ||
        user?.role === "manager" ||
        user?.role === "counsellor") &&
      achieverMarqueeLine ? (
        <div className="crm-target-marquee w-full border border-primary/20 bg-muted/30">
          <div
            className="crm-target-marquee-track text-sm font-medium text-foreground"
            role="region"
            aria-label="Counsellors who achieved their enrollment target"
          >
            <span className="crm-target-marquee-segment">{achieverMarqueeLine}</span>
            <span className="crm-target-marquee-segment" aria-hidden>
              {achieverMarqueeLine}
            </span>
          </div>
        </div>
      ) : null}

      {/* Target & Stats Section */}
      {!canViewFinancials ? (
        <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-3">
          {/* Target Card - Takes 1/3 width */}
          <div className="h-full">
            <Card className="h-full border-none shadow-card bg-gradient-to-br from-primary/5 to-primary/10 rounded-xl overflow-hidden relative flex flex-col justify-center">
              <div className="absolute top-4 right-4 opacity-10">
                <Target className="w-24 h-24 text-primary" />
              </div>
              <CardHeader>
                <CardTitle className="text-lg font-bold text-foreground flex items-center gap-2">
                  <div className="p-2 bg-background/50 backdrop-blur-sm rounded-lg shadow-sm">
                    <Target className="w-5 h-5 text-primary" />
                  </div>
                  Your Target
                </CardTitle>
                <CardDescription>Monthly enrollment goal</CardDescription>
              </CardHeader>
              <CardContent>
                {isLoadingLeaderboard ? (
                  <div className="space-y-6">
                    <div className="flex items-end justify-between relative z-10">
                      <div className="h-16 w-48 bg-muted animate-pulse rounded" />
                      <div className="h-12 w-20 bg-muted animate-pulse rounded" />
                    </div>
                    <div className="h-3 bg-muted animate-pulse rounded" />
                    <div className="h-20 bg-muted animate-pulse rounded-xl" />
                  </div>
                ) : currentUserTarget ? (
                  <div className="space-y-6">
                    <div className="flex items-end justify-between relative z-10">
                      <div>
                        <div className="flex items-baseline gap-2">
                          <span className="text-5xl font-bold text-foreground tracking-tight">{currentUserTarget.achieved || 0}</span>
                          <span className="text-muted-foreground font-medium text-lg">/ {currentUserTarget.target || 0} achieved</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-sm font-medium text-muted-foreground block mb-1">Remaining</span>
                        <div className="text-3xl font-bold text-primary tabular-nums">{remainingTarget}</div>
                      </div>
                    </div>

                    <div className="space-y-2 relative z-10">
                      <Progress value={Math.min(progressPercentage, 100)} className="h-3 bg-background/50" />
                      <p className="text-xs text-muted-foreground text-right font-medium">
                        {progressPercentage.toFixed(0)}% completed
                      </p>
                    </div>

                    <div
                      className={`rounded-xl p-4 text-sm text-foreground backdrop-blur-md border shadow-sm relative z-10 ${
                        hasAchievedTarget(currentUserTarget)
                          ? "bg-emerald-500/10 border-emerald-500/30"
                          : "bg-background/40 border-border/50"
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div
                          className={`p-1.5 rounded-full mt-0.5 ${
                            hasAchievedTarget(currentUserTarget) ? "bg-emerald-500/15" : "bg-primary/10"
                          }`}
                        >
                          <Trophy
                            className={`w-4 h-4 ${
                              hasAchievedTarget(currentUserTarget)
                                ? "text-emerald-600 dark:text-emerald-400"
                                : "text-primary"
                            }`}
                          />
                        </div>
                        <div>
                          {hasAchievedTarget(currentUserTarget) ? (
                            <>
                              <p className="font-bold text-foreground">Congratulations! 🎉</p>
                              <p className="text-muted-foreground text-xs mt-1 leading-relaxed">
                                You&apos;ve achieved your monthly enrollment target. Outstanding work!
                              </p>
                            </>
                          ) : (
                            <>
                              <p className="font-bold text-foreground">Keep it up! 🚀</p>
                              <p className="text-muted-foreground text-xs mt-1 leading-relaxed">
                                You need <span className="font-bold text-primary">{remainingTarget}</span> more enrollments to hit your monthly target.
                              </p>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    No target data available
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Stats - Takes 2/3 width, displayed as 2x2 grid */}
          <div className="lg:col-span-2 grid gap-6 sm:grid-cols-2">
            <StatCard
              title="Total Clients"
              value={getAdjustedValue((stats as any)?.totalClients?.count ?? (stats as any)?.totalClients ?? 0)}
              icon={Users}
              trend={(stats as any)?.totalClients?.change !== undefined ? {
                value: (stats as any)?.totalClients?.change ?? 0,
                isPositive: (stats as any)?.totalClients?.changeType === "increase" || (stats as any)?.totalClients?.changeType === "no-change"
              } : undefined}
              description={`for ${timeFilter}`}
              className="shadow-card hover:shadow-lg transition-shadow border-none h-full"
            />

            <StatCard
              title="Core Sale"
              value={Number((stats as any)?.coreSale?.number ?? 0)}
              secondaryValue={(stats as any)?.coreSale?.amount ? `₹${Number((stats as any)?.coreSale?.amount).toLocaleString('en-IN')}` : undefined}
              icon={CreditCard}
              trend={(stats as any)?.coreSale?.change !== undefined ? {
                value: (stats as any)?.coreSale?.change ?? 0,
                isPositive: (stats as any)?.coreSale?.changeType === "increase" || (stats as any)?.coreSale?.changeType === "no-change"
              } : undefined}
              description="core sales"
              className="shadow-card hover:shadow-lg transition-shadow border-none h-full"
            />

            <StatCard
              title="Core Product"
              value={Number((stats as any)?.coreProduct?.number ?? 0)}
              secondaryValue={(stats as any)?.coreProduct?.amount ? `₹${Number((stats as any)?.coreProduct?.amount).toLocaleString('en-IN')}` : undefined}
              icon={Target}
              trend={(stats as any)?.coreProduct?.change !== undefined ? {
                value: (stats as any)?.coreProduct?.change ?? 0,
                isPositive: (stats as any)?.coreProduct?.changeType === "increase" || (stats as any)?.coreProduct?.changeType === "no-change"
              } : undefined}
              description="core products"
              className="shadow-card hover:shadow-lg transition-shadow border-none h-full"
            />

            <StatCard
              title="Other Product"
              value={Number((stats as any)?.otherProduct?.number ?? 0)}
              secondaryValue={(stats as any)?.otherProduct?.amount ? `₹${Number((stats as any)?.otherProduct?.amount).toLocaleString('en-IN')}` : undefined}
              icon={TrendingUp}
              trend={(stats as any)?.otherProduct?.change !== undefined ? {
                value: (stats as any)?.otherProduct?.change ?? 0,
                isPositive: (stats as any)?.otherProduct?.changeType === "increase" || (stats as any)?.otherProduct?.changeType === "no-change"
              } : undefined}
              description="other products"
              className="shadow-card hover:shadow-lg transition-shadow border-none h-full"
            />

            <StatCard
              title="Total Pending Amount"
              value={`₹${Number((stats as any)?.totalPendingAmount?.amount ?? 0).toLocaleString('en-IN')}`}
              icon={Clock}
              trend={(stats as any)?.totalPendingAmount?.change !== undefined ? {
                value: (stats as any)?.totalPendingAmount?.change ?? 0,
                isPositive: (stats as any)?.totalPendingAmount?.changeType === "increase" || (stats as any)?.totalPendingAmount?.changeType === "no-change"
              } : undefined}
              description="total outstanding"
              className="shadow-card hover:shadow-lg transition-shadow border-l-4 border-l-yellow-500 h-full"
            />
          </div>
        </div>
      ) : (
        /* Admin/Manager View: 6 stats in a grid */
        <div className="grid items-start gap-6 md:grid-cols-2 lg:grid-cols-3">
          <StatCard
            title="Total Clients"
            value={getAdjustedValue((stats as any)?.totalClients?.count ?? 0)}
            icon={UserPlus}
            trend={(stats as any)?.totalClients?.change !== undefined ? {
              value: (stats as any)?.totalClients?.change ?? 0,
              isPositive: (stats as any)?.totalClients?.changeType === "increase" || (stats as any)?.totalClients?.changeType === "no-change"
            } : undefined}
            description={`for ${timeFilter}`}
            className="shadow-card hover:shadow-lg transition-shadow border-none"
          />

          <StatCard
            title="Core Sale"
            value={Number((stats as any)?.coreSale?.number ?? 0)}
            secondaryValue={(stats as any)?.coreSale?.amount ? `₹ ${Number((stats as any)?.coreSale?.amount).toLocaleString('en-IN')}` : undefined}
            icon={CreditCard}
            trend={(stats as any)?.coreSale?.change !== undefined ? {
              value: (stats as any)?.coreSale?.change ?? 0,
              isPositive: (stats as any)?.coreSale?.changeType === "increase" || (stats as any)?.coreSale?.changeType === "no-change"
            } : undefined}
            extra={canViewFinancials && Array.isArray((stats as any)?.saleTypeCategoryCounts) && (stats as any).saleTypeCategoryCounts.length > 0 ? (
              <div className="space-y-1">
                <div className="flex flex-wrap gap-x-3 gap-y-1">
                  {(stats as any).saleTypeCategoryCounts.map((r: any) => (
                    <div key={r.categoryId ?? r.categoryName} className="text-[12px] text-foreground">
                      <span className="capitalize">{r.categoryName ?? "—"}</span>
                      <span className="text-muted-foreground">:</span>{" "}
                      <span className="font-semibold tabular-nums">{Number(r.count ?? 0)}</span>
                    </div>
                  ))} 
                </div>
              </div>
            ) : null}
            className="shadow-card hover:shadow-lg transition-shadow border-none"
          />

          <StatCard
            title="Core Product"
            value={Number((stats as any)?.coreProduct?.number ?? 0)}
            secondaryValue={(stats as any)?.coreProduct?.amount ? `₹ ${Number((stats as any)?.coreProduct?.amount).toLocaleString('en-IN')}` : undefined}
            icon={Target}
            trend={(stats as any)?.coreProduct?.change !== undefined ? {
              value: (stats as any)?.coreProduct?.change ?? 0,
              isPositive: (stats as any)?.coreProduct?.changeType === "increase" || (stats as any)?.coreProduct?.changeType === "no-change"
            } : undefined}
            description="core products"
            className="shadow-card hover:shadow-lg transition-shadow border-none"
          />

          <StatCard
            title="Other Product"
            value={Number((stats as any)?.otherProduct?.number ?? 0)}
            secondaryValue={(stats as any)?.otherProduct?.amount ? `₹ ${Number((stats as any)?.otherProduct?.amount).toLocaleString('en-IN')}` : undefined}
            icon={TrendingUp}
            trend={(stats as any)?.otherProduct?.change !== undefined ? {
              value: (stats as any)?.otherProduct?.change ?? 0,
              isPositive: (stats as any)?.otherProduct?.changeType === "increase" || (stats as any)?.otherProduct?.changeType === "no-change"
            } : undefined}
            extra={canViewFinancials && Array.isArray((stats as any)?.otherProductBreakdown) && (stats as any).otherProductBreakdown.length > 0 ? (
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <p className="text-xs text-muted-foreground">other products</p>
                  {((stats as any).otherProductBreakdown as any[]).length > 5 ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => setShowAllOtherProductBreakdown((v) => !v)}
                      title={showAllOtherProductBreakdown ? "Hide" : "Show all"}
                    >
                      {showAllOtherProductBreakdown ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </Button>
                  ) : null}
                </div>
                {showAllOtherProductBreakdown ? (
                  <>
                    <p className="text-[11px] text-muted-foreground">Breakdown</p>
                    <div className="space-y-1.5 max-h-28 overflow-y-auto pr-1">
                      {((stats as any).otherProductBreakdown as any[]).map((r: any) => (
                        <div key={r.key ?? r.name} className="flex items-center justify-between gap-2 text-[12px]">
                          <span className="text-foreground truncate">
                            {String(r.name ?? "—").replace(/_/g, " ")}
                          </span>
                          <span className="text-muted-foreground whitespace-nowrap tabular-nums">
                            {Number(r.count ?? 0)} • ₹ {Number(r.amount ?? 0).toLocaleString('en-IN')}
                          </span>
                        </div>
                      ))}
                    </div>
                  </>
                ) : null}
              </div>
            ) : (
              <div className="text-xs text-muted-foreground">other products</div>
            )}
            className="shadow-card hover:shadow-lg transition-shadow border-none"
          />

          <StatCard
            title="Total Pending Amount"
            value={`₹ ${Number((stats as any)?.totalPendingAmount?.amount ?? 0).toLocaleString('en-IN')}`}
            icon={Clock}
            trend={(stats as any)?.totalPendingAmount?.change !== undefined ? {
              value: (stats as any)?.totalPendingAmount?.change ?? 0,
              isPositive: (stats as any)?.totalPendingAmount?.changeType === "increase" || (stats as any)?.totalPendingAmount?.changeType === "no-change"
            } : undefined}
            className="shadow-card hover:shadow-lg transition-shadow border-l-4 border-l-yellow-500"
          />

          {(stats as any)?.revenue && (
            <Link
              href={isCounsellor ? "/reports/counsellor/me" : "/reports"}
              className="block cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-lg"
            >
              <StatCard
                title="Revenue"
                value={`₹ ${Number((stats as any)?.revenue?.amount ?? 0).toLocaleString('en-IN')}`}
                icon={IndianRupee}
                trend={(stats as any)?.revenue?.change !== undefined ? {
                  value: (stats as any)?.revenue?.change ?? 0,
                  isPositive: (stats as any)?.revenue?.changeType === "increase" || (stats as any)?.revenue?.changeType === "no-change"
                } : undefined}  
                className="shadow-card hover:shadow-lg transition-shadow border-none cursor-pointer"
              />
            </Link>
          )}
        </div>
      )}

      {/* Main Content Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-7">
        {/* Show RevenueChart for Admin/Manager OR Counsellor when chartData is available */}
        {((canViewFinancials && ((stats as any)?.revenueOverview || (stats as any)?.chartData)) ||
          (isCounsellor && (stats as any)?.chartData)) ? (
          <RevenueChart

            className="shadow-card"
            monthlyRevenue={(stats as any)?.revenueOverview || []}
            chartData={(stats as any)?.chartData ?? undefined}
            range={timeFilter === 'today' ? 'today' : timeFilter === 'weekly' ? 'week' : timeFilter === 'monthly' ? 'month' : timeFilter === 'yearly' ? 'year' : timeFilter === 'custom' ? 'month' : 'today'}
            title={isCounsellor ? "Individual Performance" : undefined}
            rangeLabel={revenueChartRangeLabel}
          />
        ) : isCounsellor && teamPerformanceData.length > 0 ? (
          <Card className="col-span-4 border-none shadow-card bg-card rounded-xl overflow-hidden">
            <CardHeader>
              <CardTitle className="text-lg font-bold text-foreground">Team Performance</CardTitle>
              <CardDescription>Your enrollment performance across different time periods</CardDescription>
            </CardHeader>
            <CardContent className="pl-2">
              <ResponsiveContainer width="100%" height={350}>
                <BarChart data={teamPerformanceData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.1} />
                  <XAxis
                    dataKey="period"
                    stroke="#888888"
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                    angle={-45}
                    textAnchor="end"
                    height={80}
                  />
                  <YAxis
                    stroke="#888888"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip
                    cursor={{ fill: 'rgba(0, 0, 0, 0.05)' }}
                    contentStyle={{
                      borderRadius: '12px',
                      border: 'none',
                      boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
                      backgroundColor: 'hsl(var(--card))',
                      color: 'hsl(var(--card-foreground))'
                    }}
                    formatter={(value: any, name: string) => {
                      return [value, name === 'current' ? 'Current' : 'Previous'];
                    }}
                    labelFormatter={(label: string) => {
                      const item = teamPerformanceData.find((d: any) => d.period === label);
                      if (item) {
                        const changeType = item.changeType || 'no-change';
                        const change = item.change || 0;
                        const sign = changeType === 'increase' ? '+' : changeType === 'decrease' ? '-' : '';
                        const changeColor = changeType === 'increase' ? '#22c55e' : changeType === 'decrease' ? '#ef4444' : '#888';
                        return (
                          <div>
                            <div>{label}</div>
                            <div style={{ fontSize: '11px', color: changeColor, marginTop: '4px' }}>
                              {sign}{change}% {changeType === 'increase' ? '↑' : changeType === 'decrease' ? '↓' : '→'}
                            </div>
                          </div>
                        );
                      }
                      return label;
                    }}
                  />
                  <Bar
                    dataKey="current"
                    name="Current"
                    fill="hsl(var(--primary))"
                    radius={[6, 6, 0, 0]}
                  />
                  <Bar
                    dataKey="previous"
                    name="Previous"
                    fill="hsl(var(--muted-foreground))"
                    radius={[6, 6, 0, 0]}
                    opacity={0.7}
                  />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        ) : !isCounsellor ? (
          <Card className="col-span-4 border-none shadow-card bg-card rounded-xl overflow-hidden">
            <CardHeader>
              <CardTitle className="text-lg font-bold text-foreground">Team Performance</CardTitle>
              <CardDescription>Monthly client enrollment trends</CardDescription>
            </CardHeader>
            <CardContent className="pl-2">
              <ResponsiveContainer width="100%" height={350}>
                <BarChart data={chartData}>
                  <XAxis
                    dataKey="name"
                    stroke="#888888"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    stroke="#888888"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip
                    cursor={{ fill: 'transparent' }}
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)', backgroundColor: 'hsl(var(--card))', color: 'hsl(var(--card-foreground))' }}
                  />
                  <Bar dataKey="total" name="Enrollments" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        ) : null}

        {/* Leaderboard Card - Replaces Recent Clients */}
        <Card className="col-span-3 border-none shadow-card bg-card rounded-xl overflow-hidden">
          <CardHeader>
            <CardTitle className="text-lg font-bold text-foreground flex items-center gap-2">
              <Trophy className="w-5 h-5 text-yellow-500" />
              {user?.role === "manager" || user?.role === "superadmin"|| user?.role === "developer" || user?.role === "director" ? (
                <button
                  type="button"
                  onClick={() => setLocation("/counsellor-leaderboard")}
                  className="text-left cursor-pointer transition-colors hover:text-primary"
                >
                  {canViewFinancials ? "Performance Leaderboard" : "Counselor Leaderboard"}
                </button>
              ) : (
                <span>{canViewFinancials ? "Performance Leaderboard" : "Counselor Leaderboard"}</span>
              )}
            </CardTitle>
            <CardDescription>Top performing {canViewFinancials ? "team members" : "counselors"} this month</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {(isLoadingLeaderboard || isLoadingManagerTargets) ? (
              <div className="space-y-4 p-6">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="flex items-center p-3 rounded-lg">
                    <div className="h-10 w-10 rounded-full bg-muted animate-pulse mr-3" />
                    <div className="flex-1">
                      <div className="h-4 w-24 bg-muted animate-pulse rounded mb-2" />
                      <div className="h-3 w-16 bg-muted animate-pulse rounded" />
                    </div>
                    <div className="h-4 w-8 bg-muted animate-pulse rounded" />
                  </div>
                ))}
              </div>
            ) : (
              <>
              <div className="max-h-[500px] overflow-y-auto p-4 space-y-1">
                {/* ── Manager rows first ── */}
                {showManagerTargets && managerTargetsList.map((row: any) => {
                  const apiAchieved = row.achieved;
                  // Supervisor managers oversee all counsellors; their target is company-wide.
                  // The manager-targets API only aggregates direct-report counsellors, so use
                  // dashboard stats (which already scopes to the supervisor's full team) instead.
                  const a = (isSupervisorManager && managerTargetsList.length === 1)
                    ? {
                        coreSale: {
                          clients: Number((stats as any)?.coreSale?.number ?? apiAchieved?.coreSale?.clients ?? 0),
                          revenue: parseFloat(String((stats as any)?.coreSale?.amount ?? "0")) || (apiAchieved?.coreSale?.revenue ?? 0),
                        },
                        coreProduct: {
                          clients: Number((stats as any)?.coreProduct?.number ?? apiAchieved?.coreProduct?.clients ?? 0),
                          revenue: parseFloat(String((stats as any)?.coreProduct?.amount ?? "0")) || (apiAchieved?.coreProduct?.revenue ?? 0),
                        },
                        otherProduct: {
                          clients: Number((stats as any)?.otherProduct?.number ?? apiAchieved?.otherProduct?.clients ?? 0),
                          revenue: parseFloat(String((stats as any)?.otherProduct?.amount ?? "0")) || (apiAchieved?.otherProduct?.revenue ?? 0),
                        },
                      }
                    : apiAchieved;
                  const totalRevenue =
                    (a?.coreSale?.revenue ?? 0) +
                    (a?.coreProduct?.revenue ?? 0) +
                    (a?.otherProduct?.revenue ?? 0);
                  const totalClients =
                    (a?.coreSale?.clients ?? 0) +
                    (a?.coreProduct?.clients ?? 0) +
                    (a?.otherProduct?.clients ?? 0);
                  const totalTargetClients =
                    (row.core_sale_target_clients ?? 0) +
                    (row.core_product_target_clients ?? 0) +
                    (row.other_product_target_clients ?? 0);
                  const overallProgress =
                    totalTargetClients > 0 ? (totalClients / totalTargetClients) * 100 : 0;
                  const rowId: number = row.id ?? row.manager_id;
                  const isExpanded = expandedManagerIds.has(rowId);
                  const managerIds = row.manager_ids?.length ? row.manager_ids : [row.manager_id];
                  const managerName = isManagerRoleUser
                    ? (userProfile?.fullname || user?.name || `Manager #${row.manager_id}`)
                    : managerIds
                        .map(
                          (mid: number) =>
                            managersListData?.find((m: any) => (m.id ?? m.userId) === mid)?.name ||
                            managersListData?.find((m: any) => (m.id ?? m.userId) === mid)?.fullName ||
                            `Manager #${mid}`
                        )
                        .join(", ");
                  const fmtRev = (v: string | number) => {
                    const n = typeof v === "string" ? parseFloat(v) || 0 : v;
                    return `₹${n.toLocaleString("en-IN")}`;
                  };
                  return (
                    <div key={rowId} className="rounded-lg overflow-hidden">
                      <button
                        type="button"
                        className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors text-left"
                        onClick={() =>
                          setExpandedManagerIds((prev) => {
                            const next = new Set(prev);
                            if (next.has(rowId)) next.delete(rowId);
                            else next.add(rowId);
                            return next;
                          })
                        }
                      >
                        <div className="relative flex-shrink-0">
                          <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold text-sm border-2 border-background shadow-sm">
                            {managerName.charAt(0).toUpperCase()}
                          </div>
                          <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center bg-primary/20 border-2 border-background shadow-sm">
                            <Target className="w-2.5 h-2.5 text-primary" />
                          </div>
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-3">
                            <p className="text-sm font-semibold truncate text-foreground">{managerName}</p>
                            <span className="text-xs text-muted-foreground shrink-0 tabular-nums">
                              Target:{" "}
                              <span className="font-medium text-foreground">
                                {totalClients} / {totalTargetClients}
                              </span>
                            </span>
                          </div>
                          <div className="mt-1.5 flex items-center gap-2 min-w-0">
                            <Progress value={Math.min(100, overallProgress)} className="h-2 flex-1 min-w-0" indicatorClassName="bg-primary" />
                            <div className="flex items-center gap-1 shrink-0">
                              <span className={`text-xs font-semibold tabular-nums w-10 text-right ${overallProgress >= 100 ? "text-green-600" : "text-muted-foreground"}`}>
                                {overallProgress.toFixed(1)}%
                              </span>
                              {isExpanded
                                ? <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" />
                                : <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                              }
                            </div>
                          </div>
                        </div>
                      </button>
                      {isExpanded && (
                        <div className="mx-3 mb-2 px-3 pb-3 pt-3 space-y-3 rounded-lg bg-muted/30 border border-border/40">
                          <div className="flex items-stretch rounded-lg overflow-hidden bg-background/70 divide-x divide-border/50">
                            {[
                              { label: "Core sale", v: a?.coreSale?.clients ?? 0, t: row.core_sale_target_clients ?? 0 },
                              { label: "Core product", v: a?.coreProduct?.clients ?? 0, t: row.core_product_target_clients ?? 0 },
                              { label: "Other product", v: a?.otherProduct?.clients ?? 0, t: row.other_product_target_clients ?? 0 },
                            ].map(({ label, v, t }) => (
                              <div key={label} className="flex flex-col items-center justify-center flex-1 py-2 px-1">
                                <span className="text-sm font-bold tabular-nums">
                                  {v}<span className="text-muted-foreground font-normal text-xs">/{t}</span>
                                </span>
                                <span className="text-[10px] text-muted-foreground mt-0.5">{label}</span>
                              </div>
                            ))}
                          </div>
                          {[
                            { label: "Core sale revenue", target: row.core_sale_target_revenue, achieved: a?.coreSale?.revenue ?? 0, color: "bg-blue-500", textColor: "text-blue-600" },
                            { label: "Core product revenue", target: row.core_product_target_revenue, achieved: a?.coreProduct?.revenue ?? 0, color: "bg-emerald-500", textColor: "text-emerald-600" },
                            { label: "Other product revenue", target: row.other_product_target_revenue, achieved: a?.otherProduct?.revenue ?? 0, color: "bg-amber-500", textColor: "text-amber-600" },
                            { label: "Overall revenue", target: row.overall, achieved: totalRevenue, color: "bg-indigo-500", textColor: "text-indigo-600" },
                          ].map(({ label, target, achieved, color, textColor }) => {
                            const targetRev = parseFloat(String(target ?? "0")) || 0;
                            const pct = targetRev > 0 ? (achieved / targetRev) * 100 : 0;
                            const remaining = Math.max(0, targetRev - achieved);
                            return (
                              <div key={label} className="space-y-1">
                                <div className="flex items-center justify-between gap-2">
                                  <span className="text-xs text-muted-foreground">{label}</span>
                                  <span className={`text-xs font-semibold tabular-nums ${textColor}`}>{Math.round(pct)}%</span>
                                </div>
                                <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
                                  <span>Achieved: <span className="font-medium text-foreground">{fmtRev(achieved)}</span></span>
                                  <span>Remaining: <span className="font-medium text-foreground">{fmtRev(remaining)}</span></span>
                                </div>
                                <Progress value={Math.min(100, pct)} className="h-1.5" indicatorClassName={color} />
                                <div className="text-xs text-muted-foreground">Target: {fmtRev(targetRev)}</div>
                              </div>
                            );
                          })}
                          <div className="space-y-1 pt-1 border-t border-border/40">
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-xs text-muted-foreground">Overall progress (clients)</span>
                              <span className="text-xs font-semibold text-primary tabular-nums">{Math.round(overallProgress)}%</span>
                            </div>
                            <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
                              <span>Achieved: <span className="font-medium text-foreground">{totalClients}</span> clients</span>
                              <span>Remaining: <span className="font-medium text-foreground">{Math.max(0, totalTargetClients - totalClients)}</span> clients</span>
                            </div>
                            <Progress value={Math.min(100, overallProgress)} className="h-1.5" indicatorClassName="bg-violet-500" />
                            <div className="text-xs text-muted-foreground tabular-nums">Target: {totalTargetClients} clients</div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}

                {/* ── Thin divider between managers and counsellors ── */}
                {showManagerTargets && managerTargetsList.length > 0 && leaderboardForDisplay.length > 0 && (
                  <div className="flex items-center gap-2 py-2">
                    <div className="flex-1 h-px bg-border/50" />
                    <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Counsellors</span>
                    <div className="flex-1 h-px bg-border/50" />
                  </div>
                )}

                {/* ── Counsellor rows ── */}
                {leaderboardForDisplay.length === 0 && !(showManagerTargets && managerTargetsList.length > 0) ? (
                  <div className="text-center py-8 text-muted-foreground">No leaderboard data available</div>
                ) : (
                  leaderboardForDisplay.map((counselor: any, index: number) => {
                    const isHighlighted = counselor.isCurrentUser;
                    const counsellorId = (counselor as any).counsellorId;
                    const targetValue = Number(counselor.target) || 0;
                    const achievedValue = Number(counselor.achieved) || 0;
                    const rowProgress = targetValue > 0 ? Math.min((achievedValue / targetValue) * 100, 100) : 0;
                    const canOpenReport = canViewFinancials && counsellorId != null;
                    const reportHref = canOpenReport ? `/reports/counsellor/${counsellorId}` : null;

                    const rowContent = (
                      <div className="flex items-start gap-3 w-full min-w-0">
                        <div className="relative flex-shrink-0">
                          <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center text-muted-foreground font-semibold text-sm border-2 border-background shadow-sm">
                            {counselor.avatar}
                          </div>
                          <div
                            className={`absolute -top-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold border-2 border-background shadow-sm
                              ${index === 0 ? "bg-yellow-400 text-yellow-900" :
                                index === 1 ? "bg-slate-300 text-slate-900" :
                                  index === 2 ? "bg-orange-300 text-orange-900" : "bg-muted text-muted-foreground"}`}
                          >
                            {index === 0 ? <Medal className="w-3 h-3" /> : index + 1}
                          </div>
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-3">
                            <p className={`text-sm font-semibold truncate ${isHighlighted ? "text-primary" : "text-foreground"}`}>
                              {counselor.name} {isHighlighted && "(You)"}
                            </p>
                            <span className="text-xs text-muted-foreground shrink-0 tabular-nums">
                              Target:{" "}
                              <span className="font-medium text-foreground">
                                {counselor.achieved} / {counselor.target}
                              </span>
                            </span>
                          </div>
                          <div className="mt-1.5 flex items-center gap-2 min-w-0">
                            <Progress value={rowProgress} className="h-2 flex-1 min-w-0" />
                            <span className={`text-xs font-semibold tabular-nums shrink-0 w-11 text-right ${rowProgress >= 100 ? "text-green-600" : "text-muted-foreground"}`}>
                              {rowProgress.toFixed(1)}%
                            </span>
                          </div>
                        </div>
                      </div>
                    );

                    if (canOpenReport) {
                      return (
                        <Link
                          key={counsellorId ?? index}
                          href={reportHref!}
                          className={`block flex items-start p-3 rounded-lg transition-all cursor-pointer ${isHighlighted
                              ? "bg-primary/10 border-2 border-primary/30 shadow-md ring-2 ring-primary/20"
                              : "hover:bg-muted/50"
                            }`}
                        >
                          {rowContent}
                        </Link>
                      );
                    }
                    return (
                      <div
                        key={counsellorId ?? index}
                        className={`flex items-start p-3 rounded-lg transition-all ${isHighlighted
                            ? "bg-primary/10 border-2 border-primary/30 shadow-md ring-2 ring-primary/20"
                            : ""
                          }`}
                      >
                        {rowContent}
                      </div>
                    );
                  })
                )}
              </div>
              {/* Total counsellor target footer */}
              {leaderboardForDisplay.length > 0 && (() => {
                const totalTarget = leaderboardForDisplay.reduce((s: number, c: any) => s + (Number(c.target) || 0), 0);
                const totalAchieved = leaderboardForDisplay.reduce((s: number, c: any) => s + (Number(c.achieved) || 0), 0);
                return (
                  <div className="flex items-center justify-between gap-4 px-6 py-4 border-t bg-muted/30 rounded-b-xl">
                    <div>
                      <p className="text-xs text-muted-foreground">Total target</p>
                      <p className="text-lg font-bold text-foreground">{totalTarget}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-muted-foreground">Total achieved (enrolled)</p>
                      <p className="text-lg font-bold text-foreground">{totalAchieved}</p>
                    </div>
                  </div>
                );
              })()}
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Manager Targets Section — now integrated into leaderboard card above */}
      {showManagerTargets && false && (
        <Card className="border-none shadow-card bg-card rounded-xl overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
            <div>
              <CardTitle className="text-lg font-bold text-foreground flex items-center gap-2">
                <Target className="w-5 h-5 text-primary" />
                {isManagerRoleUser ? "Your Targets" : "Manager Targets"}
              </CardTitle>
              <CardDescription className="mt-1">
                {isManagerRoleUser
                  ? "Your performance against set targets"
                  : "Manager performance against set targets"}
              </CardDescription>
            </div>
            {!isManagerRoleUser && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setLocation("/manager-leaderboard")}
                className="gap-2 shrink-0"
              >
                <Trophy className="w-4 h-4" />
                View Full Leaderboard
              </Button>
            )}
          </CardHeader>
          <CardContent>
            {isLoadingManagerTargets ? (
              <div className="space-y-4">
                {[1, 2].map((i) => (
                  <div key={i} className="p-4 rounded-lg border bg-muted/30 animate-pulse space-y-3">
                    <div className="h-5 w-48 bg-muted rounded" />
                    <div className="h-2 bg-muted rounded" />
                    <div className="h-2 bg-muted rounded" />
                    <div className="h-2 bg-muted rounded" />
                  </div>
                ))}
              </div>
            ) : managerTargetsList.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No manager targets set
              </div>
            ) : (
              <div className="space-y-4">
                {managerTargetsList.map((row: any) => {
                  const a = row.achieved;
                  const totalRevenue =
                    (a?.coreSale?.revenue ?? 0) +
                    (a?.coreProduct?.revenue ?? 0) +
                    (a?.otherProduct?.revenue ?? 0);
                  const totalClients =
                    (a?.coreSale?.clients ?? 0) +
                    (a?.coreProduct?.clients ?? 0) +
                    (a?.otherProduct?.clients ?? 0);
                  const totalTargetClients =
                    (row.core_sale_target_clients ?? 0) +
                    (row.core_product_target_clients ?? 0) +
                    (row.other_product_target_clients ?? 0);
                  const overallProgress =
                    totalTargetClients > 0 ? (totalClients / totalTargetClients) * 100 : 0;
                  const fmtRev = (v: string | number) => {
                    const n = typeof v === "string" ? parseFloat(v) || 0 : v;
                    return `₹${n.toLocaleString("en-IN")}`;
                  };

                  const managerIds = row.manager_ids?.length ? row.manager_ids : [row.manager_id];
                  const managerName = isManagerRoleUser
                    ? (userProfile?.fullname || user?.name || `Manager #${row.manager_id}`)
                    : managerIds
                        .map(
                          (mid: number) =>
                            managersListData?.find((m: any) => (m.id ?? m.userId) === mid)?.name ||
                            managersListData?.find((m: any) => (m.id ?? m.userId) === mid)?.fullName ||
                            `Manager #${mid}`
                        )
                        .join(", ");

                  let dateLabel = "";
                  if (row.start_date && row.end_date) {
                    try {
                      dateLabel = `${format(parseISO(row.start_date), "d MMM yyyy")} – ${format(parseISO(row.end_date), "d MMM yyyy")}`;
                    } catch {
                      dateLabel = `${row.start_date} – ${row.end_date}`;
                    }
                  }

                  return (
                    <div
                      key={row.id ?? `${row.manager_id}-${row.start_date}`}
                      className="flex flex-col gap-4 p-4 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center text-muted-foreground font-semibold text-sm border border-border shrink-0">
                            {managerName.charAt(0).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <div className="font-semibold truncate">{managerName}</div>
                            {dateLabel && (
                              <div className="text-xs text-muted-foreground">{dateLabel}</div>
                            )}
                          </div>
                        </div>
                        <div className="grid grid-cols-3 gap-2 w-full sm:w-auto sm:flex-1 text-center">
                          <div className="flex flex-col justify-center p-2 rounded-lg bg-muted/30">
                            <div className="text-base font-bold tabular-nums">
                              {a?.coreSale?.clients ?? 0}
                              <span className="text-muted-foreground font-normal text-xs">/{row.core_sale_target_clients ?? 0}</span>
                            </div>
                            <div className="text-xs text-muted-foreground">Core sale</div>
                          </div>
                          <div className="flex flex-col justify-center p-2 rounded-lg bg-muted/30">
                            <div className="text-base font-bold tabular-nums">
                              {a?.coreProduct?.clients ?? 0}
                              <span className="text-muted-foreground font-normal text-xs">/{row.core_product_target_clients ?? 0}</span>
                            </div>
                            <div className="text-xs text-muted-foreground">Core product</div>
                          </div>
                          <div className="flex flex-col justify-center p-2 rounded-lg bg-muted/30">
                            <div className="text-base font-bold tabular-nums">
                              {a?.otherProduct?.clients ?? 0}
                              <span className="text-muted-foreground font-normal text-xs">/{row.other_product_target_clients ?? 0}</span>
                            </div>
                            <div className="text-xs text-muted-foreground">Other product</div>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-3 border-t pt-3">
                        {(() => {
                          const targetRev = parseFloat(String(row.core_sale_target_revenue ?? "0")) || 0;
                          const achievedRev = a?.coreSale?.revenue ?? 0;
                          const pct = targetRev > 0 ? (achievedRev / targetRev) * 100 : 0;
                          const remaining = Math.max(0, targetRev - achievedRev);
                          return (
                            <div className="space-y-1">
                              <div className="flex items-center justify-between gap-2">
                                <span className="text-xs text-muted-foreground">Core sale revenue</span>
                                <span className="text-xs font-semibold text-blue-600 tabular-nums">{Math.round(pct)}%</span>
                              </div>
                              <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
                                <span>Achieved: <span className="font-medium text-foreground">{fmtRev(achievedRev)}</span></span>
                                <span>Remaining: <span className="font-medium text-foreground">{fmtRev(remaining)}</span></span>
                              </div>
                              <Progress value={Math.min(100, pct)} className="h-2" indicatorClassName="bg-blue-500" />
                              <div className="text-xs text-muted-foreground">Target: {fmtRev(targetRev)}</div>
                            </div>
                          );
                        })()}
                        {(() => {
                          const targetRev = parseFloat(String(row.core_product_target_revenue ?? "0")) || 0;
                          const achievedRev = a?.coreProduct?.revenue ?? 0;
                          const pct = targetRev > 0 ? (achievedRev / targetRev) * 100 : 0;
                          const remaining = Math.max(0, targetRev - achievedRev);
                          return (
                            <div className="space-y-1">
                              <div className="flex items-center justify-between gap-2">
                                <span className="text-xs text-muted-foreground">Core product revenue</span>
                                <span className="text-xs font-semibold text-emerald-600 tabular-nums">{Math.round(pct)}%</span>
                              </div>
                              <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
                                <span>Achieved: <span className="font-medium text-foreground">{fmtRev(achievedRev)}</span></span>
                                <span>Remaining: <span className="font-medium text-foreground">{fmtRev(remaining)}</span></span>
                              </div>
                              <Progress value={Math.min(100, pct)} className="h-2" indicatorClassName="bg-emerald-500" />
                              <div className="text-xs text-muted-foreground">Target: {fmtRev(targetRev)}</div>
                            </div>
                          );
                        })()}
                        {(() => {
                          const targetRev = parseFloat(String(row.other_product_target_revenue ?? "0")) || 0;
                          const achievedRev = a?.otherProduct?.revenue ?? 0;
                          const pct = targetRev > 0 ? (achievedRev / targetRev) * 100 : 0;
                          const remaining = Math.max(0, targetRev - achievedRev);
                          return (
                            <div className="space-y-1">
                              <div className="flex items-center justify-between gap-2">
                                <span className="text-xs text-muted-foreground">Other product revenue</span>
                                <span className="text-xs font-semibold text-amber-600 tabular-nums">{Math.round(pct)}%</span>
                              </div>
                              <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
                                <span>Achieved: <span className="font-medium text-foreground">{fmtRev(achievedRev)}</span></span>
                                <span>Remaining: <span className="font-medium text-foreground">{fmtRev(remaining)}</span></span>
                              </div>
                              <Progress value={Math.min(100, pct)} className="h-2" indicatorClassName="bg-amber-500" />
                              <div className="text-xs text-muted-foreground">Target: {fmtRev(targetRev)}</div>
                            </div>
                          );
                        })()}
                        {(() => {
                          const targetRev = parseFloat(String(row.overall ?? "0")) || 0;
                          const achievedRev = totalRevenue;
                          const pct = targetRev > 0 ? (achievedRev / targetRev) * 100 : 0;
                          const remaining = Math.max(0, targetRev - achievedRev);
                          return (
                            <div className="space-y-1">
                              <div className="flex items-center justify-between gap-2">
                                <span className="text-xs text-muted-foreground">Overall revenue</span>
                                <span className="text-xs font-semibold text-indigo-600 tabular-nums">{Math.round(pct)}%</span>
                              </div>
                              <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
                                <span>Achieved: <span className="font-medium text-foreground">{fmtRev(achievedRev)}</span></span>
                                <span>Remaining: <span className="font-medium text-foreground">{fmtRev(remaining)}</span></span>
                              </div>
                              <Progress value={Math.min(100, pct)} className="h-2" indicatorClassName="bg-indigo-500" />
                              <div className="text-xs text-muted-foreground">Target: {fmtRev(targetRev)}</div>
                            </div>
                          );
                        })()}
                        <div className="space-y-1 border-t pt-2">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-xs text-muted-foreground">Overall progress (clients)</span>
                            <span className="text-xs font-semibold text-primary tabular-nums">{Math.round(overallProgress)}%</span>
                          </div>
                          <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
                            <span>Achieved: <span className="font-medium text-foreground">{totalClients}</span> clients</span>
                            <span>Remaining: <span className="font-medium text-foreground">{Math.max(0, totalTargetClients - totalClients)}</span> clients</span>
                          </div>
                          <Progress value={Math.min(100, overallProgress)} className="h-2" indicatorClassName="bg-violet-500" />
                          <div className="text-xs text-muted-foreground tabular-nums">Target: {totalTargetClients} clients</div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Bottom Section */}
      {/* <div className="grid grid-cols-1">
        <Card className="border-none shadow-card bg-card rounded-xl overflow-hidden">
          <CardHeader className="px-6 py-5 border-b border-border/40">
            <CardTitle className="text-lg font-bold text-foreground flex items-center gap-2">
              {canViewFinancials ? <TrendingUp className="w-5 h-5 text-primary" /> : <Users className="w-5 h-5 text-primary" />}
              {canViewFinancials ? "Counselor Performance" : "Recent Clients"}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
             {canViewFinancials ? (
               <DataTable
                 data={counselorRevenue}
                 onRowClick={(counselor) => {
                    // Navigate to Reports page with counselor pre-selected using wouter to avoid reload
                    setLocation(`/reports?counselor=${encodeURIComponent(counselor.name)}`);
                 }}
                 columns={[
                   {
                     header: "Counselor",
                     accessorKey: "name",
                     cell: (item: any) => (
                       <div className="flex items-center gap-3">
                         <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center text-muted-foreground font-semibold text-xs border border-border">
                           {item.avatar}
                         </div>
                         <div className="font-semibold text-foreground">{item.name}</div>
                       </div>
                     )
                   },
                   {
                     header: "Clients",
                     accessorKey: "clients",
                     cell: (item: any) => (
                       <div className="text-muted-foreground font-medium">{item.clients} Active Cases</div>
                     )
                   },
                   {
                     header: "Revenue",
                     accessorKey: "revenue",
                     cell: (item: any) => (
                       <div className="font-mono font-medium text-foreground">₹{item.revenue.toLocaleString('en-IN')}</div>
                     )
                   },
                   {
                      header: "",
                      cell: () => (
                          <div className="text-right">
                              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                  <ArrowRight className="h-4 w-4 text-muted-foreground" />
                              </Button>
                          </div>
                      )
                   }
                 ]}
               />
             ) : (
               <DataTable
                 data={Array.isArray(recentClients) ? recentClients.slice(0, 5) : []}
                 onRowClick={(client) => setLocation(`/clients/${client.id}`)}
                 columns={[
                   {
                     header: "Client",
                     accessorKey: "name",
                     cell: (client: Client) => (
                       <div className="font-semibold text-foreground">{client.name}</div>
                     )
                   },
                   {
                     header: "Date",
                     accessorKey: "enrollmentDate",
                     cell: (client: Client) => (
                       <div className="text-muted-foreground">{new Date(client.enrollmentDate).toLocaleDateString()}</div>
                     )
                   },
                   {
                     header: "Amount",
                     accessorKey: "amountReceived",
                     cell: (client: Client) => (
                       <div className="font-mono font-medium text-foreground">₹{client.amountReceived?.toLocaleString('en-IN')}</div>
                     )
                   },
                   {
                     header: "Stage",
                     accessorKey: "status",
                     cell: (client: Client) => {
                       const stage: string = client.stage || 'N/A';

                       // If stage is N/A, show it with gray styling
                       if (stage === 'N/A') {
                         return (
                           <Badge variant="outline" className="font-medium border-0 bg-gray-50 text-gray-500 border-gray-200 dark:bg-gray-900/30 dark:text-gray-400 dark:border-gray-800">
                             N/A
                           </Badge>
                         );
                       }

                       // Normalize display name
                       const displayStage = stage === 'After Visa Payment' ? 'After Visa' :
                                           stage === 'Visa Submitted' ? 'Submitted Visa' : stage;

                       return (
                         <Badge variant="outline" className={`
                           font-medium border-0
                           ${stage === 'Initial' ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' : ''}
                           ${stage === 'Financial' ? 'bg-purple-50 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300' : ''}
                           ${stage === 'Before Visa' ? 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300' : ''}
                           ${stage === 'After Visa' || stage === 'After Visa Payment' ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300' : ''}
                           ${stage === 'Submitted Visa' || stage === 'Visa Submitted' ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-800' : ''}
                         `}>
                           {displayStage}
                         </Badge>
                       );
                     }
                   },
                   {
                      header: "",
                      cell: () => (
                          <div className="text-right">
                              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                  <span className="sr-only">Open menu</span>
                                  <ArrowUpRight className="h-4 w-4 text-muted-foreground" />
                              </Button>
                          </div>
                      )
                   }
                 ]}
               />
             )}
          </CardContent>
        </Card>
      </div> */}
    </div>
  );
}
