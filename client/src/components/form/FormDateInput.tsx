import { Control, Controller, FieldValues, Path } from "react-hook-form";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { SimpleCalendar } from "@/components/ui/simple-calendar";
import { cn } from "@/lib/utils";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { useState } from "react";

interface FormDateInputProps<T extends FieldValues> {
  name: Path<T>;
  control: Control<T>;
  label: string;
  className?: string;
  maxDate?: Date;
}

export function FormDateInput<T extends FieldValues>({
  name,
  control,
  label,
  className,
  maxDate,
}: FormDateInputProps<T>) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <Controller
      name={name}
      control={control}
      render={({ field, fieldState: { error } }) => {
        return (
          <div className={cn("space-y-2", className)}>
            <Label className={cn(error && "text-destructive")}>{label}</Label>

            <Popover open={isOpen} onOpenChange={setIsOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full pl-3 text-left font-normal",
                    !field.value && "text-muted-foreground",
                    error && "border-destructive text-destructive",
                  )}
                >
                  {field.value ? (
                    format(new Date(field.value), "PPP")
                  ) : (
                    <span>Pick a date</span>
                  )}
                  <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                </Button>
              </PopoverTrigger>

              <PopoverContent className="w-auto p-0" align="start">
                <SimpleCalendar
                  value={field.value ? new Date(field.value) : undefined}
                  maxDate={maxDate}
                  onChange={(date) => {
                    if (date instanceof Date) {
                      field.onChange(date.toISOString());
                    } else if (Array.isArray(date) && date.length > 0 && date[0] instanceof Date) {
                      field.onChange(date[0].toISOString());
                    }
                    setIsOpen(false);
                  }}
                />
              </PopoverContent>
            </Popover>

            {error && (
              <p className="text-xs font-medium text-destructive">
                {error.message}
              </p>
            )}
          </div>
        );
      }}
    />
  );
}
