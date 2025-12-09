import { PageWrapper } from "@/layout/PageWrapper";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ActivityLog, ActivityLogItem } from "@/components/activity-log/ActivityLog";

export default function Activity() {
  // Hardcoded data to match the screenshot exactly for the simple prototype
  const activities: ActivityLogItem[] = [
    {
      id: "1",
      type: "create",
      title: "New Client Enrolled",
      description: "Added Aarav Sharma to Consultancy program",
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
      title: "Payment Received",
      description: "Received ₹25,000 from Aarav Sharma for initial deposit",
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
      title: "Application Status Updated",
      description: "Changed Ishita Patel status from Pending to Active",
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
      title: "Document Uploaded",
      description: "Uploaded Passport copy for Rohan Gupta",
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
      title: "Profile Updated",
      description: "Updated contact details for Meera Iyer",
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
      title: "New Lead Added",
      description: "Added new lead via phone enquiry",
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
      title: "File Submitted",
      description: "Submitted visa application for ST-002",
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
