export type NotificationCategory =
  | "leads"
  | "payments"
  | "clients"
  | "operations"
  | "system"
  | "alerts"
  | "all";

export type NotificationPriority = "low" | "normal" | "high" | "urgent";

export interface NotificationItem {
  id: number;
  type: string;
  category: string;
  priority: string;
  title: string;
  body: string;
  entityType: string | null;
  entityId: number | null;
  actionUrl: string | null;
  meta: Record<string, unknown>;
  deliverAt: string;
  createdAt: string;
  readAt: string | null;
}

export interface NotificationListResponse {
  success: boolean;
  data: NotificationItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}
