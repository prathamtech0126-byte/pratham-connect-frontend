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
  }
};
