import { Control, Controller, FieldValues, Path } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

interface FormTextInputProps<T extends FieldValues> {
  name: Path<T>;
  control: Control<T>;
  label: string;
  placeholder?: string;
  className?: string;
  description?: string;
  disabled?: boolean;
}

export function FormTextInput<T extends FieldValues>({
  name,
  control,
  label,
  placeholder,
  className,
  description,
  disabled
}: FormTextInputProps<T>) {
  return (
    <Controller
      name={name}
      control={control}
      render={({ field, fieldState: { error } }) => (
        <div className={cn("space-y-2", className)}>
          <Label htmlFor={name} className={cn(error && "text-destructive")}>
            {label}
          </Label>
          <Input
            {...field}
            id={name}
            placeholder={placeholder}
            disabled={disabled}
            className={cn(error && "border-destructive focus-visible:ring-destructive")}
          />
          {description && !error && (
            <p className="text-xs text-muted-foreground">{description}</p>
          )}
          {error && (
            <p className="text-xs font-medium text-destructive">{error.message}</p>
          )}
        </div>
      )}
    />
  );
}
