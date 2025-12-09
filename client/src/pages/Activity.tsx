import { PageWrapper } from "@/layout/PageWrapper";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ActivityLog, ActivityLogItem } from "@/components/activity-log/ActivityLog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function Activity() {
  // Hardcoded data to match the screenshot exactly for the simple prototype
  const activities: ActivityLogItem[] = [
    {
      id: "1",
      type: "create",
      title: "Sarah Manager enrolled new client Aarav Sharma",
      description: "Added to Consultancy program",
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
      description: "Initial deposit",
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
      description: "Changed from Pending to Active",
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
      description: "Passport copy uploaded",
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
      description: "Contact details updated",
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
      description: "Via phone enquiry",
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
      description: "Visa application submitted",
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

      <Tabs defaultValue="cards" className="w-full">
        <div className="flex items-center justify-between mb-4">
           <TabsList>
            <TabsTrigger value="cards">Style 1: Cards</TabsTrigger>
            <TabsTrigger value="minimal">Style 2: Minimal List</TabsTrigger>
            <TabsTrigger value="table">Style 3: Compact Table</TabsTrigger>
            <TabsTrigger value="timeline">Style 4: Timeline</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="cards">
          <Card className="border-none shadow-sm">
            <CardHeader>
              <CardTitle className="text-subheader">Activity History - Cards</CardTitle>
              <CardDescription>
                Clean, separated cards for each activity. Best for readability.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ActivityLog activities={activities} variant="cards" maxHeight="calc(100vh - 350px)" />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="minimal">
          <Card className="border-none shadow-sm">
            <CardHeader>
              <CardTitle className="text-subheader">Activity History - Minimal</CardTitle>
              <CardDescription>
                Simple list view. Best for high-density information.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ActivityLog activities={activities} variant="minimal" maxHeight="calc(100vh - 350px)" />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="table">
          <Card className="border-none shadow-sm">
            <CardHeader>
              <CardTitle className="text-subheader">Activity History - Table</CardTitle>
              <CardDescription>
                Structured rows. Best for scanning data quickly.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ActivityLog activities={activities} variant="table" maxHeight="calc(100vh - 350px)" />
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="timeline">
          <Card className="border-none shadow-sm">
            <CardHeader>
              <CardTitle className="text-subheader">Activity History - Timeline</CardTitle>
              <CardDescription>
                Classic timeline view. Best for showing sequence of events.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ActivityLog activities={activities} variant="timeline" maxHeight="calc(100vh - 350px)" />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </PageWrapper>
  );
}
