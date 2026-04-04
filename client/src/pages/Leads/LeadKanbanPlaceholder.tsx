// import { PageWrapper } from "@/layout/PageWrapper";
// import { useAuth } from "@/context/auth-context";
// import { canAccessLeads } from "@/lib/lead-permissions";
// import { Redirect } from "wouter";
// import { LayoutGrid } from "lucide-react";

// export default function LeadKanbanPlaceholder() {
//   const { user } = useAuth();
//   if (!user || !canAccessLeads(user.role)) return <Redirect to="/" />;
//   return (
//     <PageWrapper title="Kanban" breadcrumbs={[{ label: "Leads", href: "/leads" }, { label: "Kanban" }]}>
//       <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-muted/20 py-16 text-center">
//         <LayoutGrid className="h-12 w-12 text-muted-foreground mb-4" />
//         <p className="text-muted-foreground">Kanban board will be implemented in the next step.</p>
//       </div>
//     </PageWrapper>
//   );
// }
import { PageWrapper } from "@/layout/PageWrapper";
import { useAuth } from "@/context/auth-context";
import { canAccessLeads } from "@/lib/lead-permissions";
import { Redirect } from "wouter";

const STAGE_PREVIEWS = [
  { label: "New", count: 4, color: "bg-sky-400", glow: "shadow-sky-500/20", badge: "bg-sky-500/10 text-sky-400 ring-1 ring-sky-500/20" },
  { label: "Contacted", count: 7, color: "bg-violet-400", glow: "shadow-violet-500/20", badge: "bg-violet-500/10 text-violet-400 ring-1 ring-violet-500/20" },
  { label: "Qualified", count: 3, color: "bg-amber-400", glow: "shadow-amber-500/20", badge: "bg-amber-500/10 text-amber-400 ring-1 ring-amber-500/20" },
  { label: "Converted", count: 5, color: "bg-emerald-400", glow: "shadow-emerald-500/20", badge: "bg-emerald-500/10 text-emerald-400 ring-1 ring-emerald-500/20" },
];

// Ghost card heights to make columns feel alive
const GHOST_CARDS: Record<string, number[]> = {
  New: [56, 72, 56],
  Contacted: [72, 56, 72, 56],
  Qualified: [56, 72],
  Converted: [72, 56, 56, 72, 56],
};

export default function LeadKanbanPlaceholder() {
  const { user } = useAuth();
  if (!user || !canAccessLeads(user.role)) return <Redirect to="/" />;

  return (
    <PageWrapper
      title="Kanban"
      breadcrumbs={[{ label: "Leads", href: "/leads" }, { label: "Kanban" }]}
    >
      {/* Blurred ghost board */}
      <div className="relative rounded-2xl overflow-hidden border border-border/20">
        {/* Ghost board */}
        <div className="flex gap-3 p-4 overflow-hidden select-none pointer-events-none blur-[2px] opacity-40">
          {STAGE_PREVIEWS.map((col) => (
            <div
              key={col.label}
              className="w-[260px] shrink-0 flex flex-col rounded-2xl border border-border/30 bg-muted/10"
            >
              {/* Header */}
              <div className="flex items-center gap-2.5 px-4 py-3 border-b border-border/20">
                <span className={`h-2 w-2 rounded-full ${col.color}`} />
                <span className="font-semibold text-[13px] tracking-wide flex-1 text-foreground/60">
                  {col.label}
                </span>
                <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full tabular-nums ${col.badge}`}>
                  {col.count}
                </span>
              </div>
              {/* Ghost cards */}
              <div className="p-2 flex flex-col gap-2">
                {(GHOST_CARDS[col.label] ?? [56, 56]).map((h, i) => (
                  <div
                    key={i}
                    className="rounded-xl border border-border/20 bg-card/40"
                    style={{ height: h }}
                  >
                    <div className="px-3.5 py-3 space-y-2">
                      <div className="h-2.5 w-3/4 rounded bg-muted/60" />
                      <div className="h-2 w-1/2 rounded bg-muted/40" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Overlay message */}
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-4">
          {/* Icon cluster */}
          <div className="flex items-end gap-1 mb-1">
            {STAGE_PREVIEWS.map((col, i) => (
              <div
                key={col.label}
                className={`rounded-lg ${col.color} opacity-90`}
                style={{
                  width: 10,
                  height: 16 + i * 6,
                  marginBottom: 0,
                }}
              />
            ))}
          </div>

          <div className="text-center space-y-1.5">
            <p className="text-sm font-semibold text-foreground/80 tracking-wide">
              Kanban board coming soon
            </p>
            <p className="text-xs text-muted-foreground/60 max-w-[220px] leading-relaxed">
              Drag-and-drop pipeline management will be available in the next step.
            </p>
          </div>
        </div>
      </div>
    </PageWrapper>
  );
}
