import * as React from "react";
import { format } from "date-fns";
import { CalendarIcon, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { SimpleCalendar } from "@/components/ui/simple-calendar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
} from "@/components/ui/dropdown-menu";

type ValuePiece = Date | null;
type Value = ValuePiece | [ValuePiece, ValuePiece];

interface DashboardDateFilterProps {
  date?: [Date | null, Date | null];
  onDateChange?: (date: [Date | null, Date | null]) => void;
  className?: string;
  placeholder?: string;
  align?: "center" | "start" | "end";
}

export function DashboardDateFilter({
  date,
  onDateChange,
  className,
  placeholder = "Filter",
  align = "end",
}: DashboardDateFilterProps) {
  const [filterType, setFilterType] = React.useState<string>("Custom");
  const [tempDate, setTempDate] = React.useState<Value>(date || [null, null]);
  const [isOpen, setIsOpen] = React.useState(false);

  // Update temp date when prop changes
  React.useEffect(() => {
    if (date) {
      setTempDate(date);
    }
  }, [date]);

  const handleApplyCustom = () => {
    if (Array.isArray(tempDate) && onDateChange) {
      onDateChange(tempDate as [Date | null, Date | null]);
      setFilterType("Custom");
      setIsOpen(false);
    }
  };

  const handlePresetSelect = (type: string) => {
    setFilterType(type);
    // In a real app, you'd calculate the date range for the preset here
    // For now we just close the menu and update the label
    setIsOpen(false);
  };

  const displayText = React.useMemo(() => {
    if (filterType !== "Custom") return <span>{filterType}</span>;
    
    if (!date || !date[0]) return <span>{placeholder}</span>;
    if (date[0] && date[1]) {
      return (
        <>
          {format(date[0], "MMM dd")} - {format(date[1], "MMM dd, yyyy")}
        </>
      );
    }
    return format(date[0], "MMM dd, yyyy");
  }, [date, placeholder, filterType]);

  return (
    <div className={cn("grid gap-2", className)}>
      <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
        <DropdownMenuTrigger asChild>
          <Button
            id="date"
            variant={"outline"}
            size="sm"
            className={cn(
              "h-9 px-4 text-sm font-medium bg-white hover:bg-gray-50 border-gray-200 text-gray-700",
              !date && filterType === "Custom" && "text-muted-foreground"
            )}
          >
            {displayText}
            <CalendarIcon className="ml-2 h-4 w-4 text-gray-500" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-56" align={align}>
          <DropdownMenuItem onClick={() => handlePresetSelect("Daily")}>
            Daily
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => handlePresetSelect("Weekly")}>
            Weekly
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => handlePresetSelect("Monthly")}>
            Monthly
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => handlePresetSelect("Yearly")}>
            Yearly
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          
          <DropdownMenuSub>
            <DropdownMenuSubTrigger>Custom</DropdownMenuSubTrigger>
            <DropdownMenuSubContent className="p-0 bg-white border shadow-lg">
                <div className="p-3">
                    <SimpleCalendar
                        selectRange={true}
                        value={tempDate}
                        onChange={setTempDate}
                        showDoubleView={true}
                    />
                    <div className="flex justify-end gap-2 mt-2 pt-2 border-t">
                        <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={(e) => {
                                e.preventDefault();
                                setIsOpen(false);
                            }}
                        >
                            Cancel
                        </Button>
                        <Button 
                            size="sm" 
                            onClick={(e) => {
                                e.preventDefault();
                                handleApplyCustom();
                            }}
                        >
                            Apply
                        </Button>
                    </div>
                </div>
            </DropdownMenuSubContent>
          </DropdownMenuSub>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
