import * as React from "react";
import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { DateInput } from "@/components/ui/date-input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

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
  const [activeTab, setActiveTab] = React.useState<string>("Custom");
  const [isOpen, setIsOpen] = React.useState(false);
  
  // Custom date range state
  const [startDate, setStartDate] = React.useState<Date | undefined>(date?.[0] || undefined);
  const [endDate, setEndDate] = React.useState<Date | undefined>(date?.[1] || undefined);

  // Update local state when prop changes
  React.useEffect(() => {
    if (date) {
      setStartDate(date[0] || undefined);
      setEndDate(date[1] || undefined);
    }
  }, [date]);

  const handleTabClick = (tab: string) => {
    setActiveTab(tab);
    if (tab === "Custom") {
      setIsOpen(true);
    } else {
      // Logic for other tabs would go here (e.g. set date range for 'Daily')
      setIsOpen(false); 
    }
  };

  const handleApplyCustom = () => {
    if (onDateChange) {
      onDateChange([startDate || null, endDate || null]);
    }
    setIsOpen(false);
  };

  const handleCancelCustom = () => {
    // Reset to props
    setStartDate(date?.[0] || undefined);
    setEndDate(date?.[1] || undefined);
    setIsOpen(false);
  };

  return (
    <div className={cn("flex items-center bg-gray-100/50 p-1 rounded-lg border border-gray-200", className)}>
      {(["Daily", "Weekly", "Monthly", "Yearly"] as const).map((tab) => (
        <button
          key={tab}
          onClick={() => handleTabClick(tab)}
          className={cn(
            "px-3 py-1.5 text-sm font-medium rounded-md transition-all",
            activeTab === tab
              ? "bg-orange-600 text-white shadow-sm"
              : "text-gray-600 hover:text-gray-900 hover:bg-gray-200/50"
          )}
        >
          {tab}
        </button>
      ))}

      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <button
            onClick={() => setActiveTab("Custom")}
            className={cn(
              "px-3 py-1.5 text-sm font-medium rounded-md transition-all flex items-center gap-2",
              activeTab === "Custom"
                ? "bg-orange-600 text-white shadow-sm"
                : "text-gray-600 hover:text-gray-900 hover:bg-gray-200/50"
            )}
          >
            Custom {activeTab === "Custom" ? <CalendarIcon className="h-3.5 w-3.5 text-white" /> : <CalendarIcon className="h-3.5 w-3.5" />}
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-80 p-0" align={align}>
          <div className="p-4 space-y-4 bg-white rounded-lg shadow-lg border">
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-blue-600">After</label>
                <div className="relative">
                    <DateInput 
                        value={startDate} 
                        onChange={setStartDate} 
                        placeholder="Select start date"
                        className="border-blue-600 ring-1 ring-blue-600"
                    />
                </div>
              </div>
              
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-gray-700">Before</label>
                <div className="relative">
                    <DateInput 
                        value={endDate} 
                        onChange={setEndDate} 
                        placeholder="Select end date"
                    />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t mt-4">
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={handleCancelCustom}
                className="text-gray-500 hover:text-gray-700"
              >
                Cancel
              </Button>
              <Button 
                size="sm" 
                onClick={handleApplyCustom}
                className="bg-orange-600 hover:bg-orange-700 text-white"
              >
                Apply
              </Button>
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
