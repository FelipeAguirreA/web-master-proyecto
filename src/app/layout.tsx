import type { Metadata } from "next";
import { headers } from "next/headers";
import {
  Outfit,
  Instrument_Serif,
  Inter_Tight,
  JetBrains_Mono,
  Plus_Jakarta_Sans,
} from "next/font/google";
import AnalyticsGate from "@/components/AnalyticsGate";
import CookieConsent from "@/components/CookieConsent";
import Providers from "@/components/providers";
import "./globals.css";

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
});

const instrumentSerif = Instrument_Serif({
  variable: "--font-serif",
  subsets: ["latin"],
  weight: ["400"],
  style: ["normal", "italic"],
});

const interTight = Inter_Tight({
  variable: "--font-tight",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
});

const onest = Plus_Jakarta_Sans({
  variable: "--font-onest",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: "PractiX — Encuentra tu práctica ideal con IA",
  description:
    "PractiX conecta estudiantes con prácticas laborales usando inteligencia artificial. Sube tu CV y recibí recomendaciones personalizadas.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Forzar dynamic rendering en TODA la app para que CSP con nonces funcione.
  // Llamar a headers() es lo que oficialmente fuerza dynamic en App Router —
  // sin esto, las pages son static-prerendered en build time, sin acceso al
  // request, y los chunks + inline scripts del bundle quedan SIN nonce → CSP
  // los bloquea en producción.
  // Doc oficial: https://nextjs.org/docs/app/guides/content-security-policy
  // Trade-off aceptado: ISR / Partial Prerendering deshabilitados; cada page
  // se SSRea per request (~50-100ms extra). Compensado por la garantía de que
  // el nonce-per-request se aplica a TODOS los scripts del framework.
  await headers();

  return (
    <html
      lang="es"
      className={`${outfit.variable} ${instrumentSerif.variable} ${interTight.variable} ${jetbrainsMono.variable} ${onest.variable}`}
    >
      <body className="min-h-screen bg-gray-50 text-gray-900 antialiased">
        <Providers>{children}</Providers>
        <AnalyticsGate />
        <CookieConsent />
      </body>
    </html>
  );
}
