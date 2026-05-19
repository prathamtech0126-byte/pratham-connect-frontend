import { useState, useEffect } from 'react';
import { useSocket } from '@/context/socket-context';
import { Wifi, WifiOff } from 'lucide-react';
import { cn } from '@/lib/utils';

export const ConnectionStatus = () => {
  const { isConnected, connectionStatus } = useSocket();
  const [showTooltip, setShowTooltip] = useState(false);

  if (isConnected && connectionStatus === 'connected') {
    return (
      <div
        className="flex items-center gap-2 text-green-600 dark:text-green-400 text-sm"
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
      >
        <Wifi className="w-4 h-4" />
        <span className="hidden md:inline">Connected</span>
        {showTooltip && (
          <div className="absolute bottom-full mb-2 px-2 py-1 bg-gray-900 text-white text-xs rounded whitespace-nowrap">
            WebSocket connected - Real-time messages enabled
          </div>
        )}
      </div>
    );
  }

  return (
    <div
      className="flex items-center gap-2 text-red-600 dark:text-red-400 text-sm"
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      <WifiOff className="w-4 h-4" />
      <span className="hidden md:inline">Disconnected</span>
      {showTooltip && (
        <div className="absolute bottom-full mb-2 px-2 py-1 bg-gray-900 text-white text-xs rounded whitespace-nowrap">
          WebSocket disconnected - Using polling fallback (5s interval)
        </div>
      )}
    </div>
  );
};
