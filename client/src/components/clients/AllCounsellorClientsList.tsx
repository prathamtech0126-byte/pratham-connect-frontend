import { useState, useMemo } from "react";
import { ArrowUpDown } from "lucide-react";
import { DataTable } from "@/components/table/DataTable";
import { TableActions } from "@/components/table/TableActions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export type ClientStageFilter = "all" | "initial" | "before" | "after";
export type ClientTypeFilter = "all" | "student" | "student-td" | "student-no-td" | "core" | "core-product" | "other-product" | "pending";

export interface AllCounsellorClientRow {
  id: string;
  name: string;
  isTransferred?: boolean;
  counsellor: string;
  enrollmentDate: string;
  salesType: string;
  /** Lowercase category name from sale_type_category: "student", "visitor", "spouse", etc. */
  saleTypeCategory: string | null;
  /** Numeric counsellor ID (from the bucket key in the API response). */
  counsellorId: number | null;
  /** True if the client has at least one ALL_FINANCE_EMPLOYEMENT product payment. */
  hasAllFinance: boolean;
  /** True if the client has at least one product payment that is NOT ALL_FINANCE_EMPLOYEMENT. */
  hasOtherProduct: boolean;
  /** True if the client has a TUTION_FEES (TD) product payment. */
  hasTutionFees: boolean;
  /** True if the client has at least one student application recorded. */
  hasStudentApplication: boolean;
  stage: string;
  totalPayment: number;
  amountReceived: number;
  amountPending: number;
  /** Set when core-product payment in range was handled by another counsellor (not credited on dashboard). */
  coreProductHandledBy?: { id: number; name: string };
}

interface AllCounsellorClientsListProps {
  data: AllCounsellorClientRow[];
  search: string;
  onSearchChange: (value: string) => void;
  stageFilter: ClientStageFilter;
  onStageFilterChange: (value: ClientStageFilter) => void;
  clientTypeFilter: ClientTypeFilter;
  onClientTypeFilterChange: (value: ClientTypeFilter) => void;
  onView: (id: string) => void;
  onEdit: (id: string) => void;
}

function getStageBadgeClass(stage: string): string {
  if (stage === "Initial") return "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-900/30 dark:text-purple-300 dark:border-purple-800";
  if (stage === "Before Visa") return "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-800";
  if (stage === "After Visa") return "bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-900/30 dark:text-indigo-300 dark:border-indigo-800";
  return "bg-gray-50 text-gray-500 border-gray-200 dark:bg-gray-900/30 dark:text-gray-400 dark:border-gray-800";
}

function parseEnrollmentDate(dateStr: string): number {
  // Handles DD-MM-YYYY
  const parts = dateStr.split("-");
  if (parts.length === 3) {
    const [d, m, y] = parts;
    return new Date(`${y}-${m}-${d}`).getTime();
  }
  return new Date(dateStr).getTime() || 0;
}

export function AllCounsellorClientsList({
  data,
  search,
  onSearchChange,
  stageFilter,
  onStageFilterChange,
  clientTypeFilter,
  onClientTypeFilterChange,
  onView,
  onEdit,
}: AllCounsellorClientsListProps) {
  const [newestFirst, setNewestFirst] = useState(true);

  const sortedData = useMemo(() => {
    return [...(data ?? [])].sort((a, b) => {
      const diff = parseEnrollmentDate(a.enrollmentDate) - parseEnrollmentDate(b.enrollmentDate);
      return newestFirst ? -diff : diff;
    });
  }, [data, newestFirst]);

  const columns = [
    { header: "Sr No", cell: (_: AllCounsellorClientRow, index: number) => <span className="text-slate-400 font-mono text-xs">{String(index + 1).padStart(2, "0")}</span>, className: "w-[60px]" },
    {
      header: "Client Name",
      cell: (s: AllCounsellorClientRow) => (
        <div className="flex flex-col gap-0.5 min-w-0">
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
          {s.coreProductHandledBy && (
            <span className="text-[11px] leading-tight text-amber-700 dark:text-amber-400">
              {s.coreProductHandledBy.name} has taken this payment
            </span>
          )}
        </div>
      ),
    },
    { header: "Counsellor", accessorKey: "counsellor", className: "text-slate-600" },
    { header: "Enrollment", accessorKey: "enrollmentDate", className: "whitespace-nowrap text-slate-500" },
    {
      header: "Sales Type",
      cell: (s: AllCounsellorClientRow) => {
        const isStudent = s.saleTypeCategory === "student";
        let suffix = "";
        if (isStudent) {
          if (s.hasStudentApplication && s.hasTutionFees) suffix = " (Application + TD)";
          else if (s.hasStudentApplication) suffix = " (Application)";
          else if (s.hasTutionFees) suffix = " (TD)";
        }
        return (
          <Badge
            variant="outline"
            className={`font-normal whitespace-nowrap ${
              isStudent && s.hasTutionFees
                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                : "bg-slate-50 text-slate-600 border-slate-200"
            }`}
          >
            {s.salesType}{suffix}
          </Badge>
        );
      },
    },
    { header: "Stage", cell: (s: AllCounsellorClientRow) => <Badge variant="outline" className={`font-medium whitespace-nowrap ${getStageBadgeClass(s.stage)}`}>{s.stage}</Badge> },
    { header: "Total", cell: (s: AllCounsellorClientRow) => `₹${s.totalPayment.toLocaleString('en-IN')}` },
    { header: "Received", cell: (s: AllCounsellorClientRow) => <span className="text-emerald-600 font-medium">₹{s.amountReceived.toLocaleString('en-IN')}</span> },
    { header: "Pending", cell: (s: AllCounsellorClientRow) => <span className={s.amountPending > 0 ? "text-amber-600 font-medium" : "text-slate-400"}>₹{s.amountPending.toLocaleString('en-IN')}</span> },
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
          <Label className="text-xs font-medium text-muted-foreground">Client Type</Label>
          <Select value={clientTypeFilter} onValueChange={(v) => onClientTypeFilterChange(v as ClientTypeFilter)}>
            <SelectTrigger className="h-9">
              <SelectValue placeholder="Select type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="student">Students (All)</SelectItem>
              <SelectItem value="student-td">Students (Application + TD)</SelectItem>
              <SelectItem value="student-no-td">Students (Application Only)</SelectItem>
              <SelectItem value="core">Visitor / Spouse</SelectItem>
              <SelectItem value="core-product">Core Product (All Finance)</SelectItem>
              <SelectItem value="other-product">Other Products</SelectItem>
              <SelectItem value="pending">With Pending Amount</SelectItem>
            </SelectContent>
          </Select>
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
        <div className="sm:ml-auto pb-0.5">
          <Button
            variant="outline"
            size="sm"
            className="h-9 gap-1.5 text-slate-600"
            onClick={() => setNewestFirst((prev) => !prev)}
            title={newestFirst ? "Showing newest first — click for oldest first" : "Showing oldest first — click for newest first"}
          >
            <ArrowUpDown className="h-3.5 w-3.5" />
            Swap
          </Button>
        </div>
      </div>

      <p className="text-xs text-muted-foreground -mt-1">
        Enrollment: {newestFirst ? "Newest first" : "Oldest first"}
      </p>

      <DataTable
        data={sortedData}
        columns={columns}
        onRowClick={(item) => onView(item.id)}
        rowClassName={(item) =>
          item.hasTutionFees ? "bg-emerald-50 hover:bg-emerald-100" : ""
        }
      />
    </div>
  );
}
