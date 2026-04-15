// client/src/components/payments/PaymentsSection.tsx

import { useState, useMemo, useRef, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchPaymentsList, PaymentsFilter } from "@/api/payments.api";
import { clientService } from "@/services/clientService";
import PaymentsTable from "./PaymentsTable";
import DateRangePicker from "./DateRangePicker";
import EditPaymentModal from "./EditPaymentModal";
import type { PaymentRecord } from "@/api/payments.api";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const FILTERS: PaymentsFilter[] = ["today", "monthly", "yearly", "custom"];

export default function PaymentsSection() {
  const [filter, setFilter] = useState<PaymentsFilter>("today");
  const [startDate, setStartDate] = useState<string | undefined>();
  const [endDate, setEndDate] = useState<string | undefined>();
  const [showPicker, setShowPicker] = useState(false);
  const [selectedCounsellorId, setSelectedCounsellorId] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [editingRow, setEditingRow] = useState<PaymentRecord | null>(null);
  const pickerRef = useRef<HTMLDivElement>(null);

  // Close picker when clicking outside
  useEffect(() => {
    if (!showPicker) return;
    function handleOutsideClick(e: MouseEvent) {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        setShowPicker(false);
      }
    }
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, [showPicker]);

  const { data: counsellors = [] } = useQuery({
    queryKey: ["payments-counsellors"],
    queryFn: async () => {
      const list = await clientService.getCounsellors();
      return (Array.isArray(list) ? list : [])
        .map((item: any) => {
          const id = Number(item?.id ?? item?.counsellor_id ?? item?.userId);
          const name = item?.full_name ?? item?.fullName ?? item?.name ?? "";
          if (!id || !name) return null;
          return { id, name: String(name) };
        })
        .filter((item): item is { id: number; name: string } => !!item)
        .sort((a, b) => a.name.localeCompare(b.name));
    },
    staleTime: 1000 * 60 * 5,
  });

  const { data, isLoading, error } = useQuery({
    queryKey: [
      "payments-list",
      filter,
      startDate ?? null,
      endDate ?? null,
      selectedCounsellorId ?? null,
    ],
    queryFn: () =>
      fetchPaymentsList({
        filter,
        startDate,
        endDate,
        counsellorId: selectedCounsellorId ?? undefined,
      }),
    staleTime: 1000 * 60 * 2,
    enabled: filter !== "custom" || !!(startDate && endDate),
  });

  const selectedCounsellor = useMemo(
    () => counsellors.find((c) => c.id === selectedCounsellorId) ?? null,
    [counsellors, selectedCounsellorId]
  );

  // Fallback safety: if backend returns unfiltered rows, apply counsellor filter on UI too.
  const counsellorRows = useMemo(() => {
    const rows = data?.data ?? [];
    if (!selectedCounsellor) return rows;
    const selectedName = selectedCounsellor.name.trim().toLowerCase();
    return rows.filter((row) => {
      const owner = (row.clientOwner ?? "").trim().toLowerCase();
      const addedBy = (row.addedBy ?? "").trim().toLowerCase();
      return owner === selectedName || addedBy === selectedName;
    });
  }, [data?.data, selectedCounsellor]);

  // Client-side search across all visible text columns
  const visibleRows = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return counsellorRows;
    return counsellorRows.filter((row) =>
      [row.clientName, row.clientOwner, row.addedBy, row.paymentType ?? "", row.date, row.amount]
        .some((val) => val.toLowerCase().includes(q))
    );
  }, [counsellorRows, searchQuery]);

  // 🔁 Filter change
  const handleFilterChange = (value: PaymentsFilter) => {
    setFilter(value);

    if (value === "custom") {
      setShowPicker(true);
    } else {
      setShowPicker(false);
      setStartDate(undefined);
      setEndDate(undefined);
    }
  };

  // ✅ Apply custom
  const handleApplyCustom = (
    filterValue: PaymentsFilter,
    start?: string,
    end?: string
  ) => {
    setFilter(filterValue);

    if (filterValue === "custom") {
      setStartDate(start);
      setEndDate(end);
    } else {
      setStartDate(undefined);
      setEndDate(undefined);
    }

    setShowPicker(false);
  };

  // 💰 Total Amount Calculation
  const totalAmount = useMemo(() => {
    return visibleRows.reduce((sum, item) => {
      const amt = parseFloat(item.amount);
      return sum + (isNaN(amt) ? 0 : amt);
    }, 0);
  }, [visibleRows]);

  const formattedTotal = totalAmount.toLocaleString("en-IN");

  // 📥 Export CSV
  const handleExport = () => {
    if (visibleRows.length === 0) return;

    const headers = [
      "Date",
      "Client Name",
      "Payment Type",
      "Amount",
      "Client Owner",
      "Added By",
      "Shared Client",
    ];

    const rows = visibleRows.map((item) => [
      item.date,
      item.clientName,
      item.paymentType ?? "",
      item.amount,
      item.clientOwner,
      item.addedBy,
      item.sharedClient,
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers, ...rows].map((e) => e.join(",")).join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "payments-report.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <Card className="mt-6">
      <CardContent className="p-4 space-y-4">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          
          <div>
            <h2 className="text-lg font-semibold">Payments List</h2>
            <p className="text-sm text-muted-foreground">Total Records: {visibleRows.length}</p>
          </div>

          {/* Filters */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-2">
            <Select
              value={selectedCounsellorId ? String(selectedCounsellorId) : "all"}
              onValueChange={(value) =>
                setSelectedCounsellorId(value === "all" ? null : Number(value))
              }
            >
              <SelectTrigger className="w-full sm:w-[230px] rounded-lg bg-background">
                <SelectValue placeholder="Select Counsellor" />
              </SelectTrigger>
              <SelectContent className="max-h-64 overflow-y-auto">
                <SelectItem value="all">All Counsellors</SelectItem>
                {counsellors.map((c) => (
                  <SelectItem key={c.id} value={String(c.id)}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div className="relative" ref={pickerRef}>
              <div className="flex items-center gap-1 bg-muted/40 ring-1 ring-border/50 rounded-xl p-1.5">
                {FILTERS.map((f) => (
                  <Button
                    key={f}
                    variant={filter === f ? "default" : "ghost"}
                    size="sm"
                    className="capitalize rounded-lg"
                    onClick={() => handleFilterChange(f)}
                  >
                    {f}
                  </Button>
                ))}
              </div>

              {/* Date picker dropdown — anchored to filter pills */}
              {filter === "custom" && showPicker && (
                <div className="absolute right-0 top-full z-50 mt-2">
                  <DateRangePicker
                    onApply={handleApplyCustom}
                    onCancel={() => setShowPicker(false)}
                  />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 🔍 Search */}
        <Input
          type="search"
          placeholder="Search by client, counsellor, payment type, date…"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full sm:max-w-sm"
        />

        {/* 💰 Summary + Export */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 bg-slate-50 border rounded-lg p-3">
          
          {/* Total */}
          <div className="text-sm font-medium text-slate-700">
            Total Amount: 
            <span className="ml-2 font-semibold text-green-700">
              ₹ {formattedTotal}
            </span>
          </div>

          {/* Export */}
          <Button size="sm" onClick={handleExport}>
            Export CSV
          </Button>
        </div>

        {/* Table */}
        <PaymentsTable
          data={visibleRows}
          isLoading={isLoading}
          error={error as Error | null}
          searchQuery={searchQuery}
          onEdit={setEditingRow}
        />

        {editingRow && (
          <EditPaymentModal
            row={editingRow}
            open={!!editingRow}
            onClose={() => setEditingRow(null)}
          />
        )}
      </CardContent>
    </Card>
  );
}