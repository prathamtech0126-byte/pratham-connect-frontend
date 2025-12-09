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

type ValuePiece = Date | null;
type Value = ValuePiece | [ValuePiece, ValuePiece];

interface DateRangeFilterProps {
  date?: [Date | null, Date | null];
  onDateChange?: (date: [Date | null, Date | null]) => void;
  className?: string;
  placeholder?: string;
}

export function DateRangeFilter({
  date,
  onDateChange,
  className,
  placeholder = "Pick a date range",
}: DateRangeFilterProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const [tempDate, setTempDate] = React.useState<Value>(date || [null, null]);

  // Update temp date when prop changes
  React.useEffect(() => {
    if (date) {
        setTempDate(date);
    }
  }, [date]);

  const handleApply = () => {
    if (Array.isArray(tempDate) && onDateChange) {
        onDateChange(tempDate as [Date | null, Date | null]);
    }
    setIsOpen(false);
  };

  const displayText = React.useMemo(() => {
    if (!date || !date[0]) return <span>{placeholder}</span>;
    if (date[0] && date[1]) {
      return (
        <>
          {format(date[0], "MMM dd, yyyy")} - {format(date[1], "MMM dd, yyyy")}
        </>
      );
    }
    return format(date[0], "MMM dd, yyyy");
  }, [date, placeholder]);

  return (
    <div className={cn("grid gap-2", className)}>
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button
            id="date"
            variant={"outline"}
            className={cn(
              "w-[260px] justify-start text-left font-normal",
              !date && "text-muted-foreground"
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {displayText}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
            <div className="p-3 bg-white rounded-lg shadow-sm border">
                <SimpleCalendar
                    selectRange={true}
                    value={tempDate}
                    onChange={setTempDate}
                />
                <div className="flex justify-end gap-2 mt-2 pt-2 border-t">
                    <Button variant="ghost" size="sm" onClick={() => setIsOpen(false)}>Cancel</Button>
                    <Button size="sm" onClick={handleApply}>Apply</Button>
                </div>
            </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
