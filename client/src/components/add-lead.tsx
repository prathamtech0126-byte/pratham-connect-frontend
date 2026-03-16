import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { LEAD_SOURCES, LEAD_VISA_CATEGORIES } from "@/data/dummyLeads";
import type { DummyLead, LeadStatus, LeadStage } from "@/data/dummyLeads";

interface AddLeadProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onLeadAdded: (lead: DummyLead) => void;
}

interface FormState {
  name: string;
  email: string;
  phone: string;
  source: string;
  visaCategory: string;
  status: LeadStatus;
  stage: LeadStage;
  notes: string;
}

const INITIAL_FORM: FormState = {
  name: "",
  email: "",
  phone: "",
  source: "",
  visaCategory: "",
  status: "new",
  stage: "New",
  notes: "",
};

export function AddLead({ open, onOpenChange, onLeadAdded }: AddLeadProps) {
  const [form, setForm] = useState<FormState>(INITIAL_FORM);
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const set = (field: keyof FormState) => (value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors((prev) => { const copy = { ...prev }; delete copy[field]; return copy; });
  };

  const validate = (): boolean => {
    const next: Partial<Record<keyof FormState, string>> = {};
    if (!form.name.trim()) next.name = "Full name is required";
    if (!form.email.trim()) {
      next.email = "Email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
      next.email = "Enter a valid email address";
    }
    if (!form.phone.trim()) next.phone = "Phone number is required";
    if (!form.source) next.source = "Lead source is required";
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setIsSubmitting(true);

    const newLead: DummyLead = {
      id: `lead_${Date.now()}`,
      name: form.name.trim(),
      email: form.email.trim().toLowerCase(),
      phone: form.phone.trim(),
      source: form.source,
      visaCategory: form.visaCategory || undefined,
      status: form.status,
      stage: form.stage,
      assignedToId: null,
      assignedToName: null,
      lastFollowupAt: null,
      createdAt: new Date().toISOString(),
    };

    // Simulate a short async operation (replace with real API call)
    await new Promise((r) => setTimeout(r, 300));

    onLeadAdded(newLead);
    setForm(INITIAL_FORM);
    setErrors({});
    setIsSubmitting(false);
    onOpenChange(false);
  };

  const handleClose = () => {
    if (isSubmitting) return;
    setForm(INITIAL_FORM);
    setErrors({});
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add New Lead</DialogTitle>
          <DialogDescription>
            Enter the client details to create a new lead.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-2">
          {/* Full Name */}
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="lead-name" className={errors.name ? "text-destructive" : ""}>
              Full Name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="lead-name"
              placeholder="e.g. Aarav Sharma"
              value={form.name}
              onChange={(e) => set("name")(e.target.value)}
              className={errors.name ? "border-destructive" : ""}
            />
            {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
          </div>

          {/* Email */}
          <div className="space-y-1.5">
            <Label htmlFor="lead-email" className={errors.email ? "text-destructive" : ""}>
              Email <span className="text-destructive">*</span>
            </Label>
            <Input
              id="lead-email"
              type="email"
              placeholder="name@example.com"
              value={form.email}
              onChange={(e) => set("email")(e.target.value)}
              className={errors.email ? "border-destructive" : ""}
            />
            {errors.email && <p className="text-xs text-destructive">{errors.email}</p>}
          </div>

          {/* Phone */}
          <div className="space-y-1.5">
            <Label htmlFor="lead-phone" className={errors.phone ? "text-destructive" : ""}>
              Phone <span className="text-destructive">*</span>
            </Label>
            <Input
              id="lead-phone"
              placeholder="+91 98765 43210"
              value={form.phone}
              onChange={(e) => set("phone")(e.target.value)}
              className={errors.phone ? "border-destructive" : ""}
            />
            {errors.phone && <p className="text-xs text-destructive">{errors.phone}</p>}
          </div>

          {/* Lead Source */}
          <div className="space-y-1.5">
            <Label className={errors.source ? "text-destructive" : ""}>
              Lead Source <span className="text-destructive">*</span>
            </Label>
            <Select value={form.source} onValueChange={set("source")}>
              <SelectTrigger className={errors.source ? "border-destructive" : ""}>
                <SelectValue placeholder="Select source" />
              </SelectTrigger>
              <SelectContent>
                {LEAD_SOURCES.map((s) => (
                  <SelectItem key={s} value={s}>{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.source && <p className="text-xs text-destructive">{errors.source}</p>}
          </div>

          {/* Visa Category */}
          <div className="space-y-1.5">
            <Label>Visa Category</Label>
            <Select value={form.visaCategory} onValueChange={set("visaCategory")}>
              <SelectTrigger>
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                {LEAD_VISA_CATEGORIES.map((c) => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Status */}
          <div className="space-y-1.5">
            <Label>Status</Label>
            <Select value={form.status} onValueChange={set("status")}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="new">New</SelectItem>
                <SelectItem value="contacted">Contacted</SelectItem>
                <SelectItem value="qualified">Qualified</SelectItem>
                <SelectItem value="converted">Converted</SelectItem>
                <SelectItem value="lost">Lost</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Stage */}
          <div className="space-y-1.5">
            <Label>Stage</Label>
            <Select value={form.stage} onValueChange={set("stage")}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="New">New</SelectItem>
                <SelectItem value="Contacted">Contacted</SelectItem>
                <SelectItem value="Qualified">Qualified</SelectItem>
                <SelectItem value="Converted">Converted</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Notes */}
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="lead-notes">Notes</Label>
            <Textarea
              id="lead-notes"
              placeholder="Any additional information about this lead…"
              value={form.notes}
              onChange={(e) => set("notes")(e.target.value)}
              rows={3}
            />
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={handleClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? "Adding…" : "Add Lead"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
