import Calendar from 'react-calendar';
import { cn } from '@/lib/utils';
import { ChevronLeft, ChevronRight } from 'lucide-react';

type ValuePiece = Date | null;
type Value = ValuePiece | [ValuePiece, ValuePiece];

interface SimpleCalendarProps {
  className?: string;
  value?: Value;
  onChange?: (value: Value) => void;
  selectRange?: boolean;
  showDoubleView?: boolean;
}

export function SimpleCalendar({ className, value, onChange, selectRange = false, showDoubleView = false }: SimpleCalendarProps) {
  return (
    <div className={cn("p-3 bg-white rounded-lg shadow-sm border", className)}>
      <Calendar 
        onChange={onChange} 
        value={value}
        selectRange={selectRange}
        showDoubleView={showDoubleView}
        className="w-full border-none font-sans"
        tileClassName={({ activeStartDate, date, view }) => 
          cn(
            "rounded-md hover:bg-gray-100 focus:bg-gray-100 transition-colors text-sm p-2 font-medium text-gray-700",
            view === 'month' && "aspect-square flex items-center justify-center"
          )
        }
        navigationLabel={({ date, label, locale, view }) => (
            <span className="text-sm font-semibold text-gray-900">{label}</span>
        )}
        nextLabel={<ChevronRight className="h-4 w-4 text-gray-500" />}
        prevLabel={<ChevronLeft className="h-4 w-4 text-gray-500" />}
        next2Label={null}
        prev2Label={null}
      />
      <style>{`
        .react-calendar {
            width: 280px;
            max-width: 100%;
            background: white;
            border: none;
            font-family: inherit;
        }
        .react-calendar--doubleView {
            width: 580px;
        }
        .react-calendar--doubleView .react-calendar__viewContainer {
            display: flex;
            margin: -0.5em;
        }
        .react-calendar--doubleView .react-calendar__viewContainer > * {
            width: 50%;
            margin: 0.5em;
        }
        .react-calendar__navigation {
            display: flex;
            height: 40px;
            margin-bottom: 0.5em;
        }
        .react-calendar__navigation button {
            min-width: 40px;
            background: none;
            font-size: 14px;
            margin-top: 4px;
        }
        .react-calendar__navigation button:disabled {
            background-color: #f0f0f0;
        }
        .react-calendar__navigation button:enabled:hover,
        .react-calendar__navigation button:enabled:focus {
            background-color: #f3f4f6;
            border-radius: 6px;
        }
        .react-calendar__month-view__weekdays {
            text-align: center;
            text-transform: uppercase;
            font-weight: bold;
            font-size: 0.7em;
            color: #6b7280;
            text-decoration: none;
            margin-bottom: 0.25em;
        }
        .react-calendar__month-view__days__day {
            padding: 6px;
            font-size: 0.85em;
        }
        .react-calendar__month-view__days__day--weekend {
            color: inherit;
        }
        .react-calendar__tile {
            max-width: 100%;
            text-align: center;
            padding: 6px 4px;
            background: none;
        }
        .react-calendar__tile--now {
            background: #fef3c7;
            color: #d97706;
            border-radius: 6px;
        }
        .react-calendar__tile--now:enabled:hover,
        .react-calendar__tile--now:enabled:focus {
            background: #fde68a;
        }
        .react-calendar__tile--active {
            background: #2563eb !important;
            color: white !important;
            border-radius: 6px;
        }
        .react-calendar__tile--active:enabled:hover,
        .react-calendar__tile--active:enabled:focus {
            background: #1d4ed8 !important;
        }
        abbr[title] {
            text-decoration: none;
        }
      `}</style>
    </div>
  );
}
