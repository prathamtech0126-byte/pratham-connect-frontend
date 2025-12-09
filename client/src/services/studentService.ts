export interface Student {
  id: string;
  name: string;
  enrollmentDate: string;
  counsellor: string;
  productManager: string;
  salesType: 'Consultancy' | 'IELTS' | 'Loan' | 'Combined';
  status: 'Active' | 'Completed' | 'Pending' | 'Dropped';
  
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
let students: Student[] = [
  {
    id: "ST-001",
    name: "Aarav Sharma",
    enrollmentDate: "2024-01-15",
    counsellor: "Priya Singh",
    productManager: "Rahul Verma",
    salesType: "Consultancy",
    status: "Active",
    totalPayment: 50000,
    amountReceived: 25000,
    amountPending: 25000,
    email: "aarav.s@example.com",
    phone: "+91 98765 43210"
  },
  {
    id: "ST-002",
    name: "Ishita Patel",
    enrollmentDate: "2024-02-10",
    counsellor: "Priya Singh",
    productManager: "Rahul Verma",
    salesType: "IELTS",
    status: "Pending",
    totalPayment: 15000,
    amountReceived: 5000,
    amountPending: 10000,
    email: "ishita.p@example.com",
    phone: "+91 98765 43211"
  },
  {
    id: "ST-003",
    name: "Rohan Gupta",
    enrollmentDate: "2024-03-05",
    counsellor: "Amit Kumar",
    productManager: "Sneha Reddy",
    salesType: "Combined",
    status: "Active",
    totalPayment: 120000,
    amountReceived: 80000,
    amountPending: 40000,
    email: "rohan.g@example.com",
    phone: "+91 98765 43212"
  },
  {
    id: "ST-004",
    name: "Meera Iyer",
    enrollmentDate: "2024-03-20",
    counsellor: "Amit Kumar",
    productManager: "Sneha Reddy",
    salesType: "Loan",
    status: "Completed",
    totalPayment: 5000,
    amountReceived: 5000,
    amountPending: 0,
    email: "meera.i@example.com",
    phone: "+91 98765 43213"
  },
  {
    id: "ST-005",
    name: "Vikram Malhotra",
    enrollmentDate: "2024-04-12",
    counsellor: "Priya Singh",
    productManager: "Rahul Verma",
    salesType: "Consultancy",
    status: "Active",
    totalPayment: 60000,
    amountReceived: 10000,
    amountPending: 50000,
    email: "vikram.m@example.com",
    phone: "+91 98765 43214"
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
    description: "Submitted visa application for ST-002",
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

export const studentService = {
  getStudents: async (): Promise<Student[]> => {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 500));
    return [...students];
  },

  getStudentById: async (id: string): Promise<Student | undefined> => {
    await new Promise(resolve => setTimeout(resolve, 300));
    return students.find(s => s.id === id);
  },

  createStudent: async (data: Omit<Student, 'id'>): Promise<Student> => {
    await new Promise(resolve => setTimeout(resolve, 800));
    const newStudent = {
      ...data,
      id: `ST-${String(students.length + 1).padStart(3, '0')}`
    };
    students.push(newStudent);
    return newStudent;
  },

  updateStudent: async (id: string, data: Partial<Student>): Promise<Student | undefined> => {
    await new Promise(resolve => setTimeout(resolve, 600));
    const index = students.findIndex(s => s.id === id);
    if (index === -1) return undefined;
    
    students[index] = { ...students[index], ...data };
    return students[index];
  },

  deleteStudent: async (id: string): Promise<boolean> => {
    await new Promise(resolve => setTimeout(resolve, 400));
    const initialLength = students.length;
    students = students.filter(s => s.id !== id);
    return students.length !== initialLength;
  },
  
  // Dashboard Metrics
  getDashboardStats: async () => {
    await new Promise(resolve => setTimeout(resolve, 500));
    const totalStudents = students.length;
    const totalPayment = students.reduce((sum, s) => sum + s.totalPayment, 0);
    const totalReceived = students.reduce((sum, s) => sum + s.amountReceived, 0);
    const totalPending = students.reduce((sum, s) => sum + s.amountPending, 0);
    
    return {
      totalStudents,
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
