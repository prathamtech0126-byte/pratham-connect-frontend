import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Loader2 } from "lucide-react";
import { PageWrapper } from "@/layout/PageWrapper";
import { clientService } from "@/services/clientService";
import { getLatestStageFromPayments } from "@/utils/stageUtils";
import {
  AllCounsellorClientsList,
  AllCounsellorClientRow,
  ClientStageFilter,
} from "@/components/clients/AllCounsellorClientsList";

function flattenYearMonthClients(input: any): any[] {
  if (!input || typeof input !== "object") return [];
  const all: any[] = [];
  Object.keys(input).forEach((year) => {
    const yearData = input[year];
    if (!yearData || typeof yearData !== "object") return;
    Object.keys(yearData).forEach((month) => {
      const monthData = yearData[month];
      if (monthData?.clients && Array.isArray(monthData.clients)) {
        all.push(...monthData.clients);
      } else if (Array.isArray(monthData)) {
        all.push(...monthData);
      }
    });
  });
  return all;
}

function normalizeStage(stage: string): "Initial" | "Before Visa" | "After Visa" | "Other" {
  if (stage === "Initial") return "Initial";
  if (stage === "Before Visa") return "Before Visa";
  if (stage === "After Visa") return "After Visa";
  return "Other";
}

export default function AllCounsellorClientsPage() {
  const [, setLocation] = useLocation();
  const [search, setSearch] = useState("");
  const [stageFilter, setStageFilter] = useState<ClientStageFilter>("all");

  const { data, isLoading, error } = useQuery({
    queryKey: ["all-counsellor-clients-direct"],
    queryFn: clientService.getClients,
    staleTime: 60 * 1000,
  });

  const allRows = useMemo<AllCounsellorClientRow[]>(() => {
    if (!data || typeof data !== "object") return [];

    const rows: AllCounsellorClientRow[] = [];
    Object.keys(data).forEach((key) => {
      const bucket = data[key];
      if (!bucket || typeof bucket !== "object") return;

      const counsellorName =
        bucket.counsellor?.name ||
        bucket.counsellor?.fullName ||
        bucket.counsellor?.fullname ||
        "Unknown";

      const rawClients = bucket.clients ? flattenYearMonthClients(bucket.clients) : [];
      rawClients.forEach((raw: any) => {
        const id = raw.id || raw.clientId || raw.client_id;
        if (id == null) return;

        const totalPayment = Number(raw.totalPayment || raw.payments?.[0]?.totalPayment || 0);
        const amountReceived = Array.isArray(raw.payments)
          ? raw.payments.reduce((s: number, p: any) => s + Number(p.amount || 0), 0)
          : Number(raw.amountReceived || 0);
        const amountPending = Math.max(totalPayment - amountReceived, 0);
        const stage = getLatestStageFromPayments(raw.payments, raw.stage, raw.visaSubmitted) || "N/A";

        rows.push({
          id: String(id),
          name: raw.name || raw.fullName || raw.full_name || "",
          isTransferred:
            raw.transferStatus === true ||
            raw.transferedToCounsellorId != null ||
            raw.transferredToCounsellorId != null,
          counsellor: raw.counsellor?.name || counsellorName,
          enrollmentDate: raw.enrollmentDate || raw.enrollment_date || "",
          salesType: raw.salesType || raw.saleType?.saleType || raw.sales_type || "Only Products",
          stage,
          totalPayment,
          amountReceived,
          amountPending,
        });
      });
    });

    return rows;
  }, [data]);

  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return allRows.filter((row) => {
      const matchSearch =
        !q ||
        row.name.toLowerCase().includes(q) ||
        row.counsellor.toLowerCase().includes(q) ||
        row.salesType.toLowerCase().includes(q);

      const stage = normalizeStage(row.stage);
      const matchStage =
        stageFilter === "all" ||
        (stageFilter === "initial" && stage === "Initial") ||
        (stageFilter === "before" && stage === "Before Visa") ||
        (stageFilter === "after" && stage === "After Visa");

      return matchSearch && matchStage;
    });
  }, [allRows, search, stageFilter]);

  return (
    <PageWrapper
      title="All Counsellor Clients"
      breadcrumbs={[{ label: "Clients", href: "/clients" }, { label: "All Counsellor Clients" }]}
    >
      <div className="space-y-4">
        {error && (
          <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
            Failed to load clients. Please try again.
          </div>
        )}

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <AllCounsellorClientsList
            data={filteredRows}
            search={search}
            onSearchChange={setSearch}
            stageFilter={stageFilter}
            onStageFilterChange={setStageFilter}
            onView={(id) => setLocation(`/clients/${id}/view`)}
            onEdit={(id) => setLocation(`/clients/${id}/edit`)}
          />
        )}
      </div>
    </PageWrapper>
  );
}
