import { Skeleton } from "@/components/ui/skeleton";

// ─── Reusable building blocks ─────────────────────────────────────────────────

function SkeletonStatCard() {
  return (
    <div className="rounded-xl border border-border/50 bg-card p-5 space-y-3">
      <div className="flex items-center justify-between">
        <Skeleton className="h-4 w-28" />
        <Skeleton className="h-5 w-5 rounded-full" />
      </div>
      <Skeleton className="h-7 w-20" />
    </div>
  );
}

function SkeletonTableHeader({ cols }: { cols: string[] }) {
  return (
    <div className="flex items-center gap-3 px-4 py-3 border-b border-border/50">
      {cols.map((w, i) => (
        <Skeleton key={i} className={`h-3.5 ${w}`} />
      ))}
    </div>
  );
}

function SkeletonTableRow({ cols }: { cols: string[] }) {
  return (
    <div className="flex items-center gap-3 px-4 py-3.5 border-b border-border/30 last:border-0">
      {cols.map((w, i) => (
        <Skeleton key={i} className={`h-4 ${w} rounded`} />
      ))}
    </div>
  );
}

function SkeletonLeaderboardRow() {
  return (
    <div className="flex flex-col sm:flex-row flex-wrap items-start sm:items-center gap-4 p-4 rounded-lg border border-border/50 bg-card/60">
      {/* Rank circle */}
      <Skeleton className="w-12 h-12 rounded-full shrink-0" />
      {/* Avatar + name */}
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <Skeleton className="h-10 w-10 rounded-full shrink-0" />
        <div className="space-y-2 flex-1">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-3 w-48" />
        </div>
      </div>
      {/* Clients count */}
      <div className="text-center min-w-[100px] space-y-2">
        <Skeleton className="h-7 w-10 mx-auto" />
        <Skeleton className="h-3 w-12 mx-auto" />
      </div>
      {/* Revenue */}
      <div className="text-center min-w-[100px] space-y-2">
        <Skeleton className="h-5 w-20 mx-auto" />
        <Skeleton className="h-3 w-14 mx-auto" />
      </div>
      {/* Progress */}
      <div className="min-w-[180px] flex-1 space-y-2">
        <div className="flex justify-between">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-3 w-10" />
        </div>
        <Skeleton className="h-2 w-full rounded-full" />
      </div>
    </div>
  );
}

// ─── Table-only skeleton (used inside pages where filters are already shown) ──

export function TableOnlySkeleton({ rows = 8, cols }: { rows?: number; cols: string[] }) {
  return (
    <div className="rounded-xl border border-border/50 bg-card overflow-hidden">
      <SkeletonTableHeader cols={cols} />
      {Array.from({ length: rows }).map((_, i) => (
        <SkeletonTableRow key={i} cols={cols} />
      ))}
    </div>
  );
}

// ─── Page-specific skeletons ──────────────────────────────────────────────────

/** AllCounsellorClientsPage — filter bar + 10-col table */
export function AllCounsellorClientsSkeleton() {
  const cols = ["w-8", "w-36", "w-28", "w-24", "w-24", "w-20", "w-20", "w-20", "w-20", "w-16"];
  return (
    <div className="space-y-4">
      {/* Filters row */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-end">
        <div className="space-y-2 w-full sm:max-w-sm">
          <Skeleton className="h-3 w-12" />
          <Skeleton className="h-9 w-full rounded-md" />
        </div>
        <div className="space-y-2 w-full sm:w-[220px]">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-9 w-full rounded-md" />
        </div>
      </div>
      <TableOnlySkeleton rows={8} cols={cols} />
    </div>
  );
}

/** CounsellorClientsPage — table-only (filters already rendered above) */
export function CounsellorClientsSkeleton() {
  const cols = ["w-36", "w-24", "w-20", "w-20", "w-20", "w-20", "w-16"];
  return <TableOnlySkeleton rows={8} cols={cols} />;
}

/** ClientArchive / ClientList redirect spinner — compact table */
export function ClientRedirectSkeleton() {
  const cols = ["w-36", "w-24", "w-20", "w-16"];
  return (
    <div className="flex items-center justify-center py-24">
      <div className="w-full max-w-lg">
        <TableOnlySkeleton rows={4} cols={cols} />
      </div>
    </div>
  );
}

/** ClientForm — multi-section form */
export function ClientFormSkeleton() {
  return (
    <div className="max-w-4xl mx-auto pb-12 space-y-8">
      {/* Section 1 */}
      <div className="rounded-xl border border-border/50 bg-card p-6 space-y-5">
        <Skeleton className="h-5 w-40" />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="h-3.5 w-24" />
              <Skeleton className="h-10 w-full rounded-md" />
            </div>
          ))}
        </div>
      </div>
      {/* Section 2 */}
      <div className="rounded-xl border border-border/50 bg-card p-6 space-y-5">
        <Skeleton className="h-5 w-32" />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="h-3.5 w-20" />
              <Skeleton className="h-10 w-full rounded-md" />
            </div>
          ))}
        </div>
      </div>
      {/* Save button */}
      <div className="flex justify-end gap-3">
        <Skeleton className="h-10 w-24 rounded-md" />
        <Skeleton className="h-10 w-28 rounded-md" />
      </div>
    </div>
  );
}

/** Reports page — stat cards + chart area + counsellor table */
export function ReportsSkeleton() {
  return (
    <div className="space-y-6">
      {/* Stat cards row */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => <SkeletonStatCard key={i} />)}
      </div>
      {/* Chart card */}
      <div className="rounded-xl border border-border/50 bg-card p-6 space-y-4">
        <div className="flex items-center justify-between">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-8 w-32 rounded-md" />
        </div>
        <Skeleton className="h-56 w-full rounded-lg" />
      </div>
      {/* Counsellor performance rows */}
      <div className="rounded-xl border border-border/50 bg-card p-6 space-y-4">
        <Skeleton className="h-5 w-52" />
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 py-2 border-b border-border/30 last:border-0">
            <Skeleton className="h-9 w-9 rounded-full shrink-0" />
            <Skeleton className="h-4 w-36" />
            <Skeleton className="h-4 w-20 ml-auto" />
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-4 w-20" />
          </div>
        ))}
      </div>
    </div>
  );
}

/** CounsellorReportPage — 8 stat cards + data card */
export function CounsellorReportSkeleton() {
  return (
    <div className="space-y-4">
      {/* First row of 4 KPI cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => <SkeletonStatCard key={i} />)}
      </div>
      {/* Second row of 4 KPI cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => <SkeletonStatCard key={i} />)}
      </div>
      {/* Data card */}
      <div className="rounded-xl border border-border/50 bg-card overflow-hidden">
        <div className="p-5 border-b border-border/40 space-y-2">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-3.5 w-64" />
        </div>
        <div className="p-5 space-y-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex gap-4 py-2 border-b border-border/30 last:border-0">
              <Skeleton className="h-4 w-36" />
              <Skeleton className="h-4 w-24 ml-auto" />
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-24" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/** CounsellorLeaderboard — card with leaderboard rows */
export function CounsellorLeaderboardSkeleton() {
  return (
    <div className="rounded-xl border border-border/50 bg-card overflow-hidden">
      <div className="p-5 border-b border-border/40 space-y-2">
        <Skeleton className="h-5 w-44" />
        <Skeleton className="h-3.5 w-60" />
      </div>
      <div className="p-5 space-y-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <SkeletonLeaderboardRow key={i} />
        ))}
      </div>
    </div>
  );
}

/** ManagerLeaderboard — 3 stat cards + leaderboard rows */
export function ManagerLeaderboardSkeleton() {
  return (
    <div className="space-y-4">
      {/* Summary cards */}
      <div className="grid gap-4 md:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => <SkeletonStatCard key={i} />)}
      </div>
      {/* Leaderboard card */}
      <div className="rounded-xl border border-border/50 bg-card overflow-hidden">
        <div className="p-5 border-b border-border/40 space-y-2">
          <Skeleton className="h-5 w-44" />
          <Skeleton className="h-3.5 w-56" />
        </div>
        <div className="p-5 space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <SkeletonLeaderboardRow key={i} />
          ))}
        </div>
      </div>
    </div>
  );
}

/** UniversityDatabase — table only (search panel already rendered outside) */
export function UniversityDatabaseSkeleton() {
  const cols = ["w-36", "w-28", "w-24", "w-20", "w-16", "w-16", "w-16"];
  return (
    <div className="rounded-lg overflow-hidden">
      <TableOnlySkeleton rows={8} cols={cols} />
    </div>
  );
}

/** Activity page — table only (toolbar already rendered) */
export function ActivitySkeleton() {
  const cols = ["w-24", "w-28", "w-32", "flex-1", "w-28"];
  return <TableOnlySkeleton rows={8} cols={cols} />;
}
