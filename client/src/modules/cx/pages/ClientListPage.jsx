import { useMemo, useState } from "react";
import ClientTable from "../components/ClientTable";
import { useClients } from "../hooks/useClients";
import { CX_CLIENT_STAGE_OPTIONS, CX_DEFAULT_FILTERS } from "../constants/cx.constants";

export default function ClientListPage() {
  const [filters, setFilters] = useState(CX_DEFAULT_FILTERS);
  const { clients, isLoading } = useClients(filters);

  const countryOptions = useMemo(() => {
    const countries = Array.from(new Set((clients || []).map((client) => client.country)));
    return ["all", ...countries];
  }, [clients]);

  return (
    <div className="space-y-5 p-6">
      <h1 className="text-2xl font-semibold text-slate-900">Registered Clients</h1>

      <div className="grid gap-3 rounded-xl border border-slate-200 bg-white p-4 md:grid-cols-3">
        <input
          placeholder="Search by name or assigned user"
          value={filters.search}
          onChange={(e) => setFilters((prev) => ({ ...prev, search: e.target.value }))}
          className="rounded-md border border-slate-300 px-3 py-2 text-sm"
        />
        <select
          value={filters.country}
          onChange={(e) => setFilters((prev) => ({ ...prev, country: e.target.value }))}
          className="rounded-md border border-slate-300 px-3 py-2 text-sm"
        >
          {countryOptions.map((country) => (
            <option key={country} value={country}>
              {country === "all" ? "All Countries" : country}
            </option>
          ))}
        </select>
        <select
          value={filters.stage}
          onChange={(e) => setFilters((prev) => ({ ...prev, stage: e.target.value }))}
          className="rounded-md border border-slate-300 px-3 py-2 text-sm"
        >
          <option value="all">All Stages</option>
          {CX_CLIENT_STAGE_OPTIONS.map((stage) => (
            <option key={stage} value={stage}>
              {stage}
            </option>
          ))}
        </select>
      </div>

      {isLoading ? (
        <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-500">Loading clients...</div>
      ) : (
        <ClientTable clients={clients} />
      )}
    </div>
  );
}
