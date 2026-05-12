import Link from "next/link";
import { C } from "./tokens";

const STUDENT_FEATS = [
  "Score de afinidad antes de postularte",
  "Recomendaciones ordenadas por match real",
  "CV analizado una vez, sirve para todo",
  "Gratis para siempre",
];

const COMPANY_FEATS = [
  "Candidatos pre-rankeados por IA",
  "Pipeline visual estilo Kanban",
  "Scoring configurable por puesto",
  "Chat directo con postulantes",
];

export function LandingDualAudience() {
  return (
    <section
      id="para-quien"
      style={{
        background: C.bg,
        padding: "100px 32px",
        borderBottom: `1px solid ${C.border}`,
      }}
    >
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>
        <div className="rv" style={{ textAlign: "center", marginBottom: 56 }}>
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 7,
              background: C.accentBg,
              border: `1px solid ${C.accentBdr}`,
              borderRadius: 40,
              padding: "4px 14px",
              fontSize: 10.5,
              fontWeight: 700,
              letterSpacing: 1,
              color: C.accent,
              marginBottom: 18,
              textTransform: "uppercase",
            }}
          >
            ¿Para quién?
          </span>
          <h2
            style={{
              fontSize: "clamp(1.8rem,3.8vw,3rem)",
              fontWeight: 800,
              letterSpacing: -1.5,
              color: C.text,
              lineHeight: 1.1,
            }}
          >
            Una plataforma.
            <br />
            Dos audiencias.
          </h2>
        </div>
        <div
          className="practix-dual-grid"
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 20,
          }}
        >
          {/* Estudiantes */}
          <div
            className="rv-l practix-dual-card-light"
            style={{
              background: C.surface,
              border: `1px solid ${C.border}`,
              borderRadius: 24,
              padding: "44px 40px",
              position: "relative",
              overflow: "hidden",
              transition: "transform .3s,box-shadow .3s",
            }}
          >
            <div
              style={{
                position: "absolute",
                top: 0,
                right: 0,
                width: "60%",
                height: "100%",
                background: `linear-gradient(225deg,${C.accentBg} 0%,transparent 60%)`,
                pointerEvents: "none",
              }}
            />
            <div style={{ position: "relative" }}>
              <div
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                  background: C.accentBg,
                  border: `1px solid ${C.accentBdr}`,
                  borderRadius: 10,
                  padding: "6px 14px",
                  marginBottom: 24,
                }}
              >
                <span style={{ fontSize: 16 }}>🎓</span>
                <span
                  style={{
                    fontSize: 12,
                    fontWeight: 700,
                    color: C.accent,
                    letterSpacing: 0.5,
                  }}
                >
                  PARA ESTUDIANTES
                </span>
              </div>
              <h3
                style={{
                  fontSize: "clamp(1.3rem,2.5vw,1.9rem)",
                  fontWeight: 800,
                  color: C.text,
                  letterSpacing: -1,
                  lineHeight: 1.15,
                  marginBottom: 16,
                }}
              >
                Encuentra prácticas donde ya eres competitivo.
              </h3>
              <p
                style={{
                  fontSize: 14.5,
                  color: C.muted,
                  lineHeight: 1.7,
                  marginBottom: 28,
                }}
              >
                No más postulaciones a ciegas. Ves tu score antes de postularte.
                Sabes en qué prácticas tienes chances reales y cuáles no valen
                tu tiempo.
              </p>
              <ul
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 12,
                  marginBottom: 32,
                  listStyle: "none",
                  padding: 0,
                }}
              >
                {STUDENT_FEATS.map((f, i) => (
                  <li
                    key={i}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      fontSize: 14,
                      color: C.text,
                      fontWeight: 500,
                    }}
                  >
                    <span
                      style={{
                        width: 20,
                        height: 20,
                        borderRadius: "50%",
                        background: C.greenBg,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                      }}
                    >
                      <svg
                        width="10"
                        height="10"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke={C.green}
                        strokeWidth="3"
                      >
                        <path d="M20 6L9 17l-5-5" />
                      </svg>
                    </span>
                    {f}
                  </li>
                ))}
              </ul>
              <Link
                href="/login?role=student"
                className="practix-dual-cta-warm"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                  background: `linear-gradient(135deg,${C.accent},${C.accentHi})`,
                  color: "#fff",
                  padding: "13px 24px",
                  borderRadius: 12,
                  fontWeight: 700,
                  fontSize: 14,
                  boxShadow: `0 6px 20px ${C.accent}55`,
                  transition: "opacity .2s",
                }}
              >
                Empezar gratis →
              </Link>
            </div>
          </div>

          {/* Empresas */}
          <div
            className="rv-r practix-dual-card-dark"
            style={{
              background: C.bgDark,
              borderRadius: 24,
              padding: "44px 40px",
              position: "relative",
              overflow: "hidden",
              color: "#fff",
              transition: "transform .3s,box-shadow .3s",
            }}
          >
            <div
              style={{
                position: "absolute",
                top: -40,
                right: -40,
                width: 220,
                height: 220,
                background: `${C.accent}18`,
                borderRadius: "50%",
                filter: "blur(60px)",
              }}
            />
            <div style={{ position: "relative" }}>
              <div
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                  background: "rgba(255,255,255,.08)",
                  border: "1px solid rgba(255,255,255,.12)",
                  borderRadius: 10,
                  padding: "6px 14px",
                  marginBottom: 24,
                }}
              >
                <span style={{ fontSize: 16 }}>🏢</span>
                <span
                  style={{
                    fontSize: 12,
                    fontWeight: 700,
                    color: "rgba(255,255,255,.7)",
                    letterSpacing: 0.5,
                  }}
                >
                  PARA EMPRESAS
                </span>
              </div>
              <h3
                style={{
                  fontSize: "clamp(1.3rem,2.5vw,1.9rem)",
                  fontWeight: 800,
                  color: "#fff",
                  letterSpacing: -1,
                  lineHeight: 1.15,
                  marginBottom: 16,
                }}
              >
                Solo revisas candidatos que realmente encajan.
              </h3>
              <p
                style={{
                  fontSize: 14.5,
                  color: "rgba(255,255,255,.6)",
                  lineHeight: 1.7,
                  marginBottom: 28,
                }}
              >
                El ATS pre-rankea los postulantes por afinidad semántica.
                Dedicas el tiempo de selección a los mejores, no a revisar 80
                CVs irrelevantes.
              </p>
              <ul
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 12,
                  marginBottom: 32,
                  listStyle: "none",
                  padding: 0,
                }}
              >
                {COMPANY_FEATS.map((f, i) => (
                  <li
                    key={i}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      fontSize: 14,
                      color: "rgba(255,255,255,.85)",
                      fontWeight: 500,
                    }}
                  >
                    <span
                      style={{
                        width: 20,
                        height: 20,
                        borderRadius: "50%",
                        background: "rgba(255,255,255,.08)",
                        border: "1px solid rgba(255,255,255,.15)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                      }}
                    >
                      <svg
                        width="10"
                        height="10"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke={C.accentHi}
                        strokeWidth="3"
                      >
                        <path d="M20 6L9 17l-5-5" />
                      </svg>
                    </span>
                    {f}
                  </li>
                ))}
              </ul>
              <Link
                href="/login?role=company"
                className="practix-dual-cta-dark"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                  background: "rgba(255,255,255,.1)",
                  backdropFilter: "blur(12px)",
                  border: "1px solid rgba(255,255,255,.2)",
                  color: "#fff",
                  padding: "13px 24px",
                  borderRadius: 12,
                  fontWeight: 700,
                  fontSize: 14,
                  transition: "background .2s",
                }}
              >
                Publicar práctica →
              </Link>
            </div>
          </div>
        </div>
      </div>
      <style>{`
        .practix-dual-card-light:hover { transform: translateY(-4px); box-shadow: 0 24px 64px -20px ${C.accent}22; }
        .practix-dual-card-dark:hover { transform: translateY(-4px); box-shadow: 0 24px 64px -20px ${C.accent}44; }
        .practix-dual-cta-warm:hover { opacity: .9; }
        .practix-dual-cta-dark:hover { background: rgba(255,255,255,.17) !important; }
        @media (max-width:768px){
          .practix-dual-grid{grid-template-columns:1fr !important}
        }
      `}</style>
    </section>
  );
}
