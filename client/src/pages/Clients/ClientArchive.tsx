import { PageWrapper } from "@/layout/PageWrapper";
import { DataTable } from "@/components/table/DataTable";
import { TableToolbar } from "@/components/table/TableToolbar";
import { TableActions } from "@/components/table/TableActions";
import { clientService, Client } from "@/services/clientService";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Archive, ArrowLeft, Filter, Download, Loader2 } from "lucide-react";
import { useLocation } from "wouter";
import { useState, useMemo, useEffect } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { exportClientsToPDF } from "@/utils/pdfExport";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { FileSpreadsheet, FileText } from "lucide-react";
import { exportClientsToExcel } from "@/utils/excelExport";
import { useAuth } from "@/context/auth-context";
import { getLatestStageFromPayments } from "@/utils/stageUtils";
import { useToast } from "@/hooks/use-toast";
import { useSocket } from "@/context/socket-context";
import api from "@/lib/api";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

// Helper to get initials
const getInitials = (name: string) => {
  return name.split(' ').map((n: string) => n[0]).join('').toUpperCase();
};

// Helper to parse DD-MM-YYYY enrollment dates (same logic as ClientList.tsx)
const parseEnrollmentDate = (dateString: string): Date | null => {
  if (!dateString || dateString.trim() === '') {
    return null;
  }

  // Try to parse DD-MM-YYYY format (e.g., "19-01-2026")
  const ddMMyyyyPattern = /^(\d{2})-(\d{2})-(\d{4})$/;
  const match = dateString.match(ddMMyyyyPattern);

  if (match) {
    const day = parseInt(match[1], 10);
    const month = parseInt(match[2], 10) - 1; // Month is 0-indexed in Date
    const year = parseInt(match[3], 10);

    const date = new Date(year, month, day);

    // Validate the date is correct (handles invalid dates like 32-01-2026)
    if (date.getFullYear() === year && date.getMonth() === month && date.getDate() === day) {
      return date;
    }
  }

  // Fallback to standard Date parsing (for other formats like YYYY-MM-DD)
  const date = new Date(dateString);
  if (!isNaN(date.getTime())) {
    return date;
  }

  return null;
};

// Helper to get role badge info
const getRoleBadge = (role: string | undefined) => {
  if (!role) return null;

  const roleLower = role.toLowerCase().trim();

  // Manager variations
  if (roleLower === 'manager' || roleLower === 'managers') {
    return {
      label: 'Manager',
      className: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800'
    };
  }

  // Counsellor variations (UK and US spelling)
  if (roleLower === 'counsellor' || roleLower === 'counselor' || roleLower === 'counsellors' || roleLower === 'counselors') {
    return {
      label: 'Counsellor',
      className: 'bg-green-50 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-300 dark:border-green-800'
    };
  }

  // Admin variations
  if (roleLower === 'admin' || roleLower === 'superadmin' || roleLower === 'super_admin' || roleLower === 'administrator') {
    return {
      label: 'Admin',
      className: 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-900/30 dark:text-purple-300 dark:border-purple-800'
    };
  }

  return null;
};

const ARCHIVE_PAGE_EXPANDED_KEY = "archive-page-expanded-ids";

// Redirect counsellor to their own archive page (same logic as All Clients – counsellor sees only their data)
function CounsellorArchiveRedirect({ id, role }: { id: number; role: string }) {
  const [, setLocation] = useLocation();
  useEffect(() => {
    setLocation(`/clients/archive/counsellor/${id}?role=${encodeURIComponent(role)}`);
  }, [id, role, setLocation]);
  return (
    <PageWrapper title="Archived Clients" breadcrumbs={[{ label: "Clients", href: "/clients" }, { label: "Archive" }]}>
      <div className="flex items-center justify-center py-24">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        <p className="ml-2 text-muted-foreground">Loading...</p>
      </div>
    </PageWrapper>
  );
}

export default function ClientArchive() {
  const { user } = useAuth();
  const { socket, isConnected } = useSocket();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [salesTypeFilter, setSalesTypeFilter] = useState("all");
  const [counsellorFilter, setCounsellorFilter] = useState("all");
  const [paymentStatusFilter, setPaymentStatusFilter] = useState("all");

  // Persist which accordions are expanded so they stay open when returning from view/edit
  const [expandedIds, setExpandedIds] = useState<string[]>(() => {
    if (typeof window === "undefined") return [];
    try {
      const saved = sessionStorage.getItem(ARCHIVE_PAGE_EXPANDED_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        return Array.isArray(parsed) ? parsed : [];
      }
    } catch {}
    return [];
  });

  const [saleTypeMap, setSaleTypeMap] = useState<Record<number, string>>({});
  const [counsellorsList, setCounsellorsList] = useState<any[]>([]);
  const [usersDetailsList, setUsersDetailsList] = useState<any[]>([]);

  // State for unarchive functionality
  const [clientToUnarchive, setClientToUnarchive] = useState<Client | null>(null);
  const [showUnarchiveConfirm, setShowUnarchiveConfirm] = useState(false);
  const [isUnarchiving, setIsUnarchiving] = useState(false);

  // Determine user role
  const isCounsellor = user?.role === 'counsellor';
  const isManager = user?.role === 'manager';
  const isSupervisor = isManager && user?.isSupervisor === true;
  const canSeeAllUsers = isSupervisor || user?.role === 'superadmin' || (user as any)?.role === 'admin' || user?.role === 'director' || user?.role === 'manager';

  const counsellorId = useMemo(() => {
    if (!isCounsellor || !user) return null;
    const id = user.id ?? (user as any).userId ?? (user as any).user_id;
    const num = typeof id === "number" ? id : parseInt(String(id), 10);
    return Number.isNaN(num) ? null : num;
  }, [isCounsellor, user]);

  const { data: clientsRaw, isLoading, error } = useQuery({
    queryKey: ['archived-clients', isCounsellor ? counsellorId : null, user?.role],
    queryFn: isCounsellor && counsellorId != null
      ? () => clientService.getArchivedClientsByCounsellor(counsellorId, user?.role || "counsellor")
      : clientService.getArchivedClients,
    staleTime: 1000 * 60 * 5,
    enabled: !!user && isCounsellor && counsellorId != null,
  });

  useEffect(() => {
    const fetchSaleTypes = async () => {
      try {
        const res = await api.get("/api/sale-types");
        const saleTypes = res.data.data || [];
        const map: Record<number, string> = {};
        saleTypes.forEach((st: any) => {
          if (st.saleTypeId && st.saleType) {
            map[st.saleTypeId] = st.saleType;
          }
        });
        setSaleTypeMap(map);
      } catch (err) {
        console.error("Failed to fetch sale types for mapping:", err);
      }
    };
    fetchSaleTypes();
  }, []);

  // Load counsellors list for role matching (for admin/manager)
  useEffect(() => {
    if (!isCounsellor) {
      const loadCounsellors = async () => {
        const data = await clientService.getCounsellors();
        setCounsellorsList(data);
      };
      loadCounsellors();
    }
  }, [isCounsellor]);

  // GET /api/users/users/details for admin and manager (same as All Clients page)
  const isAdminOrManager =
    user?.role === "superadmin" || (user as any)?.role === "admin" || user?.role === "director" || user?.role === "manager";
  useEffect(() => {
    if (isAdminOrManager) {
      clientService.getUsersDetails().then((data) => setUsersDetailsList(data || [])).catch(() => setUsersDetailsList([]));
    } else {
      setUsersDetailsList([]);
    }
  }, [isAdminOrManager]);

  // Counsellor: redirect to own archive page (same logic as All Clients – no user list)
  if (isCounsellor && user && counsellorId != null && !Number.isNaN(counsellorId)) {
    return <CounsellorArchiveRedirect id={counsellorId} role={user?.role || "counsellor"} />;
  }

  // WebSocket listeners for archived clients
  useEffect(() => {
    if (!socket || !isConnected) {
      console.log('[ClientArchive] Socket not available, skipping socket listeners');
      return;
    }


    // Listen for archived-clients:fetched event (when archived clients are fetched)
    const handleArchivedClientsFetched = (data: {
      clients: any[];
      timestamp?: string;
    }) => {
      console.log('[ClientArchive] Received archived-clients:fetched event:', data);

      if (data.clients) {
        queryClient.setQueryData(['archived-clients'], data.clients);
        console.log('[ClientArchive] ✅ Updated archived-clients cache with', data.clients.length, 'clients');
      }
    };

    // Listen for archived-clients:updated event (when archived list is updated)
    const handleArchivedClientsUpdated = (data: {
      clients: any; // Can be array (counsellor) or nested object (admin/manager)
      timestamp?: string;
    }) => {

      if (data.clients) {
        // Update cache with the new data structure (handles both array and nested object)
        // Use function updater to ensure React Query detects the change
        queryClient.setQueryData(['archived-clients'], (oldData: any) => {
          // Return new reference to ensure React Query detects the change
          return data.clients;
        });

        // Force React Query to recognize the update
        // Invalidate will mark as stale and trigger re-render, but won't refetch if data is fresh
        queryClient.invalidateQueries({ queryKey: ['archived-clients'] });

        if (Array.isArray(data.clients)) {
          console.log('[ClientArchive] ✅ Updated archived-clients cache with', data.clients.length, 'clients (array)');
        } else {
          const keys = Object.keys(data.clients);
          console.log('[ClientArchive] ✅ Updated archived-clients cache with', keys.length, 'counsellors (nested structure)');
        }

        // Verify the update
        const cachedData = queryClient.getQueryData(['archived-clients']);
        console.log('[ClientArchive] ✅ Verified cache update - cached data exists:', !!cachedData);

        toast({
          title: "Archived Clients Updated",
          description: "The archived clients list has been updated.",
        });
      } else {
        console.warn('[ClientArchive] ⚠️ archived-clients:updated event received but data.clients is missing');
      }
    };

    // Listen for client:archived event (when a client is archived)
    const handleClientArchived = (data: {
      action: "ARCHIVED";
      client: any;
      clients?: any;
      allClients?: any;
    }) => {
      console.log('[ClientArchive] Received client:archived event:', data);
      console.log('[ClientArchive] Event data structure:', {
        hasClient: !!data.client,
        hasClients: !!data.clients,
        hasAllClients: !!data.allClients,
        clientsType: typeof data.clients,
        clientsIsArray: Array.isArray(data.clients)
      });

      // The backend emits 'archived-clients:updated' event after archiving with the full updated list
      // We should rely on that event for instant updates. However, if the event includes
      // the updated archived clients list, use it directly for instant update
      if (data.clients || data.allClients) {
        // Backend sent updated archived clients list in the event
        const updatedList = data.allClients || data.clients;
        queryClient.setQueryData(['archived-clients'], (oldData: any) => {
          // Return new reference to ensure React Query detects the change
          return updatedList;
        });
        console.log('[ClientArchive] ✅ Updated archived-clients cache from client:archived event');

        // Show toast
        toast({
          title: "Client Archived",
          description: `${data.client?.fullName || data.client?.name || 'A client'} has been archived.`,
        });
      } else {
        // If backend didn't send updated list, invalidate to refetch
        // This ensures we get the latest data even if WebSocket event is delayed
        console.log('[ClientArchive] No updated list in event, invalidating query to refetch');
        queryClient.invalidateQueries({ queryKey: ['archived-clients'] });

        toast({
          title: "Client Archived",
          description: `${data.client?.fullName || data.client?.name || 'A client'} has been archived. Refreshing list...`,
        });
      }
    };

    // Listen for client:unarchived event (when a client is unarchived)
    const handleClientUnarchived = (data: {
      action: "UNARCHIVED";
      client: any;
      clients?: any;
      allClients?: any;
    }) => {
      console.log('[ClientArchive] Received client:unarchived event:', data);

      // The backend emits archived-clients:updated after unarchiving with the updated list
      // So we should invalidate the query to refetch the updated archived clients list
      // This ensures we get the correct structure (nested for admin/manager, array for counsellor)
      queryClient.invalidateQueries({ queryKey: ['archived-clients'] });
      console.log('[ClientArchive] ✅ Invalidated archived-clients query (will refetch updated list)');

      toast({
        title: "Client Unarchived",
        description: `${data.client?.fullName || data.client?.name || 'A client'} has been unarchived.`,
      });
    };

    // Register event listeners
    console.log('🟢 [ClientArchive] Registering socket event listeners...');
    socket.on('archived-clients:fetched', handleArchivedClientsFetched);
    socket.on('archived-clients:updated', handleArchivedClientsUpdated);
    socket.on('client:archived', handleClientArchived);
    socket.on('client:unarchived', handleClientUnarchived);

    console.log('✅ [ClientArchive] Socket event listeners registered for:', {
      socketId: socket.id,
      connected: socket.connected,
      events: ['archived-clients:fetched', 'archived-clients:updated', 'client:archived', 'client:unarchived']
    });

    // Cleanup on unmount
    return () => {
      console.log('[ClientArchive] Cleaning up socket event listeners');
      socket.off('archived-clients:fetched', handleArchivedClientsFetched);
      socket.off('archived-clients:updated', handleArchivedClientsUpdated);
      socket.off('client:archived', handleClientArchived);
      socket.off('client:unarchived', handleClientUnarchived);
    };
  }, [socket, isConnected, queryClient, toast]);

  // Debug logging for archived clients data
  useEffect(() => {
    console.log('[ClientArchive] clientsRaw data:', clientsRaw);
    console.log('[ClientArchive] clientsRaw type:', typeof clientsRaw);
    console.log('[ClientArchive] clientsRaw isArray:', Array.isArray(clientsRaw));
    if (clientsRaw && typeof clientsRaw === 'object') {
      console.log('[ClientArchive] clientsRaw keys:', Object.keys(clientsRaw));
    }
    if (error) {
      console.error('[ClientArchive] Error fetching archived clients:', error);
    }
  }, [clientsRaw, error]);

  const clients = useMemo(() => {
    if (!clientsRaw) {
      console.log('[ClientArchive] clientsRaw is undefined/null');
      return undefined;
    }

    // Counsellor view: should be array (already flattened)
    if (isCounsellor) {
      if (Array.isArray(clientsRaw)) {
        console.log('[ClientArchive] Counsellor: clientsRaw is array with length:', clientsRaw.length);
        return clientsRaw;
      }
      // Fallback: try to flatten if it's nested
      if (clientsRaw && typeof clientsRaw === 'object' && !Array.isArray(clientsRaw)) {
        const allClients: any[] = [];
        Object.keys(clientsRaw).forEach(key => {
          const value = (clientsRaw as any)[key];
          if (/^\d{4}$/.test(key) && value && typeof value === 'object' && !Array.isArray(value)) {
            Object.keys(value).forEach(month => {
              const monthData = value[month];
              if (monthData && typeof monthData === 'object' && monthData.clients && Array.isArray(monthData.clients)) {
                allClients.push(...monthData.clients);
              }
            });
          }
        });
        if (allClients.length > 0) {
          console.log('[ClientArchive] Counsellor: Extracted', allClients.length, 'clients from nested structure');
          return allClients;
        }
      }
      return clientsRaw;
    }

    // Admin/Manager view: return counsellor-first structure as-is
    // Structure: { "3": { counsellor: {...}, clients: { "2026": { "Jan": { clients: [...], total: 3 } } } } }
    if (clientsRaw && typeof clientsRaw === 'object' && !Array.isArray(clientsRaw)) {
      const keys = Object.keys(clientsRaw);
      const isCounsellorFirstStructure = keys.some(key => {
        const value = (clientsRaw as any)[key];
        return value && typeof value === 'object' && (value.counsellor || value.clients);
      });

      if (isCounsellorFirstStructure) {
        console.log('[ClientArchive] Admin: Received counsellor-first structure');
        return clientsRaw;
      }
    }

    console.log('[ClientArchive] Returning clientsRaw as-is');
    return clientsRaw;
  }, [clientsRaw, isCounsellor]);

  let transformedClients: Client[] = [];

  try {
    transformedClients = (Array.isArray(clients) ? clients : []).map((client: any) => {
      const clientId = client.id || client.clientId || client.client_id;
      const clientName = client.name || client.fullName || client.full_name || "";
      const enrollmentDate = client.enrollmentDate || client.enrollment_date || client.date || "";

      const counsellorObj = typeof client.counsellor === 'object' ? client.counsellor : null;
      const counsellorName = counsellorObj?.name ||
        (typeof client.counsellor === 'string' ? client.counsellor : '') ||
        client.counsellorName ||
        client.counsellor_name || "";

      let salesType = client.salesType || client.saleType?.saleType || client.sales_type;

      // Check payments array for saleType
      if (!salesType && client.payments && Array.isArray(client.payments) && client.payments.length > 0) {
        const paymentWithSaleType = client.payments.find((p: any) => p.saleType?.saleType);
        if (paymentWithSaleType?.saleType?.saleType) {
          salesType = paymentWithSaleType.saleType.saleType;
        }
      }

      if (!salesType && client.saleTypeId && saleTypeMap[client.saleTypeId]) {
        salesType = saleTypeMap[client.saleTypeId];
      }
      if (!salesType) {
        salesType = "Only Products";
      }

      const totalPayment = client.totalPayment || client.payments?.[0]?.totalPayment || 0;
      const totalReceived = client.payments && Array.isArray(client.payments) && client.payments.length > 0
        ? client.payments.reduce((sum: number, p: any) => sum + Number(p.amount || 0), 0)
        : (client.amountReceived || 0);
      const amountPending = Number(totalPayment) - Number(totalReceived);

      const latestStage = getLatestStageFromPayments(client.payments, client.stage, client.visaSubmitted) || "N/A";

      return {
        id: String(clientId || ""),
        name: clientName,
        enrollmentDate: enrollmentDate,
        counsellor: counsellorName,
        productManager: client.productManager || client.product_manager || "N/A",
        salesType: salesType,
        status: "Dropped" as 'Active' | 'Completed' | 'Pending' | 'Dropped',
        totalPayment: Number(totalPayment) || 0,
        amountReceived: Number(totalReceived) || 0,
        amountPending: Number(amountPending) || 0,
        stage: latestStage,
        ...client
      };
    }).filter(client => {
      return client.id && client.id !== "undefined" && client.id !== "null" && client.id !== "";
    });
  } catch (transformError) {
    console.error("Error transforming clients data:", transformError);
    transformedClients = [];
  }

  // Helper function to transform client data for display (used for admin/manager view)
  const transformClientData = (client: any) => {
    if (!client || typeof client !== 'object') {
      console.warn("[transformClientData] Invalid client data:", client);
      return null;
    }

    try {
      const clientId = client.clientId || client.id || client.client_id;
      const clientName = client.fullName || client.name || client.full_name || "";
      const enrollmentDate = client.enrollmentDate || client.enrollment_date || client.date || "";

      let salesType = client.saleType?.saleType || client.salesType || client.sales_type;

      // Check payments array for saleType
      if (!salesType && client.payments && Array.isArray(client.payments) && client.payments.length > 0) {
        const paymentWithSaleType = client.payments.find((p: any) => p.saleType?.saleType);
        if (paymentWithSaleType?.saleType?.saleType) {
          salesType = paymentWithSaleType.saleType.saleType;
        }
      }

      if (!salesType && client.saleTypeId && saleTypeMap[client.saleTypeId]) {
        salesType = saleTypeMap[client.saleTypeId];
      }
      if (!salesType) {
        salesType = "Only Products";
      }

      const totalPayment = Number(client.payments?.[0]?.totalPayment || client.totalPayment || 0) || 0;
      const totalReceived = client.payments && Array.isArray(client.payments) && client.payments.length > 0
        ? client.payments.reduce((sum: number, p: any) => sum + Number(p.amount || 0), 0)
        : Number(client.payments?.[0]?.amount || client.amountReceived || 0) || 0;
      const amountPending = Math.max(0, totalPayment - totalReceived);

      const latestStage = getLatestStageFromPayments(client.payments, client.stage, client.visaSubmitted) || "N/A";

      // Ensure we have a valid ID
      if (!clientId) {
        console.warn("[transformClientData] Missing clientId for client:", client);
        return null;
      }

      // Build transformed object with original client data spread first, then override with transformed fields
      return {
        ...client,
        // Override with transformed fields to ensure consistency
        id: String(clientId),
        name: clientName || "Unknown",
        enrollmentDate: enrollmentDate || "N/A",
        salesType: salesType,
        totalPayment: totalPayment,
        amountReceived: totalReceived,
        amountPending: amountPending,
        stage: latestStage,
        status: "Dropped" as 'Active' | 'Completed' | 'Pending' | 'Dropped',
        productManager: client.productManager || client.product_manager || "N/A",
        counsellor: client.counsellor?.name || client.counsellorName || "",
      };
    } catch (error) {
      console.error("[transformClientData] Error transforming client:", error, client);
      return null;
    }
  };

  const matchesFilters = (client: any) => {
    const clientName = (client.name || client.fullName || "").toLowerCase();
    const clientCounsellorObj = typeof client.counsellor === 'object' ? client.counsellor : null;
    const clientCounsellorName = (
      (clientCounsellorObj?.name) ||
      (typeof client.counsellor === 'string' ? client.counsellor : '') ||
      client.counsellorName ||
      ""
    ).toLowerCase();
    const searchLower = search.toLowerCase();

    const matchesSearch = searchLower === "" || clientName.includes(searchLower) || clientCounsellorName.includes(searchLower);

    let clientSalesType = client.salesType || client.saleType?.saleType || "";
    if (!clientSalesType && client.saleTypeId && saleTypeMap[client.saleTypeId]) {
      clientSalesType = saleTypeMap[client.saleTypeId];
    }
    const matchesSalesType = salesTypeFilter === "all" || clientSalesType === salesTypeFilter;

    const matchesCounsellor = counsellorFilter === "all" || clientCounsellorName === counsellorFilter.toLowerCase();

    let matchesPaymentStatus = true;
    if (paymentStatusFilter === "fully_paid") {
      const pending = client.amountPending || (Number(client.totalPayment || 0) - Number(client.amountReceived || 0));
      matchesPaymentStatus = pending === 0;
    } else if (paymentStatusFilter === "has_pending") {
      const pending = client.amountPending || (Number(client.totalPayment || 0) - Number(client.amountReceived || 0));
      matchesPaymentStatus = pending > 0;
    }

    return matchesSearch && matchesSalesType && matchesCounsellor && matchesPaymentStatus;
  };

  const filteredClients = transformedClients.filter((client) => matchesFilters(client));

  // Group clients by year/month for counsellor view (same logic as ClientList.tsx)
  const groupedByYearMonth = useMemo(() => {
    if (!isCounsellor) return { yearMonthGrouped: {}, invalidDateClients: [] };

    const yearMonthGrouped: Record<string, Record<string, Client[]>> = {};
    const invalidDateClients: Client[] = [];

    filteredClients.forEach(client => {
      // Validate enrollmentDate before parsing
      if (!client.enrollmentDate || client.enrollmentDate.trim() === '') {
        invalidDateClients.push(client);
        return;
      }

      // Parse date using helper function (handles DD-MM-YYYY format)
      const date = parseEnrollmentDate(client.enrollmentDate);

      // Check if date is valid
      if (!date || isNaN(date.getTime())) {
        invalidDateClients.push(client);
        return;
      }

      const year = date.getFullYear().toString();
      const month = date.toLocaleString('default', { month: 'long' });

      // Validate year and month are valid
      if (year === 'NaN' || month === 'Invalid Date' || !year || !month) {
        invalidDateClients.push(client);
        return;
      }

      if (!yearMonthGrouped[year]) {
        yearMonthGrouped[year] = {};
      }
      if (!yearMonthGrouped[year][month]) {
        yearMonthGrouped[year][month] = [];
      }
      yearMonthGrouped[year][month].push(client);
    });

    return { yearMonthGrouped, invalidDateClients };
  }, [filteredClients, isCounsellor]);

  const counsellors = useMemo(() => {
    const unique = new Set<string>();
    transformedClients.forEach(client => {
      let counsellorName = "";
      if (typeof client.counsellor === 'object' && client.counsellor !== null) {
        const counsellorObj = client.counsellor as { name?: string };
        counsellorName = counsellorObj?.name || "";
      } else if (typeof client.counsellor === 'string') {
        counsellorName = client.counsellor;
      } else {
        counsellorName = (client as any).counsellorName || "";
      }
      if (counsellorName) unique.add(counsellorName);
    });
    return Array.from(unique).sort();
  }, [transformedClients]);

  const salesTypes = useMemo(() => {
    const unique = new Set<string>();
    transformedClients.forEach(client => {
      const salesType = client.salesType || "";
      if (salesType) unique.add(salesType);
    });
    return Array.from(unique).sort();
  }, [transformedClients]);

  const getAllDisplayedClientsWithDetails = () => {
    // Counsellor view: filteredClients is already built from the array with filters applied
    if (isCounsellor) {
      return filteredClients.map((client) => {
        const originalClient = (Array.isArray(clients) ? clients : []).find((c: any) =>
          String(c.id || c.clientId) === String(client.id)
        );
        return {
          ...client,
          payments: originalClient?.payments || [],
          productPayments: originalClient?.productPayments || [],
          rawClient: originalClient,
        } as Client & { payments?: any[], productPayments?: any[], rawClient?: any };
      });
    }

    // Admin/Manager view: iterate nested structure (counsellor → year → month → clients)
    // and apply the same active filters so only visible clients are exported
    const result: Array<Client & { payments?: any[], productPayments?: any[], rawClient?: any }> = [];

    if (!clients || typeof clients !== 'object' || Array.isArray(clients)) {
      return result;
    }

    Object.values(clients).forEach((counsellorData: any) => {
      const counsellorClientsData = counsellorData?.clients || {};

      Object.values(counsellorClientsData).forEach((yearData: any) => {
        if (!yearData || typeof yearData !== 'object') return;

        Object.values(yearData).forEach((monthData: any) => {
          if (!monthData?.clients || !Array.isArray(monthData.clients)) return;

          monthData.clients.forEach((rawClient: any) => {
            // Build a normalized client object (same as transformClientData) for filter matching
            const transformed = transformClientData(rawClient);
            if (!transformed) return;

            // Apply active search + filters (same logic as the rendered table)
            const clientName = (transformed.name || "").toLowerCase();
            const searchLower = search.toLowerCase();
            const matchesSearch = searchLower === "" || clientName.includes(searchLower);

            const clientSalesType = transformed.salesType || "";
            const matchesSalesType = salesTypeFilter === "all" || clientSalesType === salesTypeFilter;

            const counsellorName = (
              (typeof rawClient.counsellor === 'object' ? rawClient.counsellor?.name : rawClient.counsellor) ||
              rawClient.counsellorName || ""
            ).toLowerCase();
            const matchesCounsellor = counsellorFilter === "all" ||
              counsellorName === counsellorFilter.toLowerCase();

            let matchesPaymentStatus = true;
            if (paymentStatusFilter === "fully_paid") {
              matchesPaymentStatus = (transformed.amountPending || 0) === 0;
            } else if (paymentStatusFilter === "has_pending") {
              matchesPaymentStatus = (transformed.amountPending || 0) > 0;
            }

            if (matchesSearch && matchesSalesType && matchesCounsellor && matchesPaymentStatus) {
              result.push({
                ...transformed,
                payments: Array.isArray(rawClient.payments) ? rawClient.payments : [],
                productPayments: Array.isArray(rawClient.productPayments) ? rawClient.productPayments : [],
                rawClient,
              } as Client & { payments?: any[], productPayments?: any[], rawClient?: any });
            }
          });
        });
      });
    });

    return result;
  };

  const handleExportExcel = () => {
    const allClients = getAllDisplayedClientsWithDetails();
    if (!allClients || allClients.length === 0) {
      toast({
        variant: "destructive",
        title: "No Data to Export",
        description: "No archived clients found to export.",
      });
      return;
    }
    try {
      exportClientsToExcel(allClients);
      toast({
        title: "Excel Exported",
        description: "Archived clients Excel has been downloaded successfully.",
      });
    } catch (error) {
      console.error("Error exporting Excel:", error);
      toast({
        variant: "destructive",
        title: "Export Failed",
        description: "Failed to export Excel. Please try again.",
      });
    }
  };

  const handleExportPDF = async () => {
    const allClients = getAllDisplayedClientsWithDetails();
    if (!allClients || allClients.length === 0) {
      toast({
        variant: "destructive",
        title: "No Data to Export",
        description: "No archived clients found to export.",
      });
      return;
    }
    try {
      await exportClientsToPDF(allClients);
      toast({
        title: "PDF Exported",
        description: "Archived clients PDF has been downloaded successfully.",
      });
    } catch (error) {
      console.error("Error generating PDF:", error);
      toast({
        variant: "destructive",
        title: "Export Failed",
        description: "Failed to generate PDF. Please try again.",
      });
    }
  };

  const handleClearFilters = () => {
    setSalesTypeFilter("all");
    setCounsellorFilter("all");
    setPaymentStatusFilter("all");
  };

  const persistExpanded = (next: string[]) => {
    try {
      sessionStorage.setItem(ARCHIVE_PAGE_EXPANDED_KEY, JSON.stringify(next));
    } catch {}
  };

  const handleUnarchive = async () => {
    if (!clientToUnarchive) return;

    setIsUnarchiving(true);
    try {
      const clientId = Number(clientToUnarchive.id);
      if (!Number.isFinite(clientId) || clientId <= 0) {
        throw new Error("Invalid client ID");
      }

      // Call unarchive API (archived: false)
      await clientService.archiveClient(clientId, false);

      // Show success toast
      toast({
        title: "Client Unarchived",
        description: `${clientToUnarchive.name} has been unarchived successfully.`,
      });

      // Close dialog first
      setShowUnarchiveConfirm(false);
      setClientToUnarchive(null);

      // The WebSocket event 'archived-clients:updated' will update the cache instantly
      // If WebSocket is not available, invalidate as fallback
      if (!socket || !isConnected) {
        queryClient.invalidateQueries({ queryKey: ['archived-clients'] });
        queryClient.invalidateQueries({ queryKey: ['clients'] });
      }
    } catch (error: any) {
      console.error("Error unarchiving client:", error);
      const errorMessage = error.response?.data?.message || error.message || "Failed to unarchive client";
      toast({
        variant: "destructive",
        title: "Unarchive Failed",
        description: errorMessage,
      });
    } finally {
      setIsUnarchiving(false);
    }
  };

  const isFilterActive = salesTypeFilter !== "all" || (!isCounsellor && counsellorFilter !== "all") || paymentStatusFilter !== "all";

  const columns = [
    {
      header: "Sr No",
      cell: (_: any, index: number) => (
        <span className="text-slate-400 font-mono text-xs">{String(index + 1).padStart(2, '0')}</span>
      ),
      className: "w-[60px]"
    },
    {
      header: "Name",
      accessorKey: "name",
      className: "font-semibold text-slate-900"
    },
    {
      header: "Sales Type",
      cell: (s: any) => (
        <Badge variant="outline" className="font-normal whitespace-nowrap bg-slate-50 text-slate-600 border-slate-200">
          {s.salesType}
        </Badge>
      )
    },
    {
      header: "Enrollment Date",
      accessorKey: "enrollmentDate",
      className: "whitespace-nowrap text-slate-500"
    },
    {
      header: "Total Payment",
      cell: (s: any) => `₹${(s.totalPayment || 0).toLocaleString()}`
    },
    {
      header: "Received",
      cell: (s: any) => (
        <span className="text-emerald-600 font-medium">
          ₹{(s.amountReceived || 0).toLocaleString()}
        </span>
      )
    },
    {
      header: "Stage",
      cell: (s: any) => {
        const stage: string = s.stage || 'N/A';

        // If stage is N/A, show it with gray styling
        if (stage === 'N/A') {
          return (
            <Badge variant="outline" className="font-medium whitespace-nowrap bg-gray-50 text-gray-500 border-gray-200 dark:bg-gray-900/30 dark:text-gray-400 dark:border-gray-800">
              N/A
            </Badge>
          );
        }

        let badgeClass = "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800";

        if (stage === 'Financial') badgeClass = "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-900/30 dark:text-purple-300 dark:border-purple-800";
        if (stage === 'Before Visa') badgeClass = "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-800";
        if (stage === 'After Visa' || stage === 'After Visa Payment') badgeClass = "bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-900/30 dark:text-indigo-300 dark:border-indigo-800";
        if (stage === 'Submitted Visa' || stage === 'Visa Submitted') badgeClass = "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-800";

        // Normalize display name
        const displayStage = stage === 'After Visa Payment' ? 'After Visa' :
                            stage === 'Visa Submitted' ? 'Submitted Visa' : stage;

        return (
          <Badge variant="outline" className={`font-medium whitespace-nowrap ${badgeClass}`}>
            {displayStage}
          </Badge>
        );
      }
    },
    {
      header: "Pending",
      cell: (s: any) => (
        <span className={(s.amountPending || 0) > 0 ? "text-amber-600 font-medium" : "text-slate-400"}>
          ₹{(s.amountPending || 0).toLocaleString()}
        </span>
      )
    },
    // Removed Counsellor column since it's now grouped
    {
      header: "Actions",
      cell: (s: any) => (
        <TableActions
          onView={() => setLocation(`/clients/${s.id}/view`)}
          onEdit={() => setLocation(`/clients/${s.id}/edit`)}
          onDelete={() => {
            setClientToUnarchive(s);
            setShowUnarchiveConfirm(true);
          }}
          deleteLabel="Unarchive"
        />
      )
    },
  ];

  // Admin/Manager: show same user list as All Clients; click user → that user's archive list
  if (!isCounsellor) {
    const userId = user?.id ?? (user as any)?.userId ?? (user as any)?.user_id;
    const userNum = typeof userId === "number" ? userId : parseInt(String(userId), 10);
    const hasValidUserNum = !Number.isNaN(userNum) && userNum > 0;
    const listToShow =
      canSeeAllUsers || !hasValidUserNum
        ? usersDetailsList
        : usersDetailsList.filter((u: any) => u.managerId === userNum || u.id === userNum);

    return (
      <PageWrapper
        title="Archived Clients"
        breadcrumbs={[{ label: "Clients", href: "/clients" }, { label: "Archive" }]}
      >
        <div className="space-y-6">
          <p className="text-muted-foreground text-sm">
            {canSeeAllUsers
              ? "Select a user to view their archived clients."
              : "Select a user from your team to view their archived clients."}
          </p>
          <div className="bg-card rounded-xl border border-border/50 shadow-sm overflow-hidden">
            <div className="divide-y divide-border/50">
              {usersDetailsList.length === 0 ? (
                <div className="py-12 text-center text-muted-foreground text-sm">
                  Loading users...
                </div>
              ) : listToShow.length === 0 ? (
                <div className="py-12 text-center text-muted-foreground text-sm">
                  No users to show.
                </div>
              ) : (
                listToShow.map((u: any) => {
                  const uId = u.id ?? u.userId ?? u.user_id;
                  const uRole = u.role || u.userRole || u.roleName || "counsellor";
                  const uName = u.fullName || u.name || u.full_name || `User #${uId}`;
                  const roleBadge = getRoleBadge(uRole);
                  const managerName = u.manager?.fullName || u.manager?.name || "";
                  const path = `/clients/archive/counsellor/${uId}?role=${encodeURIComponent(String(uRole))}`;
                  return (
                    <div
                      key={String(uId)}
                      role="button"
                      tabIndex={0}
                      onClick={() => setLocation(path)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          setLocation(path);
                        }
                      }}
                      className="flex items-center gap-3 px-6 py-4 hover:bg-muted/30 transition-colors cursor-pointer"
                    >
                      <Avatar className="h-10 w-10 border border-border">
                        <AvatarFallback className="bg-primary/10 text-primary text-sm font-bold">
                          {getInitials(uName)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <span className="font-semibold text-foreground">{uName}</span>
                        {roleBadge && (
                          <Badge variant="outline" className={`ml-2 font-medium ${roleBadge.className}`}>
                            {roleBadge.label}
                          </Badge>
                        )}
                        {u.designation && (
                          <span className="ml-2 text-xs text-muted-foreground">({u.designation})</span>
                        )}
                        {managerName && (
                          <p className="text-xs text-muted-foreground mt-0.5">Manager: {managerName}</p>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </PageWrapper>
    );
  }

  if (isLoading) {
    return (
      <PageWrapper title="Archived Clients" breadcrumbs={[{ label: "Clients", href: "/clients" }, { label: "Archive" }]}>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading archived clients...</p>
          </div>
        </div>
      </PageWrapper>
    );
  }

  if (error) {
    return (
      <PageWrapper title="Archived Clients" breadcrumbs={[{ label: "Clients", href: "/clients" }, { label: "Archive" }]}>
        <div className="text-center py-12">
          <p className="text-destructive">Error loading archived clients. Please try again.</p>
        </div>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper
      title="Archived Clients"
      breadcrumbs={[
        { label: "Clients", href: "/clients" },
        { label: "Archive" }
      ]}
      actions={
        <div className="flex gap-3">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="bg-card border-border/50 shadow-sm hover:bg-muted/50 text-foreground">
                <Download className="w-4 h-4 mr-2" />
                Export
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={handleExportExcel}>
                <FileSpreadsheet className="w-4 h-4 mr-2" />
                Export as Excel
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleExportPDF}>
                <FileText className="w-4 h-4 mr-2" />
                Export as PDF
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      }
    >
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-card p-4 rounded-xl border border-border/50 shadow-sm">
          <TableToolbar
            searchPlaceholder="Search archived clients..."
            onSearch={setSearch}
            className="w-full sm:w-auto flex-1"
          />

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className={`border-border/50 ${isFilterActive ? 'bg-primary/5 border-primary/20 text-primary' : 'bg-card hover:bg-muted/50'}`}>
                  <Filter className="w-4 h-4 mr-2" />
                  Filters
                  {isFilterActive && <span className="ml-1.5 h-2 w-2 rounded-full bg-primary" />}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-80 p-4 bg-card border-border" align="end">
                <div className="space-y-4">
                  <h4 className="font-semibold text-sm text-foreground">Filter Archived Clients</h4>
                  <div className="space-y-2">
                    <label className="text-xs font-medium text-muted-foreground">Sales Type</label>
                    <Select value={salesTypeFilter} onValueChange={setSalesTypeFilter}>
                      <SelectTrigger className="h-9 bg-background border-border">
                        <SelectValue placeholder="All Types" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Sales Types</SelectItem>
                        {salesTypes.map(type => (
                          <SelectItem key={type} value={type}>{type}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Hide counsellor filter for counsellors since API already returns only their clients */}
                  {!isCounsellor && (
                    <div className="space-y-2">
                      <label className="text-xs font-medium text-muted-foreground">Counsellor</label>
                      <Select value={counsellorFilter} onValueChange={setCounsellorFilter}>
                        <SelectTrigger className="h-9 bg-background border-border">
                          <SelectValue placeholder="All Counsellors" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Counsellors</SelectItem>
                          {counsellors.map(c => (
                            <SelectItem key={c} value={c}>{c}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  <div className="space-y-2">
                    <label className="text-xs font-medium text-muted-foreground">Payment Status</label>
                    <Select value={paymentStatusFilter} onValueChange={setPaymentStatusFilter}>
                      <SelectTrigger className="h-9 bg-background border-border">
                        <SelectValue placeholder="All Status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Status</SelectItem>
                        <SelectItem value="fully_paid">Fully Paid</SelectItem>
                        <SelectItem value="has_pending">Has Pending</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {isFilterActive && (
                    <Button
                      variant="ghost"
                      onClick={handleClearFilters}
                      className="w-full text-destructive hover:text-destructive hover:bg-destructive/10 h-9"
                    >
                      Clear Filters
                    </Button>
                  )}
                </div>
              </PopoverContent>
            </Popover>
          </div>
        </div>

        {/* Grouped Client List */}
        {/* <div className="bg-card rounded-xl border border-border/50 shadow-sm overflow-hidden"> */}
        <div className="">
          <Accordion
            type="multiple"
            className="w-full"
            value={expandedIds.filter(v => !v.includes('-') || v === 'invalid-dates')}
            onValueChange={(topValues) => {
              // Keep all sub-level values (year, month), replace only top-level (year for counsellor, counsellorId for admin)
              const rest = expandedIds.filter(v => v.includes('-') && v !== 'invalid-dates');
              const updated = [...topValues, ...rest];
              setExpandedIds(updated);
              persistExpanded(updated);
            }}
          >
            {isCounsellor ? (
              // For counsellors: Show direct year/month grouping (same logic as ClientList.tsx)
              (() => {
                const { yearMonthGrouped, invalidDateClients } = groupedByYearMonth;
                const years = Object.keys(yearMonthGrouped).sort((a, b) => Number(b) - Number(a));

                const hasInvalidDates = invalidDateClients.length > 0;
                const hasValidClients = years.length > 0;

                if (!hasValidClients && !hasInvalidDates) {
                  return (
                    <div className="text-center py-12 text-muted-foreground text-sm italic">
                      No archived clients found.
                    </div>
                  );
                }

                return (
                  <>
                    {/* Show invalid date clients separately */}
                    {hasInvalidDates && (
                      <AccordionItem value="invalid-dates" key="invalid-dates" className="border border-amber-200 rounded-lg bg-amber-50 overflow-hidden shadow-sm mb-2">
                        <AccordionTrigger className="px-4 py-3 hover:bg-amber-100/50 hover:no-underline">
                          <span className="font-semibold text-base text-amber-800">
                            Invalid Date ({invalidDateClients.length})
                          </span>
                        </AccordionTrigger>
                        <AccordionContent className="p-0">
                          <div className="border-t border-amber-200 p-4 bg-white">
                            <p className="text-sm text-amber-700 mb-3">
                              These clients have invalid or missing enrollment dates. Please update their enrollment dates.
                            </p>
                            <DataTable
                              data={invalidDateClients}
                              columns={columns}
                              onRowClick={(s) => setLocation(`/clients/${s.id}/view`)}
                            />
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    )}

                    {/* Show valid clients grouped by year/month */}
                    {years.map(year => (
                      <AccordionItem value={year} key={year} className="border border-border/50 rounded-lg bg-card overflow-hidden shadow-sm mb-2">
                        <AccordionTrigger className="px-4 py-3 hover:bg-muted/30 hover:no-underline">
                          <span className="font-semibold text-base text-foreground/80">{year}</span>
                        </AccordionTrigger>
                        <AccordionContent className="pb-0">
                          <div className="border-t border-border/50">
                            <Accordion
                              type="multiple"
                              className="w-full"
                              value={expandedIds.filter(v => v.startsWith(`${year}-`))}
                              onValueChange={(monthValues) => {
                                const rest = expandedIds.filter(v => !v.startsWith(`${year}-`));
                                const updated = [...rest, ...monthValues];
                                setExpandedIds(updated);
                                persistExpanded(updated);
                              }}
                            >
                              {Object.keys(yearMonthGrouped[year]).map(month => (
                                <AccordionItem value={`${year}-${month}`} key={month} className="border-b last:border-b-0 border-border/50">
                                  <AccordionTrigger className="px-4 py-2 hover:bg-muted/30 hover:no-underline text-sm font-medium text-muted-foreground">
                                    <div className="flex items-center gap-2">
                                      <span>{month}</span>
                                      <Badge variant="outline" className="text-xs h-5 px-1.5 font-normal">
                                        {yearMonthGrouped[year][month].length}
                                      </Badge>
                                    </div>
                                  </AccordionTrigger>
                                  <AccordionContent className="p-0">
                                    {yearMonthGrouped[year][month] && yearMonthGrouped[year][month].length > 0 ? (
                                      <DataTable
                                        data={yearMonthGrouped[year][month]}
                                        columns={columns}
                                        onRowClick={(s) => {
                                          try {
                                            if (s && s.id) {
                                              persistExpanded(expandedIds);
                                              setLocation(`/clients/${s.id}/view`);
                                            }
                                          } catch (error) {
                                            console.error("Error navigating to client view:", error);
                                          }
                                        }}
                                      />
                                    ) : (
                                      <div className="p-4 text-center text-muted-foreground text-sm">
                                        No clients to display
                                      </div>
                                    )}
                                  </AccordionContent>
                                </AccordionItem>
                              ))}
                            </Accordion>
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    ))}
                  </>
                );
              })()
            ) : (
              // For admin/manager: Show counsellor -> year -> month grouping
              // Structure: { "3": { counsellor: {...}, clients: { "2026": { "Jan": { clients: [...], total: 3 } } } } }
              (() => {
                if (!clients || typeof clients !== 'object' || Array.isArray(clients)) {
                  return (
                    <div className="text-center py-12 text-muted-foreground text-sm italic">
                      No counsellor data available.
                    </div>
                  );
                }

                const counsellorEntries = Object.entries(clients)
                  .filter(([counsellorId, data]: [string, any]) => {
                    // Apply counsellor filter
                    if (counsellorFilter === "all") return true;
                    const counsellorName = data?.counsellor?.name || data?.counsellor?.fullName || "";
                    return counsellorName.toLowerCase() === counsellorFilter.toLowerCase();
                  })
                  .sort(([idA, dataA]: [string, any], [idB, dataB]: [string, any]) => {
                    // Sort by counsellor name
                    const nameA = dataA?.counsellor?.name || dataA?.counsellor?.fullName || "";
                    const nameB = dataB?.counsellor?.name || dataB?.counsellor?.fullName || "";
                    return nameA.localeCompare(nameB);
                  });

                if (counsellorEntries.length === 0) {
                  return (
                    <div className="text-center py-12 text-muted-foreground text-sm italic">
                      No archived clients found.
                    </div>
                  );
                }

                return (
                  <div className="divide-y divide-border/50 rounded-xl border border-border/50 bg-card overflow-hidden">
                    {counsellorEntries.map(([counsellorId, counsellorData]: [string, any]) => {
                      const counsellorInfo = counsellorData?.counsellor || {};
                      const counsellorName = counsellorInfo.name || counsellorInfo.fullName || "Unassigned";
                      let counsellorRole = counsellorInfo.role || counsellorInfo.userRole || counsellorInfo.roleName;
                      if (!counsellorRole && counsellorsList.length > 0) {
                        const matched = counsellorsList.find((c: any) => {
                          const cId = c.id ?? c.userId ?? c.user_id;
                          const cName = (c.name || c.fullName || '').toLowerCase();
                          return (cId && (Number(cId) === Number(counsellorId) || String(cId) === counsellorId)) ||
                            (cName === counsellorName.toLowerCase());
                        });
                        if (matched) counsellorRole = matched.role || matched.userRole || matched.roleName;
                      }
                      const roleBadge = getRoleBadge(counsellorRole);
                      const counsellorClientsData = counsellorData?.clients || {};
                      let totalClientCount = 0;
                      Object.values(counsellorClientsData).forEach((yearData: any) => {
                        if (yearData && typeof yearData === 'object') {
                          Object.values(yearData).forEach((monthData: any) => {
                            if (monthData?.clients && Array.isArray(monthData.clients)) {
                              totalClientCount += monthData.clients.length;
                            }
                          });
                        }
                      });

                      return (
                        <div
                          key={counsellorId}
                          role="button"
                          tabIndex={0}
                          onClick={() => setLocation(`/clients/archive/counsellor/${counsellorId}`)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === " ") {
                              e.preventDefault();
                              setLocation(`/clients/archive/counsellor/${counsellorId}`);
                            }
                          }}
                          className="flex items-center gap-3 px-6 py-4 hover:bg-muted/30 transition-colors cursor-pointer"
                        >
                          <Avatar className="h-10 w-10 border border-border">
                            <AvatarFallback className="bg-primary/10 text-primary text-sm font-bold">
                              {getInitials(counsellorName)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <span className="font-semibold text-foreground">{counsellorName}</span>
                            {roleBadge && (
                              <Badge variant="outline" className={`ml-2 font-medium ${roleBadge.className}`}>
                                {roleBadge.label}
                              </Badge>
                            )}
                          </div>
                          <Badge variant="secondary">{totalClientCount} Archived</Badge>
                        </div>
                      );
                    })}
                  </div>
                );
              })()
            )}
          </Accordion>
        </div>
      </div>

      {/* Unarchive Confirmation Dialog */}
      <AlertDialog open={showUnarchiveConfirm} onOpenChange={setShowUnarchiveConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Unarchive Client</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to unarchive <strong>{clientToUnarchive?.name}</strong>?
              This will restore the client to the active clients list.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex justify-end gap-2 mt-4">
            <AlertDialogCancel disabled={isUnarchiving}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleUnarchive}
              disabled={isUnarchiving}
              className="bg-primary hover:bg-primary/90"
            >
              {isUnarchiving ? (
                <>
                  <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2 inline-block"></span>
                  Unarchiving...
                </>
              ) : (
                "Unarchive"
              )}
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </PageWrapper>
  );
}
