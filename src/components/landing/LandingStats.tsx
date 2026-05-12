import { Counter } from "./Counter";
import { C } from "./tokens";

const ITEMS = [
  { n: 12300, suf: "+", label: "Estudiantes activos", note: "en Chile" },
  {
    n: 240,
    suf: "+",
    label: "Empresas publicando",
    note: "prácticas activas hoy",
  },
  {
    n: 4.9,
    suf: "★",
    label: "Rating promedio",
    note: "de 1.230 reseñas",
    dec: 1,
  },
  {
    n: 2.8,
    suf: "s",
    label: "Análisis de CV",
    note: "parsing + scoring + ranking",
    dec: 1,
  },
];

export function LandingStats() {
  return (
    <section
      style={{
        background: C.bg,
        padding: "72px 32px",
        borderBottom: `1px solid ${C.border}`,
      }}
    >
      <div
        className="practix-stats-grid"
        style={{
          maxWidth: 1000,
          margin: "0 auto",
          display: "grid",
          gridTemplateColumns: "repeat(4,1fr)",
          gap: 0,
        }}
      >
        {ITEMS.map((it, i) => (
          <div
            key={i}
            className={`rv d${i + 1}`}
            style={{
              textAlign: "center",
              padding: "28px 20px",
              borderRight: i < 3 ? `1px solid ${C.border}` : "none",
            }}
          >
            <div
              style={{
                fontSize: "clamp(2.2rem,4.5vw,3.4rem)",
                fontWeight: 900,
                letterSpacing: -2,
                color: C.accent,
                lineHeight: 1,
              }}
            >
              <Counter to={it.n} suf={it.suf} dec={it.dec || 0} />
            </div>
            <div
              style={{
                fontSize: 14.5,
                fontWeight: 700,
                color: C.text,
                marginTop: 9,
                marginBottom: 4,
              }}
            >
              {it.label}
            </div>
            <div style={{ fontSize: 12, color: C.subtle }}>{it.note}</div>
          </div>
        ))}
      </div>
      <style>{`
        @media (max-width:768px){
          .practix-stats-grid{grid-template-columns:1fr 1fr !important}
          .practix-stats-grid > *:nth-child(2){border-right:none !important}
          .practix-stats-grid > *:nth-child(odd){border-right:1px solid ${C.border} !important}
        }
      `}</style>
    </section>
  );
}
