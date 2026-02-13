import { useState, useCallback, useEffect } from 'react';
import { clientService } from '@/services/clientService';
import { Message, AcknowledgmentMethod } from '@/types/message.types';

export const useMessageQueue = () => {
  const [messageQueue, setMessageQueue] = useState<Message[]>([]);
  const [currentMessage, setCurrentMessage] = useState<Message | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // Add message to queue (sorted by priority)
  const addMessage = useCallback((message: Message) => {
    setMessageQueue((prev) => {
      const priorityOrder = { urgent: 4, high: 3, normal: 2, low: 1 };
      const sorted = [...prev, message].sort(
        (a, b) => priorityOrder[b.priority] - priorityOrder[a.priority]
      );
      return sorted;
    });
  }, []);

  // Process next message in queue
  const processNextMessage = useCallback(() => {
    if (isProcessing || messageQueue.length === 0) return;

    setIsProcessing(true);
    const nextMessage = messageQueue[0];
    setCurrentMessage(nextMessage);
    setMessageQueue((prev) => prev.slice(1));
  }, [messageQueue, isProcessing]);

  // Handle acknowledgment with error handling and retry
  const handleAcknowledge = useCallback(
    async (messageId: number, method: AcknowledgmentMethod = 'button') => {
      try {
        await clientService.acknowledgeMessage(messageId, method);
        setCurrentMessage(null);
        setIsProcessing(false);

        // Process next message after delay
        setTimeout(() => {
          processNextMessage();
        }, 500);
      } catch (error: any) {
        console.error('Failed to acknowledge message:', error);

        // Show error to user
        const errorMessage = error.response?.data?.message || 'Failed to acknowledge message';

        // Retry logic
        const shouldRetry = window.confirm(`${errorMessage}\n\nWould you like to retry?`);
        if (shouldRetry) {
          setTimeout(() => {
            handleAcknowledge(messageId, method);
          }, 1000);
        } else {
          setIsProcessing(false);
        }
      }
    },
    [processNextMessage]
  );

  // Auto-process queue
  useEffect(() => {
    if (!isProcessing && messageQueue.length > 0 && !currentMessage) {
      processNextMessage();
    }
  }, [messageQueue, isProcessing, currentMessage, processNextMessage]);

  return {
    addMessage,
    currentMessage,
    handleAcknowledge,
    queueLength: messageQueue.length,
  };
};
