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

interface FormDateInputProps<TFieldValues extends FieldValues> {
  name: Path<TFieldValues>;
  control: Control<TFieldValues, any, any>;
  label: string;
  className?: string;
  maxDate?: Date;
  disabled?: boolean;
}


export function FormDateInput<T extends FieldValues>({
  name,
  control,
  label,
  className,
  maxDate,
  disabled,
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
                  type="button"
                  disabled={disabled}
                  className={cn(
                    "w-full pl-3 text-left font-normal",
                    !field.value && "text-muted-foreground",
                    error && "border-destructive text-destructive",
                  )}
                >
                  {field.value ? (
                    (() => {
                      try {
                        // Handle both YYYY-MM-DD and ISO string formats
                        const dateStr = field.value.includes("T")
                          ? field.value
                          : `${field.value}T00:00:00`;
                        return format(new Date(dateStr), "PPP");
                      } catch {
                        return field.value;
                      }
                    })()
                  ) : (
                    <span>Pick a date</span>
                  )}
                  <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                </Button>
              </PopoverTrigger>

              <PopoverContent className="w-auto p-0" align="start">
                <SimpleCalendar
                  value={field.value ? (() => {
                    try {
                      // Handle both YYYY-MM-DD and ISO string formats
                      const dateStr = field.value.includes("T")
                        ? field.value
                        : `${field.value}T00:00:00`;
                      return new Date(dateStr);
                    } catch {
                      return undefined;
                    }
                  })() : undefined}
                  maxDate={maxDate}
                  onChange={(date) => {
                    if (date instanceof Date) {
                      // Format as YYYY-MM-DD to avoid timezone conversion issues
                      // Use local date components to preserve the selected date
                      const year = date.getFullYear();
                      const month = String(date.getMonth() + 1).padStart(2, '0');
                      const day = String(date.getDate()).padStart(2, '0');
                      field.onChange(`${year}-${month}-${day}`);
                    } else if (Array.isArray(date) && date.length > 0 && date[0] instanceof Date) {
                      // Format as YYYY-MM-DD to avoid timezone conversion issues
                      // Use local date components to preserve the selected date
                      const d = date[0];
                      const year = d.getFullYear();
                      const month = String(d.getMonth() + 1).padStart(2, '0');
                      const day = String(d.getDate()).padStart(2, '0');
                      field.onChange(`${year}-${month}-${day}`);
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
