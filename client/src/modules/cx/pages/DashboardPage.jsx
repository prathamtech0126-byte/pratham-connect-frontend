import { useQuery } from "@tanstack/react-query";
import { cxApi } from "../services/cx.api";
import { CX_QUERY_KEYS } from "../constants/cx.constants";

function MetricCard({ title, value }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <p className="text-sm text-slate-500">{title}</p>
      <p className="mt-2 text-2xl font-semibold text-slate-900">{value}</p>
    </div>
  );
}

export default function DashboardPage() {
  const { data, isLoading } = useQuery({
    queryKey: CX_QUERY_KEYS.dashboard,
    queryFn: () => cxApi.getDashboard(),
  });

  if (isLoading) {
    return <div className="p-6 text-sm text-slate-500">Loading CX dashboard...</div>;
  }

  return (
    <div className="space-y-6 p-6">
      <h1 className="text-2xl font-semibold text-slate-900">CX Dashboard</h1>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard title="Total Clients" value={data?.totalClients || 0} />
        <MetricCard title="Pending Documents" value={data?.pendingDocuments || 0} />
        <MetricCard title="Completed Checklist" value={data?.completedChecklist || 0} />
        <MetricCard title="Recent Activities" value={data?.recentActivity?.length || 0} />
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <h2 className="mb-3 text-lg font-semibold text-slate-900">Recent Activity</h2>
        <div className="space-y-2">
          {(data?.recentActivity || []).map((activity) => (
            <div key={activity.id} className="rounded-md border border-slate-100 p-3">
              <p className="text-sm font-medium text-slate-800">{activity.message}</p>
              <p className="text-xs text-slate-500">
                {activity.clientName} - {activity.at}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
