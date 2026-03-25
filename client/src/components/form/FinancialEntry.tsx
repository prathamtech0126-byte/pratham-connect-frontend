import { ReactNode, useEffect, useMemo, useState } from "react";
import { Control, FieldValues, Path, useWatch } from "react-hook-form";
import { FormCurrencyInput } from "./FormCurrencyInput";
import { FormDateInput } from "./FormDateInput";
import { FormTextInput } from "./FormTextInput";
import { FormTextareaInput } from "./FormTextareaInput";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

interface FinancialEntryProps<TFieldValues extends FieldValues> {
  control: Control<TFieldValues, any, any>;
  name: string; // Base name for the group, e.g. "spouseFields.indianSideEmployment"
  label: string;
  hasInvoice?: boolean;
  hasRemarks?: boolean;
  /** Show Second Payment and Second Date (e.g. All Finance & Employment) */
  showSecondPayment?: boolean;
  /** Show Total Payment field above Amount/Date/Invoice */
  showTotalPayment?: boolean;
  /** Maximum number of additional payment rows (after first amount/date row) */
  maxAdditionalPayments?: number;
  amountPlaceholder?: string; // Placeholder for amount field
  invoicePlaceholder?: string; // Placeholder for invoice field
  remarksPlaceholder?: string; // Placeholder for remarks field
  disabled?: boolean;
  /** Optional action (e.g. Delete button) shown in the top-right of the section */
  rightAction?: ReactNode;
}

export function FinancialEntry<T extends FieldValues>({
  control,
  name,
  label,
  hasInvoice = true,
  hasRemarks = false,
  showSecondPayment = false,
  showTotalPayment = false,
  maxAdditionalPayments = 5,
  amountPlaceholder = "Enter amount",
  invoicePlaceholder = "Enter invoice number",
  remarksPlaceholder = "Enter remarks",
  disabled = false,
  rightAction,
}: FinancialEntryProps<T>) {
  const values = useWatch({ control, name: name as Path<T> }) as Record<string, unknown> | undefined;
  const [visibleAdditionalPayments, setVisibleAdditionalPayments] = useState(1);

  const additionalRows = useMemo(
    () => [
      { amountKey: "anotherPaymentAmount", dateKey: "anotherPaymentDate", label: "2nd" },
      { amountKey: "anotherPaymentAmount2", dateKey: "anotherPaymentDate2", label: "3rd" },
      { amountKey: "anotherPaymentAmount3", dateKey: "anotherPaymentDate3", label: "4th" },
      { amountKey: "anotherPaymentAmount4", dateKey: "anotherPaymentDate4", label: "5th" },
      { amountKey: "anotherPaymentAmount5", dateKey: "anotherPaymentDate5", label: "6th" },
    ],
    [],
  );
  const cappedAdditionalPayments = Math.min(
    additionalRows.length,
    Math.max(1, maxAdditionalPayments),
  );

  useEffect(() => {
    if (!showSecondPayment || !values) return;
    let highestIndex = 0;
    additionalRows.forEach((row, idx) => {
      const a = values[row.amountKey];
      const d = values[row.dateKey];
      const hasAmount = a != null && a !== "" && Number(a) > 0;
      const hasDate = d != null && String(d).trim() !== "";
      if (hasAmount || hasDate) highestIndex = idx;
    });
    setVisibleAdditionalPayments((prev) =>
      Math.min(
        cappedAdditionalPayments,
        Math.max(prev, highestIndex + 1),
      ),
    );
  }, [showSecondPayment, values, additionalRows, cappedAdditionalPayments]);

  return (
    <div className="col-span-1 md:col-span-2 space-y-3 p-4 border rounded-lg bg-muted/20">
      <div className="flex items-center justify-between gap-2">
        <Label className="text-base font-semibold">{label}</Label>
        {rightAction != null ? <div className="shrink-0">{rightAction}</div> : null}
      </div>
      {showTotalPayment && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormCurrencyInput
            name={`${name}.totalAmount` as Path<T>}
            control={control}
            label="Total Payment"
            placeholder="Enter total payment"
            disabled={disabled}
          />
        </div>
      )}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <FormCurrencyInput
          name={`${name}.amount` as Path<T>}
          control={control}
          label="Amount"
          placeholder={amountPlaceholder}
          disabled={disabled}
        />
        <FormDateInput
          name={`${name}.date` as Path<T>}
          control={control}
          label="Date"
          maxDate={new Date()}
          disabled={disabled}
        />
        {hasInvoice && (
          <FormTextInput
            name={`${name}.invoiceNo` as Path<T>}
            control={control}
            label="Invoice No"
            placeholder={invoicePlaceholder}
            disabled={disabled}
          />
        )}
      </div>
      {showSecondPayment && (
        <div className="space-y-3">
          {additionalRows.slice(0, visibleAdditionalPayments).map((row) => (
            <div key={row.amountKey} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormCurrencyInput
                name={`${name}.${row.amountKey}` as Path<T>}
                control={control}
                label={`${row.label} Payment Amount`}
                placeholder="Enter amount"
                disabled={disabled}
              />
              <FormDateInput
                name={`${name}.${row.dateKey}` as Path<T>}
                control={control}
                label={`${row.label} Payment Date`}
                disabled={disabled}
              />
            </div>
          ))}
          {visibleAdditionalPayments < cappedAdditionalPayments && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="w-fit"
              disabled={disabled}
              onClick={() =>
                setVisibleAdditionalPayments((v) =>
                  Math.min(cappedAdditionalPayments, v + 1),
                )
              }
            >
              <Plus className="w-4 h-4 mr-1" />
              Add another payment
            </Button>
          )}
        </div>
      )}
      {hasRemarks && (
        <FormTextareaInput
          name={`${name}.remarks` as Path<T>}
          control={control}
          label="Remarks"
          placeholder={remarksPlaceholder}
          disabled={disabled}
        />
      )}
    </div>
  );
}
