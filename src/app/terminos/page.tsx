import type { Metadata } from "next";

import { LegalShell } from "@/components/legal/LegalShell";

export const metadata: Metadata = {
  title: "Términos de Uso — PractiX",
  description:
    "Términos que regulan el uso de PractiX para estudiantes y empresas. Jurisdicción Chile, Ley 19.496.",
};

export default function TerminosPage() {
  return <LegalShell doc="terminos" />;
}
