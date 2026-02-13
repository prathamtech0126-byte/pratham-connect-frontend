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
import { useState, useEffect, useRef, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Loader2, Search, X, Plus } from "lucide-react";
import { Input } from "@/components/ui/input";
import api from "@/lib/api";

// --- Schema Definitions ---

const financialEntrySchema = z.object({
  amount: z.number().min(0, "Amount cannot be negative").optional(),
  date: z.string().optional(),
  invoiceNo: z.string().optional(),
  remarks: z.string().optional(),
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

  // Step 2: Consultancy Payment
  totalPayment: z
    .number({
      required_error: "Total payment is required",
    })
    .min(0.01, "Total payment must be greater than 0"),

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

  // Discount and Extra Payment fields
  showDiscount: z.boolean().optional(),
  discount: z.number().optional(),
  discountRemarks: z.string().optional(),
  showExtraPayment: z.boolean().optional(),
  extraPayment: z.number().optional(),
  extraPaymentRemarks: z.string().optional(),

  // Counsellor ID
  counsellorId: z.number().optional(),

  // Step 3: Unified Product Fields (Combines all spouse, visitor, and student fields)
  productFields: productFieldsSchema.optional(),
}).superRefine((data, ctx) => {
  // Calculate sum of all payment amounts
  const initialAmount = data.initialPayment?.amount || 0;
  const beforeVisaAmount = data.beforeVisaPayment?.amount || 0;
  const afterVisaAmount = data.afterVisaPayment?.amount || 0;
  const totalPayments = initialAmount + beforeVisaAmount + afterVisaAmount;

  // Check if sum exceeds total payment
  if (data.totalPayment && totalPayments > data.totalPayment) {
    const errorMessage = `Total payments (${totalPayments.toLocaleString()}) exceed total payment (${data.totalPayment.toLocaleString()})`;

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
      console.log("[ClientForm] All Finance approved event received:", data);

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
      console.log("[ClientForm] All Finance rejected event received:", data);

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

    console.log("[ClientForm] Socket event listeners registered for allFinance events");

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
      totalPayment: 0,
      initialPayment: { amount: 0, date: "", invoiceNo: "", remarks: "" },
      beforeVisaPayment: { amount: 0, date: "", invoiceNo: "", remarks: "" },
      afterVisaPayment: { amount: 0, date: "", invoiceNo: "", remarks: "" },
      amountPending: 0,
      showInitialPayment: false,
      showBeforeVisaPayment: false,
      showAfterVisaPayment: false,
      showDiscount: false,
      discount: 0,
      discountRemarks: "",
      showExtraPayment: false,
      extraPayment: 0,
      extraPaymentRemarks: "",
      // Initialize unified productFields with all fields (combines spouse, visitor, and student)
      productFields: {
        // Common Finance & Employment Fields
        financeAndEmployment: { amount: 0, date: "", invoiceNo: "", remarks: "" },
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
  useEffect(() => {
    if (watchedLeadSource) {
      console.log('[ClientForm] ✅ Watched leadSource value:', watchedLeadSource);
    } else if (isEditMode) {
      console.log('[ClientForm] ⚠️ Watched leadSource is EMPTY in edit mode');
    }
  }, [watchedLeadSource, isEditMode]);

  // Update leadSource when leadTypes are loaded and we have clientData with leadTypeId
  useEffect(() => {
    console.log('[ClientForm] 🔍 useEffect triggered. clientDataToLoad:', !!clientDataToLoad, 'leadTypes count:', leadTypes.length);

    if (!clientDataToLoad || leadTypes.length === 0) {
      console.log('[ClientForm] useEffect: Skipping leadSource mapping. clientDataToLoad:', !!clientDataToLoad, 'leadTypes count:', leadTypes.length);
      return;
    }

    // Check if we have leadTypeId in the original client data
    const leadTypeId = (clientDataToLoad as any).originalLeadTypeId;

    console.log('[ClientForm] useEffect: Checking leadSource mapping. leadTypeId:', leadTypeId, 'leadTypes count:', leadTypes.length);

    if (leadTypeId) {
      const leadType = leadTypes.find((lt: any) => {
        const ltId = lt.id || lt.leadTypeId;
        return ltId === leadTypeId || String(ltId) === String(leadTypeId);
      });

      if (leadType?.leadType) {
        const currentLeadSource = form.getValues("leadSource");
        if (currentLeadSource !== leadType.leadType) {
          console.log('[ClientForm] ✅ Setting leadSource from leadTypeId:', leadTypeId, '->', leadType.leadType);
          form.setValue("leadSource", leadType.leadType, {
            shouldValidate: false,
            shouldDirty: false,
            shouldTouch: true
          });
          // Verify it was set
          setTimeout(() => {
            const verifyValue = form.getValues("leadSource");
            console.log('[ClientForm] ✅ Verified leadSource after setting:', verifyValue);
          }, 100);
        } else {
          console.log('[ClientForm] LeadSource already set correctly:', currentLeadSource);
        }
      } else {
        console.warn('[ClientForm] ⚠️ Lead type not found for leadTypeId:', leadTypeId, 'Available leadTypes:', leadTypes.map((lt: any) => ({ id: lt.id || lt.leadTypeId, leadType: lt.leadType })));
      }
    } else {
      console.log('[ClientForm] No leadTypeId found in clientDataToLoad. clientDataToLoad keys:', Object.keys(clientDataToLoad || {}));
      // Also check if leadSource is already set in clientDataToLoad
      if (clientDataToLoad.leadSource) {
        const currentLeadSource = form.getValues("leadSource");
        if (currentLeadSource !== clientDataToLoad.leadSource) {
          console.log('[ClientForm] ✅ Setting leadSource from clientDataToLoad.leadSource:', clientDataToLoad.leadSource);
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
        console.log('[ClientForm] ✅ Setting salesType from saleTypeId:', saleTypeId, '->', saleTypeObj.saleType);
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
        console.log('🔍 [ClientForm] ========== CLIENT DATA RECEIVED ==========');
        console.log('[ClientForm] Full clientData object:', clientData);
        console.log('[ClientForm] leadTypeId (direct):', clientData.leadTypeId);
        console.log('[ClientForm] leadType (object):', clientData.leadType);
        console.log('[ClientForm] leadSource (direct):', clientData.leadSource);
        console.log('[ClientForm] All clientData keys:', Object.keys(clientData || {}));
        console.log('[ClientForm] leadTypes loaded:', leadTypes.length, 'types');
        console.log('[ClientForm] leadTypes:', leadTypes);

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

          // Store existing product payment IDs for update operations
          const existingProductPaymentIds: Record<string, number> = {};
          if (clientData.productPayments && Array.isArray(clientData.productPayments)) {
            clientData.productPayments.forEach((pp: any, index: number) => {
              if (pp.productPaymentId) {
                existingProductPaymentIds[pp.productName] = pp.productPaymentId;
              } else {
                console.warn(`⚠ Product payment ${pp.productName} has no productPaymentId:`, pp);
              }
            });
          } else {
            console.warn("⚠ No productPayments found in clientData:", clientData);
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

          console.log('🔍 [ClientForm] ========== LEAD SOURCE MAPPING ==========');
          console.log('[ClientForm] Extracted leadTypeId:', leadTypeId);
          console.log('[ClientForm] clientData.leadTypeId:', clientData.leadTypeId);
          console.log('[ClientForm] clientData.leadType:', clientData.leadType);
          console.log('[ClientForm] clientData.leadSource:', clientData.leadSource);
          console.log('[ClientForm] leadTypes available:', leadTypes.length);
          console.log('[ClientForm] leadTypes array:', leadTypes.map((lt: any) => ({ id: lt.id, leadTypeId: lt.leadTypeId, leadType: lt.leadType })));

          let leadSourceValue = "";

          // Strategy 1: If we have leadTypeId and leadTypes are loaded, map it
          if (leadTypeId && leadTypes.length > 0) {
            console.log('[ClientForm] Attempting to map leadTypeId:', leadTypeId, 'with', leadTypes.length, 'available leadTypes');
            const leadType = leadTypes.find((lt: any) => {
              const ltId = lt.id || lt.leadTypeId;
              const matches = ltId === leadTypeId || String(ltId) === String(leadTypeId);
              if (matches) {
                console.log('[ClientForm] ✅ Found matching leadType:', { id: ltId, leadType: lt.leadType });
              }
              return matches;
            });

            if (leadType?.leadType) {
              leadSourceValue = leadType.leadType;
              console.log('[ClientForm] ✅ Mapped leadTypeId to leadSource:', leadTypeId, '->', leadSourceValue);
            } else {
              console.warn('[ClientForm] ⚠️ leadTypeId found but no matching leadType in array. leadTypeId:', leadTypeId);
              console.warn('[ClientForm] Available leadType IDs:', leadTypes.map((lt: any) => lt.id || lt.leadTypeId));
            }
          }

          // Strategy 2: Use leadSource directly from API if available
          if (!leadSourceValue && clientData.leadSource) {
            leadSourceValue = clientData.leadSource;
            console.log('[ClientForm] ✅ Using leadSource directly from clientData:', leadSourceValue);
          }

          // Strategy 3: Extract from leadType object if it's a string or has leadType property
          if (!leadSourceValue && clientData.leadType) {
            if (typeof clientData.leadType === 'string') {
              leadSourceValue = clientData.leadType;
              console.log('[ClientForm] ✅ Using leadType as string:', leadSourceValue);
            } else if (typeof clientData.leadType === 'object' && clientData.leadType.leadType) {
              leadSourceValue = clientData.leadType.leadType;
              console.log('[ClientForm] ✅ Using leadType.leadType from object:', leadSourceValue);
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
            showDiscount: false,
            discount: 0,
            discountRemarks: "",
            showExtraPayment: false,
            extraPayment: 0,
            extraPaymentRemarks: "",
            // Map product fields to unified structure
            productFields: mergeProductFields(defaultValues.productFields || {}, mappedProductFields),
          };

          // Store the form data to load - this will trigger the useEffect to set values
          setClientDataToLoad(formData);

          // Reset the entire form with all data
          reset(formData);
          setIsPartialPayment(false); // Reset partial payment state
          setApprovalStatus(null); // Reset approval status
          setApproverName(null); // Reset approver name

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
                        console.log('[ClientForm] ✅ Loaded Forex Card data:', { isActivated: isActivatedValue, date: entity.cardDate, remarks: entity.remarks });
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
                        console.log(`[ClientForm] ✅ Loaded ${productId} data:`, { amount: pp.amount, date: pp.paymentDate, invoiceNo: pp.invoiceNo, remarks: pp.remarks });
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
            console.log('[ClientForm] ✅ Immediately setting leadSource after reset:', formData.leadSource);
            setTimeout(() => {
              setValue("leadSource", formData.leadSource, { shouldValidate: false, shouldDirty: false, shouldTouch: true });
              const verify = form.getValues("leadSource");
              console.log('[ClientForm] ✅ Verified immediate leadSource set:', verify);
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
                console.log('[ClientForm] ✅ Set salesType from saleTypeId in Promise.resolve:', saleTypeObj.saleType);
              }
            }
            if (formData.leadSource) {
              setValue("leadSource", formData.leadSource, { shouldValidate: false, shouldDirty: false });
              console.log('[ClientForm] ✅ Set leadSource immediately in Promise.resolve:', formData.leadSource);
            } else if (currentLeadTypeId && leadTypes.length > 0) {
              // If leadSource is empty but we have leadTypeId and leadTypes are loaded, map it now
              const leadType = leadTypes.find((lt: any) => {
                const ltId = lt.id || lt.leadTypeId;
                return ltId === currentLeadTypeId || String(ltId) === String(currentLeadTypeId);
              });
              if (leadType?.leadType) {
                setValue("leadSource", leadType.leadType, { shouldValidate: false, shouldDirty: false });
                console.log('[ClientForm] ✅ Set leadSource from leadTypeId in Promise.resolve:', leadType.leadType);
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
          console.log('[ClientList] Set leadSource from clientDataToLoad:', clientDataToLoad.leadSource);
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

  // Update Total Payment when Sales Type changes (only if not in edit mode or when manually changed)
  useEffect(() => {
    if (salesType && !isEditMode) {
      const selectedTypeData = allSaleTypes.find(
        (t) => t.saleType === salesType,
      );
      if (selectedTypeData && selectedTypeData.amount) {
        setValue("totalPayment", Number(selectedTypeData.amount));
      }
    }
  }, [salesType, allSaleTypes, setValue, isEditMode]);

  // Auto-calc pending amount
  const totalPayment = useWatch({ control, name: "totalPayment" }) || 0;
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
    if (totalPayment > 0 && totalPayments <= totalPayment) {
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


  // Check if service payment data exists
  const hasServiceData = useMemo(() => {
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
    return hasInitial || hasBeforeVisa || hasAfterVisa;
  }, [initialPayment, beforeVisaPayment, afterVisaPayment]);

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

  // We can just display this or set it in form state. Setting in form state is better for submission.
  // Using a useEffect to keep it in sync might cause re-renders but is safe for now.
  // Alternatively, just calculate it on render for display and on submit for data.
  // Let's set it in form so the input updates visually if we want it to be readonly.

  const productType = getProductType(salesType, selectedProductType);

  // Handle Save Service (Payment) data
  const handleSaveService = async () => {
    if (!internalClientId) {
      toast({
        title: "Error",
        description: "Please create the client first.",
        variant: "destructive",
      });
      return;
    }

    if (isSubmitting || requestInFlightRef.current) {
      return;
    }

    const isValid = await trigger(["salesType", "totalPayment"] as any); // salesType is now required in Step 2
    if (!isValid) {
      // Don't show toast - errors are already displayed below fields by React Hook Form
      return;
    }

    const data = form.getValues();

    // Validate that payment amounts don't exceed total payment
    const initialAmount = data.initialPayment?.amount || 0;
    const beforeVisaAmount = data.beforeVisaPayment?.amount || 0;
    const afterVisaAmount = data.afterVisaPayment?.amount || 0;
    const totalPayments = initialAmount + beforeVisaAmount + afterVisaAmount;

    // Clear previous payment amount errors first
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

    // Check if sum exceeds total payment
    if (data.totalPayment && totalPayments > data.totalPayment) {
      const errorMessage = `Total payments (${totalPayments.toLocaleString()}) exceed total payment (${data.totalPayment.toLocaleString()})`;

      // Set errors ONLY on fields that have amounts entered (not empty)
      if (data.showInitialPayment && initialAmount > 0) {
        setError("initialPayment.amount" as any, {
          type: "manual",
          message: errorMessage,
        });
        setFieldErrors((prev) => ({
          ...prev,
          "initialPayment.amount": errorMessage,
        }));
      }
      if (data.showBeforeVisaPayment && beforeVisaAmount > 0) {
        setError("beforeVisaPayment.amount" as any, {
          type: "manual",
          message: errorMessage,
        });
        setFieldErrors((prev) => ({
          ...prev,
          "beforeVisaPayment.amount": errorMessage,
        }));
      }
      if (data.showAfterVisaPayment && afterVisaAmount > 0) {
        setError("afterVisaPayment.amount" as any, {
          type: "manual",
          message: errorMessage,
        });
        setFieldErrors((prev) => ({
          ...prev,
          "afterVisaPayment.amount": errorMessage,
        }));
      }

      // Don't proceed with save
      return;
    }

    setIsSubmitting(true);
    requestInFlightRef.current = true;
    const selectedTypeData = allSaleTypes.find(
      (t) => t.saleType === data.salesType,
    );
    const currentTotalPaymentVal =
      data.totalPayment || selectedTypeData?.amount || 0;

    // Get saleTypeId from selected salesType
    const selectedTypeDataForPayment = allSaleTypes.find(
      (t) => t.saleType === data.salesType,
    );
    const saleTypeId = selectedTypeDataForPayment?.id;

    try {
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
            saleTypeId: saleTypeId, // ✅ Add saleTypeId from salesType
            totalPayment: String(currentTotalPaymentVal),
            stage: item.stage,
            amount: String(paymentData.amount),
            paymentDate: paymentData.date,
            invoiceNo: paymentData.invoiceNo,
            remarks: paymentData.remarks,
          };

          if (existingId) {
            payload.paymentId = existingId;
          }

          try {
            const res = await api.post("/api/client-payments", payload);
            const returnedPayment =
              res.data?.data?.payment || res.data?.data || res.data;
            const newPaymentId =
              returnedPayment?.paymentId || returnedPayment?.id;

            if (newPaymentId) {
              setPaymentIds((prev) => ({
                ...prev,
                [item.key]: newPaymentId,
              }));
            }
            return { success: true, item, res };
          } catch (error: any) {
            // Return error with the payment stage info so we can map it to the correct field
            return { success: false, item, error };
          }
        });

      if (paymentPromises.length > 0) {
        const results = await Promise.all(paymentPromises);

        // Check for errors and map them to specific fields
        const hasErrors = results.some(r => !r.success);
        if (hasErrors) {
          // Clear previous errors
          setFieldErrors({});

          results.forEach((result) => {
            if (!result.success && result.error) {
              const error = result.error;
              const paymentKey = result.item.key; // "initialPayment", "beforeVisaPayment", or "afterVisaPayment"

              // Parse the error message
              const errorMessage = error.response?.data?.message || error.message || "";

              // Check if it's an invoice number error
              if (errorMessage.toLowerCase().includes("invoice") || errorMessage.toLowerCase().includes("invoice number")) {
                // Map to the specific payment field's invoiceNo
                const fieldName = `${paymentKey}.invoiceNo` as any;
                setError(fieldName, {
                  type: "server",
                  message: errorMessage,
                });
                setFieldErrors((prev) => ({
                  ...prev,
                  [fieldName]: errorMessage,
                }));
              } else {
                // For other errors, try to parse and map them
                const apiErrors = parseApiError(error);
                Object.keys(apiErrors).forEach((fieldName) => {
                  // If the error doesn't specify a payment stage, map it to the current payment stage
                  if (!fieldName.includes("Payment")) {
                    const mappedFieldName = `${paymentKey}.${fieldName}` as any;
                    setError(mappedFieldName, {
                      type: "server",
                      message: apiErrors[fieldName],
                    });
                    setFieldErrors((prev) => ({
                      ...prev,
                      [mappedFieldName]: apiErrors[fieldName],
                    }));
                  } else {
                    setError(fieldName as any, {
                      type: "server",
                      message: apiErrors[fieldName],
                    });
                    setFieldErrors((prev) => ({
                      ...prev,
                      [fieldName]: apiErrors[fieldName],
                    }));
                  }
                });

                // If no field-specific errors found, show on the payment field itself
                if (Object.keys(apiErrors).length === 0) {
                  const fieldName = `${paymentKey}.amount` as any;
                  setError(fieldName, {
                    type: "server",
                    message: errorMessage,
                  });
                }
              }
            }
          });

          // Don't show success toast if there are errors
          return;
        }

        // All succeeded
        toast({
          title: "Success",
          description: "Service payment details saved successfully!",
        });
        // Redirect to All Clients after saving core service (full nav so it always works)
        setTimeout(() => { window.location.href = "/clients"; }, 150);
      } else {
        toast({
          title: "Info",
          description: "No payment data to save.",
        });
      }
    } catch (error: any) {
      console.error("Failed to save service payments", error);

      // This catch block handles unexpected errors (not from individual payment promises)
      // Parse API errors and set them on form fields
      const apiErrors = parseApiError(error);

      // Clear previous errors
      setFieldErrors({});

      // Set errors on form fields using React Hook Form's setError
      Object.keys(apiErrors).forEach((fieldName) => {
        setError(fieldName as any, {
          type: "server",
          message: apiErrors[fieldName],
        });
        setFieldErrors((prev) => ({
          ...prev,
          [fieldName]: apiErrors[fieldName],
        }));
      });

      // Only show toast if no field-specific errors were found
      if (Object.keys(apiErrors).length === 0) {
        toast({
          title: "Error",
          description: error.response?.data?.message || error.message || "Failed to save payments. Please try again.",
          variant: "destructive",
        });
      }
    } finally {
      setIsSubmitting(false);
      requestInFlightRef.current = false;
    }
  };

  // Handle Save Product (Product Payments) data
  const handleSaveProduct = async () => {
    if (!internalClientId) {
      toast({
        title: "Error",
        description: "Please create the client first.",
        variant: "destructive",
      });
      return;
    }

    if (isSubmitting || requestInFlightRef.current) {
      return;
    }

    setIsSubmitting(true);
    requestInFlightRef.current = true;

    try {
      const data = form.getValues();
      const clientId = internalClientId || (window as any).currentClientId;

      if (!clientId) {
        toast({
          title: "Error",
          description: "Client ID not found. Please complete Step 1 first.",
          variant: "destructive",
        });
        return;
      }

      // Process Product Payments
      const productType = getProductType(
        data.salesType,
        data.selectedProductType,
      );
      const productFields = data.productFields as any;

      if (!productFields) {
        toast({
          title: "Info",
          description: "No product data to save.",
        });
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

        // Check for existing product payment ID
        const existingProductPaymentId = productPaymentIdsRef.current[productName];

        // For ALL_FINANCE_EMPLOYEMENT, top-level fields should be null, all data in entityData
        const isAllFinance = productName === "ALL_FINANCE_EMPLOYEMENT";

        const payload: any = {
          clientId: Number(clientId),
          productName,
          amount: isAllFinance ? null : String(amount),
          invoiceNo: isAllFinance ? null : String(invoiceNo || ""),
          paymentDate: isAllFinance ? null : (
            entityData.date ||
            entityData.feeDate || // For FOREX_FEES and TUTION_FEES
            entityData.extensionDate ||
            entityData.startDate ||
            entityData.accountDate ||
            entityData.sellDate || // For OTHER_NEW_SELL
            new Date().toISOString().split("T")[0]
          ),
          remarks: isAllFinance ? null : String(entityData.remarks || entityData.remark || ""),
          entityData,
        };

        // If we have an existing product payment ID, include it for update
        if (existingProductPaymentId) {
          payload.productPaymentId = Number(existingProductPaymentId);
          payload.id = Number(existingProductPaymentId);
        }

        return api.post("/api/client-product-payments", payload).then((res) => {
          // Update productPaymentIds if we get a new ID back
          const returnedPayment = res.data?.data?.productPayment || res.data?.data || res.data;
          const newProductPaymentId = returnedPayment?.productPaymentId || returnedPayment?.id;

          if (newProductPaymentId) {
            setProductPaymentIds((prev) => ({
              ...prev,
              [productName]: newProductPaymentId,
            }));
          }
          return res;
        });
      };

      // Master-only fields mapping
      const masterOnlyMappings = [
        {
          field: "financeAndEmployment",
          productName: "ALL_FINANCE_EMPLOYEMENT",
        },
        {
          field: "indianSideEmployment",
          productName: "INDIAN_SIDE_EMPLOYEMENT",
        },
        { field: "nocLevelJob", productName: "NOC_LEVEL_JOB_ARRANGEMENT" },
        { field: "lawyerRefuge", productName: "LAWYER_REFUSAL_CHARGE" },
        {
          field: "onshorePartTime",
          productName: "ONSHORE_PART_TIME_EMPLOYEMENT",
        },
        // trvExtension is now handled separately for multiple instances
        {
          field: "marriagePhoto",
          productName: "MARRIAGE_PHOTO_FOR_COURT_MARRIAGE",
        },
        {
          field: "marriageCertificate",
          productName: "MARRIAGE_PHOTO_CERTIFICATE",
        },
        {
          field: "relationshipAffidavit",
          productName: "RECENTE_MARRIAGE_RELATIONSHIP_AFFIDAVIT",
        },
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
          // For financeAndEmployment, include partialPayment in entityData
          // For ALL_FINANCE_EMPLOYEMENT, entityData should have: amount, paymentDate, invoiceNo, remarks, partialPayment
          let entityDataToSend = { ...fieldData };
          if (field === "financeAndEmployment" && productName === "ALL_FINANCE_EMPLOYEMENT") {
            entityDataToSend = {
              amount: fieldData.amount,
              paymentDate: fieldData.date || fieldData.paymentDate || new Date().toISOString().split("T")[0],
              invoiceNo: fieldData.invoiceNo || "",
              remarks: fieldData.remarks || "",
              partialPayment: isPartialPayment,
            };
          } else {
            // For financialEntry products, ensure proper entityData structure
            entityDataToSend = {
              amount: Number(fieldData.amount || 0),
              date: fieldData.date || "",
              invoiceNo: fieldData.invoiceNo || "",
              remarks: fieldData.remarks || "",
            };
          }

          productPaymentPromises.push(
            createOrUpdateProductPayment(
              productName,
              entityDataToSend,
              fieldData.amount,
              fieldData.invoiceNo,
            ),
          );
        }
      });

      // Other Product (from product list) - add all instances to newServices
      if (productFields.otherProduct && typeof productFields.otherProduct === 'object') {
        if (!productFields.newServices) {
          productFields.newServices = [];
        }
        // Iterate through all otherProduct instances
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
              // ✅ Preserve productPaymentId for updates
              productPaymentId: instance.productPaymentId || null,
              // ✅ Store instanceKey temporarily to map back after save
              _instanceKey: instanceKey,
            });
          }
        });
      }

      // TRV Extension (from product list) - handle multiple instances
      if (productFields.trvExtension && typeof productFields.trvExtension === 'object') {
        // Check if it's an object with instance keys (not a single instance)
        const hasInstanceKeys = Object.keys(productFields.trvExtension).some(key =>
          key.includes('trvExtension-') || key.includes('-')
        );

        if (hasInstanceKeys) {
          // Multiple instances - iterate through all
          Object.keys(productFields.trvExtension).forEach((instanceKey) => {
            const instance = (productFields.trvExtension as any)[instanceKey];
            if (instance && (instance.amount > 0 || instance.type)) {
              const entityData: any = {
                type: instance.type || "",
                amount: Number(instance.amount || 0),
                extensionDate: instance.date || "", // ✅ Fixed: date → extensionDate
                invoiceNo: instance.invoiceNo || "",
                remarks: instance.remarks || "", // ✅ Fixed: remark → remarks
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

              // ✅ Include productPaymentId for updates (upsert logic)
              if (instance.productPaymentId) {
                payload.productPaymentId = Number(instance.productPaymentId);
                console.log('[ClientForm] ✅ Updating TRV Extension with productPaymentId:', instance.productPaymentId, 'invoiceNo:', instance.invoiceNo);
              } else {
                console.log('[ClientForm] ➕ Creating new TRV Extension record, invoiceNo:', instance.invoiceNo);
              }

              productPaymentPromises.push(
                api.post("/api/client-product-payments", payload).then((res) => {
                  // ✅ Update form field with returned productPaymentId after save
                  const returnedPayment = res.data?.data?.productPayment || res.data?.data || res.data;
                  const newProductPaymentId = returnedPayment?.productPaymentId || returnedPayment?.id;
                  if (newProductPaymentId) {
                    setValue(`productFields.trvExtension.${instanceKey}.productPaymentId` as any, Number(newProductPaymentId), { shouldValidate: false, shouldDirty: false });
                    console.log('[ClientForm] ✅ Updated TRV Extension form field with productPaymentId:', newProductPaymentId, 'instanceKey:', instanceKey);
                  }
                  return res;
                })
              );
            }
          });
        } else if (productFields.trvExtension.type || productFields.trvExtension.amount > 0) {
          // Single instance (backward compatibility)
          const entityData: any = {
            type: productFields.trvExtension.type || "",
            amount: Number(productFields.trvExtension.amount || 0),
            extensionDate: productFields.trvExtension.date || "", // ✅ Fixed: date → extensionDate
            invoiceNo: productFields.trvExtension.invoiceNo || "",
            remarks: productFields.trvExtension.remarks || "", // ✅ Fixed: remark → remarks
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

          // ✅ Include productPaymentId for updates (upsert logic)
          if (productFields.trvExtension.productPaymentId) {
            payload.productPaymentId = Number(productFields.trvExtension.productPaymentId);
            console.log('[ClientForm] ✅ Updating TRV Extension (single instance, handleSaveProduct) with productPaymentId:', productFields.trvExtension.productPaymentId, 'invoiceNo:', productFields.trvExtension.invoiceNo);
          } else {
            console.log('[ClientForm] ➕ Creating new TRV Extension record (single instance, handleSaveProduct), invoiceNo:', productFields.trvExtension.invoiceNo);
          }

          productPaymentPromises.push(
            api.post("/api/client-product-payments", payload)
          );
        }
      }

      // New Services (Extra Other) - supports both create and update
      if (
        productFields.newServices &&
        Array.isArray(productFields.newServices)
      ) {
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

            // ✅ Include productPaymentId for updates (upsert logic)
            if (service.productPaymentId) {
              payload.productPaymentId = Number(service.productPaymentId);
              console.log('[ClientForm] ✅ Updating OTHER_NEW_SELL (handleSaveProduct) with productPaymentId:', service.productPaymentId, 'invoiceNo:', service.invoiceNo);
            } else {
              console.log('[ClientForm] ➕ Creating new OTHER_NEW_SELL record (handleSaveProduct), invoiceNo:', service.invoiceNo);
            }

            const instanceKey = service._instanceKey; // Get the instanceKey if it exists (from otherProduct)
            productPaymentPromises.push(
              api.post("/api/client-product-payments", payload).then((res) => {
                // ✅ Update form field with returned productPaymentId after save
                const returnedPayment = res.data?.data?.productPayment || res.data?.data || res.data;
                const newProductPaymentId = returnedPayment?.productPaymentId || returnedPayment?.id;
                if (newProductPaymentId && instanceKey) {
                  // Update the otherProduct form field if this came from otherProduct
                  setValue(`productFields.otherProduct.${instanceKey}.productPaymentId` as any, Number(newProductPaymentId), { shouldValidate: false, shouldDirty: false });
                  console.log('[ClientForm] ✅ Updated Other Product form field with productPaymentId:', newProductPaymentId, 'instanceKey:', instanceKey);
                }
                return res;
              })
            );
          }
        });
      }

      // SIM Card
      if (
        productFields.simCard &&
        (productFields.simCard.isActivated || productFields.simCard.plan)
      ) {
        const simCardEntityData = {
          activatedStatus: productFields.simCard.isActivated === "Yes" ? true : productFields.simCard.isActivated === "No" ? false : null,
          simcardPlan: productFields.simCard.plan || null,
          simCardGivingDate: productFields.simCard.date || null,
          simActivationDate: productFields.simCard.startDate || null,
          remarks: productFields.simCard.remarks || null,
        };
        productPaymentPromises.push(
          createOrUpdateProductPayment("SIM_CARD_ACTIVATION", simCardEntityData),
        );
      }

      // Air Ticket
      if (
        productFields.airTicket &&
        (productFields.airTicket.amount > 0 ||
          productFields.airTicket.isBooked)
      ) {
        const airTicketEntityData = {
          isTicketBooked: productFields.airTicket.isBooked === "Yes" ? true : productFields.airTicket.isBooked === "No" ? false : null,
          amount: productFields.airTicket.amount || 0,
          airTicketNumber: productFields.airTicket.invoiceNo || null,
          ticketDate: productFields.airTicket.date || null,
          remarks: productFields.airTicket.remarks || null,
        };
        productPaymentPromises.push(
          createOrUpdateProductPayment(
            "AIR_TICKET",
            airTicketEntityData,
            productFields.airTicket.amount,
            productFields.airTicket.invoiceNo,
          ),
        );
      }

      // Insurance
      if (productFields.insurance && productFields.insurance.amount > 0) {
        const insuranceEntityData = {
          amount: productFields.insurance.amount || 0,
          policyNumber: productFields.insurance.insuranceNo || productFields.insurance.policyNo || null,
          insuranceDate: productFields.insurance.date || null,
          remarks: productFields.insurance.remarks || null,
        };
        productPaymentPromises.push(
          createOrUpdateProductPayment(
            "INSURANCE",
            insuranceEntityData,
            productFields.insurance.amount,
          ),
        );
      }

      // My Beacon / Beacon Account
      const beaconData =
        productFields.myBeacon || productFields.beaconAccount;
      if (
        beaconData &&
        (beaconData.fundingAmount > 0 || beaconData.cadAmount > 0)
      ) {
        const fundingAmountValue = beaconData.fundingAmount || beaconData.cadAmount || 0;
        const beaconEntityData = {
          openingDate: beaconData.openingDate || null,
          fundingDate: beaconData.fundingDate || null,
          amount: fundingAmountValue,
          remarks: beaconData.remarks || null,
        };

        productPaymentPromises.push(
          createOrUpdateProductPayment(
            "BEACON_ACCOUNT",
            beaconEntityData,
            fundingAmountValue,
          ),
        );
      }

      // Student Specifics
      if (
        productFields.ieltsEnrollment &&
        (productFields.ieltsEnrollment.amount > 0 ||
          productFields.ieltsEnrollment.isEnrolled)
      ) {
        const ieltsEntityData = {
          enrolledStatus: productFields.ieltsEnrollment.isEnrolled === "Yes" ? true : productFields.ieltsEnrollment.isEnrolled === "No" ? false : null,
          amount: productFields.ieltsEnrollment.amount || 0,
          enrollmentDate: productFields.ieltsEnrollment.date || null,
          remarks: productFields.ieltsEnrollment.remarks || null,
        };
        productPaymentPromises.push(
          createOrUpdateProductPayment(
            "IELTS_ENROLLMENT",
            ieltsEntityData,
            productFields.ieltsEnrollment.amount,
          ),
        );
      }
      if (productFields.loan && productFields.loan.amount > 0) {
        productPaymentPromises.push(
          createOrUpdateProductPayment(
            "LOAN_DETAILS",
            productFields.loan,
            productFields.loan.amount,
          ),
        );
      }
      if (productFields.forexFees && productFields.forexFees.amount > 0) {
        const forexFeesEntityData = {
          ...productFields.forexFees,
          side: productFields.forexFees.side || "PI",
          feeDate: productFields.forexFees.date || productFields.forexFees.feeDate || "",
        };
        delete forexFeesEntityData.date;

        productPaymentPromises.push(
          createOrUpdateProductPayment(
            "FOREX_FEES",
            forexFeesEntityData,
            productFields.forexFees.amount,
          ),
        );
      }
      if (productFields.tuitionFee && productFields.tuitionFee.status) {
        let statusValue = productFields.tuitionFee.status || "";
        statusValue = statusValue.toLowerCase();
        if (statusValue === "panding") {
          statusValue = "pending";
        }
        if (statusValue !== "paid" && statusValue !== "pending") {
          statusValue = "pending";
        }

        const tuitionFeeEntityData = {
          ...productFields.tuitionFee,
          tutionFeesStatus: statusValue,
          feeDate: productFields.tuitionFee.date || productFields.tuitionFee.feeDate || "",
        };
        delete tuitionFeeEntityData.status;
        delete tuitionFeeEntityData.date;

        productPaymentPromises.push(
          createOrUpdateProductPayment("TUTION_FEES", tuitionFeeEntityData),
        );
      }

      // Forex Card
      if (productFields.forexCard && productFields.forexCard.isActivated) {
        // Map form fields to backend fields: isActivated -> forexCardStatus, date -> cardDate
        let forexCardStatus = null;
        if (productFields.forexCard.isActivated === "Yes") {
          forexCardStatus = "Yes";
        } else if (productFields.forexCard.isActivated === "No") {
          forexCardStatus = "No";
        }
        const forexCardEntityData = {
          forexCardStatus: forexCardStatus,
          cardDate: productFields.forexCard.date || null,
          remarks: productFields.forexCard.remarks || null,
        };
        productPaymentPromises.push(
          createOrUpdateProductPayment("FOREX_CARD", forexCardEntityData),
        );
      }

      // Credit Card
      if (
        productFields.creditCard &&
        (productFields.creditCard.isActivated || productFields.creditCard.info)
      ) {
        const creditCardEntityData = {
          activatedStatus: productFields.creditCard.isActivated === "Yes" ? true : productFields.creditCard.isActivated === "No" ? false : null,
          cardPlan: productFields.creditCard.info || null,
          cardGivingDate: productFields.creditCard.date || null,
          cardActivationDate: productFields.creditCard.startDate || null,
          remarks: productFields.creditCard.remarks || null,
        };
        productPaymentPromises.push(
          createOrUpdateProductPayment("CREDIT_CARD", creditCardEntityData),
        );
      }

      if (productPaymentPromises.length > 0) {
        // Process each product payment individually to catch and map errors to specific fields
        const results = await Promise.allSettled(productPaymentPromises);

        let hasErrors = false;
        let successCount = 0;

        // Track which product payment corresponds to which field
        let promiseIndex = 0;

        // Process master-only products
        masterOnlyMappings.forEach(({ field, productName }) => {
          const fieldData = productFields[field];
          if (fieldData?.amount > 0) {
            const result = results[promiseIndex];
            promiseIndex++;

            if (result.status === 'rejected') {
              hasErrors = true;
              const error = result.reason;
              const apiErrors = parseApiError(error);

              // Map errors to specific product field
              Object.keys(apiErrors).forEach((errorKey) => {
                const fieldPath = `productFields.${field}.${errorKey}` as any;
                setError(fieldPath, {
                  type: "manual",
                  message: apiErrors[errorKey],
                });
                setFieldErrors((prev) => ({
                  ...prev,
                  [fieldPath]: apiErrors[errorKey],
                }));
              });

              // If no specific field mapping, show general error for this product
              if (Object.keys(apiErrors).length === 0) {
                const errorMessage = error.response?.data?.message || error.message || "Failed to save product payment";
                // Try to map to invoiceNo if it's an invoice error
                if (errorMessage.toLowerCase().includes("invoice")) {
                  const fieldPath = `productFields.${field}.invoiceNo` as any;
                  setError(fieldPath, {
                    type: "manual",
                    message: errorMessage,
                  });
                  setFieldErrors((prev) => ({
                    ...prev,
                    [fieldPath]: errorMessage,
                  }));
                } else {
                  // Map to amount field as fallback
                  const fieldPath = `productFields.${field}.amount` as any;
                  setError(fieldPath, {
                    type: "manual",
                    message: errorMessage,
                  });
                  setFieldErrors((prev) => ({
                    ...prev,
                    [fieldPath]: errorMessage,
                  }));
                }
              }
            } else {
              successCount++;
            }
          }
        });

        // Process TRV Extension errors
        if (productFields.trvExtension && typeof productFields.trvExtension === 'object') {
          const hasInstanceKeys = Object.keys(productFields.trvExtension).some(key =>
            key.includes('trvExtension-') || key.includes('-')
          );

          if (hasInstanceKeys) {
            Object.keys(productFields.trvExtension).forEach((instanceKey) => {
              const instance = (productFields.trvExtension as any)[instanceKey];
              if (instance && (instance.amount > 0 || instance.type)) {
                const result = results[promiseIndex];
                promiseIndex++;

                if (result.status === 'rejected') {
                  hasErrors = true;
                  const error = result.reason;
                  const apiErrors = parseApiError(error);

                  Object.keys(apiErrors).forEach((errorKey) => {
                    const fieldPath = `productFields.trvExtension.${instanceKey}.${errorKey}` as any;
                    setError(fieldPath, {
                      type: "manual",
                      message: apiErrors[errorKey],
                    });
                    setFieldErrors((prev) => ({
                      ...prev,
                      [fieldPath]: apiErrors[errorKey],
                    }));
                  });

                  if (Object.keys(apiErrors).length === 0) {
                    const errorMessage = error.response?.data?.message || error.message || "Failed to save TRV Extension";
                    if (errorMessage.toLowerCase().includes("invoice")) {
                      const fieldPath = `productFields.trvExtension.${instanceKey}.invoiceNo` as any;
                      setError(fieldPath, {
                        type: "manual",
                        message: errorMessage,
                      });
                      setFieldErrors((prev) => ({
                        ...prev,
                        [fieldPath]: errorMessage,
                      }));
                    } else {
                      const fieldPath = `productFields.trvExtension.${instanceKey}.amount` as any;
                      setError(fieldPath, {
                        type: "manual",
                        message: errorMessage,
                      });
                      setFieldErrors((prev) => ({
                        ...prev,
                        [fieldPath]: errorMessage,
                      }));
                    }
                  }
                } else {
                  successCount++;
                }
              }
            });
          } else if (productFields.trvExtension.type || productFields.trvExtension.amount > 0) {
            const result = results[promiseIndex];
            promiseIndex++;

            if (result.status === 'rejected') {
              hasErrors = true;
              const error = result.reason;
              const apiErrors = parseApiError(error);

              Object.keys(apiErrors).forEach((errorKey) => {
                const fieldPath = `productFields.trvExtension.${errorKey}` as any;
                setError(fieldPath, {
                  type: "manual",
                  message: apiErrors[errorKey],
                });
                setFieldErrors((prev) => ({
                  ...prev,
                  [fieldPath]: apiErrors[errorKey],
                }));
              });

              if (Object.keys(apiErrors).length === 0) {
                const errorMessage = error.response?.data?.message || error.message || "Failed to save TRV Extension";
                if (errorMessage.toLowerCase().includes("invoice")) {
                  setError("productFields.trvExtension.invoiceNo" as any, {
                    type: "manual",
                    message: errorMessage,
                  });
                  setFieldErrors((prev) => ({
                    ...prev,
                    "productFields.trvExtension.invoiceNo": errorMessage,
                  }));
                } else {
                  setError("productFields.trvExtension.amount" as any, {
                    type: "manual",
                    message: errorMessage,
                  });
                  setFieldErrors((prev) => ({
                    ...prev,
                    "productFields.trvExtension.amount": errorMessage,
                  }));
                }
              }
            } else {
              successCount++;
            }
          }
        }

        // Process New Services (Other Product) errors
        if (productFields.newServices && Array.isArray(productFields.newServices)) {
          productFields.newServices.forEach((service: any, serviceIndex: number) => {
            if (service.serviceName || service.amount > 0) {
              const result = results[promiseIndex];
              promiseIndex++;

              if (result.status === 'rejected') {
                hasErrors = true;
                const error = result.reason;
                const apiErrors = parseApiError(error);

                Object.keys(apiErrors).forEach((errorKey) => {
                  // Map to newServices array index
                  const fieldPath = `productFields.newServices.${serviceIndex}.${errorKey}` as any;
                  setError(fieldPath, {
                    type: "manual",
                    message: apiErrors[errorKey],
                  });
                  setFieldErrors((prev) => ({
                    ...prev,
                    [fieldPath]: apiErrors[errorKey],
                  }));
                });

                if (Object.keys(apiErrors).length === 0) {
                  const errorMessage = error.response?.data?.message || error.message || "Failed to save service";
                  if (errorMessage.toLowerCase().includes("invoice")) {
                    const fieldPath = `productFields.newServices.${serviceIndex}.invoiceNo` as any;
                    setError(fieldPath, {
                      type: "manual",
                      message: errorMessage,
                    });
                    setFieldErrors((prev) => ({
                      ...prev,
                      [fieldPath]: errorMessage,
                    }));
                  } else if (errorMessage.toLowerCase().includes("service name")) {
                    const fieldPath = `productFields.newServices.${serviceIndex}.serviceName` as any;
                    setError(fieldPath, {
                      type: "manual",
                      message: errorMessage,
                    });
                    setFieldErrors((prev) => ({
                      ...prev,
                      [fieldPath]: errorMessage,
                    }));
                  } else {
                    const fieldPath = `productFields.newServices.${serviceIndex}.amount` as any;
                    setError(fieldPath, {
                      type: "manual",
                      message: errorMessage,
                    });
                    setFieldErrors((prev) => ({
                      ...prev,
                      [fieldPath]: errorMessage,
                    }));
                  }
                }
              } else {
                successCount++;
              }
            }
          });
        }

        // Process other product payments (SIM Card, Air Ticket, Insurance, etc.)
        const otherProductFields = [
          { field: "simCard", productName: "SIM_CARD_ACTIVATION" },
          { field: "airTicket", productName: "AIR_TICKET" },
          { field: "insurance", productName: "INSURANCE" },
          { field: "beaconAccount", productName: "BEACON_ACCOUNT" },
          { field: "ieltsEnrollment", productName: "IELTS_ENROLLMENT" },
          { field: "loan", productName: "LOAN_DETAILS" },
          { field: "forexFees", productName: "FOREX_FEES" },
          { field: "tuitionFee", productName: "TUTION_FEES" },
          { field: "forexCard", productName: "FOREX_CARD" },
          { field: "creditCard", productName: "CREDIT_CARD" },
        ];

        otherProductFields.forEach(({ field, productName }) => {
          const fieldData = productFields[field];
          const shouldProcess =
            (field === "simCard" && (fieldData?.isActivated || fieldData?.plan)) ||
            (field === "airTicket" && (fieldData?.amount > 0 || fieldData?.isBooked)) ||
            (field === "insurance" && fieldData?.amount > 0) ||
            (field === "beaconAccount" && (fieldData?.fundingAmount > 0 || fieldData?.cadAmount > 0)) ||
            (field === "ieltsEnrollment" && (fieldData?.amount > 0 || fieldData?.isEnrolled)) ||
            (field === "loan" && fieldData?.amount > 0) ||
            (field === "forexFees" && fieldData?.amount > 0) ||
            (field === "tuitionFee" && fieldData?.status) ||
            (field === "forexCard" && fieldData?.isActivated) ||
            (field === "creditCard" && (fieldData?.isActivated || fieldData?.info));

          if (shouldProcess) {
            const result = results[promiseIndex];
            promiseIndex++;

            if (result.status === 'rejected') {
              hasErrors = true;
              const error = result.reason;
              const apiErrors = parseApiError(error);

              Object.keys(apiErrors).forEach((errorKey) => {
                const fieldPath = `productFields.${field}.${errorKey}` as any;
                setError(fieldPath, {
                  type: "manual",
                  message: apiErrors[errorKey],
                });
                setFieldErrors((prev) => ({
                  ...prev,
                  [fieldPath]: apiErrors[errorKey],
                }));
              });

              if (Object.keys(apiErrors).length === 0) {
                const errorMessage = error.response?.data?.message || error.message || "Failed to save product";
                // Map based on error message content
                if (errorMessage.toLowerCase().includes("invoice")) {
                  const fieldPath = `productFields.${field}.invoiceNo` as any;
                  setError(fieldPath, {
                    type: "manual",
                    message: errorMessage,
                  });
                  setFieldErrors((prev) => ({
                    ...prev,
                    [fieldPath]: errorMessage,
                  }));
                } else if (errorMessage.toLowerCase().includes("amount")) {
                  const fieldPath = `productFields.${field}.amount` as any;
                  setError(fieldPath, {
                    type: "manual",
                    message: errorMessage,
                  });
                  setFieldErrors((prev) => ({
                    ...prev,
                    [fieldPath]: errorMessage,
                  }));
                } else {
                  // Default to first field in the product
                  const defaultField = field === "simCard" ? "plan" : field === "forexCard" ? "isActivated" : field === "creditCard" ? "info" : "amount";
                  const fieldPath = `productFields.${field}.${defaultField}` as any;
                  setError(fieldPath, {
                    type: "manual",
                    message: errorMessage,
                  });
                  setFieldErrors((prev) => ({
                    ...prev,
                    [fieldPath]: errorMessage,
                  }));
                }
              }
            } else {
              successCount++;
            }
          }
        });

        if (hasErrors) {
          // Don't show toast for field-specific errors - they're shown below fields
          // Only show toast if there are unmapped errors
          if (successCount === 0) {
            toast({
              title: "Error",
              description: "Some product payments failed to save. Please check the errors below.",
              variant: "destructive",
            });
          } else {
            toast({
              title: "Partial Success",
              description: `${successCount} product(s) saved successfully. Some products had errors - please check below.`,
            });
          }
        } else if (successCount > 0) {
          toast({
            title: "Success",
            description: "Product payment details saved successfully!",
          });
          // Redirect to All Clients after saving product (full nav so it always works)
          setTimeout(() => { window.location.href = "/clients"; }, 150);
        }
      } else {
        toast({
          title: "Info",
          description: "No product data to save.",
        });
      }
    } catch (error: any) {
      console.error("Failed to save product payments", error);
      // Only show toast for unexpected errors (not field-specific)
      const apiErrors = parseApiError(error);
      if (Object.keys(apiErrors).length === 0) {
        toast({
          title: "Error",
          description: error.response?.data?.message || error.message || "Failed to save product payments. Please try again.",
          variant: "destructive",
        });
      }
    } finally {
      setIsSubmitting(false);
      requestInFlightRef.current = false;
    }
  };

  const onSubmit = async (data: FormValues) => {
    // ✅ Prevent multiple submissions - early exit if already submitting
    if (isSubmitting || requestInFlightRef.current) {
      console.log('[ClientForm] Submission already in progress, ignoring submit');
      return;
    }

    // ✅ Set submitting state immediately
    setIsSubmitting(true);
    requestInFlightRef.current = true;

    try {
      // Step 3 logic: Uses the internal state or memory
      const clientId = internalClientId || (window as any).currentClientId;

      if (!clientId) {
        console.error("Client ID not found in internalClientId or memory");
        toast({
          title: "Error",
          description: "Client ID not found. Please complete Step 1 first.",
          variant: "destructive",
        });
        return;
      }

      // 4. Process Product Payments (Step 3)
      const productType = getProductType(
        data.salesType,
        data.selectedProductType,
      );
      const productFields = data.productFields as any;

      if (productFields) {
        const productPaymentPromises: Promise<any>[] = [];

        const createOrUpdateProductPayment = (
          productName: string,
          entityData: any,
          amount: number = 0,
          invoiceNo: string = "",
        ) => {
          if (!entityData) return Promise.resolve();

          // Check for existing product payment ID
          const existingProductPaymentId = productPaymentIdsRef.current[productName];

          // For ALL_FINANCE_EMPLOYEMENT, top-level fields should be null, all data in entityData
          const isAllFinance = productName === "ALL_FINANCE_EMPLOYEMENT";

          const payload: any = {
            clientId: Number(clientId),
            productName,
            amount: isAllFinance ? null : String(amount),
            invoiceNo: isAllFinance ? null : String(invoiceNo || ""),
            paymentDate: isAllFinance ? null : (
              entityData.date ||
              entityData.feeDate || // For FOREX_FEES and TUTION_FEES
              entityData.extensionDate ||
              entityData.startDate ||
              entityData.accountDate ||
              entityData.sellDate || // For OTHER_NEW_SELL
              new Date().toISOString().split("T")[0]
            ),
            remarks: isAllFinance ? null : String(entityData.remarks || entityData.remark || ""),
            entityData,
          };

          // If we have an existing product payment ID, include it for update
          if (existingProductPaymentId) {
            payload.productPaymentId = Number(existingProductPaymentId);
            payload.id = Number(existingProductPaymentId);
          }

          return api.post("/api/client-product-payments", payload);
        };

        // Master-only fields mapping for Step 3
        const masterOnlyMappings = [
          {
            field: "financeAndEmployment",
            productName: "ALL_FINANCE_EMPLOYEMENT",
          },
          {
            field: "indianSideEmployment",
            productName: "INDIAN_SIDE_EMPLOYEMENT",
          },
          { field: "nocLevelJob", productName: "NOC_LEVEL_JOB_ARRANGEMENT" },
          { field: "lawyerRefuge", productName: "LAWYER_REFUSAL_CHARGE" },
          {
            field: "onshorePartTime",
            productName: "ONSHORE_PART_TIME_EMPLOYEMENT",
          },
          // trvExtension is now handled separately for multiple instances
          {
            field: "marriagePhoto",
            productName: "MARRIAGE_PHOTO_FOR_COURT_MARRIAGE",
          },
          {
            field: "marriageCertificate",
            productName: "MARRIAGE_PHOTO_CERTIFICATE",
          },
          {
            field: "relationshipAffidavit",
            productName: "RECENTE_MARRIAGE_RELATIONSHIP_AFFIDAVIT",
          },
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
            // For financeAndEmployment, include partialPayment in entityData
            // For ALL_FINANCE_EMPLOYEMENT, entityData should have: amount, paymentDate, invoiceNo, remarks, partialPayment
            let entityDataToSend = { ...fieldData };
            if (field === "financeAndEmployment" && productName === "ALL_FINANCE_EMPLOYEMENT") {
              entityDataToSend = {
                amount: fieldData.amount,
                paymentDate: fieldData.date || fieldData.paymentDate || new Date().toISOString().split("T")[0],
                invoiceNo: fieldData.invoiceNo || "",
                remarks: fieldData.remarks || "",
                partialPayment: isPartialPayment,
              };
            } else {
              // For financialEntry products, ensure proper entityData structure
              entityDataToSend = {
                amount: Number(fieldData.amount || 0),
                date: fieldData.date || "",
                invoiceNo: fieldData.invoiceNo || "",
                remarks: fieldData.remarks || "",
              };
            }

            productPaymentPromises.push(
              createOrUpdateProductPayment(
                productName,
                entityDataToSend,
                fieldData.amount,
                fieldData.invoiceNo,
              ),
            );
          }
        });

        // Other Product (from product list) - add all instances to newServices
        if (productFields.otherProduct && typeof productFields.otherProduct === 'object') {
          if (!productFields.newServices) {
            productFields.newServices = [];
          }
          // Iterate through all otherProduct instances
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
                // ✅ Preserve productPaymentId for updates
                productPaymentId: instance.productPaymentId || null,
                // ✅ Store instanceKey temporarily to map back after save
                _instanceKey: instanceKey,
              });
            }
          });
        }

        // TRV Extension (from product list) - handle multiple instances
        if (productFields.trvExtension && typeof productFields.trvExtension === 'object') {
          // Check if it's an object with instance keys (not a single instance)
          const hasInstanceKeys = Object.keys(productFields.trvExtension).some(key =>
            key.includes('trvExtension-') || key.includes('-')
          );

          if (hasInstanceKeys) {
            // Multiple instances - iterate through all
            Object.keys(productFields.trvExtension).forEach((instanceKey) => {
              const instance = (productFields.trvExtension as any)[instanceKey];
              if (instance && (instance.amount > 0 || instance.type)) {
                const entityData: any = {
                  type: instance.type || "",
                  amount: Number(instance.amount || 0),
                  extensionDate: instance.date || "", // ✅ Fixed: date → extensionDate
                  invoiceNo: instance.invoiceNo || "",
                  remarks: instance.remarks || "", // ✅ Fixed: remark → remarks
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

                // ✅ Include productPaymentId for updates (upsert logic)
                if (instance.productPaymentId) {
                  payload.productPaymentId = Number(instance.productPaymentId);
                  console.log('[ClientForm] ✅ Updating TRV Extension (onSubmit) with productPaymentId:', instance.productPaymentId, 'invoiceNo:', instance.invoiceNo);
                } else {
                  console.log('[ClientForm] ➕ Creating new TRV Extension record (onSubmit), invoiceNo:', instance.invoiceNo);
                }

                productPaymentPromises.push(
                  api.post("/api/client-product-payments", payload).then((res) => {
                    // ✅ Update form field with returned productPaymentId after save
                    const returnedPayment = res.data?.data?.productPayment || res.data?.data || res.data;
                    const newProductPaymentId = returnedPayment?.productPaymentId || returnedPayment?.id;
                    if (newProductPaymentId) {
                      setValue(`productFields.trvExtension.${instanceKey}.productPaymentId` as any, Number(newProductPaymentId), { shouldValidate: false, shouldDirty: false });
                      console.log('[ClientForm] ✅ Updated TRV Extension form field with productPaymentId:', newProductPaymentId, 'instanceKey:', instanceKey);
                    }
                    return res;
                  })
                );
              }
            });
          } else if (productFields.trvExtension.type || productFields.trvExtension.amount > 0) {
            // Single instance (backward compatibility)
            const entityData: any = {
              type: productFields.trvExtension.type || "",
              amount: Number(productFields.trvExtension.amount || 0),
              extensionDate: productFields.trvExtension.date || "", // ✅ Fixed: date → extensionDate
              invoiceNo: productFields.trvExtension.invoiceNo || "",
              remarks: productFields.trvExtension.remarks || "", // ✅ Fixed: remark → remarks
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

            // ✅ Include productPaymentId for updates (upsert logic)
            if (productFields.trvExtension.productPaymentId) {
              payload.productPaymentId = Number(productFields.trvExtension.productPaymentId);
              console.log('[ClientForm] ✅ Updating TRV Extension (single instance, onSubmit) with productPaymentId:', productFields.trvExtension.productPaymentId, 'invoiceNo:', productFields.trvExtension.invoiceNo);
            } else {
              console.log('[ClientForm] ➕ Creating new TRV Extension record (single instance, onSubmit), invoiceNo:', productFields.trvExtension.invoiceNo);
            }

            productPaymentPromises.push(
              api.post("/api/client-product-payments", payload)
            );
          }
        }

        // New Services (Extra Other) - supports both create and update
        if (
          productFields.newServices &&
          Array.isArray(productFields.newServices)
        ) {
          productFields.newServices.forEach((service: any) => {
            if (service.serviceName || service.amount > 0) {
              // Ensure entityData is properly formatted for OTHER_NEW_SELL
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

              // ✅ Include productPaymentId for updates (upsert logic)
              if (service.productPaymentId) {
                payload.productPaymentId = Number(service.productPaymentId);
                console.log('[ClientForm] ✅ Updating OTHER_NEW_SELL with productPaymentId:', service.productPaymentId, 'invoiceNo:', service.invoiceNo);
              } else {
                console.log('[ClientForm] ➕ Creating new OTHER_NEW_SELL record, invoiceNo:', service.invoiceNo);
              }

              const instanceKey = service._instanceKey; // Get the instanceKey if it exists (from otherProduct)
              productPaymentPromises.push(
                api.post("/api/client-product-payments", payload).then((res) => {
                  // ✅ Update form field with returned productPaymentId after save
                  const returnedPayment = res.data?.data?.productPayment || res.data?.data || res.data;
                  const newProductPaymentId = returnedPayment?.productPaymentId || returnedPayment?.id;
                  if (newProductPaymentId && instanceKey) {
                    // Update the otherProduct form field if this came from otherProduct
                    setValue(`productFields.otherProduct.${instanceKey}.productPaymentId` as any, Number(newProductPaymentId), { shouldValidate: false, shouldDirty: false });
                    console.log('[ClientForm] ✅ Updated Other Product form field with productPaymentId:', newProductPaymentId, 'instanceKey:', instanceKey);
                  }
                  return res;
                })
              );
            }
          });
        }

        // SIM Card
        if (
          productFields.simCard &&
          (productFields.simCard.isActivated || productFields.simCard.plan)
        ) {
          // Transform form data to backend field names
          const simCardEntityData = {
            activatedStatus: productFields.simCard.isActivated === "Yes" ? true : productFields.simCard.isActivated === "No" ? false : null,
            simcardPlan: productFields.simCard.plan || null,
            simCardGivingDate: productFields.simCard.date || null,
            simActivationDate: productFields.simCard.startDate || null,
            remarks: productFields.simCard.remarks || null,
          };
          productPaymentPromises.push(
            createOrUpdateProductPayment("SIM_CARD_ACTIVATION", simCardEntityData),
          );
        }

        // Air Ticket
        if (
          productFields.airTicket &&
          (productFields.airTicket.amount > 0 ||
            productFields.airTicket.isBooked)
        ) {
          // Transform form data to backend field names
          const airTicketEntityData = {
            isTicketBooked: productFields.airTicket.isBooked === "Yes" ? true : productFields.airTicket.isBooked === "No" ? false : null,
            amount: productFields.airTicket.amount || 0,
            airTicketNumber: productFields.airTicket.invoiceNo || null,
            ticketDate: productFields.airTicket.date || null,
            remarks: productFields.airTicket.remarks || null,
          };
          productPaymentPromises.push(
            createOrUpdateProductPayment(
              "AIR_TICKET",
              airTicketEntityData,
              productFields.airTicket.amount,
              productFields.airTicket.invoiceNo,
            ),
          );
        }

        // Insurance
        if (productFields.insurance && productFields.insurance.amount > 0) {
          // Transform form data to backend field names
          const insuranceEntityData = {
            amount: productFields.insurance.amount || 0,
            policyNumber: productFields.insurance.insuranceNo || productFields.insurance.policyNo || null,
            insuranceDate: productFields.insurance.date || null,
            remarks: productFields.insurance.remarks || null,
          };
          productPaymentPromises.push(
            createOrUpdateProductPayment(
              "INSURANCE",
              insuranceEntityData,
              productFields.insurance.amount,
            ),
          );
        }

        // My Beacon / Beacon Account
        const beaconData =
          productFields.myBeacon || productFields.beaconAccount;
        if (
          beaconData &&
          (beaconData.fundingAmount > 0 || beaconData.cadAmount > 0)
        ) {
          // Transform beaconAccount data: use fundingAmount in entityData (prefer fundingAmount over cadAmount)
          const fundingAmountValue = beaconData.fundingAmount || beaconData.cadAmount || 0;
          const beaconEntityData = {
            openingDate: beaconData.openingDate || null,
            fundingDate: beaconData.fundingDate || null,
            amount: fundingAmountValue, // Backend expects "amount" field, use fundingAmount value
            remarks: beaconData.remarks || null,
          };

          productPaymentPromises.push(
            createOrUpdateProductPayment(
              "BEACON_ACCOUNT",
              beaconEntityData,
              fundingAmountValue,
            ),
          );
        }

        // Student Specifics (now in unified productFields)
        if (
          productFields.ieltsEnrollment &&
          (productFields.ieltsEnrollment.amount > 0 ||
            productFields.ieltsEnrollment.isEnrolled)
        ) {
          // Transform form data to backend field names
          const ieltsEntityData = {
            enrolledStatus: productFields.ieltsEnrollment.isEnrolled === "Yes" ? true : productFields.ieltsEnrollment.isEnrolled === "No" ? false : null,
            amount: productFields.ieltsEnrollment.amount || 0,
            enrollmentDate: productFields.ieltsEnrollment.date || null,
            remarks: productFields.ieltsEnrollment.remarks || null,
          };
          productPaymentPromises.push(
            createOrUpdateProductPayment(
              "IELTS_ENROLLMENT",
              ieltsEntityData,
              productFields.ieltsEnrollment.amount,
            ),
          );
        }
        if (productFields.loan && productFields.loan.amount > 0) {
          productPaymentPromises.push(
            createOrUpdateProductPayment(
              "LOAN_DETAILS",
              productFields.loan,
              productFields.loan.amount,
            ),
          );
        }
        if (productFields.forexFees && productFields.forexFees.amount > 0) {
          // Transform forexFees data: ensure side defaults to "PI", map date to feeDate
          const forexFeesEntityData = {
            ...productFields.forexFees,
            side: productFields.forexFees.side || "PI", // Default to "PI" if empty
            feeDate: productFields.forexFees.date || productFields.forexFees.feeDate || "",
            // Remove date from entityData, use feeDate instead
          };
          delete forexFeesEntityData.date; // Remove date, we use feeDate

          productPaymentPromises.push(
            createOrUpdateProductPayment(
              "FOREX_FEES",
              forexFeesEntityData,
              productFields.forexFees.amount,
            ),
          );
        }
        if (productFields.tuitionFee && productFields.tuitionFee.status) {
          // Transform tuitionFee data: map status to tutionFeesStatus (lowercase), map date to feeDate
          // Step 1: Get the status value
          let statusValue = productFields.tuitionFee.status || "";

          // Step 2: Convert to lowercase
          statusValue = statusValue.toLowerCase(); // "paid" or "pending" or "panding"

          // Step 3: Fix typo (handle legacy "panding" value)
          if (statusValue === "panding") {
            statusValue = "pending";
          }

          // Step 4: Validate (ensure it's "paid" or "pending")
          if (statusValue !== "paid" && statusValue !== "pending") {
            console.warn(`Invalid tuition fee status: ${statusValue}, defaulting to "pending"`);
            statusValue = "pending";
          }

          // Step 5: Create entityData with CORRECT field name
          const tuitionFeeEntityData = {
            ...productFields.tuitionFee,
            tutionFeesStatus: statusValue, // ✅ Correct field name + normalized lowercase value
            feeDate: productFields.tuitionFee.date || productFields.tuitionFee.feeDate || "",
            // Remove status and date from entityData, use tutionFeesStatus and feeDate instead
          };
          delete tuitionFeeEntityData.status; // Remove status, we use tutionFeesStatus
          delete tuitionFeeEntityData.date; // Remove date, we use feeDate

          productPaymentPromises.push(
            createOrUpdateProductPayment("TUTION_FEES", tuitionFeeEntityData),
          );
        }

        // Forex Card (Student-specific, now in unified productFields)
        if (productFields.forexCard && productFields.forexCard.isActivated) {
          // Map form fields to backend fields: isActivated -> forexCardStatus, date -> cardDate
          let forexCardStatus = null;
          if (productFields.forexCard.isActivated === "Yes") {
            forexCardStatus = "Yes";
          } else if (productFields.forexCard.isActivated === "No") {
            forexCardStatus = "No";
          }
          const forexCardEntityData = {
            forexCardStatus: forexCardStatus,
            cardDate: productFields.forexCard.date || null,
            remarks: productFields.forexCard.remarks || null,
          };
          productPaymentPromises.push(
            createOrUpdateProductPayment("FOREX_CARD", forexCardEntityData),
          );
        }

        // Credit Card (Student-specific, now in unified productFields)
        if (
          productFields.creditCard &&
          (productFields.creditCard.isActivated || productFields.creditCard.info)
        ) {
          const creditCardEntityData = {
            activatedStatus: productFields.creditCard.isActivated === "Yes" ? true : productFields.creditCard.isActivated === "No" ? false : null,
            cardPlan: productFields.creditCard.info || null,
            cardGivingDate: productFields.creditCard.date || null,
            cardActivationDate: productFields.creditCard.startDate || null,
            remarks: productFields.creditCard.remarks || null,
          };
          productPaymentPromises.push(
            createOrUpdateProductPayment("CREDIT_CARD", creditCardEntityData),
          );
        }

        if (productPaymentPromises.length > 0) {
          await Promise.all(productPaymentPromises);
          console.log("✓ Step 3: All product payments saved successfully");
        }
      }

      // 4. Final Success and Redirect
      // Invalidate cache before navigation to ensure list is fresh
      console.log('[ClientForm] Final submission complete, invalidating cache...');
      if (user?.role === 'counsellor') {
        queryClient.invalidateQueries({ queryKey: ['counsellor-clients'] });
        console.log('[ClientForm] ✅ Invalidated counsellor-clients cache (final submission)');
      } else {
        queryClient.invalidateQueries({ queryKey: ['clients'] });
        console.log('[ClientForm] ✅ Invalidated clients cache (final submission)');
      }

      toast({
        title: "Success",
        description: "Client registration completed successfully.",
      });

      setLocation("/clients");
    } catch (err: any) {
      console.error("Submission failed:", err);
      toast({
        title: "Registration Failed",
        description: err.response?.data?.message || "Something went wrong.",
        variant: "destructive",
      });
    } finally {
      // ✅ Always reset submitting state
      setIsSubmitting(false);
      requestInFlightRef.current = false;
    }
  };

  // Build steps dynamically based on sales type - reactive to salesType changes
  const steps = useMemo(() => {
    const basicStep = {
      id: "basic",
      title: "Basic Details",
      component: (
        <FormSection
          title="Client Information"
          description="Enter the basic details of the client"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-8">
            <FormTextInput
              key={`name-${internalClientId || 'new'}`}
              name="name"
              control={control}
              label="Full Name"
              placeholder="e.g. Rahul Kumar"
            />
            <FormDateInput
              key={`enrollmentDate-${internalClientId || 'new'}`}
              name="enrollmentDate"
              control={control}
              label="Enrollment Date"
              maxDate={new Date()}
            />
            <FormTextInput
              key={`passportDetails-${internalClientId || 'new'}`}
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
      ),
    };

    const consultancyStep = {
      id: "consultancy",
      title: "Consultancy Payment",
      component: (
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
            <FormCurrencyInput
              name="totalPayment"
              control={control}
              label="Total Payment"
              data-testid="input-total-payment"
            />

            {/* Initial Amount Received Section */}
            <div className="space-y-4">
              <FormSwitchInput
                name="showInitialPayment"
                control={control}
                label="Add Initial Amount Received"
              />
              {showInitialPayment && (
                <FinancialEntry
                  control={control}
                  name="initialPayment"
                  label="Initial Amount Received"
                  hasRemarks={true}
                />
              )}
            </div>

            {/* Before Visa Payment Section */}
            <div className="space-y-4">
              <FormSwitchInput
                name="showBeforeVisaPayment"
                control={control}
                label="Add Before Visa Payment"
              />
              {showBeforeVisaPayment && (
                <FinancialEntry
                  control={control}
                  name="beforeVisaPayment"
                  label="Before Visa Payment"
                  hasRemarks={true}
                />
              )}
            </div>

            {/* After Visa Payment Section */}
            <div className="space-y-4">
              <FormSwitchInput
                name="showAfterVisaPayment"
                control={control}
                label="Add After Visa Payment"
              />
              {showAfterVisaPayment && (
                <FinancialEntry
                  control={control}
                  name="afterVisaPayment"
                  label="After Visa Payment"
                  hasRemarks={true}
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
      ),
    };

    const productFieldsStep = {
      id: "product_details",
      title: "Product Details",
      component: (
        <div className="space-y-6">
          <Accordion
            type="multiple"
            className="w-full"
            defaultValue={["finance-employment", "common-services"]}
          >
            {/* Finance & Employment Section */}
            <AccordionItem value="finance-employment">
              <AccordionTrigger>Finance & Employment</AccordionTrigger>
              <AccordionContent className="pt-4 space-y-4">
                {/* All Finance & Employment (Base Fee) - All Products */}
                <FinancialEntry
                  control={control}
                  name="productFields.financeAndEmployment"
                  label="All Finance & Employment"
                />

                {/* Indian Side Employment (Common) */}
                <FinancialEntry
                  control={control}
                  name="productFields.indianSideEmployment"
                  label="Indian Side Employment"
                />

                {/* Spouse-Specific Finance Fields */}
                <FinancialEntry
                  control={control}
                  name="productFields.nocLevelJob"
                  label="NOC Level Job Arrangement"
                />
                <FinancialEntry
                  control={control}
                  name="productFields.lawyerRefuge"
                  label="Lawyer Refusal Charge"
                />
                <FinancialEntry
                  control={control}
                  name="productFields.onshorePartTime"
                  label="Onshore Part-Time Employment"
                />

                {/* Visitor-Specific: Sponsor Charges */}
                <div className="p-4 border rounded-lg bg-muted/20 space-y-3">
                  <Label className="text-base font-semibold">
                    Sponsor Charges
                  </Label>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <FormCurrencyInput
                      name="productFields.sponsorCharges.amount"
                      control={control}
                      label="Amount (₹10,000 + GST)"
                      placeholder="Enter amount"
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
                      placeholder="Enter invoice number"
                    />
                  </div>
                  <FormTextareaInput
                    name="productFields.sponsorCharges.remarks"
                    control={control}
                    label="Remarks"
                    placeholder="Enter sponsor charges remarks"
                  />
                </div>

                {/* Student-Specific: IELTS Enrollment */}
                <div className="p-4 border rounded-lg bg-muted/20 space-y-3">
                  <Label className="text-base font-semibold">
                    IELTS Enrollment
                  </Label>
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
                      placeholder="Enter amount"
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
                    placeholder="Enter IELTS remarks"
                  />
                </div>

                {/* Student-Specific: Loan Details */}
                <div className="p-4 border rounded-lg bg-muted/20 space-y-3">
                  <Label className="text-base font-semibold">
                    Loan Details
                  </Label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormCurrencyInput
                      name="productFields.loan.amount"
                      control={control}
                      label="Amount"
                      placeholder="Enter amount"
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
                    placeholder="Enter loan remarks"
                  />
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* Legal & Documentation Section (Spouse-Specific) */}
            <AccordionItem value="legal-documentation">
              <AccordionTrigger>Legal & Documentation</AccordionTrigger>
              <AccordionContent className="pt-4 space-y-4">
                {/* TRV Extension */}
                <div className="p-4 border rounded-lg bg-muted/20 space-y-3">
                  <Label className="text-base font-semibold">
                    TRV/ Work Permit Ext. / Study Permit Extension
                  </Label>
                  <div className="grid grid-cols-1 gap-4">
                    <FormSelectInput
                      name="productFields.trvExtension.type"
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
                      name="productFields.trvExtension.amount"
                      control={control}
                      label="Amount"
                      placeholder="Enter amount"
                    />
                    <FormDateInput
                      name="productFields.trvExtension.date"
                      control={control}
                      label="Date"
                      maxDate={new Date()}
                    />
                    <FormTextInput
                      name="productFields.trvExtension.invoiceNo"
                      control={control}
                      label="Invoice No"
                      placeholder="Enter invoice number"
                    />
                  </div>
                  <FormTextareaInput
                    name="productFields.trvExtension.remarks"
                    control={control}
                    label="Remarks"
                    placeholder="Enter TRV extension remarks"
                  />
                </div>

                <FinancialEntry
                  control={control}
                  name="productFields.marriagePhoto"
                  label="Marriage Photo for Court Marriage"
                />
                <FinancialEntry
                  control={control}
                  name="productFields.marriageCertificate"
                  label="Marriage Photo + Certificate (Common Law)"
                />

                <div className="p-4 border rounded-lg bg-muted/20 space-y-3">
                  <Label className="text-base font-semibold">
                    Recent Marriage / Relationship Affidavit
                  </Label>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <FormCurrencyInput
                      name="productFields.relationshipAffidavit.amount"
                      control={control}
                      label="Amount"
                      placeholder="Enter amount"
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
                      placeholder="Enter invoice number"
                    />
                  </div>
                  <FormTextareaInput
                    name="productFields.relationshipAffidavit.remarks"
                    control={control}
                    label="Remarks"
                    placeholder="Enter relationship affidavit remarks"
                  />
                </div>

                <FinancialEntry
                  control={control}
                  name="productFields.judicialReview"
                  label="Judicial Review Charge"
                />

                <FinancialEntry
                  control={control}
                  name="productFields.refusalCharges"
                  label="Refusal Charges"
                  hasRemarks={true}
                />

                <FinancialEntry
                  control={control}
                  name="productFields.kidsStudyPermit"
                  label="Kids Study Permit"
                  hasRemarks={true}
                />
              </AccordionContent>
            </AccordionItem>

            {/* Student-Specific Services */}
            <AccordionItem value="student-services">
              <AccordionTrigger>Student-Specific Services</AccordionTrigger>
              <AccordionContent className="pt-4 space-y-4">
                {/* Forex Card */}
                <div className="p-4 border rounded-lg bg-muted/20 space-y-3">
                  <Label className="text-base font-semibold">
                    Forex Card
                  </Label>
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
                    placeholder="Enter forex card remarks"
                  />
                </div>

                {/* Forex Fees */}
                <div className="p-4 border rounded-lg bg-muted/20 space-y-3">
                  <Label className="text-base font-semibold">
                    Forex Fees
                  </Label>
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
                    placeholder="Enter amount"
                  />
                  <FormTextareaInput
                    name="productFields.forexFees.remarks"
                    control={control}
                    label="Remarks"
                    placeholder="Enter forex fees remarks"
                  />
                </div>

                {/* Tuition Fee */}
                <div className="p-4 border rounded-lg bg-muted/20 space-y-3">
                  <Label className="text-base font-semibold">
                    Tuition Fee
                  </Label>
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
                    placeholder="Enter tuition fee remarks"
                  />
                </div>

                {/* Credit Card */}
                <div className="p-4 border rounded-lg bg-muted/20 space-y-3">
                  <Label className="text-base font-semibold">
                    Credit Card
                  </Label>
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
              </AccordionContent>
            </AccordionItem>

            {/* Common Services Section */}
            <AccordionItem value="common-services">
              <AccordionTrigger>Common Services</AccordionTrigger>
              <AccordionContent className="pt-4 space-y-4">
                {/* SIM Card Activation */}
                <div className="p-4 border rounded-lg bg-muted/20 space-y-3">
                  <Label className="text-base font-semibold">
                    SIM Card Activation
                  </Label>
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
                      placeholder="Enter SIM card plan"
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
                    placeholder="Enter SIM card remarks"
                  />
                </div>

                {/* Insurance */}
                <div className="p-4 border rounded-lg bg-muted/20 space-y-3">
                  <Label className="text-base font-semibold">
                    Insurance
                  </Label>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <FormCurrencyInput
                      name="productFields.insurance.amount"
                      control={control}
                      label="Amount"
                      placeholder="Enter amount"
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
                    placeholder="Enter insurance remarks"
                  />
                </div>

                {/* Beacon Account */}
                <div className="p-4 border rounded-lg bg-muted/20 space-y-3">
                  <Label className="text-base font-semibold">
                    Beacon Account
                  </Label>
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
                      placeholder="Enter funding amount"
                    />
                  </div>
                  <FormTextareaInput
                    name="productFields.beaconAccount.remarks"
                    control={control}
                    label="Remarks"
                    placeholder="Enter beacon account remarks"
                  />
                </div>

                {/* Air Ticket */}
                <div className="p-4 border rounded-lg bg-muted/20 space-y-3">
                  <Label className="text-base font-semibold">
                    Air Ticket
                  </Label>
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
                      placeholder="Enter amount"
                    />
                    <FormDateInput
                      name="productFields.airTicket.date"
                      control={control}
                      label="Date"
                      maxDate={new Date()}
                    />
                    <FormTextInput
                      name="productFields.airTicket.invoiceNo"
                      control={control}
                      label="Invoice No"
                      placeholder="Enter invoice number"
                    />
                  </div>
                  <FormTextareaInput
                    name="productFields.airTicket.remarks"
                    control={control}
                    label="Remarks"
                    placeholder="Enter air ticket remarks"
                  />
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* Additional Services */}
            <AccordionItem value="additional-services">
              <AccordionTrigger>Additional Services</AccordionTrigger>
              <AccordionContent className="pt-4">
                <NewServiceSection
                  control={control}
                  namePrefix="productFields"
                  title="New Services"
                />
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>
      ),
    };

    // Build step array based on sales type
    const allSteps = [basicStep];

    const selectedTypeData = allSaleTypes.find((t) => t.saleType === salesType);
    const isCoreProduct = selectedTypeData
      ? selectedTypeData.isCoreProduct
      : true;

    if (isCoreProduct) {
      // For core products: Include payment step and product details
      // Steps: 1 (Basic) -> 2 (Consultancy Payment) -> 3 (Product Details)
      allSteps.push(consultancyStep);
      allSteps.push(productFieldsStep);
    } else if (salesType) {
      // For non-core products: Skip payment, go directly to product details
      // Steps: 1 (Basic) -> 3 (Product Details) - Step 2 is skipped
      allSteps.push(productFieldsStep);
    }

    return allSteps;
  }, [salesType, allSaleTypes, control, internalClientId, dynamicOptions, leadTypes, selectedProductType, productType, calculatedPending]);

  const [paymentIds, setPaymentIds] = useState<{ [key: string]: number }>({});
  const [productPaymentIds, setProductPaymentIds] = useState<
    Record<string, number>
  >({});
  // Use ref to always have latest product payment IDs (avoid stale closure)
  const productPaymentIdsRef = useRef<Record<string, number>>({});

  // Keep ref in sync with state
  useEffect(() => {
    productPaymentIdsRef.current = productPaymentIds;
  }, [productPaymentIds]);

  // Parse API error and map to form fields
  const parseApiError = (error: any): Record<string, string> => {
    const errors: Record<string, string> = {};
    const errorMessage = error.response?.data?.message || error.message || "";

    if (!errorMessage) return errors;

    // Map common error messages to field names
    const errorLower = errorMessage.toLowerCase();

    // Client Information fields
    if (errorLower.includes("name") || errorLower.includes("full name") || errorLower.includes("fullname")) {
      errors.name = errorMessage;
    }
    if (errorLower.includes("enrollment date") || errorLower.includes("enrollmentdate")) {
      errors.enrollmentDate = errorMessage;
    }
    if (errorLower.includes("passport") || errorLower.includes("passport details")) {
      errors.passportDetails = errorMessage;
    }
    if (errorLower.includes("sales type") || errorLower.includes("salestype") || errorLower.includes("sale type")) {
      errors.salesType = errorMessage;
    }
    if (errorLower.includes("lead source") || errorLower.includes("leadsource") || errorLower.includes("lead type")) {
      errors.leadSource = errorMessage;
    }
    if (errorLower.includes("counsellor") || errorLower.includes("counsellorid")) {
      errors.counsellorId = errorMessage;
    }

    // Payment Details fields
    if (errorLower.includes("total payment") || errorLower.includes("totalpayment")) {
      errors.totalPayment = errorMessage;
    }

    // Invoice number errors - these are handled per payment stage in handleSaveService
    // But we can still check for general invoice errors
    if (errorLower.includes("invoice") && (errorLower.includes("already exists") || errorLower.includes("duplicate") || errorLower.includes("exists"))) {
      // This will be mapped to the specific payment field in handleSaveService
      // We don't set a specific field here since we don't know which payment stage failed
    }

    if (errorLower.includes("initial payment") || errorLower.includes("initialpayment") || errorLower.includes("initial amount")) {
      // Check for specific sub-fields
      if (errorLower.includes("amount")) {
        errors["initialPayment.amount"] = errorMessage;
      } else if (errorLower.includes("date")) {
        errors["initialPayment.date"] = errorMessage;
      } else if (errorLower.includes("invoice")) {
        errors["initialPayment.invoiceNo"] = errorMessage;
      } else {
        errors.initialPayment = errorMessage;
      }
    }
    if (errorLower.includes("before visa") || errorLower.includes("beforevisa")) {
      if (errorLower.includes("amount")) {
        errors["beforeVisaPayment.amount"] = errorMessage;
      } else if (errorLower.includes("date")) {
        errors["beforeVisaPayment.date"] = errorMessage;
      } else if (errorLower.includes("invoice")) {
        errors["beforeVisaPayment.invoiceNo"] = errorMessage;
      } else {
        errors.beforeVisaPayment = errorMessage;
      }
    }
    if (errorLower.includes("after visa") || errorLower.includes("aftervisa")) {
      if (errorLower.includes("amount")) {
        errors["afterVisaPayment.amount"] = errorMessage;
      } else if (errorLower.includes("date")) {
        errors["afterVisaPayment.date"] = errorMessage;
      } else if (errorLower.includes("invoice")) {
        errors["afterVisaPayment.invoiceNo"] = errorMessage;
      } else {
        errors.afterVisaPayment = errorMessage;
      }
    }

    // If no specific field match, check if it's a validation error with field names
    if (error.response?.data?.errors) {
      const apiErrors = error.response.data.errors;
      Object.keys(apiErrors).forEach((key) => {
        const fieldName = key.toLowerCase();
        // Client Information fields
        if (fieldName === "fullname" || fieldName === "name") {
          errors.name = Array.isArray(apiErrors[key]) ? apiErrors[key][0] : apiErrors[key];
        } else if (fieldName === "enrollmentdate" || fieldName === "enrollment_date") {
          errors.enrollmentDate = Array.isArray(apiErrors[key]) ? apiErrors[key][0] : apiErrors[key];
        } else if (fieldName === "passportdetails" || fieldName === "passport_details") {
          errors.passportDetails = Array.isArray(apiErrors[key]) ? apiErrors[key][0] : apiErrors[key];
        } else if (fieldName === "salestype" || fieldName === "sale_type" || fieldName === "saletypeid") {
          errors.salesType = Array.isArray(apiErrors[key]) ? apiErrors[key][0] : apiErrors[key];
        } else if (fieldName === "leadsource" || fieldName === "lead_source" || fieldName === "leadtypeid") {
          errors.leadSource = Array.isArray(apiErrors[key]) ? apiErrors[key][0] : apiErrors[key];
        } else if (fieldName === "counsellorid" || fieldName === "counsellor_id") {
          errors.counsellorId = Array.isArray(apiErrors[key]) ? apiErrors[key][0] : apiErrors[key];
        }
        // Payment Details fields
        else if (fieldName === "totalpayment" || fieldName === "total_payment") {
          errors.totalPayment = Array.isArray(apiErrors[key]) ? apiErrors[key][0] : apiErrors[key];
        } else if (fieldName === "initialpayment" || fieldName === "initial_payment") {
          errors.initialPayment = Array.isArray(apiErrors[key]) ? apiErrors[key][0] : apiErrors[key];
        } else if (fieldName === "beforevisapayment" || fieldName === "before_visa_payment") {
          errors.beforeVisaPayment = Array.isArray(apiErrors[key]) ? apiErrors[key][0] : apiErrors[key];
        } else if (fieldName === "aftervisapayment" || fieldName === "after_visa_payment") {
          errors.afterVisaPayment = Array.isArray(apiErrors[key]) ? apiErrors[key][0] : apiErrors[key];
        }
        // Nested payment fields
        else if (fieldName.includes("initial") && fieldName.includes("amount")) {
          errors["initialPayment.amount"] = Array.isArray(apiErrors[key]) ? apiErrors[key][0] : apiErrors[key];
        } else if (fieldName.includes("initial") && fieldName.includes("date")) {
          errors["initialPayment.date"] = Array.isArray(apiErrors[key]) ? apiErrors[key][0] : apiErrors[key];
        } else if (fieldName.includes("initial") && fieldName.includes("invoice")) {
          errors["initialPayment.invoiceNo"] = Array.isArray(apiErrors[key]) ? apiErrors[key][0] : apiErrors[key];
        } else if (fieldName.includes("before") && fieldName.includes("amount")) {
          errors["beforeVisaPayment.amount"] = Array.isArray(apiErrors[key]) ? apiErrors[key][0] : apiErrors[key];
        } else if (fieldName.includes("before") && fieldName.includes("date")) {
          errors["beforeVisaPayment.date"] = Array.isArray(apiErrors[key]) ? apiErrors[key][0] : apiErrors[key];
        } else if (fieldName.includes("before") && fieldName.includes("invoice")) {
          errors["beforeVisaPayment.invoiceNo"] = Array.isArray(apiErrors[key]) ? apiErrors[key][0] : apiErrors[key];
        } else if (fieldName.includes("after") && fieldName.includes("amount")) {
          errors["afterVisaPayment.amount"] = Array.isArray(apiErrors[key]) ? apiErrors[key][0] : apiErrors[key];
        } else if (fieldName.includes("after") && fieldName.includes("date")) {
          errors["afterVisaPayment.date"] = Array.isArray(apiErrors[key]) ? apiErrors[key][0] : apiErrors[key];
        } else if (fieldName.includes("after") && fieldName.includes("invoice")) {
          errors["afterVisaPayment.invoiceNo"] = Array.isArray(apiErrors[key]) ? apiErrors[key][0] : apiErrors[key];
        }
      });
    }

    // Product Details fields - map invoice errors to specific product fields
    if (errorLower.includes("invoice") && (errorLower.includes("already exists") || errorLower.includes("duplicate") || errorLower.includes("exists"))) {
      // Try to identify which product field this error belongs to
      // This will be handled more specifically in handleSaveProduct based on the product being saved
      // For now, we'll return a generic error that can be mapped by the caller
      errors.invoiceNo = errorMessage;
    }

    // Product field errors
    if (errorLower.includes("service name") || errorLower.includes("servicename")) {
      errors.serviceName = errorMessage;
    }
    if (errorLower.includes("amount") && !errorLower.includes("total") && !errorLower.includes("payment")) {
      errors.amount = errorMessage;
    }
    if (errorLower.includes("type") && (errorLower.includes("required") || errorLower.includes("missing"))) {
      errors.type = errorMessage;
    }
    if (errorLower.includes("side") && (errorLower.includes("required") || errorLower.includes("must be"))) {
      errors.side = errorMessage;
    }
    if (errorLower.includes("status") && (errorLower.includes("required") || errorLower.includes("must be"))) {
      errors.status = errorMessage;
    }
    if (errorLower.includes("tution") || errorLower.includes("tuition")) {
      if (errorLower.includes("status")) {
        errors.tutionFeesStatus = errorMessage;
      }
    }
    if (errorLower.includes("forex card") || errorLower.includes("forexcard")) {
      if (errorLower.includes("status")) {
        errors.forexCardStatus = errorMessage;
      }
    }
    if (errorLower.includes("air ticket") || errorLower.includes("airticket")) {
      if (errorLower.includes("number") || errorLower.includes("already exists")) {
        errors.airTicketNumber = errorMessage;
      }
    }
    if (errorLower.includes("credit card") || errorLower.includes("creditcard")) {
      if (errorLower.includes("info")) {
        errors["productFields.creditCard.info"] = errorMessage as any;
      }
    }
    if (errorLower.includes("visa extension") || errorLower.includes("visaextension")) {
      if (errorLower.includes("invoice")) {
        errors.invoiceNo = errorMessage;
      }
    }
    if (errorLower.includes("new sell") || errorLower.includes("newsell") || errorLower.includes("other")) {
      if (errorLower.includes("invoice")) {
        errors.invoiceNo = errorMessage;
      }
      if (errorLower.includes("service name")) {
        errors.serviceName = errorMessage;
      }
    }

    return errors;
  };

  // Handle Create Client button (extracted from step logic)
  const handleCreateClient = async () => {
    if (isSubmitting || requestInFlightRef.current) {
      console.log('[ClientForm] Request already in progress, ignoring create client');
      return;
    }

    // Validate required fields (salesType is now in Step 2, not required for client creation)
    const isValid = await trigger(["name", "enrollmentDate", "passportDetails", "counsellorId"] as any);
    if (!isValid) {
      // Don't show toast - errors are already displayed below fields by React Hook Form
      return;
    }

    setIsSubmitting(true);
    requestInFlightRef.current = true;

    const data = form.getValues();
    const selectedTypeData = allSaleTypes.find(
      (t) => t.saleType === data.salesType,
    );

    try {
      // Find leadTypeId from selected leadSource
      const selectedLeadType = leadTypes.find(
        (lt: any) => lt.leadType === data.leadSource
      );
      const leadTypeId = selectedLeadType?.id || selectedLeadType?.leadTypeId || null;

      const payload: any = {
        fullName: data.name,
        enrollmentDate: data.enrollmentDate,
        passportDetails: data.passportDetails,
        saleTypeId: selectedTypeData?.id || null, // salesType is now in Step 2, optional for client creation
        counsellorId: data.counsellorId,
        leadTypeId: leadTypeId,
      };

      if (internalClientId) {
        payload.clientId = internalClientId;
      }

      const clientRes = await api.post("/api/clients", payload);
      const returnedClient = clientRes.data?.data?.client;
      const newId =
        returnedClient?.clientId ||
        clientRes.data?.data?.clientId ||
        clientRes.data?.clientId;

      if (newId) {
        const isNewClient = !internalClientId;
        setInternalClientId(newId);
        setIsClientCreated(true);
        (window as any).currentClientId = newId;
        localStorage.setItem("currentClientId", newId.toString());

        // Sync local storage
        const existingClients = JSON.parse(
          localStorage.getItem("clients") || "[]",
        );
        const clientIndex = existingClients.findIndex(
          (c: any) => c.clientId === newId || c.id === newId,
        );

        const clientData = {
          ...data,
          clientId: newId,
          id: newId,
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
        console.log(
          `✓ Client ${isNewClient ? "Created" : "Updated"} and saved to local storage`,
        );

        // Invalidate client list cache
        if (isNewClient) {
          console.log('[ClientForm] New client created, invalidating cache...');
          if (user?.role === 'counsellor') {
            queryClient.invalidateQueries({ queryKey: ['counsellor-clients'] });
            console.log('[ClientForm] ✅ Invalidated counsellor-clients cache');
          } else {
            queryClient.invalidateQueries({ queryKey: ['clients'] });
            console.log('[ClientForm] ✅ Invalidated clients cache');
          }
        } else {
          // Also invalidate on update to refresh the list
          if (user?.role === 'counsellor') {
            queryClient.invalidateQueries({ queryKey: ['counsellor-clients'] });
          } else {
            queryClient.invalidateQueries({ queryKey: ['clients'] });
          }
        }

        toast({
          title: "Success",
          description: isNewClient
            ? "Client created successfully! You can now add product and service details."
            : "Client updated successfully!",
        });
      }
    } catch (error: any) {
      console.error("Failed to create client", error);

      // Parse API errors and set them on form fields
      const apiErrors = parseApiError(error);

      // Clear previous errors
      setFieldErrors({});

      // Set errors on form fields using React Hook Form's setError
      Object.keys(apiErrors).forEach((fieldName) => {
        setError(fieldName as any, {
          type: "server",
          message: apiErrors[fieldName],
        });
        setFieldErrors((prev) => ({
          ...prev,
          [fieldName]: apiErrors[fieldName],
        }));
      });

      // Only show toast if no field-specific errors were found
      if (Object.keys(apiErrors).length === 0) {
        toast({
          title: "Error",
          description: error.response?.data?.message || error.message || "Failed to save client. Please try again.",
          variant: "destructive",
        });
      }
    } finally {
      setIsSubmitting(false);
      requestInFlightRef.current = false;
    }
  };

  const handleStepChange = async (currentStep: number, nextStep: number) => {
    // ✅ Prevent multiple clicks - early exit if already processing
    if (isSubmitting || loadingStep !== null || requestInFlightRef.current) {
      console.log('[ClientForm] Request already in progress, ignoring step change');
      return false;
    }

    if (nextStep > currentStep) {
      // Ensure nextStep is within valid range
      if (nextStep >= steps.length) {
        console.warn(`[ClientForm] Attempted to navigate to invalid step ${nextStep}, max step is ${steps.length - 1}`);
        return false;
      }

      const stepId = steps[currentStep].id;
      const nextStepId = steps[nextStep]?.id;

      // Prevent navigation to consultancy step (step 2) if it's not available
      // This happens when isCoreProduct is false
      if (nextStepId === "consultancy") {
        const selectedTypeData = allSaleTypes.find((t) => t.saleType === salesType);
        const isCoreProduct = selectedTypeData ? selectedTypeData.isCoreProduct : true;

        if (!isCoreProduct) {
          console.warn('[ClientForm] Attempted to navigate to consultancy step for non-core product');
          toast({
            title: "Navigation Error",
            description: "This step is not available for the selected sales type.",
            variant: "destructive",
          });
          return false;
        }
      }

      let fieldsToValidate: any[] = [];

      if (stepId === "basic") {
        fieldsToValidate = ["name", "enrollmentDate", "passportDetails", "counsellorId"];
      } else if (stepId === "consultancy") {
        fieldsToValidate = ["salesType", "totalPayment"]; // salesType is now required in Step 2
      }

      if (fieldsToValidate.length > 0) {
        const isValid = await trigger(fieldsToValidate as any);
        if (!isValid) {
          // Don't show toast - errors are already displayed below fields by React Hook Form
          return false;
        }

        // --- Step 1: Basic Details (Client Creation/Update) ---
        if (stepId === "basic") {
          // ✅ Set loading state immediately
          setLoadingStep(currentStep);
          setIsSubmitting(true);
          requestInFlightRef.current = true;

          const data = form.getValues();
          const selectedTypeData = allSaleTypes.find(
            (t) => t.saleType === data.salesType,
          );

          try {
            // Find leadTypeId from selected leadSource
            const selectedLeadType = leadTypes.find(
              (lt: any) => lt.leadType === data.leadSource
            );
            const leadTypeId = selectedLeadType?.id || selectedLeadType?.leadTypeId || null;

            const payload: any = {
              fullName: data.name,
              enrollmentDate: data.enrollmentDate,
              saleTypeId: selectedTypeData?.id,
              counsellorId: data.counsellorId,
              leadTypeId: leadTypeId,
            };

            if (internalClientId) {
              payload.clientId = internalClientId;
            }

            const clientRes = await api.post("/api/clients", payload);
            const returnedClient = clientRes.data?.data?.client;
            const newId =
              returnedClient?.clientId ||
              clientRes.data?.data?.clientId ||
              clientRes.data?.clientId;

            if (newId) {
              setInternalClientId(newId);
              (window as any).currentClientId = newId;
              localStorage.setItem("currentClientId", newId.toString());

              // Sync local storage
              const existingClients = JSON.parse(
                localStorage.getItem("clients") || "[]",
              );
              const clientIndex = existingClients.findIndex(
                (c: any) => c.clientId === newId || c.id === newId,
              );

              const clientData = {
                ...data,
                clientId: newId,
                id: newId,
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
              console.log(
                `✓ Client ${internalClientId ? "Updated" : "Created"} and saved to local storage`,
              );

              // Invalidate client list cache to show new client immediately
              // This ensures the list updates even if socket event is delayed
              const isNewClient = !internalClientId;
              if (isNewClient) {
                console.log('[ClientForm] New client created, invalidating cache...');
                // For counsellors: invalidate counsellor-clients
                // For admins/managers: invalidate clients
                if (user?.role === 'counsellor') {
                  queryClient.invalidateQueries({ queryKey: ['counsellor-clients'] });
                  console.log('[ClientForm] ✅ Invalidated counsellor-clients cache');
                } else {
                  queryClient.invalidateQueries({ queryKey: ['clients'] });
                  console.log('[ClientForm] ✅ Invalidated clients cache');
                }
              }
            }
          } catch (error: any) {
            console.error("Failed to process client", error);

            // Parse API errors and set them on form fields
            const apiErrors = parseApiError(error);

            // Clear previous errors
            setFieldErrors({});

            // Set errors on form fields using React Hook Form's setError
            Object.keys(apiErrors).forEach((fieldName) => {
              setError(fieldName as any, {
                type: "server",
                message: apiErrors[fieldName],
              });
              setFieldErrors((prev) => ({
                ...prev,
                [fieldName]: apiErrors[fieldName],
              }));
            });

            // Only show toast if no field-specific errors were found
            if (Object.keys(apiErrors).length === 0) {
              toast({
                title: "Error",
                description: error.response?.data?.message || error.message || "Failed to save client. Please try again.",
                variant: "destructive",
              });
            }

            return false; // Prevent moving to next step on error
          } finally {
            // ✅ Always reset loading state
            setLoadingStep(null);
            setIsSubmitting(false);
            requestInFlightRef.current = false;
          }
        }
        // --- Step 2: Consultancy Payment (Payment Creation/Update) ---
        if (stepId === "consultancy") {
          // ✅ Set loading state immediately
          setLoadingStep(currentStep);
          setIsSubmitting(true);
          requestInFlightRef.current = true;

          const data = form.getValues();
          const selectedTypeData = allSaleTypes.find(
            (t) => t.saleType === data.salesType,
          );
          const currentTotalPaymentVal =
            data.totalPayment || selectedTypeData?.amount || 0;

          try {
            const paymentStages = [
              { key: "initialPayment", stage: "INITIAL" },
              { key: "beforeVisaPayment", stage: "BEFORE_VISA" },
              { key: "afterVisaPayment", stage: "AFTER_VISA" },
            ];

            const promises = paymentStages
              .filter((item) => {
                const paymentData = (data as any)[item.key];
                return paymentData?.amount && paymentData.amount > 0;
              })
              .map(async (item) => {
                const paymentData = (data as any)[item.key];
                const existingId = paymentIds[item.key];

                // Get saleTypeId from form data
                const formData = form.getValues();
                const selectedTypeDataForPayment = allSaleTypes.find(
                  (t) => t.saleType === formData.salesType,
                );
                const saleTypeId = selectedTypeDataForPayment?.id;

                const payload: any = {
                  clientId: internalClientId,
                  saleTypeId: saleTypeId, // ✅ Add saleTypeId from salesType
                  totalPayment: String(currentTotalPaymentVal),
                  stage: item.stage,
                  amount: String(paymentData.amount),
                  paymentDate: paymentData.date,
                  invoiceNo: paymentData.invoiceNo,
                  remarks: paymentData.remarks,
                };

                if (existingId) {
                  payload.paymentId = existingId;
                }

                const res = await api.post("/api/client-payments", payload);
                const returnedPayment =
                  res.data?.data?.payment || res.data?.data || res.data;
                const newPaymentId =
                  returnedPayment?.paymentId || returnedPayment?.id;

                if (newPaymentId) {
                  setPaymentIds((prev) => ({
                    ...prev,
                    [item.key]: newPaymentId,
                  }));
                }
                return res;
              });

            if (promises.length > 0) {
              await Promise.all(promises);
            }
          } catch (error: any) {
            console.error("Failed to process payments", error);
            toast({
              title: "Error",
              description: error.response?.data?.message || error.message || "Failed to save payments. Please try again.",
              variant: "destructive",
            });
            return false; // Prevent moving to next step on error
          } finally {
            // ✅ Always reset loading state
            setLoadingStep(null);
            setIsSubmitting(false);
            requestInFlightRef.current = false;
          }
        }

        // --- Step 3: Product Payments ---
        if (stepId === "product_details") {
          const data = form.getValues();

          if (!internalClientId) {
            console.warn("No clientId, skipping Step 3");
            return true;
          }

          const resolvedProductType = getProductType(
            data.salesType,
            data.selectedProductType,
          );

          if (!resolvedProductType) {
            console.warn("Product type unresolved, skipping Step 3");
            return true;
          }

          const productFields =
            data[`${resolvedProductType}Fields` as keyof FormValues] as any;

          if (!productFields) return true;

          // Log current state for debugging
          console.log("=== Step 3: Product Payments ===");
          console.log("Current productPaymentIds state:", productPaymentIds);
          console.log("Current productPaymentIdsRef.current:", productPaymentIdsRef.current);
          console.log("Is edit mode:", isEditMode);
          console.log("Internal client ID:", internalClientId);

          // If in edit mode but no product payment IDs loaded, warn
          if (isEditMode && Object.keys(productPaymentIdsRef.current).length === 0) {
            console.error("⚠️ WARNING: In edit mode but no product payment IDs were loaded!");
            console.error("This means updates will fail and new records will be created.");
          }

          const calls: Promise<any>[] = [];

          const createOrUpdate = (
            productName: string,
            entityData: any,
            amount = 0,
            invoiceNo?: string,
            remarks?: string,
          ) => {
            // Use ref to get latest product payment IDs (avoid stale closure)
            const latestProductPaymentIds = productPaymentIdsRef.current;
            const existingProductPaymentId = latestProductPaymentIds[productName];
            console.log(`\n=== Processing ${productName} ===`);
            console.log("Available productPaymentIds (from ref):", latestProductPaymentIds);
            console.log("Available productPaymentIds (from state):", productPaymentIds);
            console.log("Looking for productName:", productName);
            console.log("Found existingProductPaymentId:", existingProductPaymentId);

            const payload: any = {
              clientId: internalClientId,
              productName,
              amount: String(amount),
              invoiceNo: invoiceNo || "",
              paymentDate:
                entityData?.date ||
                entityData?.feeDate || // For FOREX_FEES and TUTION_FEES
                entityData?.extensionDate ||
                entityData?.startDate ||
                entityData?.openingDate ||
                entityData?.fundingDate ||
                entityData?.disbursementDate ||
                entityData?.sellDate || // For OTHER_NEW_SELL
                new Date().toISOString().split("T")[0],
              remarks: entityData?.remarks || entityData?.remark || "",
              entityData,
            };

            // If we have an existing product payment ID, include it for update
            // Try both field names in case API expects different one
            if (existingProductPaymentId) {
              payload.productPaymentId = Number(existingProductPaymentId); // Ensure it's a number
              payload.id = Number(existingProductPaymentId); // Some APIs use 'id' instead
              // Try POST first (some APIs handle update via POST with ID)
              return api.post("/api/client-product-payments", payload);
            } else {
              return api.post("/api/client-product-payments", payload);
            }
          };

          // Master-only fields mapping for Step 3
          const masterOnlyMappings = [
            {
              field: "financeAndEmployment",
              productName: "ALL_FINANCE_EMPLOYEMENT",
            },
            {
              field: "indianSideEmployment",
              productName: "INDIAN_SIDE_EMPLOYEMENT",
            },
            { field: "nocLevelJob", productName: "NOC_LEVEL_JOB_ARRANGEMENT" },
            { field: "lawyerRefuge", productName: "LAWYER_REFUSAL_CHARGE" },
            {
              field: "onshorePartTime",
              productName: "ONSHORE_PART_TIME_EMPLOYEMENT",
            },
            // trvExtension is now handled separately for multiple instances
            {
              field: "marriagePhoto",
              productName: "MARRIAGE_PHOTO_FOR_COURT_MARRIAGE",
            },
            {
              field: "marriageCertificate",
              productName: "MARRIAGE_PHOTO_CERTIFICATE",
            },
            {
              field: "relationshipAffidavit",
              productName: "RECENTE_MARRIAGE_RELATIONSHIP_AFFIDAVIT",
            },
            { field: "judicialReview", productName: "JUDICAL_REVIEW_CHARGE" },
            { field: "sponsorCharges", productName: "SPONSOR_CHARGES" },
          ];

          masterOnlyMappings.forEach(({ field, productName }) => {
            const fieldData = productFields[field];
            if (fieldData?.amount > 0) {
              calls.push(
                createOrUpdate(
                  productName,
                  fieldData,
                  fieldData.amount,
                  fieldData.invoiceNo,
                ),
              );
            }
          });

          // Other Product (from product list) - add all instances to newServices
          if (productFields.otherProduct && typeof productFields.otherProduct === 'object') {
            if (!productFields.newServices) {
              productFields.newServices = [];
            }
            // Iterate through all otherProduct instances
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
                });
              }
            });
          }

          // TRV Extension (from product list) - handle multiple instances
          if (productFields.trvExtension && typeof productFields.trvExtension === 'object') {
            // Check if it's an object with instance keys (not a single instance)
            const hasInstanceKeys = Object.keys(productFields.trvExtension).some(key =>
              key.includes('trvExtension-') || key.includes('-')
            );

            if (hasInstanceKeys) {
              // Multiple instances - iterate through all
              Object.keys(productFields.trvExtension).forEach((instanceKey) => {
                const instance = (productFields.trvExtension as any)[instanceKey];
                if (instance && (instance.amount > 0 || instance.type)) {
                  const entityData: any = {
                    type: instance.type || "",
                    amount: Number(instance.amount || 0),
                    extensionDate: instance.date || "", // ✅ Fixed: date → extensionDate
                    invoiceNo: instance.invoiceNo || "",
                    remarks: instance.remarks || "", // ✅ Fixed: remark → remarks
                  };

                  const payload: any = {
                    clientId: internalClientId,
                    productName: "TRV_WORK_PERMIT_EXT_STUDY_PERMIT_EXTENSION",
                    amount: String(entityData.amount || 0),
                    invoiceNo: String(entityData.invoiceNo || ""),
                    paymentDate: instance.date || new Date().toISOString().split("T")[0],
                    remarks: String(instance.remarks || ""),
                    entityData,
                  };

                  // ✅ Add update logic: include productPaymentId if updating existing record
                  if (instance.productPaymentId) {
                    payload.productPaymentId = Number(instance.productPaymentId);
                  }

                  calls.push(
                    api.post("/api/client-product-payments", payload)
                  );
                }
              });
            } else if (productFields.trvExtension.type || productFields.trvExtension.amount > 0) {
              // Single instance (backward compatibility)
              const entityData: any = {
                type: productFields.trvExtension.type || "",
                amount: Number(productFields.trvExtension.amount || 0),
                extensionDate: productFields.trvExtension.date || "", // ✅ Fixed: date → extensionDate
                invoiceNo: productFields.trvExtension.invoiceNo || "",
                remarks: productFields.trvExtension.remarks || "", // ✅ Fixed: remark → remarks
              };

              const payload: any = {
                clientId: internalClientId,
                productName: "TRV_WORK_PERMIT_EXT_STUDY_PERMIT_EXTENSION",
                amount: String(entityData.amount || 0),
                invoiceNo: String(entityData.invoiceNo || ""),
                paymentDate: productFields.trvExtension.date || new Date().toISOString().split("T")[0],
                remarks: String(productFields.trvExtension.remarks || ""),
                entityData,
              };

              // ✅ Add update logic: include productPaymentId if updating existing record
              if (productFields.trvExtension.productPaymentId) {
                payload.productPaymentId = Number(productFields.trvExtension.productPaymentId);
              }

              calls.push(
                api.post("/api/client-product-payments", payload)
              );
            }
          }

          // New Services (Extra Other)
          if (
            productFields.newServices &&
            Array.isArray(productFields.newServices)
          ) {
            productFields.newServices.forEach((service: any) => {
              if (service.serviceName || service.amount > 0) {
                // Ensure entityData is properly formatted for OTHER_NEW_SELL
                const entityData: any = {
                  serviceName: service.serviceName || "",
                  serviceInformation: service.serviceInfo || "",
                  amount: Number(service.amount || 0),
                  sellDate: service.date ? (service.date.includes("T") ? service.date.split("T")[0] : service.date) : new Date().toISOString().split("T")[0],
                  invoiceNo: service.invoiceNo || null,
                  remarks: service.remark || service.remarks || "",
                };

                const payload: any = {
                  clientId: internalClientId,
                  productName: "OTHER_NEW_SELL",
                  amount: String(service.amount || 0),
                  invoiceNo: String(service.invoiceNo || ""),
                  paymentDate: entityData.sellDate || new Date().toISOString().split("T")[0],
                  remarks: String(entityData.remarks || ""),
                  entityData,
                };

                // ✅ Add update logic: include productPaymentId if updating existing record
                if (service.productPaymentId) {
                  payload.productPaymentId = Number(service.productPaymentId);
                }

                calls.push(
                  api.post("/api/client-product-payments", payload)
                );
              }
            });
          }

          // SIM Card
          if (
            productFields.simCard &&
            (productFields.simCard.isActivated || productFields.simCard.plan)
          ) {
            // Transform form data to backend field names
            const simCardEntityData = {
              activatedStatus: productFields.simCard.isActivated === "Yes" ? true : productFields.simCard.isActivated === "No" ? false : null,
              simcardPlan: productFields.simCard.plan || null,
              simCardGivingDate: productFields.simCard.date || null,
              simActivationDate: productFields.simCard.startDate || null,
              remarks: productFields.simCard.remarks || null,
            };
            calls.push(createOrUpdate("SIM_CARD_ACTIVATION", simCardEntityData));
          }

          // Air Ticket
          if (
            productFields.airTicket &&
            (productFields.airTicket.amount > 0 ||
              productFields.airTicket.isBooked)
          ) {
            // Transform form data to backend field names
            const airTicketEntityData = {
              isTicketBooked: productFields.airTicket.isBooked === "Yes" ? true : productFields.airTicket.isBooked === "No" ? false : null,
              amount: productFields.airTicket.amount || 0,
              airTicketNumber: productFields.airTicket.invoiceNo || null,
              ticketDate: productFields.airTicket.date || null,
              remarks: productFields.airTicket.remarks || null,
            };
            calls.push(
              createOrUpdate(
                "AIR_TICKET",
                airTicketEntityData,
                productFields.airTicket.amount || 0,
                productFields.airTicket.invoiceNo,
              ),
            );
          }

          // Insurance
          if (productFields.insurance && productFields.insurance.amount > 0) {
            // Transform form data to backend field names
            const insuranceEntityData = {
              amount: productFields.insurance.amount || 0,
              policyNumber: productFields.insurance.insuranceNo || productFields.insurance.policyNo || null,
              insuranceDate: productFields.insurance.date || null,
              remarks: productFields.insurance.remarks || null,
            };
            calls.push(
              createOrUpdate(
                "INSURANCE",
                insuranceEntityData,
                productFields.insurance.amount,
              ),
            );
          }

          // My Beacon / Beacon Account
          const beaconData =
            productFields.myBeacon || productFields.beaconAccount;
          if (
            beaconData &&
            (beaconData.fundingAmount > 0 || beaconData.cadAmount > 0)
          ) {
            // Transform beaconAccount data: use fundingAmount in entityData (prefer fundingAmount over cadAmount)
            const fundingAmountValue = beaconData.fundingAmount || beaconData.cadAmount || 0;
            const beaconEntityData = {
              openingDate: beaconData.openingDate || null,
              fundingDate: beaconData.fundingDate || null,
              amount: fundingAmountValue, // Backend expects "amount" field, use fundingAmount value
              remarks: beaconData.remarks || null,
            };

            calls.push(
              createOrUpdate(
                "BEACON_ACCOUNT",
                beaconEntityData,
                fundingAmountValue,
              ),
            );
          }

          // Student Specifics
          if (resolvedProductType === "student") {
            if (
              productFields.ieltsEnrollment &&
              (productFields.ieltsEnrollment.amount > 0 ||
                productFields.ieltsEnrollment.isEnrolled)
            ) {
              // Transform form data to backend field names
              const ieltsEntityData = {
                enrolledStatus: productFields.ieltsEnrollment.isEnrolled === "Yes" ? true : productFields.ieltsEnrollment.isEnrolled === "No" ? false : null,
                amount: productFields.ieltsEnrollment.amount || 0,
                enrollmentDate: productFields.ieltsEnrollment.date || null,
                remarks: productFields.ieltsEnrollment.remarks || null,
              };
              calls.push(
                createOrUpdate(
                  "IELTS_ENROLLMENT",
                  ieltsEntityData,
                  productFields.ieltsEnrollment.amount,
                ),
              );
            }
            if (productFields.loan && productFields.loan.amount > 0) {
              calls.push(
                createOrUpdate(
                  "LOAN_DETAILS",
                  productFields.loan,
                  productFields.loan.amount,
                ),
              );
            }
            if (productFields.forexFees && productFields.forexFees.amount > 0) {
              // Transform forexFees data: ensure side defaults to "PI", map date to feeDate
              const forexFeesEntityData = {
                ...productFields.forexFees,
                side: productFields.forexFees.side || "PI", // Default to "PI" if empty
                feeDate: productFields.forexFees.date || productFields.forexFees.feeDate || "",
                // Remove date from entityData, use feeDate instead
              };
              delete forexFeesEntityData.date; // Remove date, we use feeDate

              calls.push(
                createOrUpdate(
                  "FOREX_FEES",
                  forexFeesEntityData,
                  productFields.forexFees.amount,
                ),
              );
            }
            if (productFields.tuitionFee && productFields.tuitionFee.status) {
              // Transform tuitionFee data: map status to tutionFeesStatus (lowercase), map date to feeDate
              // Step 1: Get the status value
              let statusValue = productFields.tuitionFee.status || "";

              // Step 2: Convert to lowercase
              statusValue = statusValue.toLowerCase(); // "paid" or "pending" or "panding"

              // Step 3: Fix typo (handle legacy "panding" value)
              if (statusValue === "panding") {
                statusValue = "pending";
              }

              // Step 4: Validate (ensure it's "paid" or "pending")
              if (statusValue !== "paid" && statusValue !== "pending") {
                console.warn(`Invalid tuition fee status: ${statusValue}, defaulting to "pending"`);
                statusValue = "pending";
              }

              // Step 5: Create entityData with CORRECT field name
              const tuitionFeeEntityData = {
                ...productFields.tuitionFee,
                tutionFeesStatus: statusValue, // ✅ Correct field name + normalized lowercase value
                feeDate: productFields.tuitionFee.date || productFields.tuitionFee.feeDate || "",
                // Remove status and date from entityData, use tutionFeesStatus and feeDate instead
              };
              delete tuitionFeeEntityData.status; // Remove status, we use tutionFeesStatus
              delete tuitionFeeEntityData.date; // Remove date, we use feeDate

              calls.push(
                createOrUpdate("TUTION_FEES", tuitionFeeEntityData),
              );
            }
          }

          if (calls.length) {
            await Promise.all(calls);
            console.log("✓ Step 3: All product payments saved successfully");
          }
        }
      }
    }
    return true;
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
        <div className="max-w-4xl mx-auto pb-12 flex items-center justify-center min-h-[400px]">
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
            <p className="text-muted-foreground">Loading client data...</p>
          </div>
        </div>
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
        {/* <FormTextInput
          key={`name-${internalClientId || 'new'}`}
          name="name"
          control={control}
          label="Full Name"
          placeholder="e.g. Rahul Kumar"
        /> */}
        <FormTextInput
          name="name"
          control={control}
          label="Full Name"
          placeholder="Rahul Kumar"
          required
        />


        <FormDateInput
          key={`enrollmentDate-${internalClientId || 'new'}`}
          name="enrollmentDate"
          control={control}
          label="Enrollment Date"
          maxDate={new Date()}
        />
        <FormTextInput
          key={`passportDetails-${internalClientId || 'new'}`}
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
        <FormCurrencyInput
          name="totalPayment"
          control={control}
          label="Total Payment"
          placeholder="Enter total payment amount"
          data-testid="input-total-payment"
        />

        {/* Initial Amount Received Section */}
        <div className="space-y-4">
          <FormSwitchInput
            name="showInitialPayment"
            control={control}
            label="Add Initial Amount Received"
          />
          {showInitialPayment && (
            <FinancialEntry
              control={control}
              name="initialPayment"
              label="Initial Amount Received"
              hasRemarks={true}
              amountPlaceholder="Enter initial amount"
            />
          )}
        </div>

        {/* Before Visa Payment Section */}
        <div className="space-y-4">
          <FormSwitchInput
            name="showBeforeVisaPayment"
            control={control}
            label="Add Before Visa Payment"
          />
          {showBeforeVisaPayment && (
            <FinancialEntry
              control={control}
              name="beforeVisaPayment"
              label="Before Visa Payment"
              hasRemarks={true}
              amountPlaceholder="Enter before visa payment amount"
            />
          )}
        </div>

        {/* After Visa Payment Section */}
        <div className="space-y-4">
          <FormSwitchInput
            name="showAfterVisaPayment"
            control={control}
            label="Add After Visa Payment"
          />
          {showAfterVisaPayment && (
            <FinancialEntry
              control={control}
              name="afterVisaPayment"
              label="After Visa Payment"
              hasRemarks={true}
              amountPlaceholder="Enter after visa payment amount"
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
        // Disable fields if partial payment is active AND not yet approved, OR if approval status is pending
        // Fields are enabled when: approvalStatus === "approved" OR (not partial payment)
        const isFinanceDisabled = product.id === "financeAndEmployment" &&
          ((isPartialPayment && approvalStatus !== "approved") || approvalStatus === "pending");
        return (
          <FinancialEntry
            control={control}
            name={`productFields.${product.id}` as any}
            label={product.name}
            hasRemarks={true}
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
                  // Products that allow multiple instances
                  const allowMultipleInstances = ["otherProduct", "trvExtension"];
                  const isAlreadyAdded = allowMultipleInstances.includes(product.id)
                    ? false // Always allow adding multiple instances
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
            // Check if this product allows multiple instances
            const allowMultiple = product.id === "otherProduct" || product.id === "trvExtension";
            // Count instances of this product
            const instanceCount = addedProducts.filter(p => p.id === product.id).length;
            const instanceNumber = addedProducts
              .filter(p => p.id === product.id)
              .findIndex(p => p.instanceKey === product.instanceKey) + 1;
            const showInstanceNumber = instanceCount > 1;

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
                            console.log("[Partial Payment] Button clicked");
                            const newPartialPaymentState = !isPartialPayment;
                            console.log("[Partial Payment] New state:", newPartialPaymentState, "Current state:", isPartialPayment);

                            // If enabling partial payment, save immediately
                            if (newPartialPaymentState) {
                              console.log("[Partial Payment] Enabling partial payment, starting save process...");

                              // Get current form data
                              const data = form.getValues();
                              const productFields = data.productFields as any;
                              const fieldData = productFields?.financeAndEmployment;

                              console.log("[Partial Payment] Form data:", { fieldData, internalClientId });

                              // Check if amount is entered
                              if (!fieldData?.amount || fieldData.amount <= 0) {
                                console.log("[Partial Payment] Validation failed: Amount not entered or <= 0");
                                toast({
                                  title: "Amount Required",
                                  description: "Please enter an amount before submitting for partial payment approval.",
                                  variant: "destructive",
                                });
                                return;
                              }

                              // Check if client is created
                              if (!internalClientId) {
                                console.log("[Partial Payment] Validation failed: Client not created");
                                toast({
                                  title: "Error",
                                  description: "Please create the client first.",
                                  variant: "destructive",
                                });
                                return;
                              }

                              console.log("[Partial Payment] Validation passed, proceeding with API call...");

                              // Disable button while saving
                              setIsSubmitting(true);

                              try {
                                const clientId = internalClientId || (window as any).currentClientId;

                                // Prepare entityData with partialPayment flag
                                // For ALL_FINANCE_EMPLOYEMENT, entityData should have: amount, paymentDate, invoiceNo, remarks, partialPayment
                                const entityData = {
                                  amount: fieldData.amount,
                                  paymentDate: fieldData.date || fieldData.paymentDate || new Date().toISOString().split("T")[0],
                                  invoiceNo: fieldData.invoiceNo || "",
                                  remarks: fieldData.remarks || "",
                                  partialPayment: true,
                                };

                                // Check for existing product payment ID
                                const existingProductPaymentId = productPaymentIdsRef.current["ALL_FINANCE_EMPLOYEMENT"];

                                // For ALL_FINANCE_EMPLOYEMENT, top-level fields should be null, all data in entityData
                                const payload: any = {
                                  clientId: Number(clientId),
                                  productName: "ALL_FINANCE_EMPLOYEMENT",
                                  amount: null,
                                  paymentDate: null,
                                  invoiceNo: null,
                                  remarks: null,
                                  entityData,
                                };

                                // If we have an existing product payment ID, include it for update
                                if (existingProductPaymentId) {
                                  payload.productPaymentId = Number(existingProductPaymentId);
                                  payload.id = Number(existingProductPaymentId);
                                }

                                // Make API call
                                console.log("[Partial Payment] Making API call with payload:", payload);
                                const res = await api.post("/api/client-product-payments", payload);
                                console.log("[Partial Payment] API call successful, response:", res.data);

                                // Update productPaymentIds if we get a new ID back
                                const returnedPayment = res.data?.data?.productPayment || res.data?.data || res.data;
                                const newProductPaymentId = returnedPayment?.productPaymentId || returnedPayment?.id;

                                if (newProductPaymentId) {
                                  setProductPaymentIds((prev) => ({
                                    ...prev,
                                    "ALL_FINANCE_EMPLOYEMENT": newProductPaymentId,
                                  }));
                                }

                                // Update state
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
                                // Don't update state if save failed
                                return;
                              } finally {
                                setIsSubmitting(false);
                              }
                            } else {
                              // If disabling partial payment, just update state
                              setIsPartialPayment(false);
                              setApprovalStatus(null);
                              toast({
                                title: "Full Payment",
                                description: "Fields are now enabled. Payment will be auto-approved when saved.",
                              });
                            }
                          }}
                          disabled={approvalStatus === "pending" || isSubmitting}
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
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveProduct(product.instanceKey)}
                      className="text-destructive hover:text-destructive"
                    >
                      <X className="w-4 h-4 mr-1" />
                      Remove
                    </Button>
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

  // Old accordion-based product section (kept for reference but not used)
  const oldProductSection = (
    <div className="space-y-6">
      <Accordion
        type="multiple"
        className="w-full"
        defaultValue={["finance-employment", "common-services"]}
      >
        {/* Finance & Employment Section */}
        <AccordionItem value="finance-employment">
          <AccordionTrigger>Finance & Employment</AccordionTrigger>
          <AccordionContent className="pt-4 space-y-4">
            {/* All Finance & Employment (Base Fee) - All Products */}
            <FinancialEntry
              control={control}
              name="productFields.financeAndEmployment"
              label="All Finance & Employment"
            />

            {/* Indian Side Employment (Common) */}
            <FinancialEntry
              control={control}
              name="productFields.indianSideEmployment"
              label="Indian Side Employment"
            />

            {/* Spouse-Specific Finance Fields */}
            <FinancialEntry
              control={control}
              name="productFields.nocLevelJob"
              label="NOC Level Job Arrangement"
            />
            <FinancialEntry
              control={control}
              name="productFields.lawyerRefuge"
              label="Lawyer Refusal Charge"
            />
            <FinancialEntry
              control={control}
              name="productFields.onshorePartTime"
              label="Onshore Part-Time Employment"
            />

            {/* Visitor-Specific: Sponsor Charges */}
            <div className="p-4 border rounded-lg bg-muted/20 space-y-3">
              <Label className="text-base font-semibold">
                Sponsor Charges
              </Label>
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

            {/* Student-Specific: IELTS Enrollment */}
            <div className="p-4 border rounded-lg bg-muted/20 space-y-3">
              <Label className="text-base font-semibold">
                IELTS Enrollment
              </Label>
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

            {/* Student-Specific: Loan Details */}
            <div className="p-4 border rounded-lg bg-muted/20 space-y-3">
              <Label className="text-base font-semibold">
                Loan Details
              </Label>
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
          </AccordionContent>
        </AccordionItem>

        {/* Legal & Documentation Section (Spouse-Specific) */}
        <AccordionItem value="legal-documentation">
          <AccordionTrigger>Legal & Documentation</AccordionTrigger>
          <AccordionContent className="pt-4 space-y-4">
            {/* TRV Extension */}
            <div className="p-4 border rounded-lg bg-muted/20 space-y-3">
              <Label className="text-base font-semibold">
                TRV/ Work Permit Ext. / Study Permit Extension
              </Label>
              <div className="grid grid-cols-1 gap-4">
                <FormSelectInput
                  name="productFields.trvExtension.type"
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
                  name="productFields.trvExtension.amount"
                  control={control}
                  label="Amount"
                />
                <FormDateInput
                  name="productFields.trvExtension.date"
                  control={control}
                  label="Date"
                  maxDate={new Date()}
                />
                <FormTextInput
                  name="productFields.trvExtension.invoiceNo"
                  control={control}
                  label="Invoice No"
                />
              </div>
              <FormTextareaInput
                name="productFields.trvExtension.remarks"
                control={control}
                label="Remarks"
                placeholder="Add remark for this section..."
              />
            </div>

            <FinancialEntry
              control={control}
              name="productFields.marriagePhoto"
              label="Marriage Photo for Court Marriage"
            />
            <FinancialEntry
              control={control}
              name="productFields.marriageCertificate"
              label="Marriage Photo + Certificate (Common Law)"
            />

            <div className="p-4 border rounded-lg bg-muted/20 space-y-3">
              <Label className="text-base font-semibold">
                Recent Marriage / Relationship Affidavit
              </Label>
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

            <FinancialEntry
              control={control}
              name="productFields.judicialReview"
              label="Judicial Review Charge"
            />

            <FinancialEntry
              control={control}
              name="productFields.refusalCharges"
              label="Refusal Charges"
              hasRemarks={true}
            />

            <FinancialEntry
              control={control}
              name="productFields.kidsStudyPermit"
              label="Kids Study Permit"
              hasRemarks={true}
            />
          </AccordionContent>
        </AccordionItem>

        {/* Student-Specific Services */}
        <AccordionItem value="student-services">
          <AccordionTrigger>Student-Specific Services</AccordionTrigger>
          <AccordionContent className="pt-4 space-y-4">
            {/* Forex Card */}
            <div className="p-4 border rounded-lg bg-muted/20 space-y-3">
              <Label className="text-base font-semibold">
                Forex Card
              </Label>
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

            {/* Forex Fees */}
            <div className="p-4 border rounded-lg bg-muted/20 space-y-3">
              <Label className="text-base font-semibold">
                Forex Fees
              </Label>
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

            {/* Tuition Fee */}
            <div className="p-4 border rounded-lg bg-muted/20 space-y-3">
              <Label className="text-base font-semibold">
                Tuition Fee
              </Label>
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

            {/* Credit Card */}
            <div className="p-4 border rounded-lg bg-muted/20 space-y-3">
              <Label className="text-base font-semibold">
                Credit Card
              </Label>
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
          </AccordionContent>
        </AccordionItem>

        {/* Common Services Section */}
        <AccordionItem value="common-services">
          <AccordionTrigger>Common Services</AccordionTrigger>
          <AccordionContent className="pt-4 space-y-4">
            {/* SIM Card Activation */}
            <div className="p-4 border rounded-lg bg-muted/20 space-y-3">
              <Label className="text-base font-semibold">
                SIM Card Activation
              </Label>
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

            {/* Insurance */}
            <div className="p-4 border rounded-lg bg-muted/20 space-y-3">
              <Label className="text-base font-semibold">
                Insurance
              </Label>
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

            {/* Beacon Account */}
            <div className="p-4 border rounded-lg bg-muted/20 space-y-3">
              <Label className="text-base font-semibold">
                Beacon Account
              </Label>
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

            {/* Air Ticket */}
            <div className="p-4 border rounded-lg bg-muted/20 space-y-3">
              <Label className="text-base font-semibold">
                Air Ticket
              </Label>
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
                <FormDateInput
                  name="productFields.airTicket.date"
                  control={control}
                  label="Date"
                  maxDate={new Date()}
                />
                <FormTextInput
                  name="productFields.airTicket.invoiceNo"
                  control={control}
                  label="Invoice No"
                />
              </div>
              <FormTextareaInput
                name="productFields.airTicket.remarks"
                control={control}
                label="Remarks"
                placeholder="Air Ticket remarks..."
              />
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* Additional Services */}
        <AccordionItem value="additional-services">
          <AccordionTrigger>Additional Services</AccordionTrigger>
          <AccordionContent className="pt-4">
            <NewServiceSection
              control={control}
              namePrefix="productFields"
              title="New Services"
            />
          </AccordionContent>
        </AccordionItem>
      </Accordion>
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
            <CardFooter className="flex justify-end">
              <Button
                onClick={handleSaveService}
                disabled={isSubmitting || !hasServiceData}
                className="px-10 rounded-xl h-12 font-semibold bg-[#0061D1] hover:bg-[#0051B1] text-white disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  "Save Core Service"
                )}
              </Button>
            </CardFooter>
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
            <CardFooter className="flex justify-end">
              <Button
                onClick={handleSaveProduct}
                disabled={isSubmitting || !hasProductData}
                className="px-10 rounded-xl h-12 font-semibold bg-[#0061D1] hover:bg-[#0051B1] text-white disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  "Save Product"
                )}
              </Button>
            </CardFooter>
          </Card>
        )}
      </div>
    </PageWrapper>
  );
}
