import { PageWrapper } from "@/layout/PageWrapper";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ActivityLog, ActivityLogItem } from "@/components/activity-log/ActivityLog";

export default function Activity() {
  // Hardcoded data to match the screenshot exactly for the simple prototype
  const activities: ActivityLogItem[] = [
    {
      id: "1",
      type: "create",
      title: "Sarah Manager enrolled new client Aarav Sharma",
      description: "",
      timestamp: "2024-12-09T12:39:00",
      user: {
        name: "Sarah Manager",
        role: "manager",
        avatar: ""
      }
    },
    {
      id: "2",
      type: "payment",
      title: "Super Admin received payment of ₹25,000",
      description: "",
      timestamp: "2024-12-09T11:09:00",
      user: {
        name: "Super Admin",
        role: "superadmin",
        avatar: ""
      }
    },
    {
      id: "3",
      type: "status_change",
      title: "Tom Lead updated status for Ishita Patel",
      description: "",
      timestamp: "2024-12-09T08:09:00",
      user: {
        name: "Tom Lead",
        role: "team_lead",
        avatar: ""
      }
    },
    {
      id: "4",
      type: "upload",
      title: "Dr. Counsellor uploaded document for Rohan Gupta",
      description: "",
      timestamp: "2024-12-08T13:09:00",
      user: {
        name: "Dr. Counsellor",
        role: "counsellor",
        avatar: ""
      }
    },
    {
      id: "5",
      type: "update",
      title: "Sarah Manager updated profile for Meera Iyer",
      description: "",
      timestamp: "2024-12-08T11:09:00",
      user: {
        name: "Sarah Manager",
        role: "manager",
        avatar: ""
      }
    },
    {
      id: "6",
      type: "create",
      title: "Dr. Counsellor added new lead",
      description: "",
      timestamp: "2024-12-09T12:54:00",
      user: {
        name: "Dr. Counsellor",
        role: "counsellor",
        avatar: ""
      }
    },
    {
      id: "7",
      type: "status_change",
      title: "Tom Lead submitted file for ST-002",
      description: "",
      timestamp: "2024-12-09T12:24:00",
      user: {
        name: "Tom Lead",
        role: "team_lead",
        avatar: ""
      }
    }
  ];

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
            Showing {activities.length} recent activities based on your role permissions.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ActivityLog activities={activities} maxHeight="calc(100vh - 300px)" />
        </CardContent>
      </Card>
    </PageWrapper>
  );
}
