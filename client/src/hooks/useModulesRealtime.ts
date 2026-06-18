import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useSocket } from "@/context/socket-context";
import { useAuth } from "@/context/auth-context";
import { MODULES_SOCKET } from "@/constants/modules-socket";

/**
 * Joins the modules socket rooms and invalidates React Query caches when the
 * backend broadcasts refresh signals. Call once inside MainLayout so it covers
 * all logged-in pages without per-page wiring.
 *
 * Report queries invalidated: ops-dashboard, backend-report,
 * backend-reports-dashboard, visa-case-dashboard.
 *
 * Visa-case queries invalidated: visa-cases, visa-case-dashboard,
 * visa-case-by-client, document-requests, client-journey-timeline.
 */
export function useModulesRealtime() {
  const { socket, isConnected } = useSocket();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Join / leave module rooms whenever the socket connects or the user changes.
  useEffect(() => {
    if (!socket || !isConnected || !user) return;

    socket.emit(MODULES_SOCKET.subscribe.joinReports);
    socket.emit(MODULES_SOCKET.subscribe.joinVisaCase);

    return () => {
      socket.emit(MODULES_SOCKET.subscribe.leaveReports);
      socket.emit(MODULES_SOCKET.subscribe.leaveVisaCase);
    };
  }, [socket, isConnected, user]);

  // Invalidate report queries on refresh signal.
  useEffect(() => {
    if (!socket) return;

    const invalidateReports = () => {
      queryClient.invalidateQueries({ queryKey: ["ops-dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["backend-report"] });
      queryClient.invalidateQueries({ queryKey: ["backend-reports-dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["visa-case-dashboard"] });
    };

    socket.on(MODULES_SOCKET.events.reportsRefresh, invalidateReports);
    return () => {
      socket.off(MODULES_SOCKET.events.reportsRefresh, invalidateReports);
    };
  }, [socket, queryClient]);

  // Invalidate visa-case queries on any case-level event.
  useEffect(() => {
    if (!socket) return;

    const invalidateVisaCases = () => {
      queryClient.invalidateQueries({ queryKey: ["visa-cases"] });
      queryClient.invalidateQueries({ queryKey: ["visa-case-dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["visa-case-by-client"] });
      queryClient.invalidateQueries({ queryKey: ["document-requests"] });
      queryClient.invalidateQueries({ queryKey: ["client-journey-timeline"] });
    };

    socket.on(MODULES_SOCKET.events.visaCaseRefresh, invalidateVisaCases);
    socket.on(MODULES_SOCKET.events.visaCaseUpdated, invalidateVisaCases);
    socket.on(MODULES_SOCKET.events.visaCaseAssigned, invalidateVisaCases);

    return () => {
      socket.off(MODULES_SOCKET.events.visaCaseRefresh, invalidateVisaCases);
      socket.off(MODULES_SOCKET.events.visaCaseUpdated, invalidateVisaCases);
      socket.off(MODULES_SOCKET.events.visaCaseAssigned, invalidateVisaCases);
    };
  }, [socket, queryClient]);
}
