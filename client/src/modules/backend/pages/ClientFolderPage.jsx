import { useMemo, useState } from "react";
import { useLocation } from "wouter";
import { FolderOpen } from "lucide-react";
import { useClients } from "@/modules/cx/hooks/useClients";

const FALLBACK_CLIENTS = [
  {
    id: "cx-101",
    name: "Rohit Sharma",
    country: "Canada",
    stage: "Docs Pending",
    assignedTo: "CX - Priya",
    updatedAt: "2026-04-10",
    documents: [{ id: "d1" }, { id: "d2" }],
  },
  {
    id: "cx-102",
    name: "Neha Verma",
    country: "Australia",
    stage: "In Review",
    assignedTo: "CX - Priya",
    updatedAt: "2026-04-09",
    documents: [{ id: "d3" }],
  },
];

export default function ClientFolderPage() {
  const [, setLocation] = useLocation();
  const { clients, isLoading } = useClients({});
  const source = clients?.length ? clients : FALLBACK_CLIENTS;

  const [search, setSearch] = useState("");
  const [country, setCountry] = useState("all");

  const countries = useMemo(() => ["all", ...Array.from(new Set(source.map((c) => c.country)))], [source]);

  const folders = useMemo(() => {
    const query = search.trim().toLowerCase();
    return source.filter((client) => {
      const searchOk =
        !query ||
        client.name.toLowerCase().includes(query) ||
        String(client.id).toLowerCase().includes(query) ||
        (client.assignedTo || "").toLowerCase().includes(query);
      const countryOk = country === "all" || client.country === country;
      return searchOk && countryOk;
    });
  }, [source, search, country]);

  return (
    <div className="space-y-5 p-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Client Folder</h1>
        <p className="mt-1 text-sm text-slate-500">All client folders in one backend section.</p>
      </div>

      <div className="grid gap-3 rounded-xl border border-slate-200 bg-white p-4 md:grid-cols-3">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by client name, id, or assigned user"
          className="rounded-md border border-slate-300 px-3 py-2 text-sm"
        />
        <select
          value={country}
          onChange={(e) => setCountry(e.target.value)}
          className="rounded-md border border-slate-300 px-3 py-2 text-sm"
        >
          {countries.map((option) => (
            <option key={option} value={option}>
              {option === "all" ? "All Countries" : option}
            </option>
          ))}
        </select>
        <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
          {isLoading ? "Loading folders..." : `${folders.length} folders`}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {folders.map((client) => (
          <div key={client.id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="mb-3 flex items-start justify-between gap-3">
              <div className="flex items-center gap-2">
                <div className="rounded-md bg-blue-50 p-2 text-blue-600">
                  <FolderOpen className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-900">{client.name}</p>
                  <p className="text-xs text-slate-500">Folder ID: {client.id}</p>
                </div>
              </div>
              <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700">{client.stage}</span>
            </div>
            <div className="space-y-1 text-xs text-slate-600">
              <p>Country: {client.country}</p>
              <p>Assigned: {client.assignedTo || "-"}</p>
              <p>Documents: {(client.documents || []).length}</p>
              <p>Updated: {client.updatedAt || client.uploadedAt || "-"}</p>
            </div>
            <button
              type="button"
              onClick={() => setLocation(`/backend/client-folders/${client.id}`)}
              className="mt-4 w-full rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-700"
            >
              Open Folder
            </button>
          </div>
        ))}
      </div>

      {!isLoading && folders.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-500">No folders found for selected filters.</div>
      ) : null}
    </div>
  );
}
