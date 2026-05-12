import { C } from "./tokens";

export function LandingProduct() {
  return (
    <section
      id="producto"
      style={{
        background: C.bgAlt,
        padding: "100px 32px",
        borderBottom: `1px solid ${C.border}`,
      }}
    >
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>
        <div
          className="rv"
          style={{
            textAlign: "center",
            maxWidth: 640,
            margin: "0 auto 56px",
          }}
        >
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
            El producto
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
            Todo lo que necesitas.
            <br />
            <span style={{ color: C.subtle }}>Nada de lo que no.</span>
          </h2>
        </div>
        <div
          className="practix-bento"
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(6,1fr)",
            gap: 14,
          }}
        >
          {/* IA Matching — span 4 */}
          <div
            className="rv practix-bento-card practix-bento-span4"
            style={{
              gridColumn: "span 4",
              background: C.surface,
              border: `1px solid ${C.border}`,
              borderRadius: 22,
              padding: 40,
              position: "relative",
              overflow: "hidden",
              transition: "box-shadow .3s",
            }}
          >
            <div
              style={{
                position: "absolute",
                top: 0,
                right: 0,
                width: "50%",
                height: "100%",
                background: `linear-gradient(225deg,${C.accentBg} 0%,transparent 65%)`,
                pointerEvents: "none",
              }}
            />
            <span
              style={{
                display: "inline-flex",
                background: `linear-gradient(135deg,${C.accent},${C.accentHi})`,
                color: "#fff",
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: 0.8,
                padding: "4px 12px",
                borderRadius: 8,
                marginBottom: 20,
                boxShadow: `0 4px 12px ${C.accent}45`,
              }}
            >
              IA SEMÁNTICA
            </span>
            <h3
              style={{
                fontSize: "clamp(1.2rem,2.2vw,1.7rem)",
                fontWeight: 800,
                color: C.text,
                lineHeight: 1.15,
                letterSpacing: -0.7,
                marginBottom: 12,
              }}
            >
              Matching que no busca palabras.
              <br />
              Busca{" "}
              <span
                style={{
                  background: `linear-gradient(135deg,${C.accent},${C.accentHi})`,
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                }}
              >
                sentido
              </span>
              .
            </h3>
            <p
              style={{
                fontSize: 14,
                color: C.muted,
                lineHeight: 1.7,
                maxWidth: 420,
                marginBottom: 28,
              }}
            >
              Modelo multilingüe de 384 dimensiones. Entiende sinónimos,
              contexto y equivalencias. No importa tu carrera — si tienes las
              habilidades, el modelo las encuentra en tu CV.
            </p>
            <div style={{ display: "flex", gap: 10 }}>
              {[
                {
                  t: "Tu CV",
                  v: "48 skills",
                  bg: `linear-gradient(135deg,${C.accentBg},${C.accent}18)`,
                },
                {
                  t: "Embedding",
                  v: "384-dim",
                  bg: "linear-gradient(135deg,#E4ECFF,#C5D4FF)",
                },
                {
                  t: "Matches",
                  v: "Top 10",
                  bg: "linear-gradient(135deg,#E7F8EA,#C5E8C7)",
                },
              ].map((it) => (
                <div
                  key={it.t}
                  style={{
                    flex: 1,
                    background: it.bg,
                    borderRadius: 14,
                    padding: "14px 16px",
                    border: "1px solid rgba(255,255,255,.7)",
                  }}
                >
                  <p
                    style={{
                      fontSize: 9.5,
                      fontWeight: 700,
                      letterSpacing: 0.8,
                      color: C.muted,
                      textTransform: "uppercase",
                      marginBottom: 6,
                    }}
                  >
                    {it.t}
                  </p>
                  <p
                    style={{
                      fontSize: 19,
                      fontWeight: 800,
                      color: C.text,
                      letterSpacing: -0.5,
                    }}
                  >
                    {it.v}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Chat — span 2 */}
          <div
            className="rv d1 practix-bento-span2"
            style={{
              gridColumn: "span 2",
              background: C.bgDark,
              borderRadius: 22,
              padding: 32,
              overflow: "hidden",
              position: "relative",
              color: "#fff",
            }}
          >
            <div
              style={{
                position: "absolute",
                top: -24,
                right: -24,
                width: 100,
                height: 100,
                background: `${C.accent}28`,
                borderRadius: "50%",
                filter: "blur(32px)",
              }}
            />
            <div style={{ position: "relative" }}>
              <div
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  background: "rgba(255,255,255,.08)",
                  border: "1px solid rgba(255,255,255,.12)",
                  borderRadius: 8,
                  padding: "3px 10px",
                  fontSize: 10,
                  fontWeight: 600,
                  color: "rgba(255,255,255,.7)",
                  marginBottom: 18,
                }}
              >
                <span
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: "50%",
                    background: "#28C840",
                    animation: "pulseDot 1.5s ease infinite",
                  }}
                />
                CHAT EN VIVO
              </div>
              <h3
                style={{
                  fontSize: 18,
                  fontWeight: 700,
                  letterSpacing: -0.5,
                  lineHeight: 1.25,
                  marginBottom: 10,
                }}
              >
                Habla directo con la empresa.
              </h3>
              <p
                style={{
                  fontSize: 12.5,
                  color: "rgba(255,255,255,.55)",
                  lineHeight: 1.55,
                  marginBottom: 22,
                }}
              >
                Sin intermediarios. Pregunta, coordina, avanza.
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
                <div
                  style={{
                    display: "flex",
                    gap: 8,
                    alignItems: "flex-end",
                  }}
                >
                  <div
                    style={{
                      width: 26,
                      height: 26,
                      borderRadius: "50%",
                      background: "linear-gradient(135deg,#FFC5A3,#FF9B6A)",
                      flexShrink: 0,
                    }}
                  />
                  <div
                    style={{
                      background: "rgba(255,255,255,.08)",
                      borderRadius: "12px 12px 12px 3px",
                      padding: "9px 13px",
                      fontSize: 12,
                      maxWidth: 190,
                    }}
                  >
                    ¿Tienes experiencia liderando equipos?
                  </div>
                </div>
                <div
                  style={{
                    display: "flex",
                    gap: 8,
                    alignItems: "flex-end",
                    flexDirection: "row-reverse",
                  }}
                >
                  <div
                    style={{
                      width: 26,
                      height: 26,
                      borderRadius: "50%",
                      background: "linear-gradient(135deg,#C5E8C7,#8BC68E)",
                      flexShrink: 0,
                    }}
                  />
                  <div
                    style={{
                      background: `linear-gradient(135deg,${C.accent},${C.accentHi})`,
                      borderRadius: "12px 12px 3px 12px",
                      padding: "9px 13px",
                      fontSize: 12,
                      maxWidth: 190,
                    }}
                  >
                    Sí, hice 3 proyectos ✨
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ATS — span 2 */}
          <div
            className="rv practix-bento-card practix-bento-span2"
            style={{
              gridColumn: "span 2",
              background: C.surface,
              border: `1px solid ${C.border}`,
              borderRadius: 22,
              padding: 32,
              transition: "box-shadow .3s",
            }}
          >
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: 14,
                background: "linear-gradient(135deg,#E4ECFF,#C5D4FF)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                marginBottom: 18,
              }}
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#3D5AFF"
                strokeWidth="2"
              >
                <rect x="3" y="3" width="18" height="18" rx="2" />
                <path d="M3 9h18M9 21V9" />
              </svg>
            </div>
            <h3
              style={{
                fontSize: 18,
                fontWeight: 700,
                color: C.text,
                letterSpacing: -0.4,
                marginBottom: 10,
              }}
            >
              ATS con scoring automático
            </h3>
            <p
              style={{
                fontSize: 13,
                color: C.muted,
                lineHeight: 1.65,
                marginBottom: 18,
              }}
            >
              Para empresas. Pipeline visual, scoring configurable, filtros por
              afinidad semántica.
            </p>
            <div style={{ display: "flex", gap: 8 }}>
              {[
                { l: "Nuevos", n: 12, bg: "#E4ECFF" },
                { l: "Revisados", n: 5, bg: C.accentBg },
                { l: "OK", n: 3, bg: "#E7F8EA" },
              ].map((p) => (
                <div
                  key={p.l}
                  style={{
                    flex: 1,
                    background: p.bg,
                    borderRadius: 12,
                    padding: "10px 12px",
                  }}
                >
                  <div
                    style={{
                      fontSize: 9,
                      fontWeight: 700,
                      textTransform: "uppercase",
                      letterSpacing: 0.5,
                      color: C.muted,
                      marginBottom: 4,
                    }}
                  >
                    {p.l}
                  </div>
                  <div
                    style={{
                      fontSize: 21,
                      fontWeight: 900,
                      color: C.text,
                    }}
                  >
                    {p.n}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Agenda — span 2 */}
          <div
            className="rv d1 practix-bento-span2"
            style={{
              gridColumn: "span 2",
              background: `linear-gradient(135deg,${C.accentBg},${C.accent}10)`,
              border: `1px solid ${C.accentBdr}`,
              borderRadius: 22,
              padding: 32,
            }}
          >
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: 14,
                background: C.surface,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                marginBottom: 18,
                boxShadow: `0 4px 14px ${C.accent}30`,
              }}
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke={C.accent}
                strokeWidth="2"
              >
                <rect x="3" y="4" width="18" height="18" rx="2" />
                <path d="M16 2v4M8 2v4M3 10h18" />
              </svg>
            </div>
            <h3
              style={{
                fontSize: 18,
                fontWeight: 700,
                color: C.text,
                letterSpacing: -0.4,
                marginBottom: 10,
              }}
            >
              Agenda interna
            </h3>
            <p
              style={{
                fontSize: 13,
                color: C.muted,
                lineHeight: 1.65,
                marginBottom: 16,
              }}
            >
              Coordina entrevistas sin salir de la plataforma.
            </p>
            <div
              style={{
                background: C.surface,
                borderRadius: 14,
                padding: "14px 16px",
                border: `1px solid ${C.border}`,
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: 4,
                }}
              >
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    color: C.text,
                  }}
                >
                  Mar 18
                </span>
                <span
                  style={{
                    fontSize: 9.5,
                    color: C.accent,
                    background: C.accentBg,
                    padding: "2px 8px",
                    borderRadius: 8,
                    fontWeight: 700,
                  }}
                >
                  HOY
                </span>
              </div>
              <div
                style={{
                  fontSize: 12.5,
                  fontWeight: 600,
                  color: C.text,
                }}
              >
                Entrevista · Falabella Tech
              </div>
              <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>
                14:30 · 30 min
              </div>
            </div>
          </div>

          {/* Speed — span 2 */}
          <div
            className="rv d2 practix-bento-card practix-bento-span2"
            style={{
              gridColumn: "span 2",
              background: C.surface,
              border: `1px solid ${C.border}`,
              borderRadius: 22,
              padding: 32,
              transition: "box-shadow .3s",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "baseline",
                gap: 4,
                marginBottom: 14,
              }}
            >
              <span
                style={{
                  fontSize: 64,
                  fontWeight: 900,
                  letterSpacing: -4,
                  lineHeight: 1,
                  background: `linear-gradient(135deg,${C.text},${C.muted})`,
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                }}
              >
                2.8
              </span>
              <span
                style={{
                  fontSize: 22,
                  fontWeight: 700,
                  color: C.muted,
                }}
              >
                s
              </span>
            </div>
            <h3
              style={{
                fontSize: 17,
                fontWeight: 700,
                color: C.text,
                letterSpacing: -0.4,
                marginBottom: 10,
              }}
            >
              En leer tu CV completo
            </h3>
            <p style={{ fontSize: 13, color: C.muted, lineHeight: 1.65 }}>
              Parsing + embedding + scoring contra toda la base activa. Antes de
              que termine tu café.
            </p>
          </div>
        </div>
      </div>
      <style>{`
        .practix-bento-card:hover { box-shadow: 0 20px 60px -20px ${C.accent}28; }
        @media (max-width:768px){
          .practix-bento-span4{grid-column:span 6 !important}
          .practix-bento-span2{grid-column:span 6 !important}
        }
        @media (max-width:1024px) and (min-width:769px){
          .practix-bento-span4{grid-column:span 6 !important}
          .practix-bento-span2{grid-column:span 3 !important}
        }
      `}</style>
    </section>
  );
}
