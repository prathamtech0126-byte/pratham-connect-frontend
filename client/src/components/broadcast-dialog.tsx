import { useState, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { AlertTriangle, Send, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { clientService } from "@/services/clientService";
import { useQueryClient } from "@tanstack/react-query";
import { MessagePriority } from "@/types/message.types";

export function BroadcastDialog({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [title, setTitle] = useState("Important Announcement");
  const [priority, setPriority] = useState<MessagePriority>("normal");
  const [isSending, setIsSending] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [recipients, setRecipients] = useState({
    all: false,
    managers: true,
    counselors: true,
    directors: false, // Directors typically don't receive broadcast messages
  });

  // Determine target roles (only manager and counsellor for new message system)
  const targetRoles = useMemo(() => {
    const roles: string[] = [];
    if (recipients.all) {
      roles.push('manager', 'counsellor');
    } else {
      if (recipients.managers) roles.push('manager');
      if (recipients.counselors) roles.push('counsellor');
    }
    return roles;
  }, [recipients]);

  const handleSend = async () => {
    if (!message.trim() || message.trim().length < 5) {
      // Error is shown below the textarea, no toast needed
      return;
    }

    if (targetRoles.length === 0) {
      toast({
        title: "No recipients selected",
        description: "Please select at least one recipient role (Manager or Counsellor).",
        variant: "destructive",
      });
      return;
    }

    setIsSending(true);
    try {
      await clientService.createBroadcastMessage({
        title: title || undefined,
        message: message,
        targetRoles: targetRoles,
        priority: priority,
      });

      toast({
        title: "Broadcast Sent Successfully",
        description: `Message sent to ${targetRoles.length} role(s) via WebSocket.`,
        variant: "default",
      });

      setOpen(false);
      setMessage("");
      setTitle("Important Announcement");
      setPriority("normal");

      // Refresh messages list
      queryClient.invalidateQueries({ queryKey: ["messages"] });
      queryClient.invalidateQueries({ queryKey: ["messageHistory"] });
    } catch (error: any) {
      toast({
        title: "Failed to send broadcast",
        description: error.response?.data?.message || error.message || "An error occurred",
        variant: "destructive",
      });
    } finally {
      setIsSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px] max-w-[95vw] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl">Send Broadcast</DialogTitle>
          <DialogDescription>
            Send a full-screen alert to users. They will be required to acknowledge it to continue working.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-6 py-4 px-1">
          <div className="grid gap-2">
            <Label htmlFor="title" className="font-semibold">Subject / Title</Label>
            <Input
              id="title"
              placeholder="Enter title..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="font-medium"
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="message" className="font-semibold">Message Content *</Label>
            <Textarea
              id="message"
              placeholder="Enter your message here (minimum 5 characters)..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className={`min-h-[120px] resize-none ${
                message.trim().length > 0 && message.trim().length < 5
                  ? "border-destructive focus-visible:ring-destructive"
                  : ""
              }`}
              minLength={5}
            />
            {message.trim().length > 0 && message.trim().length < 5 && (
              <p className="text-sm text-destructive font-medium flex items-center gap-1">
                <AlertTriangle className="w-4 h-4" />
                Message must be at least 5 characters ({message.trim().length}/5)
              </p>
            )}
            {message.trim().length >= 5 && (
              <p className="text-xs text-muted-foreground">
                {message.trim().length} characters
              </p>
            )}
          </div>

          <div className="grid gap-2">
            <Label htmlFor="priority" className="font-semibold">Priority</Label>
            <select
              id="priority"
              value={priority}
              onChange={(e) => setPriority(e.target.value as MessagePriority)}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <option value="low">Low</option>
              <option value="normal">Normal</option>
              <option value="high">High</option>
              <option value="urgent">Urgent</option>
            </select>
          </div>

          <div className="space-y-3">
            <Label className="font-semibold text-base">Recipients</Label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 bg-muted/30 rounded-lg border border-border">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="all"
                  checked={recipients.all}
                  onCheckedChange={(checked) => setRecipients(prev => ({ ...prev, all: !!checked }))}
                />
                <label htmlFor="all" className="text-sm font-medium leading-none cursor-pointer">
                  All Users
                </label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="managers"
                  checked={recipients.managers || recipients.all}
                  disabled={recipients.all}
                  onCheckedChange={(checked) => setRecipients(prev => ({ ...prev, managers: !!checked }))}
                />
                <label htmlFor="managers" className="text-sm font-medium leading-none cursor-pointer">
                  Managers
                </label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="counselors"
                  checked={recipients.counselors || recipients.all}
                  disabled={recipients.all}
                  onCheckedChange={(checked) => setRecipients(prev => ({ ...prev, counselors: !!checked }))}
                />
                <label htmlFor="counselors" className="text-sm font-medium leading-none cursor-pointer">
                  Counselors
                </label>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={isSending}>Cancel</Button>
          <Button
            onClick={handleSend}
            disabled={!message.trim() || message.trim().length < 5 || isSending || targetRoles.length === 0}
            className="bg-primary text-primary-foreground gap-2"
            title={!message.trim() ? "Please enter a message" : message.trim().length < 5 ? `Message must be at least 5 characters (${message.trim().length}/5)` : targetRoles.length === 0 ? "Please select at least one recipient" : ""}
          >
            {isSending ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" /> Sending...
              </>
            ) : (
              <>
                <Send className="w-4 h-4" /> Send Broadcast
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
