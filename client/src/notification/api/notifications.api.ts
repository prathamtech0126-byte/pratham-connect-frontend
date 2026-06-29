import api from "@/lib/api";
import type {
  NotificationListResponse,
  NotificationRealtimeMeta,
} from "../types/notification.types";

export async function fetchNotifications(params?: {
  page?: number;
  limit?: number;
  category?: string;
  unreadOnly?: boolean;
}): Promise<NotificationListResponse> {
  const res = await api.get<NotificationListResponse>("/api/notifications", { params });
  return res.data;
}

export async function fetchUnreadNotificationCount(
  category?: string
): Promise<{ count: number; realtime?: NotificationRealtimeMeta }> {
  const res = await api.get<{
    success: boolean;
    count: number;
    realtime?: NotificationRealtimeMeta;
  }>("/api/notifications/unread-count", {
    params: category ? { category } : undefined,
  });
  return { count: res.data.count ?? 0, realtime: res.data.realtime };
}

export async function markNotificationRead(id: number): Promise<void> {
  await api.patch(`/api/notifications/${id}/read`);
}

export async function markAllNotificationsRead(category?: string): Promise<void> {
  await api.patch("/api/notifications/read-all", category ? { category } : {});
}

export async function dismissNotification(id: number): Promise<void> {
  await api.patch(`/api/notifications/${id}/dismiss`);
}
