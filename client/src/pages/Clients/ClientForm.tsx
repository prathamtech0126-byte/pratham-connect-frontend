import { PageWrapper } from "@/layout/PageWrapper";
import { MultiStepFormWrapper } from "@/components/form/MultiStepFormWrapper";
import { FormSection } from "@/components/form/FormSection";
import { FormTextInput } from "@/components/form/FormTextInput";
import { FormDateInput } from "@/components/form/FormDateInput";
import { FormSelectInput } from "@/components/form/FormSelectInput";
import { FormCurrencyInput } from "@/components/form/FormCurrencyInput";
import { FormSwitchInput } from "@/components/form/FormSwitchInput";
import { FormTextareaInput } from "@/components/form/FormTextareaInput";
import { FinancialEntry } from "@/components/form/FinancialEntry";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { clientService } from "@/services/clientService";
import { useAuth } from "@/context/auth-context";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import api from "@/lib/api";

// --- Schema Definitions ---

const financialEntrySchema = z.object({
  amount: z.number().optional(),
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
});

const newProductSchema = z.object({
  productName: z.string().optional(),
  date: z.string().optional(),
  amount: z.number().optional(),
  invoiceNo: z.string().optional(),
  remarks: z.string().optional()
});

// Product Specific Schemas
const spouseFieldsSchema = z.object({
  financeAndEmployment: financialEntrySchema,
  indianSideEmployment: financialEntrySchema,
  nocLevelJob: financialEntrySchema,
  lawyerRefuge: financialEntrySchema,
  trvExtension: trvExtensionSchema,
  onshorePartTime: financialEntrySchema,
  marriagePhoto: financialEntrySchema,
  marriageCertificate: financialEntrySchema,
  relationshipAffidavit: z.object({ 
    amount: z.number().optional(),
    date: z.string().optional(),
    invoiceNo: z.string().optional(),
    remarks: z.string().optional()
  }),
  judicialReview: financialEntrySchema,
  simCard: simCardSchema,
  insurance: insuranceSchema,
  myBeacon: beaconSchema,
  airTicket: airTicketSchema,
  newProduct: newProductSchema.optional(),
  financeRemarks: z.string().optional(),
  legalRemarks: z.string().optional(),
  servicesRemarks: z.string().optional(),
});

const visitorFieldsSchema = z.object({
  baseFee: financialEntrySchema,
  indianSideEmployment: financialEntrySchema,
  sponsorCharges: z.object({ 
    amount: z.number().optional(),
    remarks: z.string().optional()
  }),
  simCard: simCardSchema,
  insurance: insuranceSchema,
  airTicket: airTicketSchema,
  beaconAccount: beaconSchema,
  newProduct: newProductSchema.optional(),
  financeRemarks: z.string().optional(),
  servicesRemarks: z.string().optional(),
});

const studentFieldsSchema = z.object({
  financeAndEmployment: financialEntrySchema,
  indianSideEmployment: financialEntrySchema,
  ieltsEnrollment: z.object({
    isEnrolled: z.boolean().optional(),
    amount: z.number().optional(),
    date: z.string().optional(),
    remarks: z.string().optional(),
  }),
  loan: z.object({
    amount: z.number().optional(),
    disbursementDate: z.string().optional(),
    remarks: z.string().optional(),
  }),
  forex: z.object({
    isActivated: z.string().optional(),
    amount: z.number().optional(),
    currency: z.string().optional(),
    remarks: z.string().optional(),
  }).optional(),
  simCard: simCardSchema,
  beaconAccount: z.object({
    openingDate: z.string().optional(),
    fundingDate: z.string().optional(),
    cadAmount: z.number().optional(),
  }),
  creditCard: z.object({ info: z.string().optional() }),
  airTicket: airTicketSchema,
  insurance: z.object({
    amount: z.number().optional(),
    policyNo: z.string().optional(),
    date: z.string().optional(),
  }),
  newProduct: newProductSchema.optional(),
  financeRemarks: z.string().optional(),
  servicesRemarks: z.string().optional(),
});

const formSchema = z.object({
  // Step 1: Basic Details
  name: z
    .string({ required_error: "Please enter full name" })
    .min(1, "Please enter full name")
    .regex(/^[a-zA-Z]+ [a-zA-Z]+$/, "Please enter full name (First Last)"),
  enrollmentDate: z
    .string({ required_error: "Please select an enrollment date" })
    .min(1, "Please select an enrollment date"),
  salesType: z
    .string({ required_error: "Please select a sales type" })
    .min(1, "Please select a sales type"),

  // For "Other Product" selection
  selectedProductType: z.string().optional(),

  // Step 2: Consultancy Payment
  totalPayment: z.number().min(0),

  // Payment Groups using financialEntrySchema for consistency
  initialPayment: financialEntrySchema,
  beforeVisaPayment: financialEntrySchema,
  afterVisaPayment: financialEntrySchema,

  // amountPending is calculated
  amountPending: z.number().optional(),

  showDiscount: z.boolean().optional(),
  discount: z.number().min(0).optional(),
  discountRemarks: z.string().optional(),
  showExtraPayment: z.boolean().optional(),
  extraPayment: z.number().min(0).optional(),
  extraPaymentRemarks: z.string().optional(),

  // Step 3: Product Fields (Optional containers)
  spouseFields: spouseFieldsSchema.optional(),
  visitorFields: visitorFieldsSchema.optional(),
  studentFields: studentFieldsSchema.optional(),
});

type FormValues = z.infer<typeof formSchema>;

export default function ClientForm() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { user } = useAuth();

  const [dynamicOptions, setDynamicOptions] = useState<any[]>([]);
  const [allSaleTypes, setAllSaleTypes] = useState<any[]>([]);

  useEffect(() => {
    const fetchSaleTypes = async () => {
      try {
        const res = await api.get("/api/sale-types");
        const types = res.data.data || [];
        setAllSaleTypes(types);
        
        const coreOptions = types
          .filter((t: any) => t.isCoreProduct)
          .map((t: any) => ({ label: t.saleType, value: t.saleType }));
          
        const otherOptions = types
          .filter((t: any) => !t.isCoreProduct)
          .map((t: any) => ({ label: t.saleType, value: t.saleType }));

        setDynamicOptions([
          { label: "Core Product", options: coreOptions },
          { label: "Other Products", options: otherOptions }
        ]);
      } catch (err) {
        console.error("Failed to fetch sale types", err);
      }
    };
    fetchSaleTypes();
  }, []);

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
    if (lower.includes("visitor") || lower.includes("schengen")) return "visitor";
    if (lower.includes("student")) return "student";
    return null;
  };

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    mode: "onChange",
    defaultValues: {
      name: "",
      selectedProductType: "",
      totalPayment: 0,
      initialPayment: {},
      beforeVisaPayment: {},
      afterVisaPayment: {},
      amountPending: 0,
      showDiscount: false,
      showExtraPayment: false,
      spouseFields: {},
      visitorFields: {},
      studentFields: {},
    },
  });

  const {
    control,
    handleSubmit,
    setValue,
    watch,
    trigger,
    formState: { errors },
  } = form;
  const salesType = useWatch({ control, name: "salesType" });
  const selectedProductType = useWatch({
    control,
    name: "selectedProductType",
  });
  
  const totalPayment = useWatch({ control, name: "totalPayment" }) || 0;
  const initialPayment = useWatch({ control, name: "initialPayment" });
  const beforeVisaPayment = useWatch({ control, name: "beforeVisaPayment" });
  const afterVisaPayment = useWatch({ control, name: "afterVisaPayment" });

  const initialAmountReceived = initialPayment?.amount || 0;
  const beforeVisaAmount = beforeVisaPayment?.amount || 0;
  const afterVisaAmount = afterVisaPayment?.amount || 0;

  const calculatedPending =
    totalPayment - (initialAmountReceived + beforeVisaAmount + afterVisaAmount);

  const productType = getProductType(salesType, selectedProductType);

  const onSubmit = async (data: FormValues) => {
    try {
      const finalData = {
        ...data,
        amountPending: calculatedPending,
      };

      if (productType !== "spouse") delete finalData.spouseFields;
      if (productType !== "visitor") delete finalData.visitorFields;
      if (productType !== "student") delete finalData.studentFields;

      // @ts-ignore
      await clientService.createClient({
        ...finalData,
        status: "Active",
      });

      toast({
        title: "Success",
        description: "Client created successfully",
      });
      setLocation("/clients");
    } catch (error) {
      console.error(error);
      toast({
        title: "Error",
        description: "Failed to create client",
        variant: "destructive",
      });
    }
  };

  const buildSteps = () => {
    const basicStep = {
      id: "basic",
      title: "Basic Details",
      component: (
        <FormSection
          title="Client Information"
          description="Enter the basic details of the client"
        >
          <FormTextInput
            name="name"
            control={control}
            label="Full Name"
            placeholder="e.g. Rahul Kumar"
          />
          <FormDateInput
            name="enrollmentDate"
            control={control}
            label="Enrollment Date"
            maxDate={new Date()}
          />
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
          <FormCurrencyInput
            name="totalPayment"
            control={control}
            label="Total Payment"
          />

          <FinancialEntry
            control={control}
            name="initialPayment"
            label="Initial Amount Received"
            hasRemarks={true}
          />

          <FinancialEntry
            control={control}
            name="beforeVisaPayment"
            label="Before Visa Payment"
            hasRemarks={true}
          />

          <FinancialEntry
            control={control}
            name="afterVisaPayment"
            label="After Visa Payment"
            hasRemarks={true}
          />

          <div className="space-y-2">
            <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
              Amount Pending (Auto-calculated)
            </label>
            <div className="flex h-10 w-full rounded-md border border-input bg-muted px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50">
              ₹ {calculatedPending.toLocaleString()}
            </div>
          </div>
        </FormSection>
      ),
    };

    const NewProductSection = ({ prefix }: { prefix: "spouseFields.newProduct" | "visitorFields.newProduct" | "studentFields.newProduct" }) => (
      <div className="p-4 border rounded-lg bg-primary/5 border-primary/20 space-y-4">
        <Label className="text-base font-bold text-primary">
          New Product Sale
        </Label>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormTextInput
            name={`${prefix}.productName`}
            control={control}
            label="Product Information"
            placeholder="e.g. Flight Booking"
          />
          <FormDateInput
            name={`${prefix}.date`}
            control={control}
            label="Date"
            maxDate={new Date()}
          />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormCurrencyInput
            name={`${prefix}.amount`}
            control={control}
            label="Amount"
          />
          <FormTextInput
            name={`${prefix}.invoiceNo`}
            control={control}
            label="Invoice No"
          />
        </div>
        <FormTextareaInput
          name={`${prefix}.remarks`}
          control={control}
          label="Remarks"
          placeholder="Add product specific remarks..."
        />
      </div>
    );

    const productFieldsStep = {
      id: "product_fields",
      title: "Product Details",
      component: (
        <div className="space-y-6">
          {!productType && (
            <div className="text-center p-8 text-muted-foreground">
              Please select a Sales Type in Step 1 to view product fields.
            </div>
          )}

          {productType === "spouse" && (
            <div className="space-y-6">
              <Accordion type="single" collapsible defaultValue="spouse-finance" className="w-full">
                <AccordionItem value="spouse-finance">
                  <AccordionTrigger>Spouse - Finance & Employment</AccordionTrigger>
                  <AccordionContent className="pt-4 space-y-4">
                    <FinancialEntry control={control} name="spouseFields.financeAndEmployment" label="1. All Finance & Employment (Base Fee)" />
                    <FinancialEntry control={control} name="spouseFields.indianSideEmployment" label="2. India Side Employment" />
                    <FinancialEntry control={control} name="spouseFields.nocLevelJob" label="3. NOC Level Job Arrangement" />
                    <FinancialEntry control={control} name="spouseFields.lawyerRefuge" label="4. Lawyer Refusal Charge" />
                    <FinancialEntry control={control} name="spouseFields.onshorePartTime" label="5. Onshore Part-Time Employment" />
                    
                    <div className="p-4 border rounded-lg bg-muted/20 space-y-3">
                      <Label className="text-base font-semibold">6. TRV/ Work Permit Ext. / Study Permit Extension</Label>
                      <FormSelectInput
                        name="spouseFields.trvExtension.type"
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
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <FormCurrencyInput name="spouseFields.trvExtension.amount" control={control} label="Amount" />
                        <FormDateInput name="spouseFields.trvExtension.date" control={control} label="Date" maxDate={new Date()} />
                        <FormTextInput name="spouseFields.trvExtension.invoiceNo" control={control} label="Invoice No" />
                      </div>
                      <FormTextareaInput name="spouseFields.trvExtension.remarks" control={control} label="Remarks" />
                    </div>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="spouse-legal">
                  <AccordionTrigger>Spouse - Legal & Documentation</AccordionTrigger>
                  <AccordionContent className="pt-4 space-y-4">
                    <FinancialEntry control={control} name="spouseFields.marriagePhoto" label="8. Marriage Photo for Court Marriage" />
                    <FinancialEntry control={control} name="spouseFields.marriageCertificate" label="9. Marriage Photo + Certificate (Common Law)" />
                    
                    <div className="p-4 border rounded-lg bg-muted/20 space-y-3">
                      <Label className="text-base font-semibold">10. Recent Marriage / Relationship Affidavit</Label>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <FormCurrencyInput name="spouseFields.relationshipAffidavit.amount" control={control} label="Amount" />
                        <FormDateInput name="spouseFields.relationshipAffidavit.date" control={control} label="Date" maxDate={new Date()} />
                        <FormTextInput name="spouseFields.relationshipAffidavit.invoiceNo" control={control} label="Invoice No" />
                      </div>
                      <FormTextareaInput name="spouseFields.relationshipAffidavit.remarks" control={control} label="Remarks" />
                    </div>
                    <FinancialEntry control={control} name="spouseFields.judicialReview" label="11. Judicial Review Charge" />
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="spouse-services">
                  <AccordionTrigger>Spouse - Services & Settlement</AccordionTrigger>
                  <AccordionContent className="pt-4 space-y-4">
                    <div className="p-4 border rounded-lg bg-muted/20 space-y-3">
                      <Label className="text-base font-semibold">12. SIM Card Activation</Label>
                      <FormSelectInput
                        name="spouseFields.simCard.isActivated"
                        control={control}
                        label="Activated"
                        placeholder="Select Status"
                        options={[{ label: "Yes", value: "Yes" }, { label: "No", value: "No" }]}
                      />
                    </div>
                    <NewProductSection prefix="spouseFields.newProduct" />
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </div>
          )}

          {productType === "visitor" && (
            <div className="space-y-6">
              <Accordion type="single" collapsible defaultValue="visitor-finance" className="w-full">
                <AccordionItem value="visitor-finance">
                  <AccordionTrigger>Visitor - Fees & Employment</AccordionTrigger>
                  <AccordionContent className="pt-4 space-y-4">
                    <FinancialEntry control={control} name="visitorFields.baseFee" label="1. Visitor Base Fee" />
                    <FinancialEntry control={control} name="visitorFields.indianSideEmployment" label="2. India Side Employment" />
                    <div className="p-4 border rounded-lg bg-muted/20 space-y-3">
                      <Label className="text-base font-semibold">3. Sponsor Charges</Label>
                      <FormCurrencyInput name="visitorFields.sponsorCharges.amount" control={control} label="Amount" />
                      <FormTextareaInput name="visitorFields.sponsorCharges.remarks" control={control} label="Remarks" />
                    </div>
                    <NewProductSection prefix="visitorFields.newProduct" />
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </div>
          )}

          {productType === "student" && (
            <div className="space-y-6">
              <Accordion type="single" collapsible defaultValue="student-finance" className="w-full">
                <AccordionItem value="student-finance">
                  <AccordionTrigger>Student - Finance & Services</AccordionTrigger>
                  <AccordionContent className="pt-4 space-y-4">
                    <FinancialEntry control={control} name="studentFields.financeAndEmployment" label="1. Finance & Employment" />
                    <FinancialEntry control={control} name="studentFields.indianSideEmployment" label="2. Indian Side Employment" />
                    
                    <div className="p-4 border rounded-lg bg-muted/20 space-y-3">
                      <Label className="text-base font-semibold">3. IELTS Enrollment</Label>
                      <FormSelectInput
                        name="studentFields.ieltsEnrollment.isEnrolled"
                        control={control}
                        label="Enrolled"
                        placeholder="Select Status"
                        options={[{ label: "Yes", value: "Yes" }, { label: "No", value: "No" }]}
                      />
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormCurrencyInput name="studentFields.ieltsEnrollment.amount" control={control} label="Amount" />
                        <FormDateInput name="studentFields.ieltsEnrollment.date" control={control} label="Date" maxDate={new Date()} />
                      </div>
                      <FormTextareaInput name="studentFields.ieltsEnrollment.remarks" control={control} label="Remarks" />
                    </div>
                    
                    <div className="p-4 border rounded-lg bg-muted/20 space-y-3">
                      <Label className="text-base font-semibold">4. Loan Details</Label>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormCurrencyInput name="studentFields.loan.amount" control={control} label="Amount" />
                        <FormDateInput name="studentFields.loan.disbursementDate" control={control} label="Disbursement Date" maxDate={new Date()} />
                      </div>
                      <FormTextareaInput name="studentFields.loan.remarks" control={control} label="Remarks" />
                    </div>
                    
                    <NewProductSection prefix="studentFields.newProduct" />
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </div>
          )}
        </div>
      ),
    };

    const allSteps = [basicStep];
    const selectedTypeData = allSaleTypes.find(t => t.saleType === salesType);
    const isOtherProduct = selectedTypeData ? !selectedTypeData.isCoreProduct : false;

    if (isOtherProduct) {
      allSteps.push(productFieldsStep);
    } else if (salesType) {
      allSteps.push(consultancyStep);
      allSteps.push(productFieldsStep);
    }

    return allSteps;
  };

  const steps = buildSteps();

  const handleStepChange = async (currentStep: number, nextStep: number) => {
    if (nextStep > currentStep) {
      const stepId = steps[currentStep].id;
      let fieldsToValidate: any[] = [];

      if (stepId === "basic") {
        fieldsToValidate = ["name", "enrollmentDate", "salesType"];
      } else if (stepId === "consultancy") {
        fieldsToValidate = ["totalPayment"];
      }

      if (fieldsToValidate.length > 0) {
        const isValid = await trigger(fieldsToValidate as any);
        if (!isValid) {
          toast({
            title: "Validation Error",
            description: "Please fill in all required fields correctly.",
            variant: "destructive",
          });
          return false;
        }
      }
    }
    return true;
  };

  return (
    <PageWrapper
      title="Add New Client"
      breadcrumbs={[
        { label: "Clients", href: "/clients" },
        { label: "New Client" },
      ]}
    >
      <div className="max-w-4xl mx-auto pb-12">
        <MultiStepFormWrapper
          title="Client Registration"
          steps={steps}
          onSubmit={handleSubmit(onSubmit)}
          onStepChange={handleStepChange}
        />
      </div>
    </PageWrapper>
  );
}
