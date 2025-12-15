import { useState } from "react";
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
import { Checkbox } from "@/components/ui/checkbox";
import { AlertTriangle, Send } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAlert } from "@/context/alert-context";

export function BroadcastDialog({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const { toast } = useToast();
  const { triggerAlert } = useAlert();
  
  const [recipients, setRecipients] = useState({
    all: false,
    managers: true,
    counselors: true,
    directors: true,
  });

  const handleSend = () => {
    if (!message.trim()) return;

    // 1. Show toast that message is "sent"
    toast({
      title: "Emergency Alert Broadcasted",
      description: `Alert sent to ${recipients.all ? "all users" : "selected groups"} successfully.`,
      variant: "default", 
      className: "bg-green-600 text-white border-none"
    });

    setOpen(false);

    // 2. Simulate the effect locally after a short delay so the admin sees what happens
    setTimeout(() => {
      triggerAlert(message);
    }, 1500);
    
    setMessage("");
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px] border-red-200">
        <DialogHeader>
          <div className="flex items-center gap-2 text-red-600 mb-2">
            <div className="p-2 bg-red-100 rounded-full">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <DialogTitle className="text-xl">Broadcast Emergency Alert</DialogTitle>
          </div>
          <DialogDescription>
            This will trigger a full-screen red alert on all recipient screens. 
            Users will be blocked from using the system until they acknowledge the message.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-6 py-4">
          <div className="grid gap-2">
            <Label htmlFor="message" className="font-semibold">Alert Message</Label>
            <Textarea
              id="message"
              placeholder="e.g., URGENT: Server maintenance in 5 minutes. Please save your work."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="min-h-[100px] border-red-200 focus-visible:ring-red-500"
            />
          </div>

          <div className="space-y-3">
            <Label className="font-semibold">Recipients</Label>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="all" 
                  checked={recipients.all}
                  onCheckedChange={(checked) => setRecipients(prev => ({ ...prev, all: !!checked }))}
                />
                <label htmlFor="all" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
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
                <label htmlFor="managers" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
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
                <label htmlFor="counselors" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                  Counselors
                </label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="directors" 
                  checked={recipients.directors || recipients.all}
                  disabled={recipients.all}
                  onCheckedChange={(checked) => setRecipients(prev => ({ ...prev, directors: !!checked }))}
                />
                <label htmlFor="directors" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                  Directors
                </label>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button 
            onClick={handleSend}
            disabled={!message.trim()}
            className="bg-red-600 hover:bg-red-700 text-white gap-2"
          >
            <Send className="w-4 h-4" />
            Send Broadcast
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
