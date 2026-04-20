

// import { useState, useEffect } from "react";
// import {
//   Dialog,
//   DialogContent,
//   DialogHeader,
//   DialogTitle,
//   DialogFooter,
//   DialogDescription,
// } from "@/components/ui/dialog";
// import { Button } from "@/components/ui/button";
// import { Input } from "@/components/ui/input";
// import { Label } from "@/components/ui/label";
// import {
//   Select,
//   SelectContent,
//   SelectItem,
//   SelectTrigger,
//   SelectValue,
// } from "@/components/ui/select";
// import { Textarea } from "@/components/ui/textarea";
// import { Loader2 } from "lucide-react";
// import type { DummyLead, LeadStatus, LeadStage } from "@/data/dummyLeads";
// import api from "@/lib/api";

// interface AddLeadProps {
//   open: boolean;
//   onOpenChange: (open: boolean) => void;
//   onLeadAdded: (lead: DummyLead) => void;
// }

// interface LeadType {
//   id: number;
//   leadType: string;
//   leadTypeId?: number;
// }

// interface SaleType {
//   id: number;
//   saleType: string;
//   amount: number | null;
//   categoryId: number;
//   categoryName?: string;
//   isCoreProduct: boolean;
// }

// interface FormState {
//   name: string;
//   email: string;
//   phone: string;
//   source: string;
//   visaCategory: string;
//   status: LeadStatus;
//   stage: LeadStage;
//   notes: string;
// }

// const INITIAL_FORM: FormState = {
//   name: "",
//   email: "",
//   phone: "",
//   source: "",
//   visaCategory: "",
//   status: "new",
//   stage: "New",
//   notes: "",
// };

// export function AddLead({ open, onOpenChange, onLeadAdded }: AddLeadProps) {
//   const [form, setForm] = useState<FormState>(INITIAL_FORM);
//   const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({});
//   const [isSubmitting, setIsSubmitting] = useState(false);
  
//   // Lead Types state
//   const [leadTypes, setLeadTypes] = useState<LeadType[]>([]);
//   const [isLoadingLeadTypes, setIsLoadingLeadTypes] = useState(false);

//   // Visa Categories from Sale Types
//   const [visaCategories, setVisaCategories] = useState<string[]>([]);
//   const [isLoadingVisaCategories, setIsLoadingVisaCategories] = useState(false);

//   // Fetch lead types and sale types when dialog opens
//   useEffect(() => {
//     if (open) {
//       fetchLeadTypes();
//       fetchSaleTypes();
//     }
//   }, [open]);

//   const fetchLeadTypes = async () => {
//     try {
//       setIsLoadingLeadTypes(true);
//       const res = await api.get("/api/lead-types");
//       const data = res.data.data || [];
//       setLeadTypes(data);
//     } catch (err: any) {
//       console.error("Failed to fetch lead types:", err);
//       setLeadTypes([]);
//     } finally {
//       setIsLoadingLeadTypes(false);
//     }
//   };

//   const fetchSaleTypes = async () => {
//     try {
//       setIsLoadingVisaCategories(true);
//       const res = await api.get("/api/sale-types");
//       const saleTypes: SaleType[] = res.data.data || [];
      
//       // Extract unique category names from sale types
//       const uniqueCategories = new Set<string>();
//       saleTypes.forEach((saleType) => {
//         // Get category name from different possible locations
//         let categoryName = null;
        
//         if (saleType.categoryName) {
//           categoryName = saleType.categoryName;
//         } else if ((saleType as any).category?.name) {
//           categoryName = (saleType as any).category.name;
//         } else if ((saleType as any).Category?.name) {
//           categoryName = (saleType as any).Category.name;
//         }
        
//         if (categoryName && categoryName.trim()) {
//           uniqueCategories.add(categoryName.trim());
//         }
//       });
      
//       const categories = Array.from(uniqueCategories).sort();
//       console.log("Extracted categories:", categories); // Debug log
//       setVisaCategories(categories);
//     } catch (err: any) {
//       console.error("Failed to fetch sale types:", err);
//       // Fallback to some default categories if API fails
//       setVisaCategories(["spouse", "visitor", "student", "work", "PR"]);
//     } finally {
//       setIsLoadingVisaCategories(false);
//     }
//   };

//   const set = (field: keyof FormState) => (value: string) => {
//     setForm((prev) => ({ ...prev, [field]: value }));
//     if (errors[field]) {
//       setErrors((prev) => {
//         const copy = { ...prev };
//         delete copy[field];
//         return copy;
//       });
//     }
//   };

//   const validate = (): boolean => {
//     const next: Partial<Record<keyof FormState, string>> = {};
//     if (!form.name.trim()) next.name = "Full name is required";
//     if (!form.email.trim()) {
//       next.email = "Email is required";
//     } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
//       next.email = "Enter a valid email address";
//     }
//     if (!form.phone.trim()) next.phone = "Phone number is required";
//     if (!form.source) next.source = "Lead source is required";
//     setErrors(next);
//     return Object.keys(next).length === 0;
//   };

//   const handleSubmit = async () => {
//     if (!validate()) return;
//     setIsSubmitting(true);

//     // Get the selected lead type label
//     const selectedLeadType = leadTypes.find(
//       (lt) => String(lt.id || lt.leadTypeId) === form.source
//     );
//     const sourceLabel = selectedLeadType?.leadType || form.source;

//     const newLead: DummyLead = {
//       id: `lead_${Date.now()}`,
//       name: form.name.trim(),
//       email: form.email.trim().toLowerCase(),
//       phone: form.phone.trim(),
//       source: sourceLabel,
//       visaCategory: form.visaCategory || undefined,
//       status: form.status,
//       stage: form.stage,
//       assignedToId: null,
//       assignedToName: null,
//       lastFollowupAt: null,
//       createdAt: new Date().toISOString(),
//     };

//     await new Promise((r) => setTimeout(r, 300));

//     onLeadAdded(newLead);
//     setForm(INITIAL_FORM);
//     setErrors({});
//     setIsSubmitting(false);
//     onOpenChange(false);
//   };

//   const handleClose = () => {
//     if (isSubmitting) return;
//     setForm(INITIAL_FORM);
//     setErrors({});
//     onOpenChange(false);
//   };

//   return (
//     <Dialog open={open} onOpenChange={handleClose}>
//       <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto p-0">
//         <div className="p-6">
//           <DialogHeader className="pb-4">
//             <DialogTitle>Add New Lead</DialogTitle>
//             <DialogDescription>
//               Enter the client details to create a new lead.
//             </DialogDescription>
//           </DialogHeader>

//           <div className="grid grid-cols-1 gap-4 py-2">
//             {/* Full Name */}
//             <div className="space-y-1.5">
//               <Label htmlFor="lead-name" className={errors.name ? "text-destructive" : ""}>
//                 Full Name <span className="text-destructive">*</span>
//               </Label>
//               <Input
//                 id="lead-name"
//                 placeholder="e.g. Aarav Sharma"
//                 value={form.name}
//                 onChange={(e) => set("name")(e.target.value)}
//                 className={errors.name ? "border-destructive" : ""}
//               />
//               {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
//             </div>

//             {/* Email & Phone - Responsive grid */}
//             <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
//               <div className="space-y-1.5">
//                 <Label htmlFor="lead-email" className={errors.email ? "text-destructive" : ""}>
//                   Email <span className="text-destructive">*</span>
//                 </Label>
//                 <Input
//                   id="lead-email"
//                   type="email"
//                   placeholder="name@example.com"
//                   value={form.email}
//                   onChange={(e) => set("email")(e.target.value)}
//                   className={errors.email ? "border-destructive" : ""}
//                 />
//                 {errors.email && <p className="text-xs text-destructive">{errors.email}</p>}
//               </div>

//               <div className="space-y-1.5">
//                 <Label htmlFor="lead-phone" className={errors.phone ? "text-destructive" : ""}>
//                   Phone <span className="text-destructive">*</span>
//                 </Label>
//                 <Input
//                   id="lead-phone"
//                   placeholder="+91 98765 43210"
//                   value={form.phone}
//                   onChange={(e) => set("phone")(e.target.value)}
//                   className={errors.phone ? "border-destructive" : ""}
//                 />
//                 {errors.phone && <p className="text-xs text-destructive">{errors.phone}</p>}
//               </div>
//             </div>

//             {/* Lead Source */}
//             <div className="space-y-1.5">
//               <Label className={errors.source ? "text-destructive" : ""}>
//                 Lead Source <span className="text-destructive">*</span>
//               </Label>
//               <Select 
//                 value={form.source} 
//                 onValueChange={set("source")} 
//                 disabled={isLoadingLeadTypes}
//               >
//                 <SelectTrigger className={errors.source ? "border-destructive" : ""}>
//                   <SelectValue placeholder={isLoadingLeadTypes ? "Loading sources..." : "Select source"} />
//                 </SelectTrigger>
//                 <SelectContent className="max-h-[300px] overflow-y-auto">
//                   {isLoadingLeadTypes ? (
//                     <div className="flex items-center justify-center py-6">
//                       <Loader2 className="h-5 w-5 animate-spin" />
//                     </div>
//                   ) : leadTypes.length === 0 ? (
//                     <div className="px-2 py-4 text-sm text-center text-muted-foreground">
//                       No lead types found. Please add lead types in Additional Info page.
//                     </div>
//                   ) : (
//                     leadTypes.map((type) => {
//                       const typeId = String(type.id || type.leadTypeId);
//                       const typeName = type.leadType;
//                       return (
//                         <SelectItem key={typeId} value={typeId}>
//                           {typeName}
//                         </SelectItem>
//                       );
//                     })
//                   )}
//                 </SelectContent>
//               </Select>
//               {errors.source && <p className="text-xs text-destructive">{errors.source}</p>}
//             </div>

//             {/* Visa Category, Status, Stage */}
//             <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
//               {/* Visa Category */}
//               <div className="space-y-1.5">
//                 <Label>Visa Category</Label>
//                 <Select 
//                   value={form.visaCategory} 
//                   onValueChange={set("visaCategory")}
//                   disabled={isLoadingVisaCategories}
//                 >
//                   <SelectTrigger>
//                     <SelectValue placeholder={isLoadingVisaCategories ? "Loading categories..." : "Select category"} />
//                   </SelectTrigger>
//                   <SelectContent className="max-h-[300px] overflow-y-auto">
//                     {isLoadingVisaCategories ? (
//                       <div className="flex items-center justify-center py-6">
//                         <Loader2 className="h-5 w-5 animate-spin" />
//                       </div>
//                     ) : visaCategories.length === 0 ? (
//                       <div className="px-2 py-4 text-sm text-center text-muted-foreground">
//                         No visa categories found. Please add sale types with categories.
//                       </div>
//                     ) : (
//                       visaCategories.map((categoryName) => (
//                         <SelectItem key={categoryName} value={categoryName}>
//                           {categoryName.charAt(0).toUpperCase() + categoryName.slice(1)}
//                         </SelectItem>
//                       ))
//                     )}
//                   </SelectContent>
//                 </Select>
//               </div>

//               {/* Status */}
//               <div className="space-y-1.5">
//                 <Label>Status</Label>
//                 <Select value={form.status} onValueChange={set("status")}>
//                   <SelectTrigger>
//                     <SelectValue />
//                   </SelectTrigger>
//                   <SelectContent>
//                     <SelectItem value="new">New</SelectItem>
//                     <SelectItem value="contacted">Contacted</SelectItem>
//                     <SelectItem value="qualified">Qualified</SelectItem>
//                     <SelectItem value="converted">Converted</SelectItem>
//                     <SelectItem value="lost">Lost</SelectItem>
//                   </SelectContent>
//                 </Select>
//               </div>

//               {/* Stage */}
//               <div className="space-y-1.5">
//                 <Label>Stage</Label>
//                 <Select value={form.stage} onValueChange={set("stage")}>
//                   <SelectTrigger>
//                     <SelectValue />
//                   </SelectTrigger>
//                   <SelectContent>
//                     <SelectItem value="New">New</SelectItem>
//                     <SelectItem value="Contacted">Contacted</SelectItem>
//                     <SelectItem value="Qualified">Qualified</SelectItem>
//                     <SelectItem value="Converted">Converted</SelectItem>
//                   </SelectContent>
//                 </Select>
//               </div>
//             </div>

//             {/* Notes */}
//             <div className="space-y-1.5">
//               <Label htmlFor="lead-notes">Notes</Label>
//               <Textarea
//                 id="lead-notes"
//                 placeholder="Any additional information about this lead…"
//                 value={form.notes}
//                 onChange={(e) => set("notes")(e.target.value)}
//                 rows={3}
//                 className="resize-none"
//               />
//             </div>
//           </div>

//           <DialogFooter className="gap-2 pt-4">
//             <Button variant="outline" onClick={handleClose} disabled={isSubmitting}>
//               Cancel
//             </Button>
//             <Button onClick={handleSubmit} disabled={isSubmitting}>
//               {isSubmitting ? "Adding…" : "Add Lead"}
//             </Button>
//           </DialogFooter>
//         </div>
//       </DialogContent>
//     </Dialog>
//   );
// }
import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Loader2 } from "lucide-react";
import type { DummyLead, LeadStatus, LeadStage } from "@/data/dummyLeads";
import api from "@/lib/api";

interface AddLeadProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onLeadAdded: (lead: DummyLead) => void;
}

interface LeadType {
  id: number;
  leadType: string;
  leadTypeId?: number;
}

interface SaleType {
  id: number;
  saleType: string;
  amount: number | null;
  categoryName: string;
  isCoreProduct: boolean;
  createdAt: string;
}

interface FormState {
  name: string;
  email: string;
  phone: string;
  source: string;
  visaCategory: string;
  status: LeadStatus;
  stage: LeadStage;
  notes: string;
}

const INITIAL_FORM: FormState = {
  name: "",
  email: "",
  phone: "",
  source: "",
  visaCategory: "",
  status: "new",
  stage: "New",
  notes: "",
};

export function AddLead({ open, onOpenChange, onLeadAdded }: AddLeadProps) {
  const [form, setForm] = useState<FormState>(INITIAL_FORM);
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Lead Types state
  const [leadTypes, setLeadTypes] = useState<LeadType[]>([]);
  const [isLoadingLeadTypes, setIsLoadingLeadTypes] = useState(false);

  // 🔴 CHANGE HERE: Sale Types state instead of Visa Categories
  const [saleTypes, setSaleTypes] = useState<SaleType[]>([]);
  const [isLoadingSaleTypes, setIsLoadingSaleTypes] = useState(false);

  // Fetch lead types and sale types when dialog opens
  useEffect(() => {
    if (open) {
      fetchLeadTypes();
      fetchSaleTypes(); // 🔴 CHANGE HERE: Call fetchSaleTypes
    }
  }, [open]);

  const fetchLeadTypes = async () => {
    try {
      setIsLoadingLeadTypes(true);
      const res = await api.get("/api/lead-types");
      const data = res.data.data || [];
      setLeadTypes(data);
    } catch (err: any) {
      console.error("Failed to fetch lead types:", err);
      setLeadTypes([]);
    } finally {
      setIsLoadingLeadTypes(false);
    }
  };

  // 🔴 CHANGE HERE: New function to fetch sale types
  const fetchSaleTypes = async () => {
    try {
      setIsLoadingSaleTypes(true);
      const res = await api.get("/api/sale-types");
      const data = res.data.data || [];
      setSaleTypes(data);
      console.log("Fetched sale types:", data); // Debug log
    } catch (err: any) {
      console.error("Failed to fetch sale types:", err);
      setSaleTypes([]);
    } finally {
      setIsLoadingSaleTypes(false);
    }
  };

  const set = (field: keyof FormState) => (value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => {
        const copy = { ...prev };
        delete copy[field];
        return copy;
      });
    }
  };

  const validate = (): boolean => {
    const next: Partial<Record<keyof FormState, string>> = {};
    if (!form.name.trim()) next.name = "Full name is required";
    if (!form.email.trim()) {
      next.email = "Email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
      next.email = "Enter a valid email address";
    }
    if (!form.phone.trim()) next.phone = "Phone number is required";
    if (!form.source) next.source = "Lead source is required";
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setIsSubmitting(true);

    // Get the selected lead type label
    const selectedLeadType = leadTypes.find(
      (lt) => String(lt.id || lt.leadTypeId) === form.source
    );
    const sourceLabel = selectedLeadType?.leadType || form.source;

    const newLead: DummyLead = {
      id: `lead_${Date.now()}`,
      name: form.name.trim(),
      email: form.email.trim().toLowerCase(),
      phone: form.phone.trim(),
      source: sourceLabel,
      visaCategory: form.visaCategory || undefined,
      status: form.status,
      stage: form.stage,
      assignedToId: null,
      assignedToName: null,
      lastFollowupAt: null,
      createdAt: new Date().toISOString(),
    };

    await new Promise((r) => setTimeout(r, 300));

    onLeadAdded(newLead);
    setForm(INITIAL_FORM);
    setErrors({});
    setIsSubmitting(false);
    onOpenChange(false);
  };

  const handleClose = () => {
    if (isSubmitting) return;
    setForm(INITIAL_FORM);
    setErrors({});
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto p-0">
        <div className="p-6">
          <DialogHeader className="pb-4">
            <DialogTitle>Add New Lead</DialogTitle>
            <DialogDescription>
              Enter the client details to create a new lead.
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-1 gap-4 py-2">
            {/* Full Name */}
            <div className="space-y-1.5">
              <Label htmlFor="lead-name" className={errors.name ? "text-destructive" : ""}>
                Full Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="lead-name"
                placeholder="e.g. Aarav Sharma"
                value={form.name}
                onChange={(e) => set("name")(e.target.value)}
                className={errors.name ? "border-destructive" : ""}
              />
              {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
            </div>

            {/* Email & Phone - Responsive grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="lead-email" className={errors.email ? "text-destructive" : ""}>
                  Email <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="lead-email"
                  type="email"
                  placeholder="name@example.com"
                  value={form.email}
                  onChange={(e) => set("email")(e.target.value)}
                  className={errors.email ? "border-destructive" : ""}
                />
                {errors.email && <p className="text-xs text-destructive">{errors.email}</p>}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="lead-phone" className={errors.phone ? "text-destructive" : ""}>
                  Phone <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="lead-phone"
                  placeholder="+91 98765 43210"
                  value={form.phone}
                  onChange={(e) => set("phone")(e.target.value)}
                  className={errors.phone ? "border-destructive" : ""}
                />
                {errors.phone && <p className="text-xs text-destructive">{errors.phone}</p>}
              </div>
            </div>

            {/* Lead Source */}
            <div className="space-y-1.5">
              <Label className={errors.source ? "text-destructive" : ""}>
                Lead Source <span className="text-destructive">*</span>
              </Label>
              <Select 
                value={form.source} 
                onValueChange={set("source")} 
                disabled={isLoadingLeadTypes}
              >
                <SelectTrigger className={errors.source ? "border-destructive" : ""}>
                  <SelectValue placeholder={isLoadingLeadTypes ? "Loading sources..." : "Select source"} />
                </SelectTrigger>
                <SelectContent className="max-h-[300px] overflow-y-auto">
                  {isLoadingLeadTypes ? (
                    <div className="flex items-center justify-center py-6">
                      <Loader2 className="h-5 w-5 animate-spin" />
                    </div>
                  ) : leadTypes.length === 0 ? (
                    <div className="px-2 py-4 text-sm text-center text-muted-foreground">
                      No lead types found. Please add lead types in Additional Info page.
                    </div>
                  ) : (
                    leadTypes.map((type) => {
                      const typeId = String(type.id || type.leadTypeId);
                      const typeName = type.leadType;
                      return (
                        <SelectItem key={typeId} value={typeId}>
                          {typeName}
                        </SelectItem>
                      );
                    })
                  )}
                </SelectContent>
              </Select>
              {errors.source && <p className="text-xs text-destructive">{errors.source}</p>}
            </div>

            {/* Visa Category, Status, Stage */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* 🔴 CHANGE HERE: Visa Category dropdown showing saleType values */}
              <div className="space-y-1.5">
                <Label>Visa Category</Label>
                <Select 
                  value={form.visaCategory} 
                  onValueChange={set("visaCategory")}
                  disabled={isLoadingSaleTypes}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={isLoadingSaleTypes ? "Loading sale types..." : "Select sale type"} />
                  </SelectTrigger>
                  <SelectContent className="max-h-[300px] overflow-y-auto">
                    {isLoadingSaleTypes ? (
                      <div className="flex items-center justify-center py-6">
                        <Loader2 className="h-5 w-5 animate-spin" />
                      </div>
                    ) : saleTypes.length === 0 ? (
                      <div className="px-2 py-4 text-sm text-center text-muted-foreground">
                        No sale types found.
                      </div>
                    ) : (
                      // 🔴 CHANGE HERE: Display saleType field from the response
                      saleTypes.map((saleType) => (
                        <SelectItem key={saleType.id} value={saleType.saleType}>
                          {saleType.saleType}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>

              {/* Status */}
              <div className="space-y-1.5">
                <Label>Status</Label>
                <Select value={form.status} onValueChange={set("status")}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="new">New</SelectItem>
                    <SelectItem value="contacted">Contacted</SelectItem>
                    <SelectItem value="qualified">Qualified</SelectItem>
                    <SelectItem value="converted">Converted</SelectItem>
                    <SelectItem value="lost">Lost</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Stage */}
              <div className="space-y-1.5">
                <Label>Stage</Label>
                <Select value={form.stage} onValueChange={set("stage")}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="New">New</SelectItem>
                    <SelectItem value="Contacted">Contacted</SelectItem>
                    <SelectItem value="Qualified">Qualified</SelectItem>
                    <SelectItem value="Converted">Converted</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Notes */}
            <div className="space-y-1.5">
              <Label htmlFor="lead-notes">Notes</Label>
              <Textarea
                id="lead-notes"
                placeholder="Any additional information about this lead…"
                value={form.notes}
                onChange={(e) => set("notes")(e.target.value)}
                rows={3}
                className="resize-none"
              />
            </div>
          </div>

          <DialogFooter className="gap-2 pt-4">
            <Button variant="outline" onClick={handleClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={isSubmitting}>
              {isSubmitting ? "Adding…" : "Add Lead"}
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}