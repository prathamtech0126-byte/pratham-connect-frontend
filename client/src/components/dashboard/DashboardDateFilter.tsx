// import * as React from "react";
// import { cn } from "@/lib/utils";

// interface DashboardDateFilterProps {
//   activeTab?: string;
//   onTabChange?: (tab: string) => void;
//   className?: string;
//   align?: "center" | "start" | "end";
// }

// export function DashboardDateFilter({
//   activeTab: controlledTab,
//   onTabChange,
//   className,
//   align = "end",
// }: DashboardDateFilterProps) {
//   const [internalTab, setInternalTab] = React.useState<string>("Today");
//   const activeTab = controlledTab !== undefined ? controlledTab : internalTab;

//   const handleTabClick = (tab: string) => {
//     if (onTabChange) {
//         onTabChange(tab);
//     } else {
//         setInternalTab(tab);
//     }
//   };

//   return (
//     <div className={cn("flex items-center bg-muted/50 p-1 rounded-lg border border-border/50", className)}>
//       {(["Today", "Weekly", "Monthly", "Yearly", "Custom"] as const).map((tab) => (
//         <button
//           key={tab}
//           onClick={() => handleTabClick(tab)}
//           className={cn(
//             "px-3 py-1.5 text-sm font-medium rounded-md transition-all",
//             activeTab === tab
//               ? "bg-primary text-primary-foreground shadow-sm"
//               : "text-muted-foreground hover:text-foreground hover:bg-muted"
//           )}
//         >
//           {tab}
//         </button>
//       ))}
//     </div>
//   );
// }
import * as React from "react";
import { format, parseISO } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import DateRangePicker from "@/components/payments/DateRangePicker";


interface DashboardDateFilterProps {
  date?: [Date | null, Date | null];
  onDateChange?: (date: [Date | null, Date | null]) => void;
  activeTab?: string;
  onTabChange?: (tab: string) => void;
  className?: string;
  placeholder?: string;
  align?: "center" | "start" | "end";
  showCustom?: boolean;
  showYearly?: boolean;
}

export function DashboardDateFilter({
  date,
  onDateChange,
  activeTab: controlledTab,
  onTabChange,
  className,
  placeholder = "Filter",
  align = "end",
  showCustom = true,
  showYearly = true,
}: DashboardDateFilterProps) {
  const [internalTab, setInternalTab] = React.useState<string>("Custom");
  const activeTab = controlledTab !== undefined ? controlledTab : internalTab;
  const setIsOpen = (open: boolean) => {
    if (open) {
        // Only allow opening if it's custom tab
        if (activeTab === "Custom") {
             _setIsOpen(open);
        }
    } else {
        _setIsOpen(open);
    }
  }
  const [isOpen, _setIsOpen] = React.useState(false);

  const handleTabClick = (tab: string) => {
    if (tab === "Custom") {
      setInternalTab("Custom");
      _setIsOpen(true);
      return;
    }
    if (onTabChange) {
      onTabChange(tab);
    } else {
      setInternalTab(tab);
    }
    _setIsOpen(false);
  };

  const handleCustomClick = () => {
    setInternalTab("Custom");
    _setIsOpen(true);
  };

  const handlePickerApply = (filter: string, startDate?: string, endDate?: string) => {
    if (filter !== "custom") {
      // presets like today/monthly/maximum — map to closest tab or treat as custom with no range
      if (onTabChange) onTabChange("Custom");
      if (onDateChange) onDateChange([null, null]);
    } else if (startDate && endDate) {
      if (onTabChange) onTabChange("Custom");
      if (onDateChange) onDateChange([parseISO(startDate), parseISO(endDate)]);
    }
    _setIsOpen(false);
  };

  const handlePickerCancel = () => {
    _setIsOpen(false);
  };

  const getCustomButtonText = () => {
    if (activeTab === "Custom" && date?.[0] && date?.[1]) {
      return `${format(date[0], "MMM d")} - ${format(date[1], "MMM d")}`;
    }
    if (activeTab === "Custom" && date?.[0]) {
      return `After ${format(date[0], "MMM d")}`;
    }
    if (activeTab === "Custom" && date?.[1]) {
      return `Before ${format(date[1], "MMM d")}`;
    }
    return "Custom";
  };

  return (
    <div className={cn("flex items-center bg-muted/50 p-1 rounded-lg border border-border/50", className)}>
      {(["Today", "Weekly", "Monthly", "Yearly"] as const)
        .filter((tab) => (showYearly ? true : tab !== "Yearly"))
        .map((tab) => (
        <button
          key={tab}
          onClick={() => handleTabClick(tab)}
          className={cn(
            "px-3 py-1.5 text-sm font-medium rounded-md transition-all",
            activeTab === tab
              ? "bg-primary text-primary-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground hover:bg-muted"
          )}
        >
          {tab}
        </button>
      ))}

      {showCustom && (
        <Popover open={isOpen} onOpenChange={_setIsOpen}>
          <PopoverTrigger asChild>
            <button
              onClick={handleCustomClick}
              className={cn(
                "px-3 py-1.5 text-sm font-medium rounded-md transition-all flex items-center gap-2",
                activeTab === "Custom"
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              )}
            >
              {getCustomButtonText()} <CalendarIcon className={cn("h-3.5 w-3.5", activeTab === "Custom" ? "text-primary-foreground" : "text-muted-foreground")} />
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align={align}>
            <DateRangePicker
              onApply={handlePickerApply}
              onCancel={handlePickerCancel}
            />
          </PopoverContent>
        </Popover>
      )}
    </div>
  );
}
