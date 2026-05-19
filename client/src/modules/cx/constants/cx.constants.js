export const CX_QUERY_KEYS = {
  clients: ["cx", "clients"],
  clientDetails: (clientId) => ["cx", "clients", clientId],
  clientTimeline: (clientId) => ["cx", "clients", clientId, "timeline"],
  clientDocuments: (clientId) => ["cx", "clients", clientId, "documents"],
  clientChecklist: (clientId) => ["cx", "clients", clientId, "checklist"],
  activity: ["cx", "activity"],
  reports: ["cx", "reports"],
  dashboard: ["cx", "dashboard"],
};

export const CX_CLIENT_STAGE_OPTIONS = [
  "Enrolled",
  "Docs Pending",
  "In Review",
  "Submitted",
  "Visa In Progress",
  "Completed",
];

export const CX_CHECKLIST_STATUS = {
  PENDING: "Pending",
  UPLOADED: "Uploaded",
  COMPLETED: "Completed",
};

export const CX_DOCUMENT_STATUS = {
  PENDING: "Pending",
  VERIFIED: "Verified",
  REJECTED: "Rejected",
};

export const CX_PRODUCTS = [
  "Finance",
  "Insurance",
  "NOC Level Job",
  "Accommodation",
  "Air Ticket",
  "IELTS",
  "Visa Filing",
];

export const CX_DEFAULT_FILTERS = {
  search: "",
  country: "all",
  stage: "all",
};
