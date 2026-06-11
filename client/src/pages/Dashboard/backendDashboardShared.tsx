import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear } from "date-fns";

/**
 * Shared presentational helpers + period utilities for the Backend / Visa-Case
 * dashboard and its companion report page. Keeping them here avoids duplicating
 * markup across `BackendDashboard` (operational view) and `BackendReportPage`
 * (analytical view).
 */

export const inr = (n: number) => `₹${Math.round(Number(n) || 0).toLocaleString("en-IN")}`;
export const pct = (n: number | null) => (n == null ? "—" : `${n.toFixed(1)}%`);

/** Resolve YMD bounds for a dashboard/report period filter. null/null = all dates. */
export function resolvePeriodBounds(
  timeFilter: string,
  customRange: [Date | null, Date | null]
): { from: string | null; to: string | null } {
  const now = new Date();
  const ymd = (d: Date) => format(d, "yyyy-MM-dd");
  switch ((timeFilter || "").toLowerCase()) {
    case "today":
      return { from: ymd(now), to: ymd(now) };
    case "weekly":
      return { from: ymd(startOfWeek(now, { weekStartsOn: 1 })), to: ymd(endOfWeek(now, { weekStartsOn: 1 })) };
    case "monthly":
      return { from: ymd(startOfMonth(now)), to: ymd(endOfMonth(now)) };
    case "yearly":
      return { from: ymd(startOfYear(now)), to: ymd(endOfYear(now)) };
    case "custom":
      return customRange[0] && customRange[1]
        ? { from: ymd(customRange[0]), to: ymd(customRange[1]) }
        : { from: null, to: null };
    default:
      return { from: null, to: null };
  }
}

/* ---------- presentational helpers ---------- */

export type Accent = "blue" | "emerald" | "amber" | "purple" | "teal" | "rose";

// All accents map to the app's primary theme token — no semantic colors.
// Cards stay plain white (bg-card) like the Counsellor dashboard; only the
// small icon chips carry the subtle primary tint.
const PRIMARY_ACCENT = {
  grad: "",
  chip: "bg-primary/10 text-primary",
  bar: "bg-primary",
  ring: "ring-primary/20",
};
export const ACCENT: Record<Accent, { grad: string; chip: string; bar: string; ring: string }> = {
  blue: PRIMARY_ACCENT,
  emerald: PRIMARY_ACCENT,
  amber: PRIMARY_ACCENT,
  purple: PRIMARY_ACCENT,
  teal: PRIMARY_ACCENT,
  rose: PRIMARY_ACCENT,
};

export function KpiCard({
  label,
  value,
  sub,
  icon: Icon,
  accent,
  onClick,
}: {
  label: string;
  value: string;
  sub?: string;
  icon: React.ComponentType<{ className?: string }>;
  accent: Accent;
  onClick?: () => void;
}) {
  const a = ACCENT[accent];
  return (
    <Card
      onClick={onClick}
      className={cn(
        "card-hover relative overflow-hidden border-none shadow-card bg-card",
        onClick && "cursor-pointer"
      )}
    >
      <CardContent className="relative flex items-center justify-between gap-4 p-6">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
          <p className="mt-2 text-4xl font-bold tabular-nums tracking-tight text-foreground">{value}</p>
          {sub ? <p className="mt-1 text-xs text-muted-foreground">{sub}</p> : null}
        </div>
        <div className={cn("flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full", a.chip)}>
          <Icon className="h-5 w-5" />
        </div>
      </CardContent>
    </Card>
  );
}

export function Panel({
  title,
  icon: Icon,
  accent = "blue",
  children,
}: {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  accent?: Accent;
  children: React.ReactNode;
}) {
  const a = ACCENT[accent];
  return (
    <Card className="card-hover border-none shadow-card">
      <CardContent className="p-5">
        <div className="mb-4 flex items-center gap-2.5">
          <div className={cn("flex h-8 w-8 items-center justify-center rounded-lg", a.chip)}>
            <Icon className="h-4 w-4" />
          </div>
          <h3 className="text-sm font-bold text-foreground">{title}</h3>
        </div>
        {children}
      </CardContent>
    </Card>
  );
}

/** Ranked list with proportional mini-bars (great for destination / sponsor / travel breakdowns). */
export function BreakdownList({ rows, accent }: { rows: { name: string; count: number }[]; accent: Accent }) {
  const max = Math.max(1, ...rows.map((r) => r.count));
  const a = ACCENT[accent];
  return (
    <div className="space-y-3">
      {rows.map((r) => (
        <div key={r.name}>
          <div className="mb-1 flex items-center justify-between text-sm">
            <span className="text-muted-foreground">{r.name}</span>
            <span className="font-semibold tabular-nums text-foreground">{r.count}</span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-muted">
            <div
              className={cn("h-full rounded-full transition-all", a.bar)}
              style={{ width: `${(r.count / max) * 100}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

/** Simple label/value rows (for financial & processing-time style data). */
export function RowList({
  rows,
}: {
  rows: { name: string; value: string; strong?: boolean }[];
}) {
  return (
    <div className="space-y-2.5">
      {rows.map((r) => (
        <div
          key={r.name}
          className="flex items-center justify-between border-b border-border/40 pb-2 text-sm last:border-0 last:pb-0"
        >
          <span className="text-muted-foreground">{r.name}</span>
          <span className={cn("tabular-nums", r.strong ? "text-base font-bold text-primary" : "font-semibold text-foreground")}>
            {r.value}
          </span>
        </div>
      ))}
    </div>
  );
}
