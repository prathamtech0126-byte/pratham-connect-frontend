import { PageWrapper } from "@/layout/PageWrapper";
import { DataTable } from "@/components/table/DataTable";
import { TableToolbar } from "@/components/table/TableToolbar";
import { TableActions } from "@/components/table/TableActions";
import { clientService, Client } from "@/services/clientService";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Plus, Download, X, Filter, ChevronRight, User } from "lucide-react";
import { useLocation } from "wouter";
import { useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { pdf } from "@react-pdf/renderer";
import { ClientReportPDF } from "@/components/pdf/ClientReportPDF";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/context/auth-context";
import { Dialog, DialogContent, DialogTrigger, DialogTitle } from "@/components/ui/dialog";
import ClientForm from "./ClientForm";

export default function ClientList() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [salesTypeFilter, setSalesTypeFilter] = useState("all");
  const [pmFilter, setPmFilter] = useState("all");
  const [counsellorFilter, setCounsellorFilter] = useState("all");
  const [paymentStatusFilter, setPaymentStatusFilter] = useState("all");
  const [isAddClientOpen, setIsAddClientOpen] = useState(false);
  const queryClient = useQueryClient();

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
    
    // Filter by user role - if counsellor, only show their own clients
    const isCounsellor = user?.role === 'counsellor';
    const matchesUserRole = isCounsellor ? s.counsellor === user?.name : true;
    
    let matchesPaymentStatus = true;
    if (paymentStatusFilter === "fully_paid") {
      matchesPaymentStatus = s.amountPending === 0;
    } else if (paymentStatusFilter === "has_pending") {
      matchesPaymentStatus = s.amountPending > 0;
    }

    return matchesSearch && matchesStatus && matchesSalesType && matchesPm && matchesCounsellor && matchesPaymentStatus && matchesUserRole;
  }) || [];

  // Group clients by Counsellor -> Year -> Month
  const groupedClients = filteredClients.reduce((acc, client) => {
    const counsellor = client.counsellor || "Unassigned";
    const date = new Date(client.enrollmentDate);
    const year = date.getFullYear().toString();
    const month = date.toLocaleString('default', { month: 'long' });

    if (!acc[counsellor]) acc[counsellor] = {};
    if (!acc[counsellor][year]) acc[counsellor][year] = {};
    if (!acc[counsellor][year][month]) acc[counsellor][year][month] = [];

    acc[counsellor][year][month].push(client);
    return acc;
  }, {} as Record<string, Record<string, Record<string, Client[]>>>);

  // Get sorted keys
  const sortedCounsellors = Object.keys(groupedClients).sort();

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
    { header: "Stage", cell: (s: Client) => {
      const stage = s.stage || 'Initial';
      let badgeClass = "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800";
      
      if (stage === 'Financial') badgeClass = "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-900/30 dark:text-purple-300 dark:border-purple-800";
      if (stage === 'Before Visa') badgeClass = "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-800";
      if (stage === 'After Visa Payment') badgeClass = "bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-900/30 dark:text-indigo-300 dark:border-indigo-800";
      if (stage === 'Visa Submitted') badgeClass = "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-800";
      
      return (
        <Badge variant="outline" className={`font-medium whitespace-nowrap ${badgeClass}`}>
          {stage}
        </Badge>
      );
    }},
    { header: "Pending", cell: (s: Client) => <span className={s.amountPending > 0 ? "text-amber-600 font-medium" : "text-slate-400"}>₹{s.amountPending.toLocaleString()}</span> },
    // Removed Counsellor column since it's now grouped
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

  return (
    <PageWrapper 
      title="Clients" 
      breadcrumbs={[{ label: "Clients" }]}
      actions={
        <div className="flex gap-3">
          <Button variant="outline" onClick={handleExportPDF} className="bg-card border-border/50 shadow-sm hover:bg-muted/50 text-foreground">
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
          <Dialog open={isAddClientOpen} onOpenChange={setIsAddClientOpen}>
            <DialogTrigger asChild>
              <Button className="shadow-md shadow-primary/20">
                <Plus className="w-4 h-4 mr-2" />
                Add Client
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogTitle className="sr-only">Add New Client</DialogTitle>
              <ClientForm 
                mode="modal" 
                onSuccess={() => {
                  setIsAddClientOpen(false);
                  queryClient.invalidateQueries({ queryKey: ['clients'] });
                }} 
              />
            </DialogContent>
          </Dialog>
        </div>
      }
    >
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-card p-4 rounded-xl border border-border/50 shadow-sm">
            <TableToolbar 
              searchPlaceholder="Search clients..."
              onSearch={setSearch}
              className="w-full sm:w-auto flex-1"
            />
            
            <div className="flex items-center gap-2 w-full sm:w-auto">
                <Popover>
                    <PopoverTrigger asChild>
                        <Button variant="outline" className={`border-border/50 ${isFilterActive ? 'bg-primary/5 border-primary/20 text-primary' : 'bg-card hover:bg-muted/50'}`}>
                            <Filter className="w-4 h-4 mr-2" />
                            Filters
                            {isFilterActive && <span className="ml-1.5 h-2 w-2 rounded-full bg-primary" />}
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-80 p-4 bg-card border-border" align="end">
                        <div className="space-y-4">
                            <h4 className="font-semibold text-sm text-foreground">Filter Clients</h4>
                            <div className="space-y-2">
                                <label className="text-xs font-medium text-muted-foreground">Sales Type</label>
                                <Select value={salesTypeFilter} onValueChange={setSalesTypeFilter}>
                                    <SelectTrigger className="h-9 bg-background border-border">
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
                                <label className="text-xs font-medium text-muted-foreground">Status</label>
                                <Select value={statusFilter} onValueChange={setStatusFilter}>
                                    <SelectTrigger className="h-9 bg-background border-border">
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
                                <label className="text-xs font-medium text-muted-foreground">Counsellor</label>
                                <Select value={counsellorFilter} onValueChange={setCounsellorFilter}>
                                    <SelectTrigger className="h-9 bg-background border-border">
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
                                    className="w-full text-destructive hover:text-destructive hover:bg-destructive/10 h-9"
                                >
                                    Clear Filters
                                </Button>
                            )}
                        </div>
                    </PopoverContent>
                </Popover>
            </div>
        </div>
        
        {/* Grouped Client List */}
        {sortedCounsellors.length > 0 ? (
          <div className="bg-card rounded-xl border border-border/50 shadow-sm overflow-hidden">
            <Accordion type="multiple" className="w-full">
              {sortedCounsellors.map((counsellor) => (
                <AccordionItem value={counsellor} key={counsellor} className="border-b border-border/50 last:border-b-0">
                  <AccordionTrigger className="px-6 py-4 hover:bg-muted/30 hover:no-underline">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8 border border-border">
                        <AvatarFallback className="bg-primary/10 text-primary text-xs font-bold">
                          {counsellor.split(' ').map(n => n[0]).join('')}
                        </AvatarFallback>
                      </Avatar>
                      <span className="font-semibold text-lg text-foreground">{counsellor}</span>
                      <Badge variant="secondary" className="ml-2">
                         {Object.values(groupedClients[counsellor]).reduce((acc, year) => 
                            acc + Object.values(year).reduce((sum, month) => sum + month.length, 0), 0
                         )} Clients
                      </Badge>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="px-0 pb-0 bg-muted/10">
                    <div className="pl-4 pr-4 pb-4 pt-2">
                      <Accordion type="multiple" className="w-full space-y-2">
                        {Object.keys(groupedClients[counsellor])
                          .sort((a, b) => Number(b) - Number(a)) // Sort years descending
                          .map(year => (
                            <AccordionItem value={`${counsellor}-${year}`} key={year} className="border border-border/50 rounded-lg bg-card overflow-hidden shadow-sm">
                              <AccordionTrigger className="px-4 py-3 hover:bg-muted/30 hover:no-underline">
                                <span className="font-semibold text-base text-foreground/80">{year}</span>
                              </AccordionTrigger>
                              <AccordionContent className="pb-0">
                                <div className="border-t border-border/50">
                                  <Accordion type="multiple" className="w-full">
                                    {Object.keys(groupedClients[counsellor][year]).map(month => (
                                      <AccordionItem value={`${counsellor}-${year}-${month}`} key={month} className="border-b last:border-b-0 border-border/50">
                                        <AccordionTrigger className="px-4 py-2 hover:bg-muted/30 hover:no-underline text-sm font-medium text-muted-foreground">
                                          <div className="flex items-center gap-2">
                                            <span>{month}</span>
                                            <Badge variant="outline" className="text-xs h-5 px-1.5 font-normal">
                                              {groupedClients[counsellor][year][month].length}
                                            </Badge>
                                          </div>
                                        </AccordionTrigger>
                                        <AccordionContent className="p-0">
                                          <DataTable 
                                            data={groupedClients[counsellor][year][month]} 
                                            columns={columns} 
                                            onRowClick={(s) => setLocation(`/clients/${s.id}`)}
                                          />
                                        </AccordionContent>
                                      </AccordionItem>
                                    ))}
                                  </Accordion>
                                </div>
                              </AccordionContent>
                            </AccordionItem>
                          ))}
                      </Accordion>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        ) : (
          <div className="text-center py-12 bg-card rounded-xl border border-border/50">
            <div className="flex flex-col items-center justify-center text-muted-foreground">
              <User className="h-12 w-12 mb-4 text-muted-foreground/50" />
              <h3 className="text-lg font-medium text-foreground">No clients found</h3>
              <p className="mt-1">Try adjusting your filters or search query.</p>
            </div>
          </div>
        )}
      </div>
    </PageWrapper>
  );
}
