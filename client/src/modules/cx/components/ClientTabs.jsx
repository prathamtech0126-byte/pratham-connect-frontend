export default function ClientTabs({ activeTab, onChange, tabs = [] }) {
  return (
    <div className="w-full">
      <div className="mb-4 flex flex-wrap gap-2 border-b border-slate-200 pb-2">
        {tabs.map((tab) => {
          const isActive = tab.key === activeTab;
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => onChange(tab.key)}
              className={`rounded-md px-4 py-2 text-sm font-medium transition ${
                isActive ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>
      <div>{tabs.find((tab) => tab.key === activeTab)?.content}</div>
    </div>
  );
}
