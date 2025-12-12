import { Control, FieldValues, Path } from "react-hook-form";
import { FormCurrencyInput } from "./FormCurrencyInput";
import { FormDateInput } from "./FormDateInput";
import { FormTextInput } from "./FormTextInput";
import { Label } from "@/components/ui/label";

interface FinancialEntryProps<T extends FieldValues> {
  control: Control<T>;
  name: string; // Base name for the group, e.g. "spouseFields.indianSideEmployment"
  label: string;
  hasInvoice?: boolean;
}

export function FinancialEntry<T extends FieldValues>({
  control,
  name,
  label,
  hasInvoice = true,
}: FinancialEntryProps<T>) {
  return (
    <div className="col-span-1 md:col-span-2 space-y-3 p-4 border rounded-lg bg-muted/20">
      <Label className="text-base font-semibold">{label}</Label>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <FormCurrencyInput
          name={`${name}.amount` as Path<T>}
          control={control}
          label="Amount"
        />
        <FormDateInput
          name={`${name}.date` as Path<T>}
          control={control}
          label="Date"
        />
        {hasInvoice && (
          <FormTextInput
            name={`${name}.invoiceNo` as Path<T>}
            control={control}
            label="Invoice No"
            placeholder="e.g. INV-001"
          />
        )}
      </div>
    </div>
  );
}
