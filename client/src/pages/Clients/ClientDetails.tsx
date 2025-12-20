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

  // Spouse specific info
  const spouseOverviewInfo = [
    { label: "Marriage Photo", value: "₹5,000" },
    { label: "Marriage Certificate", value: "₹7,500" },
    { label: "Relationship Affidavit", value: "₹2,500" },
    { label: "Judicial Review", value: "₹10,000" },
  ];

  // Student specific info
  const studentOverviewInfo = [
    { label: "IELTS Enrollment", value: "₹10,000" },
    { label: "Loan Amount", value: "₹500,000" },
    { label: "Beacon Account Funding", value: "CAD 15,000" },
    { label: "Air Ticket", value: "₹45,000" },
  ];

  // Visitor specific info
  const visitorOverviewInfo = [
    { label: "Base Fee", value: "₹25,000" },
    { label: "Sponsor Charges", value: "₹10,000" },
    { label: "Insurance", value: "₹15,000" },
    { label: "Air Ticket", value: "₹40,000" },
  ];

  const clientSpecificInfo = clientType === "spouse" ? spouseOverviewInfo : clientType === "student" ? studentOverviewInfo : clientType === "visitor" ? visitorOverviewInfo : [];

  const overviewTab = (
    <div className="grid gap-6 md:grid-cols-2">
      <InfoCard
        title="Enrollment Details"
        items={[
          { label: "Enrollment Date", value: client.enrollmentDate },
          { label: "Sales Type", value: <Badge variant="secondary">{client.salesType}</Badge> },
          { label: "Counsellor", value: client.counsellor },
          { label: "Product Manager", value: client.productManager },
          { label: "Status", value: <Badge>{client.status}</Badge> },
        ]}
      />
      {clientSpecificInfo.length > 0 && (
        <InfoCard
          title="Product Details"
          items={clientSpecificInfo}
        />
      )}
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
          { value: "documents", label: "Documents", content: documentsTab },
        ]}
      />
    </PageWrapper>
  );
}
