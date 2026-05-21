/** Roles that must see blocking maintenance alerts (everyone except developer). */
export const MAINTENANCE_ALERT_TARGET_ROLES = [
  "all",
  "manager",
  "counsellor",
  "telecaller",
  "front_desk",
  "marketing_head",
  "superadmin",
  "admin",
];

export const MAINTENANCE_ACK_SESSIONS_KEY = "maintenance_alert_ack_sessions";
export const MAINTENANCE_PENDING_STORAGE_KEY = "maintenance_alert_pending";

export function formatMaintenanceDisplayTime(time: string): string {
  const [h, m] = time.split(":");
  const hour = parseInt(h, 10);
  const ampm = hour >= 12 ? "PM" : "AM";
  const display = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
  return `${display}:${m} ${ampm}`;
}

export function buildMaintenanceSessionKey(
  armed: boolean,
  isLive: boolean,
  startTime: string | null,
  endTime: string | null
): string {
  return `m:${armed ? 1 : 0}:${isLive ? 1 : 0}:${startTime ?? ""}:${endTime ?? ""}`;
}

export function buildMaintenanceAlertContent(
  armed: boolean,
  isLive: boolean,
  startTime: string | null,
  endTime: string | null
): { title: string; message: string; type: "maintenance_live" | "maintenance_scheduled" } {
  if (isLive && startTime && endTime) {
    return {
      type: "maintenance_live",
      title: "Maintenance In Progress",
      message:
        `Pratham Connect is now under maintenance until ${formatMaintenanceDisplayTime(endTime)} (started at ${formatMaintenanceDisplayTime(startTime)}). ` +
        `Please save your work. Access will remain limited until maintenance is complete.`,
    };
  }
  if (armed && startTime && endTime) {
    return {
      type: "maintenance_scheduled",
      title: "Scheduled Maintenance Notice",
      message:
        `Pratham Connect will be under scheduled maintenance today from ${formatMaintenanceDisplayTime(startTime)} to ${formatMaintenanceDisplayTime(endTime)}. ` +
        `Please save your work and expect limited access during this window.`,
    };
  }
  return {
    type: "maintenance_live",
    title: "Maintenance Starting Now",
    message:
      "Pratham Connect is entering maintenance mode now. Please save your work — the application will be temporarily unavailable until maintenance is complete.",
  };
}

export function getAcknowledgedMaintenanceSessions(): string[] {
  try {
    const raw = localStorage.getItem(MAINTENANCE_ACK_SESSIONS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((k) => typeof k === "string") : [];
  } catch {
    return [];
  }
}

export function acknowledgeMaintenanceSession(sessionKey: string): void {
  const sessions = getAcknowledgedMaintenanceSessions();
  if (!sessions.includes(sessionKey)) {
    localStorage.setItem(
      MAINTENANCE_ACK_SESSIONS_KEY,
      JSON.stringify([...sessions, sessionKey])
    );
  }
}

export function hasAcknowledgedMaintenanceSession(sessionKey: string): boolean {
  return getAcknowledgedMaintenanceSessions().includes(sessionKey);
}

export function clearMaintenanceSessionAcknowledgements(): void {
  localStorage.removeItem(MAINTENANCE_ACK_SESSIONS_KEY);
}
