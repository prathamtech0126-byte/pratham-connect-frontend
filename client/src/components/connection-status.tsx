import { useState } from "react";
import { useSocket } from "@/context/socket-context";
import { useNotifications } from "@/notification/context/notification-context";
import { Wifi, WifiOff } from "lucide-react";

export const ConnectionStatus = () => {
  const { isConnected, connectionStatus } = useSocket();
  const { realtimeMeta } = useNotifications();
  const [showTooltip, setShowTooltip] = useState(false);

  if (isConnected && connectionStatus === "connected") {
    return (
      <div
        className="relative flex items-center gap-2 text-green-600 dark:text-green-400 text-sm"
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
      >
        <Wifi className="w-4 h-4" />
        <span className="hidden md:inline">Live</span>
        {showTooltip && (
          <div className="absolute bottom-full left-0 mb-2 z-50 px-2 py-1 bg-gray-900 text-white text-xs rounded whitespace-nowrap">
            Socket.io realtime
            {realtimeMeta?.redis ? " · Redis enabled" : ""}
            {realtimeMeta?.polling === false ? " · no polling" : ""}
          </div>
        )}
      </div>
    );
  }

  return (
    <div
      className="relative flex items-center gap-2 text-red-600 dark:text-red-400 text-sm"
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      <WifiOff className="w-4 h-4" />
      <span className="hidden md:inline">Offline</span>
      {showTooltip && (
        <div className="absolute bottom-full left-0 mb-2 z-50 px-2 py-1 bg-gray-900 text-white text-xs rounded whitespace-nowrap">
          Socket disconnected — notifications resume when reconnected
        </div>
      )}
    </div>
  );
};
