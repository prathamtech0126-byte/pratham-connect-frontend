import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import type { IncentiveInfo, IncentiveSlab, IncentiveTier } from '@/api/incentives.api'

interface Props {
  open: boolean
  onClose: () => void
  info: IncentiveInfo | undefined
}

function SlabTable({ slabs }: { slabs: IncentiveSlab[] }) {
  return (
    <ul className="mt-2 space-y-1">
      {slabs.map((s, i) => (
        <li key={i} className="flex items-center gap-2 rounded-md bg-muted/50 px-3 py-1.5 text-sm">
          <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
          {s.label}
        </li>
      ))}
    </ul>
  )
}

function TierTable({ tiers }: { tiers: IncentiveTier[] }) {
  return (
    <ul className="mt-2 space-y-1">
      {tiers.map((t, i) => (
        <li key={i} className="flex items-center gap-2 rounded-md bg-muted/50 px-3 py-1.5 text-sm">
          <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
          {t.label}
        </li>
      ))}
    </ul>
  )
}

function Section({
  title,
  badge,
  basis,
  description,
  children,
}: {
  title: string
  badge?: string
  basis: string
  description: string
  children: React.ReactNode
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-4 space-y-2">
      <div className="flex items-center gap-2">
        <h3 className="font-semibold text-foreground">{title}</h3>
        {badge && (
          <Badge variant="secondary" className="text-[10px] uppercase tracking-wide">
            {badge}
          </Badge>
        )}
      </div>
      <p className="text-xs text-muted-foreground">
        <span className="font-medium text-foreground/70">Basis: </span>{basis}
      </p>
      <p className="text-xs text-muted-foreground">{description}</p>
      {children}
    </div>
  )
}
export function IncentiveInfoModal({ open, onClose, info }: Props) {
  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-2xl max-h-[85vh] p-0 overflow-hidden">

        {/* 🔥 Sticky Header */}
        <div className="sticky top-0 z-10 bg-background border-b px-6 py-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">
            Incentive Rule Overview
          </h2>

          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground text-lg"
          >
            ✕
          </button>
        </div>

        {/* 📜 Scrollable Content */}
        <div className="overflow-y-auto max-h-[calc(85vh-64px)] px-6 py-4">
          {!info ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No incentive rule information available.
            </p>
          ) : (
            <div className="space-y-4">
              {info.spouse && (
                <Section
                  title="Spouse Incentive"
                  badge="spouse"
                  basis={info.spouse.basis}
                  description={info.spouse.description}
                >
                  <SlabTable slabs={info.spouse.slabs} />
                </Section>
              )}

              {info.visitor && (
                <Section
                  title="Visitor Incentive"
                  badge="visitor"
                  basis={info.visitor.basis}
                  description={info.visitor.description}
                >
                  <TierTable tiers={info.visitor.tiers} />
                </Section>
              )}

              {info.student && (
                <Section
                  title="Student Incentive"
                  badge="student"
                  basis={info.student.basis}
                  description={info.student.description}
                >
                  <SlabTable slabs={info.student.slabs} />

                  {info.student.canadaBonus && (
                    <div className="mt-3 rounded-lg border border-border bg-muted/30 p-3 space-y-1">
                      <p className="text-xs font-semibold text-foreground/80">
                        Canada Bonus
                      </p>
                      <p className="text-xs text-muted-foreground">
                        <span className="font-medium text-foreground/70">Basis: </span>
                        {info.student.canadaBonus.basis}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {info.student.canadaBonus.description}
                      </p>
                      <SlabTable slabs={info.student.canadaBonus.slabs} />
                    </div>
                  )}
                </Section>
              )}

              {info.financeBonus && (
                <Section
                  title="Finance Bonus"
                  badge="all types"
                  basis={info.financeBonus.basis}
                  description={info.financeBonus.description}
                >
                  <SlabTable slabs={info.financeBonus.slabs} />
                </Section>
              )}
            </div>
          )}
        </div>

      </DialogContent>
    </Dialog>
  )
}

