// client/src/pages/Reports/PaymentsPage.tsx

import PaymentsSection from "@/components/payments/PaymentsSection";
import { Card, CardContent } from "@/components/ui/card";

export default function PaymentsPage() {
  return (
    <div className="flex flex-col gap-4 p-4 md:p-6">
      
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Payments Report
        </h1>
        <p className="text-sm text-muted-foreground">
          View and analyze all payment transactions
        </p>
      </div>

      {/* Main Section */}
      <Card>
        <CardContent className="p-0">
          <PaymentsSection />
        </CardContent>
      </Card>

    </div>
  );
}