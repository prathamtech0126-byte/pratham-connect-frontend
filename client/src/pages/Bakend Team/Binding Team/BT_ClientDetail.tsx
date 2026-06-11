import { useState } from "react";
import { useLocation } from "wouter";
import { PageWrapper } from "@/layout/PageWrapper";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  FileText, Users, CreditCard, CheckCircle2, Clock, AlertTriangle,
  ChevronLeft, Eye, CheckCheck, ArrowRight,
} from "lucide-react";
import { usePageHint } from "@/hooks/usePageHint";
import { ProductTour } from "@/components/ProductTour";
import { RequestFromCxButton } from "@/components/binding/RequestFromCxButton";

// ── Mock client detail ─────────────────────────────────────────────────

const MOCK_CLIENT = {
  id: "3",
  code: "PC-2024-0003",
  name: "Trushaben Patel",
  phone: "9988776655",
  email: "rohan@email.com",
  country: "UK",
  visaType: "Spouse",
  stage: "binding",
  status: "active" as const,
  slaRisk: "green" as "green" | "orange" | "red",
  dueAt: "2024-06-18",
  daysInBinding: 5,
  counsellor: "Priya Singh",
};

type DocStatus = "pending" | "uploaded" | "under_review" | "approved" | "rejected" | "missing" | "not_required";

interface Document {
  id: string; name: string; status: DocStatus;
  uploadedAt: string | null; rejectionReason: string | null;
  mandatory: boolean; verifiedForBinding: boolean;
}

const MOCK_DOCUMENTS: Document[] = [
  { id: "1", name: "Passport (Primary)", status: "approved", uploadedAt: "2024-06-08", rejectionReason: null, mandatory: true, verifiedForBinding: true },
  { id: "2", name: "Passport (Spouse)", status: "approved", uploadedAt: "2024-06-09", rejectionReason: null, mandatory: true, verifiedForBinding: true },
  { id: "3", name: "Marriage Certificate", status: "approved", uploadedAt: "2024-06-07", rejectionReason: null, mandatory: true, verifiedForBinding: true },
  { id: "4", name: "Bank Statements (6 months)", status: "approved", uploadedAt: "2024-06-10", rejectionReason: null, mandatory: true, verifiedForBinding: false },
  { id: "5", name: "Employment Letter", status: "approved", uploadedAt: "2024-06-08", rejectionReason: null, mandatory: true, verifiedForBinding: false },
  { id: "6", name: "Photographs (2 each)", status: "approved", uploadedAt: "2024-06-11", rejectionReason: null, mandatory: true, verifiedForBinding: true },
  { id: "7", name: "Travel History", status: "under_review", uploadedAt: "2024-06-12", rejectionReason: null, mandatory: false, verifiedForBinding: false },
  { id: "8", name: "Insurance Certificate", status: "pending", uploadedAt: null, rejectionReason: null, mandatory: true, verifiedForBinding: false },
  { id: "9", name: "Accommodation Proof", status: "rejected", uploadedAt: "2024-06-06", rejectionReason: "Document is expired — please upload a fresh copy.", mandatory: true, verifiedForBinding: false },
  { id: "10", name: "Cover Letter", status: "missing", uploadedAt: null, rejectionReason: null, mandatory: false, verifiedForBinding: false },
];

interface VisaApplication {
  id: string; applicationNumber: string; status: string;
  biometricsDate: string | null; interviewDate: string | null; decisionDate: string | null;
  notes: string;
}

const MOCK_VISA: VisaApplication = {
  id: "v1",
  applicationNumber: "UK-SPOUSE-2024-00312",
  status: "pending",
  biometricsDate: "2024-07-02",
  interviewDate: null,
  decisionDate: null,
  notes: "File compilation in progress — awaiting insurance certificate and fresh accommodation proof.",
};

interface Payment {
  id: string; type: string; amount: number; status: string; date: string;
}

const MOCK_PAYMENTS: Payment[] = [
  { id: "p1", type: "Initial Deposit", amount: 25000, status: "paid", date: "2024-05-20" },
  { id: "p2", type: "Processing Fee", amount: 15000, status: "paid", date: "2024-05-28" },
  { id: "p3", type: "Visa Fee", amount: 18500, status: "pending", date: "" },
];

interface FamilyMember {
  id: string; name: string; relation: string; dob: string; passportNumber: string;
}

const MOCK_FAMILY: FamilyMember[] = [
  { id: "f1", name: "Trushaben Patel", relation: "Primary", dob: "1990-03-15", passportNumber: "Z1234567" },
  { id: "f2", name: "Aisha Gupta", relation: "Spouse", dob: "1993-07-22", passportNumber: "Z7654321" },
];

interface TimelineEvent {
  id: string; action: string; actor: string; ts: string; type: string;
}

const MOCK_TIMELINE: TimelineEvent[] = [
  { id: "t1", action: "Client moved to binding stage", actor: "System", ts: "2024-06-09 10:00", type: "stage" },
  { id: "t2", action: "Marriage Certificate approved", actor: "Priya Singh", ts: "2024-06-09 14:22", type: "doc" },
  { id: "t3", action: "Accommodation Proof rejected — expired document", actor: "Priya Singh", ts: "2024-06-10 09:45", type: "doc" },
  { id: "t4", action: "Bank Statements uploaded by client", actor: "Trushaben Patel", ts: "2024-06-10 16:00", type: "doc" },
  { id: "t5", action: "Passport (Primary) verified for binding", actor: "You", ts: "2024-06-11 11:30", type: "binding" },
  { id: "t6", action: "TAT warning issued — 48h remaining", actor: "System", ts: "2024-06-12 08:00", type: "sla" },
];

const DOC_STATUS_LABEL: Record<DocStatus, string> = {
  pending: "Pending", uploaded: "Uploaded", under_review: "Under Review",
  approved: "Approved", rejected: "Rejected", missing: "Missing", not_required: "N/A",
};

const DOC_STATUS_CLASS: Record<DocStatus, string> = {
  pending: "bg-gray-100 text-gray-600",
  uploaded: "bg-blue-100 text-blue-700",
  under_review: "bg-yellow-100 text-yellow-700",
  approved: "bg-green-100 text-green-700",
  rejected: "bg-red-100 text-red-700",
  missing: "bg-orange-100 text-orange-700",
  not_required: "bg-muted text-muted-foreground",
};

const VISA_STATUSES = ["pending", "submitted", "biometrics_scheduled", "biometrics_done", "interview_scheduled", "interview_done", "approved", "rejected"];

const STAGES = ["documentation", "backend_ops", "binding", "application", "visa_filing", "visa_result", "post_visa", "completed"];

export default function BtClientDetail({ params }: { params?: { id?: string } }) {
  const { showHint, dismissHint } = usePageHint("bt_client_detail");
  const [, setLocation] = useLocation();
  const [activeTab, setActiveTab] = useState<"documents" | "visa" | "payments" | "family" | "timeline">("documents");
  const [documents, setDocuments] = useState(MOCK_DOCUMENTS);
  const [visaApp, setVisaApp] = useState(MOCK_VISA);
  const [statusDialog, setStatusDialog] = useState(false);
  const [newVisaStatus, setNewVisaStatus] = useState(visaApp.status);
  const [visaNotes, setVisaNotes] = useState(visaApp.notes);

  const totalDocs = documents.length;
  const approvedDocs = documents.filter(d => d.status === "approved").length;
  const verifiedDocs = documents.filter(d => d.verifiedForBinding).length;
  const pct = Math.round((approvedDocs / totalDocs) * 100);

  function handleVerify(docId: string) {
    setDocuments(prev => prev.map(d => d.id === docId ? { ...d, verifiedForBinding: true } : d));
  }

  function saveVisaStatus() {
    setVisaApp(v => ({ ...v, status: newVisaStatus, notes: visaNotes }));
    setStatusDialog(false);
  }

  const tabs = [
    { key: "documents", label: "Documents", icon: FileText },
    { key: "visa", label: "Visa Application", icon: CheckCircle2 },
    { key: "payments", label: "Payments", icon: CreditCard },
    { key: "family", label: "Family Members", icon: Users },
    { key: "timeline", label: "Timeline", icon: Clock },
  ] as const;

  const stageIndex = STAGES.indexOf(MOCK_CLIENT.stage);

  return (
    <PageWrapper
      title={MOCK_CLIENT.name}
      breadcrumbs={[
        { label: "Binding Team", href: "/binding/dashboard" },
        { label: "Clients", href: "/binding/clients" },
        { label: MOCK_CLIENT.name },
      ]}
      actions={
        <div className="flex items-center gap-2">
          <RequestFromCxButton clientId={MOCK_CLIENT.id} clientName={MOCK_CLIENT.name} label="Request from CX" />
          <Button variant="outline" size="sm" onClick={() => setLocation("/binding/clients")}>
            <ChevronLeft className="h-3.5 w-3.5 mr-1" /> Back
          </Button>
        </div>
      }
    >
      <div className="space-y-5">

        {/* ── Client Header ──────────────────────────────────────────── */}
        <Card data-tour="bt-client-header" className="bg-card border-border shadow-sm">
          <CardContent className="pt-5 pb-4">
            <div className="flex flex-col sm:flex-row sm:items-start gap-4">
              <div className="flex-1 grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground">Client Code</p>
                  <p className="text-sm font-semibold">{MOCK_CLIENT.code}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Visa Type</p>
                  <p className="text-sm font-semibold">{MOCK_CLIENT.visaType}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Country</p>
                  <p className="text-sm font-semibold">{MOCK_CLIENT.country}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">TAT Due</p>
                  <p className="text-sm font-semibold">{MOCK_CLIENT.dueAt}</p>
                </div>
              </div>
              <div className="flex gap-2 items-center">
                <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                  MOCK_CLIENT.slaRisk === "red" ? "bg-red-100 text-red-700" :
                  MOCK_CLIENT.slaRisk === "orange" ? "bg-orange-100 text-orange-700" :
                  "bg-green-100 text-green-700"
                }`}>
                  {MOCK_CLIENT.slaRisk === "red" ? "🔴 Breach" : MOCK_CLIENT.slaRisk === "orange" ? "🟠 Warning" : "🟢 On Track"}
                </span>
              </div>
            </div>

            {/* Stage Progress */}
            <div className="mt-5">
              <p className="text-xs text-muted-foreground mb-2">Lifecycle Stage</p>
              <div className="flex items-center gap-1 flex-wrap">
                {STAGES.map((s, i) => (
                  <div key={s} className="flex items-center gap-1">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                      i === stageIndex ? "bg-primary text-primary-foreground" :
                      i < stageIndex ? "bg-green-100 text-green-700" :
                      "bg-muted text-muted-foreground"
                    }`}>
                      {s.replace("_", " ")}
                    </span>
                    {i < STAGES.length - 1 && <ArrowRight className="h-3 w-3 text-muted-foreground" />}
                  </div>
                ))}
              </div>
            </div>

            {/* Doc progress */}
            <div className="mt-4 space-y-1">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Document Readiness — {approvedDocs}/{totalDocs} approved · {verifiedDocs} verified for binding</span>
                <span>{pct}%</span>
              </div>
              <Progress value={pct} className="h-2" />
            </div>
          </CardContent>
        </Card>

        {/* ── Tabs ──────────────────────────────────────────────────── */}
        <div data-tour="bt-client-tabs" className="flex gap-1 border-b border-border overflow-x-auto">
          {tabs.map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                  activeTab === tab.key
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                <Icon className="h-4 w-4" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* ── Tab: Documents ─────────────────────────────────────────── */}
        {activeTab === "documents" && (
          <Card className="bg-card border-border shadow-sm">
            <CardHeader>
              <CardTitle className="text-base">Document Checklist</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50 hover:bg-muted/50">
                    <TableHead>Document</TableHead>
                    <TableHead>Mandatory</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Uploaded</TableHead>
                    <TableHead>Notes</TableHead>
                    <TableHead>Verified</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {documents.map(doc => (
                    <TableRow key={doc.id} className="hover:bg-accent/50">
                      <TableCell className="font-medium text-sm">{doc.name}</TableCell>
                      <TableCell>
                        {doc.mandatory
                          ? <Badge className="bg-primary/10 text-primary text-xs border-primary/20">Required</Badge>
                          : <span className="text-xs text-muted-foreground">Optional</span>}
                      </TableCell>
                      <TableCell>
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${DOC_STATUS_CLASS[doc.status]}`}>
                          {DOC_STATUS_LABEL[doc.status]}
                        </span>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">{doc.uploadedAt ?? "—"}</TableCell>
                      <TableCell className="text-xs text-red-600 max-w-[180px]">
                        {doc.rejectionReason ?? "—"}
                      </TableCell>
                      <TableCell>
                        {doc.verifiedForBinding
                          ? <span className="flex items-center gap-1 text-green-600 text-xs font-medium"><CheckCheck className="h-3.5 w-3.5" /> Verified</span>
                          : <span className="text-xs text-muted-foreground">Pending</span>}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1.5">
                          {doc.status === "approved" && !doc.verifiedForBinding && (
                            <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => handleVerify(doc.id)}>
                              <CheckCircle2 className="h-3 w-3 mr-1" /> Verify
                            </Button>
                          )}
                          {doc.uploadedAt && (
                            <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => {}}>
                              <Eye className="h-3 w-3 mr-1" /> View
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}

        {/* ── Tab: Visa Application ──────────────────────────────────── */}
        {activeTab === "visa" && (
          <Card className="bg-card border-border shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">Visa Application — {visaApp.applicationNumber}</CardTitle>
              <Button size="sm" onClick={() => { setNewVisaStatus(visaApp.status); setStatusDialog(true); }}>
                Update Status
              </Button>
            </CardHeader>
            <CardContent className="space-y-5">
              {/* Status Stepper */}
              <div className="flex items-center gap-1 flex-wrap">
                {VISA_STATUSES.map((s, i) => (
                  <div key={s} className="flex items-center gap-1">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                      s === visaApp.status ? "bg-primary text-primary-foreground" :
                      VISA_STATUSES.indexOf(visaApp.status) > i ? "bg-green-100 text-green-700" :
                      "bg-muted text-muted-foreground"
                    }`}>
                      {s.replace(/_/g, " ")}
                    </span>
                    {i < VISA_STATUSES.length - 1 && <ArrowRight className="h-3 w-3 text-muted-foreground" />}
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                <div><p className="text-xs text-muted-foreground">Biometrics Date</p><p className="text-sm font-medium">{visaApp.biometricsDate ?? "—"}</p></div>
                <div><p className="text-xs text-muted-foreground">Interview Date</p><p className="text-sm font-medium">{visaApp.interviewDate ?? "—"}</p></div>
                <div><p className="text-xs text-muted-foreground">Decision Date</p><p className="text-sm font-medium">{visaApp.decisionDate ?? "—"}</p></div>
              </div>

              <div>
                <p className="text-xs text-muted-foreground mb-1.5">Notes</p>
                <Textarea
                  value={visaNotes}
                  onChange={e => setVisaNotes(e.target.value)}
                  rows={3}
                  className="resize-none text-sm"
                />
                <Button size="sm" className="mt-2" onClick={saveVisaStatus}>Save Notes</Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* ── Tab: Payments ──────────────────────────────────────────── */}
        {activeTab === "payments" && (
          <Card className="bg-card border-border shadow-sm">
            <CardHeader><CardTitle className="text-base">Payments (Read-only)</CardTitle></CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50 hover:bg-muted/50">
                    <TableHead>Type</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {MOCK_PAYMENTS.map(p => (
                    <TableRow key={p.id} className="hover:bg-accent/50">
                      <TableCell className="text-sm font-medium">{p.type}</TableCell>
                      <TableCell className="text-sm">₹{p.amount.toLocaleString()}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={p.status === "paid" ? "bg-green-100 text-green-700 border-green-200" : "bg-yellow-100 text-yellow-700 border-yellow-200"}>
                          {p.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">{p.date || "—"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}

        {/* ── Tab: Family Members ────────────────────────────────────── */}
        {activeTab === "family" && (
          <Card className="bg-card border-border shadow-sm">
            <CardHeader><CardTitle className="text-base">Family Members — {MOCK_FAMILY.length} passport(s) to compile</CardTitle></CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50 hover:bg-muted/50">
                    <TableHead>Name</TableHead>
                    <TableHead>Relation</TableHead>
                    <TableHead>Date of Birth</TableHead>
                    <TableHead>Passport Number</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {MOCK_FAMILY.map(f => (
                    <TableRow key={f.id} className="hover:bg-accent/50">
                      <TableCell className="text-sm font-medium">{f.name}</TableCell>
                      <TableCell><Badge variant="outline">{f.relation}</Badge></TableCell>
                      <TableCell className="text-sm text-muted-foreground">{f.dob}</TableCell>
                      <TableCell className="text-sm font-mono">{f.passportNumber}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}

        {/* ── Tab: Timeline ──────────────────────────────────────────── */}
        {activeTab === "timeline" && (
          <Card className="bg-card border-border shadow-sm">
            <CardHeader><CardTitle className="text-base">Event Timeline</CardTitle></CardHeader>
            <CardContent>
              <div className="relative pl-6 space-y-0">
                {MOCK_TIMELINE.map((ev, idx) => (
                  <div key={ev.id} className="relative pb-6">
                    {idx < MOCK_TIMELINE.length - 1 && (
                      <span className="absolute left-[-17px] top-5 w-px h-full bg-border" />
                    )}
                    <span className={`absolute left-[-22px] top-1 h-3 w-3 rounded-full border-2 border-background ${
                      ev.type === "breach" || ev.type === "sla" ? "bg-red-400" :
                      ev.type === "binding" ? "bg-indigo-400" :
                      ev.type === "doc" ? "bg-blue-400" :
                      ev.type === "stage" ? "bg-green-400" : "bg-muted-foreground"
                    }`} />
                    <p className="text-sm font-medium text-foreground leading-snug">{ev.action}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{ev.actor} · {ev.ts}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      <ProductTour
        open={showHint}
        onClose={dismissHint}
        steps={[
          { target: '[data-tour="bt-client-header"]', title: "Client Overview", content: "See the client's visa type, country, TAT due date, risk status, lifecycle stage, and overall document readiness at a glance.", side: "bottom" },
          { target: '[data-tour="bt-client-tabs"]', title: "Detail Tabs", content: "Switch between Documents, Visa Application, Payments, Family Members, and Timeline to manage every aspect of the client's file.", side: "bottom" },
          { target: '[data-tour="bt-client-tabs"]', title: "Documents", content: "In the Documents tab you can view checklist status and verify approved docs for binding. Approve/reject actions are handled by the CX team.", side: "top" },
        ]}
      />

      {/* ── Update Visa Status Dialog ──────────────────────────────────── */}
      <Dialog open={statusDialog} onOpenChange={setStatusDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update Visa Application Status</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Select value={newVisaStatus} onValueChange={setNewVisaStatus}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {VISA_STATUSES.map(s => <SelectItem key={s} value={s}>{s.replace(/_/g, " ")}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setStatusDialog(false)}>Cancel</Button>
            <Button onClick={saveVisaStatus}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageWrapper>
  );
}
