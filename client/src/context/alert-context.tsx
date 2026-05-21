import React, { createContext, useContext, useState, ReactNode, useCallback, useEffect, useRef } from "react";
import {
  acknowledgeMaintenanceSession,
  hasAcknowledgedMaintenanceSession,
  MAINTENANCE_PENDING_STORAGE_KEY,
} from "@/lib/maintenance-alert";

export type AlertType =
  | "emergency"
  | "announcement"
  | "good_news"
  | "maintenance_scheduled"
  | "maintenance_live";

type PendingAlert = {
  message: string;
  targetRoles: string[];
  title: string;
  type: AlertType;
  timestamp: number;
  sessionKey?: string;
};

export type MaintenanceAlertPayload = {
  sessionKey: string;
  title: string;
  message: string;
  targetRoles: string[];
  type: "maintenance_scheduled" | "maintenance_live";
};

type AlertContextType = {
  isActive: boolean;
  message: string;
  triggerAlert: (message: string, targetRoles?: string[], title?: string, type?: AlertType) => void;
  syncMaintenanceAlert: (payload: MaintenanceAlertPayload | null) => void;
  acknowledgeAlert: () => void;
  hasAcknowledgedMaintenanceSession: (sessionKey: string) => boolean;
  targetRoles?: string[];
  pendingAlert: PendingAlert | null;
  clearPendingAlert: () => void;
  activatePendingAlert: () => void;
  title: string;
  type: AlertType;
  sessionKey: string | null;
};

const AlertContext = createContext<AlertContextType | undefined>(undefined);

const isMaintenanceAlertType = (t: AlertType) =>
  t === "maintenance_scheduled" || t === "maintenance_live";

export function AlertProvider({ children }: { children: ReactNode }) {
  const [isActive, setIsActive] = useState(false);
  const [message, setMessage] = useState("");
  const [title, setTitle] = useState("Emergency Alert");
  const [type, setType] = useState<AlertType>("emergency");
  const [targetRoles, setTargetRoles] = useState<string[]>([]);
  const [pendingAlert, setPendingAlert] = useState<PendingAlert | null>(null);
  const [sessionKey, setSessionKey] = useState<string | null>(null);
  const activeMaintenanceSessionRef = useRef<string | null>(null);

  const loadPendingFromStorage = useCallback(() => {
    const emergency = localStorage.getItem("emergency_alert");
    if (emergency) {
      try {
        setPendingAlert(JSON.parse(emergency));
        return;
      } catch {
        /* fall through */
      }
    }
    const maintenance = localStorage.getItem(MAINTENANCE_PENDING_STORAGE_KEY);
    if (maintenance) {
      try {
        setPendingAlert(JSON.parse(maintenance));
      } catch {
        console.error("Failed to parse maintenance alert");
      }
    }
  }, []);

  useEffect(() => {
    loadPendingFromStorage();
  }, [loadPendingFromStorage]);

  const showAlert = useCallback(
    (
      msg: string,
      roles: string[],
      newTitle: string,
      newType: AlertType,
      newSessionKey?: string | null
    ) => {
      setMessage(msg);
      setTargetRoles(roles);
      setTitle(newTitle);
      setType(newType);
      setSessionKey(newSessionKey ?? null);
      setIsActive(true);

      const alertData: PendingAlert = {
        message: msg,
        targetRoles: roles,
        title: newTitle,
        type: newType,
        timestamp: Date.now(),
        sessionKey: newSessionKey ?? undefined,
      };

      if (isMaintenanceAlertType(newType)) {
        localStorage.setItem(MAINTENANCE_PENDING_STORAGE_KEY, JSON.stringify(alertData));
        localStorage.removeItem("emergency_alert");
      } else {
        localStorage.setItem("emergency_alert", JSON.stringify(alertData));
        localStorage.removeItem(MAINTENANCE_PENDING_STORAGE_KEY);
      }
    },
    []
  );

  const triggerAlert = useCallback(
    (
      msg: string,
      roles: string[] = ["all"],
      newTitle: string = "Emergency Alert",
      newType: AlertType = "emergency"
    ) => {
      showAlert(msg, roles, newTitle, newType, null);
    },
    [showAlert]
  );

  const syncMaintenanceAlert = useCallback(
    (payload: MaintenanceAlertPayload | null) => {
      if (!payload) {
        if (activeMaintenanceSessionRef.current) {
          setIsActive(false);
          setMessage("");
          setTargetRoles([]);
          setSessionKey(null);
          activeMaintenanceSessionRef.current = null;
          localStorage.removeItem(MAINTENANCE_PENDING_STORAGE_KEY);
        }
        return;
      }

      if (hasAcknowledgedMaintenanceSession(payload.sessionKey)) {
        return;
      }

      if (activeMaintenanceSessionRef.current === payload.sessionKey && isActive) {
        return;
      }

      activeMaintenanceSessionRef.current = payload.sessionKey;
      showAlert(
        payload.message,
        payload.targetRoles,
        payload.title,
        payload.type,
        payload.sessionKey
      );
    },
    [showAlert]
  );

  const acknowledgeAlert = useCallback(() => {
    if (sessionKey && isMaintenanceAlertType(type)) {
      acknowledgeMaintenanceSession(sessionKey);
      activeMaintenanceSessionRef.current = sessionKey;
    }

    setIsActive(false);
    setMessage("");
    setTargetRoles([]);
    setSessionKey(null);

    localStorage.removeItem("emergency_alert");
    localStorage.removeItem(MAINTENANCE_PENDING_STORAGE_KEY);
    setPendingAlert(null);
  }, [sessionKey, type]);

  const clearPendingAlert = useCallback(() => {
    localStorage.removeItem("emergency_alert");
    localStorage.removeItem(MAINTENANCE_PENDING_STORAGE_KEY);
    setPendingAlert(null);
  }, []);

  const activatePendingAlert = useCallback(() => {
    if (pendingAlert) {
      showAlert(
        pendingAlert.message,
        pendingAlert.targetRoles,
        pendingAlert.title,
        pendingAlert.type,
        pendingAlert.sessionKey ?? null
      );
      setPendingAlert(null);
    }
  }, [pendingAlert, showAlert]);

  return (
    <AlertContext.Provider
      value={{
        isActive,
        message,
        triggerAlert,
        syncMaintenanceAlert,
        acknowledgeAlert,
        hasAcknowledgedMaintenanceSession,
        targetRoles,
        pendingAlert,
        clearPendingAlert,
        activatePendingAlert,
        title,
        type,
        sessionKey,
      }}
    >
      {children}
    </AlertContext.Provider>
  );
}

export function useAlert() {
  const context = useContext(AlertContext);
  if (context === undefined) {
    throw new Error("useAlert must be used within an AlertProvider");
  }
  return context;
}

/** Called when maintenance is fully disabled server-side. */
export function resetMaintenanceAlertStorage() {
  localStorage.removeItem(MAINTENANCE_PENDING_STORAGE_KEY);
  localStorage.removeItem("maintenance_session_acknowledgements");
}
