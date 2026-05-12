import type { Metadata } from "next";
import { getAuthSession, ADMIN_EMAIL } from "@/server/lib/auth";
import { PublicNav } from "@/components/layout/PublicNav";
import { LandingHero } from "@/components/landing/LandingHero";
import { LandingLogoWall } from "@/components/landing/LandingLogoWall";
import { LandingStats } from "@/components/landing/LandingStats";
import { LandingProblem } from "@/components/landing/LandingProblem";
import { LandingHowItWorks } from "@/components/landing/LandingHowItWorks";
import { LandingProduct } from "@/components/landing/LandingProduct";
import { LandingDualAudience } from "@/components/landing/LandingDualAudience";
import { LandingTestimonials } from "@/components/landing/LandingTestimonials";
import { LandingFAQ } from "@/components/landing/LandingFAQ";
import { LandingCTA } from "@/components/landing/LandingCTA";
import { LandingFooter } from "@/components/landing/LandingFooter";
import { ScrollReveal } from "@/components/landing/ScrollReveal";

export const metadata: Metadata = {
  title: "PractiX — Prácticas profesionales con matching por IA | Chile",
  description:
    "PractiX conecta estudiantes universitarios chilenos con prácticas profesionales usando IA semántica. Sube tu CV y encuentra las prácticas donde tu perfil ya está entre los mejores. Gratis para estudiantes.",
  keywords: [
    "práctica profesional Chile",
    "pasantías Chile",
    "prácticas universitarias",
    "matching IA",
    "portal de prácticas",
    "trabajo para estudiantes",
    "prácticas Santiago",
  ],
  alternates: { canonical: "https://practix.app/" },
  openGraph: {
    type: "website",
    url: "https://practix.app/",
    title: "PractiX — Prácticas profesionales con matching por IA",
    description:
      "IA semántica que lee tu CV como un reclutador experto y te muestra las prácticas donde tu perfil ya está entre los mejores.",
    locale: "es_CL",
    siteName: "PractiX",
  },
  twitter: {
    card: "summary_large_image",
    title: "PractiX — Prácticas profesionales con matching por IA",
    description:
      "IA semántica que lee tu CV y te muestra las prácticas donde ya eres candidato top. Gratis para estudiantes.",
  },
};

export default async function Home() {
  const session = await getAuthSession();

  return (
    <div
      style={{
        fontFamily:
          "var(--font-onest), 'Plus Jakarta Sans', ui-sans-serif, system-ui, sans-serif",
        background: "#FAFAF8",
        color: "#0A0909",
        minHeight: "100vh",
        overflowX: "hidden",
      }}
    >
      <PublicNav
        isLoggedIn={!!session}
        isAdmin={session?.user.email === ADMIN_EMAIL}
      />
      <main>
        <LandingHero />
        <LandingLogoWall />
        <LandingStats />
        <LandingProblem />
        <LandingHowItWorks />
        <LandingProduct />
        <LandingDualAudience />
        <LandingTestimonials />
        <LandingFAQ />
        <LandingCTA />
      </main>
      <LandingFooter />
      <ScrollReveal />
    </div>
  );
}
