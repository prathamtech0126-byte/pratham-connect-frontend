import {
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2 } from "lucide-react";

interface SaleTypeDialogProps {
  editingId: number | null;
  formData: {
    saleType: string;
    amount: string;
    isProduct: string;
  };
  setFormData: (data: any) => void;
  onSave: () => void;
  onCancel: () => void;
  isSaving: boolean;
}

export function SaleTypeDialog({
  editingId,
  formData,
  setFormData,
  onSave,
  onCancel,
  isSaving,
}: SaleTypeDialogProps) {
  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>
          {editingId ? "Edit Sale Type" : "Add Sale Type"}
        </DialogTitle>
        <DialogDescription>
          {editingId
            ? "Update sale type details."
            : "Create a new sale type configuration."}
        </DialogDescription>
      </DialogHeader>
      <div className="grid gap-4 py-4">
        <div className="space-y-2">
          <Label htmlFor="saleType">Sale Type Name</Label>
          <Input
            id="saleType"
            placeholder="e.g. Canada Student"
            value={formData.saleType}
            onChange={(e) =>
              setFormData({ ...formData, saleType: e.target.value })
            }
            data-testid="input-sale-type-name"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="amount">Total Payment (₹)</Label>
          <Input
            id="amount"
            type="number"
            placeholder="e.g. 50000"
            value={formData.amount}
            onChange={(e) =>
              setFormData({ ...formData, amount: e.target.value })
            }
            data-testid="input-sale-type-amount"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="isProduct">Is Product</Label>
          <Select
            value={formData.isProduct}
            onValueChange={(value) =>
              setFormData({ ...formData, isProduct: value })
            }
          >
            <SelectTrigger id="isProduct" data-testid="select-is-product">
              <SelectValue placeholder="Select Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Yes">Yes</SelectItem>
              <SelectItem value="No">No</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <DialogFooter>
        <Button
          variant="outline"
          onClick={onCancel}
          disabled={isSaving}
          data-testid="button-cancel-sale-type"
        >
          Cancel
        </Button>
        <Button 
          onClick={onSave} 
          disabled={isSaving}
          data-testid="button-save-sale-type"
        >
          {isSaving && (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          )}
          {editingId ? "Update" : "Add"}
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}
