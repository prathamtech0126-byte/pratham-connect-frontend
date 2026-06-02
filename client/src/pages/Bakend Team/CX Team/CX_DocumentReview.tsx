import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { PageWrapper } from "@/layout/PageWrapper";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import {
  CheckCircle2, XCircle, Upload, FileText, Eye,
  X, ZoomIn, ZoomOut, RotateCw, LayoutList, LayoutGrid,
  Download, Calendar, MapPin, ChevronLeft, ChevronRight,
} from "lucide-react";
import sampleDoc from "@/assets/Sample/sample passport.webp";
import { cn } from "@/lib/utils";
import { useAuth } from "@/context/auth-context";

type DocStatus = "pending" | "uploaded" | "under_review" | "approved" | "rejected" | "missing" | "not_required";

interface DocumentItem {
  id: string; name: string; status: DocStatus;
  uploadedAt: string | null; reviewedAt: string | null;
  reviewerName: string | null;
  rejectionReason: string | null;
  ocrStatus: "not_processed" | "processed" | null;
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
      { id: "d1", name: "Passport Copy", status: "approved", uploadedAt: "10 May 2025", reviewedAt: "11 May 2025", reviewerName: "Priya Singh", rejectionReason: null, ocrStatus: "processed", ocrConfidence: 94 },
      { id: "d2", name: "10th Marksheet", status: "uploaded", uploadedAt: "12 May 2025", reviewedAt: null, reviewerName: null, rejectionReason: null, ocrStatus: "processed", ocrConfidence: 88 },
      { id: "d3", name: "12th Marksheet", status: "uploaded", uploadedAt: "12 May 2025", reviewedAt: null, reviewerName: null, rejectionReason: null, ocrStatus: "not_processed", ocrConfidence: null },
      { id: "d4", name: "Bank Statement (6 months)", status: "pending", uploadedAt: null, reviewedAt: null, reviewerName: null, rejectionReason: null, ocrStatus: null, ocrConfidence: null },
      { id: "d5", name: "Offer Letter", status: "rejected", uploadedAt: "9 May 2025", reviewedAt: "10 May 2025", reviewerName: "Priya Singh", rejectionReason: "Document expired — re-upload required", ocrStatus: "processed", ocrConfidence: 45 },
      { id: "d6", name: "SOP", status: "missing", uploadedAt: null, reviewedAt: null, reviewerName: null, rejectionReason: null, ocrStatus: null, ocrConfidence: null },
    ],
  },
  {
    clientId: "2", clientCode: "PC-2024-0002", clientName: "Sidikaben Vahora", country: "Australia", visaType: "Work",
    documents: [
      { id: "d7", name: "Passport Copy", status: "approved", uploadedAt: "5 May 2025", reviewedAt: "6 May 2025", reviewerName: "Anita Sharma", rejectionReason: null, ocrStatus: "processed", ocrConfidence: 97 },
      { id: "d8", name: "Employment Letter", status: "approved", uploadedAt: "5 May 2025", reviewedAt: "6 May 2025", reviewerName: "Anita Sharma", rejectionReason: null, ocrStatus: "processed", ocrConfidence: 92 },
      { id: "d9", name: "Bank Statement", status: "under_review", uploadedAt: "13 May 2025", reviewedAt: null, reviewerName: null, rejectionReason: null, ocrStatus: "processed", ocrConfidence: 89 },
      { id: "d10", name: "Police Clearance", status: "pending", uploadedAt: null, reviewedAt: null, reviewerName: null, rejectionReason: null, ocrStatus: null, ocrConfidence: null },
    ],
  },
  {
    clientId: "3", clientCode: "PC-2024-0003", clientName: "Trushaben Patel", country: "UK", visaType: "Spouse",
    documents: [
      { id: "d11", name: "Passport Copy", status: "approved", uploadedAt: "1 May 2025", reviewedAt: "2 May 2025", reviewerName: "Priya Singh", rejectionReason: null, ocrStatus: "processed", ocrConfidence: 96 },
      { id: "d12", name: "Marriage Certificate", status: "approved", uploadedAt: "1 May 2025", reviewedAt: "2 May 2025", reviewerName: "Priya Singh", rejectionReason: null, ocrStatus: "processed", ocrConfidence: 91 },
      { id: "d13", name: "Sponsor Documents", status: "approved", uploadedAt: "3 May 2025", reviewedAt: "4 May 2025", reviewerName: "Priya Singh", rejectionReason: null, ocrStatus: "processed", ocrConfidence: 88 },
    ],
  },
];

const STATUS_CONFIG: Record<DocStatus, { dot: string; badge: string; label: string }> = {
  pending:      { dot: "bg-slate-400",       badge: "bg-slate-100 text-slate-600 border-slate-200",         label: "Pending" },
  uploaded:     { dot: "bg-blue-500",        badge: "bg-blue-50 text-blue-700 border-blue-200",             label: "Uploaded" },
  under_review: { dot: "bg-yellow-500",      badge: "bg-yellow-50 text-yellow-700 border-yellow-200",       label: "Under Review" },
  approved:     { dot: "bg-emerald-500",     badge: "bg-emerald-50 text-emerald-700 border-emerald-200",    label: "Approved" },
  rejected:     { dot: "bg-red-500",         badge: "bg-red-50 text-red-700 border-red-200",                label: "Rejected" },
  missing:      { dot: "bg-orange-500",      badge: "bg-orange-50 text-orange-700 border-orange-200",       label: "Missing" },
  not_required: { dot: "bg-slate-300",       badge: "bg-slate-50 text-slate-400 border-slate-200",          label: "Not Required" },
};

function formatReviewedLabel(reviewedAt: string, reviewerName: string | null) {
  return reviewerName ? `Reviewed ${reviewedAt} by ${reviewerName}` : `Reviewed ${reviewedAt}`;
}

export default function CxDocumentReview({ params }: { params?: { clientId?: string } }) {
  const { user } = useAuth();
  const reviewerDisplayName =
    (user as { fullname?: string; name?: string } | null)?.fullname ||
    user?.name ||
    "CX Reviewer";
  const [, setLocation] = useLocation();
  const clientId = params?.clientId;
  const clientData = MOCK_CLIENT_DOCS.find(c => c.clientId === clientId);

  const [docs, setDocs] = useState<DocumentItem[]>(clientData?.documents ?? []);
  const [viewMode, setViewMode] = useState<"list" | "grid">("list");

  // ── Document preview panel ─────────────────────────────────────────────────
  const [previewDoc, setPreviewDoc] = useState<DocumentItem | null>(null);
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);

  // Navigate between docs inside preview
  const uploadedDocs = docs.filter(d => d.uploadedAt);
  const previewIdx = previewDoc ? uploadedDocs.findIndex(d => d.id === previewDoc.id) : -1;

  function openPreview(doc: DocumentItem) {
    setZoom(1);
    setRotation(0);
    setPreviewDoc(doc);
  }
  function closePreview() { setPreviewDoc(null); }
  function prevDoc() {
    if (previewIdx > 0) { setZoom(1); setRotation(0); setPreviewDoc(uploadedDocs[previewIdx - 1]); }
  }
  function nextDoc() {
    if (previewIdx < uploadedDocs.length - 1) { setZoom(1); setRotation(0); setPreviewDoc(uploadedDocs[previewIdx + 1]); }
  }

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

  // ── Action dialog ──────────────────────────────────────────────────────────
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
    setDialog({ open: false, action: null, docId: null, docName: "" });
    // refresh preview if open
    if (previewDoc?.id === dialog.docId) {
      setPreviewDoc(prev => prev ? {
        ...prev,
        status: dialog.action === "approve" ? "approved" : dialog.action === "reject" ? "rejected" : "pending",
        reviewedAt: today,
        reviewerName: reviewerDisplayName,
        rejectionReason: dialog.action === "reject" ? remarks.trim() : null,
      } : null);
    }
  }

  const canActionDoc = (doc: DocumentItem) =>
    ["uploaded", "under_review", "approved", "rejected"].includes(doc.status);

  if (!clientData) {
    return (
      <PageWrapper title="Not Found" breadcrumbs={[{ label: "My Clients", href: "/cx/clients" }]}>
        <p className="text-muted-foreground">Client not found.</p>
      </PageWrapper>
    );
  }

  const approvedCount = docs.filter(d => d.status === "approved").length;
  const rejectedCount = docs.filter(d => d.status === "rejected").length;
  const pendingCount  = docs.filter(d => ["pending", "missing"].includes(d.status)).length;
  const pct = Math.round((approvedCount / docs.length) * 100);

  return (
    <PageWrapper
      title={`${clientData.clientName} — Documents`}
      breadcrumbs={[{ label: "My Clients", href: "/cx/clients" }, { label: clientData.clientName }]}
    >
      <div className="space-y-5">

        {/* ── Client header card ───────────────────────────────────────────── */}
        <Card className="bg-card border-border shadow-sm overflow-hidden">
          <div className="h-1.5 w-full bg-gradient-to-r from-primary via-blue-400 to-emerald-400" />
          <CardContent className="pt-5 pb-5">
            <div className="flex items-start gap-5 flex-wrap">
              {/* Avatar + name */}
              <div className="flex items-center gap-4 flex-1 min-w-[220px]">
                <Avatar className="h-14 w-14 flex-shrink-0 border-2 border-border shadow-sm">
                  <AvatarFallback className="text-base bg-primary/10 text-primary font-bold">
                    {clientData.clientName.split(" ").map(n => n[0]).join("")}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <button
                    onClick={() => setLocation(`/clients/${clientData.clientId}/view`)}
                    className="text-lg font-bold text-primary hover:underline leading-tight"
                  >
                    {clientData.clientName}
                  </button>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    <span className="text-xs font-medium text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                      {clientData.clientCode}
                    </span>
                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                      <MapPin className="h-3 w-3" />{clientData.country}
                    </span>
                    <Badge variant="outline" className="text-[11px] font-medium">
                      {clientData.visaType} visa
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2.5 mt-2.5">
                    <Progress value={pct} className="h-2 w-36" />
                    <span className="text-xs text-muted-foreground font-medium">{approvedCount}/{docs.length} · {pct}% complete</span>
                  </div>
                </div>
              </div>

              {/* Stats */}
              <div className="flex items-center gap-3 flex-wrap">
                {[
                  { label: "Approved", count: approvedCount, color: "border-emerald-200 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/20 dark:border-emerald-800 dark:text-emerald-400", dot: "bg-emerald-500" },
                  { label: "Rejected", count: rejectedCount, color: "border-red-200 bg-red-50 text-red-600 dark:bg-red-950/20 dark:border-red-800 dark:text-red-400", dot: "bg-red-500" },
                  { label: "Pending",  count: pendingCount,  color: "border-slate-200 bg-slate-50 text-slate-600 dark:bg-slate-800/40 dark:border-slate-700 dark:text-slate-400", dot: "bg-slate-400" },
                ].map(s => (
                  <div key={s.label} className={cn("flex items-center gap-2 px-4 py-2.5 rounded-xl border font-medium", s.color)}>
                    <span className={cn("h-2 w-2 rounded-full flex-shrink-0", s.dot)} />
                    <span className="text-xl font-bold">{s.count}</span>
                    <span className="text-xs">{s.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ── Toolbar ───────────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-muted-foreground">
            {docs.length} <span className="text-foreground">documents</span>
          </p>
          <div className="flex rounded-xl border border-border overflow-hidden shadow-sm">
            {(["list", "grid"] as const).map((mode, i) => (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                className={cn(
                  "flex items-center gap-1.5 px-4 py-2 text-xs font-semibold transition-all",
                  i > 0 && "border-l border-border",
                  viewMode === mode
                    ? "bg-primary text-primary-foreground shadow-inner"
                    : "bg-card text-muted-foreground hover:text-foreground hover:bg-accent"
                )}
              >
                {mode === "list" ? <LayoutList className="h-3.5 w-3.5" /> : <LayoutGrid className="h-3.5 w-3.5" />}
                {mode.charAt(0).toUpperCase() + mode.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* ── LIST VIEW ─────────────────────────────────────────────────────── */}
        {viewMode === "list" && (
          <Card className="bg-card border-border shadow-sm overflow-hidden">
            {/* Header */}
            <div className="grid grid-cols-[2fr_90px_110px_auto] items-center gap-4 px-6 py-3 bg-muted/50 border-b border-border">
              {["Document", "OCR", "Status", "Actions"].map((h, i) => (
                <span key={h} className={cn("text-[11px] font-bold text-muted-foreground uppercase tracking-widest", i > 0 && "text-right last:text-right")}>{h}</span>
              ))}
            </div>

            {docs.map((doc, idx) => {
              const canAct = canActionDoc(doc);
              const cfg = STATUS_CONFIG[doc.status];
              return (
                <div key={doc.id}>
                  <div className={cn(
                    "grid grid-cols-[2fr_90px_110px_auto] items-center gap-4 px-6 py-4 transition-colors hover:bg-accent/40 group",
                    idx !== docs.length - 1 && "border-b border-border/50",
                    doc.rejectionReason && "pb-1",
                  )}>
                    {/* Document name + meta */}
                    <div className="flex items-center gap-3.5 min-w-0">
                      <button
                        onClick={() => doc.uploadedAt && openPreview(doc)}
                        disabled={!doc.uploadedAt}
                        className={cn(
                          "h-10 w-10 rounded-xl flex items-center justify-center flex-shrink-0 transition-all border",
                          doc.uploadedAt
                            ? "border-border bg-muted hover:bg-primary hover:border-primary hover:text-primary-foreground cursor-pointer shadow-sm"
                            : "border-border/30 bg-muted/30 cursor-default"
                        )}
                        title={doc.uploadedAt ? "View document" : "Not uploaded yet"}
                      >
                        {doc.uploadedAt
                          ? <Eye className="h-4 w-4 text-muted-foreground group-hover:text-current transition-colors" />
                          : <FileText className="h-4 w-4 text-muted-foreground/30" />}
                      </button>
                      <div className="min-w-0">
                        <button
                          onClick={() => doc.uploadedAt && openPreview(doc)}
                          disabled={!doc.uploadedAt}
                          className={cn(
                            "text-sm font-semibold text-left truncate block max-w-[280px]",
                            doc.uploadedAt
                              ? "text-foreground hover:text-primary hover:underline cursor-pointer"
                              : "text-foreground/60 cursor-default"
                          )}
                        >
                          {doc.name}
                        </button>
                        <div className="flex items-center gap-2 mt-0.5">
                          {doc.uploadedAt && (
                            <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                              <Calendar className="h-3 w-3" />Uploaded {doc.uploadedAt}
                            </span>
                          )}
                          {doc.reviewedAt && (
                            <span className="text-[11px] text-muted-foreground">· {formatReviewedLabel(doc.reviewedAt, doc.reviewerName)}</span>
                          )}
                          {!doc.uploadedAt && (
                            <span className="text-[11px] text-muted-foreground/50">Not uploaded</span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* OCR */}
                    <div className="text-right">
                      {doc.ocrStatus === "processed"
                        ? <span className={cn("text-xs font-semibold tabular-nums",
                            doc.ocrConfidence && doc.ocrConfidence >= 85 ? "text-emerald-600" :
                            doc.ocrConfidence && doc.ocrConfidence >= 60 ? "text-amber-600" : "text-red-500"
                          )}>{doc.ocrConfidence}%</span>
                        : doc.ocrStatus === "not_processed"
                        ? <span className="text-xs text-muted-foreground/60">Pending</span>
                        : <span className="text-xs text-muted-foreground/30">—</span>
                      }
                    </div>

                    {/* Status badge */}
                    <div className="flex items-center justify-end">
                      <Badge variant="outline" className={cn("text-xs font-medium gap-1.5", cfg.badge)}>
                        <span className={cn("h-1.5 w-1.5 rounded-full flex-shrink-0", cfg.dot)} />
                        {cfg.label}
                      </Badge>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1 justify-end">
                      {canAct ? (
                        <>
                          <Button
                            size="sm" variant="ghost"
                            className={cn("h-8 px-3 text-xs gap-1.5 font-semibold rounded-lg transition-all",
                              doc.status === "approved"
                                ? "bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-950/30 dark:text-emerald-400"
                                : "text-muted-foreground hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/20"
                            )}
                            onClick={() => openDialog("approve", doc.id, doc.name)}
                          >
                            <CheckCircle2 className="h-3.5 w-3.5" />Approve
                          </Button>
                          <Button
                            size="sm" variant="ghost"
                            className={cn("h-8 px-3 text-xs gap-1.5 font-semibold rounded-lg transition-all",
                              doc.status === "rejected"
                                ? "bg-red-50 text-red-600 hover:bg-red-100 dark:bg-red-950/30 dark:text-red-400"
                                : "text-muted-foreground hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20"
                            )}
                            onClick={() => openDialog("reject", doc.id, doc.name)}
                          >
                            <XCircle className="h-3.5 w-3.5" />Reject
                          </Button>
                          <Button
                            size="sm" variant="ghost"
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
                  </div>

                  {/* Rejection reason */}
                  {doc.rejectionReason && (
                    <div className="mx-6 mb-3 mt-1 flex items-start gap-2 bg-red-50/60 dark:bg-red-950/20 border border-red-100 dark:border-red-900/40 rounded-lg px-3.5 py-2.5">
                      <XCircle className="h-3.5 w-3.5 text-red-500 flex-shrink-0 mt-0.5" />
                      <p className="text-xs text-red-600 dark:text-red-400">{doc.rejectionReason}</p>
                    </div>
                  )}
                </div>
              );
            })}
          </Card>
        )}

        {/* ── GRID VIEW ─────────────────────────────────────────────────────── */}
        {viewMode === "grid" && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {docs.map(doc => {
              const canAct = canActionDoc(doc);
              const cfg = STATUS_CONFIG[doc.status];
              return (
                <Card
                  key={doc.id}
                  className={cn(
                    "bg-card border-border shadow-sm overflow-hidden flex flex-col group/card hover:shadow-md transition-all duration-200",
                    doc.status === "approved" && "border-emerald-200 dark:border-emerald-900/40",
                    doc.status === "rejected" && "border-red-200 dark:border-red-900/40",
                    doc.status === "missing"  && "border-orange-200 dark:border-orange-900/40",
                  )}
                >
                  {/* Thumbnail */}
                  <div className="relative overflow-hidden bg-muted/30">
                    {doc.uploadedAt ? (
                      <>
                        <img
                          src={sampleDoc}
                          alt={doc.name}
                          className="w-full h-40 object-cover object-top transition-transform duration-300 group-hover/card:scale-105"
                        />
                        <button
                          onClick={() => openPreview(doc)}
                          className="absolute inset-0 bg-black/0 hover:bg-black/50 transition-all duration-200 flex items-center justify-center opacity-0 group-hover/card:opacity-100"
                        >
                          <div className="flex items-center gap-2 bg-white/95 dark:bg-black/80 rounded-full px-4 py-2 shadow-xl text-sm font-semibold text-foreground">
                            <Eye className="h-4 w-4" />View
                          </div>
                        </button>
                      </>
                    ) : (
                      <div className="w-full h-40 flex flex-col items-center justify-center gap-2">
                        <div className="h-14 w-14 rounded-2xl bg-muted flex items-center justify-center">
                          <FileText className="h-7 w-7 text-muted-foreground/40" />
                        </div>
                        <span className="text-xs text-muted-foreground/50">Not uploaded</span>
                      </div>
                    )}
                    {/* Status badge */}
                    <Badge
                      variant="outline"
                      className={cn("absolute top-2.5 right-2.5 text-[10px] font-bold shadow-sm gap-1", cfg.badge)}
                    >
                      <span className={cn("h-1.5 w-1.5 rounded-full", cfg.dot)} />
                      {cfg.label}
                    </Badge>
                    {/* OCR badge */}
                    {doc.ocrStatus === "processed" && (
                      <span className="absolute top-2.5 left-2.5 text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm bg-black/60 text-white">
                        OCR {doc.ocrConfidence}%
                      </span>
                    )}
                  </div>

                  {/* Card body */}
                  <CardContent className="pt-3.5 pb-3 px-4 flex-1 flex flex-col">
                    <button
                      onClick={() => doc.uploadedAt && openPreview(doc)}
                      disabled={!doc.uploadedAt}
                      className={cn(
                        "text-sm font-bold text-left leading-snug",
                        doc.uploadedAt ? "text-foreground hover:text-primary cursor-pointer" : "text-foreground/70 cursor-default"
                      )}
                    >
                      {doc.name}
                    </button>
                    <p className="text-[11px] text-muted-foreground mt-1 mb-3 leading-relaxed">
                      {doc.uploadedAt ? `Uploaded ${doc.uploadedAt}` : "Awaiting upload"}
                      {doc.reviewedAt && ` · ${formatReviewedLabel(doc.reviewedAt, doc.reviewerName)}`}
                    </p>

                    {doc.rejectionReason && (
                      <div className="flex items-start gap-1.5 bg-red-50/60 dark:bg-red-950/20 border border-red-100 dark:border-red-900/40 rounded-lg px-2.5 py-2 mb-3">
                        <XCircle className="h-3 w-3 text-red-500 flex-shrink-0 mt-0.5" />
                        <p className="text-[11px] text-red-600 dark:text-red-400 leading-relaxed">{doc.rejectionReason}</p>
                      </div>
                    )}

                    {/* Action buttons */}
                    <div className="mt-auto flex items-center gap-2">
                      {canAct ? (
                        <>
                          <button
                            onClick={() => openDialog("approve", doc.id, doc.name)}
                            className={cn(
                              "flex-1 flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-bold transition-all border",
                              doc.status === "approved"
                                ? "bg-emerald-600 text-white border-emerald-600 hover:bg-emerald-700"
                                : "bg-card text-muted-foreground border-border hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-300"
                            )}
                          >
                            <CheckCircle2 className="h-3.5 w-3.5" />Approve
                          </button>
                          <button
                            onClick={() => openDialog("reject", doc.id, doc.name)}
                            className={cn(
                              "flex-1 flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-bold transition-all border",
                              doc.status === "rejected"
                                ? "bg-red-600 text-white border-red-600 hover:bg-red-700"
                                : "bg-card text-muted-foreground border-border hover:bg-red-50 hover:text-red-600 hover:border-red-300"
                            )}
                          >
                            <XCircle className="h-3.5 w-3.5" />Reject
                          </button>
                          <button
                            onClick={() => openDialog("reupload", doc.id, doc.name)}
                            title="Request re-upload"
                            className="h-8 w-8 flex items-center justify-center rounded-lg border border-border bg-card text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
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
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

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
                : "Describe what needs to be re-submitted by the client."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-1">
            <div className="bg-muted/40 rounded-lg px-3 py-2.5">
              <p className="text-xs text-muted-foreground">Document</p>
              <p className="text-sm font-semibold text-foreground mt-0.5">{dialog.docName}</p>
            </div>
            <div className="space-y-1.5">
              <Label>{dialog.action === "reject" ? "Reason for rejection *" : "Remarks"}</Label>
              <Textarea
                placeholder={
                  dialog.action === "approve"  ? "Optional note for this approval..." :
                  dialog.action === "reject"   ? "e.g. Document expired, blurry scan, wrong format..." :
                  "Describe what needs to be corrected or re-submitted..."
                }
                value={remarks}
                onChange={e => setRemarks(e.target.value)}
                rows={3}
              />
              {dialog.action === "reject" && !remarks.trim() && (
                <p className="text-xs text-red-500">Rejection reason is required.</p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialog(d => ({ ...d, open: false }))}>Cancel</Button>
            <Button
              onClick={handleConfirm}
              disabled={dialog.action === "reject" && !remarks.trim()}
              className={cn(
                dialog.action === "approve" ? "bg-emerald-600 hover:bg-emerald-700 text-white" :
                dialog.action === "reject"  ? "bg-red-600 hover:bg-red-700 text-white" : ""
              )}
            >
              {dialog.action === "approve" ? "Confirm Approval" : dialog.action === "reject" ? "Confirm Rejection" : "Request Upload"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Document preview panel ─────────────────────────────────────────────── */}
      {previewDoc && (
        <div className="fixed inset-0 z-50 flex bg-black/90 backdrop-blur-sm">
          {/* Left panel — doc info + actions */}
          <div className="w-72 flex-shrink-0 bg-card border-r border-border flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3.5 border-b border-border">
              <h3 className="text-sm font-bold text-foreground">Document Preview</h3>
              <button
                onClick={closePreview}
                className="h-7 w-7 rounded-lg flex items-center justify-center hover:bg-destructive/10 hover:text-destructive transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Client summary */}
            <div className="px-4 py-3 border-b border-border bg-muted/30">
              <div className="flex items-center gap-2.5">
                <Avatar className="h-9 w-9 flex-shrink-0">
                  <AvatarFallback className="text-xs bg-primary/10 text-primary font-bold">
                    {clientData.clientName.split(" ").map(n => n[0]).join("")}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-sm font-semibold text-foreground leading-tight">{clientData.clientName}</p>
                  <p className="text-xs text-muted-foreground">{clientData.clientCode} · {clientData.country}</p>
                </div>
              </div>
            </div>

            {/* Doc details */}
            <div className="px-4 py-4 space-y-3 flex-1 overflow-y-auto">
              <div>
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-1">Document</p>
                <p className="text-sm font-semibold text-foreground">{previewDoc.name}</p>
              </div>

              <div className="flex items-center gap-2">
                <Badge variant="outline" className={cn("text-xs font-medium gap-1.5", STATUS_CONFIG[previewDoc.status].badge)}>
                  <span className={cn("h-1.5 w-1.5 rounded-full", STATUS_CONFIG[previewDoc.status].dot)} />
                  {STATUS_CONFIG[previewDoc.status].label}
                </Badge>
              </div>

              {previewDoc.uploadedAt && (
                <div className="space-y-1.5 text-xs text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-3.5 w-3.5 flex-shrink-0" />
                    <span>Uploaded: <span className="text-foreground font-medium">{previewDoc.uploadedAt}</span></span>
                  </div>
                  {previewDoc.reviewedAt && (
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-3.5 w-3.5 flex-shrink-0" />
                      <span>
                        Reviewed: <span className="text-foreground font-medium">{previewDoc.reviewedAt}</span>
                        {previewDoc.reviewerName && (
                          <> · Reviewer: <span className="text-foreground font-medium">{previewDoc.reviewerName}</span></>
                        )}
                      </span>
                    </div>
                  )}
                  {previewDoc.ocrStatus === "processed" && (
                    <div className="bg-muted rounded-lg px-3 py-2 flex items-center justify-between">
                      <span className="font-medium">OCR Confidence</span>
                      <span className={cn("font-bold tabular-nums",
                        previewDoc.ocrConfidence && previewDoc.ocrConfidence >= 85 ? "text-emerald-600" :
                        previewDoc.ocrConfidence && previewDoc.ocrConfidence >= 60 ? "text-amber-600" : "text-red-500"
                      )}>{previewDoc.ocrConfidence}%</span>
                    </div>
                  )}
                </div>
              )}

              {previewDoc.rejectionReason && (
                <div className="flex items-start gap-2 bg-red-50 dark:bg-red-950/20 border border-red-100 dark:border-red-900/40 rounded-lg px-3 py-2.5">
                  <XCircle className="h-3.5 w-3.5 text-red-500 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-red-600 dark:text-red-400">{previewDoc.rejectionReason}</p>
                </div>
              )}
            </div>

            {/* Actions */}
            {canActionDoc(previewDoc) && (
              <div className="px-4 py-4 border-t border-border space-y-2">
                <Button
                  className={cn("w-full gap-2 font-semibold",
                    previewDoc.status === "approved" ? "bg-emerald-600 hover:bg-emerald-700 text-white" : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200"
                  )}
                  variant="ghost"
                  onClick={() => openDialog("approve", previewDoc.id, previewDoc.name)}
                >
                  <CheckCircle2 className="h-4 w-4" />Approve
                </Button>
                <Button
                  className={cn("w-full gap-2 font-semibold",
                    previewDoc.status === "rejected" ? "bg-red-600 hover:bg-red-700 text-white" : "bg-red-50 text-red-600 hover:bg-red-100 border border-red-200"
                  )}
                  variant="ghost"
                  onClick={() => openDialog("reject", previewDoc.id, previewDoc.name)}
                >
                  <XCircle className="h-4 w-4" />Reject
                </Button>
                <Button
                  variant="outline"
                  className="w-full gap-2 font-semibold"
                  onClick={() => openDialog("reupload", previewDoc.id, previewDoc.name)}
                >
                  <Upload className="h-4 w-4" />Request Re-upload
                </Button>
              </div>
            )}

            {/* Navigate docs */}
            <div className="px-4 py-3 border-t border-border flex items-center justify-between">
              <button
                onClick={prevDoc}
                disabled={previewIdx <= 0}
                className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft className="h-4 w-4" />Prev
              </button>
              <span className="text-xs text-muted-foreground">{previewIdx + 1} / {uploadedDocs.length}</span>
              <button
                onClick={nextDoc}
                disabled={previewIdx >= uploadedDocs.length - 1}
                className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                Next<ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Right panel — image viewer */}
          <div className="flex-1 flex flex-col">
            {/* Image toolbar */}
            <div className="flex items-center justify-between px-5 py-3 bg-black/60 border-b border-white/10 flex-shrink-0">
              <span className="text-sm font-medium text-white/80">{previewDoc.name}</span>
              <div className="flex items-center gap-2">
                <button onClick={() => setZoom(z => Math.max(0.5, +(z - 0.25).toFixed(2)))} className="h-8 w-8 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center" title="Zoom out">
                  <ZoomOut className="h-4 w-4 text-white" />
                </button>
                <span className="text-xs text-white/60 w-10 text-center tabular-nums">{Math.round(zoom * 100)}%</span>
                <button onClick={() => setZoom(z => Math.min(3, +(z + 0.25).toFixed(2)))} className="h-8 w-8 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center" title="Zoom in">
                  <ZoomIn className="h-4 w-4 text-white" />
                </button>
                <button onClick={() => setRotation(r => (r + 90) % 360)} className="h-8 w-8 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center" title="Rotate">
                  <RotateCw className="h-4 w-4 text-white" />
                </button>
                <button onClick={() => setZoom(1)} className="text-xs text-white/50 hover:text-white px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 transition-colors">
                  Reset
                </button>
                <button title="Download" className="h-8 w-8 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center ml-1">
                  <Download className="h-4 w-4 text-white" />
                </button>
              </div>
            </div>

            {/* Image area */}
            <div className="flex-1 overflow-auto flex items-center justify-center p-8">
              <img
                src={sampleDoc}
                alt={previewDoc.name}
                style={{
                  transform: `scale(${zoom}) rotate(${rotation}deg)`,
                  transformOrigin: "center center",
                  transition: "transform 0.2s ease",
                  maxWidth: "100%",
                  maxHeight: "100%",
                  objectFit: "contain",
                  borderRadius: "8px",
                  boxShadow: "0 0 80px rgba(0,0,0,0.8)",
                }}
              />
            </div>
            <div className="text-center pb-3 text-xs text-white/20 flex-shrink-0">
              Esc to close · ← → to navigate · scroll to zoom
            </div>
          </div>
        </div>
      )}
    </PageWrapper>
  );
}
