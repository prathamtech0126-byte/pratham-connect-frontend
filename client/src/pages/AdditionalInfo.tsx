// import { PageWrapper } from "@/layout/PageWrapper";
// import {
//   Card,
//   CardContent,
//   CardDescription,
//   CardHeader,
//   CardTitle,
// } from "@/components/ui/card";
// import { Label } from "@/components/ui/label";
// import { Input } from "@/components/ui/input";
// import { Button } from "@/components/ui/button";
// import {
//   Table,
//   TableBody,
//   TableCell,
//   TableHead,
//   TableHeader,
//   TableRow,
// } from "@/components/ui/table";
// import {
//   Dialog,
//   DialogContent,
//   DialogDescription,
//   DialogFooter,
//   DialogHeader,
//   DialogTitle,
//   DialogTrigger,
// } from "@/components/ui/dialog";
// import { useToast } from "@/hooks/use-toast";
// import { useState, useEffect, useRef, useMemo } from "react";
// import { Trash2, Plus, Pencil, ArrowRight, Loader2, X } from "lucide-react";
// import {
//   Select,
//   SelectContent,
//   SelectItem,
//   SelectTrigger,
//   SelectValue,
// } from "@/components/ui/select";
// import { Checkbox } from "@/components/ui/checkbox";
// import api from "@/lib/api";
// import { clientService } from "@/services/clientService";

// export default function AdditionalInfo() {
//   const { toast } = useToast();

//   const [saleTypes, setSaleTypes] = useState<any[]>([]);
//   const [isLoading, setIsLoading] = useState(false);
//   const [isSaving, setIsSaving] = useState(false);

//   // Lead Types state
//   const [leadTypes, setLeadTypes] = useState<any[]>([]);
//   const [isLoadingLeadTypes, setIsLoadingLeadTypes] = useState(false);
//   const [isSavingLeadType, setIsSavingLeadType] = useState(false);
//   const [isLeadTypeDialogOpen, setIsLeadTypeDialogOpen] = useState(false);
//   const [leadTypeMode, setLeadTypeMode] = useState<"add" | "edit">("add");
//   const [editingLeadTypeId, setEditingLeadTypeId] = useState<number | null>(null);
//   const [leadTypeFormData, setLeadTypeFormData] = useState({
//     leadType: "",
//   });

//   const [leadTypeFieldErrors, setLeadTypeFieldErrors] = useState<{
//     leadType?: string;
//   }>({});

//   // Visa Category (sale-type-categories) state
//   const [visaCategories, setVisaCategories] = useState<any[]>([]);
//   const [isLoadingVisaCategories, setIsLoadingVisaCategories] = useState(false);
//   const [isSavingVisaCategory, setIsSavingVisaCategory] = useState(false);
//   const [isVisaCategoryDialogOpen, setIsVisaCategoryDialogOpen] = useState(false);
//   const [visaCategoryMode, setVisaCategoryMode] = useState<"add" | "edit">("add");
//   const [editingVisaCategoryId, setEditingVisaCategoryId] = useState<number | null>(null);
//   const [visaCategoryFormData, setVisaCategoryFormData] = useState({
//     name: "",
//     description: "",
//   });
//   const [visaCategoryFieldErrors, setVisaCategoryFieldErrors] = useState<{
//     name?: string;
//     description?: string;
//   }>({});

//   // Client and counsellor data from API
//   const [clients, setClients] = useState<any[]>([]);
//   const [allCounsellors, setAllCounsellors] = useState<any[]>([]);
//   const [isLoadingClients, setIsLoadingClients] = useState(false);
//   const [isLoadingCounsellors, setIsLoadingCounsellors] = useState(false);
//   const [isTransferring, setIsTransferring] = useState(false);

//   // Transfer state: multiple clients can be selected
//   const [selectedClients, setSelectedClients] = useState<Array<{ id: number; client: any }>>([]);
//   const [selectedCounsellorId, setSelectedCounsellorId] = useState<number | null>(null);
//   const [selectedCounsellor, setSelectedCounsellor] = useState<any | null>(null);
//   const [transferType, setTransferType] = useState<"full_transfer" | "owner_only_transfer_flag">("owner_only_transfer_flag");
//   //const [transferType, setTransferType] = useState<"full_transfer" | "owner_only_transfer_flag">("full_transfer");
//   const [clientSearchInput, setClientSearchInput] = useState("");
//   const [counsellorSearchInput, setCounsellorSearchInput] = useState("");
//   const [showClientList, setShowClientList] = useState(false);
//   const [showCounsellorList, setShowCounsellorList] = useState(false);
//   const clientDropdownRef = useRef<HTMLDivElement>(null);
//   const counsellorDropdownRef = useRef<HTMLDivElement>(null);

//   // Close dropdowns when clicking outside
//   useEffect(() => {
//     const handleClickOutside = (event: MouseEvent) => {
//       if (clientDropdownRef.current && !clientDropdownRef.current.contains(event.target as Node)) {
//         setShowClientList(false);
//       }
//       if (counsellorDropdownRef.current && !counsellorDropdownRef.current.contains(event.target as Node)) {
//         setShowCounsellorList(false);
//       }
//     };

//     document.addEventListener("mousedown", handleClickOutside);
//     return () => {
//       document.removeEventListener("mousedown", handleClickOutside);
//     };
//   }, []);

//   // Fetch clients from API when search input changes (3+ chars, trimmed)
//   useEffect(() => {
//     const term = clientSearchInput.trim();
//     const fetchClients = async () => {
//       if (term.length >= 3) {
//         setIsLoadingClients(true);
//         try {
//           const data = await clientService.getAllClients(term);
//           setClients(Array.isArray(data) ? data : []);
//         } catch (err) {
//           console.error("Failed to fetch clients", err);
//           setClients([]);
//         } finally {
//           setIsLoadingClients(false);
//         }
//       } else {
//         setClients([]);
//       }
//     };

//     const debounceTimer = setTimeout(() => fetchClients(), 300);
//     return () => clearTimeout(debounceTimer);
//   }, [clientSearchInput]);

//   // Load all counsellors once (Transfer To uses frontend-only search)
//   useEffect(() => {
//     let cancelled = false;
//     setIsLoadingCounsellors(true);
//     clientService
//       .getCounsellors()
//       .then((data) => {
//         if (!cancelled) setAllCounsellors(Array.isArray(data) ? data : []);
//       })
//       .catch((err) => {
//         if (!cancelled) setAllCounsellors([]);
//         console.error("Failed to fetch counsellors", err);
//       })
//       .finally(() => {
//         if (!cancelled) setIsLoadingCounsellors(false);
//       });
//     return () => {
//       cancelled = true;
//     };
//   }, []);

//   // Transfer To: filter counsellors on the frontend by search text (no backend search)
//   const filteredCounsellors = useMemo(() => {
//     const term = counsellorSearchInput.trim().toLowerCase();
//     if (term.length < 3) return [];
//     return allCounsellors.filter((c) => {
//       const name = (c.fullName || c.name || c.fullname || "").toLowerCase();
//       return name.includes(term);
//     });
//   }, [allCounsellors, counsellorSearchInput]);

//   const handleTransferClient = async () => {
//     if (selectedClients.length === 0 || !selectedCounsellorId || !selectedCounsellor) {
//       toast({
//         title: "Error",
//         description: "Please select at least one client and a counsellor",
//         variant: "destructive",
//       });
//       return;
//     }
//     // Single client: check if already assigned to this counsellor
//     if (selectedClients.length === 1) {
//       const client = selectedClients[0].client;
//       const currentCounsellorId = client.counsellorId || client.counsellor?.id || client.counsellorId;
//       if (currentCounsellorId === selectedCounsellorId) {
//         toast({
//           title: "Error",
//           description: "Client is already assigned to this counsellor",
//           variant: "destructive",
//         });
//         return;
//       }
//     }

//     try {
//       setIsTransferring(true);
//       const ids = selectedClients.map((c) => c.id);
//       const payload = ids.length === 1 ? ids[0] : ids;
//       await clientService.transferClient(payload, selectedCounsellorId, transferType);

//       const newCounsellorName = selectedCounsellor.fullName || selectedCounsellor.name || selectedCounsellor.fullname || "Unknown";

//       const title = "Success";
//       const description =
//         selectedClients.length === 1
//           ? (() => {
//               const c = selectedClients[0].client;
//               const clientName = c.name || c.fullName || c.fullname || "Unknown";
//               const oldCounsellorName = c.counsellor?.name || c.counsellor?.fullName || c.counsellorName || "Unknown";
//               return `${clientName} transferred from ${oldCounsellorName} to ${newCounsellorName}`;
//             })()
//           : `${selectedClients.length} clients transferred to ${newCounsellorName}`;

//       toast({ title, description });

//       // Reset form
//       setSelectedClients([]);
//       setSelectedCounsellorId(null);
//       setSelectedCounsellor(null);
//       setTransferType("full_transfer");
//       setClientSearchInput("");
//       setCounsellorSearchInput("");
//       setShowClientList(false);
//       setShowCounsellorList(false);
//     } catch (err: any) {
//       console.error("Failed to transfer client(s)", err);
//       const backendMessage =
//         err?.response?.data?.message ||
//         err?.response?.data?.error ||
//         err?.message ||
//         "Failed to transfer client(s)";
//       const isTransferTypeValidationError =
//         err?.response?.status === 400 && /transfertype|transfer type/i.test(String(backendMessage));

//       toast({
//         title: "Error",
//         description: isTransferTypeValidationError ? String(backendMessage) : backendMessage,
//         variant: "destructive",
//       });
//     } finally {
//       setIsTransferring(false);
//     }
//   };

//   const [isDialogOpen, setIsDialogOpen] = useState(false);
//   const [mode, setMode] = useState<"add" | "edit">("add");
//   const [editingId, setEditingId] = useState<number | null>(null);

//   const [formData, setFormData] = useState({
//     saleType: "",
//     amount: "",
//     categoryId: "",
//     isCoreProduct: "No",
//   });

//   const [fieldErrors, setFieldErrors] = useState<{
//     saleType?: string;
//     amount?: string;
//     categoryId?: string;
//     isCoreProduct?: string;
//   }>({});

//   const fetchSaleTypes = async () => {
//     try {
//       setIsLoading(true);
//       const res = await api.get("/api/sale-types");
//       setSaleTypes(res.data.data || []);
//     } catch {
//       setSaleTypes([
//         { id: 1, saleType: "Canada Student", amount: 50000, isCoreProduct: false },
//         { id: 2, saleType: "UK Visa", amount: 35000, isCoreProduct: false },
//         { id: 3, saleType: "IELTS Course", amount: 15000, isCoreProduct: true },
//       ]);
//     } finally {
//       setIsLoading(false);
//     }
//   };

//   const fetchVisaCategories = async () => {
//     try {
//       setIsLoadingVisaCategories(true);
//       const data = await clientService.getSaleTypeCategories();
//       setVisaCategories(Array.isArray(data) ? data : []);
//     } catch (err) {
//       console.error("Failed to fetch visa categories", err);
//       setVisaCategories([]);
//     } finally {
//       setIsLoadingVisaCategories(false);
//     }
//   };

//   useEffect(() => {
//     fetchSaleTypes();
//     fetchLeadTypes();
//     fetchVisaCategories();
//   }, []);

//   // Lead Types functions
//   const fetchLeadTypes = async () => {
//     try {
//       setIsLoadingLeadTypes(true);
//       const res = await api.get("/api/lead-types");
//       setLeadTypes(res.data.data || []);
//     } catch (err: any) {
//       console.error("Failed to fetch lead types:", err);
//       // Set empty array on error
//       setLeadTypes([]);
//     } finally {
//       setIsLoadingLeadTypes(false);
//     }
//   };

//   const openAddLeadTypeDialog = () => {
//     setLeadTypeMode("add");
//     setEditingLeadTypeId(null);
//     setLeadTypeFormData({ leadType: "" });
//     setLeadTypeFieldErrors({});
//     setIsLeadTypeDialogOpen(true);
//   };

//   const openEditLeadTypeDialog = (item: any) => {
//     setLeadTypeMode("edit");
//     const id = item.id || item.leadTypeId;
//     setEditingLeadTypeId(id);
//     setLeadTypeFormData({
//       leadType: item.leadType || "",
//     });
//     setLeadTypeFieldErrors({});
//     setIsLeadTypeDialogOpen(true);
//   };

//   const handleSaveLeadType = async () => {
//     // Clear previous errors
//     setLeadTypeFieldErrors({});

//     if (!leadTypeFormData.leadType.trim()) {
//       setLeadTypeFieldErrors({ leadType: "Lead type is required" });
//       return;
//     }

//     try {
//       setIsSavingLeadType(true);
//       const payload = {
//         leadType: leadTypeFormData.leadType.trim(),
//       };

//       if (leadTypeMode === "edit" && editingLeadTypeId !== null) {
//         const response = await api.put(`/api/lead-types/${editingLeadTypeId}`, payload);
//         if (response.data.success) {
//           toast({
//             title: "Updated",
//             description: "Lead type updated successfully",
//           });
//           setIsLeadTypeDialogOpen(false);
//           setEditingLeadTypeId(null);
//           setLeadTypeFormData({ leadType: "" });
//           setLeadTypeFieldErrors({});
//           fetchLeadTypes();
//           return;
//         }
//       } else {
//         const response = await api.post("/api/lead-types", payload);
//         if (response.data.success) {
//           toast({
//             title: "Added",
//             description: "Lead type added successfully",
//           });
//           setIsLeadTypeDialogOpen(false);
//           setEditingLeadTypeId(null);
//           setLeadTypeFormData({ leadType: "" });
//           setLeadTypeFieldErrors({});
//           fetchLeadTypes();
//           return;
//         }
//       }
//     } catch (err: any) {
//       const errorMessage = err.response?.data?.message || "Save failed";

//       // Parse error message to determine which field has the error
//       if (errorMessage.toLowerCase().includes("lead type") ||
//           errorMessage.toLowerCase().includes("already exists") ||
//           errorMessage.toLowerCase().includes("duplicate")) {
//         setLeadTypeFieldErrors({ leadType: errorMessage });
//       } else {
//         setLeadTypeFieldErrors({ leadType: errorMessage });
//       }

//       // Also show toast for general errors
//       toast({
//         title: "Error",
//         description: errorMessage,
//         variant: "destructive",
//       });
//     } finally {
//       setIsSavingLeadType(false);
//     }
//   };

//   const handleDeleteLeadType = async (id: number) => {
//     try {
//       await api.delete(`/api/lead-types/${id}`);
//       setLeadTypes((prev) => prev.filter((x) => (x.id || x.leadTypeId) !== id));
//       toast({ title: "Deleted", description: "Lead type removed" });
//     } catch (err: any) {
//       toast({
//         title: "Error",
//         description: err.response?.data?.message || "Delete failed",
//         variant: "destructive",
//       });
//     }
//   };

//   // Visa Category (sale-type-categories) handlers
//   const openAddVisaCategoryDialog = () => {
//     setVisaCategoryMode("add");
//     setEditingVisaCategoryId(null);
//     setVisaCategoryFormData({ name: "", description: "" });
//     setVisaCategoryFieldErrors({});
//     setIsVisaCategoryDialogOpen(true);
//   };

//   const openEditVisaCategoryDialog = (item: any) => {
//     setVisaCategoryMode("edit");
//     const id = item.id ?? item.categoryId;
//     setEditingVisaCategoryId(id);
//     setVisaCategoryFormData({
//       name: item.name ?? "",
//       description: item.description ?? "",
//     });
//     setVisaCategoryFieldErrors({});
//     setIsVisaCategoryDialogOpen(true);
//   };

//   const handleSaveVisaCategory = async () => {
//     setVisaCategoryFieldErrors({});
//     if (!visaCategoryFormData.name.trim()) {
//       setVisaCategoryFieldErrors({ name: "Name is required" });
//       return;
//     }
//     try {
//       setIsSavingVisaCategory(true);
//       const payload = {
//         name: visaCategoryFormData.name.trim(),
//         description: visaCategoryFormData.description.trim() || undefined,
//       };
//       if (visaCategoryMode === "edit" && editingVisaCategoryId !== null) {
//         await clientService.updateSaleTypeCategory(editingVisaCategoryId, payload);
//         toast({ title: "Updated", description: "Visa category updated successfully" });
//       } else {
//         await clientService.createSaleTypeCategory(payload);
//         toast({ title: "Added", description: "Visa category added successfully" });
//       }
//       setIsVisaCategoryDialogOpen(false);
//       setEditingVisaCategoryId(null);
//       setVisaCategoryFormData({ name: "", description: "" });
//       fetchVisaCategories();
//     } catch (err: any) {
//       const msg = err.response?.data?.message || "Save failed";
//       if (msg.toLowerCase().includes("name") || msg.toLowerCase().includes("already exists")) {
//         setVisaCategoryFieldErrors({ name: msg });
//       } else {
//         setVisaCategoryFieldErrors({ name: msg });
//       }
//       toast({ title: "Error", description: msg, variant: "destructive" });
//     } finally {
//       setIsSavingVisaCategory(false);
//     }
//   };

//   const handleDeleteVisaCategory = async (id: number) => {
//     try {
//       await clientService.deleteSaleTypeCategory(id);
//       setVisaCategories((prev) => prev.filter((x) => (x.id ?? x.categoryId) !== id));
//       toast({ title: "Deleted", description: "Visa category removed" });
//     } catch (err: any) {
//       toast({
//         title: "Error",
//         description: err.response?.data?.message || "Delete failed",
//         variant: "destructive",
//       });
//     }
//   };

//   /* ---------- Dialog Actions ---------- */

//   const openAddDialog = () => {
//     setMode("add");
//     setEditingId(null);
//     setFormData({ saleType: "", amount: "", categoryId: "", isCoreProduct: "No" });
//     setFieldErrors({});
//     setIsDialogOpen(true);
//   };

//   const openEditDialog = (item: any) => {
//     setMode("edit");
//     // Only use 'id' as requested
//     const id = item.id;
//     setEditingId(id);
//     const byCategoryName = (() => {
//       const name = (item.categoryName ?? item.category?.name ?? "").toString().trim().toLowerCase();
//       if (!name) return "";
//       const match = visaCategories.find((c: any) => (c?.name ?? "").toString().trim().toLowerCase() === name);
//       return match?.id != null ? String(match.id) : "";
//     })();
//     setFormData({
//       saleType: item.saleType || "",
//       amount: item.amount?.toString() || "",
//       categoryId: (item.categoryId ?? item.category?.id ?? item.category?.categoryId ?? byCategoryName ?? "").toString(),
//       isCoreProduct: item.isCoreProduct === true || item.isCoreProduct === "true" ? "Yes" : "No",
//     });
//     setFieldErrors({});
//     setIsDialogOpen(true);
//   };

//   const handleSave = async () => {
//     // Clear previous errors
//     setFieldErrors({});

//     if (!formData.saleType) {
//       setFieldErrors({ saleType: "Sale type is required" });
//       return;
//     }
//     if (!formData.categoryId) {
//       setFieldErrors({ categoryId: "Category is required" });
//       return;
//     }

//     try {
//       setIsSaving(true);
//       const payload = {
//         saleType: formData.saleType,
//         amount: formData.amount ? Number(formData.amount) : null,
//         categoryId: Number(formData.categoryId),
//         isCoreProduct: formData.isCoreProduct === "Yes",
//       };

//       if (mode === "edit" && editingId !== null) {
//         const response = await api.put(`/api/sale-types/${editingId}`, payload);
//         if (response.data.success) {
//           toast({
//             title: "Updated",
//             description: "Sale type updated successfully",
//           });
//           setIsDialogOpen(false);
//           setEditingId(null);
//           setFormData({ saleType: "", amount: "", categoryId: "", isCoreProduct: "No" });
//           setFieldErrors({});
//           fetchSaleTypes();
//           return;
//         }
//       } else {
//         const response = await api.post("/api/sale-types", payload);
//         if (response.data.success) {
//           toast({
//             title: "Added",
//             description: "Sale type added successfully",
//           });
//           setIsDialogOpen(false);
//           setEditingId(null);
//           setFormData({ saleType: "", amount: "", categoryId: "", isCoreProduct: "No" });
//           setFieldErrors({});
//           fetchSaleTypes();
//           return;
//         }
//       }
//     } catch (err: any) {
//       const errorMessage = err.response?.data?.message || "Save failed";

//       // Parse error message to determine which field has the error
//       if (errorMessage.toLowerCase().includes("sale type") ||
//           errorMessage.toLowerCase().includes("already exists") ||
//           errorMessage.toLowerCase().includes("duplicate")) {
//         setFieldErrors({ saleType: errorMessage });
//       } else if (errorMessage.toLowerCase().includes("category")) {
//         setFieldErrors({ categoryId: errorMessage });
//       } else if (errorMessage.toLowerCase().includes("amount")) {
//         setFieldErrors({ amount: errorMessage });
//       } else if (errorMessage.toLowerCase().includes("core product")) {
//         setFieldErrors({ isCoreProduct: errorMessage });
//       } else {
//         // If we can't determine the field, show on saleType as default
//         setFieldErrors({ saleType: errorMessage });
//       }

//       // Also show toast for general errors
//       toast({
//         title: "Error",
//         description: errorMessage,
//         variant: "destructive",
//       });
//     } finally {
//       setIsSaving(false);
//     }
//   };

//   const handleDelete = async (id: number) => {
//     try {
//       await api.delete(`/api/sale-types/${id}`);
//       setSaleTypes((prev) => prev.filter((x) => x.id !== id));
//       toast({ title: "Deleted", description: "Sale type removed" });
//     } catch (err: any) {
//       toast({
//         title: "Error",
//         description: err.response?.data?.message || "Delete failed",
//         variant: "destructive",
//       });
//     }
//   };

//   return (
//     <PageWrapper
//       title="Additional Information"
//       breadcrumbs={[{ label: "Additional Info" }]}
//     >
//       <Card>
//         <CardHeader className="flex flex-row justify-between items-center">
//           <div>
//             <CardTitle>Sale Types & Payment</CardTitle>
//             <CardDescription>Manage sale types</CardDescription>
//           </div>
//           <Button size="sm" onClick={openAddDialog}>
//             <Plus className="w-4 h-4 mr-2" />
//             Add Sale Type
//           </Button>
//         </CardHeader>

//         <CardContent>
//           <Table>
//             <TableHeader>
//               <TableRow>
//                 <TableHead>Sale Type</TableHead>
//                 <TableHead>Category</TableHead>
//                 <TableHead>Is Core Product</TableHead>
//                 <TableHead>Amount</TableHead>
//                 <TableHead className="text-right">Actions</TableHead>
//               </TableRow>
//             </TableHeader>

//             <TableBody>
//               {isLoading ? (
//                 <TableRow>
//                   <TableCell colSpan={5} className="text-center">
//                     <Loader2 className="animate-spin mx-auto" />
//                   </TableCell>
//                 </TableRow>
//               ) : (
//                 saleTypes.map((item) => (
//                   <TableRow key={item.id}>
//                     <TableCell>{item.saleType}</TableCell>
//                     <TableCell className="text-muted-foreground">
//                       {(() => {
//                         if (item.categoryName) return item.categoryName;
//                         const cid = item.categoryId ?? item.category?.id ?? item.category?.categoryId;
//                         if (cid == null) return "—";
//                         const match = visaCategories.find((c: any) => Number(c.id) === Number(cid));
//                         return match?.name ?? `#${cid}`;
//                       })()}
//                     </TableCell>
//                     <TableCell>{item.isCoreProduct ? "Yes" : "No"}</TableCell>
//                     <TableCell>
//                       {item.amount ? `₹${item.amount}` : "N/A"}
//                     </TableCell>
//                     <TableCell className="text-right">
//                       <Button
//                         variant="ghost"
//                         size="icon"
//                         onClick={() => openEditDialog(item)}
//                       >
//                         <Pencil className="w-4 h-4" />
//                       </Button>
//                       <Button
//                         variant="ghost"
//                         size="icon"
//                         className="text-destructive"
//                         onClick={() => handleDelete(item.id)}
//                       >
//                         <Trash2 className="w-4 h-4" />
//                       </Button>
//                     </TableCell>
//                   </TableRow>
//                 ))
//               )}
//             </TableBody>
//           </Table>
//         </CardContent>
//       </Card>

//       {/* ---------- Dialog ---------- */}
//       <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
//         <DialogContent>
//           <DialogHeader>
//             <DialogTitle>
//               {mode === "edit" ? "Update Sale Type" : "Add Sale Type"}
//             </DialogTitle>
//             <DialogDescription>
//               {mode === "edit"
//                 ? "Update existing sale type"
//                 : "Create new sale type"}
//             </DialogDescription>
//           </DialogHeader>

//           <div className="space-y-4 py-2">
//             <div className="space-y-2">
//               <Label htmlFor="saleType">Sale Type</Label>
//               <Input
//                 id="saleType"
//                 placeholder="e.g. Canada Student"
//                 value={formData.saleType}
//                 onChange={(e) => {
//                   setFormData({ ...formData, saleType: e.target.value });
//                   // Clear error when user starts typing
//                   if (fieldErrors.saleType) {
//                     setFieldErrors({ ...fieldErrors, saleType: undefined });
//                   }
//                 }}
//                 className={fieldErrors.saleType ? "border-destructive" : ""}
//               />
//               {fieldErrors.saleType && (
//                 <p className="text-sm text-destructive mt-1">{fieldErrors.saleType}</p>
//               )}
//             </div>

//             <div className="space-y-2">
//               <Label>Category</Label>
//               <Select
//                 value={formData.categoryId}
//                 onValueChange={(v) => {
//                   setFormData({ ...formData, categoryId: v });
//                   if (fieldErrors.categoryId) {
//                     setFieldErrors({ ...fieldErrors, categoryId: undefined });
//                   }
//                 }}
//                 disabled={isLoadingVisaCategories}
//               >
//                 <SelectTrigger className={fieldErrors.categoryId ? "border-destructive" : ""}>
//                   <SelectValue placeholder={isLoadingVisaCategories ? "Loading categories..." : "Select category"} />
//                 </SelectTrigger>
//                 <SelectContent>
//                   {visaCategories.length === 0 ? (
//                     <div className="p-2 text-sm text-center text-muted-foreground">
//                       No categories found
//                     </div>
//                   ) : (
//                     visaCategories.map((c: any) => (
//                       <SelectItem key={c.id} value={String(c.id)}>
//                         {c.name}
//                       </SelectItem>
//                     ))
//                   )}
//                 </SelectContent>
//               </Select>
//               {fieldErrors.categoryId && (
//                 <p className="text-sm text-destructive mt-1">{fieldErrors.categoryId}</p>
//               )}
//             </div>

//             <div className="space-y-2">
//               <Label htmlFor="amount">Amount</Label>
//               <Input
//                 id="amount"
//                 type="number"
//                 placeholder="0.00"
//                 value={formData.amount}
//                 onChange={(e) => {
//                   setFormData({ ...formData, amount: e.target.value });
//                   // Clear error when user starts typing
//                   if (fieldErrors.amount) {
//                     setFieldErrors({ ...fieldErrors, amount: undefined });
//                   }
//                 }}
//                 className={fieldErrors.amount ? "border-destructive" : ""}
//               />
//               {fieldErrors.amount && (
//                 <p className="text-sm text-destructive mt-1">{fieldErrors.amount}</p>
//               )}
//             </div>

//             <div className="space-y-2">
//               <Label>Is Core Product?</Label>
//               <Select
//                 value={formData.isCoreProduct}
//                 onValueChange={(v) => {
//                   setFormData({ ...formData, isCoreProduct: v });
//                   // Clear error when user changes selection
//                   if (fieldErrors.isCoreProduct) {
//                     setFieldErrors({ ...fieldErrors, isCoreProduct: undefined });
//                   }
//                 }}
//               >
//                 <SelectTrigger className={fieldErrors.isCoreProduct ? "border-destructive" : ""}>
//                   <SelectValue />
//                 </SelectTrigger>
//                 <SelectContent>
//                   <SelectItem value="Yes">Yes</SelectItem>
//                   <SelectItem value="No">No</SelectItem>
//                 </SelectContent>
//               </Select>
//               {fieldErrors.isCoreProduct && (
//                 <p className="text-sm text-destructive mt-1">{fieldErrors.isCoreProduct}</p>
//               )}
//             </div>
//           </div>

//           <DialogFooter>
//             <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
//               Cancel
//             </Button>
//             <Button onClick={handleSave} disabled={isSaving}>
//               {isSaving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
//               {mode === "edit" ? "Update Sale Type" : "Add"}
//             </Button>
//           </DialogFooter>
//         </DialogContent>
//       </Dialog>

//       {/* Lead Types Section */}
//       <Card className="mt-6">
//         <CardHeader className="flex flex-row justify-between items-center">
//           <div>
//             <CardTitle>Lead Types</CardTitle>
//             <CardDescription>Manage lead types</CardDescription>
//           </div>
//           <Button size="sm" onClick={openAddLeadTypeDialog}>
//             <Plus className="w-4 h-4 mr-2" />
//             Add Lead Type
//           </Button>
//         </CardHeader>

//         <CardContent>
//           <Table>
//             <TableHeader>
//               <TableRow>
//                 <TableHead>Lead Type</TableHead>
//                 <TableHead className="text-right">Actions</TableHead>
//               </TableRow>
//             </TableHeader>

//             <TableBody>
//               {isLoadingLeadTypes ? (
//                 <TableRow>
//                   <TableCell colSpan={2} className="text-center">
//                     <Loader2 className="animate-spin mx-auto" />
//                   </TableCell>
//                 </TableRow>
//               ) : leadTypes.length === 0 ? (
//                 <TableRow>
//                   <TableCell colSpan={2} className="text-center text-muted-foreground">
//                     No lead types found. Click "Add Lead Type" to create one.
//                   </TableCell>
//                 </TableRow>
//               ) : (
//                 leadTypes.map((item) => {
//                   const itemId = item.id || item.leadTypeId;
//                   return (
//                     <TableRow key={itemId}>
//                       <TableCell>{item.leadType}</TableCell>
//                       <TableCell className="text-right">
//                         <Button
//                           variant="ghost"
//                           size="icon"
//                           onClick={() => openEditLeadTypeDialog(item)}
//                         >
//                           <Pencil className="w-4 h-4" />
//                         </Button>
//                         <Button
//                           variant="ghost"
//                           size="icon"
//                           className="text-destructive"
//                           onClick={() => handleDeleteLeadType(itemId)}
//                         >
//                           <Trash2 className="w-4 h-4" />
//                         </Button>
//                       </TableCell>
//                     </TableRow>
//                   );
//                 })
//               )}
//             </TableBody>
//           </Table>
//         </CardContent>
//       </Card>

//       {/* Lead Type Dialog */}
//       <Dialog open={isLeadTypeDialogOpen} onOpenChange={setIsLeadTypeDialogOpen}>
//         <DialogContent>
//           <DialogHeader>
//             <DialogTitle>
//               {leadTypeMode === "edit" ? "Update Lead Type" : "Add Lead Type"}
//             </DialogTitle>
//             <DialogDescription>
//               {leadTypeMode === "edit"
//                 ? "Update existing lead type"
//                 : "Create new lead type"}
//             </DialogDescription>
//           </DialogHeader>

//           <div className="space-y-4 py-2">
//             <div className="space-y-2">
//               <Label htmlFor="leadType">Lead Type</Label>
//               <Input
//                 id="leadType"
//                 placeholder="e.g. Referral, Website, Social Media"
//                 value={leadTypeFormData.leadType}
//                 onChange={(e) => {
//                   setLeadTypeFormData({ ...leadTypeFormData, leadType: e.target.value });
//                   // Clear error when user starts typing
//                   if (leadTypeFieldErrors.leadType) {
//                     setLeadTypeFieldErrors({ leadType: undefined });
//                   }
//                 }}
//                 className={leadTypeFieldErrors.leadType ? "border-destructive" : ""}
//               />
//               {leadTypeFieldErrors.leadType && (
//                 <p className="text-sm text-destructive mt-1">{leadTypeFieldErrors.leadType}</p>
//               )}
//             </div>
//           </div>

//           <DialogFooter>
//             <Button variant="outline" onClick={() => setIsLeadTypeDialogOpen(false)}>
//               Cancel
//             </Button>
//             <Button onClick={handleSaveLeadType} disabled={isSavingLeadType}>
//               {isSavingLeadType && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
//               {leadTypeMode === "edit" ? "Update Lead Type" : "Add"}
//             </Button>
//           </DialogFooter>
//         </DialogContent>
//       </Dialog>

//       {/* Visa Category Section (sale-type-categories API) */}
//       <Card className="mt-6">
//         <CardHeader className="flex flex-row justify-between items-center">
//           <div>
//             <CardTitle>Visa Category</CardTitle>
//             <CardDescription>Manage visa categories (e.g. Student, Spouse, Visitor)</CardDescription>
//           </div>
//           <Button size="sm" onClick={openAddVisaCategoryDialog}>
//             <Plus className="w-4 h-4 mr-2" />
//             Add Visa Category
//           </Button>
//         </CardHeader>
//         <CardContent>
//           <Table>
//             <TableHeader>
//               <TableRow>
//                 <TableHead>Name</TableHead>
//                 <TableHead>Description</TableHead>
//                 <TableHead className="text-right">Actions</TableHead>
//               </TableRow>
//             </TableHeader>
//             <TableBody>
//               {isLoadingVisaCategories ? (
//                 <TableRow>
//                   <TableCell colSpan={3} className="text-center">
//                     <Loader2 className="animate-spin mx-auto" />
//                   </TableCell>
//                 </TableRow>
//               ) : visaCategories.length === 0 ? (
//                 <TableRow>
//                   <TableCell colSpan={3} className="text-center text-muted-foreground">
//                     No visa categories found. Click &quot;Add Visa Category&quot; to create one.
//                   </TableCell>
//                 </TableRow>
//               ) : (
//                 visaCategories.map((item) => {
//                   const itemId = item.id ?? item.categoryId;
//                   return (
//                     <TableRow key={itemId}>
//                       <TableCell>{item.name}</TableCell>
//                       <TableCell className="text-muted-foreground max-w-[200px] truncate" title={item.description}>
//                         {item.description || "—"}
//                       </TableCell>
//                       <TableCell className="text-right">
//                         <Button
//                           variant="ghost"
//                           size="icon"
//                           onClick={() => openEditVisaCategoryDialog(item)}
//                         >
//                           <Pencil className="w-4 h-4" />
//                         </Button>
//                         <Button
//                           variant="ghost"
//                           size="icon"
//                           className="text-destructive"
//                           onClick={() => handleDeleteVisaCategory(itemId)}
//                         >
//                           <Trash2 className="w-4 h-4" />
//                         </Button>
//                       </TableCell>
//                     </TableRow>
//                   );
//                 })
//               )}
//             </TableBody>
//           </Table>
//         </CardContent>
//       </Card>

//       {/* Visa Category Dialog */}
//       <Dialog open={isVisaCategoryDialogOpen} onOpenChange={setIsVisaCategoryDialogOpen}>
//         <DialogContent>
//           <DialogHeader>
//             <DialogTitle>
//               {visaCategoryMode === "edit" ? "Update Visa Category" : "Add Visa Category"}
//             </DialogTitle>
//             <DialogDescription>
//               {visaCategoryMode === "edit"
//                 ? "Update name and description"
//                 : "Create a new visa category (e.g. Student visa / study)"}
//             </DialogDescription>
//           </DialogHeader>
//           <div className="space-y-4 py-2">
//             <div className="space-y-2">
//               <Label htmlFor="visaCategoryName">Name</Label>
//               <Input
//                 id="visaCategoryName"
//                 placeholder="e.g. student"
//                 value={visaCategoryFormData.name}
//                 onChange={(e) => {
//                   setVisaCategoryFormData({ ...visaCategoryFormData, name: e.target.value });
//                   if (visaCategoryFieldErrors.name) setVisaCategoryFieldErrors({ ...visaCategoryFieldErrors, name: undefined });
//                 }}
//                 className={visaCategoryFieldErrors.name ? "border-destructive" : ""}
//               />
//               {visaCategoryFieldErrors.name && (
//                 <p className="text-sm text-destructive mt-1">{visaCategoryFieldErrors.name}</p>
//               )}
//             </div>
//             <div className="space-y-2">
//               <Label htmlFor="visaCategoryDesc">Description</Label>
//               <Input
//                 id="visaCategoryDesc"
//                 placeholder="e.g. Student visa / study"
//                 value={visaCategoryFormData.description}
//                 onChange={(e) => {
//                   setVisaCategoryFormData({ ...visaCategoryFormData, description: e.target.value });
//                   if (visaCategoryFieldErrors.description) setVisaCategoryFieldErrors({ ...visaCategoryFieldErrors, description: undefined });
//                 }}
//                 className={visaCategoryFieldErrors.description ? "border-destructive" : ""}
//               />
//               {visaCategoryFieldErrors.description && (
//                 <p className="text-sm text-destructive mt-1">{visaCategoryFieldErrors.description}</p>
//               )}
//             </div>
//           </div>
//           <DialogFooter>
//             <Button variant="outline" onClick={() => setIsVisaCategoryDialogOpen(false)}>
//               Cancel
//             </Button>
//             <Button onClick={handleSaveVisaCategory} disabled={isSavingVisaCategory}>
//               {isSavingVisaCategory && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
//               {visaCategoryMode === "edit" ? "Update Visa Category" : "Add"}
//             </Button>
//           </DialogFooter>
//         </DialogContent>
//       </Dialog>

//       <Card className="mt-6">
//         <CardHeader>
//           <div>
//             <CardTitle>Transfer Client</CardTitle>
//             <CardDescription>
//               Transfer individual clients to another counsellor
//             </CardDescription>
//           </div>
//         </CardHeader>
//         <CardContent className="space-y-6">
//           {/* Transfer Form */}
//           <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
//             {/* Client Search - multi-select with checkboxes; selected shown as chips with cancel */}
//             <div className="space-y-2 relative w-full min-w-0" ref={clientDropdownRef}>
//               <Label>Select Client(s)</Label>
//               <div
//                 className="flex flex-wrap items-center gap-1.5 rounded-md border border-input bg-background px-3 py-2 min-h-[2.5rem] text-sm ring-offset-background focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2"
//                 onClick={() => document.getElementById("client-search-input")?.focus()}
//               >
//                 {selectedClients.map(({ id, client }) => {
//                   const name = client.name || client.fullName || client.fullname || "Unknown";
//                   return (
//                     <span
//                       key={id}
//                       className="inline-flex items-center gap-1 rounded-md bg-muted px-2 py-1 text-xs font-medium"
//                     >
//                       {name}
//                       <button
//                         type="button"
//                         onClick={(e) => {
//                           e.stopPropagation();
//                           setSelectedClients((prev) => prev.filter((c) => c.id !== id));
//                         }}
//                         className="rounded p-0.5 hover:bg-muted-foreground/20"
//                         aria-label={`Remove ${name}`}
//                         data-testid={`client-remove-${id}`}
//                       >
//                         <X className="h-3.5 w-3.5" />
//                       </button>
//                     </span>
//                   );
//                 })}
//                 <input
//                   id="client-search-input"
//                   data-testid="input-client-search"
//                   placeholder={selectedClients.length === 0 ? "Search client (3+ chars)" : "Add more..."}
//                   value={clientSearchInput}
//                   onChange={(e) => {
//                     setClientSearchInput(e.target.value);
//                     setShowClientList(true);
//                   }}
//                   onFocus={() => {
//                     if (clientSearchInput.trim().length >= 3) {
//                       setShowClientList(true);
//                     }
//                   }}
//                   className="flex-1 min-w-[120px] border-0 bg-transparent p-0 outline-none placeholder:text-muted-foreground"
//                 />
//               </div>
//               {showClientList && clientSearchInput.trim().length >= 3 && (
//                 <div className="absolute bottom-full left-0 right-0 z-[100] mb-1.5 w-full min-w-[12rem] max-h-56 overflow-y-auto rounded-md border border-border bg-popover text-popover-foreground shadow-md">
//                   {isLoadingClients ? (
//                     <div className="px-3 py-2 text-sm text-muted-foreground flex items-center gap-2">
//                       <Loader2 className="w-4 h-4 animate-spin" />
//                       Loading clients...
//                     </div>
//                   ) : clients.length > 0 ? (
//                     clients.map((client) => {
//                       const clientId = client.clientId || client.id;
//                       const clientName = client.name || client.fullName || client.fullname || "Unknown";
//                       const counsellorName = client.counsellor?.name || client.counsellor?.fullName || client.counsellorName;
//                       const isSelected = selectedClients.some((c) => c.id === clientId);
//                       return (
//                         <div
//                           key={clientId}
//                           className="flex items-center gap-2 px-3 py-2 text-sm cursor-pointer border-b border-border/40 last:border-0 hover:bg-accent"
//                           onClick={() => {
//                             setSelectedClients((prev) =>
//                               isSelected
//                                 ? prev.filter((c) => c.id !== clientId)
//                                 : [...prev.filter((c) => c.id !== clientId), { id: clientId, client }]
//                             );
//                           }}
//                           data-testid={`client-option-${clientId}`}
//                         >
//                           <Checkbox
//                             checked={isSelected}
//                             onCheckedChange={() => {
//                               setSelectedClients((prev) =>
//                                 isSelected
//                                   ? prev.filter((c) => c.id !== clientId)
//                                   : [...prev.filter((c) => c.id !== clientId), { id: clientId, client }]
//                               );
//                             }}
//                             onClick={(e) => e.stopPropagation()}
//                             aria-hidden
//                           />
//                           {clientName} {counsellorName ? `(${counsellorName})` : ""}
//                         </div>
//                       );
//                     })
//                   ) : (
//                     <div className="px-3 py-2 text-sm text-muted-foreground">
//                       No clients found
//                     </div>
//                   )}
//                 </div>
//               )}
//             </div>

//             <div className="flex justify-center mb-2">
//               <ArrowRight className="w-5 h-5 text-muted-foreground" />
//             </div>

//             {/* Counsellor Search */}
//             <div className="space-y-2 relative w-full min-w-0" ref={counsellorDropdownRef}>
//               <Label>Transfer To</Label>
//               <Input
//                 data-testid="input-counsellor-search"
//                 placeholder="Search counsellor (3+ chars)"
//                 value={counsellorSearchInput}
//                 onChange={(e) => {
//                   setCounsellorSearchInput(e.target.value);
//                   setShowCounsellorList(true);
//                   if (e.target.value.trim().length < 3) {
//                     setSelectedCounsellorId(null);
//                     setSelectedCounsellor(null);
//                   }
//                 }}
//                 onFocus={() => {
//                   if (counsellorSearchInput.trim().length >= 3) {
//                     setShowCounsellorList(true);
//                   }
//                 }}
//               />
//               {showCounsellorList && counsellorSearchInput.trim().length >= 3 && (
//                 <div className="absolute bottom-full left-0 right-0 z-[100] mb-1.5 w-full min-w-[12rem] max-h-56 overflow-y-auto rounded-md border border-border bg-popover text-popover-foreground shadow-md">
//                   {isLoadingCounsellors ? (
//                     <div className="px-3 py-2 text-sm text-muted-foreground flex items-center gap-2">
//                       <Loader2 className="w-4 h-4 animate-spin" />
//                       Loading counsellors...
//                     </div>
//                   ) : filteredCounsellors.length > 0 ? (
//                     filteredCounsellors.map((counsellor) => {
//                       const counsellorId = counsellor.counsellorId || counsellor.id || counsellor.userId;
//                       const counsellorName = counsellor.fullName || counsellor.name || counsellor.fullname || "Unknown";
//                       return (
//                         <div
//                           key={counsellorId}
//                           className="px-3 py-2 text-sm cursor-pointer border-b border-border/40 last:border-0 hover:bg-accent"
//                           onClick={() => {
//                             setSelectedCounsellorId(counsellorId);
//                             setSelectedCounsellor(counsellor);
//                             setCounsellorSearchInput(counsellorName);
//                             setShowCounsellorList(false);
//                           }}
//                           data-testid={`counsellor-option-${counsellorId}`}
//                         >
//                           {counsellorName}
//                         </div>
//                       );
//                     })
//                   ) : (
//                     <div className="px-3 py-2 text-sm text-muted-foreground">
//                       No counsellors found
//                     </div>
//                   )}
//                 </div>
//               )}
//             </div>

//             <div className="space-y-2">
//               <Label>Transfer Type</Label>
//               <Select
//                 value={transferType}
//                 onValueChange={(v) => setTransferType(v as "full_transfer" | "owner_only_transfer_flag")}
//               >
//                 <SelectTrigger data-testid="select-transfer-type">
//                   <SelectValue />
//                 </SelectTrigger>
//                 <SelectContent>
//                   <SelectItem value="full_transfer">100% Transfer</SelectItem>
//                   <SelectItem value="owner_only_transfer_flag">Only Share</SelectItem>
//                 </SelectContent>
//               </Select>
//             </div>

//             <Button
//               onClick={handleTransferClient}
//               data-testid="button-transfer"
//               disabled={isTransferring || selectedClients.length === 0 || !selectedCounsellorId}
//             >
//               {isTransferring && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
//               Transfer
//             </Button>
//           </div>
//         </CardContent>
//       </Card>
//     </PageWrapper>
//   );
// }





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
import { useState, useEffect, useRef, useMemo } from "react";
import { Trash2, Plus, Pencil, ArrowRight, Loader2, X } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
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

  // Visa Category (sale-type-categories) state
  const [visaCategories, setVisaCategories] = useState<any[]>([]);
  const [isLoadingVisaCategories, setIsLoadingVisaCategories] = useState(false);
  const [isSavingVisaCategory, setIsSavingVisaCategory] = useState(false);
  const [isVisaCategoryDialogOpen, setIsVisaCategoryDialogOpen] = useState(false);
  const [visaCategoryMode, setVisaCategoryMode] = useState<"add" | "edit">("add");
  const [editingVisaCategoryId, setEditingVisaCategoryId] = useState<number | null>(null);
  const [visaCategoryFormData, setVisaCategoryFormData] = useState({
    name: "",
    description: "",
  });
  const [visaCategoryFieldErrors, setVisaCategoryFieldErrors] = useState<{
    name?: string;
    description?: string;
  }>({});

  // Client and counsellor data from API
  const [clients, setClients] = useState<any[]>([]);
  const [allCounsellors, setAllCounsellors] = useState<any[]>([]);
  const [isLoadingClients, setIsLoadingClients] = useState(false);
  const [isLoadingCounsellors, setIsLoadingCounsellors] = useState(false);
  const [isTransferring, setIsTransferring] = useState(false);

  // Transfer state: multiple clients can be selected
  const [selectedClients, setSelectedClients] = useState<Array<{ id: number; client: any }>>([]);
  const [selectedCounsellorId, setSelectedCounsellorId] = useState<number | null>(null);
  const [selectedCounsellor, setSelectedCounsellor] = useState<any | null>(null);
  // Changed default to "owner_only_transfer_flag" (Only Share)
  const [transferType, setTransferType] = useState<"full_transfer" | "owner_only_transfer_flag">("owner_only_transfer_flag");
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

  // Fetch clients from API when search input changes (3+ chars, trimmed)
  useEffect(() => {
    const term = clientSearchInput.trim();
    const fetchClients = async () => {
      if (term.length >= 3) {
        setIsLoadingClients(true);
        try {
          const data = await clientService.getAllClients(term);
          setClients(Array.isArray(data) ? data : []);
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

    const debounceTimer = setTimeout(() => fetchClients(), 300);
    return () => clearTimeout(debounceTimer);
  }, [clientSearchInput]);

  // Load all counsellors once (Transfer To uses frontend-only search)
  useEffect(() => {
    let cancelled = false;
    setIsLoadingCounsellors(true);
    clientService
      .getCounsellors()
      .then((data) => {
        if (!cancelled) setAllCounsellors(Array.isArray(data) ? data : []);
      })
      .catch((err) => {
        if (!cancelled) setAllCounsellors([]);
        console.error("Failed to fetch counsellors", err);
      })
      .finally(() => {
        if (!cancelled) setIsLoadingCounsellors(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Transfer To: filter counsellors on the frontend by search text (no backend search)
  const filteredCounsellors = useMemo(() => {
    const term = counsellorSearchInput.trim().toLowerCase();
    if (term.length < 3) return [];
    return allCounsellors.filter((c) => {
      const name = (c.fullName || c.name || c.fullname || "").toLowerCase();
      return name.includes(term);
    });
  }, [allCounsellors, counsellorSearchInput]);

  const handleTransferClient = async () => {
    if (selectedClients.length === 0 || !selectedCounsellorId || !selectedCounsellor) {
      toast({
        title: "Error",
        description: "Please select at least one client and a counsellor",
        variant: "destructive",
      });
      return;
    }
    // Single client: check if already assigned to this counsellor
    if (selectedClients.length === 1) {
      const client = selectedClients[0].client;
      const currentCounsellorId = client.counsellorId || client.counsellor?.id || client.counsellorId;
      if (currentCounsellorId === selectedCounsellorId) {
        toast({
          title: "Error",
          description: "Client is already assigned to this counsellor",
          variant: "destructive",
        });
        return;
      }
    }

    try {
      setIsTransferring(true);
      const ids = selectedClients.map((c) => c.id);
      const payload = ids.length === 1 ? ids[0] : ids;
      await clientService.transferClient(payload, selectedCounsellorId, transferType);

      const newCounsellorName = selectedCounsellor.fullName || selectedCounsellor.name || selectedCounsellor.fullname || "Unknown";

      const title = "Success";
      const description =
        selectedClients.length === 1
          ? (() => {
              const c = selectedClients[0].client;
              const clientName = c.name || c.fullName || c.fullname || "Unknown";
              const oldCounsellorName = c.counsellor?.name || c.counsellor?.fullName || c.counsellorName || "Unknown";
              return `${clientName} transferred from ${oldCounsellorName} to ${newCounsellorName}`;
            })()
          : `${selectedClients.length} clients transferred to ${newCounsellorName}`;

      toast({ title, description });

      // Reset form
      setSelectedClients([]);
      setSelectedCounsellorId(null);
      setSelectedCounsellor(null);
      setTransferType("owner_only_transfer_flag");
      setClientSearchInput("");
      setCounsellorSearchInput("");
      setShowClientList(false);
      setShowCounsellorList(false);
    } catch (err: any) {
      console.error("Failed to transfer client(s)", err);
      const backendMessage =
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        err?.message ||
        "Failed to transfer client(s)";
      const isTransferTypeValidationError =
        err?.response?.status === 400 && /transfertype|transfer type/i.test(String(backendMessage));

      toast({
        title: "Error",
        description: isTransferTypeValidationError ? String(backendMessage) : backendMessage,
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
    categoryId: "",
    isCoreProduct: "No",
  });

  const [fieldErrors, setFieldErrors] = useState<{
    saleType?: string;
    amount?: string;
    categoryId?: string;
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

  const fetchVisaCategories = async () => {
    try {
      setIsLoadingVisaCategories(true);
      const data = await clientService.getSaleTypeCategories();
      setVisaCategories(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Failed to fetch visa categories", err);
      setVisaCategories([]);
    } finally {
      setIsLoadingVisaCategories(false);
    }
  };

  useEffect(() => {
    fetchSaleTypes();
    fetchLeadTypes();
    fetchVisaCategories();
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

  // Visa Category (sale-type-categories) handlers
  const openAddVisaCategoryDialog = () => {
    setVisaCategoryMode("add");
    setEditingVisaCategoryId(null);
    setVisaCategoryFormData({ name: "", description: "" });
    setVisaCategoryFieldErrors({});
    setIsVisaCategoryDialogOpen(true);
  };

  const openEditVisaCategoryDialog = (item: any) => {
    setVisaCategoryMode("edit");
    const id = item.id ?? item.categoryId;
    setEditingVisaCategoryId(id);
    setVisaCategoryFormData({
      name: item.name ?? "",
      description: item.description ?? "",
    });
    setVisaCategoryFieldErrors({});
    setIsVisaCategoryDialogOpen(true);
  };

  const handleSaveVisaCategory = async () => {
    setVisaCategoryFieldErrors({});
    if (!visaCategoryFormData.name.trim()) {
      setVisaCategoryFieldErrors({ name: "Name is required" });
      return;
    }
    try {
      setIsSavingVisaCategory(true);
      const payload = {
        name: visaCategoryFormData.name.trim(),
        description: visaCategoryFormData.description.trim() || undefined,
      };
      if (visaCategoryMode === "edit" && editingVisaCategoryId !== null) {
        await clientService.updateSaleTypeCategory(editingVisaCategoryId, payload);
        toast({ title: "Updated", description: "Visa category updated successfully" });
      } else {
        await clientService.createSaleTypeCategory(payload);
        toast({ title: "Added", description: "Visa category added successfully" });
      }
      setIsVisaCategoryDialogOpen(false);
      setEditingVisaCategoryId(null);
      setVisaCategoryFormData({ name: "", description: "" });
      fetchVisaCategories();
    } catch (err: any) {
      const msg = err.response?.data?.message || "Save failed";
      if (msg.toLowerCase().includes("name") || msg.toLowerCase().includes("already exists")) {
        setVisaCategoryFieldErrors({ name: msg });
      } else {
        setVisaCategoryFieldErrors({ name: msg });
      }
      toast({ title: "Error", description: msg, variant: "destructive" });
    } finally {
      setIsSavingVisaCategory(false);
    }
  };

  const handleDeleteVisaCategory = async (id: number) => {
    try {
      await clientService.deleteSaleTypeCategory(id);
      setVisaCategories((prev) => prev.filter((x) => (x.id ?? x.categoryId) !== id));
      toast({ title: "Deleted", description: "Visa category removed" });
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
    setFormData({ saleType: "", amount: "", categoryId: "", isCoreProduct: "No" });
    setFieldErrors({});
    setIsDialogOpen(true);
  };

  const openEditDialog = (item: any) => {
    setMode("edit");
    // Only use 'id' as requested
    const id = item.id;
    setEditingId(id);
    const byCategoryName = (() => {
      const name = (item.categoryName ?? item.category?.name ?? "").toString().trim().toLowerCase();
      if (!name) return "";
      const match = visaCategories.find((c: any) => (c?.name ?? "").toString().trim().toLowerCase() === name);
      return match?.id != null ? String(match.id) : "";
    })();
    setFormData({
      saleType: item.saleType || "",
      amount: item.amount?.toString() || "",
      categoryId: (item.categoryId ?? item.category?.id ?? item.category?.categoryId ?? byCategoryName ?? "").toString(),
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
    if (!formData.categoryId) {
      setFieldErrors({ categoryId: "Category is required" });
      return;
    }

    try {
      setIsSaving(true);
      const payload = {
        saleType: formData.saleType,
        amount: formData.amount ? Number(formData.amount) : null,
        categoryId: Number(formData.categoryId),
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
          setFormData({ saleType: "", amount: "", categoryId: "", isCoreProduct: "No" });
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
          setFormData({ saleType: "", amount: "", categoryId: "", isCoreProduct: "No" });
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
      } else if (errorMessage.toLowerCase().includes("category")) {
        setFieldErrors({ categoryId: errorMessage });
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
                <TableHead>Category</TableHead>
                <TableHead>Is Core Product</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center">
                    <Loader2 className="animate-spin mx-auto" />
                  </TableCell>
                </TableRow>
              ) : (
                saleTypes.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>{item.saleType}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {(() => {
                        if (item.categoryName) return item.categoryName;
                        const cid = item.categoryId ?? item.category?.id ?? item.category?.categoryId;
                        if (cid == null) return "—";
                        const match = visaCategories.find((c: any) => Number(c.id) === Number(cid));
                        return match?.name ?? `#${cid}`;
                      })()}
                    </TableCell>
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
              <Label>Category</Label>
              <Select
                value={formData.categoryId}
                onValueChange={(v) => {
                  setFormData({ ...formData, categoryId: v });
                  if (fieldErrors.categoryId) {
                    setFieldErrors({ ...fieldErrors, categoryId: undefined });
                  }
                }}
                disabled={isLoadingVisaCategories}
              >
                <SelectTrigger className={fieldErrors.categoryId ? "border-destructive" : ""}>
                  <SelectValue placeholder={isLoadingVisaCategories ? "Loading categories..." : "Select category"} />
                </SelectTrigger>
                <SelectContent>
                  {visaCategories.length === 0 ? (
                    <div className="p-2 text-sm text-center text-muted-foreground">
                      No categories found
                    </div>
                  ) : (
                    visaCategories.map((c: any) => (
                      <SelectItem key={c.id} value={String(c.id)}>
                        {c.name}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
              {fieldErrors.categoryId && (
                <p className="text-sm text-destructive mt-1">{fieldErrors.categoryId}</p>
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

      {/* Visa Category Section (sale-type-categories API) */}
      <Card className="mt-6">
        <CardHeader className="flex flex-row justify-between items-center">
          <div>
            <CardTitle>Visa Category</CardTitle>
            <CardDescription>Manage visa categories (e.g. Student, Spouse, Visitor)</CardDescription>
          </div>
          <Button size="sm" onClick={openAddVisaCategoryDialog}>
            <Plus className="w-4 h-4 mr-2" />
            Add Visa Category
          </Button>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Description</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoadingVisaCategories ? (
                <TableRow>
                  <TableCell colSpan={3} className="text-center">
                    <Loader2 className="animate-spin mx-auto" />
                  </TableCell>
                </TableRow>
              ) : visaCategories.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={3} className="text-center text-muted-foreground">
                    No visa categories found. Click &quot;Add Visa Category&quot; to create one.
                  </TableCell>
                </TableRow>
              ) : (
                visaCategories.map((item) => {
                  const itemId = item.id ?? item.categoryId;
                  return (
                    <TableRow key={itemId}>
                      <TableCell>{item.name}</TableCell>
                      <TableCell className="text-muted-foreground max-w-[200px] truncate" title={item.description}>
                        {item.description || "—"}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openEditVisaCategoryDialog(item)}
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-destructive"
                          onClick={() => handleDeleteVisaCategory(itemId)}
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

      {/* Visa Category Dialog */}
      <Dialog open={isVisaCategoryDialogOpen} onOpenChange={setIsVisaCategoryDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {visaCategoryMode === "edit" ? "Update Visa Category" : "Add Visa Category"}
            </DialogTitle>
            <DialogDescription>
              {visaCategoryMode === "edit"
                ? "Update name and description"
                : "Create a new visa category (e.g. Student visa / study)"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="visaCategoryName">Name</Label>
              <Input
                id="visaCategoryName"
                placeholder="e.g. student"
                value={visaCategoryFormData.name}
                onChange={(e) => {
                  setVisaCategoryFormData({ ...visaCategoryFormData, name: e.target.value });
                  if (visaCategoryFieldErrors.name) setVisaCategoryFieldErrors({ ...visaCategoryFieldErrors, name: undefined });
                }}
                className={visaCategoryFieldErrors.name ? "border-destructive" : ""}
              />
              {visaCategoryFieldErrors.name && (
                <p className="text-sm text-destructive mt-1">{visaCategoryFieldErrors.name}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="visaCategoryDesc">Description</Label>
              <Input
                id="visaCategoryDesc"
                placeholder="e.g. Student visa / study"
                value={visaCategoryFormData.description}
                onChange={(e) => {
                  setVisaCategoryFormData({ ...visaCategoryFormData, description: e.target.value });
                  if (visaCategoryFieldErrors.description) setVisaCategoryFieldErrors({ ...visaCategoryFieldErrors, description: undefined });
                }}
                className={visaCategoryFieldErrors.description ? "border-destructive" : ""}
              />
              {visaCategoryFieldErrors.description && (
                <p className="text-sm text-destructive mt-1">{visaCategoryFieldErrors.description}</p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsVisaCategoryDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveVisaCategory} disabled={isSavingVisaCategory}>
              {isSavingVisaCategory && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {visaCategoryMode === "edit" ? "Update Visa Category" : "Add"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Card className="mt-6">
        <CardHeader>
          <div>
            <CardTitle>Transfer Client</CardTitle>
            <CardDescription>
              Transfer individual clients to another counsellor
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Transfer Form */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
            {/* Client Search - multi-select with checkboxes; selected shown as chips with cancel */}
            <div className="space-y-2 relative w-full min-w-0" ref={clientDropdownRef}>
              <Label>Select Client(s)</Label>
              <div
                className="flex flex-wrap items-center gap-1.5 rounded-md border border-input bg-background px-3 py-2 min-h-[2.5rem] text-sm ring-offset-background focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2"
                onClick={() => document.getElementById("client-search-input")?.focus()}
              >
                {selectedClients.map(({ id, client }) => {
                  const name = client.name || client.fullName || client.fullname || "Unknown";
                  return (
                    <span
                      key={id}
                      className="inline-flex items-center gap-1 rounded-md bg-muted px-2 py-1 text-xs font-medium"
                    >
                      {name}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedClients((prev) => prev.filter((c) => c.id !== id));
                        }}
                        className="rounded p-0.5 hover:bg-muted-foreground/20"
                        aria-label={`Remove ${name}`}
                        data-testid={`client-remove-${id}`}
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </span>
                  );
                })}
                <input
                  id="client-search-input"
                  data-testid="input-client-search"
                  placeholder={selectedClients.length === 0 ? "Search client (3+ chars)" : "Add more..."}
                  value={clientSearchInput}
                  onChange={(e) => {
                    setClientSearchInput(e.target.value);
                    setShowClientList(true);
                  }}
                  onFocus={() => {
                    if (clientSearchInput.trim().length >= 3) {
                      setShowClientList(true);
                    }
                  }}
                  className="flex-1 min-w-[120px] border-0 bg-transparent p-0 outline-none placeholder:text-muted-foreground"
                />
              </div>
              {showClientList && clientSearchInput.trim().length >= 3 && (
                <div className="absolute bottom-full left-0 right-0 z-[100] mb-1.5 w-full min-w-[12rem] max-h-56 overflow-y-auto rounded-md border border-border bg-popover text-popover-foreground shadow-md">
                  {isLoadingClients ? (
                    <div className="px-3 py-2 text-sm text-muted-foreground flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Loading clients...
                    </div>
                  ) : clients.length > 0 ? (
                    clients.map((client) => {
                      const clientId = client.clientId || client.id;
                      const clientName = client.name || client.fullName || client.fullname || "Unknown";
                      const counsellorName = client.counsellor?.name || client.counsellor?.fullName || client.counsellorName;
                      const isSelected = selectedClients.some((c) => c.id === clientId);
                      return (
                        <div
                          key={clientId}
                          className="flex items-center gap-2 px-3 py-2 text-sm cursor-pointer border-b border-border/40 last:border-0 hover:bg-accent"
                          onClick={() => {
                            setSelectedClients((prev) =>
                              isSelected
                                ? prev.filter((c) => c.id !== clientId)
                                : [...prev.filter((c) => c.id !== clientId), { id: clientId, client }]
                            );
                            // Clear search input and close dropdown after selection
                            setClientSearchInput("");
                            setShowClientList(false);
                          }}
                          data-testid={`client-option-${clientId}`}
                        >
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={() => {
                              setSelectedClients((prev) =>
                                isSelected
                                  ? prev.filter((c) => c.id !== clientId)
                                  : [...prev.filter((c) => c.id !== clientId), { id: clientId, client }]
                              );
                              // Clear search input and close dropdown after selection
                              setClientSearchInput("");
                              setShowClientList(false);
                            }}
                            onClick={(e) => e.stopPropagation()}
                            aria-hidden
                          />
                          {clientName} {counsellorName ? `(${counsellorName})` : ""}
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
            <div className="space-y-2 relative w-full min-w-0" ref={counsellorDropdownRef}>
              <Label>Transfer To</Label>
              <Input
                data-testid="input-counsellor-search"
                placeholder="Search counsellor (3+ chars)"
                value={counsellorSearchInput}
                onChange={(e) => {
                  setCounsellorSearchInput(e.target.value);
                  setShowCounsellorList(true);
                  if (e.target.value.trim().length < 3) {
                    setSelectedCounsellorId(null);
                    setSelectedCounsellor(null);
                  }
                }}
                onFocus={() => {
                  if (counsellorSearchInput.trim().length >= 3) {
                    setShowCounsellorList(true);
                  }
                }}
              />
              {showCounsellorList && counsellorSearchInput.trim().length >= 3 && (
                <div className="absolute bottom-full left-0 right-0 z-[100] mb-1.5 w-full min-w-[12rem] max-h-56 overflow-y-auto rounded-md border border-border bg-popover text-popover-foreground shadow-md">
                  {isLoadingCounsellors ? (
                    <div className="px-3 py-2 text-sm text-muted-foreground flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Loading counsellors...
                    </div>
                  ) : filteredCounsellors.length > 0 ? (
                    filteredCounsellors.map((counsellor) => {
                      const counsellorId = counsellor.counsellorId || counsellor.id || counsellor.userId;
                      const counsellorName = counsellor.fullName || counsellor.name || counsellor.fullname || "Unknown";
                      return (
                        <div
                          key={counsellorId}
                          className="px-3 py-2 text-sm cursor-pointer border-b border-border/40 last:border-0 hover:bg-accent"
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

            <div className="space-y-2">
              <Label>Transfer Type</Label>
              <Select
                value={transferType}
                onValueChange={(v) => setTransferType(v as "full_transfer" | "owner_only_transfer_flag")}
              >
                <SelectTrigger data-testid="select-transfer-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                <SelectItem value="owner_only_transfer_flag">Only Share</SelectItem>
                  <SelectItem value="full_transfer">100% Transfer</SelectItem>
                 
                </SelectContent>
              </Select>
            </div>

            <Button
              onClick={handleTransferClient}
              data-testid="button-transfer"
              disabled={isTransferring || selectedClients.length === 0 || !selectedCounsellorId}
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