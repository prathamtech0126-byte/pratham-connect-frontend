import React, { createContext, useContext, useEffect, useRef, useState, ReactNode, useCallback } from "react";
import api from "@/lib/api";
import {
  getEffectiveMaintenanceActive,
  isScheduledMaintenance,
} from "@/lib/maintenance-utils";

interface MaintenanceContextType {
  /** True when users should see the maintenance page (effective, time-aware). */
  isActive: boolean;
  /** True when maintenance is armed (manual or scheduled). */
  armed: boolean;
  isScheduled: boolean;
  startTime: string | null;
  endTime: string | null;
  toggle: (active: boolean, startTime?: string, endTime?: string) => Promise<void>;
  isToggling: boolean;
}

const MaintenanceContext = createContext<MaintenanceContextType | undefined>(undefined);

type MaintenanceApiPayload = {
  isActive?: boolean;
  armed?: boolean;
  startTime?: string | null;
  endTime?: string | null;
  isScheduled?: boolean;
};

function applyPayload(
  data: MaintenanceApiPayload,
  setArmed: (v: boolean) => void,
  setStartTime: (v: string | null) => void,
  setEndTime: (v: string | null) => void,
  setIsActive: (v: boolean) => void
) {
  const armed = data.armed !== undefined ? !!data.armed : !!data.isActive;
  const start = data.startTime ?? null;
  const end = data.endTime ?? null;
  const effective =
    data.armed !== undefined
      ? !!data.isActive
      : getEffectiveMaintenanceActive(armed, start, end);

  setArmed(armed);
  setStartTime(start);
  setEndTime(end);
  setIsActive(effective);
}

export function MaintenanceProvider({ children }: { children: ReactNode }) {
  const [isActive, setIsActive] = useState(false);
  const [armed, setArmed] = useState(false);
  const [isScheduled, setIsScheduled] = useState(false);
  const [startTime, setStartTime] = useState<string | null>(null);
  const [endTime, setEndTime] = useState<string | null>(null);
  const [isToggling, setIsToggling] = useState(false);
  const armedRef = useRef(armed);
  const startRef = useRef(startTime);
  const endRef = useRef(endTime);

  armedRef.current = armed;
  startRef.current = startTime;
  endRef.current = endTime;

  const recomputeEffective = useCallback(() => {
    const next = getEffectiveMaintenanceActive(
      armedRef.current,
      startRef.current,
      endRef.current
    );
    setIsActive(next);
    setIsScheduled(
      isScheduledMaintenance(armedRef.current, startRef.current, endRef.current)
    );
  }, []);

  const fetchStatus = useCallback(async () => {
    try {
      const res = await api.get("/api/maintenance");
      applyPayload(res.data, setArmed, setStartTime, setEndTime, setIsActive);
      setIsScheduled(!!res.data?.isScheduled);
    } catch {
      // non-fatal — degrade gracefully
    }
  }, []);

  useEffect(() => {
    // Fetch once on mount to hydrate initial state.
    void fetchStatus();
    // Re-fetch when the user returns to the tab (cheap, user-initiated).
    const onFocus = () => void fetchStatus();
    // Re-fetch after a socket reconnect so we catch any events missed while disconnected.
    const onReconnect = () => void fetchStatus();
    window.addEventListener("focus", onFocus);
    window.addEventListener("socket:reconnected", onReconnect);
    return () => {
      window.removeEventListener("focus", onFocus);
      window.removeEventListener("socket:reconnected", onReconnect);
    };
  }, [fetchStatus]);

  useEffect(() => {
    // Only run the local time-window recalculation when there is actually a
    // scheduled window armed — no point ticking when maintenance is off or immediate.
    if (!armed || !isScheduled) return;
    const tick = setInterval(recomputeEffective, 15_000);
    return () => clearInterval(tick);
  }, [recomputeEffective, armed, isScheduled]);

  useEffect(() => {
    const handler = (e: CustomEvent<MaintenanceApiPayload>) => {
      applyPayload(e.detail, setArmed, setStartTime, setEndTime, setIsActive);
      setIsScheduled(!!e.detail.isScheduled);
    };
    window.addEventListener("maintenance:changed" as any, handler);
    return () => window.removeEventListener("maintenance:changed" as any, handler);
  }, []);

  const toggle = useCallback(async (active: boolean, start?: string, end?: string) => {
    setIsToggling(true);
    try {
      const res = await api.post("/api/maintenance", {
        isActive: active,
        startTime: start || null,
        endTime: end || null,
      });
      applyPayload(res.data, setArmed, setStartTime, setEndTime, setIsActive);
      setIsScheduled(!!res.data?.isScheduled);
    } finally {
      setIsToggling(false);
    }
  }, []);

  return (
    <MaintenanceContext.Provider
      value={{ isActive, armed, isScheduled, startTime, endTime, toggle, isToggling }}
    >
      {children}
    </MaintenanceContext.Provider>
  );
}

export function useMaintenance() {
  const ctx = useContext(MaintenanceContext);
  if (!ctx) throw new Error("useMaintenance must be used within MaintenanceProvider");
  return ctx;
}
