import { Control, Controller, FieldValues, Path } from "react-hook-form";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { useState } from "react";

interface FormDateInputProps<T extends FieldValues> {
  name: Path<T>;
  control: Control<T>;
  label: string;
  className?: string;
}

export function FormDateInput<T extends FieldValues>({
  name,
  control,
  label,
  className,
}: FormDateInputProps<T>) {
  const [isOpen, setIsOpen] = useState(false);
  
  return (
    <Controller
      name={name}
      control={control}
      render={({ field, fieldState: { error } }) => {
        // Local state for the selected date inside the popover
        // We initialize it with the field value whenever the popover opens/renders
        const [tempDate, setTempDate] = useState<Date | undefined>(
          field.value ? new Date(field.value) : undefined
        );

        const handleConfirm = () => {
          if (tempDate) {
            field.onChange(tempDate.toISOString());
          } else {
             // If they cleared it or nothing selected, we might want to allow clearing?
             // For now, if tempDate is undefined, maybe clear the field?
             // But the UI in the image implies "Confirm" selects the date.
             // If nothing selected, maybe just close? Or clear?
             // Let's assume clearing is allowed if undefined.
             // But usually required fields need value.
             // If undefined, let's just close for now or handle clear if needed.
             // Actually field.onChange accepts undefined/null usually if schema allows.
          }
          setIsOpen(false);
        };

        return (
          <div className={cn("space-y-2", className)}>
            <Label className={cn(error && "text-destructive")}>{label}</Label>
            <Popover open={isOpen} onOpenChange={(open) => {
              setIsOpen(open);
              if (open) {
                 setTempDate(field.value ? new Date(field.value) : undefined);
              }
            }}>
              <PopoverTrigger asChild>
                <Button
                  variant={"outline"}
                  className={cn(
                    "w-full pl-3 text-left font-normal",
                    !field.value && "text-muted-foreground",
                    error && "border-destructive text-destructive"
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
              <PopoverContent className="w-auto p-0 rounded-xl overflow-hidden" align="start">
                <div className="bg-white p-0">
                   <Calendar
                    mode="single"
                    selected={tempDate}
                    onSelect={setTempDate}
                    disabled={(date) =>
                      date > new Date("2100-01-01") || date < new Date("1900-01-01")
                    }
                    initialFocus
                    captionLayout="dropdown"
                    fromYear={1960}
                    toYear={2030}
                    className="p-3"
                  />
                  <div className="flex items-center justify-between p-3 border-t bg-gray-50/50">
                    <Button 
                      variant="ghost" 
                      className="text-red-500 hover:text-red-600 hover:bg-red-50 h-8 px-4"
                      onClick={() => setIsOpen(false)}
                    >
                      Close
                    </Button>
                    <Button 
                      className="bg-[#dcfce7] text-[#166534] hover:bg-[#bbf7d0] h-8 px-6 font-medium"
                      onClick={() => {
                        if (tempDate) {
                          field.onChange(tempDate.toISOString());
                        }
                        setIsOpen(false);
                      }}
                    >
                      Confirm
                    </Button>
                  </div>
                </div>
              </PopoverContent>
            </Popover>
            {error && (
              <p className="text-xs font-medium text-destructive">{error.message}</p>
            )}
          </div>
        );
      }}
    />
  );
}
