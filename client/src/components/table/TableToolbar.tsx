import { cn } from "@/lib/utils";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface TableToolbarProps {
  searchPlaceholder?: string;
  onSearch?: (value: string) => void;
  filters?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}

export function TableToolbar({ searchPlaceholder = "Search...", onSearch, filters, actions, className }: TableToolbarProps) {
  return (
    <div className={cn("flex flex-col md:flex-row items-start md:items-center justify-between gap-4 py-4", className)}>
      <div className="flex flex-1 items-center space-x-2 w-full md:w-auto">
        <div className="relative w-full md:max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={searchPlaceholder}
            className="pl-8"
            onChange={(e) => onSearch?.(e.target.value)}
          />
        </div>
        {filters}
      </div>
      <div className="flex items-center gap-2 w-full md:w-auto justify-end">
        {actions}
      </div>
    </div>
  );
}
