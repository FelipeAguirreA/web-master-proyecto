"use client";

import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";

import { useConsent } from "@/lib/cookie-consent";

/**
 * Monta Vercel Analytics + Speed Insights solo cuando el user dio consent
 * para "analytics". Reacciona en tiempo real al cambio de consent vía el
 * hook useConsent (useSyncExternalStore subscrito al CustomEvent del banner
 * y al storage event cross-tab).
 *
 * Si el user revoca el consent, los componentes se desmontan — Vercel deja
 * de capturar nuevos eventos. Los ya enviados no se pueden borrar desde
 * acá (deberían borrarse desde el dashboard de Vercel si se requiere).
 */
export default function AnalyticsGate() {
  const consent = useConsent();
  if (!consent?.analytics) return null;
  return (
    <>
      <Analytics />
      <SpeedInsights />
    </>
  );
}
