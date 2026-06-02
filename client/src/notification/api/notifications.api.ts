import api from "@/lib/api";
import type { NotificationCategory, NotificationItem } from "@/types/notification.types";

type NotificationListResponse = {
  success: boolean;
  data: NotificationItem[];
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
};

export async function fetchNotifications(params?: {
  page?: number;
  limit?: number;
  category?: NotificationCategory;
  type?: string;
  unreadOnly?: boolean;
}): Promise<NotificationListResponse> {
  const res = await api.get("/api/notifications", { params });
  return res.data;
}

export async function fetchUnreadNotificationCount(category?: NotificationCategory): Promise<number> {
  const res = await api.get("/api/notifications/unread-count", {
    params: category ? { category } : undefined,
  });
  return Number(res.data?.count ?? 0);
}

export async function markNotificationRead(id: number): Promise<NotificationItem | null> {
  const res = await api.patch(`/api/notifications/${id}/read`);
  return (res.data?.data ?? null) as NotificationItem | null;
}

export async function markAllNotificationsRead(category?: string): Promise<number> {
  const res = await api.patch("/api/notifications/read-all", category ? { category } : {});
  return Number(res.data?.updated ?? 0);
}
