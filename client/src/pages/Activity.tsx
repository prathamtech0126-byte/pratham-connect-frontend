import { PageWrapper } from "@/layout/PageWrapper";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { DataTable } from "@/components/table/DataTable";
import { TableToolbar } from "@/components/table/TableToolbar";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { format } from "date-fns";
import { useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  UserPlus, 
  CreditCard, 
  FileText, 
  Upload, 
  RefreshCw, 
  CheckCircle2,
  AlertCircle,
  X
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface ActivityLogItem {
  id: string;
  type: "create" | "payment" | "status_change" | "upload" | "update";
  title: string;
  description: string;
  timestamp: string;
  user: {
    name: string;
    role: string;
    avatar: string;
  };
}

export default function Activity() {
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [roleFilter, setRoleFilter] = useState("all");

  const handleClearFilters = () => {
    setTypeFilter("all");
    setRoleFilter("all");
  };

  const isFilterActive = typeFilter !== "all" || roleFilter !== "all";

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
      title: "Tom Lead submitted file for CL-002",
      description: "Visa application submitted",
      timestamp: "2024-12-09T12:24:00",
      user: {
        name: "Tom Lead",
        role: "team_lead",
        avatar: ""
      }
    }
  ];

  const filteredActivities = activities.filter(item => {
    const matchesSearch = 
      item.title.toLowerCase().includes(search.toLowerCase()) || 
      item.description.toLowerCase().includes(search.toLowerCase()) ||
      item.user.name.toLowerCase().includes(search.toLowerCase());
      
    const matchesType = typeFilter === "all" || item.type === typeFilter;
    const matchesRole = roleFilter === "all" || item.user.role === roleFilter;

    return matchesSearch && matchesType && matchesRole;
  });

  const uniqueRoles = Array.from(new Set(activities.map(a => a.user.role))).sort();

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "create": return <UserPlus className="h-4 w-4 text-blue-500" />;
      case "payment": return <CreditCard className="h-4 w-4 text-green-500" />;
      case "status_change": return <CheckCircle2 className="h-4 w-4 text-orange-500" />;
      case "upload": return <Upload className="h-4 w-4 text-purple-500" />;
      case "update": return <RefreshCw className="h-4 w-4 text-indigo-500" />;
      default: return <FileText className="h-4 w-4 text-gray-500" />;
    }
  };

  const getTypeBadge = (type: string) => {
    switch (type) {
      case "create": return <Badge variant="outline" className="text-blue-600 border-blue-200 bg-blue-50">New Entry</Badge>;
      case "payment": return <Badge variant="outline" className="text-green-600 border-green-200 bg-green-50">Payment</Badge>;
      case "status_change": return <Badge variant="outline" className="text-orange-600 border-orange-200 bg-orange-50">Status</Badge>;
      case "upload": return <Badge variant="outline" className="text-purple-600 border-purple-200 bg-purple-50">Upload</Badge>;
      case "update": return <Badge variant="outline" className="text-indigo-600 border-indigo-200 bg-indigo-50">Update</Badge>;
      default: return <Badge variant="outline">Activity</Badge>;
    }
  };

  const columns = [
    { 
      header: "User", 
      cell: (item: ActivityLogItem) => (
        <div className="flex items-center gap-3">
          <Avatar className="h-8 w-8">
            <AvatarImage src={item.user.avatar} />
            <AvatarFallback className="bg-primary/10 text-primary text-xs">
              {item.user.name.split(' ').map(n => n[0]).join('').substring(0, 2)}
            </AvatarFallback>
          </Avatar>
          <div className="flex flex-col">
            <span className="text-sm font-medium">{item.user.name}</span>
            <span className="text-xs text-muted-foreground capitalize">{item.user.role.replace('_', ' ')}</span>
          </div>
        </div>
      ),
      className: "w-[250px]"
    },
    { 
      header: "Type", 
      cell: (item: ActivityLogItem) => (
        <div className="flex items-center gap-2">
          {getTypeIcon(item.type)}
          {getTypeBadge(item.type)}
        </div>
      ),
      className: "w-[150px]"
    },
    { 
      header: "Activity", 
      cell: (item: ActivityLogItem) => (
        <div className="flex flex-col">
          <span className="text-sm font-medium">{item.title}</span>
          <span className="text-xs text-muted-foreground">{item.description}</span>
        </div>
      )
    },
    { 
      header: "Date & Time", 
      cell: (item: ActivityLogItem) => (
        <div className="flex flex-col">
          <span className="text-sm">{format(new Date(item.timestamp), "MMM d, yyyy")}</span>
          <span className="text-xs text-muted-foreground">{format(new Date(item.timestamp), "h:mm a")}</span>
        </div>
      ),
      className: "w-[150px] text-right"
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
            Showing {filteredActivities.length} recent activities based on your role permissions.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <TableToolbar 
              searchPlaceholder="Search activity..."
              onSearch={setSearch}
              filters={
                <div className="flex items-center gap-2">
                  <Select value={typeFilter} onValueChange={setTypeFilter}>
                    <SelectTrigger className="w-[150px] bg-white">
                      <SelectValue placeholder="Activity Type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Types</SelectItem>
                      <SelectItem value="create">New Entry</SelectItem>
                      <SelectItem value="payment">Payment</SelectItem>
                      <SelectItem value="status_change">Status Change</SelectItem>
                      <SelectItem value="upload">Upload</SelectItem>
                      <SelectItem value="update">Update</SelectItem>
                    </SelectContent>
                  </Select>

                  <Select value={roleFilter} onValueChange={setRoleFilter}>
                    <SelectTrigger className="w-[150px] bg-white">
                      <SelectValue placeholder="User Role" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Roles</SelectItem>
                      {uniqueRoles.map(role => (
                        <SelectItem key={role} value={role} className="capitalize">
                          {role.replace('_', ' ')}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  {isFilterActive && (
                    <Button 
                      variant="outline" 
                      onClick={handleClearFilters}
                      className="bg-white text-red-500 hover:text-red-600 hover:bg-red-50 border-red-200"
                    >
                      Clear All
                      <X className="ml-2 h-4 w-4" />
                    </Button>
                  )}
                </div>
              }
            />
            
            <DataTable 
              data={filteredActivities} 
              columns={columns} 
            />
          </div>
        </CardContent>
      </Card>
    </PageWrapper>
  );
}
