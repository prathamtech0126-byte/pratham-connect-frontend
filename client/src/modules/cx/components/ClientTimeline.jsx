import { FileText, Search, Target, User, Wallet } from "lucide-react";

const EVENT_ICON = {
  created: User,
  payment: Wallet,
  document: FileText,
  status: Target,
  default: Search,
};

const getYear = (value) => {
  const y = String(value || "").slice(0, 4);
  return /^\d{4}$/.test(y) ? y : "";
};

export default function ClientTimeline({ events = [] }) {
  if (!events.length) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-5">
        <p className="text-sm text-slate-500">No timeline events yet.</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5">
      {/* Desktop timeline */}
      <div className="relative hidden md:block">
        <div className="absolute left-0 right-0 top-8 h-[3px] rounded-full bg-gradient-to-r from-sky-400 via-blue-600 to-sky-400" />
        <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${events.length}, minmax(180px, 1fr))` }}>
          {events.map((event, idx) => {
            const Icon = EVENT_ICON[event.type] || EVENT_ICON.default;
            const isTop = idx % 2 === 0;
            return (
              <div key={event.id || idx} className="relative min-h-[200px]">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border-4 border-white bg-sky-500 text-white shadow-md">
                  <Icon className="h-5 w-5" />
                </div>
                <p className="mt-2 text-center text-2xl font-semibold leading-none text-sky-700">{getYear(event.at) || "-"}</p>

                <div className={`absolute left-1/2 w-[180px] -translate-x-1/2 ${isTop ? "top-[92px]" : "top-[132px]"}`}>
                  <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-center">
                    <p className="text-sm font-medium text-slate-800">{event.message}</p>
                    <p className="mt-1 text-xs text-slate-500">{event.at}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Mobile timeline */}
      <div className="space-y-4 md:hidden">
        {events.map((event, idx) => {
          const Icon = EVENT_ICON[event.type] || EVENT_ICON.default;
          return (
            <div key={event.id || idx} className="flex gap-3">
              <div className="flex flex-col items-center">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-sky-500 text-white shadow">
                  <Icon className="h-4 w-4" />
                </div>
                {idx < events.length - 1 ? <div className="mt-1 h-full w-px bg-slate-300" /> : null}
              </div>
              <div className="flex-1 rounded-lg border border-slate-200 bg-slate-50 p-3">
                <p className="text-sm font-medium text-slate-800">{event.message}</p>
                <p className="text-xs text-slate-500">{event.at}</p>
                <p className="mt-1 text-xs font-semibold text-sky-700">{getYear(event.at) || "-"}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
