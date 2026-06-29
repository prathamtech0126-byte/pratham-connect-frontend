export default function ClientTimeline({ events = [] }) {
  if (!events.length) {
    return (
      <div className="rounded-xl border border-border bg-card p-5">
        <p className="text-sm text-muted-foreground">No timeline events yet.</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-card p-6">
      {/* Desktop — alternating left/right */}
      <div className="relative hidden md:block">
        <div className="absolute left-1/2 top-0 bottom-0 w-px -translate-x-1/2 bg-border" />

        <div className="space-y-10">
          {events.map((event, idx) => {
            const isLeft = idx % 2 === 0;
            return (
              <div key={event.id || idx} className="relative flex items-center gap-0">
                {/* Left slot */}
                <div className={`w-1/2 pr-8 ${isLeft ? "" : "invisible"}`}>
                  <div className="rounded-lg border border-border bg-background p-4">
                    <p className="text-sm font-medium text-foreground">{event.message}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{event.at}</p>
                  </div>
                </div>

                {/* Center dot */}
                <div className="absolute left-1/2 -translate-x-1/2 h-3 w-3 rounded-full border-2 border-primary bg-card" />

                {/* Right slot */}
                <div className={`w-1/2 pl-8 ${!isLeft ? "" : "invisible"}`}>
                  <div className="rounded-lg border border-border bg-background p-4">
                    <p className="text-sm font-medium text-foreground">{event.message}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{event.at}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Mobile — vertical list */}
      <div className="relative space-y-6 md:hidden">
        <div className="absolute left-[5px] top-0 bottom-0 w-px bg-border" />

        {events.map((event, idx) => (
          <div key={event.id || idx} className="relative flex gap-5">
            <div className="mt-1 h-[11px] w-[11px] shrink-0 rounded-full border-2 border-primary bg-card" />
            <div className="flex-1 rounded-lg border border-border bg-background p-3">
              <p className="text-sm font-medium text-foreground">{event.message}</p>
              <p className="mt-1 text-xs text-muted-foreground">{event.at}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
