import Link from "next/link";
import { C } from "./tokens";

export function LandingCTA() {
  return (
    <section style={{ background: C.bgAlt, padding: "80px 32px 96px" }}>
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>
        <div
          className="rv-s"
          style={{
            background: C.bgDark,
            borderRadius: 28,
            padding: "clamp(44px,6vw,88px)",
            textAlign: "center",
            position: "relative",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              position: "absolute",
              top: -80,
              left: "50%",
              transform: "translateX(-50%)",
              width: 800,
              height: 400,
              background: `radial-gradient(ellipse,${C.accent}38 0%,transparent 58%)`,
              pointerEvents: "none",
            }}
          />
          <div
            style={{
              position: "absolute",
              inset: 0,
              backgroundImage:
                "radial-gradient(circle at 1px 1px,rgba(255,255,255,.035) 1px,transparent 0)",
              backgroundSize: "24px 24px",
              pointerEvents: "none",
            }}
          />
          <div
            style={{
              position: "absolute",
              bottom: -40,
              right: -40,
              width: 240,
              height: 240,
              borderRadius: "50%",
              background: `${C.accent}18`,
              filter: "blur(60px)",
              animation: "orbFloat2 16s ease-in-out infinite",
              pointerEvents: "none",
            }}
          />
          <div style={{ position: "relative" }}>
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                background: "rgba(255,255,255,.07)",
                border: "1px solid rgba(255,255,255,.12)",
                borderRadius: 40,
                padding: "5px 16px",
                fontSize: 11,
                fontWeight: 600,
                color: "rgba(255,255,255,.7)",
                marginBottom: 28,
                letterSpacing: 0.8,
              }}
            >
              <span
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: "50%",
                  background: C.accent,
                  animation: "pulseDot 1.5s ease infinite",
                }}
              />
              100% GRATUITO PARA ESTUDIANTES
            </span>
            <h2
              style={{
                fontSize: "clamp(2rem,5.5vw,4.2rem)",
                fontWeight: 900,
                letterSpacing: -3,
                color: "#fff",
                lineHeight: 1.02,
                marginBottom: 20,
                textWrap: "balance",
              }}
            >
              La próxima práctica que cambia
              <br />
              tu CV está a{" "}
              <span
                style={{
                  background: `linear-gradient(135deg,#FFD4A8,${C.accent})`,
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                }}
              >
                un click
              </span>
              .
            </h2>
            <p
              style={{
                fontSize: 17,
                color: "rgba(255,255,255,.52)",
                maxWidth: 480,
                margin: "0 auto 40px",
                lineHeight: 1.65,
              }}
            >
              Sin formularios largos. Sin trámites burocráticos. Entras con
              Google, subes tu CV, ves las prácticas que te corresponden.
            </p>
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                justifyContent: "center",
                gap: 12,
                marginBottom: 28,
              }}
            >
              <Link
                href="/login?role=student"
                className="practix-cta-final-warm"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                  background: `linear-gradient(135deg,${C.accent},${C.accentHi})`,
                  color: "#fff",
                  padding: "16px 32px",
                  borderRadius: 14,
                  fontWeight: 700,
                  fontSize: 15.5,
                  boxShadow: `0 8px 30px ${C.accent}70`,
                  transition: "transform .25s,box-shadow .25s",
                }}
              >
                Soy estudiante
              </Link>
              <Link
                href="/login?role=company"
                className="practix-cta-final-glass"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                  background: "rgba(255,255,255,.1)",
                  backdropFilter: "blur(12px)",
                  border: "1px solid rgba(255,255,255,.2)",
                  color: "#fff",
                  padding: "16px 32px",
                  borderRadius: 14,
                  fontWeight: 600,
                  fontSize: 15.5,
                  transition: "background .2s",
                }}
              >
                Soy empresa
              </Link>
            </div>
            <p
              style={{
                fontSize: 12,
                color: "rgba(255,255,255,.3)",
              }}
            >
              12.300+ estudiantes · 240+ prácticas activas · 4.9★
            </p>
          </div>
        </div>
      </div>
      <style>{`
        .practix-cta-final-warm:hover { transform: translateY(-3px); box-shadow: 0 16px 40px ${C.accent}80; }
        .practix-cta-final-glass:hover { background: rgba(255,255,255,.17) !important; }
      `}</style>
    </section>
  );
}
