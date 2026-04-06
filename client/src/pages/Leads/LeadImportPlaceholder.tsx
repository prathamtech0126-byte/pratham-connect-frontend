import { PageWrapper } from "@/layout/PageWrapper";
import { useAuth } from "@/context/auth-context";
import { canUseCsvImportExport } from "@/lib/lead-permissions";
import { Redirect } from "wouter";
import { Upload } from "lucide-react";

export default function LeadImportPlaceholder() {
  const { user } = useAuth();
  if (!user || !canUseCsvImportExport(user.role)) return <Redirect to="/" />;
  return (
    <PageWrapper title="Import leads" breadcrumbs={[{ label: "Leads", href: "/leads" }, { label: "Import" }]}>
      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-muted/20 py-16 text-center">
        <Upload className="h-12 w-12 text-muted-foreground mb-4" />
        <p className="text-muted-foreground">CSV import will be implemented in a later step.</p>
      </div>
    </PageWrapper>
  );
}
