import { PageWrapper } from "@/layout/PageWrapper";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import { Trash2, Plus, Pencil, ArrowRight } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function AdditionalInfo() {
  const { toast } = useToast();

  // Mock data for clients and counselors
  const [clients] = useState([
    { id: 1, name: "Rahul Kumar", currentCounsellor: "Super Admin", status: "Active" },
    { id: 2, name: "Priya Singh", currentCounsellor: "Sarah Manager", status: "Active" },
    { id: 3, name: "Amit Patel", currentCounsellor: "Priya Singh", status: "Active" },
    { id: 4, name: "Neha Sharma", currentCounsellor: "Director", status: "Active" },
    { id: 5, name: "Vikram Malhotra", currentCounsellor: "Rahul Sharma", status: "Active" },
  ]);

  const [counsellors] = useState([
    "Super Admin",
    "Sarah Manager",
    "Priya Singh",
    "Director",
    "Rahul Sharma",
    "Anjali Gupta",
    "Vikram Malhotra",
  ]);

  // Transfer state
  const [selectedClientId, setSelectedClientId] = useState<number | null>(null);
  const [selectedCounsellor, setSelectedCounsellor] = useState<string>("");
  const [clientSearchInput, setClientSearchInput] = useState("");
  const [counsellorSearchInput, setCounsellorSearchInput] = useState("");
  const [showClientList, setShowClientList] = useState(false);
  const [showCounsellorList, setShowCounsellorList] = useState(false);
  const [clientTransfers, setClientTransfers] = useState<Array<{ clientId: number; oldCounsellor: string; newCounsellor: string; date: string }>>([]);

  // Filter clients based on search
  const filteredClients = clientSearchInput.length >= 3 
    ? clients.filter(c => 
        c.name.toLowerCase().includes(clientSearchInput.toLowerCase()) ||
        c.currentCounsellor.toLowerCase().includes(clientSearchInput.toLowerCase())
      )
    : [];

  // Filter counsellors based on search
  const filteredCounsellors = counsellorSearchInput.length >= 3
    ? counsellors.filter(c =>
        c.toLowerCase().includes(counsellorSearchInput.toLowerCase())
      )
    : [];

  const handleTransferClient = () => {
    if (!selectedClientId || !selectedCounsellor) {
      toast({
        title: "Error",
        description: "Please select both a client and a counsellor",
        variant: "destructive",
      });
      return;
    }

    const client = clients.find(c => c.id === selectedClientId);
    if (!client) return;

    if (client.currentCounsellor === selectedCounsellor) {
      toast({
        title: "Error",
        description: "Client is already assigned to this counsellor",
        variant: "destructive",
      });
      return;
    }

    const transfer = {
      clientId: selectedClientId,
      oldCounsellor: client.currentCounsellor,
      newCounsellor: selectedCounsellor,
      date: new Date().toLocaleDateString(),
    };

    setClientTransfers([transfer, ...clientTransfers]);
    
    toast({
      title: "Success",
      description: `${client.name} transferred from ${client.currentCounsellor} to ${selectedCounsellor}`,
    });

    setSelectedClientId(null);
    setSelectedCounsellor("");
  };

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
      {/* Client Transfer Section */}
      <Card className="mb-6">
        <CardHeader>
          <div>
            <CardTitle>Client Transfer</CardTitle>
            <CardDescription>Transfer individual clients to another counsellor</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Transfer Form */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
            {/* Client Search */}
            <div className="space-y-2 relative">
              <Label>Select Client</Label>
              <Input
                data-testid="input-client-search"
                placeholder="Search client (3+ chars)"
                value={clientSearchInput}
                onChange={(e) => {
                  setClientSearchInput(e.target.value);
                  setShowClientList(true);
                }}
                onFocus={() => setShowClientList(true)}
              />
              {showClientList && clientSearchInput.length >= 3 && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white border rounded-md shadow-lg z-10 max-h-48 overflow-y-auto">
                  {filteredClients.length > 0 ? (
                    filteredClients.map(client => (
                      <div
                        key={client.id}
                        className="px-3 py-2 hover:bg-slate-100 cursor-pointer border-b text-sm"
                        onClick={() => {
                          setSelectedClientId(client.id);
                          setClientSearchInput(`${client.name} (${client.currentCounsellor})`);
                          setShowClientList(false);
                        }}
                        data-testid={`client-option-${client.id}`}
                      >
                        {client.name} ({client.currentCounsellor})
                      </div>
                    ))
                  ) : (
                    <div className="px-3 py-2 text-sm text-muted-foreground">No clients found</div>
                  )}
                </div>
              )}
            </div>

            <div className="flex justify-center">
              <ArrowRight className="w-5 h-5 text-muted-foreground" />
            </div>

            {/* Counsellor Search */}
            <div className="space-y-2 relative">
              <Label>Transfer To</Label>
              <Input
                data-testid="input-counsellor-search"
                placeholder="Search counsellor (3+ chars)"
                value={counsellorSearchInput}
                onChange={(e) => {
                  setCounsellorSearchInput(e.target.value);
                  setShowCounsellorList(true);
                }}
                onFocus={() => setShowCounsellorList(true)}
              />
              {showCounsellorList && counsellorSearchInput.length >= 3 && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white border rounded-md shadow-lg z-10 max-h-48 overflow-y-auto">
                  {filteredCounsellors.length > 0 ? (
                    filteredCounsellors.map(counsellor => (
                      <div
                        key={counsellor}
                        className="px-3 py-2 hover:bg-slate-100 cursor-pointer border-b text-sm"
                        onClick={() => {
                          setSelectedCounsellor(counsellor);
                          setCounsellorSearchInput(counsellor);
                          setShowCounsellorList(false);
                        }}
                        data-testid={`counsellor-option-${counsellor}`}
                      >
                        {counsellor}
                      </div>
                    ))
                  ) : (
                    <div className="px-3 py-2 text-sm text-muted-foreground">No counsellors found</div>
                  )}
                </div>
              )}
            </div>

            <Button onClick={handleTransferClient} data-testid="button-transfer">
              Transfer
            </Button>
          </div>

          {/* Transfer History */}
          {clientTransfers.length > 0 && (
            <div className="mt-8">
              <h3 className="font-semibold mb-4">Recent Transfers</h3>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Client Name</TableHead>
                      <TableHead>From</TableHead>
                      <TableHead>To</TableHead>
                      <TableHead>Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {clientTransfers.map((transfer, index) => {
                      const client = clients.find(c => c.id === transfer.clientId);
                      return (
                        <TableRow key={index} data-testid={`transfer-row-${index}`}>
                          <TableCell className="font-medium">{client?.name}</TableCell>
                          <TableCell>{transfer.oldCounsellor}</TableCell>
                          <TableCell>{transfer.newCounsellor}</TableCell>
                          <TableCell>{transfer.date}</TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
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
