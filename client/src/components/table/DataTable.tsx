import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { ChevronDown, ChevronsUpDown, ChevronUp } from "lucide-react";

interface DataTableProps<T> {
  data: T[];
  columns: {
    header: string;
    accessorKey?: string; // Relaxed type to allow string keys for flexibility
    cell?: (item: T, index: number) => React.ReactNode;
    className?: string;
    sortable?: boolean;
  }[];
  className?: string;
  onRowClick?: (item: T) => void;
}

export function DataTable<T>({ data, columns, className, onRowClick }: DataTableProps<T>) {
  return (
    <div className={cn("rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden", className)}>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-slate-50/80 hover:bg-slate-50/80 border-b border-slate-200">
              {columns.map((col, index) => (
                <TableHead 
                  key={index} 
                  className={cn(
                    "whitespace-nowrap font-semibold text-xs uppercase tracking-wider text-slate-500 py-4 h-auto", 
                    col.className
                  )}
                >
                  <div className="flex items-center gap-1">
                    {col.header}
                    {col.sortable && <ChevronsUpDown className="w-3 h-3 ml-1" />}
                  </div>
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.length === 0 ? (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-32 text-center text-muted-foreground">
                  <div className="flex flex-col items-center justify-center gap-2">
                    <div className="h-10 w-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
                        <span className="text-xl">?</span>
                    </div>
                    <p>No results found</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              data.map((item, rowIndex) => (
                <TableRow 
                  key={rowIndex} 
                  className={cn(
                    "hover:bg-slate-50/60 transition-colors border-b border-slate-100 last:border-0", 
                    onRowClick && "cursor-pointer active:bg-slate-100"
                  )}
                  onClick={() => onRowClick?.(item)}
                >
                  {columns.map((col, colIndex) => (
                    <TableCell key={colIndex} className={cn("py-4 text-sm text-slate-700", col.className)}>
                      {col.cell 
                        ? col.cell(item, rowIndex) 
                        : (col.accessorKey ? (item as any)[col.accessorKey] : null)
                      }
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
