import { C } from "./tokens";

const COMPANIES = [
  { name: "Falabella", ini: "F", c: "#007A33", tc: "#fff" },
  { name: "NotCo", ini: "N", c: "#1A1A1A", tc: "#fff" },
  { name: "Fintual", ini: "FT", c: "#4B1AF5", tc: "#fff" },
  { name: "Cornershop", ini: "CS", c: "#FF5A00", tc: "#fff" },
  { name: "Bci", ini: "B", c: "#0033A0", tc: "#fff" },
  { name: "Entel", ini: "E", c: "#00A8E0", tc: "#fff" },
  { name: "Buk", ini: "BK", c: "#FF3366", tc: "#fff" },
  { name: "Betterfly", ini: "BF", c: "#5B21B6", tc: "#fff" },
  { name: "Mercado Libre", ini: "ML", c: "#FFE600", tc: "#111" },
  { name: "Ripley", ini: "R", c: "#D4003E", tc: "#fff" },
  { name: "WOM", ini: "W", c: "#B400FF", tc: "#fff" },
  { name: "Cencosud", ini: "CC", c: "#E30613", tc: "#fff" },
];

export function LandingLogoWall() {
  const all = [...COMPANIES, ...COMPANIES];
  return (
    <div
      style={{
        background: C.bgAlt,
        borderBottom: `1px solid ${C.border}`,
        padding: "32px 0",
        overflow: "hidden",
      }}
    >
      <p
        style={{
          textAlign: "center",
          fontSize: 10.5,
          fontWeight: 700,
          letterSpacing: 2.2,
          textTransform: "uppercase",
          color: C.subtle,
          marginBottom: 24,
        }}
      >
        Empresas con prácticas activas
      </p>
      <div style={{ position: "relative" }}>
        <div
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            bottom: 0,
            width: 120,
            background: `linear-gradient(to right,${C.bgAlt},transparent)`,
            zIndex: 1,
            pointerEvents: "none",
          }}
        />
        <div
          style={{
            position: "absolute",
            right: 0,
            top: 0,
            bottom: 0,
            width: 120,
            background: `linear-gradient(to left,${C.bgAlt},transparent)`,
            zIndex: 1,
            pointerEvents: "none",
          }}
        />
        <div
          style={{
            display: "flex",
            gap: 10,
            animation: "marquee 40s linear infinite",
            width: "max-content",
          }}
        >
          {all.map((co, i) => (
            <div
              key={i}
              className="practix-logo-chip"
              style={{
                display: "flex",
                alignItems: "center",
                gap: 9,
                background: C.surface,
                border: `1px solid ${C.border}`,
                borderRadius: 12,
                padding: "9px 17px",
                flexShrink: 0,
                transition: "border-color .2s,box-shadow .2s",
              }}
            >
              <span
                style={{
                  width: 24,
                  height: 24,
                  borderRadius: 6,
                  background: co.c,
                  color: co.tc,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 9,
                  fontWeight: 800,
                  flexShrink: 0,
                }}
              >
                {co.ini}
              </span>
              <span
                style={{
                  fontSize: 13,
                  fontWeight: 600,
                  color: C.text,
                  whiteSpace: "nowrap",
                }}
              >
                {co.name}
              </span>
            </div>
          ))}
        </div>
      </div>
      <style>{`
        .practix-logo-chip:hover { border-color: rgba(0,0,0,.14) !important; box-shadow: 0 4px 16px rgba(0,0,0,.07); }
      `}</style>
    </div>
  );
}
