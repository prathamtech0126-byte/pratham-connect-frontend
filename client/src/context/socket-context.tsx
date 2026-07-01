import React, { createContext, useContext, useEffect, useRef, useState, ReactNode, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from './auth-context';
import { MODULES_SOCKET } from '@/constants/modules-socket';

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

/** Local dev: Vite proxy origin. Production: VITE_API_URL or fallback. */
function resolveSocketUrl(): string {
  if (typeof window !== 'undefined' && isLocalDevHost()) {
    const raw = String(import.meta.env.VITE_API_URL ?? '').trim();
    if (raw) return raw.replace(/\/$/, '');
    return window.location.origin;
  }
  const raw = String(import.meta.env.VITE_API_URL ?? '').trim();
  if (raw) return raw.replace(/\/$/, '');
  return 'https://csm-backend-59rq.onrender.com';
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

export function isFrontDeskRealtimeUser(role?: string | null): boolean {
  return role === 'front_desk' || role === 'developer';
}

/** Join role + user + modules frontdesk room (required for instant lead list updates). */
export function joinFrontDeskRealtimeRooms(
  socket: Socket,
  role: string,
  _userId?: number | string
): void {
  socket.emit('join:role', role);
  // join:user is handled once via joinUserRoom() on connect/reconnect.
  socket.emit(MODULES_SOCKET.subscribe.joinFrontDesk);
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
    const isCounsellor = user.role === 'counsellor';
    const isTelecaller = user.role === 'telecaller';
    const rawCounsellorId = isCounsellor ? Number(user.id) : null;
    const counsellorId = Number.isFinite(rawCounsellorId as number) ? (rawCounsellorId as number) : null;

    const isAdmin =
      user.role === 'superadmin' ||
      user.role === 'developer' ||
      user.role === 'manager' ||
      user.role === 'director' ||
      user.role === 'admin';
    const isTechSupport = user.role === 'tech_support';
    const isBroadcastRecipient =
      user.role === 'front_desk' || user.role === 'marketing_head';
    const isCxUser = user.role === 'customer_experience';
    const isOpsTeam =
      user.role === 'binding_team' ||
      user.role === 'application_team';

    const userId = Number(user.id);

    const shouldReconnect =
      !socketRef.current?.connected ||
      connectedUserIdRef.current !== user.id ||
      (socketRef.current?.connected && socketRef.current.id && !isConnected);

    if (!shouldReconnect && socketRef.current?.connected && counsellorIdRef.current === counsellorId) {
      const socket = socketRef.current;
      const ensureUserId = Number(user.id);
      joinUserRoom(socket, ensureUserId);
      if (isCounsellor) {
        if (counsellorId) {
          socket.emit('join:counsellor', counsellorId);
        }
        socket.emit('join:role', 'counsellor');
      } else if (isTelecaller) {
        socket.emit('join:role', 'telecaller');
      } else if (isAdmin) {
        socket.emit('join:admin');
        socket.emit('join:role', user.role);
        if (isFrontDeskRealtimeUser(user.role)) {
          joinFrontDeskRealtimeRooms(socket, user.role, user.id);
        }
      } else if (isBroadcastRecipient || isFrontDeskRealtimeUser(user.role)) {
        joinFrontDeskRealtimeRooms(socket, user.role, user.id);
      } else if (isCxUser) {
        socket.emit('join:role', user.role);
      } else if (isOpsTeam) {
        socket.emit('join:role', user.role);
      } else if (isTechSupport) {
        socket.emit('join:role', 'tech_support');
      } else if (user.role) {
        socket.emit('join:role', user.role);
      }
      return;
    }
    setConnectionStatus('connecting');
    setIsUserRoomJoined(false);

    const newSocket = io(socketUrl, {
      path: '/socket.io',
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: Infinity,
      reconnectionDelayMax: 10000,
    });

    newSocket.on('connect', () => {
      setIsConnected(true);
      setConnectionStatus('connected');
      connectedUserIdRef.current = user.id;

      joinUserRoom(newSocket, userId);

      if (isCounsellor) {
        if (counsellorId) {
          newSocket.emit('join:counsellor', counsellorId);
          counsellorIdRef.current = counsellorId;
        } else {
          counsellorIdRef.current = null;
        }
        isAdminRoomJoinedRef.current = false;

        newSocket.once('joined:counsellor', () => {});

        const joinRoleRoom = (attempt = 1) => {
          if (attempt > 5) {
            return;
          }

          if (!newSocket.connected) {
            setTimeout(() => joinRoleRoom(attempt + 1), 500);
            return;
          }

          const confirmationListener = () => {
            newSocket.off('joined:role', confirmationListener);
          };
          newSocket.on('joined:role', confirmationListener);

          const errorListener = () => {
            newSocket.off('error', errorListener);
          };
          newSocket.once('error', errorListener);

          newSocket.emit('join:role', 'counsellor');

          if (attempt < 3) {
            setTimeout(() => {
              newSocket.off('joined:role', confirmationListener);
              newSocket.off('error', errorListener);
              joinRoleRoom(attempt + 1);
            }, 2000);
          } else {
            setTimeout(() => {
              newSocket.off('joined:role', confirmationListener);
              newSocket.off('error', errorListener);
            }, 3000);
          }
        };

        setTimeout(() => joinRoleRoom(1), 300);
      } else if (isAdmin) {
        newSocket.emit('join:admin');
        isAdminRoomJoinedRef.current = true;
        counsellorIdRef.current = null;

        newSocket.emit('join:dashboard');

        const joinRoleRoom = (roleName: string, attempt = 1) => {
          if (attempt > 5) return;
          if (!newSocket.connected) {
            setTimeout(() => joinRoleRoom(roleName, attempt + 1), 500);
            return;
          }
          newSocket.emit('join:role', roleName);
        };

        joinRoleRoom(user.role);

        if (isFrontDeskRealtimeUser(user.role)) {
          joinFrontDeskRealtimeRooms(newSocket, user.role, user.id);
        }
      } else if (isTelecaller) {
        newSocket.emit('join:role', 'telecaller');
      } else if (isBroadcastRecipient || isFrontDeskRealtimeUser(user.role)) {
        joinFrontDeskRealtimeRooms(newSocket, user.role, user.id);
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
        newSocket.emit('join:role', user.role);

        if (isFrontDeskRealtimeUser(user.role)) {
          joinFrontDeskRealtimeRooms(newSocket, user.role, user.id);
        }
      } else if (isTelecaller) {
        newSocket.emit('join:role', 'telecaller');
      } else if (isBroadcastRecipient || isFrontDeskRealtimeUser(user.role)) {
        joinFrontDeskRealtimeRooms(newSocket, user.role, user.id);
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
    const isCxUser2 = user.role === 'customer_experience';
    const isOpsTeam2 =
      user.role === 'binding_team' ||
      user.role === 'application_team';

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
        joinUserRoom(socket, ensureUserId);
      } else if (isTelecaller2) {
        socket.emit('join:role', 'telecaller');
        const telecallerUserId = Number(user.id);
        if (!isNaN(telecallerUserId)) {
          socket.emit('join:user', telecallerUserId);
        }
        joinUserRoom(socket, ensureUserId);
      } else if (isBroadcastRecipient2 || isFrontDeskRealtimeUser(user.role)) {
        joinFrontDeskRealtimeRooms(socket, user.role, user.id);
        joinUserRoom(socket, ensureUserId);
      } else if (isCxUser2) {
        socket.emit('join:role', user.role);
        const cxUserId = Number(user.id);
        if (!isNaN(cxUserId)) {
          socket.emit('join:user', cxUserId);
        }
        joinUserRoom(socket, ensureUserId);
      } else if (isOpsTeam2) {
        socket.emit('join:role', user.role);
        const opsUserId = Number(user.id);
        if (!isNaN(opsUserId)) {
          socket.emit('join:user', opsUserId);
        }
        joinUserRoom(socket, ensureUserId);
      } else if (isAdmin) {
        socket.emit('join:admin');
        socket.emit('join:role', user.role);
        const adminUserId = Number(user.id);
        if (!isNaN(adminUserId)) {
          socket.emit('join:user', adminUserId);
        }
        joinUserRoom(socket, ensureUserId);
        if (isFrontDeskRealtimeUser(user.role)) {
          joinFrontDeskRealtimeRooms(socket, user.role, user.id);
        }
      } else if (isTechSupport) {
        socket.emit('join:role', 'tech_support');
        const techUserId = Number(user.id);
        if (!isNaN(techUserId)) {
          socket.emit('join:user', techUserId);
        }
        joinUserRoom(socket, ensureUserId);
      } else if (user.role) {
        socket.emit('join:role', user.role);
        joinUserRoom(socket, ensureUserId);
      }
    };

    setTimeout(() => ensureRoleRoomsJoined(), 500);
    setTimeout(() => ensureRoleRoomsJoined(), 1500);
    setTimeout(() => ensureRoleRoomsJoined(), 3000);
  }, [user?.id, user?.role, isConnected, joinUserRoom]);

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
