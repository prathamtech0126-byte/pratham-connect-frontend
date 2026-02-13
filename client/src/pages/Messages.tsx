import { PageWrapper } from "@/layout/PageWrapper";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { format } from "date-fns";
import { useState, useEffect } from "react";
import {
  Send,
  AlertTriangle,
  Megaphone,
  Loader2,
  CheckCircle2,
  Clock,
  XCircle,
  ShieldAlert,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/context/auth-context";
import { useToast } from "@/hooks/use-toast";
import { BroadcastDialog } from "@/components/broadcast-dialog";
import { clientService } from "@/services/clientService";
import { useMessageListener } from "@/hooks/useMessageListener";
import { useMessageQueue } from "@/hooks/useMessageQueue";
import { Message, AcknowledgmentStatus } from "@/types/message.types";
import { ConnectionStatus } from "@/components/connection-status";
import { useSocket } from "@/context/socket-context";
import { useLocation } from "wouter";

export default function Messages() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [ackStatus, setAckStatus] = useState<AcknowledgmentStatus | null>(null);
  const [isLoadingAckStatus, setIsLoadingAckStatus] = useState(false);
  const [activeTab, setActiveTab] = useState<string>("inbox");
  const [location] = useLocation();

  // Only superadmin and director can send messages
  // Managers can only view messages (like counsellors)
  const canSendMessages = user?.role === "superadmin" || user?.role === "director";
  const isAdmin = canSendMessages; // For viewing all messages
  const canApprovePayments = user?.role === "superadmin" || user?.role === "director" || user?.role === "manager";
  const { socket, isConnected } = useSocket();
  const [processingApproval, setProcessingApproval] = useState<number | null>(null);

  // Fetch pending approvals (for admin/manager)
  const { data: pendingApprovals = [], refetch: refetchPendingApprovals } = useQuery({
    queryKey: ["pending-all-finance-approvals"],
    queryFn: clientService.getPendingAllFinanceApprovals,
    enabled: canApprovePayments,
    refetchInterval: 30000, // Refetch every 30 seconds
    retry: 1,
  });

  // Debug log to check pending approvals
  useEffect(() => {
    console.log("[Messages] Pending approvals check:", {
      userRole: user?.role,
      canApprovePayments,
      pendingApprovalsCount: pendingApprovals.length,
      pendingApprovals: pendingApprovals
    });
  }, [user?.role, canApprovePayments, pendingApprovals]);

  // Socket listeners for real-time pending approval updates
  useEffect(() => {
    if (!socket || !isConnected || !canApprovePayments) {
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
      console.log("[Messages] New pending approval created:", data);

      toast({
        title: "New Pending Approval",
        description: `All Finance & Employment payment for ${data.clientName || "client"} ($${data.amount || "N/A"}) requires approval.`,
      });

      // Refresh pending approvals immediately
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
      console.log("[Messages] All Finance approved event received:", data);

      // Refresh pending approvals
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
      console.log("[Messages] All Finance rejected event received:", data);

      // Refresh pending approvals
      queryClient.invalidateQueries({ queryKey: ["pending-all-finance-approvals"] });
    };

    // Register event listeners
    socket.on("allFinance:pending", handleAllFinancePending);
    socket.on("allFinance:approved", handleAllFinanceApproved);
    socket.on("allFinance:rejected", handleAllFinanceRejected);

    console.log("[Messages] Socket listeners registered for allFinance events");

    // Cleanup on unmount
    return () => {
      socket.off("allFinance:pending", handleAllFinancePending);
      socket.off("allFinance:approved", handleAllFinanceApproved);
      socket.off("allFinance:rejected", handleAllFinanceRejected);
    };
  }, [socket, isConnected, canApprovePayments, toast, queryClient]);

  // Auto-switch to notifications tab if coming from bell icon
  useEffect(() => {
    // Check if we should auto-switch to notifications tab
    // This happens when user clicks the bell icon notification
    const shouldShowNotifications = sessionStorage.getItem("showNotifications") === "true";
    if (shouldShowNotifications && canApprovePayments) {
      setActiveTab("notifications");
      sessionStorage.removeItem("showNotifications"); // Clear the flag
    }
  }, [canApprovePayments]); // Only depend on canApprovePayments, not pendingApprovals.length

  // Message queue for blocking modals
  const { addMessage, currentMessage, handleAcknowledge, queueLength } = useMessageQueue();

  // Listen for real-time messages
  useMessageListener((messageData) => {
    addMessage(messageData);
    // Refresh messages list
    queryClient.invalidateQueries({ queryKey: ["messages"] });
  });

  // Listen for real-time acknowledgment updates (for admins)
  useEffect(() => {
    if (!isAdmin || !socket || !isConnected) {
      return;
    }

    const handleAcknowledgment = async (data: { messageId: number; userId: number; acknowledgedAt: string }) => {
      console.log('📨 [Messages] Real-time acknowledgment received:', data);

      // If the currently selected message matches, refresh its acknowledgment status
      if (selectedMessage && selectedMessage.id === data.messageId) {
        try {
          const status = await clientService.getMessageStatus(data.messageId);
          // Calculate counts if backend doesn't provide them
          if (status) {
            const acknowledgedCount = status.acknowledgedCount ?? (status.acknowledgments?.length || 0);
            const totalRecipients = status.totalRecipients ?? 0;
            const pendingCount = status.pendingCount ?? (totalRecipients - acknowledgedCount);

            setAckStatus({
              ...status,
              acknowledgedCount,
              pendingCount,
              totalRecipients: totalRecipients || acknowledgedCount,
            });
          }
        } catch (error) {
          console.error("Failed to refresh acknowledgment status:", error);
        }
      }

      // Also refresh the messages list to update read/acknowledged indicators
      queryClient.invalidateQueries({ queryKey: ["messages"] });
    };

    socket.on('message:acknowledged', handleAcknowledgment);
    console.log('[Messages] ✅ Listening for message:acknowledged events');

    return () => {
      socket.off('message:acknowledged', handleAcknowledgment);
    };
  }, [socket, isConnected, isAdmin, selectedMessage, queryClient]);

  // Fetch messages from API
  // Admins use /api/messages (all messages), Counsellors/Managers use /api/messages/inbox (their messages)
  const { data: messages = [], isLoading, refetch } = useQuery({
    queryKey: ["messages", isAdmin ? "all" : "inbox"],
    queryFn: async () => {
      try {
        if (isAdmin) {
          // Admins see all messages
          return await clientService.getMessages();
        } else {
          // Counsellors and Managers see only their messages
          return await clientService.getInboxMessages();
        }
      } catch (error) {
        console.error("Failed to fetch messages:", error);
        return [];
      }
    },
    staleTime: 1000 * 60, // 1 minute
    refetchInterval: 30000, // Refetch every 30 seconds
  });


  // Ensure messages is always an array
  const messagesArray = Array.isArray(messages) ? messages : [];

  // Filter messages based on user role
  const filteredMessages = messagesArray.filter((msg: Message) => {
    if (isAdmin) {
      // Admins see all messages
      return true;
    }
    // Counsellors/Managers see messages sent to them
    return true; // Backend should filter this
  });

  // Calculate unread count
  const unreadCount = filteredMessages.filter((msg: Message) => {
    if (msg.read !== undefined || msg.acknowledged !== undefined) {
      return !msg.read && !msg.acknowledged;
    }
    return msg.isActive !== false;
  }).length;

  const handleMarkAsRead = async (messageId: number) => {
    try {
      await clientService.acknowledgeMessage(messageId);
      queryClient.invalidateQueries({ queryKey: ["messages"] });
      toast({
        title: "Message marked as read",
        description: "The message has been marked as read.",
      });
    } catch (error) {
      console.error("Failed to mark message as read:", error);
    }
  };

  // Handle approve payment
  const handleApprove = async (financeId: number) => {
    try {
      console.log("[Messages] Approving payment, financeId:", financeId);
      setProcessingApproval(financeId);

      const result = await clientService.approveAllFinancePayment(financeId);
      console.log("[Messages] Approval successful, result:", result);

      toast({
        title: "Payment Approved",
        description: "The payment has been approved successfully.",
      });

      // Refresh pending approvals
      await refetchPendingApprovals();
      // Also invalidate to update count in Topbar
      queryClient.invalidateQueries({ queryKey: ["pending-all-finance-approvals"] });
    } catch (error: any) {
      console.error("[Messages] Error approving payment:", error);
      console.error("[Messages] Error details:", {
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
      console.log("[Messages] Rejecting payment, financeId:", financeId);
      setProcessingApproval(financeId);

      const result = await clientService.rejectAllFinancePayment(financeId);
      console.log("[Messages] Rejection successful, result:", result);

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
      console.error("[Messages] Error rejecting payment:", error);
      console.error("[Messages] Error details:", {
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


  const getPriorityStyles = (priority: Message["priority"]) => {
    switch (priority) {
      case "urgent":
        return "bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-800";
      case "high":
        return "bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-900/30 dark:text-orange-300 dark:border-orange-800";
      case "normal":
        return "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800";
      case "low":
        return "bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-900/30 dark:text-gray-300 dark:border-gray-800";
    }
  };

  const getTypeIcon = (type: Message["type"], priority: Message["priority"]) => {
    if (priority === 'urgent') {
      return <AlertTriangle className="w-4 h-4" />;
    }
    if (type === 'broadcast') {
      return <Megaphone className="w-4 h-4" />;
    }
    return <Megaphone className="w-4 h-4" />;
  };

  // Helper to get sender info with fallback
  const getSenderInfo = (message: Message): { id: number; name: string; role: string; avatar?: string } => {
    if (message.sender) {
      return {
        ...message.sender,
        avatar: (message.sender as any).avatar,
      };
    }
    return {
      id: 0,
      name: "Admin",
      role: "superadmin",
      avatar: undefined,
    };
  };

  return (
    <PageWrapper
      title="Messages"
      breadcrumbs={[{ label: "Messages" }]}
    >
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            {/* <h1 className="text-3xl font-bold tracking-tight text-foreground">Messages</h1> */}
            {/* <p className="text-muted-foreground mt-1">
              {canSendMessages
                ? "Send messages to counsellors"
                : "View messages from administrators"}
            </p> */}
          </div>
          {/* <div className="flex items-center gap-4">
            <ConnectionStatus />
            {canSendMessages && (
              <BroadcastDialog>
                <Button className="gap-2">
                  <Send className="w-4 h-4" />
                  Send Broadcast
                </Button>
              </BroadcastDialog>
            )}
          </div> */}
        </div>

        {/* Tabs for Inbox and Notifications */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="inbox">
              Inbox
              {unreadCount > 0 && (
                <Badge variant="secondary" className="ml-2 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs">
                  {unreadCount}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="notifications">
              Notifications
              {canApprovePayments && pendingApprovals.length > 0 && (
                <Badge variant="secondary" className="ml-2 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs bg-orange-500 text-white">
                  {pendingApprovals.length}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          {/* Inbox Tab Content */}
          <TabsContent value="inbox" className="mt-6">
            {/* Messages List */}
        {isAdmin ? (
          <Card className="border-none shadow-card bg-card rounded-xl overflow-hidden">
                <CardHeader className="px-6 py-5 border-b border-border/40">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-lg font-bold text-foreground flex items-center gap-2">
                        <Megaphone className="w-5 h-5 text-primary" />
                        Inbox
                      </CardTitle>
                <CardDescription className="mt-1">
                  {unreadCount > 0 && (
                    <span className="text-primary font-semibold">
                      {unreadCount} unread message{unreadCount !== 1 ? "s" : ""}
                    </span>
                  )}
                  {unreadCount === 0 && "No unread messages"}
                  {queueLength > 0 && (
                    <span className="ml-2 text-orange-600 dark:text-orange-400">
                      • {queueLength} pending acknowledgment
                    </span>
                  )}
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : filteredMessages.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Megaphone className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p className="text-lg font-medium">No messages yet</p>
                <p className="text-sm mt-1">
                  {isAdmin
                    ? "Start by sending a message to counsellors"
                    : "You don't have any messages at the moment"}
                </p>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {filteredMessages.map((message) => (
                  <div
                    key={message.id}
                    className={`p-6 hover:bg-muted/50 transition-colors cursor-pointer ${
                      (!message.read && !message.acknowledged) ? "bg-primary/5 border-l-4 border-l-primary" : ""
                    }`}
                    onClick={async () => {
                      setSelectedMessage(message);
                      setIsDialogOpen(true);
                      // Admins cannot acknowledge messages (they sent them), so skip acknowledgment
                      if (!isAdmin && !message.read && !message.acknowledged) {
                        handleMarkAsRead(message.id);
                      }
                      // Fetch acknowledgment status when message is opened
                      if (isAdmin) {
                        setIsLoadingAckStatus(true);
                        try {
                          const status = await clientService.getMessageStatus(message.id);
                          // Calculate counts if backend doesn't provide them
                          if (status) {
                            const acknowledgedCount = status.acknowledgedCount ?? (status.acknowledgments?.length || 0);
                            const totalRecipients = status.totalRecipients ?? 0;
                            const pendingCount = status.pendingCount ?? (totalRecipients - acknowledgedCount);

                            setAckStatus({
                              ...status,
                              acknowledgedCount,
                              pendingCount,
                              totalRecipients: totalRecipients || acknowledgedCount, // Fallback to acknowledged count if total is 0
                            });
                          } else {
                            setAckStatus(null);
                          }
                        } catch (error) {
                          console.error("Failed to fetch acknowledgment status:", error);
                          setAckStatus(null);
                        } finally {
                          setIsLoadingAckStatus(false);
                        }
                      }
                    }}
                  >
                    <div className="flex items-start gap-4">
                      <Avatar className="h-10 w-10 border-2 border-border">
                        <AvatarImage src={getSenderInfo(message).avatar || undefined} alt={getSenderInfo(message).name} />
                        <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                          {getSenderInfo(message).name
                            .split(" ")
                            .map((n) => n[0])
                            .join("")
                            .toUpperCase()
                            .slice(0, 2)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <h3 className="font-semibold text-foreground">
                                {message.title || "New Message"}
                              </h3>
                              <Badge
                                variant="outline"
                                className={`text-xs ${getPriorityStyles(message.priority)}`}
                              >
                                <span className="flex items-center gap-1">
                                  {getTypeIcon(message.type, message.priority)}
                                  {message.priority.charAt(0).toUpperCase() + message.priority.slice(1)}
                                </span>
                              </Badge>
                              {message.type === 'broadcast' && (
                                <Badge variant="outline" className="text-xs">
                                  Broadcast
                                </Badge>
                              )}
                              {message.type === 'individual' && (
                                <Badge variant="outline" className="text-xs">
                                  Direct
                                </Badge>
                              )}
                              {(!message.read && !message.acknowledged) && (
                                <span className="w-2 h-2 rounded-full bg-primary" />
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground line-clamp-2">
                              {message.message}
                            </p>
                            <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <span className="font-medium">{getSenderInfo(message).name}</span>
                                <span>•</span>
                                <span>{getSenderInfo(message).role}</span>
                              </span>
                              <span>•</span>
                              <span className="flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                {format(new Date(message.createdAt), "MMM d, yyyy 'at' h:mm a")}
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {(message.read || message.acknowledged) ? (
                              <CheckCircle2 className="w-4 h-4 text-muted-foreground" />
                            ) : (
                              <div className="w-2 h-2 rounded-full bg-primary" />
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
        ) : (
          <Card className="border-none shadow-card bg-card rounded-xl overflow-hidden">
            <CardHeader className="px-6 py-5 border-b border-border/40">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg font-bold text-foreground flex items-center gap-2">
                    <Megaphone className="w-5 h-5 text-primary" />
                    Inbox
                  </CardTitle>
                  <CardDescription className="mt-1">
                    {unreadCount > 0 && (
                      <span className="text-primary font-semibold">
                        {unreadCount} unread message{unreadCount !== 1 ? "s" : ""}
                      </span>
                    )}
                    {unreadCount === 0 && "No unread messages"}
                    {queueLength > 0 && (
                      <span className="ml-2 text-orange-600 dark:text-orange-400">
                        • {queueLength} pending acknowledgment
                      </span>
                    )}
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                </div>
              ) : filteredMessages.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Megaphone className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p className="text-lg font-medium">No messages yet</p>
                  <p className="text-sm mt-1">
                    You don't have any messages at the moment
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {filteredMessages.map((message) => (
                    <div
                      key={message.id}
                      className={`p-6 hover:bg-muted/50 transition-colors cursor-pointer ${
                        (!message.read && !message.acknowledged) ? "bg-primary/5 border-l-4 border-l-primary" : ""
                      }`}
                      onClick={async () => {
                        setSelectedMessage(message);
                        setIsDialogOpen(true);
                        if (!message.read && !message.acknowledged) {
                          handleMarkAsRead(message.id);
                        }
                        // Fetch acknowledgment status when message is opened (for admins viewing)
                        if (isAdmin) {
                          setIsLoadingAckStatus(true);
                          try {
                            const status = await clientService.getMessageStatus(message.id);
                            // Calculate counts if backend doesn't provide them
                            if (status) {
                              const acknowledgedCount = status.acknowledgedCount ?? (status.acknowledgments?.length || 0);
                              const totalRecipients = status.totalRecipients ?? 0;
                              const pendingCount = status.pendingCount ?? (totalRecipients - acknowledgedCount);

                              setAckStatus({
                                ...status,
                                acknowledgedCount,
                                pendingCount,
                                totalRecipients: totalRecipients || acknowledgedCount, // Fallback to acknowledged count if total is 0
                              });
                            } else {
                              setAckStatus(null);
                            }
                          } catch (error) {
                            console.error("Failed to fetch acknowledgment status:", error);
                            setAckStatus(null);
                          } finally {
                            setIsLoadingAckStatus(false);
                          }
                        }
                      }}
                    >
                      <div className="flex items-start gap-4">
                        <Avatar className="h-10 w-10 border-2 border-border">
                          <AvatarImage src={getSenderInfo(message).avatar || undefined} alt={getSenderInfo(message).name} />
                          <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                            {getSenderInfo(message).name
                              .split(" ")
                              .map((n) => n[0])
                              .join("")
                              .toUpperCase()
                              .slice(0, 2)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <h3 className="font-semibold text-foreground">
                                  {message.title || "New Message"}
                                </h3>
                                <Badge
                                  variant="outline"
                                  className={`text-xs ${getPriorityStyles(message.priority)}`}
                                >
                                  <span className="flex items-center gap-1">
                                    {getTypeIcon(message.type, message.priority)}
                                    {message.priority.charAt(0).toUpperCase() + message.priority.slice(1)}
                                  </span>
                                </Badge>
                                {message.type === 'broadcast' && (
                                  <Badge variant="outline" className="text-xs">
                                    Broadcast
                                  </Badge>
                                )}
                                {message.type === 'individual' && (
                                  <Badge variant="outline" className="text-xs">
                                    Direct
                                  </Badge>
                                )}
                                {(!message.read && !message.acknowledged) && (
                                  <span className="w-2 h-2 rounded-full bg-primary" />
                                )}
                              </div>
                              <p className="text-sm text-muted-foreground line-clamp-2">
                                {message.message}
                              </p>
                              <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                                <span className="flex items-center gap-1">
                                  <span className="font-medium">{getSenderInfo(message).name}</span>
                                  <span>•</span>
                                  <span>{getSenderInfo(message).role}</span>
                                </span>
                                <span>•</span>
                                <span className="flex items-center gap-1">
                                  <Clock className="w-3 h-3" />
                                  {format(new Date(message.createdAt), "MMM d, yyyy 'at' h:mm a")}
                                </span>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              {(message.read || message.acknowledged) ? (
                                <CheckCircle2 className="w-4 h-4 text-muted-foreground" />
                              ) : (
                                <div className="w-2 h-2 rounded-full bg-primary" />
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}
          </TabsContent>

          {/* Notifications Tab Content */}
          <TabsContent value="notifications" className="mt-6">
            {canApprovePayments ? (
              pendingApprovals.length > 0 ? (
                <Card className="border-none shadow-card bg-card rounded-xl overflow-hidden">
                  <CardHeader className="px-6 py-5 border-b border-border/40">
                    <CardTitle className="text-lg font-bold text-foreground flex items-center gap-2">
                      <ShieldAlert className="w-5 h-5 text-orange-500" />
                      Pending Approvals
                    </CardTitle>
                    <CardDescription>All Finance & Employment payments awaiting approval</CardDescription>
                  </CardHeader>
                  <CardContent className="p-6">
                    <div className="space-y-4">
                      {pendingApprovals.map((approval: any) => (
                        <div
                          key={approval.financeId}
                          className="flex items-center justify-between p-4 bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-800 rounded-lg"
                        >
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <Badge variant="outline" className="bg-orange-100 text-orange-700 border-orange-300 dark:bg-orange-900/30 dark:text-orange-300 dark:border-orange-800">
                                Pending
                              </Badge>
                              {approval.client && (
                                <span className="font-semibold text-foreground">
                                  {approval.client.fullName}
                                </span>
                              )}
                            </div>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                              <div>
                                <span className="text-muted-foreground">Amount:</span>
                                <p className="font-semibold text-foreground">${approval.amount || "N/A"}</p>
                              </div>
                              <div>
                                <span className="text-muted-foreground">Payment Date:</span>
                                <p className="font-medium text-foreground">
                                  {approval.paymentDate ? new Date(approval.paymentDate).toLocaleDateString() : "N/A"}
                                </p>
                              </div>
                              {approval.invoiceNo && (
                                <div>
                                  <span className="text-muted-foreground">Invoice No:</span>
                                  <p className="font-medium text-foreground">{approval.invoiceNo}</p>
                                </div>
                              )}
                              {approval.counsellor && (
                                <div>
                                  <span className="text-muted-foreground">Counsellor:</span>
                                  <p className="font-medium text-foreground">{approval.counsellor.fullName}</p>
                                </div>
                              )}
                            </div>
                            {approval.remarks && (
                              <div className="mt-2">
                                <span className="text-muted-foreground text-sm">Remarks: </span>
                                <span className="text-foreground text-sm">{approval.remarks}</span>
                              </div>
                            )}
                          </div>
                          <div className="flex items-center gap-2 ml-4">
                            <Button
                              size="sm"
                              variant="default"
                              className="bg-green-600 hover:bg-green-700"
                              onClick={() => handleApprove(approval.financeId)}
                              disabled={processingApproval === approval.financeId}
                            >
                              {processingApproval === approval.financeId ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <CheckCircle2 className="w-4 h-4 mr-1" />
                              )}
                              Approve
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => handleReject(approval.financeId)}
                              disabled={processingApproval === approval.financeId}
                            >
                              {processingApproval === approval.financeId ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <XCircle className="w-4 h-4 mr-1" />
                              )}
                              Reject
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <Card className="border-none shadow-card bg-card rounded-xl overflow-hidden">
                  <CardContent className="p-12 text-center">
                    <ShieldAlert className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                    <p className="text-lg font-medium text-foreground">No Pending Approvals</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      All payments have been processed
                    </p>
                  </CardContent>
                </Card>
              )
            ) : (
              <Card className="border-none shadow-card bg-card rounded-xl overflow-hidden">
                <CardContent className="p-12 text-center">
                  <ShieldAlert className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                  <p className="text-lg font-medium text-foreground">Access Restricted</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    You don't have permission to view approvals
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Message Detail Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          {selectedMessage && (
            <>
              <DialogHeader>
                <div className="flex items-center gap-2 mb-2">
                  <Badge
                    variant="outline"
                    className={`${getPriorityStyles(selectedMessage.priority)}`}
                  >
                    <span className="flex items-center gap-1">
                      {getTypeIcon(selectedMessage.type, selectedMessage.priority)}
                      {selectedMessage.priority.charAt(0).toUpperCase() + selectedMessage.priority.slice(1)}
                    </span>
                  </Badge>
                </div>
                <DialogTitle className="text-xl">
                  {selectedMessage.title || "New Message"}
                </DialogTitle>
                <DialogDescription className="flex items-center gap-4 pt-2">
                  <span className="flex items-center gap-2">
                    <Avatar className="h-6 w-6">
                      <AvatarImage src={getSenderInfo(selectedMessage).avatar || undefined} alt={getSenderInfo(selectedMessage).name} />
                      <AvatarFallback className="text-xs">
                        {getSenderInfo(selectedMessage).name
                          .split(" ")
                          .map((n) => n[0])
                          .join("")
                          .toUpperCase()
                          .slice(0, 2)}
                      </AvatarFallback>
                    </Avatar>
                    <span className="font-medium">{getSenderInfo(selectedMessage).name}</span>
                    <span className="text-muted-foreground">•</span>
                    <span>{getSenderInfo(selectedMessage).role}</span>
                  </span>
                  <span className="text-muted-foreground">•</span>
                  <span className="flex items-center gap-1 text-sm">
                    <Clock className="w-3 h-3" />
                    {format(new Date(selectedMessage.createdAt), "MMM d, yyyy 'at' h:mm a")}
                  </span>
                </DialogDescription>
              </DialogHeader>
              <div className="py-4">
                <p className="text-foreground leading-relaxed whitespace-pre-wrap">
                  {selectedMessage.message}
                </p>
              </div>

              {/* Acknowledgment Status - Show for admins */}
              {isAdmin && (
                <div className="border-t pt-4 mt-4">
                  <h4 className="font-semibold mb-3 text-foreground">Acknowledgment Status</h4>
                  {isLoadingAckStatus ? (
                    <div className="flex items-center justify-center py-4">
                      <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                    </div>
                  ) : ackStatus ? (
                    <>
                      <div className="grid grid-cols-3 gap-4 mb-4">
                        <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg">
                          <div className="text-sm text-muted-foreground">Total Recipients</div>
                          <div className="text-2xl font-bold">{ackStatus.totalRecipients}</div>
                        </div>
                        <div className="bg-green-50 dark:bg-green-900/20 p-3 rounded-lg">
                          <div className="text-sm text-muted-foreground">Acknowledged</div>
                          <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                            {ackStatus.acknowledgedCount}
                          </div>
                        </div>
                        <div className="bg-orange-50 dark:bg-orange-900/20 p-3 rounded-lg">
                          <div className="text-sm text-muted-foreground">Pending</div>
                          <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                            {ackStatus.pendingCount}
                          </div>
                        </div>
                      </div>
                      {ackStatus.acknowledgments && ackStatus.acknowledgments.length > 0 && (
                        <div>
                          <h5 className="font-medium mb-3 text-foreground">Acknowledged By:</h5>
                          <div className="space-y-2 max-h-60 overflow-y-auto">
                            {ackStatus.acknowledgments.map((ack) => (
                              <div
                                key={ack.id}
                                className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg hover:bg-muted transition-colors"
                              >
                                <Avatar className="h-10 w-10 border-2 border-border">
                                  <AvatarImage
                                    src={(ack.user as any)?.avatar || undefined}
                                    alt={(() => {
                                      const userName = ack.user?.name ||
                                                       (ack.user as any)?.fullname ||
                                                       (ack as any)?.userName ||
                                                       (ack as any)?.name ||
                                                       (ack.user as any)?.fullName ||
                                                       'Unknown User';
                                      return userName;
                                    })()}
                                  />
                                  <AvatarFallback className="bg-primary/10 text-primary font-semibold text-sm">
                                    {(() => {
                                      const userName = ack.user?.name ||
                                                       (ack.user as any)?.fullname ||
                                                       (ack as any)?.userName ||
                                                       (ack as any)?.name ||
                                                       (ack.user as any)?.fullName ||
                                                       'Unknown User';
                                      return userName
                                        .split(" ")
                                        .map((n: string) => n[0])
                                        .join("")
                                        .toUpperCase()
                                        .slice(0, 2);
                                    })()}
                                  </AvatarFallback>
                                </Avatar>
                                <div className="flex-1 min-w-0">
                                  <div className="font-medium text-sm text-foreground">
                                    {(() => {
                                      // Try multiple possible field names for user name
                                      const userName = ack.user?.name ||
                                                       (ack.user as any)?.fullname ||
                                                       (ack as any)?.userName ||
                                                       (ack as any)?.name ||
                                                       (ack.user as any)?.fullName ||
                                                       'Unknown User';
                                      return userName;
                                    })()}
                                  </div>
                                  <div className="text-xs text-muted-foreground">
                                    {(() => {
                                      // Try multiple possible field names for role
                                      const role = (ack.user as any)?.role ||
                                                   (ack as any)?.userRole ||
                                                   (ack.user as any)?.userRole ||
                                                   'counsellor'; // Default to counsellor since these are message recipients
                                      return role.charAt(0).toUpperCase() + role.slice(1);
                                    })()} • {format(new Date(ack.acknowledgedAt), "MMM d, h:mm a")}
                                  </div>
                                </div>
                                <Badge variant="outline" className="text-xs capitalize">
                                  {ack.acknowledgmentMethod === 'button' ? 'Button' :
                                   ack.acknowledgmentMethod === 'timer' ? 'Timer' :
                                   (ack as any)?.method === 'button' ? 'Button' :
                                   (ack as any)?.method === 'timer' ? 'Timer' :
                                   'Acknowledged'}
                                </Badge>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </>
                  ) : (
                    <p className="text-sm text-muted-foreground">No acknowledgment data available</p>
                  )}
                </div>
              )}

              <DialogFooter>
                <Button variant="outline" onClick={() => {
                  setIsDialogOpen(false);
                  setAckStatus(null);
                }}>
                  Close
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </PageWrapper>
  );
}
