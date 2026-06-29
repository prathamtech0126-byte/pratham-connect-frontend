import { useEffect, useRef } from "react";
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
  const onLeadEventRef = useRef(options?.onLeadEvent);
  const queryKeysRef = useRef(options?.queryKeys);

  useEffect(() => {
    onLeadEventRef.current = options?.onLeadEvent;
  }, [options?.onLeadEvent]);

  useEffect(() => {
    queryKeysRef.current = options?.queryKeys;
  }, [options?.queryKeys]);

  useEffect(() => {
    if (!enabled || !socket || !isConnected) return;

    const invalidate = () => {
      const keys = queryKeysRef.current;
      if (!keys || keys.length === 0) return;
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
      onLeadEventRef.current?.(event, payload);
    };

    const handlers = events.map((ev) => {
      const fn = handler(ev);
      socket.on(ev, fn);
      return { ev, fn };
    });

    return () => {
      handlers.forEach(({ ev, fn }) => socket.off(ev, fn));
    };
  }, [socket, isConnected, enabled, queryClient]);
}

export type LeadAssignmentNotify = {
  lead: LeadEntity;
  telecallerId: number;
};
