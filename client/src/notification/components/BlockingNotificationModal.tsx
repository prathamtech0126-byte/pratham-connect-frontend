import { AlertTriangle, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { NotificationItem } from "../types/notification.types";
import {
  formatFollowupNotificationBody,
  getNotificationAccent,
} from "../lib/notification-display";

interface Props {
  notification: NotificationItem;
  onAcknowledge: () => void;
}

export function BlockingNotificationModal({ notification, onAcknowledge }: Props) {
  const accent = getNotificationAccent(notification.priority);

  return (
    <div className="fixed inset-0 z-[9998] flex items-center justify-center bg-black/50 p-4">
      <div
        className={cn(
          "relative flex w-full max-w-lg flex-col rounded-lg border-2 shadow-2xl",
          accent
        )}
      >
        <div className="flex-shrink-0 border-b border-current/20 p-6">
          <div className="mb-2 flex items-center gap-3">
            <AlertTriangle className="h-6 w-6" />
            <h2 className="text-xl font-bold">{notification.title}</h2>
          </div>
          <p className="text-xs uppercase tracking-wide opacity-70">
            {notification.category} · {notification.priority}
          </p>
        </div>
        <div className="max-h-[40vh] flex-1 overflow-y-auto p-6">
          <p className="whitespace-pre-wrap leading-relaxed">
            {formatFollowupNotificationBody(notification)}
          </p>
        </div>
        <div className="flex justify-end border-t border-current/20 bg-white/40 p-6 dark:bg-black/20">
          <Button onClick={onAcknowledge} className="gap-2">
            <CheckCircle2 className="h-4 w-4" />
            Acknowledge
          </Button>
        </div>
      </div>
    </div>
  );
}
