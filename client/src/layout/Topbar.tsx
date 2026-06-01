import { cn } from "@/lib/utils";
import { Bell, Search, User, LogOut, Lock, Megaphone, AlertTriangle, Loader2, PartyPopper } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MobileSidebar } from "./Sidebar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

import { ProfileDialog } from "@/components/profile-dialog";
import { BroadcastDialog } from "@/components/broadcast-dialog";
import { ConnectionStatus } from "@/components/connection-status";
import { useAuth } from "@/context/auth-context";
import { useAlert, AlertType } from "@/context/alert-context";
import { useLocation } from "wouter";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { clientService } from "@/services/clientService";
import { useSocket } from "@/context/socket-context";
import { useToast } from "@/hooks/use-toast";
import { useEffect, useState } from "react";

import { ModeToggle } from "@/components/mode-toggle";
import { NotificationBell } from "@/notification/components/NotificationBell";

const getInitials = (name: string | undefined) => {
  if (!name) return 'U';
  const parts = name.trim().split(' ');
  if (parts.length >= 2) {
    return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
  }
  return name.charAt(0).toUpperCase();
};

export function Topbar() {
  const { user, logout } = useAuth();
  const [, setLocation] = useLocation();
  const { pendingAlert, activatePendingAlert } = useAlert();
  const { socket, isConnected } = useSocket();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [pendingApprovalCount, setPendingApprovalCount] = useState(0);
  const [techSupportSeenAt, setTechSupportSeenAt] = useState<Record<"tickets" | "devices" | "recharge", number>>(() => {
    if (typeof window === "undefined") return { tickets: 0, devices: 0, recharge: 0 };
    const readSeen = (key: string) => {
      const raw = localStorage.getItem(key);
      const parsed = raw ? Number(raw) : 0;
      return Number.isFinite(parsed) ? parsed : 0;
    };
    return {
      tickets: readSeen("tech-support-seen-tickets-at"),
      devices: readSeen("tech-support-seen-devices-at"),
      recharge: readSeen("tech-support-seen-recharge-at"),
    };
  });

  // Fetch real user profile data
  const { data: userProfile, isLoading: isLoadingProfile } = useQuery({
    queryKey: ["user-profile"],
    queryFn: clientService.getUserProfile,
    retry: 1,
    staleTime: 1000 * 60 * 5, // Cache for 5 minutes
    refetchOnWindowFocus: false,
  });

  const isMaintenancePending =
    pendingAlert?.type === "maintenance_scheduled" ||
    pendingAlert?.type === "maintenance_live";

  const hasRelevantPendingAlert =
    pendingAlert &&
    user &&
    (pendingAlert.targetRoles.includes("all") ||
      pendingAlert.targetRoles.includes(user.role) ||
      (isMaintenancePending && user.role !== "developer") ||
      (!isMaintenancePending &&
        (user.role === "superadmin" || user.role === "director")));

  const getAlertIcon = (type: AlertType) => {
    switch(type) {
      case 'emergency': return <AlertTriangle className="w-4 h-4 text-red-600" />;
      case 'good_news': return <PartyPopper className="w-4 h-4 text-green-600" />;
      case 'maintenance_live': return <AlertTriangle className="w-4 h-4 text-amber-700" />;
      case 'maintenance_scheduled': return <Megaphone className="w-4 h-4 text-blue-600" />;
      default: return <Megaphone className="w-4 h-4 text-blue-600" />;
    }
  };

  const getAlertColor = (type: AlertType) => {
    switch(type) {
      case 'emergency': return "bg-red-200 hover:bg-red-300";
      case 'good_news': return "bg-green-200 hover:bg-green-300";
      case 'maintenance_live': return "bg-amber-200 hover:bg-amber-300";
      case 'maintenance_scheduled': return "bg-blue-200 hover:bg-blue-300";
      default: return "bg-blue-200 hover:bg-blue-300";
    }
  };

  // Fetch pending approvals count (for admin/manager)
  const canViewApprovals =
    user?.role === "superadmin" ||
    user?.role === "developer" ||
    user?.role === "director" ||
    user?.role === "manager";
  const isTechSupportUser = user?.role === "tech_support";
  const { data: pendingApprovals = [], isLoading: isLoadingApprovals, error: approvalsError } = useQuery({
    queryKey: ["pending-all-finance-approvals"],
    queryFn: clientService.getPendingAllFinanceApprovals,
    enabled: canViewApprovals, // Remove isConnected requirement - query should work without socket
    refetchInterval: 30000, // Refetch every 30 seconds
    retry: 1,
  });

  const { data: techSupportBoard } = useQuery({
    queryKey: ["topbar-tech-support-board"],
    queryFn: clientService.getTechSupportBoard,
    enabled: isTechSupportUser,
    refetchInterval: 30000,
    retry: 1,
  });

  const { data: techSupportRequests = [] } = useQuery({
    queryKey: ["topbar-tech-support-requests"],
    queryFn: clientService.getAllTechSupportRequests,
    enabled: isTechSupportUser,
    refetchInterval: 30000,
    retry: 1,
  });

  const pendingTicketCount = isTechSupportUser ? Number(techSupportBoard?.pending?.length || 0) : 0;
  const pendingDeviceRequestCount = isTechSupportUser
    ? techSupportRequests.filter((req: any) => req.requestType === "device_request" && req.status === "pending").length
    : 0;
  const pendingRechargeRequestCount = isTechSupportUser
    ? techSupportRequests.filter((req: any) => req.requestType === "recharge_sim_request" && req.status === "pending").length
    : 0;

  const unreadTicketCount = isTechSupportUser
    ? (techSupportBoard?.pending ?? []).filter((item: any) => {
        const t = new Date(item.createdAt).getTime();
        return Number.isFinite(t) && t > techSupportSeenAt.tickets;
      }).length
    : 0;
  const unreadDeviceCount = isTechSupportUser
    ? techSupportRequests.filter((req: any) => {
        if (req.requestType !== "device_request" || req.status !== "pending") return false;
        const t = new Date(req.createdAt).getTime();
        return Number.isFinite(t) && t > techSupportSeenAt.devices;
      }).length
    : 0;
  const unreadRechargeCount = isTechSupportUser
    ? techSupportRequests.filter((req: any) => {
        if (req.requestType !== "recharge_sim_request" || req.status !== "pending") return false;
        const t = new Date(req.createdAt).getTime();
        return Number.isFinite(t) && t > techSupportSeenAt.recharge;
      }).length
    : 0;
  const unreadTechSupportCount = unreadTicketCount + unreadDeviceCount + unreadRechargeCount;

  useEffect(() => {
    // console.log("[Topbar] Pending approvals check:", {
    //   userRole: user?.role,
    //   canViewApprovals,
    //   isConnected,
    //   isLoadingApprovals,
    //   approvalsError: approvalsError ? {
    //     message: approvalsError?.message,
    //     response: (approvalsError as any)?.response?.data
    //   } : null,
    //   pendingApprovalsCount: pendingApprovals.length,
    //   pendingApprovals: pendingApprovals
    // });

    if (canViewApprovals) {
      setPendingApprovalCount(pendingApprovals.length);
    } else {
      setPendingApprovalCount(0);
    }
  }, [pendingApprovals, user?.role, canViewApprovals, isConnected, isLoadingApprovals, approvalsError]);

  const openTechSupportTab = (tab: "tickets" | "devices" | "recharge") => {
    const now = Date.now();
    setTechSupportSeenAt((prev) => ({ ...prev, [tab]: now }));
    const key =
      tab === "tickets"
        ? "tech-support-seen-tickets-at"
        : tab === "devices"
          ? "tech-support-seen-devices-at"
          : "tech-support-seen-recharge-at";
    localStorage.setItem(key, String(now));
    sessionStorage.setItem("tech-support-active-tab", tab);
    setLocation("/dashboard");
  };

  // Socket listeners for all finance approval/rejection events
  useEffect(() => {
    if (!socket || !isConnected) {
      return;
    }

    // Listen for new pending approval created
    const handleAllFinancePending = (data: {
      financeId: number;
      productPaymentId?: number;
      clientId?: number;
      clientName?: string;
      amount?: string;
    }) => {
      // console.log("[Topbar] New pending approval created:", data);

      queryClient.invalidateQueries({ queryKey: ["pending-all-finance-approvals"] });
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    };

    const handleAllFinanceApproved = () => {
      queryClient.invalidateQueries({ queryKey: ["pending-all-finance-approvals"] });
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    };

    const handleAllFinanceRejected = () => {
      queryClient.invalidateQueries({ queryKey: ["pending-all-finance-approvals"] });
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    };

    // Register event listeners
    const handleTechSupportTicketCreated = () => {
      queryClient.invalidateQueries({ queryKey: ["topbar-tech-support-board"] });
    };
    const handleTechSupportTicketMoved = () => {
      queryClient.invalidateQueries({ queryKey: ["topbar-tech-support-board"] });
    };
    const handleTechSupportRequestCreated = () => {
      queryClient.invalidateQueries({ queryKey: ["topbar-tech-support-requests"] });
    };
    const handleTechSupportRequestUpdated = () => {
      queryClient.invalidateQueries({ queryKey: ["topbar-tech-support-requests"] });
    };

    socket.on("allFinance:pending", handleAllFinancePending);
    socket.on("allFinance:approved", handleAllFinanceApproved);
    socket.on("allFinance:rejected", handleAllFinanceRejected);
    socket.on("techSupport:ticketCreated", handleTechSupportTicketCreated);
    socket.on("techSupport:ticketMoved", handleTechSupportTicketMoved);
    socket.on("techSupport:requestCreated", handleTechSupportRequestCreated);
    socket.on("techSupport:requestUpdated", handleTechSupportRequestUpdated);

    // console.log("[Topbar] Socket listeners registered for allFinance events");

    // Cleanup on unmount
    return () => {
      socket.off("allFinance:pending", handleAllFinancePending);
      socket.off("allFinance:approved", handleAllFinanceApproved);
      socket.off("allFinance:rejected", handleAllFinanceRejected);
      socket.off("techSupport:ticketCreated", handleTechSupportTicketCreated);
      socket.off("techSupport:ticketMoved", handleTechSupportTicketMoved);
      socket.off("techSupport:requestCreated", handleTechSupportRequestCreated);
      socket.off("techSupport:requestUpdated", handleTechSupportRequestUpdated);
    };
  }, [socket, isConnected, toast, queryClient]);

  return (
    <header className="h-20 px-6 md:px-8 border-b border-border/40 bg-background/80 backdrop-blur-md flex items-center justify-between sticky top-0 z-10 transition-all duration-200">
      <div className="flex items-center gap-4">
        <MobileSidebar />

        {/* Optional: Add page title or breadcrumbs here if needed, or keeping it clean */}
        <div className="hidden md:flex items-center text-muted-foreground text-sm">
           {/* Breadcrumbs removed as they are handled in PageWrapper */}
        </div>
      </div>

      <div className="flex items-center gap-2 md:gap-4">
        {/* Search Bar - hidden on mobile */}
        {/* <div className="hidden md:flex relative w-64 mr-2">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
                type="search"
                placeholder="Search..."
                className="pl-9 h-9 bg-white/50 border-border/60 focus:bg-white transition-all rounded-full text-sm"
            />
        </div> */}

        <ModeToggle />

        {user?.role !== "front_desk" && <ConnectionStatus />}

        {(user?.role === 'superadmin' || user?.role === 'director') && (
          <BroadcastDialog>
            <Button
              variant="ghost"
              size="icon"
              className="relative text-blue-500 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-colors w-10 h-10"
              title="Broadcast Emergency Alert"
            >
              <Megaphone className="w-5 h-5" />
            </Button>
          </BroadcastDialog>
        )}

        <NotificationBell
          extraBadgeCount={
            (hasRelevantPendingAlert ? 1 : 0) + (isTechSupportUser ? unreadTechSupportCount : 0)
          }
          childrenBefore={
            <>
              {hasRelevantPendingAlert && pendingAlert && (
                <div className="border-b border-border/60 p-2">
                  <DropdownMenuItem
                    className="cursor-pointer rounded-lg border border-slate-100 bg-slate-50 p-3 focus:bg-slate-100"
                    onClick={activatePendingAlert}
                  >
                    <div className="flex w-full items-start gap-3">
                      <div className={`mt-1 rounded-full p-2 ${getAlertColor(pendingAlert.type)}`}>
                        {getAlertIcon(pendingAlert.type)}
                      </div>
                      <div className="min-w-0 flex-1 space-y-1">
                        <p className="text-sm font-semibold text-slate-900">{pendingAlert.title}</p>
                        <p className="line-clamp-2 text-xs text-slate-700">{pendingAlert.message}</p>
                      </div>
                    </div>
                  </DropdownMenuItem>
                </div>
              )}
              {isTechSupportUser && (
                <div className="space-y-1 border-b border-border/60 p-2">
                  {pendingTicketCount > 0 && (
                    <DropdownMenuItem
                      className="cursor-pointer rounded-lg bg-blue-50 p-2 text-xs"
                      onClick={() => openTechSupportTab("tickets")}
                    >
                      Tickets: {pendingTicketCount} pending
                      {unreadTicketCount > 0 ? ` (${unreadTicketCount} new)` : ""}
                    </DropdownMenuItem>
                  )}
                  {pendingDeviceRequestCount > 0 && (
                    <DropdownMenuItem
                      className="cursor-pointer rounded-lg bg-violet-50 p-2 text-xs"
                      onClick={() => openTechSupportTab("devices")}
                    >
                      Devices: {pendingDeviceRequestCount} pending
                    </DropdownMenuItem>
                  )}
                  {pendingRechargeRequestCount > 0 && (
                    <DropdownMenuItem
                      className="cursor-pointer rounded-lg bg-cyan-50 p-2 text-xs"
                      onClick={() => openTechSupportTab("recharge")}
                    >
                      Recharge: {pendingRechargeRequestCount} pending
                    </DropdownMenuItem>
                  )}
                </div>
              )}
            </>
          }
        />

        <div className="h-8 w-px bg-border/60 hidden sm:block mx-1" />

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="relative h-10 w-10 rounded-full ring-2 ring-transparent hover:ring-primary/20 transition-all p-0 overflow-hidden">
              {isLoadingProfile ? (
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <Loader2 className="w-5 h-5 animate-spin text-primary" />
                </div>
              ) : (
                <Avatar className="h-10 w-10">
                  <AvatarImage src={user?.avatar} />
                  <AvatarFallback className="bg-primary/10 text-primary font-bold text-sm">
                    {getInitials(userProfile?.fullname || user?.name)}
                  </AvatarFallback>
                </Avatar>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-60 mt-2 p-1 rounded-xl shadow-lg border-border/60" align="end" forceMount>
            <DropdownMenuLabel className="font-normal px-3 py-2">
              {isLoadingProfile ? (
                <div className="flex flex-col space-y-2">
                  <div className="h-4 w-32 bg-muted rounded animate-pulse" />
                  <div className="h-3 w-24 bg-muted rounded animate-pulse" />
                </div>
              ) : (
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-semibold leading-none text-slate-900">
                    {userProfile?.fullname || user?.name || 'User'}
                  </p>
                  <p className="text-xs leading-none text-muted-foreground">
                    {userProfile?.email || user?.username || 'user@example.com'}
                  </p>
                </div>
              )}
            </DropdownMenuLabel>
            <DropdownMenuSeparator className="bg-border/60" />
            <DropdownMenuGroup>
              <ProfileDialog>
                <DropdownMenuItem
                  className="rounded-lg cursor-pointer focus:bg-primary/10 focus:text-primary"
                  onSelect={(e) => e.preventDefault()}
                >
                  <User className="mr-2 h-4 w-4" />
                  <span>Profile</span>
                </DropdownMenuItem>
              </ProfileDialog>
              <DropdownMenuItem
                className="rounded-lg cursor-pointer focus:bg-primary/10 focus:text-primary"
                onClick={() => setLocation("/change-password")}
              >
                <Lock className="mr-2 h-4 w-4" />
                <span>Change Password</span>
              </DropdownMenuItem>
            </DropdownMenuGroup>
            <DropdownMenuSeparator className="bg-border/60" />
            <DropdownMenuItem
                className="text-red-600 focus:text-red-700 focus:bg-red-50 rounded-lg cursor-pointer"
                onClick={logout}
            >
              <LogOut className="mr-2 h-4 w-4" />
              <span>Log out</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
