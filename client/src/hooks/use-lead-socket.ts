import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useSocket } from "@/context/socket-context";
import type { LeadEntity } from "@/api/leads.api";

/** Invalidate lead queries when Socket.io broadcasts lead mutations. */
export function useLeadSocketRefresh(options?: {
  enabled?: boolean;
  queryKeys?: readonly (string | number)[][];
  onLeadEvent?: (event: string, payload: unknown) => void;
}) {
  const { socket, isConnected } = useSocket();
  const queryClient = useQueryClient();
  const enabled = options?.enabled ?? true;

  useEffect(() => {
    if (!enabled || !socket || !isConnected) return;

    const invalidate = () => {
      const keys = options?.queryKeys ?? [
        ["telecaller-dashboard-leads-all"],
        ["telecaller-dashboard-leads-period"],
        ["current-telecaller-target"],
        ["telecaller-targets-leaderboard"],
        ["leads"],
        ["counsellor-leads"],
      ];
      keys.forEach((key) =>
        queryClient.invalidateQueries({ queryKey: key, refetchType: "active" })
      );
    };

    const events = [
      "lead:created",
      "lead:updated",
      "lead:assigned",
      "lead:assigned:notify",
      "lead:transferred:notify",
      "lead:junked",
      "lead:reverted",
      "lead:bulk_imported",
      "lead:followup",
      "lead:converted",
      "lead:dropped",
      "lead:bulk_assigned",
      "lead:activity",
      "lead:activity_created",
      "lead:activity_updated",
    ];

    const handler = (event: string) => (payload: unknown) => {
      invalidate();
      options?.onLeadEvent?.(event, payload);
    };

    const handlers = events.map((ev) => {
      const fn = handler(ev);
      socket.on(ev, fn);
      return { ev, fn };
    });

    return () => {
      handlers.forEach(({ ev, fn }) => socket.off(ev, fn));
    };
  }, [socket, isConnected, enabled, queryClient, options?.onLeadEvent, options?.queryKeys]);
}

export type LeadAssignmentNotify = {
  lead: LeadEntity;
  telecallerId: number;
};
