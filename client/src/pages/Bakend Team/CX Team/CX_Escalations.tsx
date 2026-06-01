import { useState } from "react";
import { PageWrapper } from "@/layout/PageWrapper";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, AlertTriangle, Clock, CheckCircle2 } from "lucide-react";
import { usePageHint } from "@/hooks/usePageHint";
import { ProductTour } from "@/components/ProductTour";

type AlertType = "sla_breach" | "sla_warning" | "escalation";
type LifecycleStage = "documentation" | "backend_ops" | "binding" | "application" | "visa_filing" | "visa_result" | "post_visa" | "completed";

interface EscalationAlert {
  id: string; clientName: string; clientCode: string;
  type: AlertType; message: string; stage: LifecycleStage;
  raisedAt: string; escalatedTo: string | null;
  resolved: boolean; resolvedAt: string | null;
  hoursOverdue: number | null;
}

const MOCK_ESCALATIONS: EscalationAlert[] = [
  { id: "es1", clientName: "Hemali Kanjaria", clientCode: "PC-2024-0001", type: "sla_breach", message: "Documentation stage TAT breached — overdue by 3 hours. Client has not uploaded all required documents.", stage: "documentation", raisedAt: "Today, 07:00 AM", escalatedTo: "Ravi Kumar (Backend Manager)", resolved: false, resolvedAt: null, hoursOverdue: 3 },
  { id: "es2", clientName: "Sidikaben Vahora", clientCode: "PC-2024-0002", type: "sla_warning", message: "Application stage approaching TAT deadline — 8 hours remaining before breach.", stage: "application", raisedAt: "Today, 09:00 AM", escalatedTo: null, resolved: false, resolvedAt: null, hoursOverdue: null },
  { id: "es3", clientName: "Meenalben Manishgar", clientCode: "PC-2024-0004", type: "escalation", message: "Manual escalation raised — client on hold for 5 days, visa filing delayed. Backend manager intervention required.", stage: "visa_filing", raisedAt: "Today, 09:30 AM", escalatedTo: "Ravi Kumar (Backend Manager)", resolved: false, resolvedAt: null, hoursOverdue: null },
  { id: "es4", clientName: "Trushaben Patel", clientCode: "PC-2024-0003", type: "sla_warning", message: "Binding stage TAT warning — 12 hours remaining.", stage: "binding", raisedAt: "Yesterday, 04:00 PM", escalatedTo: null, resolved: false, resolvedAt: null, hoursOverdue: null },
  { id: "es5", clientName: "Talat Jahan", clientCode: "PC-2024-0005", type: "sla_breach", message: "Visa filing TAT breached — overdue by 1 hour. Awaiting officer action.", stage: "visa_filing", raisedAt: "Yesterday, 06:00 PM", escalatedTo: "Priya Singh (Counsellor)", resolved: true, resolvedAt: "Yesterday, 08:15 PM", hoursOverdue: 1 },
];

const STAGE_LABEL: Record<LifecycleStage, string> = {
  documentation: "Documentation", backend_ops: "Backend Ops", binding: "Binding",
  application: "Application", visa_filing: "Visa Filing", visa_result: "Visa Result",
  post_visa: "Post Visa", completed: "Completed",
};

const STAGE_COLOR: Record<LifecycleStage, string> = {
  documentation: "bg-blue-100 text-blue-700",
  backend_ops: "bg-purple-100 text-purple-700",
  binding: "bg-indigo-100 text-indigo-700",
  application: "bg-yellow-100 text-yellow-700",
  visa_filing: "bg-orange-100 text-orange-700",
  visa_result: "bg-cyan-100 text-cyan-700",
  post_visa: "bg-teal-100 text-teal-700",
  completed: "bg-green-100 text-green-700",
};

export default function CxEscalations() {
  const { showHint, dismissHint } = usePageHint("cx_escalations");
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("active");

  const filtered = MOCK_ESCALATIONS.filter(e => {
    const matchesSearch = e.clientName.toLowerCase().includes(search.toLowerCase()) || e.clientCode.toLowerCase().includes(search.toLowerCase());
    const matchesType = typeFilter === "all" || e.type === typeFilter;
    const matchesStatus = statusFilter === "all" || (statusFilter === "active" ? !e.resolved : e.resolved);
    return matchesSearch && matchesType && matchesStatus;
  });

  const breaches = MOCK_ESCALATIONS.filter(e => e.type === "sla_breach" && !e.resolved).length;
  const warnings = MOCK_ESCALATIONS.filter(e => e.type === "sla_warning" && !e.resolved).length;
  const escalations = MOCK_ESCALATIONS.filter(e => e.type === "escalation" && !e.resolved).length;

  return (
    <PageWrapper
      title="Escalation Alerts"
      breadcrumbs={[{ label: "CX Team", href: "/" }, { label: "Escalations" }]}
      actions={
        <div data-tour="esc-header" className="flex gap-3 text-sm">
          <span className="flex items-center gap-1.5 text-red-600 font-medium"><AlertTriangle className="h-4 w-4" />{breaches} Breach{breaches !== 1 ? "es" : ""}</span>
          <span className="flex items-center gap-1.5 text-orange-500 font-medium"><Clock className="h-4 w-4" />{warnings} Warning{warnings !== 1 ? "s" : ""}</span>
          <span className="flex items-center gap-1.5 text-yellow-600 font-medium"><AlertTriangle className="h-4 w-4" />{escalations} Escalation{escalations !== 1 ? "s" : ""}</span>
        </div>
      }
    >
      <div className="space-y-4">
        {/* Filters */}
        <div data-tour="esc-filters" className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search by client name or code..." className="pl-8" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-[180px]"><SelectValue placeholder="Alert type" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="sla_breach">🔴 TAT Breach</SelectItem>
              <SelectItem value="sla_warning">🟠 TAT Warning</SelectItem>
              <SelectItem value="escalation">⚠️ Escalation</SelectItem>
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[150px]"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="resolved">Resolved</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Alert Cards */}
        {filtered.length === 0 ? (
          <Card className="bg-card border-border shadow-sm">
            <CardContent className="flex flex-col items-center justify-center py-16 text-muted-foreground">
              <CheckCircle2 className="h-10 w-10 mb-3 text-green-500" />
              <p className="text-base font-medium">No alerts match the filter</p>
              <p className="text-sm mt-1">All escalations are under control.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {filtered.map(alert => (
              <Card
                key={alert.id}
                className={`border shadow-sm transition-all ${
                  alert.resolved ? "bg-muted/30 border-border opacity-70" :
                  alert.type === "sla_breach" ? "bg-red-50 border-red-200 dark:bg-red-950/20 dark:border-red-900" :
                  alert.type === "sla_warning" ? "bg-orange-50 border-orange-200 dark:bg-orange-950/20 dark:border-orange-900" :
                  "bg-yellow-50 border-yellow-200 dark:bg-yellow-950/20 dark:border-yellow-900"
                }`}
              >
                <CardContent className="pt-4 pb-4">
                  <div className="flex items-start gap-4">
                    {/* Client Avatar */}
                    <Avatar className="h-10 w-10 flex-shrink-0 mt-0.5">
                      <AvatarFallback className="text-sm bg-muted">{alert.clientName.split(" ").map(n => n[0]).join("")}</AvatarFallback>
                    </Avatar>

                    {/* Content */}
                    <div className="flex-1 min-w-0 space-y-2">
                      <div className="flex items-start justify-between gap-3 flex-wrap">
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className={`text-xs font-bold uppercase tracking-wide ${
                              alert.resolved ? "text-muted-foreground" :
                              alert.type === "sla_breach" ? "text-red-600" :
                              alert.type === "sla_warning" ? "text-orange-600" :
                              "text-yellow-700"
                            }`}>
                              {alert.type === "sla_breach" ? "🔴 TAT Breach" :
                               alert.type === "sla_warning" ? "🟠 TAT Warning" :
                               "⚠️ Escalation"}
                            </span>
                            {alert.resolved && (
                              <span className="inline-flex items-center gap-1 text-xs font-medium text-green-600">
                                <CheckCircle2 className="h-3.5 w-3.5" /> Resolved
                              </span>
                            )}
                          </div>
                          <p className="font-semibold text-sm text-foreground">
                            {alert.clientName}
                            <span className="text-muted-foreground font-normal text-xs ml-1.5">({alert.clientCode})</span>
                          </p>
                        </div>
                        <span className="text-xs text-muted-foreground flex-shrink-0">{alert.raisedAt}</span>
                      </div>

                      <p className="text-sm text-foreground/80 leading-relaxed">{alert.message}</p>

                      <div className="flex items-center gap-3 flex-wrap">
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${STAGE_COLOR[alert.stage]}`}>
                          {STAGE_LABEL[alert.stage]}
                        </span>
                        {alert.hoursOverdue !== null && (
                          <span className="text-xs text-red-600 font-medium">{alert.hoursOverdue}h overdue</span>
                        )}
                        {alert.escalatedTo && (
                          <span className="text-xs text-muted-foreground">Escalated to: <span className="font-medium text-foreground">{alert.escalatedTo}</span></span>
                        )}
                        {alert.resolvedAt && (
                          <span className="text-xs text-muted-foreground">Resolved at: {alert.resolvedAt}</span>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        <p className="text-xs text-muted-foreground text-center">
          Showing {filtered.length} of {MOCK_ESCALATIONS.length} alerts
        </p>
      </div>

      <ProductTour
        open={showHint}
        onClose={dismissHint}
        steps={[
          { target: '[data-tour="esc-header"]', title: "Alert Summary", content: "The header shows live counts of active TAT breaches, warnings, and escalations.", side: "bottom" },
          { target: '[data-tour="esc-filters"]', title: "Filter Alerts", content: "Filter by alert type (Breach / Warning / Escalation) and status (Active / Resolved) to focus on what matters.", side: "bottom" },
          { target: '[placeholder="Search by client name or code..."]', title: "Find a Client", content: "Search by client name or code to jump directly to that client's escalation alerts.", side: "bottom" },
        ]}
      />
    </PageWrapper>
  );
}
