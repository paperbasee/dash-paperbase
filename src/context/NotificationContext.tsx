"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import {
  fetchNotifications,
  markAllAsReadOnClient,
  type DashboardNotification,
} from "@/lib/notifications";

interface NotificationState {
  notifications: DashboardNotification[];
  unreadCount: number;
  isLoading: boolean;
  error: string | null;
  markAllAsRead: () => void;
  markNotificationAsRead: (id: string) => void;
  deleteNotification: (id: string) => void;
  deleteAllNotifications: () => void;
}

const NotificationContext = createContext<NotificationState | undefined>(undefined);

const STORAGE_KEY = "gadzillabd_notification_read_ids";
const PREFS_KEY = "gadzillabd_notification_prefs";
const DELETED_KEY = "gadzillabd_notification_deleted_ids";

type NotificationPrefs = {
  orders: boolean;
  carts: boolean;
  wishlist: boolean;
  contacts: boolean;
};

function loadReadIds(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return new Set();
    const arr = JSON.parse(raw) as string[];
    return new Set(arr);
  } catch {
    return new Set();
  }
}

function saveReadIds(ids: Set<string>) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(ids)));
  } catch {
    // ignore
  }
}

function loadDeletedIds(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = window.localStorage.getItem(DELETED_KEY);
    if (!raw) return new Set();
    const arr = JSON.parse(raw) as string[];
    return new Set(arr);
  } catch {
    return new Set();
  }
}

function saveDeletedIds(ids: Set<string>) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(DELETED_KEY, JSON.stringify(Array.from(ids)));
  } catch {
    // ignore
  }
}

function loadPrefs(): NotificationPrefs {
  const defaults: NotificationPrefs = {
    orders: true,
    carts: true,
    wishlist: true,
    contacts: true,
  };
  if (typeof window === "undefined") return defaults;
  try {
    const raw = window.localStorage.getItem(PREFS_KEY);
    if (!raw) return defaults;
    const parsed = JSON.parse(raw) as Partial<NotificationPrefs>;
    return { ...defaults, ...parsed };
  } catch {
    return defaults;
  }
}

function filterByPrefs(list: DashboardNotification[]): DashboardNotification[] {
  const prefs = loadPrefs();
  const deletedIds = loadDeletedIds();
  return list
    .filter((n) => !deletedIds.has(n.id))
    .filter((n) => {
      switch (n.type) {
        case "new_order":
          return prefs.orders;
        case "added_to_cart":
          return prefs.carts;
        case "added_to_wishlist":
          return prefs.wishlist;
        case "contact_submission":
          return prefs.contacts;
        default:
          return true;
      }
    });
}

export function NotificationProvider({ children }: { children: ReactNode }) {
  const [notifications, setNotifications] = useState<DashboardNotification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const applyReadState = useCallback((list: DashboardNotification[]): DashboardNotification[] => {
    const readIds = loadReadIds();
    return list.map((n) => (readIds.has(n.id) ? { ...n, isRead: true } : n));
  }, []);

  const refresh = useCallback(async () => {
    try {
      setError(null);
      const data = await fetchNotifications();
      const filtered = filterByPrefs(data);
      setNotifications(applyReadState(filtered));
    } catch (err) {
      console.error("Failed to load notifications", err);
      setError("Failed to load notifications.");
    } finally {
      setIsLoading(false);
    }
  }, [applyReadState]);

  useEffect(() => {
    refresh();
    const interval = window.setInterval(refresh, 10000);

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        refresh();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [refresh]);

  const markAllAsRead = useCallback(() => {
    setNotifications((prev) => {
      const allIds = new Set<string>(prev.map((n) => n.id));
      saveReadIds(allIds);
      return markAllAsReadOnClient(prev);
    });
  }, []);

  const markNotificationAsRead = useCallback((id: string) => {
    setNotifications((prev) => {
      const next = prev.map((n) => (n.id === id ? { ...n, isRead: true } : n));
      const readIds = loadReadIds();
      readIds.add(id);
      saveReadIds(readIds);
      return next;
    });
  }, []);

  const deleteNotification = useCallback((id: string) => {
    setNotifications((prev) => {
      const next = prev.filter((n) => n.id !== id);
      const deletedIds = loadDeletedIds();
      deletedIds.add(id);
      saveDeletedIds(deletedIds);
      return next;
    });
  }, []);

  const deleteAllNotifications = useCallback(() => {
    setNotifications((prev) => {
      const deletedIds = loadDeletedIds();
      prev.forEach((n) => deletedIds.add(n.id));
      saveDeletedIds(deletedIds);
      return [];
    });
  }, []);

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        isLoading,
        error,
        markAllAsRead,
        markNotificationAsRead,
        deleteNotification,
        deleteAllNotifications,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error("useNotifications must be used within NotificationProvider");
  return ctx;
}

