import { PageWrapper } from "@/layout/PageWrapper";
import { DataTable } from "@/components/table/DataTable";
import { TableToolbar } from "@/components/table/TableToolbar";
import { TableActions } from "@/components/table/TableActions";
import { clientService, Client } from "@/services/clientService";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import { useSocket } from "@/context/socket-context";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Plus, Download, X, Filter, ChevronRight, User, Loader2 } from "lucide-react";
import { useLocation } from "wouter";
import { useState, useEffect, useMemo } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { exportClientsToPDF } from "@/utils/pdfExport";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { FileSpreadsheet, FileText } from "lucide-react";
import { exportClientsToExcel } from "@/utils/excelExport";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/context/auth-context";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { getLatestStageFromPayments } from "@/utils/stageUtils";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

// Helper to get initials
const getInitials = (name: string) => {
  return name.split(' ').map((n: string) => n[0]).join('').toUpperCase();
};

// Helper to parse date string (handles DD-MM-YYYY format from API)
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

export default function ClientList() {
  const { user } = useAuth();
  const { socket, isConnected } = useSocket();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  // Status filter removed as per user request
  const [salesTypeFilter, setSalesTypeFilter] = useState("all");
  const [pmFilter, setPmFilter] = useState("all");
  const [counsellorFilter, setCounsellorFilter] = useState("all");
  const [paymentStatusFilter, setPaymentStatusFilter] = useState("all");
  const [clientToDelete, setClientToDelete] = useState<Client | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isArchiving, setIsArchiving] = useState(false);

  // New state to store fetched clients for each counsellor
  const [counsellorDataMap, setCounsellorDataMap] = useState<Record<number, any>>({});
  const [loadingCounsellors, setLoadingCounsellors] = useState<Record<number, boolean>>({});

  // State to store sale type mapping (saleTypeId -> saleType name)
  const [saleTypeMap, setSaleTypeMap] = useState<Record<number, string>>({});
  // State to store all sale types from API (for filter dropdown)
  const [allSaleTypes, setAllSaleTypes] = useState<any[]>([]);

  // Determine which API to use based on user role
  const isCounsellor = user?.role === 'counsellor';
  const isManager = user?.role === 'manager';
  const isSupervisor = isManager && user?.isSupervisor === true;
  // Supervisor managers see all clients (like admin), non-supervisor managers see only their team
  const queryKey = isCounsellor ? ['counsellor-clients'] : ['clients'];
  const queryFn = isCounsellor ? clientService.getCounsellorClients : clientService.getClients;

  const { data: clientsRaw, isLoading, error } = useQuery({
    queryKey: queryKey,
    queryFn: queryFn,
    staleTime: 1000 * 60 * 5, // Cache for 5 minutes
    enabled: !!user, // Only fetch when user is loaded
  });

  // Process data based on user role
  // For counsellors: flatten to array
  // For admin: keep counsellor-first structure
  const clients = useMemo(() => {
    if (!clientsRaw) return undefined;

    // Counsellor view: should be array (already flattened by getCounsellorClients)
    if (isCounsellor) {
      if (Array.isArray(clientsRaw)) {
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
          return allClients;
        }
      }
      return clientsRaw;
    }

    // Admin view: return counsellor-first structure as-is
    // Structure: { "3": { counsellor: {...}, clients: { "2026": { "Jan": { clients: [...], total: 4 } } } } }
    if (clientsRaw && typeof clientsRaw === 'object' && !Array.isArray(clientsRaw)) {
      return clientsRaw;
    }

    return clientsRaw;
  }, [clientsRaw, isCounsellor]);

  // Debug logging
  useEffect(() => {
    if (clients) {
      console.log("Clients data received (after processing):", clients);
      console.log("Is array?", Array.isArray(clients));
      if (Array.isArray(clients)) {
        console.log("Number of clients:", clients.length);
        if (clients.length > 0) {
          console.log("First client sample:", clients[0]);
        }
      }
    }
    if (error) {
      console.error("Error fetching clients:", error);
    }
  }, [clients, error]);

  const [counsellorsList, setCounsellorsList] = useState<any[]>([]);

  useEffect(() => {
    // Only load counsellors list for admin/manager/director (not for counsellors)
    // Supervisor managers see all counsellors, non-supervisor managers see only their assigned counsellors
    if (!isCounsellor) {
    const loadCounsellors = async () => {
      const data = await clientService.getCounsellors();
      // TODO: Backend should filter counsellors for non-supervisor managers
      // For now, frontend receives all counsellors (backend should handle filtering)
      // If manager is not supervisor, backend should return only assigned counsellors
      setCounsellorsList(data);
    };
    loadCounsellors();
    }
  }, [isCounsellor, isSupervisor]);

  // Fetch sale types to create mapping and store full list for filters
  useEffect(() => {
    const fetchSaleTypes = async () => {
      try {
        const res = await api.get("/api/sale-types");
        const saleTypes = res.data.data || [];
        // Store full list for filter dropdown
        setAllSaleTypes(saleTypes);
        // Create mapping (saleTypeId -> saleType name) for transformation
        const mapping: Record<number, string> = {};
        saleTypes.forEach((st: any) => {
          if (st.saleTypeId && st.saleType) {
            mapping[st.saleTypeId] = st.saleType;
          }
        });
        setSaleTypeMap(mapping);
      } catch (err) {
        console.error("Failed to fetch sale types for mapping:", err);
      }
    };
    fetchSaleTypes();
  }, []);

  // Helper function to flatten year/month structure to array (for counsellor WebSocket events)
  const flattenCounsellorClients = (data: any): any[] => {
    if (!data) {
      console.warn('[ClientList] flattenCounsellorClients: data is null/undefined');
      return [];
    }

    if (Array.isArray(data)) {
      return data;
    }

    if (typeof data === 'object' && !Array.isArray(data)) {
      const allClients: any[] = [];

      // Handle nested structure: { "2026": { "Jan": { "clients": [...] } } }
      Object.keys(data).forEach(year => {
        const yearData = data[year];
        if (yearData && typeof yearData === 'object' && !Array.isArray(yearData)) {
          // Iterate through months
          Object.keys(yearData).forEach(month => {
            const monthData = yearData[month];
            if (monthData && typeof monthData === 'object') {
              // Check if it has a clients array
              if (monthData.clients && Array.isArray(monthData.clients)) {
                // Extract clients from this month
                allClients.push(...monthData.clients);
              } else if (Array.isArray(monthData)) {
                // Sometimes the month data might be directly an array
                allClients.push(...monthData);
              }
            }
          });
        } else if (Array.isArray(yearData)) {
          // Sometimes year data might be directly an array
          allClients.push(...yearData);
        }
      });

      if (allClients.length > 0) {
        console.log('[ClientList] Flattened counsellor clients from nested structure:', allClients.length, 'clients');
        return allClients;
      }
    }

    return [];
  };

  // Socket.IO real-time updates
  // Note: If socket events are not received, ClientForm also invalidates cache as fallback
  useEffect(() => {
    if (!socket || !isConnected) {
      console.log('[ClientList] Socket not available, skipping socket listeners');
      console.log('[ClientList] Note: Cache will still be invalidated by ClientForm after client creation');
      return;
    }

    console.log('[ClientList] Setting up socket event listeners for role:', user?.role);

    // Listen for client:created event
    const handleClientCreated = (data: {
      action: "CREATED";
      client: any;
      clients: any; // For counsellor: year/month structure or array. For admin: counsellor-first structure
      allClients?: any; // Full admin list in new structure (if available)
    }) => {
      console.log('🔵 [ClientList] ========== CLIENT:CREATED EVENT RECEIVED ==========');
      console.log('[ClientList] User role:', user?.role, '| isCounsellor:', isCounsellor);
      console.log('[ClientList] Full event data:', JSON.stringify(data, null, 2));
      console.log('[ClientList] data.clients type:', typeof data.clients, '| isArray:', Array.isArray(data.clients));
      console.log('[ClientList] data.clients keys:', data.clients && typeof data.clients === 'object' ? Object.keys(data.clients) : 'N/A');
      console.log('[ClientList] data.allClients exists:', !!data.allClients);

      // Update React Query cache with new clients data
      if (data.clients || data.allClients) {
        if (isCounsellor) {
          console.log('[ClientList] 🔵 Processing as COUNSELLOR...');
          console.log('[ClientList] Raw data.clients structure:', {
            type: typeof data.clients,
            isArray: Array.isArray(data.clients),
            keys: data.clients && typeof data.clients === 'object' ? Object.keys(data.clients) : 'N/A',
            sample: data.clients && typeof data.clients === 'object' ? JSON.stringify(Object.keys(data.clients).slice(0, 2).reduce((acc, key) => ({ ...acc, [key]: data.clients[key] }), {})) : 'N/A'
          });

          // Counsellor: Flatten year/month structure to array if needed
          const flattenedClients = flattenCounsellorClients(data.clients);
          console.log('[ClientList] Flattened clients count:', flattenedClients.length);
          console.log('[ClientList] Flattened clients sample (first 2):', flattenedClients.slice(0, 2).map(c => ({ id: c.clientId || c.id, name: c.fullName || c.name, enrollmentDate: c.enrollmentDate })));

          // Ensure all clients have properly formatted enrollmentDate
          const normalizedClients = flattenedClients.map((client: any) => {
            // Ensure enrollmentDate is properly formatted
            if (client.enrollmentDate) {
              // Use parseEnrollmentDate helper to handle DD-MM-YYYY format
              const date = parseEnrollmentDate(client.enrollmentDate);
              if (date && !isNaN(date.getTime())) {
                return client; // Date is valid
              }
            }
            // If enrollmentDate is missing or invalid, log warning but keep client
            if (!client.enrollmentDate || client.enrollmentDate.trim() === '') {
              console.warn('[ClientList] Socket client missing enrollmentDate:', client.clientId || client.id, client.fullName || client.name);
            } else {
              console.warn('[ClientList] Socket client has invalid enrollmentDate:', client.clientId || client.id, client.fullName || client.name, 'date:', client.enrollmentDate);
            }
            return client; // Return as-is, will be handled in grouping logic
          });

          if (normalizedClients.length === 0) {
            console.warn('[ClientList] ⚠️ Flattened clients array is EMPTY! This might indicate a data structure issue.');
            console.warn('[ClientList] Original data.clients:', JSON.stringify(data.clients, null, 2));
            // Fallback: invalidate and refetch
            queryClient.invalidateQueries({ queryKey: ['counsellor-clients'] });
            console.log('[ClientList] ⚠️ Invalidated cache as fallback (will refetch)');
          } else {
            // Get current cache to compare
            const currentCache = queryClient.getQueryData(['counsellor-clients']);
            const currentCount = Array.isArray(currentCache) ? currentCache.length : 0;
            console.log('[ClientList] Current cache count:', currentCount, '| New count:', normalizedClients.length);

            // Set query data with new array reference (spread to ensure new reference)
            // Use a function updater to ensure React Query detects the change
            queryClient.setQueryData(['counsellor-clients'], (oldData: any) => {
              const oldCount = Array.isArray(oldData) ? oldData.length : 0;
              console.log('[ClientList] setQueryData updater called, oldData length:', oldCount, '| new length:', normalizedClients.length);
              return [...normalizedClients]; // Return normalized clients with validated dates
            });
            console.log('[ClientList] ✅ Updated counsellor-clients cache with', normalizedClients.length, 'clients');

            // Force React Query to recognize the update and trigger re-render
            // Invalidate the query - this will mark it as stale and trigger a re-render
            // Since we just set the data, it will use the cached data (no network request if within staleTime)
            // But if staleTime has passed, it will refetch (which is fine, we want fresh data anyway)
            queryClient.invalidateQueries({
              queryKey: ['counsellor-clients'],
              refetchType: 'active' // Only refetch if query is currently being used
            });
            // Also trigger a refetch to ensure UI updates immediately
            queryClient.refetchQueries({
              queryKey: ['counsellor-clients'],
              type: 'active'
            });
            console.log('[ClientList] ✅ Invalidated and refetched query to force re-render');

            // Verify the update immediately
            const cachedData = queryClient.getQueryData(['counsellor-clients']);
            const cachedCount = Array.isArray(cachedData) ? cachedData.length : 0;
            console.log('[ClientList] ✅ Verified cache - cached data type:', typeof cachedData, '| isArray:', Array.isArray(cachedData), '| length:', cachedCount);
          }
        } else {
          // Admin: Use full admin list in new structure if available
          if (data.allClients) {
            // Backend sent full admin list in new structure - update instantly
            // Structure: { "3": { counsellor: {...}, clients: { "2026": { "Jan": {...} } } } }
            queryClient.setQueryData(['clients'], data.allClients);
            console.log('[ClientList] Updated clients cache with full admin list (instant, new structure)');
          } else if (data.clients && typeof data.clients === 'object' && !Array.isArray(data.clients)) {
            // Backend sent counsellor-first structure directly
            queryClient.setQueryData(['clients'], data.clients);
            console.log('[ClientList] Updated clients cache with counsellor-first structure');
          } else {
            // Backend only sent counsellor list or old structure - need to refetch full list
            queryClient.invalidateQueries({ queryKey: ['clients'] });
            console.log('[ClientList] Invalidated clients cache (will refetch)');
          }
        }

        // Show toast notification
        toast({
          title: "New Client Added",
          description: `${data.client?.fullName || 'A new client'} has been added.`,
        });
      }
    };

    // Listen for client:updated event
    const handleClientUpdated = (data: {
      action: "UPDATED";
      client: any;
      clients: any; // For counsellor: array. For admin: counsellor-first structure
      allClients?: any; // Full admin list in new structure (if available)
    }) => {
      console.log('[ClientList] Received client:updated event:', data);

      // Update React Query cache with updated clients data
      if (data.clients || data.allClients) {
        if (isCounsellor) {
          // Counsellor: Flatten year/month structure to array if needed
          const flattenedClients = flattenCounsellorClients(data.clients);
          if (flattenedClients.length > 0) {
            queryClient.setQueryData(['counsellor-clients'], [...flattenedClients], {
              updatedAt: Date.now()
            });
            console.log('[ClientList] ✅ Updated counsellor-clients cache with', flattenedClients.length, 'clients');
          } else {
            queryClient.invalidateQueries({ queryKey: ['counsellor-clients'] });
            console.log('[ClientList] ⚠️ Invalidated cache (flattened array was empty)');
          }
        } else {
          // Admin: Use full admin list in new structure if available
          if (data.allClients) {
            // Backend sent full admin list in new structure - update instantly
            // Structure: { "3": { counsellor: {...}, clients: { "2026": { "Jan": {...} } } } }
            queryClient.setQueryData(['clients'], data.allClients);
            console.log('[ClientList] Updated clients cache with full admin list (instant, new structure)');
          } else if (data.clients && typeof data.clients === 'object' && !Array.isArray(data.clients)) {
            // Backend sent counsellor-first structure directly
            queryClient.setQueryData(['clients'], data.clients);
            console.log('[ClientList] Updated clients cache with counsellor-first structure');
          } else {
            // Backend only sent counsellor list or old structure - need to refetch full list
            queryClient.invalidateQueries({ queryKey: ['clients'] });
            console.log('[ClientList] Invalidated clients cache (will refetch)');
          }
        }

        // Show toast notification
        toast({
          title: "Client Updated",
          description: `${data.client?.fullName || 'A client'} has been updated.`,
        });
      }
    };

    // Listen for clients:fetched event (for admin users when fetching counsellor clients)
    const handleClientsFetched = (data: {
      counsellorId: number;
      clients: any;
    }) => {
      console.log('[ClientList] Received clients:fetched event:', data);

      // Update the counsellorDataMap with the fetched clients
      if (data.clients && data.counsellorId) {
        setCounsellorDataMap(prev => ({
          ...prev,
          [data.counsellorId]: data.clients
        }));
        console.log('[ClientList] Updated counsellorDataMap for counsellor:', data.counsellorId);

        // Show toast notification
        toast({
          title: "Clients Updated",
          description: `Client list for counsellor has been updated.`,
        });
      }
    };

    // Listen for payment:created event
    const handlePaymentCreated = (data: {
      action: "CREATED";
      clientId: number;
      client: any; // Full client details with updated payments
      clients: any; // Updated client list (counsellor or admin structure)
      allClients?: any; // Full admin list (if available)
    }) => {
      console.log('💳 [ClientList] Received payment:created event:', data);

      // Update client details cache
      if (data.client && data.clientId) {
        queryClient.setQueryData(['client-complete', data.clientId], data.client);
        queryClient.setQueryData(['client', data.clientId], data.client);
        console.log('[ClientList] ✅ Updated client details cache for clientId:', data.clientId);
      }

      // Update client list cache
      if (data.clients || data.allClients) {
        if (isCounsellor) {
          // Counsellor: Flatten year/month structure to array if needed
          const flattenedClients = flattenCounsellorClients(data.clients);
          if (flattenedClients.length > 0) {
            queryClient.setQueryData(['counsellor-clients'], [...flattenedClients], {
              updatedAt: Date.now()
            });
            console.log('[ClientList] ✅ Updated counsellor-clients cache with', flattenedClients.length, 'clients');
          } else {
            queryClient.invalidateQueries({ queryKey: ['counsellor-clients'] });
            console.log('[ClientList] ⚠️ Invalidated cache (flattened array was empty)');
          }
        } else {
          // Admin: Use full admin list in new structure if available
          if (data.allClients) {
            queryClient.setQueryData(['clients'], data.allClients);
            console.log('[ClientList] ✅ Updated clients cache with full admin list (payment created)');
          } else if (data.clients && typeof data.clients === 'object' && !Array.isArray(data.clients)) {
            queryClient.setQueryData(['clients'], data.clients);
            console.log('[ClientList] ✅ Updated clients cache with counsellor-first structure (payment created)');
          } else {
            queryClient.invalidateQueries({ queryKey: ['clients'] });
            console.log('[ClientList] Invalidated clients cache (will refetch)');
          }
        }
      }

      // Show toast notification
      toast({
        title: "Payment Added",
        description: `Payment has been added for ${data.client?.fullName || 'client'}.`,
      });
    };

    // Listen for payment:updated event
    const handlePaymentUpdated = (data: {
      action: "UPDATED";
      clientId: number;
      client: any; // Full client details with updated payments
      clients: any; // Updated client list (counsellor or admin structure)
      allClients?: any; // Full admin list (if available)
    }) => {
      console.log('💳 [ClientList] Received payment:updated event:', data);

      // Update client details cache
      if (data.client && data.clientId) {
        queryClient.setQueryData(['client-complete', data.clientId], data.client);
        queryClient.setQueryData(['client', data.clientId], data.client);
        console.log('[ClientList] ✅ Updated client details cache for clientId:', data.clientId);
      }

      // Update client list cache
      if (data.clients || data.allClients) {
        if (isCounsellor) {
          // Counsellor: Flatten year/month structure to array if needed
          const flattenedClients = flattenCounsellorClients(data.clients);
          if (flattenedClients.length > 0) {
            queryClient.setQueryData(['counsellor-clients'], [...flattenedClients], {
              updatedAt: Date.now()
            });
            console.log('[ClientList] ✅ Updated counsellor-clients cache with', flattenedClients.length, 'clients');
          } else {
            queryClient.invalidateQueries({ queryKey: ['counsellor-clients'] });
            console.log('[ClientList] ⚠️ Invalidated cache (flattened array was empty)');
          }
        } else {
          // Admin: Use full admin list in new structure if available
          if (data.allClients) {
            queryClient.setQueryData(['clients'], data.allClients);
            console.log('[ClientList] ✅ Updated clients cache with full admin list (payment updated)');
          } else if (data.clients && typeof data.clients === 'object' && !Array.isArray(data.clients)) {
            queryClient.setQueryData(['clients'], data.clients);
            console.log('[ClientList] ✅ Updated clients cache with counsellor-first structure (payment updated)');
          } else {
            queryClient.invalidateQueries({ queryKey: ['clients'] });
            console.log('[ClientList] Invalidated clients cache (will refetch)');
          }
        }
      }

      // Show toast notification
      toast({
        title: "Payment Updated",
        description: `Payment has been updated for ${data.client?.fullName || 'client'}.`,
      });
    };

    // Listen for productPayment:created event
    const handleProductPaymentCreated = (data: {
      action: "CREATED";
      clientId: number;
      client: any; // Full client details with updated productPayments
      clients: any; // Updated client list (counsellor or admin structure)
      allClients?: any; // Full admin list (if available)
    }) => {
      console.log('📦 [ClientList] Received productPayment:created event:', data);

      // Update client details cache
      if (data.client && data.clientId) {
        queryClient.setQueryData(['client-complete', data.clientId], data.client);
        queryClient.setQueryData(['client', data.clientId], data.client);
        console.log('[ClientList] ✅ Updated client details cache for clientId:', data.clientId);
      }

      // Update client list cache
      if (data.clients || data.allClients) {
        if (isCounsellor) {
          // Counsellor: Flatten year/month structure to array if needed
          const flattenedClients = flattenCounsellorClients(data.clients);
          queryClient.setQueryData(['counsellor-clients'], flattenedClients);
          console.log('[ClientList] ✅ Updated counsellor-clients cache with', flattenedClients.length, 'clients');
        } else {
          // Admin: Use full admin list in new structure if available
          if (data.allClients) {
            queryClient.setQueryData(['clients'], data.allClients);
            console.log('[ClientList] ✅ Updated clients cache with full admin list (product payment created)');
          } else if (data.clients && typeof data.clients === 'object' && !Array.isArray(data.clients)) {
            queryClient.setQueryData(['clients'], data.clients);
            console.log('[ClientList] ✅ Updated clients cache with counsellor-first structure (product payment created)');
          } else {
            queryClient.invalidateQueries({ queryKey: ['clients'] });
            console.log('[ClientList] Invalidated clients cache (will refetch)');
          }
        }
      }

      // Show toast notification
      toast({
        title: "Product Payment Added",
        description: `Product payment has been added for ${data.client?.fullName || 'client'}.`,
      });
    };

    // Listen for productPayment:updated event
    const handleProductPaymentUpdated = (data: {
      action: "UPDATED";
      clientId: number;
      client: any; // Full client details with updated productPayments
      clients: any; // Updated client list (counsellor or admin structure)
      allClients?: any; // Full admin list (if available)
    }) => {
      console.log('📦 [ClientList] Received productPayment:updated event:', data);

      // Update client details cache
      if (data.client && data.clientId) {
        queryClient.setQueryData(['client-complete', data.clientId], data.client);
        queryClient.setQueryData(['client', data.clientId], data.client);
        console.log('[ClientList] ✅ Updated client details cache for clientId:', data.clientId);
      }

      // Update client list cache
      if (data.clients || data.allClients) {
        if (isCounsellor) {
          // Counsellor: Flatten year/month structure to array if needed
          const flattenedClients = flattenCounsellorClients(data.clients);
          queryClient.setQueryData(['counsellor-clients'], flattenedClients);
          console.log('[ClientList] ✅ Updated counsellor-clients cache with', flattenedClients.length, 'clients');
        } else {
          // Admin: Use full admin list in new structure if available
          if (data.allClients) {
            queryClient.setQueryData(['clients'], data.allClients);
            console.log('[ClientList] ✅ Updated clients cache with full admin list (product payment updated)');
          } else if (data.clients && typeof data.clients === 'object' && !Array.isArray(data.clients)) {
            queryClient.setQueryData(['clients'], data.clients);
            console.log('[ClientList] ✅ Updated clients cache with counsellor-first structure (product payment updated)');
          } else {
            queryClient.invalidateQueries({ queryKey: ['clients'] });
            console.log('[ClientList] Invalidated clients cache (will refetch)');
          }
        }
      }

      // Show toast notification
      toast({
        title: "Product Payment Updated",
        description: `Product payment has been updated for ${data.client?.fullName || 'client'}.`,
      });
    };

    // Listen for client:archived and client:unarchived events
    const handleClientArchived = (data: {
      action: "ARCHIVED" | "UNARCHIVED";
      client: any;
      clients: any; // For counsellor: array. For admin: counsellor-first structure
      allClients?: any; // Full admin list in new structure (if available)
    }) => {
      console.log('[ClientList] Received client:archived/unarchived event:', data);

      // Update React Query cache with updated clients data
      if (data.clients || data.allClients) {
        if (isCounsellor) {
          // Counsellor: Flatten year/month structure to array if needed
          const flattenedClients = flattenCounsellorClients(data.clients);
          if (flattenedClients.length > 0) {
            queryClient.setQueryData(['counsellor-clients'], [...flattenedClients], {
              updatedAt: Date.now()
            });
            console.log('[ClientList] ✅ Updated counsellor-clients cache with', flattenedClients.length, 'clients');
          } else {
            queryClient.invalidateQueries({ queryKey: ['counsellor-clients'] });
            console.log('[ClientList] ⚠️ Invalidated cache (flattened array was empty)');
          }
        } else {
          // Admin: Use full admin list in new structure if available
          if (data.allClients) {
            queryClient.setQueryData(['clients'], data.allClients);
            console.log('[ClientList] ✅ Updated clients cache with full admin list (client archived/unarchived)');
          } else if (data.clients && typeof data.clients === 'object' && !Array.isArray(data.clients)) {
            queryClient.setQueryData(['clients'], data.clients);
            console.log('[ClientList] ✅ Updated clients cache with counsellor-first structure (client archived/unarchived)');
          } else {
            queryClient.invalidateQueries({ queryKey: ['clients'] });
            console.log('[ClientList] Invalidated clients cache (will refetch)');
          }
        }
      }

      // Show toast notification
      toast({
        title: data.action === "ARCHIVED" ? "Client Archived" : "Client Unarchived",
        description: `${data.client?.fullName || 'A client'} has been ${data.action === "ARCHIVED" ? "archived" : "unarchived"}.`,
      });
    };

    // Register event listeners
    console.log('🟢 [ClientList] Registering socket event listeners...');
    socket.on('client:created', handleClientCreated);
    socket.on('client:updated', handleClientUpdated);
    socket.on('client:archived', handleClientArchived);
    socket.on('client:unarchived', handleClientArchived);
    socket.on('clients:fetched', handleClientsFetched);
    socket.on('payment:created', handlePaymentCreated);
    socket.on('payment:updated', handlePaymentUpdated);
    socket.on('productPayment:created', handleProductPaymentCreated);
    socket.on('productPayment:updated', handleProductPaymentUpdated);

    // Add test listener to verify socket is working
    socket.on('connect', () => {
      console.log('🟢 [ClientList] Socket connected event received in ClientList');
    });

    console.log('✅ [ClientList] Socket event listeners registered for:', {
      role: user?.role,
      socketId: socket.id,
      connected: socket.connected,
      events: ['client:created', 'client:updated', 'clients:fetched', 'payment:created', 'payment:updated', 'productPayment:created', 'productPayment:updated']
    });

    // Cleanup on unmount
    return () => {
      console.log('[ClientList] Cleaning up socket event listeners');
      socket.off('client:created', handleClientCreated);
      socket.off('client:updated', handleClientUpdated);
      socket.off('client:archived', handleClientArchived);
      socket.off('client:unarchived', handleClientArchived);
      socket.off('clients:fetched', handleClientsFetched);
      socket.off('payment:created', handlePaymentCreated);
      socket.off('payment:updated', handlePaymentUpdated);
      socket.off('productPayment:created', handleProductPaymentCreated);
      socket.off('productPayment:updated', handleProductPaymentUpdated);
    };
  }, [socket, isConnected, isCounsellor, user?.role, queryClient, toast]);

  if (isLoading) {
    return (
      <PageWrapper title="Clients" breadcrumbs={[{ label: "Clients" }]}>
        <div className="space-y-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="w-full h-20 bg-muted/50 animate-pulse rounded-xl border border-border/50" />
          ))}
        </div>
      </PageWrapper>
    );
  }

  if (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorResponse = (error as any)?.response;
    const statusCode = errorResponse?.status;
    const is404 = statusCode === 404;
    const is400 = statusCode === 400;

    return (
      <PageWrapper title="Clients" breadcrumbs={[{ label: "Clients" }]}>
        <div className="text-center py-12 max-w-2xl mx-auto">
          <p className="text-destructive text-lg font-semibold mb-4">Error loading clients</p>
          {is404 && (
            <div className="space-y-3 bg-muted/50 p-4 rounded-lg">
              <p className="text-muted-foreground">
                The API endpoint <code className="bg-background px-2 py-1 rounded text-sm font-mono">/api/clients</code> does not exist (404).
              </p>
              <p className="text-sm text-muted-foreground">
                <strong>Backend Issue:</strong> This endpoint needs to be implemented on the backend.
              </p>
            </div>
          )}
          {is400 && (
            <div className="space-y-3 bg-muted/50 p-4 rounded-lg">
              <p className="text-muted-foreground">
                The API request was invalid (400 Bad Request).
              </p>
              <p className="text-sm text-muted-foreground">
                <strong>Backend Issue:</strong> The endpoint may not accept this request format.
              </p>
            </div>
          )}
          {!is404 && !is400 && (
            <div className="space-y-3 bg-muted/50 p-4 rounded-lg">
              <p className="text-sm text-muted-foreground">{errorMessage}</p>
            </div>
          )}
          <p className="text-xs text-muted-foreground mt-4">
            Check browser console (F12) for detailed error logs.
          </p>
        </div>
      </PageWrapper>
    );
  }

  // For admin: data is already loaded in clientsRaw (counsellor-first structure)
  // No need to fetch per-counsellor anymore
  // This function is kept for backward compatibility but won't be used for admin
  const handleCounsellorExpand = async (counsellorId: number) => {
    // Admin view: data is already in clientsRaw, no need to fetch
    if (!isCounsellor) {
      return;
    }

    // Counsellor view: keep old behavior if needed (though it shouldn't be used)
    if (counsellorDataMap[counsellorId] || loadingCounsellors[counsellorId]) return;

    setLoadingCounsellors(prev => ({ ...prev, [counsellorId]: true }));
    try {
      const data = await clientService.getClientsByCounsellor(counsellorId);
      setCounsellorDataMap(prev => ({ ...prev, [counsellorId]: data }));
    } catch (error) {
      console.error("Error loading counsellor data:", error);
    } finally {
      setLoadingCounsellors(prev => ({ ...prev, [counsellorId]: false }));
    }
  };

  // Validate data structure based on user role
  if (!clients) {
    if (!isLoading && !error) {
      return (
        <PageWrapper title="Clients" breadcrumbs={[{ label: "Clients" }]}>
          <div className="text-center py-12">
            <p className="text-muted-foreground">No clients data available.</p>
          </div>
        </PageWrapper>
      );
    }
  }

  // For counsellors: expect array
  // For admin: expect counsellor-first structure { "3": { counsellor: {...}, clients: {...} } }
  if (isCounsellor && !Array.isArray(clients)) {
    console.warn("Counsellor view: Clients data is not an array:", clients);
    if (!isLoading && !error) {
      return (
        <PageWrapper title="Clients" breadcrumbs={[{ label: "Clients" }]}>
          <div className="text-center py-12">
            <p className="text-muted-foreground">Invalid data format received from API.</p>
            <p className="text-xs text-muted-foreground mt-2">
              Expected array for counsellor view, got: {typeof clients}
            </p>
          </div>
        </PageWrapper>
      );
    }
  }

  // For admin: validate counsellor-first structure
  if (!isCounsellor && clients && typeof clients === 'object' && !Array.isArray(clients)) {
    // Check if it's the new structure: keys are counsellorIds (numbers as strings)
    const keys = Object.keys(clients);
    const isValidAdminStructure = keys.some(key => {
      const value = (clients as any)[key];
      return value && typeof value === 'object' && (value.counsellor || value.clients);
    });

    if (!isValidAdminStructure && keys.length > 0 && !isLoading && !error) {
      console.warn("Admin view: Unexpected structure. Expected counsellor-first structure.");
      console.warn("Keys:", keys);
    }
  }

  // Check if API returned product payments instead of clients (wrong endpoint response)
  const isProductPaymentData = Array.isArray(clients) && clients.length > 0 &&
    clients[0] && ((clients[0] as any).productPaymentId !== undefined || (clients[0] as any).productName !== undefined);

  if (isProductPaymentData) {
    console.error("API returned product payment data instead of client data. This is likely a backend issue.");
    console.error("Received data sample:", clients[0]);
    return (
      <PageWrapper title="Clients" breadcrumbs={[{ label: "Clients" }]}>
        <div className="text-center py-12">
          <p className="text-destructive text-lg font-semibold mb-2">API Response Error</p>
          <p className="text-muted-foreground">
            The API endpoint <code className="bg-muted px-2 py-1 rounded">/api/clients/counsellor-clients</code> returned product payment data instead of client data.
          </p>
          <p className="text-sm text-muted-foreground mt-4">
            <strong>Expected:</strong> Array of client objects with id, name, enrollmentDate, etc.
            <br />
            <strong>Received:</strong> Array of product payment objects
          </p>
          <p className="text-xs text-muted-foreground mt-4 p-4 bg-muted rounded">
            <strong>Sample response:</strong>
            <pre className="text-left mt-2 overflow-auto">{JSON.stringify(clients[0], null, 2)}</pre>
          </p>
          <p className="text-sm text-muted-foreground mt-4">
            Please check the backend API endpoint implementation.
          </p>
        </div>
      </PageWrapper>
    );
  }

  // Check if clients array is empty - this could indicate an API error was caught
  if (Array.isArray(clients) && clients.length === 0 && !isLoading && !error) {
    console.warn("⚠️ Clients array is empty. This might indicate an API error was caught silently.");
    console.warn("Check browser console for API error messages (404, 400, etc.)");
  }

  // Safely transform API data to match expected Client format
  // Only for counsellor view (array of clients)
  let transformedClients: Client[] = [];

  try {
    // Only transform if it's an array (counsellor view)
    if (Array.isArray(clients)) {
      transformedClients = clients.map((client: any) => {
      // Handle different API response formats
      const clientId = client.id || client.clientId || client.client_id;
      const clientName = client.name || client.fullName || client.full_name || "";
      const enrollmentDate = client.enrollmentDate || client.enrollment_date || client.date || "";
      // Handle counsellor - can be object { name, id } or string
      const counsellorName = typeof client.counsellor === 'object' && client.counsellor?.name
        ? client.counsellor.name
        : (client.counsellor || client.counsellorName || client.counsellor_name || "");
      // Get sales type: first try from payments array, then saleType object, then use mapping with saleTypeId, fallback to N/A
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
        salesType = "N/A";
      }
      const status = client.status || (client.archived ? "Archived" : "Active") || "Active";
      const productManager = client.productManager || client.product_manager || "N/A";

      // Handle payment data - might be in payments array or direct fields
      const payment = client.payments?.[0] || client.payment || {};
      const totalPayment = client.totalPayment || payment.totalPayment || payment.total_payment || 0;

      // Sum all payment amounts (INITIAL + BEFORE_VISA + AFTER_VISA)
      const totalReceived = client.payments && Array.isArray(client.payments) && client.payments.length > 0
        ? client.payments.reduce((sum: number, p: any) => sum + Number(p.amount || 0), 0)
        : (client.amountReceived || payment.amount || payment.amount_received || 0);

      const amountReceived = totalReceived;
      const amountPending = client.amountPending !== undefined
        ? client.amountPending
        : (Number(totalPayment) - Number(amountReceived));

      // Determine the latest stage from all payments
      // Option: If backend has a separate visaSubmitted field, pass it here:
      // const latestStage = getLatestStageFromPayments(client.payments, client.stage, client.visaSubmitted);
      const latestStage = getLatestStageFromPayments(client.payments, client.stage, client.visaSubmitted) || "N/A";

      return {
        id: String(clientId || ""),
        name: clientName,
        enrollmentDate: enrollmentDate,
        counsellor: counsellorName,
        productManager: productManager,
        salesType: salesType,
        status: status as 'Active' | 'Completed' | 'Pending' | 'Dropped',
        totalPayment: Number(totalPayment) || 0,
        amountReceived: Number(amountReceived) || 0,
        amountPending: Number(amountPending) || 0,
        stage: latestStage,
        ...client // Keep original data for any other fields
      };
      }).filter(client => {
        // Filter out invalid clients (missing required fields)
        return client.id && client.id !== "undefined" && client.id !== "null" && client.id !== "";
      });
    }
  } catch (transformError) {
    console.error("Error transforming clients data:", transformError);
    console.error("Clients data that caused error:", clients);
    transformedClients = [];
  }

  // Helper function to check if a client matches all filter criteria
  const matchesFilters = (client: any, counsellorNameForFilter?: string) => {
    // Don't show archived clients (they should be filtered by backend)
    if (client.archived === true) return false;

    const clientName = (client.name || client.fullName || "").toLowerCase();
    // Handle counsellor - can be object { name, id } or string
    const clientCounsellorObj = typeof client.counsellor === 'object' ? client.counsellor : null;
    const clientCounsellorName = (
      (clientCounsellorObj?.name) ||
      (typeof client.counsellor === 'string' ? client.counsellor : '') ||
      client.counsellorName ||
      counsellorNameForFilter ||
      ""
    ).toLowerCase();
    const searchLower = search.toLowerCase();

    const matchesSearch = searchLower === "" || clientName.includes(searchLower) || clientCounsellorName.includes(searchLower);

    // Get sales type: first try saleType object, then use mapping with saleTypeId
    let clientSalesType = client.salesType || client.saleType?.saleType || "";
    if (!clientSalesType && client.saleTypeId && saleTypeMap[client.saleTypeId]) {
      clientSalesType = saleTypeMap[client.saleTypeId];
    }
    const matchesSalesType = salesTypeFilter === "all" || clientSalesType === salesTypeFilter;

    const clientPm = client.productManager || "";
    const matchesPm = pmFilter === "all" || clientPm === pmFilter;

    // For counsellors, don't show counsellor filter since API already returns only their clients
    const matchesCounsellor = isCounsellor ? true : (counsellorFilter === "all" || clientCounsellorName === counsellorFilter.toLowerCase());

    let matchesPaymentStatus = true;
    if (paymentStatusFilter === "fully_paid") {
      const pending = client.amountPending || (Number(client.totalPayment || 0) - Number(client.amountReceived || 0));
      matchesPaymentStatus = pending === 0;
    } else if (paymentStatusFilter === "has_pending") {
      const pending = client.amountPending || (Number(client.totalPayment || 0) - Number(client.amountReceived || 0));
      matchesPaymentStatus = pending > 0;
    }

    return matchesSearch && matchesSalesType && matchesPm && matchesCounsellor && matchesPaymentStatus;
  };

  const filteredClients = transformedClients.filter((client) => matchesFilters(client));

  // Group clients by Counsellor -> Year -> Month (only for counsellor view)
  // Note: Admin view uses the new structure directly from API, no grouping needed
  // This is kept for backward compatibility but not actively used in current UI
  const groupedClients = isCounsellor && Array.isArray(transformedClients)
    ? transformedClients.reduce((acc: Record<string, Record<string, Record<string, Client[]>>>, client: Client) => {
        // API might return counsellor as object { name, id } or string
        const counsellorObj = typeof client.counsellor === 'object' ? client.counsellor : null;
        const counsellor = (counsellorObj as any)?.name ||
          (typeof client.counsellor === 'string' ? client.counsellor : '') ||
          (client as any).counsellorName ||
          "Unassigned";
        // Use parseEnrollmentDate helper to handle DD-MM-YYYY format
        const date = parseEnrollmentDate(client.enrollmentDate);
        if (!date || isNaN(date.getTime())) {
          return acc; // Skip invalid dates
        }
        const year = date.getFullYear().toString();
        const month = date.toLocaleString('default', { month: 'long' });

        if (!acc[counsellor]) acc[counsellor] = {};
        if (!acc[counsellor][year]) acc[counsellor][year] = {};
        if (!acc[counsellor][year][month]) acc[counsellor][year][month] = [];

        acc[counsellor][year][month].push(client);
        return acc;
      }, {} as Record<string, Record<string, Record<string, Client[]>>>)
    : {};

  // Get sorted keys (only for counsellor view)
  const sortedCounsellors = Object.keys(groupedClients).sort();

  // Get unique values for filters
  // Use API-fetched sale types for filter dropdown (all available sale types)
  const uniqueSalesTypes = allSaleTypes.map((st: any) => st.saleType).filter(Boolean).sort();

  // Use API-fetched counsellors for filter dropdown (all available counsellors)
  const uniqueCounsellors = counsellorsList
    .map((c: any) => c.name || c.fullName || "")
    .filter(Boolean)
    .sort();

  // Product managers still extracted from clients (no separate API endpoint)
  const uniqueProductManagers = Array.from(new Set(transformedClients.map(c => c.productManager).filter(Boolean) || [])).sort();

  const columns = [
    { header: "Sr No", cell: (_: Client, index: number) => <span className="text-slate-400 font-mono text-xs">{String(index + 1).padStart(2, '0')}</span>, className: "w-[60px]" },
    { header: "Name", accessorKey: "name", className: "font-semibold text-slate-900 " },
    { header: "Sales Type", cell: (s: Client) => <Badge variant="outline" className="font-normal whitespace-nowrap bg-slate-50 text-slate-600 border-slate-200">{s.salesType}</Badge> },
    { header: "Enrollment Date", accessorKey: "enrollmentDate", className: "whitespace-nowrap text-slate-500" },
    { header: "Total Payment", cell: (s: Client) => `₹${s.totalPayment.toLocaleString()}` },
    { header: "Received", cell: (s: Client) => <span className="text-emerald-600 font-medium">₹{s.amountReceived.toLocaleString()}</span> },
    { header: "Stage", cell: (s: Client) => {
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
    }},
    { header: "Pending", cell: (s: Client) => <span className={s.amountPending > 0 ? "text-amber-600 font-medium" : "text-slate-400"}>₹{s.amountPending.toLocaleString()}</span> },
    // Removed Counsellor column since it's now grouped
    // Removed Status column as per user request
    { header: "Actions", cell: (s: Client) => (
      <TableActions
        onView={() => setLocation(`/clients/${s.id}/view`)}
        onEdit={() => setLocation(`/clients/${s.id}/edit`)}
        onDelete={() => {
          setClientToDelete(s);
          setShowDeleteConfirm(true);
        }}
        deleteLabel="Archive"
      />
    )}
  ];

  // // Helper function to collect all clients (for PDF export - simpler version)
  // const getAllDisplayedClients = (): Client[] => {
  //   const allClients: Client[] = [];

  //   // Add clients from filteredClients (for counsellor view or when not grouped)
  //   if (filteredClients && filteredClients.length > 0) {
  //     allClients.push(...filteredClients);
  //   }

  //   // Add clients from counsellorDataMap (for admin/manager view - grouped by counsellor)
  //   if (counsellorDataMap && Object.keys(counsellorDataMap).length > 0) {
  //     Object.values(counsellorDataMap).forEach((yearData: any) => {
  //       if (yearData && typeof yearData === 'object') {
  //         Object.values(yearData).forEach((monthData: any) => {
  //           if (monthData && monthData.clients && Array.isArray(monthData.clients)) {
  //             // Transform these clients to match Client format
  //             monthData.clients.forEach((client: any) => {
  //               // Get sales type: first try from payments array, then saleType object, then use mapping with saleTypeId, fallback to N/A
  //               let salesType = client.saleType?.saleType || client.salesType || client.sales_type;

  //               // Check payments array for saleType
  //               if (!salesType && client.payments && Array.isArray(client.payments) && client.payments.length > 0) {
  //                 const paymentWithSaleType = client.payments.find((p: any) => p.saleType?.saleType);
  //                 if (paymentWithSaleType?.saleType?.saleType) {
  //                   salesType = paymentWithSaleType.saleType.saleType;
  //                 }
  //               }

  //               if (!salesType && client.saleTypeId && saleTypeMap[client.saleTypeId]) {
  //                 salesType = saleTypeMap[client.saleTypeId];
  //               }
  //               if (!salesType) {
  //                 salesType = "N/A";
  //               }

  //               // Calculate total received from all payments
  //               const totalReceived = client.payments && Array.isArray(client.payments) && client.payments.length > 0
  //                 ? client.payments.reduce((sum: number, p: any) => sum + Number(p.amount || 0), 0)
  //                 : Number(client.payments?.[0]?.amount || 0);
  //               const totalPayment = Number(client.payments?.[0]?.totalPayment || 0);
  //               const totalPending = totalPayment - totalReceived;

  //               const clientData: Client = {
  //                 id: String(client.clientId || ""),
  //                 name: client.fullName || "N/A",
  //                 enrollmentDate: client.enrollmentDate || "",
  //                 counsellor: client.counsellorName || "N/A",
  //                 productManager: client.productManager || "N/A",
  //                 salesType: salesType,
  //                 status: (client.archived ? "Dropped" : "Active") as 'Active' | 'Completed' | 'Pending' | 'Dropped',
  //                 totalPayment: totalPayment,
  //                 amountReceived: totalReceived,
  //                 amountPending: totalPending,
  //                 stage: (getLatestStageFromPayments(client.payments, client.stage, client.visaSubmitted) || "N/A") as any,
  //               };
  //               allClients.push(clientData);
  //             });
  //           }
  //         });
  //       }
  //     });
  //   }

  //   // Also check transformedClients if filteredClients is empty
  //   if (allClients.length === 0 && transformedClients && transformedClients.length > 0) {
  //     allClients.push(...transformedClients);
  //   }

  //   // Remove duplicates based on client ID
  //   const uniqueClients = Array.from(
  //     new Map(allClients.map(client => [client.id, client])).values()
  //   );

  //   return uniqueClients;
  // };

  const handleExportPDF = async () => {
    // Get all displayed clients with full details (including productPayments)
    const allClients = getAllDisplayedClientsWithDetails();

    if (!allClients || allClients.length === 0) {
      toast({
        variant: "destructive",
        title: "No Data to Export",
        description: "No clients found. Please check your filters or add clients.",
      });
      return;
    }

    try {
      await exportClientsToPDF(allClients);
      toast({
        title: "PDF Exported",
        description: "Client details PDF has been downloaded successfully.",
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

  // Helper function to extract ALL clients from nested structure (for admin/manager)
  const extractAllClientsFromNestedStructure = (data: any): any[] => {
    const allClients: any[] = [];

    if (!data || typeof data !== 'object') {
      return allClients;
    }

    // Handle counsellor-first structure: { "3": { counsellor: {...}, clients: { "2026": { "Jan": { clients: [...] } } } } }
    if (typeof data === 'object' && !Array.isArray(data)) {
      Object.values(data).forEach((counsellorData: any) => {
        if (counsellorData && typeof counsellorData === 'object' && counsellorData.clients) {
          // Iterate through years
          Object.values(counsellorData.clients).forEach((yearData: any) => {
            if (yearData && typeof yearData === 'object') {
              // Iterate through months
              Object.values(yearData).forEach((monthData: any) => {
                if (monthData && monthData.clients && Array.isArray(monthData.clients)) {
                  allClients.push(...monthData.clients);
                }
              });
            }
          });
        }
      });
    }

    return allClients;
  };

  // Helper function to collect all clients with full data (including productPayments)
  const getAllDisplayedClientsWithDetails = (): Array<Client & { payments?: any[], productPayments?: any[], rawClient?: any }> => {
    const allClients: Array<Client & { payments?: any[], productPayments?: any[], rawClient?: any }> = [];

    // For counsellor view: use filteredClients or transformedClients
    if (isCounsellor) {
      if (filteredClients && filteredClients.length > 0) {
        // Need to get original client data with productPayments
        const clientsWithDetails = (Array.isArray(clients) ? clients : []).map((client: any) => {
          const clientId = client.id || client.clientId || client.client_id;
          const matchedClient = filteredClients.find((fc: Client) => String(fc.id) === String(clientId));
          if (matchedClient) {
            return {
              ...matchedClient,
              payments: client.payments || [],
              productPayments: client.productPayments || [],
              rawClient: client,
            } as Client & { payments?: any[], productPayments?: any[], rawClient?: any };
          }
          return null;
        }).filter((item): item is Client & { payments?: any[], productPayments?: any[], rawClient?: any } => item !== null);
        allClients.push(...clientsWithDetails);
      } else if (transformedClients && transformedClients.length > 0) {
        const clientsWithDetails = transformedClients.map((tc: Client) => {
          const originalClient = (Array.isArray(clients) ? clients : []).find((c: any) =>
            String(c.id || c.clientId) === String(tc.id)
          );
          return {
            ...tc,
            payments: originalClient?.payments || [],
            productPayments: originalClient?.productPayments || [],
            rawClient: originalClient,
          } as Client & { payments?: any[], productPayments?: any[], rawClient?: any };
        });
        allClients.push(...clientsWithDetails);
      }
    } else {
      // For admin/manager view: extract ALL clients from nested structure (not just displayed/filtered)
      // This ensures we export ALL clients, not just the ones in expanded accordions
      const extractedClients = extractAllClientsFromNestedStructure(clients);

      extractedClients.forEach((client: any) => {
        // Debug: Log client data to verify productPayments are present
        if (client.productPayments && client.productPayments.length > 0) {
          const ieltsProducts = client.productPayments.filter((p: any) => p.productName === 'IELTS_ENROLLMENT');
          if (ieltsProducts.length > 0) {
            console.log('[ClientList Export] Client', client.fullName || client.name, 'has IELTS productPayments:', ieltsProducts);
          }
        }

        // Extract salesType: first try from payments array, then saleType object, then use mapping with saleTypeId, fallback to N/A
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

        // Calculate total received from all payments
        const totalReceived = client.payments && Array.isArray(client.payments) && client.payments.length > 0
          ? client.payments.reduce((sum: number, p: any) => sum + Number(p.amount || 0), 0)
          : Number(client.payments?.[0]?.amount || 0);
        const totalPayment = Number(client.payments?.[0]?.totalPayment || 0);
        const totalPending = totalPayment - totalReceived;

        // Handle counsellor - can be object or string
        const counsellorObj = client.counsellor as any;
        const counsellorName = (typeof counsellorObj === 'object' && counsellorObj?.name)
          ? counsellorObj.name
          : (typeof client.counsellor === 'string' ? client.counsellor : client.counsellorName || "N/A");

        // Ensure all fields are properly extracted from backend response
        const clientData: Client & { payments?: any[], productPayments?: any[], rawClient?: any, leadType?: any } = {
          id: String(client.clientId || client.id || ""),
          name: client.fullName || client.name || "N/A",
          enrollmentDate: client.enrollmentDate || "",
          counsellor: counsellorName,
          productManager: client.productManager || "N/A",
          salesType: salesType || "Only Products",
          status: (client.archived ? "Dropped" : "Active") as 'Active' | 'Completed' | 'Pending' | 'Dropped',
          totalPayment: totalPayment,
          amountReceived: totalReceived,
          amountPending: totalPending,
          stage: (getLatestStageFromPayments(client.payments, client.stage, client.visaSubmitted) || "N/A") as any,
          // Preserve all payment and product payment data
          payments: Array.isArray(client.payments) ? client.payments : (client.payments ? [client.payments] : []),
          productPayments: Array.isArray(client.productPayments) ? client.productPayments : (client.productPayments ? [client.productPayments] : []),
          rawClient: client,
          // @ts-ignore - Keep saleType object for Excel export (not part of Client type)
          saleType: client.saleType || { saleTypeId: client.saleTypeId, saleType: salesType },
          // @ts-ignore - Keep leadType for potential future use
          leadType: client.leadType,
        };
        allClients.push(clientData);
      });
    }

    // Remove duplicates based on client ID
    const uniqueClients = Array.from(
      new Map(allClients.map(client => [client.id, client])).values()
    );

    return uniqueClients;
  };

  const handleExportExcel = () => {
    // Get all displayed clients with full details (including payments and productPayments)
    const allClients = getAllDisplayedClientsWithDetails();

    if (!allClients || allClients.length === 0) {
      toast({
        variant: "destructive",
        title: "No Data to Export",
        description: "No clients found. Please check your filters or add clients.",
      });
      return;
    }

    try {
      console.log("Starting Excel export...", { clientCount: allClients.length });

      // Use the separated Excel export utility
      exportClientsToExcel(allClients);

      console.log("Excel file downloaded successfully");
      toast({
        title: "Export Successful",
        description: `Excel file with ${allClients.length} clients downloaded successfully.`,
      });
    } catch (error) {
      console.error("Error generating Excel:", error);
      toast({
        variant: "destructive",
        title: "Export Failed",
        description: `Error exporting Excel file: ${error instanceof Error ? error.message : 'Unknown error'}. Please check the browser console.`,
      });
    }
  };

  const handleClearFilters = () => {
    setSalesTypeFilter("all");
    setPmFilter("all");
    setCounsellorFilter("all");
    // Status filter removed
    setPaymentStatusFilter("all");
  };

  const handleArchive = async () => {
    if (!clientToDelete) return;

    setIsArchiving(true);
    try {
      const clientId = Number(clientToDelete.id);
      if (!Number.isFinite(clientId) || clientId <= 0) {
        throw new Error("Invalid client ID");
      }

      // Call archive API
      await clientService.archiveClient(clientId, true);

      // Show success toast
      toast({
        title: "Client Archived",
        description: `${clientToDelete.name} has been archived successfully.`,
      });

      // Invalidate queries to refresh the list
      queryClient.invalidateQueries({ queryKey: queryKey });
      if (!isCounsellor) {
        queryClient.invalidateQueries({ queryKey: ['clients'] });
      }

      // Close dialog
      setShowDeleteConfirm(false);
      setClientToDelete(null);
    } catch (error: any) {
      console.error("Error archiving client:", error);
      const errorMessage = error.response?.data?.message || error.message || "Failed to archive client";
      toast({
        variant: "destructive",
        title: "Archive Failed",
        description: errorMessage,
      });
    } finally {
      setIsArchiving(false);
    }
  };

  const isFilterActive = salesTypeFilter !== "all" || pmFilter !== "all" || (!isCounsellor && counsellorFilter !== "all") || paymentStatusFilter !== "all";

  return (
    <PageWrapper
      title="Clients"
      breadcrumbs={[{ label: "Clients" }]}
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
          <Button onClick={() => setLocation("/clients/new")} className="shadow-md shadow-primary/20">
            <Plus className="w-4 h-4 mr-2" />
            Add Client
          </Button>
        </div>
      }
    >
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-card p-4 rounded-xl border border-border/50 shadow-sm">
            <TableToolbar
              searchPlaceholder="Search clients..."
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
                            <h4 className="font-semibold text-sm text-foreground">Filter Clients</h4>
                            <div className="space-y-2">
                                <label className="text-xs font-medium text-muted-foreground">Sales Type</label>
                                <Select value={salesTypeFilter} onValueChange={setSalesTypeFilter}>
                                    <SelectTrigger className="h-9 bg-background border-border">
                                    <SelectValue placeholder="All Types" />
                                    </SelectTrigger>
                                    <SelectContent>
                                    <SelectItem value="all">All Sales Types</SelectItem>
                                    {uniqueSalesTypes.map(type => (
                                        <SelectItem key={type} value={type}>{type}</SelectItem>
                                    ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* Status filter removed as per user request */}

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
                                    {uniqueCounsellors.map(c => (
                                        <SelectItem key={c} value={c}>{c}</SelectItem>
                                    ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            )}

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
          <Accordion type="multiple" className="w-full">
            {isCounsellor ? (
              // For counsellors: Show direct year/month grouping from filteredClients
              (() => {
                // Group filtered clients by Year -> Month
                const yearMonthGrouped: Record<string, Record<string, Client[]>> = {};
                const invalidDateClients: Client[] = [];

                filteredClients.forEach(client => {
                  // Validate enrollmentDate before parsing
                  if (!client.enrollmentDate || client.enrollmentDate.trim() === '') {
                    console.warn('[ClientList] Client has empty enrollmentDate:', client.id, client.name);
                    invalidDateClients.push(client);
                    return;
                  }

                  // Parse date using helper function (handles DD-MM-YYYY format)
                  const date = parseEnrollmentDate(client.enrollmentDate);

                  // Check if date is valid
                  if (!date || isNaN(date.getTime())) {
                    console.warn('[ClientList] Client has invalid enrollmentDate:', client.id, client.name, 'date:', client.enrollmentDate);
                    invalidDateClients.push(client);
                    return;
                  }

                  const year = date.getFullYear().toString();
                  const month = date.toLocaleString('default', { month: 'long' });

                  // Validate year and month are valid
                  if (year === 'NaN' || month === 'Invalid Date' || !year || !month) {
                    console.warn('[ClientList] Invalid year/month for client:', client.id, client.name, 'year:', year, 'month:', month, 'original date:', client.enrollmentDate);
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

                const years = Object.keys(yearMonthGrouped).sort((a, b) => Number(b) - Number(a));

                // Show invalid date clients separately if any
                const hasInvalidDates = invalidDateClients.length > 0;
                const hasValidClients = years.length > 0;

                if (!hasValidClients && !hasInvalidDates) {
                  return (
                    <div className="text-center py-12 text-muted-foreground text-sm italic">
                      No clients found.
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
                        <Accordion type="multiple" className="w-full">
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
                                <DataTable
                                  data={yearMonthGrouped[year][month]}
                                  columns={columns}
                                  onRowClick={(s) => setLocation(`/clients/${s.id}/view`)}
                                />
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
              // For admin/manager/director: Show counsellor -> year -> month grouping
              // New structure: { "3": { counsellor: {...}, clients: { "2026": { "Jan": { clients: [...], total: 4 } } } } }
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
                    // For supervisor managers: show all counsellors (no filtering)
                    // For non-supervisor managers: filter to only show their assigned counsellors
                    if (isManager && !isSupervisor) {
                      // TODO: Backend should filter this, but frontend can filter as fallback
                      // Check if this counsellor is assigned to the current manager
                      // For now, show all (backend should handle filtering)
                      // In future: check if counsellor.managerId === user.id
                    }

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
                      No clients found.
                    </div>
                  );
                }

                return counsellorEntries.map(([counsellorId, counsellorData]: [string, any]) => {
                  const counsellorInfo = counsellorData?.counsellor || {};
                  const counsellorName = counsellorInfo.name || counsellorInfo.fullName || "Unassigned";

                  // Try to get role from counsellorInfo first (check multiple possible field names)
                  let counsellorRole = counsellorInfo.role
                    || counsellorInfo.userRole
                    || counsellorInfo.user_role
                    || counsellorInfo.roleName
                    || counsellorInfo.role_name;

                  // If role not found in counsellorInfo, try to match from counsellorsList
                  if (!counsellorRole && counsellorsList.length > 0) {
                    const matchedCounsellor = counsellorsList.find((c: any) => {
                      const cId = c.id || c.userId || c.user_id;
                      const cName = (c.name || c.fullName || c.full_name || '').toLowerCase();
                      const counsellorIdNum = Number(counsellorId);
                      const counsellorIdStr = String(counsellorId);
                      const counsellorNameLower = counsellorName.toLowerCase();

                      // Match by ID (as number or string) or name
                      return (
                        (cId && (Number(cId) === counsellorIdNum || String(cId) === counsellorIdStr)) ||
                        (cName && cName === counsellorNameLower)
                      );
                    });

                    if (matchedCounsellor) {
                      counsellorRole = matchedCounsellor.role
                        || matchedCounsellor.userRole
                        || matchedCounsellor.user_role
                        || matchedCounsellor.roleName
                        || matchedCounsellor.role_name;

                      console.log('[ClientList] Found role from counsellorsList:', {
                        counsellorName,
                        matchedCounsellor,
                        foundRole: counsellorRole
                      });
                    }
                  }

                  // Debug logging to help identify the issue
                  console.log('[ClientList] Counsellor role lookup:', {
                    counsellorId,
                    counsellorName,
                    foundRole: counsellorRole,
                    counsellorInfoKeys: Object.keys(counsellorInfo),
                    counsellorsListLength: counsellorsList.length,
                    counsellorInfo: counsellorInfo
                  });

                  const roleBadge = getRoleBadge(counsellorRole);
                  const counsellorClientsData = counsellorData?.clients || {};

                  // Calculate total client count across all years/months
                  let totalClientCount = 0;
                  Object.values(counsellorClientsData).forEach((yearData: any) => {
                    if (yearData && typeof yearData === 'object') {
                      Object.values(yearData).forEach((monthData: any) => {
                        if (monthData && monthData.clients && Array.isArray(monthData.clients)) {
                          totalClientCount += monthData.clients.length;
                        }
                      });
                    }
                  });

                  return (
                    <AccordionItem value={counsellorId} key={counsellorId} className="border-b border-border/50 last:border-b-0">
                      <AccordionTrigger className="px-6 py-4 hover:bg-muted/30 hover:no-underline">
                        <div className="flex items-center gap-3 w-full">
                          <Avatar className="h-8 w-8 border border-border">
                            <AvatarFallback className="bg-primary/10 text-primary text-xs font-bold">
                              {getInitials(counsellorName)}
                            </AvatarFallback>
                          </Avatar>
                          <span className="font-semibold text-lg text-foreground">{counsellorName}</span>
                          <Badge variant="secondary">
                            {totalClientCount} Clients
                          </Badge>
                          {roleBadge && (
                            <Badge variant="outline" className={`font-medium ${roleBadge.className}`}>
                              {roleBadge.label}
                            </Badge>
                          )}
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="px-0 pb-0 bg-muted/10">
                        <div className="pl-4 pr-4 pb-4 pt-2">
                          {Object.keys(counsellorClientsData).length === 0 ? (
                            <div className="text-center py-6 text-muted-foreground text-sm italic">
                              No client data found for this counsellor.
                            </div>
                          ) : (
                            <Accordion type="multiple" className="w-full space-y-2">
                              {Object.keys(counsellorClientsData)
                                .sort((a, b) => Number(b) - Number(a))
                                .map(year => {
                                  const yearData = counsellorClientsData[year];
                                  if (!yearData || typeof yearData !== 'object') return null;

                                  return (
                                    <AccordionItem value={`${counsellorId}-${year}`} key={year} className="border border-border/50 rounded-lg bg-card overflow-hidden shadow-sm">
                                      <AccordionTrigger className="px-4 py-3 hover:bg-muted/30 hover:no-underline">
                                        <span className="font-semibold text-base text-foreground/80">{year}</span>
                                      </AccordionTrigger>
                                      <AccordionContent className="pb-0">
                                        <div className="border-t border-border/50">
                                          <Accordion type="multiple" className="w-full">
                                            {Object.keys(yearData)
                                              .sort((a, b) => {
                                                // Sort months chronologically
                                                const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
                                                const monthA = months.indexOf(a) !== -1 ? months.indexOf(a) : 0;
                                                const monthB = months.indexOf(b) !== -1 ? months.indexOf(b) : 0;
                                                return monthB - monthA;
                                              })
                                              .map(month => {
                                                const monthData = yearData[month];
                                                if (!monthData || !monthData.clients || !Array.isArray(monthData.clients)) return null;

                                                return (
                                                  <AccordionItem value={`${counsellorId}-${year}-${month}`} key={month} className="border-b last:border-b-0 border-border/50">
                                                    <AccordionTrigger className="px-4 py-2 hover:bg-muted/30 hover:no-underline text-sm font-medium text-muted-foreground">
                                                      <div className="flex items-center gap-2">
                                                        <span>{month}</span>
                                                        <Badge variant="outline" className="text-xs h-5 px-1.5 font-normal">
                                                          {monthData.clients.length}
                                                        </Badge>
                                                      </div>
                                                    </AccordionTrigger>
                                                    <AccordionContent className="p-0">
                                                      <DataTable
                                                        data={monthData.clients
                                                          .filter((client: any) => {
                                                            // Get sales type: first try from payments array, then saleType object, then use mapping with saleTypeId
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

                                                            const clientData = {
                                                              id: client.clientId,
                                                              clientId: client.clientId,
                                                              name: client.fullName,
                                                              fullName: client.fullName,
                                                              salesType: salesType || "",
                                                              saleType: client.saleType,
                                                              counsellor: counsellorName,
                                                              counsellorName: counsellorName,
                                                              productManager: client.productManager,
                                                              totalPayment: Number(client.payments?.[0]?.totalPayment || 0),
                                                              amountReceived: client.payments && Array.isArray(client.payments) && client.payments.length > 0
                                                                ? client.payments.reduce((sum: number, p: any) => sum + Number(p.amount || 0), 0)
                                                                : Number(client.payments?.[0]?.amount || 0),
                                                              amountPending: (() => {
                                                                const total = Number(client.payments?.[0]?.totalPayment || 0);
                                                                const received = client.payments && Array.isArray(client.payments) && client.payments.length > 0
                                                                  ? client.payments.reduce((sum: number, p: any) => sum + Number(p.amount || 0), 0)
                                                                  : Number(client.payments?.[0]?.amount || 0);
                                                                return total - received;
                                                              })()
                                                            };
                                                            return matchesFilters(clientData, counsellorName);
                                                          })
                                                          .map((client: any) => {
                                                            // Get sales type: first try from payments array, then saleType object, then use mapping with saleTypeId, fallback to N/A
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

                                                            // Calculate total received from all payments
                                                            const totalReceived = client.payments && Array.isArray(client.payments) && client.payments.length > 0
                                                              ? client.payments.reduce((sum: number, p: any) => sum + Number(p.amount || 0), 0)
                                                              : Number(client.payments?.[0]?.amount || 0);
                                                            const totalPayment = Number(client.payments?.[0]?.totalPayment || 0);
                                                            const totalPending = totalPayment - totalReceived;

                                                            return {
                                                              id: client.clientId,
                                                              name: client.fullName,
                                                              salesType: salesType,
                                                              enrollmentDate: client.enrollmentDate,
                                                              productManager: client.productManager || "N/A",
                                                              totalPayment: totalPayment,
                                                              amountReceived: totalReceived,
                                                              amountPending: totalPending,
                                                              status: (client.archived ? "Dropped" : "Active") as 'Active' | 'Completed' | 'Pending' | 'Dropped',
                                                              stage: (getLatestStageFromPayments(client.payments, client.stage, client.visaSubmitted) || "N/A") as any
                                                            };
                                                          })}
                                                        columns={columns}
                                                        onRowClick={(s) => setLocation(`/clients/${s.id}/view`)}
                                                      />
                                                    </AccordionContent>
                                                  </AccordionItem>
                                                );
                                              })}
                                          </Accordion>
                                        </div>
                                      </AccordionContent>
                                    </AccordionItem>
                                  );
                                })}
                            </Accordion>
                          )}
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  );
                });
              })()
            )}
          </Accordion>
        </div>
      </div>

      <AlertDialog open={showDeleteConfirm} onOpenChange={(open) => !isArchiving && setShowDeleteConfirm(open)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Archive Client</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to archive <span className="font-semibold text-foreground">{clientToDelete?.name}</span>? This client will be hidden from the active list.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex gap-3 justify-end">
            <AlertDialogCancel
              data-testid="button-cancel-archive"
              disabled={isArchiving}
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleArchive}
              className="bg-amber-600 text-white hover:bg-amber-700 border-none"
              data-testid="button-confirm-archive"
              disabled={isArchiving}
            >
              {isArchiving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Archiving...
                </>
              ) : (
                "Archive"
              )}
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </PageWrapper>
  );
}
