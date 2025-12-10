import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { DashboardDateFilter } from "@/components/dashboard/DashboardDateFilter";

type TimeRange = "daily" | "weekly" | "monthly" | "yearly" | "custom";

// Mock data for different ranges
const mockData: Record<TimeRange, any[]> = {
  daily: [
    { name: "Mon", revenue: 4000 },
    { name: "Tue", revenue: 3000 },
    { name: "Wed", revenue: 2000 },
    { name: "Thu", revenue: 2780 },
    { name: "Fri", revenue: 1890 },
    { name: "Sat", revenue: 2390 },
    { name: "Sun", revenue: 3490 },
  ],
  weekly: [
    { name: "Week 1", revenue: 12000 },
    { name: "Week 2", revenue: 15000 },
    { name: "Week 3", revenue: 11000 },
    { name: "Week 4", revenue: 18000 },
  ],
  monthly: [
    { name: "Jan", revenue: 12000 },
    { name: "Feb", revenue: 18000 },
    { name: "Mar", revenue: 25000 },
    { name: "Apr", revenue: 21000 },
    { name: "May", revenue: 32000 },
    { name: "Jun", revenue: 45000 },
  ],
  yearly: [
    { name: "2020", revenue: 120000 },
    { name: "2021", revenue: 150000 },
    { name: "2022", revenue: 180000 },
    { name: "2023", revenue: 220000 },
    { name: "2024", revenue: 280000 },
  ],
  custom: [
     { name: "Day 1", revenue: 5000 },
     { name: "Day 2", revenue: 7000 },
     { name: "Day 3", revenue: 3000 },
     { name: "Day 4", revenue: 8000 },
     { name: "Day 5", revenue: 4000 },
  ]
};

export function RevenueChart() {
  const [timeRange, setTimeRange] = useState<TimeRange>("monthly");
  const [dateRange, setDateRange] = useState<[Date | null, Date | null]>([null, null]);

  const handleRangeChange = (range: TimeRange) => {
    setTimeRange(range);
  };

  return (
    <Card className="col-span-4 border-none shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-7">
        <CardTitle className="text-subheader">Revenue Overview</CardTitle>
        <div className="flex items-center gap-2">
            <DashboardDateFilter 
                date={dateRange} 
                onDateChange={setDateRange} 
                placeholder="Custom"
                align="end"
            />
        </div>
      </CardHeader>
      <CardContent className="pl-2">
        <ResponsiveContainer width="100%" height={350}>
          <BarChart data={mockData[timeRange]}>
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
              tickFormatter={(value) => `₹${value}`}
            />
            <Tooltip
              cursor={{ fill: 'transparent' }}
              contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
              formatter={(value: number) => [`₹${value.toLocaleString()}`, "Revenue"]}
            />
            <Bar 
                dataKey="revenue" 
                fill="hsl(var(--primary))" 
                radius={[4, 4, 0, 0]} 
                barSize={timeRange === 'monthly' ? 40 : undefined}
            />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
