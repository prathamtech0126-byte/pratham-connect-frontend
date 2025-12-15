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
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";


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
});

const beaconSchema = z.object({
  openingDate: z.string().optional(),
  fundingDate: z.string().optional(),
  fundingAmount: z.number().optional(),
});

const airTicketSchema = z.object({
  isBooked: z.boolean().optional(),
  amount: z.number().optional(),
  invoiceNo: z.string().optional(),
  date: z.string().optional(),
});

const simCardSchema = z.object({
  isActivated: z.string().optional(),
  date: z.string().optional(),
  startDate: z.string().optional(),
});

const trvExtensionSchema = z.object({
  type: z.string().optional(),
  amount: z.number().optional(),
  date: z.string().optional(),
  invoiceNo: z.string().optional(),
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
  relationshipAffidavit: z.object({ amount: z.number().optional() }),
  judicialReview: financialEntrySchema,
  simCard: simCardSchema,
  insurance: insuranceSchema,
  myBeacon: beaconSchema,
  airTicket: airTicketSchema,
  financeRemarks: z.string().optional(),
  legalRemarks: z.string().optional(),
  servicesRemarks: z.string().optional(),
});

const visitorFieldsSchema = z.object({
  baseFee: financialEntrySchema,
  indianSideEmployment: financialEntrySchema,
  sponsorCharges: z.object({ amount: z.number().optional() }),
  simCard: simCardSchema,
  insurance: insuranceSchema,
  airTicket: airTicketSchema,
  beaconAccount: beaconSchema,
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
  }),
  loan: z.object({
    amount: z.number().optional(),
    disbursementDate: z.string().optional(),
  }),
  forex: z.boolean().optional(),
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
  financeRemarks: z.string().optional(),
  servicesRemarks: z.string().optional(),
});

const formSchema = z.object({
  // Step 1: Basic Details
  name: z.string().min(2, "Name is required"),
  enrollmentDate: z.string().min(1, "Date is required"),
  salesType: z.string({ required_error: "Sales Type is required" }),
  coreSales: z.string().optional(),

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

const salesTypeOptions = [
  { label: "Canada Student", value: "Canada Student" },
  { label: "Canada Onshore Student", value: "Canada Onshore Student" },
  { label: "UK Student", value: "UK Student" },
  { label: "Finland Student", value: "Finland Student" },
  { label: "USA Student", value: "USA Student" },
  { label: "Germany Student", value: "Germany Student" },
  { label: "Canada Spouse", value: "Canada Spouse" },
  { label: "UK Spouse", value: "UK Spouse" },
  { label: "Finland Spouse", value: "Finland Spouse" },
  { label: "UK Visitor", value: "UK Visitor" },
  { label: "Canada Visitor", value: "Canada Visitor" },
  { label: "USA Visitor", value: "USA Visitor" },
  { label: "Schengen Visitor", value: "Schengen Visitor" },
  { label: "SPOUSAL PR", value: "SPOUSAL PR" },
];

const getProductType = (
  salesType: string | undefined,
): "spouse" | "visitor" | "student" | null => {
  if (!salesType) return null;
  const lower = salesType.toLowerCase();
  if (lower.includes("spouse") || lower === "spousal pr") return "spouse";
  if (lower.includes("visitor") || lower.includes("schengen")) return "visitor";
  if (lower.includes("student")) return "student";
  return null;
};

export default function ClientForm() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      totalPayment: 0,
      initialPayment: {},
      beforeVisaPayment: {},
      afterVisaPayment: {},
      amountPending: 0,
      showDiscount: false,
      showExtraPayment: false,
      // Initialize sub-objects to avoid undefined errors in deep nested components if needed
      spouseFields: {},
      visitorFields: {},
      studentFields: {},
    },
  });

  const { control, handleSubmit, setValue, watch } = form;
  const salesType = useWatch({ control, name: "salesType" });
  const coreSales = useWatch({ control, name: "coreSales" });
  const showDiscount = useWatch({ control, name: "showDiscount" });
  const showExtraPayment = useWatch({ control, name: "showExtraPayment" });

  // Auto-calc pending amount
  const totalPayment = useWatch({ control, name: "totalPayment" }) || 0;
  const initialPayment = useWatch({ control, name: "initialPayment" });
  const initialAmountReceived = initialPayment?.amount || 0;
  const discount = useWatch({ control, name: "discount" }) || 0;
  const extraPayment = useWatch({ control, name: "extraPayment" }) || 0;

  // Effect to update pending amount
  // Formula: (Total + Extra) - (Initial + Discount)
  // Pending = (TotalPayment + ExtraPayment) - (InitialAmountReceived + Discount)
  const calculatedPending =
    totalPayment + extraPayment - (initialAmountReceived + discount);

  // We can just display this or set it in form state. Setting in form state is better for submission.
  // Using a useEffect to keep it in sync might cause re-renders but is safe for now.
  // Alternatively, just calculate it on render for display and on submit for data.
  // Let's set it in form so the input updates visually if we want it to be readonly.

  const productType = getProductType(salesType);


  const onSubmit = async (data: FormValues) => {
    try {
      // Clean up data before sending: only include relevant product fields
      const finalData = {
        ...data,
        amountPending: calculatedPending,
        // Map back to flat structure if backend expects it, or keep nested if backend is flexible.
        // Since we are in mockup mode and I don't see the backend schema, I'll assume nested is fine or I should flatten it if needed.
        // The original code had flat `initialAmountReceived`.
        // Let's keep it consistent with the schema changes.
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

  const steps = [
    {
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
          />
          <FormSelectInput
            name="salesType"
            control={control}
            label="Sales Type"
            options={salesTypeOptions}
          />
          <FormSelectInput
            name="coreSales"
            control={control}
            label="Core Sales"
            placeholder="Select Core Sale Options"
            options={[
              { label: "Yes", value: "Yes" },
              { label: "No", value: "No" },
            ]}
          />
        </FormSection>
      ),
    },
    {
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

          <div className="col-span-1 md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
            <div className="space-y-4 p-4 border rounded-lg">
              <FormSwitchInput
                name="showDiscount"
                control={control}
                label="Add Discount"
              />
              {showDiscount && (
                <div className="space-y-4">
                  <FormCurrencyInput
                    name="discount"
                    control={control}
                    label="Discount Amount"
                  />
                  <FormTextareaInput
                    name="discountRemarks"
                    control={control}
                    label="Remarks"
                    placeholder="Reason for discount..."
                  />
                </div>
              )}
            </div>
            <div className="space-y-4 p-4 border rounded-lg">
              <FormSwitchInput
                name="showExtraPayment"
                control={control}
                label="Add Extra Payment"
              />
              {showExtraPayment && (
                <div className="space-y-4">
                  <FormCurrencyInput
                    name="extraPayment"
                    control={control}
                    label="Extra Payment Amount"
                  />
                  <FormTextareaInput
                    name="extraPaymentRemarks"
                    control={control}
                    label="Remarks"
                    placeholder="Reason for extra payment..."
                  />
                </div>
              )}
            </div>
          </div>
        </FormSection>
      ),
    },
    {
      id: "product_fields",
      title: "Product Details",
      component: (
        <div className="space-y-6">
          {!productType && (
            <div className="text-center p-8 text-muted-foreground">
              Please select a Sales Type in Step 1 to view product fields.
            </div>
          )}

          {/* PRODUCT A — SPOUSE VISA */}
          {productType === "spouse" && (
            <div className="space-y-6">
              <div className="bg-primary/10 p-4 rounded-md mb-4 border border-primary/20">
                <h3 className="font-semibold text-primary">
                  Spouse Visa Configuration
                </h3>
                <p className="text-sm text-muted-foreground">
                  Base Fee: ₹75,000 (Fixed)
                </p>
              </div>

              <Accordion
                type="single"
                collapsible
                defaultValue="finance"
                className="w-full"
              >
                <AccordionItem value="finance">
                  <AccordionTrigger>Finance & Employment</AccordionTrigger>
                  <AccordionContent className="pt-4 space-y-4">
                    <FinancialEntry
                      control={control}
                      name="spouseFields.financeAndEmployment"
                      label="1. All Finance & Employment (Base Fee)"
                    />
                    <FinancialEntry
                      control={control}
                      name="spouseFields.indianSideEmployment"
                      label="2. Indian Side Employment"
                    />
                    <FinancialEntry
                      control={control}
                      name="spouseFields.nocLevelJob"
                      label="3. NOC Level Job Arrangement"
                    />
                    <FinancialEntry
                      control={control}
                      name="spouseFields.lawyerRefuge"
                      label="4. Lawyer Refuge Charge"
                    />

                    <FinancialEntry
                      control={control}
                      name="spouseFields.onshorePartTime"
                      label="5. Onshore Part-Time Employment"
                    />

                    {/* Item 6 - TRV Dropdown */}
                    <div className="col-span-1 md:col-span-2 space-y-3 p-4 border rounded-lg bg-muted/20">
                      <Label className="text-base font-semibold">
                        6. TRV/ Work Permit Ext. / Study Permit Extension
                      </Label>
                      <div className="grid grid-cols-1 gap-4">
                        <FormSelectInput
                          name="spouseFields.trvExtension.type"
                          control={control}
                          label="Type"
                          placeholder="Select Type"
                          options={[
                            { label: "TRV", value: "TRV" },
                            {
                              label: "Study Permit Ext.",
                              value: "Study Permit Ext.",
                            },
                            {
                              label: "Work Permit Ext.",
                              value: "Work Permit Ext.",
                            },
                            { label: "PGWP", value: "PGWP" },
                            {
                              label: "Visitor Record",
                              value: "Visitor Record",
                            },
                          ]}
                        />
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <FormCurrencyInput
                          name="spouseFields.trvExtension.amount"
                          control={control}
                          label="Amount"
                        />
                        <FormDateInput
                          name="spouseFields.trvExtension.date"
                          control={control}
                          label="Date"
                        />
                        <FormTextInput
                          name="spouseFields.trvExtension.invoiceNo"
                          control={control}
                          label="Invoice No"
                        />
                      </div>
                    </div>
                    <div className="p-4 border rounded-lg bg-muted/20 mt-4">
                      <FormTextareaInput
                        name="spouseFields.financeRemarks"
                        control={control}
                        label="Remarks"
                        placeholder="Add remarks for Finance & Employment section..."
                      />
                    </div>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="legal">
                  <AccordionTrigger>Legal & Documentation</AccordionTrigger>
                  <AccordionContent className="pt-4 space-y-4">
                    <FinancialEntry
                      control={control}
                      name="spouseFields.marriagePhoto"
                      label="8. Marriage Photo for Court Marriage"
                    />
                    <FinancialEntry
                      control={control}
                      name="spouseFields.marriageCertificate"
                      label="9. Marriage Photo + Certificate (Common Law)"
                    />

                    <div className="col-span-1 md:col-span-2 space-y-3 p-4 border rounded-lg bg-muted/20">
                      <Label className="text-base font-semibold">
                        10. Recent Marriage / Relationship Affidavit
                      </Label>
                      <FormCurrencyInput
                        name="spouseFields.relationshipAffidavit.amount"
                        control={control}
                        label="Amount"
                      />
                    </div>

                    <FinancialEntry
                      control={control}
                      name="spouseFields.judicialReview"
                      label="11. Judicial Review Charge"
                    />
                    <div className="p-4 border rounded-lg bg-muted/20 mt-4">
                      <FormTextareaInput
                        name="spouseFields.legalRemarks"
                        control={control}
                        label="Remarks"
                        placeholder="Add remarks for Legal & Documentation section..."
                      />
                    </div>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="services">
                  <AccordionTrigger>Services & Settlement</AccordionTrigger>
                  <AccordionContent className="pt-4 space-y-4">
                    <div className="p-4 border rounded-lg bg-muted/20 space-y-3">
                      <Label className="text-base font-semibold">
                        12. SIM Card Activation
                      </Label>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                        <FormSelectInput
                          name="spouseFields.simCard.isActivated"
                          control={control}
                          label="Activated"
                          placeholder="Select Status"
                          options={[
                            { label: "Yes", value: "Yes" },
                            { label: "No", value: "No" },
                          ]}
                        />
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormDateInput
                          name="spouseFields.simCard.date"
                          control={control}
                          label="Sim Card Giving Date"
                        />
                        <FormDateInput
                          name="spouseFields.simCard.startDate"
                          control={control}
                          label="Activation Date"
                        />
                      </div>
                    </div>

                    <div className="p-4 border rounded-lg bg-muted/20 space-y-3">
                      <Label className="text-base font-semibold">
                        13. Insurance
                      </Label>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <FormCurrencyInput
                          name="spouseFields.insurance.amount"
                          control={control}
                          label="Amount"
                        />
                        <FormTextInput
                          name="spouseFields.insurance.insuranceNo"
                          control={control}
                          label="Insurance No"
                        />
                        <FormDateInput
                          name="spouseFields.insurance.date"
                          control={control}
                          label="Date"
                        />
                      </div>
                    </div>

                    <div className="p-4 border rounded-lg bg-muted/20 space-y-3">
                      <Label className="text-base font-semibold">
                        14. My Beacon Account
                      </Label>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <FormDateInput
                          name="spouseFields.myBeacon.openingDate"
                          control={control}
                          label="Opening Date"
                        />
                        <FormDateInput
                          name="spouseFields.myBeacon.fundingDate"
                          control={control}
                          label="Funding Date"
                        />
                        <FormCurrencyInput
                          name="spouseFields.myBeacon.fundingAmount"
                          control={control}
                          label="Funding Amount (CAD)"
                        />
                      </div>
                    </div>

                    <div className="p-4 border rounded-lg bg-muted/20 space-y-3">
                      <Label className="text-base font-semibold">
                        15. Air Ticket
                      </Label>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                        <FormSwitchInput
                          name="spouseFields.airTicket.isBooked"
                          control={control}
                          label="Ticket Booked"
                        />
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <FormCurrencyInput
                          name="spouseFields.airTicket.amount"
                          control={control}
                          label="Amount"
                        />
                        <FormTextInput
                          name="spouseFields.airTicket.invoiceNo"
                          control={control}
                          label="Invoice No"
                        />
                        <FormDateInput
                          name="spouseFields.airTicket.date"
                          control={control}
                          label="Date"
                        />
                      </div>
                    </div>
                    <div className="p-4 border rounded-lg bg-muted/20 mt-4">
                      <FormTextareaInput
                        name="spouseFields.servicesRemarks"
                        control={control}
                        label="Remarks"
                        placeholder="Add remarks for Services & Settlement section..."
                      />
                    </div>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </div>
          )}

          {/* PRODUCT B — VISITOR VISA */}
          {productType === "visitor" && (
            <div className="space-y-6">
              <div className="bg-primary/10 p-4 rounded-md mb-4 border border-primary/20">
                <h3 className="font-semibold text-primary">
                  Visitor Visa Configuration
                </h3>
                <p className="text-sm text-muted-foreground">
                  Base Fee: ₹49,000 (Fixed)
                </p>
              </div>

              <Accordion
                type="single"
                collapsible
                defaultValue="main"
                className="w-full"
              >
                <AccordionItem value="main">
                  <AccordionTrigger>Visitor Fees & Employment</AccordionTrigger>
                  <AccordionContent className="pt-4 space-y-4">
                    <FinancialEntry
                      control={control}
                      name="visitorFields.baseFee"
                      label="1. Base Fee (All Finance & Employment)"
                    />

                    <FinancialEntry
                      control={control}
                      name="visitorFields.indianSideEmployment"
                      label="2. Indian Side Employment (₹6,000/yr)"
                    />

                    <div className="p-4 border rounded-lg bg-muted/20 space-y-3">
                      <Label className="text-base font-semibold">
                        3. Sponsor Charges
                      </Label>
                      <FormCurrencyInput
                        name="visitorFields.sponsorCharges.amount"
                        control={control}
                        label="Amount (₹10,000 + GST)"
                      />
                    </div>
                    <div className="p-4 border rounded-lg bg-muted/20 mt-4">
                      <FormTextareaInput
                        name="visitorFields.financeRemarks"
                        control={control}
                        label="Remarks"
                        placeholder="Add remarks for Visitor Fees & Employment section..."
                      />
                    </div>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="services">
                  <AccordionTrigger>Additional Services</AccordionTrigger>
                  <AccordionContent className="pt-4 space-y-4">
                    <div className="p-4 border rounded-lg bg-muted/20 space-y-3">
                      <Label className="text-base font-semibold">
                        4. SIM Card Activation
                      </Label>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                        <FormSelectInput
                          name="visitorFields.simCard.isActivated"
                          control={control}
                          label="Activated"
                          placeholder="Select Status"
                          options={[
                            { label: "Yes", value: "Yes" },
                            { label: "No", value: "No" },
                          ]}
                        />
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormDateInput
                          name="visitorFields.simCard.date"
                          control={control}
                          label="Activation Date"
                        />
                        <FormDateInput
                          name="visitorFields.simCard.startDate"
                          control={control}
                          label="Usage Start Date"
                        />
                      </div>
                    </div>

                    <div className="p-4 border rounded-lg bg-muted/20 space-y-3">
                      <Label className="text-base font-semibold">
                        5. Insurance
                      </Label>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <FormCurrencyInput
                          name="visitorFields.insurance.amount"
                          control={control}
                          label="Amount"
                        />
                        <FormTextInput
                          name="visitorFields.insurance.insuranceNo"
                          control={control}
                          label="Insurance No"
                        />
                        <FormDateInput
                          name="visitorFields.insurance.date"
                          control={control}
                          label="Date"
                        />
                      </div>
                    </div>

                    <div className="p-4 border rounded-lg bg-muted/20 space-y-3">
                      <Label className="text-base font-semibold">
                        6. Air Ticket
                      </Label>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                        <FormSwitchInput
                          name="visitorFields.airTicket.isBooked"
                          control={control}
                          label="Ticket Booked"
                        />
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <FormCurrencyInput
                          name="visitorFields.airTicket.amount"
                          control={control}
                          label="Amount"
                        />
                        <FormTextInput
                          name="visitorFields.airTicket.invoiceNo"
                          control={control}
                          label="Invoice No"
                        />
                        <FormDateInput
                          name="visitorFields.airTicket.date"
                          control={control}
                          label="Date"
                        />
                      </div>
                    </div>

                    <div className="p-4 border rounded-lg bg-muted/20 space-y-3">
                      <Label className="text-base font-semibold">
                        7. Beacon Account
                      </Label>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <FormDateInput
                          name="visitorFields.beaconAccount.openingDate"
                          control={control}
                          label="Opening Date"
                        />
                        <FormDateInput
                          name="visitorFields.beaconAccount.fundingDate"
                          control={control}
                          label="Funding Date"
                        />
                        <FormCurrencyInput
                          name="visitorFields.beaconAccount.fundingAmount"
                          control={control}
                          label="Funding Amount (CAD)"
                        />
                      </div>
                    </div>
                    <div className="p-4 border rounded-lg bg-muted/20 mt-4">
                      <FormTextareaInput
                        name="visitorFields.servicesRemarks"
                        control={control}
                        label="Remarks"
                        placeholder="Add remarks for Additional Services section..."
                      />
                    </div>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </div>
          )}

          {/* PRODUCT C — STUDENT VISA */}
          {productType === "student" && (
            <div className="space-y-6">
              <div className="bg-primary/10 p-4 rounded-md mb-4 border border-primary/20">
                <h3 className="font-semibold text-primary">
                  Student Visa Configuration
                </h3>
                <p className="text-sm text-muted-foreground">
                  Base Fee: ₹12,000 (Fixed)
                </p>
              </div>

              <Accordion
                type="single"
                collapsible
                defaultValue="main"
                className="w-full"
              >
                <AccordionItem value="main">
                  <AccordionTrigger>Student Fees & Employment</AccordionTrigger>
                  <AccordionContent className="pt-4 space-y-4">
                    <FinancialEntry
                      control={control}
                      name="studentFields.financeAndEmployment"
                      label="1. All Finance & Employment"
                    />

                    <FinancialEntry
                      control={control}
                      name="studentFields.indianSideEmployment"
                      label="2. Indian Side Employment (₹6,000/yr)"
                    />

                    <div className="p-4 border rounded-lg bg-muted/20 space-y-3">
                      <Label className="text-base font-semibold">
                        3. IELTS Enrollment
                      </Label>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                        <FormSwitchInput
                          name="studentFields.ieltsEnrollment.isEnrolled"
                          control={control}
                          label="Is Enrolled"
                        />
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormCurrencyInput
                          name="studentFields.ieltsEnrollment.amount"
                          control={control}
                          label="Payment Amount"
                        />
                        <FormDateInput
                          name="studentFields.ieltsEnrollment.date"
                          control={control}
                          label="Date"
                        />
                      </div>
                    </div>

                    <div className="p-4 border rounded-lg bg-muted/20 space-y-3">
                      <Label className="text-base font-semibold">4. Loan</Label>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormCurrencyInput
                          name="studentFields.loan.amount"
                          control={control}
                          label="Loan Amount"
                        />
                        <FormDateInput
                          name="studentFields.loan.disbursementDate"
                          control={control}
                          label="Disbursement Date"
                        />
                      </div>
                    </div>

                    <div className="p-4 border rounded-lg bg-muted/20">
                      <FormSwitchInput
                        name="studentFields.forex"
                        control={control}
                        label="5. Forex"
                      />
                    </div>
                    <div className="p-4 border rounded-lg bg-muted/20 mt-4">
                      <FormTextareaInput
                        name="studentFields.financeRemarks"
                        control={control}
                        label="Remarks"
                        placeholder="Add remarks for Student Fees & Employment section..."
                      />
                    </div>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="services">
                  <AccordionTrigger>Additional Services</AccordionTrigger>
                  <AccordionContent className="pt-4 space-y-4">
                    <div className="p-4 border rounded-lg bg-muted/20 space-y-3">
                      <Label className="text-base font-semibold">
                        6. SIM Card Activation
                      </Label>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                        <FormSelectInput
                          name="studentFields.simCard.isActivated"
                          control={control}
                          label="Activated"
                          placeholder="Select Status"
                          options={[
                            { label: "Yes", value: "Yes" },
                            { label: "No", value: "No" },
                          ]}
                        />
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormDateInput
                          name="studentFields.simCard.date"
                          control={control}
                          label="Activation Date"
                        />
                        <FormDateInput
                          name="studentFields.simCard.startDate"
                          control={control}
                          label="Usage Start Date"
                        />
                      </div>
                    </div>

                    <div className="p-4 border rounded-lg bg-muted/20 space-y-3">
                      <Label className="text-base font-semibold">
                        7. Beacon Account
                      </Label>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <FormDateInput
                          name="studentFields.beaconAccount.openingDate"
                          control={control}
                          label="Opening Date"
                        />
                        <FormDateInput
                          name="studentFields.beaconAccount.fundingDate"
                          control={control}
                          label="Funding Date"
                        />
                        <FormCurrencyInput
                          name="studentFields.beaconAccount.cadAmount"
                          control={control}
                          label="CAD Amount"
                        />
                      </div>
                    </div>

                    <div className="p-4 border rounded-lg bg-muted/20 space-y-3">
                      <Label className="text-base font-semibold">
                        8. Credit Card Account
                      </Label>
                      <FormTextInput
                        name="studentFields.creditCard.info"
                        control={control}
                        label="Credit Card Info"
                      />
                    </div>

                    <div className="p-4 border rounded-lg bg-muted/20 space-y-3">
                      <Label className="text-base font-semibold">
                        9. Air Ticket
                      </Label>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                        <FormSwitchInput
                          name="studentFields.airTicket.isBooked"
                          control={control}
                          label="Ticket Booked"
                        />
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <FormCurrencyInput
                          name="studentFields.airTicket.amount"
                          control={control}
                          label="Amount"
                        />
                        <FormTextInput
                          name="studentFields.airTicket.invoiceNo"
                          control={control}
                          label="Invoice No"
                        />
                        <FormDateInput
                          name="studentFields.airTicket.date"
                          control={control}
                          label="Date"
                        />
                      </div>
                    </div>

                    <div className="p-4 border rounded-lg bg-muted/20 space-y-3">
                      <Label className="text-base font-semibold">
                        10. Insurance
                      </Label>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <FormCurrencyInput
                          name="studentFields.insurance.amount"
                          control={control}
                          label="Amount"
                        />
                        <FormTextInput
                          name="studentFields.insurance.policyNo"
                          control={control}
                          label="Policy No"
                        />
                        <FormDateInput
                          name="studentFields.insurance.date"
                          control={control}
                          label="Date"
                        />
                      </div>
                    </div>
                    <div className="p-4 border rounded-lg bg-muted/20 mt-4">
                      <FormTextareaInput
                        name="studentFields.servicesRemarks"
                        control={control}
                        label="Remarks"
                        placeholder="Add remarks for Additional Services section..."
                      />
                    </div>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </div>
          )}
        </div>
      ),
    },
  ];

  let filteredSteps = steps;
  if (coreSales === "Yes") {
    filteredSteps = steps.filter(
      (step) => step.id === "basic" || step.id === "consultancy"
    );
  } else if (coreSales === "No") {
    filteredSteps = steps.filter(
      (step) => step.id === "basic" || step.id === "product_fields"
    );
  }

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
          steps={filteredSteps}
          onSubmit={handleSubmit(onSubmit)}
        />
      </div>
    </PageWrapper>
  );
}
