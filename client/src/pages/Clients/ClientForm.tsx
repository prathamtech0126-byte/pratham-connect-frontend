
import { PageWrapper } from "@/layout/PageWrapper";
import { FormSection } from "@/components/form/FormSection";
import { FormTextInput } from "@/components/form/FormTextInput";
import { FormDateInput } from "@/components/form/FormDateInput";
import { FormSelectInput } from "@/components/form/FormSelectInput";
import { FormCurrencyInput } from "@/components/form/FormCurrencyInput";
import { FormSwitchInput } from "@/components/form/FormSwitchInput";
import { FormTextareaInput } from "@/components/form/FormTextareaInput";
import { FinancialEntry } from "@/components/form/FinancialEntry";
import { useForm, useWatch, useFieldArray, Control } from "react-hook-form";
import { Trash2 } from "lucide-react";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useLocation, useParams } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { clientService } from "@/services/clientService";
import { useAuth } from "@/context/auth-context";
import { useQueryClient } from "@tanstack/react-query";
import { useSocket } from "@/context/socket-context";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Loader2, Search, X, Plus, Mail, FileText, CheckSquare } from "lucide-react";
import { ClientFormSkeleton } from "@/components/ui/page-skeletons";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import api from "@/lib/api";
import { fetchChecklists, fetchCategories, type ChecklistSummary } from "@/api/checklist.api";

// --- Schema Definitions ---

const financialEntrySchema = z.object({
  amount: z.number().min(0, "Amount cannot be negative").optional(),
  date: z.string().optional(),
  invoiceNo: z.string().optional(),
  remarks: z.string().optional(),
  // All Finance & Employment: total + 2nd-6th installment fields
  totalAmount: z.number().min(0).optional(),
  anotherPaymentAmount: z.number().min(0).optional(),
  anotherPaymentDate: z.string().optional(),
  anotherPaymentAmount2: z.number().min(0).optional(),
  anotherPaymentDate2: z.string().optional(),
  anotherPaymentAmount3: z.number().min(0).optional(),
  anotherPaymentDate3: z.string().optional(),
  anotherPaymentAmount4: z.number().min(0).optional(),
  anotherPaymentDate4: z.string().optional(),
  anotherPaymentAmount5: z.number().min(0).optional(),
  anotherPaymentDate5: z.string().optional(),
});

const insuranceSchema = z.object({
  amount: z.number().optional(),
  insuranceNo: z.string().optional(),
  date: z.string().optional(),
  remarks: z.string().optional(),
});

const beaconSchema = z.object({
  openingDate: z.string().optional(),
  fundingDate: z.string().optional(),
  fundingAmount: z.number().optional(),
  remarks: z.string().optional(),
});

const airTicketSchema = z.object({
  isBooked: z.string().optional(),
  amount: z.number().optional(),
  invoiceNo: z.string().optional(),
  date: z.string().optional(),
  remarks: z.string().optional(),
});

const simCardSchema = z.object({
  isActivated: z.string().optional(),
  plan: z.string().optional(),
  date: z.string().optional(),
  startDate: z.string().optional(),
  remarks: z.string().optional(),
});

const trvExtensionSchema = z.object({
  type: z.string().optional(),
  amount: z.number().optional(),
  date: z.string().optional(),
  invoiceNo: z.string().optional(),
  remarks: z.string().optional(),
  // ✅ Store productPaymentId for updates
  productPaymentId: z.number().nullable().optional(),
});

const newServiceSchema = z.object({
  serviceName: z.string().optional(),
  serviceInfo: z.string().optional(),
  amount: z.number().optional(),
  date: z.string().optional(),
  invoiceNo: z.string().optional(),
  remark: z.string().optional(),
  // ✅ Store productPaymentId for updates
  productPaymentId: z.number().nullable().optional(),
});

// Unified Product Fields Schema - Combines all spouse, visitor, and student fields
const productFieldsSchema = z.object({
  // Common Finance & Employment Fields
  financeAndEmployment: financialEntrySchema.optional(), // All products (Base Fee)
  indianSideEmployment: financialEntrySchema.optional(), // All products

  // Spouse-Specific Finance Fields
  nocLevelJob: financialEntrySchema.optional(),
  lawyerRefuge: financialEntrySchema.optional(),
  onshorePartTime: financialEntrySchema.optional(),

  // Visitor-Specific Fields
  sponsorCharges: financialEntrySchema.optional(),

  // Student-Specific Finance Fields
  ieltsEnrollment: z.object({
    isEnrolled: z.enum(["Yes", "No", ""]).optional(),
    amount: z.number().optional(),
    date: z.string().optional(),
    remarks: z.string().optional(),
  }).optional(),
  loan: z.object({
    amount: z.number().optional(),
    disbursementDate: z.string().optional(),
    remarks: z.string().optional(),
  }).optional(),

  // Spouse-Specific Legal & Documentation Fields
  // TRV Extension - can have multiple instances
  // Stored as object with instance keys: { [instanceKey]: trvExtensionSchema }
  trvExtension: z.record(z.string(), trvExtensionSchema).optional(),
  marriagePhoto: financialEntrySchema.optional(),
  marriageCertificate: financialEntrySchema.optional(),
  relationshipAffidavit: z.object({
    amount: z.number().optional(),
    date: z.string().optional(),
    invoiceNo: z.string().optional(),
    remarks: z.string().optional(),
  }).optional(),
  judicialReview: financialEntrySchema.optional(),
  refusalCharges: financialEntrySchema.optional(),
  kidsStudyPermit: financialEntrySchema.optional(),

  // Student-Specific Services
  forexCard: z.object({
    isActivated: z.string().optional(),
    date: z.string().optional(),
    remarks: z.string().optional(),
  }).optional(),
  forexFees: z.object({
    side: z.string().optional(),
    amount: z.number().optional(),
    date: z.string().optional(),
    feeDate: z.string().optional(),
    remarks: z.string().optional(),
  }).optional(),
  tuitionFee: z.object({
    status: z.string().optional(),
    tutionFeesStatus: z.string().optional(),
    date: z.string().optional(),
    feeDate: z.string().optional(),
    remarks: z.string().optional(),
  }).optional(),
  creditCard: z.object({
    isActivated: z.string().optional(),
    info: z.string().optional(),
    date: z.string().optional(),
    startDate: z.string().optional(),
    remarks: z.string().optional(),
  }).optional(),

  // Common Services (All Products)
  simCard: simCardSchema.optional(),
  insurance: z.object({
    amount: z.number().optional(),
    insuranceNo: z.string().optional(), // For Spouse/Visitor
    policyNo: z.string().optional(), // For Student
    date: z.string().optional(),
    remarks: z.string().optional(),
  }).optional(),
  beaconAccount: z.object({
    openingDate: z.string().optional(),
    fundingDate: z.string().optional(),
    fundingAmount: z.number().optional(),
    cadAmount: z.number().optional(), // Keep for backward compatibility
    remarks: z.string().optional(),
  }).optional(),
  airTicket: airTicketSchema.optional(),

  // New Product Fields
  canadaFund: financialEntrySchema.optional(),
  employmentVerificationCharges: financialEntrySchema.optional(),
  additionalAmountStatementCharges: financialEntrySchema.optional(),

  // Remarks (All Products)
  financeRemarks: z.string().optional(),
  legalRemarks: z.string().optional(), // Spouse only
  servicesRemarks: z.string().optional(),

  // New Services (All Products)
  newServices: z.array(newServiceSchema).optional(),

  // Other Product (from product list) - can have multiple instances
  // Stored as object with instance keys: { [instanceKey]: newServiceSchema }
  otherProduct: z.record(z.string(), newServiceSchema).optional(),
});

const formSchema = z.object({
  // Step 1: Basic Details
  name: z
    .string({ required_error: "Please enter full name" })
    .trim()
    .min(1, "Please enter full name"),
  enrollmentDate: z
    .string({ required_error: "Please select an enrollment date" })
    .min(1, "Please select an enrollment date"),
  passportDetails: z
    .string({ required_error: "Please enter passport details" })
    .min(1, "Please enter passport details")
    .max(100, "Passport details must be 100 characters or less"),
  salesType: z
    .string({ required_error: "Please select a sales type" })
    .min(1, "Please select a sales type"),

  // Lead Source (optional)
  leadSource: z.string().optional(),

  // For "Other Product" selection
  selectedProductType: z.string().optional(),

  /** Synced from selected sale type row `categoryName` (or product type for Other Product) — used for payment rules */
  saleTypeCategoryName: z.string().optional(),

  // Step 2: Consultancy Payment (0 allowed for student category only; see superRefine)
  totalPayment: z.preprocess(
    (val) => {
      if (val === undefined || val === null || val === "") return 0;
      const n = Number(val);
      return Number.isFinite(n) ? n : 0;
    },
    z.number().min(0, "Total payment cannot be negative"),
  ),

  // Payment Groups using financialEntrySchema for consistency
  initialPayment: financialEntrySchema,
  beforeVisaPayment: financialEntrySchema,
  afterVisaPayment: financialEntrySchema,

  // amountPending is calculated
  amountPending: z.number().optional(),

  // Payment section visibility toggles
  showInitialPayment: z.boolean().optional(),
  showBeforeVisaPayment: z.boolean().optional(),
  showAfterVisaPayment: z.boolean().optional(),

  // Counsellor ID
  counsellorId: z.number().optional(),

  // Step 3: Unified Product Fields (Combines all spouse, visitor, and student fields)
  productFields: productFieldsSchema.optional(),
}).superRefine((data, ctx) => {
  const category = String(data.saleTypeCategoryName || "").toLowerCase();
  const isStudentCategory = category === "student";
  const totalNum = Number(data.totalPayment);
  if (!isStudentCategory && (!Number.isFinite(totalNum) || totalNum <= 0)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Total payment must be greater than 0 for this sale type",
      path: ["totalPayment"],
    });
  }

  // Calculate sum of all payment amounts
  const initialAmount = data.initialPayment?.amount || 0;
  const beforeVisaAmount = data.beforeVisaPayment?.amount || 0;
  const afterVisaAmount = data.afterVisaPayment?.amount || 0;
  const totalPayments = initialAmount + beforeVisaAmount + afterVisaAmount;

  const totalCap = Number(data.totalPayment);
  const cap = Number.isFinite(totalCap) ? totalCap : 0;
  // Sum of stage payments must not exceed total (including when total is 0)
  if (totalPayments > cap) {
    const errorMessage = `Total payments (${totalPayments.toLocaleString()}) exceed total payment (${cap.toLocaleString()})`;

    // Set error on all payment fields that are visible/enabled
    // This helps users understand which fields contribute to the excess
    if (data.showInitialPayment) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: errorMessage,
        path: ["initialPayment", "amount"],
      });
    }
    if (data.showBeforeVisaPayment) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: errorMessage,
        path: ["beforeVisaPayment", "amount"],
      });
    }
    if (data.showAfterVisaPayment) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: errorMessage,
        path: ["afterVisaPayment", "amount"],
      });
    }
  }
});

type FormValues = z.infer<typeof formSchema>;

function NewServiceSection({
  control,
  namePrefix,
  title,
}: {
  control: any;
  namePrefix: string;
  title: string;
}) {
  const { fields, append, remove } = useFieldArray({
    control,
    name: `${namePrefix}.newServices`,
  });

  return (
    <div className="space-y-4">
      {fields.map((field, index) => (
        <div
          key={field.id}
          className="p-4 border rounded-lg bg-primary/5 space-y-3 relative group"
        >
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="absolute top-2 right-2 text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={() => remove(index)}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
          <Label className="text-base font-semibold flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-[10px] text-primary-foreground">
              NEW
            </span>
            {title} - Sell {index + 1}
          </Label>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormTextInput
              name={`${namePrefix}.newServices.${index}.serviceName`}
              control={control}
              label="Service Name"
              placeholder="e.g. Extra Documentation"
            />
            <FormTextInput
              name={`${namePrefix}.newServices.${index}.serviceInfo`}
              control={control}
              label="Service Information"
              placeholder="Enter service details"
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <FormCurrencyInput
              name={`${namePrefix}.newServices.${index}.amount`}
              control={control}
              label="Amount"
              placeholder="Enter amount"
            />
            <FormDateInput
              name={`${namePrefix}.newServices.${index}.date`}
              control={control}
              label="Date"
              maxDate={new Date()}
            />
            <FormTextInput
              name={`${namePrefix}.newServices.${index}.invoiceNo`}
              control={control}
              label="Invoice No"
              placeholder="INV-000"
            />
          </div>
          <FormTextareaInput
            name={`${namePrefix}.newServices.${index}.remark`}
            control={control}
            label="Remark"
            placeholder="Add any specific remarks for this new service"
          />
        </div>
      ))}
      <Button
        type="button"
        variant="outline"
        className="w-full border-dashed"
        onClick={() => append({})}
      >
        <Plus className="h-4 w-4 mr-2" />
        Add Another Sell
      </Button>
    </div>
  );
}

export default function ClientForm() {
  const buildAllFinanceEntityData = (fieldData: any, partialPaymentFlag: boolean) => ({
    amount: fieldData.amount,
    paymentDate: fieldData.date || fieldData.paymentDate || new Date().toISOString().split("T")[0],
    invoiceNo: fieldData.invoiceNo || "",
    remarks: fieldData.remarks || "",
    partialPayment: partialPaymentFlag,
    totalAmount: fieldData.totalAmount != null && fieldData.totalAmount !== "" ? String(fieldData.totalAmount) : undefined,
    anotherPaymentAmount: fieldData.anotherPaymentAmount != null && fieldData.anotherPaymentAmount !== "" ? String(fieldData.anotherPaymentAmount) : undefined,
    anotherPaymentDate: fieldData.anotherPaymentDate || undefined,
    anotherPaymentAmount2: fieldData.anotherPaymentAmount2 != null && fieldData.anotherPaymentAmount2 !== "" ? String(fieldData.anotherPaymentAmount2) : undefined,
    anotherPaymentDate2: fieldData.anotherPaymentDate2 || undefined,
    anotherPaymentAmount3: fieldData.anotherPaymentAmount3 != null && fieldData.anotherPaymentAmount3 !== "" ? String(fieldData.anotherPaymentAmount3) : undefined,
    anotherPaymentDate3: fieldData.anotherPaymentDate3 || undefined,
    anotherPaymentAmount4: fieldData.anotherPaymentAmount4 != null && fieldData.anotherPaymentAmount4 !== "" ? String(fieldData.anotherPaymentAmount4) : undefined,
    anotherPaymentDate4: fieldData.anotherPaymentDate4 || undefined,
    anotherPaymentAmount5: fieldData.anotherPaymentAmount5 != null && fieldData.anotherPaymentAmount5 !== "" ? String(fieldData.anotherPaymentAmount5) : undefined,
    anotherPaymentDate5: fieldData.anotherPaymentDate5 || undefined,
  });

  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { socket, isConnected } = useSocket();

  const [dynamicOptions, setDynamicOptions] = useState<any[]>([]);
  const [allSaleTypes, setAllSaleTypes] = useState<any[]>([]);
  const [leadTypes, setLeadTypes] = useState<any[]>([]);
  const [isEditMode, setIsEditMode] = useState(false);
  const [internalClientId, setInternalClientId] = useState<number | null>(null);
  const [isLoadingClientData, setIsLoadingClientData] = useState(false);
  const [clientDataToLoad, setClientDataToLoad] = useState<any>(null);

  // State for preventing multiple clicks/submissions
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loadingStep, setLoadingStep] = useState<number | null>(null);
  const requestInFlightRef = useRef(false); // Additional protection against race conditions

  // State for single page form
  const [isClientCreated, setIsClientCreated] = useState(false);
  const [showProductSection, setShowProductSection] = useState(false);
  const [showServiceSection, setShowServiceSection] = useState(false);

  // State for product search and selection
  const [productSearchQuery, setProductSearchQuery] = useState("");
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);
  const [addedProducts, setAddedProducts] = useState<Array<{
    id: string;
    name: string;
    productName: string;
    formType: string;
    instanceKey: string; // Unique key for each instance
  }>>([]);

  // State for partial payment (All Finance & Employment)
  const [isPartialPayment, setIsPartialPayment] = useState(false);
  const [approvalStatus, setApprovalStatus] = useState<"pending" | "approved" | "rejected" | null>(null);
  const [approverName, setApproverName] = useState<string | null>(null);
  const [showProductSearch, setShowProductSearch] = useState(false);

  // Send Checklist dialog state
  const [showSendChecklistDialog, setShowSendChecklistDialog] = useState(false);
  const [checklistDialogChecklists, setChecklistDialogChecklists] = useState<ChecklistSummary[]>([]);
  const [checklistDialogLoading, setChecklistDialogLoading] = useState(false);
  const [selectedChecklistToSend, setSelectedChecklistToSend] = useState<ChecklistSummary | null>(null);
  const [isSendingEmail, setIsSendingEmail] = useState(false);

  // Field-level errors for API validation errors
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const { id: clientIdFromUrl } = useParams<{ id: string }>();

  // Socket listeners for all finance approval/rejection events
  useEffect(() => {
    if (!socket || !isConnected) {
      return;
    }

    // Listen for all finance approval
    const handleAllFinanceApproved = (data: {
      financeId: number;
      productPaymentId?: number;
      clientId?: number;
      clientName?: string;
      amount?: string;
    }) => {
      // console.log("[ClientForm] All Finance approved event received:", data);

      // Check if this approval is for the current client
      if (data.clientId && Number(clientIdFromUrl) === data.clientId) {
        // Update approval status to approved
        setApprovalStatus("approved");
        setIsPartialPayment(false); // Reset partial payment since it's now approved

        // Refetch client data to get approver name
        if (internalClientId) {
          queryClient.invalidateQueries({ queryKey: ["client", internalClientId] });
        }

        toast({
          title: "Payment Approved",
          description: `All Finance & Employment payment ($${data.amount || "N/A"}) has been approved by manager. Fields are now enabled.`,
        });
      } else {
        // Show notification even if not on this client's form
        toast({
          title: "Payment Approved",
          description: `All Finance & Employment payment for ${data.clientName || "client"} has been approved.`,
        });
      }
    };

    // Listen for all finance rejection
    const handleAllFinanceRejected = (data: {
      financeId: number;
      productPaymentId?: number;
      clientId?: number;
      clientName?: string;
      amount?: string;
    }) => {
      // console.log("[ClientForm] All Finance rejected event received:", data);

      // Check if this rejection is for the current client
      if (data.clientId && Number(clientIdFromUrl) === data.clientId) {
        // Update approval status to rejected
        setApprovalStatus("rejected");

        toast({
          title: "Payment Rejected",
          description: `All Finance & Employment payment ($${data.amount || "N/A"}) has been rejected by manager.`,
          variant: "destructive",
        });
      } else {
        // Show notification even if not on this client's form
        toast({
          title: "Payment Rejected",
          description: `All Finance & Employment payment for ${data.clientName || "client"} has been rejected.`,
          variant: "destructive",
        });
      }
    };

    // Register event listeners
    socket.on("allFinance:approved", handleAllFinanceApproved);
    socket.on("allFinance:rejected", handleAllFinanceRejected);

    // console.log("[ClientForm] Socket event listeners registered for allFinance events");

    // Cleanup on unmount
    return () => {
      socket.off("allFinance:approved", handleAllFinanceApproved);
      socket.off("allFinance:rejected", handleAllFinanceRejected);
    };
  }, [socket, isConnected, clientIdFromUrl, toast]);

  // Available products list for search and add
  const availableProducts = [
    // Finance & Employment
    {
      id: "financeAndEmployment",
      name: "All Finance & Employment",
      category: "Finance",
      productName: "ALL_FINANCE_EMPLOYEMENT",
      formType: "financialEntry",
      description: "Base fee for all products"
    },
    {
      id: "indianSideEmployment",
      name: "Indian Side Employment",
      category: "Finance",
      productName: "INDIAN_SIDE_EMPLOYEMENT",
      formType: "financialEntry",
      description: "Indian side employment charges"
    },
    // Student Products
    {
      id: "ieltsEnrollment",
      name: "IELTS Enrollment",
      category: "Student",
      productName: "IELTS_ENROLLMENT",
      formType: "ieltsEnrollment",
      description: "IELTS enrollment details"
    },
    {
      id: "loan",
      name: "Loan Details",
      category: "Student",
      productName: "LOAN_DETAILS",
      formType: "loan",
      description: "Loan information and disbursement"
    },
    {
      id: "forexCard",
      name: "Forex Card",
      category: "Student",
      productName: "FOREX_CARD",
      formType: "forexCard",
      description: "Forex card activation"
    },
    {
      id: "forexFees",
      name: "Forex Fees",
      category: "Student",
      productName: "FOREX_FEES",
      formType: "forexFees",
      description: "Forex fees payment"
    },
    {
      id: "tuitionFee",
      name: "Tuition Fee",
      category: "Student",
      productName: "TUTION_FEES",
      formType: "tuitionFee",
      description: "Tuition fee payment"
    },
    {
      id: "creditCard",
      name: "Credit Card",
      category: "Student",
      productName: "CREDIT_CARD",
      formType: "creditCard",
      description: "Credit card information"
    },
    // Spouse Products
    {
      id: "nocLevelJob",
      name: "NOC Level Job Arrangement",
      category: "Spouse",
      productName: "NOC_LEVEL_JOB_ARRANGEMENT",
      formType: "financialEntry",
      description: "NOC level job arrangement charges"
    },
    {
      id: "lawyerRefuge",
      name: "Lawyer Refusal Charge",
      category: "Spouse",
      productName: "LAWYER_REFUSAL_CHARGE",
      formType: "financialEntry",
      description: "Lawyer refusal charges"
    },
    {
      id: "onshorePartTime",
      name: "Onshore Part-Time Employment",
      category: "Spouse",
      productName: "ONSHORE_PART_TIME_EMPLOYEMENT",
      formType: "financialEntry",
      description: "Onshore part-time employment"
    },
    {
      id: "trvExtension",
      name: "TRV/Work Permit Extension",
      category: "Spouse",
      productName: "TRV_WORK_PERMIT_EXT_STUDY_PERMIT_EXTENSION",
      formType: "trvExtension",
      description: "TRV or work permit extension"
    },
    {
      id: "marriagePhoto",
      name: "Marriage Photo for Court Marriage",
      category: "Spouse",
      productName: "MARRIAGE_PHOTO_FOR_COURT_MARRIAGE",
      formType: "financialEntry",
      description: "Marriage photo charges"
    },
    {
      id: "marriageCertificate",
      name: "Marriage Photo + Certificate",
      category: "Spouse",
      productName: "MARRIAGE_PHOTO_CERTIFICATE",
      formType: "financialEntry",
      description: "Marriage certificate charges"
    },
    {
      id: "relationshipAffidavit",
      name: "Relationship Affidavit",
      category: "Spouse",
      productName: "RECENTE_MARRIAGE_RELATIONSHIP_AFFIDAVIT",
      formType: "relationshipAffidavit",
      description: "Relationship affidavit charges"
    },
    {
      id: "judicialReview",
      name: "Judicial Review Charge",
      category: "Spouse",
      productName: "JUDICAL_REVIEW_CHARGE",
      formType: "financialEntry",
      description: "Judicial review charges"
    },
    {
      id: "refusalCharges",
      name: "Refusal Charges",
      category: "Spouse",
      productName: "REFUSAL_CHARGES",
      formType: "financialEntry",
      description: "Refusal charges"
    },
    {
      id: "kidsStudyPermit",
      name: "Kids Study Permit",
      category: "Spouse",
      productName: "KIDS_STUDY_PERMIT",
      formType: "financialEntry",
      description: "Kids study permit charges"
    },
    // Visitor Products
    {
      id: "sponsorCharges",
      name: "Sponsor Charges",
      category: "Visitor",
      productName: "SPONSOR_CHARGES",
      formType: "sponsorCharges",
      description: "Sponsor charges (₹10,000 + GST)"
    },
    // Common Services (All Products)
    {
      id: "simCard",
      name: "SIM Card Activation",
      category: "Common",
      productName: "SIM_CARD_ACTIVATION",
      formType: "simCard",
      description: "SIM card activation and plan"
    },
    {
      id: "insurance",
      name: "Insurance",
      category: "Common",
      productName: "INSURANCE",
      formType: "insurance",
      description: "Insurance policy details"
    },
    {
      id: "beaconAccount",
      name: "Beacon Account",
      category: "Common",
      productName: "BEACON_ACCOUNT",
      formType: "beaconAccount",
      description: "Beacon account opening and funding"
    },
    {
      id: "airTicket",
      name: "Air Ticket",
      category: "Common",
      productName: "AIR_TICKET",
      formType: "airTicket",
      description: "Air ticket booking details"
    },
    // New Products
    {
      id: "canadaFund",
      name: "Canada Fund",
      category: "Finance",
      productName: "CANADA_FUND",
      formType: "financialEntry",
      description: "Canada Fund charges"
    },
    {
      id: "employmentVerificationCharges",
      name: "Canada Side Employment Verification Charges",
      category: "Finance",
      productName: "EMPLOYMENT_VERIFICATION_CHARGES",
      formType: "financialEntry",
      description: "Employment verification charges"
    },
    {
      id: "additionalAmountStatementCharges",
      name: "Additional Amount Statement Charges",
      category: "Finance",
      productName: "ADDITIONAL_AMOUNT_STATEMENT_CHARGES",
      formType: "financialEntry",
      description: "Additional amount statement charges"
    },
    // Other Product (Custom Product)
    {
      id: "otherProduct",
      name: "Other Product",
      category: "Other",
      productName: "OTHER_NEW_SELL",
      formType: "otherProduct",
      description: "Add a custom product with custom name and details"
    }
  ];

  // Filter products based on search
  const filteredProducts = availableProducts.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(
      productSearchQuery.toLowerCase()
    ) || product.description?.toLowerCase().includes(
      productSearchQuery.toLowerCase()
    ) || product.category.toLowerCase().includes(
      productSearchQuery.toLowerCase()
    );
    return matchesSearch;
  });

  // Handle product selection
  const handleProductToggle = (productId: string) => {
    setSelectedProductIds(prev =>
      prev.includes(productId)
        ? prev.filter(id => id !== productId)
        : [...prev, productId]
    );
  };

  // Handle add selected products
  const handleAddSelectedProducts = () => {
    // Products that allow multiple instances
    const allowMultipleInstances = ["otherProduct", "trvExtension"];

    const productsToAdd = availableProducts.filter(p => {
      if (!selectedProductIds.includes(p.id)) return false;

      // For products that allow multiple instances, always allow adding
      if (allowMultipleInstances.includes(p.id)) return true;

      // For other products, check if already added (single instance only)
      return !addedProducts.some(added => added.id === p.id);
    });

    setAddedProducts(prev => [
      ...prev,
      ...productsToAdd.map(p => ({
        id: p.id,
        name: p.name,
        productName: p.productName,
        formType: p.formType,
        instanceKey: `${p.id}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}` // Unique key for each instance
      }))
    ]);

    // Clear selection
    setSelectedProductIds([]);
    setProductSearchQuery("");
    setShowProductSearch(false);

    toast({
      title: "Success",
      description: `${productsToAdd.length} product(s) added successfully.`,
    });
  };

  // Handle remove product
  const handleRemoveProduct = (instanceKey: string) => {
    setAddedProducts(prev => {
      const product = prev.find(p => p.instanceKey === instanceKey);
      if (product) {
        // Clear form data for this product instance
        const allowMultiple = product.id === "otherProduct" || product.id === "trvExtension";
        if (allowMultiple) {
          // For multiple-instance products, clear by instanceKey
          setValue(`productFields.${product.id}.${instanceKey}` as any, undefined);
        } else {
          // For single-instance products, clear by id
          setValue(`productFields.${product.id}` as any, undefined);
        }
      }
      return prev.filter(p => p.instanceKey !== instanceKey);
    });
  };

  // Handle add another instance (for products that allow multiple instances)
  const handleAddAnotherInstance = (productId: string) => {
    const product = availableProducts.find(p => p.id === productId);
    if (product && (productId === "otherProduct" || productId === "trvExtension")) {
      const newInstanceKey = `${productId}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      setAddedProducts(prev => [
        ...prev,
        {
          id: product.id,
          name: product.name,
          productName: product.productName,
          formType: product.formType,
          instanceKey: newInstanceKey
        }
      ]);
    }
  };

  // Helper to map product data from API to form structure
  const mapProductDataToForm = (clientData: any, type: string) => {
    const productPayments = clientData.productPayments || [];
    const fields: any = {};

    // Base mappings for all product types
    const baseMappings: Record<string, string> = {
      "ALL_FINANCE_EMPLOYEMENT": "financeAndEmployment", // All products use financeAndEmployment
      "INDIAN_SIDE_EMPLOYEMENT": "indianSideEmployment",
      "NOC_LEVEL_JOB_ARRANGEMENT": "nocLevelJob",
      "LAWYER_REFUSAL_CHARGE": "lawyerRefuge",
      "RECENTE_MARRIAGE_RELATIONSHIP_AFFIDAVIT": "relationshipAffidavit",
      "MARRIAGE_PHOTO_CERTIFICATE": "marriageCertificate",
      "MARRIAGE_PHOTO_FOR_COURT_MARRIAGE": "marriagePhoto",
      "TRV_WORK_PERMIT_EXT_STUDY_PERMIT_EXTENSION": "trvExtension",
      "ONSHORE_PART_TIME_EMPLOYEMENT": "onshorePartTime",
      "JUDICAL_REVIEW_CHARGE": "judicialReview",
      "REFUSAL_CHARGES": "refusalCharges",
      "KIDS_STUDY_PERMIT": "kidsStudyPermit",
      "SPONSOR_CHARGES": "sponsorCharges",
      "SIM_CARD_ACTIVATION": "simCard",
      "AIR_TICKET": "airTicket",
      "INSURANCE": "insurance",
      "BEACON_ACCOUNT": "beaconAccount",
      "IELTS_ENROLLMENT": "ieltsEnrollment",
      "LOAN_DETAILS": "loan",
      "FOREX_FEES": "forexFees",
      "TUTION_FEES": "tuitionFee",
      "FOREX_CARD": "forexCard",
      "CREDIT_CARD": "creditCard",
      "CANADA_FUND": "canadaFund",
      "EMPLOYMENT_VERIFICATION_CHARGES": "employmentVerificationCharges",
      "ADDITIONAL_AMOUNT_STATEMENT_CHARGES": "additionalAmountStatementCharges"
    };

    // Initialize newServices array for collecting OTHER_NEW_SELL items
    if (!fields.newServices) {
      fields.newServices = [];
    }

    productPayments.forEach((pp: any) => {
      // Handle OTHER_NEW_SELL separately - it goes into newServices array
      if (pp.productName === "OTHER_NEW_SELL") {
        const entity = pp.entity || {};
        const newServiceItem = {
          serviceName: entity.serviceName || "",
          serviceInfo: entity.serviceInformation || "",
          amount: Number(entity.amount || 0),
          date: entity.sellDate || "",
          invoiceNo: entity.invoiceNo || "", // Map invoiceNo from entity
          remark: entity.remarks || entity.remark || "",
          // ✅ Store entityId to identify this item for updates
          entityId: entity.id || pp.entityId || null,
          // ✅ Store productPaymentId for reference
          productPaymentId: pp.productPaymentId || pp.id || null,
        };
        fields.newServices.push(newServiceItem);
        return; // Skip the rest of the loop for this item
      }

      const fieldName = baseMappings[pp.productName];
      if (fieldName) {
        // Special handling for nested structures like simCard, insurance etc
        if (["simCard", "insurance", "beaconAccount", "airTicket", "ieltsEnrollment", "loan", "forexFees", "tuitionFee", "trvExtension", "forexCard", "creditCard"].includes(fieldName)) {
          // Get entity data (API returns pp.entity, not pp.entityData)
          const entity = pp.entity || {};
          const existingData = fields[fieldName] || {};

          // Map entity fields to form fields based on product type
          let mappedEntityData: any = {};

          if (fieldName === "airTicket") {
            // AIR_TICKET: isTicketBooked -> isBooked (boolean to "Yes"/"No"), ticketDate -> date, airTicketNumber -> invoiceNo
            mappedEntityData = {
              isBooked: entity.isTicketBooked === true ? "Yes" : entity.isTicketBooked === false ? "No" : "",
              amount: Number(entity.amount || 0),
              invoiceNo: entity.airTicketNumber || entity.invoiceNo || "",
              date: entity.ticketDate || "",
              remarks: entity.remarks || "",
            };
          } else if (fieldName === "simCard") {
            // SIM_CARD_ACTIVATION: activatedStatus -> isActivated, simcardPlan -> plan, simCardGivingDate -> date, simActivationDate -> startDate
            mappedEntityData = {
              isActivated: entity.activatedStatus === true ? "Yes" : entity.activatedStatus === false ? "No" : "",
              plan: entity.simcardPlan || "",
              date: entity.simCardGivingDate || "",
              startDate: entity.simActivationDate || "",
              remarks: entity.remarks || "",
            };
          } else if (fieldName === "insurance") {
            // INSURANCE: insuranceDate -> date, policyNumber -> policyNo/insuranceNo
            // Note: API uses "policyNumber", form uses "insuranceNo" for spouse/visitor, "policyNo" for student
            mappedEntityData = {
              amount: Number(entity.amount || 0),
              policyNo: entity.policyNumber || entity.policyNo || "",
              insuranceNo: entity.policyNumber || entity.insuranceNo || "",
              date: entity.insuranceDate || "",
              remarks: entity.remarks || "",
            };
          } else if (fieldName === "beaconAccount") {
            // BEACON_ACCOUNT: accountDate -> fundingDate (or openingDate), amount -> fundingAmount
            mappedEntityData = {
              openingDate: entity.openingDate || "",
              fundingDate: entity.accountDate || entity.fundingDate || "",
              fundingAmount: Number(entity.amount || 0),
              cadAmount: Number(entity.amount || 0), // Keep for backward compatibility
              remarks: entity.remarks || "",
            };
          } else if (fieldName === "forexFees") {
            // FOREX_FEES: feeDate -> date, side -> side
            mappedEntityData = {
              side: entity.side || "",
              amount: Number(entity.amount || 0),
              date: entity.feeDate || "",
              remarks: entity.remarks || "",
            };
          } else if (fieldName === "tuitionFee") {
            // TUTION_FEES: tutionFeesStatus -> status (capitalize for form), feeDate -> date
            const statusValue = entity.tutionFeesStatus || "";
            // Capitalize first letter to match form dropdown values ("Pending", "Paid")
            const capitalizedStatus = statusValue
              ? statusValue.charAt(0).toUpperCase() + statusValue.slice(1).toLowerCase()
              : "";
            mappedEntityData = {
              status: capitalizedStatus,
              date: entity.feeDate || "",
              remarks: entity.remarks || "",
            };
          } else if (fieldName === "ieltsEnrollment") {
            // IELTS_ENROLLMENT: enrolledStatus -> isEnrolled (boolean to "Yes"/"No" for form dropdown), enrollmentDate -> date
            mappedEntityData = {
              isEnrolled: entity.enrolledStatus === true ? "Yes" : entity.enrolledStatus === false ? "No" : (entity.isEnrolled === true ? "Yes" : entity.isEnrolled === false ? "No" : ""),
              amount: Number(entity.amount || 0),
              date: entity.enrollmentDate || entity.date || "",
              remarks: entity.remarks || "",
            };
          } else if (fieldName === "loan") {
            // LOAN_DETAILS: disbursmentDate (backend typo) or disbursementDate -> disbursementDate
            // Backend returns "disbursmentDate" (one 'e'), but we use "disbursementDate" (two 'e's) in form
            // Check both variations to handle backend typo and potential future fix
            const disbursementDateValue = entity.disbursmentDate || entity.disbursementDate || "";
            mappedEntityData = {
              amount: Number(entity.amount || 0),
              disbursementDate: disbursementDateValue,
              remarks: entity.remarks || "",
            };
          } else if (fieldName === "trvExtension") {
            // TRV_EXTENSION: extensionDate -> date
            mappedEntityData = {
              type: entity.type || "",
              amount: Number(entity.amount || 0),
              date: entity.extensionDate || entity.date || "",
              invoiceNo: entity.invoiceNo || "",
              remarks: entity.remarks || "",
            };
          } else if (fieldName === "forexCard") {
            // FOREX_CARD: forexCardStatus -> isActivated (boolean/string to "Yes"/"No"/""), cardDate -> date
            let isActivatedValue = "";
            if (entity.forexCardStatus !== undefined && entity.forexCardStatus !== null) {
              // Convert boolean or string to "Yes"/"No"
              if (entity.forexCardStatus === true || entity.forexCardStatus === "true" || entity.forexCardStatus === "Yes") {
                isActivatedValue = "Yes";
              } else if (entity.forexCardStatus === false || entity.forexCardStatus === "false" || entity.forexCardStatus === "No") {
                isActivatedValue = "No";
              }
            }
            mappedEntityData = {
              isActivated: isActivatedValue,
              date: entity.cardDate || "",
              remarks: entity.remarks || "",
            };
          } else if (fieldName === "creditCard") {
            // CREDIT_CARD: activatedStatus -> isActivated, cardPlan -> info, cardDate/cardGivingDate -> date, cardActivationDate -> startDate
            mappedEntityData = {
              isActivated: entity.activatedStatus === true ? "Yes" : entity.activatedStatus === false ? "No" : "",
              info: entity.cardPlan || "",
              date: entity.cardGivingDate || entity.cardDate || "",
              startDate: entity.cardActivationDate || "",
              remarks: entity.remarks || "",
            };
          } else {
            // Fallback: use entity as-is
            mappedEntityData = entity;
          }

          fields[fieldName] = {
            ...existingData,
            ...mappedEntityData,
          };
        } else if (fieldName === "sponsorCharges") {
          // Sponsor charges uses financialEntrySchema structure
          // For master_only products, date is at top level as paymentDate
          fields[fieldName] = {
            amount: Number(pp.amount || 0),
            date: pp.paymentDate || pp.date || "", // Use paymentDate for master_only products
            invoiceNo: pp.invoiceNo || "",
            remarks: pp.remarks || "",
          };
        } else {
          // Standard financialEntrySchema fields (including financeAndEmployment)
          const entity = pp.entity || {};
          fields[fieldName] = {
            amount: Number(pp.amount || entity.amount || 0),
            date: pp.paymentDate || entity.paymentDate || "",
            invoiceNo: pp.invoiceNo || entity.invoiceNo || "",
            remarks: pp.remarks || entity.remarks || "",
            totalAmount: entity.totalAmount != null ? Number(entity.totalAmount) : 0,
            anotherPaymentAmount: entity.anotherPaymentAmount != null ? Number(entity.anotherPaymentAmount) : 0,
            anotherPaymentDate: entity.anotherPaymentDate || "",
            anotherPaymentAmount2: entity.anotherPaymentAmount2 != null ? Number(entity.anotherPaymentAmount2) : 0,
            anotherPaymentDate2: entity.anotherPaymentDate2 || "",
            anotherPaymentAmount3: entity.anotherPaymentAmount3 != null ? Number(entity.anotherPaymentAmount3) : 0,
            anotherPaymentDate3: entity.anotherPaymentDate3 || "",
            anotherPaymentAmount4: entity.anotherPaymentAmount4 != null ? Number(entity.anotherPaymentAmount4) : 0,
            anotherPaymentDate4: entity.anotherPaymentDate4 || "",
            anotherPaymentAmount5: entity.anotherPaymentAmount5 != null ? Number(entity.anotherPaymentAmount5) : 0,
            anotherPaymentDate5: entity.anotherPaymentDate5 || "",
          };

          // For financeAndEmployment, also load partialPayment and approvalStatus
          if (fieldName === "financeAndEmployment") {
            if (entity.partialPayment !== undefined) {
              setIsPartialPayment(entity.partialPayment === true);
            }
            if (entity.approvalStatus) {
              setApprovalStatus(entity.approvalStatus as "pending" | "approved" | "rejected");
            }
            // Load approver name if available
            if (entity.approver?.name) {
              setApproverName(entity.approver.name);
            } else if (entity.approvedBy) {
              // Fallback: if approver object not available, we'll show the ID or fetch name
              setApproverName(null); // Will be handled by displaying approver object if available
            }
          }
        }
      } else {

      }
    });


    return fields;
  };

  // Update Total Payment when Sales Type changes
  const getProductType = (
    salesType: string | undefined,
    selectedProductType?: string,
  ): "spouse" | "visitor" | "student" | null => {
    if (!salesType) return null;

    const lower = salesType.toLowerCase();

    // For "Other Product", use the selectedProductType
    if (lower === "other product") {
      if (selectedProductType === "spouse") return "spouse";
      if (selectedProductType === "visitor") return "visitor";
      if (selectedProductType === "student") return "student";
      return null;
    }

    // Handle standard sales types
    if (lower.includes("spouse") || lower === "spousal pr") return "spouse";
    if (lower.includes("visitor") || lower.includes("schengen"))
      return "visitor";
    if (lower.includes("student")) return "student";
    return null;
  };

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    mode: "onChange",
    shouldUnregister: false, // Keep fields registered even when values are cleared
    defaultValues: {
      name: "",
      enrollmentDate: "",
      salesType: "",
      leadSource: "",
      selectedProductType: "",
      saleTypeCategoryName: "",
      totalPayment: 0,
      initialPayment: { amount: 0, date: "", invoiceNo: "", remarks: "" },
      beforeVisaPayment: { amount: 0, date: "", invoiceNo: "", remarks: "" },
      afterVisaPayment: { amount: 0, date: "", invoiceNo: "", remarks: "" },
      amountPending: 0,
      showInitialPayment: false,
      showBeforeVisaPayment: false,
      showAfterVisaPayment: false,
      // Initialize unified productFields with all fields (combines spouse, visitor, and student)
      productFields: {
        // Common Finance & Employment Fields
        financeAndEmployment: {
          totalAmount: 0,
          amount: 0,
          date: "",
          invoiceNo: "",
          remarks: "",
          anotherPaymentAmount: 0,
          anotherPaymentDate: "",
          anotherPaymentAmount2: 0,
          anotherPaymentDate2: "",
          anotherPaymentAmount3: 0,
          anotherPaymentDate3: "",
          anotherPaymentAmount4: 0,
          anotherPaymentDate4: "",
          anotherPaymentAmount5: 0,
          anotherPaymentDate5: "",
        },
        indianSideEmployment: { amount: 0, date: "", invoiceNo: "", remarks: "" },

        // Spouse-Specific Finance Fields
        nocLevelJob: { amount: 0, date: "", invoiceNo: "", remarks: "" },
        lawyerRefuge: { amount: 0, date: "", invoiceNo: "", remarks: "" },
        onshorePartTime: { amount: 0, date: "", invoiceNo: "", remarks: "" },

        // Visitor-Specific Fields
        sponsorCharges: { amount: 0, date: "", invoiceNo: "", remarks: "" },

        // Student-Specific Finance Fields
        ieltsEnrollment: { isEnrolled: "", amount: 0, date: "", remarks: "" },
        loan: { amount: 0, disbursementDate: "", remarks: "" },

        // Spouse-Specific Legal & Documentation Fields
        trvExtension: {}, // Multiple instances - stored as record with instance keys
        marriagePhoto: { amount: 0, date: "", invoiceNo: "", remarks: "" },
        marriageCertificate: { amount: 0, date: "", invoiceNo: "", remarks: "" },
        relationshipAffidavit: { amount: 0, date: "", invoiceNo: "", remarks: "" },
        judicialReview: { amount: 0, date: "", invoiceNo: "", remarks: "" },
        refusalCharges: { amount: 0, date: "", invoiceNo: "", remarks: "" },
        kidsStudyPermit: { amount: 0, date: "", invoiceNo: "", remarks: "" },

        // Student-Specific Services
        forexCard: { isActivated: "", date: "", remarks: "" },
        forexFees: { side: "", amount: 0, date: "", remarks: "" },
        tuitionFee: { status: "", date: "", remarks: "" },
        creditCard: { isActivated: "", info: "", date: "", startDate: "", remarks: "" },

        // Common Services (All Products)
        simCard: { isActivated: "", plan: "", date: "", startDate: "", remarks: "" },
        insurance: { amount: 0, insuranceNo: "", policyNo: "", date: "", remarks: "" },
        beaconAccount: {
          openingDate: "",
          fundingDate: "",
          fundingAmount: 0,
          cadAmount: 0,
          remarks: "",
        },
        airTicket: { isBooked: "", amount: 0, invoiceNo: "", date: "", remarks: "" },

        // New Product Fields
        canadaFund: { amount: 0, date: "", invoiceNo: "", remarks: "" },
        employmentVerificationCharges: { amount: 0, date: "", invoiceNo: "", remarks: "" },
        additionalAmountStatementCharges: { amount: 0, date: "", invoiceNo: "", remarks: "" },

        // Remarks (All Products)
        financeRemarks: "",
        legalRemarks: "",
        servicesRemarks: "",

        // New Services (All Products)
        newServices: [],
      },
    },
  });

  const {
    handleSubmit,
    setValue,
    watch,
    trigger,
    reset,
    setError,
    clearErrors,
    formState: { errors },
  } = form;

  // Use form.control directly to avoid TypeScript type inference issues
  // Type assertion to fix generic type parameter mismatch
  const control = form.control as any;
  // Watch leadSource to debug
  const watchedLeadSource = useWatch({ control, name: "leadSource" });

  const salesType = useWatch({ control, name: "salesType" });
  const selectedProductType = useWatch({
    control,
    name: "selectedProductType",
  });
  const showInitialPayment = useWatch({ control, name: "showInitialPayment" });
  const showBeforeVisaPayment = useWatch({ control, name: "showBeforeVisaPayment" });
  const showAfterVisaPayment = useWatch({ control, name: "showAfterVisaPayment" });

  // Load sale types on mount
  useEffect(() => {
    const fetchSaleTypes = async () => {
      try {
        const saleTypesRes = await api.get("/api/sale-types");
        const types = saleTypesRes.data.data || [];
        setAllSaleTypes(types);

        const coreOptions = types
          .filter((t: any) => t.isCoreProduct)
          .map((t: any) => ({ label: t.saleType, value: t.saleType }));

        const otherOptions = types
          .filter((t: any) => !t.isCoreProduct)
          .map((t: any) => ({ label: t.saleType, value: t.saleType }));

        setDynamicOptions([
          { label: "Core Product", options: coreOptions },
          { label: "Other Products", options: otherOptions },
        ]);
      } catch (err) {
        console.error("Failed to fetch sale types", err);
        toast({
          title: "Error",
          description: "Failed to load sale types. Please refresh the page.",
          variant: "destructive",
        });
      }
    };

    fetchSaleTypes();
  }, []);

  // Load lead types on mount
  useEffect(() => {
    const fetchLeadTypes = async () => {
      try {
        const leadTypesRes = await api.get("/api/lead-types");
        const types = leadTypesRes.data.data || [];
        setLeadTypes(types);
      } catch (err) {
        console.error("Failed to fetch lead types", err);
        // Don't show error toast for lead types as it's optional
      }
    };

    fetchLeadTypes();
  }, []);

  // Debug: Log watched leadSource value
  // useEffect(() => {
  //   if (watchedLeadSource) {
  //     console.log('[ClientForm] ✅ Watched leadSource value:', watchedLeadSource);
  //   } else if (isEditMode) {
  //     console.log('[ClientForm] ⚠️ Watched leadSource is EMPTY in edit mode');
  //   }
  // }, [watchedLeadSource, isEditMode]);

  // Update leadSource when leadTypes are loaded and we have clientData with leadTypeId
  useEffect(() => {
    // console.log('[ClientForm] 🔍 useEffect triggered. clientDataToLoad:', !!clientDataToLoad, 'leadTypes count:', leadTypes.length);

    if (!clientDataToLoad || leadTypes.length === 0) {
      // console.log('[ClientForm] useEffect: Skipping leadSource mapping. clientDataToLoad:', !!clientDataToLoad, 'leadTypes count:', leadTypes.length);
      return;
    }

    // Check if we have leadTypeId in the original client data
    const leadTypeId = (clientDataToLoad as any).originalLeadTypeId;

    // console.log('[ClientForm] useEffect: Checking leadSource mapping. leadTypeId:', leadTypeId, 'leadTypes count:', leadTypes.length);

    if (leadTypeId) {
      const leadType = leadTypes.find((lt: any) => {
        const ltId = lt.id || lt.leadTypeId;
        return ltId === leadTypeId || String(ltId) === String(leadTypeId);
      });

      if (leadType?.leadType) {
        const currentLeadSource = form.getValues("leadSource");
        if (currentLeadSource !== leadType.leadType) {
          // console.log('[ClientForm] ✅ Setting leadSource from leadTypeId:', leadTypeId, '->', leadType.leadType);
          form.setValue("leadSource", leadType.leadType, {
            shouldValidate: false,
            shouldDirty: false,
            shouldTouch: true
          });
          // Verify it was set
          setTimeout(() => {
            const verifyValue = form.getValues("leadSource");
            // console.log('[ClientForm] ✅ Verified leadSource after setting:', verifyValue);
          }, 100);
        } else {
          // console.log('[ClientForm] LeadSource already set correctly:', currentLeadSource);
        }
      } else {
        // console.warn('[ClientForm] ⚠️ Lead type not found for leadTypeId:', leadTypeId, 'Available leadTypes:', leadTypes.map((lt: any) => ({ id: lt.id || lt.leadTypeId, leadType: lt.leadType })));
      }
    } else {
      // console.log('[ClientForm] No leadTypeId found in clientDataToLoad. clientDataToLoad keys:', Object.keys(clientDataToLoad || {}));
      // Also check if leadSource is already set in clientDataToLoad
      if (clientDataToLoad.leadSource) {
        const currentLeadSource = form.getValues("leadSource");
        if (currentLeadSource !== clientDataToLoad.leadSource) {
          // console.log('[ClientForm] ✅ Setting leadSource from clientDataToLoad.leadSource:', clientDataToLoad.leadSource);
          form.setValue("leadSource", clientDataToLoad.leadSource, {
            shouldValidate: false,
            shouldDirty: false,
            shouldTouch: true
          });
        }
      }
    }
  }, [leadTypes, clientDataToLoad, form]);

  // Update salesType when allSaleTypes are loaded and we have clientData with saleTypeId
  useEffect(() => {
    if (!clientDataToLoad || allSaleTypes.length === 0) {
      return;
    }

    // Check if we have saleTypeId in the original client data
    const saleTypeId = (clientDataToLoad as any).originalSaleTypeId;
    const currentSalesType = form.getValues("salesType");

    // Only map if salesType is not already set and we have a saleTypeId
    if (saleTypeId && !currentSalesType) {
      const saleTypeObj = allSaleTypes.find((st: any) => st.id === saleTypeId);
      if (saleTypeObj?.saleType) {
        // console.log('[ClientForm] ✅ Setting salesType from saleTypeId:', saleTypeId, '->', saleTypeObj.saleType);
        form.setValue("salesType", saleTypeObj.saleType, {
          shouldValidate: false,
          shouldDirty: false,
          shouldTouch: true
        });
      }
    }
  }, [allSaleTypes, clientDataToLoad, form]);

  // Load client data when in edit mode
  useEffect(() => {
    if (!clientIdFromUrl) {
      setIsEditMode(false);
      setIsClientCreated(false);
      setIsLoadingClientData(false);
      return;
    }

    const fetchClientData = async () => {
      setIsEditMode(true);
      setIsClientCreated(true); // In edit mode, client already exists
      setIsLoadingClientData(true);

      try {
        const response = await api.get(`/api/clients/${clientIdFromUrl}/complete`);

        // Handle the API response structure: response.data.data contains { client, saleType, payments, productPayments }
        const responseData = response.data.data;

        // Extract client data - it's nested under 'client' property
        let clientData: any = null;

        // If client data is nested, merge with other properties from response
        if (responseData.client) {
          clientData = {
            ...responseData.client,
            saleType: responseData.saleType || responseData.client.saleType,
            payments: responseData.payments || responseData.client.payments || [],
            productPayments: responseData.productPayments || responseData.client.productPayments || [],
          };
        } else if (responseData.fullName) {
          // If client data is directly in responseData
          clientData = responseData;
        } else {
          // Fallback: use responseData as-is
          clientData = responseData;
        }

        // Fallback: If data is nested (like in list response), extract the client
        if (clientData && typeof clientData === 'object' && !clientData.fullName) {
          // Check if it's the nested structure (year -> month -> clients array)
          const years = Object.keys(clientData);
          if (years.length > 0) {
            const firstYear = clientData[years[0]];
            const months = Object.keys(firstYear);
            if (months.length > 0) {
              const firstMonth = firstYear[months[0]];
              if (firstMonth.clients && firstMonth.clients.length > 0) {
                clientData = firstMonth.clients[0];
              }
            }
          }
        }

        // Log client data for debugging
        // console.log('🔍 [ClientForm] ========== CLIENT DATA RECEIVED ==========');
        // console.log('[ClientForm] Full clientData object:', clientData);
        // console.log('[ClientForm] leadTypeId (direct):', clientData.leadTypeId);
        // console.log('[ClientForm] leadType (object):', clientData.leadType);
        // console.log('[ClientForm] leadSource (direct):', clientData.leadSource);
        // console.log('[ClientForm] All clientData keys:', Object.keys(clientData || {}));
        // console.log('[ClientForm] leadTypes loaded:', leadTypes.length, 'types');
        // console.log('[ClientForm] leadTypes:', leadTypes);

        if (clientData) {
          setInternalClientId(Number(clientIdFromUrl));

          // Pre-fill form values and load existing payment IDs for updates
          const initialPayment = clientData.payments?.find((p: any) => p.stage === "Initial" || p.stage === "INITIAL") || {};
          const beforeVisaPayment = clientData.payments?.find((p: any) => p.stage === "Before_Visa" || p.stage === "BEFORE_VISA") || {};
          const afterVisaPayment = clientData.payments?.find((p: any) => p.stage === "After_Visa_Payment" || p.stage === "AFTER_VISA_PAYMENT" || p.stage === "After_Visa" || p.stage === "AFTER_VISA") || {};

          // Store existing payment IDs for update operations
          const existingPaymentIds: { [key: string]: number } = {};
          if (initialPayment.paymentId) {
            existingPaymentIds["initialPayment"] = initialPayment.paymentId;
          }
          if (beforeVisaPayment.paymentId) {
            existingPaymentIds["beforeVisaPayment"] = beforeVisaPayment.paymentId;
          }
          if (afterVisaPayment.paymentId) {
            existingPaymentIds["afterVisaPayment"] = afterVisaPayment.paymentId;
          }
          setPaymentIds(existingPaymentIds);

          // Store payment permissions and raw payments for editability computation
          setPaymentPermissions(responseData.paymentPermissions || { canAddPayment: true, canEditTotalPayment: true });
          setRawPaymentsFromApi(clientData.payments || []);

          // Store existing product payment IDs for update operations
          const existingProductPaymentIds: Record<string, number> = {};
          if (clientData.productPayments && Array.isArray(clientData.productPayments)) {
            clientData.productPayments.forEach((pp: any, index: number) => {
              if (pp.productPaymentId) {
                existingProductPaymentIds[pp.productName] = pp.productPaymentId;
              } else {
                //  console.warn(`⚠ Product payment ${pp.productName} has no productPaymentId:`, pp);
              }
            });
          } else {
            // console.warn("⚠ No productPayments found in clientData:", clientData);
          }
          setProductPaymentIds(existingProductPaymentIds);
          productPaymentIdsRef.current = existingProductPaymentIds; // Update ref immediately

          // Get total payment from the first payment or client data
          const totalPaymentValue = Number(
            clientData.payments?.[0]?.totalPayment ||
            clientData.totalPayment ||
            0
          );

          // Get saleTypeId from payments for later mapping if allSaleTypes loads after
          const saleTypeIdFromPayment = clientData.payments?.[0]?.saleTypeId || null;

          // Prepare form data with all required fields
          // Ensure enrollmentDate is in the correct format (date string YYYY-MM-DD)
          let enrollmentDateValue = clientData.enrollmentDate || "";
          if (enrollmentDateValue) {
            // If it's an ISO string, extract just the date part (YYYY-MM-DD)
            if (enrollmentDateValue.includes("T")) {
              enrollmentDateValue = enrollmentDateValue.split("T")[0];
            }
            // If it's already in YYYY-MM-DD format, use it as is
            // This ensures we always send date-only strings to avoid timezone issues
          }

          const nameValue = clientData.fullName || clientData.name || "";

          // Get salesType from multiple possible sources
          let salesTypeValue = clientData.saleType?.saleType || clientData.salesType || "";

          // If salesType is not found, try to get it from payments array
          if (!salesTypeValue && clientData.payments && clientData.payments.length > 0) {
            // First, try to get saleType directly from payment.saleType.saleType
            const paymentWithSaleType = clientData.payments.find((p: any) => p.saleType?.saleType);
            if (paymentWithSaleType?.saleType?.saleType) {
              salesTypeValue = paymentWithSaleType.saleType.saleType;
            } else {
              // Fallback: try to get it from saleTypeId and map using allSaleTypes
              const firstPayment = clientData.payments[0];
              if (firstPayment.saleTypeId && allSaleTypes.length > 0) {
                const saleTypeObj = allSaleTypes.find((st: any) => st.id === firstPayment.saleTypeId);
                if (saleTypeObj?.saleType) {
                  salesTypeValue = saleTypeObj.saleType;
                }
              } else if (firstPayment.saleType?.id && allSaleTypes.length > 0) {
                // Also check if saleType object has id property
                const saleTypeObj = allSaleTypes.find((st: any) => st.id === firstPayment.saleType.id);
                if (saleTypeObj?.saleType) {
                  salesTypeValue = saleTypeObj.saleType;
                }
              }
            }
          }

          // Determine the product type based on sales type
          const productType = getProductType(salesTypeValue, "");

          // Helper to deep merge product fields with defaults
          const mergeProductFields = (defaultFields: any, mappedFields: any) => {
            const merged = { ...defaultFields };
            Object.keys(mappedFields).forEach((key) => {
              if (typeof mappedFields[key] === 'object' && mappedFields[key] !== null && !Array.isArray(mappedFields[key])) {
                merged[key] = {
                  ...(defaultFields[key] || {}),
                  ...mappedFields[key],
                };
              } else {
                merged[key] = mappedFields[key];
              }
            });
            return merged;
          };

          // Get default values from form schema
          const defaultValues = form.formState.defaultValues || {};

          // Map product fields to unified structure - combine all product types
          let mappedProductFields = {};

          // Map all product types and merge into unified structure
          const mappedSpouseFields = mapProductDataToForm(clientData, "spouse");
          const mappedVisitorFields = mapProductDataToForm(clientData, "visitor");
          const mappedStudentFields = mapProductDataToForm(clientData, "student");

          // Merge all product fields into unified structure
          mappedProductFields = {
            ...mappedSpouseFields,
            ...mappedVisitorFields,
            ...mappedStudentFields,
            // Merge baseFee (visitor) into financeAndEmployment (all products use this field)
            financeAndEmployment: mappedSpouseFields.financeAndEmployment ||
              mappedVisitorFields.baseFee ||
              mappedVisitorFields.financeAndEmployment ||
              mappedStudentFields.financeAndEmployment,
            // Ensure common fields are properly merged (take first non-empty value)
            indianSideEmployment: mappedSpouseFields.indianSideEmployment ||
              mappedVisitorFields.indianSideEmployment ||
              mappedStudentFields.indianSideEmployment,
            simCard: mappedSpouseFields.simCard ||
              mappedVisitorFields.simCard ||
              mappedStudentFields.simCard,
            insurance: mappedSpouseFields.insurance ||
              mappedVisitorFields.insurance ||
              mappedStudentFields.insurance,
            beaconAccount: mappedSpouseFields.myBeacon ||
              mappedSpouseFields.beaconAccount ||
              mappedVisitorFields.beaconAccount ||
              mappedStudentFields.beaconAccount,
            airTicket: mappedSpouseFields.airTicket ||
              mappedVisitorFields.airTicket ||
              mappedStudentFields.airTicket,
            newServices: [
              ...(mappedSpouseFields.newServices || []),
              ...(mappedVisitorFields.newServices || []),
              ...(mappedStudentFields.newServices || []),
            ],
          };

          // Map leadTypeId back to leadSource name for form display
          // Store leadTypeId for later mapping (in case leadTypes aren't loaded yet)
          // Try multiple possible paths for leadTypeId
          const leadTypeId = clientData.leadTypeId ||
            clientData.leadType?.id ||
            clientData.leadType?.leadTypeId ||
            (typeof clientData.leadType === 'object' && clientData.leadType?.id) ||
            (clientData.leadType && typeof clientData.leadType === 'object' ? clientData.leadType.id : null) ||
            null;

          // console.log('🔍 [ClientForm] ========== LEAD SOURCE MAPPING ==========');
          // console.log('[ClientForm] Extracted leadTypeId:', leadTypeId);
          // console.log('[ClientForm] clientData.leadTypeId:', clientData.leadTypeId);
          // console.log('[ClientForm] clientData.leadType:', clientData.leadType);
          // console.log('[ClientForm] clientData.leadSource:', clientData.leadSource);
          // console.log('[ClientForm] leadTypes available:', leadTypes.length);
          // console.log('[ClientForm] leadTypes array:', leadTypes.map((lt: any) => ({ id: lt.id, leadTypeId: lt.leadTypeId, leadType: lt.leadType })));

          let leadSourceValue = "";

          // Strategy 1: If we have leadTypeId and leadTypes are loaded, map it
          if (leadTypeId && leadTypes.length > 0) {
            // console.log('[ClientForm] Attempting to map leadTypeId:', leadTypeId, 'with', leadTypes.length, 'available leadTypes');
            const leadType = leadTypes.find((lt: any) => {
              const ltId = lt.id || lt.leadTypeId;
              const matches = ltId === leadTypeId || String(ltId) === String(leadTypeId);
              if (matches) {
                // console.log('[ClientForm] ✅ Found matching leadType:', { id: ltId, leadType: lt.leadType });
              }
              return matches;
            });

            if (leadType?.leadType) {
              leadSourceValue = leadType.leadType;
              // console.log('[ClientForm] ✅ Mapped leadTypeId to leadSource:', leadTypeId, '->', leadSourceValue);
            } else {
              // console.warn('[ClientForm] ⚠️ leadTypeId found but no matching leadType in array. leadTypeId:', leadTypeId);
              // console.warn('[ClientForm] Available leadType IDs:', leadTypes.map((lt: any) => lt.id || lt.leadTypeId));
            }
          }

          // Strategy 2: Use leadSource directly from API if available
          if (!leadSourceValue && clientData.leadSource) {
            leadSourceValue = clientData.leadSource;
            // console.log('[ClientForm] ✅ Using leadSource directly from clientData:', leadSourceValue);
          }

          // Strategy 3: Extract from leadType object if it's a string or has leadType property
          if (!leadSourceValue && clientData.leadType) {
            if (typeof clientData.leadType === 'string') {
              leadSourceValue = clientData.leadType;
              // console.log('[ClientForm] ✅ Using leadType as string:', leadSourceValue);
            } else if (typeof clientData.leadType === 'object' && clientData.leadType.leadType) {
              leadSourceValue = clientData.leadType.leadType;
              // console.log('[ClientForm] ✅ Using leadType.leadType from object:', leadSourceValue);
            }
          }

          // Final check
          if (!leadSourceValue && leadTypeId) {
            console.warn('[ClientForm] ⚠️ LeadSource is EMPTY but leadTypeId exists:', leadTypeId);
            console.warn('[ClientForm] Will attempt to map later when leadTypes load or in useEffect');
          } else if (!leadSourceValue && !leadTypeId) {
            console.warn('[ClientForm] ⚠️ No leadSource and no leadTypeId found in clientData');
          } else {
            console.log('[ClientForm] ✅ Final leadSourceValue:', leadSourceValue);
          }

          const saleTypeRowForLoad = allSaleTypes.find((st: any) => st.saleType === salesTypeValue);
          let saleTypeCategoryNameForForm = String(saleTypeRowForLoad?.categoryName || "").toLowerCase();
          if (salesTypeValue.toLowerCase() === "other product") {
            const inferred = getProductType(salesTypeValue, "");
            if (inferred) saleTypeCategoryNameForForm = inferred;
          }

          const formData = {
            name: nameValue,
            enrollmentDate: enrollmentDateValue,
            passportDetails: clientData.passportDetails || "", // ✅ Add passportDetails
            salesType: salesTypeValue,
            leadSource: leadSourceValue,
            counsellorId: clientData.counsellorId || null, // ✅ Add counsellorId
            // Store original IDs for later mapping if data loads after form data
            originalLeadTypeId: leadTypeId,
            originalSaleTypeId: saleTypeIdFromPayment, // ✅ Store saleTypeId for later mapping
            selectedProductType: "",
            saleTypeCategoryName: saleTypeCategoryNameForForm,
            totalPayment: totalPaymentValue,
            initialPayment: {
              amount: Number(initialPayment.amount || 0),
              date: initialPayment.paymentDate || "",
              invoiceNo: initialPayment.invoiceNo || "",
              remarks: initialPayment.remarks || "",
            },
            beforeVisaPayment: {
              amount: Number(beforeVisaPayment.amount || 0),
              date: beforeVisaPayment.paymentDate || "",
              invoiceNo: beforeVisaPayment.invoiceNo || "",
              remarks: beforeVisaPayment.remarks || "",
            },
            afterVisaPayment: {
              amount: Number(afterVisaPayment.amount || 0),
              date: afterVisaPayment.paymentDate || "",
              invoiceNo: afterVisaPayment.invoiceNo || "",
              remarks: afterVisaPayment.remarks || "",
            },
            amountPending: 0,
            // Set payment section visibility based on whether payment data exists
            showInitialPayment: !!(initialPayment.amount || initialPayment.paymentDate || initialPayment.invoiceNo || initialPayment.remarks),
            showBeforeVisaPayment: !!(beforeVisaPayment.amount || beforeVisaPayment.paymentDate || beforeVisaPayment.invoiceNo || beforeVisaPayment.remarks),
            showAfterVisaPayment: !!(afterVisaPayment.amount || afterVisaPayment.paymentDate || afterVisaPayment.invoiceNo || afterVisaPayment.remarks),
            // Map product fields to unified structure
            productFields: mergeProductFields(defaultValues.productFields || {}, mappedProductFields),
          };

          // Store the form data to load - this will trigger the useEffect to set values
          setClientDataToLoad(formData);

          // Reset the entire form with all data
          reset(formData);
          // Sync approval state from All Finance product (mapProductDataToForm already set it;
          // only clear when this client has no All Finance product so we don't keep previous client's state)
          const allFinance = clientData.productPayments?.find((pp: any) => pp.productName === "ALL_FINANCE_EMPLOYEMENT");
          const entity = allFinance?.entity || {};
          if (allFinance) {
            setIsPartialPayment(entity.partialPayment === true);
            setApprovalStatus((entity.approvalStatus as "pending" | "approved" | "rejected") || null);
            setApproverName(entity.approver?.name ?? null);
          } else {
            setIsPartialPayment(false);
            setApprovalStatus(null);
            setApproverName(null);
          }

          // Show sections if data exists in edit mode
          if (clientData.payments && clientData.payments.length > 0) {
            setShowServiceSection(true);
          }
          if (clientData.productPayments && clientData.productPayments.length > 0) {
            setShowProductSection(true);

            // Map productPayments to addedProducts
            const productNameToIdMap: Record<string, string> = {
              "ALL_FINANCE_EMPLOYEMENT": "financeAndEmployment",
              "INDIAN_SIDE_EMPLOYEMENT": "indianSideEmployment",
              "IELTS_ENROLLMENT": "ieltsEnrollment",
              "LOAN_DETAILS": "loan",
              "REFUSAL_CHARGES": "refusalCharges",
              "KIDS_STUDY_PERMIT": "kidsStudyPermit",
              "SIM_CARD_ACTIVATION": "simCard",
              "INSURANCE": "insurance",
              "BEACON_ACCOUNT": "beaconAccount",
              "AIR_TICKET": "airTicket",
              "NOC_LEVEL_JOB_ARRANGEMENT": "nocLevelJob",
              "LAWYER_REFUSAL_CHARGE": "lawyerRefuge",
              "ONSHORE_PART_TIME_EMPLOYEMENT": "onshorePartTime",
              "TRV_WORK_PERMIT_EXT_STUDY_PERMIT_EXTENSION": "trvExtension",
              "MARRIAGE_PHOTO_FOR_COURT_MARRIAGE": "marriagePhoto",
              "MARRIAGE_PHOTO_CERTIFICATE": "marriageCertificate",
              "RECENTE_MARRIAGE_RELATIONSHIP_AFFIDAVIT": "relationshipAffidavit",
              "JUDICAL_REVIEW_CHARGE": "judicialReview",
              "SPONSOR_CHARGES": "sponsorCharges",
              "FOREX_CARD": "forexCard",
              "FOREX_FEES": "forexFees",
              "TUTION_FEES": "tuitionFee",
              "CREDIT_CARD": "creditCard",
              "CANADA_FUND": "canadaFund",
              "EMPLOYMENT_VERIFICATION_CHARGES": "employmentVerificationCharges",
              "ADDITIONAL_AMOUNT_STATEMENT_CHARGES": "additionalAmountStatementCharges",
              "OTHER_NEW_SELL": "otherProduct",
            };

            const existingProducts: Array<{
              id: string;
              name: string;
              productName: string;
              formType: string;
              instanceKey: string;
            }> = [];

            // Products that allow multiple instances
            const allowMultipleInstances = ["otherProduct", "trvExtension"];

            clientData.productPayments.forEach((pp: any) => {
              // Handle OTHER_NEW_SELL - can have multiple instances
              if (pp.productName === "OTHER_NEW_SELL") {
                const product = availableProducts.find(p => p.id === "otherProduct");
                if (product) {
                  const instanceKey = `otherProduct-${pp.productPaymentId || Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
                  existingProducts.push({
                    id: product.id,
                    name: product.name,
                    productName: product.productName,
                    formType: product.formType,
                    instanceKey: instanceKey
                  });

                  // Load data into form
                  if (pp.entity) {
                    const entity = pp.entity;
                    setValue(`productFields.otherProduct.${instanceKey}` as any, {
                      serviceName: entity.serviceName || "",
                      serviceInfo: entity.serviceInformation || "",
                      amount: Number(entity.amount || 0),
                      date: entity.sellDate || "",
                      invoiceNo: entity.invoiceNo || "",
                      remark: entity.remarks || entity.remark || "",
                      // ✅ Store productPaymentId for updates
                      productPaymentId: pp.productPaymentId || pp.id || null,
                    });
                  }
                }
                return;
              }

              // Handle TRV Extension - can have multiple instances
              if (pp.productName === "TRV_WORK_PERMIT_EXT_STUDY_PERMIT_EXTENSION") {
                const product = availableProducts.find(p => p.id === "trvExtension");
                if (product) {
                  const instanceKey = `trvExtension-${pp.productPaymentId || Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
                  existingProducts.push({
                    id: product.id,
                    name: product.name,
                    productName: product.productName,
                    formType: product.formType,
                    instanceKey: instanceKey
                  });

                  // Load data into form
                  if (pp.entity) {
                    const entity = pp.entity;
                    setValue(`productFields.trvExtension.${instanceKey}` as any, {
                      type: entity.type || "",
                      amount: Number(entity.amount || 0),
                      date: entity.date || entity.extensionDate || "", // Support both field names
                      invoiceNo: entity.invoiceNo || "",
                      remarks: entity.remarks || "",
                      // ✅ Store productPaymentId for updates
                      productPaymentId: pp.productPaymentId || pp.id || null,
                    });
                  }
                }
                return;
              }

              // Handle other products (single instance only)
              const productId = productNameToIdMap[pp.productName];
              if (productId && !allowMultipleInstances.includes(productId)) {
                // Check if this product is already in the list (prevent duplicates for single-instance products)
                if (!existingProducts.some(p => p.id === productId)) {
                  const product = availableProducts.find(p => p.id === productId);
                  if (product) {
                    existingProducts.push({
                      id: product.id,
                      name: product.name,
                      productName: product.productName,
                      formType: product.formType,
                      instanceKey: product.id // Use id as instanceKey for single-instance products
                    });

                    // Load entity data into form fields for single-instance products
                    if (pp.entity) {
                      const entity = pp.entity;

                      // Forex Card
                      if (pp.productName === "FOREX_CARD") {
                        // Map backend fields to form fields
                        // Backend: forexCardStatus (string), cardDate (string), remarks (string)
                        // Form: isActivated ("Yes"/"No"/""), date (string), remarks (string)
                        let isActivatedValue = "";
                        if (entity.forexCardStatus !== undefined && entity.forexCardStatus !== null) {
                          // Convert boolean or string to "Yes"/"No"
                          if (entity.forexCardStatus === true || entity.forexCardStatus === "true" || entity.forexCardStatus === "Yes") {
                            isActivatedValue = "Yes";
                          } else if (entity.forexCardStatus === false || entity.forexCardStatus === "false" || entity.forexCardStatus === "No") {
                            isActivatedValue = "No";
                          }
                        }

                        setValue("productFields.forexCard.isActivated" as any, isActivatedValue, { shouldValidate: false, shouldDirty: false });
                        setValue("productFields.forexCard.date" as any, entity.cardDate || "", { shouldValidate: false, shouldDirty: false });
                        setValue("productFields.forexCard.remarks" as any, entity.remarks || "", { shouldValidate: false, shouldDirty: false });
                        // console.log('[ClientForm] ✅ Loaded Forex Card data:', { isActivated: isActivatedValue, date: entity.cardDate, remarks: entity.remarks });
                      }
                      // Add other single-instance products here as needed
                    } else {
                      // Handle master_only products (no entity, data is in productPayment itself)
                      // These products use financialEntrySchema: amount, date, invoiceNo, remarks
                      if (productId === "canadaFund" || productId === "employmentVerificationCharges" || productId === "additionalAmountStatementCharges") {
                        setValue(`productFields.${productId}.amount` as any, Number(pp.amount || 0), { shouldValidate: false, shouldDirty: false });
                        setValue(`productFields.${productId}.date` as any, pp.paymentDate || "", { shouldValidate: false, shouldDirty: false });
                        setValue(`productFields.${productId}.invoiceNo` as any, pp.invoiceNo || "", { shouldValidate: false, shouldDirty: false });
                        setValue(`productFields.${productId}.remarks` as any, pp.remarks || "", { shouldValidate: false, shouldDirty: false });
                        // console.log(`[ClientForm] ✅ Loaded ${productId} data:`, { amount: pp.amount, date: pp.paymentDate, invoiceNo: pp.invoiceNo, remarks: pp.remarks });
                      }
                    }
                  }
                }
              }
            });

            setAddedProducts(existingProducts);
          }

          // Immediately try to set leadSource if we have it, even before useEffect runs
          if (formData.leadSource) {
            // console.log('[ClientForm] ✅ Immediately setting leadSource after reset:', formData.leadSource);
            setTimeout(() => {
              setValue("leadSource", formData.leadSource, { shouldValidate: false, shouldDirty: false, shouldTouch: true });
              const verify = form.getValues("leadSource");
              // console.log('[ClientForm] ✅ Verified immediate leadSource set:', verify);
            }, 50);
          }

          // Force set values immediately and after a delay to ensure they stick
          // Store leadTypeId in a variable accessible to Promise.resolve
          const currentLeadTypeId = leadTypeId;
          Promise.resolve().then(() => {
            if (formData.name) {
              setValue("name", formData.name, { shouldValidate: false, shouldDirty: false });
            }
            if (formData.enrollmentDate) {
              setValue("enrollmentDate", formData.enrollmentDate, { shouldValidate: false, shouldDirty: false });
            }
            if (formData.passportDetails) {
              setValue("passportDetails", formData.passportDetails, { shouldValidate: false, shouldDirty: false });
            }
            if (formData.counsellorId) {
              setValue("counsellorId", formData.counsellorId, { shouldValidate: false, shouldDirty: false });
            }
            if (formData.salesType) {
              setValue("salesType", formData.salesType, { shouldValidate: false, shouldDirty: false });
            } else if ((formData as any).originalSaleTypeId && allSaleTypes.length > 0) {
              // If salesType is empty but we have saleTypeId and allSaleTypes are loaded, map it now
              const saleTypeId = (formData as any).originalSaleTypeId;
              const saleTypeObj = allSaleTypes.find((st: any) => st.id === saleTypeId);
              if (saleTypeObj?.saleType) {
                setValue("salesType", saleTypeObj.saleType, { shouldValidate: false, shouldDirty: false });
                // console.log('[ClientForm] ✅ Set salesType from saleTypeId in Promise.resolve:', saleTypeObj.saleType);
              }
            }
            if (formData.leadSource) {
              setValue("leadSource", formData.leadSource, { shouldValidate: false, shouldDirty: false });
              // console.log('[ClientForm] ✅ Set leadSource immediately in Promise.resolve:', formData.leadSource);
            } else if (currentLeadTypeId && leadTypes.length > 0) {
              // If leadSource is empty but we have leadTypeId and leadTypes are loaded, map it now
              const leadType = leadTypes.find((lt: any) => {
                const ltId = lt.id || lt.leadTypeId;
                return ltId === currentLeadTypeId || String(ltId) === String(currentLeadTypeId);
              });
              if (leadType?.leadType) {
                setValue("leadSource", leadType.leadType, { shouldValidate: false, shouldDirty: false });
                // console.log('[ClientForm] ✅ Set leadSource from leadTypeId in Promise.resolve:', leadType.leadType);
              }
            }
          });
        } else {
          toast({
            title: "Error",
            description: "Client data not found.",
            variant: "destructive",
          });
        }
      } catch (err: any) {
        console.error("Failed to fetch client data", err);
        toast({
          title: "Error",
          description: err.response?.data?.message || "Failed to load client data. Please try again.",
          variant: "destructive",
        });
      } finally {
        setIsLoadingClientData(false);
      }
    };

    fetchClientData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientIdFromUrl]);

  // Ensure client data is loaded into form after form is ready
  useEffect(() => {
    if (clientDataToLoad && isEditMode) {
      // Use a small delay to ensure form is fully initialized
      const timer = setTimeout(() => {
        // Set values individually to ensure they stick - use shouldTouch to trigger re-render
        if (clientDataToLoad.name) {
          setValue("name", clientDataToLoad.name, {
            shouldValidate: false,
            shouldDirty: false,
            shouldTouch: true
          });
        }

        if (clientDataToLoad.enrollmentDate) {
          // Ensure date is in YYYY-MM-DD format (extract date part if ISO string)
          let dateValue = clientDataToLoad.enrollmentDate;
          if (dateValue && dateValue.includes("T")) {
            // Extract just the date part (YYYY-MM-DD) from ISO string
            dateValue = dateValue.split("T")[0];
          }
          setValue("enrollmentDate", dateValue, {
            shouldValidate: false,
            shouldDirty: false,
            shouldTouch: true
          });
        }

        if ((clientDataToLoad as any).passportDetails) {
          setValue("passportDetails", (clientDataToLoad as any).passportDetails, {
            shouldValidate: false,
            shouldDirty: false,
            shouldTouch: true
          });
        }

        if (clientDataToLoad.salesType) {
          setValue("salesType", clientDataToLoad.salesType, {
            shouldValidate: false,
            shouldDirty: false,
            shouldTouch: true
          });
        }

        if (clientDataToLoad.leadSource) {
          setValue("leadSource", clientDataToLoad.leadSource, {
            shouldValidate: false,
            shouldDirty: false,
            shouldTouch: true
          });
          // console.log('[ClientList] Set leadSource from clientDataToLoad:', clientDataToLoad.leadSource);
        }

        if (clientDataToLoad.totalPayment) {
          setValue("totalPayment", clientDataToLoad.totalPayment, {
            shouldValidate: false,
            shouldDirty: false
          });
        }

        // Verify after setting
        setTimeout(() => {
          const values = form.getValues();
        }, 50);
      }, 100);

      return () => clearTimeout(timer);
    }
  }, [clientDataToLoad, isEditMode, setValue]);

  // Sync category from API row; student → total 0 + initial cleared; others → total from catalog amount when set
  useEffect(() => {
    if (!salesType || isEditMode) return;

    const selectedTypeData = allSaleTypes.find((t) => t.saleType === salesType);
    if (!selectedTypeData) {
      setValue("saleTypeCategoryName", "", { shouldValidate: false });
      return;
    }

    const lowerSt = salesType.toLowerCase();
    let category = String(selectedTypeData.categoryName || "").toLowerCase();
    if (lowerSt === "other product" && selectedProductType) {
      category = String(selectedProductType).toLowerCase();
    }
    setValue("saleTypeCategoryName", category, { shouldValidate: false });

    if (category === "student") {
      setValue("totalPayment", 0, { shouldValidate: false });
      setValue("showInitialPayment", false, { shouldValidate: false });
      setValue(
        "initialPayment",
        { amount: 0, date: "", invoiceNo: "", remarks: "" },
        { shouldValidate: false },
      );
    } else if (selectedTypeData.amount != null && selectedTypeData.amount !== "") {
      setValue("totalPayment", Number(selectedTypeData.amount), { shouldValidate: false });
    }
  }, [salesType, selectedProductType, allSaleTypes, setValue, isEditMode]);

  // Auto-calc pending amount
  const totalPaymentRaw = useWatch({ control, name: "totalPayment" });
  const totalPayment =
    totalPaymentRaw === undefined || totalPaymentRaw === null || Number.isNaN(Number(totalPaymentRaw))
      ? 0
      : Number(totalPaymentRaw);
  const initialPayment = useWatch({ control, name: "initialPayment" });
  const beforeVisaPayment = useWatch({ control, name: "beforeVisaPayment" });
  const afterVisaPayment = useWatch({ control, name: "afterVisaPayment" });
  const productFields = useWatch({ control, name: "productFields" });

  const initialAmountReceived = initialPayment?.amount || 0;
  const beforeVisaAmount = beforeVisaPayment?.amount || 0;
  const afterVisaAmount = afterVisaPayment?.amount || 0;

  // Formula: Total Payment - (Initial Amount + Before Visa Payment + After Visa Payment)
  // Ensure pending amount never goes negative
  const calculatedPending = Math.max(
    0,
    totalPayment - (initialAmountReceived + beforeVisaAmount + afterVisaAmount)
  );

  // Clear payment amount errors when amounts are corrected (sum no longer exceeds total)
  useEffect(() => {
    const totalPayments = initialAmountReceived + beforeVisaAmount + afterVisaAmount;

    // If sum is valid (doesn't exceed total payment), clear any existing errors
    if (totalPayment >= 0 && totalPayments <= totalPayment) {
      clearErrors("initialPayment.amount" as any);
      clearErrors("beforeVisaPayment.amount" as any);
      clearErrors("afterVisaPayment.amount" as any);
      setFieldErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors["initialPayment.amount"];
        delete newErrors["beforeVisaPayment.amount"];
        delete newErrors["afterVisaPayment.amount"];
        return newErrors;
      });
    }
  }, [totalPayment, initialAmountReceived, beforeVisaAmount, afterVisaAmount, clearErrors]);


  const saleTypeCategoryName = useWatch({ control, name: "saleTypeCategoryName" });
  const isStudentSaleCategory = saleTypeCategoryName === "student";

  // Check if service payment data exists: student may save with total 0; other categories need total > 0
  const hasServiceData = useMemo(() => {
    const hasNumericTotal =
      totalPaymentRaw !== undefined &&
      totalPaymentRaw !== null &&
      !Number.isNaN(Number(totalPaymentRaw)) &&
      Number(totalPaymentRaw) >= 0;
    const totalOkForCategory =
      isStudentSaleCategory ? hasNumericTotal : hasNumericTotal && Number(totalPaymentRaw) > 0;
    const hasSalesTypeAndTotal = Boolean(salesType && totalOkForCategory);
    const hasInitial = initialPayment && (
      (initialPayment.amount && initialPayment.amount > 0) ||
      initialPayment.date ||
      initialPayment.invoiceNo ||
      initialPayment.remarks
    );
    const hasBeforeVisa = beforeVisaPayment && (
      (beforeVisaPayment.amount && beforeVisaPayment.amount > 0) ||
      beforeVisaPayment.date ||
      beforeVisaPayment.invoiceNo ||
      beforeVisaPayment.remarks
    );
    const hasAfterVisa = afterVisaPayment && (
      (afterVisaPayment.amount && afterVisaPayment.amount > 0) ||
      afterVisaPayment.date ||
      afterVisaPayment.invoiceNo ||
      afterVisaPayment.remarks
    );
    return hasSalesTypeAndTotal || hasInitial || hasBeforeVisa || hasAfterVisa;
  }, [
    salesType,
    totalPaymentRaw,
    totalPayment,
    isStudentSaleCategory,
    initialPayment,
    beforeVisaPayment,
    afterVisaPayment,
  ]);

  // Check if product data exists
  const hasProductData = useMemo(() => {
    if (!productFields) return false;

    // Helper function to check if an object has any meaningful data
    const hasData = (obj: any): boolean => {
      if (!obj || typeof obj !== 'object') return false;

      for (const key in obj) {
        const value = obj[key];
        if (value === null || value === undefined || value === '') continue;

        if (typeof value === 'number' && value > 0) return true;
        if (typeof value === 'string' && value.trim() !== '') return true;
        if (typeof value === 'boolean') return true;
        if (Array.isArray(value) && value.length > 0) {
          // Check if array has any items with data
          return value.some(item => hasData(item));
        }
        if (typeof value === 'object' && hasData(value)) return true;
      }
      return false;
    };

    return hasData(productFields);
  }, [productFields]);

  const [paymentIds, setPaymentIds] = useState<{ [key: string]: number }>({});
  const [paymentPermissions, setPaymentPermissions] = useState({ canAddPayment: true, canEditTotalPayment: true });
  const [rawPaymentsFromApi, setRawPaymentsFromApi] = useState<any[]>([]);
  const paymentEditability = { initialPayment: true, beforeVisaPayment: true, afterVisaPayment: true };
  const [productPaymentIds, setProductPaymentIds] = useState<
    Record<string, number>
  >({});
  const productPaymentIdsRef = useRef<Record<string, number>>({});
  useEffect(() => {
    productPaymentIdsRef.current = productPaymentIds;
  }, [productPaymentIds]);

  const canDeletePayment = user?.role === "superadmin" || user?.role === "director" || user?.role === "manager";
  const emptyPayment = { amount: 0, date: "", invoiceNo: "", remarks: "" };
  const showToggleBySection: Record<string, "showInitialPayment" | "showBeforeVisaPayment" | "showAfterVisaPayment"> = {
    initialPayment: "showInitialPayment",
    beforeVisaPayment: "showBeforeVisaPayment",
    afterVisaPayment: "showAfterVisaPayment",
  };

  const [deletePaymentSection, setDeletePaymentSection] = useState<"initialPayment" | "beforeVisaPayment" | "afterVisaPayment" | null>(null);
  const [deletePaymentReason, setDeletePaymentReason] = useState("");

  const [showCounsellorCannotDeletePopup, setShowCounsellorCannotDeletePopup] = useState(false);

  // Product payment delete (same UX as core service delete: reason dialog for admin/manager, popup for counsellor)
  const [deleteProductPaymentTarget, setDeleteProductPaymentTarget] = useState<{ productId: string; instanceKey: string } | null>(null);
  const [deleteProductPaymentReason, setDeleteProductPaymentReason] = useState("");

  const handleDeletePaymentClick = useCallback(
    (sectionKey: "initialPayment" | "beforeVisaPayment" | "afterVisaPayment") => {
      if (!canDeletePayment) {
        setShowCounsellorCannotDeletePopup(true);
        return;
      }
      setDeletePaymentSection(sectionKey);
      setDeletePaymentReason("");
    },
    [canDeletePayment]
  );

  const handleDeletePaymentConfirm = useCallback(async () => {
    if (!deletePaymentSection || !deletePaymentReason.trim()) return;
    const sectionKey = deletePaymentSection;
    const paymentId = paymentIds[sectionKey];
    const hasExistingPayment = paymentId != null && paymentId > 0;
    try {
      if (hasExistingPayment) {
        await clientService.deleteClientPayment(paymentId, deletePaymentReason.trim());
      }
      form.setValue(sectionKey as any, emptyPayment);
      form.setValue(showToggleBySection[sectionKey], false);
      setPaymentIds((prev) => {
        const next = { ...prev };
        delete next[sectionKey];
        return next;
      });
      setDeletePaymentSection(null);
      setDeletePaymentReason("");
      toast({ title: "Payment deleted", description: "The payment has been removed." });
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || "Failed to delete payment.";
      toast({ title: "Error", description: msg, variant: "destructive" });
    }
  }, [deletePaymentSection, deletePaymentReason, paymentIds, form, toast]);

  const handleDeletePayment = useCallback(
    (sectionKey: "initialPayment" | "beforeVisaPayment" | "afterVisaPayment") => {
      handleDeletePaymentClick(sectionKey);
    },
    [handleDeletePaymentClick]
  );
  const renderPaymentDeleteButton = useCallback(
    (sectionKey: "initialPayment" | "beforeVisaPayment" | "afterVisaPayment") => (
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="text-destructive hover:text-destructive hover:bg-destructive/10 h-8"
        onClick={() => handleDeletePayment(sectionKey)}
      >
        <Trash2 className="h-4 w-4 mr-1" />
        Delete
      </Button>
    ),
    [handleDeletePayment]
  );

  // Form product id -> API product name (for product payment delete)
  const PRODUCT_ID_TO_API_NAME: Record<string, string> = {
    financeAndEmployment: "ALL_FINANCE_EMPLOYEMENT",
    indianSideEmployment: "INDIAN_SIDE_EMPLOYEMENT",
    nocLevelJob: "NOC_LEVEL_JOB_ARRANGEMENT",
    lawyerRefuge: "LAWYER_REFUSAL_CHARGE",
    relationshipAffidavit: "RECENTE_MARRIAGE_RELATIONSHIP_AFFIDAVIT",
    marriageCertificate: "MARRIAGE_PHOTO_CERTIFICATE",
    marriagePhoto: "MARRIAGE_PHOTO_FOR_COURT_MARRIAGE",
    trvExtension: "TRV_WORK_PERMIT_EXT_STUDY_PERMIT_EXTENSION",
    onshorePartTime: "ONSHORE_PART_TIME_EMPLOYEMENT",
    judicialReview: "JUDICAL_REVIEW_CHARGE",
    refusalCharges: "REFUSAL_CHARGES",
    kidsStudyPermit: "KIDS_STUDY_PERMIT",
    sponsorCharges: "SPONSOR_CHARGES",
    simCard: "SIM_CARD_ACTIVATION",
    airTicket: "AIR_TICKET",
    insurance: "INSURANCE",
    beaconAccount: "BEACON_ACCOUNT",
    ieltsEnrollment: "IELTS_ENROLLMENT",
    loan: "LOAN_DETAILS",
    forexFees: "FOREX_FEES",
    tuitionFee: "TUTION_FEES",
    forexCard: "FOREX_CARD",
    creditCard: "CREDIT_CARD",
    canadaFund: "CANADA_FUND",
    employmentVerificationCharges: "EMPLOYMENT_VERIFICATION_CHARGES",
    additionalAmountStatementCharges: "ADDITIONAL_AMOUNT_STATEMENT_CHARGES",
    otherProduct: "OTHER_NEW_SELL",
  };

  const handleDeleteProductPaymentClick = useCallback(
    (productId: string, instanceKey: string) => {
      if (!canDeletePayment) {
        setShowCounsellorCannotDeletePopup(true);
        return;
      }
      setDeleteProductPaymentTarget({ productId, instanceKey });
      setDeleteProductPaymentReason("");
    },
    [canDeletePayment]
  );

  const handleDeleteProductPaymentConfirm = useCallback(async () => {
    if (!deleteProductPaymentTarget || !deleteProductPaymentReason.trim()) return;
    const { productId, instanceKey } = deleteProductPaymentTarget;
    const allowMultiple = productId === "otherProduct" || productId === "trvExtension";
    const productName = PRODUCT_ID_TO_API_NAME[productId];
    let productPaymentId: number | undefined;
    if (allowMultiple) {
      const val = form.getValues(`productFields.${productId}.${instanceKey}` as any);
      productPaymentId = val?.productPaymentId != null ? Number(val.productPaymentId) : undefined;
      if (productPaymentId == null) productPaymentId = productPaymentIds[`${productName}-${instanceKey}`] ?? productPaymentIds[productName];
    } else {
      productPaymentId = productPaymentIds[productName];
    }
    try {
      if (productPaymentId != null && productPaymentId > 0) {
        await clientService.deleteClientProductPayment(productPaymentId, deleteProductPaymentReason.trim());
      }
      handleRemoveProduct(instanceKey);
      if (productName && productPaymentId != null) {
        setProductPaymentIds((prev) => {
          const next = { ...prev };
          delete next[productName];
          delete next[`${productName}-${instanceKey}`];
          return next;
        });
      }
      setDeleteProductPaymentTarget(null);
      setDeleteProductPaymentReason("");
      toast({ title: "Product payment deleted", description: "The product payment has been removed." });
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || "Failed to delete product payment.";
      toast({ title: "Error", description: msg, variant: "destructive" });
    }
  }, [deleteProductPaymentTarget, deleteProductPaymentReason, form, productPaymentIds, toast]);

  // We can just display this or set it in form state. Setting in form state is better for submission.
  // Using a useEffect to keep it in sync might cause re-renders but is safe for now.
  // Alternatively, just calculate it on render for display and on submit for data.
  // Let's set it in form so the input updates visually if we want it to be readonly.

  const productType = getProductType(salesType, selectedProductType);

  // Open Send Checklist dialog: fetch checklists for the current product type
  const handleOpenSendChecklistDialog = useCallback(async () => {
    const category = productType; // "spouse" | "student" | "visitor" | null
    if (!category) {
      toast({
        title: "Select a Sales Type",
        description: "Please select a sales type first to load the relevant checklists.",
        variant: "destructive",
      });
      return;
    }
    setSelectedChecklistToSend(null);
    setShowSendChecklistDialog(true);
    setChecklistDialogLoading(true);
    try {
      const checklists = await fetchChecklists(category, null);
      setChecklistDialogChecklists(checklists);
    } catch (err) {
      console.error("Failed to fetch checklists", err);
      toast({
        title: "Error",
        description: "Failed to load checklists. Please try again.",
        variant: "destructive",
      });
      setChecklistDialogChecklists([]);
    } finally {
      setChecklistDialogLoading(false);
    }
  }, [productType, toast]);

  // Send checklist email
  const handleSendChecklistEmail = useCallback(async () => {
    if (!selectedChecklistToSend || !internalClientId) return;
    setIsSendingEmail(true);
    try {
      await api.post(`/api/clients/${internalClientId}/send-checklist`, {
        checklistId: selectedChecklistToSend.id,
        checklistSlug: selectedChecklistToSend.slug,
        checklistTitle: selectedChecklistToSend.title,
      });
      toast({
        title: "Email Sent",
        description: `Checklist "${selectedChecklistToSend.title}" has been sent to the client.`,
      });
      setShowSendChecklistDialog(false);
      setSelectedChecklistToSend(null);
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.response?.data?.message || err.message || "Failed to send email. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSendingEmail(false);
    }
  }, [selectedChecklistToSend, internalClientId, toast]);

  const handleCreateClient = async () => {
    if (isSubmitting || requestInFlightRef.current) {
      return;
    }

    const isValid = await trigger(["name", "enrollmentDate", "passportDetails", "counsellorId"] as any);
    if (!isValid) {
      return;
    }

    setIsSubmitting(true);
    requestInFlightRef.current = true;

    const wasNewClient = internalClientId == null;

    try {
      const data = form.getValues();
      const selectedTypeData = allSaleTypes.find((t) => t.saleType === data.salesType);
      const selectedLeadType = leadTypes.find((lt: any) => lt.leadType === data.leadSource);
      const leadTypeId = selectedLeadType?.id || selectedLeadType?.leadTypeId || null;

      const payload: any = {
        fullName: data.name,
        enrollmentDate: data.enrollmentDate,
        passportDetails: data.passportDetails,
        saleTypeId: selectedTypeData?.id || null,
        counsellorId: data.counsellorId,
        leadTypeId: leadTypeId,
      };

      if (internalClientId != null) {
        payload.clientId = internalClientId;
      }

      const clientRes = await api.post("/api/clients", payload);
      const returnedClient = clientRes.data?.data?.client;
      const newId =
        returnedClient?.clientId ??
        clientRes.data?.data?.clientId ??
        clientRes.data?.clientId ??
        internalClientId;

      if (newId == null) {
        throw new Error("Failed to save client");
      }

      const idNum = Number(newId);
      setInternalClientId(idNum);
      setIsClientCreated(true);
      (window as any).currentClientId = idNum;
      localStorage.setItem("currentClientId", String(idNum));

      const existingClients = JSON.parse(localStorage.getItem("clients") || "[]");
      const clientIndex = existingClients.findIndex(
        (c: any) => c.clientId === idNum || c.id === idNum,
      );
      const clientData = {
        ...data,
        clientId: idNum,
        id: idNum,
        updatedAt: new Date().toISOString(),
      };
      if (clientIndex > -1) {
        existingClients[clientIndex] = clientData;
      } else {
        existingClients.push({
          ...clientData,
          createdAt: new Date().toISOString(),
        });
      }
      localStorage.setItem("clients", JSON.stringify(existingClients));

      if (user?.role === "counsellor") {
        queryClient.invalidateQueries({ queryKey: ["counsellor-clients"] });
      } else {
        queryClient.invalidateQueries({ queryKey: ["clients"] });
      }

      toast({
        title: "Success",
        description: wasNewClient
          ? "Client created successfully! You can now add product and service details."
          : "Client updated successfully!",
      });
    } catch (error: any) {
      console.error("Failed to save client", error);
      toast({
        title: "Error",
        description:
          error.response?.data?.message || error.message || "Failed to save client. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
      requestInFlightRef.current = false;
    }
  };

  // Combined save function - saves both service and product data in sequence
  const handleCombinedSave = async () => {
    if (isSubmitting || requestInFlightRef.current) {
      return;
    }

    setIsSubmitting(true);
    requestInFlightRef.current = true;

    try {
      // First, ensure client is created
      if (!internalClientId) {
        // Validate client info first
        const isValidClient = await trigger(["name", "enrollmentDate", "passportDetails", "counsellorId"] as any);
        if (!isValidClient) {
          toast({
            title: "Validation Error",
            description: "Please fill in all required client information fields.",
            variant: "destructive",
          });
          setIsSubmitting(false);
          requestInFlightRef.current = false;
          return;
        }

        // Create client
        const data = form.getValues();
        const selectedTypeData = allSaleTypes.find((t) => t.saleType === data.salesType);
        const selectedLeadType = leadTypes.find((lt: any) => lt.leadType === data.leadSource);
        const leadTypeId = selectedLeadType?.id || selectedLeadType?.leadTypeId || null;

        const payload: any = {
          fullName: data.name,
          enrollmentDate: data.enrollmentDate,
          passportDetails: data.passportDetails,
          saleTypeId: selectedTypeData?.id || null,
          counsellorId: data.counsellorId,
          leadTypeId: leadTypeId,
        };

        const clientRes = await api.post("/api/clients", payload);
        const returnedClient = clientRes.data?.data?.client;
        const newId = returnedClient?.clientId || clientRes.data?.data?.clientId || clientRes.data?.clientId;

        if (newId) {
          setInternalClientId(newId);
          setIsClientCreated(true);
          (window as any).currentClientId = newId;
          localStorage.setItem("currentClientId", newId.toString());

          const existingClients = JSON.parse(localStorage.getItem("clients") || "[]");
          const clientData = { ...data, clientId: newId, id: newId, updatedAt: new Date().toISOString() };
          existingClients.push({ ...clientData, createdAt: new Date().toISOString() });
          localStorage.setItem("clients", JSON.stringify(existingClients));

          if (user?.role === 'counsellor') {
            queryClient.invalidateQueries({ queryKey: ['counsellor-clients'] });
          } else {
            queryClient.invalidateQueries({ queryKey: ['clients'] });
          }

          toast({ title: "Success", description: "Client created successfully!" });
        } else {
          throw new Error("Failed to create client");
        }
      }

      // Now save service data if service section is shown
      if (showServiceSection) {
        await saveServiceData();
      }

      // Then save product data if product section is shown
      if (showProductSection) {
        await saveProductData();
      }

      toast({ title: "Success", description: "All data saved successfully!" });
      setTimeout(() => { window.location.href = "/clients"; }, 150);
    } catch (error: any) {
      console.error("Failed to save data:", error);
      toast({
        title: "Error",
        description: error.response?.data?.message || error.message || "Failed to save data. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
      requestInFlightRef.current = false;
    }
  };

  // Extracted save service logic
  const saveServiceData = async () => {
    if (!internalClientId) {
      throw new Error("Client ID not found");
    }

    const st = form.getValues("salesType");
    const rowSync = allSaleTypes.find((t) => t.saleType === st);
    let categorySync = String(rowSync?.categoryName || "").toLowerCase();
    if (st?.toLowerCase() === "other product") {
      const spt = form.getValues("selectedProductType");
      if (spt) categorySync = String(spt).toLowerCase();
    }
    setValue("saleTypeCategoryName", categorySync, { shouldValidate: false });

    const isValid = await trigger(["salesType", "totalPayment"] as any);
    if (!isValid) {
      throw new Error("Please fill in all required service/payment fields");
    }

    const data = form.getValues();

    const initialAmount = data.initialPayment?.amount || 0;
    const beforeVisaAmount = data.beforeVisaPayment?.amount || 0;
    const afterVisaAmount = data.afterVisaPayment?.amount || 0;
    const totalPayments = initialAmount + beforeVisaAmount + afterVisaAmount;

    clearErrors("initialPayment.amount" as any);
    clearErrors("beforeVisaPayment.amount" as any);
    clearErrors("afterVisaPayment.amount" as any);
    setFieldErrors((prev) => {
      const newErrors = { ...prev };
      delete newErrors["initialPayment.amount"];
      delete newErrors["beforeVisaPayment.amount"];
      delete newErrors["afterVisaPayment.amount"];
      return newErrors;
    });

    const saveTotalCap = Number(data.totalPayment);
    const saveCap = Number.isFinite(saveTotalCap) ? saveTotalCap : 0;
    if (totalPayments > saveCap) {
      const errorMessage = `Total payments (${totalPayments.toLocaleString()}) exceed total payment (${saveCap.toLocaleString()})`;
      if (data.showInitialPayment && initialAmount > 0) {
        setError("initialPayment.amount" as any, { type: "manual", message: errorMessage });
      }
      if (data.showBeforeVisaPayment && beforeVisaAmount > 0) {
        setError("beforeVisaPayment.amount" as any, { type: "manual", message: errorMessage });
      }
      if (data.showAfterVisaPayment && afterVisaAmount > 0) {
        setError("afterVisaPayment.amount" as any, { type: "manual", message: errorMessage });
      }
      throw new Error(errorMessage);
    }

    const selectedTypeData = allSaleTypes.find((t) => t.saleType === data.salesType);
    const rawTotal = data.totalPayment;
    const currentTotalPaymentVal = typeof rawTotal === "number" && !Number.isNaN(rawTotal) ? rawTotal : Number(selectedTypeData?.amount) || 0;
    const saleTypeId = selectedTypeData?.id;

    const paymentStages = [
      { key: "initialPayment", stage: "INITIAL" },
      { key: "beforeVisaPayment", stage: "BEFORE_VISA" },
      { key: "afterVisaPayment", stage: "AFTER_VISA" },
    ];

    const paymentPromises = paymentStages
      .filter((item) => {
        const paymentData = (data as any)[item.key];
        return paymentData?.amount && paymentData.amount > 0;
      })
      .map(async (item) => {
        const paymentData = (data as any)[item.key];
        const existingId = paymentIds[item.key];

        const payload: any = {
          clientId: internalClientId,
          saleTypeId: saleTypeId,
          totalPayment: String(currentTotalPaymentVal),
          stage: item.stage,
          amount: String(paymentData.amount),
          paymentDate: paymentData.date,
          invoiceNo: paymentData.invoiceNo,
          remarks: paymentData.remarks,
        };

        console.log(internalClientId)

        if (existingId) {
          payload.paymentId = existingId;
        }

        const res = await api.post("/api/client-payments", payload);
        const returnedPayment = res.data?.data?.payment || res.data?.data || res.data;
        const newPaymentId = returnedPayment?.paymentId || returnedPayment?.id;

        if (newPaymentId) {
          setPaymentIds((prev) => ({ ...prev, [item.key]: newPaymentId }));
        }
        return res;
      });

    if (paymentPromises.length > 0) {
      const results = await Promise.allSettled(paymentPromises);
      results.forEach((result, i) => {
        if (result.status === "rejected") {
          console.warn(`Payment stage save failed:`, result.reason?.response?.data?.message || result.reason?.message);
        }
      });
    } else {
      const payload: any = {
        clientId: internalClientId,
        saleTypeId: saleTypeId,
        totalPayment: String(currentTotalPaymentVal),
        stage: "INITIAL",
        amount: "0",
        paymentDate: data.initialPayment?.date || null,
        invoiceNo: data.initialPayment?.invoiceNo || null,
        remarks: data.initialPayment?.remarks || null,
      };

      const existingInitialId = paymentIds.initialPayment;
      if (existingInitialId) payload.paymentId = existingInitialId;

      try {
        await api.post("/api/client-payments", payload);
      } catch (err: any) {
        console.warn("Initial payment save failed:", err?.response?.data?.message || err?.message);
      }
    }
  };

  // Extracted save product logic
  const saveProductData = async () => {
    if (!internalClientId) {
      throw new Error("Client ID not found");
    }

    const data = form.getValues();
    const clientId = internalClientId || (window as any).currentClientId;

    if (!clientId) {
      throw new Error("Client ID not found");
    }

    const productFields = data.productFields as any;

    if (!productFields) {
      return;
    }

    const productPaymentPromises: Promise<any>[] = [];

    const createOrUpdateProductPayment = (
      productName: string,
      entityData: any,
      amount: number = 0,
      invoiceNo: string = "",
    ) => {
      if (!entityData) return Promise.resolve();

      const existingProductPaymentId = productPaymentIdsRef.current[productName];
      const isAllFinance = productName === "ALL_FINANCE_EMPLOYEMENT";

      const payload: any = {
        clientId: Number(clientId),
        productName,
        amount: isAllFinance ? null : String(amount),
        invoiceNo: isAllFinance ? null : String(invoiceNo || ""),
        paymentDate: isAllFinance ? null : (
          entityData.date ||
          entityData.feeDate ||
          entityData.extensionDate ||
          entityData.startDate ||
          entityData.accountDate ||
          entityData.sellDate ||
          new Date().toISOString().split("T")[0]
        ),
        remarks: isAllFinance ? null : String(entityData.remarks || entityData.remark || ""),
        entityData,
      };

      if (existingProductPaymentId) {
        payload.productPaymentId = Number(existingProductPaymentId);
        payload.id = Number(existingProductPaymentId);
      }

      return api.post("/api/client-product-payments", payload).then((res) => {
        const returnedPayment = res.data?.data?.productPayment || res.data?.data || res.data;
        const newProductPaymentId = returnedPayment?.productPaymentId || returnedPayment?.id;
        if (newProductPaymentId) {
          setProductPaymentIds((prev) => ({ ...prev, [productName]: newProductPaymentId }));
        }
        return res;
      });
    };

    const masterOnlyMappings = [
      { field: "financeAndEmployment", productName: "ALL_FINANCE_EMPLOYEMENT" },
      { field: "indianSideEmployment", productName: "INDIAN_SIDE_EMPLOYEMENT" },
      { field: "nocLevelJob", productName: "NOC_LEVEL_JOB_ARRANGEMENT" },
      { field: "lawyerRefuge", productName: "LAWYER_REFUSAL_CHARGE" },
      { field: "onshorePartTime", productName: "ONSHORE_PART_TIME_EMPLOYEMENT" },
      { field: "marriagePhoto", productName: "MARRIAGE_PHOTO_FOR_COURT_MARRIAGE" },
      { field: "marriageCertificate", productName: "MARRIAGE_PHOTO_CERTIFICATE" },
      { field: "relationshipAffidavit", productName: "RECENTE_MARRIAGE_RELATIONSHIP_AFFIDAVIT" },
      { field: "judicialReview", productName: "JUDICAL_REVIEW_CHARGE" },
      { field: "refusalCharges", productName: "REFUSAL_CHARGES" },
      { field: "kidsStudyPermit", productName: "KIDS_STUDY_PERMIT" },
      { field: "sponsorCharges", productName: "SPONSOR_CHARGES" },
      { field: "canadaFund", productName: "CANADA_FUND" },
      { field: "employmentVerificationCharges", productName: "EMPLOYMENT_VERIFICATION_CHARGES" },
      { field: "additionalAmountStatementCharges", productName: "ADDITIONAL_AMOUNT_STATEMENT_CHARGES" },
    ];

    masterOnlyMappings.forEach(({ field, productName }) => {
      const fieldData = productFields[field];
      if (fieldData?.amount > 0) {
        let entityDataToSend = { ...fieldData };
        if (field === "financeAndEmployment" && productName === "ALL_FINANCE_EMPLOYEMENT") {
          entityDataToSend = buildAllFinanceEntityData(fieldData, isPartialPayment);
        } else {
          entityDataToSend = {
            amount: Number(fieldData.amount || 0),
            date: fieldData.date || "",
            invoiceNo: fieldData.invoiceNo || "",
            remarks: fieldData.remarks || "",
          };
        }
        productPaymentPromises.push(
          createOrUpdateProductPayment(productName, entityDataToSend, fieldData.amount, fieldData.invoiceNo)
        );
      }
    });

    if (productFields.otherProduct && typeof productFields.otherProduct === 'object') {
      if (!productFields.newServices) {
        productFields.newServices = [];
      }
      Object.keys(productFields.otherProduct).forEach((instanceKey) => {
        const instance = (productFields.otherProduct as any)[instanceKey];
        if (instance && (instance.serviceName || instance.amount > 0)) {
          productFields.newServices.push({
            serviceName: instance.serviceName || "",
            serviceInfo: instance.serviceInfo || "",
            amount: instance.amount || 0,
            date: instance.date || "",
            invoiceNo: instance.invoiceNo || "",
            remark: instance.remark || "",
            productPaymentId: instance.productPaymentId || null,
            _instanceKey: instanceKey,
          });
        }
      });
    }

    if (productFields.trvExtension && typeof productFields.trvExtension === 'object') {
      const hasInstanceKeys = Object.keys(productFields.trvExtension).some(key =>
        key.includes('trvExtension-') || key.includes('-')
      );

      if (hasInstanceKeys) {
        Object.keys(productFields.trvExtension).forEach((instanceKey) => {
          const instance = (productFields.trvExtension as any)[instanceKey];
          if (instance && (instance.amount > 0 || instance.type)) {
            const entityData: any = {
              type: instance.type || "",
              amount: Number(instance.amount || 0),
              extensionDate: instance.date || "",
              invoiceNo: instance.invoiceNo || "",
              remarks: instance.remarks || "",
            };
            const payload: any = {
              clientId: Number(clientId),
              productName: "TRV_WORK_PERMIT_EXT_STUDY_PERMIT_EXTENSION",
              amount: String(entityData.amount || 0),
              invoiceNo: String(entityData.invoiceNo || ""),
              paymentDate: instance.date || new Date().toISOString().split("T")[0],
              remarks: String(instance.remarks || ""),
              entityData,
            };
            if (instance.productPaymentId) {
              payload.productPaymentId = Number(instance.productPaymentId);
            }
            productPaymentPromises.push(api.post("/api/client-product-payments", payload));
          }
        });
      } else if (productFields.trvExtension.type || productFields.trvExtension.amount > 0) {
        const entityData: any = {
          type: productFields.trvExtension.type || "",
          amount: Number(productFields.trvExtension.amount || 0),
          extensionDate: productFields.trvExtension.date || "",
          invoiceNo: productFields.trvExtension.invoiceNo || "",
          remarks: productFields.trvExtension.remarks || "",
        };
        const payload: any = {
          clientId: Number(clientId),
          productName: "TRV_WORK_PERMIT_EXT_STUDY_PERMIT_EXTENSION",
          amount: String(entityData.amount || 0),
          invoiceNo: String(entityData.invoiceNo || ""),
          paymentDate: productFields.trvExtension.date || new Date().toISOString().split("T")[0],
          remarks: String(productFields.trvExtension.remarks || ""),
          entityData,
        };
        if (productFields.trvExtension.productPaymentId) {
          payload.productPaymentId = Number(productFields.trvExtension.productPaymentId);
        }
        productPaymentPromises.push(api.post("/api/client-product-payments", payload));
      }
    }

    if (productFields.newServices && Array.isArray(productFields.newServices)) {
      productFields.newServices.forEach((service: any) => {
        if (service.serviceName || service.amount > 0) {
          const entityData: any = {
            serviceName: service.serviceName || "",
            serviceInformation: service.serviceInfo || "",
            amount: Number(service.amount || 0),
            sellDate: service.date ? (service.date.includes("T") ? service.date.split("T")[0] : service.date) : new Date().toISOString().split("T")[0],
            invoiceNo: service.invoiceNo || null,
            remarks: service.remark || service.remarks || "",
          };
          const payload: any = {
            clientId: Number(clientId),
            productName: "OTHER_NEW_SELL",
            amount: String(service.amount || 0),
            invoiceNo: String(service.invoiceNo || ""),
            paymentDate: entityData.sellDate || new Date().toISOString().split("T")[0],
            remarks: String(entityData.remarks || ""),
            entityData,
          };
          if (service.productPaymentId) {
            payload.productPaymentId = Number(service.productPaymentId);
          }
          productPaymentPromises.push(api.post("/api/client-product-payments", payload));
        }
      });
    }

    if (productFields.simCard && (productFields.simCard.isActivated || productFields.simCard.plan)) {
      const simCardEntityData = {
        activatedStatus: productFields.simCard.isActivated === "Yes" ? true : productFields.simCard.isActivated === "No" ? false : null,
        simcardPlan: productFields.simCard.plan || null,
        simCardGivingDate: productFields.simCard.date || null,
        simActivationDate: productFields.simCard.startDate || null,
        remarks: productFields.simCard.remarks || null,
      };
      productPaymentPromises.push(createOrUpdateProductPayment("SIM_CARD_ACTIVATION", simCardEntityData));
    }

    if (productFields.airTicket && (productFields.airTicket.amount > 0 || productFields.airTicket.isBooked)) {
      const airTicketEntityData = {
        isTicketBooked: productFields.airTicket.isBooked === "Yes" ? true : productFields.airTicket.isBooked === "No" ? false : null,
        amount: productFields.airTicket.amount || 0,
        airTicketNumber: productFields.airTicket.invoiceNo || null,
        ticketDate: productFields.airTicket.date || null,
        remarks: productFields.airTicket.remarks || null,
      };
      productPaymentPromises.push(
        createOrUpdateProductPayment("AIR_TICKET", airTicketEntityData, productFields.airTicket.amount, productFields.airTicket.invoiceNo)
      );
    }

    if (productFields.insurance && productFields.insurance.amount > 0) {
      const insuranceEntityData = {
        amount: productFields.insurance.amount || 0,
        policyNumber: productFields.insurance.insuranceNo || productFields.insurance.policyNo || null,
        insuranceDate: productFields.insurance.date || null,
        remarks: productFields.insurance.remarks || null,
      };
      productPaymentPromises.push(createOrUpdateProductPayment("INSURANCE", insuranceEntityData, productFields.insurance.amount));
    }

    const beaconData = productFields.myBeacon || productFields.beaconAccount;
    if (beaconData && (beaconData.fundingAmount > 0 || beaconData.cadAmount > 0)) {
      const fundingAmountValue = beaconData.fundingAmount || beaconData.cadAmount || 0;
      const beaconEntityData = {
        openingDate: beaconData.openingDate || null,
        fundingDate: beaconData.fundingDate || null,
        amount: fundingAmountValue,
        remarks: beaconData.remarks || null,
      };
      productPaymentPromises.push(createOrUpdateProductPayment("BEACON_ACCOUNT", beaconEntityData, fundingAmountValue));
    }

    if (productFields.ieltsEnrollment && (productFields.ieltsEnrollment.amount > 0 || productFields.ieltsEnrollment.isEnrolled)) {
      const ieltsEntityData = {
        enrolledStatus: productFields.ieltsEnrollment.isEnrolled === "Yes" ? true : productFields.ieltsEnrollment.isEnrolled === "No" ? false : null,
        amount: productFields.ieltsEnrollment.amount || 0,
        enrollmentDate: productFields.ieltsEnrollment.date || null,
        remarks: productFields.ieltsEnrollment.remarks || null,
      };
      productPaymentPromises.push(
        createOrUpdateProductPayment("IELTS_ENROLLMENT", ieltsEntityData, productFields.ieltsEnrollment.amount)
      );
    }
    if (productFields.loan && productFields.loan.amount > 0) {
      productPaymentPromises.push(createOrUpdateProductPayment("LOAN_DETAILS", productFields.loan, productFields.loan.amount));
    }
    if (productFields.forexFees && productFields.forexFees.amount > 0) {
      const forexFeesEntityData = {
        ...productFields.forexFees,
        side: productFields.forexFees.side || "PI",
        feeDate: productFields.forexFees.date || productFields.forexFees.feeDate || "",
      };
      delete forexFeesEntityData.date;
      productPaymentPromises.push(createOrUpdateProductPayment("FOREX_FEES", forexFeesEntityData, productFields.forexFees.amount));
    }
    if (productFields.tuitionFee && productFields.tuitionFee.status) {
      let statusValue = productFields.tuitionFee.status || "";
      statusValue = statusValue.toLowerCase();
      if (statusValue === "panding") statusValue = "pending";
      if (statusValue !== "paid" && statusValue !== "pending") statusValue = "pending";

      const tuitionFeeEntityData = {
        ...productFields.tuitionFee,
        tutionFeesStatus: statusValue,
        feeDate: productFields.tuitionFee.date || productFields.tuitionFee.feeDate || "",
      };
      delete tuitionFeeEntityData.status;
      delete tuitionFeeEntityData.date;
      productPaymentPromises.push(createOrUpdateProductPayment("TUTION_FEES", tuitionFeeEntityData));
    }

    if (productFields.forexCard && productFields.forexCard.isActivated) {
      let forexCardStatus = null;
      if (productFields.forexCard.isActivated === "Yes") forexCardStatus = "Yes";
      else if (productFields.forexCard.isActivated === "No") forexCardStatus = "No";
      const forexCardEntityData = {
        forexCardStatus: forexCardStatus,
        cardDate: productFields.forexCard.date || null,
        remarks: productFields.forexCard.remarks || null,
      };
      productPaymentPromises.push(createOrUpdateProductPayment("FOREX_CARD", forexCardEntityData));
    }

    if (productFields.creditCard && (productFields.creditCard.isActivated || productFields.creditCard.info)) {
      const creditCardEntityData = {
        activatedStatus: productFields.creditCard.isActivated === "Yes" ? true : productFields.creditCard.isActivated === "No" ? false : null,
        cardPlan: productFields.creditCard.info || null,
        cardGivingDate: productFields.creditCard.date || null,
        cardActivationDate: productFields.creditCard.startDate || null,
        remarks: productFields.creditCard.remarks || null,
      };
      productPaymentPromises.push(createOrUpdateProductPayment("CREDIT_CARD", creditCardEntityData));
    }

    if (productPaymentPromises.length > 0) {
      const results = await Promise.allSettled(productPaymentPromises);
      const hasErrors = results.some(r => r.status === 'rejected');
      if (hasErrors) {
        throw new Error("Some product payments failed to save");
      }
    }
  };

  // Show loading state while fetching client data in edit mode
  if (isLoadingClientData && isEditMode) {
    return (
      <PageWrapper
        title={isEditMode ? "Edit Client" : "Add New Client"}
        breadcrumbs={[
          { label: "Clients", href: "/clients" },
          { label: isEditMode ? "Edit Client" : "New Client" },
        ]}
      >
        <ClientFormSkeleton />
      </PageWrapper>
    );
  }

  // Extract step components for single page layout
  const clientInfoSection = (
    <FormSection
      title="Client Information"
      description="Enter the basic details of the client"
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-8">
        <FormTextInput
          name="name"
          control={control}
          label="Full Name"
          placeholder="Rahul Kumar"
          required
        />
        <FormDateInput
          name="enrollmentDate"
          control={control}
          label="Enrollment Date"
          maxDate={new Date()}
        />
        <FormTextInput
          name="passportDetails"
          control={control}
          label="Passport Details"
          placeholder="e.g. A12345678"
        />
        <FormSelectInput
          name="leadSource"
          control={control}
          label="Lead Source"
          placeholder="Select Lead Source"
          options={leadTypes.map((lt: any) => ({
            label: lt.leadType,
            value: lt.leadType,
          }))}
        />
        <div className="hidden md:block" />
      </div>
    </FormSection>
  );

  const serviceSection = (
    <FormSection
      title="Payment Details"
      description="Consultancy charges and payment status"
    >
      <div className="space-y-6">
        <FormSelectInput
          name="salesType"
          control={control}
          label="Sales Type"
          placeholder="Select Sales Type"
          options={dynamicOptions}
        />
        {salesType === "Other Product" && (
          <FormSelectInput
            name="selectedProductType"
            control={control}
            label="Product Type"
            placeholder="Select Product Type"
            options={[
              { label: "Spouse", value: "spouse" },
              { label: "Student", value: "student" },
              { label: "Visitor", value: "visitor" },
            ]}
          />
        )}
        {/* Send Checklist button — visible when a sales type with a known product type is selected
        {productType && (
          <div className="flex justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={handleOpenSendChecklistDialog}
              className="gap-2 border-primary text-primary hover:bg-primary/10"
            >
              <Mail className="w-4 h-4" />
              Send Checklist
            </Button>
          </div>
        )} */}
        <FormCurrencyInput
          name="totalPayment"
          control={control}
          label="Total Payment"
          placeholder="Enter total payment amount"
          data-testid="input-total-payment"
          disabled={!paymentPermissions.canEditTotalPayment}
        />

        {/* Initial Amount Received Section */}
        <div className="space-y-4">
          {paymentPermissions.canAddPayment && (
            <FormSwitchInput
              name="showInitialPayment"
              control={control}
              label="Add Initial Amount Received"
            />
          )}
          {showInitialPayment && (
            <FinancialEntry
              control={control}
              name="initialPayment"
              label="Initial Amount Received"
              hasRemarks={true}
              amountPlaceholder="Enter initial amount"
              disabled={!paymentEditability.initialPayment}
              rightAction={paymentEditability.initialPayment ? renderPaymentDeleteButton("initialPayment") : undefined}
            />
          )}
        </div>

        {/* Before Visa Payment Section */}
        <div className="space-y-4">
          {paymentPermissions.canAddPayment && (
            <FormSwitchInput
              name="showBeforeVisaPayment"
              control={control}
              label="Add Before Visa Payment"
            />
          )}
          {showBeforeVisaPayment && (
            <FinancialEntry
              control={control}
              name="beforeVisaPayment"
              label="Before Visa Payment"
              hasRemarks={true}
              amountPlaceholder="Enter before visa payment amount"
              disabled={!paymentEditability.beforeVisaPayment}
              rightAction={paymentEditability.beforeVisaPayment ? renderPaymentDeleteButton("beforeVisaPayment") : undefined}
            />
          )}
        </div>

        {/* After Visa Payment Section */}
        <div className="space-y-4">
          {paymentPermissions.canAddPayment && (
            <FormSwitchInput
              name="showAfterVisaPayment"
              control={control}
              label="Add After Visa Payment"
            />
          )}
          {showAfterVisaPayment && (
            <FinancialEntry
              control={control}
              name="afterVisaPayment"
              label="After Visa Payment"
              hasRemarks={true}
              amountPlaceholder="Enter after visa payment amount"
              disabled={!paymentEditability.afterVisaPayment}
              rightAction={paymentEditability.afterVisaPayment ? renderPaymentDeleteButton("afterVisaPayment") : undefined}
            />
          )}
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
            Amount Pending (Auto-calculated)
          </label>
          <div
            className="flex h-10 w-full rounded-md border border-input bg-muted px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            data-testid="text-amount-pending"
          >
            ₹ {calculatedPending.toLocaleString()}
          </div>
        </div>
      </div>
    </FormSection>
  );

  // Render product form based on form type
  const renderProductForm = (product: { id: string; name: string; formType: string; instanceKey?: string }, instanceKeyParam?: string) => {
    const uniqueKey = instanceKeyParam || product.instanceKey || product.id;
    switch (product.formType) {
      case "financialEntry":
        const canEditPendingFinance = user?.role === "superadmin" || user?.role === "director" || user?.role === "manager";
        const isFinanceDisabled = product.id === "financeAndEmployment" &&
          ((isPartialPayment && approvalStatus !== "approved") || approvalStatus === "pending") &&
          !canEditPendingFinance;
        return (
          <FinancialEntry
            control={control}
            name={`productFields.${product.id}` as any}
            label={product.name}
            hasRemarks={true}
            showTotalPayment={product.id === "financeAndEmployment"}
            showSecondPayment={product.id === "financeAndEmployment" && isPartialPayment}
            maxAdditionalPayments={product.id === "financeAndEmployment" ? 2 : 5}
            disabled={isFinanceDisabled}
          />
        );

      case "ieltsEnrollment":
        return (
          <div className="p-4 border rounded-lg bg-muted/20 space-y-3">
            <Label className="text-base font-semibold">{product.name}</Label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <FormSelectInput
                name="productFields.ieltsEnrollment.isEnrolled"
                control={control}
                label="Enrolled"
                placeholder="Select Status"
                options={[
                  { label: "Yes", value: "Yes" },
                  { label: "No", value: "No" },
                ]}
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormCurrencyInput
                name="productFields.ieltsEnrollment.amount"
                control={control}
                label="Amount"
              />
              <FormDateInput
                name="productFields.ieltsEnrollment.date"
                control={control}
                label="Date"
                maxDate={new Date()}
              />
            </div>
            <FormTextareaInput
              name="productFields.ieltsEnrollment.remarks"
              control={control}
              label="Remarks"
              placeholder="IELTS remarks..."
            />
          </div>
        );

      case "loan":
        return (
          <div className="p-4 border rounded-lg bg-muted/20 space-y-3">
            <Label className="text-base font-semibold">{product.name}</Label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormCurrencyInput
                name="productFields.loan.amount"
                control={control}
                label="Amount"
              />
              <FormDateInput
                name="productFields.loan.disbursementDate"
                control={control}
                label="Disbursement Date"
                maxDate={new Date()}
              />
            </div>
            <FormTextareaInput
              name="productFields.loan.remarks"
              control={control}
              label="Remarks"
              placeholder="Loan remarks..."
            />
          </div>
        );

      case "simCard":
        return (
          <div className="p-4 border rounded-lg bg-muted/20 space-y-3">
            <Label className="text-base font-semibold">{product.name}</Label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <FormSelectInput
                name="productFields.simCard.isActivated"
                control={control}
                label="Activated"
                placeholder="Select Status"
                options={[
                  { label: "Yes", value: "Yes" },
                  { label: "No", value: "No" },
                ]}
              />
              <FormTextInput
                name="productFields.simCard.plan"
                control={control}
                label="SIM Card Plan"
                placeholder="Enter plan details"
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormDateInput
                name="productFields.simCard.date"
                control={control}
                label="Sim Card Giving Date"
                maxDate={new Date()}
              />
              <FormDateInput
                name="productFields.simCard.startDate"
                control={control}
                label="Activation Date"
                maxDate={new Date()}
              />
            </div>
            <FormTextareaInput
              name="productFields.simCard.remarks"
              control={control}
              label="Remarks"
              placeholder="SIM Card remarks..."
            />
          </div>
        );

      case "insurance":
        return (
          <div className="p-4 border rounded-lg bg-muted/20 space-y-3">
            <Label className="text-base font-semibold">{product.name}</Label>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <FormCurrencyInput
                name="productFields.insurance.amount"
                control={control}
                label="Amount"
              />
              <FormTextInput
                name="productFields.insurance.insuranceNo"
                control={control}
                label="Insurance No / Policy No"
                placeholder="Enter insurance or policy number"
              />
              <FormDateInput
                name="productFields.insurance.date"
                control={control}
                label="Date"
                maxDate={new Date()}
              />
            </div>
            <FormTextareaInput
              name="productFields.insurance.remarks"
              control={control}
              label="Remarks"
              placeholder="Insurance remarks..."
            />
          </div>
        );

      case "beaconAccount":
        return (
          <div className="p-4 border rounded-lg bg-muted/20 space-y-3">
            <Label className="text-base font-semibold">{product.name}</Label>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <FormDateInput
                name="productFields.beaconAccount.openingDate"
                control={control}
                label="Opening Date"
                maxDate={new Date()}
              />
              <FormDateInput
                name="productFields.beaconAccount.fundingDate"
                control={control}
                label="Funding Date"
                maxDate={new Date()}
              />
              <FormCurrencyInput
                name="productFields.beaconAccount.fundingAmount"
                control={control}
                label="Funding Amount"
                currencySymbol="$"
              />
            </div>
            <FormTextareaInput
              name="productFields.beaconAccount.remarks"
              control={control}
              label="Remarks"
              placeholder="Beacon Account remarks..."
            />
          </div>
        );

      case "airTicket":
        return (
          <div className="p-4 border rounded-lg bg-muted/20 space-y-3">
            <Label className="text-base font-semibold">{product.name}</Label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <FormSelectInput
                name="productFields.airTicket.isBooked"
                control={control}
                label="Ticket Booked"
                placeholder="Select Status"
                options={[
                  { label: "Yes", value: "Yes" },
                  { label: "No", value: "No" },
                ]}
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <FormCurrencyInput
                name="productFields.airTicket.amount"
                control={control}
                label="Amount"
              />
              <FormTextInput
                name="productFields.airTicket.invoiceNo"
                control={control}
                label="Invoice No"
              />
              <FormDateInput
                name="productFields.airTicket.date"
                control={control}
                label="Date"
                maxDate={new Date()}
              />
            </div>
            <FormTextareaInput
              name="productFields.airTicket.remarks"
              control={control}
              label="Remarks"
              placeholder="Air Ticket remarks..."
            />
          </div>
        );

      case "trvExtension":
        return (
          <div className="p-4 border rounded-lg bg-muted/20 space-y-3">
            <Label className="text-base font-semibold">{product.name}</Label>
            <div className="grid grid-cols-1 gap-4">
              <FormSelectInput
                name={`productFields.trvExtension.${uniqueKey}.type`}
                control={control}
                label="Type"
                placeholder="Select Type"
                options={[
                  { label: "TRV", value: "TRV" },
                  { label: "Study Permit Ext.", value: "Study Permit Ext." },
                  { label: "Work Permit Ext.", value: "Work Permit Ext." },
                  { label: "PGWP", value: "PGWP" },
                  { label: "Visitor Record", value: "Visitor Record" },
                ]}
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <FormCurrencyInput
                name={`productFields.trvExtension.${uniqueKey}.amount`}
                control={control}
                label="Amount"
              />
              <FormDateInput
                name={`productFields.trvExtension.${uniqueKey}.date`}
                control={control}
                label="Date"
                maxDate={new Date()}
              />
              <FormTextInput
                name={`productFields.trvExtension.${uniqueKey}.invoiceNo`}
                control={control}
                label="Invoice No"
              />
            </div>
            <FormTextareaInput
              name={`productFields.trvExtension.${uniqueKey}.remarks`}
              control={control}
              label="Remarks"
              placeholder="Add remark for this section..."
            />
          </div>
        );

      case "relationshipAffidavit":
        return (
          <div className="p-4 border rounded-lg bg-muted/20 space-y-3">
            <Label className="text-base font-semibold">{product.name}</Label>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <FormCurrencyInput
                name="productFields.relationshipAffidavit.amount"
                control={control}
                label="Amount"
              />
              <FormDateInput
                name="productFields.relationshipAffidavit.date"
                control={control}
                label="Date"
                maxDate={new Date()}
              />
              <FormTextInput
                name="productFields.relationshipAffidavit.invoiceNo"
                control={control}
                label="Invoice No"
              />
            </div>
            <FormTextareaInput
              name="productFields.relationshipAffidavit.remarks"
              control={control}
              label="Remarks"
              placeholder="Add remarks..."
            />
          </div>
        );

      case "sponsorCharges":
        return (
          <div className="p-4 border rounded-lg bg-muted/20 space-y-3">
            <Label className="text-base font-semibold">{product.name}</Label>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <FormCurrencyInput
                name="productFields.sponsorCharges.amount"
                control={control}
                label="Amount (₹10,000 + GST)"
              />
              <FormDateInput
                name="productFields.sponsorCharges.date"
                control={control}
                label="Date"
                maxDate={new Date()}
              />
              <FormTextInput
                name="productFields.sponsorCharges.invoiceNo"
                control={control}
                label="Invoice No"
              />
            </div>
            <FormTextareaInput
              name="productFields.sponsorCharges.remarks"
              control={control}
              label="Remarks"
              placeholder="Sponsor charges remarks..."
            />
          </div>
        );

      case "forexCard":
        return (
          <div className="p-4 border rounded-lg bg-muted/20 space-y-3">
            <Label className="text-base font-semibold">{product.name}</Label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormSelectInput
                name="productFields.forexCard.isActivated"
                control={control}
                label="Activated"
                placeholder="Select Status"
                options={[
                  { label: "Yes", value: "Yes" },
                  { label: "No", value: "No" },
                ]}
              />
              <FormDateInput
                name="productFields.forexCard.date"
                control={control}
                label="Date"
                maxDate={new Date()}
              />
            </div>
            <FormTextareaInput
              name="productFields.forexCard.remarks"
              control={control}
              label="Remarks"
              placeholder="Forex Card remarks..."
            />
          </div>
        );

      case "forexFees":
        return (
          <div className="p-4 border rounded-lg bg-muted/20 space-y-3">
            <Label className="text-base font-semibold">{product.name}</Label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormSelectInput
                name="productFields.forexFees.side"
                control={control}
                label="Side"
                placeholder="Select Side"
                options={[
                  { label: "Pratham Internation", value: "PI" },
                  { label: "Third Party", value: "TP" },
                ]}
              />
              <FormDateInput
                name="productFields.forexFees.date"
                control={control}
                label="Date"
                maxDate={new Date()}
              />
            </div>
            <FormCurrencyInput
              name="productFields.forexFees.amount"
              control={control}
              label="Amount"
            />
            <FormTextareaInput
              name="productFields.forexFees.remarks"
              control={control}
              label="Remarks"
              placeholder="Forex Fees remarks..."
            />
          </div>
        );

      case "tuitionFee":
        return (
          <div className="p-4 border rounded-lg bg-muted/20 space-y-3">
            <Label className="text-base font-semibold">{product.name}</Label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormSelectInput
                name="productFields.tuitionFee.status"
                control={control}
                label="Status"
                placeholder="Select Status"
                options={[
                  { label: "Paid", value: "Paid" },
                  { label: "Pending", value: "Pending" },
                ]}
              />
              <FormDateInput
                name="productFields.tuitionFee.date"
                control={control}
                label="Date"
                maxDate={new Date()}
              />
            </div>
            <FormTextareaInput
              name="productFields.tuitionFee.remarks"
              control={control}
              label="Remarks"
              placeholder="Tuition Fee remarks..."
            />
          </div>
        );

      case "creditCard":
        return (
          <div className="p-4 border rounded-lg bg-muted/20 space-y-3">
            <Label className="text-base font-semibold">{product.name}</Label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <FormSelectInput
                name="productFields.creditCard.isActivated"
                control={control}
                label="Activated"
                placeholder="Select Status"
                options={[
                  { label: "Yes", value: "Yes" },
                  { label: "No", value: "No" },
                ]}
              />
              <FormTextInput
                name="productFields.creditCard.info"
                control={control}
                label="Card Information"
                placeholder="Enter card information"
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormDateInput
                name="productFields.creditCard.date"
                control={control}
                label="Card Issue Date"
                maxDate={new Date()}
              />
              <FormDateInput
                name="productFields.creditCard.startDate"
                control={control}
                label="Activation Date"
                maxDate={new Date()}
              />
            </div>
            <FormTextareaInput
              name="productFields.creditCard.remarks"
              control={control}
              label="Remarks"
              placeholder="Credit Card remarks..."
            />
          </div>
        );

      case "otherProduct":
        return (
          <div className="p-4 border rounded-lg bg-muted/20 space-y-3">
            <Label className="text-base font-semibold">{product.name}</Label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormTextInput
                name={`productFields.otherProduct.${uniqueKey}.serviceName`}
                control={control}
                label="Product Name"
                placeholder="Enter product name"
              />
              <FormTextInput
                name={`productFields.otherProduct.${uniqueKey}.serviceInfo`}
                control={control}
                label="Product Information"
                placeholder="Enter product information"
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <FormCurrencyInput
                name={`productFields.otherProduct.${uniqueKey}.amount`}
                control={control}
                label="Amount"
              />
              <FormDateInput
                name={`productFields.otherProduct.${uniqueKey}.date`}
                control={control}
                label="Date"
                maxDate={new Date()}
              />
              <FormTextInput
                name={`productFields.otherProduct.${uniqueKey}.invoiceNo`}
                control={control}
                label="Invoice No"
                placeholder="INV-000"
              />
            </div>
            <FormTextareaInput
              name={`productFields.otherProduct.${uniqueKey}.remark`}
              control={control}
              label="Remarks"
              placeholder="Add remarks for this product..."
            />
          </div>
        );

      default:
        return null;
    }
  };

  const productSection = (
    <div className="space-y-6">
      {/* Search and Add Products Interface */}
      {showProductSearch ? (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                type="text"
                placeholder="Search products by name, category, or description..."
                value={productSearchQuery}
                onChange={(e) => setProductSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button
              variant="outline"
              onClick={() => {
                setShowProductSearch(false);
                setProductSearchQuery("");
                setSelectedProductIds([]);
              }}
            >
              Cancel
            </Button>
          </div>

          {filteredProducts.length > 0 ? (
            <div className="border rounded-lg p-4 max-h-96 overflow-y-auto">
              <div className="space-y-2">
                {filteredProducts.map((product) => {
                  const isSelected = selectedProductIds.includes(product.id);
                  const allowMultipleInstances = ["otherProduct", "trvExtension"];
                  const isAlreadyAdded = allowMultipleInstances.includes(product.id)
                    ? false
                    : addedProducts.some(p => p.id === product.id);

                  return (
                    <label
                      key={product.id}
                      className={`flex items-start gap-3 p-3 border rounded-lg cursor-pointer transition-colors ${isSelected
                        ? "bg-primary/10 border-primary"
                        : "hover:bg-muted/50"
                        } ${isAlreadyAdded ? "opacity-50" : ""}`}
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => handleProductToggle(product.id)}
                        disabled={isAlreadyAdded}
                        className="mt-1"
                      />
                      <div className="flex-1">
                        <div className="font-medium flex items-center gap-2">
                          {product.name}
                          {product.id === "financeAndEmployment" && (
                            <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 font-semibold">
                              Core Product
                            </span>
                          )}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {product.description || product.category}
                        </div>
                      </div>
                      {isAlreadyAdded && (
                        <span className="text-xs text-muted-foreground">Already added</span>
                      )}
                      {allowMultipleInstances.includes(product.id) && (
                        <span className="text-xs text-primary">Can add multiple</span>
                      )}
                    </label>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              No products found matching your search.
            </div>
          )}

          {selectedProductIds.length > 0 && (
            <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
              <span className="text-sm font-medium">
                {selectedProductIds.length} product(s) selected
              </span>
              <Button onClick={handleAddSelectedProducts}>
                <Plus className="w-4 h-4 mr-2" />
                Add Selected Products
              </Button>
            </div>
          )}
        </div>
      ) : (
        <Button
          variant="outline"
          onClick={() => setShowProductSearch(true)}
          className="w-full"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Products
        </Button>
      )}

      {/* Added Products Forms - order fixed to match Add Products list (not response/add order) */}
      {addedProducts.length > 0 && (() => {
        const orderIds = availableProducts.map((p: { id: string }) => p.id);
        const sortedAddedProducts = [...addedProducts]
          .map((p, i) => ({ p, i }))
          .sort((a, b) => {
            const oa = orderIds.indexOf(a.p.id);
            const ob = orderIds.indexOf(b.p.id);
            if (oa !== ob) return oa - ob;
            return a.i - b.i;
          })
          .map(({ p }) => p);
        return (
          <div className="space-y-4">
            <div className="text-sm font-medium text-muted-foreground">
              Added Products ({addedProducts.length})
            </div>
            {sortedAddedProducts.map((product) => {
              const allowMultiple = product.id === "otherProduct" || product.id === "trvExtension";
              const instanceCount = addedProducts.filter(p => p.id === product.id).length;
              const instanceNumber = addedProducts
                .filter(p => p.id === product.id)
                .findIndex(p => p.instanceKey === product.instanceKey) + 1;
              const showInstanceNumber = instanceCount > 1;

              const productName = PRODUCT_ID_TO_API_NAME[product.id];
              let productPaymentId: number | undefined;
              if (allowMultiple) {
                const val = form.getValues(`productFields.${product.id}.${product.instanceKey}` as any);
                productPaymentId = val?.productPaymentId != null ? Number(val.productPaymentId) : undefined;
                if (productPaymentId == null) productPaymentId = productPaymentIds[`${productName}-${product.instanceKey}`] ?? productPaymentIds[productName];
              } else {
                productPaymentId = productPaymentIds[productName];
              }
              const hasSavedPayment = productPaymentId != null && productPaymentId > 0;

              return (
                <div key={product.instanceKey} className="border rounded-lg p-4 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      <span className="font-semibold">
                        {product.name}
                        {showInstanceNumber && ` #${instanceNumber}`}
                      </span>
                      {product.id === "financeAndEmployment" && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 font-semibold">
                          Core Product
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {product.id === "financeAndEmployment" && (
                        <>
                          <Button
                            variant={isPartialPayment ? "default" : "outline"}
                            size="sm"
                            onClick={async () => {
                              const data = form.getValues();
                              const productFields = data.productFields as any;
                              const fieldData = productFields?.financeAndEmployment;

                              if (approvalStatus === "rejected") {
                                if (!fieldData?.amount || fieldData.amount <= 0) {
                                  toast({
                                    title: "Amount Required",
                                    description: "Please enter an amount before resubmitting.",
                                    variant: "destructive",
                                  });
                                  return;
                                }
                                if (!internalClientId) {
                                  toast({
                                    title: "Error",
                                    description: "Please create the client first.",
                                    variant: "destructive",
                                  });
                                  return;
                                }
                                setIsSubmitting(true);
                                try {
                                  const clientId = internalClientId || (window as any).currentClientId;
                                  const entityData = buildAllFinanceEntityData(fieldData, true);
                                  const existingProductPaymentId = productPaymentIdsRef.current["ALL_FINANCE_EMPLOYEMENT"];
                                  const payload: any = {
                                    clientId: Number(clientId),
                                    productName: "ALL_FINANCE_EMPLOYEMENT",
                                    amount: null,
                                    paymentDate: null,
                                    invoiceNo: null,
                                    remarks: null,
                                    entityData,
                                  };
                                  if (existingProductPaymentId) {
                                    payload.productPaymentId = Number(existingProductPaymentId);
                                    payload.id = Number(existingProductPaymentId);
                                  }
                                  const res = await api.post("/api/client-product-payments", payload);
                                  const returnedPayment = res.data?.data?.productPayment || res.data?.data || res.data;
                                  const newProductPaymentId = returnedPayment?.productPaymentId || returnedPayment?.id;
                                  if (newProductPaymentId) {
                                    setProductPaymentIds((prev) => ({ ...prev, "ALL_FINANCE_EMPLOYEMENT": newProductPaymentId }));
                                  }
                                  setApprovalStatus("pending");
                                  toast({
                                    title: "Resubmitted",
                                    description: "Your request has been sent again to admin/manager for approval.",
                                  });
                                } catch (error: any) {
                                  console.error("Failed to resubmit partial payment:", error);
                                  toast({
                                    title: "Error",
                                    description: error.response?.data?.message || error.message || "Failed to resubmit. Please try again.",
                                    variant: "destructive",
                                  });
                                } finally {
                                  setIsSubmitting(false);
                                }
                                return;
                              }

                              const newPartialPaymentState = !isPartialPayment;

                              if (newPartialPaymentState) {
                                if (!fieldData?.amount || fieldData.amount <= 0) {
                                  toast({
                                    title: "Amount Required",
                                    description: "Please enter an amount before submitting for partial payment approval.",
                                    variant: "destructive",
                                  });
                                  return;
                                }
                                if (!internalClientId) {
                                  toast({
                                    title: "Error",
                                    description: "Please create the client first.",
                                    variant: "destructive",
                                  });
                                  return;
                                }
                                setIsSubmitting(true);
                                try {
                                  const clientId = internalClientId || (window as any).currentClientId;
                                  const entityData = buildAllFinanceEntityData(fieldData, true);
                                  const existingProductPaymentId = productPaymentIdsRef.current["ALL_FINANCE_EMPLOYEMENT"];
                                  const payload: any = {
                                    clientId: Number(clientId),
                                    productName: "ALL_FINANCE_EMPLOYEMENT",
                                    amount: null,
                                    paymentDate: null,
                                    invoiceNo: null,
                                    remarks: null,
                                    entityData,
                                  };
                                  if (existingProductPaymentId) {
                                    payload.productPaymentId = Number(existingProductPaymentId);
                                    payload.id = Number(existingProductPaymentId);
                                  }
                                  const res = await api.post("/api/client-product-payments", payload);
                                  const returnedPayment = res.data?.data?.productPayment || res.data?.data || res.data;
                                  const newProductPaymentId = returnedPayment?.productPaymentId || returnedPayment?.id;
                                  if (newProductPaymentId) {
                                    setProductPaymentIds((prev) => ({ ...prev, "ALL_FINANCE_EMPLOYEMENT": newProductPaymentId }));
                                  }
                                  setIsPartialPayment(true);
                                  setApprovalStatus("pending");
                                  toast({
                                    title: "Partial Payment Submitted",
                                    description: "Your payment request has been sent to the manager for approval.",
                                  });
                                } catch (error: any) {
                                  console.error("Failed to save partial payment:", error);
                                  toast({
                                    title: "Error",
                                    description: error.response?.data?.message || error.message || "Failed to submit partial payment. Please try again.",
                                    variant: "destructive",
                                  });
                                  return;
                                } finally {
                                  setIsSubmitting(false);
                                }
                              } else {
                                setIsPartialPayment(false);
                                setApprovalStatus(null);
                                toast({
                                  title: "Full Payment",
                                  description: "Fields are now enabled. Payment will be auto-approved when saved.",
                                });
                              }
                            }}
                            disabled={approvalStatus === "pending" || approvalStatus === "approved" || isSubmitting}
                            className={isPartialPayment
                              ? "bg-primary text-primary-foreground hover:bg-primary/90"
                              : "text-primary hover:text-primary border-primary"
                            }
                          >
                            {isPartialPayment ? "✓ Partial Payment" : "Partial Payment"}
                          </Button>
                          {approvalStatus === "pending" && (
                            <span className="text-xs px-2 py-1 bg-yellow-50 text-yellow-700 rounded">
                              Pending Manager Approval
                            </span>
                          )}
                          {approvalStatus === "approved" && approverName && (
                            <span className="text-xs px-2 py-1 bg-green-50 text-green-700 rounded">
                              Approved by {approverName}
                            </span>
                          )}
                          {approvalStatus === "approved" && !approverName && (
                            <span className="text-xs px-2 py-1 bg-green-50 text-green-700 rounded">
                              Approved
                            </span>
                          )}
                          {approvalStatus === "rejected" && (
                            <span className="text-xs px-2 py-1 bg-red-50 text-red-700 rounded">
                              Rejected
                            </span>
                          )}
                        </>
                      )}
                      {allowMultiple && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleAddAnotherInstance(product.id)}
                          className="text-primary hover:text-primary"
                          title="Add another instance"
                        >
                          <Plus className="w-4 h-4 mr-1" />
                          Add
                        </Button>
                      )}
                      {hasSavedPayment ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteProductPaymentClick(product.id, product.instanceKey)}
                          className="text-destructive hover:text-destructive hover:bg-destructive/10 h-8"
                        >
                          <Trash2 className="w-4 h-4 mr-1" />
                          Delete
                        </Button>
                      ) : (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveProduct(product.instanceKey)}
                          className="text-destructive hover:text-destructive"
                        >
                          <X className="w-4 h-4 mr-1" />
                          Remove
                        </Button>
                      )}
                    </div>
                  </div>
                  <div className="pt-2 border-t">
                    {renderProductForm(product, product.instanceKey)}
                  </div>
                </div>
              );
            })}
          </div>
        );
      })()}

      {addedProducts.length === 0 && !showProductSearch && (
        <div className="text-center py-8 text-muted-foreground">
          No products added yet. Click "Add Products" to get started.
        </div>
      )}
    </div>
  );

  return (
    <PageWrapper
      title={isEditMode ? "Edit Client" : "Add New Client"}
      breadcrumbs={[
        { label: "Clients", href: "/clients" },
        { label: isEditMode ? "Edit Client" : "New Client" },
      ]}
    >
      <div className="max-w-4xl mx-auto pb-12 space-y-6">
        {/* Client Information Section */}
        <Card className="border-none shadow-md">
          <CardHeader>
            {/* <CardTitle className="text-xl font-bold">Client Information</CardTitle> */}
          </CardHeader>
          <CardContent>
            {clientInfoSection}
          </CardContent>
          <CardFooter className="flex justify-end">
            <Button
              onClick={handleCreateClient}
              disabled={isSubmitting || (isClientCreated && !isEditMode)}
              className="px-10 rounded-xl h-12 font-semibold bg-[#0061D1] hover:bg-[#0051B1] text-white disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save Client"
              )}
            </Button>
          </CardFooter>
        </Card>

        {/* Action Buttons - Show after client is created */}
        {isClientCreated && (
          <div className="flex gap-4 justify-center">
            <Button
              onClick={() => setShowServiceSection(!showServiceSection)}
              variant={showServiceSection ? "outline" : "default"}
              className="px-8 rounded-xl h-12 font-semibold"
            >
              {showServiceSection ? "− Remove Core Service" : "+ Add Core Service"}
            </Button>
            <Button
              onClick={() => setShowProductSection(!showProductSection)}
              variant={showProductSection ? "outline" : "default"}
              className="px-8 rounded-xl h-12 font-semibold"
            >
              {showProductSection ? "− Remove Product" : "+ Add Product"}
            </Button>
          </div>
        )}

        {/* Service Section - Expandable */}
        {isClientCreated && showServiceSection && (
          <Card className="border-none shadow-md">
            <CardHeader>
              <CardTitle className="text-xl font-bold">Service / Payment Details</CardTitle>
            </CardHeader>
            <CardContent>
              {serviceSection}
            </CardContent>
          </Card>
        )}

        {/* Product Section - Expandable */}
        {isClientCreated && showProductSection && (
          <Card className="border-none shadow-md">
            <CardHeader>
              <CardTitle className="text-xl font-bold">Product Details</CardTitle>
            </CardHeader>
            <CardContent>
              {productSection}
            </CardContent>
          </Card>
        )}

        {/* Combined Save Button - Appears only after client is created and at least one section is shown */}
        {isClientCreated && (showServiceSection || showProductSection) && (
          <div className="flex justify-end">
            <Button
              onClick={handleCombinedSave}
              disabled={isSubmitting}
              className="px-10 rounded-xl h-12 font-semibold bg-[#0061D1] hover:bg-[#0051B1] text-white disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save Client"
              )}
            </Button>
          </div>
        )}

        {/* Send Checklist Dialog */}
        <Dialog open={showSendChecklistDialog} onOpenChange={(open) => {
          if (!open) { setShowSendChecklistDialog(false); setSelectedChecklistToSend(null); }
        }}>
          <DialogContent className="sm:max-w-2xl max-h-[80vh] flex flex-col">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Mail className="w-5 h-5 text-primary" />
                Send Checklist to Client
              </DialogTitle>
              <DialogDescription>
                Select a checklist to send to the client via email.
                {productType && (
                  <span className="ml-1 font-medium capitalize text-foreground">
                    Showing checklists for: {productType}
                  </span>
                )}
              </DialogDescription>
            </DialogHeader>

            <div className="flex-1 overflow-y-auto space-y-3 py-2 min-h-0">
              {checklistDialogLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-6 h-6 animate-spin text-primary mr-2" />
                  <span className="text-muted-foreground">Loading checklists...</span>
                </div>
              ) : checklistDialogChecklists.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <FileText className="w-10 h-10 mx-auto mb-3 opacity-40" />
                  <p>No checklists found for this sales type.</p>
                </div>
              ) : (
                checklistDialogChecklists.map((checklist) => {
                  const isSelected = selectedChecklistToSend?.id === checklist.id;
                  return (
                    <div
                      key={checklist.id}
                      onClick={() => setSelectedChecklistToSend(checklist)}
                      className={`flex items-start gap-3 p-4 border rounded-lg cursor-pointer transition-all ${
                        isSelected
                          ? "border-primary bg-primary/5 shadow-sm"
                          : "hover:border-primary/40 hover:bg-muted/40"
                      }`}
                    >
                      <div className={`mt-0.5 w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                        isSelected ? "border-primary bg-primary" : "border-muted-foreground/40"
                      }`}>
                        {isSelected && <div className="w-2 h-2 rounded-full bg-white" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium text-sm">{checklist.title}</span>
                          {checklist.subType && (
                            <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700 font-medium">
                              {checklist.subType}
                            </span>
                          )}
                        </div>
                        {(checklist.sectionCount > 0 || checklist.itemCount > 0) && (
                          <p className="text-xs text-muted-foreground mt-1">
                            {checklist.sectionCount} section{checklist.sectionCount !== 1 ? "s" : ""} · {checklist.itemCount} item{checklist.itemCount !== 1 ? "s" : ""}
                          </p>
                        )}
                      </div>
                      {isSelected && (
                        <CheckSquare className="w-5 h-5 text-primary flex-shrink-0" />
                      )}
                    </div>
                  );
                })
              )}
            </div>

            <DialogFooter className="flex items-center justify-between gap-3 pt-2 border-t">
              <Button
                variant="outline"
                onClick={() => { setShowSendChecklistDialog(false); setSelectedChecklistToSend(null); }}
                disabled={isSendingEmail}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSendChecklistEmail}
                disabled={!selectedChecklistToSend || isSendingEmail || !internalClientId}
                className="gap-2 bg-[#0061D1] hover:bg-[#0051B1] text-white"
              >
                {isSendingEmail ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Mail className="w-4 h-4" />
                    Send Email
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Counsellor: popup when they click Delete (cannot delete) */}
        <Dialog open={showCounsellorCannotDeletePopup} onOpenChange={setShowCounsellorCannotDeletePopup}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Cannot delete</DialogTitle>
              <DialogDescription>
                Please reach out to your manager for assistance with deleting this.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button onClick={() => setShowCounsellorCannotDeletePopup(false)}>OK</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete product payment dialog: mandatory reason for admin/manager */}
        <Dialog open={deleteProductPaymentTarget != null} onOpenChange={(open) => !open && setDeleteProductPaymentTarget(null)}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Delete product payment</DialogTitle>
              <DialogDescription>
                Please provide a reason for deleting this product payment. This is required.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-2 py-2">
              <Label htmlFor="delete-product-payment-reason">Reason (required)</Label>
              <Textarea
                id="delete-product-payment-reason"
                placeholder="Enter reason for deletion..."
                value={deleteProductPaymentReason}
                onChange={(e) => setDeleteProductPaymentReason(e.target.value)}
                rows={3}
                className="resize-none"
              />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDeleteProductPaymentTarget(null)}>
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleDeleteProductPaymentConfirm}
                disabled={!deleteProductPaymentReason.trim()}
              >
                Delete
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete payment dialog: mandatory reason for admin/manager */}
        <Dialog open={deletePaymentSection != null} onOpenChange={(open) => !open && setDeletePaymentSection(null)}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Delete payment</DialogTitle>
              <DialogDescription>
                Please provide a reason for deleting this payment. Admin and manager can delete after entering the reason.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-2 py-2">
              <Label htmlFor="delete-payment-reason">Reason (required)</Label>
              <Textarea
                id="delete-payment-reason"
                placeholder="e.g. initial deleted because it was added without core service"
                value={deletePaymentReason}
                onChange={(e) => setDeletePaymentReason(e.target.value)}
                rows={3}
                className="resize-none"
              />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDeletePaymentSection(null)}>
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleDeletePaymentConfirm}
                disabled={!deletePaymentReason.trim()}
              >
                Delete
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </PageWrapper>
  );
}

