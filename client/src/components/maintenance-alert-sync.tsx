import { useEffect, useRef } from "react";
import { useAuth } from "@/context/auth-context";
import { useAlert } from "@/context/alert-context";
import { useMaintenance } from "@/context/maintenance-context";
import {
  buildMaintenanceAlertContent,
  buildMaintenanceSessionKey,
  clearMaintenanceSessionAcknowledgements,
  hasAcknowledgedMaintenanceSession,
  MAINTENANCE_ALERT_TARGET_ROLES,
} from "@/lib/maintenance-alert";

/**
 * Syncs server maintenance state into AlertProvider so users get the same
 * blocking acknowledge modal as megaphone broadcasts.
 */
export function MaintenanceAlertSync() {
  const { user } = useAuth();
  const { armed, isActive, startTime, endTime } = useMaintenance();
  const { syncMaintenanceAlert, pendingAlert, activatePendingAlert } = useAlert();
  const lastSessionRef = useRef<string | null>(null);

  // On login, surface a stored maintenance alert before the rest of the CRM (like broadcast).
  useEffect(() => {
    if (!user || user.role === "developer") return;
    if (!pendingAlert) return;
    if (
      pendingAlert.type !== "maintenance_scheduled" &&
      pendingAlert.type !== "maintenance_live"
    ) {
      return;
    }
    if (pendingAlert.sessionKey && hasAcknowledgedMaintenanceSession(pendingAlert.sessionKey)) {
      return;
    }
    activatePendingAlert();
  }, [user, user?.role, pendingAlert, activatePendingAlert]);

  useEffect(() => {
    if (!user || user.role === "developer") {
      lastSessionRef.current = null;
      syncMaintenanceAlert(null);
      return;
    }

    if (!armed && !isActive) {
      lastSessionRef.current = null;
      syncMaintenanceAlert(null);
      clearMaintenanceSessionAcknowledgements();
      return;
    }

    const sessionKey = buildMaintenanceSessionKey(armed, isActive, startTime, endTime);
    if (lastSessionRef.current === sessionKey) return;
    lastSessionRef.current = sessionKey;

    const { title, message, type } = buildMaintenanceAlertContent(
      armed,
      isActive,
      startTime,
      endTime
    );

    syncMaintenanceAlert({
      sessionKey,
      title,
      message,
      targetRoles: [...MAINTENANCE_ALERT_TARGET_ROLES],
      type,
    });
  }, [user, user?.role, armed, isActive, startTime, endTime, syncMaintenanceAlert]);

  return null;
}
