// This file configures the initialization of Sentry on the browser.
// The config you add here will be used whenever a users loads a page in their browser.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from "@sentry/nextjs";

import { sanitizeSentryEvent } from "@/lib/sentry-sanitize";

Sentry.init({
  dsn: "https://0f1e02559efea7fb2aee4d37f879939d@o4511197419667456.ingest.us.sentry.io/4511197433495552",

  tracesSampleRate: 0.1,

  // Ley 21.719: NO enviar PII por default + sanitizer defense-in-depth.
  // Session Replay desactivado: graba interacciones + DOM changes que
  // pueden incluir PII visible (formularios con email/RUT, CV uploaded,
  // datos de postulaciones). Reactivar solo con `maskAllText: true` +
  // `blockAllMedia: true` y consentimiento explícito del user.
  sendDefaultPii: false,
  beforeSend: sanitizeSentryEvent,
});
