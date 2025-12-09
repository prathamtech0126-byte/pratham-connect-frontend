import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Calendar, CheckCircle2, AlertCircle } from "lucide-react";
import { format } from "date-fns";

interface PaymentCardProps {
  title: string;
  amount: number;
  date?: string;
  status: 'Paid' | 'Pending' | 'Overdue';
  className?: string;
  onPay?: () => void;
}

export function PaymentCard({ title, amount, date, status, className, onPay }: PaymentCardProps) {
  return (
    <Card className={cn("border-l-4 shadow-sm", 
      status === 'Paid' ? "border-l-green-500" : 
      status === 'Pending' ? "border-l-yellow-500" : 
      "border-l-red-500",
      className
    )}>
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start">
          <CardTitle className="text-base font-medium text-muted-foreground">{title}</CardTitle>
          <Badge variant={status === 'Paid' ? 'default' : status === 'Pending' ? 'secondary' : 'destructive'} 
            className={cn(
              status === 'Paid' && "bg-green-100 text-green-700 hover:bg-green-100",
              status === 'Pending' && "bg-yellow-100 text-yellow-700 hover:bg-yellow-100",
            )}
          >
            {status}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold tracking-tight">
          ₹ {amount.toLocaleString()}
        </div>
        {date && (
          <div className="flex items-center gap-1.5 mt-2 text-sm text-muted-foreground">
            <Calendar className="w-4 h-4" />
            <span>Due: {format(new Date(date), 'PPP')}</span>
          </div>
        )}
      </CardContent>
      {status !== 'Paid' && onPay && (
        <CardFooter className="pt-2">
          <Button size="sm" className="w-full" onClick={onPay}>
            Mark as Paid
          </Button>
        </CardFooter>
      )}
    </Card>
  );
}
