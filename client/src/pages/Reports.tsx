import { PageWrapper } from "@/layout/PageWrapper";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { TableToolbar } from "@/components/table/TableToolbar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState } from "react";
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

// Mock Data
const financialData = [
  { name: 'Jan', revenue: 45000, pending: 12000 },
  { name: 'Feb', revenue: 52000, pending: 15000 },
  { name: 'Mar', revenue: 48000, pending: 8000 },
  { name: 'Apr', revenue: 61000, pending: 18000 },
  { name: 'May', revenue: 55000, pending: 10000 },
  { name: 'Jun', revenue: 67000, pending: 14000 },
];

const enrollmentData = [
  { name: 'Jan', students: 12 },
  { name: 'Feb', students: 19 },
  { name: 'Mar', students: 15 },
  { name: 'Apr', students: 22 },
  { name: 'May', students: 28 },
  { name: 'Jun', students: 25 },
];

const serviceData = [
  { name: 'Canada Student', value: 45, color: '#0088FE' },
  { name: 'UK Student', value: 25, color: '#00C49F' },
  { name: 'USA Visitor', value: 15, color: '#FFBB28' },
  { name: 'Spouse Visa', value: 10, color: '#FF8042' },
  { name: 'Other', value: 5, color: '#8884d8' },
];

const counsellorData = [
  { name: 'Priya Singh', clients: 45, revenue: 1250000, avatar: '' },
  { name: 'Amit Kumar', clients: 38, revenue: 980000, avatar: '' },
  { name: 'Sarah Wilson', clients: 32, revenue: 850000, avatar: '' },
  { name: 'Raj Patel', clients: 28, revenue: 720000, avatar: '' },
  { name: 'Neha Gupta', clients: 22, revenue: 550000, avatar: '' },
];

export default function Reports() {
  const { user } = useAuth();
  const [periodFilter, setPeriodFilter] = useState("6m");
  const [salesTypeFilter, setSalesTypeFilter] = useState("all");
  const [userFilter, setUserFilter] = useState("all");

  const canViewAll = user?.role === 'superadmin' || user?.role === 'director' || user?.role === 'manager';

  // Mock filtering logic for demonstration
  const getFilteredData = (data: any[]) => {
    if (userFilter === 'all') return data;
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

  const currentFinancialData = getFilteredData(financialData);
  const currentEnrollmentData = getFilteredData(enrollmentData);
  const currentServiceData = getFilteredData(serviceData);
  
  const currentCounsellorData = userFilter === 'all' 
    ? counsellorData 
    : counsellorData.filter(c => c.name === userFilter);

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
              <Select value={periodFilter} onValueChange={setPeriodFilter}>
                <SelectTrigger className="w-[150px] bg-white">
                  <SelectValue placeholder="Time Period" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1m">Last Month</SelectItem>
                  <SelectItem value="3m">Last 3 Months</SelectItem>
                  <SelectItem value="6m">Last 6 Months</SelectItem>
                  <SelectItem value="1y">Last Year</SelectItem>
                </SelectContent>
              </Select>

              {canViewAll && (
                <Select value={userFilter} onValueChange={setUserFilter}>
                  <SelectTrigger className="w-[180px] bg-white">
                    <SelectValue placeholder="Select User" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Users</SelectItem>
                    {counsellorData.map(c => (
                      <SelectItem key={c.name} value={c.name}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}

              <Select value={salesTypeFilter} onValueChange={setSalesTypeFilter}>
                <SelectTrigger className="w-[180px] bg-white">
                  <SelectValue placeholder="Sales Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Sales Types</SelectItem>
                  <SelectItem value="student">Student Visa</SelectItem>
                  <SelectItem value="visitor">Visitor Visa</SelectItem>
                  <SelectItem value="spouse">Spouse Visa</SelectItem>
                </SelectContent>
              </Select>
            </div>
          }
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Financial Overview */}
          <Card className="border-none shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg font-semibold">Financial Overview</CardTitle>
              <CardDescription>Total Revenue vs Pending Payments</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={currentFinancialData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="name" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis 
                      fontSize={12} 
                      tickLine={false} 
                      axisLine={false}
                      tickFormatter={(value) => `₹${value/1000}k`}
                    />
                    <Tooltip 
                      formatter={(value: number) => [`₹${value.toLocaleString()}`, undefined]}
                      cursor={{ fill: 'transparent' }}
                    />
                    <Legend />
                    <Bar dataKey="revenue" name="Revenue" fill="#0f172a" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="pending" name="Pending" fill="#ef4444" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Enrollment Trends */}
          <Card className="border-none shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg font-semibold">Enrollment Trends</CardTitle>
              <CardDescription>New client enrollments over time</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={currentEnrollmentData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="name" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis fontSize={12} tickLine={false} axisLine={false} />
                    <Tooltip />
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
          <Card className="border-none shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg font-semibold">Service Distribution</CardTitle>
              <CardDescription>Breakdown by sales type</CardDescription>
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
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend verticalAlign="bottom" height={36}/>
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Counsellor Performance */}
          <Card className="border-none shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg font-semibold">Counsellor Performance</CardTitle>
              <CardDescription>Top performers by active clients and revenue</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {currentCounsellorData.map((counsellor, index) => (
                  <div key={index} className="flex items-center justify-between p-2 hover:bg-muted/50 rounded-lg transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary font-bold text-xs">
                        {index + 1}
                      </div>
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={counsellor.avatar} />
                        <AvatarFallback className="bg-muted text-xs">
                          {counsellor.name.split(' ').map(n => n[0]).join('')}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-sm font-medium leading-none">{counsellor.name}</p>
                        <p className="text-xs text-muted-foreground mt-1">{counsellor.clients} Active Clients</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold">₹{(counsellor.revenue / 100000).toFixed(1)}L</p>
                      <p className="text-xs text-muted-foreground">Revenue</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </PageWrapper>
  );
}
