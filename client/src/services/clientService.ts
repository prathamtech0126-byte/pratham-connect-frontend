export interface Client {
  id: string;
  name: string;
  enrollmentDate: string;
  counsellor: string;
  mainCounsellor?: string;
  productManager: string;
  salesType: string;
  coreSales?: string;
  status: 'Active' | 'Completed' | 'Pending' | 'Dropped';
  stage?: 'Initial' | 'Financial' | 'Before Visa' | 'After Visa Payment' | 'Visa Submitted';
  
  // Finance
  totalPayment: number;
  amountReceived: number;
  amountPending: number;
  
  // Details for mock data
  email?: string;
  phone?: string;
  
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
    coreSales: "Yes",
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
    coreSales: "Yes",
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
    coreSales: "No",
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
    coreSales: "No",
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
    coreSales: "Yes",
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
    coreSales: "Yes",
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
    coreSales: "No",
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
    coreSales: "Yes",
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
    coreSales: "No",
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
    coreSales: "No",
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
    coreSales: "Yes",
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
    coreSales: "Yes",
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
  getClients: async (): Promise<Client[]> => {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 500));
    return [...clients];
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
  getDashboardStats: async () => {
    await new Promise(resolve => setTimeout(resolve, 500));
    const totalClients = clients.length;
    const totalPayment = clients.reduce((sum, s) => sum + s.totalPayment, 0);
    const totalReceived = clients.reduce((sum, s) => sum + s.amountReceived, 0);
    const totalPending = clients.reduce((sum, s) => sum + s.amountPending, 0);
    
    return {
      totalClients,
      totalPayment,
      totalReceived,
      totalPending,
      todaysEnrollments: 2, // Mock
      upcomingPayments: 5   // Mock
    };
  },

  // Activity Logs
  getRecentActivities: async (): Promise<ActivityLogItem[]> => {
    await new Promise(resolve => setTimeout(resolve, 400));
    return [...mockActivities];
  }
};
