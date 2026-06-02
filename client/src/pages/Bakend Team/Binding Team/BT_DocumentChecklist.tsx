import { useState } from "react";
import { PageWrapper } from "@/layout/PageWrapper";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Collapsible, CollapsibleContent, CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Search, ChevronDown, ChevronRight, CheckCircle2, XCircle, Clock,
  PackageCheck, PackageX, AlertTriangle,
} from "lucide-react";
import { usePageHint } from "@/hooks/usePageHint";
import { ProductTour } from "@/components/ProductTour";

type DocStatus = "approved" | "pending" | "missing" | "rejected" | "under_review" | "not_required";

interface DocItem {
  name: string; status: DocStatus; mandatory: boolean; rejectionReason?: string;
}

interface ClientDocSummary {
  id: string; code: string; name: string; visaType: string; country: string;
  totalRequired: number; approved: number; pending: number; missing: number; rejected: number;
  readyToBind: boolean;
  documents: DocItem[];
}

const MOCK_CLIENTS: ClientDocSummary[] = [
  {
    id: "1", code: "PC-2024-0001", name: "Hemali Kanjaria", visaType: "Student", country: "Canada",
    totalRequired: 10, approved: 4, pending: 3, missing: 2, rejected: 1,
    readyToBind: false,
    documents: [
      { name: "Passport", status: "approved", mandatory: true },
      { name: "Offer Letter", status: "approved", mandatory: true },
      { name: "Financial Proof", status: "approved", mandatory: true },
      { name: "Language Test Score", status: "approved", mandatory: true },
      { name: "Medical Report", status: "pending", mandatory: true },
      { name: "Police Clearance", status: "pending", mandatory: true },
      { name: "Photographs", status: "pending", mandatory: true },
      { name: "Insurance Certificate", status: "missing", mandatory: true },
      { name: "Travel Itinerary", status: "missing", mandatory: true },
      { name: "Cover Letter", status: "rejected", mandatory: false, rejectionReason: "Incorrect format — must be on company letterhead." },
    ],
  },
  {
    id: "2", code: "PC-2024-0002", name: "Sidikaben Vahora", visaType: "Work", country: "Australia",
    totalRequired: 10, approved: 8, pending: 1, missing: 0, rejected: 1,
    readyToBind: false,
    documents: [
      { name: "Passport", status: "approved", mandatory: true },
      { name: "Employment Contract", status: "approved", mandatory: true },
      { name: "Skills Assessment", status: "approved", mandatory: true },
      { name: "Character Certificate", status: "approved", mandatory: true },
      { name: "Health Insurance", status: "approved", mandatory: true },
      { name: "Bank Statements", status: "approved", mandatory: true },
      { name: "Photographs", status: "approved", mandatory: true },
      { name: "Tax Returns", status: "approved", mandatory: true },
      { name: "Police Clearance", status: "pending", mandatory: true },
      { name: "Cover Letter", status: "rejected", mandatory: false, rejectionReason: "Dates are inconsistent with employment contract." },
    ],
  },
  {
    id: "3", code: "PC-2024-0003", name: "Trushaben Patel", visaType: "Spouse", country: "UK",
    totalRequired: 10, approved: 10, pending: 0, missing: 0, rejected: 0,
    readyToBind: true,
    documents: [
      { name: "Passport (Primary)", status: "approved", mandatory: true },
      { name: "Passport (Spouse)", status: "approved", mandatory: true },
      { name: "Marriage Certificate", status: "approved", mandatory: true },
      { name: "Bank Statements", status: "approved", mandatory: true },
      { name: "Employment Letter", status: "approved", mandatory: true },
      { name: "Photographs", status: "approved", mandatory: true },
      { name: "Accommodation Proof", status: "approved", mandatory: true },
      { name: "Insurance Certificate", status: "approved", mandatory: true },
      { name: "Travel History", status: "approved", mandatory: false },
      { name: "Cover Letter", status: "approved", mandatory: false },
    ],
  },
  {
    id: "4", code: "PC-2024-0004", name: "Meenalben Manishgar", visaType: "Student", country: "Germany",
    totalRequired: 12, approved: 7, pending: 2, missing: 1, rejected: 2,
    readyToBind: false,
    documents: [
      { name: "Passport", status: "approved", mandatory: true },
      { name: "University Admission Letter", status: "approved", mandatory: true },
      { name: "Language Certificate (German B1)", status: "approved", mandatory: true },
      { name: "Financial Proof", status: "approved", mandatory: true },
      { name: "Medical Insurance", status: "approved", mandatory: true },
      { name: "Blocked Account Statement", status: "approved", mandatory: true },
      { name: "Photographs", status: "approved", mandatory: true },
      { name: "Academic Transcripts", status: "pending", mandatory: true },
      { name: "Motivation Letter", status: "pending", mandatory: false },
      { name: "Police Clearance", status: "missing", mandatory: true },
      { name: "Bank Statements", status: "rejected", mandatory: true, rejectionReason: "Statements older than 3 months — upload latest 6-month statements." },
      { name: "Cover Letter", status: "rejected", mandatory: false, rejectionReason: "Missing applicant signature." },
    ],
  },
  {
    id: "5", code: "PC-2024-0005", name: "Talat Jahan", visaType: "Visitor", country: "Canada",
    totalRequired: 8, approved: 6, pending: 2, missing: 0, rejected: 0,
    readyToBind: false,
    documents: [
      { name: "Passport", status: "approved", mandatory: true },
      { name: "Bank Statements", status: "approved", mandatory: true },
      { name: "Employment Letter", status: "approved", mandatory: true },
      { name: "ITR (2 years)", status: "approved", mandatory: true },
      { name: "Travel Itinerary", status: "approved", mandatory: true },
      { name: "Hotel Bookings", status: "approved", mandatory: true },
      { name: "Photographs", status: "pending", mandatory: true },
      { name: "Insurance Certificate", status: "pending", mandatory: true },
    ],
  },
  {
    id: "6", code: "PC-2024-0006", name: "Pooja Rao", visaType: "Student", country: "USA",
    totalRequired: 11, approved: 11, pending: 0, missing: 0, rejected: 0,
    readyToBind: true,
    documents: [
      { name: "Passport", status: "approved", mandatory: true },
      { name: "I-20 / DS-160", status: "approved", mandatory: true },
      { name: "SEVIS Payment Receipt", status: "approved", mandatory: true },
      { name: "Financial Proof", status: "approved", mandatory: true },
      { name: "Sponsor Affidavit", status: "approved", mandatory: true },
      { name: "Academic Transcripts", status: "approved", mandatory: true },
      { name: "IELTS Score", status: "approved", mandatory: true },
      { name: "Police Clearance", status: "approved", mandatory: true },
      { name: "Photographs", status: "approved", mandatory: true },
      { name: "Medical Exam Report", status: "approved", mandatory: true },
      { name: "Cover Letter", status: "approved", mandatory: false },
    ],
  },
];

const DOC_STATUS_COLOR: Record<DocStatus, string> = {
  approved: "bg-green-100 text-green-700",
  pending: "bg-gray-100 text-gray-600",
  missing: "bg-orange-100 text-orange-700",
  rejected: "bg-red-100 text-red-700",
  under_review: "bg-yellow-100 text-yellow-700",
  not_required: "bg-muted text-muted-foreground",
};

export default function BtDocumentChecklist() {
  const { showHint, dismissHint } = usePageHint("bt_doc_checklist");
  const [search, setSearch] = useState("");
  const [readinessFilter, setReadinessFilter] = useState("all");
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const filtered = MOCK_CLIENTS.filter(c => {
    const matchSearch = c.name.toLowerCase().includes(search.toLowerCase()) || c.code.toLowerCase().includes(search.toLowerCase());
    const matchReady = readinessFilter === "all" ||
      (readinessFilter === "ready" && c.readyToBind) ||
      (readinessFilter === "blocked" && !c.readyToBind);
    return matchSearch && matchReady;
  });

  function toggleExpand(id: string) {
    setExpanded(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  const readyCount = MOCK_CLIENTS.filter(c => c.readyToBind).length;
  const blockedCount = MOCK_CLIENTS.filter(c => !c.readyToBind).length;

  return (
    <PageWrapper
      title="Document Binding Checklist"
      breadcrumbs={[{ label: "Binding Team", href: "/binding/dashboard" }, { label: "Document Checklist" }]}
    >
      <div className="space-y-5">

        {/* ── Summary Banners ────────────────────────────────────────── */}
        <div data-tour="bt-docs-summary" className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card className="bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 shadow-sm">
            <CardContent className="pt-4 pb-3 px-4 flex items-center gap-3">
              <PackageCheck className="h-8 w-8 text-green-600" />
              <div>
                <p className="text-2xl font-bold text-green-700">{readyCount}</p>
                <p className="text-xs text-green-600">Ready to Bind</p>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 shadow-sm">
            <CardContent className="pt-4 pb-3 px-4 flex items-center gap-3">
              <PackageX className="h-8 w-8 text-red-500" />
              <div>
                <p className="text-2xl font-bold text-red-600">{blockedCount}</p>
                <p className="text-xs text-red-500">Blocked</p>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-card border-border shadow-sm">
            <CardContent className="pt-4 pb-3 px-4 flex items-center gap-3">
              <AlertTriangle className="h-8 w-8 text-orange-400" />
              <div>
                <p className="text-2xl font-bold text-orange-600">
                  {MOCK_CLIENTS.reduce((sum, c) => sum + c.missing + c.rejected, 0)}
                </p>
                <p className="text-xs text-muted-foreground">Missing + Rejected Docs</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* ── Filters ────────────────────────────────────────────────── */}
        <div data-tour="bt-docs-filters" className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search by client name or code..." className="pl-8" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <Select value={readinessFilter} onValueChange={setReadinessFilter}>
            <SelectTrigger className="w-[180px]"><SelectValue placeholder="Readiness" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Clients</SelectItem>
              <SelectItem value="ready">Ready to Bind</SelectItem>
              <SelectItem value="blocked">Blocked</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* ── Client Cards ───────────────────────────────────────────── */}
        <div data-tour="bt-docs-list" className="space-y-3">
          {filtered.length === 0 && (
            <div className="text-center py-12 text-muted-foreground text-sm">No clients match the current filters.</div>
          )}
          {filtered.map(client => {
            const pct = client.totalRequired > 0 ? Math.round((client.approved / client.totalRequired) * 100) : 0;
            const isOpen = expanded.has(client.id);
            const missingOrRejected = client.documents.filter(d => d.status === "missing" || d.status === "rejected");

            return (
              <Card key={client.id} className={`bg-card border-border shadow-sm ${client.readyToBind ? "border-l-4 border-l-green-400" : "border-l-4 border-l-red-400"}`}>
                <Collapsible open={isOpen} onOpenChange={() => toggleExpand(client.id)}>
                  <CollapsibleTrigger asChild>
                    <div className="p-4 cursor-pointer hover:bg-accent/30 transition-colors">
                      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="text-sm font-semibold text-foreground">{client.name}</p>
                            <span className="text-xs text-muted-foreground">{client.code}</span>
                            <span className="text-xs text-muted-foreground">·</span>
                            <span className="text-xs text-muted-foreground">{client.visaType} · {client.country}</span>
                          </div>

                          {/* Progress bar */}
                          <div className="mt-2 space-y-1">
                            <Progress value={pct} className="h-2" />
                            <div className="flex items-center gap-4 text-xs text-muted-foreground">
                              <span className="text-green-600 font-medium">{client.approved} approved</span>
                              <span>{client.pending} pending</span>
                              {client.missing > 0 && <span className="text-orange-600">{client.missing} missing</span>}
                              {client.rejected > 0 && <span className="text-red-600">{client.rejected} rejected</span>}
                              <span className="ml-auto">{pct}%</span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 flex-shrink-0">
                          {client.readyToBind ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-700">
                              <PackageCheck className="h-3 w-3" /> Ready to Bind
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-700">
                              <PackageX className="h-3 w-3" /> Blocked
                            </span>
                          )}
                          {isOpen ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
                        </div>
                      </div>
                    </div>
                  </CollapsibleTrigger>

                  <CollapsibleContent>
                    <div className="px-4 pb-4 space-y-4 border-t border-border pt-4">

                      {/* Missing / Rejected — shown prominently */}
                      {missingOrRejected.length > 0 && (
                        <div className="rounded-lg bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800 p-3">
                          <p className="text-xs font-semibold text-red-700 uppercase tracking-wide mb-2 flex items-center gap-1">
                            <AlertTriangle className="h-3.5 w-3.5" /> Blocking Documents
                          </p>
                          <div className="space-y-1.5">
                            {missingOrRejected.map((d, i) => (
                              <div key={i} className="flex items-start gap-2">
                                <XCircle className="h-3.5 w-3.5 text-red-500 mt-0.5 flex-shrink-0" />
                                <div>
                                  <span className="text-xs font-medium text-foreground">{d.name}</span>
                                  {d.status === "missing" && <span className="ml-1 text-xs text-orange-600">(missing)</span>}
                                  {d.rejectionReason && <p className="text-xs text-red-600 mt-0.5">{d.rejectionReason}</p>}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Full document table */}
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-muted/50 hover:bg-muted/50">
                            <TableHead>Document</TableHead>
                            <TableHead>Mandatory</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Rejection Reason</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {client.documents.map((doc, i) => (
                            <TableRow key={i} className="hover:bg-accent/30">
                              <TableCell className="text-sm">{doc.name}</TableCell>
                              <TableCell>
                                {doc.mandatory
                                  ? <Badge className="bg-primary/10 text-primary text-xs border-primary/20">Required</Badge>
                                  : <span className="text-xs text-muted-foreground">Optional</span>}
                              </TableCell>
                              <TableCell>
                                <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${DOC_STATUS_COLOR[doc.status]}`}>
                                  {doc.status.replace("_", " ")}
                                </span>
                              </TableCell>
                              <TableCell className="text-xs text-red-600">{doc.rejectionReason ?? "—"}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              </Card>
            );
          })}
        </div>
      </div>

      <ProductTour
        open={showHint}
        onClose={dismissHint}
        steps={[
          { target: '[data-tour="bt-docs-summary"]', title: "Readiness Summary", content: "Three cards show how many clients are Ready to Bind, Blocked, and the total count of missing or rejected documents across all files.", side: "bottom" },
          { target: '[data-tour="bt-docs-filters"]', title: "Filter Clients", content: "Search by name or code, and filter by readiness — show only clients who are blocked to focus on what needs action.", side: "bottom" },
          { target: '[data-tour="bt-docs-list"]', title: "Client Accordion", content: "Click any client card to expand the full document table. Blocking documents are highlighted at the top so you can act immediately.", side: "top" },
        ]}
      />
    </PageWrapper>
  );
}
