import { PageWrapper } from "@/layout/PageWrapper";
import { StatCard } from "@/components/cards/StatCard";
import { Users, DollarSign, Clock, CreditCard, TrendingUp, UserPlus, ShieldAlert, Activity, ArrowUpRight, ArrowRight, Target, Trophy, Medal, Calendar } from "lucide-react";
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
import { DashboardDateFilter } from "@/components/dashboard/DashboardDateFilter";

const counselorRevenue = [
  { name: "Priya Singh", revenue: 1250000, clients: 12, avatar: "P" },
  { name: "Amit Kumar", revenue: 980000, clients: 8, avatar: "A" },
  { name: "Sarah Jones", revenue: 750000, clients: 5, avatar: "S" },
  { name: "Mike Brown", revenue: 450000, clients: 3, avatar: "M" },
  { name: "Rahul Verma", revenue: 320000, clients: 2, avatar: "R" },
];

export default function Dashboard() {
  const { user } = useAuth();
  const [dateRange, setDateRange] = useState<[Date | null, Date | null]>([null, null]);
  const [selectedBranch, setSelectedBranch] = useState("all");
  const [timeFilter, setTimeFilter] = useState("today");

  const { data: stats } = useQuery({
    queryKey: ['dashboard-stats', timeFilter], // Add timeFilter to query key
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

  // Mock data adjustment based on time filter
  const getAdjustedValue = (baseValue: number) => {
    switch(timeFilter) {
        case 'today': return Math.round(baseValue / 30);
        case 'weekly': return Math.round(baseValue / 4);
        case 'monthly': return baseValue;
        case 'yearly': return baseValue * 12;
        default: return baseValue;
    }
  };

  return (
    <div className="space-y-8 pb-8">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Dashboard</h1>
          <p className="text-muted-foreground mt-1">
            Welcome back, <span className="font-semibold text-primary">{user?.name}</span>. Here's what's happening.
          </p>
        </div>
        
        <div className="flex items-center">
             <DashboardDateFilter 
                date={dateRange} 
                onDateChange={setDateRange}
                activeTab={timeFilter === 'today' ? 'Today' : timeFilter === 'weekly' ? 'Weekly' : timeFilter === 'monthly' ? 'Monthly' : timeFilter === 'yearly' ? 'Yearly' : 'Custom'}
                onTabChange={(tab) => setTimeFilter(tab === 'Today' ? 'today' : tab.toLowerCase())}
                align="end"
            />
        </div>
      </div>

      {/* Target & Stats Section */}
      {!canViewFinancials ? (
        <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-3">
            {/* Target Card - Takes 1/3 width */}
            <div className="h-full">
                <Card className="h-full border-none shadow-card bg-gradient-to-br from-primary/5 to-primary/10 rounded-xl overflow-hidden relative flex flex-col justify-center">
                <div className="absolute top-4 right-4 opacity-10">
                    <Target className="w-24 h-24 text-primary" />
                </div>
                <CardHeader>
                    <CardTitle className="text-lg font-bold text-foreground flex items-center gap-2">
                    <div className="p-2 bg-background/50 backdrop-blur-sm rounded-lg shadow-sm">
                        <Target className="w-5 h-5 text-primary" />
                    </div>
                    Your Target
                    </CardTitle>
                    <CardDescription>Monthly enrollment goal</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="space-y-6">
                    <div className="flex items-end justify-between relative z-10">
                        <div>
                            <div className="flex items-baseline gap-2">
                            <span className="text-5xl font-bold text-foreground tracking-tight">{currentUserTarget?.achieved}</span>
                            <span className="text-muted-foreground font-medium text-lg">/ {currentUserTarget?.target} achieved</span>
                            </div>
                        </div>
                        <div className="text-right">
                            <span className="text-sm font-medium text-muted-foreground block mb-1">Remaining</span>
                            <div className="text-3xl font-bold text-primary tabular-nums">{remainingTarget}</div>
                        </div>
                    </div>
                    
                    <div className="space-y-2 relative z-10">
                        <Progress value={progressPercentage} className="h-3 bg-background/50" />
                        <p className="text-xs text-muted-foreground text-right font-medium">
                        {progressPercentage.toFixed(0)}% completed
                        </p>
                    </div>

                    <div className="bg-background/40 rounded-xl p-4 text-sm text-foreground backdrop-blur-md border border-border/50 shadow-sm relative z-10">
                        <div className="flex items-start gap-3">
                        <div className="p-1.5 bg-primary/10 rounded-full mt-0.5">
                            <Trophy className="w-4 h-4 text-primary" />
                        </div>
                        <div>
                            <p className="font-bold text-foreground">Keep it up! 🚀</p>
                            <p className="text-muted-foreground text-xs mt-1 leading-relaxed">
                            You need <span className="font-bold text-primary">{remainingTarget}</span> more enrollments to hit your monthly target.
                            </p>
                        </div>
                        </div>
                    </div>
                    </div>
                </CardContent>
                </Card>
            </div>

            {/* Stats - Takes 2/3 width, displayed as 2x2 grid */}
            <div className="lg:col-span-2 grid gap-6 sm:grid-cols-2">
                <StatCard
                    title="Total Clients"
                    value={getAdjustedValue(stats?.totalClients || 120)}
                    icon={Users}
                    trend={{ value: 12, isPositive: true }}
                    description={`for ${timeFilter}`}
                    className="shadow-card hover:shadow-lg transition-shadow border-none h-full"
                />
                
                <StatCard
                    title="Active Cases"
                    value={getAdjustedValue(42)}
                    icon={Activity}
                    trend={{ value: 5, isPositive: true }}
                    description="currently processing"
                    className="shadow-card hover:shadow-lg transition-shadow border-none h-full"
                />

                <StatCard
                    title="Pending Actions"
                    value={7}
                    icon={ShieldAlert}
                    description="require attention"
                    className="shadow-card hover:shadow-lg transition-shadow border-l-4 border-l-red-500 h-full"
                />
                
                <StatCard
                    title="New Enrollments"
                    value={getAdjustedValue(stats?.todaysEnrollments || 5)}
                    icon={UserPlus}
                    description={`new clients ${timeFilter}`}
                    className="shadow-card hover:shadow-lg transition-shadow border-none h-full"
                />
            </div>
        </div>
      ) : (
        /* Admin View: Just 4 stats in a row */
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            <StatCard
                title="Total Clients"
                value={getAdjustedValue(stats?.totalClients || 120)}
                icon={Users}
                trend={{ value: 12, isPositive: true }}
                description={`for ${timeFilter}`}
                className="shadow-card hover:shadow-lg transition-shadow border-none"
            />
            
            <StatCard
                title="Total Revenue"
                value={`₹${getAdjustedValue(stats?.totalReceived || 2500000).toLocaleString()}`}
                icon={DollarSign}
                trend={{ value: 8, isPositive: true }}
                description={`for ${timeFilter}`}
                className="shadow-card hover:shadow-lg transition-shadow border-none"
            />
            <StatCard
                title="Pending Amount"
                value={`₹${(stats?.totalPending || 0).toLocaleString()}`}
                icon={Clock}
                description="total outstanding"
                className="shadow-card hover:shadow-lg transition-shadow border-l-4 border-l-yellow-500"
            />
            
            <StatCard
                title="New Enrollments"
                value={getAdjustedValue(stats?.todaysEnrollments || 5)}
                icon={UserPlus}
                description={`new clients ${timeFilter}`}
                className="shadow-card hover:shadow-lg transition-shadow border-none"
            />
        </div>
      )}

      {/* Main Content Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-7">
        {canViewFinancials ? (
            <div className="col-span-4 rounded-xl shadow-card bg-card p-1">
                <RevenueChart />
            </div>
        ) : (
          <Card className="col-span-4 border-none shadow-card bg-card rounded-xl overflow-hidden">
            <CardHeader>
              <CardTitle className="text-lg font-bold text-foreground">Team Performance</CardTitle>
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
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)', backgroundColor: 'hsl(var(--card))', color: 'hsl(var(--card-foreground))' }}
                  />
                  <Bar dataKey="total" name="Enrollments" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}
        
        {/* Leaderboard Card - Replaces Recent Clients */}
        <Card className="col-span-3 border-none shadow-card bg-card rounded-xl overflow-hidden">
          <CardHeader>
            <CardTitle className="text-lg font-bold text-foreground flex items-center gap-2">
              <Trophy className="w-5 h-5 text-yellow-500" />
              {canViewFinancials ? "Performance Leaderboard" : "Counselor Leaderboard"}
            </CardTitle>
            <CardDescription>Top performing {canViewFinancials ? "team members" : "counselors"} this month</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {counselorTargets.map((counselor, index) => {
                // Only highlight current user if they are NOT an admin/manager (who don't participate in targets)
                const isHighlighted = counselor.isCurrentUser && !canViewFinancials;
                
                return (
                <div 
                  key={index} 
                  className={`flex items-center p-3 rounded-lg transition-all ${
                    isHighlighted
                      ? "bg-primary/5 border border-primary/20 shadow-sm ring-1 ring-primary/10" 
                      : "hover:bg-muted/50"
                  }`}
                >
                  <div className="flex items-center flex-1">
                    <div className="relative mr-3">
                        <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center text-muted-foreground font-semibold text-sm border-2 border-background shadow-sm">
                        {counselor.avatar}
                        </div>
                        {/* Rank Badge Overlay */}
                        <div className={`
                            absolute -top-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold border-2 border-background shadow-sm
                            ${index === 0 ? "bg-yellow-400 text-yellow-900" : 
                              index === 1 ? "bg-slate-300 text-slate-900" :
                              index === 2 ? "bg-orange-300 text-orange-900" : "bg-muted text-muted-foreground"}
                        `}>
                            {index === 0 ? <Medal className="w-3 h-3" /> : index + 1}
                        </div>
                    </div>
                    
                    <div>
                      <p className={`text-sm font-semibold ${isHighlighted ? "text-primary" : "text-foreground"}`}>
                        {counselor.name} {isHighlighted && "(You)"}
                      </p>
                      <p className="text-xs text-muted-foreground">Target: {counselor.target}</p>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="text-sm font-bold text-foreground">{counselor.achieved}</div>
                    <p className="text-xs text-muted-foreground">enrolled</p>
                  </div>
                </div>
              )})}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Bottom Section */}
      <div className="grid grid-cols-1">
        <Card className="border-none shadow-card bg-card rounded-xl overflow-hidden">
          <CardHeader className="px-6 py-5 border-b border-border/40">
            <CardTitle className="text-lg font-bold text-foreground flex items-center gap-2">
              {canViewFinancials ? <TrendingUp className="w-5 h-5 text-primary" /> : <Users className="w-5 h-5 text-primary" />}
              {canViewFinancials ? "Counselor Performance" : "Recent Clients"}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
             {canViewFinancials ? (
               <DataTable 
                 data={counselorRevenue}
                 columns={[
                   { 
                     header: "Counselor", 
                     accessorKey: "name", 
                     cell: (item: any) => (
                       <div className="flex items-center gap-3">
                         <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center text-muted-foreground font-semibold text-xs border border-border">
                           {item.avatar}
                         </div>
                         <div className="font-semibold text-foreground">{item.name}</div>
                       </div>
                     )
                   },
                   { 
                     header: "Clients", 
                     accessorKey: "clients",
                     cell: (item: any) => (
                       <div className="text-muted-foreground font-medium">{item.clients} Active Cases</div>
                     )
                   },
                   { 
                     header: "Revenue", 
                     accessorKey: "revenue",
                     cell: (item: any) => (
                       <div className="font-mono font-medium text-foreground">₹{item.revenue.toLocaleString()}</div>
                     )
                   },
                   {
                      header: "",
                      cell: () => (
                          <div className="text-right">
                              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                  <ArrowRight className="h-4 w-4 text-muted-foreground" />
                              </Button>
                          </div>
                      )
                   }
                 ]}
               />
             ) : (
               <DataTable 
                 data={recentClients?.slice(0, 5) || []}
                 columns={[
                   { 
                     header: "Client", 
                     accessorKey: "name", 
                     cell: (client: Client) => (
                       <div className="font-semibold text-foreground">{client.name}</div>
                     )
                   },
                   { 
                     header: "Date", 
                     accessorKey: "enrollmentDate",
                     cell: (client: Client) => (
                       <div className="text-muted-foreground">{new Date(client.enrollmentDate).toLocaleDateString()}</div>
                     )
                   },
                   { 
                     header: "Amount", 
                     accessorKey: "amountReceived",
                     cell: (client: Client) => (
                       <div className="font-mono font-medium text-foreground">₹{client.amountReceived?.toLocaleString()}</div>
                     ) 
                   },
                   { 
                     header: "Stage", 
                     accessorKey: "status",
                     cell: (client: Client) => {
                       const stage = client.stage || 'Initial';
                       
                       return (
                         <Badge variant="outline" className={`
                           font-medium border-0
                           ${stage === 'Initial' ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' : ''}
                           ${stage === 'Financial' ? 'bg-purple-50 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300' : ''}
                           ${stage === 'Before Visa' ? 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300' : ''}
                           ${stage === 'After Visa Payment' ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300' : ''}
                           ${stage === 'Visa Submitted' ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300' : ''}
                         `}>
                           {stage}
                         </Badge>
                       );
                     } 
                   },
                   {
                      header: "",
                      cell: () => (
                          <div className="text-right">
                              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                  <span className="sr-only">Open menu</span>
                                  <ArrowUpRight className="h-4 w-4 text-muted-foreground" />
                              </Button>
                          </div>
                      )
                   }
                 ]}
               />
             )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
