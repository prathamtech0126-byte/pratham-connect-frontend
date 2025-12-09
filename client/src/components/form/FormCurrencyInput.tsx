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
}

export function FormCurrencyInput<T extends FieldValues>({
  name,
  control,
  label,
  placeholder,
  className,
}: FormCurrencyInputProps<T>) {
  return (
    <Controller
      name={name}
      control={control}
      render={({ field: { onChange, ...field }, fieldState: { error } }) => (
        <div className={cn("space-y-2", className)}>
          <Label htmlFor={name} className={cn(error && "text-destructive")}>
            {label}
          </Label>
          <div className="relative">
            <span className="absolute left-3 top-2.5 text-muted-foreground">₹</span>
            <Input
              {...field}
              id={name}
              type="number"
              placeholder={placeholder}
              onChange={(e) => onChange(e.target.valueAsNumber)}
              className={cn("pl-7", error && "border-destructive focus-visible:ring-destructive")}
            />
          </div>
          {error && (
            <p className="text-xs font-medium text-destructive">{error.message}</p>
          )}
        </div>
      )}
    />
  );
}
