import { PageWrapper } from "@/layout/PageWrapper";
import { StatCard } from "@/components/cards/StatCard";
import { Users, DollarSign, Clock, CreditCard, TrendingUp, UserPlus, ShieldAlert, Activity } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip } from "recharts";
import { useQuery } from "@tanstack/react-query";
import { clientService } from "@/services/clientService";
import { DataTable } from "@/components/table/DataTable";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/context/auth-context";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ActivityLog } from "@/components/activity-log/ActivityLog";
import { useState } from "react";

const chartData = [
  { name: "Jan", total: 12000 },
  { name: "Feb", total: 18000 },
  { name: "Mar", total: 25000 },
  { name: "Apr", total: 21000 },
  { name: "May", total: 32000 },
  { name: "Jun", total: 45000 },
];

import { RevenueChart } from "@/components/charts/RevenueChart";

export default function Dashboard() {
  const { user } = useAuth();
  const [dateRange, setDateRange] = useState<[Date | null, Date | null]>([null, null]);

  const { data: stats } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: clientService.getDashboardStats
  });

  const { data: recentClients } = useQuery({
    queryKey: ['recent-clients'],
    queryFn: clientService.getClients
  });

  const { data: activities } = useQuery({
    queryKey: ['dashboard-activities'],
    queryFn: clientService.getRecentActivities
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

  const canViewFinancials = user?.role === 'superadmin' || user?.role === 'director' || user?.role === 'manager';
  const canCreateUsers = user?.role === 'superadmin' || user?.role === 'director' || user?.role === 'manager';

  return (
    <PageWrapper title={`Dashboard`}>
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-6 gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Welcome back, {user?.name}</h2>
          <p className="text-muted-foreground">
            Here's an overview of your {user?.role.replace('_', ' ')} dashboard.
          </p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Clients"
          value={stats?.totalClients || 0}
          icon={Users}
          trend={{ value: 12, isPositive: true }}
          description="from last month"
        />
        
        {canViewFinancials ? (
          <>
            <StatCard
              title="Total Revenue"
              value={`₹${(stats?.totalReceived || 0).toLocaleString()}`}
              icon={DollarSign}
              trend={{ value: 8, isPositive: true }}
              description="from last month"
            />
            <StatCard
              title="Pending Amount"
              value={`₹${(stats?.totalPending || 0).toLocaleString()}`}
              icon={Clock}
              description="across all clients"
              className="border-l-4 border-l-yellow-500"
            />
          </>
        ) : (
          <>
            <StatCard
              title="Active Cases"
              value={42}
              icon={Activity}
              trend={{ value: 5, isPositive: true }}
              description="currently processing"
            />
            <StatCard
              title="Pending Actions"
              value={7}
              icon={ShieldAlert}
              description="require attention"
              className="border-l-4 border-l-red-500"
            />
          </>
        )}
        
        <StatCard
          title="Today's Enrollments"
          value={stats?.todaysEnrollments || 0}
          icon={UserPlus}
          description="new clients today"
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7 mt-6">
        {canViewFinancials ? (
            <div className="col-span-4">
                <RevenueChart />
            </div>
        ) : (
          <Card className="col-span-4 border-none shadow-sm">
            <CardHeader>
              <CardTitle className="text-subheader">Team Performance</CardTitle>
              <CardDescription>Monthly client enrollment trends</CardDescription>
            </CardHeader>
            <CardContent className="pl-2">
              <ResponsiveContainer width="100%" height={350}>
                <BarChart data={chartData}>
                  <XAxis
                    dataKey="name"
                    stroke="#888888"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    stroke="#888888"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip 
                    cursor={{ fill: 'transparent' }}
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                  />
                  <Bar dataKey="total" name="Enrollments" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}
        
        <Card className="col-span-3 border-none shadow-sm">
          <CardHeader>
            <CardTitle className="text-subheader">Recent Clients</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-8">
              {recentClients?.slice(0, 5).map((client) => (
                <div key={client.id} className="flex items-center">
                  <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm">
                    {client.name.charAt(0)}
                  </div>
                  <div className="ml-4 space-y-1">
                    <p className="text-paragraph text-sm font-medium leading-none">{client.name}</p>
                    <p className="text-paragraph text-xs text-muted-foreground">{client.salesType}</p>
                  </div>
                  <div className="ml-auto font-medium text-sm">
                    <Badge variant={client.status === 'Active' ? 'default' : 'secondary'}>
                      {client.status}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="mt-6">
        <Card className="border-none shadow-sm">
          <CardHeader>
            <CardTitle className="text-subheader">
              {canViewFinancials ? "Recent Payments" : "Recent Enrollments"}
            </CardTitle>
          </CardHeader>
          <CardContent>
             <DataTable 
               data={recentClients?.slice(0, 5) || []}
               columns={[
                 { header: "Client", accessorKey: "name", className: "font-medium" },
                 { header: "Date", accessorKey: "enrollmentDate" },
                 ...(canViewFinancials ? [{ header: "Amount", cell: (s: any) => `₹${s.amountReceived.toLocaleString()}` }] : []),
                 { header: "Status", cell: () => <Badge className="bg-green-100 text-green-700 hover:bg-green-100 border-none">Active</Badge> },
               ]}
             />
          </CardContent>
        </Card>
      </div>
    </PageWrapper>
  );
}
