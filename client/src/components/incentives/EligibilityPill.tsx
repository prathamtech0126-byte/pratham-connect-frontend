import { cn } from '@/lib/utils'

interface EligibilityPillProps {
  eligible: boolean
  onChange: (eligible: boolean) => void
  disabled?: boolean
}

export function EligibilityPill({ eligible, onChange, disabled = false }: EligibilityPillProps) {
  return (
    <button
      type="button"
      onClick={() => !disabled && onChange(!eligible)}
      disabled={disabled}
      className={cn(
        'inline-block px-5 py-1 rounded-full text-xs font-semibold transition-colors cursor-pointer',
        eligible
          ? 'bg-green-100 text-green-600 hover:bg-green-200 dark:bg-green-900/30 dark:text-green-400'
          : 'bg-red-100 text-red-500 hover:bg-red-200 dark:bg-red-900/30 dark:text-red-400',
        disabled && 'cursor-not-allowed opacity-50'
      )}
    >
      {eligible ? 'Yes' : 'No'}
    </button>
  )
}
