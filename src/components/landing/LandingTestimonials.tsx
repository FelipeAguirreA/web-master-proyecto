import type { CSSProperties } from "react";

const TMS = [
  {
    q: "En toda mi carrera me postulé a 4 prácticas y quedé en silencio. En PractiX me postulé a 3 y me llamaron de las 3. El score no miente: si dice 96%, es 96%.",
    name: "Valentina Morales",
    role: "Ing. Comercial · PUC",
    co: "Hoy en Falabella",
    score: 96,
    ini: "VM",
    // brand gradient colors — not in @theme
    c1: "#FFC5A3",
    c2: "var(--color-accent)",
  },
  {
    q: "Como responsable de selección, el ATS nos cambió el proceso completamente. Antes revisábamos 80 CVs a mano. Ahora dedicamos el tiempo a los candidatos que realmente encajan.",
    name: "Felipe Soto",
    role: "RRHH · NotCo",
    co: "Empresa verificada ✓",
    score: null as number | null,
    ini: "FS",
    // brand green — not in @theme (this is a specific avatar gradient)
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
    // brand purple — not in @theme
    c1: "#E0C5FF",
    c2: "#8247E5",
  },
];

export function LandingTestimonials() {
  return (
    <section className="bg-surface py-[100px] px-4 sm:px-6 md:px-8 border-b border-border">
      <div className="max-w-[1100px] mx-auto">
        <div className="rv text-center mb-14">
          <span className="inline-flex items-center gap-[7px] bg-accent-bg border border-accent-bdr rounded-[40px] px-[14px] py-1 text-[10.5px] font-bold tracking-[1px] text-accent mb-[18px] uppercase">
            Testimonios
          </span>
          <h2 className="text-[clamp(1.8rem,3.8vw,3rem)] font-extrabold tracking-[-1.5px] text-text leading-[1.1]">
            Lo que dicen quienes
            <br />
            ya cambiaron su carrera.
          </h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {TMS.map((tm, i) => (
            <div
              key={i}
              className={`rv d${i + 1} practix-tm-card bg-surface border border-border rounded-[20px] p-7 sm:p-8 relative overflow-hidden flex flex-col transition-[transform,box-shadow] duration-300`}
            >
              {/* per-card radial glow uses dynamic c1 — kept dynamic */}
              <div
                className="absolute top-0 right-0 w-[140px] h-[140px] pointer-events-none"
                style={
                  {
                    background: `radial-gradient(circle,${tm.c1}18 0%,transparent 70%)`,
                  } as CSSProperties
                }
              />
              <div className="flex gap-[2px] mb-[18px]">
                {[...Array(5)].map((_, j) => (
                  <svg
                    key={j}
                    width="14"
                    height="14"
                    viewBox="0 0 20 20"
                    fill="var(--color-accent-hi)"
                  >
                    <path d="M10 1l2.5 6.5H19l-5 4 2 6.5L10 14l-6 4 2-6.5-5-4h6.5z" />
                  </svg>
                ))}
              </div>
              <blockquote className="text-[14.5px] leading-[1.7] text-text font-medium flex-1 mb-5">
                &ldquo;{tm.q}&rdquo;
              </blockquote>
              {tm.score && (
                <div className="inline-flex items-center gap-[6px] bg-accent-bg border border-accent-bdr rounded-lg px-3 py-[5px] mb-[18px] self-start">
                  <span className="text-[13px] font-black text-accent">
                    {tm.score}%
                  </span>
                  <span className="text-[11.5px] text-muted">
                    de match conseguido
                  </span>
                </div>
              )}
              <div className="flex items-center gap-3">
                {/* avatar gradient uses per-card colors */}
                <div
                  className="w-[42px] h-[42px] rounded-full flex items-center justify-center text-white font-extrabold text-[13px] shrink-0"
                  style={
                    {
                      background: `linear-gradient(135deg,${tm.c1},${tm.c2})`,
                    } as CSSProperties
                  }
                >
                  {tm.ini}
                </div>
                <div>
                  <div className="text-[13.5px] font-bold text-text">
                    {tm.name}
                  </div>
                  <div className="text-xs text-muted">{tm.role}</div>
                  <div className="text-[11.5px] text-accent font-semibold mt-[1px]">
                    {tm.co}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
      <style>{`
        .practix-tm-card:hover { transform: translateY(-5px); box-shadow: 0 24px 60px -20px color-mix(in sRGB, var(--color-accent) 16%, transparent); }
      `}</style>
    </section>
  );
}
