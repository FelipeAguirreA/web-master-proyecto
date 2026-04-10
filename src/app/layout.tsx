import type { Metadata } from "next";
import { Outfit } from "next/font/google";
import Providers from "@/components/providers";
import "./globals.css";

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: "PractiX — Encuentra tu práctica ideal con IA",
  description:
    "PractiX conecta estudiantes con prácticas laborales usando inteligencia artificial. Sube tu CV y recibí recomendaciones personalizadas.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className={`${outfit.variable}`}>
      <body className="min-h-screen bg-gray-50 text-gray-900 antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
