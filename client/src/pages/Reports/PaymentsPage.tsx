// client/src/pages/Reports/PaymentsPage.tsx

import PaymentsSection from "@/components/payments/PaymentsSection";

export default function PaymentsPage() {
  return (
    <div className="flex flex-col gap-3 sm:gap-4 p-3 sm:p-4 md:p-6 max-w-full min-w-0">

      {/* Page Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-semibold tracking-tight">
          Payments Report
        </h1>
        <p className="text-xs sm:text-sm text-muted-foreground">
          View and analyze all payment transactions
        </p>
      </div>

      {/* Main Section */}
      <PaymentsSection />

    </div>
  );
}