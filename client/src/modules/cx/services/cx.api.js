import api from "@/lib/api";

const USE_DUMMY_CX_DATA = import.meta.env.VITE_USE_DUMMY_CX_DATA === "true";

const wait = (ms = 250) => new Promise((resolve) => setTimeout(resolve, ms));

const mockClients = [
  {
    id: "cx-101",
    name: "Rohit Sharma",
    country: "Canada",
    stage: "Docs Pending",
    paymentStatus: "Initial Paid",
    assignedTo: "CX - Priya",
    status: "Active",
    createdAt: "2026-03-15",
    info: {
      email: "rohit@example.com",
      phone: "+91-9999991111",
      visaType: "Student",
      passportNo: "P1234567",
      initialPayment: 50000,
      beforeVisaPayment: 30000,
      afterVisaPayment: 25000,
      totalPayment: 105000,
    },
    products: [
      { name: "Finance", opted: true, details: "Loan under process" },
      { name: "Insurance", opted: true, details: "Travel insurance selected" },
      { name: "NOC Level Job", opted: false, details: "" },
    ],
    documents: [
      {
        id: "d1",
        name: "Passport",
        status: "Verified",
        uploadedAt: "2026-03-20",
        fileType: "image",
        fileUrl: "https://picsum.photos/id/1011/1200/800",
      },
      {
        id: "d2",
        name: "Bank Statement",
        status: "Pending",
        uploadedAt: "2026-03-22",
        fileType: "pdf",
        fileUrl: "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf",
      },
    ],
    checklist: [
      { id: "c1", title: "Passport Copy", status: "Completed" },
      { id: "c2", title: "Financial Proof", status: "Uploaded" },
      { id: "c3", title: "SOP", status: "Pending" },
    ],
    timeline: [
      { id: "t1", type: "created", message: "Client created", at: "2026-03-15 10:15" },
      { id: "t2", type: "payment", message: "Initial payment received", at: "2026-03-16 12:05" },
      { id: "t3", type: "document", message: "Passport uploaded", at: "2026-03-20 16:42" },
    ],
  },
  {
    id: "cx-102",
    name: "Neha Verma",
    country: "Australia",
    stage: "In Review",
    paymentStatus: "Partial Pending",
    assignedTo: "CX - Priya",
    status: "Active",
    createdAt: "2026-03-18",
    info: {
      email: "neha@example.com",
      phone: "+91-9999992222",
      visaType: "Visitor",
      passportNo: "P9876543",
      initialPayment: 45000,
      beforeVisaPayment: 30000,
      afterVisaPayment: 20000,
      totalPayment: 95000,
    },
    products: [
      { name: "Finance", opted: false, details: "" },
      { name: "Insurance", opted: true, details: "Comprehensive plan" },
      { name: "NOC Level Job", opted: true, details: "Profile prepared" },
    ],
    documents: [
      {
        id: "d3",
        name: "Passport",
        status: "Verified",
        uploadedAt: "2026-03-19",
        fileType: "image",
        fileUrl: "https://picsum.photos/id/1025/1200/800",
      },
      {
        id: "d4",
        name: "Bank Statement",
        status: "Verified",
        uploadedAt: "2026-03-21",
        fileType: "pdf",
        fileUrl: "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf",
      },
    ],
    checklist: [
      { id: "c4", title: "Passport Copy", status: "Completed" },
      { id: "c5", title: "ITR", status: "Completed" },
      { id: "c6", title: "Travel History", status: "Uploaded" },
    ],
    timeline: [
      { id: "t4", type: "created", message: "Client created", at: "2026-03-18 09:00" },
      { id: "t5", type: "status", message: "Moved to In Review", at: "2026-03-21 11:20" },
    ],
  },
];

const buildDashboard = (clients) => {
  const pendingDocuments = clients.reduce(
    (acc, client) => acc + client.documents.filter((d) => d.status === "Pending").length,
    0,
  );
  const completedChecklist = clients.reduce(
    (acc, client) => acc + client.checklist.filter((c) => c.status === "Completed").length,
    0,
  );
  const recentActivity = clients
    .flatMap((client) =>
      client.timeline.map((item) => ({
        ...item,
        clientName: client.name,
      })),
    )
    .slice(-8)
    .reverse();

  return {
    totalClients: clients.length,
    pendingDocuments,
    completedChecklist,
    recentActivity,
  };
};

const mockActivity = [
  { id: "a1", action: "Uploaded Passport", clientName: "Rohit Sharma", at: "2026-03-20 16:42" },
  { id: "a2", action: "Checklist updated", clientName: "Neha Verma", at: "2026-03-21 11:25" },
];

const mockReport = {
  dailySummary: "2 clients updated today, 1 pending document follow-up.",
  documentsUploadedCount: 14,
  clientsHandled: 8,
};

const applyFilters = (clients, filters = {}) => {
  const search = (filters.search || "").toLowerCase();
  const country = filters.country || "all";
  const stage = filters.stage || "all";

  return clients.filter((client) => {
    const matchesSearch =
      !search ||
      client.name.toLowerCase().includes(search) ||
      client.assignedTo.toLowerCase().includes(search);
    const matchesCountry = country === "all" || client.country === country;
    const matchesStage = stage === "all" || client.stage === stage;
    return matchesSearch && matchesCountry && matchesStage;
  });
};

export const cxApi = {
  async getClients(filters = {}) {
    if (USE_DUMMY_CX_DATA) {
      await wait();
      return applyFilters(mockClients, filters);
    }
    try {
      const { data } = await api.get("/clients", { params: filters });
      return data;
    } catch {
      await wait();
      return applyFilters(mockClients, filters);
    }
  },

  async getClientById(clientId) {
    if (USE_DUMMY_CX_DATA) {
      await wait();
      return mockClients.find((client) => client.id === clientId) || null;
    }
    try {
      const { data } = await api.get(`/clients/${clientId}`);
      return data;
    } catch {
      await wait();
      return mockClients.find((client) => client.id === clientId) || null;
    }
  },

  async getClientTimeline(clientId) {
    if (USE_DUMMY_CX_DATA) {
      await wait();
      const found = mockClients.find((client) => client.id === clientId);
      return found?.timeline || [];
    }
    try {
      const { data } = await api.get(`/clients/${clientId}/timeline`);
      return data;
    } catch {
      await wait();
      const found = mockClients.find((client) => client.id === clientId);
      return found?.timeline || [];
    }
  },

  async uploadClientDocument(clientId, payload) {
    if (USE_DUMMY_CX_DATA) {
      await wait();
      return {
        success: true,
        clientId,
        document: {
          id: `doc-${Date.now()}`,
          name: payload?.documentName || "New Document",
          status: "Pending",
          uploadedAt: new Date().toISOString().split("T")[0],
        },
      };
    }

    const formData = new FormData();
    if (payload?.file) formData.append("file", payload.file);
    if (payload?.documentName) formData.append("documentName", payload.documentName);
    if (payload?.checklistItemId) formData.append("checklistItemId", payload.checklistItemId);

    const { data } = await api.post(`/clients/${clientId}/documents`, formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return data;
  },

  async getActivity() {
    if (USE_DUMMY_CX_DATA) {
      await wait();
      return mockActivity;
    }
    const { data } = await api.get("/activity", { params: { role: "cx" } });
    return data;
  },

  async getReports() {
    if (USE_DUMMY_CX_DATA) {
      await wait();
      return mockReport;
    }
    const { data } = await api.get("/reports/cx");
    return data;
  },

  async getDashboard() {
    if (USE_DUMMY_CX_DATA) {
      await wait();
      return buildDashboard(mockClients);
    }
    const { data } = await api.get("/reports/cx", { params: { view: "dashboard" } });
    return data;
  },
};
