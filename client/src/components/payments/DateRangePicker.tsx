// client/src/components/payments/DateRangePicker.tsx
import { useState } from "react";
import {
  format,
  addMonths,
  subMonths,
  startOfMonth,
  isSameDay,
  isWithinInterval,
  isBefore,
  isAfter,
  startOfWeek,
  endOfWeek,
  subDays,
  subMonths as dfSubMonths,
  endOfMonth,
} from "date-fns";
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
  { label: "Today",               resolve: () => ({ filter: "today" }) },
  { label: "Yesterday",           resolve: () => { const d = subDays(today(), 1); return { filter: "custom", start: d, end: d }; } },
  { label: "Today and yesterday", resolve: () => ({ filter: "custom", start: subDays(today(), 1), end: today() }) },
  { label: "Last 7 days",         resolve: () => ({ filter: "custom", start: subDays(today(), 6), end: today() }) },
  { label: "Last 14 days",        resolve: () => ({ filter: "custom", start: subDays(today(), 13), end: today() }) },
  { label: "Last 30 days",        resolve: () => ({ filter: "custom", start: subDays(today(), 29), end: today() }) },
  { label: "This week",           resolve: () => ({ filter: "custom", start: startOfWeek(today(), { weekStartsOn: 1 }), end: today() }) },
  { label: "Last week",           resolve: () => { const s = startOfWeek(subDays(today(), 7), { weekStartsOn: 1 }); return { filter: "custom", start: s, end: endOfWeek(s, { weekStartsOn: 1 }) }; } },
  { label: "This month",          resolve: () => ({ filter: "monthly" }) },
  { label: "Last month",          resolve: () => { const s = startOfMonth(dfSubMonths(today(), 1)); return { filter: "custom", start: s, end: endOfMonth(s) }; } },
  { label: "Maximum",             resolve: () => ({ filter: "maximum" }) },
];

const MONTHS = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function calendarDays(month: Date): (Date | null)[] {
  const first = startOfMonth(month);
  const blanks = first.getDay();
  const days: (Date | null)[] = Array(blanks).fill(null);
  const count = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  for (let i = 1; i <= count; i++) {
    days.push(new Date(month.getFullYear(), month.getMonth(), i));
  }
  return days;
}

// ─── MonthCalendar ─────────────────────────────────────────────────────────────

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

  const isStart = (d: Date) => !!(tempStart && isSameDay(d, tempStart));
  const isEnd   = (d: Date) => !!(tempEnd && isSameDay(d, tempEnd));

  return (
    <div className="min-w-[200px]">
      <div className="grid grid-cols-7 text-center mb-1">
        {DAYS.map((d) => (
          <div key={d} className="py-1 text-[11px] font-medium text-slate-400">
            {d}
          </div>
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
                "mx-auto flex h-7 w-7 items-center justify-center text-[12px] transition-colors",
                isStart(d) || isEnd(d)
                  ? "rounded-full bg-[#2d3a8c] font-bold text-white"
                  : isInRange(d)
                  ? "rounded-none bg-blue-100 text-blue-800"
                  : "rounded-full text-slate-700 hover:bg-slate-100"
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

// ─── DateRangePicker ───────────────────────────────────────────────────────────

export default function DateRangePicker({ onApply, onCancel }: DateRangePickerProps) {
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
    setLeftMonth(startOfMonth(start ?? today()));
  }

  function handleDayClick(d: Date) {
    setActivePreset(null);
    if (!tempStart || (tempStart && tempEnd)) {
      setTempStart(d);
      setTempEnd(null);
      setPendingFilter("custom");
      setPendingStart(null);
      setPendingEnd(null);
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

  function handleMonthSelect(side: "left" | "right", monthIndex: number) {
    if (side === "left") {
      setLeftMonth(new Date(leftMonth.getFullYear(), monthIndex, 1));
    } else {
      // right month is leftMonth + 1, so set left to month - 1
      setLeftMonth(new Date(rightMonth.getFullYear(), monthIndex - 1, 1));
    }
  }

  function handleYearSelect(side: "left" | "right", year: number) {
    if (side === "left") {
      setLeftMonth(new Date(year, leftMonth.getMonth(), 1));
    } else {
      setLeftMonth(new Date(year, rightMonth.getMonth() - 1, 1));
    }
  }

  const canUpdate =
    pendingFilter !== "custom" ||
    (pendingStart != null && pendingEnd != null);

  const rangeLabel =
    activePreset ??
    (pendingStart && pendingEnd
      ? `${format(pendingStart, "d MMM yyyy")} – ${format(pendingEnd, "d MMM yyyy")}`
      : null);

  const dateDisplay =
    pendingStart && pendingEnd
      ? `${format(pendingStart, "d MMMM yyyy")} \u2192 ${format(pendingEnd, "d MMMM yyyy")}`
      : null;

  // Year options: current year ± 5
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 11 }, (_, i) => currentYear - 5 + i);

  return (
    <div className="z-50 flex w-[min(96vw,760px)] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl">

      {/* ── Sidebar: preset list with radio buttons ── */}
      <div className="flex w-44 shrink-0 flex-col overflow-y-auto border-r border-slate-200 py-3">
        <div className="mb-1 px-4 text-[10px] font-bold uppercase tracking-wide text-slate-400">
          Presets
        </div>
        {PRESETS.map((p) => {
          const active = activePreset === p.label;
          return (
            <button
              key={p.label}
              type="button"
              onClick={() => handlePreset(p)}
              className={cn(
                "flex w-full items-center gap-3 px-4 py-[7px] text-left text-[13px] transition-colors hover:bg-slate-50",
                active ? "text-[#2d3a8c]" : "text-slate-700"
              )}
            >
              {/* Radio indicator */}
              <span
                className={cn(
                  "flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2 transition-colors",
                  active ? "border-[#2d3a8c] bg-[#2d3a8c]" : "border-slate-300 bg-white"
                )}
              >
                {active && <span className="h-1.5 w-1.5 rounded-full bg-white" />}
              </span>
              <span className={cn("leading-tight", active && "font-medium")}>{p.label}</span>
            </button>
          );
        })}
      </div>

      {/* ── Right panel: header + calendars + footer ── */}
      <div className="flex min-w-0 flex-1 flex-col">

        {/* Navigation row: ← [Apr ▼ 2026 ▼]   [May ▼ 2026 ▼] → */}
        <div className="flex items-center gap-2 px-4 pt-4 pb-2">
          <button
            type="button"
            onClick={() => setLeftMonth((m) => subMonths(m, 1))}
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-slate-200 hover:bg-slate-100"
          >
            <ChevronLeft className="h-4 w-4 text-slate-500" />
          </button>

          <div className="flex flex-1 items-center justify-around">
            {/* Left month/year selects */}
            <div className="flex items-center gap-1">
              <select
                value={leftMonth.getMonth()}
                onChange={(e) => handleMonthSelect("left", Number(e.target.value))}
                className="cursor-pointer appearance-none rounded border border-slate-200 bg-white px-2 py-0.5 text-[13px] font-semibold text-slate-800 hover:bg-slate-50 focus:outline-none"
              >
                {MONTHS.map((m, i) => (
                  <option key={m} value={i}>{m}</option>
                ))}
              </select>
              <select
                value={leftMonth.getFullYear()}
                onChange={(e) => handleYearSelect("left", Number(e.target.value))}
                className="cursor-pointer appearance-none rounded border border-slate-200 bg-white px-2 py-0.5 text-[13px] font-semibold text-slate-800 hover:bg-slate-50 focus:outline-none"
              >
                {years.map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>

            {/* Right month/year selects */}
            <div className="hidden items-center gap-1 md:flex">
              <select
                value={rightMonth.getMonth()}
                onChange={(e) => handleMonthSelect("right", Number(e.target.value))}
                className="cursor-pointer appearance-none rounded border border-slate-200 bg-white px-2 py-0.5 text-[13px] font-semibold text-slate-800 hover:bg-slate-50 focus:outline-none"
              >
                {MONTHS.map((m, i) => (
                  <option key={m} value={i}>{m}</option>
                ))}
              </select>
              <select
                value={rightMonth.getFullYear()}
                onChange={(e) => handleYearSelect("right", Number(e.target.value))}
                className="cursor-pointer appearance-none rounded border border-slate-200 bg-white px-2 py-0.5 text-[13px] font-semibold text-slate-800 hover:bg-slate-50 focus:outline-none"
              >
                {years.map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setLeftMonth((m) => addMonths(m, 1))}
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-slate-200 hover:bg-slate-100"
          >
            <ChevronRight className="h-4 w-4 text-slate-500" />
          </button>
        </div>

        {/* Calendars */}
        <div className="flex flex-col gap-4 px-4 pb-2 md:flex-row md:gap-0">
          <div className="flex-1 pr-5">
            <MonthCalendar
              month={leftMonth}
              tempStart={tempStart}
              tempEnd={tempEnd}
              hoverDate={hoverDate}
              onDayClick={handleDayClick}
              onDayHover={setHoverDate}
            />
          </div>
          {/* Vertical divider */}
          <div className="hidden w-px self-stretch bg-slate-200 md:block" />
          <div className="hidden flex-1 pl-5 md:block">
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
        <div className="border-t border-slate-200 px-4 py-3">
          {/* Range display row */}
          <div className="mb-2 flex flex-wrap items-center gap-2 text-[12px] text-slate-600">
            {rangeLabel && (
              <span className="rounded border border-slate-200 bg-slate-50 px-2 py-0.5 font-medium text-slate-700">
                {rangeLabel}
              </span>
            )}
            {dateDisplay && (
              <span className="text-slate-500">{dateDisplay}</span>
            )}
            {!rangeLabel && !dateDisplay && (
              <span className="text-slate-400 italic">Select a range</span>
            )}
          </div>

          {/* Timezone + buttons */}
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] text-slate-400">Dates are shown in Kolkata Time</span>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={onCancel} className="text-xs">
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleUpdate}
                disabled={!canUpdate}
                className="bg-primary text-xs hover:bg-primary/90"
              >
                Update
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
