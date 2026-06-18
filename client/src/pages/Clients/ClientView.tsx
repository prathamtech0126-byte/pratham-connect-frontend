import {
  CreditCard,
  ClipboardList,
  Info,
  ChevronDown,
  ChevronUp,
  Edit,
  ArrowLeft,
  FolderOpen,
  ListChecks,
  Route,
  BookOpen,
  GraduationCap,
  Tag,
  UserCheck,
} from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useRoute, useLocation } from "wouter";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { StudentApplicationTracker } from "@/components/students/StudentApplicationTracker";
import { clientService } from "@/services/clientService";
import api from "@/lib/api";
import { PageWrapper } from "@/layout/PageWrapper";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { SectionTabs } from "@/components/tabs/SectionTabs";
import { format } from "date-fns";
import { BACKEND_PROCESSING_STATUS_GROUPS } from "@/data/dummyBackendData";

import { getLatestStageFromPayments } from "@/utils/stageUtils";
import { useState, useEffect, useMemo } from "react";
import { useSocket } from "@/context/socket-context";
import { useAuth } from "@/context/auth-context";
import { BACKEND_ALLOWED_ROLES } from "@/constants/roles";
import { useToast } from "@/hooks/use-toast";
import { isClientListReturnPath } from "@/lib/clientListReturnPath";
import { CxDocReviewPanel } from "@/components/cx/CxDocReviewPanel";
import { RequestFromCxButton } from "@/components/binding/RequestFromCxButton";
import { useVisaCaseByClient, useUpdateSponsorship, useUpdateTravel, useAssignBulkVisaCases, useAssignableUsers, useChangeVisaCaseStatus, useProcessingStages } from "@/hooks/useVisaCases";
import { SPONSOR_RELATIONSHIP_OPTIONS, REASON_OF_TRAVEL_OPTIONS, normalizeReasonOfTravel } from "@/api/visaCases.api";
import { useClientTimeline } from "@/hooks/useClientTimeline";
import { ClientTimeline, JourneyProgress } from "@/components/clients/ClientTimeline";

/** Parse date-only (YYYY-MM-DD), ISO string, or Date as local calendar date so display is correct in all timezones. */
function parseDateOnly(val: string | Date | null | undefined): Date | null {
  if (val == null || val === "") return null;
  if (val instanceof Date) {
    if (isNaN(val.getTime())) return null;
    // Use UTC date parts so "2026-02-23" stored as UTC midnight shows as 23 Feb everywhere
    const y = val.getUTCFullYear();
    const mo = val.getUTCMonth();
    const d = val.getUTCDate();
    return new Date(y, mo, d);
  }
  const str = typeof val === "string" ? val : String(val);
  const datePart = str.slice(0, 10);
  const m = datePart.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (m) {
    const y = parseInt(m[1], 10);
    const mo = parseInt(m[2], 10) - 1;
    const d = parseInt(m[3], 10);
    return new Date(y, mo, d);
  }
  return null;
}

function formatDateLocal(val: string | null | undefined): string {
  const d = parseDateOnly(val);
  return d ? format(d, "dd MMM yyyy") : "N/A";
}

function resolvePaymentHandlerName(
  payment: { handledBy?: number | null; handledByUser?: { id: number; name: string } | null },
  nameById: Record<number, string>
): string | null {
  if (payment?.handledByUser?.name) return payment.handledByUser.name;
  const id = payment?.handledBy != null ? Number(payment.handledBy) : null;
  if (id == null || Number.isNaN(id)) return null;
  return nameById[id] ?? null;
}

function getOtherPaymentHandlerLabel(
  payment: { handledBy?: number | null; handledByUser?: { id: number; name: string } | null },
  clientCounsellorId: number | null,
  nameById: Record<number, string>
): string | null {
  const handledBy = payment?.handledBy != null ? Number(payment.handledBy) : null;
  if (handledBy == null || clientCounsellorId == null || handledBy === clientCounsellorId) return null;
  return resolvePaymentHandlerName(payment, nameById);
}

function PaymentTakenByOtherTag({ handlerName }: { handlerName: string }) {
  return (
    <span className="text-[11px] leading-tight text-amber-700 dark:text-amber-400">
      {handlerName} has taken this payment
    </span>
  );
}

// Helper function to render product entity details
const renderProductDetails = (product: any) => {
  const entity = product.entity;
  const productName = product.productName?.replace(/_/g, ' ') || 'Unknown Product';

  if (!entity && product.entityType === 'master_only') {
    // For master_only products, show payment details
    return (
      <div className="space-y-2 text-sm">
        {product.amount && (
          <div className="flex justify-between">
            <span className="text-muted-foreground">Amount:</span>
            <span className="font-semibold">₹{Number(product.amount).toLocaleString('en-IN')}</span>
          </div>
        )}
        {product.paymentDate && (
          <div className="flex justify-between">
            <span className="text-muted-foreground">Payment Date:</span>
            <span className="font-semibold">{formatDateLocal(product.paymentDate)}</span>
          </div>
        )}
        {product.invoiceNo && (
          <div className="flex justify-between">
            <span className="text-muted-foreground">Invoice No:</span>
            <span className="font-semibold">{product.invoiceNo}</span>
          </div>
        )}
        {product.remarks && (
          <div className="flex flex-col">
            <span className="text-muted-foreground mb-1">Remarks:</span>
            <span className="text-sm">{product.remarks}</span>
          </div>
        )}
      </div>
    );
  }

  if (!entity) {
    return <p className="text-sm text-muted-foreground italic">No details available</p>;
  }

  // Render based on product type
  switch (product.productName) {
    case 'SIM_CARD_ACTIVATION':
      return (
        <div className="space-y-2 text-sm">
          {entity.activatedStatus !== undefined && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Activated:</span>
              <Badge variant={entity.activatedStatus ? "default" : "secondary"}>
                {entity.activatedStatus ? "Yes" : "No"}
              </Badge>
            </div>
          )}
          {entity.simcardPlan && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Plan:</span>
              <span className="font-semibold">{entity.simcardPlan}</span>
            </div>
          )}
          {entity.simCardGivingDate && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Giving Date:</span>
              <span className="font-semibold">{formatDateLocal(entity.simCardGivingDate)}</span>
            </div>
          )}
          {entity.simActivationDate && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Activation Date:</span>
              <span className="font-semibold">{formatDateLocal(entity.simActivationDate)}</span>
            </div>
          )}
          {entity.remarks && (
            <div className="flex flex-col mt-2">
              <span className="text-muted-foreground mb-1">Remarks:</span>
              <span className="text-sm">{entity.remarks}</span>
            </div>
          )}
        </div>
      );

    case 'AIR_TICKET':
      return (
        <div className="space-y-2 text-sm">
          {entity.isTicketBooked !== undefined && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Ticket Booked:</span>
              <Badge variant={entity.isTicketBooked ? "default" : "secondary"}>
                {entity.isTicketBooked ? "Yes" : "No"}
              </Badge>
            </div>
          )}
          {entity.amount && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Amount:</span>
              <span className="font-semibold">₹{Number(entity.amount).toLocaleString('en-IN')}</span>
            </div>
          )}
          {entity.airTicketNumber && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Ticket Number:</span>
              <span className="font-semibold">{entity.airTicketNumber}</span>
            </div>
          )}
          {entity.ticketDate && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Ticket Date:</span>
              <span className="font-semibold">{formatDateLocal(entity.ticketDate)}</span>
            </div>
          )}
          {entity.remarks && (
            <div className="flex flex-col mt-2">
              <span className="text-muted-foreground mb-1">Remarks:</span>
              <span className="text-sm">{entity.remarks}</span>
            </div>
          )}
        </div>
      );

    case 'INSURANCE':
      return (
        <div className="space-y-2 text-sm">
          {entity.amount && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Amount:</span>
              <span className="font-semibold">₹{Number(entity.amount).toLocaleString('en-IN')}</span>
            </div>
          )}
          {entity.policyNumber && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Policy Number:</span>
              <span className="font-semibold">{entity.policyNumber}</span>
            </div>
          )}
          {entity.insuranceDate && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Insurance Date:</span>
              <span className="font-semibold">{formatDateLocal(entity.insuranceDate)}</span>
            </div>
          )}
          {entity.remarks && (
            <div className="flex flex-col mt-2">
              <span className="text-muted-foreground mb-1">Remarks:</span>
              <span className="text-sm">{entity.remarks}</span>
            </div>
          )}
        </div>
      );

    case 'BEACON_ACCOUNT':
      return (
        <div className="space-y-2 text-sm">
          {entity.openingDate && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Opening Date:</span>
              <span className="font-semibold">{formatDateLocal(entity.openingDate)}</span>
            </div>
          )}
          {entity.fundingDate && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Funding Date:</span>
              <span className="font-semibold">{formatDateLocal(entity.fundingDate)}</span>
            </div>
          )}
          {entity.amount && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Amount:</span>
              <span className="font-semibold">${Number(entity.amount).toLocaleString('en-IN')}</span>
            </div>
          )}
          {entity.remarks && (
            <div className="flex flex-col mt-2">
              <span className="text-muted-foreground mb-1">Remarks:</span>
              <span className="text-sm">{entity.remarks}</span>
            </div>
          )}
        </div>
      );

    case 'FOREX_FEES':
      return (
        <div className="space-y-2 text-sm">
          {entity.side && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Side:</span>
              <span className="font-semibold">{entity.side}</span>
            </div>
          )}
          {entity.feeDate && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Fee Date:</span>
              <span className="font-semibold">{formatDateLocal(entity.feeDate)}</span>
            </div>
          )}
          {entity.amount && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Amount:</span>
              <span className="font-semibold">₹{Number(entity.amount).toLocaleString('en-IN')}</span>
            </div>
          )}
          {entity.remarks && (
            <div className="flex flex-col mt-2">
              <span className="text-muted-foreground mb-1">Remarks:</span>
              <span className="text-sm">{entity.remarks}</span>
            </div>
          )}
        </div>
      );

    case 'TUTION_FEES':
      return (
        <div className="space-y-2 text-sm">
          {entity.tutionFeesStatus && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Status:</span>
              <Badge variant="outline">{entity.tutionFeesStatus}</Badge>
            </div>
          )}
          {entity.feeDate && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Fee Date:</span>
<span className="font-semibold">{formatDateLocal(entity.feeDate)}</span>
          </div>
          )}
          {entity.remarks && (
            <div className="flex flex-col mt-2">
              <span className="text-muted-foreground mb-1">Remarks:</span>
              <span className="text-sm">{entity.remarks}</span>
            </div>
          )}
        </div>
      );

    case 'OTHER_NEW_SELL':
      return (
        <div className="space-y-2 text-sm">
          {entity.serviceName && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Service Name:</span>
              <span className="font-semibold">{entity.serviceName}</span>
            </div>
          )}
          {entity.serviceInformation && (
            <div className="flex flex-col">
              <span className="text-muted-foreground mb-1">Service Info:</span>
              <span className="text-sm">{entity.serviceInformation}</span>
            </div>
          )}
          {entity.amount && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Amount:</span>
              <span className="font-semibold">₹{Number(entity.amount).toLocaleString('en-IN')}</span>
            </div>
          )}
          {entity.sellDate && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Sell Date:</span>
              <span className="font-semibold">{formatDateLocal(entity.sellDate)}</span>
            </div>
          )}
          {entity.invoiceNo && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Invoice No:</span>
              <span className="font-semibold">{entity.invoiceNo}</span>
            </div>
          )}
          {entity.remarks && (
            <div className="flex flex-col mt-2">
              <span className="text-muted-foreground mb-1">Remarks:</span>
              <span className="text-sm">{entity.remarks}</span>
            </div>
          )}
        </div>
      );

    case 'ALL_FINANCE_EMPLOYEMENT':
    case 'ALL_FINANCE_EMPLOYMENT':
      const financeInstallments = [
        { label: "2nd Payment", amount: entity.anotherPaymentAmount, date: entity.anotherPaymentDate },
        { label: "3rd Payment", amount: entity.anotherPaymentAmount2, date: entity.anotherPaymentDate2 },
      ];
      return (
        <div className="space-y-2 text-sm">
          {entity.financeId && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Finance Id:</span>
              <span className="font-semibold">{entity.financeId}</span>
            </div>
          )}
          {entity.totalAmount !== undefined && entity.totalAmount !== null && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Total Payment:</span>
              <span className="font-semibold">₹{Number(entity.totalAmount).toLocaleString('en-IN')}</span>
            </div>
          )}
          {entity.amount && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Amount:</span>
              <span className="font-semibold">₹{Number(entity.amount).toLocaleString('en-IN')}</span>
            </div>
          )}
          {entity.paymentDate && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Payment Date:</span>
              <span className="font-semibold">{formatDateLocal(entity.paymentDate)}</span>
            </div>
          )}
          {entity.invoiceNo && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Invoice No:</span>
              <span className="font-semibold">{entity.invoiceNo}</span>
            </div>
          )}
          {entity.partialPayment !== undefined && entity.partialPayment !== null && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Partial Payment:</span>
              <span className="font-semibold">{entity.partialPayment ? 'Yes' : 'No'}</span>
            </div>
          )}
          {entity.approvalStatus && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Approval Status:</span>
              <span className="font-semibold capitalize">{entity.approvalStatus}</span>
            </div>
          )}
          {financeInstallments.map((row) => {
            const amountNum = Number(row.amount ?? 0);
            const hasAmount = row.amount !== undefined && row.amount !== null && !Number.isNaN(amountNum) && amountNum > 0;
            const hasDate = !!row.date;
            if (!hasAmount && !hasDate) return null;

            return (
              <div key={row.label} className="space-y-2">
                {hasAmount && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">{row.label} Amount:</span>
                    <span className="font-semibold">₹{amountNum.toLocaleString('en-IN')}</span>
                  </div>
                )}
                {hasDate && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">{row.label} Date:</span>
                    <span className="font-semibold">{formatDateLocal(row.date)}</span>
                  </div>
                )}
              </div>
            );
          })}
          {entity.remarks && (
            <div className="flex flex-col mt-1">
              <span className="text-muted-foreground mb-1">Remarks:</span>
              <span className="text-sm">{entity.remarks}</span>
            </div>
          )}
          {entity.approver?.name && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Approver:</span>
              <span className="font-semibold">{entity.approver.name}</span>
            </div>
          )}
        </div>
      );

    default:
      // Generic fallback - show all entity fields
      return (
        <div className="space-y-2 text-sm">
          {Object.entries(entity).map(([key, value]) => {
            if (value === null || value === undefined || value === '') return null;
            const displayKey = key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
            const displayValue = value instanceof Date
              ? format(value, "dd MMM yyyy")
              : typeof value === "string" && /^\d{4}-\d{2}-\d{2}/.test(value.trim())
                ? formatDateLocal(value)
                : typeof value === 'boolean'
                  ? value ? 'Yes' : 'No'
                  : typeof value === 'number' && key.toLowerCase().includes('amount')
                    ? `₹${Number(value).toLocaleString('en-IN')}`
                    : String(value);

            return (
              <div key={key} className="flex justify-between">
                <span className="text-muted-foreground">{displayKey}:</span>
                <span className="font-semibold">{displayValue}</span>
              </div>
            );
          })}
        </div>
      );
  }
};

const RETURN_PATH_KEY = "client_list_return_path";
const RETURN_COUNSELLOR_NAME_KEY = "client_list_return_counsellor_name";

type TimelineItem = {
  id: string;
  title: string;
  subtitle: string;
  date?: string | null;
};

export default function ClientView() {
  const [, params] = useRoute("/clients/:id/view");
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const clientId = params?.id ? parseInt(params.id) : null;
  // Determine the "Clients" breadcrumb destination based on role.
  const clientsHref =
    user?.role === "customer_experience" ? "/cx/clients"
    : user?.role === "binding_team" ? "/binding/clients"
    : user?.role === "backend_manager" ? "/backend/clients"
    : "/clients";

  const [expandedProducts, setExpandedProducts] = useState<Set<number>>(new Set());
  const [returnPath, setReturnPath] = useState<string | null>(null);
  const [returnCounsellorName, setReturnCounsellorName] = useState<string>("");
  const [selectedFolder, setSelectedFolder] = useState<string>("uncategorized");
  const [newFolderName, setNewFolderName] = useState<string>("");
  const [documentTitle, setDocumentTitle] = useState<string>("");
  const [selectedDocFile, setSelectedDocFile] = useState<File | null>(null);
  const [customFolders, setCustomFolders] = useState<string[]>([]);
  // Processing-status change (hidden from counsellor/telecaller — see canChangeStatus).
  const [statusOpen, setStatusOpen] = useState(false);
  const [statusStage, setStatusStage] = useState<string>("");  // selected main stage label
  const [statusValue, setStatusValue] = useState<string>("");  // selected sub-status enum value
  const [statusNotes, setStatusNotes] = useState<string>("");
  // Edit Basic Details dialog — client fields + visa-case sponsorship/travel
  const [basicEditOpen, setBasicEditOpen] = useState(false);
  const [fullNameDraft, setFullNameDraft] = useState<string>("");
  const [enrollmentDateDraft, setEnrollmentDateDraft] = useState<string>("");
  const [passportDetailsDraft, setPassportDetailsDraft] = useState<string>("");
  const [leadTypeIdDraft, setLeadTypeIdDraft] = useState<string>("");
  const [relDraft, setRelDraft] = useState<string>("");
  const [membersDraft, setMembersDraft] = useState<string>("0");
  const [reasonDraft, setReasonDraft] = useState<string>("");
  // Assign visa case dialog.
  const [assignOpen, setAssignOpen] = useState(false);
  const [assignUserIdDraft, setAssignUserIdDraft] = useState<string>("");
  const [assignNotesDraft, setAssignNotesDraft] = useState<string>("");
  const { socket, isConnected } = useSocket();

  useEffect(() => {
    const path = sessionStorage.getItem(RETURN_PATH_KEY);
    const name = sessionStorage.getItem(RETURN_COUNSELLOR_NAME_KEY) || "";
    if (path && isClientListReturnPath(path)) {
      setReturnPath(path);
      setReturnCounsellorName(name);
    } else {
      setReturnPath(null);
      setReturnCounsellorName("");
    }
  }, []);
  // Load any previously chosen processing status for this client.
  useEffect(() => {
    if (!clientId) return;
    const saved = localStorage.getItem(`client_processing_status_${clientId}`);
    setStatusValue(saved || "");
  }, [clientId]);

  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: client, isLoading } = useQuery({
    queryKey: ["client-complete", clientId],
    queryFn: () => clientService.getClientCompleteDetails(clientId!),
    enabled: !!clientId,
    staleTime: 0,
  });

  const { data: studentAppsResponse } = useQuery({
    queryKey: ["student-applications", clientId],
    queryFn: async () => {
      const response = await api.get(`/api/student-applications/client/${clientId}`);
      return response.data;
    },
    enabled: !!clientId,
    refetchOnWindowFocus: false,
  });

  const studentAppCount = Array.isArray(studentAppsResponse?.data)
    ? studentAppsResponse.data.length
    : Number(studentAppsResponse?.count ?? 0);

  const clientCounsellorId = useMemo(() => {
    if (!client) return null;
    const cd = (client as any).client || client;
    const raw =
      cd.counsellorId ??
      (typeof cd.counsellor === "object" ? cd.counsellor?.id : null);
    const id = raw != null ? Number(raw) : null;
    return id != null && !Number.isNaN(id) ? id : null;
  }, [client]);

  const clientHasDirectTuitionDeposit = useMemo(() => {
    const cd = (client as any)?.client || client;
    const payments = cd?.productPayments;
    return (
      Array.isArray(payments) &&
      payments.some((p: any) => p?.productName === "TUTION_FEES")
    );
  }, [client]);
  // Visa case for this client — lets CX/Binding read & edit sponsorship details
  // (sponsor relationship + accompanying members) without leaving this page.
  const { data: visaCase, isLoading: isVisaCaseLoading } = useVisaCaseByClient(clientId, clientCounsellorId);

  const { data: journeyTimeline, isLoading: isTimelineLoading } = useClientTimeline(clientId);

  // Find the most recent CX actor from the timeline to display in the "Request from CX" dialog.
  const cxUserName = (() => {
    const events = journeyTimeline?.events ?? [];
    const cxRoles = ["customer_experience", "cx"];
    const sorted = [...events].sort(
      (a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime(),
    );
    return sorted.find((e) => e.actor && cxRoles.includes(e.actor.role))?.actor?.name ?? null;
  })();
  const assignBulkMutation = useAssignBulkVisaCases(clientId);
  const updateSponsorship = useUpdateSponsorship(clientId);
  const updateTravel = useUpdateTravel(clientId);
  const changeStatusMutation = useChangeVisaCaseStatus(clientId);
  const ASSIGN_ROLES_FOR_HOOK = ["superadmin", "developer", "manager", "customer_experience", "cx", "binding_team", "binding"];
  // Scope the user list to the target team so non-admin roles can see it.
  // CX → fetch only binding members; Binding → fetch only application_team members.
  // Admin/manager/developer → no targetRole (backend returns all assignable users).
  const _userRole = user?.role as string | undefined;
  const _assignTargetRole =
    _userRole === "customer_experience" || _userRole === "cx" ? "binding" :
    undefined;
  const { data: assignableUsers = [] } = useAssignableUsers(
    !!user && ASSIGN_ROLES_FOR_HOOK.includes(user.role),
    _assignTargetRole,
  );
  const { data: processingStages } = useProcessingStages(!!visaCase?.visaCaseId);

  // Lead types for the Edit Basic Details dropdown.
  const { data: leadTypesData } = useQuery({
    queryKey: ["lead-types"],
    queryFn: async () => {
      const res = await api.get<{ data?: any[] } | any[]>("/api/lead-types");
      const rows: any[] = Array.isArray(res.data) ? res.data : ((res.data as any)?.data ?? []);
      return rows as { id: number; leadType: string; displayAlias?: string }[];
    },
    staleTime: 1000 * 60 * 30,
  });
  const leadTypes = leadTypesData ?? [];

  // PATCH /api/clients/{clientId}/basic-details
  const patchBasicDetailsMutation = useMutation({
    mutationFn: async (body: { fullName?: string; enrollmentDate?: string; passportDetails?: string; leadTypeId?: number }) => {
      const { data } = await api.patch(`/api/clients/${clientId}/basic-details`, body);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["client-complete", clientId] });
      queryClient.invalidateQueries({ queryKey: ["clients"] });
    },
  });

  const otherHandlerIds = useMemo(() => {
    if (!client || clientCounsellorId == null) return [];
    const ids = new Set<number>();
    const maybeAdd = (payment: any) => {
      const handledBy = payment?.handledBy != null ? Number(payment.handledBy) : null;
      if (
        handledBy != null &&
        !Number.isNaN(handledBy) &&
        handledBy !== clientCounsellorId &&
        !payment?.handledByUser?.name
      ) {
        ids.add(handledBy);
      }
    };
    for (const payment of (client as any).productPayments ?? []) maybeAdd(payment);
    for (const payment of (client as any).payments ?? []) maybeAdd(payment);
    return Array.from(ids);
  }, [client, clientCounsellorId]);

  const { data: handlerNames = {} } = useQuery({
    queryKey: ["client-view-handler-names", clientId, otherHandlerIds.slice().sort((a, b) => a - b).join(",")],
    queryFn: () => clientService.getUserDisplayNames(otherHandlerIds),
    enabled: otherHandlerIds.length > 0,
    staleTime: 5 * 60 * 1000,
  });

  // WebSocket listeners for real-time payment and product payment updates
  useEffect(() => {
    if (!socket || !isConnected || !clientId) {
      return;
    }

    // console.log('🟢 [ClientView] Setting up socket event listeners for clientId:', clientId);

    // Listen for payment:created event
    const handlePaymentCreated = (data: {
      action: "CREATED";
      clientId: number;
      client: any; // Full client details with updated payments
    }) => {
      if (data.clientId === clientId && data.client) {
        // console.log('💳 [ClientView] Received payment:created event for clientId:', clientId);
        queryClient.setQueryData(['client-complete', clientId], data.client);
        queryClient.setQueryData(['client', clientId], data.client);
        // console.log('[ClientView] ✅ Updated client details cache');
        toast({
          title: "Payment Added",
          description: "Payment has been added and the view has been updated.",
        });
      }
    };

    // Listen for payment:updated event
    const handlePaymentUpdated = (data: {
      action: "UPDATED";
      clientId: number;
      client: any; // Full client details with updated payments
    }) => {
      if (data.clientId === clientId && data.client) {
        // console.log('💳 [ClientView] Received payment:updated event for clientId:', clientId);
        queryClient.setQueryData(['client-complete', clientId], data.client);
        queryClient.setQueryData(['client', clientId], data.client);
        // console.log('[ClientView] ✅ Updated client details cache');
        toast({
          title: "Payment Updated",
          description: "Payment has been updated and the view has been refreshed.",
        });
      }
    };

    // Listen for productPayment:created event
    const handleProductPaymentCreated = (data: {
      action: "CREATED";
      clientId: number;
      client: any; // Full client details with updated productPayments
    }) => {
      if (data.clientId === clientId && data.client) {
        // console.log('📦 [ClientView] Received productPayment:created event for clientId:', clientId);
        queryClient.setQueryData(['client-complete', clientId], data.client);
        queryClient.setQueryData(['client', clientId], data.client);
        // console.log('[ClientView] ✅ Updated client details cache');
        toast({
          title: "Product Payment Added",
          description: "Product payment has been added and the view has been updated.",
        });
      }
    };

    // Listen for productPayment:updated event
    const handleProductPaymentUpdated = (data: {
      action: "UPDATED";
      clientId: number;
      client: any; // Full client details with updated productPayments
    }) => {
      if (data.clientId === clientId && data.client) {
        // console.log('📦 [ClientView] Received productPayment:updated event for clientId:', clientId);
        queryClient.setQueryData(['client-complete', clientId], data.client);
        queryClient.setQueryData(['client', clientId], data.client);
        // console.log('[ClientView] ✅ Updated client details cache');
        toast({
          title: "Product Payment Updated",
          description: "Product payment has been updated and the view has been refreshed.",
        });
      }
    };

    // Register event listeners
    socket.on('payment:created', handlePaymentCreated);
    socket.on('payment:updated', handlePaymentUpdated);
    socket.on('productPayment:created', handleProductPaymentCreated);
    socket.on('productPayment:updated', handleProductPaymentUpdated);

    // console.log('✅ [ClientView] Socket event listeners registered for payment events');

    // Cleanup on unmount
    return () => {
      // console.log('[ClientView] Cleaning up socket event listeners');
      socket.off('payment:created', handlePaymentCreated);
      socket.off('payment:updated', handlePaymentUpdated);
      socket.off('productPayment:created', handleProductPaymentCreated);
      socket.off('productPayment:updated', handleProductPaymentUpdated);
    };
  }, [socket, isConnected, clientId, queryClient, toast]);

  const toggleProduct = (idx: number) => {
    setExpandedProducts(prev => {
      const newSet = new Set(prev);
      if (newSet.has(idx)) {
        newSet.delete(idx);
      } else {
        newSet.add(idx);
      }
      return newSet;
    });
  };

  // ── Docs vault hooks — must be before any early return ───────────────────
  const folderStorageKey = `client_docs_vault_folders_${clientId || "unknown"}`;

  useEffect(() => {
    try {
      const raw = localStorage.getItem(folderStorageKey);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) setCustomFolders(parsed);
    } catch {
      // ignore parsing issues
    }
  }, [folderStorageKey]);

  useEffect(() => {
    localStorage.setItem(folderStorageKey, JSON.stringify(customFolders));
  }, [folderStorageKey, customFolders]);

  const uploadDocumentMutation = useMutation({
    mutationFn: async () => {
      if (!clientId) throw new Error("Client id not found");
      if (!selectedDocFile) throw new Error("Please select a file");
      const allowedTypes = ["application/pdf", "image/png", "image/jpeg", "image/jpg", "image/webp"];
      if (!allowedTypes.includes(selectedDocFile.type)) {
        throw new Error("Only PDF and image files are allowed");
      }

      const formData = new FormData();
      formData.append("file", selectedDocFile);
      formData.append("documentName", documentTitle || selectedDocFile.name);
      formData.append("folderName", selectedFolder);
      formData.append("documentCategory", selectedFolder);
      const res = await api.post(`/api/clients/${clientId}/documents`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["client-complete", clientId] });
      setDocumentTitle("");
      setSelectedDocFile(null);
      toast({
        title: "Document uploaded",
        description: "File uploaded successfully in docs vault.",
      });
    },
    onError: (err: any) => {
      toast({
        title: "Upload failed",
        description: err?.message || "Could not upload file. Please try again.",
        variant: "destructive",
      });
    },
  });
  // ─────────────────────────────────────────────────────────────────────────

  if (isLoading) {
    const loadingBreadcrumbs = [{ label: "Clients", href: clientsHref }, { label: "Loading..." }];
    return (
      <PageWrapper title="Client Details" breadcrumbs={loadingBreadcrumbs}>
        <div className="space-y-6">
          <Skeleton className="h-40 w-full rounded-xl" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Skeleton className="h-60 w-full rounded-xl" />
            <Skeleton className="h-60 w-full rounded-xl" />
          </div>
        </div>
      </PageWrapper>
    );
  }

  if (!client) {
    const errorBreadcrumbs = [{ label: "Clients", href: clientsHref }, { label: "Error" }];
    return (
      <PageWrapper title="Client Not Found" breadcrumbs={errorBreadcrumbs}>
        <div className="text-center py-20">
          <h2 className="text-2xl font-bold text-foreground">Client Not Found</h2>
          <p className="text-muted-foreground mt-2">The client details you are looking for could not be retrieved.</p>
        </div>
      </PageWrapper>
    );
  }

  // Extract client data - API returns nested structure { client: {...}, saleType: {...}, payments: [...], productPayments: [...] }
  const clientData = client.client || client;
  const clientFullName = clientData.fullName || client.fullName || "N/A";
  const clientEnrollmentDate = clientData.enrollmentDate || client.enrollmentDate;
  const clientArchived = clientData.archived !== undefined ? clientData.archived : client.archived;
  const originalCounsellorName =
    (typeof clientData.counsellor === "object" ? clientData.counsellor?.name : clientData.counsellor) ||
    clientData.counsellorName ||
    clientData.counsellor_name ||
    "N/A";
  const transferedToCounsellorName =
    clientData.transferedToCounsellorName ||
    clientData.transferredToCounsellorName ||
    clientData.transfered_to_counsellor_name ||
    null;

  // Show "Duplicate Client" badge when client was transferred/duplicated to another counsellor
  const isDuplicateClient =
    clientData.transferStatus === true ||
    clientData.transferedToCounsellorId != null ||
    clientData.transferredToCounsellorId != null ||
    (clientData as any).transferedToCounsellor_id != null;

  // Get saleType from multiple sources.
  // API returns { client: {...}, payments: [...] } — payments are at the TOP level of `client`, not inside clientData.
  const getClientSaleType = () => {
    // Try direct property on clientData first
    if (clientData.saleType?.saleType) return clientData.saleType.saleType;
    if (clientData.salesType) return clientData.salesType;

    // Payments live at client.payments (top-level response), not clientData.payments
    const payments: any[] =
      Array.isArray((client as any)?.payments)
        ? (client as any).payments
        : Array.isArray(clientData.payments)
          ? clientData.payments
          : [];

    // Find the first core-stage payment with a saleType name
    const corePayment = payments.find(
      (p: any) =>
        p?.stage &&
        ["INITIAL", "BEFORE_VISA", "AFTER_VISA"].includes(p.stage) &&
        p.saleType?.saleType
    );
    if (corePayment) return corePayment.saleType.saleType;

    // Fallback: any payment with a saleType
    const anyPayment = payments.find((p: any) => p.saleType?.saleType);
    if (anyPayment) return anyPayment.saleType.saleType;

    return "Only Products";
  };
  const clientSaleType = getClientSaleType();
  const showStudentApplicationsSection = studentAppCount > 0;
  const isBackendViewRole = !!user && BACKEND_ALLOWED_ROLES.includes(user.role);
  const isCxUser = user?.role === "customer_experience" || (user?.role as string) === "cx";
  const isBindingUser = user?.role === "binding_team" || (user?.role as string) === "binding";
  const canViewDocsVault = isBackendViewRole || isCxUser || isBindingUser;

  const studentApplicationTimelineItems: TimelineItem[] = (
    Array.isArray(studentAppsResponse?.data) ? studentAppsResponse.data : []
  ).flatMap((app: any) => {
    const items: TimelineItem[] = [
      {
        id: `student-app-${app.applicationId}`,
        title: "Student Application Added",
        subtitle: [
          app.universityName,
          app.courseName,
          app.saleType,
        ].filter(Boolean).join(" • "),
        date: app.applicationDate || app.createdAt,
      },
    ];

    if (app.tuitionDepositStatus) {
      items.push({
        id: `tuition-deposit-${app.applicationId}`,
        title: app.tuitionDepositTaken ? "Tuition Deposit Taken" : "Tuition Deposit Recorded",
        subtitle: `${app.universityName} • Status: ${String(app.tuitionDepositStatus).replace(/_/g, " ")}`,
        date: app.tuitionDepositDate || app.updatedAt || app.createdAt,
      });
    }

    return items;
  });

  const timelineItems: TimelineItem[] = [
    {
      id: "enrollment",
      title: "Client Enrolled",
      subtitle: "Enrollment date recorded",
      date: clientEnrollmentDate,
    },
    {
      id: "created",
      title: "Client Created",
      subtitle: "Client profile created",
      date: clientData.createdAt,
    },
    ...studentApplicationTimelineItems,
    ...(client.payments || []).map((payment: any, index: number) => ({
      id: `payment-${payment.paymentId || index}`,
      title: `Payment ${payment.stage ? `(${String(payment.stage).replace(/_/g, " ")})` : ""}`.trim(),
      subtitle: `${payment.invoiceNo || "Invoice not added yet"} • ₹${Number(payment.amount || 0).toLocaleString('en-IN')}`,
      date: payment.paymentDate || payment.createdAt,
    })),
  ]
    .filter((item) => item.date)
    .sort((a, b) => {
      const aTime = parseDateOnly(a.date || "")?.getTime() || 0;
      const bTime = parseDateOnly(b.date || "")?.getTime() || 0;
      return bTime - aTime;
    });

  const documents: any[] = Array.isArray(clientData.documents) ? clientData.documents : [];

  const documentsByFolder = documents.reduce<Record<string, any[]>>((acc, doc) => {
    const folderKey = String(doc.folderName || doc.folder || doc.category || doc.documentCategory || "uncategorized").toLowerCase();
    if (!acc[folderKey]) acc[folderKey] = [];
    acc[folderKey].push(doc);
    return acc;
  }, {});
  const allFolderKeys = Array.from(new Set([...Object.keys(documentsByFolder), ...customFolders])).sort();

  const handleCreateFolder = () => {
    const normalized = newFolderName.trim().toLowerCase().replace(/\s+/g, "_");
    if (!normalized) return;
    if (allFolderKeys.includes(normalized)) {
      toast({ title: "Folder exists", description: "This folder already exists." });
      return;
    }
    setCustomFolders((prev) => [...prev, normalized]);
    setSelectedFolder(normalized);
    setNewFolderName("");
    toast({ title: "Folder created", description: "New folder added to docs vault." });
  };

  // Counsellors and telecallers may view the case but cannot change its status.
  const canChangeStatus = !!user && user.role !== "counsellor" && user.role !== "telecaller";

  // Roles that are allowed to call the assign endpoint.
  const ASSIGN_ALLOWED_ROLES = ["superadmin", "developer", "manager", "customer_experience", "cx"];
  const canAssign = !!user && ASSIGN_ALLOWED_ROLES.includes(user.role) && !!visaCase?.visaCaseId;

  // CX users may only hand off when the case status is "Fully Received".
  const isFullyReceived = visaCase?.processing?.subStatus === "FULLY_RECEIVED";
  // For CX: gate the button behind FULLY_RECEIVED; all other roles can assign freely.
  const assignEnabled = canAssign && (!isCxUser || isFullyReceived);

  // Derive which team to assign TO based on the caller's role.
  // CX hands off to Binding; Binding hands off to Application.
  // Admin/manager/developer can assign to any team.
  const assignableTargetTeam: string = (() => {
    if (!user) return "";
    if (user.role === "customer_experience" || (user.role as string) === "cx") return "binding";

    return ""; // superadmin/manager/developer: show all
  })();

  // Filter the full user list to only the target team for the picker.
  const filteredAssignableUsers = assignableTargetTeam
    ? assignableUsers.filter((u) => u.role === assignableTargetTeam)
    : assignableUsers;

  const handleAssign = async () => {
    const visaCaseId = (visaCase as any)?.visaCaseId;
    if (!visaCaseId || !assignUserIdDraft) return;
    try {
      await assignBulkMutation.mutateAsync({
        visaCaseIds: [visaCaseId],
        assignedUserId: Number(assignUserIdDraft),
        notes: assignNotesDraft || undefined,
      });
      toast({ title: "Case assigned", description: "Visa case has been assigned successfully." });
      setAssignOpen(false);
      setAssignUserIdDraft("");
      setAssignNotesDraft("");
      // Navigate away — client moves out of the current team's queue.
      const role = user?.role as string | undefined;
      if (role === "customer_experience" || role === "cx") {
        setLocation("/cx/clients");
      } else if (role === "binding_team" || role === "binding") {
        setLocation("/binding/clients");
      }
    } catch (err: any) {
      toast({
        title: "Assignment failed",
        description: err?.response?.data?.message || err?.message || "Could not assign the case.",
        variant: "destructive",
      });
    }
  };

  // CX / Binding / Admin / Developer / Manager can edit client basic details.
  const canEditBasicDetails =
    !!user &&
    (["customer_experience", "binding_team", "superadmin", "developer", "manager", "application_team"].includes(user.role) ||
      (user.role as string) === "cx" ||
      (user.role as string) === "binding");

  // Visa case fields (sponsorship/travel) can only be edited by the assigned user
  // or a superadmin/developer who can override any case.
  const canEditVisaCase =
    !visaCase ||
    ["superadmin", "developer"].includes(user?.role ?? "") ||
   (visaCase.processing.assignedUserId != null &&
 Number(visaCase.processing.assignedUserId) === Number(user?.id))

  const isViewOnlyDocsVault = !!user && (
    user.role === "customer_experience" ||
    user.role === "binding_team" ||
    (user.role as string) === "cx" ||
    (user.role as string) === "binding"
  );

  const openBasicEdit = () => {
    // Client fields
    setFullNameDraft(clientData.fullName ?? "");
    const raw = clientData.enrollmentDate ?? "";
    setEnrollmentDateDraft(raw.slice(0, 10)); // keep YYYY-MM-DD for input[type=date]
    setPassportDetailsDraft(clientData.passportDetails ?? "");
    const existingLeadTypeId =
      (client as any)?.leadType?.id ??
      clientData.leadTypeId ??
      clientData.lead_type_id ??
      null;
    setLeadTypeIdDraft(existingLeadTypeId != null ? String(existingLeadTypeId) : "");
    // Visa-case fields
    setRelDraft(visaCase?.sponsorship.relationship ?? "");
    setMembersDraft(String(visaCase?.sponsorship.accompanyingMembersCount ?? 0));
    setReasonDraft(normalizeReasonOfTravel(visaCase?.travel.reason));
    setBasicEditOpen(true);
  };

  const savingBasicDetails = patchBasicDetailsMutation.isPending || updateSponsorship.isPending || updateTravel.isPending;

  const saveBasicDetails = async () => {
    if (!clientId) return;

    // 1. PATCH client basic details
    const clientBody: { fullName?: string; enrollmentDate?: string; passportDetails?: string; leadTypeId?: number } = {};
    if (fullNameDraft.trim()) clientBody.fullName = fullNameDraft.trim();
    if (enrollmentDateDraft) {
      const [y, m, d] = enrollmentDateDraft.split("-");
      if (y && m && d) clientBody.enrollmentDate = `${d}-${m}-${y}`;
    }
    if (passportDetailsDraft.trim()) clientBody.passportDetails = passportDetailsDraft.trim();
    if (leadTypeIdDraft) clientBody.leadTypeId = Number(leadTypeIdDraft);

    try {
      // Always call the client PATCH if we have at least a fullName.
      if (Object.keys(clientBody).length > 0) {
        await patchBasicDetailsMutation.mutateAsync(clientBody);
      }
    } catch (err: any) {
      toast({
        title: "Update failed",
        description: err?.response?.data?.message || err?.message || "Could not update client details.",
        variant: "destructive",
      });
      return;
    }

    // 2. PATCH visa-case sponsorship/travel — only when the current user is assigned.
    let visaCaseWarning: string | null = null;
    if (visaCase?.visaCaseId && canEditVisaCase) {
      try {
        await updateSponsorship.mutateAsync({
          visaCaseId: visaCase.visaCaseId,
          body: {
            sponsorRelationship: relDraft || null,
            accompanyingMembersCount: Math.max(0, Math.floor(Number(membersDraft) || 0)),
          },
        });

        if ((reasonDraft || null) !== (visaCase.travel.reason ?? null)) {
          await updateTravel.mutateAsync({
            visaCaseId: visaCase.visaCaseId,
            body: { reasonOfTravel: reasonDraft || null },
          });
        }
      } catch (err: any) {
        visaCaseWarning = err?.response?.data?.message || err?.message || "Visa case details could not be updated.";
      }
    }

    // Force-refresh the client page data so the header/cards show the new values immediately.
    queryClient.invalidateQueries({ queryKey: ["client-complete", clientId] });
    if (visaCase?.visaCaseId) {
      queryClient.invalidateQueries({ queryKey: ["visa-case-by-client", clientId] });
    }

    if (visaCaseWarning) {
      toast({
        title: "Client details saved",
        description: `Visa case details could not be updated: ${visaCaseWarning}`,
        variant: "destructive",
      });
    } else {
      toast({ title: "Basic details updated", description: "Client and visa case details have been saved." });
    }
    setBasicEditOpen(false);
  };

  const saveStatus = async () => {
    if (!statusValue) return;
    const visaCaseId = visaCase?.visaCaseId;
    if (visaCaseId) {
      try {
        await changeStatusMutation.mutateAsync({
          visaCaseId,
          body: { subStatus: statusValue, notes: statusNotes || undefined },
        });
        const label = processingStages?.viewer.updatableSubStatuses.find((s) => s.value === statusValue)?.displayLabel ?? statusValue;
        toast({ title: "Status updated", description: `Processing status set to "${label}".` });
        setStatusOpen(false);
        setStatusValue("");
        setStatusNotes("");
      } catch (err: any) {
        toast({
          title: "Status update failed",
          description: err?.response?.data?.message || err?.message || "Could not update status.",
          variant: "destructive",
        });
      }
    } else {
      // No visa case — persist locally as fallback
      if (clientId) localStorage.setItem(`client_processing_status_${clientId}`, statusValue);
      toast({ title: "Status saved locally", description: `Processing status set to "${statusValue}".` });
      setStatusOpen(false);
    }
  };

  const mainBreadcrumbs = [
    { label: "Clients", href: clientsHref },
    { label: clientFullName },
  ];

  return (
    <PageWrapper
      title={clientFullName}
      breadcrumbs={mainBreadcrumbs}
      actions={
        <div className="flex items-center gap-2">
          {returnPath && (
            <Button variant="outline" size="sm" onClick={() => setLocation(returnPath)} className="gap-1.5">
              <ArrowLeft className="h-4 w-4" />
              {user?.role === "customer_experience" || user?.role === "binding_team" ? "Back to my clients" : "Back to clients"}
            </Button>
          )}
          {params?.id && user?.role === "binding_team" && (
            <RequestFromCxButton
              clientId={visaCase?.clientId ?? params.id}
              legacyClientId={clientId ?? undefined}
              visaCaseId={(visaCase as any)?.visaCaseId}
              clientName={clientFullName}
              cxUserName={cxUserName ?? undefined}
              size="sm"
              variant="outline"
            />
          )}
          {canAssign && (isVisaCaseLoading || visaCase) && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setAssignOpen(true)}
              disabled={isVisaCaseLoading || !visaCase || !assignEnabled}
              title={isCxUser && visaCase && !isFullyReceived ? "Status must be 'Fully Received' before handing off to Binding" : undefined}
              className="gap-1.5"
            >
              <UserCheck className="h-4 w-4" />
              {isVisaCaseLoading ? "Loading…" : "Assign Team"}
            </Button>
          )}
          {params?.id && canChangeStatus && (
            <Button variant="outline" size="sm" onClick={() => setStatusOpen(true)} className="gap-1.5">
              <Tag className="h-4 w-4" />
              Change Status
            </Button>
          )}
          {params?.id && user?.role !== "customer_experience" && user?.role !== "binding_team" && (
            <Button variant="outline" size="sm" onClick={() => setLocation(`/clients/${params.id}/edit`)} className="gap-1.5">
              <Edit className="h-4 w-4" />
              Edit
            </Button>
          )}
        </div>
      }
    >
      <div className="space-y-8">
        <SectionTabs
          defaultValue="basic-details"
          items={[
            {
              value: "basic-details",
              label: "Basic Details",
              content: (
                <Card className="border-none shadow-md overflow-hidden bg-card">
                  <CardHeader className="pb-4 border-b border-border flex flex-row items-center justify-between space-y-0">
                    <CardTitle className="text-xl font-bold flex items-center gap-2 text-card-foreground">
                      <Info className="h-6 w-6 text-blue-500" />
                      Basic Details
                    </CardTitle>
                    {canEditBasicDetails && visaCase && (
                      <Button variant="outline" size="sm" onClick={openBasicEdit} className="gap-1.5">
                        <Edit className="h-4 w-4" />
                        Edit Basic Details
                      </Button>
                    )}
                  </CardHeader>
                  <CardContent className="pt-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      <div className="rounded-lg border border-border p-4">
                        <p className="text-xs text-muted-foreground uppercase tracking-wide">Client Name</p>
                        <p className="text-sm font-semibold mt-1">{clientFullName}</p>
                      </div>
                      <div className="rounded-lg border border-border p-4">
                        <p className="text-xs text-muted-foreground uppercase tracking-wide">Enrollment Date</p>
                        <p className="text-sm font-semibold mt-1">{formatDateLocal(clientEnrollmentDate)}</p>
                      </div>
                      <div className="rounded-lg border border-border p-4">
                        <p className="text-xs text-muted-foreground uppercase tracking-wide">Status</p>
                        <p className="text-sm font-semibold mt-1">{clientArchived ? "Archived" : "Active"}</p>
                      </div>
                      <div className="rounded-lg border border-border p-4">
                        <p className="text-xs text-muted-foreground uppercase tracking-wide">Current Stage</p>
                        <p className="text-sm font-semibold mt-1 text-blue-600">{getLatestStageFromPayments(
                          client.payments,
                          client.client?.stage || client.stage,
                          client.client?.visaSubmitted || client.visaSubmitted
                        ) || "N/A"}</p>
                      </div>
                      <div className="rounded-lg border border-border p-4">
                        <p className="text-xs text-muted-foreground uppercase tracking-wide">Lead Type</p>
                        <p className="text-sm font-semibold mt-1">{client.leadType?.leadType || clientData.leadType || "N/A"}</p>
                      </div>
                      <div className="rounded-lg border border-border p-4">
                        <p className="text-xs text-muted-foreground uppercase tracking-wide">Passport Details</p>
                        <p className="text-sm font-semibold mt-1">{clientData.passportDetails || "N/A"}</p>
                      </div>
                      <div className="rounded-lg border border-border p-4">
                        <p className="text-xs text-muted-foreground uppercase tracking-wide">Counsellor</p>
                        <p className="text-sm font-semibold mt-1">{originalCounsellorName}</p>
                      </div>
                      <div className="rounded-lg border border-border p-4">
                        <p className="text-xs text-muted-foreground uppercase tracking-wide">Sale Type</p>
                        <p className="text-sm font-semibold mt-1">{clientSaleType}</p>
                      </div>
                      {visaCase && (
                        <div className="rounded-lg border border-border p-4">
                          <p className="text-xs text-muted-foreground uppercase tracking-wide">Reason of Travel</p>
                          <p className="text-sm font-semibold mt-1">{visaCase.travel.reasonLabel || "N/A"}</p>
                        </div>
                      )}
                      {visaCase && (
                        <div className="rounded-lg border border-border p-4">
                          <p className="text-xs text-muted-foreground uppercase tracking-wide">Sponsor Relationship</p>
                          <p className="text-sm font-semibold mt-1">{visaCase.sponsorship.relationshipLabel || "N/A"}</p>
                        </div>
                      )}
                      {visaCase && (
                        <div className="rounded-lg border border-border p-4">
                          <p className="text-xs text-muted-foreground uppercase tracking-wide">Accompanying Members</p>
                          <p className="text-sm font-semibold mt-1">{visaCase.sponsorship.accompanyingMembersCount ?? 0}</p>
                        </div>
                      )}
                      {isDuplicateClient && (
                        <div className="rounded-lg border border-border p-4 md:col-span-2 lg:col-span-3">
                          <p className="text-xs text-muted-foreground uppercase tracking-wide">Shared Client Details</p>
                          <p className="text-sm font-semibold mt-1 text-foreground">
                            Original counsellor: {originalCounsellorName}
                            {transferedToCounsellorName ? ` • Shared to: ${transferedToCounsellorName}` : ""}
                          </p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ),
            },
            ...(showStudentApplicationsSection
              ? [{
                value: "student-applications",
                label: "Student Applications",
                content: (
                  <Card className="border-none shadow-md overflow-hidden bg-card">
                    <CardHeader className="pb-4 border-b border-border">
                      <CardTitle className="text-xl font-bold flex items-center gap-2 text-card-foreground">
                        <GraduationCap className="h-6 w-6 text-emerald-600" />
                        Student Applications
                        <Badge variant="secondary" className="ml-1">
                          {studentAppCount}
                        </Badge>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-6">
                      <StudentApplicationTracker
                        clientId={clientId ?? clientData?.clientId}
                        variant="clientInfo"
                        readOnly
                        enableTuitionDeposit
                        clientHasDirectTuitionDeposit={clientHasDirectTuitionDeposit}
                        onAddApplication={
                          clientId
                            ? () => setLocation(`/clients/${clientId}/edit?section=student`)
                            : undefined
                        }
                      />
                    </CardContent>
                  </Card>
                ),
              }]
              : []),
            {
              value: "payment-details",
              label: "Payment Details",
              content: (
                <div className="space-y-8">
                  <Card className="border-none shadow-md overflow-hidden bg-card">
                    <CardHeader className="pb-4 border-b border-border">
                      <CardTitle className="text-xl font-bold flex items-center gap-2 text-card-foreground">
                        <CreditCard className="h-6 w-6 text-blue-500" />
                        Core Service Payment Summary
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-6">
                      <div className="flex flex-wrap gap-4 mb-8">
                        {(() => {
                          const totalPayment = client.payments?.[0]?.totalPayment || 0;
                          const totalReceived = client.payments?.reduce((sum: number, payment: any) => {
                            return sum + Number(payment.amount || 0);
                          }, 0) || 0;
                          const totalPending = Number(totalPayment) - Number(totalReceived);
                          return (
                            <>
                              <div className="flex-1 min-w-[200px] p-4 rounded-2xl bg-muted/50 border border-border flex flex-col items-center text-center">
                                <p className="text-[10px] text-muted-foreground uppercase font-black tracking-wider">Total Fees</p>
                                <p className="text-xl font-black mt-1 text-card-foreground">₹{Number(totalPayment).toLocaleString('en-IN')}</p>
                              </div>
                              <div className="flex-1 min-w-[200px] p-4 rounded-2xl bg-emerald-50/50 border border-emerald-100 flex flex-col items-center text-center">
                                <p className="text-[10px] text-emerald-600 uppercase font-black tracking-wider">Received</p>
                                <p className="text-xl font-black mt-1 text-emerald-700">₹{Number(totalReceived).toLocaleString('en-IN')}</p>
                              </div>
                              <div className="flex-1 min-w-[200px] p-4 rounded-2xl bg-orange-50/50 border border-orange-100 flex flex-col items-center text-center">
                                <p className="text-[10px] text-orange-600 uppercase font-black tracking-wider">Pending</p>
                                <p className="text-xl font-black mt-1 text-orange-700">₹{Math.max(0, Number(totalPending)).toLocaleString('en-IN')}</p>
                              </div>
                            </>
                          );
                        })()}
                      </div>

                      <h4 className="font-bold text-foreground mb-4 flex items-center gap-2 text-sm">
                        <ClipboardList className="h-4 w-4 text-muted-foreground" />
                        Payment History
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {client.payments?.length > 0 ? (
                          client.payments.map((payment: any, idx: number) => {
                            const otherHandler = getOtherPaymentHandlerLabel(
                              payment,
                              clientCounsellorId,
                              handlerNames
                            );
                            return (
                            <div key={idx} className="flex justify-between items-center p-4 rounded-xl border border-border bg-card shadow-sm">
                              <div>
                                <p className="font-bold text-card-foreground">{payment.invoiceNo || "Invoice not added yet"}</p>
                                <p className="text-xs text-muted-foreground font-medium">{formatDateLocal(payment.paymentDate)}</p>
                                {otherHandler && (
                                  <div className="mt-1">
                                    <PaymentTakenByOtherTag handlerName={otherHandler} />
                                  </div>
                                )}
                              </div>
                              <div className="text-right flex flex-col items-end gap-1">
                                <p className="font-black text-lg text-card-foreground">₹{Number(payment.amount).toLocaleString('en-IN')}</p>
                                <Badge variant="outline" className="text-[12px] font-black uppercase tracking-tighter px-2 h-7 rounded-md border-border text-muted-foreground bg-muted">
                                  {payment.stage?.replace(/_/g, " ")}
                                </Badge>
                              </div>
                            </div>
                            );
                          })
                        ) : (
                          <p className="col-span-full text-center py-8 text-muted-foreground italic text-sm">No payment records found.</p>
                        )}
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="border-none shadow-md overflow-hidden bg-card">
                    <CardHeader className="pb-4 border-b border-border">
                      <CardTitle className="text-xl font-bold flex items-center gap-2 text-card-foreground">
                        <Info className="h-6 w-6 text-indigo-500" />
                        Product Details
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-6">
                      <div>
                        <h4 className="font-bold text-foreground mb-4 flex items-center gap-2 text-sm">
                          <ClipboardList className="h-4 w-4 text-muted-foreground" />
                          Service Breakdown
                        </h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                          {client.productPayments && client.productPayments.length > 0 ? (
                            client.productPayments.map((prod: any, idx: number) => {
                              const isAllFinance =
                                prod.productName === "ALL_FINANCE_EMPLOYEMENT" ||
                                prod.productName === "ALL_FINANCE_EMPLOYMENT";
                              const paidAmountForAllFinance = isAllFinance
                                ? [
                                  prod.entity?.amount,
                                  prod.entity?.anotherPaymentAmount,
                                  prod.entity?.anotherPaymentAmount2,
                                ].reduce((sum: number, value: unknown) => {
                                  const n = Number(value ?? 0);
                                  return sum + (Number.isNaN(n) ? 0 : n);
                                }, 0)
                                : 0;
                              const productAmount = isAllFinance
                                ? paidAmountForAllFinance
                                : Number(prod.entity?.amount ?? prod.amount ?? 0);
                              const isExpanded = expandedProducts.has(idx);
                              const hasDetails = prod.entity || prod.entityType === "master_only";
                              const otherHandler = getOtherPaymentHandlerLabel(
                                prod,
                                clientCounsellorId,
                                handlerNames
                              );

                              return (
                                <div
                                  key={idx}
                                  className={`rounded-xl border border-border bg-card shadow-sm overflow-hidden transition-all ${isExpanded ? "shadow-md" : "hover:bg-accent/30"}`}
                                >
                                  <div
                                    className={`p-4 flex flex-col justify-between gap-2 ${hasDetails ? "cursor-pointer" : ""}`}
                                    onClick={() => hasDetails && toggleProduct(idx)}
                                  >
                                    <div className="flex items-start justify-between gap-2">
                                      <span className="text-[10px] font-black text-muted-foreground uppercase tracking-wider line-clamp-2 flex-1">
                                        {prod.productName?.replace(/_/g, " ")}
                                      </span>
                                      {hasDetails && (
                                        <button className="text-muted-foreground hover:text-foreground transition-colors">
                                          {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                                        </button>
                                      )}
                                    </div>
                                    <span className="font-black text-lg text-card-foreground">₹{Number(productAmount).toLocaleString('en-IN')}</span>
                                    {otherHandler && <PaymentTakenByOtherTag handlerName={otherHandler} />}
                                  </div>

                                  {hasDetails && isExpanded && (
                                    <div className="px-4 pb-4 pt-2 border-t border-border bg-muted/40">
                                      {renderProductDetails(prod)}
                                    </div>
                                  )}
                                </div>
                              );
                            })
                          ) : (
                            <p className="col-span-full text-center py-8 text-muted-foreground italic text-sm">No service breakdown available.</p>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              ),
            },
            ...(canViewDocsVault
              ? [{
                value: "docs-vault",
                label: "Docs Vault",
                content: (isCxUser || isBindingUser) ? (
                  <CxDocReviewPanel
                    rawDocuments={documents}
                    clientName={clientFullName}
                    canReviewDocuments={isCxUser}
                  />
                ) : (
                  <Card className="border-none shadow-md overflow-hidden bg-card">
                    <CardHeader className="pb-4 border-b border-border">
                      <CardTitle className="text-xl font-bold flex items-center gap-2 text-card-foreground">
                        <FolderOpen className="h-6 w-6 text-blue-500" />
                        Docs Vault
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-6">
                      <div className="grid gap-4 lg:grid-cols-[260px_1fr]">
                        <div className="rounded-lg border border-border p-3">
                          <p className="px-2 pb-2 text-xs font-semibold uppercase text-muted-foreground">Folder Structure</p>
                          <div className="space-y-1">
                            {allFolderKeys.length > 0 ? allFolderKeys.map((folderName) => (
                              <button
                                key={folderName}
                                type="button"
                                onClick={() => setSelectedFolder(folderName)}
                                className={`w-full rounded-md px-3 py-2 text-left text-sm ${selectedFolder === folderName ? "bg-primary/10 text-primary" : "hover:bg-accent text-foreground"}`}
                              >
                                <div className="flex items-center justify-between">
                                  <span>{folderName.replace(/_/g, " ")}</span>
                                  <span className="text-xs text-muted-foreground">{(documentsByFolder[folderName] || []).length}</span>
                                </div>
                              </button>
                            )) : (
                              <p className="px-2 py-2 text-sm text-muted-foreground">No folders yet.</p>
                            )}
                          </div>

                          {!isViewOnlyDocsVault && (
                            <div className="mt-3 border-t border-border pt-3 space-y-2">
                              <p className="text-xs font-semibold uppercase text-muted-foreground">Create Folder</p>
                              <input
                                value={newFolderName}
                                onChange={(e) => setNewFolderName(e.target.value)}
                                placeholder="Folder name"
                                className="w-full rounded-md border border-border bg-background text-foreground placeholder:text-muted-foreground px-3 py-2 text-sm"
                              />
                              <Button type="button" className="w-full" size="sm" onClick={handleCreateFolder}>
                                Create Folder
                              </Button>
                            </div>
                          )}
                        </div>

                        <div className="rounded-lg border border-border p-4">
                          {!isViewOnlyDocsVault && (
                            <div className="mb-4 grid gap-3 md:grid-cols-[1fr_1fr_auto]">
                              <input
                                value={documentTitle}
                                onChange={(e) => setDocumentTitle(e.target.value)}
                                placeholder="Document title (optional)"
                                className="rounded-md border border-border bg-background text-foreground placeholder:text-muted-foreground px-3 py-2 text-sm"
                              />
                              <input
                                type="file"
                                accept=".pdf,image/*"
                                onChange={(e) => setSelectedDocFile(e.target.files?.[0] || null)}
                                className="rounded-md border border-border bg-background text-foreground px-3 py-2 text-sm"
                              />
                              <Button type="button" onClick={() => uploadDocumentMutation.mutate()} disabled={uploadDocumentMutation.isPending || !selectedDocFile}>
                                {uploadDocumentMutation.isPending ? "Uploading..." : "Upload File"}
                              </Button>
                            </div>
                          )}

                          {(documentsByFolder[selectedFolder] || []).length > 0 ? (
                            <div className="space-y-2">
                              {(documentsByFolder[selectedFolder] || []).map((doc: any, idx: number) => (
                                <div key={`${selectedFolder}-${idx}`} className="flex items-center justify-between rounded-md bg-muted px-3 py-2">
                                  <div>
                                    <p className="text-sm text-foreground">{doc.documentName || doc.name || doc.fileName || "Document"}</p>
                                    <p className="text-xs text-muted-foreground">{formatDateLocal(doc.createdAt || doc.uploadedAt || "")}</p>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    {(doc.fileUrl || doc.url || doc.path) && (
                                      <a
                                        href={doc.fileUrl || doc.url || doc.path}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="text-xs text-blue-600 hover:underline"
                                      >
                                        Open
                                      </a>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-sm text-muted-foreground">No files in this folder.</p>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ),
              }]
              : []),
            {
              value: "timeline",
              label: "Timeline",
              content: (
                <Card className="border-none shadow-md overflow-hidden bg-card">
                  <CardHeader className="py-3 px-6 border-b border-border">
                    <div className="flex items-center justify-between gap-4">
                      <CardTitle className="text-xl font-bold flex items-center gap-2 text-card-foreground shrink-0">
                        <Route className="h-5 w-5 text-violet-500" />
                        Timeline
                      </CardTitle>
                      {!isTimelineLoading && (
                        <JourneyProgress events={journeyTimeline?.events ?? []} />
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="pt-3 px-4 pb-4">
                    <ClientTimeline
                      events={journeyTimeline?.events ?? []}
                      isLoading={isTimelineLoading}
                      counsellorName={originalCounsellorName}
                    />
                  </CardContent>
                </Card>
              ),
            },
            {
              value: "task-followup",

              label: "Task & Followup",
              content: (
                <Card className="border-none shadow-md overflow-hidden bg-card">
                  <CardHeader className="pb-4 border-b border-border">
                    <CardTitle className="text-xl font-bold flex items-center gap-2 text-card-foreground">
                      <ListChecks className="h-6 w-6 text-amber-500" />
                      Task & Followup
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-6">
                    <div className="rounded-lg border border-dashed border-border p-6 text-center">
                      <p className="text-sm font-semibold text-foreground">Task and followup section is ready for client-side task data.</p>
                      <p className="text-xs text-muted-foreground mt-1">Connect this tab with task/followup API when backend is finalized.</p>
                    </div>
                  </CardContent>
                </Card>
              ),
            },
            {
              value: "application-tracker",
              label: "Application Tracker",
              content: (
                <Card className="border-none shadow-md overflow-hidden bg-card">
                  <CardHeader className="pb-4 border-b border-border">
                    <CardTitle className="text-xl font-bold flex items-center gap-2 text-card-foreground">
                      <Route className="h-6 w-6 text-emerald-500" />
                      Application Tracker
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-6">
                    {timelineItems.length > 0 ? (
                      <div className="space-y-3">
                        {timelineItems.map((item) => (
                          <div key={`tracker-${item.id}`} className="rounded-lg border border-border p-4">
                            <p className="text-sm font-semibold text-foreground">{item.title}</p>
                            <p className="text-xs text-muted-foreground mt-1">{item.subtitle}</p>
                            <p className="text-xs text-muted-foreground mt-1">{formatDateLocal(item.date || "")}</p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-center py-8 text-muted-foreground italic text-sm">No tracker events found.</p>
                    )}
                  </CardContent>
                </Card>
              ),
            },
          ]}
        />
      </div>

      {/* Change-status dialog */}
      <Dialog open={statusOpen} onOpenChange={(open) => { setStatusOpen(open); if (!open) { setStatusStage(""); setStatusValue(""); setStatusNotes(""); } }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Change Status — {clientFullName}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {visaCase?.processing?.label && (
              <div className="rounded-md bg-muted/50 border border-border px-3 py-2 text-sm text-muted-foreground">
                Current: <span className="font-semibold text-foreground">{visaCase.processing.label}</span>
              </div>
            )}
            {/* Step 1 — Stage */}
            <div className="space-y-2">
              <Label className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Stage</Label>
              {visaCase?.visaCaseId && processingStages ? (
                <Select
                  value={statusStage}
                  onValueChange={(v) => { setStatusStage(v); setStatusValue(""); }}
                >
                  <SelectTrigger className="h-9 w-full">
                    <SelectValue placeholder="Select a stage" />
                  </SelectTrigger>
                  <SelectContent>
                    {processingStages.stages.map((s) => (
                      <SelectItem key={s.stage} value={s.label}>{s.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Select value={statusStage} onValueChange={(v) => { setStatusStage(v); setStatusValue(""); }}>
                  <SelectTrigger className="h-9 w-full">
                    <SelectValue placeholder="Select a stage" />
                  </SelectTrigger>
                  <SelectContent>
                    {BACKEND_PROCESSING_STATUS_GROUPS.map((g) => (
                      <SelectItem key={g.stage} value={g.stage}>{g.stage}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
            {/* Step 2 — Sub-status (visible only after stage is chosen) */}
            {statusStage && (
              <div className="space-y-2">
                <Label className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Status</Label>
                {visaCase?.visaCaseId && processingStages ? (
                  <Select value={statusValue} onValueChange={setStatusValue}>
                    <SelectTrigger className="h-9 w-full">
                      <SelectValue placeholder="Select a status" />
                    </SelectTrigger>
                    <SelectContent>
                      {(processingStages.stages.find((s) => s.label === statusStage)?.subStatuses ?? []).map((s) => (
                        <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <Select value={statusValue} onValueChange={setStatusValue}>
                    <SelectTrigger className="h-9 w-full">
                      <SelectValue placeholder="Select a status" />
                    </SelectTrigger>
                    <SelectContent>
                      {(BACKEND_PROCESSING_STATUS_GROUPS.find((g) => g.stage === statusStage)?.statuses ?? []).map((s) => (
                        <SelectItem key={s} value={s}>{s}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
            )}
            {visaCase?.visaCaseId && (
              <div className="space-y-2">
                <Label className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Notes (optional)</Label>
                <Textarea
                  value={statusNotes}
                  onChange={(e) => setStatusNotes(e.target.value)}
                  placeholder="Add a note for this status change…"
                  rows={3}
                  className="resize-none text-sm"
                />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setStatusOpen(false)}>Cancel</Button>
            <Button onClick={saveStatus} disabled={!statusValue || changeStatusMutation.isPending}>
              {changeStatusMutation.isPending ? "Saving…" : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Basic Details — client fields + visa-case sponsorship/travel */}
      <Dialog open={basicEditOpen} onOpenChange={setBasicEditOpen}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Basic Details — {clientFullName}</DialogTitle>
          </DialogHeader>
          <div className="space-y-5 py-2">

            {/* ── Client Information ── */}
            <div className="space-y-3">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Client Information</p>
              <div className="space-y-2">
                <Label className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Full Name</Label>
                <Input
                  value={fullNameDraft}
                  onChange={(e) => setFullNameDraft(e.target.value)}
                  placeholder="Client full name"
                  className="h-9"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Enrollment Date</Label>
                <Input
                  type="date"
                  value={enrollmentDateDraft}
                  onChange={(e) => setEnrollmentDateDraft(e.target.value)}
                  className="h-9"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Passport Details</Label>
                <Input
                  value={passportDetailsDraft}
                  onChange={(e) => setPassportDetailsDraft(e.target.value)}
                  placeholder="e.g. A1234567"
                  className="h-9"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Lead Type</Label>
                <Select value={leadTypeIdDraft} onValueChange={setLeadTypeIdDraft}>
                  <SelectTrigger className="h-9 w-full">
                    <SelectValue placeholder="Select a lead type" />
                  </SelectTrigger>
                  <SelectContent>
                    {leadTypes.map((lt) => (
                      <SelectItem key={lt.id} value={String(lt.id)}>
                        {lt.displayAlias?.trim() || lt.leadType}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* ── Visa Case Details (only when a visa case exists) ── */}
            {visaCase && (
              <div className="space-y-3 border-t border-border pt-4">
                <div className="flex items-center justify-between">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Visa Case Details</p>
                  {!canEditVisaCase && (
                    <span className="text-[11px] text-muted-foreground italic">Not assigned to you</span>
                  )}
                </div>
                <div className="space-y-2">
                  <Label className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Reason of Travel</Label>
                  <Select value={reasonDraft} onValueChange={setReasonDraft} disabled={!canEditVisaCase}>
                    <SelectTrigger className="h-9 w-full">
                      <SelectValue placeholder="Select a reason" />
                    </SelectTrigger>
                    <SelectContent>
                      {REASON_OF_TRAVEL_OPTIONS.map((o) => (
                        <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Sponsor Relationship</Label>
                  <Select value={relDraft} onValueChange={setRelDraft} disabled={!canEditVisaCase}>
                    <SelectTrigger className="h-9 w-full">
                      <SelectValue placeholder="Select a relationship" />
                    </SelectTrigger>
                    <SelectContent>
                      {SPONSOR_RELATIONSHIP_OPTIONS.map((o) => (
                        <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Accompanying Members</Label>
                  <Input
                    type="number"
                    min={0}
                    inputMode="numeric"
                    value={membersDraft}
                    onChange={(e) => setMembersDraft(e.target.value)}
                    className="h-9"
                    disabled={!canEditVisaCase}
                  />
                  <p className="text-[11px] text-muted-foreground">Number of members travelling with the applicant.</p>
                </div>
              </div>
            )}

          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBasicEditOpen(false)}>Cancel</Button>
            <Button onClick={saveBasicDetails} disabled={savingBasicDetails || !fullNameDraft.trim()}>
              {savingBasicDetails ? "Saving…" : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* Assign visa case dialog */}
      <Dialog open={assignOpen} onOpenChange={setAssignOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Assign Case — {clientFullName}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="rounded-md bg-blue-50 border border-blue-100 px-3 py-2 text-sm text-blue-700 space-y-0.5">
              {visaCase?.processing?.assignedTeam && (
                <p>Currently with: <span className="font-semibold">{visaCase.processing.assignedTeam.toUpperCase()}</span>
                  {visaCase.processing.assignedUser?.fullName ? ` — ${visaCase.processing.assignedUser.fullName}` : ""}
                </p>
              )}
              {assignableTargetTeam ? (
                <p>Handing off to: <span className="font-semibold">{assignableTargetTeam.replace(/_/g, " ").toUpperCase()}</span> team</p>
              ) : (
                <p>Select any team member to assign this case.</p>
              )}
            </div>
            <div className="space-y-2">
              <Label className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                Assign to
              </Label>
              <Select value={assignUserIdDraft} onValueChange={setAssignUserIdDraft}>
                <SelectTrigger className="h-9 w-full">
                  <SelectValue placeholder={filteredAssignableUsers.length === 0 ? "No users available" : "Select a team member"} />
                </SelectTrigger>
                <SelectContent>
                  {filteredAssignableUsers.length > 0 ? (
                    filteredAssignableUsers.map((u) => (
                      <SelectItem key={u.id} value={String(u.id)}>
                        {u.fullName}
                        {u.empId ? ` (${u.empId})` : ""}
                      </SelectItem>
                    ))
                  ) : (
                    <div className="px-3 py-2 text-sm text-muted-foreground">No team members found</div>
                  )}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                Notes (optional)
              </Label>
              <Textarea
                value={assignNotesDraft}
                onChange={(e) => setAssignNotesDraft(e.target.value)}
                placeholder="Add a note for this assignment…"
                rows={3}
                className="resize-none text-sm"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAssignOpen(false)}>Cancel</Button>
            <Button
              onClick={handleAssign}
              disabled={!assignUserIdDraft || assignBulkMutation.isPending}
            >
              {assignBulkMutation.isPending ? "Assigning…" : "Assign"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageWrapper>
  );
}