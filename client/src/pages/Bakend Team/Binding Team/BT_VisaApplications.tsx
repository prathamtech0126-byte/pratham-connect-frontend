import { useState } from "react";
import { PageWrapper } from "@/layout/PageWrapper";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Collapsible, CollapsibleContent, CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Search, CheckCircle2, Clock, ArrowRight, ChevronDown, ChevronRight,
  FileCheck2, Pencil, Send,
} from "lucide-react";
import { usePageHint } from "@/hooks/usePageHint";
import { ProductTour } from "@/components/ProductTour";

type VisaStatus =
  | "pending" | "submitted" | "biometrics_scheduled" | "biometrics_done"
  | "interview_scheduled" | "interview_done" | "approved" | "rejected";

interface StatusHistoryEntry {
  status: VisaStatus; changedAt: string; changedBy: string;
}

interface VisaApplication {
  id: string;
  applicationNumber: string;
  clientName: string;
  clientCode: string;
  visaType: string;
  country: string;
  currentStatus: VisaStatus;
  biometricsDate: string | null;
  interviewDate: string | null;
  decisionDate: string | null;
  daysToNext: number | null;
  nextEvent: string | null;
  notes: string;
  statusHistory: StatusHistoryEntry[];
}

const VISA_STATUSES: VisaStatus[] = [
  "pending", "submitted", "biometrics_scheduled", "biometrics_done",
  "interview_scheduled", "interview_done", "approved", "rejected",
];

const STATUS_COLOR: Record<VisaStatus, string> = {
  pending: "bg-gray-100 text-gray-600",
  submitted: "bg-blue-100 text-blue-700",
  biometrics_scheduled: "bg-yellow-100 text-yellow-700",
  biometrics_done: "bg-indigo-100 text-indigo-700",
  interview_scheduled: "bg-orange-100 text-orange-700",
  interview_done: "bg-purple-100 text-purple-700",
  approved: "bg-green-100 text-green-700",
  rejected: "bg-red-100 text-red-700",
};

const MOCK_APPLICATIONS: VisaApplication[] = [
  {
    id: "1", applicationNumber: "CA-STU-2024-00189", clientName: "Hemali Kanjaria", clientCode: "PC-2024-0001",
    visaType: "Student", country: "Canada", currentStatus: "pending",
    biometricsDate: "2024-07-10", interviewDate: null, decisionDate: null,
    daysToNext: 26, nextEvent: "Biometrics",
    notes: "File under compilation — awaiting insurance certificate.",
    statusHistory: [
      { status: "pending", changedAt: "2024-06-01 09:00", changedBy: "System" },
    ],
  },
  {
    id: "2", applicationNumber: "AU-WRK-2024-00234", clientName: "Sidikaben Vahora", clientCode: "PC-2024-0002",
    visaType: "Work", country: "Australia", currentStatus: "biometrics_scheduled",
    biometricsDate: "2024-06-20", interviewDate: null, decisionDate: null,
    daysToNext: 6, nextEvent: "Biometrics",
    notes: "File submitted. Biometrics appointment confirmed.",
    statusHistory: [
      { status: "pending", changedAt: "2024-06-01 09:00", changedBy: "System" },
      { status: "submitted", changedAt: "2024-06-08 14:30", changedBy: "You" },
      { status: "biometrics_scheduled", changedAt: "2024-06-10 11:00", changedBy: "Embassy" },
    ],
  },
  {
    id: "3", applicationNumber: "UK-SPO-2024-00312", clientName: "Trushaben Patel", clientCode: "PC-2024-0003",
    visaType: "Spouse", country: "UK", currentStatus: "submitted",
    biometricsDate: "2024-07-02", interviewDate: null, decisionDate: null,
    daysToNext: 18, nextEvent: "Biometrics",
    notes: "File submitted successfully on 12 June.",
    statusHistory: [
      { status: "pending", changedAt: "2024-06-05 09:00", changedBy: "System" },
      { status: "submitted", changedAt: "2024-06-12 10:00", changedBy: "You" },
    ],
  },
  {
    id: "4", applicationNumber: "DE-STU-2024-00421", clientName: "Meenalben Manishgar", clientCode: "PC-2024-0004",
    visaType: "Student", country: "Germany", currentStatus: "interview_scheduled",
    biometricsDate: "2024-06-05", interviewDate: "2024-06-25", decisionDate: null,
    daysToNext: 11, nextEvent: "Interview",
    notes: "Interview confirmed. Client briefed on required documents to carry.",
    statusHistory: [
      { status: "pending", changedAt: "2024-05-20 09:00", changedBy: "System" },
      { status: "submitted", changedAt: "2024-05-28 15:00", changedBy: "You" },
      { status: "biometrics_scheduled", changedAt: "2024-06-01 10:00", changedBy: "Embassy" },
      { status: "biometrics_done", changedAt: "2024-06-05 14:00", changedBy: "You" },
      { status: "interview_scheduled", changedAt: "2024-06-06 09:00", changedBy: "Embassy" },
    ],
  },
  {
    id: "5", applicationNumber: "CA-VIS-2024-00156", clientName: "Talat Jahan", clientCode: "PC-2024-0005",
    visaType: "Visitor", country: "Canada", currentStatus: "approved",
    biometricsDate: "2024-05-15", interviewDate: null, decisionDate: "2024-06-10",
    daysToNext: null, nextEvent: null,
    notes: "Visa approved. Passport dispatched.",
    statusHistory: [
      { status: "pending", changedAt: "2024-04-20 09:00", changedBy: "System" },
      { status: "submitted", changedAt: "2024-04-30 15:00", changedBy: "You" },
      { status: "biometrics_scheduled", changedAt: "2024-05-10 10:00", changedBy: "Embassy" },
      { status: "biometrics_done", changedAt: "2024-05-15 14:00", changedBy: "You" },
      { status: "approved", changedAt: "2024-06-10 09:00", changedBy: "Embassy" },
    ],
  },
];

function StatusStepper({ current }: { current: VisaStatus }) {
  const idx = VISA_STATUSES.indexOf(current);
  return (
    <div className="flex items-center gap-0.5 flex-wrap">
      {VISA_STATUSES.map((s, i) => (
        <div key={s} className="flex items-center gap-0.5">
          <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium whitespace-nowrap ${
            s === current ? "bg-primary text-primary-foreground" :
            i < idx ? "bg-green-100 text-green-700" :
            "bg-muted text-muted-foreground"
          }`}>
            {s.replace(/_/g, " ")}
          </span>
          {i < VISA_STATUSES.length - 1 && <ArrowRight className="h-2.5 w-2.5 text-muted-foreground flex-shrink-0" />}
        </div>
      ))}
    </div>
  );
}

export default function BtVisaApplications() {
  const { showHint, dismissHint } = usePageHint("bt_visa_apps");
  const [applications, setApplications] = useState(MOCK_APPLICATIONS);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [editDialog, setEditDialog] = useState<{ open: boolean; appId: string | null }>({ open: false, appId: null });
  const [editStatus, setEditStatus] = useState<VisaStatus>("pending");
  const [editNotes, setEditNotes] = useState("");

  const filtered = applications.filter(a => {
    const matchSearch = a.clientName.toLowerCase().includes(search.toLowerCase()) ||
      a.applicationNumber.toLowerCase().includes(search.toLowerCase()) ||
      a.clientCode.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "all" || a.currentStatus === statusFilter;
    return matchSearch && matchStatus;
  });

  function toggleRow(id: string) {
    setExpandedRows(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function openEdit(app: VisaApplication) {
    setEditStatus(app.currentStatus);
    setEditNotes(app.notes);
    setEditDialog({ open: true, appId: app.id });
  }

  function saveEdit() {
    if (!editDialog.appId) return;
    setApplications(prev => prev.map(a => {
      if (a.id !== editDialog.appId) return a;
      const newHistory: StatusHistoryEntry[] = a.currentStatus !== editStatus
        ? [...a.statusHistory, { status: editStatus, changedAt: new Date().toISOString().slice(0, 16).replace("T", " "), changedBy: "You" }]
        : a.statusHistory;
      return { ...a, currentStatus: editStatus, notes: editNotes, statusHistory: newHistory };
    }));
    setEditDialog({ open: false, appId: null });
  }

  const summaryStats = {
    total: applications.length,
    pending: applications.filter(a => a.currentStatus === "pending").length,
    submitted: applications.filter(a => a.currentStatus === "submitted").length,
    approved: applications.filter(a => a.currentStatus === "approved").length,
  };

  return (
    <PageWrapper
      title="Visa Applications Queue"
      breadcrumbs={[{ label: "Binding Team", href: "/binding/dashboard" }, { label: "Visa Applications" }]}
    >
      <div className="space-y-5">

        {/* ── Summary ────────────────────────────────────────────────── */}
        <div data-tour="bt-visa-summary" className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: "Total", value: summaryStats.total, color: "text-foreground" },
            { label: "Pending", value: summaryStats.pending, color: "text-gray-600" },
            { label: "Submitted", value: summaryStats.submitted, color: "text-blue-600" },
            { label: "Approved", value: summaryStats.approved, color: "text-green-600" },
          ].map(s => (
            <Card key={s.label} className="bg-card border-border shadow-sm">
              <CardContent className="pt-4 pb-3 px-4">
                <p className="text-xs text-muted-foreground">{s.label}</p>
                <p className={`text-2xl font-bold mt-1 ${s.color}`}>{s.value}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* ── Filters + Table ────────────────────────────────────────── */}
        <Card data-tour="bt-visa-table" className="bg-card border-border shadow-sm">
          <div className="p-4 border-b border-border flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search client or application number..." className="pl-8" value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[200px]"><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                {VISA_STATUSES.map(s => <SelectItem key={s} value={s}>{s.replace(/_/g, " ")}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50 hover:bg-muted/50">
                  <TableHead className="w-8" />
                  <TableHead>Application</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead>Country / Visa</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Next Appointment</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">No applications found.</TableCell>
                  </TableRow>
                ) : filtered.map(app => (
                  <>
                    <TableRow
                      key={app.id}
                      className="hover:bg-accent/50 cursor-pointer"
                      onClick={() => toggleRow(app.id)}
                    >
                      <TableCell>
                        {expandedRows.has(app.id)
                          ? <ChevronDown className="h-4 w-4 text-muted-foreground" />
                          : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
                      </TableCell>
                      <TableCell>
                        <p className="text-sm font-mono font-medium">{app.applicationNumber}</p>
                      </TableCell>
                      <TableCell>
                        <p className="text-sm font-medium">{app.clientName}</p>
                        <p className="text-xs text-muted-foreground">{app.clientCode}</p>
                      </TableCell>
                      <TableCell>
                        <p className="text-sm">{app.visaType}</p>
                        <p className="text-xs text-muted-foreground">{app.country}</p>
                      </TableCell>
                      <TableCell>
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLOR[app.currentStatus]}`}>
                          {app.currentStatus.replace(/_/g, " ")}
                        </span>
                      </TableCell>
                      <TableCell>
                        {app.nextEvent ? (
                          <div>
                            <p className="text-sm font-medium">{app.nextEvent}</p>
                            <p className="text-xs text-muted-foreground">{app.daysToNext}d away</p>
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1.5" onClick={e => e.stopPropagation()}>
                          <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => openEdit(app)}>
                            <Pencil className="h-3 w-3 mr-1" /> Edit
                          </Button>
                          {app.currentStatus === "pending" && (
                            <Button size="sm" className="h-7 text-xs" onClick={() => {
                              setApplications(prev => prev.map(a => a.id === app.id
                                ? { ...a, currentStatus: "submitted", statusHistory: [...a.statusHistory, { status: "submitted", changedAt: new Date().toISOString().slice(0, 16).replace("T", " "), changedBy: "You" }] }
                                : a));
                            }}>
                              <Send className="h-3 w-3 mr-1" /> Mark Submitted
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>

                    {/* Expanded detail row */}
                    {expandedRows.has(app.id) && (
                      <TableRow key={`${app.id}-detail`} className="bg-muted/20 hover:bg-muted/20">
                        <TableCell colSpan={7} className="py-4 px-6">
                          <div className="space-y-4">
                            <div>
                              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Status Progress</p>
                              <StatusStepper current={app.currentStatus} />
                            </div>
                            <div className="grid grid-cols-3 gap-4 text-sm">
                              <div><p className="text-xs text-muted-foreground">Biometrics</p><p className="font-medium">{app.biometricsDate ?? "—"}</p></div>
                              <div><p className="text-xs text-muted-foreground">Interview</p><p className="font-medium">{app.interviewDate ?? "—"}</p></div>
                              <div><p className="text-xs text-muted-foreground">Decision</p><p className="font-medium">{app.decisionDate ?? "—"}</p></div>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground mb-1">Notes</p>
                              <p className="text-sm">{app.notes || "—"}</p>
                            </div>
                            <div>
                              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Status History</p>
                              <div className="space-y-1.5">
                                {app.statusHistory.map((h, i) => (
                                  <div key={i} className="flex items-center gap-2 text-xs">
                                    <span className={`px-1.5 py-0.5 rounded ${STATUS_COLOR[h.status]}`}>{h.status.replace(/_/g, " ")}</span>
                                    <span className="text-muted-foreground">{h.changedAt} · {h.changedBy}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </>
                ))}
              </TableBody>
            </Table>
            <div className="px-4 py-3 border-t border-border text-xs text-muted-foreground">
              Showing {filtered.length} of {applications.length} applications
            </div>
          </CardContent>
        </Card>
      </div>

      <ProductTour
        open={showHint}
        onClose={dismissHint}
        steps={[
          { target: '[data-tour="bt-visa-summary"]', title: "Application Summary", content: "Four cards show total applications, how many are pending, submitted, and approved — a quick health check of your visa queue.", side: "bottom" },
          { target: '[placeholder="Search client or application number..."]', title: "Search Applications", content: "Search by client name, client code, or application number to quickly locate a specific visa application.", side: "bottom" },
          { target: '[data-tour="bt-visa-table"]', title: "Applications Table", content: "Click any row to expand the status stepper, dates, and history. Use Edit to update the status or Mark Submitted to advance a pending application.", side: "top" },
        ]}
      />

      {/* ── Edit Dialog ───────────────────────────────────────────────── */}
      <Dialog open={editDialog.open} onOpenChange={o => setEditDialog({ open: o, appId: null })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update Application</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <p className="text-sm font-medium mb-1.5">Status</p>
              <Select value={editStatus} onValueChange={v => setEditStatus(v as VisaStatus)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {VISA_STATUSES.map(s => <SelectItem key={s} value={s}>{s.replace(/_/g, " ")}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <p className="text-sm font-medium mb-1.5">Notes</p>
              <Textarea
                value={editNotes}
                onChange={e => setEditNotes(e.target.value)}
                rows={3}
                className="resize-none text-sm"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialog({ open: false, appId: null })}>Cancel</Button>
            <Button onClick={saveEdit}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageWrapper>
  );
}
