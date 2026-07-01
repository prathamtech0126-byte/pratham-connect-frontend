export const MODULES_SOCKET = {
  subscribe: {
    joinReports: "join:modules:reports",
    leaveReports: "leave:modules:reports",
    joinVisaCase: "join:modules:visa-case",
    leaveVisaCase: "leave:modules:visa-case",
    joinVisaCaseDetail: "join:modules:visa-case:detail",
    leaveVisaCaseDetail: "leave:modules:visa-case:detail",
    // Front desk module rooms (backend contract uses "frontdesk", no hyphen).
    joinFrontDesk: "join:modules:frontdesk",
    leaveFrontDesk: "leave:modules:frontdesk",
    joinFrontDeskDetail: "join:modules:frontdesk:detail",
    leaveFrontDeskDetail: "leave:modules:frontdesk:detail",
  },
  events: {
    reportsRefresh: "modules:reports:refresh",
    visaCaseRefresh: "modules:visa-case:refresh",
    visaCaseUpdated: "modules:visa-case:updated",
    visaCaseAssigned: "modules:visa-case:assigned",
    // Front desk list/dashboard refresh + per-lead detail update.
    frontDeskJoined: "joined:modules:frontdesk",
    frontDeskRefresh: "modules:frontdesk:refresh",
    frontDeskUpdated: "modules:frontdesk:updated",
  },
} as const;

/**
 * In-app notification `type` values emitted by the front desk backend module.
 * They reuse the generic notification pipeline (bell/inbox + `notification:new`),
 * so no special handling is required beyond `actionUrl` navigation.
 */
export const FRONTDESK_NOTIFICATION_TYPES = [
  "lead_inbound_registered",
  "lead_client_self_edited",
  "lead_frontdesk_verified",
  "lead_frontdesk_assigned",
  "lead_frontdesk_updated",
] as const;

export type FrontDeskNotificationType = (typeof FRONTDESK_NOTIFICATION_TYPES)[number];
