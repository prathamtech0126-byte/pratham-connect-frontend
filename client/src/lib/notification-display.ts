import type { NotificationItem } from "@/types/notification.types";

export function isBlockingPriority(priority: NotificationItem["priority"]): boolean {
  return String(priority ?? "").toLowerCase() === "urgent";
}

export function formatFollowupNotificationBody(item: NotificationItem): string {
  const body = String(item.body ?? "").trim();
  if (body) return body;
  return "You have a new notification.";
}
