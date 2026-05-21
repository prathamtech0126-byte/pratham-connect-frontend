import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, Redirect } from "wouter";
import { ArrowLeft, ChevronLeft, ChevronRight, Loader2, Send, Share2 } from "lucide-react";

import { PageWrapper } from "@/layout/PageWrapper";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/context/auth-context";
import { canUseCsvImportExport } from "@/lib/lead-permissions";
import { getLeads, type LeadEntity } from "@/api/leads.api";
import {
  getMetaConversionsStatus,
  sendMetaConversionsEvents,
  type MetaConversionsStatus,
  type MetaGraphBatchResponse,
} from "@/api/leadAutomation.api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

const PROGRESS_STATUS_OPTIONS = [
  { value: "all", label: "All progress statuses" },
  { value: "not_contacted", label: "Not contacted" },
  { value: "contacted", label: "Contacted" },
  { value: "follow_up", label: "Follow up" },
  { value: "converted", label: "Converted" },
  { value: "junk", label: "Junk" },
];

const PAGE_SIZE_OPTIONS = [20, 50, 100];

const statusColors: Record<string, string> = {
  not_contacted: "bg-slate-100 text-slate-700",
  contacted: "bg-blue-100 text-blue-700",
  follow_up: "bg-amber-100 text-amber-800",
  converted: "bg-green-100 text-green-700",
  junk: "bg-red-100 text-red-700",
};

function formatStatus(value: string) {
  return value.replace(/_/g, " ");
}

export default function MetaConversionsPage() {
  const { user } = useAuth();
  const { toast } = useToast();

  const [status, setStatus] = useState<MetaConversionsStatus | null>(null);
  const [statusLoading, setStatusLoading] = useState(true);
  const [leads, setLeads] = useState<LeadEntity[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [search, setSearch] = useState("");
  const [progressStatus, setProgressStatus] = useState("all");
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [metaResponses, setMetaResponses] = useState<MetaGraphBatchResponse[]>([]);

  const canAccess = Boolean(user && canUseCsvImportExport(user.role));

  const loadStatus = useCallback(async () => {
    setStatusLoading(true);
    try {
      const data = await getMetaConversionsStatus();
      setStatus(data);
    } catch {
      toast({
        title: "Could not load Meta configuration",
        description: "Check your Facebook connection and try again.",
        variant: "destructive",
      });
    } finally {
      setStatusLoading(false);
    }
  }, [toast]);

  const loadLeads = useCallback(async () => {
    setLoading(true);
    try {
      const response = await getLeads({
        page,
        limit,
        search: search.trim() || undefined,
        progressStatus: progressStatus === "all" ? undefined : progressStatus,
        leadSource: "facebook",
      });
      setLeads(response.items);
      setTotal(response.pagination.total);
      setTotalPages(response.pagination.totalPages);
    } catch {
      toast({
        title: "Could not load leads",
        description: "Try refreshing the page.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [limit, page, progressStatus, search, toast]);

  useEffect(() => {
    if (!canAccess) return;
    void loadStatus();
  }, [canAccess, loadStatus]);

  useEffect(() => {
    if (!canAccess) return;
    void loadLeads();
  }, [canAccess, loadLeads]);

  const pageLeadIds = useMemo(() => leads.map((lead) => lead.id), [leads]);
  const allOnPageSelected =
    pageLeadIds.length > 0 && pageLeadIds.every((id) => selectedIds.has(id));
  const someOnPageSelected = pageLeadIds.some((id) => selectedIds.has(id));

  const toggleLead = (leadId: number) => {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(leadId)) next.delete(leadId);
      else next.add(leadId);
      return next;
    });
  };

  const toggleAllOnPage = () => {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (allOnPageSelected) {
        pageLeadIds.forEach((id) => next.delete(id));
      } else {
        pageLeadIds.forEach((id) => next.add(id));
      }
      return next;
    });
  };

  const handleSend = async () => {
    const leadIds = Array.from(selectedIds);
    if (!leadIds.length) {
      toast({
        title: "Select leads first",
        description: "Choose one or more leads to send to Meta.",
        variant: "destructive",
      });
      return;
    }

    setSending(true);
    try {
      const result = await sendMetaConversionsEvents(leadIds);
      setMetaResponses(result.metaResponses || []);
      console.log("[MetaConversions] API metaResponses");
      console.log(JSON.stringify(result.metaResponses, null, 2));

      if (result.failed > 0) {
        const metaError =
          result.metaResponses.find((response) => !response.success)?.errorMessage ||
          result.metaResponses.find((response) => !response.success)?.body;
        toast({
          title: "Some events were not accepted",
          description:
            typeof metaError === "string"
              ? metaError
              : `${result.sent} sent, ${result.failed} failed. See Meta response below.`,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Events sent to Meta",
          description: `${result.sent} lead event${result.sent === 1 ? "" : "s"} submitted.`,
        });
        setSelectedIds(new Set());
      }
    } catch (error: any) {
      toast({
        title: "Failed to send events",
        description: error?.response?.data?.message || "Meta rejected the request.",
        variant: "destructive",
      });
    } finally {
      setSending(false);
    }
  };

  if (!canAccess) {
    return <Redirect to="/" />;
  }

  return (
    <PageWrapper
      title="Meta Conversions API"
      breadcrumbs={[
        { label: "Leads", href: "/leads" },
        { label: "Automation", href: "/leads/automation" },
        { label: "Meta Conversions API" },
      ]}
      actions={
        <Link href="/leads/automation">
          <Button variant="outline" size="sm" className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
        </Link>
      }
    >
      <div className="space-y-6">
        <Card className="border-border/60 shadow-sm">
          <CardHeader className="pb-3">
            <div className="flex items-start gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-[#1877F2]/10">
                <Share2 className="h-5 w-5 text-[#1877F2]" />
              </div>
              <div className="min-w-0 flex-1">
                <CardTitle className="text-base">Send lead quality signals to Meta</CardTitle>
                <CardDescription>
                  Select Facebook leads and send their current progress status back to Meta through
                  the Conversions API so campaigns can optimise for better lead quality.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-lg border border-border/60 p-3">
              <p className="text-xs text-muted-foreground">Pixel ID</p>
              <p className="mt-1 text-sm font-medium">{status?.pixelId || "—"}</p>
            </div>
            <div className="rounded-lg border border-border/60 p-3">
              <p className="text-xs text-muted-foreground">Facebook connection</p>
              <p className="mt-1 text-sm font-medium">
                {statusLoading
                  ? "Checking..."
                  : status?.facebookConnected
                    ? status.facebookExpired
                      ? "Expired"
                      : "Connected"
                    : "Not connected"}
              </p>
            </div>
            <div className="rounded-lg border border-border/60 p-3">
              <p className="text-xs text-muted-foreground">Access token source</p>
              <p className="mt-1 text-sm font-medium">
                {status?.hasDedicatedAccessToken
                  ? "Dedicated CAPI token"
                  : status?.usingFacebookUserTokenFallback
                    ? "Facebook user token (fallback)"
                    : "Facebook user token"}
              </p>
              {!statusLoading && !status?.hasDedicatedAccessToken ? (
                <p className="mt-2 text-xs text-amber-700">
                  Set META_CONVERSIONS_ACCESS_TOKEN in the backend for the Events Manager pixel token.
                </p>
              ) : null}
            </div>
            <div className="rounded-lg border border-border/60 p-3">
              <p className="text-xs text-muted-foreground">Selected leads</p>
              <p className="mt-1 text-sm font-medium">{selectedIds.size}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/60 shadow-sm">
          <CardHeader className="gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <CardTitle className="text-base">Facebook leads</CardTitle>
              <CardDescription>
                Filter by progress status, select rows, then send the latest CRM status to Meta.
              </CardDescription>
            </div>
            <Button onClick={handleSend} disabled={sending || selectedIds.size === 0} className="gap-2">
              {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              Send to Meta
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
              <Input
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value);
                  setPage(1);
                }}
                placeholder="Search name, phone, email..."
                className="max-w-md"
              />
              <Select
                value={progressStatus}
                onValueChange={(value) => {
                  setProgressStatus(value);
                  setPage(1);
                }}
              >
                <SelectTrigger className="w-full max-w-xs">
                  <SelectValue placeholder="Progress status" />
                </SelectTrigger>
                <SelectContent>
                  {PROGRESS_STATUS_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select
                value={String(limit)}
                onValueChange={(value) => {
                  setLimit(Number(value));
                  setPage(1);
                }}
              >
                <SelectTrigger className="w-full max-w-[140px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PAGE_SIZE_OPTIONS.map((size) => (
                    <SelectItem key={size} value={String(size)}>
                      {size} / page
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="rounded-lg border border-border/60 overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10">
                      <Checkbox
                        checked={allOnPageSelected ? true : someOnPageSelected ? "indeterminate" : false}
                        onCheckedChange={toggleAllOnPage}
                        aria-label="Select all leads on this page"
                      />
                    </TableHead>
                    <TableHead>Lead</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Progress</TableHead>
                    <TableHead>Quality</TableHead>
                    <TableHead>Facebook lead ID</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={6} className="py-10 text-center text-muted-foreground">
                        <Loader2 className="mx-auto mb-2 h-5 w-5 animate-spin" />
                        Loading leads...
                      </TableCell>
                    </TableRow>
                  ) : leads.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="py-10 text-center text-muted-foreground">
                        No Facebook leads match the current filters.
                      </TableCell>
                    </TableRow>
                  ) : (
                    leads.map((lead) => (
                      <TableRow key={lead.id}>
                        <TableCell>
                          <Checkbox
                            checked={selectedIds.has(lead.id)}
                            onCheckedChange={() => toggleLead(lead.id)}
                            aria-label={`Select ${lead.fullName}`}
                          />
                        </TableCell>
                        <TableCell>
                          <div className="font-medium">{lead.fullName}</div>
                          <div className="text-xs text-muted-foreground">{lead.email || "No email"}</div>
                        </TableCell>
                        <TableCell>{lead.phone}</TableCell>
                        <TableCell>
                          <Badge
                            variant="secondary"
                            className={cn(
                              "capitalize",
                              statusColors[lead.progressStatus] || "bg-gray-100 text-gray-600"
                            )}
                          >
                            {formatStatus(lead.progressStatus)}
                          </Badge>
                        </TableCell>
                        <TableCell className="capitalize">{lead.leadQuality || "—"}</TableCell>
                        <TableCell className="font-mono text-xs">{lead.externalLeadId || "—"}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-muted-foreground">
                Showing {leads.length ? (page - 1) * limit + 1 : 0}-
                {Math.min(page * limit, total)} of {total}
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((current) => Math.max(1, current - 1))}
                  disabled={page <= 1 || loading}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-sm">
                  Page {page} of {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
                  disabled={page >= totalPages || loading}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {metaResponses.length > 0 ? (
          <Card className="border-border/60 shadow-sm">
            <CardHeader>
              <CardTitle className="text-base">Meta Graph API response</CardTitle>
              <CardDescription>
                Raw response returned by Meta for the latest send attempt.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <pre className="max-h-[420px] overflow-auto rounded-lg bg-muted/40 p-4 text-xs leading-relaxed">
                {JSON.stringify(metaResponses, null, 2)}
              </pre>
            </CardContent>
          </Card>
        ) : null}
      </div>
    </PageWrapper>
  );
}
