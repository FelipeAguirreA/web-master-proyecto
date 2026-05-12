import { C } from "./tokens";

const STEPS = [
  {
    n: "01",
    title: "Subes tu CV",
    body: "Sube tu CV en PDF o DOCX. El sistema extrae habilidades, experiencia, proyectos y competencias, incluso las que están implícitas en cómo describes tu trabajo.",
    tag: "Menos de 5 seg",
    detail: [
      "Soporta PDF y DOCX",
      "Extracción inteligente de texto",
      "Sin formato específico requerido",
    ],
    color: "#FFF3EC",
    accent: C.accent,
  },
  {
    n: "02",
    title: "La IA entiende tu perfil",
    body: "Un modelo de lenguaje convierte tu CV en un vector semántico de 384 dimensiones. Entiende sinónimos, contexto y equivalencias. No importa tu carrera: si tienes las habilidades, las encuentra.",
    tag: "384 dimensiones",
    detail: [
      "Comprensión semántica real",
      "Funciona para todas las carreras",
      "Multilingüe y contextual",
    ],
    color: "#EEF2FF",
    accent: "#6366F1",
  },
  {
    n: "03",
    title: "Ves tu ranking real",
    body: "Cada práctica activa recibe un score de afinidad entre 0 y 100. Solo ves las que valen la pena. Con un click te postulas y quedas en el top de la lista de la empresa.",
    tag: "Score 0 a 100",
    detail: [
      "Ranking en tiempo real",
      "Solo prácticas relevantes para ti",
      "Postulación con un solo click",
    ],
    color: "#ECFDF5",
    accent: "#10B981",
  },
];

export function LandingHowItWorks() {
  return (
    <section
      id="como-funciona"
      style={{
        background: C.bgAlt,
        padding: "100px 32px",
        borderBottom: `1px solid ${C.border}`,
      }}
    >
      <div style={{ maxWidth: 1000, margin: "0 auto" }}>
        <div
          className="rv practix-howit-header"
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 60,
            alignItems: "end",
            marginBottom: 72,
          }}
        >
          <div>
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
              ¿Cómo funciona?
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
              De tu CV a tu práctica ideal en tres pasos.
            </h2>
          </div>
          <p style={{ fontSize: 16, color: C.muted, lineHeight: 1.7 }}>
            Sin cartas de presentación genéricas. Sin formularios eternos. Solo
            subes tu CV una vez y la IA hace el resto.
          </p>
        </div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          {STEPS.map((s, i) => (
            <div
              key={i}
              className={`rv d${i + 1}`}
              style={{
                display: "grid",
                gridTemplateColumns: "80px 1fr",
                gap: 0,
                position: "relative",
              }}
            >
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  paddingTop: 4,
                }}
              >
                <div
                  style={{
                    width: 52,
                    height: 52,
                    borderRadius: "50%",
                    background: s.color,
                    border: `2px solid ${s.accent}35`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                    zIndex: 1,
                  }}
                >
                  <span
                    style={{
                      fontSize: 14,
                      fontWeight: 900,
                      color: s.accent,
                      letterSpacing: -0.5,
                    }}
                  >
                    {s.n}
                  </span>
                </div>
                {i < STEPS.length - 1 && (
                  <div
                    style={{
                      width: 2,
                      flex: 1,
                      background: `linear-gradient(to bottom,${s.accent}30,${STEPS[i + 1].accent}20)`,
                      marginTop: 8,
                      marginBottom: 8,
                      minHeight: 48,
                    }}
                  />
                )}
              </div>
              <div
                style={{
                  paddingBottom: i < STEPS.length - 1 ? 48 : 0,
                  paddingLeft: 24,
                }}
              >
                <div
                  className="practix-howit-card"
                  style={{
                    background: C.surface,
                    border: `1px solid ${C.border}`,
                    borderRadius: 20,
                    padding: 36,
                    transition: "box-shadow .3s,border-color .3s",
                    ["--step-shadow" as never]: `${s.accent}28`,
                    ["--step-border" as never]: `${s.accent}28`,
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "flex-start",
                      gap: 16,
                      marginBottom: 16,
                      flexWrap: "wrap",
                    }}
                  >
                    <h3
                      style={{
                        fontSize: 22,
                        fontWeight: 700,
                        color: C.text,
                        letterSpacing: -0.6,
                        lineHeight: 1.15,
                      }}
                    >
                      {s.title}
                    </h3>
                    <span
                      style={{
                        background: s.color,
                        border: `1px solid ${s.accent}25`,
                        color: s.accent,
                        fontSize: 11,
                        fontWeight: 700,
                        padding: "5px 13px",
                        borderRadius: 10,
                        letterSpacing: 0.3,
                        whiteSpace: "nowrap",
                        flexShrink: 0,
                      }}
                    >
                      {s.tag}
                    </span>
                  </div>
                  <p
                    style={{
                      fontSize: 15,
                      color: C.muted,
                      lineHeight: 1.72,
                      marginBottom: 24,
                    }}
                  >
                    {s.body}
                  </p>
                  <div style={{ display: "flex", gap: 20, flexWrap: "wrap" }}>
                    {s.detail.map((d) => (
                      <div
                        key={d}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 7,
                        }}
                      >
                        <span
                          style={{
                            width: 18,
                            height: 18,
                            borderRadius: "50%",
                            background: s.color,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            flexShrink: 0,
                          }}
                        >
                          <svg
                            width="9"
                            height="9"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke={s.accent}
                            strokeWidth="3"
                          >
                            <path d="M20 6L9 17l-5-5" />
                          </svg>
                        </span>
                        <span
                          style={{
                            fontSize: 13,
                            color: C.text,
                            fontWeight: 500,
                          }}
                        >
                          {d}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
      <style>{`
        .practix-howit-card:hover { box-shadow: 0 16px 48px -16px var(--step-shadow); border-color: var(--step-border); }
        @media (max-width:768px){
          .practix-howit-header{grid-template-columns:1fr !important; gap:24px !important; align-items:start !important;}
        }
      `}</style>
    </section>
  );
}
