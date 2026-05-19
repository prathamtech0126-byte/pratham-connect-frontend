import { useState, useMemo, useEffect } from 'react'
import { useToast } from '@/hooks/use-toast'
import {
  ChevronDown,
  TrendingUp,
  Banknote,
  LayoutGrid,
  Users,
  CheckCircle2,
  XCircle,
  CalendarDays,
  Info,
  X,
  Pencil,
  ArrowLeftRight,
} from 'lucide-react'
import { format, parseISO, isValid } from 'date-fns'
import { useQuery } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import api from '@/lib/api'
import { useAuth } from '@/context/auth-context'
import { cn } from '@/lib/utils'
import {
  formatIncentiveSaleTypeDisplay,
  type IncentiveRow,
  type ReportCoreSale,
  type ReportAllFinance,
  type ReportOtherProducts,
} from '@/api/incentives.api'

interface ClientBreakdown {
  clientId: string
  clientName: string
  enrollmentDate: string
  saleType: string
  saleTypeName?: string
  saleTypeIsNull?: boolean
  isSharedClient?: boolean
  remark?: string | null
  /** Report `receivedAmount` when `coreSale.items` is empty */
  receivedAmount: number
  status: string
  totalIncentive: number
  /** Positive amount additionally added over section-wise computed sum. */
  extraAddedAmount?: number
  overrideByUserId?: number | null
  eligible: boolean
  coreSale: ReportCoreSale
  allFinance: ReportAllFinance
  otherProducts: ReportOtherProducts
}

interface CounsellorGroup {
  counsellorName: string
  totalReceived: number
  totalIncentive: number
  eligibleCount: number
  pendingCount: number
  clients: ClientBreakdown[]
}

type IncentiveSelectionPreviewItem = {
  section: 'Core Sale' | 'All Finance' | 'Other Products'
  label: string
  selected: boolean
}

type IncentiveSelectionPreview = {
  incentiveAmount: number
  items: IncentiveSelectionPreviewItem[]
  hasCustomSelection: boolean
}

// ─── Derive groups from flat rows ─────────────────────────────────────────────

function buildGroups(rows: IncentiveRow[]): CounsellorGroup[] {
  const map = new Map<string, CounsellorGroup>()

  for (const row of rows) {
    if (!map.has(row.counsellorName)) {
      map.set(row.counsellorName, {
        counsellorName: row.counsellorName,
        totalReceived: 0,
        totalIncentive: 0,
        eligibleCount: 0,
        pendingCount: 0,
        clients: [],
      })
    }
    const g = map.get(row.counsellorName)!
    g.totalReceived += row.amount
    g.totalIncentive += row.incentiveAmount
    if (row.eligible) g.eligibleCount++
    if (row.status === 'Pending') g.pendingCount++

    // When the backend sends per-section override amounts, use them directly so each card
    // shows the correct amount. Fall back to the delta-on-coreSale approach only when no
    // per-section overrides are present (legacy / unoverridden rows).
    const hasPerSectionOverrides =
      typeof row.overrideCoreSale === 'number' ||
      typeof row.overrideAllFinance === 'number' ||
      typeof row.overrideOtherProducts === 'number'

    let displayCoreSaleIncentive: number
    let displayAllFinanceIncentive: number
    let displayOtherProductsIncentive: number
    let extraAddedAmount: number | undefined

    if (hasPerSectionOverrides) {
      displayCoreSaleIncentive = row.overrideCoreSale ?? row.coreSale.incentive
      displayAllFinanceIncentive = row.overrideAllFinance ?? row.allFinance.incentive
      displayOtherProductsIncentive = row.overrideOtherProducts ?? row.otherProducts.incentive
    } else {
      const sectionTotal =
        row.coreSale.incentive + row.allFinance.incentive + row.otherProducts.incentive
      const delta = row.incentiveAmount - sectionTotal
      // Do NOT add delta to Core Sale — it belongs to a manual override, not a specific section
      displayCoreSaleIncentive = row.coreSale.incentive
      displayAllFinanceIncentive = row.allFinance.incentive
      displayOtherProductsIncentive = row.otherProducts.incentive
      if (delta > 0) extraAddedAmount = delta
    }

    g.clients.push({
      clientId: row.clientId,
      clientName: row.clientName,
      enrollmentDate: row.enrollmentDate,
      saleType: row.saleType,
      saleTypeName: row.saleTypeName,
      saleTypeIsNull: row.saleTypeIsNull,
      isSharedClient: row.isSharedClient || undefined,
      remark: row.remark ?? null,
      receivedAmount: row.amount,
      status: row.status,
      totalIncentive: row.incentiveAmount,
      extraAddedAmount,
      overrideByUserId: row.overrideByUserId ?? null,
      eligible: row.eligible,
      coreSale: {
        ...row.coreSale,
        incentive: displayCoreSaleIncentive,
      },
      allFinance: {
        ...row.allFinance,
        incentive: displayAllFinanceIncentive,
      },
      otherProducts: {
        ...row.otherProducts,
        incentive: displayOtherProductsIncentive,
      },
    })
  }

  return Array.from(map.values()).sort((a, b) =>
    a.counsellorName.localeCompare(b.counsellorName),
  )
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt(n: number) {
  return `₹${n.toLocaleString('en-IN')}`
}

function fmtDate(dateStr: string) {
  try {
    const d = parseISO(dateStr)
    return isValid(d) ? format(d, 'd MMM yyyy') : dateStr
  } catch {
    return dateStr
  }
}

function withPaymentDateLabel(label: string, paymentDate?: string | null): string {
  if (!paymentDate || !String(paymentDate).trim()) return label
  return `${label} (${fmtDate(paymentDate)})`
}

function paymentSubtitle(paymentDate?: string | null): string | undefined {
  if (!paymentDate || !String(paymentDate).trim()) return undefined
  return fmtDate(paymentDate)
}

function resolveAllFinancePaymentDate(allFinance: ReportAllFinance): string | undefined {
  const direct = allFinance.paymentDate
  if (typeof direct === 'string' && direct.trim()) return direct
  const payments = Array.isArray(allFinance.payments) ? allFinance.payments : []
  for (const payment of payments) {
    if (typeof payment?.paymentDate === 'string' && payment.paymentDate.trim()) {
      return payment.paymentDate
    }
    const entityDate = payment?.entity?.paymentDate
    if (typeof entityDate === 'string' && entityDate.trim()) {
      return entityDate
    }
  }
  return undefined
}

/** Which payment rows sum exactly to `total` (smallest subset wins; then lowest bitmask). */
function labelsSummingToTotal(
  items: { label: string; amount: number }[],
  total: number,
): string[] | null {
  const n = items.length
  if (n === 0 || !Number.isFinite(total)) return null
  const target = Math.round(total)
  const amounts = items.map((i) => Math.round(i.amount))
  if (n > 20) return null

  let bestIdxs: number[] | null = null
  let bestSize = Infinity
  let bestMask = Infinity

  for (let mask = 1; mask < 1 << n; mask++) {
    let sum = 0
    const idxs: number[] = []
    for (let i = 0; i < n; i++) {
      if (mask & (1 << i)) {
        sum += amounts[i]!
        idxs.push(i)
      }
    }
    if (sum !== target || idxs.length === 0) continue
    if (idxs.length < bestSize || (idxs.length === bestSize && mask < bestMask)) {
      bestSize = idxs.length
      bestMask = mask
      bestIdxs = idxs
    }
  }

  if (!bestIdxs) return null
  return bestIdxs.map((i) => items[i]!.label)
}

function buildIncentiveEligibleAmountLabel(
  ruleDetail: { basisPayments?: string[]; basis_payments?: string[] } | undefined,
  stageItems: { label: string; amount: number }[],
  counsellorTotal: number | undefined,
): string {
  const raw = ruleDetail?.basisPayments ?? ruleDetail?.basis_payments
  const fromApi = raw?.filter((s) => typeof s === 'string' && s.trim().length > 0)
  if (fromApi?.length) {
    return `Incentive Eligible Amount (${fromApi.join(', ')})`
  }
  if (counsellorTotal != null && stageItems.length > 0) {
    const resolved = labelsSummingToTotal(stageItems, counsellorTotal)
    if (resolved?.length) {
      return `Incentive Eligible Amount (${resolved.join(', ')})`
    }
  }
  return 'Incentive Eligible Amount'
}

function sumItemAmounts(items: { amount: number }[]): number {
  return items.reduce((s, i) => s + (Number.isFinite(i.amount) ? i.amount : 0), 0)
}

/** Receipt total for label/value: prefer API `counsellorTotal`, else sum of payment rows, else report `receivedAmount`. */
function coreIncentiveEligibleBasis(
  ruleDetail: { counsellorTotal?: number } | undefined,
  items: { label: string; amount: number }[],
  receivedFallback: number,
): number | undefined {
  if (ruleDetail?.counsellorTotal != null && Number.isFinite(ruleDetail.counsellorTotal)) {
    return ruleDetail.counsellorTotal
  }
  if (items.length > 0) return sumItemAmounts(items)
  if (receivedFallback > 0) return receivedFallback
  return undefined
}

/** Rows used to resolve payment names on the incentive line when `items` is empty but `receivedAmount` is set. */
function coreItemsForEligibleLabel(client: ClientBreakdown): { label: string; amount: number }[] {
  if (client.coreSale.items.length > 0) return client.coreSale.items
  if (client.receivedAmount > 0) return [{ label: 'Received amount', amount: client.receivedAmount }]
  return []
}

function financeIncentiveEligibleBasis(
  ruleDetail: { counsellorTotal?: number } | undefined,
  allFinance: ReportAllFinance,
): number | undefined {
  if (ruleDetail?.counsellorTotal != null && Number.isFinite(ruleDetail.counsellorTotal)) {
    return ruleDetail.counsellorTotal
  }
  const items = allFinance.items ?? []
  if (items.length > 0) return sumItemAmounts(items)
  if (allFinance.amount > 0) return allFinance.amount
  return undefined
}

function getInitials(name: string) {
  const parts = name.trim().split(/\s+/)
  if (parts.length === 1) return (parts[0][0] ?? '?').toUpperCase()
  return (parts[0][0]! + parts[parts.length - 1][0]!).toUpperCase()
}

const SALE_BADGE: Record<string, string> = {
  spouse:         'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
  visitor:        'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
  student:        'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  other_products: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function EligibleChip({ eligible }: { eligible: boolean }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full flex-shrink-0',
        eligible
          ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
          : 'bg-red-100 text-red-500 dark:bg-red-900/30 dark:text-red-400',
      )}
    >
      <span className={cn('w-1.5 h-1.5 rounded-full', eligible ? 'bg-green-500' : 'bg-red-400')} />
      {eligible ? 'Eligible' : 'Not Eligible'}
    </span>
  )
}

// ─── Info Popup ───────────────────────────────────────────────────────────────

function InfoPopup({
  title,
  onClose,
  children,
}: {
  title: string
  onClose: () => void
  children: React.ReactNode
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
      <div
        className="relative z-10 w-full max-w-sm rounded-2xl border border-border bg-card shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-border/60">
          <span className="text-sm font-semibold text-foreground">{title}</span>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="px-4 py-4 space-y-3 text-sm">{children}</div>
      </div>
    </div>
  )
}

function InfoRow({ label, value, highlight }: { label: string; value: React.ReactNode; highlight?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <span className="text-xs text-muted-foreground leading-5">{label}</span>
      <span className={cn('text-xs font-semibold text-right leading-5', highlight ? 'text-primary' : 'text-foreground')}>
        {value}
      </span>
    </div>
  )
}

// ─── Breakdown Card ───────────────────────────────────────────────────────────

function BreakdownCard({
  title,
  icon,
  children,
  incentive,
  eligible,
  footerLabel = 'Incentive',
  onInfo,
  onEdit,
  footerAddon,
}: {
  title: string
  icon: React.ReactNode
  children: React.ReactNode
  incentive: number
  eligible?: boolean
  footerLabel?: string
  onInfo?: () => void
  onEdit?: () => void
  footerAddon?: React.ReactNode
}) {
  return (
    <div className="flex-1 min-w-[200px] rounded-xl border border-border bg-card shadow-sm flex flex-col">
      {/* Card header */}
      <div className="flex items-center gap-2 px-4 pt-4 pb-3 border-b border-border/50">
        <span className="flex items-center justify-center w-7 h-7 rounded-lg bg-primary/10 text-primary">
          {icon}
        </span>
        <span className="text-xs font-semibold text-foreground uppercase tracking-wide flex-1">{title}</span>
        {onInfo && (
          <button
            type="button"
            onClick={onInfo}
            className="rounded-md p-1 text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
            title="Why this eligibility?"
          >
            <Info className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Card body */}
      <div className="px-4 py-3 space-y-2 flex-1">{children}</div>

      {/* Card footer */}
      <div className="px-4 py-3 border-t border-border/50 bg-muted/30 rounded-b-xl flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 flex-1 items-center gap-2 flex-wrap">
          {eligible !== undefined ? (
            <EligibleChip eligible={eligible} />
          ) : (
            <span className="text-[10px] text-muted-foreground font-medium">{footerLabel}</span>
          )}
          {footerAddon}
        </div>
        <div className="flex items-center gap-1 self-end sm:self-auto sm:ml-auto flex-shrink-0">
          <span className={cn('text-sm font-bold tabular-nums', incentive > 0 ? 'text-primary' : 'text-muted-foreground')}>
            {fmt(incentive)}
          </span>
          {onEdit && (
            <button
              type="button"
              onClick={onEdit}
              className="rounded-md p-1 text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
              title="Edit incentive amount"
            >
              <Pencil className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

function AmountRow({
  label,
  amount,
  subtitle,
  selectable,
  checked,
  onCheckedChange,
}: {
  label: string
  amount: number
  subtitle?: string
  selectable?: boolean
  checked?: boolean
  onCheckedChange?: (checked: boolean) => void
}) {
  return (
    <div className="flex items-center justify-between gap-2">
      <div className="flex min-w-0 items-center gap-2">
        {selectable ? (
          <input
            type="checkbox"
            className="h-4 w-4 rounded border-border"
            checked={Boolean(checked)}
            onChange={(e) => onCheckedChange?.(e.target.checked)}
            aria-label={`Select ${label}`}
          />
        ) : null}
        <span className="min-w-0">
          <span className="block truncate text-xs text-muted-foreground">{label}</span>
          {subtitle ? (
            <span className="mt-0.5 block text-[10px] text-muted-foreground/80">{subtitle}</span>
          ) : null}
        </span>
      </div>
      <span className="text-xs font-medium text-foreground tabular-nums">{fmt(amount)}</span>
    </div>
  )
}

// ─── Edit Amount Modal ────────────────────────────────────────────────────────

type IncentiveSection = 'coreSale' | 'allFinance' | 'otherProducts'

const SECTION_LABELS: Record<IncentiveSection, string> = {
  coreSale: 'Core Sale',
  allFinance: 'All Finance',
  otherProducts: 'Other Products',
}

function EditAmountModal({
  open,
  onClose,
  onSave,
  section,
  currentAmount,
  clientName,
}: {
  open: boolean
  onClose: () => void
  onSave: (amount: number, remark: string) => void
  section: IncentiveSection | null
  currentAmount: number
  clientName: string
}) {
  const [amount, setAmount] = useState(String(currentAmount))
  const [remark, setRemark] = useState('')

  useEffect(() => {
    if (open) {
      setAmount(String(currentAmount))
      setRemark('')
    }
  }, [open, currentAmount])

  const parsed = Number(amount)
  const isValid = Number.isFinite(parsed) && parsed >= 0
  const canSave = isValid && remark.trim().length > 0

  return (
    <Dialog open={open} onOpenChange={(isOpen) => { if (!isOpen) onClose() }}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10">
              <Pencil className="h-4 w-4 text-primary" />
            </div>
            <DialogTitle className="font-heading text-base">
              Edit {section ? SECTION_LABELS[section] : ''} Amount
            </DialogTitle>
          </div>
        </DialogHeader>

        <div className="rounded-lg border border-border bg-muted/30 px-4 py-2.5 text-sm">
          <span className="text-muted-foreground">Client: </span>
          <span className="font-medium text-foreground">{clientName}</span>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="edit-section-amount" className="text-sm font-medium">
            {section ? SECTION_LABELS[section] : 'Incentive'} Amount <span className="text-destructive">*</span>
          </Label>
          <Input
            id="edit-section-amount"
            type="number"
            min="0"
            step="1"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            onFocus={(e) => e.target.select()}
            autoFocus
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="edit-section-remark" className="text-sm font-medium">
            Remark <span className="text-destructive">*</span>
          </Label>
          <Textarea
            id="edit-section-remark"
            placeholder="Provide a reason for editing the amount…"
            value={remark}
            onChange={(e) => setRemark(e.target.value)}
            rows={3}
            className="resize-none"
          />
        </div>

        <DialogFooter className="gap-2 pt-2">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={() => onSave(parsed, remark.trim())} disabled={!canSave}>
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ─── Client accordion ─────────────────────────────────────────────────────────

function ClientRow({
  client,
  onApprove,
  onReject,
  onPending,
  onEditAmount,
  overrideUserNameById,
  canEditNonPendingStatus = false,
  onViewBreakdown,
  breakdown,
  breakdownSelection,
  isBreakdownActionLoading = false,
  onToggleBreakdownSelection,
  onChangeBreakdownStatus,
  onApproveSelectedBreakdowns,
  isSelected,
  onToggleSelect,
}: {
  client: ClientBreakdown
  onApprove: (preview: IncentiveSelectionPreview) => void
  onReject: (preview: IncentiveSelectionPreview) => void
  onPending?: () => void
  onEditAmount?: (clientId: string, section: IncentiveSection, amount: number, remark: string) => void
  overrideUserNameById: Record<number, string>
  canEditNonPendingStatus?: boolean
  onViewBreakdown?: (recordId: number) => void
  breakdown?: { loading: boolean; data: Array<{ breakdown_id: number; status: string; [key: string]: unknown }> }
  breakdownSelection?: Record<number, { selected: boolean; status: 'APPROVED' | 'REJECTED' | 'PENDING' }>
  isBreakdownActionLoading?: boolean
  onToggleBreakdownSelection?: (breakdownId: number, checked: boolean) => void
  onChangeBreakdownStatus?: (breakdownId: number, status: 'APPROVED' | 'REJECTED' | 'PENDING') => void
  onApproveSelectedBreakdowns?: () => void
  isSelected?: boolean
  onToggleSelect?: (checked: boolean) => void
}) {
  const [open, setOpen] = useState(false)
  const [isEditingStatus, setIsEditingStatus] = useState(false)
  const [editSection, setEditSection] = useState<IncentiveSection | null>(null)
  const [paymentSelection, setPaymentSelection] = useState<Record<string, boolean>>({})
  const [remarkOpen, setRemarkOpen] = useState(false)
  const { toast } = useToast()
  const { user } = useAuth()
  const currentUserId = Number(user?.id)
  const [infoCard, setInfoCard] = useState<'coreSale' | 'allFinance' | 'otherProducts' | null>(null)

  const normalizedStatus = client.status.trim().toLowerCase()
  const statusLabel = normalizedStatus
    ? `${normalizedStatus.charAt(0).toUpperCase()}${normalizedStatus.slice(1)}`
    : 'Unknown'

  const isPaymentChecked = (key: string, defaultValue: boolean): boolean =>
    Object.prototype.hasOwnProperty.call(paymentSelection, key)
      ? Boolean(paymentSelection[key])
      : defaultValue

  const coreDefaultOn = client.coreSale.eligible || client.coreSale.incentive > 0
  const coreSelected =
    client.coreSale.items.length > 0
      ? client.coreSale.items.some((item, idx) =>
        isPaymentChecked(`coreSale:${item.label}:${idx}`, coreDefaultOn))
      : client.receivedAmount > 0
        ? isPaymentChecked('coreSaleFallback', coreDefaultOn)
        : client.coreSale.incentive > 0

  const allFinanceDefaultOn = client.allFinance.eligible || client.allFinance.incentive > 0
  const allFinanceSelected =
    client.allFinance.items && client.allFinance.items.length > 0
      ? client.allFinance.items.some((item, idx) =>
        isPaymentChecked(`allFinance:${item.label}:${idx}`, allFinanceDefaultOn))
      : isPaymentChecked('allFinanceFallback', allFinanceDefaultOn)

  const otherEligibleItems = client.otherProducts.items.filter((p) => p.eligible)
  const selectedOtherEligibleItems = client.otherProducts.items.filter((p, idx) =>
    p.eligible && isPaymentChecked(`otherProducts:${p.name}:${idx}`, true))

  const coreSaleDisplayIncentive = coreSelected ? client.coreSale.incentive : 0
  const allFinanceDisplayIncentive = allFinanceSelected ? client.allFinance.incentive : 0
  const otherProductsDisplayIncentive = (() => {
    if (otherEligibleItems.length === 0) return client.otherProducts.incentive
    const withLineIncentive = otherEligibleItems.every((p) => typeof p.incentive === 'number')
    if (withLineIncentive) {
      return selectedOtherEligibleItems.reduce((sum, p) => sum + Number(p.incentive ?? 0), 0)
    }
    const perItemShare = client.otherProducts.incentive / otherEligibleItems.length
    return Math.max(0, perItemShare * selectedOtherEligibleItems.length)
  })()
  const displayTotalIncentive =
    coreSaleDisplayIncentive + allFinanceDisplayIncentive + otherProductsDisplayIncentive
    + (client.extraAddedAmount ?? 0)
  const hasCustomSelection = Object.keys(paymentSelection).length > 0
  const selectionPreviewItems: IncentiveSelectionPreviewItem[] = [
    ...(client.coreSale.items.length > 0
      ? client.coreSale.items.map((item, idx) => ({
        section: 'Core Sale' as const,
        label: item.label,
        selected: isPaymentChecked(`coreSale:${item.label}:${idx}`, client.coreSale.eligible),
      }))
      : client.receivedAmount > 0
        ? [{
          section: 'Core Sale' as const,
          label: 'Received amount',
          selected: isPaymentChecked('coreSaleFallback', client.coreSale.eligible),
        }]
        : []),
    ...(client.allFinance.items && client.allFinance.items.length > 0
      ? client.allFinance.items.map((item, idx) => ({
        section: 'All Finance' as const,
        label: item.label,
        selected: isPaymentChecked(`allFinance:${item.label}:${idx}`, client.allFinance.eligible),
      }))
      : [{
        section: 'All Finance' as const,
        label: 'Finance Amount',
        selected: isPaymentChecked('allFinanceFallback', client.allFinance.eligible),
      }]),
    ...client.otherProducts.items.map((item, idx) => ({
      section: 'Other Products' as const,
      label: item.name,
      selected: isPaymentChecked(`otherProducts:${item.name}:${idx}`, item.eligible),
    })),
  ]
  const selectionPreview: IncentiveSelectionPreview = {
    incentiveAmount: displayTotalIncentive,
    items: selectionPreviewItems,
    hasCustomSelection,
  }

  return (
    <div
      className={cn(
        'rounded-xl border-l-[3px] border border-border/50 transition-all duration-200',
        open
          ? 'border-l-primary bg-primary/[0.02] border-primary/20 shadow-sm'
          : 'border-l-transparent bg-background hover:border-l-primary/40 hover:bg-muted/20',
      )}
    >
      {/* Client header: toggle is a button; View is a real link (new tab / copy link work). */}
      <div className="flex w-full items-center gap-4 px-4 py-3.5">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="flex min-w-0 flex-1 items-center gap-4 text-left"
        >
          {/* Chevron */}
          <ChevronDown
            className={cn(
              'w-4 h-4 text-muted-foreground flex-shrink-0 transition-transform duration-200',
              !open && '-rotate-90',
            )}
          />

          {/* Initials avatar */}
          <span className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary text-xs font-bold flex-shrink-0 select-none">
            {getInitials(client.clientName)}
          </span>

          {/* Name + date stacked */}
          <div className="flex-1 min-w-0 text-left">
            <div className="flex items-center gap-1.5 min-w-0">
              <p className="font-semibold text-sm text-foreground truncate leading-tight">
                {client.clientName}
              </p>
              {client.isSharedClient && (
                <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300 shrink-0 whitespace-nowrap">
                  <ArrowLeftRight className="w-2.5 h-2.5" />
                  Shared Client
                </span>
              )}
            </div>
            <p className="flex items-center gap-1 text-[11px] text-muted-foreground mt-0.5">
              <CalendarDays className="w-3 h-3 flex-shrink-0" />
              {fmtDate(client.enrollmentDate)}
            </p>
          </div>

          {/* Sale type */}
          <span
            title={formatIncentiveSaleTypeDisplay(client)}
            className={cn(
              'px-2.5 py-1 rounded-full text-[10px] font-semibold tracking-wide flex-shrink-0 max-w-[min(200px,46vw)] truncate',
              (client.saleTypeName?.trim() || (client.saleTypeIsNull && (client.otherProducts?.items?.length ?? 0) > 0)) ? 'normal-case' : 'uppercase',
              SALE_BADGE[
                (client.saleTypeIsNull && (client.otherProducts?.items?.length ?? 0) > 0)
                  ? 'other_products'
                  : client.saleType
              ] ?? 'bg-muted text-muted-foreground',
            )}
          >
            {formatIncentiveSaleTypeDisplay(client)}
          </span>

          {/* Eligibility */}
          <EligibleChip eligible={client.eligible} />

          {/* Incentive amount */}
          <div className="flex-shrink-0 text-right min-w-[64px]">
            <p className="text-[10px] text-muted-foreground leading-tight">Incentive</p>
            <p className={cn(
              'text-sm font-bold tabular-nums leading-tight',
              displayTotalIncentive > 0 ? 'text-primary' : 'text-muted-foreground',
            )}>
              {fmt(displayTotalIncentive)}
            </p>
          </div>
        </button>

        {/* Bulk-select checkbox (pending rows only) */}
        {normalizedStatus === 'pending' && onToggleSelect && (
          <input
            type="checkbox"
            className="h-4 w-4 flex-shrink-0 rounded border-border cursor-pointer"
            checked={Boolean(isSelected)}
            onChange={(e) => onToggleSelect(e.target.checked)}
            onClick={(e) => e.stopPropagation()}
            title="Select for bulk approve"
          />
        )}

        {/* Status / action buttons (sibling of toggle — not nested in <button>) */}
        <div className="flex flex-shrink-0 items-center gap-1.5">
          {client.remark && (
            <button
              type="button"
              onClick={() => setRemarkOpen(true)}
              className="inline-flex h-7 items-center justify-center gap-1 rounded-lg border border-border bg-background px-3 text-[11px] font-semibold text-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
            >
              Remarks
            </button>
          )}
          <a
            href={`/clients/${client.clientId}/view`}
            className={cn(
              'inline-flex h-7 items-center justify-center rounded-lg border border-border bg-background px-3 text-[11px] font-semibold text-foreground',
              'no-underline hover:bg-accent hover:text-accent-foreground',
              'ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
            )}
          >
            View
          </a>
          {normalizedStatus === 'pending' ? (
            <>
              <Button
                size="sm"
                variant="ghost"
                className={cn(
                  'h-7 px-3 text-[11px] font-semibold rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-300 dark:border-emerald-800',
                  displayTotalIncentive === 0 && 'opacity-50 cursor-not-allowed hover:bg-emerald-50 dark:hover:bg-emerald-900/20',
                )}
                onClick={() => {
                  if (displayTotalIncentive === 0) {
                    toast({ title: 'Cannot Approve', description: 'Incentive amount is ₹0.', variant: 'destructive' })
                    return
                  }
                  onApprove(selectionPreview)
                }}
              >
                Approve
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="h-7 px-3 text-[11px] font-semibold rounded-lg bg-red-50 text-red-600 hover:bg-red-100 border border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800"
                onClick={() => onReject(selectionPreview)}
              >
                Reject
              </Button>
            </>
          ) : canEditNonPendingStatus && isEditingStatus ? (
            <>
              {normalizedStatus !== 'approved' && (
                <Button
                  size="sm"
                  variant="ghost"
                  className={cn(
                    'h-7 px-3 text-[11px] font-semibold rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-300 dark:border-emerald-800',
                    displayTotalIncentive === 0 && 'opacity-50 cursor-not-allowed hover:bg-emerald-50 dark:hover:bg-emerald-900/20',
                  )}
                  onClick={() => {
                    if (displayTotalIncentive === 0) {
                      toast({ title: 'Cannot Approve', description: 'Incentive amount is ₹0.', variant: 'destructive' })
                      return
                    }
                    onApprove(selectionPreview)
                  }}
                >
                  Approve
                </Button>
              )}
              {normalizedStatus !== 'rejected' && (
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 px-3 text-[11px] font-semibold rounded-lg bg-red-50 text-red-600 hover:bg-red-100 border border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800"
                  onClick={() => onReject(selectionPreview)}
                >
                  Reject
                </Button>
              )}
              <Button
                size="sm"
                variant="ghost"
                className="h-7 px-3 text-[11px] font-semibold rounded-lg bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200 dark:bg-amber-900/20 dark:text-amber-300 dark:border-amber-800"
                onClick={onPending}
              >
                Pending
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="h-7 px-2.5 text-[11px] font-semibold rounded-lg"
                onClick={() => setIsEditingStatus(false)}
              >
                Cancel
              </Button>
            </>
          ) : normalizedStatus === 'approved' ? (
            <>
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-300 dark:border-emerald-800 flex-shrink-0">
                <CheckCircle2 className="w-3 h-3" />
                Approved
              </span>
              {canEditNonPendingStatus && (
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 px-2.5 text-[11px] font-semibold rounded-lg"
                  onClick={() => setIsEditingStatus(true)}
                >
                  Edit
                </Button>
              )}
            </>
          ) : normalizedStatus === 'rejected' ? (
            <>
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-red-50 text-red-600 border border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800 flex-shrink-0">
                <XCircle className="w-3 h-3" />
                Rejected
              </span>
              {canEditNonPendingStatus && (
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 px-2.5 text-[11px] font-semibold rounded-lg"
                  onClick={() => setIsEditingStatus(true)}
                >
                  Edit
                </Button>
              )}
            </>
          ) : (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-muted text-muted-foreground flex-shrink-0">
              {statusLabel}
            </span>
          )}
        </div>
      </div>

      {/* Breakdown cards */}
      {open && (
        <div className="px-4 pb-4 pt-1">
          {/* Manual override banner — shown when a total override exists but no per-section breakdown */}
          {client.extraAddedAmount && client.extraAddedAmount > 0 ? (
            <div className="mb-3 flex flex-wrap items-center gap-2 rounded-lg border border-primary/20 bg-primary/5 px-3 py-2">
              <span className="inline-flex items-center whitespace-nowrap rounded-full border border-primary/20 bg-primary/10 px-2.5 py-0.5 text-[11px] font-semibold text-primary">
                +{fmt(client.extraAddedAmount)} manually added
              </span>
              {typeof client.overrideByUserId === 'number' ? (
                <span className="text-[11px] text-muted-foreground">
                  by{' '}
                  <span className="font-medium text-foreground">
                    {Number.isFinite(currentUserId) && currentUserId === client.overrideByUserId
                      ? 'You'
                      : (overrideUserNameById[client.overrideByUserId] ?? `User #${client.overrideByUserId}`)}
                  </span>
                </span>
              ) : null}
            </div>
          ) : null}
          <div className="flex flex-wrap gap-3">
            {/* Card 1 — Core Sale */}
            <BreakdownCard
              title="Core Sale"
              icon={<TrendingUp className="w-3.5 h-3.5" />}
              incentive={coreSaleDisplayIncentive}
              eligible={client.coreSale.eligible}
              onEdit={onEditAmount ? () => setEditSection('coreSale') : undefined}
              onInfo={() => setInfoCard('coreSale')}
            >
              {client.coreSale.items.length > 0 ? (
                client.coreSale.items.map((item, idx) => (
                  <AmountRow
                    key={`${item.label}-${idx}`}
                    label={item.label}
                    subtitle={paymentSubtitle(item.paymentDate)}
                    amount={item.amount}
                    selectable
                    checked={isPaymentChecked(`coreSale:${item.label}:${idx}`, client.coreSale.eligible)}
                    onCheckedChange={(checked) =>
                      setPaymentSelection((prev) => ({
                        ...prev,
                        [`coreSale:${item.label}:${idx}`]: checked,
                      }))}
                  />
                ))
              ) : client.receivedAmount > 0 ? (
                <AmountRow
                  label="Received amount"
                  amount={client.receivedAmount}
                  selectable
                  checked={isPaymentChecked('coreSaleFallback', client.coreSale.eligible)}
                  onCheckedChange={(checked) =>
                    setPaymentSelection((prev) => ({
                      ...prev,
                      coreSaleFallback: checked,
                    }))}
                />
              ) : (
                <p className="text-xs text-muted-foreground italic">No data yet</p>
              )}
            </BreakdownCard>

            {/* Card 2 — All Finance */}
            <BreakdownCard
              title="All Finance"
              icon={<Banknote className="w-3.5 h-3.5" />}
              incentive={allFinanceDisplayIncentive}
              eligible={client.allFinance.eligible}
              onEdit={onEditAmount ? () => setEditSection('allFinance') : undefined}
              onInfo={() => setInfoCard('allFinance')}
            >
              {client.allFinance.items && client.allFinance.items.length > 0 ? (
                client.allFinance.items.map((item, idx) => (
                  <AmountRow
                    key={`${item.label}-${idx}`}
                    label={item.label}
                    subtitle={paymentSubtitle(item.paymentDate)}
                    amount={item.amount}
                    selectable
                    checked={isPaymentChecked(`allFinance:${item.label}:${idx}`, client.allFinance.eligible)}
                    onCheckedChange={(checked) =>
                      setPaymentSelection((prev) => ({
                        ...prev,
                        [`allFinance:${item.label}:${idx}`]: checked,
                      }))}
                  />
                ))
              ) : (
                <AmountRow
                  label="Finance Amount"
                  subtitle={paymentSubtitle(resolveAllFinancePaymentDate(client.allFinance))}
                  amount={client.allFinance.amount}
                  selectable
                  checked={isPaymentChecked('allFinanceFallback', client.allFinance.eligible)}
                  onCheckedChange={(checked) =>
                    setPaymentSelection((prev) => ({
                      ...prev,
                      allFinanceFallback: checked,
                    }))}
                />
              )}
            </BreakdownCard>

            {/* Card 3 — Other Products */}
            <BreakdownCard
              title="Other Products"
              icon={<LayoutGrid className="w-3.5 h-3.5" />}
              incentive={otherProductsDisplayIncentive}
              footerLabel="Total Incentive"
              onEdit={onEditAmount ? () => setEditSection('otherProducts') : undefined}
              onInfo={() => setInfoCard('otherProducts')}
            >
              {client.otherProducts.items.length > 0 ? (
                client.otherProducts.items.map((p, idx) => (
                  <div key={`${p.name}-${idx}`} className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <input
                        type="checkbox"
                        className="h-4 w-4 rounded border-border"
                        checked={isPaymentChecked(`otherProducts:${p.name}:${idx}`, p.eligible)}
                        onChange={(e) =>
                          setPaymentSelection((prev) => ({
                            ...prev,
                            [`otherProducts:${p.name}:${idx}`]: e.target.checked,
                          }))}
                        aria-label={`Select ${p.name}`}
                      />
                      {p.eligible ? (
                        <CheckCircle2 className="w-3 h-3 text-green-500 flex-shrink-0" />
                      ) : (
                        <XCircle className="w-3 h-3 text-red-400 flex-shrink-0" />
                      )}
                      <span className="min-w-0">
                        <span className="block truncate text-xs text-muted-foreground">{p.name}</span>
                        {paymentSubtitle(p.paymentDate) ? (
                          <span className="mt-0.5 block text-[10px] text-muted-foreground/80">
                            {paymentSubtitle(p.paymentDate)}
                          </span>
                        ) : null}
                      </span>
                    </div>
                    <span
                      className={cn(
                        'text-xs font-medium tabular-nums flex-shrink-0',
                        p.amountReceived > 0 ? 'text-foreground' : 'text-muted-foreground',
                      )}
                    >
                      {fmt(p.amountReceived)}
                    </span>
                  </div>
                ))
              ) : (
                <p className="text-xs text-muted-foreground italic">No products added yet</p>
              )}
            </BreakdownCard>
          </div>
        </div>
      )}

      {/* ── Info popups ── */}
      {infoCard === 'coreSale' && (
        <InfoPopup
          title={`Core Sale — ${client.clientName}`}
          onClose={() => setInfoCard(null)}
        >
          {/* Overview */}
          <InfoRow
            label="Sale Type"
            value={
              <div className="text-right">
                <span>{formatIncentiveSaleTypeDisplay(client)}</span>
                {client.saleTypeName?.trim() ? (
                  <span className="mt-0.5 block text-[10px] capitalize text-muted-foreground">
                    {client.saleType}
                  </span>
                ) : null}
              </div>
            }
          />
          <InfoRow label="Eligibility" value={
            <span className={client.coreSale.eligible ? 'text-green-600' : 'text-red-500'}>
              {client.coreSale.eligible ? 'Eligible' : 'Not Eligible'}
            </span>
          } />

          {/* Payment stages */}
          <div className="border-t border-border/50 pt-3 space-y-2">
            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">Payment Stages</p>
            {client.coreSale.items.length > 0 ? (
              client.coreSale.items.map((item, idx) => (
                <InfoRow
                  key={`${item.label}-${idx}`}
                  label={withPaymentDateLabel(item.label, item.paymentDate)}
                  value={fmt(item.amount)}
                  highlight={item.amount > 0}
                />
              ))
            ) : client.receivedAmount > 0 ? (
              <InfoRow label="Received amount" value={fmt(client.receivedAmount)} highlight />
            ) : (
              <p className="text-xs text-muted-foreground italic">No payment stages recorded yet.</p>
            )}
          </div>

          {/* Rule detail */}
          {client.coreSale.ruleDetail ? (
            <div className="border-t border-border/50 pt-3 space-y-2">
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">Rule Applied</p>
              <InfoRow label="Rule Name" value={client.coreSale.ruleDetail.ruleName} />
              <InfoRow label="Rule Type" value={<span className="capitalize">{client.coreSale.ruleDetail.ruleType}</span>} />
              {client.coreSale.ruleDetail.ruleType === 'slab' && (
                <>
                  <InfoRow label="Team Count" value={`${client.coreSale.ruleDetail.teamCount} clients`} highlight />
                  <InfoRow label="Matched Slab" value={client.coreSale.ruleDetail.slabRange ?? '—'} />
                  {(() => {
                    const basis = coreIncentiveEligibleBasis(
                      client.coreSale.ruleDetail,
                      client.coreSale.items,
                      client.receivedAmount,
                    )
                    if (basis == null) return null
                    return (
                      <InfoRow
                        label={buildIncentiveEligibleAmountLabel(
                          client.coreSale.ruleDetail,
                          client.coreSale.items,
                          basis,
                        )}
                        value={fmt(basis)}
                        highlight
                      />
                    )
                  })()}
                </>
              )}
              {client.coreSale.ruleDetail.ruleType === 'budget' && (
                <>
                  <InfoRow
                    label={buildIncentiveEligibleAmountLabel(
                      client.coreSale.ruleDetail,
                      coreItemsForEligibleLabel(client),
                      client.coreSale.ruleDetail.counsellorTotal,
                    )}
                    value={fmt(client.coreSale.ruleDetail.counsellorTotal ?? 0)}
                    highlight
                  />
                  <InfoRow label="Threshold" value={`≥ ${fmt(client.coreSale.ruleDetail.thresholdMet ?? 0)}`} />
                </>
              )}
              <InfoRow label="Rate per Client" value={fmt(client.coreSale.ruleDetail.ratePerClient)} highlight />
            </div>
          ) : null}

          {/* Incentive total */}
          <div className="border-t border-border/50 pt-3">
            <InfoRow label="Incentive Earned" value={fmt(client.coreSale.incentive)} highlight={client.coreSale.incentive > 0} />
          </div>

          {/* Reason sentence */}
          <p className="text-[11px] text-muted-foreground bg-muted/40 rounded-lg px-3 py-2 leading-relaxed">
            {client.coreSale.ruleDetail?.reason
              ?? (client.coreSale.eligible
                ? `Eligible — required payment stages for a ${client.saleType} sale have been received.`
                : `Not yet eligible — required payment stages for a ${client.saleType} sale haven't been fully received.`)}
          </p>
        </InfoPopup>
      )}

      {infoCard === 'allFinance' && (
        <InfoPopup
          title={`All Finance — ${client.clientName}`}
          onClose={() => setInfoCard(null)}
        >
          {/* Overview */}
          <InfoRow
            label="Sale Type"
            value={
              <div className="text-right">
                <span>{formatIncentiveSaleTypeDisplay(client)}</span>
                {client.saleTypeName?.trim() ? (
                  <span className="mt-0.5 block text-[10px] capitalize text-muted-foreground">
                    {client.saleType}
                  </span>
                ) : null}
              </div>
            }
          />
          <InfoRow label="Eligibility" value={
            <span className={client.allFinance.eligible ? 'text-green-600' : 'text-red-500'}>
              {client.allFinance.eligible ? 'Eligible' : 'Not Eligible'}
            </span>
          } />

          {/* Finance amount / per-stage when API sends items */}
          <div className="border-t border-border/50 pt-3 space-y-2">
            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">Finance Details</p>
            {client.allFinance.items && client.allFinance.items.length > 0 ? (
              <>
                {client.allFinance.items.map((item, idx) => (
                  <InfoRow
                    key={`${item.label}-${idx}`}
                    label={withPaymentDateLabel(item.label, item.paymentDate)}
                    value={fmt(item.amount)}
                    highlight={item.amount > 0}
                  />
                ))}
              </>
            ) : (
              <InfoRow
                label={withPaymentDateLabel('Finance Amount Received', resolveAllFinancePaymentDate(client.allFinance))}
                value={fmt(client.allFinance.amount)}
                highlight={client.allFinance.amount > 0}
              />
            )}
          </div>

          {/* Rule detail */}
          {client.allFinance.ruleDetail ? (
            <div className="border-t border-border/50 pt-3 space-y-2">
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">Rule Applied</p>
              <InfoRow label="Rule Name" value={client.allFinance.ruleDetail.ruleName} />
              <InfoRow label="Rule Type" value={<span className="capitalize">{client.allFinance.ruleDetail.ruleType}</span>} />
              {client.allFinance.ruleDetail.ruleType === 'slab' && (
                <>
                  <InfoRow label="Team Count" value={`${client.allFinance.ruleDetail.teamCount} clients`} highlight />
                  <InfoRow label="Matched Slab" value={client.allFinance.ruleDetail.slabRange ?? '—'} />
                  {(() => {
                    const basis = financeIncentiveEligibleBasis(client.allFinance.ruleDetail, client.allFinance)
                    if (basis == null) return null
                    return (
                      <InfoRow
                        label={buildIncentiveEligibleAmountLabel(
                          client.allFinance.ruleDetail,
                          client.allFinance.items ?? [],
                          basis,
                        )}
                        value={fmt(basis)}
                        highlight
                      />
                    )
                  })()}
                </>
              )}
              {client.allFinance.ruleDetail.ruleType === 'budget' && (
                <>
                  <InfoRow
                    label={buildIncentiveEligibleAmountLabel(
                      client.allFinance.ruleDetail,
                      client.allFinance.items ?? [],
                      client.allFinance.ruleDetail.counsellorTotal,
                    )}
                    value={fmt(client.allFinance.ruleDetail.counsellorTotal ?? 0)}
                    highlight
                  />
                  <InfoRow label="Threshold" value={`≥ ${fmt(client.allFinance.ruleDetail.thresholdMet ?? 0)}`} />
                </>
              )}
              <InfoRow label="Rate per Client" value={fmt(client.allFinance.ruleDetail.ratePerClient)} highlight />
            </div>
          ) : null}

          {/* Incentive total */}
          <div className="border-t border-border/50 pt-3">
            <InfoRow label="Incentive Earned" value={fmt(client.allFinance.incentive)} highlight={client.allFinance.incentive > 0} />
          </div>

          {/* Reason sentence */}
          <p className="text-[11px] text-muted-foreground bg-muted/40 rounded-lg px-3 py-2 leading-relaxed">
            {client.allFinance.ruleDetail?.reason
              ?? (client.allFinance.eligible
                ? 'Finance amount meets the minimum threshold for an incentive.'
                : client.allFinance.amount > 0
                  ? 'Finance amount was received but does not meet the minimum threshold.'
                  : 'No finance amount has been recorded for this client.')}
          </p>
        </InfoPopup>
      )}

      {infoCard === 'otherProducts' && (
        <InfoPopup
          title={`Other Products — ${client.clientName}`}
          onClose={() => setInfoCard(null)}
        >
          <div className="space-y-2">
            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">Product Breakdown</p>
            {client.otherProducts.items.length > 0 ? (
              client.otherProducts.items.map((p, idx) => (
                <div key={`${p.name}-${idx}`} className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-1.5 min-w-0">
                    {p.eligible ? (
                      <CheckCircle2 className="w-3.5 h-3.5 text-green-500 flex-shrink-0" />
                    ) : (
                      <XCircle className="w-3.5 h-3.5 text-red-400 flex-shrink-0" />
                    )}
                    <span className="text-xs text-foreground truncate">
                      {withPaymentDateLabel(p.name, p.paymentDate)}
                    </span>
                  </div>
                  <span
                    className={cn(
                      'text-xs font-semibold tabular-nums flex-shrink-0',
                      p.amountReceived > 0 ? 'text-primary' : 'text-muted-foreground',
                    )}
                  >
                    {fmt(p.amountReceived)}
                  </span>
                </div>
              ))
            ) : (
              <p className="text-xs text-muted-foreground italic">No products recorded for this client.</p>
            )}
          </div>
          <div className="border-t border-border/50 pt-3">
            <InfoRow label="Total Incentive" value={fmt(client.otherProducts.incentive)} highlight={client.otherProducts.incentive > 0} />
          </div>
          <p className="text-[11px] text-muted-foreground bg-muted/40 rounded-lg px-3 py-2 leading-relaxed">
            {client.otherProducts.items.some((p) => p.amountReceived > 0)
              ? 'Amounts shown are received per product. Eligibility and payout follow the configured other-product rules for this period.'
              : 'No products have a recorded amount, so no other product incentive applies.'}
          </p>
        </InfoPopup>
      )}

      {onEditAmount && (
        <EditAmountModal
          open={editSection !== null}
          onClose={() => setEditSection(null)}
          section={editSection}
          currentAmount={
            editSection === 'coreSale' ? client.coreSale.incentive
            : editSection === 'allFinance' ? client.allFinance.incentive
            : client.otherProducts.incentive
          }
          clientName={client.clientName}
          onSave={(amount, remark) => {
            if (!editSection) return
            setEditSection(null)
            onEditAmount(client.clientId, editSection, amount, remark)
          }}
        />
      )}

      {client.remark && (
        <Dialog open={remarkOpen} onOpenChange={setRemarkOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="font-heading text-base">Remark — {client.clientName}</DialogTitle>
            </DialogHeader>
            <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap break-words">
              {client.remark}
            </p>
            <DialogFooter>
              <Button variant="outline" onClick={() => setRemarkOpen(false)}>Close</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}

// ─── Counsellor accordion ─────────────────────────────────────────────────────

function CounsellorRow({
  group,
  onApprove,
  onReject,
  onPending,
  onEditAmount,
  overrideUserNameById,
  canEditNonPendingStatus = false,
  onViewBreakdown,
  breakdownByRecord = {},
  breakdownSelection = {},
  breakdownActionLoadingByRecord = {},
  onToggleBreakdownSelection,
  onChangeBreakdownStatus,
  onApproveSelectedBreakdowns,
  selectedClientIds,
  onToggleClientSelect,
}: {
  group: CounsellorGroup
  onApprove: (clientId: string, preview: IncentiveSelectionPreview) => void
  onReject: (clientId: string, preview: IncentiveSelectionPreview) => void
  onPending?: (clientId: string) => void
  onEditAmount?: (clientId: string, section: IncentiveSection, amount: number, remark: string) => void
  overrideUserNameById: Record<number, string>
  canEditNonPendingStatus?: boolean
  onViewBreakdown?: (recordId: number) => void
  breakdownByRecord?: Record<number, { loading: boolean; data: Array<{ breakdown_id: number; status: string; [key: string]: unknown }> }>
  breakdownSelection?: Record<number, Record<number, { selected: boolean; status: 'APPROVED' | 'REJECTED' | 'PENDING' }>>
  breakdownActionLoadingByRecord?: Record<number, boolean>
  onToggleBreakdownSelection?: (recordId: number, breakdownId: number, checked: boolean) => void
  onChangeBreakdownStatus?: (recordId: number, breakdownId: number, status: 'APPROVED' | 'REJECTED' | 'PENDING') => void
  onApproveSelectedBreakdowns?: (recordId: number) => void
  selectedClientIds?: Set<string>
  onToggleClientSelect?: (clientId: string, checked: boolean) => void
}) {
  const [open, setOpen] = useState(false)
  const allApproved =
    group.clients.length > 0
    && group.clients.every((c) => c.status.trim().toLowerCase() === 'approved')
  const allRejected =
    group.clients.length > 0
    && group.clients.every((c) => c.status.trim().toLowerCase() === 'rejected')

  return (
    <div className={cn(
      'rounded-2xl border transition-all duration-200',
      open ? 'border-primary/30 shadow-md' : 'border-border shadow-sm',
    )}>
      {/* Counsellor header */}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={cn(
          'w-full flex items-center gap-3 px-5 py-4 text-left rounded-2xl transition-colors',
          open ? 'rounded-b-none bg-primary/5 dark:bg-primary/10' : 'hover:bg-muted/30',
        )}
      >
        <ChevronDown
          className={cn(
            'w-4 h-4 text-primary flex-shrink-0 transition-transform duration-200',
            !open && '-rotate-90',
          )}
        />

        {/* Avatar + name */}
        <span className="flex items-center justify-center w-7 h-7 rounded-full bg-primary/10 flex-shrink-0">
          <Users className="w-3.5 h-3.5 text-primary" />
        </span>
        <span className="font-semibold text-sm text-foreground">{group.counsellorName}</span>
        <span className="text-xs text-muted-foreground whitespace-nowrap">
          · {group.clients.length} client{group.clients.length !== 1 ? 's' : ''}
          {' · '}{group.eligibleCount} eligible
          {' · '}{group.clients.length - group.eligibleCount} not eligible
        </span>

        {/* Spacer */}
        <span className="flex-1" />

        {/* Total incentive */}
        <span className={cn(
          'text-sm font-bold tabular-nums',
          group.totalIncentive > 0 ? 'text-primary' : 'text-muted-foreground',
        )}>
          {fmt(group.totalIncentive)}
        </span>

        {/* Pending badge */}
        {group.pendingCount > 0 && (
          <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-[10px] font-semibold text-amber-700 dark:bg-amber-900/30 dark:text-amber-300 flex-shrink-0">
            {group.pendingCount} pending
          </span>
        )}
        {allApproved && (
          <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-[10px] font-semibold text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300 flex-shrink-0">
            All approved
          </span>
        )}
        {allRejected && (
          <span className="rounded-full bg-red-100 px-2.5 py-0.5 text-[10px] font-semibold text-red-600 dark:bg-red-900/30 dark:text-red-400 flex-shrink-0">
            All rejected
          </span>
        )}
      </button>

      {/* Client list */}
      {open && (
        <div className="px-4 pb-4 pt-3 space-y-2 border-t border-border/40">
          {group.clients.map((client) => (
            <ClientRow
              key={client.clientId}
              client={client}
              onApprove={(preview) => onApprove(client.clientId, preview)}
              onReject={(preview) => onReject(client.clientId, preview)}
              onPending={onPending ? () => onPending(client.clientId) : undefined}
              onEditAmount={onEditAmount}
              overrideUserNameById={overrideUserNameById}
              canEditNonPendingStatus={canEditNonPendingStatus}
              onViewBreakdown={onViewBreakdown}
              breakdown={breakdownByRecord[Number(client.clientId)]}
              breakdownSelection={breakdownSelection[Number(client.clientId)]}
              isBreakdownActionLoading={Boolean(breakdownActionLoadingByRecord[Number(client.clientId)])}
              onToggleBreakdownSelection={(breakdownId, checked) =>
                onToggleBreakdownSelection?.(Number(client.clientId), breakdownId, checked)}
              onChangeBreakdownStatus={(breakdownId, status) =>
                onChangeBreakdownStatus?.(Number(client.clientId), breakdownId, status)}
              onApproveSelectedBreakdowns={() => onApproveSelectedBreakdowns?.(Number(client.clientId))}
              isSelected={selectedClientIds?.has(client.clientId)}
              onToggleSelect={(checked) => onToggleClientSelect?.(client.clientId, checked)}
            />
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Main export ──────────────────────────────────────────────────────────────

interface Props {
  rows: IncentiveRow[]
  isLoading: boolean
  onApprove: (row: IncentiveRow, preview?: IncentiveSelectionPreview) => void
  onReject: (row: IncentiveRow, preview?: IncentiveSelectionPreview) => void
  onPending?: (row: IncentiveRow) => void
  onEditAmount?: (row: IncentiveRow, section: IncentiveSection, amount: number, remark: string) => void
  canEditNonPendingStatus?: boolean
  onViewBreakdown?: (recordId: number) => void
  breakdownByRecord?: Record<number, { loading: boolean; data: Array<{ breakdown_id: number; status: string; [key: string]: unknown }> }>
  breakdownSelection?: Record<number, Record<number, { selected: boolean; status: 'APPROVED' | 'REJECTED' | 'PENDING' }>>
  breakdownActionLoadingByRecord?: Record<number, boolean>
  onToggleBreakdownSelection?: (recordId: number, breakdownId: number, checked: boolean) => void
  onChangeBreakdownStatus?: (recordId: number, breakdownId: number, status: 'APPROVED' | 'REJECTED' | 'PENDING') => void
  onApproveSelectedBreakdowns?: (recordId: number) => void
  selectedClientIds?: Set<string>
  onToggleClientSelect?: (clientId: string, checked: boolean) => void
}

export function IncentiveBreakdownAccordion({
  rows,
  isLoading,
  onApprove,
  onReject,
  onPending,
  onEditAmount,
  canEditNonPendingStatus = false,
  onViewBreakdown,
  breakdownByRecord = {},
  breakdownSelection = {},
  breakdownActionLoadingByRecord = {},
  onToggleBreakdownSelection,
  onChangeBreakdownStatus,
  onApproveSelectedBreakdowns,
  selectedClientIds,
  onToggleClientSelect,
}: Props) {
  const { data: overrideUserNameById = {} } = useQuery({
    queryKey: ['incentive-override-users'],
    queryFn: async (): Promise<Record<number, string>> => {
      const res = await api.get('/api/users/users')
      const body = res.data
      const list: any[] =
        Array.isArray(body?.data)  ? body.data
        : Array.isArray(body?.users) ? body.users
        : Array.isArray(body)        ? body
        : []
      const out: Record<number, string> = {}
      for (const raw of list) {
        const id = Number(raw?.id ?? raw?.userId ?? raw?.user_id)
        if (!Number.isFinite(id) || id <= 0) continue
        // Try all common field name variants the backend might use
        const rawName =
          raw?.fullName   // camelCase — confirmed by /api/users/users/details docs
          ?? raw?.fullname
          ?? raw?.full_name
          ?? raw?.name
          ?? raw?.username
          ?? raw?.email
        const name = rawName != null ? String(rawName).trim() : ''
        out[id] = name || `User #${id}`
      }
      return out
    },
    staleTime: 5 * 60 * 1000,
  })
  const groups = useMemo(() => buildGroups(rows), [rows])

  // Build a lookup so onApprove/onReject callbacks get the full IncentiveRow
  const rowById = useMemo(() => {
    const m = new Map<string, IncentiveRow>()
    for (const r of rows) m.set(r.clientId, r)
    return m
  }, [rows])

  if (isLoading) {
    return (
      <div className="space-y-3 p-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-16 rounded-2xl bg-muted/40 animate-pulse" />
        ))}
      </div>
    )
  }

  if (groups.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 py-16 text-muted-foreground">
        <Users className="w-8 h-8 opacity-20" />
        <p className="text-sm">No records found</p>
      </div>
    )
  }

  return (
    <div className="space-y-3 p-4">
      {groups.map((group) => (
        <CounsellorRow
          key={group.counsellorName}
          group={group}
          overrideUserNameById={overrideUserNameById}
          canEditNonPendingStatus={canEditNonPendingStatus}
          onViewBreakdown={onViewBreakdown}
          breakdownByRecord={breakdownByRecord}
          breakdownSelection={breakdownSelection}
          breakdownActionLoadingByRecord={breakdownActionLoadingByRecord}
          onToggleBreakdownSelection={onToggleBreakdownSelection}
          onChangeBreakdownStatus={onChangeBreakdownStatus}
          onApproveSelectedBreakdowns={onApproveSelectedBreakdowns}
          selectedClientIds={selectedClientIds}
          onToggleClientSelect={onToggleClientSelect}
          onApprove={(clientId, preview) => {
            const row = rowById.get(clientId)
            if (row) onApprove(row, preview)
          }}
          onReject={(clientId, preview) => {
            const row = rowById.get(clientId)
            if (row) onReject(row, preview)
          }}
          onPending={(clientId) => {
            const row = rowById.get(clientId)
            if (row && onPending) onPending(row)
          }}
          onEditAmount={onEditAmount ? (clientId, section, amount, remark) => {
            const row = rowById.get(clientId)
            if (row) onEditAmount(row, section, amount, remark)
          } : undefined}
        />
      ))}

      {/* Footer count */}
      <p className="text-xs text-muted-foreground text-center pt-2">
        <span className="font-semibold text-foreground">{groups.length}</span> counsellor{groups.length !== 1 ? 's' : ''}
        {' · '}
        <span className="font-semibold text-foreground">{rows.length}</span> client{rows.length !== 1 ? 's' : ''}
      </p>
    </div>
  )
}
