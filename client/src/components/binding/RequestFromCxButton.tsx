import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
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
import { useToast } from "@/hooks/use-toast";
import { postDocumentRequest } from "@/api/visaCases.api";

export function RequestFromCxButton({
  clientId,
  legacyClientId,
  visaCaseId,
  clientName,
  cxUserName,
  document: presetDoc = "",
  size = "sm",
  variant = "outline",
  label = "Request from CX",
  className,
}: {
  clientId: string;
  legacyClientId?: number;
  visaCaseId?: string;
  clientName: string;
  cxUserName?: string;
  document?: string;
  size?: "sm" | "default" | "icon";
  variant?: "outline" | "default" | "ghost" | "secondary";
  label?: string;
  className?: string;
}) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [doc, setDoc] = useState(presetDoc);
  const [note, setNote] = useState("");

  const mutation = useMutation({
    mutationFn: () =>
      postDocumentRequest(visaCaseId!, {
        clientId,
        legacyClientId: legacyClientId,
        documentType: doc.trim(),
        notes: note.trim() || undefined,
      }),
    onSuccess: () => {
      toast({
        title: "Request sent to CX",
        description: `CX team has been notified to provide "${doc.trim()}" for ${clientName}.`,
      });
      setOpen(false);
      setDoc(presetDoc);
      setNote("");
    },
    onError: (err: any) => {
      toast({
        title: "Failed to send request",
        description: err?.response?.data?.message ?? "Something went wrong. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = () => {
    if (!doc.trim() || !visaCaseId) return;
    mutation.mutate();
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
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-muted-foreground">Client</Label>
                <p className="text-sm font-semibold text-foreground">{clientName}</p>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-muted-foreground">CX In-Charge</Label>
                <p className="text-sm font-semibold text-foreground">
                  {cxUserName ?? <span className="font-normal text-muted-foreground">CX Team</span>}
                </p>
              </div>
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
            <Button variant="outline" onClick={() => setOpen(false)} disabled={mutation.isPending}>
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={!doc.trim() || !visaCaseId || mutation.isPending}
            >
              {mutation.isPending ? "Sending…" : "Send to CX"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
