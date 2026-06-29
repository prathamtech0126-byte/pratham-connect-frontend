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
import type {
  NotificationCategory,
  NotificationItem,
  NotificationRealtimeMeta,
} from "../types/notification.types";
import { useNotificationQueue } from "../hooks/useNotificationQueue";
import { BlockingNotificationModal } from "../components/BlockingNotificationModal";
import {
  formatFollowupNotificationBody,
  isPaymentApprovalNotification,
  shouldPlayAlertSound,
  shouldShowBlockingModal,
} from "../lib/notification-display";
import { playNotificationSound, primeNotificationAudio } from "../lib/notification-sound";
import { useState } from "react";

const LOGIN_UNREAD_SOUND_DELAY_MS = 10_000;

type NotificationContextValue = {
  notifications: NotificationItem[];
  unreadCount: number;
  isLoadingList: boolean;
  inboxFilter: NotificationCategory;
  setInboxFilter: (f: NotificationCategory) => void;
  handleNotificationClick: (item: NotificationItem) => void;
  markAllRead: (category?: string) => Promise<void>;
  refetch: () => void;
  /** True when Socket.io is connected and realtime delivery is active */
  isRealtime: boolean;
  realtimeMeta: NotificationRealtimeMeta | null;
};

const NotificationContext = createContext<NotificationContextValue | undefined>(
  undefined
);

function normalizeSocketNotification(payload: NotificationItem): NotificationItem {
  return {
    id: payload.id,
    type: payload.type,
    category: payload.category,
    priority: payload.priority,
    title: payload.title,
    body: payload.body,
    entityType: payload.entityType,
    entityId: payload.entityId,
    actionUrl: payload.actionUrl,
    meta: payload.meta ?? {},
    deliverAt: payload.deliverAt,
    createdAt: payload.createdAt,
    readAt: payload.readAt,
    delivery: payload.delivery,
  };
}

export function NotificationProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const { socket, isConnected, isUserRoomJoined } = useSocket();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const [inboxFilter, setInboxFilter] = useState<NotificationCategory>("all");
  const [realtimeMeta, setRealtimeMeta] = useState<NotificationRealtimeMeta | null>(null);
  const unreadCountRef = useRef(0);
  const knownNotificationIdsRef = useRef<Set<number>>(new Set());
  const inboxBootstrappedRef = useRef(false);
  const prevSocketConnectedRef = useRef(false);
  const loginUnreadSoundTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearLoginUnreadSoundTimer = useCallback(() => {
    if (loginUnreadSoundTimerRef.current != null) {
      clearTimeout(loginUnreadSoundTimerRef.current);
      loginUnreadSoundTimerRef.current = null;
    }
  }, []);

  const { currentBlocking, enqueueBlocking, acknowledgeCurrent } =
    useNotificationQueue();

  const enqueueBlockingRef = useRef(enqueueBlocking);
  useEffect(() => {
    enqueueBlockingRef.current = enqueueBlocking;
  });

  const playNotificationSoundDebounced = useCallback((force = false) => {
    playNotificationSound(force ? { force: true } : undefined);
  }, []);

  const playNotificationSoundDebouncedRef = useRef(playNotificationSoundDebounced);
  useEffect(() => {
    playNotificationSoundDebouncedRef.current = playNotificationSoundDebounced;
  });

  const scheduleLoginUnreadAlertSound = useCallback(() => {
    clearLoginUnreadSoundTimer();
    loginUnreadSoundTimerRef.current = setTimeout(() => {
      loginUnreadSoundTimerRef.current = null;
      if (unreadCountRef.current > 0) {
        playNotificationSoundDebouncedRef.current();
      }
    }, LOGIN_UNREAD_SOUND_DELAY_MS);
  }, [clearLoginUnreadSoundTimer]);

  const listQuery = useQuery({
    queryKey: ["notifications", "inbox", user?.id],
    queryFn: () => fetchNotifications({ limit: 50 }),
    enabled: !!user?.id,
    staleTime: Infinity,
    refetchOnWindowFocus: false,
  });

  const countQuery = useQuery({
    queryKey: ["notifications", "unread-count", user?.id],
    queryFn: async () => {
      const { count, realtime } = await fetchUnreadNotificationCount();
      if (realtime) setRealtimeMeta(realtime);
      return count;
    },
    enabled: !!user?.id,
    staleTime: Infinity,
    refetchOnWindowFocus: false,
  });

  useEffect(() => {
    if (listQuery.data?.realtime) {
      setRealtimeMeta(listQuery.data.realtime);
    }
  }, [listQuery.data?.realtime]);

  const invalidate = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["notifications"] });
  }, [queryClient]);

  const syncInboxFromServer = useCallback(
    async (opts?: {
      playSoundOnNew?: boolean;
      showBlockingOnUnread?: boolean;
    }) => {
      if (!user?.id) return;
      try {
        const [list, { count, realtime }] = await Promise.all([
          fetchNotifications({ limit: 50 }),
          fetchUnreadNotificationCount(),
        ]);
        queryClient.setQueryData(["notifications", "inbox", user.id], list);
        queryClient.setQueryData(["notifications", "unread-count", user.id], count);
        unreadCountRef.current = count;
        if (realtime) setRealtimeMeta(realtime);
        else if (list.realtime) setRealtimeMeta(list.realtime);

        const knownBefore = knownNotificationIdsRef.current;
        const newUnread = list.data.filter(
          (n) => !n.readAt && !knownBefore.has(n.id)
        );

        list.data.forEach((n) => knownNotificationIdsRef.current.add(n.id));

        const blockingItems = opts?.showBlockingOnUnread
          ? list.data.filter((n) => !n.readAt && shouldShowBlockingModal(n))
          : newUnread.filter((n) => shouldShowBlockingModal(n));

        for (const item of blockingItems) {
          enqueueBlockingRef.current(item);
        }

        const allowAlertSound = inboxBootstrappedRef.current;
        inboxBootstrappedRef.current = true;

        if (
          !allowAlertSound &&
          opts?.showBlockingOnUnread &&
          count > 0 &&
          list.data.some((n) => !n.readAt && shouldPlayAlertSound(n))
        ) {
          scheduleLoginUnreadAlertSound();
        }

        if (
          opts?.playSoundOnNew &&
          allowAlertSound &&
          count > 0 &&
          newUnread.length > 0 &&
          newUnread.some(shouldPlayAlertSound)
        ) {
          const forcePaymentSound = newUnread.some(isPaymentApprovalNotification);
          playNotificationSoundDebouncedRef.current(forcePaymentSound);
        }
      } catch {
        /* socket/API retry on reconnect */
      }
    },
    [queryClient, user?.id, scheduleLoginUnreadAlertSound]
  );

  useEffect(() => {
    const prime = () => primeNotificationAudio();
    const onVisible = () => {
      if (!document.hidden) primeNotificationAudio();
    };
    window.addEventListener("pointerdown", prime, { capture: true });
    window.addEventListener("click", prime, { capture: true });
    window.addEventListener("keydown", prime, { capture: true });
    window.addEventListener("touchstart", prime, { capture: true, passive: true });
    window.addEventListener("focus", prime);
    document.addEventListener("visibilitychange", onVisible);

    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }

    return () => {
      window.removeEventListener("pointerdown", prime, { capture: true });
      window.removeEventListener("click", prime, { capture: true });
      window.removeEventListener("keydown", prime, { capture: true });
      window.removeEventListener("touchstart", prime);
      window.removeEventListener("focus", prime);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);

  useEffect(() => {
    unreadCountRef.current = countQuery.data ?? 0;
  }, [countQuery.data]);

  useEffect(() => {
    if (!user?.id) {
      clearLoginUnreadSoundTimer();
      knownNotificationIdsRef.current = new Set();
      inboxBootstrappedRef.current = false;
      setRealtimeMeta(null);
      return;
    }
    void syncInboxFromServer({ showBlockingOnUnread: true });
    return () => clearLoginUnreadSoundTimer();
  }, [user?.id, syncInboxFromServer, clearLoginUnreadSoundTimer]);

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
    (raw: NotificationItem) => {
      const item = normalizeSocketNotification(raw);
      if (import.meta.env.DEV) {
        console.log('[notification] socket:new', item.id, item.type);
      }
      knownNotificationIdsRef.current.add(item.id);
      mergeNotificationInCache(item, { incrementUnread: true });

      if (shouldPlayAlertSound(item)) {
        playNotificationSoundDebounced(isPaymentApprovalNotification(item));
      }

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
      } else if (shouldShowBlockingModal(item)) {
        enqueueBlocking(item);
      } else {
        toast({
          title: item.title,
          description:
            displayBody.length > 120 ? `${displayBody.slice(0, 120)}…` : displayBody,
        });
      }
    },
    [mergeNotificationInCache, playNotificationSoundDebounced, enqueueBlocking, toast, setLocation, user?.role]
  );

  const handleUpdated = useCallback(
    (raw: NotificationItem) => {
      const item = normalizeSocketNotification(raw);
      if (import.meta.env.DEV) {
        console.log('[notification] socket:updated', item.id, item.type);
      }
      if (!item.readAt && !knownNotificationIdsRef.current.has(item.id)) {
        handleIncoming(item);
        return;
      }

      mergeNotificationInCache(item, { incrementUnread: !item.readAt });
    },
    [handleIncoming, mergeNotificationInCache]
  );

  const handleIncomingRef = useRef(handleIncoming);
  const handleUpdatedRef = useRef(handleUpdated);
  useEffect(() => {
    handleIncomingRef.current = handleIncoming;
    handleUpdatedRef.current = handleUpdated;
  });

  const syncInboxFromServerRef = useRef(syncInboxFromServer);
  useEffect(() => {
    syncInboxFromServerRef.current = syncInboxFromServer;
  });

  useEffect(() => {
    if (!socket || !isConnected || !isUserRoomJoined || !user?.id) return;

    const onNew = (payload: NotificationItem) => handleIncomingRef.current(payload);
    const onUpdated = (payload: NotificationItem) => handleUpdatedRef.current(payload);
    const onRealtime = (meta: NotificationRealtimeMeta) => {
      setRealtimeMeta(meta);
      void syncInboxFromServerRef.current({ playSoundOnNew: true });
    };

    socket.on("notification:new", onNew);
    socket.on("notification:updated", onUpdated);
    socket.on("notifications:realtime", onRealtime);

    return () => {
      socket.off("notification:new", onNew);
      socket.off("notification:updated", onUpdated);
      socket.off("notifications:realtime", onRealtime);
    };
  }, [socket, isConnected, isUserRoomJoined, user?.id]);

  useEffect(() => {
    if (!socket || !isConnected || !user?.id) return;

    const onLeadAssigned = (payload: { telecallerId?: number }) => {
      if (Number(payload.telecallerId) === Number(user.id)) {
        playNotificationSoundDebouncedRef.current();
        window.setTimeout(() => {
          void syncInboxFromServerRef.current({ playSoundOnNew: true });
        }, 500);
      }
    };
    const onLeadTransferred = (payload: { counsellorId?: number }) => {
      if (Number(payload.counsellorId) === Number(user.id)) {
        playNotificationSoundDebouncedRef.current();
        window.setTimeout(() => {
          void syncInboxFromServerRef.current({ playSoundOnNew: true });
        }, 500);
      }
    };

    socket.on("lead:assigned:notify", onLeadAssigned);
    socket.on("lead:transferred:notify", onLeadTransferred);

    return () => {
      socket.off("lead:assigned:notify", onLeadAssigned);
      socket.off("lead:transferred:notify", onLeadTransferred);
    };
  }, [socket, isConnected, user?.id]);

  useEffect(() => {
    if (isConnected && user?.id && !prevSocketConnectedRef.current) {
      void syncInboxFromServer({ playSoundOnNew: true });
    }
    prevSocketConnectedRef.current = isConnected;
  }, [isConnected, user?.id, syncInboxFromServer]);

  useEffect(() => {
    const onReconnected = () => {
      if (user?.id) void syncInboxFromServer({ playSoundOnNew: true });
    };
    window.addEventListener("socket:reconnected", onReconnected);
    return () => window.removeEventListener("socket:reconnected", onReconnected);
  }, [user?.id, syncInboxFromServer]);

  const handleNotificationClick = useCallback(
    (item: NotificationItem) => {
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

      if (item.type === "payment_partial") {
        sessionStorage.setItem("showNotifications", "true");
        setLocation("/messages");
        return;
      }

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

      if (
        item.type === "lead_followup_manager_escalation" ||
        item.type === "lead_followup_admin_escalation"
      ) {
        const url = item.actionUrl ?? (item.entityId ? `/leads/${item.entityId}` : null);
        if (url) setLocation(url);
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
    isRealtime: isConnected && isUserRoomJoined && (realtimeMeta?.enabled ?? true),
    realtimeMeta,
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
