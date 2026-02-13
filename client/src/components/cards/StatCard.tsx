import { LucideIcon, IndianRupee } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface StatCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  className?: string;
  description?: string;
}

export function StatCard({ title, value, icon: Icon, trend, className, description }: StatCardProps) {
  return (
    <Card className={cn("overflow-hidden border-none shadow-sm hover:shadow-md transition-shadow bg-card", className)}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 gap-3">
        <CardTitle className="text-sm font-medium text-muted-foreground flex-1 min-w-0">
          {title}
        </CardTitle>
        <div className="flex items-center gap-2.5 flex-shrink-0">
          {trend && (
            <span className={cn("text-sm font-semibold whitespace-nowrap leading-none", trend.isPositive ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400")}>
              {trend.isPositive ? "+" : ""}{trend.value}%
            </span>
          )}
          <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary flex-shrink-0">
            <Icon className="h-4 w-4" />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold tracking-tight text-foreground">{value}</div>
        {description && (
          <p className="text-xs text-muted-foreground mt-1">
            {description}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
