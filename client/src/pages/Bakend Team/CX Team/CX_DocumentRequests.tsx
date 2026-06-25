import { useState } from "react";
import { useLocation } from "wouter";
import { PageWrapper } from "@/layout/PageWrapper";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import {
  Inbox,
  CheckCheck,
  Clock3,
  CheckCircle2,
  ArrowUpRight,
  User,
  Users,
  MessageSquare,
  FileStack,
  FolderOpen,
  CircleCheckBig,
  Send,
  Loader2,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import {
  useDocumentRequests,
  useResolveDocumentRequest,
  useAssignableUsers,
  useAssignBulkVisaCases,
} from "@/hooks/useVisaCases";
import type { DocRequestStatus, DocumentRequest } from "@/api/visaCases.api";

type TabFilter = "open" | "resolved" | "all";

const TAB_TO_STATUS: Record<TabFilter, DocRequestStatus | undefined> = {
  open: "OPEN",
  resolved: "FULFILLED",
  all: undefined,
};

function getInitials(str: string) {
  return str.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();
}

type PendingResolve = {
  request: DocumentRequest;
  displayName: string;
};

export default function CxDocumentRequests() {
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [tab, setTab] = useState<TabFilter>("open");
  const [pending, setPending] = useState<PendingResolve | null>(null);
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);

  const { data, isLoading } = useDocumentRequests(
    TAB_TO_STATUS[tab] ? { status: TAB_TO_STATUS[tab] } : {},
  );
  const requests = data?.data ?? [];
  const resolveMutation = useResolveDocumentRequest();
  const assignMutation = useAssignBulkVisaCases();

  const { data: bindingUsers = [], isLoading: usersLoading } = useAssignableUsers(
    !!pending,
    "binding",
  );

  const { data: openData } = useDocumentRequests({ status: "OPEN" }, tab !== "open");
  const { data: resolvedData } = useDocumentRequests({ status: "FULFILLED" }, tab !== "resolved");
  const { data: allData } = useDocumentRequests({}, tab !== "all");

  const openCount     = tab === "open"     ? (data?.total ?? 0) : (openData?.total ?? 0);
  const resolvedCount = tab === "resolved" ? (data?.total ?? 0) : (resolvedData?.total ?? 0);
  const totalCount    = tab === "all"      ? (data?.total ?? 0) : (allData?.total ?? 0);

  const openResolveDialog = (request: DocumentRequest, displayName: string) => {
    const raiserId =
      request.raisedByUser?.role === "binding_team" || request.raisedByUser?.role === "binding"
        ? request.raisedByUser.id
        : null;
    setSelectedUserId(raiserId);
    setPending({ request, displayName });
  };

  const confirmResolveAndAssign = () => {
    if (!pending) return;
    const { request, displayName } = pending;

    resolveMutation.mutate(
      { id: request.id },
      {
        onSuccess: () => {
          if (selectedUserId && request.visaCaseId) {
            assignMutation.mutate(
              { visaCaseIds: [request.visaCaseId], assignedUserId: selectedUserId },
              {
                onSuccess: () => {
                  const assignee = bindingUsers.find((u) => u.id === selectedUserId);
                  toast({
                    title: "Resolved & reassigned",
                    description: `"${request.documentType}" closed and client sent back to ${assignee?.fullName ?? "Binding Team"}.`,
                  });
                  setPending(null);
                },
                onError: (err: any) => {
                  toast({
                    title: "Resolved but reassign failed",
                    description: err?.response?.data?.message ?? "Could not reassign to Binding Team.",
                    variant: "destructive",
                  });
                  setPending(null);
                },
              },
            );
          } else {
            toast({
              title: "Marked resolved",
              description: `"${request.documentType}" for ${displayName} closed.`,
            });
            setPending(null);
          }
        },
        onError: (err: any) => {
          toast({
            title: "Failed to resolve",
            description: err?.response?.data?.message ?? "Something went wrong.",
            variant: "destructive",
          });
        },
      },
    );
  };

  const isBusy = resolveMutation.isPending || assignMutation.isPending;

  const tabs: { key: TabFilter; label: string; count: number }[] = [
    { key: "open",     label: "Open",     count: openCount },
    { key: "resolved", label: "Resolved", count: resolvedCount },
    { key: "all",      label: "All",      count: totalCount },
  ];

  return (
    <PageWrapper
      title="Document Requests"
      breadcrumbs={[{ label: "CX Team" }, { label: "Document Requests" }]}
    >
      <div className="space-y-6">

        {/* ── Stat chips ── */}
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-3">
          {[
            {
              label: "Total",
              value: totalCount,
              icon: <FileStack className="h-5 w-5" />,
              bg: "bg-muted/60",
              border: "border-border",
              text: "text-foreground",
              sub: "text-muted-foreground",
            },
            {
              label: "Open",
              value: openCount,
              icon: <FolderOpen className="h-5 w-5" />,
              bg: "bg-primary/5",
              border: "border-primary/20",
              text: "text-primary",
              sub: "text-primary/60",
            },
            {
              label: "Resolved",
              value: resolvedCount,
              icon: <CircleCheckBig className="h-5 w-5" />,
              bg: "bg-emerald-50 dark:bg-emerald-950/20",
              border: "border-emerald-200 dark:border-emerald-800",
              text: "text-emerald-700 dark:text-emerald-400",
              sub: "text-emerald-600/60 dark:text-emerald-500/60",
            },
          ].map((s) => (
            <div key={s.label} className={cn("flex items-center gap-3 rounded-2xl border px-4 py-4 sm:px-5", s.bg, s.border)}>
              <span className={cn("shrink-0", s.text)}>{s.icon}</span>
              <div>
                <p className={cn("text-2xl font-black leading-none", s.text)}>
                  {isLoading ? "—" : s.value}
                </p>
                <p className={cn("mt-0.5 text-[11px] font-medium", s.sub)}>{s.label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* ── Tabs ── */}
        <div className="flex items-center gap-1 rounded-2xl border border-border bg-muted/30 p-1 w-fit">
          {tabs.map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key)}
              className={cn(
                "flex items-center gap-2 rounded-xl px-5 py-2 text-sm font-semibold transition-all duration-150",
                tab === t.key
                  ? "bg-card text-foreground shadow border border-border"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {t.label}
              {t.count > 0 && (
                <span className={cn(
                  "min-w-[20px] rounded-full px-1.5 py-px text-center text-[10px] font-bold leading-4",
                  tab === t.key
                    ? t.key === "open"
                      ? "bg-primary text-primary-foreground"
                      : t.key === "resolved"
                        ? "bg-emerald-500 text-white"
                        : "bg-foreground text-background"
                    : "bg-border text-muted-foreground",
                )}>
                  {t.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* ── Loading ── */}
        {isLoading && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="overflow-hidden rounded-2xl border border-border bg-card">
                <div className="space-y-3 p-5">
                  <div className="flex items-center gap-3">
                    <Skeleton className="h-12 w-12 rounded-2xl" />
                    <div className="flex-1 space-y-1.5">
                      <Skeleton className="h-4 w-2/3" />
                      <Skeleton className="h-3 w-1/3" />
                    </div>
                  </div>
                  <Skeleton className="h-3 w-full" />
                  <Skeleton className="h-3 w-3/4" />
                  <Skeleton className="h-9 w-full rounded-xl mt-2" />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── Empty ── */}
        {!isLoading && requests.length === 0 && (
          <div className="flex flex-col items-center justify-center gap-4 rounded-2xl border border-dashed border-border bg-card py-24 text-center">
            <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
              <Inbox className="h-8 w-8" />
            </span>
            <div>
              <p className="font-bold text-foreground text-base">
                {tab === "open" ? "No open requests" : "Nothing here yet"}
              </p>
              <p className="mt-1 text-sm text-muted-foreground max-w-xs mx-auto">
                {tab === "open"
                  ? "When the Binding Team needs a document, it'll show up here."
                  : "Completed requests will appear in this view."}
              </p>
            </div>
          </div>
        )}

        {/* ── Card grid ── */}
        {!isLoading && requests.length > 0 && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {requests.map((r) => {
              const canNavigate  = !!r.legacyClientId;
              const displayName  = r.personLabel || r.clientName || "Unknown Client";
              const isOpen       = r.requestStatus === "OPEN";
              const isFulfilled  = r.requestStatus === "FULFILLED";
              const initials     = getInitials(r.documentType);

              return (
                <div
                  key={r.id}
                  className={cn(
                    "group relative flex flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-sm transition-all duration-150",
                    canNavigate && "hover:shadow-lg hover:-translate-y-0.5 cursor-pointer",
                  )}
                  onClick={() => canNavigate && navigate(`/clients/${r.legacyClientId}/view`)}
                >
                  {/* ── Card header band ── */}
                  <div className={cn(
                    "relative flex items-start justify-between gap-3 px-5 pt-5 pb-4",
                    isOpen ? "bg-primary/5" : isFulfilled ? "bg-emerald-500/5" : "bg-muted/30",
                  )}>
                    {/* Initials box */}
                    <div className={cn(
                      "flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-sm font-black tracking-wide shadow-sm",
                      isOpen
                        ? "bg-primary text-primary-foreground"
                        : isFulfilled
                          ? "bg-emerald-500 text-white"
                          : "bg-muted-foreground text-background",
                    )}>
                      {initials}
                    </div>

                    {/* Doc type + status */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-foreground leading-snug">{r.documentType}</p>
                      <span className={cn(
                        "mt-1 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider",
                        isOpen
                          ? "bg-primary/15 text-primary"
                          : isFulfilled
                            ? "bg-emerald-500/15 text-emerald-600"
                            : "bg-muted text-muted-foreground",
                      )}>
                        <span className={cn(
                          "h-1.5 w-1.5 rounded-full",
                          isOpen ? "bg-primary animate-pulse" : isFulfilled ? "bg-emerald-500" : "bg-muted-foreground",
                        )} />
                        {isOpen ? "Open" : isFulfilled ? "Resolved" : "Cancelled"}
                      </span>
                    </div>

                    {/* Navigate arrow */}
                    {canNavigate && (
                      <span className={cn(
                        "flex h-7 w-7 shrink-0 items-center justify-center rounded-lg transition-all",
                        "bg-background/70 text-muted-foreground group-hover:bg-primary group-hover:text-primary-foreground",
                      )}>
                        <ArrowUpRight className="h-3.5 w-3.5" />
                      </span>
                    )}
                  </div>

                  {/* ── Divider ── */}
                  <div className="h-px bg-border mx-5" />

                  {/* ── Card body ── */}
                  <div className="flex flex-1 flex-col gap-3 px-5 py-4">
                    {/* Client */}
                    <div className="flex items-center gap-2">
                      <span className={cn(
                        "flex h-7 w-7 shrink-0 items-center justify-center rounded-lg",
                        isOpen ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground",
                      )}>
                        <User className="h-3.5 w-3.5" />
                      </span>
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-foreground truncate">{displayName}</p>
                        {r.raisedByUser?.fullName && (
                          <p className="text-[11px] text-muted-foreground truncate">
                            requested by <span className="font-medium text-foreground/70">{r.raisedByUser.fullName}</span>
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Note */}
                    {r.notes && (
                      <div className="flex items-start gap-2">
                        <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                          <MessageSquare className="h-3.5 w-3.5" />
                        </span>
                        <p className="text-[12px] text-muted-foreground italic leading-relaxed line-clamp-2">
                          "{r.notes}"
                        </p>
                      </div>
                    )}

                    {/* Date */}
                    <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground mt-auto">
                      <Clock3 className="h-3 w-3 shrink-0" />
                      {format(new Date(r.createdAt), "d MMM yyyy, h:mm a")}
                      {r.fulfilledAt && (
                        <span className="flex items-center gap-1 text-emerald-600 ml-1">
                          · <CheckCircle2 className="h-3 w-3" />
                          {format(new Date(r.fulfilledAt), "d MMM")}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* ── Card footer action ── */}
                  {isOpen && (
                    <div className="px-5 pb-5">
                      <Button
                        size="sm"
                        className="w-full gap-2 rounded-xl bg-primary/10 text-primary hover:bg-primary hover:text-primary-foreground border-0 shadow-none font-semibold h-9 transition-all"
                        disabled={isBusy}
                        onClick={(e) => {
                          e.stopPropagation();
                          openResolveDialog(r, displayName);
                        }}
                      >
                        <CheckCheck className="h-4 w-4" />
                        Mark as Resolved
                      </Button>
                    </div>
                  )}

                  {isFulfilled && (
                    <div className="px-5 pb-5">
                      <div className="flex items-center justify-center gap-2 rounded-xl bg-emerald-500/10 py-2 text-xs font-semibold text-emerald-600">
                        <CircleCheckBig className="h-3.5 w-3.5" />
                        Resolved
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

      </div>

      {/* ── Resolve & Reassign Dialog ── */}
      <Dialog open={!!pending} onOpenChange={(open) => { if (!open && !isBusy) setPending(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader className="space-y-3">
            <DialogTitle className="flex items-center gap-2.5 text-base font-bold">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Send className="h-4 w-4" />
              </span>
              Resolve &amp; Return to Binding
            </DialogTitle>
            <DialogDescription asChild>
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-3 rounded-lg bg-muted/60 border border-border px-3 py-2.5">
                  <span className="text-xs font-medium text-muted-foreground w-16 shrink-0">Document</span>
                  <span className="text-sm font-semibold text-foreground truncate">
                    {pending?.request.documentType}
                  </span>
                </div>
                <div className="flex items-center gap-3 rounded-lg bg-muted/60 border border-border px-3 py-2.5">
                  <span className="text-xs font-medium text-muted-foreground w-16 shrink-0">Client</span>
                  <span className="text-sm font-semibold text-foreground truncate">
                    {pending?.displayName}
                  </span>
                </div>
              </div>
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Section label */}
            <div className="flex items-center gap-2">
              <Users className="h-3.5 w-3.5 text-primary shrink-0" />
              <p className="text-sm font-semibold text-foreground">
                Assign to Binding Team member
              </p>
            </div>

            {/* User cards */}
            {usersLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-14 w-full rounded-xl" />
                <Skeleton className="h-14 w-full rounded-xl" />
              </div>
            ) : bindingUsers.length === 0 ? (
              <p className="text-sm text-muted-foreground py-2">
                No Binding Team members available.
              </p>
            ) : (
              <div className="space-y-2 max-h-52 overflow-y-auto">
                {bindingUsers.map((u) => {
                  const initials = u.fullName
                    .split(" ")
                    .map((w: string) => w[0])
                    .join("")
                    .slice(0, 2)
                    .toUpperCase();
                  const isSelected = selectedUserId === u.id;
                  return (
                    <button
                      key={u.id}
                      type="button"
                      onClick={() => setSelectedUserId(isSelected ? null : u.id)}
                      className={cn(
                        "w-full flex items-center gap-3 rounded-xl border px-4 py-3 text-left transition-all duration-150",
                        isSelected
                          ? "border-primary bg-primary/5 ring-1 ring-primary/20"
                          : "border-border bg-background hover:border-primary/30 hover:bg-accent",
                      )}
                    >
                      <div className={cn(
                        "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-xs font-bold",
                        isSelected ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground",
                      )}>
                        {initials}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className={cn(
                          "text-sm font-semibold truncate",
                          isSelected ? "text-primary" : "text-foreground",
                        )}>
                          {u.fullName}
                        </p>
                        {u.empId && (
                          <p className="text-xs text-muted-foreground mt-0.5">{u.empId}</p>
                        )}
                      </div>
                      {isSelected && (
                        <CheckCheck className="h-4 w-4 shrink-0 text-primary" />
                      )}
                    </button>
                  );
                })}
              </div>
            )}

            {!selectedUserId && !usersLoading && bindingUsers.length > 0 && (
              <p className="text-xs text-amber-600 dark:text-amber-400">
                No member selected — client will only be resolved, not reassigned.
              </p>
            )}
          </div>

          <DialogFooter className="gap-2 pt-1">
            <Button
              variant="outline"
              className="rounded-xl"
              disabled={isBusy}
              onClick={() => setPending(null)}
            >
              Cancel
            </Button>
            <Button
              className="rounded-xl gap-2"
              disabled={isBusy || usersLoading}
              onClick={confirmResolveAndAssign}
            >
              {isBusy ? (
                <><Loader2 className="h-4 w-4 animate-spin" /> Processing…</>
              ) : selectedUserId ? (
                <><Send className="h-4 w-4" /> Resolve &amp; Assign</>
              ) : (
                <><CheckCheck className="h-4 w-4" /> Mark Resolved</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </PageWrapper>
  );
}
