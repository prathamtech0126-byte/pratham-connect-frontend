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
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { AlertTriangle, Send, Megaphone, PartyPopper } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAlert, AlertType } from "@/context/alert-context";

export function BroadcastDialog({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [title, setTitle] = useState("Important Announcement");
  const [type, setType] = useState<AlertType>("announcement");
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

    // Determine target roles
    const targetRoles: string[] = [];
    if (recipients.all) {
      targetRoles.push('all');
    } else {
      if (recipients.managers) targetRoles.push('manager');
      if (recipients.counselors) targetRoles.push('counsellor');
      if (recipients.directors) targetRoles.push('director');
    }

    // 1. Show toast that message is "sent"
    toast({
      title: "Broadcast Sent Successfully",
      description: `Message sent to ${recipients.all ? "all users" : "selected groups"}.`,
      variant: "default", 
      className: "bg-green-600 text-white border-none"
    });

    setOpen(false);

    // 2. Simulate the effect locally after a short delay so the admin sees what happens
    // NOTE: Admin/Director won't see the freeze themselves due to updated logic in EmergencyAlert
    setTimeout(() => {
      triggerAlert(message, targetRoles, title, type);
    }, 1500);
    
    setMessage("");
    setTitle("Important Announcement");
  };

  const getTypeStyles = (t: AlertType) => {
    switch(t) {
      case 'emergency': return "bg-red-100 text-red-600 border-red-200";
      case 'good_news': return "bg-green-100 text-green-600 border-green-200";
      default: return "bg-blue-100 text-blue-600 border-blue-200";
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <div className="flex items-center gap-2 mb-2">
            <div className={`p-2 rounded-full ${getTypeStyles(type)}`}>
              {type === 'emergency' && <AlertTriangle className="w-5 h-5" />}
              {type === 'announcement' && <Megaphone className="w-5 h-5" />}
              {type === 'good_news' && <PartyPopper className="w-5 h-5" />}
            </div>
            <DialogTitle className="text-xl">Send Broadcast</DialogTitle>
          </div>
          <DialogDescription>
            Send a full-screen alert to users. They will be required to acknowledge it to continue working.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-6 py-4">
          
          <div className="space-y-3">
            <Label className="font-semibold">Alert Type</Label>
            <RadioGroup 
              defaultValue="announcement" 
              value={type} 
              onValueChange={(v) => {
                setType(v as AlertType);
                // Update default title based on type if user hasn't typed a custom one or it matches a default
                if (title === "Emergency Alert" || title === "Important Announcement" || title === "Good News!") {
                  if (v === 'emergency') setTitle("Emergency Alert");
                  else if (v === 'good_news') setTitle("Good News!");
                  else setTitle("Important Announcement");
                }
              }}
              className="grid grid-cols-3 gap-4"
            >
              <div>
                <RadioGroupItem value="announcement" id="type-announcement" className="peer sr-only" />
                <Label
                  htmlFor="type-announcement"
                  className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-blue-500 peer-data-[state=checked]:bg-blue-50 peer-data-[state=checked]:text-blue-700 cursor-pointer"
                >
                  <Megaphone className="mb-2 h-6 w-6" />
                  Announcement
                </Label>
              </div>
              <div>
                <RadioGroupItem value="good_news" id="type-good_news" className="peer sr-only" />
                <Label
                  htmlFor="type-good_news"
                  className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-green-500 peer-data-[state=checked]:bg-green-50 peer-data-[state=checked]:text-green-700 cursor-pointer"
                >
                  <PartyPopper className="mb-2 h-6 w-6" />
                  Good News
                </Label>
              </div>
              <div>
                <RadioGroupItem value="emergency" id="type-emergency" className="peer sr-only" />
                <Label
                  htmlFor="type-emergency"
                  className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-red-500 peer-data-[state=checked]:bg-red-50 peer-data-[state=checked]:text-red-700 cursor-pointer"
                >
                  <AlertTriangle className="mb-2 h-6 w-6" />
                  Emergency
                </Label>
              </div>
            </RadioGroup>
          </div>

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
            <Label htmlFor="message" className="font-semibold">Message Content</Label>
            <Textarea
              id="message"
              placeholder="Enter your message here..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="min-h-[100px]"
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
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="directors" 
                  checked={recipients.directors || recipients.all}
                  disabled={recipients.all}
                  onCheckedChange={(checked) => setRecipients(prev => ({ ...prev, directors: !!checked }))}
                />
                <label htmlFor="directors" className="text-sm font-medium leading-none cursor-pointer">
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
            className="bg-primary text-primary-foreground gap-2"
          >
            <Send className="w-4 h-4" />
            Send Broadcast
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
