import { useState, useMemo } from "react";
import { useLocation, Link } from "wouter";
import { PageWrapper } from "@/layout/PageWrapper";
import { DataTable } from "@/components/table/DataTable";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { useAuth } from "@/context/auth-context";
import { canAccessLeads, canAssignLead, canUseCsvImportExport } from "@/lib/lead-permissions";
import { Redirect } from "wouter";
import {
  DUMMY_LEADS,
  DUMMY_ASSIGNEE_OPTIONS,
  type DummyLead,
} from "@/data/dummyLeads";
import { AddLead } from "@/components/add-lead";
import { format } from "date-fns";
import { Eye, UserPlus, Download, Search, Plus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";

const PAGE_SIZE = 10;
const STATUS_OPTIONS = [
  { value: "all", label: "All statuses" },
  { value: "new", label: "New" },
  { value: "contacted", label: "Contacted" },
  { value: "qualified", label: "Qualified" },
  { value: "converted", label: "Converted" },
  { value: "lost", label: "Lost" },
];
const STAGE_OPTIONS = [
  { value: "all", label: "All stages" },
  { value: "New", label: "New" },
  { value: "Contacted", label: "Contacted" },
  { value: "Qualified", label: "Qualified" },
  { value: "Converted", label: "Converted" },
];

function statusBadgeVariant(status: string) {
  switch (status) {
    case "new":
      return "secondary";
    case "contacted":
      return "default";
    case "qualified":
      return "outline";
    case "converted":
      return "default";
    case "lost":
      return "destructive";
    default:
      return "secondary";
  }
}

export default function LeadList() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [stageFilter, setStageFilter] = useState("all");
  const [assigneeFilter, setAssigneeFilter] = useState("all");
  const [assignModalLead, setAssignModalLead] = useState<DummyLead | null>(null);
  const [assigneeId, setAssigneeId] = useState<string>("");
  const [page, setPage] = useState(1);
  const [leads, setLeads] = useState<DummyLead[]>(DUMMY_LEADS);
  const [isAddLeadOpen, setIsAddLeadOpen] = useState(false);

  if (!user || !canAccessLeads(user.role)) {
    return <Redirect to="/" />;
  }

  const handleLeadAdded = (lead: DummyLead) => {
    setLeads((prev) => [lead, ...prev]);
    toast({ title: "Lead added", description: `${lead.name} has been added successfully.` });
  };

  const filteredLeads = useMemo(() => {
    let list = [...leads];
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (l) =>
          l.name.toLowerCase().includes(q) ||
          l.email.toLowerCase().includes(q) ||
          l.phone.includes(q)
      );
    }
    if (statusFilter !== "all") list = list.filter((l) => l.status === statusFilter);
    if (stageFilter !== "all") list = list.filter((l) => l.stage === stageFilter);
    if (assigneeFilter !== "all") list = list.filter((l) => l.assignedToId === assigneeFilter);
    return list;
  }, [search, statusFilter, stageFilter, assigneeFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredLeads.length / PAGE_SIZE));
  const paginatedLeads = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return filteredLeads.slice(start, start + PAGE_SIZE);
  }, [filteredLeads, page]);

  const handleAssignSubmit = () => {
    if (!assignModalLead || !assigneeId) return;
    const assignee = DUMMY_ASSIGNEE_OPTIONS.find((u) => u.id === assigneeId);
    toast({
      title: "Lead assigned",
      description: `${assignModalLead.name} assigned to ${assignee?.name ?? "User"}. (Dummy action.)`,
    });
    setAssignModalLead(null);
    setAssigneeId("");
  };

  const handleExportCsv = () => {
    toast({
      title: "Export CSV",
      description: "Export will be available when backend is connected. (Dummy action.)",
    });
  };

  const columns = [
    { header: "Name", accessorKey: "name" as const, className: "font-medium" },
    { header: "Email", accessorKey: "email" as const },
    { header: "Phone", accessorKey: "phone" as const },
    {
      header: "Status",
      cell: (item: DummyLead) => (
        <Badge variant={statusBadgeVariant(item.status)} className="capitalize">
          {item.status}
        </Badge>
      ),
    },
    { header: "Stage", accessorKey: "stage" as const },
    {
      header: "Assigned to",
      cell: (item: DummyLead) => item.assignedToName ?? "—",
    },
    {
      header: "Last followup",
      cell: (item: DummyLead) =>
        item.lastFollowupAt
          ? format(new Date(item.lastFollowupAt), "dd MMM yyyy")
          : "—",
    },
    {
      header: "Created",
      cell: (item: DummyLead) => format(new Date(item.createdAt), "dd MMM yyyy"),
    },
    {
      header: "Actions",
      cell: (item: DummyLead) => (
        <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
          <Link href={`/leads/${item.id}`}>
            <Button variant="ghost" size="sm" className="h-8">
              <Eye className="h-4 w-4" />
            </Button>
          </Link>
          {canAssignLead(user.role) && (
            <Button
              variant="outline"
              size="sm"
              className="h-8"
              onClick={() => {
                setAssignModalLead(item);
                setAssigneeId(item.assignedToId ?? "");
              }}
            >
              <UserPlus className="h-4 w-4" />
            </Button>
          )}
        </div>
      ),
    },
  ];

  const actions = (
    <div className="flex flex-wrap items-center gap-2">
      {canUseCsvImportExport(user.role) && (
        <Button variant="outline" size="sm" onClick={handleExportCsv}>
          <Download className="h-4 w-4" />
          Export CSV
        </Button>
      )}
    </div>
  );
  const addLeadButton = (
    <Button variant="outline" size="sm" className="shadow-md shadow-primary/20" onClick={() => setIsAddLeadOpen(true)}>
      <Plus className="h-4 w-4" />
      Add Lead
    </Button>
  );

  return (
    <PageWrapper
      title="Leads"
      breadcrumbs={[{ label: "Leads", href: "/leads" }]}
      actions={<div className="flex gap-3">{addLeadButton} {actions}</div>}
    >
      <div className="space-y-4">
        {/* Filters */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:flex-wrap">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search name, email, phone..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              {STATUS_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={stageFilter} onValueChange={setStageFilter}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Stage" />
            </SelectTrigger>
            <SelectContent>
              {STAGE_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={assigneeFilter} onValueChange={setAssigneeFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Assigned to" />
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

        <DataTable
          data={paginatedLeads}
          columns={columns}
          onRowClick={(item) => setLocation(`/leads/${item.id}`)}
        />

        {filteredLeads.length === 0 && (
          <p className="text-center text-muted-foreground py-6 text-sm">
            No leads match your filters.
          </p>
        )}

        {totalPages > 1 && (
          <Pagination>
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();
                    setPage((p) => Math.max(1, p - 1));
                  }}
                  aria-disabled={page <= 1}
                  className={page <= 1 ? "pointer-events-none opacity-50" : ""}
                />
              </PaginationItem>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                <PaginationItem key={p}>
                  <PaginationLink
                    href="#"
                    onClick={(e) => {
                      e.preventDefault();
                      setPage(p);
                    }}
                    isActive={page === p}
                  >
                    {p}
                  </PaginationLink>
                </PaginationItem>
              ))}
              <PaginationItem>
                <PaginationNext
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();
                    setPage((p) => Math.min(totalPages, p + 1));
                  }}
                  aria-disabled={page >= totalPages}
                  className={page >= totalPages ? "pointer-events-none opacity-50" : ""}
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        )}

        <p className="text-xs text-muted-foreground">
          Showing {paginatedLeads.length} of {filteredLeads.length} leads
        </p>
      </div>

      {/* Add Lead modal */}
      <AddLead
        open={isAddLeadOpen}
        onOpenChange={setIsAddLeadOpen}
        onLeadAdded={handleLeadAdded}
      />

      {/* Assign modal */}
      <Dialog open={!!assignModalLead} onOpenChange={(open) => !open && setAssignModalLead(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Assign lead</DialogTitle>
          </DialogHeader>
          {assignModalLead && (
            <div className="space-y-4 py-2">
              <p className="text-sm text-muted-foreground">
                Assign <span className="font-medium text-foreground">{assignModalLead.name}</span> to
              </p>
              <Select value={assigneeId} onValueChange={setAssigneeId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select assignee" />
                </SelectTrigger>
                <SelectContent>
                  {DUMMY_ASSIGNEE_OPTIONS.map((u) => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.name} ({u.role})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setAssignModalLead(null)}>
              Cancel
            </Button>
            <Button onClick={handleAssignSubmit} disabled={!assigneeId}>
              Assign
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageWrapper>
  );
}
