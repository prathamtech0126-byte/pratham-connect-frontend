import { useMemo, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation, useSearch } from "wouter";
import { PageWrapper } from "@/layout/PageWrapper";
import { AllCounsellorClientsSkeleton } from "@/components/ui/page-skeletons";
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

function parseStageParam(v: string | null): ClientStageFilter {
  const ok: ClientStageFilter[] = ["all", "initial", "before", "after"];
  if (v && ok.includes(v as ClientStageFilter)) return v as ClientStageFilter;
  return "all";
}

export default function AllCounsellorClientsPage() {
  const [pathname, setLocation] = useLocation();
  const searchStr = useSearch();

  const mergeQuery = useCallback(
    (mutate: (p: URLSearchParams) => void) => {
      const p = new URLSearchParams(searchStr);
      mutate(p);
      const qs = p.toString();
      setLocation(qs ? `${pathname}?${qs}` : pathname, { replace: true });
    },
    [pathname, searchStr, setLocation],
  );

  const urlParams = useMemo(() => new URLSearchParams(searchStr), [searchStr]);
  const search = urlParams.get("q") ?? "";
  const stageFilter = parseStageParam(urlParams.get("stage"));

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
          <AllCounsellorClientsSkeleton />
        ) : (
          <AllCounsellorClientsList
            data={filteredRows}
            search={search}
            onSearchChange={(v) => {
              mergeQuery((p) => {
                if (v.trim()) p.set("q", v);
                else p.delete("q");
              });
            }}
            stageFilter={stageFilter}
            onStageFilterChange={(v) => {
              mergeQuery((p) => {
                if (v && v !== "all") p.set("stage", v);
                else p.delete("stage");
              });
            }}
            onView={(id) => {
              const ret = searchStr ? `${pathname}?${searchStr}` : pathname;
              sessionStorage.setItem("client_list_return_path", ret);
              sessionStorage.removeItem("client_list_return_counsellor_name");
              setLocation(`/clients/${id}/view`);
            }}
            onEdit={(id) => {
              const ret = searchStr ? `${pathname}?${searchStr}` : pathname;
              sessionStorage.setItem("client_list_return_path", ret);
              sessionStorage.removeItem("client_list_return_counsellor_name");
              setLocation(`/clients/${id}/edit`);
            }}
          />
        )}
      </div>
    </PageWrapper>
  );
}
