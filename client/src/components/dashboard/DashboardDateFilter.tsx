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
  activeTab?: string;
  onTabChange?: (tab: string) => void;
  className?: string;
  placeholder?: string;
  align?: "center" | "start" | "end";
}

export function DashboardDateFilter({
  date,
  onDateChange,
  activeTab: controlledTab,
  onTabChange,
  className,
  placeholder = "Filter",
  align = "end",
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
    if (tab === "Custom") {
      // Only open popover, no dashboard change
      setInternalTab("Custom");
      _setIsOpen(true);
      return;
    }

    // Normal tabs
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

  const handleApplyCustom = () => {
    if (onTabChange) {
      onTabChange("Custom"); // 🔥 dashboard updates here
    }

    if (onDateChange) {
      onDateChange([startDate || null, endDate || null]);
    }

    _setIsOpen(false);
  };

  const handleCancelCustom = () => {
    // Reset to props
    setStartDate(date?.[0] || undefined);
    setEndDate(date?.[1] || undefined);
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
      {(["Today", "Weekly", "Monthly", "Yearly"] as const).map((tab) => (
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
        <PopoverContent className="w-80 p-0" align={align}>
          <div className="p-4 space-y-4 bg-card rounded-lg shadow-lg border border-border">
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-primary">After</label>
                <div className="relative">
                    <DateInput
                        value={startDate}
                        onChange={setStartDate}
                        placeholder="Select start date"
                        className="border-primary ring-1 ring-primary bg-background text-foreground placeholder:text-muted-foreground"
                    />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium text-foreground">Before</label>
                <div className="relative">
                    <DateInput
                        value={endDate}
                        onChange={setEndDate}

                        placeholder="Select end date"
                        className="bg-background text-foreground placeholder:text-muted-foreground"
                    />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-border mt-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleCancelCustom}
                className="text-muted-foreground hover:text-foreground"
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleApplyCustom}
                className="bg-primary hover:bg-primary/90 text-primary-foreground"
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
