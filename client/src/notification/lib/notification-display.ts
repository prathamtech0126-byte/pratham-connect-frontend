import {
  AlertTriangle,
  Bell,
  CalendarClock,
  FileText,
  Megaphone,
  UserPlus,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import { formatTimestamp } from "@/lib/format-timestamp";
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
  if (type.startsWith("visa_case_")) return FileText;
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

export function isFollowupNotificationType(type: string): boolean {
  return (
    type === "lead_followup_reminder" ||
    type === "lead_followup_overdue" ||
    type === "lead_followup_manager_escalation" ||
    type === "lead_followup_admin_escalation"
  );
}

/** Follow-up is due now (not just "coming up" reminder). */
export function isFollowupDueNotification(item: NotificationItem): boolean {
  if (item.type === "lead_followup_overdue") {
    const phase = (item.meta as { phase?: string } | undefined)?.phase;
    return phase === "five_hour";
  }
  if (item.type !== "lead_followup_reminder") return false;
  const phase = (item.meta as { phase?: string } | undefined)?.phase;
  return phase === "due" || item.title === "Follow-up now";
}

/** Full-screen acknowledge card (partial payment, follow-up due, etc.). */
export function shouldShowBlockingModal(item: NotificationItem): boolean {
  if (item.type === "payment_partial" || item.type === "payment_pending_approval") {
    return true;
  }
  if (isFollowupDueNotification(item)) return true;
  return false;
}

/** Partial payment / approval requests — always alert with sound. */
export function isPaymentApprovalNotification(item: NotificationItem): boolean {
  return item.type === "payment_partial" || item.type === "payment_pending_approval";
}

/** Play alert sound for these notification types (instant on socket/sync). */
export function shouldPlayAlertSound(item: NotificationItem): boolean {
  if (isPaymentApprovalNotification(item)) return true;
  if (shouldShowBlockingModal(item)) return true;
  if (isFollowupNotificationType(item.type)) return true;
  if (
    item.type === "lead_assignment_batch" ||
    (item.meta && (item.meta as { batch?: boolean }).batch === true)
  ) {
    return true;
  }
  return isBlockingPriority(item.priority);
}

/** Correct IST time in follow-up notification copy (inbox + blocking popup). */
export function formatFollowupNotificationBody(item: NotificationItem): string {
  const meta = item.meta as { followupAt?: string } | undefined;
  const when = meta?.followupAt ? formatTimestamp(meta.followupAt, "datetime") : null;
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
        n.type === "lead_followup_manager_escalation" ||
        n.type === "lead_followup_admin_escalation" ||
        (n.category === "alerts" && n.type !== "lead_followup_reminder")
    );
  }
  return items.filter((n) => n.category === category);
}
