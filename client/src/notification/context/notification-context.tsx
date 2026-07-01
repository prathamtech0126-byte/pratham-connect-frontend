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
import {
  playNotificationSound,
  primeNotificationAudio,
} from "../lib/notification-sound";
import { FRONTDESK_NOTIFICATION_TYPES } from "@/constants/modules-socket";
import { useState } from "react";

const LOGIN_UNREAD_SOUND_DELAY_MS = 2_000;
/** Min time between background notification API refetches (React Query dedupes in-flight). */
const NOTIFICATION_STALE_MS = 30_000;
/** Collapse burst triggers (socket reconnect, join:user meta, lead assign) into one refetch. */
const REFRESH_DEBOUNCE_MS = 1_500;

type RefreshNotificationsOpts = {
  playSoundOnNew?: boolean;
  showBlockingOnUnread?: boolean;
  /** Bypass stale cache — use after reconnect or explicit user refresh. */
  force?: boolean;
};

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
  const refreshDebounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingRefreshOptsRef = useRef<RefreshNotificationsOpts | undefined>(undefined);
  const refreshInFlightRef = useRef<Promise<void> | null>(null);
  const loginUnreadSoundTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const loginUnreadAlertPendingRef = useRef(false);

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

  const lastSoundAtRef = useRef(0);

  const playNotificationSoundDebounced = useCallback((force = false) => {
    const now = Date.now();
    if (!force && now - lastSoundAtRef.current < 1500) return;
    lastSoundAtRef.current = now;
    playNotificationSound(force ? { force: true } : undefined);
  }, []);

  const playNotificationSoundDebouncedRef = useRef(playNotificationSoundDebounced);
  useEffect(() => {
    playNotificationSoundDebouncedRef.current = playNotificationSoundDebounced;
  });

  const scheduleLoginUnreadAlertSound = useCallback(() => {
    clearLoginUnreadSoundTimer();
    loginUnreadAlertPendingRef.current = true;

    const playLoginUnreadSound = () => {
      if (!loginUnreadAlertPendingRef.current) return;
      if (unreadCountRef.current <= 0) {
        loginUnreadAlertPendingRef.current = false;
        return;
      }
      loginUnreadAlertPendingRef.current = false;
      playNotificationSoundDebouncedRef.current(true);
    };

    loginUnreadSoundTimerRef.current = setTimeout(() => {
      loginUnreadSoundTimerRef.current = null;
      playLoginUnreadSound();
    }, LOGIN_UNREAD_SOUND_DELAY_MS);
  }, [clearLoginUnreadSoundTimer]);

  const listQuery = useQuery({
    queryKey: ["notifications", "inbox", user?.id],
    queryFn: () => fetchNotifications({ limit: 50 }),
    enabled: !!user?.id,
    staleTime: NOTIFICATION_STALE_MS,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  const countQuery = useQuery({
    queryKey: ["notifications", "unread-count", user?.id],
    queryFn: async () => {
      const { count, realtime } = await fetchUnreadNotificationCount();
      if (realtime) setRealtimeMeta(realtime);
      return count;
    },
    enabled: !!user?.id,
    staleTime: NOTIFICATION_STALE_MS,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  useEffect(() => {
    if (listQuery.data?.realtime) {
      setRealtimeMeta(listQuery.data.realtime);
    }
  }, [listQuery.data?.realtime]);

  const invalidate = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["notifications"] });
  }, [queryClient]);

  const applyRefreshSideEffects = useCallback(
    (
      list: Awaited<ReturnType<typeof fetchNotifications>>,
      count: number,
      opts?: RefreshNotificationsOpts
    ) => {
      unreadCountRef.current = count;
      if (list.realtime) setRealtimeMeta(list.realtime);

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
    },
    [scheduleLoginUnreadAlertSound]
  );

  const refreshNotificationsFromServer = useCallback(
    async (opts?: RefreshNotificationsOpts) => {
      if (!user?.id) return;

      if (refreshInFlightRef.current) {
        await refreshInFlightRef.current;
        return;
      }

      const run = async () => {
        try {
          if (opts?.force) {
            await queryClient.invalidateQueries({
              queryKey: ["notifications", "inbox", user.id],
            });
            await queryClient.invalidateQueries({
              queryKey: ["notifications", "unread-count", user.id],
            });
          }

          const staleTime = opts?.force ? 0 : NOTIFICATION_STALE_MS;

          const [list, count] = await Promise.all([
            queryClient.fetchQuery({
              queryKey: ["notifications", "inbox", user.id],
              queryFn: () => fetchNotifications({ limit: 50 }),
              staleTime,
            }),
            queryClient.fetchQuery({
              queryKey: ["notifications", "unread-count", user.id],
              queryFn: async () => {
                const { count: unread, realtime } = await fetchUnreadNotificationCount();
                if (realtime) setRealtimeMeta(realtime);
                return unread;
              },
              staleTime,
            }),
          ]);

          applyRefreshSideEffects(list, count, opts);
        } catch {
          /* socket/API retry on reconnect */
        }
      };

      const promise = run().finally(() => {
        if (refreshInFlightRef.current === promise) {
          refreshInFlightRef.current = null;
        }
      });
      refreshInFlightRef.current = promise;
      await promise;
    },
    [applyRefreshSideEffects, queryClient, user?.id]
  );

  const scheduleRefreshNotifications = useCallback(
    (opts?: RefreshNotificationsOpts) => {
      pendingRefreshOptsRef.current = {
        ...pendingRefreshOptsRef.current,
        ...opts,
        playSoundOnNew:
          pendingRefreshOptsRef.current?.playSoundOnNew || opts?.playSoundOnNew,
        showBlockingOnUnread:
          pendingRefreshOptsRef.current?.showBlockingOnUnread ||
          opts?.showBlockingOnUnread,
        force: pendingRefreshOptsRef.current?.force || opts?.force,
      };

      if (refreshDebounceTimerRef.current != null) {
        clearTimeout(refreshDebounceTimerRef.current);
      }

      refreshDebounceTimerRef.current = setTimeout(() => {
        refreshDebounceTimerRef.current = null;
        const merged = pendingRefreshOptsRef.current;
        pendingRefreshOptsRef.current = undefined;
        void refreshNotificationsFromServer(merged);
      }, REFRESH_DEBOUNCE_MS);
    },
    [refreshNotificationsFromServer]
  );

  const clearRefreshDebounce = useCallback(() => {
    if (refreshDebounceTimerRef.current != null) {
      clearTimeout(refreshDebounceTimerRef.current);
      refreshDebounceTimerRef.current = null;
    }
    pendingRefreshOptsRef.current = undefined;
  }, []);

  useEffect(() => {
    const prime = () => primeNotificationAudio();
    const onVisible = () => {
      if (!document.hidden) primeNotificationAudio();
    };
    window.addEventListener("click", prime, { passive: true });
    window.addEventListener("keydown", prime, { passive: true });
    window.addEventListener("touchstart", prime, { passive: true });
    window.addEventListener("focus", prime, { passive: true });
    document.addEventListener("visibilitychange", onVisible);

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

  useEffect(() => {
    unreadCountRef.current = countQuery.data ?? 0;
  }, [countQuery.data]);

  useEffect(() => {
    if (!user?.id) {
      clearLoginUnreadSoundTimer();
      clearRefreshDebounce();
      loginUnreadAlertPendingRef.current = false;
      knownNotificationIdsRef.current = new Set();
      inboxBootstrappedRef.current = false;
      setRealtimeMeta(null);
      return;
    }
    return () => {
      clearLoginUnreadSoundTimer();
      clearRefreshDebounce();
    };
  }, [user?.id, clearLoginUnreadSoundTimer, clearRefreshDebounce]);

  /** Bootstrap blocking modals + login unread sound from the initial React Query load only. */
  useEffect(() => {
    if (!user?.id || inboxBootstrappedRef.current) return;
    if (!listQuery.isSuccess || !countQuery.isSuccess) return;

    const list = listQuery.data;
    if (!list?.data) return;

    applyRefreshSideEffects(list, countQuery.data ?? 0, {
      showBlockingOnUnread: true,
    });
  }, [
    user?.id,
    listQuery.isSuccess,
    listQuery.data,
    countQuery.isSuccess,
    countQuery.data,
    applyRefreshSideEffects,
  ]);

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

      playNotificationSoundDebounced(isPaymentApprovalNotification(item));

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

      const wasKnown = knownNotificationIdsRef.current.has(item.id);
      knownNotificationIdsRef.current.add(item.id);
      mergeNotificationInCache(item, { incrementUnread: !item.readAt });

      if (!item.readAt && wasKnown && shouldPlayAlertSound(item)) {
        playNotificationSoundDebounced(isPaymentApprovalNotification(item));
      }
    },
    [handleIncoming, mergeNotificationInCache, playNotificationSoundDebounced]
  );

  const handleIncomingRef = useRef(handleIncoming);
  const handleUpdatedRef = useRef(handleUpdated);
  useEffect(() => {
    handleIncomingRef.current = handleIncoming;
    handleUpdatedRef.current = handleUpdated;
  });

  const scheduleRefreshNotificationsRef = useRef(scheduleRefreshNotifications);
  useEffect(() => {
    scheduleRefreshNotificationsRef.current = scheduleRefreshNotifications;
  });

  useEffect(() => {
    if (!socket || !isConnected || !user?.id) return;

    const onNew = (payload: NotificationItem) => handleIncomingRef.current(payload);
    const onUpdated = (payload: NotificationItem) => handleUpdatedRef.current(payload);
    const onRealtime = (meta: NotificationRealtimeMeta) => {
      setRealtimeMeta(meta);
    };

    socket.on("notification:new", onNew);
    socket.on("notification:updated", onUpdated);
    socket.on("notifications:realtime", onRealtime);

    return () => {
      socket.off("notification:new", onNew);
      socket.off("notification:updated", onUpdated);
      socket.off("notifications:realtime", onRealtime);
    };
  }, [socket, isConnected, user?.id]);

  useEffect(() => {
    if (!socket || !isConnected || !user?.id) return;

    const onLeadAssigned = (payload: { telecallerId?: number; lead?: { assignmentStatus?: string } }) => {
      if (Number(payload.telecallerId) !== Number(user.id)) return;
      if (payload.lead?.assignmentStatus && payload.lead.assignmentStatus !== "assigned") return;
      playNotificationSoundDebouncedRef.current(true);
      scheduleRefreshNotificationsRef.current({ playSoundOnNew: true });
    };
    const onLeadTransferred = (payload: { counsellorId?: number }) => {
      if (Number(payload.counsellorId) === Number(user.id)) {
        playNotificationSoundDebouncedRef.current(true);
        scheduleRefreshNotificationsRef.current({ playSoundOnNew: true });
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
    const onReconnected = () => {
      if (user?.id) {
        scheduleRefreshNotificationsRef.current({
          playSoundOnNew: true,
          force: true,
        });
      }
    };
    window.addEventListener("socket:reconnected", onReconnected);
    return () => window.removeEventListener("socket:reconnected", onReconnected);
  }, [user?.id]);

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

      // Front desk lead notifications → open the lead (fallback to entityId).
      if ((FRONTDESK_NOTIFICATION_TYPES as readonly string[]).includes(item.type)) {
        const meta = item.meta as Record<string, unknown> | undefined;
        const leadId =
          item.entityId ?? (meta?.leadId != null ? Number(meta.leadId) : null);
        setLocation(item.actionUrl ?? (leadId ? `/front-desk/leads/${leadId}` : "/front-desk"));
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
