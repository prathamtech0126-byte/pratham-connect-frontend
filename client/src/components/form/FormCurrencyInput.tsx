import { Control, Controller, FieldValues, Path } from "react-hook-form";
import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

interface FormCurrencyInputProps<T extends FieldValues> {
  name: Path<T>;
  control: Control<T>;
  label: string;
  placeholder?: string;
  className?: string;
  currencySymbol?: string; // Optional currency symbol (defaults to ₹)
  disabled?: boolean;
}

interface CurrencyFieldProps {
  field: any;
  error?: { message?: string };
  name: string;
  label: string;
  placeholder?: string;
  className?: string;
  currencySymbol: string;
  disabled?: boolean;
}

function CurrencyField({
  field,
  error,
  name,
  label,
  placeholder,
  className,
  currencySymbol,
  disabled,
}: CurrencyFieldProps) {
  const { onChange, value, ...inputField } = field;
  const [draftValue, setDraftValue] = useState<string>("");
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    if (isEditing) return;
    if (value === null || value === undefined || (typeof value === "number" && Number.isNaN(value))) {
      setDraftValue("");
    } else {
      setDraftValue(String(value));
    }
  }, [value, isEditing]);

  const displayValue = isEditing
    ? draftValue
    : value === null || value === undefined || (typeof value === "number" && Number.isNaN(value))
        ? ""
        : value;

  return (
    <div className={cn("space-y-2", className)}>
      <Label htmlFor={name} className={cn(error && "text-destructive")}>
        {label}
      </Label>
      <div className="relative">
        <span className="absolute left-3 top-2.5 text-muted-foreground">{currencySymbol}</span>
        <Input
          {...inputField}
          id={name}
          type="number"
          min="0"
          step="0.01"
          value={displayValue}
          placeholder={placeholder || "Enter amount"}
          disabled={disabled}
          onChange={(e) => {
            const inputValue = e.target.value;
            setDraftValue(inputValue);

            if (inputValue === "" || inputValue === null || inputValue === undefined) {
              onChange(undefined);
              return;
            }

            const numValue = e.target.valueAsNumber;
            if (Number.isNaN(numValue) || numValue < 0) {
              onChange(undefined);
            } else {
              onChange(numValue);
            }
          }}
          onFocus={() => {
            setIsEditing(true);
          }}
          onBlur={(e) => {
            setIsEditing(false);
            const inputValue = e.target.value;
            if (inputValue === "" || inputValue === null || inputValue === undefined) {
              onChange(undefined);
              setDraftValue("");
              return;
            }
            const numValue = Number(inputValue);
            if (Number.isNaN(numValue) || numValue < 0) {
              onChange(undefined);
              setDraftValue("");
              return;
            }
            onChange(numValue);
            setDraftValue(String(numValue));
          }}
          onWheel={(e) => {
            // Prevent mouse wheel from changing number input value
            e.currentTarget.blur();
          }}
          className={cn("pl-7", error && "border-destructive focus-visible:ring-destructive")}
        />
      </div>
      {error && <p className="text-xs font-medium text-destructive">{error.message}</p>}
    </div>
  );
}

export function FormCurrencyInput<T extends FieldValues>({
  name,
  control,
  label,
  placeholder,
  className,
  currencySymbol = "₹", // Default to ₹ for backward compatibility
  disabled,
}: FormCurrencyInputProps<T>) {
  return (
    <Controller
      name={name}
      control={control}
      render={({ field, fieldState: { error } }) => (
        <CurrencyField
          field={field}
          error={error}
          name={name}
          label={label}
          placeholder={placeholder}
          className={className}
          currencySymbol={currencySymbol}
          disabled={disabled}
        />
      )}
    />
  );
}
