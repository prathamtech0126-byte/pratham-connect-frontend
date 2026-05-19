import { Check } from 'lucide-react'
import { cn } from '@/lib/utils'

const DEFAULT_STEPS = [
  { n: 1, label: 'Period' },
  { n: 2, label: 'Sale Types' },
  { n: 3, label: 'Rule Type' },
  { n: 4, label: 'Configure' },
]

export type StepperStep = { n: number; label: string }

interface Props {
  currentStep: number
  onStepClick: (step: number) => void
  /** When omitted, uses the legacy period-first 4-step labels */
  steps?: StepperStep[]
}

export function StepperHeader({ currentStep, onStepClick, steps = DEFAULT_STEPS }: Props) {
  return (
    <div className="flex items-start w-full mb-5">
      {steps.map((step, idx) => {
        const isCompleted = step.n < currentStep
        const isActive = step.n === currentStep
        const isFuture = step.n > currentStep

        return (
          <div key={step.n} className="flex items-center flex-1 last:flex-none">
            <div className="flex flex-col items-center">
              <button
                onClick={() => isCompleted && onStepClick(step.n)}
                disabled={!isCompleted}
                className={cn(
                  'w-9 h-9 rounded-full flex items-center justify-center text-sm font-semibold border-2 transition-colors',
                  isCompleted && 'bg-primary border-primary text-primary-foreground cursor-pointer hover:opacity-80',
                  isActive && 'bg-primary border-primary text-primary-foreground cursor-default',
                  isFuture && 'bg-background border-muted-foreground/30 text-muted-foreground cursor-default',
                )}
              >
                {isCompleted ? <Check className="w-4 h-4" /> : step.n}
              </button>
              <span
                className={cn(
                  'mt-1.5 text-xs font-medium whitespace-nowrap',
                  isCompleted || isActive ? 'text-primary' : 'text-muted-foreground',
                )}
              >
                {step.label}
              </span>
            </div>

            {idx < steps.length - 1 && (
              <div
                className={cn(
                  'h-0.5 flex-1 mx-2 mb-5 transition-colors',
                  isCompleted ? 'bg-primary' : 'bg-muted-foreground/20',
                )}
              />
            )}
          </div>
        )
      })}
    </div>
  )
}
