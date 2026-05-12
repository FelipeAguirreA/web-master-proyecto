import Link from "next/link";
import { C } from "./tokens";

const COLS = [
  {
    title: "Producto",
    links: [
      { label: "Cómo funciona", href: "#como-funciona" },
      { label: "Para estudiantes", href: "/login?role=student" },
      { label: "Para empresas", href: "/login?role=company" },
      { label: "ATS", href: "#producto" },
    ],
  },
  {
    title: "Recursos",
    links: [
      { label: "Prácticas", href: "/practicas" },
      { label: "FAQ", href: "#faq" },
      { label: "Universidades", href: "#" },
      { label: "Ayuda", href: "mailto:soporte@practix.cl" },
    ],
  },
  {
    title: "Legal",
    links: [
      { label: "Privacidad", href: "/privacidad" },
      { label: "Términos", href: "/terminos" },
      { label: "Cookies", href: "/privacidad#cookies" },
    ],
  },
];

export function LandingFooter() {
  return (
    <footer
      style={{
        background: C.bgAlt,
        borderTop: `1px solid ${C.border}`,
        padding: "56px 32px 32px",
      }}
    >
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>
        <div
          className="practix-footer-grid"
          style={{
            display: "grid",
            gridTemplateColumns: "1.8fr 1fr 1fr 1fr",
            gap: 40,
            marginBottom: 44,
          }}
        >
          <div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 9,
                marginBottom: 16,
              }}
            >
              <span
                style={{
                  width: 30,
                  height: 30,
                  borderRadius: 8,
                  background: `linear-gradient(135deg,${C.accent},${C.accentHi})`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontWeight: 800,
                  fontSize: 14,
                  color: "#fff",
                }}
              >
                P
              </span>
              <span
                style={{
                  fontWeight: 700,
                  fontSize: 16,
                  color: C.text,
                  letterSpacing: -0.4,
                }}
              >
                PractiX
              </span>
            </div>
            <p
              style={{
                fontSize: 13.5,
                color: C.muted,
                lineHeight: 1.65,
                maxWidth: 280,
              }}
            >
              Matching semántico para prácticas profesionales. Sin filtros
              arbitrarios. Solo afinidad real entre tu perfil y la práctica.
            </p>
          </div>
          {COLS.map((col) => (
            <div key={col.title}>
              <div
                style={{
                  fontSize: 10.5,
                  fontWeight: 700,
                  letterSpacing: 1,
                  textTransform: "uppercase",
                  color: C.subtle,
                  marginBottom: 16,
                }}
              >
                {col.title}
              </div>
              {col.links.map((l) => (
                <div key={l.label} style={{ marginBottom: 11 }}>
                  <Link
                    href={l.href}
                    className="practix-footer-link"
                    style={{
                      fontSize: 13.5,
                      color: C.muted,
                      transition: "color .2s",
                    }}
                  >
                    {l.label}
                  </Link>
                </div>
              ))}
            </div>
          ))}
        </div>
        <div
          style={{
            borderTop: `1px solid ${C.border}`,
            paddingTop: 24,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: 10,
          }}
        >
          <p style={{ fontSize: 12.5, color: C.subtle }}>
            © {new Date().getFullYear()} PractiX · Todos los derechos reservados
          </p>
          <p style={{ fontSize: 12.5, color: C.subtle }}>
            Hecho con <span style={{ color: C.accent }}>♥</span> en Chile
          </p>
        </div>
      </div>
      <style>{`
        .practix-footer-link:hover { color: ${C.accent} !important; }
        @media (max-width:768px){
          .practix-footer-grid{grid-template-columns:1fr 1fr !important}
          .practix-footer-grid > *:first-child{grid-column:span 2}
        }
      `}</style>
    </footer>
  );
}
