"use client";

import { useCallback, useEffect, useState } from "react";

export type AppNotification = {
  id: string;
  type:
    | "APPLICATION_REVIEWED"
    | "APPLICATION_ACCEPTED"
    | "APPLICATION_REJECTED";
  title: string;
  body: string;
  read: boolean;
  entityId: string | null;
  createdAt: string;
};

export function useNotifications() {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);

  const fetch_ = useCallback(() => {
    fetch("/api/notifications")
      .then((r) => (r.ok ? r.json() : []))
      .then((data: AppNotification[]) => setNotifications(data ?? []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    fetch_();
    const interval = setInterval(fetch_, 10_000);
    return () => clearInterval(interval);
  }, [fetch_]);

  const markAllRead = useCallback(async () => {
    await fetch("/api/notifications/read-all", { method: "PATCH" });
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  }, []);

  const deleteNotification = useCallback(
    async (id: string) => {
      const prev = notifications;
      setNotifications((curr) => curr.filter((n) => n.id !== id));
      const res = await fetch(`/api/notifications/${id}`, { method: "DELETE" });
      if (!res.ok) {
        setNotifications(prev);
      }
    },
    [notifications],
  );

  const unreadCount = notifications.filter((n) => !n.read).length;

  return {
    notifications,
    unreadCount,
    markAllRead,
    deleteNotification,
    refresh: fetch_,
  };
}
