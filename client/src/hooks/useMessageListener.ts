import { useEffect, useRef } from 'react';
import { useSocket } from '@/context/socket-context';
import { useAuth } from '@/context/auth-context';

export const useMessageListener = (onMessageReceived: (message: any) => void) => {
  const { socket, isConnected } = useSocket();
  const { user } = useAuth();
  const callbackRef = useRef(onMessageReceived);

  // Update callback ref when it changes
  useEffect(() => {
    callbackRef.current = onMessageReceived;
  }, [onMessageReceived]);

  useEffect(() => {
    if (!user) {
      return;
    }

    // Listen for messages if user is Manager, Counsellor, or Admin
    const listensForBroadcast =
      user.role === 'manager' ||
      user.role === 'counsellor' ||
      user.role === 'superadmin' ||
      user.role === 'director' ||
      user.role === 'telecaller' ||
      user.role === 'front_desk' ||
      user.role === 'marketing_head';

    if (!listensForBroadcast) {
      return;
    }

    // Only listen if socket is connected
    if (!socket || !isConnected) {
      return;
    }

    // console.log('[MessageListener] Setting up message listeners for user:', user.id, 'role:', user.role);

    // Listen for BROADCAST messages (sent to all managers/counsellors)
    const handleBroadcastMessage = (messageData: any) => {
      // console.log('📨 [MessageListener] ✅✅✅ BROADCAST MESSAGE RECEIVED ✅✅✅');
      // console.log('[MessageListener] Message data:', messageData);
      // console.log('[MessageListener] User role:', user.role, '| User ID:', user.id);
      callbackRef.current({
        ...messageData,
        type: 'broadcast',
      });
    };

    // Listen for INDIVIDUAL messages (sent to specific users)
    const handleIndividualMessage = (messageData: any) => {
      // console.log('📨 [MessageListener] ✅✅✅ INDIVIDUAL MESSAGE RECEIVED ✅✅✅');
      // console.log('[MessageListener] Message data:', messageData);
      // console.log('[MessageListener] User role:', user.role, '| User ID:', user.id);
      callbackRef.current({
        ...messageData,
        type: 'individual',
      });
    };

    // Register listeners with detailed logging
    socket.on('broadcast:message', handleBroadcastMessage);
    socket.on('individual:message', handleIndividualMessage);

    // console.log('[MessageListener] ✅ Message listeners registered for events: broadcast:message, individual:message');
    // console.log('[MessageListener] Socket ID:', socket.id);
    // console.log('[MessageListener] Socket connected:', socket.connected);

    // Cleanup
    return () => {
      // console.log('[MessageListener] Cleaning up message listeners');
      socket.off('broadcast:message', handleBroadcastMessage);
      socket.off('individual:message', handleIndividualMessage);
    };
  }, [socket, isConnected, user]);
};
