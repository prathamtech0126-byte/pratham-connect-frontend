import { PageWrapper } from "@/layout/PageWrapper";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { TableToolbar } from "@/components/table/TableToolbar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { X, ArrowLeft, Users, TrendingUp, DollarSign, ArrowUpRight, CalendarRange } from "lucide-react";
import { useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/context/auth-context";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer, 
  LineChart, 
  Line, 
  PieChart, 
  Pie, 
  Cell 
} from 'recharts';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useQuery } from "@tanstack/react-query";
import { clientService, Client } from "@/services/clientService";
import { DataTable } from "@/components/table/DataTable";
import { Badge } from "@/components/ui/badge";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

// Mock Data Generator
const generateMockData = (year: string) => {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const baseRevenue = year === '2025' ? 20000 : year === '2024' ? 15000 : 10000;
  const growthFactor = year === '2025' ? 1.5 : year === '2024' ? 1.2 : 1.0;

  return months.map(month => ({
    name: month,
    revenue: Math.floor((Math.random() * 50000 + baseRevenue) * growthFactor),
    pending: Math.floor((Math.random() * 20000 + 5000) * growthFactor),
    students: Math.floor((Math.random() * 20 + 10) * growthFactor)
  }));
};

const serviceData = [
  { name: 'Canada Student', value: 45, color: '#0088FE' },
  { name: 'UK Student', value: 25, color: '#00C49F' },
  { name: 'USA Visitor', value: 15, color: '#FFBB28' },
  { name: 'Spouse Visa', value: 10, color: '#FF8042' },
  { name: 'Other', value: 5, color: '#8884d8' },
];

const counsellorData = [
  { name: 'Priya Singh', clients: 45, revenue: 1250000, avatar: '', isCurrentUser: false },
  { name: 'User (You)', clients: 42, revenue: 1150000, avatar: '', isCurrentUser: true },
  { name: 'Amit Kumar', clients: 38, revenue: 980000, avatar: '', isCurrentUser: false },
  { name: 'Sarah Wilson', clients: 32, revenue: 850000, avatar: '', isCurrentUser: false },
  { name: 'Raj Patel', clients: 28, revenue: 720000, avatar: '', isCurrentUser: false },
  { name: 'Neha Gupta', clients: 22, revenue: 550000, avatar: '', isCurrentUser: false },
];

const managerData = [
    { name: 'Sarah Manager', teamSize: 5, revenue: 4500000, avatar: '' },
    { name: 'Mike Director', teamSize: 8, revenue: 7800000, avatar: '' },
];

type ViewMode = 'monthly' | 'quarterly' | 'yearly';
type YearFilter = '2025' | '2024' | '2023';

export default function Reports() {
  const { user } = useAuth();
  const [location, setLocation] = useLocation();
  
  // Parse query params to see if a counselor is pre-selected
  const searchParams = new URLSearchParams(window.location.search);
  const initialUser = searchParams.get('counselor');

  const [periodFilter, setPeriodFilter] = useState("6m");
  const [salesTypeFilter, setSalesTypeFilter] = useState("all");
  const [selectedUser, setSelectedUser] = useState<string | null>(initialUser);
  const [viewMode, setViewMode] = useState<ViewMode>('monthly');
  const [yearFilter, setYearFilter] = useState<YearFilter>('2025');

  // Update URL when selectedUser changes, or clear it
  const updateSelectedUser = (name: string | null) => {
    setSelectedUser(name);
    if (name) {
      const params = new URLSearchParams(window.location.search);
      params.set('counselor', name);
      window.history.pushState({}, '', `${window.location.pathname}?${params.toString()}`);
    } else {
        const params = new URLSearchParams(window.location.search);
        params.delete('counselor');
        window.history.pushState({}, '', `${window.location.pathname}${params.toString() ? '?' + params.toString() : ''}`);
    }
  };

  const { data: recentClients } = useQuery({
    queryKey: ['recent-clients'],
    queryFn: clientService.getClients
  });

  const fullYearData = generateMockData(yearFilter);

  const handleClearFilters = () => {
    setPeriodFilter("6m");
    setSalesTypeFilter("all");
    setSelectedUser(null);
    setViewMode('monthly');
    setYearFilter('2025');
  };

  const isFilterActive = periodFilter !== "6m" || salesTypeFilter !== "all" || selectedUser !== null || viewMode !== 'monthly' || yearFilter !== '2025';

  const canViewAll = user?.role === 'superadmin' || user?.role === 'director';
  const canViewCounselors = user?.role === 'manager';
  const isIndividual = !canViewAll && !canViewCounselors;

  // Mock filtering logic for demonstration
  const getFilteredData = (data: any[]) => {
    if (!selectedUser && (canViewAll || canViewCounselors)) return data; 
    
    // Simulate specific user data by reducing values
    return data.map(item => {
      const newItem = { ...item };
      if (typeof newItem.revenue === 'number') newItem.revenue = Math.round(newItem.revenue * 0.3);
      if (typeof newItem.pending === 'number') newItem.pending = Math.round(newItem.pending * 0.3);
      if (typeof newItem.students === 'number') newItem.students = Math.round(newItem.students * 0.3);
      if (typeof newItem.value === 'number') newItem.value = Math.round(newItem.value * 0.3);
      return newItem;
    });
  };

  const aggregateData = (data: any[], mode: ViewMode) => {
    if (mode === 'monthly') return data;

    if (mode === 'quarterly') {
      const quarters = ['Q1', 'Q2', 'Q3', 'Q4'];
      return quarters.map((q, i) => {
        const startMonth = i * 3;
        const quarterMonths = data.slice(startMonth, startMonth + 3);
        return {
          name: q,
          revenue: quarterMonths.reduce((sum, item) => sum + (item.revenue || 0), 0),
          pending: quarterMonths.reduce((sum, item) => sum + (item.pending || 0), 0),
          students: quarterMonths.reduce((sum, item) => sum + (item.students || 0), 0)
        };
      });
    }

    if (mode === 'yearly') {
       return [{
          name: yearFilter,
          revenue: data.reduce((sum, item) => sum + (item.revenue || 0), 0),
          pending: data.reduce((sum, item) => sum + (item.pending || 0), 0),
          students: data.reduce((sum, item) => sum + (item.students || 0), 0)
       }];
    }
    return data;
  };

  const baseFinancialData = selectedUser || isIndividual ? getFilteredData(fullYearData) : fullYearData;
  const currentFinancialData = aggregateData(baseFinancialData, viewMode);
  
  // Use same base data for enrollment since we generated combined mock data
  const currentEnrollmentData = aggregateData(baseFinancialData, viewMode); 
  
  const currentServiceData = selectedUser || isIndividual ? getFilteredData(serviceData) : serviceData;
  
  const showLists = !selectedUser && !isIndividual;

  // Filter clients based on selected user (mock logic)
  const filteredClients = selectedUser 
    ? recentClients?.filter(c => c.counsellor === selectedUser || c.productManager === selectedUser) 
    : recentClients;

  const groupedClients = (filteredClients || []).reduce((acc, client) => {
    const date = new Date(client.enrollmentDate);
    const year = date.getFullYear().toString();
    const month = date.toLocaleString('default', { month: 'long' });

    if (!acc[year]) acc[year] = {};
    if (!acc[year][month]) acc[year][month] = [];

    acc[year][month].push(client);
    return acc;
  }, {} as Record<string, Record<string, Client[]>>);

  // Sort years descending
  const sortedYears = Object.keys(groupedClients).sort((a, b) => Number(b) - Number(a));

  return (
    <PageWrapper 
      title="Reports" 
      breadcrumbs={[{ label: "Reports" }]}
    >
      <div className="space-y-6">
        {/* Toolbar for Filters */}
        <TableToolbar 
          searchPlaceholder="Search reports..."
          onSearch={() => {}} // Placeholder search
          filters={
            <div className="flex items-center gap-2">
                {selectedUser && (
                    <Button variant="ghost" onClick={() => updateSelectedUser(null)} className="gap-2 text-muted-foreground hover:text-foreground">
                        <ArrowLeft className="w-4 h-4" /> Back to List
                    </Button>
                )}
              
              {(selectedUser || isIndividual) && (
                <>
                  <div className="bg-muted p-1 rounded-lg flex items-center mr-2">
                      <Button 
                        variant={viewMode === 'monthly' ? 'default' : 'ghost'} 
                        size="sm" 
                        onClick={() => setViewMode('monthly')}
                        className={viewMode === 'monthly' ? 'shadow-sm bg-background text-foreground hover:bg-background/90' : 'hover:bg-transparent text-muted-foreground hover:text-foreground'}
                      >
                        Monthly
                      </Button>
                      <Button 
                        variant={viewMode === 'quarterly' ? 'default' : 'ghost'} 
                        size="sm" 
                        onClick={() => setViewMode('quarterly')}
                        className={viewMode === 'quarterly' ? 'shadow-sm bg-background text-foreground hover:bg-background/90' : 'hover:bg-transparent text-muted-foreground hover:text-foreground'}
                      >
                        Quarterly
                      </Button>
                      <Button 
                        variant={viewMode === 'yearly' ? 'default' : 'ghost'} 
                        size="sm" 
                        onClick={() => setViewMode('yearly')}
                        className={viewMode === 'yearly' ? 'shadow-sm bg-background text-foreground hover:bg-background/90' : 'hover:bg-transparent text-muted-foreground hover:text-foreground'}
                      >
                        Yearly
                      </Button>
                  </div>

                  {/* Year Filter */}
                  <Select value={yearFilter} onValueChange={(value) => setYearFilter(value as YearFilter)}>
                    <SelectTrigger className="w-[120px] bg-card border-border/50 text-foreground">
                        <CalendarRange className="w-4 h-4 mr-2 text-muted-foreground" />
                        <SelectValue placeholder="Year" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="2025">2025</SelectItem>
                      <SelectItem value="2024">2024</SelectItem>
                      <SelectItem value="2023">2023</SelectItem>
                    </SelectContent>
                  </Select>
                </>
              )}

              <Select value={salesTypeFilter} onValueChange={setSalesTypeFilter}>
                <SelectTrigger className="w-[180px] bg-card border-border/50 text-foreground">
                  <SelectValue placeholder="Sales Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Sales Types</SelectItem>
                  <SelectItem value="student">Student Visa</SelectItem>
                  <SelectItem value="visitor">Visitor Visa</SelectItem>
                  <SelectItem value="spouse">Spouse Visa</SelectItem>
                </SelectContent>
              </Select>

              {isFilterActive && (
                <Button 
                  variant="outline" 
                  onClick={handleClearFilters}
                  className="bg-card text-destructive hover:text-destructive hover:bg-destructive/10 border-destructive/30"
                >
                  Clear All
                  <X className="ml-2 h-4 w-4" />
                </Button>
              )}
            </div>
          }
        />

        {showLists ? (
            <div className="grid gap-6 md:grid-cols-2">
                {canViewAll && (
                    <Card className="border-none shadow-card bg-card">
                        <CardHeader>
                            <CardTitle className="text-lg font-bold text-foreground flex items-center gap-2">
                                <Users className="w-5 h-5 text-primary" />
                                Managers
                            </CardTitle>
                            <CardDescription>Select a manager to view detailed reports for {yearFilter}</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                {managerData.map((manager, index) => (
                                    <div 
                                        key={index} 
                                        className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/50 cursor-pointer transition-colors border border-transparent hover:border-border/50"
                                        onClick={() => updateSelectedUser(manager.name)}
                                    >
                                        <div className="flex items-center gap-3">
                                            <Avatar className="h-10 w-10 border border-border">
                                                <AvatarImage src={manager.avatar} />
                                                <AvatarFallback className="bg-primary/10 text-primary">
                                                    {manager.name.charAt(0)}
                                                </AvatarFallback>
                                            </Avatar>
                                            <div>
                                                <p className="font-semibold text-foreground">{manager.name}</p>
                                                <p className="text-xs text-muted-foreground">Team Size: {manager.teamSize}</p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <div className="font-bold text-foreground">₹{(manager.revenue / 100000).toFixed(1)}L</div>
                                            <p className="text-xs text-muted-foreground">Revenue</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                )}

                <Card className={`border-none shadow-card bg-card ${!canViewAll ? 'col-span-2' : ''}`}>
                    <CardHeader>
                        <CardTitle className="text-lg font-bold text-foreground flex items-center gap-2">
                            <Users className="w-5 h-5 text-primary" />
                            Counselors
                        </CardTitle>
                        <CardDescription>Select a counselor to view detailed reports for {yearFilter}</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            {counsellorData.map((counsellor, index) => (
                                <div 
                                    key={index} 
                                    className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/50 cursor-pointer transition-colors border border-transparent hover:border-border/50"
                                    onClick={() => updateSelectedUser(counsellor.name)}
                                >
                                    <div className="flex items-center gap-3">
                                        <Avatar className="h-10 w-10 border border-border">
                                            <AvatarImage src={counsellor.avatar} />
                                            <AvatarFallback className="bg-primary/10 text-primary">
                                                {counsellor.name.charAt(0)}
                                            </AvatarFallback>
                                        </Avatar>
                                        <div>
                                            <p className="font-semibold text-foreground">{counsellor.name}</p>
                                            <p className="text-xs text-muted-foreground">{counsellor.clients} Active Clients</p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <div className="font-bold text-foreground">₹{(counsellor.revenue / 100000).toFixed(1)}L</div>
                                        <p className="text-xs text-muted-foreground">Revenue</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            </div>
        ) : (
            <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Financial Overview */}
                <Card className="border-none shadow-sm bg-card">
                    <CardHeader>
                    <CardTitle className="text-lg font-semibold text-foreground">
                        {selectedUser ? `${selectedUser}'s Financial Overview` : 'Financial Overview'} - {yearFilter}
                    </CardTitle>
                    <CardDescription>Total Revenue Overview</CardDescription>
                    </CardHeader>
                    <CardContent>
                    <div className="h-[300px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={currentFinancialData}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                            <XAxis dataKey="name" fontSize={12} tickLine={false} axisLine={false} stroke="hsl(var(--muted-foreground))" />
                            <YAxis 
                            fontSize={12} 
                            tickLine={false} 
                            axisLine={false}
                            tickFormatter={(value) => `₹${value/1000}k`}
                            stroke="hsl(var(--muted-foreground))"
                            />
                            <Tooltip 
                            formatter={(value: number) => [`₹${value.toLocaleString()}`, undefined]}
                            cursor={{ fill: 'hsl(var(--muted)/0.2)' }}
                            contentStyle={{ borderRadius: '8px', border: '1px solid hsl(var(--border))', backgroundColor: 'hsl(var(--card))', color: 'hsl(var(--foreground))' }}
                            itemStyle={{ color: 'hsl(var(--foreground))' }}
                            />
                            <Legend />
                            <Bar dataKey="revenue" name="Revenue" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                        </BarChart>
                        </ResponsiveContainer>
                    </div>
                    </CardContent>
                </Card>

                {/* Enrollment Trends */}
                <Card className="border-none shadow-sm bg-card">
                    <CardHeader>
                    <CardTitle className="text-lg font-semibold text-foreground">Enrollment Trends - {yearFilter}</CardTitle>
                    <CardDescription>New client enrollments over time</CardDescription>
                    </CardHeader>
                    <CardContent>
                    <div className="h-[300px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={currentEnrollmentData}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                            <XAxis dataKey="name" fontSize={12} tickLine={false} axisLine={false} stroke="hsl(var(--muted-foreground))" />
                            <YAxis fontSize={12} tickLine={false} axisLine={false} stroke="hsl(var(--muted-foreground))" />
                            <Tooltip 
                                contentStyle={{ borderRadius: '8px', border: '1px solid hsl(var(--border))', backgroundColor: 'hsl(var(--card))', color: 'hsl(var(--foreground))' }}
                                itemStyle={{ color: 'hsl(var(--foreground))' }}
                            />
                            <Line 
                            type="monotone" 
                            dataKey="students" 
                            name="New Clients"
                            stroke="#f97316" 
                            strokeWidth={2}
                            dot={{ r: 4, fill: "#f97316" }}
                            activeDot={{ r: 6 }}
                            />
                        </LineChart>
                        </ResponsiveContainer>
                    </div>
                    </CardContent>
                </Card>

                {/* Service Distribution */}
                <Card className="border-none shadow-sm bg-card">
                    <CardHeader>
                    <CardTitle className="text-lg font-semibold text-foreground">Service Distribution</CardTitle>
                    <CardDescription>Breakdown by sales type for {yearFilter}</CardDescription>
                    </CardHeader>
                    <CardContent>
                    <div className="h-[300px] w-full flex items-center justify-center">
                        <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie
                            data={currentServiceData}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={80}
                            paddingAngle={5}
                            dataKey="value"
                            >
                            {currentServiceData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.color} stroke="hsl(var(--card))" />
                            ))}
                            </Pie>
                            <Tooltip 
                                contentStyle={{ borderRadius: '8px', border: '1px solid hsl(var(--border))', backgroundColor: 'hsl(var(--card))', color: 'hsl(var(--foreground))' }}
                                itemStyle={{ color: 'hsl(var(--foreground))' }}
                            />
                            <Legend verticalAlign="bottom" height={36}/>
                        </PieChart>
                        </ResponsiveContainer>
                    </div>
                    </CardContent>
                </Card>
                
                {/* Show Top Performers only if looking at aggregate and NOT for individual counselors 
                    who shouldn't see others' data.
                */}
                {!selectedUser && !isIndividual && (
                    <Card className="border-none shadow-sm">
                        <CardHeader>
                        <CardTitle className="text-lg font-semibold">Counsellor Performance - {yearFilter}</CardTitle>
                        <CardDescription>Top performers by active clients and revenue</CardDescription>
                        </CardHeader>
                        <CardContent>
                        <div className="space-y-4">
                            {counsellorData.map((counsellor, index) => {
                                const topPerformer = counsellorData[0];
                                const remainingForTop = topPerformer.clients - counsellor.clients;
                                const isCurrentUser = counsellor.isCurrentUser;
                                
                                return (
                                <div 
                                    key={index} 
                                    className={`flex flex-col p-3 rounded-lg transition-colors ${
                                        isCurrentUser 
                                        ? "bg-primary/5 border border-primary/20 ring-1 ring-primary/10" 
                                        : "hover:bg-muted/50"
                                    }`}
                                >
                                    <div className="flex items-center justify-between w-full">
                                        <div className="flex items-center gap-3">
                                            <div className={`
                                                flex items-center justify-center w-8 h-8 rounded-full font-bold text-xs
                                                ${index === 0 ? "bg-yellow-100 text-yellow-700" : 
                                                  index === 1 ? "bg-slate-100 text-slate-700" :
                                                  index === 2 ? "bg-orange-100 text-orange-700" : "bg-primary/10 text-primary"}
                                            `}>
                                                {index + 1}
                                            </div>
                                            <Avatar className="h-8 w-8">
                                                <AvatarImage src={counsellor.avatar} />
                                                <AvatarFallback className="bg-muted text-xs">
                                                {counsellor.name.split(' ').map(n => n[0]).join('')}
                                                </AvatarFallback>
                                            </Avatar>
                                            <div>
                                                <p className={`text-sm font-medium leading-none ${isCurrentUser ? "text-primary font-bold" : ""}`}>
                                                    {counsellor.name}
                                                </p>
                                                <p className="text-xs text-muted-foreground mt-1">{counsellor.clients} Active Clients</p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            {/* Revenue hidden for all as requested */}
                                        </div>
                                    </div>
                                    
                                    {isCurrentUser && index > 0 && (
                                        <div className="mt-3 ml-11 p-2 bg-white/50 rounded text-xs text-muted-foreground border border-slate-100">
                                            You need <span className="font-bold text-primary">{remainingForTop}</span> more active clients for top position! 🚀
                                        </div>
                                    )}
                                </div>
                            )})}
                        </div>
                        </CardContent>
                    </Card>
                )}
                </div>

                {/* Client List for the selected user */}
                {(selectedUser || isIndividual) && (
                    <Card className="border-none shadow-sm">
                        <CardHeader>
                            <CardTitle className="text-lg font-semibold flex items-center justify-between">
                                <span>Client List</span>
                                {canViewAll && (
                                    <Button size="sm" variant="outline">Edit Mode</Button>
                                )}
                            </CardTitle>
                            <CardDescription>All clients managed by {selectedUser || user?.name}</CardDescription>
                        </CardHeader>
                        <CardContent className="p-0">
                            {sortedYears.length > 0 ? (
                                <Accordion type="multiple" className="w-full px-4 pb-4">
                                    {sortedYears.map((year) => (
                                        <AccordionItem value={year} key={year} className="border-b-0">
                                            <AccordionTrigger className="text-xl font-bold hover:no-underline py-4">
                                                {year}
                                            </AccordionTrigger>
                                            <AccordionContent>
                                                <Accordion type="multiple" className="w-full pl-4 border-l-2 border-slate-100 ml-2">
                                                    {Object.entries(groupedClients[year]).map(([month, clients]) => (
                                                        <AccordionItem value={`${year}-${month}`} key={`${year}-${month}`} className="border-b-0">
                                                            <AccordionTrigger className="text-base font-semibold hover:no-underline py-2 text-slate-700">
                                                                {month} ({clients.length})
                                                            </AccordionTrigger>
                                                            <AccordionContent>
                                                                <DataTable 
                                                                    data={clients}
                                                                    onRowClick={(client: Client) => setLocation(`/clients/${client.id}`)}
                                                                    columns={[
                                                                        { 
                                                                            header: "Client Name", 
                                                                            accessorKey: "name",
                                                                            cell: (client: Client) => (
                                                                                <div className="font-medium">{client.name}</div>
                                                                            )
                                                                        },
                                                                        { header: "Sales Type", accessorKey: "salesType" },
                                                                        { 
                                                                            header: "Date", 
                                                                            accessorKey: "enrollmentDate",
                                                                            cell: (client: Client) => new Date(client.enrollmentDate).toLocaleDateString()
                                                                        },
                                                                        { 
                                                                            header: "Status", 
                                                                            accessorKey: "status",
                                                                            cell: (client: Client) => (
                                                                                <Badge variant={
                                                                                    client.status === 'Active' ? 'default' : 
                                                                                    client.status === 'Pending' ? 'secondary' : 
                                                                                    client.status === 'Completed' ? 'outline' : 'destructive'
                                                                                }>
                                                                                    {client.status}
                                                                                </Badge>
                                                                            )
                                                                        },
                                                                        {
                                                                            header: "Action",
                                                                            accessorKey: "id",
                                                                            cell: () => <ArrowUpRight className="h-4 w-4 text-slate-400" />
                                                                        }
                                                                    ]}
                                                                />
                                                            </AccordionContent>
                                                        </AccordionItem>
                                                    ))}
                                                </Accordion>
                                            </AccordionContent>
                                        </AccordionItem>
                                    ))}
                                </Accordion>
                            ) : (
                                <div className="p-8 text-center text-slate-500">
                                    No clients found for this period.
                                </div>
                            )}
                        </CardContent>
                    </Card>
                )}
            </div>
        )}
      </div>
    </PageWrapper>
  );
}
