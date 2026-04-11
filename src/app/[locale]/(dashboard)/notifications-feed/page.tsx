"use client";

import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { useCallback, useRef, useState } from "react";
import { useNotifications } from "@/context/NotificationContext";
import { getNotificationLink } from "@/lib/notifications";
import { Button } from "@/components/ui/button";
import { formatDashboardDateTimeWithSeconds } from "@/lib/datetime-display";

export default function NotificationsFeedPage() {
  const locale = useLocale();
  const tPages = useTranslations("pages");
  const tCommon = useTranslations("common");
  const {
    notifications,
    unreadCount,
    isHydrated,
    isFetching,
    error,
    markAllAsRead,
    markNotificationAsRead,
    deleteNotification,
    deleteAllNotifications,
  } = useNotifications();

  const showBootSpinner =
    !isHydrated || (isFetching && notifications.length === 0 && !error);
  const router = useRouter();

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showActions, setShowActions] = useState(false);
  const longPressTimerRef = useRef<number | null>(null);
  const longPressTriggeredRef = useRef(false);

  const handleItemClick = (id: string) => {
    if (longPressTriggeredRef.current) {
      longPressTriggeredRef.current = false;
      return;
    }
    const notification = notifications.find((n) => n.id === id);
    if (!notification) return;
    const link = getNotificationLink(notification);
    markNotificationAsRead(id);
    router.push(link);
  };

  const startLongPress = useCallback((id: string) => {
    if (longPressTimerRef.current) {
      window.clearTimeout(longPressTimerRef.current);
    }
    longPressTriggeredRef.current = false;
    longPressTimerRef.current = window.setTimeout(() => {
      longPressTriggeredRef.current = true;
      setSelectedId(id);
      setShowActions(true);
    }, 500);
  }, []);

  const cancelLongPress = useCallback(() => {
    if (longPressTimerRef.current) {
      window.clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  }, []);

  const handleDeleteSelected = () => {
    if (selectedId) {
      deleteNotification(selectedId);
    }
    setShowActions(false);
    setSelectedId(null);
  };

  const handleDeleteAll = () => {
    deleteAllNotifications();
    setShowActions(false);
    setSelectedId(null);
  };

  const handleCloseActions = () => {
    setShowActions(false);
    setSelectedId(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-medium text-foreground">
          {tPages("notificationsFeedTitle")}
          {notifications.length > 0
            ? ` ${tPages("notificationsCountInParens", { count: notifications.length })}`
            : ""}
        </h1>
        <Button
          variant="outline"
          size="sm"
          onClick={markAllAsRead}
          disabled={unreadCount === 0 || notifications.length === 0}
        >
          {tPages("notificationsMarkAllRead")}
        </Button>
      </div>

      {showBootSpinner && (
        <div className="flex h-40 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      )}

      {isHydrated && !isFetching && error && (
        <p className="text-sm text-destructive">{error}</p>
      )}

      {isHydrated && !isFetching && !error && notifications.length === 0 && (
        <p className="text-sm text-muted-foreground">{tPages("notificationsEmpty")}</p>
      )}

      {isHydrated && !error && notifications.length > 0 && (
        <>
          <div className="divide-y divide-border overflow-hidden rounded-card border border-dashed border-border bg-background">
            {notifications.map((notification) => (
              <button
                key={notification.id}
                type="button"
                onClick={() => handleItemClick(notification.id)}
                onMouseDown={() => startLongPress(notification.id)}
                onMouseUp={cancelLongPress}
                onMouseLeave={cancelLongPress}
                onTouchStart={() => startLongPress(notification.id)}
                onTouchEnd={cancelLongPress}
                onTouchCancel={cancelLongPress}
                className={`flex w-full items-start justify-between gap-3 px-4 py-3 text-left text-sm transition hover:bg-muted ${
                  !notification.isRead ? "bg-primary/10" : ""
                }`}
              >
                <div>
                  <div className="font-medium">{notification.title}</div>
                  {notification.message && (
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {notification.message}
                    </p>
                  )}
                </div>
                <div className="shrink-0 text-xs text-muted-foreground">
                  {formatDashboardDateTimeWithSeconds(notification.createdAt, locale)}
                </div>
              </button>
            ))}
          </div>

          {showActions && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
              <div className="w-full max-w-sm rounded-card bg-background p-4 shadow-lg">
                <p className="mb-4 text-sm font-medium text-foreground">
                  {tPages("notificationsManageTitle")}
                </p>
                <div className="flex flex-col gap-2">
                  <Button variant="destructive" size="sm" onClick={handleDeleteSelected}>
                    {tPages("notificationsDeleteThis")}
                  </Button>
                  <Button variant="outline" size="sm" onClick={handleDeleteAll}>
                    {tPages("notificationsDeleteAll")}
                  </Button>
                  <Button variant="ghost" size="sm" onClick={handleCloseActions}>
                    {tCommon("cancel")}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

