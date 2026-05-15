import type { Metadata } from "next";

import { LegalShell } from "@/components/legal/LegalShell";

export const metadata: Metadata = {
  title: "Política de Privacidad — PractiX",
  description:
    "Cómo PractiX recopila, usa, almacena y comparte tus datos personales en cumplimiento con la Ley 19.628 y la Ley 21.719 de Chile.",
};

export default function PrivacidadPage() {
  return <LegalShell doc="privacidad" />;
}
