import { DataTable } from "@/components/table/DataTable";
import { TableActions } from "@/components/table/TableActions";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export type ClientStageFilter = "all" | "initial" | "before" | "after";

export interface AllCounsellorClientRow {
  id: string;
  name: string;
  isTransferred?: boolean;
  counsellor: string;
  enrollmentDate: string;
  salesType: string;
  stage: string;
  totalPayment: number;
  amountReceived: number;
  amountPending: number;
}

interface AllCounsellorClientsListProps {
  data: AllCounsellorClientRow[];
  search: string;
  onSearchChange: (value: string) => void;
  stageFilter: ClientStageFilter;
  onStageFilterChange: (value: ClientStageFilter) => void;
  onView: (id: string) => void;
  onEdit: (id: string) => void;
}

function getStageBadgeClass(stage: string): string {
  if (stage === "Initial") return "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-900/30 dark:text-purple-300 dark:border-purple-800";
  if (stage === "Before Visa") return "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-800";
  if (stage === "After Visa") return "bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-900/30 dark:text-indigo-300 dark:border-indigo-800";
  return "bg-gray-50 text-gray-500 border-gray-200 dark:bg-gray-900/30 dark:text-gray-400 dark:border-gray-800";
}

export function AllCounsellorClientsList({
  data,
  search,
  onSearchChange,
  stageFilter,
  onStageFilterChange,
  onView,
  onEdit,
}: AllCounsellorClientsListProps) {
  const columns = [
    { header: "Sr No", cell: (_: AllCounsellorClientRow, index: number) => <span className="text-slate-400 font-mono text-xs">{String(index + 1).padStart(2, "0")}</span>, className: "w-[60px]" },
    {
      header: "Client Name",
      cell: (s: AllCounsellorClientRow) => (
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-semibold text-slate-900">{s.name}</span>
          {s.isTransferred && (
            <Badge
              variant="secondary"
              className="bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-800"
            >
              Shared Client
            </Badge>
          )}
        </div>
      ),
    },
    { header: "Counsellor", accessorKey: "counsellor", className: "text-slate-600" },
    { header: "Enrollment", accessorKey: "enrollmentDate", className: "whitespace-nowrap text-slate-500" },
    { header: "Sales Type", cell: (s: AllCounsellorClientRow) => <Badge variant="outline" className="font-normal whitespace-nowrap bg-slate-50 text-slate-600 border-slate-200">{s.salesType}</Badge> },
    { header: "Stage", cell: (s: AllCounsellorClientRow) => <Badge variant="outline" className={`font-medium whitespace-nowrap ${getStageBadgeClass(s.stage)}`}>{s.stage}</Badge> },
    { header: "Total", cell: (s: AllCounsellorClientRow) => `₹${s.totalPayment.toLocaleString()}` },
    { header: "Received", cell: (s: AllCounsellorClientRow) => <span className="text-emerald-600 font-medium">₹{s.amountReceived.toLocaleString()}</span> },
    { header: "Pending", cell: (s: AllCounsellorClientRow) => <span className={s.amountPending > 0 ? "text-amber-600 font-medium" : "text-slate-400"}>₹{s.amountPending.toLocaleString()}</span> },
    {
      header: "Actions",
      cell: (s: AllCounsellorClientRow) => (
        <TableActions
          onView={() => onView(s.id)}
          onEdit={() => onEdit(s.id)}
        />
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-end">
        <div className="space-y-2 w-full sm:max-w-sm">
          <Label className="text-xs font-medium text-muted-foreground">Search</Label>
          <Input
            placeholder="Search by client or counsellor..."
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            className="h-9"
          />
        </div>
        <div className="space-y-2 w-full sm:w-[220px]">
          <Label className="text-xs font-medium text-muted-foreground">Payment Stage</Label>
          <Select value={stageFilter} onValueChange={(v) => onStageFilterChange(v as ClientStageFilter)}>
            <SelectTrigger className="h-9">
              <SelectValue placeholder="Select stage" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Stages</SelectItem>
              <SelectItem value="initial">Initial</SelectItem>
              <SelectItem value="before">Before Visa</SelectItem>
              <SelectItem value="after">After Visa</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <DataTable data={data} columns={columns} onRowClick={(item) => onView(item.id)} />
    </div>
  );
}
