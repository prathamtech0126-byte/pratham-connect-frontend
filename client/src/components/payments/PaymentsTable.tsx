// client/src/components/payments/PaymentsTable.tsx

import { useMemo, useState } from "react";
import { Loader2, Pencil } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useLocation } from "wouter";
import AssignCounsellorModal from "./AssignCounsellorModal";
import type { PaymentRecord } from "@/api/payments.api";

interface Counsellor {
  id: number;
  name: string;
}

interface AssignState {
  row: PaymentRecord;
  field: "clientOwner" | "addedBy";
}

interface PaymentsTableProps {
  data: PaymentRecord[];
  isLoading: boolean;
  error: Error | null;
  searchQuery?: string;
  counsellors: Counsellor[];
}

type DateSortOrder = "none" | "asc" | "desc";

interface ColFilters {
  date: string;
  clientName: string;
  paymentType: string;
  amount: string;
  clientOwner: string;
  addedBy: string;
  sharedClient: string;
}

function formatAmount(raw: string): string {
  const n = parseFloat(raw);
  if (isNaN(n)) return raw;
  return n.toLocaleString("en-IN");
}

const searchInput =
  "w-full rounded-md border border-slate-200 bg-white px-2.5 py-1 text-[11px] text-slate-600 placeholder:text-slate-400 focus:border-blue-400 focus:outline-none focus:ring-0 transition-colors";

export default function PaymentsTable({
  data,
  isLoading,
  error,
  searchQuery = "",
  counsellors,
}: PaymentsTableProps) {
  const [dateSortOrder, setDateSortOrder] = useState<DateSortOrder>("none");
  const [colFilters, setColFilters] = useState<ColFilters>({
    date: "",
    clientName: "",
    paymentType: "",
    amount: "",
    clientOwner: "",
    addedBy: "",
    sharedClient: "",
  });
  const [assignState, setAssignState] = useState<AssignState | null>(null);
  const [, navigate] = useLocation();

  const setFilter = (key: keyof ColFilters, value: string) =>
    setColFilters((prev) => ({ ...prev, [key]: value }));

  const sortedData = useMemo(() => {
    if (dateSortOrder === "none") return data;
    const toTs = (v: string) => { const t = new Date(v).getTime(); return isNaN(t) ? 0 : t; };
    return [...data].sort((a, b) => {
      const diff = toTs(a.date) - toTs(b.date);
      return dateSortOrder === "asc" ? diff : -diff;
    });
  }, [data, dateSortOrder]);

  const filteredData = useMemo(() => {
    const lc = (v: string) => v.trim().toLowerCase();
    return sortedData.filter((row) =>
      (!colFilters.date        || row.date.toLowerCase().includes(lc(colFilters.date))) &&
      (!colFilters.clientName  || row.clientName.toLowerCase().includes(lc(colFilters.clientName))) &&
      (!colFilters.paymentType || (row.paymentType ?? "").toLowerCase().includes(lc(colFilters.paymentType))) &&
      (!colFilters.amount      || row.amount.includes(colFilters.amount.trim())) &&
      (!colFilters.clientOwner || (row.clientOwner ?? "").toLowerCase().includes(lc(colFilters.clientOwner))) &&
      (!colFilters.addedBy     || (row.addedBy ?? "").toLowerCase().includes(lc(colFilters.addedBy))) &&
      (!colFilters.sharedClient|| (row.sharedClient ?? "").toLowerCase().includes(lc(colFilters.sharedClient)))
    );
  }, [sortedData, colFilters]);

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
        <p className="text-sm font-medium text-destructive">Failed to load payments. Please try again.</p>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="flex min-h-[120px] items-center justify-center rounded-xl border border-dashed border-slate-300 bg-slate-50 py-8">
        <p className="text-sm text-muted-foreground">
          {searchQuery.trim() ? "No payments match your search." : "No payments found for this period."}
        </p>
      </div>
    );
  }

  const thCls = "border border-slate-200 bg-slate-50 px-2 sm:px-3 py-2 text-left text-xs font-semibold text-slate-600 whitespace-nowrap";
  const tdCls = "border border-slate-200 px-2 sm:px-3 py-1.5 text-xs";

  return (
    <>
      <div className="overflow-x-auto rounded-lg border border-slate-200">
        <table className="w-full border-collapse text-sm">
          <thead>
            {/* ── Column labels ── */}
            <tr className="bg-slate-50">
              <th className={`${thCls} text-center w-10`}>#</th>
              <th className={thCls}>
                <button
                  type="button"
                  onClick={() => setDateSortOrder((p) => p === "none" ? "asc" : p === "asc" ? "desc" : "none")}
                  className="inline-flex items-center gap-1 hover:text-slate-900"
                >
                  Date
                  <span className="text-[10px]">
                    {dateSortOrder === "asc" ? "↑" : dateSortOrder === "desc" ? "↓" : "↕"}
                  </span>
                </button>
              </th>
              <th className={thCls}>Client Name</th>
              <th className={thCls}>Payment Type</th>
              <th className={`${thCls} text-right`}>Amount</th>
              <th className={thCls}>Client Owner</th>
              <th className={thCls}>Added By</th>
              <th className={`${thCls} text-center`}>Shared Client</th>
            </tr>

            {/* ── Column filter inputs ── */}
            <tr className="bg-white">
              <td className="border border-slate-200 px-2 py-1" />
              <td className="border border-slate-200 px-2 py-1">
                <input className={searchInput} placeholder="Search..." value={colFilters.date}
                  onChange={(e) => setFilter("date", e.target.value)} />
              </td>
              <td className="border border-slate-200 px-2 py-1">
                <input className={searchInput} placeholder="Search..." value={colFilters.clientName}
                  onChange={(e) => setFilter("clientName", e.target.value)} />
              </td>
              <td className="border border-slate-200 px-2 py-1">
                <input className={searchInput} placeholder="Search..." value={colFilters.paymentType}
                  onChange={(e) => setFilter("paymentType", e.target.value)} />
              </td>
              <td className="border border-slate-200 px-2 py-1">
                <input className={`${searchInput} text-right`} placeholder="Search..." value={colFilters.amount}
                  onChange={(e) => setFilter("amount", e.target.value)} />
              </td>
              <td className="border border-slate-200 px-2 py-1">
                <input className={searchInput} placeholder="Search..." value={colFilters.clientOwner}
                  onChange={(e) => setFilter("clientOwner", e.target.value)} />
              </td>
              <td className="border border-slate-200 px-2 py-1">
                <input className={searchInput} placeholder="Search..." value={colFilters.addedBy}
                  onChange={(e) => setFilter("addedBy", e.target.value)} />
              </td>
              <td className="border border-slate-200 px-2 py-1">
                <input className={`${searchInput} text-center`} placeholder="Search..." value={colFilters.sharedClient}
                  onChange={(e) => setFilter("sharedClient", e.target.value)} />
              </td>
            </tr>
          </thead>

          <tbody>
            {filteredData.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-8 text-center text-sm text-muted-foreground">
                  No results match your column filters.
                </td>
              </tr>
            ) : (
              filteredData.map((row, idx) => (
                <tr key={idx} className={idx % 2 === 0 ? "bg-white" : "bg-slate-50/60"}>
                  <td className={`${tdCls} text-center text-slate-400`}>{idx + 1}</td>

                  <td className={`${tdCls} text-slate-600`}>{row.date}</td>

                  <td className={`${tdCls} font-medium`}>
                    {row.clientId ? (
                      <button
                        type="button"
                        onClick={() => navigate(`/clients/${row.clientId}/view`)}
                        className="text-primary hover:underline text-left"
                      >
                        {row.clientName}
                      </button>
                    ) : (
                      <span className="text-slate-800">{row.clientName}</span>
                    )}
                  </td>

                  <td className={`${tdCls} text-slate-700`}>{row.paymentType || "-"}</td>

                  <td className={`${tdCls} text-right font-mono font-semibold text-slate-800`}>
                    {formatAmount(row.amount)}
                  </td>

                  {/* Client Owner — pencil opens counsellor assignment */}
                  <td className={`${tdCls} text-slate-600`}>
                    <span className="flex w-full items-center justify-between gap-2">
                      <span>{row.clientOwner}</span>
                      {row.paymentId && (
                        <button
                          type="button"
                          title="Change client owner"
                          onClick={() => setAssignState({ row, field: "clientOwner" })}
                          className="flex-shrink-0 inline-flex h-5 w-5 items-center justify-center rounded hover:bg-slate-200"
                        >
                          <Pencil className="h-3 w-3 text-slate-400" />
                        </button>
                      )}
                    </span>
                  </td>

                  {/* Added By — pencil opens counsellor assignment */}
                  <td className={`${tdCls} text-slate-600`}>
                    <span className="flex w-full items-center justify-between gap-2">
                      <span>{row.addedBy}</span>
                      {row.paymentId && (
                        <button
                          type="button"
                          title="Change added by"
                          onClick={() => setAssignState({ row, field: "addedBy" })}
                          className="flex-shrink-0 inline-flex h-5 w-5 items-center justify-center rounded hover:bg-slate-200"
                        >
                          <Pencil className="h-3 w-3 text-slate-400" />
                        </button>
                      )}
                    </span>
                  </td>

                  <td className={`${tdCls} text-center`}>
                    {row.sharedClient === "Yes" ? (
                      <Badge className="bg-green-100 text-green-700 hover:bg-green-100 text-[10px]">Yes</Badge>
                    ) : (
                      <Badge className="bg-red-100 text-red-600 hover:bg-red-100 text-[10px]">No</Badge>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Counsellor assignment modal */}
      {assignState && (
        <AssignCounsellorModal
          row={assignState.row}
          field={assignState.field}
          counsellors={counsellors}
          open={!!assignState}
          onClose={() => setAssignState(null)}
        />
      )}
    </>
  );
}
