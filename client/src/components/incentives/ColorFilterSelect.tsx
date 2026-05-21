import { useState, useRef, useEffect } from 'react'
import { ChevronDown, Check } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface ColorOption {
  label: string
  value: string
  dot?: string  // tailwind bg-* class for the colored dot
}

interface ColorFilterSelectProps {
  value: string
  onChange: (v: string) => void
  options: ColorOption[]
}

export function ColorFilterSelect({ value, onChange, options }: ColorFilterSelectProps) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const selected = options.find((o) => o.value === value) ?? options[0]
  const isActive = value !== '' && value !== 'all'

  useEffect(() => {
    function onOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onOutside)
    return () => document.removeEventListener('mousedown', onOutside)
  }, [])

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={cn(
          'flex items-center gap-1.5 w-full px-2.5 py-1.5 rounded-lg text-[11px] font-medium border transition-all duration-150 whitespace-nowrap',
          isActive
            ? 'border-primary/50 bg-primary/5 text-primary dark:bg-primary/10 shadow-sm'
            : 'border-border/60 bg-background text-foreground hover:border-primary/30 hover:bg-muted/30',
        )}
      >
        {selected.dot && (
          <span className={cn('w-2 h-2 rounded-full flex-shrink-0', selected.dot)} />
        )}
        <span className="truncate">{selected.label}</span>
        <ChevronDown
          className={cn(
            'w-3 h-3 ml-auto flex-shrink-0 text-muted-foreground transition-transform duration-150',
            open && 'rotate-180',
          )}
        />
      </button>

      {open && (
        <div className="absolute top-full left-0 mt-1 z-50 min-w-full bg-card border border-border rounded-xl shadow-xl overflow-hidden">
          {options.map((opt) => {
            const isSelected = opt.value === value
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => { onChange(opt.value); setOpen(false) }}
                className={cn(
                  'flex items-center gap-2 w-full px-3 py-2 text-[11px] text-left transition-colors',
                  isSelected
                    ? 'bg-primary text-primary-foreground font-semibold'
                    : 'text-foreground hover:bg-accent hover:text-accent-foreground',
                )}
              >
                {opt.dot && (
                  <span
                    className={cn(
                      'w-2 h-2 rounded-full flex-shrink-0',
                      isSelected ? 'bg-white/80' : opt.dot,
                    )}
                  />
                )}
                <span>{opt.label}</span>
                {isSelected && <Check className="w-3 h-3 ml-auto flex-shrink-0" />}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
