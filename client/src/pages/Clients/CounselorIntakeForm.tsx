
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { PageWrapper } from "@/layout/PageWrapper";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { FormTextInput } from "@/components/form/FormTextInput";
import { FormDateInput } from "@/components/form/FormDateInput";
import { FormSwitchInput } from "@/components/form/FormSwitchInput";
import { useToast } from "@/hooks/use-toast";

// Define the schema
const formSchema = z.object({
  // Step 1
  name: z.string().min(2, "Name is required"),
  enrollmentDate: z.string().optional(), // FormDateInput returns string (ISO)
  saleType: z.string().optional(),
  coreSale: z.boolean().default(false),

  // Step 2
  financeAmount: z.string().optional(),
  paidInvoiceNo: z.string().optional(),
  financeDate: z.string().optional(),
  fixPrice: z.string().optional(),

  // Step 3 - Additional Information
  hasIndianSideEmployment: z.boolean().default(false),
  indianSideDate: z.string().optional(),
  indianSideAmount: z.string().default("6000"),
  indianSideInvoiceId: z.string().optional(),

  hasNocLevelJob: z.boolean().default(false),
  nocLevelAmount: z.string().default("40000"),
  nocLevelDate: z.string().optional(),
  nocLevelInvoiceId: z.string().optional(),

  hasLawyerRefuse: z.boolean().default(false),
  lawyerRefuseAmount: z.string().default("30000"),
  lawyerRefuseDate: z.string().optional(),
  lawyerRefuseInvoiceId: z.string().optional(),

  hasOnshorePartTime: z.boolean().default(false),
  onshoreEmployment: z.string().optional(),
  onshoreAmount: z.string().default("15000"),
  onshoreDate: z.string().optional(),
  onshoreInvoice: z.string().optional(),

  hasEmploymentNoc: z.boolean().default(false),
  employmentNocAmount: z.string().default("40000"),
  employmentNocDate: z.string().optional(),
  employmentNocInvoiceId: z.string().optional(),

  hasMarriagePhotoCourt: z.boolean().default(false),
  marriagePhotoCourtAmount: z.string().default("10000"),
  marriagePhotoCourtDate: z.string().optional(),
  marriagePhotoCourtInvoiceId: z.string().optional(),

  hasMarriagePhotoCert: z.boolean().default(false),
  marriagePhotoCertAmount: z.string().default("60000"),
  marriagePhotoCertDate: z.string().optional(),
  marriagePhotoCertInvoiceId: z.string().optional(),

  hasRecentMarriageAffidavit: z.boolean().default(false),
  recentMarriageLawyerCharge: z.string().optional(),
  recentMarriageAmount: z.string().default("10000"),

  hasJudicialReview: z.boolean().default(false),
  judicialReviewAmount: z.string().default("80000"),
  judicialReviewDate: z.string().optional(),
  judicialReviewInvoiceId: z.string().optional(),

  hasSimCard: z.boolean().default(false),
  simCardActivation: z.boolean().default(false),

  hasInsurance: z.boolean().default(false),
  insuranceAmount: z.string().optional(),
  insuranceNo: z.string().optional(),
  insuranceDate: z.string().optional(),

  hasMyBeacon: z.boolean().default(false),
  myBeaconOpenDate: z.string().optional(),
  myBeaconFundingAmount: z.string().optional(),
  myBeaconFundingDate: z.string().optional(),

  hasAirTicket: z.boolean().default(false),
  airTicketYesNo: z.boolean().default(false),
  airTicketDate: z.string().optional(),
  airTicketInvoiceDate: z.string().optional(),
  airTicketAmount: z.string().optional(),
});

export default function CounselorIntakeForm() {
  const { toast } = useToast();
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      coreSale: false,
      hasIndianSideEmployment: false,
      hasNocLevelJob: false,
      hasLawyerRefuse: false,
      hasOnshorePartTime: false,
      hasEmploymentNoc: false,
      hasMarriagePhotoCourt: false,
      hasMarriagePhotoCert: false,
      hasRecentMarriageAffidavit: false,
      hasJudicialReview: false,
      hasSimCard: false,
      hasInsurance: false,
      hasMyBeacon: false,
      hasAirTicket: false,
      
      indianSideAmount: "6000",
      nocLevelAmount: "40000",
      lawyerRefuseAmount: "30000",
      onshoreAmount: "15000",
      employmentNocAmount: "40000",
      marriagePhotoCourtAmount: "10000",
      marriagePhotoCertAmount: "60000",
      recentMarriageAmount: "10000",
      judicialReviewAmount: "80000",
    },
  });

  function onSubmit(values: z.infer<typeof formSchema>) {
    console.log(values);
    toast({
      title: "Success",
      description: "Intake form submitted successfully",
    });
  }

  // Helper to render togglable section
  const ToggleSection = ({ 
    name, 
    label, 
    children 
  }: { 
    name: any, 
    label: string, 
    children: React.ReactNode 
  }) => (
    <div className="space-y-4 rounded-lg border p-4">
      <FormSwitchInput control={form.control} name={name} label={label} />
      {form.watch(name) && (
        <div className="grid gap-4 md:grid-cols-3 pt-4 border-t animate-in fade-in slide-in-from-top-2 duration-300">
          {children}
        </div>
      )}
    </div>
  );

  return (
    <PageWrapper title="Counselor Intake Form" breadcrumbs={[{ label: "Clients", href: "/clients" }, { label: "Intake Form" }]}>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8 max-w-4xl mx-auto pb-10">
          
          {/* Step 1: Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle>Step 1: Basic Information</CardTitle>
              <CardDescription>Enter the client's enrollment and sale details.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-6 md:grid-cols-2">
              <FormTextInput control={form.control} name="name" label="Client Name" placeholder="Enter client name" />
              <FormDateInput control={form.control} name="enrollmentDate" label="Enrollment Date" />
              <FormTextInput control={form.control} name="saleType" label="Sale Type" placeholder="Enter sale type" />
              <div className="flex items-center h-full pt-8">
                <FormSwitchInput control={form.control} name="coreSale" label="Core Sale" />
              </div>
            </CardContent>
          </Card>

          {/* Step 2: Finance Information */}
          <Card>
            <CardHeader>
              <CardTitle>Step 2: Finance Information</CardTitle>
              <CardDescription>Enter finance details and payment information.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-6 md:grid-cols-2">
              <FormTextInput control={form.control} name="financeAmount" label="All Finance & Emp Amount" placeholder="Enter amount" />
              <FormTextInput control={form.control} name="paidInvoiceNo" label="Paid Invoice No." placeholder="Invoice number" />
              <FormDateInput control={form.control} name="financeDate" label="Date" />
              <FormTextInput control={form.control} name="fixPrice" label="Fix Price" placeholder="Fix price amount" />
            </CardContent>
          </Card>

          {/* Step 3: Additional Information */}
          <Card>
            <CardHeader>
              <CardTitle>Step 3: Additional Information</CardTitle>
              <CardDescription>Select additional services and provide details.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              
              <ToggleSection name="hasIndianSideEmployment" label="Indian Side Employment">
                <FormDateInput control={form.control} name="indianSideDate" label="Date" />
                <FormTextInput control={form.control} name="indianSideAmount" label="Amount (per year)" />
                <FormTextInput control={form.control} name="indianSideInvoiceId" label="Paid Invoice ID" placeholder="Invoice ID" />
              </ToggleSection>

              <ToggleSection name="hasNocLevelJob" label="NOC Level Job Arrangement">
                <FormTextInput control={form.control} name="nocLevelAmount" label="Fixed Amount (+ GST)" />
                <FormDateInput control={form.control} name="nocLevelDate" label="Date" />
                <FormTextInput control={form.control} name="nocLevelInvoiceId" label="Paid Invoice ID" placeholder="Invoice ID" />
              </ToggleSection>

              <ToggleSection name="hasLawyerRefuse" label="Lawyer Refuse Charge">
                <FormTextInput control={form.control} name="lawyerRefuseAmount" label="Fixed Amount (+ GST)" />
                <FormDateInput control={form.control} name="lawyerRefuseDate" label="Date" />
                <FormTextInput control={form.control} name="lawyerRefuseInvoiceId" label="Paid Invoice ID" placeholder="Invoice ID" />
              </ToggleSection>

              <ToggleSection name="hasOnshorePartTime" label="Onshore-Part Time">
                <FormTextInput control={form.control} name="onshoreEmployment" label="Employment Details" />
                <FormTextInput control={form.control} name="onshoreAmount" label="Fixed Amount (+ GST)" />
                <FormDateInput control={form.control} name="onshoreDate" label="Date" />
                <FormTextInput control={form.control} name="onshoreInvoice" label="Paid Invoice" placeholder="Invoice ID" />
              </ToggleSection>

              <ToggleSection name="hasEmploymentNoc" label="Employment NOC Arrangement">
                <FormTextInput control={form.control} name="employmentNocAmount" label="Fixed Amount (+ GST)" />
                <FormDateInput control={form.control} name="employmentNocDate" label="Date" />
                <FormTextInput control={form.control} name="employmentNocInvoiceId" label="Invoice ID" placeholder="Invoice ID" />
              </ToggleSection>

              <ToggleSection name="hasMarriagePhotoCourt" label="Marriage Photo For Court">
                <FormTextInput control={form.control} name="marriagePhotoCourtAmount" label="Amount (+ GST)" />
                <FormDateInput control={form.control} name="marriagePhotoCourtDate" label="Date" />
                <FormTextInput control={form.control} name="marriagePhotoCourtInvoiceId" label="Invoice ID" placeholder="Invoice ID" />
              </ToggleSection>

              <ToggleSection name="hasMarriagePhotoCert" label="Marriage Photo + Certification Common Law">
                <FormTextInput control={form.control} name="marriagePhotoCertAmount" label="Amount (+ GST)" />
                <FormDateInput control={form.control} name="marriagePhotoCertDate" label="Date" />
                <FormTextInput control={form.control} name="marriagePhotoCertInvoiceId" label="Invoice ID" placeholder="Invoice ID" />
              </ToggleSection>

              <ToggleSection name="hasRecentMarriageAffidavit" label="Recent Marriage Charge Relation Affidavit">
                <FormTextInput control={form.control} name="recentMarriageLawyerCharge" label="Lawyer Charge" placeholder="Charge amount" />
                <FormTextInput control={form.control} name="recentMarriageAmount" label="Fixed Amount (+ GST)" />
              </ToggleSection>

              <ToggleSection name="hasJudicialReview" label="Judicial Review Charge">
                <FormTextInput control={form.control} name="judicialReviewAmount" label="Amount (+ GST)" />
                <FormDateInput control={form.control} name="judicialReviewDate" label="Date" />
                <FormTextInput control={form.control} name="judicialReviewInvoiceId" label="Invoice ID" placeholder="Invoice ID" />
              </ToggleSection>

              <div className="space-y-4 rounded-lg border p-4">
                <FormSwitchInput control={form.control} name="hasSimCard" label="Sim Card" />
                {form.watch("hasSimCard") && (
                  <div className="pt-4 border-t animate-in fade-in slide-in-from-top-2 duration-300">
                    <FormSwitchInput control={form.control} name="simCardActivation" label="Activation (Yes)" />
                  </div>
                )}
              </div>

              <ToggleSection name="hasInsurance" label="Insurance">
                <FormTextInput control={form.control} name="insuranceAmount" label="Insurance Amount" placeholder="Amount" />
                <FormTextInput control={form.control} name="insuranceNo" label="Insurance No." placeholder="Number" />
                <FormDateInput control={form.control} name="insuranceDate" label="Date" />
              </ToggleSection>

              <ToggleSection name="hasMyBeacon" label="My Beacon Account">
                <FormDateInput control={form.control} name="myBeaconOpenDate" label="Account Opening Date" />
                <FormTextInput control={form.control} name="myBeaconFundingAmount" label="Funding Amount" placeholder="Amount" />
                <FormDateInput control={form.control} name="myBeaconFundingDate" label="Account Funding Date" />
              </ToggleSection>

              <div className="space-y-4 rounded-lg border p-4">
                <FormSwitchInput control={form.control} name="hasAirTicket" label="Air Ticket" />
                {form.watch("hasAirTicket") && (
                  <div className="grid gap-4 md:grid-cols-4 pt-4 border-t animate-in fade-in slide-in-from-top-2 duration-300">
                    <div className="flex items-center pt-8">
                      <FormSwitchInput control={form.control} name="airTicketYesNo" label="Ticket (Yes)" />
                    </div>
                    <FormDateInput control={form.control} name="airTicketDate" label="Date" />
                    <FormDateInput control={form.control} name="airTicketInvoiceDate" label="Invoice Date" />
                    <FormTextInput control={form.control} name="airTicketAmount" label="Amount" placeholder="Amount" />
                  </div>
                )}
              </div>

            </CardContent>
          </Card>

          <div className="flex justify-end gap-4">
            <Button variant="outline" type="button" onClick={() => form.reset()}>Reset</Button>
            <Button type="submit" size="lg">Submit Intake Form</Button>
          </div>
        </form>
      </Form>
    </PageWrapper>
  );
}
