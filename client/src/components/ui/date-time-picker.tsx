import { useState, useRef, useEffect } from "react";
import {
  format,
  getDaysInMonth,
  startOfMonth,
  getDay,
  isToday,
  isSameDay,
  startOfDay,
  isBefore,
} from "date-fns";
import { ChevronLeft, ChevronRight, Plus, Minus } from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";
import { getDefaultFollowupDateTime } from "@/lib/followup-datetime";

interface DateTimePickerProps {
  value?: Date | null;
  onChange: (date: Date) => void;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Disallow dates/times before this (default: now). */
  minDateTime?: Date;
  /** Optional quick-set action shown in the footer. */
  onPickTomorrowMorning?: () => void;
  tomorrowMorningLabel?: string;
}

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

/** Inline editable + scrollable number spinner used for hour and minute */
function TimeUnit({
  value,
  display,
  onIncrement,
  onDecrement,
  onCommit,
  min,
  max,
}: {
  value: number;
  display: string;
  onIncrement: () => void;
  onDecrement: () => void;
  /** called with the new raw number when the user finishes typing */
  onCommit: (v: number) => void;
  min: number;
  max: number;
}) {
  const [editing, setEditing] = useState(false);
  const [raw, setRaw] = useState(display);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) {
      setRaw(display);
      setTimeout(() => inputRef.current?.select(), 0);
    }
  }, [editing, display]);

  const commit = () => {
    const parsed = parseInt(raw, 10);
    if (!isNaN(parsed)) {
      const clamped = Math.max(min, Math.min(max, parsed));
      onCommit(clamped);
    }
    setEditing(false);
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    if (e.deltaY < 0) onIncrement();
    else onDecrement();
  };

  return (
    <div className="flex flex-col items-center gap-1">
      <button
        onClick={onIncrement}
        className="p-1 rounded hover:bg-muted transition-colors"
      >
        <Plus className="w-3.5 h-3.5" />
      </button>

      {editing ? (
        <input
          ref={inputRef}
          value={raw}
          onChange={(e) => setRaw(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === "Enter") commit();
            if (e.key === "Escape") setEditing(false);
            if (e.key === "ArrowUp") { e.preventDefault(); onIncrement(); }
            if (e.key === "ArrowDown") { e.preventDefault(); onDecrement(); }
          }}
          className="w-10 h-9 text-2xl font-bold text-center tabular-nums bg-muted rounded-md border border-primary outline-none focus:ring-2 focus:ring-primary/30"
          maxLength={2}
          inputMode="numeric"
        />
      ) : (
        <span
          onClick={() => setEditing(true)}
          onWheel={handleWheel}
          title="Click to type · Scroll to change"
          className="text-2xl font-bold w-10 h-9 flex items-center justify-center rounded-md tabular-nums cursor-text select-none hover:bg-muted transition-colors"
        >
          {display}
        </span>
      )}

      <button
        onClick={onDecrement}
        className="p-1 rounded hover:bg-muted transition-colors"
      >
        <Minus className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

function clampToMin(date: Date, min: Date): Date {
  return date.getTime() < min.getTime() ? new Date(min) : date;
}

export function DateTimePicker({
  value,
  onChange,
  open,
  onOpenChange,
  minDateTime,
  onPickTomorrowMorning,
  tomorrowMorningLabel = "Tomorrow 10:30 AM",
}: DateTimePickerProps) {
  const minAllowed = minDateTime ?? new Date();
  const todayStart = startOfDay(new Date());

  const resolveSeed = () => {
    if (value && value.getTime() >= minAllowed.getTime()) return value;
    return getDefaultFollowupDateTime();
  };

  const [viewMonth, setViewMonth] = useState(
    new Date(resolveSeed().getFullYear(), resolveSeed().getMonth(), 1),
  );
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const [hour24, setHour24] = useState(resolveSeed().getHours());
  const [minute, setMinute] = useState(resolveSeed().getMinutes());

  useEffect(() => {
    if (!open) return;
    const seed =
      value && value.getTime() >= minAllowed.getTime()
        ? value
        : getDefaultFollowupDateTime();
    setSelectedDay(new Date(seed.getFullYear(), seed.getMonth(), seed.getDate()));
    setHour24(seed.getHours());
    setMinute(seed.getMinutes());
    setViewMonth(new Date(seed.getFullYear(), seed.getMonth(), 1));
  }, [open, value, minAllowed]);

  const displayHour = hour24 % 12 === 0 ? 12 : hour24 % 12;
  const period = hour24 >= 12 ? "pm" : "am";

  const prevMonth = () =>
    setViewMonth((m) => new Date(m.getFullYear(), m.getMonth() - 1, 1));
  const nextMonth = () =>
    setViewMonth((m) => new Date(m.getFullYear(), m.getMonth() + 1, 1));

  const daysInMonth = getDaysInMonth(viewMonth);
  const firstDow = getDay(startOfMonth(viewMonth));
  const cells: (number | null)[] = [
    ...Array<null>(firstDow).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  const minForSelectedDay = (day: Date) => {
    if (isSameDay(day, minAllowed)) return minAllowed;
    return startOfDay(day);
  };

  const applyTimeToDay = (day: Date, h24: number, min: number) => {
    const raw = new Date(day.getFullYear(), day.getMonth(), day.getDate(), h24, min, 0, 0);
    return clampToMin(raw, minForSelectedDay(day));
  };

  const syncTimeClamped = (day: Date, h24: number, min: number) => {
    const clamped = applyTimeToDay(day, h24, min);
    setHour24(clamped.getHours());
    setMinute(clamped.getMinutes());
  };

  // Hour helpers (keep period when incrementing/decrementing)
  const incHour = () => {
    if (!selectedDay) return setHour24((h) => (h + 1) % 24);
    syncTimeClamped(selectedDay, (hour24 + 1) % 24, minute);
  };
  const decHour = () => {
    if (!selectedDay) return setHour24((h) => (h - 1 + 24) % 24);
    syncTimeClamped(selectedDay, (hour24 - 1 + 24) % 24, minute);
  };
  const commitHour = (display12: number) => {
    const clamped = Math.max(1, Math.min(12, display12));
    const base = period === "pm" ? 12 : 0;
    const h24 = clamped === 12 ? base : base + clamped;
    if (!selectedDay) return setHour24(h24);
    syncTimeClamped(selectedDay, h24, minute);
  };

  // Minute helpers (5-step scroll, free-type)
  const incMinute = () => {
    const next = minute + 5 >= 60 ? 0 : minute + 5;
    if (!selectedDay) return setMinute(next);
    syncTimeClamped(selectedDay, hour24, next);
  };
  const decMinute = () => {
    const next = minute - 5 < 0 ? 55 : minute - 5;
    if (!selectedDay) return setMinute(next);
    syncTimeClamped(selectedDay, hour24, next);
  };
  const commitMinute = (v: number) => {
    const next = Math.max(0, Math.min(59, v));
    if (!selectedDay) return setMinute(next);
    syncTimeClamped(selectedDay, hour24, next);
  };

  const togglePeriod = (p: "am" | "pm") => {
    let h24 = hour24;
    if (p === "am" && hour24 >= 12) h24 = hour24 - 12;
    if (p === "pm" && hour24 < 12) h24 = hour24 + 12;
    if (!selectedDay) return setHour24(h24);
    syncTimeClamped(selectedDay, h24, minute);
  };

  const handleSave = () => {
    if (!selectedDay) return;
    const result = applyTimeToDay(selectedDay, hour24, minute);
    onChange(result);
    onOpenChange(false);
  };

  const headerLabel = selectedDay
    ? format(selectedDay, "EEEE, MMMM d yyyy")
    : "No date selected";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="p-0 max-w-[580px] gap-0 overflow-hidden">
        <DialogTitle className="sr-only">Select Date & Time</DialogTitle>

        {/* Coloured header */}
        <div className="bg-primary px-6 py-5 flex items-start justify-between">
          <div>
            <p className="text-primary-foreground/70 text-xs font-semibold uppercase tracking-widest mb-1">
              Select Date
            </p>
            <p className="text-primary-foreground text-lg font-bold leading-tight">
              {headerLabel}
            </p>
          </div>
          <p className="text-primary-foreground/80 text-sm font-semibold mt-1">
            {String(displayHour).padStart(2, "0")}:{String(minute).padStart(2, "0")}{" "}
            {period.toUpperCase()}
          </p>
        </div>

        {/* Body */}
        <div className="flex">
          {/* ── Calendar ── */}
          <div className="flex-1 p-5 border-r border-border">
            <div className="flex items-center justify-between mb-4">
              <button
                onClick={prevMonth}
                className="p-1.5 rounded-md hover:bg-muted transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-sm font-semibold">
                {viewMonth.getFullYear()} {MONTHS[viewMonth.getMonth()]}
              </span>
              <button
                onClick={nextMonth}
                className="p-1.5 rounded-md hover:bg-muted transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-7 mb-1">
              {DAYS.map((d) => (
                <div
                  key={d}
                  className="text-center text-[10px] font-bold text-muted-foreground py-1 uppercase tracking-wide"
                >
                  {d}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-y-1">
              {cells.map((day, i) => {
                if (!day) return <div key={`e-${i}`} />;
                const date = new Date(viewMonth.getFullYear(), viewMonth.getMonth(), day);
                const isSelected = !!selectedDay && isSameDay(date, selectedDay);
                const isTodayCell = isToday(date);
                const isPastDay = isBefore(date, todayStart);
                return (
                  <button
                    key={day}
                    type="button"
                    disabled={isPastDay}
                    onClick={() => {
                      const picked = new Date(viewMonth.getFullYear(), viewMonth.getMonth(), day);
                      setSelectedDay(picked);
                      syncTimeClamped(picked, hour24, minute);
                    }}
                    className={cn(
                      "mx-auto flex h-8 w-8 items-center justify-center rounded-full text-sm transition-colors font-medium",
                      isPastDay && "opacity-30 cursor-not-allowed",
                      isSelected
                        ? "bg-primary text-primary-foreground shadow-sm"
                        : isTodayCell
                          ? "border border-primary text-primary hover:bg-primary/10"
                          : "hover:bg-muted text-foreground",
                    )}
                  >
                    {day}
                  </button>
                );
              })}
            </div>
          </div>

          {/* ── Time Picker ── */}
          <div className="w-52 p-5 flex flex-col items-center gap-4">
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
              Time
            </p>

            {/* Hour slider */}
            <div className="w-full space-y-1.5">
              <p className="text-[10px] text-muted-foreground text-center">Hour (0–23)</p>
              <Slider
                min={0}
                max={23}
                step={1}
                value={[hour24]}
                onValueChange={([v]) => {
                  if (!selectedDay) return setHour24(v);
                  syncTimeClamped(selectedDay, v, minute);
                }}
                className="w-full"
              />
            </div>

            {/* Clock spinners */}
            <div className="flex items-center gap-2">
              <TimeUnit
                value={displayHour}
                display={String(displayHour).padStart(2, "0")}
                onIncrement={incHour}
                onDecrement={decHour}
                onCommit={commitHour}
                min={1}
                max={12}
              />

              <span className="text-2xl font-bold text-muted-foreground pb-0.5">:</span>

              <TimeUnit
                value={minute}
                display={String(minute).padStart(2, "0")}
                onIncrement={incMinute}
                onDecrement={decMinute}
                onCommit={commitMinute}
                min={0}
                max={59}
              />
            </div>

            {/* AM / PM toggle */}
            <div className="flex rounded-lg overflow-hidden border border-border w-full">
              {(["am", "pm"] as const).map((p) => (
                <button
                  key={p}
                  onClick={() => togglePeriod(p)}
                  className={cn(
                    "flex-1 py-2 text-sm font-semibold transition-colors",
                    period === p
                      ? "bg-primary text-primary-foreground"
                      : "hover:bg-muted text-foreground",
                  )}
                >
                  {p.toUpperCase()}
                </button>
              ))}
            </div>

            <p className="text-[10px] text-muted-foreground text-center leading-relaxed">
              Click number to type<br />Scroll to change value
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="flex flex-wrap items-center justify-between gap-2 px-6 py-3 border-t border-border bg-muted/20">
          {onPickTomorrowMorning ? (
            <Button type="button" variant="outline" size="sm" onClick={onPickTomorrowMorning}>
              {tomorrowMorningLabel}
            </Button>
          ) : (
            <span />
          )}
          <div className="flex gap-2 ml-auto">
            <Button variant="ghost" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={!selectedDay}>
              Save
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
