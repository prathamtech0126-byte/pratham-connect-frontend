import { cn } from '@/lib/utils'

interface EligibilityPillProps {
  eligible: boolean
}

export function EligibilityPill({ eligible }: EligibilityPillProps) {
  return (
    <span
      className={cn(
        'inline-block px-5 py-1 rounded-full text-xs font-semibold',
        eligible
          ? 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400'
          : 'bg-red-100 text-red-500 dark:bg-red-900/30 dark:text-red-400'
      )}
    >
      {eligible ? 'Yes' : 'No'}
    </span>
  )
}
