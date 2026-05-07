// This file configures the initialization of Sentry on the server.
// The config you add here will be used whenever the server handles a request.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from "@sentry/nextjs";

import { sanitizeSentryEvent } from "@/lib/sentry-sanitize";

Sentry.init({
  dsn: "https://0f1e02559efea7fb2aee4d37f879939d@o4511197419667456.ingest.us.sentry.io/4511197433495552",

  tracesSampleRate: 0.1,

  // Ley 21.719 (Chile): NO enviar PII por default. Sentry está hosteado en
  // USA — sin DPA + consentimiento explícito del titular, el envío es
  // transferencia internacional ilegal (Art. transferencia + base legal).
  // El sanitizer hace defensa en profundidad: aunque el SDK leakee algo,
  // se filtra antes de salir del runtime.
  sendDefaultPii: false,
  beforeSend: sanitizeSentryEvent,
});
