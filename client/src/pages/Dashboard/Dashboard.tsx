import { PageWrapper } from "@/layout/PageWrapper";
import { StatCard } from "@/components/cards/StatCard";
import { Users, DollarSign, Clock, CreditCard, TrendingUp, UserPlus, ShieldAlert, Activity, ArrowUpRight, ArrowRight, Target, Trophy, Medal } from "lucide-react";
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
import { Progress } from "@/components/ui/progress";

const chartData = [
  { name: "Jan", total: 12000 },
  { name: "Feb", total: 18000 },
  { name: "Mar", total: 25000 },
  { name: "Apr", total: 21000 },
  { name: "May", total: 32000 },
  { name: "Jun", total: 45000 },
];

const counselorTargets = [
  { name: "John Smith", achieved: 12, target: 20, avatar: "J" },
  { name: "Emmad Son", achieved: 8, target: 15, avatar: "E" },
  { name: "User", achieved: 7, target: 12, isCurrentUser: true, avatar: "U" },
  { name: "Sarah Jones", achieved: 5, target: 10, avatar: "S" },
  { name: "Mike Brown", achieved: 3, target: 10, avatar: "M" },
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
  
  const currentUserTarget = counselorTargets.find(c => c.isCurrentUser);
  const remainingTarget = currentUserTarget ? currentUserTarget.target - currentUserTarget.achieved : 0;
  const progressPercentage = currentUserTarget ? (currentUserTarget.achieved / currentUserTarget.target) * 100 : 0;

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
      </div>

      {/* Target & Leaderboard Section */}
      {!canViewFinancials && (
      <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-3">
        {/* Your Target Card */}
        <Card className="border-none shadow-card bg-gradient-to-br from-primary/5 to-primary/10 rounded-xl overflow-hidden relative">
          <div className="absolute top-0 right-0 p-4 opacity-10">
            <Target className="w-24 h-24 text-primary" />
          </div>
          <CardHeader>
            <CardTitle className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Target className="w-5 h-5 text-primary" />
              Your Target
            </CardTitle>
            <CardDescription>Monthly enrollment goal</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
               <div className="flex items-end justify-between">
                  <div>
                    <span className="text-4xl font-bold text-slate-900">{currentUserTarget?.achieved}</span>
                    <span className="text-slate-500 ml-2">/ {currentUserTarget?.target} achieved</span>
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-medium text-slate-500">Remaining</span>
                    <div className="text-2xl font-bold text-primary">{remainingTarget}</div>
                  </div>
               </div>
               
               <div className="space-y-2">
                 <Progress value={progressPercentage} className="h-3" />
                 <p className="text-xs text-slate-500 text-right">
                   {progressPercentage.toFixed(0)}% completed
                 </p>
               </div>

               <div className="bg-white/60 rounded-lg p-3 text-sm text-slate-700 backdrop-blur-sm border border-white/50">
                 <p className="font-medium">Keep it up! 🚀</p>
                 <p className="text-slate-500 text-xs mt-1">You need {remainingTarget} more enrollments to hit your monthly target.</p>
               </div>
            </div>
          </CardContent>
        </Card>

        {/* Leaderboard Card */}
        <Card className="lg:col-span-2 border-none shadow-card bg-white rounded-xl overflow-hidden">
          <CardHeader>
            <CardTitle className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Trophy className="w-5 h-5 text-yellow-500" />
              Counselor Leaderboard
            </CardTitle>
            <CardDescription>Top performing counselors this month</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {counselorTargets.map((counselor, index) => (
                <div 
                  key={index} 
                  className={`flex items-center p-3 rounded-lg transition-all ${
                    counselor.isCurrentUser 
                      ? "bg-primary/5 border border-primary/20 shadow-sm ring-1 ring-primary/10" 
                      : "hover:bg-slate-50"
                  }`}
                >
                  <div className={`
                    flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs mr-4
                    ${index === 0 ? "bg-yellow-100 text-yellow-700" : 
                      index === 1 ? "bg-slate-100 text-slate-700" :
                      index === 2 ? "bg-orange-100 text-orange-700" : "bg-slate-50 text-slate-500"}
                  `}>
                    {index + 1}
                  </div>
                  
                  <div className="flex items-center flex-1">
                    <div className="h-9 w-9 rounded-full bg-slate-200 flex items-center justify-center text-slate-600 font-semibold text-xs mr-3">
                      {counselor.avatar}
                    </div>
                    <div>
                      <p className={`text-sm font-semibold ${counselor.isCurrentUser ? "text-primary" : "text-slate-900"}`}>
                        {counselor.name} {counselor.isCurrentUser && "(You)"}
                      </p>
                      <p className="text-xs text-slate-500">Target: {counselor.target}</p>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="text-sm font-bold text-slate-900">{counselor.achieved}</div>
                    <p className="text-xs text-slate-500">enrolled</p>
                  </div>

                  {index === 0 && <Medal className="w-5 h-5 text-yellow-500 ml-4 opacity-0 sm:opacity-100 transition-opacity" />}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
      )}

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
