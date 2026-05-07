import type { ErrorEvent, EventHint } from "@sentry/nextjs";

const SENSITIVE_HEADERS = new Set([
  "authorization",
  "cookie",
  "set-cookie",
  "x-api-key",
  "x-auth-token",
]);

const SENSITIVE_QUERY_KEYS = new Set([
  "token",
  "access_token",
  "refresh_token",
  "reset_token",
  "password",
  "email",
]);

function redactString(_value: string): string {
  return "[Filtered]";
}

function sanitizeHeaders(
  headers: Record<string, string> | undefined,
): Record<string, string> | undefined {
  if (!headers) return headers;
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(headers)) {
    out[k] = SENSITIVE_HEADERS.has(k.toLowerCase()) ? redactString(v) : v;
  }
  return out;
}

function sanitizeUrl(url: string | undefined): string | undefined {
  if (!url) return url;
  try {
    const u = new URL(url, "http://placeholder.local");
    let mutated = false;
    for (const key of Array.from(u.searchParams.keys())) {
      if (SENSITIVE_QUERY_KEYS.has(key.toLowerCase())) {
        u.searchParams.set(key, "[Filtered]");
        mutated = true;
      }
    }
    if (!mutated) return url;
    return u.host === "placeholder.local"
      ? u.pathname + u.search
      : u.toString();
  } catch {
    return url;
  }
}

/**
 * beforeSend hook compartido por server/client/edge. Stripea PII residual
 * que `sendDefaultPii: false` no garantiza al 100% (cookies en headers
 * custom, query strings con tokens, user.email, ip_address). Defensa en
 * profundidad para Ley 21.719 — el SDK puede mejorar pero la base legal
 * para enviar PII a Sentry (USA) NO la tenemos sin DPA + consentimiento.
 */
export function sanitizeSentryEvent(
  event: ErrorEvent,
  _hint: EventHint,
): ErrorEvent | null {
  if (event.user) {
    delete event.user.email;
    delete event.user.username;
    delete event.user.ip_address;
  }

  if (event.request) {
    event.request.headers = sanitizeHeaders(event.request.headers);
    delete event.request.cookies;
    event.request.url = sanitizeUrl(event.request.url);
    if (event.request.query_string) {
      event.request.query_string = sanitizeUrl(
        `?${event.request.query_string}`,
      )?.replace(/^\?/, "");
    }
  }

  return event;
}
