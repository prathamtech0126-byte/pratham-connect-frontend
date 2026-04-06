import { useRoute } from "wouter";
import { PageWrapper } from "@/layout/PageWrapper";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/auth-context";
import { canAccessLeads } from "@/lib/lead-permissions";
import { Redirect, Link } from "wouter";
import { DUMMY_LEADS } from "@/data/dummyLeads";
import { format } from "date-fns";
import { ArrowLeft } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";

export default function LeadDetail() {
  const { user } = useAuth();
  const [, params] = useRoute("/leads/:id");

  if (!user || !canAccessLeads(user.role)) {
    return <Redirect to="/" />;
  }

  const id = params?.id;
  const lead = id ? DUMMY_LEADS.find((l) => l.id === id) : null;

  if (!lead) {
    return (
      <PageWrapper title="Lead not found" breadcrumbs={[{ label: "Leads", href: "/leads" }]}>
        <p className="text-muted-foreground">This lead does not exist or you don’t have access.</p>
        <Link href="/leads">
          <Button variant="outline" className="mt-4">
            <ArrowLeft className="h-4 w-4" />
            Back to list
          </Button>
        </Link>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper
      title={lead.name}
      breadcrumbs={[
        { label: "Leads", href: "/leads" },
        { label: lead.name },
      ]}
      actions={
        <Link href="/leads">
          <Button variant="outline" size="sm">
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
        </Link>
      }
    >
      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-1 sm:grid-cols-3">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="notes">Notes</TabsTrigger>
          <TabsTrigger value="followups">Followups</TabsTrigger>
        </TabsList>
        <TabsContent value="overview" className="mt-6">
          <div className="rounded-xl border border-border/60 bg-card p-6 shadow-sm space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Email</p>
                <p className="text-sm font-medium">{lead.email}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Phone</p>
                <p className="text-sm font-medium">{lead.phone}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Source</p>
                <p className="text-sm font-medium">{lead.source}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Status</p>
                <Badge variant="secondary" className="capitalize">{lead.status}</Badge>
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Stage</p>
                <p className="text-sm font-medium">{lead.stage}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Assigned to</p>
                <p className="text-sm font-medium">{lead.assignedToName ?? "Unassigned"}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Created</p>
                <p className="text-sm font-medium">{format(new Date(lead.createdAt), "dd MMM yyyy HH:mm")}</p>
              </div>
            </div>
          </div>
        </TabsContent>
        <TabsContent value="notes" className="mt-6">
          <div className="rounded-xl border border-border/60 bg-card p-6 shadow-sm">
            <p className="text-sm text-muted-foreground">No notes yet. (Dummy data.)</p>
          </div>
        </TabsContent>
        <TabsContent value="followups" className="mt-6">
          <div className="rounded-xl border border-border/60 bg-card p-6 shadow-sm">
            <p className="text-sm text-muted-foreground">No followups yet. (Dummy data.)</p>
          </div>
        </TabsContent>
      </Tabs>
    </PageWrapper>
  );
}
