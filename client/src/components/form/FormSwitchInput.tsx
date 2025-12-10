import { Control, Controller, FieldValues, Path } from "react-hook-form";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

interface FormSwitchInputProps<T extends FieldValues> {
  name: Path<T>;
  control: Control<T>;
  label: string;
  className?: string;
}

export function FormSwitchInput<T extends FieldValues>({
  name,
  control,
  label,
  className,
}: FormSwitchInputProps<T>) {
  return (
    <Controller
      name={name}
      control={control}
      render={({ field: { value, onChange, ...field } }) => (
        <div className={cn("flex items-center space-x-2", className)}>
          <Switch
            checked={value}
            onCheckedChange={onChange}
            id={name}
            {...field}
          />
          <Label htmlFor={name}>{label}</Label>
        </div>
      )}
    />
  );
}
