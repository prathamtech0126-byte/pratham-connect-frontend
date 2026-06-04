

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
import { useState, useEffect, useRef } from "react";
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
import type { DummyLead } from "@/data/dummyLeads";
import api from "@/lib/api";
import { cn } from "@/lib/utils";
import { SearchableAssigneePicker } from "@/components/leads/SearchableAssigneePicker";
import {
  createLeadApi,
  searchLeadReferenceClientsApi,
  listLeadReferenceTeamDirectoryApi,
  listLeadReferenceCounsellorsApi,
} from "@/api/leads.api";
import { useAuth } from "@/context/auth-context";
import {
  getLeadSourceLabel,
  isClientReferenceSourceSlug,
  isInternalReferenceSourceSlug,
} from "@/lib/lead-source-display";

const BLOCKED_SOURCE_SLUGS_FOR_FIELD_ROLES = ["instagram", "facebook","walkin","website"];
const CITY_ALLOWED_REGEX = /^[A-Za-z\s().,'-]+$/;
function isBlockedForFieldRole(slug: string): boolean {
  const n = slug.trim().toLowerCase().replace(/[\s_-]+/g, "");
  return BLOCKED_SOURCE_SLUGS_FOR_FIELD_ROLES.some((b) => n.includes(b));
}

interface AddLeadProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onLeadAdded: (lead: DummyLead) => void;
}

interface LeadType {
  id: number;
  leadType: string;
  leadTypeId?: number;
  displayAlias?: string | null;
}

type ReferenceSelection = {
  kind: "client" | "internal" | "self";
  id: number;
  name: string;
  memberRole?: string | null;
  isManual?: boolean;
  counsellorId?: number | null;
  counsellorName?: string | null;
};

function formatReferenceRoleLabel(role: string | null | undefined): string {
  if (!role) return "";
  const r = role.toLowerCase();
  if (r === "telecaller") return "Telecaller";
  if (r === "counsellor" || r === "counselor") return "Counsellor";
  if (r === "manager") return "Manager";
  if (r === "marketing_head") return "Marketing Head";
  if (r === "director") return "Director";
  if (r === "self") return "Self";
  return role.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function referenceSubtitle(ref: ReferenceSelection): string {
  if (ref.kind === "self") return "Self reference";
  if (ref.kind === "internal") {
    return formatReferenceRoleLabel(ref.memberRole) || "Team member";
  }
  if (ref.isManual) return "Manual client entry";
  return "Existing client";
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
  city: string;
  source: string;
  visaCategory: string;
  notes: string;
}

const INITIAL_FORM: FormState = {
  name: "",
  email: "",
  phone: "",
  city: "",
  source: "",
  visaCategory: "",
  notes: "",
};

export function AddLead({ open, onOpenChange, onLeadAdded }: AddLeadProps) {
  const { user } = useAuth();
  const isFieldRole = user?.role === "telecaller" || user?.role === "counsellor";

  const [form, setForm] = useState<FormState>(INITIAL_FORM);
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Lead Types state
  const [leadTypes, setLeadTypes] = useState<LeadType[]>([]);
  const [isLoadingLeadTypes, setIsLoadingLeadTypes] = useState(false);

  const [saleTypes, setSaleTypes] = useState<SaleType[]>([]);
  const [isLoadingSaleTypes, setIsLoadingSaleTypes] = useState(false);

  const [counsellors, setCounsellors] = useState<
    { id: number; fullName: string; role?: string | null }[]
  >([]);
  const [internalTeamDirectory, setInternalTeamDirectory] = useState<
    { id: number; fullName: string; memberRole: string }[]
  >([]);

  const [referenceSearch, setReferenceSearch] = useState("");
  const [referenceOptions, setReferenceOptions] = useState<
    { id: number; label: string; kind: "client" | "internal"; memberRole?: string | null }[]
  >([]);
  const [selectedReference, setSelectedReference] = useState<ReferenceSelection | null>(null);
  const [isLoadingReference, setIsLoadingReference] = useState(false);
  const [showReferenceList, setShowReferenceList] = useState(false);
  const [showManualClientInput, setShowManualClientInput] = useState(false);
  const [manualClientName, setManualClientName] = useState("");
  const [manualClientCounsellorId, setManualClientCounsellorId] = useState("");
  const referenceSearchRef = useRef<HTMLDivElement>(null);

  const closeReferenceSearch = (clearUnselectedInput = true) => {
    setShowReferenceList(false);
    if (clearUnselectedInput && !selectedReference) {
      setReferenceSearch("");
    }
  };

  useEffect(() => {
    if (!showReferenceList) return;

    const onPointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (referenceSearchRef.current?.contains(target)) return;
      closeReferenceSearch(true);
    };

    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [showReferenceList, selectedReference]);

  useEffect(() => {
    if (open) {
      fetchLeadTypes();
      fetchSaleTypes();
      Promise.all([
        listLeadReferenceCounsellorsApi(),
        listLeadReferenceTeamDirectoryApi(),
      ])
        .then(([counsellorRows, teamRows]) => {
          setCounsellors(counsellorRows);
          setInternalTeamDirectory(teamRows);
        })
        .catch(() => {
          setCounsellors([]);
          setInternalTeamDirectory([]);
        });
    }
  }, [open]);

  const selectedSourceSlug = leadTypes.find(
    (lt) => String(lt.id || lt.leadTypeId) === form.source
  )?.leadType;

  const needsClientReference = selectedSourceSlug
    ? isClientReferenceSourceSlug(selectedSourceSlug)
    : false;
  const needsInternalReference = selectedSourceSlug
    ? isInternalReferenceSourceSlug(selectedSourceSlug)
    : false;
  const needsReferencePick = needsClientReference || needsInternalReference;

  useEffect(() => {
    if (!open) {
      setReferenceSearch("");
      setReferenceOptions([]);
      setSelectedReference(null);
      setShowReferenceList(false);
      setShowManualClientInput(false);
      setManualClientName("");
      setManualClientCounsellorId("");
    }
  }, [open]);

  useEffect(() => {
    setSelectedReference(null);
    setReferenceSearch("");
    setReferenceOptions([]);
    setShowManualClientInput(false);
    setManualClientName("");
    setManualClientCounsellorId("");
  }, [form.source]);

  useEffect(() => {
    const term = referenceSearch.trim();
    if (!needsReferencePick) {
      setReferenceOptions([]);
      return;
    }

    if (needsInternalReference) {
      const lower = term.toLowerCase();
      const filtered = term
        ? internalTeamDirectory.filter((m) => {
            const roleLabel = formatReferenceRoleLabel(m.memberRole).toLowerCase();
            return (
              m.fullName.toLowerCase().includes(lower) ||
              m.memberRole.toLowerCase().includes(lower) ||
              roleLabel.includes(lower)
            );
          })
        : internalTeamDirectory;
      setReferenceOptions(
        filtered.map((m) => ({
          id: m.id,
          label: m.fullName,
          kind: "internal" as const,
          memberRole: m.memberRole,
        }))
      );
      setIsLoadingReference(false);
      return;
    }

    if (term.length < 3) {
      setReferenceOptions([]);
      return;
    }

    const timer = setTimeout(async () => {
      setIsLoadingReference(true);
      try {
        const rows = await searchLeadReferenceClientsApi(term);
        setReferenceOptions(
          rows.map((c) => ({
            id: Number(c.id),
            label: String(c.fullName ?? `Client #${c.id}`),
            kind: "client" as const,
          }))
        );
      } catch {
        setReferenceOptions([]);
      } finally {
        setIsLoadingReference(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [
    referenceSearch,
    needsReferencePick,
    needsInternalReference,
    needsClientReference,
    internalTeamDirectory,
  ]);

  const fetchLeadTypes = async () => {
    try {
      setIsLoadingLeadTypes(true);
      const res = await api.get("/api/lead-types");
      const data = (res.data.data || []) as LeadType[];
      const normalized = [...data].sort((a, b) => {
        const aName = (a.leadType || "").trim().toLowerCase();
        const bName = (b.leadType || "").trim().toLowerCase();
        if (aName === "other") return 1;
        if (bName === "other") return -1;
        return aName.localeCompare(bName);
      });
      setLeadTypes(normalized);
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
    if (!form.phone.trim()) {
      next.phone = "Phone number is required";
    } else if (form.phone.trim().replace(/\D/g, "").length < 10) {
      next.phone = "Phone must be at least 10 digits";
    }
    if (!form.source) next.source = "Lead source is required";
    if (form.city.trim() && !CITY_ALLOWED_REGEX.test(form.city.trim())) {
      next.city = "City can contain English letters, spaces, and symbols like ( ) . , ' -";
    }
    if (needsClientReference && !selectedReference && !manualClientName.trim()) {
      next.source = "Select a client from the list, or enter the client name manually below";
    }
    if (needsInternalReference && !selectedReference) {
      next.source =
        "Select a team member, use Self reference, or search and choose from the list";
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setIsSubmitting(true);

    try {
      const selectedLeadType = leadTypes.find(
        (lt) => String(lt.id || lt.leadTypeId) === form.source
      );
      const sourceLabel = selectedLeadType?.leadType || form.source;

      const manualCounsellor = counsellors.find((c) => String(c.id) === manualClientCounsellorId);
      const created = await createLeadApi({
        fullName: form.name.trim(),
        phone: form.phone.trim(),
        email: form.email.trim().toLowerCase(),
        city: form.city.trim() || undefined,
        leadSource: sourceLabel,
        leadType: form.visaCategory || undefined,
        latestNote: form.notes || undefined,
        referenceMeta: selectedReference
          ? {
              kind: selectedReference.kind,
              id: selectedReference.id,
              name: selectedReference.name,
              memberRole: selectedReference.memberRole ?? null,
              isManual: selectedReference.isManual,
              counsellorId: selectedReference.counsellorId ?? null,
              counsellorName: selectedReference.counsellorName ?? null,
            }
          : needsClientReference && manualClientName.trim()
            ? {
                kind: "client" as const,
                id: 0,
                name: manualClientName.trim(),
                isManual: true,
                counsellorId: manualCounsellor?.id ?? null,
                counsellorName: manualCounsellor?.fullName ?? null,
              }
            : undefined,
      });

      const newLead: DummyLead = {
        id: String(created.id),
        name: created.fullName,
        email: created.email || "",
        phone: created.phone,
        source: sourceLabel,
        visaCategory: created.leadType || undefined,
        status: "new",
        stage: "New",
        assignedToId: created.currentTelecallerId ? String(created.currentTelecallerId) : null,
        assignedToName: null,
        lastFollowupAt: created.nextFollowupAt || null,
        // Use backend-created timestamp (now aligned with IST on create path).
        createdAt: created.createdAt,
      };

      onLeadAdded(newLead);
      setForm(INITIAL_FORM);
      setErrors({});
      onOpenChange(false);
    } catch (err: any) {
      const message = err?.response?.data?.message ?? "Failed to create lead";
      console.error("Failed to create lead:", err);
      const errorField: keyof FormState = /city/i.test(message)
        ? "city"
        : /email/i.test(message)
          ? "email"
          : /phone/i.test(message)
            ? "phone"
            : /source|reference/i.test(message)
              ? "source"
              : "name";
      setErrors((prev) => ({ ...prev, [errorField]: message }));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (isSubmitting) return;
    setForm(INITIAL_FORM);
    setErrors({});
    setSelectedReference(null);
    setReferenceSearch("");
    setShowManualClientInput(false);
    setManualClientName("");
    setManualClientCounsellorId("");
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

            {/* Email & Phone */}
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

            {/* City */}
            <div className="space-y-1.5">
              <Label htmlFor="lead-city" className={errors.city ? "text-destructive" : ""}>City</Label>
              <Input
                id="lead-city"
                placeholder="e.g. Mumbai"
                value={form.city}
                onChange={(e) => set("city")(e.target.value)}
                className={errors.city ? "border-destructive" : ""}
              />
              {errors.city && <p className="text-xs text-destructive">{errors.city}</p>}
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
                    leadTypes
                      .filter((type) => !(isFieldRole && isBlockedForFieldRole(type.leadType)))
                      .map((type) => {
                        const typeId = String(type.id || type.leadTypeId);
                        return (
                          <SelectItem key={typeId} value={typeId}>
                            {getLeadSourceLabel(type.leadType, leadTypes)}
                          </SelectItem>
                        );
                      })
                  )}
                </SelectContent>
              </Select>
              {errors.source && <p className="text-xs text-destructive">{errors.source}</p>}
            </div>

            {needsReferencePick && (
              <div className="space-y-1.5">
                <Label>
                  {needsClientReference ? "Client reference" : "Internal reference"}{" "}
                  <span className="text-destructive">*</span>
                </Label>
                {selectedReference ? (
                  <div className="rounded-md border px-3 py-2 text-sm">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">{selectedReference.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {referenceSubtitle(selectedReference)}
                        </p>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => { setSelectedReference(null); setReferenceSearch(""); }}
                      >
                        Change
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                  {needsInternalReference && user?.id && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="w-full"
                      onClick={() => {
                        const uid = Number(user.id);
                        if (!Number.isFinite(uid)) return;
                        setSelectedReference({
                          kind: "self",
                          id: uid,
                          name: user.name?.trim() || "Self",
                          memberRole: user.role ?? "self",
                        });
                        setReferenceSearch("");
                        setShowReferenceList(false);
                      }}
                    >
                      Self reference (refer yourself)
                    </Button>
                  )}

                  {!showManualClientInput && (
                    <div className="relative" ref={referenceSearchRef}>
                      <Input
                        placeholder={
                          needsInternalReference
                            ? "Search team member (type to filter)…"
                            : "Type at least 3 characters to search…"
                        }
                        value={referenceSearch}
                        onChange={(e) => {
                          setReferenceSearch(e.target.value);
                          setShowReferenceList(true);
                        }}
                        onFocus={() => setShowReferenceList(true)}
                        onKeyDown={(e) => {
                          if (e.key === "Escape") closeReferenceSearch(true);
                        }}
                      />

                      {showReferenceList &&
                        (needsInternalReference || referenceSearch.trim().length >= 3) && (
                        <div
                          className={cn(
                            "absolute z-50 mt-1 w-full rounded-md border bg-popover shadow-md",
                            "max-h-48 overflow-y-scroll overscroll-contain pr-1",
                            "[scrollbar-width:thin] [scrollbar-color:hsl(var(--border))_transparent]",
                            "[&::-webkit-scrollbar]:w-2.5",
                            "[&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-border"
                          )}
                        >
                          {isLoadingReference ? (
                            <div className="p-3 flex justify-center">
                              <Loader2 className="h-4 w-4 animate-spin" />
                            </div>
                          ) : referenceOptions.length === 0 ? (
                            <p className="p-3 text-sm text-muted-foreground">
                              {needsInternalReference && internalTeamDirectory.length === 0
                                ? "Loading team list…"
                                : "No matches found"}
                            </p>
                          ) : (
                            referenceOptions.map((opt) => (
                              <button
                                key={`${opt.kind}-${opt.id}`}
                                type="button"
                                className="w-full text-left px-3 py-2 text-sm hover:bg-muted"
                                onClick={() => {
                                  setSelectedReference({
                                    kind: opt.kind,
                                    id: opt.id,
                                    name: opt.label,
                                    memberRole:
                                      opt.kind === "internal" ? opt.memberRole ?? null : null,
                                  });
                                  setReferenceSearch(opt.label);
                                  setShowReferenceList(false);
                                }}
                              >
                                <span>{opt.label}</span>
                                {opt.kind === "internal" && opt.memberRole && (
                                  <span className="block text-[10px] text-muted-foreground">
                                    {formatReferenceRoleLabel(opt.memberRole)}
                                  </span>
                                )}
                              </button>
                            ))
                          )}
                        </div>
                      )}
                    </div>
                  )} 

                    {needsClientReference && (
                      <div>
                        <button
                          type="button"
                          className="text-xs text-primary hover:underline"
                          onClick={() => {
                            setShowManualClientInput((v) => !v);
                            closeReferenceSearch(true);
                          }}
                        >
                          {showManualClientInput ? "Hide manual entry" : "Client not in system? Enter manually"}
                        </button>
                        {showManualClientInput && (
                          <div className="mt-2 space-y-2 rounded-md border border-dashed p-3 bg-muted/20">
                            <div className="space-y-1">
                              <Label className="text-xs">Client name</Label>
                              <Input
                                placeholder="e.g. Rahul Sharma"
                                value={manualClientName}
                                onChange={(e) => setManualClientName(e.target.value)}
                              />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-xs">Their counsellor / manager (optional)</Label>
                              <SearchableAssigneePicker
                                options={counsellors}
                                value={manualClientCounsellorId}
                                onValueChange={setManualClientCounsellorId}
                                placeholder="Select counsellor or manager…"
                                searchPlaceholder="Type name to filter…"
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Visa Category */}
            <div className="grid grid-cols-1 sm:grid-cols-1 gap-4">
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