import { PageWrapper } from "@/layout/PageWrapper";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect } from "react";
import { Trash2, Plus, Pencil, ArrowRight, Loader2 } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import api from "@/lib/api";

export default function AdditionalInfo() {
  const { toast } = useToast();

  const [saleTypes, setSaleTypes] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [mode, setMode] = useState<"add" | "edit">("add");
  const [editingId, setEditingId] = useState<number | null>(null);

  const [formData, setFormData] = useState({
    saleType: "",
    amount: "",
    isProduct: "No",
  });

  const fetchSaleTypes = async () => {
    try {
      setIsLoading(true);
      const res = await api.get("/api/sale-types");
      setSaleTypes(res.data.data || []);
    } catch {
      setSaleTypes([
        { id: 1, saleType: "Canada Student", amount: 50000, isProduct: false },
        { id: 2, saleType: "UK Visa", amount: 35000, isProduct: false },
        { id: 3, saleType: "IELTS Course", amount: 15000, isProduct: true },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSaleTypes();
  }, []);

  /* ---------- Dialog Actions ---------- */

  const openAddDialog = () => {
    setMode("add");
    setEditingId(null);
    setFormData({ saleType: "", amount: "", isProduct: "No" });
    setIsDialogOpen(true);
  };

  const openEditDialog = (item: any) => {
    setMode("edit");
    // Only use 'id' as requested
    const id = item.id;
    setEditingId(id);
    setFormData({
      saleType: item.saleType || "",
      amount: item.amount?.toString() || "",
      isProduct: item.isProduct ? "Yes" : "No",
    });
    setIsDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formData.saleType) {
      toast({ title: "Error", description: "Sale type required", variant: "destructive" });
      return;
    }

    try {
      setIsSaving(true);
      const payload = {
        saleType: formData.saleType,
        amount: formData.amount ? Number(formData.amount) : null,
        isProduct: formData.isProduct === "Yes",
      };

      if (mode === "edit" && editingId !== null) {
        await api.put(`/api/sale-types/${editingId}`, payload);
        toast({ title: "Updated", description: "Sale type updated" });
      } else {
        await api.post("/api/sale-types", payload);
        toast({ title: "Added", description: "Sale type added" });
      }

      setIsDialogOpen(false);
      fetchSaleTypes();
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.response?.data?.message || "Save failed",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = (id: number) => {
    setSaleTypes(prev => prev.filter(x => x.id !== id));
    toast({ title: "Deleted", description: "Sale type removed" });
  };

  return (
    <PageWrapper title="Additional Information" breadcrumbs={[{ label: "Additional Info" }]}>
      <Card>
        <CardHeader className="flex flex-row justify-between items-center">
          <div>
            <CardTitle>Sale Types & Payment</CardTitle>
            <CardDescription>Manage sale types</CardDescription>
          </div>
          <Button size="sm" onClick={openAddDialog}>
            <Plus className="w-4 h-4 mr-2" />
            Add Sale Type
          </Button>
        </CardHeader>

        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Sale Type</TableHead>
                <TableHead>Is Product</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center">
                    <Loader2 className="animate-spin mx-auto" />
                  </TableCell>
                </TableRow>
              ) : (
                saleTypes.map(item => (
                  <TableRow key={item.id}>
                    <TableCell>{item.saleType}</TableCell>
                    <TableCell>{item.isProduct ? "Yes" : "No"}</TableCell>
                    <TableCell>{item.amount ? `₹${item.amount}` : "N/A"}</TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openEditDialog(item)}
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive"
                        onClick={() => handleDelete(item.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* ---------- Dialog ---------- */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {mode === "edit" ? "Update Sale Type" : "Add Sale Type"}
            </DialogTitle>
            <DialogDescription>
              {mode === "edit" ? "Update existing sale type" : "Create new sale type"}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <Input
              placeholder="Sale Type"
              value={formData.saleType}
              onChange={e => setFormData({ ...formData, saleType: e.target.value })}
            />
            <Input
              type="number"
              placeholder="Amount"
              value={formData.amount}
              onChange={e => setFormData({ ...formData, amount: e.target.value })}
            />
            <Select
              value={formData.isProduct}
              onValueChange={v => setFormData({ ...formData, isProduct: v })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Yes">Yes</SelectItem>
                <SelectItem value="No">No</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {mode === "edit" ? "Update Sale Type" : "Add"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageWrapper>
  );
}
