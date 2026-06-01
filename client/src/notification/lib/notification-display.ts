import {
  AlertTriangle,
  Bell,
  CalendarClock,
  Megaphone,
  UserPlus,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import { formatCrmTimestamp } from "@/lib/format-crm-timestamp";
import type { NotificationItem } from "../types/notification.types";

export function isBlockingPriority(priority: string): boolean {
  return priority === "high" || priority === "urgent";
}

export function getNotificationIcon(type: string): LucideIcon {
  if (type.startsWith("lead_")) {
    if (type.includes("followup") || type.includes("overdue")) return CalendarClock;
    if (type === "lead_assignment_batch" || type.includes("transfer") || type.includes("assign")) {
      return UserPlus;
    }
    return Megaphone;
  }
  if (type.startsWith("payment_")) return Wallet;
  if (type.includes("deadline") || type.includes("overdue")) return AlertTriangle;
  return Bell;
}

export function getNotificationAccent(priority: string): string {
  switch (priority) {
    case "urgent":
      return "bg-red-100 text-red-800 border-red-200";
    case "high":
      return "bg-orange-100 text-orange-800 border-orange-200";
    case "low":
      return "bg-slate-100 text-slate-700 border-slate-200";
    default:
      return "bg-blue-50 text-blue-800 border-blue-100";
  }
}

/** Correct IST time in follow-up notification copy (inbox + blocking popup). */
export function formatFollowupNotificationBody(item: NotificationItem): string {
  const meta = item.meta as { followupAt?: string } | undefined;
  const when = meta?.followupAt ? formatCrmTimestamp(meta.followupAt, "datetime") : null;
  if (!when || !item.type.startsWith("lead_followup")) {
    return item.body;
  }

  let body = item.body;
  body = body.replace(/\(at [^)]+\)/gi, `(at ${when})`);
  body = body.replace(/\(due [^)]+\)/gi, `(due ${when})`);
  body = body.replace(/\(scheduled for [^)]+\)/gi, `(scheduled for ${when})`);
  body = body.replace(/was due at .+? and/i, `was due at ${when} and`);
  body = body.replace(/was due at [^.]+\./i, `was due at ${when}.`);
  return body;
}

export function formatNotificationTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const now = Date.now();
  const diff = now - d.getTime();
  if (diff < 60_000) return "Just now";
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
  return d.toLocaleString("en-IN", { dateStyle: "short", timeStyle: "short" });
}

export function filterByCategory(
  items: NotificationItem[],
  category: string
): NotificationItem[] {
  if (!category || category === "all") return items;
  if (category === "alerts") {
    return items.filter(
      (n) =>
        isBlockingPriority(n.priority) ||
        n.type === "lead_followup_overdue" ||
        n.type === "lead_followup_reminder" ||
        n.category === "alerts"
    );
  }
  return items.filter((n) => n.category === category);
}
