// client/src/components/payments/EditPaymentModal.tsx

import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format, parse, isValid } from "date-fns";
import { updatePayment, updateProductPayment } from "@/api/payments.api";
import type { PaymentRecord, UpdatePaymentParams, UpdateProductPaymentParams } from "@/api/payments.api";
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

// ── Types ──────────────────────────────────────────────────────────────────────

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

/** Convert "Tution Fees" → "TUTION_FEES" (reverse of backend toPaymentType) */
function toEnumKey(display: string): string {
  return display.trim().replace(/ /g, "_").toUpperCase();
}

/** Convert "TUTION_FEES" → "Tution Fees" for display */
function toDisplayLabel(enumKey: string): string {
  return enumKey
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

/** Convert display date "14 Apr 2026" → "2026-04-14" for <input type="date"> */
function displayDateToISO(displayDate: string): string {
  const parsed = parse(displayDate, "d MMM yyyy", new Date());
  return isValid(parsed) ? format(parsed, "yyyy-MM-dd") : "";
}

// ── Component ──────────────────────────────────────────────────────────────────

interface EditPaymentModalProps {
  row: PaymentRecord;
  open: boolean;
  onClose: () => void;
}

export default function EditPaymentModal({ row, open, onClose }: EditPaymentModalProps) {
  const queryClient = useQueryClient();
  const isProductPayment = row.source === "product";

  // ── Form state ──────────────────────────────────────────────────────────────
  const [saleTypeId, setSaleTypeId]     = useState("");
  const [stage, setStage]               = useState<UpdatePaymentParams["stage"]>("INITIAL");
  const [productName, setProductName]   = useState("");
  const [amount, setAmount]             = useState("");
  const [totalPayment, setTotalPayment] = useState("");
  const [paymentDate, setPaymentDate]   = useState("");
  const [invoiceNo, setInvoiceNo]       = useState("");
  const [remarks, setRemarks]           = useState("");
  const [formError, setFormError]       = useState<string | null>(null);

  // Populate form when row changes / modal opens
  useEffect(() => {
    if (!open) return;
    setFormError(null);
    setAmount(row.amount ?? "");
    setPaymentDate(displayDateToISO(row.date));
    setInvoiceNo(row.invoiceNo ?? "");
    setRemarks(row.remarks ?? "");

    if (isProductPayment) {
      // reverse-map display label → enum key
      setProductName(toEnumKey(row.paymentType ?? ""));
    } else {
      setSaleTypeId(row.saleTypeId ? String(row.saleTypeId) : "");
      const stageKey = STAGES.find(
        (s) => s.label.toLowerCase() === (row.paymentType ?? "").toLowerCase()
      )?.value ?? "INITIAL";
      setStage(stageKey);
      setTotalPayment(row.totalPayment ?? "");
    }
  }, [open, row, isProductPayment]);

  // ── Sale types (only for client_payment rows) ───────────────────────────────
  const { data: saleTypes = [] } = useQuery<SaleType[]>({
    queryKey: ["sale-types"],
    queryFn: async () => {
      const res = await api.get("/api/sale-types");
      return (res.data.data ?? []).map((s: any) => ({
        id: Number(s.id),
        saleType: String(s.saleType),
      }));
    },
    staleTime: 1000 * 60 * 10,
    enabled: !isProductPayment,
  });

  // ── Mutations ───────────────────────────────────────────────────────────────
  const onSuccess = () => {
    queryClient.invalidateQueries({ queryKey: ["payments-list"] });
    onClose();
  };
  const onError = (err: any) => {
    const msg = err?.response?.data?.message ?? err?.message ?? "Failed to update payment.";
    setFormError(msg);
  };

  const { mutate: mutatePayment, isPending: isPendingPayment } = useMutation({
    mutationFn: (p: UpdatePaymentParams) => updatePayment(p),
    onSuccess,
    onError,
  });

  const { mutate: mutateProduct, isPending: isPendingProduct } = useMutation({
    mutationFn: (p: UpdateProductPaymentParams) => updateProductPayment(p),
    onSuccess,
    onError,
  });

  const isPending = isPendingPayment || isPendingProduct;

  // ── Submit ──────────────────────────────────────────────────────────────────
  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);

    if (!row.paymentId || !row.clientId) {
      setFormError("Missing payment ID — cannot update.");
      return;
    }
    if (!amount || isNaN(Number(amount))) {
      setFormError("Enter a valid amount.");
      return;
    }
    if (!paymentDate) {
      setFormError("Please select a payment date.");
      return;
    }

    if (isProductPayment) {
      if (!productName) { setFormError("Please select a product type."); return; }
      mutateProduct({
        productPaymentId: row.paymentId,
        clientId:         row.clientId,
        productName,
        amount:           String(amount),
        paymentDate,
        invoiceNo:        invoiceNo.trim() || undefined,
        remarks:          remarks.trim() || undefined,
      });
    } else {
      if (!saleTypeId) { setFormError("Please select a sale type."); return; }
      if (!totalPayment || isNaN(Number(totalPayment))) {
        setFormError("Enter a valid total payment.");
        return;
      }
      mutatePayment({
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
  }

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit Payment — {row.clientName}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-1">

          {/* ── client_payment fields ── */}
          {!isProductPayment && (
            <>
              <div className="space-y-1">
                <Label>Sale Type</Label>
                <Select value={saleTypeId} onValueChange={setSaleTypeId}>
                  <SelectTrigger><SelectValue placeholder="Select sale type" /></SelectTrigger>
                  <SelectContent>
                    {saleTypes.map((s) => (
                      <SelectItem key={s.id} value={String(s.id)}>{s.saleType}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label>Payment Stage</Label>
                <Select value={stage} onValueChange={(v) => setStage(v as UpdatePaymentParams["stage"])}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {STAGES.map((s) => (
                      <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </>
          )}

          {/* ── client_product_payment field ── */}
          {isProductPayment && (
            <div className="space-y-1">
              <Label>Product Type</Label>
              <Select value={productName} onValueChange={setProductName}>
                <SelectTrigger><SelectValue placeholder="Select product type" /></SelectTrigger>
                <SelectContent className="max-h-60">
                  {[
                    "ALL_FINANCE_EMPLOYEMENT","INDIAN_SIDE_EMPLOYEMENT","NOC_LEVEL_JOB_ARRANGEMENT",
                    "LAWYER_REFUSAL_CHARGE","ONSHORE_PART_TIME_EMPLOYEMENT",
                    "TRV_WORK_PERMIT_EXT_STUDY_PERMIT_EXTENSION","MARRIAGE_PHOTO_FOR_COURT_MARRIAGE",
                    "MARRIAGE_PHOTO_CERTIFICATE","RECENTE_MARRIAGE_RELATIONSHIP_AFFIDAVIT",
                    "JUDICAL_REVIEW_CHARGE","SIM_CARD_ACTIVATION","INSURANCE","BEACON_ACCOUNT",
                    "AIR_TICKET","OTHER_NEW_SELL","SPONSOR_CHARGES","FINANCE_EMPLOYEMENT",
                    "IELTS_ENROLLMENT","LOAN_DETAILS","FOREX_CARD","FOREX_FEES","TUTION_FEES",
                    "CREDIT_CARD","VISA_EXTENSION","REFUSAL_CHARGES","KIDS_STUDY_PERMIT",
                    "CANADA_FUND","EMPLOYMENT_VERIFICATION_CHARGES","ADDITIONAL_AMOUNT_STATEMENT_CHARGES",
                  ].map((key) => (
                    <SelectItem key={key} value={key}>{toDisplayLabel(key)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* ── Shared fields ── */}
          <div className={`grid gap-3 ${!isProductPayment ? "grid-cols-2" : "grid-cols-1"}`}>
            <div className="space-y-1">
              <Label>Amount (₹)</Label>
              <Input
                type="number" min="0" step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="e.g. 35000"
              />
            </div>
            {!isProductPayment && (
              <div className="space-y-1">
                <Label>Total Payment (₹)</Label>
                <Input
                  type="number" min="0" step="0.01"
                  value={totalPayment}
                  onChange={(e) => setTotalPayment(e.target.value)}
                  placeholder="e.g. 70000"
                />
              </div>
            )}
          </div>

          <div className="space-y-1">
            <Label>Payment Date</Label>
            <Input
              type="date"
              value={paymentDate}
              onChange={(e) => setPaymentDate(e.target.value)}
            />
          </div>

          <div className="space-y-1">
            <Label>
              Invoice No{" "}
              <span className="text-xs text-muted-foreground">(optional)</span>
            </Label>
            <Input
              value={invoiceNo}
              onChange={(e) => setInvoiceNo(e.target.value)}
              placeholder="e.g. INV-2026-001"
            />
          </div>

          <div className="space-y-1">
            <Label>
              Remarks{" "}
              <span className="text-xs text-muted-foreground">(optional)</span>
            </Label>
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
            <Button
              type="submit"
              disabled={isPending}
              className="bg-[#2d3a8c] hover:bg-[#232f73]"
            >
              {isPending ? "Saving…" : "Save Changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
