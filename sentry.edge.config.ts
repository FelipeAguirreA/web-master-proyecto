// This file configures the initialization of Sentry for edge features (middleware, edge routes, and so on).
// The config you add here will be used whenever one of the edge features is loaded.
// Note that this config is unrelated to the Vercel Edge Runtime and is also required when running locally.
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
