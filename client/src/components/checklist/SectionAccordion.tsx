// client/src/components/checklist/SectionAccordion.tsx
import { useState } from "react";
import { ChevronDown, ChevronRight, Info, Pencil, Trash2, MoreVertical } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Alert, AlertDescription } from "@/components/ui/alert";
import type { Section, Item } from "@/api/checklist.api";
import { updateSection, deleteSection, updateItem, deleteItem } from "@/api/checklist.api";

interface Props {
  section: Section;
  onSectionDeleted?: (id: string) => void;
  onSectionUpdated?: (updated: Section) => void;
}

// ── Item row with edit/delete ──────────────────────────────────────────────
function ItemRow({
  item,
  index,
  onDeleted,
  onUpdated,
}: {
  item: Item;
  index: number;
  onDeleted: (id: string) => void;
  onUpdated: (updated: Item) => void;
}) {
  const [editOpen, setEditOpen] = useState(false);
  const [editName, setEditName] = useState(item.name);
  const [editNotes, setEditNotes] = useState(item.notes ?? "");
  const [editQty, setEditQty] = useState(item.quantityNote ?? "");
  const [editMandatory, setEditMandatory] = useState(item.isMandatory);
  const [editConditional, setEditConditional] = useState(item.isConditional);
  const [editConditionText, setEditConditionText] = useState(item.conditionText ?? "");
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const openEdit = () => {
    setEditName(item.name);
    setEditNotes(item.notes ?? "");
    setEditQty(item.quantityNote ?? "");
    setEditMandatory(item.isMandatory);
    setEditConditional(item.isConditional);
    setEditConditionText(item.conditionText ?? "");
    setEditError(null);
    setEditOpen(true);
  };

  const handleEdit = async () => {
    if (!editName.trim()) { setEditError("Document name is required."); return; }
    setEditError(null);
    setEditLoading(true);
    try {
      const res = await updateItem(item.id, {
        name: editName.trim(),
        notes: editNotes.trim() || null,
        quantityNote: editQty.trim() || null,
        isMandatory: editMandatory,
        isConditional: editConditional,
        conditionText: editConditional ? editConditionText.trim() || null : null,
      });
      if (res.success) { onUpdated(res.data); setEditOpen(false); }
    } catch (err: any) {
      setEditError(err?.response?.data?.error?.message ?? "Failed to update. Please try again.");
    } finally {
      setEditLoading(false);
    }
  };

  const handleDelete = async () => {
    setDeleteLoading(true);
    try {
      await deleteItem(item.id);
      onDeleted(item.id);
    } catch {
      setDeleteLoading(false);
    }
  };

  return (
    <>
      <li className="flex items-start gap-3 group">
        <span className="text-xs font-bold text-slate-400 mt-0.5 w-5 shrink-0 text-right">
          {index + 1}.
        </span>

        <div className="flex-1 min-w-0">
          <span className="text-sm font-semibold text-slate-800">{item.name}</span>
          {item.notes && (
            <p className="text-xs italic text-slate-500 mt-0.5">{item.notes}</p>
          )}
        </div>

        <div className="flex items-center gap-1.5 flex-shrink-0 flex-wrap justify-end">
          {item.quantityNote && (
            <span className="text-xs bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full border border-slate-200">
              {item.quantityNote}
            </span>
          )}
          <span className={cn(
            "text-xs px-2 py-0.5 rounded-full border font-medium",
            item.isMandatory
              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
              : "bg-slate-100 text-slate-500 border-slate-200"
          )}>
            {item.isMandatory ? "Required" : "Optional"}
          </span>
          {item.isConditional && (
            <span className="text-xs bg-amber-100 text-amber-700 border border-amber-200 px-2 py-0.5 rounded-full font-medium">
              Conditional
            </span>
          )}

          {/* Action menu — visible on hover */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity text-slate-400 hover:text-slate-700"
              >
                <MoreVertical className="w-3.5 h-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-32">
              <DropdownMenuItem onClick={openEdit} className="gap-2 cursor-pointer">
                <Pencil className="w-3.5 h-3.5" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => setDeleteOpen(true)}
                className="gap-2 cursor-pointer text-red-600 focus:text-red-600"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </li>

      {/* Edit Document Dialog */}
      <Dialog open={editOpen} onOpenChange={(o) => { if (!editLoading) setEditOpen(o); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Pencil className="w-4 h-4 text-[#0063cc]" />
              Edit Document
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            {editError && <Alert variant="destructive"><AlertDescription>{editError}</AlertDescription></Alert>}

            <div className="space-y-1.5">
              <Label className="text-sm font-semibold">Name <span className="text-red-500">*</span></Label>
              <Input value={editName} onChange={(e) => { setEditName(e.target.value); setEditError(null); }} disabled={editLoading} className="focus:ring-[#0063cc] focus:border-[#0063cc]" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-semibold">Notes <span className="text-xs font-normal text-slate-400">(optional)</span></Label>
              <Textarea value={editNotes} onChange={(e) => setEditNotes(e.target.value)} rows={2} disabled={editLoading} className="focus:ring-[#0063cc] focus:border-[#0063cc]" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-semibold">Quantity Note <span className="text-xs font-normal text-slate-400">(optional)</span></Label>
              <Input value={editQty} onChange={(e) => setEditQty(e.target.value)} placeholder="e.g., Min. 4,000 CAD" disabled={editLoading} className="focus:ring-[#0063cc] focus:border-[#0063cc]" />
            </div>
            <div className="flex flex-wrap gap-x-5 gap-y-2 pt-1">
              <label className="flex items-center gap-2 cursor-pointer text-sm">
                <input type="checkbox" checked={editMandatory} onChange={(e) => setEditMandatory(e.target.checked)} className="rounded border-slate-300 text-[#0063cc]" />
                Mandatory
              </label>
              <label className="flex items-center gap-2 cursor-pointer text-sm">
                <input type="checkbox" checked={editConditional} onChange={(e) => setEditConditional(e.target.checked)} className="rounded border-slate-300 text-[#0063cc]" />
                Conditional
              </label>
            </div>
            {editConditional && (
              <div className="space-y-1.5">
                <Label className="text-sm font-semibold">Condition Text</Label>
                <Input value={editConditionText} onChange={(e) => setEditConditionText(e.target.value)} placeholder="e.g., Only if applicant has dependents" disabled={editLoading} className="focus:ring-[#0063cc] focus:border-[#0063cc]" />
              </div>
            )}
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setEditOpen(false)} disabled={editLoading}>Cancel</Button>
            <Button onClick={handleEdit} disabled={editLoading} className="bg-[#0063cc] hover:bg-[#0052a3]">
              {editLoading ? "Saving…" : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Document Confirm */}
      <AlertDialog open={deleteOpen} onOpenChange={(o) => { if (!deleteLoading) setDeleteOpen(o); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Document?</AlertDialogTitle>
            <AlertDialogDescription>
              <strong>"{item.name}"</strong> will be permanently deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteLoading}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={deleteLoading} className="bg-red-600 hover:bg-red-700">
              {deleteLoading ? "Deleting…" : "Yes, Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

// ── Section Accordion ─────────────────────────────────────────────────────
export function SectionAccordion({ section, onSectionDeleted, onSectionUpdated }: Props) {
  const [open, setOpen] = useState(true);
  const [items, setItems] = useState<Item[]>(section.items);

  // Edit section state
  const [editOpen, setEditOpen] = useState(false);
  const [editTitle, setEditTitle] = useState(section.title);
  const [editDesc, setEditDesc] = useState(section.description ?? "");
  const [editConditional, setEditConditional] = useState(section.isConditional);
  const [editConditionText, setEditConditionText] = useState(section.conditionText ?? "");
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  // Delete section state
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const [sectionTitle, setSectionTitle] = useState(section.title);
  const [sectionDesc, setSectionDesc] = useState(section.description ?? "");
  const [sectionConditional, setSectionConditional] = useState(section.isConditional);
  const [sectionConditionText, setSectionConditionText] = useState(section.conditionText ?? "");

  const sortedItems = items.slice().sort((a, b) => a.displayOrder - b.displayOrder);

  const openEdit = () => {
    setEditTitle(sectionTitle);
    setEditDesc(sectionDesc);
    setEditConditional(sectionConditional);
    setEditConditionText(sectionConditionText);
    setEditError(null);
    setEditOpen(true);
  };

  const handleEditSection = async () => {
    if (!editTitle.trim()) { setEditError("Section title is required."); return; }
    setEditError(null);
    setEditLoading(true);
    try {
      const res = await updateSection(section.id, {
        title: editTitle.trim(),
        description: editDesc.trim() || null,
        isConditional: editConditional,
        conditionText: editConditional ? editConditionText.trim() || null : null,
      });
      if (res.success) {
        setSectionTitle(res.data.title);
        setSectionDesc(res.data.description ?? "");
        setSectionConditional(res.data.isConditional);
        setSectionConditionText(res.data.conditionText ?? "");
        onSectionUpdated?.({ ...section, ...res.data, items });
        setEditOpen(false);
      }
    } catch (err: any) {
      setEditError(err?.response?.data?.error?.message ?? "Failed to update. Please try again.");
    } finally {
      setEditLoading(false);
    }
  };

  const handleDeleteSection = async () => {
    setDeleteLoading(true);
    try {
      await deleteSection(section.id);
      onSectionDeleted?.(section.id);
    } catch {
      setDeleteLoading(false);
    }
  };

  return (
    <>
      <div className="border border-slate-200 rounded-lg overflow-hidden">
        {/* Header */}
        <div className="flex items-center bg-slate-50 hover:bg-slate-100 transition-colors">
          <button
            type="button"
            aria-expanded={open}
            onClick={() => setOpen(!open)}
            className="flex-1 flex items-center gap-2 px-4 py-3 text-left"
          >
            <span className="text-sm font-semibold text-slate-800">{sectionTitle}</span>
            {sectionConditional && (
              <span className="text-xs bg-amber-100 text-amber-800 border border-amber-200 px-2 py-0.5 rounded-full font-medium">
                {sectionConditionText || "Conditional"}
              </span>
            )}
            {open
              ? <ChevronDown className="w-4 h-4 text-slate-400 shrink-0 ml-auto" />
              : <ChevronRight className="w-4 h-4 text-slate-400 shrink-0 ml-auto" />
            }
          </button>

          {/* Section actions */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0 mr-2 text-slate-400 hover:text-slate-700">
                <MoreVertical className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-32">
              <DropdownMenuItem onClick={openEdit} className="gap-2 cursor-pointer">
                <Pencil className="w-3.5 h-3.5" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => setDeleteOpen(true)}
                className="gap-2 cursor-pointer text-red-600 focus:text-red-600"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Body */}
        {open && (
          <div className="px-4 py-3 space-y-3">
            {sectionDesc && (
              <div className="flex gap-2 bg-indigo-50 border-l-4 border-indigo-400 rounded-r-lg px-3 py-2">
                <Info className="w-4 h-4 text-indigo-500 shrink-0 mt-0.5" />
                <p className="text-xs text-indigo-700">{sectionDesc}</p>
              </div>
            )}

            {sortedItems.length === 0 ? (
              <p className="text-xs text-slate-400 italic py-2">No documents listed yet.</p>
            ) : (
              <ol className="space-y-3">
                {sortedItems.map((item, index) => (
                  <ItemRow
                    key={item.id}
                    item={item}
                    index={index}
                    onDeleted={(id) => setItems((prev) => prev.filter((i) => i.id !== id))}
                    onUpdated={(updated) => setItems((prev) => prev.map((i) => i.id === updated.id ? updated : i))}
                  />
                ))}
              </ol>
            )}
          </div>
        )}
      </div>

      {/* Edit Section Dialog */}
      <Dialog open={editOpen} onOpenChange={(o) => { if (!editLoading) setEditOpen(o); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Pencil className="w-4 h-4 text-[#0063cc]" />
              Edit Section
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            {editError && <Alert variant="destructive"><AlertDescription>{editError}</AlertDescription></Alert>}

            <div className="space-y-1.5">
              <Label className="text-sm font-semibold">Title <span className="text-red-500">*</span></Label>
              <Input value={editTitle} onChange={(e) => { setEditTitle(e.target.value); setEditError(null); }} disabled={editLoading} className="focus:ring-[#0063cc] focus:border-[#0063cc]" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-semibold">Description <span className="text-xs font-normal text-slate-400">(optional)</span></Label>
              <Textarea value={editDesc} onChange={(e) => setEditDesc(e.target.value)} rows={2} disabled={editLoading} className="focus:ring-[#0063cc] focus:border-[#0063cc]" />
            </div>
            <label className="flex items-center gap-2 cursor-pointer text-sm pt-1">
              <input type="checkbox" checked={editConditional} onChange={(e) => setEditConditional(e.target.checked)} className="rounded border-slate-300 text-[#0063cc]" />
              Conditional Section
            </label>
            {editConditional && (
              <div className="space-y-1.5">
                <Label className="text-sm font-semibold">Condition Text</Label>
                <Input value={editConditionText} onChange={(e) => setEditConditionText(e.target.value)} placeholder="e.g., Only if applicant has a spouse" disabled={editLoading} className="focus:ring-[#0063cc] focus:border-[#0063cc]" />
              </div>
            )}
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setEditOpen(false)} disabled={editLoading}>Cancel</Button>
            <Button onClick={handleEditSection} disabled={editLoading} className="bg-[#0063cc] hover:bg-[#0052a3]">
              {editLoading ? "Saving…" : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Section Confirm */}
      <AlertDialog open={deleteOpen} onOpenChange={(o) => { if (!deleteLoading) setDeleteOpen(o); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Section?</AlertDialogTitle>
            <AlertDialogDescription>
              <strong>"{sectionTitle}"</strong> and all its documents will be permanently deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteLoading}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteSection} disabled={deleteLoading} className="bg-red-600 hover:bg-red-700">
              {deleteLoading ? "Deleting…" : "Yes, Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
