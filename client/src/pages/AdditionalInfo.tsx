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
import { useState, useEffect, useRef } from "react";
import { Trash2, Plus, Pencil, ArrowRight, Loader2 } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import api from "@/lib/api";
import { clientService } from "@/services/clientService";

export default function AdditionalInfo() {
  const { toast } = useToast();

  const [saleTypes, setSaleTypes] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Lead Types state
  const [leadTypes, setLeadTypes] = useState<any[]>([]);
  const [isLoadingLeadTypes, setIsLoadingLeadTypes] = useState(false);
  const [isSavingLeadType, setIsSavingLeadType] = useState(false);
  const [isLeadTypeDialogOpen, setIsLeadTypeDialogOpen] = useState(false);
  const [leadTypeMode, setLeadTypeMode] = useState<"add" | "edit">("add");
  const [editingLeadTypeId, setEditingLeadTypeId] = useState<number | null>(null);
  const [leadTypeFormData, setLeadTypeFormData] = useState({
    leadType: "",
  });

  const [leadTypeFieldErrors, setLeadTypeFieldErrors] = useState<{
    leadType?: string;
  }>({});

  // Client and counsellor data from API
  const [clients, setClients] = useState<any[]>([]);
  const [counsellors, setCounsellors] = useState<any[]>([]);
  const [isLoadingClients, setIsLoadingClients] = useState(false);
  const [isLoadingCounsellors, setIsLoadingCounsellors] = useState(false);
  const [isTransferring, setIsTransferring] = useState(false);

  // Transfer state
  const [selectedClientId, setSelectedClientId] = useState<number | null>(null);
  const [selectedClient, setSelectedClient] = useState<any | null>(null);
  const [selectedCounsellorId, setSelectedCounsellorId] = useState<number | null>(null);
  const [selectedCounsellor, setSelectedCounsellor] = useState<any | null>(null);
  const [clientSearchInput, setClientSearchInput] = useState("");
  const [counsellorSearchInput, setCounsellorSearchInput] = useState("");
  const [showClientList, setShowClientList] = useState(false);
  const [showCounsellorList, setShowCounsellorList] = useState(false);
  const clientDropdownRef = useRef<HTMLDivElement>(null);
  const counsellorDropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (clientDropdownRef.current && !clientDropdownRef.current.contains(event.target as Node)) {
        setShowClientList(false);
      }
      if (counsellorDropdownRef.current && !counsellorDropdownRef.current.contains(event.target as Node)) {
        setShowCounsellorList(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Fetch clients from API when search input changes (3+ chars)
  useEffect(() => {
    const fetchClients = async () => {
      if (clientSearchInput.length >= 3) {
        setIsLoadingClients(true);
        try {
          const data = await clientService.getAllClients(clientSearchInput);
          setClients(data || []);
        } catch (err) {
          console.error("Failed to fetch clients", err);
          setClients([]);
        } finally {
          setIsLoadingClients(false);
        }
      } else {
        setClients([]);
      }
    };

    const debounceTimer = setTimeout(() => {
      fetchClients();
    }, 300); // Debounce API calls

    return () => clearTimeout(debounceTimer);
  }, [clientSearchInput]);

  // Fetch counsellors from API when search input changes (3+ chars)
  useEffect(() => {
    const fetchCounsellors = async () => {
      if (counsellorSearchInput.length >= 3) {
        setIsLoadingCounsellors(true);
        try {
          const data = await clientService.getCounsellors(counsellorSearchInput);
          setCounsellors(data || []);
        } catch (err) {
          console.error("Failed to fetch counsellors", err);
          setCounsellors([]);
        } finally {
          setIsLoadingCounsellors(false);
        }
      } else {
        setCounsellors([]);
      }
    };

    const debounceTimer = setTimeout(() => {
      fetchCounsellors();
    }, 300); // Debounce API calls

    return () => clearTimeout(debounceTimer);
  }, [counsellorSearchInput]);

  const handleTransferClient = async () => {
    if (!selectedClientId || !selectedCounsellorId) {
      toast({
        title: "Error",
        description: "Please select both a client and a counsellor",
        variant: "destructive",
      });
      return;
    }

    if (!selectedClient || !selectedCounsellor) {
      toast({
        title: "Error",
        description: "Please select both a client and a counsellor",
        variant: "destructive",
      });
      return;
    }

    // Check if client is already assigned to this counsellor
    const currentCounsellorId = selectedClient.counsellorId || selectedClient.counsellor?.id || selectedClient.counsellorId;
    if (currentCounsellorId === selectedCounsellorId) {
      toast({
        title: "Error",
        description: "Client is already assigned to this counsellor",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsTransferring(true);
      const result = await clientService.transferClient(selectedClientId, selectedCounsellorId);

      const oldCounsellorName = selectedClient.counsellor?.name || selectedClient.counsellor?.fullName || selectedClient.counsellorName || "Unknown";
      const newCounsellorName = selectedCounsellor.fullName || selectedCounsellor.name || selectedCounsellor.fullname || "Unknown";
      const clientName = selectedClient.name || selectedClient.fullName || selectedClient.fullname || "Unknown";

      toast({
        title: "Success",
        description: `${clientName} transferred from ${oldCounsellorName} to ${newCounsellorName}`,
      });

      // Reset form
      setSelectedClientId(null);
      setSelectedClient(null);
      setSelectedCounsellorId(null);
      setSelectedCounsellor(null);
      setClientSearchInput("");
      setCounsellorSearchInput("");
      setShowClientList(false);
      setShowCounsellorList(false);
    } catch (err: any) {
      console.error("Failed to transfer client", err);
      toast({
        title: "Error",
        description: err.response?.data?.message || err.message || "Failed to transfer client",
        variant: "destructive",
      });
    } finally {
      setIsTransferring(false);
    }
  };

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [mode, setMode] = useState<"add" | "edit">("add");
  const [editingId, setEditingId] = useState<number | null>(null);

  const [formData, setFormData] = useState({
    saleType: "",
    amount: "",
    isCoreProduct: "No",
  });

  const [fieldErrors, setFieldErrors] = useState<{
    saleType?: string;
    amount?: string;
    isCoreProduct?: string;
  }>({});

  const fetchSaleTypes = async () => {
    try {
      setIsLoading(true);
      const res = await api.get("/api/sale-types");
      setSaleTypes(res.data.data || []);
    } catch {
      setSaleTypes([
        { id: 1, saleType: "Canada Student", amount: 50000, isCoreProduct: false },
        { id: 2, saleType: "UK Visa", amount: 35000, isCoreProduct: false },
        { id: 3, saleType: "IELTS Course", amount: 15000, isCoreProduct: true },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSaleTypes();
    fetchLeadTypes();
  }, []);

  // Lead Types functions
  const fetchLeadTypes = async () => {
    try {
      setIsLoadingLeadTypes(true);
      const res = await api.get("/api/lead-types");
      setLeadTypes(res.data.data || []);
    } catch (err: any) {
      console.error("Failed to fetch lead types:", err);
      // Set empty array on error
      setLeadTypes([]);
    } finally {
      setIsLoadingLeadTypes(false);
    }
  };

  const openAddLeadTypeDialog = () => {
    setLeadTypeMode("add");
    setEditingLeadTypeId(null);
    setLeadTypeFormData({ leadType: "" });
    setLeadTypeFieldErrors({});
    setIsLeadTypeDialogOpen(true);
  };

  const openEditLeadTypeDialog = (item: any) => {
    setLeadTypeMode("edit");
    const id = item.id || item.leadTypeId;
    setEditingLeadTypeId(id);
    setLeadTypeFormData({
      leadType: item.leadType || "",
    });
    setLeadTypeFieldErrors({});
    setIsLeadTypeDialogOpen(true);
  };

  const handleSaveLeadType = async () => {
    // Clear previous errors
    setLeadTypeFieldErrors({});

    if (!leadTypeFormData.leadType.trim()) {
      setLeadTypeFieldErrors({ leadType: "Lead type is required" });
      return;
    }

    try {
      setIsSavingLeadType(true);
      const payload = {
        leadType: leadTypeFormData.leadType.trim(),
      };

      if (leadTypeMode === "edit" && editingLeadTypeId !== null) {
        const response = await api.put(`/api/lead-types/${editingLeadTypeId}`, payload);
        if (response.data.success) {
          toast({
            title: "Updated",
            description: "Lead type updated successfully",
          });
          setIsLeadTypeDialogOpen(false);
          setEditingLeadTypeId(null);
          setLeadTypeFormData({ leadType: "" });
          setLeadTypeFieldErrors({});
          fetchLeadTypes();
          return;
        }
      } else {
        const response = await api.post("/api/lead-types", payload);
        if (response.data.success) {
          toast({
            title: "Added",
            description: "Lead type added successfully",
          });
          setIsLeadTypeDialogOpen(false);
          setEditingLeadTypeId(null);
          setLeadTypeFormData({ leadType: "" });
          setLeadTypeFieldErrors({});
          fetchLeadTypes();
          return;
        }
      }
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || "Save failed";

      // Parse error message to determine which field has the error
      if (errorMessage.toLowerCase().includes("lead type") ||
          errorMessage.toLowerCase().includes("already exists") ||
          errorMessage.toLowerCase().includes("duplicate")) {
        setLeadTypeFieldErrors({ leadType: errorMessage });
      } else {
        setLeadTypeFieldErrors({ leadType: errorMessage });
      }

      // Also show toast for general errors
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsSavingLeadType(false);
    }
  };

  const handleDeleteLeadType = async (id: number) => {
    try {
      await api.delete(`/api/lead-types/${id}`);
      setLeadTypes((prev) => prev.filter((x) => (x.id || x.leadTypeId) !== id));
      toast({ title: "Deleted", description: "Lead type removed" });
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.response?.data?.message || "Delete failed",
        variant: "destructive",
      });
    }
  };

  /* ---------- Dialog Actions ---------- */

  const openAddDialog = () => {
    setMode("add");
    setEditingId(null);
    setFormData({ saleType: "", amount: "", isCoreProduct: "No" });
    setFieldErrors({});
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
      isCoreProduct: item.isCoreProduct === true || item.isCoreProduct === "true" ? "Yes" : "No",
    });
    setFieldErrors({});
    setIsDialogOpen(true);
  };

  const handleSave = async () => {
    // Clear previous errors
    setFieldErrors({});

    if (!formData.saleType) {
      setFieldErrors({ saleType: "Sale type is required" });
      return;
    }

    try {
      setIsSaving(true);
      const payload = {
        saleType: formData.saleType,
        amount: formData.amount ? Number(formData.amount) : null,
        isCoreProduct: formData.isCoreProduct === "Yes",
      };

      if (mode === "edit" && editingId !== null) {
        const response = await api.put(`/api/sale-types/${editingId}`, payload);
        if (response.data.success) {
          toast({
            title: "Updated",
            description: "Sale type updated successfully",
          });
          setIsDialogOpen(false);
          setEditingId(null);
          setFormData({ saleType: "", amount: "", isCoreProduct: "No" });
          setFieldErrors({});
          fetchSaleTypes();
          return;
        }
      } else {
        const response = await api.post("/api/sale-types", payload);
        if (response.data.success) {
          toast({
            title: "Added",
            description: "Sale type added successfully",
          });
          setIsDialogOpen(false);
          setEditingId(null);
          setFormData({ saleType: "", amount: "", isCoreProduct: "No" });
          setFieldErrors({});
          fetchSaleTypes();
          return;
        }
      }
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || "Save failed";

      // Parse error message to determine which field has the error
      if (errorMessage.toLowerCase().includes("sale type") ||
          errorMessage.toLowerCase().includes("already exists") ||
          errorMessage.toLowerCase().includes("duplicate")) {
        setFieldErrors({ saleType: errorMessage });
      } else if (errorMessage.toLowerCase().includes("amount")) {
        setFieldErrors({ amount: errorMessage });
      } else if (errorMessage.toLowerCase().includes("core product")) {
        setFieldErrors({ isCoreProduct: errorMessage });
      } else {
        // If we can't determine the field, show on saleType as default
        setFieldErrors({ saleType: errorMessage });
      }

      // Also show toast for general errors
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await api.delete(`/api/sale-types/${id}`);
      setSaleTypes((prev) => prev.filter((x) => x.id !== id));
      toast({ title: "Deleted", description: "Sale type removed" });
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.response?.data?.message || "Delete failed",
        variant: "destructive",
      });
    }
  };

  return (
    <PageWrapper
      title="Additional Information"
      breadcrumbs={[{ label: "Additional Info" }]}
    >
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
                <TableHead>Is Core Product</TableHead>
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
                saleTypes.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>{item.saleType}</TableCell>
                    <TableCell>{item.isCoreProduct ? "Yes" : "No"}</TableCell>
                    <TableCell>
                      {item.amount ? `₹${item.amount}` : "N/A"}
                    </TableCell>
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
              {mode === "edit"
                ? "Update existing sale type"
                : "Create new sale type"}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="saleType">Sale Type</Label>
              <Input
                id="saleType"
                placeholder="e.g. Canada Student"
                value={formData.saleType}
                onChange={(e) => {
                  setFormData({ ...formData, saleType: e.target.value });
                  // Clear error when user starts typing
                  if (fieldErrors.saleType) {
                    setFieldErrors({ ...fieldErrors, saleType: undefined });
                  }
                }}
                className={fieldErrors.saleType ? "border-destructive" : ""}
              />
              {fieldErrors.saleType && (
                <p className="text-sm text-destructive mt-1">{fieldErrors.saleType}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="amount">Amount</Label>
              <Input
                id="amount"
                type="number"
                placeholder="0.00"
                value={formData.amount}
                onChange={(e) => {
                  setFormData({ ...formData, amount: e.target.value });
                  // Clear error when user starts typing
                  if (fieldErrors.amount) {
                    setFieldErrors({ ...fieldErrors, amount: undefined });
                  }
                }}
                className={fieldErrors.amount ? "border-destructive" : ""}
              />
              {fieldErrors.amount && (
                <p className="text-sm text-destructive mt-1">{fieldErrors.amount}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label>Is Core Product?</Label>
              <Select
                value={formData.isCoreProduct}
                onValueChange={(v) => {
                  setFormData({ ...formData, isCoreProduct: v });
                  // Clear error when user changes selection
                  if (fieldErrors.isCoreProduct) {
                    setFieldErrors({ ...fieldErrors, isCoreProduct: undefined });
                  }
                }}
              >
                <SelectTrigger className={fieldErrors.isCoreProduct ? "border-destructive" : ""}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Yes">Yes</SelectItem>
                  <SelectItem value="No">No</SelectItem>
                </SelectContent>
              </Select>
              {fieldErrors.isCoreProduct && (
                <p className="text-sm text-destructive mt-1">{fieldErrors.isCoreProduct}</p>
              )}
            </div>
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

      {/* Lead Types Section */}
      <Card className="mt-6">
        <CardHeader className="flex flex-row justify-between items-center">
          <div>
            <CardTitle>Lead Types</CardTitle>
            <CardDescription>Manage lead types</CardDescription>
          </div>
          <Button size="sm" onClick={openAddLeadTypeDialog}>
            <Plus className="w-4 h-4 mr-2" />
            Add Lead Type
          </Button>
        </CardHeader>

        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Lead Type</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {isLoadingLeadTypes ? (
                <TableRow>
                  <TableCell colSpan={2} className="text-center">
                    <Loader2 className="animate-spin mx-auto" />
                  </TableCell>
                </TableRow>
              ) : leadTypes.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={2} className="text-center text-muted-foreground">
                    No lead types found. Click "Add Lead Type" to create one.
                  </TableCell>
                </TableRow>
              ) : (
                leadTypes.map((item) => {
                  const itemId = item.id || item.leadTypeId;
                  return (
                    <TableRow key={itemId}>
                      <TableCell>{item.leadType}</TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openEditLeadTypeDialog(item)}
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-destructive"
                          onClick={() => handleDeleteLeadType(itemId)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Lead Type Dialog */}
      <Dialog open={isLeadTypeDialogOpen} onOpenChange={setIsLeadTypeDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {leadTypeMode === "edit" ? "Update Lead Type" : "Add Lead Type"}
            </DialogTitle>
            <DialogDescription>
              {leadTypeMode === "edit"
                ? "Update existing lead type"
                : "Create new lead type"}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="leadType">Lead Type</Label>
              <Input
                id="leadType"
                placeholder="e.g. Referral, Website, Social Media"
                value={leadTypeFormData.leadType}
                onChange={(e) => {
                  setLeadTypeFormData({ ...leadTypeFormData, leadType: e.target.value });
                  // Clear error when user starts typing
                  if (leadTypeFieldErrors.leadType) {
                    setLeadTypeFieldErrors({ leadType: undefined });
                  }
                }}
                className={leadTypeFieldErrors.leadType ? "border-destructive" : ""}
              />
              {leadTypeFieldErrors.leadType && (
                <p className="text-sm text-destructive mt-1">{leadTypeFieldErrors.leadType}</p>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsLeadTypeDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveLeadType} disabled={isSavingLeadType}>
              {isSavingLeadType && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {leadTypeMode === "edit" ? "Update Lead Type" : "Add"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Card className="mt-6">
        <CardHeader>
          <div>
            <CardTitle>Client Transfer</CardTitle>
            <CardDescription>
              Transfer individual clients to another counsellor
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Transfer Form */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
            {/* Client Search */}
            <div className="space-y-2 relative" ref={clientDropdownRef}>
              <Label>Select Client</Label>
              <Input
                data-testid="input-client-search"
                placeholder="Search client (3+ chars)"
                value={clientSearchInput}
                onChange={(e) => {
                  setClientSearchInput(e.target.value);
                  setShowClientList(true);
                  if (e.target.value.length < 3) {
                    setSelectedClientId(null);
                    setSelectedClient(null);
                  }
                }}
                onFocus={() => {
                  if (clientSearchInput.length >= 3) {
                    setShowClientList(true);
                  }
                }}
              />
              {showClientList && clientSearchInput.length >= 3 && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-gray-800 border rounded-md shadow-lg z-50 max-h-48 overflow-y-auto">
                  {isLoadingClients ? (
                    <div className="px-3 py-2 text-sm text-muted-foreground flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Loading clients...
                    </div>
                  ) : clients.length > 0 ? (
                    clients.map((client) => {
                      const clientId = client.clientId || client.id;
                      const clientName = client.name || client.fullName || client.fullname || "Unknown";
                      const counsellorName = client.counsellor?.name || client.counsellor?.fullName || client.counsellorName || "No Counsellor";
                      return (
                        <div
                          key={clientId}
                          className="px-3 py-2 hover:bg-slate-100 dark:hover:bg-gray-700 cursor-pointer border-b text-sm"
                          onClick={() => {
                            setSelectedClientId(clientId);
                            setSelectedClient(client);
                            setClientSearchInput(`${clientName} (${counsellorName})`);
                            setShowClientList(false);
                          }}
                          data-testid={`client-option-${clientId}`}
                        >
                          {clientName} ({counsellorName})
                        </div>
                      );
                    })
                  ) : (
                    <div className="px-3 py-2 text-sm text-muted-foreground">
                      No clients found
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="flex justify-center mb-2">
              <ArrowRight className="w-5 h-5 text-muted-foreground" />
            </div>

            {/* Counsellor Search */}
            <div className="space-y-2 relative" ref={counsellorDropdownRef}>
              <Label>Transfer To</Label>
              <Input
                data-testid="input-counsellor-search"
                placeholder="Search counsellor (3+ chars)"
                value={counsellorSearchInput}
                onChange={(e) => {
                  setCounsellorSearchInput(e.target.value);
                  setShowCounsellorList(true);
                  if (e.target.value.length < 3) {
                    setSelectedCounsellorId(null);
                    setSelectedCounsellor(null);
                  }
                }}
                onFocus={() => {
                  if (counsellorSearchInput.length >= 3) {
                    setShowCounsellorList(true);
                  }
                }}
              />
              {showCounsellorList && counsellorSearchInput.length >= 3 && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-gray-800 border rounded-md shadow-lg z-50 max-h-48 overflow-y-auto">
                  {isLoadingCounsellors ? (
                    <div className="px-3 py-2 text-sm text-muted-foreground flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Loading counsellors...
                    </div>
                  ) : counsellors.length > 0 ? (
                    counsellors.map((counsellor) => {
                      const counsellorId = counsellor.counsellorId || counsellor.id || counsellor.userId;
                      const counsellorName = counsellor.fullName || counsellor.name || counsellor.fullname || "Unknown";
                      return (
                        <div
                          key={counsellorId}
                          className="px-3 py-2 hover:bg-slate-100 dark:hover:bg-gray-700 cursor-pointer border-b text-sm"
                          onClick={() => {
                            setSelectedCounsellorId(counsellorId);
                            setSelectedCounsellor(counsellor);
                            setCounsellorSearchInput(counsellorName);
                            setShowCounsellorList(false);
                          }}
                          data-testid={`counsellor-option-${counsellorId}`}
                        >
                          {counsellorName}
                        </div>
                      );
                    })
                  ) : (
                    <div className="px-3 py-2 text-sm text-muted-foreground">
                      No counsellors found
                    </div>
                  )}
                </div>
              )}
            </div>

            <Button
              onClick={handleTransferClient}
              data-testid="button-transfer"
              disabled={isTransferring || !selectedClientId || !selectedCounsellorId}
            >
              {isTransferring && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Transfer
            </Button>
          </div>
        </CardContent>
      </Card>
    </PageWrapper>
  );
}
