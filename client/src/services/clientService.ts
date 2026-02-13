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

  getCounsellors: async (search?: string): Promise<any[]> => {
    try {
      let url = "/api/users/counsellors";
      if (search && search.length >= 3) {
        url += `?search=${encodeURIComponent(search)}`;
      }
      const res = await api.get(url);
      return res.data.data || [];
    } catch (err) {
      console.error("Failed to fetch counsellors", err);
      return [];
    }
  },

  // Get all clients for admin (with optional search)
  getAllClients: async (search?: string): Promise<any[]> => {
    try {
      let url = "/api/clients/admin/all-clients";
      if (search && search.length >= 3) {
        url += `?search=${encodeURIComponent(search)}`;
      }
      const res = await api.get(url);
      return res.data.data || res.data || [];
    } catch (err) {
      console.error("Failed to fetch all clients", err);
      return [];
    }
  },

  // Transfer client to another counsellor
  transferClient: async (clientId: number, counsellorId: number): Promise<any> => {
    try {
      const res = await api.put("/api/clients/admin/transfer-client", {
        clientId,
        counsellorId
      });
      return res.data.data || res.data;
    } catch (err: any) {
      console.error("Failed to transfer client", err);
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
