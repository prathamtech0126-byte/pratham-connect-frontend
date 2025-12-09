import { PageWrapper } from "@/layout/PageWrapper";
import { MultiStepFormWrapper } from "@/components/form/MultiStepFormWrapper";
import { FormSection } from "@/components/form/FormSection";
import { FormTextInput } from "@/components/form/FormTextInput";
import { FormNumberInput } from "@/components/form/FormNumberInput";
import { FormDateInput } from "@/components/form/FormDateInput";
import { FormSelectInput } from "@/components/form/FormSelectInput";
import { FormCurrencyInput } from "@/components/form/FormCurrencyInput";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { studentService } from "@/services/studentService";

// Validation Schema
const formSchema = z.object({
  // Step 1: Basic Details
  name: z.string().min(2, "Name is required"),
  enrollmentDate: z.string().min(1, "Date is required"),
  salesType: z.string(),
  coreSales: z.string().optional(),
  counsellor: z.string().min(1, "Counsellor is required"),
  productManager: z.string().min(1, "Product Manager is required"),
  
  // Step 2: Consultancy Payment
  totalPayment: z.number().min(0),
  amountReceived: z.number().min(0),
  amountPending: z.number().min(0),
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

export default function StudentForm() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      salesType: "Consultancy",
      totalPayment: 0,
      amountReceived: 0,
      amountPending: 0,
    }
  });

  const { control, handleSubmit } = form;

  const onSubmit = async (data: FormValues) => {
    try {
      // @ts-ignore - mapping simplified for demo
      await studentService.createStudent({
        ...data,
        status: 'Active',
        // Map other fields as necessary for the service
      });
      
      toast({
        title: "Success",
        description: "Student created successfully",
      });
      setLocation("/students");
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create student",
        variant: "destructive"
      });
    }
  };

  const steps = [
    {
      id: "basic",
      title: "Basic Details",
      component: (
        <FormSection title="Student Information" description="Enter the basic details of the student">
          <FormTextInput name="name" control={control} label="Full Name" placeholder="e.g. Rahul Kumar" />
          <FormDateInput name="enrollmentDate" control={control} label="Enrollment Date" />
          <FormSelectInput 
            name="salesType" 
            control={control} 
            label="Sales Type" 
            options={[
              { label: "Consultancy", value: "Consultancy" },
              { label: "IELTS", value: "IELTS" },
              { label: "Loan", value: "Loan" },
              { label: "Combined", value: "Combined" },
            ]} 
          />
          <FormTextInput name="coreSales" control={control} label="Core Sales" />
          <FormTextInput name="counsellor" control={control} label="Counsellor Name" />
          <FormTextInput name="productManager" control={control} label="Product Manager" />
        </FormSection>
      )
    },
    {
      id: "consultancy",
      title: "Consultancy Payment",
      component: (
        <FormSection title="Payment Details" description="Consultancy charges and payment status">
          <FormCurrencyInput name="totalPayment" control={control} label="Total Payment" />
          <FormCurrencyInput name="amountReceived" control={control} label="Amount Received" />
          <FormCurrencyInput name="amountPending" control={control} label="Amount Pending" />
          <FormCurrencyInput name="productPaymentAmount" control={control} label="Product Payment Amount" />
          <FormDateInput name="productPaymentDate" control={control} label="Product Payment Date" />
        </FormSection>
      )
    },
    {
      id: "ielts_loan",
      title: "IELTS & Loan",
      component: (
        <FormSection title="IELTS & Loan Services">
          <FormCurrencyInput name="ieltsAmount" control={control} label="IELTS Amount" />
          <FormDateInput name="ieltsDate" control={control} label="IELTS Payment Date" />
          <FormCurrencyInput name="loanAmount" control={control} label="Loan Amount" />
          <FormDateInput name="loanDisbursementDate" control={control} label="Loan Disbursement Date" />
        </FormSection>
      )
    },
    {
      id: "legal",
      title: "Legal Services",
      component: (
        <FormSection title="Legal Services Charges">
          <FormCurrencyInput name="commonLawAffidavit" control={control} label="Common Law Affidavit" />
          <FormCurrencyInput name="lawyerCharges" control={control} label="Lawyer Charges (Refusal)" />
          <FormCurrencyInput name="marriagePhotos" control={control} label="Marriage Photos" />
          <FormCurrencyInput name="relationshipAffidavit" control={control} label="Relationship Affidavit" />
          <FormCurrencyInput name="marriageCert" control={control} label="Marriage Cert + Photos" />
        </FormSection>
      )
    },
    {
      id: "employment",
      title: "Employment",
      component: (
        <FormSection title="Employment Services">
          <FormCurrencyInput name="partTimeEmployment" control={control} label="Part-time Employment" />
          <FormCurrencyInput name="nocArrangement" control={control} label="NOC Arrangement" />
          <FormCurrencyInput name="employmentVerification" control={control} label="Verification Charges" />
        </FormSection>
      )
    },
    {
      id: "visa",
      title: "Visa & Travel",
      component: (
        <FormSection title="Visa & Travel Services">
          <FormCurrencyInput name="extensionFee" control={control} label="TRV/Permit Extension Fee" />
          <FormCurrencyInput name="insuranceAmount" control={control} label="Insurance Amount" />
          <FormCurrencyInput name="airTicket" control={control} label="Air Ticket Charges" />
          <FormTextInput name="simPlan" control={control} label="SIM Plan Details" />
        </FormSection>
      )
    },
    {
      id: "finance",
      title: "Finance",
      component: (
        <FormSection title="Finance & Settlement">
          <FormCurrencyInput name="canadaFinance" control={control} label="Canada Side Finance" />
          <FormDateInput name="beaconDate" control={control} label="Beacon A/C Date" />
          <FormCurrencyInput name="totalCad" control={control} label="Total CAD" />
          <FormCurrencyInput name="judicialReview" control={control} label="Judicial Review Charges" />
        </FormSection>
      )
    }
  ];

  return (
    <PageWrapper 
      title="Add New Student" 
      breadcrumbs={[
        { label: "Students", href: "/students" },
        { label: "New Student" }
      ]}
    >
      <div className="max-w-4xl mx-auto pb-12">
        <MultiStepFormWrapper 
          title="Student Registration" 
          steps={steps} 
          onSubmit={handleSubmit(onSubmit)}
        />
      </div>
    </PageWrapper>
  );
}
