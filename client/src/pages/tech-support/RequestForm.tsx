import { useEffect, useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { clientService } from "@/services/clientService";
import { useToast } from "@/hooks/use-toast";

interface RequestFormProps {
  onSubmitted?: () => void;
  activeTab?: "device" | "recharge";
}

export function RequestForm({ onSubmitted, activeTab }: RequestFormProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [deviceType, setDeviceType] = useState("laptop");
  const [deviceRequestType, setDeviceRequestType] = useState("new");
  const [deviceReason, setDeviceReason] = useState("");
  const [devicePriority, setDevicePriority] = useState("medium");
  const [deviceAttachment, setDeviceAttachment] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [phoneNumber, setPhoneNumber] = useState("");
  const [rechargeRequestType, setRechargeRequestType] = useState("recharge");
  const [currentRechargeExpiryDate, setCurrentRechargeExpiryDate] = useState("");
  const [amountOrPlan, setAmountOrPlan] = useState("");
  const [rechargePriority, setRechargePriority] = useState("medium");
  const [selectedTab, setSelectedTab] = useState<"device" | "recharge">(activeTab ?? "device");

  const { mutateAsync: createRequest, isPending } = useMutation({
    mutationFn: clientService.createTechSupportRequest,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tech-support-my-requests"] });
      queryClient.invalidateQueries({ queryKey: ["tech-support-all-requests"] });
    },
  });

  const submitDeviceRequest = async () => {
    if (isPending) return;
    if (!deviceType.trim()) {
      toast({ title: "Device type is required", variant: "destructive" });
      return;
    }
    if (!deviceReason.trim() || deviceReason.trim().length < 5) {
      toast({ title: "Reason must be at least 5 characters", variant: "destructive" });
      return;
    }
    try {
      await createRequest({
        requestType: "device_request",
        deviceType: deviceType as any,
        deviceRequestType: deviceRequestType as any,
        reason: deviceReason.trim(),
        priority: devicePriority as any,
        attachments: deviceAttachment ? [{ name: deviceAttachment.name, mimeType: deviceAttachment.type }] : [],
      });
      toast({ title: "Device request submitted successfully" });
      setDeviceReason("");
      setDeviceAttachment(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
      onSubmitted?.();
    } catch (error: any) {
      toast({
        title: "Failed to submit device request",
        description: error?.response?.data?.message || "Please try again.",
        variant: "destructive",
      });
    }
  };

  const submitRechargeRequest = async () => {
    if (isPending) return;
    if (!phoneNumber.trim() || !currentRechargeExpiryDate.trim()) {
      toast({ title: "Fill all required fields", variant: "destructive" });
      return;
    }
    try {
      await createRequest({
        requestType: "recharge_sim_request",
        phoneNumber: phoneNumber.trim(),
        rechargeRequestType: rechargeRequestType as any,
        currentRechargeExpiryDate,
        amountOrPlan: amountOrPlan.trim() || undefined,
        priority: rechargePriority as any,
        attachments: [],
      });
      toast({ title: "Recharge / SIM request submitted successfully" });
      setPhoneNumber("");
      setCurrentRechargeExpiryDate("");
      setAmountOrPlan("");
      onSubmitted?.();
    } catch (error: any) {
      toast({
        title: "Failed to submit recharge request",
        description: error?.response?.data?.message || "Please try again.",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    if (activeTab) {
      setSelectedTab(activeTab);
    }
  }, [activeTab]);

  return (
    <div className="w-full">
      {selectedTab === "device" ? (
        <div className="space-y-4 pt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
            <Label>Device Type</Label>
            <Select value={deviceType} onValueChange={setDeviceType}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="laptop">Laptop</SelectItem>
                <SelectItem value="mouse">Mouse</SelectItem>
                <SelectItem value="keyboard">Keyboard</SelectItem>
                <SelectItem value="monitor">Monitor</SelectItem>
                <SelectItem value="desktop">Desktop</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Request Type</Label>
            <Select value={deviceRequestType} onValueChange={setDeviceRequestType}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="new">New</SelectItem>
                <SelectItem value="replacement">Replacement</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="space-y-2">
          <Label>Reason</Label>
          <Textarea value={deviceReason} onChange={(e) => setDeviceReason(e.target.value)} />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Priority</Label>
            <Select value={devicePriority} onValueChange={setDevicePriority}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="low">Low</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="high">High</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Upload (optional)</Label>
            <Input
              ref={fileInputRef}
              type="file"
              accept="image/*,video/*"
              disabled={isPending}
              onChange={(e) => setDeviceAttachment(e.target.files?.[0] || null)}
            />
            {deviceAttachment && (
              <div className={`flex items-center justify-between gap-2 rounded-md border px-3 py-2 text-sm ${isPending ? "border-slate-200 bg-slate-100 text-slate-400" : "border-slate-200 bg-slate-50 text-slate-700"}`}>
                <span className="truncate">{deviceAttachment.name}</span>
                <button
                  type="button"
                  disabled={isPending}
                  className={`text-sm ${isPending ? "text-slate-400" : "text-red-600 hover:text-red-800"}`}
                  onClick={() => {
                    setDeviceAttachment(null);
                    if (fileInputRef.current) {
                      fileInputRef.current.value = "";
                    }
                  }}
                >
                  Remove
                </button>
              </div>
            )}
          </div>
        </div>
        <Button onClick={submitDeviceRequest} disabled={isPending}>
          {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Raise Ticket"}
        </Button>
      </div>
      ) : (
        <div className="space-y-4 pt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
            <Label>Phone Number</Label>
            <Input value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Request Type</Label>
            <Select value={rechargeRequestType} onValueChange={setRechargeRequestType}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="recharge">Recharge</SelectItem>
                <SelectItem value="new_sim">New SIM</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="space-y-2">
          <Label>Current Recharge Expiry Date</Label>
          <Input type="date" value={currentRechargeExpiryDate} onChange={(e) => setCurrentRechargeExpiryDate(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label>Amount / Plan (optional)</Label>
          <Input value={amountOrPlan} onChange={(e) => setAmountOrPlan(e.target.value)} />
        </div>
        <div className="space-y-2 max-w-xs">
          <Label>Priority</Label>
          <Select value={rechargePriority} onValueChange={setRechargePriority}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="low">Low</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="high">High</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button onClick={submitRechargeRequest} disabled={isPending}>
          {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Raise Ticket"}
        </Button>
      </div>
      )}
    </div>
  );
}

