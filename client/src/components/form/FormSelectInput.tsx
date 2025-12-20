import { Control, Controller, FieldValues, Path } from "react-hook-form";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  SelectGroup,
  SelectLabel,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

interface Option {
  label: string;
  value: string;
  group?: string;
}

interface FormSelectInputProps<T extends FieldValues> {
  name: Path<T>;
  control: Control<T>;
  label: string;
  options: Option[];
  placeholder?: string;
  className?: string;
}

export function FormSelectInput<T extends FieldValues>({
  name,
  control,
  label,
  options,
  placeholder,
  className,
}: FormSelectInputProps<T>) {
  const groupedOptions = options.reduce((acc, option) => {
    const group = option.group || "default";
    if (!acc[group]) acc[group] = [];
    acc[group].push(option);
    return acc;
  }, {} as Record<string, Option[]>);

  return (
    <Controller
      name={name}
      control={control}
      render={({ field, fieldState: { error } }) => (
        <div className={cn("space-y-2", className)}>
          <Label className={cn(error && "text-destructive")}>{label}</Label>
          <Select onValueChange={field.onChange} defaultValue={field.value}>
            <SelectTrigger className={cn(error && "border-destructive")}>
              <SelectValue placeholder={placeholder} />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(groupedOptions).map(([groupName, groupOptions]) => (
                <SelectGroup key={groupName}>
                  {groupName !== "default" && <SelectLabel>{groupName}</SelectLabel>}
                  {groupOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectGroup>
              ))}
            </SelectContent>
          </Select>
          {error && (
            <p className="text-xs font-medium text-destructive">{error.message}</p>
          )}
        </div>
      )}
    />
  );
}
