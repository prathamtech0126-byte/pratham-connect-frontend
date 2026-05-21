import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { CheckCircle2, XCircle, Clock3 } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { IncentiveRow } from '@/api/incentives.api'

interface ConfirmActionModalProps {
  open: boolean
  onClose: () => void
  onConfirm: () => void
  action: 'approve' | 'reject' | 'pending'
  row: Pick<
    IncentiveRow,
    'clientName' | 'counsellorName' | 'incentiveAmount' | 'coreSale' | 'allFinance' | 'otherProducts' | 'status'
  > | null
  isLoading: boolean
  remarks: string
  onRemarksChange: (v: string) => void
  overrides?: {
    coreSale: string
    allFinance: string
    otherProducts: string
  }
  onOverridesChange?: (key: 'coreSale' | 'allFinance' | 'otherProducts', value: string) => void
  /** When false, override inputs are hidden and callers should not send override payloads. */
  showOverrideAmounts?: boolean
  /** When true, remarks are shown for Approve too and are required for Approve / Reject / Pending. */
  requireRemarks?: boolean
  selectionPreview?: Array<{
    section: 'Core Sale' | 'All Finance' | 'Other Products'
    label: string
    selected: boolean
  }>
}

export function ConfirmActionModal({
  open,
  onClose,
  onConfirm,
  action,
  row,
  isLoading,
  remarks,
  onRemarksChange,
  overrides = { coreSale: '', allFinance: '', otherProducts: '' },
  onOverridesChange = () => {},
  showOverrideAmounts = true,
  requireRemarks = false,
  selectionPreview,
}: ConfirmActionModalProps) {
  const isApprove = action === 'approve'
  const isReject = action === 'reject'
  const isPending = action === 'pending'
  const normalizedCurrentStatus = row?.status?.trim().toLowerCase()
  const isEditFromApproved = normalizedCurrentStatus === 'approved' && (isReject || isPending)
  const isEditFromRejected = normalizedCurrentStatus === 'rejected' && (isApprove || isPending)
  const remarksVisible = requireRemarks || isReject || isPending
  const remarksMandatory = requireRemarks || isReject
  const confirmDisabled =
    isLoading
    || (remarksVisible && remarksMandatory && !remarks.trim())

  return (
    <Dialog open={open} onOpenChange={(isOpen) => { if (!isOpen && !isLoading) onClose() }}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <div className="flex items-center gap-2.5">
            <div className={cn(
              'flex h-9 w-9 shrink-0 items-center justify-center rounded-full',
              isApprove
                ? 'bg-emerald-100 dark:bg-emerald-900/30'
                : isReject
                  ? 'bg-red-100 dark:bg-red-900/30'
                  : 'bg-amber-100 dark:bg-amber-900/30'
            )}>
              {isApprove
                ? <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                : isReject
                  ? <XCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
                  : <Clock3 className="h-5 w-5 text-amber-600 dark:text-amber-300" />
              }
            </div>
            <DialogTitle className="font-heading text-base">
              {isApprove ? 'Approve Incentive?' : isReject ? 'Reject Incentive?' : 'Move to Pending?'}
            </DialogTitle>
          </div>
        </DialogHeader>

        {row && (
          <div className="rounded-lg border border-border bg-muted/30 px-4 py-3 space-y-1.5 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Client</span>
              <span className="font-medium text-foreground">{row.clientName}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Counsellor</span>
              <span className="font-medium text-foreground">{row.counsellorName}</span>
            </div>
            <div className="flex items-center justify-between border-t border-border pt-1.5 mt-1.5">
              <span className="text-muted-foreground">Incentive</span>
              <span className="font-bold text-primary">₹{row.incentiveAmount.toLocaleString('en-IN')}</span>
            </div>
          </div>
        )}

        {selectionPreview && selectionPreview.length > 0 && (
          <div className="rounded-lg border border-border bg-muted/20 px-3 py-2 space-y-1.5">
            <p className="text-xs font-medium text-foreground">Selection breakdown</p>
            <div className="max-h-36 space-y-1 overflow-auto pr-1">
              {selectionPreview.map((item, idx) => (
                <div key={`${item.section}:${item.label}:${idx}`} className="flex items-center justify-between gap-2 text-xs">
                  <span className="truncate text-muted-foreground">{item.section} - {item.label}</span>
                  <span className={item.selected ? 'text-emerald-600' : 'text-red-500'}>
                    {item.selected ? 'Included' : 'Excluded'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {(isEditFromApproved || isEditFromRejected) && (
          <div className="rounded-lg border border-amber-300/70 bg-amber-50 px-3.5 py-2 text-xs text-amber-900 dark:border-amber-800 dark:bg-amber-900/20 dark:text-amber-200">
            {isEditFromApproved
              ? isReject
                ? 'This is already Approved, do you want to change to Rejected?'
                : 'This is already Approved, do you want to move it back to Pending?'
              : isApprove
                ? 'This is already Rejected, do you want to change to Approved?'
                : 'This is already Rejected, do you want to move it back to Pending?'}
          </div>
        )}

        {showOverrideAmounts && (
          <div className="space-y-2.5">
            <Label className="text-sm font-medium">
              Override amounts (optional)
            </Label>
            <div className="grid gap-2">
              <div className="space-y-1">
                <Label htmlFor="override-core-sale" className="text-xs text-muted-foreground">Core Sale</Label>
                <Input
                  id="override-core-sale"
                  type="number"
                  min="0"
                  step="0.01"
                  value={overrides.coreSale}
                  onChange={(e) => onOverridesChange('coreSale', e.target.value)}
                  disabled={isLoading}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="override-all-finance" className="text-xs text-muted-foreground">All Finance</Label>
                <Input
                  id="override-all-finance"
                  type="number"
                  min="0"
                  step="0.01"
                  value={overrides.allFinance}
                  onChange={(e) => onOverridesChange('allFinance', e.target.value)}
                  disabled={isLoading}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="override-other-products" className="text-xs text-muted-foreground">Other Products</Label>
                <Input
                  id="override-other-products"
                  type="number"
                  min="0"
                  step="0.01"
                  value={overrides.otherProducts}
                  onChange={(e) => onOverridesChange('otherProducts', e.target.value)}
                  disabled={isLoading}
                />
              </div>
            </div>
          </div>
        )}

        {remarksVisible && (
          <div className="space-y-1.5">
            <Label htmlFor="reject-remarks" className="text-sm font-medium">
              Remarks {remarksMandatory ? <span className="text-destructive">*</span> : <span className="text-muted-foreground">(optional)</span>}
            </Label>
            <Textarea
              id="reject-remarks"
              placeholder={
                requireRemarks
                  ? 'Provide a reason for this action…'
                  : isReject
                    ? 'Provide a reason for rejection…'
                    : 'Optional note for moving back to pending…'
              }
              value={remarks}
              onChange={(e) => onRemarksChange(e.target.value)}
              rows={3}
              disabled={isLoading}
              className="resize-none"
            />
          </div>
        )}

        <DialogFooter className="gap-2 pt-2">
          <Button variant="outline" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button
            variant={isApprove ? 'default' : isReject ? 'destructive' : 'outline'}
            onClick={onConfirm}
            disabled={confirmDisabled}
          >
            {isLoading ? 'Processing…' : isApprove ? 'Approve' : isReject ? 'Reject' : 'Move to Pending'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
