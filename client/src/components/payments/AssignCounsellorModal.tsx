// client/src/components/payments/AssignCounsellorModal.tsx

import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { updatePaymentAssignment } from "@/api/payments.api";
import type { PaymentRecord, PaymentsListResponse } from "@/api/payments.api";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface AssignCounsellorModalProps {
  row: PaymentRecord;
  field: "clientOwner" | "addedBy";
  counsellors: { id: number; name: string }[];
  open: boolean;
  onClose: () => void;
}

export default function AssignCounsellorModal({
  row,
  field,
  counsellors,
  open,
  onClose,
}: AssignCounsellorModalProps) {
  const queryClient = useQueryClient();
  const [selectedId, setSelectedId] = useState<string>("");
  const [formError, setFormError] = useState<string | null>(null);

  // Reset selection when modal opens for a new row/field
  useEffect(() => {
    if (open) {
      setSelectedId("");
      setFormError(null);
    }
  }, [open, row.paymentId, field]);

  const fieldLabel = field === "clientOwner" ? "Client Owner" : "Added By";
  const currentValue = field === "clientOwner" ? row.clientOwner : row.addedBy;

  const { mutate, isPending } = useMutation({
    mutationFn: () => {
      if (!row.paymentId || !row.clientId || !selectedId) {
        throw new Error("Missing required fields.");
      }
      return updatePaymentAssignment({
        paymentId: row.paymentId,
        clientId: row.clientId,
        source: row.source,
        field,
        counsellorId: Number(selectedId),
      });
    },
    onSuccess: () => {
      const counsellorName =
        counsellors.find((c) => c.id === Number(selectedId))?.name ?? "";

      // Immediately update the cached rows so the table reflects the change
      // without waiting for the background refetch to complete.
      queryClient.setQueriesData<PaymentsListResponse>(
        { queryKey: ["payments-list"] },
        (old) => {
          if (!old) return old;
          return {
            ...old,
            data: old.data.map((r) =>
              r.paymentId === row.paymentId && r.source === row.source
                ? { ...r, [field]: counsellorName }
                : r
            ),
          };
        }
      );

      // Refetch in background to confirm server state
      queryClient.invalidateQueries({ queryKey: ["payments-list"] });
      onClose();
    },
    onError: (err: any) => {
      const msg =
        err?.response?.data?.message ?? err?.message ?? "Failed to update.";
      setFormError(msg);
    },
  });

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-base">Change {fieldLabel}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-1">
          {/* Current value */}
          <div className="rounded-md bg-slate-50 border border-slate-100 px-3 py-2 text-xs text-slate-500">
            Current:{" "}
            <span className="font-semibold text-slate-700">
              {currentValue || "—"}
            </span>
          </div>

          {/* Client info */}
          <div className="text-xs text-muted-foreground">
            Client:{" "}
            <span className="font-medium text-slate-700">{row.clientName}</span>
          </div>

          {/* Counsellor select */}
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Select New Counsellor</Label>
            <Select
              value={selectedId}
              onValueChange={(v) => {
                setSelectedId(v);
                setFormError(null);
              }}
            >
              <SelectTrigger className="text-sm">
                <SelectValue placeholder="Choose counsellor…" />
              </SelectTrigger>
              <SelectContent className="max-h-60 overflow-y-auto">
                {counsellors.map((c) => (
                  <SelectItem key={c.id} value={String(c.id)}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {formError && (
            <p className="text-xs font-medium text-destructive">{formError}</p>
          )}
        </div>

        <DialogFooter className="mt-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onClose}
            disabled={isPending}
          >
            Cancel
          </Button>
          <Button
            size="sm"
            disabled={!selectedId || isPending}
            onClick={() => mutate()}
            className="bg-[#2d3a8c] hover:bg-[#232f73]"
          >
            {isPending ? "Saving…" : "Update"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
