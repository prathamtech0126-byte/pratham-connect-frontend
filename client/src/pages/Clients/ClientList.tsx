import { PageWrapper } from "@/layout/PageWrapper";
import { DataTable } from "@/components/table/DataTable";
import { TableToolbar } from "@/components/table/TableToolbar";
import { TableActions } from "@/components/table/TableActions";
import { clientService, Client } from "@/services/clientService";
import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Plus, Download, X, Filter } from "lucide-react";
import { useLocation } from "wouter";
import { useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { pdf } from "@react-pdf/renderer";
import { ClientReportPDF } from "@/components/pdf/ClientReportPDF";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

export default function ClientList() {
  const [, setLocation] = useLocation();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [salesTypeFilter, setSalesTypeFilter] = useState("all");
  const [pmFilter, setPmFilter] = useState("all");
  const [counsellorFilter, setCounsellorFilter] = useState("all");
  const [paymentStatusFilter, setPaymentStatusFilter] = useState("all");

  const { data: clients, isLoading } = useQuery({
    queryKey: ['clients'],
    queryFn: clientService.getClients
  });

  const filteredClients = clients?.filter(s => {
    const matchesSearch = s.name.toLowerCase().includes(search.toLowerCase()) || 
                          s.counsellor.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === "all" || s.status.toLowerCase() === statusFilter.toLowerCase();
    const matchesSalesType = salesTypeFilter === "all" || s.salesType === salesTypeFilter;
    const matchesPm = pmFilter === "all" || s.productManager === pmFilter;
    const matchesCounsellor = counsellorFilter === "all" || s.counsellor === counsellorFilter;
    
    let matchesPaymentStatus = true;
    if (paymentStatusFilter === "fully_paid") {
      matchesPaymentStatus = s.amountPending === 0;
    } else if (paymentStatusFilter === "has_pending") {
      matchesPaymentStatus = s.amountPending > 0;
    }

    return matchesSearch && matchesStatus && matchesSalesType && matchesPm && matchesCounsellor && matchesPaymentStatus;
  }) || [];

  // Get unique values for filters
  const uniqueSalesTypes = Array.from(new Set(clients?.map(c => c.salesType) || [])).sort();
  const uniqueProductManagers = Array.from(new Set(clients?.map(c => c.productManager) || [])).sort();
  const uniqueCounsellors = Array.from(new Set(clients?.map(c => c.counsellor) || [])).sort();

  const columns = [
    { header: "Sr No", cell: (_: Client, index: number) => <span className="text-slate-400 font-mono text-xs">{String(index + 1).padStart(2, '0')}</span>, className: "w-[60px]" },
    { header: "Name", accessorKey: "name", className: "font-semibold text-slate-900" },
    { header: "Sales Type", cell: (s: Client) => <Badge variant="outline" className="font-normal whitespace-nowrap bg-slate-50 text-slate-600 border-slate-200">{s.salesType}</Badge> },
    { header: "Enrollment Date", accessorKey: "enrollmentDate", className: "whitespace-nowrap text-slate-500" },
    { header: "Product Manager", accessorKey: "productManager", className: "whitespace-nowrap text-slate-500" },
    { header: "Total Payment", cell: (s: Client) => `₹${s.totalPayment.toLocaleString()}` },
    { header: "Received", cell: (s: Client) => <span className="text-emerald-600 font-medium">₹{s.amountReceived.toLocaleString()}</span> },
    { header: "Pending", cell: (s: Client) => <span className={s.amountPending > 0 ? "text-amber-600 font-medium" : "text-slate-400"}>₹{s.amountPending.toLocaleString()}</span> },
    { header: "Counsellor", accessorKey: "counsellor", className: "whitespace-nowrap text-slate-500" },
    { header: "Status", cell: (s: Client) => (
      <Badge variant={s.status === 'Active' ? 'default' : s.status === 'Completed' ? 'secondary' : 'outline'} className={s.status === 'Active' ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100' : ''}>
        {s.status}
      </Badge>
    )},
    { header: "Actions", cell: (s: Client) => (
      <TableActions 
        onView={() => setLocation(`/clients/${s.id}`)}
        onEdit={() => setLocation(`/clients/${s.id}/edit`)}
      />
    )}
  ];

  const handleExportPDF = async () => {
    if (!filteredClients || filteredClients.length === 0) return;

    try {
      const blob = await pdf(
        <ClientReportPDF 
          clients={filteredClients} 
          filterDescription={
            [
              salesTypeFilter !== "all" ? `Sales: ${salesTypeFilter}` : "",
              statusFilter !== "all" ? `Status: ${statusFilter}` : ""
            ].filter(Boolean).join(", ")
          }
        />
      ).toBlob();
      
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `clients-report-${new Date().toISOString().split('T')[0]}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error("Error generating PDF:", error);
    }
  };

  const handleClearFilters = () => {
    setSalesTypeFilter("all");
    setPmFilter("all");
    setCounsellorFilter("all");
    setStatusFilter("all");
    setPaymentStatusFilter("all");
  };

  const isFilterActive = salesTypeFilter !== "all" || pmFilter !== "all" || counsellorFilter !== "all" || statusFilter !== "all" || paymentStatusFilter !== "all";

  // Grouping Logic
  const groupedData = (filteredClients || []).reduce((acc, client) => {
    const counselor = client.counsellor || 'Unassigned';
    const date = new Date(client.enrollmentDate);
    const year = date.getFullYear().toString();
    const month = date.toLocaleString('default', { month: 'long' });

    if (!acc[counselor]) acc[counselor] = { total: 0, years: {} };
    acc[counselor].total++;

    if (!acc[counselor].years[year]) acc[counselor].years[year] = {};
    if (!acc[counselor].years[year][month]) acc[counselor].years[year][month] = [];

    acc[counselor].years[year][month].push(client);
    return acc;
  }, {} as Record<string, { total: number, years: Record<string, Record<string, Client[]>> }>);

  // Sort counselors by total clients (Highest to Lowest)
  const sortedCounselors = Object.entries(groupedData).sort((a, b) => b[1].total - a[1].total);

  return (
    <PageWrapper 
      title="Clients"  
      breadcrumbs={[{ label: "Clients" }]}
      actions={
        <div className="flex gap-3">
          <Button variant="outline" onClick={handleExportPDF} className="bg-white border-slate-200 shadow-sm hover:bg-slate-50">
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
          <Button onClick={() => setLocation("/clients/new")} className="shadow-md shadow-primary/20">
            <Plus className="w-4 h-4 mr-2" />
            Add Client
          </Button>
        </div>
      }
    >
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <TableToolbar 
              searchPlaceholder="Search clients..."
              onSearch={setSearch}
              className="w-full sm:w-auto flex-1"
            />
            
            <div className="flex items-center gap-2 w-full sm:w-auto">
                <Popover>
                    <PopoverTrigger asChild>
                        <Button variant="outline" className={`border-slate-200 ${isFilterActive ? 'bg-primary/5 border-primary/20 text-primary' : 'bg-white'}`}>
                            <Filter className="w-4 h-4 mr-2" />
                            Filters
                            {isFilterActive && <span className="ml-1.5 h-2 w-2 rounded-full bg-primary" />}
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-80 p-4" align="end">
                        <div className="space-y-4">
                            <h4 className="font-semibold text-sm text-slate-900">Filter Clients</h4>
                            <div className="space-y-2">
                                <label className="text-xs font-medium text-slate-500">Sales Type</label>
                                <Select value={salesTypeFilter} onValueChange={setSalesTypeFilter}>
                                    <SelectTrigger className="h-9">
                                    <SelectValue placeholder="All Types" />
                                    </SelectTrigger>
                                    <SelectContent>
                                    <SelectItem value="all">All Sales Types</SelectItem>
                                    {uniqueSalesTypes.map(type => (
                                        <SelectItem key={type} value={type}>{type}</SelectItem>
                                    ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            
                            <div className="space-y-2">
                                <label className="text-xs font-medium text-slate-500">Status</label>
                                <Select value={statusFilter} onValueChange={setStatusFilter}>
                                    <SelectTrigger className="h-9">
                                    <SelectValue placeholder="All Status" />
                                    </SelectTrigger>
                                    <SelectContent>
                                    <SelectItem value="all">All Status</SelectItem>
                                    <SelectItem value="active">Active</SelectItem>
                                    <SelectItem value="pending">Pending</SelectItem>
                                    <SelectItem value="completed">Completed</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <label className="text-xs font-medium text-slate-500">Counsellor</label>
                                <Select value={counsellorFilter} onValueChange={setCounsellorFilter}>
                                    <SelectTrigger className="h-9">
                                    <SelectValue placeholder="All Counsellors" />
                                    </SelectTrigger>
                                    <SelectContent>
                                    <SelectItem value="all">All Counsellors</SelectItem>
                                    {uniqueCounsellors.map(c => (
                                        <SelectItem key={c} value={c}>{c}</SelectItem>
                                    ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            {isFilterActive && (
                                <Button 
                                    variant="ghost" 
                                    onClick={handleClearFilters}
                                    className="w-full text-red-600 hover:text-red-700 hover:bg-red-50 h-9"
                                >
                                    Clear Filters
                                </Button>
                            )}
                        </div>
                    </PopoverContent>
                </Popover>
            </div>
        </div>
        
        {sortedCounselors.length > 0 ? (
            <div className="space-y-8">
                {sortedCounselors.map(([counselor, data], index) => {
                    // Calculate color intensity based on rank (0 is highest)
                    // We'll use a blue scale: 
                    // Top rank: Stronger/Darker Blue
                    // Lower ranks: Lighter/Fainter Blue
                    // We can map index to an opacity or shade class
                    
                    let headerClass = "bg-slate-50 border-slate-200";
                    let textClass = "text-slate-900";
                    let badgeClass = "bg-slate-200 text-slate-700";

                    // Top 3 get special colors
                    if (index === 0) {
                        headerClass = "bg-blue-600 border-blue-600 text-white";
                        textClass = "text-white";
                        badgeClass = "bg-white/20 text-white hover:bg-white/30";
                    } else if (index === 1) {
                        headerClass = "bg-blue-500 border-blue-500 text-white";
                        textClass = "text-white";
                        badgeClass = "bg-white/20 text-white hover:bg-white/30";
                    } else if (index === 2) {
                        headerClass = "bg-blue-400 border-blue-400 text-white";
                        textClass = "text-white";
                        badgeClass = "bg-white/20 text-white hover:bg-white/30";
                    } else if (index < 5) {
                         headerClass = "bg-blue-50 border-blue-200";
                         textClass = "text-blue-900";
                         badgeClass = "bg-blue-100 text-blue-700";
                    }

                    return (
                        <div key={counselor} className="space-y-4">
                            {/* Distinct Counselor Section Header */}
                            <div className={`flex items-center justify-between p-4 rounded-xl border shadow-sm ${headerClass}`}>
                                <div className="flex items-center gap-3">
                                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-white/20 font-bold text-sm border border-white/10">
                                        {index + 1}
                                    </div>
                                    <h3 className={`text-xl font-bold ${textClass}`}>{counselor}</h3>
                                    <Badge variant="outline" className={`border-0 ${badgeClass}`}>
                                        {data.total} Clients
                                    </Badge>
                                </div>
                            </div>

                            {/* Years Section - Distinct from Counselor Header */}
                            <div className="pl-4 border-l-2 border-slate-100 ml-6 space-y-6">
                                {Object.keys(data.years).sort((a, b) => Number(b) - Number(a)).map(year => (
                                    <div key={`${counselor}-${year}`} className="space-y-3">
                                        <h4 className="text-lg font-semibold text-slate-700 flex items-center gap-2">
                                            <span className="w-2 h-2 rounded-full bg-slate-300"></span>
                                            {year}
                                        </h4>
                                        
                                        <Accordion type="multiple" className="w-full pl-4">
                                            {Object.entries(data.years[year]).map(([month, clients]) => (
                                                <AccordionItem value={`${counselor}-${year}-${month}`} key={`${counselor}-${year}-${month}`} className="border rounded-lg mb-2 px-3 bg-white shadow-sm">
                                                    <AccordionTrigger className="text-sm font-medium hover:no-underline py-3 text-slate-700">
                                                        <span className="flex items-center gap-2">
                                                            {month} 
                                                            <Badge variant="secondary" className="text-xs h-5 px-1.5 min-w-[20px] justify-center ml-1">
                                                                {clients.length}
                                                            </Badge>
                                                        </span>
                                                    </AccordionTrigger>
                                                    <AccordionContent className="pb-3">
                                                        <div className="mt-1 border rounded-md overflow-hidden">
                                                            <DataTable 
                                                                data={clients} 
                                                                columns={columns} 
                                                                onRowClick={(s) => setLocation(`/clients/${s.id}`)}
                                                            />
                                                        </div>
                                                    </AccordionContent>
                                                </AccordionItem>
                                            ))}
                                        </Accordion>
                                    </div>
                                ))}
                            </div>
                        </div>
                    );
                })}
            </div>
        ) : (
            <div className="text-center py-10 bg-white rounded-xl border border-dashed border-slate-300">
                <p className="text-slate-500">No clients found matching your filters.</p>
                <Button variant="link" onClick={handleClearFilters} className="mt-2">Clear all filters</Button>
            </div>
        )}
      </div>
    </PageWrapper>
  );
}
