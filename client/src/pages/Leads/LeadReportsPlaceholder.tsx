import { PageWrapper } from "@/layout/PageWrapper";
import { useAuth } from "@/context/auth-context";
import { canAccessCustomReports } from "@/lib/lead-permissions";
import { Redirect } from "wouter";
import { BarChart3 } from "lucide-react";

export default function LeadReportsPlaceholder() {
  const { user } = useAuth();
  if (!user || !canAccessCustomReports(user.role)) return <Redirect to="/" />;
  return (
    <PageWrapper title="Lead reports" breadcrumbs={[{ label: "Leads", href: "/leads" }, { label: "Reports" }]}>
      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-muted/20 py-16 text-center">
        <BarChart3 className="h-12 w-12 text-muted-foreground mb-4" />
        <p className="text-muted-foreground">Custom lead reports will be implemented in a later step.</p>
      </div>
    </PageWrapper>
  );
}
