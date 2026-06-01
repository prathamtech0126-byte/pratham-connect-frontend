import api from "@/lib/api";
import type { NotificationListResponse } from "../types/notification.types";

export async function fetchNotifications(params?: {
  page?: number;
  limit?: number;
  category?: string;
  unreadOnly?: boolean;
}): Promise<NotificationListResponse> {
  const res = await api.get<NotificationListResponse>("/api/notifications", { params });
  return res.data;
}

export async function fetchUnreadNotificationCount(category?: string): Promise<number> {
  const res = await api.get<{ success: boolean; count: number }>(
    "/api/notifications/unread-count",
    { params: category ? { category } : undefined }
  );
  return res.data.count ?? 0;
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
