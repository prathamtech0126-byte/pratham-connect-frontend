import { PageWrapper } from "@/layout/PageWrapper";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { studentService } from "@/services/studentService";
import { ActivityLog } from "@/components/activity-log/ActivityLog";
import { useAuth } from "@/context/auth-context";

export default function Activity() {
  const { user } = useAuth();
  
  const { data: activities } = useQuery({
    queryKey: ['activity-log-page'],
    queryFn: studentService.getRecentActivities
  });

  // Filter activities based on user role
  const filteredActivities = activities?.filter(activity => {
    if (!user) return false;
    
    switch (user.role) {
      case 'superadmin':
        // Super Admin sees everything
        return true;
        
      case 'director':
        // Director sees Manager, Team Lead, Counsellor (and themselves)
        return ['manager', 'team_lead', 'counsellor', 'director'].includes(activity.user.role);
        
      case 'manager':
        // Manager sees Team Lead, Counsellor (and themselves)
        return ['team_lead', 'counsellor', 'manager'].includes(activity.user.role);
        
      case 'team_lead':
        // Team Lead sees Counsellor (and themselves)
        return ['counsellor', 'team_lead'].includes(activity.user.role);
        
      case 'counsellor':
        // Counsellor only sees their own logs
        return activity.user.role === 'counsellor' && activity.user.name === user.name;
        
      default:
        return false;
    }
  });

  return (
    <PageWrapper title="Activity Log">
      <div className="mb-6">
        <h2 className="text-2xl font-bold tracking-tight">System Activity</h2>
        <p className="text-muted-foreground">
          View recent actions and updates across the system.
        </p>
      </div>

      <Card className="border-none shadow-sm">
        <CardHeader>
          <CardTitle className="text-subheader">Activity History</CardTitle>
          <CardDescription>
            Showing {filteredActivities?.length || 0} recent activities based on your role permissions.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ActivityLog activities={filteredActivities || []} maxHeight="calc(100vh - 300px)" />
        </CardContent>
      </Card>
    </PageWrapper>
  );
}
