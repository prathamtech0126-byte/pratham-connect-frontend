import { ReactNode } from "react";
import { Control, FieldValues, Path } from "react-hook-form";
import { FormCurrencyInput } from "./FormCurrencyInput";
import { FormDateInput } from "./FormDateInput";
import { FormTextInput } from "./FormTextInput";
import { FormTextareaInput } from "./FormTextareaInput";
import { Label } from "@/components/ui/label";

interface FinancialEntryProps<TFieldValues extends FieldValues> {
  control: Control<TFieldValues, any, any>;
  name: string; // Base name for the group, e.g. "spouseFields.indianSideEmployment"
  label: string;
  hasInvoice?: boolean;
  hasRemarks?: boolean;
  /** Show Second Payment and Second Date (e.g. All Finance & Employment) */
  showSecondPayment?: boolean;
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
  amountPlaceholder = "Enter amount",
  invoicePlaceholder = "Enter invoice number",
  remarksPlaceholder = "Enter remarks",
  disabled = false,
  rightAction,
}: FinancialEntryProps<T>) {
  return (
    <div className="col-span-1 md:col-span-2 space-y-3 p-4 border rounded-lg bg-muted/20">
      <div className="flex items-center justify-between gap-2">
        <Label className="text-base font-semibold">{label}</Label>
        {rightAction != null ? <div className="shrink-0">{rightAction}</div> : null}
      </div>
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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormCurrencyInput
            name={`${name}.anotherPaymentAmount` as Path<T>}
            control={control}
            label="Second Partial Payment"
            placeholder="Enter amount"
            disabled={disabled}
          />
          <FormDateInput
            name={`${name}.anotherPaymentDate` as Path<T>}
            control={control}
            label="Second Partial Payment Date"
            maxDate={new Date()}
            disabled={disabled}
          />
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
