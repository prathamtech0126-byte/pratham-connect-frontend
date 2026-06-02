export type NotificationPriority = "low" | "normal" | "high" | "urgent" | string;

export type NotificationCategory = "all" | "alerts" | string;

export type NotificationItem = {
  id: number;
  title: string;
  body?: string | null;
  category?: NotificationCategory | null;
  type?: string | null;
  priority?: NotificationPriority | null;
  actionUrl?: string | null;
  entityId?: number | null;
  readAt?: string | null;
  meta?: Record<string, unknown> | null;
  createdAt?: string | null;
};
