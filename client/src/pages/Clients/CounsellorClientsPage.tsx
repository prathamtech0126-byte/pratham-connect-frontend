import { PageWrapper } from "@/layout/PageWrapper";
import { DataTable } from "@/components/table/DataTable";
import { TableActions } from "@/components/table/TableActions";
import { clientService, Client } from "@/services/clientService";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Download, Loader2 } from "lucide-react";
import { CounsellorClientsSkeleton, ClientRedirectSkeleton } from "@/components/ui/page-skeletons";
import { useLocation, useRoute, useSearch } from "wouter";
import { useState, useEffect, useMemo, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { format } from "date-fns";
import { getLatestStageFromPayments } from "@/utils/stageUtils";
import { DashboardDateFilter } from "@/components/dashboard/DashboardDateFilter";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { exportClientsToExcel } from "@/utils/excelExport";
import { useAuth } from "@/context/auth-context";

type FilterValue = "today" | "weekly" | "monthly" | "yearly" | "custom";

function transformRawToClient(client: any): Client {
  const clientId = client.id || client.clientId || client.client_id;
  const clientName = client.name || client.fullName || client.full_name || "";
  const enrollmentDate = client.enrollmentDate || client.enrollment_date || client.date || "";
  const originalCounsellorName = typeof client.counsellor === "object" && client.counsellor?.name
    ? client.counsellor.name
    : (client.counsellor || client.counsellorName || client.counsellor_name || "");
  const transferedToCounsellorName =
    client.transferedToCounsellorName ||
    client.transferredToCounsellorName ||
    client.transfered_to_counsellor_name ||
    "";
  const counsellorName = transferedToCounsellorName || originalCounsellorName;
  let salesType = client.salesType || client.saleType?.saleType || client.sales_type;
  if (!salesType && client.payments?.length > 0) {
    const p = client.payments.find((x: any) => x.saleType?.saleType);
    if (p?.saleType?.saleType) salesType = p.saleType.saleType;
  }
  if (!salesType) salesType = "Only Products";

  const totalPayment = Number(client.totalPayment || client.payments?.[0]?.totalPayment || 0);
  const totalReceived = client.payments?.length
    ? client.payments.reduce((s: number, p: any) => s + Number(p.amount || 0), 0)
    : Number(client.payments?.[0]?.amount || client.amountReceived || 0);
  const amountPending = totalPayment - totalReceived;
  const stage = getLatestStageFromPayments(client.payments, client.stage, client.visaSubmitted) || "N/A";

  return {
    id: String(clientId || ""),
    name: clientName,
    enrollmentDate,
    counsellor: counsellorName,
    productManager: client.productManager || client.product_manager || "N/A",
    salesType,
    isTransferred:
      client.transferStatus === true ||
      client.transferedToCounsellorId != null ||
      client.transferredToCounsellorId != null ||
      client.transfered_to_counsellor_id != null,
    transferedToCounsellorName: transferedToCounsellorName || undefined,
    originalCounsellorName: originalCounsellorName || undefined,
    status: (client.archived ? "Dropped" : "Active") as "Active" | "Completed" | "Pending" | "Dropped",
    totalPayment,
    amountReceived: totalReceived,
    amountPending,
    stage: stage as any,
  };
}

function parseFilterParam(v: string | null): FilterValue {
  const ok: FilterValue[] = ["today", "weekly", "monthly", "yearly", "custom"];
  if (v && ok.includes(v as FilterValue)) return v as FilterValue;
  return "monthly";
}

export default function CounsellorClientsPage() {
  const [pathname, setLocation] = useLocation();
  const searchStr = useSearch();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user: authUser } = useAuth();

  const mergeQuery = useCallback(
    (mutate: (p: URLSearchParams) => void, replace = true) => {
      const p = new URLSearchParams(searchStr);
      mutate(p);
      const qs = p.toString();
      setLocation(qs ? `${pathname}?${qs}` : pathname, { replace });
    },
    [pathname, searchStr, setLocation],
  );

  const urlParams = useMemo(() => new URLSearchParams(searchStr), [searchStr]);
  const filter = parseFilterParam(urlParams.get("filter"));
  const search = urlParams.get("q") ?? "";
  const startDate = urlParams.get("start") ?? "";
  const endDate = urlParams.get("end") ?? "";
  const roleFromUrl = urlParams.get("role") || "counsellor";
  const [, paramsActive] = useRoute("/clients/counsellor/:counsellorId");
  const [, paramsArchive] = useRoute("/clients/archive/counsellor/:counsellorId");
  const isArchiveMode = !!paramsArchive;
  const params = isArchiveMode ? paramsArchive : paramsActive;
  const counsellorIdParam = params?.counsellorId;
  const counsellorIdFromRoute = counsellorIdParam ? parseInt(counsellorIdParam, 10) : null;

  const isCounsellor = authUser?.role === "counsellor";
  const meQuery = useQuery({
    queryKey: ["user-profile"],
    queryFn: clientService.getUserProfile,
    enabled: !!isCounsellor && !!authUser,
    staleTime: 1000 * 60 * 5,
    refetchOnWindowFocus: false,
  });
  const meData = meQuery.data;

  const effectiveUserId = useMemo(() => {
    if (isCounsellor && meData) {
      const id = meData.id ?? meData.userId ?? meData.user_id;
      const num = id != null ? (typeof id === "number" ? id : parseInt(String(id), 10)) : null;
      return num != null && !Number.isNaN(num) ? num : null;
    }
    return counsellorIdFromRoute;
  }, [isCounsellor, meData, counsellorIdFromRoute]);

  const effectiveRole = useMemo(() => {
    if (isCounsellor && meData) {
      return meData.role ?? meData.userRole ?? meData.user_role ?? "counsellor";
    }
    return roleFromUrl;
  }, [isCounsellor, meData, roleFromUrl]);

  const counsellorId = counsellorIdFromRoute;
  const role = effectiveRole;

  const [clientToDelete, setClientToDelete] = useState<Client | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isArchiving, setIsArchiving] = useState(false);
  const [clientToUnarchive, setClientToUnarchive] = useState<Client | null>(null);
  const [showUnarchiveConfirm, setShowUnarchiveConfirm] = useState(false);
  const [isUnarchiving, setIsUnarchiving] = useState(false);

  const [counsellorsList, setCounsellorsList] = useState<any[]>([]);
  const [usersDetailsList, setUsersDetailsList] = useState<any[]>([]);
  useEffect(() => {
    clientService.getCounsellors().then(setCounsellorsList).catch(() => setCounsellorsList([]));
  }, []);
  const isAdminOrManager =
    authUser?.role === "superadmin" || (authUser as any)?.role === "admin" || authUser?.role === "manager";
  useEffect(() => {
    if (isAdminOrManager) {
      clientService.getUsersDetails().then(setUsersDetailsList).catch(() => setUsersDetailsList([]));
    } else {
      setUsersDetailsList([]);
    }
  }, [isAdminOrManager]);

  const counsellorName = useMemo(() => {
    if (isCounsellor && meData) {
      return meData.fullName ?? meData.full_name ?? meData.name ?? meData.fullname ?? "";
    }
    if (!counsellorId) return "";
    const match = (list: any[]) =>
      list.find(
        (x: any) =>
          Number(x.id ?? x.userId ?? x.user_id) === counsellorId || String(x.id ?? x.userId) === String(counsellorId)
      );
    const fromUsers = match(usersDetailsList);
    if (fromUsers) return fromUsers.fullName || fromUsers.full_name || fromUsers.name || fromUsers.username || "";
    const fromCounsellors = match(counsellorsList);
    if (fromCounsellors) return fromCounsellors.fullName || fromCounsellors.full_name || fromCounsellors.name || "";
    return `User #${counsellorId}`;
  }, [isCounsellor, meData, counsellorId, counsellorsList, usersDetailsList]);

  // API params: date filter only for active list (no search – search is client-side)
  const queryParams = useMemo(() => {
    const p: { filter: FilterValue; startDate?: string; endDate?: string } = { filter };
    if (filter === "custom") {
      if (startDate) p.startDate = startDate;
      if (endDate) p.endDate = endDate;
    }
    return p;
  }, [filter, startDate, endDate]);

  // POST filtered & archived: pass id and role from user/me (counsellor) or from URL (admin/manager viewing a user)
  const activeQuery = useQuery({
    queryKey: ["counsellor-clients-filtered", effectiveUserId, effectiveRole, queryParams],
    queryFn: () =>
      effectiveUserId != null
        ? clientService.getCounsellorClientsFiltered(effectiveUserId, effectiveRole, queryParams)
        : Promise.resolve([]),
    enabled: !isArchiveMode && effectiveUserId != null && !isNaN(effectiveUserId) && (filter !== "custom" || (!!startDate && !!endDate)),
    staleTime: 60 * 1000,
  });

  const archiveQuery = useQuery({
    queryKey: ["archived-clients", effectiveUserId, effectiveRole],
    queryFn: () =>
      effectiveUserId != null
        ? clientService.getArchivedClientsByCounsellor(effectiveUserId, effectiveRole)
        : Promise.resolve([]),
    enabled: isArchiveMode && effectiveUserId != null && !isNaN(effectiveUserId),
    staleTime: 60 * 1000,
  });

  const rawClients = isArchiveMode ? (archiveQuery.data ?? []) : (activeQuery.data ?? []);
  const isLoading = isArchiveMode ? archiveQuery.isLoading : activeQuery.isLoading;
  const error = isArchiveMode ? archiveQuery.error : activeQuery.error;

  const clients = useMemo(() => {
    if (!Array.isArray(rawClients)) return [];
    const list = rawClients
      .map(transformRawToClient)
      .filter((c) => c.id && c.id !== "undefined" && c.id !== "null");
    // Client-side search: filter by name (instant as user types)
    const q = search.trim().toLowerCase();
    if (!q) return list;
    return list.filter((c) => (c.name || "").toLowerCase().includes(q));
  }, [rawClients, search]);

  const navigateToClient = (clientId: string, mode: "view" | "edit") => {
    if (counsellorId != null) {
      const pathWithQuery = searchStr ? `${pathname}?${searchStr}` : pathname;
      sessionStorage.setItem("client_list_return_path", pathWithQuery);
      sessionStorage.setItem("client_list_return_counsellor_name", counsellorName || "");
    }
    setLocation(`/clients/${clientId}/${mode}`);
  };

  const handleExportExcel = () => {
    const list = Array.isArray(rawClients) ? rawClients : [];
    const q = search.trim().toLowerCase();
    const toExport = q
      ? list.filter((c: any) => (c.name || c.fullName || c.full_name || "").toLowerCase().includes(q))
      : list;
    if (!toExport.length) {
      toast({
        variant: "destructive",
        title: "No Data to Export",
        description: isArchiveMode
          ? "No archived clients found to export."
          : "No clients found for this period. Try changing the date filter or search.",
      });
      return;
    }
    try {
      const namePart = counsellorName && counsellorName !== "Loading..." ? counsellorName.replace(/\s+/g, "-") : `user-${counsellorId}`;
      const fileName = `${namePart}-clients-${new Date().toISOString().split("T")[0]}.xlsx`;
      exportClientsToExcel(toExport as any, fileName);
      toast({
        title: "Excel Exported",
        description: `${toExport.length} client(s) downloaded successfully.`,
      });
    } catch (err) {
      console.error("Error exporting Excel:", err);
      toast({
        variant: "destructive",
        title: "Export Failed",
        description: "Failed to export Excel. Please try again.",
      });
    }
  };

  const handleArchive = async () => {
    if (!clientToDelete?.id) return;
    setIsArchiving(true);
    try {
      await clientService.archiveClient(Number(clientToDelete.id), true);
      queryClient.invalidateQueries({ queryKey: ["counsellor-clients-filtered"] });
      toast({ title: "Client archived" });
      setShowDeleteConfirm(false);
      setClientToDelete(null);
    } catch (e) {
      toast({ title: "Failed to archive", variant: "destructive" });
    } finally {
      setIsArchiving(false);
    }
  };

  const handleUnarchive = async () => {
    if (!clientToUnarchive?.id) return;
    setIsUnarchiving(true);
    try {
      await clientService.archiveClient(Number(clientToUnarchive.id), false);
      queryClient.invalidateQueries({ queryKey: ["archived-clients"] });
      queryClient.invalidateQueries({ queryKey: ["clients"] });
      toast({ title: "Client unarchived", description: `${clientToUnarchive.name} has been restored.` });
      setShowUnarchiveConfirm(false);
      setClientToUnarchive(null);
    } catch (e: any) {
      toast({
        variant: "destructive",
        title: "Unarchive failed",
        description: e.response?.data?.message || e.message || "Please try again.",
      });
    } finally {
      setIsUnarchiving(false);
    }
  };

  const getColumns = () => [
    { header: "Sr No", cell: (_: Client, index: number) => <span className="text-slate-400 font-mono text-xs">{String(index + 1).padStart(2, "0")}</span>, className: "w-[60px]" },
    {
      header: "Name",
      cell: (s: Client) => (
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-semibold text-slate-900">{s.name}</span>
            {s.isTransferred && (
              <Badge
                variant="secondary"
                className="bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-800"
              >
                Shared Client
              </Badge>
            )}
          </div>
          {s.isTransferred && s.originalCounsellorName ? (
            <p className="text-xs text-muted-foreground">
              Original counsellor: <span className="font-medium text-foreground">{s.originalCounsellorName}</span>
            </p>
          ) : null}
        </div>
      ),
    },
    { header: "Sales Type", cell: (s: Client) => <Badge variant="outline" className="font-normal whitespace-nowrap bg-slate-50 text-slate-600 border-slate-200">{s.salesType}</Badge> },
    { header: "Enrollment Date", accessorKey: "enrollmentDate", className: "whitespace-nowrap text-slate-500" },
    { header: "Total Payment", cell: (s: Client) => `₹${s.totalPayment.toLocaleString()}` },
    { header: "Received", cell: (s: Client) => <span className="text-emerald-600 font-medium">₹{s.amountReceived.toLocaleString()}</span> },
    {
      header: "Stage",
      cell: (s: Client) => {
        const stage = (s.stage || "N/A") as string;
        let badgeClass = "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800";
        if (stage === "Financial") badgeClass = "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-900/30 dark:text-purple-300 dark:border-purple-800";
        if (stage === "Before Visa") badgeClass = "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-800";
        if (stage === "After Visa" || stage === "After Visa Payment") badgeClass = "bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-900/30 dark:text-indigo-300 dark:border-indigo-800";
        if (stage === "Submitted Visa" || stage === "Visa Submitted") badgeClass = "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-800";
        if (stage === "N/A") badgeClass = "bg-gray-50 text-gray-500 border-gray-200 dark:bg-gray-900/30 dark:text-gray-400 dark:border-gray-800";
        const displayStage = stage === "After Visa Payment" ? "After Visa" : stage === "Visa Submitted" ? "Submitted Visa" : stage;
        return <Badge variant="outline" className={`font-medium whitespace-nowrap ${badgeClass}`}>{displayStage}</Badge>;
      },
    },
    { header: "Pending", cell: (s: Client) => <span className={s.amountPending > 0 ? "text-amber-600 font-medium" : "text-slate-400"}>₹{s.amountPending.toLocaleString()}</span> },
    {
      header: "Actions",
      cell: (s: Client) => (
        <TableActions
          onView={() => navigateToClient(s.id, "view")}
          onEdit={() => navigateToClient(s.id, "edit")}
          onDelete={
            isArchiveMode
              ? () => { setClientToUnarchive(s); setShowUnarchiveConfirm(true); }
              : () => { setClientToDelete(s); setShowDeleteConfirm(true); }
          }
          deleteLabel={isArchiveMode ? "Unarchive" : "Archive"}
        />
      ),
    },
  ];

  if (isCounsellor && meQuery.isLoading) {
    return (
      <PageWrapper title="Clients" breadcrumbs={[{ label: "Clients" }]}>
        <ClientRedirectSkeleton />
      </PageWrapper>
    );
  }

  const isInvalid = isCounsellor
    ? effectiveUserId == null || Number.isNaN(effectiveUserId)
    : counsellorId == null || isNaN(counsellorId);
  if (isInvalid) {
    return (
      <PageWrapper
        title={isArchiveMode ? "Archived clients" : "Counsellor clients"}
        breadcrumbs={[
          { label: "Clients", href: "/clients" },
          ...(isArchiveMode ? [{ label: "Archive", href: "/clients/archive" }] : []),
          { label: "Invalid" },
        ]}
      >
        <p className="text-muted-foreground">Invalid counsellor.</p>
        <Button variant="outline" className="mt-4" onClick={() => setLocation(isArchiveMode ? "/clients/archive" : "/clients")}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          {isArchiveMode ? "Back to Archive" : "Back to Clients"}
        </Button>
      </PageWrapper>
    );
  }

  // List page: Home > Clients (and Archive if archive mode). No counsellor name in breadcrumb; client name only when a particular client is open (ClientDetails/ClientView).
  const breadcrumbs = isArchiveMode
    ? [
        { label: "Clients", href: "/clients" },
        { label: "Archive", href: "/clients/archive" },
      ]
    : [{ label: "Clients", href: "/clients" }];

  const isCustomFilter = filter === "custom";
  const canFetch = isArchiveMode || (!isCustomFilter || (startDate && endDate));

  return (
    <PageWrapper
      title={
        counsellorName
          ? isArchiveMode
            ? `${counsellorName} – Archived`
            : `${counsellorName} – Clients`
          : isArchiveMode
            ? "Archived clients"
            : "Counsellor clients"
      }
      breadcrumbs={breadcrumbs}
      actions={
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            className="bg-card border-border/50 shadow-sm hover:bg-muted/50"
            onClick={handleExportExcel}
            disabled={!Array.isArray(rawClients) || rawClients.length === 0 || isLoading}
          >
            <Download className="w-4 h-4 mr-2" />
            Export to Excel
          </Button>
          {!isCounsellor && (
            <Button variant="outline" onClick={() => setLocation(isArchiveMode ? "/clients/archive" : "/clients")}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              {isArchiveMode ? "Back to Archive" : "Back to all counsellors"}
            </Button>
          )}
        </div>
      }
    >
      <div className="space-y-6">
        <div className="flex flex-col gap-4 bg-card p-4 rounded-xl border border-border/50 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="space-y-2 flex-1 min-w-[200px] max-w-sm">
              <Label className="text-xs font-medium text-muted-foreground">Search</Label>
              <Input
                placeholder="Search clients by name..."
                value={search}
                onChange={(e) => {
                  const v = e.target.value;
                  mergeQuery((p) => {
                    if (v.trim()) p.set("q", v);
                    else p.delete("q");
                  });
                }}
                className="h-9"
              />
              <p className="text-xs text-muted-foreground">Filters the list below instantly.</p>
            </div>
            {!isArchiveMode && (
            <div className="flex items-center gap-2">
              <Label className="text-xs font-medium text-muted-foreground shrink-0">Date filter</Label>
              <DashboardDateFilter
                date={[
                  startDate ? new Date(startDate + "T12:00:00") : null,
                  endDate ? new Date(endDate + "T12:00:00") : null,
                ]}
                onDateChange={(range) => {
                  const [s, e] = range;
                  mergeQuery((p) => {
                    p.set("filter", "custom");
                    if (s) p.set("start", format(s, "yyyy-MM-dd"));
                    else p.delete("start");
                    if (e) p.set("end", format(e, "yyyy-MM-dd"));
                    else p.delete("end");
                  });
                }}
                activeTab={
                  filter === "today"
                    ? "Today"
                    : filter === "weekly"
                      ? "Weekly"
                      : filter === "monthly"
                        ? "Monthly"
                        : filter === "yearly"
                          ? "Yearly"
                          : "Custom"
                }
                onTabChange={(tab) => {
                  const next =
                    tab === "Today" ? "today" : tab === "Custom" ? "custom" : (tab.toLowerCase() as FilterValue);
                  mergeQuery((p) => {
                    p.set("filter", next);
                    if (next !== "custom") {
                      p.delete("start");
                      p.delete("end");
                    }
                  });
                }}
                align="end"
              />
            </div>
            )}
          </div>
        </div>

        {!isArchiveMode && !canFetch && isCustomFilter && (
          <p className="text-sm text-muted-foreground">Select both start and end date for custom range.</p>
        )}

        {error && (
          <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
            Failed to load clients. Please try again.
          </div>
        )}

        {(canFetch || isArchiveMode) && (
          <>
            {isLoading ? (
              <CounsellorClientsSkeleton />
            ) : (
              <div className="bg-card rounded-xl border border-border/50 shadow-sm overflow-hidden">
                <DataTable
                  data={clients}
                  columns={getColumns()}
                  onRowClick={(s) => navigateToClient(s.id, "view")}
                />
                {clients.length === 0 && (
                  <div className="text-center py-12 text-muted-foreground text-sm">
                    {isArchiveMode
                      ? "No archived clients found. Try changing the search."
                      : "No clients found for this period. Try changing the date filter or search."}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>

      <AlertDialog open={showDeleteConfirm} onOpenChange={(open) => !isArchiving && setShowDeleteConfirm(open)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Archive Client</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to archive <span className="font-semibold text-foreground">{clientToDelete?.name}</span>? This client will be hidden from the active list.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex gap-3 justify-end">
            <AlertDialogCancel disabled={isArchiving}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleArchive}
              className="bg-amber-600 text-white hover:bg-amber-700 border-none"
              disabled={isArchiving}
            >
              {isArchiving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Archiving...</> : "Archive"}
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={showUnarchiveConfirm} onOpenChange={(open) => !isUnarchiving && setShowUnarchiveConfirm(open)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Unarchive Client</AlertDialogTitle>
            <AlertDialogDescription>
              Restore <span className="font-semibold text-foreground">{clientToUnarchive?.name}</span> to the active clients list?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex gap-3 justify-end">
            <AlertDialogCancel disabled={isUnarchiving}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleUnarchive} disabled={isUnarchiving}>
              {isUnarchiving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Restoring...</> : "Unarchive"}
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </PageWrapper>
  );
}
