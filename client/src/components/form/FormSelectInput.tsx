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
}

interface OptionGroup {
  label: string;
  options: Option[];
}

interface FormSelectInputProps<T extends FieldValues> {
  name: Path<T>;
  control: Control<T>;
  label: string;
  options: Option[] | OptionGroup[];
  placeholder?: string;
  className?: string;
}

const isGrouped = (options: any[]): options is OptionGroup[] => {
  return options.length > 0 && "options" in options[0];
};

export function FormSelectInput<T extends FieldValues>({
  name,
  control,
  label,
  options,
  placeholder,
  className,
}: FormSelectInputProps<T>) {
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
            <SelectContent className="max-h-[200px]">
              {isGrouped(options) ? (
                options.map((group) => (
                  <SelectGroup key={group.label}>
                    <SelectLabel className="font-semibold">{group.label}</SelectLabel>
                    {group.options.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                ))
              ) : (
                (options as Option[]).map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))
              )}
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
