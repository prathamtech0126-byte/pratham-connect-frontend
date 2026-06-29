import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useNotifications } from "../context/notification-context";
import { NotificationInboxPanel } from "./NotificationInboxPanel";
import type { NotificationCategory } from "../types/notification.types";
import { useState } from "react";

interface Props {
  /** Extra badge sources (legacy maintenance alert, etc.) */
  extraBadgeCount?: number;
  childrenBefore?: React.ReactNode;
}

export function NotificationBell({ extraBadgeCount = 0, childrenBefore }: Props) {
  const {
    notifications,
    unreadCount,
    isLoadingList,
    inboxFilter,
    setInboxFilter,
    handleNotificationClick,
    markAllRead,
    isRealtime,
  } = useNotifications();

  const [open, setOpen] = useState(false);
  const totalBadge = unreadCount + extraBadgeCount;

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative h-10 w-10 rounded-full text-muted-foreground transition-colors hover:bg-primary/5 hover:text-primary"
          title="Notifications"
        >
          <Bell className="h-5 w-5" />
          {totalBadge > 0 && (
            <span
              className="absolute -right-0.5 -top-0.5 flex h-5 min-w-[1.25rem] items-center justify-center rounded-full border-2 border-background bg-primary px-1 text-[10px] font-semibold leading-none text-primary-foreground"
              aria-label={`${totalBadge} unread notifications`}
            >
              {totalBadge > 99 ? "99+" : totalBadge}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-96 p-0" align="end">
        {childrenBefore}
        {isRealtime && (
          <div className="border-b px-3 py-1.5 flex items-center justify-end">
            <span
              className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse"
              aria-label="Connected"
            />
          </div>
        )}
        <NotificationInboxPanel
          items={notifications}
          filter={inboxFilter}
          onFilterChange={(f) => setInboxFilter(f as NotificationCategory)}
          onItemClick={(item) => {
            setOpen(false);
            handleNotificationClick(item);
          }}
          onMarkAllRead={() => markAllRead(inboxFilter === "all" ? undefined : inboxFilter)}
          isLoading={isLoadingList}
        />
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
