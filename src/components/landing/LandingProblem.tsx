import { C } from "./tokens";

const PAINS = [
  {
    icon: "📄",
    title: "Postulaciones a ciegas",
    body: "Mandas el CV a decenas de empresas sin saber si tu perfil tiene alguna chance real. La mayoría nunca te responde.",
  },
  {
    icon: "🔍",
    title: "Filtros que no entienden tu perfil",
    body: "Los sistemas buscan coincidencias exactas. Si tu experiencia está descrita de otra forma, aunque sea equivalente, quedas fuera.",
  },
  {
    icon: "🕐",
    title: "Semanas sin noticias",
    body: "Procesos de selección eternos. Sin feedback. Sin saber en qué etapa estás ni qué pasa con tu postulación.",
  },
];

export function LandingProblem() {
  return (
    <section
      style={{
        background: C.bgAlt,
        padding: "100px 32px",
        borderBottom: `1px solid ${C.border}`,
      }}
    >
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>
        <div className="rv" style={{ maxWidth: 620, marginBottom: 56 }}>
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
            El problema
          </span>
          <h2
            style={{
              fontSize: "clamp(1.8rem,3.8vw,3rem)",
              fontWeight: 800,
              letterSpacing: -1.5,
              color: C.text,
              lineHeight: 1.1,
              marginBottom: 14,
              textWrap: "balance",
            }}
          >
            El proceso de prácticas
            <br />
            está roto.
          </h2>
          <p style={{ fontSize: 17, color: C.muted, lineHeight: 1.65 }}>
            Dedicas horas a postularte a prácticas que nunca responden. No
            porque no sirvas, sino porque el sistema no sabe leer tu CV.
          </p>
        </div>
        <div
          className="practix-problem-grid"
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3,1fr)",
            gap: 16,
          }}
        >
          {PAINS.map((p, i) => (
            <div
              key={i}
              className={`practix-problem-card rv d${i + 1}`}
              style={{
                background: C.surface,
                border: `1px solid ${C.border}`,
                borderRadius: 20,
                padding: "32px 28px",
                overflow: "hidden",
                position: "relative",
                transition: "transform .3s,box-shadow .3s",
              }}
            >
              <div
                style={{
                  position: "absolute",
                  top: 0,
                  right: 0,
                  width: 130,
                  height: 130,
                  background: `radial-gradient(circle,${C.accentBg} 0%,transparent 70%)`,
                  pointerEvents: "none",
                }}
              />
              <div style={{ fontSize: 32, marginBottom: 20 }}>{p.icon}</div>
              <h3
                style={{
                  fontSize: 17,
                  fontWeight: 700,
                  color: C.text,
                  marginBottom: 10,
                  letterSpacing: -0.4,
                }}
              >
                {p.title}
              </h3>
              <p style={{ fontSize: 14, color: C.muted, lineHeight: 1.68 }}>
                {p.body}
              </p>
            </div>
          ))}
        </div>
        <div
          className="rv"
          style={{
            marginTop: 52,
            padding: "30px 34px 30px 30px",
            background: `linear-gradient(135deg,${C.accentBg},${C.bg})`,
            border: `1px solid ${C.accentBdr}`,
            borderRadius: 20,
            display: "flex",
            alignItems: "center",
            gap: 22,
            flexWrap: "wrap",
            position: "relative",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              flexShrink: 0,
              width: 3,
              alignSelf: "stretch",
              background: C.accent,
              borderRadius: 2,
              minHeight: 44,
            }}
          />
          <div>
            <p
              style={{
                fontSize: 17,
                fontWeight: 700,
                color: C.text,
                marginBottom: 4,
              }}
            >
              PractiX resuelve los tres de un solo paso.
            </p>
            <p
              style={{
                fontSize: 14.5,
                color: C.muted,
                lineHeight: 1.65,
              }}
            >
              Sube tu CV una vez. La IA entiende tu perfil en profundidad y solo
              te muestra prácticas donde tu match ya es alto, antes de
              postularte.
            </p>
          </div>
        </div>
      </div>
      <style>{`
        .practix-problem-card:hover { transform: translateY(-4px); box-shadow: 0 20px 48px -16px ${C.accent}22; }
        @media (max-width:768px){ .practix-problem-grid{grid-template-columns:1fr !important} }
      `}</style>
    </section>
  );
}
