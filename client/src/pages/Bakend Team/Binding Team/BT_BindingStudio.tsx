import { useState, useRef } from "react";
import { useLocation } from "wouter";
import { PageWrapper } from "@/layout/PageWrapper";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import {
  GripVertical, FileText, Send, RefreshCw, ChevronLeft,
  Eye, ChevronRight, ZoomIn, ZoomOut,
  BookOpen, AlertTriangle, X,
} from "lucide-react";
import { usePageHint } from "@/hooks/usePageHint";
import { ProductTour } from "@/components/ProductTour";

// ── Types ─────────────────────────────────────────────────────────────

type DocCategory = "IDENTITY" | "ACADEMIC" | "FINANCIAL" | "VISA";
type DocStatus = "approved" | "missing";

interface BindingDoc {
  id: string;
  label: string;
  category: DocCategory;
  pageCount: number | null;
  status: DocStatus;
  included: boolean;
}

interface PageRange {
  id: string;
  docLabel: string;
  shortLabel: string;
  category: DocCategory;
  start: number;
  end: number;
  pageCount: number;
}

// ── Mock data ─────────────────────────────────────────────────────────

const INITIAL_DOCS: BindingDoc[] = [
  { id: "d1",  label: "Passport (all pages)",          category: "IDENTITY",  pageCount: 6,    status: "approved", included: true  },
  { id: "d2",  label: "Photo ID / Aadhaar",            category: "IDENTITY",  pageCount: 2,    status: "approved", included: true  },
  { id: "d3",  label: "IELTS score card",              category: "ACADEMIC",  pageCount: 2,    status: "approved", included: true  },
  { id: "d4",  label: "10th & 12th marksheets",        category: "ACADEMIC",  pageCount: 4,    status: "approved", included: true  },
  { id: "d5",  label: "Degree / diploma certificate",  category: "ACADEMIC",  pageCount: 2,    status: "approved", included: true  },
  { id: "d6",  label: "Bank statement (6 months)",     category: "FINANCIAL", pageCount: 8,    status: "approved", included: true  },
  { id: "d7",  label: "ITR (last 3 years)",            category: "FINANCIAL", pageCount: null, status: "missing",  included: false },
  { id: "d8",  label: "GIC confirmation letter",       category: "FINANCIAL", pageCount: 1,    status: "approved", included: true  },
  { id: "d9",  label: "Offer letter from university",  category: "VISA",      pageCount: 2,    status: "approved", included: true  },
  { id: "d10", label: "SOP (statement of purpose)",    category: "VISA",      pageCount: 3,    status: "approved", included: true  },
];

const CLIENT = {
  name: "Arjun Mehta",
  initials: "AM",
  code: "PC-2024-0047",
  country: "Canada",
  visaType: "Student visa",
  bindingOfficer: "Riya Shah",
  version: 2,
};

const APP_OFFICER = { name: "Kriti Patel", initials: "KP", role: "Application team" };

const CATEGORY_COLOR: Record<DocCategory, string> = {
  IDENTITY:  "text-blue-500",
  ACADEMIC:  "text-purple-500",
  FINANCIAL: "text-green-600",
  VISA:      "text-orange-500",
};

const CATEGORY_BG: Record<DocCategory, string> = {
  IDENTITY:  "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800",
  ACADEMIC:  "bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800",
  FINANCIAL: "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800",
  VISA:      "bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800",
};

const SHORT_LABEL: Record<string, string> = {
  d1: "Passport", d2: "Photo ID", d3: "IELTS",
  d4: "Marksheets", d5: "Degree", d6: "Bank Statement",
  d8: "GIC Letter", d9: "Offer Letter", d10: "SOP",
};

// ── Full-screen PDF viewer ────────────────────────────────────────────

function PdfViewerFullScreen({
  onClose,
  onHandOff,
  isHandingOff,
  pageRanges,
  filename,
  totalPages,
  missingDocs,
  onReorderSection,
}: {
  onClose: () => void;
  onHandOff: () => void;
  isHandingOff: boolean;
  pageRanges: PageRange[];
  filename: string;
  totalPages: number;
  missingDocs: BindingDoc[];
  onReorderSection: (from: number, to: number) => void;
}) {
  const [activeSectionIdx, setActiveSectionIdx] = useState(0);
  const [pageInSection, setPageInSection] = useState(1);
  const [zoom, setZoom] = useState(75);

  // Sidebar drag state
  const sidebarDragRef = useRef<number | null>(null);
  const [sidebarDragOver, setSidebarDragOver] = useState<number | null>(null);

  const section = pageRanges[activeSectionIdx];
  const globalPage = section ? section.start + pageInSection - 1 : 1;
  const canPrev = activeSectionIdx > 0 || pageInSection > 1;
  const canNext = section && (pageInSection < section.pageCount || activeSectionIdx < pageRanges.length - 1);

  function goToSection(idx: number) { setActiveSectionIdx(idx); setPageInSection(1); }

  function prevPage() {
    if (pageInSection > 1) { setPageInSection(p => p - 1); }
    else if (activeSectionIdx > 0) {
      const prev = pageRanges[activeSectionIdx - 1];
      setActiveSectionIdx(activeSectionIdx - 1);
      setPageInSection(prev.pageCount);
    }
  }

  function nextPage() {
    if (section && pageInSection < section.pageCount) { setPageInSection(p => p + 1); }
    else if (activeSectionIdx < pageRanges.length - 1) {
      setActiveSectionIdx(activeSectionIdx + 1);
      setPageInSection(1);
    }
  }

  function handleSidebarDragStart(idx: number) { sidebarDragRef.current = idx; }
  function handleSidebarDragOver(e: React.DragEvent, idx: number) { e.preventDefault(); setSidebarDragOver(idx); }
  function handleSidebarDrop(toIdx: number) {
    const fromIdx = sidebarDragRef.current;
    sidebarDragRef.current = null;
    setSidebarDragOver(null);
    if (fromIdx === null || fromIdx === toIdx) return;
    onReorderSection(fromIdx, toIdx);
    // Keep active section following the moved item
    if (activeSectionIdx === fromIdx) setActiveSectionIdx(toIdx);
    else if (fromIdx < toIdx && activeSectionIdx > fromIdx && activeSectionIdx <= toIdx) setActiveSectionIdx(a => a - 1);
    else if (fromIdx > toIdx && activeSectionIdx >= toIdx && activeSectionIdx < fromIdx) setActiveSectionIdx(a => a + 1);
  }
  function handleSidebarDragEnd() { sidebarDragRef.current = null; setSidebarDragOver(null); }

  return (
    <div className="fixed inset-0 z-50 bg-background flex flex-col">

      {/* ── Single top bar: file info · nav · zoom · actions ──── */}
      <div className="flex items-center gap-3 px-4 py-2 border-b border-border bg-card flex-shrink-0 shadow-sm">

        {/* File info */}
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0" />
          <div className="min-w-0">
            <p className="text-sm font-semibold text-foreground truncate leading-tight">{filename}</p>
            <p className="text-[11px] text-muted-foreground leading-tight">
              {totalPages} pages · {pageRanges.length} sections
              {missingDocs.length > 0 && (
                <span className="ml-1.5 text-orange-600 font-medium">
                  · {missingDocs.length} excluded
                </span>
              )}
            </p>
          </div>
        </div>

        {/* Divider */}
        <div className="h-8 w-px bg-border flex-shrink-0" />

        {/* Page navigation */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <Button variant="outline" size="sm" className="h-8 px-3" onClick={prevPage} disabled={!canPrev}>
            <ChevronLeft className="h-3.5 w-3.5 mr-1" /> Prev
          </Button>
          <div className="text-center min-w-[120px]">
            <p className="text-sm font-semibold text-foreground leading-tight">Page {globalPage} of {totalPages}</p>
            <p className="text-[11px] text-muted-foreground leading-tight truncate max-w-[160px]">
              {section?.shortLabel} · {activeSectionIdx + 1}/{pageRanges.length}
            </p>
          </div>
          <Button variant="outline" size="sm" className="h-8 px-3" onClick={nextPage} disabled={!canNext}>
            Next <ChevronRight className="h-3.5 w-3.5 ml-1" />
          </Button>
        </div>

        {/* Divider */}
        <div className="h-8 w-px bg-border flex-shrink-0" />

        {/* Zoom */}
        <div className="flex items-center gap-1 border border-border rounded-md px-1 flex-shrink-0">
          <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => setZoom(z => Math.max(40, z - 10))}>
            <ZoomOut className="h-3.5 w-3.5" />
          </Button>
          <span className="text-xs text-muted-foreground w-9 text-center tabular-nums">{zoom}%</span>
          <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => setZoom(z => Math.min(150, z + 10))}>
            <ZoomIn className="h-3.5 w-3.5" />
          </Button>
        </div>

        {/* Divider */}
        <div className="h-8 w-px bg-border flex-shrink-0" />

        {/* Actions */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <Button variant="outline" size="sm" className="h-8" onClick={onClose}>
            <X className="h-3.5 w-3.5 mr-1.5" /> Close
          </Button>
          <Button size="sm" className="h-8" onClick={() => { onClose(); onHandOff(); }} disabled={isHandingOff}>
            <Send className="h-3.5 w-3.5 mr-1.5" />
            {isHandingOff ? "Handing off…" : "Hand off package"}
          </Button>
        </div>
      </div>

      {/* ── Body ────────────────────────────────────────────────── */}
      <div className="flex flex-1 min-h-0 overflow-hidden">

        {/* Sections sidebar — drag-to-reorder */}
        <div className="w-56 flex-shrink-0 border-r border-border bg-card overflow-y-auto">
          <p className="px-4 pt-3 pb-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
            Sections
            <span className="font-normal normal-case tracking-normal text-muted-foreground/60">· drag to reorder</span>
          </p>

          {pageRanges.map((r, idx) => (
            <div
              key={r.id}
              draggable
              onDragStart={() => handleSidebarDragStart(idx)}
              onDragOver={e => handleSidebarDragOver(e, idx)}
              onDrop={() => handleSidebarDrop(idx)}
              onDragEnd={handleSidebarDragEnd}
              onClick={() => goToSection(idx)}
              className={cn(
                "w-full text-left px-3 py-2.5 flex items-center gap-2 transition-colors border-l-2 cursor-pointer select-none",
                idx === activeSectionIdx
                  ? "bg-primary/8 border-l-primary"
                  : "border-l-transparent hover:bg-accent/50",
                sidebarDragOver === idx && sidebarDragRef.current !== idx
                  ? "ring-1 ring-primary/40 bg-primary/5"
                  : "",
              )}
            >
              {/* Grip handle */}
              <GripVertical className="h-3.5 w-3.5 text-muted-foreground/40 flex-shrink-0 cursor-grab active:cursor-grabbing" />

              <div className="min-w-0 flex-1">
                <p className={cn(
                  "text-sm font-medium truncate",
                  idx === activeSectionIdx ? "text-primary" : "text-foreground",
                )}>
                  {r.shortLabel}
                </p>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  p.{r.start}{r.end > r.start ? `–${r.end}` : ""} · {r.pageCount}p
                </p>
              </div>
              {idx === activeSectionIdx && (
                <ChevronRight className="h-3.5 w-3.5 text-primary flex-shrink-0" />
              )}
            </div>
          ))}

          {/* Excluded docs */}
          {missingDocs.length > 0 && (
            <div className="mx-3 mt-3 mb-3 p-2.5 rounded-lg bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800">
              <p className="text-[10px] font-bold text-orange-700 dark:text-orange-400 uppercase tracking-wide flex items-center gap-1 mb-1.5">
                <AlertTriangle className="h-3 w-3" /> Excluded
              </p>
              {missingDocs.map(d => (
                <p key={d.id} className="text-xs text-orange-600 dark:text-orange-400 truncate">{d.label}</p>
              ))}
            </div>
          )}
        </div>

        {/* Page viewer — fills all remaining space */}
        <div className="flex-1 overflow-y-auto flex items-start justify-center p-8 bg-muted/20 dark:bg-muted/10">
          {section ? (
            <div
              className="bg-white dark:bg-card shadow-xl border border-border/60 rounded flex flex-col transition-all duration-150"
              style={{
                width:     `${Math.round(560 * zoom / 100)}px`,
                minHeight: `${Math.round(792 * zoom / 100)}px`,
                padding:   `${Math.round(40 * zoom / 100)}px`,
              }}
            >
              {/* Document section badge */}
              <div className={cn("rounded-xl border p-5 text-center space-y-2 mb-6", CATEGORY_BG[section.category])}>
                <BookOpen className={cn("h-9 w-9 mx-auto", CATEGORY_COLOR[section.category])} />
                <p className={cn("text-xs font-bold uppercase tracking-widest", CATEGORY_COLOR[section.category])}>
                  {section.category}
                </p>
                <p className="text-base font-bold text-foreground">{section.docLabel}</p>
                <p className="text-xs text-muted-foreground">
                  Page {pageInSection} of {section.pageCount} &nbsp;·&nbsp; Document page {globalPage} of {totalPages}
                </p>
              </div>

              {/* Simulated page lines */}
              <div className="space-y-2.5 flex-1">
                {Array.from({ length: 12 }).map((_, i) => (
                  <div
                    key={i}
                    className="h-2.5 rounded-full bg-muted"
                    style={{ width: `${55 + ((i * 19 + pageInSection * 11) % 40)}%` }}
                  />
                ))}
              </div>

              <p className="text-[11px] text-muted-foreground/50 text-center mt-8 italic">
                PDF content rendered from S3 pre-signed URL in production
              </p>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground mt-20">No sections included in this package.</p>
          )}
        </div>
      </div>

    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────

export default function BtBindingStudio({ params }: { params?: { clientId?: string } }) {
  const { showHint, dismissHint } = usePageHint("bt_binding_studio");
  const [, setLocation] = useLocation();
  const [docs, setDocs] = useState<BindingDoc[]>(INITIAL_DOCS);
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  const [lastGenerated, setLastGenerated] = useState("Today, 11:42 AM");
  const [isGenerating, setIsGenerating] = useState(false);
  const [isHandingOff, setIsHandingOff] = useState(false);
  const [showAllSections, setShowAllSections] = useState(false);
  const [showViewer, setShowViewer] = useState(false);
  const dragIdRef = useRef<string | null>(null);

  // ── Derived stats ────────────────────────────────────────────────────

  const includedDocs = docs.filter(d => d.included && d.status === "approved");
  const missingDocs  = docs.filter(d => d.status === "missing");
  const totalPages   = includedDocs.reduce((s, d) => s + (d.pageCount ?? 0), 0);
  const completeness = Math.round((includedDocs.length / docs.length) * 100);

  // Sequential order numbers (approved only; missing = "—")
  let orderSeq = 0;
  const orderMap: Record<string, number | null> = {};
  docs.forEach(d => {
    if (d.status === "approved") { orderSeq++; orderMap[d.id] = orderSeq; }
    else { orderMap[d.id] = null; }
  });

  // Page ranges for included docs
  let page = 1;
  const pageRanges: PageRange[] = includedDocs.map(doc => {
    const start = page;
    const end   = start + (doc.pageCount ?? 0) - 1;
    page = end + 1;
    return {
      id: doc.id,
      docLabel:   doc.label,
      shortLabel: SHORT_LABEL[doc.id] ?? doc.label.split(" ")[0],
      category:   doc.category,
      start,
      end,
      pageCount: doc.pageCount ?? 0,
    };
  });

  // Pre-compute category header visibility
  const docRows = docs.map((doc, idx) => ({
    doc,
    showHeader: idx === 0 || doc.category !== docs[idx - 1].category,
  }));

  const filename = `${CLIENT.name.replace(" ", "_")}_${CLIENT.country}_Student_v${CLIENT.version}.pdf`;

  // ── Handlers ─────────────────────────────────────────────────────────

  function handleDragStart(id: string) { dragIdRef.current = id; }

  function handleDragOver(e: React.DragEvent, id: string) {
    e.preventDefault();
    setDragOverId(id);
  }

  function handleDrop(targetId: string) {
    const srcId = dragIdRef.current;
    dragIdRef.current = null;
    setDragOverId(null);
    if (!srcId || srcId === targetId) return;
    const src = docs.find(d => d.id === srcId);
    if (!src || src.status === "missing") return;
    const next = [...docs];
    const from = next.findIndex(d => d.id === srcId);
    const to   = next.findIndex(d => d.id === targetId);
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    setDocs(next);
  }

  function handleDragEnd() { dragIdRef.current = null; setDragOverId(null); }

  function toggleInclude(id: string) {
    setDocs(prev => prev.map(d => {
      if (d.id !== id || d.status === "missing") return d;
      return { ...d, included: !d.included };
    }));
  }

  function handleRegenerate() {
    setIsGenerating(true);
    setTimeout(() => {
      setIsGenerating(false);
      const now = new Date();
      const h = now.getHours() % 12 || 12;
      const m = String(now.getMinutes()).padStart(2, "0");
      setLastGenerated(`Today, ${h}:${m} ${now.getHours() >= 12 ? "PM" : "AM"}`);
    }, 1500);
  }

  function handleHandOff() {
    setIsHandingOff(true);
    // Production: POST /api/binding-packages/:id/handoff → domain event + socket notify
    setTimeout(() => { setIsHandingOff(false); setLocation("/binding/clients"); }, 2000);
  }

  function handleReorderSection(fromIdx: number, toIdx: number) {
    // fromIdx / toIdx are indices into includedDocs; reorder in the full docs array
    const srcId = includedDocs[fromIdx]?.id;
    const tgtId = includedDocs[toIdx]?.id;
    if (!srcId || !tgtId) return;
    const next = [...docs];
    const srcPos = next.findIndex(d => d.id === srcId);
    const tgtPos = next.findIndex(d => d.id === tgtId);
    const [moved] = next.splice(srcPos, 1);
    next.splice(tgtPos, 0, moved);
    setDocs(next);
  }

  // ── Render ───────────────────────────────────────────────────────────

  return (
    <PageWrapper
      title=""
      breadcrumbs={[
        { label: "Binding Team", href: "/binding/dashboard" },
        { label: "Clients", href: "/binding/clients" },
        { label: "Binding Studio" },
      ]}
      actions={
        <Button variant="outline" size="sm" onClick={() => setLocation("/binding/clients")}>
          <ChevronLeft className="h-3.5 w-3.5 mr-1" /> Back
        </Button>
      }
    >
      <div className="space-y-4">

        {/* ── Client Header ─────────────────────────────────────────── */}
        <div className="flex items-center gap-3">
          <Avatar className="h-11 w-11 flex-shrink-0">
            <AvatarFallback className="bg-primary text-primary-foreground font-semibold text-sm">
              {CLIENT.initials}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-base font-semibold text-foreground">{CLIENT.name}</h1>
              <span className="inline-flex px-1.5 py-0.5 rounded bg-muted text-muted-foreground text-[11px] font-semibold">
                v{CLIENT.version}
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              {CLIENT.code} · {CLIENT.country} · {CLIENT.visaType} · Binding officer: {CLIENT.bindingOfficer}
            </p>
          </div>
          <span className={cn(
            "inline-flex px-3 py-1 rounded-full text-xs font-semibold flex-shrink-0",
            missingDocs.length === 0
              ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
              : "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
          )}>
            {missingDocs.length === 0 ? "Ready" : "Incomplete"}
          </span>
        </div>

        {/* ── Two-panel layout ─────────────────────────────────────── */}
        <div className="grid grid-cols-1 xl:grid-cols-[1fr_360px] gap-5 items-start">

          {/* LEFT: Document Order */}
          <Card data-tour="bt-studio-docs" className="bg-card border-border shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3 border-b border-border">
              <h2 className="text-[11px] font-bold uppercase tracking-wider text-foreground">Document Order</h2>
              <span className="text-xs text-muted-foreground">Drag to reorder · Toggle to include/exclude</span>
            </div>

            <div>
              {docRows.map(({ doc, showHeader }) => {
                const isMissing    = doc.status === "missing";
                const isDragTarget = dragOverId === doc.id;

                return (
                  <div key={doc.id}>
                    {showHeader && (
                      <div className="px-5 py-1.5 bg-muted/50 border-b border-t border-border/60 first:border-t-0">
                        <span className={cn("text-[10px] font-bold uppercase tracking-[0.15em]", CATEGORY_COLOR[doc.category])}>
                          {doc.category}
                        </span>
                      </div>
                    )}

                    <div
                      draggable={!isMissing}
                      onDragStart={() => handleDragStart(doc.id)}
                      onDragOver={e => handleDragOver(e, doc.id)}
                      onDrop={() => handleDrop(doc.id)}
                      onDragEnd={handleDragEnd}
                      className={cn(
                        "flex items-center gap-3 px-5 py-3 border-b border-border/50 transition-colors select-none",
                        isMissing ? "opacity-50" : "hover:bg-accent/20",
                        isDragTarget && !isMissing && "bg-primary/5 border-l-2 border-l-primary",
                      )}
                    >
                      <Checkbox disabled={isMissing} className="h-3.5 w-3.5 flex-shrink-0 rounded-sm" />

                      <span className="w-5 text-center text-xs text-muted-foreground font-mono flex-shrink-0">
                        {orderMap[doc.id] ?? "—"}
                      </span>

                      <GripVertical className={cn(
                        "h-4 w-4 flex-shrink-0",
                        isMissing ? "text-muted-foreground/20" : "text-muted-foreground/40 cursor-grab",
                      )} />

                      <div className="flex-1 min-w-0">
                        <p className={cn("text-sm font-medium leading-snug", isMissing ? "text-muted-foreground" : "text-foreground")}>
                          {doc.label}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {doc.category.charAt(0) + doc.category.slice(1).toLowerCase()} ·{" "}
                          {doc.pageCount !== null ? `${doc.pageCount} page${doc.pageCount !== 1 ? "s" : ""}` : "— pages"}
                        </p>
                      </div>

                      <span className={cn(
                        "inline-flex px-2 py-0.5 rounded-full text-xs font-medium flex-shrink-0",
                        isMissing
                          ? "bg-muted text-muted-foreground"
                          : "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
                      )}>
                        {isMissing ? "Missing" : "Approved"}
                      </span>

                      <Checkbox
                        checked={!isMissing && doc.included}
                        disabled={isMissing}
                        onCheckedChange={() => toggleInclude(doc.id)}
                        className="h-5 w-5 flex-shrink-0 rounded"
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            {missingDocs.length > 0 && (
              <div className="mx-4 my-3 flex items-start gap-2.5 p-3 rounded-lg bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-900">
                <Checkbox className="mt-0.5 h-4 w-4 flex-shrink-0 rounded-sm" />
                <p className="text-sm text-red-700 dark:text-red-400 leading-snug">
                  {missingDocs.length} document{missingDocs.length > 1 ? "s are" : " is"} missing (
                  {missingDocs.map(d => d.label.split(" ")[0]).join(", ")}). It has been excluded from the package.
                  Inform CX team or proceed without it.
                </p>
              </div>
            )}
          </Card>

          {/* RIGHT: Summary · Preview · Handoff */}
          <div className="space-y-4">

            {/* Package Summary */}
            <Card data-tour="bt-studio-summary" className="bg-card border-border shadow-sm">
              <div className="px-5 py-3 border-b border-border">
                <h2 className="text-[11px] font-bold uppercase tracking-wider text-foreground">Package Summary</h2>
              </div>
              <CardContent className="pt-4 pb-4 space-y-2.5">
                {[
                  { label: "Total documents", value: `${includedDocs.length} included`,  cls: "font-bold text-foreground" },
                  { label: "Total pages",     value: `${totalPages} pages`,               cls: "font-bold text-foreground" },
                  {
                    label: "Missing docs",
                    value: missingDocs.length > 0
                      ? `${missingDocs.length} (${missingDocs.map(d => d.label.split(" ")[0]).join(", ")})`
                      : "None",
                    cls: missingDocs.length > 0 ? "font-bold text-red-600" : "font-bold text-green-600",
                  },
                  { label: "Package version", value: `v${CLIENT.version}`, cls: "text-foreground" },
                  { label: "Last generated",  value: lastGenerated,        cls: "text-foreground" },
                ].map(row => (
                  <div key={row.label} className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">{row.label}</span>
                    <span className={row.cls}>{row.value}</span>
                  </div>
                ))}
                <div className="pt-2 border-t border-border space-y-1.5">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Completeness</span>
                    <span className="font-semibold text-foreground">{completeness}%</span>
                  </div>
                  <Progress value={completeness} className="h-2" />
                </div>
              </CardContent>
            </Card>

            {/* PDF Preview */}
            <Card className="bg-card border-border shadow-sm">
              <div className="px-5 py-3 border-b border-border">
                <h2 className="text-[11px] font-bold uppercase tracking-wider text-foreground">PDF Preview</h2>
              </div>
              <CardContent className="pt-4 pb-4 space-y-3">
                {/* File stub — click opens full viewer */}
                <button
                  className="w-full flex flex-col items-center gap-1.5 py-4 bg-muted/30 rounded-lg border border-border hover:bg-accent/30 hover:border-primary/40 transition-colors group"
                  onClick={() => setShowViewer(true)}
                  disabled={includedDocs.length === 0}
                >
                  <FileText className="h-8 w-8 text-muted-foreground group-hover:text-primary transition-colors" />
                  <p className="text-sm font-medium text-center leading-snug px-3">{filename}</p>
                  <p className="text-xs text-muted-foreground">
                    {totalPages} pages · ~{(totalPages * 0.08).toFixed(1)} MB
                  </p>
                  <span className="inline-flex items-center gap-1 text-xs text-primary font-medium mt-0.5">
                    <Eye className="h-3.5 w-3.5" /> Click to preview
                  </span>
                </button>

                {/* Page range grid */}
                {pageRanges.length > 0 && (
                  <>
                    <div className="grid grid-cols-2 gap-2">
                      {(showAllSections ? pageRanges : pageRanges.slice(0, 4)).map(r => (
                        <button
                          key={r.id}
                          onClick={() => setShowViewer(true)}
                          className="px-3 py-2 bg-muted/30 rounded-md border border-border/50 text-left hover:bg-accent/30 hover:border-primary/30 transition-colors"
                        >
                          <p className="text-xs font-semibold text-foreground">
                            p.{r.start}{r.end > r.start ? `–${r.end}` : ""}
                          </p>
                          <p className="text-xs text-muted-foreground truncate">{r.shortLabel}</p>
                        </button>
                      ))}
                    </div>
                    {pageRanges.length > 4 && (
                      <button
                        onClick={() => setShowAllSections(v => !v)}
                        className="text-xs text-primary hover:underline w-full text-center"
                      >
                        {showAllSections ? "Show less" : `+ ${pageRanges.length - 4} more section${pageRanges.length - 4 !== 1 ? "s" : ""}`}
                      </button>
                    )}
                  </>
                )}

                {/* Open viewer button */}
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => setShowViewer(true)}
                  disabled={includedDocs.length === 0}
                >
                  <Eye className="h-4 w-4 mr-2" />
                  Open Full Preview
                </Button>
              </CardContent>
            </Card>

            {/* Hand Off */}
            <Card className="bg-card border-border shadow-sm">
              <div className="px-5 py-3 border-b border-border">
                <h2 className="text-[11px] font-bold uppercase tracking-wider text-foreground">
                  Hand Off to Application Team
                </h2>
              </div>
              <CardContent className="pt-4 pb-4 space-y-4">
                <div>
                  <p className="text-xs text-muted-foreground mb-2">Assigned application officer</p>
                  <div className="flex items-center gap-2.5">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="bg-accent text-accent-foreground text-xs font-semibold">
                        {APP_OFFICER.initials}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-sm font-medium text-foreground">{APP_OFFICER.name}</p>
                      <p className="text-xs text-muted-foreground">{APP_OFFICER.role}</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Button
                    variant="outline"
                    className="w-full justify-start"
                    disabled={isGenerating}
                    onClick={handleRegenerate}
                  >
                    <RefreshCw className={cn("h-4 w-4 mr-2", isGenerating && "animate-spin")} />
                    {isGenerating ? "Generating..." : "Re-generate merged PDF"}
                  </Button>

                  <Button
                    variant="outline"
                    className="w-full justify-start"
                    onClick={() => setShowViewer(true)}
                    disabled={includedDocs.length === 0}
                  >
                    <Eye className="h-4 w-4 mr-2" />
                    Preview before hand-off
                  </Button>

                  <Button
                    className="w-full justify-start"
                    disabled={isHandingOff}
                    onClick={handleHandOff}
                  >
                    <Send className="h-4 w-4 mr-2" />
                    {isHandingOff ? "Handing off..." : "Hand off package"}
                  </Button>
                </div>

                <p className="text-xs text-muted-foreground text-center leading-relaxed">
                  Handing off will notify {APP_OFFICER.name} and move client to{" "}
                  <em>application</em> stage.
                </p>
              </CardContent>
            </Card>

          </div>
        </div>
      </div>

      <ProductTour
        open={showHint}
        onClose={dismissHint}
        steps={[
          { target: '[data-tour="bt-studio-docs"]', title: "Document Order", content: "Drag rows to reorder documents in the merged PDF. Toggle the checkbox on the right to include or exclude a document from the package.", side: "right" },
          { target: '[data-tour="bt-studio-summary"]', title: "Package Summary", content: "Shows included docs, total pages, any missing files, and completeness %. Use Re-generate to refresh the PDF after making changes.", side: "left" },
          { target: '[data-tour="bt-studio-docs"]', title: "Hand Off Package", content: "Once all required documents are included, click Hand Off Package in the summary panel to notify the Application Team and advance the client stage.", side: "top" },
        ]}
      />

      {/* PDF Viewer full-screen */}
      {showViewer && (
        <PdfViewerFullScreen
          onClose={() => setShowViewer(false)}
          onHandOff={handleHandOff}
          isHandingOff={isHandingOff}
          pageRanges={pageRanges}
          filename={filename}
          totalPages={totalPages}
          missingDocs={missingDocs}
          onReorderSection={handleReorderSection}
        />
      )}
    </PageWrapper>
  );
}
