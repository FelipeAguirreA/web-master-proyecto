import type { CSSProperties } from "react";

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
    // step 1: warm orange brand — hex literal porque el código concatena
    // alpha hex (`${accent}30`, `${accent}28`) que no funciona con CSS vars.
    // #FF6A3D = valor exacto de --color-accent (paleta D warm).
    color: "#FFF3EC",
    accent: "#FF6A3D",
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
    // step 2: blue/indigo brand color — not in @theme
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
    // step 3: emerald brand color — not in @theme
    color: "#ECFDF5",
    accent: "#10B981",
  },
];

export function LandingHowItWorks() {
  return (
    <section
      id="como-funciona"
      className="bg-surface py-[100px] px-4 sm:px-6 md:px-8 border-b border-border"
    >
      <div className="max-w-[1000px] mx-auto">
        {/* header: 2 cols on md+, stack on mobile */}
        <div className="rv grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-[60px] items-end mb-[72px]">
          <div>
            <span className="inline-flex items-center gap-[7px] bg-accent-bg border border-accent-bdr rounded-[40px] px-[14px] py-1 text-[10.5px] font-bold tracking-[1px] text-accent mb-[18px] uppercase">
              ¿Cómo funciona?
            </span>
            <h2 className="text-[clamp(1.8rem,3.8vw,3rem)] font-extrabold tracking-[-1.5px] text-text leading-[1.1]">
              De tu CV a tu práctica ideal en tres pasos.
            </h2>
          </div>
          <p className="text-base text-muted leading-[1.7]">
            Sin cartas de presentación genéricas. Sin formularios eternos. Solo
            subes tu CV una vez y la IA hace el resto.
          </p>
        </div>
        <div className="flex flex-col">
          {STEPS.map((s, i) => (
            <div
              key={i}
              className={`rv d${i + 1} grid grid-cols-[80px_1fr] relative`}
            >
              {/* step indicator column */}
              <div className="flex flex-col items-center pt-1">
                <div
                  className="w-[52px] h-[52px] rounded-full flex items-center justify-center shrink-0 z-[1]"
                  style={
                    {
                      background: s.color,
                      border: `2px solid ${s.accent}35`,
                    } as CSSProperties
                  }
                >
                  <span
                    className="text-sm font-black tracking-[-0.5px]"
                    style={{ color: s.accent } as CSSProperties}
                  >
                    {s.n}
                  </span>
                </div>
                {i < STEPS.length - 1 && (
                  <div
                    className="w-[2px] flex-1 mt-2 mb-2 min-h-[48px]"
                    style={
                      {
                        background: `linear-gradient(to bottom,${s.accent}30,${STEPS[i + 1].accent}20)`,
                      } as CSSProperties
                    }
                  />
                )}
              </div>
              {/* content column */}
              <div className={`pl-6${i < STEPS.length - 1 ? " pb-12" : ""}`}>
                <div
                  className="practix-howit-card bg-surface border border-border rounded-[20px] p-6 sm:p-9 transition-[box-shadow,border-color] duration-300"
                  style={{
                    ["--step-shadow" as never]: `${s.accent}28`,
                    ["--step-border" as never]: `${s.accent}28`,
                  }}
                >
                  <div className="flex justify-between items-start gap-4 mb-4 flex-wrap">
                    <h3 className="text-[22px] font-bold text-text tracking-[-0.6px] leading-[1.15]">
                      {s.title}
                    </h3>
                    <span
                      className="text-[11px] font-bold px-[13px] py-[5px] rounded-[10px] tracking-[0.3px] whitespace-nowrap shrink-0"
                      style={
                        {
                          background: s.color,
                          border: `1px solid ${s.accent}25`,
                          color: s.accent,
                        } as CSSProperties
                      }
                    >
                      {s.tag}
                    </span>
                  </div>
                  <p className="text-[15px] text-muted leading-[1.72] mb-6">
                    {s.body}
                  </p>
                  <div className="flex gap-5 flex-wrap">
                    {s.detail.map((d) => (
                      <div key={d} className="flex items-center gap-[7px]">
                        <span
                          className="w-[18px] h-[18px] rounded-full flex items-center justify-center shrink-0"
                          style={{ background: s.color } as CSSProperties}
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
                        <span className="text-[13px] text-text font-medium">
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
      `}</style>
    </section>
  );
}
