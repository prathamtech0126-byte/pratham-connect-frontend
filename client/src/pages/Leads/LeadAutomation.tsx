import { Link } from "wouter";
import { PageWrapper } from "@/layout/PageWrapper";
import { useAuth } from "@/context/auth-context";
import { canUseCsvImportExport } from "@/lib/lead-permissions";
import { Redirect } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  FormInput,
  Share2,
  MessageCircle,
  Globe,
  FileText,
  Merge,
  Users,
  Send,
  FileUp,
  FileDown,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";

type IntegrationStatus = "connected" | "configure" | "not_connected";

interface SourceIntegration {
  id: string;
  name: string;
  description: string;
  status: IntegrationStatus;
  icon: React.ReactNode;
}

interface AutomationItem {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
}

const LEAD_SOURCES: SourceIntegration[] = [
  {
    id: "privyr",
    name: "Privyr Lead Forms",
    description: "Create Lead Forms using a simple form builder and receive instant alerts for new leads",
    status: "configure",
    icon: <FormInput className="h-6 w-6 text-primary" />,
  },
  {
    id: "facebook",
    name: "Facebook",
    description: "Receive new leads from Facebook & Instagram Lead Ads in your account",
    status: "connected",
    icon: <Share2 className="h-6 w-6 text-[#1877F2]" />,
  },
  {
    id: "linkedin",
    name: "LinkedIn",
    description: "Receive new leads from LinkedIn Lead Generation ads in your account",
    status: "not_connected",
    icon: <Share2 className="h-6 w-6 text-[#0A66C2]" />,
  },
  {
    id: "wordpress",
    name: "WordPress Websites",
    description: "Receive new leads from your WordPress website contact forms in your account",
    status: "not_connected",
    icon: <Globe className="h-6 w-6 text-[#21759B]" />,
  },
  {
    id: "whatsapp",
    name: "WhatsApp Chats",
    description: "Automatically create leads from your WhatsApp conversations",
    status: "configure",
    icon: <MessageCircle className="h-6 w-6 text-[#25D366]" />,
  },
  {
    id: "google-forms",
    name: "Google Forms",
    description: "Receive new leads from Google Forms in your account",
    status: "configure",
    icon: <FileText className="h-6 w-6 text-primary" />,
  },
];

const LEAD_AUTOMATIONS: AutomationItem[] = [
  {
    id: "whatsapp-autoresponder",
    name: "WhatsApp Auto-Responder",
    description: "Instantly message new leads on WhatsApp from your own WhatsApp number",
    icon: <MessageCircle className="h-6 w-6 text-[#25D366]" />,
  },
  {
    id: "meta-conversions",
    name: "Meta Conversions API",
    description: "Optimise your Facebook Lead Ad campaigns to improve lead quality and reduce costs",
    icon: <Share2 className="h-6 w-6 text-[#1877F2]" />,
  },
  {
    id: "duplicate-merge",
    name: "Duplicate Lead Merging",
    description: "Automatically merge duplicate leads with the same phone number and/or email address",
    icon: <Merge className="h-6 w-6 text-primary" />,
  },
  {
    id: "lead-assignment",
    name: "Lead Assignment for Teams",
    description: "Assign leads to your team members via rules and/or round robin assignment",
    icon: <Users className="h-6 w-6 text-primary" />,
  },
  {
    id: "lead-distribution",
    name: "Lead Distribution",
    description: "Forward a copy of new leads to one or more recipients via email, WhatsApp, or CRM",
    icon: <Send className="h-6 w-6 text-primary" />,
  },
];

export default function LeadAutomation() {
  const { user } = useAuth();

  if (!user || !canUseCsvImportExport(user.role)) {
    return <Redirect to="/" />;
  }

  return (
    <PageWrapper
      title="Automation"
      breadcrumbs={[
        { label: "Leads", href: "/leads" },
        { label: "Automation" },
      ]}
      actions={
        <Button variant="outline" size="sm" className="gap-1" asChild>
          <Link href="/leads/automation">
            View All Lead Sources
            <ChevronRight className="h-4 w-4" />
          </Link>
        </Button>
      }
    >
      <div className="space-y-10">
        {/* Lead Source Integrations */}
        <section>
          <div className="mb-4">
            <h2 className="text-lg font-semibold text-foreground">Lead Source Integrations</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Connect your website, lead ads, contact forms, and other sources for instant lead
              alerts and automatic importing of leads.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {LEAD_SOURCES.map((source) => (
              <Card
                key={source.id}
                className="overflow-hidden border-border/60 shadow-sm hover:shadow-md transition-shadow"
              >
                <CardContent className="p-5">
                  <div className="flex items-start gap-4">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-muted">
                      {source.icon}
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="font-semibold text-foreground">{source.name}</h3>
                      <p className="text-sm text-muted-foreground mt-1 leading-snug">
                        {source.description}
                      </p>
                      <div className="mt-4 flex flex-wrap items-center gap-2">
                        {source.status === "connected" && (
                          <span className="text-xs font-medium text-green-600 dark:text-green-400">
                            Connected
                          </span>
                        )}
                        {source.status === "not_connected" && (
                          <span className="text-xs font-medium text-muted-foreground">
                            Not Connected
                          </span>
                        )}
                        <Link href={`/leads/automation/configure/${source.id}`}>
                          <Button variant="link" className="h-auto p-0 text-primary gap-0.5 text-sm">
                            {source.status === "not_connected" ? "Connect" : "Configure"}
                            <ChevronRight className="h-4 w-4" />
                          </Button>
                        </Link>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* Lead Automations */}
        <section>
          <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-foreground">Lead Automations</h2>
              <p className="text-sm text-muted-foreground mt-1">
                Configure rules and automations that run whenever a lead is received from your
                connected lead sources.
              </p>
            </div>
            <Button variant="outline" size="sm" className="gap-1 shrink-0" asChild>
              <Link href="/leads/automation">
                View All Lead Automations
                <ChevronRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {LEAD_AUTOMATIONS.map((auto) => (
              <Card
                key={auto.id}
                className="overflow-hidden border-border/60 shadow-sm hover:shadow-md transition-shadow"
              >
                <CardContent className="p-5">
                  <div className="flex items-start gap-4">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-muted">
                      {auto.icon}
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="font-semibold text-foreground">{auto.name}</h3>
                      <p className="text-sm text-muted-foreground mt-1 leading-snug">
                        {auto.description}
                      </p>
                      <div className="mt-4">
                        <Link href={`/leads/automation/configure/${auto.id}`}>
                          <Button variant="link" className="h-auto p-0 text-primary gap-0.5 text-sm">
                            Configure
                            <ChevronRight className="h-4 w-4" />
                          </Button>
                        </Link>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* Import & Export Data */}
        <section>
          <div className="mb-4">
            <h2 className="text-lg font-semibold text-foreground">Import & Export Data</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Bulk import leads from a spreadsheet, download your lead and activity data, and more.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Link href="/leads/automation/configure/import-csv">
              <Card
                className={cn(
                  "overflow-hidden border-border/60 shadow-sm transition-all",
                  "hover:shadow-md hover:border-primary/30 cursor-pointer"
                )}
              >
                <CardContent className="p-5">
                  <div className="flex items-start gap-4">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                      <FileUp className="h-6 w-6 text-primary" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="font-semibold text-foreground">Import Leads from CSV</h3>
                      <p className="text-sm text-muted-foreground mt-1 leading-snug">
                        Bulk import contacts from a CSV file into your account.
                      </p>
                      <div className="mt-4">
                        <span className="inline-flex items-center gap-0.5 text-sm font-medium text-primary">
                          Configure
                          <ChevronRight className="h-4 w-4" />
                        </span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
            <Link href="/leads/automation/configure/export-list">
              <Card
                className={cn(
                  "overflow-hidden border-border/60 shadow-sm transition-all",
                  "hover:shadow-md hover:border-primary/30 cursor-pointer"
                )}
              >
                <CardContent className="p-5">
                  <div className="flex items-start gap-4">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                      <FileDown className="h-6 w-6 text-primary" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="font-semibold text-foreground">Export Lead List</h3>
                      <p className="text-sm text-muted-foreground mt-1 leading-snug">
                        Receive a download of your lead list in CSV format.
                      </p>
                      <div className="mt-4">
                        <span className="inline-flex items-center gap-0.5 text-sm font-medium text-primary">
                          Configure
                          <ChevronRight className="h-4 w-4" />
                        </span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          </div>
        </section>
      </div>
    </PageWrapper>
  );
}
