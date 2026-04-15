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
  startOfYear,
  endOfYear,
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
  { label: "Last 28 days",        resolve: () => ({ filter: "custom", start: subDays(today(), 27), end: today() }) },
  { label: "Last 30 days",        resolve: () => ({ filter: "custom", start: subDays(today(), 29), end: today() }) },
  { label: "This week",           resolve: () => ({ filter: "custom", start: startOfWeek(today(), { weekStartsOn: 1 }), end: today() }) },
  { label: "Last week",           resolve: () => { const s = startOfWeek(subDays(today(), 7), { weekStartsOn: 1 }); return { filter: "custom", start: s, end: endOfWeek(s, { weekStartsOn: 1 }) }; } },
  { label: "This month",          resolve: () => ({ filter: "monthly" }) },
  { label: "Last month",          resolve: () => { const s = startOfMonth(dfSubMonths(today(), 1)); return { filter: "custom", start: s, end: endOfMonth(s) }; } },
  { label: "This year",           resolve: () => ({ filter: "yearly" }) },
  { label: "Last year",           resolve: () => { const lastYear = new Date(today().getFullYear() - 1, 0, 1); return { filter: "custom", start: startOfYear(lastYear), end: endOfYear(lastYear) }; } },
];

// ─── Calendar helpers ──────────────────────────────────────────────────────────

const DAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

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

  return (
    <div>
      <div className="mb-2 text-center text-sm font-semibold text-slate-800">
        {format(month, "MMMM yyyy")}
      </div>
      <div className="grid grid-cols-7 text-center">
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
                (tempStart && isSameDay(d, tempStart)) || (tempEnd && isSameDay(d, tempEnd))
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
      // First click — disable Update until end is picked
      setTempStart(d);
      setTempEnd(null);
      setPendingFilter("custom");
      setPendingStart(null);
      setPendingEnd(null);
    } else {
      // Second click — complete the range
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
          {/* Left calendar with prev arrow */}
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

          {/* Right calendar with next arrow */}
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
          <Button
            size="sm"
            onClick={handleUpdate}
            disabled={!canUpdate}
            className="bg-[#2d3a8c] text-xs hover:bg-[#232f73]"
          >
            Update
          </Button>
        </div>
      </div>
    </div>
  );
}
