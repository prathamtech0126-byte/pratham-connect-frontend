import { DateRange } from 'react-day-picker'
import { useQuery } from '@tanstack/react-query'
import {
  format, parse, isValid, parseISO, setMonth, setYear, differenceInDays,
  startOfMonth, getDay, addDays, subDays,
  isSameDay, isSameMonth, isToday as dfIsToday,
  isBefore, startOfDay,
} from 'date-fns'
import {
  CalendarDays, CalendarIcon, ChevronDown, ChevronLeft, ChevronRight,
  Check, ArrowRight,
} from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { fetchSavedPeriods, type SavedPeriod } from '@/api/incentives.api'

interface Props {
  value: DateRange | undefined
  onChange: (range: DateRange | undefined) => void
  /** Called after the in-flight range is applied; receives that range so parents avoid stale state. */
  onNext?: (applied: DateRange) => void
}

const MIN_RANGE_DAYS = 15

const YEAR_RANGE = Array.from({ length: 11 }, (_, i) => 2020 + i)
const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

function buildCalendarWeeks(month: Date): Date[][] {
  const first = startOfMonth(month)
  const startCell = subDays(first, getDay(first))
  return Array.from({ length: 6 }, (_, w) =>
    Array.from({ length: 7 }, (_, d) => addDays(startCell, w * 7 + d)),
  )
}

function computeDisplayRange(
  tempRange: DateRange | undefined,
  hoverDate: Date | undefined,
): DateRange | undefined {
  if (!tempRange?.from) return undefined
  if (tempRange.to) return tempRange
  const hover = hoverDate ?? tempRange.from
  return isBefore(hover, tempRange.from)
    ? { from: hover, to: tempRange.from }
    : { from: tempRange.from, to: hover }
}

// ─── month nav ────────────────────────────────────────────────────────────────
function CalendarNav({
  currentMonth,
  onMonthChange,
}: {
  currentMonth: Date
  onMonthChange: (d: Date) => void
}) {
  const [showYear, setShowYear] = useState(false)
  const [showMonth, setShowMonth] = useState(false)
  const yr = currentMonth.getFullYear()
  const mo = currentMonth.getMonth()

  return (
    <div className="flex items-center justify-between px-2 sm:px-4 py-2 border-b border-border bg-muted/10 gap-1">
      <button
        type="button"
        className="h-7 w-7 rounded-lg flex items-center justify-center hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
        onClick={() => onMonthChange(setMonth(currentMonth, mo - 1))}
      >
        <ChevronLeft className="h-3.5 w-3.5" />
      </button>

      <div className="flex items-center gap-0.5">
        <div className="relative">
          <button
            type="button"
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-sm font-semibold hover:bg-accent transition-colors"
            onClick={() => { setShowMonth(v => !v); setShowYear(false) }}
          >
            {MONTH_NAMES[mo]}
            <ChevronDown className="h-3 w-3 opacity-50" />
          </button>
          {showMonth && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setShowMonth(false)} />
              <div className="absolute top-full left-0 mt-1 z-50 bg-popover border border-border rounded-xl shadow-floating min-w-[180px]">
                <div className="grid grid-cols-3 gap-1 p-2">
                  {MONTH_NAMES.map((m, i) => (
                    <button
                      key={m}
                      type="button"
                      className={cn(
                        'px-2 py-1.5 rounded-lg text-xs font-medium transition-colors hover:bg-accent',
                        mo === i && 'bg-primary text-primary-foreground hover:bg-primary',
                      )}
                      onClick={() => { onMonthChange(setMonth(currentMonth, i)); setShowMonth(false) }}
                    >
                      {m.slice(0, 3)}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>

        <div className="relative">
          <button
            type="button"
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-sm font-semibold hover:bg-accent transition-colors"
            onClick={() => { setShowYear(v => !v); setShowMonth(false) }}
          >
            {yr}
            <ChevronDown className="h-3 w-3 opacity-50" />
          </button>
          {showYear && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setShowYear(false)} />
              <div className="absolute top-full left-0 mt-1 z-50 bg-popover border border-border rounded-xl shadow-floating">
                <div className="flex flex-col gap-0.5 p-1.5 max-h-40 overflow-y-auto">
                  {YEAR_RANGE.map(y => (
                    <button
                      key={y}
                      type="button"
                      className={cn(
                        'px-4 py-1 rounded-lg text-xs font-medium transition-colors hover:bg-accent text-left',
                        yr === y && 'bg-primary text-primary-foreground hover:bg-primary',
                      )}
                      onClick={() => { onMonthChange(setYear(currentMonth, y)); setShowYear(false) }}
                    >
                      {y}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      <button
        type="button"
        className="h-7 w-7 rounded-lg flex items-center justify-center hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
        onClick={() => onMonthChange(setMonth(currentMonth, mo + 1))}
      >
        <ChevronRight className="h-3.5 w-3.5" />
      </button>
    </div>
  )
}

// ─── day cell ─────────────────────────────────────────────────────────────────
interface DayCellProps {
  date: Date
  currentMonth: Date
  displayRange: DateRange | undefined
  onClick: () => void
  onMouseEnter: () => void
  isDisabled?: boolean
}

function DayCell({ date, currentMonth, displayRange, onClick, onMouseEnter, isDisabled }: DayCellProps) {
  const from = displayRange?.from
  const to = displayRange?.to

  const d0 = startOfDay(date)
  const isStart = from ? isSameDay(date, from) : false
  const isEnd = to ? isSameDay(date, to) : false
  const inRange = from && to
    ? d0 >= startOfDay(from) && d0 <= startOfDay(to)
    : false
  const isMiddle = inRange && !isStart && !isEnd
  const isSelected = isStart || isEnd
  const isCurrentMonth = isSameMonth(date, currentMonth)
  const today = dfIsToday(date)

  return (
    <div
      className={cn(
        'relative min-h-[40px] sm:min-h-[52px] flex flex-col items-center pt-1 sm:pt-1.5 select-none group transition-colors duration-100',
        isDisabled ? 'cursor-not-allowed' : 'cursor-pointer',
        !isSelected && !isDisabled && 'hover:bg-accent/30',
      )}
      onClick={isDisabled ? undefined : onClick}
      onMouseEnter={isDisabled ? undefined : onMouseEnter}
    >
      {/* Range band */}
      {inRange && (
        <div
          className={cn(
            'absolute top-1 sm:top-1.5 h-7 sm:h-8 bg-primary/15 pointer-events-none',
            isStart && !isEnd && 'left-1/2 right-0',
            isEnd && !isStart && 'left-0 right-1/2',
            isMiddle && 'left-0 right-0',
          )}
        />
      )}

      {/* Date circle */}
      <div
        className={cn(
          'relative z-10 h-7 w-7 sm:h-8 sm:w-8 flex items-center justify-center rounded-full text-[11px] sm:text-xs font-medium transition-colors duration-100',
          isDisabled
            ? 'text-muted-foreground/25'
            : isSelected
              ? 'bg-primary text-primary-foreground font-semibold shadow-sm'
              : today
                ? 'bg-primary/10 text-primary font-bold'
                : isCurrentMonth
                  ? 'text-foreground group-hover:bg-accent'
                  : 'text-muted-foreground/30',
        )}
      >
        {format(date, 'd')}
      </div>

      {/* Today dot */}
      {today && !isSelected && (
        <div className="absolute bottom-1.5 w-1 h-1 rounded-full bg-primary" />
      )}
    </div>
  )
}

// ─── main component ───────────────────────────────────────────────────────────
export function PeriodSelector({ value, onChange, onNext }: Props) {
  const { data: savedPeriods = [], isLoading } = useQuery({
    queryKey: ['saved-periods'],
    queryFn: fetchSavedPeriods,
  })

  const [currentMonth, setCurrentMonth] = useState<Date>(value?.from || new Date())
  const [tempRange, setTempRange] = useState<DateRange | undefined>(value)
  const [hoverDate, setHoverDate] = useState<Date | undefined>()
  const [startInput, setStartInput] = useState(value?.from ? format(value.from, 'MMM dd, yyyy') : '')
  const [endInput, setEndInput] = useState(value?.to ? format(value.to, 'MMM dd, yyyy') : '')
  const [startError, setStartError] = useState<string | null>(null)
  const [endError, setEndError] = useState<string | null>(null)

  useEffect(() => {
    setTempRange(value)
    if (value?.from) setCurrentMonth(value.from)
    setStartInput(value?.from ? format(value.from, 'MMM dd, yyyy') : '')
    setEndInput(value?.to ? format(value.to, 'MMM dd, yyyy') : '')
  }, [value])

  // Sync input strings when calendar selection changes
  useEffect(() => {
    setStartInput(tempRange?.from ? format(tempRange.from, 'MMM dd, yyyy') : '')
    setEndInput(tempRange?.to ? format(tempRange.to, 'MMM dd, yyyy') : '')
  }, [tempRange])

  const tryParseDate = (str: string): Date | null => {
    const fmts = ['MMM dd, yyyy', 'dd/MM/yyyy', 'MM/dd/yyyy', 'yyyy-MM-dd']
    for (const fmt of fmts) {
      const d = parse(str.trim(), fmt, new Date())
      if (isValid(d)) return startOfDay(d)
    }
    return null
  }

  const handleStartBlur = () => {
    const parsed = tryParseDate(startInput)
    if (!parsed) {
      setStartError('Invalid date — try "Apr 01, 2026"')
      setStartInput(tempRange?.from ? format(tempRange.from, 'MMM dd, yyyy') : '')
      return
    }
    setStartError(null)
    if (tempRange?.to && Math.abs(differenceInDays(tempRange.to, parsed)) < MIN_RANGE_DAYS - 1) {
      setTempRange({ from: parsed, to: undefined })
    } else {
      setTempRange(prev => ({ ...prev, from: parsed }))
    }
    setCurrentMonth(parsed)
  }

  const handleEndBlur = () => {
    if (!tempRange?.from) { setEndInput(''); return }
    const parsed = tryParseDate(endInput)
    if (!parsed) {
      setEndError('Invalid date — try "Apr 30, 2026"')
      setEndInput(tempRange?.to ? format(tempRange.to, 'MMM dd, yyyy') : '')
      return
    }
    if (Math.abs(differenceInDays(parsed, tempRange.from)) < MIN_RANGE_DAYS - 1) {
      setEndError(`Minimum ${MIN_RANGE_DAYS} days required`)
      setEndInput(tempRange?.to ? format(tempRange.to, 'MMM dd, yyyy') : '')
      return
    }
    setEndError(null)
    const next: DateRange = isBefore(parsed, tempRange.from)
      ? { from: parsed, to: tempRange.from }
      : { from: tempRange.from, to: parsed }
    setTempRange(next)
    onChange(next)
  }

  const isSelectingEnd = !!(tempRange?.from && !tempRange?.to)

  const displayRange = useMemo(
    () => computeDisplayRange(tempRange, isSelectingEnd ? hoverDate : undefined),
    [tempRange, hoverDate, isSelectingEnd],
  )

  const weeks = useMemo(() => buildCalendarWeeks(currentMonth), [currentMonth])

  const isDateDisabled = (date: Date): boolean => {
    if (!isSelectingEnd || !tempRange?.from) return false
    return Math.abs(differenceInDays(date, tempRange.from)) < MIN_RANGE_DAYS - 1
  }

  const handleDayClick = (date: Date) => {
    if (!isSelectingEnd) {
      setTempRange({ from: date, to: undefined })
    } else {
      if (isDateDisabled(date)) return
      const from = tempRange!.from!
      const next: DateRange = isBefore(date, from)
        ? { from: date, to: from }
        : { from, to: date }
      setTempRange(next)
      setHoverDate(undefined)
      onChange(next)
    }
  }

  const handleClear = () => {
    onChange(undefined)
    setTempRange(undefined)
    setHoverDate(undefined)
  }

  const isPeriodSelected = (period: SavedPeriod) => {
    if (!value?.from || !value?.to) return false
    return (
      format(parseISO(period.startDate), 'yyyy-MM-dd') === format(value.from, 'yyyy-MM-dd') &&
      format(parseISO(period.endDate), 'yyyy-MM-dd') === format(value.to, 'yyyy-MM-dd')
    )
  }

  const duration = tempRange?.from && tempRange?.to
    ? differenceInDays(tempRange.to, tempRange.from) + 1
    : null

  return (
    <div className="space-y-2 min-w-0">
      {/* ── Main card ── */}
      <div className="rounded-xl border border-border overflow-hidden bg-card shadow-card min-w-0">

        {/* Card header */}
        <div className="px-3 py-2.5 sm:px-5 border-b border-border bg-muted/20 flex items-center gap-2.5">
          <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
            <CalendarDays className="h-4 w-4 text-primary" />
          </div>
          <div>
            <h2 className="text-sm font-semibold leading-tight">Incentive Period</h2>
            <p className="text-xs text-muted-foreground">Choose the date range for your incentive rules</p>
          </div>
        </div>

        {/* Calendar + side panel: stack on small screens */}
        <div className="flex flex-col md:flex-row min-w-0">

          {/* ── Left: month grid ── */}
          <div className="flex-1 min-w-0 flex flex-col border-b md:border-b-0 md:border-r border-border">
            <CalendarNav currentMonth={currentMonth} onMonthChange={setCurrentMonth} />

            <div className="p-2 sm:p-3">
              {/* Weekday headers */}
              <div className="grid grid-cols-7 mb-1">
                {WEEKDAYS.map(day => (
                  <div
                    key={day}
                    className="text-center py-1 sm:py-1.5 text-[9px] sm:text-[10px] font-semibold text-muted-foreground uppercase tracking-wide sm:tracking-widest"
                  >
                    {day}
                  </div>
                ))}
              </div>

              {/* Calendar grid */}
              <div
                className="border border-border/50 rounded-lg overflow-hidden"
                onMouseLeave={() => setHoverDate(undefined)}
              >
                {weeks.map((week, wi) => (
                  <div
                    key={wi}
                    className={cn(
                      'grid grid-cols-7 divide-x divide-border/50',
                      wi < 5 && 'border-b border-border/50',
                    )}
                  >
                    {week.map((day, di) => (
                      <DayCell
                        key={di}
                        date={day}
                        currentMonth={currentMonth}
                        displayRange={displayRange}
                        isDisabled={isDateDisabled(day)}
                        onClick={() => handleDayClick(day)}
                        onMouseEnter={() => isSelectingEnd && !isDateDisabled(day) && setHoverDate(day)}
                      />
                    ))}
                  </div>
                ))}
              </div>

              {/* Compact status hint */}
              <p className="mt-1.5 text-center text-[10px] text-muted-foreground/50">
                {isSelectingEnd
                  ? `Pick an end date — min. ${MIN_RANGE_DAYS} days apart`
                  : tempRange?.from && tempRange?.to
                    ? 'Click any date to reset'
                    : 'Click a date to start'}
              </p>
            </div>
          </div>

          {/* ── Right: info + actions ── */}
          <div className="w-full md:w-[15rem] md:shrink-0 flex flex-col p-3 sm:p-4 gap-2 bg-muted/5 border-t md:border-t-0 border-border/60">

            {/* Date summary */}
            <div className="space-y-2">
              <div>
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest mb-1">
                  Start Date
                </p>
                <input
                  type="text"
                  value={startInput}
                  onChange={e => { setStartInput(e.target.value); setStartError(null) }}
                  onBlur={handleStartBlur}
                  placeholder="Apr 01, 2026"
                  className={cn(
                    'w-full rounded-lg border px-3 py-2 text-sm font-semibold tabular-nums bg-transparent focus:outline-none focus:ring-2 transition-colors placeholder:text-muted-foreground/40 placeholder:font-normal',
                    startError
                      ? 'border-destructive focus:ring-destructive/20'
                      : tempRange?.from
                        ? 'border-primary/30 bg-primary/5 focus:ring-primary/20'
                        : 'border-border bg-muted/30 focus:ring-primary/20',
                  )}
                />
                {startError && (
                  <p className="mt-1 text-[10px] text-destructive">{startError}</p>
                )}
              </div>

              <div className="flex items-center gap-2 px-1">
                <div className="h-px flex-1 bg-border" />
                <ArrowRight className="h-3 w-3 text-muted-foreground shrink-0" />
                <div className="h-px flex-1 bg-border" />
              </div>

              <div>
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest mb-1">
                  End Date
                </p>
                <input
                  type="text"
                  value={endInput}
                  onChange={e => { setEndInput(e.target.value); setEndError(null) }}
                  onBlur={handleEndBlur}
                  placeholder="Apr 30, 2026"
                  disabled={!tempRange?.from}
                  className={cn(
                    'w-full rounded-lg border px-3 py-2 text-sm font-semibold tabular-nums bg-transparent focus:outline-none focus:ring-2 transition-colors placeholder:text-muted-foreground/40 placeholder:font-normal',
                    !tempRange?.from
                      ? 'border-border bg-muted/30 opacity-50 cursor-not-allowed'
                      : endError
                        ? 'border-destructive focus:ring-destructive/20'
                        : tempRange?.to
                          ? 'border-primary/30 bg-primary/5 focus:ring-primary/20'
                          : 'border-border bg-muted/30 focus:ring-primary/20',
                  )}
                />
                {endError && (
                  <p className="mt-1 text-[10px] text-destructive">{endError}</p>
                )}
              </div>

              {duration !== null && (
                <div className="flex items-center justify-between rounded-lg bg-primary/5 border border-primary/20 px-3 py-2">
                  <span className="text-xs font-medium text-muted-foreground">Duration</span>
                  <span className="text-sm font-bold text-primary">{duration} days</span>
                </div>
              )}
            </div>

            {/* Push actions to bottom on desktop only; avoid tall empty gap when stacked on mobile */}
            <div className="min-h-0 md:flex-1" />

            {/* Actions */}
<div className="space-y-1.5">
  {value?.from && value?.to && (
    <div className="flex items-center gap-1.5 rounded-lg bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 px-2.5 py-1.5">
      <Check className="h-3 w-3 text-green-600 dark:text-green-400 shrink-0" />
      <span className="text-xs font-semibold text-green-700 dark:text-green-400 truncate">
        {format(value.from, 'MMM d')} – {format(value.to, 'MMM d, yyyy')}
      </span>
    </div>
  )}
  {onNext && (
  <Button
    className="w-full gap-2 rounded-lg h-9 text-sm"
    disabled={!tempRange?.from || !tempRange?.to} // Use tempRange instead of value
    onClick={() => {
      if (tempRange?.from && tempRange?.to) {
        onChange(tempRange)
        onNext(tempRange)
      }
    }}
  >
    Continue
    <ArrowRight className="h-4 w-4" />
  </Button>
)}

  <div className="flex gap-1.5">
    <Button variant="outline" size="sm" onClick={handleClear} className="flex-1 rounded-lg h-8 text-xs">
      Clear
    </Button>
  </div>


</div>
          </div>
        </div>
      </div>

      {/* Quick-select saved periods */}
      {isLoading && (
        <div className="flex gap-2 px-1">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-6 w-28 rounded-full bg-muted animate-pulse" />
          ))}
        </div>
      )}

      {!isLoading && savedPeriods.length > 0 && (
        <div className="space-y-1 px-1">
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">
            Quick Select
          </p>
          <div className="flex flex-wrap gap-1.5">
            {savedPeriods.map(period => {
              const selected = isPeriodSelected(period)
              return (
                <button
                  key={period.id}
                  type="button"
                  onClick={() =>
                    onChange({ from: parseISO(period.startDate), to: parseISO(period.endDate) })
                  }
                  className={cn(
                    'flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-medium transition-all',
                    selected
                      ? 'border-primary bg-primary/5 text-primary'
                      : 'border-border text-muted-foreground hover:border-primary/40 hover:text-foreground hover:bg-muted/40',
                  )}
                >
                  <CalendarIcon className="h-3 w-3 shrink-0" />
                  {format(parseISO(period.startDate), 'MMM d')} –{' '}
                  {format(parseISO(period.endDate), 'MMM d, yyyy')}
                  <span className={cn(
                    'px-1 py-0.5 rounded text-[10px] font-bold',
                    period.ruleType === 'slab'
                      ? 'bg-orange-100 text-orange-700 dark:bg-orange-950/40 dark:text-orange-400'
                      : 'bg-green-100 text-green-700 dark:bg-green-950/40 dark:text-green-400',
                  )}>
                    {period.ruleType === 'slab' ? 'S' : 'B'}
                  </span>
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
