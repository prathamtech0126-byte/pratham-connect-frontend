import { useState } from "react";
import { PageWrapper } from "@/layout/PageWrapper";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, CheckCircle2, Clock, XCircle } from "lucide-react";
import { usePageHint } from "@/hooks/usePageHint";
import { ProductTour } from "@/components/ProductTour";

type VisaAppStatus = "pending" | "submitted" | "biometrics_scheduled" | "biometrics_done" | "interview_scheduled" | "interview_done" | "approved" | "rejected";

interface VisaApplication {
  id: string; clientName: string; clientCode: string; appNumber: string;
  country: string; visaType: string; status: VisaAppStatus;
  submittedAt: string; biometricsDate: string | null;
  interviewDate: string | null; decisionDate: string | null;
  validFrom: string | null; validTo: string | null;
  rejectionReason: string | null; appOfficer: string; bindingOfficer: string;
}

const MOCK_APPS: VisaApplication[] = [
  { id: "v1", clientName: "Trushaben Patel", clientCode: "PC-2024-0003", appNumber: "VFS-2024-UK-003", country: "UK", visaType: "Spouse", status: "submitted", submittedAt: "12 May 2025", biometricsDate: null, interviewDate: null, decisionDate: null, validFrom: null, validTo: null, rejectionReason: null, appOfficer: "Kaveri Jha", bindingOfficer: "Sunita Rao" },
  { id: "v2", clientName: "Meenalben Manishgar", clientCode: "PC-2024-0004", appNumber: "VFS-2024-DE-004", country: "Germany", visaType: "Student", status: "biometrics_scheduled", submittedAt: "8 May 2025", biometricsDate: "28 May 2025", interviewDate: null, decisionDate: null, validFrom: null, validTo: null, rejectionReason: null, appOfficer: "Kaveri Jha", bindingOfficer: "Amit Roy" },
  { id: "v3", clientName: "Talat Jahan", clientCode: "PC-2024-0005", appNumber: "VFS-2024-CA-005", country: "Canada", visaType: "Visitor", status: "interview_scheduled", submittedAt: "1 May 2025", biometricsDate: "15 May 2025", interviewDate: "20 Jun 2025", decisionDate: null, validFrom: null, validTo: null, rejectionReason: null, appOfficer: "Kaveri Jha", bindingOfficer: "Sunita Rao" },
  { id: "v4", clientName: "Pooja Rao", clientCode: "PC-2024-0006", appNumber: "VFS-2024-US-006", country: "USA", visaType: "Student", status: "approved", submittedAt: "20 Apr 2025", biometricsDate: "5 May 2025", interviewDate: "12 May 2025", decisionDate: "22 May 2025", validFrom: "1 Jun 2025", validTo: "31 May 2027", rejectionReason: null, appOfficer: "Kaveri Jha", bindingOfficer: "Amit Roy" },
  { id: "v5", clientName: "Hemali Kanjaria", clientCode: "PC-2024-0001", appNumber: "VFS-2024-CA-001", country: "Canada", visaType: "Student", status: "pending", submittedAt: "—", biometricsDate: null, interviewDate: null, decisionDate: null, validFrom: null, validTo: null, rejectionReason: null, appOfficer: "Kaveri Jha", bindingOfficer: "Sunita Rao" },
  { id: "v6", clientName: "Sidikaben Vahora", clientCode: "PC-2024-0002", appNumber: "VFS-2024-AU-002", country: "Australia", visaType: "Work", status: "rejected", submittedAt: "10 Apr 2025", biometricsDate: "25 Apr 2025", interviewDate: null, decisionDate: "15 May 2025", validFrom: null, validTo: null, rejectionReason: "Insufficient financial documentation", appOfficer: "Kaveri Jha", bindingOfficer: "Amit Roy" },
];

const STATUS_STEPS: VisaAppStatus[] = ["pending", "submitted", "biometrics_scheduled", "biometrics_done", "interview_scheduled", "interview_done", "approved"];

const STATUS_LABEL: Record<VisaAppStatus, string> = {
  pending: "Pending", submitted: "Submitted",
  biometrics_scheduled: "Biometrics Scheduled", biometrics_done: "Biometrics Done",
  interview_scheduled: "Interview Scheduled", interview_done: "Interview Done",
  approved: "Approved", rejected: "Rejected",
};

const STATUS_COLOR: Record<VisaAppStatus, string> = {
  pending: "bg-muted text-muted-foreground",
  submitted: "bg-blue-100 text-blue-700",
  biometrics_scheduled: "bg-yellow-100 text-yellow-700",
  biometrics_done: "bg-orange-100 text-orange-700",
  interview_scheduled: "bg-purple-100 text-purple-700",
  interview_done: "bg-indigo-100 text-indigo-700",
  approved: "bg-green-100 text-green-700",
  rejected: "bg-red-100 text-red-700",
};

export default function CxVisaTracker() {
  const { showHint, dismissHint } = usePageHint("cx_visa_tracker");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const filtered = MOCK_APPS.filter(a => {
    const matchesSearch = a.clientName.toLowerCase().includes(search.toLowerCase()) || a.clientCode.toLowerCase().includes(search.toLowerCase()) || a.appNumber.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === "all" || a.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const approved = MOCK_APPS.filter(a => a.status === "approved").length;
  const rejected = MOCK_APPS.filter(a => a.status === "rejected").length;
  const inProgress = MOCK_APPS.filter(a => !["approved", "rejected", "pending"].includes(a.status)).length;

  return (
    <PageWrapper
      title="Visa Application Tracker"
      breadcrumbs={[{ label: "CX Team", href: "/" }, { label: "Visa Tracker" }]}
      actions={
        <div data-tour="visa-summary" className="flex gap-3 text-sm">
          <span className="flex items-center gap-1.5 text-green-600 font-medium"><CheckCircle2 className="h-4 w-4" />{approved} Approved</span>
          <span className="flex items-center gap-1.5 text-blue-600 font-medium"><Clock className="h-4 w-4" />{inProgress} In Progress</span>
          <span className="flex items-center gap-1.5 text-red-600 font-medium"><XCircle className="h-4 w-4" />{rejected} Rejected</span>
        </div>
      }
    >
      <Card className="bg-card border-border shadow-sm">
        <div data-tour="visa-filters" className="p-4 border-b border-border flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search by client, code or application number..." className="pl-8" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[200px]"><SelectValue placeholder="Filter by status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              {(Object.keys(STATUS_LABEL) as VisaAppStatus[]).map(s => (
                <SelectItem key={s} value={s}>{STATUS_LABEL[s]}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50 hover:bg-muted/50">
                <TableHead>Client</TableHead>
                <TableHead>Application No.</TableHead>
                <TableHead>Country / Visa</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Submitted</TableHead>
                <TableHead>Biometrics</TableHead>
                <TableHead>Interview</TableHead>
                <TableHead>Decision</TableHead>
                <TableHead>Valid Period</TableHead>
                <TableHead>App Officer</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow><TableCell colSpan={10} className="h-24 text-center text-muted-foreground">No applications match the filter.</TableCell></TableRow>
              ) : filtered.map(app => (
                <TableRow key={app.id} className="hover:bg-accent/50">
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Avatar className="h-7 w-7">
                        <AvatarFallback className="text-xs bg-muted">{app.clientName.split(" ").map(n => n[0]).join("")}</AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium text-sm">{app.clientName}</p>
                        <p className="text-xs text-muted-foreground">{app.clientCode}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm font-mono">{app.appNumber}</TableCell>
                  <TableCell>
                    <p className="text-sm">{app.country}</p>
                    <p className="text-xs text-muted-foreground">{app.visaType}</p>
                  </TableCell>
                  <TableCell>
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium capitalize ${STATUS_COLOR[app.status]}`}>
                      {STATUS_LABEL[app.status]}
                    </span>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{app.submittedAt}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{app.biometricsDate ?? "—"}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{app.interviewDate ?? "—"}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {app.decisionDate ?? "—"}
                    {app.status === "rejected" && app.rejectionReason && (
                      <p className="text-xs text-red-500 mt-0.5">{app.rejectionReason}</p>
                    )}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {app.validFrom ? `${app.validFrom} → ${app.validTo}` : "—"}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{app.appOfficer}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <div className="px-4 py-3 border-t border-border text-xs text-muted-foreground">
            Showing {filtered.length} of {MOCK_APPS.length} applications
          </div>
        </CardContent>
      </Card>

      <ProductTour
        open={showHint}
        onClose={dismissHint}
        steps={[
          { target: '[placeholder="Search by client, code or application number..."]', title: "Search Applications", content: "Search by client name, code, or application number to quickly find any visa case.", side: "bottom" },
          { target: '[data-tour="visa-filters"]', title: "Filter by Status", content: "Filter by any of the 8 visa statuses — from Pending through to Approved or Rejected.", side: "bottom" },
          { target: '[data-tour="visa-summary"]', title: "Header Summary", content: "Live count of Approved, In Progress, and Rejected applications at a glance.", side: "bottom" },
        ]}
      />
    </PageWrapper>
  );
}
