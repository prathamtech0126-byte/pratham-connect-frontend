import { useQuery } from "@tanstack/react-query";
import { cxApi } from "../services/cx.api";
import { CX_QUERY_KEYS } from "../constants/cx.constants";

function ReportCard({ label, value }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <p className="text-sm text-slate-500">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-slate-900">{value}</p>
    </div>
  );
}

export default function ReportsPage() {
  const { data, isLoading } = useQuery({
    queryKey: CX_QUERY_KEYS.reports,
    queryFn: () => cxApi.getReports(),
  });

  return (
    <div className="space-y-6 p-6">
      <h1 className="text-2xl font-semibold text-slate-900">CX Reports</h1>

      {isLoading ? <div className="text-sm text-slate-500">Loading reports...</div> : null}

      <div className="grid gap-4 md:grid-cols-3">
        <ReportCard label="Documents Uploaded" value={data?.documentsUploadedCount || 0} />
        <ReportCard label="Clients Handled" value={data?.clientsHandled || 0} />
        <ReportCard label="Daily Summary" value={data?.dailySummary || "-"} />
      </div>
    </div>
  );
}
