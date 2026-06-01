import { useState, useMemo } from "react";
import { useLocation } from "wouter";
import { PageWrapper } from "@/layout/PageWrapper";
import { DataTable } from "@/components/table/DataTable";
import { TableActions } from "@/components/table/TableActions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Download } from "lucide-react";
import { DashboardDateFilter } from "@/components/dashboard/DashboardDateFilter";
import { useAuth } from "@/context/auth-context";
import { usePageHint } from "@/hooks/usePageHint";
import { ProductTour } from "@/components/ProductTour";

type DateFilter = "today" | "weekly" | "monthly" | "custom";
type SlaRisk = "green" | "orange" | "red";
type ClientStatus = "active" | "on_hold" | "completed" | "cancelled";

interface BindingClient {
  id: string; code: string; name: string;
  country: string; visaType: string; salesType: string;
  enrollmentDate: string;
  status: ClientStatus; slaRisk: SlaRisk;
  hoursRemaining: number | null; dueAt: string;
  daysInBinding: number;
  docsComplete: number; docsTotal: number; docsMandatory: number; docsApproved: number;
}

const MOCK_CLIENTS: BindingClient[] = [
  { id: "10", code: "PC-2024-0010", name: "Hemali Kanjaria",  salesType: "Canada Student",   country: "Canada",    visaType: "Student", enrollmentDate: "10-01-2026", status: "active",    slaRisk: "red",    hoursRemaining: -3, dueAt: "2024-06-14", daysInBinding: 12, docsComplete: 4,  docsTotal: 10, docsMandatory: 8,  docsApproved: 4  },
  { id: "11", code: "PC-2024-0011", name: "Sidikaben Vahora",  salesType: "Australia Work",   country: "Australia", visaType: "Work",    enrollmentDate: "15-01-2026", status: "active",    slaRisk: "orange", hoursRemaining: 8,  dueAt: "2024-06-15", daysInBinding: 7,  docsComplete: 8,  docsTotal: 10, docsMandatory: 8,  docsApproved: 7  },
  { id: "12", code: "PC-2024-0012", name: "Trushaben Patel",  salesType: "UK Spouse",        country: "UK",        visaType: "Spouse",  enrollmentDate: "20-01-2026", status: "active",    slaRisk: "green",  hoursRemaining: 48, dueAt: "2024-06-18", daysInBinding: 5,  docsComplete: 10, docsTotal: 10, docsMandatory: 8,  docsApproved: 10 },
  { id: "13", code: "PC-2024-0013", name: "Meenalben Manishgar",   salesType: "Germany Student",  country: "Germany",   visaType: "Student", enrollmentDate: "22-01-2026", status: "on_hold",   slaRisk: "orange", hoursRemaining: 5,  dueAt: "2024-06-15", daysInBinding: 9,  docsComplete: 9,  docsTotal: 12, docsMandatory: 10, docsApproved: 7  },
  { id: "14", code: "PC-2024-0014", name: "Talat Jahan",  salesType: "Canada Visitor",   country: "Canada",    visaType: "Visitor", enrollmentDate: "25-01-2026", status: "active",    slaRisk: "green",  hoursRemaining: 72, dueAt: "2024-06-20", daysInBinding: 3,  docsComplete: 6,  docsTotal: 12, docsMandatory: 10, docsApproved: 6  },
  { id: "15", code: "PC-2024-0015", name: "Sejad Vohra",    salesType: "USA Student",      country: "USA",       visaType: "Student", enrollmentDate: "28-01-2026", status: "active",    slaRisk: "green",  hoursRemaining: 96, dueAt: "2024-06-22", daysInBinding: 2,  docsComplete: 12, docsTotal: 12, docsMandatory: 10, docsApproved: 10 },
];

function SlaRiskBadge({ risk, hours }: { risk: SlaRisk; hours: number | null }) {
  if (risk === "red")    return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">🔴 {hours !== null && hours < 0 ? `${Math.abs(hours)}h overdue` : "Breach"}</span>;
  if (risk === "orange") return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-700">🟠 {hours}h left</span>;
  return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">🟢 On track</span>;
}

export default function BtClients() {
  const { showHint, dismissHint } = usePageHint("bt_clients");
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const [search, setSearch] = useState("");
  const [dateFilter, setDateFilter] = useState<DateFilter>("monthly");

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return MOCK_CLIENTS;
    return MOCK_CLIENTS.filter(c =>
      c.name.toLowerCase().includes(q) || c.code.toLowerCase().includes(q)
    );
  }, [search]);

  const handleExport = () => {
    // placeholder — wire up real export when API is connected
  };

  const openClient = (id: string) => {
    sessionStorage.setItem("client_list_return_path", "/binding/clients");
    setLocation(`/clients/${id}/view`);
  };

  const columns = [
    {
      header: "Sr No",
      cell: (_: BindingClient, index: number) => (
        <span className="text-slate-400 font-mono text-xs">{String(index + 1).padStart(2, "0")}</span>
      ),
      className: "w-[60px]",
    },
    {
      header: "Name",
      cell: (c: BindingClient) => (
        <div>
          <p className="font-semibold text-slate-900 dark:text-slate-100">{c.name}</p>
          <p className="text-xs text-muted-foreground">{c.code}</p>
        </div>
      ),
    },
    {
      header: "Sales Type",
      cell: (c: BindingClient) => (
        <Badge variant="outline" className="font-normal whitespace-nowrap bg-slate-50 text-slate-600 border-slate-200">
          {c.salesType}
        </Badge>
      ),
    },
    {
      header: "Enrollment Date",
      cell: (c: BindingClient) => (
        <span className="text-slate-500 whitespace-nowrap">{c.enrollmentDate}</span>
      ),
    },
    {
      header: "Documents",
      cell: (c: BindingClient) => {
        // This column is "mandatory readiness", so cap approved documents to the mandatory count.
        const approvedForMandatory =
          c.docsMandatory > 0 ? Math.min(c.docsApproved, c.docsMandatory) : 0;
        const pct = c.docsMandatory > 0 ? Math.round((approvedForMandatory / c.docsMandatory) * 100) : 0;

        return (
          <div className="space-y-1 w-28">
            <Progress value={pct} className="h-1.5" />
            <div className="flex items-center justify-between gap-1">
              <span className="text-xs text-muted-foreground">
                {approvedForMandatory}/{c.docsMandatory}
              </span>
            </div>
          </div>
        );
      },
    },
    {
      header: "TAT Risk",
      cell: (c: BindingClient) => <SlaRiskBadge risk={c.slaRisk} hours={c.hoursRemaining} />,
    },
    {
      header: "Time in Binding",
      cell: (c: BindingClient) => (
        <span className="text-slate-500 tabular-nums">{c.daysInBinding}d</span>
      ),
    },
    {
      header: "Due At",
      cell: (c: BindingClient) => (
        <span className="text-slate-500 whitespace-nowrap">{c.dueAt}</span>
      ),
    },
    {
      header: "Status",
      cell: (c: BindingClient) => (
        <Badge variant="outline" className={
          c.status === "active"    ? "bg-primary/10 text-primary border-primary/20" :
          c.status === "on_hold"   ? "bg-yellow-100 text-yellow-700 border-yellow-200" :
          c.status === "completed" ? "bg-green-100 text-green-700 border-green-200" :
          "bg-muted text-muted-foreground"
        }>
          {c.status.replace("_", " ")}
        </Badge>
      ),
    },
    {
      header: "Actions",
      cell: (c: BindingClient) => (
        <TableActions
          onView={() => openClient(c.id)}
          onEdit={() => openClient(c.id)}
          onDelete={() => {}}
          deleteLabel="Archive"
        />
      ),
    },
  ];

  const userName = (user as any)?.fullname || (user as any)?.name || "Binding User";

  return (
    <PageWrapper
      title={`${userName} – Clients`}
      breadcrumbs={[{ label: "Binding Team", href: "/binding/dashboard" }, { label: "Clients" }]}
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
        <div data-tour="bt-clients-filters" className="flex flex-col gap-4 bg-card p-4 rounded-xl border border-border/50 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="space-y-2 flex-1 min-w-[200px] max-w-sm">
              <Label className="text-xs font-medium text-muted-foreground">Search</Label>
              <Input
                placeholder="Search by name or code..."
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
        <div data-tour="bt-clients-table" className="bg-card rounded-xl border border-border/50 shadow-sm overflow-hidden">
          <DataTable
            data={filtered}
            columns={columns}
            onRowClick={c => openClient(c.id)}
          />
          <div className="px-4 py-3 border-t border-border text-xs text-muted-foreground">
            Showing {filtered.length} of {MOCK_CLIENTS.length} clients in binding stage
          </div>
        </div>
      </div>

      <ProductTour
        open={showHint}
        onClose={dismissHint}
        steps={[
          { target: '[data-tour="bt-clients-filters"]', title: "Search & Filter", content: "Search by client name or code, and filter by date range to focus on specific periods.", side: "bottom" },
          { target: '[data-tour="bt-clients-table"]', title: "Binding Queue", content: "Each row shows document progress, TAT countdown, and time in binding. Click View to open the Binding Studio.", side: "top" },
        ]}
      />
    </PageWrapper>
  );
}
