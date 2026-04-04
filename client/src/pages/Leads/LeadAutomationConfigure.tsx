import { useRoute, Link } from "wouter";
import { PageWrapper } from "@/layout/PageWrapper";
import { useAuth } from "@/context/auth-context";
import { canUseCsvImportExport } from "@/lib/lead-permissions";
import { Redirect } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { ArrowLeft } from "lucide-react";
import { ReactNode } from "react";

interface ConfigureConfig {
  title: string;
  description: string;
  detail: ReactNode;
}

const CONFIGURE_MAP: Record<string, ConfigureConfig> = {
  // Lead sources
  privyr: {
    title: "Privyr Lead Forms",
    description: "Create lead forms and receive instant alerts for new leads.",
    detail: (
      <ConfigureForm
        fields={[
          { name: "Form name", placeholder: "My lead form", type: "text" },
          { name: "Webhook URL", placeholder: "https://...", type: "url" },
        ]}
        submitLabel="Save form settings"
      />
    ),
  },
  facebook: {
    title: "Facebook & Instagram Lead Ads",
    description: "Receive new leads from Facebook & Instagram Lead Ads.",
    detail: (
      <ConfigureForm
        fields={[
          { name: "Page ID", placeholder: "Your Facebook Page ID", type: "text" },
          { name: "Access token", placeholder: "••••••••", type: "password" },
        ]}
        submitLabel="Update connection"
      />
    ),
  },
  linkedin: {
    title: "LinkedIn Lead Gen",
    description: "Receive new leads from LinkedIn Lead Generation ads.",
    detail: (
      <ConfigureForm
        fields={[
          { name: "Campaign ID", placeholder: "LinkedIn campaign ID", type: "text" },
          { name: "API key", placeholder: "••••••••", type: "password" },
        ]}
        submitLabel="Connect LinkedIn"
      />
    ),
  },
  wordpress: {
    title: "WordPress Websites",
    description: "Receive new leads from your WordPress contact forms.",
    detail: (
      <ConfigureForm
        fields={[
          { name: "Site URL", placeholder: "https://yoursite.com", type: "url" },
          { name: "Webhook secret", placeholder: "Optional secret for verification", type: "text" },
        ]}
        submitLabel="Connect website"
      />
    ),
  },
  whatsapp: {
    title: "WhatsApp Chats",
    description: "Automatically create leads from your WhatsApp conversations.",
    detail: (
      <ConfigureForm
        fields={[
          { name: "WhatsApp Business ID", placeholder: "Your business account ID", type: "text" },
          { name: "Phone number", placeholder: "+91 ...", type: "tel" },
        ]}
        submitLabel="Save configuration"
      />
    ),
  },
  "google-forms": {
    title: "Google Forms",
    description: "Receive new leads from Google Forms submissions.",
    detail: (
      <ConfigureForm
        fields={[
          { name: "Form ID", placeholder: "Google Form ID from URL", type: "text" },
          { name: "Webhook URL", placeholder: "https://...", type: "url" },
        ]}
        submitLabel="Connect form"
      />
    ),
  },
  // Lead automations
  "whatsapp-autoresponder": {
    title: "WhatsApp Auto-Responder",
    description: "Instantly message new leads on WhatsApp from your own number.",
    detail: (
      <ConfigureForm
        fields={[
          { name: "Welcome message", placeholder: "Hi! Thanks for your interest...", type: "text" },
          { name: "Delay (seconds)", placeholder: "0", type: "number" },
        ]}
        switches={[{ name: "Enable auto-responder", label: "Send message automatically" }]}
        submitLabel="Save automation"
      />
    ),
  },
  "meta-conversions": {
    title: "Meta Conversions API",
    description: "Optimise your Facebook Lead Ad campaigns.",
    detail: (
      <ConfigureForm
        fields={[
          { name: "Pixel ID", placeholder: "Meta Pixel ID", type: "text" },
          { name: "Access token", placeholder: "••••••••", type: "password" },
        ]}
        switches={[{ name: "Send events", label: "Send lead events to Meta" }]}
        submitLabel="Save settings"
      />
    ),
  },
  "duplicate-merge": {
    title: "Duplicate Lead Merging",
    description: "Automatically merge duplicate leads by phone or email.",
    detail: (
      <ConfigureForm
        switches={[
          { name: "merge_by_phone", label: "Merge when phone number matches" },
          { name: "merge_by_email", label: "Merge when email matches" },
        ]}
        submitLabel="Save rules"
      />
    ),
  },
  "lead-assignment": {
    title: "Lead Assignment for Teams",
    description: "Assign leads via rules or round robin.",
    detail: (
      <ConfigureForm
        fields={[
          { name: "Assignment rule", placeholder: "e.g. Round robin", type: "text" },
        ]}
        switches={[{ name: "enabled", label: "Enable automatic assignment" }]}
        submitLabel="Save assignment rules"
      />
    ),
  },
  "lead-distribution": {
    title: "Lead Distribution",
    description: "Forward new leads to email, WhatsApp, or CRM.",
    detail: (
      <ConfigureForm
        fields={[
          { name: "Recipient emails", placeholder: "email1@example.com, email2@example.com", type: "text" },
        ]}
        switches={[{ name: "forward_email", label: "Forward copy by email" }]}
        submitLabel="Save distribution"
      />
    ),
  },
  // Import & Export
  "import-csv": {
    title: "Import Leads from CSV",
    description: "Bulk import contacts from a CSV file.",
    detail: (
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Upload a CSV file with columns: name, email, phone, source. Maximum file size 5 MB.
        </p>
        <Link href="/leads/import">
          <Button>Go to Import page</Button>
        </Link>
      </div>
    ),
  },
  "export-list": {
    title: "Export Lead List",
    description: "Download your lead list in CSV format.",
    detail: (
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Export leads with current filters. Choose date range and format on the lead list page.
        </p>
        <Link href="/leads">
          <Button>Go to Lead list</Button>
        </Link>
      </div>
    ),
  },
};

function ConfigureForm({
  fields = [],
  switches = [],
  submitLabel,
}: {
  fields?: { name: string; placeholder: string; type: string }[];
  switches?: { name: string; label: string }[];
  submitLabel: string;
}) {
  return (
    <form className="space-y-6">
      {fields.map((f) => (
        <div key={f.name} className="space-y-2">
          <Label htmlFor={f.name}>{f.name}</Label>
          <Input id={f.name} placeholder={f.placeholder} type={f.type} className="max-w-md" />
        </div>
      ))}
      {switches.map((s) => (
        <div key={s.name} className="flex items-center justify-between rounded-lg border border-border/60 p-4 max-w-md">
          <Label htmlFor={s.name} className="cursor-pointer flex-1">
            {s.label}
          </Label>
          <Switch id={s.name} />
        </div>
      ))}
      <Button type="submit">{submitLabel}</Button>
    </form>
  );
}

export default function LeadAutomationConfigure() {
  const { user } = useAuth();
  const [, params] = useRoute("/leads/automation/configure/:id");
  const id = params?.id ?? "";

  if (!user || !canUseCsvImportExport(user.role)) {
    return <Redirect to="/" />;
  }

  const config = id ? CONFIGURE_MAP[id] : null;

  if (!config) {
    return (
      <PageWrapper
        title="Not found"
        breadcrumbs={[
          { label: "Leads", href: "/leads" },
          { label: "Automation", href: "/leads/automation" },
          { label: "Configure" },
        ]}
      >
        <p className="text-muted-foreground">This configuration page does not exist.</p>
        <Link href="/leads/automation">
          <Button variant="outline" className="mt-4 gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back to Automation
          </Button>
        </Link>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper
      title={config.title}
      breadcrumbs={[
        { label: "Leads", href: "/leads" },
        { label: "Automation", href: "/leads/automation" },
        { label: config.title },
      ]}
      actions={
        <Link href="/leads/automation">
          <Button variant="outline" size="sm" className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
        </Link>
      }
    >
      <Card className="border-border/60 shadow-sm max-w-2xl">
        <CardHeader>
          <CardTitle className="text-base">{config.title}</CardTitle>
          <CardDescription>{config.description}</CardDescription>
        </CardHeader>
        <CardContent>{config.detail}</CardContent>
      </Card>
    </PageWrapper>
  );
}
