import { PageWrapper } from "@/layout/PageWrapper";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import { Trash2, Plus, Pencil, ChevronDown } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

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

  // State for Counsellors
  const [counsellors, setCounsellors] = useState([
    { id: 1, name: "Super Admin" },
    { id: 2, name: "Sarah Manager" },
    { id: 3, name: "Priya Singh" },
    { id: 4, name: "Director" },
    { id: 5, name: "Rahul Sharma" },
    { id: 6, name: "Anjali Gupta" },
    { id: 7, name: "Vikram Malhotra" },
  ]);

  // State for Client Assignments
  const [clientAssignments, setClientAssignments] = useState([
    { id: 1, name: "Rahul Kumar", counsellorId: 1 },
    { id: 2, name: "Jane Doe", counsellorId: 2 },
    { id: 3, name: "John Smith", counsellorId: 3 },
    { id: 4, name: "Emma Wilson", counsellorId: 1 },
    { id: 5, name: "Michael Brown", counsellorId: 4 },
    { id: 6, name: "Sophia Davis", counsellorId: 2 },
  ]);

  const [selectedClients, setSelectedClients] = useState<number[]>([]);
  const [assignToId, setAssignToId] = useState<string>("");

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isCounsellorDialogOpen, setIsCounsellorDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingCounsellorId, setEditingCounsellorId] = useState<number | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    totalPayment: ""
  });
  const [counsellorFormData, setCounsellorFormData] = useState({
    name: ""
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

  const handleSaveCounsellor = () => {
    if (!counsellorFormData.name) {
      toast({
        title: "Error",
        description: "Please fill in counsellor name",
        variant: "destructive",
      });
      return;
    }

    if (editingCounsellorId) {
      setCounsellors(counsellors.map(item => 
        item.id === editingCounsellorId ? { ...item, ...counsellorFormData } : item
      ));
      toast({
        title: "Success",
        description: "Counsellor updated successfully",
      });
    } else {
      const newItem = {
        id: Date.now(),
        ...counsellorFormData
      };
      setCounsellors([...counsellors, newItem]);
      toast({
        title: "Success",
        description: "Counsellor added successfully",
      });
    }

    setIsCounsellorDialogOpen(false);
    resetCounsellorForm();
  };

  const handleDeleteCounsellor = (id: number) => {
    setCounsellors(counsellors.filter(item => item.id !== id));
    toast({
      title: "Success",
      description: "Counsellor removed successfully",
    });
  };

  const resetCounsellorForm = () => {
    setCounsellorFormData({ name: "" });
    setEditingCounsellorId(null);
  };

  const openAddCounsellorDialog = () => {
    resetCounsellorForm();
    setIsCounsellorDialogOpen(true);
  };

  const openEditCounsellorDialog = (item: any) => {
    setEditingCounsellorId(item.id);
    setCounsellorFormData({
      name: item.name,
    });
    setIsCounsellorDialogOpen(true);
  };

  const getCounsellorClients = (counsellorId: number) => {
    return clientAssignments.filter(c => c.counsellorId === counsellorId);
  };

  const getCounsellorName = (counsellorId: number) => {
    return counsellors.find(c => c.id === counsellorId)?.name || "Unknown";
  };

  const handleAssignClients = () => {
    if (selectedClients.length === 0 || !assignToId) {
      toast({
        title: "Error",
        description: "Please select clients and target counsellor",
        variant: "destructive",
      });
      return;
    }

    const newAssignments = clientAssignments.map(client =>
      selectedClients.includes(client.id)
        ? { ...client, counsellorId: parseInt(assignToId) }
        : client
    );

    setClientAssignments(newAssignments);
    setSelectedClients([]);
    setAssignToId("");

    toast({
      title: "Success",
      description: `${selectedClients.length} client(s) assigned successfully`,
    });
  };

  const toggleClientSelection = (clientId: number) => {
    setSelectedClients(prev =>
      prev.includes(clientId)
        ? prev.filter(id => id !== clientId)
        : [...prev, clientId]
    );
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
      <Tabs defaultValue="sales" className="w-full">
        <TabsList className="grid w-full max-w-2xl grid-cols-3">
          <TabsTrigger value="sales">Sale Types</TabsTrigger>
          <TabsTrigger value="counsellors">Counsellors</TabsTrigger>
          <TabsTrigger value="assign-clients">Assign Clients</TabsTrigger>
        </TabsList>

        <TabsContent value="sales">
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
        </TabsContent>

        <TabsContent value="counsellors">
      <Card>
        <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <CardTitle>Manage Counsellors</CardTitle>
            <CardDescription>Add, edit, and manage counsellors for client assignment.</CardDescription>
          </div>
          <Dialog open={isCounsellorDialogOpen} onOpenChange={(open) => {
            setIsCounsellorDialogOpen(open);
            if (!open) resetCounsellorForm();
          }}>
            <DialogTrigger asChild>
              <Button size="sm" onClick={openAddCounsellorDialog}>
                <Plus className="w-4 h-4 mr-2" />
                Add Counsellor
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editingCounsellorId ? "Edit Counsellor" : "Add Counsellor"}</DialogTitle>
                <DialogDescription>
                  {editingCounsellorId ? "Update counsellor details." : "Add a new counsellor to the system."}
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="counsellor-name">Counsellor Name</Label>
                  <Input
                    id="counsellor-name"
                    placeholder="e.g. John Doe"
                    value={counsellorFormData.name}
                    onChange={(e) => setCounsellorFormData({ ...counsellorFormData, name: e.target.value })}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsCounsellorDialogOpen(false)}>Cancel</Button>
                <Button onClick={handleSaveCounsellor}>{editingCounsellorId ? "Update" : "Add"}</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Counsellor Name</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {counsellors.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={2} className="h-24 text-center">
                      No counsellors found.
                    </TableCell>
                  </TableRow>
                ) : (
                  counsellors.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">{item.name}</TableCell>
                      <TableCell className="text-right">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8 mr-1 text-muted-foreground hover:text-primary"
                          onClick={() => openEditCounsellorDialog(item)}
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8 text-destructive"
                          onClick={() => handleDeleteCounsellor(item.id)}
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
        </TabsContent>

        <TabsContent value="assign-clients">
      <Card>
        <CardHeader>
          <div>
            <CardTitle>Assign Clients to Counsellors</CardTitle>
            <CardDescription>Manage client-counsellor assignments. Select clients and reassign to another counsellor.</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Counsellor wise Client List */}
          <div className="space-y-3">
            {counsellors.map((counsellor) => (
              <Collapsible key={counsellor.id} className="border rounded-lg">
                <CollapsibleTrigger className="flex items-center justify-between w-full p-4 hover:bg-muted/50">
                  <div className="flex items-center gap-3">
                    <ChevronDown className="w-4 h-4" />
                    <span className="font-medium">{counsellor.name}</span>
                    <span className="text-sm text-muted-foreground">
                      ({getCounsellorClients(counsellor.id).length} clients)
                    </span>
                  </div>
                </CollapsibleTrigger>
                <CollapsibleContent className="border-t p-4 space-y-2">
                  {getCounsellorClients(counsellor.id).length === 0 ? (
                    <p className="text-sm text-muted-foreground">No clients assigned</p>
                  ) : (
                    getCounsellorClients(counsellor.id).map((client) => (
                      <div key={client.id} className="flex items-center gap-3 p-2 hover:bg-muted rounded">
                        <Checkbox
                          checked={selectedClients.includes(client.id)}
                          onCheckedChange={() => toggleClientSelection(client.id)}
                          data-testid={`checkbox-client-${client.id}`}
                        />
                        <span className="text-sm">{client.name}</span>
                      </div>
                    ))
                  )}
                </CollapsibleContent>
              </Collapsible>
            ))}
          </div>

          {/* Assignment Section */}
          {selectedClients.length > 0 && (
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg space-y-4">
              <div>
                <p className="font-medium text-sm mb-2">
                  {selectedClients.length} client(s) selected
                </p>
                <div className="flex flex-col gap-3 mb-4">
                  <div>
                    <Label htmlFor="assign-to">Assign To Counsellor</Label>
                    <Select value={assignToId} onValueChange={setAssignToId}>
                      <SelectTrigger id="assign-to" data-testid="select-assign-counsellor">
                        <SelectValue placeholder="Select counsellor" />
                      </SelectTrigger>
                      <SelectContent>
                        {counsellors.map((counsellor) => (
                          <SelectItem key={counsellor.id} value={counsellor.id.toString()}>
                            {counsellor.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
              <div className="flex gap-2">
                <Button onClick={handleAssignClients} data-testid="button-assign-clients">
                  Assign Clients
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setSelectedClients([]);
                    setAssignToId("");
                  }}
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
        </TabsContent>
      </Tabs>
    </PageWrapper>
  );
}
