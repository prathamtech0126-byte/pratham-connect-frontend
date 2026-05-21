import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { CalendarClock, Image as ImageIcon, Laptop2, Loader2, Send, Smartphone, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { clientService, TechSupportTicketPayload } from "@/services/clientService";
import { RequestForm } from "./RequestForm";
import { useSocket } from "@/context/socket-context";

const deviceTypeOptions = ["laptop", "desktop", "mouse", "keyboard", "network-wifi", "printer", "scanner", "monitor", "webcam", "headset", "other"] as const;
type DeviceType = (typeof deviceTypeOptions)[number];

const priorityOptions = ["low", "medium", "high", "critical"] as const;
type PriorityLevel = (typeof priorityOptions)[number];

const deviceProblemsByType: Record<DeviceType, string[]> = {
  laptop: ["Slow performance", "Battery draining fast", "Overheating", "Keyboard not working", "Other"],
  desktop: ["System not turning on", "Frequent restart", "Very slow after startup", "No display output", "Other"],
  mouse: ["Cursor not moving", "Buttons not working", "Frequent disconnection", "Laggy movement", "Other"],
  keyboard: ["Keys not responding", "Wrong characters typing", "Keyboard disconnecting", "Backlight not working", "Other"],
  "network-wifi": ["WiFi not connecting", "Internet slow", "Frequent disconnection", "LAN cable not working", "Other"],
  printer: ["Not printing", "Paper jam", "Printer offline", "Poor print quality", "Other"],
  scanner: ["Scan not starting", "Scanner not detected", "Blurred scan quality", "Driver error", "Other"],
  monitor: ["No signal", "Screen flickering", "Lines on display", "Dim display", "Other"],
  webcam: ["Camera not detected", "Black screen", "Blurred video", "Camera app crash", "Other"],
  headset: ["No sound output", "Mic not working", "Frequent disconnection", "Noise/distortion", "Other"],
  other: ["Other"],
};

const getPriorityBadgeClass = (value: string) => {
  switch (value.toLowerCase()) {
    case "low":
      return "bg-emerald-100 text-emerald-700 border-emerald-300 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-800";
    case "medium":
      return "bg-amber-100 text-amber-700 border-amber-300 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-800";
    case "high":
      return "bg-orange-100 text-orange-700 border-orange-300 dark:bg-orange-900/30 dark:text-orange-300 dark:border-orange-800";
    case "critical":
      return "bg-red-100 text-red-700 border-red-300 dark:bg-red-900/30 dark:text-red-300 dark:border-red-800";
    default:
      return "";
  }
};

const getStatusStyle = (status: string) => {
  switch (status.toLowerCase()) {
    case "in_progress":
    case "in progress":
      return {
        badge:
          "bg-blue-100 text-blue-700 border-blue-300 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800",
        border: "border-l-4 border-l-blue-500",
      };
    case "pending":
    case "pending approval":
      return {
        badge:
          "bg-amber-100 text-amber-700 border-amber-300 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-800",
        border: "border-l-4 border-l-amber-500",
      };
    case "resolved":
      return {
        badge:
          "bg-emerald-100 text-emerald-700 border-emerald-300 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-800",
        border: "border-l-4 border-l-emerald-500",
      };
    default:
      return { badge: "", border: "" };
  }
};

export function CounsellorTechSupport() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { socket } = useSocket();
  const [activeSection, setActiveSection] = useState<"support" | "device" | "recharge">("support");
  const [deviceType, setDeviceType] = useState<DeviceType>("laptop");
  const [issueCategory, setIssueCategory] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<PriorityLevel>("medium");
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const { data: pastTickets = [], isLoading: isLoadingPastTickets } = useQuery({
    queryKey: ["tech-support-my-tickets"],
    queryFn: clientService.getMyTechSupportTickets,
    refetchInterval: 2000,
    refetchIntervalInBackground: true,
  });
  const { data: myRequests = [], isLoading: isLoadingMyRequests } = useQuery({
    queryKey: ["tech-support-my-requests"],
    queryFn: clientService.getMyTechSupportRequests,
    refetchInterval: 2000,
    refetchIntervalInBackground: true,
  });

  const { mutateAsync: createTicket, isPending: isSubmitting } = useMutation({
    mutationFn: (payload: TechSupportTicketPayload) => clientService.createTechSupportTicket(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tech-support-my-tickets"] });
    },
  });

  const { mutateAsync: approveResolution } = useMutation({
    mutationFn: ({ id, type }: { id: number; type: "ticket" | "request" }) =>
      clientService.approveTechSupportResolution(id, type),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tech-support-my-tickets"] });
      queryClient.invalidateQueries({ queryKey: ["tech-support-my-requests"] });
      toast({ title: "Resolution Approved", description: "The ticket has been resolved." });
    },
    onError: (error: any) => {
      toast({
        title: "Approval failed",
        description: error?.response?.data?.message || "Please try again.",
        variant: "destructive",
      });
    },
  });

  useEffect(() => {
    if (!socket) return;

    const handleTicketChanged = () => {
      queryClient.invalidateQueries({ queryKey: ["tech-support-my-tickets"] });
      queryClient.refetchQueries({ queryKey: ["tech-support-my-tickets"], type: "active" });
    };
    const handleRequestChanged = () => {
      queryClient.invalidateQueries({ queryKey: ["tech-support-my-requests"] });
      queryClient.refetchQueries({ queryKey: ["tech-support-my-requests"], type: "active" });
    };

    socket.on("techSupport:ticketCreated", handleTicketChanged);
    socket.on("techSupport:ticketAssigned", handleTicketChanged);
    socket.on("techSupport:ticketMoved", handleTicketChanged);
    socket.on("techSupport:requestCreated", handleRequestChanged);
    socket.on("techSupport:requestUpdated", handleRequestChanged);

    return () => {
      socket.off("techSupport:ticketCreated", handleTicketChanged);
      socket.off("techSupport:ticketAssigned", handleTicketChanged);
      socket.off("techSupport:ticketMoved", handleTicketChanged);
      socket.off("techSupport:requestCreated", handleRequestChanged);
      socket.off("techSupport:requestUpdated", handleRequestChanged);
    };
  }, [socket, queryClient]);

  const canSubmit = useMemo(() => {
    return (
      deviceType.trim().length >= 2 &&
      issueCategory.trim().length >= 2 &&
      description.trim().length >= 10 &&
      priority.trim().length >= 2
    );
  }, [deviceType, issueCategory, description, priority]);

  const getRequestCardStyle = (requestType: string) =>
    requestType === "recharge_sim_request"
      ? "border-blue-200 bg-blue-50/60 dark:border-blue-900/40 dark:bg-blue-950/20"
      : "border-violet-200 bg-violet-50/60 dark:border-violet-900/40 dark:bg-violet-950/20";

  const formatRequestNo = (requestNo?: string) => {
    if (!requestNo) return "--";
    const parts = requestNo.split("-");
    return parts.length >= 4 ? `${parts[0]}-${parts[parts.length - 1]}` : requestNo;
  };

  const rechargeRequests = useMemo(
    () => myRequests.filter((req: any) => req.requestType === "recharge_sim_request"),
    [myRequests],
  );
  const deviceRequests = useMemo(
    () => myRequests.filter((req: any) => req.requestType === "device_request"),
    [myRequests],
  );

  useEffect(() => {
    const firstIssue = deviceProblemsByType[deviceType]?.[0] ?? "";
    setIssueCategory(firstIssue);
  }, [deviceType]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!deviceType?.trim()) {
      toast({ title: "Device type is required", description: "Please select a device type", variant: "destructive" });
      return;
    }
    if (!issueCategory?.trim()) {
      toast({ title: "Issue category is required", description: "Please select an issue category", variant: "destructive" });
      return;
    }
    if (!description?.trim() || description.trim().length < 10) {
      toast({ title: "Description is too short", description: "Description must be at least 10 characters", variant: "destructive" });
      return;
    }
    if (description.length > 250) {
      toast({ title: "Description is too long", description: "Description cannot exceed 250 characters", variant: "destructive" });
      return;
    }
    if (!priority?.trim()) {
      toast({ title: "Priority is required", description: "Please select a priority level", variant: "destructive" });
      return;
    }

    try {
      const ticket = await createTicket({
        deviceType: deviceType as TechSupportTicketPayload["deviceType"],
        issueCategory,
        description,
        priority,
        attachments: [],
      });

      // Upload images if selected
      if (selectedFiles.length > 0 && ticket?.id) {
        try {
          await clientService.uploadTicketImages(ticket.id, selectedFiles);
          toast({
            title: "Ticket created successfully",
            description: `Your ticket has been logged with ${selectedFiles.length} image(s). Tech support will respond soon.`,
          });
        } catch (uploadErr: any) {
          console.error("Failed to upload images:", uploadErr);
          toast({
            title: "Ticket created but image upload failed",
            description: uploadErr?.response?.data?.message || "You can try uploading images later from your tickets.",
            variant: "destructive",
          });
        }
      } else {
        toast({
          title: "Support request submitted",
          description: "Your ticket has been logged. Tech support will respond soon.",
        });
      }

      setDeviceType("laptop");
      setIssueCategory(deviceProblemsByType.laptop[0]);
      setPriority("medium");
      setDescription("");
      setSelectedFiles([]);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    } catch (error: any) {
      toast({
        title: "Failed to submit ticket",
        description: error?.response?.data?.message || "Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <Card className="border-none shadow-card bg-card rounded-xl overflow-hidden">
        <CardHeader className="px-6 py-5 border-b border-border/40">
          <CardDescription>
            Raise your issue with full details so the tech team can resolve it faster.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-6">
          <div className="flex flex-wrap items-center gap-3 mb-5">
            <Button type="button" variant={activeSection === "support" ? "default" : "outline"} onClick={() => setActiveSection("support")}>
              IT Support
            </Button>
            <Button type="button" variant={activeSection === "device" ? "default" : "outline"} onClick={() => setActiveSection("device")}>
              Raise Device Ticket
            </Button>
            <Button type="button" variant={activeSection === "recharge" ? "default" : "outline"} onClick={() => setActiveSection("recharge")}>
              Recharge SIM Ticket
            </Button>
          </div>
          {activeSection === "support" ? (
          <form className="space-y-5" onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl">
              <div className="space-y-2">
                <Label htmlFor="device-type">Device Type *</Label>
                <Select value={deviceType} onValueChange={(value: DeviceType) => setDeviceType(value)}>
                  <SelectTrigger id="device-type"><SelectValue placeholder="Select device type" /></SelectTrigger>
                  <SelectContent>
                    {deviceTypeOptions.map((d) => (
                      <SelectItem key={d} value={d}>{d.replace("-", " ").replace(/\b\w/g, (c) => c.toUpperCase())}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="issue-category">Issue Category *</Label>
                <Select value={issueCategory} onValueChange={setIssueCategory}>
                  <SelectTrigger id="issue-category"><SelectValue placeholder="Select issue category" /></SelectTrigger>
                  <SelectContent>
                    {deviceProblemsByType[deviceType].map((detail) => (
                      <SelectItem key={detail} value={detail}>{detail}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="issue-description">Description *</Label>
                <span className={`text-xs ${description.length > 250 ? 'text-red-500 font-medium' : 'text-gray-500'}`}>
                  {description.length}/250
                </span>
              </div>
              <Textarea
                id="issue-description"
                placeholder="Describe the problem in 4-5 lines maximum"
                className={`min-h-[120px] resize-none ${description.length > 250 ? 'border-red-500' : ''}`}
                value={description}
                maxLength={250}
                onChange={(e) => {
                  const value = e.target.value;
                  if (value.length > 250) {
                    toast({ title: "Description cannot exceed 250 characters", variant: "destructive" });
                    return;
                  }
                  setDescription(value);
                }}
              />
              <p className="text-xs text-gray-400">Maximum 250 characters (about 4-5 lines)</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl">
              <div className="space-y-2">
                <Label htmlFor="attachment">Upload Images (optional, up to 2 images, max 5MB each)</Label>
                <Input
                  ref={fileInputRef}
                  id="attachment"
                  type="file"
                  accept="image/*"
                  multiple
                  disabled={selectedFiles.length >= 2}
                  onChange={(e) => {
                    const files = Array.from(e.target.files || []);
                    const maxSelection = 2 - selectedFiles.length;

                    if (files.length === 0) {
                      if (fileInputRef.current) fileInputRef.current.value = "";
                      return;
                    }

                    // Validate file types and sizes
                    const maxSizeMB = 5;
                    const maxSizeBytes = maxSizeMB * 1024 * 1024;
                    const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
                    const invalidTypeFiles: string[] = [];
                    const oversizedFiles: string[] = [];
                    const validFiles: File[] = [];

                    files.forEach((file) => {
                      if (!allowedTypes.includes(file.type)) {
                        invalidTypeFiles.push(`${file.name} (${file.type || "unknown"})`);
                      } else if (file.size > maxSizeBytes) {
                        oversizedFiles.push(`${file.name} (${(file.size / 1024 / 1024).toFixed(2)}MB)`);
                      } else {
                        validFiles.push(file);
                      }
                    });

                    if (invalidTypeFiles.length > 0) {
                      toast({
                        title: "Invalid file type",
                        description: `The following files are not valid images:\n${invalidTypeFiles.join('\n')}\n\nOnly JPEG, PNG, WebP, and GIF are allowed.`,
                        variant: "destructive",
                      });
                      if (fileInputRef.current) fileInputRef.current.value = "";
                      return;
                    }

                    if (oversizedFiles.length > 0) {
                      toast({
                        title: "File size exceeded",
                        description: `The following files are larger than ${maxSizeMB}MB:\n${oversizedFiles.join('\n')}\n\nPlease compress your images and try again.`,
                        variant: "destructive",
                      });
                      if (fileInputRef.current) fileInputRef.current.value = "";
                      return;
                    }

                    if (selectedFiles.length >= 2) {
                      toast({
                        title: "Maximum 2 images allowed",
                        description: "You already have 2 images selected.",
                        variant: "destructive",
                      });
                      if (fileInputRef.current) fileInputRef.current.value = "";
                      return;
                    }

                    const acceptedFiles = validFiles.slice(0, maxSelection);
                    const rejectedCount = validFiles.length - acceptedFiles.length;

                    if (acceptedFiles.length > 0) {
                      setSelectedFiles((prev) => [...prev, ...acceptedFiles]);
                      toast({
                        title: "Images added",
                        description: `${acceptedFiles.length} image(s) ready to upload. ${rejectedCount > 0 ? `Only ${maxSelection} file(s) allowed from this selection.` : ""}`,
                      });
                    }

                    if (rejectedCount > 0) {
                      toast({
                        title: "Maximum 2 images allowed",
                        description: `Only ${maxSelection} additional image(s) can be selected.`,
                        variant: "destructive",
                      });
                    }

                    if (fileInputRef.current) fileInputRef.current.value = "";
                  }}
                />
                {selectedFiles.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {selectedFiles.map((file, idx) => (
                      <Badge key={idx} variant="secondary" className="text-xs">
                        {file.name}
                        <button
                          type="button"
                          className="ml-1 text-muted-foreground hover:text-foreground"
                          onClick={() => setSelectedFiles((prev) => prev.filter((_, i) => i !== idx))}
                        >
                          ×
                        </button>
                      </Badge>
                    ))}
                  </div>
                )}
              </div>

              <div className="space-y-2">
              <Label htmlFor="priority">Priority *</Label>
              <Select value={priority} onValueChange={(value: PriorityLevel) => setPriority(value)}>
                <SelectTrigger id="priority">
                  <SelectValue placeholder="Select priority" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="critical">Critical</SelectItem>
                </SelectContent>
              </Select>
              </div>
            </div>

            <Button type="submit" disabled={isSubmitting} className="gap-2">
              {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              {isSubmitting ? "Submitting..." : "Raise Ticket"}
            </Button>
          </form>
          ) : (
            <RequestForm activeTab={activeSection === "recharge" ? "recharge" : "device"} onSubmitted={() => setActiveSection("support")} />
          )}
        </CardContent>
      </Card>

      <Card className="border-none shadow-card bg-card rounded-xl overflow-hidden">
        <CardHeader className="px-6 py-5 border-b border-border/40">
          <CardTitle className="text-base font-semibold text-foreground flex items-center gap-2">
            <CalendarClock className="w-4 h-4 text-primary" />
            Past Tickets Tracking
          </CardTitle>
          <CardDescription>Track your previous tickets with current status and details.</CardDescription>
        </CardHeader>
        <CardContent className="p-6 space-y-4">
          {isLoadingPastTickets && (
            <div className="flex items-center justify-center py-6">
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            </div>
          )}
          {!isLoadingPastTickets && pastTickets.length === 0 && (
            <p className="text-sm text-muted-foreground">No tickets found yet.</p>
          )}
          {pastTickets.map((ticket: any) => (
            <div
              key={ticket.id ?? ticket.ticketNo}
              className={cn(
                "rounded-lg border border-border p-4 space-y-3 flex flex-col overflow-hidden",
                getStatusStyle(ticket.status).border,
              )}
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground break-words line-clamp-2">{ticket.title}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {ticket.ticketNo ?? `#${ticket.id}`} • {new Date(ticket.createdAt).toLocaleString()}
                  </p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {/* Image indicator */}
                  {(() => {
                    const attachments = (ticket.attachments as any[]) || [];
                    const imageCount = attachments.filter((a) => a.url && a.mimeType?.startsWith("image/")).length;
                    if (imageCount === 0) return null;
                    return (
                      <div className="flex items-center gap-1 text-blue-500" title={`${imageCount} photo(s) attached`}>
                        <ImageIcon className="w-3.5 h-3.5" />
                        <span className="text-[10px] font-medium">{imageCount}</span>
                      </div>
                    );
                  })()}
                  <Badge variant="outline" className={getPriorityBadgeClass(ticket.priority)}>
                    {ticket.priority}
                  </Badge>
                  <Badge variant="outline" className={getStatusStyle(ticket.status).badge}>
                    {String(ticket.status).replace("_", " ")}
                  </Badge>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm space-y-2 md:space-y-0 w-full min-w-0">
                <p className="break-words overflow-hidden min-w-0"><span className="font-medium text-foreground">Device:</span> <span className="text-muted-foreground">{ticket.deviceType}</span></p>
                <p className="break-words overflow-hidden min-w-0"><span className="font-medium text-foreground">Issue:</span> <span className="text-muted-foreground">{ticket.commonIssue ?? "-"}</span></p>
                <div className="md:col-span-2 w-full min-w-0 overflow-hidden pb-2">
                  <span className="font-medium text-foreground">Description:</span>
                  <p className="text-muted-foreground break-all mt-1 bg-muted/30 p-3 rounded border border-muted/50 w-full min-w-0 whitespace-normal">{ticket.description}</p>
                </div>
              </div>

              {/* Show attached images */}
              {(() => {
                const attachments = (ticket.attachments as any[]) || [];
                const images = attachments.filter((a) => a.url && a.mimeType?.startsWith("image/"));
                if (images.length === 0) return null;
                return (
                  <div className="pt-2">
                    <p className="text-xs text-muted-foreground mb-1">Attached Photos ({images.length}/2):</p>
                    <div className="flex flex-wrap gap-2">
                      {images.map((img, idx) => (
                        <Button
                          key={idx}
                          variant="outline"
                          size="sm"
                          onClick={() => window.open(img.url, "_blank")}
                          className="text-xs gap-1"
                        >
                          Check img {idx + 1}
                        </Button>
                      ))}
                    </div>
                  </div>
                );
              })()}

              {ticket.status === "waiting_for_approval" && (
                <div className="pt-3 border-t mt-3 flex items-center justify-between">
                  <p className="text-xs text-amber-600 font-medium">Please review and confirm resolution.</p>
                  <Button size="sm" className="h-8" onClick={() => approveResolution({ id: ticket.id, type: "ticket" })}>
                    Approve Resolve
                  </Button>
                </div>
              )}
            </div>
          ))}
        </CardContent>
      </Card>

      <Card className="border-none shadow-card bg-card rounded-xl overflow-hidden">
        <CardHeader className="px-6 py-5 border-b border-border/40">
          <CardTitle className="text-base font-semibold text-foreground">My Requests</CardTitle>
          <CardDescription>Left: Recharge/SIM requests, Right: Device requests.</CardDescription>
        </CardHeader>
        <CardContent className="p-6">
          {isLoadingMyRequests && (
            <div className="flex items-center justify-center py-6">
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            </div>
          )}
          {!isLoadingMyRequests && myRequests.length === 0 && (
            <p className="text-sm text-muted-foreground">No requests found.</p>
          )}
          {!isLoadingMyRequests && myRequests.length > 0 && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="space-y-3">
                <div className="flex items-center gap-2 px-1">
                  <Smartphone className="h-4 w-4 text-blue-600 dark:text-blue-300" />
                  <p className="text-sm font-semibold text-foreground">Recharge / SIM</p>
                </div>
                {rechargeRequests.length === 0 && (
                  <p className="text-xs text-muted-foreground px-1">No recharge requests.</p>
                )}
                {rechargeRequests.map((req: any) => (
                  <div key={req.id} className={cn("rounded-lg border p-4 space-y-2", getRequestCardStyle(req.requestType))}>
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-semibold">{formatRequestNo(req.requestNo)}</p>
                      <Badge variant="outline">{String(req.status).replace("_", " ")}</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">{req.reason || "No additional note provided."}</p>
                    {req.status === "waiting_for_approval" && (
                      <div className="pt-2 flex justify-between items-center border-t mt-2 gap-2">
                        <p className="text-xs text-amber-600 font-medium">Review resolution</p>
                        <Button size="sm" className="h-8 w-full sm:w-auto" onClick={() => approveResolution({ id: req.id, type: "request" })}>
                          Approve
                        </Button>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              <div className="space-y-3">
                <div className="flex items-center gap-2 px-1">
                  <Laptop2 className="h-4 w-4 text-violet-600 dark:text-violet-300" />
                  <p className="text-sm font-semibold text-foreground">Device Requests</p>
                </div>
                {deviceRequests.length === 0 && (
                  <p className="text-xs text-muted-foreground px-1">No device requests.</p>
                )}
                {deviceRequests.map((req: any) => (
                  <div key={req.id} className={cn("rounded-lg border p-4 space-y-2", getRequestCardStyle(req.requestType))}>
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-semibold">{formatRequestNo(req.requestNo)}</p>
                      <Badge variant="outline">{String(req.status).replace("_", " ")}</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">{req.reason || "No additional note provided."}</p>
                    {req.status === "waiting_for_approval" && (
                      <div className="pt-2 flex justify-between items-center border-t mt-2 gap-2">
                        <p className="text-xs text-amber-600 font-medium">Review resolution</p>
                        <Button size="sm" className="h-8 w-full sm:w-auto" onClick={() => approveResolution({ id: req.id, type: "request" })}>
                          Approve
                        </Button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

    </div>
  );
}
