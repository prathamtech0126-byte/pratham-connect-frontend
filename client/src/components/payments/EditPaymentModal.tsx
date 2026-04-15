// client/src/components/payments/EditPaymentModal.tsx

import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format, parse, isValid } from "date-fns";
import { updatePayment } from "@/api/payments.api";
import type { PaymentRecord, UpdatePaymentParams } from "@/api/payments.api";
import api from "@/lib/api";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
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

interface SaleType {
  id: number;
  saleType: string;
}

const STAGES: { value: UpdatePaymentParams["stage"]; label: string }[] = [
  { value: "INITIAL",        label: "Initial" },
  { value: "BEFORE_VISA",    label: "Before Visa" },
  { value: "AFTER_VISA",     label: "After Visa" },
  { value: "SUBMITTED_VISA", label: "Submitted Visa" },
];

/** Convert display date "14 Apr 2026" → "2026-04-14" for <input type="date"> */
function displayDateToISO(displayDate: string): string {
  const parsed = parse(displayDate, "d MMM yyyy", new Date());
  return isValid(parsed) ? format(parsed, "yyyy-MM-dd") : "";
}

interface EditPaymentModalProps {
  row: PaymentRecord;
  open: boolean;
  onClose: () => void;
}

export default function EditPaymentModal({ row, open, onClose }: EditPaymentModalProps) {
  const queryClient = useQueryClient();

  // ── Form state ─────────────────────────────────────────────────────────────
  const [saleTypeId, setSaleTypeId]     = useState("");
  const [stage, setStage]               = useState<UpdatePaymentParams["stage"]>("INITIAL");
  const [amount, setAmount]             = useState("");
  const [totalPayment, setTotalPayment] = useState("");
  const [paymentDate, setPaymentDate]   = useState("");
  const [invoiceNo, setInvoiceNo]       = useState("");
  const [remarks, setRemarks]           = useState("");
  const [formError, setFormError]       = useState<string | null>(null);

  // Populate form when row changes / modal opens
  useEffect(() => {
    if (!open) return;
    setSaleTypeId(row.saleTypeId ? String(row.saleTypeId) : "");
    // stage comes back as "Initial" / "Before Visa" — reverse-map to enum key
    const stageKey = STAGES.find(
      (s) => s.label.toLowerCase() === (row.paymentType ?? "").toLowerCase()
    )?.value ?? "INITIAL";
    setStage(stageKey);
    setAmount(row.amount ?? "");
    setTotalPayment(row.totalPayment ?? "");
    setPaymentDate(displayDateToISO(row.date));
    setInvoiceNo(row.invoiceNo ?? "");
    setRemarks(row.remarks ?? "");
    setFormError(null);
  }, [open, row]);

  // ── Sale types ─────────────────────────────────────────────────────────────
  const { data: saleTypes = [] } = useQuery<SaleType[]>({
    queryKey: ["sale-types"],
    queryFn: async () => {
      const res = await api.get("/api/sale-types");
      return (res.data.data ?? []).map((s: any) => ({ id: Number(s.id), saleType: String(s.saleType) }));
    },
    staleTime: 1000 * 60 * 10,
  });

  // ── Mutation ───────────────────────────────────────────────────────────────
  const { mutate, isPending } = useMutation({
    mutationFn: (params: UpdatePaymentParams) => updatePayment(params),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["payments-list"] });
      onClose();
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message ?? err?.message ?? "Failed to update payment.";
      setFormError(msg);
    },
  });

  // ── Submit ─────────────────────────────────────────────────────────────────
  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);

    if (!row.paymentId || !row.clientId) return;
    if (!saleTypeId) { setFormError("Please select a sale type."); return; }
    if (!amount || isNaN(Number(amount))) { setFormError("Enter a valid amount."); return; }
    if (!totalPayment || isNaN(Number(totalPayment))) { setFormError("Enter a valid total payment."); return; }
    if (!paymentDate) { setFormError("Please select a payment date."); return; }

    mutate({
      paymentId:    row.paymentId,
      clientId:     row.clientId,
      saleTypeId:   Number(saleTypeId),
      stage,
      amount:       String(amount),
      totalPayment: String(totalPayment),
      paymentDate,
      invoiceNo:    invoiceNo.trim() || undefined,
      remarks:      remarks.trim() || undefined,
    });
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit Payment — {row.clientName}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-1">

          {/* Sale Type */}
          <div className="space-y-1">
            <Label>Sale Type</Label>
            <Select value={saleTypeId} onValueChange={setSaleTypeId}>
              <SelectTrigger>
                <SelectValue placeholder="Select sale type" />
              </SelectTrigger>
              <SelectContent>
                {saleTypes.map((s) => (
                  <SelectItem key={s.id} value={String(s.id)}>
                    {s.saleType}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Stage */}
          <div className="space-y-1">
            <Label>Payment Stage</Label>
            <Select value={stage} onValueChange={(v) => setStage(v as UpdatePaymentParams["stage"])}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STAGES.map((s) => (
                  <SelectItem key={s.value} value={s.value}>
                    {s.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Amount + Total Payment */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Amount (₹)</Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="e.g. 35000"
              />
            </div>
            <div className="space-y-1">
              <Label>Total Payment (₹)</Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={totalPayment}
                onChange={(e) => setTotalPayment(e.target.value)}
                placeholder="e.g. 70000"
              />
            </div>
          </div>

          {/* Payment Date */}
          <div className="space-y-1">
            <Label>Payment Date</Label>
            <Input
              type="date"
              value={paymentDate}
              onChange={(e) => setPaymentDate(e.target.value)}
            />
          </div>

          {/* Invoice No */}
          <div className="space-y-1">
            <Label>Invoice No <span className="text-muted-foreground text-xs">(optional)</span></Label>
            <Input
              value={invoiceNo}
              onChange={(e) => setInvoiceNo(e.target.value)}
              placeholder="e.g. INV-2026-001"
            />
          </div>

          {/* Remarks */}
          <div className="space-y-1">
            <Label>Remarks <span className="text-muted-foreground text-xs">(optional)</span></Label>
            <Textarea
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              rows={2}
              placeholder="Any notes…"
            />
          </div>

          {formError && (
            <p className="text-xs font-medium text-destructive">{formError}</p>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={isPending}>
              Cancel
            </Button>
            <Button type="submit" disabled={isPending} className="bg-[#2d3a8c] hover:bg-[#232f73]">
              {isPending ? "Saving…" : "Save Changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
