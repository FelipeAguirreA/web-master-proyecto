"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { PublicNav } from "@/components/layout/PublicNav";
import { ADMIN_EMAIL } from "@/lib/constants";
import { fetchWithRefresh } from "@/lib/client/fetch-with-refresh";
import { D } from "@/components/dashboard/tokens";
import { Icon } from "@/components/dashboard/Icon";
import { CoLogo } from "@/components/dashboard/atoms/CoLogo";
import { ScoreVis } from "@/components/dashboard/atoms/ScoreVis";
import { Tag } from "@/components/dashboard/atoms/Tag";
import {
  companyColor,
  companyInitials,
} from "@/components/dashboard/companyColors";

type InternshipDetail = {
  id: string;
  title: string;
  description: string;
  area: string;
  location: string;
  modality: "REMOTE" | "ONSITE" | "HYBRID";
  duration: string;
  responsibilities?: string[];
  requirements: string[];
  skills: string[];
  createdAt: string;
  company: {
    companyName: string;
    logo: string | null;
    industry: string | null;
    website: string | null;
    description: string | null;
  };
};

const MODALITY_LABEL: Record<string, string> = {
  REMOTE: "Remoto",
  ONSITE: "Presencial",
  HYBRID: "Híbrido",
};

function AmbientMesh() {
  return (
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
      <div
        style={{
          position: "absolute",
          top: "-5%",
          right: "-15%",
          width: "55%",
          height: "50%",
          borderRadius: "50%",
          opacity: 0.45,
          background:
            "radial-gradient(closest-side, rgba(255,210,180,0.5), rgba(255,210,180,0) 70%)",
          filter: "blur(50px)",
        }}
      />
    </div>
  );
}

function Block({
  title,
  sub,
  children,
}: {
  title: string;
  sub?: string;
  children: React.ReactNode;
}) {
  return (
    <section
      style={{
        background: D.surface,
        border: `1px solid ${D.border}`,
        borderRadius: 18,
        padding: "22px 26px",
      }}
    >
      <header style={{ marginBottom: 14 }}>
        <h2
          style={{
            fontSize: 16,
            fontWeight: 800,
            color: D.text,
            letterSpacing: -0.4,
          }}
        >
          {title}
        </h2>
        {sub && (
          <p
            style={{
              fontSize: 12.5,
              color: D.muted,
              marginTop: 3,
            }}
          >
            {sub}
          </p>
        )}
      </header>
      {children}
    </section>
  );
}

export default function InternshipDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: session } = useSession();
  const router = useRouter();

  const [internship, setInternship] = useState<InternshipDetail | null>(null);
  const [matchScore, setMatchScore] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [applying, setApplying] = useState(false);
  const [applied, setApplied] = useState(false);
  const [wasAlreadyApplied, setWasAlreadyApplied] = useState(false);
  const [applyError, setApplyError] = useState("");
  const [shareLabel, setShareLabel] = useState("Compartir");
  const [saved, setSaved] = useState(false);
  const [showCompany, setShowCompany] = useState(false);

  useEffect(() => {
    const fetchInternship = async () => {
      try {
        const res = await fetchWithRefresh(`/api/internships/${id}`, {
          cache: "no-store",
        });
        if (res.status === 404) {
          setNotFound(true);
          return;
        }
        const data = await res.json();
        setInternship(data);
      } catch {
        setNotFound(true);
      } finally {
        setLoading(false);
      }
    };
    fetchInternship();
  }, [id]);

  useEffect(() => {
    if (!session || session.user.role !== "STUDENT") return;
    fetchWithRefresh("/api/applications/my", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : []))
      .then((apps: Array<{ internshipId: string }>) => {
        if (apps.some((a) => a.internshipId === id)) {
          setApplied(true);
          setWasAlreadyApplied(true);
        }
      })
      .catch(() => {});
  }, [id, session]);

  useEffect(() => {
    if (!session || session.user.role !== "STUDENT") return;
    fetchWithRefresh("/api/matching/recommendations", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : []))
      .then((data: Array<{ id: string; matchScore?: number | null }>) => {
        const found = data.find((r) => r.id === id);
        if (found && typeof found.matchScore === "number") {
          setMatchScore(Math.round(found.matchScore));
        }
      })
      .catch(() => {});
  }, [id, session]);

  // Estado "guardada" inicial. Hidrata desde el server para que al recargar
  // la página el corazón refleje la verdad y no el default false.
  useEffect(() => {
    if (!session || session.user.role !== "STUDENT") return;
    fetchWithRefresh("/api/internships/saved", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : []))
      .then((items: Array<{ id: string }>) => {
        if (items.some((i) => i.id === id)) setSaved(true);
      })
      .catch(() => {});
  }, [id, session]);

  const handleToggleSave = async () => {
    if (!session) {
      router.push(`/login?callbackUrl=/practicas/${id}`);
      return;
    }
    if (session.user.role !== "STUDENT") return;
    // Optimistic update: si el server falla, revertimos.
    const prev = saved;
    setSaved(!prev);
    try {
      const res = await fetchWithRefresh(`/api/internships/${id}/save`, {
        method: "POST",
      });
      if (!res.ok) setSaved(prev);
      else {
        const data: { saved: boolean } = await res.json();
        setSaved(data.saved);
      }
    } catch {
      setSaved(prev);
    }
  };

  const handleApply = async () => {
    if (!session) {
      router.push(`/login?callbackUrl=/practicas/${id}`);
      return;
    }
    if (session.user.role !== "STUDENT") {
      setApplyError("Solo estudiantes pueden postular.");
      return;
    }
    setApplying(true);
    setApplyError("");
    try {
      const res = await fetchWithRefresh("/api/applications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ internshipId: id }),
      });
      if (res.ok) {
        setApplied(true);
      } else if (res.status === 409) {
        setApplied(true);
        setWasAlreadyApplied(true);
      } else {
        const data = await res.json().catch(() => ({}));
        setApplyError(data.error ?? "Error al postular. Intenta de nuevo.");
      }
    } catch {
      setApplyError("Error de red. Intenta de nuevo.");
    } finally {
      setApplying(false);
    }
  };

  const handleShare = async () => {
    const url = typeof window !== "undefined" ? window.location.href : "";
    try {
      if (navigator.share) {
        await navigator.share({
          title: internship?.title,
          url,
        });
        return;
      }
      await navigator.clipboard.writeText(url);
      setShareLabel("Copiado ✓");
      setTimeout(() => setShareLabel("Compartir"), 2000);
    } catch {
      // user cancelled or no support
    }
  };

  const topLabel = useMemo(() => {
    if (matchScore === null) return null;
    if (matchScore >= 95) return "Top 5%";
    if (matchScore >= 90) return "Top 10%";
    if (matchScore >= 80) return "Top 20%";
    return null;
  }, [matchScore]);

  const isNew = useMemo(() => {
    if (!internship?.createdAt) return false;
    return (
      Date.now() - new Date(internship.createdAt).getTime() <
      7 * 24 * 3600 * 1000
    );
  }, [internship]);

  if (loading) {
    return (
      <div
        style={{
          position: "relative",
          minHeight: "100vh",
          background: D.bg,
          color: D.text,
          fontFamily: "var(--font-onest), ui-sans-serif, system-ui",
        }}
      >
        <AmbientMesh />
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
              maxWidth: 1240,
              margin: "0 auto",
              padding: "0 24px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              minHeight: 320,
            }}
          >
            <div
              style={{
                width: 36,
                height: 36,
                border: `2px solid ${D.accent}25`,
                borderTopColor: D.accent,
                borderRadius: "50%",
                animation: "practix-det-spin .9s linear infinite",
              }}
            />
            <style>{`@keyframes practix-det-spin{to{transform:rotate(360deg)}}`}</style>
          </div>
        </main>
      </div>
    );
  }

  if (notFound || !internship) {
    return (
      <div
        style={{
          position: "relative",
          minHeight: "100vh",
          background: D.bg,
          color: D.text,
          fontFamily: "var(--font-onest), ui-sans-serif, system-ui",
        }}
      >
        <AmbientMesh />
        <PublicNav
          isLoggedIn={!!session}
          isAdmin={session?.user.email === ADMIN_EMAIL}
        />
        <main
          style={{
            position: "relative",
            zIndex: 10,
            paddingTop: 140,
            paddingBottom: 80,
          }}
        >
          <div
            style={{
              maxWidth: 560,
              margin: "0 auto",
              padding: "0 24px",
              textAlign: "center",
            }}
          >
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                width: 56,
                height: 56,
                borderRadius: 18,
                background: `linear-gradient(135deg,${D.accentBg},${D.cream})`,
                border: `1px solid ${D.accentBdr}`,
                marginBottom: 20,
              }}
            >
              <Icon name="briefc" size={26} color={D.accent} />
            </div>
            <h1
              style={{
                fontSize: 24,
                fontWeight: 800,
                color: D.text,
                marginBottom: 8,
                letterSpacing: -0.6,
              }}
            >
              Esta práctica ya no está disponible
            </h1>
            <p
              style={{
                fontSize: 14,
                color: D.muted,
                lineHeight: 1.55,
                marginBottom: 28,
              }}
            >
              La empresa dio de baja esta publicación o el enlace que seguiste
              apunta a una práctica que nunca existió.
            </p>
            <Link
              href="/practicas"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                background: D.text,
                color: "#fff",
                padding: "12px 20px",
                borderRadius: 12,
                fontSize: 14,
                fontWeight: 700,
                textDecoration: "none",
              }}
            >
              ← Ver todas las prácticas
            </Link>
          </div>
        </main>
      </div>
    );
  }

  const co = internship.company.companyName;
  const color = companyColor(co);
  const modeLabel = MODALITY_LABEL[internship.modality] ?? internship.modality;

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
      <AmbientMesh />
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
          className="practix-det-container"
          style={{
            maxWidth: 1240,
            margin: "0 auto",
            padding: "0 24px",
          }}
        >
          {/* Breadcrumb */}
          <nav
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              fontSize: 12,
              color: D.subtle,
              marginBottom: 14,
              flexWrap: "wrap",
            }}
          >
            <Link
              href="/practicas"
              style={{
                fontWeight: 600,
                color: D.subtle,
                textDecoration: "none",
              }}
            >
              Prácticas
            </Link>
            <span>/</span>
            <span style={{ fontWeight: 600 }}>{internship.area}</span>
            <span>/</span>
            <span
              style={{
                color: D.muted,
                fontWeight: 700,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
                maxWidth: 320,
              }}
            >
              {internship.title}
            </span>
          </nav>

          {/* Hero */}
          <section
            style={{
              background: D.dark,
              color: "#fff",
              borderRadius: 22,
              padding: "30px 32px",
              marginBottom: 20,
              position: "relative",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                position: "absolute",
                top: -80,
                right: -50,
                width: 340,
                height: 340,
                background: `radial-gradient(circle, ${D.accent}40, transparent 65%)`,
                pointerEvents: "none",
              }}
            />
            <div
              style={{
                position: "absolute",
                inset: 0,
                backgroundImage:
                  "radial-gradient(circle at 1px 1px,rgba(255,255,255,.04) 1px,transparent 0)",
                backgroundSize: "22px 22px",
                pointerEvents: "none",
              }}
            />
            <div
              style={{
                position: "relative",
                display: "flex",
                alignItems: "flex-start",
                gap: 20,
                flexWrap: "wrap",
              }}
            >
              <CoLogo
                logo={companyInitials(co)}
                logoUrl={internship.company.logo}
                logoBg={color.bg}
                logoFg={color.fg}
                size={72}
              />
              <div style={{ flex: 1, minWidth: 240 }}>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 9,
                    marginBottom: 8,
                    flexWrap: "wrap",
                  }}
                >
                  <span
                    style={{
                      fontSize: 13,
                      fontWeight: 700,
                      color: "rgba(255,255,255,.7)",
                    }}
                  >
                    {co}
                  </span>
                  {topLabel && (
                    <span
                      style={{
                        fontSize: 10,
                        fontWeight: 800,
                        color: D.accentHi,
                        background: "rgba(255,154,106,.18)",
                        padding: "2px 8px",
                        borderRadius: 5,
                        letterSpacing: 0.5,
                      }}
                    >
                      {topLabel}
                    </span>
                  )}
                  {isNew && (
                    <span
                      style={{
                        fontSize: 10,
                        fontWeight: 800,
                        color: "#0A0909",
                        background: D.accentHi,
                        padding: "2px 8px",
                        borderRadius: 5,
                        letterSpacing: 0.5,
                      }}
                    >
                      NUEVA
                    </span>
                  )}
                  <span
                    style={{
                      fontSize: 11.5,
                      color: "rgba(255,255,255,.55)",
                    }}
                  >
                    · {internship.area}
                  </span>
                </div>
                <h1
                  style={{
                    fontSize: "clamp(1.6rem,3vw,2.1rem)",
                    fontWeight: 800,
                    letterSpacing: -1.2,
                    lineHeight: 1.1,
                    marginBottom: 10,
                    textWrap: "balance",
                  }}
                >
                  {internship.title}
                </h1>
                <div
                  style={{
                    display: "flex",
                    gap: 18,
                    flexWrap: "wrap",
                    marginTop: 16,
                    fontSize: 12.5,
                    color: "rgba(255,255,255,.7)",
                  }}
                >
                  <span
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 6,
                    }}
                  >
                    <Icon name="pin" size={14} color="rgba(255,255,255,.5)" />
                    {modeLabel} · {internship.location}
                  </span>
                  <span
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 6,
                    }}
                  >
                    <Icon
                      name="briefc"
                      size={14}
                      color="rgba(255,255,255,.5)"
                    />
                    {internship.duration}
                  </span>
                </div>
              </div>

              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 8,
                  marginLeft: "auto",
                  minWidth: 170,
                }}
              >
                <button
                  type="button"
                  onClick={() => setShowCompany(true)}
                  style={{
                    padding: "10px 16px",
                    background: "rgba(255,255,255,.08)",
                    border: "1px solid rgba(255,255,255,.14)",
                    color: "#fff",
                    borderRadius: 11,
                    fontSize: 13,
                    fontWeight: 700,
                    cursor: "pointer",
                  }}
                >
                  Ver sobre la empresa
                </button>
              </div>
            </div>
          </section>

          {/* Body */}
          <div
            className="practix-det-grid"
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 340px",
              gap: 24,
              alignItems: "flex-start",
            }}
          >
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 18,
                minWidth: 0,
              }}
            >
              <Block title="Sobre la práctica">
                <p
                  style={{
                    fontSize: 14,
                    color: D.muted,
                    lineHeight: 1.65,
                    whiteSpace: "pre-wrap",
                  }}
                >
                  {internship.description}
                </p>
              </Block>

              {(internship.responsibilities?.length ?? 0) > 0 && (
                <Block
                  title="Lo que harás"
                  sub="Las tareas concretas del día a día."
                >
                  <ol
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: 8,
                      listStyle: "none",
                      padding: 0,
                      margin: 0,
                      counterReset: "task",
                    }}
                  >
                    {internship.responsibilities!.map((task, i) => (
                      <li
                        key={i}
                        style={{
                          display: "flex",
                          alignItems: "flex-start",
                          gap: 12,
                          padding: "10px 12px",
                          background: D.surface,
                          border: `1px solid ${D.border}`,
                          borderRadius: 11,
                        }}
                      >
                        <span
                          style={{
                            flexShrink: 0,
                            width: 24,
                            height: 24,
                            borderRadius: "50%",
                            background: D.accentBg,
                            color: D.accent,
                            fontSize: 12,
                            fontWeight: 800,
                            display: "inline-flex",
                            alignItems: "center",
                            justifyContent: "center",
                            lineHeight: 1,
                          }}
                        >
                          {i + 1}
                        </span>
                        <span
                          style={{
                            fontSize: 13,
                            color: D.text,
                            lineHeight: 1.55,
                            flex: 1,
                          }}
                        >
                          {task}
                        </span>
                      </li>
                    ))}
                  </ol>
                </Block>
              )}

              {internship.requirements.length > 0 && (
                <Block title="Requisitos" sub="Lo que necesitas para postular.">
                  <ul
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: 8,
                      listStyle: "none",
                      padding: 0,
                      margin: 0,
                    }}
                  >
                    {internship.requirements.map((req, i) => (
                      <li
                        key={i}
                        style={{
                          display: "flex",
                          alignItems: "flex-start",
                          gap: 10,
                          padding: "10px 12px",
                          background: D.surface,
                          border: `1px solid ${D.border}`,
                          borderRadius: 11,
                        }}
                      >
                        <span
                          style={{
                            flexShrink: 0,
                            fontSize: 10,
                            fontWeight: 800,
                            color: D.accent,
                            background: D.accentBg,
                            padding: "3px 8px",
                            borderRadius: 5,
                            letterSpacing: 0.4,
                          }}
                        >
                          INDISPENSABLE
                        </span>
                        <span
                          style={{
                            fontSize: 13,
                            color: D.text,
                            lineHeight: 1.5,
                            flex: 1,
                          }}
                        >
                          {req}
                        </span>
                      </li>
                    ))}
                  </ul>
                  {internship.skills.length > 0 && (
                    <div style={{ marginTop: 16 }}>
                      <h4
                        style={{
                          fontSize: 13,
                          fontWeight: 800,
                          color: D.text,
                          marginBottom: 9,
                          textTransform: "uppercase",
                          letterSpacing: 0.4,
                        }}
                      >
                        Skills
                      </h4>
                      <div
                        style={{
                          display: "flex",
                          gap: 7,
                          flexWrap: "wrap",
                        }}
                      >
                        {internship.skills.map((s) => (
                          <Tag key={s}>{s}</Tag>
                        ))}
                      </div>
                    </div>
                  )}
                </Block>
              )}
            </div>

            <aside
              className="practix-det-rail"
              style={{
                position: "sticky",
                top: 110,
                display: "flex",
                flexDirection: "column",
                gap: 16,
              }}
            >
              {/* Apply card */}
              <div
                style={{
                  background: D.surface,
                  border: `1px solid ${D.border}`,
                  borderRadius: 16,
                  padding: 18,
                  display: "flex",
                  flexDirection: "column",
                  gap: 14,
                }}
              >
                {matchScore !== null ? (
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 14,
                    }}
                  >
                    <ScoreVis
                      score={matchScore}
                      style="ring"
                      size={72}
                      label={false}
                    />
                    <div>
                      <div
                        style={{
                          fontSize: 11,
                          fontWeight: 800,
                          color:
                            matchScore >= 80
                              ? D.green
                              : matchScore >= 50
                                ? D.amber
                                : D.rose,
                          letterSpacing: 0.6,
                          textTransform: "uppercase",
                        }}
                      >
                        {matchScore >= 80
                          ? "Excelente match"
                          : matchScore >= 50
                            ? "Match medio"
                            : "Match bajo"}
                      </div>
                      <div
                        style={{
                          fontSize: 13,
                          color: D.muted,
                          fontWeight: 600,
                          lineHeight: 1.4,
                          marginTop: 2,
                        }}
                      >
                        {topLabel
                          ? `${topLabel} de candidatos para esta práctica.`
                          : "Tu CV calza con esta práctica."}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div
                    style={{
                      padding: "12px 14px",
                      background: D.bg,
                      border: `1px dashed ${D.border}`,
                      borderRadius: 11,
                      fontSize: 12,
                      color: D.muted,
                      lineHeight: 1.5,
                    }}
                  >
                    {session?.user.role === "STUDENT" ? (
                      <>
                        Sin match calculado para esta práctica.{" "}
                        <Link
                          href="/perfil"
                          style={{ color: D.accent, fontWeight: 700 }}
                        >
                          Sube tu CV
                        </Link>{" "}
                        para verlo.
                      </>
                    ) : (
                      <>
                        <Link
                          href="/login?role=student"
                          style={{ color: D.accent, fontWeight: 700 }}
                        >
                          Inicia sesión
                        </Link>{" "}
                        como estudiante para ver tu match.
                      </>
                    )}
                  </div>
                )}

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: 10,
                    padding: "12px 0",
                    borderTop: `1px solid ${D.border}`,
                    borderBottom: `1px solid ${D.border}`,
                  }}
                >
                  {[
                    { l: "Modalidad", v: modeLabel },
                    { l: "Duración", v: internship.duration },
                    { l: "Ubicación", v: internship.location },
                    { l: "Área", v: internship.area },
                  ].map((s) => (
                    <div key={s.l}>
                      <div
                        style={{
                          fontSize: 10.5,
                          fontWeight: 700,
                          color: D.subtle,
                          letterSpacing: 0.4,
                          textTransform: "uppercase",
                        }}
                      >
                        {s.l}
                      </div>
                      <div
                        style={{
                          fontSize: 13,
                          fontWeight: 700,
                          color: D.text,
                          marginTop: 2,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {s.v}
                      </div>
                    </div>
                  ))}
                </div>

                {applied ? (
                  <div
                    style={{
                      padding: "12px 14px",
                      background: D.greenBg,
                      border: `1px solid ${D.green}25`,
                      borderRadius: 11,
                      fontSize: 13,
                      color: D.green,
                      fontWeight: 700,
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      lineHeight: 1.5,
                    }}
                  >
                    <Icon
                      name="check"
                      size={16}
                      color={D.green}
                      strokeWidth={3}
                    />
                    {wasAlreadyApplied
                      ? "Ya postulaste a esta práctica"
                      : "¡Postulación enviada!"}
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={handleApply}
                    disabled={applying}
                    style={{
                      padding: "13px 16px",
                      background: `linear-gradient(135deg,${D.text},#222)`,
                      color: "#fff",
                      border: "none",
                      borderRadius: 11,
                      fontSize: 14,
                      fontWeight: 800,
                      cursor: applying ? "wait" : "pointer",
                      boxShadow: `0 10px 28px -10px ${D.text}, 0 3px 10px ${D.accent}33`,
                      opacity: applying ? 0.7 : 1,
                      fontFamily: "inherit",
                    }}
                  >
                    {applying
                      ? "Postulando…"
                      : session
                        ? "Postular ahora"
                        : "Iniciar sesión para postular"}
                  </button>
                )}

                {applyError && (
                  <p
                    style={{
                      fontSize: 12,
                      color: D.rose,
                      fontWeight: 600,
                      padding: "8px 10px",
                      background: D.roseBg,
                      borderRadius: 8,
                      border: `1px solid ${D.rose}25`,
                    }}
                  >
                    {applyError}
                  </p>
                )}

                <div style={{ display: "flex", gap: 8 }}>
                  <button
                    type="button"
                    onClick={handleToggleSave}
                    style={{
                      flex: 1,
                      padding: 10,
                      background: saved ? D.accentBg : "rgba(0,0,0,.04)",
                      border: saved ? `1px solid ${D.accentBdr}` : "none",
                      borderRadius: 10,
                      fontSize: 12,
                      fontWeight: 700,
                      color: saved ? D.accent : D.text,
                      cursor: "pointer",
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 6,
                      fontFamily: "inherit",
                    }}
                  >
                    <Icon
                      name="heart"
                      size={14}
                      color={saved ? D.accent : D.muted}
                    />
                    {saved ? "Guardada" : "Guardar"}
                  </button>
                  <button
                    type="button"
                    onClick={handleShare}
                    style={{
                      flex: 1,
                      padding: 10,
                      background: "rgba(0,0,0,.04)",
                      border: "none",
                      borderRadius: 10,
                      fontSize: 12,
                      fontWeight: 700,
                      color: D.text,
                      cursor: "pointer",
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 6,
                      fontFamily: "inherit",
                    }}
                  >
                    <Icon name="send" size={14} color={D.muted} />
                    {shareLabel}
                  </button>
                </div>

                {session?.user.role === "STUDENT" && !applied && (
                  <p
                    style={{
                      fontSize: 11.5,
                      color: D.subtle,
                      lineHeight: 1.5,
                      textAlign: "center",
                    }}
                  >
                    Postular toma <b style={{ color: D.muted }}>~2 min</b> · tu
                    CV está pre-cargado.
                  </p>
                )}
              </div>

              {/* Why this match — placeholder hasta que el backend devuelva breakdown */}
              {matchScore !== null && (
                <div
                  style={{
                    background: D.surface,
                    border: `1px solid ${D.border}`,
                    borderRadius: 16,
                    padding: 18,
                  }}
                >
                  <h3
                    style={{
                      fontSize: 13.5,
                      fontWeight: 800,
                      color: D.text,
                      letterSpacing: -0.2,
                      marginBottom: 12,
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                    }}
                  >
                    <span
                      style={{
                        width: 24,
                        height: 24,
                        borderRadius: 7,
                        background: D.accentBg,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <Icon name="spark" size={13} color={D.accent} />
                    </span>
                    Por qué tienes este match
                  </h3>
                  <p
                    style={{
                      fontSize: 12.5,
                      color: D.muted,
                      lineHeight: 1.6,
                    }}
                  >
                    Tu match es <b style={{ color: D.text }}>{matchScore}</b>{" "}
                    porque la IA comparó el contenido de tu CV con los
                    requisitos y descripción de esta práctica. Skills clave que
                    detectamos:{" "}
                    {internship.skills.slice(0, 3).join(", ") ||
                      "ninguna específica"}
                    .
                  </p>
                </div>
              )}
            </aside>
          </div>
        </div>
      </main>

      {showCompany && internship && (
        <>
          <button
            type="button"
            aria-label="Cerrar"
            onClick={() => setShowCompany(false)}
            style={{
              position: "fixed",
              inset: 0,
              background: "rgba(10,9,9,.55)",
              border: "none",
              cursor: "pointer",
              zIndex: 80,
            }}
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="company-modal-title"
            style={{
              position: "fixed",
              top: "50%",
              left: "50%",
              transform: "translate(-50%,-50%)",
              width: "min(520px, 94vw)",
              maxHeight: "90vh",
              overflow: "auto",
              background: D.bg,
              borderRadius: 18,
              zIndex: 81,
              boxShadow: "0 24px 64px rgba(10,9,9,.28)",
            }}
          >
            <div style={{ padding: "24px 24px 18px" }}>
              <div
                style={{
                  display: "flex",
                  gap: 16,
                  alignItems: "center",
                }}
              >
                <CoLogo
                  logo={companyInitials(co)}
                  logoUrl={internship.company.logo}
                  logoBg={color.bg}
                  logoFg={color.fg}
                  size={64}
                />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <h2
                    id="company-modal-title"
                    style={{
                      fontSize: 19,
                      fontWeight: 800,
                      color: D.text,
                      letterSpacing: -0.5,
                      lineHeight: 1.2,
                      margin: 0,
                    }}
                  >
                    {co}
                  </h2>
                  {internship.company.industry && (
                    <p
                      style={{
                        fontSize: 12,
                        color: D.subtle,
                        marginTop: 4,
                        margin: 0,
                      }}
                    >
                      {internship.company.industry}
                    </p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => setShowCompany(false)}
                  aria-label="Cerrar"
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 8,
                    background: "rgba(10,9,9,.05)",
                    border: "none",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 18,
                    color: D.muted,
                    lineHeight: 1,
                  }}
                >
                  ×
                </button>
              </div>

              <div style={{ marginTop: 18 }}>
                <div
                  style={{
                    fontSize: 10.5,
                    fontWeight: 800,
                    color: D.subtle,
                    letterSpacing: 0.4,
                    textTransform: "uppercase",
                    marginBottom: 8,
                  }}
                >
                  Sobre la empresa
                </div>
                {internship.company.description ? (
                  <p
                    style={{
                      fontSize: 13.5,
                      color: D.muted,
                      lineHeight: 1.65,
                      margin: 0,
                      whiteSpace: "pre-wrap",
                    }}
                  >
                    {internship.company.description}
                  </p>
                ) : (
                  <p
                    style={{
                      fontSize: 13,
                      color: D.subtle,
                      fontStyle: "italic",
                      margin: 0,
                    }}
                  >
                    Esta empresa todavía no agregó una descripción.
                  </p>
                )}
              </div>

              <div style={{ marginTop: 18 }}>
                <div
                  style={{
                    fontSize: 10.5,
                    fontWeight: 800,
                    color: D.subtle,
                    letterSpacing: 0.4,
                    textTransform: "uppercase",
                    marginBottom: 8,
                  }}
                >
                  Sitio web
                </div>
                {internship.company.website ? (
                  <a
                    href={
                      internship.company.website.startsWith("http")
                        ? internship.company.website
                        : `https://${internship.company.website}`
                    }
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 7,
                      padding: "10px 14px",
                      background: "rgba(10,9,9,.04)",
                      border: `1px solid ${D.border}`,
                      color: D.text,
                      borderRadius: 10,
                      fontSize: 13.5,
                      fontWeight: 700,
                      textDecoration: "none",
                      maxWidth: "100%",
                      wordBreak: "break-all",
                    }}
                  >
                    {internship.company.website.replace(/^https?:\/\//, "")}
                    <span
                      style={{ fontSize: 13, color: D.muted, flexShrink: 0 }}
                    >
                      ↗
                    </span>
                  </a>
                ) : (
                  <p
                    style={{
                      fontSize: 13,
                      color: D.subtle,
                      fontStyle: "italic",
                      margin: 0,
                    }}
                  >
                    Esta empresa no agregó un sitio web.
                  </p>
                )}
              </div>
            </div>
          </div>
        </>
      )}

      <style>{`
        @media (max-width:1024px) {
          .practix-det-grid { grid-template-columns: 1fr !important; }
          .practix-det-rail { position: static !important; }
        }
        @media (max-width:600px) {
          .practix-det-container { padding: 0 16px !important; }
        }
      `}</style>
    </div>
  );
}
