import { useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import { useQuery } from "@tanstack/react-query";
import { PageWrapper } from "@/layout/PageWrapper";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { Calendar, Plus, Target, RefreshCw, Pencil, Trophy } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import api from "@/lib/api";

type TelecallerOption = { id: number; fullName: string };
type TargetRow = {
  telecallerId: number;
  fullName: string;
  transferTargetAssigned: number;
  transferTargetAchieved: number;
  conversionTargetAssigned: number;
  conversionTargetAchieved: number;
};

export default function TelecallerLeaderboard() {
  const { toast } = useToast();
  const [selectedMonth, setSelectedMonth] = useState(() => format(new Date(), "yyyy-MM"));
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [targetedTelecallerIdsForFormMonth, setTargetedTelecallerIdsForFormMonth] = useState<Set<number>>(new Set());
  const [form, setForm] = useState({
    telecallerId: "",
    month: format(new Date(), "yyyy-MM"),
    transferTarget: "",
    conversionTarget: "",
  });

  const monthOptions = useMemo(() => {
    const y = new Date().getFullYear();
    return Array.from({ length: 12 }, (_, i) => {
      const value = format(new Date(y, i, 1), "yyyy-MM");
      return { value, label: format(new Date(y, i, 1), "MMMM yyyy") };
    });
  }, []);

  const { data: telecallers = [] } = useQuery({
    queryKey: ["telecaller-options"],
    queryFn: async () => {
      const res = await api.get("/api/users/telecallers");
      return (res.data?.data || res.data || []) as TelecallerOption[];
    },
  });

  const {
    data: leaderboardRows = [],
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ["telecaller-target-leaderboard", selectedMonth],
    queryFn: async () => {
      const res = await api.get(`/api/telecaller-targets/leaderboard/${selectedMonth}`);
      return (res.data?.data || []) as TargetRow[];
    },
  });

  const summary = useMemo(() => {
    const totalTelecallers = leaderboardRows.length;
    const transferAssigned = leaderboardRows.reduce((sum, r) => sum + Number(r.transferTargetAssigned || 0), 0);
    const transferAchieved = leaderboardRows.reduce((sum, r) => sum + Number(r.transferTargetAchieved || 0), 0);
    const conversionAssigned = leaderboardRows.reduce((sum, r) => sum + Number(r.conversionTargetAssigned || 0), 0);
    const conversionAchieved = leaderboardRows.reduce((sum, r) => sum + Number(r.conversionTargetAchieved || 0), 0);
    return { totalTelecallers, transferAssigned, transferAchieved, conversionAssigned, conversionAchieved };
  }, [leaderboardRows]);

  const transferPercent = summary.transferAssigned
    ? (summary.transferAchieved / summary.transferAssigned) * 100
    : 0;
  const conversionPercent = summary.conversionAssigned
    ? (summary.conversionAchieved / summary.conversionAssigned) * 100
    : 0;

  const sortedRows = useMemo(
    () =>
      leaderboardRows
        .slice()
        .sort((a, b) => Number(b.transferTargetAchieved || 0) - Number(a.transferTargetAchieved || 0)),
    [leaderboardRows]
  );

  useEffect(() => {
    if (!isDialogOpen) return;
    const loadTargetedIdsForFormMonth = async () => {
      try {
        if (form.month === selectedMonth) {
          setTargetedTelecallerIdsForFormMonth(new Set(leaderboardRows.map((r) => Number(r.telecallerId))));
          return;
        }
        const res = await api.get(`/api/telecaller-targets/leaderboard/${form.month}`);
        const rows = (res.data?.data || []) as TargetRow[];
        setTargetedTelecallerIdsForFormMonth(new Set(rows.map((r) => Number(r.telecallerId))));
      } catch {
        setTargetedTelecallerIdsForFormMonth(new Set());
      }
    };
    void loadTargetedIdsForFormMonth();
  }, [isDialogOpen, form.month, selectedMonth, leaderboardRows]);

  const openSetTarget = () => {
    setForm({
      telecallerId: "",
      month: selectedMonth,
      transferTarget: "",
      conversionTarget: "",
    });
    setIsDialogOpen(true);
  };

  const openEditTarget = async (row: TargetRow) => {
    try {
      const res = await api.get(`/api/telecaller-targets/${row.telecallerId}/${selectedMonth}`);
      const existing = res.data;
      setForm({
        telecallerId: String(row.telecallerId),
        month: selectedMonth,
        transferTarget: String(existing?.transferTargetAssigned ?? row.transferTargetAssigned ?? ""),
        conversionTarget: String(existing?.conversionTargetAssigned ?? row.conversionTargetAssigned ?? ""),
      });
      setIsDialogOpen(true);
    } catch {
      toast({
        title: "Unable to load target",
        description: "Please try again.",
        variant: "destructive",
      });
    }
  };

  const saveTarget = async () => {
    if (!form.telecallerId || !form.transferTarget) {
      toast({
        title: "Validation error",
        description: "Telecaller and transfer target are required.",
        variant: "destructive",
      });
      return;
    }
    setIsSubmitting(true);
    try {
      const exists = await api
        .get(`/api/telecaller-targets/${form.telecallerId}/${form.month}`)
        .then((r) => Boolean(r.data))
        .catch(() => false);

      await api.post("/api/telecaller-targets", {
        telecallerId: form.telecallerId,
        month: form.month,
        transferTarget: form.transferTarget,
        conversionTarget: form.conversionTarget || "0",
        mode: exists ? "update" : "create",
      });

      toast({
        title: exists ? "Target updated" : "Target set",
        description: "Telecaller target saved successfully.",
      });
      setIsDialogOpen(false);
      await refetch();
    } catch (error: any) {
      toast({
        title: "Failed to save target",
        description: error?.response?.data?.error || "Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <PageWrapper
      title="Telecaller Leaderboard"
      breadcrumbs={[{ label: "Leaderboard" }, { label: "Telecaller Leaderboard" }]}
      actions={
        <div className="flex gap-2">
          <Select value={selectedMonth} onValueChange={setSelectedMonth}>
            <SelectTrigger className="w-[170px]">
              <Calendar className="w-4 h-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {monthOptions.map((m) => (
                <SelectItem key={m.value} value={m.value}>
                  {m.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button onClick={openSetTarget}>
            <Plus className="w-4 h-4 mr-2" />
            Set Target
          </Button>
        </div>
      }
    >
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Total Telecallers</CardTitle>
            </CardHeader>
            <CardContent className="text-2xl font-bold">{summary.totalTelecallers}</CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Transfer Achievement</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {summary.transferAchieved}/{summary.transferAssigned}
              </div>
              <p className="text-xs text-muted-foreground mt-1">{transferPercent.toFixed(1)}%</p>
              <Progress value={Math.min(transferPercent, 100)} className="h-2 mt-2" />
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Conversion Achievement</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {summary.conversionAchieved}/{summary.conversionAssigned}
              </div>
              <p className="text-xs text-muted-foreground mt-1">{conversionPercent.toFixed(1)}%</p>
              <Progress value={Math.min(conversionPercent, 100)} className="h-2 mt-2" />
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Leaderboard - {format(new Date(`${selectedMonth}-01`), "MMMM yyyy")}</CardTitle>
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {isLoading ? (
              <p className="text-sm text-muted-foreground">Loading leaderboard...</p>
            ) : leaderboardRows.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No targets set for this month. Use Set Target to add telecallers.
              </p>
            ) : (
              sortedRows.map((row, index) => {
                const transferProgress = row.transferTargetAssigned
                  ? (Number(row.transferTargetAchieved || 0) / Number(row.transferTargetAssigned || 1)) * 100
                  : 0;
                const conversionProgress = row.conversionTargetAssigned
                  ? (Number(row.conversionTargetAchieved || 0) / Number(row.conversionTargetAssigned || 1)) * 100
                  : 0;
                return (
                  <div
                    key={row.telecallerId}
                    className="rounded-lg border p-4 flex flex-col gap-3 md:flex-row md:items-center"
                  >
                    <div className="flex items-center justify-center w-10 h-10 rounded-full bg-muted shrink-0">
                      {index === 0 ? (
                        <Trophy className="w-5 h-5 text-yellow-500" />
                      ) : index === 1 ? (
                        <Trophy className="w-5 h-5 text-gray-400" />
                      ) : index === 2 ? (
                        <Trophy className="w-5 h-5 text-orange-500" />
                      ) : (
                        <span className="text-sm font-semibold text-muted-foreground">#{index + 1}</span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <Avatar className="h-10 w-10">
                        <AvatarFallback>{row.fullName?.charAt(0)?.toUpperCase() || "T"}</AvatarFallback>
                      </Avatar>
                      <p className="font-semibold truncate">{row.fullName}</p>
                    </div>
                    <div className="text-center min-w-[120px]">
                      <div className="text-lg font-semibold">
                        {row.transferTargetAchieved}/{row.transferTargetAssigned}
                      </div>
                      <div className="text-xs text-muted-foreground">Transfer</div>
                    </div>
                    <div className="text-center min-w-[120px]">
                      <div className="text-lg font-semibold">
                        {row.conversionTargetAchieved}/{row.conversionTargetAssigned}
                      </div>
                      <div className="text-xs text-muted-foreground">Converted</div>
                    </div>
                    <div className="w-full md:w-[250px]">
                      <p className="text-xs text-muted-foreground mb-1">
                        Transfer Progress {Math.min(transferProgress, 100).toFixed(1)}%
                      </p>
                      <Progress value={Math.min(transferProgress, 100)} className="h-2 mb-2" />
                      <p className="text-xs text-muted-foreground mb-1">
                        Conversion Progress {Math.min(conversionProgress, 100).toFixed(1)}%
                      </p>
                      <Progress value={Math.min(conversionProgress, 100)} className="h-2" />
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => openEditTarget(row)}>
                      <Pencil className="w-4 h-4" />
                    </Button>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Set Telecaller Target</DialogTitle>
            <DialogDescription>Set or update monthly target for transfer and conversion.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Telecaller</Label>
              <Select
                value={form.telecallerId}
                onValueChange={(val) => setForm((prev) => ({ ...prev, telecallerId: val }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select telecaller" />
                </SelectTrigger>
                <SelectContent>
                  {telecallers.map((t) => (
                    <SelectItem
                      key={t.id}
                      value={String(t.id)}
                      disabled={
                        targetedTelecallerIdsForFormMonth.has(Number(t.id)) &&
                        form.telecallerId !== String(t.id)
                      }
                    >
                      {t.fullName}
                      {targetedTelecallerIdsForFormMonth.has(Number(t.id)) ? " (target set)" : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Month</Label>
              <Select value={form.month} onValueChange={(val) => setForm((prev) => ({ ...prev, month: val }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {monthOptions.map((m) => (
                    <SelectItem key={m.value} value={m.value}>
                      {m.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Transfer Target</Label>
              <Input
                value={form.transferTarget}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, transferTarget: e.target.value.replace(/\D/g, "") }))
                }
                placeholder="Enter transfer target"
              />
            </div>
            <div className="space-y-2">
              <Label>Conversion Target</Label>
              <Input
                value={form.conversionTarget}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, conversionTarget: e.target.value.replace(/\D/g, "") }))
                }
                placeholder="Enter conversion target"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={saveTarget} disabled={isSubmitting}>
              <Target className="w-4 h-4 mr-2" />
              {isSubmitting ? "Saving..." : "Save Target"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageWrapper>
  );
}

