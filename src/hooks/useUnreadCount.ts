"use client";

import { useEffect, useState } from "react";
import { fetchWithRefresh } from "@/lib/client/fetch-with-refresh";

/**
 * Devuelve el total de mensajes no leídos del user actual.
 *
 * Estrategia híbrida (optimizada para free tier de Supabase/Vercel):
 * - Polling cada 30s al endpoint dedicado `/api/chat/unread-count` (cheap
 *   SELECT COUNT vs traer la lista entera de conversaciones).
 * - Pausa cuando la pestaña NO está visible (`document.visibilityState`).
 *   La mayoría del tiempo el user tiene otras tabs activas — silenciar ese
 *   tráfico baja el costo ~70% sin que se note.
 * - Re-fetch inmediato al volver la pestaña a foreground.
 *
 * Antes este hook polleaba cada 5s a `/api/chat/conversations` (que trae la
 * lista completa con joins pesados). Reducción: 12 req/min → 2 req/min (tab
 * activa) o 0 (tab oculta). Backend además baja un orden de magnitud el costo
 * por request.
 */

const POLL_INTERVAL_MS = 30_000;

export function useUnreadCount() {
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    let cancelled = false;
    let intervalId: ReturnType<typeof setInterval> | null = null;

    const fetchCount = async () => {
      if (cancelled) return;
      try {
        const res = await fetchWithRefresh("/api/chat/unread-count");
        if (!res.ok || cancelled) return;
        const data = (await res.json()) as { count?: number };
        if (typeof data.count === "number") setUnread(data.count);
      } catch {
        // Silenciar errores transient — el siguiente tick reintenta.
      }
    };

    const startPolling = () => {
      if (intervalId !== null) return;
      intervalId = setInterval(fetchCount, POLL_INTERVAL_MS);
    };

    const stopPolling = () => {
      if (intervalId === null) return;
      clearInterval(intervalId);
      intervalId = null;
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        // Volvimos al tab: refetch inmediato + retomar polling. Sino el badge
        // queda desfasado hasta el próximo tick (hasta 30s de delay).
        fetchCount();
        startPolling();
      } else {
        stopPolling();
      }
    };

    // Mount: si la tab arranca visible, hacemos fetch inicial + polling.
    fetchCount();
    if (document.visibilityState === "visible") startPolling();

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      cancelled = true;
      stopPolling();
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  return unread;
}
