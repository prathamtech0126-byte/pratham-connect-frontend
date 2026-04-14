// client/src/components/payments/PaymentsTable.tsx
import { Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { PaymentRecord } from "@/api/payments.api";

interface PaymentsTableProps {
  data: PaymentRecord[];
  isLoading: boolean;
  error: Error | null;
  searchQuery: string;
}

function formatAmount(raw: string): string {
  const n = parseInt(raw, 10);
  if (isNaN(n)) return raw;
  return n.toLocaleString("en-IN");
}

export function PaymentsTable({ data, isLoading, error, searchQuery }: PaymentsTableProps) {
  if (isLoading) {
    return (
      <div className="flex min-h-[180px] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-[120px] items-center justify-center rounded-xl border border-destructive/20 bg-destructive/5 py-8">
        <p className="text-sm font-medium text-destructive">
          Failed to load payments. Please try again.
        </p>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="flex min-h-[120px] items-center justify-center rounded-xl border border-dashed border-slate-300 bg-slate-50 py-8">
        <p className="text-sm text-muted-foreground">
          {searchQuery.trim()
            ? "No payments match your search."
            : "No payments found for this period."}
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-slate-200">
      <table className="w-full border-collapse text-sm">
        <thead className="sticky top-0 z-10 bg-slate-100">
          <tr>
            {["#", "Date", "Client Name", "Amount", "Client Owner", "Added By", "Shared Client"].map(
              (col) => (
                <th
                  key={col}
                  className={`border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 ${
                    col === "#" || col === "Shared Client"
                      ? "text-center"
                      : col === "Amount"
                      ? "text-right"
                      : "text-left"
                  }`}
                >
                  {col}
                </th>
              )
            )}
          </tr>
        </thead>
        <tbody>
          {data.map((row, idx) => (
            <tr key={idx} className={idx % 2 === 0 ? "bg-white" : "bg-slate-50"}>
              <td className="border border-slate-200 px-3 py-1.5 text-center text-xs text-slate-500">
                {idx + 1}
              </td>
              <td className="border border-slate-200 px-3 py-1.5 text-xs text-slate-600">
                {row.date}
              </td>
              <td className="border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-800">
                {row.clientName}
              </td>
              <td className="border border-slate-200 px-3 py-1.5 text-right font-mono text-xs font-semibold text-slate-800">
                {formatAmount(row.amount)}
              </td>
              <td className="border border-slate-200 px-3 py-1.5 text-xs text-slate-600">
                {row.clientOwner}
              </td>
              <td className="border border-slate-200 px-3 py-1.5 text-xs text-slate-600">
                {row.addedBy}
              </td>
              <td className="border border-slate-200 px-3 py-1.5 text-center">
                {row.sharedClient === "Yes" ? (
                  <Badge className="bg-green-100 text-green-700 hover:bg-green-100 text-[10px]">
                    Yes
                  </Badge>
                ) : (
                  <Badge className="bg-red-100 text-red-600 hover:bg-red-100 text-[10px]">
                    No
                  </Badge>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
