import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import api from "@/lib/api";

interface SaleTypeModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  editingId: number | null;
  initialData?: {
    saleType: string;
    amount: string;
    isProduct: string;
  };
  onSuccess: () => void;
}

export function SaleTypeModal({
  isOpen,
  onOpenChange,
  editingId,
  initialData,
  onSuccess
}: SaleTypeModalProps) {
  const { toast } = useToast();
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState({
    saleType: "",
    amount: "",
    isProduct: "No"
  });

  useEffect(() => {
    if (isOpen) {
      if (editingId && initialData) {
        setFormData({
          saleType: initialData.saleType || "",
          amount: initialData.amount || "",
          isProduct: initialData.isProduct || "No"
        });
      } else {
        setFormData({ saleType: "", amount: "", isProduct: "No" });
      }
    }
  }, [isOpen, editingId, initialData]);

  const handleSave = async () => {
    if (!formData.saleType) {
      toast({
        title: "Error",
        description: "Please fill in Sale Type Name",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsSaving(true);
      const payload = {
        saleType: formData.saleType,
        amount: formData.amount ? Number(formData.amount) : null,
        isProduct: formData.isProduct === "Yes",
      };

      if (editingId) {
        const response = await api.put(`/api/sale-types/${editingId}`, payload);
        if (response.data.success) {
          toast({
            title: "Success",
            description: "Sale type updated successfully",
          });
          onSuccess();
          onOpenChange(false);
        }
      } else {
        const response = await api.post("/api/users/sale-type", payload);
        if (response.data.success) {
          toast({
            title: "Success",
            description: "Sale type added successfully",
          });
          onSuccess();
          onOpenChange(false);
        }
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.response?.data?.message || "Failed to save sale type",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {editingId ? "Update Sale Type" : "Add Sale Type"}
          </DialogTitle>
          <DialogDescription>
            {editingId
              ? "Modify the existing sale type configuration."
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
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="isProduct">Is Product</Label>
            <Select
              value={formData.isProduct}
              onValueChange={(value) => setFormData({ ...formData, isProduct: value })}
            >
              <SelectTrigger id="isProduct">
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
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSaving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            {editingId ? "Update" : "Add"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
