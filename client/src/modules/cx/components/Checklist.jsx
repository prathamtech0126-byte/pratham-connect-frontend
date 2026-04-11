const statusStyles = {
  Pending: "bg-amber-100 text-amber-700",
  Uploaded: "bg-blue-100 text-blue-700",
  Completed: "bg-emerald-100 text-emerald-700",
};

export default function Checklist({ items = [] }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <h3 className="mb-3 text-sm font-semibold text-slate-800">Checklist</h3>
      <div className="space-y-2">
        {items.map((item) => (
          <div key={item.id} className="flex items-center justify-between rounded-md border border-slate-100 p-3">
            <p className="text-sm text-slate-800">{item.title}</p>
            <span
              className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                statusStyles[item.status] || "bg-slate-100 text-slate-700"
              }`}
            >
              {item.status}
            </span>
          </div>
        ))}
        {items.length === 0 ? <p className="text-sm text-slate-500">No checklist items found.</p> : null}
      </div>
    </div>
  );
}
