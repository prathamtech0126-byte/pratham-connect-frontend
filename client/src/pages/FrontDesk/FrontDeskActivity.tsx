import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Activity, FileText, LogIn, LogOut, Pencil, Send, UserCheck, X } from "lucide-react";
import { PageWrapper } from "@/layout/PageWrapper";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DataTable } from "@/components/table/DataTable";
import { TableToolbar } from "@/components/table/TableToolbar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { formatCrmTimestamp } from "@/lib/format-crm-timestamp";
import { frontDeskApi, ActivityLogEntry } from "@/api/frontdesk.api";
import { useAuth } from "@/context/auth-context";

const PAGE_SIZE = 50;

function getInitials(name?: string | null) {
  if (!name) return "FD";
  return name
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function actionConfig(action: string) {
  const map: Record<string, { label: string; className: string }> = {
    verify: { label: "Verify", className: "bg-green-100 text-green-700 hover:bg-green-100" },
    verify_transfer: { label: "Verify & Transfer", className: "bg-green-100 text-green-700 hover:bg-green-100" },
    assign: { label: "Assign", className: "bg-blue-100 text-blue-700 hover:bg-blue-100" },
    reassign: { label: "Reassign", className: "bg-indigo-100 text-indigo-700 hover:bg-indigo-100" },
    update_details: { label: "Update", className: "bg-orange-100 text-orange-700 hover:bg-orange-100" },
    login: { label: "Login", className: "bg-emerald-100 text-emerald-700 hover:bg-emerald-100" },
    logout: { label: "Logout", className: "bg-slate-100 text-slate-600 hover:bg-slate-100" },
  };
  return map[action] ?? { label: action, className: "bg-gray-100 text-gray-600 hover:bg-gray-100" };
}

function actionBadge(action: string) {
  const cfg = actionConfig(action);
  return <Badge className={`${cfg.className} text-xs font-medium`}>{cfg.label}</Badge>;
}

function actionIcon(action: string) {
  switch (action) {
    case "login":
      return <LogIn className="h-4 w-4 text-emerald-500" />;
    case "logout":
      return <LogOut className="h-4 w-4 text-slate-500" />;
    case "verify_transfer":
      return <Send className="h-4 w-4 text-green-600" />;
    case "assign":
    case "reassign":
      return <UserCheck className="h-4 w-4 text-blue-600" />;
    case "update_details":
      return <Pencil className="h-4 w-4 text-orange-500" />;
    default:
      return <Activity className="h-4 w-4 text-orange-500" />;
  }
}

export default function FrontDeskActivity() {
  const { user } = useAuth();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [actionFilter, setActionFilter] = useState("all");
  const isAdminView = user?.role === "superadmin" || user?.role === "developer";

  const { data, isLoading } = useQuery({
    queryKey: ["frontdesk-activity", page],
    queryFn: () => frontDeskApi.getActivityLogs({ page, limit: PAGE_SIZE }),
  });

  const rows: ActivityLogEntry[] = data?.rows ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.ceil(total / PAGE_SIZE);
  const filteredRows = useMemo(() => {
    const term = search.trim().toLowerCase();
    return rows.filter((entry) => {
      const matchesAction = actionFilter === "all" || entry.action === actionFilter;
      const text = [
        entry.action,
        entry.description,
        entry.leadName,
        entry.leadPhone,
        entry.userName,
      ].filter(Boolean).join(" ").toLowerCase();
      return matchesAction && (!term || text.includes(term));
    });
  }, [actionFilter, rows, search]);

  const columns = [
    {
      header: "User",
      cell: (entry: ActivityLogEntry) => (
        <div className="flex items-center gap-3">
          <Avatar className="h-8 w-8">
            <AvatarFallback className="bg-blue-100 text-blue-700 text-xs">
              {getInitials(entry.userName)}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <p className="text-sm font-medium truncate">{entry.userName ?? "Front Desk"}</p>
            <p className="text-xs text-muted-foreground">Front Desk</p>
          </div>
        </div>
      ),
    },
    {
      header: "Type",
      className: "w-[160px]",
      cell: (entry: ActivityLogEntry) => (
        <div className="flex items-center gap-2">
          {actionIcon(entry.action)}
          {actionBadge(entry.action)}
        </div>
      ),
    },
    {
      header: "Activity",
      cell: (entry: ActivityLogEntry) => (
        <div className="flex flex-col">
          <span className="text-sm font-medium">{entry.description || actionConfig(entry.action).label}</span>
          <span className="text-xs text-muted-foreground">
            {entry.leadName ? `Lead: ${entry.leadName}${entry.leadPhone ? ` (${entry.leadPhone})` : ""}` : "Front desk session"}
          </span>
        </div>
      ),
    },
    {
      header: "Date & Time",
      className: "w-[150px] text-right",
      cell: (entry: ActivityLogEntry) => (
        <div className="flex flex-col">
          <span className="text-sm">{entry.createdAt ? formatCrmTimestamp(entry.createdAt, "date") : "—"}</span>
          <span className="text-xs text-muted-foreground">{entry.createdAt ? formatCrmTimestamp(entry.createdAt, "time") : ""}</span>
        </div>
      ),
    },
  ];

  return (
    <PageWrapper title="Activity Log" breadcrumbs={[{ label: "Front Desk" }, { label: "Activity Log" }]}>
      <Card className="border-none shadow-sm">
        <CardHeader>
          <CardTitle className="text-subheader">Activity History</CardTitle>
          <CardDescription>
            {isLoading
              ? "Loading activity logs..."
              : `Showing ${filteredRows.length} of ${total} activities (Page ${page} of ${Math.max(totalPages, 1)})`}
            {isAdminView ? " across all front desk users." : " from your account."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <TableToolbar
              searchPlaceholder="Search activity, user, or lead..."
              onSearch={setSearch}
              filters={
                <div className="flex items-center gap-2 flex-wrap">
                  <Select value={actionFilter} onValueChange={setActionFilter}>
                    <SelectTrigger className="w-[160px] bg-card border-border/50">
                      <SelectValue placeholder="Action" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Actions</SelectItem>
                      <SelectItem value="login">Login</SelectItem>
                      <SelectItem value="logout">Logout</SelectItem>
                      <SelectItem value="update_details">Update</SelectItem>
                      <SelectItem value="verify_transfer">Verify & Transfer</SelectItem>
                      <SelectItem value="assign">Assign</SelectItem>
                      <SelectItem value="reassign">Reassign</SelectItem>
                    </SelectContent>
                  </Select>
                  {(search || actionFilter !== "all") && (
                    <Button
                      variant="outline"
                      onClick={() => {
                        setSearch("");
                        setActionFilter("all");
                      }}
                      className="bg-card text-destructive hover:text-destructive hover:bg-destructive/10 border-destructive/30"
                    >
                      Clear All
                      <X className="ml-2 h-4 w-4" />
                    </Button>
                  )}
                </div>
              }
            />

            {isLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} className="h-16 rounded-xl border bg-slate-50 animate-pulse" />
                ))}
              </div>
            ) : filteredRows.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <FileText className="h-8 w-8 text-muted-foreground mb-2" />
                <p className="text-muted-foreground font-medium">No activities found</p>
                <p className="text-sm text-muted-foreground mt-1">Try adjusting your filters</p>
              </div>
            ) : (
              <DataTable data={filteredRows} columns={columns} />
            )}

            {totalPages > 1 && (
              <div className="flex items-center justify-between pt-4">
                <div className="text-sm text-muted-foreground">
                  Page {page} of {totalPages} ({total} total)
                </div>
                <Pagination>
                  <PaginationContent>
                    <PaginationItem>
                      <PaginationPrevious
                        href="#"
                        onClick={(event) => {
                          event.preventDefault();
                          setPage((p) => Math.max(1, p - 1));
                        }}
                        className={page === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                      />
                    </PaginationItem>
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      const start = Math.min(Math.max(page - 2, 1), Math.max(totalPages - 4, 1));
                      const pageNum = start + i;
                      return (
                        <PaginationItem key={`${pageNum}-${i}`}>
                          <PaginationLink
                            href="#"
                            isActive={page === pageNum}
                            className="cursor-pointer"
                            onClick={(event) => {
                              event.preventDefault();
                              setPage(pageNum);
                            }}
                          >
                            {pageNum}
                          </PaginationLink>
                        </PaginationItem>
                      );
                    })}
                    <PaginationItem>
                      <PaginationNext
                        href="#"
                        onClick={(event) => {
                          event.preventDefault();
                          setPage((p) => Math.min(totalPages, p + 1));
                        }}
                        className={page === totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
                      />
                    </PaginationItem>
                  </PaginationContent>
                </Pagination>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </PageWrapper>
  );
}
