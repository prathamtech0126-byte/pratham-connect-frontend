import { useEffect, useRef } from 'react';
import { useAuth } from '@/context/auth-context';
import { useMessageQueue } from '@/hooks/useMessageQueue';
import { useMessageListener } from '@/hooks/useMessageListener';
import { MessageModal } from '@/components/message-modal';
import { clientService } from '@/services/clientService';
import { useSocket } from '@/context/socket-context';
import { Message } from '@/types/message.types';
import { useQueryClient } from '@tanstack/react-query';

export function MessageProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const { socket, isConnected } = useSocket();
  const queryClient = useQueryClient();
  const { addMessage, currentMessage, handleAcknowledge } = useMessageQueue();
  const processedMessageIdsRef = useRef<Set<number>>(new Set());
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Check if user is admin (superadmin/director should NOT see blocking modals)
  // Managers and counsellors SHOULD see blocking modals
  const isAdmin = user?.role === 'superadmin' || user?.role === 'director';
  // Only managers and counsellors should see blocking modals (not admins)
  const shouldShowBlockingModal = user && (user.role === 'counsellor' || user.role === 'manager');

  // Helper to add message to queue (prevents duplicates)
  const addMessageToQueue = (msg: any) => {
    const messageId = msg.id;
    if (!messageId) {
      console.warn('[MessageProvider] Message missing ID, skipping:', msg);
      return;
    }

    // Skip if message was already processed
    if (processedMessageIdsRef.current.has(messageId)) {
      console.log('[MessageProvider] Message already processed, skipping:', messageId);
      return;
    }

    // Mark as processed
    processedMessageIdsRef.current.add(messageId);

    console.log('[MessageProvider] Adding new message to queue:', messageId);
    addMessage({
      ...msg,
      type: msg.type || 'broadcast',
      priority: msg.priority || 'normal',
      sender: msg.sender || {
        id: 0,
        name: 'Admin',
        role: 'superadmin',
      },
    } as Message);
  };

  // Listen for real-time messages via WebSocket
  useMessageListener((messageData) => {
    console.log('📨 [MessageProvider] ✅✅✅ MESSAGE RECEIVED IN PROVIDER ✅✅✅');
    console.log('[MessageProvider] Message data:', messageData);
    console.log('[MessageProvider] User role:', user?.role);
    console.log('[MessageProvider] shouldShowBlockingModal:', shouldShowBlockingModal);

    // Only add to blocking queue if user should see blocking modals
    if (shouldShowBlockingModal) {
      console.log('[MessageProvider] ✅ Adding message to blocking queue (user will see modal)');
      addMessageToQueue(messageData);
    } else {
      // Admin (superadmin/director): Just refresh messages list, don't show blocking modal
      console.log('[MessageProvider] Admin user - skipping blocking modal, refreshing messages list');
      // Invalidate messages query to refresh the list instantly
      queryClient.invalidateQueries({ queryKey: ['messages'] });
      queryClient.invalidateQueries({ queryKey: ['messageHistory'] });
    }
  });

  // Fetch unacknowledged messages (only for non-admin managers/counsellors)
  const fetchUnacknowledgedMessages = async () => {
    if (!shouldShowBlockingModal) {
      return; // Admins don't need to fetch unacknowledged messages for blocking modals
    }

    try {
      console.log('[MessageProvider] Fetching unacknowledged messages for user:', user.id);
      const unacknowledgedMessages = await clientService.getUnacknowledgedMessages();
      console.log('[MessageProvider] Fetched unacknowledged messages:', unacknowledgedMessages);

      unacknowledgedMessages.forEach((msg: any) => {
        addMessageToQueue(msg);
      });
    } catch (error) {
      console.error('[MessageProvider] Failed to fetch unacknowledged messages:', error);
    }
  };

  // Fetch unacknowledged messages on mount (only when socket is connected)
  // This ensures messages are shown after reconnection
  useEffect(() => {
    if (shouldShowBlockingModal && isConnected && socket) {
      console.log('[MessageProvider] Socket connected, fetching unacknowledged messages');
      fetchUnacknowledgedMessages();
    }
  }, [user, shouldShowBlockingModal, isConnected, socket]);

  // Socket-only: No polling fallback - rely entirely on WebSocket for real-time messages
  // If WebSocket is not connected, messages will be fetched when socket reconnects
  useEffect(() => {
    // Clear any existing polling interval (socket-only approach)
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }

    // If socket is not connected, log a warning but don't poll
    if (!isConnected || !socket) {
      console.warn('[MessageProvider] WebSocket not connected - messages will be received when socket reconnects');
    }

    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
    };
  }, [user, isConnected, socket]);

  return (
    <>
      {children}
      {/* Message Modal - BLOCKS all interaction until acknowledged */}
      {/* Only show blocking modal for non-admin managers and counsellors */}
      {shouldShowBlockingModal && currentMessage && (
        <MessageModal
          message={currentMessage}
          onAcknowledge={handleAcknowledge}
        />
      )}
    </>
  );
}
