"use client";

import { fetchWithRefresh } from "./fetch-with-refresh";
import { supabaseRealtime } from "./supabase";

/**
 * Fetchea un JWT firmado por `/api/auth/supabase-token` y lo aplica al cliente
 * de Supabase Realtime via `realtime.setAuth(token)`.
 *
 * Llamar SIEMPRE antes de suscribir un canal sobre tablas con RLS activado
 * (`messages`, `notifications`). Sin esto, el JWT del WebSocket es el anon
 * key implícito, las policies RLS rechazan el SELECT, y los pushes nunca
 * llegan.
 *
 * Cache en memoria: el token vive 4h pero re-fetcheamos a la primera mount
 * del hook. Si el componente queda montado >4h (caso raro en una SPA dashboard
 * con navegación), el WebSocket se desconectará al expirar — el handler de
 * reconnect del SDK puede recuperar con un nuevo setAuth.
 *
 * Returns true si setAuth fue exitoso, false si falló (network, 401, etc.).
 * El caller puede decidir si degradar a fetch-only o reintentar.
 */
export async function authenticateRealtime(): Promise<boolean> {
  try {
    const res = await fetchWithRefresh("/api/auth/supabase-token", {
      method: "POST",
    });
    if (!res.ok) return false;
    const data = (await res.json()) as { token?: string };
    if (!data.token) return false;
    supabaseRealtime.realtime.setAuth(data.token);
    return true;
  } catch {
    return false;
  }
}
