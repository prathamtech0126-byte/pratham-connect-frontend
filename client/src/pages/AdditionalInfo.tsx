import { PageWrapper } from "@/layout/PageWrapper";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import { Trash2, Plus, Pencil } from "lucide-react";

export default function AdditionalInfo() {
  const { toast } = useToast();

  // State for Sale Types
  const [saleTypes, setSaleTypes] = useState([
    { id: 1, name: "Canada Student", totalPayment: "50000" },
    { id: 2, name: "Canada Onshore Student", totalPayment: "45000" },
    { id: 3, name: "UK Student", totalPayment: "15000" },
    { id: 4, name: "Finland Student", totalPayment: "20000" },
    { id: 5, name: "USA Student", totalPayment: "25000" },
    { id: 6, name: "Germany Student", totalPayment: "20000" },
    { id: 7, name: "Canada Spouse", totalPayment: "120000" },
    { id: 8, name: "UK Spouse", totalPayment: "100000" },
    { id: 9, name: "Finland Spouse", totalPayment: "80000" },
    { id: 10, name: "UK Visitor", totalPayment: "5000" },
    { id: 11, name: "Canada Visitor", totalPayment: "5000" },
    { id: 12, name: "USA Visitor", totalPayment: "5000" },
    { id: 13, name: "Schengen visa", totalPayment: "5000" },
    { id: 14, name: "SPOUSAL PR", totalPayment: "60000" },
  ]);

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    totalPayment: ""
  });

  const handleSave = () => {
    if (!formData.name || !formData.totalPayment) {
      toast({
        title: "Error",
        description: "Please fill in all fields",
        variant: "destructive",
      });
      return;
    }

    if (editingId) {
      setSaleTypes(saleTypes.map(item => 
        item.id === editingId ? { ...item, ...formData } : item
      ));
      toast({
        title: "Success",
        description: "Sale type updated successfully",
      });
    } else {
      const newItem = {
        id: Date.now(),
        ...formData
      };
      setSaleTypes([...saleTypes, newItem]);
      toast({
        title: "Success",
        description: "Sale type added successfully",
      });
    }

    setIsDialogOpen(false);
    resetForm();
  };

  const handleDelete = (id: number) => {
    setSaleTypes(saleTypes.filter(item => item.id !== id));
    toast({
      title: "Success",
      description: "Sale type removed successfully",
    });
  };

  const resetForm = () => {
    setFormData({ name: "", totalPayment: "" });
    setEditingId(null);
  };

  const openAddDialog = () => {
    resetForm();
    setIsDialogOpen(true);
  };

  const openEditDialog = (item: any) => {
    setEditingId(item.id);
    setFormData({
      name: item.name,
      totalPayment: item.totalPayment
    });
    setIsDialogOpen(true);
  };

  return (
    <PageWrapper title="Additional Information" breadcrumbs={[{ label: "Additional Info" }]}>
      <Card>
        <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <CardTitle>Sale Types & Payment</CardTitle>
            <CardDescription>Manage sale types and their default total payment amounts.</CardDescription>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={(open) => {
            setIsDialogOpen(open);
            if (!open) resetForm();
          }}>
            <DialogTrigger asChild>
              <Button size="sm" onClick={openAddDialog}>
                <Plus className="w-4 h-4 mr-2" />
                Add Sale Type
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editingId ? "Edit Sale Type" : "Add Sale Type"}</DialogTitle>
                <DialogDescription>
                  {editingId ? "Update sale type details." : "Create a new sale type configuration."}
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Sale Type Name</Label>
                  <Input
                    id="name"
                    placeholder="e.g. Canada Student"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="totalPayment">Total Payment (₹)</Label>
                  <Input
                    id="totalPayment"
                    type="number"
                    placeholder="e.g. 50000"
                    value={formData.totalPayment}
                    onChange={(e) => setFormData({ ...formData, totalPayment: e.target.value })}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                <Button onClick={handleSave}>{editingId ? "Update" : "Add"}</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Sale Type</TableHead>
                  <TableHead>Total Payment</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {saleTypes.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={3} className="h-24 text-center">
                      No sale types found.
                    </TableCell>
                  </TableRow>
                ) : (
                  saleTypes.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">{item.name}</TableCell>
                      <TableCell>₹{parseInt(item.totalPayment).toLocaleString()}</TableCell>
                      <TableCell className="text-right">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8 mr-1 text-muted-foreground hover:text-primary"
                          onClick={() => openEditDialog(item)}
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8 text-destructive"
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
          </div>
        </CardContent>
      </Card>
    </PageWrapper>
  );
}
