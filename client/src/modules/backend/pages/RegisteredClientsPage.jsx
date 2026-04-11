import { useMemo, useState } from "react";
import { useLocation } from "wouter";
import { useClients } from "@/modules/cx/hooks/useClients";

const FALLBACK_DUMMY_CLIENTS = [
  {
    id: "cx-101",
    name: "Rohit Sharma",
    country: "Canada",
    stage: "Docs Pending",
    paymentStatus: "Initial Paid",
    assignedTo: "CX - Priya",
  },
  {
    id: "cx-102",
    name: "Neha Verma",
    country: "Australia",
    stage: "In Review",
    paymentStatus: "Partial Pending",
    assignedTo: "CX - Priya",
  },
];

export default function RegisteredClientsPage() {
  const [, setLocation] = useLocation();
  const [search, setSearch] = useState("");
  const { clients, isLoading } = useClients({});

  const viewClients = useMemo(() => {
    const source = clients?.length ? clients : FALLBACK_DUMMY_CLIENTS;
    const key = search.trim().toLowerCase();
    if (!key) return source;
    return source.filter(
      (client) =>
        client.name.toLowerCase().includes(key) ||
        client.country.toLowerCase().includes(key) ||
        client.stage.toLowerCase().includes(key),
    );
  }, [clients, search]);

  return (
    <div className="space-y-5 p-6">
      <h1 className="text-2xl font-semibold text-slate-900">Registered Client</h1>
      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search client by name, country, stage"
          className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
        />
      </div>

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
            {viewClients.map((client) => (
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
                    Open Filling Client
                  </button>
                </td>
              </tr>
            ))}
            {!isLoading && viewClients.length === 0 ? (
              <tr>
                <td className="px-4 py-6 text-sm text-slate-500" colSpan={6}>
                  No client records found.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
