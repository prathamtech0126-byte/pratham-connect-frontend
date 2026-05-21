# Payments List Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a Payments List section at the bottom of the Reports page (superadmin only) with a filter bar, Shopify-style date range picker, client-side search, and Excel-style table.

**Architecture:** A self-contained `PaymentsSection` component owns all state (filter, dates, search query) and is dropped into `Reports.tsx` with a 3-line conditional render. The API call lives in `payments.api.ts` and uses the existing `api` axios instance. The table and date picker are pure presentational components that receive everything via props.

**Tech Stack:** React 18, TypeScript, React Query (`@tanstack/react-query`), shadcn/ui (`Button`, `Input`, `Badge`, `Card`), `date-fns`, Lucide icons, Tailwind CSS.

> **Note:** This project has no test runner configured (per CLAUDE.md). TypeScript type-checking via `npm run build` replaces the test step throughout this plan.

---

## File Map

| Action | Path | Responsibility |
|---|---|---|
| Create | `client/src/api/payments.api.ts` | Types + `fetchPaymentsList()` — one API call |
| Create | `client/src/components/payments/DateRangePicker.tsx` | Shopify-style dual calendar + preset list popover |
| Create | `client/src/components/payments/PaymentsTable.tsx` | Excel-style table — pure display, no state |
| Create | `client/src/components/payments/PaymentsSection.tsx` | Owns all state, composes the three above |
| Modify | `client/src/pages/Reports.tsx` | Add 3-line conditional render for superadmin |

---

## Task 1: API layer — `payments.api.ts`

**Files:**
- Create: `client/src/api/payments.api.ts`

- [ ] **Step 1: Create the file with types and the fetch function**

```typescript
// client/src/api/payments.api.ts
import api from "@/lib/api";

export type PaymentsFilter = "today" | "monthly" | "yearly" | "custom";

export interface PaymentsListParams {
  filter: PaymentsFilter;
  startDate?: string; // YYYY-MM-DD, only when filter === "custom"
  endDate?: string;   // YYYY-MM-DD, only when filter === "custom"
}

export interface PaymentRecord {
  date: string;        // e.g. "14 Apr 2026"
  clientName: string;
  amount: string;      // numeric string e.g. "35400"
  clientOwner: string;
  addedBy: string;
  sharedClient: string; // "Yes" | "No"
}

export interface PaymentsListResponse {
  success: boolean;
  filter: string;
  startDate: string;
  endDate: string;
  total: number;
  data: PaymentRecord[];
}

export async function fetchPaymentsList(
  params: PaymentsListParams
): Promise<PaymentsListResponse> {
  const query = new URLSearchParams({ filter: params.filter });
  if (params.filter === "custom" && params.startDate && params.endDate) {
    query.set("startDate", params.startDate);
    query.set("endDate", params.endDate);
  }
  const res = await api.get<PaymentsListResponse>(
    `/api/reports/payments-list?${query.toString()}`
  );
  return res.data;
}
```

- [ ] **Step 2: Type-check**

```bash
npm run build 2>&1 | head -30
```
Expected: no errors mentioning `payments.api.ts`.

- [ ] **Step 3: Commit**

```bash
git add client/src/api/payments.api.ts
git commit -m "feat: add payments list API function and types"
```

---

## Task 2: Date Range Picker — `DateRangePicker.tsx`

**Files:**
- Create: `client/src/components/payments/DateRangePicker.tsx`

This component renders as a popover panel. It receives a callback `onApply` and `onCancel`. Internally it manages the two visible months, the temp start/end selection, hover state, and which preset is active.

- [ ] **Step 1: Create the file — helpers and types first**

```typescript
// client/src/components/payments/DateRangePicker.tsx
import { useState } from "react";
import { format, addMonths, subMonths, startOfMonth, isSameDay, isWithinInterval, isBefore, isAfter, startOfWeek, endOfWeek, startOfYear, endOfYear, subDays, subMonths as dfSubMonths, endOfMonth } from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { PaymentsFilter } from "@/api/payments.api";

export interface DateRangePickerProps {
  onApply: (filter: PaymentsFilter, startDate?: string, endDate?: string) => void;
  onCancel: () => void;
}

function toYMD(d: Date): string {
  return format(d, "yyyy-MM-dd");
}

interface Preset {
  label: string;
  resolve: () => { filter: PaymentsFilter; start?: Date; end?: Date };
}

const today = () => new Date();

const PRESETS: Preset[] = [
  { label: "Today",              resolve: () => ({ filter: "today" }) },
  { label: "Yesterday",          resolve: () => { const d = subDays(today(), 1); return { filter: "custom", start: d, end: d }; } },
  { label: "Today and yesterday",resolve: () => ({ filter: "custom", start: subDays(today(), 1), end: today() }) },
  { label: "Last 7 days",        resolve: () => ({ filter: "custom", start: subDays(today(), 6), end: today() }) },
  { label: "Last 14 days",       resolve: () => ({ filter: "custom", start: subDays(today(), 13), end: today() }) },
  { label: "Last 28 days",       resolve: () => ({ filter: "custom", start: subDays(today(), 27), end: today() }) },
  { label: "Last 30 days",       resolve: () => ({ filter: "custom", start: subDays(today(), 29), end: today() }) },
  { label: "This week",          resolve: () => ({ filter: "custom", start: startOfWeek(today(), { weekStartsOn: 1 }), end: today() }) },
  { label: "Last week",          resolve: () => { const s = startOfWeek(subDays(today(), 7), { weekStartsOn: 1 }); return { filter: "custom", start: s, end: endOfWeek(s, { weekStartsOn: 1 }) }; } },
  { label: "This month",         resolve: () => ({ filter: "monthly" }) },
  { label: "Last month",         resolve: () => { const s = startOfMonth(dfSubMonths(today(), 1)); return { filter: "custom", start: s, end: endOfMonth(s) }; } },
  { label: "This year",          resolve: () => ({ filter: "yearly" }) },
  { label: "Last year",          resolve: () => { const s = startOfYear(subDays(startOfYear(today()), 1)); return { filter: "custom", start: startOfYear(s), end: endOfYear(s) }; } },
];
```

- [ ] **Step 2: Add the calendar grid helper**

Append to the same file:

```typescript
const DAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

function calendarDays(month: Date): (Date | null)[] {
  const first = startOfMonth(month);
  const blanks = first.getDay(); // 0=Sun
  const days: (Date | null)[] = Array(blanks).fill(null);
  const count = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  for (let i = 1; i <= count; i++) {
    days.push(new Date(month.getFullYear(), month.getMonth(), i));
  }
  return days;
}
```

- [ ] **Step 3: Add the MonthCalendar sub-component**

Append to the same file:

```typescript
interface MonthCalendarProps {
  month: Date;
  tempStart: Date | null;
  tempEnd: Date | null;
  hoverDate: Date | null;
  onDayClick: (d: Date) => void;
  onDayHover: (d: Date | null) => void;
}

function MonthCalendar({ month, tempStart, tempEnd, hoverDate, onDayClick, onDayHover }: MonthCalendarProps) {
  const days = calendarDays(month);
  const rangeEnd = tempEnd ?? hoverDate;

  function isInRange(d: Date) {
    if (!tempStart || !rangeEnd) return false;
    const lo = isBefore(tempStart, rangeEnd) ? tempStart : rangeEnd;
    const hi = isAfter(tempStart, rangeEnd) ? tempStart : rangeEnd;
    return isWithinInterval(d, { start: lo, end: hi });
  }

  return (
    <div>
      <div className="mb-2 text-center text-sm font-semibold text-slate-800">
        {format(month, "MMMM yyyy")}
      </div>
      <div className="grid grid-cols-7 text-center">
        {DAYS.map((d) => (
          <div key={d} className="py-1 text-[11px] font-medium text-slate-400">{d}</div>
        ))}
        {days.map((d, i) =>
          d === null ? (
            <div key={`blank-${i}`} />
          ) : (
            <button
              key={d.toISOString()}
              type="button"
              onClick={() => onDayClick(d)}
              onMouseEnter={() => onDayHover(d)}
              onMouseLeave={() => onDayHover(null)}
              className={cn(
                "mx-auto flex h-7 w-7 items-center justify-center rounded-full text-[12px] transition-colors",
                (tempStart && isSameDay(d, tempStart)) || (tempEnd && isSameDay(d, tempEnd))
                  ? "bg-[#2d3a8c] text-white font-bold"
                  : isInRange(d)
                  ? "bg-blue-100 text-blue-800 rounded-none"
                  : "hover:bg-slate-100 text-slate-700"
              )}
            >
              {d.getDate()}
            </button>
          )
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Add the main DateRangePicker component**

Append to the same file:

```typescript
export function DateRangePicker({ onApply, onCancel }: DateRangePickerProps) {
  const [leftMonth, setLeftMonth] = useState(() => startOfMonth(new Date()));
  const rightMonth = addMonths(leftMonth, 1);
  const [tempStart, setTempStart] = useState<Date | null>(null);
  const [tempEnd, setTempEnd] = useState<Date | null>(null);
  const [hoverDate, setHoverDate] = useState<Date | null>(null);
  const [activePreset, setActivePreset] = useState<string | null>(null);
  const [pendingFilter, setPendingFilter] = useState<PaymentsFilter>("today");
  const [pendingStart, setPendingStart] = useState<Date | null>(null);
  const [pendingEnd, setPendingEnd] = useState<Date | null>(null);

  function handlePreset(preset: Preset) {
    const { filter, start, end } = preset.resolve();
    setActivePreset(preset.label);
    setPendingFilter(filter);
    setPendingStart(start ?? null);
    setPendingEnd(end ?? null);
    setTempStart(start ?? null);
    setTempEnd(end ?? null);
    setHoverDate(null);
    if (start) setLeftMonth(startOfMonth(start));
  }

  function handleDayClick(d: Date) {
    setActivePreset(null);
    if (!tempStart || (tempStart && tempEnd)) {
      setTempStart(d);
      setTempEnd(null);
    } else {
      if (isBefore(d, tempStart)) {
        setTempEnd(tempStart);
        setTempStart(d);
        setPendingStart(d);
        setPendingEnd(tempStart);
      } else {
        setTempEnd(d);
        setPendingStart(tempStart);
        setPendingEnd(d);
      }
      setPendingFilter("custom");
    }
  }

  function handleUpdate() {
    if (pendingFilter !== "custom") {
      onApply(pendingFilter);
    } else if (pendingStart && pendingEnd) {
      onApply("custom", toYMD(pendingStart), toYMD(pendingEnd));
    }
  }

  const canUpdate =
    pendingFilter !== "custom" ||
    (pendingStart != null && pendingEnd != null);

  const rangeLabel =
    activePreset ??
    (pendingStart && pendingEnd
      ? `${format(pendingStart, "d MMM yyyy")} → ${format(pendingEnd, "d MMM yyyy")}`
      : "Select a range");

  return (
    <div className="z-50 flex overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl">
      {/* Left: preset list */}
      <div className="w-44 overflow-y-auto border-r border-slate-200 bg-slate-50 py-2 text-[13px]">
        <div className="mb-1 px-4 pt-1 text-[10px] font-bold uppercase tracking-wide text-slate-400">
          Presets
        </div>
        {PRESETS.map((p) => (
          <button
            key={p.label}
            type="button"
            onClick={() => handlePreset(p)}
            className={cn(
              "w-full px-4 py-[5px] text-left hover:bg-slate-100",
              activePreset === p.label
                ? "border-l-2 border-[#2d3a8c] bg-indigo-50 font-semibold text-[#2d3a8c]"
                : "text-slate-700"
            )}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* Right: calendars + footer */}
      <div className="flex flex-col">
        <div className="flex gap-6 p-4">
          {/* Prev arrow */}
          <div className="flex flex-col gap-1">
            <button
              type="button"
              onClick={() => setLeftMonth((m) => subMonths(m, 1))}
              className="mb-1 flex h-6 w-6 items-center justify-center rounded hover:bg-slate-100"
            >
              <ChevronLeft className="h-4 w-4 text-slate-500" />
            </button>
            <MonthCalendar
              month={leftMonth}
              tempStart={tempStart}
              tempEnd={tempEnd}
              hoverDate={hoverDate}
              onDayClick={handleDayClick}
              onDayHover={setHoverDate}
            />
          </div>
          {/* Next arrow + right calendar */}
          <div className="flex flex-col gap-1">
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setLeftMonth((m) => addMonths(m, 1))}
                className="mb-1 flex h-6 w-6 items-center justify-center rounded hover:bg-slate-100"
              >
                <ChevronRight className="h-4 w-4 text-slate-500" />
              </button>
            </div>
            <MonthCalendar
              month={rightMonth}
              tempStart={tempStart}
              tempEnd={tempEnd}
              hoverDate={hoverDate}
              onDayClick={handleDayClick}
              onDayHover={setHoverDate}
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center gap-3 border-t border-slate-200 bg-slate-50 px-4 py-3">
          <span className="flex-1 truncate text-[12px] text-slate-600">{rangeLabel}</span>
          <Button variant="outline" size="sm" onClick={onCancel} className="text-xs">
            Cancel
          </Button>
          <Button size="sm" onClick={handleUpdate} disabled={!canUpdate} className="bg-[#2d3a8c] text-xs hover:bg-[#232f73]">
            Update
          </Button>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Type-check**

```bash
npm run build 2>&1 | head -30
```
Expected: no errors in `DateRangePicker.tsx`.

- [ ] **Step 6: Commit**

```bash
git add client/src/components/payments/DateRangePicker.tsx
git commit -m "feat: add Shopify-style DateRangePicker component"
```

---

## Task 3: Payments Table — `PaymentsTable.tsx`

**Files:**
- Create: `client/src/components/payments/PaymentsTable.tsx`

- [ ] **Step 1: Create the file**

```typescript
// client/src/components/payments/PaymentsTable.tsx
import { Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { PaymentRecord } from "@/api/payments.api";

interface PaymentsTableProps {
  data: PaymentRecord[];
  isLoading: boolean;
  error: Error | null;
  searchQuery: string;
}

function formatAmount(raw: string): string {
  const n = parseInt(raw, 10);
  if (isNaN(n)) return raw;
  return n.toLocaleString("en-IN");
}

export function PaymentsTable({ data, isLoading, error, searchQuery }: PaymentsTableProps) {
  if (isLoading) {
    return (
      <div className="flex min-h-[180px] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-[120px] items-center justify-center rounded-xl border border-destructive/20 bg-destructive/5 py-8">
        <p className="text-sm font-medium text-destructive">
          Failed to load payments. Please try again.
        </p>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="flex min-h-[120px] items-center justify-center rounded-xl border border-dashed border-slate-300 bg-slate-50 py-8">
        <p className="text-sm text-muted-foreground">
          {searchQuery.trim()
            ? "No payments match your search."
            : "No payments found for this period."}
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-slate-200">
      <table className="w-full border-collapse text-sm">
        <thead className="sticky top-0 z-10 bg-slate-100">
          <tr>
            {["#", "Date", "Client Name", "Amount", "Client Owner", "Added By", "Shared Client"].map(
              (col) => (
                <th
                  key={col}
                  className={`border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 ${
                    col === "#" || col === "Shared Client"
                      ? "text-center"
                      : col === "Amount"
                      ? "text-right"
                      : "text-left"
                  }`}
                >
                  {col}
                </th>
              )
            )}
          </tr>
        </thead>
        <tbody>
          {data.map((row, idx) => (
            <tr key={idx} className={idx % 2 === 0 ? "bg-white" : "bg-slate-50"}>
              <td className="border border-slate-200 px-3 py-1.5 text-center text-xs text-slate-500">
                {idx + 1}
              </td>
              <td className="border border-slate-200 px-3 py-1.5 text-xs text-slate-600">
                {row.date}
              </td>
              <td className="border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-800">
                {row.clientName}
              </td>
              <td className="border border-slate-200 px-3 py-1.5 text-right font-mono text-xs font-semibold text-slate-800">
                {formatAmount(row.amount)}
              </td>
              <td className="border border-slate-200 px-3 py-1.5 text-xs text-slate-600">
                {row.clientOwner}
              </td>
              <td className="border border-slate-200 px-3 py-1.5 text-xs text-slate-600">
                {row.addedBy}
              </td>
              <td className="border border-slate-200 px-3 py-1.5 text-center">
                {row.sharedClient === "Yes" ? (
                  <Badge className="bg-green-100 text-green-700 hover:bg-green-100 text-[10px]">
                    Yes
                  </Badge>
                ) : (
                  <Badge className="bg-red-100 text-red-600 hover:bg-red-100 text-[10px]">
                    No
                  </Badge>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

- [ ] **Step 2: Type-check**

```bash
npm run build 2>&1 | head -30
```
Expected: no errors in `PaymentsTable.tsx`.

- [ ] **Step 3: Commit**

```bash
git add client/src/components/payments/PaymentsTable.tsx
git commit -m "feat: add PaymentsTable Excel-style component"
```

---

## Task 4: Payments Section — `PaymentsSection.tsx`

**Files:**
- Create: `client/src/components/payments/PaymentsSection.tsx`

- [ ] **Step 1: Create the file**

```typescript
// client/src/components/payments/PaymentsSection.tsx
import { useState, useMemo, useRef, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { fetchPaymentsList, type PaymentsFilter } from "@/api/payments.api";
import { DateRangePicker } from "./DateRangePicker";
import { PaymentsTable } from "./PaymentsTable";

type FilterTab = "Today" | "Monthly" | "Yearly" | "Custom";

const FILTER_TABS: FilterTab[] = ["Today", "Monthly", "Yearly", "Custom"];

const TAB_TO_API: Record<Exclude<FilterTab, "Custom">, PaymentsFilter> = {
  Today: "today",
  Monthly: "monthly",
  Yearly: "yearly",
};

export function PaymentsSection() {
  const [activeTab, setActiveTab] = useState<FilterTab>("Today");
  const [showPicker, setShowPicker] = useState(false);
  const [appliedFilter, setAppliedFilter] = useState<PaymentsFilter>("today");
  const [appliedStart, setAppliedStart] = useState<string | undefined>(undefined);
  const [appliedEnd, setAppliedEnd] = useState<string | undefined>(undefined);
  const [searchQuery, setSearchQuery] = useState("");
  const pickerRef = useRef<HTMLDivElement>(null);

  // Close picker on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        setShowPicker(false);
      }
    }
    if (showPicker) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [showPicker]);

  const { data: response, isLoading, error } = useQuery({
    queryKey: ["payments-list", appliedFilter, appliedStart ?? null, appliedEnd ?? null],
    queryFn: () =>
      fetchPaymentsList({ filter: appliedFilter, startDate: appliedStart, endDate: appliedEnd }),
    staleTime: 1000 * 60 * 2,
    enabled: appliedFilter !== "custom" || !!(appliedStart && appliedEnd),
  });

  const rawData = response?.data ?? [];

  const filteredData = useMemo(() => {
    if (!searchQuery.trim()) return rawData;
    const q = searchQuery.toLowerCase();
    return rawData.filter(
      (row) =>
        row.clientName.toLowerCase().includes(q) ||
        row.clientOwner.toLowerCase().includes(q) ||
        row.addedBy.toLowerCase().includes(q) ||
        row.date.toLowerCase().includes(q)
    );
  }, [rawData, searchQuery]);

  function handleTabClick(tab: FilterTab) {
    setActiveTab(tab);
    setSearchQuery("");
    if (tab === "Custom") {
      setShowPicker(true);
      return;
    }
    setShowPicker(false);
    setAppliedFilter(TAB_TO_API[tab]);
    setAppliedStart(undefined);
    setAppliedEnd(undefined);
  }

  function handlePickerApply(filter: PaymentsFilter, startDate?: string, endDate?: string) {
    setAppliedFilter(filter);
    setAppliedStart(startDate);
    setAppliedEnd(endDate);
    setShowPicker(false);
  }

  function handlePickerCancel() {
    setShowPicker(false);
    // Revert tab to whatever was previously active (non-custom)
    if (activeTab === "Custom") setActiveTab("Today");
  }

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="text-base font-semibold">Payments List</CardTitle>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Total Records:{" "}
              <span className="font-semibold text-foreground">{filteredData.length}</span>
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Search input */}
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by client, owner or date…"
                className="h-8 w-full pl-8 text-xs sm:w-60"
              />
            </div>

            {/* Filter pills — same style as Reports period tabs */}
            <div className="flex items-center gap-1 rounded-xl bg-muted/40 p-1.5 ring-1 ring-border/50">
              {FILTER_TABS.map((tab) => (
                <Button
                  key={tab}
                  variant={activeTab === tab ? "default" : "ghost"}
                  size="sm"
                  onClick={() => handleTabClick(tab)}
                  className={cn(
                    "rounded-lg text-xs font-medium transition-all",
                    activeTab === tab
                      ? "shadow-sm"
                      : "text-muted-foreground hover:bg-background/80 hover:text-foreground"
                  )}
                >
                  {tab}
                </Button>
              ))}
            </div>
          </div>
        </div>

        {/* DateRangePicker — shown when Custom is active */}
        {showPicker && (
          <div ref={pickerRef} className="mt-3">
            <DateRangePicker onApply={handlePickerApply} onCancel={handlePickerCancel} />
          </div>
        )}
      </CardHeader>

      <CardContent className="pt-0">
        <PaymentsTable
          data={filteredData}
          isLoading={isLoading}
          error={error as Error | null}
          searchQuery={searchQuery}
        />
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 2: Type-check**

```bash
npm run build 2>&1 | head -30
```
Expected: no errors in `PaymentsSection.tsx`.

- [ ] **Step 3: Commit**

```bash
git add client/src/components/payments/PaymentsSection.tsx
git commit -m "feat: add PaymentsSection with filter bar, search, and date picker"
```

---

## Task 5: Wire into Reports page

**Files:**
- Modify: `client/src/pages/Reports.tsx`

- [ ] **Step 1: Add the import at the top of Reports.tsx**

Find the last import line in `Reports.tsx` (around line 41) and add after it:

```typescript
import { PaymentsSection } from "@/components/payments/PaymentsSection";
```

- [ ] **Step 2: Add the conditional render inside the `<div className="space-y-6 md:space-y-8">` block**

Find this block near line 318–322 in `Reports.tsx`:

```tsx
        {/* —— ADMIN: Product Wise Analytics —— */}
        {isAdmin && hasReport && (
          <ProductWiseAnalytics report={report} counsellorList={counsellorList} />
        )}
      </div>
```

Replace with:

```tsx
        {/* —— ADMIN: Product Wise Analytics —— */}
        {isAdmin && hasReport && (
          <ProductWiseAnalytics report={report} counsellorList={counsellorList} />
        )}

        {/* —— SUPERADMIN: Payments List —— */}
        {user?.role === "superadmin" && (
          <PaymentsSection />
        )}
      </div>
```

- [ ] **Step 3: Type-check**

```bash
npm run build 2>&1 | head -30
```
Expected: clean build with no new errors.

- [ ] **Step 4: Commit**

```bash
git add client/src/pages/Reports.tsx
git commit -m "feat: add PaymentsSection to Reports page for superadmin"
```

---

## Task 6: Manual smoke test

- [ ] **Step 1: Start the dev server**

```bash
npm run dev
```

- [ ] **Step 2: Log in as superadmin and navigate to `/reports`**

Scroll to the bottom — you should see the **Payments List** card below the Product Wise Analytics section.

- [ ] **Step 3: Test filter pills**

Click **Today**, **Monthly**, **Yearly** one at a time. Each should trigger a new fetch (network tab shows `GET /api/reports/payments-list?filter=...`). Table updates accordingly.

- [ ] **Step 4: Test Custom picker**

Click **Custom** — the `DateRangePicker` panel should appear below the filter bar. Click a preset on the left (e.g. "Last 7 days") — dates should be highlighted on the calendar. Click **Update** — picker closes, table re-fetches with `filter=custom&startDate=...&endDate=...`.

- [ ] **Step 5: Test manual calendar selection**

Open picker again, click a start date on the left calendar, hover over other dates (range highlights in blue), click an end date. Footer shows the selected range. Click **Update**.

- [ ] **Step 6: Test search**

With data loaded, type part of a client name in the search box. Table should filter instantly. "Total Records" count should update. Clear the input — all rows return.

- [ ] **Step 7: Test empty search**

Type a string that matches nothing — table area should show "No payments match your search."

- [ ] **Step 8: Test as non-superadmin role**

Log in as a manager or counsellor. Navigate to `/reports`. The Payments List section should not appear at all.

- [ ] **Step 9: Final commit if any tweaks were made**

```bash
git add -p
git commit -m "fix: payments list smoke test tweaks"
```
