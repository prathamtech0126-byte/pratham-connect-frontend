import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Search } from 'lucide-react'
import { cn } from '@/lib/utils'

type VisaFilter = 'all' | 'spouse' | 'visitor' | 'student'

interface Counsellor {
  id: string
  name: string
}

interface IncentiveFiltersProps {
  search: string
  onSearchChange: (v: string) => void
  visaType: VisaFilter
  onVisaTypeChange: (v: VisaFilter) => void
  counsellorId: string | null
  onCounsellorChange: (id: string | null) => void
  month: string
  onMonthChange: (m: string) => void
  counsellors: Counsellor[]
}

const VISA_TABS: { label: string; value: VisaFilter }[] = [
  { label: 'ALL', value: 'all' },
  { label: 'Spouse', value: 'spouse' },
  { label: 'Visitor', value: 'visitor' },
  { label: 'Student', value: 'student' },
]

function getMonthOptions(): { label: string; value: string }[] {
  const options = []
  const now = new Date()
  for (let i = 0; i < 12; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    const label = d.toLocaleString('en-IN', { month: 'long', year: 'numeric' })
    options.push({ value, label })
  }
  return options
}

export function IncentiveFilters({
  search,
  onSearchChange,
  visaType,
  onVisaTypeChange,
  counsellorId,
  onCounsellorChange,
  month,
  onMonthChange,
  counsellors,
}: IncentiveFiltersProps) {
  const monthOptions = getMonthOptions()

  return (
    <div className="px-4 py-3 flex flex-wrap gap-3 items-center border-b border-border/60">
      <div className="relative flex-1 min-w-[180px]">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search client name or ID..."
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-9"
        />
      </div>

      <div className="flex rounded-md border border-border overflow-hidden">
        {VISA_TABS.map((tab) => (
          <button
            key={tab.value}
            type="button"
            onClick={() => onVisaTypeChange(tab.value)}
            className={cn(
              'px-3 py-1.5 text-xs font-semibold transition-colors',
              visaType === tab.value
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:bg-muted',
              tab.value !== 'all' && 'border-l border-border'
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <Select
        value={counsellorId ?? 'all'}
        onValueChange={(v) => onCounsellorChange(v === 'all' ? null : v)}
      >
        <SelectTrigger className="w-[160px]">
          <SelectValue placeholder="All Counsellors" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Counsellors</SelectItem>
          {counsellors.map((c) => (
            <SelectItem key={c.id} value={c.id}>
              {c.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={month} onValueChange={onMonthChange}>
        <SelectTrigger className="w-[160px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {monthOptions.map((opt) => (
            <SelectItem key={opt.value} value={opt.value}>
              {opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
