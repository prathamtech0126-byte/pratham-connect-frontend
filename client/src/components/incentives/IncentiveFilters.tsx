import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Search, Download, Loader2 } from 'lucide-react'

interface IncentiveFiltersProps {
  search: string
  onSearchChange: (v: string) => void
  onExport: () => void
  isExporting: boolean
}

export function IncentiveFilters({
  search,
  onSearchChange,
  onExport,
  isExporting,
}: IncentiveFiltersProps) {
  return (
    <div className="rounded-xl border border-border bg-card shadow-subtle">
      <div className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:flex-wrap sm:items-center">

        {/* Search — full width on mobile */}
        <div className="relative w-full sm:min-w-[200px] sm:flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search client name or ID…"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-9 h-9 bg-background"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:ml-auto">
          <Button
            variant="outline"
            size="sm"
            className="h-9 gap-2"
            onClick={onExport}
            disabled={isExporting}
          >
            {isExporting
              ? <Loader2 className="h-4 w-4 animate-spin" />
              : <Download className="h-4 w-4" />}
            Export XL
          </Button>
        </div>
      </div>
    </div>
  )
}
