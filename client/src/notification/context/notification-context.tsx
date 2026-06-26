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
import { ToastAction } from "@/components/ui/toast";
import type { NotificationCategory, NotificationItem } from "../types/notification.types";
import { useNotificationQueue } from "../hooks/useNotificationQueue";
import { BlockingNotificationModal } from "../components/BlockingNotificationModal";
import {
  formatFollowupNotificationBody,
  isBlockingPriority,
  isFollowupNotificationType,
} from "../lib/notification-display";
import { playNotificationSound, primeNotificationAudio } from "../lib/notification-sound";
import { useState } from "react";

/** Poll inbox every 2 min (socket handles real-time; poll is fallback only). */
const NOTIFICATION_POLL_INTERVAL_MS = 120_000;
/** After login/refresh, alert for pending follow-up notifications once data has loaded. */
const LOGIN_FOLLOWUP_SOUND_DELAY_MS = 10_000;

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
  const loginCatchUpDoneRef = useRef(false);
  const knownNotificationIdsRef = useRef<Set<number>>(new Set());
  const initialPollSeedDoneRef = useRef(false);
  const lastSoundAtRef = useRef(0);
  const prevSocketConnectedRef = useRef(false);

  const { currentBlocking, enqueueBlocking, acknowledgeCurrent } =
    useNotificationQueue();

  const listQuery = useQuery({
    queryKey: ["notifications", "inbox", user?.id],
    queryFn: () => fetchNotifications({ limit: 50 }),
    enabled: !!user?.id,
    refetchInterval: NOTIFICATION_POLL_INTERVAL_MS,
    staleTime: 60_000,
  });

  const countQuery = useQuery({
    queryKey: ["notifications", "unread-count", user?.id],
    queryFn: () => fetchUnreadNotificationCount(),
    enabled: !!user?.id,
    refetchInterval: NOTIFICATION_POLL_INTERVAL_MS,
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

  const playNotificationSoundDebounced = useCallback(() => {
    const now = Date.now();
    if (now - lastSoundAtRef.current < 1500) return;
    lastSoundAtRef.current = now;
    playNotificationSound();
  }, []);

  // After login/refresh: fetch inbox and play sound for unread follow-up reminders/overdue.
  useEffect(() => {
    if (!user?.id) {
      loginSoundFiredRef.current = false;
      loginCatchUpDoneRef.current = false;
      initialPollSeedDoneRef.current = false;
      knownNotificationIdsRef.current = new Set();
      return;
    }

    primeNotificationAudio();

    const timer = setTimeout(async () => {
      try {
        const [list, count] = await Promise.all([
          fetchNotifications({ limit: 50 }),
          fetchUnreadNotificationCount(),
        ]);
        queryClient.setQueryData(["notifications", "inbox", user.id], list);
        queryClient.setQueryData(["notifications", "unread-count", user.id], count);
        unreadCountRef.current = count;

        const hasFollowupAlert = list.data.some(
          (n) => !n.readAt && isFollowupNotificationType(n.type)
        );
        if (hasFollowupAlert) {
          playNotificationSoundDebounced();
        }

        list.data.forEach((n) => knownNotificationIdsRef.current.add(n.id));
        initialPollSeedDoneRef.current = true;
        loginCatchUpDoneRef.current = true;
      } catch {
        /* ignore — polling/socket will retry */
      } finally {
        loginSoundFiredRef.current = true;
      }
    }, LOGIN_FOLLOWUP_SOUND_DELAY_MS);

    return () => clearTimeout(timer);
  }, [user?.id, queryClient, playNotificationSoundDebounced]);

  // Poll catch-up: play sound when a new follow-up notification appears (socket fallback).
  useEffect(() => {
    const items = listQuery.data?.data ?? [];
    if (!user?.id || items.length === 0) return;

    if (!initialPollSeedDoneRef.current) {
      items.forEach((n) => knownNotificationIdsRef.current.add(n.id));
      if (loginCatchUpDoneRef.current) {
        initialPollSeedDoneRef.current = true;
      }
      return;
    }

    const newcomers = items.filter((n) => !knownNotificationIdsRef.current.has(n.id));
    if (newcomers.length === 0) return;

    newcomers.forEach((n) => knownNotificationIdsRef.current.add(n.id));

    const hasNewFollowupAlert = newcomers.some(
      (n) => !n.readAt && isFollowupNotificationType(n.type)
    );
    if (hasNewFollowupAlert && loginCatchUpDoneRef.current) {
      playNotificationSoundDebounced();
    }
  }, [listQuery.data, user?.id, playNotificationSoundDebounced]);

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

  const handleIncoming = useCallback(
    (item: NotificationItem) => {
      knownNotificationIdsRef.current.add(item.id);
      mergeNotificationInCache(item, { incrementUnread: true });

      playNotificationSoundDebounced();

      // When the browser is minimized/background, also fire an OS-level notification.
      // This is the only reliable way to get sound + alert when the tab is not visible.
      const displayBody = formatFollowupNotificationBody(item);

      if (document.hidden && "Notification" in window && Notification.permission === "granted") {
        const body = displayBody.length > 100 ? `${displayBody.slice(0, 100)}…` : displayBody;
        new Notification(item.title, { body, icon: "/favicon.ico" });
      }

      if (item.type === "visa_case_document_request") {
        const isCx = user?.role === "customer_experience" || (user?.role as string) === "cx";
        const url = isCx
          ? "/cx/document-requests"
          : (item.actionUrl ?? null);
        toast({
          title: item.title,
          description:
            displayBody.length > 120 ? `${displayBody.slice(0, 120)}…` : displayBody,
          action: url
            ? (
                <ToastAction
                  altText={isCx ? "View Requests" : "View Case"}
                  onClick={() => {
                    setLocation(url);
                    markNotificationRead(item.id).catch(() => {/* ignore */});
                  }}
                >
                  {isCx ? "View Requests" : "View Case"}
                </ToastAction>
              )
            : undefined,
        });
      } else if (isBlockingPriority(item.priority)) {
        enqueueBlocking(item);
      } else {
        toast({
          title: item.title,
          description:
            displayBody.length > 120 ? `${displayBody.slice(0, 120)}…` : displayBody,
        });
      }
    },
    [mergeNotificationInCache, playNotificationSoundDebounced, enqueueBlocking, toast, setLocation]
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

      if (item.type === "visa_case_document_request") {
        const isCx = user?.role === "customer_experience" || (user?.role as string) === "cx";
        setLocation(isCx ? "/cx/document-requests" : (item.actionUrl ?? "/cx/document-requests"));
        return;
      }

      if (item.actionUrl) {
        setLocation(item.actionUrl);
      }
    },
    [setLocation, invalidate, user?.role]
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
