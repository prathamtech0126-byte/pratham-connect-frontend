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
export type ClientTypeFilter = "all" | "student" | "student-core" | "student-app" | "student-td" | "student-no-td" | "student-sale-only" | "core" | "core-product" | "other-product" | "pending";

export type DateColumnMode = "enrollment" | "tuition-deposit" | "application";

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
  /** application_date values from student applications (dashboard student filter). */
  studentApplicationDates: string[];
  /** Paid tuition deposit dates (feeDate from TUTION_FEES product payments). */
  tuitionDepositDates: string[];
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
  onArchive?: (id: string) => void;
  /** Dashboard drill-down period — used for Application/TD suffix labels. */
  periodFromMs?: number | null;
  periodToMs?: number | null;
  /** Which date to show in the date column when drilling down from dashboard. */
  dateColumnMode?: DateColumnMode;
}

export function getDateColumnMode(clientTypeFilter: ClientTypeFilter): DateColumnMode {
  if (clientTypeFilter === "student-core" || clientTypeFilter === "student-td") {
    return "tuition-deposit";
  }
  if (
    clientTypeFilter === "student-app" ||
    clientTypeFilter === "student-no-td"
  ) {
    return "application";
  }
  return "enrollment";
}

function getFirstDateMs(dates: string[]): number | null {
  let min: number | null = null;
  for (const d of dates) {
    const t = parseListDate(d);
    if (t != null && (min == null || t < min)) min = t;
  }
  return min;
}

function getTuitionDepositDateInRange(
  dates: string[],
  fromMs: number | null | undefined,
  toMs: number | null | undefined
): string {
  if (fromMs != null && toMs != null) {
    let bestMs: number | null = null;
    let best = "";
    for (const d of dates) {
      const t = parseListDate(d);
      if (t != null && t >= fromMs && t <= toMs && (bestMs == null || t < bestMs)) {
        bestMs = t;
        best = d;
      }
    }
    if (best) return formatDateForTable(best);
  }
  const firstMs = getFirstDateMs(dates);
  if (firstMs == null) return "—";
  const first = dates.find((d) => parseListDate(d) === firstMs);
  return first ? formatDateForTable(first) : "—";
}

function getFirstApplicationDateDisplay(dates: string[]): string {
  const firstMs = getFirstDateMs(dates);
  if (firstMs == null) return "—";
  const first = dates.find((d) => parseListDate(d) === firstMs);
  return first ? formatDateForTable(first) : "—";
}

function formatDateForTable(value: string): string {
  const t = parseListDate(value);
  if (t == null) return value || "—";
  const d = new Date(t);
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  return `${dd}-${mm}-${yyyy}`;
}

function getRowDateForColumn(
  row: AllCounsellorClientRow,
  mode: DateColumnMode,
  fromMs: number | null | undefined,
  toMs: number | null | undefined
): string {
  if (mode === "tuition-deposit") {
    return getTuitionDepositDateInRange(row.tuitionDepositDates, fromMs, toMs);
  }
  if (mode === "application") {
    return getFirstApplicationDateDisplay(row.studentApplicationDates);
  }
  return row.enrollmentDate || "—";
}

function getRowDateSortMs(
  row: AllCounsellorClientRow,
  mode: DateColumnMode,
  fromMs: number | null | undefined,
  toMs: number | null | undefined
): number {
  const display = getRowDateForColumn(row, mode, fromMs, toMs);
  return parseListDate(display) ?? parseEnrollmentDate(display) ?? 0;
}

function parseListDate(value: string): number | null {
  const dmy = value.trim().match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/);
  if (dmy) {
    const t = new Date(Number(dmy[3]), Number(dmy[2]) - 1, Number(dmy[1])).getTime();
    return Number.isNaN(t) ? null : t;
  }
  const iso = value.trim().match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) {
    const t = new Date(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3])).getTime();
    return Number.isNaN(t) ? null : t;
  }
  const t = new Date(value).getTime();
  return Number.isNaN(t) ? null : t;
}

function isDateInListRange(value: string, fromMs: number, toMs: number): boolean {
  const t = parseListDate(value);
  return t != null && t >= fromMs && t <= toMs;
}

function isStudentRowForDisplay(row: AllCounsellorClientRow): boolean {
  return (
    row.saleTypeCategory === "student" ||
    row.hasStudentApplication ||
    /\bstudent\b/i.test(row.salesType ?? "") ||
    row.hasTutionFees  // Only Products clients with TD paid are also students
  );
}

function hasApplicationForDisplay(
  row: AllCounsellorClientRow,
  fromMs: number | null | undefined,
  toMs: number | null | undefined
): boolean {
  if (fromMs != null && toMs != null && row.studentApplicationDates.length > 0) {
    return row.studentApplicationDates.some((d) => isDateInListRange(d, fromMs, toMs));
  }
  return row.hasStudentApplication;
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
  onArchive,
  periodFromMs = null,
  periodToMs = null,
  dateColumnMode = "enrollment",
}: AllCounsellorClientsListProps) {
  const [newestFirst, setNewestFirst] = useState(true);

  const dateColumnHeader =
    dateColumnMode === "tuition-deposit"
      ? "Tuition Deposit Date"
      : dateColumnMode === "application"
        ? "Application Date"
        : "Enrollment";

  const sortedData = useMemo(() => {
    return [...(data ?? [])].sort((a, b) => {
      const diff =
        getRowDateSortMs(a, dateColumnMode, periodFromMs, periodToMs) -
        getRowDateSortMs(b, dateColumnMode, periodFromMs, periodToMs);
      return newestFirst ? -diff : diff;
    });
  }, [data, newestFirst, dateColumnMode, periodFromMs, periodToMs]);

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
    {
      header: dateColumnHeader,
      cell: (s: AllCounsellorClientRow) => (
        <span className="whitespace-nowrap text-slate-500">
          {getRowDateForColumn(s, dateColumnMode, periodFromMs, periodToMs)}
        </span>
      ),
    },
    {
      header: "Sales Type",
      cell: (s: AllCounsellorClientRow) => {
        const isStudent = isStudentRowForDisplay(s);
        const hasApplication = hasApplicationForDisplay(s, periodFromMs, periodToMs);
        let suffix = "";
        if (isStudent) {
          if (hasApplication && s.hasTutionFees) suffix = " (Application + TD)";
          else if (hasApplication) suffix = " (Application)";
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
          onDelete={onArchive ? () => onArchive(s.id) : undefined}
          deleteLabel="Archive"
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
              <SelectItem value="student-td">Students (TD)</SelectItem>
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
        {dateColumnHeader}: {newestFirst ? "Newest first" : "Oldest first"}
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
