import { PageWrapper } from "@/layout/PageWrapper";
import { useRoute, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { studentService } from "@/services/studentService";
import { SectionTabs } from "@/components/tabs/SectionTabs";
import { InfoCard } from "@/components/cards/InfoCard";
import { PaymentCard } from "@/components/cards/PaymentCard";
import { Button } from "@/components/ui/button";
import { Edit, FileText, Download } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function StudentDetails() {
  const [, params] = useRoute("/students/:id");
  const [, setLocation] = useLocation();
  const id = params?.id;

  const { data: student, isLoading } = useQuery({
    queryKey: ['student', id],
    queryFn: () => studentService.getStudentById(id || ""),
    enabled: !!id
  });

  if (isLoading || !student) {
    return <PageWrapper title="Loading..."><div className="p-4">Loading student details...</div></PageWrapper>;
  }

  const overviewTab = (
    <div className="grid gap-6 md:grid-cols-2">
      <InfoCard
        title="Personal Information"
        items={[
          { label: "Full Name", value: student.name },
          { label: "Student ID", value: student.id },
          { label: "Email", value: student.email || "N/A" },
          { label: "Phone", value: student.phone || "N/A" },
        ]}
      />
      <InfoCard
        title="Enrollment Details"
        items={[
          { label: "Enrollment Date", value: student.enrollmentDate },
          { label: "Sales Type", value: <Badge variant="secondary">{student.salesType}</Badge> },
          { label: "Counsellor", value: student.counsellor },
          { label: "Product Manager", value: student.productManager },
          { label: "Status", value: <Badge>{student.status}</Badge> },
        ]}
      />
    </div>
  );

  const paymentsTab = (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-3">
        <PaymentCard 
          title="Total Payment" 
          amount={student.totalPayment} 
          status="Pending" 
          className="border-l-blue-500" 
        />
        <PaymentCard 
          title="Received Amount" 
          amount={student.amountReceived} 
          status="Paid" 
        />
        <PaymentCard 
          title="Pending Amount" 
          amount={student.amountPending} 
          status={student.amountPending > 0 ? "Pending" : "Paid"} 
          className={student.amountPending > 0 ? "border-l-red-500" : "border-l-green-500"}
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

  return (
    <PageWrapper 
      title={`Student: ${student.name}`}
      breadcrumbs={[
        { label: "Students", href: "/students" },
        { label: student.name }
      ]}
      actions={
        <Button onClick={() => setLocation(`/students/${id}/edit`)}>
          <Edit className="w-4 h-4 mr-2" />
          Edit Student
        </Button>
      }
    >
      <SectionTabs 
        items={[
          { value: "overview", label: "Overview", content: overviewTab },
          { value: "payments", label: "Payments", content: paymentsTab },
          { value: "legal", label: "Legal Services", content: legalTab },
          { value: "documents", label: "Documents", content: (
            <div className="grid gap-4 md:grid-cols-3">
              {[1, 2, 3].map(i => (
                <div key={i} className="border rounded-lg p-4 flex items-center justify-between bg-card">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 bg-primary/10 rounded flex items-center justify-center text-primary">
                      <FileText className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="font-medium text-sm">Document_{i}.pdf</p>
                      <p className="text-xs text-muted-foreground">Uploaded 2 days ago</p>
                    </div>
                  </div>
                  <Button variant="ghost" size="icon">
                    <Download className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          )},
        ]}
      />
    </PageWrapper>
  );
}
