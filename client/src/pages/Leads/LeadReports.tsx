import { useState, useMemo } from "react";
import { Link } from "wouter";
import { PageWrapper } from "@/layout/PageWrapper";
import { useAuth } from "@/context/auth-context";
import { canAccessCustomReports } from "@/lib/lead-permissions";
import { Redirect } from "wouter";
import { DUMMY_LEADS, DUMMY_ASSIGNEE_OPTIONS } from "@/data/dummyLeads";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatCard } from "@/components/cards/StatCard";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Users, UserCheck, Phone, Target, BarChart3 } from "lucide-react";
import { format, startOfMonth, endOfMonth, parseISO, isWithinInterval } from "date-fns";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const STATUS_OPTIONS = [
  { value: "all", label: "All statuses" },
  { value: "new", label: "New" },
  { value: "contacted", label: "Contacted" },
  { value: "qualified", label: "Qualified" },
  { value: "converted", label: "Converted" },
  { value: "lost", label: "Lost" },
];

function getDefaultDateRange(): [string, string] {
  const start = startOfMonth(new Date());
  const end = endOfMonth(new Date());
  return [format(start, "yyyy-MM-dd"), format(end, "yyyy-MM-dd")];
}

export default function LeadReports() {
  const { user } = useAuth();
  const [dateRange, setDateRange] = useState<[string, string]>(getDefaultDateRange());
  const [assigneeFilter, setAssigneeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  if (!user || !canAccessCustomReports(user.role)) {
    return <Redirect to="/" />;
  }

  const filteredLeads = useMemo(() => {
    let list = [...DUMMY_LEADS];
    const [startStr, endStr] = dateRange;
    const start = parseISO(startStr);
    const end = parseISO(endStr);
    list = list.filter((l) => {
      const d = new Date(l.createdAt);
      return isWithinInterval(d, { start, end });
    });
    if (assigneeFilter !== "all") list = list.filter((l) => l.assignedToId === assigneeFilter);
    if (statusFilter !== "all") list = list.filter((l) => l.status === statusFilter);
    return list;
  }, [dateRange, assigneeFilter, statusFilter]);

  const summary = useMemo(() => {
    const total = filteredLeads.length;
    const byStatus = filteredLeads.reduce(
      (acc, l) => {
        acc[l.status] = (acc[l.status] ?? 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    );
    const converted = byStatus.converted ?? 0;
    const contacted = byStatus.contacted ?? 0;
    const qualified = byStatus.qualified ?? 0;
    const newCount = byStatus.new ?? 0;
    return { total, converted, contacted, qualified, new: newCount };
  }, [filteredLeads]);

  return (
    <PageWrapper
      title="Lead reports"
      breadcrumbs={[
        { label: "Leads", href: "/leads" },
        { label: "Reports" },
      ]}
    >
      <div className="space-y-6">
        {/* Filters */}
        <Card className="border-border/60 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Filters
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-end">
              <div className="space-y-2">
                <Label className="text-xs">Date from</Label>
                <Input
                  type="date"
                  value={dateRange[0]}
                  onChange={(e) => setDateRange(([_, end]) => [e.target.value, end])}
                  className="w-full sm:w-40"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Date to</Label>
                <Input
                  type="date"
                  value={dateRange[1]}
                  onChange={(e) => setDateRange(([start, _]) => [start, e.target.value])}
                  className="w-full sm:w-40"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Assigned to</Label>
                <Select value={assigneeFilter} onValueChange={setAssigneeFilter}>
                  <SelectTrigger className="w-full sm:w-44">
                    <SelectValue placeholder="All" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All assignees</SelectItem>
                    {DUMMY_ASSIGNEE_OPTIONS.map((u) => (
                      <SelectItem key={u.id} value={u.id}>
                        {u.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Status</Label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-full sm:w-40">
                    <SelectValue placeholder="All" />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUS_OPTIONS.map((o) => (
                      <SelectItem key={o.value} value={o.value}>
                        {o.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Summary cards */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Total leads"
            value={summary.total}
            icon={Users}
            description="In selected period"
          />
          <StatCard
            title="New"
            value={summary.new}
            icon={Target}
            description="New status"
          />
          <StatCard
            title="Contacted"
            value={summary.contacted}
            icon={Phone}
            description="Contacted status"
          />
          <StatCard
            title="Converted"
            value={summary.converted}
            icon={UserCheck}
            description="Converted to client"
          />
        </div>

        {/* Detail table */}
        <Card className="border-border/60 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-base">Lead detail</CardTitle>
            <Link href="/leads">
              <Button variant="outline" size="sm">View list</Button>
            </Link>
          </CardHeader>
          <CardContent>
            <div className="rounded-xl border border-border/60 overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50 hover:bg-muted/50">
                    <TableHead className="text-xs uppercase">Name</TableHead>
                    <TableHead className="text-xs uppercase">Email</TableHead>
                    <TableHead className="text-xs uppercase">Status</TableHead>
                    <TableHead className="text-xs uppercase">Stage</TableHead>
                    <TableHead className="text-xs uppercase">Assigned to</TableHead>
                    <TableHead className="text-xs uppercase">Created</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredLeads.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="h-24 text-center text-muted-foreground text-sm">
                        No leads match the selected filters.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredLeads.map((lead) => (
                      <TableRow key={lead.id} className="hover:bg-muted/30">
                        <TableCell className="font-medium">{lead.name}</TableCell>
                        <TableCell className="text-muted-foreground">{lead.email}</TableCell>
                        <TableCell className="capitalize">{lead.status}</TableCell>
                        <TableCell>{lead.stage}</TableCell>
                        <TableCell className="text-muted-foreground">
                          {lead.assignedToName ?? "—"}
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {format(new Date(lead.createdAt), "dd MMM yyyy")}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </PageWrapper>
  );
}
