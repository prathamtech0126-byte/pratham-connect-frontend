import * as React from "react";
import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { SimpleCalendar } from "@/components/ui/simple-calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface DateInputProps {
  value?: Date;
  onChange?: (date?: Date) => void;
  className?: string;
  placeholder?: string;
  disabled?: boolean;
}

export function DateInput({
  value,
  onChange,
  className,
  placeholder = "Pick a date",
  disabled = false,
}: DateInputProps) {
  const [isOpen, setIsOpen] = React.useState(false);

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant={"outline"}
          className={cn(
            "w-full justify-start text-left font-normal",
            !value && "text-muted-foreground",
            className
          )}
          disabled={disabled}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {value ? format(value, "PPP") : <span>{placeholder}</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <SimpleCalendar
          value={value}
          onChange={(val) => {
            if (val instanceof Date) {
                onChange?.(val);
                setIsOpen(false);
            } else if (Array.isArray(val) && val.length > 0 && val[0] instanceof Date) {
                onChange?.(val[0]);
                setIsOpen(false);
            }
          }}
        />
      </PopoverContent>
    </Popover>
  );
}
