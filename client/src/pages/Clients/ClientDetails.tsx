import { PageWrapper } from "@/layout/PageWrapper";
import { useRoute, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { clientService } from "@/services/clientService";
import { SectionTabs } from "@/components/tabs/SectionTabs";
import { InfoCard } from "@/components/cards/InfoCard";
import { PaymentCard } from "@/components/cards/PaymentCard";
import { Button } from "@/components/ui/button";
import { Edit, FileText, Download } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function ClientDetails() {
  const [, params] = useRoute("/clients/:id");
  const [, setLocation] = useLocation();
  const id = params?.id;

  const { data: client, isLoading } = useQuery({
    queryKey: ['client', id],
    queryFn: () => clientService.getClientById(id || ""),
    enabled: !!id
  });

  if (isLoading || !client) {
    return <PageWrapper title="Loading..."><div className="p-4">Loading client details...</div></PageWrapper>;
  }

  // Helper function to determine client type
  const getClientType = (salesType: string) => {
    if (!salesType) return null;
    const lower = salesType.toLowerCase();
    if (lower.includes("spouse") || lower === "spousal pr") return "spouse";
    if (lower.includes("student")) return "student";
    if (lower.includes("visitor") || lower.includes("schengen")) return "visitor";
    return null;
  };

  const clientType = getClientType(client.salesType);

  const overviewTab = (
    <div className="space-y-6">
      {/* Basic Details Table */}
      <div className="border rounded-lg overflow-hidden bg-white">
        <table className="w-full">
          <thead>
            <tr className="bg-slate-50 border-b">
              <th className="px-6 py-3 text-left text-sm font-semibold text-slate-700">Field</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-slate-700">Value</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            <tr className="hover:bg-slate-50 transition-colors">
              <td className="px-6 py-3 text-sm text-slate-600 font-medium">Client Name</td>
              <td className="px-6 py-3 text-sm text-slate-900 font-semibold">{client.name}</td>
            </tr>
            <tr className="hover:bg-slate-50 transition-colors">
              <td className="px-6 py-3 text-sm text-slate-600 font-medium">Enrollment Date</td>
              <td className="px-6 py-3 text-sm text-slate-900">{client.enrollmentDate}</td>
            </tr>
            <tr className="hover:bg-slate-50 transition-colors">
              <td className="px-6 py-3 text-sm text-slate-600 font-medium">Sales Type</td>
              <td className="px-6 py-3 text-sm"><Badge variant="secondary">{client.salesType}</Badge></td>
            </tr>
            <tr className="hover:bg-slate-50 transition-colors">
              <td className="px-6 py-3 text-sm text-slate-600 font-medium">Counsellor</td>
              <td className="px-6 py-3 text-sm text-slate-900">{client.counsellor || "—"}</td>
            </tr>
            <tr className="hover:bg-slate-50 transition-colors">
              <td className="px-6 py-3 text-sm text-slate-600 font-medium">Product Manager</td>
              <td className="px-6 py-3 text-sm text-slate-900">{client.productManager || "—"}</td>
            </tr>
            <tr className="hover:bg-slate-50 transition-colors">
              <td className="px-6 py-3 text-sm text-slate-600 font-medium">Status</td>
              <td className="px-6 py-3 text-sm"><Badge>{client.status}</Badge></td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Consultancy Payment Details Table */}
      <div className="border rounded-lg overflow-hidden bg-white">
        <div className="px-6 py-4 bg-slate-50 border-b">
          <h3 className="text-sm font-semibold text-slate-700">Consultancy Payment Details</h3>
        </div>
        <table className="w-full">
          <thead>
            <tr className="bg-slate-50 border-b">
              <th className="px-6 py-3 text-left text-sm font-semibold text-slate-700">Payment Type</th>
              <th className="px-6 py-3 text-right text-sm font-semibold text-slate-700">Amount</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            <tr className="hover:bg-slate-50 transition-colors">
              <td className="px-6 py-3 text-sm text-slate-600">Total Payment</td>
              <td className="px-6 py-3 text-sm text-slate-900 font-semibold text-right">₹{client.totalPayment.toLocaleString()}</td>
            </tr>
            <tr className="hover:bg-slate-50 transition-colors">
              <td className="px-6 py-3 text-sm text-slate-600">Initial Amount Received</td>
              <td className="px-6 py-3 text-sm text-slate-900 text-right">₹{client.amountReceived.toLocaleString()}</td>
            </tr>
            <tr className="hover:bg-slate-50 transition-colors">
              <td className="px-6 py-3 text-sm text-slate-600">Before Visa Payment</td>
              <td className="px-6 py-3 text-sm text-slate-900 text-right">₹{client.amountReceived.toLocaleString()}</td>
            </tr>
            <tr className="hover:bg-slate-50 transition-colors">
              <td className="px-6 py-3 text-sm text-slate-600">After Visa Payment</td>
              <td className="px-6 py-3 text-sm text-slate-900 text-right">₹0</td>
            </tr>
            <tr className="hover:bg-slate-50 transition-colors bg-blue-50">
              <td className="px-6 py-3 text-sm text-slate-600 font-medium">Pending Amount</td>
              <td className="px-6 py-3 text-sm text-blue-900 font-semibold text-right">₹{client.amountPending.toLocaleString()}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );

  const paymentsTab = (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-3">
        <PaymentCard 
          title="Total Payment" 
          amount={client.totalPayment} 
          status="Pending" 
          className="border-l-blue-500" 
        />
        <PaymentCard 
          title="Received Amount" 
          amount={client.amountReceived} 
          status="Paid" 
        />
        <PaymentCard 
          title="Pending Amount" 
          amount={client.amountPending} 
          status={client.amountPending > 0 ? "Pending" : "Paid"} 
          className={client.amountPending > 0 ? "border-l-red-500" : "border-l-green-500"}
        />
      </div>

      <h3 className="text-lg font-medium mt-8 mb-4">Payment Schedule</h3>
      <div className="grid gap-4 md:grid-cols-2">
         {/* Mock breakdown */}
         <PaymentCard title="Consultancy Fee" amount={25000} status="Paid" date="2024-01-15" />
         <PaymentCard title="Visa Processing" amount={15000} status="Pending" date="2024-04-01" onPay={() => {}} />
      </div>
    </div>
  );

  const legalTab = (
    <div className="grid gap-6 md:grid-cols-2">
      <InfoCard
        title="Legal Services"
        items={[
          { label: "Common Law Affidavit", value: "₹5,000" },
          { label: "Lawyer Charges", value: "₹15,000" },
          { label: "Marriage Photos", value: "Included" },
          { label: "Relationship Affidavit", value: "₹2,500" },
        ]}
      />
    </div>
  );

  // Spouse documents info
  const spouseDocumentsInfo = [
    { label: "Marriage Photo", value: "₹5,000" },
    { label: "Marriage Certificate", value: "₹7,500" },
    { label: "Relationship Affidavit", value: "₹2,500" },
    { label: "Judicial Review", value: "₹10,000" },
  ];

  // Student documents info
  const studentDocumentsInfo = [
    { label: "IELTS Enrollment", value: "₹10,000" },
    { label: "Loan Amount", value: "₹500,000" },
    { label: "Beacon Account Funding", value: "CAD 15,000" },
    { label: "Air Ticket", value: "₹45,000" },
  ];

  // Visitor documents info
  const visitorDocumentsInfo = [
    { label: "Base Fee", value: "₹25,000" },
    { label: "Sponsor Charges", value: "₹10,000" },
    { label: "Insurance", value: "₹15,000" },
    { label: "Air Ticket", value: "₹40,000" },
  ];

  const documentsInfo = clientType === "spouse" ? spouseDocumentsInfo : clientType === "student" ? studentDocumentsInfo : clientType === "visitor" ? visitorDocumentsInfo : [];

  const documentsTab = (
    <div className="grid gap-6 md:grid-cols-2">
      {documentsInfo.length > 0 ? (
        <InfoCard
          title="Payment Documents"
          items={documentsInfo}
        />
      ) : (
        <div className="text-center p-8 border rounded-lg bg-muted/30">
          <p className="text-muted-foreground">No documents found for this client type</p>
        </div>
      )}
    </div>
  );

  // Build product details info from form data
  const buildProductDetailsInfo = () => {
    if (clientType === "spouse" && client.spouseFields) {
      const items = [];
      if (client.spouseFields.marriagePhoto?.amount) items.push({ label: "Marriage Photo", value: `₹${client.spouseFields.marriagePhoto.amount.toLocaleString()}` });
      if (client.spouseFields.marriageCertificate?.amount) items.push({ label: "Marriage Certificate", value: `₹${client.spouseFields.marriageCertificate.amount.toLocaleString()}` });
      if (client.spouseFields.relationshipAffidavit?.amount) items.push({ label: "Relationship Affidavit", value: `₹${client.spouseFields.relationshipAffidavit.amount.toLocaleString()}` });
      if (client.spouseFields.judicialReview?.amount) items.push({ label: "Judicial Review", value: `₹${client.spouseFields.judicialReview.amount.toLocaleString()}` });
      if (client.spouseFields.insurance?.amount) items.push({ label: "Insurance", value: `₹${client.spouseFields.insurance.amount.toLocaleString()}` });
      if (client.spouseFields.airTicket?.amount) items.push({ label: "Air Ticket", value: `₹${client.spouseFields.airTicket.amount.toLocaleString()}` });
      return items;
    } else if (clientType === "student" && client.studentFields) {
      const items = [];
      if (client.studentFields.financeAndEmployment?.amount) items.push({ label: "Finance & Employment", value: `₹${client.studentFields.financeAndEmployment.amount.toLocaleString()}` });
      if (client.studentFields.ieltsEnrollment?.amount) items.push({ label: "IELTS Enrollment", value: `₹${client.studentFields.ieltsEnrollment.amount.toLocaleString()}` });
      if (client.studentFields.loan?.amount) items.push({ label: "Loan Amount", value: `₹${client.studentFields.loan.amount.toLocaleString()}` });
      if (client.studentFields.beaconAccount?.cadAmount) items.push({ label: "Beacon Account Funding", value: `CAD ${client.studentFields.beaconAccount.cadAmount.toLocaleString()}` });
      if (client.studentFields.airTicket?.amount) items.push({ label: "Air Ticket", value: `₹${client.studentFields.airTicket.amount.toLocaleString()}` });
      if (client.studentFields.insurance?.amount) items.push({ label: "Insurance", value: `₹${client.studentFields.insurance.amount.toLocaleString()}` });
      return items;
    } else if (clientType === "visitor" && client.visitorFields) {
      const items = [];
      if (client.visitorFields.baseFee?.amount) items.push({ label: "Base Fee", value: `₹${client.visitorFields.baseFee.amount.toLocaleString()}` });
      if (client.visitorFields.sponsorCharges?.amount) items.push({ label: "Sponsor Charges", value: `₹${client.visitorFields.sponsorCharges.amount.toLocaleString()}` });
      if (client.visitorFields.insurance?.amount) items.push({ label: "Insurance", value: `₹${client.visitorFields.insurance.amount.toLocaleString()}` });
      if (client.visitorFields.beaconAccount?.fundingAmount) items.push({ label: "Beacon Account Funding", value: `₹${client.visitorFields.beaconAccount.fundingAmount.toLocaleString()}` });
      if (client.visitorFields.airTicket?.amount) items.push({ label: "Air Ticket", value: `₹${client.visitorFields.airTicket.amount.toLocaleString()}` });
      return items;
    }
    return [];
  };

  const productDetailsInfo = buildProductDetailsInfo();

  const productDetailsTab = (
    <div className="grid gap-6 md:grid-cols-2">
      {productDetailsInfo.length > 0 ? (
        <InfoCard
          title={`${clientType?.charAt(0).toUpperCase()}${clientType?.slice(1)} Product Details`}
          items={productDetailsInfo}
        />
      ) : (
        <div className="text-center p-8 border rounded-lg bg-muted/30">
          <p className="text-muted-foreground">No product details found for this client</p>
        </div>
      )}
    </div>
  );

  return (
    <PageWrapper 
      title={`Client: ${client.name}`}
      breadcrumbs={[
        { label: "Clients", href: "/clients" },
        { label: client.name }
      ]}
      actions={
        <Button onClick={() => setLocation(`/clients/${id}/edit`)}>
          <Edit className="w-4 h-4 mr-2" />
          Edit Client
        </Button>
      }
    >
      <SectionTabs 
        items={[
          { value: "overview", label: "Overview", content: overviewTab },
          { value: "payments", label: "Payments", content: paymentsTab },
          { value: "legal", label: "Legal Services", content: legalTab },
          { value: "product-details", label: "Product Details", content: productDetailsTab },
          { value: "documents", label: "Documents", content: documentsTab },
        ]}
      />
    </PageWrapper>
  );
}
