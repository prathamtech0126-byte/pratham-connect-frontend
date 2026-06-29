import React, { createContext, useContext, useEffect, useRef, useState, ReactNode, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from './auth-context';

interface SocketContextType {
  socket: Socket | null;
  isConnected: boolean;
  isUserRoomJoined: boolean;
  connectionStatus: 'disconnected' | 'connecting' | 'connected' | 'error';
}

const SocketContext = createContext<SocketContextType | undefined>(undefined);

type JoinUserAck = {
  success: boolean;
  room?: string;
  socketCount?: number;
  error?: string;
};

function isLocalDevHost(): boolean {
  if (typeof window === 'undefined') return false;
  const hostname = window.location.hostname;
  return (
    hostname === 'localhost' ||
    hostname === '127.0.0.1' ||
    hostname.startsWith('192.168.') ||
    hostname.startsWith('10.') ||
    hostname.startsWith('172.')
  );
}

/** Mirror api.ts: use Vite proxy origin in local dev, direct API URL in production. */
function resolveSocketUrl(): string {
  if (typeof window !== 'undefined' && isLocalDevHost()) {
    return window.location.origin;
  }
  return import.meta.env.VITE_API_URL || 'https://csm-backend-59rq.onrender.com';
}

function emitJoinUser(
  socket: Socket,
  userId: number,
  onJoined?: (joined: boolean) => void
): void {
  if (!Number.isFinite(userId) || userId <= 0) {
    onJoined?.(false);
    return;
  }
  socket.emit('join:user', userId, (ack: JoinUserAck) => {
    onJoined?.(ack?.success === true);
  });
}


export function SocketProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isUserRoomJoined, setIsUserRoomJoined] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'disconnected' | 'connecting' | 'connected' | 'error'>('disconnected');
  const socketRef = useRef<Socket | null>(null);
  const counsellorIdRef = useRef<number | null>(null);
  const isAdminRoomJoinedRef = useRef<boolean>(false);
  const connectedUserIdRef = useRef<string | null>(null);

  const joinUserRoom = useCallback((activeSocket: Socket, userId: number) => {
    emitJoinUser(activeSocket, userId, (joined) => {
      setIsUserRoomJoined(joined);
    });
  }, []);

  useEffect(() => {
    // Only connect if user is logged in
    if (!user) {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
        setSocket(null);
        setIsConnected(false);
        setIsUserRoomJoined(false);
        setConnectionStatus('disconnected');
        connectedUserIdRef.current = null;
      }
      return;
    }

    const socketUrl = resolveSocketUrl();
    // Get counsellorId from user.id (convert string to number) - only for counsellors
    const isCounsellor = user.role === 'counsellor';
    const isTelecaller = user.role === 'telecaller';
    const rawCounsellorId = isCounsellor ? Number(user.id) : null;
    const counsellorId = Number.isFinite(rawCounsellorId as number) ? (rawCounsellorId as number) : null;

    // Admin users (superadmin, manager, director) can also connect to socket for real-time updates
    const isAdmin =
      user.role === 'superadmin' ||
      user.role === 'developer' ||
      user.role === 'manager' ||
      user.role === 'director' ||
      user.role === 'admin';
    const isTechSupport = user.role === 'tech_support';
    const isBroadcastRecipient =
      user.role === 'front_desk' || user.role === 'marketing_head';
    const isCxUser =
      user.role === 'customer_experience' || user.role === 'cx';
    const isOpsTeam =
      user.role === 'binding_team' ||
      user.role === 'application_team' ||
      user.role === 'binding' ||
      user.role === 'application';

    const userId = Number(user.id);

    // Check if we need to reconnect (only skip if already connected to the SAME user)
    // IMPORTANT: We need to reconnect if user changes or if role rooms aren't joined
    const currentUserId = user.id; // eslint-disable-line @typescript-eslint/no-unused-vars
    const shouldReconnect =
      !socketRef.current?.connected ||
      connectedUserIdRef.current !== user.id ||
      (socketRef.current?.connected && socketRef.current.id && !isConnected);

    if (!shouldReconnect && socketRef.current?.connected && counsellorIdRef.current === counsellorId) {
      // Already connected — re-join rooms so notification delivery is not missed after re-renders.
      const activeSocket = socketRef.current;
      const ensureUserId = Number(user.id);
      joinUserRoom(activeSocket, ensureUserId);
      if (isCounsellor) {
        if (counsellorId) {
          activeSocket.emit('join:counsellor', counsellorId);
        }
        activeSocket.emit('join:role', 'counsellor');
      } else if (isTelecaller) {
        activeSocket.emit('join:role', 'telecaller');
      } else if (isAdmin) {
        activeSocket.emit('join:admin');
        activeSocket.emit('join:role', user.role);
      } else if (isBroadcastRecipient) {
        activeSocket.emit('join:role', user.role);
      } else if (isCxUser) {
        activeSocket.emit('join:role', user.role);
      } else if (isOpsTeam) {
        activeSocket.emit('join:role', user.role);
      } else if (isTechSupport) {
        activeSocket.emit('join:role', 'tech_support');
      } else if (user.role) {
        activeSocket.emit('join:role', user.role);
      }
      return;
    }
    setConnectionStatus('connecting');
    setIsUserRoomJoined(false);

    // Create socket connection
    const newSocket = io(socketUrl, {
      path: '/socket.io',
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: Infinity,
      reconnectionDelayMax: 10000,
    });

    // Connection event handlers
    newSocket.on('connect', () => {
      setIsConnected(true);
      setConnectionStatus('connected');
      connectedUserIdRef.current = user.id;

      joinUserRoom(newSocket, userId);

      // Join counsellor room (only for counsellors)
      if (isCounsellor) {
        if (counsellorId) {
          newSocket.emit('join:counsellor', counsellorId);
          counsellorIdRef.current = counsellorId;
        } else {
          counsellorIdRef.current = null;
        }
        isAdminRoomJoinedRef.current = false;

        // Listen for confirmation that room was joined
        newSocket.once('joined:counsellor', () => {});

        // Join role-based room for broadcast messages (CRITICAL for message system)
        // Retry mechanism to ensure join happens
        const joinRoleRoom = (attempt = 1) => {
          if (attempt > 5) {
            return;
          }

          if (!newSocket.connected) {
            setTimeout(() => joinRoleRoom(attempt + 1), 500);
            return;
          }

          // Listen for backend confirmation BEFORE emitting
          const confirmationListener = () => {
            newSocket.off('joined:role', confirmationListener);
          };
          newSocket.on('joined:role', confirmationListener);

          // Also listen for any errors
          const errorListener = () => {
            newSocket.off('error', errorListener);
          };
          newSocket.once('error', errorListener);

          // Emit with callback (if backend supports it)
          newSocket.emit('join:role', 'counsellor');

          // Retry if no confirmation (backend should log it)
          if (attempt < 3) {
            setTimeout(() => {
              newSocket.off('joined:role', confirmationListener);
              newSocket.off('error', errorListener);
              joinRoleRoom(attempt + 1);
            }, 2000);
          } else {
            // Clean up listeners after final attempt
            setTimeout(() => {
              newSocket.off('joined:role', confirmationListener);
              newSocket.off('error', errorListener);
            }, 3000);
          }
        };

        // Start joining after a short delay
        setTimeout(() => joinRoleRoom(1), 300);
      } else if (isAdmin) {
        newSocket.emit('join:admin');
        isAdminRoomJoinedRef.current = true;
        counsellorIdRef.current = null;

        // Also join admin dashboard room for real-time dashboard updates
        newSocket.emit('join:dashboard');

        // CRITICAL: Join role-based room for broadcast messages (All admin roles: superadmin, director, manager)
        const joinRoleRoom = (roleName: string, attempt = 1) => {
          if (attempt > 5) return;
          if (!newSocket.connected) {
            setTimeout(() => joinRoleRoom(roleName, attempt + 1), 500);
            return;
          }
          newSocket.emit('join:role', roleName);
        };
        
        // Join the specific role room (e.g., 'superadmin', 'manager', 'director')
        joinRoleRoom(user.role);
      } else if (isTelecaller) {
        newSocket.emit('join:role', 'telecaller');
      } else if (isBroadcastRecipient) {
        newSocket.emit('join:role', user.role);
      } else if (isCxUser) {
        newSocket.emit('join:role', user.role);
      } else if (isOpsTeam) {
        newSocket.emit('join:role', user.role);
      } else if (isTechSupport) {
        newSocket.emit('join:role', 'tech_support');
      } else if (user.role) {
        newSocket.emit('join:role', user.role);
      }
    });

    newSocket.on('disconnect', () => {
      setIsConnected(false);
      setIsUserRoomJoined(false);
      setConnectionStatus('disconnected');
      counsellorIdRef.current = null;
    });

    newSocket.on('connect_error', () => {
      setConnectionStatus('error');
      setIsConnected(false);
    });

    newSocket.on('reconnect', () => {
      setIsConnected(true);
      setConnectionStatus('connected');
      window.dispatchEvent(new Event('socket:reconnected'));

      joinUserRoom(newSocket, Number(user.id));

      // Rejoin room after reconnection
      if (isCounsellor) {
        if (counsellorId) {
          newSocket.emit('join:counsellor', counsellorId);
          counsellorIdRef.current = counsellorId;
        } else {
          counsellorIdRef.current = null;
        }
        isAdminRoomJoinedRef.current = false;
        newSocket.emit('join:role', 'counsellor');
      } else if (isAdmin) {
        newSocket.emit('join:admin');
        isAdminRoomJoinedRef.current = true;
        newSocket.emit('join:dashboard');
        if (user.role === 'manager') {
          newSocket.emit('join:role', 'manager');
        }
      } else if (isTelecaller) {
        newSocket.emit('join:role', 'telecaller');
      } else if (user.role === 'front_desk' || user.role === 'marketing_head') {
        newSocket.emit('join:role', user.role);
      } else if (isCxUser) {
        newSocket.emit('join:role', user.role);
      } else if (isOpsTeam) {
        newSocket.emit('join:role', user.role);
      } else if (isTechSupport) {
        newSocket.emit('join:role', 'tech_support');
      } else if (user.role) {
        newSocket.emit('join:role', user.role);
      }
    });

    newSocket.on('reconnect_error', () => {
      setConnectionStatus('error');
    });

    newSocket.on('reconnect_failed', () => {
      setConnectionStatus('error');
    });

    newSocket.on('maintenance:changed', (data: {
      isActive: boolean;
      armed?: boolean;
      startTime?: string | null;
      endTime?: string | null;
      isScheduled?: boolean;
    }) => {
      window.dispatchEvent(new CustomEvent('maintenance:changed', { detail: data }));
    });

    socketRef.current = newSocket;
    setSocket(newSocket);

    // Cleanup on unmount or user change
    return () => {
      if (counsellorIdRef.current) {
        newSocket.emit('leave:counsellor', counsellorIdRef.current);
        counsellorIdRef.current = null;
      }
      if (isAdminRoomJoinedRef.current) {
        newSocket.emit('leave:admin');
        isAdminRoomJoinedRef.current = false;
      }
      newSocket.disconnect();
      socketRef.current = null;
      setSocket(null);
      setIsConnected(false);
      setIsUserRoomJoined(false);
      setConnectionStatus('disconnected');
      connectedUserIdRef.current = null;
    };
  }, [user?.id, user?.role, joinUserRoom]);

  // CRITICAL: Ensure role rooms are joined whenever socket is connected
  // This handles cases where connection happens but role rooms weren't joined
  useEffect(() => {
    if (!user || !socketRef.current || !isConnected) {
      return;
    }

    const socket = socketRef.current;
    const isCounsellor = user.role === 'counsellor';
    const isTelecaller2 = user.role === 'telecaller';
    const rawCounsellorId = isCounsellor ? Number(user.id) : null;
    const counsellorId = Number.isFinite(rawCounsellorId as number) ? (rawCounsellorId as number) : null;
    const isAdmin =
      user.role === 'superadmin' ||
      user.role === 'developer' ||
      user.role === 'manager' ||
      user.role === 'director' ||
      user.role === 'admin';
    const isTechSupport = user.role === 'tech_support';
    const isBroadcastRecipient2 =
      user.role === 'front_desk' || user.role === 'marketing_head';
    const isCxUser2 =
      user.role === 'customer_experience' || user.role === 'cx';
    const isOpsTeam2 =
      user.role === 'binding_team' ||
      user.role === 'application_team' ||
      user.role === 'binding' ||
      user.role === 'application';

    // Ensure role rooms are joined for message system (with delay to ensure socket is ready)
    // This is a safety mechanism that runs whenever socket connects
    const ensureRoleRoomsJoined = () => {
      if (!socket.connected) {
        return;
      }

      const ensureUserId = Number(user.id);

      if (isCounsellor) {
        if (counsellorId) {
          socket.emit('join:counsellor', counsellorId);
        }
        socket.emit('join:role', 'counsellor');
        joinUserRoom(socket, Number(user.id));
      } else if (isTelecaller2) {
        socket.emit('join:role', 'telecaller');
        joinUserRoom(socket, Number(user.id));
      } else if (isBroadcastRecipient2) {
        socket.emit('join:role', user.role);
        joinUserRoom(socket, Number(user.id));
      } else if (isCxUser2) {
        socket.emit('join:role', user.role);
        joinUserRoom(socket, Number(user.id));
      } else if (isOpsTeam2) {
        socket.emit('join:role', user.role);
        joinUserRoom(socket, Number(user.id));
      } else if (isAdmin) {
        socket.emit('join:admin');
        socket.emit('join:role', user.role);
        joinUserRoom(socket, Number(user.id));
      } else if (isTechSupport) {
        socket.emit('join:role', 'tech_support');
        joinUserRoom(socket, ensureUserId);
      } else if (user.role) {
        socket.emit('join:role', user.role);
        joinUserRoom(socket, ensureUserId);
      }
    };

    // Try multiple times to ensure it works
    setTimeout(() => ensureRoleRoomsJoined(), 500);
    setTimeout(() => ensureRoleRoomsJoined(), 1500);
    setTimeout(() => ensureRoleRoomsJoined(), 3000);
  }, [user?.id, user?.role, isConnected, joinUserRoom]);

  // Handle logout - disconnect socket
  useEffect(() => {
    if (!user && socketRef.current) {
      if (counsellorIdRef.current) {
        socketRef.current.emit('leave:counsellor', counsellorIdRef.current);
        counsellorIdRef.current = null;
      }
      if (isAdminRoomJoinedRef.current) {
        socketRef.current.emit('leave:admin');
        isAdminRoomJoinedRef.current = false;
      }
      socketRef.current.disconnect();
      socketRef.current = null;
      setSocket(null);
      setIsConnected(false);
      setIsUserRoomJoined(false);
      setConnectionStatus('disconnected');
      connectedUserIdRef.current = null;
    }
  }, [user]);

  return (
    <SocketContext.Provider value={{ socket, isConnected, isUserRoomJoined, connectionStatus }}>
      {children}
    </SocketContext.Provider>
  );
}

export function useSocket() {
  const context = useContext(SocketContext);
  if (context === undefined) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
}
