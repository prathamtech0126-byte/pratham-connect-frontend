// client/src/components/checklist/ChecklistCard.tsx
import { useState } from "react";
import { Globe, FileText, ChevronRight, MoreVertical, Pencil, Trash2, Copy, Calendar, Clock, CaseSensitive } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import type { ChecklistSummary } from "@/api/checklist.api";
import { updateChecklist, deleteChecklist, duplicateChecklist } from "@/api/checklist.api";

function formatDate(value: string | null | undefined): string {
  if (!value) return "—";
  const date = new Date(value);
  if (isNaN(date.getTime())) return "—";
  // DB stores `timestamp without time zone` (raw local/IST values).
  // node-postgres sends them to JS as UTC, so we must render in UTC
  // to get back the exact value that's in the database.
  return date.toLocaleString(undefined, {
    timeZone: "UTC",
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

interface Props {
  checklist: ChecklistSummary;
  countryName: string | null;
  allTitles: string[];
  onView: (slug: string) => void;
  onDeleted?: (id: string) => void;
  onUpdated?: (updated: ChecklistSummary) => void;
  onDuplicated?: () => void;
}

export function ChecklistCard({ checklist, countryName, allTitles, onView, onDeleted, onUpdated, onDuplicated }: Props) {
  // ── Edit state ──
  const [editOpen, setEditOpen] = useState(false);
  const [editTitle, setEditTitle] = useState(checklist.title);
  const [editSubType, setEditSubType] = useState(checklist.subType ?? "");
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  // ── Delete state ──
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // ── Duplicate state ──
  const [duplicateLoading, setDuplicateLoading] = useState(false);

  const openEdit = () => {
    setEditTitle(checklist.title);
    setEditSubType(checklist.subType ?? "");
    setEditError(null);
    setEditOpen(true);
  };

  const handleEdit = async () => {
    if (!editTitle.trim()) { setEditError("Title is required."); return; }
    setEditError(null);
    setEditLoading(true);
    try {
      const res = await updateChecklist(checklist.id, {
        title: editTitle.trim(),
        subType: editSubType.trim() || null,
      });
      if (res.success) {
        onUpdated?.(res.data);
        setEditOpen(false);
      }
    } catch (err: any) {
      setEditError(err?.response?.data?.error?.message ?? "Failed to update. Please try again.");
    } finally {
      setEditLoading(false);
    }
  };

  const handleDelete = async () => {
    setDeleteLoading(true);
    setDeleteError(null);
    try {
      await deleteChecklist(checklist.id);
      onDeleted?.(checklist.id);
      setDeleteOpen(false);
    } catch (err: any) {
      setDeleteError(err?.response?.data?.error?.message ?? "Failed to delete. Please try again.");
      setDeleteLoading(false);
    }
  };

  const handleDuplicate = async () => {
    setDuplicateLoading(true);
    try {
      await duplicateChecklist(checklist, allTitles);
      onDuplicated?.();
    } catch (err: any) {
      // silently log — the card list will still be valid even if this fails
      console.error("Duplicate failed:", err);
    } finally {
      setDuplicateLoading(false);
    }
  };

  return (
    <>
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md hover:border-blue-800 transition-all duration-200 flex flex-col p-5 gap-4">
        {/* Title row */}
        <div className="flex items-start justify-between gap-2">
          <h3 className="text-sm font-semibold text-slate-800 leading-snug flex-1">
            {checklist.title}
          </h3>
          <div className="flex items-center gap-1 shrink-0">
            {checklist.subType && (
              <span className="text-xs bg-blue-50 text-[#0063cc] border border-blue-200 px-2 py-0.5 rounded-full font-medium">
                {checklist.subType}
              </span>
            )}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-slate-400 hover:text-slate-600">
                  <MoreVertical className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-36">
                <DropdownMenuItem onClick={openEdit} className="gap-2 cursor-pointer">
                  <CaseSensitive className="w-3.5 h-3.5" />
                  Rename
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={handleDuplicate}
                  disabled={duplicateLoading}
                  className="gap-2 cursor-pointer"
                >
                  <Copy className="w-3.5 h-3.5" />
                  {duplicateLoading ? "Duplicating…" : "Duplicate"}
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => { setDeleteError(null); setDeleteOpen(true); }}
                  className="gap-2 cursor-pointer text-red-600 focus:text-red-600"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Meta */}
        <div className="flex flex-col gap-2 text-xs text-slate-500">
          <div className="flex items-center gap-1.5">
            <Globe className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span>{countryName ?? "All Countries"}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <FileText className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span>
              {checklist.sectionCount > 0
                ? `${checklist.sectionCount} sections · ${checklist.itemCount} items`
                : "—"}
            </span>
          </div>
        </div>
{/* Dates — compact two-line layout */}
{/* <div className="text-xs text-slate-500 border-t border-slate-100 pt-3 -mx-5 px-5 space-y-0.5">
  <div className="flex items-center gap-1.5">
    <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
    <span className="text-slate-400 w-14">Created:</span>
    <span className="font-medium text-slate-600">{formatDate(checklist.createdAt)}</span>
  </div>
  {checklist.updatedAt && checklist.updatedAt !== checklist.createdAt && (
    <div className="flex items-center gap-1.5">
      <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
      <span className="text-slate-400 w-14">Modified:</span>
      <span className="font-medium text-slate-600">{formatDate(checklist.updatedAt)}</span>
    </div>
  )}
</div> */}

{/* Dates — show both Created and Modified */}
<div className="flex flex-col gap-0 text-xs text-slate-500 border-t border-slate-100 pt-3 -mx-5 px-5">
  <div className="flex items-center gap-1.5 py-0.5">
    <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
    <span className="text-slate-400">Created:</span>
    <span className="ml-auto font-medium text-slate-600">{formatDate(checklist.createdAt)}</span>
  </div>
  {checklist.updatedAt && checklist.updatedAt !== checklist.createdAt && (
    <div className="flex items-center gap-1.5 py-0.5">
      <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
      <span className="text-slate-400">Modified:</span>
      <span className="ml-auto font-medium text-slate-600">{formatDate(checklist.updatedAt)}</span>
    </div>
  )}
</div>
        {/* Dates — show Modified if edited, otherwise Created
        {(() => {
          const isModified = !!checklist.updatedAt && checklist.updatedAt !== checklist.createdAt;
          return (
            <div className="flex items-center gap-1.5 text-xs text-slate-500 border-t border-slate-100 pt-3 -mx-5 px-5">
              {isModified ? (
                <>
                  <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span className="text-slate-400">Modified:</span>
                  <span className="ml-auto font-medium text-slate-600">{formatDate(checklist.updatedAt)}</span>
                </>
              ) : (
                <>
                  <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span className="text-slate-400">Created:</span>
                  <span className="ml-auto font-medium text-slate-600">{formatDate(checklist.createdAt)}</span>
                </>
              )}
            </div>
          );
        })()} */}

        {/* View button */}
        <Button
          onClick={() => onView(checklist.slug)}
          className="mt-auto w-full bg-[#0063cc] hover:bg-[#0052a3] text-white text-sm"
        >
          View Checklist
          <ChevronRight className="w-4 h-4 ml-1" />
        </Button>
      </div>

      {/* ── Edit Dialog ── */}
      <Dialog open={editOpen} onOpenChange={(o) => { if (!editLoading) setEditOpen(o); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Pencil className="w-4 h-4 text-[#0063cc]" />
              Edit Checklist
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {editError && (
              <Alert variant="destructive">
                <AlertDescription>{editError}</AlertDescription>
              </Alert>
            )}
            <div className="space-y-1.5">
              <Label className="text-sm font-semibold">
                Title <span className="text-red-500">*</span>
              </Label>
              <Input
                value={editTitle}
                onChange={(e) => { setEditTitle(e.target.value); setEditError(null); }}
                placeholder="Checklist title"
                disabled={editLoading}
                className="focus:ring-[#0063cc] focus:border-[#0063cc]"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-semibold">
                Sub Type <span className="text-xs font-normal text-slate-400">(optional)</span>
              </Label>
              <Input
                value={editSubType}
                onChange={(e) => setEditSubType(e.target.value)}
                placeholder="e.g., Work Permit, Extension"
                disabled={editLoading}
                className="focus:ring-[#0063cc] focus:border-[#0063cc]"
              />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setEditOpen(false)} disabled={editLoading}>
              Cancel
            </Button>
            <Button onClick={handleEdit} disabled={editLoading} className="bg-[#0063cc] hover:bg-[#0052a3]">
              {editLoading ? "Saving…" : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Delete Confirm ── */}
      <AlertDialog open={deleteOpen} onOpenChange={(o) => { if (!deleteLoading) setDeleteOpen(o); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Checklist?</AlertDialogTitle>
            <AlertDialogDescription>
              <strong>"{checklist.title}"</strong> and all its sections and documents will be
              permanently deleted. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {deleteError && (
            <Alert variant="destructive" className="mt-2">
              <AlertDescription>{deleteError}</AlertDescription>
            </Alert>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteLoading}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleteLoading}
              className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
            >
              {deleteLoading ? "Deleting…" : "Yes, Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
