import { PageWrapper } from "@/layout/PageWrapper";
import { DataTable } from "@/components/table/DataTable";
import { TableToolbar } from "@/components/table/TableToolbar";
import { TableActions } from "@/components/table/TableActions";
import { clientService, Client } from "@/services/clientService";
import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { useLocation } from "wouter";
import { useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function ClientList() {
  const [, setLocation] = useLocation();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const { data: clients, isLoading } = useQuery({
    queryKey: ['clients'],
    queryFn: clientService.getClients
  });

  const filteredClients = clients?.filter(s => {
    const matchesSearch = s.name.toLowerCase().includes(search.toLowerCase()) || 
                          s.counsellor.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === "all" || s.status.toLowerCase() === statusFilter.toLowerCase();
    return matchesSearch && matchesStatus;
  }) || [];

  const columns = [
    { header: "Sr No", cell: (_: Client, index: number) => <span className="text-muted-foreground">{index + 1}</span>, className: "w-[80px]" },
    { header: "Name", accessorKey: "name" as keyof Client, className: "font-medium" },
    { header: "Enrollment Date", accessorKey: "enrollmentDate" as keyof Client },
    { header: "Total Payment", cell: (s: Client) => `₹${s.totalPayment.toLocaleString()}` },
    { header: "Received", cell: (s: Client) => <span className="text-green-600 font-medium">₹{s.amountReceived.toLocaleString()}</span> },
    { header: "Pending", cell: (s: Client) => <span className={s.amountPending > 0 ? "text-red-600 font-medium" : "text-muted-foreground"}>₹{s.amountPending.toLocaleString()}</span> },
    { header: "Counsellor", accessorKey: "counsellor" as keyof Client },
    { header: "Status", cell: (s: Client) => (
      <Badge variant={s.status === 'Active' ? 'default' : s.status === 'Completed' ? 'secondary' : 'outline'}>
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

  return (
    <PageWrapper 
      title="Clients" 
      breadcrumbs={[{ label: "Clients" }]}
      actions={
        <Button onClick={() => setLocation("/clients/new")}>
          <Plus className="w-4 h-4 mr-2" />
          Add Client
        </Button>
      }
    >
      <div className="space-y-4">
        <TableToolbar 
          searchPlaceholder="Search by client or counsellor..."
          onSearch={setSearch}
          filters={
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
              </SelectContent>
            </Select>
          }
        />
        
        <DataTable 
          data={filteredClients} 
          columns={columns} 
          onRowClick={(s) => setLocation(`/clients/${s.id}`)}
        />
      </div>
    </PageWrapper>
  );
}
