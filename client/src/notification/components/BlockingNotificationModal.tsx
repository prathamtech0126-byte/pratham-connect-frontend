import type { NotificationItem } from "@/types/notification.types";
import { Button } from "@/components/ui/button";

type BlockingNotificationModalProps = {
  notification: NotificationItem;
  onAcknowledge: () => void;
};

export function BlockingNotificationModal({
  notification,
  onAcknowledge,
}: BlockingNotificationModalProps) {
  const body = notification.body?.trim() || "You have an important notification.";

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-lg border bg-background p-5 shadow-lg">
        <h3 className="text-base font-semibold">{notification.title || "Important notification"}</h3>
        <p className="mt-2 text-sm text-muted-foreground whitespace-pre-wrap">{body}</p>
        <div className="mt-4 flex justify-end">
          <Button onClick={onAcknowledge}>Acknowledge</Button>
        </div>
      </div>
    </div>
  );
}
