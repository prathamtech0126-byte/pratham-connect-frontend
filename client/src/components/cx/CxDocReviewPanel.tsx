import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import {
  CheckCircle2, XCircle, Upload, FileText, Eye,
  X, ZoomIn, ZoomOut, RotateCw, LayoutList, LayoutGrid,
  Download, Calendar, ChevronLeft, ChevronRight, Search,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/context/auth-context";
import samplePassportImg from "@/assets/Sample/sample passport.webp";

type DocStatus = "pending" | "uploaded" | "under_review" | "approved" | "rejected" | "missing";

interface DocItem {
  id: string;
  name: string;
  status: DocStatus;
  uploadedAt: string | null;
  reviewedAt: string | null;
  reviewerName: string | null;
  rejectionReason: string | null;
  fileUrl: string | null;
  ocrConfidence: number | null;
}

interface Props {
  rawDocuments: any[];
  clientName: string;
  /** When false, users can view documents but cannot approve, reject, or request re-upload. */
  canReviewDocuments?: boolean;
}

const STATUS_CONFIG: Record<DocStatus, { dot: string; badge: string; label: string }> = {
  pending:      { dot: "bg-slate-400",   badge: "bg-slate-100 text-slate-600 border-slate-200",       label: "Pending" },
  uploaded:     { dot: "bg-blue-500",    badge: "bg-blue-50 text-blue-700 border-blue-200",           label: "Uploaded" },
  under_review: { dot: "bg-yellow-500",  badge: "bg-yellow-50 text-yellow-700 border-yellow-200",     label: "Under Review" },
  approved:     { dot: "bg-emerald-500", badge: "bg-emerald-50 text-emerald-700 border-emerald-200",  label: "Approved" },
  rejected:     { dot: "bg-red-500",     badge: "bg-red-50 text-red-700 border-red-200",              label: "Rejected" },
  missing:      { dot: "bg-orange-500",  badge: "bg-orange-50 text-orange-700 border-orange-200",     label: "Missing" },
};

function normalizeStatus(raw: any): DocStatus {
  const s = String(raw || "").toLowerCase();
  if (s === "approved") return "approved";
  if (s === "rejected") return "rejected";
  if (s === "under_review" || s === "under review") return "under_review";
  if (s === "missing") return "missing";
  if (s === "uploaded") return "uploaded";
  return "pending";
}

const MOCK_DOCS: DocItem[] = [
  { id: "m1", name: "Passport (Front & Back)",       status: "approved",     uploadedAt: "2026-01-10", reviewedAt: "2026-01-12", reviewerName: "Priya Singh", rejectionReason: null,                          fileUrl: null, ocrConfidence: 97 },
  { id: "m2", name: "10th Marksheet",                status: "approved",     uploadedAt: "2026-01-10", reviewedAt: "2026-01-12", reviewerName: "Priya Singh", rejectionReason: null,                          fileUrl: null, ocrConfidence: 92 },
  { id: "m3", name: "12th Marksheet",                status: "rejected",     uploadedAt: "2026-01-11", reviewedAt: "2026-01-13", reviewerName: "Priya Singh", rejectionReason: "Document is blurry. Please re-upload a clear scan.", fileUrl: null, ocrConfidence: 41 },
  { id: "m4", name: "Graduation Degree",             status: "under_review", uploadedAt: "2026-01-14", reviewedAt: null,          reviewerName: null, rejectionReason: null,                          fileUrl: null, ocrConfidence: 88 },
  { id: "m5", name: "Bank Statement (Last 6 months)",status: "uploaded",     uploadedAt: "2026-01-15", reviewedAt: null,          reviewerName: null, rejectionReason: null,                          fileUrl: null, ocrConfidence: null },
  { id: "m6", name: "English Proficiency (IELTS)",   status: "pending",      uploadedAt: null,          reviewedAt: null,          reviewerName: null, rejectionReason: null,                          fileUrl: null, ocrConfidence: null },
  { id: "m7", name: "SOP (Statement of Purpose)",    status: "pending",      uploadedAt: null,          reviewedAt: null,          reviewerName: null, rejectionReason: null,                          fileUrl: null, ocrConfidence: null },
  { id: "m8", name: "LOR 1",                         status: "pending",      uploadedAt: null,          reviewedAt: null,          reviewerName: null, rejectionReason: null,                          fileUrl: null, ocrConfidence: null },
];

function formatReviewedLabel(reviewedAt: string, reviewerName: string | null) {
  return reviewerName ? `Reviewed ${reviewedAt} by ${reviewerName}` : `Reviewed ${reviewedAt}`;
}

function normalizeDocs(rawDocuments: any[]): DocItem[] {
  if (rawDocuments.length === 0) return MOCK_DOCS;
  return rawDocuments.map((d, i) => ({
    id: String(d.id ?? d.documentId ?? i),
    name: d.documentName || d.name || d.fileName || `Document ${i + 1}`,
    status: normalizeStatus(d.status),
    uploadedAt: d.uploadedAt || d.createdAt || null,
    reviewedAt: d.reviewedAt || null,
    reviewerName: d.reviewerName || d.reviewer_name || d.reviewedBy || d.reviewed_by || null,
    rejectionReason: d.rejectionReason || d.rejection_reason || null,
    fileUrl: d.fileUrl || d.url || d.path || null,
    ocrConfidence: d.ocrConfidence ?? null,
  }));
}

export function CxDocReviewPanel({ rawDocuments, clientName, canReviewDocuments = true }: Props) {
  const { user } = useAuth();
  const reviewerDisplayName =
    (user as { fullname?: string; name?: string } | null)?.fullname ||
    user?.name ||
    "CX Reviewer";

  const [docs, setDocs] = useState<DocItem[]>(() => normalizeDocs(rawDocuments));
  const [viewMode, setViewMode] = useState<"list" | "grid">("grid");
  const [searchQuery, setSearchQuery] = useState("");

  // Keep in sync if parent re-fetches
  useEffect(() => { setDocs(normalizeDocs(rawDocuments)); }, [rawDocuments]);

  // Preview panel
  const [previewDoc, setPreviewDoc] = useState<DocItem | null>(null);
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);

  const uploadedDocs = docs.filter(d => d.uploadedAt || d.fileUrl);
  const previewIdx   = previewDoc ? uploadedDocs.findIndex(d => d.id === previewDoc.id) : -1;

  function openPreview(doc: DocItem) { setZoom(1); setRotation(0); setPreviewDoc(doc); }
  function closePreview() { setPreviewDoc(null); }
  function prevDoc() { if (previewIdx > 0) { setZoom(1); setRotation(0); setPreviewDoc(uploadedDocs[previewIdx - 1]); } }
  function nextDoc() { if (previewIdx < uploadedDocs.length - 1) { setZoom(1); setRotation(0); setPreviewDoc(uploadedDocs[previewIdx + 1]); } }

  useEffect(() => {
    if (!previewDoc) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closePreview();
      if (e.key === "ArrowLeft") prevDoc();
      if (e.key === "ArrowRight") nextDoc();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  // Action dialog
  const [dialog, setDialog] = useState<{
    open: boolean;
    action: "approve" | "reject" | "reupload" | null;
    docId: string | null;
    docName: string;
  }>({ open: false, action: null, docId: null, docName: "" });
  const [remarks, setRemarks] = useState("");

  function openDialog(action: "approve" | "reject" | "reupload", docId: string, docName: string) {
    setRemarks("");
    setDialog({ open: true, action, docId, docName });
  }

  function handleConfirm() {
    if (!dialog.docId || !dialog.action) return;
    if (dialog.action === "reject" && !remarks.trim()) return;
    const today = new Date().toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
    setDocs(prev => prev.map(d => {
      if (d.id !== dialog.docId) return d;
      if (dialog.action === "approve") return { ...d, status: "approved", reviewedAt: today, reviewerName: reviewerDisplayName, rejectionReason: null };
      if (dialog.action === "reject")  return { ...d, status: "rejected", reviewedAt: today, reviewerName: reviewerDisplayName, rejectionReason: remarks.trim() };
      return { ...d, status: "pending", reviewedAt: today, reviewerName: reviewerDisplayName, rejectionReason: remarks.trim() || "Upload requested" };
    }));
    if (previewDoc?.id === dialog.docId) {
      setPreviewDoc(prev => prev ? {
        ...prev,
        status: dialog.action === "approve" ? "approved" : dialog.action === "reject" ? "rejected" : "pending",
        reviewedAt: today,
        reviewerName: reviewerDisplayName,
        rejectionReason: dialog.action === "reject" ? remarks.trim() : null,
      } : null);
    }
    setDialog({ open: false, action: null, docId: null, docName: "" });
  }

  const canAct = (doc: DocItem) => ["uploaded", "under_review", "approved", "rejected"].includes(doc.status);

  const filteredDocs = searchQuery.trim()
    ? docs.filter(d => d.name.toLowerCase().includes(searchQuery.toLowerCase()))
    : docs;

  const approvedCount = docs.filter(d => d.status === "approved").length;
  const rejectedCount = docs.filter(d => d.status === "rejected").length;
  const pendingCount  = docs.filter(d => ["pending", "missing"].includes(d.status)).length;
  const pct = docs.length ? Math.round((approvedCount / docs.length) * 100) : 0;

  if (docs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-3 text-muted-foreground">
        <FileText className="h-10 w-10 opacity-30" />
        <p className="text-sm">No documents found for this client.</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Summary bar */}
      <div className="flex items-center gap-4 flex-wrap p-4 bg-muted/30 rounded-xl border border-border">
        <div className="flex items-center gap-2.5 flex-1 min-w-[200px]">
          <Progress value={pct} className="h-2 w-32" />
          <span className="text-xs text-muted-foreground font-medium">{approvedCount}/{docs.length} · {pct}% complete</span>
        </div>
        <div className="flex items-center gap-3">
          {[
            { label: "Approved", count: approvedCount, dot: "bg-emerald-500", text: "text-emerald-700" },
            { label: "Rejected", count: rejectedCount, dot: "bg-red-500",     text: "text-red-600" },
            { label: "Pending",  count: pendingCount,  dot: "bg-slate-400",   text: "text-slate-600" },
          ].map(s => (
            <div key={s.label} className="flex items-center gap-1.5 text-xs">
              <span className={cn("h-2 w-2 rounded-full", s.dot)} />
              <span className={cn("font-bold", s.text)}>{s.count}</span>
              <span className="text-muted-foreground">{s.label}</span>
            </div>
          ))}
        </div>
        {/* Search */}
        <div className="relative ml-auto">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search documents..."
            className="h-8 pl-8 pr-3 text-xs rounded-lg border border-border bg-card text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring w-48"
          />
        </div>
        {/* View toggle */}
        <div className="flex rounded-lg border border-border overflow-hidden">
          {(["list", "grid"] as const).map((mode, i) => (
            <button
              key={mode}
              onClick={() => setViewMode(mode)}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold transition-all",
                i > 0 && "border-l border-border",
                viewMode === mode ? "bg-primary text-primary-foreground" : "bg-card text-muted-foreground hover:bg-accent"
              )}
            >
              {mode === "list" ? <LayoutList className="h-3.5 w-3.5" /> : <LayoutGrid className="h-3.5 w-3.5" />}
              {mode.charAt(0).toUpperCase() + mode.slice(1)}
            </button>
          ))}
        </div>
      </div>


      {/* ── LIST VIEW ──────────────────────────────────────────────────────── */}
      {viewMode === "list" && (
        <Card className="bg-card border-border shadow-sm overflow-hidden">
          <div className={cn(
            "grid items-center gap-4 px-6 py-3 bg-muted/50 border-b border-border",
            canReviewDocuments ? "grid-cols-[2fr_100px_auto]" : "grid-cols-[2fr_100px]",
          )}>
            {(canReviewDocuments ? ["Document", "Status", "Actions"] : ["Document", "Status"]).map((h, i) => (
              <span key={h} className={cn("text-[11px] font-bold text-muted-foreground uppercase tracking-widest", i > 0 && "text-right")}>{h}</span>
            ))}
          </div>

          {filteredDocs.length === 0 && (
            <div className="flex flex-col items-center justify-center py-10 gap-2 text-muted-foreground">
              <Search className="h-7 w-7 opacity-30" />
              <p className="text-sm">No documents match "{searchQuery}"</p>
            </div>
          )}
          {filteredDocs.map((doc, idx) => {
            const cfg = STATUS_CONFIG[doc.status];
            return (
              <div key={doc.id}>
                <div className={cn(
                  "grid items-center gap-4 px-6 py-4 transition-colors hover:bg-accent/40 group",
                  canReviewDocuments ? "grid-cols-[2fr_100px_auto]" : "grid-cols-[2fr_100px]",
                  idx !== filteredDocs.length - 1 && "border-b border-border/50",
                  doc.rejectionReason && "pb-1",
                )}>
                  {/* Doc name + meta */}
                  <div className="flex items-center gap-3.5 min-w-0">
                    <button
                      onClick={() => (doc.uploadedAt || doc.fileUrl) && openPreview(doc)}
                      disabled={!doc.uploadedAt && !doc.fileUrl}
                      className={cn(
                        "h-10 w-10 rounded-xl flex items-center justify-center flex-shrink-0 transition-all border",
                        (doc.uploadedAt || doc.fileUrl)
                          ? "border-border bg-muted hover:bg-primary hover:border-primary hover:text-primary-foreground cursor-pointer shadow-sm"
                          : "border-border/30 bg-muted/30 cursor-default"
                      )}
                    >
                      {(doc.uploadedAt || doc.fileUrl)
                        ? <Eye className="h-4 w-4 text-muted-foreground" />
                        : <FileText className="h-4 w-4 text-muted-foreground/30" />}
                    </button>
                    <div className="min-w-0">
                      <button
                        onClick={() => (doc.uploadedAt || doc.fileUrl) && openPreview(doc)}
                        disabled={!doc.uploadedAt && !doc.fileUrl}
                        className={cn(
                          "text-sm font-semibold text-left truncate block max-w-[300px]",
                          (doc.uploadedAt || doc.fileUrl) ? "text-foreground hover:text-primary hover:underline cursor-pointer" : "text-foreground/60 cursor-default"
                        )}
                      >
                        {doc.name}
                      </button>
                      <div className="flex items-center gap-2 mt-0.5">
                        {doc.uploadedAt
                          ? <span className="flex items-center gap-1 text-[11px] text-muted-foreground"><Calendar className="h-3 w-3" />Uploaded {doc.uploadedAt}</span>
                          : <span className="text-[11px] text-muted-foreground/50">Not uploaded</span>}
                        {doc.reviewedAt && (
                          <span className="text-[11px] text-muted-foreground">· {formatReviewedLabel(doc.reviewedAt, doc.reviewerName)}</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Status */}
                  <div className="flex items-center justify-end">
                    <Badge variant="outline" className={cn("text-xs font-medium gap-1.5", cfg.badge)}>
                      <span className={cn("h-1.5 w-1.5 rounded-full flex-shrink-0", cfg.dot)} />
                      {cfg.label}
                    </Badge>
                  </div>

                  {/* Actions — CX team only */}
                  {canReviewDocuments && (
                    <div className="flex items-center gap-1 justify-end">
                      {canAct(doc) ? (
                        <>
                          <Button size="sm" variant="ghost"
                            className={cn("h-8 px-3 text-xs gap-1.5 font-semibold rounded-lg",
                              doc.status === "approved" ? "bg-emerald-50 text-emerald-700 hover:bg-emerald-100" : "text-muted-foreground hover:text-emerald-700 hover:bg-emerald-50"
                            )}
                            onClick={() => openDialog("approve", doc.id, doc.name)}
                          >
                            <CheckCircle2 className="h-3.5 w-3.5" />Approve
                          </Button>
                          <Button size="sm" variant="ghost"
                            className={cn("h-8 px-3 text-xs gap-1.5 font-semibold rounded-lg",
                              doc.status === "rejected" ? "bg-red-50 text-red-600 hover:bg-red-100" : "text-muted-foreground hover:text-red-600 hover:bg-red-50"
                            )}
                            onClick={() => openDialog("reject", doc.id, doc.name)}
                          >
                            <XCircle className="h-3.5 w-3.5" />Reject
                          </Button>
                          <Button size="sm" variant="ghost"
                            className="h-8 px-2.5 text-xs text-muted-foreground hover:text-foreground hover:bg-accent rounded-lg"
                            onClick={() => openDialog("reupload", doc.id, doc.name)}
                            title="Request re-upload"
                          >
                            <Upload className="h-3.5 w-3.5" />
                          </Button>
                        </>
                      ) : (
                        <span className="text-xs text-muted-foreground/40 pr-1">Awaiting upload</span>
                      )}
                    </div>
                  )}
                </div>

                {doc.rejectionReason && (
                  <div className="mx-6 mb-3 mt-1 flex items-start gap-2 bg-red-50/60 border border-red-100 rounded-lg px-3.5 py-2.5">
                    <XCircle className="h-3.5 w-3.5 text-red-500 flex-shrink-0 mt-0.5" />
                    <p className="text-xs text-red-600">{doc.rejectionReason}</p>
                  </div>
                )}
              </div>
            );
          })}
        </Card>
      )}

      {/* ── GRID VIEW ───────────────────────────────────────────────────────── */}
      {viewMode === "grid" && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredDocs.length === 0 && (
            <div className="col-span-full flex flex-col items-center justify-center py-10 gap-2 text-muted-foreground">
              <Search className="h-7 w-7 opacity-30" />
              <p className="text-sm">No documents match "{searchQuery}"</p>
            </div>
          )}
          {filteredDocs.map(doc => {
            const cfg = STATUS_CONFIG[doc.status];
            const hasFile = !!(doc.uploadedAt || doc.fileUrl);
            return (
              <Card key={doc.id} className={cn(
                "bg-card border-border shadow-sm overflow-hidden flex flex-col group/card hover:shadow-md transition-all",
                doc.status === "approved" && "border-emerald-200",
                doc.status === "rejected" && "border-red-200",
              )}>
                {/* Thumbnail */}
                <div className="relative overflow-hidden bg-muted/30">
                  {hasFile ? (
                    <>
                      <div className="w-full h-36 overflow-hidden">
                        <img src={doc.fileUrl ?? samplePassportImg} alt={doc.name} className="w-full h-full object-cover" />
                      </div>
                      <button
                        onClick={() => openPreview(doc)}
                        className="absolute inset-0 bg-black/0 hover:bg-black/50 transition-all flex items-center justify-center opacity-0 group-hover/card:opacity-100"
                      >
                        <div className="flex items-center gap-2 bg-white/95 rounded-full px-4 py-2 shadow-xl text-sm font-semibold">
                          <Eye className="h-4 w-4" />View
                        </div>
                      </button>
                    </>
                  ) : (
                    <div className="w-full h-36 flex flex-col items-center justify-center gap-2">
                      <div className="h-14 w-14 rounded-2xl bg-muted flex items-center justify-center">
                        <FileText className="h-7 w-7 text-muted-foreground/40" />
                      </div>
                      <span className="text-xs text-muted-foreground/50">Not uploaded</span>
                    </div>
                  )}
                  <Badge variant="outline" className={cn("absolute top-2.5 right-2.5 text-[10px] font-bold shadow-sm gap-1", cfg.badge)}>
                    <span className={cn("h-1.5 w-1.5 rounded-full", cfg.dot)} />{cfg.label}
                  </Badge>
                </div>

                <CardContent className="pt-3.5 pb-3 px-4 flex flex-col">
                  <button
                    onClick={() => hasFile && openPreview(doc)}
                    disabled={!hasFile}
                    className={cn("text-sm font-bold text-left leading-snug", hasFile ? "text-foreground hover:text-primary cursor-pointer" : "text-foreground/70 cursor-default")}
                  >
                    {doc.name}
                  </button>
                  <p className="text-[11px] text-muted-foreground mt-1 mb-3">
                    {doc.uploadedAt ? `Uploaded ${doc.uploadedAt}` : "Awaiting upload"}
                    {doc.reviewedAt && ` · ${formatReviewedLabel(doc.reviewedAt, doc.reviewerName)}`}
                  </p>

                  {doc.rejectionReason && (
                    <div className="flex items-start gap-1.5 bg-red-50 border border-red-100 rounded-lg px-2.5 py-2 mb-3">
                      <XCircle className="h-3 w-3 text-red-500 flex-shrink-0 mt-0.5" />
                      <p className="text-[11px] text-red-600">{doc.rejectionReason}</p>
                    </div>
                  )}

                  {canReviewDocuments && (
                    <div className="mt-3 flex items-center gap-2">
                      {canAct(doc) ? (
                        <>
                          <button
                            onClick={() => openDialog("approve", doc.id, doc.name)}
                            className={cn("flex-1 flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-bold transition-all border",
                              doc.status === "approved" ? "bg-emerald-600 text-white border-emerald-600" : "bg-card text-muted-foreground border-border hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-300"
                            )}
                          >
                            <CheckCircle2 className="h-3.5 w-3.5" />Approve
                          </button>
                          <button
                            onClick={() => openDialog("reject", doc.id, doc.name)}
                            className={cn("flex-1 flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-bold transition-all border",
                              doc.status === "rejected" ? "bg-red-600 text-white border-red-600" : "bg-card text-muted-foreground border-border hover:bg-red-50 hover:text-red-600 hover:border-red-300"
                            )}
                          >
                            <XCircle className="h-3.5 w-3.5" />Reject
                          </button>
                          <button
                            onClick={() => openDialog("reupload", doc.id, doc.name)}
                            className="h-8 w-8 flex items-center justify-center rounded-lg border border-border bg-card text-muted-foreground hover:bg-accent transition-colors"
                          >
                            <Upload className="h-3.5 w-3.5" />
                          </button>
                        </>
                      ) : (
                        <div className="w-full flex items-center justify-center gap-1.5 rounded-lg border border-dashed border-border py-2 text-xs text-muted-foreground/50">
                          <Upload className="h-3.5 w-3.5" />Awaiting upload
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* ── Action dialog ─────────────────────────────────────────────────────── */}
      <Dialog open={dialog.open} onOpenChange={open => setDialog(d => ({ ...d, open }))}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {dialog.action === "approve"  && <CheckCircle2 className="h-4 w-4 text-emerald-600" />}
              {dialog.action === "reject"   && <XCircle className="h-4 w-4 text-red-500" />}
              {dialog.action === "reupload" && <Upload className="h-4 w-4 text-muted-foreground" />}
              {dialog.action === "approve" ? "Approve Document" : dialog.action === "reject" ? "Reject Document" : "Request Re-upload"}
            </DialogTitle>
            <DialogDescription>
              {dialog.action === "approve" ? "Add optional remarks and confirm approval."
                : dialog.action === "reject" ? "Provide a reason for rejection shown to the client."
                : "Describe what needs to be re-submitted."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-1">
            <div className="bg-muted/40 rounded-lg px-3 py-2.5">
              <p className="text-xs text-muted-foreground">Document</p>
              <p className="text-sm font-semibold mt-0.5">{dialog.docName}</p>
            </div>
            <div className="space-y-1.5">
              <Label>{dialog.action === "reject" ? "Reason *" : "Remarks"}</Label>
              <Textarea
                placeholder={dialog.action === "approve" ? "Optional note..." : dialog.action === "reject" ? "e.g. Document expired, blurry scan..." : "Describe what needs to be corrected..."}
                value={remarks}
                onChange={e => setRemarks(e.target.value)}
                rows={3}
              />
              {dialog.action === "reject" && !remarks.trim() && <p className="text-xs text-red-500">Reason is required.</p>}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialog(d => ({ ...d, open: false }))}>Cancel</Button>
            <Button
              onClick={handleConfirm}
              disabled={dialog.action === "reject" && !remarks.trim()}
              className={cn(dialog.action === "approve" ? "bg-emerald-600 hover:bg-emerald-700 text-white" : dialog.action === "reject" ? "bg-red-600 hover:bg-red-700 text-white" : "")}
            >
              {dialog.action === "approve" ? "Confirm Approval" : dialog.action === "reject" ? "Confirm Rejection" : "Request Upload"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Document preview panel ─────────────────────────────────────────────── */}
      {previewDoc && (
        <div className="fixed inset-0 z-50 flex bg-black/90 backdrop-blur-sm">
          {/* Left sidebar */}
          <div className="w-72 flex-shrink-0 bg-card border-r border-border flex flex-col">
            <div className="flex items-center justify-between px-4 py-3.5 border-b border-border">
              <h3 className="text-sm font-bold">Document Preview</h3>
              <button onClick={closePreview} className="h-7 w-7 rounded-lg flex items-center justify-center hover:bg-destructive/10 hover:text-destructive">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="px-4 py-3 border-b border-border bg-muted/30">
              <p className="text-xs text-muted-foreground">Client</p>
              <p className="text-sm font-semibold">{clientName}</p>
            </div>

            <div className="px-4 py-4 space-y-3 flex-1 overflow-y-auto">
              <div>
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-1">Document</p>
                <p className="text-sm font-semibold">{previewDoc.name}</p>
              </div>
              <Badge variant="outline" className={cn("text-xs font-medium gap-1.5", STATUS_CONFIG[previewDoc.status].badge)}>
                <span className={cn("h-1.5 w-1.5 rounded-full", STATUS_CONFIG[previewDoc.status].dot)} />
                {STATUS_CONFIG[previewDoc.status].label}
              </Badge>
              {previewDoc.uploadedAt && (
                <div className="text-xs text-muted-foreground space-y-1">
                  <div className="flex items-center gap-2"><Calendar className="h-3.5 w-3.5" />Uploaded: <span className="text-foreground font-medium">{previewDoc.uploadedAt}</span></div>
                  {previewDoc.reviewedAt && (
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      <span>
                        Reviewed: <span className="text-foreground font-medium">{previewDoc.reviewedAt}</span>
                        {previewDoc.reviewerName && (
                          <> · Reviewer: <span className="text-foreground font-medium">{previewDoc.reviewerName}</span></>
                        )}
                      </span>
                    </div>
                  )}
                </div>
              )}
              {previewDoc.rejectionReason && (
                <div className="flex items-start gap-2 bg-red-50 border border-red-100 rounded-lg px-3 py-2.5">
                  <XCircle className="h-3.5 w-3.5 text-red-500 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-red-600">{previewDoc.rejectionReason}</p>
                </div>
              )}
            </div>

            {canReviewDocuments && canAct(previewDoc) && (
              <div className="px-4 py-4 border-t border-border space-y-2">
                <Button className={cn("w-full gap-2 font-semibold", previewDoc.status === "approved" ? "bg-emerald-600 hover:bg-emerald-700 text-white" : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200")} variant="ghost" onClick={() => openDialog("approve", previewDoc.id, previewDoc.name)}>
                  <CheckCircle2 className="h-4 w-4" />Approve
                </Button>
                <Button className={cn("w-full gap-2 font-semibold", previewDoc.status === "rejected" ? "bg-red-600 hover:bg-red-700 text-white" : "bg-red-50 text-red-600 hover:bg-red-100 border border-red-200")} variant="ghost" onClick={() => openDialog("reject", previewDoc.id, previewDoc.name)}>
                  <XCircle className="h-4 w-4" />Reject
                </Button>
                <Button variant="outline" className="w-full gap-2 font-semibold" onClick={() => openDialog("reupload", previewDoc.id, previewDoc.name)}>
                  <Upload className="h-4 w-4" />Request Re-upload
                </Button>
              </div>
            )}

            <div className="px-4 py-3 border-t border-border flex items-center justify-between">
              <button onClick={prevDoc} disabled={previewIdx <= 0} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed">
                <ChevronLeft className="h-4 w-4" />Prev
              </button>
              <span className="text-xs text-muted-foreground">{previewIdx + 1} / {uploadedDocs.length}</span>
              <button onClick={nextDoc} disabled={previewIdx >= uploadedDocs.length - 1} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed">
                Next<ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Image viewer */}
          <div className="flex-1 flex flex-col">
            <div className="flex items-center justify-between px-5 py-3 bg-black/60 border-b border-white/10 flex-shrink-0">
              <span className="text-sm font-medium text-white/80">{previewDoc.name}</span>
              <div className="flex items-center gap-2">
                <button onClick={() => setZoom(z => Math.max(0.5, +(z - 0.25).toFixed(2)))} className="h-8 w-8 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center"><ZoomOut className="h-4 w-4 text-white" /></button>
                <span className="text-xs text-white/60 w-10 text-center">{Math.round(zoom * 100)}%</span>
                <button onClick={() => setZoom(z => Math.min(3, +(z + 0.25).toFixed(2)))} className="h-8 w-8 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center"><ZoomIn className="h-4 w-4 text-white" /></button>
                <button onClick={() => setRotation(r => (r + 90) % 360)} className="h-8 w-8 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center"><RotateCw className="h-4 w-4 text-white" /></button>
                <button onClick={() => setZoom(1)} className="text-xs text-white/50 hover:text-white px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20">Reset</button>
                {previewDoc.fileUrl && (
                  <a href={previewDoc.fileUrl} target="_blank" rel="noreferrer" className="h-8 w-8 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center ml-1">
                    <Download className="h-4 w-4 text-white" />
                  </a>
                )}
              </div>
            </div>
            <div className="flex-1 overflow-auto flex items-center justify-center p-8">
              <img
                src={previewDoc.fileUrl ?? samplePassportImg}
                alt={previewDoc.name}
                style={{ transform: `scale(${zoom}) rotate(${rotation}deg)`, transformOrigin: "center", transition: "transform 0.2s ease", maxWidth: "100%", maxHeight: "100%", objectFit: "contain", borderRadius: 8, boxShadow: "0 0 80px rgba(0,0,0,0.8)" }}
              />
            </div>
            <div className="text-center pb-3 text-xs text-white/20">Esc to close · ← → to navigate</div>
          </div>
        </div>
      )}
    </div>
  );
}
