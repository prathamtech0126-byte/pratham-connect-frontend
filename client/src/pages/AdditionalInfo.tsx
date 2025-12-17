import { PageWrapper } from "@/layout/PageWrapper";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import { Trash2, Plus, Pencil, ArrowRightLeft } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

// Mock Data
const MOCK_COUNSELLORS = [
  { id: "c1", name: "Priya Singh" },
  { id: "c2", name: "Rahul Sharma" },
  { id: "c3", name: "Anjali Gupta" },
  { id: "c4", name: "Vikram Malhotra" },
];

const MOCK_CLIENTS = [
  { id: "cl1", name: "Aarav Patel", counsellorId: "c1" },
  { id: "cl2", name: "Vivaan Shah", counsellorId: "c1" },
  { id: "cl3", name: "Aditya Kumar", counsellorId: "c2" },
  { id: "cl4", name: "Vihaan Singh", counsellorId: "c3" },
  { id: "cl5", name: "Arjun Das", counsellorId: "c1" },
];

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

  // State for Client Reassignment
  const [reassignData, setReassignData] = useState({
    fromCounsellor: "",
    toCounsellor: "",
    transferType: "all", // "all" or "specific"
    selectedClient: "",
  });

  const handleReassign = () => {
    if (!reassignData.fromCounsellor || !reassignData.toCounsellor) {
      toast({
        title: "Error",
        description: "Please select both counsellors",
        variant: "destructive",
      });
      return;
    }

    if (reassignData.fromCounsellor === reassignData.toCounsellor) {
      toast({
        title: "Error",
        description: "Cannot transfer to the same counsellor",
        variant: "destructive",
      });
      return;
    }

    if (reassignData.transferType === "specific" && !reassignData.selectedClient) {
      toast({
        title: "Error",
        description: "Please select a client to transfer",
        variant: "destructive",
      });
      return;
    }

    // Mock success logic
    const fromName = MOCK_COUNSELLORS.find(c => c.id === reassignData.fromCounsellor)?.name;
    const toName = MOCK_COUNSELLORS.find(c => c.id === reassignData.toCounsellor)?.name;
    
    let description = "";
    if (reassignData.transferType === "all") {
      description = `All clients transferred from ${fromName} to ${toName}`;
    } else {
      const clientName = MOCK_CLIENTS.find(c => c.id === reassignData.selectedClient)?.name;
      description = `Client ${clientName} transferred from ${fromName} to ${toName}`;
    }

    toast({
      title: "Success",
      description: description,
    });

    // Reset form
    setReassignData({
      fromCounsellor: "",
      toCounsellor: "",
      transferType: "all",
      selectedClient: "",
    });
  };

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
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Client Reassignment</CardTitle>
          <CardDescription>Transfer clients between counsellors.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>From Counsellor</Label>
                <Select
                  value={reassignData.fromCounsellor}
                  onValueChange={(value) => setReassignData({ ...reassignData, fromCounsellor: value, selectedClient: "" })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select current counsellor" />
                  </SelectTrigger>
                  <SelectContent>
                    {MOCK_COUNSELLORS.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>To Counsellor</Label>
                <Select
                  value={reassignData.toCounsellor}
                  onValueChange={(value) => setReassignData({ ...reassignData, toCounsellor: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select new counsellor" />
                  </SelectTrigger>
                  <SelectContent>
                    {MOCK_COUNSELLORS.filter(c => c.id !== reassignData.fromCounsellor).map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Transfer Type</Label>
                <RadioGroup
                  value={reassignData.transferType}
                  onValueChange={(value) => setReassignData({ ...reassignData, transferType: value })}
                  className="flex flex-col space-y-1"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="all" id="all" />
                    <Label htmlFor="all">Transfer All Clients</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="specific" id="specific" />
                    <Label htmlFor="specific">Transfer Specific Client</Label>
                  </div>
                </RadioGroup>
              </div>

              {reassignData.transferType === "specific" && (
                <div className="space-y-2">
                  <Label>Select Client</Label>
                  <Select
                    value={reassignData.selectedClient}
                    onValueChange={(value) => setReassignData({ ...reassignData, selectedClient: value })}
                    disabled={!reassignData.fromCounsellor}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={reassignData.fromCounsellor ? "Select client" : "Select counsellor first"} />
                    </SelectTrigger>
                    <SelectContent>
                      {MOCK_CLIENTS
                        .filter(c => !reassignData.fromCounsellor || c.counsellorId === reassignData.fromCounsellor)
                        .map((c) => (
                          <SelectItem key={c.id} value={c.id}>
                            {c.name}
                          </SelectItem>
                        ))}
                      {MOCK_CLIENTS.filter(c => !reassignData.fromCounsellor || c.counsellorId === reassignData.fromCounsellor).length === 0 && (
                        <div className="p-2 text-sm text-muted-foreground text-center">No clients found</div>
                      )}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          </div>
          
          <div className="mt-6 flex justify-end">
            <Button onClick={handleReassign}>
              <ArrowRightLeft className="w-4 h-4 mr-2" />
              Transfer Clients
            </Button>
          </div>
        </CardContent>
      </Card>

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
