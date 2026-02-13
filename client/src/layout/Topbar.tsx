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

  // Fetch real user profile data
  const { data: userProfile, isLoading: isLoadingProfile } = useQuery({
    queryKey: ["user-profile"],
    queryFn: clientService.getUserProfile,
    retry: 1,
    staleTime: 1000 * 60 * 5, // Cache for 5 minutes
    refetchOnWindowFocus: false,
  });

  // Check if pending alert targets this user
  const hasRelevantPendingAlert = pendingAlert && user && (
    pendingAlert.targetRoles.includes('all') ||
    pendingAlert.targetRoles.includes(user.role) ||
    user.role === 'superadmin' ||
    user.role === 'director'
  );

  const getAlertIcon = (type: AlertType) => {
    switch(type) {
      case 'emergency': return <AlertTriangle className="w-4 h-4 text-red-600" />;
      case 'good_news': return <PartyPopper className="w-4 h-4 text-green-600" />;
      default: return <Megaphone className="w-4 h-4 text-blue-600" />;
    }
  };

  const getAlertColor = (type: AlertType) => {
    switch(type) {
      case 'emergency': return "bg-red-200 hover:bg-red-300";
      case 'good_news': return "bg-green-200 hover:bg-green-300";
      default: return "bg-blue-200 hover:bg-blue-300";
    }
  };

  // Fetch pending approvals count (for admin/manager)
  const canViewApprovals = user?.role === "superadmin" || user?.role === "director" || user?.role === "manager";
  const { data: pendingApprovals = [], isLoading: isLoadingApprovals, error: approvalsError } = useQuery({
    queryKey: ["pending-all-finance-approvals"],
    queryFn: clientService.getPendingAllFinanceApprovals,
    enabled: canViewApprovals, // Remove isConnected requirement - query should work without socket
    refetchInterval: 30000, // Refetch every 30 seconds
    retry: 1,
  });

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

      toast({
        title: "New Pending Approval",
        description: `All Finance & Employment payment for ${data.clientName || "client"} ($${data.amount || "N/A"}) requires approval.`,
      });

      // Refresh pending approvals count immediately
      queryClient.invalidateQueries({ queryKey: ["pending-all-finance-approvals"] });
    };

    // Listen for all finance approval
    const handleAllFinanceApproved = (data: {
      financeId: number;
      productPaymentId?: number;
      clientId?: number;
      clientName?: string;
      amount?: string;
    }) => {
      // console.log("[Topbar] All Finance approved event received:", data);

      toast({
        title: "Payment Approved",
        description: `All Finance & Employment payment for ${data.clientName || "client"} ($${data.amount || "N/A"}) has been approved.`,
      });

      // Refresh pending approvals count
      queryClient.invalidateQueries({ queryKey: ["pending-all-finance-approvals"] });
    };

    // Listen for all finance rejection
    const handleAllFinanceRejected = (data: {
      financeId: number;
      productPaymentId?: number;
      clientId?: number;
      clientName?: string;
      amount?: string;
    }) => {
      // console.log("[Topbar] All Finance rejected event received:", data);

      toast({
        title: "Payment Rejected",
        description: `All Finance & Employment payment for ${data.clientName || "client"} ($${data.amount || "N/A"}) has been rejected.`,
        variant: "destructive",
      });

      // Refresh pending approvals count
      queryClient.invalidateQueries({ queryKey: ["pending-all-finance-approvals"] });
    };

    // Register event listeners
    socket.on("allFinance:pending", handleAllFinancePending);
    socket.on("allFinance:approved", handleAllFinanceApproved);
    socket.on("allFinance:rejected", handleAllFinanceRejected);

    // console.log("[Topbar] Socket listeners registered for allFinance events");

    // Cleanup on unmount
    return () => {
      socket.off("allFinance:pending", handleAllFinancePending);
      socket.off("allFinance:approved", handleAllFinanceApproved);
      socket.off("allFinance:rejected", handleAllFinanceRejected);
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

        <ConnectionStatus />

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

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="relative text-muted-foreground hover:text-primary hover:bg-primary/5 rounded-full transition-colors w-10 h-10">
              <Bell className="w-5 h-5" />
              {(hasRelevantPendingAlert || pendingApprovalCount > 0) && (
                <span className={`absolute top-2.5 right-2.5 w-2 h-2 rounded-full border-2 border-background animate-pulse ${
                  pendingApprovalCount > 0 ? 'bg-orange-500' :
                  pendingAlert?.type === 'good_news' ? 'bg-green-500' :
                  pendingAlert?.type === 'announcement' ? 'bg-blue-500' : 'bg-red-500'
                }`} />
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-80 mt-2 p-1 rounded-xl shadow-lg border-border/60" align="end">
            <div className="max-h-96 overflow-y-auto">
              {hasRelevantPendingAlert && (
                <DropdownMenuItem
                  className="p-3 cursor-pointer bg-slate-50 hover:bg-slate-100 border border-slate-100 rounded-lg focus:bg-slate-100 mb-2"
                  onClick={activatePendingAlert}
                >
                  <div className="flex gap-3 items-start w-full">
                    <div className={`p-2 rounded-full mt-1 ${getAlertColor(pendingAlert.type)}`}>
                      {getAlertIcon(pendingAlert.type)}
                    </div>
                    <div className="flex-1 space-y-1">
                      <p className="font-semibold text-slate-900 text-sm">{pendingAlert.title}</p>
                      <p className="text-xs text-slate-700 line-clamp-2 leading-relaxed">
                        {pendingAlert.message}
                      </p>
                      <p className="text-[10px] text-slate-500 font-medium uppercase tracking-wide pt-1">Click to view</p>
                    </div>
                  </div>
                </DropdownMenuItem>
              )}
              {pendingApprovalCount > 0 && (user?.role === "superadmin" || user?.role === "director" || user?.role === "manager") && (
                <DropdownMenuItem
                  className="p-3 cursor-pointer bg-orange-50 hover:bg-orange-100 border border-orange-100 rounded-lg focus:bg-orange-100"
                  onClick={() => {
                    sessionStorage.setItem("showNotifications", "true");
                    setLocation("/messages");
                  }}
                >
                  <div className="flex gap-3 items-start w-full">
                    <div className="p-2 rounded-full mt-1 bg-orange-200">
                      <Bell className="w-4 h-4 text-orange-700" />
                    </div>
                    <div className="flex-1 space-y-1">
                      <p className="font-semibold text-slate-900 text-sm">Pending Approvals</p>
                      <p className="text-xs text-slate-700 line-clamp-2 leading-relaxed">
                        {pendingApprovalCount} All Finance & Employment payment{pendingApprovalCount > 1 ? 's' : ''} awaiting approval
                      </p>
                      <p className="text-[10px] text-slate-500 font-medium uppercase tracking-wide pt-1">Click to view</p>
                    </div>
                  </div>
                </DropdownMenuItem>
              )}
              {!hasRelevantPendingAlert && pendingApprovalCount === 0 && (
                <div className="p-8 text-center text-muted-foreground text-sm">
                  No new notifications
                </div>
              )}
            </div>
          </DropdownMenuContent>
        </DropdownMenu>

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
