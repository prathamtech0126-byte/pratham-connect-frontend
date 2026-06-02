import { useState } from "react";
import { useLocation } from "wouter";
import { PageWrapper } from "@/layout/PageWrapper";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, ChevronDown, ChevronRight, ExternalLink } from "lucide-react";
import { usePageHint } from "@/hooks/usePageHint";
import { ProductTour } from "@/components/ProductTour";

type DocStatus = "pending" | "uploaded" | "under_review" | "approved" | "rejected" | "missing" | "not_required";

interface DocumentItem {
  id: string; name: string; status: DocStatus;
  uploadedAt: string | null; reviewedAt: string | null;
  rejectionReason: string | null; ocrStatus: "not_processed" | "processed" | null;
  ocrConfidence: number | null;
}

interface ClientDocs {
  clientId: string; clientCode: string; clientName: string;
  country: string; visaType: string;
  documents: DocumentItem[];
}

const MOCK_CLIENT_DOCS: ClientDocs[] = [
  {
    clientId: "1", clientCode: "PC-2024-0001", clientName: "Hemali Kanjaria", country: "Canada", visaType: "Student",
    documents: [
      { id: "d1", name: "Passport Copy", status: "approved", uploadedAt: "10 May 2025", reviewedAt: "11 May 2025", rejectionReason: null, ocrStatus: "processed", ocrConfidence: 94 },
      { id: "d2", name: "10th Marksheet", status: "uploaded", uploadedAt: "12 May 2025", reviewedAt: null, rejectionReason: null, ocrStatus: "processed", ocrConfidence: 88 },
      { id: "d3", name: "12th Marksheet", status: "uploaded", uploadedAt: "12 May 2025", reviewedAt: null, rejectionReason: null, ocrStatus: "not_processed", ocrConfidence: null },
      { id: "d4", name: "Bank Statement (6 months)", status: "pending", uploadedAt: null, reviewedAt: null, rejectionReason: null, ocrStatus: null, ocrConfidence: null },
      { id: "d5", name: "Offer Letter", status: "rejected", uploadedAt: "9 May 2025", reviewedAt: "10 May 2025", rejectionReason: "Document expired — re-upload required", ocrStatus: "processed", ocrConfidence: 45 },
      { id: "d6", name: "SOP", status: "missing", uploadedAt: null, reviewedAt: null, rejectionReason: null, ocrStatus: null, ocrConfidence: null },
    ],
  },
  {
    clientId: "2", clientCode: "PC-2024-0002", clientName: "Sidikaben Vahora", country: "Australia", visaType: "Work",
    documents: [
      { id: "d7", name: "Passport Copy", status: "approved", uploadedAt: "5 May 2025", reviewedAt: "6 May 2025", rejectionReason: null, ocrStatus: "processed", ocrConfidence: 97 },
      { id: "d8", name: "Employment Letter", status: "approved", uploadedAt: "5 May 2025", reviewedAt: "6 May 2025", rejectionReason: null, ocrStatus: "processed", ocrConfidence: 92 },
      { id: "d9", name: "Bank Statement", status: "under_review", uploadedAt: "13 May 2025", reviewedAt: null, rejectionReason: null, ocrStatus: "processed", ocrConfidence: 89 },
      { id: "d10", name: "Police Clearance", status: "pending", uploadedAt: null, reviewedAt: null, rejectionReason: null, ocrStatus: null, ocrConfidence: null },
    ],
  },
  {
    clientId: "3", clientCode: "PC-2024-0003", clientName: "Trushaben Patel", country: "UK", visaType: "Spouse",
    documents: [
      { id: "d11", name: "Passport Copy", status: "approved", uploadedAt: "1 May 2025", reviewedAt: "2 May 2025", rejectionReason: null, ocrStatus: "processed", ocrConfidence: 96 },
      { id: "d12", name: "Marriage Certificate", status: "approved", uploadedAt: "1 May 2025", reviewedAt: "2 May 2025", rejectionReason: null, ocrStatus: "processed", ocrConfidence: 91 },
      { id: "d13", name: "Sponsor Documents", status: "approved", uploadedAt: "3 May 2025", reviewedAt: "4 May 2025", rejectionReason: null, ocrStatus: "processed", ocrConfidence: 88 },
    ],
  },
];

const DOC_STATUS_COLOR: Record<DocStatus, string> = {
  pending: "bg-muted text-muted-foreground",
  uploaded: "bg-blue-100 text-blue-700",
  under_review: "bg-yellow-100 text-yellow-700",
  approved: "bg-green-100 text-green-700",
  rejected: "bg-red-100 text-red-700",
  missing: "bg-orange-100 text-orange-700",
  not_required: "bg-muted text-muted-foreground",
};

const DOC_STATUS_LABEL: Record<DocStatus, string> = {
  pending: "Pending", uploaded: "Uploaded", under_review: "Under Review",
  approved: "Approved", rejected: "Rejected", missing: "Missing", not_required: "Not Required",
};

export default function CxDocuments() {
  const { showHint, dismissHint } = usePageHint("cx_documents");
  const [, setLocation] = useLocation();
  const [search, setSearch] = useState("");
  const [expandedClient, setExpandedClient] = useState<string | null>("1");
  const [docStatusFilter, setDocStatusFilter] = useState("all");

  const filtered = MOCK_CLIENT_DOCS.filter(c =>
    c.clientName.toLowerCase().includes(search.toLowerCase()) || c.clientCode.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <PageWrapper title="Document Checklist" breadcrumbs={[{ label: "CX Team", href: "/" }, { label: "Documents" }]}>
      <div className="space-y-4">
        {/* Summary bar */}
        <div data-tour="docs-summary" className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: "Total Documents", value: MOCK_CLIENT_DOCS.flatMap(c => c.documents).length, color: "text-foreground" },
            { label: "Approved", value: MOCK_CLIENT_DOCS.flatMap(c => c.documents).filter(d => d.status === "approved").length, color: "text-green-600" },
            { label: "Pending / Missing", value: MOCK_CLIENT_DOCS.flatMap(c => c.documents).filter(d => ["pending", "missing"].includes(d.status)).length, color: "text-orange-600" },
            { label: "Rejected", value: MOCK_CLIENT_DOCS.flatMap(c => c.documents).filter(d => d.status === "rejected").length, color: "text-red-600" },
          ].map(s => (
            <Card key={s.label} className="bg-card border-border shadow-sm">
              <CardContent className="pt-4 pb-4">
                <p className="text-xs text-muted-foreground uppercase tracking-wide">{s.label}</p>
                <p className={`text-2xl font-bold mt-1 ${s.color}`}>{s.value}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Filters */}
        <div data-tour="docs-filters" className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search by client name or code..." className="pl-8" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <Select value={docStatusFilter} onValueChange={setDocStatusFilter}>
            <SelectTrigger className="w-[180px]"><SelectValue placeholder="Filter docs by status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              {(Object.keys(DOC_STATUS_LABEL) as DocStatus[]).map(s => (
                <SelectItem key={s} value={s}>{DOC_STATUS_LABEL[s]}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Per-client accordion */}
        <div data-tour="docs-list">
        {filtered.map(client => {
          const docs = docStatusFilter === "all" ? client.documents : client.documents.filter(d => d.status === docStatusFilter as DocStatus);
          const pct = Math.round((client.documents.filter(d => d.status === "approved").length / client.documents.length) * 100);
          const isOpen = expandedClient === client.clientId;

          return (
            <Card key={client.clientId} className="bg-card border-border shadow-sm overflow-hidden">
              {/* Header */}
              <button
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-accent/50 transition-colors text-left"
                onClick={() => setExpandedClient(isOpen ? null : client.clientId)}
              >
                <Avatar className="h-8 w-8 flex-shrink-0">
                  <AvatarFallback className="text-xs bg-muted">{client.clientName.split(" ").map(n => n[0]).join("")}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      onClick={e => { e.stopPropagation(); setLocation(`/cx/documents/${client.clientId}`); }}
                      className="font-medium text-sm text-primary hover:underline flex items-center gap-1"
                    >
                      {client.clientName}
                      <ExternalLink className="h-3 w-3 opacity-60" />
                    </button>
                    <span className="text-xs text-muted-foreground">{client.clientCode}</span>
                    <span className="text-xs text-muted-foreground">·</span>
                    <span className="text-xs text-muted-foreground">{client.country} · {client.visaType}</span>
                  </div>
                  <div className="flex items-center gap-3 mt-1">
                    <Progress value={pct} className="h-1.5 w-32" />
                    <span className="text-xs text-muted-foreground">{pct}% approved</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-xs font-medium ${pct === 100 ? "text-green-600" : "text-orange-600"}`}>
                    {client.documents.filter(d => d.status === "approved").length}/{client.documents.length} docs
                  </span>
                  {isOpen ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
                </div>
              </button>

              {/* Document Table */}
              {isOpen && (
                <CardContent className="p-0 border-t border-border">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/30 hover:bg-muted/30">
                        <TableHead>Document</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Uploaded</TableHead>
                        <TableHead>Reviewed</TableHead>
                        <TableHead>OCR</TableHead>
                        <TableHead>Notes</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {docs.length === 0 ? (
                        <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-6">No documents match the filter.</TableCell></TableRow>
                      ) : docs.map(doc => (
                        <TableRow key={doc.id} className="hover:bg-accent/30">
                          <TableCell className="text-sm font-medium">{doc.name}</TableCell>
                          <TableCell>
                            <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${DOC_STATUS_COLOR[doc.status]}`}>
                              {DOC_STATUS_LABEL[doc.status]}
                            </span>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">{doc.uploadedAt ?? "—"}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">{doc.reviewedAt ?? "—"}</TableCell>
                          <TableCell>
                            {doc.ocrStatus === "processed" ? (
                              <span className={`text-xs font-medium ${(doc.ocrConfidence ?? 0) >= 80 ? "text-green-600" : "text-orange-600"}`}>
                                {doc.ocrConfidence}% confidence
                              </span>
                            ) : doc.ocrStatus === "not_processed" ? (
                              <span className="text-xs text-muted-foreground">Pending scan</span>
                            ) : <span className="text-xs text-muted-foreground">—</span>}
                          </TableCell>
                          <TableCell className="text-xs text-red-500">{doc.rejectionReason ?? ""}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              )}
            </Card>
          );
        })}
        </div>
      </div>

      <ProductTour
        open={showHint}
        onClose={dismissHint}
        steps={[
          { target: '[data-tour="docs-summary"]', title: "Document Summary", content: "Four cards show total, approved, pending/missing, and rejected documents across all your clients.", side: "bottom" },
          { target: '[data-tour="docs-filters"]', title: "Filter Documents", content: "Search by client name or code and filter by document status to focus on pending or rejected items.", side: "bottom" },
          { target: '[data-tour="docs-list"]', title: "Client Accordion", content: "Click any client card to expand their checklist. Click the client name to open the full document review page.", side: "top" },
        ]}
      />
    </PageWrapper>
  );
}
