import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import type { IncentiveRow } from '@/api/incentives.api'

interface ConfirmActionModalProps {
  open: boolean
  onClose: () => void
  onConfirm: () => void
  action: 'approve' | 'reject'
  row: Pick<IncentiveRow, 'clientName' | 'counsellorName' | 'incentiveAmount'> | null
  isLoading: boolean
}

export function ConfirmActionModal({
  open,
  onClose,
  onConfirm,
  action,
  row,
  isLoading,
}: ConfirmActionModalProps) {
  const isApprove = action === 'approve'

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>
            {isApprove ? 'Approve Incentive?' : 'Reject Incentive?'}
          </DialogTitle>
        </DialogHeader>

        {row && (
          <div className="space-y-2 text-sm text-muted-foreground py-1">
            <p>
              <span className="font-medium text-foreground">Client: </span>
              {row.clientName}
            </p>
            <p>
              <span className="font-medium text-foreground">Counsellor: </span>
              {row.counsellorName}
            </p>
            <p>
              <span className="font-medium text-foreground">Amount: </span>
              ₹{row.incentiveAmount.toLocaleString('en-IN')}
            </p>
          </div>
        )}

        <DialogFooter className="gap-2 pt-2">
          <Button variant="ghost" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button
            variant={isApprove ? 'default' : 'destructive'}
            onClick={onConfirm}
            disabled={isLoading}
          >
            {isLoading ? 'Processing...' : isApprove ? 'Approve' : 'Reject'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
