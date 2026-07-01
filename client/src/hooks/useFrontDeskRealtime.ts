import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { isFrontDeskRealtimeUser, useSocket } from "@/context/socket-context";
import { useAuth } from "@/context/auth-context";
import { MODULES_SOCKET } from "@/constants/modules-socket";
import {
  applyFrontDeskSocketSnapshot,
  leadIdFromSocketPayload,
  refreshFrontDeskDashboardCaches,
} from "@/lib/frontdeskQueryCache";

/** Thin refresh signal for the front desk list + dashboard stats. */
export type FrontDeskRefreshPayload = {
  reason: string;
  leadId?: number;
  timestamp: string;
};

/** Per-lead update signal — `snapshot` patches cache instantly; REST refetch confirms. */
export type FrontDeskUpdatedPayload = {
  leadId: number;
  reason: string;
  timestamp: string;
  snapshot?: Record<string, unknown>;
};

const FRONTDESK_REFRESH_ALIASES = [
  "frontdesk:refresh",
  "leads:frontdesk:refresh",
] as const;

const FRONTDESK_UPDATED_ALIASES = [
  "frontdesk:updated",
  "leads:frontdesk:updated",
] as const;

/**
 * Subscribes to front desk socket events and updates the UI instantly:
 * 1. Patch React Query cache from socket snapshot (same tick)
 * 2. Background refetch to sync with server / Redis
 *
 * Call once in MainLayout. Use `useFrontDeskDetailRoom(leadId)` on the detail page.
 */
export function useFrontDeskRealtime() {
  const { socket, isConnected } = useSocket();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const eligible = isFrontDeskRealtimeUser(user?.role);

  useEffect(() => {
    if (!eligible || !socket || !isConnected || !user) return;

    socket.emit(MODULES_SOCKET.subscribe.joinFrontDesk);

    return () => {
      socket.emit(MODULES_SOCKET.subscribe.leaveFrontDesk);
    };
  }, [eligible, socket, isConnected, user]);

  useEffect(() => {
    if (!eligible || !socket) return;

    const syncFromServer = (leadId?: number) => {
      void refreshFrontDeskDashboardCaches(queryClient, { leadId });
    };

    const onRefresh = (payload: FrontDeskRefreshPayload) => {
      syncFromServer(payload?.leadId);
    };

    const onUpdated = (payload: FrontDeskUpdatedPayload) => {
      const id = payload?.leadId;
      if (id != null && payload.snapshot) {
        applyFrontDeskSocketSnapshot(queryClient, id, payload.snapshot, payload.reason);
      }
      syncFromServer(id);
    };

    const onLeadCreated = (payload: unknown) => {
      const id = leadIdFromSocketPayload(payload);
      if (id != null && payload && typeof payload === "object") {
        applyFrontDeskSocketSnapshot(
          queryClient,
          id,
          payload as Record<string, unknown>,
          "lead:created"
        );
      }
      syncFromServer(id ?? undefined);
    };

    const onLeadUpdated = (payload: unknown) => {
      const id = leadIdFromSocketPayload(payload);
      if (id != null && payload && typeof payload === "object") {
        applyFrontDeskSocketSnapshot(
          queryClient,
          id,
          payload as Record<string, unknown>,
          "lead:updated"
        );
      }
      syncFromServer(id ?? undefined);
    };

    const events: Array<[string, (...args: unknown[]) => void]> = [
      [MODULES_SOCKET.events.frontDeskRefresh, onRefresh as (...args: unknown[]) => void],
      [MODULES_SOCKET.events.frontDeskUpdated, onUpdated as (...args: unknown[]) => void],
      ["lead:created", onLeadCreated],
      ["lead:updated", onLeadUpdated],
      ...FRONTDESK_REFRESH_ALIASES.map(
        (e) => [e, onRefresh as (...args: unknown[]) => void] as [string, (...args: unknown[]) => void]
      ),
      ...FRONTDESK_UPDATED_ALIASES.map(
        (e) => [e, onUpdated as (...args: unknown[]) => void] as [string, (...args: unknown[]) => void]
      ),
    ];

    for (const [event, handler] of events) {
      socket.on(event, handler);
    }

    return () => {
      for (const [event, handler] of events) {
        socket.off(event, handler);
      }
    };
  }, [eligible, socket, queryClient]);
}
