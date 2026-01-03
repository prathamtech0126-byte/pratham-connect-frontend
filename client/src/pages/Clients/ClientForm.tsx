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
import { useForm, useWatch, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { clientService } from "@/services/clientService";
import { useAuth } from "@/context/auth-context";
import { Plus, Trash2 } from "lucide-react";
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

const newServiceSchema = z.object({
  serviceName: z.string().optional(),
  serviceInfo: z.string().optional(),
  amount: z.number().optional(),
  date: z.string().optional(),
  invoiceNo: z.string().optional(),
  remark: z.string().optional(),
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
    remarks: z.string().optional(),
  }),
  judicialReview: financialEntrySchema,
  simCard: simCardSchema,
  insurance: insuranceSchema,
  myBeacon: beaconSchema,
  airTicket: airTicketSchema,
  financeRemarks: z.string().optional(),
  legalRemarks: z.string().optional(),
  servicesRemarks: z.string().optional(),
  newServices: z.array(newServiceSchema).optional(),
});

const visitorFieldsSchema = z.object({
  baseFee: financialEntrySchema,
  indianSideEmployment: financialEntrySchema,
  sponsorCharges: z.object({
    amount: z.number().optional(),
    remarks: z.string().optional(),
  }),
  simCard: simCardSchema,
  insurance: insuranceSchema,
  airTicket: airTicketSchema,
  beaconAccount: beaconSchema,
  financeRemarks: z.string().optional(),
  servicesRemarks: z.string().optional(),
  newServices: z.array(newServiceSchema).optional(),
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
  forexCard: z
    .object({
      isActivated: z.string().optional(),
      date: z.string().optional(),
      remarks: z.string().optional(),
    })
    .optional(),
  forexFees: z
    .object({
      side: z.string().optional(),
      amount: z.number().optional(),
      date: z.string().optional(),
      remarks: z.string().optional(),
    })
    .optional(),
  tuitionFee: z
    .object({
      status: z.string().optional(),
      date: z.string().optional(),
      remarks: z.string().optional(),
    })
    .optional(),
  simCard: simCardSchema,
  beaconAccount: z.object({
    openingDate: z.string().optional(),
    fundingDate: z.string().optional(),
    cadAmount: z.number().optional(),
    remarks: z.string().optional(),
  }),
  creditCard: z.object({ 
    info: z.string().optional(),
    remarks: z.string().optional(),
  }),
  airTicket: airTicketSchema,
  insurance: z.object({
    amount: z.number().optional(),
    policyNo: z.string().optional(),
    date: z.string().optional(),
    remarks: z.string().optional(),
  }),
  financeRemarks: z.string().optional(),
  servicesRemarks: z.string().optional(),
  newServices: z.array(newServiceSchema).optional(),
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
        <div key={field.id} className="p-4 border rounded-lg bg-primary/5 space-y-3 relative group">
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
              label="Amount (Optional)"
            />
            <FormDateInput
              name={`${namePrefix}.newServices.${index}.date`}
              control={control}
              label="Date (Optional)"
              maxDate={new Date()}
            />
            <FormTextInput
              name={`${namePrefix}.newServices.${index}.invoiceNo`}
              control={control}
              label="Invoice No (Optional)"
              placeholder="INV-000"
            />
          </div>
          <FormTextareaInput
            name={`${namePrefix}.newServices.${index}.remark`}
            control={control}
            label="Remark (Optional)"
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

  const [dynamicOptions, setDynamicOptions] = useState<any[]>([]);
  const [allSaleTypes, setAllSaleTypes] = useState<any[]>([]);
  const [paymentIds, setPaymentIds] = useState<Record<string, number>>({});
  const [internalClientId, setInternalClientId] = useState<number | null>(null);

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
          { label: "Other Products", options: otherOptions },
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

    if (lower === "other product") {
      if (selectedProductType === "spouse") return "spouse";
      if (selectedProductType === "visitor") return "visitor";
      if (selectedProductType === "student") return "student";
      return null;
    }

    if (lower.includes("spouse") || lower === "spousal pr") return "spouse";
    if (lower.includes("visitor") || lower.includes("schengen"))
      return "visitor";
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
      spouseFields: { newServices: [] },
      visitorFields: { newServices: [] },
      studentFields: { newServices: [] },
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

  useEffect(() => {
    if (salesType) {
      const selectedTypeData = allSaleTypes.find(
        (t) => t.saleType === salesType,
      );
      if (selectedTypeData && selectedTypeData.amount) {
        setValue("totalPayment", Number(selectedTypeData.amount));
      }
    }
  }, [salesType, allSaleTypes, setValue]);

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
      const selectedTypeData = allSaleTypes.find(
        (t) => t.saleType === data.salesType,
      );

      const clientPayload = {
        fullName: data.name,
        enrollmentDate: data.enrollmentDate,
        saleTypeId: selectedTypeData?.id,
        counsellorId: user?.id || 2,
        status: "Active",
      };

      const clientRes = await api.post("/api/clients", clientPayload);
      const clientId = clientRes.data.data.clientId;

      const isCoreProduct = selectedTypeData?.isCoreProduct ?? true;

      if (isCoreProduct) {
        const paymentStages = [
          { key: "initialPayment", stage: "INITIAL" },
          { key: "beforeVisaPayment", stage: "BEFORE_VISA" },
          { key: "afterVisaPayment", stage: "AFTER_VISA" },
        ];

        const paymentPromises = paymentStages
          .filter(item => {
            const paymentData = (data as any)[item.key];
            return paymentData?.amount && paymentData.amount > 0;
          })
          .map(async (item) => {
            const paymentData = (data as any)[item.key];
            const existingId = paymentIds[item.key];

            const payload: any = {
              clientId: clientId,
              totalPayment: String(data.totalPayment),
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
            const returnedPayment = res.data?.data?.payment || res.data?.data || res.data;
            const newPaymentId = returnedPayment?.paymentId || returnedPayment?.id;

            if (newPaymentId) {
              setPaymentIds(prev => ({ ...prev, [item.key]: newPaymentId }));
            }
            return res;
          });

        if (paymentPromises.length > 0) {
          await Promise.all(paymentPromises);
        }
      }

      const updatePayload: any = {};
      if (productType === "spouse")
        updatePayload.spouseFields = data.spouseFields;
      if (productType === "visitor")
        updatePayload.visitorFields = data.visitorFields;
      if (productType === "student")
        updatePayload.studentFields = data.studentFields;

      if (Object.keys(updatePayload).length > 0) {
        const cleanProductFields = (fields: any) => {
          if (fields?.newServices) {
            fields.newServices = fields.newServices.map((service: any) => ({
              ...service,
              amount: service.amount || undefined,
              date: service.date || undefined,
              invoiceNo: service.invoiceNo || undefined,
              remark: service.remark || undefined,
            }));
          }
          return fields;
        };

        if (updatePayload.spouseFields) updatePayload.spouseFields = cleanProductFields(updatePayload.spouseFields);
        if (updatePayload.visitorFields) updatePayload.visitorFields = cleanProductFields(updatePayload.visitorFields);
        if (updatePayload.studentFields) updatePayload.studentFields = cleanProductFields(updatePayload.studentFields);

        await api.patch(`/api/clients/${clientId}`, updatePayload);
      }

      toast({
        title: "Success",
        description: "Client and payments created successfully",
      });
      setLocation("/clients");
    } catch (error) {
      console.error(error);
      toast({
        title: "Error",
        description: "Failed to create client or payments",
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
            <label className="text-sm font-medium leading-none">
              Amount Pending (Auto-calculated)
            </label>
            <div className="flex h-10 w-full rounded-md border border-input bg-muted px-3 py-2 text-sm">
              ₹ {calculatedPending.toLocaleString()}
            </div>
          </div>
        </FormSection>
      ),
    };

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
                    <div className="col-span-1 md:col-span-2 space-y-3 p-4 border rounded-lg bg-muted/20">
                      <Label className="text-base font-semibold">6. TRV/ Work Permit Ext. / Study Permit Extension</Label>
                      <FormSelectInput name="spouseFields.trvExtension.type" control={control} label="Type" placeholder="Select Type" options={[{ label: "TRV", value: "TRV" }, { label: "Work Permit Ext", value: "Work Permit Ext" }, { label: "Study Permit Extension", value: "Study Permit Extension" }]} />
                      <FinancialEntry control={control} name="spouseFields.trvExtension" label="Payment Details" />
                    </div>
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="spouse-marriage">
                  <AccordionTrigger>Spouse - Relationship & Legal</AccordionTrigger>
                  <AccordionContent className="pt-4 space-y-4">
                    <FinancialEntry control={control} name="spouseFields.marriagePhoto" label="7. Marriage Photo Selection" />
                    <FinancialEntry control={control} name="spouseFields.marriageCertificate" label="8. Marriage Certificate Correction" />
                    <FinancialEntry control={control} name="spouseFields.relationshipAffidavit" label="9. Relationship Affidavit" />
                    <FinancialEntry control={control} name="spouseFields.judicialReview" label="10. Judicial Review (Legal Charges)" />
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="spouse-services">
                  <AccordionTrigger>Spouse - Additional Services</AccordionTrigger>
                  <AccordionContent className="pt-4 space-y-4">
                    <div className="space-y-4">
                      <Label className="text-base font-semibold">11. Sim Card</Label>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormSelectInput name="spouseFields.simCard.isActivated" control={control} label="Status" options={[{ label: "Activated", value: "Yes" }, { label: "Not Activated", value: "No" }]} />
                        <FormTextInput name="spouseFields.simCard.plan" control={control} label="Plan" />
                      </div>
                    </div>
                    <div className="space-y-4">
                      <Label className="text-base font-semibold">12. Insurance</Label>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormCurrencyInput name="spouseFields.insurance.amount" control={control} label="Amount" />
                        <FormTextInput name="spouseFields.insurance.insuranceNo" control={control} label="Insurance No" />
                      </div>
                    </div>
                    <div className="space-y-4">
                      <Label className="text-base font-semibold">13. My Beacon</Label>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormDateInput name="spouseFields.myBeacon.openingDate" control={control} label="Opening Date" />
                        <FormCurrencyInput name="spouseFields.myBeacon.fundingAmount" control={control} label="Funding Amount" />
                      </div>
                    </div>
                    <FinancialEntry control={control} name="spouseFields.airTicket" label="14. Air Ticket" />
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
              <NewServiceSection control={control} namePrefix="spouseFields" title="Spouse" />
            </div>
          )}

          {productType === "visitor" && (
            <div className="space-y-6">
              <Accordion type="single" collapsible defaultValue="visitor-finance" className="w-full">
                <AccordionItem value="visitor-finance">
                  <AccordionTrigger>Visitor - Finance & Services</AccordionTrigger>
                  <AccordionContent className="pt-4 space-y-4">
                    <FinancialEntry control={control} name="visitorFields.baseFee" label="1. Base Fee" />
                    <FinancialEntry control={control} name="visitorFields.indianSideEmployment" label="2. India Side Employment" />
                    <div className="p-4 border rounded-lg bg-muted/20 space-y-3">
                      <Label className="text-base font-semibold">3. Sponsor Charges</Label>
                      <FormCurrencyInput name="visitorFields.sponsorCharges.amount" control={control} label="Amount" />
                      <FormTextareaInput name="visitorFields.sponsorCharges.remarks" control={control} label="Remarks" />
                    </div>
                    <FinancialEntry control={control} name="visitorFields.airTicket" label="4. Air Ticket" />
                    <div className="p-4 border rounded-lg bg-muted/20 space-y-3">
                      <Label className="text-base font-semibold">5. Insurance</Label>
                      <FormCurrencyInput name="visitorFields.insurance.amount" control={control} label="Amount" />
                      <FormTextInput name="visitorFields.insurance.insuranceNo" control={control} label="Insurance No" />
                    </div>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
              <NewServiceSection control={control} namePrefix="visitorFields" title="Visitor" />
            </div>
          )}

          {productType === "student" && (
            <div className="space-y-6">
              <Accordion type="single" collapsible defaultValue="student-finance" className="w-full">
                <AccordionItem value="student-finance">
                  <AccordionTrigger>Student - Finance & Enrollment</AccordionTrigger>
                  <AccordionContent className="pt-4 space-y-4">
                    <FinancialEntry control={control} name="studentFields.financeAndEmployment" label="1. Finance & Employment" />
                    <FinancialEntry control={control} name="studentFields.indianSideEmployment" label="2. India Side Employment" />
                    <div className="p-4 border rounded-lg bg-muted/20 space-y-3">
                      <Label className="text-base font-semibold">3. IELTS Enrollment</Label>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormSwitchInput name="studentFields.ieltsEnrollment.isEnrolled" control={control} label="Is Enrolled?" />
                        <FormCurrencyInput name="studentFields.ieltsEnrollment.amount" control={control} label="Amount" />
                      </div>
                    </div>
                    <div className="p-4 border rounded-lg bg-muted/20 space-y-3">
                      <Label className="text-base font-semibold">4. Loan Details</Label>
                      <FormCurrencyInput name="studentFields.loan.amount" control={control} label="Loan Amount" />
                      <FormDateInput name="studentFields.loan.disbursementDate" control={control} label="Disbursement Date" />
                    </div>
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="student-services">
                  <AccordionTrigger>Student - Additional Services</AccordionTrigger>
                  <AccordionContent className="pt-4 space-y-4">
                    <FinancialEntry control={control} name="studentFields.airTicket" label="5. Air Ticket" />
                    <div className="p-4 border rounded-lg bg-muted/20 space-y-3">
                      <Label className="text-base font-semibold">6. My Beacon</Label>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormDateInput name="studentFields.beaconAccount.openingDate" control={control} label="Opening Date" />
                        <FormCurrencyInput name="studentFields.beaconAccount.cadAmount" control={control} label="CAD Amount" />
                      </div>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
              <NewServiceSection control={control} namePrefix="studentFields" title="Student" />
            </div>
          )}
        </div>
      ),
    };

    return [basicStep, consultancyStep, productFieldsStep];
  };

  return (
    <PageWrapper title="Register New Client">
      <MultiStepFormWrapper title="Client Registration" steps={buildSteps()} onSubmit={handleSubmit(onSubmit)} />
    </PageWrapper>
  );
}
