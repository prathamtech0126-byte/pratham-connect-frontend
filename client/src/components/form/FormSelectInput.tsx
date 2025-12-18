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
  group: string;
  items: Option[];
}

type SelectOption = Option | OptionGroup;

const isOptionGroup = (option: SelectOption): option is OptionGroup => {
  return "group" in option;
};

interface FormSelectInputProps<T extends FieldValues> {
  name: Path<T>;
  control: Control<T>;
  label: string;
  options: SelectOption[];
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
              {options.map((option, idx) => 
                isOptionGroup(option) ? (
                  <SelectGroup key={`group-${idx}`}>
                    <SelectLabel className="text-primary font-semibold">
                      {option.group}
                    </SelectLabel>
                    {option.items.map((item) => (
                      <SelectItem key={item.value} value={item.value}>
                        {item.label}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                ) : (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                )
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
