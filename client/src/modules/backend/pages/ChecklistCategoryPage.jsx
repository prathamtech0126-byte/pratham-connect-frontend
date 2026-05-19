import { useEffect, useMemo, useState } from "react";

const STORAGE_KEY = "backend_checklist_categories_v1";

const DEFAULT_FORM = {
  country: "",
  visaCategory: "",
  type: "",
  checklistText: "",
};

const DEFAULT_SEED = [
  {
    id: "seed-1",
    country: "Canada",
    visaCategory: "Spouse",
    type: "Work Permit",
    checklist: ["Passport", "Marriage Certificate", "Photo", "Bank Statement"],
    createdAt: "2026-04-10",
  },
];

function normalize(value) {
  return String(value || "").trim();
}

export default function ChecklistCategoryPage() {
  const [items, setItems] = useState(DEFAULT_SEED);
  const [form, setForm] = useState(DEFAULT_FORM);
  const [filters, setFilters] = useState({ country: "", visaCategory: "", type: "" });

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length) setItems(parsed);
    } catch {
      // Keep defaults if local storage fails.
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }, [items]);

  const countries = useMemo(
    () => Array.from(new Set(items.map((i) => i.country))).sort((a, b) => a.localeCompare(b)),
    [items],
  );
  const visaCategories = useMemo(
    () => Array.from(new Set(items.map((i) => i.visaCategory))).sort((a, b) => a.localeCompare(b)),
    [items],
  );
  const types = useMemo(
    () => Array.from(new Set(items.map((i) => i.type))).sort((a, b) => a.localeCompare(b)),
    [items],
  );

  const filtered = useMemo(() => {
    return items.filter((item) => {
      const countryOk = !filters.country || item.country === filters.country;
      const visaOk = !filters.visaCategory || item.visaCategory === filters.visaCategory;
      const typeOk = !filters.type || item.type === filters.type;
      return countryOk && visaOk && typeOk;
    });
  }, [items, filters]);

  const selectedChecklist = useMemo(() => {
    if (!(filters.country && filters.visaCategory && filters.type)) return [];
    return (
      items.find(
        (item) =>
          item.country === filters.country &&
          item.visaCategory === filters.visaCategory &&
          item.type === filters.type,
      )?.checklist || []
    );
  }, [items, filters]);

  const handleCreate = (event) => {
    event.preventDefault();
    const country = normalize(form.country);
    const visaCategory = normalize(form.visaCategory);
    const type = normalize(form.type);
    const checklist = form.checklistText
      .split("\n")
      .map((line) => normalize(line))
      .filter(Boolean);

    if (!country || !visaCategory || !type || checklist.length === 0) return;

    const next = {
      id: `ck-${Date.now()}`,
      country,
      visaCategory,
      type,
      checklist,
      createdAt: new Date().toISOString().slice(0, 10),
    };

    setItems((prev) => [next, ...prev]);
    setForm(DEFAULT_FORM);
  };

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Checklist Category Management</h1>
        <p className="mt-1 text-sm text-slate-500">
          Create mapping by Country + Visa Category + Type. Filling Client can show checklist by this mapping.
        </p>
      </div>

      <form onSubmit={handleCreate} className="rounded-xl border border-slate-200 bg-white p-4">
        <h2 className="mb-3 text-sm font-semibold text-slate-800">Create New Checklist Category</h2>
        <div className="grid gap-3 md:grid-cols-3">
          <input
            value={form.country}
            onChange={(e) => setForm((prev) => ({ ...prev, country: e.target.value }))}
            placeholder="Country (e.g. Canada)"
            className="rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
          <input
            value={form.visaCategory}
            onChange={(e) => setForm((prev) => ({ ...prev, visaCategory: e.target.value }))}
            placeholder="Visa Category (Student/Spouse/Visitor)"
            className="rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
          <input
            value={form.type}
            onChange={(e) => setForm((prev) => ({ ...prev, type: e.target.value }))}
            placeholder="Type (e.g. Work Permit)"
            className="rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
        </div>
        <textarea
          value={form.checklistText}
          onChange={(e) => setForm((prev) => ({ ...prev, checklistText: e.target.value }))}
          placeholder={"Checklist items (one per line)\nPassport\nBank Statement\nVisa Form"}
          rows={6}
          className="mt-3 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
        />
        <button
          type="submit"
          className="mt-3 rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700"
        >
          Save Category
        </button>
      </form>

      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <h2 className="mb-3 text-sm font-semibold text-slate-800">Filter and Preview Checklist</h2>
        <div className="grid gap-3 md:grid-cols-3">
          <select
            value={filters.country}
            onChange={(e) => setFilters((prev) => ({ ...prev, country: e.target.value }))}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm"
          >
            <option value="">All Countries</option>
            {countries.map((country) => (
              <option key={country} value={country}>
                {country}
              </option>
            ))}
          </select>
          <select
            value={filters.visaCategory}
            onChange={(e) => setFilters((prev) => ({ ...prev, visaCategory: e.target.value }))}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm"
          >
            <option value="">All Visa Categories</option>
            {visaCategories.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
          <select
            value={filters.type}
            onChange={(e) => setFilters((prev) => ({ ...prev, type: e.target.value }))}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm"
          >
            <option value="">All Types</option>
            {types.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
        </div>

        <div className="mt-4 rounded-lg border border-slate-200 p-3">
          <p className="mb-2 text-sm font-semibold text-slate-800">Checklist for selected Country + Visa + Type</p>
          {selectedChecklist.length ? (
            <ul className="list-disc space-y-1 pl-5 text-sm text-slate-700">
              {selectedChecklist.map((entry) => (
                <li key={entry}>{entry}</li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-slate-500">Select Country, Visa Category, and Type to preview mapped checklist.</p>
          )}
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <h2 className="mb-3 text-sm font-semibold text-slate-800">Saved Categories</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-3 py-2 text-left text-xs font-semibold uppercase text-slate-600">Country</th>
                <th className="px-3 py-2 text-left text-xs font-semibold uppercase text-slate-600">Visa Category</th>
                <th className="px-3 py-2 text-left text-xs font-semibold uppercase text-slate-600">Type</th>
                <th className="px-3 py-2 text-left text-xs font-semibold uppercase text-slate-600">Checklist Count</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((item) => (
                <tr key={item.id}>
                  <td className="px-3 py-2 text-sm text-slate-900">{item.country}</td>
                  <td className="px-3 py-2 text-sm text-slate-700">{item.visaCategory}</td>
                  <td className="px-3 py-2 text-sm text-slate-700">{item.type}</td>
                  <td className="px-3 py-2 text-sm text-slate-700">{item.checklist.length}</td>
                </tr>
              ))}
              {filtered.length === 0 ? (
                <tr>
                  <td className="px-3 py-4 text-sm text-slate-500" colSpan={4}>
                    No categories found for selected filters.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
