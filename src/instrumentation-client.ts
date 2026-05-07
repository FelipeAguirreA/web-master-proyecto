// This file configures the initialization of Sentry on the client.
// The added config here will be used whenever a users loads a page in their browser.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from "@sentry/nextjs";

import { sanitizeSentryEvent } from "@/lib/sentry-sanitize";

Sentry.init({
  dsn: "https://0f1e02559efea7fb2aee4d37f879939d@o4511197419667456.ingest.us.sentry.io/4511197433495552",

  tracesSampleRate: 0.1,

  // Ley 21.719: ver justificación en sentry.server.config.ts.
  sendDefaultPii: false,
  beforeSend: sanitizeSentryEvent,
});

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
