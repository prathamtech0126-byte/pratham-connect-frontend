import { PageWrapper } from "@/layout/PageWrapper";
import { StatCard } from "@/components/cards/StatCard";
import { Users, DollarSign, Clock, CreditCard, TrendingUp, UserPlus, ShieldAlert, Activity, ArrowUpRight, ArrowRight, Target, Trophy, Medal, Calendar, CheckCircle2, XCircle, Loader2, IndianRupee } from "lucide-react";
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
import { useState, useMemo, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";

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

import { format } from "date-fns";
import { RevenueChart } from "@/components/charts/RevenueChart";
import { DashboardDateFilter } from "@/components/dashboard/DashboardDateFilter";

const counselorRevenue = [
  { name: "Priya Singh", revenue: 1250000, clients: 12, avatar: "P" },
  { name: "Amit Kumar", revenue: 980000, clients: 8, avatar: "A" },
  { name: "Sarah Jones", revenue: 750000, clients: 5, avatar: "S" },
  { name: "Mike Brown", revenue: 450000, clients: 3, avatar: "M" },
  { name: "Rahul Verma", revenue: 320000, clients: 2, avatar: "R" },
];


export default function Dashboard() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const { socket, isConnected } = useSocket();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [selectedBranch, setSelectedBranch] = useState("all");
  const [timeFilter, setTimeFilter] = useState("monthly");
  const [customDateRange, setCustomDateRange] = useState<[Date | null, Date | null]>([null, null]);

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
      const d = String(now.getDate()).padStart(2, '0');
      params.beforeDate = `${y}-${m}-${d}`; // today
      const lastMonth = new Date(y, now.getMonth() - 1, now.getDate());
      const ly = lastMonth.getFullYear();
      const lm = String(lastMonth.getMonth() + 1).padStart(2, '0');
      const ld = String(lastMonth.getDate()).padStart(2, '0');
      params.afterDate = `${ly}-${lm}-${ld}`; // same date, last month
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
    enabled: timeFilter !== 'custom' || (!!customDateRange[0] && !!customDateRange[1]),
  });

  // Label for monthly chart: "Jan - Feb (Today 2 Feb 2026)". For custom: "1 Jan 2026 - 5 Feb 2026"
  const revenueChartRangeLabel = useMemo(() => {
    if (timeFilter === 'monthly') {
      const now = new Date();
      const beforeDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const afterDate = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
      const startMonth = format(afterDate, "MMM");
      const endMonth = format(beforeDate, "MMM");
      const todayStr = format(beforeDate, "d MMM yyyy");
      return `${startMonth} - ${endMonth} (Today ${todayStr})`;
    }
    if (timeFilter === 'custom' && customDateRange[0] && customDateRange[1]) {
      return `${format(customDateRange[0], "d MMM yyyy")} - ${format(customDateRange[1], "d MMM yyyy")}`;
    }
    return undefined;
  }, [timeFilter, customDateRange]);

  // Use correct service based on user role
  const isCounsellor = user?.role === 'counsellor';
  const { data: recentClientsRaw } = useQuery({
    queryKey: isCounsellor ? ['recent-clients-counsellor'] : ['recent-clients'],
    queryFn: isCounsellor ? clientService.getCounsellorClients : clientService.getClients
  });

  // Transform data to array format for Dashboard display
  const recentClients = useMemo(() => {
    if (!recentClientsRaw) return undefined;

    // Counsellor view: already an array
    if (isCounsellor) {
      return Array.isArray(recentClientsRaw) ? recentClientsRaw : [];
    }

    // Admin view: need to extract clients from counsellor-first structure
    // Structure: { "3": { counsellor: {...}, clients: { "2026": { "Jan": { clients: [...], total: 4 } } } } }
    if (recentClientsRaw && typeof recentClientsRaw === 'object' && !Array.isArray(recentClientsRaw)) {
      const allClients: Client[] = [];

      Object.values(recentClientsRaw).forEach((counsellorData: any) => {
        if (counsellorData?.clients && typeof counsellorData.clients === 'object') {
          // Iterate through years
          Object.values(counsellorData.clients).forEach((yearData: any) => {
            if (yearData && typeof yearData === 'object') {
              // Iterate through months
              Object.values(yearData).forEach((monthData: any) => {
                if (monthData?.clients && Array.isArray(monthData.clients)) {
                  // Transform each client to match Client interface
                  monthData.clients.forEach((client: any) => {
                    const transformedClient: Client = {
                      id: String(client.clientId || ""),
                      name: client.fullName || "",
                      enrollmentDate: client.enrollmentDate || "",
                      counsellor: counsellorData.counsellor?.name || counsellorData.counsellor?.fullName || "",
                      productManager: client.productManager || "N/A",
                      salesType: client.saleType?.saleType || "N/A",
                      status: (client.archived ? "Archived" : "Active") as 'Active' | 'Completed' | 'Pending' | 'Dropped',
                      totalPayment: Number(client.payments?.[0]?.totalPayment || 0),
                      amountReceived: client.payments && Array.isArray(client.payments) && client.payments.length > 0
                        ? client.payments.reduce((sum: number, p: any) => sum + Number(p.amount || 0), 0)
                        : Number(client.payments?.[0]?.amount || 0),
                      amountPending: (() => {
                        const total = Number(client.payments?.[0]?.totalPayment || 0);
                        const received = client.payments && Array.isArray(client.payments) && client.payments.length > 0
                          ? client.payments.reduce((sum: number, p: any) => sum + Number(p.amount || 0), 0)
                          : Number(client.payments?.[0]?.amount || 0);
                        return total - received;
                      })(),
                      stage: client.stage || "N/A"
                    };
                    allClients.push(transformedClient);
                  });
                }
              });
            }
          });
        }
      });

      return allClients;
    }

    // Fallback: if it's already an array, return as-is
    return Array.isArray(recentClientsRaw) ? recentClientsRaw : [];
  }, [recentClientsRaw, isCounsellor]);

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

  const canViewFinancials = user?.role === 'superadmin' || user?.role === 'director' || user?.role === 'manager';
  const canApprovePayments = user?.role === 'superadmin' || user?.role === 'director' || user?.role === 'manager';
  const [processingApproval, setProcessingApproval] = useState<number | null>(null);

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
    enabled: !!user && !apiLeaderboard, // Only fetch if not in stats
  });

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
    if (finalLeaderboardData.length > 0 && user?.id) {
      console.log('[Dashboard Leaderboard] User ID:', user.id, 'Type:', typeof user.id);
      console.log('[Dashboard Leaderboard] First counsellor ID:', finalLeaderboardData[0].counsellorId, 'Type:', typeof finalLeaderboardData[0].counsellorId);
    }

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
          console.log('[Dashboard Leaderboard] ✅ Match found (counsellorId string):', fullName, 'User CounsellorId:', userCounsellorIdStr, 'Leaderboard CounsellorId:', counsellorIdStr);
        } else {
          // Try number comparison (handle cases where one is string and one is number)
          const userCounsellorIdNum = Number(userCounsellorId);
          const counsellorIdNum = Number(counsellorId);
          if (!isNaN(userCounsellorIdNum) && !isNaN(counsellorIdNum) && userCounsellorIdNum === counsellorIdNum) {
            isCurrentUser = true;
            console.log('[Dashboard Leaderboard] ✅ Match found (counsellorId number):', fullName, 'User CounsellorId:', userCounsellorIdNum, 'Leaderboard CounsellorId:', counsellorIdNum);
          }
        }
      }

      // Debug: Log if no match found for debugging
      if (!isCurrentUser && userCounsellorId) {
        console.log('[Dashboard Leaderboard] No match:', fullName, 'User CounsellorId:', userCounsellorId, 'Leaderboard CounsellorId:', counsellorId);
      }

      return {
        name: fullName,
        achieved: enrollments,
        target: target,
        avatar: avatar,
        isCurrentUser: isCurrentUser,
        counsellorId: counsellorId
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

  const remainingTarget = currentUserTarget ? Math.max(0, currentUserTarget.target - currentUserTarget.achieved) : 0;
  const progressPercentage = currentUserTarget && currentUserTarget.target > 0
    ? (currentUserTarget.achieved / currentUserTarget.target) * 100
    : 0;

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
      console.log('[Dashboard] Socket not available, skipping dashboard WebSocket listener');
      return;
    }

    // Only listen if user is admin (superadmin, manager, director)
    const isAdmin = user?.role === 'superadmin' || user?.role === 'manager' || user?.role === 'director';
    if (!isAdmin) {
      console.log('[Dashboard] User is not admin, skipping dashboard WebSocket listener');
      return;
    }

    console.log('[Dashboard] Setting up dashboard:updated WebSocket listener');

    // Ensure admin joins both admin room (for client events) and admin:dashboard room (for dashboard events)
    // Note: join:admin is already handled in socket-context.tsx, but we ensure join:admin:dashboard here
    socket.emit('join:admin:dashboard');
    console.log('[Dashboard] ✅ Joined admin:dashboard room');

    // Also ensure admin room is joined (should already be done in socket-context, but double-check)
    socket.emit('join:admin');
    console.log('[Dashboard] ✅ Joined admin room (for client events)');

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
      console.log('📊 [Dashboard] ========== DASHBOARD:UPDATED EVENT RECEIVED ==========');
      console.log('[Dashboard] Event filter:', eventData.filter, '| Current filter:', timeFilter);
      console.log('[Dashboard] Event data:', eventData.data);

      // Only update if current filter matches the event filter (or if event filter is "today")
      // Backend currently only emits for "today" filter
      if (eventData.filter === timeFilter || eventData.filter === 'today') {
        console.log('[Dashboard] ✅ Filter matches, updating dashboard data');

        // Update React Query cache with new data
        queryClient.setQueryData(
          ['dashboard-stats', timeFilter],
          eventData.data
        );

        console.log('[Dashboard] ✅ Updated dashboard stats cache');

        // Show toast notification (optional, can be removed if too noisy)
        // toast({
        //   title: "Dashboard Updated",
        //   description: "Dashboard statistics have been updated in real-time.",
        // });
      } else {
        console.log('[Dashboard] ⏭️ Filter mismatch, skipping update. Event filter:', eventData.filter, 'Current filter:', timeFilter);
      }
    };

    // Listen for client:created event to update dashboard instantly
    const handleClientCreated = (data: {
      action: "CREATED";
      client: any;
      clients?: any;
      allClients?: any;
    }) => {
      console.log('📊 [Dashboard] Received client:created event, invalidating dashboard stats');

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

      console.log('[Dashboard] ✅ Invalidated and refetching dashboard stats');
    };

    // Listen for client:updated event to update dashboard instantly
    const handleClientUpdated = (data: {
      action: "UPDATED";
      client: any;
      clients?: any;
      allClients?: any;
    }) => {
      console.log('📊 [Dashboard] Received client:updated event, invalidating dashboard stats');

      // Force immediate refetch of dashboard stats
      queryClient.invalidateQueries({
        queryKey: ['dashboard-stats'],
        refetchType: 'active'
      });

      queryClient.refetchQueries({
        queryKey: ['dashboard-stats'],
        type: 'active'
      });

      console.log('[Dashboard] ✅ Invalidated and refetching dashboard stats');
    };

    // Listen for payment:created event (affects revenue and pending amount)
    const handlePaymentCreated = (data: {
      clientId: number;
      client: any;
      clients?: any;
    }) => {
      console.log('📊 [Dashboard] Received payment:created event, invalidating dashboard stats');

      queryClient.invalidateQueries({
        queryKey: ['dashboard-stats'],
        refetchType: 'active'
      });

      queryClient.refetchQueries({
        queryKey: ['dashboard-stats'],
        type: 'active'
      });

      console.log('[Dashboard] ✅ Invalidated and refetching dashboard stats (payment created)');
    };

    // Listen for payment:updated event (affects revenue and pending amount)
    const handlePaymentUpdated = (data: {
      clientId: number;
      client: any;
      clients?: any;
    }) => {
      console.log('📊 [Dashboard] Received payment:updated event, invalidating dashboard stats');

      queryClient.invalidateQueries({
        queryKey: ['dashboard-stats'],
        refetchType: 'active'
      });

      queryClient.refetchQueries({
        queryKey: ['dashboard-stats'],
        type: 'active'
      });

      console.log('[Dashboard] ✅ Invalidated and refetching dashboard stats (payment updated)');
    };

    // Listen for productPayment:created event (affects revenue)
    const handleProductPaymentCreated = (data: {
      clientId: number;
      client: any;
      clients?: any;
    }) => {
      console.log('📊 [Dashboard] Received productPayment:created event, invalidating dashboard stats');

      queryClient.invalidateQueries({
        queryKey: ['dashboard-stats'],
        refetchType: 'active'
      });

      queryClient.refetchQueries({
        queryKey: ['dashboard-stats'],
        type: 'active'
      });

      console.log('[Dashboard] ✅ Invalidated and refetching dashboard stats (product payment created)');
    };

    // Listen for productPayment:updated event (affects revenue)
    const handleProductPaymentUpdated = (data: {
      clientId: number;
      client: any;
      clients?: any;
    }) => {
      console.log('📊 [Dashboard] Received productPayment:updated event, invalidating dashboard stats');

      queryClient.invalidateQueries({
        queryKey: ['dashboard-stats'],
        refetchType: 'active'
      });

      queryClient.refetchQueries({
        queryKey: ['dashboard-stats'],
        type: 'active'
      });

      console.log('[Dashboard] ✅ Invalidated and refetching dashboard stats (product payment updated)');
    };

    // Register all event listeners
    socket.on('dashboard:updated', handleDashboardUpdated);
    socket.on('client:created', handleClientCreated);
    socket.on('client:updated', handleClientUpdated);
    socket.on('payment:created', handlePaymentCreated);
    socket.on('payment:updated', handlePaymentUpdated);
    socket.on('productPayment:created', handleProductPaymentCreated);
    socket.on('productPayment:updated', handleProductPaymentUpdated);
    console.log('[Dashboard] ✅ Registered WebSocket event listeners: dashboard:updated, client:created, client:updated, payment:created, payment:updated, productPayment:created, productPayment:updated');

    // Cleanup on unmount
    return () => {
      console.log('[Dashboard] Cleaning up dashboard WebSocket listeners');
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

  // Show loading state
  if (isLoading && !stats) {
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

  return (
    <div className="space-y-8 pb-8">
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
            align="end"
          />
        </div>
      </div>

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
                      <Progress value={progressPercentage} className="h-3 bg-background/50" />
                      <p className="text-xs text-muted-foreground text-right font-medium">
                        {progressPercentage.toFixed(0)}% completed
                      </p>
                    </div>

                    <div className="bg-background/40 rounded-xl p-4 text-sm text-foreground backdrop-blur-md border border-border/50 shadow-sm relative z-10">
                      <div className="flex items-start gap-3">
                        <div className="p-1.5 bg-primary/10 rounded-full mt-0.5">
                          <Trophy className="w-4 h-4 text-primary" />
                        </div>
                        <div>
                          <p className="font-bold text-foreground">Keep it up! 🚀</p>
                          <p className="text-muted-foreground text-xs mt-1 leading-relaxed">
                            You need <span className="font-bold text-primary">{remainingTarget}</span> more enrollments to hit your monthly target.
                          </p>
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
              icon={CreditCard}
              trend={(stats as any)?.coreSale?.change !== undefined ? {
                value: (stats as any)?.coreSale?.change ?? 0,
                isPositive: (stats as any)?.coreSale?.changeType === "increase" || (stats as any)?.coreSale?.changeType === "no-change"
              } : undefined}
              description={(stats as any)?.coreSale?.amount ? `₹${Number((stats as any)?.coreSale?.amount).toLocaleString()}` : "core sales"}
              className="shadow-card hover:shadow-lg transition-shadow border-none h-full"
            />

            <StatCard
              title="Core Product"
              value={Number((stats as any)?.coreProduct?.number ?? 0)}
              icon={Target}
              trend={(stats as any)?.coreProduct?.change !== undefined ? {
                value: (stats as any)?.coreProduct?.change ?? 0,
                isPositive: (stats as any)?.coreProduct?.changeType === "increase" || (stats as any)?.coreProduct?.changeType === "no-change"
              } : undefined}
              description={(stats as any)?.coreProduct?.amount ? `₹${Number((stats as any)?.coreProduct?.amount).toLocaleString()}` : "core products"}
              className="shadow-card hover:shadow-lg transition-shadow border-none h-full"
            />

            <StatCard
              title="Other Product"
              value={Number((stats as any)?.otherProduct?.number ?? 0)}
              icon={TrendingUp}
              trend={(stats as any)?.otherProduct?.change !== undefined ? {
                value: (stats as any)?.otherProduct?.change ?? 0,
                isPositive: (stats as any)?.otherProduct?.changeType === "increase" || (stats as any)?.otherProduct?.changeType === "no-change"
              } : undefined}
              description={(stats as any)?.otherProduct?.amount ? `₹${Number((stats as any)?.otherProduct?.amount).toLocaleString()}` : "other products"}
              className="shadow-card hover:shadow-lg transition-shadow border-none h-full"
            />

            <StatCard
              title="Total Pending Amount"
              value={`₹${Number((stats as any)?.totalPendingAmount?.amount ?? 0).toLocaleString()}`}
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
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
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
            icon={CreditCard}
            trend={(stats as any)?.coreSale?.change !== undefined ? {
              value: (stats as any)?.coreSale?.change ?? 0,
              isPositive: (stats as any)?.coreSale?.changeType === "increase" || (stats as any)?.coreSale?.changeType === "no-change"
            } : undefined}
            description={(stats as any)?.coreSale?.amount ? `₹ ${Number((stats as any)?.coreSale?.amount).toLocaleString()}` : "core sales"}
            className="shadow-card hover:shadow-lg transition-shadow border-none"
          />

          <StatCard
            title="Core Product"
            value={Number((stats as any)?.coreProduct?.number ?? 0)}
            icon={Target}
            trend={(stats as any)?.coreProduct?.change !== undefined ? {
              value: (stats as any)?.coreProduct?.change ?? 0,
              isPositive: (stats as any)?.coreProduct?.changeType === "increase" || (stats as any)?.coreProduct?.changeType === "no-change"
            } : undefined}
            description={(stats as any)?.coreProduct?.amount ? `₹ ${Number((stats as any)?.coreProduct?.amount).toLocaleString()}` : "core products"}
            className="shadow-card hover:shadow-lg transition-shadow border-none"
          />

          <StatCard
            title="Other Product"
            value={Number((stats as any)?.otherProduct?.number ?? 0)}
            icon={TrendingUp}
            trend={(stats as any)?.otherProduct?.change !== undefined ? {
              value: (stats as any)?.otherProduct?.change ?? 0,
              isPositive: (stats as any)?.otherProduct?.changeType === "increase" || (stats as any)?.otherProduct?.changeType === "no-change"
            } : undefined}
            description={(stats as any)?.otherProduct?.amount ? `₹ ${Number((stats as any)?.otherProduct?.amount).toLocaleString()}` : "other products"}
            className="shadow-card hover:shadow-lg transition-shadow border-none"
          />

          <StatCard
            title="Total Pending Amount"
            value={`₹ ${Number((stats as any)?.totalPendingAmount?.amount ?? 0).toLocaleString()}`}
            icon={Clock}
            trend={(stats as any)?.totalPendingAmount?.change !== undefined ? {
              value: (stats as any)?.totalPendingAmount?.change ?? 0,
              isPositive: (stats as any)?.totalPendingAmount?.changeType === "increase" || (stats as any)?.totalPendingAmount?.changeType === "no-change"
            } : undefined}
            description="total outstanding"
            className="shadow-card hover:shadow-lg transition-shadow border-l-4 border-l-yellow-500"
          />

          {(stats as any)?.revenue && (
            <StatCard
              title="Revenue"
              value={`₹ ${Number((stats as any)?.revenue?.amount ?? 0).toLocaleString()}`}
              icon={IndianRupee}
              trend={(stats as any)?.revenue?.change !== undefined ? {
                value: (stats as any)?.revenue?.change ?? 0,
                isPositive: (stats as any)?.revenue?.changeType === "increase" || (stats as any)?.revenue?.changeType === "no-change"
              } : undefined}
              description="total revenue"
              className="shadow-card hover:shadow-lg transition-shadow border-none"
            />
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
              {canViewFinancials ? "Performance Leaderboard" : "Counselor Leaderboard"}
            </CardTitle>
            <CardDescription>Top performing {canViewFinancials ? "team members" : "counselors"} this month</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {isLoadingLeaderboard ? (
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
            ) : leaderboardForDisplay.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No leaderboard data available
              </div>
            ) : (
              <div className="max-h-[500px] overflow-y-auto p-6">
                <div className="space-y-4">
                  {leaderboardForDisplay.map((counselor: any, index: number) => {
                    // Highlight if the logged-in user is this counsellor (regardless of role)
                    const isHighlighted = counselor.isCurrentUser;

                    // Debug: Log highlighting status for current user
                    if (counselor.isCurrentUser) {
                      console.log('[Dashboard Leaderboard] Rendering highlighted:', counselor.name, 'isCurrentUser:', counselor.isCurrentUser, 'isHighlighted:', isHighlighted);
                    }

                    return (
                      <div
                        key={(counselor as any).counsellorId || index}
                        className={`flex items-center p-3 rounded-lg transition-all ${isHighlighted
                            ? "bg-primary/10 border-2 border-primary/30 shadow-md ring-2 ring-primary/20"
                            : "hover:bg-muted/50"
                          }`}
                      >
                        <div className="flex items-center flex-1">
                          <div className="relative mr-3">
                            <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center text-muted-foreground font-semibold text-sm border-2 border-background shadow-sm">
                              {counselor.avatar}
                            </div>
                            {/* Rank Badge Overlay */}
                            <div className={`
                              absolute -top-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold border-2 border-background shadow-sm
                              ${index === 0 ? "bg-yellow-400 text-yellow-900" :
                                index === 1 ? "bg-slate-300 text-slate-900" :
                                  index === 2 ? "bg-orange-300 text-orange-900" : "bg-muted text-muted-foreground"}
                          `}>
                              {index === 0 ? <Medal className="w-3 h-3" /> : index + 1}
                            </div>
                          </div>

                          <div>
                            <p className={`text-sm font-semibold ${isHighlighted ? "text-primary" : "text-foreground"}`}>
                              {counselor.name} {isHighlighted && "(You)"}
                            </p>
                            <p className="text-xs text-muted-foreground">Target: {counselor.target}</p>
                          </div>
                        </div>

                        <div className="text-right">
                          <div className="text-sm font-bold text-foreground">{counselor.achieved}</div>
                          <p className="text-xs text-muted-foreground">enrolled</p>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

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
                       <div className="font-mono font-medium text-foreground">₹{item.revenue.toLocaleString()}</div>
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
                       <div className="font-mono font-medium text-foreground">₹{client.amountReceived?.toLocaleString()}</div>
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
