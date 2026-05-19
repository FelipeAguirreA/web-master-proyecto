import Link from "next/link";

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
        : "Sube tu CV para empezar a recibir matches personalizados.";

  const headline =
    highMatches > 0 ? (
      <>
        Hola {firstName} 👋 Tienes{" "}
        <span className="text-accent-hi">
          {highMatches} match{highMatches > 1 ? "es" : ""} sobre 90
        </span>{" "}
        esta semana.
      </>
    ) : (
      <>Hola {firstName} 👋 Bienvenido a tu panel.</>
    );

  const stats = [
    { k: "CV", v: `${cvPct}%`, sub: "Completo" },
    { k: "Postulaciones", v: applicationsCount, sub: "activas" },
    { k: "Entrevistas", v: interviewsCount, sub: "agendadas" },
  ];

  return (
    <section className="bg-dark rounded-[22px] p-5 sm:p-[26px] text-white relative overflow-hidden mb-5">
      {/* Glow decorativo — radial con accent */}
      <div className="absolute -top-20 -right-[60px] w-[340px] h-[340px] pointer-events-none [background:radial-gradient(circle,color-mix(in_srgb,var(--color-accent)_22%,transparent)_0%,transparent_65%)]" />
      {/* Dot pattern */}
      <div className="absolute inset-0 pointer-events-none [background-image:radial-gradient(circle_at_1px_1px,rgba(255,255,255,.04)_1px,transparent_0)] [background-size:22px_22px]" />

      {/* Main grid: content | stats */}
      <div className="relative grid grid-cols-1 md:grid-cols-[1fr_auto] gap-6 items-center">
        {/* Left: headline + CTAs */}
        <div>
          {/* Pill badge */}
          <div className="inline-flex items-center gap-[7px] bg-white/[.07] border border-white/[.12] rounded-[30px] px-3 py-1 text-[11px] font-semibold text-white/75 mb-4">
            <span className="w-1.5 h-1.5 rounded-full bg-[#28C840]" />
            {highMatches > 0
              ? `${highMatches} nuevos matches esta semana`
              : "Listo para nuevos matches"}
          </div>

          <h1 className="text-[clamp(1.6rem,3.4vw,2.2rem)] font-extrabold tracking-[-1.2px] leading-[1.1] mb-2 text-balance">
            {headline}
          </h1>

          <p className="text-[14px] text-white/60 max-w-[480px] leading-[1.6] mb-[18px]">
            {subtitle}
          </p>

          <div className="flex gap-2.5 flex-wrap">
            <Link
              href="/practicas"
              className="inline-flex items-center gap-[7px] bg-gradient-to-br from-accent to-accent-hi text-white px-[18px] py-2.5 rounded-[11px] font-bold text-[13px] no-underline shadow-[0_6px_20px_color-mix(in_srgb,var(--color-accent)_33%,transparent)]"
            >
              Ver matches del día
            </Link>
            <Link
              href="/perfil"
              className="inline-flex items-center gap-[7px] bg-white/[.08] border border-white/[.14] text-white px-[18px] py-2.5 rounded-[11px] font-semibold text-[13px] no-underline"
            >
              Mejorar mi CV
            </Link>
          </div>
        </div>

        {/* Right: stats — oculto en mobile */}
        <div className="hidden md:flex flex-col gap-2.5 min-w-[180px]">
          {stats.map((s) => (
            <div
              key={s.k}
              className="flex items-center justify-between px-3.5 py-2.5 bg-white/5 border border-white/[.08] rounded-[12px]"
            >
              <div>
                <div className="text-[10px] font-bold tracking-[0.6px] text-white/50 uppercase">
                  {s.k}
                </div>
                <div className="text-[11px] text-white/45">{s.sub}</div>
              </div>
              <div className="text-[22px] font-black tracking-[-0.8px]">
                {s.v}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
