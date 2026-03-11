import api from "@/lib/api";

export interface Client {
  id: string;
  name: string;
  enrollmentDate: string;
  counsellor: string;
  mainCounsellor?: string;
  productManager: string;
  salesType: string;
  status: 'Active' | 'Completed' | 'Pending' | 'Dropped';
  stage?: 'Initial' | 'Financial' | 'Before Visa' | 'After Visa' | 'After Visa Payment' | 'Submitted Visa' | 'Visa Submitted';

  // Finance
  totalPayment: number;
  amountReceived: number;
  amountPending: number;

  // Details for mock data
  email?: string;
  phone?: string;

  // Form Data - Product specific fields
  spouseFields?: any;
  studentFields?: any;
  visitorFields?: any;

  // Steps Data
  consultancyPayment?: {
    total: number;
    received: number;
    pending: number;
    productPaymentAmount: number;
    productPaymentDate: string;
  };

  ieltsLoan?: {
    ieltsAmount: number;
    ieltsDate: string;
    loanAmount: number;
    loanDisbursementDate: string;
  };

  legalServices?: {
    commonLawAffidavit: number;
    lawyerCharges: number;
    marriagePhotos: number;
    relationshipAffidavit: number;
    marriageCert: number;
  };

  employmentServices?: {
    partTime: number;
    nocArrangement: number;
    verification: number;
  };

  visaTravel?: {
    extensionFee: number;
    insurance: number;
    airTicket: number;
    simPlan: string;
  };

  finance?: {
    canadaFinance: number;
    beaconDate: string;
    totalCad: number;
    judicialReview: number;
  };
}

// Counsellor Report API types (GET /api/reports/counsellor/:id)
export interface CounsellorReportPerformance {
  total_enrollments: number;
  total_revenue: number;
  core_sale_revenue: number;
  core_product_revenue: number;
  other_product_revenue: number;
  average_revenue_per_client: number;
  pending_amount: number;
  archived_count: number;
}

export interface CounsellorReportMonthlyComparison {
  current_month: { revenue: number; start_date: string; end_date: string };
  last_month: { revenue: number; start_date: string; end_date: string };
  growth_percentage: number;
  target: number;
  achieved: number;
  target_achieved_percentage: number;
  rank: number;
  total_counsellors: number;
}

export interface CounsellorReportProduct {
  product_name: string;
  display_name: string;
  total_sold: number;
  revenue?: number;
  total_collected?: number;
}

export interface CounsellorReportProductAnalytics {
  core_sale: { total_sales: number; revenue: number; average_ticket_size: number };
  core_product: {
    product_name: string;
    display_name: string;
    total_sold: number;
    revenue: number;
    attachment_rate: number;
  };
  other_products: {
    company_revenue: {
      products: CounsellorReportProduct[];
      total_sold: number;
      total_revenue: number;
    };
    third_party: {
      products: CounsellorReportProduct[];
      total_sold: number;
      total_collected: number;
    };
  };
}

export interface CounsellorReportResponse {
  counsellor: {
    id: number;
    full_name: string;
    email: string;
    designation: string;
    manager_id: number;
    manager_name: string;
  };
  filter: { start_date: string; end_date: string };
  performance: CounsellorReportPerformance;
  monthly_comparison: CounsellorReportMonthlyComparison;
  product_analytics: CounsellorReportProductAnalytics;
}

// Reports API types (GET /api/reports)
export interface CounsellorPerformanceRow {
  counsellor_id: number;
  full_name: string;
  email: string;
  total_enrollments: number;
  core_sale_revenue: number;
  core_product_revenue: number;
  other_product_revenue: number;
  total_revenue: number;
  average_revenue_per_client: number;
  pending_amount: number;
  archived_count: number;
  sale_type_count?: number;
}

export interface ManagerAchievedByCounsellor {
  counsellor_id: number;
  full_name: string;
  email: string;
  core_sale_achieved_clients: number;
  core_sale_achieved_revenue: number;
  core_product_achieved_clients: number;
  core_product_achieved_revenue: number;
  other_product_achieved_clients: number;
  other_product_achieved_revenue: number;
  pending_amount?: number;
}

export interface ManagerDataRow {
  manager_id: number;
  manager_name: string;
  target_id: number;
  target_start_date: string;
  target_end_date: string;
  target_core_sale_clients: number;
  target_core_sale_revenue: string;
  target_core_product_clients: number;
  target_core_product_revenue: string;
  target_other_product_clients: number;
  target_other_product_revenue: string;
  achieved: {
    coreSale: { clients: number; revenue: number };
    coreProduct: { clients: number; revenue: number };
    otherProduct: { clients: number; revenue: number };
  };
  achieved_by_counsellor: ManagerAchievedByCounsellor[];
}

export interface ReportsResponse {
  filter_start_date: string;
  filter_end_date: string;
  counsellor_performance: CounsellorPerformanceRow[];
  manager_data: ManagerDataRow[];
}

// Mock Data
let clients: Client[] = [
  {
    id: "CL-001",
    name: "Aarav Sharma",
    enrollmentDate: "2024-01-15",
    counsellor: "Priya Singh",
    productManager: "Rahul Verma",
    salesType: "Canada Student",
    status: "Active",
    stage: "Initial",
    totalPayment: 50000,
    amountReceived: 5900,
    amountPending: 44100,
    email: "aarav.s@example.com",
    phone: "+91 98765 43210"
  },
  {
    id: "CL-002",
    name: "Ishita Patel",
    enrollmentDate: "2024-02-10",
    counsellor: "Priya Singh",
    productManager: "Rahul Verma",
    salesType: "UK Student",
    status: "Pending",
    stage: "Financial",
    totalPayment: 15000,
    amountReceived: 5000,
    amountPending: 10000,
    email: "ishita.p@example.com",
    phone: "+91 98765 43211"
  },
  {
    id: "CL-003",
    name: "Rohan Gupta",
    enrollmentDate: "2024-03-05",
    counsellor: "Amit Kumar",
    productManager: "Sneha Reddy",
    salesType: "Canada Spouse",
    status: "Active",
    stage: "Before Visa",
    totalPayment: 120000,
    amountReceived: 80000,
    amountPending: 40000,
    email: "rohan.g@example.com",
    phone: "+91 98765 43212"
  },
  {
    id: "CL-004",
    name: "Meera Iyer",
    enrollmentDate: "2024-03-20",
    counsellor: "Amit Kumar",
    productManager: "Sneha Reddy",
    salesType: "USA Visitor",
    status: "Completed",
    stage: "Visa Submitted",
    totalPayment: 5000,
    amountReceived: 5000,
    amountPending: 0,
    email: "meera.i@example.com",
    phone: "+91 98765 43213"
  },
  {
    id: "CL-005",
    name: "Vikram Malhotra",
    enrollmentDate: "2024-04-12",
    counsellor: "Priya Singh",
    productManager: "Rahul Verma",
    salesType: "SPOUSAL PR",
    status: "Active",
    stage: "After Visa Payment",
    totalPayment: 60000,
    amountReceived: 10000,
    amountPending: 50000,
    email: "vikram.m@example.com",
    phone: "+91 98765 43214"
  },
  {
    id: "CL-006",
    name: "Ananya Singh",
    enrollmentDate: "2024-05-01",
    counsellor: "Amit Kumar",
    productManager: "Sneha Reddy",
    salesType: "Germany Student",
    status: "Dropped",
    stage: "Initial",
    totalPayment: 20000,
    amountReceived: 5900,
    amountPending: 14100,
    email: "ananya.s@example.com",
    phone: "+91 98765 43215"
  },
  {
    id: "CL-007",
    name: "Rahul Verma",
    enrollmentDate: "2024-05-15",
    counsellor: "Priya Singh",
    productManager: "Rahul Verma",
    salesType: "Canada Visitor",
    status: "Active",
    stage: "Financial",
    totalPayment: 10000,
    amountReceived: 10000,
    amountPending: 0,
    email: "rahul.v@example.com",
    phone: "+91 98765 43216"
  },
  {
    id: "CL-008",
    name: "Sanya Kapoor",
    enrollmentDate: "2024-06-01",
    counsellor: "Amit Kumar",
    productManager: "Sneha Reddy",
    salesType: "UK Spouse",
    status: "Pending",
    stage: "Before Visa",
    totalPayment: 80000,
    amountReceived: 20000,
    amountPending: 60000,
    email: "sanya.k@example.com",
    phone: "+91 98765 43217"
  },
  {
    id: "CL-009",
    name: "Arjun Reddy",
    enrollmentDate: "2024-06-10",
    counsellor: "Priya Singh",
    productManager: "Rahul Verma",
    salesType: "USA Student",
    status: "Active",
    stage: "After Visa Payment",
    totalPayment: 45000,
    amountReceived: 45000,
    amountPending: 0,
    email: "arjun.r@example.com",
    phone: "+91 98765 43218"
  },
  {
    id: "CL-010",
    name: "Zara Khan",
    enrollmentDate: "2024-06-20",
    counsellor: "Amit Kumar",
    productManager: "Sneha Reddy",
    salesType: "Schengen Visitor",
    status: "Completed",
    stage: "Visa Submitted",
    totalPayment: 8000,
    amountReceived: 8000,
    amountPending: 0,
    email: "zara.k@example.com",
    phone: "+91 98765 43219"
  },
  {
    id: "CL-011",
    name: "Kabir Das",
    enrollmentDate: "2024-07-05",
    counsellor: "Priya Singh",
    productManager: "Rahul Verma",
    salesType: "Finland Student",
    status: "Active",
    stage: "Initial",
    totalPayment: 30000,
    amountReceived: 5900,
    amountPending: 24100,
    email: "kabir.d@example.com",
    phone: "+91 98765 43220"
  },
  {
    id: "CL-012",
    name: "Neha Sharma",
    enrollmentDate: "2024-07-15",
    counsellor: "Amit Kumar",
    productManager: "Sneha Reddy",
    salesType: "Canada Onshore Student",
    status: "Active",
    stage: "Financial",
    totalPayment: 25000,
    amountReceived: 25000,
    amountPending: 0,
    email: "neha.s@example.com",
    phone: "+91 98765 43221"
  }
];

// Mock Activity Data
export interface ActivityLogItem {
  id: string;
  type: 'create' | 'update' | 'delete' | 'payment' | 'status_change' | 'login' | 'upload';
  title: string;
  description: string;
  timestamp: string;
  user: {
    name: string;
    avatar?: string;
    role: 'superadmin' | 'manager' | 'team_lead' | 'counsellor' | 'director';
  };
}

const mockActivities: ActivityLogItem[] = [
  {
    id: "act-1",
    type: "create",
    title: "New Client Enrolled",
    description: "Added Aarav Sharma to Consultancy program",
    timestamp: new Date(Date.now() - 1000 * 60 * 30).toISOString(), // 30 mins ago
    user: {
      name: "Sarah Manager",
      role: "manager"
    }
  },
  {
    id: "act-2",
    type: "payment",
    title: "Payment Received",
    description: "Received ₹25,000 from Aarav Sharma for initial deposit",
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(), // 2 hours ago
    user: {
      name: "Super Admin",
      role: "superadmin"
    }
  },
  {
    id: "act-3",
    type: "status_change",
    title: "Application Status Updated",
    description: "Changed Ishita Patel status from Pending to Active",
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString(), // 5 hours ago
    user: {
      name: "Tom Lead",
      role: "team_lead"
    }
  },
  {
    id: "act-4",
    type: "upload",
    title: "Document Uploaded",
    description: "Uploaded Passport copy for Rohan Gupta",
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(), // 1 day ago
    user: {
      name: "Dr. Counsellor",
      role: "counsellor"
    }
  },
  {
    id: "act-5",
    type: "update",
    title: "Profile Updated",
    description: "Updated contact details for Meera Iyer",
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 26).toISOString(), // 1 day + 2 hours ago
    user: {
      name: "Sarah Manager",
      role: "manager"
    }
  },
  {
    id: "act-6",
    type: "create",
    title: "New Lead Added",
    description: "Added new lead via phone enquiry",
    timestamp: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
    user: {
      name: "Dr. Counsellor",
      role: "counsellor"
    }
  },
  {
    id: "act-7",
    type: "status_change",
    title: "File Submitted",
    description: "Submitted visa application for CL-002",
    timestamp: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
    user: {
      name: "Tom Lead",
      role: "team_lead"
    }
  },
  {
    id: "act-8",
    type: "update",
    title: "Policy Update",
    description: "Updated refund policy document",
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 3).toISOString(),
    user: {
      name: "Director",
      role: "director"
    }
  }
];

export const clientService = {
  // Admin view: Returns counsellor-first structure
  // { "3": { counsellor: {...}, clients: { "2026": { "Jan": { clients: [...], total: 4 } } } } }
  // Uses the same endpoint as counsellors, but backend returns different structure for admin
  getClients: async (): Promise<any> => {
    try {
      const res = await api.get("/api/clients/counsellor-clients");
      // console.log("Clients API Response (Admin):", res.data);

      // Handle response structure: { success: true, data: {...} }
      let data = res.data;
      if (data && typeof data === 'object' && 'success' in data && 'data' in data) {
        data = data.data;
        // console.log("Extracted data from success wrapper:", data);
      }

      // Handle nested response structure: { data: {...} }
      if (data && data.data) {
        data = data.data;
        // console.log("Extracted data.data:", data);
      }

      // Admin receives counsellor-first structure: { "3": { counsellor: {...}, clients: {...} } }
      if (data && typeof data === 'object' && !Array.isArray(data)) {
        // Check if it's the new counsellor-first structure (keys are counsellorIds)
        const keys = Object.keys(data);
        const isCounsellorFirstStructure = keys.some(key => {
          const value = data[key];
          return value && typeof value === 'object' && (value.counsellor || value.clients);
        });

        if (isCounsellorFirstStructure) {
          // console.log("Admin: Received counsellor-first structure");
          return data;
        }

        // Check if it's the old year/month structure (keys are years like "2026")
        const isYearMonthStructure = keys.some(key => /^\d{4}$/.test(key));
        if (isYearMonthStructure) {
          // console.log("Admin: Received year/month structure, returning as-is");
          return data;
        }
      }

      // Fallback: return empty object if structure doesn't match
      console.warn("Admin: Unexpected data structure:", typeof data, data);
      return {};
    } catch (err: any) {
      console.error("Failed to fetch clients from API", err);
      // Check if it's a 404 error (endpoint doesn't exist)
      if (err.response?.status === 404) {
        console.error("❌ Backend Error: API endpoint /api/clients/counsellor-clients does not exist (404). Please check backend implementation.");
      }
      return {};
    }
  },

  getArchivedClients: async (): Promise<any> => {
    try {
      const res = await api.get("/api/clients/archived-clients");
      // console.log("📦 [getArchivedClients] Full API Response:", res);
      // console.log("📦 [getArchivedClients] res.data:", res.data);

      // Handle response structure: { success: true, data: clients }
      let data = res.data;
      if (data && typeof data === 'object' && 'success' in data && 'data' in data) {
        // console.log("📦 [getArchivedClients] Found success wrapper, extracting data");
        data = data.data;
        // console.log("📦 [getArchivedClients] Extracted data:", data);
      }

      // Handle nested response structure: { data: {...} }
      if (data && typeof data === 'object' && !Array.isArray(data) && data.data) {
        // console.log("📦 [getArchivedClients] Found nested data.data, extracting");
        data = data.data;
        // console.log("📦 [getArchivedClients] Extracted data.data:", data);
      }

      // Check if it's the counsellor-first structure: { "3": { counsellor: {...}, clients: {...} } }
      if (data && typeof data === 'object' && !Array.isArray(data)) {
        const keys = Object.keys(data);
        const isCounsellorFirstStructure = keys.some(key => {
          const value = data[key];
          return value && typeof value === 'object' && (value.counsellor || value.clients);
        });

        if (isCounsellorFirstStructure) {
          // console.log("✅ [getArchivedClients] Admin: Received counsellor-first structure");
          return data;
        }
      }

      // Return array if it's an array (for counsellor view)
      if (Array.isArray(data)) {
        // console.log("✅ [getArchivedClients] Returning array with", data.length, "clients");
        return data;
      }

      console.warn("⚠️ [getArchivedClients] Unexpected data structure, returning as-is. Data:", data);
      return data || {};
    } catch (err: any) {
      console.error("❌ [getArchivedClients] Failed to fetch archived clients from API", err);
      if (err.response) {
        console.error("❌ [getArchivedClients] Error response:", err.response.data);
        console.error("❌ [getArchivedClients] Error status:", err.response.status);
      }
      if (err.response?.status === 404) {
        console.error("❌ Backend Error: API endpoint /api/clients/archived-clients does not exist (404). Please check backend implementation.");
      }
      return {};
    }
  },

  /**
   * Get archived clients for a user. Uses POST with body { id, role } (id and role from the route).
   * POST /api/clients/archived-clients  Body: { id: number, role: string }
   */
  getArchivedClientsByCounsellor: async (userId: number, role: string): Promise<any> => {
    try {
      const res = await api.post("/api/clients/archived-clients", { id: userId, role });
      let data = res.data;
      if (data && typeof data === "object" && "data" in data) data = data.data;
      if (data && typeof data === "object" && !Array.isArray(data) && data.data) data = data.data;
      if (Array.isArray(data)) return data;
      if (data && typeof data === "object" && data.clients && Array.isArray(data.clients)) return data.clients;
      return [];
    } catch (err: any) {
      console.error(`❌ [getArchivedClientsByCounsellor] Failed for user ${userId} (${role})`, err);
      if (err.response?.status === 404) {
        console.error("❌ Backend Error: API endpoint POST /api/clients/archived-clients does not exist (404).");
      }
      return [];
    }
  },

  getCounsellorClients: async (): Promise<Client[]> => {
    try {
      const res = await api.get("/api/clients/counsellor-clients");
      // console.log("Counsellor Clients API Response (raw):", res.data);

      let data = res.data;

      // Handle response structure: { success: true, data: {...} }
      if (data && typeof data === 'object' && 'success' in data && 'data' in data) {
        data = data.data;
        // console.log("Extracted data from success wrapper:", data);
      }

      // Handle nested response structure: { data: {...} }
      if (data && data.data) {
        data = data.data;
        // console.log("Extracted data.data:", data);
      }

      // Check if data is already a flat array
      if (Array.isArray(data)) {
        // console.log("Data is already an array, returning:", data.length, "clients");
        return data;
      }

      // Handle nested structure: { "2026": { "Jan": { "clients": [...] } } }
      if (data && typeof data === 'object' && !Array.isArray(data)) {
        const allClients: any[] = [];

        // Iterate through years
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

        // console.log("Flattened clients from nested structure:", allClients.length, "clients");
        // if (allClients.length > 0) {
        //   console.log("First client sample:", allClients[0]);
        // }
        return allClients;
      }

      console.warn("Could not parse counsellor clients data. Structure:", typeof data, data);
      return [];
    } catch (err) {
      console.error("Failed to fetch counsellor clients from API", err);
      return [];
    }
  },

  getClientById: async (id: string): Promise<Client | undefined> => {
    await new Promise(resolve => setTimeout(resolve, 300));
    return clients.find(s => s.id === id);
  },

  createClient: async (data: Omit<Client, 'id'>): Promise<Client> => {
    await new Promise(resolve => setTimeout(resolve, 800));
    const newClient = {
      ...data,
      id: `CL-${String(clients.length + 1).padStart(3, '0')}`
    };
    clients.push(newClient);
    return newClient;
  },

  updateClient: async (id: string, data: Partial<Client>): Promise<Client | undefined> => {
    await new Promise(resolve => setTimeout(resolve, 600));
    const index = clients.findIndex(s => s.id === id);
    if (index === -1) return undefined;

    clients[index] = { ...clients[index], ...data };
    return clients[index];
  },

  deleteClient: async (id: string): Promise<boolean> => {
    await new Promise(resolve => setTimeout(resolve, 400));
    const initialLength = clients.length;
    clients = clients.filter(s => s.id !== id);
    return clients.length !== initialLength;
  },

  // Dashboard Metrics
  getDashboardStats: async (filter?: string, afterDate?: string, beforeDate?: string) => {
    try {
      let url = "/api/dashboard/stats";
      const params = new URLSearchParams();

      if (filter) {
        params.append("filter", filter);
      }
      if (afterDate) {
        params.append("afterDate", afterDate);
      }
      if (beforeDate) {
        params.append("beforeDate", beforeDate);
      }

      if (params.toString()) {
        url += `?${params.toString()}`;
      }

      const res = await api.get(url);
      return res.data.data || res.data;
    } catch (err) {
      console.error("Failed to fetch dashboard stats", err);
      // Return fallback data on error
      return {
        totalClients: { count: 0, change: 0, changeType: "no-change" },
        totalRevenue: {
          totalCorePayment: "0.00",
          totalProductPayment: "0.00",
          total: "0.00",
          change: 0,
          changeType: "no-change"
        },
        pendingAmount: {
          amount: "0.00",
          breakdown: {
            initial: "0.00",
            beforeVisa: "0.00",
            afterVisa: "0.00",
            submittedVisa: "0.00"
          },
          label: "total outstanding"
        },
        newEnrollments: { count: 0, label: "new clients in period" },
        revenueOverview: []
      };
    }
  },

  // Activity Logs
  getRecentActivities: async (): Promise<ActivityLogItem[]> => {
    await new Promise(resolve => setTimeout(resolve, 400));
    return [...mockActivities];
  },

  // Get Activity Logs from API
  getActivityLogs: async (page: number = 1, limit: number = 50, filters?: {
    action?: string;
    entityType?: string;
    performedBy?: number;
    clientId?: number;
  }): Promise<{
    data: any[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
      hasNext: boolean;
      hasPrev: boolean;
    };
  }> => {
    try {
      const params = new URLSearchParams();
      params.append("page", page.toString());
      params.append("limit", limit.toString());

      if (filters?.action) params.append("action", filters.action);
      if (filters?.entityType) params.append("entityType", filters.entityType);
      if (filters?.performedBy) params.append("performedBy", filters.performedBy.toString());
      if (filters?.clientId) params.append("clientId", filters.clientId.toString());

      const res = await api.get(`/api/activity-logs?${params.toString()}`);
      return {
        data: res.data.data || [],
        pagination: res.data.pagination || {
          page: 1,
          limit: 50,
          total: 0,
          totalPages: 0,
          hasNext: false,
          hasPrev: false,
        },
      };
    } catch (err) {
      console.error("Failed to fetch activity logs", err);
      return {
        data: [],
        pagination: {
          page: 1,
          limit: 50,
          total: 0,
          totalPages: 0,
          hasNext: false,
          hasPrev: false,
        },
      };
    }
  },

  getLeaderboardCounsellors: async (): Promise<any[]> => {
    try {
      const res = await api.get("/api/leaderboard/counsellors");
      return res.data.data ?? res.data ?? [];
    } catch (err) {
      console.error("Failed to fetch leaderboard counsellors", err);
      return [];
    }
  },

  getCounsellors: async (search?: string): Promise<any[]> => {
    try {
      const trimmed = search?.trim();
      let url = "/api/users/counsellors";
      if (trimmed && trimmed.length >= 3) {
        url += `?search=${encodeURIComponent(trimmed)}`;
      }
      const res = await api.get(url);
      const data = res.data;
      if (Array.isArray(data?.data)) return data.data;
      if (Array.isArray(data)) return data;
      return [];
    } catch (err) {
      console.error("Failed to fetch counsellors", err);
      return [];
    }
  },

  /**
   * GET /api/users/users/details
   * Returns all users (counsellors, managers, admin) with id, fullName, email, role, managerId, designation, isSupervisor, manager.
   * Used for admin/supervisor manager "all clients" page to show user list and open each user's internal page on click.
   */
  getUsersDetails: async (): Promise<any[]> => {
    try {
      const res = await api.get("/api/users/users/details");
      const body = res.data;
      if (body && typeof body === "object" && Array.isArray(body.data)) return body.data;
      return [];
    } catch (err) {
      console.error("Failed to fetch users details", err);
      return [];
    }
  },

  getManagers: async (): Promise<any[]> => {
    try {
      const res = await api.get("/api/users/managers");
      return res.data.data || [];
    } catch (err: any) {
      if (err.response?.status === 404) return [];
      console.error("Failed to fetch managers", err);
      return [];
    }
  },

  // Manager targets: GET /api/manager-targets (no params) or ?managerId=19&start_date=2026-02-01&end_date=2026-02-19
  // Without filter: returns all/default data + filter_start_date, filter_end_date from backend
  // With filter: returns filtered data
  getManagerTargets: async (
    startDate?: string,
    endDate?: string,
    managerId?: number
  ): Promise<{ data: any[]; filter_start_date?: string; filter_end_date?: string; count?: number }> => {
    try {
      const params = new URLSearchParams();
      if (managerId != null) params.set("managerId", String(managerId));
      if (startDate) params.set("start_date", startDate);
      if (endDate) params.set("end_date", endDate);
      const qs = params.toString();
      const url = qs ? `/api/manager-targets?${qs}` : "/api/manager-targets";
      const res = await api.get(url);
      const body = res.data;
      if (body && typeof body === "object" && Array.isArray(body.data)) {
        return {
          data: body.data,
          filter_start_date: body.filter_start_date,
          filter_end_date: body.filter_end_date,
          count: body.count,
        };
      }
      return { data: Array.isArray(body) ? body : [] };
    } catch (err: any) {
      if (err.response?.status === 404) return { data: [] };
      console.error("Failed to fetch manager targets", err);
      throw err;
    }
  },

  // POST /api/manager-targets (create single – manager_id)
  setManagerTarget: async (
    managerId: number,
    payload: {
      start_date: string;
      end_date: string;
      core_sales?: number;
      core_sale_revenue?: string;
      core_product?: number;
      core_product_revenue?: string;
      other_product?: number;
      other_product_revenue?: string;
      no_of_clients?: number;
      revenue?: string;
    }
  ): Promise<any> => {
    try {
      const res = await api.post("/api/manager-targets", { manager_id: managerId, ...payload });
      return res.data?.data ?? res.data;
    } catch (err: any) {
      console.error("Failed to set manager target", err);
      throw err;
    }
  },

  // POST /api/manager-targets (create for multiple managers – manager_ids, dates in YYYY-MM-DD)
  setManagerTargetsBulk: async (payload: {
    manager_ids: number[];
    start_date: string; // YYYY-MM-DD
    end_date: string;   // YYYY-MM-DD
    core_sale_target_clients?: number;
    core_sale_target_revenue?: string;
    core_product_target_clients?: number;
    core_product_target_revenue?: string;
    other_product_target_clients?: number;
    other_product_target_revenue?: string;
    overall?: string;
  }): Promise<any> => {
    try {
      const res = await api.post("/api/manager-targets", payload);
      return res.data?.data ?? res.data;
    } catch (err: any) {
      console.error("Failed to set manager targets (bulk)", err);
      throw err;
    }
  },

  // PUT /api/manager-targets/:id (update)
  updateManagerTarget: async (
    id: number,
    payload: {
      manager_ids?: number[];
      manager_id?: number;
      start_date: string;
      end_date: string;
      core_sales?: number;
      core_sale_revenue?: string;
      core_product?: number;
      core_product_revenue?: string;
      other_product?: number;
      other_product_revenue?: string;
      no_of_clients?: number;
      revenue?: string;
    }
  ): Promise<any> => {
    try {
      const res = await api.put(`/api/manager-targets/${id}`, payload);
      return res.data?.data ?? res.data;
    } catch (err: any) {
      console.error("Failed to update manager target", err);
      throw err;
    }
  },

  // DELETE /api/manager-targets/:id
  deleteManagerTarget: async (id: number): Promise<any> => {
    try {
      const res = await api.delete(`/api/manager-targets/${id}`);
      return res.data?.data ?? res.data;
    } catch (err: any) {
      console.error("Failed to delete manager target", err);
      throw err;
    }
  },

  // Get all clients for admin (with optional search)
  getAllClients: async (search?: string): Promise<any[]> => {
    try {
      const trimmed = search?.trim();
      let url = "/api/clients/admin/all-clients";
      if (trimmed && trimmed.length >= 3) {
        url += `?search=${encodeURIComponent(trimmed)}`;
      }
      const res = await api.get(url);
      const data = res.data;
      if (Array.isArray(data?.data)) return data.data;
      if (Array.isArray(data)) return data;
      return [];
    } catch (err) {
      console.error("Failed to fetch all clients", err);
      return [];
    }
  },

  // Transfer one or multiple clients to another counsellor
  // Single: { clientId, counsellorId }, Multiple: { clientIds, counsellorId }
  transferClient: async (
    clientIdOrIds: number | number[],
    counsellorId: number
  ): Promise<any> => {
    try {
      const body =
        Array.isArray(clientIdOrIds) && clientIdOrIds.length > 0
          ? { clientIds: clientIdOrIds, counsellorId }
          : Array.isArray(clientIdOrIds) && clientIdOrIds.length === 0
            ? undefined
            : { clientId: clientIdOrIds as number, counsellorId };
      if (!body) {
        throw new Error("At least one client is required");
      }
      const res = await api.put("/api/clients/admin/transfer-client", body);
      return res.data.data || res.data;
    } catch (err: any) {
      console.error("Failed to transfer client(s)", err);
      throw err;
    }
  },

  // Get current user profile
  getUserProfile: async (): Promise<any> => {
    try {
      const res = await api.get("/api/users/me");
      // console.log("[getUserProfile] API Response:", res.data);

      // API returns data directly at root level (not nested in data property)
      // Response structure: { message, fullname, email, empid, ... }
      // Extract the user data (exclude 'message' field)
      const { message, ...userData } = res.data || {};
      return userData;
    } catch (err: any) {
      console.error("Failed to fetch user profile", err);

      // Provide more detailed error information
      if (err.response?.status === 404) {
        console.error("❌ Backend Error: API endpoint /api/users/me does not exist (404).");
        console.error("   Please verify that the backend has this endpoint implemented.");
        console.error("   Expected endpoint: GET /api/users/me");
      } else if (err.response?.status === 401) {
        console.error("❌ Authentication Error: User is not authenticated (401).");
      } else if (err.response?.status === 403) {
        console.error("❌ Authorization Error: User does not have permission (403).");
      } else if (err.code === 'ERR_NETWORK' || err.code === 'ECONNABORTED') {
        console.error("❌ Network Error: Could not reach the backend server.");
        console.error("   Check if the backend is running and accessible.");
      }

      throw err;
    }
  },

  getClientsByCounsellor: async (counsellorId: number): Promise<any> => {
    try {
      const res = await api.get(`/api/clients/${counsellorId}`);
      return res.data.data || {};
    } catch (err: any) {
      console.error(`Failed to fetch clients for counsellor ${counsellorId}`, err);
      // Check if it's a 400 error (bad request - wrong endpoint format)
      if (err.response?.status === 400) {
        console.error(`❌ Backend Error: API endpoint /api/clients/${counsellorId} returned 400 (Bad Request). The endpoint may not accept this format.`);
      } else if (err.response?.status === 404) {
        console.error(`❌ Backend Error: API endpoint /api/clients/${counsellorId} does not exist (404).`);
      }
      return {};
    }
  },

  /**
   * Get clients for a user (counsellor/manager/admin) with date filter and optional search.
   * POST /api/clients/counsellor-clients/filtered?filter=monthly&search=...&startDate=...&endDate=...
   * Body: { id: number, role: string } — the clicked user's id and role
   * filter: today | weekly | monthly | yearly | custom (custom requires startDate & endDate, YYYY-MM-DD)
   */
  getCounsellorClientsFiltered: async (
    userId: number,
    role: string,
    params: {
      filter: "today" | "weekly" | "monthly" | "yearly" | "custom";
      search?: string;
      startDate?: string; // YYYY-MM-DD for custom
      endDate?: string;   // YYYY-MM-DD for custom
    }
  ): Promise<Client[]> => {
    try {
      const searchParams = new URLSearchParams();
      searchParams.set("filter", params.filter);
      if (params.search?.trim()) searchParams.set("search", params.search.trim());
      if (params.filter === "custom") {
        if (params.startDate) searchParams.set("startDate", params.startDate);
        if (params.endDate) searchParams.set("endDate", params.endDate);
      }
      const url = `/api/clients/counsellor-clients/filtered?${searchParams.toString()}`;
      const body = { id: userId, role };
      const res = await api.post(url, body);
      let data = res.data;
      if (data && typeof data === "object" && "data" in data) data = data.data;
      if (Array.isArray(data)) return data;
      if (data && typeof data === "object" && data.clients && Array.isArray(data.clients)) return data.clients;
      return [];
    } catch (err: any) {
      console.error(`Failed to fetch filtered clients for user ${userId} (${role})`, err);
      throw err;
    }
  },

  getClientCompleteDetails: async (clientId: number): Promise<any> => {
    try {
      const res = await api.get(`/api/clients/${clientId}/complete`);
      return res.data.data || null;
    } catch (err) {
      console.error(`Failed to fetch complete details for client ${clientId}`, err);
      return null;
    }
  },

  archiveClient: async (clientId: number, archived: boolean): Promise<any> => {
    try {
      const res = await api.put(`/api/clients/${clientId}/archive`, { archived });
      return res.data.data || res.data;
    } catch (err: any) {
      console.error(`Failed to archive/unarchive client ${clientId}`, err);
      throw err;
    }
  },

  deleteClientPayment: async (paymentId: number, reason: string): Promise<void> => {
    const res = await api.delete(`/api/client-payments/${paymentId}`, {
      data: { reason: reason.trim() },
    });
    if (res.data?.data !== undefined) return res.data.data;
  },

  /**
   * Delete a client product payment.
   * DELETE /api/client-product-payments/:productPaymentId
   * Body: { "reason": "..." }
   */
  deleteClientProductPayment: async (productPaymentId: number, reason: string): Promise<void> => {
    const res = await api.delete(`/api/client-product-payments/${productPaymentId}`, {
      data: { reason: reason.trim() },
    });
    if (res.data?.data !== undefined) return res.data.data;
  },

  // Leaderboard APIs
  getLeaderboard: async (month: number, year: number): Promise<{ data: any[]; summary?: { totalCounsellors: number; totalEnrollments: number; totalRevenue: number } }> => {
    try {
      const res = await api.get(`/api/leaderboard?month=${month}&year=${year}`);
      const body = res.data;
      // API returns { success, data, summary, month, year }; return so component can use summary
      if (body && typeof body === 'object' && Array.isArray(body.data)) {
        return { data: body.data, summary: body.summary };
      }
      return { data: Array.isArray(body) ? body : [], summary: undefined };
    } catch (err: any) {
      console.error(`Failed to fetch leaderboard for ${month}/${year}`, err);
      throw err;
    }
  },

  // Reports API: GET /api/reports?filter=today|weekly|monthly|yearly[&saleTypeId=1]
  //            or GET /api/reports?filter=custom&afterDate=YYYY-MM-DD&beforeDate=YYYY-MM-DD[&saleTypeId=1]
  getReports: async (params: {
    filter: "today" | "weekly" | "monthly" | "yearly" | "custom";
    afterDate?: string;
    beforeDate?: string;
    saleTypeId?: number | null;
  }): Promise<ReportsResponse> => {
    const { filter, afterDate, beforeDate, saleTypeId } = params;
    const queryParams: Record<string, string> = { filter };
    if (filter === "custom" && afterDate && beforeDate) {
      queryParams.afterDate = afterDate;
      queryParams.beforeDate = beforeDate;
    }
    if (saleTypeId != null && saleTypeId > 0) {
      queryParams.saleTypeId = String(saleTypeId);
    }
    const res = await api.get("/api/reports", { params: queryParams });
    const data = res.data?.data ?? res.data;
    return {
      filter_start_date: data?.filter_start_date ?? afterDate ?? "",
      filter_end_date: data?.filter_end_date ?? beforeDate ?? "",
      counsellor_performance: Array.isArray(data?.counsellor_performance) ? data.counsellor_performance : [],
      manager_data: Array.isArray(data?.manager_data) ? data.manager_data : [],
    };
  },

  getSaleTypes: async (): Promise<Array<{ id: number; sale_type: string }>> => {
    try {
      const res = await api.get("/api/sale-types");
      const data = res.data?.data ?? res.data ?? [];
      if (!Array.isArray(data)) return [];
      return data
        .map((st: any) => ({
          id: st.id ?? st.saleTypeId ?? st.sale_type_id,
          sale_type: st.sale_type ?? st.saleType ?? st.name ?? "",
        }))
        .filter((st: { id: number; sale_type: string }) => st.id && st.sale_type);
    } catch (err) {
      console.error("Failed to fetch sale types", err);
      return [];
    }
  },

  // Dedicated counsellor report: GET /api/reports/counsellor/:id (or "me")
  getCounsellorReport: async (params: {
    id: number | "me";
    filter: "today" | "weekly" | "monthly" | "yearly" | "custom";
    startDate?: string;
    endDate?: string;
    saleTypeId?: number | null;
  }): Promise<CounsellorReportResponse> => {
    const { id, filter, startDate, endDate, saleTypeId } = params;
    const queryParams: Record<string, string> = { filter };
    if (filter === "custom" && startDate && endDate) {
      queryParams.startDate = startDate;
      queryParams.endDate = endDate;
    }
    if (saleTypeId != null && saleTypeId > 0) {
      queryParams.saleTypeId = String(saleTypeId);
    }
    const res = await api.get(`/api/reports/counsellor/${id}`, { params: queryParams });
    return res.data?.data ?? res.data;
  },

  setTarget: async (counsellorId: number, target: number, month: number, year: number): Promise<any> => {
    try {
      const res = await api.post("/api/leaderboard/target", {
        counsellorId,
        target,
        month,
        year
      });
      return res.data.data || res.data;
    } catch (err: any) {
      console.error(`Failed to set target for counsellor ${counsellorId}`, err);
      throw err;
    }
  },

  deleteTarget: async (targetId: string | number): Promise<any> => {
    try {
      const res = await api.delete(`/api/leaderboard/target/${targetId}`);
      return res.data.data || res.data;
    } catch (err: any) {
      console.error(`Failed to delete target ${targetId}`, err);
      throw err;
    }
  },

  // Message APIs
  acknowledgeMessage: async (messageId: number, method: 'button' | 'timer' = 'button'): Promise<any> => {
    try {
      const res = await api.post(`/api/messages/${messageId}/acknowledge`, { method });
      return res.data.data || res.data;
    } catch (err: any) {
      console.error(`Failed to acknowledge message ${messageId}`, err);
      throw err;
    }
  },

  getUnacknowledgedMessages: async (): Promise<any[]> => {
    try {
      const res = await api.get("/api/messages/unacknowledged");
      // Handle response structure: { success: true, data: { messages: [...] } } or { data: [...] }
      if (res.data?.data?.messages && Array.isArray(res.data.data.messages)) {
        return res.data.data.messages;
      }
      if (res.data?.data && Array.isArray(res.data.data)) {
        return res.data.data;
      }
      if (Array.isArray(res.data)) {
        return res.data;
      }
      return [];
    } catch (err: any) {
      console.error("Failed to fetch unacknowledged messages", err);
      return [];
    }
  },

  getMessages: async (): Promise<any[]> => {
    try {
      const res = await api.get("/api/messages");
      // Handle response structure: { success: true, data: { messages: [...], pagination: {...} } }
      if (res.data?.data?.messages && Array.isArray(res.data.data.messages)) {
        return res.data.data.messages;
      }
      if (res.data?.data && Array.isArray(res.data.data)) {
        return res.data.data;
      }
      if (Array.isArray(res.data)) {
        return res.data;
      }
      return [];
    } catch (err: any) {
      console.error("Failed to fetch messages", err);
      return [];
    }
  },

  // Get inbox messages for counsellors and managers (their messages only)
  getInboxMessages: async (): Promise<any[]> => {
    try {
      const res = await api.get("/api/messages/inbox");
      // Handle response structure: { success: true, data: { messages: [...], pagination: {...} } }
      if (res.data?.data?.messages && Array.isArray(res.data.data.messages)) {
        return res.data.data.messages;
      }
      if (res.data?.data && Array.isArray(res.data.data)) {
        return res.data.data;
      }
      if (Array.isArray(res.data)) {
        return res.data;
      }
      return [];
    } catch (err: any) {
      console.error("Failed to fetch inbox messages", err);
      return [];
    }
  },

  // Admin only - Send broadcast message
  createBroadcastMessage: async (data: {
    title?: string;
    message: string;
    targetRoles: string[]; // ['manager', 'counsellor'] or both
    priority?: 'low' | 'normal' | 'high' | 'urgent';
  }): Promise<any> => {
    try {
      const res = await api.post("/api/messages/broadcast", data);
      return res.data.data || res.data;
    } catch (err: any) {
      console.error("Failed to create broadcast message", err);
      throw err;
    }
  },

  // Admin only - Send individual message
  createIndividualMessage: async (data: {
    title?: string;
    message: string;
    targetUserIds: number[]; // [5, 10, 15] - specific user IDs
    priority?: 'low' | 'normal' | 'high' | 'urgent';
  }): Promise<any> => {
    try {
      const res = await api.post("/api/messages/individual", data);
      return res.data.data || res.data;
    } catch (err: any) {
      console.error("Failed to create individual message", err);
      throw err;
    }
  },

  // Get users for message targeting (Admin only)
  getUsersForMessage: async (roles?: string[]): Promise<any[]> => {
    try {
      const params = roles ? { roles: roles.join(',') } : {};
      const res = await api.get("/api/users", { params });
      // Handle different response structures
      if (res.data?.data && Array.isArray(res.data.data)) {
        return res.data.data;
      }
      if (Array.isArray(res.data)) {
        return res.data;
      }
      return [];
    } catch (err: any) {
      console.error("Failed to fetch users for message", err);
      return [];
    }
  },

  // Get message acknowledgment status (Admin only)
  getMessageStatus: async (messageId: number): Promise<any> => {
    try {
      const res = await api.get(`/api/messages/${messageId}/acknowledgments`);
      return res.data.data || res.data;
    } catch (err: any) {
      console.error(`Failed to fetch message status for ${messageId}`, err);
      throw err;
    }
  },

  // Deactivate message (Admin only)
  deactivateMessage: async (messageId: number): Promise<any> => {
    try {
      const res = await api.patch(`/api/messages/${messageId}/deactivate`, {});
      return res.data.data || res.data;
    } catch (err: any) {
      console.error(`Failed to deactivate message ${messageId}`, err);
      throw err;
    }
  },

  // All Finance Approval APIs
  // Get pending all finance approvals (Admin/Manager only)
  getPendingAllFinanceApprovals: async (): Promise<any[]> => {
    try {
      // console.log("[clientService] Fetching pending all finance approvals...");
      const res = await api.get("/api/all-finance/pending");
      // console.log("[clientService] Pending approvals API response:", {
      //   status: res.status,
      //   data: res.data,
      //   dataData: res.data?.data,
      //   count: res.data?.data?.length || res.data?.count || 0
      // });
      const approvals = res.data.data || res.data || [];
      // console.log("[clientService] Returning approvals:", approvals);
      return approvals;
    } catch (err: any) {
      console.error("[clientService] Failed to fetch pending all finance approvals", err);
      console.error("[clientService] Error details:", {
        message: err?.message,
        response: err?.response,
        status: err?.response?.status,
        data: err?.response?.data
      });
      // Return empty array instead of throwing to prevent UI errors
      return [];
    }
  },

  // Approve all finance payment (Admin/Manager only)
  approveAllFinancePayment: async (financeId: number): Promise<any> => {
    try {
      // console.log(`[clientService] Approving all finance payment, financeId: ${financeId}`);
      // console.log(`[clientService] API endpoint: /api/all-finance/${financeId}/approve`);
      const res = await api.post(`/api/all-finance/${financeId}/approve`);
      // console.log(`[clientService] Approval response:`, res.data);
      return res.data.data || res.data;
    } catch (err: any) {
      console.error(`[clientService] Failed to approve all finance payment ${financeId}`, err);
      console.error(`[clientService] Error response:`, err?.response);
      throw err;
    }
  },

  // Reject all finance payment (Admin/Manager only)
  rejectAllFinancePayment: async (financeId: number): Promise<any> => {
    try {
      // console.log(`[clientService] Rejecting all finance payment, financeId: ${financeId}`);
      // console.log(`[clientService] API endpoint: /api/all-finance/${financeId}/reject`);
      const res = await api.post(`/api/all-finance/${financeId}/reject`);
      // console.log(`[clientService] Rejection response:`, res.data);
      return res.data.data || res.data;
    } catch (err: any) {
      console.error(`[clientService] Failed to reject all finance payment ${financeId}`, err);
      console.error(`[clientService] Error response:`, err?.response);
      throw err;
    }
  }
};
