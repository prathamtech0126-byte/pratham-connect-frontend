import { Control, Controller, FieldValues, Path } from "react-hook-form";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { cn } from "@/lib/utils";

interface Option {
  label: string;
  value: string;
}

interface FormRadioInputProps<T extends FieldValues> {
  name: Path<T>;
  control: Control<T>;
  label: string;
  options: Option[];
  className?: string;
  orientation?: "horizontal" | "vertical";
}

export function FormRadioInput<T extends FieldValues>({
  name,
  control,
  label,
  options,
  className,
  orientation = "horizontal",
}: FormRadioInputProps<T>) {
  return (
    <Controller
      name={name}
      control={control}
      render={({ field, fieldState: { error } }) => (
        <div className={cn("space-y-3", className)}>
          <Label className={cn(error && "text-destructive")}>{label}</Label>
          <RadioGroup
            onValueChange={field.onChange}
            defaultValue={field.value}
            className={cn(
              "flex",
              orientation === "vertical" ? "flex-col space-y-1" : "flex-row space-x-4"
            )}
          >
            {options.map((option) => (
              <div key={option.value} className="flex items-center space-x-2">
                <RadioGroupItem value={option.value} id={`${name}-${option.value}`} />
                <Label htmlFor={`${name}-${option.value}`} className="font-normal cursor-pointer">
                  {option.label}
                </Label>
              </div>
            ))}
          </RadioGroup>
          {error && (
            <p className="text-xs font-medium text-destructive">{error.message}</p>
          )}
        </div>
      )}
    />
  );
}
