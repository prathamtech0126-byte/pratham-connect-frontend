import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

interface InfoItem {
  label: string;
  value: string | number | React.ReactNode;
  icon?: LucideIcon;
}

interface InfoCardProps {
  title: string;
  items: InfoItem[];
  columns?: 1 | 2 | 3;
  className?: string;
  action?: React.ReactNode;
}

export function InfoCard({ title, items, columns = 2, className, action }: InfoCardProps) {
  return (
    <Card className={cn("h-full border-none shadow-sm", className)}>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-subheader">{title}</CardTitle>
        {action && <div>{action}</div>}
      </CardHeader>
      <CardContent>
        <div className={cn(
          "grid gap-4 md:gap-6",
          columns === 1 ? "grid-cols-1" : 
          columns === 2 ? "grid-cols-1 md:grid-cols-2" : 
          "grid-cols-1 md:grid-cols-3"
        )}>
          {items.map((item, index) => (
            <div key={index} className="space-y-1">
              <p className="text-paragraph text-sm text-muted-foreground flex items-center gap-2">
                {item.icon && <item.icon className="w-3.5 h-3.5" />}
                {item.label}
              </p>
              <div className="text-paragraph font-medium md:text-base break-words">
                {item.value || "—"}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
