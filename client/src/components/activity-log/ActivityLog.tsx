import { format } from "date-fns";
import { 
  Activity, 
  UserPlus, 
  CreditCard, 
  FileText, 
  CheckCircle, 
  AlertCircle,
  FileEdit,
  Trash2
} from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

export type ActivityType = 'create' | 'update' | 'delete' | 'payment' | 'status_change' | 'login' | 'upload';

export interface ActivityLogItem {
  id: string;
  type: ActivityType;
  title: string;
  description: string;
  timestamp: string;
  user: {
    name: string;
    avatar?: string;
    role: string;
  };
  metadata?: Record<string, any>;
}

interface ActivityLogProps {
  activities: ActivityLogItem[];
  className?: string;
  maxHeight?: string;
}

export function ActivityLog({ activities, className, maxHeight = "400px" }: ActivityLogProps) {
  const getActivityIcon = (type: ActivityType) => {
    switch (type) {
      case 'create':
        return <UserPlus className="h-4 w-4 text-blue-500" />;
      case 'payment':
        return <CreditCard className="h-4 w-4 text-green-500" />;
      case 'status_change':
        return <CheckCircle className="h-4 w-4 text-orange-500" />;
      case 'upload':
        return <FileText className="h-4 w-4 text-purple-500" />;
      case 'update':
        return <FileEdit className="h-4 w-4 text-yellow-500" />;
      case 'delete':
        return <Trash2 className="h-4 w-4 text-red-500" />;
      default:
        return <Activity className="h-4 w-4 text-gray-500" />;
    }
  };

  const getActivityColor = (type: ActivityType) => {
    switch (type) {
      case 'create':
        return "bg-blue-100 border-blue-200";
      case 'payment':
        return "bg-green-100 border-green-200";
      case 'status_change':
        return "bg-orange-100 border-orange-200";
      case 'upload':
        return "bg-purple-100 border-purple-200";
      case 'update':
        return "bg-yellow-100 border-yellow-200";
      case 'delete':
        return "bg-red-100 border-red-200";
      default:
        return "bg-gray-100 border-gray-200";
    }
  };

  if (!activities || activities.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center text-muted-foreground bg-muted/20 rounded-lg border border-dashed">
        <Activity className="h-8 w-8 mb-2 opacity-50" />
        <p className="text-sm">No recent activity</p>
      </div>
    );
  }

  return (
    <ScrollArea className={cn("pr-4", className)} style={{ maxHeight }}>
      <div className="space-y-6">
        {activities.map((activity) => (
          <div key={activity.id} className="flex items-center gap-4 p-3 rounded-lg border bg-card text-card-foreground shadow-sm">
            <div className={cn(
              "flex h-10 w-10 shrink-0 items-center justify-center rounded-full border shadow-sm",
              getActivityColor(activity.type)
            )}>
              {getActivityIcon(activity.type)}
            </div>
            
            <div className="flex flex-1 items-center justify-between gap-4">
              <p className="text-sm font-medium text-foreground">
                {activity.title}
              </p>
              <span className="text-xs text-muted-foreground whitespace-nowrap bg-muted px-2 py-1 rounded-md">
                {format(new Date(activity.timestamp), "MMM d, h:mm a")}
              </span>
            </div>
          </div>
        ))}
      </div>
    </ScrollArea>
  );
}
