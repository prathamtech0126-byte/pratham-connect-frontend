import { useRoute, useLocation } from "wouter";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { clientService } from "@/services/clientService";
import { PageWrapper } from "@/layout/PageWrapper";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { User, Calendar, CreditCard, ClipboardList, Info, ChevronDown, ChevronUp, Edit, ArrowLeft } from "lucide-react";
import { getLatestStageFromPayments } from "@/utils/stageUtils";
import { useState, useEffect } from "react";
import { useSocket } from "@/context/socket-context";
import { useToast } from "@/hooks/use-toast";

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
            <span className="text-gray-500">Amount:</span>
            <span className="font-semibold">₹{Number(product.amount).toLocaleString()}</span>
          </div>
        )}
        {product.paymentDate && (
          <div className="flex justify-between">
            <span className="text-gray-500">Payment Date:</span>
            <span className="font-semibold">{formatDateLocal(product.paymentDate)}</span>
          </div>
        )}
        {product.invoiceNo && (
          <div className="flex justify-between">
            <span className="text-gray-500">Invoice No:</span>
            <span className="font-semibold">{product.invoiceNo}</span>
          </div>
        )}
        {product.remarks && (
          <div className="flex flex-col">
            <span className="text-gray-500 mb-1">Remarks:</span>
            <span className="text-sm">{product.remarks}</span>
          </div>
        )}
      </div>
    );
  }

  if (!entity) {
    return <p className="text-sm text-gray-400 italic">No details available</p>;
  }

  // Render based on product type
  switch (product.productName) {
    case 'SIM_CARD_ACTIVATION':
      return (
        <div className="space-y-2 text-sm">
          {entity.activatedStatus !== undefined && (
            <div className="flex justify-between">
              <span className="text-gray-500">Activated:</span>
              <Badge variant={entity.activatedStatus ? "default" : "secondary"}>
                {entity.activatedStatus ? "Yes" : "No"}
              </Badge>
            </div>
          )}
          {entity.simcardPlan && (
            <div className="flex justify-between">
              <span className="text-gray-500">Plan:</span>
              <span className="font-semibold">{entity.simcardPlan}</span>
            </div>
          )}
          {entity.simCardGivingDate && (
            <div className="flex justify-between">
              <span className="text-gray-500">Giving Date:</span>
              <span className="font-semibold">{formatDateLocal(entity.simCardGivingDate)}</span>
            </div>
          )}
          {entity.simActivationDate && (
            <div className="flex justify-between">
              <span className="text-gray-500">Activation Date:</span>
              <span className="font-semibold">{formatDateLocal(entity.simActivationDate)}</span>
            </div>
          )}
          {entity.remarks && (
            <div className="flex flex-col mt-2">
              <span className="text-gray-500 mb-1">Remarks:</span>
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
              <span className="text-gray-500">Ticket Booked:</span>
              <Badge variant={entity.isTicketBooked ? "default" : "secondary"}>
                {entity.isTicketBooked ? "Yes" : "No"}
              </Badge>
            </div>
          )}
          {entity.amount && (
            <div className="flex justify-between">
              <span className="text-gray-500">Amount:</span>
              <span className="font-semibold">₹{Number(entity.amount).toLocaleString()}</span>
            </div>
          )}
          {entity.airTicketNumber && (
            <div className="flex justify-between">
              <span className="text-gray-500">Ticket Number:</span>
              <span className="font-semibold">{entity.airTicketNumber}</span>
            </div>
          )}
          {entity.ticketDate && (
            <div className="flex justify-between">
              <span className="text-gray-500">Ticket Date:</span>
              <span className="font-semibold">{formatDateLocal(entity.ticketDate)}</span>
            </div>
          )}
          {entity.remarks && (
            <div className="flex flex-col mt-2">
              <span className="text-gray-500 mb-1">Remarks:</span>
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
              <span className="text-gray-500">Amount:</span>
              <span className="font-semibold">₹{Number(entity.amount).toLocaleString()}</span>
            </div>
          )}
          {entity.policyNumber && (
            <div className="flex justify-between">
              <span className="text-gray-500">Policy Number:</span>
              <span className="font-semibold">{entity.policyNumber}</span>
            </div>
          )}
          {entity.insuranceDate && (
            <div className="flex justify-between">
              <span className="text-gray-500">Insurance Date:</span>
              <span className="font-semibold">{formatDateLocal(entity.insuranceDate)}</span>
            </div>
          )}
          {entity.remarks && (
            <div className="flex flex-col mt-2">
              <span className="text-gray-500 mb-1">Remarks:</span>
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
              <span className="text-gray-500">Opening Date:</span>
              <span className="font-semibold">{formatDateLocal(entity.openingDate)}</span>
            </div>
          )}
          {entity.fundingDate && (
            <div className="flex justify-between">
              <span className="text-gray-500">Funding Date:</span>
              <span className="font-semibold">{formatDateLocal(entity.fundingDate)}</span>
            </div>
          )}
          {entity.amount && (
            <div className="flex justify-between">
              <span className="text-gray-500">Amount:</span>
              <span className="font-semibold">${Number(entity.amount).toLocaleString()}</span>
            </div>
          )}
          {entity.remarks && (
            <div className="flex flex-col mt-2">
              <span className="text-gray-500 mb-1">Remarks:</span>
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
              <span className="text-gray-500">Side:</span>
              <span className="font-semibold">{entity.side}</span>
            </div>
          )}
          {entity.feeDate && (
            <div className="flex justify-between">
              <span className="text-gray-500">Fee Date:</span>
              <span className="font-semibold">{formatDateLocal(entity.feeDate)}</span>
            </div>
          )}
          {entity.amount && (
            <div className="flex justify-between">
              <span className="text-gray-500">Amount:</span>
              <span className="font-semibold">₹{Number(entity.amount).toLocaleString()}</span>
            </div>
          )}
          {entity.remarks && (
            <div className="flex flex-col mt-2">
              <span className="text-gray-500 mb-1">Remarks:</span>
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
              <span className="text-gray-500">Status:</span>
              <Badge variant="outline">{entity.tutionFeesStatus}</Badge>
            </div>
          )}
          {entity.feeDate && (
            <div className="flex justify-between">
              <span className="text-gray-500">Fee Date:</span>
<span className="font-semibold">{formatDateLocal(entity.feeDate)}</span>
          </div>
          )}
          {entity.remarks && (
            <div className="flex flex-col mt-2">
              <span className="text-gray-500 mb-1">Remarks:</span>
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
              <span className="text-gray-500">Service Name:</span>
              <span className="font-semibold">{entity.serviceName}</span>
            </div>
          )}
          {entity.serviceInformation && (
            <div className="flex flex-col">
              <span className="text-gray-500 mb-1">Service Info:</span>
              <span className="text-sm">{entity.serviceInformation}</span>
            </div>
          )}
          {entity.amount && (
            <div className="flex justify-between">
              <span className="text-gray-500">Amount:</span>
              <span className="font-semibold">₹{Number(entity.amount).toLocaleString()}</span>
            </div>
          )}
          {entity.sellDate && (
            <div className="flex justify-between">
              <span className="text-gray-500">Sell Date:</span>
              <span className="font-semibold">{formatDateLocal(entity.sellDate)}</span>
            </div>
          )}
          {entity.invoiceNo && (
            <div className="flex justify-between">
              <span className="text-gray-500">Invoice No:</span>
              <span className="font-semibold">{entity.invoiceNo}</span>
            </div>
          )}
          {entity.remarks && (
            <div className="flex flex-col mt-2">
              <span className="text-gray-500 mb-1">Remarks:</span>
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
              <span className="text-gray-500">Finance Id:</span>
              <span className="font-semibold">{entity.financeId}</span>
            </div>
          )}
          {entity.totalAmount !== undefined && entity.totalAmount !== null && (
            <div className="flex justify-between">
              <span className="text-gray-500">Total Payment:</span>
              <span className="font-semibold">₹{Number(entity.totalAmount).toLocaleString()}</span>
            </div>
          )}
          {entity.amount && (
            <div className="flex justify-between">
              <span className="text-gray-500">Amount:</span>
              <span className="font-semibold">₹{Number(entity.amount).toLocaleString()}</span>
            </div>
          )}
          {entity.paymentDate && (
            <div className="flex justify-between">
              <span className="text-gray-500">Payment Date:</span>
              <span className="font-semibold">{formatDateLocal(entity.paymentDate)}</span>
            </div>
          )}
          {entity.invoiceNo && (
            <div className="flex justify-between">
              <span className="text-gray-500">Invoice No:</span>
              <span className="font-semibold">{entity.invoiceNo}</span>
            </div>
          )}
          {entity.partialPayment !== undefined && entity.partialPayment !== null && (
            <div className="flex justify-between">
              <span className="text-gray-500">Partial Payment:</span>
              <span className="font-semibold">{entity.partialPayment ? 'Yes' : 'No'}</span>
            </div>
          )}
          {entity.approvalStatus && (
            <div className="flex justify-between">
              <span className="text-gray-500">Approval Status:</span>
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
                    <span className="text-gray-500">{row.label} Amount:</span>
                    <span className="font-semibold">₹{amountNum.toLocaleString()}</span>
                  </div>
                )}
                {hasDate && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">{row.label} Date:</span>
                    <span className="font-semibold">{formatDateLocal(row.date)}</span>
                  </div>
                )}
              </div>
            );
          })}
          {entity.remarks && (
            <div className="flex flex-col mt-1">
              <span className="text-gray-500 mb-1">Remarks:</span>
              <span className="text-sm">{entity.remarks}</span>
            </div>
          )}
          {entity.approver?.name && (
            <div className="flex justify-between">
              <span className="text-gray-500">Approver:</span>
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
                    ? `₹${Number(value).toLocaleString()}`
                    : String(value);

            return (
              <div key={key} className="flex justify-between">
                <span className="text-gray-500">{displayKey}:</span>
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

export default function ClientView() {
  const [, params] = useRoute("/clients/:id/view");
  const [, setLocation] = useLocation();
  const clientId = params?.id ? parseInt(params.id) : null;
  const [expandedProducts, setExpandedProducts] = useState<Set<number>>(new Set());
  const [returnPath, setReturnPath] = useState<string | null>(null);
  const [returnCounsellorName, setReturnCounsellorName] = useState<string>("");
  const { socket, isConnected } = useSocket();

  useEffect(() => {
    const path = sessionStorage.getItem(RETURN_PATH_KEY);
    const name = sessionStorage.getItem(RETURN_COUNSELLOR_NAME_KEY) || "";
    if (path && path.startsWith("/clients/counsellor/")) {
      setReturnPath(path);
      setReturnCounsellorName(name);
    } else {
      setReturnPath(null);
      setReturnCounsellorName("");
    }
  }, []);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: client, isLoading } = useQuery({
    queryKey: ["client-complete", clientId],
    queryFn: () => clientService.getClientCompleteDetails(clientId!),
    enabled: !!clientId,
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

  if (isLoading) {
    const loadingBreadcrumbs = [{ label: "Clients", href: "/clients" }, { label: "Loading..." }];
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
    const errorBreadcrumbs = [{ label: "Clients", href: "/clients" }, { label: "Error" }];
    return (
      <PageWrapper title="Client Not Found" breadcrumbs={errorBreadcrumbs}>
        <div className="text-center py-20">
          <h2 className="text-2xl font-bold text-gray-900">Client Not Found</h2>
          <p className="text-gray-500 mt-2">The client details you are looking for could not be retrieved.</p>
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

  // Get saleType from multiple sources: direct property, or from payments array
  const getClientSaleType = () => {
    // First try direct property
    if (clientData.saleType?.saleType || clientData.salesType) {
      return clientData.saleType?.saleType || clientData.salesType;
    }
    // Then try from payments array
    if (clientData.payments && Array.isArray(clientData.payments) && clientData.payments.length > 0) {
      const paymentWithSaleType = clientData.payments.find((p: any) => p.saleType?.saleType);
      if (paymentWithSaleType?.saleType?.saleType) {
        return paymentWithSaleType.saleType.saleType;
      }
    }
    return "Only Products";
  };
  const clientSaleType = getClientSaleType();

  // When a particular client is open: Home > Clients > Client name
  const mainBreadcrumbs = [
    { label: "Clients", href: "/clients" },
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
              Back to counsellor clients
            </Button>
          )}
          {params?.id && (
            <Button variant="outline" size="sm" onClick={() => setLocation(`/clients/${params.id}/edit`)} className="gap-1.5">
              <Edit className="h-4 w-4" />
              Edit
            </Button>
          )}
        </div>
      }
    >
      <div className="space-y-8">
        {/* Header Section */}
        <Card className="border-none shadow-md bg-gradient-to-r from-blue-50 to-indigo-50">
          <CardContent className="pt-6">
            <div className="flex flex-col md:flex-row justify-between gap-6">
              <div className="flex items-center gap-4">
                <div className="h-16 w-16 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
                  <User className="h-8 w-8" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">{clientFullName}</h2>
                  <div className="flex items-center gap-2 mt-1">
                    {/* <Badge variant="outline" className="bg-white">{clientSaleType}</Badge> */}
                    <Badge className={clientArchived ? "bg-gray-100 text-gray-600" : "bg-emerald-100 text-emerald-700"}>
                      {clientArchived ? "Archived" : "Active"}
                    </Badge>
                    {isDuplicateClient && (
                      <Badge
                        variant="secondary"
                        className="bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-800"
                      >
                        Shared Client
                      </Badge>
                    )}
                  </div>
                  {isDuplicateClient ? (
                    <p className="mt-2 text-sm text-gray-600">
                      Original counsellor: <span className="font-semibold text-gray-900">{originalCounsellorName}</span>
                      {transferedToCounsellorName ? (
                        <>
                          {" "}• Shared to: <span className="font-semibold text-gray-900">{transferedToCounsellorName}</span>
                        </>
                      ) : null}
                    </p>
                  ) : null}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-8">
                <div>
                  <p className="text-sm text-gray-500">Enrollment Date</p>
                  <p className="font-semibold">{formatDateLocal(clientEnrollmentDate)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Current Stage</p>
                  <p className="font-semibold text-blue-600">{getLatestStageFromPayments(
                    client.payments,
                    client.client?.stage || client.stage,
                    client.client?.visaSubmitted || client.visaSubmitted
                  ) || "N/A"}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-8">
          {/* Payment Overview - Horizontal Summary */}
          <Card className="border-none shadow-md overflow-hidden bg-white">
            <CardHeader className="pb-4 border-b border-gray-50">
              <CardTitle className="text-xl font-bold flex items-center gap-2 text-[#1A2B3B]">
                <CreditCard className="h-6 w-6 text-blue-500" />
                Core Service Payment Summary
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="flex flex-wrap gap-4 mb-8">
                {/* Calculate totals from all payments */}
                {(() => {
                  const totalPayment = client.payments?.[0]?.totalPayment || 0;
                  // Sum all payment amounts (INITIAL + BEFORE_VISA + AFTER_VISA)
                  const totalReceived = client.payments?.reduce((sum: number, payment: any) => {
                    return sum + Number(payment.amount || 0);
                  }, 0) || 0;
                  const totalPending = Number(totalPayment) - Number(totalReceived);

                  return (
                    <>

                      <div className="flex-1 min-w-[200px] p-4 rounded-2xl bg-gray-50/50 border border-gray-100 flex flex-col items-center text-center">
                        <p className="text-[10px] text-gray-400 uppercase font-black tracking-wider">Total Fees</p>
                        <p className="text-xl font-black mt-1 text-[#1A2B3B]">₹{Number(totalPayment).toLocaleString()}</p>
                      </div>
                      <div className="flex-1 min-w-[200px] p-4 rounded-2xl bg-emerald-50/50 border border-emerald-100 flex flex-col items-center text-center">
                        <p className="text-[10px] text-emerald-600 uppercase font-black tracking-wider">Received</p>
                        <p className="text-xl font-black mt-1 text-emerald-700">₹{Number(totalReceived).toLocaleString()}</p>
                      </div>
                      <div className="flex-1 min-w-[200px] p-4 rounded-2xl bg-orange-50/50 border border-orange-100 flex flex-col items-center text-center">
                        <p className="text-[10px] text-orange-600 uppercase font-black tracking-wider">Pending</p>
                        <p className="text-xl font-black mt-1 text-orange-700">₹{Math.max(0, Number(totalPending)).toLocaleString()}</p>
                      </div>
                    </>
                  );
                })()}
              </div>


              <h4 className="font-bold text-gray-700 mb-4 flex items-center gap-2 text-sm">
                <ClipboardList className="h-4 w-4 text-gray-400" />
                Payment History
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {client.payments?.length > 0 ? (
                  client.payments.map((payment: any, idx: number) => (
                    <div key={idx} className="flex justify-between items-center p-4 rounded-xl border border-gray-100 bg-white shadow-sm">
                      <div>
                        <p className="font-bold text-[#1A2B3B]">{payment.invoiceNo || "Invoice not added yet"}</p>
                        <p className="text-xs text-gray-400 font-medium">{formatDateLocal(payment.paymentDate)}</p>
                      </div>
                      <div className="text-right flex flex-col items-end gap-1">
                        <p className="font-black text-lg text-[#1A2B3B]">₹{Number(payment.amount).toLocaleString()}</p>
                        <Badge variant="outline" className="text-[12px] font-black uppercase tracking-tighter px-2 h-7 rounded-md border-gray-200 text-gray-500 bg-gray-50">
                          {payment.stage?.replace(/_/g, ' ')}
                        </Badge>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="col-span-full text-center py-8 text-gray-400 italic text-sm">No payment records found.</p>
                )}
              </div>
              <h4 className="font-bold mt-4 text-gray-700 mb-4 flex items-center gap-2 text-sm">
                <Info className="h-4 w-4 text-gray-400" />
                Sales Type and Core Product Details
              </h4>

              {client.payments?.length > 0 && (() => {
                const payment = client.payments[0]; // take only first item

                return (
                  <div className="flex flex-wrap gap-4">
                    <div className="flex-1 min-w-[200px] p-4 rounded-xl border border-gray-100 bg-white shadow-sm">
                      <label className="text-[10px] text-gray-400 uppercase font-black tracking-wider block mb-1">
                        SALES TYPE
                      </label>
                      <p className="font-bold text-lg text-[#1A2B3B]">
                        {payment.saleType?.saleType || payment.salesType || "Only Products"}
                      </p>
                    </div>

                    <div className="flex-1 min-w-[200px] p-4 rounded-xl border border-gray-100 bg-white shadow-sm">
                      <label className="text-[10px] text-gray-400 uppercase font-black tracking-wider block mb-1">
                        CORE PRODUCT
                      </label>
                      <p className="font-bold text-lg text-[#1A2B3B]">
                        {payment.saleType?.isCoreProduct !== undefined
                          ? payment.saleType.isCoreProduct ? "Yes" : "No"
                          : payment.isCoreProduct !== undefined
                            ? payment.isCoreProduct ? "Yes" : "No"
                            : "Only Products"}
                      </p>
                    </div>
                  </div>
                );
              })()}
            </CardContent>
          </Card>

          {/* Product Details - Full Width below Payment */}
          <Card className="border-none shadow-md overflow-hidden bg-white">
            <CardHeader className="pb-4 border-b border-gray-50">
              <CardTitle className="text-xl font-bold flex items-center gap-2 text-[#1A2B3B]">
                <Info className="h-6 w-6 text-indigo-500" />
                Product Details
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="space-y-8">
                {/* Product Details Section - Sales Type and Core Product */}
                {/* <div>
                  <h4 className="font-bold text-gray-700 mb-4 flex items-center gap-2 text-sm">
                    <Info className="h-4 w-4 text-indigo-500" />
                    Product Details
                  </h4>

                </div> */}

                {/* Service Breakdown Section */}
                <div>
                  <h4 className="font-bold text-gray-700 mb-4 flex items-center gap-2 text-sm">
                    <ClipboardList className="h-4 w-4 text-gray-400" />
                    Service Breakdown
                  </h4>
                  {/* Expandable Service Cards Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {client.productPayments && client.productPayments.length > 0 ? (
                      client.productPayments.map((prod: any, idx: number) => {
                        const isAllFinance =
                          prod.productName === "ALL_FINANCE_EMPLOYEMENT" ||
                          prod.productName === "ALL_FINANCE_EMPLOYMENT";

                        // For All Finance, show total paid (sum of installments) instead of only first amount.
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

                        const totalAmountForAllFinance = isAllFinance
                          ? Number(prod.entity?.totalAmount ?? 0)
                          : 0;

                        const pendingAmountForAllFinance = isAllFinance
                          ? Math.max(0, totalAmountForAllFinance - paidAmountForAllFinance)
                          : 0;

                        // Default amount display for non-finance products
                        const productAmount = isAllFinance
                          ? paidAmountForAllFinance
                          : Number(prod.entity?.amount ?? prod.amount ?? 0);
                        const isExpanded = expandedProducts.has(idx);
                        const hasDetails = prod.entity || prod.entityType === 'master_only';

                        return (
                          <div
                            key={idx}
                            className={`rounded-xl border border-gray-100 bg-white shadow-sm overflow-hidden transition-all ${isExpanded ? 'shadow-md' : 'hover:bg-gray-50/50'
                              }`}
                          >
                            {/* Header - Always visible */}
                            <div
                              className={`p-4 flex flex-col justify-between gap-2 ${hasDetails ? 'cursor-pointer' : ''}`}
                              onClick={() => hasDetails && toggleProduct(idx)}
                            >
                              <div className="flex items-start justify-between gap-2">
                                <span className="text-[10px] font-black text-gray-400 uppercase tracking-wider line-clamp-2 flex-1">
                                  {prod.productName?.replace(/_/g, ' ')}
                                </span>
                                {hasDetails && (
                                  <button className="text-gray-400 hover:text-gray-600 transition-colors">
                                    {isExpanded ? (
                                      <ChevronUp className="h-4 w-4" />
                                    ) : (
                                      <ChevronDown className="h-4 w-4" />
                                    )}
                                  </button>
                                )}
                              </div>
                              <span className="font-black text-lg text-[#1A2B3B]">
                                ₹{Number(productAmount).toLocaleString()}
                              </span>
                            </div>

                            {/* Expandable Details Section */}
                            {hasDetails && isExpanded && (
                              <div className="px-4 pb-4 pt-2 border-t border-gray-100 bg-gray-50/50">
                                {renderProductDetails(prod)}
                              </div>
                            )}
                          </div>
                        );
                      })
                    ) : (
                      <p className="col-span-full text-center py-8 text-gray-400 italic text-sm">No service breakdown available.</p>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </PageWrapper>
  );
}