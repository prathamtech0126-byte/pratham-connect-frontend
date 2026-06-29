import React, { createContext, useContext, useEffect, useRef, useState, ReactNode } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from './auth-context';
import { MODULES_SOCKET } from '@/constants/modules-socket';

interface SocketContextType {
  socket: Socket | null;
  isConnected: boolean;
  connectionStatus: 'disconnected' | 'connecting' | 'connected' | 'error';
}

const SocketContext = createContext<SocketContextType | undefined>(undefined);

const resolveSocketUrl = (): string => {
  const raw = String(import.meta.env.VITE_API_URL ?? "").trim();
  if (raw) return raw.replace(/\/$/, "");

  if (typeof window !== "undefined") {
    const host = window.location.hostname;
    const isLocalhost =
      host === "localhost" ||
      host === "127.0.0.1" ||
      host.startsWith("192.168.") ||
      host.startsWith("10.") ||
      host.startsWith("172.");
    if (isLocalhost) {
      return `${window.location.protocol}//${host}:5006`;
    }
  }

  return "https://csm-backend-59rq.onrender.com";
};

const SOCKET_URL = resolveSocketUrl();

export function isFrontDeskRealtimeUser(role?: string | null): boolean {
  return role === "front_desk" || role === "developer";
}

/** Join role + user + modules frontdesk room (required for instant lead list updates). */
export function joinFrontDeskRealtimeRooms(
  socket: Socket,
  role: string,
  userId: number | string
): void {
  socket.emit("join:role", role);
  const uid = Number(userId);
  if (Number.isFinite(uid) && uid > 0) {
    socket.emit("join:user", uid);
  }
  socket.emit(MODULES_SOCKET.subscribe.joinFrontDesk);
}


export function SocketProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'disconnected' | 'connecting' | 'connected' | 'error'>('disconnected');
  const socketRef = useRef<Socket | null>(null);
  const counsellorIdRef = useRef<number | null>(null);
  const isAdminRoomJoinedRef = useRef<boolean>(false);

  useEffect(() => {
    // Only connect if user is logged in
    if (!user) {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
        setSocket(null);
        setIsConnected(false);
        setConnectionStatus('disconnected');
      }
      return;
    }

    // Determine socket URL based on environment
// WebSocket connections can't use proxy, so we need direct URL
// let SOCKET_URL = import.meta.env.VITE_API_URL ; // Default for localhost

// if (typeof window !== "undefined") {
//   const isLocalhost =
//     window.location.hostname === 'localhost' ||
//     window.location.hostname === '127.0.0.1' ||
//     window.location.hostname.startsWith('192.168.') ||
//     window.location.hostname.startsWith('10.') ||
//     window.location.hostname.startsWith('172.');

//   if (isLocalhost) {
//     // On localhost: always use localhost:5000 directly (WebSocket can't use proxy)
//     SOCKET_URL = import.meta.env.VITE_API_URL || "http://localhost:5000" || "https://csm-backend-59rq.onrender.com";
//   } else {
//     // In production: use environment variable or fallback to Render.com
//     SOCKET_URL = import.meta.env.VITE_API_URL || "https://csm-backend-59rq.onrender.com";
//   }
// } else {
//   // SSR fallback
//   SOCKET_URL = import.meta.env.VITE_API_URL || "https://csm-backend-59rq.onrender.com";
// }

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

    // Connect if user needs real-time updates or broadcast messages
    if (!isCounsellor && !isAdmin && !isTechSupport && !isTelecaller && !isBroadcastRecipient && !isCxUser && !isOpsTeam) {
      return;
    }

    // Check if we need to reconnect (only skip if already connected to the SAME user)
    // IMPORTANT: We need to reconnect if user changes or if role rooms aren't joined
    const currentUserId = user.id; // eslint-disable-line @typescript-eslint/no-unused-vars
    const shouldReconnect = !socketRef.current?.connected ||
                           (socketRef.current?.connected && socketRef.current.id && !isConnected);

    if (!shouldReconnect && socketRef.current?.connected && counsellorIdRef.current === counsellorId) {
      // Even if connected, ensure role rooms are joined (in case they weren't joined before)
      const socket = socketRef.current;
      if (isCounsellor) {
        if (counsellorId) {
          socket.emit('join:counsellor', counsellorId);
        }
        socket.emit('join:role', 'counsellor');
        const userId = Number(user.id);
        if (!isNaN(userId)) {
          socket.emit('join:user', userId);
        }
      } else if (isAdmin && user.role === 'manager') {
        socket.emit('join:role', 'manager');
        const userId = Number(user.id);
        if (!isNaN(userId)) {
          socket.emit('join:user', userId);
        }
      } else if (isBroadcastRecipient || isFrontDeskRealtimeUser(user.role)) {
        joinFrontDeskRealtimeRooms(socket, user.role, user.id);
      }
      return;
    }
    setConnectionStatus('connecting');

    // Create socket connection
    const newSocket = io(SOCKET_URL, {
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

        // Join user-specific room for individual messages
        const userId = Number(user.id);
        if (!isNaN(userId)) {
          setTimeout(() => {
            newSocket.emit('join:user', userId);
          }, 150);
        }
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

        if (isFrontDeskRealtimeUser(user.role)) {
          joinFrontDeskRealtimeRooms(newSocket, user.role, user.id);
        }

        // Join user-specific room for individual messages
        const userId = Number(user.id);
        if (!isNaN(userId)) {
          setTimeout(() => {
            newSocket.emit('join:user', userId);
          }, 150);
        }
      } else if (isTelecaller) {
        newSocket.emit('join:role', 'telecaller');
        const userId = Number(user.id);
        if (!isNaN(userId)) {
          newSocket.emit('join:user', userId);
        }
      } else if (isBroadcastRecipient) {
        joinFrontDeskRealtimeRooms(newSocket, user.role, user.id);
      } else if (isCxUser) {
        newSocket.emit('join:role', user.role);
        const userId = Number(user.id);
        if (!isNaN(userId)) {
          newSocket.emit('join:user', userId);
        }
      } else if (isOpsTeam) {
        newSocket.emit('join:role', user.role);
        const userId = Number(user.id);
        if (!isNaN(userId)) {
          newSocket.emit('join:user', userId);
        }
      } else if (isTechSupport) {
        // Tech support users need role + user rooms for request/ticket updates
        newSocket.emit('join:role', 'tech_support');
        const userId = Number(user.id);
        if (!isNaN(userId)) {
          newSocket.emit('join:user', userId);
        }
      } else if (user.role === 'manager') {
        // Manager (non-admin) - join role and user rooms for messages
        // NOTE: This branch should rarely execute since managers are usually considered admins
        setTimeout(() => {
          newSocket.emit('join:role', 'manager');
        }, 100);

        // Join user-specific room for individual messages
        const userId = Number(user.id);
        if (!isNaN(userId)) {
          setTimeout(() => {
            newSocket.emit('join:user', userId);
          }, 150);
        }
      }
    });

    newSocket.on('disconnect', () => {
      setIsConnected(false);
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
      // Notify listeners (e.g. maintenance context) that the socket reconnected
      // so they can re-fetch state that may have changed while disconnected.
      window.dispatchEvent(new Event('socket:reconnected'));

      // Rejoin room after reconnection
      if (isCounsellor) {
        if (counsellorId) {
          newSocket.emit('join:counsellor', counsellorId);
          counsellorIdRef.current = counsellorId;
        } else {
          counsellorIdRef.current = null;
        }
        isAdminRoomJoinedRef.current = false;

        // CRITICAL: Rejoin role-based room for broadcast messages
        newSocket.emit('join:role', 'counsellor');

        // Rejoin user-specific room for individual messages
        const userId = Number(user.id);
        if (!isNaN(userId)) {
          newSocket.emit('join:user', userId);
        }
      } else if (isAdmin) {
        newSocket.emit('join:admin');
        isAdminRoomJoinedRef.current = true;

        // Rejoin admin dashboard room
        newSocket.emit('join:dashboard');

        // CRITICAL: Rejoin role-based room for broadcast messages (if admin is also manager)
        if (user.role === 'manager') {
          newSocket.emit('join:role', 'manager');
        }

        if (isFrontDeskRealtimeUser(user.role)) {
          joinFrontDeskRealtimeRooms(newSocket, user.role, user.id);
        }

        // Rejoin user-specific room for individual messages
        const userId = Number(user.id);
        if (!isNaN(userId)) {
          newSocket.emit('join:user', userId);
        }
      } else if (isTelecaller) {
        newSocket.emit('join:role', 'telecaller');
        const userId = Number(user.id);
        if (!isNaN(userId)) {
          newSocket.emit('join:user', userId);
        }
      } else if (user.role === 'front_desk' || user.role === 'marketing_head') {
        joinFrontDeskRealtimeRooms(newSocket, user.role, user.id);
      } else if (isCxUser) {
        newSocket.emit('join:role', user.role);
        const userId = Number(user.id);
        if (!isNaN(userId)) {
          newSocket.emit('join:user', userId);
        }
      } else if (isOpsTeam) {
        newSocket.emit('join:role', user.role);
        const userId = Number(user.id);
        if (!isNaN(userId)) {
          newSocket.emit('join:user', userId);
        }
      } else if (isTechSupport) {
        newSocket.emit('join:role', 'tech_support');
        const userId = Number(user.id);
        if (!isNaN(userId)) {
          newSocket.emit('join:user', userId);
        }
      } else if (user.role === 'manager') {
        // Manager (non-admin) - rejoin role and user rooms for messages
        newSocket.emit('join:role', 'manager');

        // Rejoin user-specific room for individual messages
        const userId = Number(user.id);
        if (!isNaN(userId)) {
          newSocket.emit('join:user', userId);
        }
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
      setConnectionStatus('disconnected');
    };
  }, [user]);

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

      if (isCounsellor) {
        if (counsellorId) {
          socket.emit('join:counsellor', counsellorId);
        }
        socket.emit('join:role', 'counsellor');
        const userId = Number(user.id);
        if (!isNaN(userId)) {
          socket.emit('join:user', userId);
        }
      } else if (isTelecaller2) {
        socket.emit('join:role', 'telecaller');
        const userId = Number(user.id);
        if (!isNaN(userId)) {
          socket.emit('join:user', userId);
        }
      } else if (isBroadcastRecipient2 || isFrontDeskRealtimeUser(user.role)) {
        joinFrontDeskRealtimeRooms(socket, user.role, user.id);
      } else if (isCxUser2) {
        socket.emit('join:role', user.role);
        const userId = Number(user.id);
        if (!isNaN(userId)) {
          socket.emit('join:user', userId);
        }
      } else if (isOpsTeam2) {
        socket.emit('join:role', user.role);
        const userId = Number(user.id);
        if (!isNaN(userId)) {
          socket.emit('join:user', userId);
        }
      } else if (isAdmin) {
        socket.emit('join:admin');
        socket.emit('join:role', user.role);

        const userId = Number(user.id);
        if (!isNaN(userId)) {
          socket.emit('join:user', userId);
        }
      } else if (isTechSupport) {
        socket.emit('join:role', 'tech_support');
        const userId = Number(user.id);
        if (!isNaN(userId)) {
          socket.emit('join:user', userId);
        }
      }
    };

    // Try multiple times to ensure it works
    setTimeout(() => ensureRoleRoomsJoined(), 500);
    setTimeout(() => ensureRoleRoomsJoined(), 1500);
    setTimeout(() => ensureRoleRoomsJoined(), 3000);
  }, [user, isConnected]);

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
      setConnectionStatus('disconnected');
    }
  }, [user]);

  return (
    <SocketContext.Provider value={{ socket, isConnected, connectionStatus }}>
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
