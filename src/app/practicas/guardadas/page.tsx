"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { PublicNav } from "@/components/layout/PublicNav";
import { ADMIN_EMAIL } from "@/lib/constants";
import { fetchWithRefresh } from "@/lib/client/fetch-with-refresh";
import {
  PracticaCard,
  type PracticaCardData,
} from "@/components/dashboard/sections/PracticaCard";
import { PracticaCardSkeleton } from "@/components/dashboard/sections/Skeletons";
import { D } from "@/components/dashboard/tokens";
import {
  companyColor,
  companyInitials,
} from "@/components/dashboard/companyColors";
import { Icon } from "@/components/dashboard/Icon";

const MODALITY_LABEL: Record<string, string> = {
  REMOTE: "Remoto",
  ONSITE: "Presencial",
  HYBRID: "Híbrido",
};

type ApiInternship = {
  id: string;
  title: string;
  description?: string | null;
  area: string;
  location: string;
  modality: "REMOTE" | "ONSITE" | "HYBRID";
  duration: string;
  skills?: string[];
  createdAt?: string;
  savedAt?: string;
  matchScore?: number | null;
  company: { companyName: string; logo: string | null };
};

function toCard(it: ApiInternship, applied: boolean): PracticaCardData {
  const co = it.company.companyName;
  const color = companyColor(co);
  const score = Math.round(it.matchScore ?? 0);
  const top =
    score >= 95
      ? "Top 5%"
      : score >= 90
        ? "Top 10%"
        : score >= 80
          ? "Top 20%"
          : null;
  const mode = `${MODALITY_LABEL[it.modality] ?? it.modality} · ${it.location}`;
  const isNew = it.createdAt
    ? Date.now() - new Date(it.createdAt).getTime() < 7 * 24 * 3600 * 1000
    : false;
  return {
    id: it.id,
    co,
    logo: companyInitials(co),
    logoUrl: it.company.logo ?? null,
    logoBg: color.bg,
    logoFg: color.fg,
    title: it.title,
    description: it.description ?? null,
    mode,
    salary: null,
    dur: it.duration,
    score,
    top,
    tags: (it.skills ?? []).slice(0, 4),
    deadline: null,
    applicants: null,
    isNew,
    ai: null,
    applied,
  };
}

export default function GuardadasPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [saved, setSaved] = useState<ApiInternship[]>([]);
  const [appliedIds, setAppliedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  // Solo estudiantes pueden tener guardadas. Si entra una empresa o
  // visitante, mandamos a login con callback para volver acá tras loggear.
  useEffect(() => {
    if (status === "loading") return;
    if (!session) {
      router.replace("/login?callbackUrl=/practicas/guardadas");
      return;
    }
    if (session.user.role !== "STUDENT") {
      router.replace("/practicas");
    }
  }, [session, status, router]);

  useEffect(() => {
    if (!session || session.user.role !== "STUDENT") return;
    Promise.all([
      fetchWithRefresh("/api/internships/saved", { cache: "no-store" })
        .then((r) => (r.ok ? r.json() : []))
        .catch(() => []),
      fetchWithRefresh("/api/applications/my", { cache: "no-store" })
        .then((r) => (r.ok ? r.json() : []))
        .catch(() => []),
    ])
      .then(
        ([savedData, apps]: [
          ApiInternship[],
          Array<{ internship?: { id: string } | null }>,
        ]) => {
          setSaved(savedData ?? []);
          const ids = new Set<string>();
          for (const a of apps ?? []) {
            if (a.internship?.id) ids.add(a.internship.id);
          }
          setAppliedIds(ids);
        },
      )
      .finally(() => setLoading(false));
  }, [session]);

  const cards = saved.map((it) => toCard(it, appliedIds.has(it.id)));

  return (
    <div
      style={{
        position: "relative",
        minHeight: "100vh",
        background: D.bg,
        color: D.text,
        fontFamily: "var(--font-onest), ui-sans-serif, system-ui",
        overflowX: "hidden",
      }}
    >
      <div
        aria-hidden
        style={{
          position: "fixed",
          inset: 0,
          pointerEvents: "none",
          zIndex: 0,
        }}
      >
        <div
          style={{
            position: "absolute",
            top: "-15%",
            left: "-10%",
            width: "60%",
            height: "50%",
            borderRadius: "50%",
            opacity: 0.5,
            background:
              "radial-gradient(closest-side, rgba(255,166,122,0.4), rgba(255,166,122,0) 70%)",
            filter: "blur(40px)",
          }}
        />
      </div>

      <PublicNav
        isLoggedIn={!!session}
        isAdmin={session?.user.email === ADMIN_EMAIL}
      />

      <main
        style={{
          position: "relative",
          zIndex: 10,
          paddingTop: 96,
          paddingBottom: 80,
        }}
      >
        <div
          style={{
            maxWidth: 1280,
            margin: "0 auto",
            padding: "0 24px",
          }}
          className="practix-list-container"
        >
          <Link
            href="/dashboard/estudiante"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              fontSize: 12.5,
              color: D.muted,
              fontWeight: 600,
              marginBottom: 16,
              textDecoration: "none",
            }}
          >
            <Icon name="arr" size={12} color={D.muted} />
            Volver al dashboard
          </Link>

          <section
            style={{
              display: "flex",
              alignItems: "flex-end",
              justifyContent: "space-between",
              gap: 20,
              marginBottom: 24,
              flexWrap: "wrap",
            }}
          >
            <div>
              <h1
                style={{
                  fontSize: "clamp(1.7rem,2.8vw,2.2rem)",
                  fontWeight: 800,
                  letterSpacing: -1,
                  color: D.text,
                  lineHeight: 1.1,
                  marginBottom: 8,
                }}
              >
                Mis guardadas
              </h1>
              <p
                style={{
                  fontSize: 14,
                  color: D.muted,
                  lineHeight: 1.55,
                  maxWidth: 560,
                }}
              >
                {loading
                  ? "Cargando…"
                  : saved.length === 0
                    ? "Todavía no guardaste ninguna práctica."
                    : `${saved.length} práctica${saved.length === 1 ? "" : "s"} marcada${saved.length === 1 ? "" : "s"} para revisar después.`}
              </p>
            </div>
          </section>

          {loading ? (
            <div
              className="practix-list-grid"
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(2, 1fr)",
                gap: 14,
              }}
            >
              {Array.from({ length: 6 }, (_, i) => (
                <PracticaCardSkeleton key={i} />
              ))}
            </div>
          ) : cards.length === 0 ? (
            <div
              style={{
                background: D.surface,
                border: `1px dashed ${D.border}`,
                borderRadius: 16,
                padding: 40,
                textAlign: "center",
                color: D.muted,
                fontSize: 13.5,
                lineHeight: 1.6,
              }}
            >
              <p
                style={{
                  color: D.text,
                  fontWeight: 700,
                  fontSize: 14,
                  marginBottom: 6,
                }}
              >
                Sin guardadas todavía
              </p>
              Cuando encuentres una práctica que te interese, presioná{" "}
              <b>Guardar</b> en su detalle. Aparece acá para revisar después sin
              postular ya.
              <div style={{ marginTop: 16 }}>
                <Link
                  href="/practicas"
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    background: D.accent,
                    color: "#fff",
                    padding: "10px 18px",
                    borderRadius: 10,
                    fontSize: 13,
                    fontWeight: 700,
                    textDecoration: "none",
                  }}
                >
                  Explorar prácticas
                </Link>
              </div>
            </div>
          ) : (
            <div
              className="practix-list-grid"
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(2, 1fr)",
                gap: 14,
              }}
            >
              {cards.map((p) => (
                <PracticaCard key={p.id} p={p} />
              ))}
            </div>
          )}
        </div>
      </main>

      <style>{`
        @media (max-width:900px) {
          .practix-list-grid { grid-template-columns: 1fr !important; }
        }
        @media (max-width:600px) {
          .practix-list-container { padding: 0 16px !important; }
        }
      `}</style>
    </div>
  );
}
