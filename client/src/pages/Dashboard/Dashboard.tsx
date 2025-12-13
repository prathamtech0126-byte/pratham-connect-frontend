import { PageWrapper } from "@/layout/PageWrapper";
import { StatCard } from "@/components/cards/StatCard";
import { Users, DollarSign, Clock, CreditCard, TrendingUp, UserPlus, ShieldAlert, Activity, ArrowUpRight, ArrowRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip, Area, AreaChart, CartesianGrid } from "recharts";
import { useQuery } from "@tanstack/react-query";
import { clientService, Client } from "@/services/clientService";
import { DataTable } from "@/components/table/DataTable";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/context/auth-context";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ActivityLog } from "@/components/activity-log/ActivityLog";
import { useState } from "react";
import { Button } from "@/components/ui/button";

const chartData = [
  { name: "Jan", total: 12000 },
  { name: "Feb", total: 18000 },
  { name: "Mar", total: 25000 },
  { name: "Apr", total: 21000 },
  { name: "May", total: 32000 },
  { name: "Jun", total: 45000 },
];

import { RevenueChart } from "@/components/charts/RevenueChart";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function Dashboard() {
  const { user } = useAuth();
  const [dateRange, setDateRange] = useState<[Date | null, Date | null]>([null, null]);
  const [selectedBranch, setSelectedBranch] = useState("all");

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

  const canViewFinancials = user?.role === 'superadmin' || user?.role === 'director' || user?.role === 'manager';

  return (
    <div className="space-y-8 pb-8">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Dashboard</h1>
          <p className="text-slate-500 mt-1">
            Welcome back, <span className="font-semibold text-primary">{user?.name}</span>. Here's what's happening today.
          </p>
        </div>
        
        {(user?.role === 'superadmin' || user?.role === 'director') && (
            <div className="w-[200px]">
                <Select value={selectedBranch} onValueChange={setSelectedBranch}>
                    <SelectTrigger className="w-full bg-white border-slate-200 shadow-sm rounded-lg h-10">
                        <SelectValue placeholder="Select Branch" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Branches</SelectItem>
                        <SelectItem value="main">Main Branch</SelectItem>
                        <SelectItem value="north">North Branch</SelectItem>
                        <SelectItem value="south">South Branch</SelectItem>
                        <SelectItem value="east">East Branch</SelectItem>
                        <SelectItem value="west">West Branch</SelectItem>
                    </SelectContent>
                </Select>
            </div>
        )}
      </div>

      {/* Stats Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Clients"
          value={stats?.totalClients || 0}
          icon={Users}
          trend={{ value: 12, isPositive: true }}
          description="from last month"
          className="shadow-card hover:shadow-lg transition-shadow border-none bg-white"
        />
        
        {canViewFinancials ? (
          <>
            <StatCard
              title="Total Revenue"
              value={`₹${(stats?.totalReceived || 0).toLocaleString()}`}
              icon={DollarSign}
              trend={{ value: 8, isPositive: true }}
              description="from last month"
              className="shadow-card hover:shadow-lg transition-shadow border-none bg-white"
            />
            <StatCard
              title="Pending Amount"
              value={`₹${(stats?.totalPending || 0).toLocaleString()}`}
              icon={Clock}
              description="across all clients"
              className="shadow-card hover:shadow-lg transition-shadow border-l-4 border-l-yellow-500 bg-white"
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
              className="shadow-card hover:shadow-lg transition-shadow border-none bg-white"
            />
            <StatCard
              title="Pending Actions"
              value={7}
              icon={ShieldAlert}
              description="require attention"
              className="shadow-card hover:shadow-lg transition-shadow border-l-4 border-l-red-500 bg-white"
            />
          </>
        )}
        
        <StatCard
          title="Today's Enrollments"
          value={stats?.todaysEnrollments || 0}
          icon={UserPlus}
          description="new clients today"
          className="shadow-card hover:shadow-lg transition-shadow border-none bg-white"
        />
      </div>

      {/* Main Content Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-7">
        {canViewFinancials ? (
            <div className="col-span-4 rounded-xl shadow-card bg-white p-1">
                <RevenueChart />
            </div>
        ) : (
          <Card className="col-span-4 border-none shadow-card bg-white rounded-xl overflow-hidden">
            <CardHeader>
              <CardTitle className="text-lg font-bold text-slate-900">Team Performance</CardTitle>
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
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)' }}
                  />
                  <Bar dataKey="total" name="Enrollments" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}
        
        <Card className="col-span-3 border-none shadow-card bg-white rounded-xl overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-lg font-bold text-slate-900">Recent Clients</CardTitle>
            <Button variant="ghost" size="sm" className="text-primary hover:text-primary/80 p-0 h-auto font-medium">
              View All <ArrowRight className="ml-1 w-4 h-4" />
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {recentClients?.slice(0, 5).map((client) => (
                <div key={client.id} className="flex items-center group cursor-pointer hover:bg-slate-50 p-2 -mx-2 rounded-lg transition-colors">
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm ring-2 ring-white shadow-sm">
                    {client.name.charAt(0)}
                  </div>
                  <div className="ml-4 space-y-1 flex-1">
                    <p className="text-sm font-semibold leading-none text-slate-900">{client.name}</p>
                    <p className="text-xs text-slate-500">{client.salesType}</p>
                  </div>
                  <div className="ml-auto font-medium text-sm">
                    <Badge variant={client.status === 'Active' ? 'default' : 'secondary'} className="rounded-md px-2.5 py-0.5">
                      {client.status}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Bottom Section */}
      <div className="grid grid-cols-1">
        <Card className="border-none shadow-card bg-white rounded-xl overflow-hidden">
          <CardHeader className="px-6 py-5 border-b border-slate-100">
            <CardTitle className="text-lg font-bold text-slate-900 flex items-center gap-2">
              {canViewFinancials ? <CreditCard className="w-5 h-5 text-primary" /> : <UserPlus className="w-5 h-5 text-primary" />}
              {canViewFinancials ? "Recent Transactions" : "Recent Enrollments"}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
             <DataTable 
               data={recentClients?.slice(0, 5) || []}
               columns={[
                 { 
                   header: "Client", 
                   accessorKey: "name", 
                   cell: (client: Client) => (
                     <div className="font-semibold text-slate-900">{client.name}</div>
                   )
                 },
                 { 
                   header: "Date", 
                   accessorKey: "enrollmentDate",
                   cell: (client: Client) => (
                     <div className="text-slate-500">{new Date(client.enrollmentDate).toLocaleDateString()}</div>
                   )
                 },
                 ...(canViewFinancials ? [{ 
                   header: "Amount", 
                   accessorKey: "amountReceived",
                   cell: (client: Client) => (
                     <div className="font-mono font-medium text-slate-700">₹{client.amountReceived?.toLocaleString()}</div>
                   ) 
                 }] : []),
                 { 
                   header: "Status", 
                   accessorKey: "status",
                   cell: (client: Client) => (
                     <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100 shadow-none font-medium">
                       Active
                     </Badge>
                   ) 
                 },
                 {
                    header: "",
                    cell: () => (
                        <div className="text-right">
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                <span className="sr-only">Open menu</span>
                                <ArrowUpRight className="h-4 w-4 text-slate-400" />
                            </Button>
                        </div>
                    )
                 }
               ]}
             />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
