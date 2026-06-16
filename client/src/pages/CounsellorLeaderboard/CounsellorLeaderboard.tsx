import { PageWrapper } from "@/layout/PageWrapper";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect, useMemo, useRef } from "react";
import { Trophy, Target, TrendingUp, Plus, Pencil, Trash2, Calendar, Loader2 } from "lucide-react";
import { CounsellorLeaderboardSkeleton } from "@/components/ui/page-skeletons";
import { clientService } from "@/services/clientService";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format } from "date-fns";
import { useAuth } from "@/context/auth-context";
import { useSocket } from "@/context/socket-context";
import { cn } from "@/lib/utils";

interface CounsellorTarget {
  id: string;
  counsellorId: number;
  counsellorName: string;
  month: string;
  target: number;
  categoryName: string;
  applicationTarget?: number | null;
  finalStudentTarget?: number | null;
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
  categoryName: string;
  // student-specific
  studentAppCount?: number;
  finalStudentCount?: number;
  applicationTarget?: number | null;
  finalStudentTarget?: number | null;
}

// Capitalize first letter
function capitalize(s: string | undefined | null) {
  if (!s) return "";
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export default function CounsellorLeaderboard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { socket, isConnected } = useSocket();
  const queryClient = useQueryClient();

  const [selectedMonth, setSelectedMonth] = useState<string>(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [selectedCategory, setSelectedCategory] = useState<string>("general");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTarget, setEditingTarget] = useState<CounsellorTarget | null>(null);
  const [targetForm, setTargetForm] = useState({
    counsellorId: "",
    counsellorName: "",
    month: selectedMonth,
    target: "",
    categoryName: "general",
    applicationTarget: "",
    finalStudentTarget: "",
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const requestInFlightRef = useRef(false);
  const [deleteConfirm, setDeleteConfirm] = useState<{ open: boolean; targetId: string; counsellorName: string }>({
    open: false, targetId: "", counsellorName: "",
  });
  const [isDeleting, setIsDeleting] = useState(false);

  const [month, year] = useMemo(() => {
    const [y, m] = selectedMonth.split('-').map(Number);
    return [m, y];
  }, [selectedMonth]);

  const [formMonth, formYear] = useMemo(() => {
    const [y, m] = (targetForm.month || selectedMonth).split('-').map(Number);
    return [m, y];
  }, [targetForm.month, selectedMonth]);

  // Fetch categories from DB
  const { data: categoriesData = [] } = useQuery({
    queryKey: ['leaderboard-categories'],
    queryFn: () => clientService.getLeaderboardCategories(),
    staleTime: 1000 * 60 * 10,
  });

  // Build tab list: General first, then DB categories (filter out any with missing name)
  const tabs = useMemo(() => {
    return [
      { id: "general", label: "General" },
      ...categoriesData
        .filter((c) => c?.name)
        .map((c) => ({ id: c.name.toLowerCase(), label: capitalize(c.name) })),
    ];
  }, [categoriesData]);

  const { data: leaderboardData, isLoading: isLoadingLeaderboard, error: leaderboardError } = useQuery({
    queryKey: ['leaderboard', month, year, selectedCategory],
    queryFn: () => clientService.getLeaderboard(month, year, selectedCategory),
    staleTime: 1000 * 60 * 2,
    enabled: !!user && !!month && !!year,
  });

  const { data: counsellorsData, isLoading: isLoadingCounsellors } = useQuery({
    queryKey: ['leaderboard-counsellors'],
    queryFn: () => clientService.getLeaderboardCounsellors(),
  });

  // Targets for the dialog month — month derived from created_at in DB
  const { data: formMonthTargets = [], refetch: refetchFormMonthTargets } = useQuery({
    queryKey: ['leaderboard-month-targets', formMonth, formYear],
    queryFn: () => clientService.getLeaderboardMonthTargets(formMonth, formYear),
    staleTime: 0,
    enabled: isDialogOpen && !!formMonth && !!formYear,
  });

  const getCounsellorExistingTarget = (counsellorId: number) =>
    formMonthTargets.find((t) => t.counsellorId === counsellorId);

  const isCounsellorTargetAlreadySet = (counsellorId: number) =>
    formMonthTargets.some((t) => t.counsellorId === counsellorId);

  useEffect(() => {
    if (!socket || !isConnected) return;
    const handler = (data: any) => {
      if (data.month !== month || data.year !== year) return;

      // If WS carries fresh leaderboard for the current category, update query cache immediately
      if (data.category === selectedCategory && data.leaderboard) {
        queryClient.setQueryData(
          ['leaderboard', month, year, selectedCategory],
          { data: data.leaderboard, summary: data.summary }
        );
      } else {
        // Different category updated — just invalidate so a refetch happens if user switches
        queryClient.invalidateQueries({ queryKey: ['leaderboard', month, year] });
      }

      // Always refresh the month-targets so the dropdown disables correctly
      queryClient.invalidateQueries({ queryKey: ['leaderboard-month-targets', month, year] });

      toast({
        title: data.action === "CREATED" ? "Target Set" : "Target Updated",
        description: `Target ${data.action === "CREATED" ? "set" : "updated"} successfully.`,
      });
    };
    socket.on('leaderboard:updated', handler);
    return () => { socket.off('leaderboard:updated', handler); };
  }, [socket, isConnected, queryClient, toast, month, year, selectedCategory]);

  const listFromApi = Array.isArray(leaderboardData) ? leaderboardData : leaderboardData?.data;
  const summaryFromApi = leaderboardData && !Array.isArray(leaderboardData) ? leaderboardData.summary : undefined;

  const transformedLeaderboardData: CounsellorData[] = useMemo(() => {
    if (!listFromApi || !Array.isArray(listFromApi)) return [];
    return listFromApi
      .filter((item: any) => item.targetId != null && item.targetId !== '' && item.targetId !== 0 && Number(item.target) > 0)
      .map((item: any) => {
        const targetValue = Number(item.target) || 0;
        const currentClients = Number(item.enrollments) || 0;
        const progress = targetValue > 0 ? (currentClients / targetValue) * 100 : 0;
        return {
          id: item.counsellorId,
          name: item.fullName || 'Unknown',
          email: item.email,
          currentClients,
          currentRevenue: Number(item.revenue) || 0,
          target: targetValue,
          progress: Math.min(progress, 100),
          targetId: item.targetId || null,
          categoryName: item.categoryName || "general",
          studentAppCount: item.studentAppCount,
          finalStudentCount: item.finalStudentCount,
          applicationTarget: item.applicationTarget,
          finalStudentTarget: item.finalStudentTarget,
        };
      })
      .sort((a, b) => b.currentClients !== a.currentClients ? b.currentClients - a.currentClients : b.currentRevenue - a.currentRevenue);
  }, [listFromApi]);

  const summary = useMemo(() => {
    if (summaryFromApi && typeof summaryFromApi.totalCounsellors === 'number') {
      return { totalCounsellors: summaryFromApi.totalCounsellors, totalEnrollments: summaryFromApi.totalEnrollments ?? 0, totalRevenue: summaryFromApi.totalRevenue ?? 0 };
    }
    return {
      totalCounsellors: transformedLeaderboardData.length,
      totalEnrollments: transformedLeaderboardData.reduce((s, c) => s + c.currentClients, 0),
      totalRevenue: transformedLeaderboardData.reduce((s, c) => s + c.currentRevenue, 0),
    };
  }, [summaryFromApi, transformedLeaderboardData]);

  const monthOptions = useMemo(() => {
    const options = [];
    const currentYear = new Date().getFullYear();
    for (let m = 1; m <= 12; m++) {
      const value = `${currentYear}-${String(m).padStart(2, '0')}`;
      options.push({ value, label: format(new Date(currentYear, m - 1, 1), 'MMMM yyyy') });
    }
    return options;
  }, []);

  const isStudentCategory = targetForm.categoryName.toLowerCase() === "student";

  const handleOpenDialog = (target?: CounsellorTarget) => {
    if (target) {
      setEditingTarget(target);
      setTargetForm({
        counsellorId: String(target.counsellorId),
        counsellorName: target.counsellorName,
        month: target.month,
        target: String(target.target),
        categoryName: target.categoryName,
        applicationTarget: target.applicationTarget != null ? String(target.applicationTarget) : "",
        finalStudentTarget: target.finalStudentTarget != null ? String(target.finalStudentTarget) : "",
      });
    } else {
      setEditingTarget(null);
      setTargetForm({
        counsellorId: "",
        counsellorName: "",
        month: selectedMonth,
        target: "",
        categoryName: selectedCategory,
        applicationTarget: "",
        finalStudentTarget: "",
      });
    }
    setIsDialogOpen(true);
  };

  useEffect(() => {
    if (!isDialogOpen || editingTarget || !targetForm.counsellorId) return;
    const id = Number(targetForm.counsellorId);
    if (isCounsellorTargetAlreadySet(id)) {
      setTargetForm((prev) => ({ ...prev, counsellorId: "", counsellorName: "" }));
    }
  }, [isDialogOpen, editingTarget, targetForm.counsellorId, formMonthTargets]);

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingTarget(null);
    setTargetForm({ counsellorId: "", counsellorName: "", month: selectedMonth, target: "", categoryName: selectedCategory, applicationTarget: "", finalStudentTarget: "" });
  };

  const handleSaveTarget = async () => {
    if (isSubmitting || requestInFlightRef.current) return;
    if (!targetForm.counsellorId || !targetForm.target || !targetForm.month) {
      toast({ title: "Validation Error", description: "Please fill in all required fields", variant: "destructive" });
      return;
    }
    const targetValue = parseInt(targetForm.target);
    if (isNaN(targetValue) || targetValue < 0) {
      toast({ title: "Validation Error", description: "Target must be a valid non-negative number", variant: "destructive" });
      return;
    }
    if (isStudentCategory) {
      const appTarget = parseInt(targetForm.applicationTarget);
      if (!targetForm.applicationTarget || isNaN(appTarget) || appTarget < 0) {
        toast({ title: "Validation Error", description: "Application target is required for student category", variant: "destructive" });
        return;
      }
    }
    const [yr, monthNum] = targetForm.month.split('-').map(Number);
    const counsellorId = parseInt(targetForm.counsellorId);
    setIsSubmitting(true);
    requestInFlightRef.current = true;
    try {
      const appTarget = targetForm.applicationTarget ? parseInt(targetForm.applicationTarget) : undefined;
      const finalTarget = targetForm.finalStudentTarget ? parseInt(targetForm.finalStudentTarget) : undefined;
      await clientService.setTarget(
        counsellorId, targetValue, monthNum, yr,
        targetForm.categoryName,
        appTarget,
        finalTarget
      );
      toast({ title: editingTarget ? "Target Updated" : "Target Set", description: `Target ${editingTarget ? "updated" : "set"} for ${targetForm.counsellorName}` });
      queryClient.invalidateQueries({ queryKey: ['leaderboard', monthNum, yr] });
      queryClient.invalidateQueries({ queryKey: ['leaderboard-month-targets', monthNum, yr] });
      handleCloseDialog();
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || error.message || "Failed to set target";
      toast({ title: "Error", description: errorMessage, variant: "destructive" });
    } finally {
      setIsSubmitting(false);
      requestInFlightRef.current = false;
    }
  };

  const handleDeleteTarget = (targetId: string, counsellorName: string) => {
    setDeleteConfirm({ open: true, targetId, counsellorName });
  };

  const handleConfirmDelete = async () => {
    if (!deleteConfirm.targetId || isDeleting) return;
    setIsDeleting(true);
    try {
      await clientService.deleteTarget(deleteConfirm.targetId);
      toast({ title: "Target Deleted", description: `Target for ${deleteConfirm.counsellorName} has been deleted.` });
      queryClient.invalidateQueries({ queryKey: ['leaderboard', month, year] });
      queryClient.invalidateQueries({ queryKey: ['leaderboard-month-targets', month, year] });
      setDeleteConfirm({ open: false, targetId: "", counsellorName: "" });
    } catch (error: any) {
      const msg = error.response?.data?.message || error.message || "Failed to delete target";
      toast({ title: "Error", description: msg, variant: "destructive" });
    } finally {
      setIsDeleting(false);
    }
  };

  const getRankIcon = (index: number) => {
    if (index === 0) return <Trophy className="w-5 h-5 text-yellow-500" />;
    if (index === 1) return <Trophy className="w-5 h-5 text-gray-400" />;
    if (index === 2) return <Trophy className="w-5 h-5 text-orange-500" />;
    return <span className="text-muted-foreground font-bold">#{index + 1}</span>;
  };

  if (isLoadingCounsellors || isLoadingLeaderboard) {
    return (
      <PageWrapper title="Counsellor Leaderboard" breadcrumbs={[{ label: "Leaderboard" }]}>
        <CounsellorLeaderboardSkeleton />
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

  const isStudentTab = selectedCategory.toLowerCase() === "student";

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
                <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
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
                <DialogDescription>Set monthly enrollment target for a counsellor</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                {/* Counsellor */}
                <div className="space-y-2">
                  <Label htmlFor="counsellor">Counsellor</Label>
                  <Select
                    value={targetForm.counsellorId}
                    onValueChange={(value) => {
                      const counsellor = counsellorsData?.find(
                        (c: any) => String(c.id ?? c.userId ?? c.counsellorId) === value
                      );
                      setTargetForm({
                        ...targetForm,
                        counsellorId: value,
                        counsellorName: counsellor?.name ?? counsellor?.fullName ?? counsellor?.full_name ?? '',
                      });
                    }}
                    disabled={!!editingTarget}
                  >
                    <SelectTrigger id="counsellor">
                      <SelectValue placeholder="Select counsellor" />
                    </SelectTrigger>
                    <SelectContent>
                      {counsellorsData?.map((counsellor: any) => {
                        const cId = counsellor.id ?? counsellor.userId ?? counsellor.counsellorId;
                        const cName = counsellor.name ?? counsellor.fullName ?? counsellor.full_name ?? "Unknown";
                        const numericId = Number(cId);
                        const existingTarget = getCounsellorExistingTarget(numericId);
                        const alreadySet = !editingTarget && !!existingTarget;
                        const existingCategoryLabel = existingTarget
                          ? capitalize(existingTarget.categoryName ?? "general")
                          : "";
                        return (
                          <SelectItem key={cId} value={String(cId)} disabled={alreadySet}>
                            {cName}{alreadySet ? ` — Target already set (${existingCategoryLabel})` : ""}
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </div>
                {/* Category */}
                <div className="space-y-2">
                  <Label>Category</Label>
                  <Select
                    value={targetForm.categoryName}
                    onValueChange={(v) => setTargetForm({ ...targetForm, categoryName: v, applicationTarget: "", finalStudentTarget: "" })}
                    disabled={!!editingTarget}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="general">General</SelectItem>
                      {categoriesData.filter((c) => c?.name).map((c) => (
                        <SelectItem key={c.id} value={c.name.toLowerCase()}>{capitalize(c.name)}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {/* Info: existing target will be updated */}
                {/* Month */}
                <div className="space-y-2">
                  <Label htmlFor="month">Month</Label>
                  <Select value={targetForm.month} onValueChange={(value) => setTargetForm({ ...targetForm, month: value })}>
                    <SelectTrigger id="month"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {monthOptions.map(option => (
                        <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {/* Target */}
                {isStudentCategory ? (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="appTarget">Application Target <span className="text-destructive">*</span></Label>
                      <Input
                        id="appTarget"
                        type="number"
                        min="0"
                        value={targetForm.applicationTarget}
                        onChange={(e) => setTargetForm({ ...targetForm, applicationTarget: e.target.value, target: e.target.value })}
                        placeholder="Number of student applications"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="finalTarget">Final Student Target <span className="text-muted-foreground text-xs">(optional)</span></Label>
                      <Input
                        id="finalTarget"
                        type="number"
                        min="0"
                        value={targetForm.finalStudentTarget}
                        onChange={(e) => setTargetForm({ ...targetForm, finalStudentTarget: e.target.value })}
                        placeholder="Students with application + TD paid"
                      />
                    </div>
                  </>
                ) : (
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
                )}
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={handleCloseDialog} disabled={isSubmitting}>Cancel</Button>
                <Button onClick={handleSaveTarget} disabled={isSubmitting} className={isSubmitting ? 'opacity-50 cursor-not-allowed' : ''}>
                  {isSubmitting ? (
                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" />{editingTarget ? "Updating..." : "Creating..."}</>
                  ) : (
                    editingTarget ? "Update" : "Create"
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
            <CardContent><div className="text-2xl font-bold">{summary.totalCounsellors}</div></CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Client Enrollments</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent><div className="text-2xl font-bold">{summary.totalEnrollments}</div></CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent><div className="text-2xl font-bold">₹{summary.totalRevenue.toLocaleString('en-IN')}</div></CardContent>
          </Card>
        </div>

        {/* Category Tabs */}
        <div className="flex flex-wrap gap-1 border-b pb-0">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setSelectedCategory(tab.id)}
              className={cn(
                "px-4 py-2 text-sm font-medium rounded-t-md border border-b-0 transition-colors",
                selectedCategory === tab.id
                  ? "bg-background text-foreground border-border -mb-px z-10"
                  : "bg-muted/50 text-muted-foreground border-transparent hover:text-foreground hover:bg-muted"
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Leaderboard */}
        <Card>
          <CardHeader>
            <CardTitle>
              {capitalize(selectedCategory)} Leaderboard — {format(new Date(selectedMonth + '-01'), 'MMMM yyyy')}
            </CardTitle>
            <CardDescription>
              {isStudentTab
                ? "Ranked by student applications (unique clients)"
                : "Ranked by number of clients enrolled"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {transformedLeaderboardData.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No targets set for this month and category. Use <span className="font-medium text-foreground">Set Target</span> to add counsellors.
                </div>
              ) : (
                transformedLeaderboardData.map((counsellor, index) => (
                  <div
                    key={counsellor.id}
                    className="flex flex-col sm:flex-row items-start sm:items-center gap-4 p-4 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center justify-center w-12 h-12 rounded-full bg-muted shrink-0">
                      {getRankIcon(index)}
                    </div>
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <Avatar className="h-10 w-10 shrink-0">
                        <AvatarFallback>{counsellor.name.charAt(0).toUpperCase()}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold truncate">{counsellor.name}</div>
                        {counsellor.email && <div className="text-sm text-muted-foreground truncate">{counsellor.email}</div>}
                      </div>
                    </div>

                    {/* Achievement */}
                    <div className="text-center min-w-[100px] sm:min-w-[120px]">
                      <div className="text-2xl font-bold">{counsellor.currentClients}</div>
                      <div className="text-xs text-muted-foreground">{isStudentTab ? "Application" : "Clients"}</div>
                    </div>

                    {/* Revenue */}
                    <div className="text-center min-w-[100px] sm:min-w-[120px]">
                      <div className="text-lg font-semibold">₹{counsellor.currentRevenue.toLocaleString('en-IN')}</div>
                      <div className="text-xs text-muted-foreground">Revenue</div>
                    </div>

                    {/* Target & Progress */}
                    <div className="min-w-[180px] sm:min-w-[220px] flex-1">
                      {isStudentTab ? (
                        <div className="space-y-2">
                          {/* Application progress bar */}
                          {counsellor.applicationTarget != null && counsellor.applicationTarget > 0 && (
                            <div className="space-y-1">
                              <div className="flex items-center justify-between text-xs">
                                <span className="text-muted-foreground">Application (Target: {counsellor.applicationTarget})</span>
                                <span className={cn("font-semibold shrink-0 ml-2", ((counsellor.studentAppCount ?? 0) / counsellor.applicationTarget) >= 1 ? 'text-green-600' : '')}>
                                  {counsellor.studentAppCount ?? 0}/{counsellor.applicationTarget}
                                </span>
                              </div>
                              <Progress
                                value={Math.min(((counsellor.studentAppCount ?? 0) / counsellor.applicationTarget) * 100, 100)}
                                className="h-1.5"
                              />
                            </div>
                          )}
                          {/* Tuition Deposit progress bar */}
                          {counsellor.finalStudentTarget != null && counsellor.finalStudentTarget > 0 && (
                            <div className="space-y-1">
                              <div className="flex items-center justify-between text-xs">
                                <span className="text-muted-foreground">Tuition Deposit (Target: {counsellor.finalStudentTarget})</span>
                                <span className={cn("font-semibold shrink-0 ml-2", ((counsellor.finalStudentCount ?? 0) / counsellor.finalStudentTarget) >= 1 ? 'text-green-600' : '')}>
                                  {counsellor.finalStudentCount ?? 0}/{counsellor.finalStudentTarget}
                                </span>
                              </div>
                              <Progress
                                value={Math.min(((counsellor.finalStudentCount ?? 0) / counsellor.finalStudentTarget) * 100, 100)}
                                className="h-1.5"
                              />
                            </div>
                          )}
                          {(counsellor.applicationTarget == null || counsellor.applicationTarget === 0) && (
                            <div className="text-sm text-muted-foreground">No targets set</div>
                          )}
                        </div>
                      ) : (
                        counsellor.target > 0 ? (
                          <div className="space-y-2">
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-muted-foreground">Target: {counsellor.target}</span>
                              <span className={cn("font-semibold shrink-0 ml-2", (counsellor.progress || 0) >= 100 ? 'text-green-600' : '')}>
                                {(counsellor.progress || 0).toFixed(1)}%
                              </span>
                            </div>
                            <Progress value={counsellor.progress || 0} className="h-2" />
                          </div>
                        ) : (
                          <div className="text-sm text-muted-foreground">No target set</div>
                        )
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 shrink-0 ml-auto sm:ml-0">
                      {counsellor.targetId && (
                        <>
                          <Button
                            variant="ghost" size="icon" className="h-9 w-9"
                            onClick={() => {
                              const targetItem = listFromApi?.find((item: any) => item.counsellorId === counsellor.id);
                              if (targetItem) {
                                handleOpenDialog({
                                  id: String(targetItem.targetId || counsellor.targetId || ''),
                                  counsellorId: counsellor.id,
                                  counsellorName: counsellor.name,
                                  month: selectedMonth,
                                  target: counsellor.target || 0,
                                  categoryName: counsellor.categoryName || selectedCategory,
                                  applicationTarget: counsellor.applicationTarget,
                                  finalStudentTarget: counsellor.finalStudentTarget,
                                });
                              }
                            }}
                          >
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost" size="icon" className="h-9 w-9"
                            onClick={() => { if (counsellor.targetId) handleDeleteTarget(String(counsellor.targetId), counsellor.name); }}
                          >
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <AlertDialog open={deleteConfirm.open} onOpenChange={(open) => !isDeleting && setDeleteConfirm((prev) => ({ ...prev, open }))}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Target</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete the target for{" "}
              <span className="font-semibold text-foreground">{deleteConfirm.counsellorName}</span>?
              This will remove them from the leaderboard. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Deleting...</> : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </PageWrapper>
  );
}
