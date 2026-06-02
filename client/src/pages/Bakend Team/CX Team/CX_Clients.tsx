import { useState, useMemo } from "react";
import { useLocation } from "wouter";
import { PageWrapper } from "@/layout/PageWrapper";
import { DataTable } from "@/components/table/DataTable";
import { TableActions } from "@/components/table/TableActions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Download } from "lucide-react";
import { DashboardDateFilter } from "@/components/dashboard/DashboardDateFilter";
import { useAuth } from "@/context/auth-context";

type DateFilter = "today" | "weekly" | "monthly" | "custom";

interface CxClient {
  id: string;
  name: string;
  salesType: string;
  enrollmentDate: string;
  totalDocs: number;
  pendingDocs: number;
  stage: string;
}

const MOCK_CLIENTS: CxClient[] = [
  { id: "10", name: "Hemali Kanjaria",   salesType: "Canada Student",  enrollmentDate: "10-01-2026", totalDocs: 10, pendingDocs: 6,  stage: "Documentation" },
  { id: "11", name: "Sidikaben Vahora",   salesType: "Australia Work",  enrollmentDate: "15-01-2026", totalDocs: 10, pendingDocs: 2,  stage: "Application" },
  { id: "12", name: "Trushaben Patel",   salesType: "UK Spouse",       enrollmentDate: "20-01-2026", totalDocs: 12, pendingDocs: 0,  stage: "Binding" },
  { id: "13", name: "Meenalben Manishgar",    salesType: "Germany Student", enrollmentDate: "22-01-2026", totalDocs: 12, pendingDocs: 3,  stage: "Visa Filing" },
  { id: "14", name: "Talat Jahan",   salesType: "Canada Visitor",  enrollmentDate: "25-01-2026", totalDocs: 12, pendingDocs: 0,  stage: "Visa Result" },
  { id: "15", name: "Sejad Vohra",     salesType: "Only Products",   enrollmentDate: "28-01-2026", totalDocs: 0,  pendingDocs: 0,  stage: "N/A" },
];

const STAGE_BADGE: Record<string, string> = {
  Documentation: "bg-blue-50 text-blue-700 border-blue-200",
  "Backend Ops": "bg-purple-50 text-purple-700 border-purple-200",
  Binding: "bg-indigo-50 text-indigo-700 border-indigo-200",
  Application: "bg-amber-50 text-amber-700 border-amber-200",
  "Visa Filing": "bg-orange-50 text-orange-700 border-orange-200",
  "Visa Result": "bg-cyan-50 text-cyan-700 border-cyan-200",
  "Post Visa": "bg-teal-50 text-teal-700 border-teal-200",
  Completed: "bg-emerald-50 text-emerald-700 border-emerald-200",
  "N/A": "bg-gray-50 text-gray-500 border-gray-200",
};

export default function CxClients() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const [search, setSearch] = useState("");
  const [dateFilter, setDateFilter] = useState<DateFilter>("monthly");

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return MOCK_CLIENTS;
    return MOCK_CLIENTS.filter(c => c.name.toLowerCase().includes(q));
  }, [search]);

  const handleExport = () => {
    // placeholder — wire up real export when API is connected
  };

  const openClient = (id: string) => {
    sessionStorage.setItem("client_list_return_path", "/cx/clients");
    setLocation(`/clients/${id}/view`);
  };

  const columns = [
    {
      header: "Sr No",
      cell: (_: CxClient, index: number) => (
        <span className="text-slate-400 font-mono text-xs">{String(index + 1).padStart(2, "0")}</span>
      ),
      className: "w-[60px]",
    },
    {
      header: "Name",
      cell: (c: CxClient) => (
        <span className="font-semibold text-slate-900 dark:text-slate-100">{c.name}</span>
      ),
    },
    {
      header: "Sales Type",
      cell: (c: CxClient) => (
        <Badge variant="outline" className="font-normal whitespace-nowrap bg-slate-50 text-slate-600 border-slate-200">
          {c.salesType}
        </Badge>
      ),
    },
    {
      header: "Enrollment Date",
      cell: (c: CxClient) => <span className="text-slate-500 whitespace-nowrap">{c.enrollmentDate}</span>,
    },
    {
      header: "Stage",
      cell: (c: CxClient) => (
        <Badge variant="outline" className={`font-medium whitespace-nowrap ${STAGE_BADGE[c.stage] ?? STAGE_BADGE["N/A"]}`}>
          {c.stage}
        </Badge>
      ),
    },
    {
      header: "Total Docs",
      cell: (c: CxClient) => (
        <span className="font-medium tabular-nums">{c.totalDocs > 0 ? c.totalDocs : "—"}</span>
      ),
    },
    {
      header: "Pending Docs",
      cell: (c: CxClient) => (
        <span className={c.pendingDocs > 0 ? "text-amber-600 font-semibold tabular-nums" : "text-slate-400 tabular-nums"}>
          {c.totalDocs > 0 ? c.pendingDocs : "—"}
        </span>
      ),
    },
    {
      header: "Actions",
      cell: (c: CxClient) => (
        <TableActions
          onView={() => openClient(c.id)}
          onEdit={() => openClient(c.id)}
          onDelete={() => {}}
          deleteLabel="Archive"
        />
      ),
    },
  ];

  const userName = (user as any)?.fullname || (user as any)?.name || "CX User";

  return (
    <PageWrapper
      title={`${userName} – Clients`}
      breadcrumbs={[{ label: "Clients" }]}
      actions={
        <Button
          variant="outline"
          className="bg-card border-border/50 shadow-sm hover:bg-muted/50"
          onClick={handleExport}
          disabled={filtered.length === 0}
        >
          <Download className="w-4 h-4 mr-2" />
          Export to Excel
        </Button>
      }
    >
      <div className="space-y-6">
        {/* Search + Date filter */}
        <div className="flex flex-col gap-4 bg-card p-4 rounded-xl border border-border/50 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="space-y-2 flex-1 min-w-[200px] max-w-sm">
              <Label className="text-xs font-medium text-muted-foreground">Search</Label>
              <Input
                placeholder="Search clients by name..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="h-9"
              />
              <p className="text-xs text-muted-foreground">Filters the list below instantly.</p>
            </div>
            <div className="flex items-center gap-2">
              <Label className="text-xs font-medium text-muted-foreground shrink-0">Date filter</Label>
              <DashboardDateFilter
                date={[null, null]}
                onDateChange={() => {}}
                activeTab={
                  dateFilter === "today" ? "Today" :
                  dateFilter === "weekly" ? "Weekly" :
                  dateFilter === "monthly" ? "Monthly" : "Custom"
                }
                onTabChange={tab => {
                  const next = tab === "Today" ? "today" : tab === "Weekly" ? "weekly" : tab === "Monthly" ? "monthly" : "custom";
                  setDateFilter(next as DateFilter);
                }}
                showYearly={false}
                align="end"
              />
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="bg-card rounded-xl border border-border/50 shadow-sm overflow-hidden">
          <DataTable
            data={filtered}
            columns={columns}
            onRowClick={c => openClient(c.id)}
          />
          {filtered.length === 0 && (
            <div className="text-center py-12 text-muted-foreground text-sm">
              No clients found. Try a different search.
            </div>
          )}
        </div>
      </div>
    </PageWrapper>
  );
}
