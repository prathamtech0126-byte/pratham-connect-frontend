import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

// Mock data for monthly view (default)
const mockData = [
  { name: "Jan", revenue: 12000 },
  { name: "Feb", revenue: 18000 },
  { name: "Mar", revenue: 25000 },
  { name: "Apr", revenue: 21000 },
  { name: "May", revenue: 32000 },
  { name: "Jun", revenue: 45000 },
];

interface MonthlyRevenue {
  month: string;
  revenue: string;
}

interface ChartDataPoint {
  label: string;
  revenue?: number; // Optional - exists for Admin/Manager, missing for Counsellor
  clientCount?: number; // Counsellor Individual Performance: enrollments per period
  coreSale?: { count: number; amount?: number };
  coreProduct?: { count: number; amount?: number };
  otherProduct?: { count: number; amount?: number };
}

interface ChartData {
  data: ChartDataPoint[];
  summary?: {
    total: number;
    previousTotal: number;
    changePercent: number;
  };
}

interface RevenueChartProps {
  className?: string;
  monthlyRevenue?: MonthlyRevenue[];
  chartData?: ChartData;
  range?: string; // "today" | "week" | "month" | "year" | "custom"
  title?: string; // Optional custom title
  /** e.g. "Jan - Feb (Today 2 Feb 2026)" for monthly rolling range */
  rangeLabel?: string;
}

export function RevenueChart({ className, monthlyRevenue, chartData, range = "year", title, rangeLabel }: RevenueChartProps) {
  // Month order for chronological sorting (Jan to Dec)
  const monthOrder: { [key: string]: number } = {
    "Jan": 1, "Feb": 2, "Mar": 3, "Apr": 4,
    "May": 5, "Jun": 6, "Jul": 7, "Aug": 8,
    "Sep": 9, "Oct": 10, "Nov": 11, "Dec": 12
  };

  // Day order for week view
  const dayOrder: { [key: string]: number } = {
    "Mon": 1, "Tue": 2, "Wed": 3, "Thu": 4,
    "Fri": 5, "Sat": 6, "Sun": 7
  };

  // Determine which data source to use
  let transformedData: Array<{ name: string; revenue: number }> = [];

  if (range === "year" && monthlyRevenue && monthlyRevenue.length > 0) {
    // Use revenueOverview for yearly view
    transformedData = monthlyRevenue
      .map(item => ({
        name: item.month,
        revenue: Number(item.revenue || 0)
      }))
      .sort((a, b) => {
        const orderA = monthOrder[a.name] || 999;
        const orderB = monthOrder[b.name] || 999;
        return orderA - orderB;
      });
  } else if (chartData && chartData.data && chartData.data.length > 0) {
    // Use chartData for today/week/month/custom views (Admin/Manager: revenue or counts; Counsellor: clientCount)
    const mapped = chartData.data.map(item => {
      let value = 0;
      if (item.clientCount !== undefined && item.clientCount !== null) {
        value = typeof item.clientCount === 'number' ? item.clientCount : Number(item.clientCount || 0);
      } else if (item.revenue !== undefined && item.revenue !== null) {
        value = typeof item.revenue === 'number' ? item.revenue : Number(item.revenue || 0);
      } else {
        const coreSaleCount = typeof item.coreSale?.count === 'string' ? Number(item.coreSale?.count || 0) : (item.coreSale?.count || 0);
        const coreProductCount = item.coreProduct?.count || 0;
        const otherProductCount = item.otherProduct?.count || 0;
        value = coreSaleCount + coreProductCount + otherProductCount;
      }
      return { name: String(item.label).trim(), revenue: value };
    });

    const isCounsellorChart = chartData.data.some(item =>
      item.clientCount !== undefined && item.clientCount !== null
    );
    if (range === "month" || range === "custom") {
      // Counsellor Individual Performance: keep API order (e.g. Thu 29, Fri 30, ..., Thu 5).
      if (isCounsellorChart) {
        transformedData = mapped;
      } else if (mapped.length > 31) {
        // Rolling month: API returns chronological order; keep it.
        transformedData = mapped;
      } else {
        // Single calendar month: dedupe by day (sum revenue), fill 1–31.
        const byDay: Record<string, number> = {};
        mapped.forEach(({ name, revenue }) => {
          const day = name.replace(/[^0-9]/g, '') || name;
          if (day) byDay[day] = (byDay[day] ?? 0) + revenue;
        });
        const daysInMonth = 31;
        transformedData = Array.from({ length: daysInMonth }, (_, i) => {
          const day = String(i + 1);
          return { name: day, revenue: byDay[day] ?? 0 };
        });
      }
    } else {
      transformedData = mapped;
      transformedData.sort((a, b) => {
        if (range === "week") {
          const orderA = dayOrder[a.name] || 999;
          const orderB = dayOrder[b.name] || 999;
          return orderA - orderB;
        } else if (range === "today") {
          const timeA = a.name.split(':').map(Number);
          const timeB = b.name.split(':').map(Number);
          if (timeA.length === 2 && timeB.length === 2) {
            return (timeA[0] * 60 + timeA[1]) - (timeB[0] * 60 + timeB[1]);
          }
          return 0;
        }
        return 0;
      });
    }
  } else {
    // Fallback to mock data
    transformedData = mockData;
  }

  const chartDataFinal = transformedData;

  // Determine if we're showing revenue (Admin/Manager) or counts (Counsellor: clientCount)
  const hasClientCount = chartData?.data?.some(item =>
    item.clientCount !== undefined && item.clientCount !== null
  ) ?? false;
  const hasRevenueField = !hasClientCount && (chartData?.data?.some(item =>
    item.revenue !== undefined && item.revenue !== null
  ) ?? false);

  return (
    <Card className={cn("col-span-4 border-none shadow-sm flex flex-col h-full", className)}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-7">
        <div className="space-y-1">
          <CardTitle className="text-subheader">{title || "Revenue Overview"}</CardTitle>
          {rangeLabel && (
            <p className="text-xs text-muted-foreground font-normal">{rangeLabel}</p>
          )}
        </div>
      </CardHeader>
      <CardContent className="pl-2 flex-1 min-h-[350px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartDataFinal}>
            <XAxis
              dataKey="name"
              stroke="#888888"
              fontSize={12}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              allowDecimals={false}
              stroke="#888888"
              fontSize={12}
              tickLine={false}
              axisLine={false}
              tickFormatter={(value) => {
                // If revenue field exists, format as currency; otherwise format as number
                return hasRevenueField ? `₹${value}` : `${value}`;
              }}
            />
            <Tooltip
              cursor={{ fill: 'transparent' }}
              contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
              formatter={(value: number) => {
                // Revenue = currency; clientCount = "Clients"; other counts = "Count"
                const formattedValue = hasRevenueField
                  ? `₹${value.toLocaleString()}`
                  : value.toLocaleString();
                const label = hasRevenueField ? "Revenue" : (hasClientCount ? "Clients" : "Count");
                return [formattedValue, label];
              }}
            />
            <Bar
              dataKey="revenue"
              fill="hsl(var(--primary))"
              radius={[4, 4, 0, 0]}
              barSize={40}
            />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
