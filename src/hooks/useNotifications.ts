"use client";

import { useCallback, useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { fetchWithRefresh } from "@/lib/client/fetch-with-refresh";
import { supabaseRealtime } from "@/lib/client/supabase";
import { authenticateRealtime } from "@/lib/client/supabase-auth";

type AppNotification = {
  id: string;
  type:
    | "APPLICATION_REVIEWED"
    | "APPLICATION_ACCEPTED"
    | "APPLICATION_REJECTED"
    | "NEW_APPLICATION"
    | "NEW_MESSAGE";
  title: string;
  body: string;
  read: boolean;
  entityId: string | null;
  createdAt: string;
};

/**
 * Notificaciones del user actual. Estrategia event-driven (Supabase Realtime):
 *
 * 1. Fetch inicial al montar (`GET /api/notifications`) para hidratar el estado.
 * 2. Suscripción Realtime al canal `notifications:<userId>` filtrado por
 *    `userId=eq.<id>` server-side. Cuando alguien hace INSERT en la tabla
 *    `notifications` con ese userId, llega un push instantáneo → prepend al
 *    estado local. Cero polling.
 *
 * IMPORTANTE: requiere que la tabla `notifications` esté incluida en la
 * publication `supabase_realtime` (paso manual una sola vez en Supabase
 * Dashboard → Database → Replication, ver CHAT_MODULE.md). Sin eso, el fetch
 * inicial funciona pero los pushes no llegan.
 *
 * Antes este hook polleaba cada 10s a `/api/notifications` — reducción a 0
 * requests recurrentes mientras la sesión vive (solo el GET inicial).
 */
export function useNotifications() {
  const { data: session } = useSession();
  const userId = session?.user?.id ?? null;
  const [notifications, setNotifications] = useState<AppNotification[]>([]);

  const refresh = useCallback(() => {
    fetchWithRefresh("/api/notifications")
      .then((r) => (r.ok ? r.json() : []))
      .then((data: AppNotification[]) => setNotifications(data ?? []))
      .catch(() => {});
  }, []);

  // Fetch inicial: una sola vez por mount (o cuando el userId cambia, ej.
  // logout/login dentro de la misma SPA).
  useEffect(() => {
    if (!userId) return;
    refresh();
  }, [userId, refresh]);

  // Suscripción Realtime: solo cuando hay userId. Si la sesión cae, el cleanup
  // remueve el channel. Filter server-side por `userId` evita que el WebSocket
  // entregue notifs de otros users — esencial para no quemar la cuota Realtime
  // de Supabase (2M msg/mes en free tier).
  //
  // El nombre del canal incluye un sufijo de timestamp para evitar el bug de
  // React StrictMode (Next dev) donde el effect monta → cleanup → re-monta con
  // el mismo userId, y el cliente de Supabase devuelve el canal cacheado YA
  // subscribed → el .on() siguiente tira "cannot add postgres_changes callbacks
  // after subscribe()". Con sufijo único cada mount tiene su propio canal.
  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    let channelRef: ReturnType<typeof supabaseRealtime.channel> | null = null;

    // Async setup: primero auth JWT, después subscribe. Sin auth, las RLS
    // policies sobre `notifications` bloquean el SELECT y los pushes nunca
    // llegan. Si auth falla (sesión rota, red), no rompemos la app —
    // simplemente no hay Realtime en este mount (fetch inicial igual hidrata).
    (async () => {
      const ok = await authenticateRealtime();
      if (!ok || cancelled) return;

      const channelKey = `notifications:${userId}:${Date.now()}`;
      channelRef = supabaseRealtime
        .channel(channelKey)
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "notifications",
            filter: `userId=eq.${userId}`,
          },
          (payload) => {
            const row = payload.new as {
              id: string;
              userId: string;
              type: AppNotification["type"];
              title: string;
              body: string;
              read: boolean;
              entityId: string | null;
              createdAt: string;
            };
            // Defense-in-depth: filtramos también client-side por si el filter
            // del server llegara a fallar silenciosamente con column names
            // case-sensitive de Postgres.
            if (row.userId !== userId) return;
            setNotifications((prev) => {
              // Evita duplicar si la misma notif ya llegó por otro canal o si
              // el fetch inicial todavía estaba en vuelo cuando llegó el push.
              if (prev.some((n) => n.id === row.id)) return prev;
              return [
                {
                  id: row.id,
                  type: row.type,
                  title: row.title,
                  body: row.body,
                  read: row.read,
                  entityId: row.entityId,
                  createdAt: row.createdAt,
                },
                ...prev,
              ];
            });
          },
        )
        .subscribe();
    })();

    return () => {
      cancelled = true;
      if (channelRef) {
        // Unsubscribe explícito antes de removeChannel: garantiza que el
        // WebSocket libere el slot del lado servidor inmediatamente, evita
        // accumular subscriptions zombies en StrictMode.
        channelRef.unsubscribe();
        supabaseRealtime.removeChannel(channelRef);
      }
    };
  }, [userId]);

  const markAllRead = useCallback(async () => {
    await fetchWithRefresh("/api/notifications/read-all", { method: "PATCH" });
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  }, []);

  const deleteNotification = useCallback(
    async (id: string) => {
      const prev = notifications;
      setNotifications((curr) => curr.filter((n) => n.id !== id));
      const res = await fetchWithRefresh(`/api/notifications/${id}`, {
        method: "DELETE",
      });
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
    refresh,
  };
}
