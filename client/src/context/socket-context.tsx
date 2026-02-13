import React, { createContext, useContext, useEffect, useRef, useState, ReactNode } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from './auth-context';

interface SocketContextType {
  socket: Socket | null;
  isConnected: boolean;
  connectionStatus: 'disconnected' | 'connecting' | 'connected' | 'error';
}

const SocketContext = createContext<SocketContextType | undefined>(undefined);

// Determine socket URL based on environment
// WebSocket connections can't use proxy, so we need direct URL
let SOCKET_URL = import.meta.env.VITE_API_URL || "http://localhost:5000"; // Default for localhost

if (typeof window !== "undefined") {
  const isLocalhost =
    window.location.hostname === 'localhost' ||
    window.location.hostname === '127.0.0.1' ||
    window.location.hostname.startsWith('192.168.') ||
    window.location.hostname.startsWith('10.') ||
    window.location.hostname.startsWith('172.');

  if (isLocalhost) {
    // On localhost: always use localhost:5000 directly (WebSocket can't use proxy)
    SOCKET_URL = import.meta.env.VITE_API_URL || "http://localhost:5000" || "https://csm-backend-59rq.onrender.com";
  } else {
    // In production: use environment variable or fallback to Render.com
    SOCKET_URL = import.meta.env.VITE_API_URL || "https://csm-backend-59rq.onrender.com";
  }
} else {
  // SSR fallback
  SOCKET_URL = import.meta.env.VITE_API_URL || "https://csm-backend-59rq.onrender.com";
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

    // Get counsellorId from user.id (convert string to number) - only for counsellors
    const counsellorId = user.role === 'counsellor' ? Number(user.id) : null;

    // Admin users (superadmin, manager, director) can also connect to socket for real-time updates
    const isAdmin = user.role === 'superadmin' || user.role === 'manager' || user.role === 'director';

    // Connect if user is counsellor or admin
    if (!counsellorId && !isAdmin) {
      return;
    }

    // Check if we need to reconnect (only skip if already connected to the SAME user)
    // IMPORTANT: We need to reconnect if user changes or if role rooms aren't joined
    const currentUserId = user.id;
    const shouldReconnect = !socketRef.current?.connected ||
                           (socketRef.current?.connected && socketRef.current.id && !isConnected);

    if (!shouldReconnect && socketRef.current?.connected && counsellorIdRef.current === counsellorId) {
      // Even if connected, ensure role rooms are joined (in case they weren't joined before)
      const socket = socketRef.current;
      if (counsellorId) {
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
      }
      return;
    }
    setConnectionStatus('connecting');

    // Create socket connection
    const newSocket = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5,
      reconnectionDelayMax: 5000,
    });

    // Connection event handlers
    newSocket.on('connect', () => {
      setIsConnected(true);
      setConnectionStatus('connected');

      // Join counsellor room (only for counsellors)
      if (counsellorId) {
        newSocket.emit('join:counsellor', counsellorId);
        counsellorIdRef.current = counsellorId;
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

        // CRITICAL: Join role-based room for broadcast messages (if admin is also manager)
        // This ensures managers receive broadcast messages even if they're admins
        if (user.role === 'manager') {
          // Retry mechanism to ensure join happens
          const joinManagerRoleRoom = (attempt = 1) => {
            if (attempt > 5) {
              return;
            }

            if (!newSocket.connected) {
              setTimeout(() => joinManagerRoleRoom(attempt + 1), 500);
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
            newSocket.emit('join:role', 'manager');

            // Retry if no confirmation (backend should log it)
            if (attempt < 3) {
              setTimeout(() => {
                newSocket.off('joined:role', confirmationListener);
                newSocket.off('error', errorListener);
                joinManagerRoleRoom(attempt + 1);
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
          setTimeout(() => joinManagerRoleRoom(1), 300);
        }

        // Join user-specific room for individual messages
        const userId = Number(user.id);
        if (!isNaN(userId)) {
          setTimeout(() => {
            newSocket.emit('join:user', userId);
          }, 150);
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

      // Rejoin room after reconnection
      if (counsellorId) {
        newSocket.emit('join:counsellor', counsellorId);
        counsellorIdRef.current = counsellorId;
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

        // Rejoin user-specific room for individual messages
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
    const counsellorId = user.role === 'counsellor' ? Number(user.id) : null;
    const isAdmin = user.role === 'superadmin' || user.role === 'manager' || user.role === 'director';

    // Ensure role rooms are joined for message system (with delay to ensure socket is ready)
    // This is a safety mechanism that runs whenever socket connects
    const ensureRoleRoomsJoined = () => {
      if (!socket.connected) {
        return;
      }

      if (counsellorId) {
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
