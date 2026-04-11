import { useQuery } from "@tanstack/react-query";
import { cxApi } from "../services/cx.api";
import { CX_QUERY_KEYS } from "../constants/cx.constants";

export default function ActivityPage() {
  const { data, isLoading } = useQuery({
    queryKey: CX_QUERY_KEYS.activity,
    queryFn: () => cxApi.getActivity(),
  });

  return (
    <div className="space-y-4 p-6">
      <h1 className="text-2xl font-semibold text-slate-900">CX Activity Log</h1>
      <div className="rounded-xl border border-slate-200 bg-white p-4">
        {isLoading ? <p className="text-sm text-slate-500">Loading activity...</p> : null}
        <div className="space-y-2">
          {(data || []).map((item) => (
            <div key={item.id} className="rounded-md border border-slate-100 p-3">
              <p className="text-sm font-medium text-slate-800">{item.action}</p>
              <p className="text-xs text-slate-500">
                {item.clientName} - {item.at}
              </p>
            </div>
          ))}
          {!isLoading && (data || []).length === 0 ? (
            <p className="text-sm text-slate-500">No activity found for this user.</p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
