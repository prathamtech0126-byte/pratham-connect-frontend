import { useEffect } from "react";
import { isFrontDeskRealtimeUser, useSocket } from "@/context/socket-context";
import { useAuth } from "@/context/auth-context";
import { MODULES_SOCKET } from "@/constants/modules-socket";

/** Join the per-lead socket room while a front desk detail view is open. */
export function useFrontDeskDetailRoom(leadId: number | null) {
  const { socket, isConnected } = useSocket();
  const { user } = useAuth();
  const eligible = isFrontDeskRealtimeUser(user?.role);

  useEffect(() => {
    if (!eligible || !socket || !isConnected || leadId == null) return;

    socket.emit(MODULES_SOCKET.subscribe.joinFrontDeskDetail, leadId);

    return () => {
      socket.emit(MODULES_SOCKET.subscribe.leaveFrontDeskDetail, leadId);
    };
  }, [eligible, socket, isConnected, leadId]);
}
