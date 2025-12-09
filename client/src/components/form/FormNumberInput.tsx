import { Control, Controller, FieldValues, Path } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

interface FormNumberInputProps<T extends FieldValues> {
  name: Path<T>;
  control: Control<T>;
  label: string;
  placeholder?: string;
  className?: string;
  min?: number;
  max?: number;
}

export function FormNumberInput<T extends FieldValues>({
  name,
  control,
  label,
  placeholder,
  className,
  min,
  max
}: FormNumberInputProps<T>) {
  return (
    <Controller
      name={name}
      control={control}
      render={({ field: { onChange, ...field }, fieldState: { error } }) => (
        <div className={cn("space-y-2", className)}>
          <Label htmlFor={name} className={cn(error && "text-destructive")}>
            {label}
          </Label>
          <Input
            {...field}
            id={name}
            type="number"
            min={min}
            max={max}
            placeholder={placeholder}
            onChange={(e) => onChange(e.target.valueAsNumber)}
            className={cn(error && "border-destructive focus-visible:ring-destructive")}
          />
          {error && (
            <p className="text-xs font-medium text-destructive">{error.message}</p>
          )}
        </div>
      )}
    />
  );
}
