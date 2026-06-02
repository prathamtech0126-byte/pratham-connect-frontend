import { useCallback, useMemo, useState } from "react";
import type { NotificationItem } from "@/types/notification.types";

type UseNotificationQueueResult = {
  currentBlocking: NotificationItem | null;
  enqueueBlocking: (item: NotificationItem) => void;
  acknowledgeCurrent: () => void;
};

export function useNotificationQueue(): UseNotificationQueueResult {
  const [queue, setQueue] = useState<NotificationItem[]>([]);

  const enqueueBlocking = useCallback((item: NotificationItem) => {
    setQueue((prev) => {
      if (prev.some((n) => n.id === item.id)) return prev;
      return [...prev, item];
    });
  }, []);

  const acknowledgeCurrent = useCallback(() => {
    setQueue((prev) => (prev.length > 0 ? prev.slice(1) : prev));
  }, []);

  const currentBlocking = useMemo(
    () => (queue.length > 0 ? queue[0] : null),
    [queue]
  );

  return { currentBlocking, enqueueBlocking, acknowledgeCurrent };
}
