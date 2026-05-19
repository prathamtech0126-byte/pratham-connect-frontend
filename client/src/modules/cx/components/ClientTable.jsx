import { useLocation } from "wouter";

export default function ClientTable({ clients = [] }) {
  const [, setLocation] = useLocation();

  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
      <table className="min-w-full divide-y divide-slate-200">
        <thead className="bg-slate-50">
          <tr>
            <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-600">Client Name</th>
            <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-600">Country</th>
            <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-600">Stage</th>
            <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-600">Payment Status</th>
            <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-600">Assigned To</th>
            <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-600">Action</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {clients.map((client) => (
            <tr key={client.id} className="hover:bg-slate-50">
              <td className="px-4 py-3 text-sm font-medium text-slate-900">{client.name}</td>
              <td className="px-4 py-3 text-sm text-slate-700">{client.country}</td>
              <td className="px-4 py-3 text-sm text-slate-700">{client.stage}</td>
              <td className="px-4 py-3 text-sm text-slate-700">{client.paymentStatus}</td>
              <td className="px-4 py-3 text-sm text-slate-700">{client.assignedTo}</td>
              <td className="px-4 py-3">
                <button
                  type="button"
                  className="rounded-md bg-slate-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-slate-700"
                  onClick={() => setLocation(`/backend/clients/${client.id}/filling`)}
                >
                  View
                </button>
              </td>
            </tr>
          ))}
          {clients.length === 0 ? (
            <tr>
              <td className="px-4 py-6 text-sm text-slate-500" colSpan={6}>
                No registered clients found for selected filters.
              </td>
            </tr>
          ) : null}
        </tbody>
      </table>
    </div>
  );
}
