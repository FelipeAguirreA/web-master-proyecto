import Link from "next/link";

const STUDENT_FEATS = [
  "Score de afinidad antes de postularte",
  "Recomendaciones ordenadas por match real",
  "CV analizado una vez, sirve para todo",
  "Gratis para siempre",
];

const COMPANY_FEATS = [
  "Candidatos pre-rankeados por IA",
  "Pipeline visual estilo Kanban",
  "Scoring configurable por puesto",
  "Chat directo con postulantes",
];

export function LandingDualAudience() {
  return (
    <section
      id="para-quien"
      className="bg-bg py-[100px] px-4 sm:px-6 md:px-8 border-b border-border"
    >
      <div className="max-w-[1100px] mx-auto">
        <div className="rv text-center mb-14">
          <span className="inline-flex items-center gap-[7px] bg-accent-bg border border-accent-bdr rounded-[40px] px-[14px] py-1 text-[10.5px] font-bold tracking-[1px] text-accent mb-[18px] uppercase">
            ¿Para quién?
          </span>
          <h2 className="text-[clamp(1.8rem,3.8vw,3rem)] font-extrabold tracking-[-1.5px] text-text leading-[1.1]">
            Una plataforma.
            <br />
            Dos audiencias.
          </h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Estudiantes */}
          <div className="rv-l practix-dual-card-light bg-surface border border-border rounded-[24px] p-8 sm:p-11 relative overflow-hidden transition-[transform,box-shadow] duration-300">
            <div className="absolute top-0 right-0 w-[60%] h-full bg-[linear-gradient(225deg,var(--color-accent-bg)_0%,transparent_60%)] pointer-events-none" />
            <div className="relative">
              <div className="inline-flex items-center gap-2 bg-accent-bg border border-accent-bdr rounded-[10px] px-[14px] py-[6px] mb-6">
                <span className="text-base">🎓</span>
                <span className="text-xs font-bold text-accent tracking-[0.5px]">
                  PARA ESTUDIANTES
                </span>
              </div>
              <h3 className="text-[clamp(1.3rem,2.5vw,1.9rem)] font-extrabold text-text tracking-[-1px] leading-[1.15] mb-4">
                Encuentra prácticas donde ya eres competitivo.
              </h3>
              <p className="text-[14.5px] text-muted leading-[1.7] mb-7">
                No más postulaciones a ciegas. Ves tu score antes de postularte.
                Sabes en qué prácticas tienes chances reales y cuáles no valen
                tu tiempo.
              </p>
              <ul className="flex flex-col gap-3 mb-8 list-none p-0">
                {STUDENT_FEATS.map((f, i) => (
                  <li
                    key={i}
                    className="flex items-center gap-[10px] text-sm text-text font-medium"
                  >
                    <span className="w-5 h-5 rounded-full bg-green-bg flex items-center justify-center shrink-0">
                      <svg
                        width="10"
                        height="10"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="var(--color-green)"
                        strokeWidth="3"
                      >
                        <path d="M20 6L9 17l-5-5" />
                      </svg>
                    </span>
                    {f}
                  </li>
                ))}
              </ul>
              <Link
                href="/login?role=student"
                className="practix-dual-cta-warm inline-flex items-center gap-2 bg-[linear-gradient(135deg,var(--color-accent),var(--color-accent-hi))] text-white px-6 py-[13px] rounded-xl font-bold text-sm shadow-[0_6px_20px_color-mix(in_sRGB,var(--color-accent)_33%,transparent)] transition-opacity duration-200"
              >
                Empezar gratis
              </Link>
            </div>
          </div>

          {/* Empresas */}
          <div className="rv-r practix-dual-card-dark bg-dark rounded-[24px] p-8 sm:p-11 relative overflow-hidden text-white transition-[transform,box-shadow] duration-300">
            {/* orb — dynamic size/position, keep inline */}
            <div className="absolute -top-10 -right-10 w-[220px] h-[220px] bg-[color-mix(in_sRGB,var(--color-accent)_9%,transparent)] rounded-full blur-[60px]" />
            <div className="relative">
              <div className="inline-flex items-center gap-2 bg-white/[.08] border border-white/[.12] rounded-[10px] px-[14px] py-[6px] mb-6">
                <span className="text-base">🏢</span>
                <span className="text-xs font-bold text-white/70 tracking-[0.5px]">
                  PARA EMPRESAS
                </span>
              </div>
              <h3 className="text-[clamp(1.3rem,2.5vw,1.9rem)] font-extrabold text-white tracking-[-1px] leading-[1.15] mb-4">
                Solo revisas candidatos que realmente encajan.
              </h3>
              <p className="text-[14.5px] text-white/60 leading-[1.7] mb-7">
                El ATS pre-rankea los postulantes por afinidad semántica.
                Dedicas el tiempo de selección a los mejores, no a revisar 80
                CVs irrelevantes.
              </p>
              <ul className="flex flex-col gap-3 mb-8 list-none p-0">
                {COMPANY_FEATS.map((f, i) => (
                  <li
                    key={i}
                    className="flex items-center gap-[10px] text-sm text-white/85 font-medium"
                  >
                    <span className="w-5 h-5 rounded-full bg-white/[.08] border border-white/[.15] flex items-center justify-center shrink-0">
                      <svg
                        width="10"
                        height="10"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="var(--color-accent-hi)"
                        strokeWidth="3"
                      >
                        <path d="M20 6L9 17l-5-5" />
                      </svg>
                    </span>
                    {f}
                  </li>
                ))}
              </ul>
              <Link
                href="/login?role=company"
                className="practix-dual-cta-dark inline-flex items-center gap-2 bg-white/10 backdrop-blur-[12px] border border-white/20 text-white px-6 py-[13px] rounded-xl font-bold text-sm transition-[background] duration-200"
              >
                Publicar práctica
              </Link>
            </div>
          </div>
        </div>
      </div>
      <style>{`
        .practix-dual-card-light:hover { transform: translateY(-4px); box-shadow: 0 24px 64px -20px color-mix(in sRGB, var(--color-accent) 13%, transparent); }
        .practix-dual-card-dark:hover  { transform: translateY(-4px); box-shadow: 0 24px 64px -20px color-mix(in sRGB, var(--color-accent) 27%, transparent); }
        .practix-dual-cta-warm:hover { opacity: .9; }
        .practix-dual-cta-dark:hover { background: rgba(255,255,255,.17) !important; }
      `}</style>
    </section>
  );
}
