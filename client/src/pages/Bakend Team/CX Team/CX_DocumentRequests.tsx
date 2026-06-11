import { useMemo, useState } from "react";
import { PageWrapper } from "@/layout/PageWrapper";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { Inbox, Check, MessageSquarePlus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useDocRequests, resolveDocRequest, type DocRequest } from "@/stores/cxDocRequestStore";

/**
 * CX Team inbox for document requests raised by the Binding Team.
 * Backed by the shared (localStorage) cxDocRequestStore.
 */
export default function CxDocumentRequests() {
  const { toast } = useToast();
  const requests = useDocRequests();
  const [tab, setTab] = useState<"open" | "resolved" | "all">("open");

  const openCount = requests.filter((r) => r.status === "open").length;

  const shown = useMemo(() => {
    if (tab === "all") return requests;
    return requests.filter((r) => r.status === tab);
  }, [requests, tab]);

  const markResolved = (r: DocRequest) => {
    resolveDocRequest(r.id);
    toast({ title: "Marked resolved", description: `"${r.document}" for ${r.clientName} closed.` });
  };

  return (
    <PageWrapper
      title="Document Requests"
      breadcrumbs={[{ label: "CX Team" }, { label: "Document Requests" }]}
    >
      <div className="space-y-5">
        {/* Tabs */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="inline-flex items-center gap-1 rounded-xl border border-border bg-muted/40 p-1">
            {([
              { key: "open", label: `Open${openCount ? ` (${openCount})` : ""}` },
              { key: "resolved", label: "Resolved" },
              { key: "all", label: "All" },
            ] as const).map((t) => (
              <button
                key={t.key}
                type="button"
                onClick={() => setTab(t.key)}
                className={cn(
                  "rounded-lg px-4 py-1.5 text-sm font-medium transition-colors",
                  tab === t.key ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                )}
              >
                {t.label}
              </button>
            ))}
          </div>
          <p className="text-sm text-muted-foreground">
            <span className="font-semibold text-foreground">{shown.length}</span> request{shown.length === 1 ? "" : "s"}
          </p>
        </div>

        {/* List */}
        {shown.length === 0 ? (
          <Card className="border-border bg-card shadow-sm">
            <CardContent className="flex flex-col items-center justify-center gap-2 py-16 text-center">
              <span className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                <Inbox className="h-6 w-6" />
              </span>
              <p className="text-sm font-medium text-foreground">
                {tab === "open" ? "No open requests" : "Nothing here"}
              </p>
              <p className="text-xs text-muted-foreground">
                When the Binding Team needs a document, it shows up here.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {shown.map((r) => (
              <Card key={r.id} className="border-border bg-card shadow-sm">
                <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="flex min-w-0 gap-3">
                    <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                      <MessageSquarePlus className="h-4 w-4" />
                    </span>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-semibold text-foreground">{r.document}</p>
                        <Badge variant={r.status === "open" ? "default" : "secondary"} className="capitalize">
                          {r.status}
                        </Badge>
                      </div>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        For <span className="font-medium text-foreground">{r.clientName}</span> · requested by {r.requestedBy}
                      </p>
                      {r.note ? <p className="mt-1.5 text-sm text-foreground/90">{r.note}</p> : null}
                      <p className="mt-1 text-[11px] text-muted-foreground">
                        {format(new Date(r.createdAt), "d MMM yyyy, h:mm a")}
                        {r.resolvedAt ? ` · resolved ${format(new Date(r.resolvedAt), "d MMM, h:mm a")}` : ""}
                      </p>
                    </div>
                  </div>
                  {r.status === "open" ? (
                    <Button size="sm" variant="outline" className="shrink-0" onClick={() => markResolved(r)}>
                      <Check className="mr-1.5 h-3.5 w-3.5" />
                      Mark resolved
                    </Button>
                  ) : null}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </PageWrapper>
  );
}
