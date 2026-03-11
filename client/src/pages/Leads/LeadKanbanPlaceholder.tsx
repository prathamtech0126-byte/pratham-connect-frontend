import { PageWrapper } from "@/layout/PageWrapper";
import { useAuth } from "@/context/auth-context";
import { canAccessLeads } from "@/lib/lead-permissions";
import { Redirect } from "wouter";
import { LayoutGrid } from "lucide-react";

export default function LeadKanbanPlaceholder() {
  const { user } = useAuth();
  if (!user || !canAccessLeads(user.role)) return <Redirect to="/" />;
  return (
    <PageWrapper title="Kanban" breadcrumbs={[{ label: "Leads", href: "/leads" }, { label: "Kanban" }]}>
      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-muted/20 py-16 text-center">
        <LayoutGrid className="h-12 w-12 text-muted-foreground mb-4" />
        <p className="text-muted-foreground">Kanban board will be implemented in the next step.</p>
      </div>
    </PageWrapper>
  );
}
