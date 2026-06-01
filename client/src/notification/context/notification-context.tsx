import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  type ReactNode,
} from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useAuth } from "@/context/auth-context";
import { useSocket } from "@/context/socket-context";
import { useToast } from "@/hooks/use-toast";
import {
  fetchNotifications,
  fetchUnreadNotificationCount,
  markAllNotificationsRead,
  markNotificationRead,
} from "../api/notifications.api";
import type { NotificationCategory, NotificationItem } from "../types/notification.types";
import { useNotificationQueue } from "../hooks/useNotificationQueue";
import { BlockingNotificationModal } from "../components/BlockingNotificationModal";
import {
  formatFollowupNotificationBody,
  isBlockingPriority,
} from "../lib/notification-display";
import { playNotificationSound, primeNotificationAudio } from "../lib/notification-sound";
import { useState } from "react";

type NotificationContextValue = {
  notifications: NotificationItem[];
  unreadCount: number;
  isLoadingList: boolean;
  inboxFilter: NotificationCategory;
  setInboxFilter: (f: NotificationCategory) => void;
  handleNotificationClick: (item: NotificationItem) => void;
  markAllRead: (category?: string) => Promise<void>;
  refetch: () => void;
};

const NotificationContext = createContext<NotificationContextValue | undefined>(
  undefined
);

export function NotificationProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const { socket, isConnected } = useSocket();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const [inboxFilter, setInboxFilter] = useState<NotificationCategory>("all");
  const unreadCountRef = useRef(0);
  const loginSoundFiredRef = useRef(false);
  const lastSoundAtRef = useRef(0);
  const prevSocketConnectedRef = useRef(false);

  const { currentBlocking, enqueueBlocking, acknowledgeCurrent } =
    useNotificationQueue();

  const listQuery = useQuery({
    queryKey: ["notifications", "inbox", user?.id],
    queryFn: () => fetchNotifications({ limit: 50 }),
    enabled: !!user?.id,
    refetchInterval: 60_000,
    staleTime: 15_000,
  });

  const countQuery = useQuery({
    queryKey: ["notifications", "unread-count", user?.id],
    queryFn: () => fetchUnreadNotificationCount(),
    enabled: !!user?.id,
    refetchInterval: 60_000,
  });

  const invalidate = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["notifications"] });
  }, [queryClient]);

  // Prime audio on every user gesture and tab-focus (idempotent inside primeNotificationAudio).
  // Request OS notification permission so we can alert the user even when the browser is minimized.
  useEffect(() => {
    const prime = () => primeNotificationAudio();
    const onVisible = () => { if (!document.hidden) primeNotificationAudio(); };
    window.addEventListener("click", prime, { passive: true });
    window.addEventListener("keydown", prime, { passive: true });
    window.addEventListener("touchstart", prime, { passive: true });
    window.addEventListener("focus", prime, { passive: true });
    document.addEventListener("visibilitychange", onVisible);

    // Ask permission once so we can show OS notifications when the tab is hidden
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }

    return () => {
      window.removeEventListener("click", prime);
      window.removeEventListener("keydown", prime);
      window.removeEventListener("touchstart", prime);
      window.removeEventListener("focus", prime);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);

  // Keep ref in sync so the login timer can read the latest count without restarting
  useEffect(() => {
    unreadCountRef.current = countQuery.data ?? 0;
  }, [countQuery.data]);

  // After login: play sound once after 1 minute if there are unread notifications/alerts
  useEffect(() => {
    if (!user?.id) {
      loginSoundFiredRef.current = false;
      return;
    }
    const timer = setTimeout(() => {
      if (unreadCountRef.current > 0) {
        playNotificationSound();
      }
      loginSoundFiredRef.current = true;
    }, 30_000);
    return () => clearTimeout(timer);
  }, [user?.id]);

  const mergeNotificationInCache = useCallback(
    (item: NotificationItem, options: { incrementUnread?: boolean }) => {
      const { incrementUnread = true } = options;
      let isNewInCache = true;

      queryClient.setQueryData(
        ["notifications", "inbox", user?.id],
        (old: Awaited<ReturnType<typeof fetchNotifications>> | undefined) => {
          if (!old?.data) {
            return { success: true, data: [item], pagination: old?.pagination };
          }
          const idx = old.data.findIndex((n) => n.id === item.id);
          if (idx >= 0) {
            isNewInCache = false;
            const next = [...old.data];
            next[idx] = item;
            return { ...old, data: next };
          }
          return { ...old, data: [item, ...old.data] };
        }
      );

      if (incrementUnread && isNewInCache && !item.readAt) {
        queryClient.setQueryData(
          ["notifications", "unread-count", user?.id],
          (old: number | undefined) => (typeof old === "number" ? old + 1 : 1)
        );
      }
    },
    [queryClient, user?.id]
  );

  const playNotificationSoundDebounced = useCallback(() => {
    const now = Date.now();
    if (now - lastSoundAtRef.current < 1500) return;
    lastSoundAtRef.current = now;
    playNotificationSound();
  }, []);

  const handleIncoming = useCallback(
    (item: NotificationItem) => {
      mergeNotificationInCache(item, { incrementUnread: true });

      playNotificationSoundDebounced();

      // When the browser is minimized/background, also fire an OS-level notification.
      // This is the only reliable way to get sound + alert when the tab is not visible.
      const displayBody = formatFollowupNotificationBody(item);

      if (document.hidden && "Notification" in window && Notification.permission === "granted") {
        const body = displayBody.length > 100 ? `${displayBody.slice(0, 100)}…` : displayBody;
        new Notification(item.title, { body, icon: "/favicon.ico" });
      }

      if (isBlockingPriority(item.priority)) {
        enqueueBlocking(item);
      } else {
        toast({
          title: item.title,
          description:
            displayBody.length > 120 ? `${displayBody.slice(0, 120)}…` : displayBody,
        });
      }
    },
    [mergeNotificationInCache, playNotificationSoundDebounced, enqueueBlocking, toast]
  );

  const handleUpdated = useCallback(
    (item: NotificationItem) => {
      mergeNotificationInCache(item, { incrementUnread: false });
    },
    [mergeNotificationInCache]
  );

  // Keep handlers in refs so socket listeners are not re-registered on every render.
  const handleIncomingRef = useRef(handleIncoming);
  const handleUpdatedRef = useRef(handleUpdated);
  useEffect(() => {
    handleIncomingRef.current = handleIncoming;
    handleUpdatedRef.current = handleUpdated;
  });

  useEffect(() => {
    if (!socket || !isConnected || !user?.id) return;
    const onNew = (payload: NotificationItem) => handleIncomingRef.current(payload);
    const onUpdated = (payload: NotificationItem) => handleUpdatedRef.current(payload);
    socket.on("notification:new", onNew);
    socket.on("notification:updated", onUpdated);
    return () => {
      socket.off("notification:new", onNew);
      socket.off("notification:updated", onUpdated);
    };
  }, [socket, isConnected, user?.id]);

  useEffect(() => {
    if (isConnected && user?.id && !prevSocketConnectedRef.current) {
      invalidate();
    }
    prevSocketConnectedRef.current = isConnected;
  }, [isConnected, user?.id, invalidate]);

  const handleNotificationClick = useCallback(
    (item: NotificationItem) => {
      // Mark as read in the background — don't await, navigate immediately
      if (!item.readAt) {
        markNotificationRead(item.id)
          .then(() => invalidate())
          .catch(() => {/* ignore */});
      }

      const isLeadBatch =
        item.type === "lead_assignment_batch" ||
        (item.meta && (item.meta as { batch?: boolean }).batch === true);

      if (isLeadBatch) {
        const meta = item.meta as { assigneeRole?: string } | undefined;
        const url =
          item.actionUrl ||
          (meta?.assigneeRole === "telecaller" ? "/leads" : "/leads/counsellor");
        setLocation(url);
        return;
      }

      // Partial payment request (manager/admin receives) → messages Notifications tab
      if (item.type === "payment_partial") {
        sessionStorage.setItem("showNotifications", "true");
        setLocation("/messages");
        return;
      }

      // Payment approved or rejected → open the specific client (view page)
      if (item.type === "payment_approved" || item.type === "payment_rejected") {
        const meta = item.meta as Record<string, unknown> | undefined;
        const clientId =
          item.entityId ??
          (meta?.clientId != null ? Number(meta.clientId) : null);
        if (clientId) {
          setLocation(`/clients/${clientId}/view`);
          return;
        }
        return;
      }

      if (item.actionUrl) {
        setLocation(item.actionUrl);
      }
    },
    [setLocation, invalidate]
  );

  const markAllRead = useCallback(
    async (category?: string) => {
      const cat = category && category !== "all" && category !== "alerts" ? category : undefined;
      await markAllNotificationsRead(cat);
      invalidate();
    },
    [invalidate]
  );

  const value: NotificationContextValue = {
    notifications: listQuery.data?.data ?? [],
    unreadCount: countQuery.data ?? 0,
    isLoadingList: listQuery.isLoading,
    inboxFilter,
    setInboxFilter,
    handleNotificationClick,
    markAllRead,
    refetch: invalidate,
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
      {currentBlocking && (
        <BlockingNotificationModal
          notification={currentBlocking}
          onAcknowledge={acknowledgeCurrent}
        />
      )}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const ctx = useContext(NotificationContext);
  if (!ctx) {
    throw new Error("useNotifications must be used within NotificationProvider");
  }
  return ctx;
}
