import { C } from "./tokens";

const TMS = [
  {
    q: "En toda mi carrera me postulé a 4 prácticas y quedé en silencio. En PractiX me postulé a 3 y me llamaron de las 3. El score no miente: si dice 96%, es 96%.",
    name: "Valentina Morales",
    role: "Ing. Comercial · PUC",
    co: "Hoy en Falabella",
    score: 96,
    ini: "VM",
    c1: "#FFC5A3",
    c2: C.accent,
  },
  {
    q: "Como responsable de selección, el ATS nos cambió el proceso completamente. Antes revisábamos 80 CVs a mano. Ahora dedicamos el tiempo a los candidatos que realmente encajan.",
    name: "Felipe Soto",
    role: "RRHH · NotCo",
    co: "Empresa verificada ✓",
    score: null as number | null,
    ini: "FS",
    c1: "#C5E8C7",
    c2: "#28C840",
  },
  {
    q: "Nunca pensé que una empresa como Fintual buscaría un perfil como el mío. PractiX me mostró que tenía más habilidades de las que creía. Un score de 89% no lo discutes.",
    name: "Catalina Vega",
    role: "Lic. en Administración · U. de Chile",
    co: "Hoy en Fintual",
    score: 89,
    ini: "CV",
    c1: "#E0C5FF",
    c2: "#8247E5",
  },
];

export function LandingTestimonials() {
  return (
    <section
      style={{
        background: C.bgAlt,
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
            Testimonios
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
            Lo que dicen quienes
            <br />
            ya cambiaron su carrera.
          </h2>
        </div>
        <div
          className="practix-tms-grid"
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3,1fr)",
            gap: 16,
          }}
        >
          {TMS.map((tm, i) => (
            <div
              key={i}
              className={`rv d${i + 1} practix-tm-card`}
              style={{
                background: C.surface,
                border: `1px solid ${C.border}`,
                borderRadius: 20,
                padding: "32px 28px",
                position: "relative",
                overflow: "hidden",
                display: "flex",
                flexDirection: "column",
                transition: "transform .3s,box-shadow .3s",
              }}
            >
              <div
                style={{
                  position: "absolute",
                  top: 0,
                  right: 0,
                  width: 140,
                  height: 140,
                  background: `radial-gradient(circle,${tm.c1}18 0%,transparent 70%)`,
                  pointerEvents: "none",
                }}
              />
              <div style={{ display: "flex", gap: 2, marginBottom: 18 }}>
                {[...Array(5)].map((_, j) => (
                  <svg
                    key={j}
                    width="14"
                    height="14"
                    viewBox="0 0 20 20"
                    fill={C.accentHi}
                  >
                    <path d="M10 1l2.5 6.5H19l-5 4 2 6.5L10 14l-6 4 2-6.5-5-4h6.5z" />
                  </svg>
                ))}
              </div>
              <blockquote
                style={{
                  fontSize: 14.5,
                  lineHeight: 1.7,
                  color: C.text,
                  fontWeight: 500,
                  flex: 1,
                  marginBottom: 20,
                }}
              >
                &ldquo;{tm.q}&rdquo;
              </blockquote>
              {tm.score && (
                <div
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    background: C.accentBg,
                    border: `1px solid ${C.accentBdr}`,
                    borderRadius: 8,
                    padding: "5px 12px",
                    marginBottom: 18,
                    alignSelf: "flex-start",
                  }}
                >
                  <span
                    style={{
                      fontSize: 13,
                      fontWeight: 900,
                      color: C.accent,
                    }}
                  >
                    {tm.score}%
                  </span>
                  <span style={{ fontSize: 11.5, color: C.muted }}>
                    de match conseguido
                  </span>
                </div>
              )}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                }}
              >
                <div
                  style={{
                    width: 42,
                    height: 42,
                    borderRadius: "50%",
                    background: `linear-gradient(135deg,${tm.c1},${tm.c2})`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "#fff",
                    fontWeight: 800,
                    fontSize: 13,
                    flexShrink: 0,
                  }}
                >
                  {tm.ini}
                </div>
                <div>
                  <div
                    style={{
                      fontSize: 13.5,
                      fontWeight: 700,
                      color: C.text,
                    }}
                  >
                    {tm.name}
                  </div>
                  <div style={{ fontSize: 12, color: C.muted }}>{tm.role}</div>
                  <div
                    style={{
                      fontSize: 11.5,
                      color: C.accent,
                      fontWeight: 600,
                      marginTop: 1,
                    }}
                  >
                    {tm.co}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
      <style>{`
        .practix-tm-card:hover { transform: translateY(-5px); box-shadow: 0 24px 60px -20px ${C.accent}28; }
        @media (max-width:768px){ .practix-tms-grid{grid-template-columns:1fr !important} }
      `}</style>
    </section>
  );
}
