import { PageWrapper } from "@/layout/PageWrapper";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect, useMemo, useRef } from "react";
import { Trophy, Target, TrendingUp, Plus, Pencil, Trash2, Calendar, Loader2 } from "lucide-react";
import { clientService } from "@/services/clientService";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format } from "date-fns";
import { useAuth } from "@/context/auth-context";
import { useSocket } from "@/context/socket-context";

interface CounsellorTarget {
  id: string;
  counsellorId: number;
  counsellorName: string;
  month: string; // Format: "2026-01"
  target: number; // Number of clients to enroll
}

interface CounsellorData {
  id: number;
  name: string;
  email?: string;
  currentClients: number;
  currentRevenue: number;
  target: number;
  progress: number;
  targetId?: string | number | null;
}

export default function CounsellorLeaderboard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { socket, isConnected } = useSocket();
  const queryClient = useQueryClient();

  // Check if manager is supervisor (supervisor managers see all counsellors)
  const isManager = user?.role === 'manager';
  const isSupervisor = isManager && user?.isSupervisor === true;
  const [selectedMonth, setSelectedMonth] = useState<string>(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTarget, setEditingTarget] = useState<CounsellorTarget | null>(null);
  const [targetForm, setTargetForm] = useState({
    counsellorId: "",
    counsellorName: "",
    month: selectedMonth,
    target: ""
  });

  // State for preventing multiple clicks
  const [isSubmitting, setIsSubmitting] = useState(false);
  const requestInFlightRef = useRef(false);

  // Parse month and year from selectedMonth (format: "2026-01")
  const [month, year] = useMemo(() => {
    const [y, m] = selectedMonth.split('-').map(Number);
    return [m, y];
  }, [selectedMonth]);

  // Fetch leaderboard data from API
  const { data: leaderboardData, isLoading: isLoadingLeaderboard, error: leaderboardError } = useQuery({
    queryKey: ['leaderboard', month, year],
    queryFn: () => clientService.getLeaderboard(month, year),
    staleTime: 1000 * 60 * 2, // Cache for 2 minutes
    enabled: !!user && !!month && !!year,
  });

  // Fetch counsellors (for dropdown in Set Target dialog)
  const { data: counsellorsData, isLoading: isLoadingCounsellors } = useQuery({
    queryKey: ['counsellors'],
    queryFn: () => clientService.getCounsellors()
  });

  // WebSocket listener for leaderboard updates
  useEffect(() => {
    if (!socket || !isConnected) {
      console.log('[CounsellorLeaderboard] Socket not available, skipping socket listeners');
      return;
    }

    console.log('[CounsellorLeaderboard] Setting up socket event listeners for leaderboard');

    const handleLeaderboardUpdated = (data: {
      action: "CREATED" | "UPDATED";
      target: any;
      leaderboard: any[];
      summary: any;
      month: number;
      year: number;
    }) => {
      console.log('[CounsellorLeaderboard] Received leaderboard:updated event:', data);

      // Only update if the event is for the currently selected month/year
      if (data.month === month && data.year === year) {
        // Update React Query cache with new leaderboard data
        if (data.leaderboard) {
          queryClient.setQueryData(['leaderboard', month, year], data.leaderboard);
          console.log('[CounsellorLeaderboard] ✅ Updated leaderboard cache with', data.leaderboard.length, 'counsellors');
        }

        // Show toast notification
        toast({
          title: data.action === "CREATED" ? "Target Set" : "Target Updated",
          description: `Target ${data.action === "CREATED" ? "set" : "updated"} successfully.`,
        });
      } else {
        console.log('[CounsellorLeaderboard] Event is for different month/year, ignoring');
      }
    };

    // Register event listener
    socket.on('leaderboard:updated', handleLeaderboardUpdated);
    console.log('[CounsellorLeaderboard] ✅ Socket event listener registered: leaderboard:updated');

    // Cleanup on unmount
    return () => {
      console.log('[CounsellorLeaderboard] Cleaning up socket event listeners');
      socket.off('leaderboard:updated', handleLeaderboardUpdated);
    };
  }, [socket, isConnected, queryClient, toast, month, year]);

  // API returns { data, summary }; support legacy shape where leaderboardData was the array
  const listFromApi = Array.isArray(leaderboardData) ? leaderboardData : leaderboardData?.data;
  const summaryFromApi = leaderboardData && !Array.isArray(leaderboardData) ? leaderboardData.summary : undefined;

  // Transform API leaderboard data to component format
  const transformedLeaderboardData: CounsellorData[] = useMemo(() => {
    if (!listFromApi || !Array.isArray(listFromApi)) return [];

    return listFromApi.map((item: any) => {
      // API returns flat structure: counsellorId, fullName, email, enrollments (string), revenue, target, targetId
      const counsellorId = item.counsellorId;
      const targetValue = Number(item.target) || 0;
      const currentClients = Number(item.enrollments) || 0;
      const currentRevenue = Number(item.revenue) || 0;
      const progress = targetValue > 0 ? (currentClients / targetValue) * 100 : 0;

      return {
        id: counsellorId,
        name: item.fullName || 'Unknown',
        email: item.email,
        currentClients,
        currentRevenue,
        target: targetValue,
        progress: Math.min(progress, 100),
        targetId: item.targetId || null
      };
    }).sort((a, b) => {
      if (b.currentClients !== a.currentClients) {
        return b.currentClients - a.currentClients;
      }
      return b.currentRevenue - a.currentRevenue;
    });
  }, [listFromApi]);

  // Use API summary when available (GET /api/leaderboard returns summary); otherwise compute from list
  const summary: { totalCounsellors: number; totalEnrollments: number; totalRevenue: number } = useMemo(() => {
    if (summaryFromApi && typeof summaryFromApi.totalCounsellors === 'number') {
      return {
        totalCounsellors: summaryFromApi.totalCounsellors,
        totalEnrollments: summaryFromApi.totalEnrollments ?? 0,
        totalRevenue: summaryFromApi.totalRevenue ?? 0
      };
    }
    if (!transformedLeaderboardData || transformedLeaderboardData.length === 0) {
      return { totalCounsellors: 0, totalEnrollments: 0, totalRevenue: 0 };
    }
    return {
      totalCounsellors: transformedLeaderboardData.length,
      totalEnrollments: transformedLeaderboardData.reduce((sum, c) => sum + c.currentClients, 0),
      totalRevenue: transformedLeaderboardData.reduce((sum, c) => sum + c.currentRevenue, 0)
    };
  }, [summaryFromApi, transformedLeaderboardData]);

  // Generate month options (current month and next 11 months)
  const monthOptions = useMemo(() => {
    const options = [];
    const now = new Date();
    for (let i = 0; i < 12; i++) {
      const date = new Date(now.getFullYear(), now.getMonth() + i, 1);
      const value = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const label = format(date, 'MMMM yyyy');
      options.push({ value, label });
    }
    return options;
  }, []);

  const handleOpenDialog = (target?: CounsellorTarget) => {
    if (target) {
      setEditingTarget(target);
      setTargetForm({
        counsellorId: String(target.counsellorId),
        counsellorName: target.counsellorName,
        month: target.month,
        target: String(target.target)
      });
    } else {
      setEditingTarget(null);
      setTargetForm({
        counsellorId: "",
        counsellorName: "",
        month: selectedMonth,
        target: ""
      });
    }
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingTarget(null);
    setTargetForm({
      counsellorId: "",
      counsellorName: "",
      month: selectedMonth,
      target: ""
    });
  };

  const handleSaveTarget = async () => {
    // ✅ Prevent multiple clicks
    if (isSubmitting || requestInFlightRef.current) {
      console.log('[CounsellorLeaderboard] Request already in progress, ignoring click');
      return;
    }

    if (!targetForm.counsellorId || !targetForm.target || !targetForm.month) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields",
        variant: "destructive"
      });
      return;
    }

    const targetValue = parseInt(targetForm.target);
    if (isNaN(targetValue) || targetValue < 0) {
      toast({
        title: "Validation Error",
        description: "Target must be a valid positive number",
        variant: "destructive"
      });
      return;
    }

    // Parse month and year from targetForm.month (format: "2026-01")
    const [year, monthNum] = targetForm.month.split('-').map(Number);
    const counsellorId = parseInt(targetForm.counsellorId);

    // ✅ Set submitting state immediately
    setIsSubmitting(true);
    requestInFlightRef.current = true;

    try {
      // Call API to set target
      await clientService.setTarget(counsellorId, targetValue, monthNum, year);

      // Show success toast
      toast({
        title: editingTarget ? "Target Updated" : "Target Set",
        description: `Target ${editingTarget ? "updated" : "set"} for ${targetForm.counsellorName}`,
      });

      // Invalidate and refetch leaderboard data
      queryClient.invalidateQueries({ queryKey: ['leaderboard', monthNum, year] });

      // Close dialog
      handleCloseDialog();
    } catch (error: any) {
      console.error("Failed to set target:", error);
      const errorMessage = error.response?.data?.message || error.message || "Failed to set target";
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive"
      });
    } finally {
      // ✅ Always reset submitting state
      setIsSubmitting(false);
      requestInFlightRef.current = false;
    }
  };

  const handleDeleteTarget = async (targetId: string) => {
    // Note: Backend doesn't have delete endpoint, so this might need to be implemented
    // For now, we can set target to 0 or remove from UI only
    toast({
      title: "Delete Target",
      description: "Delete functionality not yet implemented. Set target to 0 to remove.",
      variant: "destructive"
    });
  };

  const getRankIcon = (index: number) => {
    if (index === 0) return <Trophy className="w-5 h-5 text-yellow-500" />;
    if (index === 1) return <Trophy className="w-5 h-5 text-gray-400" />;
    if (index === 2) return <Trophy className="w-5 h-5 text-orange-500" />;
    return <span className="text-muted-foreground font-bold">#{index + 1}</span>;
  };

  const getProgressColor = (progress: number) => {
    if (progress >= 100) return "bg-green-500";
    if (progress >= 75) return "bg-blue-500";
    if (progress >= 50) return "bg-yellow-500";
    return "bg-red-500";
  };

  if (isLoadingCounsellors || isLoadingLeaderboard) {
    return (
      <PageWrapper title="Counsellor Leaderboard" breadcrumbs={[{ label: "Leaderboard" }]}>
        <div className="flex items-center justify-center h-64">
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
            <div className="text-muted-foreground">Loading leaderboard...</div>
          </div>
        </div>
      </PageWrapper>
    );
  }

  if (leaderboardError) {
    return (
      <PageWrapper title="Counsellor Leaderboard" breadcrumbs={[{ label: "Leaderboard" }]}>
        <div className="flex items-center justify-center h-64">
          <div className="text-destructive">Error loading leaderboard. Please try again.</div>
        </div>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper
      title="Counsellor Leaderboard"
      breadcrumbs={[{ label: "Leaderboard" }]}
      actions={
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full sm:w-auto">
          <Select value={selectedMonth} onValueChange={setSelectedMonth}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <Calendar className="w-4 h-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {monthOptions.map(option => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => handleOpenDialog()} className="w-full sm:w-auto whitespace-nowrap">
                <Plus className="w-4 h-4 mr-2" />
                Set Target
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editingTarget ? 'Edit Target' : 'Set Target'}</DialogTitle>
                <DialogDescription>
                  Set monthly enrollment target for a counsellor
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="counsellor">Counsellor</Label>
                  <Select
                    value={targetForm.counsellorId}
                    onValueChange={(value) => {
                      const counsellor = counsellorsData?.find((c: any) => String(c.id || c.userId) === value);
                      setTargetForm({
                        ...targetForm,
                        counsellorId: value,
                        counsellorName: counsellor?.name || counsellor?.fullName || ''
                      });
                    }}
                    disabled={!!editingTarget}
                  >
                    <SelectTrigger id="counsellor">
                      <SelectValue placeholder="Select counsellor" />
                    </SelectTrigger>
                    <SelectContent>
                      {counsellorsData?.map((counsellor: any) => (
                        <SelectItem key={counsellor.id || counsellor.userId} value={String(counsellor.id || counsellor.userId)}>
                          {counsellor.name || counsellor.fullName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="month">Month</Label>
                  <Select
                    value={targetForm.month}
                    onValueChange={(value) => setTargetForm({ ...targetForm, month: value })}
                  >
                    <SelectTrigger id="month">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {monthOptions.map(option => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="target">Target (Number of Clients)</Label>
                  <Input
                    id="target"
                    type="number"
                    min="0"
                    value={targetForm.target}
                    onChange={(e) => setTargetForm({ ...targetForm, target: e.target.value })}
                    placeholder="Enter target number"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={handleCloseDialog}
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSaveTarget}
                  disabled={isSubmitting}
                  className={isSubmitting ? 'opacity-50 cursor-not-allowed' : ''}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      {editingTarget ? 'Updating...' : 'Creating...'}
                    </>
                  ) : (
                    editingTarget ? 'Update' : 'Create'
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      }
    >
      <div className="space-y-6">
        {/* Summary Cards */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Counsellors</CardTitle>
              <Target className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{summary.totalCounsellors}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Client Enrollments</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {summary.totalEnrollments}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                ₹{summary.totalRevenue.toLocaleString()}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Leaderboard */}
        <Card>
          <CardHeader>
            <CardTitle>Leaderboard - {format(new Date(selectedMonth + '-01'), 'MMMM yyyy')}</CardTitle>
            <CardDescription>Ranked by number of clients enrolled</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {transformedLeaderboardData.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No counsellors found
                </div>
              ) : (
                transformedLeaderboardData.map((counsellor: CounsellorData, index: number) => (
                  <div
                    key={counsellor.id}
                    className="flex flex-col sm:flex-row items-start sm:items-center gap-4 p-4 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
                  >
                    {/* Rank */}
                    <div className="flex items-center justify-center w-12 h-12 rounded-full bg-muted shrink-0">
                      {getRankIcon(index)}
                    </div>

                    {/* Avatar & Name */}
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <Avatar className="h-10 w-10 shrink-0">
                        <AvatarFallback>
                          {counsellor.name.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold truncate">{counsellor.name}</div>
                        {counsellor.email && (
                          <div className="text-sm text-muted-foreground truncate">{counsellor.email}</div>
                        )}
                      </div>
                    </div>

                    {/* Achievement */}
                    <div className="text-center min-w-[100px] sm:min-w-[120px]">
                      <div className="text-2xl font-bold">{counsellor.currentClients}</div>
                      <div className="text-xs text-muted-foreground">Clients</div>
                    </div>

                    {/* Revenue */}
                    <div className="text-center min-w-[100px] sm:min-w-[120px]">
                      <div className="text-lg font-semibold">₹{counsellor.currentRevenue.toLocaleString()}</div>
                      <div className="text-xs text-muted-foreground">Revenue</div>
                    </div>

                    {/* Target & Progress */}
                    <div className="min-w-[180px] sm:min-w-[200px] flex-1">
                      {counsellor.target > 0 ? (
                        <div className="space-y-2">
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">Target: {counsellor.target}</span>
                            <span className={`font-semibold shrink-0 ml-2 ${(counsellor.progress || 0) >= 100 ? 'text-green-600' : ''}`}>
                              {(counsellor.progress || 0).toFixed(1)}%
                            </span>
                          </div>
                          <Progress value={counsellor.progress || 0} className="h-2" />
                        </div>
                      ) : (
                        <div className="text-sm text-muted-foreground">No target set</div>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 shrink-0 ml-auto sm:ml-0">
                      {counsellor.targetId && (
                        <>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-9 w-9"
                            onClick={() => {
                              // Find target from API data
                              const targetItem = listFromApi?.find((item: any) =>
                                item.counsellorId === counsellor.id
                              );
                              if (targetItem) {
                                handleOpenDialog({
                                  id: String(targetItem.targetId || counsellor.targetId || ''),
                                  counsellorId: counsellor.id,
                                  counsellorName: counsellor.name,
                                  month: selectedMonth,
                                  target: counsellor.target || 0
                                });
                              }
                            }}
                          >
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-9 w-9"
                            onClick={() => {
                              if (counsellor.targetId) handleDeleteTarget(String(counsellor.targetId));
                            }}
                          >
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </Button>
                        </>
                      )}
                      {!counsellor.targetId && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="whitespace-nowrap"
                          onClick={() => {
                            handleOpenDialog();
                            setTargetForm({
                              counsellorId: String(counsellor.id),
                              counsellorName: counsellor.name,
                              month: selectedMonth,
                              target: ''
                            });
                          }}
                        >
                          <Target className="w-4 h-4 mr-2" />
                          Set Target
                        </Button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </PageWrapper>
  );
}
