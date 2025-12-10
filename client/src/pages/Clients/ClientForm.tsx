import { PageWrapper } from "@/layout/PageWrapper";
import { MultiStepFormWrapper } from "@/components/form/MultiStepFormWrapper";
import { FormSection } from "@/components/form/FormSection";
import { FormTextInput } from "@/components/form/FormTextInput";
import { FormNumberInput } from "@/components/form/FormNumberInput";
import { FormDateInput } from "@/components/form/FormDateInput";
import { FormSelectInput } from "@/components/form/FormSelectInput";
import { FormCurrencyInput } from "@/components/form/FormCurrencyInput";
import { FormSwitchInput } from "@/components/form/FormSwitchInput";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { clientService } from "@/services/clientService";

// Validation Schema
const formSchema = z.object({
  // Step 1: Basic Details
  name: z.string().min(2, "Name is required"),
  enrollmentDate: z.string().min(1, "Date is required"),
  salesType: z.string(),
  coreSales: z.string().optional(),
  counsellor: z.string().optional(),
  mainCounsellor: z.string().optional(),
  productManager: z.string().optional(),

  // Step 2: Consultancy Payment
  totalPayment: z.number().min(0),
  showDiscount: z.boolean().optional(),
  discount: z.number().min(0).optional(),
  initialAmountReceived: z.number().min(0),
  amountPending: z.number().min(0),
  showExtraPayment: z.boolean().optional(),
  extraPayment: z.number().min(0).optional(),
  productPaymentAmount: z.number().optional(),
  productPaymentDate: z.string().optional(),

  // Step 3: IELTS & Loan
  ieltsAmount: z.number().optional(),
  ieltsDate: z.string().optional(),
  loanAmount: z.number().optional(),
  loanDisbursementDate: z.string().optional(),

  // Step 4: Legal Services
  commonLawAffidavit: z.number().optional(),
  lawyerCharges: z.number().optional(),
  marriagePhotos: z.number().optional(),
  relationshipAffidavit: z.number().optional(),
  marriageCert: z.number().optional(),

  // Step 5: Employment
  partTimeEmployment: z.number().optional(),
  nocArrangement: z.number().optional(),
  employmentVerification: z.number().optional(),

  // Step 6: Visa & Travel
  extensionFee: z.number().optional(),
  insuranceAmount: z.number().optional(),
  airTicket: z.number().optional(),
  simPlan: z.string().optional(),

  // Step 7: Finance
  canadaFinance: z.number().optional(),
  beaconDate: z.string().optional(),
  totalCad: z.number().optional(),
  judicialReview: z.number().optional(),
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
  { label: "Schengen visa", value: "Schengen visa" },
  { label: "SPOUSAL PR", value: "SPOUSAL PR" },
];

export default function ClientForm() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      salesType: "Canada Student",
      totalPayment: 0,
      initialAmountReceived: 0,
      amountPending: 0,
    },
  });

  const { control, handleSubmit } = form;
  const salesType = useWatch({ control, name: "salesType" });
  const showDiscount = useWatch({ control, name: "showDiscount" });
  const showExtraPayment = useWatch({ control, name: "showExtraPayment" });

  const isStudent = salesType?.toLowerCase().includes("student");
  const isSpouse =
    salesType?.toLowerCase().includes("spouse") || salesType === "SPOUSAL PR";

  // Logic:
  // - Students see IELTS/Loan
  // - Spouses see Legal Services, Employment (assuming NOC/Work permit related)
  // - Everyone sees Basic, Payment, Visa & Travel, Finance (unless specified otherwise, keeping these general)

  const onSubmit = async (data: FormValues) => {
    try {
      // @ts-ignore - mapping simplified for demo
      await clientService.createClient({
        ...data,
        status: "Active",
        // Map other fields as necessary for the service
      });

      toast({
        title: "Success",
        description: "Client created successfully",
      });
      setLocation("/clients");
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create client",
        variant: "destructive",
      });
    }
  };

  const allSteps = [
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
          <FormCurrencyInput
            name="initialAmountReceived"
            control={control}
            label="Initial Amount Received"
          />
          <FormCurrencyInput
            name="amountPending"
            control={control}
            label="Amount Pending"
          />
          <FormCurrencyInput
            name="productPaymentAmount"
            control={control}
            label="Product Payment Amount"
          />
          <FormDateInput
            name="productPaymentDate"
            control={control}
            label="Product Payment Date"
          />
          <div className="hidden md:block"></div>
          <div className="space-y-4">
            <FormSwitchInput
              name="showDiscount"
              control={control}
              label="Add Discount"
            />
            {showDiscount && (
              <FormCurrencyInput
                name="discount"
                control={control}
                label="Discount"
              />
            )}
          </div>
          <div className="space-y-4">
            <FormSwitchInput
              name="showExtraPayment"
              control={control}
              label="Add Extra Payment"
            />
            {showExtraPayment && (
              <FormCurrencyInput
                name="extraPayment"
                control={control}
                label="Extra Payment"
              />
            )}
          </div>
        </FormSection>
      ),
    },
    {
      id: "additional_info",
      title: "Additional Information",
      component: (
        <div className="space-y-6">
          {/* IELTS & Loan - Only for Students */}
          {isStudent && (
            <FormSection title="IELTS & Loan Services">
              <FormCurrencyInput
                name="ieltsAmount"
                control={control}
                label="IELTS Amount"
              />
              <FormDateInput
                name="ieltsDate"
                control={control}
                label="IELTS Payment Date"
              />
              <FormCurrencyInput
                name="loanAmount"
                control={control}
                label="Loan Amount"
              />
              <FormDateInput
                name="loanDisbursementDate"
                control={control}
                label="Loan Disbursement Date"
              />
            </FormSection>
          )}

          {/* Legal Services - Only for Spouse */}
          {isSpouse && (
            <FormSection title="Legal Services Charges">
              <FormCurrencyInput
                name="commonLawAffidavit"
                control={control}
                label="Common Law Affidavit"
              />
              <FormCurrencyInput
                name="lawyerCharges"
                control={control}
                label="Lawyer Charges (Refusal)"
              />
              <FormCurrencyInput
                name="marriagePhotos"
                control={control}
                label="Marriage Photos"
              />
              <FormCurrencyInput
                name="relationshipAffidavit"
                control={control}
                label="Relationship Affidavit"
              />
              <FormCurrencyInput
                name="marriageCert"
                control={control}
                label="Marriage Cert + Photos"
              />
            </FormSection>
          )}

          {/* Employment Services - Only for Spouse */}
          {isSpouse && (
            <FormSection title="Employment Services">
              <FormCurrencyInput
                name="partTimeEmployment"
                control={control}
                label="Part-time Employment"
              />
              <FormCurrencyInput
                name="nocArrangement"
                control={control}
                label="NOC Arrangement"
              />
              <FormCurrencyInput
                name="employmentVerification"
                control={control}
                label="Verification Charges"
              />
            </FormSection>
          )}

          {/* Visa & Travel Services - For Everyone */}
          <FormSection title="Visa & Travel Services">
            <FormCurrencyInput
              name="extensionFee"
              control={control}
              label="TRV/Permit Extension Fee"
            />
            <FormCurrencyInput
              name="insuranceAmount"
              control={control}
              label="Insurance Amount"
            />
            <FormCurrencyInput
              name="airTicket"
              control={control}
              label="Air Ticket Charges"
            />
            <FormTextInput
              name="simPlan"
              control={control}
              label="SIM Plan Details"
            />
          </FormSection>

          {/* Finance & Settlement - For Everyone */}
          <FormSection title="Finance & Settlement">
            <FormCurrencyInput
              name="canadaFinance"
              control={control}
              label="Canada Side Finance"
            />
            <FormDateInput
              name="beaconDate"
              control={control}
              label="Beacon A/C Date"
            />
            <FormCurrencyInput
              name="totalCad"
              control={control}
              label="Total CAD"
            />
            <FormCurrencyInput
              name="judicialReview"
              control={control}
              label="Judicial Review Charges"
            />
          </FormSection>
        </div>
      ),
    },
  ];

  // Filter steps based on condition (default to true if condition is undefined)
  const steps = allSteps;

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
        />
      </div>
    </PageWrapper>
  );
}
