import { useCallback, useEffect, useState } from "react";
import type { NotificationItem } from "../types/notification.types";
import { markNotificationRead } from "../api/notifications.api";
import { isBlockingPriority } from "../lib/notification-display";

export function useNotificationQueue() {
  const [queue, setQueue] = useState<NotificationItem[]>([]);
  const [current, setCurrent] = useState<NotificationItem | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const enqueueBlocking = useCallback((item: NotificationItem) => {
    if (!isBlockingPriority(item.priority)) return;
    setQueue((prev) => {
      if (prev.some((n) => n.id === item.id) || current?.id === item.id) return prev;
      return [...prev, item];
    });
  }, [current?.id]);

  const processNextMessage = useCallback(() => {
    setQueue((prev) => {
      if (prev.length === 0) {
        setCurrent(null);
        setIsProcessing(false);
        return prev;
      }
      setCurrent(prev[0]);
      setIsProcessing(true);
      return prev.slice(1);
    });
  }, []);

  useEffect(() => {
    if (!isProcessing && !current && queue.length > 0) {
      processNextMessage();
    }
  }, [queue, isProcessing, current, processNextMessage]);

  const acknowledgeCurrent = useCallback(async () => {
    if (!current) return;
    try {
      await markNotificationRead(current.id);
      setCurrent(null);
      setIsProcessing(false);
      setTimeout(() => processNextMessage(), 300);
    } catch (e) {
      console.error("[notification] acknowledge failed", e);
      setIsProcessing(false);
    }
  }, [current, processNextMessage]);

  return {
    currentBlocking: current,
    enqueueBlocking,
    acknowledgeCurrent,
  };
}
