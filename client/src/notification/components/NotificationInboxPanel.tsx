import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { NotificationCategory, NotificationItem } from "../types/notification.types";
import {
  filterByCategory,
  formatFollowupNotificationBody,
  formatNotificationTime,
  getNotificationAccent,
  getNotificationIcon,
  isBlockingPriority,
} from "../lib/notification-display";

const FILTERS: { id: NotificationCategory; label: string }[] = [
  { id: "all", label: "All" },
  { id: "leads", label: "Leads" },
  { id: "payments", label: "Payments" },
  { id: "alerts", label: "Alerts" },
];

interface Props {
  items: NotificationItem[];
  filter: NotificationCategory;
  onFilterChange: (f: NotificationCategory) => void;
  onItemClick: (item: NotificationItem) => void;
  onMarkAllRead: () => void;
  isLoading?: boolean;
}

export function NotificationInboxPanel({
  items,
  filter,
  onFilterChange,
  onItemClick,
  onMarkAllRead,
  isLoading,
}: Props) {
  const filtered = filterByCategory(items, filter);

  return (
    <div className="flex flex-col gap-2 p-2">
      <div className="flex flex-wrap items-center justify-between gap-2 px-1">
        <p className="text-sm font-semibold text-foreground">Notifications</p>
        <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={onMarkAllRead}>
          Mark all read
        </Button>
      </div>
      <div className="flex flex-wrap gap-1">
        {FILTERS.map((f) => (
          <button
            key={f.id}
            type="button"
            onClick={() => onFilterChange(f.id)}
            className={cn(
              "rounded-full px-2.5 py-0.5 text-[11px] font-medium transition-colors",
              filter === f.id
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            )}
          >
            {f.label}
          </button>
        ))}
      </div>
      {isLoading ? (
        <p className="py-6 text-center text-sm text-muted-foreground">Loading…</p>
      ) : filtered.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted-foreground">No notifications</p>
      ) : (
        <ul className="max-h-80 space-y-2 overflow-y-auto">
          {filtered.map((item) => {
            const Icon = getNotificationIcon(item.type);
            const unread = !item.readAt;
            return (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => onItemClick(item)}
                  className={cn(
                    "w-full rounded-lg border p-3 text-left transition-colors hover:bg-muted/60",
                    unread ? "border-primary/30 bg-primary/5" : "border-border bg-card"
                  )}
                >
                  <div className="flex gap-3">
                    <div
                      className={cn(
                        "mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
                        getNotificationAccent(item.priority)
                      )}
                    >
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm font-semibold leading-tight">{item.title}</p>
                        {unread && (
                          <span className="h-2 w-2 shrink-0 rounded-full bg-primary" />
                        )}
                      </div>
                      <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                        {formatFollowupNotificationBody(item)}
                      </p>
                      <div className="mt-1 flex items-center gap-2">
                        <span className="text-[10px] text-muted-foreground">
                          {formatNotificationTime(item.createdAt)}
                        </span>
                        {isBlockingPriority(item.priority) && (
                          <span className="text-[10px] font-medium uppercase text-orange-600">
                            Alert
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
