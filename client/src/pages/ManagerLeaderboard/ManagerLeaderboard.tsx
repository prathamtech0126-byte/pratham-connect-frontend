import { PageWrapper } from "@/layout/PageWrapper";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { useState, useMemo, useRef, useEffect } from "react";
import { Trophy, Target, TrendingUp, Plus, Pencil, Loader2, Crown, X, Trash2 } from "lucide-react";
import { clientService } from "@/services/clientService";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { DateInput } from "@/components/ui/date-input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useAuth } from "@/context/auth-context";
import { format, parseISO } from "date-fns";
import { CalendarIcon } from "lucide-react";

// API GET /api/manager-targets item shape
export interface ManagerTargetRow {
  id: number;
  manager_id: number;
  manager_ids?: number[]; // when set, this target applies to multiple managers
  start_date: string; // YYYY-MM-DD
  end_date: string;
  core_sale_target_clients: number;
  core_sale_target_revenue: string;
  core_product_target_clients: number;
  core_product_target_revenue: string;
  other_product_target_clients: number;
  other_product_target_revenue: string;
  overall?: string; // overall revenue target
  achieved?: {
    coreSale?: { clients: number; revenue: number };
    coreProduct?: { clients: number; revenue: number };
    otherProduct?: { clients: number; revenue: number };
  };
}

// DD-MM-YYYY -> YYYY-MM-DD for comparison with API dates
function toYYYYMMDD(ddmmyyyy: string): string {
  const [dd, mm, yyyy] = ddmmyyyy.split("-");
  return `${yyyy}-${mm}-${dd}`;
}

function CustomFilterPopoverContent({
  dateRange,
  onApply,
  onCancel,
}: {
  dateRange: [Date | null, Date | null];
  onApply: (start: Date, end: Date) => void;
  onCancel: () => void;
}) {
  const [start, setStart] = useState<Date | undefined>(dateRange[0] ?? undefined);
  const [end, setEnd] = useState<Date | undefined>(dateRange[1] ?? undefined);
  useEffect(() => {
    setStart(dateRange[0] ?? undefined);
    setEnd(dateRange[1] ?? undefined);
  }, [dateRange[0], dateRange[1]]);
  return (
    <div className="p-4 space-y-4 bg-card rounded-lg border border-border">
      <div className="space-y-4">
        <div className="space-y-1.5">
          <label className="text-sm font-medium">From</label>
          <DateInput
            value={start}
            onChange={(d) => d && setStart(d)}
            placeholder="Select start date"
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium">To</label>
          <DateInput
            value={end}
            onChange={(d) => d && setEnd(d)}
            placeholder="Select end date"
          />
        </div>
      </div>
      <div className="flex justify-end gap-2 pt-2 border-t border-border">
        <Button variant="ghost" size="sm" onClick={onCancel}>
          Cancel
        </Button>
        <Button
          size="sm"
          onClick={() => start && end && onApply(start, end)}
          disabled={!start || !end}
        >
          Apply
        </Button>
      </div>
    </div>
  );
}

function formatRevenue(value: string | number): string {
  const n = typeof value === "string" ? parseFloat(value) || 0 : value;
  return `₹${n.toLocaleString()}`;
}

// Parse DD-MM-YYYY to Date for calendar; invalid/empty returns undefined
function parseDDMMYYYY(s: string): Date | undefined {
  if (!s || s.length < 10) return undefined;
  const parts = s.split("-");
  if (parts.length !== 3) return undefined;
  const [dd, mm, yyyy] = parts.map(Number);
  if (!dd || !mm || !yyyy) return undefined;
  const d = new Date(yyyy, mm - 1, dd);
  return isNaN(d.getTime()) ? undefined : d;
}

// Format Date to DD-MM-YYYY for backend
function dateToDDMMYYYY(d: Date): string {
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear();
  return `${day}-${month}-${year}`;
}

// Format Date to YYYY-MM-DD for range comparison
function dateToYYYYMMDD(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Show user-friendly message instead of raw SQL/technical errors. */
function toFriendlyErrorMessage(msg: string): string {
  if (!msg || typeof msg !== "string") return "Unable to save. Please check your entries and try again.";
  const lower = msg.toLowerCase();
  if (lower.includes("failed query") || lower.includes("params:") || lower.includes("returning") || (lower.includes("update ") && lower.includes(" set ")))
    return "Unable to save. Please check that all numbers are within a reasonable range (e.g. under 1 billion).";
  if (lower.includes("out of range") || lower.includes("overflow") || lower.includes("numeric"))
    return "One or more values are too large. Please enter smaller numbers.";
  return msg;
}

const MAX_SAFE_TARGET = 999999999;

export default function ManagerLeaderboard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  // No filter by default: API is called without start_date/end_date (backend returns all / default data)
  const [customDateRange, setCustomDateRange] = useState<[Date | null, Date | null]>([null, null]);
  const [filterPopoverOpen, setFilterPopoverOpen] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingRow, setEditingRow] = useState<ManagerTargetRow | null>(null);
  const [deleteTargetRow, setDeleteTargetRow] = useState<ManagerTargetRow | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const requestInFlightRef = useRef(false);

  const dateRange = useMemo(() => {
    if (customDateRange[0] && customDateRange[1]) {
      return { start: customDateRange[0], end: customDateRange[1] };
    }
    return null;
  }, [customDateRange]);

  const { filterStartYmd, filterEndYmd, filterStartDDMM, filterEndDDMM, filterLabel } = useMemo(() => {
    if (!dateRange) {
      return {
        filterStartYmd: "",
        filterEndYmd: "",
        filterStartDDMM: "",
        filterEndDDMM: "",
        filterLabel: "Select period",
      };
    }
    const startYmd = dateToYYYYMMDD(dateRange.start);
    const endYmd = dateToYYYYMMDD(dateRange.end);
    return {
      filterStartYmd: startYmd,
      filterEndYmd: endYmd,
      filterStartDDMM: dateToDDMMYYYY(dateRange.start),
      filterEndDDMM: dateToDDMMYYYY(dateRange.end),
      filterLabel: `${format(dateRange.start, "d MMM yyyy")} – ${format(dateRange.end, "d MMM yyyy")}`,
    };
  }, [dateRange]);

  const [targetForm, setTargetForm] = useState({
    managerId: "",
    managerName: "",
    managerIds: [] as number[],
    start_date: "",
    end_date: "",
    core_sales: "",
    core_sale_revenue: "",
    core_product: "",
    core_product_revenue: "",
    other_product: "",
    other_product_revenue: "",
    overall: "",
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const { data: managerTargetsData, isLoading: isLoadingLeaderboard, error: leaderboardError, refetch: refetchLeaderboard } = useQuery({
    queryKey: ["manager-targets", filterStartYmd || null, filterEndYmd || null],
    queryFn: () =>
      filterStartYmd && filterEndYmd
        ? clientService.getManagerTargets(filterStartYmd, filterEndYmd)
        : clientService.getManagerTargets(),
    staleTime: 1000 * 60 * 2,
    enabled: !!user,
  });

  const { data: managersData, isLoading: isLoadingManagers } = useQuery({
    queryKey: ["managers"],
    queryFn: () => clientService.getManagers(),
  });

  // No filter: API returns all/default data. With filter: API returns data for start_date & end_date
  const listFromApi = managerTargetsData?.data ?? [];

  // Card title date: when filter used → filter range; when no filter → use start_date & end_date from data rows (not current month)
  const leaderboardRangeLabel = useMemo(() => {
    if (filterStartYmd && filterEndYmd) return filterLabel;
    if (listFromApi.length === 0) return "";
    const rows = listFromApi as ManagerTargetRow[];
    const minStart = rows.reduce((min, r) => (!r.start_date ? min : !min || r.start_date < min ? r.start_date : min), "");
    const maxEnd = rows.reduce((max, r) => (!r.end_date ? max : !max || r.end_date > max ? r.end_date : max), "");
    if (minStart && maxEnd) {
      try {
        return `${format(parseISO(minStart), "d MMM yyyy")} – ${format(parseISO(maxEnd), "d MMM yyyy")}`;
      } catch {
        return "";
      }
    }
    return "";
  }, [filterStartYmd, filterEndYmd, filterLabel, listFromApi]);

  const isAdmin = user?.role === "superadmin";

  const summary = useMemo(() => {
    if (!listFromApi.length) {
      return { totalManagers: 0, totalRevenue: 0, totalClients: 0 };
    }
    let totalRevenue = 0;
    let totalClients = 0;
    listFromApi.forEach((r: any) => {
      const a = r.achieved;
      if (a?.coreSale) {
        totalClients += a.coreSale.clients ?? 0;
        totalRevenue += a.coreSale.revenue ?? 0;
      }
      if (a?.coreProduct) {
        totalClients += a.coreProduct.clients ?? 0;
        totalRevenue += a.coreProduct.revenue ?? 0;
      }
      if (a?.otherProduct) {
        totalClients += a.otherProduct.clients ?? 0;
        totalRevenue += a.otherProduct.revenue ?? 0;
      }
    });
    return {
      totalManagers: listFromApi.length,
      totalRevenue,
      totalClients,
    };
  }, [listFromApi]);

  // YYYY-MM-DD -> DD-MM-YYYY for form (POST expects DD-MM-YYYY)
  const ymdToDmy = (ymd: string): string => {
    if (!ymd || ymd.length < 10) return ymd;
    const [y, m, d] = ymd.split("-");
    return `${d}-${m}-${y}`;
  };

  const handleOpenDialog = (row?: ManagerTargetRow, preSelectManagerIds?: number[]) => {
    setFormErrors({});
    if (row) {
      setEditingRow(row);
      const existingIds = row.manager_ids?.length ? row.manager_ids : [row.manager_id];
      setTargetForm({
        managerId: String(row.manager_id),
        managerName:
          managersData?.find((x: any) => (x.id ?? x.userId) === row.manager_id)?.name ||
          managersData?.find((x: any) => (x.id ?? x.userId) === row.manager_id)?.fullName ||
          "",
        managerIds: [...existingIds],
        start_date: ymdToDmy(row.start_date),
        end_date: ymdToDmy(row.end_date),
        core_sales: String(row.core_sale_target_clients ?? ""),
        core_sale_revenue: row.core_sale_target_revenue ?? "",
        core_product: String(row.core_product_target_clients ?? ""),
        core_product_revenue: row.core_product_target_revenue ?? "",
        other_product: String(row.other_product_target_clients ?? ""),
        other_product_revenue: row.other_product_target_revenue ?? "",
        overall: row.overall ?? "",
      });
    } else {
      setEditingRow(null);
      setTargetForm({
        managerId: "",
        managerName: "",
        managerIds: preSelectManagerIds?.length ? preSelectManagerIds : [],
        start_date: filterStartDDMM,
        end_date: filterEndDDMM,
        core_sales: "",
        core_sale_revenue: "",
        core_product: "",
        core_product_revenue: "",
        other_product: "",
        other_product_revenue: "",
        overall: "",
      });
    }
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingRow(null);
    setFormErrors({});
  };

  const toggleManagerId = (id: number) => {
    const rawId = id;
    const numId = Number(rawId);
    setTargetForm((prev) => ({
      ...prev,
      managerIds: prev.managerIds.includes(numId)
        ? prev.managerIds.filter((x) => x !== numId)
        : [...prev.managerIds, numId],
    }));
    if (formErrors.manager_ids) setFormErrors((e) => ({ ...e, manager_ids: "" }));
  };

  const handleSaveTarget = async () => {
    if (isSubmitting || requestInFlightRef.current) return;

    const errors: Record<string, string> = {};
    if (!targetForm.start_date?.trim()) errors.start_date = "Start date is required";
    else if (!parseDDMMYYYY(targetForm.start_date)) errors.start_date = "Invalid date (use DD-MM-YYYY)";
    if (!targetForm.end_date?.trim()) errors.end_date = "End date is required";
    else if (!parseDDMMYYYY(targetForm.end_date)) errors.end_date = "Invalid date (use DD-MM-YYYY)";

    if (!targetForm.managerIds?.length) errors.manager_ids = "Select at least one manager";

    setFormErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setIsSubmitting(true);
    requestInFlightRef.current = true;
    try {
      if (editingRow) {
        const payload = {
          manager_ids: targetForm.managerIds,
          start_date: targetForm.start_date,
          end_date: targetForm.end_date,
          core_sales: targetForm.core_sales ? Number(targetForm.core_sales) : undefined,
          core_sale_revenue: targetForm.core_sale_revenue || undefined,
          core_product: targetForm.core_product ? Number(targetForm.core_product) : undefined,
          core_product_revenue: targetForm.core_product_revenue || undefined,
          other_product: targetForm.other_product ? Number(targetForm.other_product) : undefined,
          other_product_revenue: targetForm.other_product_revenue || undefined,
          revenue: targetForm.overall || undefined,
        };
        await clientService.updateManagerTarget(editingRow.id, payload);
        toast({ title: "Target Updated", description: `Target saved for ${targetForm.managerIds.length} manager(s).` });
      } else {
        const startDate = parseDDMMYYYY(targetForm.start_date);
        const endDate = parseDDMMYYYY(targetForm.end_date);
        if (!startDate || !endDate) {
          setIsSubmitting(false);
          requestInFlightRef.current = false;
          return;
        }
        const startYmd = dateToYYYYMMDD(startDate);
        const endYmd = dateToYYYYMMDD(endDate);
        const payload = {
          manager_ids: targetForm.managerIds,
          start_date: startYmd,
          end_date: endYmd,
          core_sale_target_clients: targetForm.core_sales ? Number(targetForm.core_sales) : undefined,
          core_sale_target_revenue: targetForm.core_sale_revenue || undefined,
          core_product_target_clients: targetForm.core_product ? Number(targetForm.core_product) : undefined,
          core_product_target_revenue: targetForm.core_product_revenue || undefined,
          other_product_target_clients: targetForm.other_product ? Number(targetForm.other_product) : undefined,
          other_product_target_revenue: targetForm.other_product_revenue || undefined,
          overall: targetForm.overall || undefined,
        };
        await clientService.setManagerTargetsBulk(payload);
        toast({ title: "Target Set", description: `Target saved for ${targetForm.managerIds.length} manager(s).` });
      }
      queryClient.invalidateQueries({ queryKey: ["manager-targets"] });
      handleCloseDialog();
    } catch (err: any) {
      const data = err.response?.data;
      const rawMsg = data?.message || err.message || "Failed to save target";
      const msg = toFriendlyErrorMessage(rawMsg);
      if (data?.errors && typeof data.errors === "object") {
        setFormErrors((prev) => ({ ...prev, ...data.errors }));
      } else {
        setFormErrors((prev) => ({ ...prev, _form: msg }));
      }
    } finally {
      setIsSubmitting(false);
      requestInFlightRef.current = false;
    }
  };

  const handleDeleteTarget = async () => {
    if (!deleteTargetRow) return;
    setDeleteError(null);
    setIsDeleting(true);
    try {
      await clientService.deleteManagerTarget(deleteTargetRow.id);
      toast({ title: "Target deleted", description: "Manager target has been removed." });
      queryClient.invalidateQueries({ queryKey: ["manager-targets"] });
      setDeleteTargetRow(null);
    } catch (err: any) {
      const rawMsg = err.response?.data?.message || err.message || "Failed to delete target";
      setDeleteError(toFriendlyErrorMessage(rawMsg));
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

  if (isLoadingManagers || isLoadingLeaderboard) {
    return (
      <PageWrapper title="Manager Leaderboard" breadcrumbs={[{ label: "Leaderboard" }]}>
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
    const errMsg =
      (leaderboardError as any)?.response?.data?.message ||
      (leaderboardError as any)?.message ||
      "Error loading leaderboard. Please try again.";
    return (
      <PageWrapper title="Manager Leaderboard" breadcrumbs={[{ label: "Leaderboard" }]}>
        <div className="flex flex-col items-center justify-center h-64 gap-4">
          <div className="text-destructive text-center max-w-md">{errMsg}</div>
          <Button variant="outline" onClick={() => refetchLeaderboard()}>
            Try again
          </Button>
        </div>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper
      title="Manager Leaderboard"
      breadcrumbs={[{ label: "Leaderboard" }]}
      actions={
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full sm:w-auto">
          <Popover open={filterPopoverOpen} onOpenChange={setFilterPopoverOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className="flex items-center gap-2 bg-muted/50 border-border/50"
              >
                <CalendarIcon className="h-4 w-4" />
                {dateRange
                  ? `${format(dateRange.start, "d MMM yyyy")} – ${format(dateRange.end, "d MMM yyyy")}`
                  : "Select period"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80 p-0" align="end">
              <CustomFilterPopoverContent
                dateRange={customDateRange}
                onApply={(start, end) => {
                  setCustomDateRange([start, end]);
                  setFilterPopoverOpen(false);
                }}
                onCancel={() => setFilterPopoverOpen(false)}
              />
            </PopoverContent>
          </Popover>
          {dateRange && (
            <Button
              variant="ghost"
              size="sm"
              className="text-muted-foreground hover:text-foreground shrink-0"
              onClick={() => setCustomDateRange([null, null])}
            >
              <X className="h-4 w-4 mr-1.5" />
              Clear all
            </Button>
          )}
          {isAdmin && (
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={() => handleOpenDialog()} className="w-full sm:w-auto whitespace-nowrap">
                  <Plus className="w-4 h-4 mr-2" />
                  Set Target
                </Button>
              </DialogTrigger>
              <DialogContent className="max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>{editingRow ? "Edit Target" : "Set Target"}</DialogTitle>
                  <DialogDescription>Set period and targets for a manager</DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label>Managers</Label>
                    <div className="rounded-md border border-input p-3 space-y-2 max-h-40 overflow-y-auto">
                      {managersData?.map((m: any) => {
                        const id = Number(m.id ?? m.userId);
                        const isExistingOnTarget = editingRow
                          ? (editingRow.manager_ids?.length ? editingRow.manager_ids : [editingRow.manager_id]).includes(id)
                          : false;
                        const isChecked = targetForm.managerIds.includes(id);
                        return (
                          <label
                            key={id}
                            className={`flex items-center gap-2 rounded p-1.5 -m-1.5 ${isExistingOnTarget ? "cursor-default opacity-90" : "cursor-pointer hover:bg-muted/50"}`}
                          >
                            <Checkbox
                              checked={isChecked}
                              disabled={isExistingOnTarget}
                              onCheckedChange={isExistingOnTarget ? undefined : () => toggleManagerId(id)}
                            />
                            <span className="text-sm">{m.name || m.fullName}</span>
                            {isExistingOnTarget && (
                              <span className="text-xs text-muted-foreground ml-1">(on this target)</span>
                            )}
                          </label>
                        );
                      })}
                    </div>
                    {formErrors.manager_ids && (
                      <p className="text-xs text-destructive">{formErrors.manager_ids}</p>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Start date (DD-MM-YYYY)</Label>
                      <DateInput
                        value={parseDDMMYYYY(targetForm.start_date)}
                        onChange={(d) => {
                          d && setTargetForm({ ...targetForm, start_date: dateToDDMMYYYY(d) });
                          if (formErrors.start_date) setFormErrors((e) => ({ ...e, start_date: "" }));
                        }}
                        placeholder="Pick start date"
                        className={formErrors.start_date ? "border-destructive" : ""}
                      />
                      {formErrors.start_date && (
                        <p className="text-xs text-destructive">{formErrors.start_date}</p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label>End date (DD-MM-YYYY)</Label>
                      <DateInput
                        value={parseDDMMYYYY(targetForm.end_date)}
                        onChange={(d) => {
                          d && setTargetForm({ ...targetForm, end_date: dateToDDMMYYYY(d) });
                          if (formErrors.end_date) setFormErrors((e) => ({ ...e, end_date: "" }));
                        }}
                        placeholder="Pick end date"
                        className={formErrors.end_date ? "border-destructive" : ""}
                      />
                      {formErrors.end_date && (
                        <p className="text-xs text-destructive">{formErrors.end_date}</p>
                      )}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Core sales (target)</Label>
                      <Input
                        type="number"
                        min="0"
                        max={MAX_SAFE_TARGET}
                        value={targetForm.core_sales}
                        onChange={(e) => setTargetForm({ ...targetForm, core_sales: e.target.value })}
                        placeholder="100"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Core sale revenue (₹)</Label>
                      <Input
                        value={targetForm.core_sale_revenue}
                        onChange={(e) => setTargetForm({ ...targetForm, core_sale_revenue: e.target.value })}
                        placeholder="50000"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Core product (target)</Label>
                      <Input
                        type="number"
                        min="0"
                        max={MAX_SAFE_TARGET}
                        value={targetForm.core_product}
                        onChange={(e) => setTargetForm({ ...targetForm, core_product: e.target.value })}
                        placeholder="50"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Core product revenue (₹)</Label>
                      <Input
                        value={targetForm.core_product_revenue}
                        onChange={(e) => setTargetForm({ ...targetForm, core_product_revenue: e.target.value })}
                        placeholder="25000"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Other product (target)</Label>
                      <Input
                        type="number"
                        min="0"
                        max={MAX_SAFE_TARGET}
                        value={targetForm.other_product}
                        onChange={(e) => setTargetForm({ ...targetForm, other_product: e.target.value })}
                        placeholder="30"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Other product revenue (₹)</Label>
                      <Input
                        value={targetForm.other_product_revenue}
                        onChange={(e) => setTargetForm({ ...targetForm, other_product_revenue: e.target.value })}
                        placeholder="15000"
                      />
                    </div>
                    <div className="space-y-2 col-span-2">
                      <Label>Overall revenue (₹)</Label>
                      <Input
                        value={targetForm.overall}
                        onChange={(e) => setTargetForm({ ...targetForm, overall: e.target.value })}
                        placeholder="100000"
                      />
                      {formErrors.overall && (
                        <p className="text-xs text-destructive">{formErrors.overall}</p>
                      )}
                    </div>
                  </div>
                </div>
                {formErrors._form && (
                  <div className="text-sm text-destructive px-1">{formErrors._form}</div>
                )}
                <DialogFooter>
                  <Button variant="outline" onClick={handleCloseDialog} disabled={isSubmitting}>
                    Cancel
                  </Button>
                  <Button onClick={handleSaveTarget} disabled={isSubmitting}>
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      editingRow ? "Update" : "Create"
                    )}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
        </div>
      }
    >
      <div className="space-y-6">
        {/* {isAdmin && managersData && managersData.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Managers</CardTitle>
              <CardDescription>All managers. Use &quot;Set target&quot; to add or edit targets for any manager.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {managersData.map((m: any) => {
                  const id = Number(m.id ?? m.userId);
                  const name = m.name || m.fullName || `Manager #${id}`;
                  return (
                    <div
                      key={id}
                      className="flex items-center gap-2 rounded-lg border bg-muted/30 px-3 py-2 text-sm"
                    >
                      <span className="font-medium">{name}</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs shrink-0"
                        onClick={() => handleOpenDialog(undefined, [id])}
                      >
                        Set target
                      </Button>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )} */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Managers</CardTitle>
              <Crown className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{summary.totalManagers}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Clients</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{summary.totalClients}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatRevenue(summary.totalRevenue)}</div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Leaderboard {leaderboardRangeLabel ? `– ${leaderboardRangeLabel}` : ""}</CardTitle>
            <CardDescription>Manager performance for the selected period</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {listFromApi.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">No manager targets for this period</div>
              ) : (
                (listFromApi as ManagerTargetRow[]).map((row, index: number) => {
                  const managerIds = row.manager_ids?.length ? row.manager_ids : [row.manager_id];
                  const managerName =
                    managerIds
                      .map(
                        (mid) =>
                          managersData?.find((m: any) => (m.id ?? m.userId) === mid)?.name ||
                          managersData?.find((m: any) => (m.id ?? m.userId) === mid)?.fullName ||
                          `Manager #${mid}`
                      )
                      .join(", ") || `Manager #${row.manager_id}`;
                  const a = row.achieved;
                  const totalClients =
                    (a?.coreSale?.clients ?? 0) + (a?.coreProduct?.clients ?? 0) + (a?.otherProduct?.clients ?? 0);
                  const totalRevenue =
                    (a?.coreSale?.revenue ?? 0) + (a?.coreProduct?.revenue ?? 0) + (a?.otherProduct?.revenue ?? 0);
                  const totalTargetClients =
                    (row.core_sale_target_clients ?? 0) + (row.core_product_target_clients ?? 0) + (row.other_product_target_clients ?? 0);
                  const overallProgress =
                    totalTargetClients > 0 ? (totalClients / totalTargetClients) * 100 : 0;
                  return (
                    <div
                      key={row.id ?? `${row.manager_id}-${row.start_date}`}
                      className="flex flex-col gap-4 p-4 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex flex-col sm:flex-row flex-wrap items-start sm:items-center gap-4">
                        <div className="flex items-center justify-center w-12 h-12 rounded-full bg-muted shrink-0">
                          {getRankIcon(index)}
                        </div>
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <Avatar className="h-10 w-10 shrink-0">
                            <AvatarFallback>
                              {managerIds.length > 1
                                ? `${managerIds.length}M`
                                : managerName.charAt(0).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <div className="font-semibold truncate">{managerName}</div>
                            <div className="text-sm text-muted-foreground">
                              {row.start_date && row.end_date
                                ? `${format(parseISO(row.start_date), "d MMM yyyy")} – ${format(parseISO(row.end_date), "d MMM yyyy")}`
                                : `${row.start_date || ""} – ${row.end_date || ""}`}
                            </div>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 w-full sm:w-auto sm:flex-1 items-stretch">
                          <div className="text-center min-w-0 flex flex-col justify-center p-3 rounded-lg bg-muted/30">
                            <div className="text-lg font-bold tabular-nums">
                              {a?.coreSale?.clients ?? 0}
                              <span className="text-muted-foreground font-normal text-sm">/{row.core_sale_target_clients ?? 0}</span>
                            </div>
                            <div className="text-xs text-muted-foreground mt-0.5">Core sale</div>
                          </div>
                          <div className="text-center min-w-0 flex flex-col justify-center p-3 rounded-lg bg-muted/30">
                            <div className="text-lg font-bold tabular-nums">
                              {a?.coreProduct?.clients ?? 0}
                              <span className="text-muted-foreground font-normal text-sm">/{row.core_product_target_clients ?? 0}</span>
                            </div>
                            <div className="text-xs text-muted-foreground mt-0.5">Core product</div>
                          </div>
                          <div className="text-center min-w-0 flex flex-col justify-center p-3 rounded-lg bg-muted/30">
                            <div className="text-lg font-bold tabular-nums">
                              {a?.otherProduct?.clients ?? 0}
                              <span className="text-muted-foreground font-normal text-sm">/{row.other_product_target_clients ?? 0}</span>
                            </div>
                            <div className="text-xs text-muted-foreground mt-0.5">Other product</div>
                          </div>
                          <div className="text-center min-w-0 flex flex-col justify-center p-3 rounded-lg bg-muted/30">
                            <div className="text-lg font-bold tabular-nums">{totalClients}</div>
                            <div className="text-xs font-medium text-foreground">{formatRevenue(totalRevenue)}</div>
                            <div className="text-xs text-muted-foreground mt-0.5">Total</div>
                          </div>
                        </div>
                        {isAdmin && (
                          <div className="flex items-center gap-2 shrink-0 ml-auto sm:ml-0">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-9 w-9"
                              onClick={() => handleOpenDialog(row)}
                              title="Update target"
                            >
                              <Pencil className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-9 w-9 text-destructive hover:text-destructive"
                              onClick={() => setDeleteTargetRow(row)}
                              title="Delete target"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        )}
                      </div>
                      <div className="w-full border-t pt-3 space-y-4">
                        {/* Core Sale revenue */}
                        {(() => {
                          const targetRev = parseFloat(String(row.core_sale_target_revenue ?? "0")) || 0;
                          const achievedRev = a?.coreSale?.revenue ?? 0;
                          const pct = targetRev > 0 ? (achievedRev / targetRev) * 100 : 0;
                          const remaining = Math.max(0, targetRev - achievedRev);
                          return (
                            <div className="space-y-1">
                              <div className="flex items-center justify-between gap-2 flex-wrap">
                                <span className="text-xs text-muted-foreground">Core sale revenue</span>
                                <span className="text-xs font-semibold tabular-nums text-blue-600">{Math.round(pct)}%</span>
                              </div>
                              <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
                                <span>Achieved: <span className="font-medium text-foreground">{formatRevenue(achievedRev)}</span></span>
                                <span>Remaining: <span className="font-medium text-foreground">{formatRevenue(remaining)}</span></span>
                              </div>
                              <Progress value={Math.min(100, pct)} className="h-2" indicatorClassName="bg-blue-500" />
                              <div className="text-xs text-muted-foreground">Target: {formatRevenue(targetRev)}</div>
                            </div>
                          );
                        })()}
                        {/* Core Product revenue */}
                        {(() => {
                          const targetRev = parseFloat(String(row.core_product_target_revenue ?? "0")) || 0;
                          const achievedRev = a?.coreProduct?.revenue ?? 0;
                          const pct = targetRev > 0 ? (achievedRev / targetRev) * 100 : 0;
                          const remaining = Math.max(0, targetRev - achievedRev);
                          return (
                            <div className="space-y-1">
                              <div className="flex items-center justify-between gap-2 flex-wrap">
                                <span className="text-xs text-muted-foreground">Core product revenue</span>
                                <span className="text-xs font-semibold tabular-nums text-emerald-600">{Math.round(pct)}%</span>
                              </div>
                              <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
                                <span>Achieved: <span className="font-medium text-foreground">{formatRevenue(achievedRev)}</span></span>
                                <span>Remaining: <span className="font-medium text-foreground">{formatRevenue(remaining)}</span></span>
                              </div>
                              <Progress value={Math.min(100, pct)} className="h-2" indicatorClassName="bg-emerald-500" />
                              <div className="text-xs text-muted-foreground">Target: {formatRevenue(targetRev)}</div>
                            </div>
                          );
                        })()}
                        {/* Other Product revenue */}
                        {(() => {
                          const targetRev = parseFloat(String(row.other_product_target_revenue ?? "0")) || 0;
                          const achievedRev = a?.otherProduct?.revenue ?? 0;
                          const pct = targetRev > 0 ? (achievedRev / targetRev) * 100 : 0;
                          const remaining = Math.max(0, targetRev - achievedRev);
                          return (
                            <div className="space-y-1">
                              <div className="flex items-center justify-between gap-2 flex-wrap">
                                <span className="text-xs text-muted-foreground">Other product revenue</span>
                                <span className="text-xs font-semibold tabular-nums text-amber-600">{Math.round(pct)}%</span>
                              </div>
                              <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
                                <span>Achieved: <span className="font-medium text-foreground">{formatRevenue(achievedRev)}</span></span>
                                <span>Remaining: <span className="font-medium text-foreground">{formatRevenue(remaining)}</span></span>
                              </div>
                              <Progress value={Math.min(100, pct)} className="h-2" indicatorClassName="bg-amber-500" />
                              <div className="text-xs text-muted-foreground">Target: {formatRevenue(targetRev)}</div>
                            </div>
                          );
                        })()}
                        {/* Overall revenue: (core sale + core product + other) / overall target */}
                        {(() => {
                          const targetRev = parseFloat(String(row.overall ?? "0")) || 0;
                          const achievedRev = totalRevenue;
                          const pct = targetRev > 0 ? (achievedRev / targetRev) * 100 : 0;
                          const remaining = Math.max(0, targetRev - achievedRev);
                          return (
                            <div className="space-y-1">
                              <div className="flex items-center justify-between gap-2 flex-wrap">
                                <span className="text-xs text-muted-foreground">Overall revenue</span>
                                <span className="text-xs font-semibold tabular-nums text-indigo-600">{Math.round(pct)}%</span>
                              </div>
                              <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
                                <span>Achieved: <span className="font-medium text-foreground">{formatRevenue(achievedRev)}</span></span>
                                <span>Remaining: <span className="font-medium text-foreground">{formatRevenue(remaining)}</span></span>
                              </div>
                              <Progress value={Math.min(100, pct)} className="h-2" indicatorClassName="bg-indigo-500" />
                              <div className="text-xs text-muted-foreground">Target: {formatRevenue(targetRev)}</div>
                            </div>
                          );
                        })()}
                        {/* Overall progress (clients) */}
                        <div className="space-y-1 pt-1 border-t">
                          <div className="flex items-center justify-between gap-2 flex-wrap">
                            <span className="text-xs text-muted-foreground">Overall progress (clients)</span>
                            <span className="text-xs font-semibold tabular-nums text-primary">{Math.round(overallProgress)}%</span>
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
                })
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <AlertDialog open={!!deleteTargetRow} onOpenChange={(open) => { if (!open) { setDeleteTargetRow(null); setDeleteError(null); } }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete manager target?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTargetRow
                ? `This will permanently remove the target for the period ${deleteTargetRow.start_date} – ${deleteTargetRow.end_date}. This action cannot be undone.`
                : ""}
            </AlertDialogDescription>
          </AlertDialogHeader>
          {deleteError && (
            <div className="text-sm text-destructive px-6">{deleteError}</div>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                handleDeleteTarget();
              }}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                "Delete"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </PageWrapper>
  );
}
