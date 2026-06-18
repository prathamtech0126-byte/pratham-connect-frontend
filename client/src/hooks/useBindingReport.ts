import { useQuery } from "@tanstack/react-query";
import { fetchBindingReport, type BindingReportFilters } from "@/api/bindingReport.api";

export function useBindingReport(filters: BindingReportFilters) {
  return useQuery({
    queryKey: ["binding-report", filters],
    queryFn: () => fetchBindingReport(filters),
  });
}
