/**
 * Wrapper de `fetch` que intercepta 401, llama a `/api/auth/refresh` y
 * reintenta la request original UNA vez. Si el refresh falla, redirige
 * a /login.
 *
 * Single-flight: si N requests fallan en paralelo con 401, sólo UNA
 * dispara el refresh; el resto espera a esa misma promesa. Evita race
 * conditions y N+1 llamadas a /refresh.
 *
 * Uso:
 *   import { fetchWithRefresh } from "@/lib/client/fetch-with-refresh";
 *   const res = await fetchWithRefresh("/api/internships");
 *
 * SOLO para llamadas a la propia API (rutas relativas o mismo origin).
 * Para servicios externos usar `fetch` directo — no queremos interceptar
 * 401 ajenos.
 */

let refreshPromise: Promise<boolean> | null = null;

async function performRefresh(): Promise<boolean> {
  try {
    const res = await fetch("/api/auth/refresh", {
      method: "POST",
      credentials: "same-origin",
    });
    return res.ok;
  } catch {
    return false;
  }
}

function getRefreshPromise(): Promise<boolean> {
  if (refreshPromise) return refreshPromise;
  refreshPromise = performRefresh().finally(() => {
    refreshPromise = null;
  });
  return refreshPromise;
}

function redirectToLogin(): void {
  if (typeof window === "undefined") return;
  // Preservar la URL actual como callbackUrl si no estamos ya en /login.
  const current = window.location.pathname + window.location.search;
  if (current.startsWith("/login")) return;
  const url = `/login?callbackUrl=${encodeURIComponent(current)}`;
  window.location.assign(url);
}

// Llama fetch sin pasar `undefined` como segundo arg cuando init no fue
// provisto — preserva el shape exacto que ven los tests (fetch(url) vs
// fetch(url, undefined) son equivalentes en runtime pero distintos para
// matchers de spies).
function callFetch(
  input: RequestInfo | URL,
  init: RequestInit | undefined,
): Promise<Response> {
  return init === undefined ? fetch(input) : fetch(input, init);
}

export async function fetchWithRefresh(
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<Response> {
  const first = await callFetch(input, init);
  if (first.status !== 401) return first;

  // No reintentar si la propia request es a /api/auth/refresh — evita loop.
  const url = typeof input === "string" ? input : input.toString();
  if (url.includes("/api/auth/refresh") || url.includes("/api/auth/logout")) {
    return first;
  }

  const refreshed = await getRefreshPromise();
  if (!refreshed) {
    redirectToLogin();
    return first;
  }

  // Reintenta UNA vez. Si vuelve a 401 → redirect.
  const second = await callFetch(input, init);
  if (second.status === 401) {
    redirectToLogin();
  }
  return second;
}

export const __testing = {
  resetRefreshPromise: () => {
    refreshPromise = null;
  },
};
