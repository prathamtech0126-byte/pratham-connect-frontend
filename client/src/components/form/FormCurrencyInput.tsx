import { Control, Controller, FieldValues, Path } from "react-hook-form";
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
      render={({ field: { onChange, value, ...field }, fieldState: { error } }) => {
        // Convert 0 or undefined/null to empty string to show placeholder
        const displayValue = (value === 0 || value === null || value === undefined) ? "" : value;

        return (
          <div className={cn("space-y-2", className)}>
            <Label htmlFor={name} className={cn(error && "text-destructive")}>
              {label}
            </Label>
            <div className="relative">
              <span className="absolute left-3 top-2.5 text-muted-foreground">{currencySymbol}</span>
              <Input
                {...field}
                id={name}
                type="number"
                min="0"
                step="0.01"
                value={displayValue}
                placeholder={placeholder || "Enter amount"}
                disabled={disabled}
                onChange={(e) => {
                  const inputValue = e.target.value;
                  // If input is empty, set to undefined (not 0) so placeholder shows
                  if (inputValue === "" || inputValue === null || inputValue === undefined) {
                    onChange(undefined);
                  } else {
                    const numValue = e.target.valueAsNumber;
                    // Prevent negative values
                    if (numValue < 0) {
                      onChange(undefined);
                    } else if (isNaN(numValue)) {
                      onChange(undefined);
                    } else {
                      onChange(numValue);
                    }
                  }
                }}
                onWheel={(e) => {
                  // Prevent mouse wheel from changing number input value
                  e.currentTarget.blur();
                }}
                className={cn("pl-7", error && "border-destructive focus-visible:ring-destructive")}
              />
            </div>
            {error && (
              <p className="text-xs font-medium text-destructive">{error.message}</p>
            )}
          </div>
        );
      }}
    />
  );
}
