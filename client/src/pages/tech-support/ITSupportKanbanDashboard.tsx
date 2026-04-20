import { PageWrapper } from "@/layout/PageWrapper";
import { TechSupportBoard } from "./TechSupportBoard";

export function ITSupportKanbanDashboard() {
  return (
    <PageWrapper title="Dashboard">
      <div className="space-y-6">
       
        <TechSupportBoard boardType="all" showRealtimeApprovalToast />
      </div>
    </PageWrapper>
  );
}
