export const MODULES_SOCKET = {
  subscribe: {
    joinReports: "join:modules:reports",
    leaveReports: "leave:modules:reports",
    joinVisaCase: "join:modules:visa-case",
    leaveVisaCase: "leave:modules:visa-case",
    joinVisaCaseDetail: "join:modules:visa-case:detail",
    leaveVisaCaseDetail: "leave:modules:visa-case:detail",
  },
  events: {
    reportsRefresh: "modules:reports:refresh",
    visaCaseRefresh: "modules:visa-case:refresh",
    visaCaseUpdated: "modules:visa-case:updated",
    visaCaseAssigned: "modules:visa-case:assigned",
  },
} as const;
