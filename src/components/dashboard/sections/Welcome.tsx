import Link from "next/link";
import { D } from "../tokens";

type WelcomeProps = {
  firstName: string;
  highMatches: number;
  topMatchCompany?: string | null;
  topMatchScore?: number | null;
  daysLeft?: number | null;
  cvPct: number;
  applicationsCount: number;
  interviewsCount: number;
};

export function Welcome({
  firstName,
  highMatches,
  topMatchCompany,
  topMatchScore,
  daysLeft,
  cvPct,
  applicationsCount,
  interviewsCount,
}: WelcomeProps) {
  const subtitle =
    topMatchCompany && topMatchScore
      ? `${topMatchCompany} te subió a ${topMatchScore}${daysLeft ? `. Recomendamos postular hoy: cierra en ${daysLeft} días.` : "."}`
      : highMatches > 0
        ? "Tu CV está activo y la IA encontró matches nuevos para ti."
        : "Subí tu CV para empezar a recibir matches personalizados.";

  const headline =
    highMatches > 0 ? (
      <>
        Hola {firstName} 👋 Tienes{" "}
        <span style={{ color: D.accentHi }}>
          {highMatches} match{highMatches > 1 ? "es" : ""} sobre 90
        </span>{" "}
        esta semana.
      </>
    ) : (
      <>Hola {firstName} 👋 Bienvenido a tu panel.</>
    );

  return (
    <section
      style={{
        background: D.dark,
        borderRadius: 22,
        padding: 26,
        color: "#fff",
        position: "relative",
        overflow: "hidden",
        marginBottom: 20,
      }}
    >
      <div
        style={{
          position: "absolute",
          top: -80,
          right: -60,
          width: 340,
          height: 340,
          background: `radial-gradient(circle, ${D.accent}38 0%, transparent 65%)`,
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
        className="practix-welcome-grid"
        style={{
          position: "relative",
          display: "grid",
          gridTemplateColumns: "1fr auto",
          gap: 24,
          alignItems: "center",
        }}
      >
        <div>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 7,
              background: "rgba(255,255,255,.07)",
              border: "1px solid rgba(255,255,255,.12)",
              borderRadius: 30,
              padding: "4px 12px",
              fontSize: 11,
              fontWeight: 600,
              color: "rgba(255,255,255,.75)",
              marginBottom: 16,
            }}
          >
            <span
              style={{
                width: 6,
                height: 6,
                borderRadius: "50%",
                background: "#28C840",
              }}
            />{" "}
            {highMatches > 0
              ? `${highMatches} nuevos matches esta semana`
              : "Listo para nuevos matches"}
          </div>
          <h1
            style={{
              fontSize: "clamp(1.6rem,3.4vw,2.2rem)",
              fontWeight: 800,
              letterSpacing: -1.2,
              lineHeight: 1.1,
              marginBottom: 8,
              textWrap: "balance",
            }}
          >
            {headline}
          </h1>
          <p
            style={{
              fontSize: 14,
              color: "rgba(255,255,255,.6)",
              maxWidth: 480,
              lineHeight: 1.6,
              marginBottom: 18,
            }}
          >
            {subtitle}
          </p>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <Link
              href="/practicas"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 7,
                background: `linear-gradient(135deg,${D.accent},${D.accentHi})`,
                color: "#fff",
                padding: "10px 18px",
                borderRadius: 11,
                fontWeight: 700,
                fontSize: 13,
                boxShadow: `0 6px 20px ${D.accent}55`,
                textDecoration: "none",
              }}
            >
              Ver matches del día →
            </Link>
            <Link
              href="/perfil"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 7,
                background: "rgba(255,255,255,.08)",
                border: "1px solid rgba(255,255,255,.14)",
                color: "#fff",
                padding: "10px 18px",
                borderRadius: 11,
                fontWeight: 600,
                fontSize: 13,
                textDecoration: "none",
              }}
            >
              Mejorar mi CV
            </Link>
          </div>
        </div>
        <div
          className="practix-welcome-stats"
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 10,
            minWidth: 180,
          }}
        >
          {[
            { k: "CV", v: `${cvPct}%`, sub: "Completo" },
            { k: "Postulaciones", v: applicationsCount, sub: "activas" },
            { k: "Entrevistas", v: interviewsCount, sub: "agendadas" },
          ].map((s) => (
            <div
              key={s.k}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "10px 14px",
                background: "rgba(255,255,255,.05)",
                border: "1px solid rgba(255,255,255,.08)",
                borderRadius: 12,
              }}
            >
              <div>
                <div
                  style={{
                    fontSize: 10,
                    fontWeight: 700,
                    letterSpacing: 0.6,
                    color: "rgba(255,255,255,.5)",
                    textTransform: "uppercase",
                  }}
                >
                  {s.k}
                </div>
                <div
                  style={{
                    fontSize: 11,
                    color: "rgba(255,255,255,.45)",
                  }}
                >
                  {s.sub}
                </div>
              </div>
              <div
                style={{
                  fontSize: 22,
                  fontWeight: 900,
                  letterSpacing: -0.8,
                  color: "#fff",
                }}
              >
                {s.v}
              </div>
            </div>
          ))}
        </div>
      </div>
      <style>{`
        @media (max-width:900px) {
          .practix-welcome-grid { grid-template-columns: 1fr !important; }
          .practix-welcome-stats { display: none !important; }
        }
      `}</style>
    </section>
  );
}
