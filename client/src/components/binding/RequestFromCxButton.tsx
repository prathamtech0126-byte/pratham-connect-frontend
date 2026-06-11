import { useState } from "react";
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
import { MessageSquarePlus } from "lucide-react";
import { useAuth } from "@/context/auth-context";
import { useToast } from "@/hooks/use-toast";
import { addDocRequest } from "@/stores/cxDocRequestStore";

/**
 * Lets a Binding Team member raise a "document required" request to the CX Team.
 * Drop it anywhere in the binding flow — pass the client, and optionally pre-fill
 * the document name (e.g. from a checklist row).
 */
export function RequestFromCxButton({
  clientId,
  clientName,
  document: presetDoc = "",
  size = "sm",
  variant = "outline",
  label = "Request from CX",
  className,
}: {
  clientId: string;
  clientName: string;
  document?: string;
  size?: "sm" | "default" | "icon";
  variant?: "outline" | "default" | "ghost" | "secondary";
  label?: string;
  className?: string;
}) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [doc, setDoc] = useState(presetDoc);
  const [note, setNote] = useState("");

  const submit = () => {
    if (!doc.trim()) return;
    addDocRequest({
      clientId,
      clientName,
      document: doc.trim(),
      note: note.trim(),
      requestedBy: (user as any)?.fullname || (user as any)?.name || "Binding Team",
    });
    toast({
      title: "Request sent to CX",
      description: `CX team has been asked for "${doc.trim()}" on ${clientName}'s file.`,
    });
    setOpen(false);
    setDoc(presetDoc);
    setNote("");
  };

  return (
    <>
      <Button
        type="button"
        size={size}
        variant={variant}
        className={className}
        onClick={(e) => { e.stopPropagation(); setDoc(presetDoc); setOpen(true); }}
      >
        <MessageSquarePlus className="mr-1.5 h-3.5 w-3.5" />
        {label}
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md" onClick={(e) => e.stopPropagation()}>
          <DialogHeader>
            <DialogTitle>Request document from CX</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground">Client</Label>
              <p className="text-sm font-semibold text-foreground">{clientName}</p>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground">Document needed</Label>
              <Input
                value={doc}
                onChange={(e) => setDoc(e.target.value)}
                placeholder="e.g. Updated bank statement"
                className="h-9"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground">Note for CX (optional)</Label>
              <Textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="What's wrong / what's needed and why…"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={submit} disabled={!doc.trim()}>Send to CX</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
