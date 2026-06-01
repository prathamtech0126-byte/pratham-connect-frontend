import { LucideIcon } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface PageHint {
  icon: LucideIcon;
  title: string;
  description: string;
}

interface PageHintModalProps {
  open: boolean;
  onClose: () => void;
  pageTitle: string;
  hints: PageHint[];
}

export function PageHintModal({ open, onClose, pageTitle, hints }: PageHintModalProps) {
  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="max-w-lg bg-card text-card-foreground border border-border rounded-xl shadow-lg">
        <DialogHeader className="pb-2">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-semibold tracking-widest uppercase text-primary bg-primary/10 px-2 py-0.5 rounded-full">
              Quick Guide
            </span>
          </div>
          <DialogTitle className="font-heading text-xl">{pageTitle}</DialogTitle>
          <DialogDescription className="text-muted-foreground text-sm">
            Here's a quick overview of how this page works. You'll only see this once.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-3 py-2">
          {hints.map((hint, i) => {
            const Icon = hint.icon;
            return (
              <div
                key={i}
                className={cn(
                  "flex items-start gap-3 p-3 rounded-lg border border-border bg-accent/30",
                )}
              >
                <div className="mt-0.5 flex-shrink-0 w-8 h-8 rounded-md bg-primary/10 flex items-center justify-center">
                  <Icon className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">{hint.title}</p>
                  <p className="text-xs text-muted-foreground leading-relaxed mt-0.5">{hint.description}</p>
                </div>
              </div>
            );
          })}
        </div>

        <DialogFooter className="pt-2">
          <Button onClick={onClose} className="w-full bg-primary text-primary-foreground hover:bg-primary/90">
            Got it, let's go!
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
