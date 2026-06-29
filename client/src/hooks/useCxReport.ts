import { useQuery } from "@tanstack/react-query";
import { fetchCxReport, type CxReportFilters } from "@/api/cxReport.api";

export function useCxReport(filters: CxReportFilters) {
  return useQuery({
    queryKey: ["cx-report", filters],
    queryFn: () => fetchCxReport(filters),
  });
}
